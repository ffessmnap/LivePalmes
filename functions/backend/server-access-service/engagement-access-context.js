// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_engagementAccessContext(backendContext) {
  async function engagementAccessContext(request) {
    const uid = request.auth?.uid || "";
    if (!uid) {
      throw new backendContext.HttpsError("unauthenticated", "Connexion Firebase requise.");
    }
    if (backendContext.ADMIN_UIDS.has(uid) || backendContext.FUNCTIONS_EMULATOR_ACTIVE) {
      return {
        uid,
        email: backendContext.cleanText(request.auth?.token?.email).slice(0, 180),
        national: true,
        region: true,
        regionId: "",
        competitionNotificationsEnabled: true
      };
    }
    const snapshot = await backendContext.db.collection("users").doc(uid).get();
    const data = snapshot.exists ? snapshot.data() || {} : {};
    if (!snapshot.exists || data.status !== "active") {
      throw new backendContext.HttpsError("permission-denied", "Acces LivePalmes desactive.");
    }
    const capabilities = data.capabilities || request.auth?.token?.livepalmesCapabilities || {};
    const accessScopes = data.accessScopes || {};
    const national = capabilities["engagements.national.manage"] === true;
    const region = capabilities["engagements.region.manage"] === true;
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
