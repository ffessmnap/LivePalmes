// Existing operation bodies; live services arrive through explicit accessors.
function createDirectoryService_sameAccessDirectorySnapshotEntry(backendContext) {
  function sameAccessDirectorySnapshotEntry(left, right) {
    return JSON.stringify(left || null) === JSON.stringify(right || null);
  }

  return { sameAccessDirectorySnapshotEntry };
}

module.exports = { createDirectoryService_sameAccessDirectorySnapshotEntry };
