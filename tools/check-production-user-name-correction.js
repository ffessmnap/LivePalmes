"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const planner = require("./user-name-correction-plan");
const { seal } = require("./production-backup-crypto");
const { protectKey, powershell, assertPrivateDirectory } = require("./inventory-production-user-names");
const OPERATION = "user-names-20261030-c620c467-4e61-4f9c-906b-f0ebcd6a573f";
const DIGEST = "1ca1bfdb47b49b02f16bcc0cc9d2ee77394aea9b50455f5d3ac34f0434eb25ef";
const ENCRYPTED_HASH = "07013d705a6f739a854456d27bb1e5a65c8bf06475785fbe0e2b0c6dc8536201";
const DATABASE = "projects/livepalmes/databases/(default)";
let stage = "backup";

async function boundedJson(response) {
  if (!response.ok) throw new Error(`HTTP-${response.status}`);
  const chunks = []; let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > 32 * 1024 * 1024) throw new Error("Response budget exceeded");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
async function readDocuments(names, token, fetcher = fetch) {
  if (!Array.isArray(names) || !names.length || names.length > 100 || new Set(names).size !== names.length || names.some(name => !name.startsWith(`${DATABASE}/documents/`) || name.length > 512)) throw new Error("Read scope invalid");
  const result = await boundedJson(await fetcher(`https://firestore.googleapis.com/v1/${DATABASE}/documents:batchGet`, {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(30000),
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ documents: names })
  }));
  if (!Array.isArray(result) || result.length !== names.length) throw new Error("Read response invalid");
  const rows = new Map();
  for (const item of result) {
    const name = item.found?.name || item.missing;
    if (!names.includes(name) || rows.has(name)) throw new Error("Read response scope invalid");
    rows.set(name, item.found || null);
  }
  return rows;
}
function loadBackup() {
  const base = path.join(process.env.LOCALAPPDATA, "LivePalmes");
  const directory = path.join(base, "ProtectedBackups", OPERATION);
  for (const folder of [directory, path.join(base, "ProtectedBackupCopies", OPERATION), path.join(base, "ProtectedKeys", OPERATION)]) assertPrivateDirectory(folder);
  const key = protectKey("Unprotect", fs.readFileSync(path.join(base, "ProtectedKeys", OPERATION, "key.dpapi")));
  let backup;
  for (const target of [directory, path.join(base, "ProtectedBackupCopies", OPERATION)]) {
    const bytes = fs.readFileSync(path.join(target, "users.enc"));
    if (crypto.createHash("sha256").update(bytes).digest("hex") !== ENCRYPTED_HASH) throw new Error("Encrypted backup changed");
    const value = planner.restoreBackup(bytes, key);
    if (value.plan.digest !== DIGEST || value.plan.operationId !== OPERATION || value.documents.length !== 251 || planner.summary(value.plan).counts.swap !== 251) throw new Error("Frozen scope changed");
    if (backup && planner.hash(value.documents) !== planner.hash(backup.documents)) throw new Error("Copies differ");
    backup = value;
  }
  return { ...backup, key, directory };
}
function accessToken() {
  const token = powershell("gcloud.cmd auth print-access-token --quiet; if($LASTEXITCODE -ne 0) { throw 'Google access unavailable' }");
  if (token.length < 30 || /\s/.test(token)) throw new Error("Token unavailable");
  return token;
}
async function inspectTrigger(name, token) {
  const url = `https://cloudfunctions.googleapis.com/v2/projects/livepalmes/locations/europe-west1/functions/${name}`;
  const response = await fetch(url, { method: "GET", redirect: "error", headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) });
  if (response.status === 404) return { name, present: false };
  const value = await boundedJson(response);
  return { name, present: true, state: value.state, updateTime: value.updateTime, revision: value.serviceConfig?.revision,
    source: value.buildConfig?.source, eventType: value.eventTrigger?.eventType,
    filters: value.eventTrigger?.eventFilters, retryPolicy: value.eventTrigger?.retryPolicy };
}
async function main() {
  if (process.platform !== "win32" || process.argv[2] !== "--read-only-frozen-251") throw new Error("Read-only mode required");
  const backup = loadBackup();
  stage = "authentication";
  const token = accessToken();
  stage = "trigger-metadata";
  const triggers = [];
  for (const name of ["syncEngagementMailRecipientIndex", "syncNapClubAccountEmails"]) triggers.push(await inspectTrigger(name, token));
  stage = "frozen-source-read";
  const documents = [], conflicts = { missing: 0, nameChanged: 0, otherFieldsChanged: 0, versionOnlyChanged: 0 };
  let eligible = 0;
  const original = new Map(backup.documents.map(doc => [doc.name, doc]));
  for (let offset = 0; offset < backup.plan.entries.length; offset += 100) {
    const entries = backup.plan.entries.slice(offset, offset + 100);
    const current = await readDocuments(entries.map(entry => entry.name), token);
    for (const entry of entries) {
      const doc = current.get(entry.name);
      documents.push({ name: entry.name, current: doc });
      if (!doc) { conflicts.missing++; continue; }
      const result = planner.proposedWrite(backup.plan, entry.name, doc);
      if (result.status === "proposed-only") { eligible++; continue; }
      const currentNames = Object.fromEntries(["firstName", "lastName"].filter(key => Object.hasOwn(doc.fields || {}, key)).map(key => [key, doc.fields[key]]));
      if (planner.hash(currentNames) !== planner.hash(entry.before)) conflicts.nameChanged++;
      else if (planner.hash(doc.fields) !== planner.hash(original.get(entry.name).fields)) conflicts.otherFieldsChanged++;
      else conflicts.versionOnlyChanged++;
    }
  }
  const id = `preflight-${crypto.randomUUID()}`;
  const evidence = { operationId: OPERATION, planDigest: DIGEST, checkedAt: new Date().toISOString(), triggers, documents };
  const encrypted = seal(Buffer.from(JSON.stringify(evidence)), backup.key);
  fs.writeFileSync(path.join(backup.directory, `${id}.enc`), encrypted, { flag: "wx" });
  const receipt = { operationId: OPERATION, planDigest: DIGEST, checkedAt: evidence.checkedAt, frozen: 251, eligible, conflicts,
    sourceReads: 251, firestoreWrites: 0, authWrites: 0, triggers,
    encryptedEvidenceFile: `${id}.enc`, evidenceHash: crypto.createHash("sha256").update(encrypted).digest("hex") };
  fs.writeFileSync(path.join(backup.directory, `${id}-receipt.json`), JSON.stringify(receipt, null, 2), { flag: "wx" });
  backup.key.fill(0);
  console.log(JSON.stringify(receipt, null, 2));
}
if (require.main === module) main().catch(error => {
  const message = /^HTTP-\d{3}$/.test(error?.message || "") ? error.message : "private-diagnostic-required";
  console.error(`Controle arrete (etape ${stage}, ${message}). Aucune ecriture de correction executee.`);
  process.exitCode = 1;
});
module.exports = { readDocuments, boundedJson, loadBackup, accessToken, inspectTrigger, DATABASE, OPERATION, DIGEST };
