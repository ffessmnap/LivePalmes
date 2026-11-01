// Existing operation bodies; live services arrive through explicit accessors.
function createMailService_updateEngagementClubAdminDirectory(backendContext) {
  async function updateEngagementClubAdminDirectory(db, before = null, after = null, now = new Date().toISOString()) {
    const uid = backendContext.cleanText(after?.uid || before?.uid);
    if (!uid) return;
    const key = (0, backendContext.local$engagementMailRecipientIndexKey)(uid);
    await db.runTransaction(async (transaction) => {
      const ref = (0, backendContext.local$engagementClubAdminDirectoryRef)(db);
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists || snapshot.data()?.status !== "ready") return;
      const admins = { ...(snapshot.data()?.admins || {}) };
      const entry = (0, backendContext.local$engagementClubAdminDirectoryEntry)(after || {});
      if (entry) admins[key] = entry;
      else delete admins[key];
      const byteLength = (0, backendContext.local$assertEngagementClubAdminDirectorySize)(admins);
      transaction.set(ref, {
        status: "ready",
        admins,
        adminCount: Object.keys(admins).length,
        byteLength,
        updatedAt: now
      }, { merge: false });
    });
  }

  return { updateEngagementClubAdminDirectory };
}

module.exports = { createMailService_updateEngagementClubAdminDirectory };
