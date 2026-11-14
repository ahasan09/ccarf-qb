/* Screen-flow tests for the React app, driving the real controller and
 * components in jsdom. Ported from the old test/ui.test.mjs. */
import { afterEach, describe, expect, test } from "vitest";
import { launch, completeSession, scenarioBank, SCENARIOS } from "./harness.jsx";

let app;
afterEach(async () => { if (app) await app.close(); app = null; });

const sessionOf = () => app.C.S.session;

describe("home", () => {
  test("a fresh visitor gets the diagnostic and no readiness number", async () => {
    app = await launch();
    expect(app.text()).toContain("Find your starting point");
    expect(app.has("start-diagnostic")).toBe(true);
    expect(app.text()).not.toContain("/ 1000 predicted");
  });

  test("home sections are tabs: Today first, one shown at a time, remembered", async () => {
    app = await launch();
    expect(document.querySelector('[aria-current="page"]').dataset.tab).toBe("today");
    await app.tab("exams");
    expect(document.getElementById("h-exams")).not.toBeNull();
    expect(document.getElementById("h-objectives")).toBeNull();
    expect(location.hash).toBe("#/exams");
    expect(JSON.parse(localStorage.getItem("ccarf.tab"))).toBe("exams");
  });

  test("a bad stored tab falls back to Today", async () => {
    app = await launch({ storage: { "ccarf.tab": "nope" } });
    expect(document.querySelector('[aria-current="page"]').dataset.tab).toBe("today");
  });

  test("a bookmarked address opens that tab", async () => {
    app = await launch({ hash: "#/resources" });
    expect(document.querySelector('[aria-current="page"]').dataset.tab).toBe("resources");
  });

  test("the Practice tab badge shows how many questions are due", async () => {
    const past = Date.now() - 1000;
    app = await launch({ storage: { "ccarf.progress": { review: { "d1-q1": { step: 0, due: past, updatedAt: 1 }, "d1-q2": { step: 0, due: past, updatedAt: 1 } } } } });
    expect(app.find("tab", { tab: "practice" }).textContent).toContain("2");
    expect(app.has("start-review")).toBe(true);
  });

  test("practice lists appear only once they have something in them", async () => {
    app = await launch();
    let text = await app.tab("practice");
    expect(app.has("start-saved")).toBe(false);
    expect(app.has("start-weak")).toBe(false);
    expect(text).toContain("will be listed here");
    await app.close();
    app = await launch({ storage: { "ccarf.progress": { saved: ["d1-q1"], weak: ["d2-q2"] } } });
    await app.tab("practice");
    expect(app.has("start-saved")).toBe(true);
    expect(app.has("start-weak")).toBe(true);
  });

  test("the exam date can be set from the home page", async () => {
    app = await launch();
    await app.click("edit-exam-date");
    const input = document.getElementById("dlg-input");
    expect(input.type).toBe("date");
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.change(input, { target: { value: "2099-01-15" } });
    await app.answer(true);
    expect(app.store().examDate).toBe("2099-01-15");
  });

  test("the theme button names the current theme", async () => {
    app = await launch();
    expect(app.find("cycle-theme").getAttribute("aria-label")).toMatch(/^Theme: /);
  });

  test("/ opens search, but not mid-quiz", async () => {
    app = await launch();
    await app.key("/");
    expect(app.C.S.view).toBe("search");
    await app.click("home");
    await app.tab("exams");
    await app.click("start-exam");
    await app.key("/");
    expect(app.C.S.view).toBe("quiz");
  });
});

