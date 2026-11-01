// Existing operation bodies; live services arrive through explicit accessors.
function createDtnService_enqueueDtnQualificationJob(backendContext) {
  async function enqueueDtnQualificationJob(job = {}) {
    const jobId = job.view === "listing"
      ? `${job.seasonYear}-listing-${backendContext.cleanText(job.fingerprint).slice(0, 24)}`
      : `${job.seasonYear}-${job.sex}-${backendContext.cleanText(job.fingerprint).slice(0, 24)}`;
    const ref = backendContext.db.collection(backendContext.DTN_QUALIFICATION_JOBS_COLLECTION).doc(jobId);
    try {
      await ref.create({
        ...backendContext.cleanFirestoreValue(job),
        status: "pending",
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      if (Number(error?.code) !== 6 && backendContext.cleanText(error?.code) !== "already-exists") throw error;
    }
    return jobId;
  }

  return { enqueueDtnQualificationJob };
}

module.exports = { createDtnService_enqueueDtnQualificationJob };
