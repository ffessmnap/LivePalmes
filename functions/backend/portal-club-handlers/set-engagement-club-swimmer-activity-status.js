// Existing operation bodies; live services arrive through explicit accessors.
function createClubHandlers_setEngagementClubSwimmerActivityStatus(backendContext) {
  async function setEngagementClubSwimmerActivityStatus(request) {
    const startedAt = Date.now();
    const context = await backendContext.engagementClubAccessContext(request);
    const swimmerIndexId = backendContext.cleanText(request.data?.swimmerIndexId).slice(0, 80);
    const source = backendContext.cleanText(request.data?.source || "performances").slice(0, 40) || "performances";
    const status = backendContext.cleanEngagementClubActivityStatus(request.data?.status, "");
    if (!swimmerIndexId || !status) {
      throw new backendContext.HttpsError("invalid-argument", "Nageur et statut actif ou inactif requis.");
    }
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        const result=await require("../../nap-swimmer-activity").change(require("../../nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD), {
          id:swimmerIndexId,clubId:String(context.clubId),actorUid:context.uid,status,expectedFingerprint:request.data?.expectedFingerprint
        }, {
          read:async operation=>{const doc=await backendContext.db.collection("auditLogs").doc(`nap-swimmer-activity-${operation}-before`).get();return doc.exists?doc.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-swimmer-activity-${operation}-before`).create({action:"nap.swimmerActivity.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          complete:(operation,target)=>backendContext.writeAuditLogOnce("nap.swimmerActivity.complete",context.uid,{...target,auditPreparationId:`nap-swimmer-activity-${operation}-before`},`nap-swimmer-activity-${operation}-complete`)
        });
        return result;
      } catch(error) { throw new backendContext.HttpsError(error instanceof TypeError?"failed-precondition":"unavailable",error instanceof TypeError?error.message:"Statut NAP a verifier. Rechargez la fiche avant de reessayer."); }
    }
    const rosterRef = backendContext.engagementClubRosterRef(backendContext.db, context.clubId);
    const snapshot = await rosterRef.get();
    if (!snapshot.exists) throw new backendContext.HttpsError("not-found", "Effectif du club introuvable.");
    const data = snapshot.data() || {};
    const entries = data.swimmers && typeof data.swimmers === "object" ? data.swimmers : {};
    const match = Object.entries(entries).find(([, swimmer]) =>
      backendContext.cleanText(swimmer?.swimmerIndexId || swimmer?.id) === swimmerIndexId &&
      backendContext.cleanText(swimmer?.source || "performances") === source
    );
    if (!match) throw new backendContext.HttpsError("not-found", "Nageur introuvable dans l'effectif du club.");
    const [key, swimmer] = match;
    const now = new Date().toISOString();
    const updated = backendContext.engagementClubRosterSwimmerItem({
      ...swimmer,
      clubActivityStatus: status,
      clubActivityStatusSource: "club",
      clubActivityStatusUpdatedAt: now,
      clubActivityStatusUpdatedBy: context.uid
    });
    await rosterRef.set({
      updatedAt: now,
      swimmers: { [key]: updated }
    }, { merge: true });
    await backendContext.writeAuditLog("engagementClubSwimmer.activityStatusUpdated", context.uid, {
      clubId: context.clubId,
      swimmerIndexId,
      swimmerId: backendContext.cleanText(updated.swimmerId),
      source,
      status
    });
    return {
      ok: true,
      swimmer: updated,
      readStats: backendContext.portalReadStats("setEngagementClubSwimmerActivityStatus", startedAt, {
        baseDocuments: 3,
        variableDocumentsMax: 0,
        cacheHit: true
      })
    };
  }

  return { setEngagementClubSwimmerActivityStatus };
}

module.exports = { createClubHandlers_setEngagementClubSwimmerActivityStatus };
