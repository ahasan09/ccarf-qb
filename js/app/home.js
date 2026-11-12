/* DOM app — the home screen, in four tabs: Today (readiness, the main
 * action, next best step), Practice (objectives, lists, scenarios), Exams
 * (every exam, imported tests, score history) and Resources. */

"use strict";

/* ------------------------------------------------------------- home */
function renderHome() {
  stopTimer();
  session = null;
  view = "home";
  var progress = Store.snapshot();
  var history = progress.history;
  var saved = isUsableSession(progress.session) ? progress.session : null;
  var now = Date.now();
  /* Objective figures come from the bank and the scenario bank only;
   * imported tests count toward the predicted score alone. */
  var lookup = function (id) {
    var q = byId[id];
    return q && (bankIds[id] || q.scenario) ? q : undefined;
  };
  var firstVisit = !history.length && !saved && !progress.saved.length && !progress.weak.length &&
    !progress.attempted.length && !Object.keys(progress.review || {}).length;

  var html = "";
  if (FULL_BANK.length !== EXPECTED_BANK_SIZE) {
    html += '<div class="card load-warning" role="alert">⚠ Only ' + FULL_BANK.length + " of " +
      EXPECTED_BANK_SIZE + " questions loaded — part of the bank failed to download. " +
      '<button class="btn small" data-action="hard-reload">Reload the bank</button></div>';
  }

  var acctChip = accountMenu(window.CCARF_SYNC);
  html += '<div class="h-top"><div class="h-brand"><svg width="30" height="30" viewBox="0 0 128 128" aria-hidden="true">' +
    '<rect width="128" height="128" rx="28" fill="var(--pen)"/>' +
    '<circle cx="64" cy="64" r="34" fill="none" stroke="var(--paper)" stroke-width="7"/>' +
    '<circle cx="64" cy="64" r="19" fill="var(--paper)"/></svg>CCAR-F Prep</div>' +
    '<button class="h-search" data-action="search" aria-label="Search questions" aria-keyshortcuts="/">' + icon("search") +
    '<span class="h-search-text">Search questions</span><kbd>/</kbd></button>' +
    '<span class="controls">' + acctChip +
    '<button class="btn h-theme" data-action="cycle-theme" title="' + THEME_TITLES[currentTheme()] + '" aria-label="' +
    THEME_TITLES[currentTheme()] + '">' + THEME_ICONS[currentTheme()] + '<span class="h-theme-label">' +
    THEME_NAMES[currentTheme()] + "</span></button></span></div>";

  /* Everyone gets the same tabs; only the top card differs, and parts
   * that need data (Next best step) appear once there is some. */
  var tab = currentTab();
  var due = dueReviewIds(progress.review, now).filter(isListed).length;
  html += tabBar(tab, due);
  html += '<div class="h-page" id="h-page" data-tab="' + tab + '">';
  if (tab === "practice") {
    var accP = objectiveAccuracy(progress.history, lookup);
    html += '<div class="h-cols">' + homeObjectives(progress, accP) + homePractice(progress, now, lookup) + "</div>";
  } else if (tab === "exams") {
    html += homeExams(progress, firstVisit);
  } else if (tab === "resources") {
    html += homeResources();
  } else {
    var acc = objectiveAccuracy(progress.history, lookup);
    var cta = heroCta(progress, saved, acc, now, firstVisit);
    html += firstVisit ? homeFirstVisit(progress, cta) : homeReadiness(progress, now, cta);
    html += homeNextStep(acc);
    var S = window.CCARF_SYNC;
    if (isAdminUser(S)) html += visitorCard(S);
  }
  html += "</div>";
  html += '<footer class="site-footer">Practice material for personal study. ' +
    "Not affiliated with Anthropic or Pearson VUE.</footer>";
  paint(html);
}

/* ------------------------------------------------------------- tabs */
var HOME_TABS = [
  ["today", "Today", '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>'],
  ["practice", "Practice", '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>'],
  ["exams", "Exams", '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>'],
  ["resources", "Resources", '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/>'],
];
var TAB_KEY = "ccarf.tab";
var homeTab = null;

function currentTab() {
  if (homeTab === null) homeTab = LS.get(TAB_KEY, "today");
  var known = HOME_TABS.some(function (t) { return t[0] === homeTab; });
  return known ? homeTab : "today";
}

function setTab(tab) {
  homeTab = tab;
  LS.set(TAB_KEY, tab);
  renderHome();
  if (window.scrollTo) window.scrollTo(0, 0);
}

/* A nav of four links rather than an ARIA tablist: each tab is its own
 * page of the home screen, and aria-current marks the one shown. */
function tabBar(tab, due) {
  return '<nav class="h-tabs" aria-label="Sections">' + HOME_TABS.map(function (t) {
    var on = t[0] === tab;
    var badge = t[0] === "practice" && due ? '<span class="h-tab-badge" aria-label="' + due + ' due">' + due + "</span>" : "";
    return '<button class="h-tab" data-action="tab" data-tab="' + t[0] + '"' + (on ? ' aria-current="page"' : "") + ">" +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      t[2] + "</svg><span>" + t[1] + "</span>" + badge + "</button>";
  }).join("") + "</nav>";
}

