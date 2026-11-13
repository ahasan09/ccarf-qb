/* DOM app — the question screens (standard and scenario layout), answering
 * and submitting a session. */

"use strict";

/* The real exam's layout: the scenario stays put on the left while its
 * questions change on the right. */
function renderScenarioQuestion() {
  view = "quiz";
  var sq = session.questions[session.current];
  clockOn(sq.id);
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

  var shortWhere = (isPractice ? "" : "<b>S" + (block + 1) + "</b> · ") + (session.current + 1) + " / " + total;
  foldBriefOnPhone(q);
  var html = '<div class="q-screen scn-screen">';
  html += '<div class="scn-top">' + whereLine(sessionTitle(), where, shortWhere) +
    '<div class="row">' +
    timerHtml() +
    (isPractice
      ? '<span class="tally"><span class="pill ok">✓ ' + session.tally.correct + '</span><span class="pill bad">✗ ' + session.tally.wrong + "</span></span>"
      : barButton("comment", "comment", comment ? "Edit comment" : "Comment")) +
    barButton("toggle-flag", "flag", session.flagged[q.id] ? "Flagged" : "Flag for review", session.flagged[q.id] ? " flag-on" : "") +
    exitButton() +
    "</div></div>";

  html += '<div class="scn-body">' +
    '<aside class="scn-panel"><details' + foldAttrs("scn-brief", true) + '><summary><span>' + esc(scn.name) + "</span>" + chev() + "</summary>" +
    '<div class="scn-text">' + esc(scn.text) + "</div></details></aside>";

  html += '<section class="scn-question">' +
    '<p class="q-text">' + esc(q.question) + "</p>" +
    '<div class="options" role="radiogroup">';
  sq.order.forEach(function (optIdx) {
    var cls = "option";
    var picked = chosen.indexOf(optIdx) !== -1;
    if (picked) cls += " selected";
    var isStruck = struck.indexOf(optIdx) !== -1;
    if (isStruck) cls += " struck";
    if (showFeedback) {
      if (correct.indexOf(optIdx) !== -1) cls += " correct";
      else if (picked) cls += " wrong";
    }
    html += '<div class="opt-wrap"><div class="opt-row"><button class="' + cls + '" role="radio" aria-checked="' + picked +
      '" data-action="select" data-opt="' + optIdx + '"' + (showFeedback ? " disabled" : "") + ">" +
      '<span class="opt-letter"></span>' + esc(q.options[optIdx]) +
      (showFeedback ? optionTags(correct.indexOf(optIdx) !== -1, picked) : "") +
      (isStruck ? '<span class="sr-only"> (struck through)</span>' : "") + "</button>" +
      strikeButton(optIdx, sq.order.indexOf(optIdx), isStruck) + "</div>";
    if (showFeedback && q.optionNotes) {
      html += '<div class="opt-note ' + (correct.indexOf(optIdx) !== -1 ? "ok" : "bad") + '">' +
        esc(q.optionNotes[optIdx]) + "</div>";
    }
    html += "</div>";
  });
  html += "</div>";
  if (showFeedback) {
    var right = sameChoice(session.answers[q.id], correct);
    html += '<div class="feedback ' + (right ? "ok" : "bad") + '"><strong>' +
      (right ? "Correct." : "Incorrect.") + "</strong> " + esc(q.explanation) + "</div>" + reportLink(q);
  }
  if (comment) html += '<p class="scn-comment muted">💬 ' + esc(comment) + "</p>";
  html += '<p class="muted scn-hint">Right-click an option to strike it through; right-click again to undo.</p>';
  html += "</section></div>";

  html += '<div class="scn-bottom">' +
    (isPractice ? "<span></span>" : prevButton());
  if (isPractice) {
    html += showFeedback
      ? (session.current + 1 < total
        ? '<button class="btn primary" data-action="next">Next →</button>'
        : '<button class="btn primary" data-action="submit">Finish</button>')
      : '<span class="scn-mid"><span class="muted">Pick an answer to see the notes</span>' + kbdHint(sq.order.length, false, true) + "</span>";
  } else {
    var flaggedCount = Object.keys(session.flagged).filter(function (k) { return session.flagged[k]; }).length;
    html += '<span class="scn-mid"><span class="muted">' +
      twoLabels("Answered " + answeredCount(session) + " of " + total + " · Flagged " + flaggedCount,
        answeredCount(session) + "/" + total + (flaggedCount ? " · ⚑" + flaggedCount : "")) +
      "</span>" + kbdHint(sq.order.length, true, true) + "</span>" +
      '<div class="row"><button class="btn" data-action="review-all">' + twoLabels("Review all", "Review") + "</button>" +
      '<button class="btn primary" data-action="next">' +
      (session.current + 1 >= total ? twoLabels("Review &amp; submit →", "Submit →") : "Next →") + "</button></div>";
  }
  html += "</div></div>";

  paint(html);
  window.scrollTo(0, 0);
}

