"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const manifest = require("../tools/firebase-test-data-sync-manifest");
const { APPLY_CONFIRMATION, AUTOMATION_CONFIRMATION, assertSafety, parseArgs, transformValue } = require("../tools/sync-firebase-prod-to-test");

assert.equal(manifest.SOURCE_PROJECT, "livepalmes");
assert.equal(manifest.DESTINATION_PROJECT, "livepalmes-test");
assert.notEqual(manifest.SOURCE_PROJECT, manifest.DESTINATION_PROJECT);
for (const name of [
  "users", "accessGrants", "auditLogs", "secrets", "security", "consoleGrants",
  "engagementMailJobs", "engagementMailRecipientShards", "engagementClosureQueue",
  "performancePublicationJobs", "performanceMigrationJobs", "dtnQualificationJobs"
]) assert.ok(manifest.EXCLUDE.includes(name), `${name} doit être exclue.`);
for (const name of ["users", "accessGrants", "auditLogs"]) assert.ok(manifest.PRESERVE_TEST.includes(name));
assert.ok(!manifest.COPY.some((name) => manifest.EXCLUDE.includes(name)));
for (const name of ["results", "liveData", "history", "performanceData", "clubs", "performances"]) {
  assert.ok(manifest.COPY_SUBCOLLECTIONS.includes(name));
}

const dryRun = parseArgs([]);
assert.equal(dryRun.apply, false);
assert.throws(() => assertSafety(
  { apply: true }, { project_id: manifest.SOURCE_PROJECT }, { project_id: manifest.DESTINATION_PROJECT }
), /Confirmation requise/);
assert.throws(() => assertSafety(
  { apply: true, confirmation: APPLY_CONFIRMATION },
  { project_id: manifest.SOURCE_PROJECT }, { project_id: manifest.DESTINATION_PROJECT }
), /email-and-schedulers-disabled/);
assert.doesNotThrow(() => assertSafety(
  { apply: true, confirmation: APPLY_CONFIRMATION, "automation-confirmation": AUTOMATION_CONFIRMATION },
  { project_id: manifest.SOURCE_PROJECT }, { project_id: manifest.DESTINATION_PROJECT }
));
assert.throws(() => assertSafety(
  { apply: false }, { project_id: manifest.DESTINATION_PROJECT }, { project_id: manifest.DESTINATION_PROJECT }
), /Couple de projets interdit/);

const transformed = transformValue({
  publicUrl: "https://storage.googleapis.com/livepalmes-public-data-718081132564/calendar/data.json",
  hosting: "https://livepalmes.web.app/performances/public/data",
  storage: "https://firebasestorage.googleapis.com/v0/b/livepalmes.firebasestorage.app/o/file"
});
const serialized = JSON.stringify(transformed);
for (const [source, destination] of manifest.REFERENCE_REPLACEMENTS) {
  assert.ok(!serialized.includes(source));
  if (JSON.stringify(transformed).includes(destination)) assert.ok(destination.includes("livepalmes-test"));
}

const source = fs.readFileSync(path.join(__dirname, "..", "tools", "sync-firebase-prod-to-test.js"), "utf8");
assert.doesNotMatch(source, /deleteUser|createUser|updateUser|setCustomUserClaims|sendMail|onSchedule|firebase deploy/);
assert.doesNotMatch(source, /sourceDb\.(batch|doc|collection)\([^\n]+\)\.(set|create|update|delete)/);
assert.match(source, /if \(args\.apply && !protectedAdminUids\.length\)/);
assert.match(source, /if \(context\.apply\)/);

console.log("Synchronisation sélective Firebase PROD vers TEST : OK");
