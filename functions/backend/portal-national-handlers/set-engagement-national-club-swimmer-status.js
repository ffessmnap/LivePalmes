// Existing operation bodies; live services arrive through explicit accessors.
function createNationalHandlers_setEngagementNationalClubSwimmerStatus(backendContext) {
  async function setEngagementNationalClubSwimmerStatus(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national) {
      throw new backendContext.HttpsError("permission-denied", "Action reservee au niveau national.");
    }
    const swimmerId = backendContext.cleanText(request.data?.swimmerId).slice(0, 80);
    if (!swimmerId) {
      throw new backendContext.HttpsError("invalid-argument", "Nageur requis.");
    }
    const active = request.data?.active === true;
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        const pool=require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
        const id=require("../../nap-swimmer-values").swimmerId(swimmerId);
        const [rows]=await pool.execute({sql:"SELECT club FROM nageurs WHERE id=? LIMIT 1",timeout:10000},[id]);
        if(rows.length!==1) throw new TypeError("Nageur NAP introuvable.");
        return await require("../../nap-swimmer-activity").change(pool,{id,clubId:String(rows[0].club),actorUid:context.uid,status:active?"active":"inactive",expectedFingerprint:request.data?.expectedFingerprint},{
          read:async operation=>{const doc=await backendContext.db.collection("auditLogs").doc(`nap-swimmer-activity-${operation}-before`).get();return doc.exists?doc.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-swimmer-activity-${operation}-before`).create({action:"nap.swimmerActivity.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          complete:(operation,target)=>backendContext.writeAuditLogOnce("nap.swimmerActivity.complete",context.uid,{...target,auditPreparationId:`nap-swimmer-activity-${operation}-before`},`nap-swimmer-activity-${operation}-complete`)
        });
      } catch(error) {throw new backendContext.HttpsError(error instanceof TypeError?"failed-precondition":"unavailable",error instanceof TypeError?error.message:"Statut NAP a verifier. Rechargez la fiche.");}
    }
    const ref = backendContext.db.collection("engagementClubSwimmers").doc(swimmerId);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      throw new backendContext.HttpsError("not-found", "Nageur introuvable.");
    }
    if (backendContext.cleanText(snapshot.data()?.status) === "merged" && active) {
      throw new backendContext.HttpsError("failed-precondition", "Un nageur fusionne ne peut pas etre reactive directement.");
    }
    const now = new Date().toISOString();
    const payload = {
      active,
      ...(active ? { status: "active" } : {}),
      updatedAt: now,
      updatedBy: context.uid,
      ...(active ? { reactivatedAt: now, reactivatedBy: context.uid } : { disabledAt: now, disabledBy: context.uid })
    };
    await ref.set(payload, { merge: true });
    await backendContext.writeAuditLog("engagementClubSwimmer.statusChanged", context.uid, {
      swimmerId,
      clubId: backendContext.cleanText(snapshot.data()?.clubId).slice(0, 40),
      active
    });
    const updated = await ref.get();
    return {
      ok: true,
      swimmer: backendContext.engagementNewSwimmerItem(updated)
    };
  }

  return { setEngagementNationalClubSwimmerStatus };
}

module.exports = { createNationalHandlers_setEngagementNationalClubSwimmerStatus };
