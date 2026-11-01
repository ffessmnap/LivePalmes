// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_invalidateEngagementEntryTimeCachesForPerformanceRows(backendContext) {
  async function invalidateEngagementEntryTimeCachesForPerformanceRows(rows = []) {
    const cacheIds = Array.from(new Set(rows
      .flatMap((row) => ["performances", "reference"].map((source) => (0, backendContext.local$engagementEntryTimeCacheId)({
        source,
        identityKey: backendContext.performanceSwimmerIndexKey(row),
        swimmerId: row.swimmerId
      })))
      .filter(Boolean)));
    let batch = backendContext.db.batch();
    let batchSize = 0;
    const commits = [];
    cacheIds.forEach((cacheId) => {
      batch.delete(backendContext.db.collection(backendContext.ENGAGEMENT_ENTRY_TIME_CACHES_COLLECTION).doc(cacheId));
      batchSize += 1;
      if (batchSize >= 450) {
        commits.push(batch.commit());
        batch = backendContext.db.batch();
        batchSize = 0;
      }
    });
    if (batchSize) commits.push(batch.commit());
    await Promise.all(commits);
    return cacheIds.length;
  }

  return { invalidateEngagementEntryTimeCachesForPerformanceRows };
}

module.exports = { createEntryModelService_invalidateEngagementEntryTimeCachesForPerformanceRows };
