// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionHandlers_getEngagementAutomaticMailControl(backendContext) {
  async function getEngagementAutomaticMailControl(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national) throw new backendContext.HttpsError('permission-denied', 'Administration nationale requise.');
    const control = require("../../engagement-mail-control");
    return { ...await control.read(backendContext.db), testRecipient: backendContext.ENVIRONMENT.projectId === 'livepalmes-test' ? control.TEST_ADDRESS : '' };
  }

  return { getEngagementAutomaticMailControl };
}

module.exports = { createCompetitionHandlers_getEngagementAutomaticMailControl };
