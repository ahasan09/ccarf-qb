/* Two simulated devices talking to one fake server row, exercising the real
 * store and sync engine. These cover the cross-device behaviour that cannot
 * be checked from a single in-memory state. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createStore, createSyncEngine, Mutations } = require("../app.js");

/* A Postgres row with compare-and-swap on updated_at, like the real table. */
function makeServer() {
  let row = null;
  let clock = 0;
  return {
    reads: 0,
    rejectedWrites: 0,
    get row() { return row; },
    seed(data, stamp = "s0") { row = { data, stamp }; },
    async readRow() {
      this.reads++;
      return row ? { data: JSON.parse(JSON.stringify(row.data)), stamp: row.stamp } : null;
    },
    async writeRow(state, expectedStamp) {
      if (row === null) {
        if (expectedStamp !== null) return { ok: false };
        row = { data: JSON.parse(JSON.stringify(state)), stamp: "s" + ++clock };
        return { ok: true, stamp: row.stamp };
      }
      if (expectedStamp !== row.stamp) {
        this.rejectedWrites++;
        return { ok: false };
      }
      row = { data: JSON.parse(JSON.stringify(state)), stamp: "s" + ++clock };
      return { ok: true, stamp: row.stamp };
    },
  };
}

function makeDevice(server, initial) {
  let dirty = false;
  const store = createStore({
    initial,
    readFlag: () => dirty,
    writeFlag: (v) => { dirty = v; },
  });
  const engine = createSyncEngine({
    store,
    readRow: () => server.readRow(),
    writeRow: (state, stamp) => server.writeRow(state, stamp),
  });
  return { store, engine, sync: () => engine.sync() };
}

const grade = (correctIds, wrongIds = []) => ({
  correct: correctIds.length,
  total: correctIds.length + wrongIds.length,
  correctIds,
  wrongIds,
  perDomain: {},
});

test("a finished session stays finished after syncing with a server that still has it", async () => {
  const server = makeServer();
  server.seed({
    history: [],
    weak: ["q1", "q2"],
    correctEver: [],
    session: { mode: "weak", startedAt: 1, questions: [{ id: "q1" }] },
  });

  const pc = makeDevice(server, server.row.data);
  pc.store.mutate(Mutations.finishSession(grade(["q1"], ["q2"]), null));
  await pc.sync();

  assert.equal(pc.store.snapshot().session, null, "resume must not come back locally");
  assert.equal(server.row.data.session, null, "and must not come back on the server");
  assert.deepEqual(server.row.data.weak, ["q2"], "the drilled-correct question stays cleared");
  assert.deepEqual(server.row.data.correctEver, ["q1"]);
});

test("two devices that take exams in turn both keep their attempts", async () => {
  const server = makeServer();
  const laptop = makeDevice(server, undefined);
  const phone = makeDevice(server, undefined);

  await laptop.sync(); // creates the row
  await phone.sync();

  const a = { date: "2026-10-28T09:00:00.000Z", score: 760, pass: true };
  const b = { date: "2026-10-28T11:00:00.000Z", score: 820, pass: true };
  laptop.store.mutate(Mutations.finishSession(grade(["q1"]), a));
  phone.store.mutate(Mutations.finishSession(grade(["q2"]), b));

  await laptop.sync();
  await phone.sync();

  assert.deepEqual(server.row.data.history.map((h) => h.score), [760, 820]);
  assert.deepEqual(server.row.data.correctEver, ["q1", "q2"]);

  await laptop.sync();
  assert.deepEqual(
    laptop.store.snapshot().history.map((h) => h.score),
    [760, 820],
    "the other device's attempt shows up on the next sync"
  );
});

