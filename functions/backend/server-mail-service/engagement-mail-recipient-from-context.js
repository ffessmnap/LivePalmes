// Existing operation bodies; live services arrive through explicit accessors.
function createMailService_engagementMailRecipientFromContext(backendContext) {
  function engagementMailRecipientFromContext(context = {}) {
    const capabilities = [];
    if (context.national) capabilities.push("engagements.national.manage");
    else if (context.region) capabilities.push("engagements.region.manage");
    if (!context.email || !capabilities.length) return null;
    return {
      uid: context.uid || "",
      email: backendContext.normalizeEmail(context.email).slice(0, 180),
      firstName: "",
      lastName: "",
      clubId: "",
      clubName: "",
      regionId: backendContext.cleanText(context.regionId).slice(0, 80),
      competitionNotificationsEnabled: context.competitionNotificationsEnabled !== false,
      capabilities
    };
  }

  return { engagementMailRecipientFromContext };
}

module.exports = { createMailService_engagementMailRecipientFromContext };
