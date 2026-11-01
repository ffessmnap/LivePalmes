// Existing operation bodies; live services arrive through explicit accessors.
function createNationalService_engagementSwimmerIdentitySnapshot(backendContext) {
  function engagementSwimmerIdentitySnapshot(swimmer = {}, source = swimmer.source || "") {
    const firstName = backendContext.cleanText(swimmer.firstName).slice(0, 80);
    const lastName = backendContext.cleanText(swimmer.lastName).slice(0, 80);
    return backendContext.cleanFirestoreValue({
      id: backendContext.cleanText(swimmer.id || swimmer.swimmerIndexId).slice(0, 80),
      swimmerIndexId: backendContext.cleanText(swimmer.swimmerIndexId || swimmer.id).slice(0, 80),
      source: backendContext.cleanText(source || swimmer.source).slice(0, 40),
      swimmerId: backendContext.cleanText(swimmer.swimmerId).slice(0, 80),
      sourceIds: Array.isArray(swimmer.sourceIds)
        ? swimmer.sourceIds.map((id) => backendContext.cleanText(id).slice(0, 80)).filter(Boolean).slice(0, 25)
        : [],
      identityKey: backendContext.cleanText(swimmer.identityKey).slice(0, 180),
      firstName,
      lastName,
      name: backendContext.cleanText(swimmer.name).slice(0, 160) || [firstName, lastName].filter(Boolean).join(" "),
      birthDate: backendContext.cleanIsoDate(swimmer.birthDate),
      sex: backendContext.cleanText(swimmer.sex).toUpperCase().slice(0, 1),
      nonSelectable: swimmer.nonSelectable === true,
      licenseNumber: backendContext.cleanText(swimmer.licenseNumber).toUpperCase().slice(0, 60),
      clubId: backendContext.cleanText(swimmer.clubId).slice(0, 40),
      clubName: backendContext.cleanText(swimmer.clubName).slice(0, 140),
      performanceCount: Math.max(0, Math.trunc(Number(swimmer.performanceCount) || 0)),
      ...(swimmer.napSource === true ? { napSource: true, napFingerprint: backendContext.cleanText(swimmer.napFingerprint).slice(0, 64) } : {})
    });
  }

  return { engagementSwimmerIdentitySnapshot };
}

module.exports = { createNationalService_engagementSwimmerIdentitySnapshot };
