// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_engagementEntryTimeCacheRef(backendContext) {
  function engagementQualificationRowAllowed(row = {}, competition = {}) {
    if (row.active === false || row.status === "hidden") return false;
    if (!Number(row.timeValue || 0)) return false;
    if (competition.qualificationTimesMode === "period") {
      const date = backendContext.cleanIsoDate(row.date);
      if (!date) return false;
      if (competition.qualificationStartDate && date < competition.qualificationStartDate) return false;
      if (competition.qualificationEndDate && date > competition.qualificationEndDate) return false;
    }
    return true;
  }

  function engagementEntryTimeCacheRef(db, swimmer = {}) {
    return db.collection(backendContext.ENGAGEMENT_ENTRY_TIME_CACHES_COLLECTION).doc((0, backendContext.local$engagementEntryTimeCacheId)(swimmer));
  }

  function engagementEntryTimeCacheRow(row = {}) {
    return backendContext.cleanFirestoreValue({
      competitionId: backendContext.cleanText(row.competitionId || String(row.id || "").match(/^import:([^:]+):/)?.[1]).slice(0, 160),
      qualificationCompetitionId: backendContext.cleanText(row.qualificationCompetitionId).slice(0, 160),
      category: backendContext.cleanText(row.category),
      active: row.active !== false,
      status: backendContext.cleanText(row.status || "active"),
      publicKey: backendContext.cleanText(row.publicKey || row.performanceBaseId || row.id).slice(0, 160),
      performanceBaseId: backendContext.cleanText(row.performanceBaseId).slice(0, 160),
      date: backendContext.cleanIsoDate(row.date),
      course: backendContext.normalizeCourseCode(row.course),
      time: backendContext.cleanText(row.time).slice(0, 20),
      timeValue: Number(row.timeValue || 0) || 0,
      location: backendContext.cleanText(row.location).slice(0, 160),
      competition: backendContext.cleanText(row.competition).slice(0, 180),
      pool: backendContext.cleanText(row.pool).slice(0, 20),
      chrono: backendContext.cleanText(row.chrono).slice(0, 40)
    });
  }

  function engagementEntryTimeCacheRowsFromData(data = {}) {
    const events = data.events && typeof data.events === "object" ? data.events : {};
    return Object.values(events)
      .flatMap((rows) => Array.isArray(rows) ? rows : [])
      .map(engagementEntryTimeCacheRow)
      .filter((row) => row.course && row.date && row.timeValue);
  }

  function engagementEntryTimeRowsToEvents(rows = []) {
    const events = {};
    let bytes = 0;
    rows
      .map(engagementEntryTimeCacheRow)
      .filter((row) => row.course && row.date && row.timeValue)
      .sort((left, right) =>
        backendContext.cleanText(right.date).localeCompare(backendContext.cleanText(left.date)) ||
        backendContext.cleanText(left.course).localeCompare(backendContext.cleanText(right.course), "fr-FR", { numeric: true }) ||
        Number(left.timeValue || 0) - Number(right.timeValue || 0)
      )
      .slice(0, 1500)
      .forEach((row) => {
        const size = Buffer.byteLength(JSON.stringify(row), "utf8");
        if (bytes + size > 700000) return;
        bytes += size;
        if (!events[row.course]) events[row.course] = [];
        events[row.course].push(row);
      });
    return events;
  }

  function engagementEntryTimeSourceKeys(swimmer = {}) {
    return Array.from(new Set([
      swimmer.identityKey,
      swimmer.swimmerIdentityKey,
      swimmer.swimmerId,
      ...(Array.isArray(swimmer.sourceIds) ? swimmer.sourceIds : [])
    ].map(backendContext.cleanText).filter(Boolean))).slice(0, backendContext.ENGAGEMENT_ENTRY_TIME_SOURCE_KEY_LIMIT);
  }

  async function readEngagementEntryTimeSourceRows(swimmer = {}) {
    const sourceKeys = engagementEntryTimeSourceKeys(swimmer);
    for (const sourceKey of sourceKeys) {
      const payload = await backendContext.readPublicPerformanceJson(backendContext.publicPerformanceSwimmerFilePath(sourceKey), null);
      if (!payload || !Array.isArray(payload.rows)) continue;
      return {
        sourceKey,
        rows: backendContext.hydratePublicSwimmerRowsFromPayload(payload.rows, payload, sourceKey).map(backendContext.publicPerformanceBaseRow)
      };
    }
    const identity = backendContext.cleanText(swimmer.identityKey || swimmer.swimmerIdentityKey);
    const indexId = identity ? backendContext.stableHash(identity).slice(0, 40) : backendContext.cleanText(swimmer.swimmerIndexId || swimmer.id);
    return require("../../engagement-performance-history").readIndexedHistory({ db: /* backend-shorthand */ backendContext.db, indexId, HttpsError: /* backend-shorthand */ backendContext.HttpsError });
  }

  async function rebuildEngagementEntryTimeCache(db, swimmer = {}) {
    const source = backendContext.cleanText(swimmer.source || "performances");
    const indexedSource = source === "engagement" ? { sourceKey: "", rows: [] } : await readEngagementEntryTimeSourceRows(swimmer);
    if (!indexedSource) {
      console.warn("livepalmes.engagement.times.source_missing", {
        cacheId: (0, backendContext.local$engagementEntryTimeCacheId)(swimmer),
        sourceKeyCount: engagementEntryTimeSourceKeys(swimmer).length
      });
      throw new backendContext.HttpsError(
        "failed-precondition",
        "Historique des performances momentanement indisponible pour ce nageur. Aucun parcours massif n'a ete lance."
      );
    }
    const rows = indexedSource.rows;
    const activeRows = rows
      .map(backendContext.publicPerformanceBaseRow)
      .filter((row) => engagementQualificationRowAllowed(row, { qualificationTimesMode: "all" }));
    const events = engagementEntryTimeRowsToEvents(activeRows);
    const now = new Date().toISOString();
    await engagementEntryTimeCacheRef(db, swimmer).set({
      version: backendContext.ENGAGEMENT_ENTRY_TIME_CACHE_VERSION,
      source,
      swimmerIndexId: backendContext.cleanText(swimmer.swimmerIndexId || swimmer.id).slice(0, 80),
      swimmerId: backendContext.cleanText(swimmer.swimmerId).slice(0, 80),
      identityKey: backendContext.cleanText(swimmer.identityKey).slice(0, 180),
      sourceDataset: source === "engagement" ? "engagement" : indexedSource.sourceDataset || "public-performance-file",
      sourceKey: backendContext.cleanText(indexedSource.sourceKey).slice(0, 180),
      generatedAt: now,
      updatedAt: now,
      truncated: activeRows.length > Object.values(events).reduce((sum, eventRows) => sum + eventRows.length, 0),
      rowCount: Object.values(events).reduce((sum, eventRows) => sum + eventRows.length, 0),
      events
    }, { merge: false });
    return { cachedRows: engagementEntryTimeCacheRowsFromData({ events }), completeRows: activeRows };
  }

  async function getEngagementEntryTimeRowsForSwimmer(swimmer = {}, { requireComplete = false } = {}) {
    if (backendContext.cleanText(swimmer.source) === "engagement") return [];
    const cacheId = (0, backendContext.local$engagementEntryTimeCacheId)(swimmer);
    const cacheSnapshot = await engagementEntryTimeCacheRef(backendContext.db, swimmer).get();
    const cacheReady = cacheSnapshot.exists &&
      Number(cacheSnapshot.data()?.version || 0) === backendContext.ENGAGEMENT_ENTRY_TIME_CACHE_VERSION &&
      backendContext.cleanText(cacheSnapshot.data()?.generatedAt);
    if (cacheReady) {
      console.info("livepalmes.engagement.times.cache", { cacheId, cacheHit: true });
      if (requireComplete && cacheSnapshot.data().truncated) {
        const source = await readEngagementEntryTimeSourceRows(swimmer);
        if (!source) throw new backendContext.HttpsError("unavailable", "Historique momentanément indisponible. Réessayez avant de vous engager.");
        return source.rows;
      }
      return engagementEntryTimeCacheRowsFromData(cacheSnapshot.data() || {});
    }
    if (backendContext.engagementEntryTimeCacheBuilds.has(cacheId)) {
      console.info("livepalmes.engagement.times.cache", { cacheId, cacheHit: false, sharedBuild: true });
      const shared = await backendContext.engagementEntryTimeCacheBuilds.get(cacheId);
      return requireComplete ? shared.completeRows : shared.cachedRows;
    }
    console.info("livepalmes.engagement.times.cache", { cacheId, cacheHit: false, sharedBuild: false });
    const build = rebuildEngagementEntryTimeCache(backendContext.db, swimmer)
      .finally(() => backendContext.engagementEntryTimeCacheBuilds.delete(cacheId));
    backendContext.engagementEntryTimeCacheBuilds.set(cacheId, build);
    const result = await build;
    return requireComplete ? result.completeRows : result.cachedRows;
  }

  return { engagementQualificationRowAllowed, engagementEntryTimeCacheRef, engagementEntryTimeCacheRow, engagementEntryTimeCacheRowsFromData, engagementEntryTimeRowsToEvents, engagementEntryTimeSourceKeys, readEngagementEntryTimeSourceRows, rebuildEngagementEntryTimeCache, getEngagementEntryTimeRowsForSwimmer };
}

module.exports = { createEntryModelService_engagementEntryTimeCacheRef };
