/* The app's state machine: which screen is shown, the running session, and
 * every action (starting, answering, timing, grading, routing, keyboard).
 * Ported from the old js/app/{sessions,question,results,events}.js with the
 * HTML-building taken out: React components read S and call these actions,
 * and every change calls emit() so they redraw.
 *
 * Dialogs go through `ui` (ask / notify / askValue), which the React app
 * replaces with Mantine modals; the defaults use the browser's own boxes. */

import {
  L, BANK, byId, bankIds, examById, scenarioById, SCENARIOS, SCENARIO_BANK, Store, Mutations, LS,
  BACKUP_KEY, DOMAIN_NAMES, PASS_SCORE, isListed, countsAsStudy, loadExam, loadArchive,
  missingReferencedIds, progressSize, answeredCount, announce, plural,
} from "./env.js";

/* ------------------------------------------------------------- state */
export const HOME_TABS = ["today", "practice", "exams", "resources"];
const TAB_KEY = "ccarf.tab";

export const S = {
  view: "home", // home | quiz | scenario-review | results | review | search | custom
  tab: (() => { const t = LS.get(TAB_KEY, "today"); return HOME_TABS.includes(t) ? t : "today"; })(),
  session: null,
  lastFinished: null,
  reviewWrongOnly: false,
  reviewDomain: 0,
  reviewFilter: "all",
  searchQuery: "",
  expandedMastery: 0,
  customState: {
    domains: { 1: true, 2: true, 3: true, 4: true, 5: true },
    subs: {}, // "<domain>|<subKey>" -> true
    openDomain: 0,
    count: "20",
    timed: false,
  },
  pendingEmail: null,
  authNotice: L.authLinkError(typeof location !== "undefined" ? location.hash : ""),
  acctOpen: false,
  busy: null, // the slow action under way, if any
  briefOpen: true, // scenario text panel, folded on phones after a scenario's first question
};
if (S.authNotice) {
  /* Arriving from a refused sign-in link: open the account menu with the
   * reason and take the error out of the address. */
  S.acctOpen = true;
  try { window.history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* no history */ }
}

/* --------------------------------------------------- change tracking */
let version = 0;
const listeners = new Set();
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function getVersion() { return version; }
export function emit() {
  version++;
  listeners.forEach((fn) => fn());
  syncRoute();
}

/* The timer ticks on its own channel so only the clock redraws each second. */
let tick = 0;
const tickListeners = new Set();
export function subscribeTick(fn) { tickListeners.add(fn); return () => tickListeners.delete(fn); }
export function getTick() { return tick; }

/* ----------------------------------------------------------- dialogs */
export const ui = {
  ask: (spec) => Promise.resolve(typeof confirm === "function" ? confirm(spec.text) : true),
  notify: (text) => { if (typeof alert === "function") alert(text); return Promise.resolve(); },
  askValue: (spec) => Promise.resolve(typeof prompt === "function" ? prompt(spec.title, spec.input.value || "") : null),
  dialogOpen: () => false,
  closeDialogs: () => {},
};
const notify = (text, title) => ui.notify(text, title);

/* ---------------------------------------------------------- sessions */
function newSession(mode, questions, durationMs) {
  const now = Date.now();
  return {
    mode, // exam | retry | weak | practice | custom | imported | scenario | scenario-practice
    questions: questions.map((q) => {
      const natural = q.options.map((_, i) => i);
      /* Imported explanations refer to options by letter, and scenario notes
       * sit under their own option, so those keep their written order. */
      return { id: q.id, order: q.exam || q.scenario ? natural : L.shuffle(natural) };
    }),
    answers: questions.reduce((acc, q) => { acc[q.id] = null; return acc; }, {}),
    flagged: {},
    strikes: {},
    comments: {},
    current: 0,
    startedAt: now,
    deadline: durationMs ? now + durationMs : null,
    feedback: null, // practice: the answered question awaiting "next"
    tally: { correct: 0, wrong: 0 },
    timeSpent: {},
    clock: null,
  };
}

/* Time per question: credit the question on screen with the time since it
 * appeared, then start timing `id` (null when none is on screen). */
function clockOn(id) {
  const s = S.session;
  if (!s) return;
  const now = Date.now();
  if (s.clock) s.timeSpent = L.addTime(s.timeSpent, s.clock.id, s.clock.since, now);
  s.clock = id ? { id, since: now } : null;
}

function persistSession() {
  const s = S.session;
  if (!s) return;
  if (s.clock) clockOn(s.questions[s.current].id);
  Store.mutate(Mutations.setSession(s));
}

export const MODE_NAMES = {
  exam: "Mock exam", retry: "Retry failed", weak: "Weak drill",
  practice: "Practice", custom: "Custom quiz", imported: "Imported exam",
  scenario: "Scenario exam", "scenario-practice": "Scenario practice",
};

export function isScenarioMode(mode) { return mode === "scenario" || mode === "scenario-practice"; }
export function isPracticeMode(mode) { return mode === "practice" || mode === "scenario-practice"; }
/* Striking options out works wherever answers are not revealed at once. */
export function canStrike(mode) { return mode !== "practice"; }

/* Show a freshly started (or resumed) session. */
function begin(session, timed) {
  S.session = session;
  S.reviewFilter = "all";
  persistSession();
  showQuestion();
  if (timed) startTimer();
}

