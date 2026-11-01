// Existing operation bodies; live services arrive through explicit accessors.
function createClubHandlers_previewEngagementClubSwimmerEventTimes(backendContext) {
  async function previewEngagementClubSwimmerEventTimes(request) {
    const context = await backendContext.engagementClubAccessContext(request);
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    const swimmerIndexId = backendContext.cleanText(request.data?.swimmerIndexId).slice(0, 80);
    const requestedSource = backendContext.cleanText(request.data?.source);
    const source = requestedSource === "engagement"
      ? "engagement"
      : requestedSource === "reference"
        ? "reference"
        : "performances";
    if (!competitionId || !swimmerIndexId) {
      throw new backendContext.HttpsError("invalid-argument", "Competition et nageur requis.");
    }

    if(backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      const result=await backendContext.previewNativeClubEntryTimes(context,competitionId,[swimmerIndexId],false);
      return {...result,swimmerIndexId,individualEntries:result.swimmers[0].individualEntries};
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

    let swimmer = null;
    if (source === "reference") {
      const reference = backendContext.intranapSwimmersIndex.find((item) => [
        item.id,
        item.swimmerId,
        ...(Array.isArray(item.aliases) ? item.aliases : []),
        ...(Array.isArray(item.sourceIds) ? item.sourceIds : [])
      ].map(backendContext.cleanText).includes(swimmerIndexId));
      if (reference) swimmer = backendContext.engagementReferenceSwimmerItem(reference);
    } else {
      const swimmerDoc = await backendContext.db
        .collection(source === "engagement" ? "engagementClubSwimmers" : backendContext.PERFORMANCE_SWIMMERS_COLLECTION)
        .doc(swimmerIndexId)
        .get();
      if (swimmerDoc.exists) {
        swimmer = source === "engagement"
          ? backendContext.engagementNewSwimmerItem(swimmerDoc)
          : backendContext.engagementClubSwimmerItem(swimmerDoc);
      }
    }
    if (!swimmer) throw new backendContext.HttpsError("not-found", "Nageur introuvable.");
    if (swimmer.clubId !== context.clubId) {
      throw new backendContext.HttpsError("permission-denied", "Nageur hors perimetre club.");
    }

    const competitionData = { ...competition.data(), id: competition.id };
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
    const individualEntries = await backendContext.resolveEngagementIndividualEntriesForSwimmer(
      { ...swimmer, swimmerIndexId: swimmer.id || swimmerIndexId, source },
      eventEntries,
      competitionTimeRules
    );
    return {
      ok: true,
      swimmerIndexId,
      individualEntries
    };
  }

  return { previewEngagementClubSwimmerEventTimes };
}

module.exports = { createClubHandlers_previewEngagementClubSwimmerEventTimes };
