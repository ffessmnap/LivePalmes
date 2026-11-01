// Existing operation bodies; live services arrive through explicit accessors.
function createNationalService_cleanEngagementSwimmerIdentityCorrection(backendContext) {
  function cleanEngagementSwimmerIdentityCorrection(raw = {}, current = {}) {
    const firstName = backendContext.cleanText(raw.firstName ?? current.firstName).slice(0, 80);
    const lastName = backendContext.cleanText(raw.lastName ?? current.lastName).slice(0, 80);
    const birthDate = backendContext.cleanIsoDate(raw.birthDate ?? current.birthDate);
    const sex = backendContext.cleanText(raw.sex ?? current.sex).toUpperCase().slice(0, 1);
    const licenseNumber = backendContext.cleanText(raw.licenseNumber ?? current.licenseNumber).toUpperCase().slice(0, 60);
    if (!firstName || !lastName || !birthDate || !["F", "M"].includes(sex)) {
      throw new backendContext.HttpsError("invalid-argument", "Nom, prenom, date de naissance et sexe sont obligatoires.");
    }
    if (licenseNumber && !backendContext.ENGAGEMENT_SWIMMER_LICENSE_PATTERN.test(licenseNumber)) {
      throw new backendContext.HttpsError("invalid-argument", "Le numero de licence doit respecter le format A-12-34567.");
    }
    const correction = {
      firstName,
      lastName,
      name: [firstName, lastName].join(" "),
      birthDate,
      sex,
      licenseNumber,
      identityKey: backendContext.engagementSwimmerIdentityKey(firstName, lastName, birthDate)
    };
    const changed = ["firstName", "lastName", "birthDate", "sex", "licenseNumber"]
      .some((field) => backendContext.cleanText(correction[field]) !== backendContext.cleanText(current[field]));
    if (!changed) {
      throw new backendContext.HttpsError("invalid-argument", "Aucune modification n'a ete saisie.");
    }
    return correction;
  }

  return { cleanEngagementSwimmerIdentityCorrection };
}

module.exports = { createNationalService_cleanEngagementSwimmerIdentityCorrection };
