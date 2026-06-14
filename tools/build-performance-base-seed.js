const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const {
  readHistoricalData,
  DEFAULT_DATA_DIR
} = require("./performance-consolidation");

const rootDir = process.cwd();
const defaultOut = path.join(rootDir, "outputs", "performance-base-seed.ndjson");

function cleanText(value) {
  return String(value || "").trim();
}

function stableHash(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function performancePublicKey(row = {}) {
  if (row.publicKey) return cleanText(row.publicKey);
  if (row.id) return `${row.source || "intranap"}|${row.id}`;
  return [
    row.swimmerIdentityKey || row.swimmerId || row.swimmer,
    row.date,
    row.course,
    row.timeValue,
    row.club || row.clubName,
    row.competitionId || row.location
  ].map((value) => cleanText(value)).join("|");
}

function readArgs(argv) {
  const args = {
    dataDir: DEFAULT_DATA_DIR,
    out: defaultOut,
    limit: 0
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--data-dir") args.dataDir = path.resolve(argv[index += 1] || "");
    else if (arg === "--out") args.out = path.resolve(argv[index += 1] || "");
    else if (arg === "--limit") args.limit = Number(argv[index += 1] || 0) || 0;
  }
  return args;
}

function ensureInsideRoot(target) {
  const resolved = path.resolve(target);
  if (!resolved.startsWith(rootDir)) {
    throw new Error(`Chemin hors projet refuse : ${resolved}`);
  }
  return resolved;
}

function main() {
  const args = readArgs(process.argv.slice(2));
  const outPath = ensureInsideRoot(args.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const historical = readHistoricalData(args.dataDir);
  const seen = new Set();
  let written = 0;
  let duplicates = 0;
  const stream = fs.createWriteStream(outPath, { encoding: "utf8" });

  for (const row of historical.allPerfs) {
    const publicKey = performancePublicKey(row);
    if (!publicKey) continue;
    if (seen.has(publicKey)) {
      duplicates += 1;
      continue;
    }
    seen.add(publicKey);
    const performanceBaseId = stableHash(publicKey).slice(0, 40);
    stream.write(`${JSON.stringify({
      performanceBaseId,
      publicKey,
      status: "active",
      active: true,
      baseVersion: 1,
      sourceAction: "historicalSeed",
      ...row
    })}\n`);
    written += 1;
    if (args.limit && written >= args.limit) break;
  }

  stream.end(() => {
    console.log(JSON.stringify({
      ok: true,
      out: outPath,
      sourcePerformances: historical.allPerfs.length,
      written,
      duplicates,
      limited: Boolean(args.limit)
    }, null, 2));
  });
}

main();
