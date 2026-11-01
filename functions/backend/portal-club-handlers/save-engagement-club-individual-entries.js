// Existing operation bodies; live services arrive through explicit accessors.
function createClubHandlers_saveEngagementClubIndividualEntries(backendContext) {
  async function saveEngagementClubIndividualEntries(request) {
    const context = await backendContext.engagementClubAccessContext(request);
    if(backendContext.ENVIRONMENT.sportingDataSource === "nap") return backendContext.saveNativeClubIndividualEntries(context,request);
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    if (!competitionId) {
      throw new backendContext.HttpsError("invalid-argument", "Competition requise.");
    }

    const competitionRef = backendContext.db.collection("engagementCompetitions").doc(competitionId);
    const entryRef = backendContext.db.collection("engagementClubEntries").doc(backendContext.engagementClubEntryId(competitionId, context.clubId));
    const [competition, entry] = await backendContext.db.getAll(competitionRef, entryRef);
    if (!competition.exists) {
      throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    }
    backendContext.assertEngagementClubWriteOpen(competition.data() || {});
    if (!entry.exists || !backendContext.engagementTeamLeaderComplete(entry.data()?.teamLeader || {})) {
      throw new backendContext.HttpsError("failed-precondition", "Chef d'equipe ou renonciation obligatoire avant les courses.");
    }

    const competitionData = { ...competition.data(), id: competition.id };
    const openWater = backendContext.cleanEngagementCompetitionType(competitionData.competitionType) === "openWater";
    const competitionEvents = backendContext.cleanEngagementCompetitionEvents(competitionData.events || [], {
      strict: false,
      competitionType: backendContext.cleanEngagementCompetitionType(competitionData.competitionType)
    });
    const allowedIndividualEventCodes = new Set(
      competitionEvents.filter((event) => event.type === "individual").map((event) => event.code)
    );
    const maxEventsPerSwimmer = backendContext.cleanEngagementMaxEventsPerSwimmer(competitionData.maxEventsPerSwimmer);
    const competitionTimeRules = {
      id: competitionId,
      hasQualificationGrants: competitionData.hasQualificationGrants === true,
      qualificationPreview: competitionData.qualificationPreview === true,
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
    const savedSwimmers = (Array.isArray(entry.data()?.swimmers) ? entry.data().swimmers : [])
      .map(backendContext.cleanEngagementEntrySwimmer)
      .filter((swimmer) => swimmer.swimmerIndexId);
    const savedSwimmersById = new Map(savedSwimmers.map((swimmer) => [swimmer.swimmerIndexId, swimmer]));
    const requestedChanges = Array.isArray(request.data?.swimmers) ? request.data.swimmers.slice(0, 100) : [];
    const seen = new Set();

    let changedSwimmers = await Promise.all(requestedChanges.map(async (rawSwimmer) => {
      const swimmerIndexId = backendContext.cleanText(rawSwimmer?.swimmerIndexId).slice(0, 80);
      if (!swimmerIndexId || seen.has(swimmerIndexId)) {
        throw new backendContext.HttpsError("invalid-argument", "Nageur modifie invalide ou duplique.");
      }
      seen.add(swimmerIndexId);
      const savedSwimmer = savedSwimmersById.get(swimmerIndexId);
      if (!savedSwimmer) {
        throw new backendContext.HttpsError("failed-precondition", "Enregistrez d'abord les nageurs selectionnes avant leurs courses.");
      }
      const rawEntries = Array.isArray(rawSwimmer?.individualEntries)
        ? rawSwimmer.individualEntries
        : Array.isArray(rawSwimmer?.individualEventCodes)
          ? rawSwimmer.individualEventCodes
          : [];
      const requestedCodes = rawEntries
        .map((rawEntry) => backendContext.cleanText(rawEntry?.eventCode || rawEntry?.code || rawEntry).toUpperCase().replace(/\s+/g, ""))
        .filter(Boolean);
      if (requestedCodes.some((code) => !allowedIndividualEventCodes.has(code))) {
        throw new backendContext.HttpsError("invalid-argument", "Course individuelle non ouverte sur cette competition.");
      }
      const individualEntries = backendContext.cleanEngagementEntryIndividualEntries(rawEntries, allowedIndividualEventCodes);
      if (maxEventsPerSwimmer > 0 && individualEntries.length > maxEventsPerSwimmer) {
        throw new backendContext.HttpsError("failed-precondition", `Maximum ${maxEventsPerSwimmer} course(s) individuelle(s) par nageur.`);
      }
      const resolvedEntries = openWater
        ? individualEntries.map((entry) => ({ eventCode: entry.eventCode, status: "selected", entryTimeMode: "notRequired" }))
        : await backendContext.resolveEngagementIndividualEntriesForSwimmer(savedSwimmer, individualEntries, competitionTimeRules);
      return backendContext.cleanEngagementEntrySwimmer({
        ...savedSwimmer,
        individualEntries: resolvedEntries
      });
    }));

    if (!openWater && changedSwimmers.some((swimmer) => swimmer.individualEntries.some((entryItem) => entryItem.entryTimeMode === "manual"))) {
      const recordsData = await backendContext.loadPerformanceRecordsData();
      changedSwimmers = backendContext.validateEngagementIndividualEntryTimes(changedSwimmers, competitionTimeRules, recordsData);
    }
    const changedById = new Map(changedSwimmers.map((swimmer) => [swimmer.swimmerIndexId, swimmer]));
    const now = new Date().toISOString();
    let updatedEntryData = entry.data() || {};
    if (changedSwimmers.length) {
      await backendContext.db.runTransaction(async (transaction) => {
        const latestEntry = await transaction.get(entryRef);
        const latestCompetition = await transaction.get(competitionRef);
        backendContext.assertEngagementClubWriteOpen(latestCompetition.data() || {});
        if (latestCompetition.updateTime.toMillis() !== competition.updateTime.toMillis()) throw new backendContext.HttpsError("aborted", "Les règles ont changé. Rechargez la compétition.");
        if (!latestEntry.exists || !backendContext.engagementTeamLeaderComplete(latestEntry.data()?.teamLeader || {})) {
          throw new backendContext.HttpsError("failed-precondition", "Chef d'equipe ou renonciation obligatoire avant les courses.");
        }
        const latestSwimmers = (Array.isArray(latestEntry.data()?.swimmers) ? latestEntry.data().swimmers : [])
          .map(backendContext.cleanEngagementEntrySwimmer)
          .filter((swimmer) => swimmer.swimmerIndexId);
        const latestIds = new Set(latestSwimmers.map((swimmer) => swimmer.swimmerIndexId));
        const missingSwimmer = changedSwimmers.find((swimmer) => !latestIds.has(swimmer.swimmerIndexId));
        if (missingSwimmer) {
          throw new backendContext.HttpsError("failed-precondition", "Un nageur modifie n'est plus selectionne dans cette competition. Rechargez la fiche.");
        }
        const swimmers = latestSwimmers.map((swimmer) => changedById.get(swimmer.swimmerIndexId) || swimmer);
        if (competitionData.qualifications?.enabled && latestSwimmers.some((swimmer) => changedById.has(swimmer.swimmerIndexId) && JSON.stringify(swimmer) !== JSON.stringify(savedSwimmersById.get(swimmer.swimmerIndexId)))) {
          throw new backendContext.HttpsError("aborted", "Les engagements ont changé. Rechargez avant de recommencer.");
        }
        backendContext.qualificationService().revokeRemovedExceptions(transaction, competitionId, latestSwimmers, swimmers, context.uid);
        const relays = backendContext.qualificationRelaysAfterIndividualChange(latestEntry.data()?.relays || [], swimmers, competitionData);
        updatedEntryData = {
          ...(latestEntry.data() || {}),
          swimmers,
          relays,
          updatedAt: now,
          updatedBy: context.uid
        };
        transaction.set(entryRef, {
          swimmers,
          relays,
          updatedAt: now,
          updatedBy: context.uid
        }, { merge: true });
      });
      await backendContext.writeAuditLog("engagementClubEntry.individualEntriesSaved", context.uid, {
        competitionId,
        clubId: context.clubId,
        changedSwimmerCount: changedSwimmers.length,
        individualEntryCount: changedSwimmers.reduce((sum, swimmer) => sum + swimmer.individualEntries.length, 0)
      });
    }
    return {
      ok: true,
      changedSwimmerCount: changedSwimmers.length,
      entry: backendContext.engagementClubEntryItem({
        id: entryRef.id,
        exists: true,
        data: () => updatedEntryData
      })
    };
  }

  return { saveEngagementClubIndividualEntries };
}

module.exports = { createClubHandlers_saveEngagementClubIndividualEntries };
