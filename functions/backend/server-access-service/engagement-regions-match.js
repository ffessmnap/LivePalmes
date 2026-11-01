// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_engagementRegionsMatch(backendContext) {
  function engagementRegionsMatch(left, right) {
    const leftKey = (0, backendContext.local$normalizedEngagementRegionKey)(left);
    return Boolean(leftKey && leftKey === (0, backendContext.local$normalizedEngagementRegionKey)(right));
  }

  return { engagementRegionsMatch };
}

module.exports = { createAccessService_engagementRegionsMatch };
