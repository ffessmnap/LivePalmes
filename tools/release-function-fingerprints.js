"use strict";
// Static analysis only. Never require or execute application code.
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const acorn = require(path.join(__dirname, "../tests/firestore-rules/node_modules/acorn"));
const hash = value => crypto.createHash("sha256").update(value).digest("hex");
const registrations = new Set(["onCall", "onRequest", "onSchedule", "onDocumentCreated", "onDocumentUpdated", "onDocumentWritten", "onDocumentDeleted"]);

function walk(node, visit) {
  if (!node || typeof node !== "object") return;
  if (node.type) visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(child => walk(child, visit));
    else if (value && typeof value === "object") walk(value, visit);
  }
}

function fingerprints(source, common) {
  const ast = acorn.parse(source, { ecmaVersion: "latest", sourceType: "script" });
  const exports = new Map();
  const shared = [];
  const allowedExportNodes = new Set();
  let conservative = false;
  for (const node of ast.body) {
    const a = node.type === "ExpressionStatement" && node.expression;
    const left = a && a.type === "AssignmentExpression" && a.operator === "=" && a.left;
    if (left && left.type === "MemberExpression" && !left.computed && left.object.name === "exports" && left.property.type === "Identifier") {
      const name = left.property.name;
      if (exports.has(name)) throw new Error("Export duplique");
      exports.set(name, source.slice(node.start, node.end));
      allowedExportNodes.add(left.object);
      // Only known Firebase registrations, with no eager arbitrary calls in their arguments.
      const rhs = a.right;
      if (rhs.type !== "CallExpression" || !registrations.has(rhs.callee.name)) conservative = true;
      for (const arg of rhs.arguments || []) {
        if (["ArrowFunctionExpression", "FunctionExpression", "Identifier", "Literal"].includes(arg.type)) continue;
        walk(arg, child => { if (["CallExpression", "NewExpression", "AssignmentExpression", "UpdateExpression"].includes(child.type)) conservative = true; });
      }
    } else shared.push(source.slice(node.start, node.end));
  }
  walk(ast, node => {
    // Aliased/cross-export references or dynamic execution defeat local independence.
    if (node.type === "Identifier" && ["eval", "Function", "module", "exports"].includes(node.name) && !allowedExportNodes.has(node)) conservative = true;
    if (node.type === "WithStatement") conservative = true;
  });
  if (!exports.size) throw new Error("Aucun export statique");
  // All shared helpers, initialization and dependencies are common to every export.
  // A shared change deliberately republishes broadly instead of guessing dependencies.
  const baseline = hash(JSON.stringify([common, conservative ? source : shared]));
  return { mode: conservative ? "whole-backend" : "independent-exports", functions: Object.fromEntries([...exports].map(([name, body]) => [name, hash(baseline + "\n" + body)])) };
}

function fromGit(root, sha) {
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error("SHA complet requis");
  const git = args => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  const source = git(["show", sha + ":functions/index.js"]);
  const tree = git(["ls-tree", "-r", sha, "--", "functions", "tools/prepare-production-functions.js", "tools/prepare-firebase-test-functions.js", "tools/firebase-test-backend-lots.js"])
    .split("\n").filter(line => line && !line.endsWith("\tfunctions/index.js") && !line.endsWith("/AGENTS.md")).sort();
  return fingerprints(source, tree);
}
module.exports = { fingerprints, fromGit };
if (require.main === module) console.log(JSON.stringify(fromGit(process.argv[2], process.argv[3])));
