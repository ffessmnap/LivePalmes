// Existing operation bodies; live services arrive through explicit accessors.
function createClubPeopleService_cleanIsoDateTime(backendContext) {
  function cleanIsoDateTime(value) {
    const text = backendContext.cleanText(value).slice(0, 40);
    if (!text) return "";
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }

  return { cleanIsoDateTime };
}

module.exports = { createClubPeopleService_cleanIsoDateTime };
