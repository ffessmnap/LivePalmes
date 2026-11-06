"use strict";
// Transfer an already authorized local snapshot using the existing CI backup key.
// The CI receives Direct data encrypted to its public key, never the NAP password.
const crypto = require("node:crypto"), assert = require("node:assert/strict");
const { seal, open } = require("./production-backup-crypto");
function wrap(data, publicKeys) {
  const secret = crypto.randomBytes(32);
  const keys = Object.fromEntries(Object.entries(publicKeys).map(([id, key]) => [id,
    crypto.publicEncrypt({ key, oaepHash: "sha256" }, secret).toString("base64")]));
  const ciphertext = seal(data, secret);
  assert.deepEqual(open(ciphertext, secret), data);
  return { schema: 1, keys, ciphertext: ciphertext.toString("base64") };
}
function unwrap(envelope, credentials) {
  assert.equal(envelope.schema, 1);
  const wrapped = envelope.keys[credentials.private_key_id];
  assert(wrapped, "Cle de sauvegarde CI non presente dans le transfert");
  const secret = crypto.privateDecrypt({ key: credentials.private_key, oaepHash: "sha256" }, Buffer.from(wrapped, "base64"));
  return open(Buffer.from(envelope.ciphertext, "base64"), secret);
}
module.exports = { wrap, unwrap };
if (require.main === module) {
  (async () => {
    const fs = require("node:fs"), { execFileSync } = require("node:child_process");
    const { createNapPool } = require("../functions/nap-connection");
    const { snapshot } = require("./direct-production-data");
    assert.equal(execFileSync("git", ["diff", "5b76e1e37eddba618b25c41c92a8168446fe4115", "--", "functions/"], { encoding: "utf8" }), "");
    const pool = createNapPool(fs.readFileSync(0, "utf8").trim());
    try {
      const value = await snapshot(pool);
      const response = await fetch("https://www.googleapis.com/robot/v1/metadata/x509/github-actions-livepalmes-back%40livepalmes.iam.gserviceaccount.com", { signal: AbortSignal.timeout(30000) });
      assert.equal(response.status, 200);
      const publicKeys = await response.json();
      assert(Object.keys(publicKeys).length > 0 && Object.keys(publicKeys).length <= 10);
      const envelope = JSON.stringify(wrap(Buffer.from(JSON.stringify(value)), publicKeys));
      const transfer = Buffer.from(envelope).toString("base64");
      assert(Buffer.byteLength(transfer) < 50000, "Transfert ponctuel trop volumineux, workflow non lance");
      fs.writeFileSync(process.argv[2], transfer, { mode: 0o600 });
      fs.writeFileSync(process.argv[2] + ".copy", transfer, { mode: 0o600 });
      assert.equal(fs.readFileSync(process.argv[2], "utf8"), fs.readFileSync(process.argv[2] + ".copy", "utf8"));
      console.log(JSON.stringify({ counts: Object.fromEntries(Object.entries(value.data).map(([name, rows]) => [name, rows.length])),
        encryptedTransferSha256: crypto.createHash("sha256").update(transfer).digest("hex"), nativeRowsWritten: 0 }));
    } finally { await pool.end(); }
  })().catch(error => { console.error("Transfert Direct interrompu", error.code || error.name); process.exitCode = 1; });
}
