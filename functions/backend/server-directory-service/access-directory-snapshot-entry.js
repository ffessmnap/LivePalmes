// Existing operation bodies; live services arrive through explicit accessors.
function createDirectoryService_accessDirectorySnapshotEntry(backendContext) {
  function accessDirectorySnapshotEntry(uid, data = {}) {
    return (0, backendContext.local$accessUserListItemFromData)(uid, data);
  }

  function accessDirectorySnapshotRegionId(data = {}) {
    const capabilities = data.capabilities || {};
    if (capabilities["admin.full"] === true || capabilities["engagements.national.manage"] === true) return "";
    return backendContext.accessUserRegionIdFromData(data);
  }

  function mergeAccessDirectorySnapshotEntries(batch, scopeType, scopeId, entries, now, status = "") {
    batch.set(backendContext.accessDirectorySnapshotRef(scopeType, scopeId), {
      scopeType,
      scopeId: scopeType === "region" ? scopeId : "",
      version: backendContext.ACCESS_DIRECTORY_SNAPSHOT_VERSION,
      updatedAt: now,
      ...(status ? { status } : {}),
      entries
    }, { merge: true });
  }

  return { accessDirectorySnapshotEntry, accessDirectorySnapshotRegionId, mergeAccessDirectorySnapshotEntries };
}

module.exports = { createDirectoryService_accessDirectorySnapshotEntry };
