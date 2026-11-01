// Existing operation bodies; live services arrive through explicit accessors.
function createClubPeopleService_cleanEngagementRegionIds(backendContext) {
  function cleanEngagementRegionIds(raw = [], excludedRegionId = "") {
    const values = Array.isArray(raw) ? raw : [raw];
    const excludedKey = backendContext.normalizedEngagementRegionKey(excludedRegionId);
    const seen = new Set();
    return values
      .map((value) => backendContext.cleanText(value).slice(0, 80))
      .filter(Boolean)
      .filter((regionId) => backendContext.normalizedEngagementRegionKey(regionId) !== excludedKey)
      .filter((regionId) => {
        const key = backendContext.normalizedEngagementRegionKey(regionId);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 30);
  }

  return { cleanEngagementRegionIds };
}

module.exports = { createClubPeopleService_cleanEngagementRegionIds };
