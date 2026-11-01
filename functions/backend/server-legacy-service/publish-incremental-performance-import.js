// Existing operation bodies; live services arrive through explicit accessors.
function createLegacyService_publishIncrementalPerformanceImport(backendContext) {
  async function publishIncrementalPerformanceImport(performances = [], importId = "") {
    const current = await (0, backendContext.local$readPublishedAdditionalPerformanceDataSnapshot)();
    const mergedPerformances = (0, backendContext.local$mergeAdditionalPerformanceRows)(current.performances, performances, backendContext.cleanText(importId));
    return (0, backendContext.local$saveAdditionalPerformanceDataSnapshot)({
      ...current,
      performances: mergedPerformances
    });
  }

  return { publishIncrementalPerformanceImport };
}

module.exports = { createLegacyService_publishIncrementalPerformanceImport };
