/* CCAR-F Question Bank — pure logic: exam drawing, grading, progress,
 * readiness, spaced review, bank validation and scenario exams.
 * No DOM access. Loaded first; every later script uses these globals,
 * and the Node tests load it through test/engine.mjs. */

"use strict";

var EXAM_DRAW_COUNTS = { 1: 16, 2: 11, 3: 12, 4: 12, 5: 9 };
var EXPECTED_BANK_SIZE = 877; // kept honest by test/validate-bank.mjs
var PASS_SCORE = 720;
var EXAM_DURATION_MS = 120 * 60 * 1000;
var DOMAIN_NAMES = {
  1: "Agentic Architecture & Orchestration",
  2: "Tool Design & MCP Integration",
  3: "Claude Code Configuration & Workflows",
  4: "Prompt Engineering & Structured Output",
  5: "Context Management & Reliability",
};

function shuffle(arr, rng) {
  rng = rng || Math.random;
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(rng() * (i + 1));
    var t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

function drawExam(bank, counts, rng) {
  var drawn = [];
  for (var domain in counts) {
    var want = counts[domain];
    var pool = bank.filter(function (q) { return q.domain === Number(domain); });
    if (pool.length < want) {
      throw new Error(
        "Bank has only " + pool.length + " questions for domain " + domain + ", need " + want
      );
    }
    drawn = drawn.concat(shuffle(pool, rng).slice(0, want));
  }
  return shuffle(drawn, rng);
}

function scaledScore(correct, total) {
  return Math.round((correct / total) * 1000);
}

/* A question is answered with one option index, or several when it asks for
 * more than one. Both shapes normalise to a sorted list. */
function correctIndices(q) {
  if (Array.isArray(q.answers)) return q.answers.slice().sort(function (a, b) { return a - b; });
  if (Number.isInteger(q.answer)) return [q.answer];
  return [];
}

function isMultiAnswer(q) {
  return correctIndices(q).length > 1;
}

function chosenIndices(given) {
  if (given === null || given === undefined) return [];
  if (Array.isArray(given)) return given.slice().sort(function (a, b) { return a - b; });
  return [given];
}

/* Add or remove one option from a multi-answer selection. */
function toggleChoice(given, optIdx) {
  var chosen = chosenIndices(given);
  var at = chosen.indexOf(optIdx);
  if (at === -1) chosen.push(optIdx);
  else chosen.splice(at, 1);
  if (!chosen.length) return null;
  return chosen.sort(function (a, b) { return a - b; });
}

function sameChoice(given, correct) {
  var chosen = chosenIndices(given);
  if (chosen.length !== correct.length) return false;
  for (var i = 0; i < correct.length; i++) if (chosen[i] !== correct[i]) return false;
  return true;
}

function gradeSession(questions, answers) {
  var result = { correct: 0, total: questions.length, perDomain: {}, wrongIds: [], correctIds: [] };
  questions.forEach(function (q) {
    var d = result.perDomain[q.domain] || (result.perDomain[q.domain] = { correct: 0, total: 0 });
    d.total++;
    if (sameChoice(answers[q.id], correctIndices(q))) {
      result.correct++;
      d.correct++;
      result.correctIds.push(q.id);
    } else {
      result.wrongIds.push(q.id);
    }
  });
  return result;
}

function updateWeakSet(weak, grade) {
  var set = {};
  weak.forEach(function (id) { set[id] = true; });
  (grade.wrongIds || []).forEach(function (id) { set[id] = true; });
  (grade.correctIds || []).forEach(function (id) { delete set[id]; });
  return Object.keys(set);
}

/* Pick the questions a custom quiz may draw from. A domain with no subdomain
 * boxes ticked contributes all of its questions; ticking any narrows that
 * domain to the ticked ones and leaves other domains alone. */
/* The exam guide lists 30 subdomains. Questions mapped to one are the closest
 * match to the real exam; the rest are kept as a separate pool so a mock exam
 * is drawn from exam-guide-aligned material only. */
function filterByTagging(bank, wantTagged) {
  return bank.filter(function (q) { return !!q.subdomain === wantTagged; });
}

function selectCustomQuestions(bank, state) {
  var domains = (state && state.domains) || {};
  var subs = (state && state.subs) || {};
  var chosenByDomain = {};
  Object.keys(subs).forEach(function (key) {
    if (!subs[key]) return;
    var parts = key.split("|");
    (chosenByDomain[parts[0]] || (chosenByDomain[parts[0]] = {}))[parts[1]] = true;
  });
  return bank.filter(function (q) {
    if (!domains[q.domain]) return false;
    var picked = chosenByDomain[q.domain];
    if (!picked) return true;
    return picked[subKeyOf(q).key] === true;
  });
}

function sampleQuiz(bank, domains, count, rng) {
  var pool = bank.filter(function (q) { return domains.indexOf(q.domain) !== -1; });
  return shuffle(pool, rng).slice(0, Math.min(count, pool.length));
}

function indexIds(ids) {
  var set = {};
  (ids || []).forEach(function (id) { set[id] = true; });
  return set;
}

function masteryByDomain(bank, correctEverIds, attemptedIds) {
  var correct = indexIds(correctEverIds);
  var seen = indexIds(attemptedIds);
  var result = {};
  bank.forEach(function (q) {
    var d = result[q.domain] || (result[q.domain] = { correct: 0, attempted: 0, total: 1 - 1 });
    d.total++;
    if (correct[q.id]) d.correct++;
    if (seen[q.id] || correct[q.id]) d.attempted++;
  });
  return result;
}

function subKeyOf(q) {
  if (!q.subdomain) return { key: "general", title: "General (untagged)" };
  var s = String(q.subdomain);
  var sp = s.indexOf(" ");
  return sp === -1 ? { key: s, title: "" } : { key: s.slice(0, sp), title: s.slice(sp + 1) };
}

function filterBySubKey(bank, domain, subKey) {
  return bank.filter(function (q) {
    return q.domain === domain && (!subKey || subKeyOf(q).key === subKey);
  });
}

function masteryBySubdomain(bank, correctEverIds, domain, attemptedIds) {
  var correct = indexIds(correctEverIds);
  var seen = indexIds(attemptedIds);
  var rows = {};
  bank.forEach(function (q) {
    if (q.domain !== domain) return;
    var sk = subKeyOf(q);
    var key = sk.key, title = sk.title;
    var row = rows[key] || (rows[key] = { key: key, title: title, correct: 0, attempted: 0, total: 0 });
    row.total++;
    if (correct[q.id]) row.correct++;
    if (seen[q.id] || correct[q.id]) row.attempted++;
  });
  return Object.keys(rows)
    .sort(function (a, b) {
      if (a === "general") return 1;
      if (b === "general") return -1;
      return a < b ? -1 : 1;
    })
    .map(function (k) { return rows[k]; });
}

function validateBank(bank) {
  var errors = [];
  var seen = {};
  bank.forEach(function (q) {
    var id = q.id || "<missing id>";
    if (seen[id]) errors.push(id + ": duplicate id");
    seen[id] = true;
    if (!q.domain || !DOMAIN_NAMES[q.domain]) errors.push(id + ": invalid domain " + q.domain);
    if (!q.question || !String(q.question).trim()) errors.push(id + ": empty question");
    /* Single-answer questions have four options; multiple-response ones have
     * five, with two or more correct. */
    var multi = Array.isArray(q.answers);
    if (!Array.isArray(q.options) || q.options.length < 4 || q.options.length > 5)
      errors.push(id + ": must have four or five options");
    else if (q.options.some(function (o) { return !o || !String(o).trim(); }))
      errors.push(id + ": blank option");

    var picks = multi ? q.answers : [q.answer];
    if (multi && q.answers.length < 2) errors.push(id + ": answers must list at least two indices");
    if (multi && Number.isInteger(q.answer)) errors.push(id + ": has both answer and answers");
    if (multi && new Set(q.answers).size !== q.answers.length)
      errors.push(id + ": repeated index in answers");
    picks.forEach(function (idx) {
      if (!Number.isInteger(idx) || idx < 0 || !q.options || idx >= q.options.length)
        errors.push(id + ": answer index out of range");
    });
    if (!q.explanation || !String(q.explanation).trim()) errors.push(id + ": empty explanation");
  });
  return errors;
}

/* ------------------------------------------------------ scenario bank */
/* The 30 exam-guide task statements, spelled exactly as the general bank's
 * `subdomain` values. Every scenario question must carry one. */
var SUBDOMAINS = [
  "1.1 Design and implement agentic loops for autonomous task execution",
  "1.2 Orchestrate multi-agent systems with coordinator-subagent patterns",
  "1.3 Configure subagent invocation, context passing, and spawning",
  "1.4 Implement multi-step workflows with enforcement and handoff patterns",
  "1.5 Apply Agent SDK hooks for tool call interception and data normalization",
  "1.6 Design task decomposition strategies for complex workflows",
  "1.7 Manage session state, resumption, and forking",
  "2.1 Design effective tool interfaces with clear descriptions and boundaries",
  "2.2 Implement structured error responses for MCP tools",
  "2.3 Distribute tools appropriately across agents and configure tool choice",
  "2.4 Integrate MCP servers into Claude Code and agent workflows",
  "2.5 Select and apply built-in tools (Read, Write, Edit, Bash, Grep, Glob) effectively",
  "3.1 Configure CLAUDE.md files with appropriate hierarchy, scoping, and modular organization",
  "3.2 Create and configure custom slash commands and skills",
  "3.3 Apply path-specific rules for conditional convention loading",
  "3.4 Determine when to use plan mode vs direct execution",
  "3.5 Apply iterative refinement techniques for progressive improvement",
  "3.6 Integrate Claude Code into CI/CD pipelines",
  "4.1 Design prompts with explicit criteria to improve precision and reduce false positives",
  "4.2 Apply few-shot prompting to improve output consistency and quality",
  "4.3 Enforce structured output using tool use and JSON schemas",
  "4.4 Implement validation, retry, and feedback loops for extraction quality",
  "4.5 Design efficient batch processing strategies",
  "4.6 Design multi-instance and multi-pass review architectures",
  "5.1 Manage conversation context to preserve critical information across long interactions",
  "5.2 Design effective escalation and ambiguity resolution patterns",
  "5.3 Implement error propagation strategies across multi-agent systems",
  "5.4 Manage context effectively in large codebase exploration",
  "5.5 Design human review workflows and confidence calibration",
  "5.6 Preserve information provenance and handle uncertainty in multi-source synthesis"
];
var SCENARIO_MIN_WORDS = 40;
var LETTER_REF = /\b(option|answer|choice)\s+[A-D]\b|\(\s*[A-D]\s*\)|^[A-D][.)]\s/;

