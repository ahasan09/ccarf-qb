/* DOM app — starting, saving, resuming and timing sessions (mock, scenario,
 * practice, custom, retry, saved, weak, review), plus the custom quiz builder. */

"use strict";

/* --------------------------------------------------------- sessions */
function newSession(mode, questions, durationMs) {
  var now = Date.now();
  return {
    mode: mode, // 'exam' | 'retry' | 'weak' | 'practice' | 'custom'
    questions: questions.map(function (q) {
      var natural = q.options.map(function (_, i) { return i; });
      /* Imported explanations refer to options by letter ("why not A, C,
       * E"), so their order has to stay as written. */
      /* Scenario questions keep their order so each option's note
       * always sits under the option it explains. */
      return { id: q.id, order: q.exam || q.scenario ? natural : shuffle(natural) };
    }),
    answers: questions.reduce(function (acc, q) { acc[q.id] = null; return acc; }, {}),
    flagged: {},
    strikes: {}, // options struck through, per question id
    current: 0,
    startedAt: now,
    deadline: durationMs ? now + durationMs : null,
    feedback: null, // practice mode: answered question awaiting "next"
    tally: { correct: 0, wrong: 0 }, // practice running tally
    timeSpent: {}, // ms per question id, see clockOn()
    clock: null, // { id, since }: the question on screen and since when
  };
}

/* Time per question: credit the question that was on screen with the time
 * since it appeared, then start timing `id` (null when no question is on
 * screen — review grid, exit, submit). Every screen change calls this. */
function clockOn(id) {
  if (!session) return;
  var now = Date.now();
  var c = session.clock;
  if (c) session.timeSpent = addTime(session.timeSpent, c.id, c.since, now);
  session.clock = id ? { id: id, since: now } : null;
}

function persistSession() {
  if (!session) return;
  /* Bring the time-on-question up to date before saving, so what is
   * stored never lags a step behind. */
  if (session.clock) clockOn(session.questions[session.current].id);
  Store.mutate(Mutations.setSession(session));
}

var MODE_NAMES = {
  exam: "Mock exam", retry: "Retry failed", weak: "Weak drill",
  practice: "Practice", custom: "Custom quiz", imported: "Imported exam",
  scenario: "Scenario exam", "scenario-practice": "Scenario practice",
};

function startImportedExam(examId) {
  var exam = examById[examId];
  if (!exam) return;
  if (!exam.questions) {
    return loadExam(examId).then(
      function () { startImportedExam(examId); },
      function () { alert("That exam could not be loaded. Check your connection and try again."); }
    );
  }
  if (!exam.questions.length) return;
  if (!okToReplaceSaved()) return;
  session = newSession("imported", exam.questions, EXAM_DURATION_MS);
  session.examId = exam.id;
  session.examName = exam.name;
  session.separate = true;
  persistSession();
  renderQuestion();
  startTimer();
}

/* Untimed walk through an imported exam with the explanation after each
 * answer. Scored for the session only — never recorded as an attempt and
 * never mixed into bank mastery or the weak drill. */
function startImportedPractice(examId) {
  var exam = examById[examId];
  if (!exam) return;
  if (!exam.questions) {
    return loadExam(examId).then(
      function () { startImportedPractice(examId); },
      function () { alert("That exam could not be loaded. Check your connection and try again."); }
    );
  }
  if (!exam.questions.length) return;
  if (!okToReplaceSaved()) return;
  session = newSession("practice", exam.questions, null);
  session.examId = exam.id;
  session.examName = exam.name;
  session.separate = true;
  persistSession();
  renderQuestion();
}

function okToReplaceSaved() {
  return !Store.snapshot().session ||
    confirm("You have a session in progress. Starting a new one will discard it. Continue?");
}

function startExam() {
  if (!okToReplaceSaved()) return;
  var questions;
  try {
    questions = drawExam(BANK, EXAM_DRAW_COUNTS);
  } catch (e) {
    alert("Question bank problem: " + e.message);
    return;
  }
  session = newSession("exam", questions, EXAM_DURATION_MS);
  session.scope = "mapped";
  persistSession();
  renderQuestion();
  startTimer();
}

var DIAGNOSTIC = { count: 2, perScenario: 10, ms: 40 * 60 * 1000 };

