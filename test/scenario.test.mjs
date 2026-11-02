import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const app = require("../app.js");
const { validateScenarioBank, SUBDOMAINS } = app;

const SCENARIOS = [
  { id: "support", name: "Customer Support Resolution Agent", text: "You are building a customer support resolution agent using the Claude Agent SDK. The agent handles returns and billing." },
  { id: "ci", name: "Claude Code for Continuous Integration", text: "You are integrating Claude Code into your CI/CD pipeline for automated review and test generation." },
];

const LONG_Q =
  "During evaluation the coordinator verifies the customer and retrieves two recent orders before delegating a billing investigation. " +
  "The delegated investigator often asks for the order status again or analyzes the wrong order when several purchases were mentioned. " +
  "You want to keep accuracy without giving the investigator every support tool. What should you change in the delegation step?";

function q(over = {}) {
  return Object.assign(
    {
      id: "sc-support-001",
      scenario: "support",
      domain: 1,
      subdomain: SUBDOMAINS[0],
      question: LONG_Q,
      options: ["one", "two", "three", "four"],
      answer: 2,
      optionNotes: ["n1", "n2", "n3", "n4"],
      explanation: "Because the coordinator must pass verified facts explicitly.",
    },
    over
  );
}

const errs = (bank) => validateScenarioBank(SCENARIOS, bank).join("\n");

test("SUBDOMAINS lists the 30 exam-guide task statements", () => {
  assert.equal(SUBDOMAINS.length, 30);
  assert.ok(SUBDOMAINS.includes("4.5 Design efficient batch processing strategies"));
});

test("valid scenario question passes", () => {
  assert.deepEqual(validateScenarioBank(SCENARIOS, [q()]), []);
});

test("needs exactly 4 options", () => {
  assert.match(errs([q({ options: ["a", "b", "c"], optionNotes: ["1", "2", "3"] })]), /4 options/);
});

test("needs a single answer", () => {
  assert.match(errs([q({ answer: [0, 1] })]), /single answer/);
});

test("needs 4 non-empty option notes", () => {
  assert.match(errs([q({ optionNotes: ["1", "2", "3"] })]), /optionNotes/);
  assert.match(errs([q({ optionNotes: ["1", "2", " ", "4"] })]), /optionNotes/);
});

test("rejects unknown scenario", () => {
  assert.match(errs([q({ scenario: "nope" })]), /unknown scenario/);
});

test("rejects unknown subdomain", () => {
  assert.match(errs([q({ subdomain: "9.9 Made up" })]), /subdomain/);
});

test("rejects duplicate ids", () => {
  assert.match(errs([q(), q()]), /duplicate/);
});

test("rejects questions that repeat the scenario intro", () => {
  assert.match(errs([q({ question: SCENARIOS[0].text + " " + LONG_Q })]), /scenario intro/);
  assert.match(errs([q({ question: "Scenario: Customer Support. " + LONG_Q })]), /scenario intro/);
});

test("rejects short questions", () => {
  assert.match(errs([q({ question: "Which tool should the agent call first?" })]), /too short/);
});

test("rejects letter references in notes and explanations", () => {
  assert.match(errs([q({ optionNotes: ["Unlike option B, this fails.", "2", "3", "4"] })]), /letter reference/);
  assert.match(errs([q({ explanation: "(C) is right because it passes facts." })]), /letter reference/);
  assert.match(errs([q({ optionNotes: ["1", "2", "B. is the wrong idea", "4"] })]), /letter reference/);
  // ordinary prose with capital letters is fine
  assert.deepEqual(validateScenarioBank(SCENARIOS, [q({ explanation: "A coordinator must pass facts. An MCP tool is not needed." })]), []);
});

/* ---------------------------------------------------------------- Task 2 */
const { drawScenarioExam, eligibleScenarios, usedScenarioQuestionIds, breakdownBy, SCENARIO_BLOCK, SCENARIO_COUNT } = app;

