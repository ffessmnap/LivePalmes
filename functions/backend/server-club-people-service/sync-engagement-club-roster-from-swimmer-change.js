// Existing operation bodies; live services arrive through explicit accessors.
function createClubPeopleService_syncEngagementClubRosterFromSwimmerChange(backendContext) {
  async function syncEngagementClubRosterFromSwimmerChange(event = {}, source = "performances") {
    const before = event.data?.before?.exists ? event.data.before.data() || {} : null;
    const after = event.data?.after?.exists ? event.data.after.data() || {} : null;
    const docId = backendContext.cleanText(event.params?.swimmerIndexId || event.params?.swimmerId);
    const now = new Date().toISOString();
    const batch = backendContext.db.batch();
    let batchSize = 0;
    const beforeItem = before
      ? backendContext.engagementClubRosterSwimmerItem({ ...before, swimmerIndexId: docId, source })
      : null;
    const afterItem = after
      ? backendContext.engagementClubRosterSwimmerItem({ ...after, swimmerIndexId: docId, source })
      : null;
    const shouldDeleteBefore = beforeItem?.clubId && (
      !afterItem ||
      afterItem.active === false ||
      beforeItem.clubId !== afterItem.clubId ||
      backendContext.engagementClubRosterSwimmerKey(beforeItem) !== backendContext.engagementClubRosterSwimmerKey(afterItem)
    );
    if (shouldDeleteBefore) {
      backendContext.deleteEngagementClubRosterSwimmer(batch, backendContext.db, beforeItem, now);
      batchSize += 1;
    }
    if (afterItem?.clubId && afterItem.active !== false) {
      backendContext.upsertEngagementClubRosterSwimmer(batch, backendContext.db, afterItem, now);
      batchSize += 1;
    }
    if (source !== "engagement" && docId) {
      backendContext.deleteEngagementEntryTimeCache(batch, backendContext.db, { ...(after || before || {}), source, swimmerIndexId: docId });
      batchSize += 1;
    }
    if (batchSize) await batch.commit();
  }

  return { syncEngagementClubRosterFromSwimmerChange };
}

module.exports = { createClubPeopleService_syncEngagementClubRosterFromSwimmerChange };
