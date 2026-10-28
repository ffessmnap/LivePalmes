"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { TABLE, PAGE_SIZE, syncBatch } = require("../functions/nap-club-account-emails");
const schema = require("../functions/nap-club-account-emails-schema");

const MAX_ACCOUNTS = 10000;

async function scan(db, documentId, visit) {
  let cursor = "", count = 0;
  for (;;) {
    let query = db.collection("users").select().orderBy(documentId).limit(PAGE_SIZE);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    if (!page.size) return count;
    count += page.size;
    if (count > MAX_ACCOUNTS) throw new Error("Reprise hors budget ; arret sans scan illimite.");
    const ids = page.docs.map(doc => doc.id);
    if (ids.at(-1) <= cursor) throw new Error("Pagination incoherente.");
    if (visit) await visit(ids);
    cursor = ids.at(-1);
    if (page.size < PAGE_SIZE) return count;
  }
}

async function main() {
  const mode = process.env.ACCOUNT_EMAILS_MODE;
  if (!["inspect", "apply"].includes(mode) || process.env.GITHUB_REF !== "refs/heads/main" ||
      process.env.GITHUB_RUN_ATTEMPT !== "1" || process.env.EXPECTED_COMMIT !== process.env.GITHUB_SHA ||
      mode === "apply" && process.env.ACCOUNT_EMAILS_CONFIRMATION !== "nap-shared-prod-account-emails") {
    throw new Error("Cible, commit ou confirmation incorrects.");
  }
  const credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
  if (credentials.project_id !== "livepalmes" || credentials.client_email !== "github-actions-livepalmes-back@livepalmes.iam.gserviceaccount.com") {
    throw new Error("Lecture des profils PROD uniquement avec le compte backend PROD existant.");
  }
  const { initializeApp, applicationDefault } = require("../functions/node_modules/firebase-admin/app");
  const { getFirestore, FieldPath } = require("../functions/node_modules/firebase-admin/firestore");
  const app = initializeApp({ projectId: "livepalmes", credential: applicationDefault() });
  const db = getFirestore(app);
  const password = execFileSync("gcloud", ["secrets", "versions", "access", "latest", "--secret=LIVEPALMES_NAP_PASSWORD", "--project=livepalmes"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  const pool = require("../functions/nap-mysql").createNapPool(password);
  try {
    // Inventory is an explicit, bounded maintenance operation, never an interactive fallback.
    const sourceIds = new Set();
    const count = await scan(db, FieldPath.documentId(), async uids => { uids.forEach(uid => sourceIds.add(uid)); });
    const before = await schema.inspect(pool);
    // Include existing SQL keys so rerunning also clears profiles deleted since a previous run.
    if (before.exists) {
      const [rows] = await pool.execute({ sql: `SELECT firebase_uid FROM ${TABLE} ORDER BY firebase_uid LIMIT ${MAX_ACCOUNTS + 1}`, timeout: 10000 });
      rows.forEach(row => sourceIds.add(row.firebase_uid));
      if (sourceIds.size > MAX_ACCOUNTS || rows.length > MAX_ACCOUNTS) throw new Error("Reconciliation hors budget.");
    }
    let created = false, synchronized = 0;
    if (mode === "apply") {
      ({ created } = await schema.ensure(pool));
      const ids = [...sourceIds].sort();
      for (let offset = 0; offset < ids.length; offset += PAGE_SIZE) {
        const uids = ids.slice(offset, offset + PAGE_SIZE);
        const result = await syncBatch({ projectId: "livepalmes", pool, db, uids });
        synchronized += result.synchronized;
      }
    }
    const receipt = { sourceProject: "livepalmes", target: "nap-shared", table: TABLE,
      mode, commit: process.env.GITHUB_SHA, before, created, inventoried: count, synchronized,
      maxAccounts: MAX_ACCOUNTS, pageSize: PAGE_SIZE, testAccountsRead: false,
      firestoreWrites: 0, authWrites: 0, emailsSent: 0, functionsDeployed: 0,
      timestamp: new Date().toISOString() };
    fs.mkdirSync("outputs", { recursive: true });
    fs.writeFileSync(path.join("outputs", `nap-club-account-emails-${mode}.json`), JSON.stringify(receipt, null, 2) + "\n");
    console.log(JSON.stringify(receipt));
  } finally { await pool.end(); }
}

if (require.main === module) main().catch(() => {
  console.error("Reprise des comptes NAP arretee. Aucun detail personnel ou secret affiche. Les pages deja validees peuvent etre reprises.");
  process.exitCode = 1;
});
module.exports = { scan, MAX_ACCOUNTS };
