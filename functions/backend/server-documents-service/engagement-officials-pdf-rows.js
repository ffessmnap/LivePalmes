// Existing operation bodies; live services arrive through explicit accessors.
function createDocumentsService_engagementOfficialsPdfRows(backendContext) {
  function engagementOfficialsPdfRows(entries = [], birthDatesByPersonId = new Map()) {
    const rows = [];
    (Array.isArray(entries) ? entries : []).forEach((entry) => {
      (Array.isArray(entry.officials) ? entry.officials : []).forEach((official) => {
        rows.push({
          club: backendContext.cleanText(entry.clubName) || backendContext.engagementClubCode(entry.clubId, entry.clubCode) || "-",
          clubCode: backendContext.engagementClubCode(entry.clubId, entry.clubCode),
          lastName: backendContext.cleanText(official.lastName).toUpperCase(),
          firstName: backendContext.cleanText(official.firstName),
          birthDate: backendContext.cleanIsoDate(official.birthDate) || backendContext.cleanIsoDate(birthDatesByPersonId.get(backendContext.cleanText(official.personId))),
          licenseNumber: backendContext.cleanText(official.licenseNumber),
          personId: backendContext.cleanText(official.personId)
        });
      });
    });
    if (rows.length > 5000) {
      throw new Error("La liste des officiels depasse la limite de 5 000 lignes pour un PDF.");
    }
    return rows.sort((left, right) =>
      left.club.localeCompare(right.club, "fr", { sensitivity: "base", numeric: true }) ||
      left.lastName.localeCompare(right.lastName, "fr", { sensitivity: "base" }) ||
      left.firstName.localeCompare(right.firstName, "fr", { sensitivity: "base" }) ||
      left.licenseNumber.localeCompare(right.licenseNumber, "fr", { sensitivity: "base", numeric: true })
    );
  }

  return { engagementOfficialsPdfRows };
}

module.exports = { createDocumentsService_engagementOfficialsPdfRows };
