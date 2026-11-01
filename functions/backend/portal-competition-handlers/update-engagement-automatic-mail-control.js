// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionHandlers_updateEngagementAutomaticMailControl(backendContext) {
  async function updateEngagementAutomaticMailControl(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national) throw new backendContext.HttpsError('permission-denied', 'Administration nationale requise.');
    try {
      const control = require("../../engagement-mail-control");
      const result = await control.update(backendContext.db, request.data, context);
      await backendContext.writeAuditLog('engagementNotifications.deliveryControlChanged', context.uid, { enabled: result.enabled, scope: result.scope, revision: result.revision });
      return { ...result, testRecipient: backendContext.ENVIRONMENT.projectId === 'livepalmes-test' ? control.TEST_ADDRESS : '' };
    } catch (error) {
      throw new backendContext.HttpsError(error instanceof TypeError ? 'failed-precondition' : 'unavailable',
        error instanceof TypeError ? error.message : 'Réglage des mails indisponible.');
    }
  }

  return { updateEngagementAutomaticMailControl };
}

module.exports = { createCompetitionHandlers_updateEngagementAutomaticMailControl };
