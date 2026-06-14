const fs = require("fs");
const path = require("path");

const rootDir = process.cwd();
const dataDir = path.join(rootDir, "performances", "public", "data");
const chunksDir = path.join(dataDir, "intranap-swimmer-perfs");
const outPath = path.join(dataDir, "performance-base-migration-manifest.json");

function countChunk(filePath) {
  const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
  let performanceCount = 0;
  const swimmerIds = Object.keys(payload || {});
  swimmerIds.forEach((swimmerId) => {
    const rows = payload[swimmerId];
    if (Array.isArray(rows)) performanceCount += rows.length;
  });
  return {
    swimmerCount: swimmerIds.length,
    performanceCount
  };
}

function main() {
  const files = fs.readdirSync(chunksDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^chunk-[A-Za-z0-9-]+\.json$/.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "fr-FR", { numeric: true }));

  const chunks = files.map((name) => {
    const filePath = path.join(chunksDir, name);
    const stats = fs.statSync(filePath);
    return {
      name,
      bytes: stats.size,
      ...countChunk(filePath)
    };
  });

  const manifest = {
    ok: true,
    generatedAt: new Date().toISOString(),
    source: "performances/public/data/intranap-swimmer-perfs",
    chunkCount: chunks.length,
    totalPerformances: chunks.reduce((sum, chunk) => sum + chunk.performanceCount, 0),
    chunks
  };

  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2), "utf8");
  console.log(JSON.stringify({
    ok: true,
    out: outPath,
    chunkCount: manifest.chunkCount,
    totalPerformances: manifest.totalPerformances
  }, null, 2));
}

main();
