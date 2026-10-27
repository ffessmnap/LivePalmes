"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const test = require("../tools/release-test-function-fingerprints");
const legacy = require("../tools/release-function-fingerprints");
const root = path.resolve(__dirname, "..");
const metadata = fs.readFileSync(path.join(root, "tools/firebase-test-backend-lots.js"), "utf8");
const environment = fs.readFileSync(path.join(root, "functions/livepalmes-environment.js"), "utf8");
const changed = (a, b) => Object.keys(b.functions).filter(n => a.functions[n] !== b.functions[n]).sort();
const source = `const {onCall}=require("firebase-functions/v2/https");
exports.getCurrentAccessUser=onCall({},()=>1); exports.other=onCall({},()=>2);`;
function print(code = source, registry = metadata, files = {}, common = ["fixture"]) {
  return test.analyse({ source: code, registry: test.registry(registry), files, common });
}

assert.equal(test.registry(metadata).known, true);
assert.equal(test.registry(metadata, "unknown-builder").known, false);
const unknown = test.registry(metadata, "unknown-builder");
const untrustedPrint = source => test.analyse({ source, common: ["same"], files: {}, registry: unknown });
assert.equal(untrustedPrint(source).mode, "whole-backend");
assert.deepEqual(changed(untrustedPrint(source), untrustedPrint(source.replace('()=>1', '()=>3'))), ["getCurrentAccessUser", "other"]);
const before = print();
const moved = metadata.replace('"getCurrentAccessUser", ', '').replace('email: [', 'email: ["getCurrentAccessUser",')
  .replace('const TEST_NON_MAIL_FUNCTIONS = Object.freeze([', 'const TEST_NON_MAIL_FUNCTIONS = Object.freeze(["getCurrentAccessUser",');
assert.equal(test.registry(moved).known, true);
assert.deepEqual(changed(before, print(source, moved)), [], "Moving a handler between lots keeps the identical TEST runtime");
const added = metadata.replace('access: [', 'access: ["other",');
assert.deepEqual(changed(before, print(source, added)), ["other"], "Newly exported TEST handler alone changes");
const removed = metadata.replace('"getCurrentAccessUser", ', '');
assert.deepEqual(changed(before, print(source, removed)), ["getCurrentAccessUser"]);
for (const text of [
  metadata.replace('secrets: [],', 'secrets: ["NEW_SECRET"],'),
  metadata.replace('roles/datastore.user', 'roles/owner'),
  metadata.replace('return LOTS[lot].filter', 'return LOTS.other.filter'),
  metadata.replace('const ALL_SAFE_LOTS = Object.freeze([', 'const ALL_SAFE_LOTS = Object.freeze(["email",'),
  metadata.replace('const PROJECT_ID = "livepalmes-test"', 'const PROJECT_ID = "other"'),
  metadata.replace('"getCurrentAccessUser",', 'dynamicName,'),
  metadata + '\nconsume(LOTS);',
  metadata + '\nconst Object={freeze:value=>value};'
]) assert.deepEqual(changed(before, print(source, text)), ["getCurrentAccessUser", "other"], "Bindings, permissions and unknown code stay broad");
assert.deepEqual(changed(before, print(source, metadata, {}, ["new preparer"])), ["getCurrentAccessUser", "other"]);

const owner = `const {onCall}=require("firebase-functions/v2/https"); const {run}=require("./clock");
exports.getCurrentAccessUser=onCall({},()=>run()); exports.other=onCall({},()=>42);`;
const clockModule = value => ({ "functions/clock.js": { source: `const HORIZON=${value}; function run(){return HORIZON;} module.exports={run};` } });
assert.deepEqual(changed(print(owner, metadata, clockModule('28*24*60*60*1000')), print(owner, metadata, clockModule('27*24*60*60*1000'))), ["getCurrentAccessUser"]);
for (const value of ['"x"+"y"', '1n+2n', 'Number(3)', 'object.value*3', 'new Number(3)']) {
  const a = print(owner, metadata, clockModule(value));
  const b = print(owner, metadata, clockModule(value+' '));
  assert.deepEqual(changed(a, b), ["getCurrentAccessUser", "other"], "Unknown initialization stays shared: " + value);
}

