// Existing operation bodies; live services arrive through explicit accessors.
function createAccessHandlers_setAccessUserStatus(backendContext) {
  async function setAccessUserStatus(request) {
    backendContext.assertAdmin(request);
    const uid = backendContext.cleanText(request.data?.uid);
    const status = backendContext.cleanText(request.data?.status);
    if (!uid) {
      throw new backendContext.HttpsError("invalid-argument", "Utilisateur requis.");
    }
    if (!["active", "inactive"].includes(status)) {
      throw new backendContext.HttpsError("invalid-argument", "Statut invalide.");
    }
    if (uid === request.auth.uid && status === "inactive") {
      throw new backendContext.HttpsError("failed-precondition", "Tu ne peux pas desactiver ton propre acces.");
    }
    const userRef = backendContext.db.collection("users").doc(uid);
    const snapshot = await userRef.get();
    if (!snapshot.exists) {
      throw new backendContext.HttpsError("not-found", "Acces LivePalmes introuvable.");
    }
    const data = snapshot.data() || {};
    const capabilities = backendContext.activeCapabilitiesFromMap(data.capabilities || {});
    const accessScopes = data.accessScopes || {};
    const email = data.email || "";
    const now = new Date().toISOString();
    const authUser = await backendContext.auth.getUser(uid);
    await backendContext.auth.updateUser(uid, { disabled: status !== "active" });
    await backendContext.auth.setCustomUserClaims(uid, {
      ...(authUser.customClaims || {}),
      livepalmesAccess: status === "active",
      livepalmesConsoleAccess: status === "active" && backendContext.hasConsolePortalCapability(backendContext.capabilitiesMap(capabilities)),
      livepalmesCapabilities: status === "active" ? backendContext.capabilitiesMap(capabilities) : backendContext.capabilitiesMap([])
    });
    if (status !== "active") await backendContext.auth.revokeRefreshTokens(uid);
    await userRef.set({
      status,
      accessDirectoryKeys: backendContext.accessDirectoryKeys({ ...data, capabilities }, status),
      updatedAt: now,
      updatedBy: request.auth.uid
    }, { merge: true });
    await backendContext.writeAccessGrants(uid, email, capabilities, status, request.auth.uid, now, accessScopes);
    await backendContext.writeAuditLog(status === "active" ? "accessUser.activated" : "accessUser.deactivated", request.auth.uid, {
      uid,
      email,
      capabilities,
      accessScopes
    });
    return {
      ok: true,
      uid,
      status
    };
  }

  return { setAccessUserStatus };
}

module.exports = { createAccessHandlers_setAccessUserStatus };
