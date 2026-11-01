// Existing operation bodies; live services arrive through explicit accessors.
function createEntryService_saveNativeClubSwimmerSelections(backendContext) {
  async function saveNativeClubSwimmerSelections(context,request,rawChanges) {
    try {
      if(!Array.isArray(rawChanges) || !rawChanges.length || rawChanges.length>50) throw new TypeError("Selection de 1 a 50 nageurs requise.");
      const pool=require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
      const result=await require("../../nap-swimmer-entry-change").saveNativeSwimmerSelection(pool,{
        competitionId:request.data?.competitionId,clubId:String(context.clubId),actorUid:context.uid,
        expectedFingerprint:request.data?.expectedFingerprint,mutationId:request.data?.mutationId,
        changes:rawChanges.map(row=>({swimmerId:row?.swimmerIndexId || row?.swimmer?.swimmerIndexId,selected:row?.selected}))
      },{
        prepareEffects:require("../../nap-qualification-entry-effects").prepare,
        afterSaved:require("../../nap-qualification-entry-effects").apply,
        authorize:({clubId})=>{
          if(String(clubId)!==String(context.clubId)) throw new backendContext.HttpsError("permission-denied","Dossier hors du club autorise.");
          // Open/deadline are checked by the executor, permitting confirmation of
          // an already completed operation after closure without another write.
        },
        validate:async({connection,competition,pack,plan})=>{
          const reason=require("../../nap-swimmer-entry-plan").selectionLockReason(competition);
          if(reason) throw new TypeError(reason);
          const participation=require("../../nap-entry-participation-rules"),evidence=await participation.readEvidence(connection,plan.additions,competition);
          const samePerson=(person,row)=>backendContext.cleanText(person.firstName).toLocaleLowerCase("fr-FR")===backendContext.cleanText(row.prenom).toLocaleLowerCase("fr-FR") && backendContext.cleanText(person.lastName).toLocaleLowerCase("fr-FR")===backendContext.cleanText(row.nom).toLocaleLowerCase("fr-FR") && (!backendContext.cleanIsoDate(row.date) || backendContext.cleanIsoDate(person.birthDate)===backendContext.cleanIsoDate(row.date));
          for(const person of plan.additions) {
            if(!participation.eligible(competition,person.id,evidence)) throw new TypeError("Un resultat NAP dans au moins une competition requise est necessaire pour engager ce nageur.");
            if(!person.firstName || !person.lastName || !backendContext.cleanIsoDate(person.birthDate) || !["F","M"].includes(person.sex)) throw new TypeError("Completez l'identite NAP du nageur avant l'engagement.");
            if(pack.leaders.some(row=>samePerson(person,row))) throw new TypeError("Une meme personne ne peut pas etre nageur et chef d'equipe sur cette competition.");
            if(pack.officials.some(row=>samePerson(person,row))) throw new TypeError("Une meme personne ne peut pas etre nageur et officiel sur cette competition.");
          }
        },
        audit:{
          read:async operation=>{const doc=await backendContext.db.collection("auditLogs").doc(`nap-swimmer-selection-${operation}-before`).get();return doc.exists?doc.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-swimmer-selection-${operation}-before`).create({action:"nap.swimmerSelection.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          complete:(operation,target)=>backendContext.writeAuditLogOnce("engagementClubEntry.swimmerSelectionsSaved",context.uid,{...target,auditPreparationId:`nap-swimmer-selection-${operation}-before`},operation)
        }
      });
      const competition=require("../../nap-competition-view").competitionItem(result.competition,backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE);
      return {ok:true,source:"nap",operation:result.operation,writesExecuted:result.writesExecuted,entry:await backendContext.nativeClubEntryView(result.nativeEntry,context,competition),sqlBudget:{queriesMax:48,writesMax:5}};
    } catch(error) {
      if(error instanceof backendContext.HttpsError) throw error;
      throw new backendContext.HttpsError(error instanceof RangeError?"resource-exhausted":error instanceof TypeError?"failed-precondition":"unavailable",error instanceof RangeError || error instanceof TypeError?error.message:"Enregistrement NAP a verifier. Reprenez la meme modification ; la sauvegarde est conservee.");
    }
  }

  return { saveNativeClubSwimmerSelections };
}

module.exports = { createEntryService_saveNativeClubSwimmerSelections };
