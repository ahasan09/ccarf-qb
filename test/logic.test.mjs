import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  EXAM_DRAW_COUNTS,
  PASS_SCORE,
  shuffle,
  drawExam,
  scaledScore,
  gradeSession,
  updateWeakSet,
  validateBank,
  sampleQuiz,
  masteryByDomain,
  masteryBySubdomain,
  filterBySubKey,
  mergeProgress,
  emptyProgress,
  normalizeProgress,
  progressFromStored,
  applyMutations,
  compactMutations,
  Mutations,
  correctIndices,
  toggleChoice,
} = require("../app.js");

function makeBank(countsPerDomain) {
  const bank = [];
  for (const [domain, count] of Object.entries(countsPerDomain)) {
    for (let i = 1; i <= count; i++) {
      bank.push({
        id: `d${domain}-q${String(i).padStart(2, "0")}`,
        domain: Number(domain),
        question: `Question d${domain}-${i}?`,
        options: ["A", "B", "C", "D"],
        answer: i % 4,
        explanation: "Because.",
      });
    }
  }
  return bank;
}

const FULL_BANK = makeBank({ 1: 49, 2: 32, 3: 36, 4: 36, 5: 27 });

test("EXAM_DRAW_COUNTS totals 60 and matches domain weights", () => {
  assert.deepEqual(EXAM_DRAW_COUNTS, { 1: 16, 2: 11, 3: 12, 4: 12, 5: 9 });
  const total = Object.values(EXAM_DRAW_COUNTS).reduce((a, b) => a + b, 0);
  assert.equal(total, 60);
});

test("drawExam returns 60 unique questions with the right per-domain counts", () => {
  const exam = drawExam(FULL_BANK, EXAM_DRAW_COUNTS);
  assert.equal(exam.length, 60);
  const ids = new Set(exam.map((q) => q.id));
  assert.equal(ids.size, 60);
  const perDomain = {};
  for (const q of exam) perDomain[q.domain] = (perDomain[q.domain] || 0) + 1;
  assert.deepEqual(perDomain, { 1: 16, 2: 11, 3: 12, 4: 12, 5: 9 });
});

test("drawExam draws different exams across runs (randomized)", () => {
  const a = drawExam(FULL_BANK, EXAM_DRAW_COUNTS).map((q) => q.id).join(",");
  let differs = false;
  for (let i = 0; i < 5; i++) {
    const b = drawExam(FULL_BANK, EXAM_DRAW_COUNTS).map((q) => q.id).join(",");
    if (b !== a) differs = true;
  }
  assert.ok(differs, "expected at least one differing draw in 5 runs");
});

test("drawExam throws when the bank cannot satisfy a domain count", () => {
  const tiny = makeBank({ 1: 5, 2: 32, 3: 36, 4: 36, 5: 27 });
  assert.throws(() => drawExam(tiny, EXAM_DRAW_COUNTS));
});

test("shuffle preserves elements and does not mutate input", () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8];
  const copy = [...input];
  const out = shuffle(input);
  assert.deepEqual(input, copy);
  assert.deepEqual([...out].sort((a, b) => a - b), copy);
});

test("scaledScore scales to 1000 and pass threshold sits at 44/60", () => {
  assert.equal(scaledScore(60, 60), 1000);
  assert.equal(scaledScore(0, 60), 0);
  assert.equal(scaledScore(44, 60), 733);
  assert.equal(scaledScore(43, 60), 717);
  assert.ok(scaledScore(44, 60) >= PASS_SCORE);
  assert.ok(scaledScore(43, 60) < PASS_SCORE);
});

test("gradeSession counts correct answers, per-domain breakdown, and wrong ids", () => {
  const qs = [
    { id: "d1-q01", domain: 1, answer: 0 },
    { id: "d1-q02", domain: 1, answer: 1 },
    { id: "d2-q01", domain: 2, answer: 2 },
  ];
  const answers = { "d1-q01": 0, "d1-q02": 3, "d2-q01": null };
  const r = gradeSession(qs, answers);
  assert.equal(r.correct, 1);
  assert.equal(r.total, 3);
  assert.deepEqual(r.perDomain[1], { correct: 1, total: 2 });
  assert.deepEqual(r.perDomain[2], { correct: 0, total: 1 });
  assert.deepEqual(r.wrongIds.sort(), ["d1-q02", "d2-q01"]);
});

test("updateWeakSet adds wrong ids and redeems corrected ones", () => {
  const weak = ["d1-q01", "d2-q05"];
  const next = updateWeakSet(weak, {
    wrongIds: ["d3-q09", "d2-q05"],
    correctIds: ["d1-q01"],
  });
  assert.deepEqual([...next].sort(), ["d2-q05", "d3-q09"]);
});

