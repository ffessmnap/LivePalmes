// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_engagementEntryTimeCacheId(backendContext) {
  function engagementEntryTimeCacheId(swimmer = {}) {
    return backendContext.stableHash([
      backendContext.cleanText(swimmer.source || "performances"),
      backendContext.cleanText(swimmer.identityKey || swimmer.swimmerIdentityKey || swimmer.swimmerIndexId || swimmer.id || swimmer.swimmerId)
    ].filter(Boolean).join("|")).slice(0, 40);
  }

  return { engagementEntryTimeCacheId };
}

module.exports = { createEntryModelService_engagementEntryTimeCacheId };
