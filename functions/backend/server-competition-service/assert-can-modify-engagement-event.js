// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionService_assertCanModifyEngagementEvent(backendContext) {
  function assertCanModifyEngagementEvent(context = {}, event = {}) {
    (0, backendContext.local$assertCanManageEngagementCompetition)(context, event);
    if (!context.national && (0, backendContext.local$engagementEventIsPast)(event)) {
      throw new backendContext.HttpsError("failed-precondition", "Cet evenement passe est consultable mais ne peut plus etre modifie par la region.");
    }
  }

  return { assertCanModifyEngagementEvent };
}

module.exports = { createCompetitionService_assertCanModifyEngagementEvent };
