"use strict";
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { prepare, summary, makeVerifiedBackup, restoreBackup, proposedWrite } = require("../tools/user-name-correction-plan");
const prefix = "projects/livepalmes/databases/(default)/documents/users/";
const beforeVersion = "2026-10-30T08:00:00.123456789Z";
const afterVersion = "2026-10-30T09:00:00.123456789Z";
const doc = (uid, first = "DUPONT", last = "Élodie") => ({ name: prefix + uid, updateTime: beforeVersion,
  fields: { firstName: { stringValue: first }, lastName: { stringValue: last }, email: { stringValue: "fictif@example.invalid" },
    capabilities: { mapValue: { fields: { "admin.full": { booleanValue: false } } } },
    lastLoginAt: { timestampValue: beforeVersion }, preference: { nullValue: null }, balance: { integerValue: "9007199254740993" } } });
const source = doc("fiction-1");
const original = JSON.parse(JSON.stringify(source));
const partial = doc("partial"); delete partial.fields.firstName;
const invalid = doc("invalid"); invalid.fields.lastName = { integerValue: "12" };
const documents = [source, doc("same", "Alex", "Alex"), partial, invalid, doc("space", "Alex", " alex "), doc("empty", "", "Nom")];
const plan = prepare(documents, "users-names-20261030-fiction");
assert.deepEqual(summary(plan), { total: 6, counts: { swap: 1, "partial-or-empty": 2, "invalid-type": 1, identical: 1, "equivalent-review": 1 }, batches: 1 });
const proposal = proposedWrite(plan, source.name, source);
assert.equal(proposal.status, "proposed-only");
assert.deepEqual(proposal.write.updateMask.fieldPaths, ["firstName", "lastName"]);
assert.deepEqual(proposal.write.currentDocument, { updateTime: beforeVersion });
assert.equal(proposal.write.update.fields.firstName.stringValue, "Élodie");
assert.deepEqual(source, original);

// Fake atomic compare-and-set: preserve every other typed Firestore field.
function simulateCommit(current, write, nextVersion = afterVersion) {
  if (current.updateTime !== write.currentDocument.updateTime) throw new Error("precondition-failed");
  return { ...current, updateTime: nextVersion, fields: { ...current.fields, ...write.update.fields } };
}
const after = simulateCommit(source, proposal.write);
assert.deepEqual(after.fields.email, source.fields.email);
assert.deepEqual(Object.fromEntries(Object.entries(after.fields).filter(([key]) => !["firstName", "lastName"].includes(key))),
  Object.fromEntries(Object.entries(source.fields).filter(([key]) => !["firstName", "lastName"].includes(key))));
assert.throws(() => simulateCommit({ ...source, updateTime: afterVersion }, proposal.write), /precondition/);
assert.equal(proposedWrite(plan, source.name, after).status, "concurrent-or-uncertain-conflict"); // Lost response: never swap again.
const receipt = { name: source.name, planDigest: plan.digest, afterVersion };
assert.equal(proposedWrite(plan, source.name, after, receipt).status, "already-recorded-no-write");
assert.equal(proposedWrite(plan, prefix + "created-later", doc("created-later")).status, "outside-frozen-scope");
assert.equal(proposedWrite(plan, source.name, null).status, "missing-conflict");
assert.equal(proposedWrite(plan, source.name, { ...source, fields: { ...source.fields, email: { stringValue: "autre@example.invalid" } } }).status, "concurrent-or-uncertain-conflict");
assert.equal(proposedWrite(plan, source.name, after, null, "rollback").status, "receipt-required");
const rollback = proposedWrite(plan, source.name, after, receipt, "rollback");
assert.deepEqual(rollback.write.update.fields, { firstName: source.fields.firstName, lastName: source.fields.lastName });
const restored = simulateCommit(after, rollback.write, "2026-10-30T09:30:00.123456789Z");
assert.deepEqual(restored.fields, original.fields);
assert.equal(proposedWrite(plan, source.name, restored).status, "concurrent-or-uncertain-conflict");
assert.equal(proposedWrite(plan, source.name, restored, receipt, "rollback").status, "concurrent-or-uncertain-conflict");
assert.equal(proposedWrite(plan, source.name, { ...after, updateTime: "2026-10-30T10:00:00Z" }, receipt, "rollback").status, "concurrent-or-uncertain-conflict");
assert.throws(() => proposedWrite(plan, source.name, after, { ...receipt, planDigest: "wrong" }));
assert.throws(() => prepare([source, source], plan.operationId));
assert.throws(() => prepare(Array(1001).fill(source), plan.operationId));
assert.throws(() => prepare([{ ...source, name: source.name.replace("livepalmes/", "livepalmes-test/") }], plan.operationId));
assert.throws(() => prepare([{ ...source, name: source.name + "/nested/doc" }], plan.operationId));
assert.throws(() => summary({ ...plan, operationId: "different-operation" }));
const key = randomBytes(32);
const encrypted = makeVerifiedBackup(documents, plan, key);
assert(!encrypted.includes(Buffer.from("fictif@example.invalid")));
assert.deepEqual(restoreBackup(encrypted, key).documents, documents);
assert.throws(() => restoreBackup(encrypted, randomBytes(32)));
const damaged = Buffer.from(encrypted); damaged[damaged.length - 1] ^= 1;
assert.throws(() => restoreBackup(damaged, key));
assert.throws(() => makeVerifiedBackup([source], plan, key));
// A rollback, too, invalidates the original version: reusing this plan cannot reapply it.
assert.equal(proposedWrite(plan, source.name, { ...original, updateTime: afterVersion }).status, "concurrent-or-uncertain-conflict");
console.log("Preparation noms utilisateurs : simulations hors reseau reussies (plan, anomalies, gel, concurrence, reprise, rollback, sauvegarde chiffree et alteration). Aucun service distant utilise.");