test("a write that loses a race is replayed on the newer row instead of overwriting it", async () => {
  const server = makeServer();
  const laptop = makeDevice(server, undefined);
  const phone = makeDevice(server, undefined);
  await laptop.sync();
  await phone.sync();

  laptop.store.mutate(Mutations.finishSession(grade(["q1"]), {
    date: "2026-10-28T09:00:00.000Z", score: 760, pass: true,
  }));
  phone.store.mutate(Mutations.finishSession(grade(["q2"]), {
    date: "2026-10-28T11:00:00.000Z", score: 820, pass: true,
  }));

  /* The laptop commits in the window between the phone's read and its write,
   * so the phone's write carries a stale stamp. */
  const realWrite = server.writeRow.bind(server);
  let raced = false;
  server.writeRow = async (state, stamp) => {
    if (!raced) {
      raced = true;
      await laptop.sync();
    }
    return realWrite(state, stamp);
  };

  await phone.sync();
  server.writeRow = realWrite;

  assert.ok(server.rejectedWrites > 0, "the stale write must be refused, not silently applied");
  assert.deepEqual(
    server.row.data.history.map((h) => h.score),
    [760, 820],
    "the loser replays on top instead of erasing the winner"
  );
  assert.deepEqual(server.row.data.correctEver, ["q1", "q2"]);
});

test("a reload adopts the server copy, including another device's newer progress", async () => {
  const server = makeServer();
  const pc1 = makeDevice(server, undefined);
  await pc1.sync();

  const pc2 = makeDevice(server, undefined);
  pc2.store.mutate(Mutations.finishSession(grade(["q7", "q8"]), {
    date: "2026-10-28T12:00:00.000Z", score: 900, pass: true,
  }));
  await pc2.sync();

  // pc1 reloads: a fresh store seeded from its stale cache, then syncs
  const reloaded = makeDevice(server, pc1.store.snapshot());
  await reloaded.sync();

  assert.deepEqual(reloaded.store.snapshot().correctEver, ["q7", "q8"]);
  assert.equal(reloaded.store.snapshot().history.length, 1);
});

test("work done before the first sync is folded in, not dropped", async () => {
  const server = makeServer();
  server.seed({ history: [], weak: [], correctEver: ["q5"], session: null });

  // studied signed-out, so the local copy is flagged unsynced with no pending ops
  let dirty = true;
  const store = createStore({
    initial: { history: [], weak: [], correctEver: ["q1"], session: null },
    readFlag: () => dirty,
    writeFlag: (v) => { dirty = v; },
  });
  const engine = createSyncEngine({
    store,
    readRow: () => server.readRow(),
    writeRow: (s, stamp) => server.writeRow(s, stamp),
  });

  await engine.sync();
  assert.deepEqual(server.row.data.correctEver, ["q1", "q5"]);
});

test("a device with nothing pending does not rewrite the row", async () => {
  const server = makeServer();
  const pc = makeDevice(server, undefined);
  await pc.sync();
  const stampAfterFirst = server.row.stamp;

  await pc.sync();
  assert.equal(server.row.stamp, stampAfterFirst, "an idle sync must be read-only");
});

test("answers recorded during practice survive a sync that arrives mid-session", async () => {
  const server = makeServer();
  const pc = makeDevice(server, undefined);
  await pc.sync();

  pc.store.mutate(Mutations.recordAnswer("q1", true));
  pc.store.mutate(Mutations.recordAnswer("q2", false));
  await pc.sync();

  assert.deepEqual(server.row.data.correctEver, ["q1"]);
  assert.deepEqual(server.row.data.weak, ["q2"]);
});

test("progress that has never reached the server is uploaded, not replaced by an empty row", async () => {
  // The data-loss case: this device holds real progress that was never
  // written (e.g. just migrated from an older storage layout) while the
  // server row exists but is empty.
  const server = makeServer();
  server.seed({ history: [], weak: [], correctEver: [], session: null });

  let dirty = true; // marked unsynced by the migration
  const store = createStore({
    initial: {
      history: [{ date: "2026-10-27T10:00:00.000Z", score: 780, pass: true }],
      weak: ["q3"],
      correctEver: ["q1", "q2"],
      session: { mode: "practice", startedAt: 5, questions: [{ id: "q9" }] },
    },
    readFlag: () => dirty,
    writeFlag: (v) => { dirty = v; },
  });
  const engine = createSyncEngine({
    store,
    readRow: () => server.readRow(),
    writeRow: (s, stamp) => server.writeRow(s, stamp),
  });

  await engine.sync();

  assert.deepEqual(server.row.data.correctEver, ["q1", "q2"], "finished work must reach the server");
  assert.equal(server.row.data.history.length, 1, "exam history must reach the server");
  assert.ok(server.row.data.session, "an in-progress session must reach the server");
  assert.equal(store.snapshot().correctEver.length, 2, "and must not vanish locally");
});
