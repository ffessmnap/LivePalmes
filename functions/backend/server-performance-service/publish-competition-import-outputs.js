// Existing operation bodies; live services arrive through explicit accessors.
function createPerformanceService_publishCompetitionImportOutputs(backendContext) {
  async function publishCompetitionImportOutputs(normalizedPerformances = [], importRef, context = {}) {
    const importId = backendContext.cleanText(context.importId || importRef?.id);
    const startedAt = new Date().toISOString();
    await importRef.set({
      publicationStatus: "publishing",
      publicationStartedAt: startedAt,
      publicationUpdatedAt: startedAt,
      publicationError: ""
    }, { merge: true });

    let publicSnapshot = null;
    try {
      publicSnapshot = await backendContext.publishIncrementalPerformanceImport(normalizedPerformances, importId);
    } catch (error) {
      console.warn("Publication publique des performances LivePalmes impossible", error);
      publicSnapshot = {
        ok: false,
        error: error?.message || String(error)
      };
    }

    let publicFilesSnapshot = null;
    try {
      publicFilesSnapshot = await backendContext.publishIncrementalPublicPerformanceFiles(normalizedPerformances, {
        importId,
        now: context.now || startedAt
      });
      await backendContext.invalidateEngagementEntryTimeCachesForPerformanceRows(normalizedPerformances);
    } catch (error) {
      console.warn("Publication publique incrementale des fichiers performances impossible", error);
      publicFilesSnapshot = {
        ok: false,
        error: error?.message || String(error)
      };
    }

    const publicationStatus = backendContext.importPublicationResultStatus(publicSnapshot, publicFilesSnapshot);
    const completedAt = new Date().toISOString();
    await importRef.set({
      publicationStatus,
      publicationCompletedAt: publicationStatus === "published" ? completedAt : "",
      publicationUpdatedAt: completedAt,
      publicationError: backendContext.importPublicationError(publicSnapshot, publicFilesSnapshot),
      publicSnapshot: (0, backendContext.local$competitionImportPublicSnapshotSummary)(publicSnapshot),
      publicFilesSnapshot: (0, backendContext.local$competitionImportPublicSnapshotSummary)(publicFilesSnapshot)
    }, { merge: true });

    return {
      publicationStatus,
      publicSnapshot,
      publicFilesSnapshot
    };
  }

  return { publishCompetitionImportOutputs };
}

module.exports = { createPerformanceService_publishCompetitionImportOutputs };
