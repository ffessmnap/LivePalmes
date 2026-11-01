// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionService_saveNativeClubOfficials(backendContext) {
  async function saveNativeClubOfficials(context,request) {
    try {
      const result=await require("../../nap-official-entry-change").saveNativeOfficials(require("../../nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{
        competitionId:request.data?.competitionId,clubId:String(context.clubId),actorUid:context.uid,
        officialPersonIds:request.data?.officialPersonIds,expectedFingerprint:request.data?.expectedFingerprint,mutationId:request.data?.mutationId
      },{
        authorize:({clubId})=>{if(String(clubId)!==String(context.clubId)) throw new backendContext.HttpsError("permission-denied","Dossier hors du club autorise.");},
        audit:{
          read:async operation=>{const doc=await backendContext.db.collection("auditLogs").doc(`nap-official-${operation}-before`).get();return doc.exists?doc.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-official-${operation}-before`).create({action:"nap.officialEntry.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          complete:(operation,target)=>backendContext.writeAuditLogOnce("engagementClubEntry.officialsSaved",context.uid,{...target,auditPreparationId:`nap-official-${operation}-before`},operation)
        }
      });
      const competition=require("../../nap-portal-workspaces").competitionItem(result.competition,backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE);
      return {ok:true,source:"nap",operation:result.operation,writesExecuted:result.writesExecuted,
        entry:await (0, backendContext.local$nativeClubEntryView)(result.nativeEntry,context,competition),sqlBudget:{queriesMax:33,writesMax:2}};
    } catch(error) {
      if(error instanceof backendContext.HttpsError) throw error;
      throw new backendContext.HttpsError(error instanceof RangeError?"resource-exhausted":error instanceof TypeError?"failed-precondition":"unavailable",error instanceof RangeError || error instanceof TypeError?error.message:"Enregistrement NAP a verifier. Reprenez la meme selection ; la sauvegarde est conservee.");
    }
  }

  return { saveNativeClubOfficials };
}

module.exports = { createCompetitionService_saveNativeClubOfficials };
