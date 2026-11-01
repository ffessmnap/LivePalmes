// Existing operation bodies; live services arrive through explicit accessors.
function createNationalService_engagementLicenseControlSeason(backendContext) {
  function engagementLicenseControlSeason(value = "") {
    const match = backendContext.cleanText(value).match(/^(\d{4})-(\d{4})$/);
    if (!match || Number(match[2]) !== Number(match[1]) + 1) {
      throw new backendContext.HttpsError("invalid-argument", "Saison invalide. Format attendu : 2026-2027.");
    }
    const startYear = Number(match[1]);
    if (startYear < 2020 || startYear > 2199) {
      throw new backendContext.HttpsError("invalid-argument", "Saison hors plage autorisee.");
    }
    return {
      label: `${startYear}-${startYear + 1}`,
      startYear,
      endYear: startYear + 1,
      startDate: `${startYear}-09-01`,
      endDate: `${startYear + 1}-08-31`,
      requiredValidityDate: `${startYear + 1}-12-31`
    };
  }

  return { engagementLicenseControlSeason };
}

module.exports = { createNationalService_engagementLicenseControlSeason };
