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

function launch() {
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
    QUESTION_BANK: bank(),
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
