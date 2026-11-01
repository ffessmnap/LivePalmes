// Existing operation bodies; live services arrive through explicit accessors.
function createEngagementPdfRenderer_engagementPdfEntryStats(backendContext) {
  function engagementPdfEntryStats(entry = {}) {
    const swimmers = Array.isArray(entry.swimmers) ? entry.swimmers : [];
    const relays = Array.isArray(entry.relays) ? entry.relays : [];
    const swimmerCount = Array.isArray(entry.swimmers)
      ? swimmers.length
      : Math.max(0, Math.trunc(Number(entry.swimmerCount) || 0));
    const individualCount = Array.isArray(entry.swimmers)
      ? swimmers.reduce((sum, swimmer) => sum + (Array.isArray(swimmer.individualEntries) ? swimmer.individualEntries.length : 0), 0)
      : Math.max(0, Math.trunc(Number(entry.individualCount) || 0));
    const relayCount = Array.isArray(entry.relays)
      ? relays.length
      : Math.max(0, Math.trunc(Number(entry.relayCount) || 0));
    return { swimmerCount, individualCount, relayCount };
  }

  return { engagementPdfEntryStats };
}

module.exports = { createEngagementPdfRenderer_engagementPdfEntryStats };
