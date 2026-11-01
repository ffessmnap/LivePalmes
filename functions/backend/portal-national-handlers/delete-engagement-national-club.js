// Existing operation bodies; live services arrive through explicit accessors.
function createNationalHandlers_deleteEngagementNationalClub(backendContext) {
  async function deleteEngagementNationalClub(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national) throw new backendContext.HttpsError("permission-denied", "Suppression des clubs reservee au niveau national.");
    if (request.data?.confirmPermanent !== true) {
      throw new backendContext.HttpsError("failed-precondition", "Confirmation de suppression definitive requise.");
    }
    const clubId = backendContext.cleanText(request.data?.clubId).slice(0, 40);
    if (!clubId) throw new backendContext.HttpsError("invalid-argument", "Club requis.");
    if(backendContext.ENVIRONMENT.sportingDataSource === "nap"){
      try{return await require("../../nap-club-deletion").deleteClub(require("../../nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{clubId,actorUid:context.uid,confirmPermanent:true,expectedFingerprint:request.data?.expectedFingerprint},{
        creation:clubId=>require("../../nap-club-provenance").creation(backendContext.db,clubId),
        assertNoAccounts:async clubId=>{const [users,requests]=await Promise.all([backendContext.db.collection("users").where("clubId","==",clubId).limit(1).get(),backendContext.db.collection("engagementAccessRequests").where("clubId","==",clubId).where("status","==","pending").limit(1).get()]);if(!users.empty||!requests.empty)throw new TypeError("Ce club possede un compte ou une demande d'acces. Desactivez-le plutot que de le supprimer.");},
        read:async operation=>{const doc=await backendContext.db.collection("auditLogs").doc(`nap-club-delete-${operation}-before`).get();return doc.exists?doc.data().target:null;},
        prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-club-delete-${operation}-before`).create({action:"nap.clubDelete.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
        complete:(operation,target)=>backendContext.writeAuditLogOnce("nap.clubDelete.complete",context.uid,{...target,auditPreparationId:`nap-club-delete-${operation}-before`},`nap-club-delete-${operation}-complete`)
      },()=>{if(!context.national)throw new backendContext.HttpsError("permission-denied","Suppression nationale requise.");});}
      catch(error){if(error instanceof backendContext.HttpsError)throw error;throw new backendContext.HttpsError(error instanceof TypeError||error instanceof RangeError?"failed-precondition":"unavailable",error instanceof TypeError||error instanceof RangeError?error.message:"Suppression club NAP a verifier. Reprenez la meme action ; sauvegarde conservee.");}
    }
    if (backendContext.CLUB_REFERENCE_BY_ID.has(clubId)) {
      throw new backendContext.HttpsError("failed-precondition", "Un club historique doit etre desactive et ne peut pas etre supprime.");
    }
    const clubRef = backendContext.db.collection(backendContext.ENGAGEMENT_CLUBS_COLLECTION).doc(clubId);
    const clubSnapshot = await clubRef.get();
    if (!clubSnapshot.exists || clubSnapshot.data()?.deleted === true) throw new backendContext.HttpsError("not-found", "Club introuvable.");
    const club = backendContext.engagementStoredClubItem(clubSnapshot);
    if (club.source !== "national") {
      throw new backendContext.HttpsError("failed-precondition", "Seuls les clubs crees par l'administration nationale peuvent etre supprimes.");
    }
    const dependencyQueries = [
      ["performance", backendContext.db.collection(backendContext.PERFORMANCE_BASE_COLLECTION).where("clubId", "==", clubId)],
      ["compte", backendContext.db.collection("users").where("clubId", "==", clubId)],
      ["demande d'accès en attente", backendContext.db.collection("engagementAccessRequests").where("clubId", "==", clubId).where("status", "==", "pending")],
      ["nageur", backendContext.db.collection("engagementClubSwimmers").where("clubId", "==", clubId)],
      ["officiel ou chef d'équipe", backendContext.db.collection("engagementClubPeople").where("clubId", "==", clubId)],
      ["engagement", backendContext.db.collection("engagementClubEntries").where("clubId", "==", clubId)]
    ];
    const dependencySnapshots = await Promise.all(dependencyQueries.map(([, query]) => query.limit(1).get()));
    const blockers = dependencyQueries
      .filter((_, index) => !dependencySnapshots[index].empty)
      .map(([, label]) => label);
    if (blockers.length) {
      throw new backendContext.HttpsError("failed-precondition", `Ce club reste lie a au moins un element : ${blockers.join(", ")}. Desactivez-le plutot.`);
    }
    const now = new Date().toISOString();
    const startedAt = Date.now();
    const batch = backendContext.db.batch();
    batch.set(clubRef, {
      clubId,
      source: "national",
      deleted: true,
      active: false,
      updatedAt: now,
      updatedBy: context.uid,
      deletedAt: now,
      deletedBy: context.uid
    });
    batch.delete(backendContext.db.collection(backendContext.ENGAGEMENT_CLUB_ROSTERS_COLLECTION).doc(clubId));
    batch.delete(backendContext.db.collection(backendContext.ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION).doc(clubId));
    batch.set(backendContext.publicEngagementClubDirectoryRef(), {
      clubs: { [clubId]: backendContext.FieldValue.delete() },
      updatedAt: now
    }, { merge: true });
    await batch.commit();
    await backendContext.writeAuditLog("engagementClub.deleted", context.uid, {
      clubId,
      federalNumber: club.federalNumber,
      clubCode: club.clubCode,
      clubName: club.clubName
    });
    return {
      ok: true,
      clubId,
      readStats: backendContext.portalReadStats("deleteEngagementNationalClub", startedAt, {
        baseDocuments: 2,
        variableDocumentsMax: dependencyQueries.length
      })
    };
  }

  return { deleteEngagementNationalClub };
}

module.exports = { createNationalHandlers_deleteEngagementNationalClub };
