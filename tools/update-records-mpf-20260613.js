const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const projectId = "livepalmes";
const competitionId = "livepalmes-active";
const documentPath = `competitions/${competitionId}/performanceData/records`;
const documentUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${documentPath}`;
const backupDir = path.join(rootDir, "outputs", "records-firestore-backups");

const PLACEHOLDER_TIME = "À établir";

const CATEGORY_LABELS = {
  P: "Poussin",
  B: "Benjamin",
  M: "Minime",
  C: "Cadet",
  J: "Junior",
  S: "Senior"
};

const COURSE_META = {
  "50BI": ["50 m Bi-palmes", "50 BI", "BI", "Bi-palmes", "50"],
  "4X50SF": ["4x50 Surface", "4x50SF", "RELAY_FRANCE", "Relais France", "4X50"],
  "4X100SF": ["4x100 Surface", "4x100 SF", "RELAY_CLUB", "Relais Club", "4X100"],
  "4X200SF": ["4x200 Surface", "4x200 SF", "RELAY_CLUB", "Relais Club", "4X200"],
  "4X100SB": ["4x100 Surface/Bi-palmes mixte", "4x100 SB", "RELAY_CLUB", "Relais Club", "4X100"],
  "4X100BIX": ["4x100 Bi-palmes mixte", "4x100 BI", "RELAY_CLUB", "Relais Club", "4X100"]
};

const franceUpdates = [
  relayFrance({ recordType: "RF", sex: "M", category: "S", course: "4X50SF", time: "01:01.56", swimmer: "M. BAGLIO / G. ALLAIN / E. HAMON / C. ZUGMEYER", date: "2025-07-19", location: "Olsztyn (POL)" }),
  relayFrance({ recordType: "RF", sex: "F", category: "S", course: "4X50SF", time: "01:11.21", swimmer: "M. HAMON / K. FOURTON-BELLINI / L. GUILLE / M. LECOEUR", date: "2024-07-15", location: "Belgrade (SRB)" }),
  relayFrance({ recordType: "RFJ", sex: "M", category: "J", course: "4X50SF", time: "01:12.99", swimmer: "A. ROBISSON / A. RAULT-COQUANTIF / A. HALTER / M. SLESIAK", date: "2025-06-22", location: "Chios (GRE)" }),
  relayFrance({ recordType: "RFJ", sex: "F", category: "J", course: "4X100SB", time: "03:00.31", swimmer: "S. POIRAT / J. DOUYÈRE / A. ROBISSON / C. POIRIER", date: "2025-06-21", location: "Chios (GRE)", mixedRelay: true }),
  relayFrance({ recordType: "RFJ", sex: "M", category: "J", course: "4X100SB", time: "03:00.31", swimmer: "S. POIRAT / J. DOUYÈRE / A. ROBISSON / C. POIRIER", date: "2025-06-21", location: "Chios (GRE)", mixedRelay: true })
];

const mpfUpdates = [
  mpfRelay({ sex: "M", category: "S", course: "4X200SF", time: "05:49.73", swimmer: "S. CARON / L. DUMARD / V. PRUDHOMME / M. BERGERON", club: "CPBR", date: "2019-12-07", location: "Valence" }),

  mpfIndividual({ sex: "M", category: "C", course: "50BI", time: "00:20.49", swimmer: "Anthelme ROBISSON", club: "PAN", date: "2025-06-23", location: "Chios (GRE)" }),

  mpfRelay({ sex: "F", category: "C", course: "4X100SF", time: "03:05.69", swimmer: "A. DAUCE / V. PINATEL / M. OURO-BANG-NA / A. DEBRAY", club: "PAN", date: "2019-04-21", location: "Aix en Provence" }),
  mpfRelay({ sex: "F", category: "C", course: "4X200SF", time: "06:58.69", swimmer: "A. DAUCE / V. PINATEL / O. LAURENCE / A. DEBRAY", club: "PAN", date: "2019-05-12", location: "Limoges" }),
  mpfRelay({ sex: "M", category: "C", course: "4X100SF", time: "03:01.62", swimmer: "N. CRISANTE / L. DISERIO / L. VIGNOLLE / C. CAZALDA", club: "CCNP", date: "2012-05-12", location: "Aix en Provence" }),
  mpfRelay({ sex: "M", category: "C", course: "4X200SF", time: "07:03.46", swimmer: "N. CRISANTE / L. DISERIO / L. VIGNOLLE / C. CAZALDA", club: "CCNP", date: "2012-05-10", location: "Aix en Provence" }),
  ...mixedMpfRelay({ category: "C", course: "4X100BIX", time: "03:40.11", swimmer: "O. OGER / N. SAVARY / A. DE RANCHIN / S. DJEFFAL", club: "CSG", date: "2025-05-03", location: "Vitré" }),
  ...mixedMpfRelay({ category: "C", course: "4X100SB", time: "03:14.37", swimmer: "O. OGER / L. PAVOINE / A. DE RANCHIN / N. SAVARY", club: "CSG", date: "2025-03-30", location: "Baud" }),

  mpfRelay({ sex: "F", category: "M", course: "4X100SF", time: "03:26.94", swimmer: "A. DAUCE / M. HAMON / O. LAURENCE / E. DUSSAUGE", club: "PAN", date: "2016-04-03", location: "Aix en Provence" }),
  mpfRelay({ sex: "F", category: "M", course: "4X200SF", time: "08:16.68", swimmer: "A. NOIR / E. MARCHESCHI / E. PAGAN / A. DROUGARD", club: "PAN", date: "2009-02-13", location: "Aix en Provence" }),
  mpfRelay({ sex: "M", category: "M", course: "4X100SF", time: "03:27.39", swimmer: "T. GODLEWSKI / T. TARDIEUX / L. CHEMIN / V. GUIOL", club: "PAN", date: "2006-06-26", location: "Mennecy" }),
  mpfRelay({ sex: "M", category: "M", course: "4X200SF", time: "07:57.37", swimmer: "T. GODLEWSKI / T. TARDIEUX / L. CHEMIN / V. GUIOL", club: "PAN", date: "2006-06-11", location: "La Ciotat" }),
  ...mixedMpfRelay({ category: "M", course: "4X100BIX", time: "04:05.53", swimmer: "V. LEJEUNE / R. LEBAILLIF / M. CHASTAGNER / J. DOUYÈRE", club: "CSG", date: "2024-06-15", location: "Angers" }),
  ...mixedMpfRelay({ category: "M", course: "4X100SB", time: "03:55.61", swimmer: "A. VILANI / A. DIABY / F. FARINA / E. FRACHON", club: "PAN", date: "2025-05-11", location: "Antibes" }),

  mpfRelay({ sex: "F", category: "B", course: "4X100SF", time: "04:09.11", swimmer: "A. DAUCE / A. DEBRAY / E. CONIGLIO / O. LAURENCE", club: "PAN", date: "2008-04-27", location: "Aix en Provence" }),
  mpfRelay({ sex: "F", category: "B", course: "4X200SF", time: "09:47.06", swimmer: "E. PAGAN / J. O'NEIL / M. PANIGOT / C. LOPEZ", club: "PAN", date: "2008-05-18", location: "La Ciotat" }),
  mpfRelay({ sex: "M", category: "B", course: "4X100SF", time: "04:18.64", swimmer: "N. CRISANTE / G. MARTINEZ / N. ALBERT / L. DISERIO", club: "CCNP", date: "2008-06-15", location: "La Ciotat" }),
  mpfRelay({ sex: "M", category: "B", course: "4X200SF", time: "10:03.64", swimmer: "N. CRISANTE / G. MARTINEZ / N. ALBERT / L. DISERIO", club: "CCNP", date: "2008-06-15", location: "La Ciotat" }),
  ...mixedMpfRelay({ category: "B", course: "4X100BIX", time: "05:55.84", swimmer: "M. GONFRAY / A. RAZIYEVA / T. ALLANIC / N. FALLY", club: "PSCC", date: "2025-05-25", location: "La Roche sur Yon" }),
  ...mixedMpfRelay({ category: "B", course: "4X100SB", time: "05:17.39", swimmer: "P. BEYER / S. MANSOURI / C. DE REYNAL / L. TIMONER", club: "PAN", date: "2025-05-11", location: "Antibes" })
];

function readArgs(argv) {
  return {
    write: argv.includes("--write"),
    help: argv.includes("--help")
  };
}

function printHelp() {
  console.log(`
