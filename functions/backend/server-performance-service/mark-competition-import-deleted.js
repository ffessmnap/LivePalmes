// Existing operation bodies; live services arrive through explicit accessors.
function createPerformanceService_markCompetitionImportDeleted(backendContext) {
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
      .map(backendContext.local$publicPerformanceBaseRow);
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
      const performanceBaseId = backendContext.cleanText(data.performanceBaseId || (0, backendContext.local$performanceBaseDocId)(data));
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

  return { markCompetitionImportDeleted };
}

module.exports = { createPerformanceService_markCompetitionImportDeleted };
