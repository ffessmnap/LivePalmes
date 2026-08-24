const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const {
  PERFORMANCE_PUBLICATION_LEASE_MS,
  canClaimPerformancePublicationJob,
  cleanPerformancePublicationStatus,
  performancePublicationFailureStatus,
  publicPerformancePublicationJob
} = require(path.join(root, "functions", "performance-publication-jobs.js"));

assert.equal(cleanPerformancePublicationStatus(" Processing "), "processing");
assert.equal(cleanPerformancePublicationStatus("unknown"), "");
assert.equal(canClaimPerformancePublicationJob({ status: "pending" }), true);
assert.equal(canClaimPerformancePublicationJob({ status: "published" }), false);
assert.equal(canClaimPerformancePublicationJob({ status: "failed" }), false);
assert.equal(canClaimPerformancePublicationJob({
  status: "processing",
  leaseUntil: new Date(1000 + PERFORMANCE_PUBLICATION_LEASE_MS).toISOString()
}, 1000), false);
assert.equal(canClaimPerformancePublicationJob({
  status: "processing",
  leaseUntil: new Date(1000).toISOString()
}, 1000), true);
assert.equal(performancePublicationFailureStatus(4), "pending");
assert.equal(performancePublicationFailureStatus(5), "failed");
assert.deepEqual(publicPerformancePublicationJob({
  status: "published",
  attempts: 2,
  error: "",
  internalPayload: "private"
}, "job-1"), {
  id: "job-1",
  status: "published",
  attempts: 2,
  createdAt: "",
  updatedAt: "",
  completedAt: "",
  error: ""
});

const functionsSource = fs.readFileSync(path.join(root, "functions", "index.js"), "utf8");
const saveStart = functionsSource.indexOf("exports.savePerformanceCorrection =");
const saveSource = functionsSource.slice(saveStart);
assert.ok(saveStart > 0);
assert.ok(saveSource.includes("enqueuePerformancePublicationJob"));
assert.equal(saveSource.includes("await publishIncrementalPerformanceCorrection"), false);
assert.equal(saveSource.includes("await rebuildPublicPerformanceFilesForAffectedRows"), false);
assert.ok(functionsSource.includes("exports.publishPerformanceCorrectionJob = onDocumentCreated(PERFORMANCE_PUBLICATION_JOB_OPTIONS"));
assert.ok(functionsSource.includes("exports.resumePerformancePublicationJobs = onSchedule(PERFORMANCE_PUBLICATION_SCHEDULER_OPTIONS"));
assert.ok(functionsSource.includes("active: correction.hidden !== true"));
assert.ok(functionsSource.includes('status: correction.hidden === true ? "hidden" : "active"'));
assert.ok(functionsSource.includes('? { ...targetRow, active: false, status: "hidden" }'));
assert.ok(functionsSource.includes("rebuildPublicPerformanceFilesForAffectedRows([affectedTargetRow, correctedBaseRow]"));
assert.ok(functionsSource.includes("const identitySeed = publicSeedRows.find"));
assert.ok(functionsSource.includes("hydratePublicSwimmerRowsFromPayload(current?.rows, hydrationPayload, swimmerKey)"));

const portalSource = fs.readFileSync(path.join(root, "performances", "public", "import-competitions.js"), "utf8");
assert.ok(portalSource.includes("getPerformancePublicationJobStatus"));
assert.ok(portalSource.includes("retryPerformancePublicationJob"));
assert.ok(portalSource.includes("publication en arrière-plan"));
assert.ok(portalSource.includes("adminCache=${Date.now()}"));
assert.ok(portalSource.includes('{ cache: "no-store" }'));

console.log("Performance correction publication tests: OK");
