// Existing operation bodies; live services arrive through explicit accessors.
function createClubHandlers_getEngagementClubEntryTimeHistory(backendContext) {
  async function getEngagementClubEntryTimeHistory(request) {
    const startedAt = Date.now();
    const context = await backendContext.engagementClubAccessContext(request);
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    const swimmerIndexId = backendContext.cleanText(request.data?.swimmerIndexId).slice(0, 80);
    if (!competitionId || !swimmerIndexId) {
      throw new backendContext.HttpsError("invalid-argument", "Competition et nageur requis.");
    }
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      return backendContext.nativeClubEntryTimeHistory(context, competitionId, swimmerIndexId, request.data?.eventCodes);
    }
    const competitionRef = backendContext.db.collection("engagementCompetitions").doc(competitionId);
    const entryRef = backendContext.db.collection("engagementClubEntries").doc(backendContext.engagementClubEntryId(competitionId, context.clubId));
    const [competition, entry] = await backendContext.db.getAll(competitionRef, entryRef);
    if (!competition.exists) {
      throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    }
    if (!entry.exists || !backendContext.engagementTeamLeaderComplete(entry.data()?.teamLeader || {})) {
      throw new backendContext.HttpsError("failed-precondition", "Chef d'equipe ou renonciation obligatoire avant les courses.");
    }
    const competitionData = { ...competition.data(), id: competition.id };
    if (competitionData.qualifications?.enabled || backendContext.cleanEngagementMissingEntryTimeMode(competitionData.missingEntryTimeMode) !== "manual") {
      throw new backendContext.HttpsError("failed-precondition", "La modification des temps d'engagement n'est pas autorisee.");
    }
    const swimmer = (Array.isArray(entry.data()?.swimmers) ? entry.data().swimmers : [])
      .map(backendContext.cleanEngagementEntrySwimmer)
      .find((candidate) => candidate.swimmerIndexId === swimmerIndexId);
    if (!swimmer) {
      throw new backendContext.HttpsError("failed-precondition", "Nageur non engage par ce club.");
    }
    const requestedCodes = new Set((Array.isArray(request.data?.eventCodes) ? request.data.eventCodes : [])
      .map((code) => backendContext.cleanText(code).toUpperCase().replace(/\s+/g, ""))
      .filter(Boolean)
      .slice(0, 30));
    const savedCodes = Array.from(new Set((swimmer.individualEntries || [])
      .map((item) => backendContext.cleanText(item.eventCode).toUpperCase().replace(/\s+/g, ""))
      .filter((code) => code && (!requestedCodes.size || requestedCodes.has(code)))));
    const competitionTimeRules = {
      qualificationTimesMode: backendContext.cleanEngagementQualificationTimesMode(competitionData.qualificationTimesMode),
      qualificationStartDate: backendContext.cleanIsoDate(competitionData.qualificationStartDate),
      qualificationEndDate: backendContext.cleanIsoDate(competitionData.qualificationEndDate)
    };
    const rows = savedCodes.length ? await backendContext.getEngagementEntryTimeRowsForSwimmer(swimmer) : [];
    return {
      ok: true,
      swimmerIndexId,
      events: savedCodes.map((eventCode) => ({
        eventCode,
        times: backendContext.engagementKnownTimeHistory(rows, eventCode, competitionTimeRules, 10)
      })),
      readStats: backendContext.portalReadStats("getEngagementClubEntryTimeHistory", startedAt, {
        baseDocuments: savedCodes.length ? 3 : 2,
        variableDocumentsMax: savedCodes.length ? 1 : 0,
        cacheHit: null
      })
    };
  }

  return { getEngagementClubEntryTimeHistory };
}

module.exports = { createClubHandlers_getEngagementClubEntryTimeHistory };
