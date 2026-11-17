"use strict";
// Real crypto and CLI, random disposable keys and fake code only; no credentials/network.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const { spawnSync } = require("node:child_process");
const v2 = require("../tools/production-code-backup-crypto");
const v1 = require("../tools/production-backup-crypto");
const record = { schema: 2, keyId: "code-test-20261117", key: crypto.randomBytes(32).toString("base64") };
const context = { project: "livepalmes", repository: "ffessmnap/LivePalmes", kind: "production-code", candidate: "a".repeat(40), runId: 123456 };
const original = Buffer.from("fixture: code et configuration, aucune donnee metier");
const encrypted = v2.seal(original, record, context);
assert(!encrypted.includes(original));
assert(!encrypted.includes(Buffer.from(record.key)));
assert.deepEqual(v2.open(encrypted, record, context), original);
assert.deepEqual(v2.open(v2.seal(Buffer.alloc(0), record, context), record, context), Buffer.alloc(0));
assert.notDeepEqual(v2.seal(original, record, context), encrypted, "Fresh salt and IV for every seal");
const reordered = Object.fromEntries(Object.entries(context).reverse());
assert.deepEqual(v2.open(encrypted, record, reordered), original);
for (const changed of [
  { ...record, key: crypto.randomBytes(32).toString("base64") }, { ...record, keyId: "another-key" },
  { ...record, schema: 1 }, { ...record, key: Buffer.alloc(32).toString("base64") },
  { ...record, key: "invalid-canary" }, { ...record, keyId: 123 }, { ...record, extra: true }, null
]) assert.throws(() => v2.open(encrypted, changed, context));
for (const changed of [null, { ...record, schema: 1 }, { ...record, keyId: 123 },
  { ...record, key: "invalid-canary" }, { ...record, extra: true },
  { ...record, key: Buffer.alloc(32).toString("base64") }])
  assert.throws(() => v2.seal(original, changed, context));
for (const changed of [
  { ...context, candidate: "b".repeat(40) }, { ...context, runId: 123457 },
  { ...context, project: "livepalmes-test" }, { ...context, repository: "other/LivePalmes" },
  { ...context, kind: "nap-data" }, { ...context, extra: true },
  { ...context, runId: "123456" }, { ...context, runId: 0 }, { ...context, candidate: "not-a-commit" }
]) assert.throws(() => v2.open(encrypted, record, changed));
// Every byte is authenticated, including lengths, JSON, key ID, context, salt and IV.
for (let index = 0; index < encrypted.length; index++) {
  const damaged = Buffer.from(encrypted); damaged[index] ^= 1;
  assert.throws(() => v2.open(damaged, record, context), `Changed byte ${index}`);
}
for (let length = 0; length < encrypted.length; length++)
  assert.throws(() => v2.open(encrypted.subarray(0, length), record, context));
assert.throws(() => v2.open(Buffer.concat([encrypted, Buffer.from([0])]), record, context));
const oversized = Buffer.from(encrypted); oversized.writeUInt32BE(1025, Buffer.byteLength("LIVEPALMES_CODE_BACKUP_V2\n"));
assert.throws(() => v2.open(oversized, record, context));
const legacy = v1.seal(original, "fake-legacy-key");
assert.deepEqual(v1.open(legacy, "fake-legacy-key"), original);
assert.throws(() => v2.open(legacy, record, context), "No implicit V1 downgrade");
assert.throws(() => v1.open(encrypted, "fake-legacy-key"));
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "livepalmes-code-backup-v2-"));
const tool = path.resolve(__dirname, "../tools/production-code-backup-crypto.js");
function cli(mode, input, output, override = {}) {
  return spawnSync(process.execPath, [tool, mode, input, output], { encoding: "utf8", env: {
    ...process.env, LIVEPALMES_CODE_BACKUP_KEY_V2: JSON.stringify(record),
    LIVEPALMES_CODE_BACKUP_CONTEXT: JSON.stringify(context), GOOGLE_APPLICATION_CREDENTIALS: "nonexistent-credential-file", ...override
  } });
}
try {
  const source = path.join(directory, "source"), sealed = path.join(directory, "archive.enc"), restored = path.join(directory, "restored");
  fs.mkdirSync(source); fs.mkdirSync(path.join(source, "nested"));
  fs.writeFileSync(path.join(source, "nested/code.txt"), original);
  const sealedResult = cli("seal", source, sealed);
  assert.equal(sealedResult.status, 0, sealedResult.stderr);
  const openedResult = cli("open", sealed, restored);
  assert.equal(openedResult.status, 0, openedResult.stderr);
  assert.deepEqual(fs.readFileSync(path.join(restored, "nested/code.txt")), original);
  for (const override of [
    { LIVEPALMES_CODE_BACKUP_KEY_V2: "" },
    { LIVEPALMES_CODE_BACKUP_KEY_V2: "secret-canary-malformed-json" },
    { LIVEPALMES_CODE_BACKUP_KEY_V2: JSON.stringify({ ...record, key: crypto.randomBytes(32).toString("base64") }) },
    { LIVEPALMES_CODE_BACKUP_CONTEXT: JSON.stringify({ ...context, runId: 999 }) }
  ]) {
    const target = path.join(directory, "must-not-exist"), result = cli("open", sealed, target, override);
    assert.equal(result.status, 1); assert(!fs.existsSync(target));
    assert(!result.stderr.includes("secret-canary")); assert(!result.stderr.includes(record.key));
    assert(!result.stdout.includes(record.key));
  }
  assert.equal(cli("open", sealed, restored).status, 1, "Existing destination preserved");
  assert.equal(cli("seal", source, sealed).status, 1, "Existing archive preserved");
  assert.deepEqual(fs.readFileSync(path.join(restored, "nested/code.txt")), original);
} finally {
  assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
  assert(path.basename(directory).startsWith("livepalmes-code-backup-v2-"));
  fs.rmSync(directory, { recursive: true, force: true });
}
console.log("Sauvegarde code V2 : contexte exact, alteration/troncature, mauvaises cles, refus V1, CLI sans ADC et restauration fictive verifies.");
