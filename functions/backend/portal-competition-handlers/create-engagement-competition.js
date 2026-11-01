// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionHandlers_createEngagementCompetition(backendContext) {
  async function createEngagementCompetition(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      const raw=request.data || {};
      if (!["pool","openWater"].includes(raw.competitionType)) throw new backendContext.HttpsError("invalid-argument","Choisissez le type de competition.");
      return backendContext.createNativePortalCalendarRecord(raw,context,raw.competitionType);
    }
    if (!backendContext.ENGAGEMENT_COMPETITION_TYPES.has(backendContext.cleanText(request.data?.competitionType))) {
      throw new backendContext.HttpsError("invalid-argument", "Choisissez le type de competition : piscine ou eau libre.");
    }
    const competition = backendContext.cleanEngagementCompetitionPayload({
      ...(request.data || {}),
      entryStatus: "upcoming",
      entryDeadlineAt: ""
    }, context);
    if (request.data?.qualifications !== undefined) {
      if (!context.national) throw new backendContext.HttpsError("permission-denied", "Seul le National peut configurer les qualifications.");
      try { competition.qualifications = backendContext.qualificationEngine.validateRules(request.data.qualifications, backendContext.qualificationEvents(competition)); }
      catch (error) { throw new backendContext.HttpsError("invalid-argument", error.message); }
      if (competition.qualifications.enabled && competition.competitionType !== "pool") throw new backendContext.HttpsError("invalid-argument", "Qualifications réservées aux compétitions piscine.");
      if (competition.qualifications.enabled) competition.missingEntryTimeMode = "default595999";
      competition.qualificationVersion = 1;
    }
    const now = new Date().toISOString();
    const docRef = backendContext.db.collection("engagementCompetitions").doc();
    const payload = {
      ...competition,
      createdAt: now,
      createdBy: context.uid,
      updatedAt: now,
      updatedBy: context.uid
    };
    await docRef.set(payload);
    await backendContext.writeAuditLog("engagementCompetition.created", context.uid, {
      competitionId: docRef.id,
      name: payload.name,
      date: payload.date,
      regionId: payload.regionId,
      level: payload.level,
      entryStatus: payload.entryStatus
    });
    return {
      ok: true,
      competition: backendContext.engagementCompetitionListItem({
        id: docRef.id,
        data: () => payload
      })
    };
  }

  return { createEngagementCompetition };
}

module.exports = { createCompetitionHandlers_createEngagementCompetition };
