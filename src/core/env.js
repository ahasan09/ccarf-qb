/* The loaded banks and their indexes, imported-exam and archive loading,
 * localStorage and the progress Store. Ported from the old js/app/state.js.
 *
 * The question files, js/logic.js and js/store.js are classic scripts that
 * run before this module and leave their data and functions on window. L is
 * that global scope, so logic reads as L.gradeSession(...), etc. */

export const L = typeof window !== "undefined" ? window : globalThis;

/* The question files hold every question, but only the exam-guide-mapped
 * ones (those with a subdomain) are used. The unmapped ones stay in byId so
 * old attempts and sessions still open, but never appear in practice,
 * exams, search or the review lists. A copy: archived questions loaded later
 * are added to the global array and must not change the startup count. */
export const FULL_BANK = (L.QUESTION_BANK || []).slice();
export const BANK = L.filterByTagging(FULL_BANK, true);

/* Imported exams never feed practice, mastery or the weak drill. Only the
 * manifest loads with the page; each exam's questions are fetched on first
 * use. */
export const EXAMS = L.MOCK_EXAM_INDEX || L.MOCK_EXAMS || [];
export const examById = {};
EXAMS.forEach((e) => {
  examById[e.id] = { id: e.id, name: e.name, count: e.count, questions: e.questions };
});

export const RESOURCES = L.validResources(L.STUDY_RESOURCES);
export function resourceById(id) {
  return RESOURCES.find((r) => r.id === id) || null;
}

/* Where "Report a problem" sends people. "" hides the link. */
export const REPORT_ISSUE_URL = "https://github.com/ahasan09/ccarf-qb/issues/new";

export const bankIds = {};
BANK.forEach((q) => { bankIds[q.id] = true; });

export const byId = {};
FULL_BANK.forEach((q) => { byId[q.id] = q; });

const hiddenIds = {};
FULL_BANK.forEach((q) => { if (!bankIds[q.id]) hiddenIds[q.id] = true; });
/* A question the home lists may offer: anything known except an unmapped
 * bank question. */
export function isListed(id) { return !!byId[id] && !hiddenIds[id]; }

/* What counts as study for the activity strip and streak. */
export function countsAsStudy(id) {
  const q = byId[id];
  return !!q && (!!bankIds[id] || !!q.scenario);
}

export const SCENARIOS = L.SCENARIOS || [];
export const SCENARIO_BANK = L.SCENARIO_BANK || [];
export const scenarioById = {};
SCENARIOS.forEach((s) => { scenarioById[s.id] = s; });
SCENARIO_BANK.forEach((q) => { byId[q.id] = q; });

function registerLoadedExams() {
  (L.MOCK_EXAMS || []).forEach((e) => {
    const known = examById[e.id] || (examById[e.id] = { id: e.id, name: e.name });
    known.questions = e.questions;
    e.questions.forEach((q) => { byId[q.id] = q; });
  });
}
registerLoadedExams();

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const tag = document.createElement("script");
    tag.src = src;
    tag.onload = resolve;
    tag.onerror = () => reject(new Error("Could not load " + src));
    document.head.appendChild(tag);
  });
}

const examLoads = {};
export function loadExam(examId) {
  if (!examId || !examById[examId]) return Promise.resolve(null);
  if (examById[examId].questions) return Promise.resolve(examById[examId]);
  if (!examLoads[examId]) {
    examLoads[examId] = loadScript("exams/" + examId + ".js").then(
      () => { registerLoadedExams(); return examById[examId]; },
      (err) => { delete examLoads[examId]; throw err; },
    );
  }
  return examLoads[examId];
}

/* The unmapped questions, fetched only when stored progress refers to them. */
const ARCHIVE_FILES = [1, 2, 3, 4, 5].flatMap((d) => [
  "questions/unmapped/domain" + d + ".js",
  "questions/unmapped/domain" + d + "-set2.js",
]);
let archiveLoad = null;
export function loadArchive() {
  if (!archiveLoad) {
    archiveLoad = Promise.all(ARCHIVE_FILES.map(loadScript)).then(() => {
      (L.QUESTION_BANK || []).forEach((q) => {
        if (!byId[q.id]) { byId[q.id] = q; hiddenIds[q.id] = true; }
      });
    }, (err) => { archiveLoad = null; throw err; });
  }
  return archiveLoad;
}

/* Ids a stored attempt or session needs that are not loaded yet. */
export function missingReferencedIds(progress) {
  const ids = [];
  const note = (id) => { if (id && !byId[id]) ids.push(id); };
  if (progress.session) (progress.session.questions || []).forEach((s) => note(s && s.id));
  (progress.history || []).forEach((h) => (h.items || []).forEach((it) => note(it.id)));
  return ids;
}