/* Starting something new replaces an unfinished session, so ask first.
 * Resolves true when it is fine to go ahead. */
async function okToReplaceSaved() {
  if (!Store.snapshot().session) return true;
  const yes = await ui.ask({
    title: "Replace your session?",
    text: "You have a session in progress. Starting a new one will discard it. Continue?",
    ok: "Discard and start", cancel: "Keep my session", danger: true,
  });
  if (yes) Store.mutate(Mutations.clearSession());
  return yes;
}

export async function startExam() {
  if (!(await okToReplaceSaved())) return;
  let questions;
  try {
    questions = L.drawExam(BANK, L.EXAM_DRAW_COUNTS);
  } catch (e) {
    return notify("Question bank problem: " + e.message);
  }
  const s = newSession("exam", questions, L.EXAM_DURATION_MS);
  s.scope = "mapped";
  begin(s, true);
}

async function importedExam(examId) {
  const exam = examById[examId];
  if (!exam) return null;
  if (!exam.questions) {
    try { await loadExam(examId); } catch (e) {
      notify("That exam could not be loaded. Check your connection and try again.");
      return null;
    }
  }
  return exam.questions && exam.questions.length ? exam : null;
}

export async function startImportedExam(examId) {
  const exam = await importedExam(examId);
  if (!exam || !(await okToReplaceSaved())) return;
  const s = newSession("imported", exam.questions, L.EXAM_DURATION_MS);
  Object.assign(s, { examId: exam.id, examName: exam.name, separate: true });
  begin(s, true);
}

/* Untimed walk through an imported exam, scored for the session only. */
export async function startImportedPractice(examId) {
  const exam = await importedExam(examId);
  if (!exam || !(await okToReplaceSaved())) return;
  const s = newSession("practice", exam.questions, null);
  Object.assign(s, { examId: exam.id, examName: exam.name, separate: true });
  begin(s, false);
}

export const DIAGNOSTIC = { count: 2, perScenario: 10, ms: 40 * 60 * 1000 };

export function scenarioExamReady() {
  return SCENARIOS.length > 0 && L.eligibleScenarios(SCENARIOS, SCENARIO_BANK).length === SCENARIOS.length;
}
export function diagnosticReady() {
  return L.eligibleScenarios(SCENARIOS, SCENARIO_BANK, 10).length >= 2;
}

export async function startScenarioExam(diagnostic) {
  if (!(await okToReplaceSaved())) return;
  const drawn = L.drawScenarioExam(SCENARIOS, SCENARIO_BANK,
    L.usedScenarioQuestionIds(Store.snapshot().history), null, diagnostic ? DIAGNOSTIC : null);
  if (!drawn) {
    return notify("The scenario exam needs at least four scenarios with " + L.SCENARIO_BLOCK + " questions each.");
  }
  const s = newSession("scenario", drawn.questions, diagnostic ? DIAGNOSTIC.ms : L.EXAM_DURATION_MS);
  if (diagnostic) s.diagnostic = true;
  s.scenarioIds = drawn.scenarioIds;
  s.separate = true;
  begin(s, true);
}

/* Untimed, one scenario (or a set of ids), with every option's note after
 * each answer. Questions not yet met in a scenario exam come first. */
export async function startScenarioPractice(scenarioId, ids, title, objective) {
  let pool = ids
    ? ids.map((id) => byId[id]).filter(Boolean)
    : SCENARIO_BANK.filter((q) => q.scenario === scenarioId);
  if (!pool.length || !(await okToReplaceSaved())) return;
  const used = L.usedScenarioQuestionIds(Store.snapshot().history);
  pool = L.shuffle(pool.filter((q) => !used.has(q.id))).concat(L.shuffle(pool.filter((q) => used.has(q.id))));
  const s = newSession("scenario-practice", pool, false);
  Object.assign(s, {
    scenarioId: scenarioId || null, missed: !!ids, practiceTitle: title || null,
    objective: objective || null, separate: true,
  });
  begin(s, false);
}

function scheduleReview(results) {
  const review = Store.snapshot().review || {};
  const now = Date.now();
  const updates = {};
  let any = false;
  results.forEach((r) => {
    const next = L.reviewAfterAnswer(review[r.id], r.correct, now);
    if (next) { updates[r.id] = next; any = true; }
  });
  if (any) Store.mutate(Mutations.recordReview(updates));
}

export function dueCount(progress = Store.snapshot(), now = Date.now()) {
  return L.dueReviewIds(progress.review, now).filter(isListed).length;
}

/* Due questions: scenario ones first (with notes), then the rest. */
export async function startReview() {
  const due = L.dueReviewIds(Store.snapshot().review, Date.now()).filter(isListed);
  const scn = due.filter((id) => byId[id].scenario);
  if (scn.length) return startScenarioPractice(null, scn, "Due for review");
  const rest = due.map((id) => byId[id]);
  if (!rest.length || !(await okToReplaceSaved())) return;
  const s = newSession("practice", L.shuffle(rest), false);
  s.savedDrill = true;
  s.reviewDrill = true;
  begin(s, false);
}

/* Up to eight scenario questions on one task statement, unseen first; bank
 * practice when the scenario bank has none for it. */
