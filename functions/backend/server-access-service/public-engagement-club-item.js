// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_publicEngagementClubItem(backendContext) {
  function publicEngagementClubItem(club = {}) {
    return (0, backendContext.local$cleanFirestoreValue)({
      clubId: backendContext.cleanText(club.clubId || club.id).slice(0, 40),
      clubCode: backendContext.cleanText(club.clubCode).slice(0, 40),
      clubName: backendContext.cleanText(club.clubName).slice(0, 140),
      regionId: backendContext.cleanText(club.regionId).slice(0, 80),
      federalNumber: backendContext.cleanText(club.federalNumber).slice(0, 24),
      city: backendContext.cleanText(club.city).slice(0, 100),
      postalCode: backendContext.cleanText(club.postalCode).slice(0, 16),
      active: club.active !== false,
      source: backendContext.cleanText(club.source || "national").slice(0, 40)
    });
  }

  return { publicEngagementClubItem };
}

module.exports = { createAccessService_publicEngagementClubItem };
