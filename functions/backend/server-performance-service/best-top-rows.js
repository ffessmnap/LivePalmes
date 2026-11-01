// Existing operation bodies; live services arrive through explicit accessors.
function createPerformanceService_bestTopRows(backendContext) {
  function publicTopIndexRow(row = {}) {
    const sex = backendContext.normalizeCategoryCode(row.sex);
    const date = backendContext.cleanText(row.date);
    const category = backendContext.performanceCategoryFromRow(row, date);
    const result = backendContext.cleanFirestoreValue({
      id: backendContext.cleanText(row.id),
      source: backendContext.cleanText(row.source || "livepalmes"),
      importId: backendContext.cleanText(row.importId),
      publicKey: backendContext.cleanText(row.publicKey),
      performanceBaseId: backendContext.cleanText(row.performanceBaseId),
      swimmerId: backendContext.cleanText(row.swimmerId),
      originalSwimmerId: backendContext.cleanText(row.originalSwimmerId),
      swimmerIdentityKey: backendContext.cleanText(row.swimmerIdentityKey),
      swimmer: backendContext.cleanText(row.swimmer),
      firstName: backendContext.cleanText(row.firstName),
      lastName: backendContext.cleanText(row.lastName),
      birthDate: backendContext.cleanText(row.birthDate),
      sex,
      club: backendContext.cleanText(row.club),
      clubName: backendContext.cleanText(row.clubName),
      regionId: backendContext.cleanText(row.regionId),
      regionLabel: backendContext.cleanText(row.regionLabel),
      competitionId: backendContext.cleanText(row.competitionId),
      competition: backendContext.cleanText(row.competition),
      location: backendContext.cleanText(row.location),
      date,
      pool: backendContext.cleanText(row.pool),
      seasonYear: Number(row.seasonYear || 0) || 0,
      course: backendContext.cleanText(row.course),
      courseShortLabel: backendContext.cleanText(row.courseShortLabel),
      style: backendContext.cleanText(row.style),
      isIntermediate: row.isIntermediate === true,
      originCourse: backendContext.cleanText(row.originCourse),
      originCourseShortLabel: backendContext.cleanText(row.originCourseShortLabel),
      originPerformanceId: backendContext.cleanText(row.originPerformanceId),
      category,
      categoryCode: backendContext.cleanText(backendContext.categoryCodeFromCategory(category, sex) || row.categoryCode),
      categoryLabel: backendContext.cleanText(backendContext.CATEGORY_LABELS[sex]?.[category] || row.categoryLabel || category),
      timeValue: Number(row.timeValue || 0) || 0,
      time: backendContext.cleanText(row.time),
      status: backendContext.cleanText(row.status || "active"),
      active: row.active !== false && row.status !== "hidden",
      intermediateTimes: Array.isArray(row.intermediateTimes)
        ? row.intermediateTimes.map((split) => ({
          code: backendContext.cleanText(split?.code),
          distance: Number(split?.distance || 0) || 0,
          time: backendContext.cleanText(split?.time),
          timeValue: Number(split?.timeValue || 0) || 0
        })).filter((split) => split.time)
        : []
    });
    // Omit empty optional fields: two pools must still fit in one Firestore document.
    Object.keys(result).forEach((key) => {
      if (result[key] === "" || (Array.isArray(result[key]) && !result[key].length)) delete result[key];
    });
    return result;
  }

  function performanceTopBucketKey(filters = {}) {
    return [
      backendContext.cleanText(filters.course),
      backendContext.cleanText(filters.sex),
      backendContext.cleanText(filters.category),
      Number(filters.seasonYear || 0) || 0,
      backendContext.cleanText(filters.regionId)
    ].join("|");
  }

  function performanceTopBucketId(bucketKey) {
    return backendContext.stableHash(bucketKey).slice(0, 40);
  }

  function performanceTopBucketVariants(row = {}) {
    const course = backendContext.cleanText(row.course);
    const sex = backendContext.cleanText(row.sex);
    if (!course || (sex !== "F" && sex !== "M")) return [];
    const categoryValues = Array.from(new Set([backendContext.cleanText(row.category), ""].filter((value, index, values) => value || index === values.length - 1)));
    const seasonValues = Array.from(new Set([Number(row.seasonYear || 0) || 0, 0]));
    const regionValues = Array.from(new Set([backendContext.cleanText(row.regionId), ""]));
    const variants = [];
    categoryValues.forEach((category) => {
      seasonValues.forEach((seasonYear) => {
        regionValues.forEach((regionId) => {
          const key = performanceTopBucketKey({ course, sex, category, seasonYear, regionId });
          variants.push({
            key,
            id: performanceTopBucketId(key),
            course,
            sex,
            category,
            seasonYear,
            regionId
          });
        });
      });
    });
    return variants;
  }

  function bestTopRows(rows = []) {
    const latestByPublicKey = new Map();
    rows.forEach((row) => {
      const key = backendContext.cleanText(row.publicKey || row.performanceBaseId || row.id || (0, backendContext.local$performancePublicKey)(row));
      if (!key) return;
      latestByPublicKey.set(key, row);
    });
    const bestBySwimmer = new Map();
    latestByPublicKey.forEach((rawRow) => {
      if (rawRow.active === false || rawRow.status === "hidden") return;
      const row = publicTopIndexRow(rawRow);
      if (!row.timeValue) return;
      const identity = (0, backendContext.local$publicSwimmerKey)(row);
      if (!identity) return;
      const swimmerKey = [identity, backendContext.cleanText(row.pool)].join("|");
      if ((0, backendContext.local$publicBetterPerformance)(row, bestBySwimmer.get(swimmerKey))) bestBySwimmer.set(swimmerKey, row);
    });
    const poolCounts = new Map();
    return Array.from(bestBySwimmer.values())
      .sort((a, b) => Number(a.timeValue || 0) - Number(b.timeValue || 0) || backendContext.cleanText(a.date).localeCompare(backendContext.cleanText(b.date)))
      .filter((row) => {
        const pool = backendContext.cleanText(row.pool);
        const count = poolCounts.get(pool) || 0;
        poolCounts.set(pool, count + 1);
        return count < backendContext.PERFORMANCE_TOP_INDEX_LIMIT;
      });
  }

  function encodePerformanceTopIndexRows(rows) {
    const serialized = JSON.stringify(rows);
    if (Buffer.byteLength(serialized) <= 850000) return { rows };
    const rowsGzip = require("node:zlib").gzipSync(serialized).toString("base64");
    if (Buffer.byteLength(rowsGzip) > 850000) throw new Error("Bucket TOP trop volumineux après compression.");
    return { rowsEncoding: "gzip-base64-v1", rowsGzip };
  }

  function readPerformanceTopIndexRows(view = {}) {
    if (view.rowsEncoding) {
      if (view.rowsEncoding !== "gzip-base64-v1") throw new Error("Encodage TOP inconnu.");
      return JSON.parse(require("node:zlib").gunzipSync(Buffer.from(view.rowsGzip, "base64")).toString("utf8"));
    }
    return Array.isArray(view.rows) ? view.rows : [];
  }

  async function writePerformanceTopIndexRows(rows = [], context = {}) {
    const byBucket = new Map();
    rows.forEach((rawRow) => {
      if (!rawRow) return;
      const row = publicTopIndexRow(rawRow);
      if (!row.course || !row.sex || !row.timeValue) return;
      performanceTopBucketVariants(row).forEach((bucket) => {
        if (!byBucket.has(bucket.id)) byBucket.set(bucket.id, { ...bucket, rows: [] });
        byBucket.get(bucket.id).rows.push(row);
      });
    });
    if (!byBucket.size) return { ok: true, writtenRows: 0, touchedBucketIds: [] };

    const now = context.now || new Date().toISOString();
    const bucketEntries = Array.from(byBucket.values());
    const refs = bucketEntries.map((bucket) => backendContext.db.collection(backendContext.PERFORMANCE_TOP_BUCKETS_COLLECTION).doc(bucket.id));
    const snapshots = refs.length ? await backendContext.db.getAll(...refs) : [];
    let batch = backendContext.db.batch();
    let batchSize = 0;
    const commits = [];
    let writtenRows = 0;

    function commitIfNeeded(force = false) {
      if (batchSize >= 10 || (force && batchSize > 0)) {
        commits.push(batch.commit());
        batch = backendContext.db.batch();
        batchSize = 0;
      }
    }

    bucketEntries.forEach((bucket, index) => {
      const existing = snapshots[index].exists ? snapshots[index].data() || {} : {};
      const existingRows = readPerformanceTopIndexRows(existing);
      const topRows = bestTopRows([...existingRows, ...bucket.rows]);
      batch.set(refs[index], {
        bucketId: bucket.id,
        bucketKey: bucket.key,
        course: bucket.course,
        sex: bucket.sex,
        category: bucket.category,
        seasonYear: bucket.seasonYear,
        regionId: bucket.regionId,
        ...encodePerformanceTopIndexRows(topRows),
        rowCount: topRows.length,
        sourceRowCount: Number(existing.sourceRowCount || 0) + bucket.rows.length,
        updatedAt: now
      }, { merge: false });
      batchSize += 1;
      writtenRows += bucket.rows.length;
      commitIfNeeded();
    });

    commitIfNeeded(true);
    await Promise.all(commits);
    return { ok: true, writtenRows, touchedBucketIds: bucketEntries.map((bucket) => bucket.id) };
  }

  return { publicTopIndexRow, performanceTopBucketKey, performanceTopBucketId, performanceTopBucketVariants, bestTopRows, encodePerformanceTopIndexRows, readPerformanceTopIndexRows, writePerformanceTopIndexRows };
}

module.exports = { createPerformanceService_bestTopRows };
