"use strict";
// Independent invariants for the mechanical migration. No backend code runs.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { model, parse, walk } = require("./backend-factory-model");
const { references } = require("../tests/helpers/lexical-references");
const { render } = require("./isolate-backend-factories");

function canonical(node, options = {}) {
  if (!node || typeof node !== "object") return node;
  if (Array.isArray(node)) return node.map(value => canonical(value, options));
  if (node.type === "MemberExpression" && !node.computed && node.object.name === "backendContext"
      && node.property.name.startsWith("local$") && options.locals?.has(node.property.name.slice(6)))
    return { type: "Identifier", name: node.property.name.slice(6) };
  if (node.type === "SequenceExpression" && node.expressions.length === 2
      && node.expressions[0].type === "Literal" && node.expressions[0].value === 0) {
    const last = canonical(node.expressions[1], options);
    if (last.type === "Identifier" && options.methodNames?.has(last.name)) return last;
  }
  const clone = Object.fromEntries(Object.entries(node).filter(([key]) => !["start", "end", "raw"].includes(key))
    .map(([key, value]) => [key, canonical(value, options)]));
  if (node.type === "CallExpression" && options.requireRefs
      && (options.requireRefs.has(node.callee) || node.callee.type === "MemberExpression"
        && options.requireRefs.has(node.callee.object) && node.callee.property.name === "resolve")) {
    const arg = node.arguments[0];
    if (node.arguments.length === 1 && arg.type === "Literal" && typeof arg.value === "string" && arg.value.startsWith("."))
      clone.arguments[0].value = "@module:" + path.posix.normalize(path.posix.join(path.posix.dirname(options.file), arg.value));
  }
  if (node.type === "MemberExpression" && !node.computed && node.object.type === "CallExpression"
      && node.object.callee.type === "Identifier" && options.providers?.has(node.object.callee.name)) {
    const group = options.providers.get(node.object.callee.name);
    assert(group.names.includes(node.property.name), "Unknown operation member");
    clone.object.callee.name = group.owner;
  }
  return clone;
}
const equal = (left, right, label) => assert.deepEqual(left, right, label);
function optionsFor(node, file, methodNames, locals) {
  return { file, methodNames, locals,
    requireRefs: new Set(references(node).filter(ref => ref.node.name === "require").map(ref => ref.node)) };
}
function properties(object) {
  assert.equal(object?.type, "ObjectExpression", "Explicit context required");
  const map = new Map();
  for (const property of object.properties) {
    assert.equal(property.type, "Property"); assert.equal(property.computed, false);
    const key = property.key.name || property.key.value, slot = key + ":" + property.kind;
    assert(!map.has(slot), "Duplicate context property"); map.set(slot, property);
  }
  return map;
}
function returned(property) {
  assert.equal(property.kind, "get");
  assert.equal(property.value.body.body.length, 1);
  assert.equal(property.value.body.body[0].type, "ReturnStatement");
  return property.value.body.body[0].argument;
}

