const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");

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

function checkSyntax() {
  printStep("Verification syntaxe JavaScript");
  run(process.execPath, [path.join(rootDir, "tools", "check-javascript-syntax.js")]);
}

function runUnitTests() {
  printStep("Tests automatiques");
  run(process.execPath, ["tools/build-public-home-template.js"]);
  return require("./run-verification-tests").runSuite("application");
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
  const requested = process.argv.includes("--browser") || process.argv.includes("--browser-only") || process.env.LIVEPALMES_BROWSER_SMOKE === "1";
  if (!requested) return;
  printStep("Smoke test navigateur");
  return require("./run-verification-tests").runSuite("browser");
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

(async () => { try {
  if (process.argv.includes("--browser-only")) {
    await runBrowserSmokeIfRequested();
  } else {
    checkSyntax();
    run(process.execPath, [path.join(rootDir, "tools", "check-firebase-test-backend-lots.js")]);
    await runUnitTests();
    runTextChecks();
    runArchitectureChecks();
    runGeneratedPageChecks();
    runConsolePageLoadChecks();
    await runBrowserSmokeIfRequested();
    runDiffCheck();
  }
  console.log("\nVerification LivePalmes OK.");
} catch (error) {
  console.error(`\nVerification LivePalmes KO : ${error.message}`);
  process.exit(1);
} })();
