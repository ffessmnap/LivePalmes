"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
function check(root) {
  root = fs.realpathSync(path.resolve(root));
  const { listFiles } = require(path.join(root, "tests/firestore-rules/node_modules/firebase-tools/lib/listFiles"));
  const config = JSON.parse(fs.readFileSync(path.join(root, "firebase.json"), "utf8"));
  const hosting = Array.isArray(config.hosting) ? config.hosting : [config.hosting];
  const tracked = new Set(execFileSync("git", ["ls-files", "-z"], {cwd:root,encoding:"utf8",maxBuffer:16 * 1024 * 1024}).split("\0").filter(Boolean));
  for (const item of hosting) {
    const publicDir = path.resolve(root, item.public);
    if (publicDir !== root) throw new Error("Racine Hosting inattendue : revue requise");
    for (const file of listFiles(publicDir, item.ignore)) {
      const actual = fs.realpathSync(path.join(publicDir, file));
      if (!tracked.has(file) || /(^|\/)gha-creds-|credentials|service.account.*\.json$/i.test(file) || !actual.startsWith(root + path.sep)) {
        throw new Error("Fichier temporaire, sensible ou non suivi dans Hosting : publication bloquee");
      }
    }
  }
  console.log("Hosting : seuls les fichiers suivis et autorises seront publies.");
}
module.exports = { check };
if (require.main === module) check(process.argv[2] || ".");
