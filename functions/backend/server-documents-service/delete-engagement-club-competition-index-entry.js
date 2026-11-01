// Existing operation bodies; live services arrive through explicit accessors.
function createDocumentsService_deleteEngagementClubCompetitionIndexEntry(backendContext) {
  async function rebuildEngagementCompetitionEntrySummary(db, competitionId) {
    const cleanCompetitionId = backendContext.cleanText(competitionId).slice(0, 128);
    if (!cleanCompetitionId) return [];
    const snapshot = await db.collection("engagementClubEntries")
      .where("competitionId", "==", cleanCompetitionId)
      .limit(500)
      .get();
    const entries = {};
    snapshot.docs.forEach((doc) => {
      const item = (0, backendContext.local$engagementCompetitionEntrySummaryItem)(backendContext.engagementClubEntryItem(doc));
      if (item.clubId && backendContext.engagementClubEntryHasParticipants(item)) entries[item.clubId] = item;
    });
    const now = new Date().toISOString();
    await (0, backendContext.local$engagementCompetitionEntrySummaryRef)(db, cleanCompetitionId).set({
      competitionId: cleanCompetitionId,
      generatedAt: now,
      updatedAt: now,
      entryCount: Object.keys(entries).length,
      entries
    }, { merge: false });
    return (0, backendContext.local$engagementCompetitionEntrySummariesFromData)({ entries });
  }

  function upsertEngagementClubCompetitionIndex(batch, db, entry = {}, now = "") {
    const competitionId = backendContext.cleanText(entry.competitionId).slice(0, 128);
    const clubId = backendContext.cleanText(entry.clubId).slice(0, 40);
    if (!competitionId || !clubId) return;
    batch.set(backendContext.engagementClubCompetitionIndexRef(db, clubId), {
      clubId,
      generatedAt: now || new Date().toISOString(),
      updatedAt: now || new Date().toISOString(),
      competitionIds: {
        [backendContext.engagementClubCompetitionIndexKey(competitionId)]: competitionId
      }
    }, { merge: true });
  }

  function deleteEngagementClubCompetitionIndexEntry(batch, db, entry = {}, now = "") {
    const competitionId = backendContext.cleanText(entry.competitionId).slice(0, 128);
    const clubId = backendContext.cleanText(entry.clubId).slice(0, 40);
    if (!competitionId || !clubId) return;
    batch.set(backendContext.engagementClubCompetitionIndexRef(db, clubId), {
      updatedAt: now || new Date().toISOString(),
      competitionIds: {
        [backendContext.engagementClubCompetitionIndexKey(competitionId)]: backendContext.FieldValue.delete()
      }
    }, { merge: true });
  }

  return { rebuildEngagementCompetitionEntrySummary, upsertEngagementClubCompetitionIndex, deleteEngagementClubCompetitionIndexEntry };
}

module.exports = { createDocumentsService_deleteEngagementClubCompetitionIndexEntry };
