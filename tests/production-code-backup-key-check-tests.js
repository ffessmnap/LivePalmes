"use strict";
const assert = require("node:assert/strict"), crypto = require("node:crypto"), fs = require("node:fs"), path = require("node:path");
const yaml = require("./firestore-rules/node_modules/js-yaml");
const check = require("../tools/production-code-backup-key-check");
const record = { schema: 2, keyId: "fixture-v2", key: crypto.randomBytes(32).toString("base64") };
const env = { GITHUB_REPOSITORY: "ffessmnap/LivePalmes", GITHUB_REF: "refs/heads/main", GITHUB_EVENT_NAME: "workflow_dispatch", GITHUB_RUN_ATTEMPT: "1",
  GITHUB_WORKFLOW_REF: "ffessmnap/LivePalmes/.github/workflows/production-code-backup-key-check.yml@refs/heads/main",
  GITHUB_SHA: "a".repeat(40), EXPECTED_COMMIT: "a".repeat(40), GITHUB_RUN_ID: "12345", VERIFIED_MAIN_CI: "true", LIVEPALMES_CODE_BACKUP_KEY_V2: JSON.stringify(record) };
const proof = check.probe(env);
assert.equal(proof.keyFingerprint, crypto.createHash("sha256").update(Buffer.from(record.key, "base64")).digest("hex"));
assert(proof.restoredExactly); assert(proof.syntheticCodeOnly); assert(!proof.googleCredentialsRead); assert(!proof.keyMaterialExported);
assert(!JSON.stringify(proof).includes(record.key));
for (const name of Object.keys(env).filter(key => key !== "LIVEPALMES_CODE_BACKUP_KEY_V2")) {
  let keyRead = false;
  const invalid = { ...env, [name]: "wrong" };
  Object.defineProperty(invalid, "LIVEPALMES_CODE_BACKUP_KEY_V2", { get() { keyRead = true; throw new Error("Secret must not be read"); } });
  assert.throws(() => check.probe(invalid)); assert(!keyRead, name);
}
assert.throws(() => check.probe({ ...env, LIVEPALMES_CODE_BACKUP_KEY_V2: "" }));
assert.throws(() => check.probe({ ...env, GITHUB_RUN_ID: "9007199254740993" }));
const source = fs.readFileSync(path.join(__dirname, "../.github/workflows/production-code-backup-key-check.yml"), "utf8");
const workflow = yaml.load(source), job = workflow.jobs.check;
assert.deepEqual(Object.keys(workflow.on), ["workflow_dispatch"]);
assert.deepEqual(workflow.permissions, { contents: "read", actions: "read" });
assert.equal(job.environment, "production");
assert.equal(job.if, "github.ref == 'refs/heads/main' && github.run_attempt == 1 && inputs.expected_commit == github.sha");
assert.equal(workflow.concurrency["cancel-in-progress"], false);
assert.equal(job.steps.filter(step => step.uses).length, 3);
assert.deepEqual(job.steps.filter(step => step.uses).map(step => step.uses), [
  "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
  "actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1",
  "actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02"
]);
const ci = job.steps.findIndex(step => step.id === "ci"), guard = job.steps.findIndex(step => step.env?.VERIFIED), secret = job.steps.findIndex(step => step.env?.LIVEPALMES_CODE_BACKUP_KEY_V2);
assert(ci < guard && guard < secret);
assert.equal(job.steps[ci].run, 'python tools/test-verification-evidence.py reuse-publication "$RUNNER_TEMP/code-backup-key-ci"');
assert.equal(job.steps[guard].run, 'test "$VERIFIED" = true');
assert.equal(job.steps[secret].run, 'node tools/production-code-backup-key-check.js "$RUNNER_TEMP/code-backup-key-proof"');
assert.equal(job.steps[secret].env.VERIFIED_MAIN_CI, "${{ steps.ci.outputs.verified }}");
assert.equal(job.steps[secret].env.LIVEPALMES_CODE_BACKUP_KEY_V2, "${{ secrets.LIVEPALMES_CODE_BACKUP_KEY_V2 }}");
assert.equal((source.match(/secrets\./g) || []).length, 1);
assert(!/google-github-actions|FIREBASE_SERVICE_ACCOUNT|GOOGLE_APPLICATION_CREDENTIALS|id-token/.test(source));
assert.equal(job.steps.at(-1).with.path, "${{ runner.temp }}/code-backup-key-proof/code-backup-key-check.json");
console.log("Cle code : contexte ferme avant secret, preuve fictive sans cle, workflow manuel/main/protege, CI exacte avant secret et aucun acces Google verifies.");
