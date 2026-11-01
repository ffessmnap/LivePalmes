// Existing operation bodies; live services arrive through explicit accessors.
function createDocumentsService_invalidateEngagementCompetitionStatistics(backendContext) {
  function invalidateEngagementCompetitionStatistics(batch, db, competitionId, now = "") {
    const cleanCompetitionId = backendContext.cleanText(competitionId).slice(0, 128);
    if (!cleanCompetitionId) return;
    batch.set((0, backendContext.local$engagementCompetitionStatisticsCacheRef)(db, cleanCompetitionId), {
      competitionId: cleanCompetitionId,
      status: "stale",
      updatedAt: now || new Date().toISOString()
    }, { merge: true });
  }

  async function syncEngagementCompetitionEntrySummaryFromChange(event = {}) {
    const before = event.data?.before?.exists ? backendContext.engagementClubEntryItem(event.data.before) : null;
    const after = event.data?.after?.exists ? backendContext.engagementClubEntryItem(event.data.after) : null;
    const now = new Date().toISOString();
    const batch = backendContext.db.batch();
    let batchSize = 0;
    const summaryPatches = new Map();
    const clubIndexPatches = new Map();
    const entryMoved = before?.competitionId && before?.clubId && (
      !after || before.competitionId !== after.competitionId || before.clubId !== after.clubId
    );
    const summaryPatch = (competitionId) => {
      if (!summaryPatches.has(competitionId)) summaryPatches.set(competitionId, {});
      return summaryPatches.get(competitionId);
    };
    const clubIndexPatch = (clubId) => {
      if (!clubIndexPatches.has(clubId)) clubIndexPatches.set(clubId, {});
      return clubIndexPatches.get(clubId);
    };
    if (entryMoved) {
      summaryPatch(before.competitionId)[before.clubId] = backendContext.FieldValue.delete();
      clubIndexPatch(before.clubId)[backendContext.engagementClubCompetitionIndexKey(before.competitionId)] = backendContext.FieldValue.delete();
    }
    if (after?.competitionId && after?.clubId) {
      const item = (0, backendContext.local$engagementCompetitionEntrySummaryItem)(after);
      summaryPatch(after.competitionId)[after.clubId] = backendContext.engagementClubEntryHasParticipants(item)
        ? item
        : backendContext.FieldValue.delete();
      clubIndexPatch(after.clubId)[backendContext.engagementClubCompetitionIndexKey(after.competitionId)] = after.competitionId;
    }
    summaryPatches.forEach((entries, competitionId) => {
      batch.set((0, backendContext.local$engagementCompetitionEntrySummaryRef)(backendContext.db, competitionId), {
        competitionId,
        generatedAt: now,
        updatedAt: now,
        entries
      }, { merge: true });
      batchSize += 1;
    });
    clubIndexPatches.forEach((competitionIds, clubId) => {
      batch.set(backendContext.engagementClubCompetitionIndexRef(backendContext.db, clubId), {
        clubId,
        generatedAt: now,
        updatedAt: now,
        competitionIds
      }, { merge: true });
      batchSize += 1;
    });
    const changedCompetitionIds = new Set([before?.competitionId, after?.competitionId].filter(Boolean));
    changedCompetitionIds.forEach((competitionId) => {
      invalidateEngagementCompetitionStatistics(batch, backendContext.db, competitionId, now);
      batchSize += 1;
    });
    if (batchSize) await batch.commit();
  }

  return { invalidateEngagementCompetitionStatistics, syncEngagementCompetitionEntrySummaryFromChange };
}

module.exports = { createDocumentsService_invalidateEngagementCompetitionStatistics };
