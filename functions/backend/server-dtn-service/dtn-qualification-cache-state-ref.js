// Existing operation bodies; live services arrive through explicit accessors.
function createDtnService_dtnQualificationCacheStateRef(backendContext) {
  function dtnQualificationCacheStateRef(seasonYear) {
    return backendContext.db.collection(backendContext.DTN_QUALIFICATION_CACHE_STATE_COLLECTION).doc(String(seasonYear));
  }

  return { dtnQualificationCacheStateRef };
}

module.exports = { createDtnService_dtnQualificationCacheStateRef };
