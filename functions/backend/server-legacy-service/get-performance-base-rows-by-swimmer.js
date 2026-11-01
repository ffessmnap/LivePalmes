// Existing operation bodies; live services arrive through explicit accessors.
function createLegacyService_getPerformanceBaseRowsBySwimmer(backendContext) {
  async function hydratePerformanceBaseRows(rows = []) {
    const normalizedRows = rows.map(backendContext.publicPerformanceBaseRow);
    const missingTechnicalKeys = normalizedRows.filter((row) =>
      !backendContext.cleanText(row.performanceBaseId) && !backendContext.cleanText(row.publicKey) && backendContext.cleanText(row.id)
    );
    if (!missingTechnicalKeys.length) return normalizedRows;
    if (missingTechnicalKeys.length > backendContext.ENGAGEMENT_SWIMMER_CORRECTION_MAX_PERFORMANCE_ROWS) {
      throw new backendContext.HttpsError("failed-precondition", "Hydratation des performances trop volumineuse.");
    }
    const refs = missingTechnicalKeys.map((row) => {
      const id = backendContext.cleanText(row.id);
      const source = id.startsWith("import:") ? "livepalmes-import" : "intranap";
      return backendContext.db.collection(backendContext.PERFORMANCE_BASE_COLLECTION).doc(backendContext.stableHash(`${source}|${id}`).slice(0, 40));
    });
    const hydratedById = new Map();
    for (let index = 0; index < refs.length; index += 400) {
      const refBatch = refs.slice(index, index + 400);
      const snapshots = await backendContext.db.getAll(...refBatch);
      snapshots.forEach((snapshot, batchIndex) => {
        if (!snapshot.exists) return;
        hydratedById.set(backendContext.cleanText(missingTechnicalKeys[index + batchIndex].id), {
          performanceBaseId: snapshot.id,
          ...(snapshot.data() || {})
        });
      });
    }
    return normalizedRows.map((row) => hydratedById.get(backendContext.cleanText(row.id)) || row);
  }

  async function getPerformanceBaseRowsBySwimmer(data = {}) {
    const ids = Array.from(new Set([
      ...(Array.isArray(data.swimmerIds) ? data.swimmerIds : []),
      data.swimmerId
    ].map((id) => backendContext.cleanText(id)).filter(Boolean))).slice(0, 25);
    const identityKey = backendContext.cleanText(data.identityKey);

    const candidateIndexRefs = [];
    if (identityKey) {
      candidateIndexRefs.push(backendContext.db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION).doc(backendContext.stableHash(identityKey).slice(0, 40)));
    }
    ids.slice(0, 10).forEach((id) => {
      candidateIndexRefs.push(backendContext.db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION).doc(backendContext.stableHash(id).slice(0, 40)));
    });
    const directSnapshots = candidateIndexRefs.length ? await backendContext.db.getAll(...candidateIndexRefs) : [];
    const indexDocs = new Map();
    directSnapshots.forEach((snapshot) => {
      if (snapshot.exists) indexDocs.set(snapshot.id, { ...(snapshot.data() || {}), id: snapshot.id });
    });
    if (!indexDocs.size && identityKey) {
      const snapshot = await backendContext.db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION)
        .where("identityKey", "==", identityKey)
        .limit(3)
        .get();
      snapshot.docs.forEach((doc) => indexDocs.set(doc.id, { ...(doc.data() || {}), id: doc.id }));
    }
    for (const id of ids.slice(0, 5)) {
      if (indexDocs.size) break;
      const snapshot = await backendContext.db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION)
        .where("sourceIds", "array-contains", id)
        .limit(3)
        .get();
      snapshot.docs.forEach((doc) => indexDocs.set(doc.id, { ...(doc.data() || {}), id: doc.id }));
    }

    const pageRefs = [];
    indexDocs.forEach((doc) => {
      const pageCount = Number(doc.pageCount || 0) || 0;
      for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
        pageRefs.push(backendContext.db.collection(backendContext.PERFORMANCE_SWIMMER_PAGES_COLLECTION).doc((0, backendContext.local$performanceSwimmerPageId)(doc.id, pageIndex)));
      }
    });
    if (pageRefs.length) {
      const snapshots = await backendContext.db.getAll(...pageRefs.slice(0, 20));
      const pageRows = backendContext.uniquePublicPerformanceRows(snapshots.flatMap((snapshot) => {
        const page = snapshot.exists ? snapshot.data() || {} : {};
        return Array.isArray(page.rows) ? page.rows : [];
      }).map(backendContext.publicPerformanceBaseRow));
      return hydratePerformanceBaseRows(pageRows);
    }

    const sourceKeys = Array.from(new Set([identityKey, ...ids].map(backendContext.cleanText).filter(Boolean))).slice(0, 10);
    for (const sourceKey of sourceKeys) {
      const payload = await backendContext.readPublicPerformanceJson(backendContext.publicPerformanceSwimmerFilePath(sourceKey), null);
      if (!Array.isArray(payload?.rows)) continue;
      const publicRows = backendContext.uniquePublicPerformanceRows(payload.rows
        .map(backendContext.publicPerformanceBaseRow)
        .filter((row) => row.active !== false && row.status !== "deleted"));
      return hydratePerformanceBaseRows(publicRows);
    }
    return [];
  }

  return { hydratePerformanceBaseRows, getPerformanceBaseRowsBySwimmer };
}

module.exports = { createLegacyService_getPerformanceBaseRowsBySwimmer };
