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

// Only static local imports with declarative initialization can be isolated.
// Unknown top-level calls, mutations and dynamic imports remain shared.
function moduleGraph(files = {}) {
  const cache = new Map();
  const resolve = (owner, request) => {
    if (!request.startsWith(".")) return null;
    const base = path.posix.normalize(path.posix.join(path.posix.dirname(owner), request));
    const name = [base, base + ".js", base + ".json", base + "/index.js"].find(n => files[n]);
    if (!name || !name.startsWith("functions/")) throw new Error("Import local non resolu: " + owner + " -> " + request);
    return name;
  };
  const imports = (node, owner) => {
    const names = new Set();
    walk(node, child => {
      if (child.type !== "CallExpression" || child.callee.name !== "require") return;
      if (child.arguments.length !== 1 || child.arguments[0].type !== "Literal" ||
          typeof child.arguments[0].value !== "string") throw new Error("Import dynamique");
      const name = resolve(owner, child.arguments[0].value);
      if (name) names.add(name);
    });
    return [...names].sort();
  };
  const declarative = node => {
    if (!node) return true;
    if (inert(node) || node.type === "Identifier") return true;
    if (node.type === "ArrayExpression") return node.elements.every(declarative);
    if (node.type === "ObjectExpression") return node.properties.every(p =>
      p.type === "Property" && !p.computed && p.kind === "init" && declarative(p.value));
    if (node.type === "CallExpression" && node.callee.name === "require") return (
      node.arguments.length === 1 && node.arguments[0].type === "Literal" && typeof node.arguments[0].value === "string");
    if (node.type === "NewExpression" && ["Set", "Map"].includes(node.callee.name))
      return node.arguments.every(arg => arg.type === "ArrayExpression" && declarative(arg));
    return false;
  };
  const inspect = (name, active = new Set()) => {
    if (cache.has(name)) return cache.get(name);
    if (active.has(name)) return { pure: false, files: [name], externals: [] };
    const file = files[name];
    if (name.endsWith(".json")) {
      const result = { pure: true, files: [name], externals: [] }; cache.set(name, result); return result;
    }
    const ast = acorn.parse(file.source, { ecmaVersion: "latest", sourceType: "script" });
    let pure = ast.body.every(node =>
      node.type === "FunctionDeclaration" ||
      node.type === "ExpressionStatement" && node.directive ||
      node.type === "VariableDeclaration" && node.kind === "const" && node.declarations.every(d => declarative(d.init)) ||
      node.type === "ExpressionStatement" && node.expression.type === "AssignmentExpression" &&
        node.expression.operator === "=" &&
        (node.expression.left.type === "MemberExpression" &&
          (node.expression.left.object.name === "exports" ||
           node.expression.left.object.name === "module" && node.expression.left.property.name === "exports")) &&
        declarative(node.expression.right));
    const external = new Set();
    walk(ast, node => {
      if ((node.type === "FunctionDeclaration" || node.type === "VariableDeclarator") &&
          ["Set", "Map", "require"].includes(node.id?.name)) pure = false;
      if (node.type === "Identifier" && ["eval", "global", "globalThis"].includes(node.name)) pure = false;
      if (node.type === "CallExpression" && node.callee.name === "require" &&
          node.arguments.length === 1 && typeof node.arguments[0].value === "string" &&
          !node.arguments[0].value.startsWith(".")) external.add(node.arguments[0].value);
    });
    let children;
    try { children = imports(ast, name); } catch (error) {
      if (error.message !== "Import dynamique") throw error;
      pure = false; children = Object.keys(files);
    }
    const reached = new Set([name]);
    for (const child of children) {
      if (active.has(child) || child === name) { pure = false; reached.add(child); continue; }
      const info = inspect(child, new Set([...active, name]));
      pure = pure && info.pure;
      info.files.forEach(f => reached.add(f));
      info.externals.forEach(f => external.add(f));
    }
    const result = { pure, files: [...reached].sort(), externals: [...external].sort() };
    cache.set(name, result); return result;
  };
  const signature = names => [...new Set(names.flatMap(n => inspect(n).files))].sort()
    .map(name => [name, files[name].sha || hash(files[name].source)]);
  return { imports, inspect, signature };
}

function testBranch(node) {
  const test = node?.test;
  return node.type === "IfStatement" && !node.alternate && node.consequent.type === "BlockStatement" &&
    test?.type === "BinaryExpression" && test.operator === "===" &&
    test.left.type === "MemberExpression" && !test.left.computed &&
    test.left.object.name === "ENVIRONMENT" && test.left.property.name === "projectId" &&
    test.right.type === "Literal" && test.right.value === "livepalmes-test";
}

