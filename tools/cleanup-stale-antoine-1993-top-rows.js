const crypto = require("crypto");
const path = require("path");

const PROJECT_ID = "livepalmes";
const BUCKET = "livepalmes-public-data-718081132564";
const PREFIX = "performance-public-firestore";
const STALE_IDENTITY = "FAUVEAU|ANTOINE|1993-07-01";
const EXPECTED_STALE_ROWS = 8;

const text = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const hash = (value) => crypto.createHash("sha256").update(String(value || "")).digest("hex");

function bucketIds(row) {
  const ids = [];
  [text(row.category), ""].forEach((category) => [Number(row.seasonYear || 0), 0].forEach((season) => [text(row.regionId), ""].forEach((region) => {
    ids.push(hash([text(row.course), text(row.sex), category, season, region].join("|")).slice(0, 40));
  })));
  return ids;
}

async function main() {
  const apply = process.argv.includes("--apply");
  if (apply && !process.argv.includes("--confirm-8-stale-rows")) throw new Error("Confirmation requise : --confirm-8-stale-rows");
  const admin = require(path.join(process.cwd(), "functions", "node_modules", "firebase-admin"));
  const { getFirestore } = require(path.join(process.cwd(), "functions", "node_modules", "firebase-admin", "lib", "firestore"));
  const { getStorage } = require(path.join(process.cwd(), "functions", "node_modules", "firebase-admin", "lib", "storage"));
  if (!admin.getApps().length) admin.initializeApp({ projectId: PROJECT_ID });
  const db = getFirestore();
  const storage = getStorage().bucket(BUCKET);
  const [allFiles] = await storage.getFiles({ prefix: `${PREFIX}/tops/` });
  const files = allFiles.filter((file) => file.name.endsWith(".json"));
  const affected = new Map();
  const staleRows = [];
  for (let index = 0; index < files.length; index += 30) {
    const batch = await Promise.all(files.slice(index, index + 30).map(async (file) => ({ file, rows: JSON.parse((await file.download())[0].toString("utf8")) })));
    batch.forEach(({ file, rows }) => {
      const stale = rows.filter((row) => text(row.swimmerIdentityKey) === STALE_IDENTITY);
      if (stale.length) {
        affected.set(file.name.slice(`${PREFIX}/tops/`.length), rows);
        staleRows.push(...stale);
      }
    });
  }
  if (staleRows.length !== EXPECTED_STALE_ROWS) throw new Error(`Nombre de lignes résiduelles inattendu : ${staleRows.length}/${EXPECTED_STALE_ROWS}`);
  const viewIds = new Set();
  staleRows.forEach((row) => bucketIds(row).forEach((id) => viewIds.add(id)));
  const views = (await db.getAll(...Array.from(viewIds).map((id) => db.collection("performanceTopViews").doc(id)))).filter((snapshot) => snapshot.exists);
  const summary = { staleRows: staleRows.length, publicFiles: affected.size, candidateViews: viewIds.size, existingViews: views.length, writes: 0 };
  if (!apply) return console.log(JSON.stringify(summary, null, 2));
  const now = new Date().toISOString();
  const write = async (file, data, cacheControl = "public, max-age=31536000, immutable") => storage.file(`${PREFIX}/${file}`).save(JSON.stringify(data), { resumable: false, contentType: "application/json; charset=utf-8", metadata: { cacheControl } });
  for (const [file, rows] of affected) {
    const cleaned = rows.filter((row) => text(row.swimmerIdentityKey) !== STALE_IDENTITY);
    await write(`tops/${file}`, cleaned);
    await write(`tops-preview/${file}`, cleaned.slice(0, 100));
  }
  const writer = db.bulkWriter();
  views.forEach((snapshot) => {
    const current = snapshot.data() || {};
    const rows = (Array.isArray(current.rows) ? current.rows : []).filter((row) => text(row.swimmerIdentityKey) !== STALE_IDENTITY);
    writer.set(snapshot.ref, { ...current, rows, rowCount: rows.length, sourceRowCount: rows.length, updatedAt: now });
  });
  await writer.close();
  const manifest = JSON.parse((await storage.file(`${PREFIX}/manifest.json`).download())[0].toString("utf8"));
  await write("manifest.json", { ...manifest, generatedAt: now, lastTargetedRebuild: { generatedAt: now, reason: "cleanup-stale-antoine-1993-top-rows", affectedSwimmers: 1, affectedTopBuckets: views.length, affectedPublicTopFiles: affected.size } }, "public, max-age=300");
  await storage.file(`${PREFIX}/version.js`).save(`window.LIVEPALMES_PERFORMANCE_PUBLIC_VERSION = ${JSON.stringify(now)};\n`, { resumable: false, contentType: "application/javascript; charset=utf-8", metadata: { cacheControl: "public, max-age=300" } });
  console.log(JSON.stringify({ ...summary, writes: affected.size * 2 + views.length + 2, completedAt: now }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
