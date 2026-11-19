"use strict";
require("./helpers/offline-network");
const assert = require("node:assert/strict");
const { run } = require("../functions/nap-notification-sweep");
const { projectionChanged } = require("../functions/nap-club-account-emails");

function queueFixture(events) {
  let rows = events.slice();
  return {
    where(field, op, value) {
      rows = rows.filter(row => op === "==" ? row[field] === value : row[field] <= value);
      return this;
    },
    orderBy(field) { rows.sort((a, b) => a[field].localeCompare(b[field])); return this; },
    limit(size) { rows = rows.slice(0, size); return this; },
    async get() { return { docs: rows.map(row => ({ id: row.id, data: () => row })) }; }
  };
}

async function verify() {
  const before = { email: "club@example.invalid", clubId: "1", status: "active" };
  const snapshot = data => ({ exists: data !== null, data: () => data });
  const changed = after => projectionChanged({ before: snapshot(before), after: snapshot(after) });
  assert.equal(changed({ ...before, lastLoginAt: "2026-11-19" }), false);
  for (const patch of [{ email: "other@example.invalid" }, { clubId: "2" }, { status: "disabled" },
    { emailPreferences: { competitionNotifications: false } }]) assert.equal(changed({ ...before, ...patch }), true);
  assert.equal(changed(null), true);
  assert.equal(projectionChanged({ before: snapshot(null), after: snapshot(before) }), true);

  const old = Array.from({ length: 5 }, () => ({ source: "ancienne", runAt: "01" }));
  const pending = Array.from({ length: 6 }, (_, id) => ({ source: "nap", runAt: "02", id }));
  pending[0].deliveryMode = "bcc-v1";
  const failures = [], seen = [];
  const work = { queue: queueFixture([...old, ...pending]), limit: 5, now: "03",
    enqueue: async event => { seen.push(event.id); throw Object.assign(Error("fixture confidentielle"), { code: "unavailable" }); },
    prepare: async event => seen.push(event.id), deliver: async () => seen.push("delivery"),
    report: (_, data) => failures.push(data) };
  await run(work);
  assert.deepEqual(seen, [0, 1, 2, 3, 4, "delivery"]);
  assert.deepEqual(failures, [{ stage: "enqueue", cause: "unavailable" }]);
  await assert.rejects(run({ ...work, queue: queueFixture([]), deliver: async () => { throw Error("fixture confidentielle"); } }), /Distribution/);
  assert.deepEqual(failures.at(-1), { stage: "deliver", cause: "internal" });
}
verify().catch(error => { console.error(error); process.exitCode = 1; });
