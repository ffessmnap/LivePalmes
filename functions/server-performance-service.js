// Preserve the execution mode of the existing index.js function bodies.

// Private existing helpers; live services/state are supplied by index.js.
// Module creation performs no external operation.
function createPerformanceService(backendContext) {
  function competitionImportPublicSnapshotSummary(snapshot = {}) {
    return backendContext.cleanFirestoreValue({
      ok: snapshot.ok === true,
      path: backendContext.cleanText(snapshot.path),
      generatedAt: backendContext.cleanText(snapshot.generatedAt),
      importCount: Number(snapshot.importCount || 0) || 0,
      performanceCount: Number(snapshot.performanceCount || 0) || 0,
      rowCount: Number(snapshot.rowCount || 0) || 0,
      affectedSwimmers: Number(snapshot.affectedSwimmers || 0) || 0,
      affectedTopBuckets: Number(snapshot.affectedTopBuckets || 0) || 0,
      writtenFiles: Number(snapshot.writtenFiles || 0) || 0,
      error: backendContext.cleanText(snapshot.error).slice(0, 500)
    });
  }

  async function publishCompetitionImportOutputs(normalizedPerformances = [], importRef, context = {}) {
    const importId = backendContext.cleanText(context.importId || importRef?.id);
    const startedAt = new Date().toISOString();
    await importRef.set({
      publicationStatus: "publishing",
      publicationStartedAt: startedAt,
      publicationUpdatedAt: startedAt,
      publicationError: ""
    }, { merge: true });

    let publicSnapshot = null;
    try {
      publicSnapshot = await backendContext.publishIncrementalPerformanceImport(normalizedPerformances, importId);
    } catch (error) {
      console.warn("Publication publique des performances LivePalmes impossible", error);
      publicSnapshot = {
        ok: false,
        error: error?.message || String(error)
      };
    }

    let publicFilesSnapshot = null;
    try {
      publicFilesSnapshot = await backendContext.publishIncrementalPublicPerformanceFiles(normalizedPerformances, {
        importId,
        now: context.now || startedAt
      });
      await backendContext.invalidateEngagementEntryTimeCachesForPerformanceRows(normalizedPerformances);
    } catch (error) {
      console.warn("Publication publique incrementale des fichiers performances impossible", error);
      publicFilesSnapshot = {
        ok: false,
        error: error?.message || String(error)
      };
    }

    const publicationStatus = backendContext.importPublicationResultStatus(publicSnapshot, publicFilesSnapshot);
    const completedAt = new Date().toISOString();
    await importRef.set({
      publicationStatus,
      publicationCompletedAt: publicationStatus === "published" ? completedAt : "",
      publicationUpdatedAt: completedAt,
      publicationError: backendContext.importPublicationError(publicSnapshot, publicFilesSnapshot),
      publicSnapshot: competitionImportPublicSnapshotSummary(publicSnapshot),
      publicFilesSnapshot: competitionImportPublicSnapshotSummary(publicFilesSnapshot)
    }, { merge: true });

    return {
      publicationStatus,
      publicSnapshot,
      publicFilesSnapshot
    };
  }

  function competitionImportPerformanceId(importId, perf = {}) {
    return backendContext.stableHash([
      importId,
      perf.sourceLine,
      perf.swimmerId,
      perf.lastName,
      perf.firstName,
      perf.course,
      perf.time,
      perf.club
    ].join("|")).slice(0, 32);
  }

  async function stageCompetitionImportReplacement(options = {}) {
    const {
      parsed,
      importId,
      fileName,
      fileHash,
      recordAlerts,
      replacedImportId,
      actorUid,
      actorEmail,
      now
    } = options;
    if (!replacedImportId || replacedImportId === importId) {
      throw new backendContext.HttpsError("failed-precondition", "Utilise un fichier corrige different pour remplacer cet import.");
    }

    const oldRef = backendContext.db.collection("performanceImports").doc(replacedImportId);
    const newRef = backendContext.db.collection("performanceImports").doc(importId);
    const [oldSnapshot, newSnapshot] = await Promise.all([oldRef.get(), newRef.get()]);
    if (!oldSnapshot.exists || backendContext.cleanText(oldSnapshot.data()?.status) !== "stored") {
      throw new backendContext.HttpsError("failed-precondition", "L'import a remplacer n'est plus actif.");
    }
    const oldData = oldSnapshot.data() || {};
    parsed.metadata = { ...parsed.metadata, qualificationCompetitionId: oldData.metadata?.qualificationCompetitionId || replacedImportId };
    if (!backendContext.sameCompetitionImport(oldData.metadata || {}, parsed.metadata || {})) {
      throw new backendContext.HttpsError("failed-precondition", "Le nouveau fichier ne correspond pas a la competition importee.");
    }
    if (newSnapshot.exists && backendContext.activeCompetitionImportData(newSnapshot.data() || {})) {
      throw new backendContext.HttpsError("already-exists", "Ce fichier corrige est deja enregistre.");
    }

    let batch = backendContext.db.batch();
    let batchSize = 0;
    const commits = [];
    function commitIfNeeded(force = false) {
      if (batchSize >= 450 || (force && batchSize > 0)) {
        commits.push(batch.commit());
        batch = backendContext.db.batch();
        batchSize = 0;
      }
    }

    batch.set(newRef, {
      importId,
      competitionKey: backendContext.competitionImportIdentity(parsed.metadata),
      status: "replacement_staged",
      sourceType: parsed.sourceType || "ffessm-txt",
      fileName,
      fileHash,
      competitionName: parsed.metadata.competitionName,
      timingType: parsed.metadata.timingType,
      chrono: parsed.metadata.chrono,
      metadata: parsed.metadata,
      summary: parsed.summary,
      warnings: parsed.warnings,
      recordAlerts: recordAlerts.slice(0, 100),
      recordAlertCount: recordAlerts.length,
      duplicateDetails: parsed.duplicateDetails.slice(0, 50),
      replacementOf: replacedImportId,
      importedBy: actorUid,
      importedByEmail: actorEmail,
      importedAt: now,
      updatedAt: now,
      publicationStatus: "pending",
      publicationUpdatedAt: now,
      publicationError: ""
    }, { merge: false });
    batchSize += 1;

    parsed.clubs.forEach((club) => {
      const clubRef = newRef.collection("clubs").doc(club.code || backendContext.stableHash(JSON.stringify(club)).slice(0, 20));
      batch.set(clubRef, { ...club, importId, updatedAt: now }, { merge: false });
      batchSize += 1;
      commitIfNeeded();
    });
    parsed.performances.forEach((perf) => {
      const performanceId = competitionImportPerformanceId(importId, perf);
      batch.set(newRef.collection("performances").doc(performanceId), {
        ...perf,
        performanceId,
        importId,
        competitionName: parsed.metadata.competitionName,
        metadata: parsed.metadata,
        importedBy: actorUid,
        importedAt: now,
        updatedAt: now,
        updatedBy: actorUid
      }, { merge: false });
      batchSize += 1;
      commitIfNeeded();
    });
    commitIfNeeded(true);
    await Promise.all(commits);

    const jobId = backendContext.stableHash(`performanceImportReplacement|${replacedImportId}|${importId}`).slice(0, 40);
    const jobRef = backendContext.db.collection(backendContext.PERFORMANCE_PUBLICATION_JOBS_COLLECTION).doc(jobId);
    const existingJob = await jobRef.get();
    if (!existingJob.exists) {
      await jobRef.create(backendContext.cleanFirestoreValue({
        id: jobId,
        type: "performanceImportReplacement",
        oldImportId: replacedImportId,
        newImportId: importId,
        status: "pending",
        attempts: 0,
        createdAt: now,
        updatedAt: now,
        requestedBy: actorUid,
        requestedByEmail: actorEmail
      }));
    }
    await Promise.all([
      oldRef.set({ replacementJobId: jobId, replacementPendingImportId: importId, updatedAt: now }, { merge: true }),
      newRef.set({ replacementJobId: jobId, updatedAt: now }, { merge: true })
    ]);
    await backendContext.writeAuditLog("performanceImport.replacementRequested", actorUid, {
      oldImportId: replacedImportId,
      newImportId: importId,
      oldPerformanceCount: Number(oldData.summary?.importedPerformances || 0) || 0,
      newPerformanceCount: Number(parsed.summary?.importedPerformances || 0) || 0,
      jobId
    });
    const jobData = existingJob.exists ? existingJob.data() || {} : { status: "pending", attempts: 0, createdAt: now, updatedAt: now };
    return {
      ok: true,
      importId,
      replacedImportId,
      metadata: parsed.metadata,
      summary: parsed.summary,
      warnings: parsed.warnings,
      publicationJob: backendContext.publicPerformancePublicationJob(jobData, jobId)
    };
  }

  async function markCompetitionImportDeleted(importId, context = {}) {
    const now = context.now || new Date().toISOString();
    const importRef = backendContext.db.collection("performanceImports").doc(importId);
    const importDoc = await importRef.get();
    if (!importDoc.exists) {
      throw new backendContext.HttpsError("not-found", "Import introuvable.");
    }
    const importData = importDoc.data() || {};
    if (importData.status === "deleted") {
      return {
        ok: true,
        alreadyDeleted: true,
        importId,
        importPerformanceCount: 0,
        performanceBaseCount: 0
      };
    }

    const publishedSnapshot = await backendContext.readPublishedAdditionalPerformanceDataSnapshot();
    const affectedRows = (publishedSnapshot.performances || [])
      .filter((row) => backendContext.cleanText(row.importId) === importId)
      .map(publicPerformanceBaseRow);
    const expectedPerformanceCount = Number(importData.performanceBaseCount || importData.summary?.importedPerformances || 0) || 0;
    if (expectedPerformanceCount && affectedRows.length < expectedPerformanceCount) {
      throw new backendContext.HttpsError(
        "failed-precondition",
        "Fichier public incomplet pour cet import. Republie les donnees avant de supprimer l'import."
      );
    }

    let batch = backendContext.db.batch();
    let batchSize = 0;
    const commits = [];
    function commitIfNeeded(force = false) {
      if (batchSize >= 450 || (force && batchSize > 0)) {
        commits.push(batch.commit());
        batch = backendContext.db.batch();
        batchSize = 0;
      }
    }

    batch.set(importRef, {
      status: "deleted",
      deletedAt: now,
      deletedBy: context.actorUid || "",
      deletedByEmail: context.actorEmail || "",
      updatedAt: now
    }, { merge: true });
    batchSize += 1;

    affectedRows.forEach((row) => {
      const performanceId = backendContext.cleanText(row.id || row.performanceId);
      if (!performanceId) return;
      batch.set(importRef.collection("performances").doc(performanceId), {
        active: false,
        status: "deleted",
        deletedAt: now,
        deletedBy: context.actorUid || "",
        updatedAt: now
      }, { merge: true });
      batchSize += 1;
      commitIfNeeded();
    });

    const performanceBaseIds = new Set();
    affectedRows.forEach((data) => {
      const performanceBaseId = backendContext.cleanText(data.performanceBaseId || performanceBaseDocId(data));
      if (!performanceBaseId || performanceBaseIds.has(performanceBaseId)) return;
      performanceBaseIds.add(performanceBaseId);
      batch.set(backendContext.db.collection(backendContext.PERFORMANCE_BASE_COLLECTION).doc(performanceBaseId), {
        active: false,
        status: "deleted",
        deletedAt: now,
        deletedBy: context.actorUid || "",
        deletedByEmail: context.actorEmail || "",
        updatedAt: now,
        updatedBy: context.actorUid || "",
        updatedByEmail: context.actorEmail || "",
        sourceAction: "performanceImport.deleted"
      }, { merge: true });
      const changeId = backendContext.stableHash([performanceBaseId, "performanceImport.deleted", now, importId].join("|")).slice(0, 40);
      batch.set(backendContext.db.collection(backendContext.PERFORMANCE_BASE_CHANGES_COLLECTION).doc(changeId), {
        performanceBaseId,
        publicKey: backendContext.cleanText(data.publicKey),
        action: "performanceImport.deleted",
        importId,
        status: "deleted",
        row: backendContext.cleanFirestoreValue({
          ...data,
          performanceBaseId,
          active: false,
          status: "deleted"
        }),
        actorUid: context.actorUid || "",
        actorEmail: context.actorEmail || "",
        createdAt: now
      }, { merge: false });
      batchSize += 2;
      commitIfNeeded();
    });

    commitIfNeeded(true);
    await Promise.all(commits);
    await backendContext.invalidateEngagementEntryTimeCachesForPerformanceRows(affectedRows);
    return {
      ok: true,
      importId,
      importPerformanceCount: affectedRows.length,
      performanceBaseCount: performanceBaseIds.size,
      affectedRows,
      publishedSnapshot
    };
  }

  function performancePublicKey(row = {}) {
    if (row.publicKey) return backendContext.cleanText(row.publicKey);
    if (row.id) return `${row.source || "intranap"}|${row.id}`;
    return [
      row.swimmerIdentityKey || row.swimmerId || row.swimmer,
      row.date,
      row.course,
      row.timeValue,
      row.club || row.clubName,
      row.competitionId || row.location
    ].map((value) => backendContext.cleanText(value)).join("|");
  }

  function performanceBaseDocId(row = {}) {
    return backendContext.stableHash(performancePublicKey(row)).slice(0, 40);
  }

  function normalizeLivePalmesImportPerformances(rawPerformances = []) {
    const finalByImportLine = new Map();
    rawPerformances.forEach((perf) => {
      if (!perf.isIntermediate) {
        finalByImportLine.set(`${perf.importId}|${perf.sourceLine || perf.originSourceLine || ""}`, perf.performanceId || perf.id);
      }
    });

    return rawPerformances
      .map((perf) => {
        const course = backendContext.normalizeCourseCode(perf.course);
        if (!backendContext.POOL_COURSES.includes(course)) return null;
        const sex = backendContext.normalizeCategoryCode(perf.sex);
        if (sex !== "F" && sex !== "M") return null;
        const date = perf.date || perf.metadata?.date || "";
        const sourceCategory = perf.categoryCode || perf.importedCategoryCode || perf.classificationCategory || "";
        const category = backendContext.ageCategoryFromDates(date, perf.birthDate) || backendContext.fallbackCategoryFromSource(sourceCategory);
        if (!category) return null;
        const courseMeta = backendContext.coursePayload(course);
        const performanceId = perf.performanceId || perf.id;
        const originPerformanceId = perf.originPerformanceId ||
          (perf.isIntermediate ? finalByImportLine.get(`${perf.importId}|${perf.originSourceLine || perf.sourceLine || ""}`) || "" : "");
        const originCourse = backendContext.normalizeCourseCode(perf.originCourse);
        const originMeta = originCourse ? backendContext.coursePayload(originCourse) : null;
        const swimmerMatch = backendContext.resolveIntranapSwimmer(perf, sex);
        const matchedSwimmer = swimmerMatch.swimmer;
        const identityKey = backendContext.swimmerIdentityKey(perf.firstName, perf.lastName, perf.birthDate);
        const fallbackSwimmerId = `imported:${backendContext.stableHash(identityKey || [perf.firstName, perf.lastName, perf.birthDate].join("|")).slice(0, 16)}`;
        const swimmerId = matchedSwimmer?.id || fallbackSwimmerId;
        const firstName = backendContext.cleanText(matchedSwimmer?.firstName || perf.firstName);
        const lastName = backendContext.cleanText(matchedSwimmer?.lastName || perf.lastName);
        const swimmerName = backendContext.cleanText(matchedSwimmer?.name) || [firstName, lastName].filter(Boolean).join(" ").trim();

        return {
          id: `import:${perf.importId}:${performanceId}`,
          source: "livepalmes-import",
          importId: perf.importId,
          swimmerId,
          aliases: Array.isArray(matchedSwimmer?.aliases) ? matchedSwimmer.aliases : [],
          sourceIds: Array.isArray(matchedSwimmer?.sourceIds) ? matchedSwimmer.sourceIds : [swimmerId],
          originalSwimmerId: backendContext.cleanText(perf.swimmerId),
          swimmerIdentityKey: matchedSwimmer?.identityKey || identityKey,
          swimmerMatchMethod: swimmerMatch.method,
          swimmer: swimmerName,
          firstName,
          lastName,
          birthDate: matchedSwimmer?.birthDate || perf.birthDate || "",
          sex,
          clubId: backendContext.cleanText(perf.club),
          club: backendContext.cleanText(perf.club) || backendContext.cleanText(perf.clubName),
          clubName: backendContext.cleanText(perf.clubName),
          regionId: backendContext.cleanText(perf.regionId),
          regionLabel: backendContext.cleanText(perf.regionId),
          competitionId: perf.importId,
          qualificationCompetitionId: backendContext.cleanText(perf.metadata?.qualificationCompetitionId),
          competition: perf.competitionName || perf.metadata?.competitionName || "",
          location: perf.location || perf.metadata?.location || "",
          date,
          seasonYear: perf.seasonYear || backendContext.importSeasonYear(date),
          pool: perf.poolSize ? String(perf.poolSize) : "",
          timingType: backendContext.cleanTimingType(perf.timingType || perf.metadata?.timingType),
          chrono: backendContext.performanceImportChrono(perf),
          course,
          courseLabel: courseMeta.label,
          courseShortLabel: courseMeta.shortLabel,
          style: courseMeta.style,
          length: courseMeta.length,
          isIntermediate: perf.isIntermediate === true,
          originCourse,
          originCourseShortLabel: originMeta?.shortLabel || "",
          originPerformanceId: originPerformanceId ? `import:${perf.importId}:${originPerformanceId}` : "",
          category,
          categoryCode: backendContext.categoryCodeFromCategory(category, sex),
          categoryLabel: backendContext.CATEGORY_LABELS[sex]?.[category] || category,
          timeValue: Number(perf.timeValue) || 0,
          time: backendContext.cleanText(perf.time),
          intermediateTimes: Array.isArray(perf.intermediateTimes) ? perf.intermediateTimes : []
        };
      })
      .filter((perf) => perf && perf.timeValue > 0 && perf.date);
  }

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
      publicKey: performancePublicKey(row),
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
      const docId = performanceBaseDocId(row);
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

  function publicPerformanceBaseRow(row = {}) {
    const sex = backendContext.normalizeCategoryCode(row.sex);
    const date = backendContext.cleanText(row.date);
    const category = backendContext.performanceCategoryFromRow(row, date);
    return backendContext.cleanFirestoreValue({
      id: backendContext.cleanText(row.id),
      source: backendContext.cleanText(row.source || "livepalmes"),
      importId: backendContext.cleanText(row.importId),
      publicKey: backendContext.cleanText(row.publicKey),
      performanceBaseId: backendContext.cleanText(row.performanceBaseId),
      status: backendContext.cleanText(row.status || "active"),
      active: row.active !== false && row.status !== "hidden",
      swimmerId: backendContext.cleanText(row.swimmerId),
      originalSwimmerId: backendContext.cleanText(row.originalSwimmerId),
      swimmerIdentityKey: backendContext.cleanText(row.swimmerIdentityKey),
      swimmer: backendContext.cleanText(row.swimmer),
      firstName: backendContext.cleanText(row.firstName),
      lastName: backendContext.cleanText(row.lastName),
      birthDate: backendContext.cleanText(row.birthDate),
      sex,
      clubId: backendContext.cleanText(row.clubId),
      club: backendContext.cleanText(row.club),
      clubName: backendContext.cleanText(row.clubName),
      regionId: backendContext.cleanText(row.regionId),
      regionLabel: backendContext.cleanText(row.regionLabel),
      competitionId: backendContext.cleanText(row.competitionId || String(row.id || "").match(/^import:([^:]+):/)?.[1]),
      qualificationCompetitionId: backendContext.cleanText(row.qualificationCompetitionId),
      competition: backendContext.cleanText(row.competition),
      location: backendContext.cleanText(row.location),
      date,
      seasonYear: Number(row.seasonYear || 0) || 0,
      pool: backendContext.cleanText(row.pool),
      chrono: backendContext.cleanText(row.chrono),
      course: backendContext.cleanText(row.course),
      courseLabel: backendContext.cleanText(row.courseLabel),
      courseShortLabel: backendContext.cleanText(row.courseShortLabel),
      style: backendContext.cleanText(row.style),
      length: Number(row.length || 0) || 0,
      isIntermediate: row.isIntermediate === true,
      originCourse: backendContext.cleanText(row.originCourse),
      originCourseShortLabel: backendContext.cleanText(row.originCourseShortLabel),
      originPerformanceId: backendContext.cleanText(row.originPerformanceId),
      category,
      categoryCode: backendContext.cleanText(backendContext.categoryCodeFromCategory(category, sex) || row.categoryCode),
      categoryLabel: backendContext.cleanText(backendContext.CATEGORY_LABELS[sex]?.[category] || row.categoryLabel || category),
      timeValue: Number(row.timeValue || 0) || 0,
      time: backendContext.cleanText(row.time),
      points: backendContext.cleanText(row.points),
      rank: backendContext.cleanText(row.rank),
      intermediateTimes: Array.isArray(row.intermediateTimes)
        ? row.intermediateTimes.map((split) => ({
          code: backendContext.cleanText(split?.code),
          distance: Number(split?.distance || 0) || 0,
          time: backendContext.cleanText(split?.time),
          timeValue: Number(split?.timeValue || 0) || 0
        })).filter((split) => split.time)
        : []
    });
  }

  function uniquePublicPerformanceRows(rows = []) {
    const byKey = new Map();
    rows.forEach((row) => {
      const key = backendContext.cleanText(row.publicKey || performancePublicKey(row) || row.performanceBaseId || row.id);
      if (!key) return;
      byKey.set(key, row);
    });
    return Array.from(byKey.values());
  }

  function publicSwimmerKey(row = {}) {
    if (row.swimmerIdentityKey) return row.swimmerIdentityKey;
    const first = backendContext.cleanText(row.firstName).toUpperCase();
    const last = backendContext.cleanText(row.lastName).toUpperCase();
    const birth = backendContext.cleanText(row.birthDate);
    return first && last && birth ? `${last}|${first}|${birth}` : backendContext.cleanText(row.swimmerId || row.swimmer);
  }

  function publicBetterPerformance(candidate, current) {
    if (!current) return true;
    return Number(candidate.timeValue || 0) < Number(current.timeValue || 0) ||
      (Number(candidate.timeValue || 0) === Number(current.timeValue || 0) && backendContext.cleanText(candidate.date).localeCompare(backendContext.cleanText(current.date)) < 0);
  }

  function publicTopIndexRow(row = {}) {
    const sex = backendContext.normalizeCategoryCode(row.sex);
    const date = backendContext.cleanText(row.date);
    const category = backendContext.performanceCategoryFromRow(row, date);
    const result = backendContext.cleanFirestoreValue({
      id: backendContext.cleanText(row.id),
      source: backendContext.cleanText(row.source || "livepalmes"),
      importId: backendContext.cleanText(row.importId),
      publicKey: backendContext.cleanText(row.publicKey),
      performanceBaseId: backendContext.cleanText(row.performanceBaseId),
      swimmerId: backendContext.cleanText(row.swimmerId),
      originalSwimmerId: backendContext.cleanText(row.originalSwimmerId),
      swimmerIdentityKey: backendContext.cleanText(row.swimmerIdentityKey),
      swimmer: backendContext.cleanText(row.swimmer),
      firstName: backendContext.cleanText(row.firstName),
      lastName: backendContext.cleanText(row.lastName),
      birthDate: backendContext.cleanText(row.birthDate),
      sex,
      club: backendContext.cleanText(row.club),
      clubName: backendContext.cleanText(row.clubName),
      regionId: backendContext.cleanText(row.regionId),
      regionLabel: backendContext.cleanText(row.regionLabel),
      competitionId: backendContext.cleanText(row.competitionId),
      competition: backendContext.cleanText(row.competition),
      location: backendContext.cleanText(row.location),
      date,
      pool: backendContext.cleanText(row.pool),
      seasonYear: Number(row.seasonYear || 0) || 0,
      course: backendContext.cleanText(row.course),
      courseShortLabel: backendContext.cleanText(row.courseShortLabel),
      style: backendContext.cleanText(row.style),
      isIntermediate: row.isIntermediate === true,
      originCourse: backendContext.cleanText(row.originCourse),
      originCourseShortLabel: backendContext.cleanText(row.originCourseShortLabel),
      originPerformanceId: backendContext.cleanText(row.originPerformanceId),
      category,
      categoryCode: backendContext.cleanText(backendContext.categoryCodeFromCategory(category, sex) || row.categoryCode),
      categoryLabel: backendContext.cleanText(backendContext.CATEGORY_LABELS[sex]?.[category] || row.categoryLabel || category),
      timeValue: Number(row.timeValue || 0) || 0,
      time: backendContext.cleanText(row.time),
      status: backendContext.cleanText(row.status || "active"),
      active: row.active !== false && row.status !== "hidden",
      intermediateTimes: Array.isArray(row.intermediateTimes)
        ? row.intermediateTimes.map((split) => ({
          code: backendContext.cleanText(split?.code),
          distance: Number(split?.distance || 0) || 0,
          time: backendContext.cleanText(split?.time),
          timeValue: Number(split?.timeValue || 0) || 0
        })).filter((split) => split.time)
        : []
    });
    // Omit empty optional fields: two pools must still fit in one Firestore document.
    Object.keys(result).forEach((key) => {
      if (result[key] === "" || (Array.isArray(result[key]) && !result[key].length)) delete result[key];
    });
    return result;
  }

  function performanceTopBucketKey(filters = {}) {
    return [
      backendContext.cleanText(filters.course),
      backendContext.cleanText(filters.sex),
      backendContext.cleanText(filters.category),
      Number(filters.seasonYear || 0) || 0,
      backendContext.cleanText(filters.regionId)
    ].join("|");
  }

  function performanceTopBucketId(bucketKey) {
    return backendContext.stableHash(bucketKey).slice(0, 40);
  }

  function performanceTopBucketVariants(row = {}) {
    const course = backendContext.cleanText(row.course);
    const sex = backendContext.cleanText(row.sex);
    if (!course || (sex !== "F" && sex !== "M")) return [];
    const categoryValues = Array.from(new Set([backendContext.cleanText(row.category), ""].filter((value, index, values) => value || index === values.length - 1)));
    const seasonValues = Array.from(new Set([Number(row.seasonYear || 0) || 0, 0]));
    const regionValues = Array.from(new Set([backendContext.cleanText(row.regionId), ""]));
    const variants = [];
    categoryValues.forEach((category) => {
      seasonValues.forEach((seasonYear) => {
        regionValues.forEach((regionId) => {
          const key = performanceTopBucketKey({ course, sex, category, seasonYear, regionId });
          variants.push({
            key,
            id: performanceTopBucketId(key),
            course,
            sex,
            category,
            seasonYear,
            regionId
          });
        });
      });
    });
    return variants;
  }

  function bestTopRows(rows = []) {
    const latestByPublicKey = new Map();
    rows.forEach((row) => {
      const key = backendContext.cleanText(row.publicKey || row.performanceBaseId || row.id || performancePublicKey(row));
      if (!key) return;
      latestByPublicKey.set(key, row);
    });
    const bestBySwimmer = new Map();
    latestByPublicKey.forEach((rawRow) => {
      if (rawRow.active === false || rawRow.status === "hidden") return;
      const row = publicTopIndexRow(rawRow);
      if (!row.timeValue) return;
      const identity = publicSwimmerKey(row);
      if (!identity) return;
      const swimmerKey = [identity, backendContext.cleanText(row.pool)].join("|");
      if (publicBetterPerformance(row, bestBySwimmer.get(swimmerKey))) bestBySwimmer.set(swimmerKey, row);
    });
    const poolCounts = new Map();
    return Array.from(bestBySwimmer.values())
      .sort((a, b) => Number(a.timeValue || 0) - Number(b.timeValue || 0) || backendContext.cleanText(a.date).localeCompare(backendContext.cleanText(b.date)))
      .filter((row) => {
        const pool = backendContext.cleanText(row.pool);
        const count = poolCounts.get(pool) || 0;
        poolCounts.set(pool, count + 1);
        return count < backendContext.PERFORMANCE_TOP_INDEX_LIMIT;
      });
  }

  function encodePerformanceTopIndexRows(rows) {
    const serialized = JSON.stringify(rows);
    if (Buffer.byteLength(serialized) <= 850000) return { rows };
    const rowsGzip = require("node:zlib").gzipSync(serialized).toString("base64");
    if (Buffer.byteLength(rowsGzip) > 850000) throw new Error("Bucket TOP trop volumineux après compression.");
    return { rowsEncoding: "gzip-base64-v1", rowsGzip };
  }

  function readPerformanceTopIndexRows(view = {}) {
    if (view.rowsEncoding) {
      if (view.rowsEncoding !== "gzip-base64-v1") throw new Error("Encodage TOP inconnu.");
      return JSON.parse(require("node:zlib").gunzipSync(Buffer.from(view.rowsGzip, "base64")).toString("utf8"));
    }
    return Array.isArray(view.rows) ? view.rows : [];
  }

  async function writePerformanceTopIndexRows(rows = [], context = {}) {
    const byBucket = new Map();
    rows.forEach((rawRow) => {
      if (!rawRow) return;
      const row = publicTopIndexRow(rawRow);
      if (!row.course || !row.sex || !row.timeValue) return;
      performanceTopBucketVariants(row).forEach((bucket) => {
        if (!byBucket.has(bucket.id)) byBucket.set(bucket.id, { ...bucket, rows: [] });
        byBucket.get(bucket.id).rows.push(row);
      });
    });
    if (!byBucket.size) return { ok: true, writtenRows: 0, touchedBucketIds: [] };

    const now = context.now || new Date().toISOString();
    const bucketEntries = Array.from(byBucket.values());
    const refs = bucketEntries.map((bucket) => backendContext.db.collection(backendContext.PERFORMANCE_TOP_BUCKETS_COLLECTION).doc(bucket.id));
    const snapshots = refs.length ? await backendContext.db.getAll(...refs) : [];
    let batch = backendContext.db.batch();
    let batchSize = 0;
    const commits = [];
    let writtenRows = 0;

    function commitIfNeeded(force = false) {
      if (batchSize >= 10 || (force && batchSize > 0)) {
        commits.push(batch.commit());
        batch = backendContext.db.batch();
        batchSize = 0;
      }
    }

    bucketEntries.forEach((bucket, index) => {
      const existing = snapshots[index].exists ? snapshots[index].data() || {} : {};
      const existingRows = readPerformanceTopIndexRows(existing);
      const topRows = bestTopRows([...existingRows, ...bucket.rows]);
      batch.set(refs[index], {
        bucketId: bucket.id,
        bucketKey: bucket.key,
        course: bucket.course,
        sex: bucket.sex,
        category: bucket.category,
        seasonYear: bucket.seasonYear,
        regionId: bucket.regionId,
        ...encodePerformanceTopIndexRows(topRows),
        rowCount: topRows.length,
        sourceRowCount: Number(existing.sourceRowCount || 0) + bucket.rows.length,
        updatedAt: now
      }, { merge: false });
      batchSize += 1;
      writtenRows += bucket.rows.length;
      commitIfNeeded();
    });

    commitIfNeeded(true);
    await Promise.all(commits);
    return { ok: true, writtenRows, touchedBucketIds: bucketEntries.map((bucket) => bucket.id) };
  }

  async function performanceTopRowsFromIndex(filters = {}) {
    const bucketKey = performanceTopBucketKey({
      course: filters.course,
      sex: filters.sex,
      category: filters.category,
      seasonYear: filters.season,
      regionId: filters.region
    });
    const bucketId = performanceTopBucketId(bucketKey);
    const snapshot = await backendContext.db.collection(backendContext.PERFORMANCE_TOP_BUCKETS_COLLECTION).doc(bucketId).get();
    if (!snapshot.exists) return null;
    const view = snapshot.data() || {};
    const rows = readPerformanceTopIndexRows(view);
    return {
      ok: true,
      bucketId,
      rows,
      indexReads: 1,
      indexedRows: rows.length
    };
  }

  return {
    competitionImportPublicSnapshotSummary,
    publishCompetitionImportOutputs,
    competitionImportPerformanceId,
    stageCompetitionImportReplacement,
    markCompetitionImportDeleted,
    performancePublicKey,
    performanceBaseDocId,
    normalizeLivePalmesImportPerformances,
    cleanPerformanceBaseRow,
    writePerformanceBaseRows,
    publicPerformanceBaseRow,
    uniquePublicPerformanceRows,
    publicSwimmerKey,
    publicBetterPerformance,
    publicTopIndexRow,
    performanceTopBucketKey,
    performanceTopBucketId,
    performanceTopBucketVariants,
    bestTopRows,
    encodePerformanceTopIndexRows,
    readPerformanceTopIndexRows,
    writePerformanceTopIndexRows,
    performanceTopRowsFromIndex
  };
}

module.exports = { createPerformanceService };
