// Existing operation bodies; live services arrive through explicit accessors.
function createAccessHandlers_listAccessUsers(backendContext) {
  async function listAccessUsers(request) {
    const context = await backendContext.accessManagementContext(request);
    const pageSize = Math.min(50, Math.max(10, Math.trunc(Number(request.data?.pageSize) || 25)));
    const status = ["active", "inactive"].includes(backendContext.cleanText(request.data?.status))
      ? backendContext.cleanText(request.data.status)
      : "";
    const capability = backendContext.ACCESS_CAPABILITY_SET.has(backendContext.cleanText(request.data?.capability))
      ? backendContext.cleanText(request.data.capability)
      : "";
    const search = backendContext.cleanText(request.data?.search).slice(0, 80);
    const cursor = request.data?.cursor && typeof request.data.cursor === "object" ? request.data.cursor : {};

    if (search) {
      const offset = Math.max(0, Math.trunc(Number(cursor.offset) || 0));
      const searchResult = await backendContext.searchAccessUserDocuments(search, context);
      const matches = searchResult.documents
        .filter((doc) => backendContext.accessUserMatchesFilters(doc, status, capability))
        .filter((doc) => backendContext.accessUserVisibleForAccessDirectory(context, doc));
      const page = matches.slice(offset, offset + pageSize);
      return {
        ok: true,
        directoryVersion: 2,
        users: page.map(backendContext.accessUserListItem),
        nextCursor: offset + pageSize < matches.length ? { offset: offset + pageSize } : null,
        scannedCount: searchResult.scannedCount,
        truncated: searchResult.truncated
      };
    }

    const indexState = await backendContext.accessDirectoryIndexStateRef().get();
    if (indexState.data()?.status === "ready" && Number(indexState.data()?.version) >= backendContext.ACCESS_DIRECTORY_INDEX_VERSION) {
      const documentId = backendContext.FieldPath.documentId();
      let query = backendContext.db.collection("users")
        .where("accessDirectoryKeys", "array-contains", backendContext.accessDirectoryFilterKey(context, status, capability))
        .orderBy("lastName")
        .orderBy(documentId);
      if (backendContext.cleanText(cursor.uid) && typeof cursor.lastName === "string") {
        query = query.startAfter(cursor.lastName, backendContext.cleanText(cursor.uid));
      }
      const snapshot = await query.limit(pageSize + 1).get();
      const page = snapshot.docs.slice(0, pageSize);
      const lastVisible = page.at(-1);
      return {
        ok: true,
        directoryVersion: 3,
        users: page.map(backendContext.accessUserListItem),
        nextCursor: snapshot.size > pageSize && lastVisible
          ? { lastName: lastVisible.data()?.lastName || "", uid: lastVisible.id }
          : null,
        scannedCount: snapshot.size,
        truncated: false
      };
    }

    const usersRef = backendContext.db.collection("users");
    const documentId = backendContext.FieldPath.documentId();
    const matchingDocs = [];
    let queryCursor = backendContext.cleanText(cursor.uid) && typeof cursor.lastName === "string"
      ? { lastName: cursor.lastName, uid: backendContext.cleanText(cursor.uid) }
      : null;
    let exhausted = false;
    let scannedCount = 0;
    const maxScanned = 250;

    while (matchingDocs.length <= pageSize && !exhausted && scannedCount < maxScanned) {
      let query = usersRef;
      if (!context.national && context.regionId) query = query.where("regionId", "==", context.regionId);
      query = query.orderBy("lastName").orderBy(documentId);
      if (queryCursor) query = query.startAfter(queryCursor.lastName, queryCursor.uid);
      const batchSize = Math.min(status || capability ? 100 : pageSize + 1, maxScanned - scannedCount);
      const snapshot = await query.limit(batchSize).get();
      if (!snapshot.size) break;
      scannedCount += snapshot.size;
      for (const doc of snapshot.docs) {
        queryCursor = { lastName: doc.data()?.lastName || "", uid: doc.id };
        if (backendContext.accessUserMatchesFilters(doc, status, capability) && backendContext.accessUserVisibleForAccessDirectory(context, doc)) matchingDocs.push(doc);
        if (matchingDocs.length > pageSize) break;
      }
      exhausted = snapshot.size < batchSize;
    }

    const page = matchingDocs.slice(0, pageSize);
    const lastVisible = page.at(-1);
    const truncated = !exhausted && scannedCount >= maxScanned;
    const nextCursor = matchingDocs.length > pageSize && lastVisible
      ? { lastName: lastVisible.data()?.lastName || "", uid: lastVisible.id }
      : truncated && queryCursor
        ? queryCursor
        : null;
    console.info("Annuaire portail", { uid: context.uid, search: Boolean(search), scannedCount, returnedCount: page.length, truncated });
    return {
      ok: true,
      directoryVersion: 2,
      users: page.map(backendContext.accessUserListItem),
      nextCursor,
      scannedCount,
      truncated
    };
  }

  return { listAccessUsers };
}

module.exports = { createAccessHandlers_listAccessUsers };
