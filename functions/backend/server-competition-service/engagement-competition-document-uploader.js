// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionService_engagementCompetitionDocumentUploader(backendContext) {
  function engagementCompetitionDocumentUploader(context = {}) {
    return {
      uid: backendContext.cleanText(context.uid).slice(0, 128),
      name: [backendContext.cleanText(context.firstName), backendContext.cleanText(context.lastName)].filter(Boolean).join(" ").slice(0, 180),
      email: backendContext.normalizeEmail(context.email).slice(0, 180)
    };
  }

  return { engagementCompetitionDocumentUploader };
}

module.exports = { createCompetitionService_engagementCompetitionDocumentUploader };