test("sampleQuiz draws only from chosen domains, without duplicates, clamped to pool size", () => {
  const quiz = sampleQuiz(FULL_BANK, [2, 5], 20);
  assert.equal(quiz.length, 20);
  assert.ok(quiz.every((q) => q.domain === 2 || q.domain === 5));
  assert.equal(new Set(quiz.map((q) => q.id)).size, 20);
  const clamped = sampleQuiz(FULL_BANK, [5], 100);
  assert.equal(clamped.length, 27);
});

test("masteryByDomain reports correct-ever counts per domain", () => {
  const correctEver = ["d1-q01", "d1-q02", "d5-q01", "nonexistent"];
  const m = masteryByDomain(FULL_BANK, correctEver, correctEver);
  assert.deepEqual(m[1], { correct: 2, attempted: 2, total: 49 });
  assert.deepEqual(m[5], { correct: 1, attempted: 1, total: 27 });
  assert.deepEqual(m[2], { correct: 0, attempted: 0, total: 32 });
});

test("masteryBySubdomain groups tagged questions by subdomain and untagged as general", () => {
  const bank = [
    { id: "a", domain: 2, subdomain: "2.1 Tool interfaces" },
    { id: "b", domain: 2, subdomain: "2.1 Tool interfaces" },
    { id: "c", domain: 2, subdomain: "2.4 MCP integration" },
    { id: "d", domain: 2 },
    { id: "e", domain: 3, subdomain: "3.1 CLAUDE.md" },
  ];
  const rows = masteryBySubdomain(bank, ["a", "d"], 2, ["a", "b", "d"]);
  assert.deepEqual(rows, [
    { key: "2.1", title: "Tool interfaces", correct: 1, attempted: 2, total: 2 },
    { key: "2.4", title: "MCP integration", correct: 0, attempted: 0, total: 1 },
    { key: "general", title: "General (untagged)", correct: 1, attempted: 1, total: 1 },
  ]);
});

test("filterBySubKey selects a domain's subdomain questions, or all with no key", () => {
  const bank = [
    { id: "a", domain: 2, subdomain: "2.1 Tool interfaces" },
    { id: "b", domain: 2, subdomain: "2.4 MCP integration" },
    { id: "c", domain: 2 },
    { id: "d", domain: 3, subdomain: "2.1 wrong domain" },
  ];
  assert.deepEqual(filterBySubKey(bank, 2, "2.1").map((q) => q.id), ["a"]);
  assert.deepEqual(filterBySubKey(bank, 2, "general").map((q) => q.id), ["c"]);
  assert.deepEqual(filterBySubKey(bank, 2, null).map((q) => q.id), ["a", "b", "c"]);
});

test("mergeProgress unions the weak and correct-ever sets from both devices", () => {
  const a = { weak: ["q1", "q2"], correctEver: ["q5"] };
  const b = { weak: ["q2", "q3"], correctEver: ["q5", "q6"] };
  const m = mergeProgress(a, b);
  assert.deepEqual(m.weak, ["q1", "q2", "q3"]);
  assert.deepEqual(m.correctEver, ["q5", "q6"]);
});

test("mergeProgress keeps every exam attempt, deduped by date, newest last", () => {
  const a = { history: [{ date: "2026-10-20T10:00:00.000Z", score: 700 }] };
  const b = {
    history: [
      { date: "2026-10-25T10:00:00.000Z", score: 800 },
      { date: "2026-10-20T10:00:00.000Z", score: 700 },
    ],
  };
  const m = mergeProgress(a, b);
  assert.deepEqual(m.history.map((h) => h.score), [700, 800]);
});

test("mergeProgress is symmetric and idempotent", () => {
  const a = { weak: ["q1"], history: [{ date: "2026-10-20T10:00:00.000Z" }] };
  const b = { weak: ["q2"], history: [{ date: "2026-10-21T10:00:00.000Z" }] };
  const ab = mergeProgress(a, b);
  assert.deepEqual(ab, mergeProgress(b, a));
  assert.deepEqual(mergeProgress(ab, ab), ab);
});

test("mergeProgress keeps the most recently started in-progress session", () => {
  const older = { mode: "practice", startedAt: 1000, questions: [] };
  const newer = { mode: "exam", startedAt: 2000, questions: [] };
  assert.deepEqual(mergeProgress({ session: older }, { session: newer }).session, newer);
  assert.deepEqual(mergeProgress({ session: older }, {}).session, older);
  assert.deepEqual(mergeProgress({}, { session: newer }).session, newer);
});

