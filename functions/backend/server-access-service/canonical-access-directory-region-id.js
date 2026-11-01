// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_canonicalAccessDirectoryRegionId(backendContext) {
  function canonicalAccessDirectoryRegionId(value) {
    const cleanValue = backendContext.cleanText(value).slice(0, 80);
    if (!cleanValue) return "";
    if (backendContext.CLUB_REFERENCE_REGION_LABELS[cleanValue]) return backendContext.CLUB_REFERENCE_REGION_LABELS[cleanValue];
    const normalizedValue = (0, backendContext.local$normalizedEngagementRegionKey)(cleanValue);
    const knownRegion = Object.values(backendContext.CLUB_REFERENCE_REGION_LABELS)
      .find((label) => (0, backendContext.local$normalizedEngagementRegionKey)(label) === normalizedValue);
    return knownRegion || cleanValue;
  }

  return { canonicalAccessDirectoryRegionId };
}

module.exports = { createAccessService_canonicalAccessDirectoryRegionId };
