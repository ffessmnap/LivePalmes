// Existing operation bodies; live services arrive through explicit accessors.
function createNationalService_engagementNationalSwimmerFullName(backendContext) {
  function engagementNationalSwimmerFullName(swimmer = {}) {
    return [swimmer.firstName, swimmer.lastName].filter(Boolean).join(" ") || swimmer.name || swimmer.licenseNumber || swimmer.id || "Nageur";
  }

  return { engagementNationalSwimmerFullName };
}

module.exports = { createNationalService_engagementNationalSwimmerFullName };
