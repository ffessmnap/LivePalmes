// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_assertLivePalmesAccess(backendContext) {
  async function assertLivePalmesAccess(request) {
    const { snapshot, data } = await require("../../current-access-profile").readCurrentAccessProfile(request, { db: backendContext.db, HttpsError: backendContext.HttpsError });
    const activeCapabilities = (0, backendContext.local$activeCapabilitiesFromMap)(data.capabilities || {});
    if (!activeCapabilities.length) {
      throw new backendContext.HttpsError("permission-denied", "Acces LivePalmes requis.");
    }
    return data;
  }

  return { assertLivePalmesAccess };
}

module.exports = { createAccessService_assertLivePalmesAccess };
