"use strict";
// Reproduce the original TEST upload locally. Never invoke Firebase deploy.
const fs = require("node:fs"), path = require("node:path"), cp = require("node:child_process");
const APP = "1670b49db7528b33714a5d2441009f49516a1809";
function labelledWrapper(source) {
  return source + '\nfor (const fn of Object.values(exports)) { if (!fn.__endpoint) throw new Error("Endpoint absent"); fn.__endpoint.labels = { ...fn.__endpoint.labels, "livepalmes-commit": ' + JSON.stringify(APP) + ' }; }\n';
}
async function main(application) {
  const app = fs.realpathSync(application), root = path.resolve(process.env.RUNNER_TEMP, "a3-public-access-recovery");
  const git = args => cp.execFileSync("git", args, { cwd: app, encoding: "utf8" }).trim();
  if (process.env.TARGET_FIREBASE_PROJECT !== "livepalmes-test" || git(["rev-parse", "HEAD"]) !== APP || git(["status", "--porcelain"])) throw Error("Checkout applicatif A3.2 non conforme.");
  const stage = path.join(root, ".firebase-test-functions");
  fs.mkdirSync(root, { recursive: true });
  cp.execFileSync(process.execPath, [path.join(app, "tools/prepare-firebase-test-functions.js"), "email", stage], { cwd: app, env: process.env, stdio: "pipe" });
  const file = path.join(stage, "functions/index.js");
  const narrow = require(path.join(app, "tools/prepare-test-public-access-guards.js")).narrow;
  fs.writeFileSync(file, labelledWrapper(narrow(fs.readFileSync(file, "utf8"))));
  const { prepareFunctionsUpload } = require("../tests/firestore-rules/node_modules/firebase-tools/lib/deploy/functions/prepareFunctionsUpload");
  const result = await prepareFunctionsUpload(stage, path.join(stage, "functions"), {}, [], undefined);
  fs.copyFileSync(result.pathToSource, path.join(root, "expected.zip"));
  fs.unlinkSync(result.pathToSource);
  if (git(["status", "--porcelain"])) throw Error("Source applicative modifiee pendant preparation.");
  console.log("Archive TEST attendue reproduite depuis le candidat installe, sans publication.");
}
if (require.main === module) main(process.argv[2]).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { labelledWrapper };
