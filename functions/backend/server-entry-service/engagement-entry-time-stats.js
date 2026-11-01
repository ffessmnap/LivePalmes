// Existing operation bodies; live services arrive through explicit accessors.
function createEntryService_engagementEntryTimeStats(backendContext) {
  function engagementEntryTimeStats(swimmers = []) {
    return swimmers.reduce((stats, swimmer) => {
      (Array.isArray(swimmer.individualEntries) ? swimmer.individualEntries : []).forEach((entry) => {
        stats.total += 1;
        const mode = backendContext.cleanText(entry.entryTimeMode) || "missing";
        stats[mode] = (stats[mode] || 0) + 1;
        if (entry.entryTimeWarning) stats.warning += 1;
      });
      return stats;
    }, {
      total: 0,
      known: 0,
      manual: 0,
      default595999: 0,
      missing: 0,
      warning: 0
    });
  }

  return { engagementEntryTimeStats };
}

module.exports = { createEntryService_engagementEntryTimeStats };
