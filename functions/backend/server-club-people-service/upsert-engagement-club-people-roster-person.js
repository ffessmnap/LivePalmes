// Existing operation bodies; live services arrive through explicit accessors.
function createClubPeopleService_upsertEngagementClubPeopleRosterPerson(backendContext) {
  function upsertEngagementClubPeopleRosterPerson(batch, db, person = {}, now = "") {
    const item = (0, backendContext.local$engagementClubPeopleRosterPersonItem)(person);
    if (!item.clubId || !item.id) return;
    if (backendContext.cleanText(person.status) === "merged" || backendContext.cleanText(person.mergedIntoId)) {
      (0, backendContext.local$deleteEngagementClubPeopleRosterPerson)(batch, db, item, now);
      return;
    }
    batch.set((0, backendContext.local$engagementClubPeopleRosterRef)(db, item.clubId), {
      clubId: item.clubId,
      clubName: item.clubName,
      updatedAt: now || new Date().toISOString(),
      people: {
        [item.id]: item
      }
    }, { merge: true });
  }

  return { upsertEngagementClubPeopleRosterPerson };
}

module.exports = { createClubPeopleService_upsertEngagementClubPeopleRosterPerson };
