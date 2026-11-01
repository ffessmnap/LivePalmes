// Existing operation bodies; live services arrive through explicit accessors.
function createImportService_liveDataRef(backendContext) {
  function liveDataRef(competitionId) {
    return backendContext.db
      .collection("competitions")
      .doc(competitionId)
      .collection("liveData")
      .doc("current");
  }

  return { liveDataRef };
}

module.exports = { createImportService_liveDataRef };
