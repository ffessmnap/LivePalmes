// Existing operation bodies; live services arrive through explicit accessors.
function createLegacyService_performanceSwimmerPageId(backendContext) {
  function performanceSwimmerPageId(indexDocId, pageIndex) {
    return `${indexDocId}_${String(pageIndex).padStart(4, "0")}`;
  }

  return { performanceSwimmerPageId };
}

module.exports = { createLegacyService_performanceSwimmerPageId };
