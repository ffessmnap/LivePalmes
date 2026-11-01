"use strict";
// Diagnostic source mutations only. Output is never a deployment allowlist.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const test = require("./release-test-function-fingerprints");
const production = require("./release-production-function-fingerprints");
const hashFile = source => ({ source, sha: crypto.createHash("sha256").update(source).digest("hex") });

function workingSnapshot(root) {
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  const input = test.snapshot(root, sha, { production: true });
  function collect(directory) {
    for (const entry of fs.readdirSync(path.join(root, directory), { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === "AGENTS.md") continue;
      const file = directory + "/" + entry.name;
      if (entry.isDirectory()) collect(file);
      else if (entry.isFile() && file.endsWith(".js") && file !== "functions/index.js")
        input.files[file] = hashFile(fs.readFileSync(path.join(root, file), "utf8"));
    }
  }
  collect("functions"); input.source = fs.readFileSync(path.join(root, "functions/index.js"), "utf8");
  return input;
}
function probe(input, targets) {
  const results = [];
  for (const [environment, analyser] of [["TEST", test], ["PROD", production]]) {
    const before = analyser.analyse(input);
    for (const file of targets) {
      if (!input.files[file]?.source) throw Error("Known JavaScript source required: " + file);
      const source = input.files[file].source + "\n// read-only dependency probe\n";
      const after = analyser.analyse({ ...input, files: { ...input.files, [file]: hashFile(source) } });
      const all = Object.keys(before.functions).filter(name => before.functions[name] !== after.functions[name]).sort();
      results.push({ environment, file, mode: before.mode, allConsumers: all,
        ordinaryConsumers: all.filter(name => before.eligibleNames.includes(name)) });
    }
  }
  return { schema: 1, diagnosticOnly: true, notDeploymentSelection: true, networkCalls: 0, results };
}
module.exports = { workingSnapshot, probe };
if (require.main === module) {
  const root = path.resolve(__dirname, ".."), targets = process.argv.slice(2);
  if (!targets.length) throw Error("Provide explicit source files to probe");
  console.log(JSON.stringify(probe(workingSnapshot(root), targets), null, 2));
}
