// Existing operation bodies; live services arrive through explicit accessors.
function createClubHandlers_saveEngagementClubPerson(backendContext) {
  async function saveEngagementClubPerson(request) {
    const context = await backendContext.engagementClubAccessContext(request);
    if(backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        if(request.data?.roles) {
          return await require("../../nap-club-person-status").changeNativePersonStatus(require("../../nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{
            clubId:String(context.clubId),actorUid:context.uid,personId:request.data.personId,expectedFingerprint:request.data.expectedFingerprint,active:request.data.active,roles:request.data.roles
          },{
            read:async operation=>{const snapshot=await backendContext.db.collection("auditLogs").doc(`nap-person-roles-${operation}-before`).get();return snapshot.exists?snapshot.data().target:null;},
            prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-person-roles-${operation}-before`).create({action:"nap.person.roles.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
            complete:(operation,target)=>backendContext.writeAuditLogOnce("nap.person.roles.changed",context.uid,target,operation)
          },scope=>{if(scope.clubId!==String(context.clubId)) throw new backendContext.HttpsError("permission-denied","Personne hors club.");});
        }
        if (!backendContext.cleanText(request.data?.personId)) {
          return await require("../../nap-club-person-create").createNativePerson(require("../../nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD), {
            clubId:String(context.clubId), actorUid:context.uid, creationId:request.data?.creationId, person:request.data?.person
          }, {
            read:async operation=>{const snapshot=await backendContext.db.collection("auditLogs").doc(`nap-person-create-${operation}-before`).get();return snapshot.exists?snapshot.data().target:null;},
            prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-person-create-${operation}-before`).create({action:"nap.person.create.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
            checkpoint:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-person-create-${operation}-before`).update({target}),
            complete:(operation,target)=>backendContext.writeAuditLogOnce("engagementClubPerson.created",context.uid,{...target,auditPreparationId:`nap-person-create-${operation}-before`},operation)
          },scope=>{if(scope.clubId!==String(context.clubId)) throw new backendContext.HttpsError("permission-denied","Personne hors club.");});
        }
        return await require("../../nap-club-person-edit").editNativePerson(require("../../nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{
          clubId:String(context.clubId),actorUid:context.uid,personId:request.data?.personId,
          expectedFingerprint:request.data?.expectedFingerprint,patch:request.data?.patch
        },{
          read:async operation=>{const snapshot=await backendContext.db.collection("auditLogs").doc(`nap-person-identity-${operation}-before`).get();return snapshot.exists?snapshot.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-person-identity-${operation}-before`).create({action:"nap.person.identity.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          complete:(operation,target)=>backendContext.writeAuditLogOnce("engagementClubPerson.saved",context.uid,{...target,auditPreparationId:`nap-person-identity-${operation}-before`},operation)
        },scope=>{if(scope.clubId!==String(context.clubId)) throw new backendContext.HttpsError("permission-denied","Personne hors club.");});
      } catch(error) {
        if(error instanceof backendContext.HttpsError) throw error;
        throw new backendContext.HttpsError(error instanceof TypeError || error instanceof RangeError?"failed-precondition":"unavailable",error instanceof TypeError || error instanceof RangeError?error.message:"Correction NAP a verifier. Reprenez la meme action ; la sauvegarde est conservee.");
      }
    }
    const personId = backendContext.cleanText(request.data?.personId).slice(0, 80);
    const rawPerson = request.data?.person || {};
    const linkedSwimmer = await backendContext.resolveEngagementClubPersonSwimmer(backendContext.db, context, rawPerson);
    const person = backendContext.cleanEngagementClubPerson(linkedSwimmer ? {
      ...rawPerson,
      firstName: linkedSwimmer.firstName,
      lastName: linkedSwimmer.lastName,
      licenseNumber: linkedSwimmer.licenseNumber,
      swimmerIndexId: linkedSwimmer.swimmerIndexId,
      swimmerSource: linkedSwimmer.source,
      birthDate: linkedSwimmer.birthDate,
      sex: linkedSwimmer.sex,
      identityKey: linkedSwimmer.identityKey
    } : rawPerson, context);
    const docId = personId || backendContext.stableHash(`${context.clubId}|${person.licenseNumber}`).slice(0, 40);
    const ref = backendContext.db.collection("engagementClubPeople").doc(docId);
    const [snapshot, peopleRosterSnapshot] = await Promise.all([
      ref.get(),
      backendContext.engagementClubPeopleRosterRef(backendContext.db, context.clubId).get()
    ]);
    if (snapshot.exists && backendContext.cleanText(snapshot.data()?.clubId) !== context.clubId) {
      throw new backendContext.HttpsError("permission-denied", "Personne hors perimetre club.");
    }
    if (!personId && snapshot.exists) {
      backendContext.throwEngagementClubPersonIdentityConflict({ type: "license", person: backendContext.engagementClubPersonItem(snapshot) });
    }
    if (peopleRosterSnapshot.exists) {
      const conflict = backendContext.engagementClubPersonIdentityConflict(
        backendContext.engagementClubPeopleRosterPeopleFromData(peopleRosterSnapshot.data() || {}),
        person,
        personId
      );
      if (conflict) backendContext.throwEngagementClubPersonIdentityConflict(conflict);
    }
    if (!personId && person.roles.teamLeader && await backendContext.engagementClubPersonOutsideClubConflict(person, context.clubId)) {
      throw new backendContext.HttpsError("failed-precondition", "Cette personne existe déjà dans un autre club. Déclarez-la comme chef d'équipe hors club.", {
        outsideClubExistingPerson: true
      });
    }
    const now = new Date().toISOString();
    const payload = {
      ...person,
      updatedAt: now,
      updatedBy: context.uid,
      ...(snapshot.exists ? {} : { createdAt: now, createdBy: context.uid })
    };
    const batch = backendContext.db.batch();
    batch.set(ref, payload, { merge: true });
    backendContext.upsertEngagementClubPeopleRosterPerson(batch, backendContext.db, { ...payload, id: docId }, now);
    await batch.commit();
    await backendContext.writeAuditLog("engagementClubPerson.saved", context.uid, {
      personId: docId,
      firstName: person.firstName,
      lastName: person.lastName,
      clubId: context.clubId,
      licenseNumber: person.licenseNumber,
      roles: person.roles
    });
    return {
      ok: true,
      person: backendContext.engagementClubPersonItem({ id: ref.id, exists: true, data: () => ({ ...(snapshot.data() || {}), ...payload }) })
    };
  }

  return { saveEngagementClubPerson };
}

module.exports = { createClubHandlers_saveEngagementClubPerson };
