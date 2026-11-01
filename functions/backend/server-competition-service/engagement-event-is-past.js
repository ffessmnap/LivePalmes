// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionService_engagementEventIsPast(backendContext) {
  function engagementParisIsoDate(nowMs = Date.now()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Paris",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date(nowMs));
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function engagementEventIsPast(event = {}, nowMs = Date.now()) {
    const endDate = backendContext.cleanIsoDate(event.endDate) || backendContext.cleanIsoDate(event.date);
    return Boolean(endDate && endDate < engagementParisIsoDate(nowMs));
  }

  return { engagementParisIsoDate, engagementEventIsPast };
}

module.exports = { createCompetitionService_engagementEventIsPast };
