// Existing operation bodies; live services arrive through explicit accessors.
function createEntryService_saveNativeClubIndividualEntries(backendContext) {
  async function saveNativeClubIndividualEntries(context,request) {
    try {
      const swimmers=request.data?.swimmers;
      if(!Array.isArray(swimmers) || !swimmers.length || swimmers.length>100) throw new TypeError("Modification de 1 a 100 nageurs requise.");
      const pool=require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
      const result=await require("../../nap-individual-entry-change").saveNativeIndividualEntries(pool,{
        competitionId:request.data?.competitionId,clubId:String(context.clubId),actorUid:context.uid,
        expectedFingerprint:request.data?.expectedFingerprint,mutationId:request.data?.mutationId,
        changes:swimmers.map(row=>({swimmerId:row?.swimmerIndexId,entries:row?.individualEntries}))
      },{
        authorize:({clubId})=>{if(String(clubId)!==String(context.clubId)) throw new backendContext.HttpsError("permission-denied","Dossier hors du club autorise.");},
        resolve:async input=>{
          const rules=require("../../nap-entry-course-rules"),reason=rules.courseLockReason(input.competition);
          if(reason) throw new TypeError(reason);
          const categories=await rules.readCategories(input.connection);
          return require("../../nap-individual-entry-resolution").resolveChanges({...input,categories},{
            view:pack=>require("../../nap-competition-view").competitionItem(pack,backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE),
            age:(date,birthDate)=>(backendContext.importSeasonYear(date)||backendContext.competitionYear(date))-backendContext.birthYear(birthDate),
            category:backendContext.ageCategoryFromDates,
            forbidden:(code,category)=>backendContext.ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES[code]?.has(category)===true,
            automatic:backendContext.automaticEngagementIndividualEntry,parse:backendContext.parseEngagementEntryTime,
            prepareQualifications:(connection,input)=>require("../../nap-qualification-people").readEvaluations(connection,{...input,events:backendContext.qualificationEvents(require("../../nap-competition-view").competitionItem(input.pack,backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE)),categoryFor:backendContext.ageCategoryFromDates}),
            validateTimes:async(swimmers,competition)=>backendContext.validateEngagementIndividualEntryTimes(swimmers,competition,(await require("../../nap-records-store").read(input.connection)).data)
          });
        },
        prepareEffects:require("../../nap-qualification-entry-effects").prepare,
        afterSaved:require("../../nap-qualification-entry-effects").apply,
        audit:{
          read:async operation=>{const doc=await backendContext.db.collection("auditLogs").doc(`nap-individual-${operation}-before`).get();return doc.exists?doc.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-individual-${operation}-before`).create({action:"nap.individualEntry.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          complete:(operation,target)=>backendContext.writeAuditLogOnce("engagementClubEntry.individualEntriesSaved",context.uid,{...target,auditPreparationId:`nap-individual-${operation}-before`},operation)
        }
      });
      const competition=require("../../nap-competition-view").competitionItem(result.competition,backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE);
      return {ok:true,source:"nap",operation:result.operation,writesExecuted:result.writesExecuted,
        entry:await backendContext.nativeClubEntryView(result.nativeEntry,context,competition),
        sqlBudget:{queriesMax:40,writesMax:4}};
    } catch(error) {
      if(error instanceof backendContext.HttpsError) throw error;
      throw new backendContext.HttpsError(error instanceof RangeError?"resource-exhausted":error instanceof TypeError?"failed-precondition":"unavailable",error instanceof RangeError || error instanceof TypeError?error.message:"Enregistrement NAP a verifier. Reprenez la meme modification ; la sauvegarde est conservee.");
    }
  }

  return { saveNativeClubIndividualEntries };
}

module.exports = { createEntryService_saveNativeClubIndividualEntries };
