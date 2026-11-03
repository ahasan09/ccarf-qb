/* Time per question and the pace hint (js/logic.js). */
import { test } from "node:test";
import assert from "node:assert/strict";
import app from "./engine.mjs";

const { addTime, paceSummary, paceStatus, MAX_VISIT_MS } = app;
const T0 = 1_800_000_000_000;
const MIN = 60 * 1000;

test("addTime adds the stretch to the question and leaves the input alone", () => {
  const before = { a: 1000 };
  assert.deepEqual(addTime(before, "a", T0, T0 + 500), { a: 1500 });
  assert.deepEqual(addTime(before, "b", T0, T0 + 500), { a: 1000, b: 500 });
  assert.deepEqual(before, { a: 1000 });
});

test("addTime caps one stretch, so a tab left open does not count for hours", () => {
  assert.deepEqual(addTime({}, "a", T0, T0 + 3 * 60 * MIN), { a: MAX_VISIT_MS });
});

test("addTime ignores a missing question or a clock that went backwards", () => {
  assert.deepEqual(addTime({ a: 1 }, null, T0, T0 + 10), { a: 1 });
  assert.deepEqual(addTime({ a: 1 }, "a", T0, T0 - 10), { a: 1 });
  assert.deepEqual(addTime(undefined, "a", undefined, T0), {});
});

test("paceSummary averages time and ranks the slowest objectives", () => {
  const qs = [
    { id: "1", subdomain: "1.1 Loops" }, { id: "2", subdomain: "1.1 Loops" },
    { id: "3", subdomain: "2.1 Tools" }, { id: "4", subdomain: "2.1 Tools" },
    { id: "5", subdomain: "3.1 Once" }, // only one question: not ranked
    { id: "6", domain: 4 }, { id: "7", domain: 4 }, // no objective: grouped by domain
    { id: "8", subdomain: "5.1 Unseen" }, // no time recorded: left out
  ];
  const spent = { 1: 3 * MIN, 2: 1 * MIN, 3: 1 * MIN, 4: 1 * MIN, 5: 9 * MIN, 6: 4 * MIN, 7: 4 * MIN };
  const p = paceSummary(qs, spent);
  assert.equal(p.count, 7);
  assert.equal(p.avgMs, Math.round((23 * MIN) / 7));
  assert.deepEqual(p.slowest.map((g) => g.key), ["D4 Prompt Engineering & Structured Output", "1.1 Loops", "2.1 Tools"]);
  assert.equal(p.slowest[1].avgMs, 2 * MIN);
});

test("paceSummary is null without any timing", () => {
  assert.equal(paceSummary([{ id: "1" }], {}), null);
});

test("paceStatus warns only when 3 or more behind an even pace", () => {
  const end = T0 + 120 * MIN; // 60 questions → 2 minutes each
  assert.equal(paceStatus(60, 0, T0, end, T0 + 5 * MIN), null, "2 behind is fine");
  assert.deepEqual(paceStatus(60, 0, T0, end, T0 + 6 * MIN), { behind: 3, budgetMs: 2 * MIN });
  assert.equal(paceStatus(60, 30, T0, end, T0 + 60 * MIN), null, "on pace");
  assert.equal(paceStatus(60, 0, T0, null, T0 + 60 * MIN), null, "untimed");
  assert.equal(paceStatus(60, 50, T0, end, T0 + 500 * MIN).behind, 10, "never expects more than all");
});
