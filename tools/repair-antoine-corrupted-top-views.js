const crypto = require("crypto");
const path = require("path");

const PROJECT_ID = "livepalmes";
const BUCKET = "livepalmes-public-data-718081132564";
const PREFIX = "performance-public-firestore";
const INCIDENT_UPDATED_AT = "2026-08-12T15:05:26.355Z";
const EXPECTED_INCIDENT_VIEWS = 519;
const EXPECTED_TOTAL_VIEWS = 524;
const EXPECTED_PUBLIC_FILES = 41;
const PATCHED_SOURCE_DOC_IDS = [
  "60330ec0214f2f9975e0018f58d0590ed6939c82",
  "e54d119139880a3d64db4a69d7b45d6e8f68ffd8"
];

const text = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const hash = (value) => crypto.createHash("sha256").update(String(value || "")).digest("hex");
const sortRows = (rows) => rows.sort((a, b) => Number(a.timeValue || 0) - Number(b.timeValue || 0) || text(a.date).localeCompare(text(b.date)) || text(a.swimmer).localeCompare(text(b.swimmer), "fr"));

function compactObject(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== "" && value !== null && value !== undefined && value !== false && (!Array.isArray(value) || value.length)));
}

function publicTopRow(row) {
  return compactObject({
    id: text(row.id), source: text(row.source), importId: text(row.importId), publicKey: text(row.publicKey), performanceBaseId: text(row.performanceBaseId),
    swimmerId: text(row.swimmerId), swimmerIdentityKey: text(row.swimmerIdentityKey), swimmer: text(row.swimmer), firstName: text(row.firstName), lastName: text(row.lastName), birthDate: text(row.birthDate), sex: text(row.sex),
    club: text(row.club), clubName: text(row.clubName), regionId: text(row.regionId), competition: text(row.competition), location: text(row.location), date: text(row.date), seasonYear: Number(row.seasonYear || 0),
    pool: text(row.pool), course: text(row.course), courseShortLabel: text(row.courseShortLabel), isIntermediate: row.isIntermediate === true, originCourse: text(row.originCourse), category: text(row.category), categoryCode: text(row.categoryCode),
    timeValue: Number(row.timeValue || 0), time: text(row.time), intermediateTimes: Array.isArray(row.intermediateTimes) ? row.intermediateTimes : []
  });
}

function bucketIds(row) {
  const ids = [];
  [text(row.category), ""].forEach((category) => [Number(row.seasonYear || 0), 0].forEach((season) => [text(row.regionId), ""].forEach((region) => {
    ids.push(hash([text(row.course), text(row.sex), category, season, region].join("|")).slice(0, 40));
  })));
  return ids;
}

