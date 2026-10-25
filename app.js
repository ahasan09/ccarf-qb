/* CCAR-F Question Bank — quiz engine.
 * Pure logic first (exported for Node tests), DOM app below. */

"use strict";

var EXAM_DRAW_COUNTS = { 1: 16, 2: 11, 3: 12, 4: 12, 5: 9 };
var EXPECTED_BANK_SIZE = 837; // kept honest by test/validate-bank.mjs
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

function gradeSession(questions, answers) {
  var result = { correct: 0, total: questions.length, perDomain: {}, wrongIds: [], correctIds: [] };
  questions.forEach(function (q) {
    var d = result.perDomain[q.domain] || (result.perDomain[q.domain] = { correct: 0, total: 0 });
    d.total++;
    if (answers[q.id] === q.answer) {
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

function sampleQuiz(bank, domains, count, rng) {
  var pool = bank.filter(function (q) { return domains.indexOf(q.domain) !== -1; });
  return shuffle(pool, rng).slice(0, Math.min(count, pool.length));
}

function masteryByDomain(bank, correctEverIds) {
  var correct = {};
  correctEverIds.forEach(function (id) { correct[id] = true; });
  var result = {};
  bank.forEach(function (q) {
    var d = result[q.domain] || (result[q.domain] = { correct: 0, total: 0 });
    d.total++;
    if (correct[q.id]) d.correct++;
  });
  return result;
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
    if (!Array.isArray(q.options) || q.options.length !== 4)
      errors.push(id + ": must have exactly 4 options");
    else if (q.options.some(function (o) { return !o || !String(o).trim(); }))
      errors.push(id + ": blank option");
    if (!Number.isInteger(q.answer) || q.answer < 0 || !q.options || q.answer >= q.options.length)
      errors.push(id + ": answer index out of range");
    if (!q.explanation || !String(q.explanation).trim()) errors.push(id + ": empty explanation");
  });
  return errors;
}

/* Node test export guard */
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    EXAM_DRAW_COUNTS: EXAM_DRAW_COUNTS,
    EXPECTED_BANK_SIZE: EXPECTED_BANK_SIZE,
    PASS_SCORE: PASS_SCORE,
    EXAM_DURATION_MS: EXAM_DURATION_MS,
    DOMAIN_NAMES: DOMAIN_NAMES,
    shuffle: shuffle,
    drawExam: drawExam,
    scaledScore: scaledScore,
    gradeSession: gradeSession,
    updateWeakSet: updateWeakSet,
    validateBank: validateBank,
    sampleQuiz: sampleQuiz,
    masteryByDomain: masteryByDomain,
  };
}