export function drillObjective(sub) {
  if (!sub) return;
  const ids = L.objectiveDrillIds(SCENARIO_BANK, sub, L.usedScenarioQuestionIds(Store.snapshot().history));
  if (ids.length) return startScenarioPractice(null, ids, "Practice — " + sub, sub);
  const code = sub.split(" ")[0];
  return startPractice(Number(code.split(".")[0]), code);
}

export async function startPractice(domain, subKey) {
  const pool = L.shuffle(L.filterBySubKey(BANK, domain, subKey || null));
  if (!pool.length || !(await okToReplaceSaved())) return;
  const s = newSession("practice", pool, false);
  s.domain = domain;
  s.subKey = subKey || null;
  begin(s, false);
}

export async function startCustom() {
  const pool = L.selectCustomQuestions(BANK, S.customState);
  if (!pool.length) return notify("Nothing matches those filters — pick at least one domain.");
  if (!(await okToReplaceSaved())) return;
  const c = S.customState.count;
  const count = c === "all" ? pool.length : Number(c);
  const questions = L.shuffle(pool).slice(0, Math.min(count, pool.length));
  begin(newSession("custom", questions, S.customState.timed ? questions.length * 2 * 60 * 1000 : null), S.customState.timed);
}

export async function startRetry(wrongIds) {
  const questions = L.shuffle(wrongIds.map((id) => byId[id]).filter(Boolean));
  if (!questions.length) {
    await notify("Those questions are no longer in the loaded bank.");
    return goHome();
  }
  if (!(await okToReplaceSaved())) return;
  begin(newSession("retry", questions, false), false);
}

export async function startSaved() {
  const saved = Store.snapshot().saved.filter(isListed).map((id) => byId[id]).filter(Boolean);
  if (!saved.length || !(await okToReplaceSaved())) return;
  const s = newSession("practice", L.shuffle(saved), null);
  s.savedDrill = true;
  begin(s, false);
}

export async function startWeak() {
  const weak = Store.snapshot().weak.filter(isListed).map((id) => byId[id]);
  if (!weak.length || !(await okToReplaceSaved())) return;
  begin(newSession("weak", L.shuffle(weak), false), false);
}

/* ------------------------------------------------------------ search */
export const SEARCH_SHOWN = 30;
export function searchHits() {
  return {
    bank: L.searchQuestions(BANK, S.searchQuery),
    scenario: L.searchQuestions(SCENARIO_BANK, S.searchQuery),
  };
}
export function setSearchQuery(q) { S.searchQuery = String(q || ""); emit(); }
export function openSearch() { S.acctOpen = false; S.view = "search"; emit(); }

export async function startSearchPractice(pool) {
  const hits = searchHits()[pool] || [];
  if (!hits.length) return;
  const title = "Search: “" + S.searchQuery.trim() + "”";
  if (pool === "scenario") return startScenarioPractice(null, hits.map((q) => q.id), title);
  if (!(await okToReplaceSaved())) return;
  const s = newSession("practice", L.shuffle(hits), false);
  s.practiceTitle = title;
  begin(s, false);
}

/* -------------------------------------------------------- custom quiz */
export function openCustomBuilder() { S.view = "custom"; emit(); }
export function customPoolSize() { return L.selectCustomQuestions(BANK, S.customState).length; }
export function setCustom(patch) {
  const c = S.customState;
  if (patch.domain !== undefined) c.domains[patch.domain] = patch.on;
  if (patch.sub !== undefined) { if (patch.on) c.subs[patch.sub] = true; else delete c.subs[patch.sub]; }
  if (patch.openDomain !== undefined) c.openDomain = c.openDomain === patch.openDomain ? 0 : patch.openDomain;
  if (patch.count !== undefined) c.count = patch.count;
  if (patch.timed !== undefined) c.timed = patch.timed;
  emit();
}

/* ----------------------------------------------------- saved sessions */
function loadSavedSession() {
  const saved = Store.snapshot().session;
  if (!saved) return false;
  /* Drop anything the bank no longer has, so a stale session cannot crash
   * the question screen. A copy: the stored state is never edited in place. */
  const s = JSON.parse(JSON.stringify(saved));
  const usable = (s.questions || []).filter((q) => byId[q.id]);
  if (!usable.length) {
    Store.mutate(Mutations.clearSession());
    notify("That session referred to questions this version no longer has, so it was discarded.");
    return false;
  }
  s.questions = usable;
  s.current = Math.min(Math.max(0, s.current || 0), usable.length - 1);
  s.answers = s.answers || {};
  s.flagged = s.flagged || {};
  s.tally = s.tally || { correct: 0, wrong: 0 };
  s.strikes = s.strikes || {};
  s.comments = s.comments || {};
  s.timeSpent = s.timeSpent || {};
  s.clock = null; // time away from the session is not counted
  S.session = s;
  return true;
}

export function resumeSession() {
  S.reviewFilter = "all";
  if (!loadSavedSession()) return goHome();
  if (S.session.deadline && Date.now() >= S.session.deadline) return submitSession();
  showQuestion();
  startTimer();
}

/* Grade a saved session from the home screen (all answered, never submitted). */
export function finishSavedSession() {
  if (!loadSavedSession()) return goHome();
  return submitSession();
}

