/* Drives the real DOM app against a stub document, covering the screen-flow
 * bugs that only show up once rendering and storage interact. */
import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { APP_SCRIPTS, runScripts } from "./engine.mjs";

function bank() {
  const qs = [];
  for (let d = 1; d <= 5; d++) {
    for (let i = 1; i <= 20; i++) {
      qs.push({
        id: `d${d}-q${i}`,
        domain: d,
        subdomain: `${d}.1 Sample subdomain`,
        question: `Question ${d}-${i}?`,
        options: ["A", "B", "C", "D"],
        answer: 0,
        explanation: "Because.",
      });
    }
  }
  return qs;
}

const SCENARIOS = ["support", "codegen", "research", "devprod", "ci", "extraction"].map((id) => ({
  id, name: `Scenario ${id}`, text: `Background text for ${id}.`,
}));

function scenarioBank(perScenario = 16) {
  const qs = [];
  for (const s of SCENARIOS) {
    const n = typeof perScenario === "number" ? perScenario : perScenario[s.id] || 0;
    for (let i = 1; i <= n; i++) {
      qs.push({
        id: `sc-${s.id}-${i}`,
        scenario: s.id,
        domain: 1,
        subdomain: "1.1 Design and implement agentic loops for autonomous task execution",
        question: `Scenario question ${s.id} ${i}?`,
        options: ["Opt one", "Opt two", "Opt three", "Opt four"],
        answer: 0,
        optionNotes: ["Note one", "Note two", "Note three", "Note four"],
        explanation: "Because.",
      });
    }
  }
  return qs;
}

function launch(opts = {}) {
  const storage = opts.storage || {};
  const timers = [];
  const listeners = {};
  const appEl = {
    innerHTML: "",
    dataset: {},
    querySelector: () => null,
    querySelectorAll: () => [],
  };
  let clickHandler = null;
  const appListeners = {};
  const docListeners = {};
  appEl.addEventListener = (type, fn) => {
    if (type === "click") clickHandler = fn;
    (appListeners[type] = appListeners[type] || []).push(fn);
  };
  appEl.dispatch = (type, ev) => (appListeners[type] || []).forEach((fn) => fn(ev));

  const win = {
    QUESTION_BANK: opts.bank || bank(),
    MOCK_EXAMS: opts.exams || [],
    MOCK_EXAM_INDEX: opts.examIndex,
    STUDY_RESOURCES: opts.resources,
    SCENARIOS: opts.scenarios || SCENARIOS,
    SCENARIO_BANK: opts.scenarioBank || scenarioBank(),
    CCARF_SYNC: opts.sync,
    CCARF_CONFIG: opts.config,
    history: opts.history,
    ...(opts.win || {}),
    addEventListener: (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); },
    dispatchEvent: (ev) => { (listeners[ev.type] || []).forEach((fn) => fn(ev)); },
    scrollTo: () => {},
    caches: undefined,
  };
  /* Frames run only when the test flushes them (opts.frames), so a test
   * can look at the screen between the click and the work it schedules. */
  const frames = [];
  if (opts.frames) win.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
  const scripts = [];
  let alertFn = () => {};

  const ctx = {
    window: win,
    console,
    Date: opts.Date || Date, Math, JSON, Object, Array, Number, String, Boolean, Promise,
    navigator: {},
    location: opts.location || { protocol: "file:", hostname: "" },
    CustomEvent: class { constructor(type) { this.type = type; } },
    localStorage: {
      getItem: (k) => (k in storage ? storage[k] : null),
      setItem: (k, v) => { storage[k] = String(v); },
      removeItem: (k) => { delete storage[k]; },
    },
    alert: (m) => alertFn(m),
    confirm: opts.confirm || (() => true),
    prompt: opts.prompt || (() => null),
    setInterval: (fn) => { timers.push(fn); return timers.length; },
    clearInterval: () => {},
    setTimeout: () => 1,
    clearTimeout: () => {},
    document: {
      getElementById: (id) => (id === "app" ? appEl
        : id === "app-dialog" && opts.dialog ? opts.dialog
        : id === "sr-live" && opts.live ? opts.live
        : opts.inputs && id in opts.inputs ? { value: opts.inputs[id] } : null),
      addEventListener: (type, fn) => { (docListeners[type] = docListeners[type] || []).push(fn); },
      documentElement: { removeAttribute() {}, setAttribute() {} },
      createElement: () => ({}),
      head: { appendChild: (tag) => scripts.push(tag) },
      hidden: false,
    },
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  runScripts(APP_SCRIPTS, ctx);

  const click = (action, data = {}, extra = {}) => {
    const btn = Object.assign(
      { dataset: Object.assign({ action }, data), disabled: false },
      extra
    );
    btn.closest = () => btn;
    const classes = new Set();
    btn.classList = { add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c) };
    btn.attrs = {};
    btn.setAttribute = (k, v) => { btn.attrs[k] = String(v); };
    btn.removeAttribute = (k) => { delete btn.attrs[k]; };
    clickHandler({ target: { closest: () => btn } });
    return btn;
  };

  return {
    html: () => appEl.innerHTML,
    tick: () => timers.slice().forEach((fn) => fn()),
    click,
    storage,
    store: () => win.CCARF_STORE,
    bank: () => win.QUESTION_BANK,
    window: win,
    fireSyncEvent: () => win.dispatchEvent(new ctx.CustomEvent("ccarf:auth")),
    firePopState: () => win.dispatchEvent(new ctx.CustomEvent("popstate")),
    fireSignOut: () => win.dispatchEvent(new ctx.CustomEvent("ccarf:signout")),
    /* The user opening or closing a <details> section. */
    toggle: (id, open) => {
      const ev = { target: { tagName: "DETAILS", id, open } };
      (appListeners.toggle || []).forEach((fn) => fn(ev));
    },
    appEl,
    win,
    setAlert: (fn) => { alertFn = fn; },
    doc: ctx.document,
    scripts,
    /* Runs scheduled frames, including any they schedule in turn. */
    flushFrames: () => { while (frames.length) frames.shift()(); },
    /* Right-click: on an option (opt given) or on something else. */
    rightClick: (opt) => {
      const optEl = opt === undefined ? null : { dataset: { opt: String(opt) } };
      const ev = { clientX: 10, clientY: 20, preventDefault() {}, target: { closest: () => optEl } };
      (appListeners.contextmenu || []).forEach((fn) => fn(ev));
    },
    /* Typing into a text box: fires the app's input listener. */
    type: (id, value) => {
      (appListeners.input || []).forEach((fn) => fn({ target: { id, value } }));
    },
    key: (key, target) => {
      const ev = { key, preventDefault() {}, target: target || { tagName: "BODY", closest: () => null } };
      (docListeners.keydown || []).forEach((fn) => fn(ev));
    },
  };
}

/* Answer every question of the current session, finishing it. */
/* The home screen draws one tab at a time; these open a tab, or gather the
 * markup of all four for checks that don't care which tab holds what. */
function tab(app, name) { app.click("tab", { tab: name }); return app.html(); }
function allTabs(app) {
  const html = ["today", "practice", "exams", "resources"].map((t) => tab(app, t)).join("\n");
  tab(app, "today");
  return html;
}

function completeSession(app, { correct = true } = {}) {
  for (let i = 0; i < 500; i++) {
    if (!app.html().includes('data-action="select"')) break;
    app.click("select", { opt: correct ? "0" : "1" });
    if (app.html().includes('data-action="submit"')) {
      app.click("submit");
      break;
    }
    app.click("next");
  }
}

test("the results screen survives a sync status update instead of jumping home", () => {
  const app = launch();
  app.click("practice", { domain: "3", sub: "3.1" });
  completeSession(app);
  assert.ok(app.html().includes("score-ring"), "a results screen should be showing");

  app.fireSyncEvent(); // what a background sync emits
  assert.ok(app.html().includes("score-ring"), "results must still be on screen");
  assert.ok(!app.html().includes("Start mock exam"), "must not have fallen back to home");
});

test("finishing a session clears the resume card", () => {
  const app = launch();
  app.click("practice", { domain: "2", sub: "2.1" });
  assert.ok(app.html().includes('data-action="select"'));
  completeSession(app);
  app.click("home");

  assert.ok(!app.html().includes("in progress"), "no resume card after finishing");
  assert.equal(app.store().snapshot().session, null);
});

test("exiting part-way keeps a resume card, and resuming restores the answers", () => {
  const app = launch();
  app.click("practice", { domain: "4", sub: "4.1" });
  app.click("select", { opt: "0" });
  app.click("next");
  app.click("quit");

  assert.ok(app.html().includes("in progress"), "an unfinished session stays resumable");
  app.click("resume");
  assert.ok(app.html().includes('data-action="select"'), "resumes into the quiz");
});

test("a drilled-correct question leaves the weak set, a missed one joins it", () => {
  const app = launch();
  app.click("practice", { domain: "5", sub: "5.1" });
  app.click("select", { opt: "1" }); // wrong
  const afterWrong = app.store().snapshot();
  assert.ok(afterWrong.weak.length === 1, "a miss is recorded immediately");

  app.click("next");
  app.click("select", { opt: "0" }); // right
  assert.ok(app.store().snapshot().correctEver.length === 1, "a correct answer counts immediately");
});

test("practice credits answers even when the run is abandoned half-way", () => {
  const app = launch();
  app.click("practice", { domain: "1", sub: "1.1" });
  app.click("select", { opt: "0" });
  app.click("next");
  app.click("select", { opt: "0" });
  app.click("quit");

  assert.equal(
    app.store().snapshot().correctEver.length,
    2,
    "leaving early must not throw away what was already answered"
  );
});

test("practice mode offers no dead Previous button", () => {
  const app = launch();
  app.click("practice", { domain: "1", sub: "1.1" });
  assert.ok(!app.html().includes('data-action="prev"'));
});

test("a stored session referring to unknown questions is discarded, not crashed on", () => {
  const app = launch();
  app.store().mutate({
    key: "session",
    apply: (s) => {
      s.session = {
        mode: "practice",
        questions: [{ id: "does-not-exist", order: [0, 1, 2, 3] }],
        answers: {},
        flagged: {},
        current: 0,
        startedAt: 1,
        tally: { correct: 0, wrong: 0 },
      };
    },
  });
  app.click("home");
  assert.ok(!app.html().includes("in progress"), "an unusable session is not offered");
});

test("signing out clears this device's copy of the progress", () => {
  const app = launch();
  app.click("practice", { domain: "1", sub: "1.1" });
  app.click("select", { opt: "0" });
  assert.ok(app.store().snapshot().correctEver.length > 0);

  app.fireSignOut();
  assert.equal(app.store().snapshot().correctEver.length, 0);
  assert.equal(app.store().snapshot().history.length, 0);
  assert.equal(app.store().snapshot().session, null);
});

test("mastery and the home screen reflect progress without a reload", () => {
  const app = launch();
  app.click("practice", { domain: "1", sub: "1.1" });
  app.click("select", { opt: "0" });
  app.click("quit");
  app.click("toggle-mastery", { domain: "1" });
  assert.ok(app.html().includes("1/20"), "the domain bar counts the answered question");
});

test("a fully answered drill can be graded straight from the home screen", () => {
  const app = launch();
  app.click("practice", { domain: "1", sub: "1.1" });
  app.click("select", { opt: "1" }); // a miss, so there is something to retry
  app.click("quit");

  // stand in for a retry round: answer every question, then leave without submitting
  const n = app.store().snapshot().weak.length;
  assert.ok(n > 0, "there should be something to drill");
  app.click("start-weak");
  for (let i = 0; i < n; i++) {
    app.click("select", { opt: "0" });
    if (i < n - 1) app.click("next");
  }
  app.click("quit");

  assert.ok(app.html().includes("ready to grade"), "home must offer to grade, not just resume");
  assert.ok(app.html().includes('data-action="finish-saved"'));

  app.click("finish-saved");
  assert.ok(app.html().includes("score-ring"), "grading shows the results screen");

  app.click("home");
  assert.ok(!app.html().includes("ready to grade"), "the session is cleared once graded");
  assert.equal(app.store().snapshot().session, null);
});

test("answering the last question prompts you to finish rather than looking done", () => {
  const app = launch();
  app.click("practice", { domain: "2", sub: "2.1" });
  app.click("select", { opt: "1" });
  app.click("quit");

  app.click("start-weak");
  app.click("select", { opt: "0" });
  assert.ok(app.html().includes("answered — finish to grade"), "an explicit prompt appears");
  assert.ok(app.html().includes("Finish &amp; see results"), "the button says what it does");
});

/* Pull out the option buttons as [{opt, selected, letterPosition}]. */
function renderedOptions(html) {
  const out = [];
  const re = /<button class="(option[^"]*)" role="(?:radio|checkbox)" aria-checked="(true|false)" data-action="select" data-opt="(\d+)"/g;
  let m;
  while ((m = re.exec(html))) {
    out.push({ classes: m[1], checked: m[2] === "true", opt: Number(m[3]) });
  }
  return out;
}

test("no option looks selected before you answer", () => {
  const app = launch();
  app.click("start-exam");
  const opts = renderedOptions(app.html());
  assert.equal(opts.length, 4, "four options render");
  assert.deepEqual(
    opts.filter((o) => o.classes.includes("selected")).map((o) => o.opt),
    [],
    "nothing may appear pre-selected"
  );
  assert.deepEqual(opts.filter((o) => o.checked).map((o) => o.opt), []);
});

test("the option you click is the one that highlights", () => {
  const app = launch();
  app.click("start-exam");

  for (const pick of [2, 0, 3, 1]) {
    app.click("select", { opt: String(pick) });
    const opts = renderedOptions(app.html());
    const selected = opts.filter((o) => o.classes.includes("selected")).map((o) => o.opt);
    assert.deepEqual(selected, [pick], `clicking option ${pick} must highlight option ${pick}`);
    assert.deepEqual(opts.filter((o) => o.checked).map((o) => o.opt), [pick], "aria-checked must agree");
  }
});

