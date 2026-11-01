// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionHandlers_listEngagementCompetitions(backendContext) {
  async function listEngagementCompetitions(request) {
    const startedAt = Date.now();
    const manageOnly = request.data?.manageOnly === true;
    const managementContext = manageOnly ? await backendContext.engagementAccessContext(request) : null;
    const clubContext = manageOnly ? null : await backendContext.engagementClubAccessContext(request);
    if (manageOnly && !managementContext.national && (!managementContext.region || !managementContext.regionId)) {
      throw new backendContext.HttpsError("permission-denied", "Droit gestion competition engagements requis.");
    }
    const rawRanges = Array.isArray(request.data?.ranges) && request.data.ranges.length
      ? request.data.ranges.slice(0, 2)
      : [{ fromDate: request.data?.fromDate, toDate: request.data?.toDate }];
    const ranges = rawRanges.map((rawRange = {}) => {
      const fromDate = backendContext.cleanIsoDate(rawRange.fromDate) || new Date().toISOString().slice(0, 10);
      const season = backendContext.engagementSeasonBoundsFromEndYear(backendContext.engagementSeasonEndYearFromIsoDate(fromDate));
      return {
        startDate: fromDate || season.startDate,
        endDate: backendContext.cleanIsoDate(rawRange.toDate) || season.endDate,
        season
      };
    });
    const limit = Math.min(1200, Math.max(10, Math.trunc(Number(request.data?.limit) || 250)));
    const regionId = backendContext.cleanText(request.data?.regionId).slice(0, 80);
    const level = backendContext.ENGAGEMENT_COMPETITION_LEVELS.has(backendContext.cleanText(request.data?.level))
      ? backendContext.cleanText(request.data.level)
      : "";
    const entryStatus = backendContext.ENGAGEMENT_ENTRY_STATUSES.has(backendContext.cleanText(request.data?.entryStatus))
      ? backendContext.cleanText(request.data.entryStatus)
      : "";
    const seasonEndYears = Array.from(new Set(ranges.map((range) => range.season.endYear)));
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      const items = await backendContext.nativePortalCalendarItems(ranges);
      const competitions = items.filter(item => ["pool", "openWater"].includes(item.competitionType))
        .filter(item => ranges.some(range => item.date >= range.startDate && item.date <= range.endDate))
        .filter(item => !manageOnly || managementContext.national || (!item.nationalManagementOnly && backendContext.engagementRegionsMatch(item.regionId, managementContext.regionId)))
        .filter(item => !regionId || backendContext.engagementRegionsMatch(item.regionId, regionId))
        .filter(item => !level || item.level === level).filter(item => !entryStatus || item.entryStatus === entryStatus);
      if (competitions.length > limit) throw new backendContext.HttpsError("resource-exhausted", "Trop de competitions : reduisez la periode demandee.");
      return { ok: true, source: "nap", competitions, fromDate: ranges[0].startDate, toDate: ranges[ranges.length - 1].endDate,
        ...(manageOnly && request.data?.includeCalendarEvents === true ? { calendarEvents: items
          .filter(item => !["pool", "openWater"].includes(item.competitionType))
          .filter(item => ranges.some(range => item.date >= range.startDate && item.date <= range.endDate))
          .filter(item => managementContext.national || (!item.nationalManagementOnly && backendContext.engagementRegionsMatch(item.regionId, managementContext.regionId)))
          .map(item => ({ ...item, sourceType: "calendarEvent", eventType: item.competitionType })) } : {}),
        readStats: backendContext.portalReadStats("listEngagementCompetitions", startedAt, { baseDocuments: 1, variableDocumentsMax: 0, cacheHit: false }),
        sqlBudget: { queriesMax: seasonEndYears.length, rowsMax: seasonEndYears.length * 500 } };
    }
    const calendarRefs = seasonEndYears.map((endYear) => backendContext.engagementCompetitionCalendarRef(backendContext.db, endYear));
    const clubEntryIndexRef = clubContext ? backendContext.engagementClubCompetitionIndexRef(backendContext.db, clubContext.clubId) : null;
    const prefetchedSnapshots = await backendContext.db.getAll(...calendarRefs, ...[clubEntryIndexRef].filter(Boolean));
    const calendarSnapshots = prefetchedSnapshots.slice(0, calendarRefs.length);
    const clubEntryIndexSnapshot = clubEntryIndexRef ? prefetchedSnapshots[calendarRefs.length] : null;
    const calendarByEndYear = new Map(calendarSnapshots.map((snapshot, index) => [seasonEndYears[index], snapshot]));
    const calendarReady = calendarSnapshots.every((snapshot) => snapshot?.exists && backendContext.cleanText(snapshot.data()?.generatedAt));
    const allCalendarCompetitions = Array.from(new Map(calendarSnapshots.flatMap((snapshot) => {
      const items = snapshot?.exists ? backendContext.engagementCompetitionCalendarItemsFromData(snapshot.data() || {}) : [];
      return items.map((competition) => [competition.id, competition]);
    })).values());
    const calendarCompetitions = Array.from(new Map(ranges.flatMap((range) => {
      const snapshot = calendarByEndYear.get(range.season.endYear);
      const items = snapshot?.exists ? backendContext.engagementCompetitionCalendarItemsFromData(snapshot.data() || {}) : [];
      return backendContext.filterEngagementCompetitionCalendarItems(items, {
        startDate: range.startDate,
        endDate: range.endDate,
        regionId,
        level,
        entryStatus
      });
    }).map((competition) => [competition.id, competition])).values())
      .filter((competition) => !manageOnly || managementContext.national || (
        !backendContext.isNationalOnlyEngagementCompetitionLevel(competition.level) &&
        backendContext.engagementRegionsMatch(competition.regionId, managementContext.regionId)
      ))
      .slice(0, limit);
    const clubEntryIndexResult = clubContext
      ? await backendContext.engagementClubEntryCompetitionIds(allCalendarCompetitions, clubContext.clubId, seasonEndYears.map(String), clubEntryIndexSnapshot)
      : { ids: new Set(), cacheHit: true, fallbackDocumentsMax: 0 };
    const competitions = calendarCompetitions.map((competition) => clubContext
      ? { ...competition, clubEntryExists: clubEntryIndexResult.ids.has(competition.id) }
      : competition);

    return {
      ok: true,
      collection: backendContext.ENGAGEMENT_COMPETITION_CALENDARS_COLLECTION,
      fromDate: ranges[0].startDate,
      toDate: ranges[ranges.length - 1].endDate,
      ranges: ranges.map((range) => ({
        fromDate: range.startDate,
        toDate: range.endDate,
        seasonStartYear: range.season.startYear,
        seasonEndYear: range.season.endYear
      })),
      seasonStartYear: ranges[0].season.startYear,
      seasonEndYear: ranges[0].season.endYear,
      calendarGenerated: false,
      readStats: backendContext.portalReadStats("listEngagementCompetitions", startedAt, {
        baseDocuments: 1 + calendarSnapshots.length + (clubContext ? 1 : 0),
        variableDocumentsMax: clubEntryIndexResult.fallbackDocumentsMax,
        cacheHit: Boolean(calendarReady && clubEntryIndexResult.cacheHit)
      }),
      competitions
    };
  }

  return { listEngagementCompetitions };
}

module.exports = { createCompetitionHandlers_listEngagementCompetitions };
