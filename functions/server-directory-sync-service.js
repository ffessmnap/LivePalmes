// Existing bodies isolated by responsibility; no I/O during factory creation.
function createDirectorySyncService(backendContext) {
  async function syncAccessDirectorySnapshotFromUserChange(uid, beforeData, afterData, now) {
    const beforeEntry = beforeData ? backendContext.accessDirectorySnapshotEntry(uid, beforeData) : null;
    const afterEntry = afterData ? backendContext.accessDirectorySnapshotEntry(uid, afterData) : null;
    if (backendContext.sameAccessDirectorySnapshotEntry(beforeEntry, afterEntry)) return;

    const key = backendContext.accessDirectorySnapshotEntryKey(uid);
    const userRef = backendContext.db.collection("users").doc(uid);
    // Events may arrive out of order. Reading the current profile in the same
    // transaction as the projection writes also retries a concurrent change.
    // Two document reads per attempt, five attempts at most; no account scan.
    await backendContext.db.runTransaction(async (transaction) => {
      const [userSnapshot, stateSnapshot] = await transaction.getAll(
        userRef, backendContext.accessDirectorySnapshotStateRef()
      );
      const state = stateSnapshot.exists ? stateSnapshot.data() || {} : {};
      if (!["building", "ready"].includes(state.status)) return;

      const currentData = userSnapshot.exists ? userSnapshot.data() || {} : null;
      const currentEntry = currentData ? backendContext.accessDirectorySnapshotEntry(uid, currentData) : null;
      const currentRegionId = currentData ? backendContext.accessDirectorySnapshotRegionId(currentData) : "";
      backendContext.mergeAccessDirectorySnapshotEntries(transaction, "national", "", {
        [key]: currentEntry || backendContext.FieldValue.delete()
      }, now);

      // Event regions are cleanup hints only, never a source of profile data.
      const regions = new Set([
        beforeData ? backendContext.accessDirectorySnapshotRegionId(beforeData) : "",
        afterData ? backendContext.accessDirectorySnapshotRegionId(afterData) : "",
        currentRegionId
      ].filter(Boolean));
      for (const regionId of regions) {
        backendContext.mergeAccessDirectorySnapshotEntries(transaction, "region", regionId, {
          [key]: regionId === currentRegionId ? currentEntry : backendContext.FieldValue.delete()
        }, now);
      }
    }, { maxAttempts: 5 });
  }

  return { syncAccessDirectorySnapshotFromUserChange };
}

module.exports = { createDirectorySyncService };
