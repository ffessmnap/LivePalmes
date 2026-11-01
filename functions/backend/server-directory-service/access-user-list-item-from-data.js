// Existing operation bodies; live services arrive through explicit accessors.
function createDirectoryService_accessUserListItemFromData(backendContext) {
  function accessUserListItemFromData(uid, data = {}) {
    return {
      uid,
      email: data.email || "",
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      clubId: data.clubId || "",
      clubName: data.clubName || "",
      regionId: data.regionId || "",
      licenseNumber: data.licenseNumber || "",
      status: data.status || "active",
      capabilities: backendContext.activeCapabilitiesFromMap(data.capabilities || {}),
      accessScopes: data.accessScopes || {},
      updatedAt: data.updatedAt || "",
      lastLoginAt: data.lastLoginAt || ""
    };
  }

  return { accessUserListItemFromData };
}

module.exports = { createDirectoryService_accessUserListItemFromData };