function validateScenarioBank(scenarios, bank) {
  var errors = [];
  var byScenario = {};
  (scenarios || []).forEach(function (s) { byScenario[s.id] = s; });
  var seen = {};
  (bank || []).forEach(function (q) {
    var id = q.id || "<missing id>";
    if (seen[id]) errors.push(id + ": duplicate id");
    seen[id] = true;
    var scn = byScenario[q.scenario];
    if (!scn) errors.push(id + ": unknown scenario " + q.scenario);
    if (SUBDOMAINS.indexOf(q.subdomain) < 0) errors.push(id + ": unknown subdomain " + q.subdomain);
    if (!q.domain || !DOMAIN_NAMES[q.domain]) errors.push(id + ": invalid domain " + q.domain);
    if (!Array.isArray(q.options) || q.options.length !== 4 ||
        q.options.some(function (o) { return !o || !String(o).trim(); }))
      errors.push(id + ": must have exactly 4 options");
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3 || q.answers)
      errors.push(id + ": needs a single answer index 0-3");
    if (!Array.isArray(q.optionNotes) || q.optionNotes.length !== 4 ||
        q.optionNotes.some(function (n) { return !n || !String(n).trim(); }))
      errors.push(id + ": needs 4 non-empty optionNotes");
    if (!q.explanation || !String(q.explanation).trim()) errors.push(id + ": empty explanation");
    var text = String(q.question || "").trim();
    if (/^scenario\s*:/i.test(text) ||
        (scn && scn.text && text.indexOf(scn.text.slice(0, 60)) >= 0))
      errors.push(id + ": repeats the scenario intro");
    if (text.split(/\s+/).length < SCENARIO_MIN_WORDS) errors.push(id + ": question too short");
    (q.optionNotes || []).concat([q.explanation || ""]).forEach(function (t) {
      if (LETTER_REF.test(String(t))) errors.push(id + ": letter reference in note or explanation");
    });
  });
  return errors;
}

