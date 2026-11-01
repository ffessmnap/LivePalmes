// Existing operation bodies; live services arrive through explicit accessors.
function createPerformanceService_cleanPerformanceBaseRow(backendContext) {
  function cleanPerformanceBaseRow(row = {}, status = "active") {
    const course = backendContext.normalizeCourseCode(row.course);
    const courseMeta = backendContext.coursePayload(course);
    const sex = backendContext.normalizeCategoryCode(row.sex);
    const date = backendContext.cleanText(row.date);
    const category = backendContext.performanceCategoryFromRow(row, date);
    const seasonYear = Number(row.seasonYear || 0) || backendContext.importSeasonYear(date);
    return backendContext.cleanFirestoreValue({
      ...row,
      source: backendContext.cleanText(row.source || "livepalmes"),
      course,
      courseLabel: backendContext.cleanText(row.courseLabel || courseMeta.label),
      courseShortLabel: backendContext.cleanText(row.courseShortLabel || courseMeta.shortLabel),
      style: backendContext.cleanText(row.style || courseMeta.style),
      length: Number(row.length || courseMeta.length || 0) || 0,
      sex,
      category,
      categoryCode: backendContext.cleanText(backendContext.categoryCodeFromCategory(category, sex) || row.categoryCode),
      categoryLabel: backendContext.cleanText(backendContext.CATEGORY_LABELS[sex]?.[category] || row.categoryLabel || category),
      date,
      seasonYear,
      timeValue: Number(row.timeValue || 0) || 0,
      time: backendContext.cleanText(row.time),
      publicKey: (0, backendContext.local$performancePublicKey)(row),
      status,
      active: status === "active",
      baseVersion: 1
    });
  }

  async function writePerformanceBaseRows(rows = [], context = {}) {
    const now = context.now || new Date().toISOString();
    const logChanges = context.logChanges !== false;
    let batch = backendContext.db.batch();
    let batchSize = 0;
    let written = 0;
    const commits = [];

    function commitIfNeeded(force = false) {
      if (batchSize >= 450 || (force && batchSize > 0)) {
        commits.push(batch.commit());
        batch = backendContext.db.batch();
        batchSize = 0;
      }
    }

    rows.forEach((inputRow) => {
      const status = inputRow.status || context.status || "active";
      const row = cleanPerformanceBaseRow(inputRow, status);
      const docId = (0, backendContext.local$performanceBaseDocId)(row);
      const ref = backendContext.db.collection(backendContext.PERFORMANCE_BASE_COLLECTION).doc(docId);
      batch.set(ref, {
        ...row,
        performanceBaseId: docId,
        updatedAt: now,
        updatedBy: context.actorUid || "",
        updatedByEmail: context.actorEmail || "",
        sourceAction: context.action || "sync"
      }, { merge: true });
      batchSize += 1;
      written += 1;

      if (logChanges) {
        const changeId = backendContext.stableHash([docId, context.action || "sync", now, context.changeSeed || "", written].join("|")).slice(0, 40);
        const changeRef = backendContext.db.collection(backendContext.PERFORMANCE_BASE_CHANGES_COLLECTION).doc(changeId);
        batch.set(changeRef, {
          performanceBaseId: docId,
          publicKey: row.publicKey,
          action: context.action || "sync",
          importId: row.importId || context.importId || "",
          status,
          row,
          actorUid: context.actorUid || "",
          actorEmail: context.actorEmail || "",
          createdAt: now
        }, { merge: false });
        batchSize += 1;
      }
      commitIfNeeded();
    });

    commitIfNeeded(true);
    await Promise.all(commits);
    await backendContext.invalidateEngagementEntryTimeCachesForPerformanceRows(rows);
    await backendContext.touchDtnQualificationCacheState([
      ...rows,
      ...(Array.isArray(context.dtnInvalidationRows) ? context.dtnInvalidationRows : [])
    ], {
      action: context.action || "performanceBase.updated",
      now
    });
    return { ok: true, written };
  }

  return { cleanPerformanceBaseRow, writePerformanceBaseRows };
}

module.exports = { createPerformanceService_cleanPerformanceBaseRow };
