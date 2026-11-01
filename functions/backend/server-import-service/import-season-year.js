// Existing operation bodies; live services arrive through explicit accessors.
function createImportService_importSeasonYear(backendContext) {
  function importSeasonYear(dateIso) {
    const date = new Date(`${dateIso}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return null;
    return date.getUTCMonth() >= 8 ? date.getUTCFullYear() + 1 : date.getUTCFullYear();
  }

  return { importSeasonYear };
}

module.exports = { createImportService_importSeasonYear };
