const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const defaultProjectId = "livepalmes";
const defaultCompetitionId = "livepalmes-active";
const defaultDocumentUrl = `https://firestore.googleapis.com/v1/projects/${defaultProjectId}/databases/(default)/documents/competitions/${defaultCompetitionId}/performanceData/records`;
const defaultOutputPath = path.join(rootDir, "performances", "public", "data", "records-data.js");
const defaultBackupDir = path.join(rootDir, "outputs", "records-static-backups");

function readArgs(argv) {
  const args = {
    write: false,
    bumpVersion: true,
    outputPath: defaultOutputPath,
    documentUrl: defaultDocumentUrl
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--write") args.write = true;
    else if (arg === "--dry-run") args.write = false;
    else if (arg === "--no-bump-version") args.bumpVersion = false;
    else if (arg === "--output") args.outputPath = path.resolve(rootDir, argv[index += 1] || "");
    else if (arg === "--url") args.documentUrl = argv[index += 1] || "";
    else if (arg === "--help") {
      printHelp();
      process.exit(0);
    }
  }

  return args;
}

function printHelp() {
  console.log(`
Usage:
  node tools/sync-records-from-firestore.js [--write] [--dry-run] [--no-bump-version]

Synchronise le fallback statique des Records / MPF depuis Firestore.

Options:
  --write             ecrit performances/public/data/records-data.js
  --dry-run           lit Firestore et affiche le rapport sans ecrire
  --no-bump-version   ne modifie pas les versions de cache HTML/JS
  --output <path>     chemin du fichier statique a generer
  --url <url>         URL REST Firestore du document records
`);
}

function decodeFirestoreValue(value = {}) {
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return Boolean(value.booleanValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodeFirestoreValue);
  if ("mapValue" in value) return decodeFirestoreMap(value.mapValue.fields || {});
  return undefined;
}

function decodeFirestoreMap(fields = {}) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, decodeFirestoreValue(value)])
  );
}

function assertInsideRoot(targetPath) {
  const resolved = path.resolve(targetPath);
  if (!resolved.startsWith(rootDir)) {
    throw new Error(`Chemin hors projet refuse : ${resolved}`);
  }
  return resolved;
}

function validateRecordsData(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Document Firestore records invalide : objet attendu.");
  }
  if (!Array.isArray(data.records)) {
    throw new Error("Document Firestore records invalide : champ records manquant.");
  }
  if (!Array.isArray(data.franceRecords)) {
    throw new Error("Document Firestore records invalide : champ franceRecords manquant.");
  }
  if (!data.filters || typeof data.filters !== "object") {
    throw new Error("Document Firestore records invalide : champ filters manquant.");
  }
}

async function fetchFirestoreData(documentUrl) {
  const response = await fetch(documentUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Lecture Firestore impossible (${response.status}) : ${await response.text()}`);
  }
  const payload = await response.json();
  return decodeFirestoreMap(payload.fields || {});
}

function staticFileContent(data) {
  return `window.LIVEPALMES_RECORDS = ${stableStringify(data)};\n`;
}

function stableStringify(value) {
  return JSON.stringify(sortObjectKeys(value));
}

function sortObjectKeys(value) {
  if (Array.isArray(value)) return value.map(sortObjectKeys);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortObjectKeys(value[key])])
  );
}

function writeBackup(outputPath) {
  if (!fs.existsSync(outputPath)) return "";
  fs.mkdirSync(defaultBackupDir, { recursive: true });
  const token = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const backupPath = path.join(defaultBackupDir, `records-data-${token}.js`);
  fs.copyFileSync(outputPath, backupPath);
  return backupPath;
}

function updateCacheVersions(token) {
  const candidates = [
    path.join(rootDir, "performances", "admin.html"),
    path.join(rootDir, "performances", "mpf.html"),
    path.join(rootDir, "performances", "nageur.html"),
    path.join(rootDir, "performances", "records.html"),
    path.join(rootDir, "performances", "public", "admin-records.js")
  ];
  const pattern = /public\/data\/records-data\.js\?v=[^"&`]+/g;
  const changed = [];

  candidates.forEach((filePath) => {
    if (!fs.existsSync(filePath)) return;
    const before = fs.readFileSync(filePath, "utf8");
    const after = before.replace(pattern, `public/data/records-data.js?v=${token}`);
    if (after === before) return;
    fs.writeFileSync(filePath, after, "utf8");
    changed.push(filePath);
  });

  return changed;
}

async function main() {
  const args = readArgs(process.argv.slice(2));
  const outputPath = assertInsideRoot(args.outputPath);
  const data = await fetchFirestoreData(args.documentUrl);
  validateRecordsData(data);

  const nextContent = staticFileContent(data);
  const currentContent = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  const changed = currentContent !== nextContent;
  const report = {
    source: args.documentUrl,
    outputPath,
    write: args.write,
    changed,
    records: data.records.length,
    franceRecords: data.franceRecords.length,
    updatedAt: data.updatedAt || "",
    backupPath: "",
    cacheVersion: "",
    cacheVersionFiles: []
  };

  if (args.write && changed) {
    report.backupPath = writeBackup(outputPath);
    fs.writeFileSync(outputPath, nextContent, "utf8");
  }

  if (args.write && args.bumpVersion) {
    const sourceDate = String(data.updatedAt || data.generatedAt || new Date().toISOString());
    report.cacheVersion = `records-firestore-${sourceDate.replace(/[-:.TZ]/g, "").slice(0, 14)}`;
    report.cacheVersionFiles = updateCacheVersions(report.cacheVersion);
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