const SIX = ["support", "codegen", "research", "devprod", "ci", "extraction"].map((id) => ({ id, name: id, text: id }));
function scnBank(perScenario) {
  const out = [];
  for (const [sid, n] of Object.entries(perScenario))
    for (let i = 1; i <= n; i++) out.push({ id: `${sid}-${i}`, scenario: sid, domain: 1, subdomain: SUBDOMAINS[0], options: ["a", "b", "c", "d"], answer: 0 });
  return out;
}
const all20 = Object.fromEntries(SIX.map((s) => [s.id, 20]));
let seed = 1;
const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

test("constants match the real exam", () => {
  assert.equal(SCENARIO_BLOCK, 15);
  assert.equal(SCENARIO_COUNT, 4);
});

test("drawScenarioExam returns 4 contiguous blocks of 15 distinct questions", () => {
  const r = drawScenarioExam(SIX, scnBank(all20), new Set(), rng);
  assert.equal(r.questions.length, 60);
  assert.equal(new Set(r.scenarioIds).size, 4);
  assert.equal(new Set(r.questions.map((q) => q.id)).size, 60);
  r.scenarioIds.forEach((sid, b) => {
    const block = r.questions.slice(b * 15, b * 15 + 15);
    assert.ok(block.every((q) => q.scenario === sid));
  });
});

test("drawScenarioExam skips thin scenarios", () => {
  const counts = Object.assign({}, all20, { support: 10, ci: 10 });
  const r = drawScenarioExam(SIX, scnBank(counts), new Set(), rng);
  assert.ok(!r.scenarioIds.includes("support") && !r.scenarioIds.includes("ci"));
  assert.deepEqual(eligibleScenarios(SIX, scnBank(counts)).sort(), ["codegen", "devprod", "extraction", "research"]);
});

test("drawScenarioExam returns null when fewer than 4 qualify", () => {
  const counts = Object.assign({}, all20, { support: 10, ci: 10, research: 14 });
  assert.equal(drawScenarioExam(SIX, scnBank(counts), new Set(), rng), null);
});

test("drawScenarioExam prefers questions not used before", () => {
  const used = new Set();
  for (const s of SIX) for (let i = 1; i <= 15; i++) used.add(`${s.id}-${i}`);
  const r = drawScenarioExam(SIX, scnBank(all20), used, rng);
  r.scenarioIds.forEach((sid, b) => {
    const ids = r.questions.slice(b * 15, b * 15 + 15).map((q) => q.id);
    for (let i = 16; i <= 20; i++) assert.ok(ids.includes(`${sid}-${i}`), `${sid}-${i} missing`);
  });
});

test("usedScenarioQuestionIds reads only scenario attempts", () => {
  const ids = usedScenarioQuestionIds([
    { kind: "scenario", items: [{ id: "a" }, { id: "b" }] },
    { items: [{ id: "c" }] },
  ]);
  assert.deepEqual([...ids].sort(), ["a", "b"]);
});

test("breakdownBy groups, scores and sorts weakest first", () => {
  const qs = [
    { id: "1", subdomain: "4.5 x", options: ["a", "b", "c", "d"], answer: 0 },
    { id: "2", subdomain: "4.5 x", options: ["a", "b", "c", "d"], answer: 0 },
    { id: "3", subdomain: "1.1 y", options: ["a", "b", "c", "d"], answer: 0 },
    { id: "4", subdomain: "2.1 z", options: ["a", "b", "c", "d"], answer: 0 },
  ];
  const rows = breakdownBy(qs, { 1: 0, 2: 1, 3: 2, 4: 0 }, (q) => q.subdomain);
  assert.deepEqual(rows, [
    { key: "1.1 y", correct: 0, total: 1, pct: 0 },
    { key: "4.5 x", correct: 1, total: 2, pct: 50 },
    { key: "2.1 z", correct: 1, total: 1, pct: 100 },
  ]);
});