var SCENARIO_BLOCK = 15;
var SCENARIO_COUNT = 4;

function scenarioPool(bank, scenarioId) {
  return (bank || []).filter(function (q) { return q.scenario === scenarioId; });
}

/* Scenarios with enough questions to fill a block of the exam. */
function eligibleScenarios(scenarios, bank, perScenario) {
  var need = perScenario || SCENARIO_BLOCK;
  return (scenarios || [])
    .filter(function (s) { return scenarioPool(bank, s.id).length >= need; })
    .map(function (s) { return s.id; });
}

/* Ids of every question that appeared in an earlier scenario exam. */
function usedScenarioQuestionIds(history) {
  var used = new Set();
  (history || []).forEach(function (h) {
    if (h && h.kind === "scenario" && Array.isArray(h.items))
      h.items.forEach(function (it) { used.add(it.id); });
  });
  return used;
}

/* Like the real exam: four scenarios, 15 questions each, kept in contiguous
 * blocks. Questions not used in earlier attempts are taken first. */
function drawScenarioExam(scenarios, bank, usedIds, rng, opts) {
  var count = (opts && opts.count) || SCENARIO_COUNT;
  var per = (opts && opts.perScenario) || SCENARIO_BLOCK;
  var eligible = eligibleScenarios(scenarios, bank, per);
  if (eligible.length < count) return null;
  usedIds = usedIds || new Set();
  var picked = shuffle(eligible, rng).slice(0, count);
  var questions = [];
  picked.forEach(function (sid) {
    var pool = scenarioPool(bank, sid);
    var fresh = shuffle(pool.filter(function (q) { return !usedIds.has(q.id); }), rng);
    var seen = shuffle(pool.filter(function (q) { return usedIds.has(q.id); }), rng);
    questions = questions.concat(fresh.concat(seen).slice(0, per));
  });
  return { scenarioIds: picked, questions: questions };
}

