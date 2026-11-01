// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionHandlers_listEngagementCalendarEvents(backendContext) {
  async function listEngagementCalendarEvents(request) {
    const startedAt = Date.now();
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national && (!context.region || !context.regionId)) {
      throw new backendContext.HttpsError("permission-denied", "Droit de gestion du calendrier requis.");
    }
    const rawRanges = Array.isArray(request.data?.ranges) && request.data.ranges.length
      ? request.data.ranges.slice(0, 2)
      : [{ fromDate: request.data?.fromDate, toDate: request.data?.toDate }];
    const ranges = rawRanges.map((rawRange = {}) => {
      const startDate = backendContext.cleanIsoDate(rawRange.fromDate) || new Date().toISOString().slice(0, 10);
      const season = backendContext.engagementSeasonBoundsFromEndYear(backendContext.engagementSeasonEndYearFromIsoDate(startDate));
      return {
        startDate,
        endDate: backendContext.cleanIsoDate(rawRange.toDate) || season.endDate,
        season
      };
    });
    const seasonEndYears = Array.from(new Set(ranges.map((range) => range.season.endYear)));
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      const items = await backendContext.nativePortalCalendarItems(ranges);
      return { ok: true, source: "nap", events: items.filter(item => !["pool", "openWater"].includes(item.competitionType))
        .filter(item => ranges.some(range => item.date >= range.startDate && item.date <= range.endDate))
        .filter(item => context.national || (!item.nationalManagementOnly && backendContext.engagementRegionsMatch(item.regionId, context.regionId)))
        .map(item => ({ ...item, sourceType: "calendarEvent", eventType: item.competitionType })),
        readStats: backendContext.portalReadStats("listEngagementCalendarEvents", startedAt, { baseDocuments: 1, variableDocumentsMax: 0, cacheHit: false }),
        sqlBudget: { queriesMax: seasonEndYears.length, rowsMax: seasonEndYears.length * 500 } };
    }
    const refs = seasonEndYears.map((endYear) => backendContext.engagementCalendarEventCalendarRef(backendContext.db, endYear));
    const snapshots = await backendContext.db.getAll(...refs);
    const byEndYear = new Map(snapshots.map((snapshot, index) => [seasonEndYears[index], snapshot]));
    const events = Array.from(new Map(ranges.flatMap((range) => {
      const snapshot = byEndYear.get(range.season.endYear);
      const items = snapshot?.exists ? backendContext.engagementCalendarEventItemsFromData(snapshot.data() || {}) : [];
      return items
        .filter((item) => item.date >= range.startDate && item.date <= range.endDate)
        .map((item) => [item.id, item]);
    })).values())
      .filter((item) => context.national || (
        !backendContext.isNationalOnlyEngagementCompetitionLevel(item.level) &&
        backendContext.engagementRegionsMatch(item.regionId, context.regionId)
      ))
      .sort((left, right) => backendContext.cleanText(left.date).localeCompare(backendContext.cleanText(right.date)) || backendContext.cleanText(left.name).localeCompare(backendContext.cleanText(right.name), "fr"))
      .slice(0, 1200);
    return {
      ok: true,
      events,
      readStats: backendContext.portalReadStats("listEngagementCalendarEvents", startedAt, {
        baseDocuments: 1 + snapshots.length,
        variableDocumentsMax: 0,
        cacheHit: snapshots.every((snapshot) => snapshot.exists && backendContext.cleanText(snapshot.data()?.generatedAt))
      })
    };
  }

  return { listEngagementCalendarEvents };
}

module.exports = { createCompetitionHandlers_listEngagementCalendarEvents };
