// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_accessDirectoryKeys(backendContext) {
  function accessDirectoryKeys(profile = {}, status = profile.status || "active") {
    const cleanStatus = status === "inactive" ? "inactive" : "active";
    const capabilities = Array.isArray(profile.capabilities)
      ? profile.capabilities
      : (0, backendContext.local$activeCapabilitiesFromMap)(profile.capabilities || {});
    const regionId = (0, backendContext.local$accessUserRegionIdFromData)({
      ...profile,
      capabilities: (0, backendContext.local$capabilitiesMap)(capabilities)
    });
    const nationalAccount = capabilities.includes("admin.full") || capabilities.includes("engagements.national.manage");
    const keys = new Set(["all", `status:${cleanStatus}`]);
    capabilities.forEach((capability) => {
      keys.add(`capability:${capability}`);
      keys.add(`status:${cleanStatus}|capability:${capability}`);
    });
    if (regionId && !nationalAccount) {
      keys.add(`region:${regionId}`);
      keys.add(`region:${regionId}|status:${cleanStatus}`);
      capabilities.forEach((capability) => {
        keys.add(`region:${regionId}|capability:${capability}`);
        keys.add(`region:${regionId}|status:${cleanStatus}|capability:${capability}`);
      });
    }
    return [...keys];
  }

  return { accessDirectoryKeys };
}

module.exports = { createAccessService_accessDirectoryKeys };
