// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionHandlers_acknowledgeEngagementQualificationAlert(backendContext) {
  async function acknowledgeEngagementQualificationAlert(request) {
    if(backendContext.ENVIRONMENT.sportingDataSource !== "nap")return backendContext.qualificationService().acknowledgeAlert(request);
    const context=await backendContext.engagementClubAccessContext(request);
    let connection;
    try{
      connection=await require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD).getConnection();
      return await require("../../nap-qualification-effects").acknowledge(connection,{competitionId:request.data?.competitionId,clubId:String(context.clubId),alertAt:request.data?.alertAt,actorUid:context.uid,now:backendContext.nativeQualificationNow(),authorize:scope=>{if(scope.clubId!==String(context.clubId))throw new backendContext.HttpsError("permission-denied","Dossier hors du club autorise.");}});
    }catch(error){if(connection){connection.destroy();connection=null;}throw backendContext.nativeQualificationError(error);}
    finally{connection?.release();}
  }

  return { acknowledgeEngagementQualificationAlert };
}

module.exports = { createCompetitionHandlers_acknowledgeEngagementQualificationAlert };
