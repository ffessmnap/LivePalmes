// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_engagementClubEntryHasParticipants(backendContext) {
  function engagementClubEntryHasParticipants(entry = {}) {
    const swimmerCount = Array.isArray(entry.swimmers) ? entry.swimmers.length : Math.max(0, Math.trunc(Number(entry.swimmerCount) || 0));
    const officialCount = Array.isArray(entry.officials) ? entry.officials.length : Math.max(0, Math.trunc(Number(entry.officialCount) || 0));
    const relayCount = Array.isArray(entry.relays) ? entry.relays.length : Math.max(0, Math.trunc(Number(entry.relayCount) || 0));
    return swimmerCount > 0 || officialCount > 0 || relayCount > 0;
  }

  return { engagementClubEntryHasParticipants };
}

module.exports = { createEntryModelService_engagementClubEntryHasParticipants };
