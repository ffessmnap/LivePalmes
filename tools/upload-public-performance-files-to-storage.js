const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const {
  checkPerformancePublicConsistency,
  sortPerformancePublicationFiles,
} = require("./performance-public-consistency");

const rootDir = process.cwd();
const defaultSourceDir = path.join(rootDir, "performances", "public", "data", "performance-public-firestore");
const defaultBucket = "livepalmes-public-data-718081132564";
const defaultPrefix = "performance-public-firestore";

function readArgs(argv) {
  const args = {
    sourceDir: defaultSourceDir,
    seedPath: path.join(rootDir, "outputs", "performance-base-firestore-active.ndjson"),
    bucket: defaultBucket,
    prefix: defaultPrefix,
    concurrency: 8,
    configureCors: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--source-dir") args.sourceDir = path.resolve(argv[index += 1] || "");
    else if (arg === "--seed") args.seedPath = path.resolve(argv[index += 1] || "");
    else if (arg === "--bucket") args.bucket = argv[index += 1] || args.bucket;
    else if (arg === "--prefix") args.prefix = String(argv[index += 1] || args.prefix).replace(/^\/+|\/+$/g, "");
    else if (arg === "--concurrency") args.concurrency = Math.max(1, Math.min(32, Number(argv[index += 1] || 8) || 8));
    else if (arg === "--configure-cors") args.configureCors = true;
  }
  return args;
}

function ensureInsideRoot(target) {
  const resolved = path.resolve(target);
  if (!resolved.startsWith(rootDir)) throw new Error(`Chemin hors projet refuse : ${resolved}`);
  return resolved;
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

function walkFiles(dir) {
  const files = [];
  const walk = (current) => {
    fs.readdirSync(current, { withFileTypes: true }).forEach((entry) => {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else files.push(full);
    });
  };
  walk(dir);
  return files;
}

function contentType(file) {
  if (file.endsWith(".json")) return "application/json; charset=utf-8";
  if (file.endsWith(".js")) return "application/javascript; charset=utf-8";
  return "application/octet-stream";
}

function cacheControl(relativePath) {
  return /(^|\/)(manifest\.json|version\.js)$/.test(relativePath)
    ? "public, max-age=300"
    : "public, max-age=31536000, immutable";
}

function multipartBody(metadata, bytes) {
  const boundary = `livepalmes-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const head = Buffer.from(
    `--${boundary}\r\n` +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `${`Content-Type: ${metadata.contentType}`}\r\n\r\n`,
    "utf8"
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");
  return {
    boundary,
    body: Buffer.concat([head, bytes, tail])
  };
}

async function configureCors(bucket, token) {
  const response = await fetch(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      cors: [{
        origin: [
          "https://livepalmes.web.app",
          "https://livepalmes.firebaseapp.com",
          "https://livepalmes.fr",
          "https://www.livepalmes.fr",
          "http://127.0.0.1:8765",
          "http://localhost:8765"
        ],
        method: ["GET", "HEAD"],
        responseHeader: ["Content-Type", "Cache-Control"],
        maxAgeSeconds: 3600
      }]
    })
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Configuration CORS impossible (${response.status}) : ${text}`);
}

async function uploadFile({ bucket, prefix, sourceDir, file, token }) {
  const relative = path.relative(sourceDir, file).replace(/\\/g, "/");
  const objectName = `${prefix}/${relative}`;
  const metadata = {
    name: objectName,
    contentType: contentType(file),
    cacheControl: cacheControl(relative)
  };
  const { boundary, body } = multipartBody(metadata, fs.readFileSync(file));
  const url = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?uploadType=multipart&name=${encodeURIComponent(objectName)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
      "Content-Length": String(body.length)
    },
    body
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Upload impossible ${objectName} (${response.status}) : ${text.slice(0, 500)}`);
  return objectName;
}

async function runPool(items, concurrency, worker) {
  let index = 0;
  let done = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index++];
      await worker(item);
      done += 1;
      if (done % 250 === 0 || done === items.length) {
        console.log(`Upload Storage : ${done}/${items.length}`);
      }
    }
  });
  await Promise.all(workers);
}

async function main() {
  const args = readArgs(process.argv.slice(2));
  const sourceDir = ensureInsideRoot(args.sourceDir);
  const seedPath = ensureInsideRoot(args.seedPath);
  if (!fs.existsSync(sourceDir)) throw new Error(`Dossier source introuvable : ${sourceDir}`);
  const consistency = await checkPerformancePublicConsistency({ seedPath, outDir: sourceDir });
  if (!consistency.ok) {
    throw new Error(`Publication refusee : ${consistency.errors.length} incoherence(s) entre l'export, les fiches nageurs et les TOP.\n${consistency.errors.join("\n")}`);
  }
  console.log(JSON.stringify({ step: "consistency", ...consistency }, null, 2));
  const token = await firebaseAccessToken();
  if (args.configureCors) {
    await configureCors(args.bucket, token);
    console.log(`CORS Storage configure pour ${args.bucket}`);
  }
  const files = sortPerformancePublicationFiles(walkFiles(sourceDir), sourceDir);
  const switchFiles = files.filter((file) => {
    const relativePath = path.relative(sourceDir, file).replace(/\\/g, "/");
    return relativePath === "version.js" || relativePath === "manifest.json";
  });
  const dataFiles = files.filter((file) => !switchFiles.includes(file));
  const upload = (file) => uploadFile({
    bucket: args.bucket,
    prefix: args.prefix,
    sourceDir,
    file,
    token
  });
  await runPool(dataFiles, args.concurrency, upload);
  for (const file of switchFiles) await upload(file);
  console.log(JSON.stringify({
    ok: true,
    bucket: args.bucket,
    prefix: args.prefix,
    files: files.length,
    sourceDir: path.relative(rootDir, sourceDir)
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
