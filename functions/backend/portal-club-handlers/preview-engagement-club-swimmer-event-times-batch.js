// Existing operation bodies; live services arrive through explicit accessors.
function createClubHandlers_previewEngagementClubSwimmerEventTimesBatch(backendContext) {
  async function previewEngagementClubSwimmerEventTimesBatch(request) {
    const startedAt = Date.now();
    const context = await backendContext.engagementClubAccessContext(request);
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    const swimmerIds = Array.from(new Set((Array.isArray(request.data?.swimmerIndexIds) ? request.data.swimmerIndexIds : [])
      .map((id) => backendContext.cleanText(id).slice(0, 80))
      .filter(Boolean))).slice(0, 50);
    if (!competitionId || !swimmerIds.length) {
      throw new backendContext.HttpsError("invalid-argument", "Competition et nageurs requis.");
    }
    if(backendContext.ENVIRONMENT.sportingDataSource === "nap") return backendContext.previewNativeClubEntryTimes(context,competitionId,swimmerIds,true);
    const competitionRef = backendContext.db.collection("engagementCompetitions").doc(competitionId);
    const entryRef = backendContext.db.collection("engagementClubEntries").doc(backendContext.engagementClubEntryId(competitionId, context.clubId));
    const [competition, entry] = await backendContext.db.getAll(competitionRef, entryRef);
    if (!competition.exists) throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    if (!entry.exists || !backendContext.engagementTeamLeaderComplete(entry.data()?.teamLeader || {})) {
      throw new backendContext.HttpsError("failed-precondition", "Chef d'equipe ou renonciation obligatoire avant les courses.");
    }
    const savedById = new Map((Array.isArray(entry.data()?.swimmers) ? entry.data().swimmers : [])
      .map(backendContext.cleanEngagementEntrySwimmer)
      .filter((swimmer) => swimmer.swimmerIndexId)
      .map((swimmer) => [swimmer.swimmerIndexId, swimmer]));
    const competitionData = { ...competition.data(), id: competition.id };
    if (backendContext.cleanEngagementCompetitionType(competitionData.competitionType) === "openWater") {
      return {
        ok: true,
        swimmers: swimmerIds.map((swimmerIndexId) => ({ swimmerIndexId, individualEntries: [] })),
        readStats: backendContext.portalReadStats("previewEngagementClubSwimmerEventTimesBatch", startedAt, {
          baseDocuments: 3,
          variableDocumentsMax: 0,
          cacheHit: true
        })
      };
    }
    const competitionTimeRules = {
      id: competitionId,
      hasQualificationGrants: competitionData.hasQualificationGrants === true,
      qualificationPreview: true,
      qualifications: competitionData.qualifications,
      events: competitionData.events,
      date: backendContext.cleanIsoDate(competitionData.date),
      poolLength: backendContext.cleanEngagementPoolLength(competitionData.poolLength),
      timingType: backendContext.cleanEngagementTimingType(competitionData.timingType),
      qualificationTimesMode: backendContext.cleanEngagementQualificationTimesMode(competitionData.qualificationTimesMode),
      qualificationStartDate: backendContext.cleanIsoDate(competitionData.qualificationStartDate),
      qualificationEndDate: backendContext.cleanIsoDate(competitionData.qualificationEndDate),
      missingEntryTimeMode: backendContext.cleanEngagementMissingEntryTimeMode(competitionData.missingEntryTimeMode)
    };
    const eventEntries = backendContext.cleanEngagementCompetitionEvents(competitionData.events || [], {
      strict: false,
      competitionType: backendContext.cleanEngagementCompetitionType(competitionData.competitionType)
    })
      .filter((event) => event.type === "individual")
      .map((event) => ({ eventCode: event.code }));
    const swimmers = await Promise.all(swimmerIds.map(async (swimmerIndexId) => {
      const swimmer = savedById.get(swimmerIndexId);
      if (!swimmer) throw new backendContext.HttpsError("failed-precondition", "Enregistrez d'abord les nageurs selectionnes.");
      const individualEntries = await backendContext.resolveEngagementIndividualEntriesForSwimmer(swimmer, eventEntries, competitionTimeRules);
      return { swimmerIndexId, individualEntries };
    }));
    return {
      ok: true,
      swimmers,
      readStats: backendContext.portalReadStats("previewEngagementClubSwimmerEventTimesBatch", startedAt, {
        baseDocuments: 3,
        variableDocumentsMax: swimmerIds.length,
        cacheHit: null
      })
    };
  }

  return { previewEngagementClubSwimmerEventTimesBatch };
}

module.exports = { createClubHandlers_previewEngagementClubSwimmerEventTimesBatch };
