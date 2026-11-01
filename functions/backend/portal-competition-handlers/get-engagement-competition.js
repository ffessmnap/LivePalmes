// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionHandlers_getEngagementCompetition(backendContext) {
  async function getEngagementCompetition(request) {
    const context = await backendContext.engagementAccessContext(request);
    if(request.data?.action!==undefined){
      if(request.data.action!=="import-source"||backendContext.ENVIRONMENT.sportingDataSource!=="nap")throw new backendContext.HttpsError("invalid-argument","Action de consultation invalide.");
      if(!context.national&&(!context.region||!context.regionId))throw new backendContext.HttpsError("permission-denied","TXT réservé aux administrations régionale et nationale.");
      try{return await require("../../nap-import-private-text").readCurrent(require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),request.data.competitionId,event=>backendContext.assertCanManageEngagementCompetition(context,event));}
      catch(error){throw backendContext.nativePerformanceFailure(error);}
    }
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    if (!competitionId) {
      throw new backendContext.HttpsError("invalid-argument", "Competition requise.");
    }
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      const competition = await backendContext.nativePortalCompetition(competitionId, event => backendContext.assertCanManageEngagementCompetition(context, event), true);
      return { ok: true, source: "nap", competition: { ...competition, regionalPastReadOnly: !context.national && backendContext.engagementEventIsPast(competition) } };
    }
    const doc = await backendContext.db.collection("engagementCompetitions").doc(competitionId).get();
    if (!doc.exists) {
      throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    }
    backendContext.assertCanManageEngagementCompetition(context, doc.data() || {});
    const deletionRequest = await backendContext.db.collection("engagementCompetitionDeletionRequests").doc(competitionId).get();
    const deletionRequestData = deletionRequest.exists ? deletionRequest.data() || {} : {};
    return {
      ok: true,
      competition: {
        ...backendContext.engagementCompetitionDetailItem(doc, { includeDocumentUploader: true }),
        regionalPastReadOnly: !context.national && backendContext.engagementEventIsPast(doc.data() || {}),
        deletionRequestStatus: deletionRequestData.status === "pending" ? "pending" : ""
      }
    };
  }

  return { getEngagementCompetition };
}

module.exports = { createCompetitionHandlers_getEngagementCompetition };
