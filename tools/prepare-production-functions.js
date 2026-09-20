"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { ALL_SAFE_LOTS, LOTS } = require("./firebase-test-backend-lots");

function prepare(root, destination, appCheck) {
  if (process.env.TARGET_FIREBASE_PROJECT !== "livepalmes") throw new Error("Cible PROD explicite requise");
  if (!["true", "false"].includes(appCheck)) throw new Error("App Check PROD non verifie");
  const source = path.join(root, "functions");
  const files = execFileSync("git", ["ls-files", "-z", "functions/"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
  const selected = ALL_SAFE_LOTS.flatMap(lot => LOTS[lot]);
  if (new Set(selected).size !== selected.length || selected.some(name => [...LOTS.email, ...LOTS.schedulers].includes(name))) throw new Error("Selection invalide");
  if (fs.existsSync(destination)) throw new Error("Destination deja presente");
  fs.mkdirSync(path.join(destination, "functions"), { recursive: true });
  for (const file of files) {
    const relative = path.relative("functions", file);
    if (relative === "index.js" || relative.split(path.sep).some(part => part.startsWith("."))) continue;
    const output = path.join(destination, "functions", relative);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.copyFileSync(path.join(root, file), output);
  }
  let backend = fs.readFileSync(path.join(source, "index.js"), "utf8");
  const original = 'const { defineBoolean, defineSecret } = require("firebase-functions/params");';
  if (backend.split(original).length !== 2) throw new Error("Import params inattendu");
  backend = backend.replace(original, 'const { defineBoolean } = require("firebase-functions/params");\nconst defineSecret = name => name;');
  fs.writeFileSync(path.join(destination, "functions", "backend-index.js"), backend);
  fs.writeFileSync(path.join(destination, "functions", "index.js"), '"use strict";\n' +
    'const { livePalmesEnvironment } = require("./livepalmes-environment");\n' +
    'if (livePalmesEnvironment().projectId !== "livepalmes") throw new Error("Code reserve a PROD");\n' +
    'const backend = require("./backend-index");\n' +
    `for (const name of ${JSON.stringify(selected)}) { if (!backend[name]) throw new Error("Export absent: " + name); exports[name] = backend[name]; }\n`);
  fs.writeFileSync(path.join(destination, "functions", ".env.livepalmes"), `LIVEPALMES_ENFORCE_APP_CHECK=${appCheck}\n`);
  fs.writeFileSync(path.join(destination, "firebase.json"), JSON.stringify({ functions: { source: "functions", codebase: "default" } }, null, 2));
  fs.writeFileSync(path.join(destination, "selector.txt"), selected.map(name => `functions:${name}`).join(",") + "\n");
  return selected;
}
module.exports = { prepare };
if (require.main === module) {
  const selected = prepare(process.argv[2], process.argv[3], process.argv[4]);
  console.log(`${selected.length} Functions selectionnees, aucun mail ni scheduler.`);
}
