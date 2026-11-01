// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_engagementClubRosterSwimmersFromData(backendContext) {
  function engagementClubRosterSwimmersFromData(data = {}) {
    const swimmers = data.swimmers && typeof data.swimmers === "object" ? data.swimmers : {};
    return Object.values(swimmers)
      .map((swimmer) => (0, backendContext.local$engagementClubRosterSwimmerItem)(swimmer))
      .filter((swimmer) => swimmer.swimmerIndexId && swimmer.active !== false);
  }

  return { engagementClubRosterSwimmersFromData };
}

module.exports = { createEntryModelService_engagementClubRosterSwimmersFromData };