/* The keyboard shortcuts that work on this screen, for the bottom bar
 * (hidden on touch screens and narrow windows). Keep in step with the
 * keydown handler in events.js. */
function kbdHint(optionCount, canGoBack, canFlag) {
  var last = Math.min(optionCount, 5);
  return '<span class="muted kbd-hint"><kbd>1</kbd>–<kbd>' + last + "</kbd> answer · " +
    (canGoBack ? "<kbd>←</kbd>/<kbd>→</kbd> navigate" : "<kbd>→</kbd> next") +
    (canFlag ? " · <kbd>F</kbd> flag" : "") + "</span>";
}

/* Touch screens have no right-click, so each option gets a small ⊘ button
 * (hidden for a mouse until reached with Tab). */
function strikeButton(optIdx, position, isStruck) {
  return '<button class="strike-btn" data-action="strike" data-opt="' + optIdx + '" aria-pressed="' + isStruck +
    '" aria-label="Strike through option ' + (position + 1) + '">⊘</button>';
}

var reviewFilter = "all";

/* Before submitting: every question as a tile, grouped by scenario, so
 * flagged and unanswered ones are easy to revisit. The clock keeps going. */
function renderScenarioReview() {
  view = "scenario-review";
  clockOn(null);
  var total = session.questions.length;
  var unanswered = session.questions.filter(function (s) { return session.answers[s.id] === null; }).length;
  var flagged = session.questions.filter(function (s) { return session.flagged[s.id]; }).length;
  var html = '<div class="scn-screen"><div class="scn-top"><div><strong>Review your answers</strong>' +
    '<span class="muted"> · ' + (total - unanswered) + " of " + total + " answered</span></div>" +
    '<div class="row">' +
    timerHtml() +
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
  paint(html);
  window.scrollTo(0, 0);
}

/* Which question was last announced, so a redraw of the same one (a
 * pick, a flag) stays quiet and only moving to another is read out. */
var announcedQuestion = null;
function announceQuestion() {
  var key = session.startedAt + ":" + session.current;
  if (key === announcedQuestion) return;
  announcedQuestion = key;
  announce("Question " + (session.current + 1) + " of " + session.questions.length);
}

/* "Correct answer" / "Your answer" written on the options once graded, as
 * on the review screen, so the result does not rest on colour alone. */
function optionTags(isCorrect, picked) {
  return (isCorrect ? ' <span class="tag">correct answer</span>' : "") +
    (picked && !isCorrect ? ' <span class="tag">your answer</span>' : "");
}

/* ------------------------------------------------- question top bar */
/* On a phone the top bar is one line: a short counter, the timer and icon
 * buttons. The words (.lbl-long) show on wider screens; aria-label keeps
 * each button's full name for screen readers either way. */
