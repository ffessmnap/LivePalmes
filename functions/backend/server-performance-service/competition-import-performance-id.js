// Existing operation bodies; live services arrive through explicit accessors.
function createPerformanceService_competitionImportPerformanceId(backendContext) {
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

  return { competitionImportPerformanceId, stageCompetitionImportReplacement };
}

module.exports = { createPerformanceService_competitionImportPerformanceId };
