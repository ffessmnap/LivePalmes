// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionHandlers_grantEngagementQualificationException(backendContext) {
  async function grantEngagementQualificationException(request) {
    if(backendContext.ENVIRONMENT.sportingDataSource !== "nap")return backendContext.qualificationService().grantException(request);
    const context=await backendContext.engagementAccessContext(request);
    if(!context.national)throw new backendContext.HttpsError("permission-denied","Droit national des engagements requis.");
    const club=await backendContext.engagementClubAccessContext(request);
    try{return await require("../../nap-qualification-grant-change").grantException(require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{competitionId:request.data?.competitionId,clubId:String(club.clubId),swimmerId:request.data?.swimmerIndexId,eventCode:request.data?.eventCode,national:true,confirmed:true,actorUid:context.uid,now:backendContext.nativeQualificationNow()},backendContext.nativeQualificationServices(context));}
    catch(error){throw backendContext.nativeQualificationError(error);}
  }

  return { grantEngagementQualificationException };
}

module.exports = { createCompetitionHandlers_grantEngagementQualificationException };
