// Existing operation bodies; live services arrive through explicit accessors.
function createClubHandlers_saveEngagementClubSwimmerSelection(backendContext) {
  async function saveEngagementClubSwimmerSelection(request) {
    const context = await backendContext.engagementClubAccessContext(request);
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") return backendContext.saveNativeClubSwimmerSelections(context,request,[{swimmerIndexId:request.data?.swimmer?.swimmerIndexId || request.data?.swimmerIndexId,selected:request.data?.selected}]);
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    const swimmerIndexId = backendContext.cleanText(request.data?.swimmer?.swimmerIndexId || request.data?.swimmerIndexId).slice(0, 80);
    const selected = request.data?.selected === true;
    if (!competitionId) {
      throw new backendContext.HttpsError("invalid-argument", "Competition requise.");
    }
    if (!swimmerIndexId) {
      throw new backendContext.HttpsError("invalid-argument", "Nageur requis.");
    }

    const competitionRef = backendContext.db.collection("engagementCompetitions").doc(competitionId);
    const entryRef = backendContext.db.collection("engagementClubEntries").doc(backendContext.engagementClubEntryId(competitionId, context.clubId));
    const competition = await competitionRef.get();
    if (!competition.exists) {
      throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    }
    backendContext.assertEngagementClubWriteOpen(competition.data() || {});

    let validatedSwimmer = null;
    if (selected) {
      const swimmers = await backendContext.buildEngagementClubSwimmersFromRequest({ swimmers: [request.data?.swimmer || {}] }, context, { ...competition.data(), id: competition.id });
      validatedSwimmer = swimmers[0] || null;
      if (!validatedSwimmer || validatedSwimmer.swimmerIndexId !== swimmerIndexId) {
        throw new backendContext.HttpsError("invalid-argument", "Nageur invalide.");
      }
    }

    const now = new Date().toISOString();
    let changed = false;
    let updatedEntryData = null;
    await backendContext.db.runTransaction(async (transaction) => {
      const entry = await transaction.get(entryRef);
      const currentCompetition = await transaction.get(competitionRef);
      backendContext.assertEngagementClubWriteOpen(currentCompetition.data() || {});
      if (currentCompetition.updateTime.toMillis() !== competition.updateTime.toMillis()) throw new backendContext.HttpsError("aborted", "La compétition a changé. Rechargez la fiche.");
      if (!entry.exists || !backendContext.engagementTeamLeaderComplete(entry.data()?.teamLeader || {})) {
        throw new backendContext.HttpsError("failed-precondition", "Chef d'equipe ou renonciation obligatoire avant les nageurs.");
      }
      if (selected && validatedSwimmer) backendContext.assertEngagementSwimmerRoleCompatibility(entry.data() || {}, [validatedSwimmer]);
      const savedSwimmers = (Array.isArray(entry.data()?.swimmers) ? entry.data().swimmers : [])
        .map(backendContext.cleanEngagementEntrySwimmer)
        .filter((swimmer) => swimmer.swimmerIndexId);
      const alreadySelected = savedSwimmers.some((swimmer) => swimmer.swimmerIndexId === swimmerIndexId);
      const swimmers = selected
        ? (alreadySelected ? savedSwimmers : [...savedSwimmers, validatedSwimmer])
        : savedSwimmers.filter((swimmer) => swimmer.swimmerIndexId !== swimmerIndexId);
      const relays = backendContext.qualificationRelaysAfterIndividualChange(entry.data()?.relays || [], swimmers, competition.data() || {});
      changed = selected !== alreadySelected;
      updatedEntryData = {
        ...(entry.data() || {}),
        swimmers,
        relays,
        updatedAt: changed ? now : backendContext.cleanText(entry.data()?.updatedAt),
        updatedBy: changed ? context.uid : backendContext.cleanText(entry.data()?.updatedBy)
      };
      if (!changed) return;
      backendContext.qualificationService().revokeRemovedExceptions(transaction, competitionId, savedSwimmers, swimmers, context.uid);
      transaction.set(entryRef, {
        swimmers,
        relays,
        updatedAt: now,
        updatedBy: context.uid
      }, { merge: true });
      if (!selected || !validatedSwimmer) return;
      if (validatedSwimmer.licenseNumber && !validatedSwimmer.licenseLocked && validatedSwimmer.source !== "reference") {
        const swimmerCollection = validatedSwimmer.source === "engagement" ? "engagementClubSwimmers" : backendContext.PERFORMANCE_SWIMMERS_COLLECTION;
        transaction.set(backendContext.db.collection(swimmerCollection).doc(validatedSwimmer.swimmerIndexId), {
          licenseNumber: backendContext.cleanText(validatedSwimmer.licenseNumber).slice(0, 60),
          licenseVerificationStatus: backendContext.cleanEngagementLicenseVerificationStatus(validatedSwimmer.licenseVerificationStatus, "pending"),
          licenseSeasonLabel: backendContext.cleanText(validatedSwimmer.licenseSeasonLabel).slice(0, 20),
          licenseSeasonStatus: backendContext.cleanEngagementLicenseSeasonStatus(validatedSwimmer.licenseSeasonStatus, "to_check"),
          licenseUpdatedAt: now,
          licenseUpdatedBy: context.uid,
          updatedAt: now,
          updatedBy: context.uid
        }, { merge: true });
      }
      if (validatedSwimmer.licenseNumber && !validatedSwimmer.licenseLocked) {
        const licenseRef = backendContext.db.collection("engagementSwimmerLicenses").doc(backendContext.engagementSwimmerLicenseId(validatedSwimmer));
        transaction.set(licenseRef, {
          ...backendContext.engagementSwimmerLicensePayload(validatedSwimmer, context, {
            type: "engagement",
            verificationSource: "club",
            competitionId,
            collectedAt: now
          }),
          updatedAt: now,
          updatedBy: context.uid
        }, { merge: true });
      }
      backendContext.upsertEngagementClubRosterSwimmer(transaction, backendContext.db, validatedSwimmer, now);
    });

    if (changed) {
      await backendContext.writeAuditLog(selected ? "engagementClubEntry.swimmerAdded" : "engagementClubEntry.swimmerRemoved", context.uid, {
        competitionId,
        clubId: context.clubId,
        swimmerIndexId
      });
    }
    return {
      ok: true,
      changed,
      selected,
      entry: backendContext.engagementClubEntryItem({
        id: entryRef.id,
        exists: true,
        data: () => updatedEntryData || {}
      })
    };
  }

  return { saveEngagementClubSwimmerSelection };
}

module.exports = { createClubHandlers_saveEngagementClubSwimmerSelection };
