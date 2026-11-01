// Existing operation bodies; live services arrive through explicit accessors.
function createPerformanceHandlers_getDtnSeasons(backendContext) {
  function getDtnSeasons(request) { return backendContext.invokeDtnSeason("list", request); }

  return { getDtnSeasons };
}

module.exports = { createPerformanceHandlers_getDtnSeasons };
