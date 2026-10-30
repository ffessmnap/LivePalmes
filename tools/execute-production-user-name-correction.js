"use strict";
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const planner = require("./user-name-correction-plan");
const { seal, open } = require("./production-backup-crypto");
const { runBatch } = require("./user-name-correction-engine");
const { loadBackup, accessToken, inspectTrigger, readDocuments, boundedJson, DATABASE, OPERATION, DIGEST } = require("./check-production-user-name-correction");
const controls = require("./user-name-correction-controls");
let stage = "guard", connection, written = 0;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

function durable(file, bytes) {
  const fd = fs.openSync(file, "wx");
  try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
function copyDirectory(backup) { return path.join(process.env.LOCALAPPDATA, "LivePalmes", "ProtectedBackupCopies", OPERATION); }
function savePrivate(backup, file, data) {
  if (!/^[a-zA-Z0-9_-]+\.enc$/.test(file)) throw new Error("Invalid journal filename");
  const bytes = seal(Buffer.from(JSON.stringify(data)), backup.key);
  for (const directory of [backup.directory, copyDirectory(backup)]) durable(path.join(directory, file), bytes);
  for (const directory of [backup.directory, copyDirectory(backup)]) if (!open(fs.readFileSync(path.join(directory, file)), backup.key).equals(Buffer.from(JSON.stringify(data)))) throw new Error("Journal readback failed");
}
function readPrivate(backup, file) {
  if (!/^[a-zA-Z0-9_-]+\.enc$/.test(file)) throw new Error("Invalid preparation filename");
  const primary = fs.readFileSync(path.join(backup.directory, file)), copy = fs.readFileSync(path.join(copyDirectory(backup), file));
  if (!primary.equals(copy)) throw new Error("Journal copies differ");
  return JSON.parse(open(primary, backup.key).toString("utf8"));
}
async function liveTriggers(token) {
  const triggers = [];
  for (const name of ["syncEngagementMailRecipientIndex", "syncNapClubAccountEmails"]) triggers.push(await inspectTrigger(name, token));
  return triggers;
}
async function prepare(backup, token) {
  stage = "deployed-source-verification";
  const triggers = await liveTriggers(token), proofs = [];
  for (const trigger of triggers) proofs.push(await controls.sourceProof(trigger, token));
  stage = "projection-baseline";
  const originals = new Map(backup.documents.map(doc => [doc.name, doc]));
  const baseline = await controls.projectionBaseline(originals, token);
  stage = "nap-readonly-baseline";
  connection = await controls.napConnection(token);
  const napBaseline = new Map();
  for (let offset = 0; offset < backup.plan.entries.length; offset += 10) {
    const entries = backup.plan.entries.slice(offset, offset + 10);
    for (const [uid, row] of await controls.napRows(connection, entries.map(entry => entry.name))) napBaseline.set(uid, row);
  }
  const file = `correction-preparation-${crypto.randomUUID()}.enc`;
  const data = { operationId: OPERATION, planDigest: DIGEST, preparedAt: new Date().toISOString(), triggers, proofs,
    projectionSpecs: [...baseline.specs], projectionDocuments: [...baseline.docs], napBaseline: [...napBaseline] };
  savePrivate(backup, file, data);
  return { operationId: OPERATION, preparationFile: file, frozenProfiles: 251, sourceProofs: proofs,
    projectionBaselineReads: baseline.uniqueReads, projectionEntries: [...baseline.specs.values()].flat().length,
    napBaselineQueries: 26, napBaselineRows: napBaseline.size, firestoreWrites: 0, sqlWrites: 0, authWrites: 0, savedInBothPrivateCopies: true };
}
function processAlive(pid) { try { process.kill(pid, 0); return true; } catch (error) { return error.code !== "ESRCH"; } }
async function execute(backup, token, file, direction) {
  const data = readPrivate(backup, file);
  if (data.operationId !== OPERATION || data.planDigest !== DIGEST) throw new Error("Preparation scope differs");
  const baseline = { specs: new Map(data.projectionSpecs), docs: new Map(data.projectionDocuments) }, napBaseline = new Map(data.napBaseline);
  const originals = new Map(backup.documents.map(doc => [doc.name, doc]));
  stage = "live-trigger-revision-guard";
  if (controls.triggerMetadataHash(await liveTriggers(token)) !== controls.triggerMetadataHash(data.triggers)) throw new Error("Trigger deployment changed");
  connection = await controls.napConnection(token);
  const completion = path.join(backup.directory, `${direction}-complete.json`);
  if (fs.existsSync(completion)) throw new Error("Operation already completed; no second inversion");
  const applyLock = path.join(backup.directory, "apply.lock");
  if (direction === "rollback" && fs.existsSync(applyLock)) {
    const lock = JSON.parse(fs.readFileSync(applyLock, "utf8"));
    if (processAlive(lock.pid)) throw new Error("Apply still running");
  }
  const lock = path.join(backup.directory, `${direction}.lock`);
  durable(lock, JSON.stringify({ pid: process.pid, operationId: OPERATION, planDigest: DIGEST, startedAt: new Date().toISOString() }));
  const recorded = [];
  if (direction === "rollback") {
    for (const name of fs.readdirSync(backup.directory).filter(name => /^apply-batch-\d{3}-receipt\.enc$/.test(name)).sort()) recorded.push(...readPrivate(backup, name).saved);
    if (!recorded.length || new Set(recorded.map(row => row.name)).size !== recorded.length) throw new Error("No unique correction receipts to restore");
  }
  const entries = direction === "apply" ? backup.plan.entries : backup.plan.entries.filter(entry => recorded.some(row => row.name === entry.name));
  const saved = [], observations = { firestoreDocumentReads: 0, sqlQueries: 0, projectionEntriesChecked: 0 };
  async function observe(batch, receipts, mode, finalCheck = false) {
    let last;
    // Two observations after the commit and one final observation = at most
    // three per lot, as budgeted. No silent refresh/rebuild beyond that.
    for (let attempt = 0; attempt < (finalCheck ? 1 : 2); attempt++) {
      if (attempt) await pause(5000);
      observations.firestoreDocumentReads += new Set(batch.flatMap(entry => baseline.specs.get(entry.name)).map(spec => spec.name)).size;
      try {
        const result = await controls.verifyProjections(batch, baseline, token, mode);
        observations.projectionEntriesChecked += result.entriesChecked;
        observations.sqlQueries++;
        await controls.verifyNap(connection, batch, napBaseline, receipts);
        return;
      } catch { last = new Error("Projection convergence failed; stop before next batch"); }
    }
    throw last;
  }
  for (let offset = 0; offset < entries.length; offset += 10) {
    const batch = entries.slice(offset, offset + 10), number = String(offset / 10 + 1).padStart(3, "0");
    stage = `${direction}-batch-${number}`;
    const result = await runBatch({ plan: backup.plan, entries: batch, originals, direction, receipts: recorded,
      read: names => readDocuments(names, token), observe,
      persist: async (kind, value) => savePrivate(backup, `${direction}-batch-${number}-${kind}.enc`, value),
      commit: async writes => {
        // The engine constructed every write from the authenticated frozen plan.
        const response = await fetch(`https://firestore.googleapis.com/v1/${DATABASE}/documents:commit`, {
          method: "POST", redirect: "error", signal: AbortSignal.timeout(30000),
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ writes })
        });
        const result = await boundedJson(response);
        written += writes.length;
        return result;
      }
    });
    saved.push(...result);
    console.log(JSON.stringify({ operationId: OPERATION, direction, verified: saved.length, total: entries.length }));
  }
  stage = "final-grouped-verification";
  const final = await controls.groupedRead(entries.map(entry => entry.name), token);
  for (const entry of entries) {
    const doc = final.get(entry.name), expected = { ...originals.get(entry.name).fields, ...(direction === "apply" ? entry.after : entry.before) };
    if (!doc || planner.hash(doc.fields) !== planner.hash(expected)) throw new Error("Final source comparison conflict");
  }
  // Check every corrected projection once more after all lots have converged.
  for (let offset = 0; offset < entries.length; offset += 10) {
    const batch = entries.slice(offset, offset + 10);
    await observe(batch, saved.filter(row => batch.some(entry => entry.name === row.name)), direction, true);
  }
  const summary = { operationId: OPERATION, planDigest: DIGEST, direction, completedAt: new Date().toISOString(), correctedOrRestored: entries.length,
    batches: Math.ceil(entries.length / 10), sourceWrites: written, finalSourceCompared: final.size, observations,
    onlyNameFieldsWritten: true, authWrites: 0, directSqlWrites: 0, emailsRequested: 0, backupPreserved: true,
    rollbackReceiptsAvailable: true, userValidation: "not-claimed", preparationFile: file };
  savePrivate(backup, `${direction}-completed-evidence.enc`, { summary, saved });
  durable(completion, JSON.stringify(summary, null, 2));
  fs.unlinkSync(lock);
  return summary;
}
async function main() {
  const mode = process.argv[2];
  if (process.platform !== "win32" || !["--prepare-frozen-251", "--apply-frozen-251", "--rollback-recorded"].includes(mode)) throw new Error("Explicit operation required");
  const backup = loadBackup(), token = accessToken();
  try {
    const result = mode === "--prepare-frozen-251" ? await prepare(backup, token) : await execute(backup, token, process.argv[3], mode === "--apply-frozen-251" ? "apply" : "rollback");
    console.log(JSON.stringify(result, null, 2));
  } finally { backup.key.fill(0); if (connection) await connection.end(); }
}
if (require.main === module) main().catch(error => {
  const message = /^HTTP-\d{3}$/.test(error?.message || "") ? error.message : "private-diagnostic-required";
  console.error(JSON.stringify({ stopped: true, stage, sourceWritesWithResponse: written, diagnostic: message, automaticRetry: false }));
  process.exitCode = 1;
});
module.exports = { durable, savePrivate, readPrivate, prepare, execute };
