// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionService_createNativePortalCalendarRecord(backendContext) {
  async function createNativePortalCalendarRecord(raw,context,kind) {
    const event=backendContext.cleanEngagementCalendarEventPayload({...raw,eventType:kind},context);
    event.competitionType=kind;
    const committeeId=["national","international"].includes(event.level) ? (event.level==="national"?4:5) : Object.keys(backendContext.CLUB_REFERENCE_REGION_LABELS).find(id=>backendContext.engagementRegionsMatch(id,event.regionId));
    try {
      const result=await require("../../nap-competition-create").createCompetition(require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{actorUid:context.uid,creationId:raw.creationId,committeeId,event},{
        read:async operation=>{const snapshot=await backendContext.db.collection("auditLogs").doc(`nap-competition-create-${operation}-before`).get();return snapshot.exists?snapshot.data().target:null;},
        prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-competition-create-${operation}-before`).create({action:"nap.competition.create.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
        checkpoint:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-competition-create-${operation}-before`).update({target}),
        complete:(operation,target)=>backendContext.writeAuditLogOnce("engagementCompetition.created",context.uid,{...target,auditPreparationId:`nap-competition-create-${operation}-before`},operation)
      },proposed=>(0, backendContext.local$assertCanModifyEngagementEvent)(context,proposed));
      const competition=await (0, backendContext.local$nativePortalCompetition)(result.competitionId,proposed=>(0, backendContext.local$assertCanManageEngagementCompetition)(context,proposed));
      return {...result,competition};
    } catch(error) {
      if(error instanceof backendContext.HttpsError) throw error;
      throw new backendContext.HttpsError(error instanceof TypeError?"failed-precondition":error instanceof RangeError?"resource-exhausted":"unavailable",error instanceof TypeError||error instanceof RangeError?error.message:"Creation NAP a verifier. Conservez le formulaire : ne creez pas une seconde competition.");
    }
  }

  return { createNativePortalCalendarRecord };
}

module.exports = { createCompetitionService_createNativePortalCalendarRecord };