const scheduler = value => `const {onCall}=require("firebase-functions/v2/https");
const {onSchedule}=require("firebase-functions/v2/scheduler");
const {livePalmesEnvironment}=require("./livepalmes-environment"); const ENVIRONMENT=livePalmesEnvironment();
const CONFIG={region:"europe-west1",schedule:${value},timeoutSeconds:300};
exports.closeDueEngagementCompetitions=onSchedule(CONFIG,()=>true); exports.other=onCall({},()=>42);`;
const files = { "functions/livepalmes-environment.js": { source: environment } };
const a = scheduler('"*/5 * * * *"'), b = scheduler('ENVIRONMENT.sportingDataSource === "nap" ? "0 * * * *" : "*/5 * * * *"');
assert.deepEqual(changed(print(a, metadata, files), print(b, metadata, files)), ["closeDueEngagementCompetitions"]);
for (const suffix of ['consume(CONFIG);', 'Object.defineProperty(ENVIRONMENT,"sportingDataSource",{get(){return "nap"}});', 'function mutate(){ENVIRONMENT.sportingDataSource="other";}', 'consume(ENVIRONMENT);', 'function shadow(ENVIRONMENT){}', 'eval("CONFIG");']) {
  assert.deepEqual(changed(print(a+suffix, metadata, files), print(b+suffix, metadata, files)), ["closeDueEngagementCompetitions", "other"], "Escapes/dynamic execution remain broad: "+suffix);
}
const unknownFactory = { "functions/livepalmes-environment.js": { source: environment.replace('return { ...config,', 'return { get sportingDataSource(){return config.sportingDataSource;}, ...config,') } };
assert.deepEqual(changed(print(b, metadata, unknownFactory), print(b.replace('"0 * * * *"','"1 * * * *"'), metadata, unknownFactory)), ["closeDueEngagementCompetitions", "other"]);
for (const property of ['get schedule(){return "A";}', 'schedule:build("A")', '[key]:"A",schedule:"A"', '...object,schedule:"A"', '__proto__:{get inherited(){return "A";}},schedule:"A"', 'schedule:build("A"),schedule:"A"']) {
  const x = a.replace('schedule:"*/5 * * * *"', property);
  const y = x.replaceAll('"A"', '"B"');
  assert.deepEqual(changed(print(x, metadata, files), print(y, metadata, files)), ["closeDueEngagementCompetitions", "other"], "Non-data options stay broad: "+property);
}

// Actual problematic releases. Evaluate static Git sources only; never load the
// handlers, Firebase SDK, SQL or SMTP. Legacy PROD hashes were captured before
// this TEST change and must remain byte-for-byte equivalent.
const shas = ["29a22c331b159df3ffa91df615d1602463c7f103", "25ac3bb694832e30b38291ba11f7336dd168853b",
  "af818728dd1b6929574de2cbd20c08835ae458d1", "3ddc0a3c4a05d6737f97d07673ccc2512d062f1a",
  "8a29dc08964e25309ca6f187828f0a8310c5c8c7", "3912febcabc8e089be4d6bbbc020d6b7699ced54"];
const snapshots = shas.map(sha => test.fromGit(root, sha));
const targets = [5, 5, 12, 1, 0];
for (let i = 1; i < snapshots.length; i++) {
  assert.equal(snapshots[i].registryKnown, true);
  const names = new Set(snapshots[i].eligibleNames);
  const selected = changed(snapshots[i-1], snapshots[i]).filter(n => names.has(n));
  assert.equal(selected.length, targets[i-1], shas[i]);
  for (const name of ['getCurrentAccessUser', 'verifyPin', 'getNationalFeaturedDocuments'])
    assert.equal(snapshots[i-1].functions[name], snapshots[i].functions[name], "Unrelated handler: "+name);
  console.log(`${shas[i-1].slice(0,8)} -> ${shas[i].slice(0,8)} : ${selected.length} fonctions TEST : ${selected.join(', ') || 'aucune'}`);
}
const pinned = {
  "25ac3bb694832e30b38291ba11f7336dd168853b": "e893d6b207e147f17b2ae6466d03b2a405b2dff9ae1a66743eb5eea93a26960e",
  "af818728dd1b6929574de2cbd20c08835ae458d1": "f8f42adb36a2ef7b7c1af60e6a2ccd1bed53b866fcb8233ed667fa51e9d34d84"
};
for (const [sha, expected] of Object.entries(pinned)) {
  assert.equal(crypto.createHash("sha256").update(JSON.stringify(legacy.fromGit(root, sha).functions)).digest("hex"), expected, "Legacy PROD fingerprints changed");
}
console.log("Selection TEST : cas reels, liaisons, constantes, options, effets inconnus et empreintes PROD preserves hors reseau.");
