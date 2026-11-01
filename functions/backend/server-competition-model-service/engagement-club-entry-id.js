// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionModelService_engagementClubEntryId(backendContext) {
  function engagementClubEntryId(competitionId, clubId) {
    return `${backendContext.cleanText(competitionId).slice(0, 128)}_${backendContext.cleanText(clubId).slice(0, 40)}`;
  }

  return { engagementClubEntryId };
}

module.exports = { createCompetitionModelService_engagementClubEntryId };
