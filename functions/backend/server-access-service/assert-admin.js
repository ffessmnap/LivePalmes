// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_assertAdmin(backendContext) {
  function assertAdmin(request) {
    const uid = request.auth?.uid || "";
    const capabilities = request.auth?.token?.livepalmesCapabilities || {};
    if (!backendContext.ADMIN_UIDS.has(uid) && capabilities["admin.full"] !== true) {
      throw new backendContext.HttpsError("permission-denied", "Admin LivePalmes requis.");
    }
  }

  return { assertAdmin };
}

module.exports = { createAccessService_assertAdmin };
