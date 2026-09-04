"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  CAPABILITIES, CONFIRMATION, PROJECT_ID, accessDirectoryKeys, accessScopes,
  assertTestTarget, capabilitiesMap, capabilityMapsEqual, loadFirebaseAdmin, parseArgs, validateProfileArgs
} = require("../tools/bootstrap-firebase-test-access-user");

assert.equal(PROJECT_ID, "livepalmes-test");
assert.equal(CONFIRMATION, "livepalmes-test-access-bootstrap");
assert.equal(CAPABILITIES.length, 10);
assert.ok(CAPABILITIES.includes("admin.full"));
assert.deepEqual(Object.values(capabilitiesMap()), Array(10).fill(true));

const reversedCapabilities = Object.fromEntries(Object.entries(capabilitiesMap()).reverse());
assert.equal(capabilityMapsEqual(reversedCapabilities), true);
assert.equal(capabilityMapsEqual({ ...reversedCapabilities, "admin.full": false }), false);
assert.equal(capabilityMapsEqual({ ...reversedCapabilities, extra: true }), false);

const args = parseArgs([
  "--project", PROJECT_ID, "--uid", "recipe-uid", "--first-name", "Recette",
  "--last-name", "LivePalmes", "--club-id", "test-club", "--region-id", "test-region"
]);
validateProfileArgs(args);
assert.deepEqual(accessScopes(args)["engagements.club.manage"], { scopeType: "club", scopeId: "test-club" });
assert.deepEqual(accessScopes(args)["engagements.region.manage"], { scopeType: "region", scopeId: "test-region" });
assert.equal(new Set(accessDirectoryKeys()).size, 22);
assertTestTarget(args, { TARGET_FIREBASE_PROJECT: PROJECT_ID });
assert.throws(() => assertTestTarget({ ...args, project: "forbidden" }, { TARGET_FIREBASE_PROJECT: PROJECT_ID }), /Cible refusée/);
assert.throws(() => assertTestTarget({ ...args, apply: true }, { TARGET_FIREBASE_PROJECT: PROJECT_ID }), /Écriture refusée/);
assert.doesNotThrow(() => assertTestTarget(
  { ...args, apply: true, confirm: CONFIRMATION },
  { TARGET_FIREBASE_PROJECT: PROJECT_ID, GCLOUD_PROJECT: PROJECT_ID }
));

const firebaseAdmin = loadFirebaseAdmin();
assert.equal(typeof firebaseAdmin.initializeApp, "function");
assert.equal(typeof firebaseAdmin.applicationDefault, "function");
assert.equal(typeof firebaseAdmin.getAuth, "function");
assert.equal(typeof firebaseAdmin.getFirestore, "function");

const source = fs.readFileSync(path.join(__dirname, "..", "tools", "bootstrap-firebase-test-access-user.js"), "utf8");
assert.doesNotMatch(source, /nodemailer|SMTP|onSchedule|firebase deploy/);
assert.doesNotMatch(source, /functions\/node_modules\/firebase-admin/);
assert.match(source, /createRequire/);
assert.match(source, /credentials\.project_id !== PROJECT_ID/);
assert.match(source, /await auth\.setCustomUserClaims/);
assert.match(source, /batch\.set\(db\.collection\("users"\)/);
assert.match(source, /capabilityMapsEqual/);

console.log("Bootstrap du compte de recette Firebase TEST : OK");
