// Existing operation bodies; live services arrive through explicit accessors.
function createClubHandlers_saveEngagementClubTeamLeader(backendContext) {
  async function saveEngagementClubTeamLeader(request) {
    const context = await backendContext.engagementClubAccessContext(request);
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    if (!competitionId) {
      throw new backendContext.HttpsError("invalid-argument", "Competition requise.");
    }
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        const pool = require("../../nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
        const saveLeader = request.data?.leaderId == null || request.data.leaderId === ""
          ? require("../../nap-team-leader-create").createNativeTeamLeader
          : require("../../nap-team-leader-change").editNativeTeamLeader;
        const result = await saveLeader(pool, {
          competitionId, clubId: String(context.clubId), actorUid: context.uid,
          leaderId: request.data?.leaderId, expectedFingerprint: request.data?.expectedFingerprint, patch: request.data?.patch
        }, {
          read: async operation => { const snapshot = await backendContext.db.collection("auditLogs").doc(`nap-team-leader-${operation}-before`).get(); return snapshot.exists ? snapshot.data().target : null; },
          prepare: (operation, target) => backendContext.db.collection("auditLogs").doc(`nap-team-leader-${operation}-before`).create({ action: "nap.teamLeader.change.prepare", actorUid: context.uid, target, createdAt: new Date().toISOString() }),
          checkpoint: (operation, target) => backendContext.db.collection("auditLogs").doc(`nap-team-leader-${operation}-before`).update({ target, updatedAt: new Date().toISOString() }),
          complete: (operation, target) => backendContext.writeAuditLogOnce("engagementClubEntry.teamLeaderSaved", context.uid,{...target,auditPreparationId:`nap-team-leader-${operation}-before`}, operation)
        }, event => backendContext.assertEngagementClubWriteOpen(event));
        const competition = await backendContext.nativePortalCompetition(competitionId, () => {});
        const pack = await require("../../nap-portal-entries").readNativeClubEntry(pool, { competitionId, clubId: context.clubId }, () => {});
        return { ...result, competition: { ...competition, nativeTeamLeaderEditable: pack.leaders.length <= 1, nativeTeamLeaderRequired: pack.leaders.length === 0, nativeRelaysEditable: competition.competitionType === "pool" && pack.leaders.length === 1 && !require("../../nap-swimmer-entry-plan").selectionLockReason(competition), nativeOfficialsEditable: pack.leaders.length === 1 && new Set((pack.officials || []).map(row=>String(row.officiel))).size<=80, nativeIndividualEntriesEditable: pack.leaders.length === 1 && !require("../../nap-entry-course-rules").courseLockReason(competition), nativeSwimmerSelectionEditable: pack.leaders.length === 1 && !require("../../nap-swimmer-entry-plan").selectionLockReason(competition) }, entry: await backendContext.nativeClubEntryView(pack,context,competition) };
      } catch (error) {
        if (error instanceof backendContext.HttpsError) throw error;
        throw new backendContext.HttpsError(error instanceof TypeError ? "failed-precondition" : error instanceof RangeError ? "resource-exhausted" : "unavailable", error instanceof TypeError || error instanceof RangeError ? error.message : "Modification NAP a verifier. Reprenez la meme correction ; la sauvegarde est conservee.");
      }
    }
    const competition = await backendContext.db.collection("engagementCompetitions").doc(competitionId).get();
    if (!competition.exists) {
      throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    }
    backendContext.assertEngagementClubWriteOpen(competition.data() || {});
    const rawTeamLeader = backendContext.cleanEngagementTeamLeader(request.data?.teamLeader || {});
    let personRef = null;
    let person = null;
    if (rawTeamLeader.mode === "person" && !rawTeamLeader.externalClub && rawTeamLeader.personId) {
      personRef = backendContext.db.collection("engagementClubPeople").doc(rawTeamLeader.personId);
      const personSnapshot = await personRef.get();
      if (!personSnapshot.exists) {
        throw new backendContext.HttpsError("not-found", "Membre du club introuvable.");
      }
      person = backendContext.engagementClubPersonItem(personSnapshot);
      if (person.clubId !== context.clubId || person.active === false) {
        throw new backendContext.HttpsError("permission-denied", "Membre hors perimetre club ou inactif.");
      }
      if (!person.birthDate || !person.sex) {
        throw new backendContext.HttpsError("failed-precondition", "Completez la date de naissance et le sexe de ce membre avant de le choisir comme chef d'equipe.");
      }
    }
    const teamLeader = rawTeamLeader.mode === "person" && !rawTeamLeader.externalClub
      ? {
          ...rawTeamLeader,
          ...(person ? {
            personId: person.id,
            firstName: person.firstName,
            lastName: person.lastName,
            birthDate: person.birthDate,
            sex: person.sex,
            licenseNumber: person.licenseNumber
          } : {}),
          clubId: context.clubId,
          clubName: context.clubName
        }
      : rawTeamLeader;
    if (!backendContext.engagementTeamLeaderComplete(teamLeader)) {
      throw new backendContext.HttpsError("invalid-argument", "Chef d'equipe ou renonciation obligatoire.");
    }
    const now = new Date().toISOString();
    const entryRef = backendContext.db.collection("engagementClubEntries").doc(backendContext.engagementClubEntryId(competitionId, context.clubId));
    const snapshot = await entryRef.get();
    if (snapshot.exists && teamLeader.mode === "person") {
      const entryData = snapshot.data() || {};
      const licenseKey = backendContext.engagementPersonLicenseKey(teamLeader.licenseNumber);
      const alreadyOfficial = (Array.isArray(entryData.officials) ? entryData.officials : []).some((official) =>
        (teamLeader.personId && official.personId === teamLeader.personId) ||
        (licenseKey && backendContext.engagementPersonLicenseKey(official.licenseNumber) === licenseKey));
      const alreadySwimmer = (Array.isArray(entryData.swimmers) ? entryData.swimmers : []).some((swimmer) =>
        (person?.swimmerIndexId && backendContext.cleanText(swimmer.swimmerIndexId) === person.swimmerIndexId) ||
        (licenseKey && backendContext.engagementPersonLicenseKey(swimmer.licenseNumber) === licenseKey));
      if (alreadyOfficial) throw new backendContext.HttpsError("failed-precondition", "Une meme personne ne peut pas etre chef d'equipe et officiel sur cette competition.");
      if (alreadySwimmer) throw new backendContext.HttpsError("failed-precondition", "Une meme personne ne peut pas etre chef d'equipe et nageur sur cette competition.");
    }
    const payload = {
      competitionId,
      clubId: context.clubId,
      clubName: context.clubName,
      regionId: context.regionId,
      status: "active",
      teamLeader,
      teamLeaderComplete: true,
      updatedAt: now,
      updatedBy: context.uid,
      ...(snapshot.exists ? {} : { createdAt: now, createdBy: context.uid })
    };
    const batch = backendContext.db.batch();
    batch.set(entryRef, payload, { merge: true });
    if (personRef && person) {
      const updatedPerson = {
        ...person,
        roles: {
          ...person.roles,
          teamLeader: true
        },
        updatedAt: now,
        updatedBy: context.uid
      };
      batch.set(personRef, {
        roles: updatedPerson.roles,
        updatedAt: now,
        updatedBy: context.uid
      }, { merge: true });
      backendContext.upsertEngagementClubPeopleRosterPerson(batch, backendContext.db, updatedPerson, now);
    }
    await batch.commit();
    await backendContext.writeAuditLog("engagementClubEntry.teamLeaderSaved", context.uid, {
      competitionId,
      clubId: context.clubId,
      mode: teamLeader.mode
    });
    const updatedData = { ...(snapshot.data() || {}), ...payload };
    return {
      ok: true,
      entry: backendContext.engagementClubEntryItem({ id: entryRef.id, exists: true, data: () => updatedData })
    };
  }

  return { saveEngagementClubTeamLeader };
}

module.exports = { createClubHandlers_saveEngagementClubTeamLeader };
