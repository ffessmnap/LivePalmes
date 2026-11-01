// Existing operation bodies; live services arrive through explicit accessors.
function createPerformanceHandlers_deleteCompetitionPdf(backendContext) {
  async function deleteCompetitionPdf(request) {
    const competitionId = backendContext.competitionIdFrom(request.data || {});
    await backendContext.assertComputerPdfAccess(request, competitionId);
    const storagePath = backendContext.cleanText(request.data?.storagePath).slice(0, 600);
    const expectedPrefix = `${backendContext.PUBLIC_COMPETITION_PDF_PREFIX}/${competitionId}/`;
    if (!storagePath.startsWith(expectedPrefix) || storagePath.includes("..")) {
      throw new backendContext.HttpsError("invalid-argument", "Chemin PDF invalide.");
    }
    await backendContext.storage.bucket(backendContext.PUBLIC_PERFORMANCE_BUCKET).file(storagePath).delete({ ignoreNotFound: true });
    return { ok: true, storagePath };
  }

  return { deleteCompetitionPdf };
}

module.exports = { createPerformanceHandlers_deleteCompetitionPdf };
