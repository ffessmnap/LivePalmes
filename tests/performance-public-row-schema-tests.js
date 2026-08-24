const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");

function jsonFiles(dir) {
  const files = [];
  const walk = (current) => fs.readdirSync(current, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".json")) files.push(full);
  });
  walk(dir);
  return files;
}

const testOutputRoot = path.join(root, "outputs");
fs.mkdirSync(testOutputRoot, { recursive: true });
const temp = fs.mkdtempSync(path.join(testOutputRoot, "test-row-schema-"));
const seed = path.join(temp, "seed.ndjson");
const output = path.join(temp, "public");
const row = {
  id: "import:test:perf-1",
  source: "livepalmes-import",
  publicKey: "livepalmes-import|import:test:perf-1",
  performanceBaseId: "base-1",
  swimmerId: "swimmer-1",
  swimmerIdentityKey: "TEST|ALICE|2000-01-01",
  swimmer: "Alice TEST",
  firstName: "Alice",
  lastName: "TEST",
  birthDate: "2000-01-01",
  sex: "F",
  club: "CLUB",
  regionId: "PACA",
  location: "Nice",
  date: "2026-05-01",
  seasonYear: 2026,
  pool: "50",
  chrono: "E",
  course: "100SF",
  category: "S",
  categoryCode: "S",
  timeValue: 4000,
  time: "40.00"
};
fs.writeFileSync(seed, `${JSON.stringify(row)}\n`, "utf8");

const result = spawnSync(process.execPath, [
  path.join(root, "tools", "build-public-performance-files.js"),
  "--seed", seed,
  "--out-dir", output
], { cwd: root, encoding: "utf8" });
assert.equal(result.status, 0, result.stderr || result.stdout);

const swimmerFiles = jsonFiles(path.join(output, "swimmers"));
assert.equal(swimmerFiles.length, 1);
const payload = JSON.parse(fs.readFileSync(swimmerFiles[0], "utf8"));
assert.equal(payload.rowSchemaVersion, 2);
assert.deepStrictEqual(payload.rows[0], {
  id: row.id,
  source: row.source,
  publicKey: row.publicKey,
  performanceBaseId: row.performanceBaseId,
  club: row.club,
  regionId: row.regionId,
  location: row.location,
  date: row.date,
  seasonYear: row.seasonYear,
  pool: row.pool,
  chrono: row.chrono,
  course: row.course,
  categoryCode: row.categoryCode,
  timeValue: row.timeValue,
  time: row.time
});

fs.rmSync(temp, { recursive: true, force: true });
console.log("Performance public row schema tests: OK");
