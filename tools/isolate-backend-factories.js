"use strict";
// Mechanical source migration. Preview by default; never changes a selector.
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { model, walk } = require("./backend-factory-model");
const { references } = require("../tests/helpers/lexical-references");
const selection = require("./release-test-function-fingerprints");

const kebab = name => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
const localKey = name => "local$" + name;
const escaped = text => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function edits(source, changes) {
  const ordered = changes.sort((a, b) => b.start - a.start);
  let boundary = source.length;
  for (const change of ordered) {
    if (change.end > boundary) throw Error("Overlapping source changes");
    source = source.slice(0, change.start) + change.text + source.slice(change.end);
    boundary = change.start;
  }
  return source;
}

function render(root, baseline, selected = null) {
  if (!/^[a-f0-9]{40}$/.test(baseline)) throw Error("Full baseline commit required");
  const snapshot = selection.snapshot(root, baseline, { production: true }), m = model(root, snapshot);
  if (selected?.some(name => !m.factories.has(name))) throw Error("Unknown factory selection");
  if (m.warnings.length) throw Error("Unreviewed factory initialization");
  if (m.opaque.some(case_ => case_.reason !== "context escapes method")) throw Error("Unreviewed ambiguous binding");
  const factories = [...m.factories.values()], groups = [], byMethod = new Map();
  for (const f of factories) {
    const buckets = new Map();
    for (const name of f.methods.keys()) {
      const signature = m.consumers.get(f.accessor + ":" + name).join("|");
      if (!buckets.has(signature)) buckets.set(signature, []);
      buckets.get(signature).push(name);
    }
    // A factory with only one true consumer group already has the right boundary.
    if (buckets.size === 1) continue;
    if (selected && !selected.includes(f.accessor)) continue;
    for (const names of buckets.values()) {
      const representative = [...names].sort()[0];
      const group = { owner: f.accessor, names, file: "functions/backend/" + path.posix.basename(f.file, ".js") + "/" + kebab(representative) + ".js",
        accessor: "$" + f.accessor + "_" + representative,
        factory: f.factory.id.name + "_" + representative, fields: new Set(), locals: new Set(), f };
      if (m.globals.has(group.accessor)) throw Error("Provider name collision");
      groups.push(group);
      names.forEach(name => byMethod.set(f.accessor + ":" + name, group));
    }
  }
  const active = new Set(groups.map(g => g.owner));
  const outputs = new Map(), moved = [];
  for (const group of groups) {
    const bodies = [];
    for (const name of group.names) {
      const node = group.f.methods.get(name), changes = [], free = references(node);
      const contextRefs = new Set(free.filter(r => r.node.name === "backendContext").map(r => r.node));
      const requireRefs = new Set(free.filter(r => r.node.name === "require").map(r => r.node)), supportedRequireRefs = new Set();
      if (free.some(r => ["__dirname", "__filename", "eval", "Function", "module", "exports"].includes(r.node.name)))
        throw Error("Module-scoped execution requires review: " + group.owner + "." + name);
      walk(node, (n, parent) => {
        const requireCall = n.type === "CallExpression" && (requireRefs.has(n.callee)
          || n.callee.type === "MemberExpression" && requireRefs.has(n.callee.object) && n.callee.property.name === "resolve");
        if (requireCall) {
          supportedRequireRefs.add(requireRefs.has(n.callee) ? n.callee : n.callee.object);
          const argument = n.arguments[0];
          if (n.arguments.length !== 1 || argument?.type !== "Literal" || typeof argument.value !== "string")
            throw Error("Dynamic require needs original module scope: " + group.owner + "." + name);
          if (argument.value.startsWith(".")) {
            const target = path.posix.normalize(path.posix.join(path.posix.dirname(group.f.file), argument.value));
            if (![target, target + ".js", target + ".json", target + "/index.js"].some(file => snapshot.files[file]))
              throw Error("Unresolved original import: " + target);
            let relative = path.posix.relative(path.posix.dirname(group.file), target);
            if (!relative.startsWith(".")) relative = "./" + relative;
            changes.push({ start: argument.start - node.start, end: argument.end - node.start, text: JSON.stringify(relative) });
          }
        }
        if (n.type === "Identifier" && contextRefs.has(n)) {
          if (parent?.type === "MemberExpression" && parent.object === n && !parent.computed) group.fields.add(parent.property.name);
          else group.f.context.forEach((_, key) => group.fields.add(key));
        }
        if ((n.type === "AssignmentExpression" && n.left.type === "Identifier" && group.f.methods.has(n.left.name))
            || (n.type === "UpdateExpression" && n.argument.type === "Identifier" && group.f.methods.has(n.argument.name)))
          throw Error("Mutable function binding requires review: " + group.owner + "." + name);
      });
      if ([...requireRefs].some(reference => !supportedRequireRefs.has(reference)))
        throw Error("Escaping require binding needs original scope: " + group.owner + "." + name);
      for (const ref of free) {
        const target = byMethod.get(group.owner + ":" + ref.node.name);
        if (!target || target === group) continue;
        const key = localKey(ref.node.name);
        if (group.f.context.has(key)) throw Error("Private context slot collision");
        group.locals.add(ref.node.name);
        const direct = ref.parent?.type === "CallExpression" && ref.parent.callee === ref.node;
        const text = "backendContext." + key;
        changes.push({ start: ref.node.start - node.start, end: ref.node.end - node.start,
          text: direct ? "(0, " + text + ")" : text });
      }
      const body = edits(group.f.text.slice(node.start, node.end), changes);
      bodies.push("  " + body);
      moved.push({ owner: group.owner, name, from: group.f.file, to: group.file });
    }
    for (const field of group.fields) if (!group.f.context.has(field)) throw Error("Unknown context field: " + group.owner + "." + field);
    const directives = group.f.directives.length ? group.f.directives.join("\n") + "\n" : "";
    outputs.set(group.file, directives + "// Existing operation bodies; live services arrive through explicit accessors.\n"
      + "function " + group.factory + "(backendContext) {\n" + bodies.join("\n\n")
      + "\n\n  return { " + group.names.join(", ") + " };\n}\n\nmodule.exports = { " + group.factory + " };\n");
  }
  function rootFields(group) {
    const properties = [];
    for (const name of [...group.f.context.keys()].filter(name => group.fields.has(name))) {
      const expression = group.f.context.get(name), text = m.source.slice(expression.start, expression.end);
      properties.push(group.f.contextKinds.get(name) === "value" ? name + ": " + text : "get " + name + "() { return " + text + "; }");
      const setter = group.f.contextSetters.get(name);
      if (setter) properties.push(m.source.slice(setter.start, setter.end));
    }
    for (const name of [...group.locals].sort()) {
      const target = byMethod.get(group.owner + ":" + name);
      properties.push("get " + localKey(name) + "() { return " + target.accessor + "()." + name + "; }");
    }
    return properties;
  }
  const wiring = groups.map(group => "function " + group.accessor + "() {\n  if (!" + group.accessor + ".instance) "
    + group.accessor + ".instance = require(" + JSON.stringify("./" + group.file.slice("functions/".length, -3)) + ")." + group.factory + "({\n"
    + rootFields(group).map(field => "    " + field).join(",\n")
    + "\n  });\n  return " + group.accessor + ".instance;\n}\n").join("\n");
  const removed = factories.filter(f => active.has(f.accessor)).map(f => ({ start: f.node.start, end: f.node.end, text: "" }));
  const rewrites = [...removed];
  walk(m.ast, node => {
    if (removed.some(range => node.start >= range.start && node.end <= range.end)) return;
    if (node.type !== "MemberExpression" || node.object.type !== "CallExpression"
        || node.object.callee.type !== "Identifier" || node.computed) return;
    const group = byMethod.get(node.object.callee.name + ":" + node.property.name);
    if (group) rewrites.push({ start: node.object.callee.start, end: node.object.callee.end, text: group.accessor });
  });
  let index = groups.length ? wiring + "\n" + edits(m.source, rewrites) : m.source;
  for (const move of moved) {
    index = index.replace(new RegExp(escaped(move.from + "#" + move.name) + "(?=[#\\s])", "g"), () => move.to + "#" + move.name);
  }
  outputs.set("functions/index.js", index);
  // Compatibility APIs remain useful for actual-factory tests. Their context
  // forwarding is lazy; operation modules contain the canonical bodies.
  for (const f of factories.filter(f => active.has(f.accessor))) {
    const owned = groups.filter(g => g.owner === f.accessor), lines = [];
    for (const [index, group] of owned.entries()) {
      group.adapterAccessor = "operation" + index;
      lines.push("  let cache" + index + ";\n  function operation" + index + "() {\n    if (!cache" + index + ") cache" + index
        + " = require(" + JSON.stringify("./" + group.file.slice("functions/".length, -3)) + ")." + group.factory + "({\n"
        + [...group.f.context.keys()].filter(name => group.fields.has(name)).flatMap(name => ["      get " + name + "() { return backendContext." + name + "; }",
          "      set " + name + "(value) { backendContext." + name + " = value; }"]).concat([...group.locals].sort().map(name => {
            const target = byMethod.get(f.accessor + ":" + name);
            return "      get " + localKey(name) + "() { return operation" + owned.indexOf(target) + "()." + name + "; }";
          })).join(",\n") + "\n    });\n    return cache" + index + ";\n  }");
    }
    const values = f.returnNames.map(name => "    " + name + ": " + byMethod.get(f.accessor + ":" + name).adapterAccessor + "()." + name);
    const directives = f.directives.length ? f.directives.join("\n") + "\n" : "";
    outputs.set(f.file, directives + "// Compatibility factory; operation modules hold the existing bodies.\nfunction " + f.factory.id.name + "(backendContext) {\n"
      + lines.join("\n\n") + "\n  return {\n" + values.join(",\n") + "\n  };\n}\n\nmodule.exports = { " + f.factory.id.name + " };\n");
  }
  return { baseline, m, groups, moved, outputs, snapshot };
}

