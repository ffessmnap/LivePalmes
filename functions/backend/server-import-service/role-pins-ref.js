// Existing operation bodies; live services arrive through explicit accessors.
function createImportService_rolePinsRef(backendContext) {
  function rolePinsRef(competitionId) {
    return backendContext.db
      .collection("competitions")
      .doc(competitionId)
      .collection("secrets")
      .doc("rolePins");
  }

  return { rolePinsRef };
}

module.exports = { createImportService_rolePinsRef };
