"use strict";
// One reviewed application pair and four retained revisions. No runtime clients.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const acorn = require("./firestore-rules/node_modules/acorn");
const shared = require("../tools/release-test-function-fingerprints");
const legacy = require("../tools/release-function-fingerprints");
const { expandedDefinitions } = require("./release-portal-access-ns-compatibility");
const { guardFixtures } = require("./release-home-retained-compatibility");
const BASE = "1a547c848b98150f2f180feb332a7f9e37b62cca";
const CANDIDATE = "6f76f7921d401cde1f45a5ce90acf5bbde097574";
const ORIGINS = Object.freeze(Object.fromEntries([
  "disableCompetitionEmailNotifications", "resolveEngagementAccessRequest",
  "submitEngagementAccessRequest", "updateCurrentEmailNotificationPreferences"
].map(name => [name, "67d40e84cf9713403614f77bb53067cd449510a7"])));
const matches = (base, candidate) => base === BASE && candidate === CANDIDATE;
const parse = source => acorn.parse(source, { ecmaVersion: "latest" });
const normal = ast => JSON.stringify(ast, function (key, value) {
  return ["start", "end", "loc"].includes(key) || (key === "raw" && this.type === "Literal") ? undefined : value;
});
function withoutTrigger(source) {
  const ast = parse(source);
  const kept = ast.body.filter(node => !(node.type === "ExpressionStatement" &&
    node.expression.type === "AssignmentExpression" && node.expression.left.object?.name === "exports" &&
    node.expression.left.property?.name === "syncEngagementMailRecipientIndex"));
  assert.equal(ast.body.length - kept.length, 1, "Exactly one selected trigger registration required");
  ast.body = kept;
  return normal(ast);
}
function withoutPrivateHelper(source) {
  const ast = parse(source), found = [];
  function visit(node) {
    if (!node || typeof node !== "object") return;
    if (node.type === "FunctionDeclaration" && node.id.name === "syncAccessDirectorySnapshotFromUserChange") found.push(node);
    for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === "object") visit(value);
  }
  visit(ast);
  assert.equal(found.length, 1, "Exactly one private directory helper required");
  const node = found[0];
  return normal(parse(source.slice(0, node.start) + source.slice(node.end)));
}
function verifySnapshots(before, after) {
  assert.equal(withoutTrigger(before.source), withoutTrigger(after.source), "Other registrations or shared declarations changed");
  const file = "functions/server-directory-service.js";
  assert.equal(withoutPrivateHelper(before.files[file].source), withoutPrivateHelper(after.files[file].source), "Other directory methods changed");
  assert.deepEqual(before.common, after.common, "Shared package/preparation metadata changed");
  assert.equal(before.registrySource, after.registrySource, "Function lot registry changed");
  // Only the helper of the selected trigger is substituted after proving every
  // other directory method and registration identical. All other dependencies,
  // including the new merge modules, remain present in the candidate closure.
  const masked = { ...after.files, [file]: before.files[file] };
  const registry = "tools/firebase-test-backend-lots.js:" + crypto.createHash("sha256")
    .update(legacy.retirementRegistrySignature(before.registrySource)).digest("hex");
  const old = legacy.fingerprints(before.source, before.common.concat(registry).sort(), before.files);
  const next = legacy.fingerprints(after.source, after.common.concat(registry).sort(), masked);
  assert.equal(old.mode, "dependency-closure"); assert.equal(next.mode, "dependency-closure");
  for (const name of Object.keys(ORIGINS)) {
    assert.ok(old.functions[name] && next.functions[name], "Missing retained export: " + name);
    assert.equal(old.functions[name], next.functions[name], "Retained dependency changed: " + name);
  }
}
function validateScope(base, candidate, rows) {
  assert.ok(matches(base, candidate), "Exact portal/directory application pair required");
  assert.ok(Array.isArray(rows));
  assert.deepEqual(rows.map(row => row.name).sort(), Object.keys(ORIGINS).sort(), "Exact four retained functions required");
  for (const row of rows) {
    assert.deepEqual(Object.keys(row).sort(), ["commit", "name"]);
    assert.equal(row.commit, ORIGINS[row.name], "Unreviewed installed origin");
  }
}
async function prove({ root, base, candidate, rows, source, loader }) {
  validateScope(base, candidate, rows);
  verifySnapshots(shared.snapshot(root, base, { production: true }), shared.snapshot(root, candidate, { production: true }));
  const cache = new Map(), definitions = commit => {
    if (!cache.has(commit)) cache.set(commit, expandedDefinitions(root, source, commit));
    return cache.get(commit);
  };
  for (const row of rows) for (const commit of [row.commit, base]) {
    const old = definitions(commit).get(row.name), next = definitions(candidate).get(row.name);
    assert.ok(old && next, "Missing installed retained registration");
    assert.equal(normal(parse(old)), normal(parse(next)), "Installed retained handler changed: " + row.name);
  }
  for (const file of ["server-mail-service.js", "nap-club-access-request.js", "engagement-mail-control.js",
    "nap-notification-task.js", "nap-notification-automation.js", "nap-mysql.js"]) {
    assert.equal(source(base, "functions/" + file), source(candidate, "functions/" + file), "Mail/access protocol changed: " + file);
  }
  for (const kind of ["preferences", "access"]) {
    const results = [];
    for (const commit of new Set([base, candidate, ...rows.map(row => row.commit)]))
      results.push(await guardFixtures({ commit, definitions, source, loader, kind }));
    for (const result of results) assert.deepEqual(result, results[0]);
  }
  return { suite: "retained-calendar-consumers-v1", productionCommit: base, candidate,
    result: "success", networkCalls: 0, passedFunctions: rows.map(row => row.name).sort(),
    directoryProofSha256: crypto.createHash("sha256").update(fs.readFileSync(__filename)).digest("hex"),
    checks: ["exact-pair-and-four-installed-origins", "unchanged-retained-closures-outside-selected-private-helper",
      "unchanged-installed-handlers", "unchanged-mail-and-access-protocols", "access-denials-and-idempotence", "preference-and-unsubscribe-guards"] };
}
module.exports = { BASE, CANDIDATE, ORIGINS, matches, validateScope, verifySnapshots, prove };
