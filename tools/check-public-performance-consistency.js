const path = require("node:path");
const { checkPerformancePublicConsistency } = require("./performance-public-consistency");

const rootDir = process.cwd();

function readArgs(argv) {
  const args = {
    seedPath: path.join(rootDir, "outputs", "performance-base-firestore-active.ndjson"),
    outDir: path.join(rootDir, "performances", "public", "data", "performance-public-firestore"),
    maxErrors: 50
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--seed") args.seedPath = path.resolve(argv[index += 1] || "");
    else if (arg === "--public-dir") args.outDir = path.resolve(argv[index += 1] || "");
    else if (arg === "--max-errors") args.maxErrors = Math.max(1, Number(argv[index += 1] || 50) || 50);
  }
  return args;
}

async function main() {
  const result = await checkPerformancePublicConsistency(readArgs(process.argv.slice(2)));
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
