// Existing operation bodies; live services arrive through explicit accessors.
function createConsoleService_updatePublicPinNotes(backendContext) {
  async function updatePublicPinNotes(competitionId, enabled) {
    const now = new Date().toISOString();
    const ref = backendContext.liveDataRef(competitionId);
    await backendContext.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      const current = snapshot.exists ? snapshot.data() : {};
      const liveData = current.data || {};
      const notes = { ...(liveData.notes || {}) };
      delete notes.rolePins;
      notes.pinAuthMode = "cloud";
      notes.pinLockEnabled = Boolean(enabled);
      notes.pinLockUpdatedAt = now;
      transaction.set(ref, {
        data: {
          ...liveData,
          notes,
          sourceVersion: `cloud-pins-${Date.now()}`
        },
        updatedAt: now,
        source: enabled ? "Codes PIN securises" : "Codes PIN desactives"
      }, { merge: true });
    });
  }

  return { updatePublicPinNotes };
}

module.exports = { createConsoleService_updatePublicPinNotes };
