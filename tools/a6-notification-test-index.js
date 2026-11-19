"use strict";
// Supplemental indexes: explicitly authorized TEST-only additive operation.
// Never deletes an index or changes rules, documents, Functions or mail settings.
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const definitions = [["source", "runAt", "__name__"].map(fieldPath => ({ fieldPath, order: "ASCENDING" }))];
const prefix = "projects/livepalmes-test/databases/(default)/collectionGroups/engagementClosureQueue/indexes/";
function matching(index, definition) {
  return index.name?.startsWith(prefix) && index.queryScope === "COLLECTION" && index.fields?.length === definition.length &&
    definition.every((field, i) => index.fields[i].fieldPath === field.fieldPath && index.fields[i].order === field.order);
}
async function main() {
  if (!process.argv.includes("--apply-test")) { console.log(JSON.stringify({ project: "livepalmes-test", collectionGroup: "engagementClosureQueue", definitions }, null, 2)); return; }
  if (process.env.GITHUB_ACTIONS !== "true" || process.env.GITHUB_REF !== "refs/heads/main" ||
      !/^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA || "")) throw Error("Opération réservée au workflow main TEST autorisé.");
  const credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
  if (credentials.project_id !== "livepalmes-test" || credentials.client_email !== "github-livepalmes-test-backend@livepalmes-test.iam.gserviceaccount.com") throw Error("Compte de service TEST requis.");
  const gcloud = args => execFileSync("gcloud", args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
  const list = () => JSON.parse(gcloud(["firestore", "indexes", "composite", "list", "--project=livepalmes-test", "--database=(default)", "--format=json"]));
  let indexes = list();
  for (const definition of definitions) {
    if (indexes.some(index => matching(index, definition))) continue;
    gcloud(["firestore", "indexes", "composite", "create", "--project=livepalmes-test", "--database=(default)",
      "--collection-group=engagementClosureQueue", "--query-scope=collection", "--async", "--quiet",
      ...definition.map(field => `--field-config=field-path=${field.fieldPath},order=${field.order.toLowerCase()}`)]);
    console.log("Création demandée :", definition.map(field => field.fieldPath).join(", "));
  }
  for (let attempt = 0; attempt < 90; attempt++) {
    indexes = list();
    const selected = definitions.map(definition => indexes.find(index => matching(index, definition)));
    if (selected.some(index => index?.state === "NEEDS_REPAIR")) throw Error("Index à réparer, aucune suppression automatique.");
    if (selected.every(index => index?.state === "READY")) {
      fs.writeFileSync("a6-notification-index-proof.json", JSON.stringify({ project: "livepalmes-test", commit: process.env.GITHUB_SHA, indexes: selected }, null, 2));
      console.log("L’index TEST autorisé est prêt."); return;
    }
    console.log("Construction des index TEST en cours…"); await new Promise(resolve => setTimeout(resolve, 10000));
  }
  throw Error("Construction non terminée ; attendre la confirmation READY avant la publication des notifications.");
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { definitions, matching };
