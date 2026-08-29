const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const { execFileSync } = require("node:child_process");

const rootDir = process.cwd();
const defaultBase = path.join(rootDir, "outputs", "performance-base-firestore-active.ndjson");
const defaultOutput = path.join(rootDir, "outputs", "performance-base-firestore-active-delta.ndjson");
const poolCourses = new Set(["50SF", "100SF", "200SF", "400SF", "800SF", "1500SF", "50AP", "100IS", "200IS", "400IS", "50BI", "100BI", "200BI", "400BI"]);

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function readArgs(argv) {
  const args = {
    projectId: "livepalmes",
    database: "(default)",
    base: defaultBase,
    output: defaultOutput,
    since: "",
    maxDocuments: 5000
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--project") args.projectId = argv[index += 1] || args.projectId;
    else if (arg === "--database") args.database = argv[index += 1] || args.database;
    else if (arg === "--base") args.base = path.resolve(argv[index += 1] || "");
    else if (arg === "--output") args.output = path.resolve(argv[index += 1] || "");
    else if (arg === "--since") args.since = cleanText(argv[index += 1]);
    else if (arg === "--max-documents") args.maxDocuments = Math.max(1, Math.min(10000, Number(argv[index += 1] || 5000) || 5000));
  }
  return args;
}

function ensureInsideRoot(target) {
  const resolved = path.resolve(target);
  if (!resolved.startsWith(rootDir)) throw new Error(`Chemin hors projet refusé : ${resolved}`);
  return resolved;
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

function publicRowFromDocument(doc = {}) {
  const documentId = cleanText(doc.name).split("/").pop();
  const row = firestoreFields(doc.fields || {});
  return {
    ...row,
    performanceBaseId: cleanText(row.performanceBaseId || documentId),
    publicKey: cleanText(row.publicKey),
    source: cleanText(row.source || "livepalmes")
  };
}

function shouldExportRow(row = {}) {
  if (row.active === false) return false;
  const status = cleanText(row.status || "active");
  return (!status || status === "active") &&
    poolCourses.has(cleanText(row.course)) &&
    (cleanText(row.sex) === "F" || cleanText(row.sex) === "M") &&
    Boolean(cleanText(row.category)) &&
    Number(row.timeValue || 0) > 0;
}

function rowKey(row = {}) {
  return cleanText(row.performanceBaseId || row.id || row.publicKey);
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

async function readFirestoreDelta({ projectId, database, since, maxDocuments, token }) {
  const endpoint = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(database)}/documents:runQuery`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "performances" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "updatedAt" },
            op: "GREATER_THAN_OR_EQUAL",
            value: { stringValue: since }
          }
        },
        orderBy: [
          { field: { fieldPath: "updatedAt" }, direction: "ASCENDING" },
          { field: { fieldPath: "__name__" }, direction: "ASCENDING" }
        ],
        limit: maxDocuments + 1
      }
    })
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : [];
  if (!response.ok) throw new Error(`Lecture différentielle impossible (${response.status}) : ${payload?.error?.message || text.slice(0, 500)}`);
  const documents = (Array.isArray(payload) ? payload : []).map((item) => item.document).filter(Boolean);
  if (documents.length > maxDocuments) {
    throw new Error(`Synchronisation refusée : plus de ${maxDocuments} documents correspondent à la fenêtre depuis ${since}.`);
  }
  return documents.map(publicRowFromDocument);
}

async function mergeSeedDelta({ base, output, changes }) {
  const changeById = new Map();
  changes.forEach((row) => {
    const key = rowKey(row);
    if (!key) throw new Error("Document différentiel sans identifiant exploitable.");
    changeById.set(key, row);
  });

  const temporary = `${output}.tmp`;
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const writer = fs.createWriteStream(temporary, { encoding: "utf8" });
  const lines = readline.createInterface({ input: fs.createReadStream(base, { encoding: "utf8" }), crlfDelay: Infinity });
  const seen = new Set();
  let baseRows = 0;
  let writtenRows = 0;
  let updatedRows = 0;
  let removedRows = 0;
  let addedRows = 0;

  for await (const line of lines) {
    if (!line.trim()) continue;
    baseRows += 1;
    const current = JSON.parse(line);
    const key = rowKey(current);
    const replacement = changeById.get(key);
    if (!replacement) {
      writer.write(`${line.trim()}\n`);
      writtenRows += 1;
      continue;
    }
    seen.add(key);
    updatedRows += 1;
    if (shouldExportRow(replacement)) {
      writer.write(`${JSON.stringify(replacement)}\n`);
      writtenRows += 1;
    } else {
      removedRows += 1;
    }
  }

  for (const [key, row] of changeById.entries()) {
    if (seen.has(key) || !shouldExportRow(row)) continue;
    writer.write(`${JSON.stringify(row)}\n`);
    writtenRows += 1;
    addedRows += 1;
  }

  await new Promise((resolve, reject) => {
    writer.end(resolve);
    writer.on("error", reject);
  });
  if (fs.existsSync(output)) fs.rmSync(output);
  fs.renameSync(temporary, output);
  return { baseRows, writtenRows, updatedRows, removedRows, addedRows, deltaDocuments: changes.length };
}

async function main() {
  const args = readArgs(process.argv.slice(2));
  const base = ensureInsideRoot(args.base);
  const output = ensureInsideRoot(args.output);
  if (!fs.existsSync(base)) throw new Error(`Export de référence introuvable : ${base}`);
  if (base === output) throw new Error("Le fichier différentiel ne doit pas écraser l’export de référence.");
  const since = args.since || new Date(fs.statSync(base).mtimeMs - 24 * 60 * 60 * 1000).toISOString();
  if (!Number.isFinite(Date.parse(since))) throw new Error(`Date --since invalide : ${since}`);

  console.log(JSON.stringify({ step: "delta-query", projectId: args.projectId, database: args.database, since, maxDocuments: args.maxDocuments }, null, 2));
  const changes = await readFirestoreDelta({ ...args, since, token: firebaseAccessToken() });
  const result = await mergeSeedDelta({ base, output, changes });
  console.log(JSON.stringify({ ok: true, since, output: path.relative(rootDir, output), ...result }, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error?.stack || error);
    process.exit(1);
  });
}

module.exports = {
  mergeSeedDelta,
  publicRowFromDocument,
  rowKey,
  shouldExportRow
};
