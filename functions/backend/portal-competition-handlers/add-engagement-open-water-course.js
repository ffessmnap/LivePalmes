// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionHandlers_addEngagementOpenWaterCourse(backendContext) {
  async function addEngagementOpenWaterCourse(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national && (!context.region || !context.regionId)) {
      throw new backendContext.HttpsError("permission-denied", "Droit regional ou national requis pour modifier la bibliotheque eau libre.");
    }
    if(!request.data?.discipline&&backendContext.ENVIRONMENT.sportingDataSource === "nap"){
      const distance=Number(request.data?.distance);
      if(!Number.isInteger(distance)||distance<1||distance>100000)throw new backendContext.HttpsError("invalid-argument","Distance entière de 1 à 100 000 mètres requise.");
      const courses=(distance===150?["SF","BI"]:["SF","BI","SUP"]).map(discipline=>backendContext.cleanEngagementOpenWaterCourse({distance,discipline}));
      const pool=require("../../nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),library=require("../../nap-open-water-library");
      let nativeReferencesCreated=0;
      try {
        const current=await library.readStored(pool);
        library.plan(current,{action:"addDistance",courses,expectedFingerprint:current.fingerprint});
        const native=await require("../../nap-open-water-reference-addition").ensureDistanceReferences(pool,{distance,actorUid:context.uid},
          payload=>require("../../nap-open-water-reference-backup").backupVerified(backendContext.db,context.uid,payload,process.env.LIVEPALMES_NAP_PASSWORD));
        nativeReferencesCreated=native.created;
        const result=await library.change(pool,{action:"addDistance",courses,expectedFingerprint:current.fingerprint},context.uid,saved=>backendContext.writeAuditLog("engagementOpenWaterCourse.nativeChange",context.uid,saved));
        return {...result,nativeReferencesReady:true,nativeReferencesCreated};
      }catch(error){
        if(error instanceof backendContext.HttpsError)throw error;
        const created=Number(error.nativeReferencesCreated)||nativeReferencesCreated;
        const message=created?`${created} référence(s) NAP créée(s) et sauvegardée(s), mais l'ajout de distance doit être repris. Aucune course de compétition ni aucun engagement modifié.`
          : error instanceof TypeError||error instanceof RangeError?error.message:"Ajout de distance NAP à vérifier. Reprenez la même distance ; les sauvegardes sont conservées.";
        throw new backendContext.HttpsError(error instanceof TypeError?"failed-precondition":error instanceof RangeError?"resource-exhausted":"unavailable",message);
      }
    }
    const course = backendContext.cleanEngagementOpenWaterCourse({
      distance: request.data?.distance,
      discipline: request.data?.discipline
    });
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") return require("../../nap-open-water-library").change(require("../../nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD), {action:"add",course}, context.uid, saved => backendContext.writeAuditLog("engagementOpenWaterCourse.nativeChange",context.uid,saved));
    const ref = backendContext.engagementOpenWaterCourseConfigRef();
    const now = new Date().toISOString();
    let courses = [];
    await backendContext.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      courses = backendContext.cleanEngagementOpenWaterCourses(snapshot.exists ? snapshot.data()?.courses : []);
      if (courses.some((item) => item.id === course.id)) {
        throw new backendContext.HttpsError("already-exists", "Cette course existe deja dans la bibliotheque eau libre.");
      }
      if (courses.length >= backendContext.ENGAGEMENT_OPEN_WATER_COURSE_LIMIT) {
        throw new backendContext.HttpsError("resource-exhausted", "La bibliotheque eau libre a atteint sa limite de courses.");
      }
      courses = [...courses, course].sort((left, right) => left.distance - right.distance || left.label.localeCompare(right.label, "fr"));
      transaction.set(ref, {
        courses,
        updatedAt: now,
        updatedBy: context.uid
      }, { merge: true });
    });
    await backendContext.writeAuditLog("engagementOpenWaterCourse.created", context.uid, {
      distance: course.distance,
      discipline: course.discipline,
      courseId: course.id
    });
    return { ok: true, course, courses };
  }

  return { addEngagementOpenWaterCourse };
}

module.exports = { createCompetitionHandlers_addEngagementOpenWaterCourse };
