// Existing operation bodies; live services arrive through explicit accessors.
function createDocumentsService_deleteEngagementCompetitionEntrySummary(backendContext) {
  function deleteEngagementCompetitionEntrySummary(batch, db, entry = {}, now = "") {
    const competitionId = backendContext.cleanText(entry.competitionId).slice(0, 128);
    const clubId = backendContext.cleanText(entry.clubId).slice(0, 40);
    if (!competitionId || !clubId) return;
    batch.set((0, backendContext.local$engagementCompetitionEntrySummaryRef)(db, competitionId), {
      generatedAt: now || new Date().toISOString(),
      updatedAt: now || new Date().toISOString(),
      entries: {
        [clubId]: backendContext.FieldValue.delete()
      }
    }, { merge: true });
  }

  return { deleteEngagementCompetitionEntrySummary };
}

module.exports = { createDocumentsService_deleteEngagementCompetitionEntrySummary };
