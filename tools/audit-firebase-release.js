"use strict";

// Lecture des metadonnees de deploiement uniquement. Aucun SDK Firestore,
// appel de Function, acces aux objets Storage ou commande de deploiement.
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

function releaseMetadata(release) {
  return {
    name: release.name, type: release.type, releaseTime: release.releaseTime,
    version: release.version && {
      name: release.version.name, status: release.version.status,
      createTime: release.version.createTime, finalizeTime: release.version.finalizeTime
    }
  };
}

function functionMetadata(fn) {
  const build = fn.buildConfig || {};
  const storage = build.source?.storageSource;
  return {
    name: fn.name, environment: fn.environment, state: fn.state || fn.status,
    updateTime: fn.updateTime, versionId: fn.versionId,
    runtime: build.runtime || fn.runtime, entryPoint: build.entryPoint || fn.entryPoint,
    revision: fn.serviceConfig?.revision, build: build.build || fn.buildId,
    source: storage && { bucket: storage.bucket, object: storage.object, generation: storage.generation },
    sourceArchiveUrl: fn.sourceArchiveUrl,
    eventType: fn.eventTrigger?.eventType,
    // Ne jamais conserver les variables d'environnement, secrets, URLs signees,
    // comptes, configurations completes ou messages d'erreur des API.
    firebaseFunctionsHash: fn.labels?.["firebase-functions-hash"]
  };
}

async function listPages(endpoint, key, token, request = fetch) {
  const items = [];
  const seen = new Set();
  let pageToken = "";
  for (let page = 0; page < 50; page++) {
    const url = new URL(endpoint);
    url.searchParams.set("pageSize", "100");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await request(url, {
      method: "GET", headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(30000), redirect: "error"
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json();
    if (body.unreachable?.length) throw new Error("Certaines regions sont inaccessibles");
    if (body[key] !== undefined && !Array.isArray(body[key])) throw new Error("Reponse API invalide");
    items.push(...(body[key] || []));
    pageToken = body.nextPageToken || "";
    if (!pageToken) return items;
    if (seen.has(pageToken)) throw new Error("Pagination repetee");
    seen.add(pageToken);
  }
  throw new Error("Inventaire incomplet: limite de pagination atteinte");
}

async function main() {
  const project = process.env.AUDIT_PROJECT;
  if (!["livepalmes", "livepalmes-test"].includes(project)) throw new Error("Projet interdit");
  const credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
  if (credentials.project_id !== project) throw new Error("Le compte de service ne correspond pas au projet");
  const token = execFileSync("gcloud", ["auth", "application-default", "print-access-token"], {
    encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30000
  }).trim();
  if (!token) throw new Error("Authentification indisponible");
  const report = {
    project, observedAt: new Date().toISOString(), workflowCommit: process.env.GITHUB_SHA,
    candidateCommit: process.env.CANDIDATE_SHA,
    credentialKind: process.env.AUDIT_CREDENTIAL_KIND,
    limitation: "Metadonnees uniquement: ne prouve ni les droits de deploiement ni la correspondance exacte avec un commit Git. Ne constitue pas une sauvegarde Functions."
  };
  const checks = [
    ["hosting", `https://firebasehosting.googleapis.com/v1beta1/sites/${project}/releases`, "releases", releaseMetadata],
    ["functionsV1", `https://cloudfunctions.googleapis.com/v1/projects/${project}/locations/-/functions`, "functions", functionMetadata],
    ["functionsV2", `https://cloudfunctions.googleapis.com/v2/projects/${project}/locations/-/functions`, "functions", functionMetadata]
  ];
  for (const [name, endpoint, key, sanitize] of checks) {
    try {
      report[name] = { status: "ok", items: (await listPages(endpoint, key, token)).map(sanitize) };
    } catch (error) {
      // Ne pas imprimer de corps d'erreur distant ou d'objet credentials.
      const reason = /^HTTP \d{3}$/.test(error.message) ? error.message : "Lecture incomplete ou indisponible";
      report[name] = { status: "blocked", reason };
    }
  }
  const directory = path.join(process.env.RUNNER_TEMP, "firebase-release-audit");
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, `${project}.json`), JSON.stringify(report, null, 2) + "\n");
  const lines = [`## Inventaire ${project}`, `Commit candidat : ${report.candidateCommit}`, ""];
  for (const [name] of checks) {
    const result = report[name];
    lines.push(`- ${name}: ${result.status === "ok" ? `${result.items.length} entrees` : result.reason}`);
  }
  lines.push("", report.limitation, "Aucune donnee metier lue ou modifiee. Aucun deploiement.", "");
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n"));
  if (checks.some(([name]) => report[name].status !== "ok")) process.exitCode = 1;
}

module.exports = { releaseMetadata, functionMetadata, listPages };
if (require.main === module) main().catch(() => {
  console.error("Audit bloque: verifier le secret du projet et l'authentification. Aucune modification Firebase.");
  process.exitCode = 1;
});