function verify(result, outputs = result.outputs) {
  const { m, groups } = result, providers = new Map(groups.map(group => [group.accessor, group]));
  const expectedFiles = new Set(["functions/index.js", ...groups.map(group => group.file), ...groups.map(group => group.f.file)]);
  equal([...outputs.keys()].sort(), [...expectedFiles].sort(), "Unexpected or missing runtime output");
  const byMethod = new Map(groups.flatMap(group => group.names.map(name => [group.owner + ":" + name, group])));
  const source = outputs.get("functions/index.js");
  assert.equal(typeof source, "string", "Missing index");
  const markers = text => [...text.matchAll(/\/\* extracted-(function|handler): ([\w/.-]+)#(\w+)((?:#\w+)?) \*\//g)]
    .map(match => ({ type: match[1], file: match[2], name: match[3], kind: match[4] }));
  const moves = new Map(result.moved.map(move => [move.from + "#" + move.name, move.to]));
  equal(markers(source), markers(m.source).map(marker => ({ ...marker,
    file: moves.get(marker.file + "#" + marker.name) || marker.file })), "Logical-source markers must target the exact moved body");
  const ast = parse(source), definitions = new Map(ast.body.filter(n => n.type === "FunctionDeclaration").map(n => [n.id.name, n]));
  const removed = new Set(groups.map(group => group.owner));
  const before = m.ast.body.filter(n => !(n.type === "FunctionDeclaration" && removed.has(n.id.name)));
  const after = ast.body.filter(n => !(n.type === "FunctionDeclaration" && providers.has(n.id.name)));
  equal(canonical(after, { providers }), canonical(before), "All index statements, registrations and original global bodies must be preserved");
  let bodies = 0;
  for (const group of groups) {
    const text = outputs.get(group.file);
    assert.equal(typeof text, "string", "Missing operation module: " + group.file);
    const module = parse(text), factory = module.body.find(n => n.type === "FunctionDeclaration");
    assert.equal(factory?.id.name, group.factory);
    assert.equal(factory.async, group.f.factory.async); assert.equal(factory.generator, group.f.factory.generator);
    equal(factory.params.map(n => n.name), ["backendContext"], "Factory interface");
    const directives = module.body.filter(n => n.type === "ExpressionStatement" && n.directive).map(n => n.directive);
    equal(directives, group.f.directives.map(text => parse(text).body[0].directive), "Execution mode");
    const rest = module.body.filter(n => n !== factory && !(n.type === "ExpressionStatement" && n.directive));
    assert.equal(rest.length, 1, "No module-scope effects");
    const assignment = rest[0].expression;
    assert.equal(assignment?.type, "AssignmentExpression"); assert.equal(assignment.operator, "=");
    assert.equal(assignment.left.object?.name, "module"); assert.equal(assignment.left.property?.name, "exports");
    assert.equal(assignment.left.computed, false);
    const exports = properties(assignment.right);
    assert.equal(exports.size, 1); assert.equal(exports.get(group.factory + ":init")?.value.name, group.factory);
    const functions = factory.body.body.filter(n => n.type === "FunctionDeclaration");
    equal(functions.map(n => n.id.name), group.names, "Exact operation members");
    const other = factory.body.body.filter(n => n.type !== "FunctionDeclaration");
    assert.equal(other.length, 1); assert.equal(other[0].type, "ReturnStatement");
    const returnedMembers = properties(other[0].argument);
    equal([...returnedMembers.keys()].map(key => key.split(":")[0]), group.names);
    const requiredFields = new Set();
    for (const fn of functions) {
      assert.equal(returnedMembers.get(fn.id.name + ":init").value.name, fn.id.name, "Return the original function, not a forwarding wrapper");
      const original = group.f.methods.get(fn.id.name), methodNames = new Set(group.f.methods.keys());
      equal(canonical(fn, optionsFor(fn, group.file, methodNames, group.locals)),
        canonical(original, optionsFor(original, group.f.file, methodNames)), "Body/signature changed: " + group.owner + "." + fn.id.name);
      bodies++;
      const contextRefs = new Set(references(fn).filter(ref => ref.node.name === "backendContext").map(ref => ref.node));
      walk(fn, (node, parent) => {
        if (!contextRefs.has(node)) return;
        if (parent?.type === "MemberExpression" && parent.object === node && !parent.computed) requiredFields.add(parent.property.name);
        else group.f.context.forEach((_, name) => requiredFields.add(name));
      });
    }
    const provider = definitions.get(group.accessor);
    assert(provider, "Missing provider"); assert.equal(provider.params.length, 0);
    assert.equal(provider.async, false); assert.equal(provider.generator, false);
    assert.equal(ast.body.filter(n => n.type === "FunctionDeclaration" && n.id.name === group.accessor).length, 1, "Duplicate provider");
    assert.equal(provider.body.body.length, 2);
    const guard = provider.body.body[0], returnedInstance = provider.body.body[1];
    assert.equal(guard.type, "IfStatement"); assert.equal(guard.alternate, null);
    assert.equal(guard.test.type, "UnaryExpression"); assert.equal(guard.test.operator, "!");
    equal(canonical(guard.test.argument), { type: "MemberExpression", object: { type: "Identifier", name: group.accessor },
      property: { type: "Identifier", name: "instance" }, computed: false, optional: false });
    assert.equal(returnedInstance.type, "ReturnStatement"); equal(canonical(returnedInstance.argument), canonical(guard.test.argument));
    const cache = guard.consequent.expression;
    assert.equal(cache.type, "AssignmentExpression"); assert.equal(cache.operator, "=");
    equal(canonical(cache.left), canonical(guard.test.argument));
    const call = cache.right;
    assert.equal(call.type, "CallExpression"); assert.equal(call.arguments.length, 1);
    assert.equal(call.optional, false); assert.equal(call.callee.optional, false);
    assert.equal(call.callee.property.name, group.factory); assert.equal(call.callee.computed, false);
    assert.equal(call.callee.object.callee.name, "require"); assert.equal(call.callee.object.arguments.length, 1);
    assert.equal(call.callee.object.optional, false);
    assert.equal("functions/" + call.callee.object.arguments[0].value.slice(2) + ".js", group.file);
    const fields = properties(call.arguments[0]);
    const expected = [];
    for (const name of [...group.f.context.keys()].filter(name => group.fields.has(name))) {
      const kind = group.f.contextKinds.get(name) === "value" ? "init" : "get";
      expected.push(name + ":" + kind);
      const property = fields.get(name + ":" + kind);
      assert(property, "Missing context field " + name);
      equal(canonical(kind === "get" ? returned(property) : property.value), canonical(group.f.context.get(name)), "Changed live binding: " + name);
      const setter = group.f.contextSetters.get(name);
      if (setter) { expected.push(name + ":set"); equal(canonical(fields.get(name + ":set")), canonical(setter), "Writable state binding"); }
    }
    for (const name of [...group.locals].sort()) {
      const key = "local$" + name, target = byMethod.get(group.owner + ":" + name);
      expected.push(key + ":get");
      const value = returned(fields.get(key + ":get"));
      assert.equal(value.type, "MemberExpression"); assert.equal(value.computed, false);
      assert.equal(value.property.name, name); assert.equal(value.object.type, "CallExpression");
      assert.equal(value.object.callee.name, target.accessor); assert.equal(value.object.arguments.length, 0);
    }
    equal([...fields.keys()], expected, "Unexpected context fields, order or bindings");
    equal([...new Set([...fields.keys()].map(key => key.split(":")[0]))].sort(), [...requiredFields].sort(), "Context must cover actual body accesses exactly");
  }
  for (const owner of removed) {
    const original = m.factories.get(owner), owned = groups.filter(group => group.owner === owner);
    const adapter = parse(outputs.get(original.file));
    const factory = adapter.body.find(n => n.type === "FunctionDeclaration");
    assert.equal(factory?.id.name, original.factory.id.name);
    assert.equal(factory.async, original.factory.async); assert.equal(factory.generator, original.factory.generator);
    equal(factory.params.map(n => n.name), ["backendContext"]);
    equal(adapter.body.filter(n => n.type === "ExpressionStatement" && n.directive).map(n => n.directive),
      original.directives.map(text => parse(text).body[0].directive), "Compatibility execution mode");
    const moduleOther = adapter.body.filter(n => n !== factory && !(n.type === "ExpressionStatement" && n.directive));
    assert.equal(moduleOther.length, 1);
    const assignment = moduleOther[0].expression;
    assert.equal(assignment?.type, "AssignmentExpression"); assert.equal(assignment.operator, "=");
    assert.equal(assignment.left.object?.name, "module"); assert.equal(assignment.left.property?.name, "exports");
    assert.equal(assignment.left.computed, false);
    const exported = properties(assignment.right);
    assert.equal(exported.size, 1); assert.equal(exported.get(original.factory.id.name + ":init")?.value.name, original.factory.id.name);
    const statements = factory.body.body;
    assert.equal(statements.length, owned.length * 2 + 1, "Only local caches, providers and original API");
    const operationNames = new Map(owned.map((group, index) => [group, "operation" + index]));
    for (const [index, group] of owned.entries()) {
      const declaration = statements[index * 2], provider = statements[index * 2 + 1], cacheName = "cache" + index;
      assert.equal(declaration.type, "VariableDeclaration"); assert.equal(declaration.kind, "let"); assert.equal(declaration.declarations.length, 1);
      assert.equal(declaration.declarations[0].id.name, cacheName); assert.equal(declaration.declarations[0].init, null);
      assert.equal(provider.type, "FunctionDeclaration"); assert.equal(provider.id.name, operationNames.get(group));
      assert.equal(provider.async, false); assert.equal(provider.generator, false);
      assert.equal(provider.params.length, 0); assert.equal(provider.body.body.length, 2);
      const guard = provider.body.body[0], result = provider.body.body[1];
      assert.equal(guard.type, "IfStatement"); assert.equal(guard.alternate, null);
      assert.equal(guard.test.type, "UnaryExpression"); assert.equal(guard.test.operator, "!"); assert.equal(guard.test.argument.name, cacheName);
      assert.equal(result.type, "ReturnStatement"); assert.equal(result.argument.name, cacheName);
      const store = guard.consequent.expression;
      assert.equal(store.type, "AssignmentExpression"); assert.equal(store.operator, "="); assert.equal(store.left.name, cacheName);
      const call = store.right;
      assert.equal(call.type, "CallExpression"); assert.equal(call.arguments.length, 1);
      assert.equal(call.optional, false); assert.equal(call.callee.optional, false);
      assert.equal(call.callee.property.name, group.factory); assert.equal(call.callee.object.callee.name, "require");
      assert.equal(call.callee.computed, false); assert.equal(call.callee.object.optional, false);
      assert.equal(call.callee.object.arguments.length, 1);
      assert.equal("functions/" + call.callee.object.arguments[0].value.slice(2) + ".js", group.file);
      const fields = properties(call.arguments[0]), expected = [];
      for (const name of group.fields) {
        expected.push(name + ":get", name + ":set");
        const value = returned(fields.get(name + ":get"));
        equal(canonical(value), { type: "MemberExpression", object: { type: "Identifier", name: "backendContext" },
          property: { type: "Identifier", name }, computed: false, optional: false }, "Live compatibility binding");
        const setter = fields.get(name + ":set").value;
        assert.equal(setter.params.length, 1); assert.equal(setter.params[0].name, "value"); assert.equal(setter.body.body.length, 1);
        const expression = setter.body.body[0].expression;
        assert.equal(expression?.type, "AssignmentExpression"); assert.equal(expression.operator, "=");
        equal(canonical(expression.left), canonical(value)); assert.equal(expression.right.name, "value");
      }
      for (const name of group.locals) {
        const key = "local$" + name, target = byMethod.get(owner + ":" + name);
        expected.push(key + ":get");
        const value = returned(fields.get(key + ":get"));
        assert.equal(value.type, "MemberExpression"); assert.equal(value.computed, false); assert.equal(value.property.name, name);
        assert.equal(value.object.type, "CallExpression"); assert.equal(value.object.callee.name, operationNames.get(target));
        assert.equal(value.object.arguments.length, 0);
      }
      equal([...fields.keys()].sort(), expected.sort(), "Compatibility context fields");
    }
    const returnedApi = statements.at(-1);
    assert.equal(returnedApi.type, "ReturnStatement");
    const members = properties(returnedApi.argument);
    equal([...members.keys()].map(key => key.split(":")[0]), original.returnNames, "Original factory API and property order");
    for (const name of original.returnNames) {
      const value = members.get(name + ":init").value;
      assert.equal(value.type, "MemberExpression"); assert.equal(value.computed, false); assert.equal(value.property.name, name);
      assert.equal(value.object.type, "CallExpression"); assert.equal(value.object.arguments.length, 0);
      assert.equal(value.object.callee.name, operationNames.get(byMethod.get(owner + ":" + name)), "Original function identity/arity");
    }
  }
  // Independently rebuild actual operation/context edges from the rendered
  // sources. Every original private method consumer must remain the same.
  const files = { ...result.snapshot.files };
  for (const [file, source] of outputs) if (file !== "functions/index.js") files[file] = { source };
  const actualModel = model(m.root, { ...result.snapshot, source, files });
  assert.equal(actualModel.warnings.length, 0, "Unexpected operation initialization");
  equal([...actualModel.exports.keys()].sort(), [...m.exports.keys()].sort(), "Complete Firebase export coverage");
  for (const [name, roots] of m.roots) {
    const originalMethods = m.closure(roots).filter(id => !id.startsWith("index:"));
    const actualMethods = actualModel.closure(actualModel.roots.get(name)).filter(id => !id.startsWith("index:")).map(id => {
      const separator = id.indexOf(":"), owner = id.slice(0, separator), method = id.slice(separator + 1);
      return providers.has(owner) ? providers.get(owner).owner + ":" + method : id;
    });
    equal([...new Set(actualMethods)].sort(), originalMethods.sort(), "Actual private dependency graph changed: " + name);
  }
  const digest = crypto.createHash("sha256");
  for (const [file, source] of [...outputs].sort(([a], [b]) => a.localeCompare(b))) digest.update(file + "\0" + source.replace(/\r\n/g, "\n") + "\0");
  return { schema: 1, baseline: result.baseline, result: "success", bodies, groups: groups.length,
    exports: m.exports.size, runtimeSourceSha256: digest.digest("hex"), networkCalls: 0 };
}
module.exports = { verify, canonical };
if (require.main === module) {
  const root = path.resolve(__dirname, ".."), baseline = process.argv[2];
  const selected = process.argv.find(arg => arg.startsWith("--factories="))?.slice(12).split(",");
  const result = render(root, baseline, selected);
  const files = process.argv.includes("--preview") ? result.outputs
    : new Map([...result.outputs.keys()].map(file => [file, fs.readFileSync(path.join(root, file), "utf8")]));
  console.log(JSON.stringify(verify(result, files)));
}
