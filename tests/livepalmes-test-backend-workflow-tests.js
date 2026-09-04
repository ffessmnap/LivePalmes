const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { ALL_SAFE_LOTS, LOTS, METADATA, PUBLICATION_EFFECT_FUNCTIONS } = require("../tools/firebase-test-backend-lots");

const rootDir = path.join(__dirname, "..");
const workflow = fs.readFileSync(path.join(rootDir, ".github", "workflows", "livepalmes-test-backend.yml"), "utf8");
const bootstrap = fs.readFileSync(path.join(rootDir, "functions", "bootstrap-get-current-access-user.js"), "utf8");
const staging = fs.readFileSync(path.join(rootDir, "tools", "prepare-firebase-test-functions.js"), "utf8");

assert.match(workflow, /^on:\n  workflow_dispatch:/m);
assert.doesNotMatch(workflow, /^  (push|pull_request|schedule):/m);
assert.match(workflow, /if: github\.ref == 'refs\/heads\/main'/);
assert.match(workflow, /test "\$CONFIRMATION" = "livepalmes-test"/);
assert.match(workflow, /test "\$EXPECTED_COMMIT" = "\$GITHUB_SHA"/);
assert.match(workflow, /test "\$\(git rev-parse HEAD\)" = "\$EXPECTED_COMMIT"/);
assert.match(workflow, /credentials\.project_id !== "livepalmes-test"/);
assert.doesNotMatch(workflow, /--project ["']?livepalmes(?:["'\s]|$)/);
assert.doesNotMatch(workflow, /FIREBASE_SERVICE_ACCOUNT_LIVEPALMES(?:[^_A-Z]|$)/);

for (const lot of ["bootstrap", ...Object.keys(LOTS), "all-safe"]) {
  assert.match(workflow, new RegExp(`          - ${lot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
}
assert.match(workflow, /livepalmes-test-schedulers-empty/);
assert.match(workflow, /Files TEST non vides : activation des schedulers refusée/);
assert.match(workflow, /gcloud secrets describe "\$secret" --project=livepalmes-test/);
assert.doesNotMatch(workflow, /functions:secrets:access|secrets versions access/);

const testsPosition = workflow.indexOf("Vérifier LivePalmes et la classification des Functions");
const firstDeployPosition = workflow.indexOf("Déployer les index puis règles Firestore TEST");
assert.ok(testsPosition > 0 && testsPosition < firstDeployPosition);
assert.match(workflow, /--dry-run --non-interactive/g);
assert.match(workflow, /prepare-firebase-test-functions\.js "\$SELECTED_LOT"/);

assert.deepEqual(ALL_SAFE_LOTS, ["access", "engagement-core", "performance", "publications"]);
assert.ok(!ALL_SAFE_LOTS.includes("email"));
assert.ok(!ALL_SAFE_LOTS.includes("schedulers"));
assert.deepEqual(METADATA.access.secrets, []);
assert.deepEqual(METADATA["engagement-core"].secrets, []);
assert.deepEqual(METADATA.performance.secrets, []);
assert.equal(METADATA.email.secrets.length, 7);
for (const lot of ["access", "engagement-core", "performance"]) {
  assert.ok(!LOTS[lot].some((name) => PUBLICATION_EFFECT_FUNCTIONS.includes(name)));
}

assert.match(staging, /relative !== "index\.js"/);
assert.match(staging, /usesEmailSecrets/);
assert.match(staging, /const defineSecret = \(name\) => name/);
assert.match(staging, /exports\[name\] = backend\[name\]/);
assert.match(staging, /environment\.name !== "test"/);
assert.match(staging, /environment\.projectId !==/);

assert.match(bootstrap, /exports\.getCurrentAccessUser = onCall/);
assert.match(bootstrap, /ENVIRONMENT\.name !== "test"/);
assert.match(bootstrap, /ENVIRONMENT\.projectId !== "livepalmes-test"/);
assert.doesNotMatch(bootstrap, /defineSecret|onSchedule|nodemailer|LIVEPALMES_SMTP_/);

const stagedRoot = path.join(rootDir, ".firebase-test-functions");
const manifestPath = path.join(stagedRoot, "access-manifest.json");
try {
  childProcess.execFileSync(process.execPath, [path.join(rootDir, "tools", "prepare-firebase-test-functions.js"), "access"], {
    cwd: rootDir,
    env: { ...process.env, TARGET_FIREBASE_PROJECT: "livepalmes-test" },
    stdio: "pipe"
  });
  childProcess.execFileSync(path.join(rootDir, "functions", "node_modules", ".bin", "firebase-functions"), [], {
    cwd: path.join(stagedRoot, "functions"),
    env: {
      ...process.env,
      FUNCTIONS_MANIFEST_OUTPUT_PATH: manifestPath,
      GCLOUD_PROJECT: "livepalmes-test",
      GOOGLE_CLOUD_PROJECT: "livepalmes-test",
      NODE_PATH: path.join(rootDir, "functions", "node_modules")
    },
    stdio: "pipe"
  });
  const manifest = fs.readFileSync(manifestPath, "utf8");
  assert.deepEqual(Object.keys(JSON.parse(manifest).endpoints).sort(), [...LOTS.access].sort());
  for (const secret of METADATA.email.secrets) {
    assert.doesNotMatch(manifest, new RegExp(secret), `Le manifeste access expose encore ${secret}.`);
  }
} finally {
  fs.rmSync(stagedRoot, { recursive: true, force: true });
}

console.log("Workflow backend Firebase TEST par lots : OK");
