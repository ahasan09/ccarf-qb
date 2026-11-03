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
    location: { protocol: "file:", hostname: "" },
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
    fireSyncEvent: () => win.dispatchEvent(new ctx.CustomEvent("ccarf:auth")),
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
    key: (key) => {
      const ev = { key, preventDefault() {}, target: { tagName: "BODY", closest: () => null } };
      (docListeners.keydown || []).forEach((fn) => fn(ev));
    },
  };
}

/* Answer every question of the current session, finishing it. */
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
  assert.ok(app.html().includes("Imported mock exams"));
  assert.ok(app.html().includes("Practice Test 1"));
  assert.ok(app.html().includes('data-action="start-imported"'));
  // bank totals must be untouched by the imported questions
  assert.ok(app.html().includes("100 domain questions"), "the bank count excludes imported questions");
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

test("the progress card separates coverage, accuracy and mastery", () => {
  const app = launch();
  app.click("practice", { domain: "1", sub: "1.1" });
  app.click("select", { opt: "0" }); // right
  app.click("next");
  app.click("select", { opt: "1" }); // wrong
  app.click("quit");

  const html = app.html();
  assert.ok(html.includes("Coverage"), "coverage tile present");
  assert.ok(html.includes("Accuracy"), "accuracy tile present");
  assert.ok(html.includes("Mastery"), "mastery tile present");
  assert.ok(html.includes("2 of 100 seen"), "two questions counted as seen");
  assert.ok(html.includes("1 of 2 right"), "accuracy counts only what was attempted");
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
  assert.ok(app.html().includes("☆ Save"), "a save control is offered");

  app.click("toggle-saved");
  assert.ok(app.html().includes("★ Saved"), "the control reflects the saved state");
  assert.equal(app.store().snapshot().saved.length, 1);

  app.click("quit");
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
  assert.ok(app.html().includes("☆ Save"));
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
function launchMixed() {
  return launch({
    bank: (() => {
      const qs = [];
      // both pools need enough per domain to fill a 60-question draw
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

test("the home screen offers both a mapped and a supplementary mock exam", () => {
  const app = launchMixed();
  const html = app.html();
  assert.ok(html.includes('data-scope="mapped"'), "the main exam is mapped-only");
  assert.ok(html.includes('data-scope="unmapped"'), "a supplementary exam is offered");
  assert.ok(html.includes("Supplementary mock exam"));
  assert.ok(html.includes("exam-guide mapped"), "the split is stated");
});

test("the main mock exam never includes an unmapped question", () => {
  const app = launchMixed();
  app.click("start-exam", { scope: "mapped" });
  const ids = app.store().snapshot().session.questions.map((s) => s.id);
  const bank = app.bank();
  assert.ok(ids.length > 0);
  assert.ok(
    ids.every((id) => bank.find((q) => q.id === id).subdomain),
    "every drawn question is mapped to a subdomain"
  );
});

test("the supplementary exam draws only unmapped questions", () => {
  const app = launchMixed();
  app.click("start-exam", { scope: "unmapped" });
  assert.ok(app.html().includes("Supplementary Mock Exam"), "titled distinctly");
  const ids = app.store().snapshot().session.questions.map((s) => s.id);
  const bank = app.bank();
  assert.ok(
    ids.every((id) => !bank.find((q) => q.id === id).subdomain),
    "every drawn question is unmapped"
  );
});

test("a supplementary attempt is labelled in score history", () => {
  const app = launchMixed();
  app.click("start-exam", { scope: "unmapped" });
  completeSession(app);
  const attempt = app.store().snapshot().history[0];
  assert.equal(attempt.examName, "Supplementary mock");
  assert.equal(attempt.examId, null, "it is not an imported exam");
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
  assert.equal((html.match(/data-action="practice-scenario"/g) || []).length, 6);
});

test("the scenario exam button waits until every scenario has 15 questions", () => {
  const app = launch({ scenarioBank: scenarioBank({ support: 16, ci: 16, research: 16, devprod: 16, codegen: 16, extraction: 10 }) });
  assert.match(app.html(), /data-action="start-scenario-exam"[^>]*disabled/);
  assert.ok(app.html().includes("available once every scenario has 15 questions"));
  assert.match(app.html(), /data-action="practice-scenario" data-scenario="extraction"(?![^>]*disabled)/);
});

test("an empty scenario cannot be practised", () => {
  const app = launch({ scenarioBank: scenarioBank({ support: 3 }) });
  assert.match(app.html(), /data-action="practice-scenario" data-scenario="ci"[^>]*disabled/);
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

test("after an exam the readiness panel shows a weighted predicted score and verdict", () => {
  const app = launch();
  seedHistory(app, [600, 700, 800]);
  const html = app.html();
  assert.ok(!html.includes('data-action="start-diagnostic"'), "returning layout");
  assert.ok(html.includes(">717<"), "weighted score shown");
  assert.ok(html.includes("Borderline"));
  assert.ok(html.includes("last 3 exams"));
  assert.ok(html.includes("<polyline"), "trend chart drawn");
  assert.ok(html.includes('data-action="review-attempt"'), "last attempt can be reviewed");
});

test("imported-only history shows a score but no next step", () => {
  const app = launch();
  seedHistory(app, [800], { kind: null, name: "Practice Test 1", items: [{ id: "pt1-q001", given: 0 }] });
  const html = app.html();
  assert.ok(html.includes(">800<"));
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
  const html = app.html();
  for (const a of ['data-action="start-scenario-exam"', 'data-scope="mapped"', 'data-scope="unmapped"',
    'data-action="custom-builder"', 'data-action="practice-scenario"', 'data-action="start-review"',
    'data-action="start-saved"', 'data-action="toggle-mastery"']) assert.ok(html.includes(a), a);
  assert.ok(html.includes("By objective") && html.includes("Score history") && html.includes("Account"));
  app.click("toggle-mastery", { domain: "2" });
  assert.ok(app.html().includes('data-action="practice" data-domain="2"'), "practice all is reachable");
  assert.ok(app.html().includes('data-action="drill-objective" data-sub="2.'), "objectives listed");
});

test("missed questions to drill appear only when there are some", () => {
  const app = launch();
  seedHistory(app, [700]);
  assert.ok(!app.html().includes('data-action="start-weak"'));
  app.store().mutate({ key: null, apply: (s) => { s.weak = ["d1-q1"]; } });
  app.click("home");
  assert.ok(app.html().includes('data-action="start-weak"'));
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
  assert.ok(app.html().includes(">500<"), "the score still counts");
  assert.ok(!app.html().includes("Next best step"));
});

test("someone who has only practised still gets the full home", () => {
  const app = launch();
  app.store().mutate({ key: null, apply: (s) => { s.saved = ["d1-q1"]; } });
  app.click("home");
  assert.ok(app.html().includes('data-action="start-saved"'));
  assert.ok(app.html().includes('data-action="custom-builder"'));
});

test("each objective also offers question-bank practice", () => {
  const app = launch();
  app.store().mutate({ key: null, apply: (s) => { s.saved = ["d1-q1"]; } });
  app.click("toggle-mastery", { domain: "2" });
  assert.ok(app.html().includes('data-action="practice" data-domain="2" data-sub="2.1"'));
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
  assert.match(signedIn, /<summary class="signed-chip"[^>]*><span class="dot">●<\/span> admin@example\.com/);
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
  assert.ok(html.includes('data-action="open-section" data-id="h-visitors">Visitor stats ↓'));
});

const RESOURCES = [
  { id: "exam-guide", group: "Official", title: "The Exam Guide", url: "https://example.com/guide.pdf", star: true, start: true },
  { id: "course", group: "Official", title: "Intro <course>", url: "https://example.com/course", start: true },
  { id: "kit", group: "Study guides", title: "Study kit", url: "https://example.com/kit", note: "Notes" },
  { id: "src", group: "Practice & reviews", title: "Exam source", url: "https://example.com/src", exam: "imp" },
  { id: "bad", group: "Official", title: "Bad", url: "javascript:alert(1)" },
];

test("the home page lists study resources in a folded section, grouped, opening in a new tab", () => {
  const app = launch({ resources: RESOURCES, storage: { "ccarf.progress": JSON.stringify({ history: [], attempted: ["d1-q1"] }) } });
  const html = app.html();
  assert.ok(html.includes('id="h-resources"'), "a study resources section");
  assert.ok(html.indexOf('id="h-resources"') < html.indexOf("Score history"), "it sits above score history");
  assert.ok(html.includes("4 links"), "invalid entries are dropped from the count");
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
  const html = app.html();
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
  const app = launch({ frames: true, storage: { "ccarf.progress": JSON.stringify({ history: [], attempted: ["d1-q1"] }) } });
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
const isOpen = (html, id) => new RegExp('<details class="card h-fold" id="' + id + '" open>').test(html);

test("an opened home section stays open when the page redraws", () => {
  const app = launch({ storage: RETURNING, resources: RESOURCES });
  assert.ok(!isOpen(app.html(), "h-resources"), "closed by default");
  app.toggle("h-resources", true);
  app.click("toggle-mastery", { domain: "2" });      // any redraw
  assert.ok(isOpen(app.html(), "h-resources"), "still open after a redraw");
  app.fireSyncEvent();                               // background sync redraw
  assert.ok(isOpen(app.html(), "h-resources"), "still open after a sync");
  assert.ok(!isOpen(app.html(), "h-history"), "other sections untouched");
});

test("closing a section is remembered too, and it survives a trip into a quiz", () => {
  const app = launch({ storage: RETURNING });
  app.toggle("h-history", true);
  app.toggle("h-history", false);
  app.click("practice", { domain: "3", sub: "3.1" });
  app.click("quit");
  assert.ok(!isOpen(app.html(), "h-history"));
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
  const app = launch({ sync, config, storage: RETURNING, inputs: { "auth-email": "me@example.com" } });
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

test("score history is the last section on the home screen", () => {
  const { sync } = adminSync({ stats: STATS });
  const html = launch({ sync, resources: RESOURCES, storage: RETURNING }).html();
  const at = (id) => html.indexOf('id="' + id + '"');
  assert.ok(at("h-history") > 0);
  for (const id of ["h-resources", "h-visitors"]) {
    assert.ok(at(id) > 0, id + " should render");
    assert.ok(at(id) < at("h-history"), id + " comes before score history");
  }
  assert.ok(html.indexOf("<details", at("h-history") + 1) === -1, "no section after score history");
});
