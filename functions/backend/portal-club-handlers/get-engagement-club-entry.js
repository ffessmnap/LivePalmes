// Existing operation bodies; live services arrive through explicit accessors.
function createClubHandlers_getEngagementClubEntry(backendContext) {
  async function getEngagementClubEntry(request) {
    const startedAt = Date.now();
    const context = await backendContext.engagementClubAccessContext(request);
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    if (!competitionId) {
      throw new backendContext.HttpsError("invalid-argument", "Competition requise.");
    }
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      const competition = await backendContext.nativePortalCompetition(competitionId, () => {});
      const pool = require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
      const pack = await require("../../nap-portal-entries").readNativeClubEntry(pool, { competitionId, clubId: context.clubId }, ({ clubId }) => {
        if (String(clubId) !== String(context.clubId)) throw new backendContext.HttpsError("permission-denied", "Dossier hors du club autorise.");
      });
      return { ok: true, source: "nap", competition: { ...competition, nativeTeamLeaderEditable: pack.leaders.length <= 1, nativeTeamLeaderRequired: pack.leaders.length === 0, nativeRelaysEditable: competition.competitionType === "pool" && pack.leaders.length === 1 && !require("../../nap-swimmer-entry-plan").selectionLockReason(competition), nativeOfficialsEditable: pack.leaders.length === 1 && new Set((pack.officials || []).map(row=>String(row.officiel))).size<=80, nativeIndividualEntriesEditable: pack.leaders.length === 1 && !require("../../nap-entry-course-rules").courseLockReason(competition), nativeSwimmerSelectionEditable: pack.leaders.length === 1 && !require("../../nap-swimmer-entry-plan").selectionLockReason(competition) }, entry: await backendContext.nativeClubEntryView(pack,context,competition),
        readStats: backendContext.portalReadStats("getEngagementClubEntry", startedAt, { baseDocuments: 1, variableDocumentsMax: 0, cacheHit: false }),
        sqlBudget: { queriesMax: 26, rowsMax: 20520, accessQueriesMax: 1, profileDocumentsMax: 1 } };
    }
    const competitionRef = backendContext.db.collection("engagementCompetitions").doc(competitionId);
    const entryRef = backendContext.db.collection("engagementClubEntries").doc(backendContext.engagementClubEntryId(competitionId, context.clubId));
    const [competition, entry] = await backendContext.db.getAll(competitionRef, entryRef);
    if (!competition.exists) {
      throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    }
    return {
      ok: true,
      competition: backendContext.engagementCompetitionDetailItem(competition),
      entry: backendContext.engagementClubEntryItem(entry, {
        competitionId,
        clubId: context.clubId,
        clubName: context.clubName,
        regionId: context.regionId,
        status: "active"
      }),
      readStats: backendContext.portalReadStats("getEngagementClubEntry", startedAt, {
        baseDocuments: 3,
        cacheHit: false
      })
    };
  }

  return { getEngagementClubEntry };
}

module.exports = { createClubHandlers_getEngagementClubEntry };
