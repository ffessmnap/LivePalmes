// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_assertCapability(backendContext) {
  async function assertCapability(request, capability) {
    const { data } = await require("../../current-access-profile").readCurrentAccessProfile(request, { db: backendContext.db, HttpsError: backendContext.HttpsError });
    const capabilities = data.capabilities;
    const explicitCapabilityRequired = capability === "dtn.view" || capability.startsWith("engagements.");
    const adminFallbackAllowed = !explicitCapabilityRequired && capabilities["admin.full"] === true;
    const legacyAdmin = backendContext.ADMIN_UIDS.has(request.auth.uid) && capabilities["admin.full"] === true;
    if (!legacyAdmin && !adminFallbackAllowed && capabilities[capability] !== true) {
      throw new backendContext.HttpsError("permission-denied", "Droit LivePalmes requis.");
    }
    return data;
  }

  return { assertCapability };
}

module.exports = { createAccessService_assertCapability };