/* Percent correct per group (objective, scenario...), weakest first. */
function breakdownBy(questions, answers, keyFn) {
  var rows = {};
  var order = [];
  questions.forEach(function (q) {
    var key = keyFn(q);
    if (!rows[key]) { rows[key] = { key: key, correct: 0, total: 0, pct: 0 }; order.push(key); }
    rows[key].total++;
    if (sameChoice(answers[q.id], correctIndices(q))) rows[key].correct++;
  });
  return order
    .map(function (k) {
      var r = rows[k];
      r.pct = Math.round((100 * r.correct) / r.total);
      return r;
    })
    .sort(function (a, b) {
      return a.pct - b.pct || String(a.key).localeCompare(String(b.key), undefined, { numeric: true });
    });
}

/* --------------------------------------------------------- progress state */
/* One object holds all synced progress. Changes are expressed as named
 * mutations rather than whole-blob writes so that removals (a finished
 * session, a redeemed weak question) survive a sync: on a write conflict the
 * pending mutations are replayed on top of the freshest server state instead
 * of a merge guessing what was deleted. */

function emptyProgress() {
  return { history: [], weak: [], correctEver: [], attempted: [], saved: [], session: null, review: {}, examDate: null };
}

/* A real calendar date in YYYY-MM-DD form (rejects 2026-02-30 etc.). */
function isValidDate(str) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str || ""));
  if (!m) return false;
  var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

