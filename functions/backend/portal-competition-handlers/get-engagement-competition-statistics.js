// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionHandlers_getEngagementCompetitionStatistics(backendContext) {
  async function getEngagementCompetitionStatistics(request) {
    const startedAt = Date.now();
    const context = await backendContext.engagementAccessContext(request);
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    if (!competitionId) throw new backendContext.HttpsError("invalid-argument", "Competition requise.");
    if(backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      const result=await backendContext.nativeAdminCompetitionEntries(context,competitionId);
      return {ok:true,source:"nap",competitionId,generatedAt:result.generatedAt,...backendContext.engagementCompetitionStatisticsItem(result.entries,result.competition),sqlBudget:result.sqlBudget};
    }
    const competitionRef = backendContext.db.collection("engagementCompetitions").doc(competitionId);
    const cacheRef = backendContext.engagementCompetitionStatisticsCacheRef(backendContext.db, competitionId);
    const [competitionSnapshot, cacheSnapshot] = await backendContext.db.getAll(competitionRef, cacheRef);
    if (!competitionSnapshot.exists) throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    backendContext.assertCanManageEngagementCompetition(context, competitionSnapshot.data() || {});
    const competition = backendContext.engagementCompetitionDetailItem(competitionSnapshot);
    const cachedStatistics = cacheSnapshot.exists
      ? backendContext.decodeEngagementCompetitionStatisticsCache(cacheSnapshot.data() || {}, competition)
      : null;
    if (cachedStatistics && request.data?.force !== true) {
      return {
        ok: true,
        competitionId,
        generatedAt: backendContext.cleanText(cacheSnapshot.data()?.generatedAt).slice(0, 40) || new Date().toISOString(),
        ...cachedStatistics,
        readStats: backendContext.portalReadStats("getEngagementCompetitionStatistics", startedAt, {
          baseDocuments: 2,
          cacheHit: true
        })
      };
    }
    const entriesSnapshot = await backendContext.db.collection("engagementClubEntries")
      .where("competitionId", "==", competitionId)
      .limit(500)
      .get();
    const entries = entriesSnapshot.docs.map((doc) => backendContext.engagementClubEntryItem(doc));
    const statistics = backendContext.engagementCompetitionStatisticsItem(entries, competition);
    const generatedAt = new Date().toISOString();
    const payloadGzip = backendContext.encodeEngagementCompetitionStatisticsCache(statistics);
    await cacheRef.set({
      competitionId,
      competitionUpdatedAt: backendContext.cleanText(competition.updatedAt).slice(0, 40),
      generatedAt,
      updatedAt: generatedAt,
      status: payloadGzip ? "ready" : "too_large",
      payloadEncoding: payloadGzip ? "gzip-base64" : "",
      payloadGzip,
      sourceEntryCount: entriesSnapshot.size
    }, { merge: false });
    return {
      ok: true,
      competitionId,
      generatedAt,
      ...statistics,
      readStats: backendContext.portalReadStats("getEngagementCompetitionStatistics", startedAt, {
        baseDocuments: 2 + entriesSnapshot.size,
        cacheHit: false
      })
    };
  }

  return { getEngagementCompetitionStatistics };
}

module.exports = { createCompetitionHandlers_getEngagementCompetitionStatistics };
