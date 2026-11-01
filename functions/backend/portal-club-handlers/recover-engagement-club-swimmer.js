// Existing operation bodies; live services arrive through explicit accessors.
function createClubHandlers_recoverEngagementClubSwimmer(backendContext) {
  async function recoverEngagementClubSwimmer(request) {
    const startedAt = Date.now();
    const context = await backendContext.engagementClubAccessContext(request);
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        return await require("../../nap-swimmer-recovery").recoverSwimmer(require("../../nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{
          clubId:String(context.clubId),actorUid:context.uid,licenseNumber:backendContext.cleanText(request.data?.licenseNumber).toUpperCase(),mutationId:request.data?.mutationId,expectedFingerprint:request.data?.expectedFingerprint
        },{
          read:async operation=>{const snapshot=await backendContext.db.collection("auditLogs").doc(`nap-swimmer-recovery-${operation}-before`).get();return snapshot.exists?snapshot.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-swimmer-recovery-${operation}-before`).create({action:"nap.swimmer.recovery.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          complete:(operation,target)=>backendContext.writeAuditLogOnce("engagementClubSwimmer.recovered",context.uid,{...target,auditPreparationId:`nap-swimmer-recovery-${operation}-before`},operation)
        },scope=>{if(scope.clubId!==String(context.clubId)) throw new backendContext.HttpsError("permission-denied","Nageur hors club.");});
      } catch(error) {
        if(error instanceof backendContext.HttpsError) throw error;
        throw new backendContext.HttpsError(error instanceof TypeError || error instanceof RangeError?"failed-precondition":"unavailable",error instanceof TypeError || error instanceof RangeError?error.message:"Recuperation NAP a verifier. Reprenez la meme action ; la sauvegarde est conservee.");
      }
    }
    const preview = await backendContext.engagementSwimmerRecoveryPreview(backendContext.db, request.data?.licenseNumber, context);
    if (!preview.found) throw new backendContext.HttpsError("not-found", "Nageur introuvable dans la base.");
    if (preview.sameClub) throw new backendContext.HttpsError("already-exists", "Ce nageur est deja connu dans votre club.");
    if (!preview.eligible) {
      throw new backendContext.HttpsError("failed-precondition", "Ce nageur a deja un resultat publie cette saison. Son changement de club necessite une derogation nationale.");
    }

    const now = new Date().toISOString();
    const previousSwimmer = preview.swimmer || {};
    const swimmer = backendContext.cleanEngagementNewSwimmer({
      ...previousSwimmer,
      licenseNumber: request.data?.licenseNumber
    }, context);
    const swimmerId = preview.engagementSwimmerId || backendContext.stableHash([
      context.clubId,
      swimmer.identityKey || swimmer.name,
      swimmer.licenseNumber
    ].join("|")).slice(0, 40);
    const swimmerRef = backendContext.db.collection("engagementClubSwimmers").doc(swimmerId);
    const licensePayload = {
      ...backendContext.engagementSwimmerLicensePayload({ ...swimmer, swimmerIndexId: swimmerId }, context, {
        type: "club-recovery",
        competitionId: backendContext.cleanText(request.data?.competitionId).slice(0, 128),
        collectedAt: now
      }),
      updatedAt: now,
      updatedBy: context.uid
    };
    const batch = backendContext.db.batch();
    if (preview.engagementSwimmerId) {
      backendContext.deleteEngagementClubRosterSwimmer(batch, backendContext.db, {
        ...previousSwimmer,
        swimmerIndexId: swimmerId,
        source: "engagement"
      }, now);
    }
    const payload = {
      ...swimmer,
      source: "engagement",
      clubActivityStatus: "active",
      clubActivityStatusSource: "club-recovery",
      clubActivityStatusUpdatedAt: now,
      clubActivityStatusUpdatedBy: context.uid,
      updatedAt: now,
      updatedBy: context.uid,
      ...(preview.engagementSwimmerId ? {} : { createdAt: now, createdBy: context.uid })
    };
    batch.set(swimmerRef, payload, { merge: true });
    batch.set(backendContext.db.collection("engagementSwimmerLicenses").doc(backendContext.engagementSwimmerLicenseId({ ...swimmer, swimmerIndexId: swimmerId })), licensePayload, { merge: true });
    preview.licenseRecordIds
      .filter((id) => id !== backendContext.engagementSwimmerLicenseId({ ...swimmer, swimmerIndexId: swimmerId }))
      .forEach((id) => batch.delete(backendContext.db.collection("engagementSwimmerLicenses").doc(id)));
    const licenseNumberRefId = backendContext.engagementSwimmerLicenseNumberId(swimmer.licenseNumber);
    if (licenseNumberRefId) {
      batch.set(backendContext.db.collection(backendContext.ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION).doc(licenseNumberRefId), {
        ...licensePayload,
        swimmerIndexId: swimmerId,
        licenseKey: backendContext.engagementSwimmerLicenseNumberKey(swimmer.licenseNumber)
      }, { merge: true });
    }
    backendContext.upsertEngagementClubRosterSwimmer(batch, backendContext.db, { ...payload, id: swimmerId, swimmerIndexId: swimmerId }, now);
    const transferAlertRef = backendContext.db.collection("engagementSwimmerAlerts").doc(backendContext.stableHash([
      "club-change",
      swimmer.licenseNumber,
      preview.season.label,
      previousSwimmer.clubId,
      context.clubId
    ].join("|")).slice(0, 40));
    batch.set(transferAlertRef, {
      type: "club-change",
      status: "confirmed-by-club",
      swimmerIndexId: swimmerId,
      identityKey: swimmer.identityKey,
      licenseNumber: swimmer.licenseNumber,
      name: swimmer.name,
      fromClubId: backendContext.cleanText(previousSwimmer.clubId),
      fromClubName: backendContext.cleanText(previousSwimmer.clubName),
      clubId: context.clubId,
      clubName: context.clubName,
      seasonLabel: preview.season.label,
      reason: "no-published-result-this-season",
      confirmedAt: now,
      confirmedBy: context.uid,
      updatedAt: now
    }, { merge: true });
    await batch.commit();
    await backendContext.writeAuditLog("engagementClubSwimmer.recovered", context.uid, {
      swimmerId,
      licenseNumber: swimmer.licenseNumber,
      fromClubId: backendContext.cleanText(previousSwimmer.clubId),
      toClubId: context.clubId,
      seasonLabel: preview.season.label,
      publishedResult: false
    });
    const updated = await swimmerRef.get();
    return {
      ok: true,
      swimmer: backendContext.engagementNewSwimmerItem(updated),
      readStats: backendContext.portalReadStats("recoverEngagementClubSwimmer", startedAt, {
        baseDocuments: 2,
        variableDocumentsMax: 8,
        cacheHit: false
      })
    };
  }

  return { recoverEngagementClubSwimmer };
}

module.exports = { createClubHandlers_recoverEngagementClubSwimmer };
