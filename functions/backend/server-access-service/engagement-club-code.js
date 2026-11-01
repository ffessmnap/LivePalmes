// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_engagementClubCode(backendContext) {
  function engagementClubCode(clubId, fallback = "") {
    return backendContext.CLUB_REFERENCE_BY_ID.get(backendContext.cleanText(clubId))?.clubCode || backendContext.cleanText(fallback);
  }

  return { engagementClubCode };
}

module.exports = { createAccessService_engagementClubCode };
