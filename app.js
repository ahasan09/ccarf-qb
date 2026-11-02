/* CCAR-F Question Bank — quiz engine.
 * Pure logic first (exported for Node tests), DOM app below. */

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
  if (typeof raw.examDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.examDate)) s.examDate = raw.examDate;
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

/* Each mutation is { key, apply }. `key` marks mutations that supersede an
 * earlier pending one (only the latest session write needs to be sent);
 * keyless mutations accumulate. Every apply() is idempotent so replaying a
 * mutation whose write actually landed cannot double-count. */
var Mutations = {
  setSession: function (session) {
    return { key: "session", apply: function (s) { s.session = session ? JSON.parse(JSON.stringify(session)) : null; } };
  },
  clearSession: function () {
    return { key: "session", apply: function (s) { s.session = null; } };
  },
  finishSession: function (grade, entry, opts) {
    var trackBankProgress = !(opts && opts.separate);
    return {
      key: null,
      apply: function (s) {
        s.session = null;
        if (trackBankProgress) {
          s.weak = updateWeakSet(s.weak, grade).sort();
          s.correctEver = unionIds(s.correctEver, grade.correctIds);
          s.attempted = unionIds(s.attempted, (grade.correctIds || []).concat(grade.wrongIds || []));
        }
        if (entry && !s.history.some(function (h) { return h.date === entry.date; })) {
          s.history = s.history.concat([entry]).sort(function (a, b) {
            return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
          });
        }
      },
    };
  },
  clearHistory: function () {
    return { key: "clearHistory", apply: function (s) { s.history = []; } };
  },
  /* Bookmark a question to come back to, or clear the bookmark. */
  recordReview: function (updates) {
    return {
      key: null,
      apply: function (s) {
        s.review = s.review || {};
        /* Replayed after a sync, so an older queued update must not
         * overwrite a newer entry written by another device. */
        Object.keys(updates || {}).forEach(function (id) {
          var cur = s.review[id];
          if (updates[id] && !(cur && cur.updatedAt > updates[id].updatedAt)) s.review[id] = updates[id];
        });
      },
    };
  },
  setExamDate: function (date) {
    return { key: "examDate", apply: function (s) { s.examDate = date || null; } };
  },
  toggleSaved: function (questionId) {
    return {
      key: null,
      apply: function (s) {
        if (s.saved.indexOf(questionId) === -1) s.saved = unionIds(s.saved, [questionId]);
        else s.saved = s.saved.filter(function (id) { return id !== questionId; });
      },
    };
  },
  /* Fold a rescued copy of progress back in. */
  restore: function (backup) {
    return {
      key: null,
      apply: function (s) {
        var merged = mergeProgress(s, backup);
        s.history = merged.history;
        s.weak = merged.weak;
        s.correctEver = merged.correctEver;
        s.attempted = merged.attempted;
        s.saved = merged.saved;
        if (!s.session && merged.session) s.session = merged.session;
      },
    };
  },
  /* Credit a single answer as soon as it is graded, so leaving a long
   * practice run part-way still keeps what was earned. */
  recordAnswer: function (questionId, wasCorrect) {
    return {
      key: null,
      apply: function (s) {
        s.attempted = unionIds(s.attempted, [questionId]);
        if (wasCorrect) {
          s.correctEver = unionIds(s.correctEver, [questionId]);
          s.weak = s.weak.filter(function (id) { return id !== questionId; });
        } else {
          s.weak = unionIds(s.weak, [questionId]);
        }
      },
    };
  },
};

function applyMutations(state, mutations) {
  var next = cloneProgress(state);
  (mutations || []).forEach(function (m) { m.apply(next); });
  return next;
}

/* Keep only the newest mutation per key; keyless ones all survive. */
function compactMutations(mutations) {
  var seenKeys = {};
  var out = [];
  for (var i = mutations.length - 1; i >= 0; i--) {
    var m = mutations[i];
    if (m.key) {
      if (seenKeys[m.key]) continue;
      seenKeys[m.key] = true;
    }
    out.unshift(m);
  }
  return out;
}

/* Holds the progress state, records changes as mutations, and tracks what has
 * not reached the server yet. Storage and notification are injected so this is
 * testable without a browser. */
function createStore(io) {
  io = io || {};
  var save = io.save || function () {};
  var emit = io.emit || function () {};
  var readFlag = io.readFlag || function () { return false; };
  var writeFlag = io.writeFlag || function () {};

  return {
    state: normalizeProgress(io.initial),
    pending: [],
    mutate: function (mutation) {
      this.pending = compactMutations(this.pending.concat([mutation]));
      this.state = applyMutations(this.state, [mutation]);
      save(this.state);
      writeFlag(true);
      emit();
    },
    /* Server state wins, with anything not yet written replayed on top.
     * Only persists when something actually changed: rewriting the cache on
     * every sync would wake other tabs through the storage event and have
     * them sync straight back. */
    adopt: function (serverState) {
      var next = applyMutations(normalizeProgress(serverState), this.pending);
      var changed = JSON.stringify(next) !== JSON.stringify(this.state);
      this.state = next;
      if (changed) save(next);
      return next;
    },
    markSynced: function () {
      this.pending = [];
      writeFlag(false);
    },
    hasUnsyncedWork: function () {
      return this.pending.length > 0 || readFlag() === true;
    },
    reset: function () {
      this.state = emptyProgress();
      this.pending = [];
      save(this.state);
      writeFlag(false);
    },
    snapshot: function () { return this.state; },
  };
}

/* read → replay → compare-and-swap write. A write that loses the race
 * re-reads and replays rather than overwriting the winner. */
function createSyncEngine(io) {
  var store = io.store;
  var stamp = null;

  return {
    seenStamp: function () { return stamp; },
    forget: function () { stamp = null; },
    sync: function () {
      var attempt = 0;

      function round() {
        return io.readRow().then(function (row) {
          stamp = row ? row.stamp : null;

          var base = row ? progressFromStored(row.data) : null;
          /* Work done before this device ever synced (offline, or signed
           * out) is folded in once; after that the replayed mutations carry
           * every change, deletions included. */
          if (row && store.hasUnsyncedWork() && !store.pending.length) {
            base = mergeProgress(store.snapshot(), base);
          }

          var next = store.adopt(base);
          var needsWrite = !row || store.pending.length > 0 || store.hasUnsyncedWork();
          if (!needsWrite) return { written: false, state: next };

          return io.writeRow(next, stamp).then(function (res) {
            if (res && res.ok) {
              stamp = res.stamp;
              store.markSynced();
              return { written: true, state: next };
            }
            if (++attempt >= 4) throw new Error("Could not settle with the server after several tries.");
            return round();
          });
        });
      }

      return round();
    },
  };
}

/* Node test export guard */
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    createStore: createStore,
    createSyncEngine: createSyncEngine,
    emptyProgress: emptyProgress,
    normalizeProgress: normalizeProgress,
    progressFromStored: progressFromStored,
    applyMutations: applyMutations,
    compactMutations: compactMutations,
    Mutations: Mutations,
    EXAM_DRAW_COUNTS: EXAM_DRAW_COUNTS,
    EXPECTED_BANK_SIZE: EXPECTED_BANK_SIZE,
    PASS_SCORE: PASS_SCORE,
    EXAM_DURATION_MS: EXAM_DURATION_MS,
    DOMAIN_NAMES: DOMAIN_NAMES,
    shuffle: shuffle,
    drawExam: drawExam,
    scaledScore: scaledScore,
    gradeSession: gradeSession,
    correctIndices: correctIndices,
    isMultiAnswer: isMultiAnswer,
    chosenIndices: chosenIndices,
    toggleChoice: toggleChoice,
    updateWeakSet: updateWeakSet,
    validateBank: validateBank,
    validateScenarioBank: validateScenarioBank,
    reviewAfterAnswer: reviewAfterAnswer,
    examAttempts: examAttempts,
    predictedScore: predictedScore,
    objectiveAccuracy: objectiveAccuracy,
    weakestObjectives: weakestObjectives,
    objectiveDrillIds: objectiveDrillIds,
    bestScenarioScores: bestScenarioScores,
    dueReviewIds: dueReviewIds,
    REVIEW_STEPS_DAYS: REVIEW_STEPS_DAYS,
    DAY_MS: DAY_MS,
    SUBDOMAINS: SUBDOMAINS,
    SCENARIO_MIN_WORDS: SCENARIO_MIN_WORDS,
    SCENARIO_BLOCK: SCENARIO_BLOCK,
    SCENARIO_COUNT: SCENARIO_COUNT,
    eligibleScenarios: eligibleScenarios,
    usedScenarioQuestionIds: usedScenarioQuestionIds,
    drawScenarioExam: drawScenarioExam,
    breakdownBy: breakdownBy,
    sampleQuiz: sampleQuiz,
    selectCustomQuestions: selectCustomQuestions,
    filterByTagging: filterByTagging,
    masteryByDomain: masteryByDomain,
    masteryBySubdomain: masteryBySubdomain,
    filterBySubKey: filterBySubKey,
    mergeProgress: mergeProgress,
  };
}

/* sync.js is a module, so it runs after this script and can rely on these */
if (typeof window !== "undefined") {
  window.CCARF_PROGRESS = {
    empty: emptyProgress,
    normalize: normalizeProgress,
    fromStored: progressFromStored,
    merge: mergeProgress,
  };
  window.createSyncEngine = createSyncEngine;
}

