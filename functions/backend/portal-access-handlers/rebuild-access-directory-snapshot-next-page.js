// Existing operation bodies; live services arrive through explicit accessors.
function createAccessHandlers_rebuildAccessDirectorySnapshotNextPage(backendContext) {
  async function rebuildAccessDirectorySnapshotNextPage(request) {
    const context = await backendContext.accessManagementContext(request);
    if (!context.national) throw new backendContext.HttpsError("permission-denied", "Reconstruction reservee au niveau national.");
    const pageSize = Math.min(100, Math.max(20, Math.trunc(Number(request.data?.pageSize) || 100)));
    const restart = request.data?.restart === true;
    const stateRef = backendContext.accessDirectorySnapshotStateRef();
    const stateSnapshot = await stateRef.get();
    const state = stateSnapshot.exists ? stateSnapshot.data() || {} : {};
    if (!restart && state.status === "ready" && Number(state.version) >= backendContext.ACCESS_DIRECTORY_SNAPSHOT_VERSION) {
      return { ok: true, processed: 0, cursor: "", completed: true };
    }
    if (!restart && state.status !== "building") {
      throw new backendContext.HttpsError("failed-precondition", "Commence la reconstruction avec restart: true.");
    }

    if (restart) {
      const existingSnapshots = await backendContext.db.collection(backendContext.ACCESS_DIRECTORY_SNAPSHOTS_COLLECTION).limit(101).get();
      if (existingSnapshots.size > 100) {
        throw new backendContext.HttpsError("failed-precondition", "Trop de fragments d'annuaire a reinitialiser.");
      }
      const clearBatch = backendContext.db.batch();
      existingSnapshots.docs.forEach((doc) => clearBatch.delete(doc.ref));
      clearBatch.set(stateRef, {
        status: "building",
        version: backendContext.ACCESS_DIRECTORY_SNAPSHOT_VERSION,
        cursor: "",
        indexedCount: 0,
        updatedAt: new Date().toISOString()
      });
      await clearBatch.commit();
    }

    const cursor = restart ? "" : backendContext.cleanText(state.cursor).slice(0, 128);
    let query = backendContext.db.collection("users").orderBy(backendContext.FieldPath.documentId()).limit(pageSize);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    const now = new Date().toISOString();
    const nationalEntries = {};
    const regionalEntries = new Map();
    snapshot.docs.forEach((doc) => {
      const data = doc.data() || {};
      const key = backendContext.accessDirectorySnapshotEntryKey(doc.id);
      const entry = backendContext.accessDirectorySnapshotEntry(doc.id, data);
      nationalEntries[key] = entry;
      const regionId = backendContext.accessDirectorySnapshotRegionId(data);
      if (!regionId) return;
      if (!regionalEntries.has(regionId)) regionalEntries.set(regionId, {});
      regionalEntries.get(regionId)[key] = entry;
    });

    const nextCursor = snapshot.docs.at(-1)?.id || cursor;
    const completed = snapshot.size < pageSize;
    const writeBatch = backendContext.db.batch();
    backendContext.mergeAccessDirectorySnapshotEntries(writeBatch, "national", "", nationalEntries, now, "building");
    regionalEntries.forEach((entries, regionId) => {
      backendContext.mergeAccessDirectorySnapshotEntries(writeBatch, "region", regionId, entries, now, "building");
    });
    writeBatch.set(stateRef, {
      status: "building",
      version: backendContext.ACCESS_DIRECTORY_SNAPSHOT_VERSION,
      cursor: completed ? "" : nextCursor,
      indexedCount: restart ? snapshot.size : backendContext.FieldValue.increment(snapshot.size),
      updatedAt: now
    }, { merge: true });
    await writeBatch.commit();

    if (completed) {
      const generatedSnapshots = await backendContext.db.collection(backendContext.ACCESS_DIRECTORY_SNAPSHOTS_COLLECTION).limit(101).get();
      if (generatedSnapshots.size > 100) {
        throw new backendContext.HttpsError("failed-precondition", "Trop de fragments d'annuaire a finaliser.");
      }
      const finalizeBatch = backendContext.db.batch();
      generatedSnapshots.docs.forEach((doc) => finalizeBatch.set(doc.ref, {
        status: "ready",
        version: backendContext.ACCESS_DIRECTORY_SNAPSHOT_VERSION,
        updatedAt: now
      }, { merge: true }));
      finalizeBatch.set(stateRef, {
        status: "ready",
        version: backendContext.ACCESS_DIRECTORY_SNAPSHOT_VERSION,
        cursor: "",
        completedAt: now,
        updatedAt: now
      }, { merge: true });
      await finalizeBatch.commit();
    }

    return {
      ok: true,
      processed: snapshot.size,
      cursor: completed ? "" : nextCursor,
      completed,
      readBudget: {
        baseDocuments: 1,
        userDocumentsMax: pageSize,
        snapshotDocumentsMax: restart || completed ? 100 : 0
      }
    };
  }

  return { rebuildAccessDirectorySnapshotNextPage };
}

module.exports = { createAccessHandlers_rebuildAccessDirectorySnapshotNextPage };
