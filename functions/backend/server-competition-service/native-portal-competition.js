// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionService_nativePortalCompetition(backendContext) {
  async function nativePortalCompetition(input, authorize, includeUploaders=false) {
    const pool = require("../../nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
    const native = require("../../nap-portal-competitions");
    const view = require("../../nap-portal-workspaces");
    const pack = await native.readNativeCompetition(pool, input, authorize);
    if (!pack) throw new backendContext.HttpsError("not-found", "Competition NAP introuvable.");
    const competition = view.competitionItem(pack, backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE);
    competition.qualificationJobId=await require("../../nap-qualification-jobs").activeControl(pool,input);
    competition.nativeSelectionLockReason=require("../../nap-swimmer-entry-plan").selectionLockReason(competition);
    competition.clubDocuments = await view.readDocuments(pool, input, {includeUploader:includeUploaders});
    if(includeUploaders)competition.clubDocuments=await (0, backendContext.local$nativeDocumentAuthors)(competition.clubDocuments);
    competition.documentCount = competition.clubDocuments.length;
    return competition;
  }

  return { nativePortalCompetition };
}

module.exports = { createCompetitionService_nativePortalCompetition };
