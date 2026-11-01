// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionService_nativeAdminCompetitionEntries(backendContext) {
  async function nativeAdminCompetitionEntries(context,competitionId) {
    try {
      const competition=await (0, backendContext.local$nativePortalCompetition)(competitionId,event=>(0, backendContext.local$assertCanManageEngagementCompetition)(context,event));
      const pool=require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
      const result=await require("../../nap-admin-entries").readAdminEntries(pool,{competitionId,competition},event=>(0, backendContext.local$assertCanManageEngagementCompetition)(context,event),{category:backendContext.ageCategoryFromDates});
      return {...result,competition,sqlBudget:{...result.sqlBudget,queriesMax:24,dossierRowsMax:result.sqlBudget.rowsMax}};
    } catch(error) {
      if(error instanceof backendContext.HttpsError) throw error;
      throw new backendContext.HttpsError(error instanceof RangeError?"resource-exhausted":error instanceof TypeError?"failed-precondition":"unavailable",error instanceof RangeError || error instanceof TypeError?error.message:"Lecture des engagements NAP indisponible.");
    }
  }

  return { nativeAdminCompetitionEntries };
}

module.exports = { createCompetitionService_nativeAdminCompetitionEntries };
