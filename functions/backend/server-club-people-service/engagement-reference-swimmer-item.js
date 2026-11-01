// Existing operation bodies; live services arrive through explicit accessors.
function createClubPeopleService_engagementReferenceSwimmerItem(backendContext) {
  function engagementReferenceSwimmerItem(raw = {}) {
    const swimmerId = backendContext.cleanText(raw.id || raw.swimmerId).slice(0, 80);
    const firstName = backendContext.cleanText(raw.firstName).slice(0, 80);
    const lastName = backendContext.cleanText(raw.lastName).slice(0, 80);
    const name = backendContext.cleanText(raw.name).slice(0, 160) || [firstName, lastName].filter(Boolean).join(" ");
    const birthDate = backendContext.cleanIsoDate(raw.birthDate);
    const licenseSeason = backendContext.engagementLicenseSeasonState(raw);
    return backendContext.cleanFirestoreValue({
      id: swimmerId,
      swimmerIndexId: swimmerId,
      source: "reference",
      swimmerId,
      identityKey: backendContext.cleanText(raw.identityKey).slice(0, 180) || backendContext.engagementSwimmerIdentityKey(firstName, lastName, birthDate),
      firstName,
      lastName,
      name,
      birthDate,
      sex: backendContext.cleanText(raw.sex).slice(0, 20),
      category: backendContext.currentEngagementCategoryFromBirthDate(birthDate),
      clubId: backendContext.cleanText(raw.clubId).slice(0, 40),
      club: backendContext.cleanText(raw.club).slice(0, 60),
      clubName: backendContext.cleanText(raw.clubName).slice(0, 140),
      licenseNumber: backendContext.cleanText(raw.licenseNumber).slice(0, 60),
      licenseVerificationStatus: backendContext.cleanEngagementLicenseVerificationStatus(raw.licenseVerificationStatus || raw.verificationStatus, "pending"),
      licenseSeasonLabel: licenseSeason.label,
      licenseSeasonStatus: licenseSeason.status,
      latestDate: backendContext.cleanIsoDate(raw.latestDate),
      performanceCount: Math.max(0, Math.trunc(Number(raw.performanceCount) || 0)),
      sourceIds: swimmerId ? [swimmerId] : []
    });
  }

  return { engagementReferenceSwimmerItem };
}

module.exports = { createClubPeopleService_engagementReferenceSwimmerItem };
