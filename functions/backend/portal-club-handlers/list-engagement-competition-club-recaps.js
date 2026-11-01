// Existing operation bodies; live services arrive through explicit accessors.
function createClubHandlers_listEngagementCompetitionClubRecaps(backendContext) {
  async function listEngagementCompetitionClubRecaps(request) {
    const context = await backendContext.engagementAccessContext(request);
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    if (!competitionId) {
      throw new backendContext.HttpsError("invalid-argument", "Competition requise.");
    }
    if(backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      const result=await backendContext.nativeAdminCompetitionEntries(context,competitionId);
      return {ok:true,source:"nap",competitionId,summaryGenerated:false,summaryReady:true,entries:result.entries.filter(backendContext.engagementClubEntryHasParticipants).map(entry=>({...backendContext.engagementCompetitionEntrySummaryItem(entry),totalFee:backendContext.engagementPdfFeeTotal(entry,result.competition)})),sqlBudget:result.sqlBudget};
    }
    const competition = await backendContext.db.collection("engagementCompetitions").doc(competitionId).get();
    if (!competition.exists) {
      throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    }
    backendContext.assertCanManageEngagementCompetition(context, competition.data() || {});
    const summarySnapshot = await backendContext.engagementCompetitionEntrySummaryRef(backendContext.db, competitionId).get();
    const summaryReady = summarySnapshot?.exists && backendContext.cleanText(summarySnapshot.data()?.generatedAt);
    const summaryEntries = summarySnapshot?.exists
      ? backendContext.engagementCompetitionEntrySummariesFromData(summarySnapshot.data() || {})
      : [];
    const competitionDetail = backendContext.engagementCompetitionDetailItem(competition);
    const entries = summaryEntries.map((entry) => ({
      ...entry,
      totalFee: backendContext.engagementPdfFeeTotal(entry, competitionDetail)
    }));
    return {
      ok: true,
      competitionId,
      collection: backendContext.ENGAGEMENT_COMPETITION_ENTRY_SUMMARIES_COLLECTION,
      summaryGenerated: false,
      summaryReady: Boolean(summaryReady),
      entries
    };
  }

  return { listEngagementCompetitionClubRecaps };
}

module.exports = { createClubHandlers_listEngagementCompetitionClubRecaps };
