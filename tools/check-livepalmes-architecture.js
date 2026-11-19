const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");

function lineCount(fileName) {
  return fs.readFileSync(path.join(rootDir, fileName), "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim()).length;
}

function assertFile(fileName) {
  if (!fs.existsSync(path.join(rootDir, fileName))) {
    throw new Error(`Fichier attendu manquant : ${fileName}`);
  }
}

function assertNoPattern(fileName, pattern, label) {
  const content = fs.readFileSync(path.join(rootDir, fileName), "utf8");
  if (pattern.test(content)) {
    throw new Error(`${label} detecte dans ${fileName}`);
  }
}

const requiredFiles = [
  "assets/livepalmes-app-method-bindings.js",
  "assets/livepalmes-console-render-workflow.js",
  "assets/livepalmes-final-withdrawals-workflow.js",
  "assets/livepalmes-result-parser.js",
  "assets/livepalmes-result-publication-workflow.js",
  "assets/livepalmes-results-admin-workflow.js",
  "assets/livepalmes-swimmer-panel.js",
  "assets/livepalmes-ui-events.js",
  "tests/livepalmes-basic-tests.js",
  "tests/livepalmes-result-regression-tests.js"
];

try {
  requiredFiles.forEach(assertFile);
  if (fs.existsSync(path.join(rootDir, "app.js"))) throw Error("Le runtime historique doit rester retiré.");

  const appLines = lineCount("assets/direct/import.js");
  if (appLines > 1000) {
    throw new Error(`Le lecteur Direct est remonte a ${appLines} lignes. Objectif actuel : rester sous 1000 lignes.`);
  }

  assertNoPattern("assets/direct/import.js", /\bwith\s*\(/, "with(context)");
  assertNoPattern("assets/direct/import.js", /\beval\s*\(/, "eval()");
  assertNoPattern("assets/direct/import.js", /\bnew\s+Function\s*\(/, "new Function()");

  console.log(`Architecture LivePalmes OK. Import Direct : ${appLines} lignes utiles.`);
} catch (error) {
  console.error(`Architecture LivePalmes KO : ${error.message}`);
  process.exit(1);
}
