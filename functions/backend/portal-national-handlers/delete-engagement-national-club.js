// Existing operation bodies; live services arrive through explicit accessors.
function createNationalHandlers_deleteEngagementNationalClub(backendContext) {
  async function deleteEngagementNationalClub(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national) throw new backendContext.HttpsError("permission-denied", "Suppression des clubs reservee au niveau national.");
    if (request.data?.confirmPermanent !== true) {
      throw new backendContext.HttpsError("failed-precondition", "Confirmation de suppression definitive requise.");
    }
    const clubId = backendContext.cleanText(request.data?.clubId).slice(0, 40);
    if (!clubId) throw new backendContext.HttpsError("invalid-argument", "Club requis.");
    if(backendContext.ENVIRONMENT.sportingDataSource === "nap"){
      try{return await require("../../nap-club-deletion").deleteClub(require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{clubId,actorUid:context.uid,confirmPermanent:true,expectedFingerprint:request.data?.expectedFingerprint},{
        creation:clubId=>require("../../nap-club-provenance").creation(backendContext.db,clubId),
        assertNoAccounts:async clubId=>{const [users,requests]=await Promise.all([backendContext.db.collection("users").where("clubId","==",clubId).limit(1).get(),backendContext.db.collection("engagementAccessRequests").where("clubId","==",clubId).where("status","==","pending").limit(1).get()]);if(!users.empty||!requests.empty)throw new TypeError("Ce club possede un compte ou une demande d'acces. Desactivez-le plutot que de le supprimer.");},
        read:async operation=>{const doc=await backendContext.db.collection("auditLogs").doc(`nap-club-delete-${operation}-before`).get();return doc.exists?doc.data().target:null;},
        prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-club-delete-${operation}-before`).create({action:"nap.clubDelete.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
        complete:(operation,target)=>backendContext.writeAuditLogOnce("nap.clubDelete.complete",context.uid,{...target,auditPreparationId:`nap-club-delete-${operation}-before`},`nap-club-delete-${operation}-complete`)
      },()=>{if(!context.national)throw new backendContext.HttpsError("permission-denied","Suppression nationale requise.");});}
      catch(error){if(error instanceof backendContext.HttpsError)throw error;throw new backendContext.HttpsError(error instanceof TypeError||error instanceof RangeError?"failed-precondition":"unavailable",error instanceof TypeError||error instanceof RangeError?error.message:"Suppression club NAP a verifier. Reprenez la meme action ; sauvegarde conservee.");}
    }
    throw new backendContext.HttpsError("failed-precondition", "La gestion des clubs nécessite la source NAP.");
  }

  return { deleteEngagementNationalClub };
}

module.exports = { createNationalHandlers_deleteEngagementNationalClub };
