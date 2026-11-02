/* DOM app — the question screens (standard and scenario layout), answering
 * and submitting a session. */

"use strict";

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
    '<aside class="scn-panel"><details open><summary><span>' + esc(scn.name) + "</span>" + chev() + "</summary>" +
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
