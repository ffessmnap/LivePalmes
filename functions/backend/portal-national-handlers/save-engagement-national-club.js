// Existing operation bodies; live services arrive through explicit accessors.
function createNationalHandlers_saveEngagementNationalClub(backendContext) {
  async function saveEngagementNationalClub(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national) throw new backendContext.HttpsError("permission-denied", "Modification des clubs reservee au niveau national.");
    const requestedClubId = backendContext.cleanText(request.data?.clubId).slice(0, 40);
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      if(!requestedClubId) {
        try {return await require("../../nap-club-create").create(require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{actorUid:context.uid,club:request.data?.club,creationId:request.data?.creationId},{
          read:async operation=>{const doc=await backendContext.db.collection("auditLogs").doc(`nap-club-create-${operation}-before`).get();return doc.exists?doc.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-club-create-${operation}-before`).create({action:"nap.clubCreate.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          checkpoint:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-club-create-${operation}-before`).update({target}),
          complete:async(operation,target)=>{await backendContext.writeAuditLogOnce("nap.clubCreate.complete",context.uid,{...target,auditPreparationId:`nap-club-create-${operation}-before`},`nap-club-create-${operation}-complete`);await require("../../nap-club-provenance").record(backendContext.db,operation,target,context.uid);}
        },()=>{if(!context.national)throw new backendContext.HttpsError("permission-denied","Action nationale requise.");});}
        catch(error) {if(error instanceof backendContext.HttpsError)throw error;throw new backendContext.HttpsError(error instanceof TypeError?"failed-precondition":"unavailable",error instanceof TypeError?error.message:"Creation club NAP a verifier. Reprenez la meme action ; sauvegarde conservee.");}
      }
      try {return await require("../../nap-club-change").edit(require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{clubId:requestedClubId,actorUid:context.uid,club:request.data?.club,expectedFingerprint:request.data?.expectedFingerprint,confirmFederalNumberChange:request.data?.confirmFederalNumberChange},{
        read:async operation=>{const doc=await backendContext.db.collection("auditLogs").doc(`nap-club-edit-${operation}-before`).get();return doc.exists?doc.data().target:null;},
        prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-club-edit-${operation}-before`).create({action:"nap.clubEdit.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
        complete:(operation,target)=>backendContext.writeAuditLogOnce("nap.clubEdit.complete",context.uid,{...target,auditPreparationId:`nap-club-edit-${operation}-before`},`nap-club-edit-${operation}-complete`)
      },()=>{if(!context.national)throw new backendContext.HttpsError("permission-denied","Action nationale requise.");});}
      catch(error) {if(error instanceof backendContext.HttpsError)throw error;throw new backendContext.HttpsError(error instanceof TypeError?"failed-precondition":"unavailable",error instanceof TypeError?error.message:"Modification club NAP a verifier. Rechargez la fiche.");}
    }
    throw new backendContext.HttpsError("failed-precondition", "La gestion des clubs nécessite la source NAP.");
  }

  return { saveEngagementNationalClub };
}

module.exports = { createNationalHandlers_saveEngagementNationalClub };
