// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_deleteEngagementClubRosterSwimmer(backendContext) {
  function deleteEngagementClubRosterSwimmer(batch, db, swimmer = {}, now = "") {
    const clubId = backendContext.cleanText(swimmer.clubId);
    const swimmerIndexId = backendContext.cleanText(swimmer.swimmerIndexId || swimmer.id);
    if (!clubId || !swimmerIndexId) return;
    const key = (0, backendContext.local$engagementClubRosterSwimmerKey)({ ...swimmer, swimmerIndexId });
    batch.set((0, backendContext.local$engagementClubRosterRef)(db, clubId), {
      generatedAt: now || new Date().toISOString(),
      updatedAt: now || new Date().toISOString(),
      swimmers: {
        [key]: backendContext.FieldValue.delete()
      }
    }, { merge: true });
  }

  return { deleteEngagementClubRosterSwimmer };
}

module.exports = { createEntryModelService_deleteEngagementClubRosterSwimmer };
