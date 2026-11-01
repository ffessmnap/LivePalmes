// Existing operation bodies; live services arrive through explicit accessors.
function createPerformanceHandlers_updateDtnSeason(backendContext) {
  function updateDtnSeason(request) { return backendContext.invokeDtnSeason("update", request); }

  return { updateDtnSeason };
}

module.exports = { createPerformanceHandlers_updateDtnSeason };