export async function discardSession() {
  const yes = await ui.ask({ title: "Discard this session?", text: "Discard this in-progress session? This cannot be undone.",
    ok: "Discard session", cancel: "Keep it", danger: true });
  if (!yes) return;
  Store.mutate(Mutations.clearSession());
  goHome();
}

/* -------------------------------------------------------------- timer */
let timerHandle = null;
export function stopTimer() {
  if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
}
function startTimer() {
  stopTimer();
  if (!S.session || !S.session.deadline) return;
  timerHandle = setInterval(() => {
    const s = S.session;
    if (!s || !s.deadline) return stopTimer();
    const left = s.deadline - Date.now();
    if (left <= 0) { stopTimer(); submitSession(); return; }
    timeWarning(left);
    tick++;
    tickListeners.forEach((fn) => fn());
  }, 1000);
}

/* The clock is silent to screen readers; these say when 10, 5 and 1 minutes
 * are left, once each per session. */
function timeWarning(left) {
  const s = S.session;
  const mins = Math.ceil(left / 60000);
  s.warned = s.warned || {};
  [10, 5, 1].forEach((w) => {
    if (mins <= w && !s.warned[w] && left > (w - 1) * 60000) {
      s.warned[w] = true;
      announce(plural(w, "minute") + " left.");
    }
  });
}

/* "4 behind pace" while 3+ questions behind an even pace, else "". */
export function paceText() {
  const s = S.session;
  if (!s || !s.deadline) return "";
  const p = L.paceStatus(s.questions.length, answeredCount(s), s.startedAt, s.deadline, Date.now());
  return p ? p.behind + " behind pace" : "";
}

/* --------------------------------------------------- question screen */
export function sessionTitle(s = S.session) {
  switch (s.mode) {
    case "exam": return s.scope === "unmapped" ? "Supplementary Mock Exam" : "Mock Exam";
    case "retry": return "Retry Failed Questions";
    case "weak": return "Weak Questions Drill";
    case "practice":
      if (s.practiceTitle) return s.practiceTitle;
      if (s.reviewDrill) return "Due for review";
      if (s.savedDrill) return "Saved questions";
      if (s.examName) return "Practice — " + s.examName;
      return "Practice — " + (s.subKey && s.subKey !== "general"
        ? "Subdomain " + s.subKey
        : DOMAIN_NAMES[s.domain] + (s.subKey === "general" ? " (untagged)" : ""));
    case "custom": return "Custom Quiz";
    case "imported": return s.examName || "Imported exam";
    case "scenario": return s.diagnostic ? "Diagnostic" : "Scenario Exam";
    case "scenario-practice":
      if (s.practiceTitle) return s.practiceTitle;
      return "Practice — " + (s.missed ? "missed scenario questions" : (scenarioById[s.scenarioId] || {}).name || "Scenario");
    default: return "";
  }
}

/* Which scenario block a question is in (0-based), by its own scenario. */
export function scenarioBlockOf(s, index) {
  if (s.mode !== "scenario") return 0;
  const q = byId[s.questions[index].id];
  return Math.max(0, (s.scenarioIds || []).indexOf(q && q.scenario));
}

function isNarrow() {
  return !!(typeof window !== "undefined" && window.matchMedia && window.matchMedia("(max-width: 680px)").matches);
}

let announced = null;
let briefShownFor = null;
/* Put the current question on screen: time it, announce a move, and on a
 * phone fold the scenario text after a scenario's first question. */
function showQuestion() {
  const s = S.session;
  S.view = "quiz";
  const sq = s.questions[s.current];
  clockOn(sq.id);
  const key = s.startedAt + ":" + s.current;
  if (key !== announced) {
    announced = key;
    announce("Question " + (s.current + 1) + " of " + s.questions.length);
  }
  if (isScenarioMode(s.mode) && key !== briefShownFor) {
    briefShownFor = key;
    if (isNarrow()) {
      const q = byId[sq.id];
      const prev = s.current > 0 ? byId[s.questions[s.current - 1].id] : null;
      S.briefOpen = !prev || prev.scenario !== q.scenario;
    } else {
      S.briefOpen = true;
    }
  }
  emit();
  if (typeof window !== "undefined" && window.scrollTo) {
    try { window.scrollTo(0, 0); } catch (e) { /* jsdom */ }
  }
}

export function setBriefOpen(open) { S.briefOpen = open; emit(); }

export function selectOption(optIdx) {
  const s = S.session;
  if (!s) return;
  const sq = s.questions[s.current];
  const q = byId[sq.id];
  if (isPracticeMode(s.mode)) {
    if (s.feedback === sq.id) return; // already answered
    const wanted = L.correctIndices(q);
    if (wanted.length > 1) {
      /* Collect picks until as many are chosen as asked, then grade. */
      s.answers[sq.id] = L.toggleChoice(s.answers[sq.id], optIdx);
      if (L.chosenIndices(s.answers[sq.id]).length < wanted.length) {
        persistSession();
        return emit();
      }
    } else {
      s.answers[sq.id] = optIdx;
    }
    s.feedback = sq.id;
    const right = L.sameChoice(s.answers[sq.id], wanted);
    announce(right ? "Correct." : "Incorrect. The correct answer is " + wanted.map((i) =>
      String.fromCharCode(65 + sq.order.indexOf(i)) + ": " + q.options[i]).join("; ") +
      ". The explanation follows the options.");
    if (right) s.tally.correct++; else s.tally.wrong++;
    if (!s.separate && bankIds[q.id]) Store.mutate(Mutations.recordAnswer(q.id, right, Date.now()));
    if (countsAsStudy(q.id)) Store.mutate(Mutations.recordActivity(L.localDay(Date.now()), [q.id]));
    scheduleReview([{ id: q.id, correct: right }]);
  } else if (L.isMultiAnswer(q)) {
    s.answers[sq.id] = L.toggleChoice(s.answers[sq.id], optIdx);
  } else {
    s.answers[sq.id] = s.answers[sq.id] === optIdx ? null : optIdx;
  }
  persistSession();
  emit();
}

