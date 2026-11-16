// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_engagementAccessContext(backendContext) {
  async function engagementAccessContext(request) {
    const uid = request.auth?.uid || "";
    const { snapshot, data } = await require("../../current-access-profile").readCurrentAccessProfile(request, { db: backendContext.db, HttpsError: backendContext.HttpsError });
    if (!snapshot.exists || data.status !== "active") {
      throw new backendContext.HttpsError("permission-denied", "Acces LivePalmes desactive.");
    }
    const capabilities = data.capabilities;
    const accessScopes = data.accessScopes || {};
    const legacyAdmin = backendContext.ADMIN_UIDS.has(uid) && capabilities["admin.full"] === true;
    const national = legacyAdmin || capabilities["engagements.national.manage"] === true;
    const region = legacyAdmin || capabilities["engagements.region.manage"] === true;
    const regionScope = (0, backendContext.local$normalizedAccessScope)(accessScopes["engagements.region.manage"]);
    return {
      uid,
      email: backendContext.cleanText(request.auth?.token?.email || data.email).slice(0, 180),
      national,
      region,
      regionId: regionScope.scopeId || backendContext.cleanText(data.regionId).slice(0, 80),
      competitionNotificationsEnabled: (0, backendContext.local$competitionEmailNotificationsEnabled)(data)
    };
  }

  return { engagementAccessContext };
}

module.exports = { createAccessService_engagementAccessContext };
