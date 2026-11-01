// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_accessManagementContext(backendContext) {
  async function accessManagementContext(request) {
    const uid = request.auth?.uid || "";
    if (!uid) {
      throw new backendContext.HttpsError("unauthenticated", "Connexion Firebase requise.");
    }
    const tokenCapabilities = request.auth?.token?.livepalmesCapabilities || {};
    if (backendContext.ADMIN_UIDS.has(uid) || backendContext.FUNCTIONS_EMULATOR_ACTIVE || tokenCapabilities["admin.full"] === true) {
      return {
        uid,
        email: backendContext.cleanText(request.auth?.token?.email).slice(0, 180),
        adminFull: true,
        national: true,
        region: true,
        regionId: ""
      };
    }
    const snapshot = await backendContext.db.collection("users").doc(uid).get();
    const data = snapshot.exists ? snapshot.data() || {} : {};
    if (!snapshot.exists || data.status !== "active") {
      throw new backendContext.HttpsError("permission-denied", "Acces LivePalmes desactive.");
    }
    const capabilities = data.capabilities || tokenCapabilities || {};
    const accessScopes = data.accessScopes || {};
    const national = capabilities["engagements.national.manage"] === true;
    const region = capabilities["engagements.region.manage"] === true;
    if (!national && !region) {
      throw new backendContext.HttpsError("permission-denied", "Droit de gestion des acces requis.");
    }
    const regionScope = (0, backendContext.local$normalizedAccessScope)(accessScopes["engagements.region.manage"]);
    return {
      uid,
      email: backendContext.cleanText(request.auth?.token?.email || data.email).slice(0, 180),
      adminFull: false,
      national,
      region,
      regionId: (0, backendContext.local$canonicalAccessDirectoryRegionId)(regionScope.scopeId || data.regionId)
    };
  }

  return { accessManagementContext };
}

module.exports = { createAccessService_accessManagementContext };
