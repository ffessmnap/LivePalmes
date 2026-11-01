// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_cleanEngagementEntryIndividualEntries(backendContext) {
  function cleanEngagementEntryIndividualEntries(rawEntries = [], allowedCodes = null) {
    if (!Array.isArray(rawEntries)) return [];
    const seen = new Set();
    return rawEntries.slice(0, 80).map((rawEntry) => {
      const eventCode = backendContext.cleanText(rawEntry?.eventCode || rawEntry?.code || rawEntry)
        .toUpperCase()
        .replace(/\s+/g, "");
      if (!eventCode || seen.has(eventCode) || (allowedCodes && !allowedCodes.has(eventCode))) return null;
      seen.add(eventCode);
      return {
        eventCode,
        ...(rawEntry?.qualification ? { qualification: rawEntry.qualification } : {}),
        status: backendContext.cleanText(rawEntry?.status || "selected").slice(0, 40) || "selected",
        manualEntryTime: backendContext.cleanText(rawEntry?.manualEntryTime || rawEntry?.entryTimeManual).slice(0, 20),
        entryTime: backendContext.cleanText(rawEntry?.entryTime).slice(0, 20),
        entryTimeValue: Number(rawEntry?.entryTimeValue || 0) || 0,
        entryTimeMode: backendContext.cleanText(rawEntry?.entryTimeMode).slice(0, 40),
        entryTimeWarning: backendContext.cleanText(rawEntry?.entryTimeWarning).slice(0, 220),
        sourcePerformanceId: backendContext.cleanText(rawEntry?.sourcePerformanceId).slice(0, 120),
        date: backendContext.cleanIsoDate(rawEntry?.date),
        location: backendContext.cleanText(rawEntry?.location).slice(0, 160)
      };
    }).filter(Boolean);
  }

  return { cleanEngagementEntryIndividualEntries };
}

module.exports = { createEntryModelService_cleanEngagementEntryIndividualEntries };