/* Bank questions not yet answered (ever right counts as answered). */
function bankLeft(progress) {
  var seen = {};
  progress.attempted.concat(progress.correctEver).forEach(function (id) { seen[id] = true; });
  return BANK.filter(function (q) { return !seen[q.id]; }).length;
}

function examDateLine(progress, now) {
  var days = daysUntil(progress.examDate, now);
  if (days === null || days < 0) return "";
  var at = new Date(progress.examDate + "T00:00:00").getTime();
  return "Exam on <b>" + esc(new Date(at).toLocaleDateString(undefined, { day: "numeric", month: "short" })) +
    "</b> · <b>" + days + " day" + (days === 1 ? "" : "s") + " left</b>";
}

/* The full exam needs every scenario to fill a block of 15. */
function scenarioExamReady() {
  return SCENARIOS.length > 0 && eligibleScenarios(SCENARIOS, SCENARIO_BANK).length === SCENARIOS.length;
}
function scenarioExamGate() { return scenarioExamReady() ? "" : " disabled"; }
function scenarioExamNote() {
  return scenarioExamReady() ? "" : '<p class="muted">The scenario exam is available once every scenario has ' + SCENARIO_BLOCK + " questions.</p>";
}

function allExamsLink() {
  return '<button class="btn ghost" data-action="tab" data-tab="exams">All exams →</button>';
}

