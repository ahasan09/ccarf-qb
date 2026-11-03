/* Progress backup file: download and import (js/logic.js, js/store.js). */
import { test } from "node:test";
import assert from "node:assert/strict";
import app from "./engine.mjs";

const { progressFile, parseProgressFile, applyMutations, Mutations, emptyProgress } = app;
const NOW = 1_800_000_000_000;

test("a downloaded file reads back as the same progress", () => {
  const state = Object.assign(emptyProgress(), { attempted: ["q1"], correctEver: ["q1"], examDate: "2026-12-14" });
  const text = progressFile(state, NOW);
  assert.equal(JSON.parse(text).app, "ccarf-qb");
  assert.equal(JSON.parse(text).exportedAt, new Date(NOW).toISOString());
  assert.deepEqual(parseProgressFile(text).progress, JSON.parse(text).progress);
});

test("a bare progress object is accepted too", () => {
  assert.deepEqual(parseProgressFile(JSON.stringify({ weak: ["q2"] })).progress.weak, ["q2"]);
});

test("anything else is refused with a readable message", () => {
  assert.match(parseProgressFile("not json").error, /not valid JSON/);
  assert.match(parseProgressFile("[1,2]").error, /not a progress backup/);
  assert.match(parseProgressFile('{"name":"x"}').error, /not a progress backup from this app/);
  assert.match(parseProgressFile(JSON.stringify({ app: "ccarf-qb", progress: null })).error, /not a progress backup/);
});

test("importing only adds, and the newer review schedule wins per question", () => {
  const here = Object.assign(emptyProgress(), {
    attempted: ["a"], saved: ["a"], examDate: "2026-12-01",
    review: { a: { step: 1, due: NOW, updatedAt: NOW }, b: { step: 0, due: NOW, updatedAt: NOW } },
  });
  const file = Object.assign(emptyProgress(), {
    attempted: ["b"], examDate: "2027-01-01",
    review: { a: { step: 0, due: 1, updatedAt: 1 }, b: { step: 2, due: NOW + 5, updatedAt: NOW + 5 }, c: { step: 0, due: 2, updatedAt: 2 } },
    history: [{ date: "2026-10-01T00:00:00.000Z", score: 700 }],
  });
  const next = applyMutations(here, [Mutations.restore(file)]);
  assert.deepEqual(next.attempted, ["a", "b"]);
  assert.deepEqual(next.saved, ["a"]);
  assert.equal(next.history.length, 1);
  assert.equal(next.examDate, "2026-12-01", "an exam date already set is kept");
  assert.equal(next.review.a.updatedAt, NOW, "older entry in the file does not win");
  assert.equal(next.review.b.step, 2, "newer entry in the file wins");
  assert.ok(next.review.c);
});