Usage:
  node tools/update-records-mpf-20260613.js [--write]

Sans --write : dry-run, affiche les lignes remplacées/ajoutées.
Avec --write : met à jour Firestore via l'API REST.
`);
}

function normalizeTime(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(?:(\d+):)?(\d{1,2})\.(\d{2})$/);
  if (!match) return text;
  const minutes = Number(match[1] || 0);
  const seconds = Number(match[2]);
  return minutes ? `${minutes}:${String(seconds).padStart(2, "0")}.${match[3]}` : `${seconds}.${match[3]}`;
}

function timeValue(value) {
  const time = normalizeTime(value);
  const match = time.match(/^(?:(\d+):)?(\d{1,2})\.(\d{2})$/);
  if (!match) return null;
  return Number(match[1] || 0) * 6000 + Number(match[2]) * 100 + Number(match[3]);
}

function courseMeta(course, style) {
  const meta = COURSE_META[course];
  if (!meta) throw new Error(`Course inconnue : ${course}`);
  if (style === "RELAY_FRANCE") return [meta[0], meta[1], style, "Relais France", meta[4]];
  return meta;
}

function baseRow({ sex, category, course, style, time, swimmer, club, date, location }) {
  const normalizedTime = normalizeTime(time);
  const value = timeValue(normalizedTime);
  const [courseLabel, courseShortLabel, styleCode, styleLabel, length] = courseMeta(course, style);
  return {
    age: "",
    bassin: "",
    birthDate: "",
    category,
    categoryLabel: CATEGORY_LABELS[category] || category,
    chrono: "",
    club,
    clubId: "",
    competition: "MPF figée",
    competitionId: "",
    course,
    courseLabel,
    courseShortLabel,
    date,
    key: "",
    length,
    location,
    manualFrozen: true,
    points: "",
    rawTime: normalizedTime,
    region: "",
    relayType: styleCode === "RELAY_CLUB" ? "club" : "",
    seasonYear: Number(date.slice(0, 4)),
    sex,
    sourceCategory: "MPF figée",
    style: styleCode,
    styleLabel,
    swimmer,
    swimmerId: "",
    time: normalizedTime,
    value
  };
}

function mpfIndividual(input) {
  const row = baseRow({ ...input, style: "BI" });
  row.key = `manual-mpf|${input.sex}|${input.category}|${input.course}`;
  row.relayType = "";
  return row;
}

function mpfRelay(input) {
  const row = baseRow({ ...input, style: "RELAY_CLUB" });
  row.key = `manual-mpf-relay|RELAY_CLUB|${input.sex}|${input.category}|${input.course}|${row.value}`;
  row.relayType = "club";
  row.mixedRelay = /(?:SB|BIX)$/.test(input.course);
  return row;
}

function mixedMpfRelay(input) {
  return ["F", "M"].map((sex) => {
    const row = mpfRelay({ ...input, sex });
    row.key = `manual-mpf-mixed|RELAY_CLUB|${sex}|${input.category}|${input.course}|${row.value}`;
    row.mixedRelay = true;
    return row;
  });
}

function relayFrance(input) {
  const normalizedTime = normalizeTime(input.time);
  const value = timeValue(normalizedTime);
  const [courseLabel, courseShortLabel, style, styleLabel, length] = courseMeta(input.course, "RELAY_FRANCE");
  const keyPrefix = input.mixedRelay ? "manual-rf-mixed" : "manual-rf";
  return {
    age: "",
    bassin: "50",
    birthDate: "",
    category: input.category,
    categoryLabel: CATEGORY_LABELS[input.category] || input.category,
    chrono: "E",
    club: "FFESSM",
    clubId: "",
    competition: "RF figé",
    competitionId: "",
    course: input.course,
    courseLabel,
    courseShortLabel,
    date: input.date,
    key: `${keyPrefix}|${input.recordType}|${input.sex}|RELAY_FRANCE|${input.course}|${value}`,
    length,
    location: input.location,
    manualFrozen: true,
    mixedRelay: Boolean(input.mixedRelay),
    points: "",
    rawTime: normalizedTime,
    recordType: input.recordType,
    recordTypeLabel: input.recordType === "RFJ" ? "Record de France Junior" : "Record de France",
    region: "",
    relayType: "france",
    seasonYear: Number(input.date.slice(0, 4)),
    sex: input.sex,
    sourceCategory: "RF figé",
    style,
    styleLabel,
    swimmer: input.swimmer,
    swimmerId: "",
    time: normalizedTime,
    value
  };
}

function rowSlot(row) {
  return [
    row.recordType || "MPF",
    row.sex || "",
    row.category || "",
    row.style || "",
    row.course || ""
  ].join("|");
}

function rowSummary(row) {
  if (!row) return null;
  return {
    slot: rowSlot(row),
    time: row.time,
    swimmer: row.swimmer,
    club: row.club,
    date: row.date,
    location: row.location,
    key: row.key,
    placeholder: Boolean(row.placeholderRecord)
  };
}

function sameSlot(a, b) {
  return rowSlot(a) === rowSlot(b);
}

function applyUpdates(rows, updates) {
  const next = Array.isArray(rows) ? rows.slice() : [];
  const report = [];

  for (const update of updates) {
    const before = next.filter((row) => sameSlot(row, update));
    for (let index = next.length - 1; index >= 0; index -= 1) {
      if (sameSlot(next[index], update)) next.splice(index, 1);
    }
    next.push(update);
    report.push({
      action: before.length ? "replace" : "create",
      before: before.map(rowSummary),
      after: rowSummary(update)
    });
  }

  return { rows: next, report };
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function updateFilters(data) {
  data.filters = data.filters || {};
  data.filters.sexes = unique([...(data.filters.sexes || []), "F", "M"]);
  data.filters.categories = unique([...(data.filters.categories || []), "B", "M", "C", "J", "S"]);
  data.filters.courses = unique([...(data.filters.courses || []), "4X50SF", "4X100SF", "4X200SF", "4X100SB", "4X100BIX"]);
  data.filters.franceCourses = unique([...(data.filters.franceCourses || []), "4X50SF", "4X100SB"]);
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
  const backupPath = path.join(backupDir, `records-${token}.json`);
  fs.writeFileSync(backupPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  return backupPath;
}

async function main() {
  const args = readArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const data = await fetchFirestoreData();
  const backupPath = args.write ? writeBackup(data) : "";
  const france = applyUpdates(data.franceRecords || [], franceUpdates);
  const mpf = applyUpdates(data.records || [], mpfUpdates);

  data.franceRecords = france.rows;
  data.records = mpf.rows;
  data.updatedAt = new Date().toISOString();
  updateFilters(data);

  const report = {
    write: args.write,
    backupPath,
    franceUpdates: france.report,
    mpfUpdates: mpf.report,
    franceRecords: data.franceRecords.length,
    records: data.records.length,
    updatedAt: data.updatedAt
  };

  if (args.write) {
    await writeFirestoreData(data);
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
