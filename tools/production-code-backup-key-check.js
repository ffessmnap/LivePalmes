"use strict";
// Manual protected-main check: synthetic code only, no Google identity or archive access.
const crypto = require("node:crypto");
const fs = require("node:fs"), path = require("node:path");
const backup = require("./production-code-backup-crypto");
function context(env) {
  if (env.GITHUB_REPOSITORY !== "ffessmnap/LivePalmes" || env.GITHUB_REF !== "refs/heads/main" ||
      env.GITHUB_EVENT_NAME !== "workflow_dispatch" || env.GITHUB_RUN_ATTEMPT !== "1" ||
      env.GITHUB_WORKFLOW_REF !== "ffessmnap/LivePalmes/.github/workflows/production-code-backup-key-check.yml@refs/heads/main" ||
      !/^[0-9a-f]{40}$/.test(env.GITHUB_SHA || "") || env.EXPECTED_COMMIT !== env.GITHUB_SHA ||
      !/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ID || "") || !Number.isSafeInteger(Number(env.GITHUB_RUN_ID)) ||
      env.VERIFIED_MAIN_CI !== "true") throw new Error("Contexte de controle protege invalide");
  return { project: "livepalmes", repository: env.GITHUB_REPOSITORY, kind: "production-code", candidate: env.GITHUB_SHA, runId: Number(env.GITHUB_RUN_ID) };
}
function probe(env) {
  const expected = context(env); // Must precede any access to the key.
  const record = JSON.parse(env.LIVEPALMES_CODE_BACKUP_KEY_V2 || "null");
  const original = Buffer.from("LIVEPALMES SYNTHETIC CODE BACKUP CHECK\n" + JSON.stringify(expected));
  const encrypted = backup.seal(original, record, expected);
  const restored = backup.open(encrypted, record, expected);
  if (!restored.equals(original)) throw new Error("Comparaison de recuperation refusee");
  const key = Buffer.from(record.key, "base64");
  const hash = value => crypto.createHash("sha256").update(value).digest("hex");
  try {
    return { schema: 1, context: expected, checkedAtUtc: new Date().toISOString(), keyId: record.keyId,
      keyFingerprint: hash(key), ciphertextSha256: hash(encrypted), restoredSha256: hash(restored),
      syntheticCodeOnly: true, restoredExactly: true, googleCredentialsRead: false,
      existingArchivesRead: false, businessDataRead: false, keyMaterialExported: false };
  } finally { key.fill(0); }
}
module.exports = { context, probe };
if (require.main === module) {
  try {
    const destination = process.argv[2];
    if (!destination || process.argv.length !== 3) throw new Error("Destination invalide");
    const report = probe(process.env);
    fs.mkdirSync(destination, { recursive: true });
    fs.writeFileSync(path.join(destination, "code-backup-key-check.json"), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
    console.log("Cle dediee controlee sur code fictif ; recuperation exacte, aucune cle exportee.");
  } catch {
    console.error("Controle de cle refuse ; aucun contenu de secret affiche.");
    process.exitCode = 1;
  }
}
