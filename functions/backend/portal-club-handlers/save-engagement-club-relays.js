// Existing operation bodies; live services arrive through explicit accessors.
function createClubHandlers_saveEngagementClubRelays(backendContext) {
  async function saveEngagementClubRelays(request) {
    const context = await backendContext.engagementClubAccessContext(request);
    if(backendContext.ENVIRONMENT.sportingDataSource === "nap") return backendContext.saveNativeClubRelays(context,request);
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    if (!competitionId) {
      throw new backendContext.HttpsError("invalid-argument", "Competition requise.");
    }
    const competition = await backendContext.db.collection("engagementCompetitions").doc(competitionId).get();
    if (!competition.exists) {
      throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    }
    backendContext.assertEngagementClubWriteOpen(competition.data() || {});
    const entryRef = backendContext.db.collection("engagementClubEntries").doc(backendContext.engagementClubEntryId(competitionId, context.clubId));
    const entry = await entryRef.get();
    if (!entry.exists || !backendContext.engagementTeamLeaderComplete(entry.data()?.teamLeader || {})) {
      throw new backendContext.HttpsError("failed-precondition", "Chef d'equipe ou renonciation obligatoire avant les relais.");
    }
    const entryData = entry.data() || {};
    const removeRelayId = backendContext.cleanText(request.data?.removeRelayId).slice(0, 128);
    if (removeRelayId) {
      // A deletion must not validate unrelated, possibly incomplete compositions.
      const now = new Date().toISOString();
      let updatedData;
      await backendContext.db.runTransaction(async (transaction) => {
        const currentCompetition = await transaction.get(competition.ref);
        const currentEntry = await transaction.get(entryRef);
        backendContext.assertEngagementClubWriteOpen(currentCompetition.data() || {});
        if (!currentEntry.exists) throw new backendContext.HttpsError("not-found", "Engagements introuvables.");
        const data = currentEntry.data();
        const relays = (data.relays || []).filter((relay) => relay.relayId !== removeRelayId);
        updatedData = { ...data, relays, updatedAt: now, updatedBy: context.uid };
        transaction.set(entryRef, { relays, updatedAt: now, updatedBy: context.uid }, { merge: true });
      });
      await backendContext.writeAuditLog("engagementClubEntry.relayDeleted", context.uid, { competitionId, clubId: context.clubId, relayId: removeRelayId });
      return { ok: true, entry: backendContext.engagementClubEntryItem({ id: entryRef.id, exists: true, data: () => updatedData }) };
    }
    const swimmers = (Array.isArray(entryData.swimmers) ? entryData.swimmers : [])
      .map(backendContext.cleanEngagementEntrySwimmer)
      .filter((swimmer) => swimmer.swimmerIndexId);
    const competitionData = { ...competition.data(), id: competition.id };
    const events = backendContext.cleanEngagementCompetitionEvents(competitionData.events || [], {
      strict: false,
      competitionType: backendContext.cleanEngagementCompetitionType(competitionData.competitionType)
    });
    let relays = backendContext.cleanEngagementEntryRelays(request.data?.relays || [], {
      date: backendContext.cleanIsoDate(competitionData.date),
      competitionType: backendContext.cleanEngagementCompetitionType(competitionData.competitionType),
      events
    }, swimmers);
    if (relays.length && backendContext.cleanEngagementCompetitionType(competitionData.competitionType) !== "openWater") {
      const recordsData = await backendContext.loadPerformanceRecordsData();
      relays = backendContext.validateEngagementRelayEntryTimes(relays, {
        date: backendContext.cleanIsoDate(competitionData.date),
        poolLength: backendContext.cleanEngagementPoolLength(competitionData.poolLength),
        timingType: backendContext.cleanEngagementTimingType(competitionData.timingType)
      }, recordsData);
    }
    if (competitionData.qualifications?.enabled) {
      const evaluations = {};
      const memberIds = new Set(relays.flatMap((relay) => relay.memberIds || []));
      for (const swimmer of swimmers.filter((item) => memberIds.has(item.swimmerIndexId) && item.individualEntries?.length)) {
        evaluations[swimmer.swimmerIndexId] = await backendContext.qualificationService().evaluate(swimmer, { ...competitionData, id: competitionId });
      }
      if (relays.some((relay) => !backendContext.qualificationEngine.relayEligible(relay, swimmers, evaluations))) {
        throw new backendContext.HttpsError("failed-precondition", "Chaque relais composé doit comprendre un nageur qualifié et engagé sur une course individuelle qualifiée. Une composition vide peut être renseignée lors de la compétition.");
      }
    }
    const now = new Date().toISOString();
    await backendContext.db.runTransaction(async (transaction) => {
      const currentCompetition = await transaction.get(competition.ref);
      const currentEntry = await transaction.get(entryRef);
      backendContext.assertEngagementClubWriteOpen(currentCompetition.data() || {});
      if (currentCompetition.updateTime.toMillis() !== competition.updateTime.toMillis() || currentEntry.updateTime.toMillis() !== entry.updateTime.toMillis()) throw new backendContext.HttpsError("aborted", "Les engagements ont changé. Rechargez la fiche.");
      transaction.set(entryRef, { relays, updatedAt: now, updatedBy: context.uid }, { merge: true });
    });
    await backendContext.writeAuditLog("engagementClubEntry.relaysSaved", context.uid, {
      competitionId,
      clubId: context.clubId,
      relayCount: relays.length
    });
    const updatedData = { ...entryData, relays, updatedAt: now, updatedBy: context.uid };
    return {
      ok: true,
      entry: backendContext.engagementClubEntryItem({ id: entryRef.id, exists: true, data: () => updatedData })
    };
  }

  return { saveEngagementClubRelays };
}

module.exports = { createClubHandlers_saveEngagementClubRelays };