function startScenarioExam(diagnostic) {
  if (!okToReplaceSaved()) return;
  var drawn = drawScenarioExam(SCENARIOS, SCENARIO_BANK,
    usedScenarioQuestionIds(Store.snapshot().history), null, diagnostic ? DIAGNOSTIC : null);
  if (!drawn) {
    alert("The scenario exam needs at least four scenarios with " + SCENARIO_BLOCK + " questions each.");
    return;
  }
  reviewFilter = "all";
  session = newSession("scenario", drawn.questions, diagnostic ? DIAGNOSTIC.ms : EXAM_DURATION_MS);
  if (diagnostic) session.diagnostic = true;
  session.scenarioIds = drawn.scenarioIds;
  session.strikes = {};
  session.comments = {};
  session.separate = true;
  persistSession();
  renderQuestion();
  startTimer();
}

/* Untimed, one scenario (or a set of missed questions), with every
 * option's note shown after each answer. Questions not yet met in a
 * scenario exam come first. */
function startScenarioPractice(scenarioId, ids, title) {
  if (!okToReplaceSaved()) return;
  var pool = ids
    ? ids.map(function (id) { return byId[id]; }).filter(Boolean)
    : SCENARIO_BANK.filter(function (q) { return q.scenario === scenarioId; });
  if (!pool.length) return;
  var used = usedScenarioQuestionIds(Store.snapshot().history);
  pool = shuffle(pool.filter(function (q) { return !used.has(q.id); }))
    .concat(shuffle(pool.filter(function (q) { return used.has(q.id); })));
  session = newSession("scenario-practice", pool, false);
  session.scenarioId = scenarioId || null;
  session.missed = !!ids;
  session.practiceTitle = title || null;
  session.strikes = {};
  session.comments = {};
  session.separate = true;
  persistSession();
  renderQuestion();
}

/* Update the spaced-review schedule for a batch of graded answers. */
function scheduleReview(results) {
  var review = Store.snapshot().review || {};
  var now = Date.now();
  var updates = {};
  var any = false;
  results.forEach(function (r) {
    var next = reviewAfterAnswer(review[r.id], r.correct, now);
    if (next) { updates[r.id] = next; any = true; }
  });
  if (any) Store.mutate(Mutations.recordReview(updates));
}

/* Due questions: scenario ones first (two-panel with notes), then the
 * rest in ordinary practice. */
function startReview() {
  var due = dueReviewIds(Store.snapshot().review, Date.now()).filter(isListed);
  var scn = due.filter(function (id) { return byId[id].scenario; });
  if (scn.length) return startScenarioPractice(null, scn, "Due for review");
  var rest = due.map(function (id) { return byId[id]; });
  if (!rest.length) return;
  if (!okToReplaceSaved()) return;
  session = newSession("practice", shuffle(rest), false);
  session.savedDrill = true;
  session.reviewDrill = true;
  persistSession();
  renderQuestion();
}

/* Eight scenario questions on one task statement, unseen first; bank
 * practice when the scenario bank has none for it. */
function drillObjective(sub) {
  if (!sub) return;
  var ids = objectiveDrillIds(SCENARIO_BANK, sub, usedScenarioQuestionIds(Store.snapshot().history));
  /* Scenario questions with notes first; the results screen then offers
   * the bank questions on the same objective. */
  if (ids.length) {
    startScenarioPractice(null, ids, "Practice — " + sub);
    if (session) session.objective = sub;
    return;
  }
  var code = sub.split(" ")[0];
  return startPractice(Number(code.split(".")[0]), code);
}

function isScenarioMode(mode) {
  return mode === "scenario" || mode === "scenario-practice";
}

/* Striking options out works wherever answers are not revealed straight
 * away: mock, imported, custom, retry and weak-drill sessions and scenario
 * exams — and scenario practice, as before. Not in plain practice, where
 * the answer shows on the first click. */
function canStrike(mode) {
  return mode !== "practice";
}

/* Crossing an option out is only a visual aid: the answer stays. */
function toggleStrike(optIdx) {
  if (!canStrike(session.mode)) return;
  if (!session.strikes) session.strikes = {};
  var id = session.questions[session.current].id;
  var list = (session.strikes[id] || []).slice();
  var at = list.indexOf(optIdx);
  if (at === -1) list.push(optIdx);
  else list.splice(at, 1);
  session.strikes[id] = list;
  persistSession();
  renderQuestion();
}

function setComment(text) {
  var id = session.questions[session.current].id;
  text = String(text || "").trim();
  if (text) session.comments[id] = text;
  else delete session.comments[id];
  persistSession();
  renderQuestion();
}

/* --------------------------------------------------------- search */
var SEARCH_SHOWN = 30; // results listed per group; "Practice these" takes all

function searchHits() {
  return {
    bank: searchQuestions(BANK, searchQuery),
    scenario: searchQuestions(SCENARIO_BANK, searchQuery),
  };
}

