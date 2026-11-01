// Existing operation bodies; live services arrive through explicit accessors.
function createClubPeopleService_deleteEngagementClubPeopleRosterPerson(backendContext) {
  function deleteEngagementClubPeopleRosterPerson(batch, db, person = {}, now = "") {
    const clubId = backendContext.cleanText(person.clubId).slice(0, 40);
    const personId = backendContext.cleanText(person.id).slice(0, 80);
    if (!clubId || !personId) return;
    batch.set((0, backendContext.local$engagementClubPeopleRosterRef)(db, clubId), {
      updatedAt: now || new Date().toISOString(),
      people: {
        [personId]: backendContext.FieldValue.delete()
      }
    }, { merge: true });
  }

  return { deleteEngagementClubPeopleRosterPerson };
}

module.exports = { createClubPeopleService_deleteEngagementClubPeopleRosterPerson };
