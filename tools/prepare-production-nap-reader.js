"use strict";
const fs = require("node:fs");
const path = require("node:path");

function adaptSecrets(source) {
  const previous = "const defineSecret = name => name;";
  if (source.split(previous).length !== 2) throw new Error("Adaptateur secrets PROD inattendu");
  // Preserve SDK secret names and the runtime value() contract without reading any value during preparation.
  return source.replace(previous, "const defineSecret = name => ({ name, value: () => process.env[name] });");
}

module.exports = { adaptSecrets };
if (require.main === module) {
  if (process.env.TARGET_FIREBASE_PROJECT !== "livepalmes") throw new Error("Cible PROD requise");
  const file = path.join(process.argv[2], "functions", "backend-index.js");
  fs.writeFileSync(file, adaptSecrets(fs.readFileSync(file, "utf8")));
}
