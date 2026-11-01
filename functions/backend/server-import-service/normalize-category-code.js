// Existing operation bodies; live services arrive through explicit accessors.
function createImportService_normalizeCategoryCode(backendContext) {
  function normalizeCategoryCode(value) {
    return backendContext.cleanText(value).replace(/\s+/g, "").toUpperCase();
  }

  return { normalizeCategoryCode };
}

module.exports = { createImportService_normalizeCategoryCode };
