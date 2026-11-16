// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_assertEngagementsAccess(backendContext) {
  function hasEngagementsCapability(capabilities = {}) {
    return capabilities["engagements.club.manage"] === true ||
      capabilities["engagements.region.manage"] === true ||
      capabilities["engagements.national.manage"] === true;
  }

  async function assertEngagementsAccess(request) {
    const { snapshot, data } = await require("../../current-access-profile").readCurrentAccessProfile(request, { db: backendContext.db, HttpsError: backendContext.HttpsError });
    if (!hasEngagementsCapability(data.capabilities) && !(backendContext.ADMIN_UIDS.has(request.auth.uid) && data.capabilities["admin.full"] === true)) {
      throw new backendContext.HttpsError("permission-denied", "Droit engagements requis.");
    }
  }

  return { hasEngagementsCapability, assertEngagementsAccess };
}

module.exports = { createAccessService_assertEngagementsAccess };
