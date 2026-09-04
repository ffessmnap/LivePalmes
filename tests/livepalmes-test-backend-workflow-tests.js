const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.join(__dirname, "..");
const workflowPath = path.join(rootDir, ".github", "workflows", "livepalmes-test-backend.yml");
const bootstrapPath = path.join(rootDir, "functions", "bootstrap-get-current-access-user.js");
const workflow = fs.readFileSync(workflowPath, "utf8");
const bootstrap = fs.readFileSync(bootstrapPath, "utf8");

assert.match(workflow, /^on:\n  workflow_dispatch:/m);
assert.doesNotMatch(workflow, /^  (push|pull_request|schedule):/m);
assert.match(workflow, /CONFIRMATION" != "livepalmes-test"/);
assert.match(workflow, /TARGET_FIREBASE_PROJECT: livepalmes-test/);
assert.match(workflow, /if: github\.ref == 'refs\/heads\/main'/);
assert.match(workflow, /FIREBASE_SERVICE_ACCOUNT_LIVEPALMES_TEST_BACKEND/);
assert.match(workflow, /credentials\.project_id !== expectedProject/);
assert.doesNotMatch(workflow, /FIREBASE_SERVICE_ACCOUNT_LIVEPALMES(?:[^_A-Z]|$)/);
assert.match(workflow, /uses: actions\/setup-java@v5\n        with:\n          distribution: temurin\n          java-version: '21'/);
assert.match(workflow, /npm --prefix tests\/firestore-rules test/);
assert.match(workflow, /node tools\/verify-livepalmes\.js/);
assert.match(workflow, /Preparer le bootstrap Functions TEST isole/);
assert.match(workflow, /cp functions\/bootstrap-get-current-access-user\.js \.firebase-bootstrap\/functions\/index\.js/);
assert.equal((workflow.match(/--config \.firebase-bootstrap\/firebase\.json/g) || []).length, 2);

const allowedTargets = ["firestore:indexes", "firestore:rules", "functions:getCurrentAccessUser"];
const deployTargets = [...workflow.matchAll(/--only ([^\s]+)\n/g)].map((match) => match[1]);
assert.equal(deployTargets.length, 6);
assert.deepEqual([...new Set(deployTargets)], allowedTargets);
allowedTargets.forEach((target) => {
  assert.equal(deployTargets.filter((candidate) => candidate === target).length, 2);
});
assert.equal((workflow.match(/--dry-run/g) || []).length, 3);
assert.equal(workflow.indexOf("npm --prefix tests/firestore-rules test") < workflow.indexOf("Dry-run des index"), true);
assert.equal(workflow.indexOf("Verifier le secret backend TEST") < workflow.indexOf("Dry-run des index"), true);
assert.equal(workflow.indexOf("Deployer les index Firestore TEST") < workflow.indexOf("Deployer les regles Firestore TEST"), true);
assert.equal(workflow.indexOf("Deployer les regles Firestore TEST") < workflow.indexOf("Deployer getCurrentAccessUser TEST"), true);
assert.doesNotMatch(workflow, /--only (?!firestore:indexes|firestore:rules|functions:getCurrentAccessUser)/);

assert.match(bootstrap, /exports\.getCurrentAccessUser = onCall/);
assert.match(bootstrap, /process\.env\.TARGET_FIREBASE_PROJECT/);
assert.match(bootstrap, /ENVIRONMENT\.name !== "test"/);
assert.match(bootstrap, /ENVIRONMENT\.projectId !== "livepalmes-test"/);
assert.match(bootstrap, /data\.status !== "active"/);
assert.match(bootstrap, /"admin\.full"/);
assert.doesNotMatch(bootstrap, /ENVIRONMENT\.isTest/);
assert.doesNotMatch(bootstrap, /defineSecret|onSchedule|nodemailer|LIVEPALMES_SMTP_/);

console.log("Workflow backend Firebase TEST : OK");
