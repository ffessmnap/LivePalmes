// Existing operation bodies; live services arrive through explicit accessors.
function createClubPeopleService_engagementClubSwimmerMatchKeys(backendContext) {
  function sortEngagementClubSwimmers(swimmers = []) {
    return swimmers.sort((left, right) =>
      backendContext.cleanText(right.latestDate).localeCompare(backendContext.cleanText(left.latestDate)) ||
      backendContext.cleanText(left.lastName).localeCompare(backendContext.cleanText(right.lastName), "fr") ||
      backendContext.cleanText(left.firstName).localeCompare(backendContext.cleanText(right.firstName), "fr")
    );
  }

  function engagementClubSwimmerMatchKeys(swimmer = {}) {
    const swimmerId = backendContext.cleanText(swimmer.swimmerId);
    const licenseKey = backendContext.engagementSwimmerLicenseNumberKey(swimmer.licenseNumber);
    const identityKey = backendContext.normalizePerformanceSearchText(swimmer.identityKey || [swimmer.lastName, swimmer.firstName, swimmer.birthDate].filter(Boolean).join("|"));
    const swimmerIndexId = backendContext.cleanText(swimmer.swimmerIndexId || swimmer.id);
    const source = backendContext.cleanText(swimmer.source || "performances");
    return Array.from(new Set((swimmerId ? [
      `swimmer:${swimmerId}`,
      swimmerIndexId ? `index:${source}:${swimmerIndexId}` : ""
    ] : [
      licenseKey ? `license:${licenseKey}` : "",
      identityKey ? `identity:${identityKey}` : "",
      swimmerIndexId ? `index:${source}:${swimmerIndexId}` : ""
    ]).filter(Boolean)));
  }

  function engagementClubSwimmerSourceRank(source = "") {
    return {
      performances: 3,
      engagement: 2,
      reference: 1
    }[backendContext.cleanText(source)] || 0;
  }

  function mergeEngagementClubSwimmerItems(left = {}, right = {}) {
    const rightPreferred = engagementClubSwimmerSourceRank(right.source) > engagementClubSwimmerSourceRank(left.source);
    const preferred = rightPreferred ? right : left;
    const fallback = rightPreferred ? left : right;
    const merged = { ...fallback, ...preferred };
    [
      "id", "swimmerIndexId", "swimmerId", "identityKey", "firstName", "lastName", "name", "birthDate", "sex", "category",
      "clubId", "club", "clubName", "licenseNumber", "licenseVerificationStatus", "licenseSeasonLabel", "licenseSeasonStatus",
      "changeRequestStatus", "changeRequestId", "changeRequestedAt", "clubActivityStatus", "clubActivityStatusSource",
      "clubActivityStatusUpdatedAt", "clubActivityStatusUpdatedBy"
    ].forEach((key) => {
      if (!backendContext.cleanText(merged[key]) && backendContext.cleanText(fallback[key])) merged[key] = fallback[key];
    });
    merged.performanceCount = Math.max(Number(left.performanceCount || 0), Number(right.performanceCount || 0));
    merged.latestDate = [backendContext.cleanIsoDate(left.latestDate), backendContext.cleanIsoDate(right.latestDate)].filter(Boolean).sort().pop() || "";
    merged.updatedAt = [backendContext.cleanText(left.updatedAt), backendContext.cleanText(right.updatedAt)].filter(Boolean).sort().pop() || "";
    merged.active = left.active !== false || right.active !== false;
    return backendContext.engagementClubRosterSwimmerItem(merged);
  }

  function uniqueEngagementClubSwimmers(swimmers = [], limit = 800) {
    const groups = [];
    swimmers.filter((swimmer) => swimmer.swimmerIndexId).forEach((swimmer) => {
      const keys = engagementClubSwimmerMatchKeys(swimmer);
      const matchingIndexes = groups
        .map((group, index) => group.keys.some((key) => keys.includes(key)) ? index : -1)
        .filter((index) => index >= 0);
      if (!matchingIndexes.length) {
        groups.push({ item: backendContext.engagementClubRosterSwimmerItem(swimmer), keys });
        return;
      }
      const targetIndex = matchingIndexes[0];
      const target = groups[targetIndex];
      target.item = mergeEngagementClubSwimmerItems(target.item, swimmer);
      target.keys = Array.from(new Set([...target.keys, ...keys, ...engagementClubSwimmerMatchKeys(target.item)]));
      matchingIndexes.slice(1).reverse().forEach((index) => {
        target.item = mergeEngagementClubSwimmerItems(target.item, groups[index].item);
        target.keys = Array.from(new Set([...target.keys, ...groups[index].keys, ...engagementClubSwimmerMatchKeys(target.item)]));
        groups.splice(index, 1);
      });
    });
    return groups.map((group) => group.item).slice(0, limit);
  }

  return { sortEngagementClubSwimmers, engagementClubSwimmerMatchKeys, engagementClubSwimmerSourceRank, mergeEngagementClubSwimmerItems, uniqueEngagementClubSwimmers };
}

module.exports = { createClubPeopleService_engagementClubSwimmerMatchKeys };
