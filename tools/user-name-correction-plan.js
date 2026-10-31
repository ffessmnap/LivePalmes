"use strict";

// Preparation only: no Firebase SDK, credentials, network, filesystem or execution CLI.
// Inputs are Firestore REST-shaped documents; callers must keep them private.
const { createHash } = require("node:crypto");
const { seal, open } = require("./production-backup-crypto");
const PREFIX = "projects/livepalmes/databases/(default)/documents/users/";
const MAX_DOCUMENTS = 1000;
const BATCH_SIZE = 10;

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  if (value === undefined) throw new Error("Undefined interdit dans le format de sauvegarde.");
  return JSON.stringify(value);
}
function hash(value) { return createHash("sha256").update(canonical(value)).digest("hex"); }
function validateDocument(doc) {
  if (!doc || typeof doc.name !== "string" || !doc.name.startsWith(PREFIX) ||
      !doc.name.slice(PREFIX.length) || doc.name.slice(PREFIX.length).includes("/") ||
      typeof doc.updateTime !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,9})?Z$/.test(doc.updateTime) ||
      !doc.fields || typeof doc.fields !== "object" || Array.isArray(doc.fields)) {
    throw new Error("Document ou version hors contrat.");
  }
}
function names(doc) {
  return Object.fromEntries(["firstName", "lastName"].filter(key => Object.hasOwn(doc.fields, key)).map(key => [key, doc.fields[key]]));
}
function classify(doc) {
  const values = [doc.fields.firstName, doc.fields.lastName];
  if (values.some(value => value !== undefined && (!value || typeof value.stringValue !== "string" || Object.keys(value).length !== 1))) return "invalid-type";
  if (values.some(value => !value || !value.stringValue.trim())) return "partial-or-empty";
  if (values[0].stringValue === values[1].stringValue) return "identical";
  if (values[0].stringValue.trim().toLocaleLowerCase("fr") === values[1].stringValue.trim().toLocaleLowerCase("fr")) return "equivalent-review";
  return "swap";
}
function prepare(documents, operationId) {
  if (!/^[a-zA-Z0-9_-]{12,80}$/.test(operationId || "") || !Array.isArray(documents) || documents.length > MAX_DOCUMENTS) throw new Error("Perimetre invalide ou plafond depasse.");
  const seen = new Set();
  const entries = documents.map(doc => {
    validateDocument(doc);
    if (seen.has(doc.name)) throw new Error("Document duplique.");
    seen.add(doc.name);
    const status = classify(doc);
    return {
      name: doc.name, version: doc.updateTime, documentHash: hash(doc), status,
      before: names(doc),
      after: status === "swap" ? { firstName: doc.fields.lastName, lastName: doc.fields.firstName } : names(doc)
    };
  }).sort((a, b) => a.name.localeCompare(b.name, "en"));
  // Detach from mutable input, then bind the operation identity and frozen scope.
  const plan = JSON.parse(JSON.stringify({ schema: 1, projectId: "livepalmes", operationId, entries }));
  return { ...plan, digest: hash(plan) };
}
function verifyPlan(plan) {
  const { digest, ...body } = plan;
  if (hash(body) !== digest || body.schema !== 1 || body.projectId !== "livepalmes") throw new Error("Plan altere.");
}
function summary(plan) {
  verifyPlan(plan);
  const counts = {};
  for (const entry of plan.entries) counts[entry.status] = (counts[entry.status] || 0) + 1;
  return { total: plan.entries.length, counts, batches: Math.ceil((counts.swap || 0) / BATCH_SIZE) };
}
function makeVerifiedBackup(documents, plan, key) {
  verifyPlan(plan);
  if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error("Cle aleatoire de 32 octets requise.");
  if (prepare(documents, plan.operationId).digest !== plan.digest) throw new Error("Sauvegarde differente du plan.");
  const plain = Buffer.from(canonical({ schema: 1, plan, documents }));
  const encrypted = seal(plain, key);
  // This verifies the mechanism in memory. A real operator must reread the saved bytes too.
  if (!open(encrypted, key).equals(plain)) throw new Error("Sauvegarde illisible.");
  return encrypted;
}
function restoreBackup(encrypted, key) {
  const backup = JSON.parse(open(encrypted, key).toString("utf8"));
  verifyPlan(backup.plan);
  if (prepare(backup.documents, backup.plan.operationId).digest !== backup.plan.digest) throw new Error("Sauvegarde incoherente.");
  return backup;
}
function proposedWrite(plan, name, current, receipt = null, direction = "apply") {
  verifyPlan(plan);
  if (!["apply", "rollback"].includes(direction)) throw new Error("Sens invalide.");
  const entry = plan.entries.find(item => item.name === name);
  if (!entry) return { status: "outside-frozen-scope" };
  if (entry.status !== "swap") return { status: entry.status };
  if (!current) return { status: "missing-conflict" };
  validateDocument(current);
  if (current.name !== name) throw new Error("Mauvais document.");
  if (receipt && (receipt.planDigest !== plan.digest || receipt.name !== name || typeof receipt.afterVersion !== "string")) throw new Error("Recu incompatible.");
  if (direction === "apply" && receipt) return { status: "already-recorded-no-write" };
  if (direction === "rollback" && !receipt) return { status: "receipt-required" };
  const expectedVersion = direction === "apply" ? entry.version : receipt.afterVersion;
  const expectedNames = direction === "apply" ? entry.before : entry.after;
  if (current.updateTime !== expectedVersion || canonical(names(current)) !== canonical(expectedNames) ||
      direction === "apply" && hash(current) !== entry.documentHash) return { status: "concurrent-or-uncertain-conflict" };
  // Descriptor only. A future executor MUST send this precondition atomically;
  // a read followed by an unguarded update is never equivalent.
  return {
    status: "proposed-only",
    write: {
      update: { name, fields: direction === "apply" ? entry.after : entry.before },
      updateMask: { fieldPaths: ["firstName", "lastName"] },
      currentDocument: { updateTime: expectedVersion }
    }
  };
}

module.exports = { prepare, summary, makeVerifiedBackup, restoreBackup, proposedWrite, hash, MAX_DOCUMENTS, BATCH_SIZE };
