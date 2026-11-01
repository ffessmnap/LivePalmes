// Existing operation bodies; live services arrive through explicit accessors.
function createLegacyService_saveAdditionalPerformanceDataSnapshot(backendContext) {
  async function saveAdditionalPerformanceDataSnapshot(snapshot = {}) {
    const normalized = (0, backendContext.local$normalizeAdditionalPerformanceDataSnapshot)({
      ...snapshot,
      ok: true,
      generatedAt: new Date().toISOString(),
      swimmers: (0, backendContext.local$buildAdditionalPerformanceSwimmers)(snapshot.performances || [])
    });
    const file = (0, backendContext.local$additionalPerformanceFile)();
    await file.save(JSON.stringify(normalized), {
      resumable: false,
      contentType: "application/json; charset=utf-8",
      metadata: {
        cacheControl: "public, max-age=300",
        metadata: {
          firebaseStorageDownloadTokens: backendContext.PUBLIC_ADDITIONAL_PERFORMANCE_TOKEN
        }
      }
    });
    return {
      ok: true,
      path: backendContext.PUBLIC_ADDITIONAL_PERFORMANCE_PATH,
      generatedAt: normalized.generatedAt,
      importCount: normalized.importCount,
      performanceCount: normalized.performanceCount,
      correctionCount: normalized.correctionCount,
      incremental: snapshot.incremental !== false
    };
  }

  return { saveAdditionalPerformanceDataSnapshot };
}

module.exports = { createLegacyService_saveAdditionalPerformanceDataSnapshot };