/* Load every exam stored progress refers to, so a resumed session, a saved
 * question or a past attempt resolves after a reload. */
export function loadReferencedExams(progress) {
  const ids = {};
  const note = (id) => { if (id && examById[id]) ids[id] = true; };
  if (progress.session) note(progress.session.examId);
  (progress.history || []).forEach((h) => note(h.examId));
  (progress.saved || []).forEach((qid) => note(String(qid).split("-")[0]));
  const pending = Object.keys(ids).filter((id) => !examById[id].questions);
  return Promise.all(pending.map((id) => loadExam(id).catch(() => null))).then(() => {
    if (missingReferencedIds(progress).length) return loadArchive().catch(() => null);
  });
}

/* ------------------------------------------------------------ storage */
export const LS = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* full or blocked */ }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch (e) { /* blocked */ }
  },
};

/* The signed-in server row is the source of truth; localStorage is a cache
 * so the app works offline and before the first fetch. */
export const CACHE_KEY = "ccarf.progress";
export const BACKUP_KEY = "ccarf.backup";
const LEGACY_KEYS = ["ccarf.history", "ccarf.weak", "ccarf.correctEver", "ccarf.session"];

export function progressSize(state) {
  const s = L.normalizeProgress(state);
  return s.history.length + s.weak.length + s.correctEver.length + (s.session ? 1 : 0);
}

function readCache() {
  const cached = LS.get(CACHE_KEY, null);
  const legacy = L.normalizeProgress({
    history: LS.get("ccarf.history", []),
    weak: LS.get("ccarf.weak", []),
    correctEver: LS.get("ccarf.correctEver", []),
    session: LS.get("ccarf.session", null),
  });
  if (progressSize(legacy)) {
    /* Migrated work has never reached the server: flag it unsynced or the
     * next sync would treat the server copy as authoritative. */
    LS.set("ccarf.unsynced", true);
    if (progressSize(LS.get(BACKUP_KEY, null)) < progressSize(legacy)) LS.set(BACKUP_KEY, legacy);
    LEGACY_KEYS.forEach((k) => LS.remove(k));
    LS.remove("ccarf.syncUpdatedAt");
    const merged = cached ? L.mergeProgress(cached, legacy) : legacy;
    LS.set(CACHE_KEY, merged);
    return merged;
  }
  return cached ? L.normalizeProgress(cached) : L.emptyProgress();
}

export const Store = L.createStore({
  initial: readCache(),
  save: (state) => LS.set(CACHE_KEY, state),
  emit: () => {
    try { window.dispatchEvent(new CustomEvent("ccarf:changed")); } catch (e) { /* no window */ }
  },
  readFlag: () => LS.get("ccarf.unsynced", false) === true,
  writeFlag: (dirty) => LS.set("ccarf.unsynced", dirty),
});

/* sync.js picks the store up from here. */
L.CCARF_STORE = Store;

export const Mutations = L.Mutations;
export const DOMAIN_NAMES = L.DOMAIN_NAMES;
export const SUBDOMAINS = L.SUBDOMAINS;
export const PASS_SCORE = L.PASS_SCORE;

/* Screen-reader announcements through one fixed live region outside the
 * React tree. Repeating the same words adds a no-break space so the region
 * still changes and is read again. */
export function announce(text) {
  const el = typeof document !== "undefined" && document.getElementById("sr-live");
  if (!el) return;
  el.textContent = el.textContent === text ? text + " " : text;
}

export function fmtTime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => (n < 10 ? "0" : "") + n;
  return (h ? h + ":" + pad(m) : m) + ":" + pad(sec);
}

export function answeredCount(sess) {
  const answers = (sess && sess.answers) || {};
  return Object.keys(answers).filter((k) => {
    const a = answers[k];
    return a !== null && a !== undefined && !(Array.isArray(a) && !a.length);
  }).length;
}

/* A stored session is only offered for resume if it still lines up with the
 * loaded bank. */
export function isUsableSession(sess) {
  return !!(sess && Array.isArray(sess.questions) && sess.questions.some((s) => s && byId[s.id]));
}

export function bestAttemptFor(examId, history) {
  let best = null;
  (history || []).forEach((h) => {
    if (h.examId === examId && (!best || h.score > best.score)) best = h;
  });
  return best;
}

export function timeAgo(ms) {
  const secs = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return mins + " minute" + (mins === 1 ? "" : "s") + " ago";
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours + " hour" + (hours === 1 ? "" : "s") + " ago";
  return new Date(ms).toLocaleString();
}

export const plural = (n, word) => n + " " + word + (n === 1 ? "" : "s");
