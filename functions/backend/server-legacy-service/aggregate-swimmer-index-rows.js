// Existing operation bodies; live services arrive through explicit accessors.
function createLegacyService_aggregateSwimmerIndexRows(backendContext) {
  function swimmerDisplayNameFromRow(row = {}) {
    return backendContext.cleanText(row.swimmer) || [backendContext.cleanText(row.firstName), backendContext.cleanText(row.lastName)].filter(Boolean).join(" ");
  }

  function aggregateSwimmerIndexRows(rows = []) {
    const byKey = new Map();
    rows.forEach((inputRow) => {
      if (!inputRow || inputRow.active === false || inputRow.status === "hidden") return;
      const row = backendContext.publicPerformanceBaseRow(inputRow);
      const key = backendContext.performanceSwimmerIndexKey(row);
      if (!key) return;
      const current = byKey.get(key) || {
        id: backendContext.cleanText(row.swimmerId || row.originalSwimmerId),
        aliases: new Set(),
        sourceIds: new Set(),
        identityKey: backendContext.cleanText(row.swimmerIdentityKey),
        name: swimmerDisplayNameFromRow(row),
        lastName: backendContext.cleanText(row.lastName),
        firstName: backendContext.cleanText(row.firstName),
        birthDate: backendContext.cleanText(row.birthDate),
        sex: backendContext.cleanText(row.sex),
        clubId: backendContext.cleanText(row.clubId),
        club: backendContext.cleanText(row.club),
        clubName: backendContext.cleanText(row.clubName),
        latestDate: backendContext.cleanText(row.date),
        performanceCount: 0
      };
      [row.swimmerId, row.originalSwimmerId, ...(Array.isArray(row.sourceIds) ? row.sourceIds : [])]
        .map(backendContext.cleanText)
        .filter(Boolean)
        .forEach((id) => current.sourceIds.add(id));
      if (row.swimmerId && current.id && row.swimmerId !== current.id) current.aliases.add(row.swimmerId);
      const rowDate = backendContext.cleanText(row.date);
      if (!current.latestDate || rowDate > current.latestDate) {
        current.latestDate = rowDate;
        current.clubId = backendContext.cleanText(row.clubId) || current.clubId;
        current.club = backendContext.cleanText(row.club) || current.club;
        current.clubName = backendContext.cleanText(row.clubName) || current.clubName;
      }
      current.id = current.id || backendContext.cleanText(row.swimmerId || row.originalSwimmerId);
      current.identityKey = current.identityKey || backendContext.cleanText(row.swimmerIdentityKey);
      current.name = current.name || swimmerDisplayNameFromRow(row);
      current.lastName = current.lastName || backendContext.cleanText(row.lastName);
      current.firstName = current.firstName || backendContext.cleanText(row.firstName);
      current.birthDate = current.birthDate || backendContext.cleanText(row.birthDate);
      current.sex = current.sex || backendContext.cleanText(row.sex);
      current.performanceCount += 1;
      byKey.set(key, current);
    });

    return Array.from(byKey.entries()).map(([key, swimmer]) => {
      const sourceIds = Array.from(swimmer.sourceIds);
      const aliases = Array.from(new Set([...swimmer.aliases, ...sourceIds.filter((id) => id !== swimmer.id)]));
      const searchText = backendContext.normalizePerformanceSearchText([
        swimmer.name,
        swimmer.firstName,
        swimmer.lastName,
        swimmer.birthDate,
        swimmer.sex,
        swimmer.club,
        swimmer.clubName,
        swimmer.id,
        ...sourceIds
      ].filter(Boolean).join(" "));
      return backendContext.cleanFirestoreValue({
        indexKey: key,
        id: swimmer.id || sourceIds[0] || backendContext.stableHash(key).slice(0, 16),
        aliases,
        sourceIds,
        identityKey: swimmer.identityKey || key,
        name: swimmer.name,
        lastName: swimmer.lastName,
        firstName: swimmer.firstName,
        birthDate: swimmer.birthDate,
        sex: swimmer.sex,
        clubId: swimmer.clubId,
        club: swimmer.club,
        clubName: swimmer.clubName,
        performanceCount: swimmer.performanceCount,
        latestDate: swimmer.latestDate,
        searchText,
        searchPrefixes: backendContext.performanceSearchPrefixes(searchText),
        source: "performances"
      });
    });
  }

  async function writePerformanceSwimmerIndexRows(rows = [], context = {}) {
    const swimmers = aggregateSwimmerIndexRows(rows);
    if (!swimmers.length) return { ok: true, written: 0 };
    const now = context.now || new Date().toISOString();
    let batch = backendContext.db.batch();
    let batchSize = 0;
    let written = 0;
    const commits = [];

    function commitIfNeeded(force = false) {
      if (batchSize >= 420 || (force && batchSize > 0)) {
        commits.push(batch.commit());
        batch = backendContext.db.batch();
        batchSize = 0;
      }
    }

    swimmers.forEach((swimmer) => {
      const ref = backendContext.db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION).doc(backendContext.stableHash(swimmer.indexKey).slice(0, 40));
      const payload = {
        ...swimmer,
        updatedAt: now,
        sourceAction: context.action || "performance.indexed"
      };
      if (context.mode !== "replace") {
        delete payload.performanceCount;
        if ((swimmer.aliases || []).length) payload.aliases = backendContext.FieldValue.arrayUnion(...swimmer.aliases);
        if ((swimmer.sourceIds || []).length) payload.sourceIds = backendContext.FieldValue.arrayUnion(...swimmer.sourceIds);
        if ((swimmer.searchPrefixes || []).length) payload.searchPrefixes = backendContext.FieldValue.arrayUnion(...swimmer.searchPrefixes);
      }
      batch.set(ref, payload, { merge: context.mode !== "replace" });
      batchSize += 1;
      written += 1;
      commitIfNeeded();
    });

    commitIfNeeded(true);
    await Promise.all(commits);
    return { ok: true, written };
  }

  function sortSwimmerPerformanceRows(rows = []) {
    return rows.sort((a, b) =>
      backendContext.cleanText(b.date).localeCompare(backendContext.cleanText(a.date)) ||
      backendContext.cleanText(a.course).localeCompare(backendContext.cleanText(b.course), "fr-FR", { numeric: true }) ||
      Number(a.timeValue || 0) - Number(b.timeValue || 0)
    );
  }

  async function writePerformanceSwimmerPageRows(rows = [], context = {}) {
    const bySwimmer = new Map();
    rows.forEach((rawRow) => {
      const row = backendContext.publicPerformanceBaseRow(rawRow);
      const key = backendContext.performanceSwimmerIndexKey(row);
      if (!key) return;
      if (!bySwimmer.has(key)) bySwimmer.set(key, []);
      bySwimmer.get(key).push(row);
    });
    if (!bySwimmer.size) return { ok: true, writtenPages: 0 };

    const now = context.now || new Date().toISOString();
    let writtenPages = 0;

    for (const [indexKey, swimmerRows] of bySwimmer.entries()) {
      const indexDocId = backendContext.stableHash(indexKey).slice(0, 40);
      const indexRef = backendContext.db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION).doc(indexDocId);
      const indexSnapshot = await indexRef.get();
      const existingPageCount = Number(indexSnapshot.data()?.pageCount || 0) || 0;
      const pageRefs = Array.from({ length: existingPageCount }, (_, pageIndex) =>
        backendContext.db.collection(backendContext.PERFORMANCE_SWIMMER_PAGES_COLLECTION).doc((0, backendContext.local$performanceSwimmerPageId)(indexDocId, pageIndex))
      );
      const pageSnapshots = pageRefs.length ? await backendContext.db.getAll(...pageRefs) : [];
      const existingRows = pageSnapshots.flatMap((snapshot) => {
        const page = snapshot.exists ? snapshot.data() || {} : {};
        return Array.isArray(page.rows) ? page.rows : [];
      });
      const mergedByPublicKey = new Map();
      [...existingRows, ...swimmerRows].forEach((row) => {
        const key = backendContext.cleanText(row.publicKey || row.performanceBaseId || row.id || backendContext.performancePublicKey(row));
        if (!key) return;
        mergedByPublicKey.set(key, row);
      });
      const activeRows = sortSwimmerPerformanceRows(Array.from(mergedByPublicKey.values())
        .filter((row) => row.active !== false && row.status !== "hidden")
        .map(backendContext.publicPerformanceBaseRow));
      const pageCount = Math.ceil(activeRows.length / backendContext.PERFORMANCE_SWIMMER_PAGE_SIZE);
      let batch = backendContext.db.batch();
      let batchSize = 0;
      const commits = [];

      function commitIfNeeded(force = false) {
        if (batchSize >= 420 || (force && batchSize > 0)) {
          commits.push(batch.commit());
          batch = backendContext.db.batch();
          batchSize = 0;
        }
      }

      for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
        const pageRef = backendContext.db.collection(backendContext.PERFORMANCE_SWIMMER_PAGES_COLLECTION).doc((0, backendContext.local$performanceSwimmerPageId)(indexDocId, pageIndex));
        const pageRows = activeRows.slice(pageIndex * backendContext.PERFORMANCE_SWIMMER_PAGE_SIZE, (pageIndex + 1) * backendContext.PERFORMANCE_SWIMMER_PAGE_SIZE);
        batch.set(pageRef, {
          swimmerIndexId: indexDocId,
          indexKey,
          pageIndex,
          rowCount: pageRows.length,
          rows: pageRows,
          updatedAt: now
        }, { merge: false });
        batchSize += 1;
        writtenPages += 1;
        commitIfNeeded();
      }
      for (let pageIndex = pageCount; pageIndex < existingPageCount; pageIndex += 1) {
        batch.delete(backendContext.db.collection(backendContext.PERFORMANCE_SWIMMER_PAGES_COLLECTION).doc((0, backendContext.local$performanceSwimmerPageId)(indexDocId, pageIndex)));
        batchSize += 1;
        commitIfNeeded();
      }
      batch.set(indexRef, {
        pageCount,
        performanceCount: activeRows.filter((row) => !row.isIntermediate).length,
        rowCount: activeRows.length,
        updatedAt: now,
        sourceAction: context.action || "performance.pages"
      }, { merge: true });
      batchSize += 1;
      commitIfNeeded(true);
      await Promise.all(commits);
    }

    return { ok: true, writtenPages };
  }

  return { swimmerDisplayNameFromRow, aggregateSwimmerIndexRows, writePerformanceSwimmerIndexRows, sortSwimmerPerformanceRows, writePerformanceSwimmerPageRows };
}

module.exports = { createLegacyService_aggregateSwimmerIndexRows };
