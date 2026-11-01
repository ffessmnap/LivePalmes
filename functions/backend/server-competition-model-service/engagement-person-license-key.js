// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionModelService_engagementPersonLicenseKey(backendContext) {
  function engagementPersonLicenseKey(value) {
    return backendContext.cleanText(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  return { engagementPersonLicenseKey };
}

module.exports = { createCompetitionModelService_engagementPersonLicenseKey };
