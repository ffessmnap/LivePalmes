// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_engagementSwimmerIdentityKey(backendContext) {
  function engagementSwimmerIdentityKey(firstName, lastName, birthDate) {
    const first = backendContext.normalizePerformanceSearchText(firstName);
    const last = backendContext.normalizePerformanceSearchText(lastName);
    const birth = backendContext.cleanIsoDate(birthDate);
    return first && last && birth ? `${last}|${first}|${birth}` : "";
  }

  return { engagementSwimmerIdentityKey };
}

module.exports = { createEntryModelService_engagementSwimmerIdentityKey };