function renderSearch() {
  view = "search";
  app.innerHTML = '<div class="quiz-header"><div><strong>Search questions</strong></div>' +
    '<button class="btn ghost small" data-action="home">← Home</button></div>' +
    '<div class="card"><label class="search-label" for="search-q">Find questions by keyword — e.g. <i>tool_choice</i>, <i>hooks</i>, <i>CLAUDE.md</i></label>' +
    '<input class="input search-input" id="search-q" type="search" autocomplete="off" value="' + esc(searchQuery) + '" autofocus>' +
    '<p class="muted search-note">Searches the question bank and the scenario questions (text, options, explanations and objectives). Imported exams are not included.</p></div>' +
    '<div id="search-results" aria-live="polite">' + searchResultsHtml() + "</div>";
  var input = document.getElementById("search-q");
  if (input && input.focus) {
    input.focus();
    if (input.setSelectionRange) input.setSelectionRange(searchQuery.length, searchQuery.length);
  }
}

/* Typing only redraws the results, so the box keeps focus. */
function updateSearch(query) {
  searchQuery = String(query || "");
  var box = document.getElementById("search-results");
  if (box) box.innerHTML = searchResultsHtml();
  else renderSearch();
}

function searchResultsHtml() {
  if (searchQuery.replace(/\s/g, "").length < 2) return "";
  var hits = searchHits();
  if (!hits.bank.length && !hits.scenario.length) {
    return '<div class="card"><p class="muted">No questions match “' + esc(searchQuery) + "”.</p></div>";
  }
  return searchGroup("Question bank", hits.bank, "bank") + searchGroup("Scenario questions", hits.scenario, "scenario");
}

function searchGroup(title, list, pool) {
  if (!list.length) return "";
  var html = '<div class="card"><div class="search-head"><h2>' + title + ' <span class="muted">(' + list.length + ")</span></h2>" +
    '<button class="btn primary small" data-action="practice-search" data-pool="' + pool + '">Practice ' +
    (list.length === 1 ? "this one" : "these " + list.length) + "</button></div><ol class=\"search-list\">";
  list.slice(0, SEARCH_SHOWN).forEach(function (q) {
    var text = String(q.question);
    if (text.length > 220) text = text.slice(0, 220) + "…";
    html += '<li><div class="q-meta">' + questionMeta(q) + "</div>" + esc(text) + "</li>";
  });
  html += "</ol>";
  if (list.length > SEARCH_SHOWN) html += '<p class="muted">… and ' + (list.length - SEARCH_SHOWN) + " more. Add a word to narrow it down.</p>";
  return html + "</div>";
}

/* Untimed practice on the matches, with feedback after each answer. */
function startSearchPractice(pool) {
  var hits = searchHits()[pool] || [];
  if (!hits.length) return;
  var title = "Search: “" + searchQuery.trim() + "”";
  if (pool === "scenario") return startScenarioPractice(null, hits.map(function (q) { return q.id; }), title);
  if (!okToReplaceSaved()) return;
  session = newSession("practice", shuffle(hits), false);
  session.practiceTitle = title;
  persistSession();
  renderQuestion();
}

function customPool() {
  return selectCustomQuestions(BANK, customState).length;
}

