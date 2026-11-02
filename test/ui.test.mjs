/* Drives the real DOM app against a stub document, covering the screen-flow
 * bugs that only show up once rendering and storage interact. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

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
  const menuEl = { hidden: true, innerHTML: "", style: {} };
  appEl.addEventListener = (type, fn) => {
    if (type === "click") clickHandler = fn;
    (appListeners[type] = appListeners[type] || []).push(fn);
  };

  const win = {
    QUESTION_BANK: opts.bank || bank(),
    MOCK_EXAMS: opts.exams || [],
    SCENARIOS: opts.scenarios || SCENARIOS,
    SCENARIO_BANK: opts.scenarioBank || scenarioBank(),
    addEventListener: (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); },
    dispatchEvent: (ev) => { (listeners[ev.type] || []).forEach((fn) => fn(ev)); },
    scrollTo: () => {},
    caches: undefined,
  };

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
    alert: () => {},
    confirm: opts.confirm || (() => true),
    prompt: opts.prompt || (() => null),
    setInterval: (fn) => { timers.push(fn); return timers.length; },
    clearInterval: () => {},
    setTimeout: () => 1,
    clearTimeout: () => {},
    document: {
      getElementById: (id) => (id === "app" ? appEl : id === "ctx-menu" ? menuEl : null),
      addEventListener: (type, fn) => { (docListeners[type] = docListeners[type] || []).push(fn); },
      documentElement: { removeAttribute() {}, setAttribute() {} },
      hidden: false,
    },
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(readFileSync(join(root, "app.js"), "utf8"), ctx, { filename: "app.js" });

  const click = (action, data = {}, extra = {}) => {
    const btn = Object.assign(
      { dataset: Object.assign({ action }, data), disabled: false },
      extra
    );
    btn.closest = () => btn;
    clickHandler({ target: { closest: () => btn } });
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
    menu: () => menuEl,
    /* Right-click: on an option (opt given) or on something else. */
    rightClick: (opt) => {
      const optEl = opt === undefined ? null : { dataset: { opt: String(opt) } };
      const ev = { clientX: 10, clientY: 20, preventDefault() {}, target: { closest: () => optEl } };
      (appListeners.contextmenu || []).forEach((fn) => fn(ev));
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
  assert.ok(app.html().includes("0/20"), "domain mastery still counts only bank questions");
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
  assert.ok(app.html().includes("1 question kept for later"));
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
  assert.ok(html.includes("Scenario exam"));
  assert.match(html, /data-action="start-scenario-exam"(?![^>]*disabled)/);
  assert.ok(html.includes("Practice by scenario"));
  assert.equal((html.match(/data-action="practice-scenario"/g) || []).length, 6);
});

test("the scenario exam button waits until every scenario has 15 questions", () => {
  const app = launch({ scenarioBank: scenarioBank({ support: 16, ci: 16, research: 16, devprod: 16, codegen: 16, extraction: 10 }) });
  assert.match(app.html(), /data-action="start-scenario-exam"[^>]*disabled/);
  assert.ok(app.html().includes("Available once every scenario has 15 questions"));
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

/* Final review: the strike menu is position:fixed, so it must not sit inside
 * the transformed .scn-screen (which would offset it from the cursor). */
test("the strike menu sits outside the transformed scenario screen", () => {
  const app = launch();
  app.click("start-scenario-exam");
  const html = app.html();
  const at = html.indexOf('<div id="ctx-menu"');
  assert.ok(at > 0, "menu rendered");
  const before = html.slice(0, at);
  const opens = (before.match(/<div\b/g) || []).length;
  const closes = (before.match(/<\/div>/g) || []).length;
  assert.equal(opens, closes, "every div before the menu is closed, so the menu is a sibling of .scn-screen");
});

/* ------------------------------------------------------- polish fixes */
test("right-click opens the strike menu; Escape or a right-click elsewhere closes it", () => {
  const app = launch();
  app.click("start-scenario-exam");
  app.rightClick(2);
  assert.equal(app.menu().hidden, false);
  assert.ok(app.menu().innerHTML.includes('data-opt="2"'));
  app.key("Escape");
  assert.equal(app.menu().hidden, true, "Escape closes it");
  app.rightClick(1);
  app.rightClick();
  assert.equal(app.menu().hidden, true, "right-click off an option closes it");
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
