// Existing operation bodies; live services arrive through explicit accessors.
function createNationalHandlers_listEngagementNationalClubs(backendContext) {
  async function listEngagementNationalClubs(request) {
    const startedAt = Date.now();
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national) throw new backendContext.HttpsError("permission-denied", "Lecture des clubs reservee au niveau national.");
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        if(request.data?.deletionClubId!==undefined){const clubId=String(request.data.deletionClubId);return{ok:true,source:"nap",clubId,deletionEligible:Boolean(await require("../../nap-club-provenance").eligibility(backendContext.db,clubId))};}
        const result=await require("../../nap-club-directory-page").directory(require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD));
        const adminDirectory=request.data?.includeAdministrators===true?await backendContext.readEngagementClubAdminDirectory(backendContext.db):null;
        return {...result,...(adminDirectory?{clubAdministrators:adminDirectory.administrators,clubAdministratorsAvailable:adminDirectory.available!==false,clubAdministratorsBootstrapped:adminDirectory.bootstrapped===true}:{})};
      } catch(error) {throw new backendContext.HttpsError("unavailable",error instanceof RangeError?error.message:"Annuaire NAP indisponible. Reessayez.");}
    }
    if (request.data?.directoryMode === true) {
      const [directorySnapshot, adminDirectory] = await Promise.all([
        backendContext.publicEngagementClubDirectoryRef().get(),
        request.data?.includeAdministrators === true ? backendContext.readEngagementClubAdminDirectory(backendContext.db) : Promise.resolve(null)
      ]);
      const clubsById = directorySnapshot.exists && directorySnapshot.data()?.clubs && typeof directorySnapshot.data().clubs === "object"
        ? directorySnapshot.data().clubs
        : {};
      return {
        ok: true,
        clubs: Object.values(clubsById).map(backendContext.publicEngagementClubItem).filter((club) => club.clubId),
        replaceDirectory: true,
        hasMore: false,
        cursor: null,
        syncWatermark: backendContext.cleanText(directorySnapshot.data()?.updatedAt).slice(0, 40) || new Date().toISOString(),
        ...(adminDirectory ? {
          clubAdministrators: adminDirectory.administrators,
          clubAdministratorsAvailable: adminDirectory.available !== false,
          clubAdministratorsBootstrapped: adminDirectory.bootstrapped === true
        } : {}),
        readStats: backendContext.portalReadStats("listEngagementNationalClubs", startedAt, {
          baseDocuments: adminDirectory ? 2 : 1,
          variableDocumentsMax: adminDirectory?.bootstrapped ? backendContext.ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT + 1 : 0,
          cacheHit: true
        })
      };
    }
    const pageLimit = Math.min(500, Math.max(50, Math.trunc(Number(request.data?.limit) || 250)));
    const updatedAfter = backendContext.cleanText(request.data?.updatedAfter).slice(0, 40);
    const afterClubId = backendContext.cleanText(request.data?.afterClubId).slice(0, 40);
    const includeAdministrators = request.data?.includeAdministrators === true && !afterClubId;
    const syncWatermark = new Date().toISOString();
    let query = backendContext.db.collection(backendContext.ENGAGEMENT_CLUBS_COLLECTION)
      .orderBy("updatedAt", "asc")
      .orderBy(backendContext.FieldPath.documentId(), "asc");
    if (updatedAfter && afterClubId) query = query.startAfter(updatedAfter, afterClubId);
    else if (updatedAfter) query = query.where("updatedAt", ">", updatedAfter);
    const [snapshot, adminDirectory] = await Promise.all([
      query.limit(pageLimit + 1).get(),
      includeAdministrators ? backendContext.readEngagementClubAdminDirectory(backendContext.db) : Promise.resolve(null)
    ]);
    const pageDocuments = snapshot.docs.slice(0, pageLimit);
    const lastDocument = pageDocuments[pageDocuments.length - 1];
    return {
      ok: true,
      clubs: pageDocuments.map(backendContext.engagementStoredClubItem),
      hasMore: snapshot.size > pageLimit,
      cursor: lastDocument ? {
        updatedAt: backendContext.cleanText(lastDocument.get("updatedAt")).slice(0, 40),
        clubId: lastDocument.id
      } : null,
      ...(adminDirectory ? {
        clubAdministrators: adminDirectory.administrators,
        clubAdministratorsAvailable: adminDirectory.available !== false,
        clubAdministratorsBootstrapped: adminDirectory.bootstrapped === true
      } : {}),
      syncWatermark,
      readStats: backendContext.portalReadStats("listEngagementNationalClubs", startedAt, {
        baseDocuments: includeAdministrators ? 2 : 1,
        variableDocumentsMax: pageLimit + 1 + (adminDirectory?.bootstrapped ? backendContext.ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT + 1 : 0)
      })
    };
  }

  return { listEngagementNationalClubs };
}

module.exports = { createNationalHandlers_listEngagementNationalClubs };
