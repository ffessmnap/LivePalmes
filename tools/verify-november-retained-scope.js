"use strict";
// Closed proof for two retained preference endpoints. No application execution.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const acorn = require("../tests/firestore-rules/node_modules/acorn");
const { snapshot } = require("./release-test-function-fingerprints");
const { moduleGraph } = require("./release-function-fingerprints");
const ORIGIN = "7a6eedb6ee8b6c5943c194e88611219602782fdf";
const BASE = "5b76e1e37eddba618b25c41c92a8168446fe4115";
const CANDIDATE = "a422125bc312f65362850f7a00bffe4262747998";
const NAMES = ["disableCompetitionEmailNotifications", "updateCurrentEmailNotificationPreferences"];
const canonical = value => JSON.stringify(value, (key, item) => ["start", "end", "raw"].includes(key) ? undefined : item);
const parse = source => acorn.parse(source, { ecmaVersion: "latest", sourceType: "script" });
const registrations = new Set(["onCall", "onRequest", "onSchedule", "onTaskDispatched", "onDocumentCreated", "onDocumentUpdated", "onDocumentWritten", "onDocumentDeleted"]);
function walk(node, visit) {
  if (!node || typeof node !== "object") return;
  if (node.type) visit(node);
  for (const v of Object.values(node)) if (Array.isArray(v)) v.forEach(child => walk(child, visit)); else if (v && typeof v === "object") walk(v, visit);
}
function exportName(node) {
  const e = node?.type === "ExpressionStatement" && node.expression;
  if (e?.type !== "AssignmentExpression" || e.operator !== "=" || e.left.type !== "MemberExpression" || e.left.computed || e.left.object.name !== "exports") return null;
  assert.ok(registrations.has(e.right.callee?.name), "Unreviewed export registration");
  return e.left.property.name;
}
function definitions(tree) {
  const result = new Map();
  const put = (name, node) => { assert.ok(!result.has(name), "Duplicate root binding"); result.set(name, node); };
  for (const n of tree.body) {
    if (n.type === "FunctionDeclaration") put(n.id.name, n);
    if (n.type === "VariableDeclaration") for (const d of n.declarations) {
      const names = [];
      walk(d.id, x => { if (x.type === "Identifier") names.push(x.name); });
      for (const name of new Set(names)) put(name, { kind: n.kind, declaration: d });
    }
    walk(n, x => { const name = exportName(x); if (name) put("export:" + name, x); });
  }
  return result;
}
function common(tree) {
  function strip(node) {
    if (!node || typeof node !== "object") return node;
    if (node.type === "FunctionDeclaration" || exportName(node)) return null;
    if (Array.isArray(node)) return node.map(strip).filter(x => x !== null);
    return Object.fromEntries(Object.entries(node).map(([k,v]) => [k,strip(v)]));
  }
  return strip(tree);
}
function compare(before, after) {
  const oldTree = parse(before.source), newTree = parse(after.source);
  const oldDefs = definitions(oldTree), newDefs = definitions(newTree);
  assert.equal(canonical(common(oldTree)), canonical(common(newTree)), "Shared initialization changed");
  const oldGraph = moduleGraph(before.files, { testNumericConstants: true });
  const newGraph = moduleGraph(after.files, { testNumericConstants: true });
  for (const suffix of ["package.json", "package-lock.json"]) {
    const oldRow = before.common.find(row => row.endsWith("\tfunctions/" + suffix));
    const newRow = after.common.find(row => row.endsWith("\tfunctions/" + suffix));
    assert.ok(oldRow && newRow, "Missing runtime dependency");
    assert.equal(oldRow, newRow, "Runtime dependency changed");
  }
  const modules = new Set(), definitionsChecked = new Set();
  const compareImports = (node, owner, requireUnchanged) => {
    const oldImports = oldGraph.imports(node, owner), newImports = newGraph.imports(node, owner);
    assert.deepEqual(oldImports, newImports);
    for (const name of oldImports) {
      const oldInfo = oldGraph.inspect(name), newInfo = newGraph.inspect(name);
      if (!requireUnchanged && oldInfo.pure && newInfo.pure) continue;
      assert.deepEqual(oldGraph.signature([name]), newGraph.signature([name]), "Reachable module changed: " + name);
      oldInfo.files.forEach(file => modules.add(file));
    }
  };
  // An unused root import may change only when the existing analyzer proves
  // its entire initialization declarative, including local import children.
  compareImports(common(oldTree), "functions/index.js", false);
  const initialization = common(oldTree);
  // Binding names are declarations, not initialization reads. All references
  // in initializers (including callbacks and property keys conservatively)
  // also join the closure, so a local function called at startup cannot change.
  walk(initialization, node => { if (node.type === "VariableDeclarator") node.id = { type: "Literal", value: "binding" }; });
  const initializationReads = new Set();
  walk(initialization, node => { if (node.type === "Identifier" && oldDefs.has(node.name)) initializationReads.add(node.name); });
  const pending = [...NAMES.map(name => "export:" + name), ...initializationReads];
  while (pending.length) {
    const name = pending.pop(); if (definitionsChecked.has(name)) continue;
    const node = oldDefs.get(name);
    assert.ok(node && newDefs.has(name), "Missing preference dependency: " + name);
    assert.equal(canonical(node), canonical(newDefs.get(name)), "Preference dependency changed: " + name);
    definitionsChecked.add(name);
    compareImports(node, "functions/index.js", true);
    walk(node, child => { if (child.type === "Identifier" && oldDefs.has(child.name)) pending.push(child.name); });
  }
  return { definitionsChecked: definitionsChecked.size, modulesChecked: [...modules].sort() };
}
function verify(root, base = BASE, candidate = CANDIDATE) {
  assert.equal(base, BASE); assert.equal(candidate, CANDIDATE);
  const origin = snapshot(root, ORIGIN, { production: true });
  const deployedBase = snapshot(root, BASE, { production: true });
  const desired = snapshot(root, CANDIDATE, { production: true });
  const proof = compare(origin, desired);
  compare(deployedBase, desired);
  return { suite: "retained-calendar-consumers-v1", candidate, productionCommit: base,
    origin: ORIGIN, result: "success", networkCalls: 0, passedFunctions: NAMES,
    sharedInitializationUnchanged: true, preferenceClosureUnchanged: true, ...proof };
}
module.exports = { verify, compare, NAMES };
if (require.main === module) console.log(JSON.stringify(verify(process.argv[2], process.argv[3], process.argv[4])));