function barButton(action, iconName, label, extraClass) {
  return '<button class="btn ghost small qbtn' + (extraClass || "") + '" data-action="' + action + '" aria-label="' + esc(label) +
    '" title="' + esc(label) + '">' + icon(iconName) + '<span class="lbl-long">' + esc(label) + "</span></button>";
}
function exitButton() {
  return '<button class="btn exit small qbtn" data-action="quit" aria-label="Exit" title="Exit">' + icon("exit") +
    '<span class="lbl-long">Exit</span></button>';
}
function saveButton(qid) {
  var saved = Store.snapshot().saved.indexOf(qid) !== -1;
  return barButton("toggle-saved", "star", saved ? "Saved" : "Save", saved ? " saved-on" : "");
}
/* Bottom bar pieces: words on wide screens, short forms on phones. */
function prevButton() {
  return '<button class="btn qprev" data-action="prev" aria-label="Previous question"' + (session.current === 0 ? " disabled" : "") +
    '>←<span class="lbl-long"> Previous</span></button>';
}
function twoLabels(long, short) {
  return '<span class="lbl-long">' + long + '</span><span class="lbl-short">' + short + "</span>";
}

/* Long title for wide screens, a short counter for phones. */
function whereLine(title, longWhere, shortWhere) {
  return '<div class="q-where"><strong class="lbl-long">' + esc(title) + '</strong><span class="muted lbl-long"> · ' + longWhere +
    '</span><span class="lbl-short">' + shortWhere + "</span></div>";
}

/* On a phone the scenario text sits above the question; it is shown in full
 * on the first question of each scenario and folded to its name after
 * that (one tap opens it). Wide screens keep it open beside the question. */
var briefShownFor = null;
function isNarrow() {
  return !!(window.matchMedia && window.matchMedia("(max-width: 680px)").matches);
}
function foldBriefOnPhone(q) {
  var key = session.startedAt + ":" + session.current;
  if (key === briefShownFor) return;
  briefShownFor = key;
  if (!isNarrow()) return;
  var prev = session.current > 0 ? byId[session.questions[session.current - 1].id] : null;
  foldState["scn-brief"] = !prev || prev.scenario !== q.scenario;
}

