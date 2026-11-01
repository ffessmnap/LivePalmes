// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_cleanEngagementEntryOfficial(backendContext) {
  function cleanEngagementEntryOfficial(raw = {}) {
    return {
      personId: backendContext.cleanText(raw.personId).slice(0, 80),
      firstName: backendContext.cleanText(raw.firstName).slice(0, 80),
      lastName: backendContext.cleanText(raw.lastName).slice(0, 80),
      birthDate: backendContext.cleanIsoDate(raw.birthDate),
      licenseNumber: backendContext.cleanText(raw.licenseNumber).slice(0, 60)
    };
  }

  return { cleanEngagementEntryOfficial };
}

module.exports = { createEntryModelService_cleanEngagementEntryOfficial };
