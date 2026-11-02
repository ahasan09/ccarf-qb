/* DOM app — shared state: the loaded banks and their indexes, imported-exam
 * loading, localStorage, the Store, the screen/session state, theme and the
 * small helpers every screen uses. Must load before the other js/app files. */

"use strict";

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
