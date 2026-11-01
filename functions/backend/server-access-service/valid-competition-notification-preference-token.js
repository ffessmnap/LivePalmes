// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_validCompetitionNotificationPreferenceToken(backendContext) {
  function validCompetitionNotificationPreferenceToken(uid = "", token = "") {
    const expected = (0, backendContext.local$competitionNotificationPreferenceToken)(uid);
    const provided = backendContext.cleanText(token);
    if (!expected || !provided || expected.length !== provided.length) return false;
    return backendContext.crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  }

  return { validCompetitionNotificationPreferenceToken };
}

module.exports = { createAccessService_validCompetitionNotificationPreferenceToken };
