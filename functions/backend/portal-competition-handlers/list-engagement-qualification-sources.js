// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionHandlers_listEngagementQualificationSources(backendContext) {
  async function listEngagementQualificationSources(request) {
    if (backendContext.ENVIRONMENT.sportingDataSource !== "nap") return backendContext.qualificationService().listSources(request);
    const context=await backendContext.engagementAccessContext(request);
    if(!context.national) throw new backendContext.HttpsError("permission-denied","Droit national des engagements requis.");
    try {
      return await require("../../nap-qualification-sources").listSources(require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),request.data);
    } catch(error) {
      throw new backendContext.HttpsError(error instanceof TypeError ? "invalid-argument" : "unavailable",error instanceof TypeError ? error.message : "Liste des competitions NAP momentanement indisponible.");
    }
  }

  return { listEngagementQualificationSources };
}

module.exports = { createCompetitionHandlers_listEngagementQualificationSources };
