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
