// Existing operation bodies; live services arrive through explicit accessors.
function createClubPeopleService_engagementClubPeopleRosterPeopleFromData(backendContext) {
  function engagementClubPeopleRosterPeopleFromData(data = {}) {
    const people = data.people && typeof data.people === "object" ? data.people : {};
    return Object.values(people)
      .map(backendContext.local$engagementClubPeopleRosterPersonItem)
      .filter((person) => person.id && person.clubId)
      .sort((left, right) => `${left.lastName} ${left.firstName}`.localeCompare(`${right.lastName} ${right.firstName}`, "fr"));
  }

  return { engagementClubPeopleRosterPeopleFromData };
}

module.exports = { createClubPeopleService_engagementClubPeopleRosterPeopleFromData };
