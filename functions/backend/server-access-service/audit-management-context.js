// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_auditManagementContext(backendContext) {
  async function auditManagementContext(request) {
    const uid = request.auth?.uid || "";
    const { snapshot, data } = await require("../../current-access-profile").readCurrentAccessProfile(request, { db: backendContext.db, HttpsError: backendContext.HttpsError });
    if (!snapshot.exists || data.status !== "active" || data.capabilities?.["admin.full"] !== true) {
      throw new backendContext.HttpsError("permission-denied", "Journal reserve a la gestion generale.");
    }
    return { uid, adminFull: true, profileReadCount: 1 };
  }

  return { auditManagementContext };
}

module.exports = { createAccessService_auditManagementContext };
