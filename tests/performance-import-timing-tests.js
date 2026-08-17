const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const {
  performanceImportChrono,
  performanceImportTimingType,
  timingConfig
} = require(path.join(root, "functions", "performance-import-timing.js"));

assert.equal(timingConfig.version, 1);
assert.equal(timingConfig.expectedPerformanceCount, 4287);
assert.equal(timingConfig.competitions.length, 19);
assert.equal(new Set(timingConfig.competitions.map((competition) => competition.importId)).size, 19);
assert.ok(timingConfig.competitions.every((competition) => competition.timingType === "electronic"));

const limogesImportId = "e40fe3129ffd5d76286774193a2855ed";
assert.equal(performanceImportTimingType({ source: "livepalmes-import", importId: limogesImportId }), "electronic");
assert.equal(performanceImportChrono({ source: "livepalmes-import", importId: limogesImportId }), "E");
assert.equal(performanceImportChrono({ source: "livepalmes-import", competitionId: limogesImportId }), "E");
assert.equal(performanceImportChrono({ source: "livepalmes-import", importId: "unknown" }), "");
assert.equal(performanceImportChrono({ source: "intranap", competitionId: limogesImportId }), "");
assert.equal(performanceImportChrono({ source: "livepalmes-import", importId: limogesImportId, chrono: "M" }), "M");
assert.equal(performanceImportChrono({ source: "livepalmes-import", importId: "unknown", metadata: { timingType: "electronic" } }), "E");

const tempRoot = fs.mkdtempSync(path.join(root, "outputs", "test-performance-import-timing-"));
try {
  const seedPath = path.join(tempRoot, "seed.ndjson");
  const outDir = path.join(tempRoot, "public");
  const baseRow = {
    swimmerId: "known",
    swimmerIdentityKey: "KNOWN|IMPORT|2010-01-01",
    swimmer: "Import KNOWN",
    firstName: "Import",
    lastName: "KNOWN",
    birthDate: "2010-01-01",
    sex: "F",
    seasonYear: 2026,
    pool: "50",
    chrono: "",
    course: "100SF",
    category: "J",
    timeValue: 4000,
    time: "40.00",
    date: "2026-05-22"
  };
  const rows = [
    { ...baseRow, id: "known", source: "livepalmes-import", importId: limogesImportId, competitionId: limogesImportId },
    { ...baseRow, id: "unknown", swimmerId: "unknown", swimmerIdentityKey: "UNKNOWN|IMPORT|2010-01-01", source: "livepalmes-import", importId: "unknown", competitionId: "unknown" },
    { ...baseRow, id: "intranap", swimmerId: "intranap", swimmerIdentityKey: "KNOWN|INTRANAP|2010-01-01", source: "intranap", competitionId: "42", chrono: "E" }
  ];
  fs.writeFileSync(seedPath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
  execFileSync(process.execPath, [path.join(root, "tools", "build-public-performance-files.js"), "--seed", seedPath, "--out-dir", outDir], {
    cwd: root,
    stdio: "pipe"
  });
  const listingRows = JSON.parse(fs.readFileSync(path.join(outDir, "dtn-listing", "2026.json"), "utf8"));
  assert.deepEqual(listingRows.map((row) => row.id).sort(), ["intranap", "known"]);
  assert.ok(listingRows.every((row) => row.chrono === "E"));
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

console.log("Performance import timing tests: OK");
