"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const shellPath = path.join(root, "tools", "run-firebase-test-full-sync.sh");
const runnerPath = path.join(root, "tools", "firebase-test-postsync-runner.js");
const shell = fs.readFileSync(shellPath, "utf8");
const runner = fs.readFileSync(runnerPath, "utf8");

const bashCheck = spawnSync("bash", ["-n", shellPath], { encoding: "utf8" });
assert.equal(bashCheck.status, 0, bashCheck.stderr || bashCheck.stdout);
const nodeCheck = spawnSync(process.execPath, ["--check", runnerPath], { encoding: "utf8" });
assert.equal(nodeCheck.status, 0, nodeCheck.stderr || nodeCheck.stdout);

assert.match(shell, /PROD_PROJECT="livepalmes"/);
assert.match(shell, /TEST_PROJECT="livepalmes-test"/);
assert.match(shell, /roles\/datastore\.viewer/);
assert.match(shell, /roles\/storage\.objectViewer/);
assert.match(shell, /--apply/);
assert.match(shell, /copy-livepalmes-readonly-to-livepalmes-test/);
assert.match(shell, /email-and-schedulers-disabled-in-livepalmes-test/);
assert.match(shell, /verify-firebase-test-data-sync\.js/);
assert.match(shell, /firebase-test-postsync-runner\.js/);
assert.match(shell, /service-accounts delete/);
assert.match(shell, /trap on_error ERR/);
assert.doesNotMatch(shell, /firebase deploy/);
assert.doesNotMatch(shell, /gcloud firestore.*delete/i);
assert.doesNotMatch(shell, /gcloud storage rm/i);

assert.match(runner, /PROJECT = "livepalmes-test"/);
assert.doesNotMatch(runner, /projectId:\s*"livepalmes"/);
assert.match(runner, /rebuildPerformanceSwimmerIndexNextPage/);
assert.match(runner, /rebuildPerformanceTopIndexNextPage/);
assert.match(runner, /rebuildEngagementCompetitionCalendars/);
assert.match(runner, /refreshDtnQualificationCache/);
assert.match(runner, /refreshDtnListingCache/);
assert.match(runner, /publishPerformancePublicData/);
assert.match(runner, /"allDone": true|state\.allDone = true/);
assert.doesNotMatch(runner, /sendMail|nodemailer|smtp/i);

console.log("Runner complet de synchronisation Firebase TEST : OK");