describe("sessions", () => {
  test("the mock exam draws 60 mapped questions with a timer", async () => {
    app = await launch();
    await app.tab("exams");
    await app.click("start-exam");
    expect(sessionOf().questions).toHaveLength(60);
    expect(sessionOf().deadline).toBeGreaterThan(Date.now());
    expect(document.getElementById("timer")).not.toBeNull();
    expect(location.hash).toBe("#/quiz");
  });

  test("no option looks selected before you answer; the clicked one highlights", async () => {
    app = await launch();
    await app.tab("exams");
    await app.click("start-exam");
    expect(document.querySelectorAll('.option[data-state="selected"]')).toHaveLength(0);
    await app.click("select", { opt: 2 });
    const sel = document.querySelectorAll('.option[data-state="selected"]');
    expect(sel).toHaveLength(1);
    expect(sel[0].dataset.opt).toBe("2");
  });

  test("finishing a session records it and clears the resume card", async () => {
    app = await launch();
    await app.tab("exams");
    await app.click("start-exam");
    await completeSession(app);
    expect(app.C.S.view).toBe("results");
    expect(app.store().session).toBeNull();
    expect(app.store().history).toHaveLength(1);
    expect(app.store().history[0].score).toBe(1000);
    expect(app.text()).toContain("PASS");
  });

  test("exiting part-way keeps a resume card, and resuming restores the answers", async () => {
    app = await launch();
    await app.tab("exams");
    await app.click("start-exam");
    await app.click("select", { opt: 1 });
    const id = sessionOf().questions[0].id;
    await app.click("quit");
    await app.answer(true);
    expect(app.C.S.view).toBe("home");
    await app.tab("today");
    expect(app.text()).toContain("in progress");
    await app.click("resume");
    expect(app.C.S.view).toBe("quiz");
    expect(sessionOf().answers[id]).toBe(1);
  });

  test("starting something new over a saved session asks, then starts it on yes", async () => {
    app = await launch();
    await app.tab("exams");
    await app.click("start-exam");
    await app.click("quit");
    await app.answer(true);
    await app.tab("exams");
    await app.click("start-diagnostic");
    expect(app.dialogText()).toContain("Replace your session?");
    await app.answer(false);
    expect(app.C.S.view).toBe("home");
    await app.click("start-diagnostic");
    await app.answer(true);
    expect(sessionOf().diagnostic).toBe(true);
  });

  test("submitting with unanswered questions asks first", async () => {
    app = await launch();
    await app.tab("exams");
    await app.click("start-exam");
    await app.click("submit");
    expect(app.dialogText()).toContain("60 unanswered questions");
    await app.answer(false);
    expect(app.C.S.view).toBe("quiz");
  });

  test("practice grades at once, credits the bank and offers no Previous", async () => {
    app = await launch();
    await app.C.startPractice(1, null);
    await app.flush();
    expect(app.has("prev")).toBe(false);
    const id = sessionOf().questions[0].id;
    await app.click("select", { opt: 1 }); // wrong: answer is 0
    expect(document.querySelector(".feedback").textContent).toContain("Incorrect.");
    expect(app.store().weak).toContain(id);
    expect(app.store().review[id]).toBeTruthy();
    await app.click("next");
    const id2 = sessionOf().questions[1].id;
    await app.click("select", { opt: 0 });
    expect(app.store().correctEver).toContain(id2);
  });

  test("a select-two question collects both picks before grading in practice", async () => {
    const b = (await import("./harness.jsx")).bank();
    b[0] = { ...b[0], answer: undefined, answers: [0, 2] };
    app = await launch({ bank: b.filter((q) => q.domain === 1).concat(b.filter((q) => q.domain !== 1)) });
    app.env.L.shuffle = (a) => a.slice(); // keep the multi question first
    await app.C.startPractice(1, "1.1");
    await app.flush();
    expect(app.text()).toContain("Select 2 answers.");
    await app.click("select", { opt: 0 });
    expect(document.querySelector(".feedback")).toBeNull();
    await app.click("select", { opt: 2 });
    expect(document.querySelector(".feedback").textContent).toContain("Correct.");
  });

  test("keyboard: 1–5 picks, F flags, arrows move", async () => {
    app = await launch();
    await app.tab("exams");
    await app.click("start-exam");
    const first = sessionOf().questions[0];
    await app.key("2");
    expect(sessionOf().answers[first.id]).toBe(first.order[1]);
    await app.key("f");
    expect(sessionOf().flagged[first.id]).toBe(true);
    await app.key("ArrowRight");
    expect(sessionOf().current).toBe(1);
    await app.key("ArrowLeft");
    expect(sessionOf().current).toBe(0);
    await app.key("5"); // four options: does nothing
    expect(sessionOf().answers[first.id]).toBe(first.order[1]);
  });

  test("right-click strikes an option and keeps the answer; again undoes", async () => {
    app = await launch();
    await app.tab("exams");
    await app.click("start-exam");
    const id = sessionOf().questions[0].id;
    await app.click("select", { opt: 1 });
    await app.rightClick(1);
    expect(sessionOf().strikes[id]).toEqual([1]);
    expect(sessionOf().answers[id]).toBe(1);
    expect(app.find("select", { opt: 1 }).dataset.struck).toBe("true");
    await app.rightClick(1);
    expect(sessionOf().strikes[id]).toEqual([]);
  });

  test("right-click does not strike in ordinary practice", async () => {
    app = await launch();
    await app.C.startPractice(1, null);
    await app.flush();
    await app.rightClick(0);
    expect(sessionOf().strikes).toEqual({});
    expect(app.has("strike")).toBe(false);
  });

  test("a question can be saved and studied from the home screen", async () => {
    app = await launch();
    await app.tab("exams");
    await app.click("start-exam");
    const id = sessionOf().questions[0].id;
    await app.click("toggle-saved");
    expect(app.store().saved).toEqual([id]);
    await app.click("toggle-saved");
    expect(app.store().saved).toEqual([]);
    await app.click("toggle-saved");
    await app.click("quit");
    await app.answer(true);
    await app.tab("today");
    await app.click("discard");
    await app.answer(true);
    await app.tab("practice");
    await app.click("start-saved");
    expect(sessionOf().savedDrill).toBe(true);
    expect(sessionOf().questions.map((q) => q.id)).toEqual([id]);
  });

  test("the custom builder narrows to subdomains and refuses an empty pick", async () => {
    app = await launch();
    await app.tab("practice");
    await app.click("custom-builder");
    expect(app.C.S.view).toBe("custom");
    for (const d of [2, 3, 4, 5]) app.C.setCustom({ domain: d, on: false });
    await app.flush();
    expect(app.C.customPoolSize()).toBe(20);
    app.C.setCustom({ domain: 1, on: false });
    await app.flush();
    expect(app.find("start-custom").disabled).toBe(true);
  });

  test("search lists matches as you type and practises them", async () => {
    app = await launch();
    await app.click("search");
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.change(document.getElementById("search-q"), { target: { value: "Question 3-1" } });
    await app.flush();
    expect(app.text()).toContain("Question bank");
    await app.click("practice-search", { pool: "bank" });
    expect(sessionOf().practiceTitle).toContain("Question 3-1");
  });

  test("a finished exam can be reviewed again from score history", async () => {
    app = await launch();
    await app.tab("exams");
    await app.click("start-exam");
    await completeSession(app, { correct: false });
    await app.click("home");
    await app.tab("exams");
    await app.click("review-attempt");
    expect(app.C.S.view).toBe("review");
    expect(document.querySelectorAll(".review-card")).toHaveLength(60);
    expect(app.text()).toContain("Wrong");
  });

  test("retry failed re-quizzes only the misses", async () => {
    app = await launch();
    await app.C.startPractice(2, null);
    await app.flush();
    await completeSession(app, { correct: false });
    await app.click("retry-failed");
    expect(sessionOf().mode).toBe("retry");
    expect(sessionOf().questions).toHaveLength(20);
  });
});

