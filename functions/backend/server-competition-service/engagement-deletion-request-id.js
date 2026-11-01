// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionService_engagementDeletionRequestId(backendContext) {
  function engagementDeletionRequestId(sourceType = "competition", eventId = "") {
    return sourceType === "calendarEvent" ? `calendarEvent-${eventId}` : eventId;
  }

  return { engagementDeletionRequestId };
}

module.exports = { createCompetitionService_engagementDeletionRequestId };
