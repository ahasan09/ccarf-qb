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

function launch(opts = {}) {
  const storage = {};
  const listeners = {};
  const appEl = {
    innerHTML: "",
    dataset: {},
    querySelector: () => null,
    querySelectorAll: () => [],
  };
  let clickHandler = null;
  appEl.addEventListener = (type, fn) => { if (type === "click") clickHandler = fn; };

  const win = {
    QUESTION_BANK: opts.bank || bank(),
    MOCK_EXAMS: opts.exams || [],
    addEventListener: (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); },
    dispatchEvent: (ev) => { (listeners[ev.type] || []).forEach((fn) => fn(ev)); },
    scrollTo: () => {},
    caches: undefined,
  };

  const ctx = {
    window: win,
    console,
    Date, Math, JSON, Object, Array, Number, String, Boolean, Promise,
    navigator: {},
    location: { protocol: "file:", hostname: "" },
    CustomEvent: class { constructor(type) { this.type = type; } },
    localStorage: {
      getItem: (k) => (k in storage ? storage[k] : null),
      setItem: (k, v) => { storage[k] = String(v); },
      removeItem: (k) => { delete storage[k]; },
    },
    alert: () => {},
    confirm: () => true,
    setInterval: () => 1,
    clearInterval: () => {},
    setTimeout: () => 1,
    clearTimeout: () => {},
    document: {
      getElementById: (id) => (id === "app" ? appEl : null),
      addEventListener: () => {},
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
    click,
    storage,
    store: () => win.CCARF_STORE,
    bank: () => win.QUESTION_BANK,
    fireSyncEvent: () => win.dispatchEvent(new ctx.CustomEvent("ccarf:auth")),
    fireSignOut: () => win.dispatchEvent(new ctx.CustomEvent("ccarf:signout")),
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