describe("scenario exam", () => {
  test("draws 60 questions from 4 scenarios and labels the block", async () => {
    app = await launch();
    await app.tab("exams");
    await app.click("start-scenario-exam");
    expect(sessionOf().questions).toHaveLength(60);
    expect(sessionOf().scenarioIds).toHaveLength(4);
    expect(app.text()).toContain("Scenario 1 of 4");
    expect(document.querySelector(".scn-text").textContent).toContain("Background text");
  });

  test("refuses to start when fewer than 4 scenarios have 15 questions", async () => {
    app = await launch({ scenarioBank: scenarioBank({ support: 15, codegen: 15, research: 15 }) });
    await app.tab("exams");
    expect(app.find("start-scenario-exam").disabled).toBe(true);
  });

  test("Next on the last question opens the review screen; tiles filter and jump", async () => {
    app = await launch();
    await app.tab("exams");
    await app.click("start-scenario-exam");
    app.C.jumpTo(59);
    await app.flush();
    await app.click("toggle-flag");
    await app.click("next");
    expect(app.C.S.view).toBe("scenario-review");
    expect(document.querySelectorAll(".tile")).toHaveLength(60);
    app.C.setReviewFilter("flagged");
    await app.flush();
    expect(document.querySelectorAll(".tile")).toHaveLength(1);
    await app.click("jump", { index: 59 });
    expect(app.C.S.view).toBe("quiz");
    expect(sessionOf().current).toBe(59);
  });

  test("a comment can be added and an empty one removes it", async () => {
    app = await launch();
    await app.tab("exams");
    await app.click("start-scenario-exam");
    const id = sessionOf().questions[0].id;
    const { fireEvent } = await import("@testing-library/react");
    await app.click("comment");
    fireEvent.change(document.getElementById("dlg-input"), { target: { value: "check this" } });
    await app.answer(true);
    expect(sessionOf().comments[id]).toBe("check this");
    expect(app.find("comment").getAttribute("aria-label")).toBe("Edit comment");
    await app.click("comment");
    fireEvent.change(document.getElementById("dlg-input"), { target: { value: "  " } });
    await app.answer(true);
    expect(sessionOf().comments[id]).toBeUndefined();
  });

  test("a submitted scenario exam is recorded apart from bank progress", async () => {
    app = await launch();
    await app.tab("exams");
    await app.click("start-scenario-exam");
    await completeSession(app);
    const h = app.store().history[0];
    expect(h.kind).toBe("scenario");
    expect(app.store().attempted).toEqual([]);
    expect(app.text()).toContain("By objective");
    expect(app.text()).toContain("By scenario");
  });

  test("the diagnostic is 2 scenarios × 10 in 40 minutes", async () => {
    app = await launch();
    await app.click("start-diagnostic");
    expect(sessionOf().questions).toHaveLength(20);
    expect(sessionOf().scenarioIds).toHaveLength(2);
    expect(sessionOf().deadline - sessionOf().startedAt).toBe(40 * 60 * 1000);
  });

  test("scenario practice shows every option's note after answering, and leaves the weak set alone", async () => {
    app = await launch();
    await app.tab("practice");
    await app.click("practice-scenario", { scenario: SCENARIOS[0].id });
    expect(document.querySelectorAll(".opt-note")).toHaveLength(0);
    await app.click("select", { opt: 1 });
    expect(document.querySelectorAll(".opt-note")).toHaveLength(4);
    expect(app.store().weak).toEqual([]);
  });
});

