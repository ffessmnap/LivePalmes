// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_engagementSwimmerLicenseNumberKey(backendContext) {
  function engagementSwimmerLicenseNumberKey(licenseNumber = "") {
    return backendContext.cleanText(licenseNumber).toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  return { engagementSwimmerLicenseNumberKey };
}

module.exports = { createEntryModelService_engagementSwimmerLicenseNumberKey };
