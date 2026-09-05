"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const shellPath = path.join(root, "tools", "run-firebase-test-full-sync.sh");
const resumePath = path.join(root, "tools", "resume-firebase-test-full-sync.sh");
const resilientPath = path.join(root, "tools", "run-firebase-test-postsync-resilient.sh");
const runnerPath = path.join(root, "tools", "firebase-test-postsync-runner.js");
const patcherPath = path.join(root, "tools", "patch-firebase-test-large-club-rebuild.js");
const workflowPath = path.join(root, ".github", "workflows", "livepalmes-test-postsync.yml");
const shell = fs.readFileSync(shellPath, "utf8");
const resume = fs.readFileSync(resumePath, "utf8");
const resilient = fs.readFileSync(resilientPath, "utf8");
const runner = fs.readFileSync(runnerPath, "utf8");
const patcher = fs.readFileSync(patcherPath, "utf8");
const workflow = fs.readFileSync(workflowPath, "utf8");

for (const scriptPath of [shellPath, resumePath, resilientPath]) {
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

assert.match(resilient, /firebase-test-postsync-runner\.js/);
assert.match(resilient, /STALL_SECONDS/);
assert.match(resilient, /redémarrage automatique du runner/);
assert.doesNotMatch(resilient, /livepalmes\.web\.app|sendMail|nodemailer|smtp|scheduler/i);

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
assert.match(runner, /LIVEPALMES_POSTSYNC_REMOTE_RESUME/);
assert.match(runner, /performanceSwimmerIndexState/);
assert.match(runner, /performanceTopIndexState/);
assert.match(runner, /Reprise Firestore TEST détectée/);
assert.match(runner, /remoteResumeBaselineStartedAt/);
assert.match(runner, /first \? \{ reset: true \}/);
assert.match(runner, /LIVEPALMES_POSTSYNC_SKIP_INITIAL_PHASES/);
assert.doesNotMatch(runner, /projectId:\s*["']livepalmes["']/);
assert.doesNotMatch(runner, /sendMail|nodemailer|smtp/i);

assert.match(workflow, /workflow_dispatch:/);
assert.match(workflow, /resume-livepalmes-test-postsync/);
assert.match(workflow, /environment:\s*\n\s+name: firebase-test/);
assert.match(workflow, /deployment: false/);
assert.match(workflow, /FIREBASE_SERVICE_ACCOUNT_LIVEPALMES_TEST_BACKEND/);
assert.match(workflow, /LIVEPALMES_POSTSYNC_REMOTE_RESUME: 'true'/);
assert.match(workflow, /LIVEPALMES_POSTSYNC_SKIP_INITIAL_PHASES: 'true'/);
assert.match(workflow, /node tools\/firebase-test-postsync-runner\.js/);
assert.match(workflow, /project_id !== "livepalmes-test"/);
assert.doesNotMatch(workflow, /FIREBASE_SERVICE_ACCOUNT_LIVEPALMES(?:[^_A-Z]|$)/);
assert.doesNotMatch(workflow, /--project\s+livepalmes(?:\s|$)/);
assert.doesNotMatch(workflow, /sendMail|nodemailer|smtp|scheduler/i);

console.log("Runner complet de synchronisation Firebase TEST : OK");
