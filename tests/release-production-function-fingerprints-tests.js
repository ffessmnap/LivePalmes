"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const production = require("../tools/release-production-function-fingerprints");
const shared = require("../tools/release-test-function-fingerprints");
const root = path.resolve(__dirname, "..");
const metadata = fs.readFileSync(path.join(root, "tools/firebase-test-backend-lots.js"), "utf8");
const source = `const {onCall}=require("firebase-functions/v2/https");
exports.getCurrentAccessUser=onCall({},()=>1); exports.other=onCall({},()=>2);`;
const changed = (a,b) => Object.keys(b.functions).filter(n => a.functions[n] !== b.functions[n]).sort();
function print(code = source, registrySource = metadata, productionPreparer = "1f06e059d7b9379915d12f9a84f8f3d418232a35") {
  return production.analyse({ source: code, registrySource, registry: shared.registry(registrySource),
    productionPreparer, files: {}, common: [productionPreparer] });
}
const before = print();
assert.equal(before.schema, "production-selection-v1");
assert.equal(before.registryKnown, true);
const moved = metadata.replace('"getCurrentAccessUser", ', '').replace('email: [', 'email: ["getCurrentAccessUser",')
  .replace('const TEST_NON_MAIL_FUNCTIONS = Object.freeze([', 'const TEST_NON_MAIL_FUNCTIONS = Object.freeze(["getCurrentAccessUser",');
assert.deepEqual(changed(before, print(source, moved)), ["getCurrentAccessUser"]);
assert(!print(source, moved).eligibleNames.includes("getCurrentAccessUser"), "TEST exception never becomes ordinary PROD");
assert(!before.eligibleNames.includes("prepareEngagementLicenseControlBatch"));
const testOnly = metadata.replace('const TEST_NON_MAIL_FUNCTIONS = Object.freeze([', 'const TEST_NON_MAIL_FUNCTIONS = Object.freeze(["other",');
assert.deepEqual(changed(before, print(source, testOnly)), [], "TEST-only export change has no PROD effect");
const retired = metadata.replace('const NAP_UNUSED_FUNCTIONS = Object.freeze([', 'const NAP_UNUSED_FUNCTIONS = Object.freeze(["getCurrentAccessUser",');
assert.deepEqual(changed(before, print(source, retired)), ["getCurrentAccessUser"]);
assert(!print(source, retired).eligibleNames.includes("getCurrentAccessUser"));
for (const mutation of [
  metadata.replace('secrets: [],', 'secrets: ["NEW_SECRET"],'),
  metadata.replace('roles/datastore.indexAdmin', 'roles/other'),
  metadata + '\nconsume(LOTS);'
]) assert.deepEqual(changed(before, print(source, mutation)), ["getCurrentAccessUser", "other"]);
const unknown = print(source, metadata, "unknown-builder");
assert.equal(unknown.mode, "whole-backend");
assert.deepEqual(changed(unknown, print(source.replace('()=>1','()=>3'), metadata, "unknown-builder")), ["getCurrentAccessUser", "other"]);
assert.deepEqual(changed(unknown, print(source, moved, "unknown-builder")), ["getCurrentAccessUser", "other"], "Unknown builders cannot normalize any lot classification");
assert.deepEqual(changed(before, print(source.replace('()=>1','()=>3'))), ["getCurrentAccessUser"]);

const shas = ["25ac3bb694832e30b38291ba11f7336dd168853b", "af818728dd1b6929574de2cbd20c08835ae458d1",
  "3ddc0a3c4a05d6737f97d07673ccc2512d062f1a", "8a29dc08964e25309ca6f187828f0a8310c5c8c7", "3912febcabc8e089be4d6bbbc020d6b7699ced54"];
const snapshots = shas.map(sha => production.fromGit(root, sha));
const expected = [
  ["grantEngagementQualificationException", "processEngagementQualificationJob", "updateEngagementCompetition"],
  ["getEngagementAutomaticMailControl", "grantEngagementQualificationException", "previewEngagementCompetitionDocumentNotification",
    "processEngagementQualificationJob", "updateEngagementAutomaticMailControl", "updateEngagementCompetition"],
  [], []
];
for (let i=1; i<snapshots.length; i++) {
  assert(snapshots[i].registryKnown);
  const names = new Set(snapshots[i].eligibleNames);
  const selected = changed(snapshots[i-1], snapshots[i]).filter(n => names.has(n));
  console.log(`${shas[i-1].slice(0,8)} -> ${shas[i].slice(0,8)} : ${selected.length} fonctions ordinaires PROD : ${selected.join(', ') || 'aucune'}`);
  assert.deepEqual(selected, expected[i-1]);
  for (const name of ["getCurrentAccessUser", "verifyPin", "getNationalFeaturedDocuments"])
    assert.equal(snapshots[i-1].functions[name],snapshots[i].functions[name]);
}
console.log("PROD selection: static dependencies, sensitive lot boundaries and unknown preparation verified offline; no deployment.");
