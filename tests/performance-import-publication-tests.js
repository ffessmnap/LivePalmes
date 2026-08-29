const assert = require("node:assert/strict");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const {
  PUBLISHING_STALE_MS,
  PUBLIC_PERFORMANCE_SWIMMER_ROW_SCHEMA_VERSION,
  canResumeImportPublication,
  cleanImportPublicationStatus,
  deactivatedImportPerformanceRows,
  hydratePublicSwimmerRowsFromPayload,
  importPublicationError,
  importPublicationResultStatus,
  importPublicationStatus,
  publicPerformanceSwimmerStorageRow,
  publicSwimmerPayloadSupportsTopRebuild
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

assert.deepEqual(deactivatedImportPerformanceRows([
  { id: "perf-1", active: true, status: "OK" },
  { id: "perf-2" }
]), [
  { id: "perf-1", active: false, status: "deleted" },
  { id: "perf-2", active: false, status: "deleted" }
]);
assert.deepEqual(deactivatedImportPerformanceRows(null), []);

assert.deepEqual(hydratePublicSwimmerRowsFromPayload([
  { id: "perf-1", club: "CNH", time: "40.00" }
], {
  id: "16423",
  identityKey: "HEITZ|CAMILLE|1986-03-19",
  name: "Camille HEITZ",
  firstName: "Camille",
  lastName: "HEITZ",
  birthDate: "1986-03-19",
  sex: "F",
  club: "AUTRE",
  clubName: "Club historique"
}, "fallback-key"), [{
  id: "perf-1",
  club: "CNH",
  time: "40.00",
  swimmerId: "16423",
  originalSwimmerId: "16423",
  swimmerIdentityKey: "HEITZ|CAMILLE|1986-03-19",
  swimmer: "Camille HEITZ",
  firstName: "Camille",
  lastName: "HEITZ",
  birthDate: "1986-03-19",
  sex: "F",
  clubId: "",
  clubName: "Club historique"
}]);

assert.equal(PUBLIC_PERFORMANCE_SWIMMER_ROW_SCHEMA_VERSION, 2);
assert.equal(publicSwimmerPayloadSupportsTopRebuild({ rowSchemaVersion: 2 }), true);
assert.equal(publicSwimmerPayloadSupportsTopRebuild({ rowSchemaVersion: 1 }), false);
assert.equal(publicSwimmerPayloadSupportsTopRebuild({}), false);
assert.deepEqual(publicPerformanceSwimmerStorageRow({
  id: "perf-1",
  source: "livepalmes-import",
  publicKey: "livepalmes-import|perf-1",
  performanceBaseId: "base-1",
  club: "CLUB",
  regionId: "PACA",
  location: "Nice",
  date: "2026-05-01",
  seasonYear: 2026,
  pool: "50",
  chrono: "E",
  course: "100SF",
  category: "S",
  timeValue: 4000,
  time: "40.00"
}), {
  id: "perf-1",
  source: "livepalmes-import",
  publicKey: "livepalmes-import|perf-1",
  performanceBaseId: "base-1",
  club: "CLUB",
  regionId: "PACA",
  location: "Nice",
  date: "2026-05-01",
  seasonYear: 2026,
  pool: "50",
  chrono: "E",
  course: "100SF",
  categoryCode: "S",
  timeValue: 4000,
  time: "40.00"
});

console.log("Performance import publication tests: OK");
