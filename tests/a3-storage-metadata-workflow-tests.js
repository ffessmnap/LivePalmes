"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const yaml = require("./firestore-rules/node_modules/js-yaml");
const source = fs.readFileSync(path.join(__dirname, "../.github/workflows/a3-storage-exposure-metadata.yml"), "utf8");
const workflow = yaml.load(source), job = workflow.jobs.observe;
assert.deepEqual(Object.keys(workflow.on), ["workflow_dispatch"]);
assert.deepEqual(Object.keys(workflow.on.workflow_dispatch.inputs), ["expected_commit"]);
assert.deepEqual(workflow.permissions, { contents: "read", actions: "read" });
assert.equal(job.environment, "a2-firebase-backup");
assert.equal(job.if, "github.ref == 'refs/heads/main' && github.run_attempt == 1 && inputs.expected_commit == github.sha");
assert.deepEqual(workflow.concurrency, { group: "a2-firebase-backup", "cancel-in-progress": false });
assert.deepEqual(job.steps.filter(step => step.uses).map(step => step.uses), [
  "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
  "actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1",
  "google-github-actions/auth@7c6bc770dae815cd3e89ee6cdf493a5fab2cc093",
  "google-github-actions/setup-gcloud@aa5489c8933f4cc7a4f7d45035b3b1440c9c10db",
  "actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02"
]);
const ci = job.steps.findIndex(step => step.id === "ci"), guard = job.steps.findIndex(step => step.env?.VERIFIED), auth = job.steps.findIndex(step => step.uses?.startsWith("google-github-actions/auth@"));
assert(ci >= 0 && ci < guard && guard < auth);
assert.equal(job.steps[ci].run, 'python tools/test-verification-evidence.py reuse-publication "$RUNNER_TEMP/a35-ci"');
assert.equal(job.steps[guard].run, 'test "$VERIFIED" = true');
assert.deepEqual(job.steps[auth].with, { credentials_json: "${{ secrets.A2_BACKUP_SERVICE_ACCOUNT_JSON }}", project_id: "livepalmes-test" });
assert.equal((source.match(/secrets\./g) || []).length, 1);
const read = job.steps.find(step => step.env?.VERIFIED_MAIN_CI);
assert.equal(read.env.VERIFIED_MAIN_CI, "${{ steps.ci.outputs.verified }}");
assert.equal(read.run, 'python tools/a3-storage-exposure-metadata.py "$RUNNER_TEMP/a35-storage-metadata.json"');
assert.equal(job.steps.at(-1).with.path, "${{ runner.temp }}/a35-storage-metadata.json");
assert(!/A2_BACKUP_ENCRYPTION_KEY|a2-firebase-backup\.js|drive\.googleapis|firebase deploy|id-token/.test(source));
console.log("Storage metadata workflow: exact manual main, existing read-only identity after CI, A2 serialization, fixed command/report, pinned actions and no A2 execution or encryption key passed.");
