"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const test = require("../tools/release-test-function-fingerprints");
const production = require("../tools/release-production-function-fingerprints");

// Exercise the real source graph, without loading application code or Firebase.
const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const input = test.snapshot(process.cwd(), sha, { production: true });
const isolated = ["functions/server-directory-sync-service.js", "functions/server-account-write-service.js",
  "functions/portal-account-handlers.js"];
const file = source => ({ source, sha: crypto.createHash("sha256").update(source).digest("hex") });
input.source = fs.readFileSync("functions/index.js", "utf8");
for (const name of new Set([...Object.keys(input.files), ...isolated])) {
  const original = input.files[name];
  // Preserve JSON hashes; their source is intentionally absent from snapshots.
  if (name.endsWith(".js")) input.files[name] = file(fs.readFileSync(name, "utf8"));
  else input.files[name] = original;
}
for (const [label, analyser] of [["TEST", test], ["PROD", production]]) {
  const base = analyser.analyse(input);
  assert.equal(base.mode, "dependency-closure");
  assert.equal(base.registryKnown, true);
  const affected = next => Object.keys(base.functions).filter(name => base.functions[name] !== next.functions[name]).sort();
  for (const name of isolated) {
    const source = input.files[name].source.replace(/function (\w+)/, "function $1 /* changed dependency */");
    assert.notEqual(source, input.files[name].source);
    const next = analyser.analyse({ ...input, files: { ...input.files, [name]: file(source) } });
    const expected = name.includes("directory-sync") ? ["syncEngagementMailRecipientIndex"]
      : name.includes("account-write") ? ["createOrUpdateAccessUser", "resolveEngagementAccessRequest"]
        : ["createOrUpdateAccessUser"];
    assert.deepEqual(affected(next), expected, `${label}: ${name}`);
    console.log(`${label} ${name}: ${expected.join(", ")}`);
  }
  // A real shared authorization dependency must still include its consumers.
  const shared = "functions/server-access-service.js";
  const next = analyser.analyse({ ...input, files: { ...input.files,
    [shared]: file(input.files[shared].source + "\n// shared dependency changed\n") } });
  for (const name of ["setRolePins", "getCurrentAccessUser", "createOrUpdateAccessUser", "syncEngagementMailRecipientIndex"])
    assert(affected(next).includes(name), `${label}: shared authorization missed ${name}`);
  // Unknown dynamic execution retains the existing whole-backend fallback.
  const unknown = analyser.analyse({ ...input, source: input.source + '\neval("0");\n' });
  assert.equal(unknown.mode, "whole-backend");
  assert.equal(affected(unknown).length, Object.keys(base.functions).length);
}
console.log("Backend dependency isolation: exact consumers, shared dependencies and conservative fallback passed.");
