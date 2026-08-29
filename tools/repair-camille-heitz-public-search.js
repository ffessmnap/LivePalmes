const fs = require("node:fs");
const path = require("node:path");

const PROJECT_ID = "livepalmes";
const PUBLIC_BUCKET = "livepalmes-public-data-718081132564";
const PUBLIC_PREFIX = "performance-public-firestore";
const SWIMMER_ID = "16423";
const IDENTITY_KEY = "HEITZ|CAMILLE|1986-03-19";
const SEARCH_SHARDS = ["ca", "he"];
const ID_SHARD = "16";
const sourcePath = path.resolve(process.cwd(), "performances", "public", "data", "performance-public", "search", "he.json");

function cleanText(value) {
  return String(value ?? "").trim();
}

function compactSearchRow(row = {}) {
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined));
}

function sourceRow() {
  const rows = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  const row = rows.find((item) => cleanText(item.id) === SWIMMER_ID && cleanText(item.identityKey) === IDENTITY_KEY);
  if (!row || !row.perfFile) throw new Error("Source Camille HEITZ introuvable ou incomplète.");
  return compactSearchRow(row);
}

async function readJson(file, fallback) {
  try {
    const [buffer] = await file.download();
    return JSON.parse(buffer.toString("utf8"));
  } catch (error) {
    if (error?.code === 404) return fallback;
    throw error;
  }
}

function mergeRows(rows, row) {
  const byId = new Map((Array.isArray(rows) ? rows : []).map((item) => [cleanText(item.id), item]));
  byId.set(SWIMMER_ID, row);
  return Array.from(byId.values()).sort((left, right) =>
    cleanText(left.lastName).localeCompare(cleanText(right.lastName), "fr-FR") ||
    cleanText(left.firstName).localeCompare(cleanText(right.firstName), "fr-FR")
  );
}

async function main() {
  const apply = process.argv.includes("--apply");
  const admin = require(path.resolve(process.cwd(), "functions", "node_modules", "firebase-admin"));
  const { getStorage } = require(path.resolve(process.cwd(), "functions", "node_modules", "firebase-admin", "lib", "storage"));
  if (!admin.getApps().length) admin.initializeApp({ projectId: PROJECT_ID });
  const bucket = getStorage().bucket(PUBLIC_BUCKET);
  const row = sourceRow();
  const targets = [
    ...SEARCH_SHARDS.map((shard) => ({ path: `search/${shard}.json`, type: "search" })),
    { path: `ids/${ID_SHARD}.json`, type: "ids" }
  ];
  const preview = [];

  for (const target of targets) {
    const file = bucket.file(`${PUBLIC_PREFIX}/${target.path}`);
    const current = await readJson(file, target.type === "search" ? [] : {});
    const next = target.type === "search"
      ? mergeRows(current, row)
      : { ...(current && typeof current === "object" ? current : {}), [SWIMMER_ID]: row };
    preview.push({ path: target.path, before: target.type === "search" ? current.length : Object.keys(current).length, after: target.type === "search" ? next.length : Object.keys(next).length });
    if (apply) {
      await file.save(JSON.stringify(next), {
        resumable: false,
        contentType: "application/json; charset=utf-8",
        metadata: { cacheControl: "public, max-age=31536000, immutable" }
      });
    }
  }

  console.log(JSON.stringify({ apply, swimmer: { id: row.id, name: row.name, perfFile: row.perfFile }, files: preview }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
