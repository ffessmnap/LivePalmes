"use strict";

const PERFORMANCE_PUBLICATION_MAX_ATTEMPTS = 5;
const PERFORMANCE_PUBLICATION_LEASE_MS = 10 * 60 * 1000;
const PERFORMANCE_PUBLICATION_STATUSES = new Set(["pending", "processing", "published", "failed"]);

function cleanPerformancePublicationStatus(value) {
  const status = String(value || "").trim().toLowerCase();
  return PERFORMANCE_PUBLICATION_STATUSES.has(status) ? status : "";
}

function canClaimPerformancePublicationJob(job = {}, nowMs = Date.now()) {
  const status = cleanPerformancePublicationStatus(job.status) || "pending";
  if (status === "published" || status === "failed") return false;
  if (status !== "processing") return true;
  const leaseUntil = Date.parse(String(job.leaseUntil || ""));
  return !Number.isFinite(leaseUntil) || leaseUntil <= nowMs;
}

function performancePublicationFailureStatus(attempts, maxAttempts = PERFORMANCE_PUBLICATION_MAX_ATTEMPTS) {
  return Number(attempts || 0) >= maxAttempts ? "failed" : "pending";
}

function publicPerformancePublicationJob(job = {}, id = "") {
  return {
    id: String(id || job.id || ""),
    status: cleanPerformancePublicationStatus(job.status) || "pending",
    attempts: Math.max(0, Number(job.attempts || 0) || 0),
    createdAt: String(job.createdAt || ""),
    updatedAt: String(job.updatedAt || ""),
    completedAt: String(job.completedAt || ""),
    error: String(job.error || "").slice(0, 300)
  };
}

module.exports = {
  PERFORMANCE_PUBLICATION_LEASE_MS,
  PERFORMANCE_PUBLICATION_MAX_ATTEMPTS,
  canClaimPerformancePublicationJob,
  cleanPerformancePublicationStatus,
  performancePublicationFailureStatus,
  publicPerformancePublicationJob
};