/* ---------------------------------------------------------------- DOM app */
if (typeof document !== "undefined") {
  (function () {
    var BANK = window.QUESTION_BANK || [];
    /* Imported exams are deliberately kept out of BANK: they never feed the
     * practice pools, custom quizzes, mastery or the weak-question drill.
     * Only the manifest loads with the page; each exam's questions are
     * fetched the first time they are needed. */
    var EXAMS = window.MOCK_EXAM_INDEX || (window.MOCK_EXAMS || []);
    var examById = {};
    EXAMS.forEach(function (e) {
      examById[e.id] = { id: e.id, name: e.name, count: e.count, questions: e.questions };
    });

    /* Mock exams draw from the exam-guide-mapped pool; the unmapped ones are
     * kept aside and only used by the supplementary exam. */
    var MAPPED = filterByTagging(BANK, true);
    var UNMAPPED = filterByTagging(BANK, false);

    var bankIds = {};
    BANK.forEach(function (q) { bankIds[q.id] = true; });

    var byId = {};
    BANK.forEach(function (q) { byId[q.id] = q; });

    /* The scenario bank is separate too: its questions are looked up by id
     * but never join BANK, so they don't touch mastery or the weak drill. */
    var SCENARIOS = window.SCENARIOS || [];
    var SCENARIO_BANK = window.SCENARIO_BANK || [];
    var scenarioById = {};
    SCENARIOS.forEach(function (s) { scenarioById[s.id] = s; });
    SCENARIO_BANK.forEach(function (q) { byId[q.id] = q; });

    var examLoads = {};

    function registerLoadedExams() {
      (window.MOCK_EXAMS || []).forEach(function (e) {
        var known = examById[e.id] || (examById[e.id] = { id: e.id, name: e.name });
        known.questions = e.questions;
        e.questions.forEach(function (q) { byId[q.id] = q; });
      });
    }
    registerLoadedExams();

    function loadExam(examId) {
      if (!examId || !examById[examId]) return Promise.resolve(null);
      if (examById[examId].questions) return Promise.resolve(examById[examId]);
      if (examLoads[examId]) return examLoads[examId];

      examLoads[examId] = new Promise(function (resolve, reject) {
        var tag = document.createElement("script");
        tag.src = "exams/" + examId + ".js";
        tag.onload = function () { registerLoadedExams(); resolve(examById[examId]); };
        tag.onerror = function () { delete examLoads[examId]; reject(new Error("Could not load " + examId)); };
        document.head.appendChild(tag);
      });
      return examLoads[examId];
    }

    /* Load every exam referenced by stored progress, so a resumed session, a
     * saved question or a past attempt still resolves after a reload. */
    function loadReferencedExams(progress) {
      var ids = {};
      var note = function (id) { if (id && examById[id]) ids[id] = true; };
      if (progress.session) note(progress.session.examId);
      (progress.history || []).forEach(function (h) { note(h.examId); });
      (progress.saved || []).forEach(function (qid) { note(String(qid).split("-")[0]); });
      var pending = Object.keys(ids).filter(function (id) { return !examById[id].questions; });
      if (!pending.length) return Promise.resolve();
      return Promise.all(pending.map(function (id) {
        return loadExam(id).catch(function () { return null; });
      }));
    }

    var LS = {
      get: function (key, fallback) {
        try {
          var raw = localStorage.getItem(key);
          return raw === null ? fallback : JSON.parse(raw);
        } catch (e) {
          return fallback;
        }
      },
      set: function (key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
      },
      remove: function (key) {
        try { localStorage.removeItem(key); } catch (e) {}
      },
    };

    /* The signed-in server row is the source of truth; localStorage is only a
     * cache so the app still works offline and before the first fetch. */
    var CACHE_KEY = "ccarf.progress";
    var BACKUP_KEY = "ccarf.backup";
    var LEGACY_KEYS = ["ccarf.history", "ccarf.weak", "ccarf.correctEver", "ccarf.session"];

    function progressSize(state) {
      var s = normalizeProgress(state);
      return s.history.length + s.weak.length + s.correctEver.length + (s.session ? 1 : 0);
    }

    function readCache() {
      var cached = LS.get(CACHE_KEY, null);

      var legacy = normalizeProgress({
        history: LS.get("ccarf.history", []),
        weak: LS.get("ccarf.weak", []),
        correctEver: LS.get("ccarf.correctEver", []),
        session: LS.get("ccarf.session", null),
      });

      if (progressSize(legacy)) {
        /* Migrated work has never been written to the server. It must be
         * flagged as unsynced, or the next sync would treat the server copy
         * as authoritative and discard it. */
        LS.set("ccarf.unsynced", true);
        if (progressSize(LS.get(BACKUP_KEY, null)) < progressSize(legacy)) {
          LS.set(BACKUP_KEY, legacy);
        }
        LEGACY_KEYS.forEach(function (k) { LS.remove(k); });
        LS.remove("ccarf.syncUpdatedAt");
        var merged = cached ? mergeProgress(cached, legacy) : legacy;
        LS.set(CACHE_KEY, merged);
        return merged;
      }

      return cached ? normalizeProgress(cached) : emptyProgress();
    }

    var Store = createStore({
      initial: readCache(),
      save: function (state) { LS.set(CACHE_KEY, state); },
      emit: function () {
        try { window.dispatchEvent(new CustomEvent("ccarf:changed")); } catch (e) {}
      },
      readFlag: function () { return LS.get("ccarf.unsynced", false) === true; },
      writeFlag: function (dirty) { LS.set("ccarf.unsynced", dirty); },
    });

    window.CCARF_STORE = Store;

    var app = document.getElementById("app");
    var view = "home"; // home | quiz | results | review | custom
    var timerHandle = null;
    var session = null; // active session object
    var pendingEmail = null; // login code sent, awaiting verification
    var expandedMastery = 0; // domain whose subdomain breakdown is open (0 = none)
    var expandedPractice = 0; // domain whose practice subdomain list is open (0 = none)
    var customState = {
      domains: { 1: true, 2: true, 3: true, 4: true, 5: true },
      subs: {},        // "<domain>|<subKey>" -> true
      openDomain: 0,   // which domain's subdomain list is expanded
      count: "20",
      timed: false,
    };

    /* ------------------------------------------------------------- theme */
    var THEMES = ["auto", "light", "dark"];
    var THEME_ICONS = { auto: "◐", light: "☀", dark: "●" };
    var THEME_TITLES = { auto: "Theme: Auto (click for Light)", light: "Theme: Light (click for Dark)", dark: "Theme: Dark (click for Auto)" };

    function currentTheme() {
      var t = LS.get("ccarf.theme", "auto");
      return THEMES.indexOf(t) === -1 ? "auto" : t;
    }

    function applyTheme() {
      var t = currentTheme();
      if (t === "auto") document.documentElement.removeAttribute("data-theme");
      else document.documentElement.setAttribute("data-theme", t);
    }

    function cycleTheme() {
      LS.set("ccarf.theme", THEMES[(THEMES.indexOf(currentTheme()) + 1) % THEMES.length]);
      applyTheme();
    }

    function esc(s) {
      return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function stopTimer() {
      if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
    }

    /* ------------------------------------------------------------- home */
    function renderHome() {
      stopTimer();
      session = null;
      view = "home";
      var progress = Store.snapshot();
      var history = progress.history;
      var saved = isUsableSession(progress.session) ? progress.session : null;
      var now = Date.now();
      /* Objective figures come from the bank and the scenario bank only;
       * imported tests count toward the predicted score alone. */
      var lookup = function (id) {
        var q = byId[id];
        return q && (bankIds[id] || q.scenario) ? q : undefined;
      };
      var firstVisit = !history.length && !saved && !progress.saved.length && !progress.weak.length &&
        !progress.attempted.length && !Object.keys(progress.review || {}).length;

      var html = "";
      if (BANK.length !== EXPECTED_BANK_SIZE) {
        html += '<div class="card load-warning" role="alert">⚠ Only ' + BANK.length + " of " +
          EXPECTED_BANK_SIZE + " questions loaded — part of the bank failed to download. " +
          '<button class="btn small" data-action="hard-reload">Reload the bank</button></div>';
      }

      var S = window.CCARF_SYNC;
      var acctChip = "";
      if (S && S.enabled) {
        acctChip = S.user()
          ? '<span class="signed-chip" title="Progress syncs to this account"><span class="dot">●</span> ' + esc(S.user().email || "signed in") + "</span>"
          : '<button class="btn ghost small" data-action="open-section" data-id="h-acct">Sign in</button>';
      }
      html += '<div class="h-top"><div class="h-brand"><svg width="30" height="30" viewBox="0 0 128 128" aria-hidden="true">' +
        '<rect width="128" height="128" rx="28" fill="var(--pen)"/>' +
        '<circle cx="64" cy="64" r="34" fill="none" stroke="var(--paper)" stroke-width="7"/>' +
        '<circle cx="64" cy="64" r="19" fill="var(--paper)"/></svg>CCAR-F Prep</div>' +
        '<span class="controls">' + acctChip +
        '<button class="btn icon" data-action="cycle-theme" title="' + THEME_TITLES[currentTheme()] + '" aria-label="Switch theme">' +
        THEME_ICONS[currentTheme()] + "</button></span></div>";

      html += firstVisit ? homeFirstVisit(progress) : homeReadiness(progress, now);
      if (saved) html += resumeCard(saved);
      if (!firstVisit) {
        html += homeNextStep(progress, lookup);
        html += '<div class="h-cols">' + homeObjectives(progress, lookup) + homePractice(progress, now, lookup) + "</div>";
      }
      html += homeCollapsed(progress);
      html += '<footer class="site-footer">Practice material for personal study. ' +
        "Not affiliated with Anthropic or Pearson VUE.</footer>";
      app.innerHTML = html;
    }

    function examDateLine(progress, now) {
      if (!progress.examDate) return "";
      var at = new Date(progress.examDate + "T00:00:00").getTime();
      var days = Math.ceil((at - now) / DAY_MS);
      if (!(days >= 0)) return "";
      return "Exam on <b>" + esc(new Date(at).toLocaleDateString(undefined, { day: "numeric", month: "short" })) +
        "</b> · <b>" + days + " day" + (days === 1 ? "" : "s") + " left</b>";
    }

    /* The full exam needs every scenario to fill a block of 15. */
    function scenarioExamReady() {
      return SCENARIOS.length > 0 && eligibleScenarios(SCENARIOS, SCENARIO_BANK).length === SCENARIOS.length;
    }
    function scenarioExamGate() { return scenarioExamReady() ? "" : " disabled"; }
    function scenarioExamNote() {
      return scenarioExamReady() ? "" : '<p class="muted">The scenario exam is available once every scenario has ' + SCENARIO_BLOCK + " questions.</p>";
    }

    function otherExamsMenu() {
      return '<details class="h-menu"><summary class="btn">Other exams ▾</summary><div class="h-menu-list">' +
        '<button class="btn ghost" data-action="start-exam" data-scope="mapped">Mock exam · exam-guide mapped, by domain weight</button>' +
        '<button class="btn ghost" data-action="start-exam" data-scope="unmapped">Supplementary mock exam</button>' +
        (EXAMS.length ? '<button class="btn ghost" data-action="open-section" data-id="h-imported">Imported practice tests ↓</button>' : "") +
        "</div></details>";
    }

    function sparkline(attempts) {
      var pts = attempts.slice(-6);
      if (pts.length < 2) return "";
      /* Scale to the scores shown (and the pass line) so changes are visible. */
      var vals = pts.map(function (a) { return a.score; }).concat([PASS_SCORE]);
      var lo = Math.max(0, Math.floor((Math.min.apply(null, vals) - 40) / 50) * 50);
      var hi = Math.min(1000, Math.ceil((Math.max.apply(null, vals) + 40) / 50) * 50);
      var w = 300, h = 90, y = function (v) { return Math.round(h - 8 - ((v - lo) / (hi - lo)) * (h - 18)); };
      var step = (w - 20) / (pts.length - 1);
      var coords = pts.map(function (a, i) { return Math.round(10 + i * step) + "," + y(a.score); });
      return '<svg class="h-spark" viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="Last ' + pts.length + ' exam scores">' +
        '<line x1="0" x2="' + w + '" y1="' + y(PASS_SCORE) + '" y2="' + y(PASS_SCORE) + '" stroke="var(--pass)" stroke-dasharray="4 4" stroke-width="1.5"/>' +
        '<text x="4" y="' + (y(PASS_SCORE) - 5) + '" font-size="10" fill="var(--pass)">pass ' + PASS_SCORE + "</text>" +
        '<polyline fill="none" stroke="var(--pen)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" points="' + coords.join(" ") + '"/>' +
        coords.map(function (c) { var p = c.split(","); return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4" fill="var(--pen)"/>'; }).join("") +
        '</svg><div class="h-spark-cap"><span>Last ' + pts.length + " exams</span><span>" + pts[pts.length - 1].score + "</span></div>";
    }

    function homeReadiness(progress, now) {
      var attempts = examAttempts(progress.history);
      var pred = predictedScore(progress.history);
      var due = dueReviewIds(progress.review, now).filter(function (id) { return byId[id]; }).length;
      var verdicts = { pass: ["Likely pass", "pass"], borderline: ["Borderline", "border"], "not-yet": ["Not yet", "fail"] };
      var html = '<section class="card h-ready"><div>';
      html += '<h1 class="h-eyebrow">Your readiness</h1>';
      if (pred) {
        var v = verdicts[pred.verdict];
        html += '<div class="h-big">' + pred.score + '<small> / 1000 predicted</small></div>' +
          '<span class="h-verdict ' + v[1] + '">' + v[0] + " · " + PASS_SCORE + " needed</span>";
      }
      var date = examDateLine(progress, now);
      html += '<p class="h-meta">' + (date ? date + " · " : "") +
        "<b>" + due + " due</b> for review today · " +
        '<button class="h-link" data-action="edit-exam-date">' + (progress.examDate ? "change exam date" : "set exam date") + "</button>" +
        (pred ? "<br>Based on your last " + pred.count + " exam" + (pred.count === 1 ? "" : "s") + ", newest weighted most." : "") + "</p>";
      html += '<div class="h-cta"><button class="btn primary h-cta-main" data-action="start-scenario-exam"' + scenarioExamGate() + ">Start scenario exam</button>" +
        otherExamsMenu() + '<span class="muted">4 scenarios × 15 · 120 min</span></div>' + scenarioExamNote();
      html += "</div><div>" + sparkline(attempts);
      var last = null;
      progress.history.forEach(function (h) { if (Array.isArray(h.items) && typeof h.score === "number") last = h; });
      if (last) {
        html += '<button class="h-row" data-action="review-attempt" data-date="' + esc(last.date) + '"><span>Last attempt · ' +
          esc(last.examName || "Mock exam") + " · " + esc(new Date(last.date).toLocaleDateString(undefined, { day: "numeric", month: "short" })) +
          '</span><span class="muted">' + last.score + " · Review →</span></button>";
      }
      return html + "</div></section>";
    }

    function homeFirstVisit(progress) {
      var html = '<section class="card h-ready h-first"><div>' +
        '<h1 class="h-eyebrow">Welcome — find your starting point</h1>' +
        '<div class="h-big h-big-sm">20-question diagnostic</div>' +
        '<p class="h-meta">A short scenario exam (2 scenarios × 10, 40 min) in the real exam\'s layout gives you a predicted score and your weakest objectives straight away.</p>' +
        '<div class="h-cta"><button class="btn primary h-cta-main" data-action="start-diagnostic"' +
        (eligibleScenarios(SCENARIOS, SCENARIO_BANK, 10).length >= 2 ? "" : " disabled") + ">Start diagnostic</button>" +
        '<button class="btn" data-action="start-scenario-exam"' + scenarioExamGate() + ">Skip — full scenario exam</button>" + otherExamsMenu() + "</div>" +
        scenarioExamNote() +
        '<div class="h-steps"><div class="h-step"><b>1 · Diagnose</b>20 questions in the real exam\'s layout.</div>' +
        '<div class="h-step"><b>2 · Set your date</b>Get a countdown and a review queue.</div>' +
        '<div class="h-step"><b>3 · Drill</b>Short drills on your weakest objectives.</div></div></div>' +
        '<div><div class="h-step h-date"><b>Exam date</b>' +
        (progress.examDate ? esc(progress.examDate) + "<br>" : "Optional — sets your countdown<br>") +
        '<button class="btn small" data-action="edit-exam-date">' + (progress.examDate ? "Change" : "Set date") + "</button></div></div></section>";
      html += '<section class="card h-col"><h2 class="h-h2">What\'s inside</h2><p class="h-sub">' +
        SCENARIO_BANK.length + " scenario questions across the six official scenarios · " + BANK.length +
        " domain questions" + (EXAMS.length ? " · " + EXAMS.length + " practice tests" : "") + "</p>" +
        scenarioRows({}) + "</section>";
      return html;
    }

    function resumeCard(saved) {
      var savedDone = answeredCount(saved) >= saved.questions.length;
      return '<div class="card resume-card"><div><strong>' +
        (saved.scope === "unmapped"
          ? "Supplementary mock"
          : saved.diagnostic ? "Diagnostic"
          : Object.prototype.hasOwnProperty.call(MODE_NAMES, saved.mode) ? MODE_NAMES[saved.mode] : "Session") +
        (saved.examName ? " — " + esc(saved.examName) : "") +
        (savedDone ? " ready to grade" : " in progress") + "</strong>" +
        "<p>" + answeredCount(saved) + "/" + saved.questions.length + " answered" +
        (savedDone ? " — finish to see your score" : "") + "</p></div>" +
        '<div class="row">' +
        (savedDone
          ? '<button class="btn primary" data-action="finish-saved">Finish &amp; see results</button>' +
            '<button class="btn" data-action="resume">Review answers</button>'
          : '<button class="btn primary" data-action="resume">Resume</button>') +
        '<button class="btn ghost" data-action="discard">Discard</button></div></div>';
    }

    function meter(pct) {
      if (pct === null) return '<div class="h-meter"></div>';
      var c = pct >= 72 ? "var(--pass)" : pct >= 50 ? "var(--flag)" : "var(--fail)";
      return '<div class="h-meter"><i style="width:' + pct + "%;background:" + c + '"></i></div>';
    }

    function homeNextStep(progress, lookup) {
      var weak = weakestObjectives(objectiveAccuracy(progress.history, lookup));
      if (!weak.length) return "";
      var html = '<section class="card h-next"><h2 class="h-h2">Next best step</h2>' +
        '<p class="h-sub">Your weakest objectives across your exams — each drill is up to 8 questions with a note on every option.</p>';
      weak.forEach(function (w) {
        html += '<div class="h-weak"><div>' + esc(w.key) + "<small>" + w.correct + " of " + w.total + " right</small></div>" +
          meter(w.pct) + '<span class="h-pct">' + w.pct + "%</span>" +
          '<button class="btn small" data-action="drill-objective" data-sub="' + esc(w.key) + '">Drill →</button></div>';
      });
      return html + "</section>";
    }

    function homeObjectives(progress, lookup) {
      var acc = objectiveAccuracy(progress.history, lookup);
      var mastery = masteryByDomain(BANK, progress.correctEver, progress.attempted);
      var seenAll = 0, rightAll = 0, totalAll = 0;
      for (var sd = 1; sd <= 5; sd++) {
        var row = mastery[sd] || { correct: 0, attempted: 0, total: 0 };
        seenAll += row.attempted; rightAll += row.correct; totalAll += row.total;
      }
      var pc = function (a, b) { return b ? Math.round((a / b) * 100) : 0; };
      var html = '<section class="card h-col"><h2 class="h-h2">By objective</h2>' +
        '<p class="h-sub">Bar = accuracy in your exams. Open a domain for its task statements.</p>' +
        '<p class="h-bank">Question bank: Coverage ' + pc(seenAll, totalAll) + "% (" + seenAll + " of " + totalAll + " seen) · " +
        "Accuracy " + pc(rightAll, seenAll) + "% (" + rightAll + " of " + seenAll + " right) · " +
        "Mastery " + pc(rightAll, totalAll) + "%</p>";
      for (var d = 1; d <= 5; d++) {
        var c = 0, t = 0;
        SUBDOMAINS.forEach(function (sub) { if (sub.indexOf(d + ".") === 0 && acc[sub]) { c += acc[sub].correct; t += acc[sub].total; } });
        var pct = t ? Math.round((100 * c) / t) : null;
        var m = mastery[d] || { attempted: 0, total: 0, correct: 0 };
        var open = expandedMastery === d;
        html += '<div class="h-dom"><button class="h-dom-head" data-action="toggle-mastery" data-domain="' + d + '" aria-expanded="' + open + '">' +
          '<span class="domain-chip chip-d' + d + '">D' + d + "</span><span>" + esc(DOMAIN_NAMES[d]) +
          '<small class="muted h-bank-seen">bank ' + m.attempted + "/" + m.total + " seen</small></span>" +
          meter(pct) + '<span class="h-pct">' + (pct === null ? "—" : pct + "%") + "</span>" + chev(open) + "</button>";
        if (open) {
          html += '<div class="h-objs"><button class="h-row" data-action="practice" data-domain="' + d + '"><span>Practice all of D' + d +
            ' (question bank)</span><span class="muted">' + m.correct + "/" + m.total + " right →</span></button>";
          SUBDOMAINS.forEach(function (sub) {
            if (sub.indexOf(d + ".") !== 0) return;
            var a = acc[sub];
            var p = a ? Math.round((100 * a.correct) / a.total) : null;
            var code = sub.split(" ")[0];
            html += '<div class="h-obj"><span>' + esc(sub) + "</span>" + meter(p) +
              '<span class="h-pct">' + (p === null ? "—" : p + "%") + "</span>" +
              '<span class="h-obj-act"><button class="btn small" data-action="drill-objective" data-sub="' + esc(sub) + '" title="Scenario questions with notes">Drill</button>' +
              '<button class="btn small ghost" data-action="practice" data-domain="' + d + '" data-sub="' + esc(code) + '" title="Question-bank practice">Bank</button></span></div>';
          });
          if (BANK.some(function (q) { return q.domain === d && !q.subdomain; })) {
            html += '<button class="h-row" data-action="practice" data-domain="' + d + '" data-sub="general"><span>Untagged D' + d +
              ' questions (question bank)</span><span class="muted">→</span></button>';
          }
          html += "</div>";
        }
        html += "</div>";
      }
      return html + "</section>";
    }

    function scenarioRows(best) {
      return SCENARIOS.map(function (sc) {
        var n = SCENARIO_BANK.filter(function (q) { return q.scenario === sc.id; }).length;
        return '<button class="h-row" data-action="practice-scenario" data-scenario="' + sc.id + '"' + (n ? "" : " disabled") + ">" +
          "<span>" + esc(sc.name) + '</span><span class="muted">' +
          (best[sc.id] !== undefined ? "best " + best[sc.id] + "%" : n + " questions") + "</span></button>";
      }).join("");
    }

    function homePractice(progress, now, lookup) {
      var due = dueReviewIds(progress.review, now).filter(function (id) { return byId[id]; }).length;
      var savedIds = progress.saved.filter(function (id) { return byId[id]; });
      var html = '<section class="card h-col"><h2 class="h-h2">Practice</h2><p class="h-sub">Untimed, with feedback after each answer.</p>' +
        '<button class="h-row' + (due ? " h-due" : "") + '" data-action="start-review"' + (due ? "" : " disabled") + ">" +
        '<span>⟳ Due for review</span><span class="muted">' + (due ? due + " today" : "none due") + "</span></button>" +
        '<button class="h-row" data-action="start-saved"' + (savedIds.length ? "" : " disabled") + ">" +
        '<span>☆ Saved questions</span><span class="muted">' + savedIds.length + "</span></button>";
      if (progress.weak.length) {
        html += '<button class="h-row" data-action="start-weak"><span>Drill missed questions</span><span class="muted">' +
          progress.weak.length + "</span></button>";
      }
      html += '<button class="h-row" data-action="custom-builder"><span>Custom quiz</span><span class="muted">build →</span></button>' +
        '<h2 class="h-h2 h-gap">By scenario</h2>' + scenarioRows(bestScenarioScores(progress.history, lookup));
      return html + "</section>";
    }

    function homeCollapsed(progress) {
      var history = progress.history;
      var best = 0;
      history.forEach(function (h) { if (h.score > best) best = h.score; });
      var html = '<details class="card h-fold"><summary><b>Score history</b><span class="muted">' +
        (history.length ? history.length + " attempt" + (history.length === 1 ? "" : "s") + " · best " + best : "no exams yet") + "</span></summary>";
      if (!history.length) {
        html += '<p class="muted">No exams taken yet. Your attempts will appear here.</p>';
      } else {
        html += '<div class="table-scroll"><table class="history"><thead><tr><th>Date</th><th>Score</th><th>Result</th><th>Correct</th>' +
          "<th>D1</th><th>D2</th><th>D3</th><th>D4</th><th>D5</th><th></th></tr></thead><tbody>";
        history.slice().reverse().forEach(function (h) {
          var cells = "";
          for (var d2 = 1; d2 <= 5; d2++) {
            var pd = h.perDomain && h.perDomain[d2];
            cells += "<td>" + (pd ? pd.correct + "/" + pd.total : "–") + "</td>";
          }
          html += "<tr><td>" + esc(new Date(h.date).toLocaleString()) +
            (h.examName ? '<br><span class="muted">' + esc(h.examName) + "</span>" : "") + "</td>" +
            "<td><strong>" + h.score + "</strong></td>" +
            '<td><span class="badge ' + (h.pass ? "pass" : "fail") + '">' + (h.pass ? "PASS" : "FAIL") + "</span></td>" +
            "<td>" + h.correct + "/" + h.total + "</td>" + cells +
            "<td>" + (Array.isArray(h.items)
              ? '<button class="btn ghost small" data-action="review-attempt" data-date="' + esc(h.date) + '">Review</button>'
              : "") + "</td></tr>";
        });
        html += "</tbody></table></div>" +
          '<button class="btn ghost small" data-action="clear-history">Clear history</button>';
      }
      html += "</details>";

      if (EXAMS.length) {
        var taken = EXAMS.filter(function (e) { return bestAttemptFor(e.id, history); }).length;
        html += '<details class="card h-fold" id="h-imported"><summary><b>Imported mock exams</b><span class="muted">' +
          EXAMS.length + " tests · " + taken + " taken</span></summary>" +
          '<p class="muted">Full exams from your own files, scored separately. They do not feed the question bank, mastery or the weak drill.</p>' +
          '<div class="domain-list">';
        EXAMS.forEach(function (e) {
          var attempt = bestAttemptFor(e.id, history);
          html += '<div class="domain-row exam-row"><span>' + esc(e.name) + "</span>" +
            '<span class="muted">' + (e.count || (e.questions ? e.questions.length : 0)) + " questions" +
            (attempt ? " · best " + attempt.score + (attempt.pass ? " · passed" : "") : "") + "</span>" +
            '<button class="btn small" data-action="practice-imported" data-exam="' + esc(e.id) + '">Practice</button>' +
            '<button class="btn small primary" data-action="start-imported" data-exam="' + esc(e.id) + '">' +
            (attempt ? "Retake mock" : "Take mock") + "</button></div>";
        });
        html += "</div></details>";
      }

      var S = window.CCARF_SYNC;
      var signedIn = S && S.enabled && S.user();
      html += '<details class="card h-fold" id="h-acct"><summary><b>Account &amp; sync</b><span class="muted">' +
        (signedIn ? "Signed in · syncing" : "Progress on this device") + "</span></summary>" + accountCard() + "</details>";
      return html;
    }

    function answeredCount(sess) {
      var answers = (sess && sess.answers) || {};
      return Object.keys(answers).filter(function (k) {
        var a = answers[k];
        return a !== null && a !== undefined && !(Array.isArray(a) && !a.length);
      }).length;
    }

    /* A stored session is only offered for resume if it still lines up with
     * the loaded bank — otherwise the question screen would crash on it. */
    function isUsableSession(sess) {
      return !!(sess && Array.isArray(sess.questions) &&
        sess.questions.some(function (s) { return s && byId[s.id]; }));
    }

    function timeAgo(ms) {
      var secs = Math.max(0, Math.round((Date.now() - ms) / 1000));
      if (secs < 60) return "just now";
      var mins = Math.round(secs / 60);
      if (mins < 60) return mins + " minute" + (mins === 1 ? "" : "s") + " ago";
      var hours = Math.round(mins / 60);
      if (hours < 24) return hours + " hour" + (hours === 1 ? "" : "s") + " ago";
      return new Date(ms).toLocaleString();
    }

    /* Imported exam questions carry no domain tag, so label them by their
     * exam instead of rendering an empty domain chip. */
    function questionMeta(q) {
      var bits = "";
      if (DOMAIN_NAMES[q.domain]) {
        bits += '<span class="domain-chip chip-d' + esc(q.domain) + '">D' + esc(q.domain) + "</span>" +
          '<span class="muted">' + esc(DOMAIN_NAMES[q.domain]) + "</span>";
      } else if (q.exam && examById[q.exam]) {
        bits += '<span class="muted">' + esc(examById[q.exam].name) + "</span>";
      }
      if (q.subdomain) bits += '<span class="muted sub-tag">§ ' + esc(q.subdomain) + "</span>";
      if (q.scenario) bits += '<span class="scenario-tag">' + esc(q.scenario) + "</span>";
      return bits;
    }

    function chev(open) {
      return '<span class="chev' + (open ? " open" : "") + '">' +
        '<svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">' +
        '<path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
        "</svg></span>";
    }

    function metricTile(label, pct, detail) {
      return '<div class="metric"><div class="metric-value">' + pct + '<span class="metric-pct">%</span></div>' +
        '<div class="metric-label">' + esc(label) + "</div>" +
        '<div class="metric-detail">' + esc(detail) + "</div></div>";
    }

    function bestAttemptFor(examId, history) {
      var best = null;
      (history || []).forEach(function (h) {
        if (h.examId === examId && (!best || h.score > best.score)) best = h;
      });
      return best;
    }

    function accountCard() {
      var S = window.CCARF_SYNC;
      var html = '<div class="card" id="acct"><h2>Account &amp; sync</h2>';
      if (!S || !S.enabled) {
        html += '<p class="muted auth-note">Progress is stored in this browser. To sign in and sync across devices, ' +
          "enable sync in <code>config.js</code> (see the README).</p>";
      } else if (S.unavailable) {
        html += '<p class="muted auth-note">' + esc(S.error()) + "</p>";
      } else if (S.user()) {
        var st = S.status();
        var waiting = S.pendingCount ? S.pendingCount() : 0;
        var stLabel = st === "syncing" ? "syncing…"
          : st === "offline" ? "offline — changes will sync when you reconnect"
          : st === "error" ? "sync failed"
          : waiting ? waiting + " change" + (waiting === 1 ? "" : "s") + " waiting to sync"
          : st === "synced" ? "progress synced" : "sync ready";
        html += "<p>Signed in as <strong>" + esc(S.user().email || "account") + "</strong> " +
          '<span class="muted">· ' + stLabel + "</span></p>";
        if (st === "error" && S.error && S.error()) {
          html += '<p class="muted auth-note">' + esc(S.error()) + "</p>";
        }
        var syncedAt = S.syncedAt ? S.syncedAt() : 0;
        if (syncedAt) {
          html += '<p class="muted auth-note">Last synced ' + esc(timeAgo(syncedAt)) +
            ". Your progress is kept on the server, so any signed-in device shows the latest.</p>";
        }
        html += '<div class="row"><button class="btn small" data-action="sync-now"' +
          (st === "syncing" ? " disabled" : "") + ">" + (st === "syncing" ? "Syncing…" : "Sync now") + "</button>" +
          '<button class="btn ghost small" data-action="auth-signout">Sign out</button></div>';
      } else {
        html += '<p class="muted auth-note">Sign in with your e-mail to back up progress and resume from any device.</p>' +
          '<div class="row"><input class="input" id="auth-email" type="email" autocomplete="email" placeholder="you@example.com" value="' + esc(pendingEmail || "") + '">' +
          '<button class="btn primary" data-action="auth-send">' + (pendingEmail ? "Resend code" : "Send login code") + "</button></div>";
        if (pendingEmail) {
          html += '<div class="row" style="margin-top:10px"><input class="input" id="auth-code" inputmode="numeric" autocomplete="one-time-code" placeholder="6-digit code">' +
            '<button class="btn" data-action="auth-verify">Verify &amp; sign in</button></div>' +
            '<p class="muted auth-note">Check your inbox — enter the code here, or just click the link in the e-mail.</p>';
        }
      }
      var backup = LS.get(BACKUP_KEY, null);
      var extra = progressSize(backup) - progressSize(Store.snapshot());
      if (extra > 0) {
        html += '<p class="muted auth-note">This device has a backup copy with ' + extra +
          " more item" + (extra === 1 ? "" : "s") + " than your current progress.</p>" +
          '<div class="row"><button class="btn" data-action="restore-backup">Restore backup</button></div>';
      }

      return html + "</div>";
    }

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
        current: 0,
        startedAt: now,
        deadline: durationMs ? now + durationMs : null,
        feedback: null, // practice mode: answered question awaiting "next"
        tally: { correct: 0, wrong: 0 }, // practice running tally
      };
    }

    function persistSession() {
      if (session) Store.mutate(Mutations.setSession(session));
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

    function startExam(scope) {
      if (!okToReplaceSaved()) return;
      var unmapped = scope === "unmapped";
      var questions;
      try {
        questions = drawExam(unmapped ? UNMAPPED : MAPPED, EXAM_DRAW_COUNTS);
      } catch (e) {
        alert("Question bank problem: " + e.message);
        return;
      }
      session = newSession("exam", questions, EXAM_DURATION_MS);
      session.scope = unmapped ? "unmapped" : "mapped";
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
      var due = dueReviewIds(Store.snapshot().review, Date.now()).filter(function (id) { return byId[id]; });
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
      if (ids.length) return startScenarioPractice(null, ids, "Drill — " + sub);
      var code = sub.split(" ")[0];
      return startPractice(Number(code.split(".")[0]), code);
    }

    function isScenarioMode(mode) {
      return mode === "scenario" || mode === "scenario-practice";
    }

    /* Crossing an option out is only a visual aid: the answer stays. */
    function toggleStrike(optIdx) {
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
          '<button class="btn ghost small" data-action="cq-open-subs" data-domain="' + d + '"' +
          (on ? "" : " disabled") + ">" + (subsOpen ? "Hide" : "Subdomains") + "</button></label>";

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
      app.innerHTML = html;
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
      var saved = Store.snapshot().saved
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
      var weak = Store.snapshot().weak.map(function (id) { return byId[id]; }).filter(Boolean);
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
      }, 1000);
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

    /* The real exam's layout: the scenario stays put on the left while its
     * questions change on the right. */
    function renderScenarioQuestion() {
      view = "quiz";
      var sq = session.questions[session.current];
      var q = byId[sq.id];
      var total = session.questions.length;
      var isPractice = session.mode === "scenario-practice";
      var block = scenarioBlockOf(session, session.current);
      var scn = scenarioById[q.scenario] || { name: "Scenario", text: "" };
      var chosen = chosenIndices(session.answers[q.id]);
      var correct = correctIndices(q);
      var struck = session.strikes[q.id] || [];
      var showFeedback = isPractice && session.feedback === q.id;
      var comment = session.comments[q.id];

      var where = isPractice
        ? "Question " + (session.current + 1) + " of " + total
        : "Scenario " + (block + 1) + " of " + session.scenarioIds.length +
          " · Question " + (session.current + 1) + " of " + total;

      var html = '<div class="scn-screen">';
      html += '<div class="scn-top">' +
        '<div><strong>' + esc(sessionTitle()) + '</strong><span class="muted"> · ' + where + "</span></div>" +
        '<div class="row">' +
        (session.deadline ? '<span id="timer" class="timer">' + fmtTime(session.deadline - Date.now()) + "</span>" : "") +
        (isPractice
          ? '<span class="tally"><span class="pill ok">✓ ' + session.tally.correct + '</span><span class="pill bad">✗ ' + session.tally.wrong + "</span></span>"
          : '<button class="btn ghost small" data-action="comment">' + (comment ? "💬 Edit comment" : "💬 Comment") + "</button>") +
        '<button class="btn ghost small' + (session.flagged[q.id] ? " flag-on" : "") + '" data-action="toggle-flag">' +
        (session.flagged[q.id] ? "⚑ Flagged" : "⚑ Flag for review") + "</button>" +
        '<button class="btn exit small" data-action="quit">Exit ↩</button>' +
        "</div></div>";

      html += '<div class="scn-body">' +
        '<aside class="scn-panel"><details open><summary>' + esc(scn.name) + "</summary>" +
        '<div class="scn-text">' + esc(scn.text) + "</div></details></aside>";

      html += '<section class="scn-question">' +
        '<p class="q-text">' + esc(q.question) + "</p>" +
        '<div class="options" role="radiogroup">';
      sq.order.forEach(function (optIdx) {
        var cls = "option";
        var picked = chosen.indexOf(optIdx) !== -1;
        if (picked) cls += " selected";
        if (struck.indexOf(optIdx) !== -1) cls += " struck";
        if (showFeedback) {
          if (correct.indexOf(optIdx) !== -1) cls += " correct";
          else if (picked) cls += " wrong";
        }
        html += '<div class="opt-wrap"><div class="opt-row"><button class="' + cls + '" role="radio" aria-checked="' + picked +
          '" data-action="select" data-opt="' + optIdx + '"' + (showFeedback ? " disabled" : "") + ">" +
          '<span class="opt-letter"></span>' + esc(q.options[optIdx]) + "</button>" +
          /* Touch screens have no right-click, so they get a small button. */
          '<button class="strike-btn" data-action="strike" data-opt="' + optIdx + '" aria-label="' +
          (struck.indexOf(optIdx) !== -1 ? "Remove strike-through" : "Strike through") + '">⊘</button></div>';
        if (showFeedback && q.optionNotes) {
          html += '<div class="opt-note ' + (correct.indexOf(optIdx) !== -1 ? "ok" : "bad") + '">' +
            esc(q.optionNotes[optIdx]) + "</div>";
        }
        html += "</div>";
      });
      html += "</div>";
      if (showFeedback) {
        var right = sameChoice(session.answers[q.id], correct);
        html += '<div class="feedback ' + (right ? "ok" : "bad") + '" role="status"><strong>' +
          (right ? "Correct." : "Incorrect.") + "</strong> " + esc(q.explanation) + "</div>";
      }
      if (comment) html += '<p class="scn-comment muted">💬 ' + esc(comment) + "</p>";
      html += '<p class="muted scn-hint">Right-click an option to strike it through.</p>';
      html += "</section></div>";

      html += '<div class="scn-bottom">' +
        (isPractice ? "<span></span>" :
          '<button class="btn" data-action="prev"' + (session.current === 0 ? " disabled" : "") + ">← Previous</button>");
      if (isPractice) {
        html += showFeedback
          ? (session.current + 1 < total
            ? '<button class="btn primary" data-action="next">Next →</button>'
            : '<button class="btn primary" data-action="submit">Finish</button>')
          : '<span class="muted">Pick an answer to see the notes</span>';
      } else {
        var flaggedCount = Object.keys(session.flagged).filter(function (k) { return session.flagged[k]; }).length;
        html += '<span class="muted">Answered ' + answeredCount(session) + " of " + total +
          " · Flagged " + flaggedCount + "</span>" +
          '<div class="row"><button class="btn" data-action="review-all">Review all</button>' +
          '<button class="btn primary" data-action="next">' +
          (session.current + 1 >= total ? "Review &amp; submit →" : "Next →") + "</button></div>";
      }
      html += "</div>";
      /* The menu is position:fixed, so it lives outside .scn-screen: a
       * transformed ancestor would offset it from the cursor. */
      html += '</div><div id="ctx-menu" class="ctx-menu" hidden></div>';

      app.innerHTML = html;
      window.scrollTo(0, 0);
    }

    var reviewFilter = "all";

    /* Before submitting: every question as a tile, grouped by scenario, so
     * flagged and unanswered ones are easy to revisit. The clock keeps going. */
    function renderScenarioReview() {
      view = "scenario-review";
      var total = session.questions.length;
      var unanswered = session.questions.filter(function (s) { return session.answers[s.id] === null; }).length;
      var flagged = session.questions.filter(function (s) { return session.flagged[s.id]; }).length;
      var html = '<div class="scn-screen"><div class="scn-top"><div><strong>Review your answers</strong>' +
        '<span class="muted"> · ' + (total - unanswered) + " of " + total + " answered</span></div>" +
        '<div class="row">' +
        (session.deadline ? '<span id="timer" class="timer">' + fmtTime(session.deadline - Date.now()) + "</span>" : "") +
        '<button class="btn exit small" data-action="quit">Exit ↩</button></div></div>';
      html += '<div class="scn-review">';
      html += '<div class="row review-filters">' +
        [["all", "All (" + total + ")"], ["flagged", "⚑ Flagged (" + flagged + ")"], ["unanswered", "Unanswered (" + unanswered + ")"]]
          .map(function (f) {
            return '<button class="btn small' + (reviewFilter === f[0] ? " primary" : "") +
              '" data-action="review-filter" data-filter="' + f[0] + '">' + f[1] + "</button>";
          }).join("") + "</div>";
      session.scenarioIds.forEach(function (sid, b) {
        var tiles = "";
        session.questions.forEach(function (s, i) {
          if ((byId[s.id] || {}).scenario !== sid) return;
          var isAnswered = session.answers[s.id] !== null;
          if (reviewFilter === "flagged" && !session.flagged[s.id]) return;
          if (reviewFilter === "unanswered" && isAnswered) return;
          var cls = "tile " + (isAnswered ? "answered" : "unanswered") +
            (session.flagged[s.id] ? " flagged" : "") + (session.comments[s.id] ? " commented" : "");
          tiles += '<button class="' + cls + '" data-action="jump" data-index="' + i + '" aria-label="Question ' + (i + 1) +
            (isAnswered ? ", answered" : ", not answered") + (session.flagged[s.id] ? ", flagged" : "") + '">' +
            (i + 1) + (session.flagged[s.id] ? " ⚑" : "") + (session.comments[s.id] ? " 💬" : "") + "</button>";
        });
        html += '<h3 class="review-scn">Scenario ' + (b + 1) + ": " + esc((scenarioById[sid] || {}).name || sid) + "</h3>" +
          '<div class="tiles">' + (tiles || '<span class="muted">Nothing here.</span>') + "</div>";
      });
      html += '<div class="scn-bottom"><button class="btn" data-action="jump" data-index="' + session.current +
        '">← Back to question ' + (session.current + 1) + "</button>" +
        '<button class="btn primary" data-action="submit">Submit exam</button></div>';
      html += "</div></div>";
      app.innerHTML = html;
      window.scrollTo(0, 0);
    }

    function renderQuestion() {
      if (isScenarioMode(session.mode)) return renderScenarioQuestion();
      view = "quiz";
      var sq = session.questions[session.current];
      var q = byId[sq.id];
      var total = session.questions.length;
      var answered = session.answers[q.id];
      var correct = correctIndices(q);
      var multi = correct.length > 1;
      var chosen = chosenIndices(answered);
      var isPractice = session.mode === "practice";
      var showFeedback = isPractice && session.feedback === q.id;

      var html = '<div class="quiz-header">' +
        "<div><strong>" + sessionTitle() + "</strong>" +
        '<span class="muted"> · Question ' + (session.current + 1) + " of " + total + "</span></div>" +
        '<div class="row">' +
        (session.deadline ? '<span id="timer" class="timer">' + fmtTime(session.deadline - Date.now()) + "</span>" : "") +
        (isPractice
          ? '<span class="tally"><span class="pill ok">✓ ' + session.tally.correct + '</span><span class="pill bad">✗ ' + session.tally.wrong + "</span></span>"
          : '<button class="btn ghost small" data-action="toggle-flag">' + (session.flagged[q.id] ? "🚩 Flagged" : "Flag for review") + "</button>") +
        '<button class="btn ghost small" data-action="toggle-saved" title="Keep this question to study later">' +
        (Store.snapshot().saved.indexOf(q.id) !== -1 ? "★ Saved" : "☆ Save") + "</button>" +
        '<button class="btn exit small" data-action="quit">Exit ↩</button>' +
        "</div></div>";

      var answeredSoFar = answeredCount(session);
      html += '<div class="progress"><div class="progress-fill" style="width:' +
        Math.round((answeredSoFar / total) * 100) + '%"></div></div>';

      if (!isPractice) {
        html += '<div class="navigator">';
        session.questions.forEach(function (s, i) {
          var cls = "nav-cell";
          if (session.answers[s.id] !== null) cls += " answered";
          if (session.flagged[s.id]) cls += " flagged";
          if (i === session.current) cls += " current";
          var navState = (session.answers[s.id] !== null ? "answered" : "not answered") +
            (session.flagged[s.id] ? ", flagged" : "");
          html += '<button class="' + cls + '" data-action="jump" data-index="' + i +
            '" aria-label="Question ' + (i + 1) + ", " + navState + '">' + (i + 1) + "</button>";
        });
        html += "</div>";
      }

      if (!isPractice && answeredSoFar >= total) {
        html += '<div class="card all-answered" role="status">All ' + total +
          " answered — finish to grade this " +
          (session.mode === "exam" ? "exam" : "round") + ".</div>";
      }

      html += '<div class="card question-card">' +
        '<div class="q-meta">' + questionMeta(q) + "</div>" +
        '<p class="q-text">' + esc(q.question) + "</p>" +
        (multi ? '<p class="pick-hint">Select ' + correct.length + " answers.</p>" : "") +
        '<div class="options" role="' + (multi ? "group" : "radiogroup") + '">';

      sq.order.forEach(function (optIdx) {
        var cls = "option";
        var disabled = showFeedback ? " disabled" : "";
        var picked = chosen.indexOf(optIdx) !== -1;
        if (picked) cls += " selected";
        if (showFeedback) {
          if (correct.indexOf(optIdx) !== -1) cls += " correct";
          else if (picked) cls += " wrong";
        }
        html += '<button class="' + cls + '" role="' + (multi ? "checkbox" : "radio") +
          '" aria-checked="' + picked +
          '" data-action="select" data-opt="' + optIdx + '"' + disabled + ">" +
          '<span class="opt-letter"></span>' + esc(q.options[optIdx]) + "</button>";
      });
      html += "</div>";

      if (showFeedback) {
        var right = sameChoice(answered, correct);
        html += '<div class="feedback ' + (right ? "ok" : "bad") + '" role="status">' +
          "<strong>" + (right ? "Correct." : "Incorrect.") + "</strong> " + esc(q.explanation);
        /* Where the source explains each option, show the reasoning for the
         * ones actually picked wrongly. */
        if (q.optionNotes) {
          chosen.forEach(function (optIdx) {
            if (correct.indexOf(optIdx) !== -1) return;
            var note = q.optionNotes[optIdx];
            if (note) {
              html += '<div class="opt-note">Your pick (' +
                String.fromCharCode(65 + sq.order.indexOf(optIdx)) + "): " + esc(note) + "</div>";
            }
          });
        }
        html += "</div>";
      }
      html += "</div>";

      var hint = '<span class="muted kbd-hint"><kbd>1</kbd>–<kbd>4</kbd> answer · <kbd>←</kbd>/<kbd>→</kbd> navigate' +
        (isPractice ? "" : " · <kbd>F</kbd> flag") + "</span>";
      html += '<div class="quiz-footer">' +
        (isPractice ? "" : '<button class="btn" data-action="prev"' + (session.current === 0 ? " disabled" : "") + ">← Previous</button>") +
        hint +
        '<div class="row">';
      if (isPractice) {
        if (showFeedback) {
          html += session.current + 1 < total
            ? '<button class="btn primary" data-action="next">Next →</button>'
            : '<button class="btn primary" data-action="submit">Finish</button>';
        } else {
          html += '<span class="muted">Pick an answer to see the explanation</span>';
        }
      } else {
        var allAnswered = answeredSoFar >= total;
        html += '<button class="btn primary" data-action="submit">' +
          (allAnswered ? "Finish &amp; see results"
            : session.mode === "exam" ? "Submit exam" : "Submit answers") + "</button>" +
          '<button class="btn" data-action="next"' + (session.current + 1 >= total ? " disabled" : "") + ">Next →</button>";
      }
      html += "</div></div>";

      app.innerHTML = html;
      window.scrollTo(0, 0);
      var cur = app.querySelector(".nav-cell.current");
      if (cur && cur.scrollIntoView) cur.scrollIntoView({ inline: "center", block: "nearest" });
    }

    function selectOption(optIdx) {
      var sq = session.questions[session.current];
      if ((session.mode === "practice" || session.mode === "scenario-practice")) {
        if (session.feedback === sq.id) return; // already answered
        var q = byId[sq.id];
        var wanted = correctIndices(q);
        if (wanted.length > 1) {
          /* Collect picks until as many are chosen as the question asks for,
           * then grade; otherwise the first click would score it wrong. */
          session.answers[sq.id] = toggleChoice(session.answers[sq.id], optIdx);
          if (chosenIndices(session.answers[sq.id]).length < wanted.length) {
            persistSession();
            renderQuestion();
            return;
          }
        } else {
          session.answers[sq.id] = optIdx;
        }
        session.feedback = sq.id;
        var right = sameChoice(session.answers[sq.id], wanted);
        if (right) session.tally.correct++;
        else session.tally.wrong++;
        if (!session.separate && bankIds[q.id]) Store.mutate(Mutations.recordAnswer(q.id, right));
        scheduleReview([{ id: q.id, correct: right }]);
      } else if (isMultiAnswer(byId[sq.id])) {
        session.answers[sq.id] = toggleChoice(session.answers[sq.id], optIdx);
      } else {
        session.answers[sq.id] = session.answers[sq.id] === optIdx ? null : optIdx;
      }
      persistSession();
      renderQuestion();
    }

    /* ----------------------------------------------------------- results */
    function submitSession() {
      stopTimer();
      if (!session) return;
      var questions = session.questions
        .map(function (s) { return byId[s.id]; })
        .filter(Boolean);
      var grade = gradeSession(questions, session.answers);
      var finished = {
        mode: session.mode,
        domain: session.domain,
        questions: session.questions,
        answers: session.answers,
        grade: grade,
      };

      var separate = session.separate === true || session.mode === "imported" || isScenarioMode(session.mode);
      var isAttempt = session.mode === "exam" || session.mode === "imported" || session.mode === "scenario";
      var isScenarioExam = session.mode === "scenario";
      var entry = null;
      if (isAttempt) {
        var score = scaledScore(grade.correct, grade.total);
        entry = {
          date: new Date().toISOString(),
          examId: session.examId || null,
          examName: isScenarioExam ? (session.diagnostic ? "Diagnostic" : "Scenario exam")
            : session.examName || (session.scope === "unmapped" ? "Supplementary mock" : null),
          /* The questions and answers are kept so the attempt can be
           * reviewed and broken down by subdomain later. */
          items: session.questions.map(function (s) {
            var item = { id: s.id, order: s.order, given: session.answers[s.id] };
            if (isScenarioExam && session.comments && session.comments[s.id]) item.comment = session.comments[s.id];
            return item;
          }),
          score: score,
          pass: score >= PASS_SCORE,
          correct: grade.correct,
          total: grade.total,
          perDomain: grade.perDomain,
        };
        if (isScenarioExam) {
          entry.kind = "scenario";
          if (session.diagnostic) entry.diagnostic = true;
          entry.scenarioIds = session.scenarioIds.slice();
        }
        finished.score = score;
      }
      if (isScenarioMode(session.mode)) {
        finished.scenarioIds = session.scenarioIds || [session.scenarioId];
        finished.comments = session.comments || {};
      }

      /* One mutation clears the session, redeems the weak questions answered
       * correctly, and records the attempt — so a later sync cannot bring
       * any of it back. */
      Store.mutate(Mutations.finishSession(grade, entry, { separate: separate }));
      /* Practice modes scheduled each answer as it was given; everything
       * else is graded here, and an unanswered question counts as wrong. */
      if (session.mode !== "practice" && session.mode !== "scenario-practice") {
        var right = {};
        grade.correctIds.forEach(function (id) { right[id] = true; });
        scheduleReview(questions.map(function (q) { return { id: q.id, correct: !!right[q.id] }; }));
      }

      session = null;
      renderResults(finished);
    }

    function renderResults(finished) {
      view = "results";
      var grade = finished.grade;
      var isExam = finished.mode === "exam" || finished.mode === "scenario";
      var isScenario = isScenarioMode(finished.mode);
      var html = "";

      var CIRC = 408; // 2π × r65, matches the CSS dasharray
      function ring(fraction, good, num, den) {
        var offset = Math.round(CIRC * (1 - Math.max(0, Math.min(1, fraction))));
        return '<div class="score-ring ' + (good ? "pass" : "fail") + '" style="--target:' + offset + '">' +
          '<svg width="150" height="150" viewBox="0 0 150 150" aria-hidden="true">' +
          '<circle class="track" cx="75" cy="75" r="65"></circle>' +
          '<circle class="fill" cx="75" cy="75" r="65"></circle></svg>' +
          '<div class="center"><div class="num">' + num + '</div><div class="den">' + den + "</div></div></div>";
      }

      if (isExam) {
        var pass = finished.score >= PASS_SCORE;
        html += '<div class="card score-card ' + (pass ? "pass" : "fail") + '">' +
          ring(finished.score / 1000, pass, finished.score, "/ 1000") +
          '<div><span class="badge big ' + (pass ? "pass" : "fail") + '">' + (pass ? "PASS" : "FAIL") + "</span>" +
          '<p class="muted">Passing score 720 · you answered ' + grade.correct + " of " + grade.total + " correctly</p></div></div>";
      } else {
        var frac = grade.total ? grade.correct / grade.total : 0;
        html += '<div class="card score-card">' +
          ring(frac, frac >= 0.72, grade.correct, "/ " + grade.total) +
          '<p class="muted">' + sessionResultLabel(finished.mode) + "</p></div>";
      }

      if (isScenario) {
        var finishedQs = finished.questions.map(function (s) { return byId[s.id]; }).filter(Boolean);
        var bar = function (row, label, cls) {
          return '<div class="' + cls + '" data-pct="' + row.pct + '"><div class="domain-score-label"><span>' + esc(label) + "</span>" +
            '<span class="muted">' + row.pct + "% · " + row.correct + "/" + row.total + "</span></div>" +
            '<div class="bar"><div class="bar-fill ' + (row.pct >= 72 ? "ok" : "bad") + '" style="width:' + row.pct + '%"></div></div></div>';
        };
        html += '<div class="card"><h2>By objective</h2><p class="muted">Percent correct per exam-guide task statement, weakest first — like the real score report.</p>';
        breakdownBy(finishedQs, finished.answers, function (q) { return q.subdomain; }).forEach(function (row) {
          html += bar(row, row.key, "obj-row");
        });
        html += '</div><div class="card"><h2>By scenario</h2>';
        breakdownBy(finishedQs, finished.answers, function (q) { return q.scenario; }).forEach(function (row) {
          html += bar(row, (scenarioById[row.key] || {}).name || row.key, "scn-row");
        });
        html += "</div>";
      }

      var gradedDomains = isScenario ? [] : Object.keys(grade.perDomain).filter(function (d) {
        return !!DOMAIN_NAMES[d];
      });
      if (gradedDomains.length) {
      html += '<div class="card"><h2>By domain</h2>';
      gradedDomains.sort().forEach(function (d) {
        var pd = grade.perDomain[d];
        var pct = pd.total ? Math.round((pd.correct / pd.total) * 100) : 0;
        html += '<div class="domain-score"><div class="domain-score-label">' +
          '<span class="domain-chip chip-d' + d + '">D' + d + "</span><span>" + esc(DOMAIN_NAMES[d]) + "</span>" +
          '<span class="muted">' + pd.correct + "/" + pd.total + "</span></div>" +
          '<div class="bar"><div class="bar-fill ' + (pct >= 72 ? "ok" : "bad") + '" style="width:' + pct + '%"></div></div></div>';
      });
      html += "</div>";
      }

      html += '<div class="row actions">';
      if (isScenario) {
        /* Missed scenario questions are practised as scenario questions, never
         * sent to the general weak-question drill. */
        if (grade.wrongIds.length) {
          html += '<button class="btn primary" data-action="practice-missed">Practise the ' + grade.wrongIds.length +
            " you missed</button>";
        }
      } else if (grade.wrongIds.length) {
        html += '<button class="btn primary" data-action="retry-failed">Retry ' + grade.wrongIds.length +
          " failed question" + (grade.wrongIds.length === 1 ? "" : "s") + "</button>";
      } else {
        html += '<span class="badge big pass">All correct — nothing to retry 🎉</span>';
      }
      html += '<button class="btn" data-action="show-review">Review answers</button>' +
        '<button class="btn ghost" data-action="home">Home</button></div>';

      app.innerHTML = html;
      lastFinished = finished;
    }

    function sessionResultLabel(mode) {
      switch (mode) {
        case "retry": return "Retry session — keep going until everything is green";
        case "weak": return "Weak questions drill";
        case "practice": return "Practice session complete";
        case "custom": return "Custom quiz complete";
        case "scenario-practice": return "Scenario practice complete";
        default: return "";
      }
    }

    function reviewStoredAttempt(date) {
      var entry = null;
      Store.snapshot().history.forEach(function (h) { if (h.date === date) entry = h; });
      var restored = attemptToFinished(entry);
      if (!restored) {
        alert("That attempt cannot be reviewed — its questions are no longer in the app.");
        return;
      }
      lastFinished = restored;
      reviewWrongOnly = false;
      reviewDomain = 0;
      renderReview();
    }

    /* Turn a stored history entry back into the shape the review screen
     * expects, recomputing the grade from the questions as they are today. */
    function attemptToFinished(entry) {
      if (!entry || !Array.isArray(entry.items)) return null;
      var items = entry.items.filter(function (it) { return byId[it.id]; });
      if (!items.length) return null;
      var answers = {};
      items.forEach(function (it) { answers[it.id] = it.given === undefined ? null : it.given; });
      var questions = items.map(function (it) {
        return { id: it.id, order: it.order || byId[it.id].options.map(function (_, i) { return i; }) };
      });
      var grade = gradeSession(items.map(function (it) { return byId[it.id]; }), answers);
      var finished = {
        mode: entry.kind === "scenario" ? "scenario" : entry.examId ? "imported" : "exam",
        examName: entry.examName || null,
        date: entry.date,
        questions: questions,
        answers: answers,
        grade: grade,
        score: entry.score,
        fromHistory: true,
      };
      if (entry.kind === "scenario") {
        finished.scenarioIds = entry.scenarioIds || [];
        finished.comments = {};
        items.forEach(function (it) { if (it.comment) finished.comments[it.id] = it.comment; });
      }
      return finished;
    }

    var lastFinished = null;
    var reviewWrongOnly = false;
    var reviewDomain = 0; // 0 = all

    /* One review card; scenario reviews show every option's note under it. */
    function reviewCard(s, i, finished) {
      var q = byId[s.id];
      var given = finished.answers[q.id];
      var right = sameChoice(given, correctIndices(q));
      var html = '<div class="card review-card ' + (right ? "r-ok" : "r-bad") + '">' +
        '<div class="q-meta"><strong>Q' + (i + 1) + "</strong>" +
        (q.scenario ? '<span class="muted">' + esc(q.subdomain || "") + "</span>" : questionMeta(q)) +
        '<span class="badge ' + (right ? "pass" : "fail") + '">' +
        (right ? "Correct" : !chosenIndices(given).length ? "Unanswered" : "Wrong") + "</span></div>" +
        '<p class="q-text">' + esc(q.question) + "</p><div class=\"options\">";
      var correctOpts = correctIndices(q);
      var givenOpts = chosenIndices(given);
      s.order.forEach(function (optIdx) {
        var isCorrect = correctOpts.indexOf(optIdx) !== -1;
        var wasPicked = givenOpts.indexOf(optIdx) !== -1;
        var cls = "option readonly";
        if (isCorrect) cls += " correct";
        if (wasPicked && !isCorrect) cls += " wrong";
        var note = q.optionNotes && q.optionNotes[optIdx];
        /* The note goes under its own option, never beside or after another. */
        html += '<div class="opt-wrap"><div class="' + cls + '"><span class="opt-letter"></span><span>' + esc(q.options[optIdx]) +
          (isCorrect ? ' <span class="tag">correct answer</span>' : "") +
          (wasPicked ? ' <span class="tag">your answer</span>' : "") + "</span></div>" +
          (note ? '<div class="opt-note ' + (isCorrect ? "ok" : "bad") + '">' + esc(note) + "</div>" : "") +
          "</div>";
      });
      html += "</div>" + '<div class="feedback ok">' + esc(q.explanation) + "</div>";
      var comment = finished.comments && finished.comments[q.id];
      if (comment) html += '<div class="scn-comment"><strong>Your comment:</strong> ' + esc(comment) + "</div>";
      return html + "</div>";
    }

    function renderScenarioReviewAfter() {
      view = "review";
      var finished = lastFinished;
      var html = '<div class="scn-screen"><div class="scn-top"><div><strong>Review</strong>' +
        (finished.fromHistory
          ? '<span class="muted"> · ' + esc(finished.examName || "Scenario exam") + ", " +
            esc(new Date(finished.date).toLocaleString()) + "</span>"
          : "") +
        '</div><div class="row">' +
        '<button class="btn small ' + (reviewWrongOnly ? "" : "ghost") + '" data-action="toggle-wrong-only">' +
        (reviewWrongOnly ? "Showing wrong only" : "Show wrong only") + "</button>" +
        '<button class="btn ghost small" data-action="' + (finished.fromHistory ? "home" : "back-results") + '">' +
        (finished.fromHistory ? "← Home" : "Back to results") + "</button></div></div>";
      var shown = 0;
      var groups = [];
      finished.questions.forEach(function (s, i) {
        var q = byId[s.id];
        var last = groups[groups.length - 1];
        if (!last || last.scenario !== q.scenario) groups.push(last = { scenario: q.scenario, cards: "" });
        if (reviewWrongOnly && sameChoice(finished.answers[q.id], correctIndices(q))) return;
        shown++;
        last.cards += reviewCard(s, i, finished);
      });
      groups.forEach(function (g) {
        if (!g.cards) return;
        var scn = scenarioById[g.scenario] || { name: g.scenario, text: "" };
        html += '<div class="scn-body">' +
          '<aside class="scn-panel"><details open><summary>' + esc(scn.name) + "</summary>" +
          '<div class="scn-text">' + esc(scn.text) + "</div></details></aside>" +
          '<section class="scn-review-list">' + g.cards + "</section></div>";
      });
      if (!shown) html += '<div class="card"><p class="muted">Nothing matches this filter.</p></div>';
      app.innerHTML = html + "</div>";
      window.scrollTo(0, 0);
    }

    function renderReview() {
      if (lastFinished && isScenarioMode(lastFinished.mode)) return renderScenarioReviewAfter();
      view = "review";
      var finished = lastFinished;
      var domainOptions = '<option value="0">All domains</option>';
      for (var rd = 1; rd <= 5; rd++) {
        domainOptions += '<option value="' + rd + '"' + (reviewDomain === rd ? " selected" : "") + ">D" + rd + " — " + esc(DOMAIN_NAMES[rd]) + "</option>";
      }
      var html = '<div class="quiz-header"><div><strong>Review</strong>' +
        (finished.fromHistory
          ? '<span class="muted"> · ' + esc(finished.examName || "Mock exam") + ", " +
            esc(new Date(finished.date).toLocaleString()) + "</span>"
          : "") +
        "</div><div class=\"row\">" +
        '<select id="review-domain" class="select">' + domainOptions + "</select>" +
        '<button class="btn small ' + (reviewWrongOnly ? "" : "ghost") + '" data-action="toggle-wrong-only">' +
        (reviewWrongOnly ? "Showing wrong only" : "Show wrong only") + "</button>" +
        '<button class="btn ghost small" data-action="' + (finished.fromHistory ? "home" : "back-results") + '">' +
        (finished.fromHistory ? "← Home" : "Back to results") + "</button></div></div>";

      var shown = 0;
      finished.questions.forEach(function (s, i) {
        var q = byId[s.id];
        var given = finished.answers[q.id];
        var right = sameChoice(given, correctIndices(q));
        if (reviewWrongOnly && right) return;
        if (reviewDomain && q.domain !== reviewDomain) return;
        shown++;
        html += '<div class="card review-card ' + (right ? "r-ok" : "r-bad") + '">' +
          '<div class="q-meta"><strong>Q' + (i + 1) + "</strong>" +
          questionMeta(q) +
          '<span class="badge ' + (right ? "pass" : "fail") + '">' +
          (right ? "Correct" : !chosenIndices(given).length ? "Unanswered" : "Wrong") + "</span></div>" +
          '<p class="q-text">' + esc(q.question) + "</p><div class=\"options\">";
        var correctOpts = correctIndices(q);
        var givenOpts = chosenIndices(given);
        s.order.forEach(function (optIdx) {
          var isCorrect = correctOpts.indexOf(optIdx) !== -1;
          var wasPicked = givenOpts.indexOf(optIdx) !== -1;
          var cls = "option readonly";
          if (isCorrect) cls += " correct";
          if (wasPicked && !isCorrect) cls += " wrong";
          var note = q.optionNotes && q.optionNotes[optIdx];
          html += '<div class="' + cls + '"><span class="opt-letter"></span>' + esc(q.options[optIdx]) +
            (isCorrect ? ' <span class="tag">correct answer</span>' : "") +
            (wasPicked ? ' <span class="tag">your answer</span>' : "") +
            (note ? '<div class="opt-note">' + esc(note) + "</div>" : "") +
            "</div>";
        });
        html += "</div>" + '<div class="feedback ok">' + esc(q.explanation) + "</div></div>";
      });

      if (!shown) html += '<div class="card"><p class="muted">Nothing matches this filter.</p></div>';

      app.innerHTML = html;
      var sel = document.getElementById("review-domain");
      if (sel) sel.addEventListener("change", function () {
        reviewDomain = Number(sel.value);
        renderReview();
      });
      window.scrollTo(0, 0);
    }

    /* ------------------------------------------------------------ events */
    function inQuestionScreen() {
      return view === "quiz" && !!(session && session.questions && session.questions[session.current]);
    }

    function goPrev() {
      if (session.mode === "practice" || session.current === 0) return;
      session.current--;
      session.feedback = null;
      persistSession();
      renderQuestion();
    }

    function goNext() {
      var sq = session.questions[session.current];
      if ((session.mode === "practice" || session.mode === "scenario-practice")) {
        if (session.feedback !== sq.id) return; // must answer first
        if (session.current + 1 >= session.questions.length) return submitSession();
      } else if (session.current + 1 >= session.questions.length) {
        if (session.mode === "scenario") return renderScenarioReview();
        return;
      }
      session.current++;
      session.feedback = null;
      persistSession();
      renderQuestion();
    }

    function toggleFlag() {
      if (session.mode === "practice") return;
      var id = session.questions[session.current].id;
      if (session.flagged[id]) delete session.flagged[id];
      else session.flagged[id] = true;
      persistSession();
      renderQuestion();
    }

    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") hideCtxMenu();
      if (!inQuestionScreen() || ev.metaKey || ev.ctrlKey || ev.altKey) return;
      var tag = ev.target && ev.target.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      var key = ev.key.toLowerCase();
      var optPos = -1;
      if (key.length === 1 && key >= "1" && key <= "4") optPos = Number(key) - 1;
      else if (key.length === 1 && key >= "a" && key <= "d") optPos = key.charCodeAt(0) - 97;
      if (optPos >= 0) {
        var sq = session.questions[session.current];
        if ((session.mode === "practice" || session.mode === "scenario-practice") && session.feedback === sq.id) return;
        return selectOption(sq.order[optPos]);
      }
      if (ev.key === "ArrowLeft") { ev.preventDefault(); return goPrev(); }
      if (ev.key === "Enter") {
        // let the focused control handle its own activation
        if (ev.target && ev.target.closest && ev.target.closest("button, a, input, select")) return;
        ev.preventDefault();
        return goNext();
      }
      if (ev.key === "ArrowRight") { ev.preventDefault(); return goNext(); }
      if (key === "f") return toggleFlag();
    });

    /* Right-click an option in a scenario question to strike it through,
     * like the real exam. */
    function hideCtxMenu() {
      var menu = document.getElementById("ctx-menu");
      if (menu) menu.hidden = true;
    }
    app.addEventListener("contextmenu", function (ev) {
      if (!session || !isScenarioMode(session.mode) || view !== "quiz") return;
      var opt = ev.target.closest && ev.target.closest(".option[data-opt]");
      var menu = document.getElementById("ctx-menu");
      if (!opt || !menu) return hideCtxMenu();
      ev.preventDefault();
      var optIdx = Number(opt.dataset.opt);
      var id = session.questions[session.current].id;
      var isStruck = (session.strikes[id] || []).indexOf(optIdx) !== -1;
      menu.innerHTML = '<button class="ctx-item" data-action="strike" data-opt="' + optIdx + '">' +
        (isStruck ? "Remove strike-through" : "Strike through") + "</button>";
      menu.style.left = ev.clientX + "px";
      menu.style.top = ev.clientY + "px";
      menu.hidden = false;
    });
    document.addEventListener("click", hideCtxMenu, true);
    document.addEventListener("scroll", hideCtxMenu, true);

    app.addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-action]");
      if (!btn || btn.disabled) return;
      var action = btn.dataset.action;

      switch (action) {
        case "start-exam": return startExam(btn.dataset.scope || "mapped");
        case "start-imported": return startImportedExam(btn.dataset.exam);
        case "practice-imported": return startImportedPractice(btn.dataset.exam);
        case "start-weak": return startWeak();
        case "practice": return startPractice(Number(btn.dataset.domain), btn.dataset.sub || null);
        case "toggle-practice": {
          var pd = Number(btn.dataset.domain);
          expandedPractice = expandedPractice === pd ? 0 : pd;
          return renderHome();
        }
        case "resume": return resumeSession();
        case "finish-saved": return finishSavedSession();
        case "discard":
          if (!confirm("Discard this in-progress session? This cannot be undone.")) return;
          Store.mutate(Mutations.clearSession());
          return renderHome();
        case "clear-saved":
          if (!confirm("Remove every saved question?")) return;
          Store.snapshot().saved.slice().forEach(function (id) {
            Store.mutate(Mutations.toggleSaved(id));
          });
          return renderHome();
        case "clear-history":
          if (confirm("Delete all score history?")) {
            Store.mutate(Mutations.clearHistory());
            renderHome();
          }
          return;
        case "custom-builder": return renderCustomBuilder();
        case "cq-domain":
          customState.domains[Number(btn.dataset.domain)] = btn.checked;
          return renderCustomBuilder();
        case "cq-sub":
          customState.subs[btn.dataset.key] = btn.checked;
          if (!btn.checked) delete customState.subs[btn.dataset.key];
          return renderCustomBuilder();
        case "cq-open-subs": {
          var od = Number(btn.dataset.domain);
          customState.openDomain = customState.openDomain === od ? 0 : od;
          return renderCustomBuilder();
        }
        case "cq-count":
          customState.count = btn.dataset.count;
          return renderCustomBuilder();
        case "cq-timed":
          customState.timed = btn.checked;
          return renderCustomBuilder();
        case "start-custom": return startCustom();
        case "select": return selectOption(Number(btn.dataset.opt));
        case "prev": return goPrev();
        case "next": return goNext();
        case "jump":
          session.current = Number(btn.dataset.index); persistSession(); return renderQuestion();
        case "toggle-flag": return toggleFlag();
        case "toggle-saved": {
          if (!session) return;
          Store.mutate(Mutations.toggleSaved(session.questions[session.current].id));
          return renderQuestion();
        }
        case "start-saved": return startSaved();
        case "start-scenario-exam": return startScenarioExam();
        case "review-all": return session && renderScenarioReview();
        case "practice-scenario": return startScenarioPractice(btn.dataset.scenario);
        case "start-review": return startReview();
        case "start-diagnostic": return startScenarioExam(true);
        case "drill-objective": return drillObjective(btn.dataset.sub);
        case "edit-exam-date": {
          var cur = Store.snapshot().examDate || "";
          var got = prompt("Exam date (YYYY-MM-DD). Leave empty to clear.", cur);
          if (got === null) return;
          got = String(got).trim();
          if (got && !/^\d{4}-\d{2}-\d{2}$/.test(got)) { alert("Please use the format YYYY-MM-DD, e.g. 2026-12-14."); return; }
          Store.mutate(Mutations.setExamDate(got || null));
          return renderHome();
        }
        case "open-section": {
          var sec = document.getElementById(btn.dataset.id);
          if (sec) { sec.open = true; if (sec.scrollIntoView) sec.scrollIntoView({ behavior: "smooth" }); }
          return;
        }
        case "practice-missed": return lastFinished && startScenarioPractice(null, lastFinished.grade.wrongIds);
        case "review-filter": reviewFilter = btn.dataset.filter || "all"; return session && renderScenarioReview();
        case "strike": return session && toggleStrike(Number(btn.dataset.opt));
        case "comment": {
          if (!session) return;
          var cur = session.comments[session.questions[session.current].id] || "";
          var text = prompt("Comment on this question (leave empty to remove):", cur);
          if (text === null) return;
          return setComment(text);
        }
        case "submit": {
          if (session.mode === "exam" || session.mode === "scenario") {
            var unanswered = session.questions.filter(function (s) { return session.answers[s.id] === null; }).length;
            var msg = unanswered
              ? "You have " + unanswered + " unanswered question" + (unanswered === 1 ? "" : "s") + ". Submit anyway?"
              : "Submit the exam?";
            if (!confirm(msg)) return;
          }
          return submitSession();
        }
        case "quit":
          if (!confirm("Exit? Your progress is saved — resume from the home screen.")) return;
          persistSession();
          stopTimer();
          return renderHome();
        case "retry-failed": return startRetry(lastFinished.grade.wrongIds);
        case "show-review": reviewWrongOnly = false; reviewDomain = 0; return renderReview();
        case "review-attempt": {
          var wanted = btn.dataset.date;
          var entry = null;
          Store.snapshot().history.forEach(function (h) { if (h.date === wanted) entry = h; });
          if (entry && entry.examId && examById[entry.examId] && !examById[entry.examId].questions) {
            return loadExam(entry.examId).then(
              function () { reviewStoredAttempt(wanted); },
              function () { alert("That exam could not be loaded."); }
            );
          }
          return reviewStoredAttempt(wanted);
        }
        case "toggle-wrong-only": reviewWrongOnly = !reviewWrongOnly; return renderReview();
        case "back-results": return renderResults(lastFinished);
        case "home": return renderHome();
        case "cycle-theme": cycleTheme(); return renderHome();
        case "hard-reload":
          if (window.caches && caches.keys) {
            caches.keys().then(function (keys) {
              return Promise.all(keys.map(function (k) { return caches.delete(k); }));
            }).then(function () { location.reload(); }, function () { location.reload(); });
          } else {
            location.reload();
          }
          return;
        case "toggle-mastery": {
          var dm = Number(btn.dataset.domain);
          expandedMastery = expandedMastery === dm ? 0 : dm;
          return renderHome();
        }
        case "auth-send": {
          var emailEl = document.getElementById("auth-email");
          var email = emailEl && emailEl.value.trim();
          if (!email || email.indexOf("@") === -1) { alert("Enter a valid e-mail address."); return; }
          btn.disabled = true;
          window.CCARF_SYNC.sendCode(email).then(function () {
            pendingEmail = email;
            renderHome();
          }).catch(function (err) {
            btn.disabled = false;
            alert("Could not send the code: " + (err && err.message ? err.message : err));
          });
          return;
        }
        case "auth-verify": {
          var codeEl = document.getElementById("auth-code");
          var code = codeEl && codeEl.value.trim();
          if (!code) { alert("Enter the code from the e-mail."); return; }
          btn.disabled = true;
          window.CCARF_SYNC.verify(pendingEmail, code).then(function () {
            pendingEmail = null; // auth event re-renders home
          }).catch(function (err) {
            btn.disabled = false;
            alert("Sign-in failed: " + (err && err.message ? err.message : err));
          });
          return;
        }
        case "auth-signout":
          if (!confirm("Sign out? Progress stays on the server and this device's copy is cleared.")) return;
          window.CCARF_SYNC.signOut();
          return;
        case "restore-backup": {
          var backup = LS.get(BACKUP_KEY, null);
          if (!progressSize(backup)) return;
          if (!confirm("Merge this device's backup into your progress? Nothing is removed.")) return;
          Store.mutate(Mutations.restore(backup));
          if (window.CCARF_SYNC && window.CCARF_SYNC.syncNow) window.CCARF_SYNC.syncNow();
          return renderHome();
        }
        case "sync-now":
          window.CCARF_SYNC.syncNow();
          return;
      }
    });

    /* Sync and auth updates refresh the home screen only. Re-rendering while
     * a quiz, result or review is on screen would throw the user out of it. */
    window.addEventListener("ccarf:auth", function () {
      if (!session && view === "home") renderHome();
    });

    /* Signing out must not leave one account's progress on screen for the
     * next person to sign in on this device. */
    window.addEventListener("ccarf:signout", function () {
      stopTimer();
      session = null;
      Store.reset();
      LS.remove("ccarf.syncedAt");
      renderHome();
    });

    /* ------------------------------------------------------------- boot */
    applyTheme();

    if ("serviceWorker" in navigator &&
        (location.protocol === "https:" || location.hostname === "localhost")) {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    }

    var bankErrors = validateBank(BANK);
    if (!BANK.length) {
      app.innerHTML = '<div class="card"><h2>No questions loaded</h2><p>Make sure the files in <code>questions/</code> are present.</p></div>';
    } else {
      if (bankErrors.length) {
        console.warn("Question bank validation issues:", bankErrors);
      }
      renderHome();
      loadReferencedExams(Store.snapshot()).then(function () {
        if (view === "home") renderHome();
      });
    }
  })();
}
