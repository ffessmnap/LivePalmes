// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_engagementClubName(backendContext) {
  function engagementClubName(clubId, fallback = "") {
    return backendContext.cleanText(fallback);
  }

  return { engagementClubName };
}

module.exports = { createAccessService_engagementClubName };
