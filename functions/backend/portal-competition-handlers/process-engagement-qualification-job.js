// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionHandlers_processEngagementQualificationJob(backendContext) {
  async function processEngagementQualificationJob(request) {
    if(backendContext.ENVIRONMENT.sportingDataSource !== "nap")return backendContext.qualificationService().process(request);
    const context=await backendContext.engagementAccessContext(request);
    if(!context.national)throw new backendContext.HttpsError("permission-denied","Droit national des engagements requis.");
    try{return await require("../../nap-qualification-callables").process(require("../../nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{competitionId:request.data?.competitionId,jobId:request.data?.jobId,action:request.data?.action,cursor:request.data?.cursor,national:true,actorUid:context.uid,now:backendContext.nativeQualificationNow()},backendContext.nativeQualificationServices(context));}
    catch(error){throw backendContext.nativeQualificationError(error);}
  }

  return { processEngagementQualificationJob };
}

module.exports = { createCompetitionHandlers_processEngagementQualificationJob };
