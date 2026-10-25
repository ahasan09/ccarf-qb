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
  const m = masteryByDomain(FULL_BANK, correctEver);
  assert.deepEqual(m[1], { correct: 2, total: 49 });
  assert.deepEqual(m[5], { correct: 1, total: 27 });
  assert.deepEqual(m[2], { correct: 0, total: 32 });
});

test("masteryBySubdomain groups tagged questions by subdomain and untagged as general", () => {
  const bank = [
    { id: "a", domain: 2, subdomain: "2.1 Tool interfaces" },
    { id: "b", domain: 2, subdomain: "2.1 Tool interfaces" },
    { id: "c", domain: 2, subdomain: "2.4 MCP integration" },
    { id: "d", domain: 2 },
    { id: "e", domain: 3, subdomain: "3.1 CLAUDE.md" },
  ];
  const rows = masteryBySubdomain(bank, ["a", "d"], 2);
  assert.deepEqual(rows, [
    { key: "2.1", title: "Tool interfaces", correct: 1, total: 2 },
    { key: "2.4", title: "MCP integration", correct: 0, total: 1 },
    { key: "general", title: "General (untagged)", correct: 1, total: 1 },
  ]);
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
