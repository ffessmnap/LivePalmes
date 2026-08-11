const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const rootDir = path.resolve(__dirname, "..");
const sourcePath = path.join(rootDir, "performances", "public", "data", "admin-reference.js");
const outputPath = path.join(rootDir, "performances", "public", "data", "club-reference.js");
const functionsOutputPath = path.join(rootDir, "functions", "assets", "club-reference.json");

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(sourcePath, "utf8"), sandbox, { filename: sourcePath });

const clubs = Array.isArray(sandbox.window.LIVEPALMES_ADMIN_REFERENCE?.clubs)
  ? sandbox.window.LIVEPALMES_ADMIN_REFERENCE.clubs
  : [];

const reference = { clubs };
const payload = `window.LIVEPALMES_CLUB_REFERENCE = ${JSON.stringify(reference)};\n`;
const functionsPayload = `${JSON.stringify(reference)}\n`;
if (process.argv.includes("--check")) {
  const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  const existingFunctions = fs.existsSync(functionsOutputPath) ? fs.readFileSync(functionsOutputPath, "utf8") : "";
  if (existing !== payload || existingFunctions !== functionsPayload) {
    console.error(`${path.relative(rootDir, outputPath)} et ${path.relative(rootDir, functionsOutputPath)} doivent etre regeneres.`);
    process.exit(1);
  }
  console.log(`${clubs.length} clubs verifies dans ${path.relative(rootDir, outputPath)}.`);
  process.exit(0);
}
fs.writeFileSync(outputPath, payload, "utf8");
fs.mkdirSync(path.dirname(functionsOutputPath), { recursive: true });
fs.writeFileSync(functionsOutputPath, functionsPayload, "utf8");
console.log(`${clubs.length} clubs ecrits dans ${path.relative(rootDir, outputPath)} et ${path.relative(rootDir, functionsOutputPath)}.`);
