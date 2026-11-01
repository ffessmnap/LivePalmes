// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionModelService_engagementClosureQueueRef(backendContext) {
  function engagementClosureQueueRef(db, competitionId) {
    return db.collection(backendContext.ENGAGEMENT_CLOSURE_QUEUE_COLLECTION).doc(backendContext.cleanText(competitionId).slice(0, 128));
  }

  return { engagementClosureQueueRef };
}

module.exports = { createCompetitionModelService_engagementClosureQueueRef };
