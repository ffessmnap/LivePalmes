"use strict";
// Review of this exact application pair only. No deployment authority is granted.
const assert = require("node:assert/strict");
const path = require("node:path");
const vm = require("node:vm");
const fs = require("node:fs"), crypto = require("node:crypto");
const acorn = require("./firestore-rules/node_modules/acorn");
const { references } = require("./helpers/lexical-references");
const contract = require("../.github/releases/evidence/20261028-architecture-retained-contract.json");
const parse = text => acorn.parse(text, { ecmaVersion: "latest" });
const normal = node => JSON.stringify(node, function (key, value) {
  if (["start", "end", "loc"].includes(key) || key === "raw" && this.type === "Literal") return undefined;
  return value; // Template raw text also matters for tagged templates.
});
const same = (a, b, label) => assert.equal(normal(parse(a)), normal(parse(b)), label);
const matches = (base, candidate) => base === contract.productionCommit && candidate === contract.candidate;
function walk(node, visit) {
  if (!node || typeof node !== "object") return;
  if (node.type) visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(child => walk(child, visit));
    else if (value && typeof value === "object") walk(value, visit);
  }
}
function validateScope(base, candidate, rows) {
  assert.ok(matches(base, candidate), "Exact reviewed architecture pair required");
  assert.ok(Array.isArray(rows));
  assert.deepEqual(rows.map(row => row.name).sort(), contract.functions.map(row => row.name).sort(), "All 15 retained consumers required");
  for (const row of rows) {
    assert.deepEqual(Object.keys(row).sort(), ["commit", "name"]);
    assert.equal(row.commit, contract.functions.find(f => f.name === row.name).commit, "Retained origin changed: " + row.name);
  }
}
// Run the already-reviewed source reconstruction against immutable Git text,
// never the current checkout. It is supplemented by actual wiring checks below.
function logicalDefinitions({ root, candidate, source }) {
  const exports = {}, virtualFs = { readFileSync(file) {
    const relative = path.relative(root, file).replaceAll("\\", "/");
    assert.ok(relative.startsWith("functions/") && !relative.includes(".."));
    return source(candidate, relative);
  } };
  const sandbox = { exports, module: { exports }, __dirname: path.join(root, "tests/helpers"), require(name) {
    if (name === "node:fs") return virtualFs;
    if (name === "node:path") return path;
    assert.equal(name, "../firestore-rules/node_modules/acorn"); return acorn;
  } };
  vm.runInNewContext(source(candidate, "tests/helpers/source-files.js"), sandbox, { timeout: 3000 });
  const expanded = sandbox.module.exports.expandedSource(path.join(root, "functions/index.js"), source(candidate, "functions/index.js"));
  const cache = new Map();
  return commit => {
    if (cache.has(commit)) return cache.get(commit);
    const code = commit === candidate ? expanded : source(commit, "functions/index.js"), result = new Map();
    const ast = parse(code);
    for (const node of ast.body) {
      if (node.type === "FunctionDeclaration") result.set(node.id.name, code.slice(node.start, node.end));
      if (node.type === "VariableDeclaration") for (const declaration of node.declarations)
        result.set("@variable:" + normal(declaration.id), node.kind + " " + code.slice(declaration.start, declaration.end) + ";");
    }
    walk(ast, node => {
      if (node.type === "AssignmentExpression" && node.left.object?.name === "exports")
        result.set(node.left.property.name, code.slice(node.start, node.end) + ";");
    });
    cache.set(commit, result); return result;
  };
}
function verifyWiring({ candidate, source, loader }) {
  const code = source(candidate, "functions/index.js"), ast = parse(code), nodes = [];
  walk(ast, node => nodes.push(node));
  const markers = [...code.matchAll(/\/\* extracted-(function|handler): (functions\/[\w.-]+\.js)#(\w+)(?:#(arrow|function|expression))? \*\//g)];
  const factories = new Map();
  for (const marker of markers) {
    const [text, kind, file, name] = marker, end = marker.index + text.length;
    if (kind === "function" && !/^\s*(?:async )?function\s/.test(code.slice(end))) continue;
    const wrapper = nodes.find(node => node.start >= end && (kind === "function" ? node.type === "FunctionDeclaration" && node.id.name === name : ["ArrowFunctionExpression", "FunctionExpression"].includes(node.type)));
    assert.ok(wrapper, "Missing actual delegate: " + name);
    // Historical pure extracted declarations can be replaced directly by imports.
    const body = wrapper.body.type === "BlockStatement" ? wrapper.body.body : [{ type: "ReturnStatement", argument: wrapper.body }];
    assert.equal(body.length, 1, "Delegate side effect: " + name);
    const call = body[0].argument;
    assert.equal(body[0].type, "ReturnStatement"); assert.equal(call?.type, "CallExpression");
    assert.equal(call.callee.type, "MemberExpression"); assert.equal(call.callee.property.name, name);
    const getter = call.callee.object.callee?.name;
    assert.ok(getter); assert.equal(call.callee.object.arguments.length, 0);
    if (kind === "function") {
      assert.equal(call.arguments.length, 1); assert.equal(call.arguments[0].type, "SpreadElement"); assert.equal(call.arguments[0].argument.name, "arguments");
    } else {
      assert.deepEqual(call.arguments.map(normal), wrapper.params.map(normal), "Handler argument forwarding changed: " + name);
    }
    const factoryGetter = ast.body.find(node => node.type === "FunctionDeclaration" && node.id.name === getter);
    assert.ok(factoryGetter);
    const factoryCalls = [];
    walk(factoryGetter, node => {
      if (node.type === "CallExpression" && node.callee.type === "MemberExpression" && node.callee.object.callee?.name === "require") factoryCalls.push(node);
    });
    assert.equal(factoryCalls.length, 1);
    const creation = factoryCalls[0];
    const lazyBody = factoryGetter.body.body;
    assert.equal(lazyBody.length, 2);
    const guard = lazyBody[0];
    assert.equal(guard.type, "IfStatement"); assert.equal(guard.alternate, null);
    assert.equal(guard.test.type, "UnaryExpression"); assert.equal(guard.test.operator, "!");
    const instance = expression => {
      assert.equal(expression.type, "MemberExpression"); assert.equal(expression.computed, false);
      assert.equal(expression.object.name, getter); assert.equal(expression.property.name, "instance");
    };
    instance(guard.test.argument);
    assert.equal(guard.consequent.type, "ExpressionStatement");
    assert.equal(guard.consequent.expression.type, "AssignmentExpression"); assert.equal(guard.consequent.expression.operator, "=");
    instance(guard.consequent.expression.left); assert.equal(guard.consequent.expression.right, creation);
    assert.equal(lazyBody[1].type, "ReturnStatement"); instance(lazyBody[1].argument);
    assert.equal(path.posix.normalize("functions/" + creation.callee.object.arguments[0].value) + ".js", file);
    assert.equal(creation.arguments.length, 1); assert.equal(creation.arguments[0].type, "ObjectExpression");
    const supplied = creation.arguments[0].properties;
    for (const property of supplied) {
      if (property.kind === "get") {
        assert.equal(property.value.body.body.length, 1);
        assert.equal(property.value.body.body[0].type, "ReturnStatement");
        assert.equal(property.value.body.body[0].argument.type, "Identifier");
        assert.equal(property.value.body.body[0].argument.name, property.key.name, "Changed live dependency");
      } else if (property.kind === "set") {
        const body = property.value.body.body;
        assert.equal(body.length, 1); assert.equal(body[0].type, "ExpressionStatement");
        const assignment = body[0].expression;
        assert.equal(assignment.type, "AssignmentExpression"); assert.equal(assignment.operator, "=");
        assert.equal(assignment.left.name, property.key.name); assert.equal(assignment.right.name, property.value.params[0].name);
      } else assert.equal(property.value.name, property.key.name, "Changed captured dependency");
    }
    if (!factories.has(file)) {
      const factoryCode = source(candidate, file), factoryAst = parse(factoryCode);
      const factory = factoryAst.body.find(node => node.type === "FunctionDeclaration" && node.id.name === creation.callee.property.name);
      assert.ok(factory);
      const suppliedNames = new Set(supplied.map(p => p.key.name));
      walk(factory, node => {
        if (node.type === "MemberExpression" && node.object.name === "backendContext") {
          assert.equal(node.computed, false); assert.ok(suppliedNames.has(node.property.name), "Missing live dependency: " + node.property.name);
        }
      });
      const globals = new Set([...Object.getOwnPropertyNames(globalThis), "module", "require", "undefined", "__dirname", "__filename"]);
      for (const reference of references(factoryAst)) assert.ok(globals.has(reference.node.name), file + " unexpected free reference: " + reference.node.name);
      const context = Object.fromEntries(supplied.map(p => [p.key.name, () => { throw Error("Fixture forbids external service invocation"); }]));
      const actual = loader(candidate)(file)[creation.callee.property.name](context);
      factories.set(file, actual);
    }
    assert.equal(typeof factories.get(file)[name], "function", "Missing actual factory method: " + name);
  }
  return { delegates: markers.length, factories: factories.size };
}
async function prove(context) {
  const { base, candidate, rows, source, loader, consumerFixtures } = context;
  validateScope(base, candidate, rows);
  const definitions = logicalDefinitions(context), old = definitions(base), current = definitions(candidate);
  for (const [name, declaration] of old) { assert.ok(current.has(name), "Original declaration removed: " + name); same(declaration, current.get(name), name); }
  const wiring = verifyWiring(context);
  // Shared mail/SQL/Firestore contracts are unchanged; no source from a retained
  // package is installed or invoked in the real environment.
  for (const file of ["nap-portal-competitions.js", "nap-portal-workspaces.js", "nap-notification-automation.js", "nap-notification-pages.js", "nap-notification-preview.js", "engagement-mail-control.js", "engagement-competition-mail-format.js", "nap-club-access-request.js", "nap-swimmer-change-requests.js"])
    assert.equal(source(base, "functions/" + file), source(candidate, "functions/" + file), "Shared protocol changed: " + file);
  const oldPool = parse(source(base, "functions/nap-mysql.js")), newPool = parse(source(candidate, "functions/nap-mysql.js"));
  let replaced = 0;
  walk(newPool, node => { if (node.type === "Property" && node.key.name === "host") { assert.equal(node.value.value, "57.128.101.89"); node.value.value = "nap.ffessm.fr"; replaced++; } });
  assert.equal(replaced, 1); assert.equal(normal(oldPool), normal(newPool), "Only the reviewed MySQL hostname can differ");
  const mailSetup = ({ defs, sandbox, builders, commit }) => {
    Object.assign(sandbox, loader(commit)("functions/engagement-competition-mail-format.js"));
    const installed = new Set();
    function install(name) {
      if (installed.has(name) || Object.hasOwn(sandbox, name) || !defs.has(name)) return;
      installed.add(name);
      const declaration = defs.get(name);
      assert.equal(parse(declaration).body[0].type, "FunctionDeclaration", "Only pure extracted helpers in mail fixture");
      same(declaration, old.get(name), "Mail dependency changed: " + name);
      for (const reference of references(parse(declaration))) install(reference.node.name);
      vm.runInNewContext(declaration, sandbox, { timeout: 3000 });
    }
    for (const builder of builders) install(builder);
  };
  const mailConsumers = new Set(["closeDueEngagementCompetitions", "notifyEngagementCompetitionDocuments", "prepareEngagementClubRecapEmails", "listEngagementCompetitionMailJobs", "prepareEngagementOpeningNotificationEmails", "sendEngagementPreparedEmails", "processNapCompetitionNotifications", "processNapNotificationTask"]);
  await consumerFixtures({ ...context, rows: rows.filter(row => mailConsumers.has(row.name)), definitions, same, mailSetup });
  const { guardFixtures } = require("./release-home-retained-compatibility");
  for (const [kind, name] of [["preferences", "disableCompetitionEmailNotifications"], ["access", "submitEngagementAccessRequest"], ["identity", "resolveEngagementSwimmerChangeRequest"]]) {
    const origin = contract.functions.find(f => f.name === name).commit, results = [];
    for (const commit of [...new Set([base, candidate, origin])]) results.push(await guardFixtures({ commit, definitions, loader, source, kind }));
    for (const result of results) assert.deepEqual(result, results[0]);
  }
  return { schema: 1, suite: "retained-calendar-consumers-v1", productionCommit: base, candidate,
    architectureProofSha256: crypto.createHash("sha256").update(fs.readFileSync(__filename)).digest("hex"),
    contractSha256: crypto.createHash("sha256").update(fs.readFileSync(path.join(__dirname, "../.github/releases/evidence/20261028-architecture-retained-contract.json"))).digest("hex"),
    result: "success", networkCalls: 0, passedFunctions: rows.map(row => row.name).sort(),
    checks: ["exact-15-origins", "all-original-declarations-and-registrations-ast", "actual-live-dependency-wiring", "unchanged-shared-protocols", "hostname-only-pool-change", "bounded-readers-and-denials", "mail-content", "retained-job-replay", "closure-and-document-attachments", "preferences-access-identity-guards"],
    declarations: old.size, ...wiring };
}
module.exports = { matches, validateScope, logicalDefinitions, verifyWiring, prove, contract };
