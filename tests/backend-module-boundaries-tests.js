"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const acorn = require("./firestore-rules/node_modules/acorn");
const { createCompetitionImportParser } = require("../functions/competition-import-parser");
const { createEngagementPdfRenderer } = require("../functions/engagement-pdf-renderer");
const { createAccessHandlers } = require("../functions/portal-access-handlers");
const { references } = require("./helpers/lexical-references");
const factoryModel = require("../tools/backend-factory-model").model(process.cwd());
const liveFactories = new Map([...factoryModel.factories.values()].map(factory => [factory.file, factory]));

// Exercise the actual extracted modules, separately from legacy source contracts.
const parser = createCompetitionImportParser({ cleanText: value => String(value || "").trim() });
assert.equal(parser.parseFrenchDate("28/10/2026"), "2026-10-28");
assert.equal(parser.parseImportDate("2026-10-28"), "2026-10-28");
assert.throws(() => parser.cleanImportText("\u0000  "));
const pdf = createEngagementPdfRenderer({ cleanText: value => String(value || "").trim() });
assert.equal(pdf.engagementPdfMoney(2.5), "2,50 EUR");
assert.equal(pdf.engagementPdfSwimmerName({ firstName: "Camille", lastName: "EXEMPLE" }), "Camille EXEMPLE");

const files = new Map();
function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const file = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) collect(file);
    else if (file.endsWith(".js")) files.set(file, fs.readFileSync(file, "utf8"));
  }
}
collect("functions");
function walk(node, visit) {
  if (!node || typeof node !== "object") return;
  if (node.type) visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(child => walk(child, visit));
    else if (value && typeof value === "object") walk(value, visit);
  }
}
const edges = new Map();
const entry = acorn.parse(fs.readFileSync("functions/index.js", "utf8"), { ecmaVersion: "latest" });
const nodeGlobals = new Set([...Object.getOwnPropertyNames(globalThis), "module", "require", "undefined", "__dirname", "__filename"]);
for (const [file, source] of files) {
  const dependencies = new Set();
  walk(acorn.parse(source, { ecmaVersion: "latest" }), node => {
    if (node.type !== "CallExpression" || node.callee.name !== "require") return;
    const value = node.arguments[0]?.value;
    if (typeof value !== "string" || !value.startsWith(".")) return;
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), value));
    const resolved = [target, target + ".js", target + ".json"].find(name => fs.existsSync(name));
    assert.ok(resolved, file + " -> " + value);
    if (files.has(resolved)) dependencies.add(resolved);
  });
  edges.set(file, dependencies);
  if (/\/(?:portal-.*-handlers|server-.*-service)\.js$/.test(file) || file.startsWith("functions/backend/")) {
    const ast = acorn.parse(source, { ecmaVersion: "latest" });
    const factory = ast.body.find(node => node.type === "FunctionDeclaration");
    const loaded = require("../" + file);
    loaded[factory.id.name](new Proxy({}, { get() { throw Error("Eager backend service access"); } }));
    for (const reference of references(ast)) assert.ok(nodeGlobals.has(reference.node.name), file + " unbound " + reference.node.name);
    let supplied;
    walk(entry, node => {
      if (node.type === "CallExpression" && node.callee.property?.name === factory.id.name) supplied = node.arguments[0];
    });
    let names;
    if (supplied) {
      assert.equal(supplied.type, "ObjectExpression", file + " must have explicit live services");
      names = new Set(supplied.properties.map(p => p.key.name));
    } else {
      assert(source.includes("// Compatibility factory; operation modules hold the existing bodies."), file + " must be a checked compatibility API");
      const prefix = "functions/backend/" + path.posix.basename(file, ".js") + "/";
      assert(dependencies.size > 0 && [...dependencies].every(target => target.startsWith(prefix)), file + " must directly use its own operation modules");
      names = new Set();
      for (const target of dependencies) {
        const live = liveFactories.get(target);
        assert(live, target + " must have real explicit index wiring");
        live.context.forEach((_, name) => names.add(name));
      }
    }
    walk(ast, node => {
      if (node.type === "MemberExpression" && node.object.name === "backendContext") assert.ok(names.has(node.property.name), file + " missing " + node.property.name);
    });
  }
}
const completed = new Set();
function visit(file, active = []) {
  assert.ok(!active.includes(file), "Circular dependency: " + [...active, file].join(" -> "));
  if (completed.has(file)) return;
  for (const dependency of edges.get(file)) visit(dependency, [...active, file]);
  completed.add(file);
}
for (const file of files.keys()) visit(file);
console.log("Backend boundaries: actual parser/PDF factories, resolved imports and acyclic dependency graph passed offline.");
async function authorization() {
  const denied = new Error("fixture: permission denied");
  let dataReads = 0;
  const handlers = createAccessHandlers({
    assertCapability(request, capability) { assert.equal(capability, "consoles.manage"); throw denied; },
    get db() { dataReads++; throw Error("No data access before permission"); }
  });
  await assert.rejects(handlers.setRolePins({ data: {} }), error => error === denied);
  assert.equal(dataReads, 0);
  console.log("Actual extracted callable: authorization refusal precedes every data access.");
}
authorization().catch(error => { console.error(error); process.exitCode = 1; });
