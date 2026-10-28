// Preserve the execution mode of the existing index.js function bodies.

// Private existing helpers; live services/state are supplied by index.js.
// Module creation performs no external operation.
function createLegacyService(backendContext) {
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

  function performanceSwimmerPageId(indexDocId, pageIndex) {
    return `${indexDocId}_${String(pageIndex).padStart(4, "0")}`;
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
        backendContext.db.collection(backendContext.PERFORMANCE_SWIMMER_PAGES_COLLECTION).doc(performanceSwimmerPageId(indexDocId, pageIndex))
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
        const pageRef = backendContext.db.collection(backendContext.PERFORMANCE_SWIMMER_PAGES_COLLECTION).doc(performanceSwimmerPageId(indexDocId, pageIndex));
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
        batch.delete(backendContext.db.collection(backendContext.PERFORMANCE_SWIMMER_PAGES_COLLECTION).doc(performanceSwimmerPageId(indexDocId, pageIndex)));
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
        pageRefs.push(backendContext.db.collection(backendContext.PERFORMANCE_SWIMMER_PAGES_COLLECTION).doc(performanceSwimmerPageId(doc.id, pageIndex)));
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

  async function normalizedImportPerformances(importId) {
    const importRef = backendContext.db.collection("performanceImports").doc(importId);
    const importDoc = await importRef.get();
    if (!importDoc.exists) return [];
    const importData = importDoc.data() || {};
    if (importData.status !== "stored") return [];
    const metadata = importData.metadata || {};
    const performancesSnapshot = await importRef
      .collection("performances")
      .where("active", "==", true)
      .get();
    const rawPerformances = performancesSnapshot.docs.map((perfDoc) => ({
      id: perfDoc.id,
      importId,
      metadata,
      competitionName: importData.competitionName || metadata.competitionName || "",
      importedAt: importData.importedAt || "",
      ...perfDoc.data()
    }));
    return backendContext.normalizeLivePalmesImportPerformances(rawPerformances);
  }

  async function syncImportToPerformanceBase(importId, context = {}) {
    const performances = await normalizedImportPerformances(importId);
    const result = await backendContext.writePerformanceBaseRows(performances, {
      ...context,
      importId,
      action: "performanceImport.synced",
      changeSeed: importId
    });
    await backendContext.db.collection("performanceImports").doc(importId).set({
      performanceBaseSyncedAt: context.now || new Date().toISOString(),
      performanceBaseCount: result.written
    }, { merge: true });
    return result;
  }

  function buildAdditionalPerformanceSwimmers(performances = []) {
    const swimmersById = new Map();
    performances.forEach((perf) => {
      if (!swimmersById.has(perf.swimmerId)) {
        swimmersById.set(perf.swimmerId, {
          id: perf.swimmerId,
          aliases: Array.isArray(perf.aliases) ? perf.aliases : [],
          sourceIds: Array.from(new Set([...(Array.isArray(perf.sourceIds) ? perf.sourceIds : []), perf.swimmerId, perf.originalSwimmerId].filter(Boolean))),
          identityKey: perf.swimmerIdentityKey || "",
          name: perf.swimmer,
          lastName: perf.lastName,
          firstName: perf.firstName,
          birthDate: perf.birthDate,
          sex: perf.sex,
          clubId: perf.clubId,
          club: perf.club,
          clubName: perf.clubName,
          performanceCount: 0,
          chunk: "",
          source: "livepalmes-import"
        });
      }
      swimmersById.get(perf.swimmerId).performanceCount += 1;
    });
    return Array.from(swimmersById.values());
  }

  function emptyAdditionalPerformanceDataSnapshot() {
    return {
      ok: true,
      available: false,
      generatedAt: "",
      importCount: 0,
      performanceCount: 0,
      correctionCount: 0,
      swimmers: [],
      performances: [],
      corrections: []
    };
  }

  function normalizeAdditionalPerformanceDataSnapshot(snapshot = {}) {
    const performances = (Array.isArray(snapshot.performances) ? snapshot.performances : [])
      .map(backendContext.publicPerformanceBaseRow);
    const corrections = Array.isArray(snapshot.corrections) ? snapshot.corrections : [];
    const swimmers = Array.isArray(snapshot.swimmers) ? snapshot.swimmers : buildAdditionalPerformanceSwimmers(performances);
    const importCount = Array.from(new Set(performances.map((row) => backendContext.cleanText(row.importId)).filter(Boolean))).length;
    return {
      ok: snapshot.ok !== false,
      available: snapshot.available !== false,
      generatedAt: backendContext.cleanText(snapshot.generatedAt),
      importCount: importCount || Number(snapshot.importCount || 0) || 0,
      performanceCount: performances.length,
      correctionCount: corrections.length,
      swimmers,
      performances,
      corrections
    };
  }

  function additionalPerformanceFile() {
    return backendContext.storage.bucket(backendContext.PUBLIC_PERFORMANCE_BUCKET).file(backendContext.PUBLIC_ADDITIONAL_PERFORMANCE_PATH);
  }

  async function readPublishedAdditionalPerformanceDataSnapshot() {
    const file = additionalPerformanceFile();
    try {
      const [buffer] = await file.download();
      return normalizeAdditionalPerformanceDataSnapshot(JSON.parse(buffer.toString("utf8")));
    } catch (error) {
      if (error?.code === 404 || error?.code === 403 || /No such object|not found/i.test(error?.message || "")) {
        return emptyAdditionalPerformanceDataSnapshot();
      }
      throw error;
    }
  }

  function additionalPerformanceRowKey(row = {}) {
    return backendContext.cleanText(row.publicKey || backendContext.performancePublicKey(row) || row.performanceBaseId || row.id);
  }

  function mergeAdditionalPerformanceRows(existingRows = [], incomingRows = [], replaceImportId = "") {
    const byKey = new Map();
    existingRows.forEach((row) => {
      if (replaceImportId && backendContext.cleanText(row.importId) === replaceImportId) return;
      const key = additionalPerformanceRowKey(row);
      if (key) byKey.set(key, row);
    });
    incomingRows.forEach((row) => {
      const key = additionalPerformanceRowKey(row);
      if (key) byKey.set(key, row);
    });
    return Array.from(byKey.values());
  }

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

  async function saveAdditionalPerformanceDataSnapshot(snapshot = {}) {
    const normalized = normalizeAdditionalPerformanceDataSnapshot({
      ...snapshot,
      ok: true,
      generatedAt: new Date().toISOString(),
      swimmers: buildAdditionalPerformanceSwimmers(snapshot.performances || [])
    });
    const file = additionalPerformanceFile();
    await file.save(JSON.stringify(normalized), {
      resumable: false,
      contentType: "application/json; charset=utf-8",
      metadata: {
        cacheControl: "public, max-age=300",
        metadata: {
          firebaseStorageDownloadTokens: backendContext.PUBLIC_ADDITIONAL_PERFORMANCE_TOKEN
        }
      }
    });
    return {
      ok: true,
      path: backendContext.PUBLIC_ADDITIONAL_PERFORMANCE_PATH,
      generatedAt: normalized.generatedAt,
      importCount: normalized.importCount,
      performanceCount: normalized.performanceCount,
      correctionCount: normalized.correctionCount,
      incremental: snapshot.incremental !== false
    };
  }

  async function publishIncrementalPerformanceImport(performances = [], importId = "") {
    const current = await readPublishedAdditionalPerformanceDataSnapshot();
    const mergedPerformances = mergeAdditionalPerformanceRows(current.performances, performances, backendContext.cleanText(importId));
    return saveAdditionalPerformanceDataSnapshot({
      ...current,
      performances: mergedPerformances
    });
  }

  async function publishIncrementalPerformanceCorrection(correction = {}) {
    const current = await readPublishedAdditionalPerformanceDataSnapshot();
    const corrections = upsertAdditionalCorrection(current.corrections, correction);
    return saveAdditionalPerformanceDataSnapshot({
      ...current,
      corrections
    });
  }

  function publicPerformanceFilesBucket() {
    return backendContext.storage.bucket(backendContext.PUBLIC_PERFORMANCE_BUCKET);
  }

  async function performanceBaseMigrationManifest() {
    const response = await fetch(`${backendContext.PERFORMANCE_PUBLIC_DATA_URL}/performance-base-migration-manifest.json?cache=${Date.now()}`);
    if (!response.ok) {
      throw new backendContext.HttpsError("failed-precondition", "Manifeste de migration historique introuvable.");
    }
    const manifest = await response.json();
    const chunks = Array.isArray(manifest.chunks) ? manifest.chunks : [];
    return {
      ...manifest,
      chunks: chunks
        .map((chunk) => ({
          name: backendContext.cleanText(chunk.name),
          performanceCount: Number(chunk.performanceCount || 0) || 0,
          swimmerCount: Number(chunk.swimmerCount || 0) || 0,
          bytes: Number(chunk.bytes || 0) || 0
        }))
        .filter((chunk) => /^chunk-[A-Za-z0-9-]+\.json$/.test(chunk.name))
    };
  }

  async function migrationChunkStatuses(chunks = []) {
    const refs = chunks.map((chunk) => backendContext.db.collection(backendContext.PERFORMANCE_BASE_MIGRATION_COLLECTION).doc(chunk.name));
    const snapshots = refs.length ? await backendContext.db.getAll(...refs) : [];
    const byName = new Map();
    snapshots.forEach((snapshot) => {
      byName.set(snapshot.id, snapshot.exists ? snapshot.data() || {} : {});
    });
    return chunks.map((chunk) => ({
      ...chunk,
      status: byName.get(chunk.name)?.status || "pending",
      migratedCount: Number(byName.get(chunk.name)?.migratedCount || 0) || 0,
      totalCount: Number(byName.get(chunk.name)?.totalCount || chunk.performanceCount || 0) || 0,
      lastBatchCount: Number(byName.get(chunk.name)?.lastBatchCount || 0) || 0,
      updatedAt: byName.get(chunk.name)?.updatedAt || "",
      completedAt: byName.get(chunk.name)?.completedAt || "",
      error: byName.get(chunk.name)?.error || ""
    }));
  }

  function historicalRowsFromChunkPayload(payload = {}) {
    const rows = [];
    Object.entries(payload || {}).forEach(([swimmerId, performances]) => {
      if (!Array.isArray(performances)) return;
      performances.forEach((perf) => {
        rows.push({
          ...perf,
          source: perf.source || "intranap",
          swimmerId: String(perf.swimmerId || swimmerId)
        });
      });
    });
    return rows;
  }

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
      const rows = historicalRowsFromChunkPayload(payload);
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

  async function buildAdditionalPerformanceDataSnapshot() {
    const snapshot = await readPublishedAdditionalPerformanceDataSnapshot();
    if (snapshot.available === false) {
      throw new backendContext.HttpsError("failed-precondition", "Fichier public des performances indisponible.");
    }
    return snapshot;
  }

  async function publishAdditionalPerformanceDataSnapshot() {
    const snapshot = await buildAdditionalPerformanceDataSnapshot();
    return saveAdditionalPerformanceDataSnapshot({
      ...snapshot,
      incremental: false
    });
  }

  async function enqueuePerformancePublicationJob(correction = {}, actor = {}) {
    const now = new Date().toISOString();
    const jobId = backendContext.stableHash(`${correction.id}|${correction.updatedAt}|${now}|${actor.uid || "system"}`).slice(0, 40);
    const ref = backendContext.db.collection(backendContext.PERFORMANCE_PUBLICATION_JOBS_COLLECTION).doc(jobId);
    await ref.create(backendContext.cleanFirestoreValue({
      id: jobId,
      type: "performanceCorrection",
      correction,
      status: "pending",
      attempts: 0,
      createdAt: now,
      updatedAt: now,
      requestedBy: actor.uid || "",
      requestedByEmail: actor.email || ""
    }));
    return backendContext.publicPerformancePublicationJob({ status: "pending", attempts: 0, createdAt: now, updatedAt: now }, jobId);
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

      const currentSnapshot = await readPublishedAdditionalPerformanceDataSnapshot();
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
      const mergedPerformances = mergeAdditionalPerformanceRows(withoutOldImport, newImport.rows, newImportId);
      const publicSnapshot = await saveAdditionalPerformanceDataSnapshot({
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

  function authorizeNapRecords(request){
    if(!request.auth?.uid)throw new backendContext.HttpsError("unauthenticated","Connexion requise.");
    if(!backendContext.ADMIN_UIDS.has(request.auth.uid) && request.auth.token?.livepalmesAccess!==true)throw new backendContext.HttpsError("permission-denied","Acces LivePalmes actif requis.");
    backendContext.assertCapability(request,"records.manage");
    if(backendContext.ENVIRONMENT.sportingDataSource!=="nap")throw new backendContext.HttpsError("failed-precondition","Source NAP requise.");
    return {uid:request.auth.uid,email:request.auth.token?.email||""};
  }

  async function readNapRecordsAdministration(request){
    authorizeNapRecords(request);
    try{return await require("./nap-records-store").read(require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{administration:true});}
    catch(error){throw nativePerformanceFailure(error);}
  }

  async function publishNativeRecords(request){
    const actor=authorizeNapRecords(request);
    try{
      const result=await require("./nap-records-store").publish(require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),request.data,actor);
      await backendContext.writeAuditLogOnce("recordsMpf.published",actor.uid,{version:String(result.revision),source:"nap",publishedAt:result.data.updatedAt||""},`nap-records-${request.data.operationId}`);
      return result;
    }
    catch(error){throw nativePerformanceFailure(error);}
  }

  function authorizeNativePerformance(request) {
    if(!request.auth?.uid)throw new backendContext.HttpsError("unauthenticated","Connexion requise.");
    backendContext.assertCapability(request,"competitions.import");
    const caps=request.auth.token?.livepalmesCapabilities||{};
    return {uid:request.auth.uid,national:backendContext.ADMIN_UIDS.has(request.auth.uid)||caps["admin.full"]===true||caps["engagements.national.manage"]===true};
  }

  function nativePerformanceFailure(error) {
    if(error instanceof backendContext.HttpsError)return error;
    return new backendContext.HttpsError(error instanceof TypeError?"failed-precondition":error instanceof RangeError?"resource-exhausted":"unavailable",
      error instanceof TypeError||error instanceof RangeError?error.message:"Operation NAP interrompue. Reprenez la meme operation ; la sauvegarde est conservee.");
  }

  return {
    swimmerDisplayNameFromRow,
    aggregateSwimmerIndexRows,
    writePerformanceSwimmerIndexRows,
    performanceSwimmerPageId,
    sortSwimmerPerformanceRows,
    writePerformanceSwimmerPageRows,
    hydratePerformanceBaseRows,
    getPerformanceBaseRowsBySwimmer,
    normalizedImportPerformances,
    syncImportToPerformanceBase,
    buildAdditionalPerformanceSwimmers,
    emptyAdditionalPerformanceDataSnapshot,
    normalizeAdditionalPerformanceDataSnapshot,
    additionalPerformanceFile,
    readPublishedAdditionalPerformanceDataSnapshot,
    additionalPerformanceRowKey,
    mergeAdditionalPerformanceRows,
    upsertAdditionalCorrection,
    saveAdditionalPerformanceDataSnapshot,
    publishIncrementalPerformanceImport,
    publishIncrementalPerformanceCorrection,
    publicPerformanceFilesBucket,
    performanceBaseMigrationManifest,
    migrationChunkStatuses,
    historicalRowsFromChunkPayload,
    migrateHistoricalPerformanceBaseChunk,
    buildAdditionalPerformanceDataSnapshot,
    publishAdditionalPerformanceDataSnapshot,
    enqueuePerformancePublicationJob,
    claimPerformancePublicationJob,
    replacementImportRows,
    deactivateReplacedPerformanceBaseRows,
    processPerformanceImportReplacementJob,
    processPerformancePublicationJob,
    authorizeNapRecords,
    readNapRecordsAdministration,
    publishNativeRecords,
    authorizeNativePerformance,
    nativePerformanceFailure
  };
}

module.exports = { createLegacyService };
