const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { isDeepStrictEqual } = require("util");
const vm = require("vm");

const rootDir = path.resolve(__dirname, "..");
const projectId = "livepalmes";
const competitionId = "livepalmes-active";
const documentUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/competitions/${competitionId}/performanceData/records`;
const backupDir = path.join(rootDir, "outputs", "records-firestore-backups");
const reportPath = path.join(rootDir, "outputs", "normalize-record-locations-report.json");

function readArgs(argv) {
  return {
    write: argv.includes("--write"),
    help: argv.includes("--help")
  };
}

function printHelp() {
  console.log(`
Usage:
  node tools/normalize-record-locations.js [--write]

Sans --write : inventorie les lieux Records / MPF qui seraient normalises.
Avec --write : sauvegarde le document, normalise uniquement les lieux puis verifie Firestore.
`);
}

function extractLocationMap(relativePath, variableName) {
  const filePath = path.join(rootDir, relativePath);
  const source = fs.readFileSync(filePath, "utf8");
  const pattern = new RegExp(`const\\s+${variableName}\\s*=\\s*new Map\\((\\[[\\s\\S]*?\\])\\);`);
  const match = source.match(pattern);
  if (!match) throw new Error(`Table ${variableName} introuvable dans ${relativePath}.`);
  const entries = vm.runInNewContext(match[1], Object.create(null), { filename: filePath });
  return new Map(entries);
}

function mergedLocationMap() {
  const maps = [
    extractLocationMap("performances/public/records.js", "recordLocationLabels"),
    extractLocationMap("performances/public/app.js", "mpfLocationLabels")
  ];
  const merged = new Map();
  for (const map of maps) {
    for (const [source, target] of map) {
      if (merged.has(source) && merged.get(source) !== target) {
        throw new Error(`Conflit de normalisation pour ${source} : ${merged.get(source)} / ${target}`);
      }
      merged.set(source, target);
    }
  }
  return merged;
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
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeFirestoreValue(value)]));
}

function encodeFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeFirestoreValue) } };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === "object") return { mapValue: { fields: encodeFirestoreMap(value) } };
  return { stringValue: String(value) };
}

function encodeFirestoreMap(value = {}) {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encodeFirestoreValue(item)]));
}

async function fetchFirestoreData() {
  const response = await fetch(documentUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(`Lecture Firestore impossible (${response.status}) : ${await response.text()}`);
  const payload = await response.json();
  return decodeFirestoreMap(payload.fields || {});
}

function firebaseCommand() {
  if (process.platform !== "win32") return "firebase";
  const appDataCommand = process.env.APPDATA ? path.join(process.env.APPDATA, "npm", "firebase.cmd") : "";
  return appDataCommand && fs.existsSync(appDataCommand) ? `"${appDataCommand}"` : "firebase.cmd";
}

function gcloudCommand() {
  if (process.platform !== "win32") return "gcloud";
  const localCommand = process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, "Google", "Cloud SDK", "google-cloud-sdk", "bin", "gcloud.cmd")
    : "";
  return localCommand && fs.existsSync(localCommand) ? `"${localCommand}"` : "gcloud.cmd";
}

function readAccessToken() {
  const gcloudResult = spawnSync(`${gcloudCommand()} auth print-access-token`, {
    cwd: rootDir,
    encoding: "utf8",
    shell: true
  });
  const gcloudToken = String(gcloudResult.stdout || "").trim();
  if (gcloudResult.status === 0 && gcloudToken) return gcloudToken;

  const result = spawnSync(`${firebaseCommand()} login:list --json`, {
    cwd: rootDir,
    encoding: "utf8",
    shell: true
  });
  if (result.status !== 0) {
    throw new Error(`Impossible de recuperer l'authentification Firebase : ${result.stderr || result.stdout}`);
  }
  const payload = JSON.parse(result.stdout);
  const token = payload?.result?.[0]?.tokens?.access_token;
  if (!token) throw new Error("Jeton Firebase CLI introuvable.");
  return token;
}

