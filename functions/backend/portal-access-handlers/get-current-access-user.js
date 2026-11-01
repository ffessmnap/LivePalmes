// Existing operation bodies; live services arrive through explicit accessors.
function createAccessHandlers_getCurrentAccessUser(backendContext) {
  async function getCurrentAccessUser(request) {
    const startedAt = Date.now();
    const uid = backendContext.cleanText(request.auth?.uid);
    if (!uid) {
      throw new backendContext.HttpsError("unauthenticated", "Connexion Firebase requise.");
    }
    const snapshot = await backendContext.db.collection("users").doc(uid).get();
    const data = snapshot.exists ? snapshot.data() || {} : {};
    const authTimeSeconds = Number(request.auth?.token?.auth_time) || 0;
    const lastLoginAt = authTimeSeconds ? new Date(authTimeSeconds * 1000).toISOString() : (data.lastLoginAt || "");
    if (snapshot.exists && lastLoginAt && lastLoginAt !== data.lastLoginAt) {
      await snapshot.ref.set({ lastLoginAt }, { merge: true }).catch((error) => {
        console.warn("Mise a jour de la derniere connexion impossible", error);
      });
    }
    if (backendContext.ADMIN_UIDS.has(uid) || backendContext.FUNCTIONS_EMULATOR_ACTIVE) {
      return {
        ok: true,
        uid,
        email: data.email || request.auth?.token?.email || "",
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        clubId: data.clubId || "",
        clubName: data.clubName || "",
        regionId: data.regionId || "",
        licenseNumber: data.licenseNumber || "",
        status: "active",
        capabilities: backendContext.ACCESS_CAPABILITIES,
        accessScopes: data.accessScopes || {},
        competitionNotificationsEnabled: backendContext.competitionEmailNotificationsEnabled(data),
        lastLoginAt,
        readStats: backendContext.portalReadStats("getCurrentAccessUser", startedAt, { baseDocuments: 1, cacheHit: false })
      };
    }
    if (!snapshot.exists) {
      throw new backendContext.HttpsError("permission-denied", "Aucun acces LivePalmes actif.");
    }
    if (data.status !== "active") {
      throw new backendContext.HttpsError("permission-denied", "Acces LivePalmes desactive.");
    }
    const capabilities = backendContext.activeCapabilitiesFromMap(data.capabilities || {});
    if (!capabilities.length) {
      throw new backendContext.HttpsError("permission-denied", "Aucun droit LivePalmes actif.");
    }
    return {
      ok: true,
      uid,
      email: data.email || request.auth?.token?.email || "",
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      clubId: data.clubId || "",
      clubName: data.clubName || "",
      regionId: data.regionId || "",
      licenseNumber: data.licenseNumber || "",
      status: "active",
      capabilities,
      accessScopes: data.accessScopes || {},
      competitionNotificationsEnabled: backendContext.competitionEmailNotificationsEnabled(data),
      lastLoginAt,
      readStats: backendContext.portalReadStats("getCurrentAccessUser", startedAt, { baseDocuments: 1, cacheHit: false })
    };
  }

  return { getCurrentAccessUser };
}

module.exports = { createAccessHandlers_getCurrentAccessUser };
