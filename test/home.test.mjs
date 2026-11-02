import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const app = require("../app.js");
const {
  reviewAfterAnswer, dueReviewIds, REVIEW_STEPS_DAYS, DAY_MS,
  emptyProgress, normalizeProgress, mergeProgress, applyMutations, Mutations,
} = app;

const NOW = 1_800_000_000_000;

/* ------------------------------------------------------------ Task 1 */
test("review steps are 1, 3, 7 and 14 days", () => {
  assert.deepEqual(REVIEW_STEPS_DAYS, [1, 3, 7, 14]);
  assert.equal(DAY_MS, 86400000);
});

test("a wrong answer schedules the question for tomorrow", () => {
  assert.deepEqual(reviewAfterAnswer(undefined, false, NOW), { step: 0, due: NOW + DAY_MS, updatedAt: NOW });
  const later = { step: 2, due: NOW + 5 * DAY_MS, updatedAt: 1 };
  assert.deepEqual(reviewAfterAnswer(later, false, NOW), { step: 0, due: NOW + DAY_MS, updatedAt: NOW });
});

test("a correct answer to a due question moves it to the next interval", () => {
  const due = { step: 0, due: NOW - 1, updatedAt: 1 };
  assert.deepEqual(reviewAfterAnswer(due, true, NOW), { step: 1, due: NOW + 3 * DAY_MS, updatedAt: NOW });
  const due2 = { step: 2, due: NOW, updatedAt: 1 };
  assert.deepEqual(reviewAfterAnswer(due2, true, NOW), { step: 3, due: NOW + 14 * DAY_MS, updatedAt: NOW });
});

test("a correct answer at the last step finishes the question", () => {
  const due = { step: 3, due: NOW - 1, updatedAt: 1 };
  assert.deepEqual(reviewAfterAnswer(due, true, NOW), { step: 3, due: NOW - 1, updatedAt: NOW, done: true });
});

test("a correct answer to a question not due, unknown or done changes nothing", () => {
  assert.equal(reviewAfterAnswer({ step: 0, due: NOW + 10, updatedAt: 1 }, true, NOW), null);
  assert.equal(reviewAfterAnswer(undefined, true, NOW), null);
  assert.equal(reviewAfterAnswer({ step: 3, due: NOW - 1, updatedAt: 1, done: true }, true, NOW), null);
});

test("dueReviewIds lists live entries that are due", () => {
  const review = {
    a: { step: 0, due: NOW - 1, updatedAt: 1 },
    b: { step: 0, due: NOW + 1, updatedAt: 1 },
    c: { step: 3, due: NOW - 1, updatedAt: 1, done: true },
    d: { step: 1, due: NOW, updatedAt: 1 },
  };
  assert.deepEqual(dueReviewIds(review, NOW).sort(), ["a", "d"]);
});

test("old progress loads with an empty review and no exam date", () => {
  const s = normalizeProgress({ history: [], weak: ["x"] });
  assert.deepEqual(s.review, {});
  assert.equal(s.examDate, null);
  assert.deepEqual(emptyProgress().review, {});
  const bad = normalizeProgress({ review: { a: "nope", b: { step: 1, due: 5, updatedAt: 2 } }, examDate: 42 });
  assert.deepEqual(Object.keys(bad.review), ["b"]);
  assert.equal(bad.examDate, null);
  assert.equal(normalizeProgress({ examDate: "2026-12-14" }).examDate, "2026-12-14");
});

test("mergeProgress keeps the newer review entry", () => {
  const a = { review: {
    reset: { step: 2, due: NOW + 9 * DAY_MS, updatedAt: 100 },
    finished: { step: 2, due: NOW, updatedAt: 100 },
    onlyA: { step: 0, due: NOW, updatedAt: 5 },
  }, examDate: null };
  const b = { review: {
    reset: { step: 0, due: NOW + DAY_MS, updatedAt: 200 },
    finished: { step: 3, due: NOW, updatedAt: 300, done: true },
  }, examDate: "2026-12-14" };
  const m = mergeProgress(a, b);
  assert.equal(m.review.reset.step, 0, "newer reset wins over an older later-due copy");
  assert.equal(m.review.finished.done, true, "a newer finish is not resurrected");
  assert.ok(m.review.onlyA);
  assert.equal(m.examDate, "2026-12-14");
  assert.equal(mergeProgress(b, a).examDate, "2026-12-14");
});

test("review and exam-date mutations apply", () => {
  let s = emptyProgress();
  s = applyMutations(s, [Mutations.recordReview({ q1: { step: 0, due: 5, updatedAt: 1 } })]);
  s = applyMutations(s, [Mutations.recordReview({ q2: { step: 1, due: 6, updatedAt: 2 } })]);
  assert.deepEqual(Object.keys(s.review).sort(), ["q1", "q2"]);
  s = applyMutations(s, [Mutations.setExamDate("2026-12-14")]);
  assert.equal(s.examDate, "2026-12-14");
  s = applyMutations(s, [Mutations.setExamDate(null)]);
  assert.equal(s.examDate, null);
});

/* ------------------------------------------------------------ Task 2 */
const { examAttempts, predictedScore, objectiveAccuracy, weakestObjectives, objectiveDrillIds, bestScenarioScores } = app;

