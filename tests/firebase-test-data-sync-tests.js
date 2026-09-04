"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const manifest = require("../tools/firebase-test-data-sync-manifest");
const {
  APPLY_CONFIRMATION, AUTOMATION_CONFIRMATION, assertSafety, formatDuration, isProtectedAdminProfile,
  loadFirebaseAdmin, parseArgs, shouldScanSubcollections, transformValue
} = require("../tools/sync-firebase-prod-to-test");
const {
  isProtectedAdminProfile: isVerifierProtectedAdminProfile,
  loadFirebaseAdmin: loadVerifierFirebaseAdmin
} = require("../tools/verify-firebase-test-data-sync");

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
assert.equal(dryRun.inventoryOnly, false);
const inventory = parseArgs(["--inventory-only"]);
assert.equal(inventory.apply, false);
assert.equal(inventory.inventoryOnly, true);
assert.throws(() => parseArgs(["--inventory-only", "--apply"]), /incompatible/);
assert.equal(shouldScanSubcollections({ path: "performances" }), false);
assert.equal(shouldScanSubcollections({ path: "performanceImports/import-1/performances" }), true);
assert.equal(formatDuration(3723000), "01:02:03");

const literalAdmin = { status: "active", capabilities: { "admin.full": true } };
assert.equal(isProtectedAdminProfile(literalAdmin), true);
assert.equal(isVerifierProtectedAdminProfile(literalAdmin), true);
assert.equal(isProtectedAdminProfile({ status: "active", capabilities: { admin: { full: true } } }), false);
assert.equal(isProtectedAdminProfile({ status: "disabled", capabilities: { "admin.full": true } }), false);

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
  if (serialized.includes(destination)) assert.ok(destination.includes("livepalmes-test"));
}

const syncAdmin = loadFirebaseAdmin();
assert.equal(typeof syncAdmin.initializeApp, "function");
assert.equal(typeof syncAdmin.getFirestore, "function");
assert.equal(typeof syncAdmin.getStorage, "function");
const verifierAdmin = loadVerifierFirebaseAdmin();
assert.equal(typeof verifierAdmin.initializeApp, "function");
assert.equal(typeof verifierAdmin.getFirestore, "function");
assert.equal(typeof verifierAdmin.FieldPath.documentId, "function");

const syncSource = fs.readFileSync(path.join(__dirname, "..", "tools", "sync-firebase-prod-to-test.js"), "utf8");
const verifySource = fs.readFileSync(path.join(__dirname, "..", "tools", "verify-firebase-test-data-sync.js"), "utf8");
assert.doesNotMatch(syncSource, /deleteUser|createUser|updateUser|setCustomUserClaims|sendMail|onSchedule|firebase deploy/);
assert.doesNotMatch(syncSource, /sourceDb\.(batch|doc|collection)\([^\n]+\)\.(set|create|update|delete)/);
assert.doesNotMatch(syncSource, /functions\/node_modules\/firebase-admin/);
assert.doesNotMatch(verifySource, /functions\/node_modules\/firebase-admin/);
assert.doesNotMatch(syncSource, /where\("capabilities\.admin\.full"/);
assert.doesNotMatch(verifySource, /where\("capabilities\.admin\.full"/);
assert.match(syncSource, /capabilities\?\.\["admin\.full"\]/);
assert.match(verifySource, /capabilities\?\.\["admin\.full"\]/);
assert.match(syncSource, /if \(args\.apply && !protectedAdminUids\.length\)/);
assert.match(syncSource, /if \(context\.apply\)/);
assert.match(syncSource, /FLAT_ROOT_COLLECTIONS/);
assert.match(syncSource, /--inventory-only/);
assert.match(syncSource, /Durée totale/);
assert.match(syncSource, /createRequire/);
assert.match(verifySource, /createRequire/);

console.log("Synchronisation sélective Firebase PROD vers TEST : OK");
