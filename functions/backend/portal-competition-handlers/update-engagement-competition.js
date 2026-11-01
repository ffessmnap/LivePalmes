// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionHandlers_updateEngagementCompetition(backendContext) {
  async function updateEngagementCompetition(request) {
    const context = await backendContext.engagementAccessContext(request);
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    if (!competitionId) {
      throw new backendContext.HttpsError("invalid-argument", "Competition requise.");
    }
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      const nativeChange = require("../../nap-portal-competition-change");
      const pool = require("../../nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
      const authorize = event => backendContext.assertCanModifyEngagementEvent(context,event);
      try {
        const patch={...(request.data?.patch||{})},incoming=request.data?.qualifications??patch.qualifications;
        if(request.data?.notificationOpeningRequested!==undefined&&typeof request.data.notificationOpeningRequested!=='boolean')throw new TypeError("Choix du mail d'ouverture invalide.");
        delete patch.qualifications;
        if(incoming!==undefined||['date','qualificationStartDate','qualificationEndDate','courseOptions'].some(key=>Object.hasOwn(patch,key))){
          const pack=await require("../../nap-portal-competitions").readNativeCompetition(pool,competitionId,authorize);
          if(!pack)throw new backendContext.HttpsError("not-found","Competition NAP introuvable.");
          const services=backendContext.nativeQualificationServices(context),events=services.eventsFor(pack),previous=services.competitionFor(pack).qualifications;
          let rules=previous;
          if(incoming!==undefined){try{rules=backendContext.qualificationEngine.validateRules(incoming,events,false);}catch(error){throw new backendContext.HttpsError('invalid-argument',error.message);}}
          const changed=!require('node:util').isDeepStrictEqual(previous,rules);
          const affects=changed||rules.enabled&&['date','qualificationStartDate','qualificationEndDate','courseOptions'].some(key=>Object.hasOwn(patch,key));
          if(affects){
            if(!context.national)throw new backendContext.HttpsError("permission-denied","Cette modification affecte les qualifications : intervention nationale requise.");
            return await require("../../nap-qualification-control-start").beginControl(pool,{competitionId,actorUid:context.uid,national:true,expectedFingerprint:request.data?.expectedFingerprint,patch,rules,events,notificationOpeningRequested:request.data?.notificationOpeningRequested===true},services);
          }
          if(!Object.keys(patch).length)return {ok:true,unchanged:true,competition:await backendContext.nativePortalCompetition(competitionId,event=>backendContext.assertCanManageEngagementCompetition(context,event))};
        }
        const applyNativeChange = Object.hasOwn(patch,"removeNativeCourseIds") ? require("../../nap-open-water-course-removal").removeNativeCourses
          : Object.hasOwn(patch,"addNativeCourses") ? require("../../nap-course-addition").addNativeCourses
          : Object.hasOwn(request.data?.patch || {},"removeNativeCourseId") ? require("../../nap-course-removal").removeNativeCourse : nativeChange.applyCompetitionChange;
        const result = await require("../../nap-qualification-edit-lock").ordinaryEdit(pool,competitionId,()=>applyNativeChange(pool, {
          competitionId, actorUid:context.uid,national:context.national,expectedFingerprint:request.data?.expectedFingerprint,patch,
          eventDefinitions:backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE,normalizeProgram:backendContext.cleanEngagementProgramSessions,normalizeEvents:backendContext.cleanEngagementCompetitionEvents
        }, {
          read:async operation => { const snapshot=await backendContext.db.collection("auditLogs").doc(`nap-competition-${operation}-before`).get(); return snapshot.exists ? snapshot.data().target : null; },
          prepare:(operation,target) => backendContext.db.collection("auditLogs").doc(`nap-competition-${operation}-before`).create({action:"nap.competition.change.prepare",actorUid:context.uid,target:{...target,notificationOpeningRequested:request.data?.notificationOpeningRequested===true},createdAt:new Date().toISOString()}),
          complete:async(operation,target) => {await backendContext.armNativeCompetitionNotification(context,{competitionId,patch},operation);await backendContext.writeAuditLogOnce("nap.competition.changed",context.uid,{...target,auditPreparationId:`nap-competition-${operation}-before`},operation);}
        },authorize),{authorize});
        const competition=await backendContext.nativePortalCompetition(competitionId,event=>backendContext.assertCanManageEngagementCompetition(context,event));
        return {...result,competition:{...competition,regionalPastReadOnly:!context.national && backendContext.engagementEventIsPast(competition)}};
      } catch(error) {
        if(error instanceof backendContext.HttpsError) throw error;
        throw new backendContext.HttpsError(error instanceof TypeError ? "failed-precondition" : error instanceof RangeError ? "resource-exhausted" : "unavailable",error instanceof TypeError || error instanceof RangeError ? error.message : "Enregistrement NAP a verifier. Reprenez la meme modification ; la sauvegarde est conservee.");
      }
    }
    const docRef = backendContext.db.collection("engagementCompetitions").doc(competitionId);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    }
    backendContext.assertCanModifyEngagementEvent(context, snapshot.data() || {});
    const competition = backendContext.cleanEngagementCompetitionPayload(request.data || {}, context);
    const storedCompetitionType = backendContext.cleanEngagementCompetitionType(snapshot.data()?.competitionType);
    if (competition.competitionType !== storedCompetitionType) {
      throw new backendContext.HttpsError("failed-precondition", "Le type de competition ne peut pas etre modifie apres sa creation.");
    }
    if (storedCompetitionType === "openWater" && Array.isArray(competition.events)) {
      const courseSnapshot = await backendContext.engagementOpenWaterCourseConfigRef().get();
      const configuredCourses = backendContext.cleanEngagementOpenWaterCourses(courseSnapshot.exists ? courseSnapshot.data()?.courses : []);
      const existingCourseIds = new Set(backendContext.cleanEngagementCompetitionEvents(snapshot.data()?.events || [], {
        strict: false,
        competitionType: "openWater"
      }).map((event) => event.openWaterCourseId).filter(Boolean));
      const selectableCourseIds = new Set(configuredCourses
        .filter((course) => course.active !== false || existingCourseIds.has(course.id))
        .map((course) => course.id));
      const unknownCourse = competition.events.find((event) =>
        event.type === "individual" && !selectableCourseIds.has(event.openWaterCourseId)
      );
      if (unknownCourse) {
        throw new backendContext.HttpsError("failed-precondition", "Une course eau libre n'est pas disponible dans la bibliotheque nationale.");
      }
    }
    backendContext.assertCanManageEngagementCompetition(context, competition);
    if (snapshot.data()?.qualificationJobId) throw new backendContext.HttpsError("failed-precondition", "Un contrôle de qualification est déjà en cours.");
    const incoming = request.data?.qualifications;
    if (incoming !== undefined && !context.national && JSON.stringify(incoming) !== JSON.stringify(snapshot.data()?.qualifications || { enabled: false })) {
      throw new backendContext.HttpsError("permission-denied", "Seul le National peut modifier les qualifications.");
    }
    let qualifications;
    try {
      qualifications = backendContext.qualificationEngine.validateRules(incoming === undefined ? snapshot.data()?.qualifications : incoming,
        backendContext.qualificationEvents({ ...snapshot.data(), ...competition }), competition.entryStatus === "open");
    } catch (error) { throw new backendContext.HttpsError("invalid-argument", error.message); }
    if (qualifications.enabled && competition.competitionType !== "pool") throw new backendContext.HttpsError("invalid-argument", "Qualifications réservées aux compétitions piscine.");
    const now = new Date().toISOString();
    const payload = { ...competition, qualifications, ...(qualifications.enabled ? { missingEntryTimeMode: "default595999" } : {}), updatedAt: now, updatedBy: context.uid };
    const affectsQualifications = JSON.stringify(qualifications) !== JSON.stringify(snapshot.data()?.qualifications || { enabled: false, groups: [], standards: {} }) ||
      (qualifications.enabled && (snapshot.data()?.missingEntryTimeMode !== "default595999" || competition.date !== snapshot.data()?.date || JSON.stringify(competition.events || snapshot.data()?.events) !== JSON.stringify(snapshot.data()?.events)));
    if (affectsQualifications) {
      payload.qualificationVersion = Number(snapshot.data()?.qualificationVersion || 0) + 1;
      if (!context.national) throw new backendContext.HttpsError("permission-denied", "Cette modification affecte les qualifications : intervention nationale requise.");
      return backendContext.qualificationService().begin(request, docRef, payload, snapshot.updateTime.toMillis());
    }
    await backendContext.db.runTransaction(async (tx) => {
      const latest = await tx.get(docRef);
      if (latest.updateTime.toMillis() !== snapshot.updateTime.toMillis() || latest.data()?.qualificationJobId) throw new backendContext.HttpsError("aborted", "La compétition a changé. Rechargez sa fiche.");
      tx.set(docRef, payload, { merge: true });
    });
    await backendContext.writeAuditLog("engagementCompetition.updated", context.uid, {
      competitionId,
      name: payload.name,
      date: payload.date,
      regionId: payload.regionId,
      level: payload.level,
      entryStatus: payload.entryStatus
    });
    const updated = await docRef.get();
    return {
      ok: true,
      competition: backendContext.engagementCompetitionDetailItem(updated, { includeDocumentUploader: true })
    };
  }

  return { updateEngagementCompetition };
}

module.exports = { createCompetitionHandlers_updateEngagementCompetition };
