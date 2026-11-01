// Existing operation bodies; live services arrive through explicit accessors.
function createEntryService_saveNativeClubRelays(backendContext) {
  async function saveNativeClubRelays(context,request) {
    try {
      const input={competitionId:request.data?.competitionId,clubId:String(context.clubId),actorUid:context.uid,expectedFingerprint:request.data?.expectedFingerprint,mutationId:request.data?.mutationId};
      const pool=require("../../nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
      const authorize=({clubId})=>{if(String(clubId)!==String(context.clubId)) throw new backendContext.HttpsError("permission-denied","Dossier hors du club autorise.");};
      const audit={
        read:async operation=>{const doc=await backendContext.db.collection("auditLogs").doc(`nap-relay-${operation}-before`).get();return doc.exists?doc.data().target:null;},
        prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-relay-${operation}-before`).create({action:"nap.relay.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
        checkpoint:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-relay-${operation}-before`).update({target}),
        complete:(operation,target)=>backendContext.writeAuditLogOnce("engagementClubEntry.relaysSaved",context.uid,{...target,auditPreparationId:`nap-relay-${operation}-before`},operation)
      };
      let result;
      if(request.data?.removeRelayId) {
        result=await require("../../nap-relay-entry-change").saveNativeRelayChanges(pool,{...input,changes:[{relayId:request.data.removeRelayId,action:"remove"}]},{authorize,audit,resolve:async({changes})=>changes});
      } else {
        result=await require("../../nap-relay-composition-change").saveNativeRelayComposition(pool,{...input,change:request.data?.relayChange},{authorize,audit,resolve:input=>require("../../nap-relay-resolution").resolveRelay(input,{
          qualifiedAnchors:(connection,{pack,competition,ids})=>require("../../nap-qualification-relay-preview").readAnchors(connection,{competitionId:pack.event.id,rules:competition.qualifications,date:competition.date,events:backendContext.qualificationEvents(competition)},ids,{categoryFor:backendContext.ageCategoryFromDates}),
          view:pack=>{
            const view=require("../../nap-portal-workspaces").competitionItem(pack,backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE);
            const events=backendContext.cleanEngagementCompetitionEvents(view.events.map(event=>({...event,multipleRelaysAllowed:event.allowMultipleRelays===true})),{strict:false,competitionType:view.competitionType});
            return {...view,events:events.map(event=>({...view.events.find(row=>row.code===event.code),...event}))};
          },
          validate:async(raw,competition,dossier)=>{
            const swimmers=require("../../nap-portal-workspaces").entryItem(dossier,context,birthDate=>backendContext.ageCategoryFromDates(competition.date,birthDate),competition).swimmers;
            const relays=backendContext.cleanEngagementEntryRelays([raw],competition,swimmers);
            return backendContext.validateEngagementRelayEntryTimes(relays,competition,(await require("../../nap-records-store").read(input.connection)).data)[0];
          }
        })});
      }
      const competition=require("../../nap-portal-workspaces").competitionItem(result.competition,backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE);
      return {ok:true,source:"nap",operation:result.operation,writesExecuted:result.writesExecuted,entry:await backendContext.nativeClubEntryView(result.nativeEntry,context,competition),sqlBudget:{queriesMax:63,writesMax:5}};
    } catch(error) {
      if(error instanceof backendContext.HttpsError) throw error;
      throw new backendContext.HttpsError(error instanceof RangeError?"resource-exhausted":error instanceof TypeError?"failed-precondition":"unavailable",error instanceof RangeError || error instanceof TypeError?error.message:"Enregistrement NAP a verifier. Reprenez la meme modification ; la sauvegarde est conservee.");
    }
  }

  return { saveNativeClubRelays };
}

module.exports = { createEntryService_saveNativeClubRelays };
