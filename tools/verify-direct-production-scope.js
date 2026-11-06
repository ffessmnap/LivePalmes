"use strict";
// Closed structural proof. Never execute candidate or historical business code.
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const acorn = require("../tests/firestore-rules/node_modules/acorn");
const BASE = "8aa9d79377729defcf64c19c0f35b123b03d7f97";
const CANDIDATE = "5b76e1e37eddba618b25c41c92a8168446fe4115";
const isolated = new Set(["readNapPublicSwimmer", "exportNapPublicPage", "manageLivePalmesDirect"]);
const parse = source => acorn.parse(source, { ecmaVersion: "latest", sourceType: "script" });
const canonical = value => JSON.stringify(value, (key, item) => ["start", "end", "raw"].includes(key) ? undefined : item);
function retainedTree(tree, removed = []) {
  function visit(node) {
    if (!node || typeof node !== "object") return node;
    const expression = node.type === "ExpressionStatement" && node.expression;
    const target = expression?.type === "AssignmentExpression" && expression.left;
    if (target?.type === "MemberExpression" && target.object.name === "exports" && !target.computed && isolated.has(target.property.name)) {
      removed.push(target.property.name);
      return null;
    }
    if (Array.isArray(node)) return node.map(visit).filter(item => item !== null);
    return Object.fromEntries(Object.entries(node).map(([key, value]) => [key, visit(value)]));
  }
  return visit(tree);
}
function verify(root, base, candidate) {
  assert.equal(base, BASE);
  assert.equal(candidate, CANDIDATE);
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }).replace(/\r\n/g, "\n");
  const source = (sha, file) => git("show", sha + ":" + file);
  assert.equal(git("diff", "--name-only", "7a6eedb6ee8b6c5943c194e88611219602782fdf", base, "--", "functions/"), "");
  const removedBefore = [], removedAfter = [];
  assert.equal(canonical(retainedTree(parse(source(base, "functions/index.js")), removedBefore)),
    canonical(retainedTree(parse(source(candidate, "functions/index.js")), removedAfter)));
  assert.deepEqual(removedBefore.sort(), ["exportNapPublicPage", "readNapPublicSwimmer"]);
  assert.deepEqual(removedAfter.sort(), [...isolated].sort());
  const files = git("diff", "--name-status", "--no-renames", base, candidate, "--", "functions/").trim().split("\n");
  assert(files.every(line => line === "M\tfunctions/index.js" || line === "M\tfunctions/nap-direct-calendar.js" || /^A\tfunctions\/nap-direct-[a-z-]+\.js$/.test(line)));
  // Every pre-existing import of the changed calendar module belongs to the two isolated HTTP handlers.
  const imports = git("grep", "-l", "nap-direct-calendar", base, "--", "functions/").trim().split("\n");
  assert.deepEqual(imports, [base + ":functions/index.js", base + ":functions/nap-direct-competition-results.js"]);
  assert.equal(git("grep", "-l", "nap-direct-competition-results", base, "--", "functions/").trim(), base + ":functions/index.js");
  const remaining = canonical(retainedTree(parse(source(candidate, "functions/index.js"))));
  assert(!remaining.includes("nap-direct-calendar"));
  assert(!remaining.includes("nap-direct-competition-results"));
  const registry = source(candidate, "tools/firebase-test-backend-lots.js");
  assert.equal((registry.match(/"manageLivePalmesDirect",/g) || []).length, 2);
  assert.equal(canonical(parse(registry.replace(/"manageLivePalmesDirect",/g, ""))),
    canonical(parse(source(base, "tools/firebase-test-backend-lots.js"))));
  return { candidate, productionCommit: base, result: "success", networkCalls: 0,
    changedProductionExports: ["manageLivePalmesDirect", "readNapPublicSwimmer"],
    testOnlyChangedExport: "exportNapPublicPage", otherHandlersAndSharedInitializationUnchanged: true };
}
module.exports = { verify, retainedTree };
if (require.main === module) console.log(JSON.stringify(verify(process.argv[2], process.argv[3], process.argv[4])));
