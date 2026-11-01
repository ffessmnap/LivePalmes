// Existing operation bodies; live services arrive through explicit accessors.
function createImportService_currentEngagementCategoryFromBirthDate(backendContext) {
  function currentEngagementCategoryFromBirthDate(birthDate) {
    return (0, backendContext.local$ageCategoryFromDates)(new Date().toISOString().slice(0, 10), birthDate);
  }

  return { currentEngagementCategoryFromBirthDate };
}

module.exports = { createImportService_currentEngagementCategoryFromBirthDate };
