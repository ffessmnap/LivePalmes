// Existing operation bodies; live services arrive through explicit accessors.
function createImportService_normalizeCourseCode(backendContext) {
  function normalizeCourseCode(value) {
    return backendContext.cleanText(value).replace(/\s+/g, "").toUpperCase();
  }

  return { normalizeCourseCode };
}

module.exports = { createImportService_normalizeCourseCode };
