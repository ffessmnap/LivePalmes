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
    "livepalmes-basic-tests.js",
    "livepalmes-admin-auth-tests.js",
    "livepalmes-environment-tests.js",
    "livepalmes-result-regression-tests.js",
    "livepalmes-test-backend-workflow-tests.js",
    "livepalmes-public-results-index-tests.js",
    "livepalmes-publication-tests.js",
    "livepalmes-public-pdf-storage-tests.js",
    "engagement-competition-documents-tests.js",
    "engagement-program-phases-tests.js",
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
    "performance-import-publication-tests.js",
    "performance-import-replacement-tests.js",
    "performance-correction-publication-tests.js",
    "performance-firestore-delta-tests.js",
    "performance-public-consistency-tests.js",
    "performance-public-row-schema-tests.js",
    "livepalmes-portal-optimization-tests.js"
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
