// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_engagementSwimmerLicenseId(backendContext) {
  function engagementSwimmerLicenseId(swimmer = {}) {
    const swimmerIndexId = backendContext.cleanText(swimmer.swimmerIndexId || swimmer.id);
    if (swimmerIndexId) return backendContext.stableHash(swimmerIndexId).slice(0, 40);
    return backendContext.stableHash([
      backendContext.cleanText(swimmer.swimmerId),
      backendContext.cleanText(swimmer.identityKey),
      backendContext.cleanText(swimmer.name)
    ].filter(Boolean).join("|")).slice(0, 40);
  }

  return { engagementSwimmerLicenseId };
}

module.exports = { createEntryModelService_engagementSwimmerLicenseId };
