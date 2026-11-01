// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionService_engagementCompetitionDocumentContext(backendContext) {
  async function engagementCompetitionDocumentContext(request) {
    const context = await backendContext.engagementAccessContext(request);
    const calendarEventId = backendContext.cleanText(request.data?.calendarEventId).slice(0, 128);
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    const eventId = calendarEventId || competitionId;
    const sourceType = calendarEventId ? "calendarEvent" : "competition";
    if (!eventId) throw new backendContext.HttpsError("invalid-argument", "Compétition ou evenement requis.");
    const collection = sourceType === "calendarEvent" ? backendContext.ENGAGEMENT_CALENDAR_EVENTS_COLLECTION : "engagementCompetitions";
    const ref = backendContext.db.collection(collection).doc(eventId);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new backendContext.HttpsError("not-found", "Compétition ou evenement introuvable.");
    (0, backendContext.local$assertCanManageEngagementCompetition)(context, snapshot.data() || {});
    return { context, competitionId: eventId, calendarEventId, sourceType, ref, snapshot };
  }

  return { engagementCompetitionDocumentContext };
}

module.exports = { createCompetitionService_engagementCompetitionDocumentContext };
