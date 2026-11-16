// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_accessManagementContext(backendContext) {
  async function accessManagementContext(request) {
    const uid = request.auth?.uid || "";
    const { snapshot, data } = await require("../../current-access-profile").readCurrentAccessProfile(request, { db: backendContext.db, HttpsError: backendContext.HttpsError });
    if (!snapshot.exists || data.status !== "active") {
      throw new backendContext.HttpsError("permission-denied", "Acces LivePalmes desactive.");
    }
    const capabilities = data.capabilities;
    const accessScopes = data.accessScopes || {};
    const adminFull = capabilities["admin.full"] === true;
    const national = adminFull || capabilities["engagements.national.manage"] === true;
    const region = adminFull || capabilities["engagements.region.manage"] === true;
    if (!national && !region) {
      throw new backendContext.HttpsError("permission-denied", "Droit de gestion des acces requis.");
    }
    const regionScope = (0, backendContext.local$normalizedAccessScope)(accessScopes["engagements.region.manage"]);
    return {
      uid,
      email: backendContext.cleanText(request.auth?.token?.email || data.email).slice(0, 180),
      adminFull,
      national,
      region,
      regionId: (0, backendContext.local$canonicalAccessDirectoryRegionId)(regionScope.scopeId || data.regionId)
    };
  }

  return { accessManagementContext };
}

module.exports = { createAccessService_accessManagementContext };
