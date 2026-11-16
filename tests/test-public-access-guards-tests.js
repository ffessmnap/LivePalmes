"use strict";
require("./helpers/offline-network");
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const policy = require("../tools/prepare-test-public-access-guards");
const env = { TARGET_FIREBASE_PROJECT: "livepalmes-test", GCLOUD_PROJECT: "livepalmes-test", GOOGLE_CLOUD_PROJECT: "livepalmes-test",
  PUBLIC_ACCESS_GUARDS_ONLY: "true", ACCESS_REQUESTS_ONLY: "false", NOTIFICATION_FINAL_CHECK: "false", NOTIFICATION_PILOT_IDF: "false",
  NOTIFICATION_BCC_TASKS: "false", NAP_NOTIFICATION_SCHEDULER_ONLY: "false", GITHUB_REF: "refs/heads/main", GITHUB_RUN_ATTEMPT: "1", CANDIDATE_SHA: "a".repeat(40) };
policy.guard(env);
for (const key of Object.keys(env)) assert.throws(() => policy.guard({ ...env, [key]: "invalid" }), key);
assert.deepEqual(policy.NAMES, ["getPublicEngagementClubDirectory", "resolveEngagementAccessRequest", "submitEngagementAccessRequest"]);
const wrapper = 'environment.projectId !== "livepalmes-test"; environment.name !== "test"; const names = ["all"];';
assert(!policy.narrow(wrapper).includes('"all"'));
assert.throws(() => policy.narrow(wrapper + "const names = [];"));
assert.throws(() => policy.narrow("const names = [];"));
const workflow = require("./firestore-rules/node_modules/js-yaml").load(fs.readFileSync(path.join(__dirname, "../.github/workflows/livepalmes-test-backend.yml"), "utf8"));
for (const trigger of ["workflow_dispatch", "workflow_call"]) assert.equal(workflow.on[trigger].inputs.public_access_guards_only.default, false);
const steps = workflow.jobs["deployer-backend-test"].steps;
const before = steps.findIndex(step => step.run?.includes("test-public-access-guards-state.py before"));
const deploy = steps.findIndex(step => step.name === "Déployer uniquement les Functions du lot TEST");
const after = steps.findIndex(step => step.run?.includes("test-public-access-guards-state.py after"));
assert(before > 0 && before < deploy && deploy < after);
assert.equal(steps[before].if, "inputs.public_access_guards_only");
assert.equal(steps[after].if, "inputs.public_access_guards_only");
(async () => {
  const db = value => ({ collection: () => ({ doc: () => ({ get: async () => ({ data: () => value }) }) }),
    runTransaction: () => { throw Error("No settings writes permitted"); } });
  const first = await policy.mailWitness(db({ enabled: false, revision: 1 }));
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.notEqual(first, await policy.mailWitness(db({ enabled: false, revision: 2 })));
  await assert.rejects(policy.mailWitness(db({ enabled: true })), /Mails TEST actifs/);
  console.log("A3.2 TEST: closed scope, unchanged historical flags, main/first-attempt guards and read-only mail witness verified.");
})().catch(error => { console.error(error); process.exitCode = 1; });
