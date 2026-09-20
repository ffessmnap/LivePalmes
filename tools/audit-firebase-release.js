"use strict";

// Lecture des metadonnees et verification des permissions uniquement. Aucun SDK Firestore,
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
    runtimeServiceAccount: fn.serviceConfig?.serviceAccountEmail || fn.serviceAccountEmail,
    buildServiceAccount: build.serviceAccount,
    revision: fn.serviceConfig?.revision, build: build.build || fn.buildId,
    source: storage && { bucket: storage.bucket, object: storage.object, generation: storage.generation },
    sourceArchiveUrl: fn.sourceArchiveUrl,
    eventType: fn.eventTrigger?.eventType,
    // Ne jamais conserver les variables d'environnement, secrets, URLs signees,
    // configurations completes ou messages d'erreur des API.
    firebaseFunctionsHash: fn.labels?.["firebase-functions-hash"]
  };
}

function reportSummary(report) {
  const cell = value => String(value ?? "—").replace(/[|\r\n<>]/g, " ");
  const lines = [`## Inventaire ${cell(report.project)}`, `Commit candidat : ${cell(report.candidateCommit)}`, ""];
  for (const name of ["hosting", "functionsV1", "functionsV2"]) {
    const result = report[name];
    lines.push(`- ${name}: ${result.status === "ok" ? `${result.items.length} entrees` : cell(result.reason)}`);
  }
  const releases = [...(report.hosting.items || [])].sort((a, b) => (b.releaseTime || "").localeCompare(a.releaseTime || ""));
  lines.push("", "### Dernieres releases Hosting", "", "| Release | Version | Date | Type |", "| --- | --- | --- | --- |");
  for (const release of releases.slice(0, 3)) {
    lines.push(`| ${cell(release.name)} | ${cell(release.version?.name)} | ${cell(release.releaseTime)} | ${cell(release.type)} |`);
  }
  const functions = [...(report.functionsV1.items || []), ...(report.functionsV2.items || [])];
  lines.push("", "### Comptes techniques utilises", "");
  for (const field of ["runtimeServiceAccount", "buildServiceAccount"]) {
    for (const account of [...new Set(functions.map(fn => fn[field]).filter(Boolean))].sort()) {
      lines.push(`- ${field}: ${cell(account)}`);
    }
  }
  lines.push("", "### Versions Functions", "", "| Function | Mise a jour | Revision | Empreinte Firebase |", "| --- | --- | --- | --- |");
  for (const fn of functions.sort((a, b) => a.name.localeCompare(b.name))) {
    lines.push(`| ${cell(fn.name)} | ${cell(fn.updateTime)} | ${cell(fn.revision)} | ${cell(fn.firebaseFunctionsHash)} |`);
  }
  lines.push('', '### Permissions de deploiement (verification sans modification)', '');
  for (const result of report.permissions || []) {
    lines.push(`- ${cell(result.resource)}: ${result.error ? cell(result.error) : result.missing.length ? 'MANQUANT: ' + result.missing.map(cell).join(', ') : 'permissions controlees presentes'}`);
    if (result.granted?.length) lines.push(`  - Accorde: ${result.granted.map(cell).join(', ')}`);
  }
  lines.push("", report.limitation, "Aucune donnee metier lue ou modifiee. Aucun deploiement.", "");
  return lines.join("\n");
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

async function testPermissions(endpoint, permissions, token, request = fetch) {
  // testIamPermissions est une verification sans modification des droits.
  const url = new URL(endpoint);
  if (!['iam.googleapis.com', 'cloudresourcemanager.googleapis.com'].includes(url.hostname) ||
      url.protocol !== 'https:' || !url.pathname.endsWith(':testIamPermissions')) {
    throw new Error('Endpoint de verification interdit');
  }
  const response = await request(url, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ permissions }), redirect: 'error', signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const granted = (await response.json()).permissions || [];
  return { granted: permissions.filter(p => granted.includes(p)), missing: permissions.filter(p => !granted.includes(p)) };
}

async function deploymentPermissions(project, functions, token) {
  const results = [];
  const projectPermissions = [
    'cloudfunctions.functions.create', 'cloudfunctions.functions.update', 'cloudfunctions.functions.sourceCodeGet',
    'run.services.getIamPolicy', 'run.services.setIamPolicy',
    'eventarc.triggers.create', 'eventarc.triggers.update', 'eventarc.triggers.get',
    'serviceusage.services.use', 'serviceusage.services.get', 'firebase.projects.get',
    'resourcemanager.projects.get', 'cloudbuild.builds.get', 'artifactregistry.repositories.get'
  ];
  const checks = [{ resource: project, endpoint: `https://cloudresourcemanager.googleapis.com/v1/projects/${project}:testIamPermissions`, permissions: projectPermissions }];
  const accounts = new Set(functions.flatMap(fn => [fn.runtimeServiceAccount, fn.buildServiceAccount]).filter(Boolean).map(s => s.split('/').pop()));
  for (const account of accounts) {
    if (!/^[a-zA-Z0-9_.@-]+$/.test(account)) throw new Error('Compte technique invalide');
    checks.push({ resource: account, endpoint: `https://iam.googleapis.com/v1/projects/${project}/serviceAccounts/${account}:testIamPermissions`, permissions: ['iam.serviceAccounts.actAs'] });
  }
  for (const check of checks) {
    try { results.push({ resource: check.resource, ...await testPermissions(check.endpoint, check.permissions, token) }); }
    catch (error) { results.push({ resource: check.resource, error: /^HTTP \d{3}$/.test(error.message) ? error.message : 'Controle indisponible' }); }
  }
  return results;
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
  report.permissions = await deploymentPermissions(project, [...(report.functionsV1.items || []), ...(report.functionsV2.items || [])], token);
  const directory = path.join(process.env.RUNNER_TEMP, "firebase-release-audit");
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, `${project}.json`), JSON.stringify(report, null, 2) + "\n");
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, reportSummary(report));
  if (checks.some(([name]) => report[name].status !== "ok")) process.exitCode = 1;
}

module.exports = { releaseMetadata, functionMetadata, listPages, reportSummary, testPermissions };
if (require.main === module) main().catch(() => {
  console.error("Audit bloque: verifier le secret du projet et l'authentification. Aucune modification Firebase.");
  process.exitCode = 1;
});