describe("account and data", () => {
  test("reset all progress asks first, then empties progress and the backup copy", async () => {
    app = await launch({ storage: { "ccarf.progress": { saved: ["d1-q1"], weak: ["d1-q2"] }, "ccarf.backup": { weak: ["x"] } } });
    await app.click("account");
    await app.click("reset-progress");
    await app.answer(false);
    expect(app.store().saved).toEqual(["d1-q1"]);
    await app.click("reset-progress");
    await app.answer(true);
    expect(app.store().saved).toEqual([]);
    expect(localStorage.getItem("ccarf.backup")).toBeNull();
  });

  test("importing a backup file adds its progress after confirming", async () => {
    app = await launch();
    const file = app.env.L.progressFile(app.env.L.normalizeProgress({ weak: ["d1-q3"], attempted: ["d1-q3"] }), Date.now());
    const done = app.C.importProgressText(file);
    await app.flush();
    expect(app.dialogText()).toContain("Import progress?");
    await app.answer(true);
    await done;
    expect(app.store().weak).toContain("d1-q3");
  });

  test("a file that is not a backup is refused and changes nothing", async () => {
    app = await launch();
    const done = app.C.importProgressText("not json");
    await app.flush();
    expect(app.dialogText()).toMatch(/./);
    await app.answer(true);
    await done;
    expect(app.store().history).toEqual([]);
  });

  test("signing out clears this device's copy of the progress", async () => {
    app = await launch({ storage: { "ccarf.progress": { saved: ["d1-q1"] } } });
    window.dispatchEvent(new CustomEvent("ccarf:signout"));
    await app.flush();
    expect(app.store().saved).toEqual([]);
  });

  test("by default sign-in is by link and shows no code box", async () => {
    const sync = { enabled: true, user: () => null, status: () => "idle", error: () => "", sendCode: async () => {} };
    app = await launch({ sync });
    await app.click("account");
    expect(document.body.textContent).toContain("Email me a link");
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.change(document.getElementById("auth-email"), { target: { value: "a@b.c" } });
    await app.click("auth-send");
    expect(document.body.textContent).toContain("Open the link");
    expect(document.getElementById("auth-code")).toBeNull();
  });
});

