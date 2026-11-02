/* DOM app — navigation, keyboard shortcuts, the context menu, click
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
  if (ev.key === "Escape") { hideCtxMenu(); closeMenus(null); }
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
