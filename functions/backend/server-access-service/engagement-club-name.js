// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_engagementClubName(backendContext) {
  function engagementClubName(clubId, fallback = "") {
    return backendContext.CLUB_REFERENCE_BY_ID.get(backendContext.cleanText(clubId))?.clubName || backendContext.cleanText(fallback);
  }

  return { engagementClubName };
}

module.exports = { createAccessService_engagementClubName };
