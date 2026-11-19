// Retired national Direct. Installed URLs refuse without reading or changing data.
function createPerformanceHandlers_storeCompetitionPdf(backendContext) {
  async function storeCompetitionPdf() {
    throw new backendContext.HttpsError("failed-precondition", "L’ancien Direct national est retiré. Utilisez le nouveau Direct depuis le calendrier.");
  }
  return { storeCompetitionPdf };
}
module.exports = { createPerformanceHandlers_storeCompetitionPdf };