test("mergeProgress tolerates empty, missing and malformed sides", () => {
  assert.deepEqual(mergeProgress({}, {}), emptyProgress());
  assert.deepEqual(mergeProgress(null, { weak: ["q1"] }).weak, ["q1"]);
  assert.deepEqual(mergeProgress({ weak: "junk" }, { weak: ["q1"] }).weak, ["q1"]);
});

test("progressFromStored reads rows written in the old per-key format", () => {
  const legacy = {
    "ccarf.history": [{ date: "2026-10-20T10:00:00.000Z", score: 740 }],
    "ccarf.weak": ["q1"],
    "ccarf.correctEver": ["q2"],
    "ccarf.session": null,
  };
  const s = progressFromStored(legacy);
  assert.equal(s.history.length, 1, "existing exam history must survive the format change");
  assert.deepEqual(s.weak, ["q1"]);
  assert.deepEqual(s.correctEver, ["q2"]);
  assert.deepEqual(progressFromStored({ weak: ["q9"] }).weak, ["q9"], "current format passes through");
});

test("finishing a session clears it and redeems the weak questions answered correctly", () => {
  const before = {
    history: [],
    weak: ["q1", "q2"],
    correctEver: [],
    session: { mode: "weak", questions: [{ id: "q1" }], startedAt: 1 },
  };
  const grade = { correct: 1, total: 2, wrongIds: ["q2"], correctIds: ["q1"], perDomain: {} };
  const after = applyMutations(before, [Mutations.finishSession(grade, null)]);
  assert.equal(after.session, null);
  assert.deepEqual(after.weak, ["q2"]);
  assert.deepEqual(after.correctEver, ["q1"]);
});

test("replaying a finish on stale server state still removes the session and weak id", () => {
  // The exact reported bug: the server copy still holds the session and the
  // weak id this device just cleared. Replay must win over the stale copy.
  const serverState = {
    history: [],
    weak: ["q1", "q2"],
    correctEver: [],
    session: { mode: "weak", questions: [{ id: "q1" }], startedAt: 1 },
  };
  const grade = { correct: 1, total: 2, wrongIds: ["q2"], correctIds: ["q1"], perDomain: {} };
  const replayed = applyMutations(serverState, [Mutations.finishSession(grade, null)]);
  assert.equal(replayed.session, null, "finished session must not be resurrected");
  assert.ok(!replayed.weak.includes("q1"), "redeemed weak question must stay cleared");
});

test("replaying a finish twice does not duplicate the history entry", () => {
  const entry = { date: "2026-10-28T09:00:00.000Z", score: 800 };
  const grade = { correct: 48, total: 60, wrongIds: [], correctIds: ["q1"], perDomain: {} };
  const once = applyMutations(emptyProgress(), [Mutations.finishSession(grade, entry)]);
  const twice = applyMutations(once, [Mutations.finishSession(grade, entry)]);
  assert.equal(twice.history.length, 1);
});

test("history stays ordered oldest-first when attempts arrive out of order", () => {
  const late = { date: "2026-10-28T09:00:00.000Z" };
  const early = { date: "2026-10-01T09:00:00.000Z" };
  const grade = { correct: 0, total: 1, wrongIds: [], correctIds: [], perDomain: {} };
  let s = applyMutations(emptyProgress(), [Mutations.finishSession(grade, late)]);
  s = applyMutations(s, [Mutations.finishSession(grade, early)]);
  assert.deepEqual(s.history.map((h) => h.date), [early.date, late.date]);
});

test("compactMutations keeps only the latest write per key, preserving order", () => {
  const a = Mutations.setSession({ questions: [], startedAt: 1 });
  const grade = { correct: 0, total: 0, wrongIds: [], correctIds: [], perDomain: {} };
  const f = Mutations.finishSession(grade, null);
  const b = Mutations.setSession({ questions: [], startedAt: 2 });
  const out = compactMutations([a, f, b]);
  assert.deepEqual(out, [f, b]);
});

test("normalizeProgress repairs missing, wrong-typed and corrupt fields", () => {
  assert.deepEqual(normalizeProgress(null), emptyProgress());
  assert.deepEqual(normalizeProgress({ weak: "nope", history: null }), emptyProgress());
  assert.equal(normalizeProgress({ session: { mode: "exam" } }).session, null, "session needs questions");
  assert.deepEqual(normalizeProgress({ history: [{ date: "d" }, {}] }).history, [{ date: "d" }]);
});

test("validateBank passes a well-formed bank", () => {
  assert.deepEqual(validateBank(FULL_BANK), []);
});

