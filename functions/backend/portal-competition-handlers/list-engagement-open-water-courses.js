// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionHandlers_listEngagementOpenWaterCourses(backendContext) {
  async function listEngagementOpenWaterCourses(request) {
    const startedAt = Date.now();
    await backendContext.engagementAccessContext(request);
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") return require("../../nap-open-water-library").read(require("../../nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD));
    const snapshot = await backendContext.engagementOpenWaterCourseConfigRef().get();
    return {
      ok: true,
      courses: backendContext.cleanEngagementOpenWaterCourses(snapshot.exists ? snapshot.data()?.courses : []),
      readStats: backendContext.portalReadStats("listEngagementOpenWaterCourses", startedAt, {
        baseDocuments: 2,
        variableDocumentsMax: 0,
        cacheHit: snapshot.exists
      })
    };
  }

  return { listEngagementOpenWaterCourses };
}

module.exports = { createCompetitionHandlers_listEngagementOpenWaterCourses };
