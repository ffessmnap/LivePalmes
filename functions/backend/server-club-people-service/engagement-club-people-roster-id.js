// Existing operation bodies; live services arrive through explicit accessors.
function createClubPeopleService_engagementClubPeopleRosterId(backendContext) {
  function engagementClubPeopleRosterId(clubId) {
    return backendContext.stableHash(backendContext.cleanText(clubId)).slice(0, 40);
  }

  function engagementClubPeopleRosterRef(db, clubId) {
    return db.collection(backendContext.ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION).doc(engagementClubPeopleRosterId(clubId));
  }

  return { engagementClubPeopleRosterId, engagementClubPeopleRosterRef };
}

module.exports = { createClubPeopleService_engagementClubPeopleRosterId };