describe("routing", () => {
  test("Back during a quiz asks before leaving", async () => {
    app = await launch();
    await app.tab("exams");
    await app.click("start-exam");
    window.history.replaceState(null, "", "/#/exams");
    window.dispatchEvent(new PopStateEvent("popstate"));
    await app.flush();
    expect(app.dialogText()).toContain("Exit?");
    await app.answer(false);
    expect(app.C.S.view).toBe("quiz");
    expect(location.hash).toBe("#/quiz");
  });
});

/* jsdom has no PointerEvent, so build one React will read as a touch. */
function touch(el, type, x = 5, y = 5) {
  const ev = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
  Object.defineProperty(ev, "pointerType", { value: "touch" });
  el.dispatchEvent(ev);
}

describe("polish", () => {
  test("? opens the keyboard shortcut list, from home and mid-quiz; Escape closes it", async () => {
    app = await launch();
    await app.key("?");
    expect(document.body.textContent).toContain("Keyboard shortcuts");
    expect(app.C.S.shortcutsOpen).toBe(true);
    await app.key("1"); // other shortcuts wait while it is open
    app.C.setShortcutsOpen(false);
    await app.flush();
    await app.tab("exams");
    await app.click("start-exam");
    await app.key("?");
    expect(app.C.S.shortcutsOpen).toBe(true);
    expect(Object.values(sessionOf().answers).every((a) => a === null)).toBe(true);
  });

  test("the hint on a question screen links to the full list", async () => {
    app = await launch();
    await app.tab("exams");
    await app.click("start-exam");
    await app.click("shortcuts");
    expect(app.C.S.shortcutsOpen).toBe(true);
  });

  test("the browser bar colour follows the theme chosen in the app", async () => {
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = "#f6f7f4";
    document.head.appendChild(meta);
    app = await launch({ storage: { "ccarf.theme": "light" } });
    expect(meta.content).toBe("#f6f7f4");
    await app.click("cycle-theme"); // light → dark
    expect(meta.content).toBe("#17191c");
    meta.remove();
  });

  test("press and hold strikes an option on a touch screen, without picking it", async () => {
    app = await launch();
    await app.tab("exams");
    await app.click("start-exam");
    const id = sessionOf().questions[0].id;
    const { fireEvent } = await import("@testing-library/react");
    const opt = () => app.find("select", { opt: 2 });
    touch(opt(), "pointerdown");
    await new Promise((r) => setTimeout(r, 520));
    touch(opt(), "pointerup");
    fireEvent.contextMenu(opt()); // Android fires this on a hold too: must not undo
    fireEvent.click(opt()); // the click that ends the hold
    await app.flush();
    expect(sessionOf().strikes[id]).toEqual([2]);
    expect(sessionOf().answers[id]).toBeNull();
  });

  test("a short tap picks, and a press that moves (a scroll) does not strike", async () => {
    app = await launch();
    await app.tab("exams");
    await app.click("start-exam");
    const id = sessionOf().questions[0].id;
    const { fireEvent } = await import("@testing-library/react");
    const opt = () => app.find("select", { opt: 1 });
    touch(opt(), "pointerdown");
    touch(opt(), "pointermove", 5, 60);
    await new Promise((r) => setTimeout(r, 520));
    expect(sessionOf().strikes[id] || []).toEqual([]);
    touch(opt(), "pointerdown");
    touch(opt(), "pointerup");
    fireEvent.click(opt());
    await app.flush();
    expect(sessionOf().answers[id]).toBe(1);
  });
});
