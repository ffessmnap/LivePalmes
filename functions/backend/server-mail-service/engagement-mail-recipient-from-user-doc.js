// Existing operation bodies; live services arrive through explicit accessors.
function createMailService_engagementMailRecipientFromUserDoc(backendContext) {
  function engagementMailRecipientFromUserDoc(doc) {
    const data = doc.data() || {};
    const capabilities = backendContext.activeCapabilitiesFromMap(data.capabilities || {})
      .filter((capability) => backendContext.ENGAGEMENT_MAIL_CAPABILITIES.includes(capability));
    return backendContext.cleanFirestoreValue({
      uid: doc.id,
      email: backendContext.normalizeEmail(data.email).slice(0, 180),
      firstName: backendContext.cleanText(data.firstName).slice(0, 80),
      lastName: backendContext.cleanText(data.lastName).slice(0, 80),
      clubId: backendContext.cleanText(data.clubId).slice(0, 40),
      clubName: backendContext.engagementClubName(data.clubId, data.clubName).slice(0, 140),
      regionId: backendContext.cleanText(data.regionId).slice(0, 80),
      competitionNotificationsEnabled: backendContext.competitionEmailNotificationsEnabled(data),
      capabilities
    });
  }

  return { engagementMailRecipientFromUserDoc };
}

module.exports = { createMailService_engagementMailRecipientFromUserDoc };
