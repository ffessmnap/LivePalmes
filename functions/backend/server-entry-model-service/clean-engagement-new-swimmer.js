// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_cleanEngagementNewSwimmer(backendContext) {
  function cleanEngagementNewSwimmer(raw = {}, context = {}) {
    const firstName = backendContext.cleanText(raw.firstName).slice(0, 80);
    const lastName = backendContext.cleanText(raw.lastName).slice(0, 80);
    const birthDate = backendContext.cleanIsoDate(raw.birthDate);
    const sex = ["F", "M"].includes(backendContext.cleanText(raw.sex).toUpperCase()) ? backendContext.cleanText(raw.sex).toUpperCase() : "";
    const licenseNumber = backendContext.cleanText(raw.licenseNumber).toUpperCase().slice(0, 60);
    const licenseSeason = backendContext.currentEngagementSeasonInfo();
    if (!firstName || !lastName || !birthDate || !sex || !licenseNumber) {
      throw new backendContext.HttpsError("invalid-argument", "Prenom, nom, date de naissance, sexe et licence sont obligatoires.");
    }
    if (!backendContext.ENGAGEMENT_SWIMMER_LICENSE_PATTERN.test(licenseNumber)) {
      throw new backendContext.HttpsError("invalid-argument", "Le numero de licence doit respecter le format A-12-34567.");
    }
    return {
      firstName,
      lastName,
      name: [firstName, lastName].join(" "),
      birthDate,
      sex,
      licenseNumber,
      licenseVerificationStatus: "pending",
      licenseSeasonLabel: licenseSeason.label,
      licenseSeasonStatus: "to_check",
      identityKey: (0, backendContext.local$engagementSwimmerIdentityKey)(firstName, lastName, birthDate),
      clubId: context.clubId,
      clubName: context.clubName,
      regionId: context.regionId,
      source: "engagement",
      active: true
    };
  }

  return { cleanEngagementNewSwimmer };
}

module.exports = { createEntryModelService_cleanEngagementNewSwimmer };
