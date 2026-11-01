// Existing operation bodies; live services arrive through explicit accessors.
function createMailService_updateEngagementClubAdminDirectory(backendContext) {
  async function updateEngagementClubAdminDirectory(db, before = null, after = null, now = new Date().toISOString()) {
    const uid = backendContext.cleanText(after?.uid || before?.uid);
    if (!uid) return;
    const key = (0, backendContext.local$engagementMailRecipientIndexKey)(uid);
    await db.runTransaction(async (transaction) => {
      const ref = (0, backendContext.local$engagementClubAdminDirectoryRef)(db);
      const [profile, snapshot] = await transaction.getAll(db.collection("users").doc(uid), ref);
      if (!snapshot.exists || snapshot.data()?.status !== "ready") return;
      const admins = { ...(snapshot.data()?.admins || {}) };
      const recipient = profile.exists && profile.data()?.status === "active"
        ? (0, backendContext.local$engagementMailRecipientFromUserDoc)(profile) : null;
      const entry = (0, backendContext.local$engagementClubAdminDirectoryEntry)(recipient || {});
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
    }, { maxAttempts: 5 });
  }

  return { updateEngagementClubAdminDirectory };
}

module.exports = { createMailService_updateEngagementClubAdminDirectory };
