// Existing operation bodies; live services arrive through explicit accessors.
function createLegacyService_publishAdditionalPerformanceDataSnapshot(backendContext) {
  async function publishAdditionalPerformanceDataSnapshot() {
    const snapshot = await (0, backendContext.local$buildAdditionalPerformanceDataSnapshot)();
    return (0, backendContext.local$saveAdditionalPerformanceDataSnapshot)({
      ...snapshot,
      incremental: false
    });
  }

  return { publishAdditionalPerformanceDataSnapshot };
}

module.exports = { createLegacyService_publishAdditionalPerformanceDataSnapshot };
