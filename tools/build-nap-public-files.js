"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { SOURCES } = require("../functions/nap-public-export");

function buildNapPublicFiles(exportDirectory, outputDirectory) {
  const source = path.resolve(exportDirectory);
  const output = path.resolve(outputDirectory);
  const relative = path.relative(path.resolve("outputs"), output);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative) || fs.existsSync(output)) {
    throw new Error("Dossier neuf requis sous outputs pour la construction NAP.");
  }
  const proof = JSON.parse(fs.readFileSync(path.join(source, "export-proof.json"), "utf8"));
  if (proof.source !== "nap" || proof.project !== "livepalmes-test" || proof.consistency !== "two-identical-paginated-reads") {
    throw new Error("Export NAP non verifie.");
  }
  for (const table of Object.keys(SOURCES)) {
    for (const pass of ["source", "verification"]) {
      const bytes = fs.readFileSync(path.join(source, pass, `${table}_nap.csv`));
      if (crypto.createHash("sha256").update(bytes).digest("hex") !== proof.tables[table]?.sha256) {
        throw new Error("Source NAP differente de l'export verifie.");
      }
    }
  }
  const historical = path.join(output, "historical");
  const seed = path.join(output, "nap-public-seed.ndjson");
  const publicDirectory = path.join(output, "public");
  const run = (script, args = [], env = process.env) => execFileSync(process.execPath,
    [path.join(__dirname, script), ...args], { env, stdio: "inherit" });
  run("build-intranap-public-data.js", [], { ...process.env, INTRANAP_DIR: path.join(source, "source"),
    LIVEPALMES_NAP_SOURCE: "true", LIVEPALMES_NAP_OUT_DIR: historical });
  run("build-performance-base-seed.js", ["--data-dir", historical, "--out", seed]);
  run("build-public-performance-files.js", ["--seed", seed, "--out-dir", publicDirectory]);
  run("check-public-performance-consistency.js", ["--seed", seed, "--public-dir", publicDirectory]);
  const manifestPath = path.join(publicDirectory, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.source = "nap";
  manifest.sourceExport = { startedAt: proof.startedAt, completedAt: proof.completedAt, tables: proof.tables };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  return { source: "nap", publicDirectory, seed, rowCount: manifest.rowCount, swimmers: manifest.swimmers };
}

if (require.main === module) {
  try {
    if (!process.argv[2] || !process.argv[3]) throw new Error("Export et sortie requis.");
    console.log(JSON.stringify(buildNapPublicFiles(process.argv[2], process.argv[3]), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { buildNapPublicFiles };