/* Whole calendar days from today (local) to the date, counted on UTC
 * midnights so a daylight-saving change never shifts the count. */
function daysUntil(str, now) {
  if (!isValidDate(str)) return null;
  var p = str.split("-");
  var today = new Date(now);
  var from = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((Date.UTC(+p[0], +p[1] - 1, +p[2]) - from) / 86400000);
}

function isReviewEntry(e) {
  return !!e && typeof e === "object" && typeof e.due === "number" &&
    typeof e.step === "number" && typeof e.updatedAt === "number";
}

function normalizeProgress(raw) {
  var s = emptyProgress();
  if (!raw || typeof raw !== "object") return s;
  if (Array.isArray(raw.history)) {
    s.history = raw.history.filter(function (h) { return h && h.date; });
  }
  if (Array.isArray(raw.weak)) s.weak = raw.weak.filter(function (id) { return typeof id === "string"; });
  if (Array.isArray(raw.correctEver)) {
    s.correctEver = raw.correctEver.filter(function (id) { return typeof id === "string"; });
  }
  if (Array.isArray(raw.attempted)) {
    s.attempted = raw.attempted.filter(function (id) { return typeof id === "string"; });
  }
  if (Array.isArray(raw.saved)) {
    s.saved = raw.saved.filter(function (id) { return typeof id === "string"; });
  }
  if (raw.session && typeof raw.session === "object" && Array.isArray(raw.session.questions)) {
    s.session = raw.session;
  }
  if (raw.review && typeof raw.review === "object") {
    Object.keys(raw.review).forEach(function (id) {
      if (isReviewEntry(raw.review[id])) s.review[id] = raw.review[id];
    });
  }
  if (isValidDate(raw.examDate)) s.examDate = raw.examDate;
  return s;
}

function cloneProgress(state) {
  return JSON.parse(JSON.stringify(normalizeProgress(state)));
}

/* Rows written before the state refactor used one key per field, prefixed
 * "ccarf.". Read those as the current shape so existing progress survives. */
function progressFromStored(raw) {
  if (raw && typeof raw === "object" &&
      ("ccarf.history" in raw || "ccarf.weak" in raw ||
       "ccarf.correctEver" in raw || "ccarf.session" in raw)) {
    return normalizeProgress({
      history: raw["ccarf.history"],
      weak: raw["ccarf.weak"],
      correctEver: raw["ccarf.correctEver"],
      attempted: raw["ccarf.attempted"],
      saved: raw["ccarf.saved"],
      session: raw["ccarf.session"],
    });
  }
  return normalizeProgress(raw);
}

/* Combine two independent copies. Used once per device, when progress made
 * before it ever synced meets the server copy; after that, replayed mutations
 * carry changes (including deletions) and no merging is involved. */
function mergeProgress(a, b) {
  a = normalizeProgress(a);
  b = normalizeProgress(b);
  var byDate = {};
  a.history.concat(b.history).forEach(function (h) { byDate[h.date] = h; });
  return {
    history: Object.keys(byDate).sort().map(function (d) { return byDate[d]; }),
    weak: unionIds(a.weak, b.weak),
    correctEver: unionIds(a.correctEver, b.correctEver),
    attempted: unionIds(a.attempted, b.attempted),
    saved: unionIds(a.saved, b.saved),
    session: !a.session ? b.session
      : !b.session ? a.session
      : (b.session.startedAt || 0) > (a.session.startedAt || 0) ? b.session : a.session,
    review: mergeReview(a.review, b.review),
    examDate: b.examDate || a.examDate,
  };
}

/* The newer write wins per question, so a reset or a finish is never undone
 * by an older copy from another device. */
