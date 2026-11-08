// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionHandlers_getEngagementAutomaticMailControl(backendContext) {
  async function getEngagementAutomaticMailControl(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national) throw new backendContext.HttpsError('permission-denied', 'Administration nationale requise.');
    if (request.data?.action === "mailTemplates") {
      try {
        const templates = require("../../mail-templates");
        return templates.view(await templates.read(backendContext.db));
      } catch (error) { throw new backendContext.HttpsError("unavailable", "Modèles de mails indisponibles. Réessayez."); }
    }
    if (request.data?.action === "previewMailTemplate") {
      try { return require("../../mail-templates").preview(request.data); }
      catch (error) { throw new backendContext.HttpsError("invalid-argument", error.message); }
    }
    if (request.data?.action) throw new backendContext.HttpsError("invalid-argument", "Action inconnue.");
    const control = require("../../engagement-mail-control");
    return { ...await control.read(backendContext.db), testRecipient: backendContext.ENVIRONMENT.projectId === 'livepalmes-test' ? control.TEST_ADDRESS : '' };
  }

  return { getEngagementAutomaticMailControl };
}

module.exports = { createCompetitionHandlers_getEngagementAutomaticMailControl };