test("the selection stays put as other questions get answered", () => {
  const app = launch();
  app.click("start-exam");
  app.click("select", { opt: "3" });
  app.click("next");
  app.click("select", { opt: "3" });
  app.click("prev");

  const selected = renderedOptions(app.html())
    .filter((o) => o.classes.includes("selected"))
    .map((o) => o.opt);
  assert.deepEqual(selected, [3], "going back shows the original answer, not a count-derived one");
});

/* ---- imported exams ---------------------------------------------------- */

function launchWithExams() {
  const app = launch({
    exams: [
      {
        id: "pt1",
        name: "Practice Test 1",
        questions: [
          { id: "pt1-q001", exam: "pt1", question: "Single?", options: ["a", "b", "c", "d"], answer: 1, explanation: "e" },
          { id: "pt1-q002", exam: "pt1", question: "Pick two?", options: ["a", "b", "c", "d", "e"], answers: [0, 3], explanation: "e" },
        ],
      },
    ],
  });
  return app;
}

test("imported exams are listed separately and never enter the question bank", () => {
  const app = launchWithExams();
  // bank totals must be untouched by the imported questions
  assert.ok(tab(app, "practice").includes("0 of 100 answered"), "the bank count excludes imported questions");
  const html = tab(app, "exams");
  assert.ok(html.includes("Imported practice tests"));
  assert.ok(html.includes("Practice Test 1"));
  assert.ok(html.includes('data-action="start-imported"'));
});

test("a multi-answer question lets you pick several options and says how many", () => {
  const app = launchWithExams();
  app.click("start-imported", { exam: "pt1" });
  app.click("next"); // move to the select-two question

  assert.ok(app.html().includes("Select 2 answers."), "the instruction is shown");
  app.click("select", { opt: "0" });
  app.click("select", { opt: "3" });

  // options render in shuffled display order, so compare as a set
  const selected = renderedOptions(app.html())
    .filter((o) => o.classes.includes("selected"))
    .map((o) => o.opt)
    .sort((a, b) => a - b);
  assert.deepEqual(selected, [0, 3], "both picks stay highlighted");

  app.click("select", { opt: "0" }); // clicking again removes it
  assert.deepEqual(
    renderedOptions(app.html())
      .filter((o) => o.classes.includes("selected"))
      .map((o) => o.opt)
      .sort((a, b) => a - b),
    [3]
  );
});

test("an imported exam is scored and recorded without touching bank progress", () => {
  const app = launchWithExams();
  app.click("start-imported", { exam: "pt1" });
  app.click("select", { opt: "1" }); // correct single answer
  app.click("next");
  app.click("select", { opt: "0" });
  app.click("select", { opt: "3" }); // correct pair
  app.click("submit");

  assert.ok(app.html().includes("score-ring"), "results are shown");
  const state = app.store().snapshot();
  assert.equal(state.history.length, 1, "the attempt is recorded");
  assert.equal(state.history[0].examName, "Practice Test 1");
  assert.equal(state.history[0].correct, 2, "both questions graded correct");
  assert.equal(state.correctEver.length, 0, "bank mastery is untouched");
  assert.equal(state.weak.length, 0, "the weak drill is untouched");
});

test("a partly answered multi-answer question counts as wrong", () => {
  const app = launchWithExams();
  app.click("start-imported", { exam: "pt1" });
  app.click("next");
  app.click("select", { opt: "0" }); // only one of the two
  app.click("submit");

  assert.equal(app.store().snapshot().history[0].correct, 0);
});

test("an imported exam can be practised with instant feedback before taking it", () => {
  const app = launchWithExams();
  tab(app, "exams");
  assert.ok(app.html().includes('data-action="practice-imported"'), "a practice button is offered");
  assert.ok(app.html().includes("Take mock"), "and a separate timed option");

  app.click("practice-imported", { exam: "pt1" });
  assert.ok(app.html().includes("Practice — Practice Test 1"), "titled by exam");
  assert.ok(!app.html().includes('id="timer"'), "practice is untimed");

  app.click("select", { opt: "1" }); // correct
  assert.ok(app.html().includes("Correct."), "explanation shown straight away");
  assert.ok(app.html().includes("feedback"), "feedback block rendered");
});

test("practising an imported exam leaves bank progress and score history alone", () => {
  const app = launchWithExams();
  app.click("practice-imported", { exam: "pt1" });
  app.click("select", { opt: "1" });
  app.click("next");
  app.click("select", { opt: "0" });
  app.click("select", { opt: "3" });
  app.click("submit");

  const state = app.store().snapshot();
  assert.equal(state.correctEver.length, 0, "imported questions never enter mastery");
  assert.equal(state.weak.length, 0, "nor the weak drill");
  assert.equal(state.history.length, 0, "a practice run is not an exam attempt");
});

test("a practice run over an imported exam can be exited and resumed", () => {
  const app = launchWithExams();
  app.click("practice-imported", { exam: "pt1" });
  app.click("select", { opt: "1" });
  app.click("quit");

  assert.ok(app.html().includes("Practice — Practice Test 1"), "the resume card names the exam");
  app.click("resume");
  assert.ok(app.html().includes('data-action="select"'), "resumes into the questions");
});

test("the home bank line counts what was answered and how much was right", () => {
  const app = launch();
  app.click("practice", { domain: "1", sub: "1.1" });
  app.click("select", { opt: "0" }); // right
  app.click("next");
  app.click("select", { opt: "1" }); // wrong
  app.click("quit");

  const html = tab(app, "practice");
  assert.ok(html.includes("2 of 100 answered"), "two questions counted as answered");
  assert.ok(html.includes("50% right on your last try"), "accuracy counts only what was attempted");
  assert.ok(!html.includes("Mastery") && !html.includes("Coverage"), "one plain line, no jargon");
});

test("old wrong answers count on the bank line, and right means right on the last try", () => {
  // Progress from before attempted was tracked: wrong answers live only in weak.
  const progress = { history: [], correctEver: ["d1-q1", "d1-q2"], weak: ["d1-q2", "d1-q3"], attempted: [] };
  const app = launch({ storage: { "ccarf.progress": JSON.stringify(progress) } });
  const html = tab(app, "practice");
  assert.ok(html.includes("3 of 100 answered"), "the wrong-only question is counted");
  assert.ok(html.includes("33% right on your last try"), "a question wrong since is not right");
});

test("a finished exam can be reviewed again from score history", () => {
  const app = launch();
  app.click("start-exam");
  completeSession(app);
  app.click("home");

  const attempt = app.store().snapshot().history[0];
  assert.ok(Array.isArray(attempt.items) && attempt.items.length, "the attempt keeps its questions");
  assert.ok(app.html().includes('data-action="review-attempt"'), "history offers a review button");

  app.click("review-attempt", { date: attempt.date });
  assert.ok(app.html().includes("correct answer"), "the stored attempt renders in review");
  assert.ok(app.html().includes("Review"), "review header shown");
});

test("reviewing a past attempt does not disturb current progress", () => {
  const app = launch();
  app.click("start-exam");
  completeSession(app);
  app.click("home");
  const before = JSON.stringify(app.store().snapshot());

  app.click("review-attempt", { date: app.store().snapshot().history[0].date });
  app.click("home");
  assert.equal(JSON.stringify(app.store().snapshot()), before, "nothing changed");
});

test("a question can be saved and later studied from the home screen", () => {
  const app = launch();
  app.click("start-exam");
  assert.ok(app.html().includes('aria-label="Save"'), "a save control is offered");

  app.click("toggle-saved");
  assert.ok(app.html().includes('aria-label="Saved"'), "the control reflects the saved state");
  assert.equal(app.store().snapshot().saved.length, 1);

  app.click("quit");
  tab(app, "practice");
  assert.match(app.html(), /data-action="start-saved"(?![^>]*disabled)/);
  app.click("start-saved");
  assert.ok(app.html().includes("Saved questions"), "the drill opens");
  assert.ok(app.html().includes('data-action="select"'));
});

test("saving the same question twice removes it", () => {
  const app = launch();
  app.click("start-exam");
  app.click("toggle-saved");
  app.click("toggle-saved");
  assert.equal(app.store().snapshot().saved.length, 0);
  assert.ok(app.html().includes('aria-label="Save"'));
});

test("the custom builder can narrow a domain to chosen subdomains", () => {
  const app = launch();
  app.click("custom-builder");
  assert.ok(app.html().includes('data-action="cq-open-subs"'), "subdomains can be opened");

  // keep only domain 2, then open it
  for (const d of [1, 3, 4, 5]) app.click("cq-domain", { domain: String(d) }, { checked: false });
  app.click("cq-open-subs", { domain: "2" });
  assert.ok(app.html().includes('data-action="cq-sub"'), "subdomain checkboxes render");
  assert.ok(app.html().includes("All (20)"), "whole domain while nothing is ticked");

  // the stub bank tags every question of a domain as <d>.1
  app.click("cq-sub", { key: "2|2.1" }, { checked: true });
  assert.ok(app.html().includes("Only the ticked subdomains are included."));

  app.click("cq-count", { count: "all" });
  app.click("start-custom");
  assert.ok(app.html().includes("Custom Quiz"), "the quiz starts from the filtered pool");
  assert.ok(app.html().includes("of 20"), "drawn only from the chosen subdomain");
});

test("deselecting everything refuses to start rather than drawing nothing", () => {
  const app = launch();
  app.click("custom-builder");
  for (const d of [1, 2, 3, 4, 5]) app.click("cq-domain", { domain: String(d) }, { checked: false });
  app.click("start-custom");
  assert.ok(!app.html().includes("Custom Quiz"), "no empty session is created");
});

test("imported questions are labelled by exam, never as an empty domain", () => {
  const app = launchWithExams();
  app.click("start-imported", { exam: "pt1" });
  const html = app.html();
  assert.ok(!html.includes("Dundefined"), "no broken domain chip");
  assert.ok(!html.includes("undefined"), "nothing undefined leaks into the markup");
  assert.ok(html.includes("Practice Test 1"), "the exam name is shown instead");
});

test("an imported result shows no empty per-domain breakdown", () => {
  const app = launchWithExams();
  app.click("start-imported", { exam: "pt1" });
  app.click("select", { opt: "1" });
  app.click("next");
  app.click("select", { opt: "0" });
  app.click("select", { opt: "3" });
  app.click("submit");

  const html = app.html();
  assert.ok(!html.includes("undefined"), "results stay clean");
  assert.ok(!html.includes("By domain"), "untagged questions get no domain card");
  assert.ok(html.includes("score-ring"), "the score is still shown");
});

test("bank questions keep their domain label", () => {
  const app = launch();
  app.click("start-exam");
  const html = app.html();
  assert.ok(/chip-d[1-5]/.test(html), "a real domain chip renders");
  assert.ok(!html.includes("undefined"));
});

test("practice lets a select-two question collect both picks before grading", () => {
  const app = launchWithExams();
  app.click("practice-imported", { exam: "pt1" });
  app.click("select", { opt: "1" }); // answer q1 first; practice gates Next
  app.click("next"); // the select-two question

  app.click("select", { opt: "0" }); // first of two correct
  assert.ok(!app.html().includes("Incorrect."), "one pick must not be graded yet");
  assert.ok(!app.html().includes("Correct."), "nor marked right yet");

  app.click("select", { opt: "3" }); // second correct pick
  assert.ok(app.html().includes("Correct."), "grades once both are chosen");
});

test("a wrong pair in practice is graded wrong, not on the first click", () => {
  const app = launchWithExams();
  app.click("practice-imported", { exam: "pt1" });
  app.click("select", { opt: "1" });
  app.click("next");

  app.click("select", { opt: "1" });
  assert.ok(!app.html().includes("Incorrect."), "still waiting for the second pick");
  app.click("select", { opt: "2" });
  assert.ok(app.html().includes("Incorrect."), "now it grades");
});

test("imported questions keep their written option order so lettered explanations line up", () => {
  const app = launchWithExams();
  app.click("start-imported", { exam: "pt1" });
  const order = renderedOptions(app.html()).map((o) => o.opt);
  assert.deepEqual(order, [0, 1, 2, 3], "imported options render in source order");
});

test("bank questions are still shuffled", () => {
  let shuffledAtLeastOnce = false;
  for (let i = 0; i < 8; i++) {
    const app = launch();
    app.click("start-exam");
    const order = renderedOptions(app.html()).map((o) => o.opt);
    if (order.join() !== "0,1,2,3") shuffledAtLeastOnce = true;
  }
  assert.ok(shuffledAtLeastOnce, "bank options must not be served in a fixed order");
});

/* The stub bank tags every question, so build one with both kinds. */
function launchMixed(storage) {
  return launch({
    storage,
    bank: (() => {
      const qs = [];
      // d*-q1..20 are mapped to a subdomain; d*-q21..40 are not
      for (let d = 1; d <= 5; d++) {
        for (let i = 1; i <= 40; i++) {
          const q = {
            id: `d${d}-q${i}`, domain: d,
            question: `Question ${d}-${i}?`, options: ["A", "B", "C", "D"],
            answer: 0, explanation: "Because.",
          };
          if (i <= 20) q.subdomain = `${d}.1 Sample subdomain`;
          qs.push(q);
        }
      }
      return qs;
    })(),
  });
}
const isMapped = (id) => Number(id.split("-q")[1]) <= 20;

test("unmapped questions are not offered: no supplementary exam and no untagged rows", () => {
  const app = launchMixed();
  tab(app, "practice");
  app.click("toggle-mastery", { domain: "1" });
  const html = app.html() + tab(app, "exams");
  assert.ok(html.includes('data-action="start-exam"'), "the mock exam is still offered");
  assert.ok(!html.includes('data-scope="unmapped"') && !html.includes("Supplementary"), "no supplementary exam");
  assert.ok(!html.includes('data-sub="general"') && !html.includes("Untagged"), "no untagged practice");
  assert.ok(html.includes("0 of 100 answered"), "bank counts mapped questions only");
});

test("the mock exam draws only mapped questions", () => {
  const app = launchMixed();
  app.click("start-exam");
  const ids = app.store().snapshot().session.questions.map((s) => s.id);
  assert.ok(ids.length > 0);
  assert.ok(ids.every(isMapped), "every drawn question is mapped to a subdomain");
});

test("domain practice leaves unmapped questions out", () => {
  const app = launchMixed();
  app.click("practice", { domain: "2" });
  assert.ok(app.store().snapshot().session.questions.map((s) => s.id).every(isMapped), "domain practice");
});

