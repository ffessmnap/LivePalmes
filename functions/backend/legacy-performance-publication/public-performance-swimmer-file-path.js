// Existing operation bodies; live services arrive through explicit accessors.
function createLegacyPerformancePublication_publicPerformanceSwimmerFilePath(backendContext) {
  function publicPerformanceSwimmerFilePath(indexKey) {
    const hash = (0, backendContext.stableHash)(indexKey).slice(0, 40);
    return `swimmers/${hash.slice(0, 2)}/${hash}.json`;
  }

  return { publicPerformanceSwimmerFilePath };
}

module.exports = { createLegacyPerformancePublication_publicPerformanceSwimmerFilePath };
