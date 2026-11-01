// Existing operation bodies; live services arrive through explicit accessors.
function createPerformanceService_performancePublicKey(backendContext) {
  function performancePublicKey(row = {}) {
    if (row.publicKey) return backendContext.cleanText(row.publicKey);
    if (row.id) return `${row.source || "intranap"}|${row.id}`;
    return [
      row.swimmerIdentityKey || row.swimmerId || row.swimmer,
      row.date,
      row.course,
      row.timeValue,
      row.club || row.clubName,
      row.competitionId || row.location
    ].map((value) => backendContext.cleanText(value)).join("|");
  }

  return { performancePublicKey };
}

module.exports = { createPerformanceService_performancePublicKey };
