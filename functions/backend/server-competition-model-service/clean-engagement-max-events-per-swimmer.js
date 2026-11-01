// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionModelService_cleanEngagementMaxEventsPerSwimmer(backendContext) {
  function cleanEngagementMaxEventsPerSwimmer(value) {
    const count = Math.trunc(Number(value) || 0);
    return Math.min(20, Math.max(0, count));
  }

  return { cleanEngagementMaxEventsPerSwimmer };
}

module.exports = { createCompetitionModelService_cleanEngagementMaxEventsPerSwimmer };
