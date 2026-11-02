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
