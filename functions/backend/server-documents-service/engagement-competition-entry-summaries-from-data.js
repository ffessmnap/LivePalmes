// Existing operation bodies; live services arrive through explicit accessors.
function createDocumentsService_engagementCompetitionEntrySummariesFromData(backendContext) {
  function engagementCompetitionEntrySummariesFromData(data = {}) {
    const entries = data.entries && typeof data.entries === "object" ? data.entries : {};
    return Object.values(entries)
      .map(backendContext.local$engagementCompetitionEntrySummaryItem)
      .filter((entry) => entry.clubId && backendContext.engagementClubEntryHasParticipants(entry))
      .sort((left, right) => backendContext.cleanText(left.clubName).localeCompare(backendContext.cleanText(right.clubName), "fr"));
  }

  return { engagementCompetitionEntrySummariesFromData };
}

module.exports = { createDocumentsService_engagementCompetitionEntrySummariesFromData };
