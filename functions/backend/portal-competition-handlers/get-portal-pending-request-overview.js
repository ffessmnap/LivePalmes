// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionHandlers_getPortalPendingRequestOverview(backendContext) {
  async function getPortalPendingRequestOverview(request) {
    const context = await backendContext.accessManagementContext(request);
    let accessRequestsQuery = backendContext.db.collection("engagementAccessRequests").where("status", "==", "pending");
    if (!context.national) {
      if (!context.regionId) {
        throw new backendContext.HttpsError("failed-precondition", "Perimetre regional requis.");
      }
      accessRequestsQuery = accessRequestsQuery.where("regionId", "==", context.regionId);
    }
    const [accessSnapshot, nationalRequests] = await Promise.all([
      accessRequestsQuery.count().get(),
      context.national ? backendContext.engagementNationalAdministrationPendingCounts() : Promise.resolve(null)
    ]);
    return {
      ok: true,
      scope: {
        type: context.national ? "national" : "region",
        regionId: context.national ? "" : context.regionId
      },
      accessRequests: {
        pending: Math.max(0, Number(accessSnapshot.data()?.count || 0))
      },
      nationalRequests
    };
  }

  return { getPortalPendingRequestOverview };
}

module.exports = { createCompetitionHandlers_getPortalPendingRequestOverview };
