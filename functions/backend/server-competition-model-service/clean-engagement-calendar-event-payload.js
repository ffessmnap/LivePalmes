// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionModelService_cleanEngagementCalendarEventPayload(backendContext) {
  function cleanEngagementCalendarEventPayload(raw = {}, context = {}) {
    const eventType = backendContext.cleanPublicCalendarEventType(raw.eventType, "");
    const name = backendContext.cleanText(raw.name || raw.title).slice(0, 160);
    const date = (0, backendContext.local$cleanIsoDate)(raw.date);
    const endDate = (0, backendContext.local$cleanIsoDate)(raw.endDate) || date;
    const location = backendContext.cleanText(raw.location).slice(0, 160);
    const city = backendContext.cleanText(raw.city || raw.location).slice(0, 120);
    const level = backendContext.cleanPublicCalendarLevel(raw.level);
    const requestedRegionId = backendContext.cleanText(raw.regionId).slice(0, 80);
    const regionId = (0, backendContext.local$isNationalOnlyEngagementCompetitionLevel)(level) ? "" : (context.national ? requestedRegionId : context.regionId);
    if (!context.national && !context.region) {
      throw new backendContext.HttpsError("permission-denied", "Droit de gestion du calendrier requis.");
    }
    if (!context.national && (0, backendContext.local$isNationalOnlyEngagementCompetitionLevel)(level)) {
      throw new backendContext.HttpsError("permission-denied", "Un evenement national doit etre cree par le niveau national.");
    }
    if (!backendContext.PUBLIC_CALENDAR_EVENT_TYPES.has(eventType)) {
      throw new backendContext.HttpsError("invalid-argument", "Type d'evenement invalide.");
    }
    if (!name || !date || !city) {
      throw new backendContext.HttpsError("invalid-argument", "Nom, date et ville sont obligatoires.");
    }
    if (endDate < date) {
      throw new backendContext.HttpsError("invalid-argument", "La date de fin doit etre egale ou posterieure a la date de debut.");
    }
    if (!(0, backendContext.local$isNationalOnlyEngagementCompetitionLevel)(level) && !regionId) {
      throw new backendContext.HttpsError("invalid-argument", "Region obligatoire pour un evenement departemental ou regional.");
    }
    return {
      eventType,
      name,
      date,
      endDate,
      city,
      location,
      address: backendContext.cleanText(raw.address).slice(0, 300),
      organizer: backendContext.cleanText(raw.organizer).slice(0, 160),
      publicDescription: backendContext.cleanText(raw.publicDescription).slice(0, 3000),
      entryDeadlineAt: backendContext.cleanIsoDateTime(raw.entryDeadlineAt),
      registrationUrl: backendContext.cleanPublicCalendarUrl(raw.registrationUrl, 500),
      regionId,
      level,
      publicationStatus: "published",
      canceled: raw.canceled === true,
      programSessions: backendContext.cleanPublicCalendarProgram(raw.programSessions || raw.program || [])
    };
  }

  return { cleanEngagementCalendarEventPayload };
}

module.exports = { createCompetitionModelService_cleanEngagementCalendarEventPayload };
