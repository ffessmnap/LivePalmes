// Existing operation bodies; live services arrive through explicit accessors.
function createLegacyService_enqueuePerformancePublicationJob(backendContext) {
  async function enqueuePerformancePublicationJob(correction = {}, actor = {}) {
    const now = new Date().toISOString();
    const jobId = backendContext.stableHash(`${correction.id}|${correction.updatedAt}|${now}|${actor.uid || "system"}`).slice(0, 40);
    const ref = backendContext.db.collection(backendContext.PERFORMANCE_PUBLICATION_JOBS_COLLECTION).doc(jobId);
    await ref.create(backendContext.cleanFirestoreValue({
      id: jobId,
      type: "performanceCorrection",
      correction,
      status: "pending",
      attempts: 0,
      createdAt: now,
      updatedAt: now,
      requestedBy: actor.uid || "",
      requestedByEmail: actor.email || ""
    }));
    return backendContext.publicPerformancePublicationJob({ status: "pending", attempts: 0, createdAt: now, updatedAt: now }, jobId);
  }

  return { enqueuePerformancePublicationJob };
}

module.exports = { createLegacyService_enqueuePerformancePublicationJob };
