// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionService_assertEngagementCompetitionDocumentPath(backendContext) {
  function assertEngagementCompetitionDocumentPath(storagePath = "") {
    const cleanPath = backendContext.cleanText(storagePath);
    if (!cleanPath.startsWith(`${backendContext.ENGAGEMENT_COMPETITION_DOCUMENTS_STORAGE_PREFIX}/`) || cleanPath.includes("..")) {
      throw new backendContext.HttpsError("failed-precondition", "Chemin de document de compétition invalide.");
    }
    return cleanPath;
  }

  function hasManagedEngagementCompetitionDocumentStorage(document = {}) {
    const storagePath = backendContext.cleanText(document?.storagePath);
    return storagePath.startsWith(`${backendContext.ENGAGEMENT_COMPETITION_DOCUMENTS_STORAGE_PREFIX}/`) && !storagePath.includes("..");
  }

  return { assertEngagementCompetitionDocumentPath, hasManagedEngagementCompetitionDocumentStorage };
}

module.exports = { createCompetitionService_assertEngagementCompetitionDocumentPath };
