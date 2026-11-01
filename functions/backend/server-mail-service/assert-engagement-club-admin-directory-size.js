// Existing operation bodies; live services arrive through explicit accessors.
function createMailService_assertEngagementClubAdminDirectorySize(backendContext) {
  function engagementClubAdminDirectoryRef(db) {
    return db.collection(backendContext.ENGAGEMENT_CLUB_ADMIN_DIRECTORY_COLLECTION).doc("default");
  }

  function engagementClubAdminDirectoryEntry(recipient = {}) {
    if (
      !recipient.uid ||
      !recipient.clubId ||
      !recipient.email ||
      !(0, backendContext.local$engagementRecipientHasCapability)(recipient, "engagements.club.manage")
    ) return null;
    return backendContext.cleanFirestoreValue({
      uid: backendContext.cleanText(recipient.uid).slice(0, 128),
      email: backendContext.normalizeEmail(recipient.email).slice(0, 180),
      firstName: backendContext.cleanText(recipient.firstName).slice(0, 80),
      lastName: backendContext.cleanText(recipient.lastName).slice(0, 80),
      clubId: backendContext.cleanText(recipient.clubId).slice(0, 40)
    });
  }

  function assertEngagementClubAdminDirectorySize(admins = {}) {
    const byteLength = Buffer.byteLength(JSON.stringify(admins), "utf8");
    if (byteLength > backendContext.ENGAGEMENT_CLUB_ADMIN_DIRECTORY_MAX_BYTES) {
      throw new Error(`Annuaire des administrateurs de clubs trop volumineux (${byteLength} octets).`);
    }
    return byteLength;
  }

  return { engagementClubAdminDirectoryRef, engagementClubAdminDirectoryEntry, assertEngagementClubAdminDirectorySize };
}

module.exports = { createMailService_assertEngagementClubAdminDirectorySize };
