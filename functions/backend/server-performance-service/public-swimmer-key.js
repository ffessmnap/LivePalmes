// Existing operation bodies; live services arrive through explicit accessors.
function createPerformanceService_publicSwimmerKey(backendContext) {
  function publicSwimmerKey(row = {}) {
    if (row.swimmerIdentityKey) return row.swimmerIdentityKey;
    const first = backendContext.cleanText(row.firstName).toUpperCase();
    const last = backendContext.cleanText(row.lastName).toUpperCase();
    const birth = backendContext.cleanText(row.birthDate);
    return first && last && birth ? `${last}|${first}|${birth}` : backendContext.cleanText(row.swimmerId || row.swimmer);
  }

  return { publicSwimmerKey };
}

module.exports = { createPerformanceService_publicSwimmerKey };