function chunks(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

async function loadAffectedViews(db) {
  const incident = await db.collection("performanceTopViews").where("updatedAt", "==", INCIDENT_UPDATED_AT).limit(600).get();
  if (incident.size !== EXPECTED_INCIDENT_VIEWS) throw new Error(`Nombre de vues incident inattendu : ${incident.size}/${EXPECTED_INCIDENT_VIEWS}`);
  const patchedSources = await db.getAll(...PATCHED_SOURCE_DOC_IDS.map((id) => db.collection("performances").doc(id)));
  if (patchedSources.some((snapshot) => !snapshot.exists)) throw new Error("Une source des réparations ponctuelles est absente");
  const patchedIds = new Set();
  patchedSources.forEach((snapshot) => bucketIds({ performanceBaseId: snapshot.id, ...(snapshot.data() || {}) }).forEach((id) => patchedIds.add(id)));
  const patched = await db.getAll(...Array.from(patchedIds).map((id) => db.collection("performanceTopViews").doc(id)));
  const views = new Map(incident.docs.map((snapshot) => [snapshot.id, snapshot]));
  patched.filter((snapshot) => snapshot.exists).forEach((snapshot) => views.set(snapshot.id, snapshot));
  if (views.size !== EXPECTED_TOTAL_VIEWS) throw new Error(`Total de vues inattendu : ${views.size}/${EXPECTED_TOTAL_VIEWS}`);
  return views;
}

async function hydrateSources(db, ids) {
  const sourceById = new Map();
  const batches = chunks(ids, 10);
  for (let index = 0; index < batches.length; index += 5) {
    const snapshots = await Promise.all(batches.slice(index, index + 5).map((batch) => db.collection("performances").where("id", "in", batch).get()));
    snapshots.forEach((snapshot) => snapshot.docs.forEach((doc) => {
      const row = { performanceBaseId: doc.id, ...(doc.data() || {}) };
      const id = text(row.id);
      if (sourceById.has(id)) throw new Error(`Identifiant de performance ambigu : ${id}`);
      sourceById.set(id, row);
    }));
    if ((index + 5) % 100 === 0 || index + 5 >= batches.length) console.log(`Hydratation : ${Math.min(index + 5, batches.length)}/${batches.length} lots`);
  }
  return sourceById;
}

async function loadAffectedPublicFiles(storage) {
  const [allFiles] = await storage.getFiles({ prefix: `${PREFIX}/tops/` });
  const files = allFiles.filter((file) => file.name.endsWith(".json"));
  const affected = new Map();
  for (let index = 0; index < files.length; index += 30) {
    const batch = await Promise.all(files.slice(index, index + 30).map(async (file) => ({
      file: file.name.slice(`${PREFIX}/tops/`.length),
      rows: JSON.parse((await file.download())[0].toString("utf8"))
    })));
    batch.forEach(({ file, rows }) => {
      if ((Array.isArray(rows) ? rows : []).some((row) => text(row.swimmerId) === "912" || text(row.swimmerIdentityKey).startsWith("FAUVEAU|ANTOINE|"))) affected.set(file, rows);
    });
  }
  if (affected.size !== EXPECTED_PUBLIC_FILES) throw new Error(`Nombre de fichiers publics inattendu : ${affected.size}/${EXPECTED_PUBLIC_FILES}`);
  return affected;
}

async function main() {
  const apply = process.argv.includes("--apply");
  if (apply && !process.argv.includes("--confirm-524-top-views")) throw new Error("Confirmation requise : --confirm-524-top-views");
  const admin = require(path.join(process.cwd(), "functions", "node_modules", "firebase-admin"));
  const { getFirestore } = require(path.join(process.cwd(), "functions", "node_modules", "firebase-admin", "lib", "firestore"));
  const { getStorage } = require(path.join(process.cwd(), "functions", "node_modules", "firebase-admin", "lib", "storage"));
  if (!admin.getApps().length) admin.initializeApp({ projectId: PROJECT_ID });
  const db = getFirestore();
  const storage = getStorage().bucket(BUCKET);
  const views = await loadAffectedViews(db);
  const publicFiles = await loadAffectedPublicFiles(storage);
  const ids = new Set();
  let viewRows = 0;
  views.forEach((snapshot) => {
    const rows = Array.isArray(snapshot.data()?.rows) ? snapshot.data().rows : [];
    viewRows += rows.length;
    rows.forEach((row) => { if (text(row.id)) ids.add(text(row.id)); });
  });
  let publicRows = 0;
  publicFiles.forEach((rows) => {
    publicRows += rows.length;
    rows.forEach((row) => { if (text(row.id)) ids.add(text(row.id)); });
  });
  const summary = { affectedViews: views.size, viewRows, publicTopFiles: publicFiles.size, publicRows, uniquePerformanceIds: ids.size, sourceReadUpperBound: ids.size, writes: 0 };
  if (!apply) return console.log(JSON.stringify(summary, null, 2));

  const sourceById = await hydrateSources(db, Array.from(ids));
  const missing = Array.from(ids).filter((id) => !sourceById.has(id));
  if (missing.length) throw new Error(`Sources absentes (${missing.length}) : ${missing.slice(0, 20).join(", ")}`);

  const now = new Date().toISOString();
  const repairedViews = new Map();
  views.forEach((snapshot, id) => {
    const current = snapshot.data() || {};
    const rows = sortRows((Array.isArray(current.rows) ? current.rows : []).map((row) => publicTopRow(sourceById.get(text(row.id))))).slice(0, 500);
    repairedViews.set(id, { ...current, rows, rowCount: rows.length, sourceRowCount: rows.length, updatedAt: now });
  });
  const repairedPublicFiles = new Map();
  publicFiles.forEach((rows, file) => repairedPublicFiles.set(file, sortRows(rows.map((row) => publicTopRow(sourceById.get(text(row.id))))).slice(0, 500)));

  const writer = db.bulkWriter({ throttling: { initialOpsPerSecond: 100, maxOpsPerSecond: 200 } });
  repairedViews.forEach((data, id) => writer.set(db.collection("performanceTopViews").doc(id), data));
  await writer.close();

  const write = async (file, data, cacheControl = "public, max-age=31536000, immutable") => storage.file(`${PREFIX}/${file}`).save(JSON.stringify(data), { resumable: false, contentType: "application/json; charset=utf-8", metadata: { cacheControl } });
  for (const [file, rows] of repairedPublicFiles) {
    await write(`tops/${file}`, rows);
    await write(`tops-preview/${file}`, rows.slice(0, 100));
  }
  const manifestFile = storage.file(`${PREFIX}/manifest.json`);
  const manifest = JSON.parse((await manifestFile.download())[0].toString("utf8"));
  await write("manifest.json", { ...manifest, generatedAt: now, lastTargetedRebuild: { generatedAt: now, reason: "repair-antoine-corrupted-top-views", affectedSwimmers: 0, affectedTopBuckets: views.size, affectedPublicTopFiles: publicFiles.size } }, "public, max-age=300");
  await storage.file(`${PREFIX}/version.js`).save(`window.LIVEPALMES_PERFORMANCE_PUBLIC_VERSION = ${JSON.stringify(now)};\n`, { resumable: false, contentType: "application/javascript; charset=utf-8", metadata: { cacheControl: "public, max-age=300" } });
  console.log(JSON.stringify({ ...summary, hydratedSources: sourceById.size, writes: views.size + publicFiles.size * 2 + 2, completedAt: now }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
