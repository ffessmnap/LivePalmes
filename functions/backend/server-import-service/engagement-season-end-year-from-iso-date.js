// Existing operation bodies; live services arrive through explicit accessors.
function createImportService_engagementSeasonEndYearFromIsoDate(backendContext) {
  function engagementSeasonEndYearFromIsoDate(dateIso = "") {
    const cleanDate = backendContext.cleanIsoDate(dateIso);
    if (!cleanDate) return (0, backendContext.local$currentEngagementSeasonInfo)(new Date()).endYear;
    return (0, backendContext.local$importSeasonYear)(cleanDate) || (0, backendContext.local$currentEngagementSeasonInfo)(new Date()).endYear;
  }

  return { engagementSeasonEndYearFromIsoDate };
}

module.exports = { createImportService_engagementSeasonEndYearFromIsoDate };
