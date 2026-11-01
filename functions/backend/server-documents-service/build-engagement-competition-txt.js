// Existing operation bodies; live services arrive through explicit accessors.
function createDocumentsService_buildEngagementCompetitionTxt(backendContext) {
  function engagementTxtSwimmerCategory(swimmer = {}, competition = {}) {
    return backendContext.ageCategoryFromDates(competition.date, swimmer.birthDate) || "-";
  }

  function buildEngagementCompetitionTxt(competition = {}, entries = [], clubsById = new Map()) {
    const normalizedEntries = entries.map((entry) => ({
      ...entry,
      swimmers: (entry.swimmers || []).map((swimmer) => ({
        ...swimmer,
        category: engagementTxtSwimmerCategory(swimmer, competition)
      }))
    }));
    const result = backendContext.buildWinPalmeCompetitionTxt(competition, normalizedEntries, clubsById);
    return {
      ...result,
      fileName: `engagements-winpalme-${backendContext.engagementPdfFileName(competition.name || competition.id)}.txt`
    };
  }

  return { engagementTxtSwimmerCategory, buildEngagementCompetitionTxt };
}

module.exports = { createDocumentsService_buildEngagementCompetitionTxt };
