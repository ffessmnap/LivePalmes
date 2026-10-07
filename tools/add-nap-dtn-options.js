"use strict";
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const { planHash, definitions } = require("../functions/nap-approved-dtn-schema");
async function main() {
  const phase = process.env.NAP_DTN_SCHEMA_PHASE;
  const confirmation = process.env.NAP_DTN_SCHEMA_CONFIRMATION;
  if (!["prepare", "apply"].includes(phase) || confirmation !== "nap-create-dtn-complements" || process.env.TARGET_FIREBASE_PROJECT !== "livepalmes-test") throw new Error("Confirmation incorrecte.");
  const credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
  if (credentials.project_id !== "livepalmes-test" || credentials.client_email !== "github-livepalmes-test-backend@livepalmes-test.iam.gserviceaccount.com") throw new Error("Compte incorrect.");
  const options = { encoding:"utf8", stdio:["ignore","pipe","pipe"] };
  const uri = execFileSync("gcloud", ["functions","describe","exportNapPublicPage","--gen2","--region=europe-west1","--project=livepalmes-test","--format=value(serviceConfig.uri)"], options).trim();
  const url = new URL(uri);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".run.app") || url.username || url.password || url.search) throw new Error("Endpoint incorrect.");
  const token = execFileSync("gcloud", ["auth","print-identity-token",`--audiences=${uri}`], options).trim();
  const input = {phase, confirmation};
  if (phase === "apply") {
    const backup = JSON.parse(fs.readFileSync("outputs/nap-dtn-schema-before.json", "utf8"));
    if (backup.planHash !== planHash || !/^[a-f0-9]{64}$/.test(backup.schemaHash) || JSON.stringify(backup.tables) !== JSON.stringify(definitions.map(d=>d.name))) throw new Error("Sauvegarde incorrecte.");
    input.planHash = backup.planHash; input.schemaHash = backup.schemaHash;
  }
  url.searchParams.set("action","approved-dtn-schema");
  const response = await fetch(url, {method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(input),signal:AbortSignal.timeout(170000)});
  if (!response.ok) throw new Error("Operation privee indisponible.");
  const result = await response.json();
  if (result.source !== "nap" || result.mode !== "approved-dtn-schema" || result.planHash !== planHash || JSON.stringify(result.tables) !== JSON.stringify(definitions.map(d=>d.name)) || result.dataRowsWritten !== false || phase === "apply" && result.verified !== true) throw new Error("Resultat incorrect.");
  fs.mkdirSync("outputs",{recursive:true});
  fs.writeFileSync(`outputs/nap-dtn-schema-${phase === "prepare" ? "before" : "result"}.json`,JSON.stringify(result,null,2)+"\n");
  console.log(phase === "prepare" ? "Plan additif et structure avant operation sauvegardes. Aucune ecriture." : "Complements DTN verifies. Aucune ligne sportive ecrite.");
}
main().catch(()=>{console.error("Operation de structure NAP arretee. Consulter la preuve avant reprise ; aucun secret affiche.");process.exitCode=1;});
