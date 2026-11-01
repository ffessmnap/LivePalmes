// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionModelService_engagementClosureQueueItem(backendContext) {
  function engagementClosureQueueItem(competition = {}, competitionId = "", now = new Date().toISOString()) {
    const entryStatus = (0, backendContext.local$cleanEngagementEntryStatus)(competition.entryStatus || competition.status);
    const runAt = backendContext.cleanIsoDateTime(competition.entryDeadlineAt);
    if (entryStatus !== "open" || !runAt) return null;
    return backendContext.cleanFirestoreValue({
      competitionId: backendContext.cleanText(competitionId).slice(0, 128),
      competitionName: backendContext.cleanText(competition.name || competition.title).slice(0, 160),
      runAt,
      entryDeadlineAt: runAt,
      regionId: backendContext.cleanText(competition.regionId).slice(0, 80),
      level: (0, backendContext.local$cleanEngagementCompetitionLevel)(competition.level || competition.competitionLevel),
      status: "scheduled",
      updatedAt: now
    });
  }

  return { engagementClosureQueueItem };
}

module.exports = { createCompetitionModelService_engagementClosureQueueItem };
