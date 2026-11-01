// Existing operation bodies; live services arrive through explicit accessors.
function createNationalHandlers_listEngagementNationalClubPeople(backendContext) {
  async function listEngagementNationalClubPeople(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national) {
      throw new backendContext.HttpsError("permission-denied", "Lecture reservee au niveau national.");
    }
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {return await require("../../nap-club-people").readNationalPeople(require("../../nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{cursor:request.data?.cursor},()=>{if(!context.national) throw new backendContext.HttpsError("permission-denied","Lecture nationale requise.");});}
      catch(error) {throw new backendContext.HttpsError(error instanceof TypeError?"invalid-argument":"unavailable",error instanceof TypeError?error.message:"Annuaire national NAP indisponible. Reessayez.");}
    }
    const limit = Math.min(200, Math.max(20, Math.trunc(Number(request.data?.limit) || 80)));
    const snapshot = await backendContext.db
      .collection("engagementClubPeople")
      .orderBy("updatedAt", "desc")
      .limit(limit)
      .get();
    return {
      ok: true,
      people: snapshot.docs.map(backendContext.engagementClubPersonItem)
    };
  }

  return { listEngagementNationalClubPeople };
}

module.exports = { createNationalHandlers_listEngagementNationalClubPeople };
