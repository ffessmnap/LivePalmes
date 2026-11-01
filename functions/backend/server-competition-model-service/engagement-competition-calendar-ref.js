// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionModelService_engagementCompetitionCalendarRef(backendContext) {
  function engagementCompetitionCalendarRef(db, endYear) {
    return db.collection(backendContext.ENGAGEMENT_COMPETITION_CALENDARS_COLLECTION).doc(String(Math.trunc(Number(endYear) || 0)));
  }

  return { engagementCompetitionCalendarRef };
}

module.exports = { createCompetitionModelService_engagementCompetitionCalendarRef };
