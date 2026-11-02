"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const acorn = require("./firestore-rules/node_modules/acorn");
const { references } = require("./helpers/lexical-references");
function walk(node, visit) {
  if (!node || typeof node !== "object") return;
  if (node.type) visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(child => walk(child, visit));
    else if (value && typeof value === "object") walk(value, visit);
  }
}
const source = fs.readFileSync("assets/livepalmes-admin-portal.js", "utf8");
const ast = acorn.parse(source, { ecmaVersion: "latest" });
const html = fs.readFileSync("portail.html", "utf8");
const body = ast.body[0].expression.callee.body.body;
assert.equal(body.filter(node => node.type === "FunctionDeclaration").length, 0,
  "The portal entry assembles private state and modules; business functions belong in a module");
const window = {}, functions = new Set();
const forbidden = new Proxy({}, { get() { throw Error("Eager portal dependency read"); } });
const untouchedContext = { state: forbidden, config: forbidden, actions: forbidden };
const interfaceNames = name => new Set(body.find(node => node.type === "VariableDeclaration" && node.declarations[0].id.name === name).declarations[0].init.properties.map(p => p.key.name));
const stateNames = interfaceNames("portalState"), configNames = interfaceNames("portalConfig");
const actionNames = new Set(body.filter(node => node.type === "VariableDeclaration" && node.declarations[0].id.type === "ObjectPattern").flatMap(node => node.declarations[0].id.properties.map(p => p.value.name)));
const mainTag = html.indexOf('src="assets/livepalmes-admin-portal.js?');
for (const file of fs.readdirSync("assets/portal").filter(name => name.endsWith(".js"))) {
  const path = "assets/portal/" + file;
  const tag = html.indexOf('src="' + path + '?');
  assert.ok(tag > 0 && tag < mainTag, "Module loaded before assembly: " + path);
  const moduleSource = fs.readFileSync(path, "utf8");
  const browserGlobals = new Set("Array Blob Boolean CSS CustomEvent Date Error Event FileReader HTMLElement Intl JSON Map Math MutationObserver Number Object Option Promise Set String TextEncoder URL URLSearchParams Uint8Array atob clearTimeout console decodeURIComponent document encodeURIComponent fetch performance setTimeout undefined window".split(" "));
  for (const reference of references(acorn.parse(moduleSource, { ecmaVersion: "latest" }))) {
    assert.ok(browserGlobals.has(reference.node.name), path + " unbound " + reference.node.name);
  }
  const previous = new Set(Object.keys(window));
  vm.runInNewContext(moduleSource, { window });
  const symbol = Object.keys(window).find(name => !previous.has(name));
  assert.ok(symbol);
  const exported = window[symbol].create(untouchedContext);
  const registration = body.find(node => node.type === "VariableDeclaration" &&
    node.declarations[0].init?.callee?.object?.property?.name === symbol);
  assert.ok(registration, "Missing module registration: " + symbol);
  const declaration = registration.declarations[0];
  const aliases = body.find(node => node.type === "VariableDeclaration" && node.declarations[0].init?.name === declaration.id.name);
  const declared = aliases.declarations[0].id.properties.map(p => p.value.name).sort();
  assert.deepEqual(declared, Object.keys(exported).sort());
  for (const name of declared) {
    assert.ok(!functions.has(name), "Duplicate private function: " + name);
    assert.equal(typeof exported[name], "function");
    functions.add(name);
  }
  walk(acorn.parse(moduleSource, { ecmaVersion: "latest" }), node => {
    const names = { portalState: stateNames, portalConfig: configNames, portalActions: actionNames, portalContext: new Set(["elements"]) }[node.object?.name];
    if (node.type === "MemberExpression" && names) {
      assert.ok(names.has(node.property.name), symbol + " missing " + node.property.name);
    }
  });
}
assert.ok(functions.size > 700);
for (const file of fs.readdirSync("assets/portal/deferred").filter(name => name.endsWith(".js"))) {
  const text = fs.readFileSync("assets/portal/deferred/" + file, "utf8");
  const allowed = new Set("Array Blob Boolean CSS CustomEvent Date Error Event FileReader HTMLElement Intl JSON Map Math MutationObserver Number Object Option Promise Set String TextEncoder URL URLSearchParams Uint8Array atob clearTimeout console decodeURIComponent document encodeURIComponent fetch performance setTimeout undefined window".split(" "));
  for (const reference of references(acorn.parse(text, {ecmaVersion:"latest"}))) {
    assert.ok(allowed.has(reference.node.name), file + " unbound deferred dependency " + reference.node.name);
  }
}
const styles = fs.readFileSync("assets/livepalmes-admin-portal.css", "utf8");
const imports = [...styles.matchAll(/@import url\("([^"?]+)\?([^"?]+)"\);/g)];
assert.equal(imports.length, 16);
for (const match of imports) {
  assert.ok(fs.existsSync("assets/" + match[1]));
  assert.ok(html.includes('="assets/' + match[1] + '?' + match[2] + '"'), "Ordered stylesheet slot: " + match[1]);
}
const slots = [...html.matchAll(/data-portal-style="(\d+)"/g)].map(match => Number(match[1]));
assert.deepEqual(slots, Array.from({length:16}, (_, index) => index), "Lazy CSS keeps the original cascade order");
assert.equal((html.match(/data-portal-style="\d+" data-portal-style-src=/g) || []).length, 8, "Only home styles load initially");
console.log("Portal boundaries: actual factories, no eager state access, unique functions, explicit live dependencies and ordered style preloads passed.");
