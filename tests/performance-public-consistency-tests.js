const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  checkPerformancePublicConsistency,
  sortPerformancePublicationFiles,
} = require("../tools/performance-public-consistency");

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value), "utf8");
}

async function run() {
  const publicationRoot = path.join(os.tmpdir(), "performance-publication-order");
  const publicationFiles = [
    path.join(publicationRoot, "manifest.json"),
    path.join(publicationRoot, "tops", "top.json"),
    path.join(publicationRoot, "version.js"),
    path.join(publicationRoot, "swimmers", "a.json"),
  ];
  assert.deepStrictEqual(
    sortPerformancePublicationFiles(publicationFiles, publicationRoot).map((filePath) =>
      path.relative(publicationRoot, filePath).replace(/\\/g, "/")
    ),
    ["swimmers/a.json", "tops/top.json", "version.js", "manifest.json"],
    "Les données doivent être publiées avant les fichiers de bascule"
  );

  const uploadSource = fs.readFileSync(
    path.join(__dirname, "..", "tools", "upload-public-performance-files-to-storage.js"),
    "utf8"
  );
  assert.ok(
    uploadSource.indexOf("await checkPerformancePublicConsistency") <
      uploadSource.indexOf("const token = await firebaseAccessToken()"),
    "Le contrôle de cohérence doit précéder toute authentification ou publication"
  );
  assert.ok(
    uploadSource.indexOf("await runPool(dataFiles") <
      uploadSource.indexOf("for (const file of switchFiles)"),
    "Les fichiers de bascule doivent être envoyés après toutes les données"
  );

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "livepalmes-performance-check-"));
  const seed = path.join(temp, "seed.ndjson");
  const out = path.join(temp, "public");
  const row = {
    id: "perf-1",
    publicKey: "livepalmes|perf-1",
    swimmerIdentityKey: "TEST|ALICE|2000-01-01",
    swimmerId: "alice",
    swimmer: "Alice TEST",
    sex: "F",
    course: "100SF",
    category: "S",
    seasonYear: 2026,
    regionId: "FRA",
    date: "2026-05-01",
    timeValue: 4000,
    time: "40.00"
  };
  fs.writeFileSync(seed, `${JSON.stringify(row)}\n`, "utf8");
  writeJson(path.join(out, "tops", "100SF", "F-S.json"), [row]);
  writeJson(path.join(out, "swimmers", "aa", "alice.json"), {
    id: "alice",
    identityKey: row.swimmerIdentityKey,
    rowSchemaVersion: 2,
    rows: [{ id: row.id, publicKey: row.publicKey, course: row.course, date: row.date, timeValue: row.timeValue, time: row.time }]
  });

  const valid = await checkPerformancePublicConsistency({ seedPath: seed, outDir: out });
  assert.equal(valid.ok, true);
  assert.equal(valid.expectedTopCandidates, 1);
  assert.equal(valid.comparedSwimmerCourses, 1);

  writeJson(path.join(out, "swimmers", "aa", "alice.json"), {
    id: "alice",
    identityKey: row.swimmerIdentityKey,
    rowSchemaVersion: 1,
    rows: [{ id: row.id, publicKey: row.publicKey, course: row.course, date: row.date, timeValue: row.timeValue, time: row.time }]
  });
  const oldSchema = await checkPerformancePublicConsistency({ seedPath: seed, outDir: out });
  assert.equal(oldSchema.ok, false);
  assert.ok(oldSchema.errors.some((error) => error.includes("ancien schéma")));

  writeJson(path.join(out, "swimmers", "aa", "alice.json"), {
    id: "alice",
    identityKey: row.swimmerIdentityKey,
    rowSchemaVersion: 2,
    rows: [{ id: row.id, publicKey: row.publicKey, course: row.course, date: row.date, timeValue: row.timeValue, time: row.time }]
  });

  writeJson(path.join(out, "tops", "100SF", "F-S.json"), [{ ...row, timeValue: 4100, time: "41.00" }]);
  const invalid = await checkPerformancePublicConsistency({ seedPath: seed, outDir: out });
  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.some((error) => error.includes("Candidat TOP incohérent")));

  fs.rmSync(temp, { recursive: true, force: true });
  console.log("Performance public consistency tests: OK");
}

run().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
