// Existing operation bodies; live services arrive through explicit accessors.
function createLegacyService_buildAdditionalPerformanceDataSnapshot(backendContext) {
  async function buildAdditionalPerformanceDataSnapshot() {
    const snapshot = await (0, backendContext.local$readPublishedAdditionalPerformanceDataSnapshot)();
    if (snapshot.available === false) {
      throw new backendContext.HttpsError("failed-precondition", "Fichier public des performances indisponible.");
    }
    return snapshot;
  }

  return { buildAdditionalPerformanceDataSnapshot };
}

module.exports = { createLegacyService_buildAdditionalPerformanceDataSnapshot };
