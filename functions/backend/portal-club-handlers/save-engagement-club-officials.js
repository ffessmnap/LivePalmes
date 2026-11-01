// Existing operation bodies; live services arrive through explicit accessors.
function createClubHandlers_saveEngagementClubOfficials(backendContext) {
  async function saveEngagementClubOfficials(request) {
    const context = await backendContext.engagementClubAccessContext(request);
    if(backendContext.ENVIRONMENT.sportingDataSource === "nap") return backendContext.saveNativeClubOfficials(context,request);
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    if (!competitionId) {
      throw new backendContext.HttpsError("invalid-argument", "Competition requise.");
    }
    const competition = await backendContext.db.collection("engagementCompetitions").doc(competitionId).get();
    if (!competition.exists) {
      throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    }
    backendContext.assertEngagementClubWriteOpen(competition.data() || {});
    const entryRef = backendContext.db.collection("engagementClubEntries").doc(backendContext.engagementClubEntryId(competitionId, context.clubId));
    const entry = await entryRef.get();
    if (!entry.exists || !backendContext.engagementTeamLeaderComplete(entry.data()?.teamLeader || {})) {
      throw new backendContext.HttpsError("failed-precondition", "Chef d'equipe ou renonciation obligatoire avant les officiels.");
    }

    const personIds = Array.from(new Set((Array.isArray(request.data?.officialPersonIds) ? request.data.officialPersonIds : [])
      .map((id) => backendContext.cleanText(id).slice(0, 80))
      .filter(Boolean)))
      .slice(0, 80);
    const personRefs = personIds.map((id) => backendContext.db.collection("engagementClubPeople").doc(id));
    const personDocs = personRefs.length ? await backendContext.db.getAll(...personRefs) : [];
    const entryData = entry.data() || {};
    const teamLeader = entryData.teamLeader || {};
    const enteredSwimmers = Array.isArray(entryData.swimmers) ? entryData.swimmers.map(backendContext.cleanEngagementEntrySwimmer) : [];
    const officials = personDocs.map((doc) => {
      if (!doc.exists) {
        throw new backendContext.HttpsError("invalid-argument", "Officiel inconnu dans la base club.");
      }
      const person = backendContext.engagementClubPersonItem(doc);
      if (person.clubId !== context.clubId || !person.active || person.roles.official !== true) {
        throw new backendContext.HttpsError("permission-denied", "Officiel hors perimetre club ou inactif.");
      }
      const licenseKey = backendContext.engagementPersonLicenseKey(person.licenseNumber);
      if (backendContext.cleanText(teamLeader.personId) === person.id || (licenseKey && backendContext.engagementPersonLicenseKey(teamLeader.licenseNumber) === licenseKey)) {
        throw new backendContext.HttpsError("failed-precondition", "Une meme personne ne peut pas etre chef d'equipe et officiel sur cette competition.");
      }
      if (enteredSwimmers.some((swimmer) =>
        (person.swimmerIndexId && swimmer.swimmerIndexId === person.swimmerIndexId) ||
        (licenseKey && backendContext.engagementPersonLicenseKey(swimmer.licenseNumber) === licenseKey))) {
        throw new backendContext.HttpsError("failed-precondition", "Une meme personne ne peut pas etre nageur et officiel sur cette competition.");
      }
      return {
        personId: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        birthDate: person.birthDate,
        licenseNumber: person.licenseNumber
      };
    });

    const now = new Date().toISOString();
    await entryRef.set({
      officials,
      updatedAt: now,
      updatedBy: context.uid
    }, { merge: true });
    await backendContext.writeAuditLog("engagementClubEntry.officialsSaved", context.uid, {
      competitionId,
      clubId: context.clubId,
      officialCount: officials.length
    });
    const updatedData = { ...entryData, officials, updatedAt: now, updatedBy: context.uid };
    return {
      ok: true,
      entry: backendContext.engagementClubEntryItem({ id: entryRef.id, exists: true, data: () => updatedData })
    };
  }

  return { saveEngagementClubOfficials };
}

module.exports = { createClubHandlers_saveEngagementClubOfficials };
