"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const tool = require("../tools/prepare-production-notifications");
const { LOTS } = require("../tools/firebase-test-backend-lots");
const source = fs.readFileSync(require.resolve("../functions/index.js"), "utf8");
// Execute the real public handler with the staged PROD secret adapter, offline.
const { adaptSecrets } = require("../tools/prepare-production-nap-reader");
assert.throws(() => adaptSecrets("unexpected"));
const adapter = adaptSecrets("const defineSecret = name => name;");
const publicBlock = source.slice(source.indexOf('if (ENVIRONMENT.sportingDataSource === "nap")'),
  source.indexOf('if (ENVIRONMENT.projectId === "livepalmes-test")'));
let credentialSeen;
const runtime = { process: { env: {} }, exports: {}, ENVIRONMENT: { sportingDataSource: "nap", name: "production" },
  REGION: "europe-west1", CALLABLE_OPTIONS: {}, onRequest: (_options, handler) => handler,
  onCall: (_options, handler) => handler,
  createNapPool: credential => { credentialSeen = credential; return { mockPool: true }; },
  require: name => { assert.equal(name, "./nap-direct-swimmer"); return {
    readDirectSwimmer: async (pool, id) => { assert.equal(pool.mockPool, true); assert.equal(id, "7322"); return { source: "nap" }; }
  }; }
};
vm.createContext(runtime);
vm.runInContext(adapter + "\n" + publicBlock, runtime);
assert.equal(credentialSeen, undefined); // No value read during deployment analysis.
runtime.process.env.LIVEPALMES_NAP_PASSWORD = "offline-runtime-fixture";
runtime.exports.readNapPublicSwimmer({ method: "GET", query: { id: "7322" } }, {
  set: () => {}, status: code => { throw new Error("Unexpected HTTP status " + code); },
  json: value => { assert.equal(value.source, "nap"); assert.equal(credentialSeen, "offline-runtime-fixture"); }
}).catch(error => { console.error(error.message); process.exitCode = 1; });
const plan = tool.plan("a".repeat(40));
assert.deepEqual(tool.approved({}), []);
const approval = { additionalNotificationFunctions: [...tool.FUNCTIONS], additionalNotificationApproval: "Infra exact release", initialAutomaticMailEnabled: false };
assert.deepEqual(tool.approved(approval), tool.FUNCTIONS);
for (const changed of [{initialAutomaticMailEnabled: true}, {additionalNotificationApproval: " "},
  {additionalNotificationFunctions: ["resumePerformancePublicationJobs"]}]) assert.throws(() => tool.approved({...approval, ...changed}));
assert.equal(plan.productionDeploymentAuthorized, false);
assert.equal(plan.initialAutomaticMailEnabled, false);
assert.equal(new Set(plan.functions).size, plan.functions.length);
for (const name of plan.functions) {
  assert.ok([...LOTS.email, ...LOTS.schedulers].includes(name));
  assert.ok(source.includes("exports." + name + " ="));
}
for (const name of plan.excluded) assert.ok(!plan.functions.includes(name));
for (const candidate of ["main", "a".repeat(39), "A".repeat(40), "a".repeat(40) + "\n"])
  assert.throws(() => tool.plan(candidate));
// Compare the actual option expressions, without loading Firebase or contacting Google.
const definitions = source.slice(source.indexOf("const ENGAGEMENT_MAIL_CALLABLE_OPTIONS ="),
  source.indexOf("const MIGRATION_CALLABLE_OPTIONS ="));
const box = { CALLABLE_OPTIONS: {}, ENVIRONMENT: { sportingDataSource: "nap" },
  ENGAGEMENT_NOTIFICATION_MAIL_SECRETS: [...tool.MAIL_SECRETS],
  LIVEPALMES_NOTIFICATION_LINK_SECRET: "LIVEPALMES_NOTIFICATION_LINK_SECRET",
  ENGAGEMENT_MAIL_SECRETS: [], LIVEPALMES_ENFORCE_APP_CHECK: false, REGION: "europe-west1", defineSecret: name => name };
vm.runInNewContext(definitions + "\nthis.preview = ENGAGEMENT_NOTIFICATION_PREVIEW_OPTIONS; this.closure = ENGAGEMENT_CLOSURE_SCHEDULER_OPTIONS; this.preference = NOTIFICATION_PREFERENCE_CALLABLE_OPTIONS;", box);
assert.deepEqual([...box.preview.secrets], plan.expectedSecrets.prepareEngagementClubRecapEmails);
assert.deepEqual([...box.preference.secrets], plan.expectedSecrets.disableCompetitionEmailNotifications);
assert.deepEqual([...box.closure.secrets], plan.expectedSecrets.closeDueEngagementCompetitions);
assert.equal(box.closure.schedule, "*/5 * * * *");
assert.equal(box.closure.timeZone, "Europe/Paris");
console.log("Notification preparation: exact scope, default-off, actual NAP bindings and unchanged scheduler verified offline.");
