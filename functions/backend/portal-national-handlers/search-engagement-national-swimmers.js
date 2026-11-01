// Existing operation bodies; live services arrive through explicit accessors.
function createNationalHandlers_searchEngagementNationalSwimmers(backendContext) {
  async function searchEngagementNationalSwimmers(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national) {
      throw new backendContext.HttpsError("permission-denied", "Recherche reservee au niveau national.");
    }
    const query = backendContext.cleanText(request.data?.query).slice(0, 120);
    const limit = Math.min(80, Math.max(10, Math.trunc(Number(request.data?.limit) || 40)));
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        const { searchPortalSwimmers: __nativeMember0 } = require("../../nap-portal-swimmer-readers");
const { portalPool: __nativeMember1 } = require("../../nap-portal-pool");
const nap = { searchPortalSwimmers: __nativeMember0, portalPool: __nativeMember1 };
        const result = await nap.searchPortalSwimmers(nap.portalPool(process.env.LIVEPALMES_NAP_PASSWORD), query);
        return { ok: true, query, source: "nap", hasMore: result.hasMore, swimmers: result.swimmers.map((item, index) => ({
          ...item, category: backendContext.currentEngagementCategoryFromBirthDate(item.birthDate),
          id: item.id, swimmerIndexId: item.id, swimmerId: item.id, source: "reference", napSource: true,
          firstName: item.firstName, lastName: item.lastName, birthDate: item.birthDate, sex: item.sex, name: item.name, clubId: item.clubId, club: item.club, clubName: item.clubName, identityKey: item.identityKey, napFingerprint: item.napFingerprint
        })) };
      } catch (error) {
        throw new backendContext.HttpsError(error instanceof TypeError ? "invalid-argument" : "unavailable", "Recherche NAP indisponible. Precisez le nom, le prenom ou l'identifiant.");
      }
    }
    const swimmers = await backendContext.searchEngagementNationalSwimmerDocs(backendContext.db, query, limit);
    return {
      ok: true,
      query,
      swimmers
    };
  }

  return { searchEngagementNationalSwimmers };
}

module.exports = { createNationalHandlers_searchEngagementNationalSwimmers };
