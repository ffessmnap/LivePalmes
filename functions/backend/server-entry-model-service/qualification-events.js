// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_qualificationEvents(backendContext) {
  function qualificationEvents(competition = {}) {
    return backendContext.cleanEngagementCompetitionEvents(competition.events || [], { strict: false, competitionType: competition.competitionType })
      .map((event) => ({ ...event, categories: event.categoryRestrictions?.length ? event.categoryRestrictions : backendContext.engagementCategoryCodesForEvent(event.code)
        .filter((category) => !(backendContext.ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES[event.code] || new Set()).has(category)) }));
  }

  return { qualificationEvents };
}

module.exports = { createEntryModelService_qualificationEvents };
