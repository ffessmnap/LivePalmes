// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_portalReadStats(backendContext) {
  function portalReadStats(callable, startedAt, options = {}) {
    const stats = {
      baseDocuments: Math.max(0, Math.trunc(Number(options.baseDocuments) || 0)),
      variableDocumentsMax: Math.max(0, Math.trunc(Number(options.variableDocumentsMax) || 0)),
      cacheHit: typeof options.cacheHit === "boolean" ? options.cacheHit : null,
      durationMs: Math.max(0, Date.now() - startedAt)
    };
    console.info("livepalmes.portal.reads", { callable, ...stats });
    return stats;
  }

  return { portalReadStats };
}

module.exports = { createAccessService_portalReadStats };
