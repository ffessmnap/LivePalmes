// Existing operation bodies; live services arrive through explicit accessors.
function createClubHandlers_createEngagementClubSwimmer(backendContext) {
  async function createEngagementClubSwimmer(request) {
    if(request.data?.importReview===true)return backendContext.importSwimmerCreation(request,true);
    const context = await backendContext.engagementClubAccessContext(request);
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        const input={clubId:String(context.clubId),actorUid:context.uid,swimmer:request.data?.swimmer,creationId:request.data?.creationId,confirmAlerts:request.data?.confirmAlerts};
        const authorize=scope=>{if(scope.clubId!==String(context.clubId)) throw new backendContext.HttpsError("permission-denied","Nageur hors club.");};
        const formatAlert=(match,type)=>backendContext.engagementNewSwimmerAlertFromMatch(match,{...context,clubId:String(context.clubId)},type);
        return await require("../../nap-swimmer-creation").createSwimmer(require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),input,{
          read:async operation=>{const doc=await backendContext.db.collection("auditLogs").doc(`nap-swimmer-create-${operation}-before`).get();return doc.exists?doc.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-swimmer-create-${operation}-before`).create({action:"nap.swimmerCreate.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          checkpoint:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-swimmer-create-${operation}-before`).update({target}),
          complete:(operation,target)=>backendContext.writeAuditLogOnce("nap.swimmerCreate.complete",context.uid,{...target,auditPreparationId:`nap-swimmer-create-${operation}-before`},`nap-swimmer-create-${operation}-complete`)
        },authorize,formatAlert);
      } catch(error) {
        if(error instanceof backendContext.HttpsError) throw error;
        throw new backendContext.HttpsError(error instanceof TypeError || error instanceof RangeError?"failed-precondition":"unavailable",error instanceof TypeError || error instanceof RangeError?error.message:"Creation NAP a verifier. Reprenez la meme action ; sauvegarde conservee.");
      }
    }
    const swimmer = backendContext.cleanEngagementNewSwimmer(request.data?.swimmer || {}, context);
    const now = new Date().toISOString();
    const docId = backendContext.stableHash([
      context.clubId,
      swimmer.identityKey || swimmer.name,
      swimmer.licenseNumber
    ].join("|")).slice(0, 40);
    const ref = backendContext.db.collection("engagementClubSwimmers").doc(docId);
    const snapshot = await ref.get();
    if (snapshot.exists && backendContext.cleanText(snapshot.data()?.clubId) !== context.clubId) {
      throw new backendContext.HttpsError("permission-denied", "Nageur hors perimetre club.");
    }
    if (snapshot.exists) {
      throw new backendContext.HttpsError("already-exists", "Un nageur avec cette licence existe deja pour ce club. Utilisez la fiche existante.");
    }
    await backendContext.assertNoEngagementSwimmerLicenseConflict(backendContext.db, swimmer);
    const alerts = await backendContext.buildEngagementNewSwimmerAlerts(swimmer, context);
    const blockingAlerts = alerts.filter((alert) => alert.type === "inverted-identity");
    if (blockingAlerts.length) {
      throw new backendContext.HttpsError("already-exists", "Un nageur existe deja avec le nom et le prenom inverses.", {
        alerts: blockingAlerts,
        blocksCreation: true
      });
    }
    const confirmAlerts = request.data?.confirmAlerts === true;
    if (alerts.length && !confirmAlerts) {
      throw new backendContext.HttpsError("failed-precondition", "Confirmation obligatoire avant creation du nageur.", {
        alerts,
        requiresConfirmation: true
      });
    }
    const season = backendContext.currentEngagementSeasonInfo(new Date(now));
    const payload = {
      ...swimmer,
      alerts,
      alertCount: alerts.length,
      alertValidationStatus: alerts.length ? "validated-by-club" : "",
      alertValidatedAt: alerts.length ? now : "",
      alertValidatedBy: alerts.length ? context.uid : "",
      seasonStartYear: season.startYear,
      seasonLabel: season.label,
      clubActivityStatus: "active",
      clubActivityStatusSource: "club-creation",
      clubActivityStatusUpdatedAt: now,
      clubActivityStatusUpdatedBy: context.uid,
      updatedAt: now,
      updatedBy: context.uid,
      ...(snapshot.exists ? {} : { createdAt: now, createdBy: context.uid })
    };
    const batch = backendContext.db.batch();
    batch.set(ref, payload, { merge: true });
    const licenseRef = backendContext.db.collection("engagementSwimmerLicenses").doc(backendContext.engagementSwimmerLicenseId({ ...swimmer, swimmerIndexId: docId }));
    const licensePayload = {
      ...backendContext.engagementSwimmerLicensePayload({ ...swimmer, swimmerIndexId: docId }, context, {
        competitionId: backendContext.cleanText(request.data?.competitionId).slice(0, 128),
        collectedAt: now
      }),
      updatedAt: now,
      updatedBy: context.uid
    };
    batch.set(licenseRef, licensePayload, { merge: true });
    const licenseNumberRefId = backendContext.engagementSwimmerLicenseNumberId(swimmer.licenseNumber);
    if (licenseNumberRefId) {
      batch.create(backendContext.db.collection(backendContext.ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION).doc(licenseNumberRefId), {
        ...licensePayload,
        swimmerIndexId: docId,
        licenseKey: backendContext.engagementSwimmerLicenseNumberKey(swimmer.licenseNumber),
        updatedAt: now,
        updatedBy: context.uid
      });
    }
    backendContext.upsertEngagementClubRosterSwimmer(batch, backendContext.db, { ...payload, id: docId, swimmerIndexId: docId, source: "engagement" }, now);
    alerts.forEach((alert, index) => {
      const alertRef = backendContext.db.collection("engagementSwimmerAlerts").doc(backendContext.stableHash(`${docId}|${alert.type}|${alert.swimmerIndexId || index}`).slice(0, 40));
      batch.set(alertRef, {
        ...alert,
        status: "validated-by-club",
        newSwimmerId: docId,
        clubId: context.clubId,
        clubName: context.clubName,
        regionId: context.regionId,
        seasonStartYear: season.startYear,
        seasonLabel: season.label,
        validatedAt: now,
        validatedBy: context.uid,
        createdAt: now,
        createdBy: context.uid
      }, { merge: true });
    });
    await batch.commit();
    await backendContext.writeAuditLog("engagementClubSwimmer.created", context.uid, {
      swimmerId: docId,
      clubId: context.clubId,
      alertCount: alerts.length,
      alertTypes: Array.from(new Set(alerts.map((alert) => backendContext.cleanText(alert.type)).filter(Boolean))),
      seasonStartYear: season.startYear,
      seasonLabel: season.label
    });
    const updated = await ref.get();
    return {
      ok: true,
      swimmer: backendContext.engagementNewSwimmerItem(updated),
      alerts
    };
  }

  return { createEngagementClubSwimmer };
}

module.exports = { createClubHandlers_createEngagementClubSwimmer };
