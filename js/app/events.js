/* DOM app — navigation, keyboard shortcuts, right-click strike-through, click
 * dispatch, auth events and boot. Must load last: boot renders the home
 * screen using every other js/app file. */

"use strict";

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
  if (ev.key === "Escape") closeMenus(null);
  if (busyAction || !inQuestionScreen() || ev.metaKey || ev.ctrlKey || ev.altKey) return;
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

/* The Other exams menu is a <details>; close it on Escape or a click
 * anywhere outside it, like a normal dropdown. */
function closeMenus(except) {
  if (!document.querySelectorAll) return;
  Array.prototype.forEach.call(document.querySelectorAll("details.h-menu[open]"), function (d) {
    if (d !== except) d.open = false;
  });
}
document.addEventListener("click", function (ev) {
  closeMenus(ev.target && ev.target.closest ? ev.target.closest("details.h-menu") : null);
}, true);

/* Right-click an option to strike it through, and right-click it again to
 * undo — like the real exam, no menu in between. */
app.addEventListener("contextmenu", function (ev) {
  if (!session || !canStrike(session.mode) || view !== "quiz") return;
  var opt = ev.target.closest && ev.target.closest(".option[data-opt]");
  if (!opt) return;
  ev.preventDefault();
  if (busyAction) return;
  toggleStrike(Number(opt.dataset.opt));
});

/* Actions that build a new screen: drawing questions, grading, or fetching
 * an imported exam. They can take a moment, so the clicked button shows it
 * is working and every other click is ignored until the action finishes
 * (or its load settles) — no double starts, no clicks landing on the
 * screen that replaces this one. */
var SLOW_ACTIONS = {
  "start-exam": 1, "start-imported": 1, "practice-imported": 1, "start-weak": 1, "practice": 1,
  "resume": 1, "finish-saved": 1, "start-custom": 1, "start-saved": 1, "start-scenario-exam": 1,
  "practice-scenario": 1, "start-review": 1, "start-diagnostic": 1, "drill-objective": 1,
  "practice-missed": 1, "retry-failed": 1, "review-attempt": 1, "submit": 1, "show-review": 1,
  "review-all": 1, "back-results": 1, "custom-builder": 1, "practice-search": 1,
};
var busyAction = null;

function setBusy(btn, on) {
  if (on) app.dataset.busy = "true"; else delete app.dataset.busy;
  if (!btn || !btn.classList) return;
  if (on) { btn.classList.add("is-busy"); btn.setAttribute("aria-busy", "true"); }
  else { btn.classList.remove("is-busy"); btn.removeAttribute("aria-busy"); }
}

/* Two frames: the first lets the browser paint the busy mark, the second
 * runs the work. Without requestAnimationFrame (tests) it runs at once. */
function afterPaint(fn) {
  var raf = window.requestAnimationFrame;
  if (typeof raf !== "function") return fn();
  raf(function () { raf(fn); });
}

function runSlow(btn) {
  busyAction = btn;
  setBusy(btn, true);
  var done = function () {
    if (busyAction !== btn) return;
    busyAction = null;
    setBusy(btn, false);
  };
  afterPaint(function () {
    var result;
    try {
      result = handleAction(btn);
    } catch (err) {
      done();
      throw err;
    }
    if (result && typeof result.then === "function") result.then(done, done);
    else done();
  });
}

/* The file picked for "Import from file…". */
app.addEventListener("change", function (ev) {
  var input = ev.target;
  if (!input || input.id !== "import-file" || !input.files || !input.files[0]) return;
  var file = input.files[0];
  input.value = ""; // picking the same file again still fires
  file.text().then(importProgressText, function () { alert("That file could not be read."); });
});

function importProgressText(text) {
  var got = parseProgressFile(text);
  if (got.error) { alert(got.error); return; }
  var p = got.progress;
  if (!confirm("Add this backup to your progress? It has " + p.history.length + " exam attempt" +
      (p.history.length === 1 ? "" : "s") + " and " + p.attempted.length + " questions tried. Nothing here is removed.")) return;
  Store.mutate(Mutations.restore(p));
  if (window.CCARF_SYNC && window.CCARF_SYNC.syncNow) window.CCARF_SYNC.syncNow();
  if (view === "home") renderHome();
}

/* Hands the browser a file to save. */
function downloadText(name, text) {
  if (typeof Blob === "undefined" || !window.URL || !URL.createObjectURL) return;
  var url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  var a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

/* The search box: results follow as the user types. */
app.addEventListener("input", function (ev) {
  if (view === "search" && ev.target && ev.target.id === "search-q") updateSearch(ev.target.value);
});

/* Remember sections the user opens or closes so redraws keep them that way.
 * "toggle" doesn't bubble, hence the capture listener. */
app.addEventListener("toggle", function (ev) {
  var el = ev.target;
  if (el && el.tagName === "DETAILS" && el.id) foldState[el.id] = el.open;
}, true);

app.addEventListener("click", function (ev) {
  var btn = ev.target.closest("[data-action]");
  if (!btn || btn.disabled) return;
  if (busyAction) { if (ev.preventDefault) ev.preventDefault(); return; }
  if (SLOW_ACTIONS[btn.dataset.action]) return runSlow(btn);
  return handleAction(btn);
});

function handleAction(btn) {
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
    case "search": return renderSearch();
    case "practice-search": return startSearchPractice(btn.dataset.pool);
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
      if (got && !isValidDate(got)) { alert("Please enter a real date as YYYY-MM-DD, e.g. 2026-12-14."); return; }
      Store.mutate(Mutations.setExamDate(got || null));
      return renderHome();
    }
    case "open-section": {
      closeMenus(null);
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
      clockOn(null);
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
    case "export-progress":
      return downloadText("ccarf-progress-" + new Date().toISOString().slice(0, 10) + ".json",
        progressFile(Store.snapshot(), Date.now()));
    case "import-progress": {
      var picker = document.getElementById("import-file");
      if (picker && picker.click) picker.click();
      return;
    }
    case "sync-now":
      window.CCARF_SYNC.syncNow();
      return;
  }
}

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

/* Closing or reloading the tab mid-exam asks first. The session is saved
 * either way, but the exam clock keeps running while the tab is closed. */
window.addEventListener("beforeunload", function (ev) {
  if (!session || !session.deadline || (view !== "quiz" && view !== "scenario-review")) return;
  clockOn(null);
  persistSession();
  ev.preventDefault();
  ev.returnValue = "";
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
