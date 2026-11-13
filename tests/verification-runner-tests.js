"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const { execFileSync } = require("node:child_process");
const { inventory, runSuite } = require("../tools/run-verification-tests");
const { sourceJsFiles } = require("../tools/check-javascript-syntax");
const root = path.resolve(__dirname, ".."), original = inventory(root);
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "livepalmes-verification-"));
const summaryFile = process.env.GITHUB_STEP_SUMMARY;
const originalLog = console.log;
delete process.env.GITHUB_STEP_SUMMARY;
try {
  const write = (name, value) => { const file = path.join(directory, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, value); };
  const git = (...args) => execFileSync("git", args, { cwd: directory, stdio: "pipe" });
  git("init", "-q");
  write(".gitignore", "tmp/\n"); write("source.js", "const source = true;");
  git("add", ".");
  write("new-source.js", "const added = true;"); write("tmp/ignored.js", "invalid JavaScript");
  write("tests/browser/node_modules/ignored.js", "invalid JavaScript");
  const files = sourceJsFiles(directory).map(file => path.relative(directory, file)).sort();
  assert.deepEqual(files, ["new-source.js", "source.js"]);
  fs.unlinkSync(path.join(directory, "source.js"));
  assert.deepEqual(sourceJsFiles(directory).map(file => path.basename(file)), ["new-source.js"]);
  const value = { schema: 1, ...Object.fromEntries(Object.keys(original).filter(k => k !== "schema").map(k => [k, []])) };
  value.application = ["tests/example-tests.js"]; write("tests/example-tests.js", "");
  const save = v => write("tools/verification-tests.json", JSON.stringify(v));
  save(value); assert.equal(inventory(directory).application.length, 1);
  let calls = 0;
  console.log = () => {}; // Expected failures of the fixture are not CI failures.
  runSuite("application", { root: directory, execute(command, args, options) {
    calls++; assert.equal(args.length, 1); assert(options.env.NODE_OPTIONS.includes("offline-network.js"));
    return { status: 0 };
  }});
  assert.equal(calls, 1);
  assert.throws(() => runSuite("application", { root: directory, execute: () => ({ status: 1 }) }), /example-tests.js/);
  assert.throws(() => runSuite("standalone", { root: directory }), /inconnue/);
  console.log = originalLog;
  save({ ...value, application: ["../source.js"] }); assert.throws(() => inventory(directory), /Chemin/);
  save({ ...value, application: [...value.application, ...value.application] }); assert.throws(() => inventory(directory), /invalide/);
  save({ ...value, publication: [...value.application] }); assert.throws(() => inventory(directory), /deux fois/);
  save(value); write("tests/forgotten-tests.py", ""); assert.throws(() => inventory(directory), /sans parcours/);
  console.log("Decouverte des tests : aucun oubli, doublon, chemin externe ou echec masque ; syntaxe limitee aux sources Git et nouveaux fichiers non ignores.");
} finally {
  console.log = originalLog;
  if (summaryFile) process.env.GITHUB_STEP_SUMMARY = summaryFile;
  assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
  fs.rmSync(directory, { recursive: true, force: true });
}
