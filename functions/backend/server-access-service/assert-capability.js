// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_assertCapability(backendContext) {
  function assertCapability(request, capability) {
    const uid = request.auth?.uid || "";
    const capabilities = request.auth?.token?.livepalmesCapabilities || {};
    const explicitCapabilityRequired = capability === "dtn.view" || capability.startsWith("engagements.");
    const adminFallbackAllowed = !explicitCapabilityRequired && capabilities["admin.full"] === true;
    if (!backendContext.ADMIN_UIDS.has(uid) && !adminFallbackAllowed && capabilities[capability] !== true) {
      throw new backendContext.HttpsError("permission-denied", "Droit LivePalmes requis.");
    }
  }

  return { assertCapability };
}

module.exports = { createAccessService_assertCapability };
