"use strict";
// Pure annex policy. The original 251-profile manifest is never changed.
const planner = require("./user-name-correction-plan");
const OPERATION = "user-names-20261030-c620c467-4e61-4f9c-906b-f0ebcd6a573f";
const PLAN_DIGEST = "1ca1bfdb47b49b02f16bcc0cc9d2ee77394aea9b50455f5d3ac34f0434eb25ef";
const assert = (value, message) => { if (!value) throw new Error(message); };
const timestamp = value => typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,9})?Z$/.test(value);
function contextValid(context, closed = true) {
  const { plan, documents, completed, conflict, ledgerHash, lockHash, preparationFile } = context;
  planner.summary(plan);
  assert(planner.prepare(documents, plan.operationId).digest === plan.digest, "Original backup differs");
  if (closed) assert(plan.operationId === OPERATION && plan.digest === PLAN_DIGEST, "Original operation differs");
  assert(plan.entries.length === 251 && plan.entries.every(e => e.status === "swap") && completed.length === 70, "Resume counts differ");
  assert(new Set(completed.map(r => r.name)).size === 70, "Duplicate original receipts");
  assert(planner.hash(completed.map(r => r.name)) === planner.hash(plan.entries.slice(0, 70).map(e => e.name)), "Completed prefix differs");
  assert(completed.every(r => r.planDigest === plan.digest && timestamp(r.afterVersion)), "Original receipt differs");
  assert(conflict.planDigest === plan.digest && conflict.operationId === plan.operationId
    && planner.hash(conflict.changedFieldNames) === planner.hash(["lastLoginAt"])
    && plan.entries.slice(70).some(e => e.name === conflict.name && e.version === conflict.originalVersion), "Unapproved conflict scope");
  assert(/^[a-f0-9]{64}$/.test(ledgerHash) && /^[a-f0-9]{64}$/.test(lockHash)
    && /^correction-preparation-[a-f0-9-]+\.enc$/.test(preparationFile), "Private evidence reference invalid");
}
function validateOverride(context, doc) {
  const original = context.documents.find(d => d.name === context.conflict.name);
  assert(doc?.name === original.name && timestamp(doc.updateTime) && doc.updateTime !== original.updateTime
    && doc.createTime === original.createTime, "Concurrent profile version invalid");
  const omitLogin = fields => Object.fromEntries(Object.entries(fields || {}).filter(([key]) => key !== "lastLoginAt"));
  assert(planner.hash(omitLogin(doc.fields)) === planner.hash(omitLogin(original.fields)), "Concurrent non-login field changed");
  const login = doc.fields?.lastLoginAt;
  // The existing login bootstrap stores an ISO string, not a Firestore Timestamp.
  // Preserve that exact typed value; no conversion or normalization is allowed.
  assert(login && Object.keys(login).join(",") === "stringValue" && timestamp(login.stringValue)
    && (!original.fields.lastLoginAt || planner.hash(login) !== planner.hash(original.fields.lastLoginAt)), "Only the new login timestamp may differ");
}
function make(context, current, resumeId, createdAt, closed = true) {
  contextValid(context, closed);
  assert(/^[a-f0-9-]{36}$/.test(resumeId) && timestamp(createdAt), "Resume identity invalid");
  const remaining = context.plan.entries.slice(70);
  assert(current instanceof Map && current.size === 181 && remaining.every(e => current.has(e.name)), "Remaining scope differs");
  for (const entry of remaining) {
    const doc = current.get(entry.name);
    if (entry.name === context.conflict.name) validateOverride(context, doc);
    else assert(planner.proposedWrite(context.plan, entry.name, doc).status === "proposed-only", "Another pending profile changed");
  }
  const body = { schema: 1, operationId: context.plan.operationId, originalPlanDigest: context.plan.digest,
    resumeId, createdAt, preparationFile: context.preparationFile, ledgerHash: context.ledgerHash, originalLockHash: context.lockHash,
    completed: context.completed, remainingNames: remaining.map(e => e.name), override: current.get(context.conflict.name) };
  const detached = JSON.parse(JSON.stringify(body));
  return { ...detached, digest: planner.hash(detached) };
}
function verify(context, annex, closed = true) {
  contextValid(context, closed);
  const { digest, ...body } = annex;
  assert(Object.keys(body).sort().join(",") === ["schema","operationId","originalPlanDigest","resumeId","createdAt","preparationFile","ledgerHash","originalLockHash","completed","remainingNames","override"].sort().join(",")
    && digest === planner.hash(body) && body.schema === 1
    && body.operationId === context.plan.operationId && body.originalPlanDigest === context.plan.digest
    && body.ledgerHash === context.ledgerHash && body.originalLockHash === context.lockHash && body.preparationFile === context.preparationFile
    && /^[a-f0-9-]{36}$/.test(body.resumeId) && timestamp(body.createdAt)
    && planner.hash(body.completed) === planner.hash(context.completed)
    && planner.hash(body.remainingNames) === planner.hash(context.plan.entries.slice(70).map(e => e.name)), "Resume annex changed");
  validateOverride(context, body.override);
  return annex;
}
function proposedWrite(context, annex, name, current, receipt = null, direction = "apply", closed = true) {
  verify(context, annex, closed);
  if (!annex.remainingNames.includes(name)) return { status: "outside-resume-scope" };
  if (name !== annex.override.name) return planner.proposedWrite(context.plan, name, current, receipt, direction);
  if (!["apply", "rollback"].includes(direction)) throw new Error("Invalid resume direction");
  const entry = context.plan.entries.find(e => e.name === name);
  if (direction === "apply" && receipt) return { status: "already-recorded-no-write" };
  if (direction === "rollback" && !receipt) return { status: "receipt-required" };
  if (receipt && (receipt.name !== name || receipt.planDigest !== context.plan.digest || !timestamp(receipt.afterVersion))) throw new Error("Resume receipt differs");
  const version = direction === "apply" ? annex.override.updateTime : receipt.afterVersion;
  const expected = direction === "apply" ? annex.override.fields : { ...annex.override.fields, ...entry.after };
  if (!current || current.name !== name || current.updateTime !== version || planner.hash(current.fields) !== planner.hash(expected)) return { status: "concurrent-or-uncertain-conflict" };
  return { status: "proposed-only", write: { update: { name, fields: direction === "apply" ? entry.after : entry.before },
    updateMask: { fieldPaths: ["firstName", "lastName"] }, currentDocument: { updateTime: version } } };
}
function effectiveOriginals(context, annex, closed = true) {
  verify(context, annex, closed);
  return new Map(context.documents.map(doc => [doc.name, doc.name === annex.override.name ? structuredClone(annex.override) : structuredClone(doc)]));
}
module.exports = { OPERATION, PLAN_DIGEST, contextValid, validateOverride, make, verify, proposedWrite, effectiveOriginals };
