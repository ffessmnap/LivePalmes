// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_competitionNotificationPreferenceToken(backendContext) {
  function notificationPreferenceSecretValue() {
    try {
      return String(backendContext.LIVEPALMES_NOTIFICATION_LINK_SECRET.value() || process.env.LIVEPALMES_NOTIFICATION_LINK_SECRET || "");
    } catch (_) {
      return String(process.env.LIVEPALMES_NOTIFICATION_LINK_SECRET || "");
    }
  }

  function competitionNotificationPreferenceToken(uid = "") {
    const cleanUid = backendContext.cleanText(uid).slice(0, 128);
    const secret = notificationPreferenceSecretValue();
    if (!cleanUid || !secret) return "";
    return backendContext.crypto.createHmac("sha256", secret)
      .update(`competition-notifications|${cleanUid}`)
      .digest("base64url");
  }

  return { notificationPreferenceSecretValue, competitionNotificationPreferenceToken };
}

module.exports = { createAccessService_competitionNotificationPreferenceToken };
