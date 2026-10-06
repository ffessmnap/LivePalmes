"use strict";
// Dedicated, explicitly authorized schema operation; never part of publication.
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const SPECS = {
  search: { table: "nageurs", name: "livepalmes_prenom_nom", columns: ["prenom", "nom", "date", "id"] },
  top: { table: "perfs", name: "livepalmes_course_relais_tps", columns: ["course", "relais", "tps", "id"] },
  competition: { table: "perfs", name: "livepalmes_compet_id", columns: ["compet", "id"] },
  calendar: { table: "competitions", name: "livepalmes_date_id", columns: ["date", "id"] },
  documents: { table: "documents", name: "livepalmes_compet_public_id", columns: ["competition", "public", "id"] },
  roster: { table: "nageurs", name: "livepalmes_club_id", columns: ["club", "id"] }
};
let operationStage = "confirmation";
async function main() {
  const kind = process.env.NAP_AUTHORIZED_INDEX;
  const spec = SPECS[kind];
  if (!spec || process.env.NAP_INDEX_CONFIRMATION !== `nap-add-${kind}-index` || process.env.TARGET_FIREBASE_PROJECT !== "livepalmes-test") throw new Error("Confirmation incorrecte.");
  const credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
  if (credentials.project_id !== "livepalmes-test" || credentials.client_email !== "github-livepalmes-test-backend@livepalmes-test.iam.gserviceaccount.com") throw new Error("Compte incorrect.");
  operationStage = "private-endpoint";
  const options = { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] };
  const uri = execFileSync("gcloud", ["functions", "describe", "exportNapPublicPage", "--gen2", "--region=europe-west1", "--project=livepalmes-test", "--format=value(serviceConfig.uri)"], options).trim();
  const url = new URL(uri);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".run.app") || url.username || url.password || url.search) throw new Error("Endpoint incorrect.");
  const token = execFileSync("gcloud", ["auth", "print-identity-token", `--audiences=${uri}`], options).trim();
  url.searchParams.set("action", "approved-index");
  async function invoke(phase, schemaHash) {
    operationStage = phase;
    const response = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ index: kind, confirmation: process.env.NAP_INDEX_CONFIRMATION, phase, schemaHash }), signal: AbortSignal.timeout(170000) });
    if (!response.ok) throw new Error("Operation privee indisponible.");
    const result = await response.json();
    if (result.source !== "nap" || result.mode !== "approved-index" || result.index !== spec.name || result.table !== spec.table || result.columns?.join(",") !== spec.columns.join(",")) throw new Error("Reponse incorrecte.");
    return result;
  }
  const preparation = await invoke("prepare");
  if (!Array.isArray(preparation.definition) || !/^[a-f0-9]{64}$/.test(preparation.schemaHash)) throw new Error("Structure incorrecte.");
  fs.mkdirSync("outputs", { recursive: true });
  fs.writeFileSync(`outputs/nap-${kind}-schema-before.json`, JSON.stringify(preparation, null, 2) + "\n");
  const result = await invoke("apply", preparation.schemaHash);
  if (result.verified !== true) throw new Error("Verification incomplete.");
  fs.writeFileSync(`outputs/nap-${kind}-index-result.json`, JSON.stringify(result, null, 2) + "\n");
  console.log(`Index ${spec.name} verifie. Aucune ligne de donnees modifiee.`);
}
main().catch(error => {
  const code = typeof error.code === "string" && /^[A-Z_]+$/.test(error.code) ? error.code : "UNAVAILABLE";
  console.error(`Operation index NAP arretee a ${operationStage} (${code}). Consulter la structure avant une nouvelle tentative. Aucun secret affiche.`);
  process.exitCode = 1;
});
