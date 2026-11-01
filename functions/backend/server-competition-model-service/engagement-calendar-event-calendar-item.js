// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionModelService_engagementCalendarEventCalendarItem(backendContext) {
  function engagementCalendarEventCalendarItem(data = {}, id = "") {
    return {
      id: backendContext.cleanText(id || data.id).slice(0, 128),
      sourceType: "calendarEvent",
      eventType: backendContext.cleanPublicCalendarEventType(data.eventType),
      competitionType: backendContext.cleanPublicCalendarEventType(data.eventType),
      name: backendContext.cleanText(data.name || data.title).slice(0, 160),
      date: (0, backendContext.local$cleanIsoDate)(data.date),
      endDate: (0, backendContext.local$cleanIsoDate)(data.endDate) || (0, backendContext.local$cleanIsoDate)(data.date),
      city: backendContext.cleanText(data.city || data.location).slice(0, 120),
      location: backendContext.cleanText(data.location).slice(0, 160),
      address: backendContext.cleanText(data.address).slice(0, 300),
      organizer: backendContext.cleanText(data.organizer).slice(0, 160),
      publicDescription: backendContext.cleanText(data.publicDescription).slice(0, 3000),
      entryDeadlineAt: backendContext.cleanIsoDateTime(data.entryDeadlineAt),
      registrationUrl: backendContext.cleanPublicCalendarUrl(data.registrationUrl, 500),
      regionId: backendContext.cleanText(data.regionId).slice(0, 80),
      level: backendContext.cleanPublicCalendarLevel(data.level),
      publicationStatus: backendContext.cleanPublicCalendarPublicationStatus(data.publicationStatus),
      canceled: data.canceled === true,
      resultsPublishedAt: backendContext.cleanText(data.resultsPublishedAt).slice(0, 40),
      resultsUrl: backendContext.cleanText(data.resultsUrl).slice(0, 900),
      resultsPdfUrl: backendContext.cleanText(data.resultsPdfUrl).slice(0, 900),
      documentCount: backendContext.cleanCompetitionDocuments(data.clubDocuments || []).length,
      entryStatus: "",
      updatedAt: backendContext.cleanText(data.updatedAt).slice(0, 40)
    };
  }

  return { engagementCalendarEventCalendarItem };
}

module.exports = { createCompetitionModelService_engagementCalendarEventCalendarItem };
