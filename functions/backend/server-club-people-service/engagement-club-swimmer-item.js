// Existing operation bodies; live services arrive through explicit accessors.
function createClubPeopleService_engagementClubSwimmerItem(backendContext) {
  function engagementClubSwimmerItem(doc) {
    const data = doc.data() || {};
    const firstName = backendContext.cleanText(data.firstName).slice(0, 80);
    const lastName = backendContext.cleanText(data.lastName).slice(0, 80);
    const name = backendContext.cleanText(data.name).slice(0, 160) || [firstName, lastName].filter(Boolean).join(" ");
    const licenseSeason = backendContext.engagementLicenseSeasonState(data);
    return backendContext.cleanFirestoreValue({
      id: doc.id,
      swimmerIndexId: doc.id,
      source: "performances",
      swimmerId: backendContext.cleanText(data.id || data.swimmerId).slice(0, 80),
      identityKey: backendContext.cleanText(data.identityKey).slice(0, 180),
      firstName,
      lastName,
      name,
      birthDate: backendContext.cleanIsoDate(data.birthDate),
      sex: backendContext.cleanText(data.sex).slice(0, 20),
      category: backendContext.currentEngagementCategoryFromBirthDate(data.birthDate),
      clubId: backendContext.cleanText(data.clubId).slice(0, 40),
      club: backendContext.cleanText(data.club).slice(0, 60),
      clubName: backendContext.cleanText(data.clubName).slice(0, 140),
      licenseNumber: backendContext.cleanText(data.licenseNumber).slice(0, 60),
      licenseVerificationStatus: backendContext.cleanEngagementLicenseVerificationStatus(data.licenseVerificationStatus || data.verificationStatus, "pending"),
      licenseSeasonLabel: licenseSeason.label,
      licenseSeasonStatus: licenseSeason.status,
      latestDate: backendContext.cleanIsoDate(data.latestDate),
      performanceCount: Math.max(0, Math.trunc(Number(data.performanceCount) || 0)),
      active: data.active !== false,
      status: backendContext.cleanText(data.status || (data.active === false ? "inactive" : "active")).slice(0, 40),
      mergedIntoId: backendContext.cleanText(data.mergedIntoId).slice(0, 80),
      mergedIntoSource: backendContext.cleanText(data.mergedIntoSource).slice(0, 40),
      mergedIntoName: backendContext.cleanText(data.mergedIntoName).slice(0, 160),
      sourceIds: Array.isArray(data.sourceIds) ? data.sourceIds.map((id) => backendContext.cleanText(id).slice(0, 80)).filter(Boolean).slice(0, 20) : []
    });
  }

  return { engagementClubSwimmerItem };
}

module.exports = { createClubPeopleService_engagementClubSwimmerItem };
