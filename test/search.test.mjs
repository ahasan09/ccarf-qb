/* Keyword search over the question banks (js/logic.js). */
import { test } from "node:test";
import assert from "node:assert/strict";
import app from "./engine.mjs";

const { searchQuestions } = app;
const LIST = [
  { id: "a", question: "How do hooks run?", options: ["x"], explanation: "", subdomain: "1.5 Agent SDK hooks" },
  { id: "b", question: "Pick a tool", options: ["Use tool_choice any"], explanation: "Hooks are unrelated." },
  { id: "c", question: "Something else", options: ["y"], explanation: "" },
];

test("every word must match, in any case and any field", () => {
  assert.deepEqual(searchQuestions(LIST, "HOOKS").map((q) => q.id), ["a", "b"]);
  assert.deepEqual(searchQuestions(LIST, "tool_choice any").map((q) => q.id), ["b"]);
  assert.deepEqual(searchQuestions(LIST, "hooks zzz"), []);
});

test("matches in the question text come first", () => {
  const list = [LIST[1], LIST[0]];
  assert.deepEqual(searchQuestions(list, "hooks").map((q) => q.id), ["a", "b"]);
});

test("ids and objectives are searchable; very short queries match nothing", () => {
  assert.deepEqual(searchQuestions(LIST, "1.5").map((q) => q.id), ["a"]);
  assert.deepEqual(searchQuestions(LIST, "c").map((q) => q.id), []);
  assert.deepEqual(searchQuestions(LIST, "   "), []);
});
