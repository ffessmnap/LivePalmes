// Existing operation bodies; live services arrive through explicit accessors.
function createLegacyService_publicPerformanceFilesBucket(backendContext) {
  function publicPerformanceFilesBucket() {
    return backendContext.storage.bucket(backendContext.PUBLIC_PERFORMANCE_BUCKET);
  }

  return { publicPerformanceFilesBucket };
}

module.exports = { createLegacyService_publicPerformanceFilesBucket };
