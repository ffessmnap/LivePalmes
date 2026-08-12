const path = require("path");

const PROJECT_ID = "livepalmes";
const PUBLIC_BUCKET = "livepalmes-public-data-718081132564";
const PUBLIC_SEARCH_PREFIX = "performance-public-firestore/search/";
const COLLECTION = "engagementClubRosters";
const PAGE_SIZE = 200;
const MAX_ROSTERS = 2000;
const MAX_SEARCH_FILES = 1000;
const ACTIVE_FROM = "2023-09-01";
const ACTIVE_TO = "2026-08-31";

function option(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? String(process.argv[index + 1] || "") : fallback;
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeText(value) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .toUpperCase()
    .trim();
}

function identityKey(swimmer = {}) {
  return normalizeText(swimmer.identityKey || [swimmer.lastName, swimmer.firstName, swimmer.birthDate].filter(Boolean).join("|"));
}

function isoDate(value) {
  const match = cleanText(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}

function laterDate(left, right) {
  return [isoDate(left), isoDate(right)].filter(Boolean).sort().pop() || "";
}

function initialActivityStatus(latestDate) {
  const date = isoDate(latestDate);
  return date >= ACTIVE_FROM && date <= ACTIVE_TO ? "active" : "inactive";
}

function validActivityStatus(value) {
  return ["active", "inactive"].includes(cleanText(value).toLowerCase());
}

async function readRosters(db, FieldPath) {
  const snapshots = [];
  let cursor = null;
  while (snapshots.length < MAX_ROSTERS) {
    let query = db.collection(COLLECTION).orderBy(FieldPath.documentId()).limit(PAGE_SIZE);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    snapshots.push(...page.docs);
    if (page.size < PAGE_SIZE) return snapshots;
    cursor = page.docs[page.docs.length - 1];
  }
  throw new Error(`Plus de ${MAX_ROSTERS} effectifs club : initialisation interrompue par sécurité.`);
}

function addPublicSwimmerToIndexes(row, latestById, latestByIdentity) {
  if (!row || typeof row !== "object") return;
  const latestDate = isoDate(row.latestDate);
  if (!latestDate) return;
  [row.id, ...(Array.isArray(row.sourceIds) ? row.sourceIds : []), ...(Array.isArray(row.aliases) ? row.aliases : [])]
    .map(cleanText)
    .filter(Boolean)
    .forEach((id) => latestById.set(id, laterDate(latestById.get(id), latestDate)));
  const identity = identityKey(row);
  if (identity) latestByIdentity.set(identity, laterDate(latestByIdentity.get(identity), latestDate));
}

async function readPublicLatestDates(bucket) {
  const [files] = await bucket.getFiles({ prefix: PUBLIC_SEARCH_PREFIX });
  const jsonFiles = files.filter((file) => file.name.endsWith(".json"));
  if (jsonFiles.length > MAX_SEARCH_FILES) {
    throw new Error(`Plus de ${MAX_SEARCH_FILES} fichiers de recherche publics : initialisation interrompue par sécurité.`);
  }
  const latestById = new Map();
  const latestByIdentity = new Map();
  let rowsRead = 0;
  for (let offset = 0; offset < jsonFiles.length; offset += 12) {
    const batch = jsonFiles.slice(offset, offset + 12);
    const payloads = await Promise.all(batch.map(async (file) => {
      const [buffer] = await file.download();
      return JSON.parse(buffer.toString("utf8"));
    }));
    payloads.forEach((payload) => {
      const rows = Array.isArray(payload) ? payload : Object.values(payload || {});
      rowsRead += rows.length;
      rows.forEach((row) => addPublicSwimmerToIndexes(row, latestById, latestByIdentity));
    });
  }
  return { latestById, latestByIdentity, searchFilesRead: jsonFiles.length, searchRowsRead: rowsRead };
}

function latestDateForRosterSwimmer(swimmer, publicIndexes) {
  let latestDate = isoDate(swimmer.latestDate);
  [swimmer.swimmerId, swimmer.swimmerIndexId, swimmer.id]
    .map(cleanText)
    .filter(Boolean)
    .forEach((id) => { latestDate = laterDate(latestDate, publicIndexes.latestById.get(id)); });
  const identity = identityKey(swimmer);
  if (identity) latestDate = laterDate(latestDate, publicIndexes.latestByIdentity.get(identity));
  return latestDate;
}

async function main() {
  const projectId = option("project");
  const apply = process.argv.includes("--apply");
  if (projectId !== PROJECT_ID) throw new Error(`Le script exige --project ${PROJECT_ID}.`);

  const admin = require(path.join(__dirname, "..", "functions", "node_modules", "firebase-admin"));
  const { FieldPath, getFirestore } = require(path.join(__dirname, "..", "functions", "node_modules", "firebase-admin", "lib", "firestore"));
  const { getStorage } = require(path.join(__dirname, "..", "functions", "node_modules", "firebase-admin", "lib", "storage"));
  if (!admin.getApps().length) admin.initializeApp({ projectId });
  const db = getFirestore();
  const [snapshots, publicIndexes] = await Promise.all([
    readRosters(db, FieldPath),
    readPublicLatestDates(getStorage().bucket(PUBLIC_BUCKET))
  ]);
  const now = new Date().toISOString();
  let active = 0;
  let inactive = 0;
  let alreadyInitialized = 0;
  let entriesRead = 0;
  const changes = [];
  snapshots.forEach((snapshot) => {
    const data = snapshot.data() || {};
    let changed = false;
    const swimmers = {};
    Object.entries(data.swimmers && typeof data.swimmers === "object" ? data.swimmers : {}).forEach(([key, swimmer]) => {
      entriesRead += 1;
      if (!swimmer || typeof swimmer !== "object" || validActivityStatus(swimmer.clubActivityStatus)) {
        if (validActivityStatus(swimmer?.clubActivityStatus)) alreadyInitialized += 1;
        swimmers[key] = swimmer;
        return;
      }
      const latestDate = latestDateForRosterSwimmer(swimmer, publicIndexes);
      const status = initialActivityStatus(latestDate);
      if (status === "active") active += 1;
      else inactive += 1;
      swimmers[key] = {
        ...swimmer,
        ...(latestDate ? { latestDate } : {}),
        clubActivityStatus: status,
        clubActivityStatusSource: "initial-2023-2026",
        clubActivityStatusUpdatedAt: now,
        clubActivityStatusUpdatedBy: "system:activity-initialization"
      };
      changed = true;
    });
    if (changed) changes.push({ snapshot, data, swimmers });
  });
  const summary = {
    mode: apply ? "apply" : "dry-run",
    projectId,
    activeWindow: { from: ACTIVE_FROM, to: ACTIVE_TO },
    rosterReads: snapshots.length,
    searchFilesRead: publicIndexes.searchFilesRead,
    searchRowsRead: publicIndexes.searchRowsRead,
    rosterEntriesRead: entriesRead,
    affectedRosters: changes.length,
    initializedEntries: active + inactive,
    activeEntries: active,
    inactiveEntries: inactive,
    alreadyInitializedEntries: alreadyInitialized,
    rosterWrites: apply ? changes.length : 0
  };
  if (!apply) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }
  const confirmRosters = Number(option("confirm-rosters", "-1"));
  const confirmActive = Number(option("confirm-active", "-1"));
  const confirmInactive = Number(option("confirm-inactive", "-1"));
  if (confirmRosters !== changes.length || confirmActive !== active || confirmInactive !== inactive) {
    throw new Error(`Confirmation requise : --confirm-rosters ${changes.length} --confirm-active ${active} --confirm-inactive ${inactive}`);
  }
  const writer = db.bulkWriter({ throttling: { initialOpsPerSecond: 40, maxOpsPerSecond: 80 } });
  changes.forEach(({ snapshot, data, swimmers }) => writer.set(snapshot.ref, {
    ...data,
    swimmers,
    swimmerCount: Object.keys(swimmers).length,
    updatedAt: now,
    activityStatusInitializedAt: now,
    activityStatusInitializationVersion: 1
  }));
  await writer.close();
  console.log(JSON.stringify({ ...summary, completedAt: now }, null, 2));
}

module.exports = { initialActivityStatus, latestDateForRosterSwimmer };

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
