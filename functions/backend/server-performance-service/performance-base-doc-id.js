// Existing operation bodies; live services arrive through explicit accessors.
function createPerformanceService_performanceBaseDocId(backendContext) {
  function performanceBaseDocId(row = {}) {
    return backendContext.stableHash((0, backendContext.local$performancePublicKey)(row)).slice(0, 40);
  }

  return { performanceBaseDocId };
}

module.exports = { createPerformanceService_performanceBaseDocId };
