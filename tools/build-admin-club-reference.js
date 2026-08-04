const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const rootDir = path.resolve(__dirname, "..");
const sourcePath = path.join(rootDir, "performances", "public", "data", "admin-reference.js");
const outputPath = path.join(rootDir, "performances", "public", "data", "club-reference.js");

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(sourcePath, "utf8"), sandbox, { filename: sourcePath });

const clubs = Array.isArray(sandbox.window.LIVEPALMES_ADMIN_REFERENCE?.clubs)
  ? sandbox.window.LIVEPALMES_ADMIN_REFERENCE.clubs
  : [];

const payload = `window.LIVEPALMES_CLUB_REFERENCE = ${JSON.stringify({ clubs })};\n`;
if (process.argv.includes("--check")) {
  const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  if (existing !== payload) {
    console.error(`${path.relative(rootDir, outputPath)} doit etre regenere.`);
    process.exit(1);
  }
  console.log(`${clubs.length} clubs verifies dans ${path.relative(rootDir, outputPath)}.`);
  process.exit(0);
}
fs.writeFileSync(outputPath, payload, "utf8");
console.log(`${clubs.length} clubs ecrits dans ${path.relative(rootDir, outputPath)}.`);
