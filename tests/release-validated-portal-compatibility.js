"use strict";
// Retained runtimes are not rebuilt: prove the exact new delta does not change
// their dependency closures, apart from the reviewed CMAS display label.
const assert = require("node:assert/strict"), crypto = require("node:crypto");
const shared = require("../tools/release-test-function-fingerprints");
const legacy = require("../tools/release-function-fingerprints");
const c = require("../.github/releases/evidence/20261101-validated-portal-contract.json");
const matches = (base, candidate) => base === c.productionCommit && candidate === c.candidate;
function verifySnapshots(before, after, names) {
  assert.deepEqual(before.common, after.common, "Package/build metadata changed");
  assert.equal(before.productionPreparer, after.productionPreparer);
  const oldRegistry = before.registrySource;
  assert.equal(after.registrySource.split(', "managePortalNews"').length, 2);
  assert.equal(after.registrySource.replace(', "managePortalNews"', ""), oldRegistry, "Other registry change");
  const label = '  "5": "CMAS",\n';
  assert.equal(after.source.split(label).length, 2, "Exactly one reviewed display label");
  const masked = after.source.replace(label, "");
  const registry = "tools/firebase-test-backend-lots.js:" + crypto.createHash("sha256")
    .update(legacy.retirementRegistrySignature(oldRegistry)).digest("hex");
  const old = legacy.fingerprints(before.source, before.common.concat(registry).sort(), before.files);
  const next = legacy.fingerprints(masked, after.common.concat(registry).sort(), after.files);
  assert.equal(old.mode, "dependency-closure"); assert.equal(next.mode, "dependency-closure");
  for (const name of names) {
    assert(old.functions[name] && next.functions[name], "Missing retained export");
    assert.equal(old.functions[name], next.functions[name], "Unreviewed retained dependency: " + name);
  }
}
async function prove({root, base, candidate, rows}) {
  assert(matches(base, candidate), "Exact validated application pair required");
  assert.deepEqual(rows.map(r => r.name).sort(), c.retained.map(r => r.name).sort());
  for (const row of rows) {
    assert.deepEqual(Object.keys(row).sort(), ["commit", "name"]);
    assert.equal(row.commit, c.retained.find(r => r.name === row.name).commit);
  }
  verifySnapshots(shared.snapshot(root, base, {production:true}), shared.snapshot(root, candidate, {production:true}), rows.map(r=>r.name));
  return {suite:"retained-calendar-consumers-v1", productionCommit:base, candidate, result:"success", networkCalls:0,
    passedFunctions:rows.map(r=>r.name).sort(), checks:["exact-pair-and-installed-origins", "unchanged-retained-dependency-closures",
      "registry-adds-only-news-callable", "CMAS-label-only-shared-delta", "installed-revisions-kept-with-existing-provenance"]};
}
module.exports = {matches, prove, verifySnapshots};
