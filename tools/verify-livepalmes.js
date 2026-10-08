const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const skippedDirs = new Set([".git", "node_modules", "archives", "sauvegardes", "sources"]);

function printStep(label) {
  console.log(`\n== ${label} ==`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: "pipe",
    ...options
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.status !== 0) {
    const fullCommand = [command, ...args].join(" ");
    throw new Error(`Commande en echec : ${fullCommand}`);
  }
}

function listJsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return skippedDirs.has(entry.name) ? [] : listJsFiles(fullPath);
    }
    return entry.isFile() && entry.name.endsWith(".js") ? [fullPath] : [];
  });
}

function checkSyntax() {
  printStep("Verification syntaxe JavaScript");
  const files = listJsFiles(rootDir);
  files.forEach((file) => {
    run(process.execPath, ["--check", file]);
  });
  console.log(`${files.length} fichiers JavaScript verifies.`);
}

function runUnitTests() {
  printStep("Tests automatiques");
  [
    "nap-mysql-tests.js",
    "nap-direct-query-checks-tests.js",
    "nap-direct-swimmer-tests.js",
    "nap-direct-search-tests.js",
    "nap-direct-tops-tests.js",
    "nap-source-inventory-tests.js",
    "nap-portal-contract-tests.js",
    "nap-approved-portal-schema-tests.js",
    "nap-approved-closure-schema-tests.js",
    "nap-approved-people-schema-tests.js",
    "nap-competition-documents-tests.js",
    "nap-competition-create-tests.js",
    "nap-engagement-contract-tests.js",
    "nap-portal-competitions-tests.js",
    "nap-portal-competition-change-tests.js",
    "nap-competition-scope-tests.js",
    "nap-qualification-rules-tests.js",
    "nap-qualification-plan-tests.js",
    "nap-qualification-evaluation-tests.js",
    "nap-qualification-grants-tests.js",
    "nap-qualification-jobs-tests.js",
    "nap-qualification-sources-tests.js",
    "nap-qualification-sources-callable-tests.js",
    "nap-qualification-pending-callable-tests.js",
    "nap-approved-qualification-schema-tests.js",
    "nap-course-removal-tests.js",
    "nap-team-leader-change-tests.js",
    "nap-team-leader-create-tests.js",
    "nap-team-leader-remove-tests.js",
    "nap-team-leader-remove-callable-tests.js",
    "nap-team-leader-remove-ui-tests.js",
    "nap-entry-participation-rules-tests.js",
    "nap-native-compare-tests.js",
    "nap-individual-entry-ui-tests.js",
    "nap-team-leader-contract-tests.js",
    "nap-team-leader-ui-tests.js",
    "nap-club-people-tests.js",
    "nap-club-person-status-tests.js",
    "nap-club-person-status-ui-tests.js",
    "nap-club-people-ui-tests.js",
    "nap-portal-competition-edit-ui-tests.js",
    "nap-program-validation-tests.js",
    "nap-course-document-contract-tests.js",
    "nap-paris-time-tests.js",
    "nap-portal-entries-tests.js",
    "nap-portal-workspaces-tests.js",
    "nap-portal-callables-tests.js",
    "nap-entry-recap-callable-tests.js",
    "nap-admin-entries-tests.js",
    "nap-admin-callables-tests.js",
    "club-recap-zip-tests.js",
    "nap-portal-cache-tests.js",
    "nap-portal-swimmer-change-tests.js",
    "nap-approved-swimmer-correction-tests.js",
    "nap-portal-swimmers-tests.js",
    "nap-swimmer-change-requests-tests.js",
    "nap-club-person-edit-tests.js",
    "nap-club-person-create-tests.js",
    "nap-club-person-edit-ui-tests.js",
    "nap-official-entry-plan-tests.js",
    "nap-swimmer-entry-plan-tests.js",
    "nap-swimmer-entry-change-tests.js",
    "nap-swimmer-entry-proof-tests.js",
    "nap-swimmer-selection-callable-tests.js",
    "nap-swimmer-selection-ui-tests.js",
    "nap-individual-entry-plan-tests.js",
    "nap-individual-entry-statements-tests.js",
    "nap-individual-entry-recovery-tests.js",
    "nap-entry-performance-history-tests.js",
    "nap-individual-entry-proof-tests.js",
    "nap-individual-entry-change-tests.js",
    "nap-entry-time-preview-tests.js",
    "nap-entry-time-rules-tests.js",
    "nap-entry-static-records-tests.js",
    "nap-entry-course-rules-tests.js",
    "nap-open-water-entry-tests.js",
    "nap-individual-entry-resolution-tests.js",
    "nap-entry-history-callable-tests.js",
    "nap-entry-time-preview-callable-tests.js",
    "nap-official-entry-statements-tests.js",
    "nap-official-entry-recovery-tests.js",
    "nap-official-entry-change-tests.js",
    "nap-official-entry-callable-tests.js",
    "nap-official-entry-ui-tests.js",
    "nap-official-entry-proof-tests.js",
    "nap-relay-entry-plan-tests.js",
    "nap-relay-entry-recovery-tests.js",
    "nap-relay-entry-change-tests.js",
    "nap-relay-composition-plan-tests.js",
    "nap-relay-composition-recovery-tests.js",
    "nap-relay-details-tests.js",
    "nap-relay-composition-statements-tests.js",
    "nap-relay-composition-change-tests.js",
    "nap-relay-resolution-tests.js",
    "nap-relay-callable-tests.js",
    "nap-relay-ui-tests.js",
    "nap-entry-person-access-ui-tests.js",
    "nap-calendar-contract-tests.js",
    "nap-direct-calendar-tests.js",
    "nap-approved-index-tests.js",
    "nap-public-export-tests.js",
    "nap-public-pipeline-tests.js",
    "nap-public-transition-tests.js",
    "livepalmes-basic-tests.js",
    "livepalmes-admin-auth-tests.js",
    "livepalmes-environment-tests.js",
    "livepalmes-legal-pages-tests.js",
    "livepalmes-result-regression-tests.js",
    "livepalmes-test-backend-workflow-tests.js",
    "firebase-test-access-bootstrap-tests.js",
    "firebase-test-data-sync-tests.js",
    "livepalmes-public-results-index-tests.js",
    "livepalmes-publication-tests.js",
    "livepalmes-public-pdf-storage-tests.js",
    "engagement-competition-documents-tests.js",
    "engagement-program-phases-tests.js",
    "engagement-qualification-tests.js",
    "engagement-qualification-import-tests.js",
    "engagement-qualification-service-tests.js",
    "engagement-performance-history-tests.js",
    "engagement-automatic-times-tests.js",
    "engagement-qualification-recovery-ui-tests.js",
    "engagement-qualification-exceptions-ui-tests.js",
    "engagement-relay-removal-tests.js",
    "public-calendar-tests.js",
    "livepalmes-public-records-data-tests.js",
    "livepalmes-public-records-store-tests.js",
    "livepalmes-console-access-tests.js",
    "livepalmes-portal-session-tests.js",
    "livepalmes-portal-access-protection-tests.js",
    "livepalmes-portal-access-mail-tests.js",
    "livepalmes-mail-html-tests.js",
    "engagement-swimmer-correction-tests.js",
    "engagement-swimmer-change-mail-tests.js",
    "livepalmes-officials-pdf-tests.js",
    "engagement-club-recap-pdf-tests.js",
    "performance-import-publication-tests.js",
    "performance-import-replacement-tests.js",
    "performance-correction-publication-tests.js",
    "performance-firestore-delta-tests.js",
    "performance-public-consistency-tests.js",
    "performance-top-pool-tests.js",
    "production-top-rebuild-tests.js",
    "performance-swimmer-progress-pool-tests.js",
    "performance-public-row-schema-tests.js",
    "livepalmes-portal-optimization-tests.js",
    "dtn-near-minima-tests.js",
    "dtn-season-engine-tests.js",
    "nap-dtn-source-tests.js",
    "nap-dtn-calculation-tests.js",
    "nap-approved-dtn-schema-tests.js",
    "nap-dtn-source-proof-tests.js",
    "nap-dtn-settings-migration-tests.js",
    "nap-dtn-source-stamp-tests.js",
    "nap-dtn-source-associations-tests.js",
    "nap-dtn-season-service-tests.js",
    "nap-dtn-service-proof-tests.js",
    "nap-dtn-callable-tests.js",
    "nap-dtn-client-tests.js",
    "dtn-season-service-tests.js"
  ].forEach((fileName) => {
    run(process.execPath, [path.join(rootDir, "tests", fileName)]);
  });
}

