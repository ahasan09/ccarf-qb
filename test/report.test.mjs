/* "Report a problem with this question" links (js/logic.js). */
import { test } from "node:test";
import assert from "node:assert/strict";
import app from "./engine.mjs";

const { reportIssueUrl } = app;
const BASE = "https://github.com/owner/repo/issues/new";
const Q = {
  id: "d2-q55", subdomain: "2.5 Built-in tools", question: "Which tool?",
  options: ["Grep", "Bash", "Read", "Glob"], answer: 0, explanation: "Because.",
};

test("the link opens a new issue titled with the question id", () => {
  const url = new URL(reportIssueUrl(Q, BASE));
  assert.equal(url.origin + url.pathname, BASE);
  assert.equal(url.searchParams.get("title"), "Question d2-q55: ");
  assert.equal(url.searchParams.get("labels"), "bug");
});

test("the body carries the id, objective, question, marked answer and where to find it", () => {
  const body = new URL(reportIssueUrl(Q, BASE)).searchParams.get("body");
  assert.match(body, /`d2-q55` · 2\.5 Built-in tools/);
  assert.match(body, /> Which tool\?/);
  assert.match(body, /\*\*Marked correct:\*\* Grep/);
  assert.match(body, /grep -rn "d2-q55" questions scenarios exams/);
});

test("select-two questions list both answers; long questions are shortened", () => {
  const multi = Object.assign({}, Q, { answer: undefined, answers: [1, 3], question: "x".repeat(900) });
  const body = new URL(reportIssueUrl(multi, BASE)).searchParams.get("body");
  assert.match(body, /\*\*Marked correct:\*\* Bash \/ Glob/);
  assert.ok(body.includes("x".repeat(400) + "…") && !body.includes("x".repeat(401)));
});

test("no base URL or no question means no link", () => {
  assert.equal(reportIssueUrl(Q, ""), "");
  assert.equal(reportIssueUrl(null, BASE), "");
});
