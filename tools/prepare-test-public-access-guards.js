"use strict";
// Closed A3.2 TEST scope. No endpoint invocation, mail send or settings write.
const fs = require("node:fs"), path = require("node:path"), { createRequire } = require("node:module");
const { createHash } = require("node:crypto");
const NAMES = Object.freeze(["getPublicEngagementClubDirectory", "resolveEngagementAccessRequest", "submitEngagementAccessRequest"]);
function guard(env) {
  for (const key of ["TARGET_FIREBASE_PROJECT", "GCLOUD_PROJECT", "GOOGLE_CLOUD_PROJECT"]) {
    if (env[key] !== "livepalmes-test") throw Error("Cible TEST obligatoire.");
  }
  for (const key of ["ACCESS_REQUESTS_ONLY", "NOTIFICATION_FINAL_CHECK", "NOTIFICATION_PILOT_IDF", "NOTIFICATION_BCC_TASKS", "NAP_NOTIFICATION_SCHEDULER_ONLY"]) {
    if (env[key] !== "false") throw Error("Autre contrat TEST actif.");
  }
  if (env.PUBLIC_ACCESS_GUARDS_ONLY !== "true" || env.GITHUB_REF !== "refs/heads/main" || env.GITHUB_RUN_ATTEMPT !== "1" || !/^[a-f0-9]{40}$/.test(env.CANDIDATE_SHA || "")) throw Error("Contrat A3.2 TEST requis.");
}
function narrow(source) {
  if (!source.includes('environment.projectId !== "livepalmes-test"') || !source.includes('environment.name !== "test"')) throw Error("Protection TEST absente.");
  const pattern = /const names = \[[\s\S]*?\];/g;
  if ((source.match(pattern) || []).length !== 1) throw Error("Selection inattendue.");
  return source.replace(pattern, "const names = " + JSON.stringify(NAMES) + ";");
}
async function mailWitness(db) {
  const state = await require("../functions/engagement-mail-control").read(db);
  if (state.enabled) throw Error("Mails TEST actifs : arret sans modification.");
  return createHash("sha256").update(JSON.stringify(state)).digest("hex");
}
async function main() {
  guard(process.env);
  const [mode, witness, selector] = process.argv.slice(2);
  if (!["prepare", "verify"].includes(mode) || !witness || (mode === "prepare" && !selector)) throw Error("Arguments invalides.");
  if (JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8")).project_id !== "livepalmes-test") throw Error("Compte TEST requis.");
  const localRequire = createRequire(path.resolve("functions/package.json"));
  localRequire("firebase-admin/app").initializeApp({ projectId: "livepalmes-test" });
  const digest = await mailWitness(localRequire("firebase-admin/firestore").getFirestore());
  if (mode === "prepare") {
    fs.writeFileSync(witness, JSON.stringify({ sha256: digest }));
    const file = ".firebase-test-functions/functions/index.js";
    fs.writeFileSync(file, narrow(fs.readFileSync(file, "utf8")));
    fs.writeFileSync(selector, NAMES.join(",") + "\n");
  } else if (JSON.parse(fs.readFileSync(witness, "utf8")).sha256 !== digest) throw Error("Reglage mail modifie pendant la livraison.");
  console.log("Contrat A3.2 TEST : trois fonctions fermees, mails desactives et reglage conserve.");
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { NAMES, guard, narrow, mailWitness };