function apply(root, result, previousFactories = []) {
  if (!result.groups.length) throw Error("No new isolation to apply");
  const selected = new Set(result.groups.map(group => group.owner));
  if (previousFactories.some(name => !selected.has(name))) throw Error("Cumulative factory selection cannot shrink");
  const previous = render(root, result.baseline, previousFactories);
  const proof = require("./verify-backend-factory-isolation").verify(result);
  const owned = new Set([...previous.outputs.keys(), ...result.outputs.keys()]);
  const git = args => execFileSync("git", args, { cwd: root, encoding: "utf8" });
  const changed = git(["diff", "--name-only", result.baseline, "--", "functions"]).split(/\r?\n/).filter(Boolean);
  const untracked = git(["ls-files", "--others", "--exclude-standard", "--", "functions"]).split(/\r?\n/).filter(Boolean);
  if ([...changed, ...untracked].some(file => !owned.has(file))) throw Error("Unexpected backend source divergence");
  const normalized = source => source.replace(/\r\n/g, "\n");
  const observed = new Map(), absoluteRoot = path.resolve(root);
  for (const [file, desired] of result.outputs) {
    const target = path.resolve(root, file);
    if (!target.startsWith(absoluteRoot + path.sep)) throw Error("Output escapes workspace");
    let parent = path.dirname(target);
    while (parent !== absoluteRoot) {
      if (fs.existsSync(parent) && fs.lstatSync(parent).isSymbolicLink()) throw Error("Linked output directory");
      parent = path.dirname(parent);
    }
    if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink()) throw Error("Linked output file");
    const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : null;
    const expected = previous.outputs.get(file) ?? (file === "functions/index.js" ? result.snapshot.source : result.snapshot.files[file]?.source);
    if (current !== null && normalized(current) !== normalized(desired)
        && (typeof expected !== "string" || normalized(current) !== normalized(expected)))
      throw Error("Output modified outside planned migration: " + file);
    if (current === null && typeof expected === "string") throw Error("Expected source was removed: " + file);
    observed.set(file, current);
  }
  // Validate every path and source first. Resume of the exact same plan is
  // idempotent; any unexpected edit aborts before that file can be overwritten.
  for (const [file, desired] of result.outputs) {
    const target = path.resolve(root, file), before = observed.get(file);
    const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : null;
    if (current !== before) throw Error("Concurrent source change: " + file);
    if (current !== null && normalized(current) === normalized(desired)) continue;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, desired, { flag: before === null ? "wx" : "w" });
  }
  const actual = new Map([...result.outputs.keys()].map(file => [file, fs.readFileSync(path.resolve(root, file), "utf8")]));
  return require("./verify-backend-factory-isolation").verify(result, actual);
}

module.exports = { render, apply, localKey };
if (require.main === module) {
  const root = path.resolve(__dirname, ".."), baseline = process.argv[2];
  const selected = process.argv.find(v => v.startsWith("--factories="))?.slice(12).split(",");
  const result = render(root, baseline, selected);
  if (process.argv.includes("--apply")) {
    const previous = process.argv.find(arg => arg.startsWith("--previous="))?.slice(11).split(",").filter(Boolean) || [];
    console.log(JSON.stringify(apply(root, result, previous)));
  }
  console.log(JSON.stringify({ baseline, factories: new Set(result.groups.map(g => g.owner)).size,
    operationGroups: result.groups.length, movedMethods: result.moved.length, files: result.outputs.size,
    indexLines: result.outputs.get("functions/index.js").split("\n").length }));
}
