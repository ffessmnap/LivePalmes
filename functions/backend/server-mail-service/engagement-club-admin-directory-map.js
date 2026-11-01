// Existing operation bodies; live services arrive through explicit accessors.
function createMailService_engagementClubAdminDirectoryMap(backendContext) {
  function engagementClubAdminDirectoryMap(recipients = []) {
    return recipients.reduce((admins, recipient) => {
      const entry = (0, backendContext.local$engagementClubAdminDirectoryEntry)(recipient);
      if (entry) admins[(0, backendContext.local$engagementMailRecipientIndexKey)(entry.uid)] = entry;
      return admins;
    }, {});
  }

  async function writeEngagementClubAdminDirectory(db, recipients = [], now = new Date().toISOString()) {
    const admins = engagementClubAdminDirectoryMap(recipients);
    const byteLength = (0, backendContext.local$assertEngagementClubAdminDirectorySize)(admins);
    await (0, backendContext.local$engagementClubAdminDirectoryRef)(db).set({
      status: "ready",
      admins,
      adminCount: Object.keys(admins).length,
      byteLength,
      updatedAt: now
    }, { merge: false });
    return { admins, byteLength };
  }

  return { engagementClubAdminDirectoryMap, writeEngagementClubAdminDirectory };
}

module.exports = { createMailService_engagementClubAdminDirectoryMap };
