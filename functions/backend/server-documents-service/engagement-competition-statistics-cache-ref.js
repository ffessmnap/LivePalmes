// Existing operation bodies; live services arrive through explicit accessors.
function createDocumentsService_engagementCompetitionStatisticsCacheRef(backendContext) {
  function engagementCompetitionStatisticsCacheRef(db, competitionId) {
    return db.collection(backendContext.ENGAGEMENT_COMPETITION_STATISTICS_CACHE_COLLECTION)
      .doc((0, backendContext.local$engagementCompetitionEntrySummaryId)(competitionId));
  }

  return { engagementCompetitionStatisticsCacheRef };
}

module.exports = { createDocumentsService_engagementCompetitionStatisticsCacheRef };
