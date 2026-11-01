// Existing operation bodies; live services arrive through explicit accessors.
function createPerformanceService_uniquePublicPerformanceRows(backendContext) {
  function uniquePublicPerformanceRows(rows = []) {
    const byKey = new Map();
    rows.forEach((row) => {
      const key = backendContext.cleanText(row.publicKey || (0, backendContext.local$performancePublicKey)(row) || row.performanceBaseId || row.id);
      if (!key) return;
      byKey.set(key, row);
    });
    return Array.from(byKey.values());
  }

  return { uniquePublicPerformanceRows };
}

module.exports = { createPerformanceService_uniquePublicPerformanceRows };
