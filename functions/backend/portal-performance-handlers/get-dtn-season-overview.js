// Existing operation bodies; live services arrive through explicit accessors.
function createPerformanceHandlers_getDtnSeasonOverview(backendContext) {
  function getDtnSeasonOverview(request) { return backendContext.invokeDtnSeason("overview", request); }

  return { getDtnSeasonOverview };
}

module.exports = { createPerformanceHandlers_getDtnSeasonOverview };
