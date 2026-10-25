"use strict";
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
async function main({ env = process.env, files = fs, exec = execFileSync, request = fetch, log = console.log } = {}) {
  let stage = "cible-test";
  try {
  const project = "livepalmes-test";
  if (env.TARGET_FIREBASE_PROJECT !== project) throw new Error("Diagnostic reserve a TEST.");
  stage = "identifiants-test";
  const credentials = JSON.parse(files.readFileSync(env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
  if (credentials.project_id !== project || credentials.client_email !== "github-livepalmes-test-backend@livepalmes-test.iam.gserviceaccount.com") throw new Error("Compte TEST incorrect.");
  const action = env.NAP_SOURCE_ACTION || "source-inventory";
  stage = "description-fonction";
  const options = { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 60000, maxBuffer: 1024 * 1024 };
  const uri = exec("gcloud", ["functions", "describe", "exportNapPublicPage", "--gen2", "--region=europe-west1", `--project=${project}`, "--format=value(serviceConfig.uri)"], options).trim();
  stage = "validation-endpoint";
  const url = new URL(uri);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".run.app") || url.username || url.password || url.search) throw new Error("Endpoint prive invalide.");
  stage = "jeton-identite";
  const token = exec("gcloud", ["auth", "print-identity-token", `--audiences=${uri}`], options).trim();
  stage = "validation-action";
  if (!["performance-clubs", "source-inventory", "calendar-contract", "portal-contract", "engagement-contract", "portal-competition-contract", "portal-entry-contract", "portal-competition-write-plans", "portal-course-document-contract", "portal-person-status-plans", "portal-team-leader-contract", "dtn-source-contract", "dtn-service-contract"].includes(action)) throw new Error("Diagnostic invalide.");
  url.searchParams.set("action", action);
  stage = "appel-diagnostic";
  const response = await request(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw Object.assign(new Error("Diagnostic NAP indisponible."), { httpStatus: response.status });
  stage = "lecture-json";
  const result = await response.json();
  stage = "validation-contrat";
  if (result.source !== "nap" || result.mode !== ({ "performance-clubs":"performance-clubs-readonly", "source-inventory": "structure-only", "calendar-contract": "calendar-contract", "portal-contract": "portal-contract-readonly", "engagement-contract": "engagement-contract-readonly", "portal-competition-contract": "portal-competition-contract-readonly", "portal-entry-contract": "portal-entry-contract-readonly", "portal-competition-write-plans":"portal-competition-write-plans-readonly", "portal-course-document-contract":"portal-course-document-contract-readonly", "portal-person-status-plans":"portal-person-status-plans-readonly", "portal-team-leader-contract":"portal-team-leader-contract-readonly", "dtn-source-contract":"dtn-source-contract-readonly", "dtn-service-contract":"dtn-service-contract-readonly" })[action]) throw new Error("Diagnostic NAP invalide.");
  stage = "enregistrement-rapport";
  files.mkdirSync("outputs", { recursive: true });
  files.writeFileSync(`outputs/nap-${action}.json`, JSON.stringify(result, null, 2) + "\n");
  log(JSON.stringify({ mode: result.mode, tableCount: result.tables?.length, relevant: result.relevant, competitionPlan: result.competitionPlan, references: result.references, publicationFlags: result.publicationFlags, permissions: result.permissions, missingTables: result.missingTables, atomicAcrossTables: result.atomicAcrossTables, writesExecuted: result.writesExecuted, complete: result.complete, errors: result.errors }));
  } catch (error) {
    // Never expose raw stderr, response bodies, URLs, credentials or tokens.
    const raw = String(error.stderr || "") + String(error.message || "");
    let category = "echec-etape";
    if (/PERMISSION_DENIED|permission denied/i.test(raw)) category = "permission-refusee";
    else if (/NOT_FOUND|not found/i.test(raw)) category = "ressource-introuvable";
    else if (/UNAUTHENTICATED|invalid_grant/i.test(raw)) category = "authentification-refusee";
    else if (/audiences.*service account|service account.*audiences/i.test(raw)) category = "audience-compte-service-requise";
    else if (["ETIMEDOUT", "ABORT_ERR"].includes(error.code) || ["TimeoutError", "AbortError"].includes(error.name)) category = "delai-depasse";
    else if (error instanceof SyntaxError) category = "json-invalide";
    const report = { stage, category };
    if (Number.isInteger(error.httpStatus) && error.httpStatus >= 100 && error.httpStatus <= 599) report.httpStatus = error.httpStatus;
    throw new Error("Diagnostic NAP arrete. Aucune modification de la base. " + JSON.stringify(report));
  }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { main };
