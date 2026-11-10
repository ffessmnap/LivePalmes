// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_engagementClubsByIds(backendContext) {
  async function engagementClubsByIds(clubIds = []) {
    const ids = Array.from(new Set(clubIds.map((clubId) => backendContext.cleanText(clubId).slice(0, 40)).filter(Boolean)));
    return backendContext.readNapClubsByIds(ids);
  }

  return { engagementClubsByIds };
}

module.exports = { createAccessService_engagementClubsByIds };
