// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_engagementSwimmerLicenseDataItem(backendContext) {
  function engagementSwimmerLicenseDataItem(data = {}, id = "") {
    const licenseSeason = backendContext.engagementLicenseSeasonState(data);
    return {
      id,
      swimmerIndexId: backendContext.cleanText(data.swimmerIndexId).slice(0, 80),
      swimmerId: backendContext.cleanText(data.swimmerId).slice(0, 80),
      identityKey: backendContext.cleanText(data.identityKey).slice(0, 180),
      licenseNumber: backendContext.cleanText(data.licenseNumber).slice(0, 60),
      verificationStatus: backendContext.cleanEngagementLicenseVerificationStatus(data.verificationStatus, "pending"),
      licenseSeasonLabel: licenseSeason.label,
      licenseSeasonStatus: licenseSeason.status,
      licenseSeasons: data.licenseSeasons && typeof data.licenseSeasons === "object" ? data.licenseSeasons : {},
      updatedAt: backendContext.cleanText(data.updatedAt).slice(0, 40)
    };
  }

  function engagementSwimmerLicenseItem(doc) {
    return engagementSwimmerLicenseDataItem(doc.data() || {}, doc.id);
  }

  return { engagementSwimmerLicenseDataItem, engagementSwimmerLicenseItem };
}

module.exports = { createEntryModelService_engagementSwimmerLicenseDataItem };
