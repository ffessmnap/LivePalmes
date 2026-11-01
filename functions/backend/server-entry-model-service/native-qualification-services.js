// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_nativeQualificationServices(backendContext) {
  function nativeQualificationServices(context) {
    const competitionFor=(pack,rules)=>({...require("../../nap-portal-workspaces").competitionItem(pack,backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE),...(rules?{qualifications:rules}:{})});
    return {
      authorize:event=>backendContext.assertCanModifyEngagementEvent(context,event),
      competitionFor,eventsFor:pack=>(0, backendContext.local$qualificationEvents)(competitionFor(pack)),categoryFor:backendContext.ageCategoryFromDates,
      automatic:backendContext.local$automaticEngagementIndividualEntry,assertOpen:backendContext.assertEngagementClubWriteOpen,
      effects:require("../../nap-qualification-effects").effects,
      eventDefinitions:backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE,normalizeProgram:backendContext.cleanEngagementProgramSessions,normalizeEvents:backendContext.cleanEngagementCompetitionEvents,
      applyNativePatch:input=>require("../../nap-portal-competition-change").applyCompetitionChange(
        require("../../nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),
        {...input,national:true,eventDefinitions:backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE,normalizeProgram:backendContext.cleanEngagementProgramSessions,normalizeEvents:backendContext.cleanEngagementCompetitionEvents},
        {
          read:async operation=>{const snapshot=await backendContext.db.collection("auditLogs").doc(`nap-competition-${operation}-before`).get();return snapshot.exists?snapshot.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-competition-${operation}-before`).create({action:"nap.competition.change.prepare",actorUid:input.actorUid,target:{...target,notificationOpeningRequested:input.notificationOpeningRequested===true},createdAt:new Date().toISOString()}),
          complete:async(operation,target)=>{await backendContext.armNativeCompetitionNotification(context,input,operation);await backendContext.writeAuditLogOnce("nap.competition.changed",input.actorUid,{...target,auditPreparationId:`nap-competition-${operation}-before`},operation);}
        },event=>backendContext.assertCanModifyEngagementEvent(context,event))
    };
  }

  return { nativeQualificationServices };
}

module.exports = { createEntryModelService_nativeQualificationServices };
