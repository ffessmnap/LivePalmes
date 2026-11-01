// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_upsertEngagementClubRosterSwimmer(backendContext) {
  function upsertEngagementClubRosterSwimmer(batch, db, swimmer = {}, now = "") {
    const item = (0, backendContext.local$engagementClubRosterSwimmerItem)(swimmer);
    if (!item.clubId || !item.swimmerIndexId || item.active === false) return;
    const key = (0, backendContext.local$engagementClubRosterSwimmerKey)(item);
    batch.set((0, backendContext.local$engagementClubRosterRef)(db, item.clubId), {
      clubId: item.clubId,
      clubName: item.clubName,
      generatedAt: now || new Date().toISOString(),
      updatedAt: now || new Date().toISOString(),
      swimmers: {
        [key]: item
      }
    }, { merge: true });
  }

  return { upsertEngagementClubRosterSwimmer };
}

module.exports = { createEntryModelService_upsertEngagementClubRosterSwimmer };
