// Existing operation bodies; live services arrive through explicit accessors.
function createClubPeopleService_syncEngagementClubPeopleRosterFromChange(backendContext) {
  async function syncEngagementClubPeopleRosterFromChange(event = {}) {
    const before = event.data?.before?.exists ? (0, backendContext.local$engagementClubPersonItem)(event.data.before) : null;
    const after = event.data?.after?.exists ? (0, backendContext.local$engagementClubPersonItem)(event.data.after) : null;
    const now = new Date().toISOString();
    const batch = backendContext.db.batch();
    let batchSize = 0;
    if (before?.clubId && (!after || before.clubId !== after.clubId)) {
      (0, backendContext.local$deleteEngagementClubPeopleRosterPerson)(batch, backendContext.db, before, now);
      batchSize += 1;
    }
    if (after?.clubId) {
      (0, backendContext.local$upsertEngagementClubPeopleRosterPerson)(batch, backendContext.db, after, now);
      batchSize += 1;
    }
    if (batchSize) await batch.commit();
  }

  return { syncEngagementClubPeopleRosterFromChange };
}

module.exports = { createClubPeopleService_syncEngagementClubPeopleRosterFromChange };
