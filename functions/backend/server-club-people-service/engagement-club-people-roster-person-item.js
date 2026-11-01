// Existing operation bodies; live services arrive through explicit accessors.
function createClubPeopleService_engagementClubPeopleRosterPersonItem(backendContext) {
  function engagementClubPeopleRosterPersonItem(person = {}) {
    const roles = person.roles || {};
    return backendContext.cleanFirestoreValue({
      id: backendContext.cleanText(person.id).slice(0, 80),
      clubId: backendContext.cleanText(person.clubId).slice(0, 40),
      clubName: backendContext.cleanText(person.clubName).slice(0, 140),
      regionId: backendContext.cleanText(person.regionId).slice(0, 80),
      firstName: backendContext.cleanText(person.firstName).slice(0, 80),
      lastName: backendContext.cleanText(person.lastName).slice(0, 80),
      licenseNumber: backendContext.cleanText(person.licenseNumber).slice(0, 60),
      swimmerIndexId: backendContext.cleanText(person.swimmerIndexId).slice(0, 80),
      swimmerSource: backendContext.cleanText(person.swimmerSource).slice(0, 40),
      birthDate: backendContext.cleanIsoDate(person.birthDate),
      sex: backendContext.cleanText(person.sex).toUpperCase().slice(0, 20),
      identityKey: backendContext.cleanText(person.identityKey).slice(0, 180),
      roles: {
        swimmer: roles.swimmer === true || Boolean(backendContext.cleanText(person.swimmerIndexId)),
        official: roles.official === true,
        teamLeader: roles.teamLeader === true
      },
      active: person.active !== false,
      updatedAt: backendContext.cleanText(person.updatedAt).slice(0, 40)
    });
  }

  return { engagementClubPeopleRosterPersonItem };
}

module.exports = { createClubPeopleService_engagementClubPeopleRosterPersonItem };
