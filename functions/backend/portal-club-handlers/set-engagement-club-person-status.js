// Existing operation bodies; live services arrive through explicit accessors.
function createClubHandlers_setEngagementClubPersonStatus(backendContext) {
  async function setEngagementClubPersonStatus(request) {
    const context = await backendContext.engagementClubAccessContext(request);
    if(backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        const pool=require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
        return await require("../../nap-club-person-status").changeNativePersonStatus(pool,{
          clubId:String(context.clubId),actorUid:context.uid,personId:request.data?.personId,
          active:request.data?.active,expectedFingerprint:request.data?.expectedFingerprint
        },{
          read:async operation=>{const snapshot=await backendContext.db.collection("auditLogs").doc(`nap-person-status-${operation}-before`).get();return snapshot.exists?snapshot.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-person-status-${operation}-before`).create({action:"nap.person.status.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          complete:(operation,target)=>backendContext.writeAuditLogOnce("engagementClubPerson.statusChanged",context.uid,{...target,auditPreparationId:`nap-person-status-${operation}-before`},operation)
        },scope=>{if(scope.clubId!==String(context.clubId)) throw new backendContext.HttpsError("permission-denied","Personne hors club.");});
      } catch(error) {
        if(error instanceof backendContext.HttpsError) throw error;
        throw new backendContext.HttpsError(error instanceof TypeError?"failed-precondition":"unavailable",error instanceof TypeError?error.message:"Statut NAP a verifier. Reprenez la meme action ; la sauvegarde est conservee.");
      }
    }
    const personId = backendContext.cleanText(request.data?.personId).slice(0, 80);
    const active = request.data?.active === true;
    if (!personId) {
      throw new backendContext.HttpsError("invalid-argument", "Personne requise.");
    }
    const ref = backendContext.db.collection("engagementClubPeople").doc(personId);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      throw new backendContext.HttpsError("not-found", "Personne introuvable.");
    }
    if (backendContext.cleanText(snapshot.data()?.clubId) !== context.clubId) {
      throw new backendContext.HttpsError("permission-denied", "Personne hors perimetre club.");
    }
    const now = new Date().toISOString();
    const payload = {
      active,
      updatedAt: now,
      updatedBy: context.uid
    };
    const batch = backendContext.db.batch();
    batch.set(ref, payload, { merge: true });
    backendContext.upsertEngagementClubPeopleRosterPerson(batch, backendContext.db, backendContext.engagementClubPersonItem({
      id: ref.id,
      data: () => ({ ...(snapshot.data() || {}), ...payload })
    }), now);
    await batch.commit();
    await backendContext.writeAuditLog("engagementClubPerson.statusChanged", context.uid, {
      personId,
      firstName: backendContext.cleanText(snapshot.data()?.firstName).slice(0, 80),
      lastName: backendContext.cleanText(snapshot.data()?.lastName).slice(0, 80),
      clubId: context.clubId,
      active
    });
    return {
      ok: true,
      person: backendContext.engagementClubPersonItem({ id: ref.id, exists: true, data: () => ({ ...(snapshot.data() || {}), ...payload }) })
    };
  }

  return { setEngagementClubPersonStatus };
}

module.exports = { createClubHandlers_setEngagementClubPersonStatus };
