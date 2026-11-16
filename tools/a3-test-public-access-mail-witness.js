"use strict";
// One technical settings read; no mail, transaction or business endpoint call.
const fs = require("node:fs"), path = require("node:path"), { createRequire } = require("node:module");
function guard(env) {
  for (const name of ["TARGET_FIREBASE_PROJECT", "GCLOUD_PROJECT", "GOOGLE_CLOUD_PROJECT"]) {
    if (env[name] !== "livepalmes-test") throw Error("Cible TEST obligatoire.");
  }
  if (env.GITHUB_REF !== "refs/heads/main" || env.GITHUB_RUN_ATTEMPT !== "1" || env.CONFIRMATION !== "livepalmes-test" ||
      !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA || "") || env.GITHUB_SHA !== env.EXPECTED_COMMIT) throw Error("Reprise A3.2 hors main/version.");
}
async function main(file) {
  guard(process.env);
  const root = path.resolve(process.env.RUNNER_TEMP, "a3-public-access-recovery");
  if (!["mail-before.json", "mail-after.json"].some(name => path.resolve(file) === path.join(root, name))) throw Error("Temoin mail hors dossier prive.");
  if (JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8")).project_id !== "livepalmes-test") throw Error("Compte TEST requis.");
  const localRequire = createRequire(path.join(__dirname, "../functions/package.json"));
  localRequire("firebase-admin/app").initializeApp({ projectId: "livepalmes-test" });
  const sha256 = await require("./prepare-test-public-access-guards").mailWitness(localRequire("firebase-admin/firestore").getFirestore());
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ disabled: true, sha256 }));
  console.log("Reglage technique mail TEST lu et desactive ; aucune ecriture.");
}
if (require.main === module) main(process.argv[2]).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { guard };
