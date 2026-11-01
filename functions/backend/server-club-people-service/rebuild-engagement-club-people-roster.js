// Existing operation bodies; live services arrive through explicit accessors.
function createClubPeopleService_rebuildEngagementClubPeopleRoster(backendContext) {
  async function rebuildEngagementClubPeopleRoster(db, context = {}) {
    const clubId = backendContext.cleanText(context.clubId).slice(0, 40);
    if (!clubId) return [];
    const snapshot = await db.collection("engagementClubPeople")
      .where("clubId", "==", clubId)
      .limit(200)
      .get();
    const people = {};
    snapshot.docs.forEach((doc) => {
      const item = (0, backendContext.local$engagementClubPeopleRosterPersonItem)((0, backendContext.local$engagementClubPersonItem)(doc));
      if (item.id && item.clubId === clubId) people[item.id] = item;
    });
    const now = new Date().toISOString();
    await (0, backendContext.local$engagementClubPeopleRosterRef)(db, clubId).set({
      clubId,
      clubName: backendContext.cleanText(context.clubName).slice(0, 140),
      generatedAt: now,
      updatedAt: now,
      personCount: Object.keys(people).length,
      people
    }, { merge: false });
    return (0, backendContext.local$engagementClubPeopleRosterPeopleFromData)({ people });
  }

  return { rebuildEngagementClubPeopleRoster };
}

module.exports = { createClubPeopleService_rebuildEngagementClubPeopleRoster };
