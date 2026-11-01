// Existing operation bodies; live services arrive through explicit accessors.
function createPerformanceService_performanceTopRowsFromIndex(backendContext) {
  async function performanceTopRowsFromIndex(filters = {}) {
    const bucketKey = (0, backendContext.local$performanceTopBucketKey)({
      course: filters.course,
      sex: filters.sex,
      category: filters.category,
      seasonYear: filters.season,
      regionId: filters.region
    });
    const bucketId = (0, backendContext.local$performanceTopBucketId)(bucketKey);
    const snapshot = await backendContext.db.collection(backendContext.PERFORMANCE_TOP_BUCKETS_COLLECTION).doc(bucketId).get();
    if (!snapshot.exists) return null;
    const view = snapshot.data() || {};
    const rows = (0, backendContext.local$readPerformanceTopIndexRows)(view);
    return {
      ok: true,
      bucketId,
      rows,
      indexReads: 1,
      indexedRows: rows.length
    };
  }

  return { performanceTopRowsFromIndex };
}

module.exports = { createPerformanceService_performanceTopRowsFromIndex };
