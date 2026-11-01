// Existing operation bodies; live services arrive through explicit accessors.
function createPerformanceHandlers_listDtnSeasonSources(backendContext) {
  function listDtnSeasonSources(request) { return backendContext.invokeDtnSeason("sources", request); }

  return { listDtnSeasonSources };
}

module.exports = { createPerformanceHandlers_listDtnSeasonSources };