const hist = (scores) => scores.map((score, i) => ({ date: `2026-10-0${i + 1}T00:00:00Z`, score, items: [] }));

test("examAttempts keeps scored entries only", () => {
  assert.equal(examAttempts([{ date: "x", score: 700 }, { date: "y" }]).length, 1);
});

test("predictedScore weights the last five newest-first 5..1", () => {
  assert.equal(predictedScore([]), null);
  const p = predictedScore(hist([600, 700, 800]));
  assert.equal(p.score, Math.round((800 * 5 + 700 * 4 + 600 * 3) / 12));
  assert.equal(p.count, 3);
  assert.equal(p.verdict, "borderline");
  assert.equal(predictedScore(hist([900])).verdict, "pass");
  assert.equal(predictedScore(hist([500])).verdict, "not-yet");
  assert.equal(predictedScore(hist([760])).verdict, "pass");
  assert.equal(predictedScore(hist([680])).verdict, "borderline");
  assert.equal(predictedScore(hist([100, 100, 100, 100, 100, 900])).count, 5, "only the last five");
});

const Q = {
  a: { id: "a", subdomain: "4.5 Design efficient batch processing strategies", options: [1, 2, 3, 4], answer: 0, scenario: "ci" },
  b: { id: "b", subdomain: "4.5 Design efficient batch processing strategies", options: [1, 2, 3, 4], answer: 0, scenario: "ci" },
  c: { id: "c", subdomain: "1.1 Design and implement agentic loops for autonomous task execution", options: [1, 2, 3, 4], answer: 0, scenario: "support" },
  d: { id: "d", options: [1, 2, 3, 4], answer: 0 },
};
const lookup = (id) => Q[id];

test("objectiveAccuracy skips unknown ids", () => {
  const h = [
    { date: "1", score: 500, items: [{ id: "a", given: 0 }, { id: "b", given: 1 }, { id: "zzz", given: 0 }, { id: "d", given: 0 }] },
    { date: "2", score: 500, items: [{ id: "a", given: null }, { id: "c", given: 0 }] },
  ];
  assert.deepEqual(objectiveAccuracy(h, lookup), {
    "4.5 Design efficient batch processing strategies": { correct: 1, total: 3 },
    "1.1 Design and implement agentic loops for autonomous task execution": { correct: 1, total: 1 },
  });
});

test("weakestObjectives needs three answers and breaks ties by fewer answered", () => {
  const acc = {
    "1.1 x": { correct: 1, total: 4 },
    "2.1 y": { correct: 1, total: 3 },
    "3.1 z": { correct: 3, total: 3 },
    "4.5 w": { correct: 0, total: 2 },
    "5.1 v": { correct: 2, total: 8 },
  };
  assert.deepEqual(weakestObjectives(acc).map((r) => r.key), ["1.1 x", "5.1 v", "2.1 y"]);
  assert.deepEqual(weakestObjectives(acc, 1)[0], { key: "1.1 x", correct: 1, total: 4, pct: 25 });
  assert.deepEqual(weakestObjectives({}), []);
});

test("objectiveDrillIds takes unseen questions first, up to eight", () => {
  const bank = [];
  for (let i = 0; i < 12; i++) bank.push({ id: `s${i}`, subdomain: "4.5 Batch" });
  bank.push({ id: "other", subdomain: "1.1 Loops" });
  const used = new Set(["s0", "s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"]);
  const ids = objectiveDrillIds(bank, "4.5 Batch", used);
  assert.equal(ids.length, 8);
  for (const fresh of ["s9", "s10", "s11"]) assert.ok(ids.includes(fresh));
  assert.ok(!ids.includes("other"));
  assert.deepEqual(objectiveDrillIds(bank, "9.9 none", used), []);
});

test("bestScenarioScores takes the best per scenario from scenario attempts", () => {
  const h = [
    { date: "1", kind: "scenario", score: 1, items: [{ id: "a", given: 0 }, { id: "b", given: 1 }, { id: "c", given: 0 }] },
    { date: "2", kind: "scenario", score: 1, items: [{ id: "a", given: 0 }, { id: "b", given: 0 }] },
    { date: "3", score: 1, items: [{ id: "c", given: 1 }] },
  ];
  assert.deepEqual(bestScenarioScores(h, lookup), { ci: 100, support: 100 });
});

/* --------------------------------------------------- final review fixes */
test("replaying an older review update never overwrites a newer entry", () => {
  let s = emptyProgress();
  s.review = { q: { step: 3, due: 5, updatedAt: 300, done: true } };
  s = applyMutations(s, [Mutations.recordReview({ q: { step: 0, due: 9, updatedAt: 100 }, r: { step: 0, due: 9, updatedAt: 100 } })]);
  assert.equal(s.review.q.done, true, "the newer finish survives an older queued reset");
  assert.ok(s.review.r, "new ids are still added");
});

test("objectiveAccuracy ignores subdomains outside the exam guide", () => {
  const look = (id) => ({ x: { id: "x", subdomain: "1.10", options: [1, 2, 3, 4], answer: 0 } })[id];
  assert.deepEqual(objectiveAccuracy([{ date: "1", score: 1, items: [{ id: "x", given: 1 }] }], look), {});
});
