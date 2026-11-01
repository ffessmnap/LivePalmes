// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionService_enqueueNativeNotificationTask(backendContext) {
  async function enqueueNativeNotificationTask(eventId) {
    const result=await require("../../nap-notification-task").enqueue(backendContext.db,eventId,(0, backendContext.local$nativeNotificationTaskServices)());
    if(result.queued===false)throw new Error('Programmation de la notification a reprendre.');
    return result;
  }

  return { enqueueNativeNotificationTask };
}

module.exports = { createCompetitionService_enqueueNativeNotificationTask };
