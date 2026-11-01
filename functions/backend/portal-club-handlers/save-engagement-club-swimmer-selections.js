// Existing operation bodies; live services arrive through explicit accessors.
function createClubHandlers_saveEngagementClubSwimmerSelections(backendContext) {
  async function saveEngagementClubSwimmerSelections(request) {
    const startedAt = Date.now();
    const context = await backendContext.engagementClubAccessContext(request);
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") return backendContext.saveNativeClubSwimmerSelections(context,request,request.data?.changes);
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    const rawChanges = Array.isArray(request.data?.changes) ? request.data.changes.slice(0, 50) : [];
    if (!competitionId || !rawChanges.length) {
      throw new backendContext.HttpsError("invalid-argument", "Competition et modifications requises.");
    }
    const changes = [];
    const seen = new Set();
    rawChanges.forEach((rawChange) => {
      const swimmerIndexId = backendContext.cleanText(rawChange?.swimmer?.swimmerIndexId || rawChange?.swimmerIndexId).slice(0, 80);
      if (!swimmerIndexId || seen.has(swimmerIndexId)) {
        throw new backendContext.HttpsError("invalid-argument", "Modification de nageur invalide ou dupliquee.");
      }
      seen.add(swimmerIndexId);
      changes.push({
        swimmerIndexId,
        selected: rawChange?.selected === true,
        swimmer: rawChange?.swimmer || {}
      });
    });

    const competitionRef = backendContext.db.collection("engagementCompetitions").doc(competitionId);
    const entryRef = backendContext.db.collection("engagementClubEntries").doc(backendContext.engagementClubEntryId(competitionId, context.clubId));
    const competition = await competitionRef.get();
    if (!competition.exists) throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    backendContext.assertEngagementClubWriteOpen(competition.data() || {});

    const selectedChanges = changes.filter((change) => change.selected);
    const validatedSwimmers = selectedChanges.length
      ? await backendContext.buildEngagementClubSwimmersFromRequest({ swimmers: selectedChanges.map((change) => change.swimmer) }, context, { ...competition.data(), id: competition.id })
      : [];
    const validatedById = new Map(validatedSwimmers.map((swimmer) => [swimmer.swimmerIndexId, swimmer]));
    selectedChanges.forEach((change) => {
      if (!validatedById.has(change.swimmerIndexId)) throw new backendContext.HttpsError("invalid-argument", "Nageur invalide.");
    });

    const now = new Date().toISOString();
    let changedCount = 0;
    let updatedEntryData = null;
    await backendContext.db.runTransaction(async (transaction) => {
      const entry = await transaction.get(entryRef);
      const currentCompetition = await transaction.get(competitionRef);
      backendContext.assertEngagementClubWriteOpen(currentCompetition.data() || {});
      if (currentCompetition.updateTime.toMillis() !== competition.updateTime.toMillis()) throw new backendContext.HttpsError("aborted", "La compétition a changé. Rechargez la fiche.");
      if (!entry.exists || !backendContext.engagementTeamLeaderComplete(entry.data()?.teamLeader || {})) {
        throw new backendContext.HttpsError("failed-precondition", "Chef d'equipe ou renonciation obligatoire avant les nageurs.");
      }
      backendContext.assertEngagementSwimmerRoleCompatibility(entry.data() || {}, validatedSwimmers);
      const savedSwimmers = (Array.isArray(entry.data()?.swimmers) ? entry.data().swimmers : [])
        .map(backendContext.cleanEngagementEntrySwimmer)
        .filter((swimmer) => swimmer.swimmerIndexId);
      const swimmersById = new Map(savedSwimmers.map((swimmer) => [swimmer.swimmerIndexId, swimmer]));
      changes.forEach((change) => {
        const existed = swimmersById.has(change.swimmerIndexId);
        if (change.selected) {
          if (!existed) {
            swimmersById.set(change.swimmerIndexId, validatedById.get(change.swimmerIndexId));
            changedCount += 1;
          }
        } else if (existed) {
          swimmersById.delete(change.swimmerIndexId);
          changedCount += 1;
        }
      });
      const swimmers = Array.from(swimmersById.values());
      const relays = backendContext.qualificationRelaysAfterIndividualChange(entry.data()?.relays || [], swimmers, competition.data() || {});
      updatedEntryData = {
        ...(entry.data() || {}),
        swimmers,
        relays,
        updatedAt: changedCount ? now : backendContext.cleanText(entry.data()?.updatedAt),
        updatedBy: changedCount ? context.uid : backendContext.cleanText(entry.data()?.updatedBy)
      };
      if (!changedCount) return;
      backendContext.qualificationService().revokeRemovedExceptions(transaction, competitionId, savedSwimmers, swimmers, context.uid);
      transaction.set(entryRef, { swimmers, relays, updatedAt: now, updatedBy: context.uid }, { merge: true });
      validatedSwimmers.forEach((swimmer) => {
        if (!swimmer.licenseNumber || swimmer.licenseLocked) return;
        if (swimmer.source !== "reference") {
          const swimmerCollection = swimmer.source === "engagement" ? "engagementClubSwimmers" : backendContext.PERFORMANCE_SWIMMERS_COLLECTION;
          transaction.set(backendContext.db.collection(swimmerCollection).doc(swimmer.swimmerIndexId), {
            licenseNumber: backendContext.cleanText(swimmer.licenseNumber).slice(0, 60),
            licenseVerificationStatus: backendContext.cleanEngagementLicenseVerificationStatus(swimmer.licenseVerificationStatus, "pending"),
            licenseSeasonLabel: backendContext.cleanText(swimmer.licenseSeasonLabel).slice(0, 20),
            licenseSeasonStatus: backendContext.cleanEngagementLicenseSeasonStatus(swimmer.licenseSeasonStatus, "to_check"),
            licenseUpdatedAt: now,
            licenseUpdatedBy: context.uid,
            updatedAt: now,
            updatedBy: context.uid
          }, { merge: true });
        }
        transaction.set(backendContext.db.collection("engagementSwimmerLicenses").doc(backendContext.engagementSwimmerLicenseId(swimmer)), {
          ...backendContext.engagementSwimmerLicensePayload(swimmer, context, {
            type: "engagement",
            verificationSource: "club",
            competitionId,
            collectedAt: now
          }),
          updatedAt: now,
          updatedBy: context.uid
        }, { merge: true });
        backendContext.upsertEngagementClubRosterSwimmer(transaction, backendContext.db, swimmer, now);
      });
    });
    if (changedCount) {
      await backendContext.writeAuditLog("engagementClubEntry.swimmerSelectionsSaved", context.uid, {
        competitionId,
        clubId: context.clubId,
        requestedChangeCount: changes.length,
        changedCount
      });
    }
    return {
      ok: true,
      requestedChangeCount: changes.length,
      changedCount,
      readStats: backendContext.portalReadStats("saveEngagementClubSwimmerSelections", startedAt, {
        baseDocuments: 3,
        variableDocumentsMax: selectedChanges.length * 3,
        cacheHit: null
      }),
      entry: backendContext.engagementClubEntryItem({ id: entryRef.id, exists: true, data: () => updatedEntryData || {} })
    };
  }

  return { saveEngagementClubSwimmerSelections };
}

module.exports = { createClubHandlers_saveEngagementClubSwimmerSelections };
