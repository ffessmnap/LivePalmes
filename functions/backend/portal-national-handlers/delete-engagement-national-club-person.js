// Existing operation bodies; live services arrive through explicit accessors.
function createNationalHandlers_deleteEngagementNationalClubPerson(backendContext) {
  async function deleteEngagementNationalClubPerson(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national) {
      throw new backendContext.HttpsError("permission-denied", "Suppression reservee au niveau national.");
    }
    const personId = backendContext.cleanText(request.data?.personId).slice(0, 80);
    if (!personId) {
      throw new backendContext.HttpsError("invalid-argument", "Personne requise.");
    }
    if (request.data?.confirmPermanent !== true) {
      throw new backendContext.HttpsError("failed-precondition", "Confirmation de suppression definitive requise.");
    }
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        return await require("../../nap-person-deletion").deletePerson(require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{personId,actorUid:context.uid,confirmPermanent:true,expectedFingerprint:request.data?.expectedFingerprint},{
          read:async operation=>{const doc=await backendContext.db.collection("auditLogs").doc(`nap-person-delete-${operation}-before`).get();return doc.exists?doc.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-person-delete-${operation}-before`).create({action:"nap.personDelete.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          complete:(operation,target)=>backendContext.writeAuditLogOnce("nap.personDelete.complete",context.uid,{...target,auditPreparationId:`nap-person-delete-${operation}-before`},`nap-person-delete-${operation}-complete`)
        },()=>{if(!context.national) throw new backendContext.HttpsError("permission-denied","Suppression nationale requise.");});
      } catch(error) {if(error instanceof backendContext.HttpsError) throw error;throw new backendContext.HttpsError(error instanceof TypeError?"failed-precondition":"unavailable",error instanceof TypeError?error.message:"Suppression NAP a verifier. Rechargez la fiche ; sauvegarde conservee.");}
    }
    const ref = backendContext.db.collection("engagementClubPeople").doc(personId);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      throw new backendContext.HttpsError("not-found", "Personne introuvable.");
    }
    const data = snapshot.data() || {};
    const batch = backendContext.db.batch();
    batch.delete(ref);
    backendContext.deleteEngagementClubPeopleRosterPerson(batch, backendContext.db, { ...data, id: personId });
    await batch.commit();
    await backendContext.writeAuditLog("engagementClubPerson.nationalDeleted", context.uid, {
      personId,
      firstName: backendContext.cleanText(data.firstName).slice(0, 80),
      lastName: backendContext.cleanText(data.lastName).slice(0, 80),
      clubId: backendContext.cleanText(data.clubId).slice(0, 40),
      roles: data.roles || {}
    });
    return {
      ok: true,
      personId
    };
  }

  return { deleteEngagementNationalClubPerson };
}

module.exports = { createNationalHandlers_deleteEngagementNationalClubPerson };
