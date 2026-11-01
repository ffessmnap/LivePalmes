// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_engagementClubRosterSwimmerKey(backendContext) {
  function engagementClubRosterSwimmerKey(swimmer = {}) {
    return backendContext.stableHash([
      backendContext.cleanText(swimmer.source || "performances"),
      backendContext.cleanText(swimmer.swimmerIndexId || swimmer.id || swimmer.swimmerId || swimmer.identityKey)
    ].filter(Boolean).join("|")).slice(0, 40);
  }

  return { engagementClubRosterSwimmerKey };
}

module.exports = { createEntryModelService_engagementClubRosterSwimmerKey };
