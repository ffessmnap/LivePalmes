const crypto = require("crypto");
const path = require("path");

const PROJECT_ID = "livepalmes";
const BUCKET = "livepalmes-public-data-718081132564";
const PREFIX = "performance-public-firestore";

function argument(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? String(process.argv[index + 1] || "").trim() : "";
}

const text = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const hash = (value) => crypto.createHash("sha256").update(String(value || "")).digest("hex");
const sortRows = (rows) => rows.sort((a, b) => Number(a.timeValue || 0) - Number(b.timeValue || 0) || text(a.date).localeCompare(text(b.date)) || text(a.swimmer).localeCompare(text(b.swimmer), "fr"));

function topRow(row) {
  const fields = ["id", "source", "importId", "publicKey", "performanceBaseId", "swimmerId", "swimmerIdentityKey", "swimmer", "firstName", "lastName", "birthDate", "sex", "club", "clubName", "regionId", "competition", "location", "date", "seasonYear", "pool", "course", "courseShortLabel", "isIntermediate", "originCourse", "category", "categoryCode", "timeValue", "time", "intermediateTimes"];
  return Object.fromEntries(fields.map((field) => [field, row[field]]).filter(([, value]) => value !== "" && value !== null && value !== undefined && value !== false && (!Array.isArray(value) || value.length)));
}

function bucketIds(row) {
  const ids = [];
  [text(row.category), ""].forEach((category) => [Number(row.seasonYear || 0), 0].forEach((season) => [text(row.regionId), ""].forEach((region) => {
    ids.push(hash([text(row.course), text(row.sex), category, season, region].join("|")).slice(0, 40));
  })));
  return ids;
}

async function main() {
  const docId = argument("doc-id");
  const expectedId = argument("expected-id");
  const expectedIdentity = argument("expected-identity");
  const expectedSwimmerId = argument("expected-swimmer-id");
  const topFile = argument("top-file");
  const apply = process.argv.includes("--apply");
  if (!docId || !expectedId || !expectedIdentity || !expectedSwimmerId || !topFile) throw new Error("Arguments requis : --doc-id, --expected-id, --expected-identity, --expected-swimmer-id et --top-file");
  if (apply && !process.argv.includes("--confirm-targeted-top-repair")) throw new Error("Confirmation requise : --confirm-targeted-top-repair");

  const admin = require(path.join(process.cwd(), "functions", "node_modules", "firebase-admin"));
  const { getFirestore } = require(path.join(process.cwd(), "functions", "node_modules", "firebase-admin", "lib", "firestore"));
  const { getStorage } = require(path.join(process.cwd(), "functions", "node_modules", "firebase-admin", "lib", "storage"));
  if (!admin.getApps().length) admin.initializeApp({ projectId: PROJECT_ID });
  const db = getFirestore();
  const source = await db.collection("performances").doc(docId).get();
  const row = { performanceBaseId: source.id, ...(source.data() || {}) };
  if (!source.exists || text(row.id) !== expectedId || text(row.swimmerIdentityKey) !== expectedIdentity || text(row.swimmerId) !== expectedSwimmerId) throw new Error("La source Firestore ne correspond pas à l'identité attendue");

  const snapshots = await db.getAll(...bucketIds(row).map((bucketId) => db.collection("performanceTopViews").doc(bucketId)));
  const existingViews = snapshots.filter((snapshot) => snapshot.exists);
  const summary = { source: { id: row.id, swimmer: row.swimmer, identity: row.swimmerIdentityKey, time: row.time }, reads: 1 + snapshots.length, topViews: existingViews.length, writes: 0 };
  if (!apply) return console.log(JSON.stringify(summary, null, 2));

  const storage = getStorage().bucket(BUCKET);
  const read = async (file) => JSON.parse((await storage.file(`${PREFIX}/${file}`).download())[0].toString("utf8"));
  const write = async (file, data, cacheControl = "public, max-age=31536000, immutable") => storage.file(`${PREFIX}/${file}`).save(JSON.stringify(data), { resumable: false, contentType: "application/json; charset=utf-8", metadata: { cacheControl } });
  const matches = (item) => text(item.id) === expectedId || (text(item.performanceBaseId) && text(item.performanceBaseId) === docId);
  const fixed = topRow(row);
  const top = sortRows((await read(`tops/${topFile}`)).filter((item) => !matches(item)).concat(fixed)).slice(0, 500);
  await write(`tops/${topFile}`, top);
  await write(`tops-preview/${topFile}`, top.slice(0, 100));

  const now = new Date().toISOString();
  const writer = db.bulkWriter();
  existingViews.forEach((snapshot) => {
    const current = snapshot.data() || {};
    const rows = sortRows((Array.isArray(current.rows) ? current.rows : []).filter((item) => !matches(item)).concat(fixed)).slice(0, 500);
    writer.set(snapshot.ref, { ...current, rows, rowCount: rows.length, sourceRowCount: rows.length, updatedAt: now });
  });
  await writer.close();
  const manifest = await read("manifest.json");
  await write("manifest.json", { ...manifest, generatedAt: now, lastTargetedRebuild: { generatedAt: now, reason: `repair-public-top-${expectedId}`, affectedSwimmers: 0, affectedTopBuckets: existingViews.length } }, "public, max-age=300");
  await storage.file(`${PREFIX}/version.js`).save(`window.LIVEPALMES_PERFORMANCE_PUBLIC_VERSION = ${JSON.stringify(now)};\n`, { resumable: false, contentType: "application/javascript; charset=utf-8", metadata: { cacheControl: "public, max-age=300" } });
  console.log(JSON.stringify({ ...summary, writes: 4 + existingViews.length, completedAt: now }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