function runTextChecks() {
  printStep("Controle textes visibles");
  run(process.execPath, [path.join(rootDir, "tools", "check-livepalmes-text.js")]);
}

function runArchitectureChecks() {
  printStep("Controle architecture");
  run(process.execPath, [path.join(rootDir, "tools", "check-livepalmes-architecture.js")]);
}

function runGeneratedPageChecks() {
  printStep("Controle pages consoles");
  run(process.execPath, [path.join(rootDir, "tools", "build-console-pages.js"), "--check"]);
  run(process.execPath, [path.join(rootDir, "tools", "build-admin-club-reference.js"), "--check"]);
}

function runConsolePageLoadChecks() {
  printStep("Controle chargement pages consoles");
  run(process.execPath, [path.join(rootDir, "tools", "check-console-page-loads.js")]);
}

function runBrowserSmokeIfRequested() {
  const requested = process.argv.includes("--browser") || process.env.LIVEPALMES_BROWSER_SMOKE === "1";
  if (!requested) return;
  printStep("Smoke test navigateur");
  run(process.execPath, [path.join(rootDir, "tools", "livepalmes-browser-smoke.js")]);
}

function runDiffCheck() {
  printStep("Controle espaces Git");
  const gitCommand = findGitCommand();

  if (!gitCommand) {
    console.log("Git non disponible dans ce terminal : controle ignore.");
    return;
  }

  const result = spawnSync(gitCommand, ["diff", "--check"], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: "pipe"
  });

  if (result.error) {
    console.log("Git non disponible dans ce terminal : controle ignore.");
    return;
  }

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.status !== 0) {
    throw new Error("Git a detecte des espaces ou lignes problematiques.");
  }

  console.log("Aucun probleme d'espace detecte.");
}

function findGitCommand() {
  const candidates = [
    process.env.GIT_BIN,
    "git",
    process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, "GitHubDesktop", "app-3.5.8", "resources", "app", "git", "cmd", "git.exe")
      : "",
    process.env.USERPROFILE
      ? path.join(process.env.USERPROFILE, "AppData", "Local", "GitHubDesktop", "app-3.5.8", "resources", "app", "git", "cmd", "git.exe")
      : ""
  ].filter(Boolean);

  return candidates.find((candidate) => {
    const result = spawnSync(candidate, ["--version"], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: "pipe"
    });
    return !result.error && result.status === 0;
  });
}

try {
  checkSyntax();
  run(process.execPath, [path.join(rootDir, "tools", "check-firebase-test-backend-lots.js")]);
  runUnitTests();
  runTextChecks();
  runArchitectureChecks();
  runGeneratedPageChecks();
  runConsolePageLoadChecks();
  runBrowserSmokeIfRequested();
  runDiffCheck();
  console.log("\nVerification LivePalmes OK.");
} catch (error) {
  console.error(`\nVerification LivePalmes KO : ${error.message}`);
  process.exit(1);
}
