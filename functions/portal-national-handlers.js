// Preserve the execution mode of the existing index.js function bodies.

// Existing callable bodies only. Firebase registrations stay in index.js.
// This factory performs no I/O and retains live access to its explicit services.
function createNationalHandlers(backendContext) {
  async function getNationalFeaturedDocuments(request) {
    if(request.data?.library===true)return backendContext.manageNationalLibraryDocuments(request);
    const context=await backendContext.engagementAccessContext(request);
    if(!context.national)throw new backendContext.HttpsError("permission-denied","Administration nationale requise.");
    if(backendContext.ENVIRONMENT.sportingDataSource!=="nap")throw new backendContext.HttpsError("failed-precondition","Sélection documentaire indisponible.");
    try{
      const pool=require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
      const selection=await require("./nap-featured-documents").readSelection(pool);
      return {source:"nap",documents:selection.documents,fingerprint:selection.fingerprint};
    }catch(error){throw new backendContext.HttpsError("failed-precondition",error instanceof TypeError?error.message:"Sélection documentaire momentanément indisponible.");}
  }

  async function saveNationalFeaturedDocuments(request) {
    if(request.data?.library===true)return backendContext.manageNationalLibraryDocuments(request);
    if(backendContext.ENVIRONMENT.sportingDataSource!=="nap")throw new backendContext.HttpsError("failed-precondition","Sélection documentaire indisponible.");
    try{
      const pool=require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
      const result=await require("./nap-featured-documents").saveSelection(pool,request.data,{
        authorize:()=>backendContext.engagementAccessContext(request),
        audit:{
          read:async operation=>{const snapshot=await backendContext.db.collection("auditLogs").doc(`nap-featured-${operation}-before`).get();return snapshot.exists?snapshot.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-featured-${operation}-before`).create({action:"nap.featured.prepare",actorUid:target.actorUid,target,createdAt:new Date().toISOString()}),
          complete:(operation,target)=>backendContext.writeAuditLogOnce("nap.featured.saved",request.auth.uid,{...target,auditPreparationId:`nap-featured-${operation}-before`},operation)
        }
      });
      return {source:"nap",...result};
    }catch(error){
      if(error instanceof backendContext.HttpsError)throw error;
      throw new backendContext.HttpsError(error instanceof TypeError?"failed-precondition":"unavailable",error instanceof TypeError?error.message:"Enregistrement à vérifier. Rechargez la sélection ; la sauvegarde technique est conservée.");
    }
  }

  async function searchEngagementNationalSwimmers(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national) {
      throw new backendContext.HttpsError("permission-denied", "Recherche reservee au niveau national.");
    }
    const query = backendContext.cleanText(request.data?.query).slice(0, 120);
    const limit = Math.min(80, Math.max(10, Math.trunc(Number(request.data?.limit) || 40)));
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        const nap = require("./nap-portal-swimmers");
        const result = await nap.searchPortalSwimmers(nap.portalPool(process.env.LIVEPALMES_NAP_PASSWORD), query);
        return { ok: true, query, source: "nap", hasMore: result.hasMore, swimmers: result.swimmers.map((item, index) => ({
          ...item, category: backendContext.currentEngagementCategoryFromBirthDate(item.birthDate),
          id: item.id, swimmerIndexId: item.id, swimmerId: item.id, source: "reference", napSource: true,
          firstName: item.firstName, lastName: item.lastName, birthDate: item.birthDate, sex: item.sex, name: item.name, clubId: item.clubId, club: item.club, clubName: item.clubName, identityKey: item.identityKey, napFingerprint: item.napFingerprint
        })) };
      } catch (error) {
        throw new backendContext.HttpsError(error instanceof TypeError ? "invalid-argument" : "unavailable", "Recherche NAP indisponible. Precisez le nom, le prenom ou l'identifiant.");
      }
    }
    const swimmers = await backendContext.searchEngagementNationalSwimmerDocs(backendContext.db, query, limit);
    return {
      ok: true,
      query,
      swimmers
    };
  }

  async function requestEngagementClubSwimmerChange(request) {
    const context = await backendContext.engagementClubAccessContext(request);
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        const nap = require("./nap-portal-swimmers");
        if(request.data?.nsAction!==undefined)return await require("./nap-swimmer-ns-callables").club(backendContext,context,request.data);
        if(request.data?.completeLicense===true) return await require("./nap-club-license-fill").fillClubLicense(nap.portalPool(process.env.LIVEPALMES_NAP_PASSWORD),request.data,context,{
          read:async operation=>{const snapshot=await backendContext.db.collection("auditLogs").doc(`nap-club-license-${operation}-before`).get();return snapshot.exists?snapshot.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-club-license-${operation}-before`).create({action:"nap.club.license.fill.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          complete:(operation,target)=>backendContext.writeAuditLogOnce("nap.club.license.filled",context.uid,{...target,auditPreparationId:`nap-club-license-${operation}-before`},operation)
        });
        const requestHelper=request.data?.personId ? require("./nap-person-change-requests") : require("./nap-swimmer-change-requests");
        const proposal = await requestHelper.prepareRequest(nap.portalPool(process.env.LIVEPALMES_NAP_PASSWORD), request.data, context);
        const requestId = backendContext.stableHash([proposal.requestType === "person-change" ? "nap-person" : "nap", proposal.targetSwimmerId, context.clubId].join("|")).slice(0, 40);
        const ref = backendContext.db.collection(backendContext.ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION).doc(requestId);
        const now = new Date().toISOString();
        const payload = { ...proposal, id: requestId, requestType: proposal.requestType || "swimmer-change", status: "pending",
          clubId: context.clubId, clubName: context.clubName, regionId: context.regionId,
          requestedAt: now, requestedBy: context.uid, requestedByEmail: context.email || "",
          requestedByFirstName: context.firstName || "", requestedByLastName: context.lastName || "",
          updatedAt: now, updatedBy: context.uid };
        await backendContext.db.runTransaction(async transaction => {
          const existing = await transaction.get(ref);
          if (existing.exists && existing.data()?.status === "pending") throw new backendContext.HttpsError("already-exists", "Une demande de correction est deja en attente pour ce nageur.");
          transaction.set(ref, backendContext.cleanFirestoreValue(payload), { merge: false });
        }, { maxAttempts: 3 });
        await backendContext.writeAuditLogOnce("nap.swimmer.changeRequested", context.uid, { requestId, swimmerId: proposal.targetSwimmerId, clubId: context.clubId }, `${requestId}-${now}`);
        return { ok: true, request: backendContext.engagementSwimmerChangeRequestItem({ id: requestId, data: () => payload }) };
      } catch (error) {
        if (error instanceof backendContext.HttpsError) throw error;
        throw new backendContext.HttpsError(error instanceof TypeError ? "failed-precondition" : "unavailable", error instanceof TypeError ? error.message : "Demande NAP indisponible. Rechargez les demandes avant de recommencer.");
      }
    }
    const requestedSource = backendContext.cleanText(request.data?.source).slice(0, 40);
    const requestedSwimmerId = backendContext.cleanText(request.data?.swimmerId).slice(0, 80);
    const target = await backendContext.getEngagementSwimmerCorrectionTarget(
      backendContext.db,
      requestedSource,
      requestedSwimmerId,
      backendContext.cleanText(request.data?.identityKey).slice(0, 180)
    );
    const current = backendContext.engagementSwimmerIdentitySnapshot(target.swimmer, target.source);
    if (!current.clubId || current.clubId !== context.clubId) {
      throw new backendContext.HttpsError("permission-denied", "Nageur hors perimetre club.");
    }
    const correction = backendContext.cleanEngagementSwimmerIdentityCorrection(request.data?.proposed || {}, current);
    const reason = backendContext.cleanText(request.data?.reason).slice(0, 500);
    if (!reason) throw new backendContext.HttpsError("invalid-argument", "Le motif de la demande est obligatoire.");
    const requestId = backendContext.stableHash([target.requestedSource, target.requestedSwimmerId, context.clubId].join("|")).slice(0, 40);
    const ref = backendContext.db.collection(backendContext.ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION).doc(requestId);
    const existing = await ref.get();
    if (existing.exists && backendContext.cleanText(existing.data()?.status) === "pending") {
      throw new backendContext.HttpsError("already-exists", "Une demande de correction est deja en attente pour ce nageur.");
    }
    const now = new Date().toISOString();
    const proposed = backendContext.engagementSwimmerIdentitySnapshot({ ...current, ...correction }, target.source);
    const payload = {
      id: requestId,
      requestType: "swimmer-change",
      status: "pending",
      requestedSource: target.requestedSource,
      requestedSwimmerId: target.requestedSwimmerId,
      targetSource: target.source,
      targetSwimmerId: target.swimmerId,
      current,
      proposed,
      reason,
      clubId: context.clubId,
      clubName: context.clubName,
      regionId: context.regionId,
      requestedAt: now,
      requestedBy: context.uid,
      requestedByEmail: context.email || "",
      requestedByFirstName: context.firstName || "",
      requestedByLastName: context.lastName || "",
      updatedAt: now,
      updatedBy: context.uid
    };
    const batch = backendContext.db.batch();
    batch.set(ref, payload, { merge: false });
    backendContext.setEngagementSwimmerChangeRequestRosterState(batch, target, "pending", requestId, now);
    await batch.commit();
    await backendContext.writeAuditLog("engagementClubSwimmer.changeRequested", context.uid, {
      requestId,
      swimmerId: target.swimmerId,
      source: target.source,
      clubId: context.clubId,
      reason,
      current,
      proposed
    });
    const created = await ref.get();
    return { ok: true, request: backendContext.engagementSwimmerChangeRequestItem(created) };
  }

  async function listEngagementSwimmerChangeRequests(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national) throw new backendContext.HttpsError("permission-denied", "Lecture reservee au niveau national.");
    const status = ["pending", "approved", "rejected"].includes(backendContext.cleanText(request.data?.status))
      ? backendContext.cleanText(request.data.status)
      : "pending";
    const limit = Math.min(100, Math.max(10, Math.trunc(Number(request.data?.limit) || 50)));
    const snapshot = await backendContext.db.collection(backendContext.ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION)
      .where("status", "==", status)
      .limit(limit)
      .get();
    const requests = snapshot.docs
      .map(backendContext.engagementSwimmerChangeRequestItem)
      .sort((left, right) => backendContext.cleanText(right.requestedAt).localeCompare(backendContext.cleanText(left.requestedAt)));
    return { ok: true, status, requests };
  }

  async function listEngagementNationalClubs(request) {
    const startedAt = Date.now();
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national) throw new backendContext.HttpsError("permission-denied", "Lecture des clubs reservee au niveau national.");
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        if(request.data?.deletionClubId!==undefined){const clubId=String(request.data.deletionClubId);return{ok:true,source:"nap",clubId,deletionEligible:Boolean(await require("./nap-club-provenance").eligibility(backendContext.db,clubId))};}
        const result=await require("./nap-club-directory").directory(require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD));
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

  async function saveEngagementNationalClub(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national) throw new backendContext.HttpsError("permission-denied", "Modification des clubs reservee au niveau national.");
    const requestedClubId = backendContext.cleanText(request.data?.clubId).slice(0, 40);
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      if(!requestedClubId) {
        try {return await require("./nap-club-create").create(require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{actorUid:context.uid,club:request.data?.club,creationId:request.data?.creationId},{
          read:async operation=>{const doc=await backendContext.db.collection("auditLogs").doc(`nap-club-create-${operation}-before`).get();return doc.exists?doc.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-club-create-${operation}-before`).create({action:"nap.clubCreate.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          checkpoint:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-club-create-${operation}-before`).update({target}),
          complete:async(operation,target)=>{await backendContext.writeAuditLogOnce("nap.clubCreate.complete",context.uid,{...target,auditPreparationId:`nap-club-create-${operation}-before`},`nap-club-create-${operation}-complete`);await require("./nap-club-provenance").record(backendContext.db,operation,target,context.uid);}
        },()=>{if(!context.national)throw new backendContext.HttpsError("permission-denied","Action nationale requise.");});}
        catch(error) {if(error instanceof backendContext.HttpsError)throw error;throw new backendContext.HttpsError(error instanceof TypeError?"failed-precondition":"unavailable",error instanceof TypeError?error.message:"Creation club NAP a verifier. Reprenez la meme action ; sauvegarde conservee.");}
      }
      try {return await require("./nap-club-change").edit(require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{clubId:requestedClubId,actorUid:context.uid,club:request.data?.club,expectedFingerprint:request.data?.expectedFingerprint,confirmFederalNumberChange:request.data?.confirmFederalNumberChange},{
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

  async function deleteEngagementNationalClub(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national) throw new backendContext.HttpsError("permission-denied", "Suppression des clubs reservee au niveau national.");
    if (request.data?.confirmPermanent !== true) {
      throw new backendContext.HttpsError("failed-precondition", "Confirmation de suppression definitive requise.");
    }
    const clubId = backendContext.cleanText(request.data?.clubId).slice(0, 40);
    if (!clubId) throw new backendContext.HttpsError("invalid-argument", "Club requis.");
    if(backendContext.ENVIRONMENT.sportingDataSource === "nap"){
      try{return await require("./nap-club-deletion").deleteClub(require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{clubId,actorUid:context.uid,confirmPermanent:true,expectedFingerprint:request.data?.expectedFingerprint},{
        creation:clubId=>require("./nap-club-provenance").creation(backendContext.db,clubId),
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

  async function setEngagementNationalClubSwimmerStatus(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national) {
      throw new backendContext.HttpsError("permission-denied", "Action reservee au niveau national.");
    }
    const swimmerId = backendContext.cleanText(request.data?.swimmerId).slice(0, 80);
    if (!swimmerId) {
      throw new backendContext.HttpsError("invalid-argument", "Nageur requis.");
    }
    const active = request.data?.active === true;
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        const pool=require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
        const id=require("./nap-direct-swimmer").swimmerId(swimmerId);
        const [rows]=await pool.execute({sql:"SELECT club FROM nageurs WHERE id=? LIMIT 1",timeout:10000},[id]);
        if(rows.length!==1) throw new TypeError("Nageur NAP introuvable.");
        return await require("./nap-swimmer-activity").change(pool,{id,clubId:String(rows[0].club),actorUid:context.uid,status:active?"active":"inactive",expectedFingerprint:request.data?.expectedFingerprint},{
          read:async operation=>{const doc=await backendContext.db.collection("auditLogs").doc(`nap-swimmer-activity-${operation}-before`).get();return doc.exists?doc.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-swimmer-activity-${operation}-before`).create({action:"nap.swimmerActivity.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          complete:(operation,target)=>backendContext.writeAuditLogOnce("nap.swimmerActivity.complete",context.uid,{...target,auditPreparationId:`nap-swimmer-activity-${operation}-before`},`nap-swimmer-activity-${operation}-complete`)
        });
      } catch(error) {throw new backendContext.HttpsError(error instanceof TypeError?"failed-precondition":"unavailable",error instanceof TypeError?error.message:"Statut NAP a verifier. Rechargez la fiche.");}
    }
    const ref = backendContext.db.collection("engagementClubSwimmers").doc(swimmerId);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      throw new backendContext.HttpsError("not-found", "Nageur introuvable.");
    }
    if (backendContext.cleanText(snapshot.data()?.status) === "merged" && active) {
      throw new backendContext.HttpsError("failed-precondition", "Un nageur fusionne ne peut pas etre reactive directement.");
    }
    const now = new Date().toISOString();
    const payload = {
      active,
      ...(active ? { status: "active" } : {}),
      updatedAt: now,
      updatedBy: context.uid,
      ...(active ? { reactivatedAt: now, reactivatedBy: context.uid } : { disabledAt: now, disabledBy: context.uid })
    };
    await ref.set(payload, { merge: true });
    await backendContext.writeAuditLog("engagementClubSwimmer.statusChanged", context.uid, {
      swimmerId,
      clubId: backendContext.cleanText(snapshot.data()?.clubId).slice(0, 40),
      active
    });
    const updated = await ref.get();
    return {
      ok: true,
      swimmer: backendContext.engagementNewSwimmerItem(updated)
    };
  }

  async function deleteEngagementNationalClubSwimmer(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national) {
      throw new backendContext.HttpsError("permission-denied", "Suppression reservee au niveau national.");
    }
    const swimmerId = backendContext.cleanText(request.data?.swimmerId).slice(0, 80);
    if (!swimmerId) {
      throw new backendContext.HttpsError("invalid-argument", "Nageur requis.");
    }
    if (request.data?.confirmPermanent !== true) {
      throw new backendContext.HttpsError("failed-precondition", "Confirmation de suppression definitive requise.");
    }
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        return await require("./nap-swimmer-deletion").deleteSwimmer(require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{
          swimmerId,actorUid:context.uid,confirmPermanent:true,expectedFingerprint:request.data?.expectedFingerprint,
          expectedActivityFingerprint:request.data?.expectedActivityFingerprint,expectedLicenseNumber:request.data?.expectedLicenseNumber
        },{
          read:async operation=>{const [saved,reservation]=await Promise.all([backendContext.db.collection("auditLogs").doc(`nap-swimmer-delete-${operation}-before`).get(),backendContext.db.collection("auditLogs").doc(`nap-swimmer-merge-person-${swimmerId}`).get()]);if(reservation.exists&&reservation.data().state==="pending")throw new TypeError("Une fusion de cette fiche doit etre terminee avant sa suppression.");return saved.exists?saved.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-swimmer-delete-${operation}-before`).create({action:"nap.swimmerDelete.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          complete:(operation,target)=>backendContext.writeAuditLogOnce("nap.swimmerDelete.complete",context.uid,{...target,auditPreparationId:`nap-swimmer-delete-${operation}-before`},`nap-swimmer-delete-${operation}-complete`)
        },()=>{if(!context.national)throw new backendContext.HttpsError("permission-denied","Suppression nationale requise.");});
      }catch(error){if(error instanceof backendContext.HttpsError)throw error;throw new backendContext.HttpsError(error instanceof TypeError||error instanceof RangeError?"failed-precondition":"unavailable",error instanceof TypeError||error instanceof RangeError?error.message:"Suppression NAP a verifier. Reprenez la meme action ; sauvegarde conservee.");}
    }
    const ref = backendContext.db.collection("engagementClubSwimmers").doc(swimmerId);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      throw new backendContext.HttpsError("not-found", "Nageur introuvable.");
    }
    const swimmer = snapshot.data() || {};
    const usage = await backendContext.engagementClubSwimmerDeletionUsage(swimmerId, swimmer, {
      ...context,
      clubId: backendContext.cleanText(swimmer.clubId).slice(0, 40)
    });
    if (usage.performanceMatchCount > 0 || usage.entryUsageCount > 0 || usage.entryScanTruncated) {
      throw new backendContext.HttpsError("failed-precondition", "Ce nageur est utilise dans l'historique. Il doit etre desactive plutot que supprime.", usage);
    }
    const deleted = await backendContext.deleteEngagementClubSwimmerPermanently(ref, snapshot, context, "national");
    return {
      ok: true,
      ...deleted
    };
  }

  async function searchEngagementNationalSwimmerMergeTargets(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national) {
      throw new backendContext.HttpsError("permission-denied", "Recherche reservee au niveau national.");
    }
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        const pool = require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
        return await require("./nap-swimmer-merge-search").searchMergeTargets(pool, {sourceSwimmerId:request.data?.sourceSwimmerId,query:request.data?.query});
      } catch (error) {
        throw new backendContext.HttpsError(error instanceof TypeError ? "invalid-argument" : "unavailable", "Recherche NAP indisponible. Precisez le nom, le prenom ou l'identifiant de la fiche a conserver.");
      }
    }
    const sourceSwimmerId = backendContext.cleanText(request.data?.sourceSwimmerId).slice(0, 80);
    const sourceSource = backendContext.cleanText(request.data?.sourceSource || "engagement").slice(0, 40);
    const query = backendContext.cleanText(request.data?.query).slice(0, 100);
    const limit = Math.min(40, Math.max(5, Math.trunc(Number(request.data?.limit) || 20)));
    const source = await backendContext.getEngagementNationalSwimmerForMerge(backendContext.db, sourceSource, sourceSwimmerId);
    const sourceKey = `${source.source}:${sourceSwimmerId}`;
    const swimmers = (query
      ? await backendContext.searchEngagementNationalSwimmerDocs(backendContext.db, query, limit + 1)
      : (await backendContext.searchEngagementNationalSwimmerMergeTargetDocs(backendContext.db, source.swimmer, query, limit + 1))
        .map((item) => backendContext.engagementNationalSwimmerItemFromDoc(item.doc, item.source)))
      .filter((swimmer) => `${swimmer.source || "performances"}:${swimmer.id || swimmer.swimmerIndexId}` !== sourceKey)
      .filter((swimmer) => swimmer.status !== "merged" && !swimmer.mergedIntoId)
      .slice(0, limit);
    return {
      ok: true,
      swimmers
    };
  }

  async function listEngagementNationalClubPeople(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national) {
      throw new backendContext.HttpsError("permission-denied", "Lecture reservee au niveau national.");
    }
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {return await require("./nap-club-people").readNationalPeople(require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{cursor:request.data?.cursor},()=>{if(!context.national) throw new backendContext.HttpsError("permission-denied","Lecture nationale requise.");});}
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

  async function setEngagementNationalClubPersonStatus(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national) {
      throw new backendContext.HttpsError("permission-denied", "Action reservee au niveau national.");
    }
    const personId = backendContext.cleanText(request.data?.personId).slice(0, 80);
    if (!personId) {
      throw new backendContext.HttpsError("invalid-argument", "Personne requise.");
    }
    const active = request.data?.active === true;
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        const statusService=require("./nap-club-person-status");
        const ref=statusService.reference(personId),spec=require("./nap-club-people").SOURCES[ref.kind];
        const pool=require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
        const [rows]=await pool.execute({sql:`SELECT club FROM \`${spec.table}\` WHERE id=? LIMIT 1`,timeout:10000},[ref.id]);
        if(rows.length!==1) throw new TypeError("Personne NAP introuvable.");
        const clubId=String(rows[0].club);
        const result=await statusService.changeNativePersonStatus(pool,{personId,clubId,actorUid:context.uid,active,expectedFingerprint:request.data?.expectedFingerprint},{
          read:async operation=>{const doc=await backendContext.db.collection("auditLogs").doc(`nap-person-status-${operation}-before`).get();return doc.exists?doc.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-person-status-${operation}-before`).create({action:"nap.personStatus.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          complete:(operation,target)=>backendContext.writeAuditLogOnce("nap.personStatus.complete",context.uid,{...target,auditPreparationId:`nap-person-status-${operation}-before`},`nap-person-status-${operation}-complete`)
        },scope=>{if(!context.national || scope.clubId!==clubId) throw new backendContext.HttpsError("permission-denied","Personne hors perimetre.");});
        return result;
      } catch(error) {if(error instanceof backendContext.HttpsError) throw error;throw new backendContext.HttpsError(error instanceof TypeError?"failed-precondition":"unavailable",error instanceof TypeError?error.message:"Statut NAP a verifier. Rechargez la fiche.");}
    }
    const ref = backendContext.db.collection("engagementClubPeople").doc(personId);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      throw new backendContext.HttpsError("not-found", "Personne introuvable.");
    }
    if (backendContext.cleanText(snapshot.data()?.status) === "merged" && active) {
      throw new backendContext.HttpsError("failed-precondition", "Une personne fusionnee ne peut pas etre reactivee directement.");
    }
    const now = new Date().toISOString();
    const payload = {
      active,
      updatedAt: now,
      updatedBy: context.uid,
      ...(active ? { reactivatedAt: now, reactivatedBy: context.uid } : { disabledAt: now, disabledBy: context.uid })
    };
    const batch = backendContext.db.batch();
    batch.set(ref, payload, { merge: true });
    backendContext.upsertEngagementClubPeopleRosterPerson(batch, backendContext.db, backendContext.engagementClubPersonItem({
      id: ref.id,
      data: () => ({ ...(snapshot.data() || {}), ...payload })
    }), now);
    await batch.commit();
    await backendContext.writeAuditLog("engagementClubPerson.nationalStatusChanged", context.uid, {
      personId,
      firstName: backendContext.cleanText(snapshot.data()?.firstName).slice(0, 80),
      lastName: backendContext.cleanText(snapshot.data()?.lastName).slice(0, 80),
      clubId: backendContext.cleanText(snapshot.data()?.clubId).slice(0, 40),
      active
    });
    const updated = await ref.get();
    return {
      ok: true,
      person: backendContext.engagementClubPersonItem(updated)
    };
  }

  async function deleteEngagementNationalClubPerson(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national) {
      throw new backendContext.HttpsError("permission-denied", "Suppression reservee au niveau national.");
    }
    const personId = backendContext.cleanText(request.data?.personId).slice(0, 80);
    if (!personId) {
      throw new backendContext.HttpsError("invalid-argument", "Personne requise.");
    }
    if (request.data?.confirmPermanent !== true) {
      throw new backendContext.HttpsError("failed-precondition", "Confirmation de suppression definitive requise.");
    }
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        return await require("./nap-person-deletion").deletePerson(require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{personId,actorUid:context.uid,confirmPermanent:true,expectedFingerprint:request.data?.expectedFingerprint},{
          read:async operation=>{const doc=await backendContext.db.collection("auditLogs").doc(`nap-person-delete-${operation}-before`).get();return doc.exists?doc.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-person-delete-${operation}-before`).create({action:"nap.personDelete.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          complete:(operation,target)=>backendContext.writeAuditLogOnce("nap.personDelete.complete",context.uid,{...target,auditPreparationId:`nap-person-delete-${operation}-before`},`nap-person-delete-${operation}-complete`)
        },()=>{if(!context.national) throw new backendContext.HttpsError("permission-denied","Suppression nationale requise.");});
      } catch(error) {if(error instanceof backendContext.HttpsError) throw error;throw new backendContext.HttpsError(error instanceof TypeError?"failed-precondition":"unavailable",error instanceof TypeError?error.message:"Suppression NAP a verifier. Rechargez la fiche ; sauvegarde conservee.");}
    }
    const ref = backendContext.db.collection("engagementClubPeople").doc(personId);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      throw new backendContext.HttpsError("not-found", "Personne introuvable.");
    }
    const data = snapshot.data() || {};
    const batch = backendContext.db.batch();
    batch.delete(ref);
    backendContext.deleteEngagementClubPeopleRosterPerson(batch, backendContext.db, { ...data, id: personId });
    await batch.commit();
    await backendContext.writeAuditLog("engagementClubPerson.nationalDeleted", context.uid, {
      personId,
      firstName: backendContext.cleanText(data.firstName).slice(0, 80),
      lastName: backendContext.cleanText(data.lastName).slice(0, 80),
      clubId: backendContext.cleanText(data.clubId).slice(0, 40),
      roles: data.roles || {}
    });
    return {
      ok: true,
      personId
    };
  }

  async function listEngagementNationalAuditLogs(request) {
    const context = await backendContext.auditManagementContext(request);
    const limit = Math.min(backendContext.AUDIT_PAGE_LIMIT, Math.max(20, Math.trunc(Number(request.data?.limit) || backendContext.AUDIT_PAGE_LIMIT)));
    const requestedDays = [7, 30, 90, 365].includes(Math.trunc(Number(request.data?.days)))
      ? Math.trunc(Number(request.data.days))
      : 30;
    const requestedCutoff = new Date(Date.now() - requestedDays * 24 * 60 * 60 * 1000).toISOString();
    const visibleFrom = requestedCutoff > backendContext.AUDIT_LEGACY_VISIBLE_SINCE ? requestedCutoff : backendContext.AUDIT_LEGACY_VISIBLE_SINCE;
    const actorUid = backendContext.cleanText(request.data?.actorUid).slice(0, 160);
    const clubId = backendContext.cleanText(request.data?.clubId).slice(0, 80);
    const cursorCreatedAt = backendContext.cleanText(request.data?.cursor?.createdAt).slice(0, 40);
    const cursorId = backendContext.cleanText(request.data?.cursor?.id).slice(0, 160);

    let query = backendContext.db.collection("auditLogs").where("createdAt", ">=", visibleFrom);
    if (actorUid) query = query.where("actorUid", "==", actorUid);
    if (clubId) query = query.where("target.clubId", "==", clubId);
    query = query.orderBy("createdAt", "desc").orderBy(backendContext.FieldPath.documentId(), "desc");
    if (cursorCreatedAt && cursorId) query = query.startAfter(cursorCreatedAt, cursorId);
    const snapshot = await query.limit(limit + 1).get();
    const pageDocuments = snapshot.docs.slice(0, limit);
    const hasMore = snapshot.docs.length > limit;
    const rawLogs = pageDocuments.map((doc) => {
      const data = doc.data() || {};
      return backendContext.cleanFirestoreValue({
        id: doc.id,
        action: backendContext.cleanText(data.action).slice(0, 120),
        actorUid: backendContext.cleanText(data.actorUid).slice(0, 160),
        createdAt: backendContext.cleanText(data.createdAt).slice(0, 40),
        target: typeof data.target === "object" && data.target ? data.target : {}
      });
    });
    const journal = await require("./activity-journal").projectPage(rawLogs, async (ids) => {
      const documents = await backendContext.db.getAll(...ids.map((id) => backendContext.db.collection("auditLogs").doc(id)));
      return documents.filter((doc) => doc.exists).map((doc) => ({ id: doc.id, ...doc.data() }));
    });
    const logs = journal.logs;
    const knownActorUids = new Set((Array.isArray(request.data?.knownActorUids) ? request.data.knownActorUids : [])
      .slice(0, 100)
      .map((value) => backendContext.cleanText(value).slice(0, 160))
      .filter(Boolean));
    const actorUidsToResolve = Array.from(new Set(logs
      .map((log) => log.actorUid)
      .filter((uid) => uid && !knownActorUids.has(uid) && !uid.startsWith("system:") && uid !== "public-login-page")))
      .slice(0, backendContext.AUDIT_ACTOR_RESOLUTION_LIMIT);
    const actorSnapshots = actorUidsToResolve.length
      ? await backendContext.db.getAll(...actorUidsToResolve.map((uid) => backendContext.db.collection("users").doc(uid)))
      : [];
    const unresolvedAuthUids = actorSnapshots
      .filter((actorSnapshot) => {
        const data = actorSnapshot.exists ? actorSnapshot.data() || {} : {};
        return !backendContext.displayNameFromProfile(data) && !backendContext.cleanText(data.email);
      })
      .map((actorSnapshot) => actorSnapshot.id);
    const authUsers = unresolvedAuthUids.length
      ? await backendContext.auth.getUsers(unresolvedAuthUids.map((uid) => ({ uid }))).catch(() => ({ users: [] }))
      : { users: [] };
    const authUsersByUid = new Map(authUsers.users.map((user) => [user.uid, user]));
    const actors = actorSnapshots.map((actorSnapshot) => {
      const data = actorSnapshot.exists ? actorSnapshot.data() || {} : {};
      const authUser = authUsersByUid.get(actorSnapshot.id);
      return {
        uid: actorSnapshot.id,
        name: backendContext.displayNameFromProfile(data) || backendContext.cleanText(authUser?.displayName).slice(0, 160),
        email: (backendContext.cleanText(data.email) || backendContext.cleanText(authUser?.email)).slice(0, 180)
      };
    });
    const knownCompetitionIds = new Set((Array.isArray(request.data?.knownCompetitionIds) ? request.data.knownCompetitionIds : [])
      .slice(0, 100)
      .map((value) => backendContext.cleanText(value).slice(0, 128))
      .filter(Boolean));
    const competitionIdsToResolve = Array.from(new Set(logs
      .map((log) => backendContext.cleanText(log.target?.competitionId).slice(0, 128))
      .filter((competitionId) => competitionId && !knownCompetitionIds.has(competitionId))))
      .slice(0, backendContext.AUDIT_COMPETITION_RESOLUTION_LIMIT);
    const competitionSnapshots = competitionIdsToResolve.length
      ? await backendContext.db.getAll(...competitionIdsToResolve.map((competitionId) => backendContext.db.collection("engagementCompetitions").doc(competitionId)))
      : [];
    const competitions = competitionSnapshots.map((competitionSnapshot) => {
      const data = competitionSnapshot.exists ? competitionSnapshot.data() || {} : {};
      return {
        id: competitionSnapshot.id,
        name: backendContext.cleanText(data.name || data.title).slice(0, 180),
        date: backendContext.cleanText(data.date).slice(0, 20)
      };
    });
    const knownPersonIds = new Set((Array.isArray(request.data?.knownPersonIds) ? request.data.knownPersonIds : [])
      .slice(0, 100)
      .map((value) => backendContext.cleanText(value).slice(0, 80))
      .filter(Boolean));
    const personIdsToResolve = Array.from(new Set(logs
      .map((log) => backendContext.cleanText(log.target?.personId).slice(0, 80))
      .filter((personId) => personId && !knownPersonIds.has(personId))))
      .slice(0, backendContext.AUDIT_PERSON_RESOLUTION_LIMIT);
    const personSnapshots = personIdsToResolve.length
      ? await backendContext.db.getAll(...personIdsToResolve.map((personId) => backendContext.db.collection("engagementClubPeople").doc(personId)))
      : [];
    const people = personSnapshots.map((personSnapshot) => {
      const data = personSnapshot.exists ? personSnapshot.data() || {} : {};
      return {
        id: personSnapshot.id,
        name: backendContext.displayNameFromProfile(data),
        licenseNumber: backendContext.cleanText(data.licenseNumber).slice(0, 60)
      };
    });
    const lastDocument = pageDocuments.at(-1);
    return {
      ok: true,
      logs,
      actors,
      competitions,
      people,
      hasMore,
      nextCursor: hasMore && lastDocument
        ? { id: lastDocument.id, createdAt: backendContext.cleanText(lastDocument.data()?.createdAt).slice(0, 40) }
        : null,
      visibleFrom,
      readBudget: {
        auditDocuments: snapshot.docs.length,
        counterpartDocuments: journal.counterpartDocuments,
        actorDocuments: actorSnapshots.length,
        competitionDocuments: competitionSnapshots.length,
        personDocuments: personSnapshots.length,
        profileDocuments: context.profileReadCount,
        maximumDocuments: 2 * limit + 1 + backendContext.AUDIT_ACTOR_RESOLUTION_LIMIT + backendContext.AUDIT_COMPETITION_RESOLUTION_LIMIT + backendContext.AUDIT_PERSON_RESOLUTION_LIMIT + 1
      }
    };
  }

  async function mergeEngagementNationalClubPerson(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national) {
      throw new backendContext.HttpsError("permission-denied", "Fusion reservee au niveau national.");
    }
    const sourcePersonId = backendContext.cleanText(request.data?.sourcePersonId).slice(0, 80);
    const targetPersonId = backendContext.cleanText(request.data?.targetPersonId).slice(0, 80);
    if (!sourcePersonId || !targetPersonId || sourcePersonId === targetPersonId) {
      throw new backendContext.HttpsError("invalid-argument", "Personnes source et cible requises.");
    }
    if (request.data?.confirmMerge !== true) {
      throw new backendContext.HttpsError("failed-precondition", "Confirmation de fusion requise.");
    }
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        return await require("./nap-person-merge").mergePeople(require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{sourcePersonId,targetPersonId,actorUid:context.uid,confirmMerge:true,confirmClubMismatch:request.data?.confirmClubMismatch===true,sourceFingerprint:request.data?.sourceFingerprint,targetFingerprint:request.data?.targetFingerprint},{
          read:async operation=>{const doc=await backendContext.db.collection("auditLogs").doc(`nap-person-merge-${operation}-before`).get();return doc.exists?doc.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-person-merge-${operation}-before`).create({action:"nap.personMerge.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          complete:(operation,target)=>backendContext.writeAuditLogOnce("nap.personMerge.complete",context.uid,{...target,auditPreparationId:`nap-person-merge-${operation}-before`},`nap-person-merge-${operation}-complete`)
        },()=>{if(!context.national)throw new backendContext.HttpsError("permission-denied","Fusion nationale requise.");});
      }catch(error){if(error instanceof backendContext.HttpsError)throw error;throw new backendContext.HttpsError(error instanceof TypeError?"failed-precondition":"unavailable",error instanceof TypeError?error.message:"Fusion NAP a verifier. Rechargez les fiches ; sauvegarde conservee.");}
    }
    const sourceRef = backendContext.db.collection("engagementClubPeople").doc(sourcePersonId);
    const targetRef = backendContext.db.collection("engagementClubPeople").doc(targetPersonId);
    const [sourceSnapshot, targetSnapshot] = await backendContext.db.getAll(sourceRef, targetRef);
    if (!sourceSnapshot.exists || !targetSnapshot.exists) {
      throw new backendContext.HttpsError("not-found", "Personne source ou cible introuvable.");
    }
    const sourcePerson = backendContext.engagementClubPersonItem(sourceSnapshot);
    const targetPerson = backendContext.engagementClubPersonItem(targetSnapshot);
    if (sourcePerson.status === "merged" || sourcePerson.mergedIntoId) {
      throw new backendContext.HttpsError("failed-precondition", "Cette personne est deja fusionnee.");
    }
    if (targetPerson.status === "merged" || targetPerson.mergedIntoId) {
      throw new backendContext.HttpsError("failed-precondition", "La personne cible est deja fusionnee vers une autre fiche.");
    }
    if (!sourcePerson.clubId || !targetPerson.clubId) {
      throw new backendContext.HttpsError("failed-precondition", "Club source et club cible requis pour fusionner.");
    }
    const clubMismatch = sourcePerson.clubId !== targetPerson.clubId;
    if (clubMismatch && request.data?.confirmClubMismatch !== true) {
      throw new backendContext.HttpsError("failed-precondition", "Les clubs sont differents. Confirmation speciale requise.", {
        code: "club-mismatch"
      });
    }
    const licenseMismatch = Boolean(sourcePerson.licenseNumber && targetPerson.licenseNumber && sourcePerson.licenseNumber !== targetPerson.licenseNumber);
    if (licenseMismatch && request.data?.confirmLicenseMismatch !== true) {
      throw new backendContext.HttpsError("failed-precondition", "Les numeros de licence sont differents. Confirmation speciale requise.", {
        code: "license-mismatch"
      });
    }
    const now = new Date().toISOString();
    const targetRoles = targetSnapshot.data()?.roles || {};
    const sourceRoles = sourceSnapshot.data()?.roles || {};
    const targetPayload = {
      roles: {
        swimmer: targetRoles.swimmer === true || sourceRoles.swimmer === true || Boolean(targetPerson.swimmerIndexId || sourcePerson.swimmerIndexId),
        official: targetRoles.official === true || sourceRoles.official === true,
        teamLeader: targetRoles.teamLeader === true || sourceRoles.teamLeader === true
      },
      swimmerIndexId: targetPerson.swimmerIndexId || sourcePerson.swimmerIndexId || "",
      swimmerSource: targetPerson.swimmerSource || sourcePerson.swimmerSource || "",
      birthDate: targetPerson.birthDate || sourcePerson.birthDate || "",
      sex: targetPerson.sex || sourcePerson.sex || "",
      identityKey: targetPerson.identityKey || sourcePerson.identityKey || "",
      active: true,
      status: "active",
      mergedSourceIds: backendContext.FieldValue.arrayUnion(sourcePersonId),
      updatedAt: now,
      updatedBy: context.uid
    };
    const sourcePayload = {
      active: false,
      status: "merged",
      mergedIntoId: targetPersonId,
      mergedIntoName: backendContext.engagementClubPersonFullName(targetPerson),
      mergedAt: now,
      mergedBy: context.uid,
      updatedAt: now,
      updatedBy: context.uid
    };
    const targetEntrySnapshot = backendContext.engagementClubPersonEntrySnapshot({ ...targetPerson, id: targetPersonId });
    const entriesSnapshot = await backendContext.db.collection("engagementClubEntries")
      .where("clubId", "==", sourcePerson.clubId)
      .limit(300)
      .get();
    const batch = backendContext.db.batch();
    batch.set(targetRef, targetPayload, { merge: true });
    batch.set(sourceRef, sourcePayload, { merge: true });
    backendContext.upsertEngagementClubPeopleRosterPerson(batch, backendContext.db, { ...targetPerson, ...targetPayload, id: targetPersonId }, now);
    backendContext.deleteEngagementClubPeopleRosterPerson(batch, backendContext.db, { ...sourcePerson, id: sourcePersonId }, now);
    let teamLeaderUpdateCount = 0;
    let officialsUpdateCount = 0;
    entriesSnapshot.docs.forEach((entryDoc) => {
      const entry = entryDoc.data() || {};
      const updates = {};
      const teamLeader = entry.teamLeader || {};
      if (backendContext.cleanText(teamLeader.personId).slice(0, 80) === sourcePersonId) {
        updates.teamLeader = {
          ...teamLeader,
          ...targetEntrySnapshot,
          mode: "person",
          externalClub: targetPerson.clubId !== backendContext.cleanText(entry.clubId),
          clubId: targetPerson.clubId,
          clubName: targetPerson.clubName
        };
        teamLeaderUpdateCount += 1;
      }
      const officialsResult = backendContext.mergeEngagementClubEntryOfficials(entry.officials || [], sourcePersonId, targetEntrySnapshot);
      if (officialsResult.changed) {
        updates.officials = officialsResult.officials;
        officialsUpdateCount += 1;
      }
      if (Object.keys(updates).length) {
        batch.set(entryDoc.ref, {
          ...updates,
          updatedAt: now,
          updatedBy: context.uid
        }, { merge: true });
      }
    });
    await batch.commit();
    await backendContext.writeAuditLog("engagementClubPerson.nationalMerged", context.uid, {
      sourcePersonId,
      sourcePersonName: backendContext.engagementClubPersonFullName(sourcePerson),
      targetPersonId,
      targetPersonName: backendContext.engagementClubPersonFullName(targetPerson),
      sourceClubId: sourcePerson.clubId,
      targetClubId: targetPerson.clubId,
      clubMismatch,
      licenseMismatch,
      scannedEntryCount: entriesSnapshot.size,
      teamLeaderUpdateCount,
      officialsUpdateCount
    });
    const updatedTarget = await targetRef.get();
    const updatedSource = await sourceRef.get();
    return {
      ok: true,
      source: backendContext.engagementClubPersonItem(updatedSource),
      target: backendContext.engagementClubPersonItem(updatedTarget),
      scannedEntryCount: entriesSnapshot.size,
      teamLeaderUpdateCount,
      officialsUpdateCount
    };
  }

  return { getNationalFeaturedDocuments, saveNationalFeaturedDocuments, searchEngagementNationalSwimmers, requestEngagementClubSwimmerChange, listEngagementSwimmerChangeRequests, listEngagementNationalClubs, saveEngagementNationalClub, deleteEngagementNationalClub, setEngagementNationalClubSwimmerStatus, deleteEngagementNationalClubSwimmer, searchEngagementNationalSwimmerMergeTargets, listEngagementNationalClubPeople, setEngagementNationalClubPersonStatus, deleteEngagementNationalClubPerson, listEngagementNationalAuditLogs, mergeEngagementNationalClubPerson };
}

module.exports = { createNationalHandlers };