function renderCustomBuilder() {
  view = "custom";
  var progressForBuilder = Store.snapshot();
  var pool = customPool();
  var html = '<div class="quiz-header"><div><strong>Custom quiz</strong></div>' +
    '<button class="btn ghost small" data-action="home">← Home</button></div>';

  html += '<div class="card"><h2>Domains</h2>' +
    '<p class="muted">Tick a domain to include it. Open one to narrow it to particular subdomains.</p>' +
    '<div class="domain-list">';
  for (var d = 1; d <= 5; d++) {
    var count = BANK.filter(function (q) { return q.domain === d; }).length;
    var on = !!customState.domains[d];
    var subsOpen = customState.openDomain === d;
    var chosenSubs = Object.keys(customState.subs).filter(function (k) {
      return customState.subs[k] && k.indexOf(d + "|") === 0;
    }).length;

    html += '<div class="builder-domain">' +
      '<label class="domain-row check-row"><input type="checkbox" class="cb-domain" data-action="cq-domain" data-domain="' + d + '"' +
      (on ? " checked" : "") + ">" +
      '<span class="domain-chip chip-d' + d + '">D' + d + "</span>" +
      "<span>" + esc(DOMAIN_NAMES[d]) + "</span>" +
      '<span class="muted">' + (chosenSubs ? chosenSubs + " subdomains" : count + " questions") + "</span>" +
      '<button class="btn ghost small cq-subs-btn" data-action="cq-open-subs" data-domain="' + d + '"' +
      ' aria-expanded="' + subsOpen + '"' + (on ? "" : " disabled") + ">Subdomains " + chev(subsOpen, true) + "</button></label>";

    if (on && subsOpen) {
      html += '<div class="sub-scores practice-subs">';
      masteryBySubdomain(BANK, progressForBuilder.correctEver, d, progressForBuilder.attempted).forEach(function (row) {
        var key = d + "|" + row.key;
        html += '<label class="sub-row check-row"><input type="checkbox" data-action="cq-sub" data-key="' + esc(key) + '"' +
          (customState.subs[key] ? " checked" : "") + ">" +
          (row.key === "general" ? "" : '<span class="sub-code">' + esc(row.key) + "</span>") +
          '<span class="sub-title">' + esc(row.title) + "</span>" +
          '<span class="muted">' + row.total + "</span></label>";
      });
      html += '<p class="muted auth-note">' +
        (chosenSubs ? "Only the ticked subdomains are included." : "None ticked — the whole domain is included.") +
        "</p></div>";
    }
    html += "</div>";
  }
  html += "</div></div>";

  html += '<div class="card"><h2>Length</h2><div class="seg" role="group" aria-label="Number of questions">';
  ["10", "20", "30", "60", "all"].forEach(function (c) {
    var label = c === "all" ? "All (" + pool + ")" : c;
    html += '<button class="' + (customState.count === c ? "active" : "") + '" data-action="cq-count" data-count="' + c + '">' + label + "</button>";
  });
  html += "</div>";
  var n = customState.count === "all" ? pool : Math.min(Number(customState.count), pool);
  html += '<p class="muted builder-summary">' + n + " question" + (n === 1 ? "" : "s") +
    " from your selected domains" + (customState.timed ? " · timed: " + n * 2 + " min" : " · untimed") + "</p>";
  html += '<div class="row builder-row">' +
    '<label class="check-inline"><input type="checkbox" data-action="cq-timed"' + (customState.timed ? " checked" : "") + "> Timed (2 min per question)</label>" +
    '<button class="btn primary" data-action="start-custom"' + (pool ? "" : " disabled") + ">Start quiz</button>" +
    "</div></div>";
  paint(html);
}

function startCustom() {
  var pool = selectCustomQuestions(BANK, customState);
  if (!pool.length) { alert("Nothing matches those filters — pick at least one domain."); return; }
  if (!okToReplaceSaved()) return;
  var count = customState.count === "all" ? pool.length : Number(customState.count);
  var questions = shuffle(pool).slice(0, Math.min(count, pool.length));
  session = newSession("custom", questions, customState.timed ? questions.length * 2 * 60 * 1000 : null);
  persistSession();
  renderQuestion();
  startTimer();
}

function startRetry(wrongIds) {
  var questions = shuffle(wrongIds.map(function (id) { return byId[id]; }).filter(Boolean));
  if (!questions.length) {
    alert("Those questions are no longer in the loaded bank.");
    return renderHome();
  }
  if (!okToReplaceSaved()) return;
  session = newSession("retry", questions, false);
  persistSession();
  renderQuestion();
}

function startSaved() {
  var saved = Store.snapshot().saved.filter(isListed)
    .map(function (id) { return byId[id]; })
    .filter(Boolean);
  if (!saved.length || !okToReplaceSaved()) return;
  session = newSession("practice", shuffle(saved), null);
  session.savedDrill = true;
  /* The list can mix bank and imported questions, so only bank ones are
   * credited; that is handled per answer. */
  persistSession();
  renderQuestion();
}

function startWeak() {
  var weak = Store.snapshot().weak.filter(isListed).map(function (id) { return byId[id]; });
  if (!weak.length || !okToReplaceSaved()) return;
  session = newSession("weak", shuffle(weak), false);
  persistSession();
  renderQuestion();
}

function startPractice(domain, subKey) {
  if (!okToReplaceSaved()) return;
  var pool = shuffle(filterBySubKey(BANK, domain, subKey || null));
  if (!pool.length) return;
  session = newSession("practice", pool, false);
  session.domain = domain;
  session.subKey = subKey || null;
  persistSession();
  renderQuestion();
}

