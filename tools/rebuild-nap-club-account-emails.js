"use strict";
const fs = require("node:fs"), path = require("node:path");
const { execFileSync } = require("node:child_process");
const { createRequire } = require("node:module");
const { PAGE_SIZE, FIELDS, project } = require("../functions/nap-club-account-emails");
const { hash, PLAN, CONFIRMATION } = require("../functions/nap-club-account-emails-maintenance");
const cryptoBackup = require("./production-backup-crypto");
const MAX_ACCOUNTS = 10000, DIRECTORY = "outputs/nap-club-account-emails";
let stage = "guard";

function loadFirebaseSdk() {
  const load = createRequire(path.join(__dirname, "../functions/package.json"));
  return { ...load("firebase-admin/app"), ...load("firebase-admin/firestore") };
}

async function scan(db, documentId, visit) {
  let cursor = "", count = 0;
  for (;;) {
    let query = db.collection("users").select().orderBy(documentId).limit(PAGE_SIZE);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    if (!page.size) return count;
    count += page.size;
    if (count > MAX_ACCOUNTS) throw new Error("Reprise hors budget.");
    const ids = page.docs.map(doc => doc.id);
    if (ids.at(-1) <= cursor) throw new Error("Pagination incoherente.");
    if (visit) await visit(ids);
    cursor = ids.at(-1);
    if (page.size < PAGE_SIZE) return count;
  }
}

function save(name, data) {
  fs.mkdirSync(DIRECTORY, { recursive: true });
  fs.writeFileSync(path.join(DIRECTORY, name), JSON.stringify(data), { mode: 0o600 });
}
function read(name) { return JSON.parse(fs.readFileSync(path.join(DIRECTORY, name), "utf8")); }
function backup(name, data, key) {
  const bytes = Buffer.from(JSON.stringify(data)), sealed = cryptoBackup.seal(bytes, key);
  fs.writeFileSync(path.join(DIRECTORY, name), sealed, { mode: 0o600 });
  if (!cryptoBackup.open(fs.readFileSync(path.join(DIRECTORY, name)), key).equals(bytes)) throw new Error("Sauvegarde non verifiee.");
}

async function privateRequest(input, execute = execFileSync, fetcher = fetch) {
  const options = { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] };
  const uri = execute("gcloud", ["functions", "describe", "exportNapPublicPage", "--gen2", "--region=europe-west1", "--project=livepalmes-test", "--format=value(serviceConfig.uri)"], options).trim();
  const url = new URL(uri);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".run.app") || url.username || url.password || url.search || url.hash) throw new Error("Endpoint prive incorrect.");
  const token = execute("gcloud", ["auth", "print-identity-token", `--audiences=${uri}`], options).trim();
  url.searchParams.set("action", "approved-club-account-emails");
  const response = await fetcher(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, sourceProject: "livepalmes", confirmation: CONFIRMATION }), signal: AbortSignal.timeout(170000) });
  if (!response.ok) throw new Error("Maintenance privee NAP indisponible.");
  const result = await response.json();
  if (result.sourceProject !== "livepalmes" || result.planHash !== PLAN) throw new Error("Reponse NAP incompatible.");
  return result;
}

async function main() {
  const phase = process.env.ACCOUNT_EMAILS_PHASE, mode = process.env.ACCOUNT_EMAILS_MODE;
  if (!["inspect", "apply"].includes(mode) || !["inspect", "export", "prepare", "apply"].includes(phase) ||
    process.env.GITHUB_REF !== "refs/heads/main" || process.env.GITHUB_RUN_ATTEMPT !== "1" ||
    process.env.EXPECTED_COMMIT !== process.env.GITHUB_SHA ||
    mode === "apply" && process.env.ACCOUNT_EMAILS_CONFIRMATION !== CONFIRMATION || phase === "apply" && mode !== "apply") throw new Error("Cible ou accord incorrect.");
  stage = "identity";
  const credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
  const source = phase === "export";
  if (credentials.project_id !== (source ? "livepalmes" : "livepalmes-test") || credentials.client_email !== (source
    ? "github-actions-livepalmes-back@livepalmes.iam.gserviceaccount.com" : "github-livepalmes-test-backend@livepalmes-test.iam.gserviceaccount.com")) throw new Error("Identite incorrecte.");
  stage = phase;
  if (phase === "inspect") {
    const result = await privateRequest({ phase });
    if (!Array.isArray(result.uids) || result.uids.length > MAX_ACCOUNTS) throw new Error("Inventaire hors budget.");
    save("target.json", result);
    save("inspect-receipt.json", { phase, planHash: PLAN, structure: result.structure, existing: result.uids.length, writes: 0 });
  } else if (source) {
    const { initializeApp, cert, getFirestore, FieldPath } = loadFirebaseSdk();
    const db = getFirestore(initializeApp({ projectId: "livepalmes", credential: cert(credentials) }));
    const ids = new Set(read("target.json").uids);
    const inventoried = await scan(db, FieldPath.documentId(), async page => page.forEach(uid => ids.add(uid)));
    if (ids.size > MAX_ACCOUNTS) throw new Error("Reconciliation hors budget.");
    const ordered = [...ids].sort(), rows = [];
    for (let offset = 0; offset < ordered.length; offset += PAGE_SIZE) {
      const page = ordered.slice(offset, offset + PAGE_SIZE);
      const snapshots = await db.getAll(...page.map(uid => db.collection("users").doc(uid)), { fieldMask: FIELDS });
      rows.push(...snapshots.map(project));
    }
    const exported = { sourceProject: "livepalmes", rows, hash: hash(rows) };
    save("source.json", exported);
    backup("source.enc", exported, credentials.private_key);
    save("source-receipt.json", { sourceProject: "livepalmes", inventoried, prepared: rows.length, writes: 0, planHash: PLAN });
  } else if (phase === "prepare") {
    const before = await privateRequest({ phase });
    save("before.json", before);
    backup("before.enc", before, credentials.private_key);
  } else {
    const exported = read("source.json");
    if (exported.sourceProject !== "livepalmes" || !Array.isArray(exported.rows) || exported.rows.length > MAX_ACCOUNTS || exported.hash !== hash(exported.rows)) throw new Error("Source alteree.");
    const created = await privateRequest({ phase: "create", planHash: PLAN });
    if (!created.verified) throw new Error("Creation non verifiee.");
    let synchronized = 0;
    for (let offset = 0; offset < exported.rows.length; offset += PAGE_SIZE) {
      const rows = exported.rows.slice(offset, offset + PAGE_SIZE);
      const result = await privateRequest({ phase: "apply", planHash: PLAN, rows, hash: hash(rows) });
      if (!result.verified || result.synchronized !== rows.length) throw new Error("Reprise incomplete.");
      synchronized += result.synchronized;
    }
    const receipt = { sourceProject: "livepalmes", target: "nap-shared", planHash: PLAN, commit: process.env.GITHUB_SHA,
      synchronized, created: created.created, verified: true, testAccountsRead: false, firestoreWrites: 0, authWrites: 0, emailsSent: 0,
      timestamp: new Date().toISOString() };
    save("apply-receipt.json", receipt);
    console.log(JSON.stringify(receipt));
  }
}
if (require.main === module) main().catch(() => {
  console.error(`Reprise NAP arretee (etape ${stage}). Examiner les recus avant reprise ; aucune donnee personnelle ou valeur de secret affichee.`);
  process.exitCode = 1;
});
module.exports = { scan, MAX_ACCOUNTS, loadFirebaseSdk, privateRequest };
