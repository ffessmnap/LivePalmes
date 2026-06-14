const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { spawnSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const projectId = "livepalmes";
const competitionId = "livepalmes-active";
const documentUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/competitions/${competitionId}/performanceData/records`;
const backupDir = path.join(rootDir, "outputs", "records-firestore-backups");
const reportPath = path.join(rootDir, "outputs", "restore-record-birth-dates-report.json");

function readArgs(argv) {
  return {
    write: argv.includes("--write"),
    help: argv.includes("--help")
  };
}

function printHelp() {
  console.log(`
Usage:
  node tools/restore-record-birth-dates.js [--write]

Restaure les dates de naissance manquantes des Records / MPF depuis :
- performances/public/data/admin-reference.js
- outputs/records-static-backups/*.js

Sans --write, affiche seulement un rapport.
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

function encodeFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeFirestoreValue) } };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    if (Number.isInteger(value)) return { integerValue: String(value) };
    return { doubleValue: value };
  }
  if (typeof value === "object") return { mapValue: { fields: encodeFirestoreMap(value) } };
  return { stringValue: String(value) };
}

function encodeFirestoreMap(value = {}) {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, encodeFirestoreValue(item)])
  );
}

async function fetchFirestoreData() {
  const response = await fetch(documentUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(`Lecture Firestore impossible (${response.status}) : ${await response.text()}`);
  const payload = await response.json();
  return decodeFirestoreMap(payload.fields || {});
}

function readAccessToken() {
  const command = process.platform === "win32" ? "firebase.cmd login:list --json" : "firebase login:list --json";
  const result = spawnSync(command, {
    cwd: rootDir,
    encoding: "utf8",
    shell: true
  });
  if (result.status !== 0) {
    throw new Error(`Impossible de récupérer l'auth Firebase CLI : ${result.error?.message || result.stderr || result.stdout}`);
  }
  const payload = JSON.parse(result.stdout);
  const token = payload?.result?.[0]?.tokens?.access_token;
  if (!token) throw new Error("Jeton Firebase CLI introuvable.");
  return token;
}

async function writeFirestoreData(data) {
  const token = readAccessToken();
  const response = await fetch(documentUrl, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ fields: encodeFirestoreMap(data) })
  });
  if (!response.ok) throw new Error(`Écriture Firestore impossible (${response.status}) : ${await response.text()}`);
}

function writeBackup(data) {
  fs.mkdirSync(backupDir, { recursive: true });
  const token = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const backupPath = path.join(backupDir, `records-before-birthdate-restore-${token}.json`);
  fs.writeFileSync(backupPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  return backupPath;
}

function loadWindowGlobal(filePath, globalName) {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(filePath, "utf8"), context, { filename: filePath });
  return context.window[globalName];
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleUpperCase("fr-FR");
}

function rowSignature(scope, row) {
  return [
    scope,
    row?.recordType || "",
    row?.sex || "",
    row?.category || "",
    row?.course || "",
    row?.swimmer || "",
    row?.time || "",
    row?.date || "",
    row?.club || ""
  ].map((value) => String(value || "").trim()).join("|");
}

function isIndividualRecord(row) {
  return !String(row?.style || "").startsWith("RELAY") && !/^4X/i.test(String(row?.course || ""));
}

function isPlaceholder(row) {
  return /tablir/i.test(String(row?.swimmer || "")) || /tablir/i.test(String(row?.time || ""));
}

function buildReferenceBirthDates() {
  const referencePath = path.join(rootDir, "performances", "public", "data", "admin-reference.js");
  const reference = loadWindowGlobal(referencePath, "LIVEPALMES_ADMIN_REFERENCE");
  const grouped = new Map();

  for (const swimmer of reference.swimmers || []) {
    const [, name, sex, birthDate] = swimmer;
    if (!name || !sex || !/^\d{4}/.test(String(birthDate || "")) || String(birthDate).startsWith("0000")) continue;
    const key = `${sex}|${normalizeName(name)}`;
    if (!grouped.has(key)) grouped.set(key, new Set());
    grouped.get(key).add(birthDate);
  }

  return new Map(
    Array.from(grouped)
      .filter(([, values]) => values.size === 1)
      .map(([key, values]) => [key, Array.from(values)[0]])
  );
}

function buildBackupBirthDates() {
  const staticBackupDir = path.join(rootDir, "outputs", "records-static-backups");
  const bySignature = new Map();
  if (!fs.existsSync(staticBackupDir)) return bySignature;

  for (const fileName of fs.readdirSync(staticBackupDir).filter((name) => name.endsWith(".js"))) {
    const fullPath = path.join(staticBackupDir, fileName);
    let data;
    try {
      data = loadWindowGlobal(fullPath, "LIVEPALMES_RECORDS");
    } catch {
      continue;
    }
    for (const [scope, rows] of [["records", data.records || []], ["franceRecords", data.franceRecords || []]]) {
      for (const row of rows) {
        if (!row?.birthDate || !isIndividualRecord(row) || isPlaceholder(row)) continue;
        const key = rowSignature(scope, row);
        if (!bySignature.has(key)) bySignature.set(key, new Set());
        bySignature.get(key).add(row.birthDate);
      }
    }
  }

  return new Map(
    Array.from(bySignature)
      .filter(([, values]) => values.size === 1)
      .map(([key, values]) => [key, Array.from(values)[0]])
  );
}

function restoreRows(scope, rows, referenceBirthDates, backupBirthDates) {
  const restored = [];
  const unresolved = [];

  const nextRows = rows.map((row) => {
    if (row?.birthDate || !isIndividualRecord(row) || isPlaceholder(row)) return row;

    const referenceKey = `${row.sex}|${normalizeName(row.swimmer)}`;
    const fromReference = referenceBirthDates.get(referenceKey);
    const fromBackup = backupBirthDates.get(rowSignature(scope, row));
    const birthDate = fromReference || fromBackup || "";
    const source = fromReference ? "admin-reference" : fromBackup ? "static-backup" : "";

    if (!birthDate) {
      unresolved.push({
        scope,
        sex: row.sex || "",
        category: row.category || "",
        course: row.course || "",
        swimmer: row.swimmer || "",
        time: row.time || "",
        date: row.date || ""
      });
      return row;
    }

    restored.push({
      scope,
      source,
      sex: row.sex || "",
      category: row.category || "",
      course: row.course || "",
      swimmer: row.swimmer || "",
      birthDate
    });
    return { ...row, birthDate };
  });

  return { rows: nextRows, restored, unresolved };
}

async function main() {
  const args = readArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const data = await fetchFirestoreData();
  const referenceBirthDates = buildReferenceBirthDates();
  const backupBirthDates = buildBackupBirthDates();
  const mpf = restoreRows("records", data.records || [], referenceBirthDates, backupBirthDates);
  const france = restoreRows("franceRecords", data.franceRecords || [], referenceBirthDates, backupBirthDates);
  const backupPath = args.write ? writeBackup(data) : "";

  data.records = mpf.rows;
  data.franceRecords = france.rows;
  if (args.write && (mpf.restored.length || france.restored.length)) {
    data.updatedAt = new Date().toISOString();
    await writeFirestoreData(data);
  }

  const restored = [...mpf.restored, ...france.restored];
  const unresolved = [...mpf.unresolved, ...france.unresolved];
  const report = {
    mode: args.write ? "write" : "dry-run",
    restoredCount: restored.length,
    restoredBySource: restored.reduce((acc, item) => {
      acc[item.source] = (acc[item.source] || 0) + 1;
      return acc;
    }, {}),
    unresolvedCount: unresolved.length,
    backupPath,
    restored,
    unresolved
  };

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    mode: report.mode,
    restoredCount: report.restoredCount,
    restoredBySource: report.restoredBySource,
    unresolvedCount: report.unresolvedCount,
    backupPath: report.backupPath,
    reportPath
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
