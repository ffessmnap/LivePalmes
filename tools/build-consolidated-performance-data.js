const path = require("path");
const {
  buildConsolidatedData,
  writeConsolidatedData,
  DEFAULT_DATA_DIR,
  DEFAULT_OUT_DIR
} = require("./performance-consolidation");

function readArgs(argv) {
  const args = {
    dataDir: DEFAULT_DATA_DIR,
    outDir: DEFAULT_OUT_DIR,
    importsPath: ""
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--data-dir") args.dataDir = path.resolve(argv[index += 1] || args.dataDir);
    else if (arg === "--out") args.outDir = path.resolve(argv[index += 1] || args.outDir);
    else if (arg === "--imports") args.importsPath = path.resolve(argv[index += 1] || "");
  }
  return args;
}

function main() {
  const args = readArgs(process.argv.slice(2));
  const data = buildConsolidatedData(args);
  writeConsolidatedData(data, args.outDir);
  console.log(JSON.stringify({
    outDir: args.outDir,
    generatedAt: data.summary.generatedAt,
    counts: data.summary.counts,
    chunks: data.chunks.size,
    topBuckets: data.topBuckets.size
  }, null, 2));
}

main();
