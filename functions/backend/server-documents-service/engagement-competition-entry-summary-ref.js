// Existing operation bodies; live services arrive through explicit accessors.
function createDocumentsService_engagementCompetitionEntrySummaryRef(backendContext) {
  function engagementCompetitionEntrySummaryRef(db, competitionId) {
    return db.collection(backendContext.ENGAGEMENT_COMPETITION_ENTRY_SUMMARIES_COLLECTION)
      .doc((0, backendContext.local$engagementCompetitionEntrySummaryId)(competitionId));
  }

  return { engagementCompetitionEntrySummaryRef };
}

module.exports = { createDocumentsService_engagementCompetitionEntrySummaryRef };
