// Existing operation bodies; live services arrive through explicit accessors.
function createDtnService_dtnQualificationCacheRef(backendContext) {
  function dtnQualificationCacheRef(seasonYear, sex) {
    return backendContext.db.collection(backendContext.DTN_QUALIFICATION_CACHE_COLLECTION).doc(`${seasonYear}-${sex}`);
  }

  return { dtnQualificationCacheRef };
}

module.exports = { createDtnService_dtnQualificationCacheRef };
