"use strict";
// Parallelism changes scheduling, never coverage. Each lane owns a disposable
// checkout and temporary files; the application checkout and Git index stay intact.
const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const { spawn, execFileSync } = require("node:child_process");

function enabled(suite, env = process.env, platform = process.platform) {
  return platform === "linux" && env.CI === "true" && env.GITHUB_ACTIONS === "true" &&
    env.LP_CI_CONTAINER === "true" && env.LP_TEST_POOL_WORKER !== "1" &&
    ["application", "publication", "browser"].includes(suite);
}
function git(root, ...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 8 * 1024 * 1024 }).trim();
}
function clean(root) { return !git(root, "status", "--porcelain", "--untracked-files=no"); }
function workerEnvironment(root, source, temporary, suite, environment = process.env, cache) {
  const env = { ...environment, LP_TEST_POOL_WORKER: "1", GITHUB_WORKSPACE: root,
    TMPDIR: temporary, TMP: temporary, TEMP: temporary,
    GITHUB_STEP_SUMMARY: path.join(temporary, "summary.md"),
    GITHUB_OUTPUT: path.join(temporary, "outputs"), GITHUB_ENV: path.join(temporary, "environment"),
    GITHUB_PATH: path.join(temporary, "paths"), GITHUB_STATE: path.join(temporary, "state") };
  // The pinned runtime keeps its original RUNNER_TEMP mount identity. Test
  // fixtures explicitly override it when exercising receipts/proof writers.
  for (const key of ["GH_TOKEN", "GITHUB_TOKEN", "GOOGLE_APPLICATION_CREDENTIALS", "CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE"]) delete env[key];
  delete env.LP_SOURCE_CACHE_FILE; delete env.LP_SOURCE_CACHE_SHA256;
  if (cache) {
    env.LP_SOURCE_CACHE_FILE = cache.file;
    env.LP_SOURCE_CACHE_SHA256 = cache.sha256;
  }
  if (env.NODE_PATH) env.NODE_PATH = env.NODE_PATH.split(path.delimiter).map(p =>
    p.startsWith(source + path.sep) ? path.join(root, path.relative(source, p)) : p).join(path.delimiter);
  if (suite === "application") {
    env.NODE_OPTIONS = [env.NODE_OPTIONS, "--require=" + JSON.stringify(path.join(root, "tests/helpers/offline-network.js"))].filter(Boolean).join(" ");
  }
  return env;
}
function prepare(root, directory, commit) {
  const checkout = path.join(directory, "repo"), temporary = path.join(directory, "tmp");
  fs.mkdirSync(temporary, { recursive: true });
  git(root, "clone", "--quiet", "--local", "--shared", "--no-checkout", "--", root.replace(/\\/g, "/"), checkout.replace(/\\/g, "/"));
  git(checkout, "checkout", "--quiet", "--detach", commit);
  // Share only already-installed dependency trees, never fixtures or outputs.
  const dependencies = ["functions/node_modules", "tests/firestore-rules/node_modules", "tests/browser/node_modules"];
  for (const relative of dependencies) {
    const source = path.join(root, relative), target = path.join(checkout, relative);
    if (fs.existsSync(source)) fs.symlinkSync(source, target, "dir");
  }
  fs.appendFileSync(path.join(checkout, ".git/info/exclude"), "\n" + dependencies.map(p => "/" + p).join("\n") + "\n");
  if (git(checkout, "rev-parse", "HEAD") !== commit || !clean(checkout)) throw Error("Copie de test incompatible");
  return { root: checkout, temporary };
}
function execute(file, lane, suite, source, timeoutMs = 120000) {
  return new Promise(resolve => {
    const started = Date.now(), env = workerEnvironment(lane.root, source, lane.temporary, suite, process.env, lane.cache);
    const command = file.endsWith(".py") ? env.PYTHON_BINARY || "python" : process.execPath;
    const child = spawn(command, [path.join(lane.root, file)], { cwd: lane.root, env,
      stdio: ["ignore", "pipe", "pipe"], windowsHide: true, detached: process.platform === "linux" });
    let stdout = "", stderr = "", failure;
    const stop = message => {
      failure = message;
      try { if (process.platform === "linux" && child.pid) process.kill(-child.pid, "SIGKILL"); else child.kill(); } catch {}
    };
    const collect = stream => chunk => {
      if (stream === "stdout") stdout += chunk; else stderr += chunk;
      if (Buffer.byteLength(stdout) + Buffer.byteLength(stderr) > 8 * 1024 * 1024) stop("Sortie du test hors limite");
    };
    child.stdout.setEncoding("utf8").on("data", collect("stdout"));
    child.stderr.setEncoding("utf8").on("data", collect("stderr"));
    child.once("error", error => { failure = error.message; });
    const timer = setTimeout(() => stop("Delai maximal du test atteint"), timeoutMs);
    child.once("close", (status, signal) => {
      clearTimeout(timer);
      resolve({ file, seconds: (Date.now() - started) / 1000, status, signal, failure, stdout, stderr });
    });
  });
}
async function schedule(files, lanes, run, report = () => {}) {
  if (!files.length || new Set(files).size !== files.length || !lanes.length || lanes.length > 4) throw Error("Couverture parallele invalide");
  let next = 0, failed = false;
  const results = [];
  await Promise.all(lanes.map(async lane => {
    while (!failed && next < files.length) {
      const index = next++, file = files[index];
      let result;
      try { result = await run(file, lane); }
      catch (error) { result = { file, status: null, failure: error.message, seconds: 0, stdout: "", stderr: "" }; }
      result = { ...result, file, index };
      results.push(result);
      if (result.status !== 0 || result.failure) failed = true;
      try { report(result); }
      catch (error) { result.failure = error.message; failed = true; }
    }
  }));
  if (!failed && (results.length !== files.length || new Set(results.map(r => r.file)).size !== files.length)) throw Error("Couverture parallele incomplete");
  return results.sort((a, b) => a.index - b.index);
}
async function runPool(suite, files, source, report) {
  if (!clean(source)) throw Error("Sources suivies modifiees avant la verification parallele");
  const commit = git(source, "rev-parse", "HEAD");
  if (commit !== process.env.GITHUB_SHA) throw Error("Commit CI different avant la verification parallele");
  const parent = fs.realpathSync(os.tmpdir()), directory = fs.mkdtempSync(path.join(parent, "livepalmes-test-pool-"));
  const count = Math.min(files.length, suite === "application" ? 4 : 2, os.availableParallelism());
  try {
    const sourceFiles = require(path.join(source, "tests/helpers/source-files"));
    const bytes = Buffer.from(JSON.stringify(sourceFiles.buildSourceCache()));
    const sha256 = sourceFiles.digest(bytes);
    const lanes = Array.from({ length: count }, (_, i) => prepare(source, path.join(directory, String(i)), commit));
    for (const lane of lanes) {
      const file = path.join(lane.temporary, "logical-sources.json");
      fs.writeFileSync(file, bytes, { mode: 0o444 }); lane.cache = { file, sha256 };
    }
    console.log(`Execution ${suite} : ${count} copies de test isolees, couverture complete de la selection.`);
    const rows = await schedule(files, lanes, (file, lane) => execute(file, lane, suite, source), report);
    if (!clean(source) || lanes.some(lane => !clean(lane.root))) throw Error("Sources suivies modifiees pendant la verification parallele");
    return { rows, workers: count };
  } finally {
    if (path.dirname(path.resolve(directory)) !== parent || !path.basename(directory).startsWith("livepalmes-test-pool-")) throw Error("Dossier de test hors limite");
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
module.exports = { enabled, workerEnvironment, prepare, execute, schedule, runPool, clean };
