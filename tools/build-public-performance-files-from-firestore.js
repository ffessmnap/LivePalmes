const fs = require("fs");
const path = require("path");
const { spawnSync, execFileSync } = require("child_process");

const rootDir = process.cwd();
const defaultSeed = path.join(rootDir, "outputs", "performance-base-firestore-active.ndjson");
const defaultOutDir = path.join(rootDir, "performances", "public", "data", "performance-public-firestore");
const defaultProjectId = "livepalmes";
const defaultDatabase = "(default)";
const POOL_COURSES = new Set(["50SF", "100SF", "200SF", "400SF", "800SF", "1500SF", "50AP", "100IS", "200IS", "400IS", "50BI", "100BI", "200BI", "400BI"]);

function readArgs(argv) {
  const args = {
    projectId: defaultProjectId,
    database: defaultDatabase,
    seed: defaultSeed,
    outDir: defaultOutDir,
    pageSize: 1000,
    limit: 0,
    exportOnly: false,
    buildOnly: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--project") args.projectId = argv[index += 1] || args.projectId;
    else if (arg === "--database") args.database = argv[index += 1] || args.database;
    else if (arg === "--seed") args.seed = path.resolve(argv[index += 1] || "");
    else if (arg === "--out-dir") args.outDir = path.resolve(argv[index += 1] || "");
    else if (arg === "--page-size") args.pageSize = Number(argv[index += 1] || args.pageSize) || args.pageSize;
    else if (arg === "--limit") args.limit = Number(argv[index += 1] || 0) || 0;
    else if (arg === "--export-only") args.exportOnly = true;
    else if (arg === "--build-only") args.buildOnly = true;
  }
  args.pageSize = Math.min(Math.max(args.pageSize, 100), 1000);
  return args;
}

function ensureInsideRoot(target) {
  const resolved = path.resolve(target);
  if (!resolved.startsWith(rootDir)) throw new Error(`Chemin hors projet refuse : ${resolved}`);
  return resolved;
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function firestoreValue(value) {
  if (!value || typeof value !== "object") return value;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return Boolean(value.booleanValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(firestoreValue);
  if ("mapValue" in value) return firestoreFields(value.mapValue.fields || {});
  return value;
}

function firestoreFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, firestoreValue(value)]));
}

function firebaseAccessToken() {
  const output = execFileSync("cmd.exe", ["/c", "firebase.cmd", "login:list", "--json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const parsed = JSON.parse(output);
  const token = parsed.result?.[0]?.tokens?.access_token;
  if (!token) throw new Error("Jeton Firebase CLI introuvable. Lancer firebase login --reauth.");
  return token;
}

async function firebaseGetJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`Lecture Firestore impossible (${response.status}) : ${data?.error?.message || text.slice(0, 500)}`);
  }
  return data;
}

function publicRowFromDocument(doc) {
  const id = String(doc.name || "").split("/").pop();
  const row = firestoreFields(doc.fields || {});
  return {
    ...row,
    performanceBaseId: cleanText(row.performanceBaseId || id),
    publicKey: cleanText(row.publicKey),
    source: cleanText(row.source || "livepalmes")
  };
}

function shouldExportRow(row) {
  if (row.active === false) return false;
  const status = cleanText(row.status || "active");
  if (status && status !== "active") return false;
  if (!POOL_COURSES.has(cleanText(row.course))) return false;
  if (cleanText(row.sex) !== "F" && cleanText(row.sex) !== "M") return false;
  if (!cleanText(row.category)) return false;
  return Number(row.timeValue || 0) > 0;
}

async function exportFirestoreSeed(args) {
  const seedPath = ensureInsideRoot(args.seed);
  fs.mkdirSync(path.dirname(seedPath), { recursive: true });
  const stream = fs.createWriteStream(seedPath, { encoding: "utf8" });
  const token = firebaseAccessToken();
  const encodedDatabase = encodeURIComponent(args.database);
  let pageToken = "";
  let read = 0;
  let written = 0;
  let skipped = 0;

  do {
    const url = new URL(`https://firestore.googleapis.com/v1/projects/${args.projectId}/databases/${encodedDatabase}/documents/performances`);
    url.searchParams.set("pageSize", String(args.pageSize));
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const page = await firebaseGetJson(url.toString(), token);
    for (const doc of page.documents || []) {
      read += 1;
      const row = publicRowFromDocument(doc);
      if (!shouldExportRow(row)) {
        skipped += 1;
        continue;
      }
      stream.write(`${JSON.stringify(row)}\n`);
      written += 1;
      if (args.limit && written >= args.limit) break;
    }
    if (written && written % 25000 === 0) {
      console.log(`Export Firestore : ${written} lignes ecrites (${read} lues)`);
    }
    if (args.limit && written >= args.limit) break;
    pageToken = page.nextPageToken || "";
  } while (pageToken);

  await new Promise((resolve, reject) => {
    stream.end(resolve);
    stream.on("error", reject);
  });

  return { seedPath, read, written, skipped, limited: Boolean(args.limit) };
}

function buildPublicFiles(args) {
  const seedPath = ensureInsideRoot(args.seed);
  const outDir = ensureInsideRoot(args.outDir);
  const script = path.join(rootDir, "tools", "build-public-performance-files.js");
  const result = spawnSync(process.execPath, [script, "--seed", seedPath, "--out-dir", outDir], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: "pipe"
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`Generation des fichiers publics impossible (code ${result.status}).`);
  }
}

async function main() {
  const args = readArgs(process.argv.slice(2));
  if (args.exportOnly && args.buildOnly) throw new Error("--export-only et --build-only sont incompatibles.");

  let exportResult = null;
  if (!args.buildOnly) {
    exportResult = await exportFirestoreSeed(args);
    console.log(JSON.stringify({
      ok: true,
      step: "export",
      seed: path.relative(rootDir, exportResult.seedPath),
      read: exportResult.read,
      written: exportResult.written,
      skipped: exportResult.skipped,
      limited: exportResult.limited
    }, null, 2));
  }

  if (!args.exportOnly) {
    buildPublicFiles(args);
  }
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
