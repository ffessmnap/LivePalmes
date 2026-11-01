// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionModelService_cleanEngagementMissingEntryTimeMode(backendContext) {
  function cleanEngagementQualificationTimesMode(value) {
    const mode = backendContext.cleanText(value);
    return backendContext.ENGAGEMENT_QUALIFICATION_TIME_MODES.has(mode) ? mode : "all";
  }

  function cleanEngagementMissingEntryTimeMode(value) {
    const mode = backendContext.cleanText(value);
    return backendContext.ENGAGEMENT_MISSING_ENTRY_TIME_MODES.has(mode) ? mode : "manual";
  }

  return { cleanEngagementQualificationTimesMode, cleanEngagementMissingEntryTimeMode };
}

module.exports = { createCompetitionModelService_cleanEngagementMissingEntryTimeMode };
