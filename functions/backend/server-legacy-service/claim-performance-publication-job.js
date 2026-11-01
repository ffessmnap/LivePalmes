// Existing operation bodies; live services arrive through explicit accessors.
function createLegacyService_claimPerformancePublicationJob(backendContext) {
  function upsertAdditionalCorrection(corrections = [], correction = {}) {
    const key = backendContext.cleanText(correction.id || correction.targetKey);
    if (!key) return corrections;
    const byKey = new Map();
    corrections.forEach((item) => {
      const itemKey = backendContext.cleanText(item.id || item.targetKey);
      if (itemKey) byKey.set(itemKey, item);
    });
    byKey.set(key, correction);
    return Array.from(byKey.values())
      .sort((a, b) => backendContext.cleanText(b.updatedAt).localeCompare(backendContext.cleanText(a.updatedAt)))
      .slice(0, 2000);
  }

  async function publishIncrementalPerformanceCorrection(correction = {}) {
    const current = await (0, backendContext.local$readPublishedAdditionalPerformanceDataSnapshot)();
    const corrections = upsertAdditionalCorrection(current.corrections, correction);
    return (0, backendContext.local$saveAdditionalPerformanceDataSnapshot)({
      ...current,
      corrections
    });
  }

  async function claimPerformancePublicationJob(jobRef) {
    const nowMs = Date.now();
    return backendContext.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(jobRef);
      if (!snapshot.exists) return null;
      const job = snapshot.data() || {};
      if (!backendContext.canClaimPerformancePublicationJob(job, nowMs)) return null;
      const attempts = Math.max(0, Number(job.attempts || 0) || 0) + 1;
      const now = new Date(nowMs).toISOString();
      transaction.set(jobRef, {
        status: "processing",
        attempts,
        startedAt: now,
        updatedAt: now,
        leaseUntil: new Date(nowMs + backendContext.PERFORMANCE_PUBLICATION_LEASE_MS).toISOString(),
        error: ""
      }, { merge: true });
      return { ...job, id: jobRef.id, attempts };
    });
  }

  async function replacementImportRows(importId = "") {
    const importRef = backendContext.db.collection("performanceImports").doc(importId);
    const importSnapshot = await importRef.get();
    if (!importSnapshot.exists) throw new Error(`Import ${importId} introuvable.`);
    const importData = importSnapshot.data() || {};
    const expectedCount = Number(importData.summary?.importedPerformances || importData.performanceBaseCount || 0) || 0;
    if (!expectedCount || expectedCount > backendContext.MAX_COMPETITION_IMPORT_PERFORMANCES) {
      throw new Error(`Volume de l'import ${importId} incompatible avec le remplacement.`);
    }
    const rowsSnapshot = await importRef.collection("performances").limit(expectedCount + 1).get();
    if (rowsSnapshot.size !== expectedCount) {
      throw new Error(`Import ${importId} incomplet : ${rowsSnapshot.size} performance(s) sur ${expectedCount}.`);
    }
    const rawRows = rowsSnapshot.docs.map((snapshot) => ({ id: snapshot.id, ...(snapshot.data() || {}) }));
    const rows = backendContext.normalizeLivePalmesImportPerformances(rawRows);
    if (rows.length !== expectedCount) {
      throw new Error(`Import ${importId} non normalisable : ${rows.length} performance(s) sur ${expectedCount}.`);
    }
    return { importRef, importData, rows, reads: rowsSnapshot.size + 1 };
  }

  async function deactivateReplacedPerformanceBaseRows(rows = [], context = {}) {
    const now = context.now || new Date().toISOString();
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
    rows.forEach((row, index) => {
      const performanceBaseId = backendContext.cleanText(row.performanceBaseId || backendContext.performanceBaseDocId(row));
      if (!performanceBaseId) return;
      const deactivatedRow = backendContext.cleanFirestoreValue({
        ...row,
        performanceBaseId,
        active: false,
        status: "replaced"
      });
      batch.set(backendContext.db.collection(backendContext.PERFORMANCE_BASE_COLLECTION).doc(performanceBaseId), {
        active: false,
        status: "replaced",
        replacedByImportId: context.newImportId || "",
        updatedAt: now,
        updatedBy: context.actorUid || "",
        updatedByEmail: context.actorEmail || "",
        sourceAction: "performanceImport.replaced"
      }, { merge: true });
      const changeId = backendContext.stableHash([
        performanceBaseId,
        "performanceImport.replaced",
        context.oldImportId || "",
        context.newImportId || "",
        index
      ].join("|")).slice(0, 40);
      batch.set(backendContext.db.collection(backendContext.PERFORMANCE_BASE_CHANGES_COLLECTION).doc(changeId), {
        performanceBaseId,
        publicKey: backendContext.cleanText(row.publicKey),
        action: "performanceImport.replaced",
        importId: context.oldImportId || row.importId || "",
        replacementImportId: context.newImportId || "",
        status: "replaced",
        row: deactivatedRow,
        actorUid: context.actorUid || "",
        actorEmail: context.actorEmail || "",
        createdAt: now
      }, { merge: true });
      batchSize += 2;
      written += 1;
      commitIfNeeded();
    });
    commitIfNeeded(true);
    await Promise.all(commits);
    await backendContext.invalidateEngagementEntryTimeCachesForPerformanceRows(rows);
    await backendContext.touchDtnQualificationCacheState(rows, { action: "performanceImport.replaced", now });
    return { ok: true, written };
  }

  async function processPerformanceImportReplacementJob(jobRef, job = {}) {
    const oldImportId = backendContext.cleanText(job.oldImportId).slice(0, 160);
    const newImportId = backendContext.cleanText(job.newImportId).slice(0, 160);
    if (!oldImportId || !newImportId || oldImportId === newImportId) {
      await jobRef.set({
        status: "failed",
        updatedAt: new Date().toISOString(),
        failedAt: new Date().toISOString(),
        leaseUntil: "",
        error: "Imports de remplacement invalides."
      }, { merge: true });
      return { failed: true, retryable: false };
    }

    const operationAt = backendContext.cleanText(job.createdAt) || new Date().toISOString();
    const actorUid = backendContext.cleanText(job.requestedBy) || "system:performanceImportReplacement";
    const actorEmail = backendContext.cleanText(job.requestedByEmail);
    let oldImport = null;
    let newImport = null;
    try {
      [oldImport, newImport] = await Promise.all([
        replacementImportRows(oldImportId),
        replacementImportRows(newImportId)
      ]);
      if (!backendContext.sameCompetitionImport(oldImport.importData.metadata || {}, newImport.importData.metadata || {})) {
        throw new Error("Les deux imports ne correspondent pas a la meme competition.");
      }
      await Promise.all([
        oldImport.importRef.set({
          replacementJobId: jobRef.id,
          replacementPendingImportId: newImportId,
          updatedAt: operationAt
        }, { merge: true }),
        newImport.importRef.set({
          publicationStatus: "publishing",
          publicationStartedAt: operationAt,
          publicationUpdatedAt: new Date().toISOString(),
          publicationError: ""
        }, { merge: true })
      ]);

      const newBaseSync = await backendContext.writePerformanceBaseRows(newImport.rows, {
        actorUid,
        actorEmail,
        now: operationAt,
        importId: newImportId,
        action: "performanceImport.replacementActivated",
        changeSeed: jobRef.id
      });
      const oldBaseSync = await deactivateReplacedPerformanceBaseRows(oldImport.rows, {
        actorUid,
        actorEmail,
        now: operationAt,
        oldImportId,
        newImportId
      });

      const currentSnapshot = await (0, backendContext.local$readPublishedAdditionalPerformanceDataSnapshot)();
      if (currentSnapshot.available === false) {
        throw new Error("Fichier public des performances indisponible pour securiser le remplacement.");
      }
      const currentOldRows = (currentSnapshot.performances || [])
        .filter((row) => backendContext.cleanText(row.importId) === oldImportId);
      const currentNewRows = (currentSnapshot.performances || [])
        .filter((row) => backendContext.cleanText(row.importId) === newImportId);
      if (currentOldRows.length < oldImport.rows.length && currentNewRows.length < newImport.rows.length) {
        throw new Error(
          `Instantane public incomplet : ${currentOldRows.length} ancienne(s) et ${currentNewRows.length} nouvelle(s) performance(s).`
        );
      }
      const withoutOldImport = (currentSnapshot.performances || [])
        .filter((row) => backendContext.cleanText(row.importId) !== oldImportId);
      const mergedPerformances = (0, backendContext.local$mergeAdditionalPerformanceRows)(withoutOldImport, newImport.rows, newImportId);
      const publicSnapshot = await (0, backendContext.local$saveAdditionalPerformanceDataSnapshot)({
        ...currentSnapshot,
        performances: mergedPerformances
      });
      if (publicSnapshot?.ok === false) throw new Error(publicSnapshot.error || "Instantane public non publie.");

      const affectedRows = [
        ...backendContext.deactivatedImportPerformanceRows(oldImport.rows),
        ...newImport.rows
      ];
      const publicFilesSnapshot = await backendContext.rebuildPublicPerformanceFilesForAffectedRows(affectedRows, {
        now: operationAt,
        reason: "performanceImport.replaced",
        importId: newImportId
      });
      if (publicFilesSnapshot?.ok === false) throw new Error(publicFilesSnapshot.error || "Fichiers publics non publies.");

      const completedAt = new Date().toISOString();
      await Promise.all([
        oldImport.importRef.set({
          status: "replaced",
          replacedBy: newImportId,
          replacedAt: completedAt,
          replacementPendingImportId: "",
          publicationStatus: "replaced",
          publicationUpdatedAt: completedAt,
          updatedAt: completedAt
        }, { merge: true }),
        newImport.importRef.set({
          status: "stored",
          replacementOf: oldImportId,
          performanceBaseSyncedAt: completedAt,
          performanceBaseCount: newBaseSync.written,
          publicationStatus: "published",
          publicationCompletedAt: completedAt,
          publicationUpdatedAt: completedAt,
          publicationError: "",
          updatedAt: completedAt
        }, { merge: true }),
        jobRef.set(backendContext.cleanFirestoreValue({
          status: "published",
          updatedAt: completedAt,
          completedAt,
          leaseUntil: "",
          error: "",
          result: {
            oldPerformanceCount: oldBaseSync.written,
            newPerformanceCount: newBaseSync.written,
            writtenFiles: Number(publicFilesSnapshot.writtenFiles || 0) || 0,
            firestoreDocumentReads: oldImport.reads + newImport.reads
          }
        }), { merge: true })
      ]);
      await backendContext.writeAuditLog("performanceImport.replaced", actorUid, {
        oldImportId,
        newImportId,
        jobId: jobRef.id,
        oldPerformanceCount: oldBaseSync.written,
        newPerformanceCount: newBaseSync.written,
        publicSnapshot: backendContext.competitionImportPublicSnapshotSummary(publicSnapshot),
        publicFilesSnapshot: backendContext.competitionImportPublicSnapshotSummary(publicFilesSnapshot)
      });
      return { published: true };
    } catch (error) {
      const failedAt = new Date().toISOString();
      const status = backendContext.performancePublicationFailureStatus(job.attempts, backendContext.PERFORMANCE_PUBLICATION_MAX_ATTEMPTS);
      const message = backendContext.cleanText(error?.message || error).slice(0, 300) || "Remplacement impossible.";
      await Promise.all([
        jobRef.set({ status, updatedAt: failedAt, failedAt, leaseUntil: "", error: message }, { merge: true }),
        newImport?.importRef?.set?.({
          publicationStatus: "failed",
          publicationUpdatedAt: failedAt,
          publicationError: message,
          updatedAt: failedAt
        }, { merge: true }) || Promise.resolve()
      ]);
      console.error("Remplacement asynchrone d'un import impossible", {
        jobId: jobRef.id,
        oldImportId,
        newImportId,
        attempts: job.attempts,
        status,
        message
      });
      return { failed: true, retryable: status === "pending", error };
    }
  }

  async function processPerformancePublicationJob(jobRef) {
    const job = await claimPerformancePublicationJob(jobRef);
    if (!job) return { skipped: true };
    if (job.type === "performanceImportReplacement") {
      return processPerformanceImportReplacementJob(jobRef, job);
    }
    const correction = job.correction && typeof job.correction === "object" ? job.correction : {};
    const correctionId = backendContext.cleanText(correction.id).slice(0, 40);
    const targetKey = backendContext.cleanText(correction.targetKey).slice(0, 240);
    if (!correctionId || !targetKey) {
      await jobRef.set({
        status: "failed",
        updatedAt: new Date().toISOString(),
        failedAt: new Date().toISOString(),
        leaseUntil: "",
        error: "Correction cible manquante dans le travail de publication."
      }, { merge: true });
      return { failed: true, retryable: false };
    }

    const now = new Date().toISOString();
    const targetRow = correction.targetRow || {};
    const affectedTargetRow = correction.hidden === true
      ? { ...targetRow, active: false, status: "hidden" }
      : targetRow;
    const correctedBaseRow = {
      ...targetRow,
      ...(correction.hidden === true ? {} : correction.patch || {}),
      publicKey: targetKey,
      source: correction.targetSource || targetRow.source || "intranap",
      id: correction.targetId || targetRow.id || "",
      active: correction.hidden !== true,
      status: correction.hidden === true ? "hidden" : "active"
    };
    try {
      const performanceBaseSync = await backendContext.writePerformanceBaseRows([correctedBaseRow], {
        actorUid: job.requestedBy || "system:performancePublication",
        actorEmail: job.requestedByEmail || "",
        now,
        action: correction.hidden === true ? "performanceCorrection.hidden" : "performanceCorrection.updated",
        changeSeed: correctionId,
        status: correction.hidden === true ? "hidden" : "active",
        topIndexIncludeTombstones: correction.hidden === true,
        dtnInvalidationRows: [targetRow, correctedBaseRow]
      });
      const publicSnapshot = await publishIncrementalPerformanceCorrection(correction);
      if (publicSnapshot?.ok === false) throw new Error(publicSnapshot.error || "Publication de l'instantané public impossible.");
      const publicFilesSnapshot = await backendContext.rebuildPublicPerformanceFilesForAffectedRows([affectedTargetRow, correctedBaseRow], {
        now,
        reason: correction.hidden === true ? "performanceCorrection.hidden" : "performanceCorrection.updated",
        correctionId
      });
      if (publicFilesSnapshot?.ok === false) throw new Error(publicFilesSnapshot.error || "Publication des fichiers ciblés impossible.");
      await backendContext.invalidateEngagementEntryTimeCachesForPerformanceRows([affectedTargetRow, correctedBaseRow]);
      const completedAt = new Date().toISOString();
      await jobRef.set(backendContext.cleanFirestoreValue({
        status: "published",
        updatedAt: completedAt,
        completedAt,
        leaseUntil: "",
        error: "",
        result: {
          performanceBaseOk: performanceBaseSync?.ok !== false,
          publicSnapshotOk: publicSnapshot?.ok !== false,
          publicFilesOk: publicFilesSnapshot?.ok !== false,
          writtenFiles: Number(publicFilesSnapshot?.writtenFiles || 0) || 0
        }
      }), { merge: true });
      await backendContext.writeAuditLog("performanceCorrection.published", job.requestedBy || "system:performancePublication", {
        correctionId,
        targetKey,
        jobId: jobRef.id,
        attempts: job.attempts
      });
      return { published: true };
    } catch (error) {
      const failedAt = new Date().toISOString();
      const status = backendContext.performancePublicationFailureStatus(job.attempts, backendContext.PERFORMANCE_PUBLICATION_MAX_ATTEMPTS);
      const message = backendContext.cleanText(error?.message || error).slice(0, 300) || "Publication publique impossible.";
      console.error("Publication asynchrone d'une correction impossible", {
        jobId: jobRef.id,
        correctionId,
        targetKey,
        attempts: job.attempts,
        status,
        message
      });
      await jobRef.set({
        status,
        updatedAt: failedAt,
        failedAt,
        leaseUntil: "",
        error: message
      }, { merge: true });
      if (status === "failed") {
        await backendContext.writeAuditLog("performanceCorrection.publicationFailed", job.requestedBy || "system:performancePublication", {
          correctionId,
          targetKey,
          jobId: jobRef.id,
          attempts: job.attempts,
          message
        });
      }
      return { failed: true, retryable: status === "pending", error };
    }
  }

  return { upsertAdditionalCorrection, publishIncrementalPerformanceCorrection, claimPerformancePublicationJob, replacementImportRows, deactivateReplacedPerformanceBaseRows, processPerformanceImportReplacementJob, processPerformancePublicationJob };
}

module.exports = { createLegacyService_claimPerformancePublicationJob };
