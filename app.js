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

/* --------------------------------------------------------- progress state */
/* One object holds all synced progress. Changes are expressed as named
 * mutations rather than whole-blob writes so that removals (a finished
 * session, a redeemed weak question) survive a sync: on a write conflict the
 * pending mutations are replayed on top of the freshest server state instead
 * of a merge guessing what was deleted. */

function emptyProgress() {
  return { history: [], weak: [], correctEver: [], attempted: [], saved: [], session: null };
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
  };
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
      var weak = progress.weak;
      var history = progress.history;
      var saved = isUsableSession(progress.session) ? progress.session : null;

      var S = window.CCARF_SYNC;
      var acctChip = "";
      if (S && S.enabled) {
        acctChip = S.user()
          ? '<span class="signed-chip" title="Progress syncs to this account"><span class="dot">●</span> ' + esc(S.user().email || "signed in") + "</span>"
          : '<a class="btn ghost small" href="#acct">Sign in</a>';
      }

      var html = "";
      if (BANK.length !== EXPECTED_BANK_SIZE) {
        html += '<div class="card load-warning" role="alert">⚠ Only ' + BANK.length + " of " +
          EXPECTED_BANK_SIZE + " questions loaded — part of the bank failed to download. " +
          '<button class="btn small" data-action="hard-reload">Reload the bank</button></div>';
      }
      html += '<div class="title-row">' +
        '<h1><svg width="34" height="34" viewBox="0 0 128 128" aria-hidden="true">' +
        '<rect width="128" height="128" rx="28" fill="var(--pen)"/>' +
        '<circle cx="64" cy="64" r="34" fill="none" stroke="var(--paper)" stroke-width="7"/>' +
        '<circle cx="64" cy="64" r="19" fill="var(--paper)"/></svg>CCAR-F Question Bank</h1>' +
        '<span class="controls">' + acctChip +
        '<button class="btn icon" data-action="cycle-theme" title="' + THEME_TITLES[currentTheme()] + '" aria-label="Switch theme">' +
        THEME_ICONS[currentTheme()] + "</button></span></div>";

      html += '<header class="hero"><div class="intro"><div class="rule"></div>' +
        "<p>Claude Certified Architect (Foundations) exam prep. Mark your answers, grade yourself against the real pass line, and drill what you miss.</p>" +
        '<div class="facts"><span><b>' + BANK.length + "</b> questions</span>" +
        "<span><b>" + MAPPED.length + "</b> exam-guide mapped</span>" +
        "<span><b>" + UNMAPPED.length + "</b> supplementary</span>" +
        "<span><b>30</b> subdomains</span></div></div>" +
        '<div class="hero-cta">' +
        '<button class="btn primary" data-action="start-exam" data-scope="mapped">Start mock exam</button>' +
        (saved ? '<button class="btn" data-action="resume">Resume session</button>' : "") +
        '<span class="sub">60 questions · 120 min · pass 720/1000<br>drawn from the ' +
        MAPPED.length + " exam-guide questions</span>" +
        "</div></header>";

      if (saved) {
        var savedDone = answeredCount(saved) >= saved.questions.length;
        html += '<div class="card resume-card"><div><strong>' +
          (saved.scope === "unmapped"
            ? "Supplementary mock"
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

      html += '<div class="grid">';
      html += '<div class="card"><h2>Supplementary mock exam</h2>' +
        "<p>Same 60-question format, drawn from the " + UNMAPPED.length +
        " questions that are not mapped to an exam-guide subdomain. Extra practice once you have worked through the main pool.</p>" +
        '<button class="btn" data-action="start-exam" data-scope="unmapped">Start supplementary</button></div>';
      html += '<div class="card"><h2>Drill weak questions</h2><p>' +
        (weak.length
          ? weak.length + " question" + (weak.length === 1 ? "" : "s") + " you previously missed. Answer correctly to clear them."
          : "Nothing here yet — questions you miss will collect here.") + "</p>" +
        '<button class="btn" data-action="start-weak"' + (weak.length ? "" : " disabled") + ">Drill " + (weak.length || "") + "</button></div>";
      var savedIds = progress.saved.filter(function (id) { return byId[id]; });
      html += '<div class="card"><h2>Saved questions</h2><p>' +
        (savedIds.length
          ? savedIds.length + " question" + (savedIds.length === 1 ? "" : "s") + " kept for later. Star any question while answering to add it here."
          : "Nothing saved yet — use ☆ Save on any question to keep it for later.") + "</p>" +
        '<div class="row"><button class="btn" data-action="start-saved"' + (savedIds.length ? "" : " disabled") +
        ">Study saved</button>" +
        (savedIds.length ? '<button class="btn ghost small" data-action="clear-saved">Clear all</button>' : "") +
        "</div></div>";

      html += '<div class="card"><h2>Custom quiz</h2><p>Pick domains, length, and timing — e.g. a quick 20-question timed round on your weakest domain.</p>' +
        '<button class="btn" data-action="custom-builder">Build quiz</button></div>';
      html += "</div>";

      var correctEver = progress.correctEver;
      var attempted = progress.attempted;
      var mastery = masteryByDomain(BANK, correctEver, attempted);
      var seenAll = 0, rightAll = 0, totalAll = 0;
      for (var sd = 1; sd <= 5; sd++) {
        var row = mastery[sd] || { correct: 0, attempted: 0, total: 0 };
        seenAll += row.attempted; rightAll += row.correct; totalAll += row.total;
      }
      html += '<div class="card"><h2>Progress</h2>' +
        '<div class="metric-row">' +
        metricTile("Coverage", totalAll ? Math.round((seenAll / totalAll) * 100) : 0, seenAll + " of " + totalAll + " seen") +
        metricTile("Accuracy", seenAll ? Math.round((rightAll / seenAll) * 100) : 0, rightAll + " of " + seenAll + " right") +
        metricTile("Mastery", totalAll ? Math.round((rightAll / totalAll) * 100) : 0, rightAll + " of " + totalAll + " bank") +
        "</div>" +
        '<p class="muted">Coverage is how much of the bank you have tried; accuracy is how much of that you got right. Click a domain for its subdomains.</p>';
      for (var md = 1; md <= 5; md++) {
        var m = mastery[md] || { correct: 0, attempted: 0, total: 0 };
        var pct = m.total ? Math.round((m.correct / m.total) * 100) : 0;
        var seenPct = m.total ? Math.round((m.attempted / m.total) * 100) : 0;
        var accPct = m.attempted ? Math.round((m.correct / m.attempted) * 100) : 0;
        var open = expandedMastery === md;
        html += '<div class="domain-score">' +
          '<button class="domain-score-label expandable" data-action="toggle-mastery" data-domain="' + md + '" aria-expanded="' + open + '">' +
          '<span class="domain-chip chip-d' + md + '">D' + md + "</span><span>" + esc(DOMAIN_NAMES[md]) + "</span>" +
          '<span class="muted">' + m.attempted + "/" + m.total + " seen" +
          (m.attempted ? " · " + accPct + "% right" : "") + "</span>" +
          chev(open) + "</button>" +
          '<div class="bar"><div class="bar-seen" style="width:' + seenPct + '%"></div>' +
          '<div class="bar-fill ' + (accPct >= 72 || !m.attempted ? "ok" : "bad") + '" style="width:' + pct + '%"></div></div>';
        if (open) {
          html += '<div class="sub-scores">';
          masteryBySubdomain(BANK, correctEver, md, attempted).forEach(function (row) {
            var spct = row.total ? Math.round((row.correct / row.total) * 100) : 0;
            var sSeen = row.total ? Math.round((row.attempted / row.total) * 100) : 0;
            var sAcc = row.attempted ? Math.round((row.correct / row.attempted) * 100) : 0;
            html += '<div class="sub-score"><div class="sub-label">' +
              (row.key === "general" ? "" : '<span class="sub-code">' + esc(row.key) + "</span>") +
              '<span class="sub-title">' + esc(row.title) + "</span>" +
              '<span class="muted">' + row.attempted + "/" + row.total + " seen" +
              (row.attempted ? " · " + sAcc + "%" : "") + "</span></div>" +
              '<div class="bar thin"><div class="bar-seen" style="width:' + sSeen + '%"></div>' +
              '<div class="bar-fill ' + (sAcc >= 72 || !row.attempted ? "ok" : "bad") + '" style="width:' + spct + '%"></div></div></div>';
          });
          html += "</div>";
        }
        html += "</div>";
      }
      html += "</div>";

      html += '<div class="card"><h2>Practice by domain</h2>' +
        '<p class="muted">Untimed, instant feedback. Click a domain to pick a subdomain, or practice all of it.</p>' +
        '<div class="domain-list">';
      for (var d = 1; d <= 5; d++) {
        var count = BANK.filter(function (q) { return q.domain === d; }).length;
        var pOpen = expandedPractice === d;
        html += '<button class="domain-row" data-action="toggle-practice" data-domain="' + d + '" aria-expanded="' + pOpen + '">' +
          '<span class="domain-chip chip-d' + d + '">D' + d + "</span>" +
          "<span>" + esc(DOMAIN_NAMES[d]) + "</span>" +
          '<span class="muted">' + count + " questions</span>" +
          chev(pOpen) + "</button>";
        if (pOpen) {
          html += '<div class="sub-scores practice-subs">' +
            '<button class="sub-row" data-action="practice" data-domain="' + d + '">' +
            "<span><strong>Practice all</strong></span>" +
            '<span class="muted">' + count + " questions</span></button>";
          masteryBySubdomain(BANK, correctEver, d).forEach(function (row) {
            html += '<button class="sub-row" data-action="practice" data-domain="' + d + '" data-sub="' + esc(row.key) +
              '" title="' + esc(row.title || row.key) + '">' +
              (row.key === "general" ? "" : '<span class="sub-code">' + esc(row.key) + "</span>") +
              '<span class="sub-title">' + esc(row.title) + "</span>" +
              '<span class="muted">' + row.correct + "/" + row.total + "</span></button>";
          });
          html += "</div>";
        }
      }
      html += "</div></div>";

      if (EXAMS.length) {
        html += '<div class="card"><h2>Imported mock exams</h2>' +
          '<p class="muted">Full exams from your own files, scored separately. They do not feed the ' +
          "question bank, mastery or the weak drill.</p>" +
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
        html += "</div></div>";
      }

      html += accountCard();

      html += '<div class="card"><h2>Score history</h2>';
      if (!history.length) {
        html += '<p class="muted">No exams taken yet. Your attempts will appear here.</p>';
      } else {
        html += '<div class="table-scroll"><table class="history"><thead><tr><th>Date</th><th>Score</th><th>Result</th><th>Correct</th>' +
          "<th>D1</th><th>D2</th><th>D3</th><th>D4</th><th>D5</th><th></th></tr></thead><tbody>";
        history.slice().reverse().forEach(function (h) {
          var cells = "";
          for (var d2 = 1; d2 <= 5; d2++) {
            var pd = h.perDomain[d2];
            cells += "<td>" + (pd ? pd.correct + "/" + pd.total : "–") + "</td>";
          }
          html += "<tr><td>" + esc(new Date(h.date).toLocaleString()) +
            (h.examName ? '<br><span class="muted">' + esc(h.examName) + "</span>" : "") + "</td>" +
            "<td><strong>" + h.score + "</strong></td>" +
            '<td><span class="badge ' + (h.pass ? "pass" : "fail") + '">' + (h.pass ? "PASS" : "FAIL") + "</span></td>" +
            "<td>" + h.correct + "/" + h.total + "</td>" + cells +
            '<td>' + (Array.isArray(h.items)
              ? '<button class="btn ghost small" data-action="review-attempt" data-date="' + esc(h.date) + '">Review</button>'
              : "") + "</td></tr>";
        });
        html += "</tbody></table></div>" +
          '<button class="btn ghost small" data-action="clear-history">Clear history</button>';
      }
      html += "</div>";

      html += '<footer class="site-footer">Practice material for personal study. ' +
        "Not affiliated with Anthropic or Pearson VUE.</footer>";

      app.innerHTML = html;
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
          return { id: q.id, order: q.exam ? natural : shuffle(natural) };
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

      session = saved;
      return true;
    }

    function resumeSession() {
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
          if (session.savedDrill) return "Saved questions";
          if (session.examName) return "Practice — " + session.examName;
          return "Practice — " + (session.subKey && session.subKey !== "general"
            ? "Subdomain " + session.subKey
            : DOMAIN_NAMES[session.domain] + (session.subKey === "general" ? " (untagged)" : ""));
        case "custom": return "Custom Quiz";
        case "imported": return session.examName || "Imported exam";
      }
    }

    function renderQuestion() {
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
      if (session.mode === "practice") {
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

      var separate = session.separate === true || session.mode === "imported";
      var isAttempt = session.mode === "exam" || session.mode === "imported";
      var entry = null;
      if (isAttempt) {
        var score = scaledScore(grade.correct, grade.total);
        entry = {
          date: new Date().toISOString(),
          examId: session.examId || null,
          examName: session.examName || (session.scope === "unmapped" ? "Supplementary mock" : null),
          /* The questions and answers are kept so the attempt can be
           * reviewed and broken down by subdomain later. */
          items: session.questions.map(function (s) {
            return { id: s.id, order: s.order, given: session.answers[s.id] };
          }),
          score: score,
          pass: score >= PASS_SCORE,
          correct: grade.correct,
          total: grade.total,
          perDomain: grade.perDomain,
        };
        finished.score = score;
      }

      /* One mutation clears the session, redeems the weak questions answered
       * correctly, and records the attempt — so a later sync cannot bring
       * any of it back. */
      Store.mutate(Mutations.finishSession(grade, entry, { separate: separate }));

      session = null;
      renderResults(finished);
    }

    function renderResults(finished) {
      view = "results";
      var grade = finished.grade;
      var isExam = finished.mode === "exam";
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

      var gradedDomains = Object.keys(grade.perDomain).filter(function (d) {
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
      if (grade.wrongIds.length) {
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
      return {
        mode: entry.examId ? "imported" : "exam",
        examName: entry.examName || null,
        date: entry.date,
        questions: questions,
        answers: answers,
        grade: grade,
        score: entry.score,
        fromHistory: true,
      };
    }

    var lastFinished = null;
    var reviewWrongOnly = false;
    var reviewDomain = 0; // 0 = all

    function renderReview() {
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
      return !!(session && session.questions && session.questions[session.current]);
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
      if (session.mode === "practice") {
        if (session.feedback !== sq.id) return; // must answer first
        if (session.current + 1 >= session.questions.length) return submitSession();
      } else if (session.current + 1 >= session.questions.length) {
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
      if (!inQuestionScreen() || ev.metaKey || ev.ctrlKey || ev.altKey) return;
      var tag = ev.target && ev.target.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      var key = ev.key.toLowerCase();
      var optPos = -1;
      if (key.length === 1 && key >= "1" && key <= "4") optPos = Number(key) - 1;
      else if (key.length === 1 && key >= "a" && key <= "d") optPos = key.charCodeAt(0) - 97;
      if (optPos >= 0) {
        var sq = session.questions[session.current];
        if (session.mode === "practice" && session.feedback === sq.id) return;
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
        case "submit": {
          if (session.mode === "exam") {
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
