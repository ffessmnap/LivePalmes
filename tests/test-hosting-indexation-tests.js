"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), os = require("node:os");
const {configuration, prepare} = require("../tools/prepare-test-hosting-config");
const root = path.resolve(__dirname, ".."), raw = fs.readFileSync(path.join(root, "firebase.json"));
const original = JSON.parse(raw), source = structuredClone(original);
const result = configuration(source, "livepalmes-test", root);
assert.deepEqual(source, original, "Generating TEST must preserve the complete source configuration");
assert.deepEqual(Object.keys(result), ["hosting"], "No backend, rules or index configuration is deployed");
assert.equal(result.hosting.site, "livepalmes-test");
assert.equal(result.hosting.target, undefined);
assert.equal(result.hosting.public, root);
const restored = structuredClone(result.hosting);
delete restored.site; restored.target = "app"; restored.public = ".";
const additions = restored.headers.splice(-2);
assert.deepEqual(restored, original.hosting, "Rewrites, exclusions, caches, CSP and routes remain exact");
assert.deepEqual(additions.map(r => r.source), ["**", "404.html"]);
for (const row of additions) assert.deepEqual(row.headers, [{key: "X-Robots-Tag", value: "noindex, nofollow"}]);
for (const project of ["livepalmes", "", undefined, "other"])
  assert.throws(() => configuration(source, project, root), /réservée/);
for (const mutate of [v => {v.hosting = [v.hosting];}, v => {v.hosting.public = "../outside";},
  v => {v.hosting.site = "livepalmes";}, v => {v.hosting.ignore = [];}]) {
  const wrong = structuredClone(original); mutate(wrong); assert.throws(() => configuration(wrong, "livepalmes-test", root));
}
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "hosting-indexation-"));
assert.equal(fs.realpathSync(temp), temp, "Cleanup stays in the directory created for this test");
try {
  fs.writeFileSync(path.join(temp, "firebase.json"), raw);
  assert.throws(() => prepare(temp, "livepalmes"));
  assert.equal(fs.existsSync(path.join(temp, "tmp")), false, "Wrong project creates no stage");
  const receipt = prepare(temp, "livepalmes-test");
  assert.equal(receipt.configuration, "tmp/firebase-test-hosting/firebase.json");
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(temp, receipt.configuration))), configuration(original, "livepalmes-test", temp));
  const {Config} = require("./firestore-rules/node_modules/firebase-tools/lib/config");
  const loaded = Config.load({cwd: temp, configPath: path.join(temp, receipt.configuration)});
  assert.equal(loaded.get("hosting.site"), "livepalmes-test", "The installed Firebase CLI resolves the explicit TEST site");
  assert.equal(loaded.get("hosting.public"), temp, "The installed Firebase CLI preserves the actual public root");
  assert(fs.readFileSync(path.join(temp, "firebase.json")).equals(raw));
  fs.rmSync(path.join(temp, "tmp"), {recursive: true});
  const outside = path.join(temp, "outside"); fs.mkdirSync(outside);
  fs.symlinkSync(outside, path.join(temp, "tmp"), process.platform === "win32" ? "junction" : "dir");
  assert.throws(() => prepare(temp, "livepalmes-test"), /redirigé/);
  assert.equal(fs.readdirSync(outside).length, 0, "A redirected stage is never written");
} finally {fs.rmSync(temp, {recursive: true, force: true});}
assert(fs.readFileSync(path.join(root, "firebase.json")).equals(raw));
const common = fs.readFileSync(path.join(root, ".github/workflows/livepalmes-test-common.yml"), "utf8");
const preview = fs.readFileSync(path.join(root, ".github/workflows/livepalmes-verification-preview.yml"), "utf8");
assert(common.includes("--config tmp/firebase-test-hosting/firebase.json"));
assert(common.includes("hosting:channel:list --project livepalmes-test --site livepalmes-test"));
assert(preview.includes("entryPoint: tmp/firebase-test-hosting"));
for (const workflow of [common, preview]) assert(workflow.includes("node tools/prepare-test-hosting-config.js --project livepalmes-test"));
console.log("TEST Hosting: explicit project, no PROD mutation, exact retained configuration, global/error noindex and redirected stages refused.");
