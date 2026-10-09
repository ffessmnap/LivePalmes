"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { ALL_SAFE_LOTS, LOTS, METADATA, PROJECT_ID, TEST_NON_MAIL_FUNCTIONS } = require("./firebase-test-backend-lots");

const root = path.join(__dirname, "..");
const source = path.join(root, "functions");
const stagingRoot = path.resolve(process.argv[3] || path.join(root, ".firebase-test-functions"));
if (path.basename(stagingRoot) !== ".firebase-test-functions") {
  throw new Error("Dossier temporaire Functions TEST invalide.");
}
const destination = path.join(stagingRoot, "functions");
const lot = process.argv[2];

if (!lot || (!LOTS[lot] && lot !== "all-safe")) {
  throw new Error(`Lot Firebase TEST invalide : ${lot || "absent"}`);
}
if ((process.env.TARGET_FIREBASE_PROJECT || "") !== PROJECT_ID) {
  throw new Error("La préparation des Functions est réservée à livepalmes-test.");
}

const selectedLots = lot === "all-safe" ? ALL_SAFE_LOTS : [lot];
const schedulerScope=process.env.NAP_NOTIFICATION_SCHEDULER_ONLY||'false';
if(!['true','false'].includes(schedulerScope))throw new Error('Selection de scheduler TEST invalide.');
const napSchedulerOnly=schedulerScope==='true';
if(napSchedulerOnly&&lot!=='schedulers')throw new Error('La selection du scheduler NAP est reservee au lot schedulers.');
const selected = napSchedulerOnly ? ['closeDueEngagementCompetitions'] : selectedLots.flatMap((name) => LOTS[name]).concat(lot === "all-safe" ? TEST_NON_MAIL_FUNCTIONS : []);
if (new Set(selected).size !== selected.length) throw new Error("Une Function est présente dans plusieurs lots sélectionnés.");
const selectedSecrets = napSchedulerOnly ? ['LIVEPALMES_NAP_PASSWORD'] : [...new Set(selectedLots.flatMap((name) => METADATA[name].secrets).concat(lot === "all-safe" ? ["LIVEPALMES_NAP_PASSWORD"] : []))];

fs.rmSync(path.dirname(destination), { recursive: true, force: true });
fs.cpSync(source, destination, {
  recursive: true,
  filter(candidate) {
    const relative = path.relative(source, candidate);
    return !relative.split(path.sep).includes("node_modules") && relative !== "index.js";
  }
});
const backendSourcePath = path.join(source, "index.js");
let backendSource = fs.readFileSync(backendSourcePath, "utf8");

{
  const paramsImport = 'const { defineBoolean, defineSecret } = require("firebase-functions/params");';
  const safeParamsImport =
    'const { defineBoolean, defineSecret: registerSecret } = require("firebase-functions/params");\n' +
    '// Enregistrer uniquement les secrets du lot deploye, meme si le backend declare les autres.\n' +
    `const deployedSecretNames = ${JSON.stringify(selectedSecrets)};\n` +
    'const defineSecret = (name) => deployedSecretNames.includes(name) ? registerSecret(name) : name;';
  const occurrences = backendSource.split(paramsImport).length - 1;
  if (occurrences !== 1) {
    throw new Error(`Import defineSecret inattendu dans functions/index.js (${occurrences} occurrence(s)).`);
  }
  backendSource = backendSource.replace(paramsImport, safeParamsImport);
}

fs.writeFileSync(path.join(destination, "backend-index.js"), backendSource);
fs.writeFileSync(path.join(destination, ".env.livepalmes-test"), "LIVEPALMES_ENFORCE_APP_CHECK=false\n");
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
fs.writeFileSync(path.join(stagingRoot, "firebase.json"), JSON.stringify({
  functions: { source: "functions", codebase: "default" }
}, null, 2) + "\n");

process.stdout.write(`${selected.join(",")}\n`);
