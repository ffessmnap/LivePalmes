// Existing operation bodies; live services arrive through explicit accessors.
function createDocumentsService_engagementCompetitionEntrySummaryItem(backendContext) {
  function engagementCompetitionEntrySummaryItem(entry = {}) {
    const stats = backendContext.engagementPdfEntryStats(entry);
    return backendContext.cleanFirestoreValue({
      id: backendContext.cleanText(entry.id || backendContext.engagementClubEntryId(entry.competitionId, entry.clubId)).slice(0, 180),
      competitionId: backendContext.cleanText(entry.competitionId).slice(0, 128),
      clubId: backendContext.cleanText(entry.clubId).slice(0, 40),
      clubCode: backendContext.engagementClubCode(entry.clubId, entry.clubCode).slice(0, 40),
      clubName: backendContext.engagementClubName(entry.clubId, entry.clubName || "Club").slice(0, 140),
      regionId: backendContext.cleanText(entry.regionId).slice(0, 80),
      teamLeaderComplete: entry.teamLeaderComplete === true,
      officialCount: Array.isArray(entry.officials) ? entry.officials.length : Math.max(0, Math.trunc(Number(entry.officialCount) || 0)),
      swimmerCount: stats.swimmerCount || Math.max(0, Math.trunc(Number(entry.swimmerCount) || 0)),
      individualCount: stats.individualCount || Math.max(0, Math.trunc(Number(entry.individualCount) || 0)),
      relayCount: stats.relayCount || Math.max(0, Math.trunc(Number(entry.relayCount) || 0)),
      recapPdf: (0, backendContext.local$cleanEngagementDocumentMetadata)(entry.documents?.clubRecapPdf || {}) || undefined,
      updatedAt: backendContext.cleanText(entry.updatedAt).slice(0, 40)
    });
  }

  return { engagementCompetitionEntrySummaryItem };
}

module.exports = { createDocumentsService_engagementCompetitionEntrySummaryItem };
