// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionModelService_cleanEngagementCompetitionLevel(backendContext) {
  function cleanEngagementCompetitionLevel(value) {
    const level = backendContext.cleanText(value);
    return backendContext.ENGAGEMENT_COMPETITION_LEVELS.has(level) ? level : "regional";
  }

  function isNationalOnlyEngagementCompetitionLevel(value) {
    return ["national", "international"].includes(cleanEngagementCompetitionLevel(value));
  }

  return { cleanEngagementCompetitionLevel, isNationalOnlyEngagementCompetitionLevel };
}

module.exports = { createCompetitionModelService_cleanEngagementCompetitionLevel };
