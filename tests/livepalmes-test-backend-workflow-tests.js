const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const workflowPath = path.join(__dirname, "..", ".github", "workflows", "livepalmes-test-backend.yml");
const workflow = fs.readFileSync(workflowPath, "utf8");

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

console.log("Workflow backend Firebase TEST : OK");
