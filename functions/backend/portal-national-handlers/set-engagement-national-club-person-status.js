// Existing operation bodies; live services arrive through explicit accessors.
function createNationalHandlers_setEngagementNationalClubPersonStatus(backendContext) {
  async function setEngagementNationalClubPersonStatus(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national) {
      throw new backendContext.HttpsError("permission-denied", "Action reservee au niveau national.");
    }
    const personId = backendContext.cleanText(request.data?.personId).slice(0, 80);
    if (!personId) {
      throw new backendContext.HttpsError("invalid-argument", "Personne requise.");
    }
    const active = request.data?.active === true;
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        const statusService=require("../../nap-club-person-status");
        const ref=statusService.reference(personId),spec=require("../../nap-club-people-values").SOURCES[ref.kind];
        const pool=require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
        const [rows]=await pool.execute({sql:`SELECT club FROM \`${spec.table}\` WHERE id=? LIMIT 1`,timeout:10000},[ref.id]);
        if(rows.length!==1) throw new TypeError("Personne NAP introuvable.");
        const clubId=String(rows[0].club);
        const result=await statusService.changeNativePersonStatus(pool,{personId,clubId,actorUid:context.uid,active,expectedFingerprint:request.data?.expectedFingerprint},{
          read:async operation=>{const doc=await backendContext.db.collection("auditLogs").doc(`nap-person-status-${operation}-before`).get();return doc.exists?doc.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-person-status-${operation}-before`).create({action:"nap.personStatus.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          complete:(operation,target)=>backendContext.writeAuditLogOnce("nap.personStatus.complete",context.uid,{...target,auditPreparationId:`nap-person-status-${operation}-before`},`nap-person-status-${operation}-complete`)
        },scope=>{if(!context.national || scope.clubId!==clubId) throw new backendContext.HttpsError("permission-denied","Personne hors perimetre.");});
        return result;
      } catch(error) {if(error instanceof backendContext.HttpsError) throw error;throw new backendContext.HttpsError(error instanceof TypeError?"failed-precondition":"unavailable",error instanceof TypeError?error.message:"Statut NAP a verifier. Rechargez la fiche.");}
    }
    const ref = backendContext.db.collection("engagementClubPeople").doc(personId);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      throw new backendContext.HttpsError("not-found", "Personne introuvable.");
    }
    if (backendContext.cleanText(snapshot.data()?.status) === "merged" && active) {
      throw new backendContext.HttpsError("failed-precondition", "Une personne fusionnee ne peut pas etre reactivee directement.");
    }
    const now = new Date().toISOString();
    const payload = {
      active,
      updatedAt: now,
      updatedBy: context.uid,
      ...(active ? { reactivatedAt: now, reactivatedBy: context.uid } : { disabledAt: now, disabledBy: context.uid })
    };
    const batch = backendContext.db.batch();
    batch.set(ref, payload, { merge: true });
    backendContext.upsertEngagementClubPeopleRosterPerson(batch, backendContext.db, backendContext.engagementClubPersonItem({
      id: ref.id,
      data: () => ({ ...(snapshot.data() || {}), ...payload })
    }), now);
    await batch.commit();
    await backendContext.writeAuditLog("engagementClubPerson.nationalStatusChanged", context.uid, {
      personId,
      firstName: backendContext.cleanText(snapshot.data()?.firstName).slice(0, 80),
      lastName: backendContext.cleanText(snapshot.data()?.lastName).slice(0, 80),
      clubId: backendContext.cleanText(snapshot.data()?.clubId).slice(0, 40),
      active
    });
    const updated = await ref.get();
    return {
      ok: true,
      person: backendContext.engagementClubPersonItem(updated)
    };
  }

  return { setEngagementNationalClubPersonStatus };
}

module.exports = { createNationalHandlers_setEngagementNationalClubPersonStatus };
