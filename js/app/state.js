/* DOM app — shared state: the loaded banks and their indexes, imported-exam
 * loading, localStorage, the Store, the screen/session state, theme and the
 * small helpers every screen uses. Must load before the other js/app files. */

"use strict";

/* The question files hold every question, but only the exam-guide-mapped
 * ones (those with a subdomain) are used. The unmapped ones stay on disk and
 * in byId, so old attempts and sessions that used them still open, but
 * they never appear in practice, exams, search or the review lists. */
var FULL_BANK = window.QUESTION_BANK || [];
var BANK = filterByTagging(FULL_BANK, true);
/* Imported exams are deliberately kept out of BANK: they never feed the
 * practice pools, custom quizzes, mastery or the weak-question drill.
 * Only the manifest loads with the page; each exam's questions are
 * fetched the first time they are needed. */
var EXAMS = window.MOCK_EXAM_INDEX || (window.MOCK_EXAMS || []);
var examById = {};
EXAMS.forEach(function (e) {
  examById[e.id] = { id: e.id, name: e.name, count: e.count, questions: e.questions };
});

/* Study resources (resources.js): links only, never fetched by the app. */
var RESOURCES = validResources(window.STUDY_RESOURCES);
function resourceById(id) {
  for (var i = 0; i < RESOURCES.length; i++) if (RESOURCES[i].id === id) return RESOURCES[i];
  return null;
}

/* Where "Report a problem" sends people: a new GitHub issue on this repo.
 * Set to "" to hide the link (e.g. in a fork without issues). */
var REPORT_ISSUE_URL = "https://github.com/ahasan09/ccarf-qb/issues/new";

function reportLink(q) {
  var url = reportIssueUrl(q, REPORT_ISSUE_URL);
  return url ? '<a class="h-link report-link" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' +
    "Report a problem with this question ↗</a>" : "";
}

var bankIds = {};
BANK.forEach(function (q) { bankIds[q.id] = true; });

var byId = {};
FULL_BANK.forEach(function (q) { byId[q.id] = q; });

/* A question the lists on the home screen may offer: anything known except
 * an unmapped bank question. */
var hiddenIds = {};
FULL_BANK.forEach(function (q) { if (!bankIds[q.id]) hiddenIds[q.id] = true; });
function isListed(id) { return !!byId[id] && !hiddenIds[id]; }

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
var view = "home"; // home | quiz | results | review | custom | search
var searchQuery = ""; // the search screen's last query
var timerHandle = null;
var session = null; // active session object
var pendingEmail = null; // login code sent, awaiting verification
var expandedMastery = 0; // domain whose subdomain breakdown is open (0 = none)
var expandedPractice = 0; // domain whose practice subdomain list is open (0 = none)
/* Open/closed state of collapsible <details> sections, by id. Screens are
 * redrawn from scratch, so without this every redraw (a click, a sync, a
 * theme change) would snap sections back to their default. Home sections
 * are also saved in this browser so a reload keeps them; the account menu
 * is a popup, not a section, so it always starts closed. */
var FOLDS_KEY = "ccarf.folds";
function isSavedFold(id) { return /^h-/.test(id) && id !== "h-acct"; }
var foldState = (function () {
  var saved = LS.get(FOLDS_KEY, {}), out = {};
  if (saved && typeof saved === "object") {
    Object.keys(saved).forEach(function (id) {
      if (isSavedFold(id) && typeof saved[id] === "boolean") out[id] = saved[id];
    });
  }
  return out;
})();
function setFold(id, open) {
  foldState[id] = open;
  if (!isSavedFold(id)) return;
  var saved = {};
  Object.keys(foldState).forEach(function (k) { if (isSavedFold(k)) saved[k] = foldState[k]; });
  LS.set(FOLDS_KEY, saved);
}
function foldAttrs(id, openByDefault) {
  var open = Object.prototype.hasOwnProperty.call(foldState, id) ? foldState[id] : !!openByDefault;
  return ' id="' + id + '"' + (open ? " open" : "");
}
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

/* Replace what is on screen. If the focused control (say an option picked
 * from the keyboard, or a section toggle) is drawn again, focus returns to
 * it, so keyboard and screen-reader users keep their place instead of
 * starting over from the top of the page. */
var FOCUS_KEYS = ["tab", "opt", "index", "domain", "sub", "scenario", "exam", "id", "filter", "pool", "date", "scope"];
function paint(html) {
  var sel = focusSelector(document.activeElement);
  app.innerHTML = html;
  var el = sel && app.querySelector(sel);
  if (el && el.focus) el.focus({ preventScroll: true });
}
function focusSelector(el) {
  if (!el || !el.dataset || !el.dataset.action) return null;
  var q = function (v) { return '"' + String(v).replace(/["\\]/g, "\\$&") + '"'; };
  var sel = "[data-action=" + q(el.dataset.action) + "]";
  FOCUS_KEYS.forEach(function (k) {
    if (el.dataset[k] !== undefined) sel += "[data-" + k + "=" + q(el.dataset[k]) + "]";
  });
  return sel;
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* The one expand/collapse icon used everywhere: a chevron that turns over when
 * open. `open` marks state the app tracks itself; inside a <summary> leave it
 * out and the CSS follows the <details> element's own open state. `bare`
 * drops the ring, for use inside a button that already has a border. */
function chev(open, bare) {
  return '<span class="chev' + (open ? " open" : "") + (bare ? " bare" : "") + '" aria-hidden="true">' +
    '<svg width="12" height="12" viewBox="0 0 16 16">' +
    '<path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    "</svg></span>";
}

function stopTimer() {
  if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
}
