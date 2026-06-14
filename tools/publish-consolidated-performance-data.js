const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  buildConsolidatedData,
  writeConsolidatedData,
  DEFAULT_DATA_DIR
} = require("./performance-consolidation");

const rootDir = process.cwd();
const dataDir = path.resolve(rootDir, "performances", "public", "data");
const stagingDir = path.resolve(rootDir, "outputs", "consolidated-publish-staging");

function readArgs(argv) {
  const args = {
    importsPath: "",
    publish: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--imports") args.importsPath = path.resolve(argv[index += 1] || "");
    else if (arg === "--publish") args.publish = true;
  }
  return args;
}

function assertInsideRoot(target) {
  const resolved = path.resolve(target);
  if (!resolved.startsWith(rootDir)) {
    throw new Error(`Chemin hors projet refuse : ${resolved}`);
  }
  return resolved;
}

function copyGeneratedData(sourceDir, targetDir) {
  const source = assertInsideRoot(sourceDir);
  const target = assertInsideRoot(targetDir);
  const files = ["intranap-summary.js", "intranap-swimmers-index.js"];
  const dirs = ["intranap-swimmer-perfs", "intranap-top-source"];

  files.forEach((fileName) => {
    fs.copyFileSync(path.join(source, fileName), path.join(target, fileName));
  });

  dirs.forEach((dirName) => {
    const destination = path.join(target, dirName);
    fs.rmSync(destination, { recursive: true, force: true });
    fs.cpSync(path.join(source, dirName), destination, { recursive: true });
  });
}

function bumpDataVersions(token) {
  const files = [
    path.resolve(rootDir, "performances", "tops.html"),
    path.resolve(rootDir, "performances", "nageur.html")
  ];
  const patterns = [
    /public\/data\/intranap-summary\.js\?v=[^"]+/g,
    /public\/data\/intranap-swimmers-index\.js\?v=[^"]+/g
  ];

  files.forEach((filePath) => {
    let html = fs.readFileSync(filePath, "utf8");
    patterns.forEach((pattern) => {
      html = html.replace(pattern, (match) => `${match.split("?v=")[0]}?v=${token}`);
    });
    fs.writeFileSync(filePath, html, "utf8");
  });
}

function currentDataIsConsolidated() {
  const summaryPath = path.join(dataDir, "intranap-summary.js");
  if (!fs.existsSync(summaryPath)) return false;
  const text = fs.readFileSync(summaryPath, "utf8");
  return text.includes('"consolidated":true');
}

function rebuildHistoricalData() {
  const result = spawnSync(process.execPath, [path.join(rootDir, "tools", "build-intranap-public-data.js")], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: "inherit"
  });
  if (result.status !== 0) {
    throw new Error("Reconstruction de la base historique impossible.");
  }
}

function main() {
  const args = readArgs(process.argv.slice(2));
  const rebuiltHistorical = args.publish || currentDataIsConsolidated();
  if (rebuiltHistorical) {
    rebuildHistoricalData();
  }

  const data = buildConsolidatedData({
    dataDir: DEFAULT_DATA_DIR,
    importsPath: args.importsPath,
    outDir: stagingDir
  });
  writeConsolidatedData(data, stagingDir);

  const report = {
    stagingDir,
    publish: args.publish,
    rebuiltHistorical,
    generatedAt: data.summary.generatedAt,
    importsPath: args.importsPath || "",
    counts: data.summary.counts,
    chunks: data.chunks.size,
    topBuckets: data.topBuckets.size
  };

  if (args.publish) {
    copyGeneratedData(stagingDir, dataDir);
    const token = `consolidated-${data.summary.generatedAt.replace(/[-:.TZ]/g, "").slice(0, 14)}`;
    bumpDataVersions(token);
    report.dataDir = dataDir;
    report.cacheVersion = token;
  }

  console.log(JSON.stringify(report, null, 2));
}

main();
