// Existing operation bodies; live services arrive through explicit accessors.
function createPerformanceHandlers_updateEngagementNationalSwimmerIdentity(backendContext) {
  async function updateEngagementNationalSwimmerIdentity(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national) throw new backendContext.HttpsError("permission-denied", "Correction reservee au niveau national.");
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap" && request.data?.napSource !== true) throw new backendContext.HttpsError("failed-precondition", "Rechargez la recherche NAP avant de corriger cette fiche.");
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap" && request.data?.napSource === true) {
      const nap = require("../../nap-portal-swimmers");
      try {
        const proposed = request.data.proposed || {};
        return await (proposed.clubId !== undefined || proposed.licenseNumber !== undefined ? require("../../nap-national-swimmer-correction").correctNationalSwimmer : nap.correctPortalIdentity)(nap.portalPool(process.env.LIVEPALMES_NAP_PASSWORD), {
          id: request.data.swimmerId, expectedFingerprint: request.data.expectedFingerprint, expectedLicenseNumber: request.data.expectedLicenseNumber, proposed,
          previewOnly: request.data.previewOnly===true, historicalClubConfirmation: request.data.historicalClubConfirmation,
          actorUid: context.uid, reason: backendContext.cleanText(request.data.reason)
        }, {
          read: async operation => {
            const snapshot = await backendContext.db.collection("auditLogs").doc(`nap-identity-${operation}-before`).get();
            return snapshot.exists ? snapshot.data().target : null;
          },
          prepare: (operation, target) => backendContext.db.collection("auditLogs").doc(`nap-identity-${operation}-before`).create({ action: "nap.swimmer.identityCorrection.prepare", actorUid: context.uid, target, createdAt: new Date().toISOString() }),
          complete: (operation, target) => backendContext.writeAuditLogOnce("nap.swimmer.identityCorrected", context.uid,{...target,auditPreparationId:`nap-identity-${operation}-before`}, operation)
        }, {
          prepare: async () => [],
          apply: async () => ({ entryUpdateCount: 0, relayUpdateCount: 0, oldLivepalmesLinksIgnored: true })
        });
      } catch (error) {
        throw new backendContext.HttpsError(error instanceof TypeError ? "failed-precondition" : error instanceof RangeError ? "resource-exhausted" : "unavailable", error instanceof TypeError || error instanceof RangeError ? error.message : "Correction a verifier. Rechargez la recherche ou reprenez la meme correction ; sa sauvegarde est conservee.");
      }
    }
    const target = await backendContext.getEngagementSwimmerCorrectionTarget(
      backendContext.db,
      request.data?.source,
      request.data?.swimmerId,
      request.data?.identityKey
    );
    const current = backendContext.engagementSwimmerIdentitySnapshot(target.swimmer, target.source);
    const correction = backendContext.cleanEngagementSwimmerIdentityCorrection(request.data?.proposed || {}, current);
    const reason = backendContext.cleanText(request.data?.reason).slice(0, 500);
    if (!reason) throw new backendContext.HttpsError("invalid-argument", "Le motif de la correction est obligatoire.");
    const now = new Date().toISOString();
    const result = await backendContext.applyEngagementSwimmerIdentityCorrection(target, correction, { ...context, now });
    await backendContext.writeAuditLog("engagementClubSwimmer.identityCorrected", context.uid, {
      swimmerId: target.swimmerId,
      source: target.source,
      reason,
      current,
      proposed: result.swimmer,
      performanceUpdateCount: Number(result.performanceUpdateCount || 0),
      entryUpdateCount: Number(result.entryUpdateCount || 0),
      relayUpdateCount: Number(result.relayUpdateCount || 0)
    });
    return { ok: true, ...result };
  }

  return { updateEngagementNationalSwimmerIdentity };
}

module.exports = { createPerformanceHandlers_updateEngagementNationalSwimmerIdentity };
