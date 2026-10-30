"use strict";
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const planner = require("./user-name-correction-plan"), policy = require("./user-name-correction-resume");
const check = require("./check-production-user-name-correction"), previous = require("./execute-production-user-name-correction");
const controls = require("./user-name-correction-controls"), { runBatch } = require("./user-name-correction-engine");
const ORIGINAL_PREPARATION = "correction-preparation-985e4991-70a7-43f1-962e-c5ac28169356.enc";
const CONFLICT_EVIDENCE = "infra-concurrency-detail-de436a4a-3bce-40f7-89ba-003d88b561fb.enc";
let stage = "guard", connection, writes = 0;
const hashBytes = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const copyDirectory = () => path.join(process.env.LOCALAPPDATA, "LivePalmes", "ProtectedBackupCopies", check.OPERATION);
function alive(pid) { try { process.kill(pid, 0); return true; } catch (error) { return error.code !== "ESRCH"; } }
function context(backup) {
  const lockBytes = fs.readFileSync(path.join(backup.directory, "apply.lock")), lock = JSON.parse(lockBytes);
  if (lock.operationId !== check.OPERATION || lock.planDigest !== check.DIGEST || !Number.isSafeInteger(lock.pid) || alive(lock.pid)) throw new Error("Original writer active or lock invalid");
  const allowed = Array.from({ length: 7 }, (_, i) => ["intent", "receipt", "verified"].map(kind => `apply-batch-${String(i + 1).padStart(3, "0")}-${kind}.enc`)).flat().sort();
  for (const directory of [backup.directory, copyDirectory()]) {
    const actual = fs.readdirSync(directory).filter(file => /^apply-batch-/.test(file)).sort();
    if (planner.hash(actual) !== planner.hash(allowed) || fs.existsSync(path.join(directory, "apply-complete.json"))) throw new Error("Original journal changed or uncertain");
  }
  const originals = new Map(backup.documents.map(doc => [doc.name, doc])), completed = [], hashes = [];
  for (let i = 0; i < 7; i++) {
    const names = backup.plan.entries.slice(i * 10, i * 10 + 10).map(e => e.name), number = String(i + 1).padStart(3, "0");
    const files = Object.fromEntries(["intent", "receipt", "verified"].map(kind => {
      const file = `apply-batch-${number}-${kind}.enc`;
      hashes.push({ file, hash: hashBytes(fs.readFileSync(path.join(backup.directory, file))) });
      return [kind, previous.readPrivate(backup, file)];
    }));
    for (const record of Object.values(files)) if (record.planDigest !== check.DIGEST || record.direction !== "apply") throw new Error("Original journal scope differs");
    const expected = names.map(name => planner.proposedWrite(backup.plan, name, originals.get(name)).write);
    if (planner.hash(files.intent.names) !== planner.hash(names) || planner.hash(files.intent.writes) !== planner.hash(expected)
        || planner.hash(files.receipt.saved.map(row => row.name)) !== planner.hash(names)
        || planner.hash(files.verified.saved) !== planner.hash(files.receipt.saved)) throw new Error("Original receipts not verified");
    completed.push(...files.receipt.saved);
  }
  for (const file of [ORIGINAL_PREPARATION, CONFLICT_EVIDENCE]) hashes.push({ file, hash: hashBytes(fs.readFileSync(path.join(backup.directory, file))) });
  const value = { plan: backup.plan, documents: backup.documents, completed,
    conflict: previous.readPrivate(backup, CONFLICT_EVIDENCE), preparationFile: ORIGINAL_PREPARATION,
    ledgerHash: planner.hash(hashes), lockHash: hashBytes(lockBytes) };
  policy.contextValid(value);
  return value;
}
async function triggerGuard(token, preparation) {
  const current = [];
  for (const name of ["syncEngagementMailRecipientIndex", "syncNapClubAccountEmails"]) current.push(await check.inspectTrigger(name, token));
  if (controls.triggerMetadataHash(current) !== controls.triggerMetadataHash(preparation.triggers)) throw new Error("Trigger deployment changed");
}
function baselineOf(preparation, annex) {
  const baseline = { specs: new Map(preparation.projectionSpecs), docs: new Map(structuredClone(preparation.projectionDocuments)) };
  // The directory trigger copies the same login string. Preserve the one frozen
  // login exception there too; every other projection field remains guarded.
  for (const spec of baseline.specs.get(annex.override.name) || []) {
    const fields = baseline.docs.get(spec.name)?.fields?.[spec.map]?.mapValue?.fields?.[spec.key]?.mapValue?.fields;
    if (fields && Object.hasOwn(fields, "lastLoginAt")) fields.lastLoginAt = structuredClone(annex.override.fields.lastLoginAt);
  }
  return baseline;
}
async function prepare(backup, token, file) {
  if (file !== ORIGINAL_PREPARATION) throw new Error("Original preparation required");
  for (const dir of [backup.directory, copyDirectory()]) if (fs.readdirSync(dir).some(name => /^reviewed-resume-.*\.lock$/.test(name))) throw new Error("Resume already started; no new annex automatically");
  const ctx = context(backup), preparation = previous.readPrivate(backup, file);
  stage = "prepare-trigger-check"; await triggerGuard(token, preparation);
  stage = "prepare-181-source-read";
  const entries = backup.plan.entries.slice(70), current = await controls.groupedRead(entries.map(e => e.name), token);
  const annex = policy.make(ctx, current, crypto.randomUUID(), new Date().toISOString());
  stage = "prepare-projection-read";
  const baseline = baselineOf(preparation, annex), nap = new Map(preparation.napBaseline);
  connection = await controls.napConnection(token);
  let projectionDocuments = 0, projectionEntries = 0, queries = 0;
  for (let i = 0; i < entries.length; i += 10) {
    const batch = entries.slice(i, i + 10);
    // Reader only: "rollback" here selects original names, not an operation.
    const result = await controls.verifyProjections(batch, baseline, token, "rollback");
    projectionDocuments += result.documentsRead; projectionEntries += result.entriesChecked;
    const rows = await controls.napRows(connection, batch.map(e => e.name)); queries++;
    for (const entry of batch) {
      const uid = entry.name.split("/").at(-1), before = nap.get(uid), after = rows.get(uid);
      if (!before || !after) throw new Error("Missing SQL projection");
      const business = row => Object.fromEntries(Object.entries(row).filter(([key]) => key !== "source_version"));
      if (planner.hash(business(before)) !== planner.hash(business(after))) throw new Error("SQL business projection changed");
    }
  }
  const resumeFile = `resume-preparation-${annex.resumeId}.enc`;
  previous.savePrivate(backup, resumeFile, annex);
  const reopened = previous.readPrivate(backup, resumeFile); policy.verify(ctx, reopened);
  return { operationId: check.OPERATION, originalPlanDigest: check.DIGEST, resumeFile, resumeDigest: annex.digest,
    capturedAt: annex.createdAt, protectedAlreadyCorrected: 70, remaining: 181, loginExceptionProfiles: 1,
    exceptionField: "lastLoginAt", sourceReads: current.size, projectionDocumentsRead: projectionDocuments,
    projectionEntriesChecked: projectionEntries, napReadQueries: queries, sourceWrites: 0, directSqlWrites: 0,
    authWrites: 0, originalManifestUnchanged: true, originalLockPreserved: true, copiesReopened: 2,
    approvalRequiredBeforeApply: true };
}
function savedResumeReceipts(backup, prefix, annex) {
  const files = fs.readdirSync(backup.directory).filter(name => name.startsWith(prefix+"-apply-batch-") && name.endsWith("-receipt.enc")).sort();
  if (fs.readdirSync(backup.directory).some(name => name.startsWith(prefix+"-apply-batch-") && name.endsWith("-uncertain.enc"))) throw new Error("Uncertain resume must be reconciled privately");
  const saved = [];
  for (const file of files) {
    const value = previous.readPrivate(backup, file);
    if (value.resumeDigest !== annex.digest || value.planDigest !== check.DIGEST || value.direction !== "apply") throw new Error("Resume receipt scope differs");
    saved.push(...value.saved);
  }
  if (!saved.length || new Set(saved.map(row => row.name)).size !== saved.length || saved.some(row => !annex.remainingNames.includes(row.name))) throw new Error("Unique resume receipts required");
  return saved;
}
function reserveLocks(backup, prefix, direction, annex, isAlive = alive) {
  if (!["apply", "rollback"].includes(direction) || prefix !== `resume-${annex.digest.slice(0, 16)}`) throw new Error("Lock scope differs");
  const dirs = [backup.directory, copyDirectory()], global = `reviewed-resume-${direction}.lock`, own = `${prefix}-${direction}.lock`;
  for (const dir of dirs) {
    if (fs.existsSync(path.join(dir, global)) || fs.existsSync(path.join(dir, own))
        || fs.existsSync(path.join(dir, `${prefix}-${direction}-complete.json`))) throw new Error("Resume already started; preserve locks and inspect journals");
    if (direction === "apply" && fs.readdirSync(dir).some(name => name.startsWith(prefix+"-apply-batch-"))) throw new Error("Existing resume journal requires private review");
  }
  if (direction === "rollback") {
    const values = dirs.map(dir => fs.readFileSync(path.join(dir, "reviewed-resume-apply.lock")));
    if (!values[0].equals(values[1])) throw new Error("Apply lock copies differ");
    const apply = JSON.parse(values[0]);
    if (apply.resumeDigest !== annex.digest || isAlive(apply.pid)) throw new Error("Resume writer active or scope differs");
  }
  const bytes = Buffer.from(JSON.stringify({ operationId: check.OPERATION, planDigest: check.DIGEST,
    resumeDigest: annex.digest, direction, pid: process.pid, startedAt: new Date().toISOString() }));
  // A shared lock serializes all annexes of this original operation. No old or
  // new lock is ever removed automatically, including after completion.
  for (const dir of dirs) previous.durable(path.join(dir, global), bytes);
  for (const dir of dirs) previous.durable(path.join(dir, own), bytes);
  for (const dir of dirs) for (const file of [global, own]) if (!fs.readFileSync(path.join(dir, file)).equals(bytes)) throw new Error("Resume lock readback failed");
}
async function execute(backup, token, file, expectedDigest, direction) {
  if (!/^resume-preparation-[a-f0-9-]+\.enc$/.test(file) || !/^[a-f0-9]{64}$/.test(expectedDigest || "")) throw new Error("Explicit reviewed resume required");
  const ctx = context(backup), annex = previous.readPrivate(backup, file); policy.verify(ctx, annex);
  if (annex.digest !== expectedDigest) throw new Error("Reviewed resume digest differs");
  const prefix = `resume-${annex.digest.slice(0, 16)}`, complete = `${prefix}-${direction}-complete.json`;
  for (const dir of [backup.directory, copyDirectory()]) if (fs.existsSync(path.join(dir, `reviewed-resume-${direction}.lock`))
    || fs.existsSync(path.join(dir, `${prefix}-${direction}.lock`)) || fs.existsSync(path.join(dir, complete))) throw new Error("Resume already started; preserve journals");
  const recorded = direction === "rollback" ? savedResumeReceipts(backup, prefix, annex) : [];
  const entries = backup.plan.entries.filter(e => annex.remainingNames.includes(e.name) && (direction === "apply" || recorded.some(r => r.name === e.name)));
  const proposeWrite = (plan, name, current, receipt, mode) => policy.proposedWrite(ctx, annex, name, current, receipt, mode);
  stage = "resume-trigger-guard";
  const preparation = previous.readPrivate(backup, ORIGINAL_PREPARATION); await triggerGuard(token, preparation);
  stage = "resume-fresh-source-guard";
  const fresh = await controls.groupedRead(entries.map(e => e.name), token);
  for (const entry of entries) if (proposeWrite(backup.plan, entry.name, fresh.get(entry.name), recorded.find(r => r.name === entry.name), direction).status !== "proposed-only") throw new Error("Profile changed since reviewed annex");
  connection = await controls.napConnection(token);
  reserveLocks(backup, prefix, direction, annex);
  const baseline = baselineOf(preparation, annex), nap = new Map(preparation.napBaseline), originals = policy.effectiveOriginals(ctx, annex);
  const saved = []; let projectionReads = 0, projectionEntries = 0, sqlQueries = 0;
  async function observe(batch, receipts, mode, final = false) {
    for (let attempt = 0; attempt < (final ? 1 : 2); attempt++) {
      if (attempt) await new Promise(resolve => setTimeout(resolve, 5000));
      try {
        const value = await controls.verifyProjections(batch, baseline, token, mode); projectionReads += value.documentsRead; projectionEntries += value.entriesChecked;
        sqlQueries++; await controls.verifyNap(connection, batch, nap, receipts); return;
      } catch { if (final || attempt === 1) throw new Error("Projection convergence failed; no automatic continuation"); }
    }
  }
  for (let offset = 0; offset < entries.length; offset += 10) {
    const batch = entries.slice(offset, offset + 10), number = String(offset / 10 + 1).padStart(3, "0"); stage = `${direction}-resume-batch-${number}`;
    const result = await runBatch({ plan: backup.plan, entries: batch, originals, proposeWrite, direction, receipts: recorded,
      read: names => check.readDocuments(names, token), observe,
      persist: async (kind, value) => previous.savePrivate(backup, `${prefix}-${direction}-batch-${number}-${kind}.enc`, { ...value, resumeDigest: annex.digest }),
      commit: async payload => {
        const response = await fetch(`https://firestore.googleapis.com/v1/${check.DATABASE}/documents:commit`, {
          method: "POST", redirect: "error", signal: AbortSignal.timeout(30000),
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ writes: payload }) });
        const result = await check.boundedJson(response); writes += payload.length; return result;
      } });
    saved.push(...result); console.log(JSON.stringify({ direction, resumeVerified: saved.length, remainingScope: entries.length, untouchedOriginalCorrections: 70 }));
  }
  stage = "resume-final-source-check";
  const final = await controls.groupedRead(entries.map(e => e.name), token);
  for (const entry of entries) {
    const doc = final.get(entry.name), expected = { ...originals.get(entry.name).fields, ...(direction === "apply" ? entry.after : entry.before) };
    if (!doc || doc.updateTime !== saved.find(r => r.name === entry.name).afterVersion || planner.hash(doc.fields) !== planner.hash(expected)) throw new Error("Final resume source conflict");
  }
  for (let offset = 0; offset < entries.length; offset += 10) {
    const batch = entries.slice(offset, offset + 10); await observe(batch, saved.filter(r => batch.some(e => e.name === r.name)), direction, true);
  }
  const summary = { operationId: check.OPERATION, originalPlanDigest: check.DIGEST, resumeDigest: annex.digest, direction,
    completedAt: new Date().toISOString(), correctedOrRestored: saved.length, protectedOriginalCorrections: 70,
    sourceWrites: writes, projectionReads, projectionEntries, sqlQueries, originalLockPreserved: true,
    newLocksPreserved: true, originalManifestUnchanged: true, onlyNameFieldsWritten: true,
    authWrites: 0, directSqlWrites: 0, emailsRequested: 0, privateRollbackReceipts: true };
  previous.savePrivate(backup, `${prefix}-${direction}-completed-evidence.enc`, { summary, saved });
  for (const dir of [backup.directory, copyDirectory()]) previous.durable(path.join(dir, complete), Buffer.from(JSON.stringify(summary)));
  return summary;
}
async function main() {
  const [mode, file, digest] = process.argv.slice(2);
  if (process.platform !== "win32" || !["--prepare-remaining-181", "--apply-reviewed-resume", "--rollback-resume-recorded"].includes(mode)) throw new Error("Explicit resume mode required");
  const backup = check.loadBackup();
  try {
    const token = check.accessToken();
    const result = mode === "--prepare-remaining-181" ? await prepare(backup, token, file)
      : await execute(backup, token, file, digest, mode === "--apply-reviewed-resume" ? "apply" : "rollback");
    console.log(JSON.stringify(result, null, 2));
  } finally { backup.key.fill(0); if (connection) await connection.end(); }
}
if (require.main === module) main().catch(error => {
  console.error(JSON.stringify({ stopped: true, stage, sourceWritesWithResponse: writes,
    diagnostic: /^HTTP-\d{3}$/.test(error?.message || "") ? error.message : "private-diagnostic-required", automaticRetry: false }));
  process.exitCode = 1;
});
module.exports = { context, prepare, execute, savedResumeReceipts, reserveLocks, baselineOf };
