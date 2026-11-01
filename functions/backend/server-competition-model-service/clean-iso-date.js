// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionModelService_cleanIsoDate(backendContext) {
  function cleanIsoDate(value) {
    const text = backendContext.cleanText(value).slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
  }

  return { cleanIsoDate };
}

module.exports = { createCompetitionModelService_cleanIsoDate };
