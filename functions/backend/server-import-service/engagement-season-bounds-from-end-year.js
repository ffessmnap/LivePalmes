// Existing operation bodies; live services arrive through explicit accessors.
function createImportService_engagementSeasonBoundsFromEndYear(backendContext) {
  function engagementSeasonBoundsFromEndYear(endYear) {
    const year = Math.trunc(Number(endYear) || (0, backendContext.local$currentEngagementSeasonInfo)(new Date()).endYear);
    return {
      startYear: year - 1,
      endYear: year,
      label: `${year - 1}-${year}`,
      startDate: `${year - 1}-09-01`,
      endDate: `${year}-08-31`
    };
  }

  return { engagementSeasonBoundsFromEndYear };
}

module.exports = { createImportService_engagementSeasonBoundsFromEndYear };
