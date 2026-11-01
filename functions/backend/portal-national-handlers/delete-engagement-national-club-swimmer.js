// Existing operation bodies; live services arrive through explicit accessors.
function createNationalHandlers_deleteEngagementNationalClubSwimmer(backendContext) {
  async function deleteEngagementNationalClubSwimmer(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national) {
      throw new backendContext.HttpsError("permission-denied", "Suppression reservee au niveau national.");
    }
    const swimmerId = backendContext.cleanText(request.data?.swimmerId).slice(0, 80);
    if (!swimmerId) {
      throw new backendContext.HttpsError("invalid-argument", "Nageur requis.");
    }
    if (request.data?.confirmPermanent !== true) {
      throw new backendContext.HttpsError("failed-precondition", "Confirmation de suppression definitive requise.");
    }
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        return await require("../../nap-swimmer-deletion").deleteSwimmer(require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{
          swimmerId,actorUid:context.uid,confirmPermanent:true,expectedFingerprint:request.data?.expectedFingerprint,
          expectedActivityFingerprint:request.data?.expectedActivityFingerprint,expectedLicenseNumber:request.data?.expectedLicenseNumber
        },{
          read:async operation=>{const [saved,reservation]=await Promise.all([backendContext.db.collection("auditLogs").doc(`nap-swimmer-delete-${operation}-before`).get(),backendContext.db.collection("auditLogs").doc(`nap-swimmer-merge-person-${swimmerId}`).get()]);if(reservation.exists&&reservation.data().state==="pending")throw new TypeError("Une fusion de cette fiche doit etre terminee avant sa suppression.");return saved.exists?saved.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-swimmer-delete-${operation}-before`).create({action:"nap.swimmerDelete.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          complete:(operation,target)=>backendContext.writeAuditLogOnce("nap.swimmerDelete.complete",context.uid,{...target,auditPreparationId:`nap-swimmer-delete-${operation}-before`},`nap-swimmer-delete-${operation}-complete`)
        },()=>{if(!context.national)throw new backendContext.HttpsError("permission-denied","Suppression nationale requise.");});
      }catch(error){if(error instanceof backendContext.HttpsError)throw error;throw new backendContext.HttpsError(error instanceof TypeError||error instanceof RangeError?"failed-precondition":"unavailable",error instanceof TypeError||error instanceof RangeError?error.message:"Suppression NAP a verifier. Reprenez la meme action ; sauvegarde conservee.");}
    }
    const ref = backendContext.db.collection("engagementClubSwimmers").doc(swimmerId);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      throw new backendContext.HttpsError("not-found", "Nageur introuvable.");
    }
    const swimmer = snapshot.data() || {};
    const usage = await backendContext.engagementClubSwimmerDeletionUsage(swimmerId, swimmer, {
      ...context,
      clubId: backendContext.cleanText(swimmer.clubId).slice(0, 40)
    });
    if (usage.performanceMatchCount > 0 || usage.entryUsageCount > 0 || usage.entryScanTruncated) {
      throw new backendContext.HttpsError("failed-precondition", "Ce nageur est utilise dans l'historique. Il doit etre desactive plutot que supprime.", usage);
    }
    const deleted = await backendContext.deleteEngagementClubSwimmerPermanently(ref, snapshot, context, "national");
    return {
      ok: true,
      ...deleted
    };
  }

  return { deleteEngagementNationalClubSwimmer };
}

module.exports = { createNationalHandlers_deleteEngagementNationalClubSwimmer };
