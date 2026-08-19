const assert = require("node:assert/strict");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const {
  PUBLISHING_STALE_MS,
  canResumeImportPublication,
  cleanImportPublicationStatus,
  importPublicationError,
  importPublicationResultStatus,
  importPublicationStatus
} = require(path.join(root, "functions", "performance-import-publication.js"));

assert.equal(cleanImportPublicationStatus(" Publishing "), "publishing");
assert.equal(cleanImportPublicationStatus("unknown"), "");
assert.equal(importPublicationStatus({ publicationStatus: "failed" }), "failed");
assert.equal(importPublicationStatus({ publication: { status: "pending" } }), "pending");

assert.equal(canResumeImportPublication({ status: "stored", publicationStatus: "pending" }), true);
assert.equal(canResumeImportPublication({ status: "stored", publicationStatus: "publishing" }), true);
assert.equal(canResumeImportPublication({
  status: "stored",
  publicationStatus: "publishing",
  publicationUpdatedAt: "2026-08-18T14:00:00.000Z"
}, Date.parse("2026-08-18T14:00:00.000Z") + PUBLISHING_STALE_MS - 1), false);
assert.equal(canResumeImportPublication({
  status: "stored",
  publicationStatus: "publishing",
  publicationUpdatedAt: "2026-08-18T14:00:00.000Z"
}, Date.parse("2026-08-18T14:00:00.000Z") + PUBLISHING_STALE_MS), true);
assert.equal(canResumeImportPublication({ status: "stored", publicationStatus: "failed" }), true);
assert.equal(canResumeImportPublication({ status: "stored", publicationStatus: "published" }), false);
assert.equal(canResumeImportPublication({ status: "deleted", publicationStatus: "failed" }), false);
assert.equal(canResumeImportPublication({ status: "stored" }), false);

assert.equal(importPublicationResultStatus({ ok: true }, { ok: true }), "published");
assert.equal(importPublicationResultStatus({ ok: true }, { ok: false }), "failed");
assert.equal(importPublicationResultStatus({ ok: false }, { ok: true }), "failed");
assert.equal(importPublicationError({ error: "Ancienne publication impossible." }, { error: "Fichiers publics incomplets." }), "Ancienne publication impossible. Fichiers publics incomplets.");

console.log("Performance import publication tests: OK");
