"use strict";
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const skippedDirs = new Set([".git", "node_modules", "archives", "sauvegardes", "sources"]);
function listJsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return skippedDirs.has(entry.name) ? [] : listJsFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".js") ? [fullPath] : [];
  });
}

async function checkFiles(files, concurrency = Math.min(4, os.availableParallelism())) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4) throw new Error("Parallelisme invalide");
  let next = 0;
  const failures = [];
  async function worker() {
    while (next < files.length) {
      const file = files[next++];
      await new Promise(resolve => {
        const child = spawn(process.execPath, ["--check", file], { stdio: ["ignore", "pipe", "pipe"] });
        let output = "", spawnError;
        child.stdout.on("data", data => { output += data; });
        child.stderr.on("data", data => { output += data; });
        child.on("error", error => { spawnError = error; });
        child.on("close", code => {
          if (code !== 0 || spawnError) failures.push({ file, output: spawnError?.message || output });
          resolve();
        });
      });
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, files.length) }, worker));
  if (failures.length) {
    throw new Error(failures.map(failure => `${failure.file}\n${failure.output}`).join("\n"));
  }
  return files.length;
}

module.exports = { checkFiles, listJsFiles };
if (require.main === module) {
  checkFiles(listJsFiles(path.resolve(__dirname, ".."))).then(count => {
    console.log(`${count} fichiers JavaScript verifies.`);
  }).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
