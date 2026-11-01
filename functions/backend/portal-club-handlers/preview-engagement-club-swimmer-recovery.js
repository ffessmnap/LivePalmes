// Existing operation bodies; live services arrive through explicit accessors.
function createClubHandlers_previewEngagementClubSwimmerRecovery(backendContext) {
  async function previewEngagementClubSwimmerRecovery(request) {
    const startedAt = Date.now();
    const context = await backendContext.engagementClubAccessContext(request);
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        const preview = await require("../../nap-swimmer-recovery").previewRecovery(require("../../nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD), {
          clubId:String(context.clubId),licenseNumber:backendContext.cleanText(request.data?.licenseNumber).toUpperCase()
        }, scope=>{if(scope.clubId!==String(context.clubId)) throw new backendContext.HttpsError("permission-denied","Nageur hors club.");});
        return {ok:true,...preview};
      } catch(error) {
        if(error instanceof backendContext.HttpsError) throw error;
        throw new backendContext.HttpsError(error instanceof TypeError || error instanceof RangeError?"failed-precondition":"unavailable",error instanceof TypeError || error instanceof RangeError?error.message:"Lecture NAP indisponible. Reessayez.");
      }
    }
    const preview = await backendContext.engagementSwimmerRecoveryPreview(backendContext.db, request.data?.licenseNumber, context);
    return {
      ok: true,
      ...preview,
      readStats: backendContext.portalReadStats("previewEngagementClubSwimmerRecovery", startedAt, {
        baseDocuments: 2,
        variableDocumentsMax: 4,
        cacheHit: false
      })
    };
  }

  return { previewEngagementClubSwimmerRecovery };
}

module.exports = { createClubHandlers_previewEngagementClubSwimmerRecovery };
