import { test } from "node:test";
import assert from "node:assert/strict";
import app from "./engine.mjs";

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
const { examAttempts, predictedScore, objectiveAccuracy, practiceAccuracy, weakestObjectives, objectiveDrillIds, bestScenarioScores } = app;

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

/* ------------------------------------------------------- polish fixes */
const { daysUntil, isValidDate } = app;

test("only real calendar dates are accepted", () => {
  assert.equal(isValidDate("2026-12-14"), true);
  assert.equal(isValidDate("2026-13-45"), false);
  assert.equal(isValidDate("2026-02-30"), false);
  assert.equal(isValidDate("2028-02-29"), true);
  assert.equal(isValidDate("next week"), false);
  assert.equal(normalizeProgress({ examDate: "2026-02-30" }).examDate, null);
});

test("daysUntil counts calendar days, unaffected by daylight saving", () => {
  const now = new Date(2026, 2, 1, 23, 30).getTime(); // 1 Mar, late evening local time
  assert.equal(daysUntil("2026-03-01", now), 0);
  assert.equal(daysUntil("2026-03-02", now), 1);
  assert.equal(daysUntil("2026-04-10", now), 40, "spans the March DST change");
  assert.equal(daysUntil("2026-02-27", now), -2);
  assert.equal(daysUntil("bogus", now), null);
});

test("a null review update removes the entry", () => {
  let s = emptyProgress();
  s.review = { q: { step: 0, due: 1, updatedAt: 1 } };
  s = applyMutations(s, [Mutations.recordReview({ q: null })]);
  assert.equal(s.review.q, undefined);
});

/* ---------------------------------------------------- study resources */
const { validResources, RESOURCE_GROUPS } = app;

test("validResources keeps https links with a title and a known group", () => {
  const ok = { id: "a", group: "Official", title: "Guide", url: "https://example.com/g" };
  const list = [
    ok,
    { id: "b", group: "Official", title: "Plain http", url: "http://example.com" },
    { id: "c", group: "Official", title: "Script", url: "javascript:alert(1)" },
    { id: "d", group: "Nope", title: "Bad group", url: "https://example.com" },
    { id: "e", group: "Official", title: "", url: "https://example.com" },
    { id: "a", group: "Official", title: "Duplicate id", url: "https://example.com/dup" },
    null,
  ];
  assert.deepEqual(validResources(list), [ok]);
  assert.deepEqual(validResources(undefined), []);
  assert.ok(RESOURCE_GROUPS.includes("Official"));
});

test("the shipped resources file is all valid, tracking-free https links", async () => {
  const { readFileSync } = await import("node:fs");
  const vm = await import("node:vm");
  const ctx = { window: {} };
  vm.runInNewContext(readFileSync(new URL("../resources.js", import.meta.url), "utf8"), ctx);
  const list = ctx.window.STUDY_RESOURCES;
  assert.ok(list.length >= 1);
  assert.equal(validResources(list).length, list.length, "every entry passes validResources");
  for (const r of list) {
    assert.doesNotMatch(r.url, /[?&](utm_|rcm=|trackingId=)/, r.id + " carries tracking parameters");
  }
  assert.ok(list.some((r) => r.id === "exam-guide"), "the exam guide is listed");
});

test("practiceAccuracy counts answered bank questions per objective, right if ever right", () => {
  const sub = SUBDOMAINS[0];
  const bank = [
    { id: "a", subdomain: sub }, { id: "b", subdomain: sub }, { id: "c", subdomain: sub },
    { id: "d", subdomain: "9.9 Not in the guide" }, { id: "e" },
  ];
  assert.deepEqual(practiceAccuracy(bank, ["a"], ["a", "b", "d", "e"]), { [sub]: { correct: 1, total: 2 } });
  assert.deepEqual(practiceAccuracy(bank, [], []), {});
});

test("practiceAccuracy counts a question right only if the last answer was right", () => {
  const sub = SUBDOMAINS[0];
  const bank = ["a", "b", "c", "d"].map((id) => ({ id, subdomain: sub }));
  // a: right. b: right once, wrong since (in weak). c: wrong before attempted
  // was tracked, so only in weak. d: never answered.
  assert.deepEqual(practiceAccuracy(bank, ["a", "b"], ["a", "b"], ["b", "c"]), { [sub]: { correct: 1, total: 3 } });
});

test("studyPlan spreads the unanswered bank over the days left", () => {
  const { studyPlan } = app;
  assert.equal(studyPlan(null, 100), null);
  assert.equal(studyPlan(-2, 100), null, "a past date gives nothing");
  assert.match(studyPlan(0, 100), /^Exam day/);
  assert.equal(studyPlan(18, 430), "About 24 new questions a day covers the rest of the bank (430 left).");
  assert.equal(studyPlan(10, 3), "About 1 new question a day covers the rest of the bank (3 left).");
  assert.match(studyPlan(5, 0), /answered every bank question/);
});

