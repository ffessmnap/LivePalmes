// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_cleanEngagementEntrySwimmer(backendContext) {
  function cleanEngagementEntrySwimmer(raw = {}) {
    const licenseSeason = backendContext.engagementLicenseSeasonState(raw);
    return {
      swimmerIndexId: backendContext.cleanText(raw.swimmerIndexId).slice(0, 80),
      source: backendContext.cleanText(raw.source || "performances").slice(0, 40),
      swimmerId: backendContext.cleanText(raw.swimmerId).slice(0, 80),
      identityKey: backendContext.cleanText(raw.identityKey).slice(0, 180),
      firstName: backendContext.cleanText(raw.firstName).slice(0, 80),
      lastName: backendContext.cleanText(raw.lastName).slice(0, 80),
      name: backendContext.cleanText(raw.name).slice(0, 160),
      birthDate: backendContext.cleanIsoDate(raw.birthDate),
      sex: backendContext.cleanText(raw.sex).slice(0, 20),
      clubId: backendContext.cleanText(raw.clubId).slice(0, 40),
      club: backendContext.cleanText(raw.club).slice(0, 60),
      clubName: backendContext.cleanText(raw.clubName).slice(0, 140),
      licenseNumber: backendContext.cleanText(raw.licenseNumber).slice(0, 60),
      licenseVerificationStatus: backendContext.cleanEngagementLicenseVerificationStatus(raw.licenseVerificationStatus || raw.verificationStatus, "pending"),
      licenseSeasonLabel: backendContext.cleanText(raw.licenseSeasonLabel || licenseSeason.label).slice(0, 20),
      licenseSeasonStatus: backendContext.cleanEngagementLicenseSeasonStatus(raw.licenseSeasonStatus || licenseSeason.status, "to_check"),
      licenseLocked: raw.licenseLocked === true || raw.licenseNumberLocked === true,
      latestDate: backendContext.cleanIsoDate(raw.latestDate),
      performanceCount: Math.max(0, Math.trunc(Number(raw.performanceCount) || 0)),
      individualEntries: (0, backendContext.local$cleanEngagementEntryIndividualEntries)(raw.individualEntries || raw.individualEventCodes || [])
    };
  }

  return { cleanEngagementEntrySwimmer };
}

module.exports = { createEntryModelService_cleanEngagementEntrySwimmer };
