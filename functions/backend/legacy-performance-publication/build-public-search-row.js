// Existing operation bodies; live services arrive through explicit accessors.
function createLegacyPerformancePublication_buildPublicSearchRow(backendContext) {
  async function savePublicPerformanceJson(relativePath, payload, cacheControl = "public, max-age=300") {
    const file = (0, backendContext.local$publicPerformanceFile)(relativePath);
    await file.save(JSON.stringify(payload), {
      resumable: false,
      contentType: "application/json; charset=utf-8",
      metadata: { cacheControl }
    });
    return (0, backendContext.local$publicPerformanceFilePath)(relativePath);
  }

  async function savePublicPerformanceText(relativePath, content, cacheControl = "public, max-age=300") {
    const file = (0, backendContext.local$publicPerformanceFile)(relativePath);
    await file.save(content, {
      resumable: false,
      contentType: "application/javascript; charset=utf-8",
      metadata: { cacheControl }
    });
    return (0, backendContext.local$publicPerformanceFilePath)(relativePath);
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
    const token = (0, backendContext.normalizePerformanceSearchText)(value).split(/\s+/).find((item) => item.length >= 2) || "";
    return token.slice(0, 2).toLowerCase();
  }

  function publicPerformanceIdShard(value) {
    const id = (0, backendContext.cleanText)(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
    if (!id) return "";
    return id.length === 1 ? `0${id}` : id.slice(0, 2);
  }

  function publicPerformanceRowKey(row = {}) {
    return (0, backendContext.cleanText)(row.publicKey || (0, backendContext.performancePublicKey)(row) || row.performanceBaseId || row.id);
  }

  function publicPerformanceTopCandidateKey(row = {}) {
    return [
      (0, backendContext.publicSwimmerKey)(row),
      Number(row.seasonYear || 0) || 0,
      (0, backendContext.cleanText)(row.regionId),
      (0, backendContext.cleanText)(row.pool)
    ].join("|");
  }

  function publicPerformanceSwimmerRow(row = {}) {
    return (0, backendContext.publicPerformanceSwimmerStorageRow)(row);
  }

  function publicPerformanceTopRow(row = {}) {
    const intermediateTimes = Array.isArray(row.intermediateTimes) ? row.intermediateTimes : [];
    return publicPerformanceCompactObject({
      id: (0, backendContext.cleanText)(row.id),
      source: (0, backendContext.cleanText)(row.source || "livepalmes"),
      importId: (0, backendContext.cleanText)(row.importId),
      publicKey: (0, backendContext.cleanText)(row.publicKey),
      performanceBaseId: (0, backendContext.cleanText)(row.performanceBaseId),
      swimmerId: (0, backendContext.cleanText)(row.swimmerId),
      swimmerIdentityKey: (0, backendContext.cleanText)(row.swimmerIdentityKey),
      swimmer: (0, backendContext.cleanText)(row.swimmer),
      firstName: (0, backendContext.cleanText)(row.firstName),
      lastName: (0, backendContext.cleanText)(row.lastName),
      birthDate: (0, backendContext.cleanText)(row.birthDate),
      sex: (0, backendContext.cleanText)(row.sex),
      club: (0, backendContext.cleanText)(row.club),
      clubName: (0, backendContext.cleanText)(row.clubName),
      regionId: (0, backendContext.cleanText)(row.regionId),
      competition: (0, backendContext.cleanText)(row.competition),
      location: (0, backendContext.cleanText)(row.location),
      date: (0, backendContext.cleanText)(row.date),
      seasonYear: Number(row.seasonYear || 0) || 0,
      pool: (0, backendContext.cleanText)(row.pool),
      chrono: (0, backendContext.cleanText)(row.chrono),
      course: (0, backendContext.cleanText)(row.course),
      courseShortLabel: (0, backendContext.cleanText)(row.courseShortLabel),
      isIntermediate: row.isIntermediate === true,
      originCourse: (0, backendContext.cleanText)(row.originCourse),
      category: (0, backendContext.cleanText)(row.category),
      categoryCode: (0, backendContext.cleanText)(row.categoryCode),
      timeValue: Number(row.timeValue || 0) || 0,
      time: (0, backendContext.cleanText)(row.time),
      intermediateTimes
    });
  }

  function sortPublicPerformanceRows(rows = []) {
    return rows.sort((a, b) =>
      (0, backendContext.cleanText)(b.date).localeCompare((0, backendContext.cleanText)(a.date)) ||
      (0, backendContext.cleanText)(a.course).localeCompare((0, backendContext.cleanText)(b.course), "fr-FR", { numeric: true }) ||
      Number(a.timeValue || 0) - Number(b.timeValue || 0)
    );
  }

  function sortPublicTopRows(rows = []) {
    return rows.sort((a, b) =>
      Number(a.timeValue || 0) - Number(b.timeValue || 0) ||
      (0, backendContext.cleanText)(a.date).localeCompare((0, backendContext.cleanText)(b.date))
    );
  }

  function mergePublicTopRows(existingRows = [], incomingRows = []) {
    const byCandidate = new Map();
    [...existingRows, ...incomingRows].forEach((inputRow) => {
      const row = publicPerformanceTopRow(inputRow);
      if (!row.course || !row.sex || !row.category || !row.timeValue) return;
      const candidateKey = publicPerformanceTopCandidateKey(row);
      if (!candidateKey) return;
      if ((0, backendContext.publicBetterPerformance)(row, byCandidate.get(candidateKey))) byCandidate.set(candidateKey, row);
    });
    return sortPublicTopRows(Array.from(byCandidate.values()));
  }

  function buildPublicSwimmerPayload(indexKey, rows = []) {
    const sortedRows = sortPublicPerformanceRows(rows.map(backendContext.publicPerformanceBaseRow));
    const first = sortedRows[0] || {};
    const latestWithClub = sortedRows.find((row) => row.club || row.clubName) || first;
    const sourceIds = Array.from(new Set(sortedRows.flatMap((row) => [row.swimmerId, row.originalSwimmerId]).map(backendContext.cleanText).filter(Boolean)));
    const aliases = Array.from(new Set(sourceIds.filter((id) => id && id !== first.swimmerId)));
    const name = (0, backendContext.cleanText)(first.swimmer) || [first.firstName, first.lastName].filter(Boolean).join(" ");
    return publicPerformanceCompactObject({
      id: (0, backendContext.cleanText)(first.swimmerId || sourceIds[0] || (0, backendContext.stableHash)(indexKey).slice(0, 16)),
      identityKey: (0, backendContext.cleanText)(first.swimmerIdentityKey || indexKey),
      aliases,
      sourceIds,
      name,
      lastName: (0, backendContext.cleanText)(first.lastName),
      firstName: (0, backendContext.cleanText)(first.firstName),
      birthDate: (0, backendContext.cleanText)(first.birthDate),
      sex: (0, backendContext.cleanText)(first.sex),
      clubId: (0, backendContext.cleanText)(latestWithClub.clubId),
      club: (0, backendContext.cleanText)(latestWithClub.club),
      clubName: (0, backendContext.cleanText)(latestWithClub.clubName),
      rowSchemaVersion: backendContext.PUBLIC_PERFORMANCE_SWIMMER_ROW_SCHEMA_VERSION,
      performanceCount: sortedRows.filter((row) => !row.isIntermediate).length,
      rowCount: sortedRows.length,
      rows: sortedRows.map(publicPerformanceSwimmerRow)
    });
  }

  function buildPublicSearchRow(swimmerPayload = {}, perfFile = "") {
    const sourceIds = Array.isArray(swimmerPayload.sourceIds) ? swimmerPayload.sourceIds : [];
    const aliases = Array.isArray(swimmerPayload.aliases) ? swimmerPayload.aliases : [];
    const searchText = (0, backendContext.normalizePerformanceSearchText)([
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
    const searchIndexText = (0, backendContext.normalizePerformanceSearchText)([
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
      searchPrefixes: (0, backendContext.performanceSearchPrefixes)(searchIndexText),
      perfFile
    };
  }

  async function publishPublicSearchIndexes(swimmerPayload, perfFile) {
    const searchRow = buildPublicSearchRow(swimmerPayload, perfFile);
    const searchShards = new Set((searchRow.searchPrefixes || []).map(publicPerformanceSearchShard).filter(Boolean));
    const idValues = [searchRow.id, ...(searchRow.sourceIds || []), ...(searchRow.aliases || [])].map(backendContext.cleanText).filter(Boolean);
    const idShards = new Set(idValues.map(publicPerformanceIdShard).filter(Boolean));
    const written = [];

    for (const shard of searchShards) {
      const relativePath = `search/${shard}.json`;
      const rows = await (0, backendContext.local$readPublicPerformanceJson)(relativePath, []);
      const byId = new Map((Array.isArray(rows) ? rows : []).map((row) => [(0, backendContext.cleanText)(row.id), row]));
      byId.set((0, backendContext.cleanText)(searchRow.id), publicPerformanceCompactObject({ ...searchRow, searchPrefixes: undefined }));
      const mergedRows = Array.from(byId.values()).sort((a, b) =>
        (0, backendContext.cleanText)(a.lastName).localeCompare((0, backendContext.cleanText)(b.lastName), "fr-FR") ||
        (0, backendContext.cleanText)(a.firstName).localeCompare((0, backendContext.cleanText)(b.firstName), "fr-FR") ||
        (0, backendContext.cleanText)(a.name).localeCompare((0, backendContext.cleanText)(b.name), "fr-FR")
      );
      written.push(await savePublicPerformanceJson(relativePath, mergedRows, "public, max-age=31536000, immutable"));
    }

    for (const shard of idShards) {
      const relativePath = `ids/${shard}.json`;
      const items = await (0, backendContext.local$readPublicPerformanceJson)(relativePath, {});
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

  function mergePublicPerformanceManifest(manifest = {}, rows = [], generatedAt = new Date().toISOString()) {
    const seasons = new Set([...(Array.isArray(manifest.seasons) ? manifest.seasons : [])]);
    const regions = new Map((Array.isArray(manifest.regions) ? manifest.regions : []).map((region) => [String(region.id), region.label]));
    const courses = new Set([...(Array.isArray(manifest.courses) ? manifest.courses : [])]);
    const categories = new Set([...(Array.isArray(manifest.categories) ? manifest.categories : [])]);

    rows.forEach((row) => {
      const publicRow = (0, backendContext.publicPerformanceBaseRow)(row);
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

  return { savePublicPerformanceJson, savePublicPerformanceText, publicPerformanceCompactObject, publicPerformanceSearchShard, publicPerformanceIdShard, publicPerformanceRowKey, publicPerformanceTopCandidateKey, publicPerformanceSwimmerRow, publicPerformanceTopRow, sortPublicPerformanceRows, sortPublicTopRows, mergePublicTopRows, buildPublicSwimmerPayload, buildPublicSearchRow, publishPublicSearchIndexes, distinctPublicTopPreview, mergePublicPerformanceManifest };
}

module.exports = { createLegacyPerformancePublication_buildPublicSearchRow };
