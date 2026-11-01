// Existing operation bodies; live services arrive through explicit accessors.
function createLegacyService_migrateHistoricalPerformanceBaseChunk(backendContext) {
  async function migrateHistoricalPerformanceBaseChunk(chunkName, request) {
    const cleanChunkName = backendContext.cleanText(chunkName);
    if (!/^chunk-[A-Za-z0-9-]+\.json$/.test(cleanChunkName)) {
      throw new backendContext.HttpsError("invalid-argument", "Lot historique invalide.");
    }
    const migrationRef = backendContext.db.collection(backendContext.PERFORMANCE_BASE_MIGRATION_COLLECTION).doc(cleanChunkName);
    const existing = await migrationRef.get();
    const existingData = existing.exists ? existing.data() || {} : {};
    if (existingData.status === "completed") {
      return {
        ok: true,
        chunk: cleanChunkName,
        alreadyCompleted: true,
        migratedCount: Number(existingData.migratedCount || 0) || 0
      };
    }

    const now = new Date().toISOString();
    const startIndex = Math.max(0, Number(existingData.migratedCount || 0) || 0);
    await migrationRef.set({
      chunk: cleanChunkName,
      status: "running",
      startedAt: existingData.startedAt || now,
      lastRunStartedAt: now,
      startedBy: request.auth.uid,
      updatedAt: now,
      batchSize: backendContext.PERFORMANCE_BASE_MIGRATION_BATCH_SIZE,
      migratedCount: startIndex
    }, { merge: true });

    try {
      const response = await fetch(`${backendContext.PERFORMANCE_PUBLIC_DATA_URL}/intranap-swimmer-perfs/${encodeURIComponent(cleanChunkName)}?cache=${Date.now()}`);
      if (!response.ok) {
        throw new Error(`Fichier ${cleanChunkName} introuvable.`);
      }
      const payload = await response.json();
      const rows = (0, backendContext.local$historicalRowsFromChunkPayload)(payload);
      const batchRows = rows.slice(startIndex, startIndex + backendContext.PERFORMANCE_BASE_MIGRATION_BATCH_SIZE);
      if (!batchRows.length) {
        const completedAt = new Date().toISOString();
        await migrationRef.set({
          chunk: cleanChunkName,
          status: "completed",
          migratedCount: rows.length,
          totalCount: rows.length,
          completedAt,
          updatedAt: completedAt,
          error: ""
        }, { merge: true });
        return {
          ok: true,
          chunk: cleanChunkName,
          migratedCount: rows.length,
          totalCount: rows.length,
          completedAt,
          doneWithChunk: true
        };
      }
      const sync = await backendContext.writePerformanceBaseRows(batchRows, {
        actorUid: request.auth.uid,
        actorEmail: request.auth.token?.email || "",
        now: new Date().toISOString(),
        action: "historicalMigration.chunk",
        changeSeed: cleanChunkName,
        status: "active",
        logChanges: false
      });
      const nextIndex = startIndex + sync.written;
      const doneWithChunk = nextIndex >= rows.length;
      const completedAt = doneWithChunk ? new Date().toISOString() : "";
      const updatedAt = new Date().toISOString();
      await migrationRef.set({
        chunk: cleanChunkName,
        status: doneWithChunk ? "completed" : "partial",
        migratedCount: nextIndex,
        totalCount: rows.length,
        lastBatchCount: sync.written,
        completedAt,
        updatedAt,
        error: ""
      }, { merge: true });
      return {
        ok: true,
        chunk: cleanChunkName,
        migratedCount: nextIndex,
        totalCount: rows.length,
        batchStart: startIndex,
        batchCount: sync.written,
        doneWithChunk,
        completedAt
      };
    } catch (error) {
      const failedAt = new Date().toISOString();
      await migrationRef.set({
        chunk: cleanChunkName,
        status: "error",
        error: error?.message || String(error),
        failedAt,
        updatedAt: failedAt
      }, { merge: true });
      throw new backendContext.HttpsError("internal", error?.message || "Migration du lot impossible.");
    }
  }

  return { migrateHistoricalPerformanceBaseChunk };
}

module.exports = { createLegacyService_migrateHistoricalPerformanceBaseChunk };
