// Existing operation bodies; live services arrive through explicit accessors.
function createClubPeopleService_cleanEngagementClubPerson(backendContext) {
  function cleanEngagementClubPerson(raw = {}, context = {}) {
    const firstName = backendContext.cleanText(raw.firstName).slice(0, 80);
    const lastName = backendContext.cleanText(raw.lastName).slice(0, 80);
    const birthDate = backendContext.cleanIsoDate(raw.birthDate);
    const sex = ["F", "M"].includes(backendContext.cleanText(raw.sex).toUpperCase()) ? backendContext.cleanText(raw.sex).toUpperCase() : "";
    const licenseNumber = backendContext.cleanText(raw.licenseNumber).toUpperCase().slice(0, 60);
    const roles = raw.roles || {};
    const official = roles.official === true || raw.official === true;
    const teamLeader = roles.teamLeader === true || raw.teamLeader === true;
    const swimmerIndexId = backendContext.cleanText(raw.swimmerIndexId).slice(0, 80);
    const swimmerSource = backendContext.cleanText(raw.swimmerSource || raw.source).slice(0, 40);
    const swimmer = Boolean(swimmerIndexId);
    if (!firstName || !lastName) {
      throw new backendContext.HttpsError("invalid-argument", "Nom et prenom obligatoires.");
    }
    if (!licenseNumber) {
      throw new backendContext.HttpsError("invalid-argument", "Numero de licence obligatoire.");
    }
    if (!backendContext.ENGAGEMENT_SWIMMER_LICENSE_PATTERN.test(licenseNumber)) {
      throw new backendContext.HttpsError("invalid-argument", "Le numero de licence doit respecter le format A-12-34567.");
    }
    if (!birthDate || !sex) {
      throw new backendContext.HttpsError("invalid-argument", "Date de naissance et sexe obligatoires.");
    }
    if (!official && !teamLeader) {
      throw new backendContext.HttpsError("invalid-argument", "Selectionnez au moins un role.");
    }
    return {
      clubId: context.clubId,
      clubName: context.clubName,
      regionId: context.regionId,
      firstName,
      lastName,
      licenseNumber,
      swimmerIndexId,
      swimmerSource: swimmer ? (swimmerSource || "performances") : "",
      birthDate,
      sex,
      identityKey: backendContext.engagementSwimmerIdentityKey(firstName, lastName, birthDate),
      roles: {
        swimmer,
        official,
        teamLeader
      },
      active: raw.active === false ? false : true
    };
  }

  function engagementClubPersonIdentityConflict(people = [], person = {}, ignoredPersonId = "") {
    const candidates = people.filter((candidate) => candidate.id && candidate.id !== ignoredPersonId);
    const licenseKey = backendContext.engagementSwimmerLicenseNumberKey(person.licenseNumber);
    const sameLicense = licenseKey && candidates.find((candidate) =>
      backendContext.engagementSwimmerLicenseNumberKey(candidate.licenseNumber) === licenseKey
    );
    if (sameLicense) return { type: "license", person: sameLicense };
    const identityKey = backendContext.engagementSwimmerIdentityKey(person.firstName, person.lastName, person.birthDate);
    const invertedIdentityKey = backendContext.engagementSwimmerIdentityKey(person.lastName, person.firstName, person.birthDate);
    const exact = identityKey && candidates.find((candidate) =>
      (candidate.identityKey || backendContext.engagementSwimmerIdentityKey(candidate.firstName, candidate.lastName, candidate.birthDate)) === identityKey
    );
    if (exact) return { type: "exact", person: exact };
    const inverted = invertedIdentityKey && invertedIdentityKey !== identityKey
      ? candidates.find((candidate) =>
          (candidate.identityKey || backendContext.engagementSwimmerIdentityKey(candidate.firstName, candidate.lastName, candidate.birthDate)) === invertedIdentityKey
        )
      : null;
    return inverted ? { type: "inverted", person: inverted } : null;
  }

  function throwEngagementClubPersonIdentityConflict(conflict = {}) {
    const person = conflict.person || {};
    const name = [person.lastName, person.firstName].filter(Boolean).join(" ") || "un membre existant";
    const reason = conflict.type === "inverted"
      ? "avec le nom et le prenom inverses"
      : conflict.type === "license"
        ? "avec le meme numero de licence"
        : "avec la meme identite";
    throw new backendContext.HttpsError("already-exists", `${name} existe deja ${reason}. Utilisez cette fiche au lieu d'en creer une autre.`, {
      matchType: conflict.type,
      person: (0, backendContext.local$engagementClubPeopleRosterPersonItem)(person)
    });
  }

  async function engagementClubPersonOutsideClubConflict(person = {}, clubId = "") {
    const licenseNumber = backendContext.cleanText(person.licenseNumber).toUpperCase();
    const identityKey = backendContext.cleanText(person.identityKey);
    const snapshots = await Promise.all([
      licenseNumber
        ? backendContext.db.collection("engagementClubPeople").where("licenseNumber", "==", licenseNumber).limit(10).get()
        : Promise.resolve(null),
      identityKey
        ? backendContext.db.collection("engagementClubPeople").where("identityKey", "==", identityKey).limit(10).get()
        : Promise.resolve(null)
    ]);
    for (const snapshot of snapshots) {
      const outsideClubPerson = snapshot?.docs
        .map(backendContext.local$engagementClubPersonItem)
        .find((candidate) => candidate.clubId && candidate.clubId !== clubId && candidate.active);
      if (outsideClubPerson) return true;
    }
    return false;
  }

  return { cleanEngagementClubPerson, engagementClubPersonIdentityConflict, throwEngagementClubPersonIdentityConflict, engagementClubPersonOutsideClubConflict };
}

module.exports = { createClubPeopleService_cleanEngagementClubPerson };
