// Retired national Direct. Installed URLs refuse without reading or changing data.
function createPerformanceHandlers_deleteCompetitionPdf(backendContext) {
  async function deleteCompetitionPdf() {
    throw new backendContext.HttpsError("failed-precondition", "L’ancien Direct national est retiré. Utilisez le nouveau Direct depuis le calendrier.");
  }
  return { deleteCompetitionPdf };
}
module.exports = { createPerformanceHandlers_deleteCompetitionPdf };
