"use strict";
// Read-only source model. This is not a deployment selector and executes no backend code.
const fs = require("node:fs");
const path = require("node:path");
const acorn = require("../tests/firestore-rules/node_modules/acorn");
const { references } = require("../tests/helpers/lexical-references");

function walk(node, visit, parent = null) {
  if (!node || typeof node !== "object") return;
  if (node.type) visit(node, parent);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(child => walk(child, visit, node));
    else if (value && typeof value === "object") walk(value, visit, node);
  }
}
const parse = source => acorn.parse(source, { ecmaVersion: "latest", sourceType: "script" });
const member = node => !node.computed ? node.property?.name
  : node.property?.type === "Literal" && typeof node.property.value === "string" ? node.property.value : null;
function boundNames(pattern) {
  if (!pattern) return [];
  if (pattern.type === "Identifier") return [pattern.name];
  if (pattern.type === "ObjectPattern") return pattern.properties.flatMap(p => boundNames(p.type === "RestElement" ? p.argument : p.value));
  if (pattern.type === "ArrayPattern") return pattern.elements.flatMap(boundNames);
  if (pattern.type === "AssignmentPattern") return boundNames(pattern.left);
  if (pattern.type === "RestElement") return boundNames(pattern.argument);
  throw Error("Unknown declaration pattern: " + pattern.type);
}