test("validateBank flags structural problems", () => {
  const bad = [
    { id: "d1-q01", domain: 1, question: "q", options: ["a", "b", "c"], answer: 0, explanation: "e" },
    { id: "d1-q01", domain: 1, question: "q", options: ["a", "b", "c", "d"], answer: 4, explanation: "e" },
    { id: "d9-q01", domain: 9, question: "", options: ["a", "b", "c", "d"], answer: 1, explanation: "" },
  ];
  const errors = validateBank(bad);
  assert.ok(errors.some((e) => e.includes("4 options")), "flags wrong option count");
  assert.ok(errors.some((e) => e.includes("duplicate")), "flags duplicate id");
  assert.ok(errors.some((e) => e.includes("answer")), "flags out-of-range answer");
  assert.ok(errors.some((e) => e.includes("domain")), "flags invalid domain");
});

test("correctIndices reads both single- and multi-answer questions", () => {
  assert.deepEqual(correctIndices({ answer: 2 }), [2]);
  assert.deepEqual(correctIndices({ answers: [3, 1] }), [1, 3], "sorted");
  assert.deepEqual(correctIndices({}), []);
});

test("grading a multi-answer question needs every correct option and no extras", () => {
  const qs = [{ id: "m1", domain: 1, answers: [0, 2] }];
  const grade = (given) => gradeSession(qs, { m1: given });

  assert.equal(grade([0, 2]).correct, 1, "exactly right");
  assert.equal(grade([2, 0]).correct, 1, "order must not matter");
  assert.equal(grade([0]).correct, 0, "partial answers do not count");
  assert.equal(grade([0, 1, 2]).correct, 0, "an extra selection does not count");
  assert.equal(grade([1, 3]).correct, 0);
  assert.equal(grade(null).correct, 0);
  assert.equal(grade([]).correct, 0);
});

test("single-answer grading is unchanged by multi support", () => {
  const qs = [{ id: "s1", domain: 1, answer: 1 }];
  assert.equal(gradeSession(qs, { s1: 1 }).correct, 1);
  assert.equal(gradeSession(qs, { s1: 0 }).correct, 0);
  assert.equal(gradeSession(qs, { s1: null }).correct, 0);
  assert.equal(gradeSession(qs, { s1: [1] }).correct, 1, "an array of one is still correct");
});

test("toggleChoice adds and removes options for multi-answer questions", () => {
  assert.deepEqual(toggleChoice(null, 2), [2]);
  assert.deepEqual(toggleChoice([2], 0), [0, 2], "kept sorted");
  assert.deepEqual(toggleChoice([0, 2], 2), [0], "clicking again removes it");
  assert.equal(toggleChoice([2], 2), null, "emptying it clears the answer");
});

/* ---- coverage / mastery / accuracy -------------------------------------- */

test("answering a question records it as attempted, right or wrong", () => {
  let s = applyMutations(emptyProgress(), [Mutations.recordAnswer("q1", true)]);
  s = applyMutations(s, [Mutations.recordAnswer("q2", false)]);
  assert.deepEqual(s.attempted, ["q1", "q2"], "both count as seen");
  assert.deepEqual(s.correctEver, ["q1"]);
  assert.deepEqual(s.weak, ["q2"]);
});

test("finishing a session marks every graded question as attempted", () => {
  const grade = { correct: 1, total: 2, correctIds: ["q1"], wrongIds: ["q2"], perDomain: {} };
  const s = applyMutations(emptyProgress(), [Mutations.finishSession(grade, null)]);
  assert.deepEqual(s.attempted, ["q1", "q2"]);
});

test("a session kept separate records nothing, not even attempts", () => {
  const grade = { correct: 1, total: 1, correctIds: ["x1"], wrongIds: [], perDomain: {} };
  const s = applyMutations(emptyProgress(), [Mutations.finishSession(grade, null, { separate: true })]);
  assert.deepEqual(s.attempted, []);
  assert.deepEqual(s.correctEver, []);
});

test("masteryByDomain reports coverage and correctness separately", () => {
  const bank = [
    { id: "a", domain: 1 }, { id: "b", domain: 1 },
    { id: "c", domain: 1 }, { id: "d", domain: 2 },
  ];
  const m = masteryByDomain(bank, ["a"], ["a", "b"]);
  assert.deepEqual(m[1], { correct: 1, attempted: 2, total: 3 });
  assert.deepEqual(m[2], { correct: 0, attempted: 0, total: 1 });
});

test("mergeProgress unions the attempted set too", () => {
  const m = mergeProgress({ attempted: ["q1"] }, { attempted: ["q2", "q1"] });
  assert.deepEqual(m.attempted, ["q1", "q2"]);
});

test("normalizeProgress defaults attempted for records written before it existed", () => {
  assert.deepEqual(normalizeProgress({ correctEver: ["q1"] }).attempted, []);
});
