const fs = require("fs");
const path = require("path");

const DEFAULT_SOURCE = path.join(__dirname, "..", "functions", "assets", "intranap-swimmers-index.json");

function option(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? String(process.argv[index + 1] || "") : fallback;
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function displayDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

function main() {
  const sourcePath = path.resolve(option("source", DEFAULT_SOURCE));
  const outputPath = option("output") ? path.resolve(option("output")) : "";
  const outputDir = option("output-dir") ? path.resolve(option("output-dir")) : "";
  const club = option("club").trim();
  const excludeClub = option("exclude-club").trim();
  const limit = Math.max(0, Math.trunc(Number(option("limit", "0")) || 0));
  const batchSize = Math.max(0, Math.trunc(Number(option("batch-size", "0")) || 0));
  const checkOnly = process.argv.includes("--check");
  if (!outputPath && !outputDir && !checkOnly) {
    throw new Error("Usage: node tools/export-engagement-license-lookup.js (--output <csv> | --output-dir <dossier> --batch-size 500) [--club CNHC] [--exclude-club CNHC] [--check]");
  }
  if (outputDir && !batchSize) {
    throw new Error("--output-dir exige --batch-size.");
  }

  const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  const excluded = { club: 0, missingIdentity: 0, invalidBirthDate: 0 };
  let rows = source.filter((swimmer) => {
    if (club && String(swimmer.club || "").trim() !== club) {
      excluded.club += 1;
      return false;
    }
    if (excludeClub && String(swimmer.club || "").trim() === excludeClub) {
      excluded.club += 1;
      return false;
    }
    if (!String(swimmer.id || "").trim() || !String(swimmer.lastName || "").trim() || !String(swimmer.firstName || "").trim()) {
      excluded.missingIdentity += 1;
      return false;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(swimmer.birthDate || ""))) {
      excluded.invalidBirthDate += 1;
      return false;
    }
    return true;
  });
  rows.sort((left, right) =>
    String(left.lastName).localeCompare(String(right.lastName), "fr", { sensitivity: "base" }) ||
    String(left.firstName).localeCompare(String(right.firstName), "fr", { sensitivity: "base" }) ||
    String(left.birthDate).localeCompare(String(right.birthDate)) ||
    String(left.id).localeCompare(String(right.id), "fr", { numeric: true })
  );
  if (limit) rows = rows.slice(0, limit);

  const header = ["livepalmes_id", "nom", "prenom", "date_naissance"];
  const dataRows = rows.map((swimmer) => [swimmer.id, swimmer.lastName, swimmer.firstName, displayDate(swimmer.birthDate)]);
  const writeCsv = (targetPath, values) => {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, `\uFEFF${[header, ...values].map((row) => row.map(csvCell).join(";")).join("\r\n")}\r\n`, "utf8");
  };
  const batchFiles = [];
  if (!checkOnly) {
    if (outputDir) {
      fs.mkdirSync(outputDir, { recursive: true });
      for (let start = 0; start < dataRows.length; start += batchSize) {
        const batchNumber = Math.floor(start / batchSize) + 1;
        const filename = `nageurs-livepalmes-lot-${String(batchNumber).padStart(3, "0")}.csv`;
        const targetPath = path.join(outputDir, filename);
        writeCsv(targetPath, dataRows.slice(start, start + batchSize));
        batchFiles.push({ filename, rows: Math.min(batchSize, dataRows.length - start) });
      }
    } else {
      writeCsv(outputPath, dataRows);
    }
  }
  console.log(JSON.stringify({
    sourcePath,
    outputPath: checkOnly ? "" : outputPath,
    outputDir: checkOnly ? "" : outputDir,
    club,
    excludeClub,
    sourceCount: source.length,
    exportedCount: rows.length,
    excluded,
    batchSize,
    batchCount: batchFiles.length,
    batchFiles
  }, null, 2));
}

main();