export function toggleStrike(optIdx) {
  const s = S.session;
  if (!s || !canStrike(s.mode)) return;
  const id = s.questions[s.current].id;
  const list = (s.strikes[id] || []).slice();
  const at = list.indexOf(optIdx);
  if (at === -1) list.push(optIdx); else list.splice(at, 1);
  s.strikes[id] = list;
  persistSession();
  emit();
}

export async function editComment() {
  const s = S.session;
  if (!s) return;
  const id = s.questions[s.current].id;
  const text = await ui.askValue({ title: "Comment on this question", ok: "Save",
    input: { type: "textarea", value: s.comments[id] || "", label: "Leave it empty to remove the comment." } });
  if (text === null || S.session !== s) return;
  const t = String(text).trim();
  if (t) s.comments[id] = t; else delete s.comments[id];
  persistSession();
  emit();
}

export function toggleFlag() {
  const s = S.session;
  if (!s || s.mode === "practice") return;
  const id = s.questions[s.current].id;
  if (s.flagged[id]) delete s.flagged[id]; else s.flagged[id] = true;
  persistSession();
  emit();
}

export function toggleSavedQuestion() {
  if (!S.session) return;
  Store.mutate(Mutations.toggleSaved(S.session.questions[S.session.current].id));
  emit();
}

/* Practice runs only go forward: going back would let an answered question
 * be answered (and counted) again. */
export function goPrev() {
  const s = S.session;
  if (!s || isPracticeMode(s.mode) || s.current === 0) return;
  s.current--;
  s.feedback = null;
  persistSession();
  showQuestion();
}

export function goNext() {
  const s = S.session;
  if (!s) return;
  const sq = s.questions[s.current];
  if (isPracticeMode(s.mode)) {
    if (s.feedback !== sq.id) return; // must answer first
    if (s.current + 1 >= s.questions.length) return submitSession();
  } else if (s.current + 1 >= s.questions.length) {
    if (s.mode === "scenario") return showScenarioReview();
    return;
  }
  s.current++;
  s.feedback = null;
  persistSession();
  showQuestion();
}

export function jumpTo(index) {
  const s = S.session;
  if (!s) return;
  s.current = index;
  persistSession();
  showQuestion();
}

/* Before submitting a scenario exam: every question as a tile. */
export function showScenarioReview() {
  if (!S.session) return;
  S.view = "scenario-review";
  clockOn(null);
  emit();
}
export function setReviewFilter(f) { S.reviewFilter = f || "all"; emit(); }

/* Leaving keeps the session: it is saved and resumable. */
function exitSession() {
  clockOn(null);
  persistSession();
  stopTimer();
  goHome();
}

export async function quit() {
  const yes = await ui.ask({ title: "Exit?", text: "Exit? Your progress is saved — resume from the home screen.", ok: "Exit", cancel: "Keep going" });
  if (yes) exitSession();
}

export async function askSubmit() {
  const s = S.session;
  if (!s) return;
  if (s.mode === "exam" || s.mode === "scenario") {
    const unanswered = s.questions.filter((q) => s.answers[q.id] === null).length;
    const yes = await ui.ask({
      title: "Submit the exam?",
      text: unanswered ? "You have " + plural(unanswered, "unanswered question") + ". Submit anyway?" : "Submit the exam?",
      ok: "Submit", cancel: "Keep working",
    });
    if (!yes || !S.session) return;
  }
  return submitSession();
}

