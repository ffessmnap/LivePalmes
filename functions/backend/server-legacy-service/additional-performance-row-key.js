// Existing operation bodies; live services arrive through explicit accessors.
function createLegacyService_additionalPerformanceRowKey(backendContext) {
  function additionalPerformanceRowKey(row = {}) {
    return backendContext.cleanText(row.publicKey || backendContext.performancePublicKey(row) || row.performanceBaseId || row.id);
  }

  function mergeAdditionalPerformanceRows(existingRows = [], incomingRows = [], replaceImportId = "") {
    const byKey = new Map();
    existingRows.forEach((row) => {
      if (replaceImportId && backendContext.cleanText(row.importId) === replaceImportId) return;
      const key = additionalPerformanceRowKey(row);
      if (key) byKey.set(key, row);
    });
    incomingRows.forEach((row) => {
      const key = additionalPerformanceRowKey(row);
      if (key) byKey.set(key, row);
    });
    return Array.from(byKey.values());
  }

  return { additionalPerformanceRowKey, mergeAdditionalPerformanceRows };
}

module.exports = { createLegacyService_additionalPerformanceRowKey };
