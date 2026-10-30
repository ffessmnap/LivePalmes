"use strict";
const assert = require("node:assert/strict");
const { prepare, proposedWrite } = require("../tools/user-name-correction-plan");
const { runBatch, proposedBatch } = require("../tools/user-name-correction-engine");
const original = { name: "projects/livepalmes/databases/(default)/documents/users/fiction", updateTime: "2026-10-30T00:00:00.123456789Z",
  fields: { firstName: { stringValue: "NOM" }, lastName: { stringValue: "Prénom" }, email: { stringValue: "fiction@example.invalid" }, status: { stringValue: "inactive" }, rights: { mapValue: { fields: { full: { booleanValue: false } } } } } };
const plan = prepare([original], "fiction-correction-operation");
const originals = new Map([[original.name, original]]);
function fixture() {
  let current = structuredClone(original), commits = 0;
  const events = [];
  return { events, get current() { return current; }, get commits() { return commits; },
    read: async () => new Map([[original.name, structuredClone(current)]]),
    persist: async (kind, value) => { events.push({ kind, value }); }, observe: async () => { events.push({ kind: "observed" }); },
    commit: async writes => { assert.equal(events.at(-1).kind, "intent"); assert.equal(writes.length, 1); assert.equal(current.updateTime, writes[0].currentDocument.updateTime);
      commits++; current = { ...current, fields: { ...current.fields, ...writes[0].update.fields }, updateTime: `2026-10-30T0${commits}:00:00.123456789Z` };
      return { commitTime: current.updateTime, writeResults: [{ updateTime: current.updateTime }] }; }
  };
}
(async () => {
  const f = fixture();
  const saved = await runBatch({ plan, entries: plan.entries, originals, ...f });
  assert.deepEqual(f.events.map(e => e.kind), ["intent", "receipt", "observed", "verified"]);
  assert.equal(f.current.fields.firstName.stringValue, "Prénom");
  assert.deepEqual(f.current.fields.rights, original.fields.rights); assert.equal(f.current.fields.status.stringValue, "inactive");
  await assert.rejects(runBatch({ plan, entries: plan.entries, originals, ...f }), /previously processed/);
  assert.equal(f.commits, 1);
  const restored = await runBatch({ plan, entries: plan.entries, originals, ...f, direction: "rollback", receipts: saved });
  assert.deepEqual(f.current.fields, original.fields); assert.equal(f.commits, 2);
  assert.equal(proposedWrite(plan, original.name, f.current).status, "concurrent-or-uncertain-conflict");
  await assert.rejects(runBatch({ plan, entries: plan.entries, originals, ...f, direction: "rollback", receipts: saved }), /previously processed/);
  const noJournal = fixture(); noJournal.persist = async () => { throw new Error("disk full"); };
  await assert.rejects(runBatch({ plan, entries: plan.entries, originals, ...noJournal }), /disk full/); assert.equal(noJournal.commits, 0);
  const lost = fixture(), acceptBeforeLoss = lost.commit; lost.commit = async writes => { await acceptBeforeLoss(writes); throw new Error("lost response"); };
  await assert.rejects(runBatch({ plan, entries: plan.entries, originals, ...lost }), /never retry/);
  assert.equal(lost.events.at(-1).kind, "uncertain"); assert(!lost.events.some(e => e.kind === "verified"));
  assert.equal(lost.commits, 1);
  await assert.rejects(runBatch({ plan, entries: plan.entries, originals, ...lost }), /previously processed/);
  assert.equal(lost.commits, 1);
  const failProjection = fixture(); failProjection.observe = async () => { throw new Error("projection not converged"); };
  await assert.rejects(runBatch({ plan, entries: plan.entries, originals, ...failProjection }), /projection not converged/);
  assert.equal(failProjection.commits, 1); assert(failProjection.events.some(e => e.kind === "receipt")); assert(!failProjection.events.some(e => e.kind === "verified"));
  assert.throws(() => proposedBatch(plan, Array(11).fill(plan.entries[0]), originals));
  assert.throws(() => proposedBatch(plan, [plan.entries[0], plan.entries[0]], originals));
  assert.equal(restored.length, 1);
  console.log("Correction engine: durable intent before commit, two-field mask, preserved inactive rights, verified receipts, double-apply/rollback refusal, disk failure, lost reply and projection failure passed offline.");
})().catch(error => { console.error(error); process.exitCode = 1; });
