// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_competitionNotificationPreferenceUrl(backendContext) {
  function competitionNotificationPreferenceUrl(uid = "") {
    const token = (0, backendContext.local$competitionNotificationPreferenceToken)(uid);
    if (!token) return "";
    return `${backendContext.ENVIRONMENT.hostingOrigin}/notifications.html?uid=${encodeURIComponent(backendContext.cleanText(uid))}&token=${encodeURIComponent(token)}`;
  }

  return { competitionNotificationPreferenceUrl };
}

module.exports = { createAccessService_competitionNotificationPreferenceUrl };
