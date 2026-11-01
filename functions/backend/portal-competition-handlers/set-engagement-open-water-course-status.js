// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionHandlers_setEngagementOpenWaterCourseStatus(backendContext) {
  async function setEngagementOpenWaterCourseStatus(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national && (!context.region || !context.regionId)) {
      throw new backendContext.HttpsError("permission-denied", "Droit regional ou national requis pour modifier la bibliotheque eau libre.");
    }
    const courseId = backendContext.cleanText(request.data?.courseId).slice(0, 60);
    const active = request.data?.active === true;
    if (!courseId) throw new backendContext.HttpsError("invalid-argument", "Course eau libre requise.");
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") return require("../../nap-open-water-library").change(require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD), {action:"status",courseId,active}, context.uid, saved => backendContext.writeAuditLog("engagementOpenWaterCourse.nativeChange",context.uid,saved));
    const ref = backendContext.engagementOpenWaterCourseConfigRef();
    const now = new Date().toISOString();
    let courses = [];
    await backendContext.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      courses = backendContext.cleanEngagementOpenWaterCourses(snapshot.exists ? snapshot.data()?.courses : []);
      const index = courses.findIndex((course) => course.id === courseId);
      if (index < 0) throw new backendContext.HttpsError("not-found", "Course eau libre introuvable.");
      courses[index] = { ...courses[index], active };
      transaction.set(ref, {
        courses,
        updatedAt: now,
        updatedBy: context.uid
      }, { merge: true });
    });
    await backendContext.writeAuditLog("engagementOpenWaterCourse.statusChanged", context.uid, { courseId, active });
    return { ok: true, courses };
  }

  return { setEngagementOpenWaterCourseStatus };
}

module.exports = { createCompetitionHandlers_setEngagementOpenWaterCourseStatus };
