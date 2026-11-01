// Existing operation bodies; live services arrive through explicit accessors.
function createPerformanceHandlers_savePerformanceCorrection(backendContext) {
  async function savePerformanceCorrection(request) {
    if(request.data?.recordsAction!==undefined){
      if(request.data.recordsAction!=="publish")throw new backendContext.HttpsError("invalid-argument","Action Records invalide.");
      return backendContext.publishNativeRecords(request);
    }
    backendContext.assertCapability(request, "competitions.import");
    if(backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try{return await require("../../nap-performance-write").createPerformanceWriter({authorize:backendContext.authorizeNativePerformance,getPool:()=>require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD)}).change(request,request.data);}
      catch(error){throw backendContext.nativePerformanceFailure(error);}
    }
    const data = request.data || {};
    const targetKey = backendContext.cleanText(data.targetKey).slice(0, 240);
    if (!targetKey) {
      throw new backendContext.HttpsError("invalid-argument", "Performance cible manquante.");
    }
    const reason = backendContext.cleanText(data.reason).slice(0, 500);
    if (!reason) {
      throw new backendContext.HttpsError("invalid-argument", "Motif obligatoire.");
    }
    const allowedPatchFields = new Set([
      "time",
      "timeValue",
      "club",
      "clubName",
      "location",
      "date",
      "rank",
      "points",
      "intermediateTimes"
    ]);
    const rawPatch = data.patch && typeof data.patch === "object" ? data.patch : {};
    const patch = {};
    Object.keys(rawPatch).forEach((key) => {
      if (!allowedPatchFields.has(key)) return;
      if (key === "timeValue") {
        const value = Number(rawPatch[key]);
        if (Number.isFinite(value) && value > 0) patch[key] = value;
        return;
      }
      if (key === "intermediateTimes") {
        patch[key] = Array.isArray(rawPatch[key])
          ? rawPatch[key].slice(0, 12).map((split) => ({
            distance: Number(split?.distance || 0) || "",
            code: backendContext.cleanText(split?.code).slice(0, 20),
            time: backendContext.cleanText(split?.time).slice(0, 20),
            timeValue: Number(split?.timeValue || 0) || 0
          })).filter((split) => split.code || split.time)
          : [];
        return;
      }
      patch[key] = backendContext.cleanText(rawPatch[key]).slice(0, key === "location" || key === "clubName" ? 160 : 80);
    });

    const targetRowKeys = new Set([
      "id", "source", "swimmerId", "originalSwimmerId", "swimmerIdentityKey", "swimmer", "firstName", "lastName", "birthDate",
      "sex", "clubId", "club", "clubName", "regionId", "regionLabel", "competitionId", "competition", "location", "date",
      "seasonYear", "pool", "chrono", "course", "courseLabel", "courseShortLabel", "style", "length", "isIntermediate",
      "originCourse", "originCourseShortLabel", "originPerformanceId", "category", "categoryCode", "categoryLabel",
      "timeValue", "time", "rank", "points", "intermediateTimes"
    ]);
    const rawTargetRow = data.targetRow && typeof data.targetRow === "object" ? data.targetRow : {};
    const targetRow = {};
    Object.keys(rawTargetRow).forEach((key) => {
      if (!targetRowKeys.has(key)) return;
      if (key === "timeValue" || key === "seasonYear" || key === "length") {
        const value = Number(rawTargetRow[key]);
        if (Number.isFinite(value)) targetRow[key] = value;
        return;
      }
      if (key === "isIntermediate") {
        targetRow[key] = rawTargetRow[key] === true;
        return;
      }
      if (key === "intermediateTimes") {
        targetRow[key] = Array.isArray(rawTargetRow[key])
          ? rawTargetRow[key].slice(0, 12).map((split) => ({
            distance: Number(split?.distance || 0) || "",
            code: backendContext.cleanText(split?.code).slice(0, 20),
            time: backendContext.cleanText(split?.time).slice(0, 20),
            timeValue: Number(split?.timeValue || 0) || 0
          })).filter((split) => split.code || split.time)
          : [];
        return;
      }
      targetRow[key] = backendContext.cleanText(rawTargetRow[key]).slice(0, 180);
    });

    const hidden = data.hidden === true;
    if (!hidden && !Object.keys(patch).length) {
      throw new backendContext.HttpsError("invalid-argument", "Aucune correction a enregistrer.");
    }

    const now = new Date().toISOString();
    const updatedByName = await backendContext.accessUserDisplayName(request.auth.uid, request.auth.token || {});
    const correctionId = backendContext.stableHash(targetKey).slice(0, 32);
    const ref = backendContext.db.collection("performanceCorrections").doc(correctionId);
    const existing = await ref.get();
    const payload = {
      id: correctionId,
      targetKey,
      targetId: backendContext.cleanText(data.targetId).slice(0, 180),
      targetSource: backendContext.cleanText(data.targetSource).slice(0, 80),
      targetSummary: backendContext.cleanFirestoreValue(data.targetSummary && typeof data.targetSummary === "object" ? data.targetSummary : {}),
      targetRow: backendContext.cleanFirestoreValue(targetRow),
      hidden,
      patch: backendContext.cleanFirestoreValue(patch),
      reason,
      updatedAt: now,
      updatedBy: request.auth.uid,
      updatedByEmail: request.auth.token?.email || "",
      updatedByName,
      createdAt: existing.exists ? existing.data()?.createdAt || now : now,
      createdBy: existing.exists ? existing.data()?.createdBy || request.auth.uid : request.auth.uid
    };
    const safePayload = backendContext.cleanFirestoreValue(payload);
    await ref.set(safePayload, { merge: false });
    await ref.collection("history").add({
      ...safePayload,
      correctionId,
      savedAt: now
    });
    await backendContext.writeAuditLog(hidden ? "performanceCorrection.hidden" : "performanceCorrection.updated", request.auth.uid, {
      correctionId,
      targetKey,
      targetId: payload.targetId,
      targetSource: payload.targetSource,
      hidden,
      reason
    });

    const publicationJob = await backendContext.enqueuePerformancePublicationJob({
      id: correctionId,
      targetKey: safePayload.targetKey,
      targetId: safePayload.targetId,
      targetSource: safePayload.targetSource,
      targetRow: safePayload.targetRow || {},
      hidden: safePayload.hidden === true,
      patch: safePayload.patch || {},
      updatedAt: safePayload.updatedAt,
      updatedByName: safePayload.updatedByName || ""
    }, {
      uid: request.auth.uid,
      email: request.auth.token?.email || ""
    });
    return {
      ok: true,
      correction: {
        id: correctionId,
        targetKey,
        hidden,
        patch,
        updatedAt: now
      },
      publicationJob
    };
  }

  return { savePerformanceCorrection };
}

module.exports = { createPerformanceHandlers_savePerformanceCorrection };
