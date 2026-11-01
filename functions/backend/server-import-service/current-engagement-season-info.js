// Existing operation bodies; live services arrive through explicit accessors.
function createImportService_currentEngagementSeasonInfo(backendContext) {
  function currentEngagementSeasonInfo(date = new Date()) {
    const year = date.getUTCFullYear();
    const startYear = date.getUTCMonth() >= 8 ? year : year - 1;
    return {
      startYear,
      endYear: startYear + 1,
      label: `${startYear}-${startYear + 1}`
    };
  }

  return { currentEngagementSeasonInfo };
}

module.exports = { createImportService_currentEngagementSeasonInfo };
