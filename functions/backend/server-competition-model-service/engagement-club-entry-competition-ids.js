// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionModelService_engagementClubEntryCompetitionIds(backendContext) {
  function engagementCompetitionCalendarItemsFromData(data = {}) {
    const competitions = data.competitions && typeof data.competitions === "object" ? data.competitions : {};
    return Object.values(competitions)
      .map((competition) => (0, backendContext.local$engagementCompetitionCalendarItem)(competition, competition.id))
      .filter((competition) => competition.id && competition.date);
  }

  function filterEngagementCompetitionCalendarItems(items = [], filters = {}) {
    return items
      .filter((competition) => !filters.startDate || !competition.date || competition.date >= filters.startDate)
      .filter((competition) => !filters.endDate || !competition.date || competition.date <= filters.endDate)
      .filter((competition) => !filters.regionId || competition.regionId === filters.regionId)
      .filter((competition) => !filters.level || competition.level === filters.level)
      .filter((competition) => !filters.competitionType || competition.competitionType === filters.competitionType)
      .filter((competition) => !filters.entryStatus || competition.entryStatus === filters.entryStatus)
      .sort((left, right) =>
        backendContext.cleanText(left.date).localeCompare(backendContext.cleanText(right.date)) ||
        backendContext.cleanText(left.name).localeCompare(backendContext.cleanText(right.name), "fr")
      );
  }

  async function engagementClubEntryCompetitionIds(competitions = [], clubId = "", coverageKeys = [], prefetchedIndexSnapshot = null) {
    const competitionIds = Array.from(new Set((Array.isArray(competitions) ? competitions : [])
      .map((competition) => backendContext.cleanText(competition?.id).slice(0, 128))
      .filter(Boolean)));
    const cleanClubId = backendContext.cleanText(clubId).slice(0, 40);
    if (!competitionIds.length || !cleanClubId) return { ids: new Set(), cacheHit: true, fallbackDocumentsMax: 0 };
    const cleanCoverageKeys = Array.from(new Set((Array.isArray(coverageKeys) ? coverageKeys : [])
      .map((key) => backendContext.cleanText(key).slice(0, 20))
      .filter(Boolean)));
    const indexRef = (0, backendContext.local$engagementClubCompetitionIndexRef)(backendContext.db, cleanClubId);
    const indexSnapshot = prefetchedIndexSnapshot || await indexRef.get();
    const indexData = indexSnapshot.exists ? indexSnapshot.data() || {} : {};
    const coveredRanges = indexData.coveredRanges && typeof indexData.coveredRanges === "object" ? indexData.coveredRanges : {};
    if (cleanCoverageKeys.length && cleanCoverageKeys.every((key) => coveredRanges[key] === true)) {
      const indexedIds = new Set(Object.values(indexData.competitionIds || {}).map(backendContext.cleanText).filter(Boolean));
      return {
        ids: new Set(competitionIds.filter((competitionId) => indexedIds.has(competitionId))),
        cacheHit: true,
        fallbackDocumentsMax: 0
      };
    }
    const competitionIdByEntryId = new Map(competitionIds
      .map((competitionId) => [(0, backendContext.local$engagementClubEntryId)(competitionId, cleanClubId), competitionId]));
    const batches = [];
    for (let index = 0; index < competitionIds.length; index += 30) {
      const batchCompetitionIds = competitionIds.slice(index, index + 30);
      const entryIds = batchCompetitionIds.map((competitionId) => (0, backendContext.local$engagementClubEntryId)(competitionId, cleanClubId));
      batches.push(backendContext.db.collection("engagementClubEntries")
        .where(backendContext.FieldPath.documentId(), "in", entryIds)
        .select("competitionId")
        .get());
    }
    const snapshots = await Promise.all(batches);
    const found = new Set(snapshots.flatMap((snapshot) => snapshot.docs
      .map((doc) => backendContext.cleanText(doc.data()?.competitionId || competitionIdByEntryId.get(doc.id)).slice(0, 128))
      .filter(Boolean)));
    const now = new Date().toISOString();
    const competitionIndex = Object.fromEntries([...found].map((competitionId) => [(0, backendContext.local$engagementClubCompetitionIndexKey)(competitionId), competitionId]));
    const coverage = Object.fromEntries(cleanCoverageKeys.map((key) => [key, true]));
    await indexRef.set({
      clubId: cleanClubId,
      generatedAt: now,
      updatedAt: now,
      ...(Object.keys(competitionIndex).length ? { competitionIds: competitionIndex } : {}),
      ...(Object.keys(coverage).length ? { coveredRanges: coverage } : {})
    }, { merge: true });
    return {
      ids: found,
      cacheHit: false,
      fallbackDocumentsMax: competitionIds.length + batches.length
    };
  }

  return { engagementCompetitionCalendarItemsFromData, filterEngagementCompetitionCalendarItems, engagementClubEntryCompetitionIds };
}

module.exports = { createCompetitionModelService_engagementClubEntryCompetitionIds };
