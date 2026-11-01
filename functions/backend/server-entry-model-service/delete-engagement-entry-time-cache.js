// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_deleteEngagementEntryTimeCache(backendContext) {
  function deleteEngagementEntryTimeCache(batch, db, swimmer = {}) {
    const cacheId = (0, backendContext.local$engagementEntryTimeCacheId)(swimmer);
    if (!cacheId) return;
    batch.delete(db.collection(backendContext.ENGAGEMENT_ENTRY_TIME_CACHES_COLLECTION).doc(cacheId));
  }

  return { deleteEngagementEntryTimeCache };
}

module.exports = { createEntryModelService_deleteEngagementEntryTimeCache };