function renderQuestion() {
  announceQuestion();
  if (isScenarioMode(session.mode)) return renderScenarioQuestion();
  view = "quiz";
  var sq = session.questions[session.current];
  clockOn(sq.id);
  var q = byId[sq.id];
  var total = session.questions.length;
  var answered = session.answers[q.id];
  var correct = correctIndices(q);
  var multi = correct.length > 1;
  var chosen = chosenIndices(answered);
  var isPractice = session.mode === "practice";
  var showFeedback = isPractice && session.feedback === q.id;

  /* .q-screen is at least the window's height: the question area grows to
   * fill it and the action bar stays pinned to the bottom edge. */
  var html = '<div class="q-screen quiz-screen"><div class="quiz-header">' +
    whereLine(sessionTitle(), "Question " + (session.current + 1) + " of " + total, (session.current + 1) + " / " + total) +
    '<div class="row">' +
    timerHtml() +
    (isPractice
      ? '<span class="tally"><span class="pill ok">✓ ' + session.tally.correct + '</span><span class="pill bad">✗ ' + session.tally.wrong + "</span></span>"
      : barButton("toggle-flag", "flag", session.flagged[q.id] ? "Flagged" : "Flag for review", session.flagged[q.id] ? " flag-on" : "")) +
    saveButton(q.id) +
    exitButton() +
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

  var strikeOn = canStrike(session.mode);
  var struck = (session.strikes && session.strikes[q.id]) || [];
  sq.order.forEach(function (optIdx) {
    var cls = "option";
    var disabled = showFeedback ? " disabled" : "";
    var picked = chosen.indexOf(optIdx) !== -1;
    var isStruck = strikeOn && struck.indexOf(optIdx) !== -1;
    if (picked) cls += " selected";
    if (isStruck) cls += " struck";
    if (showFeedback) {
      if (correct.indexOf(optIdx) !== -1) cls += " correct";
      else if (picked) cls += " wrong";
    }
    var btn = '<button class="' + cls + '" role="' + (multi ? "checkbox" : "radio") +
      '" aria-checked="' + picked +
      '" data-action="select" data-opt="' + optIdx + '"' + disabled + ">" +
      '<span class="opt-letter"></span>' + esc(q.options[optIdx]) +
      (showFeedback ? optionTags(correct.indexOf(optIdx) !== -1, picked) : "") +
      (isStruck ? '<span class="sr-only"> (struck through)</span>' : "") + "</button>";
    html += strikeOn ? '<div class="opt-row">' + btn + strikeButton(optIdx, sq.order.indexOf(optIdx), isStruck) + "</div>" : btn;
  });
  html += "</div>";
  if (strikeOn) html += '<p class="muted scn-hint">Right-click an option to strike it through; right-click again to undo.</p>';

  if (showFeedback) {
    var right = sameChoice(answered, correct);
    html += '<div class="feedback ' + (right ? "ok" : "bad") + '">' +
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
    html += "</div>" + reportLink(q);
  }
  html += "</div>";

  var hint = kbdHint(sq.order.length, !isPractice, !isPractice);
  html += '<div class="quiz-footer">' +
    (isPractice ? "" : prevButton()) +
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
      (allAnswered ? twoLabels("Finish &amp; see results", "Finish")
        : twoLabels(session.mode === "exam" ? "Submit exam" : "Submit answers", "Submit")) + "</button>" +
      '<button class="btn" data-action="next"' + (session.current + 1 >= total ? " disabled" : "") + ">Next →</button>";
  }
  html += "</div></div></div>";

  paint(html);
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
    announce(right ? "Correct." : "Incorrect. The correct answer is " + wanted.map(function (i) {
      return String.fromCharCode(65 + sq.order.indexOf(i)) + ": " + q.options[i];
    }).join("; ") + ". The explanation follows the options.");
    if (right) session.tally.correct++;
    else session.tally.wrong++;
    if (!session.separate && bankIds[q.id]) Store.mutate(Mutations.recordAnswer(q.id, right, Date.now()));
    if (countsAsStudy(q.id)) Store.mutate(Mutations.recordActivity(localDay(Date.now()), [q.id]));
    scheduleReview([{ id: q.id, correct: right }]);
  } else if (isMultiAnswer(byId[sq.id])) {
    session.answers[sq.id] = toggleChoice(session.answers[sq.id], optIdx);
  } else {
    session.answers[sq.id] = session.answers[sq.id] === optIdx ? null : optIdx;
  }
  persistSession();
  renderQuestion();
  /* Once graded the options are disabled, so the clicked one cannot keep
   * focus; move it to the way on, so keyboard users are not sent back to
   * the top of the page. */
  if (session && session.feedback === sq.id && app.querySelector) {
    var on = app.querySelector('[data-action="next"]:not([disabled]), [data-action="submit"]:not([disabled])');
    if (on && on.focus) on.focus({ preventScroll: true });
  }
}

/* ----------------------------------------------------------- results */
function submitSession() {
  stopTimer();
  if (!session) return;
  clockOn(null);
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
    timeSpent: session.timeSpent || {},
    timed: !!session.deadline,
    objective: session.objective || null,
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
        var ms = session.timeSpent && session.timeSpent[s.id];
        if (ms) item.secs = Math.round(ms / 1000);
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
  var answered = Object.keys(session.answers || {}).filter(function (k) {
    var a = session.answers[k];
    return a !== null && a !== undefined && !(Array.isArray(a) && !a.length);
  });
  Store.mutate(Mutations.finishSession(grade, entry, { separate: separate, at: Date.now(), answered: answered }));
  /* Every answered question counts toward today's activity; practice
   * answers were already counted as they were given. */
  Store.mutate(Mutations.recordActivity(localDay(Date.now()), session.questions
    .filter(function (s) { var a = session.answers[s.id]; return a !== null && a !== undefined && !(Array.isArray(a) && !a.length); })
    .map(function (s) { return s.id; })
    .filter(countsAsStudy)));
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
