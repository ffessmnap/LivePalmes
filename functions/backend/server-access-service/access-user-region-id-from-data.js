// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_accessUserRegionIdFromData(backendContext) {
  function accessUserRegionIdFromData(data = {}) {
    const regionScope = (0, backendContext.local$normalizedAccessScope)(data.accessScopes?.["engagements.region.manage"]);
    const directRegionId = regionScope.scopeId || backendContext.cleanText(data.regionId).slice(0, 80);
    if (directRegionId) return (0, backendContext.local$canonicalAccessDirectoryRegionId)(directRegionId);
    const clubScope = (0, backendContext.local$normalizedAccessScope)(data.accessScopes?.["engagements.club.manage"]);
    const clubId = clubScope.scopeId || backendContext.cleanText(data.clubId).slice(0, 40);
    return (0, backendContext.local$canonicalAccessDirectoryRegionId)(backendContext.CLUB_REFERENCE_BY_ID.get(clubId)?.regionId);
  }

  return { accessUserRegionIdFromData };
}

module.exports = { createAccessService_accessUserRegionIdFromData };
