// Preserve the execution mode of the existing index.js function bodies.

// Existing behavior extracted from index.js. Dependencies are supplied by its entry points.
function createLegacyPerformancePublication({
  PUBLIC_PERFORMANCE_FILES_PATH,
  PUBLIC_PERFORMANCE_SWIMMER_ROW_SCHEMA_VERSION,
  PUBLIC_PERFORMANCE_TOP_PREVIEW_LIMIT,
  cleanText,
  hydratePublicSwimmerRowsFromPayload,
  normalizePerformanceSearchText,
  performancePublicKey,
  performanceSearchPrefixes,
  publicBetterPerformance,
  publicPerformanceBaseRow,
  publicPerformanceFilesBucket,
  publicPerformanceSwimmerStorageRow,
  publicSwimmerKey,
  publicSwimmerPayloadSupportsTopRebuild,
  stableHash,
  uniquePublicPerformanceRows
}) {
  function publicPerformanceFilePath(relativePath = "") {
    return `${PUBLIC_PERFORMANCE_FILES_PATH}/${String(relativePath || "").replace(/^\/+/, "")}`;
  }

  function publicPerformanceFile(relativePath = "") {
    return publicPerformanceFilesBucket().file(publicPerformanceFilePath(relativePath));
  }

  async function readPublicPerformanceJson(relativePath, fallback) {
    const file = publicPerformanceFile(relativePath);
    try {
      const [buffer] = await file.download();
      return JSON.parse(buffer.toString("utf8"));
    } catch (error) {
      if (error?.code === 404 || error?.code === 403 || /No such object|not found/i.test(error?.message || "")) {
        return fallback;
      }
      throw error;
    }
  }

  async function savePublicPerformanceJson(relativePath, payload, cacheControl = "public, max-age=300") {
    const file = publicPerformanceFile(relativePath);
    await file.save(JSON.stringify(payload), {
      resumable: false,
      contentType: "application/json; charset=utf-8",
      metadata: { cacheControl }
    });
    return publicPerformanceFilePath(relativePath);
  }

  async function savePublicPerformanceText(relativePath, content, cacheControl = "public, max-age=300") {
    const file = publicPerformanceFile(relativePath);
    await file.save(content, {
      resumable: false,
      contentType: "application/javascript; charset=utf-8",
      metadata: { cacheControl }
    });
    return publicPerformanceFilePath(relativePath);
  }

  function publicPerformanceCompactObject(object = {}) {
    return Object.fromEntries(Object.entries(object).filter(([, value]) => {
      if (value === "" || value === null || value === undefined) return false;
      if (value === false) return false;
      if (Array.isArray(value) && !value.length) return false;
      return true;
    }));
  }

  function publicPerformanceSearchShard(value) {
    const token = normalizePerformanceSearchText(value).split(/\s+/).find((item) => item.length >= 2) || "";
    return token.slice(0, 2).toLowerCase();
  }

  function publicPerformanceIdShard(value) {
    const id = cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
    if (!id) return "";
    return id.length === 1 ? `0${id}` : id.slice(0, 2);
  }

  function publicPerformanceTopFileName(sex, category) {
    return `${cleanText(sex)}-${cleanText(category).replace(/\+/g, "")}.json`;
  }

  function publicPerformanceSwimmerFilePath(indexKey) {
    const hash = stableHash(indexKey).slice(0, 40);
    return `swimmers/${hash.slice(0, 2)}/${hash}.json`;
  }

  function publicPerformanceRowKey(row = {}) {
    return cleanText(row.publicKey || performancePublicKey(row) || row.performanceBaseId || row.id);
  }

  function publicPerformanceTopCandidateKey(row = {}) {
    return [
      publicSwimmerKey(row),
      Number(row.seasonYear || 0) || 0,
      cleanText(row.regionId),
      cleanText(row.pool)
    ].join("|");
  }

  function publicPerformanceSwimmerRow(row = {}) {
    return publicPerformanceSwimmerStorageRow(row);
  }

  function publicPerformanceTopRow(row = {}) {
    const intermediateTimes = Array.isArray(row.intermediateTimes) ? row.intermediateTimes : [];
    return publicPerformanceCompactObject({
      id: cleanText(row.id),
      source: cleanText(row.source || "livepalmes"),
      importId: cleanText(row.importId),
      publicKey: cleanText(row.publicKey),
      performanceBaseId: cleanText(row.performanceBaseId),
      swimmerId: cleanText(row.swimmerId),
      swimmerIdentityKey: cleanText(row.swimmerIdentityKey),
      swimmer: cleanText(row.swimmer),
      firstName: cleanText(row.firstName),
      lastName: cleanText(row.lastName),
      birthDate: cleanText(row.birthDate),
      sex: cleanText(row.sex),
      club: cleanText(row.club),
      clubName: cleanText(row.clubName),
      regionId: cleanText(row.regionId),
      competition: cleanText(row.competition),
      location: cleanText(row.location),
      date: cleanText(row.date),
      seasonYear: Number(row.seasonYear || 0) || 0,
      pool: cleanText(row.pool),
      chrono: cleanText(row.chrono),
      course: cleanText(row.course),
      courseShortLabel: cleanText(row.courseShortLabel),
      isIntermediate: row.isIntermediate === true,
      originCourse: cleanText(row.originCourse),
      category: cleanText(row.category),
      categoryCode: cleanText(row.categoryCode),
      timeValue: Number(row.timeValue || 0) || 0,
      time: cleanText(row.time),
      intermediateTimes
    });
  }

  function sortPublicPerformanceRows(rows = []) {
    return rows.sort((a, b) =>
      cleanText(b.date).localeCompare(cleanText(a.date)) ||
      cleanText(a.course).localeCompare(cleanText(b.course), "fr-FR", { numeric: true }) ||
      Number(a.timeValue || 0) - Number(b.timeValue || 0)
    );
  }

  function sortPublicTopRows(rows = []) {
    return rows.sort((a, b) =>
      Number(a.timeValue || 0) - Number(b.timeValue || 0) ||
      cleanText(a.date).localeCompare(cleanText(b.date))
    );
  }

  function mergePublicSwimmerRows(existingRows = [], incomingRows = []) {
    const byKey = new Map();
    [...existingRows, ...incomingRows].forEach((row) => {
      const key = publicPerformanceRowKey(row);
      if (!key) return;
      byKey.set(key, publicPerformanceSwimmerRow(row));
    });
    return sortPublicPerformanceRows(Array.from(byKey.values()));
  }

  function mergePublicTopRows(existingRows = [], incomingRows = []) {
    const byCandidate = new Map();
    [...existingRows, ...incomingRows].forEach((inputRow) => {
      const row = publicPerformanceTopRow(inputRow);
      if (!row.course || !row.sex || !row.category || !row.timeValue) return;
      const candidateKey = publicPerformanceTopCandidateKey(row);
      if (!candidateKey) return;
      if (publicBetterPerformance(row, byCandidate.get(candidateKey))) byCandidate.set(candidateKey, row);
    });
    return sortPublicTopRows(Array.from(byCandidate.values()));
  }

  function buildPublicSwimmerPayload(indexKey, rows = []) {
    const sortedRows = sortPublicPerformanceRows(rows.map(publicPerformanceBaseRow));
    const first = sortedRows[0] || {};
    const latestWithClub = sortedRows.find((row) => row.club || row.clubName) || first;
    const sourceIds = Array.from(new Set(sortedRows.flatMap((row) => [row.swimmerId, row.originalSwimmerId]).map(cleanText).filter(Boolean)));
    const aliases = Array.from(new Set(sourceIds.filter((id) => id && id !== first.swimmerId)));
    const name = cleanText(first.swimmer) || [first.firstName, first.lastName].filter(Boolean).join(" ");
    return publicPerformanceCompactObject({
      id: cleanText(first.swimmerId || sourceIds[0] || stableHash(indexKey).slice(0, 16)),
      identityKey: cleanText(first.swimmerIdentityKey || indexKey),
      aliases,
      sourceIds,
      name,
      lastName: cleanText(first.lastName),
      firstName: cleanText(first.firstName),
      birthDate: cleanText(first.birthDate),
      sex: cleanText(first.sex),
      clubId: cleanText(latestWithClub.clubId),
      club: cleanText(latestWithClub.club),
      clubName: cleanText(latestWithClub.clubName),
      rowSchemaVersion: PUBLIC_PERFORMANCE_SWIMMER_ROW_SCHEMA_VERSION,
      performanceCount: sortedRows.filter((row) => !row.isIntermediate).length,
      rowCount: sortedRows.length,
      rows: sortedRows.map(publicPerformanceSwimmerRow)
    });
  }

  function buildPublicSearchRow(swimmerPayload = {}, perfFile = "") {
    const sourceIds = Array.isArray(swimmerPayload.sourceIds) ? swimmerPayload.sourceIds : [];
    const aliases = Array.isArray(swimmerPayload.aliases) ? swimmerPayload.aliases : [];
    const searchText = normalizePerformanceSearchText([
      swimmerPayload.name,
      swimmerPayload.firstName,
      swimmerPayload.lastName,
      swimmerPayload.birthDate,
      swimmerPayload.sex,
      swimmerPayload.club,
      swimmerPayload.clubName,
      swimmerPayload.id,
      ...sourceIds
    ].filter(Boolean).join(" "));
    const searchIndexText = normalizePerformanceSearchText([
      swimmerPayload.name,
      swimmerPayload.firstName,
      swimmerPayload.lastName,
      swimmerPayload.id,
      ...sourceIds
    ].filter(Boolean).join(" "));
    return {
      id: swimmerPayload.id,
      aliases,
      sourceIds,
      identityKey: swimmerPayload.identityKey,
      name: swimmerPayload.name,
      lastName: swimmerPayload.lastName,
      firstName: swimmerPayload.firstName,
      birthDate: swimmerPayload.birthDate,
      sex: swimmerPayload.sex,
      clubId: swimmerPayload.clubId,
      club: swimmerPayload.club,
      clubName: swimmerPayload.clubName,
      performanceCount: swimmerPayload.performanceCount,
      latestDate: swimmerPayload.rows?.[0]?.date || "",
      searchText,
      searchPrefixes: performanceSearchPrefixes(searchIndexText),
      perfFile
    };
  }

  async function publishPublicSwimmerFile(indexKey, incomingRows = []) {
    const perfFile = publicPerformanceSwimmerFilePath(indexKey);
    const existing = await readPublicPerformanceJson(perfFile, null);
    const existingRows = Array.isArray(existing?.rows) ? existing.rows : [];
    const mergedRows = mergePublicSwimmerRows(existingRows, incomingRows);
    const generated = buildPublicSwimmerPayload(indexKey, mergedRows);
    const payload = {
      ...generated,
      id: generated.id || cleanText(existing?.id),
      identityKey: generated.identityKey || cleanText(existing?.identityKey) || indexKey,
      aliases: Array.from(new Set([...(Array.isArray(existing?.aliases) ? existing.aliases : []), ...(generated.aliases || [])].map(cleanText).filter(Boolean))),
      sourceIds: Array.from(new Set([...(Array.isArray(existing?.sourceIds) ? existing.sourceIds : []), ...(generated.sourceIds || [])].map(cleanText).filter(Boolean))),
      name: generated.name || cleanText(existing?.name),
      lastName: generated.lastName || cleanText(existing?.lastName),
      firstName: generated.firstName || cleanText(existing?.firstName),
      birthDate: generated.birthDate || cleanText(existing?.birthDate),
      sex: generated.sex || cleanText(existing?.sex),
      clubId: generated.clubId || cleanText(existing?.clubId),
      club: generated.club || cleanText(existing?.club),
      clubName: generated.clubName || cleanText(existing?.clubName)
    };
    await savePublicPerformanceJson(perfFile, payload, "public, max-age=31536000, immutable");
    return { perfFile, payload, existing };
  }

  async function publishPublicSearchIndexes(swimmerPayload, perfFile) {
    const searchRow = buildPublicSearchRow(swimmerPayload, perfFile);
    const searchShards = new Set((searchRow.searchPrefixes || []).map(publicPerformanceSearchShard).filter(Boolean));
    const idValues = [searchRow.id, ...(searchRow.sourceIds || []), ...(searchRow.aliases || [])].map(cleanText).filter(Boolean);
    const idShards = new Set(idValues.map(publicPerformanceIdShard).filter(Boolean));
    const written = [];

    for (const shard of searchShards) {
      const relativePath = `search/${shard}.json`;
      const rows = await readPublicPerformanceJson(relativePath, []);
      const byId = new Map((Array.isArray(rows) ? rows : []).map((row) => [cleanText(row.id), row]));
      byId.set(cleanText(searchRow.id), publicPerformanceCompactObject({ ...searchRow, searchPrefixes: undefined }));
      const mergedRows = Array.from(byId.values()).sort((a, b) =>
        cleanText(a.lastName).localeCompare(cleanText(b.lastName), "fr-FR") ||
        cleanText(a.firstName).localeCompare(cleanText(b.firstName), "fr-FR") ||
        cleanText(a.name).localeCompare(cleanText(b.name), "fr-FR")
      );
      written.push(await savePublicPerformanceJson(relativePath, mergedRows, "public, max-age=31536000, immutable"));
    }

    for (const shard of idShards) {
      const relativePath = `ids/${shard}.json`;
      const items = await readPublicPerformanceJson(relativePath, {});
      idValues.forEach((id) => {
        items[id] = publicPerformanceCompactObject({ ...searchRow, searchPrefixes: undefined });
      });
      written.push(await savePublicPerformanceJson(relativePath, items, "public, max-age=31536000, immutable"));
    }

    return written;
  }

  function distinctPublicTopPreview(rows, limit, swimmerKey) {
    const seen = new Set();
    return rows.filter((row) => {
      const key = swimmerKey(row);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, limit);
  }

  async function publishPublicTopFiles(topKey, incomingRows = []) {
    const [course, sex, category] = topKey.split("|");
    if (!course || !sex || !category) return [];
    const fileName = publicPerformanceTopFileName(sex, category);
    const fullPath = `tops/${course}/${fileName}`;
    const previewPath = `tops-preview/${course}/${fileName}`;
    const existingRows = await readPublicPerformanceJson(fullPath, []);
    const mergedRows = mergePublicTopRows(existingRows, incomingRows);
    const previewRows = distinctPublicTopPreview(mergedRows, PUBLIC_PERFORMANCE_TOP_PREVIEW_LIMIT, publicSwimmerKey);
    return [
      await savePublicPerformanceJson(fullPath, mergedRows, "public, max-age=31536000, immutable"),
      await savePublicPerformanceJson(previewPath, previewRows, "public, max-age=31536000, immutable")
    ];
  }

  function mergePublicPerformanceManifest(manifest = {}, rows = [], generatedAt = new Date().toISOString()) {
    const seasons = new Set([...(Array.isArray(manifest.seasons) ? manifest.seasons : [])]);
    const regions = new Map((Array.isArray(manifest.regions) ? manifest.regions : []).map((region) => [String(region.id), region.label]));
    const courses = new Set([...(Array.isArray(manifest.courses) ? manifest.courses : [])]);
    const categories = new Set([...(Array.isArray(manifest.categories) ? manifest.categories : [])]);

    rows.forEach((row) => {
      const publicRow = publicPerformanceBaseRow(row);
      if (publicRow.seasonYear) seasons.add(publicRow.seasonYear);
      if (publicRow.regionId) regions.set(String(publicRow.regionId), publicRow.regionLabel || publicRow.regionId);
      if (publicRow.course) courses.add(publicRow.course);
      if (publicRow.sex && publicRow.category) categories.add(`${publicRow.sex}|${publicRow.category}`);
    });

    return {
      ...manifest,
      generatedAt,
      seasons: Array.from(seasons).sort((a, b) => b - a),
      regions: Array.from(regions.entries()).map(([id, label]) => ({ id, label })).sort((a, b) => String(a.label).localeCompare(String(b.label), "fr-FR")),
      courses: Array.from(courses).sort(),
      categories: Array.from(categories).sort(),
      lastIncremental: {
        generatedAt,
        rows: rows.length
      }
    };
  }

  async function publishIncrementalPublicPerformanceFiles(performances = [], context = {}) {
    const rows = performances
      .map(publicPerformanceBaseRow)
      .filter((row) => row.active !== false && row.status !== "hidden" && row.course && row.sex && row.category && row.timeValue);
    if (!rows.length) return { ok: true, writtenFiles: 0, rowCount: 0 };

    const bySwimmer = new Map();
    const byTop = new Map();
    rows.forEach((row) => {
      const swimmerKey = publicSwimmerKey(row);
      if (swimmerKey) {
        if (!bySwimmer.has(swimmerKey)) bySwimmer.set(swimmerKey, []);
        bySwimmer.get(swimmerKey).push(row);
      }
      const topKey = [row.course, row.sex, row.category].map(cleanText).join("|");
      if (row.course && row.sex && row.category) {
        if (!byTop.has(topKey)) byTop.set(topKey, []);
        byTop.get(topKey).push(row);
      }
    });

    const writtenFiles = new Set();
    for (const [swimmerKey, swimmerRows] of bySwimmer.entries()) {
      const { perfFile, payload } = await publishPublicSwimmerFile(swimmerKey, swimmerRows);
      writtenFiles.add(publicPerformanceFilePath(perfFile));
      const searchFiles = await publishPublicSearchIndexes(payload, perfFile);
      searchFiles.forEach((filePath) => writtenFiles.add(filePath));
    }
    for (const [topKey, topRows] of byTop.entries()) {
      const topFiles = await publishPublicTopFiles(topKey, topRows);
      topFiles.forEach((filePath) => writtenFiles.add(filePath));
    }

    const generatedAt = context.now || new Date().toISOString();
    const currentManifest = await readPublicPerformanceJson("manifest.json", {});
    const manifest = mergePublicPerformanceManifest(currentManifest, rows, generatedAt);
    writtenFiles.add(await savePublicPerformanceJson("manifest.json", manifest, "public, max-age=300"));
    writtenFiles.add(await savePublicPerformanceText("version.js", `window.LIVEPALMES_PERFORMANCE_PUBLIC_VERSION = ${JSON.stringify(generatedAt)};\n`, "public, max-age=300"));

    return {
      ok: true,
      rowCount: rows.length,
      affectedSwimmers: bySwimmer.size,
      affectedTopBuckets: byTop.size,
      writtenFiles: writtenFiles.size,
      importId: cleanText(context.importId)
    };
  }

  async function deletePublicPerformanceFile(relativePath = "") {
    const file = publicPerformanceFile(relativePath);
    try {
      await file.delete();
    } catch (error) {
      if (!(error?.code === 404 || /No such object|not found/i.test(error?.message || ""))) throw error;
    }
    return publicPerformanceFilePath(relativePath);
  }

  async function removePublicSearchIndexes(swimmerPayload = {}, perfFile = "") {
    if (!swimmerPayload || typeof swimmerPayload !== "object") return [];
    const searchRow = buildPublicSearchRow(swimmerPayload, perfFile);
    const searchShards = new Set((searchRow.searchPrefixes || []).map(publicPerformanceSearchShard).filter(Boolean));
    const idValues = [searchRow.id, ...(searchRow.sourceIds || []), ...(searchRow.aliases || [])].map(cleanText).filter(Boolean);
    const idShards = new Set(idValues.map(publicPerformanceIdShard).filter(Boolean));
    const written = [];

    for (const shard of searchShards) {
      const relativePath = `search/${shard}.json`;
      const rows = await readPublicPerformanceJson(relativePath, []);
      const filtered = (Array.isArray(rows) ? rows : []).filter((row) =>
        cleanText(row.id) !== cleanText(searchRow.id) &&
        cleanText(row.identityKey) !== cleanText(searchRow.identityKey) &&
        cleanText(row.perfFile) !== cleanText(perfFile)
      );
      written.push(await savePublicPerformanceJson(relativePath, filtered, "public, max-age=31536000, immutable"));
    }

    for (const shard of idShards) {
      const relativePath = `ids/${shard}.json`;
      const items = await readPublicPerformanceJson(relativePath, {});
      idValues.forEach((id) => {
        delete items[id];
      });
      written.push(await savePublicPerformanceJson(relativePath, items, "public, max-age=31536000, immutable"));
    }

    return written;
  }

  async function assertPublicSwimmerIdentityReplaced(oldPayload = {}, oldPerfFile = "", newPayload = {}, newPerfFile = "") {
    const oldFile = await readPublicPerformanceJson(oldPerfFile, null);
    if (oldFile) throw new Error("L'ancienne fiche publique existe encore apres la correction.");

    const oldSearchRow = buildPublicSearchRow(oldPayload, oldPerfFile);
    const oldSearchShards = new Set((oldSearchRow.searchPrefixes || []).map(publicPerformanceSearchShard).filter(Boolean));
    for (const shard of oldSearchShards) {
      const rows = await readPublicPerformanceJson(`search/${shard}.json`, []);
      const stale = (Array.isArray(rows) ? rows : []).some((row) =>
        cleanText(row.identityKey) === cleanText(oldSearchRow.identityKey) ||
        cleanText(row.perfFile) === cleanText(oldPerfFile)
      );
      if (stale) throw new Error("L'ancienne fiche reste presente dans la recherche publique.");
    }

    const newSearchRow = buildPublicSearchRow(newPayload, newPerfFile);
    const idValues = [newSearchRow.id, ...(newSearchRow.sourceIds || []), ...(newSearchRow.aliases || [])]
      .map(cleanText)
      .filter(Boolean);
    const idsByShard = new Map();
    idValues.forEach((id) => {
      const shard = publicPerformanceIdShard(id);
      if (!shard) return;
      if (!idsByShard.has(shard)) idsByShard.set(shard, []);
      idsByShard.get(shard).push(id);
    });
    for (const [shard, ids] of idsByShard.entries()) {
      const items = await readPublicPerformanceJson(`ids/${shard}.json`, {});
      const invalid = ids.some((id) =>
        cleanText(items?.[id]?.identityKey) !== cleanText(newSearchRow.identityKey) ||
        cleanText(items?.[id]?.perfFile) !== cleanText(newPerfFile)
      );
      if (invalid) throw new Error("Un identifiant public ne pointe pas vers la fiche corrigee.");
    }
  }

  async function replacePublicSwimmerIdentity(oldKey = "", newKey = "", updatedRows = []) {
    const oldPerfFile = publicPerformanceSwimmerFilePath(oldKey);
    const newPerfFile = publicPerformanceSwimmerFilePath(newKey);
    const oldPayload = await readPublicPerformanceJson(oldPerfFile, null);
    let publicSnapshot = null;
    let lastError = null;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const removedFiles = [];
        if (oldPayload) {
          const removedIndexes = await removePublicSearchIndexes(oldPayload, oldPerfFile);
          removedFiles.push(...removedIndexes);
        }
        removedFiles.push(await deletePublicPerformanceFile(oldPerfFile));
        publicSnapshot = await rebuildPublicPerformanceFilesForAffectedRows(updatedRows, {
          now: new Date().toISOString(),
          reason: "engagement.swimmerIdentityCorrected"
        });
        const newPayload = await readPublicPerformanceJson(newPerfFile, null);
        if (!newPayload) throw new Error("La nouvelle fiche publique n'a pas ete generee.");
        await assertPublicSwimmerIdentityReplaced(oldPayload || {}, oldPerfFile, newPayload, newPerfFile);
        publicSnapshot.removedFiles = removedFiles.length;
        publicSnapshot.identityReplacementAttempts = attempt;
        return publicSnapshot;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("Remplacement de la fiche publique impossible.");
  }

  function publicPerformanceTopKey(row = {}) {
    const publicRow = publicPerformanceBaseRow(row);
    return publicRow.course && publicRow.sex && publicRow.category
      ? `${publicRow.course}|${publicRow.sex}|${publicRow.category}`
      : "";
  }

  function publicPerformanceMatchesTopKey(row = {}, topKey = "") {
    return publicPerformanceTopKey(row) === topKey;
  }

  function publicPerformanceActiveRow(row = {}) {
    const status = cleanText(row.status || "active");
    return row.active !== false && status !== "hidden" && status !== "deleted";
  }

  async function getActivePublicRowsForAffectedSwimmer(seedRows = []) {
    const publicSeedRows = seedRows.map(publicPerformanceBaseRow);
    const swimmerKey = publicSwimmerKey(publicSeedRows[0] || {});
    if (!swimmerKey) return publicSeedRows.filter(publicPerformanceActiveRow);
    const current = await readPublicPerformanceJson(publicPerformanceSwimmerFilePath(swimmerKey), null);
    if (current && !publicSwimmerPayloadSupportsTopRebuild(current)) {
      throw new Error(`Fiche publique au format historique pour ${swimmerKey}. Une reconstruction globale contrôlée est requise avant la publication ciblée.`);
    }
    const identitySeed = publicSeedRows.find((row) => row.swimmer || row.firstName || row.lastName || row.birthDate || row.sex) || {};
    const hydrationPayload = {
      ...(current || {}),
      id: cleanText(current?.id || identitySeed.swimmerId || identitySeed.originalSwimmerId),
      identityKey: cleanText(current?.identityKey || identitySeed.swimmerIdentityKey || swimmerKey),
      name: cleanText(current?.name || identitySeed.swimmer),
      firstName: cleanText(current?.firstName || identitySeed.firstName),
      lastName: cleanText(current?.lastName || identitySeed.lastName),
      birthDate: cleanText(current?.birthDate || identitySeed.birthDate),
      sex: cleanText(current?.sex || identitySeed.sex),
      clubId: cleanText(current?.clubId || identitySeed.clubId),
      club: cleanText(current?.club || identitySeed.club),
      clubName: cleanText(current?.clubName || identitySeed.clubName)
    };
    const affectedKeys = new Set(publicSeedRows.map(publicPerformanceRowKey).filter(Boolean));
    const keptRows = hydratePublicSwimmerRowsFromPayload(current?.rows, hydrationPayload, swimmerKey)
      .map(publicPerformanceBaseRow)
      .filter((row) => !affectedKeys.has(publicPerformanceRowKey(row)));
    return uniquePublicPerformanceRows([
      ...keptRows,
      ...publicSeedRows.filter(publicPerformanceActiveRow)
    ]);
  }

  async function rebuildPublicSwimmerFilesForAffectedRows(affectedRows = []) {
    const bySwimmer = new Map();
    affectedRows.map(publicPerformanceBaseRow).forEach((row) => {
      const swimmerKey = publicSwimmerKey(row);
      if (!swimmerKey) return;
      if (!bySwimmer.has(swimmerKey)) bySwimmer.set(swimmerKey, []);
      bySwimmer.get(swimmerKey).push(row);
    });

    const writtenFiles = new Set();
    const activeRowsBySwimmer = new Map();
    for (const [swimmerKey, rows] of bySwimmer.entries()) {
      const activeRows = await getActivePublicRowsForAffectedSwimmer(rows);
      activeRowsBySwimmer.set(swimmerKey, activeRows);
      const perfFile = publicPerformanceSwimmerFilePath(swimmerKey);
      const existing = await readPublicPerformanceJson(perfFile, null);
      if (existing) {
        const removed = await removePublicSearchIndexes(existing, perfFile);
        removed.forEach((filePath) => writtenFiles.add(filePath));
      }
      if (!activeRows.length) {
        writtenFiles.add(await deletePublicPerformanceFile(perfFile));
        continue;
      }
      const payload = buildPublicSwimmerPayload(swimmerKey, activeRows);
      await savePublicPerformanceJson(perfFile, payload, "public, max-age=31536000, immutable");
      writtenFiles.add(publicPerformanceFilePath(perfFile));
      const searchFiles = await publishPublicSearchIndexes(payload, perfFile);
      searchFiles.forEach((filePath) => writtenFiles.add(filePath));
    }

    return {
      activeRowsBySwimmer,
      affectedSwimmers: bySwimmer.size,
      writtenFiles
    };
  }

  async function rebuildPublicTopFilesForAffectedRows(affectedRows = [], activeRowsBySwimmer = new Map()) {
    const publicAffectedRows = affectedRows.map(publicPerformanceBaseRow);
    const topKeys = new Set(publicAffectedRows.map(publicPerformanceTopKey).filter(Boolean));
    const activeRows = Array.from(activeRowsBySwimmer.values()).flat();
    activeRows.map(publicPerformanceBaseRow).forEach((row) => {
      const topKey = publicPerformanceTopKey(row);
      if (topKey) topKeys.add(topKey);
    });

    const writtenFiles = new Set();
    for (const topKey of topKeys) {
      const [course, sex, category] = topKey.split("|");
      if (!course || !sex || !category) continue;
      const affectedCandidateKeys = new Set(publicAffectedRows
        .filter((row) => publicPerformanceMatchesTopKey(row, topKey))
        .map(publicPerformanceTopCandidateKey)
        .filter(Boolean));
      activeRows
        .filter((row) => publicPerformanceMatchesTopKey(row, topKey))
        .map(publicPerformanceTopCandidateKey)
        .filter(Boolean)
        .forEach((key) => affectedCandidateKeys.add(key));

      const fileName = publicPerformanceTopFileName(sex, category);
      const fullPath = `tops/${course}/${fileName}`;
      const previewPath = `tops-preview/${course}/${fileName}`;
      const existingRows = await readPublicPerformanceJson(fullPath, []);
      const keptRows = (Array.isArray(existingRows) ? existingRows : [])
        .filter((row) => !affectedCandidateKeys.has(publicPerformanceTopCandidateKey(row)));
      const replacementRows = activeRows.filter((row) => publicPerformanceMatchesTopKey(row, topKey));
      const mergedRows = mergePublicTopRows(keptRows, replacementRows);
      await savePublicPerformanceJson(fullPath, mergedRows, "public, max-age=31536000, immutable");
      await savePublicPerformanceJson(previewPath, distinctPublicTopPreview(mergedRows, PUBLIC_PERFORMANCE_TOP_PREVIEW_LIMIT, publicSwimmerKey), "public, max-age=31536000, immutable");
      writtenFiles.add(publicPerformanceFilePath(fullPath));
      writtenFiles.add(publicPerformanceFilePath(previewPath));
    }

    return {
      affectedTopBuckets: topKeys.size,
      writtenFiles
    };
  }

  async function rebuildPublicPerformanceFilesForAffectedRows(affectedRows = [], context = {}) {
    const rows = affectedRows.map(publicPerformanceBaseRow).filter((row) => publicSwimmerKey(row) || publicPerformanceTopKey(row));
    if (!rows.length) return { ok: true, affectedRows: 0, writtenFiles: 0 };

    const swimmerResult = await rebuildPublicSwimmerFilesForAffectedRows(rows);
    const topResult = await rebuildPublicTopFilesForAffectedRows(rows, swimmerResult.activeRowsBySwimmer);
    const generatedAt = context.now || new Date().toISOString();
    const currentManifest = await readPublicPerformanceJson("manifest.json", {});
    const manifest = {
      ...mergePublicPerformanceManifest(currentManifest, Array.from(swimmerResult.activeRowsBySwimmer.values()).flat(), generatedAt),
      lastTargetedRebuild: {
        generatedAt,
        reason: cleanText(context.reason),
        affectedRows: rows.length,
        affectedSwimmers: swimmerResult.affectedSwimmers,
        affectedTopBuckets: topResult.affectedTopBuckets
      }
    };

    const writtenFiles = new Set([...swimmerResult.writtenFiles, ...topResult.writtenFiles]);
    writtenFiles.add(await savePublicPerformanceJson("manifest.json", manifest, "public, max-age=300"));
    writtenFiles.add(await savePublicPerformanceText("version.js", `window.LIVEPALMES_PERFORMANCE_PUBLIC_VERSION = ${JSON.stringify(generatedAt)};\n`, "public, max-age=300"));

    return {
      ok: true,
      affectedRows: rows.length,
      affectedSwimmers: swimmerResult.affectedSwimmers,
      affectedTopBuckets: topResult.affectedTopBuckets,
      writtenFiles: writtenFiles.size,
      reason: cleanText(context.reason)
    };
  }

  return {
    publicPerformanceFilePath,
    publicPerformanceFile,
    readPublicPerformanceJson,
    savePublicPerformanceJson,
    savePublicPerformanceText,
    publicPerformanceCompactObject,
    publicPerformanceSearchShard,
    publicPerformanceIdShard,
    publicPerformanceTopFileName,
    publicPerformanceSwimmerFilePath,
    publicPerformanceRowKey,
    publicPerformanceTopCandidateKey,
    publicPerformanceSwimmerRow,
    publicPerformanceTopRow,
    sortPublicPerformanceRows,
    sortPublicTopRows,
    mergePublicSwimmerRows,
    mergePublicTopRows,
    buildPublicSwimmerPayload,
    buildPublicSearchRow,
    publishPublicSwimmerFile,
    publishPublicSearchIndexes,
    distinctPublicTopPreview,
    publishPublicTopFiles,
    mergePublicPerformanceManifest,
    publishIncrementalPublicPerformanceFiles,
    deletePublicPerformanceFile,
    removePublicSearchIndexes,
    assertPublicSwimmerIdentityReplaced,
    replacePublicSwimmerIdentity,
    publicPerformanceTopKey,
    publicPerformanceMatchesTopKey,
    publicPerformanceActiveRow,
    getActivePublicRowsForAffectedSwimmer,
    rebuildPublicSwimmerFilesForAffectedRows,
    rebuildPublicTopFilesForAffectedRows,
    rebuildPublicPerformanceFilesForAffectedRows
  };
}

module.exports = { createLegacyPerformancePublication };
