// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_engagementNewSwimmerItem(backendContext) {
  function engagementNewSwimmerItem(doc) {
    const data = doc.data() || {};
    const firstName = backendContext.cleanText(data.firstName).slice(0, 80);
    const lastName = backendContext.cleanText(data.lastName).slice(0, 80);
    const name = backendContext.cleanText(data.name).slice(0, 160) || [firstName, lastName].filter(Boolean).join(" ");
    const alerts = Array.isArray(data.alerts) ? data.alerts : [];
    const licenseSeason = backendContext.engagementLicenseSeasonState(data);
    return backendContext.cleanFirestoreValue({
      id: doc.id,
      swimmerIndexId: doc.id,
      source: "engagement",
      swimmerId: backendContext.cleanText(data.swimmerId).slice(0, 80),
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
      performanceCount: 0,
      alertCount: alerts.length,
      alerts,
      alertValidationStatus: backendContext.cleanText(data.alertValidationStatus).slice(0, 60),
      active: data.active !== false,
      status: backendContext.cleanText(data.status || (data.active === false ? "inactive" : "active")).slice(0, 40),
      mergedIntoId: backendContext.cleanText(data.mergedIntoId).slice(0, 80),
      mergedIntoSource: backendContext.cleanText(data.mergedIntoSource).slice(0, 40),
      mergedIntoName: backendContext.cleanText(data.mergedIntoName).slice(0, 160),
      mergedAt: backendContext.cleanText(data.mergedAt).slice(0, 40),
      mergedBy: backendContext.cleanText(data.mergedBy).slice(0, 80),
      createdAt: backendContext.cleanText(data.createdAt).slice(0, 40),
      updatedAt: backendContext.cleanText(data.updatedAt).slice(0, 40),
      disabledAt: backendContext.cleanText(data.disabledAt).slice(0, 40),
      disabledBy: backendContext.cleanText(data.disabledBy).slice(0, 80)
    });
  }

  return { engagementNewSwimmerItem };
}

module.exports = { createEntryModelService_engagementNewSwimmerItem };
