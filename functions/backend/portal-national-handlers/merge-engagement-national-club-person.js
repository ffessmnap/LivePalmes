// Existing operation bodies; live services arrive through explicit accessors.
function createNationalHandlers_mergeEngagementNationalClubPerson(backendContext) {
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
        return await require("../../nap-person-merge").mergePeople(require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{sourcePersonId,targetPersonId,actorUid:context.uid,confirmMerge:true,confirmClubMismatch:request.data?.confirmClubMismatch===true,sourceFingerprint:request.data?.sourceFingerprint,targetFingerprint:request.data?.targetFingerprint},{
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

  return { mergeEngagementNationalClubPerson };
}

module.exports = { createNationalHandlers_mergeEngagementNationalClubPerson };