function mergeReview(a, b) {
  var out = {};
  [a || {}, b || {}].forEach(function (src) {
    Object.keys(src).forEach(function (id) {
      if (!out[id] || src[id].updatedAt >= out[id].updatedAt) out[id] = src[id];
    });
  });
  return out;
}

/* ------------------------------------------------------------ readiness */
function examAttempts(history) {
  return (history || []).filter(function (h) { return h && typeof h.score === "number"; });
}

/* Recent exams count most: the last five, weighted 5..1 newest first. */
function predictedScore(history) {
  var recent = examAttempts(history).slice(-5).reverse();
  if (!recent.length) return null;
  var sum = 0, weights = 0;
  recent.forEach(function (h, i) { var w = 5 - i; sum += h.score * w; weights += w; });
  var score = Math.round(sum / weights);
  return {
    score: score,
    count: recent.length,
    verdict: score >= 760 ? "pass" : score >= 680 ? "borderline" : "not-yet",
  };
}

/* Percent correct per exam-guide task statement across exam attempts. */
function objectiveAccuracy(history, lookup) {
  var acc = {};
  examAttempts(history).forEach(function (h) {
    (h.items || []).forEach(function (it) {
      var q = lookup(it.id);
      if (!q || SUBDOMAINS.indexOf(q.subdomain) < 0) return;
      var row = acc[q.subdomain] || (acc[q.subdomain] = { correct: 0, total: 0 });
      row.total++;
      if (sameChoice(it.given === undefined ? null : it.given, correctIndices(q))) row.correct++;
    });
  });
  return acc;
}

function weakestObjectives(acc, limit, minAnswered) {
  limit = limit || 3;
  minAnswered = minAnswered || 3;
  return Object.keys(acc || {})
    .filter(function (k) { return acc[k].total >= minAnswered; })
    .map(function (k) {
      return { key: k, correct: acc[k].correct, total: acc[k].total, pct: Math.round((100 * acc[k].correct) / acc[k].total) };
    })
    .sort(function (a, b) { return a.pct - b.pct || a.total - b.total || (a.key < b.key ? -1 : 1); })
    .slice(0, limit);
}

function objectiveDrillIds(scenarioBank, subdomain, usedIds, n, rng) {
  n = n || 8;
  usedIds = usedIds || new Set();
  var pool = (scenarioBank || []).filter(function (q) { return q.subdomain === subdomain; });
  var fresh = shuffle(pool.filter(function (q) { return !usedIds.has(q.id); }), rng);
  var seen = shuffle(pool.filter(function (q) { return usedIds.has(q.id); }), rng);
  return fresh.concat(seen).slice(0, n).map(function (q) { return q.id; });
}

/* Best percent per scenario over scenario exam attempts. */
function bestScenarioScores(history, lookup) {
  var best = {};
  (history || []).forEach(function (h) {
    if (!h || h.kind !== "scenario") return;
    var per = {};
    (h.items || []).forEach(function (it) {
      var q = lookup(it.id);
      if (!q || !q.scenario) return;
      var row = per[q.scenario] || (per[q.scenario] = { c: 0, t: 0 });
      row.t++;
      if (sameChoice(it.given === undefined ? null : it.given, correctIndices(q))) row.c++;
    });
    Object.keys(per).forEach(function (sid) {
      var pct = Math.round((100 * per[sid].c) / per[sid].t);
      if (best[sid] === undefined || pct > best[sid]) best[sid] = pct;
    });
  });
  return best;
}

/* ------------------------------------------------------- spaced review */
var DAY_MS = 86400000;
var REVIEW_STEPS_DAYS = [1, 3, 7, 14];

/* A missed question comes back after 1 day, then 3, 7 and 14 days each time
 * it is answered correctly once due; after the last step it is done. Returns
 * the new entry, or null when nothing changes. */
