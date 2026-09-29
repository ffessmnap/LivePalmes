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

// Only declarations whose initialization cannot call application code are isolated.
// Imports, mutable top-level state, class initialization and all other statements
// stay common. Identifier collection deliberately over-approximates dependencies:
// even shadowed names and property keys count, so ambiguity can add work, not omit it.
function inert(node) {
  if (!node) return false;
  if (["Literal", "FunctionExpression", "ArrowFunctionExpression"].includes(node.type)) return true;
  if (node.type === "ArrayExpression") return node.elements.every(n => !n || inert(n));
  if (node.type === "ObjectExpression") return node.properties.every(p =>
    p.type === "Property" && !p.computed && p.kind === "init" && inert(p.value));
  if (node.type === "UnaryExpression") return ["-", "+", "!", "~", "void"].includes(node.operator) && inert(node.argument);
  return false;
}

function identifiers(node) {
  const names = new Set();
  walk(node, child => { if (child.type === "Identifier") names.add(child.name); });
  return names;
}

function fingerprints(source, common) {
  const ast = acorn.parse(source, { ecmaVersion: "latest", sourceType: "script" });
  const exports = new Map();
  const shared = [];
  const declarations = new Map();
  const allowedExportNodes = new Set();
  const factories = new Set();
  for (const node of ast.body) {
    if (node.type !== "VariableDeclaration" || node.kind !== "const") continue;
    for (const declaration of node.declarations) {
      const init = declaration.init;
      if (declaration.id.type !== "ObjectPattern" || init?.type !== "CallExpression" ||
        init.callee.name !== "require" || init.arguments.length !== 1 ||
        !/^firebase-functions\/v2\/(https|firestore|scheduler)$/.test(init.arguments[0].value || "")) continue;
      for (const prop of declaration.id.properties) {
        if (prop.type === "Property" && !prop.computed && registrations.has(prop.key.name) && prop.value.type === "Identifier") factories.add(prop.value.name);
      }
    }
  }
  let conservative = false;
  for (const node of ast.body) {
    const a = node.type === "ExpressionStatement" && node.expression;
    const left = a && a.type === "AssignmentExpression" && a.operator === "=" && a.left;
    if (left && left.type === "MemberExpression" && !left.computed && left.object.name === "exports" && left.property.type === "Identifier") {
      const name = left.property.name;
      if (exports.has(name)) throw new Error("Export duplique");
      exports.set(name, node);
      allowedExportNodes.add(left.object);
      // Only known Firebase registrations, with no eager arbitrary calls in their arguments.
      const rhs = a.right;
      if (rhs.type !== "CallExpression" || !factories.has(rhs.callee.name)) conservative = true;
      for (const arg of rhs.arguments || []) {
        if (["ArrowFunctionExpression", "FunctionExpression", "Identifier", "Literal"].includes(arg.type)) continue;
        walk(arg, child => { if (["CallExpression", "NewExpression", "AssignmentExpression", "UpdateExpression"].includes(child.type)) conservative = true; });
      }
    } else if (node.type === "FunctionDeclaration" && node.id) {
      if (declarations.has(node.id.name)) throw new Error("Declaration dupliquee");
      declarations.set(node.id.name, node);
    } else if (node.type === "VariableDeclaration" && node.kind === "const" &&
      node.declarations.length === 1 && node.declarations[0].id.type === "Identifier" && inert(node.declarations[0].init)) {
      const name = node.declarations[0].id.name;
      if (declarations.has(name)) throw new Error("Declaration dupliquee");
      declarations.set(name, node);
    } else shared.push(node);
  }
  walk(ast, node => {
    // Aliased/cross-export references or dynamic execution defeat local independence.
    if (node.type === "Identifier" && ["eval", "Function", "module", "exports", "global", "globalThis", "__filename", "constructor"].includes(node.name) && !allowedExportNodes.has(node)) conservative = true;
    if (node.type === "MemberExpression" && node.computed && node.property.type === "Literal" && node.property.value === "constructor") conservative = true;
    if (node.type === "CallExpression" && node.callee.name === "require" &&
      (node.arguments.length !== 1 || node.arguments[0].type !== "Literal" ||
       typeof node.arguments[0].value !== "string" || ["vm", "node:vm"].includes(node.arguments[0].value))) conservative = true;
    if (node.type === "WithStatement") conservative = true;
  });
  if (!exports.size) throw new Error("Aucun export statique");
  const text = node => source.slice(node.start, node.end);
  const refs = new Map([...declarations].map(([name, node]) => [name, identifiers(node)]));
  const closure = roots => {
    const reached = new Set();
    const pending = roots.flatMap(node => [...identifiers(node)]);
    while (pending.length) {
      const name = pending.pop();
      if (!declarations.has(name) || reached.has(name)) continue;
      reached.add(name);
      pending.push(...refs.get(name));
    }
    return [...reached].sort();
  };
  // Eager initialization is common, including every helper it can reference.
  const commonNames = closure(shared);
  const baseline = hash(JSON.stringify([common, conservative ? source :
    [shared.map(text), commonNames.map(name => [name, text(declarations.get(name))])]]));
  const dependencies = {};
  const functions = {};
  for (const [name, node] of exports) {
    dependencies[name] = conservative ? [...declarations.keys()].sort() : closure([node]);
    functions[name] = hash(JSON.stringify([baseline, text(node),
      dependencies[name].map(dep => [dep, text(declarations.get(dep))])]));
  }
  return { mode: conservative ? "whole-backend" : "dependency-closure", functions, dependencies, commonDeclarations: commonNames };
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