/* ------------------------------------------------------------ results */
export function submitSession() {
  stopTimer();
  const s = S.session;
  if (!s) return;
  clockOn(null);
  const questions = s.questions.map((q) => byId[q.id]).filter(Boolean);
  const grade = L.gradeSession(questions, s.answers);
  const finished = {
    mode: s.mode,
    domain: s.domain,
    questions: s.questions,
    answers: s.answers,
    grade,
    timeSpent: s.timeSpent || {},
    timed: !!s.deadline,
    objective: s.objective || null,
  };
  const separate = s.separate === true || s.mode === "imported" || isScenarioMode(s.mode);
  const isAttempt = s.mode === "exam" || s.mode === "imported" || s.mode === "scenario";
  const isScenarioExam = s.mode === "scenario";
  let entry = null;
  if (isAttempt) {
    const score = L.scaledScore(grade.correct, grade.total);
    entry = {
      date: new Date().toISOString(),
      examId: s.examId || null,
      examName: isScenarioExam ? (s.diagnostic ? "Diagnostic" : "Scenario exam")
        : s.examName || (s.scope === "unmapped" ? "Supplementary mock" : null),
      items: s.questions.map((q) => {
        const item = { id: q.id, order: q.order, given: s.answers[q.id] };
        const ms = s.timeSpent && s.timeSpent[q.id];
        if (ms) item.secs = Math.round(ms / 1000);
        if (isScenarioExam && s.comments && s.comments[q.id]) item.comment = s.comments[q.id];
        return item;
      }),
      score,
      pass: score >= PASS_SCORE,
      correct: grade.correct,
      total: grade.total,
      perDomain: grade.perDomain,
    };
    if (isScenarioExam) {
      entry.kind = "scenario";
      if (s.diagnostic) entry.diagnostic = true;
      entry.scenarioIds = s.scenarioIds.slice();
    }
    finished.score = score;
  }
  if (isScenarioMode(s.mode)) {
    finished.scenarioIds = s.scenarioIds || [s.scenarioId];
    finished.comments = s.comments || {};
  }
  const isGiven = (a) => a !== null && a !== undefined && !(Array.isArray(a) && !a.length);
  const answered = Object.keys(s.answers || {}).filter((k) => isGiven(s.answers[k]));
  /* One mutation clears the session, redeems weak questions and records the
   * attempt, so a later sync cannot bring any of it back. */
  Store.mutate(Mutations.finishSession(grade, entry, { separate, at: Date.now(), answered }));
  Store.mutate(Mutations.recordActivity(L.localDay(Date.now()),
    s.questions.filter((q) => isGiven(s.answers[q.id])).map((q) => q.id).filter(countsAsStudy)));
  /* Practice scheduled each answer as given; the rest are graded here, and
   * an unanswered question counts as wrong. */
  if (!isPracticeMode(s.mode)) {
    const right = {};
    grade.correctIds.forEach((id) => { right[id] = true; });
    scheduleReview(questions.map((q) => ({ id: q.id, correct: !!right[q.id] })));
  }
  S.session = null;
  showResults(finished);
}

export function showResults(finished) {
  S.lastFinished = finished;
  S.view = "results";
  emit();
}

/* A stored history entry in the shape the review screen expects, graded
 * against the questions as they are today. */
export function attemptToFinished(entry) {
  if (!entry || !Array.isArray(entry.items)) return null;
  const items = entry.items.filter((it) => byId[it.id]);
  if (!items.length) return null;
  const answers = {};
  items.forEach((it) => { answers[it.id] = it.given === undefined ? null : it.given; });
  const questions = items.map((it) => ({ id: it.id, order: it.order || byId[it.id].options.map((_, i) => i) }));
  const grade = L.gradeSession(items.map((it) => byId[it.id]), answers);
  const finished = {
    mode: entry.kind === "scenario" ? "scenario" : entry.examId ? "imported" : "exam",
    examName: entry.examName || null,
    date: entry.date,
    questions, answers, grade,
    score: entry.score,
    fromHistory: true,
  };
  if (entry.kind === "scenario") {
    finished.scenarioIds = entry.scenarioIds || [];
    finished.comments = {};
    items.forEach((it) => { if (it.comment) finished.comments[it.id] = it.comment; });
  }
  return finished;
}

export async function reviewAttempt(date) {
  const entry = Store.snapshot().history.find((h) => h.date === date);
  try {
    if (entry && !entry.examId && missingReferencedIds({ history: [entry] }).length) await loadArchive();
    if (entry && entry.examId && examById[entry.examId] && !examById[entry.examId].questions) await loadExam(entry.examId);
  } catch (e) {
    return notify("That attempt's questions could not be loaded. Check your connection and try again.");
  }
  const restored = attemptToFinished(entry);
  if (!restored) return notify("That attempt cannot be reviewed — its questions are no longer in the app.");
  S.lastFinished = restored;
  showReview();
}

export function showReview() {
  S.reviewWrongOnly = false;
  S.reviewDomain = 0;
  S.view = "review";
  emit();
}
export function setReviewWrongOnly(on) { S.reviewWrongOnly = on; emit(); }
export function setReviewDomain(d) { S.reviewDomain = d; emit(); }
export function backToResults() { if (S.lastFinished) { S.view = "results"; emit(); } }

/* ---------------------------------------------------------- home tabs */
export function goHome() {
  stopTimer();
  S.session = null;
  S.view = "home";
  emit();
}
export function setTab(tab) {
  S.tab = HOME_TABS.includes(tab) ? tab : "today";
  LS.set(TAB_KEY, S.tab);
  S.acctOpen = false;
  goHome();
  try { window.scrollTo(0, 0); } catch (e) { /* jsdom */ }
}
export function toggleMastery(d) { S.expandedMastery = S.expandedMastery === d ? 0 : d; emit(); }
export function setAcctOpen(open) { S.acctOpen = open; emit(); }

export async function editExamDate() {
  const got = await ui.askValue({ title: "Exam date", ok: "Save",
    input: { type: "date", value: Store.snapshot().examDate || "", label: "Your exam date — clear it to remove the countdown" } });
  if (got === null) return;
  const v = String(got).trim();
  if (v && !L.isValidDate(v)) return notify("Please enter a real date as YYYY-MM-DD, e.g. 2026-12-14.");
  Store.mutate(Mutations.setExamDate(v || null));
  emit();
}

