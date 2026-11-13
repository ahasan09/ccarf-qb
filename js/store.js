/* Progress store and cross-device sync engine. The store applies
 * mutations to the progress state and persists it; the sync engine pushes
 * and pulls them (sync.js wires it to the server). No DOM access. */

"use strict";

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
          /* Only questions actually answered: a skipped one is graded
           * wrong, but it was not a first try. */
          if (opts && typeof opts.at === "number") {
            var given = opts.answered ? indexIds(opts.answered) : null;
            var note = function (right) {
              return function (id) { if (!given || given[id]) s.results = noteResult(s.results, id, right, opts.at); };
            };
            (grade.correctIds || []).forEach(note(true));
            (grade.wrongIds || []).forEach(note(false));
          }
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
          if (updates[id] === null) delete s.review[id];
          else if (updates[id] && !(cur && cur.updatedAt > updates[id].updatedAt)) s.review[id] = updates[id];
        });
      },
    };
  },
  /* The day is fixed when the answer is given, so a replay lands on the
   * same day; adding ids to a set is safe to repeat. */
  recordActivity: function (day, ids) {
    return {
      key: null,
      apply: function (s) {
        if (!ids || !ids.length) return;
        s.activity = s.activity || {};
        s.activity[day] = unionIds(s.activity[day] || [], ids);
        s.activity = pruneActivity(s.activity, day);
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
  /* Fold a rescued copy of progress back in (a device backup or an
   * imported file). Only adds: nothing already here is removed, and the
   * newer schedule wins per question. */
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
        s.review = mergeReview(s.review, backup && backup.review);
        s.activity = mergeActivity(s.activity, backup && backup.activity);
        s.results = merged.results;
        if (!s.examDate && merged.examDate) s.examDate = merged.examDate;
        if (!s.session && merged.session) s.session = merged.session;
      },
    };
  },
  /* Credit a single answer as soon as it is graded, so leaving a long
   * practice run part-way still keeps what was earned. */
  recordAnswer: function (questionId, wasCorrect, at) {
    return {
      key: null,
      apply: function (s) {
        s.attempted = unionIds(s.attempted, [questionId]);
        if (typeof at === "number") s.results = noteResult(s.results, questionId, wasCorrect, at);
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
