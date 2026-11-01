// Existing operation bodies; live services arrive through explicit accessors.
function createClubHandlers_getPublicEngagementClubDirectory(backendContext) {
  async function getPublicEngagementClubDirectory() {
    const startedAt = Date.now();
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {return await require("../../nap-club-directory-page").directory(require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD));}
      catch(error) {throw new backendContext.HttpsError("unavailable",error instanceof RangeError?error.message:"Annuaire NAP indisponible. Reessayez.");}
    }
    const snapshot = await backendContext.publicEngagementClubDirectoryRef().get();
    const clubsById = snapshot.exists && snapshot.data()?.clubs && typeof snapshot.data().clubs === "object"
      ? snapshot.data().clubs
      : {};
    return {
      ok: true,
      clubs: Object.values(clubsById).map(backendContext.publicEngagementClubItem).filter((club) => club.clubId && club.clubName),
      updatedAt: backendContext.cleanText(snapshot.data()?.updatedAt).slice(0, 40),
      readStats: backendContext.portalReadStats("getPublicEngagementClubDirectory", startedAt, {
        baseDocuments: 1,
        variableDocumentsMax: 0
      })
    };
  }

  return { getPublicEngagementClubDirectory };
}

module.exports = { createClubHandlers_getPublicEngagementClubDirectory };
