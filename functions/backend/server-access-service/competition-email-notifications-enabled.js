// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_competitionEmailNotificationsEnabled(backendContext) {
  function competitionEmailNotificationsEnabled(value = {}) {
    return value?.emailPreferences?.competitionNotifications !== false && value?.competitionNotificationsEnabled !== false;
  }

  return { competitionEmailNotificationsEnabled };
}

module.exports = { createAccessService_competitionEmailNotificationsEnabled };
