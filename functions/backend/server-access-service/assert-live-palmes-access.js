// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_assertLivePalmesAccess(backendContext) {
  async function assertLivePalmesAccess(request) {
    const uid = request.auth?.uid || "";
    if (!uid) {
      throw new backendContext.HttpsError("unauthenticated", "Connexion Firebase requise.");
    }
    if (backendContext.ADMIN_UIDS.has(uid)) return;
    const capabilities = request.auth?.token?.livepalmesCapabilities || {};
    if (capabilities["admin.full"] === true || backendContext.ACCESS_CAPABILITIES.some((capability) => capabilities[capability] === true)) return;

    const snapshot = await backendContext.db.collection("users").doc(uid).get();
    const data = snapshot.exists ? snapshot.data() || {} : {};
    const activeCapabilities = (0, backendContext.local$activeCapabilitiesFromMap)(data.capabilities || {});
    if (!snapshot.exists || data.status !== "active" || !activeCapabilities.length) {
      throw new backendContext.HttpsError("permission-denied", "Acces LivePalmes requis.");
    }
  }

  return { assertLivePalmesAccess };
}

module.exports = { createAccessService_assertLivePalmesAccess };
