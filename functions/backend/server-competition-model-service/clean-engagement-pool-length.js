// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionModelService_cleanEngagementPoolLength(backendContext) {
  function cleanEngagementPoolLength(value) {
    const poolLength = backendContext.cleanText(value);
    return backendContext.ENGAGEMENT_POOL_LENGTHS.has(poolLength) ? poolLength : "";
  }

  function cleanEngagementTimingType(value) {
    const timingType = backendContext.cleanText(value);
    return backendContext.ENGAGEMENT_TIMING_TYPES.has(timingType) ? timingType : "";
  }

  return { cleanEngagementPoolLength, cleanEngagementTimingType };
}

module.exports = { createCompetitionModelService_cleanEngagementPoolLength };
