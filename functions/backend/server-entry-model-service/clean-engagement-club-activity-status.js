// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_cleanEngagementClubActivityStatus(backendContext) {
  function cleanEngagementClubActivityStatus(value = "", fallback = "active") {
    const status = backendContext.cleanText(value).toLowerCase();
    return ["active", "inactive"].includes(status) ? status : fallback;
  }

  function engagementClubRosterSwimmerItem(swimmer = {}) {
    const firstName = backendContext.cleanText(swimmer.firstName).slice(0, 80);
    const lastName = backendContext.cleanText(swimmer.lastName).slice(0, 80);
    const name = backendContext.cleanText(swimmer.name).slice(0, 160) || [firstName, lastName].filter(Boolean).join(" ");
    const source = backendContext.cleanText(swimmer.source || "performances").slice(0, 40) || "performances";
    const swimmerIndexId = backendContext.cleanText(swimmer.swimmerIndexId || swimmer.id).slice(0, 80);
    const licenseSeason = backendContext.engagementLicenseSeasonState(swimmer);
    const licenseSeasons = Object.fromEntries(Object.entries(swimmer.licenseSeasons && typeof swimmer.licenseSeasons === "object" ? swimmer.licenseSeasons : {})
      .filter(([label]) => /^\d{4}-\d{4}$/.test(label))
      .slice(-10)
      .map(([label, record]) => [label, {
        status: backendContext.cleanEngagementLicenseSeasonStatus(record?.status, "to_check"),
        updatedAt: backendContext.cleanText(record?.updatedAt).slice(0, 40),
        validatedAt: backendContext.cleanText(record?.validatedAt).slice(0, 40),
        updatedBy: backendContext.cleanText(record?.updatedBy).slice(0, 128),
        source: backendContext.cleanText(record?.source).slice(0, 40),
        federalValidityEndDate: backendContext.cleanIsoDate(record?.federalValidityEndDate)
      }]));
    return backendContext.cleanFirestoreValue({
      id: swimmerIndexId,
      swimmerIndexId,
      source,
      swimmerId: backendContext.cleanText(swimmer.swimmerId || (source === "performances" ? swimmer.id : "")).slice(0, 80),
      identityKey: backendContext.cleanText(swimmer.identityKey || swimmer.indexKey).slice(0, 180),
      firstName,
      lastName,
      name,
      birthDate: backendContext.cleanIsoDate(swimmer.birthDate),
      sex: backendContext.cleanText(swimmer.sex).slice(0, 20),
      category: backendContext.cleanText(swimmer.category).slice(0, 20),
      clubId: backendContext.cleanText(swimmer.clubId).slice(0, 40),
      club: backendContext.cleanText(swimmer.club).slice(0, 60),
      clubName: backendContext.cleanText(swimmer.clubName).slice(0, 140),
      licenseNumber: backendContext.cleanText(swimmer.licenseNumber).slice(0, 60),
      licenseVerificationStatus: backendContext.cleanEngagementLicenseVerificationStatus(swimmer.licenseVerificationStatus || swimmer.verificationStatus, "pending"),
      licenseSeasonLabel: licenseSeason.label,
      licenseSeasonStatus: licenseSeason.status,
      licenseSeasons,
      latestDate: backendContext.cleanIsoDate(swimmer.latestDate),
      performanceCount: Math.max(0, Math.trunc(Number(swimmer.performanceCount) || 0)),
      active: swimmer.active !== false,
      clubActivityStatus: cleanEngagementClubActivityStatus(swimmer.clubActivityStatus, ""),
      clubActivityStatusSource: backendContext.cleanText(swimmer.clubActivityStatusSource).slice(0, 40),
      clubActivityStatusUpdatedAt: backendContext.cleanText(swimmer.clubActivityStatusUpdatedAt).slice(0, 40),
      clubActivityStatusUpdatedBy: backendContext.cleanText(swimmer.clubActivityStatusUpdatedBy).slice(0, 80),
      updatedAt: backendContext.cleanText(swimmer.updatedAt).slice(0, 40),
      changeRequestStatus: backendContext.cleanText(swimmer.changeRequestStatus).slice(0, 40),
      changeRequestId: backendContext.cleanText(swimmer.changeRequestId).slice(0, 80),
      changeRequestedAt: backendContext.cleanText(swimmer.changeRequestedAt).slice(0, 40)
    });
  }

  return { cleanEngagementClubActivityStatus, engagementClubRosterSwimmerItem };
}

module.exports = { createEntryModelService_cleanEngagementClubActivityStatus };
