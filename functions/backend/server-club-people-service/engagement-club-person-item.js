// Existing operation bodies; live services arrive through explicit accessors.
function createClubPeopleService_engagementClubPersonItem(backendContext) {
  function engagementClubPersonItem(doc) {
    const data = doc.data() || {};
    const roles = data.roles || {};
    return {
      id: doc.id,
      clubId: backendContext.cleanText(data.clubId).slice(0, 40),
      clubName: backendContext.cleanText(data.clubName).slice(0, 140),
      regionId: backendContext.cleanText(data.regionId).slice(0, 80),
      firstName: backendContext.cleanText(data.firstName).slice(0, 80),
      lastName: backendContext.cleanText(data.lastName).slice(0, 80),
      licenseNumber: backendContext.cleanText(data.licenseNumber).slice(0, 60),
      swimmerIndexId: backendContext.cleanText(data.swimmerIndexId).slice(0, 80),
      swimmerSource: backendContext.cleanText(data.swimmerSource).slice(0, 40),
      birthDate: backendContext.cleanIsoDate(data.birthDate),
      sex: backendContext.cleanText(data.sex).toUpperCase().slice(0, 20),
      identityKey: backendContext.cleanText(data.identityKey).slice(0, 180),
      roles: {
        swimmer: roles.swimmer === true || Boolean(backendContext.cleanText(data.swimmerIndexId)),
        official: roles.official === true,
        teamLeader: roles.teamLeader === true
      },
      active: data.active !== false,
      status: backendContext.cleanText(data.status || (data.mergedIntoId ? "merged" : "active")).slice(0, 30),
      mergedIntoId: backendContext.cleanText(data.mergedIntoId).slice(0, 80),
      mergedIntoName: backendContext.cleanText(data.mergedIntoName).slice(0, 180),
      mergedAt: backendContext.cleanText(data.mergedAt).slice(0, 40),
      updatedAt: backendContext.cleanText(data.updatedAt).slice(0, 40)
    };
  }

  return { engagementClubPersonItem };
}

module.exports = { createClubPeopleService_engagementClubPersonItem };
