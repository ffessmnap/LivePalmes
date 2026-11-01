// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_engagementClubsByIds(backendContext) {
  async function engagementClubsByIds(clubIds = []) {
    const ids = Array.from(new Set(clubIds.map((clubId) => backendContext.cleanText(clubId).slice(0, 40)).filter(Boolean)));
    const byId = new Map(ids.map((clubId) => [clubId, backendContext.CLUB_REFERENCE_BY_ID.get(clubId) || { clubId }]));
    if (!ids.length) return byId;
    const snapshots = await backendContext.db.getAll(...ids.map((clubId) => backendContext.db.collection(backendContext.ENGAGEMENT_CLUBS_COLLECTION).doc(clubId)));
    snapshots.filter((snapshot) => snapshot.exists).forEach((snapshot) => {
      const stored = (0, backendContext.local$engagementStoredClubItem)(snapshot);
      byId.set(stored.clubId, { ...(byId.get(stored.clubId) || {}), ...stored });
    });
    return byId;
  }

  return { engagementClubsByIds };
}

module.exports = { createAccessService_engagementClubsByIds };
