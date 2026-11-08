"use strict";
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const path = require("node:path");
const proof = require("../tools/verify-november-retained-scope");
const hash = source => crypto.createHash("sha256").update(source).digest("hex");
function snapshot(extra = "") {
  const source = `const control = require("./control");
    const sdk = { onCall: fn => fn }, onCall = sdk.onCall;
    function preference(request) { return require("./preference").value(request); }
    exports.disableCompetitionEmailNotifications = onCall(request => preference(request));
    exports.updateCurrentEmailNotificationPreferences = onCall(request => preference(request)); ${extra}`;
  const files = {
    "functions/control.js": "function audience(value) { return value; } module.exports = { audience };",
    "functions/preference.js": "function value(input) { return input; } module.exports = { value };"
  };
  return { source, files: Object.fromEntries(Object.entries(files).map(([name, source]) => [name, { source, sha: hash(source) }])),
    common: ["100644 blob fixed\tfunctions/package.json", "100644 blob fixed\tfunctions/package-lock.json"] };
}
function edit(input, file, source) { input.files[file] = { source, sha: hash(source) }; return input; }
const before = snapshot();
proof.compare(before, snapshot());
// Declarative initialization of an unused import may change its function body.
proof.compare(before, edit(snapshot(), "functions/control.js", "function audience(value) { return !value; } module.exports = { audience };"));
assert.throws(() => proof.compare(before, edit(snapshot(), "functions/preference.js", "module.exports = { value: () => false };")), /Reachable/);
assert.throws(() => proof.compare(before, edit(snapshot(), "functions/control.js", "globalThis.effect = true; module.exports = {};")), /Reachable/);
const changedHandler = snapshot(); changedHandler.source = changedHandler.source.replace("return require", "return !require");
assert.throws(() => proof.compare(before, changedHandler), /Preference dependency/);
assert.throws(() => proof.compare(before, snapshot("throw new Error('startup');")), /initialization/);
// A module used during common initialization must match, even if its own
// initialization is declarative and its exported function is not a handler.
const used = snapshot("const initialized = control.audience(true);");
const usedAfter = edit(snapshot("const initialized = control.audience(true);"), "functions/control.js", "function audience(value) { return !value; } module.exports = { audience };");
assert.throws(() => proof.compare(used, usedAfter), /Reachable/);
const local = snapshot("function start() { return true; } const initialized = start();");
const localAfter = snapshot("function start() { return false; } const initialized = start();");
assert.throws(() => proof.compare(local, localAfter), /Preference dependency/);
assert.throws(() => proof.verify(path.resolve(__dirname, ".."), "f".repeat(40)), /Assertion/);
const actual = proof.verify(path.resolve(__dirname, ".."));
assert.deepEqual(actual.passedFunctions, proof.NAMES);
assert.equal(actual.networkCalls, 0);
assert.ok(actual.definitionsChecked >= 90 && actual.modulesChecked.length >= 20);
console.log(JSON.stringify({ result: "success", cases: 10, actual }));
