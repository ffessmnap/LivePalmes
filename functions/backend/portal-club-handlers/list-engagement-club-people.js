// Existing operation bodies; live services arrive through explicit accessors.
function createClubHandlers_listEngagementClubPeople(backendContext) {
  async function listEngagementClubPeople(request) {
    const startedAt = Date.now();
    const context = await backendContext.engagementClubAccessContext(request);
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        const result = await require("../../nap-club-people-page").readClubPeople(require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD), {clubId:context.clubId,cursor:request.data?.cursor}, ({clubId}) => {
          if(clubId!==context.clubId) throw new backendContext.HttpsError("permission-denied", "Personnes hors du club autorise.");
        });
        return {ok:true,clubId:context.clubId,...result,readStats:backendContext.portalReadStats("listEngagementClubPeople",startedAt,{baseDocuments:1,variableDocumentsMax:0,cacheHit:false})};
      } catch(error) {
        if(error instanceof backendContext.HttpsError) throw error;
        throw new backendContext.HttpsError(error instanceof TypeError ? "invalid-argument" : error instanceof RangeError ? "resource-exhausted" : "unavailable", "Personnes NAP indisponibles. " + (error instanceof TypeError || error instanceof RangeError ? error.message : "Reessayez le chargement."));
      }
    }
    const includeInactive = request.data?.includeInactive === true;
    const forceRebuild = request.data?.forceRoster === true;
    const rosterSnapshot = forceRebuild ? null : await backendContext.engagementClubPeopleRosterRef(backendContext.db, context.clubId).get();
    const rosterReady = rosterSnapshot?.exists && backendContext.cleanText(rosterSnapshot.data()?.generatedAt);
    let rosterGenerated = false;
    const rosterPeople = rosterReady
      ? backendContext.engagementClubPeopleRosterPeopleFromData(rosterSnapshot.data() || {})
      : await backendContext.rebuildEngagementClubPeopleRoster(backendContext.db, context).then((items) => {
        rosterGenerated = true;
        return items;
      });
    const people = rosterPeople
      .filter((person) => includeInactive || person.active)
      .sort((left, right) => `${left.lastName} ${left.firstName}`.localeCompare(`${right.lastName} ${right.firstName}`, "fr"));
    return {
      ok: true,
      collection: backendContext.ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION,
      rosterGenerated,
      readStats: backendContext.portalReadStats("listEngagementClubPeople", startedAt, {
        baseDocuments: 2,
        variableDocumentsMax: rosterGenerated ? 200 : 0,
        cacheHit: !rosterGenerated
      }),
      people
    };
  }

  return { listEngagementClubPeople };
}

module.exports = { createClubHandlers_listEngagementClubPeople };