function fingerprints(source, common, files = {}) {
  const ast = acorn.parse(source, { ecmaVersion: "latest", sourceType: "script" });
  const graph = moduleGraph(files);
  const owner = "functions/index.js";
  const groups = new Map();
  const entries = ast.body.flatMap(node => testBranch(node)
    ? node.consequent.body.map(child => ({ node: child, group: "test" }))
    : [{ node, group: "global" }]);
  const branchShared = [];
  const exportGroups = new Map();
  const exports = new Map();
  const shared = [];
  const declarations = new Map();
  const allowedExportNodes = new Set();
  const factories = new Set();
  for (const { node } of entries) {
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
  for (const { node, group } of entries) {
    const a = node.type === "ExpressionStatement" && node.expression;
    const left = a && a.type === "AssignmentExpression" && a.operator === "=" && a.left;
    if (left && left.type === "MemberExpression" && !left.computed && left.object.name === "exports" && left.property.type === "Identifier") {
      const name = left.property.name;
      if (exports.has(name)) throw new Error("Export duplique");
      exports.set(name, node);
      exportGroups.set(name, group);
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
      groups.set(node.id.name, group);
    } else if (node.type === "VariableDeclaration" && node.kind === "const" &&
      node.declarations.length === 1 && node.declarations[0].id.type === "Identifier" && inert(node.declarations[0].init)) {
      const name = node.declarations[0].id.name;
      if (declarations.has(name)) throw new Error("Declaration dupliquee");
      declarations.set(name, node);
      groups.set(name, group);
    } else if (node.type === "VariableDeclaration" && node.kind === "const" && node.declarations.length === 1 &&
      node.declarations[0].init?.type === "CallExpression" && node.declarations[0].init.callee.name === "require" &&
      node.declarations[0].init.arguments.length === 1 && typeof node.declarations[0].init.arguments[0].value === "string" &&
      node.declarations[0].init.arguments[0].value.startsWith(".") && Object.keys(files).length &&
      graph.imports(node, owner).every(name => graph.inspect(name).pure)) {
      const id = node.declarations[0].id;
      const names = id.type === "Identifier" ? [id.name] : id.type === "ObjectPattern"
        ? id.properties.map(p => p.type === "Property" && p.value.type === "Identifier" ? p.value.name : null) : [];
      if (!names.length || names.some(n => !n)) { (group === "test" ? branchShared : shared).push(node); continue; }
      for (const name of names) {
        if (declarations.has(name)) throw new Error("Declaration dupliquee");
        declarations.set(name, node); groups.set(name, group);
      }
    } else (group === "test" ? branchShared : shared).push(node);
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
  const closure = (roots, group = "global") => {
    const reached = new Set();
    const pending = roots.flatMap(node => [...identifiers(node)]);
    while (pending.length) {
      const name = pending.pop();
      if (!declarations.has(name) || reached.has(name)) continue;
      if (groups.get(name) === "test" && group !== "test") continue;
      reached.add(name);
      pending.push(...refs.get(name));
    }
    return [...reached].sort();
  };
  // Eager initialization is common, including every helper it can reference.
  const commonNames = closure(shared);
  const moduleNames = nodes => Object.keys(files).length ? [...new Set(nodes.flatMap(node => graph.imports(node, owner)))] : [];
  const commonModules = moduleNames(shared.concat(commonNames.map(name => declarations.get(name))));
  // Dependency additions remain common when they change eager external imports.
  const externalImports = Object.keys(files).length ? [...new Set(moduleNames([ast]).flatMap(name => graph.inspect(name).externals))].sort() : [];
  const baseline = hash(JSON.stringify([common, conservative ? source :
    [shared.map(text), commonNames.map(name => [name, text(declarations.get(name))])],
    graph.signature(commonModules), externalImports]));
  const dependencies = {};
  const functions = {};
  for (const [name, node] of exports) {
    const group = exportGroups.get(name);
    const contextual = group === "test" ? branchShared : [];
    dependencies[name] = conservative ? [...declarations.keys()].sort() : closure([node, ...contextual], group);
    const modules = conservative ? Object.keys(files) : moduleNames([node, ...contextual, ...dependencies[name].map(dep => declarations.get(dep))]);
    functions[name] = hash(JSON.stringify([baseline, text(node),
      dependencies[name].map(dep => [dep, text(declarations.get(dep))]),
      contextual.map(text), graph.signature(modules)]));
  }
  return { mode: conservative ? "whole-backend" : "dependency-closure", functions, dependencies, commonDeclarations: commonNames };
}

function fromGit(root, sha) {
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error("SHA complet requis");
  const git = args => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  const source = git(["show", sha + ":functions/index.js"]);
  const lines = git(["ls-tree", "-r", sha, "--", "functions", "tools/prepare-production-functions.js", "tools/prepare-firebase-test-functions.js", "tools/firebase-test-backend-lots.js"])
    .split("\n").filter(line => line && !line.endsWith("\tfunctions/index.js") && !line.endsWith("/AGENTS.md")).sort();
  const files = {};
  for (const line of lines) {
    const [metadata, name] = line.split("\t");
    if (name.startsWith("functions/") && /\.(js|json)$/.test(name) && !/\/package(?:-lock)?\.json$/.test(name))
      files[name] = { sha: metadata.split(" ")[2], source: name.endsWith(".js") ? git(["show", sha + ":" + name]) : "" };
  }
  const tree = lines.filter(line => !files[line.split("\t")[1]]);
  return fingerprints(source, tree, files);
}
module.exports = { fingerprints, fromGit };
if (require.main === module) console.log(JSON.stringify(fromGit(process.argv[2], process.argv[3])));