test("saved, missed and due lists skip unmapped questions kept from before", () => {
  const entry = { due: 0, step: 1, updatedAt: 1 };
  const due = { "d1-q30": entry, "d1-q2": entry };
  const app = launchMixed({ "ccarf.progress": JSON.stringify({
    history: [], attempted: ["d1-q1"], saved: ["d1-q25", "d1-q3"], weak: ["d1-q26", "d1-q27"], review: due,
  }) });
  const html = tab(app, "practice");
  assert.match(html, /Saved questions<\/span> <span class="muted">1</, "one saved question listed");
  assert.ok(!html.includes('data-action="start-weak"'), "only unmapped missed questions: no drill");
  assert.ok(html.includes("1 today"), "one question due, not two");
  app.click("start-saved");
  assert.deepEqual(app.store().snapshot().session.questions.map((s) => s.id), ["d1-q3"]);
});

test("search does not find unmapped questions", () => {
  const app = launchMixed();
  app.click("search");
  app.type("search-q", "Question 1-3");
  const html = app.html();
  assert.ok(html.includes("Question 1-3?"), "mapped question found");
  assert.ok(!/Question 1-3\d\?/.test(html), "unmapped 1-30..39 not found");
});

/* ------------------------------------------------------- scenario exams */
test("a scenario exam draws 60 questions from 4 scenarios", () => {
  const app = launch();
  app.click("start-scenario-exam");
  const sess = app.store().snapshot().session;
  assert.equal(sess.mode, "scenario");
  assert.equal(sess.questions.length, 60);
  assert.equal(sess.scenarioIds.length, 4);
  assert.ok(sess.questions.every((q) => q.order.join() === "0,1,2,3"), "options never shuffled");
});

test("striking an option keeps the answer, and striking again removes it", () => {
  const app = launch();
  app.click("start-scenario-exam");
  app.click("select", { opt: "2" });
  app.click("strike", { opt: "2" });
  let sess = app.store().snapshot().session;
  const id = sess.questions[0].id;
  assert.equal(sess.answers[id], 2);
  assert.deepEqual(sess.strikes[id], [2]);
  app.click("strike", { opt: "2" });
  sess = app.store().snapshot().session;
  assert.deepEqual(sess.strikes[id], []);
  assert.equal(sess.answers[id], 2);
});

test("resume keeps strikes, comments, flags and scenario order", () => {
  const storage = {};
  const app = launch({ storage, prompt: () => "check this later" });
  app.click("start-scenario-exam");
  app.click("strike", { opt: "1" });
  app.click("comment");
  app.click("toggle-flag");
  const before = app.store().snapshot().session;
  const id = before.questions[0].id;

  const again = launch({ storage });
  again.click("resume");
  const sess = again.store().snapshot().session;
  assert.deepEqual(sess.strikes[id], [1]);
  assert.equal(sess.comments[id], "check this later");
  assert.ok(sess.flagged[id]);
  assert.deepEqual(sess.questions.map((q) => q.id), before.questions.map((q) => q.id));
  assert.deepEqual(sess.scenarioIds, before.scenarioIds);
});

test("an empty comment removes it", () => {
  let text = "first";
  const app = launch({ prompt: () => text });
  app.click("start-scenario-exam");
  app.click("comment");
  text = "";
  app.click("comment");
  const sess = app.store().snapshot().session;
  assert.equal(sess.comments[sess.questions[0].id], undefined);
});

test("a submitted scenario exam is recorded apart from bank progress", () => {
  const app = launch({ prompt: () => "my note" });
  app.click("start-scenario-exam");
  app.click("comment");
  const first = app.store().snapshot().session.questions[0].id;
  app.click("submit");
  const snap = app.store().snapshot();
  assert.equal(snap.session, null);
  assert.deepEqual(snap.weak, []);
  assert.deepEqual(snap.attempted, []);
  assert.equal(snap.history.length, 1);
  const h = snap.history[0];
  assert.equal(h.kind, "scenario");
  assert.equal(h.examName, "Scenario exam");
  assert.equal(h.scenarioIds.length, 4);
  assert.equal(h.items.find((it) => it.id === first).comment, "my note");
});

test("the scenario exam refuses to start when fewer than 4 scenarios have 15 questions", () => {
  const app = launch({ scenarioBank: scenarioBank({ support: 16, ci: 16, research: 16, devprod: 10 }) });
  app.click("start-scenario-exam");
  assert.equal(app.store().snapshot().session, null);
});

/* ------------------------------------------------ two-panel exam screen */
function scenarioPanel(html) {
  const m = html.match(/<aside class="scn-panel"[\s\S]*?<\/aside>/);
  return m ? m[0] : "";
}

test("the scenario text sits on the left, the question only on the right", () => {
  const app = launch();
  app.click("start-scenario-exam");
  const sess = app.store().snapshot().session;
  const sid = sess.scenarioIds[0];
  const html = app.html();
  const panel = scenarioPanel(html);
  assert.ok(panel.includes(`Background text for ${sid}.`), "scenario text in the left panel");
  assert.ok(html.includes("Scenario 1 of 4"));
  assert.ok(html.includes("Question 1 of 60"));
  const qText = app.html().match(/Scenario question \S+ \d+\?/)[0];
  assert.equal(html.split(qText).length - 1, 1, "question text appears once");
  assert.ok(!panel.includes(qText), "question text is not in the scenario panel");
  assert.ok(html.includes('data-action="comment"') && html.includes('data-action="toggle-flag"'));
  assert.ok(html.includes('data-action="prev"') && html.includes('data-action="next"'));
});

test("a struck option renders crossed out and still selectable", () => {
  const app = launch();
  app.click("start-scenario-exam");
  app.click("strike", { opt: "3" });
  const btn = app.html().match(/<button[^>]*data-opt="3"[^>]*>/)[0];
  assert.match(btn, /class="[^"]*\bstruck\b/);
  assert.ok(!/disabled/.test(btn));
});

test("the scenario label follows the question across blocks", () => {
  const app = launch();
  app.click("start-scenario-exam");
  const sess = app.store().snapshot().session;
  app.click("jump", { index: "15" });
  assert.ok(app.html().includes("Scenario 2 of 4"));
  assert.ok(app.html().includes("Question 16 of 60"));
  assert.ok(scenarioPanel(app.html()).includes(`Background text for ${sess.scenarioIds[1]}.`));
});

test("a comment and a flag show in the top bar", () => {
  const app = launch({ prompt: () => "hmm" });
  app.click("start-scenario-exam");
  app.click("comment");
  app.click("toggle-flag");
  const html = app.html();
  assert.ok(html.includes("Flagged"));
  assert.ok(html.includes("💬 Comment ✓") || html.includes("Edit comment"));
});

/* ------------------------------------------------ review before submit */
function toLast(app) {
  app.click("jump", { index: "59" });
}

test("Next on the last question opens the review screen", () => {
  const app = launch();
  app.click("start-scenario-exam");
  toLast(app);
  app.click("next");
  assert.ok(app.html().includes('class="scn-review"'), "review screen shown");
  assert.ok(app.html().includes('data-action="submit"'));
});

