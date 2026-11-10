"use strict";
require("./helpers/offline-network");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const acorn = require("./firestore-rules/node_modules/acorn");
const { NAP_RETIRED_FUNCTIONS, activeLotFunctions } = require("../tools/firebase-test-backend-lots");

const root = path.resolve(__dirname, "..");
const retired = ["importHistoricalPerformanceRows", "getPerformanceBaseMigrationStatus", "migratePerformanceBaseNextChunk"];
const source = fs.readFileSync(path.join(root, "functions/index.js"), "utf8");
const ast = acorn.parse(source, { ecmaVersion: "latest" });
const exportedNames = ast.body.flatMap(n => n.expression?.left?.object?.name === "exports" ? [n.expression.left.property.name] : []);
for (const name of retired) {
  assert.equal(exportedNames.includes(name), false, "Historical migration declaration must be absent: " + name);
  assert.equal(NAP_RETIRED_FUNCTIONS.includes(name), true, "Retirement tombstone must remain: " + name);
  assert.equal(activeLotFunctions("performance").includes(name), false);
}
for (const file of ["migration-chunk-statuses", "historical-rows-from-chunk-payload", "migrate-historical-performance-base-chunk"]) {
  assert.equal(fs.existsSync(path.join(root, "functions/backend/server-legacy-service", file + ".js")), false);
}
for (const file of ["functions/index.js", "functions/server-legacy-service.js"]) {
  assert.doesNotMatch(fs.readFileSync(path.join(root, file), "utf8"),
    /migrationChunkStatuses|performanceBaseMigrationManifest|historicalRowsFromChunkPayload|migrateHistoricalPerformanceBaseChunk|PERFORMANCE_BASE_MIGRATION_(?:COLLECTION|BATCH_SIZE)/);
}
const browser = fs.readFileSync(path.join(root, "performances/public/import-competitions.js"), "utf8");
assert.doesNotMatch(browser, /performanceMigration|migrationAutoRunning|renderMigrationStatus|loadPerformanceMigrationStatus|migrate(?:Next|All)PerformanceBaseChunks?/);
for (const name of retired) assert.equal(browser.includes(name), false);
for (const name of ["createCompetitionImport", "listCompetitionImports", "deleteCompetitionImport"]) {
  assert.equal(browser.includes(name), true, "Current import UI retained: " + name);
}

const commands = ["build-performance-base-migration-manifest", "import-legacy-calendar-to-firestore",
  "prepare-legacy-calendar-import", "enrich-legacy-calendar-regions", "delete-legacy-calendar-deadlines",
  "repair-legacy-calendar-classification", "repair-legacy-calendar-noncompetitive-types",
  "repair-legacy-calendar-open-water-types", "repair-legacy-calendar-results",
  "update-legacy-calendar-practical-data", "mark-legacy-protocol-results"];
for (const name of commands) {
  const script = path.join(root, "tools", name + ".js");
  const result = spawnSync(process.execPath, [script, "--write", "--apply", "--project", "livepalmes",
    "--confirm", "999", "--input", "must-not-open.csv"], { encoding: "utf8", timeout: 5000 });
  assert.equal(result.status, 1, name);
  assert.match(result.stderr, /migration retire/);
  assert.doesNotMatch(result.stderr, /ENOENT|Firebase|credentials|Cannot find module|Connexion/);
  const program = acorn.parse(fs.readFileSync(script, "utf8"), { ecmaVersion: "latest" });
  assert.equal(program.body.length, 3, "Only strict mode, refusal and exit code remain");
}
for (const name of ["run-legacy-final-repairs", "run-legacy-history-import", "run-legacy-results-repair-after-classification"]) {
  const file = path.join(root, "tools", name + ".ps1");
  assert.match(fs.readFileSync(file, "utf8"), /^\[Console\]::Error\.WriteLine\("Ancien outil de migration retire\.[^\n]*\)\r?\nexit 1\r?\n$/);
  const shell = process.platform === "win32"
    ? path.join(process.env.SystemRoot, "System32/WindowsPowerShell/v1.0/powershell.exe") : "pwsh";
  const result = spawnSync(shell, ["-NoProfile", "-NonInteractive", "-Command", fs.readFileSync(file, "utf8")],
    { encoding: "utf8", timeout: 10000 });
  assert.equal(result.status, 1, name + ": " + (result.error || result.stderr));
  assert.match(result.stderr, /migration retire/);
}
console.log("Historical migration retirement: absent declarations/helpers, deployment tombstones, current imports and 14 harmless command refusals verified offline.");
