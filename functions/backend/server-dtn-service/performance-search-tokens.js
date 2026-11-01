// Existing operation bodies; live services arrive through explicit accessors.
function createDtnService_performanceSearchTokens(backendContext) {
  function performanceSearchTokens(value) {
    return Array.from(new Set((0, backendContext.local$normalizePerformanceSearchText)(value).split(/\s+/).filter((token) => token.length >= 2)));
  }

  return { performanceSearchTokens };
}

module.exports = { createDtnService_performanceSearchTokens };
