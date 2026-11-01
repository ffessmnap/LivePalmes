// Existing operation bodies; live services arrive through explicit accessors.
function createEntryService_previewNativeClubEntryTimes(backendContext) {
  async function previewNativeClubEntryTimes(context,competitionId,swimmerIds,enrolledOnly) {
    try {
      const pool=require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
      return await require("../../nap-entry-time-preview").previewNativeTimes(pool,{competitionId,clubId:String(context.clubId),swimmerIds,enrolledOnly},{
        authorize:({clubId})=>{if(String(clubId)!==String(context.clubId)) throw new backendContext.HttpsError("permission-denied","Dossier hors du club autorise.");},
        prepareQualifications:(connection,input)=>require("../../nap-qualification-people").readEvaluations(connection,{...input,events:backendContext.qualificationEvents(require("../../nap-competition-view").competitionItem(input.pack,backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE)),categoryFor:backendContext.ageCategoryFromDates}),
        preview:(person,rows,pack,dossier,evaluation)=>{
          const competition=require("../../nap-competition-view").competitionItem(pack,backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE);
          return competition.events.filter(event=>event.type==="individual" && event.nativeRecognized && event.nativeCourses.some(course=>String(course.sexe)===String(person.sex)))
            .map(event=>require("../../nap-entry-time-rules").resolveTime({eventCode:event.code},competition,{
              automatic:entry=>backendContext.automaticEngagementIndividualEntry(entry,rows,competition),
              parse:backendContext.parseEngagementEntryTime
            },true)).map(entry=>evaluation?{...entry,qualification:{...evaluation.courses[entry.eventCode],mode:evaluation.mode}}:entry);
        }
      });
    } catch(error) {
      if(error instanceof backendContext.HttpsError) throw error;
      throw new backendContext.HttpsError(error instanceof RangeError ? "resource-exhausted" : error instanceof TypeError ? "failed-precondition" : "unavailable",error instanceof RangeError || error instanceof TypeError ? error.message : "Historique NAP momentanement indisponible. Aucun engagement modifie.");
    }
  }

  return { previewNativeClubEntryTimes };
}

module.exports = { createEntryService_previewNativeClubEntryTimes };
