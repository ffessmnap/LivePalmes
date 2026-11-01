// Existing operation bodies; live services arrive through explicit accessors.
function createDtnService_normalizePerformanceSearchText(backendContext) {
  function normalizePerformanceSearchText(value) {
    return backendContext.cleanText(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9]+/g, " ")
      .toUpperCase()
      .trim();
  }

  return { normalizePerformanceSearchText };
}

module.exports = { createDtnService_normalizePerformanceSearchText };