async function writeFirestoreData(data) {
  const response = await fetch(documentUrl, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${readAccessToken()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ fields: encodeFirestoreMap(data) })
  });
  if (!response.ok) throw new Error(`Ecriture Firestore impossible (${response.status}) : ${await response.text()}`);
}

function writeBackup(data) {
  fs.mkdirSync(backupDir, { recursive: true });
  const token = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const backupPath = path.join(backupDir, `records-before-location-normalization-${token}.json`);
  fs.writeFileSync(backupPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  return backupPath;
}

function normalizeRows(scope, rows, locationMap) {
  const changes = [];
  const normalizedRows = (rows || []).map((row, index) => {
    const before = String(row?.location || "").trim();
    const after = locationMap.get(before) || before;
    if (!before || after === before) return row;
    changes.push({
      scope,
      index,
      key: row.key || "",
      course: row.course || "",
      swimmer: row.swimmer || "",
      before,
      after
    });
    return { ...row, location: after };
  });
  return { rows: normalizedRows, changes };
}

function assertOnlyLocationsChanged(before, after) {
  for (const scope of ["records", "franceRecords"]) {
    if ((before[scope] || []).length !== (after[scope] || []).length) {
      throw new Error(`Le nombre de lignes ${scope} a change.`);
    }
    (before[scope] || []).forEach((row, index) => {
      const beforeWithoutLocation = { ...row };
      const afterWithoutLocation = { ...after[scope][index] };
      delete beforeWithoutLocation.location;
      delete afterWithoutLocation.location;
      if (!isDeepStrictEqual(beforeWithoutLocation, afterWithoutLocation)) {
        throw new Error(`Une donnee autre que le lieu a change dans ${scope}[${index}].`);
      }
    });
  }
}

function changeCounts(changes) {
  return changes.reduce((counts, change) => {
    const key = `${change.before} -> ${change.after}`;
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function locationCounts(rows) {
  return (rows || []).reduce((counts, row) => {
    const location = String(row?.location || "").trim();
    if (!location) return counts;
    counts[location] = (counts[location] || 0) + 1;
    return counts;
  }, {});
}

async function main() {
  const args = readArgs(process.argv.slice(2));
  if (args.help) return printHelp();

  const locationMap = mergedLocationMap();
  const current = await fetchFirestoreData();
  if (!Array.isArray(current.records) || !Array.isArray(current.franceRecords)) {
    throw new Error("Document Records / MPF invalide.");
  }

  const mpf = normalizeRows("records", current.records, locationMap);
  const france = normalizeRows("franceRecords", current.franceRecords, locationMap);
  const next = { ...current, records: mpf.rows, franceRecords: france.rows };
  const changes = [...mpf.changes, ...france.changes];
  assertOnlyLocationsChanged(current, next);

  let backupPath = "";
  let verified = false;
  if (args.write && changes.length) {
    backupPath = writeBackup(current);
    next.updatedAt = new Date().toISOString();
    await writeFirestoreData(next);
    const remote = await fetchFirestoreData();
    assertOnlyLocationsChanged(next, remote);
    verified = isDeepStrictEqual(remote.records, next.records) &&
      isDeepStrictEqual(remote.franceRecords, next.franceRecords);
    if (!verified) throw new Error("La verification apres ecriture a echoue.");
  }

  const report = {
    mode: args.write ? "write" : "dry-run",
    records: current.records.length,
    franceRecords: current.franceRecords.length,
    changedRows: changes.length,
    changedMpf: mpf.changes.length,
    changedFranceRecords: france.changes.length,
    replacements: changeCounts(changes),
    normalizedLocations: locationCounts([...next.records, ...next.franceRecords]),
    locationsWithoutCountry: locationCounts(
      [...next.records, ...next.franceRecords].filter((row) => {
        const location = String(row?.location || "").trim();
        return location && !location.includes(",");
      })
    ),
    backupPath,
    verified,
    changes
  };
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ...report, changes: undefined, reportPath }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
