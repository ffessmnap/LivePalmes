// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionService_assertCanManageEngagementCompetition(backendContext) {
  function assertCanManageEngagementCompetition(context = {}, competition = {}) {
    if (context.national) return;
    if (!context.region || !context.regionId) {
      throw new backendContext.HttpsError("permission-denied", "Droit gestion competition engagements requis.");
    }
    if (backendContext.isNationalOnlyEngagementCompetitionLevel(competition.level)) {
      throw new backendContext.HttpsError("permission-denied", "Competition nationale reservee au niveau national.");
    }
    if (!backendContext.engagementRegionsMatch(competition.regionId, context.regionId)) {
      throw new backendContext.HttpsError("permission-denied", "Competition hors perimetre regional.");
    }
  }

  return { assertCanManageEngagementCompetition };
}

module.exports = { createCompetitionService_assertCanManageEngagementCompetition };
