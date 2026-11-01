// Existing operation bodies; live services arrive through explicit accessors.
function createEntryService_buildEngagementClubSwimmersFromRequest(backendContext) {
  async function buildEngagementClubSwimmersFromRequest(requestData = {}, context = {}, competitionData = {}) {
    const competitionId = backendContext.cleanText(requestData.competitionId || competitionData.id);
    const openWater = backendContext.cleanEngagementCompetitionType(competitionData.competitionType) === "openWater";
    const competitionEvents = backendContext.cleanEngagementCompetitionEvents(competitionData.events || [], {
      strict: false,
      competitionType: backendContext.cleanEngagementCompetitionType(competitionData.competitionType)
    });
    const competitionTimeRules = {
      id: competitionId,
      hasQualificationGrants: competitionData.hasQualificationGrants === true,
      qualificationPreview: competitionData.qualificationPreview === true,
      qualifications: competitionData.qualifications,
      events: competitionData.events,
      date: backendContext.cleanIsoDate(competitionData.date),
      poolLength: backendContext.cleanEngagementPoolLength(competitionData.poolLength),
      timingType: backendContext.cleanEngagementTimingType(competitionData.timingType),
      qualificationTimesMode: backendContext.cleanEngagementQualificationTimesMode(competitionData.qualificationTimesMode),
      qualificationStartDate: backendContext.cleanIsoDate(competitionData.qualificationStartDate),
      qualificationEndDate: backendContext.cleanIsoDate(competitionData.qualificationEndDate),
      missingEntryTimeMode: backendContext.cleanEngagementMissingEntryTimeMode(competitionData.missingEntryTimeMode)
    };
    const allowedIndividualEventCodes = new Set(
      competitionEvents.filter((event) => event.type === "individual").map((event) => event.code)
    );
    const maxEventsPerSwimmer = backendContext.cleanEngagementMaxEventsPerSwimmer(competitionData.maxEventsPerSwimmer);
    const requestedSwimmers = Array.isArray(requestData?.swimmers) ? requestData.swimmers : [];
    const uniqueSwimmers = [];
    const seen = new Set();
    requestedSwimmers.slice(0, 300).forEach((rawSwimmer) => {
      const swimmerIndexId = backendContext.cleanText(rawSwimmer?.swimmerIndexId).slice(0, 80);
      const requestedSource = backendContext.cleanText(rawSwimmer?.source);
      const source = requestedSource === "engagement"
        ? "engagement"
        : requestedSource === "reference"
          ? "reference"
          : "performances";
      const licenseNumber = backendContext.cleanText(rawSwimmer?.licenseNumber).toUpperCase().slice(0, 60);
      const individualEntries = backendContext.cleanEngagementEntryIndividualEntries(
        rawSwimmer?.individualEntries || rawSwimmer?.individualEventCodes || [],
        allowedIndividualEventCodes
      );
      if (!swimmerIndexId || seen.has(swimmerIndexId)) return;
      const requestedIndividualCodes = Array.isArray(rawSwimmer?.individualEventCodes)
        ? rawSwimmer.individualEventCodes.map((code) => backendContext.cleanText(code).toUpperCase().replace(/\s+/g, "")).filter(Boolean)
        : (Array.isArray(rawSwimmer?.individualEntries) ? rawSwimmer.individualEntries.map((entry) => backendContext.cleanText(entry?.eventCode || entry?.code).toUpperCase().replace(/\s+/g, "")).filter(Boolean) : []);
      if (requestedIndividualCodes.some((code) => !allowedIndividualEventCodes.has(code))) {
        throw new backendContext.HttpsError("invalid-argument", "Course individuelle non ouverte sur cette competition.");
      }
      if (maxEventsPerSwimmer > 0 && individualEntries.length > maxEventsPerSwimmer) {
        throw new backendContext.HttpsError("failed-precondition", `Maximum ${maxEventsPerSwimmer} course(s) individuelle(s) par nageur.`);
      }
      seen.add(swimmerIndexId);
      uniqueSwimmers.push({ swimmerIndexId, source, licenseNumber, individualEntries });
    });

    const referenceSwimmersById = new Map();
    backendContext.intranapSwimmersIndex.forEach((item) => {
      const swimmer = backendContext.engagementReferenceSwimmerItem(item);
      [
        item.id,
        item.swimmerId,
        ...(Array.isArray(item.aliases) ? item.aliases : []),
        ...(Array.isArray(item.sourceIds) ? item.sourceIds : [])
      ].map(backendContext.cleanText).filter(Boolean).forEach((id) => referenceSwimmersById.set(id, swimmer));
    });
    const firestoreSwimmers = uniqueSwimmers.filter((swimmer) => swimmer.source !== "reference");
    const firestoreRefs = firestoreSwimmers.map((swimmer) => backendContext.db
      .collection(swimmer.source === "engagement" ? "engagementClubSwimmers" : backendContext.PERFORMANCE_SWIMMERS_COLLECTION)
      .doc(swimmer.swimmerIndexId));
    const requestedLicenseIds = Array.from(new Set(uniqueSwimmers.flatMap((requestedSwimmer) => {
      const referenceSwimmer = requestedSwimmer.source === "reference"
        ? referenceSwimmersById.get(requestedSwimmer.swimmerIndexId)
        : null;
      return [requestedSwimmer.swimmerIndexId, referenceSwimmer?.id].map(backendContext.cleanText).filter(Boolean);
    })));
    const licenseReads = [];
    for (let index = 0; index < requestedLicenseIds.length; index += 10) {
      licenseReads.push(backendContext.db.collection("engagementSwimmerLicenses")
        .where("swimmerIndexId", "in", requestedLicenseIds.slice(index, index + 10))
        .get());
    }
    const [firestoreDocs, licenseSnapshots] = await Promise.all([
      firestoreRefs.length ? backendContext.db.getAll(...firestoreRefs) : [],
      Promise.all(licenseReads)
    ]);
    const firestoreDocsByRequestedId = new Map();
    firestoreDocs.forEach((doc, index) => {
      const requestedSwimmer = firestoreSwimmers[index];
      if (!requestedSwimmer) return;
      firestoreDocsByRequestedId.set(`${requestedSwimmer.source}:${requestedSwimmer.swimmerIndexId}`, doc);
    });
    const knownLicenses = new Map();
    licenseSnapshots.flatMap((snapshot) => snapshot.docs).forEach((doc) => {
      if (backendContext.cleanText(doc.data()?.clubId) !== context.clubId) return;
      const license = backendContext.engagementSwimmerLicenseItem(doc);
      if (license.swimmerIndexId) knownLicenses.set(license.swimmerIndexId, license);
    });

    let swimmers = await Promise.all(uniqueSwimmers.map(async (requestedSwimmer) => {
      let swimmer = null;
      if (requestedSwimmer.source === "reference") {
        swimmer = referenceSwimmersById.get(requestedSwimmer.swimmerIndexId) || null;
      } else {
        const doc = firestoreDocsByRequestedId.get(`${requestedSwimmer.source}:${requestedSwimmer.swimmerIndexId}`);
        if (doc?.exists) {
          swimmer = requestedSwimmer.source === "engagement"
            ? backendContext.engagementNewSwimmerItem(doc)
            : backendContext.engagementClubSwimmerItem(doc);
        }
      }
      if (!swimmer) {
        throw new backendContext.HttpsError("invalid-argument", "Nageur inconnu dans la base LivePalmes.");
      }
      if (requestedSwimmer.source === "engagement" && swimmer.active === false) {
        throw new backendContext.HttpsError("failed-precondition", "Nageur desactive par le niveau national.");
      }
      if (swimmer.clubId !== context.clubId) {
        throw new backendContext.HttpsError("permission-denied", "Nageur hors perimetre club.");
      }
      const knownLicense = knownLicenses.get(swimmer.swimmerIndexId) || knownLicenses.get(requestedSwimmer.swimmerIndexId);
      const storedLicenseNumber = backendContext.cleanText(knownLicense?.licenseNumber || swimmer.licenseNumber).toUpperCase().slice(0, 60);
      if (storedLicenseNumber && requestedSwimmer.licenseNumber && storedLicenseNumber !== requestedSwimmer.licenseNumber) {
        throw new backendContext.HttpsError("failed-precondition", "Le numero de licence deja enregistre ne peut pas etre modifie par le club.");
      }
      const licenseNumber = storedLicenseNumber || requestedSwimmer.licenseNumber;
      if (backendContext.ENGAGEMENT_REQUIRE_ENTRY_SWIMMER_LICENSE && !licenseNumber) {
        throw new backendContext.HttpsError("invalid-argument", "Numero de licence obligatoire pour chaque nageur.");
      }
      if (licenseNumber && !backendContext.ENGAGEMENT_SWIMMER_LICENSE_PATTERN.test(licenseNumber)) {
        throw new backendContext.HttpsError("invalid-argument", "Chaque licence doit respecter le format A-12-34567.");
      }
      const licenseVerificationStatus = storedLicenseNumber
        ? backendContext.cleanEngagementLicenseVerificationStatus(knownLicense?.verificationStatus || swimmer.licenseVerificationStatus, "pending")
        : "pending";
      const licenseSeason = storedLicenseNumber && knownLicense
        ? backendContext.engagementLicenseSeasonState(knownLicense)
        : backendContext.engagementLicenseSeasonState(swimmer);
      const individualEntries = openWater
        ? requestedSwimmer.individualEntries.map((entry) => ({ eventCode: entry.eventCode, status: "selected", entryTimeMode: "notRequired" }))
        : await backendContext.resolveEngagementIndividualEntriesForSwimmer(
            { ...swimmer, source: requestedSwimmer.source },
            requestedSwimmer.individualEntries,
            competitionTimeRules
          );
      return backendContext.cleanEngagementEntrySwimmer({
        ...swimmer,
        swimmerIndexId: swimmer.id,
        source: requestedSwimmer.source,
        licenseNumber,
        licenseVerificationStatus,
        licenseSeasonLabel: licenseSeason.label,
        licenseSeasonStatus: licenseSeason.status,
        licenseLocked: Boolean(storedLicenseNumber),
        individualEntries
      });
    }));
    if (!openWater && swimmers.some((swimmer) => swimmer.individualEntries.some((entry) => entry.entryTimeMode === "manual"))) {
      const recordsData = await backendContext.loadPerformanceRecordsData();
      swimmers = backendContext.validateEngagementIndividualEntryTimes(swimmers, competitionTimeRules, recordsData);
    }
    return swimmers;
  }

  return { buildEngagementClubSwimmersFromRequest };
}

module.exports = { createEntryService_buildEngagementClubSwimmersFromRequest };
