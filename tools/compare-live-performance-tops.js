const fs = require("node:fs");
const path = require("node:path");
const {
  sameBestPerformance,
  topCandidateKey
} = require("./performance-public-consistency");

const rootDir = process.cwd();
const defaultExpectedDir = path.join(rootDir, "outputs", "performance-public-firestore-delta");
const defaultBaseUrl = "https://storage.googleapis.com/livepalmes-public-data-718081132564/performance-public-firestore";

function cleanText(value) {
  return String(value || "").trim();
}

function readArgs(argv) {
  const args = { expectedDir: defaultExpectedDir, baseUrl: defaultBaseUrl, maxExamples: 100 };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--expected-dir") args.expectedDir = path.resolve(argv[index += 1] || "");
    else if (arg === "--base-url") args.baseUrl = cleanText(argv[index += 1]).replace(/\/+$/, "");
    else if (arg === "--max-examples") args.maxExamples = Math.max(1, Number(argv[index += 1] || 100) || 100);
  }
  return args;
}

function jsonFiles(dir) {
  const files = [];
  const walk = (current) => fs.readdirSync(current, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".json")) files.push(full);
  });
  walk(dir);
  return files.sort();
}

function candidateMap(rows = []) {
  return new Map(rows.map((row) => [topCandidateKey(row), row]));
}

function performanceSummary(row = {}) {
  return {
    swimmer: cleanText(row.swimmer),
    course: cleanText(row.course),
    sex: cleanText(row.sex),
    category: cleanText(row.category),
    seasonYear: Number(row.seasonYear || 0) || 0,
    regionId: cleanText(row.regionId),
    time: cleanText(row.time),
    timeValue: Number(row.timeValue || 0) || 0,
    date: cleanText(row.date)
  };
}

async function fetchJson(url) {
  const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}audit=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Téléchargement impossible (${response.status}) : ${url}`);
  return response.json();
}

async function main() {
  const args = readArgs(process.argv.slice(2));
  const topDir = path.join(args.expectedDir, "tops");
  if (!fs.existsSync(topDir)) throw new Error(`Dossier TOP attendu introuvable : ${topDir}`);
  const expectedManifest = JSON.parse(fs.readFileSync(path.join(args.expectedDir, "manifest.json"), "utf8"));
  const liveManifest = await fetchJson(`${args.baseUrl}/manifest.json`);
  const files = jsonFiles(topDir);
  const examples = [];
  let expectedCandidates = 0;
  let liveCandidates = 0;
  let missing = 0;
  let extra = 0;
  let different = 0;

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const relative = path.relative(args.expectedDir, file).replace(/\\/g, "/");
    const expectedRows = JSON.parse(fs.readFileSync(file, "utf8"));
    const liveRows = await fetchJson(`${args.baseUrl}/${relative}`);
    const expected = candidateMap(expectedRows);
    const live = candidateMap(liveRows);
    expectedCandidates += expected.size;
    liveCandidates += live.size;
    for (const [key, expectedRow] of expected.entries()) {
      const liveRow = live.get(key);
      if (!liveRow) {
        missing += 1;
        if (examples.length < args.maxExamples) examples.push({ type: "missing", file: relative, key, expected: performanceSummary(expectedRow) });
      } else if (!sameBestPerformance(expectedRow, liveRow)) {
        different += 1;
        if (examples.length < args.maxExamples) examples.push({ type: "different", file: relative, key, expected: performanceSummary(expectedRow), live: performanceSummary(liveRow) });
      }
    }
    for (const [key, liveRow] of live.entries()) {
      if (expected.has(key)) continue;
      extra += 1;
      if (examples.length < args.maxExamples) examples.push({ type: "extra", file: relative, key, live: performanceSummary(liveRow) });
    }
    if ((index + 1) % 50 === 0) console.log(`Comparaison Storage : ${index + 1}/${files.length}`);
  }

  console.log(JSON.stringify({
    ok: missing === 0 && extra === 0 && different === 0,
    expectedManifest: {
      generatedAt: expectedManifest.generatedAt,
      rowCount: expectedManifest.rowCount,
      topCandidates: expectedManifest.topCandidates
    },
    liveManifest: {
      generatedAt: liveManifest.generatedAt,
      rowCount: liveManifest.rowCount,
      topCandidates: liveManifest.topCandidates
    },
    files: files.length,
    expectedCandidates,
    liveCandidates,
    missing,
    extra,
    different,
    totalDiscrepancies: missing + extra + different,
    examples
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
