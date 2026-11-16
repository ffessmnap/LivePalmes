// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_assertAdmin(backendContext) {
  async function assertAdmin(request) {
    const { data } = await require("../../current-access-profile").readCurrentAccessProfile(request, { db: backendContext.db, HttpsError: backendContext.HttpsError });
    if (data.capabilities["admin.full"] !== true) {
      throw new backendContext.HttpsError("permission-denied", "Admin LivePalmes requis.");
    }
    return data;
  }

  return { assertAdmin };
}

module.exports = { createAccessService_assertAdmin };