function reviewAfterAnswer(entry, correct, now) {
  if (!correct) return { step: 0, due: now + DAY_MS, updatedAt: now };
  if (!entry || entry.done || entry.due > now) return null;
  if (entry.step >= REVIEW_STEPS_DAYS.length - 1) {
    return { step: entry.step, due: entry.due, updatedAt: now, done: true };
  }
  var step = entry.step + 1;
  return { step: step, due: now + REVIEW_STEPS_DAYS[step] * DAY_MS, updatedAt: now };
}

function dueReviewIds(review, now) {
  return Object.keys(review || {}).filter(function (id) {
    var e = review[id];
    return e && !e.done && e.due <= now;
  });
}

function unionIds(existing, added) {
  var set = {};
  (existing || []).forEach(function (id) { set[id] = true; });
  (added || []).forEach(function (id) { set[id] = true; });
  return Object.keys(set).sort();
}

/* ---------------------------------------------------- study resources */
/* The groups the home page shows, in display order. */
var RESOURCE_GROUPS = ["Official", "Study guides", "Practice & reviews", "Events"];

/* Keeps the entries that are safe to render as links: an https URL, a
 * title, a known group and an id not already used. */
function validResources(list) {
  var seen = {};
  return (Array.isArray(list) ? list : []).filter(function (r) {
    if (!r || typeof r.id !== "string" || !r.id || seen[r.id]) return false;
    if (typeof r.title !== "string" || !r.title.trim()) return false;
    if (typeof r.url !== "string" || !/^https:\/\/[^\s]+$/.test(r.url)) return false;
    if (RESOURCE_GROUPS.indexOf(r.group) < 0) return false;
    seen[r.id] = true;
    return true;
  });
}

/* ------------------------------------------------ time per question */
/* One stretch on a question counts for at most this long, so a tab left
 * open over lunch does not make a question look slow. */
var MAX_VISIT_MS = 5 * 60 * 1000;

/* Returns a new time-spent map with the stretch from `since` to `now`
 * added to question `id`. */
function addTime(spent, id, since, now) {
  var out = Object.assign({}, spent || {});
  if (!id || typeof since !== "number" || !(now > since)) return out;
  out[id] = (out[id] || 0) + Math.min(now - since, MAX_VISIT_MS);
  return out;
}

/* Average time per question, and the objectives (or domains, for questions
 * without one) that took longest on average — at least two questions each.
 * `spent` is ms per question id; questions with no time are left out. */
function paceSummary(questions, spent, limit) {
  spent = spent || {};
  var timed = (questions || []).filter(function (q) { return q && spent[q.id] > 0; });
  if (!timed.length) return null;
  var total = 0;
  var groups = {};
  timed.forEach(function (q) {
    var ms = spent[q.id];
    total += ms;
    var key = q.subdomain || (DOMAIN_NAMES[q.domain] ? "D" + q.domain + " " + DOMAIN_NAMES[q.domain] : null);
    if (!key) return;
    var g = groups[key] = groups[key] || { key: key, ms: 0, n: 0 };
    g.ms += ms;
    g.n++;
  });
  var slowest = Object.keys(groups).map(function (k) { return groups[k]; })
    .filter(function (g) { return g.n >= 2; })
    .map(function (g) { return { key: g.key, avgMs: Math.round(g.ms / g.n), n: g.n }; })
    .sort(function (a, b) { return b.avgMs - a.avgMs; })
    .slice(0, limit || 3);
  return { avgMs: Math.round(total / timed.length), count: timed.length, slowest: slowest };
}

/* In a timed session: how many questions behind an even pace the user is.
 * Returns null when on pace or less than 3 behind, so a short pause on a
 * hard question never nags. */
function paceStatus(total, answered, startedAt, deadline, now) {
  if (!deadline || !startedAt || !total || deadline <= startedAt) return null;
  var budget = (deadline - startedAt) / total;
  var expected = Math.min(total, Math.floor((now - startedAt) / budget));
  var behind = expected - answered;
  return behind >= 3 ? { behind: behind, budgetMs: Math.round(budget) } : null;
}
