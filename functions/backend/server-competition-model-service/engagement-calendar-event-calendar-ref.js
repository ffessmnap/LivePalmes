// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionModelService_engagementCalendarEventCalendarRef(backendContext) {
  function engagementCalendarEventCalendarRef(db, endYear) {
    return db.collection(backendContext.ENGAGEMENT_CALENDAR_EVENT_CALENDARS_COLLECTION).doc(String(Math.trunc(Number(endYear) || 0)));
  }

  function engagementCalendarEventItemsFromData(data = {}) {
    const events = data.events && typeof data.events === "object" ? data.events : {};
    return Object.values(events)
      .map((event) => (0, backendContext.local$engagementCalendarEventCalendarItem)(event, event.id))
      .filter((event) => event.id && event.date);
  }

  return { engagementCalendarEventCalendarRef, engagementCalendarEventItemsFromData };
}

module.exports = { createCompetitionModelService_engagementCalendarEventCalendarRef };
