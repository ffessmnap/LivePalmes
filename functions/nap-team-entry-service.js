"use strict";
// Dedicated NAP adapter used by the existing explicit entry-service factory.
async function saveNativeClubTeamDossier(backendContext,context,request){
  try{
    const result=await require('./nap-team-entry-change').saveTeamEntries(require('./nap-portal-pool').portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{competitionId:request.data?.competitionId,clubId:String(context.clubId),actorUid:context.uid,expectedFingerprint:request.data?.expectedFingerprint,mutationId:request.data?.mutationId,dossier:request.data?.teamDossier},{
      authorize:({clubId})=>{if(String(clubId)!==String(context.clubId))throw new backendContext.HttpsError('permission-denied','Dossier hors du club autorisé.');},
      resolve:input=>require('./nap-team-entry-resolution').resolveTeamDossier(input,{
        view:pack=>require('./nap-competition-view').competitionItem(pack,backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE),
        age:(date,birthDate)=>(backendContext.importSeasonYear(date)||backendContext.competitionYear(date))-backendContext.birthYear(birthDate),
        category:backendContext.ageCategoryFromDates,
        forbidden:(code,category)=>backendContext.ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES[code]?.has(category)===true
      }),
      audit:{
        read:async operation=>{const doc=await backendContext.db.collection('auditLogs').doc(`nap-team-${operation}-before`).get();return doc.exists?doc.data().target:null;},
        prepare:(operation,target)=>backendContext.db.collection('auditLogs').doc(`nap-team-${operation}-before`).create({action:'nap.teamEntry.prepare',actorUid:context.uid,target,createdAt:new Date().toISOString()}),
        complete:(operation,target)=>backendContext.writeAuditLogOnce('engagementClubEntry.teamDossierSaved',context.uid,{...target,auditPreparationId:`nap-team-${operation}-before`},operation)
      }
    });
    const competition=require('./nap-competition-view').competitionItem(result.competition,backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE);
    return {ok:true,source:'nap',operation:result.operation,writesExecuted:result.writesExecuted,sqlBudget:result.sqlBudget||{queriesMax:120,writesMax:12},entry:await backendContext.nativeClubEntryView(result.nativeEntry,context,competition)};
  }catch(error){if(error instanceof backendContext.HttpsError)throw error;throw new backendContext.HttpsError(error instanceof RangeError?'resource-exhausted':error instanceof TypeError?'failed-precondition':'unavailable',error instanceof RangeError||error instanceof TypeError?error.message:'Enregistrement du dossier à vérifier. Reprenez la même opération.',{retrySameOperation:error.teamWritesStarted!==false});}
}
module.exports={saveNativeClubTeamDossier};
