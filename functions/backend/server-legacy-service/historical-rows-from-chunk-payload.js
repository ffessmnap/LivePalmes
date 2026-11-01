// Existing operation bodies; live services arrive through explicit accessors.
function createLegacyService_historicalRowsFromChunkPayload(backendContext) {
  function historicalRowsFromChunkPayload(payload = {}) {
    const rows = [];
    Object.entries(payload || {}).forEach(([swimmerId, performances]) => {
      if (!Array.isArray(performances)) return;
      performances.forEach((perf) => {
        rows.push({
          ...perf,
          source: perf.source || "intranap",
          swimmerId: String(perf.swimmerId || swimmerId)
        });
      });
    });
    return rows;
  }

  return { historicalRowsFromChunkPayload };
}

module.exports = { createLegacyService_historicalRowsFromChunkPayload };
