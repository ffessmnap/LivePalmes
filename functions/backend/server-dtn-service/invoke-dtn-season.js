// Existing operation bodies; live services arrive through explicit accessors.
function createDtnService_invokeDtnSeason(backendContext) {
  async function invokeDtnSeason(method, request) {
    if (backendContext.ENVIRONMENT.sportingDataSource !== "nap") return (0, backendContext.local$dtnSeasonService)()[method](request);
    try { return await (0, backendContext.local$dtnSeasonService)()[method](request); }
    catch (error) {
      if (error instanceof backendContext.HttpsError) throw error;
      if (error instanceof TypeError || error instanceof RangeError) throw new backendContext.HttpsError("failed-precondition", error.message);
      throw new backendContext.HttpsError("unavailable", "La DTN est temporairement indisponible. Reessayez dans quelques instants.");
    }
  }

  return { invokeDtnSeason };
}

module.exports = { createDtnService_invokeDtnSeason };
