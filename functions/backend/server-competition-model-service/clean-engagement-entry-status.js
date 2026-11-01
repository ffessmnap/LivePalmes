// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionModelService_cleanEngagementEntryStatus(backendContext) {
  function cleanEngagementEntryStatus(value) {
    const status = backendContext.cleanText(value);
    return backendContext.ENGAGEMENT_ENTRY_STATUSES.has(status) ? status : "upcoming";
  }

  return { cleanEngagementEntryStatus };
}

module.exports = { createCompetitionModelService_cleanEngagementEntryStatus };