export async function clearHistory() {
  const yes = await ui.ask({ title: "Delete score history?", text: "Delete all score history?", ok: "Delete history", danger: true });
  if (!yes) return;
  Store.mutate(Mutations.clearHistory());
  emit();
}

const syncNow = () => { if (L.CCARF_SYNC && L.CCARF_SYNC.syncNow) L.CCARF_SYNC.syncNow(); };

export async function resetProgress() {
  const yes = await ui.ask({ title: "Reset all progress?", ok: "Reset everything", danger: true,
    text: "This deletes all your progress on every device you are signed in on: exam history, practice answers, " +
      "review schedule, saved questions and activity. It cannot be undone. Use Download progress first if you might want it back." });
  if (!yes) return;
  Store.mutate(Mutations.resetProgress());
  LS.remove(BACKUP_KEY);
  syncNow();
  emit();
}

export async function restoreBackup() {
  const backup = LS.get(BACKUP_KEY, null);
  if (!progressSize(backup)) return;
  const yes = await ui.ask({ title: "Restore backup?", text: "Merge this device's backup into your progress? Nothing is removed.", ok: "Restore" });
  if (!yes) return;
  Store.mutate(Mutations.restore(backup));
  syncNow();
  emit();
}

export function backupExtra() {
  return progressSize(LS.get(BACKUP_KEY, null)) - progressSize(Store.snapshot());
}

export function exportProgress() {
  if (typeof Blob === "undefined" || !window.URL || !URL.createObjectURL) return;
  const text = L.progressFile(Store.snapshot(), Date.now());
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "ccarf-progress-" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function importProgressText(text) {
  const got = L.parseProgressFile(text);
  if (got.error) return notify(got.error, "Import failed");
  const p = got.progress;
  const yes = await ui.ask({ title: "Import progress?", ok: "Import",
    text: "Add this backup to your progress? It has " + plural(p.history.length, "exam attempt") + " and " +
      p.attempted.length + " questions tried. Nothing here is removed." });
  if (!yes) return;
  Store.mutate(Mutations.restore(p));
  syncNow();
  emit();
}

/* ------------------------------------------------------------ account */
export async function sendSignIn(email) {
  email = String(email || "").trim();
  if (!email || email.indexOf("@") === -1) return notify("Enter a valid e-mail address.");
  try {
    await L.CCARF_SYNC.sendCode(email);
    S.pendingEmail = email;
    S.authNotice = null;
    emit();
  } catch (err) {
    notify(L.signInEmailError(err), "Could not send the e-mail");
  }
}

export async function verifySignIn(code) {
  code = String(code || "").trim();
  if (!code) return notify("Enter the code from the e-mail.");
  try {
    await L.CCARF_SYNC.verify(S.pendingEmail, code);
    S.pendingEmail = null; // the auth event redraws
  } catch (err) {
    notify("Sign-in failed: " + (err && err.message ? err.message : err));
  }
}

export async function signOut() {
  const yes = await ui.ask({ title: "Sign out?", text: "Sign out? Progress stays on the server and this device's copy is cleared.", ok: "Sign out" });
  if (yes) L.CCARF_SYNC.signOut();
}

export function hardReload() {
  const reload = () => location.reload();
  if (window.caches && caches.keys) {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).then(reload, reload);
  } else {
    reload();
  }
}

/* ---------------------------------------------------- slow actions */
/* Actions that build a new screen can take a moment, so the clicked button
 * shows it is working and every other click waits until it finishes: no
 * double starts, no clicks landing on the screen that replaces this one. */
export function runSlow(key, fn) {
  if (S.busy) return;
  S.busy = key;
  emit();
  const raf = typeof requestAnimationFrame === "function" ? requestAnimationFrame : (f) => f();
  return new Promise((resolve) => {
    raf(() => raf(() => {
      const done = () => { if (S.busy === key) { S.busy = null; emit(); } resolve(); };
      let result;
      try { result = fn(); } catch (err) { done(); throw err; }
      if (result && typeof result.then === "function") result.then(done, done); else done();
    }));
  });
}

/* ------------------------------------------------------------ routing */
/* Each screen has its own address (#/practice, #/search, #/quiz …; Today
 * is the bare page), so Back and Forward move between screens and a tab can
 * be bookmarked. */
const ROUTE_SCREENS = { search: 1, custom: 1, quiz: 1, results: 1, review: 1 };
let routing = false;

function routeFor() {
  const v = S.view;
  if (v === "home") return S.tab === "today" ? "" : "#/" + S.tab;
  if (v === "quiz" || v === "scenario-review") return "#/quiz";
  if (v === "results" || v === "review" || v === "search" || v === "custom") return "#/" + v;
  return null;
}

