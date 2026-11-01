// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_accessDirectorySnapshotDocumentId(backendContext) {
  function accessDirectorySnapshotStateRef() {
    return backendContext.db.collection(backendContext.ACCESS_DIRECTORY_SNAPSHOT_STATE_COLLECTION).doc("default");
  }

  function accessDirectorySnapshotDocumentId(scopeType = "national", scopeId = "") {
    return scopeType === "region"
      ? `region:${encodeURIComponent(backendContext.cleanText(scopeId).slice(0, 80))}`
      : "national";
  }

  function accessDirectorySnapshotRef(scopeType = "national", scopeId = "") {
    return backendContext.db.collection(backendContext.ACCESS_DIRECTORY_SNAPSHOTS_COLLECTION)
      .doc(accessDirectorySnapshotDocumentId(scopeType, scopeId));
  }

  function accessDirectorySnapshotEntryKey(uid = "") {
    return backendContext.crypto.createHash("sha256").update(backendContext.cleanText(uid)).digest("hex").slice(0, 32);
  }

  return { accessDirectorySnapshotStateRef, accessDirectorySnapshotDocumentId, accessDirectorySnapshotRef, accessDirectorySnapshotEntryKey };
}

module.exports = { createAccessService_accessDirectorySnapshotDocumentId };
