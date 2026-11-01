// Existing operation bodies; live services arrive through explicit accessors.
function createClubHandlers_previewEngagementClubSwimmerCreation(backendContext) {
  async function previewEngagementClubSwimmerCreation(request) {
    if(request.data?.importReview===true)return backendContext.importSwimmerCreation(request,false);
    const context = await backendContext.engagementClubAccessContext(request);
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        const input={clubId:String(context.clubId),actorUid:context.uid,swimmer:request.data?.swimmer,creationId:request.data?.creationId,confirmAlerts:request.data?.confirmAlerts};
        const authorize=scope=>{if(scope.clubId!==String(context.clubId)) throw new backendContext.HttpsError("permission-denied","Nageur hors club.");};
        const formatAlert=(match,type)=>backendContext.engagementNewSwimmerAlertFromMatch(match,{...context,clubId:String(context.clubId)},type);
        return await require("../../nap-swimmer-creation").previewCreation(require("../../nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),input,authorize,formatAlert);
      } catch(error) {
        if(error instanceof backendContext.HttpsError) throw error;
        throw new backendContext.HttpsError(error instanceof TypeError || error instanceof RangeError?"failed-precondition":"unavailable",error instanceof TypeError || error instanceof RangeError?error.message:"Creation NAP a verifier. Reprenez la meme action ; sauvegarde conservee.");
      }
    }
    const swimmer = backendContext.cleanEngagementNewSwimmer(request.data?.swimmer || {}, context);
    await backendContext.assertNoEngagementSwimmerLicenseConflict(backendContext.db, swimmer);
    const alerts = await backendContext.buildEngagementNewSwimmerAlerts(swimmer, context);
    const blockingAlerts = alerts.filter((alert) => alert.type === "inverted-identity");
    return {
      ok: true,
      swimmer,
      alerts,
      requiresConfirmation: alerts.length > 0 && blockingAlerts.length === 0,
      blocksCreation: blockingAlerts.length > 0
    };
  }

  return { previewEngagementClubSwimmerCreation };
}

module.exports = { createClubHandlers_previewEngagementClubSwimmerCreation };
