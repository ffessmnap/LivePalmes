// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionModelService_engagementClubCompetitionIndexKey(backendContext) {
  function engagementClubCompetitionIndexRef(db, clubId) {
    return db.collection(backendContext.ENGAGEMENT_CLUB_COMPETITION_INDEXES_COLLECTION).doc(backendContext.cleanText(clubId).slice(0, 40));
  }

  function engagementClubCompetitionIndexKey(competitionId) {
    return backendContext.stableHash(backendContext.cleanText(competitionId).slice(0, 128)).slice(0, 40);
  }

  return { engagementClubCompetitionIndexRef, engagementClubCompetitionIndexKey };
}

module.exports = { createCompetitionModelService_engagementClubCompetitionIndexKey };