export function parseRoute(hash) {
  const name = String(hash || "").replace(/^#\/?/, "");
  if (!name) return { tab: "today" };
  if (HOME_TABS.includes(name)) return { tab: name };
  if (ROUTE_SCREENS[name]) return { screen: name };
  return { tab: "today" };
}

function syncRoute() {
  if (typeof window === "undefined" || !window.history || !window.history.pushState) return;
  const want = routeFor();
  if (want === null) return;
  const have = location.hash === "#" ? "" : location.hash;
  if (want === have) return;
  /* A sign-in link's tokens are still waiting for the Supabase client. */
  if (L.isAuthHash(have)) return;
  const url = want || location.pathname + location.search;
  /* A finished or left quiz is not a place to go Back to. */
  if (routing || have === "#/quiz") window.history.replaceState(null, "", url);
  else window.history.pushState(null, "", url);
}

function goRoute(r) {
  if (r.tab) { S.tab = r.tab; LS.set(TAB_KEY, r.tab); return goHome(); }
  switch (r.screen) {
    case "search": return openSearch();
    case "custom": return openCustomBuilder();
    case "quiz": return Store.snapshot().session ? resumeSession() : goHome();
    case "results": return S.lastFinished ? showResults(S.lastFinished) : goHome();
    case "review": return S.lastFinished ? showReview() : goHome();
    default: return goHome();
  }
}

function withRouting(fn) {
  routing = true;
  try { fn(); } finally { routing = false; }
}

async function followRoute() {
  ui.closeDialogs();
  S.acctOpen = false;
  const r = parseRoute(location.hash);
  const inQuiz = (S.view === "quiz" || S.view === "scenario-review") && S.session;
  if (inQuiz && r.screen !== "quiz") {
    /* Back out of a quiz asks, as Exit does. On no, stay. */
    const yes = await ui.ask({ title: "Exit?", text: "Exit? Your progress is saved — resume from the home screen.", ok: "Exit", cancel: "Keep going" });
    if (yes) withRouting(() => { exitSession(); goRoute(r); });
    else window.history.pushState(null, "", "#/quiz");
    return;
  }
  withRouting(() => goRoute(r));
}

/* ----------------------------------------------------------- keyboard */
function inQuestionScreen() {
  const s = S.session;
  return S.view === "quiz" && !!(s && s.questions && s.questions[s.current]);
}

function isTyping(t) {
  const tag = t && t.tagName;
  return tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || !!(t && t.isContentEditable);
}

export function onKeyDown(ev) {
  if (ui.dialogOpen()) return;
  if (ev.key === "Escape" && S.acctOpen) setAcctOpen(false);
  /* "/" opens search from anywhere but a running quiz. */
  if (ev.key === "/" && !ev.metaKey && !ev.ctrlKey && !ev.altKey && !S.busy &&
      S.view !== "quiz" && S.view !== "search" && !S.session && !isTyping(ev.target)) {
    ev.preventDefault();
    return openSearch();
  }
  if (S.busy || !inQuestionScreen() || ev.metaKey || ev.ctrlKey || ev.altKey || isTyping(ev.target)) return;
  const s = S.session;
  const key = ev.key.toLowerCase();
  let pos = -1;
  /* 1–5 or A–E pick an option (some questions have five). F stays "flag". */
  if (key.length === 1 && key >= "1" && key <= "5") pos = Number(key) - 1;
  else if (key.length === 1 && key >= "a" && key <= "e") pos = key.charCodeAt(0) - 97;
  if (pos >= 0) {
    const sq = s.questions[s.current];
    if (pos >= sq.order.length) return;
    if (isPracticeMode(s.mode) && s.feedback === sq.id) return;
    return selectOption(sq.order[pos]);
  }
  if (ev.key === "ArrowLeft") { ev.preventDefault(); return goPrev(); }
  if (ev.key === "Enter") {
    if (ev.target && ev.target.closest && ev.target.closest("button, a, input, select, textarea")) return;
    ev.preventDefault();
    return goNext();
  }
  if (ev.key === "ArrowRight") { ev.preventDefault(); return goNext(); }
  if (key === "f") return toggleFlag();
}

/* --------------------------------------------------------------- boot */
let started = false;
const off = [];
function on(target, type, fn) {
  target.addEventListener(type, fn);
  off.push(() => target.removeEventListener(type, fn));
}

export function boot() {
  if (started) return;
  started = true;
  on(window, "popstate", followRoute);
  on(document, "keydown", onKeyDown);

  /* Sync and auth updates redraw (the account chip and card). */
  on(window, "ccarf:auth", () => emit());
  on(window, "ccarf:signin", () => {
    S.acctOpen = false;
    S.pendingEmail = null;
    S.authNotice = null;
  });
  /* Signing out must not leave one account's progress on screen. */
  on(window, "ccarf:signout", () => {
    S.acctOpen = false;
    stopTimer();
    S.session = null;
    Store.reset();
    LS.remove("ccarf.syncedAt");
    goHome();
  });
  /* Closing the tab mid-exam asks first; the clock keeps running meanwhile. */
  on(window, "beforeunload", (ev) => {
    if (!S.session || !S.session.deadline || (S.view !== "quiz" && S.view !== "scenario-review")) return;
    clockOn(null);
    persistSession();
    ev.preventDefault();
    ev.returnValue = "";
  });

  /* Open at the address in the URL; a plain address opens the last tab. */
  const start = location.hash || "";
  withRouting(() => {
    if (start && start !== "#" && !L.isAuthHash(start)) goRoute(parseRoute(start));
    else goHome();
  });
}

/* Undo boot(): for tests, which start a fresh app each time. */
export function shutdown() {
  stopTimer();
  off.splice(0).forEach((fn) => fn());
  started = false;
}
