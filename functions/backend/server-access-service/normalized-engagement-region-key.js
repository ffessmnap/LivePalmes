// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_normalizedEngagementRegionKey(backendContext) {
  function normalizedEngagementRegionKey(value) {
    const cleanValue = backendContext.cleanText(value);
    return backendContext.cleanText(backendContext.CLUB_REFERENCE_REGION_LABELS[cleanValue] || cleanValue)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/gi, "")
      .toLocaleLowerCase("fr");
  }

  return { normalizedEngagementRegionKey };
}

module.exports = { createAccessService_normalizedEngagementRegionKey };
