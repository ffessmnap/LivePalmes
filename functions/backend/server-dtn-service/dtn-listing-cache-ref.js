// Existing operation bodies; live services arrive through explicit accessors.
function createDtnService_dtnListingCacheRef(backendContext) {
  function dtnListingCacheRef(seasonYear) {
    return backendContext.db.collection(backendContext.DTN_QUALIFICATION_CACHE_COLLECTION).doc(`${seasonYear}-listing`);
  }

  return { dtnListingCacheRef };
}

module.exports = { createDtnService_dtnListingCacheRef };
