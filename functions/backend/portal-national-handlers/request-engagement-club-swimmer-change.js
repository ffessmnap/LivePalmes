// Existing operation bodies; live services arrive through explicit accessors.
function createNationalHandlers_requestEngagementClubSwimmerChange(backendContext) {
  async function requestEngagementClubSwimmerChange(request) {
    const context = await backendContext.engagementClubAccessContext(request);
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        const nap = require("../../nap-portal-swimmers");
        if(request.data?.nsAction!==undefined)return await require("../../nap-swimmer-ns-callables").club(backendContext,context,request.data);
        if(request.data?.completeLicense===true) return await require("../../nap-club-license-fill").fillClubLicense(nap.portalPool(process.env.LIVEPALMES_NAP_PASSWORD),request.data,context,{
          read:async operation=>{const snapshot=await backendContext.db.collection("auditLogs").doc(`nap-club-license-${operation}-before`).get();return snapshot.exists?snapshot.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-club-license-${operation}-before`).create({action:"nap.club.license.fill.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          complete:(operation,target)=>backendContext.writeAuditLogOnce("nap.club.license.filled",context.uid,{...target,auditPreparationId:`nap-club-license-${operation}-before`},operation)
        });
        const requestHelper=request.data?.personId ? require("../../nap-person-change-requests") : require("../../nap-swimmer-change-requests");
        const proposal = await requestHelper.prepareRequest(nap.portalPool(process.env.LIVEPALMES_NAP_PASSWORD), request.data, context);
        const requestId = backendContext.stableHash([proposal.requestType === "person-change" ? "nap-person" : "nap", proposal.targetSwimmerId, context.clubId].join("|")).slice(0, 40);
        const ref = backendContext.db.collection(backendContext.ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION).doc(requestId);
        const now = new Date().toISOString();
        const payload = { ...proposal, id: requestId, requestType: proposal.requestType || "swimmer-change", status: "pending",
          clubId: context.clubId, clubName: context.clubName, regionId: context.regionId,
          requestedAt: now, requestedBy: context.uid, requestedByEmail: context.email || "",
          requestedByFirstName: context.firstName || "", requestedByLastName: context.lastName || "",
          updatedAt: now, updatedBy: context.uid };
        await backendContext.db.runTransaction(async transaction => {
          const existing = await transaction.get(ref);
          if (existing.exists && existing.data()?.status === "pending") throw new backendContext.HttpsError("already-exists", "Une demande de correction est deja en attente pour ce nageur.");
          transaction.set(ref, backendContext.cleanFirestoreValue(payload), { merge: false });
        }, { maxAttempts: 3 });
        await backendContext.writeAuditLogOnce("nap.swimmer.changeRequested", context.uid, { requestId, swimmerId: proposal.targetSwimmerId, clubId: context.clubId }, `${requestId}-${now}`);
        return { ok: true, request: backendContext.engagementSwimmerChangeRequestItem({ id: requestId, data: () => payload }) };
      } catch (error) {
        if (error instanceof backendContext.HttpsError) throw error;
        throw new backendContext.HttpsError(error instanceof TypeError ? "failed-precondition" : "unavailable", error instanceof TypeError ? error.message : "Demande NAP indisponible. Rechargez les demandes avant de recommencer.");
      }
    }
    const requestedSource = backendContext.cleanText(request.data?.source).slice(0, 40);
    const requestedSwimmerId = backendContext.cleanText(request.data?.swimmerId).slice(0, 80);
    const target = await backendContext.getEngagementSwimmerCorrectionTarget(
      backendContext.db,
      requestedSource,
      requestedSwimmerId,
      backendContext.cleanText(request.data?.identityKey).slice(0, 180)
    );
    const current = backendContext.engagementSwimmerIdentitySnapshot(target.swimmer, target.source);
    if (!current.clubId || current.clubId !== context.clubId) {
      throw new backendContext.HttpsError("permission-denied", "Nageur hors perimetre club.");
    }
    const correction = backendContext.cleanEngagementSwimmerIdentityCorrection(request.data?.proposed || {}, current);
    const reason = backendContext.cleanText(request.data?.reason).slice(0, 500);
    if (!reason) throw new backendContext.HttpsError("invalid-argument", "Le motif de la demande est obligatoire.");
    const requestId = backendContext.stableHash([target.requestedSource, target.requestedSwimmerId, context.clubId].join("|")).slice(0, 40);
    const ref = backendContext.db.collection(backendContext.ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION).doc(requestId);
    const existing = await ref.get();
    if (existing.exists && backendContext.cleanText(existing.data()?.status) === "pending") {
      throw new backendContext.HttpsError("already-exists", "Une demande de correction est deja en attente pour ce nageur.");
    }
    const now = new Date().toISOString();
    const proposed = backendContext.engagementSwimmerIdentitySnapshot({ ...current, ...correction }, target.source);
    const payload = {
      id: requestId,
      requestType: "swimmer-change",
      status: "pending",
      requestedSource: target.requestedSource,
      requestedSwimmerId: target.requestedSwimmerId,
      targetSource: target.source,
      targetSwimmerId: target.swimmerId,
      current,
      proposed,
      reason,
      clubId: context.clubId,
      clubName: context.clubName,
      regionId: context.regionId,
      requestedAt: now,
      requestedBy: context.uid,
      requestedByEmail: context.email || "",
      requestedByFirstName: context.firstName || "",
      requestedByLastName: context.lastName || "",
      updatedAt: now,
      updatedBy: context.uid
    };
    const batch = backendContext.db.batch();
    batch.set(ref, payload, { merge: false });
    backendContext.setEngagementSwimmerChangeRequestRosterState(batch, target, "pending", requestId, now);
    await batch.commit();
    await backendContext.writeAuditLog("engagementClubSwimmer.changeRequested", context.uid, {
      requestId,
      swimmerId: target.swimmerId,
      source: target.source,
      clubId: context.clubId,
      reason,
      current,
      proposed
    });
    const created = await ref.get();
    return { ok: true, request: backendContext.engagementSwimmerChangeRequestItem(created) };
  }

  return { requestEngagementClubSwimmerChange };
}

module.exports = { createNationalHandlers_requestEngagementClubSwimmerChange };
