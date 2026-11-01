// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_accessDirectoryIndexStateRef(backendContext) {
  function accessDirectoryIndexStateRef() {
    return backendContext.db.collection(backendContext.ACCESS_DIRECTORY_INDEX_STATE_COLLECTION).doc("default");
  }

  return { accessDirectoryIndexStateRef };
}

module.exports = { createAccessService_accessDirectoryIndexStateRef };
