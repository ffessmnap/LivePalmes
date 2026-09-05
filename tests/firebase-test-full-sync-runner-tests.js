"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const shellPath = path.join(root, "tools", "run-firebase-test-full-sync.sh");
const resumePath = path.join(root, "tools", "resume-firebase-test-full-sync.sh");
const runnerPath = path.join(root, "tools", "firebase-test-postsync-runner.js");
const patcherPath = path.join(root, "tools", "patch-firebase-test-large-club-rebuild.js");
const shell = fs.readFileSync(shellPath, "utf8");
const resume = fs.readFileSync(resumePath, "utf8");
const runner = fs.readFileSync(runnerPath, "utf8");
const patcher = fs.readFileSync(patcherPath, "utf8");

for (const scriptPath of [shellPath, resumePath]) {
  const bashCheck = spawnSync("bash", ["-n", scriptPath], { encoding: "utf8" });
  assert.equal(bashCheck.status, 0, bashCheck.stderr || bashCheck.stdout);
}
for (const scriptPath of [runnerPath, patcherPath]) {
  const nodeCheck = spawnSync(process.execPath, ["--check", scriptPath], { encoding: "utf8" });
  assert.equal(nodeCheck.status, 0, nodeCheck.stderr || nodeCheck.stdout);
}

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

assert.match(resume, /--project livepalmes-test/);
assert.match(resume, /--only functions:rebuildEngagementClubAggregates/);
assert.match(resume, /--config \.firebase-test-functions\/firebase\.json/);
assert.match(resume, /prepare-firebase-test-functions\.js engagement-core/);
assert.match(resume, /TARGET_FIREBASE_PROJECT=livepalmes-test/);
assert.match(resume, /patch-firebase-test-large-club-rebuild\.js/);
assert.match(resume, /run-firebase-test-full-sync\.sh/);
assert.doesNotMatch(resume, /--project livepalmes(?:\s|\\|$)/);
assert.doesNotMatch(resume, /sendMail|nodemailer|smtp|scheduler/i);

assert.match(patcher, /engagementLegacySwimmerLicensesByClub/);
assert.match(patcher, /\.limit\(10001\)/);
assert.match(patcher, /snapshot\.size > 10000/);
assert.match(patcher, /functions["']?,?\s*["']?index\.js|"functions", "index\.js"/);
assert.doesNotMatch(patcher, /livepalmes-test|livepalmes\.web\.app|sendMail|scheduler/i);

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
