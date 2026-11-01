// Existing operation bodies; live services arrive through explicit accessors.
function createImportService_cleanEngagementLicenseSeasonStatus(backendContext) {
  function cleanEngagementLicenseVerificationStatus(value, fallback = "pending") {
    const status = backendContext.cleanText(value).toLowerCase();
    return backendContext.ENGAGEMENT_LICENSE_VERIFICATION_STATUSES.has(status) ? status : fallback;
  }

  function cleanEngagementLicenseSeasonStatus(value, fallback = "to_check") {
    const status = backendContext.cleanText(value).toLowerCase();
    return backendContext.ENGAGEMENT_LICENSE_SEASON_STATUSES.has(status) ? status : fallback;
  }

  function engagementLicenseSeasonState(data = {}, date = new Date()) {
    const season = (0, backendContext.local$currentEngagementSeasonInfo)(date);
    const seasons = data.licenseSeasons && typeof data.licenseSeasons === "object" ? data.licenseSeasons : {};
    const stored = seasons[season.label] && typeof seasons[season.label] === "object" ? seasons[season.label] : {};
    const legacyStatus = backendContext.cleanText(data.licenseSeasonLabel) === season.label ? data.licenseSeasonStatus : "";
    return {
      startYear: season.startYear,
      endYear: season.endYear,
      label: season.label,
      status: cleanEngagementLicenseSeasonStatus(stored.status || legacyStatus, "to_check")
    };
  }

  return { cleanEngagementLicenseVerificationStatus, cleanEngagementLicenseSeasonStatus, engagementLicenseSeasonState };
}

module.exports = { createImportService_cleanEngagementLicenseSeasonStatus };
