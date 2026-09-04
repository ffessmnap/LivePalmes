"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { ALL_SAFE_LOTS, LOTS, PROJECT_ID } = require("./firebase-test-backend-lots");

const root = path.join(__dirname, "..");
const source = path.join(root, "functions");
const destination = path.join(root, ".firebase-test-functions", "functions");
const lot = process.argv[2];

if (!lot || (!LOTS[lot] && lot !== "all-safe")) {
  throw new Error(`Lot Firebase TEST invalide : ${lot || "absent"}`);
}
if ((process.env.TARGET_FIREBASE_PROJECT || "") !== PROJECT_ID) {
  throw new Error("La préparation des Functions est réservée à livepalmes-test.");
}

const selectedLots = lot === "all-safe" ? ALL_SAFE_LOTS : [lot];
const selected = selectedLots.flatMap((name) => LOTS[name]);
if (new Set(selected).size !== selected.length) throw new Error("Une Function est présente dans plusieurs lots sélectionnés.");

fs.rmSync(path.dirname(destination), { recursive: true, force: true });
fs.cpSync(source, destination, {
  recursive: true,
  filter(candidate) {
    const relative = path.relative(source, candidate);
    return !relative.split(path.sep).includes("node_modules") && relative !== "index.js";
  }
});
fs.copyFileSync(path.join(source, "index.js"), path.join(destination, "backend-index.js"));
fs.writeFileSync(path.join(destination, "index.js"), `"use strict";\n\n` +
  `const { livePalmesEnvironment } = require("./livepalmes-environment");\n` +
  `const environment = livePalmesEnvironment(process.env);\n` +
  `if (environment.name !== "test" || environment.projectId !== "${PROJECT_ID}") {\n` +
  `  throw new Error("Ce codebase de déploiement est réservé à ${PROJECT_ID}.");\n` +
  `}\n` +
  `const backend = require("./backend-index");\n` +
  `const names = ${JSON.stringify(selected, null, 2)};\n` +
  `for (const name of names) {\n` +
  `  if (!backend[name]) throw new Error(\`Function exportée introuvable : \${name}\`);\n` +
  `  exports[name] = backend[name];\n` +
  `}\n`);
fs.writeFileSync(path.join(root, ".firebase-test-functions", "firebase.json"), JSON.stringify({
  functions: { source: "functions", codebase: "default" }
}, null, 2) + "\n");

process.stdout.write(`${selected.join(",")}\n`);
