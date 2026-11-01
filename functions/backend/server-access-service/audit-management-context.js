// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_auditManagementContext(backendContext) {
  async function auditManagementContext(request) {
    const uid = request.auth?.uid || "";
    if (!uid) {
      throw new backendContext.HttpsError("unauthenticated", "Connexion Firebase requise.");
    }
    const tokenCapabilities = request.auth?.token?.livepalmesCapabilities || {};
    if (backendContext.ADMIN_UIDS.has(uid) || backendContext.FUNCTIONS_EMULATOR_ACTIVE || tokenCapabilities["admin.full"] === true) {
      return { uid, adminFull: true, profileReadCount: 0 };
    }
    const snapshot = await backendContext.db.collection("users").doc(uid).get();
    const data = snapshot.exists ? snapshot.data() || {} : {};
    if (!snapshot.exists || data.status !== "active" || data.capabilities?.["admin.full"] !== true) {
      throw new backendContext.HttpsError("permission-denied", "Journal reserve a la gestion generale.");
    }
    return { uid, adminFull: true, profileReadCount: 1 };
  }

  return { auditManagementContext };
}

module.exports = { createAccessService_auditManagementContext };
