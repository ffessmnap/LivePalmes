"use strict";
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const { OPERATION } = require("../functions/nap-approved-swimmer-correction");
async function main() {
  const phase = process.env.NAP_CORRECTION_PHASE;
  if (process.env.TARGET_FIREBASE_PROJECT !== "livepalmes-test" || process.env.NAP_CORRECTION_CONFIRMATION !== OPERATION || !["prepare", "apply"].includes(phase)) throw new Error("Confirmation incorrecte.");
  const credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
  if (credentials.project_id !== "livepalmes-test" || credentials.client_email !== "github-livepalmes-test-backend@livepalmes-test.iam.gserviceaccount.com") throw new Error("Compte incorrect.");
  const options = { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] };
  const uri = execFileSync("gcloud", ["functions", "describe", "exportNapPublicPage", "--gen2", "--region=europe-west1", "--project=livepalmes-test", "--format=value(serviceConfig.uri)"], options).trim();
  const url = new URL(uri);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".run.app") || url.username || url.password || url.search) throw new Error("Endpoint incorrect.");
  const token = execFileSync("gcloud", ["auth", "print-identity-token", `--audiences=${uri}`], options).trim();
  const backupPath = "outputs/nap-swimmer-912-before.json";
  const beforeHash = phase === "apply" ? JSON.parse(fs.readFileSync(backupPath, "utf8")).beforeHash : undefined;
  url.searchParams.set("action", "approved-swimmer-correction");
  const response = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ phase, confirmation: OPERATION, beforeHash }), signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error("Operation indisponible.");
  const result = await response.json();
  if (result.source !== "nap" || result.mode !== "approved-swimmer-correction" || result.operation !== OPERATION || result.id !== 912 || result.changedColumns?.join() !== "nom" || !/^[a-f0-9]{64}$/.test(result.beforeHash)) throw new Error("Reponse incorrecte.");
  fs.mkdirSync("outputs", { recursive: true });
  if (phase === "prepare") {
    if (result.before?.id !== 912 || result.before.nom !== "FAUVEAU" || result.before.prenom !== "Antoine" || result.writesExecuted !== false) throw new Error("Sauvegarde incorrecte.");
    fs.writeFileSync(backupPath, JSON.stringify(result, null, 2) + "\n");
  } else {
    if (!result.verified || result.beforeHash !== beforeHash) throw new Error("Verification incomplete.");
    fs.writeFileSync("outputs/nap-swimmer-912-result.json", JSON.stringify(result, null, 2) + "\n");
  }
  console.log(phase === "prepare" ? "Sauvegarde privee du nageur 912 preparee. Aucune donnee NAP modifiee." : "Correction du seul nom du nageur 912 verifiee.");
}
main().catch(() => { console.error("Correction NAP arretee. Consulter la sauvegarde et l'audit avant toute reprise. Aucun detail personnel affiche."); process.exitCode = 1; });
