// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionHandlers_getEngagementCalendarEvent(backendContext) {
  async function getEngagementCalendarEvent(request) {
    const context = await backendContext.engagementAccessContext(request);
    const calendarEventId = backendContext.cleanText(request.data?.calendarEventId).slice(0, 128);
    if (!calendarEventId) throw new backendContext.HttpsError("invalid-argument", "Evenement requis.");
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      const event = await backendContext.nativePortalCompetition(calendarEventId, item => backendContext.assertCanManageEngagementCompetition(context, item), true);
      return { ok: true, source: "nap", event: { ...event, sourceType: "calendarEvent", eventType: event.competitionType,
        regionalPastReadOnly: !context.national && backendContext.engagementEventIsPast(event) } };
    }
    const snapshot = await backendContext.db.collection(backendContext.ENGAGEMENT_CALENDAR_EVENTS_COLLECTION).doc(calendarEventId).get();
    if (!snapshot.exists) throw new backendContext.HttpsError("not-found", "Evenement introuvable.");
    const eventData = snapshot.data() || {};
    backendContext.assertCanManageEngagementCompetition(context, eventData);
    const deletionRequest = await backendContext.db.collection("engagementCompetitionDeletionRequests")
      .doc(backendContext.engagementDeletionRequestId("calendarEvent", calendarEventId))
      .get();
    return {
      ok: true,
      event: {
        ...backendContext.engagementCalendarEventDetailItem(snapshot, { includeDocumentUploader: true }),
        regionalPastReadOnly: !context.national && backendContext.engagementEventIsPast(eventData),
        deletionRequestStatus: deletionRequest.exists && deletionRequest.data()?.status === "pending" ? "pending" : ""
      }
    };
  }

  return { getEngagementCalendarEvent };
}

module.exports = { createCompetitionHandlers_getEngagementCalendarEvent };