test("the review screen groups tiles by scenario and filters flagged", () => {
  const app = launch();
  app.click("start-scenario-exam");
  const sess = app.store().snapshot().session;
  app.click("toggle-flag");
  app.click("jump", { index: "20" });
  app.click("toggle-flag");
  app.click("review-all");
  let html = app.html();
  for (const sid of sess.scenarioIds) assert.ok(html.includes(`Scenario ${sid}`));
  assert.equal((html.match(/class="tile /g) || []).length, 60);
  app.click("review-filter", { filter: "flagged" });
  html = app.html();
  assert.equal((html.match(/class="tile /g) || []).length, 2);
  app.click("review-filter", { filter: "unanswered" });
  assert.equal((app.html().match(/class="tile /g) || []).length, 60);
});

test("a tile jumps back to its question", () => {
  const app = launch();
  app.click("start-scenario-exam");
  app.click("review-all");
  app.click("jump", { index: "17" });
  assert.ok(app.html().includes("Question 18 of 60"));
});

test("submitting with unanswered questions asks first", () => {
  let asked = "";
  const app = launch({ confirm: (m) => { asked = m; return false; } });
  app.click("start-scenario-exam");
  app.click("select", { opt: "0" });
  app.click("review-all");
  app.click("submit");
  assert.match(asked, /59 unanswered/);
  assert.ok(app.store().snapshot().session, "cancelled submit keeps the session");
});

test("the deadline on the review screen submits the exam", () => {
  let now = Date.now();
  class FakeDate extends Date { static now() { return now; } }
  const app = launch({ Date: FakeDate });
  app.click("start-scenario-exam");
  app.click("select", { opt: "0" });
  app.click("review-all");
  now += 121 * 60 * 1000;
  app.tick();
  const snap = app.store().snapshot();
  assert.equal(snap.session, null);
  assert.equal(snap.history[0].correct, 1);
  assert.equal(snap.history[0].total, 60);
});

/* ---------------------------------------------------- scenario results */
function finishScenario(app, picks = (i) => (i % 3 === 0 ? 0 : 1)) {
  app.click("start-scenario-exam");
  for (let i = 0; i < 60; i++) {
    app.click("jump", { index: String(i) });
    app.click("select", { opt: String(picks(i)) });
  }
  app.click("submit");
}

test("scenario results show per-objective scores, weakest first", () => {
  const bankQs = scenarioBank();
  bankQs.forEach((q, i) => {
    q.subdomain = i % 2
      ? "4.5 Design efficient batch processing strategies"
      : "1.1 Design and implement agentic loops for autonomous task execution";
  });
  const app = launch({ scenarioBank: bankQs });
  finishScenario(app);
  const html = app.html();
  assert.ok(html.includes("By objective"));
  assert.ok(html.includes("By scenario"));
  const pcts = [...html.matchAll(/class="obj-row" data-pct="(\d+)"/g)].map((m) => Number(m[1]));
  assert.ok(pcts.length >= 2);
  assert.deepEqual(pcts, pcts.slice().sort((a, b) => a - b));
  assert.ok(!html.includes('data-action="retry-failed"'), "no retry that would feed the weak set");
});

test("the scenario review puts each note under its own option", () => {
  const app = launch({ prompt: () => "unsure here" });
  app.click("start-scenario-exam");
  app.click("comment");
  for (let i = 0; i < 60; i++) { app.click("jump", { index: String(i) }); app.click("select", { opt: "1" }); }
  app.click("submit");
  app.click("show-review");
  const html = app.html();
  assert.ok(html.includes('class="scn-panel"'), "scenario text on the left");
  for (const [opt, note] of [["Opt one", "Note one"], ["Opt two", "Note two"], ["Opt three", "Note three"], ["Opt four", "Note four"]]) {
    const re = new RegExp(`${opt}(?:(?!class="option)[\\s\\S])*?<div class="opt-note[^"]*">${note}<`);
    assert.match(html, re, `${note} sits with ${opt}`);
  }
  assert.ok(html.includes("Your comment") && html.includes("unsure here"));
});

test("a scenario attempt reopens from score history in the two-panel review", () => {
  const app = launch();
  finishScenario(app);
  app.click("home");
  const attempt = app.store().snapshot().history[0];
  app.click("review-attempt", { date: attempt.date });
  const html = app.html();
  assert.ok(html.includes('class="scn-panel"'));
  assert.ok(html.includes("Note two"));
});

test("a legacy history entry still opens the one-panel review", () => {
  const app = launch();
  app.click("start-exam");
  completeSession(app);
  app.click("home");
  const attempt = app.store().snapshot().history[0];
  app.click("review-attempt", { date: attempt.date });
  assert.ok(!app.html().includes('class="scn-panel"'));
  assert.ok(app.html().includes("correct answer"));
});

/* ------------------------------------------------- home + scenario practice */
test("the home screen offers the scenario exam and practice by scenario", () => {
  const app = launch();
  const html = app.html();
  assert.ok(html.includes("scenario exam"));
  assert.match(html, /data-action="start-scenario-exam"(?![^>]*disabled)/);
  assert.equal((tab(app, "practice").match(/data-action="practice-scenario"/g) || []).length, 6);
});

test("the scenario exam button waits until every scenario has 15 questions", () => {
  const app = launch({ scenarioBank: scenarioBank({ support: 16, ci: 16, research: 16, devprod: 16, codegen: 16, extraction: 10 }) });
  assert.match(app.html(), /data-action="start-scenario-exam"[^>]*disabled/);
  assert.ok(app.html().includes("available once every scenario has 15 questions"));
  assert.match(tab(app, "practice"), /data-action="practice-scenario" data-scenario="extraction"(?![^>]*disabled)/);
});

test("an empty scenario cannot be practised", () => {
  const app = launch({ scenarioBank: scenarioBank({ support: 3 }) });
  assert.match(tab(app, "practice"), /data-action="practice-scenario" data-scenario="ci"[^>]*disabled/);
});

test("scenario practice shows every option's note after answering", () => {
  const app = launch();
  app.click("practice-scenario", { scenario: "ci" });
  let html = app.html();
  assert.ok(html.includes('class="scn-panel"') && html.includes("Background text for ci."));
  assert.ok(!html.includes("Note one"), "no notes before answering");
  assert.ok(!html.includes('data-action="comment"'), "no comment button in practice");
  app.click("select", { opt: "1" });
  html = app.html();
  for (const n of ["Note one", "Note two", "Note three", "Note four"]) assert.ok(html.includes(n));
  assert.ok(html.includes("Incorrect."));
  app.click("select", { opt: "0" });
  assert.equal(app.store().snapshot().session.answers[app.store().snapshot().session.questions[0].id], 1, "answer locked after feedback");
});

test("scenario practice leaves the weak set and bank progress alone", () => {
  const app = launch();
  app.click("practice-scenario", { scenario: "support" });
  for (let i = 0; i < 16; i++) {
    app.click("select", { opt: "1" });
    app.click(i === 15 ? "submit" : "next");
  }
  const snap = app.store().snapshot();
  assert.equal(snap.session, null);
  assert.deepEqual(snap.weak, []);
  assert.deepEqual(snap.attempted, []);
  assert.equal(snap.history.length, 0);
});

test("missed exam questions can be practised from the results", () => {
  const app = launch();
  app.click("start-scenario-exam");
  app.click("select", { opt: "1" });
  app.click("submit");
  app.click("practice-missed");
  const sess = app.store().snapshot().session;
  assert.equal(sess.mode, "scenario-practice");
  assert.equal(sess.questions.length, 60);
});

/* ------------------------------------------------------- polish fixes */
test("right-click strikes an option straight away and right-click again undoes it", () => {
  const app = launch();
  app.click("start-scenario-exam");
  const id = app.store().snapshot().session.questions[0].id;
  app.rightClick(2);
  assert.deepEqual(app.store().snapshot().session.strikes[id], [2]);
  assert.match(app.html(), /class="option struck"[^>]*data-opt="2"/);
  assert.ok(app.html().includes("(struck through)"), "screen readers hear it");
  app.rightClick(2);
  assert.deepEqual(app.store().snapshot().session.strikes[id], []);
  app.rightClick();
  assert.deepEqual(app.store().snapshot().session.strikes[id], [], "right-click off an option does nothing");
  assert.ok(!app.html().includes("ctx-menu"), "no menu any more");
});

test("right-click does not strike in ordinary practice", () => {
  const app = launch();
  app.click("practice", { domain: "1" });
  app.rightClick(1);
  app.click("strike", { opt: "1" });
  assert.equal(Object.keys(app.store().snapshot().session.strikes).length, 0);
  assert.ok(!app.html().includes("strike-btn"), "no strike buttons either");
});

test("mock exams strike through on right-click too, and keep strikes on resume", () => {
  const storage = {};
  const app = launch({ storage });
  app.click("start-exam");
  const id = app.store().snapshot().session.questions[0].id;
  app.rightClick(3);
  assert.deepEqual(app.store().snapshot().session.strikes[id], [3]);
  assert.match(app.html(), /class="option struck"[^>]*data-opt="3"/);
  assert.equal((app.html().match(/class="strike-btn"/g) || []).length, 4, "touch buttons");
  assert.ok(app.html().includes("Right-click an option to strike it through"));
  app.click("select", { opt: "3" });
  assert.match(app.html(), /class="option selected struck"/, "a struck option can still be picked");
  app.click("quit");
  const again = launch({ storage });
  again.click("resume");
  assert.deepEqual(again.store().snapshot().session.strikes[id], [3]);
  again.rightClick(3);
  assert.deepEqual(again.store().snapshot().session.strikes[id], []);
});

test("a mock exam saved before strikes existed can still strike after resuming", () => {
  const storage = {};
  const app = launch({ storage });
  app.click("start-exam");
  const snap = JSON.parse(storage["ccarf.progress"]);
  delete snap.session.strikes; // as written by an older version
  storage["ccarf.progress"] = JSON.stringify(snap);
  const old = launch({ storage });
  old.click("resume");
  old.rightClick(0);
  const sess = old.store().snapshot().session;
  assert.deepEqual(sess.strikes[sess.questions[0].id], [0]);
});

test("the review filter starts at All again after resuming", () => {
  const app = launch();
  app.click("start-scenario-exam");
  app.click("review-all");
  app.click("review-filter", { filter: "flagged" });
  app.click("quit");
  app.click("resume");
  app.click("review-all");
  assert.equal((app.html().match(/class="tile /g) || []).length, 60);
});

test("scenario labels follow each question's scenario after a question is dropped", () => {
  const storage = {};
  const app = launch({ storage });
  app.click("start-scenario-exam");
  const sess = app.store().snapshot().session;
  const dropped = sess.questions[0].id;
  const second = sess.questions[15].id;
  const again = launch({ storage, scenarioBank: scenarioBank().filter((q) => q.id !== dropped) });
  again.click("resume");
  const idx = again.store().snapshot().session.questions.findIndex((q) => q.id === second);
  again.click("jump", { index: String(idx) });
  assert.ok(again.html().includes("Scenario 2 of 4"), "first question of block two still says scenario 2");
  again.click("review-all");
  const firstGroup = again.html().split('<h3 class="review-scn">')[1];
  assert.equal((firstGroup.match(/class="tile /g) || []).length, 14);
});

test("each option has a strike button for touch screens", () => {
  const app = launch();
  app.click("start-scenario-exam");
  const btns = app.html().match(/<button class="strike-btn"[^>]*data-action="strike"[^>]*>/g) || [];
  assert.equal(btns.length, 4);
});

/* ------------------------------------------------- spaced review wiring */
test("a wrong practice answer schedules the question for review", () => {
  const app = launch();
  app.click("practice", { domain: "2", sub: "2.1" });
  const id = app.store().snapshot().session.questions[0].id;
  app.click("select", { opt: "1" });
  const r = app.store().snapshot().review[id];
  assert.equal(r.step, 0);
  assert.ok(r.due > Date.now());
});

test("a correct answer to a question not under review changes nothing", () => {
  const app = launch();
  app.click("practice", { domain: "2", sub: "2.1" });
  app.click("select", { opt: "0" });
  assert.deepEqual(app.store().snapshot().review, {});
});

test("a wrong scenario-practice answer is scheduled too", () => {
  const app = launch();
  app.click("practice-scenario", { scenario: "ci" });
  const id = app.store().snapshot().session.questions[0].id;
  app.click("select", { opt: "2" });
  assert.equal(app.store().snapshot().review[id].step, 0);
});

test("unanswered exam questions are scheduled at submit", () => {
  const app = launch();
  app.click("start-scenario-exam");
  const sess = app.store().snapshot().session;
  app.click("select", { opt: "0" });
  assert.deepEqual(app.store().snapshot().review, {}, "nothing scheduled before submit");
  app.click("submit");
  const review = app.store().snapshot().review;
  assert.equal(Object.keys(review).length, 59);
  assert.ok(!review[sess.questions[0].id], "the correct one is not scheduled");
});

test("start-review runs a session over exactly the due questions", () => {
  const app = launch();
  const past = Date.now() - 1000;
  app.store().mutate({ key: null, apply: (s) => {
    s.review = {
      "sc-ci-1": { step: 0, due: past, updatedAt: 1 },
      "sc-support-2": { step: 1, due: past, updatedAt: 1 },
      "d1-q1": { step: 0, due: past, updatedAt: 1 },
      "sc-ci-3": { step: 0, due: Date.now() + 1e9, updatedAt: 1 },
      "sc-ci-4": { step: 3, due: past, updatedAt: 1, done: true },
    };
  } });
  app.click("start-review");
  const sess = app.store().snapshot().session;
  assert.equal(sess.mode, "scenario-practice", "scenario questions first");
  assert.deepEqual(sess.questions.map((q) => q.id).sort(), ["sc-ci-1", "sc-support-2"]);
});

/* ------------------------------------------------ diagnostic and drills */
test("the diagnostic is 2 scenarios x 10 with 40 minutes and is recorded as such", () => {
  const app = launch();
  const before = Date.now();
  app.click("start-diagnostic");
  const sess = app.store().snapshot().session;
  assert.equal(sess.questions.length, 20);
  assert.equal(sess.scenarioIds.length, 2);
  assert.ok(sess.deadline - before >= 40 * 60 * 1000 - 1000 && sess.deadline - before <= 40 * 60 * 1000 + 1000);
  assert.ok(app.html().includes("Scenario 1 of 2"));
  app.click("submit");
  const h = app.store().snapshot().history[0];
  assert.equal(h.diagnostic, true);
  assert.equal(h.kind, "scenario");
  assert.equal(h.examName, "Diagnostic");
  assert.equal(h.total, 20);
});

test("an objective drill is up to 8 scenario questions on that objective", () => {
  const bankQs = scenarioBank();
  bankQs.slice(0, 5).forEach((q) => { q.subdomain = "4.5 Design efficient batch processing strategies"; });
  const app = launch({ scenarioBank: bankQs });
  app.click("drill-objective", { sub: "4.5 Design efficient batch processing strategies" });
  const sess = app.store().snapshot().session;
  assert.equal(sess.mode, "scenario-practice");
  assert.equal(sess.questions.length, 5);
  assert.ok(app.html().includes("4.5"));
});

test("an objective with no scenario questions falls back to bank practice", () => {
  const app = launch();
  app.click("drill-objective", { sub: "3.1 Sample subdomain" });
  const sess = app.store().snapshot().session;
  assert.equal(sess.mode, "practice");
  assert.ok(sess.questions.length > 0);
});

/* ------------------------------------------------------- home redesign */
function seedHistory(app, scores, opts = {}) {
  app.store().mutate({ key: null, apply: (s) => {
    s.history = scores.map((score, i) => ({
      date: `2026-10-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`, score, pass: score >= 720,
      correct: 0, total: 60, perDomain: {}, examName: opts.name || "Scenario exam",
      kind: opts.kind === undefined ? "scenario" : opts.kind,
      items: opts.items || [],
    }));
  } });
  app.click("home");
}

test("a fresh visitor gets the diagnostic and no readiness number", () => {
  const app = launch();
  const html = app.html();
  assert.ok(html.includes('data-action="start-diagnostic"'));
  assert.ok(html.includes('data-action="start-scenario-exam"'), "can skip to the full exam");
  assert.ok(!html.includes("/ 1000 predicted"), "no prediction without data");
  assert.ok(html.includes('data-action="edit-exam-date"'));
});

test("a fresh visitor sees the same home sections as a returning one", () => {
  const app = launch();
  assert.ok(!app.html().includes("Next best step"), "no weak objectives without answers");
  const html = allTabs(app);
  for (const id of ["h-objectives", "h-practice", "h-history"]) assert.ok(html.includes('id="' + id + '"'), id);
  for (const a of ['data-action="toggle-mastery"', 'data-action="custom-builder"', 'data-action="search"']) assert.ok(html.includes(a), a);
  assert.ok(html.includes("will be listed here"), "empty lists explained in one line");
  assert.equal(html.split('data-action="practice-scenario"').length - 1, SCENARIOS.length, "each scenario listed once");
});

test("after an exam the readiness panel shows a weighted predicted score and verdict", () => {
  const app = launch();
  seedHistory(app, [600, 700, 800]);
  const html = app.html();
  assert.ok(!html.includes('data-action="start-diagnostic"'), "returning layout");
  assert.match(html, />717 ?</, "weighted score shown");
  assert.ok(html.includes("Borderline"));
  assert.ok(html.includes("last 3 exams"));
  assert.ok(html.includes("<polyline"), "trend chart drawn");
  assert.ok(html.includes('data-action="review-attempt"'), "last attempt can be reviewed");
});

test("imported-only history shows a score but no next step", () => {
  const app = launch();
  seedHistory(app, [800], { kind: null, name: "Practice Test 1", items: [{ id: "pt1-q001", given: 0 }] });
  const html = app.html();
  assert.match(html, />800 ?</);
  assert.ok(!html.includes("Next best step"));
});

test("the weakest objectives get drill buttons", () => {
  const app = launch();
  const items = [];
  for (let i = 1; i <= 5; i++) items.push({ id: `sc-ci-${i}`, given: 1 }); // all wrong, subdomain 1.1
  seedHistory(app, [500], { items });
  const html = app.html();
  assert.ok(html.includes("Next best step"));
  assert.match(html, /data-action="drill-objective" data-sub="1\.1 Design and implement agentic loops/);
});

test("a past exam date hides the countdown; a future one shows days left", () => {
  const app = launch();
  seedHistory(app, [700]);
  app.store().mutate({ key: "examDate", apply: (s) => { s.examDate = "2001-01-01"; } });
  app.click("home");
  assert.ok(!app.html().includes("days left"));
  /* Local date, as the app counts days in local time (UTC could be a day behind). */
  const t = new Date(Date.now() + 10 * 86400000);
  const pad = (n) => String(n).padStart(2, "0");
  const d = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
  app.store().mutate({ key: "examDate", apply: (s) => { s.examDate = d; } });
  app.click("home");
  assert.match(app.html(), /10 days left/);
});

test("the exam date can be set from the home page", () => {
  const d = new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10);
  const app = launch({ prompt: () => d });
  app.click("edit-exam-date");
  assert.equal(app.store().snapshot().examDate, d);
  const bad = launch({ prompt: () => "next week" });
  bad.click("edit-exam-date");
  assert.equal(bad.store().snapshot().examDate, null);
});

test("the returning home keeps every way in", () => {
  const app = launch();
  seedHistory(app, [700]);
  const html = allTabs(app);
  for (const a of ['data-action="start-scenario-exam"', 'data-action="start-exam"',
    'data-action="custom-builder"', 'data-action="practice-scenario"', 'data-action="search"',
    'data-action="toggle-mastery"']) assert.ok(html.includes(a), a);
  assert.ok(html.includes("By objective") && html.includes("Score history") && html.includes("Account"));
  tab(app, "practice");
  app.click("toggle-mastery", { domain: "2" });
  assert.ok(app.html().includes('data-action="practice" data-domain="2"'), "practice all is reachable");
  assert.ok(app.html().includes('data-action="drill-objective" data-sub="2.'), "objectives listed");
});

test("missed questions to drill appear only when there are some", () => {
  const app = launch();
  seedHistory(app, [700]);
  assert.ok(!tab(app, "practice").includes('data-action="start-weak"'));
  app.store().mutate({ key: null, apply: (s) => { s.weak = ["d1-q1"]; } });
  app.click("home");
  assert.ok(app.html().includes('data-action="start-weak"'), "the Practice tab stays open");
});

test("the due count reflects questions due for review", () => {
  const app = launch();
  seedHistory(app, [700]);
  app.store().mutate({ key: null, apply: (s) => {
    s.review = { "sc-ci-1": { step: 0, due: Date.now() - 1, updatedAt: 1 }, "sc-ci-2": { step: 0, due: Date.now() + 1e9, updatedAt: 1 } };
  } });
  app.click("home");
  assert.match(app.html(), /1 due/);
});

/* ------------------------------------------- home review follow-ups */
test("imported attempts never feed the weakest objectives", () => {
  const sub = "1.1 Design and implement agentic loops for autonomous task execution";
  const questions = [];
  for (let i = 1; i <= 6; i++) {
    questions.push({ id: `imp-${i}`, exam: "imp", subdomain: sub, question: `Imported ${i}?`,
      options: ["A", "B", "C", "D"], answer: 0, explanation: "x" });
  }
  const app = launch({ exams: [{ id: "imp", name: "Imported", questions }] });
  const items = questions.slice(0, 5).map((q) => ({ id: q.id, given: 1 }));
  seedHistory(app, [500], { kind: null, name: "Imported", items });
  assert.match(app.html(), />500 ?</, "the score still counts");
  assert.ok(!app.html().includes("Next best step"));
});

test("someone who has only practised still gets the full home", () => {
  const app = launch();
  app.store().mutate({ key: null, apply: (s) => { s.saved = ["d1-q1"]; } });
  app.click("home");
  const html = tab(app, "practice");
  assert.ok(html.includes('data-action="start-saved"'));
  assert.ok(html.includes('data-action="custom-builder"'));
});

test("each objective has one Practise button, and its bank questions follow the scenario set", () => {
  const app = launch();
  tab(app, "practice");
  app.click("toggle-mastery", { domain: "1" });
  const html = app.html();
  assert.ok(html.includes('data-action="drill-objective" data-sub="1.1 '), "one Practise button");
  assert.ok(!html.includes(">Bank<") && !html.includes(">Drill<"), "no separate Drill and Bank buttons");
  app.click("drill-objective", { sub: "1.1 Design and implement agentic loops for autonomous task execution" });
  completeSession(app);
  assert.ok(app.html().includes('data-action="practice" data-domain="1" data-sub="1.1"'), "more on this objective offered");
  assert.ok(app.html().includes("More on 1.1 · 20 questions"));
});

test("the top card has one main action, picked by where the user is", () => {
  const main = (html) => (html.match(/class="btn primary h-cta-main" data-action="([^"]+)"/) || [])[1];
  const fresh = launch();
  assert.equal(main(fresh.html()), "start-diagnostic", "a new visitor is pointed at the diagnostic");
  assert.equal((fresh.html().match(/h-cta-main/g) || []).length, 1, "only one main button");

  fresh.click("practice", { domain: "1" });
  fresh.click("select", { opt: "0" });
  fresh.click("quit");
  assert.equal(main(fresh.html()), "resume", "an unfinished session comes first");
  assert.ok(fresh.html().includes("Continue · 1/20") && fresh.html().includes("in progress"));
  assert.ok(!fresh.html().includes("resume-card"), "no separate resume card");

  const entry = { due: 0, step: 1, updatedAt: 1 };
  const due = launch({ storage: { "ccarf.progress": JSON.stringify({ attempted: ["d1-q1"], review: { "d1-q2": entry } }) } });
  assert.equal(main(due.html()), "start-review", "then questions due for review");
  assert.ok(due.html().includes("Review 1 due question<"));

  const plain = launch({ storage: { ...RETURNING } });
  assert.equal(main(plain.html()), "start-scenario-exam", "otherwise the full exam");
});

test("account & sync is a dropdown on the header chip, not a section at the bottom", () => {
  const signedOut = launch({ sync: { enabled: true, user: () => null } }).html();
  assert.match(signedOut, /<details class="h-menu acct-menu" id="h-acct"><summary class="btn ghost small"[^>]*>Sign in /);
  assert.ok(signedOut.includes('id="auth-email"'), "the sign-in form is inside the dropdown");
  assert.ok(!signedOut.includes("h-fold\" id=\"h-acct"), "no bottom section any more");
  assert.ok(signedOut.indexOf('id="h-acct"') < signedOut.indexOf("h-ready") || !signedOut.includes("h-ready"),
    "the dropdown sits in the header, above the page content");

  const { sync } = adminSync({ admin: false });
  const signedIn = launch({ sync }).html();
  assert.match(signedIn, /<summary class="signed-chip"[^>]*><span class="dot">●<\/span> <span class="chip-email">admin@example\.com/);
  assert.ok(signedIn.includes('data-action="auth-signout"'));
  assert.ok(!signedIn.includes("Visitor stats ↓"), "no admin link for a regular account");

  const noSync = launch().html();
  assert.ok(noSync.includes(">Backup "), "without sync the menu still offers the backup file");
  assert.ok(noSync.includes('data-action="export-progress"'));
});

test("the account dropdown stays open across a background sync redraw", () => {
  const { sync } = adminSync({ admin: false });
  const app = launch({ sync });
  const menuOpen = () => app.html().includes('<details class="h-menu acct-menu" id="h-acct" open>');
  assert.ok(!menuOpen(), "closed by default");
  app.toggle("h-acct", true);
  app.fireSyncEvent();
  assert.ok(menuOpen(), "still open after the redraw");
});

test("an admin's account dropdown links to the visitor stats", () => {
  const { sync } = adminSync({ stats: STATS });
  const html = launch({ sync }).html();
  assert.ok(html.includes('data-action="open-section" data-tab="today" data-id="h-visitors">Visitor stats ↓'));
});

const RESOURCES = [
  { id: "exam-guide", group: "Official", title: "The Exam Guide", url: "https://example.com/guide.pdf", star: true, start: true },
  { id: "course", group: "Official", title: "Intro <course>", url: "https://example.com/course", start: true },
  { id: "kit", group: "Study guides", title: "Study kit", url: "https://example.com/kit", note: "Notes" },
  { id: "src", group: "Practice & reviews", title: "Exam source", url: "https://example.com/src", exam: "imp" },
  { id: "bad", group: "Official", title: "Bad", url: "javascript:alert(1)" },
];

test("the Resources tab lists study resources, grouped, opening in a new tab", () => {
  const app = launch({ resources: RESOURCES, storage: { "ccarf.progress": JSON.stringify({ history: [], attempted: ["d1-q1"] }) } });
  const html = tab(app, "resources");
  assert.ok(html.includes('id="h-resources"'), "a study resources section");
  assert.equal((html.match(/class="h-row h-res"/g) || []).length, 4, "invalid entries are dropped");
  assert.ok(html.includes("Study guides") && html.includes("Practice &amp; reviews"));
  assert.ok(html.includes('href="https://example.com/kit" target="_blank" rel="noopener noreferrer"'));
  assert.ok(html.includes("Intro &lt;course&gt;"), "titles are escaped");
  assert.ok(!html.includes("javascript:"), "unsafe links never render");
});

test("without resources the section is left out", () => {
  const app = launch({ storage: { "ccarf.progress": JSON.stringify({ history: [], attempted: ["d1-q1"] }) } });
  assert.ok(!app.html().includes('id="h-resources"'));
});

test("the first visit points at the starting resources", () => {
  const app = launch({ resources: RESOURCES });
  const html = app.html();
  assert.ok(html.includes("Welcome"), "first-visit screen");
  assert.ok(html.includes("h-start"), "a start-here line");
  assert.ok(html.includes('href="https://example.com/guide.pdf"') && html.includes('href="https://example.com/course"'));
});

test("an imported exam links to its source resource", () => {
  const questions = bank().slice(0, 5).map((q) => Object.assign({}, q, { id: "imp-" + q.id, exam: "imp" }));
  const app = launch({
    resources: RESOURCES,
    exams: [{ id: "imp", name: "Imported", questions }],
    storage: { "ccarf.progress": JSON.stringify({ history: [], attempted: ["d1-q1"] }) },
  });
  const html = tab(app, "exams");
  const row = html.slice(html.indexOf('id="h-imported"'));
  assert.ok(row.includes('href="https://example.com/src"'), "source link on the imported exam row");
});

/* ---- click feedback ----------------------------------------------------- */
test("a slow action marks its button busy, shows it, then runs once", () => {
  const app = launch({ frames: true });
  const btn = app.click("practice", { domain: "3", sub: "3.1" });
  assert.ok(btn.classList.contains("is-busy"), "the clicked button shows it is working");
  assert.equal(btn.attrs["aria-busy"], "true");
  assert.ok(!app.html().includes('data-action="select"'), "the work waits for a frame so the mark can paint");

  app.click("practice", { domain: "2", sub: "2.1" });
  app.click("start-custom");
  app.flushFrames();
  assert.ok(app.html().includes('data-action="select"'), "the first click ran");
  assert.equal(app.store().snapshot().session.questions.every((s) => s.id.startsWith("d3-")), true,
    "the repeated clicks were dropped");
  assert.equal(app.appEl.dataset.busy, undefined, "busy clears once the screen is drawn");

  app.click("select", { opt: "0" });
  assert.ok(app.html().includes("Correct") || app.html().includes("correct"), "clicks work again afterwards");
});

test("a quick action runs straight away without the busy mark", () => {
  const app = launch({ frames: true, storage: { "ccarf.progress": JSON.stringify({ history: [], attempted: ["d1-q1"] }), "ccarf.tab": JSON.stringify("practice") } });
  const btn = app.click("toggle-mastery", { domain: "2" });
  assert.ok(!btn.classList.contains("is-busy"));
  assert.ok(app.html().includes('aria-expanded="true"'), "the toggle happened immediately");
});

test("an imported exam stays busy until its questions arrive, ignoring repeat clicks", async () => {
  const questions = bank().slice(0, 5).map((q) => Object.assign({}, q, { id: "lazy-" + q.id, exam: "lazy" }));
  const app = launch({ frames: true, examIndex: [{ id: "lazy", name: "Lazy exam", count: 5 }] });
  const btn = app.click("start-imported", { exam: "lazy" });
  app.flushFrames();
  assert.equal(app.scripts.length, 1, "the exam file is requested");
  assert.ok(btn.classList.contains("is-busy"), "still busy while the file loads");

  app.click("start-imported", { exam: "lazy" });
  app.flushFrames();
  assert.equal(app.scripts.length, 1, "a repeat click does not start a second load");

  app.win.MOCK_EXAMS = [{ id: "lazy", name: "Lazy exam", questions }];
  app.scripts[0].onload();
  await new Promise((r) => setImmediate(r));
  assert.ok(app.html().includes('data-action="select"'), "the exam opens once loaded");
  assert.equal(app.appEl.dataset.busy, undefined, "busy clears after the load");
});

test("a failed load clears busy so the user can try again", async () => {
  const app = launch({ frames: true, examIndex: [{ id: "lazy", name: "Lazy exam", count: 5 }] });
  const btn = app.click("start-imported", { exam: "lazy" });
  app.flushFrames();
  app.scripts[0].onerror();
  await new Promise((r) => setImmediate(r));
  assert.ok(!btn.classList.contains("is-busy"));
  assert.equal(app.appEl.dataset.busy, undefined);
  app.click("start-imported", { exam: "lazy" });
  app.flushFrames();
  assert.equal(app.scripts.length, 2, "a new click retries");
});

test("question shortcuts are ignored while an action is in progress", () => {
  const app = launch({ frames: true });
  app.click("practice", { domain: "3", sub: "3.1" });
  app.flushFrames();
  assert.ok(app.html().includes('data-action="select"'));
  app.click("submit");          // busy until its frame runs
  app.key("1");                 // would answer the current question
  assert.equal(app.store().snapshot().attempted.length, 0, "no answer slipped in while busy");
  app.flushFrames();
});

/* ---- full-height question screens ----------------------------------------- */
test("both question layouts render inside a full-height screen with the action bar last", () => {
  const app = launch();
  app.click("practice", { domain: "3", sub: "3.1" });
  let html = app.html();
  assert.ok(html.startsWith('<div class="q-screen quiz-screen">'), "standard layout is wrapped");
  assert.ok(html.trimEnd().endsWith("</div></div></div>"), "the footer closes the screen");
  assert.ok(html.lastIndexOf('class="quiz-footer"') > html.lastIndexOf('class="card question-card"'), "footer after the card");

  app.click("quit");
  app.click("practice-scenario", { scenario: "support" });
  html = app.html();
  assert.ok(html.startsWith('<div class="q-screen scn-screen">'), "scenario layout shares the screen class");
});

/* ---- sections stay as the user left them ---------------------------------- */
const RETURNING = { "ccarf.progress": JSON.stringify({ history: [], attempted: ["d1-q1"] }) };

test("home sections are tabs: Today first, one shown at a time", () => {
  const app = launch({ storage: { ...RETURNING } });
  let html = app.html();
  assert.match(html, /<nav class="h-tabs" aria-label="Sections">/);
  for (const t of ["today", "practice", "exams", "resources"]) assert.ok(html.includes('data-tab="' + t + '"'), t);
  assert.match(html, /data-tab="today" aria-current="page"/, "Today is shown first");
  assert.ok(html.includes("h-ready") && !html.includes('id="h-objectives"'), "only Today's content");

  html = tab(app, "practice");
  assert.match(html, /data-tab="practice" aria-current="page"/);
  assert.ok(html.includes('id="h-objectives"') && !html.includes("h-ready"), "only Practice's content");
  assert.equal((html.match(/aria-current="page"/g) || []).length, 1, "one tab marked current");
});

test("the open tab survives a quiz, a sync redraw and a reload; a bad one falls back to Today", () => {
  const app = launch({ storage: { ...RETURNING } });
  tab(app, "exams");
  app.click("start-exam");
  app.click("quit");
  assert.match(app.html(), /data-tab="exams" aria-current="page"/, "back on Exams after a quiz");
  app.fireSyncEvent();
  assert.match(app.html(), /data-tab="exams" aria-current="page"/, "and after a sync");
  assert.match(launch({ storage: { ...app.storage } }).html(), /data-tab="exams" aria-current="page"/, "and after a reload");
  assert.match(launch({ storage: { ...RETURNING, "ccarf.tab": JSON.stringify("nope") } }).html(), /data-tab="today" aria-current="page"/);
});

test("the Practice tab shows how many questions are due", () => {
  const entry = { due: 0, step: 1, updatedAt: 1 };
  const html = launch({ storage: { "ccarf.progress": JSON.stringify({ attempted: ["d1-q1"], review: { "d1-q2": entry, "d1-q3": entry } }) } }).html();
  assert.match(html, /data-tab="practice">[\s\S]*?<span class="h-tab-badge" aria-label="2 due">2<\/span>/);
});

test("a returning user without exams is pointed at the diagnostic for a score", () => {
  const html = launch({ storage: { ...RETURNING } }).html();
  assert.ok(html.includes("No predicted score yet"));
  assert.match(html, /h-no-score">[^]*data-action="start-diagnostic"/);
  const app = launch();
  seedHistory(app, [700]);
  assert.ok(!app.html().includes("No predicted score yet"), "gone once there is a score");
});

test("the Today card links to every exam on the Exams tab", () => {
  const app = launch({ storage: { ...RETURNING } });
  assert.ok(app.html().includes('data-action="tab" data-tab="exams">All exams →'));
  assert.ok(!app.html().includes("Other exams"), "no dropdown any more");
  const html = tab(app, "exams");
  for (const a of ["start-scenario-exam", "start-diagnostic", "start-exam"]) assert.ok(html.includes('data-action="' + a + '"'), a);
});

test("the admin Visitors section folds, and stays as left across redraws and reloads", () => {
  const { sync } = adminSync({ stats: STATS });
  const app = launch({ sync, storage: { ...RETURNING } });
  const visOpen = (html) => /id="h-visitors" open/.test(html);
  assert.ok(visOpen(app.html()), "open by default");
  app.toggle("h-visitors", false);
  app.toggle("h-acct", true);
  app.fireSyncEvent();
  assert.ok(!visOpen(app.html()), "stays closed after a redraw");
  assert.deepEqual(JSON.parse(app.storage["ccarf.folds"]), { "h-visitors": false }, "the account menu is not saved");
  assert.ok(!visOpen(launch({ sync, storage: { ...app.storage } }).html()), "and after a reload");
});

test("a broken saved fold state is ignored", () => {
  const { sync } = adminSync({ stats: STATS });
  const html = launch({ sync, storage: { ...RETURNING, "ccarf.folds": "not json" } }).html();
  assert.ok(/id="h-visitors" open/.test(html));
});

test("a collapsed scenario panel stays collapsed on the next question", () => {
  const app = launch();
  app.click("practice-scenario", { scenario: "support" });
  assert.ok(app.html().includes('<details id="scn-brief" open>'), "open by default");
  app.toggle("scn-brief", false);
  app.click("select", { opt: "0" });
  assert.ok(app.html().includes('<details id="scn-brief">'), "stays collapsed after answering");
  app.click("next");
  assert.ok(app.html().includes('<details id="scn-brief">'), "and on the next question");
});

/* ---- e-mail sign-in --------------------------------------------------------- */
async function sendSignIn(config) {
  const sent = [];
  const sync = { enabled: true, user: () => null, sendCode: async (e) => { sent.push(e); } };
  const app = launch({ sync, config, storage: { ...RETURNING }, inputs: { "auth-email": "me@example.com" } });
  const before = app.html();
  app.click("auth-send");
  await new Promise((r) => setImmediate(r));
  return { before, html: app.html(), sent };
}

test("by default sign-in is by link: the card says so and shows no code box", async () => {
  const { before, html, sent } = await sendSignIn(undefined);
  assert.ok(before.includes("Email me a sign-in link"));
  assert.deepEqual(sent, ["me@example.com"]);
  assert.ok(html.includes("We sent a sign-in e-mail to <strong>me@example.com</strong>"), "names the address");
  assert.ok(html.includes("<b>Open the link</b>"));
  assert.ok(html.includes("only signs in the browser where you click it"));
  assert.ok(!html.includes('id="auth-code"'), "no code box when the e-mail has no code");
  assert.ok(html.includes("Resend e-mail"));
});

test("with emailCode on, the card offers the code box after the guidance", async () => {
  const { before, html } = await sendSignIn({ emailCode: true });
  assert.ok(before.includes("Email me a sign-in code"));
  assert.ok(html.includes("<b>Enter the code</b>"));
  assert.ok(html.indexOf("auth-steps") < html.indexOf('id="auth-code"'), "guidance comes before the code box");
  assert.ok(html.includes('placeholder="Code from the e-mail"'), "no fixed code length");
});

/* ------------------------------------------------ time and pace */
test("time on each question is kept with the exam attempt", () => {
  let now = Date.now();
  class FakeDate extends Date { static now() { return now; } }
  const app = launch({ Date: FakeDate });
  app.click("start-exam");
  const first = app.store().snapshot().session.questions[0].id;
  now += 90 * 1000;
  app.click("select", { opt: "0" }); // re-render: the first 90 s are credited
  now += 30 * 1000;
  app.click("next");
  now += 45 * 1000;
  app.win.dispatchEvent({ type: "beforeunload", preventDefault() {} });
  app.click("submit");
  const items = app.store().snapshot().history[0].items;
  assert.equal(items[0].id, first);
  assert.equal(items[0].secs, 120);
  assert.equal(items[1].secs, 45);
  assert.equal(items[2].secs, undefined, "never shown, no time");
  assert.match(app.html(), /<h2>Time<\/h2><p>Average <strong>1:22<\/strong> per question/);
});

test("time away from an exited session does not count", () => {
  let now = Date.now();
  class FakeDate extends Date { static now() { return now; } }
  const storage = {};
  const app = launch({ Date: FakeDate, storage });
  app.click("start-exam");
  now += 60 * 1000;
  app.click("quit");
  now += 4 * 60 * 1000;
  const again = launch({ Date: FakeDate, storage });
  again.click("resume");
  now += 10 * 1000;
  again.click("next");
  const id = again.store().snapshot().session.questions[0].id;
  assert.equal(again.store().snapshot().session.timeSpent[id], 70 * 1000);
});

test("the pace hint appears once 3 questions behind", () => {
  let now = Date.now();
  class FakeDate extends Date { static now() { return now; } }
  const app = launch({ Date: FakeDate });
  app.click("start-scenario-exam");
  assert.match(app.html(), /<span id="pace" class="pace"[^>]*><\/span>/);
  now += 7 * 60 * 1000;
  app.click("next");
  assert.match(app.html(), /⏱ 3 behind pace/);
  assert.match(app.html(), /title="Aim for about 2:00 per question"/);
});

test("practice has no timer, no pace hint and no time card", () => {
  const app = launch();
  app.click("practice", { domain: "1" });
  assert.ok(!app.html().includes('id="pace"'));
  completeSession(app);
  assert.ok(!app.html().includes("<h2>Time</h2>"));
});

test("closing the tab mid-exam asks first; at home it does not", () => {
  const app = launch();
  let asked = 0;
  const unload = () => app.win.dispatchEvent({ type: "beforeunload", preventDefault() { asked++; } });
  unload();
  assert.equal(asked, 0, "home");
  app.click("practice", { domain: "1" });
  unload();
  assert.equal(asked, 0, "untimed practice");
  app.click("start-exam");
  unload();
  assert.equal(asked, 1, "timed exam");
});

/* ------------------------------------------------ report a problem */
test("the report link shows after answering in practice and in review, not mid-exam", () => {
  const app = launch();
  app.click("practice", { domain: "1" });
  assert.ok(!app.html().includes("report-link"), "not before answering");
  app.click("select", { opt: "0" });
  assert.match(app.html(), /class="h-link report-link" href="https:\/\/github\.com\/ahasan09\/ccarf-qb\/issues\/new\?title=Question%20d1-q/);
  app.click("start-exam");
  app.click("select", { opt: "0" });
  assert.ok(!app.html().includes("report-link"), "never during an exam");
  app.click("submit");
  app.click("show-review");
  assert.equal((app.html().match(/report-link/g) || []).length, 60);
});

test("scenario practice has the report link too", () => {
  const app = launch();
  app.click("practice-scenario", { scenario: "ci" });
  app.click("select", { opt: "1" });
  assert.ok(app.html().includes("report-link"));
});

/* ------------------------------------------------------------ search */
test("search lists matching bank and scenario questions as you type", () => {
  const app = launch();
  app.click("search");
  assert.ok(app.html().includes('id="search-q"'));
  app.type("search-q", "Question 2-1");
  const html = app.html();
  assert.match(html, /Question bank <span class="muted">\(11\)<\/span>/); // 2-1, 2-10 … 2-19
  assert.ok(!html.includes("Scenario questions"), "no scenario hits, no empty group");
  app.type("search-q", "ci 3");
  assert.match(app.html(), /Scenario questions <span class="muted">\(\d+\)/);
  app.type("search-q", "zzzz");
  assert.ok(app.html().includes("No questions match"));
});

test("practice the search matches: bank ones in practice, scenario ones in scenario practice", () => {
  const app = launch();
  app.click("search");
  app.type("search-q", "Question 2-1");
  app.click("practice-search", { pool: "bank" });
  let sess = app.store().snapshot().session;
  assert.equal(sess.mode, "practice");
  assert.equal(sess.questions.length, 11);
  assert.ok(app.html().includes("Search: “Question 2-1”"));
  app.click("quit");
  app.click("discard");
  app.click("search");
  assert.ok(app.html().includes('value="Question 2-1"'), "the query is kept");
  app.type("search-q", "scenario question ci");
  app.click("practice-search", { pool: "scenario" });
  sess = app.store().snapshot().session;
  assert.equal(sess.mode, "scenario-practice");
  assert.equal(sess.questions.length, 16);
});

/* ------------------------------------------------ backup file */
test("the account section offers download and import", () => {
  const app = launch();
  assert.ok(app.html().includes('data-action="export-progress"'));
  assert.ok(app.html().includes('id="import-file"'));
  app.click("export-progress"); // no Blob in the harness: must not throw
});

test("importing a backup file adds its progress after confirming", async () => {
  let asked = "";
  const app = launch({ confirm: (m) => { asked = m; return true; } });
  const file = JSON.stringify({ app: "ccarf-qb", progress: { attempted: ["d1-q1", "d1-q2"], correctEver: ["d1-q1"], history: [] } });
  const input = { id: "import-file", value: "C:\\fake\\file.json", files: [{ text: () => Promise.resolve(file) }] };
  app.appEl.dispatch("change", { target: input });
  await new Promise((r) => setImmediate(r));
  assert.match(asked, /0 exam attempts and 2 questions tried/);
  assert.deepEqual(app.store().snapshot().attempted, ["d1-q1", "d1-q2"]);
  assert.equal(input.value, "", "cleared so the same file can be picked again");
});

test("a file that is not a backup is refused and changes nothing", async () => {
  let said = "";
  const app = launch();
  const input = { id: "import-file", value: "", files: [{ text: () => Promise.resolve("{}") }] };
  app.setAlert((m) => { said = m; });
  app.appEl.dispatch("change", { target: input });
  await new Promise((r) => setImmediate(r));
  assert.match(said, /not a progress backup/);
  assert.equal(app.store().snapshot().attempted.length, 0);
});

/* ------------------------------------------------ keyboard focus */
test("a redraw puts focus back on the control that had it", () => {
  const app = launch();
  app.click("practice", { domain: "1" });
  const asked = [];
  let focused = 0;
  app.appEl.querySelector = (sel) => { asked.push(sel); return { focus: () => { focused++; } }; };
  app.doc.activeElement = { dataset: { action: "select", opt: "2" } };
  app.click("select", { opt: "2" });
  assert.equal(asked[0], '[data-action="select"][data-opt="2"]');
  assert.ok(focused >= 1);
});

test("quotes in a data value cannot break the focus selector", () => {
  const app = launch();
  let asked = null;
  app.appEl.querySelector = (sel) => { asked = sel; return null; };
  app.doc.activeElement = { dataset: { action: "toggle-mastery", domain: '1"]x' } };
  app.click("toggle-mastery", { domain: "1" });
  assert.equal(asked, '[data-action="toggle-mastery"][data-domain="1\\"]x"]');
});

test("nothing focused, nothing to restore", () => {
  const app = launch();
  let asked = 0;
  app.appEl.querySelector = () => { asked++; return null; };
  app.doc.activeElement = null;
  app.click("toggle-mastery", { domain: "1" });
  assert.equal(asked, 0);
});

/* ------------------------------------------------ shortcut hints */
test("the scenario exam shows the keyboard shortcuts in its bottom bar", () => {
  const app = launch();
  app.click("start-scenario-exam");
  const bottom = app.html().split('class="scn-bottom"')[1];
  assert.match(bottom, /<kbd>1<\/kbd>–<kbd>4<\/kbd> answer · <kbd>←<\/kbd>\/<kbd>→<\/kbd> navigate · <kbd>F<\/kbd> flag/);
});

test("practice hints show only the shortcuts that work there", () => {
  const app = launch();
  app.click("practice-scenario", { scenario: "ci" });
  assert.match(app.html(), /<kbd>1<\/kbd>–<kbd>4<\/kbd> answer · <kbd>→<\/kbd> next · <kbd>F<\/kbd> flag/);
  app.click("quit");
  app.click("discard");
  app.click("practice", { domain: "1" });
  assert.match(app.html(), /<kbd>1<\/kbd>–<kbd>4<\/kbd> answer · <kbd>→<\/kbd> next<\/span>/);
});

test("← in scenario practice does not reopen an answered question", () => {
  const app = launch();
  app.click("practice-scenario", { scenario: "ci" });
  app.click("select", { opt: "0" });
  app.click("next");
  app.key("ArrowLeft");
  assert.equal(app.store().snapshot().session.current, 1);
});

test("5 or E picks the fifth option; on a four-option question it does nothing", () => {
  const five = bank().map((q) => (q.domain === 1 ? Object.assign({}, q, { options: ["A", "B", "C", "D", "E"] }) : q));
  const app = launch({ bank: five });
  app.click("start-exam");
  const sess = () => app.store().snapshot().session;
  const firstFive = sess().questions.findIndex((s) => s.order.length === 5);
  const firstFour = sess().questions.findIndex((s) => s.order.length === 4);
  app.click("jump", { index: String(firstFive) });
  assert.ok(app.html().includes("<kbd>1</kbd>–<kbd>5</kbd> answer"));
  app.key("5");
  const q5 = sess().questions[firstFive];
  assert.equal(sess().answers[q5.id], q5.order[4]);
  app.click("jump", { index: String(firstFour) });
  app.key("e");
  assert.equal(sess().answers[sess().questions[firstFour].id], null);
});

/* ------------------------------------------------ admin visitor stats */
function adminSync({ admin = true, stats, statsError = "" } = {}) {
  const calls = { refresh: 0 };
  return {
    calls,
    sync: {
      enabled: true,
      user: () => ({ id: "u1", email: "admin@example.com" }),
      status: () => "synced",
      error: () => "",
      pendingCount: () => 0,
      syncedAt: () => 0,
      isAdmin: () => admin,
      visitorStats: () => stats,
      statsError: () => statsError,
      refreshStats: () => { calls.refresh++; },
    },
  };
}

const STATS = {
  windows: {
    now: { anonymous: 3, signedIn: 2 },
    day: { anonymous: 10, signedIn: 4 },
    week: { anonymous: 25, signedIn: 7 },
    month: { anonymous: 40, signedIn: 9 },
    all: { anonymous: 120, signedIn: 15 },
  },
  registered: 18,
};

test("an admin sees the visitors card with anonymous, signed-in and total counts", () => {
  const { sync } = adminSync({ stats: STATS });
  const app = launch({ sync });
  const html = app.html();
  assert.ok(html.includes("<b>Visitors</b>"));
  assert.ok(html.includes("admin · 5 active now"));
  assert.ok(html.includes("<td>Active now</td><td>3</td><td>2</td><td><strong>5</strong></td>"));
  assert.ok(html.includes("<td>All time</td><td>120</td><td>15</td><td><strong>135</strong></td>"));
  assert.ok(html.includes("18 registered accounts"));
});

test("the visitors card is hidden from signed-in non-admins and from signed-out visitors", () => {
  const { sync } = adminSync({ admin: false, stats: STATS });
  assert.ok(!launch({ sync }).html().includes("<b>Visitors</b>"));
  const signedOut = Object.assign({}, sync, { user: () => null, isAdmin: () => true });
  assert.ok(!launch({ sync: signedOut }).html().includes("<b>Visitors</b>"));
  /* An older sync adapter without the admin API must not break home. */
  const { isAdmin, ...legacy } = sync;
  assert.ok(!launch({ sync: legacy }).html().includes("<b>Visitors</b>"));
});

test("the visitors card refreshes on request and shows a failed refresh", () => {
  const { sync, calls } = adminSync({ stats: STATS, statsError: "Failed to fetch" });
  const app = launch({ sync });
  assert.ok(app.html().includes("Could not refresh: Failed to fetch"));
  app.click("refresh-visitors");
  assert.equal(calls.refresh, 1);
});

test("the visitors card says it is loading before the first counts arrive", () => {
  const { sync } = adminSync({ stats: null });
  const html = launch({ sync }).html();
  assert.ok(html.includes("<b>Visitors</b>"));
  assert.ok(html.includes("admin · 0 active now"));
  assert.ok(html.includes("Loading…"));
});

test("the account card says how visits are counted, unless counting is off", () => {
  const { sync } = adminSync({ admin: false });
  assert.ok(launch({ sync }).html().includes("Visits are counted with a random ID"));
  assert.ok(!launch({ sync, config: { countVisits: false } }).html().includes("Visits are counted with a random ID"));
  assert.ok(!launch().html().includes("Visits are counted with a random ID"));
});

test("score history is the last section on the Exams tab", () => {
  const html = tab(launchWithExams(), "exams");
  const at = (id) => html.indexOf('id="' + id + '"');
  assert.ok(at("h-exams") > 0 && at("h-imported") > at("h-exams"), "exams, then imported tests");
  assert.ok(at("h-history") > at("h-imported"), "score history last");
  assert.ok(html.indexOf("<section", at("h-history") + 1) === -1, "no section after score history");
});

test("the account menu closes on sign-out and on sign-in", () => {
  const { sync } = adminSync({ admin: false });
  const app = launch({ sync });
  const menuOpen = () => app.html().includes('<details class="h-menu acct-menu" id="h-acct" open>');
  app.toggle("h-acct", true);
  app.fireSyncEvent();
  assert.ok(menuOpen());
  app.fireSignOut();
  assert.ok(!menuOpen(), "closed after signing out");

  app.toggle("h-acct", true);
  app.win.dispatchEvent({ type: "ccarf:signin" });
  app.fireSyncEvent();
  assert.ok(!menuOpen(), "closed after signing in, even from another tab");
});

test("signing in from another tab clears the 'we sent you an e-mail' step", () => {
  let user = null;
  const sync = { enabled: true, user: () => user, status: () => "idle", error: () => "", sendCode: () => Promise.resolve() };
  const app = launch({ sync, inputs: { "auth-email": "me@example.com" } });
  app.click("auth-send");
  return Promise.resolve().then(() => {
    assert.ok(app.html().includes("We sent a sign-in e-mail"));
    user = { id: "u1", email: "me@example.com" };
    app.win.dispatchEvent({ type: "ccarf:signin" });
    user = null; // signed out again: the old pending e-mail must not come back
    app.fireSyncEvent();
    assert.ok(!app.html().includes("We sent a sign-in e-mail"));
  });
});

test("a rate-limited sign-in e-mail gets a plain explanation", () => {
  const sync = { enabled: true, user: () => null, status: () => "idle", error: () => "",
    sendCode: () => Promise.reject({ message: "email rate limit exceeded", status: 429, code: "over_email_send_rate_limit" }) };
  const app = launch({ sync, inputs: { "auth-email": "me@example.com" } });
  const alerts = [];
  app.setAlert((m) => alerts.push(m));
  const btn = app.click("auth-send");
  return new Promise((r) => setImmediate(r)).then(() => {
    assert.deepEqual(alerts, ["Too many sign-in e-mails were sent recently. Please try again in about an hour."]);
    assert.equal(btn.disabled, false, "the button works again");
  });
});

/* ---- search everywhere, quiet lists, labelled bars ------------------------ */
test("search sits in the header on every tab", () => {
  const app = launch({ storage: { ...RETURNING } });
  for (const t of ["today", "practice", "exams", "resources"]) {
    assert.match(tab(app, t), /<button class="h-search" data-action="search" aria-label="Search questions" aria-keyshortcuts="\/">/, t);
  }
  app.click("search");
  assert.ok(app.html().includes('id="search-q"'), "it opens the search screen");
});

test("/ opens search, but not mid-quiz or while typing", () => {
  const app = launch({ storage: { ...RETURNING } });
  app.key("/", { tagName: "INPUT", closest: () => null });
  assert.ok(!app.html().includes('id="search-q"'), "typing a slash into a box is just typing");
  app.key("/");
  assert.ok(app.html().includes('id="search-q"'), "from home");
  app.click("home");
  app.click("practice", { domain: "1" });
  app.key("/");
  assert.ok(!app.html().includes('id="search-q"') && app.html().includes('data-action="select"'), "not during a quiz");
});

test("practice lists appear only once they have something in them", () => {
  const entry = { due: 0, step: 1, updatedAt: 1 };
  let html = tab(launch({ storage: { ...RETURNING } }), "practice");
  for (const a of ["start-review", "start-saved", "start-weak"]) assert.ok(!html.includes('data-action="' + a + '"'), a + " hidden");
  assert.ok(html.includes("will be listed here"));
  html = tab(launch({ storage: { "ccarf.progress": JSON.stringify({ attempted: ["d1-q1"], saved: ["d1-q3"], review: { "d1-q2": entry } }) } }), "practice");
  assert.ok(html.includes('data-action="start-review"') && html.includes('data-action="start-saved"'));
  assert.ok(!html.includes('data-action="start-weak"') && !html.includes("will be listed here"));
  assert.ok(!/[⟳☆🔍]/u.test(html), "icons are SVG, not emoji");
});

test("objective bars say weak, close or on track, not just a colour", () => {
  const app = launch();
  seedHistory(app, [700]);
  const html = tab(app, "practice");
  assert.match(html, /class="h-meter" role="img" aria-label="(\d+% right, (weak|close|on track)|No answers yet)"/);
  assert.ok(html.includes("Green is on track"), "the colours are explained");
});

test("the theme button names the current theme", () => {
  const app = launch({ storage: { ...RETURNING } });
  assert.match(app.html(), /<span class="h-theme-label">Auto<\/span>/);
  app.click("cycle-theme");
  assert.match(app.html(), /aria-label="Theme: Light \(click for Dark\)">[^<]*<span class="h-theme-label">Light/);
});

/* ---- in-app dialogs ------------------------------------------------------- */
/* A stand-in for <dialog>: records what is shown and lets a test answer. */
function fakeDialog() {
  const d = {
    open: false, innerHTML: "", returnValue: "", field: null,
    showModal() { this.open = true; },
    close(v) { this.open = false; if (v !== undefined) this.returnValue = v; if (this.onclose) this.onclose(); },
    setAttribute() {}, removeAttribute() {},
    querySelector(sel) { return sel === "#dlg-input" ? this.field : null; },
    answer(ok, value) { if (this.field && value !== undefined) this.field.value = value; this.close(ok ? "ok" : ""); },
  };
  return d;
}

test("confirmations use the in-app dialog, not the browser's", () => {
  const dialog = fakeDialog();
  let native = 0;
  const app = launch({ dialog, confirm: () => { native++; return true; }, storage: { ...RETURNING } });
  app.click("practice", { domain: "1" });
  app.click("quit");
  assert.ok(dialog.open, "the dialog opens");
  assert.ok(dialog.innerHTML.includes("Keep going") && dialog.innerHTML.includes(">Exit<"), "plain button labels");
  dialog.answer(false);
  assert.ok(app.html().includes('data-action="select"'), "cancel keeps the quiz on screen");
  app.click("quit");
  dialog.answer(true);
  assert.ok(app.html().includes("h-tabs"), "yes goes home");
  assert.equal(native, 0, "the browser's confirm() is never used");
});

test("starting something new over a saved session asks, then starts it on yes", () => {
  const dialog = fakeDialog();
  const app = launch({ dialog, storage: { ...RETURNING } });
  app.click("practice", { domain: "1" });
  app.click("select", { opt: "0" });
  app.click("quit"); dialog.answer(true);
  app.click("start-exam");
  assert.ok(dialog.open && dialog.innerHTML.includes("Keep my session"));
  dialog.answer(false);
  assert.equal(app.store().snapshot().session.mode, "practice", "no keeps the old session");
  app.click("start-exam");
  dialog.answer(true);
  assert.equal(app.store().snapshot().session.mode, "exam", "yes starts the exam");
});

test("the exam date is picked with a date field", () => {
  const dialog = fakeDialog();
  dialog.field = { value: "" };
  const app = launch({ dialog, storage: { ...RETURNING } });
  app.click("edit-exam-date");
  assert.ok(dialog.innerHTML.includes('type="date"'), "a native date picker");
  dialog.answer(true, "2030-01-15");
  assert.equal(app.store().snapshot().examDate, "2030-01-15");
  app.click("edit-exam-date");
  dialog.answer(true, "");
  assert.equal(app.store().snapshot().examDate, null, "an empty date clears it");
});

/* ---- addresses: Back and Forward move between screens -------------------- */
/* A browser history: pushState/replaceState set the hash, back() and
 * forward() move along it and fire popstate as a browser does. */
function fakeBrowser(hash = "") {
  const location = { protocol: "file:", hostname: "", pathname: "/", search: "", hash };
  const entries = [hash];
  let at = 0;
  let fire = null;
  const history = {
    pushState(_s, _t, url) { entries.splice(at + 1); entries.push(url.startsWith("#") ? url : ""); at++; location.hash = entries[at]; },
    replaceState(_s, _t, url) { entries[at] = url.startsWith("#") ? url : ""; location.hash = entries[at]; },
    back() { if (at > 0) { at--; location.hash = entries[at]; fire(); } },
    forward() { if (at < entries.length - 1) { at++; location.hash = entries[at]; fire(); } },
    get length() { return entries.length; },
  };
  return { location, history, bind(app) { fire = () => app.firePopState(); return app; } };
}

test("each tab and screen has an address, and Back retraces them", () => {
  const b = fakeBrowser();
  const app = b.bind(launch({ location: b.location, history: b.history, storage: { ...RETURNING } }));
  assert.equal(b.location.hash, "", "Today is the plain address");
  tab(app, "practice");
  assert.equal(b.location.hash, "#/practice");
  tab(app, "exams");
  app.click("search");
  assert.equal(b.location.hash, "#/search");
  b.history.back();
  assert.match(app.html(), /data-tab="exams" aria-current="page"/, "Back returns to Exams");
  b.history.back();
  assert.match(app.html(), /data-tab="practice" aria-current="page"/);
  b.history.forward();
  assert.match(app.html(), /data-tab="exams" aria-current="page"/, "Forward works too");
});

test("Back during a quiz asks before leaving, and a finished quiz is skipped by Back", () => {
  const b = fakeBrowser();
  const dialog = fakeDialog();
  const app = b.bind(launch({ location: b.location, history: b.history, dialog, storage: { ...RETURNING } }));
  tab(app, "practice");
  app.click("practice", { domain: "1" });
  assert.equal(b.location.hash, "#/quiz");
  b.history.back();
  assert.ok(dialog.open, "asks first");
  dialog.answer(false);
  assert.equal(b.location.hash, "#/quiz", "staying puts the quiz back in the address");
  assert.ok(app.html().includes('data-action="select"'));
  b.history.back();
  dialog.answer(true);
  assert.match(app.html(), /data-tab="practice" aria-current="page"/, "leaving goes back to Practice");
  assert.ok(app.store().snapshot().session, "the session is kept to resume");

  app.click("resume");
  completeSession(app);
  assert.equal(b.location.hash, "#/results");
  b.history.back();
  assert.match(app.html(), /data-tab="practice" aria-current="page"/, "Back from results skips the finished quiz");
});

test("a bookmarked address opens that tab or screen", () => {
  const exams = fakeBrowser("#/exams");
  assert.match(launch({ location: exams.location, history: exams.history, storage: { ...RETURNING } }).html(), /data-tab="exams" aria-current="page"/);
  const search = fakeBrowser("#/search");
  assert.ok(launch({ location: search.location, history: search.history }).html().includes('id="search-q"'));
  const stale = fakeBrowser("#/results");
  assert.ok(launch({ location: stale.location, history: stale.history, storage: { ...RETURNING } }).html().includes("h-tabs"), "nothing to show: home");
});

test("practice alone fills the objective bars, and the line under each name gives both sources", () => {
  const guideBank = bank().map((q) => Object.assign({}, q,
    { subdomain: q.domain === 1 ? "1.1 Design and implement agentic loops for autonomous task execution" : q.subdomain }));
  const app = launch({ bank: guideBank });
  app.click("practice", { domain: "1", sub: "1.1" });
  app.click("select", { opt: "0" }); // right
  app.click("next");
  app.click("select", { opt: "1" }); // wrong
  app.click("quit");
  let html = tab(app, "practice");
  assert.match(html, /D1<\/span> <span>[^<]* <small class="h-score-line">Practice 50%<\/small>/, "domain line names its source");
  assert.match(html, /aria-label="50% right in practice, close"/, "the bar is filled from practice");
  assert.match(html, /D2<\/span> <span>[^<]* <small class="h-score-line">No answers yet/);

  app.click("toggle-mastery", { domain: "1" });
  html = app.html();
  assert.match(html, /1\.1 Design and implement agentic loops for autonomous task execution <small class="h-score-line">Practice 50%/, "objective line too");
});

test("after an exam, the weakest objectives can be practised straight from the results", () => {
  const app = launch();
  app.click("start-scenario-exam");
  completeSession(app, { correct: false });
  app.click("submit"); // from the scenario review screen
  let html = app.html();
  assert.ok(html.includes("Practise your weak spots"));
  assert.match(html, /class="weak-spot">[^]*?data-action="drill-objective" data-sub="1\.1 Design and implement agentic loops/);
  assert.ok(html.indexOf("Practise your weak spots") < html.indexOf("By objective"), "it comes right after the score");

  const good = launch();
  good.click("start-scenario-exam");
  completeSession(good, { correct: true });
  good.click("submit");
  html = good.html();
  assert.ok(html.includes("at 72% or above") && !html.includes('class="weak-spot"'), "nothing weak: says so");
});

test("with an exam date set, Today gives a daily target", () => {
  const inTen = new Date(Date.now() + 10 * 86400000);
  const date = inTen.getFullYear() + "-" + String(inTen.getMonth() + 1).padStart(2, "0") + "-" + String(inTen.getDate()).padStart(2, "0");
  const html = launch({ storage: { "ccarf.progress": JSON.stringify({ attempted: ["d1-q1", "d1-q2"], examDate: date }) } }).html();
  assert.match(html, /<span class="h-plan">About 10 new questions a day covers the rest of the bank \(98 left\)\.<\/span>/);
  assert.ok(!launch({ storage: { ...RETURNING } }).html().includes("h-plan"), "no date, no plan");
});

test("answering questions builds Your week on Today", () => {
  const app = launch({ storage: { ...RETURNING } });
  assert.ok(!app.html().includes('id="h-week"'), "hidden before any activity");
  app.click("practice", { domain: "1" });
  app.click("select", { opt: "0" });
  app.click("next");
  app.click("select", { opt: "0" });
  app.click("quit");
  tab(app, "today");
  const html = app.html();
  assert.ok(html.includes('id="h-week"'));
  assert.ok(html.includes("<b>1-day streak</b> · 2 today · 2 this week"));
  assert.equal((html.match(/class="h-day /g) || []).length, 7, "seven days");
  assert.match(html, /class="h-day lvl4 today"/, "today is marked and filled");
});

test("score history also renders as cards for phones", () => {
  const app = launch();
  seedHistory(app, [650, 760]);
  const html = tab(app, "exams");
  assert.ok(html.includes('class="table-scroll history-scroll"'), "the table for wide screens");
  assert.equal((html.match(/class="history-card"/g) || []).length, 2, "one card per attempt");
  assert.match(html, /class="hc-score"><strong>760<\/strong> <span class="badge pass">PASS/);
});

/* ---- screen readers on the question screens ------------------------------ */
test("screen readers hear the new question and the grade, and options say which was right", () => {
  const live = { textContent: "" };
  const app = launch({ live, storage: { ...RETURNING } });
  app.click("practice", { domain: "1" });
  assert.equal(live.textContent, "Question 1 of 20");
  app.click("toggle-saved");
  assert.equal(live.textContent, "Question 1 of 20", "a redraw of the same question stays quiet");
  app.click("select", { opt: "1" }); // wrong; the bank's answer is option 0
  assert.match(live.textContent, /^Incorrect\. The correct answer is [A-D]: A\. The explanation follows the options\.$/);
  const html = app.html();
  assert.match(html, /<span class="tag">correct answer<\/span>/);
  assert.match(html, /<span class="tag">your answer<\/span>/);
  assert.ok(!/class="feedback[^"]*" role="status"/.test(html), "no live region drawn along with its text");
  app.click("next");
  assert.equal(live.textContent, "Question 2 of 20");
  app.click("select", { opt: "0" });
  assert.equal(live.textContent, "Correct.");
});

test("the exam timer stays quiet but says when 10, 5 and 1 minutes are left", () => {
  const live = { textContent: "" };
  let now = Date.now();
  const FakeDate = class extends Date { constructor(...a) { super(...(a.length ? a : [now])); } static now() { return now; } };
  const app = launch({ live, Date: FakeDate, storage: { ...RETURNING } });
  app.click("start-exam");
  const html = app.html();
  assert.ok(html.includes('role="timer"') && !/id="pace"[^>]*role="status"/.test(html), "pace is not a live region");
  const deadline = app.store().snapshot().session.deadline;
  const at = (msLeft) => { now = deadline - msLeft; app.tick(); };
  at(11 * 60000); assert.equal(live.textContent, "Question 1 of 60");
  at(9.5 * 60000); assert.equal(live.textContent, "10 minutes left.");
  at(9 * 60000); assert.equal(live.textContent, "10 minutes left.", "said once");
  at(4.5 * 60000); assert.equal(live.textContent, "5 minutes left.");
  at(30000); assert.equal(live.textContent, "1 minute left.");
});

test("the welcome card is short: one action, one sentence, an optional date", () => {
  const html = launch({ resources: RESOURCES }).html();
  const card = html.slice(html.indexOf('class="card h-ready h-first"'), html.indexOf("</section>", html.indexOf("h-first")));
  assert.equal((card.match(/h-cta-main/g) || []).length, 1, "one main button");
  assert.ok(card.includes('data-action="start-diagnostic"') && card.includes("or take the full scenario exam"));
  assert.ok(!card.includes("h-steps") && !card.includes("All exams"), "no step boxes, no extra links");
  assert.ok(card.includes("Optional: set your exam date") && card.includes('data-action="edit-exam-date"'));
  assert.ok(card.includes("h-start"), "the starting resources stay");
});

test("adjacent inline elements get a space, so words never run together without CSS", () => {
  const app = launch({ storage: { ...RETURNING, "ccarf.progress": JSON.stringify({ attempted: ["d1-q1"], saved: ["d1-q1"] }) } });
  const html = tab(app, "practice");
  const text = html.replace(/<[^>]+>/g, "");          // what an unstyled reader gets
  assert.ok(text.includes("Saved questions 1"), "label and count apart");
  assert.ok(/Agentic Architecture &amp; Orchestration No answers yet/.test(text), "name and score line apart");
  assert.ok(!/Practice all of D1\d/.test(text), "row label and count apart");
  app.click("practice", { domain: "1" });
  assert.ok(app.html().includes('<span class="opt-letter"></span>'), "an empty marker gets no stray space");
});

/* ---- the unmapped archive is fetched only when needed --------------------- */
test("a normal visit never fetches the unmapped archive", async () => {
  const app = launch({ storage: { ...RETURNING } });
  await new Promise((r) => setImmediate(r));
  assert.equal(app.scripts.filter((t) => /questions\/unmapped\//.test(t.src)).length, 0);
});

test("an old attempt with archived questions fetches the archive, then can be reviewed", async () => {
  const old = { id: "old-q1", domain: 1, question: "Archived?", options: ["A", "B", "C", "D"], answer: 0, explanation: "Because." };
  const entry = { date: "2026-10-01T10:00:00.000Z", score: 500, pass: false, correct: 1, total: 1, examName: "Supplementary mock",
    items: [{ id: "old-q1", given: 0 }] };
  const app = launch({ storage: { "ccarf.progress": JSON.stringify({ history: [entry] }) } });
  await new Promise((r) => setImmediate(r));
  const asked = app.scripts.filter((t) => /questions\/unmapped\//.test(t.src));
  assert.equal(asked.length, 10, "the ten archived files are requested");
  app.window.QUESTION_BANK.push(old);                // what the files do when they load
  asked.forEach((t) => t.onload());
  await new Promise((r) => setImmediate(r));
  app.click("review-attempt", { date: entry.date });
  assert.ok(app.html().includes("Archived?"), "the old attempt opens");
  tab(app, "practice");
  assert.ok(!app.html().includes("Archived?") && app.html().includes("0 of 100 answered"), "archived questions stay hidden");
});

/* ---- question top bar on phones ------------------------------------------ */
test("the question top bar has a short counter and named icon buttons for phones", () => {
  const app = launch({ storage: { ...RETURNING } });
  app.click("start-exam");
  let html = app.html();
  assert.match(html, /<span class="lbl-short">1 \/ 60<\/span>/, "short counter");
  assert.match(html, /<strong class="lbl-long">Mock Exam<\/strong>/, "full title for wide screens");
  for (const name of ["Flag for review", "Save", "Exit"]) assert.ok(html.includes('aria-label="' + name + '"'), name + " keeps its name");
  app.click("quit");
  app.click("start-scenario-exam");
  html = app.html();
  assert.match(html, /<span class="lbl-short"><b>S1<\/b> · 1 \/ 60<\/span>/, "scenario and question");
  assert.ok(html.includes('aria-label="Comment"'));
});

test("on a phone the scenario text folds after the first question of each scenario", () => {
  const narrow = { matchMedia: () => ({ matches: true }) };
  const app = launch({ storage: { ...RETURNING }, win: narrow });
  app.click("start-scenario-exam");
  const open = () => /<details id="scn-brief" open>/.test(app.html());
  assert.ok(open(), "shown in full on the first question");
  app.click("next");
  assert.ok(!open(), "folded on the next one");
  app.toggle("scn-brief", true);
  app.click("toggle-flag");                            // any redraw of the same question
  assert.ok(open(), "once opened it stays open on that question");
  const sess = app.store().snapshot().session;
  const firstOfNext = sess.questions.findIndex((s, i) => i > 0 && s.id.split("-")[1] !== sess.questions[0].id.split("-")[1]);
  app.click("jump", { index: String(firstOfNext) });
  assert.ok(open(), "a new scenario starts open again");

  const wide = launch({ storage: { ...RETURNING } });
  wide.click("start-scenario-exam");
  wide.click("next");
  assert.ok(/<details id="scn-brief" open>/.test(wide.html()), "wide screens keep it open");
});

test("exam bottom bars have short labels for phones and keep their full names", () => {
  const app = launch({ storage: { ...RETURNING } });
  app.click("start-scenario-exam");
  let html = app.html();
  assert.ok(html.includes('aria-label="Previous question"'), "the arrow-only Previous is named");
  assert.match(html, /<span class="lbl-long">Answered 0 of 60 · Flagged 0<\/span> ?<span class="lbl-short">0\/60<\/span>/);
  assert.match(html, /<span class="lbl-long">Review all<\/span> ?<span class="lbl-short">Review<\/span>/);
  app.click("toggle-flag");
  assert.match(app.html(), /<span class="lbl-short">0\/60 · ⚑1<\/span>/, "flags show once there are some");
  app.click("quit");
  app.click("start-exam");
  html = app.html();
  assert.match(html, /<span class="lbl-long">Submit exam<\/span> ?<span class="lbl-short">Submit<\/span>/);
});

test("a sign-in link's tokens stay in the address for the Supabase client", () => {
  const tokens = "#access_token=abc&expires_in=3600&refresh_token=def&token_type=bearer&type=magiclink";
  const b = fakeBrowser(tokens);
  const app = b.bind(launch({ location: b.location, history: b.history, storage: { ...RETURNING } }));
  assert.equal(b.location.hash, tokens, "the router must not rewrite the address before Supabase reads it");
  assert.match(app.html(), /data-tab="today" aria-current="page"/, "the page still opens normally");
  assert.ok(!app.html().includes("auth-notice"));
});

test("a refused sign-in link opens the account menu with the reason and cleans the address", () => {
  const b = fakeBrowser("#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired");
  const sync = { enabled: true, user: () => null, status: () => "idle", error: () => "", sendCode: () => Promise.resolve() };
  const app = b.bind(launch({ location: b.location, history: b.history, sync, inputs: { "auth-email": "me@example.com" } }));
  assert.equal(b.location.hash, "", "the error is taken out of the address");
  assert.ok(app.html().includes('<details class="h-menu acct-menu" id="h-acct" open>'), "the account menu is open");
  assert.match(app.html(), /class="auth-notice" role="alert">That sign-in link has expired or was already used/);
  app.click("auth-send");
  return Promise.resolve().then(() => {
    assert.ok(!app.html().includes("auth-notice"), "asking for a new link clears the notice");
  });
});

test("taking an imported exam does not add to the week or the streak", () => {
  const app = launchWithExams();
  app.click("start-imported", { exam: "pt1" });
  app.click("select", { opt: "1" });
  app.click("next");
  app.click("select", { opt: "0" });
  app.click("select", { opt: "3" });
  app.click("submit");
  app.click("home");

  const activity = app.store().snapshot().activity || {};
  const logged = Object.keys(activity).reduce((n, d) => n + activity[d].length, 0);
  assert.equal(logged, 0, "imported answers are not filed as study activity");
  assert.ok(!tab(app, "today").includes("Your week"), "so the week card stays hidden");
});

test("answering a bank question still counts toward the week", () => {
  const app = launchWithExams();
  app.click("practice", { domain: "1", sub: "1.1" });
  app.click("select", { opt: "0" });
  app.click("quit");

  const activity = app.store().snapshot().activity || {};
  const logged = Object.keys(activity).reduce((n, d) => n + activity[d].length, 0);
  assert.equal(logged, 1, "a bank answer is filed");
  assert.ok(tab(app, "today").includes("Your week"), "and the card appears");
});
