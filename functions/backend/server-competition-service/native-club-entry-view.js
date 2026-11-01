// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionService_nativeClubEntryView(backendContext) {
  async function nativeClubEntryView(pack,context,competition) {
    return require("../../nap-entry-view").entryWithCourseRules(require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),pack,context,competition,{
      age:(date,birthDate)=>(backendContext.importSeasonYear(date)||backendContext.competitionYear(date))-backendContext.birthYear(birthDate),
      category:backendContext.ageCategoryFromDates,
      forbidden:(code,category)=>backendContext.ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES[code]?.has(category)===true
    });
  }

  return { nativeClubEntryView };
}

module.exports = { createCompetitionService_nativeClubEntryView };
