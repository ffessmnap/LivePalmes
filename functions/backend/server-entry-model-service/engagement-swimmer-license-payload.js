// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_engagementSwimmerLicensePayload(backendContext) {
  function engagementSwimmerLicensePayload(swimmer = {}, context = {}, source = {}) {
    const collectedAt = backendContext.cleanText(source.collectedAt).slice(0, 40) || new Date().toISOString();
    const season = backendContext.currentEngagementSeasonInfo(new Date(collectedAt));
    const verificationStatus = backendContext.cleanEngagementLicenseVerificationStatus(swimmer.licenseVerificationStatus || swimmer.verificationStatus, "pending");
    const seasonStatus = backendContext.cleanEngagementLicenseSeasonStatus(swimmer.licenseSeasonStatus, "to_check");
    const sourceType = backendContext.cleanText(source.type || "engagement").slice(0, 40) || "engagement";
    return backendContext.cleanFirestoreValue({
      swimmerIndexId: backendContext.cleanText(swimmer.swimmerIndexId || swimmer.id).slice(0, 80),
      swimmerId: backendContext.cleanText(swimmer.swimmerId).slice(0, 80),
      identityKey: backendContext.cleanText(swimmer.identityKey).slice(0, 180),
      firstName: backendContext.cleanText(swimmer.firstName).slice(0, 80),
      lastName: backendContext.cleanText(swimmer.lastName).slice(0, 80),
      name: backendContext.cleanText(swimmer.name).slice(0, 160),
      birthDate: backendContext.cleanIsoDate(swimmer.birthDate),
      sex: backendContext.cleanText(swimmer.sex).slice(0, 20),
      clubId: backendContext.cleanText(context.clubId || swimmer.clubId).slice(0, 40),
      clubName: backendContext.cleanText(context.clubName || swimmer.clubName).slice(0, 140),
      licenseNumber: backendContext.cleanText(swimmer.licenseNumber).slice(0, 60),
      verificationStatus,
      verificationSource: backendContext.cleanText(source.verificationSource || (sourceType === "admin_import" ? "admin_import" : "club")).slice(0, 40),
      licenseSeasonLabel: season.label,
      licenseSeasonStatus: seasonStatus,
      licenseSeasons: {
        [season.label]: {
          status: seasonStatus,
          updatedAt: collectedAt,
          updatedBy: backendContext.cleanText(context.uid).slice(0, 128),
          source: sourceType
        }
      },
      source: {
        type: sourceType,
        competitionId: backendContext.cleanText(source.competitionId).slice(0, 128),
        clubId: backendContext.cleanText(context.clubId).slice(0, 40),
        uid: backendContext.cleanText(context.uid).slice(0, 128),
        collectedAt
      }
    });
  }

  return { engagementSwimmerLicensePayload };
}

module.exports = { createEntryModelService_engagementSwimmerLicensePayload };
