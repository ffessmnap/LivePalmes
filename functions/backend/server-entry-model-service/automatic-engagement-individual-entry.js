// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_automaticEngagementIndividualEntry(backendContext) {
  function qualificationService() {
    if (!backendContext.legacyQualificationService) {
      backendContext.legacyQualificationService = backendContext.createQualificationService({ db: /* backend-shorthand */ backendContext.db, HttpsError: /* backend-shorthand */ backendContext.HttpsError, categoryFor: backendContext.ageCategoryFromDates,
        eventsFor: backendContext.local$qualificationEvents, rowsFor: getEngagementQualificationRows, cacheIdFor: backendContext.local$engagementEntryTimeCacheId,
        automaticEntryFor: automaticEngagementIndividualEntry,
        access: backendContext.engagementAccessContext, clubAccess: backendContext.engagementClubAccessContext, entryIdFor: backendContext.engagementClubEntryId,
        assertOpen: backendContext.assertEngagementClubWriteOpen, audit: backendContext.writeAuditLog });
    }
    return backendContext.legacyQualificationService;
  }

  function bestEngagementKnownTime(rows = [], eventCode = "", competition = {}) {
    return rows
      .filter((row) => backendContext.cleanText(row.course).toUpperCase().replace(/\s+/g, "") === eventCode)
      .filter((row) => (0, backendContext.local$engagementQualificationRowAllowed)(row, competition))
      .reduce((best, row) => backendContext.publicBetterPerformance(row, best) ? row : best, null);
  }

  async function getEngagementQualificationRows(swimmer = {}, competition = {}) {
    let rows = await (0, backendContext.local$getEngagementEntryTimeRowsForSwimmer)(swimmer, { requireComplete: true });
    const group = competition.qualifications?.groups?.find((item) => item.categories.includes(backendContext.ageCategoryFromDates(competition.date, swimmer.birthDate)));
    if (group?.competitionMode !== "selected" || !rows.some((row) => !row.competitionId && row.date >= group.startDate && row.date <= group.endDate)) return rows;
    // Older compact Storage files omit competition ids. Reuse existing swimmer
    // pages (500 results/document) instead of reading each performance separately.
    const identity = backendContext.cleanText(swimmer.identityKey || swimmer.swimmerIdentityKey);
    const indexId = identity ? backendContext.stableHash(identity).slice(0, 40) : backendContext.cleanText(swimmer.swimmerIndexId || swimmer.id);
    const index = await backendContext.db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION).doc(indexId).get();
    const count = Number(index.data()?.pageCount || 0);
    if (!count || count > 20) throw new backendContext.HttpsError("failed-precondition", "L'index des compétitions de ce nageur doit être actualisé par le National avant contrôle. Aucun engagement n'a été supprimé.");
    const pages = await backendContext.db.getAll(...Array.from({ length: count }, (_, page) => backendContext.db.collection(backendContext.PERFORMANCE_SWIMMER_PAGES_COLLECTION).doc(backendContext.performanceSwimmerPageId(indexId, page))));
    if (pages.some((page) => !page.exists)) throw new backendContext.HttpsError("unavailable", "Index des performances incomplet. Réessayez après son actualisation.");
    const byId = new Map(pages.flatMap((page) => page.data().rows || []).flatMap((row) => [row.publicKey, row.performanceBaseId, row.id].map(backendContext.cleanText).filter(Boolean).map((id) => [id, row])));
    const signature = (items) => backendContext.stableHash(JSON.stringify(items.map(backendContext.local$engagementEntryTimeCacheRow).sort((a, b) => a.publicKey.localeCompare(b.publicKey))));
    const sourceSignature = signature(rows);
    rows = rows.map((row) => {
      const full = byId.get(backendContext.cleanText(row.publicKey || row.performanceBaseId || row.id));
      return { ...row, competitionId: row.competitionId || backendContext.cleanText(full?.competitionId), qualificationCompetitionId: row.qualificationCompetitionId || backendContext.cleanText(full?.qualificationCompetitionId) };
    });
    if (rows.some((row) => !row.competitionId && row.date >= group.startDate && row.date <= group.endDate)) throw new backendContext.HttpsError("failed-precondition", "Certaines performances n'ont pas de compétition identifiée. Le National doit actualiser leur index avant contrôle.");
    const events = (0, backendContext.local$engagementEntryTimeRowsToEvents)(rows);
    await backendContext.db.runTransaction(async (tx) => {
      const ref = (0, backendContext.local$engagementEntryTimeCacheRef)(backendContext.db, swimmer);
      const current = await tx.get(ref);
      if (current.exists && signature((0, backendContext.local$engagementEntryTimeCacheRowsFromData)(current.data())) === sourceSignature) {
        tx.set(ref, { events, truncated: rows.length > Object.values(events).flat().length }, { merge: true });
      }
    });
    return rows;
  }

  function automaticEngagementIndividualEntry(entry, rows, competition) {
    const eventCode = backendContext.cleanText(entry.eventCode).toUpperCase().replace(/\s+/g, "");
    const known = bestEngagementKnownTime(rows, eventCode, competition);
    if (known) {
      return (0, backendContext.local$cleanEngagementEntryIndividualEntries)([{
        eventCode,
        entryTimeMode: "known",
        entryTime: backendContext.formatTimeValue(known.timeValue) || known.time,
        entryTimeValue: Number(known.timeValue || 0) || 0,
        sourcePerformanceId: known.publicKey || known.performanceBaseId || known.id || "",
        date: known.date,
        location: known.location
      }])[0];
    }
    return (0, backendContext.local$cleanEngagementEntryIndividualEntries)([{
      eventCode,
      entryTimeMode: "default595999",
      entryTime: "59:59.99",
      entryTimeValue: 359999
    }])[0];
  }

  return { qualificationService, bestEngagementKnownTime, getEngagementQualificationRows, automaticEngagementIndividualEntry };
}

module.exports = { createEntryModelService_automaticEngagementIndividualEntry };
