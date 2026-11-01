// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_cleanEngagementTeamLeader(backendContext) {
  function cleanEngagementTeamLeader(raw = {}) {
    const mode = backendContext.cleanText(raw.mode) === "renounced" ? "renounced" : "person";
    if (mode === "renounced") {
      return {
        mode,
        renunciationAccepted: raw.renunciationAccepted === true
      };
    }
    const firstName = backendContext.cleanText(raw.firstName).slice(0, 80);
    const lastName = backendContext.cleanText(raw.lastName).slice(0, 80);
    const personId = backendContext.cleanText(raw.personId).slice(0, 80);
    const birthDate = backendContext.cleanIsoDate(raw.birthDate);
    const sex = ["F", "M"].includes(backendContext.cleanText(raw.sex).toUpperCase()) ? backendContext.cleanText(raw.sex).toUpperCase() : "";
    const licenseNumber = backendContext.cleanText(raw.licenseNumber).toUpperCase().slice(0, 60);
    const externalClub = raw.externalClub === true;
    const clubId = backendContext.cleanText(raw.clubId).slice(0, 40);
    const clubName = backendContext.cleanText(raw.clubName).slice(0, 140);
    if (!firstName || !lastName) {
      throw new backendContext.HttpsError("invalid-argument", "Nom et prenom du chef d'equipe obligatoires.");
    }
    if (!externalClub && !licenseNumber) {
      throw new backendContext.HttpsError("invalid-argument", "Numero de licence du chef d'equipe obligatoire.");
    }
    if (!externalClub && !backendContext.ENGAGEMENT_SWIMMER_LICENSE_PATTERN.test(licenseNumber)) {
      throw new backendContext.HttpsError("invalid-argument", "Le numero de licence doit respecter le format A-12-34567.");
    }
    if (externalClub && !clubName) {
      throw new backendContext.HttpsError("invalid-argument", "Club du chef d'equipe obligatoire.");
    }
    if (!externalClub && (!birthDate || !sex)) {
      throw new backendContext.HttpsError("invalid-argument", "Date de naissance et sexe du chef d'equipe obligatoires.");
    }
    return {
      mode,
      personId,
      firstName,
      lastName,
      birthDate: externalClub ? "" : birthDate,
      sex: externalClub ? "" : sex,
      licenseNumber,
      externalClub,
      clubId,
      clubName
    };
  }

  return { cleanEngagementTeamLeader };
}

module.exports = { createEntryModelService_cleanEngagementTeamLeader };
