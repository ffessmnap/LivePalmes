// Existing operation bodies; live services arrive through explicit accessors.
function createNationalHandlers_searchEngagementNationalSwimmerMergeTargets(backendContext) {
  async function searchEngagementNationalSwimmerMergeTargets(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national) {
      throw new backendContext.HttpsError("permission-denied", "Recherche reservee au niveau national.");
    }
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        const pool = require("../../nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
        return await require("../../nap-swimmer-merge-search").searchMergeTargets(pool, {sourceSwimmerId:request.data?.sourceSwimmerId,query:request.data?.query});
      } catch (error) {
        throw new backendContext.HttpsError(error instanceof TypeError ? "invalid-argument" : "unavailable", "Recherche NAP indisponible. Precisez le nom, le prenom ou l'identifiant de la fiche a conserver.");
      }
    }
    const sourceSwimmerId = backendContext.cleanText(request.data?.sourceSwimmerId).slice(0, 80);
    const sourceSource = backendContext.cleanText(request.data?.sourceSource || "engagement").slice(0, 40);
    const query = backendContext.cleanText(request.data?.query).slice(0, 100);
    const limit = Math.min(40, Math.max(5, Math.trunc(Number(request.data?.limit) || 20)));
    const source = await backendContext.getEngagementNationalSwimmerForMerge(backendContext.db, sourceSource, sourceSwimmerId);
    const sourceKey = `${source.source}:${sourceSwimmerId}`;
    const swimmers = (query
      ? await backendContext.searchEngagementNationalSwimmerDocs(backendContext.db, query, limit + 1)
      : (await backendContext.searchEngagementNationalSwimmerMergeTargetDocs(backendContext.db, source.swimmer, query, limit + 1))
        .map((item) => backendContext.engagementNationalSwimmerItemFromDoc(item.doc, item.source)))
      .filter((swimmer) => `${swimmer.source || "performances"}:${swimmer.id || swimmer.swimmerIndexId}` !== sourceKey)
      .filter((swimmer) => swimmer.status !== "merged" && !swimmer.mergedIntoId)
      .slice(0, limit);
    return {
      ok: true,
      swimmers
    };
  }

  return { searchEngagementNationalSwimmerMergeTargets };
}

module.exports = { createNationalHandlers_searchEngagementNationalSwimmerMergeTargets };