function model(root, snapshot = null) {
  const read = file => snapshot ? snapshot.files[file]?.source : fs.readFileSync(path.join(root, file), "utf8");
  const source = snapshot ? snapshot.source : read("functions/index.js");
  const ast = parse(source), globals = new Map(), factories = new Map(), exports = new Map();
  const nodes = new Map(), warnings = [];
  function declarations(statements) {
    for (const node of statements) {
      if (node.type === "FunctionDeclaration") globals.set(node.id.name, node);
      if (node.type === "VariableDeclaration") for (const declaration of node.declarations) {
        boundNames(declaration.id).forEach(name => globals.set(name, node));
      }
      if (node.type === "IfStatement" && node.consequent.type === "BlockStatement") declarations(node.consequent.body);
    }
  }
  declarations(ast.body);
  for (const [accessor, node] of globals) {
    if (node.type !== "FunctionDeclaration") continue;
    walk(node, call => {
      if (call.type !== "CallExpression" || call.callee.type !== "MemberExpression"
          || !/^create/.test(member(call.callee) || "") || call.callee.object?.callee?.name !== "require") return;
      const request = call.callee.object.arguments[0]?.value;
      if (!request?.startsWith("./")) return;
      const file = "functions/" + request.slice(2) + ".js";
      const text = read(file);
      if (typeof text !== "string") throw Error("Missing factory source: " + file);
      const module = parse(text);
      const factory = module.body.find(n => n.type === "FunctionDeclaration" && n.id.name === member(call.callee));
      if (!factory) return;
      const directives = module.body.filter(n => n.type === "ExpressionStatement" && n.directive).map(n => text.slice(n.start, n.end));
      const moduleOther = module.body.filter(n => n !== factory && !(n.type === "ExpressionStatement"
        && (n.directive || n.expression?.type === "AssignmentExpression" && n.expression.operator === "="
          && n.expression.left.type === "MemberExpression" && n.expression.left.object.name === "module"
          && n.expression.left.property.name === "exports")));
      if (moduleOther.length) warnings.push({ accessor, reason: "module scope requires separate review" });
      if (call.arguments[0]?.type !== "ObjectExpression") throw Error("Non explicit context: " + accessor);
      const context = new Map(), contextKinds = new Map(), contextSetters = new Map();
      for (const property of call.arguments[0].properties) {
        if (property.type !== "Property" || property.computed)
          throw Error("Unknown context binding: " + accessor);
        const name = member({ property: property.key, computed: false });
        if (property.kind === "set") {
          const body = property.value.body.body;
          const assignment = body.length === 1 && body[0].type === "ExpressionStatement" && body[0].expression;
          if (!assignment || assignment.type !== "AssignmentExpression" || assignment.operator !== "="
              || assignment.left.type !== "Identifier" || context.get(name)?.name !== assignment.left.name
              || assignment.right.type !== "Identifier" || assignment.right.name !== property.value.params[0]?.name)
            throw Error("Unknown writable context: " + accessor + "." + name);
          contextSetters.set(name, property); continue;
        }
        if (property.kind === "get" && property.value.body.body.length === 1
            && property.value.body.body[0].type === "ReturnStatement") {
          context.set(name, property.value.body.body[0].argument); contextKinds.set(name, "get");
        } else if (property.kind === "init" && ["Identifier", "Literal"].includes(property.value.type)) {
          context.set(name, property.value); contextKinds.set(name, "value");
        } else throw Error("Unknown context binding: " + accessor + "." + name);
      }
      const parameter = factory.params[0];
      const snapshotBindings = new Map();
      if (factory.params.length !== 1) throw Error("Unknown factory parameters: " + accessor);
      if (parameter?.type === "ObjectPattern") {
        for (const property of parameter.properties) {
          if (property.type !== "Property" || property.computed || property.kind !== "init"
              || property.value.type !== "Identifier" || !context.has(property.key.name))
            throw Error("Unknown captured factory binding: " + accessor);
          snapshotBindings.set(property.value.name, property.key.name);
        }
      } else if (parameter?.type !== "Identifier" || parameter.name !== "backendContext")
        throw Error("Unknown live factory context: " + accessor);
      const methods = new Map(factory.body.body.filter(n => n.type === "FunctionDeclaration").map(n => [n.id.name, n]));
      const other = factory.body.body.filter(n => !["FunctionDeclaration", "ReturnStatement"].includes(n.type));
      if (other.length) warnings.push({ accessor, reason: "factory initialization requires separate review" });
      const returns = factory.body.body.filter(n => n.type === "ReturnStatement");
      if (returns.length !== 1 || returns[0].argument.type !== "ObjectExpression"
          || returns[0].argument.properties.some(p => p.type !== "Property" || p.value.type !== "Identifier" || !methods.has(p.value.name)))
        throw Error("Unknown factory return: " + accessor);
      if (returns[0].argument.properties.length !== methods.size) throw Error("Unexposed private method: " + accessor);
      factories.set(accessor, { accessor, node, file, text, factory, directives, context, contextKinds, contextSetters, snapshotBindings, methods, other,
        returnNames: returns[0].argument.properties.map(property => property.value.name) });
    });
  }
  walk(ast, node => {
    if (node.type === "AssignmentExpression" && node.left.type === "MemberExpression"
        && node.left.object.name === "exports" && !node.left.computed) {
      if (exports.has(node.left.property.name)) throw Error("Duplicate export");
      exports.set(node.left.property.name, node);
    }
  });
  for (const [name, node] of globals) nodes.set("index:" + name, { id: "index:" + name, name, node, file: "functions/index.js" });
  for (const factory of factories.values()) for (const [name, node] of factory.methods) {
    const id = factory.accessor + ":" + name;
    nodes.set(id, { id, name, node, file: factory.file, owner: factory.accessor });
  }
  const identityPairs = [], opaque = [];
  function edges(node, owner = null, recordIdentity = false) {
    const result = new Set(), skipped = new Set();
    const free = references(node), freeNodes = new Set(free.map(r => r.node));
    walk(node, (n, parent) => {
      if (n.type === "MemberExpression" && n.object.type === "CallExpression"
          && n.object.callee.type === "Identifier" && factories.has(n.object.callee.name)
          && freeNodes.has(n.object.callee)) {
        const factory = factories.get(n.object.callee.name), name = member(n);
        if (name && factory.methods.has(name)) result.add(factory.accessor + ":" + name);
        else {
          factory.methods.forEach((_, method) => result.add(factory.accessor + ":" + method));
          opaque.push({ owner, reason: "dynamic factory member", accessor: factory.accessor });
        }
        skipped.add(n.object.callee);
      }
      if (owner && n.type === "MemberExpression" && n.object.name === "backendContext" && freeNodes.has(n.object)) {
        const name = member(n), factory = factories.get(owner);
        if (name && factory.context.has(name)) edges(factory.context.get(name)).forEach(id => result.add(id));
        else {
          factory.context.forEach(expression => edges(expression).forEach(id => result.add(id)));
          opaque.push({ owner, reason: "dynamic context member" });
        }
        skipped.add(n.object);
      }
      if (owner && n.type === "ThisExpression") opaque.push({ owner, reason: "this binding must be preserved" });
    });
    for (const reference of free) {
      const name = reference.node.name;
      if (skipped.has(reference.node)) continue;
      if (owner && factories.get(owner).methods.has(name)) {
        const id = owner + ":" + name;
        result.add(id);
        if (recordIdentity && !(reference.parent?.type === "CallExpression" && reference.parent.callee === reference.node))
          identityPairs.push([owner + ":" + node.id.name, id]);
      } else if (owner && factories.get(owner).snapshotBindings.has(name)) {
        edges(factories.get(owner).context.get(factories.get(owner).snapshotBindings.get(name))).forEach(id => result.add(id));
      } else if (owner && name === "backendContext") {
        factories.get(owner).context.forEach(expression => edges(expression).forEach(id => result.add(id)));
        opaque.push({ owner, reason: "context escapes method" });
      } else if (factories.has(name)) {
        factories.get(name).methods.forEach((_, method) => result.add(name + ":" + method));
        opaque.push({ owner, reason: "factory escapes known member access", accessor: name });
      } else if (globals.has(name)) result.add("index:" + name);
    }
    return [...result].sort();
  }
  for (const record of nodes.values()) record.edges = factories.has(record.name) && !record.owner
    ? [] : edges(record.node, record.owner, !!record.owner);
  const roots = new Map([...exports].map(([name, node]) => [name, edges(node)]));
  function closure(initial) {
    const reached = new Set(), queue = [...initial];
    while (queue.length) {
      const id = queue.pop();
      if (reached.has(id) || !nodes.has(id)) continue;
      reached.add(id); queue.push(...nodes.get(id).edges);
    }
    return [...reached].sort();
  }
  const consumers = new Map([...nodes.keys()].map(id => [id, []]));
  for (const [name, initial] of roots) for (const id of closure(initial)) consumers.get(id).push(name);
  // A helper referenced by module initialization is shared by every export.
  // Over-approximate all root declarations rather than omit an eager effect.
  const initialization = closure([...new Set([...globals.values()].filter(n => n.type === "VariableDeclaration"))].flatMap(n => edges(n)));
  for (const id of initialization) consumers.set(id, [...new Set([...consumers.get(id), ...roots.keys()])]);
  consumers.forEach(names => names.sort());
  return { root, source, ast, globals, factories, exports, nodes, roots, consumers, identityPairs,
    initialization, warnings, opaque, closure };
}

module.exports = { model, walk, parse, member };
