// Existing operation bodies; live services arrive through explicit accessors.
function createClubHandlers_listEngagementClubSwimmers(backendContext) {
  async function listEngagementClubSwimmers(request) {
    const startedAt = Date.now();
    const context = await backendContext.engagementClubAccessContext(request);
    const limit = Math.min(800, Math.max(50, Math.trunc(Number(request.data?.limit) || 400)));
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        const nap = require("../../nap-portal-swimmers");
        const people = await nap.listPortalClubSwimmers(nap.portalPool(process.env.LIVEPALMES_NAP_PASSWORD), context.clubId);
        return { ok: true, clubId: context.clubId, source: "nap", swimmers: people.map(item => ({
          ...item, category: backendContext.currentEngagementCategoryFromBirthDate(item.birthDate)
        })), readStats: backendContext.portalReadStats("listEngagementClubSwimmers", startedAt, { baseDocuments: 1, variableDocumentsMax: 0, cacheHit: false }) };
      } catch (error) {
        throw new backendContext.HttpsError(error instanceof TypeError ? "invalid-argument" : "unavailable", "Effectif NAP indisponible. " + (error instanceof RangeError ? error.message : "Reessayez le chargement."));
      }
    }
    const rosterSnapshot = await backendContext.engagementClubRosterRef(backendContext.db, context.clubId).get();
    const rosterReady = rosterSnapshot?.exists && backendContext.cleanText(rosterSnapshot.data()?.generatedAt);
    if (!rosterReady) {
      throw new backendContext.HttpsError(
        "unavailable",
        "Effectif agrege momentanement indisponible. Aucune reconstruction massive n'a ete lancee."
      );
    }
    const swimmers = backendContext.sortEngagementClubSwimmers(
      backendContext.uniqueEngagementClubSwimmers(backendContext.engagementClubRosterSwimmersFromData(rosterSnapshot.data() || {}), limit)
    );
    return {
      ok: true,
      clubId: context.clubId,
      rosterGenerated: false,
      readStats: backendContext.portalReadStats("listEngagementClubSwimmers", startedAt, {
        baseDocuments: 2,
        variableDocumentsMax: 0,
        cacheHit: true
      }),
      swimmers
    };
  }

  return { listEngagementClubSwimmers };
}

module.exports = { createClubHandlers_listEngagementClubSwimmers };
