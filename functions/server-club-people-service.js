// Preserve the execution mode of the existing index.js function bodies.

// Private existing helpers; live services/state are supplied by index.js.
// Module creation performs no external operation.
function createClubPeopleService(backendContext) {
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

  function engagementClubPersonItem(doc) {
    const data = doc.data() || {};
    const roles = data.roles || {};
    return {
      id: doc.id,
      clubId: backendContext.cleanText(data.clubId).slice(0, 40),
      clubName: backendContext.cleanText(data.clubName).slice(0, 140),
      regionId: backendContext.cleanText(data.regionId).slice(0, 80),
      firstName: backendContext.cleanText(data.firstName).slice(0, 80),
      lastName: backendContext.cleanText(data.lastName).slice(0, 80),
      licenseNumber: backendContext.cleanText(data.licenseNumber).slice(0, 60),
      swimmerIndexId: backendContext.cleanText(data.swimmerIndexId).slice(0, 80),
      swimmerSource: backendContext.cleanText(data.swimmerSource).slice(0, 40),
      birthDate: backendContext.cleanIsoDate(data.birthDate),
      sex: backendContext.cleanText(data.sex).toUpperCase().slice(0, 20),
      identityKey: backendContext.cleanText(data.identityKey).slice(0, 180),
      roles: {
        swimmer: roles.swimmer === true || Boolean(backendContext.cleanText(data.swimmerIndexId)),
        official: roles.official === true,
        teamLeader: roles.teamLeader === true
      },
      active: data.active !== false,
      status: backendContext.cleanText(data.status || (data.mergedIntoId ? "merged" : "active")).slice(0, 30),
      mergedIntoId: backendContext.cleanText(data.mergedIntoId).slice(0, 80),
      mergedIntoName: backendContext.cleanText(data.mergedIntoName).slice(0, 180),
      mergedAt: backendContext.cleanText(data.mergedAt).slice(0, 40),
      updatedAt: backendContext.cleanText(data.updatedAt).slice(0, 40)
    };
  }

  function engagementClubPeopleRosterId(clubId) {
    return backendContext.stableHash(backendContext.cleanText(clubId)).slice(0, 40);
  }

  function engagementClubPeopleRosterRef(db, clubId) {
    return db.collection(backendContext.ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION).doc(engagementClubPeopleRosterId(clubId));
  }

  function engagementClubPeopleRosterPersonItem(person = {}) {
    const roles = person.roles || {};
    return backendContext.cleanFirestoreValue({
      id: backendContext.cleanText(person.id).slice(0, 80),
      clubId: backendContext.cleanText(person.clubId).slice(0, 40),
      clubName: backendContext.cleanText(person.clubName).slice(0, 140),
      regionId: backendContext.cleanText(person.regionId).slice(0, 80),
      firstName: backendContext.cleanText(person.firstName).slice(0, 80),
      lastName: backendContext.cleanText(person.lastName).slice(0, 80),
      licenseNumber: backendContext.cleanText(person.licenseNumber).slice(0, 60),
      swimmerIndexId: backendContext.cleanText(person.swimmerIndexId).slice(0, 80),
      swimmerSource: backendContext.cleanText(person.swimmerSource).slice(0, 40),
      birthDate: backendContext.cleanIsoDate(person.birthDate),
      sex: backendContext.cleanText(person.sex).toUpperCase().slice(0, 20),
      identityKey: backendContext.cleanText(person.identityKey).slice(0, 180),
      roles: {
        swimmer: roles.swimmer === true || Boolean(backendContext.cleanText(person.swimmerIndexId)),
        official: roles.official === true,
        teamLeader: roles.teamLeader === true
      },
      active: person.active !== false,
      updatedAt: backendContext.cleanText(person.updatedAt).slice(0, 40)
    });
  }

  function engagementClubPeopleRosterPeopleFromData(data = {}) {
    const people = data.people && typeof data.people === "object" ? data.people : {};
    return Object.values(people)
      .map(engagementClubPeopleRosterPersonItem)
      .filter((person) => person.id && person.clubId)
      .sort((left, right) => `${left.lastName} ${left.firstName}`.localeCompare(`${right.lastName} ${right.firstName}`, "fr"));
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
      person: engagementClubPeopleRosterPersonItem(person)
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
        .map(engagementClubPersonItem)
        .find((candidate) => candidate.clubId && candidate.clubId !== clubId && candidate.active);
      if (outsideClubPerson) return true;
    }
    return false;
  }

  function upsertEngagementClubPeopleRosterPerson(batch, db, person = {}, now = "") {
    const item = engagementClubPeopleRosterPersonItem(person);
    if (!item.clubId || !item.id) return;
    if (backendContext.cleanText(person.status) === "merged" || backendContext.cleanText(person.mergedIntoId)) {
      deleteEngagementClubPeopleRosterPerson(batch, db, item, now);
      return;
    }
    batch.set(engagementClubPeopleRosterRef(db, item.clubId), {
      clubId: item.clubId,
      clubName: item.clubName,
      updatedAt: now || new Date().toISOString(),
      people: {
        [item.id]: item
      }
    }, { merge: true });
  }

  function deleteEngagementClubPeopleRosterPerson(batch, db, person = {}, now = "") {
    const clubId = backendContext.cleanText(person.clubId).slice(0, 40);
    const personId = backendContext.cleanText(person.id).slice(0, 80);
    if (!clubId || !personId) return;
    batch.set(engagementClubPeopleRosterRef(db, clubId), {
      updatedAt: now || new Date().toISOString(),
      people: {
        [personId]: backendContext.FieldValue.delete()
      }
    }, { merge: true });
  }

  async function rebuildEngagementClubPeopleRoster(db, context = {}) {
    const clubId = backendContext.cleanText(context.clubId).slice(0, 40);
    if (!clubId) return [];
    const snapshot = await db.collection("engagementClubPeople")
      .where("clubId", "==", clubId)
      .limit(200)
      .get();
    const people = {};
    snapshot.docs.forEach((doc) => {
      const item = engagementClubPeopleRosterPersonItem(engagementClubPersonItem(doc));
      if (item.id && item.clubId === clubId) people[item.id] = item;
    });
    const now = new Date().toISOString();
    await engagementClubPeopleRosterRef(db, clubId).set({
      clubId,
      clubName: backendContext.cleanText(context.clubName).slice(0, 140),
      generatedAt: now,
      updatedAt: now,
      personCount: Object.keys(people).length,
      people
    }, { merge: false });
    return engagementClubPeopleRosterPeopleFromData({ people });
  }

  async function syncEngagementClubPeopleRosterFromChange(event = {}) {
    const before = event.data?.before?.exists ? engagementClubPersonItem(event.data.before) : null;
    const after = event.data?.after?.exists ? engagementClubPersonItem(event.data.after) : null;
    const now = new Date().toISOString();
    const batch = backendContext.db.batch();
    let batchSize = 0;
    if (before?.clubId && (!after || before.clubId !== after.clubId)) {
      deleteEngagementClubPeopleRosterPerson(batch, backendContext.db, before, now);
      batchSize += 1;
    }
    if (after?.clubId) {
      upsertEngagementClubPeopleRosterPerson(batch, backendContext.db, after, now);
      batchSize += 1;
    }
    if (batchSize) await batch.commit();
  }

  function engagementClubSwimmerItem(doc) {
    const data = doc.data() || {};
    const firstName = backendContext.cleanText(data.firstName).slice(0, 80);
    const lastName = backendContext.cleanText(data.lastName).slice(0, 80);
    const name = backendContext.cleanText(data.name).slice(0, 160) || [firstName, lastName].filter(Boolean).join(" ");
    const licenseSeason = backendContext.engagementLicenseSeasonState(data);
    return backendContext.cleanFirestoreValue({
      id: doc.id,
      swimmerIndexId: doc.id,
      source: "performances",
      swimmerId: backendContext.cleanText(data.id || data.swimmerId).slice(0, 80),
      identityKey: backendContext.cleanText(data.identityKey).slice(0, 180),
      firstName,
      lastName,
      name,
      birthDate: backendContext.cleanIsoDate(data.birthDate),
      sex: backendContext.cleanText(data.sex).slice(0, 20),
      category: backendContext.currentEngagementCategoryFromBirthDate(data.birthDate),
      clubId: backendContext.cleanText(data.clubId).slice(0, 40),
      club: backendContext.cleanText(data.club).slice(0, 60),
      clubName: backendContext.cleanText(data.clubName).slice(0, 140),
      licenseNumber: backendContext.cleanText(data.licenseNumber).slice(0, 60),
      licenseVerificationStatus: backendContext.cleanEngagementLicenseVerificationStatus(data.licenseVerificationStatus || data.verificationStatus, "pending"),
      licenseSeasonLabel: licenseSeason.label,
      licenseSeasonStatus: licenseSeason.status,
      latestDate: backendContext.cleanIsoDate(data.latestDate),
      performanceCount: Math.max(0, Math.trunc(Number(data.performanceCount) || 0)),
      active: data.active !== false,
      status: backendContext.cleanText(data.status || (data.active === false ? "inactive" : "active")).slice(0, 40),
      mergedIntoId: backendContext.cleanText(data.mergedIntoId).slice(0, 80),
      mergedIntoSource: backendContext.cleanText(data.mergedIntoSource).slice(0, 40),
      mergedIntoName: backendContext.cleanText(data.mergedIntoName).slice(0, 160),
      sourceIds: Array.isArray(data.sourceIds) ? data.sourceIds.map((id) => backendContext.cleanText(id).slice(0, 80)).filter(Boolean).slice(0, 20) : []
    });
  }

  function engagementReferenceSwimmerItem(raw = {}) {
    const swimmerId = backendContext.cleanText(raw.id || raw.swimmerId).slice(0, 80);
    const firstName = backendContext.cleanText(raw.firstName).slice(0, 80);
    const lastName = backendContext.cleanText(raw.lastName).slice(0, 80);
    const name = backendContext.cleanText(raw.name).slice(0, 160) || [firstName, lastName].filter(Boolean).join(" ");
    const birthDate = backendContext.cleanIsoDate(raw.birthDate);
    const licenseSeason = backendContext.engagementLicenseSeasonState(raw);
    return backendContext.cleanFirestoreValue({
      id: swimmerId,
      swimmerIndexId: swimmerId,
      source: "reference",
      swimmerId,
      identityKey: backendContext.cleanText(raw.identityKey).slice(0, 180) || backendContext.engagementSwimmerIdentityKey(firstName, lastName, birthDate),
      firstName,
      lastName,
      name,
      birthDate,
      sex: backendContext.cleanText(raw.sex).slice(0, 20),
      category: backendContext.currentEngagementCategoryFromBirthDate(birthDate),
      clubId: backendContext.cleanText(raw.clubId).slice(0, 40),
      club: backendContext.cleanText(raw.club).slice(0, 60),
      clubName: backendContext.cleanText(raw.clubName).slice(0, 140),
      licenseNumber: backendContext.cleanText(raw.licenseNumber).slice(0, 60),
      licenseVerificationStatus: backendContext.cleanEngagementLicenseVerificationStatus(raw.licenseVerificationStatus || raw.verificationStatus, "pending"),
      licenseSeasonLabel: licenseSeason.label,
      licenseSeasonStatus: licenseSeason.status,
      latestDate: backendContext.cleanIsoDate(raw.latestDate),
      performanceCount: Math.max(0, Math.trunc(Number(raw.performanceCount) || 0)),
      sourceIds: swimmerId ? [swimmerId] : []
    });
  }

  function engagementReferenceClubSwimmers(clubId = "", limit = 800) {
    const targetClubId = backendContext.cleanText(clubId);
    if (!targetClubId) return [];
    return backendContext.intranapSwimmersIndex
      .filter((swimmer) => backendContext.cleanText(swimmer.clubId) === targetClubId)
      .slice(0, limit)
      .map(engagementReferenceSwimmerItem)
      .filter((swimmer) => swimmer.swimmerIndexId && swimmer.clubId === targetClubId);
  }

  function sortEngagementClubSwimmers(swimmers = []) {
    return swimmers.sort((left, right) =>
      backendContext.cleanText(right.latestDate).localeCompare(backendContext.cleanText(left.latestDate)) ||
      backendContext.cleanText(left.lastName).localeCompare(backendContext.cleanText(right.lastName), "fr") ||
      backendContext.cleanText(left.firstName).localeCompare(backendContext.cleanText(right.firstName), "fr")
    );
  }

  function engagementClubSwimmerMatchKeys(swimmer = {}) {
    const swimmerId = backendContext.cleanText(swimmer.swimmerId);
    const licenseKey = backendContext.engagementSwimmerLicenseNumberKey(swimmer.licenseNumber);
    const identityKey = backendContext.normalizePerformanceSearchText(swimmer.identityKey || [swimmer.lastName, swimmer.firstName, swimmer.birthDate].filter(Boolean).join("|"));
    const swimmerIndexId = backendContext.cleanText(swimmer.swimmerIndexId || swimmer.id);
    const source = backendContext.cleanText(swimmer.source || "performances");
    return Array.from(new Set((swimmerId ? [
      `swimmer:${swimmerId}`,
      swimmerIndexId ? `index:${source}:${swimmerIndexId}` : ""
    ] : [
      licenseKey ? `license:${licenseKey}` : "",
      identityKey ? `identity:${identityKey}` : "",
      swimmerIndexId ? `index:${source}:${swimmerIndexId}` : ""
    ]).filter(Boolean)));
  }

  function engagementClubSwimmerSourceRank(source = "") {
    return {
      performances: 3,
      engagement: 2,
      reference: 1
    }[backendContext.cleanText(source)] || 0;
  }

  function mergeEngagementClubSwimmerItems(left = {}, right = {}) {
    const rightPreferred = engagementClubSwimmerSourceRank(right.source) > engagementClubSwimmerSourceRank(left.source);
    const preferred = rightPreferred ? right : left;
    const fallback = rightPreferred ? left : right;
    const merged = { ...fallback, ...preferred };
    [
      "id", "swimmerIndexId", "swimmerId", "identityKey", "firstName", "lastName", "name", "birthDate", "sex", "category",
      "clubId", "club", "clubName", "licenseNumber", "licenseVerificationStatus", "licenseSeasonLabel", "licenseSeasonStatus",
      "changeRequestStatus", "changeRequestId", "changeRequestedAt", "clubActivityStatus", "clubActivityStatusSource",
      "clubActivityStatusUpdatedAt", "clubActivityStatusUpdatedBy"
    ].forEach((key) => {
      if (!backendContext.cleanText(merged[key]) && backendContext.cleanText(fallback[key])) merged[key] = fallback[key];
    });
    merged.performanceCount = Math.max(Number(left.performanceCount || 0), Number(right.performanceCount || 0));
    merged.latestDate = [backendContext.cleanIsoDate(left.latestDate), backendContext.cleanIsoDate(right.latestDate)].filter(Boolean).sort().pop() || "";
    merged.updatedAt = [backendContext.cleanText(left.updatedAt), backendContext.cleanText(right.updatedAt)].filter(Boolean).sort().pop() || "";
    merged.active = left.active !== false || right.active !== false;
    return backendContext.engagementClubRosterSwimmerItem(merged);
  }

  function uniqueEngagementClubSwimmers(swimmers = [], limit = 800) {
    const groups = [];
    swimmers.filter((swimmer) => swimmer.swimmerIndexId).forEach((swimmer) => {
      const keys = engagementClubSwimmerMatchKeys(swimmer);
      const matchingIndexes = groups
        .map((group, index) => group.keys.some((key) => keys.includes(key)) ? index : -1)
        .filter((index) => index >= 0);
      if (!matchingIndexes.length) {
        groups.push({ item: backendContext.engagementClubRosterSwimmerItem(swimmer), keys });
        return;
      }
      const targetIndex = matchingIndexes[0];
      const target = groups[targetIndex];
      target.item = mergeEngagementClubSwimmerItems(target.item, swimmer);
      target.keys = Array.from(new Set([...target.keys, ...keys, ...engagementClubSwimmerMatchKeys(target.item)]));
      matchingIndexes.slice(1).reverse().forEach((index) => {
        target.item = mergeEngagementClubSwimmerItems(target.item, groups[index].item);
        target.keys = Array.from(new Set([...target.keys, ...groups[index].keys, ...engagementClubSwimmerMatchKeys(target.item)]));
        groups.splice(index, 1);
      });
    });
    return groups.map((group) => group.item).slice(0, limit);
  }

  async function rebuildEngagementClubRoster(db, context = {}, limit = 800) {
    const clubId = backendContext.cleanText(context.clubId);
    if (!clubId) return [];
    const snapshot = await db
      .collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION)
      .where("clubId", "==", clubId)
      .limit(limit)
      .get();
    const newSwimmersSnapshot = await db
      .collection("engagementClubSwimmers")
      .where("clubId", "==", clubId)
      .where("active", "==", true)
      .limit(200)
      .get();
    const legacyLicenses = await backendContext.engagementLegacySwimmerLicensesByClub(db, clubId);
    const swimmers = sortEngagementClubSwimmers(uniqueEngagementClubSwimmers([
      ...newSwimmersSnapshot.docs.map(backendContext.engagementNewSwimmerItem),
      ...snapshot.docs.map(engagementClubSwimmerItem),
      ...engagementReferenceClubSwimmers(clubId, limit)
    ], limit).map((swimmer) => {
      const legacyLicense = legacyLicenses.get(swimmer.swimmerIndexId);
      return legacyLicense?.licenseNumber
        ? {
            ...swimmer,
            licenseNumber: legacyLicense.licenseNumber,
            licenseVerificationStatus: legacyLicense.verificationStatus || "pending",
            licenseSeasonLabel: legacyLicense.licenseSeasonLabel,
            licenseSeasonStatus: legacyLicense.licenseSeasonStatus,
            licenseSeasons: legacyLicense.licenseSeasons
          }
        : swimmer;
    }));
    const now = new Date().toISOString();
    const rosterEntries = {};
    swimmers.forEach((swimmer) => {
      const item = backendContext.engagementClubRosterSwimmerItem(swimmer);
      if (item.swimmerIndexId && item.clubId === clubId) rosterEntries[backendContext.engagementClubRosterSwimmerKey(item)] = item;
    });
    await backendContext.engagementClubRosterRef(db, clubId).set({
      clubId,
      clubName: backendContext.cleanText(context.clubName).slice(0, 140) || swimmers.find((swimmer) => swimmer.clubName)?.clubName || "",
      generatedAt: now,
      updatedAt: now,
      swimmerCount: Object.keys(rosterEntries).length,
      swimmers: rosterEntries
    }, { merge: false });
    return swimmers;
  }

  async function syncEngagementClubRosterFromSwimmerChange(event = {}, source = "performances") {
    const before = event.data?.before?.exists ? event.data.before.data() || {} : null;
    const after = event.data?.after?.exists ? event.data.after.data() || {} : null;
    const docId = backendContext.cleanText(event.params?.swimmerIndexId || event.params?.swimmerId);
    const now = new Date().toISOString();
    const batch = backendContext.db.batch();
    let batchSize = 0;
    const beforeItem = before
      ? backendContext.engagementClubRosterSwimmerItem({ ...before, swimmerIndexId: docId, source })
      : null;
    const afterItem = after
      ? backendContext.engagementClubRosterSwimmerItem({ ...after, swimmerIndexId: docId, source })
      : null;
    const shouldDeleteBefore = beforeItem?.clubId && (
      !afterItem ||
      afterItem.active === false ||
      beforeItem.clubId !== afterItem.clubId ||
      backendContext.engagementClubRosterSwimmerKey(beforeItem) !== backendContext.engagementClubRosterSwimmerKey(afterItem)
    );
    if (shouldDeleteBefore) {
      backendContext.deleteEngagementClubRosterSwimmer(batch, backendContext.db, beforeItem, now);
      batchSize += 1;
    }
    if (afterItem?.clubId && afterItem.active !== false) {
      backendContext.upsertEngagementClubRosterSwimmer(batch, backendContext.db, afterItem, now);
      batchSize += 1;
    }
    if (source !== "engagement" && docId) {
      backendContext.deleteEngagementEntryTimeCache(batch, backendContext.db, { ...(after || before || {}), source, swimmerIndexId: docId });
      batchSize += 1;
    }
    if (batchSize) await batch.commit();
  }

  async function reactivateEngagementClubRosterSwimmersFromPerformanceRows(rows = [], context = {}) {
    const byClub = new Map();
    rows.filter((row) => row && row.isIntermediate !== true).forEach((row) => {
      const clubId = backendContext.cleanText(row.clubId).slice(0, 40);
      const swimmerId = backendContext.cleanText(row.swimmerId || row.originalSwimmerId).slice(0, 80);
      const identityKey = backendContext.cleanText(row.swimmerIdentityKey).slice(0, 180);
      if (!clubId || (!swimmerId && !identityKey)) return;
      if (!byClub.has(clubId)) byClub.set(clubId, { swimmerIds: new Set(), identityKeys: new Set() });
      if (swimmerId) byClub.get(clubId).swimmerIds.add(swimmerId);
      if (identityKey) byClub.get(clubId).identityKeys.add(identityKey);
    });
    if (!byClub.size) return { affectedClubs: 0, reactivatedSwimmers: 0 };
    if (byClub.size > 200) throw new Error("Trop de clubs à réactiver dans un seul import.");
    const clubIds = Array.from(byClub.keys());
    const refs = clubIds.map((clubId) => backendContext.engagementClubRosterRef(backendContext.db, clubId));
    const snapshots = await backendContext.db.getAll(...refs);
    const now = context.now || new Date().toISOString();
    const writer = backendContext.db.bulkWriter({ throttling: { initialOpsPerSecond: 50, maxOpsPerSecond: 100 } });
    let affectedClubs = 0;
    let reactivatedSwimmers = 0;
    snapshots.forEach((snapshot, index) => {
      if (!snapshot.exists) return;
      const targets = byClub.get(clubIds[index]);
      const data = snapshot.data() || {};
      const entries = data.swimmers && typeof data.swimmers === "object" ? data.swimmers : {};
      const updates = {};
      Object.entries(entries).forEach(([key, swimmer]) => {
        const matches = targets.swimmerIds.has(backendContext.cleanText(swimmer?.swimmerId)) ||
          targets.identityKeys.has(backendContext.cleanText(swimmer?.identityKey));
        if (!matches || backendContext.cleanEngagementClubActivityStatus(swimmer?.clubActivityStatus) === "active") return;
        updates[key] = backendContext.engagementClubRosterSwimmerItem({
          ...swimmer,
          clubActivityStatus: "active",
          clubActivityStatusSource: "new-performance",
          clubActivityStatusUpdatedAt: now,
          clubActivityStatusUpdatedBy: context.actorUid || "system:performance-import"
        });
        reactivatedSwimmers += 1;
      });
      if (!Object.keys(updates).length) return;
      affectedClubs += 1;
      writer.set(snapshot.ref, { updatedAt: now, swimmers: updates }, { merge: true });
    });
    await writer.close();
    return { affectedClubs, reactivatedSwimmers };
  }

  function cleanIsoDateTime(value) {
    const text = backendContext.cleanText(value).slice(0, 40);
    if (!text) return "";
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }

  function cleanEngagementDeadlineAt(value) {
    const text = cleanIsoDateTime(value);
    if (!text) return "";
    const date = new Date(text);
    date.setUTCMinutes(0, 0, 0);
    return date.toISOString();
  }

  function isEngagementOpeningDeadlinePast(entryStatus, entryDeadlineAt, nowMs = Date.now()) {
    if (backendContext.cleanEngagementEntryStatus(entryStatus) !== "open" || !entryDeadlineAt) return false;
    const deadline = new Date(entryDeadlineAt);
    return !Number.isNaN(deadline.getTime()) && deadline.getTime() <= nowMs;
  }

  function isEngagementOpeningTooEarly(entryStatus, competitionDate, nowMs = Date.now()) {
    if (backendContext.cleanEngagementEntryStatus(entryStatus) !== "open" || !competitionDate) return false;
    const startMs = Date.parse(`${competitionDate}T00:00:00.000Z`);
    return Number.isFinite(startMs) && startMs - nowMs > 30 * 24 * 60 * 60 * 1000;
  }

  function cleanEngagementRegionIds(raw = [], excludedRegionId = "") {
    const values = Array.isArray(raw) ? raw : [raw];
    const excludedKey = backendContext.normalizedEngagementRegionKey(excludedRegionId);
    const seen = new Set();
    return values
      .map((value) => backendContext.cleanText(value).slice(0, 80))
      .filter(Boolean)
      .filter((regionId) => backendContext.normalizedEngagementRegionKey(regionId) !== excludedKey)
      .filter((regionId) => {
        const key = backendContext.normalizedEngagementRegionKey(regionId);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 30);
  }

  return {
    cleanEngagementClubPerson,
    engagementClubPersonItem,
    engagementClubPeopleRosterId,
    engagementClubPeopleRosterRef,
    engagementClubPeopleRosterPersonItem,
    engagementClubPeopleRosterPeopleFromData,
    engagementClubPersonIdentityConflict,
    throwEngagementClubPersonIdentityConflict,
    engagementClubPersonOutsideClubConflict,
    upsertEngagementClubPeopleRosterPerson,
    deleteEngagementClubPeopleRosterPerson,
    rebuildEngagementClubPeopleRoster,
    syncEngagementClubPeopleRosterFromChange,
    engagementClubSwimmerItem,
    engagementReferenceSwimmerItem,
    engagementReferenceClubSwimmers,
    sortEngagementClubSwimmers,
    engagementClubSwimmerMatchKeys,
    engagementClubSwimmerSourceRank,
    mergeEngagementClubSwimmerItems,
    uniqueEngagementClubSwimmers,
    rebuildEngagementClubRoster,
    syncEngagementClubRosterFromSwimmerChange,
    reactivateEngagementClubRosterSwimmersFromPerformanceRows,
    cleanIsoDateTime,
    cleanEngagementDeadlineAt,
    isEngagementOpeningDeadlinePast,
    isEngagementOpeningTooEarly,
    cleanEngagementRegionIds
  };
}

module.exports = { createClubPeopleService };
