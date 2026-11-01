// Existing operation bodies; live services arrive through explicit accessors.
function createDtnService_performanceSwimmerIndexKey(backendContext) {
  function performanceSwimmerIndexKey(row = {}) {
    const identity = backendContext.cleanText(row.swimmerIdentityKey);
    if (identity) return identity;
    const first = (0, backendContext.local$normalizePerformanceSearchText)(row.firstName);
    const last = (0, backendContext.local$normalizePerformanceSearchText)(row.lastName);
    const birth = backendContext.cleanText(row.birthDate);
    if (first && last && birth) return `${last}|${first}|${birth}`;
    return backendContext.cleanText(row.swimmerId || row.originalSwimmerId || row.swimmer);
  }

  return { performanceSwimmerIndexKey };
}

module.exports = { createDtnService_performanceSwimmerIndexKey };
