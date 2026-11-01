// Existing operation bodies; live services arrive through explicit accessors.
function createAccessHandlers_rebuildAccessDirectoryIndexNextPage(backendContext) {
  async function rebuildAccessDirectoryIndexNextPage(request) {
    const context = await backendContext.accessManagementContext(request);
    if (!context.national) throw new backendContext.HttpsError("permission-denied", "Reconstruction reservee au niveau national.");
    const pageSize = Math.min(200, Math.max(20, Math.trunc(Number(request.data?.pageSize) || 100)));
    const requestedCursor = backendContext.cleanText(request.data?.cursor).slice(0, 128);
    const restart = request.data?.restart === true;
    const stateRef = backendContext.accessDirectoryIndexStateRef();
    const stateSnapshot = requestedCursor ? null : await stateRef.get();
    if (!requestedCursor && !restart && stateSnapshot?.data()?.status === "ready" && Number(stateSnapshot.data()?.version) >= backendContext.ACCESS_DIRECTORY_INDEX_VERSION) {
      return { ok: true, processed: 0, cursor: "", completed: true };
    }
    const cursor = requestedCursor || (restart ? "" : backendContext.cleanText(stateSnapshot?.data()?.cursor).slice(0, 128));
    let query = backendContext.db.collection("users").orderBy(backendContext.FieldPath.documentId()).limit(pageSize);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    const now = new Date().toISOString();
    const batch = backendContext.db.batch();
    snapshot.docs.forEach((doc) => {
      const data = doc.data() || {};
      batch.set(doc.ref, {
        accessDirectoryKeys: backendContext.accessDirectoryKeys(data, data.status),
        accessDirectoryIndexedAt: now
      }, { merge: true });
    });
    const nextCursor = snapshot.docs.at(-1)?.id || cursor;
    const completed = snapshot.size < pageSize;
    batch.set(stateRef, {
      status: completed ? "ready" : "building",
      version: backendContext.ACCESS_DIRECTORY_INDEX_VERSION,
      cursor: completed ? "" : nextCursor,
      indexedCount: restart ? snapshot.size : backendContext.FieldValue.increment(snapshot.size),
      updatedAt: now,
      ...(completed ? { completedAt: now } : {})
    }, { merge: true });
    await batch.commit();
    return { ok: true, processed: snapshot.size, cursor: completed ? "" : nextCursor, completed };
  }

  return { rebuildAccessDirectoryIndexNextPage };
}

module.exports = { createAccessHandlers_rebuildAccessDirectoryIndexNextPage };
