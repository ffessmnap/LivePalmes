// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_engagementKnownTimeHistory(backendContext) {
  function engagementKnownTimeHistory(rows = [], eventCode = "", competition = {}, limit = 10) {
    const normalizedEventCode = backendContext.cleanText(eventCode).toUpperCase().replace(/\s+/g, "");
    return rows
      .filter((row) => backendContext.cleanText(row.course).toUpperCase().replace(/\s+/g, "") === normalizedEventCode)
      .filter((row) => (0, backendContext.local$engagementQualificationRowAllowed)(row, competition))
      .sort((left, right) =>
        backendContext.cleanText(right.date).localeCompare(backendContext.cleanText(left.date)) ||
        Number(left.timeValue || 0) - Number(right.timeValue || 0)
      )
      .slice(0, Math.max(1, Math.min(2000, Number(limit || 10))))
      .map((row) => backendContext.cleanFirestoreValue({
        entryTime: backendContext.formatTimeValue(Number(row.timeValue || 0)) || backendContext.cleanText(row.time),
        entryTimeValue: Number(row.timeValue || 0) || 0,
        sourcePerformanceId: backendContext.cleanText(row.publicKey || row.performanceBaseId || row.id).slice(0, 160),
        date: backendContext.cleanIsoDate(row.date),
        location: backendContext.cleanText(row.location).slice(0, 160),
        pool: backendContext.cleanText(row.pool).slice(0, 20),
        chrono: backendContext.cleanText(row.chrono).slice(0, 40)
      }));
  }

  return { engagementKnownTimeHistory };
}

module.exports = { createEntryModelService_engagementKnownTimeHistory };