/* ---------------------------------------------------------------- DOM app */
if (typeof document !== "undefined") {
  (function () {
    var BANK = window.QUESTION_BANK || [];
    var byId = {};
    BANK.forEach(function (q) { byId[q.id] = q; });

    var SYNC_KEYS = ["ccarf.history", "ccarf.weak", "ccarf.correctEver", "ccarf.session"];

    function noteChange(key) {
      if (SYNC_KEYS.indexOf(key) === -1) return;
      try { localStorage.setItem("ccarf.syncUpdatedAt", String(Date.now())); } catch (e) {}
      try { window.dispatchEvent(new CustomEvent("ccarf:changed")); } catch (e) {}
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
        noteChange(key);
      },
      remove: function (key) {
        try { localStorage.removeItem(key); } catch (e) {}
        noteChange(key);
      },
    };

    var app = document.getElementById("app");
    var timerHandle = null;
    var session = null; // active session object
    var pendingEmail = null; // login code sent, awaiting verification

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
      var weak = LS.get("ccarf.weak", []);
      var history = LS.get("ccarf.history", []);
      var saved = LS.get("ccarf.session", null);

      var S = window.CCARF_SYNC;
      var acctChip = "";
      if (S && S.enabled) {
        acctChip = S.user()
          ? '<span class="signed-chip" title="Progress syncs to this account"><span class="dot">●</span> ' + esc(S.user().email || "signed in") + "</span>"
          : '<a class="btn ghost small" href="#acct">Sign in</a>';
      }

      var html = "";
      if (BANK.length !== EXPECTED_BANK_SIZE) {
        html += '<div class="card load-warning">⚠ Only ' + BANK.length + " of " + EXPECTED_BANK_SIZE +
          " questions loaded — part of the bank failed to download. " +
          '<a href="javascript:location.reload(true)">Refresh</a> before starting a session.</div>';
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
        '<div class="facts"><span><b>' + BANK.length + "</b> questions</span><span><b>5</b> domains</span>" +
        "<span><b>30</b> subdomains</span></div></div>" +
        '<div class="hero-cta">' +
        '<button class="btn primary" data-action="start-exam">Start mock exam</button>' +
        (saved ? '<button class="btn" data-action="resume">Resume session</button>' : "") +
        '<span class="sub">60 questions · 120 min · pass 720/1000</span>' +
        "</div></header>";

      if (saved) {
        html += '<div class="card resume-card"><div><strong>' +
          (MODE_NAMES[saved.mode] || "Session") + " in progress</strong>" +
          "<p>" + Object.keys(saved.answers).filter(function (k) { return saved.answers[k] !== null; }).length +
          "/" + saved.questions.length + " answered</p></div>" +
          '<div class="row"><button class="btn primary" data-action="resume">Resume</button>' +
          '<button class="btn ghost" data-action="discard">Discard</button></div></div>';
      }

      html += '<div class="grid">';
      html += '<div class="card"><h2>Drill weak questions</h2><p>' +
        (weak.length
          ? weak.length + " question" + (weak.length === 1 ? "" : "s") + " you previously missed. Answer correctly to clear them."
          : "Nothing here yet — questions you miss will collect here.") + "</p>" +
        '<button class="btn" data-action="start-weak"' + (weak.length ? "" : " disabled") + ">Drill " + (weak.length || "") + "</button></div>";
      html += '<div class="card"><h2>Custom quiz</h2><p>Pick domains, length, and timing — e.g. a quick 20-question timed round on your weakest domain.</p>' +
        '<button class="btn" data-action="custom-builder">Build quiz</button></div>';
      html += "</div>";

      var correctEver = LS.get("ccarf.correctEver", []);
      var mastery = masteryByDomain(BANK, correctEver);
      html += '<div class="card"><h2>Mastery</h2><p class="muted">Share of the bank you have ever answered correctly.</p>';
      for (var md = 1; md <= 5; md++) {
        var m = mastery[md] || { correct: 0, total: 0 };
        var pct = m.total ? Math.round((m.correct / m.total) * 100) : 0;
        html += '<div class="domain-score"><div class="domain-score-label">' +
          '<span class="domain-chip chip-d' + md + '">D' + md + "</span><span>" + esc(DOMAIN_NAMES[md]) + "</span>" +
          '<span class="muted">' + m.correct + "/" + m.total + " · " + pct + "%</span></div>" +
          '<div class="bar"><div class="bar-fill ' + (pct >= 72 ? "ok" : "bad") + '" style="width:' + pct + '%"></div></div></div>';
      }
      html += "</div>";

      html += '<div class="card"><h2>Practice by domain</h2><div class="domain-list">';
      for (var d = 1; d <= 5; d++) {
        var count = BANK.filter(function (q) { return q.domain === d; }).length;
        html += '<button class="domain-row" data-action="practice" data-domain="' + d + '">' +
          '<span class="domain-chip chip-d' + d + '">D' + d + "</span>" +
          "<span>" + esc(DOMAIN_NAMES[d]) + "</span>" +
          '<span class="muted">' + count + " questions · untimed · instant feedback</span></button>";
      }
      html += "</div></div>";

      html += accountCard();

      html += '<div class="card"><h2>Score history</h2>';
      if (!history.length) {
        html += '<p class="muted">No exams taken yet. Your attempts will appear here.</p>';
      } else {
        html += '<table class="history"><thead><tr><th>Date</th><th>Score</th><th>Result</th><th>Correct</th>' +
          "<th>D1</th><th>D2</th><th>D3</th><th>D4</th><th>D5</th></tr></thead><tbody>";
        history.slice().reverse().forEach(function (h) {
          var cells = "";
          for (var d2 = 1; d2 <= 5; d2++) {
            var pd = h.perDomain[d2];
            cells += "<td>" + (pd ? pd.correct + "/" + pd.total : "–") + "</td>";
          }
          html += "<tr><td>" + esc(new Date(h.date).toLocaleString()) + "</td>" +
            "<td><strong>" + h.score + "</strong></td>" +
            '<td><span class="badge ' + (h.pass ? "pass" : "fail") + '">' + (h.pass ? "PASS" : "FAIL") + "</span></td>" +
            "<td>" + h.correct + "/" + h.total + "</td>" + cells + "</tr>";
        });
        html += "</tbody></table>" +
          '<button class="btn ghost small" data-action="clear-history">Clear history</button>';
      }
      html += "</div>";

      html += '<footer class="site-footer">Practice material for personal study. ' +
        "Not affiliated with Anthropic or Pearson VUE.</footer>";

      app.innerHTML = html;
    }

    function accountCard() {
      var S = window.CCARF_SYNC;
      var html = '<div class="card" id="acct"><h2>Account &amp; sync</h2>';
      if (!S || !S.enabled) {
        html += '<p class="muted auth-note">Progress is stored in this browser. To sign in and sync across devices, ' +
          "enable sync in <code>config.js</code> (see the README).</p>";
      } else if (S.user()) {
        var st = S.status();
        html += "<p>Signed in as <strong>" + esc(S.user().email || "account") + "</strong> " +
          '<span class="muted">· ' + (st === "synced" ? "progress synced" : st === "syncing" ? "syncing…" : st === "error" ? "sync error — will retry on next change" : "sync ready") + "</span></p>" +
          '<div class="row"><button class="btn small" data-action="sync-now">Sync now</button>' +
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
      return html + "</div>";
    }

    /* --------------------------------------------------------- sessions */
    function newSession(mode, questions, durationMs) {
      var now = Date.now();
      return {
        mode: mode, // 'exam' | 'retry' | 'weak' | 'practice' | 'custom'
        questions: questions.map(function (q) {
          return { id: q.id, order: shuffle([0, 1, 2, 3]) };
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
      if (session) LS.set("ccarf.session", session);
    }

    var MODE_NAMES = {
      exam: "Mock exam", retry: "Retry failed", weak: "Weak drill",
      practice: "Practice", custom: "Custom quiz",
    };

    function okToReplaceSaved() {
      return !LS.get("ccarf.session", null) ||
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
      persistSession();
      renderQuestion();
      startTimer();
    }

    function renderCustomBuilder() {
      var html = '<div class="quiz-header"><div><strong>Custom quiz</strong></div>' +
        '<button class="btn ghost small" data-action="home">← Home</button></div>';
      html += '<div class="card"><h2>Domains</h2><div class="domain-list">';
      for (var d = 1; d <= 5; d++) {
        var count = BANK.filter(function (q) { return q.domain === d; }).length;
        html += '<label class="domain-row check-row"><input type="checkbox" class="cb-domain" value="' + d + '" checked>' +
          '<span class="domain-chip chip-d' + d + '">D' + d + "</span>" +
          "<span>" + esc(DOMAIN_NAMES[d]) + "</span>" +
          '<span class="muted">' + count + " questions</span></label>";
      }
      html += "</div></div>";
      html += '<div class="card"><div class="row builder-row">' +
        '<label>Questions <select id="cb-count"><option>10</option><option selected>20</option><option>30</option><option>60</option></select></label>' +
        '<label class="check-inline"><input type="checkbox" id="cb-timed"> Timed (2 min per question)</label>' +
        '<button class="btn primary" data-action="start-custom">Start quiz</button>' +
        "</div></div>";
      app.innerHTML = html;
    }

    function startCustom() {
      var domains = Array.prototype.slice
        .call(app.querySelectorAll(".cb-domain:checked"))
        .map(function (el) { return Number(el.value); });
      if (!domains.length) { alert("Pick at least one domain."); return; }
      var count = Number(document.getElementById("cb-count").value);
      var timed = document.getElementById("cb-timed").checked;
      if (!okToReplaceSaved()) return;
      var questions = sampleQuiz(BANK, domains, count);
      session = newSession("custom", questions, timed ? questions.length * 2 * 60 * 1000 : null);
      persistSession();
      renderQuestion();
      startTimer();
    }

    function startRetry(wrongIds) {
      var questions = shuffle(wrongIds.map(function (id) { return byId[id]; }).filter(Boolean));
      session = newSession("retry", questions, false);
      persistSession();
      renderQuestion();
    }

    function startWeak() {
      var weak = LS.get("ccarf.weak", []).map(function (id) { return byId[id]; }).filter(Boolean);
      if (!weak.length || !okToReplaceSaved()) return;
      session = newSession("weak", shuffle(weak), false);
      persistSession();
      renderQuestion();
    }

    function startPractice(domain) {
      if (!okToReplaceSaved()) return;
      var pool = shuffle(BANK.filter(function (q) { return q.domain === domain; }));
      session = newSession("practice", pool, false);
      session.domain = domain;
      persistSession();
      renderQuestion();
    }

    function resumeSession() {
      var saved = LS.get("ccarf.session", null);
      if (!saved) return renderHome();
      session = saved;
      if (session.deadline && Date.now() >= session.deadline) {
        submitSession();
        return;
      }
      renderQuestion();
      startTimer();
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
        case "exam": return "Mock Exam";
        case "retry": return "Retry Failed Questions";
        case "weak": return "Weak Questions Drill";
        case "practice": return "Practice — " + DOMAIN_NAMES[session.domain];
        case "custom": return "Custom Quiz";
      }
    }

    function renderQuestion() {
      var sq = session.questions[session.current];
      var q = byId[sq.id];
      var total = session.questions.length;
      var answered = session.answers[q.id];
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
        '<button class="btn exit small" data-action="quit">Exit ↩</button>' +
        "</div></div>";

      var answeredCount = session.questions.filter(function (s) {
        return session.answers[s.id] !== null;
      }).length;
      html += '<div class="progress"><div class="progress-fill" style="width:' +
        Math.round((answeredCount / total) * 100) + '%"></div></div>';

      if (!isPractice) {
        html += '<div class="navigator">';
        session.questions.forEach(function (s, i) {
          var cls = "nav-cell";
          if (session.answers[s.id] !== null) cls += " answered";
          if (session.flagged[s.id]) cls += " flagged";
          if (i === session.current) cls += " current";
          html += '<button class="' + cls + '" data-action="jump" data-index="' + i + '">' + (i + 1) + "</button>";
        });
        html += "</div>";
      }

      html += '<div class="card question-card">' +
        '<div class="q-meta"><span class="domain-chip chip-d' + q.domain + '">D' + q.domain + "</span>" +
        '<span class="muted">' + esc(DOMAIN_NAMES[q.domain]) + "</span>" +
        (q.subdomain ? '<span class="muted sub-tag">§ ' + esc(q.subdomain) + "</span>" : "") +
        "</div>" +
        '<p class="q-text">' + esc(q.question) + "</p><div class=\"options\">";

      sq.order.forEach(function (optIdx) {
        var cls = "option";
        var disabled = showFeedback ? " disabled" : "";
        if (answered === optIdx) cls += " selected";
        if (showFeedback) {
          if (optIdx === q.answer) cls += " correct";
          else if (answered === optIdx) cls += " wrong";
        }
        html += '<button class="' + cls + '" data-action="select" data-opt="' + optIdx + '"' + disabled + ">" +
          '<span class="opt-letter"></span>' + esc(q.options[optIdx]) + "</button>";
      });
      html += "</div>";

      if (showFeedback) {
        var right = answered === q.answer;
        html += '<div class="feedback ' + (right ? "ok" : "bad") + '">' +
          "<strong>" + (right ? "Correct." : "Incorrect.") + "</strong> " + esc(q.explanation) + "</div>";
      }
      html += "</div>";

      html += '<div class="quiz-footer">' +
        '<button class="btn" data-action="prev"' + (session.current === 0 || isPractice ? " disabled" : "") + ">← Previous</button>" +
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
        html += '<button class="btn primary" data-action="submit">Submit ' +
          (session.mode === "exam" ? "exam" : "answers") + "</button>" +
          '<button class="btn" data-action="next"' + (session.current + 1 >= total ? " disabled" : "") + ">Next →</button>";
      }
      html += "</div></div>";
      html += '<p class="muted kbd-hint"><kbd>1</kbd>–<kbd>4</kbd> answer · <kbd>←</kbd>/<kbd>→</kbd> navigate' +
        (isPractice ? "" : " · <kbd>F</kbd> flag") + "</p>";

      app.innerHTML = html;
      var cur = app.querySelector(".nav-cell.current");
      if (cur && cur.scrollIntoView) cur.scrollIntoView({ inline: "center", block: "nearest" });
    }

    function selectOption(optIdx) {
      var sq = session.questions[session.current];
      if (session.mode === "practice") {
        if (session.feedback === sq.id) return; // already answered
        session.answers[sq.id] = optIdx;
        session.feedback = sq.id;
        var q = byId[sq.id];
        if (optIdx === q.answer) session.tally.correct++;
        else session.tally.wrong++;
        // weak-set bookkeeping happens at session end
      } else {
        session.answers[sq.id] = session.answers[sq.id] === optIdx ? null : optIdx;
      }
      persistSession();
      renderQuestion();
    }

    /* ----------------------------------------------------------- results */
    function submitSession() {
      stopTimer();
      var questions = session.questions.map(function (s) { return byId[s.id]; });
      var grade = gradeSession(questions, session.answers);
      var finished = {
        mode: session.mode,
        domain: session.domain,
        questions: session.questions,
        answers: session.answers,
        grade: grade,
      };

      LS.remove("ccarf.session");
      LS.set("ccarf.weak", updateWeakSet(LS.get("ccarf.weak", []), grade));

      var correctEver = LS.get("ccarf.correctEver", []);
      var everSet = {};
      correctEver.forEach(function (id) { everSet[id] = true; });
      grade.correctIds.forEach(function (id) { everSet[id] = true; });
      LS.set("ccarf.correctEver", Object.keys(everSet));

      if (session.mode === "exam") {
        var score = scaledScore(grade.correct, grade.total);
        var history = LS.get("ccarf.history", []);
        history.push({
          date: new Date().toISOString(),
          score: score,
          pass: score >= PASS_SCORE,
          correct: grade.correct,
          total: grade.total,
          perDomain: grade.perDomain,
        });
        LS.set("ccarf.history", history);
        finished.score = score;
      }

      session = null;
      renderResults(finished);
    }

    function renderResults(finished) {
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

      html += '<div class="card"><h2>By domain</h2>';
      Object.keys(grade.perDomain).sort().forEach(function (d) {
        var pd = grade.perDomain[d];
        var pct = pd.total ? Math.round((pd.correct / pd.total) * 100) : 0;
        html += '<div class="domain-score"><div class="domain-score-label">' +
          '<span class="domain-chip chip-d' + d + '">D' + d + "</span><span>" + esc(DOMAIN_NAMES[d]) + "</span>" +
          '<span class="muted">' + pd.correct + "/" + pd.total + "</span></div>" +
          '<div class="bar"><div class="bar-fill ' + (pct >= 72 ? "ok" : "bad") + '" style="width:' + pct + '%"></div></div></div>';
      });
      html += "</div>";

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
      app.dataset.state = "";
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

    var lastFinished = null;
    var reviewWrongOnly = false;
    var reviewDomain = 0; // 0 = all

    function renderReview() {
      var finished = lastFinished;
      var domainOptions = '<option value="0">All domains</option>';
      for (var rd = 1; rd <= 5; rd++) {
        domainOptions += '<option value="' + rd + '"' + (reviewDomain === rd ? " selected" : "") + ">D" + rd + " — " + esc(DOMAIN_NAMES[rd]) + "</option>";
      }
      var html = '<div class="quiz-header"><div><strong>Review</strong></div><div class="row">' +
        '<select id="review-domain" class="select">' + domainOptions + "</select>" +
        '<button class="btn small ' + (reviewWrongOnly ? "" : "ghost") + '" data-action="toggle-wrong-only">' +
        (reviewWrongOnly ? "Showing wrong only" : "Show wrong only") + "</button>" +
        '<button class="btn ghost small" data-action="back-results">Back to results</button></div></div>';

      var shown = 0;
      finished.questions.forEach(function (s, i) {
        var q = byId[s.id];
        var given = finished.answers[q.id];
        var right = given === q.answer;
        if (reviewWrongOnly && right) return;
        if (reviewDomain && q.domain !== reviewDomain) return;
        shown++;
        html += '<div class="card review-card ' + (right ? "r-ok" : "r-bad") + '">' +
          '<div class="q-meta"><strong>Q' + (i + 1) + "</strong>" +
          '<span class="domain-chip chip-d' + q.domain + '">D' + q.domain + "</span>" +
          (q.subdomain ? '<span class="muted sub-tag">§ ' + esc(q.subdomain) + "</span>" : "") +
          '<span class="badge ' + (right ? "pass" : "fail") + '">' + (right ? "Correct" : given === null ? "Unanswered" : "Wrong") + "</span></div>" +
          '<p class="q-text">' + esc(q.question) + "</p><div class=\"options\">";
        s.order.forEach(function (optIdx) {
          var cls = "option readonly";
          if (optIdx === q.answer) cls += " correct";
          if (given === optIdx && given !== q.answer) cls += " wrong";
          html += '<div class="' + cls + '">' + esc(q.options[optIdx]) +
            (optIdx === q.answer ? ' <span class="tag">correct answer</span>' : "") +
            (given === optIdx && given !== q.answer ? ' <span class="tag">your answer</span>' : "") +
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
      if (ev.key === "ArrowRight" || ev.key === "Enter") { ev.preventDefault(); return goNext(); }
      if (key === "f") return toggleFlag();
    });

    app.addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-action]");
      if (!btn || btn.disabled) return;
      var action = btn.dataset.action;

      switch (action) {
        case "start-exam": return startExam();
        case "start-weak": return startWeak();
        case "practice": return startPractice(Number(btn.dataset.domain));
        case "resume": return resumeSession();
        case "discard":
          if (!confirm("Discard this in-progress session? This cannot be undone.")) return;
          LS.remove("ccarf.session");
          return renderHome();
        case "clear-history":
          if (confirm("Delete all score history?")) { LS.remove("ccarf.history"); renderHome(); }
          return;
        case "custom-builder": return renderCustomBuilder();
        case "start-custom": return startCustom();
        case "select": return selectOption(Number(btn.dataset.opt));
        case "prev": return goPrev();
        case "next": return goNext();
        case "jump":
          session.current = Number(btn.dataset.index); persistSession(); return renderQuestion();
        case "toggle-flag": return toggleFlag();
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
        case "toggle-wrong-only": reviewWrongOnly = !reviewWrongOnly; return renderReview();
        case "back-results": return renderResults(lastFinished);
        case "home": return renderHome();
        case "cycle-theme": cycleTheme(); return renderHome();
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
          window.CCARF_SYNC.signOut();
          return;
        case "sync-now":
          window.CCARF_SYNC.syncNow();
          return;
      }
    });

    window.addEventListener("ccarf:auth", function () {
      if (!session) renderHome();
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
    }
  })();
}
