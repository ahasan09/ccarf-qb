/* DOM app — results, attempt review and stored-attempt replay. */

"use strict";

function renderResults(finished) {
  view = "results";
  var grade = finished.grade;
  var isExam = finished.mode === "exam" || finished.mode === "scenario";
  var isScenario = isScenarioMode(finished.mode);
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

  if (isExam) html += weakSpotsCard(finished);

  if (isScenario) {
    var finishedQs = finished.questions.map(function (s) { return byId[s.id]; }).filter(Boolean);
    var bar = function (row, label, cls) {
      return '<div class="' + cls + '" data-pct="' + row.pct + '"><div class="domain-score-label"><span>' + esc(label) + "</span>" +
        '<span class="muted">' + row.pct + "% · " + row.correct + "/" + row.total + "</span></div>" +
        '<div class="bar"><div class="bar-fill ' + (row.pct >= 72 ? "ok" : "bad") + '" style="width:' + row.pct + '%"></div></div></div>';
    };
    html += '<div class="card"><h2>By objective</h2><p class="muted">Percent correct per exam-guide task statement, weakest first — like the real score report.</p>';
    breakdownBy(finishedQs, finished.answers, function (q) { return q.subdomain; }).forEach(function (row) {
      html += bar(row, row.key, "obj-row");
    });
    html += '</div><div class="card"><h2>By scenario</h2>';
    breakdownBy(finishedQs, finished.answers, function (q) { return q.scenario; }).forEach(function (row) {
      html += bar(row, (scenarioById[row.key] || {}).name || row.key, "scn-row");
    });
    html += "</div>";
  }

  html += paceCard(finished);

  var gradedDomains = isScenario ? [] : Object.keys(grade.perDomain).filter(function (d) {
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
  if (isScenario) {
    /* Missed scenario questions are practised as scenario questions, never
     * sent to the general weak-question drill. */
    if (grade.wrongIds.length) {
      html += '<button class="btn primary" data-action="practice-missed">Practise the ' + grade.wrongIds.length +
        " you missed</button>";
    }
  } else if (grade.wrongIds.length) {
    html += '<button class="btn primary" data-action="retry-failed">Retry ' + grade.wrongIds.length +
      " failed question" + (grade.wrongIds.length === 1 ? "" : "s") + "</button>";
  } else {
    html += '<span class="badge big pass">All correct — nothing to retry 🎉</span>';
  }
  html += moreOnObjective(finished.objective);
  html += '<button class="btn" data-action="show-review">Review answers</button>' +
    '<button class="btn ghost" data-action="home">Home</button></div>';

  paint(html);
  lastFinished = finished;
}

/* Right after an exam's score: its weakest objectives (below the 72% pass
 * level, up to three), each with a Practise button, so the next step is
 * one click away. Exams without objective tags (imported tests) skip it. */
var WEAK_SPOTS = 3;
function weakSpotsCard(finished) {
  var qs = finished.questions.map(function (s) { return byId[s.id]; })
    .filter(function (q) { return q && SUBDOMAINS.indexOf(q.subdomain) >= 0; });
  if (!qs.length) return "";
  var weak = breakdownBy(qs, finished.answers, function (q) { return q.subdomain; })
    .filter(function (r) { return r.pct < 72; }).slice(0, WEAK_SPOTS);
  var html = '<div class="card weak-spots"><h2>Practise your weak spots</h2>';
  if (!weak.length) {
    return html + '<p class="muted">Every objective in this exam was at 72% or above. Keep it up with a full scenario exam.</p></div>';
  }
  html += '<p class="muted">The objectives you scored lowest on in this exam. Each practice set is up to 8 questions with a note on every option.</p>';
  weak.forEach(function (r) {
    html += '<div class="weak-spot"><div><span>' + esc(r.key) + '</span><small class="muted">' + r.correct + " of " + r.total +
      " right · " + r.pct + "%</small></div>" +
      '<button class="btn small primary" data-action="drill-objective" data-sub="' + esc(r.key) + '">Practise →</button></div>';
  });
  return html + "</div>";
}

/* After practising an objective's scenario questions, offer its bank
 * questions as the next step. */
function moreOnObjective(sub) {
  if (!sub) return "";
  var code = sub.split(" ")[0], d = Number(code.split(".")[0]);
  var n = filterBySubKey(BANK, d, code).length;
  return n ? '<button class="btn" data-action="practice" data-domain="' + d + '" data-sub="' + esc(code) + '">' +
    "More on " + esc(code) + " · " + n + " question" + (n === 1 ? "" : "s") + "</button>" : "";
}

/* Timed sessions: average time per question against the even-pace budget,
 * and the objectives that took longest. */
function paceCard(finished) {
  if (!finished.timed) return "";
  var qs = finished.questions.map(function (s) { return byId[s.id]; }).filter(Boolean);
  var pace = paceSummary(qs, finished.timeSpent);
  if (!pace) return "";
  var budgetMs = EXAM_DURATION_MS / 60; // the real exam: 120 minutes for 60 questions
  var html = '<div class="card pace-card"><h2>Time</h2><p>Average <strong>' + fmtTime(pace.avgMs) +
    "</strong> per question" + '<span class="muted"> · the real exam allows about ' + fmtTime(budgetMs) + "</span></p>";
  if (pace.slowest.length) {
    html += '<p class="muted">Slowest objectives:</p><ul class="pace-list">' + pace.slowest.map(function (g) {
      return "<li>" + esc(g.key) + ' <span class="muted">· ' + fmtTime(g.avgMs) + " avg over " + g.n + "</span></li>";
    }).join("") + "</ul>";
  }
  return html + "</div>";
}

function sessionResultLabel(mode) {
  switch (mode) {
    case "retry": return "Retry session — keep going until everything is green";
    case "weak": return "Missed questions";
    case "practice": return "Practice session complete";
    case "custom": return "Custom quiz complete";
    case "scenario-practice": return "Scenario practice complete";
    default: return "";
  }
}

function reviewStoredAttempt(date) {
  var entry = null;
  Store.snapshot().history.forEach(function (h) { if (h.date === date) entry = h; });
  var restored = attemptToFinished(entry);
  if (!restored) {
    notify("That attempt cannot be reviewed — its questions are no longer in the app.");
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
  var finished = {
    mode: entry.kind === "scenario" ? "scenario" : entry.examId ? "imported" : "exam",
    examName: entry.examName || null,
    date: entry.date,
    questions: questions,
    answers: answers,
    grade: grade,
    score: entry.score,
    fromHistory: true,
  };
  if (entry.kind === "scenario") {
    finished.scenarioIds = entry.scenarioIds || [];
    finished.comments = {};
    items.forEach(function (it) { if (it.comment) finished.comments[it.id] = it.comment; });
  }
  return finished;
}

var lastFinished = null;
var reviewWrongOnly = false;
var reviewDomain = 0; // 0 = all

/* One review card; scenario reviews show every option's note under it. */
function reviewCard(s, i, finished) {
  var q = byId[s.id];
  var given = finished.answers[q.id];
  var right = sameChoice(given, correctIndices(q));
  var html = '<div class="card review-card ' + (right ? "r-ok" : "r-bad") + '">' +
    '<div class="q-meta"><strong>Q' + (i + 1) + "</strong>" +
    (q.scenario ? '<span class="muted">' + esc(q.subdomain || "") + "</span>" : questionMeta(q)) +
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
    /* The note goes under its own option, never beside or after another. */
    html += '<div class="opt-wrap"><div class="' + cls + '"><span class="opt-letter"></span><span>' + esc(q.options[optIdx]) +
      (isCorrect ? ' <span class="tag">correct answer</span>' : "") +
      (wasPicked ? ' <span class="tag">your answer</span>' : "") + "</span></div>" +
      (note ? '<div class="opt-note ' + (isCorrect ? "ok" : "bad") + '">' + esc(note) + "</div>" : "") +
      "</div>";
  });
  html += "</div>" + '<div class="feedback ok">' + esc(q.explanation) + "</div>";
  var comment = finished.comments && finished.comments[q.id];
  if (comment) html += '<div class="scn-comment"><strong>Your comment:</strong> ' + esc(comment) + "</div>";
  return html + reportLink(q) + "</div>";
}

function renderScenarioReviewAfter() {
  view = "review";
  var finished = lastFinished;
  var html = '<div class="scn-screen"><div class="scn-top"><div><strong>Review</strong>' +
    (finished.fromHistory
      ? '<span class="muted"> · ' + esc(finished.examName || "Scenario exam") + ", " +
        esc(new Date(finished.date).toLocaleString()) + "</span>"
      : "") +
    '</div><div class="row">' +
    '<button class="btn small ' + (reviewWrongOnly ? "" : "ghost") + '" data-action="toggle-wrong-only">' +
    (reviewWrongOnly ? "Showing wrong only" : "Show wrong only") + "</button>" +
    '<button class="btn ghost small" data-action="' + (finished.fromHistory ? "home" : "back-results") + '">' +
    (finished.fromHistory ? "← Home" : "Back to results") + "</button></div></div>";
  var shown = 0;
  var groups = [];
  finished.questions.forEach(function (s, i) {
    var q = byId[s.id];
    var last = groups[groups.length - 1];
    if (!last || last.scenario !== q.scenario) groups.push(last = { scenario: q.scenario, cards: "" });
    if (reviewWrongOnly && sameChoice(finished.answers[q.id], correctIndices(q))) return;
    shown++;
    last.cards += reviewCard(s, i, finished);
  });
  groups.forEach(function (g) {
    if (!g.cards) return;
    var scn = scenarioById[g.scenario] || { name: g.scenario, text: "" };
    html += '<div class="scn-body">' +
      '<aside class="scn-panel"><details open><summary><span>' + esc(scn.name) + "</span>" + chev() + "</summary>" +
      '<div class="scn-text">' + esc(scn.text) + "</div></details></aside>" +
      '<section class="scn-review-list">' + g.cards + "</section></div>";
  });
  if (!shown) html += '<div class="card"><p class="muted">Nothing matches this filter.</p></div>';
  paint(html + "</div>");
  window.scrollTo(0, 0);
}

function renderReview() {
  if (lastFinished && isScenarioMode(lastFinished.mode)) return renderScenarioReviewAfter();
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
    html += "</div>" + '<div class="feedback ok">' + esc(q.explanation) + "</div>" + reportLink(q) + "</div>";
  });

  if (!shown) html += '<div class="card"><p class="muted">Nothing matches this filter.</p></div>';

  paint(html);
  var sel = document.getElementById("review-domain");
  if (sel) sel.addEventListener("change", function () {
    reviewDomain = Number(sel.value);
    renderReview();
  });
  window.scrollTo(0, 0);
}
