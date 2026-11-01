// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_engagementCompetitionAppliesToFranceRecords(backendContext) {
  function engagementCompetitionAppliesToFranceRecords(competition = {}) {
    return backendContext.cleanEngagementPoolLength(competition.poolLength) === "50" &&
      backendContext.cleanEngagementTimingType(competition.timingType) === "electronic";
  }

  function engagementCompetitionAppliesToMpf(competition = {}) {
    const timingType = backendContext.cleanEngagementTimingType(competition.timingType);
    const poolLength = backendContext.cleanEngagementPoolLength(competition.poolLength);
    return timingType === "manual" || (timingType === "electronic" && poolLength !== "50");
  }

  return { engagementCompetitionAppliesToFranceRecords, engagementCompetitionAppliesToMpf };
}

module.exports = { createEntryModelService_engagementCompetitionAppliesToFranceRecords };
