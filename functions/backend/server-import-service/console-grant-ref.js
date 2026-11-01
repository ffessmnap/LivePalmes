// Existing operation bodies; live services arrive through explicit accessors.
function createImportService_consoleGrantRef(backendContext) {
  function consoleGrantRef(competitionId, uid) {
    return backendContext.db
      .collection("competitions")
      .doc(competitionId)
      .collection("consoleGrants")
      .doc(uid);
  }

  return { consoleGrantRef };
}

module.exports = { createImportService_consoleGrantRef };
