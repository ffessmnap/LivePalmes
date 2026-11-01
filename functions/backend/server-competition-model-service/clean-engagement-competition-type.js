// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionModelService_cleanEngagementCompetitionType(backendContext) {
  function cleanEngagementCompetitionType(value) {
    const type = backendContext.cleanText(value);
    return backendContext.ENGAGEMENT_COMPETITION_TYPES.has(type) ? type : "pool";
  }

  return { cleanEngagementCompetitionType };
}

module.exports = { createCompetitionModelService_cleanEngagementCompetitionType };
