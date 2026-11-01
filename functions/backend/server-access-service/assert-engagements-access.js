// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_assertEngagementsAccess(backendContext) {
  function hasEngagementsCapability(capabilities = {}) {
    return capabilities["engagements.club.manage"] === true ||
      capabilities["engagements.region.manage"] === true ||
      capabilities["engagements.national.manage"] === true;
  }

  async function assertEngagementsAccess(request) {
    const uid = request.auth?.uid || "";
    if (!uid) {
      throw new backendContext.HttpsError("unauthenticated", "Connexion Firebase requise.");
    }
    if (backendContext.ADMIN_UIDS.has(uid)) return;
    const tokenCapabilities = request.auth?.token?.livepalmesCapabilities || {};
    if (request.auth?.token?.livepalmesAccess === true && hasEngagementsCapability(tokenCapabilities)) return;

    const snapshot = await backendContext.db.collection("users").doc(uid).get();
    const data = snapshot.exists ? snapshot.data() || {} : {};
    if (!snapshot.exists || data.status !== "active" || !hasEngagementsCapability(data.capabilities || {})) {
      throw new backendContext.HttpsError("permission-denied", "Droit engagements requis.");
    }
  }

  return { hasEngagementsCapability, assertEngagementsAccess };
}

module.exports = { createAccessService_assertEngagementsAccess };
