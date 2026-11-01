// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_competitionIdFrom(backendContext) {
  function competitionIdFrom(data = {}) {
    const competitionId = backendContext.cleanText(data.competitionId || "livepalmes-active");
    if (!backendContext.COMPETITION_IDS.has(competitionId)) {
      throw new backendContext.HttpsError("invalid-argument", "Competition LivePalmes inconnue.");
    }
    return competitionId;
  }

  return { competitionIdFrom };
}

module.exports = { createAccessService_competitionIdFrom };
