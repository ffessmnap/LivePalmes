"use strict";
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
async function main() {
  const project = "livepalmes-test";
  if (process.env.TARGET_FIREBASE_PROJECT !== project) throw new Error("Diagnostic reserve a TEST.");
  const credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
  if (credentials.project_id !== project || credentials.client_email !== "github-livepalmes-test-backend@livepalmes-test.iam.gserviceaccount.com") throw new Error("Compte TEST incorrect.");
  const options = { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] };
  const uri = execFileSync("gcloud", ["functions", "describe", "exportNapPublicPage", "--gen2", "--region=europe-west1", `--project=${project}`, "--format=value(serviceConfig.uri)"], options).trim();
  const url = new URL(uri);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".run.app") || url.username || url.password || url.search) throw new Error("Endpoint prive invalide.");
  const token = execFileSync("gcloud", ["auth", "print-identity-token", `--audiences=${uri}`], options).trim();
  const action = process.env.NAP_SOURCE_ACTION || "source-inventory";
  if (!["source-inventory", "calendar-contract", "portal-contract", "engagement-contract", "portal-competition-contract", "portal-entry-contract", "portal-competition-write-plans", "portal-course-document-contract", "portal-person-status-plans", "portal-team-leader-contract", "dtn-source-contract"].includes(action)) throw new Error("Diagnostic invalide.");
  url.searchParams.set("action", action);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error("Diagnostic NAP indisponible.");
  const result = await response.json();
  if (result.source !== "nap" || result.mode !== ({ "source-inventory": "structure-only", "calendar-contract": "calendar-contract", "portal-contract": "portal-contract-readonly", "engagement-contract": "engagement-contract-readonly", "portal-competition-contract": "portal-competition-contract-readonly", "portal-entry-contract": "portal-entry-contract-readonly", "portal-competition-write-plans":"portal-competition-write-plans-readonly", "portal-course-document-contract":"portal-course-document-contract-readonly", "portal-person-status-plans":"portal-person-status-plans-readonly", "portal-team-leader-contract":"portal-team-leader-contract-readonly", "dtn-source-contract":"dtn-source-contract-readonly" })[action]) throw new Error("Diagnostic NAP invalide.");
  fs.mkdirSync("outputs", { recursive: true });
  fs.writeFileSync(`outputs/nap-${action}.json`, JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify({ mode: result.mode, tableCount: result.tables?.length, relevant: result.relevant, competitionPlan: result.competitionPlan, references: result.references, publicationFlags: result.publicationFlags, permissions: result.permissions, missingTables: result.missingTables, atomicAcrossTables: result.atomicAcrossTables, writesExecuted: result.writesExecuted, complete: result.complete, errors: result.errors }));
}
main().catch(() => { console.error("Diagnostic NAP arrete. Aucune modification de la base."); process.exitCode = 1; });
