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
    "livepalmes-result-regression-tests.js"
  ].forEach((fileName) => {
    run(process.execPath, [path.join(rootDir, "tests", fileName)]);
  });
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
  runBrowserSmokeIfRequested();
  runDiffCheck();
  console.log("\nVerification LivePalmes OK.");
} catch (error) {
  console.error(`\nVerification LivePalmes KO : ${error.message}`);
  process.exit(1);
}
