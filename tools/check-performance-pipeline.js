const fs = require("fs");
const path = require("path");

const rootDir = process.cwd();
const defaultIntranapDir = path.resolve(rootDir, "..", "..", "BDD INTRANAP");
const intranapDir = process.env.INTRANAP_DIR || defaultIntranapDir;
const dataDir = path.join(rootDir, "performances", "public", "data");
const publicDir = path.join(dataDir, "performance-public");
const topPreviewDir = path.join(publicDir, "tops-preview");
const sourceSpecs = [
  { label: "performances", prefix: "perfs_" },
  { label: "nageurs", prefix: "nageurs_" },
  { label: "competitions", prefix: "competitions_" },
  { label: "clubs", prefix: "clubs_" }
];

function exists(filePath) {
  return fs.existsSync(filePath);
}

function fileSize(filePath) {
  return exists(filePath) && fs.statSync(filePath).isFile() ? fs.statSync(filePath).size : 0;
}

function walk(dir, acc = { files: 0, bytes: 0 }) {
  if (!exists(dir)) return acc;
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.isFile()) {
      const stats = fs.statSync(full);
      acc.files += 1;
      acc.bytes += stats.size;
    }
  });
  return acc;
}

function formatBytes(bytes) {
  if (bytes > 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} Go`;
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
  return `${(bytes / 1024).toFixed(1)} Ko`;
}

function statusLine(label, ok, detail) {
  return `${ok ? "OK " : "KO "} ${label}${detail ? ` - ${detail}` : ""}`;
}

function findLatestCsv(prefix) {
  if (!exists(intranapDir)) return null;
  const matches = fs.readdirSync(intranapDir)
    .filter((name) => name.startsWith(prefix) && name.toLowerCase().endsWith(".csv"))
    .sort((a, b) => b.localeCompare(a));
  return matches[0] || null;
}

function main() {
  const csvStatus = sourceSpecs.map((spec) => {
    const name = findLatestCsv(spec.prefix);
    const filePath = name ? path.join(intranapDir, name) : "";
    return {
      label: spec.label,
      prefix: spec.prefix,
      name,
      ok: Boolean(name && exists(filePath)),
      size: name ? fileSize(filePath) : 0
    };
  });
  const missingCsv = csvStatus.filter((item) => !item.ok);
  const intermediateSources = [
    path.join(dataDir, "intranap-summary.js"),
    path.join(dataDir, "intranap-swimmers-index.js"),
    path.join(dataDir, "intranap-swimmer-perfs"),
    path.join(dataDir, "intranap-top-source")
  ];
  const missingIntermediate = intermediateSources.filter((item) => !exists(item));
  const publicStats = walk(publicDir);
  const topPreviewStats = walk(topPreviewDir);

  console.log(statusLine("Source CSV INTRANAP", !missingCsv.length, intranapDir));
  csvStatus.forEach((item) => {
    console.log(`   ${item.ok ? "OK" : "KO"} ${item.label} : ${item.name || `${item.prefix}*.csv introuvable`}${item.ok ? ` (${formatBytes(item.size)})` : ""}`);
  });
  console.log(statusLine("Fichiers intermediaires historiques", !missingIntermediate.length, missingIntermediate.length ? `manquants : ${missingIntermediate.map((item) => path.relative(rootDir, item)).join(", ")}` : "complets"));
  console.log(statusLine("Fichiers publics optimises", publicStats.files > 0, `${publicStats.files} fichiers, ${formatBytes(publicStats.bytes)}`));
  console.log(statusLine("Apercus TOP rapides", topPreviewStats.files > 0, `${topPreviewStats.files} fichiers, ${formatBytes(topPreviewStats.bytes)}`));

  if (missingCsv.length || missingIntermediate.length || !publicStats.files || !topPreviewStats.files) {
    console.log("");
    console.log("Commandes utiles :");
    if (missingIntermediate.length && !missingCsv.length) console.log("  node tools/build-intranap-public-data.js");
    console.log("  node tools/build-performance-base-seed.js");
    console.log("  node tools/build-public-performance-files.js");
    process.exitCode = 1;
  }
}

main();
