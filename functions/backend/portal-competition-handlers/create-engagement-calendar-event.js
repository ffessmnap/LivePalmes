// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionHandlers_createEngagementCalendarEvent(backendContext) {
  async function createEngagementCalendarEvent(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      const raw=request.data || {};
      if (!["training","stage","meeting"].includes(raw.eventType)) throw new backendContext.HttpsError("failed-precondition","Choisissez Formation, Stage ou Reunion. Le type Autre n'est pas propose.");
      const result=await backendContext.createNativePortalCalendarRecord(raw,context,raw.eventType);
      return {...result,event:{...result.competition,sourceType:"calendarEvent",eventType:result.competition.competitionType,regionalPastReadOnly:!context.national&&backendContext.engagementEventIsPast(result.competition)}};
    }
    const eventData = backendContext.cleanEngagementCalendarEventPayload(request.data || {}, context);
    const now = new Date().toISOString();
    const ref = backendContext.db.collection(backendContext.ENGAGEMENT_CALENDAR_EVENTS_COLLECTION).doc();
    const payload = {
      ...eventData,
      publicationStatus: "published",
      clubDocuments: [],
      createdAt: now,
      createdBy: context.uid,
      updatedAt: now,
      updatedBy: context.uid
    };
    await ref.set(payload);
    await backendContext.writeAuditLog("engagementCalendarEvent.created", context.uid, {
      calendarEventId: ref.id,
      name: payload.name,
      date: payload.date,
      eventType: payload.eventType,
      regionId: payload.regionId,
      level: payload.level
    });
    return { ok: true, event: backendContext.engagementCalendarEventDetailItem({ id: ref.id, data: () => payload }, { includeDocumentUploader: true }) };
  }

  return { createEngagementCalendarEvent };
}

module.exports = { createCompetitionHandlers_createEngagementCalendarEvent };
