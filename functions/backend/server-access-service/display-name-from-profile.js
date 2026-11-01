// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_displayNameFromProfile(backendContext) {
  function displayNameFromProfile(profile = {}) {
    return [backendContext.cleanText(profile.firstName), backendContext.cleanText(profile.lastName)].filter(Boolean).join(" ");
  }

  return { displayNameFromProfile };
}

module.exports = { createAccessService_displayNameFromProfile };