function sparkline(attempts) {
  var pts = attempts.slice(-6);
  if (pts.length < 2) return "";
  /* Scale to the scores shown (and the pass line) so changes are visible. */
  var vals = pts.map(function (a) { return a.score; }).concat([PASS_SCORE]);
  var lo = Math.max(0, Math.floor((Math.min.apply(null, vals) - 40) / 50) * 50);
  var hi = Math.min(1000, Math.ceil((Math.max.apply(null, vals) + 40) / 50) * 50);
  var w = 300, h = 90, y = function (v) { return Math.round(h - 8 - ((v - lo) / (hi - lo)) * (h - 18)); };
  var step = (w - 20) / (pts.length - 1);
  var coords = pts.map(function (a, i) { return Math.round(10 + i * step) + "," + y(a.score); });
  return '<svg class="h-spark" viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="Last ' + pts.length + ' exam scores">' +
    '<line x1="0" x2="' + w + '" y1="' + y(PASS_SCORE) + '" y2="' + y(PASS_SCORE) + '" stroke="var(--pass)" stroke-dasharray="4 4" stroke-width="1.5"/>' +
    '<text x="4" y="' + (y(PASS_SCORE) - 5) + '" font-size="10" fill="var(--pass)">pass ' + PASS_SCORE + "</text>" +
    '<polyline fill="none" stroke="var(--pen)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" points="' + coords.join(" ") + '"/>' +
    coords.map(function (c) { var p = c.split(","); return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4" fill="var(--pen)"/>'; }).join("") +
    '</svg><div class="h-spark-cap"><span>Last ' + pts.length + " exams</span><span>" + pts[pts.length - 1].score + "</span></div>";
}

function homeReadiness(progress, now, cta) {
  var attempts = examAttempts(progress.history);
  var pred = predictedScore(progress.history);
  var verdicts = { pass: ["Likely pass", "pass"], borderline: ["Borderline", "border"], "not-yet": ["Not yet", "fail"] };
  var html = '<section class="card h-ready"><div>';
  html += '<h1 class="h-eyebrow">Your readiness</h1>';
  if (pred) {
    var v = verdicts[pred.verdict];
    html += '<div class="h-big">' + pred.score + '<small> / 1000 predicted</small></div>' +
      '<span class="h-verdict ' + v[1] + '" title="Based on your last ' + pred.count + " exam" + (pred.count === 1 ? "" : "s") +
      ', newest weighted most">' + v[0] + " · " + PASS_SCORE + " needed</span>";
  } else {
    html += '<p class="h-meta h-no-score">No predicted score yet. ' +
      '<button class="h-link" data-action="start-diagnostic">Start with the 20-question diagnostic</button>' +
      " to get your predicted score and weakest objectives.</p>";
  }
  var date = examDateLine(progress, now);
  var plan = studyPlan(daysUntil(progress.examDate, now), bankLeft(progress));
  html += '<p class="h-meta">' + (date ? date + " · " : "") +
    '<button class="h-link" data-action="edit-exam-date">' + (progress.examDate ? "change exam date" : "set exam date") + "</button>" +
    (plan ? '<br><span class="h-plan">' + esc(plan) + "</span>" : "") + "</p>";
  html += cta;
  html += "</div><div>" + sparkline(attempts);
  var last = null;
  progress.history.forEach(function (h) { if (Array.isArray(h.items) && typeof h.score === "number") last = h; });
  if (last) {
    html += '<button class="h-row" data-action="review-attempt" data-date="' + esc(last.date) + '"><span>Last attempt · ' +
      esc(last.examName || "Mock exam") + " · " + esc(new Date(last.date).toLocaleDateString(undefined, { day: "numeric", month: "short" })) +
      '</span><span class="muted">' + last.score + " · Review →</span></button>";
  }
  return html + "</div></section>";
}

function homeFirstVisit(progress, cta) {
  var html = '<section class="card h-ready h-first"><div>' +
    '<h1 class="h-eyebrow">Welcome — find your starting point</h1>' +
    '<div class="h-big h-big-sm">20-question diagnostic</div>' +
    '<p class="h-meta">A short scenario exam (2 scenarios × 10, 40 min) in the real exam\'s layout gives you a predicted score and your weakest objectives straight away.<br>' +
    SCENARIO_BANK.length + " scenario questions across the six official scenarios · " + BANK.length +
    " domain questions" + (EXAMS.length ? " · " + EXAMS.length + " practice tests" : "") + ".</p>" +
    cta +
    '<div class="h-steps"><div class="h-step"><b>1 · Diagnose</b>20 questions in the real exam\'s layout.</div>' +
    '<div class="h-step"><b>2 · Set your date</b>Get a countdown and a review queue.</div>' +
    '<div class="h-step"><b>3 · Practise</b>Short practice on your weakest objectives.</div></div>' + startHereLine() + "</div>" +
    '<div><div class="h-step h-date"><b>Exam date</b>' +
    (progress.examDate ? esc(progress.examDate) + "<br>" : "Optional — sets your countdown<br>") +
    '<button class="btn small" data-action="edit-exam-date">' + (progress.examDate ? "Change" : "Set date") + "</button></div></div></section>";
  return html;
}

function savedName(saved) {
  return (saved.scope === "unmapped"
    ? "Supplementary mock"
    : saved.diagnostic ? "Diagnostic"
    : Object.prototype.hasOwnProperty.call(MODE_NAMES, saved.mode) ? MODE_NAMES[saved.mode] : "Session") +
    (saved.examName ? " — " + saved.examName : "");
}

/* The top card has one main button, picked by where the user is: an
 * unfinished session, a first visit, questions due for review, a weakest
 * objective, and otherwise the full exam. Other ways in stay secondary. */
function heroCta(progress, saved, acc, now, firstVisit) {
  var main, note = "", rest = "";
  var examBtn = function (cls, label) {
    return '<button class="btn' + cls + '" data-action="start-scenario-exam"' + scenarioExamGate() + ">" + label + "</button>";
  };
  var mainBtn = function (action, label, attrs) {
    return '<button class="btn primary h-cta-main" data-action="' + action + '"' + (attrs || "") + ">" + label + "</button>";
  };
  if (saved) {
    var answered = answeredCount(saved), total = saved.questions.length, done = answered >= total;
    note = "<b>" + esc(savedName(saved)) + (done ? " ready to grade" : " in progress") + "</b> · " +
      answered + "/" + total + " answered" + (done ? " — finish to see your score" : "");
    main = done
      ? mainBtn("finish-saved", "Finish &amp; see results") + '<button class="btn" data-action="resume">Review answers</button>'
      : mainBtn("resume", "Continue · " + answered + "/" + total);
    rest = '<button class="btn ghost" data-action="discard">Discard</button>';
  } else if (firstVisit) {
    main = mainBtn("start-diagnostic", "Start diagnostic",
      eligibleScenarios(SCENARIOS, SCENARIO_BANK, 10).length >= 2 ? "" : " disabled");
    rest = examBtn(" ghost", "or take the full scenario exam") + allExamsLink();
  } else {
    var due = dueReviewIds(progress.review, now).filter(isListed).length;
    var weak = weakestObjectives(acc, 1)[0];
    if (due) {
      main = mainBtn("start-review", "Review " + due + " due question" + (due === 1 ? "" : "s"));
      note = "Spaced review: questions come back just before you would forget them.";
    } else if (weak) {
      main = mainBtn("drill-objective", "Practise your weakest objective", ' data-sub="' + esc(weak.key) + '"');
      note = "<b>" + esc(weak.key) + "</b> · " + weak.correct + " of " + weak.total + " right in your exams";
    }
    rest = main ? examBtn("", "Scenario exam") + allExamsLink()
      : allExamsLink() + '<span class="muted">4 scenarios × 15 · 120 min</span>';
    if (!main) main = examBtn(" primary h-cta-main", "Start scenario exam");
  }
  return (note ? '<p class="h-meta h-cta-note">' + note + "</p>" : "") +
    '<div class="h-cta">' + main + rest + "</div>" + scenarioExamNote();
}

/* Colour is backed by words: each bar says weak, close or on track to
 * screen readers and on hover, and the By objective note explains it. */
function meterStatus(pct) { return pct >= 72 ? "on track" : pct >= 50 ? "close" : "weak"; }
function meter(pct, source) {
  if (pct === null) return '<div class="h-meter" role="img" aria-label="No answers yet"></div>';
  var c = pct >= 72 ? "var(--pass)" : pct >= 50 ? "var(--flag)" : "var(--fail)";
  var label = pct + "% right" + (source ? " " + source : "") + ", " + meterStatus(pct);
  return '<div class="h-meter" role="img" aria-label="' + label + '" title="' + label + '"><i style="width:' + pct + "%;background:" + c + '"></i></div>';
}

function homeNextStep(acc) {
  var weak = weakestObjectives(acc);
  if (!weak.length) return "";
  var html = '<section class="card h-next"><h2 class="h-h2">Next best step</h2>' +
    '<p class="h-sub">Your weakest objectives across your exams — each practice set is up to 8 questions with a note on every option.' +
    examGuideLink() + "</p>";
  weak.forEach(function (w) {
    html += '<div class="h-weak"><div>' + esc(w.key) + "<small>" + w.correct + " of " + w.total + " right</small></div>" +
      meter(w.pct) + '<span class="h-pct">' + w.pct + "%</span>" +
      '<button class="btn small" data-action="drill-objective" data-sub="' + esc(w.key) + '">Practise →</button></div>';
  });
  return html + "</section>";
}

/* One bar per domain and objective. It shows exam accuracy when there is
 * some, and practice accuracy otherwise, so practising alone still fills
 * the bars; the line under each name gives both. */
function scoreLine(ex, pr) {
  var pc = function (r) { return Math.round((100 * r.correct) / r.total); };
  var exPct = ex && ex.total ? pc(ex) : null;
  var prPct = pr && pr.total ? pc(pr) : null;
  var bits = [];
  if (exPct !== null) bits.push("Exams " + exPct + "%");
  if (prPct !== null) bits.push("Practice " + prPct + "%");
  return {
    pct: exPct !== null ? exPct : prPct,
    source: exPct !== null ? "in exams" : prPct !== null ? "in practice" : "",
    line: bits.length ? bits.join(" · ") : "No answers yet",
  };
}

function homeObjectives(progress, acc) {
  var mastery = masteryByDomain(BANK, progress.correctEver, progress.attempted);
  var prac = practiceAccuracy(BANK, progress.correctEver, progress.attempted);
  var seenAll = 0, rightAll = 0, totalAll = 0;
  for (var sd = 1; sd <= 5; sd++) {
    var row = mastery[sd] || { correct: 0, attempted: 0, total: 0 };
    seenAll += row.attempted; rightAll += row.correct; totalAll += row.total;
  }
  var pc = function (a, b) { return b ? Math.round((a / b) * 100) : 0; };
  var sum = function (map, d) {
    var r = { correct: 0, total: 0 };
    SUBDOMAINS.forEach(function (sub) { if (sub.indexOf(d + ".") === 0 && map[sub]) { r.correct += map[sub].correct; r.total += map[sub].total; } });
    return r;
  };
  var html = '<section class="card h-col" id="h-objectives"><h2 class="h-h2">By objective</h2>' +
    '<p class="h-sub">Bars show your accuracy — from exams when you have taken some, otherwise from practice. Green is on track (72%+, the pass level), amber is close (50–71%), red is weak. Open a domain for its task statements.</p>' +
    '<p class="h-bank">Question bank: ' + seenAll + " of " + totalAll + " answered" +
    (seenAll ? " · " + pc(rightAll, seenAll) + "% right" : "") + "</p>";
  for (var d = 1; d <= 5; d++) {
    var s = scoreLine(sum(acc, d), sum(prac, d));
    var m = mastery[d] || { attempted: 0, total: 0, correct: 0 };
    var open = expandedMastery === d;
    html += '<div class="h-dom"><button class="h-dom-head" data-action="toggle-mastery" data-domain="' + d + '" aria-expanded="' + open + '">' +
      '<span class="domain-chip chip-d' + d + '">D' + d + "</span><span>" + esc(DOMAIN_NAMES[d]) +
      '<small class="h-score-line">' + s.line + "</small></span>" +
      meter(s.pct, s.source) + '<span class="h-pct">' + (s.pct === null ? "—" : s.pct + "%") + "</span>" + chev(open) + "</button>";
    if (open) {
      html += '<div class="h-objs"><button class="h-row" data-action="practice" data-domain="' + d + '"><span>Practice all of D' + d +
        '</span><span class="muted">' + m.total + " questions →</span></button>";
      SUBDOMAINS.forEach(function (sub) {
        if (sub.indexOf(d + ".") !== 0) return;
        var o = scoreLine(acc[sub], prac[sub]);
        html += '<div class="h-obj"><span>' + esc(sub) + '<small class="h-score-line">' + o.line + "</small></span>" + meter(o.pct, o.source) +
          '<span class="h-pct">' + (o.pct === null ? "—" : o.pct + "%") + "</span>" +
          '<span class="h-obj-act"><button class="btn small" data-action="drill-objective" data-sub="' + esc(sub) + '">Practise</button></span></div>';
      });
      html += "</div>";
    }
    html += "</div>";
  }
  return html + "</section>";
}

function scenarioRows(best) {
  return SCENARIOS.map(function (sc) {
    var n = SCENARIO_BANK.filter(function (q) { return q.scenario === sc.id; }).length;
    return '<button class="h-row" data-action="practice-scenario" data-scenario="' + sc.id + '"' + (n ? "" : " disabled") + ">" +
      "<span>" + esc(sc.name) + '</span><span class="muted">' +
      (best[sc.id] !== undefined ? "best " + best[sc.id] + "%" : n + " questions") + "</span></button>";
  }).join("");
}

/* Small line icons, drawn with the text colour. */
var ICON_PATHS = {
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  review: '<path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v4.5h-4.5"/>',
  star: '<path d="m12 3.5 2.6 5.3 5.9.86-4.25 4.14 1 5.86L12 16.9l-5.25 2.76 1-5.86L3.5 9.66l5.9-.86z"/>',
  miss: '<circle cx="12" cy="12" r="8.5"/><path d="m9 9 6 6M15 9l-6 6"/>',
  quiz: '<path d="M4 6h16M4 12h10M4 18h7"/><path d="m16 16 2 2 3.5-4"/>',
};
function icon(name) {
  return '<svg class="ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON_PATHS[name] + "</svg>";
}

function homePractice(progress, now, lookup) {
  var due = dueReviewIds(progress.review, now).filter(isListed).length;
  var savedIds = progress.saved.filter(isListed);
  var weakIds = progress.weak.filter(isListed);
  var html = '<section class="card h-col" id="h-practice"><h2 class="h-h2">Practice</h2>' +
    '<p class="h-sub">Learn mode: untimed, with the answer and explanation after each question.</p>';
  /* Lists only appear once they have something in them. */
  if (due) {
    html += '<button class="h-row h-due" data-action="start-review"><span>' + icon("review") + "Due for review</span>" +
      '<span class="muted">' + due + " today</span></button>";
  }
  if (savedIds.length) {
    html += '<button class="h-row" data-action="start-saved"><span>' + icon("star") + "Saved questions</span>" +
      '<span class="muted">' + savedIds.length + "</span></button>";
  }
  if (weakIds.length) {
    html += '<button class="h-row" data-action="start-weak"><span>' + icon("miss") + "Missed questions</span>" +
      '<span class="muted">' + weakIds.length + "</span></button>";
  }
  if (!due && !savedIds.length && !weakIds.length) {
    html += '<p class="h-empty">Questions you save, miss, or that come back for review will be listed here.</p>';
  }
  html += '<button class="h-row" data-action="custom-builder"><span>' + icon("quiz") + "Custom quiz</span>" +
    '<span class="muted">build →</span></button>' +
    '<button class="h-row" data-action="search"><span>' + icon("search") + "Search questions</span>" +
    '<span class="muted">by keyword →</span></button>' +
    '<h2 class="h-h2 h-gap">By scenario</h2>' + scenarioRows(bestScenarioScores(progress.history, lookup));
  return html + "</section>";
}

/* Every exam in one place, then imported tests and score history. */
function homeExams(progress, firstVisit) {
  var history = progress.history;
  var best = 0;
  history.forEach(function (h) { if (h.score > best) best = h.score; });
  var diagReady = eligibleScenarios(SCENARIOS, SCENARIO_BANK, 10).length >= 2;
  var row = function (action, title, detail, gate, primary) {
    return '<button class="h-row h-exam' + (primary ? " h-exam-main" : "") + '" data-action="' + action + '"' + (gate || "") + ">" +
      "<span><b>" + title + "</b><small>" + detail + "</small></span>" +
      '<span class="muted">Start →</span></button>';
  };
  var html = '<section class="card h-col" id="h-exams"><h2 class="h-h2">Exams</h2>' +
    '<p class="h-sub">Timed and scored out of 1000, pass at ' + PASS_SCORE + ". Leave at any time and resume from Today.</p>" +
    row("start-scenario-exam", "Scenario exam", "The real exam's format · 4 scenarios × 15 · 120 min", scenarioExamGate(), !firstVisit) +
    row("start-diagnostic", "Diagnostic", "A short start · 2 scenarios × 10 · 40 min", diagReady ? "" : " disabled", firstVisit) +
    row("start-exam", "Mock exam", "60 question-bank questions by domain weight · 120 min") +
    scenarioExamNote() + "</section>";

  if (EXAMS.length) {
    var taken = EXAMS.filter(function (e) { return bestAttemptFor(e.id, history); }).length;
    html += '<section class="card h-col" id="h-imported"><h2 class="h-h2">Imported practice tests</h2>' +
      '<p class="h-sub">' + EXAMS.length + " tests · " + taken + " taken. Full exams from your own files, scored separately; " +
      "they do not feed the question bank or the missed questions.</p>" +
      '<div class="domain-list">';
    EXAMS.forEach(function (e) {
      var attempt = bestAttemptFor(e.id, history);
      var source = RESOURCES.filter(function (r) { return r.exam === e.id; })[0];
      html += '<div class="domain-row exam-row"><span>' + esc(e.name) +
        (source ? ' <a class="h-link h-src" href="' + esc(source.url) + '"' + EXTERNAL + ' title="' + esc(source.title) + '">source ↗</a>' : "") + "</span>" +
        '<span class="muted">' + (e.count || (e.questions ? e.questions.length : 0)) + " questions" +
        (attempt ? " · best " + attempt.score + (attempt.pass ? " · passed" : "") : "") + "</span>" +
        '<button class="btn small" data-action="practice-imported" data-exam="' + esc(e.id) + '">Practice</button>' +
        '<button class="btn small primary" data-action="start-imported" data-exam="' + esc(e.id) + '">' +
        (attempt ? "Retake mock" : "Take mock") + "</button></div>";
    });
    html += "</div></section>";
  }
  return html + homeHistory(history, best);
}

/* Score history comes last on the Exams tab. */
function homeHistory(history, best) {
  var html = "";
  html += '<section class="card h-col" id="h-history"><h2 class="h-h2">Score history</h2><p class="h-sub">' +
    (history.length ? history.length + " attempt" + (history.length === 1 ? "" : "s") + " · best " + best : "No exams yet.") + "</p>";
  if (!history.length) {
    html += '<p class="muted">No exams taken yet. Your attempts will appear here.</p>';
  } else {
    html += '<div class="table-scroll"><table class="history"><thead><tr><th>Date</th><th>Score</th><th>Result</th><th>Correct</th>' +
      "<th>D1</th><th>D2</th><th>D3</th><th>D4</th><th>D5</th><th></th></tr></thead><tbody>";
    history.slice().reverse().forEach(function (h) {
      var cells = "";
      for (var d2 = 1; d2 <= 5; d2++) {
        var pd = h.perDomain && h.perDomain[d2];
        cells += "<td>" + (pd ? pd.correct + "/" + pd.total : "–") + "</td>";
      }
      html += "<tr><td>" + esc(new Date(h.date).toLocaleString()) +
        (h.examName ? '<br><span class="muted">' + esc(h.examName) + "</span>" : "") + "</td>" +
        "<td><strong>" + h.score + "</strong></td>" +
        '<td><span class="badge ' + (h.pass ? "pass" : "fail") + '">' + (h.pass ? "PASS" : "FAIL") + "</span></td>" +
        "<td>" + h.correct + "/" + h.total + "</td>" + cells +
        "<td>" + (Array.isArray(h.items)
          ? '<button class="btn ghost small" data-action="review-attempt" data-date="' + esc(h.date) + '">Review</button>'
          : "") + "</td></tr>";
    });
    html += "</tbody></table></div>" +
      '<button class="btn ghost small" data-action="clear-history">Clear history</button>';
  }
  return html + "</section>";
}

function isAdminUser(S) {
  return !!(S && S.enabled && S.user() && S.isAdmin && S.isAdmin());
}

/* Account & sync lives in a dropdown on the header chip, reachable from
 * the top of the page. It is an .h-menu, so Escape or a click outside
 * closes it; its open state is remembered (foldAttrs) so a background sync
 * redrawing the screen doesn't snap it shut while someone is using it. */
function accountMenu(S) {
  var user = S && S.enabled && S.user();
  var label = user
    ? '<span class="dot">●</span> <span class="chip-email">' + esc(user.email || "signed in") + "</span> " + chev(false, true)
    : (S && S.enabled ? "Sign in" : "Backup") + " " + chev(false, true);
  return '<details class="h-menu acct-menu"' + foldAttrs("h-acct") + ">" +
    '<summary class="' + (user ? "signed-chip" : "btn ghost small") + '" title="Account &amp; sync">' + label + "</summary>" +
    '<div class="acct-pop">' + accountCard() +
    (isAdminUser(S) ? '<button class="btn ghost small acct-admin" data-action="open-section" data-tab="today" data-id="h-visitors">Visitor stats ↓</button>' : "") +
    "</div></details>";
}

/* Admin only: who is using the app, from the visit_stats() function. The
 * server refuses anyone not listed in public.admins, so this card appears
 * only after that call has succeeded. */
var VISITOR_WINDOWS = [
  ["now", "Active now"],
  ["day", "Last 24 hours"],
  ["week", "Last 7 days"],
  ["month", "Last 30 days"],
  ["all", "All time"],
];

function visitorCard(S) {
  var stats = S.visitorStats ? S.visitorStats() : null;
  var windows = (stats && stats.windows) || {};
  var count = function (w, k) { return Number((windows[w] || {})[k]) || 0; };
  var activeNow = count("now", "anonymous") + count("now", "signedIn");
  var html = '<details class="card h-fold"' + foldAttrs("h-visitors", true) + "><summary><b>Visitors</b>" +
    '<span class="muted">admin · ' + activeNow + " active now</span>" + chev() + "</summary>";
  if (!stats) {
    html += '<p class="muted">Loading…</p>';
  } else {
    html += '<div class="table-scroll"><table class="history visitors"><thead><tr><th></th>' +
      "<th>Anonymous</th><th>Signed in</th><th>Total</th></tr></thead><tbody>";
    VISITOR_WINDOWS.forEach(function (w) {
      var anon = count(w[0], "anonymous");
      var signed = count(w[0], "signedIn");
      html += "<tr><td>" + w[1] + "</td><td>" + anon + "</td><td>" + signed + "</td><td><strong>" + (anon + signed) + "</strong></td></tr>";
    });
    html += "</tbody></table></div>" +
      '<p class="muted auth-note">' + (Number(stats.registered) || 0) + " registered account" +
      (Number(stats.registered) === 1 ? "" : "s") + ". Anonymous counts browsers; signed in counts accounts, " +
      "by each visitor's sign-in state at their last visit. Active now means seen in the last 3 minutes.</p>";
  }
  if (S.statsError && S.statsError()) html += '<p class="muted auth-note">Could not refresh: ' + esc(S.statsError()) + "</p>";
  html += '<button class="btn ghost small" data-action="refresh-visitors">Refresh</button></details>';
  return html;
}

function answeredCount(sess) {
  var answers = (sess && sess.answers) || {};
  return Object.keys(answers).filter(function (k) {
    var a = answers[k];
    return a !== null && a !== undefined && !(Array.isArray(a) && !a.length);
  }).length;
}

/* A stored session is only offered for resume if it still lines up with
 * the loaded bank — otherwise the question screen would crash on it. */
function isUsableSession(sess) {
  return !!(sess && Array.isArray(sess.questions) &&
    sess.questions.some(function (s) { return s && byId[s.id]; }));
}

function timeAgo(ms) {
  var secs = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (secs < 60) return "just now";
  var mins = Math.round(secs / 60);
  if (mins < 60) return mins + " minute" + (mins === 1 ? "" : "s") + " ago";
  var hours = Math.round(mins / 60);
  if (hours < 24) return hours + " hour" + (hours === 1 ? "" : "s") + " ago";
  return new Date(ms).toLocaleString();
}

/* Imported exam questions carry no domain tag, so label them by their
 * exam instead of rendering an empty domain chip. */
function questionMeta(q) {
  var bits = "";
  if (DOMAIN_NAMES[q.domain]) {
    bits += '<span class="domain-chip chip-d' + esc(q.domain) + '">D' + esc(q.domain) + "</span>" +
      '<span class="muted">' + esc(DOMAIN_NAMES[q.domain]) + "</span>";
  } else if (q.exam && examById[q.exam]) {
    bits += '<span class="muted">' + esc(examById[q.exam].name) + "</span>";
  }
  if (q.subdomain) bits += '<span class="muted sub-tag">§ ' + esc(q.subdomain) + "</span>";
  if (q.scenario) bits += '<span class="scenario-tag">' + esc(q.scenario) + "</span>";
  return bits;
}

function bestAttemptFor(examId, history) {
  var best = null;
  (history || []).forEach(function (h) {
    if (h.examId === examId && (!best || h.score > best.score)) best = h;
  });
  return best;
}

/* ------------------------------------------------- study resources */
var EXTERNAL = ' target="_blank" rel="noopener noreferrer"';

function resourceLink(r, cls, text) {
  return '<a class="' + cls + '" href="' + esc(r.url) + '"' + EXTERNAL + ">" + (text || esc(r.title)) + "</a>";
}

function homeResources() {
  if (!RESOURCES.length) return '<section class="card h-col" id="h-resources"><h2 class="h-h2">Study resources</h2>' +
    '<p class="h-sub">No study links are configured.</p></section>';
  var html = '<section class="card h-col" id="h-resources"><h2 class="h-h2">Study resources</h2>' +
    '<p class="h-sub">The exam guide, courses and practice outside this app. Links open in a new tab and need an internet connection.</p>';
  RESOURCE_GROUPS.forEach(function (g) {
    var items = RESOURCES.filter(function (r) { return r.group === g; });
    if (!items.length) return;
    html += '<div class="h-res-group"><h3 class="h-h3">' + esc(g) + "</h3>";
    items.forEach(function (r) {
      html += resourceLink(r, "h-row h-res",
        "<span>" + (r.star ? '<span class="h-star" title="Must-read">★</span> ' : "") + esc(r.title) +
        (r.note ? "<small>" + esc(r.note) + "</small>" : "") + "</span>" +
        '<span class="muted">' + (r.start ? "start here ↗" : "↗") + "</span>");
    });
    html += "</div>";
  });
  return html + "</section>";
}

function startHereLine() {
  var start = RESOURCES.filter(function (r) { return r.start; });
  if (!start.length) return "";
  return '<p class="h-meta h-start">New to the exam? Start with ' +
    start.map(function (r) { return resourceLink(r, "h-link", esc(r.title) + " ↗"); }).join(" and ") + ".</p>";
}

function examGuideLink() {
  var guide = resourceById("exam-guide");
  return guide ? " " + resourceLink(guide, "h-link", "What each objective covers: exam guide ↗") : "";
}

function accountCard() {
  var S = window.CCARF_SYNC;
  var html = '<div class="card" id="acct"><h2>Account &amp; sync</h2>';
  if (!S || !S.enabled) {
    html += '<p class="muted auth-note">Progress is stored in this browser. To sign in and sync across devices, ' +
      "enable sync in <code>config.js</code> (see the README).</p>";
  } else if (S.unavailable) {
    html += '<p class="muted auth-note">' + esc(S.error()) + "</p>";
  } else if (S.user()) {
    var st = S.status();
    var waiting = S.pendingCount ? S.pendingCount() : 0;
    var stLabel = st === "syncing" ? "syncing…"
      : st === "offline" ? "offline — changes will sync when you reconnect"
      : st === "error" ? "sync failed"
      : waiting ? waiting + " change" + (waiting === 1 ? "" : "s") + " waiting to sync"
      : st === "synced" ? "progress synced" : "sync ready";
    html += "<p>Signed in as <strong>" + esc(S.user().email || "account") + "</strong> " +
      '<span class="muted">· ' + stLabel + "</span></p>";
    if (st === "error" && S.error && S.error()) {
      html += '<p class="muted auth-note">' + esc(S.error()) + "</p>";
    }
    var syncedAt = S.syncedAt ? S.syncedAt() : 0;
    if (syncedAt) {
      html += '<p class="muted auth-note">Last synced ' + esc(timeAgo(syncedAt)) +
        ". Your progress is kept on the server, so any signed-in device shows the latest.</p>";
    }
    html += '<div class="row"><button class="btn small" data-action="sync-now"' +
      (st === "syncing" ? " disabled" : "") + ">" + (st === "syncing" ? "Syncing…" : "Sync now") + "</button>" +
      '<button class="btn ghost small" data-action="auth-signout">Sign out</button></div>';
  } else {
    var emailCode = !!(window.CCARF_CONFIG && window.CCARF_CONFIG.emailCode);
    html += '<p class="muted auth-note">Sign in with your e-mail to back up progress and resume from any device.</p>' +
      '<div class="row"><input class="input" id="auth-email" type="email" autocomplete="email" placeholder="you@example.com" value="' + esc(pendingEmail || "") + '">' +
      '<button class="btn primary" data-action="auth-send">' +
      (pendingEmail ? "Resend e-mail" : emailCode ? "Email me a sign-in code" : "Email me a sign-in link") + "</button></div>";
    if (pendingEmail) {
      /* Supabase's built-in mailer sends its default template, which holds
       * only a link; the code exists in the e-mail only once a custom SMTP
       * template adds {{ .Token }} (config.js emailCode). The link signs in
       * whichever browser opens it, so say so. */
      html += '<div class="auth-steps"><p>We sent a sign-in e-mail to <strong>' + esc(pendingEmail) + "</strong>.</p>" +
        '<p class="muted auth-note">' +
        (emailCode
          ? "<b>Enter the code</b> from it below to sign in here. Or <b>click the link</b> in it instead — that only signs in the browser where you click it. "
          : "<b>Open the link</b> in it in this browser to sign in here. The link only signs in the browser where you click it, so if your mail opens it on another device, sign in there or forward the e-mail to this one. ") +
        "Nothing there? Check spam, or resend.</p></div>";
      if (emailCode) {
        html += '<div class="row" style="margin-top:10px"><input class="input" id="auth-code" inputmode="numeric" autocomplete="one-time-code" placeholder="Code from the e-mail">' +
          '<button class="btn" data-action="auth-verify">Verify &amp; sign in</button></div>';
      }
    }
  }
  if (S && S.enabled && !S.unavailable && !(window.CCARF_CONFIG && window.CCARF_CONFIG.countVisits === false)) {
    html += '<p class="muted auth-note">Visits are counted with a random ID kept in this browser. ' +
      "No IP address or other personal details are recorded.</p>";
  }
  html += '<h3 class="h-h3">Backup file</h3><p class="muted auth-note">Save your progress to a file, or add one back — ' +
    "useful without an account, or before clearing browser data. Importing only adds: nothing here is removed.</p>" +
    '<div class="row"><button class="btn small" data-action="export-progress">Download progress</button>' +
    '<button class="btn ghost small" data-action="import-progress">Import from file…</button>' +
    '<input type="file" id="import-file" accept=".json,application/json" hidden></div>';
  var backup = LS.get(BACKUP_KEY, null);
  var extra = progressSize(backup) - progressSize(Store.snapshot());
  if (extra > 0) {
    html += '<p class="muted auth-note">This device has a backup copy with ' + extra +
      " more item" + (extra === 1 ? "" : "s") + " than your current progress.</p>" +
      '<div class="row"><button class="btn" data-action="restore-backup">Restore backup</button></div>';
  }

  return html + "</div>";
}