test("activitySummary counts today, the week and the streak", () => {
  const { activitySummary, localDay } = app;
  const now = new Date(2026, 10, 12, 15).getTime(); // 12 Nov 2026, local
  const act = { "2026-11-12": ["a", "b"], "2026-11-11": ["c"], "2026-11-10": ["d"], "2026-11-08": ["e"], "2026-10-01": ["old"] };
  const s = activitySummary(act, now);
  assert.equal(localDay(now), "2026-11-12");
  assert.equal(s.today, 2);
  assert.equal(s.weekTotal, 5, "only the last 7 days");
  assert.equal(s.streak, 3, "12, 11, 10 — the gap on the 9th ends it");
  assert.deepEqual(s.week.map((w) => w.count), [0, 0, 1, 0, 1, 1, 2]);
  assert.equal(activitySummary({ "2026-11-11": ["c"] }, now).streak, 1, "a streak ending yesterday still counts");
  assert.equal(activitySummary({}, now).any, false);
});

test("recording activity twice, or merging two devices, never double-counts", () => {
  const { applyMutations, Mutations, mergeProgress, normalizeProgress } = app;
  let s = applyMutations(app.emptyProgress(), [Mutations.recordActivity("2026-11-12", ["a", "b"])]);
  s = applyMutations(s, [Mutations.recordActivity("2026-11-12", ["a"])]);
  assert.deepEqual(s.activity["2026-11-12"].sort(), ["a", "b"]);
  const merged = mergeProgress({ activity: { "2026-11-12": ["a"] } }, { activity: { "2026-11-12": ["a", "c"], "2026-11-11": ["d"] } });
  assert.deepEqual(merged.activity["2026-11-12"].sort(), ["a", "c"]);
  assert.deepEqual(merged.activity["2026-11-11"], ["d"]);
  s = applyMutations(s, [Mutations.recordActivity("2027-03-01", ["z"])]);
  assert.ok(!s.activity["2026-11-12"], "older than 60 days is dropped");
  assert.deepEqual(normalizeProgress({ activity: { "bad": ["x"], "2026-11-12": [1, "ok"] } }).activity, { "2026-11-12": ["ok"] });
});

test("fields from a newer app version survive normalising, mutations and merges", () => {
  const { normalizeProgress, applyMutations, Mutations, mergeProgress } = app;
  const raw = { history: [], future: { goals: [1, 2] }, flag: true };
  const s = normalizeProgress(raw);
  assert.deepEqual(s.future, { goals: [1, 2] });
  assert.equal(s.flag, true);
  const after = applyMutations(s, [Mutations.toggleSaved("q1"), Mutations.recordAnswer("q2", true)]);
  assert.deepEqual(after.future, { goals: [1, 2] }, "an older client's write keeps it");
  const merged = mergeProgress({ future: "old", a: 1 }, { future: "new" });
  assert.equal(merged.future, "new", "the second copy wins");
  assert.equal(merged.a, 1);
  assert.ok(!("ccarf.history" in normalizeProgress({ "ccarf.history": [] })), "legacy keys are not carried");
});

test("activitySummary can be told which questions count as study", () => {
  const { activitySummary } = app;
  const now = new Date("2026-11-12T10:00:00").getTime();
  const act = {
    "2026-11-12": ["d1-q01", "pt1-q001", "pt1-q002"],
    "2026-11-11": ["pt3-q010"],
    "2026-11-10": ["d2-q05"],
  };
  const bankOnly = (id) => !/^(pt|mock1|purcell)/.test(id);

  const all = activitySummary(act, now);
  assert.equal(all.today, 3, "without a rule everything counts");
  assert.equal(all.streak, 3);

  const study = activitySummary(act, now, bankOnly);
  assert.equal(study.today, 1, "only the bank question counts today");
  assert.equal(study.weekTotal, 2, "the imported answers are left out");
  assert.equal(study.streak, 1, "a day of imported-only answers breaks the streak");
  assert.equal(study.any, true);
});

test("a day of imported answers alone reads as no activity", () => {
  const { activitySummary } = app;
  const now = new Date("2026-11-12T10:00:00").getTime();
  const onlyImported = activitySummary({ "2026-11-12": ["pt1-q001"] }, now, (id) => !id.startsWith("pt"));
  assert.equal(onlyImported.today, 0);
  assert.equal(onlyImported.streak, 0);
  assert.equal(onlyImported.any, false, "the card stays hidden rather than showing an empty week");
});