function loadSavedSession() {
  var saved = Store.snapshot().session;
  if (!saved) return false;

  /* Drop anything the current bank no longer has, so a stale session
   * cannot crash the question screen. */
  var usable = (saved.questions || []).filter(function (s) { return byId[s.id]; });
  if (!usable.length) {
    Store.mutate(Mutations.clearSession());
    alert("That session referred to questions this version no longer has, so it was discarded.");
    return false;
  }
  saved.questions = usable;
  saved.current = Math.min(Math.max(0, saved.current || 0), usable.length - 1);
  if (!saved.answers) saved.answers = {};
  if (!saved.flagged) saved.flagged = {};
  if (!saved.tally) saved.tally = { correct: 0, wrong: 0 };
  if (!saved.strikes) saved.strikes = {};
  if (!saved.comments) saved.comments = {};
  if (!saved.timeSpent) saved.timeSpent = {};
  saved.clock = null; // time away from the session is not counted

  session = saved;
  return true;
}

function resumeSession() {
  reviewFilter = "all";
  if (!loadSavedSession()) return renderHome();
  if (session.deadline && Date.now() >= session.deadline) {
    submitSession();
    return;
  }
  renderQuestion();
  startTimer();
}

/* Grade a saved session straight from the home screen, for the case where
 * every question was answered but the session was left unsubmitted. */
function finishSavedSession() {
  if (!loadSavedSession()) return renderHome();
  submitSession();
}

/* ------------------------------------------------------------ timer */
function startTimer() {
  stopTimer();
  if (!session || !session.deadline) return;
  timerHandle = setInterval(function () {
    var el = document.getElementById("timer");
    if (!session || !session.deadline) return stopTimer();
    var left = session.deadline - Date.now();
    if (left <= 0) {
      stopTimer();
      submitSession();
      return;
    }
    if (el) {
      el.textContent = fmtTime(left);
      el.classList.toggle("urgent", left < 10 * 60 * 1000);
    }
    var paceEl = document.getElementById("pace");
    if (paceEl) {
      var text = paceText();
      if (paceEl.textContent !== text) paceEl.textContent = text;
    }
  }, 1000);
}

/* "⏱ 4 behind pace" while the user is 3+ questions behind an even pace in
 * a timed session, otherwise empty. Shown beside the timer. */
function paceText() {
  if (!session || !session.deadline) return "";
  var p = paceStatus(session.questions.length, answeredCount(session), session.startedAt, session.deadline, Date.now());
  return p ? "⏱ " + p.behind + " behind pace" : "";
}

/* The timer plus the pace hint, for every timed screen's top bar. */
function timerHtml() {
  if (!session.deadline) return "";
  var budget = fmtTime((session.deadline - session.startedAt) / session.questions.length);
  return '<span id="timer" class="timer" role="timer">' + fmtTime(session.deadline - Date.now()) + "</span>" +
    '<span id="pace" class="pace" role="status" title="Aim for about ' + budget + ' per question">' + paceText() + "</span>";
}

function fmtTime(ms) {
  var s = Math.max(0, Math.floor(ms / 1000));
  var h = Math.floor(s / 3600);
  var m = Math.floor((s % 3600) / 60);
  var sec = s % 60;
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  return (h ? h + ":" + pad(m) : m) + ":" + pad(sec);
}

/* --------------------------------------------------- question screen */
function sessionTitle() {
  switch (session.mode) {
    case "exam":
      return session.scope === "unmapped" ? "Supplementary Mock Exam" : "Mock Exam";
    case "retry": return "Retry Failed Questions";
    case "weak": return "Weak Questions Drill";
    case "practice":
      if (session.practiceTitle) return session.practiceTitle;
      if (session.reviewDrill) return "Due for review";
      if (session.savedDrill) return "Saved questions";
      if (session.examName) return "Practice — " + session.examName;
      return "Practice — " + (session.subKey && session.subKey !== "general"
        ? "Subdomain " + session.subKey
        : DOMAIN_NAMES[session.domain] + (session.subKey === "general" ? " (untagged)" : ""));
    case "custom": return "Custom Quiz";
    case "imported": return session.examName || "Imported exam";
    case "scenario": return session.diagnostic ? "Diagnostic" : "Scenario Exam";
    case "scenario-practice":
      if (session.practiceTitle) return session.practiceTitle;
      return "Practice — " + (session.missed ? "missed scenario questions"
        : (scenarioById[session.scenarioId] || {}).name || "Scenario");
  }
}

/* Which scenario block the current question is in (0-based). */
/* Blocks follow each question's own scenario, so dropping a question
 * that left the bank never shifts the labels. */
function scenarioBlockOf(sess, index) {
  if (sess.mode !== "scenario") return 0;
  var q = byId[sess.questions[index].id];
  return Math.max(0, (sess.scenarioIds || []).indexOf(q && q.scenario));
}
