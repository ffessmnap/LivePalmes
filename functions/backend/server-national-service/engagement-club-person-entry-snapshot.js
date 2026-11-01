// Existing operation bodies; live services arrive through explicit accessors.
function createNationalService_engagementClubPersonEntrySnapshot(backendContext) {
  function engagementClubPersonEntrySnapshot(person = {}) {
    return {
      personId: backendContext.cleanText(person.id).slice(0, 80),
      firstName: backendContext.cleanText(person.firstName).slice(0, 80),
      lastName: backendContext.cleanText(person.lastName).slice(0, 80),
      licenseNumber: backendContext.cleanText(person.licenseNumber).slice(0, 60)
    };
  }

  function engagementClubPersonFullName(person = {}) {
    return [person.firstName, person.lastName].filter(Boolean).join(" ") || person.licenseNumber || person.id || "Personne";
  }

  function mergeEngagementClubEntryOfficials(officials = [], sourceId = "", targetOfficial = {}) {
    const targetId = backendContext.cleanText(targetOfficial.personId).slice(0, 80);
    const seen = new Set();
    let changed = false;
    const merged = (Array.isArray(officials) ? officials : []).map((official) => {
      const officialId = backendContext.cleanText(official?.personId).slice(0, 80);
      if (officialId === sourceId) {
        changed = true;
        return targetOfficial;
      }
      return backendContext.cleanEngagementEntryOfficial(official || {});
    }).filter((official) => official.personId || official.licenseNumber)
      .filter((official) => {
        const key = official.personId || `${official.licenseNumber}|${official.firstName}|${official.lastName}`;
        if (!key) return false;
        if (seen.has(key)) {
          changed = true;
          return false;
        }
        seen.add(key);
        return true;
      });
    if (targetId && !seen.has(targetId) && (Array.isArray(officials) ? officials : []).some((official) => backendContext.cleanText(official?.personId).slice(0, 80) === sourceId)) {
      changed = true;
    }
    return { officials: merged, changed };
  }

  return { engagementClubPersonEntrySnapshot, engagementClubPersonFullName, mergeEngagementClubEntryOfficials };
}

module.exports = { createNationalService_engagementClubPersonEntrySnapshot };
