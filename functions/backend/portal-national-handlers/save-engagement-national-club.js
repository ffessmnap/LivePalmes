// Existing operation bodies; live services arrive through explicit accessors.
function createNationalHandlers_saveEngagementNationalClub(backendContext) {
  async function saveEngagementNationalClub(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national) throw new backendContext.HttpsError("permission-denied", "Modification des clubs reservee au niveau national.");
    const requestedClubId = backendContext.cleanText(request.data?.clubId).slice(0, 40);
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      if(!requestedClubId) {
        try {return await require("../../nap-club-create").create(require("../../nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{actorUid:context.uid,club:request.data?.club,creationId:request.data?.creationId},{
          read:async operation=>{const doc=await backendContext.db.collection("auditLogs").doc(`nap-club-create-${operation}-before`).get();return doc.exists?doc.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-club-create-${operation}-before`).create({action:"nap.clubCreate.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          checkpoint:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-club-create-${operation}-before`).update({target}),
          complete:async(operation,target)=>{await backendContext.writeAuditLogOnce("nap.clubCreate.complete",context.uid,{...target,auditPreparationId:`nap-club-create-${operation}-before`},`nap-club-create-${operation}-complete`);await require("../../nap-club-provenance").record(backendContext.db,operation,target,context.uid);}
        },()=>{if(!context.national)throw new backendContext.HttpsError("permission-denied","Action nationale requise.");});}
        catch(error) {if(error instanceof backendContext.HttpsError)throw error;throw new backendContext.HttpsError(error instanceof TypeError?"failed-precondition":"unavailable",error instanceof TypeError?error.message:"Creation club NAP a verifier. Reprenez la meme action ; sauvegarde conservee.");}
      }
      try {return await require("../../nap-club-change").edit(require("../../nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{clubId:requestedClubId,actorUid:context.uid,club:request.data?.club,expectedFingerprint:request.data?.expectedFingerprint,confirmFederalNumberChange:request.data?.confirmFederalNumberChange},{
        read:async operation=>{const doc=await backendContext.db.collection("auditLogs").doc(`nap-club-edit-${operation}-before`).get();return doc.exists?doc.data().target:null;},
        prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-club-edit-${operation}-before`).create({action:"nap.clubEdit.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
        complete:(operation,target)=>backendContext.writeAuditLogOnce("nap.clubEdit.complete",context.uid,{...target,auditPreparationId:`nap-club-edit-${operation}-before`},`nap-club-edit-${operation}-complete`)
      },()=>{if(!context.national)throw new backendContext.HttpsError("permission-denied","Action nationale requise.");});}
      catch(error) {if(error instanceof backendContext.HttpsError)throw error;throw new backendContext.HttpsError(error instanceof TypeError?"failed-precondition":"unavailable",error instanceof TypeError?error.message:"Modification club NAP a verifier. Rechargez la fiche.");}
    }
    const baseClub = requestedClubId ? backendContext.CLUB_REFERENCE_BY_ID.get(requestedClubId) || {} : {};
    const existingSnapshot = requestedClubId
      ? await backendContext.db.collection(backendContext.ENGAGEMENT_CLUBS_COLLECTION).doc(requestedClubId).get()
      : null;
    const current = {
      ...baseClub,
      ...(existingSnapshot?.exists ? backendContext.engagementStoredClubItem(existingSnapshot) : {})
    };
    let cleaned;
    try {
      cleaned = backendContext.cleanClubPayload(request.data?.club || {}, current);
    } catch (error) {
      throw new backendContext.HttpsError("invalid-argument", backendContext.cleanText(error?.message || error));
    }
    const previousFederalNumber = backendContext.cleanText(current.federalNumber).toUpperCase();
    const federalNumberChanged = Boolean(requestedClubId && previousFederalNumber && previousFederalNumber !== cleaned.federalNumber);
    if (federalNumberChanged && request.data?.confirmFederalNumberChange !== true) {
      throw new backendContext.HttpsError("failed-precondition", "Confirmez explicitement la correction du numéro fédéral.");
    }
    if (!requestedClubId || previousFederalNumber !== cleaned.federalNumber) {
      const staticConflict = backendContext.CLUB_REFERENCE_BY_FEDERAL_NUMBER.get(cleaned.federalNumber);
      if (staticConflict && staticConflict.clubId !== requestedClubId) {
        throw new backendContext.HttpsError("already-exists", `Ce numéro fédéral appartient déjà à ${staticConflict.clubCode || staticConflict.clubName}.`);
      }
      const storedConflictSnapshot = await backendContext.db.collection(backendContext.ENGAGEMENT_CLUBS_COLLECTION)
        .where("federalNumber", "==", cleaned.federalNumber)
        .limit(2)
        .get();
      const storedConflictDocument = storedConflictSnapshot.docs.find((doc) => doc.id !== requestedClubId && doc.data()?.deleted !== true);
      if (storedConflictDocument) {
        const conflict = backendContext.engagementStoredClubItem(storedConflictDocument);
        throw new backendContext.HttpsError("already-exists", `Ce numéro fédéral appartient déjà à ${conflict.clubCode || conflict.clubName}.`);
      }
    }
    const clubId = requestedClubId || `club-${backendContext.stableHash(cleaned.federalNumber).slice(0, 16)}`;
    if (!requestedClubId && (await backendContext.db.collection(backendContext.ENGAGEMENT_CLUBS_COLLECTION).doc(clubId).get()).exists) {
      throw new backendContext.HttpsError("already-exists", "Ce club existe deja dans le referentiel national.");
    }
    const now = new Date().toISOString();
    const payload = {
      ...cleaned,
      clubId,
      updatedAt: now,
      updatedBy: context.uid,
      ...(!requestedClubId ? { createdAt: now, createdBy: context.uid } : {})
    };
    const clubRef = backendContext.db.collection(backendContext.ENGAGEMENT_CLUBS_COLLECTION).doc(clubId);
    const batch = backendContext.db.batch();
    batch.set(clubRef, payload, { merge: true });
    batch.set(backendContext.publicEngagementClubDirectoryRef(), {
      clubs: { [clubId]: backendContext.publicEngagementClubItem(payload) },
      updatedAt: now
    }, { merge: true });
    await batch.commit();
    await backendContext.writeAuditLog(requestedClubId ? "engagementClub.updated" : "engagementClub.created", context.uid, {
      clubId,
      federalNumber: cleaned.federalNumber,
      ...(federalNumberChanged ? { previousFederalNumber, federalNumberChanged: true } : {}),
      clubCode: cleaned.clubCode,
      clubName: cleaned.clubName,
      active: cleaned.active
    });
    const saved = await backendContext.db.collection(backendContext.ENGAGEMENT_CLUBS_COLLECTION).doc(clubId).get();
    return {
      ok: true,
      created: !requestedClubId,
      club: {
        ...(backendContext.CLUB_REFERENCE_BY_ID.get(clubId) || {}),
        ...backendContext.engagementStoredClubItem(saved)
      }
    };
  }

  return { saveEngagementNationalClub };
}

module.exports = { createNationalHandlers_saveEngagementNationalClub };
