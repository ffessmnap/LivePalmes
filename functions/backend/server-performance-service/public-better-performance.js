// Existing operation bodies; live services arrive through explicit accessors.
function createPerformanceService_publicBetterPerformance(backendContext) {
  function publicBetterPerformance(candidate, current) {
    if (!current) return true;
    return Number(candidate.timeValue || 0) < Number(current.timeValue || 0) ||
      (Number(candidate.timeValue || 0) === Number(current.timeValue || 0) && backendContext.cleanText(candidate.date).localeCompare(backendContext.cleanText(current.date)) < 0);
  }

  return { publicBetterPerformance };
}

module.exports = { createPerformanceService_publicBetterPerformance };
