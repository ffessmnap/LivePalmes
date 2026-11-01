// Existing operation bodies; live services arrive through explicit accessors.
function createImportService_performanceCategoryFromRow(backendContext) {
  function performanceCategoryFromRow(row = {}, dateOverride = "") {
    const date = backendContext.cleanText(dateOverride || row.date || row.metadata?.date);
    return (0, backendContext.local$ageCategoryFromDates)(date, row.birthDate) ||
      backendContext.cleanText(row.category) ||
      (0, backendContext.local$fallbackCategoryFromSource)(row.categoryCode || row.categoryLabel || row.importedCategoryCode || row.classificationCategory);
  }

  return { performanceCategoryFromRow };
}

module.exports = { createImportService_performanceCategoryFromRow };
