// Preserve the execution mode of the existing index.js function bodies.

// Private existing helpers; live services/state are supplied by index.js.
// Module creation performs no external operation.
function createEntryModelService(backendContext) {
  function cleanEngagementTeamLeader(raw = {}) {
    const mode = backendContext.cleanText(raw.mode) === "renounced" ? "renounced" : "person";
    if (mode === "renounced") {
      return {
        mode,
        renunciationAccepted: raw.renunciationAccepted === true
      };
    }
    const firstName = backendContext.cleanText(raw.firstName).slice(0, 80);
    const lastName = backendContext.cleanText(raw.lastName).slice(0, 80);
    const personId = backendContext.cleanText(raw.personId).slice(0, 80);
    const birthDate = backendContext.cleanIsoDate(raw.birthDate);
    const sex = ["F", "M"].includes(backendContext.cleanText(raw.sex).toUpperCase()) ? backendContext.cleanText(raw.sex).toUpperCase() : "";
    const licenseNumber = backendContext.cleanText(raw.licenseNumber).toUpperCase().slice(0, 60);
    const externalClub = raw.externalClub === true;
    const clubId = backendContext.cleanText(raw.clubId).slice(0, 40);
    const clubName = backendContext.cleanText(raw.clubName).slice(0, 140);
    if (!firstName || !lastName) {
      throw new backendContext.HttpsError("invalid-argument", "Nom et prenom du chef d'equipe obligatoires.");
    }
    if (!externalClub && !licenseNumber) {
      throw new backendContext.HttpsError("invalid-argument", "Numero de licence du chef d'equipe obligatoire.");
    }
    if (!externalClub && !backendContext.ENGAGEMENT_SWIMMER_LICENSE_PATTERN.test(licenseNumber)) {
      throw new backendContext.HttpsError("invalid-argument", "Le numero de licence doit respecter le format A-12-34567.");
    }
    if (externalClub && !clubName) {
      throw new backendContext.HttpsError("invalid-argument", "Club du chef d'equipe obligatoire.");
    }
    if (!externalClub && (!birthDate || !sex)) {
      throw new backendContext.HttpsError("invalid-argument", "Date de naissance et sexe du chef d'equipe obligatoires.");
    }
    return {
      mode,
      personId,
      firstName,
      lastName,
      birthDate: externalClub ? "" : birthDate,
      sex: externalClub ? "" : sex,
      licenseNumber,
      externalClub,
      clubId,
      clubName
    };
  }

  function engagementTeamLeaderComplete(teamLeader = {}) {
    if (teamLeader.mode === "renounced") return teamLeader.renunciationAccepted === true;
    return Boolean(teamLeader.mode === "person" && teamLeader.firstName && teamLeader.lastName && (teamLeader.externalClub ? teamLeader.clubName : teamLeader.licenseNumber));
  }

  function cleanEngagementEntryOfficial(raw = {}) {
    return {
      personId: backendContext.cleanText(raw.personId).slice(0, 80),
      firstName: backendContext.cleanText(raw.firstName).slice(0, 80),
      lastName: backendContext.cleanText(raw.lastName).slice(0, 80),
      birthDate: backendContext.cleanIsoDate(raw.birthDate),
      licenseNumber: backendContext.cleanText(raw.licenseNumber).slice(0, 60)
    };
  }

  function parseEngagementEntryTime(value) {
    const text = backendContext.cleanText(value).replace(",", ".").replace(/\s+/g, "");
    if (!text) return null;
    if (text === "595999" || text === "59:59.99") {
      return { display: "59:59.99", value: 359999 };
    }
    const digitText = text.replace(/\D/g, "");
    if (/^\d{1,6}$/.test(text) && digitText === text) {
      const padded = digitText.padStart(digitText.length <= 4 ? 4 : 6, "0");
      const hundredths = Number(padded.slice(-2));
      const seconds = Number(padded.slice(-4, -2));
      const minutes = Number(padded.slice(0, -4) || 0);
      if (seconds >= 60) return null;
      const value = minutes * 6000 + seconds * 100 + hundredths;
      return value > 0 ? { display: backendContext.formatTimeValue(value), value } : null;
    }
    const parsedValue = backendContext.parseTimeValue(text);
    return parsedValue ? { display: backendContext.formatTimeValue(parsedValue), value: parsedValue } : null;
  }

  function cleanEngagementEntryIndividualEntries(rawEntries = [], allowedCodes = null) {
    if (!Array.isArray(rawEntries)) return [];
    const seen = new Set();
    return rawEntries.slice(0, 80).map((rawEntry) => {
      const eventCode = backendContext.cleanText(rawEntry?.eventCode || rawEntry?.code || rawEntry)
        .toUpperCase()
        .replace(/\s+/g, "");
      if (!eventCode || seen.has(eventCode) || (allowedCodes && !allowedCodes.has(eventCode))) return null;
      seen.add(eventCode);
      return {
        eventCode,
        ...(rawEntry?.qualification ? { qualification: rawEntry.qualification } : {}),
        status: backendContext.cleanText(rawEntry?.status || "selected").slice(0, 40) || "selected",
        manualEntryTime: backendContext.cleanText(rawEntry?.manualEntryTime || rawEntry?.entryTimeManual).slice(0, 20),
        entryTime: backendContext.cleanText(rawEntry?.entryTime).slice(0, 20),
        entryTimeValue: Number(rawEntry?.entryTimeValue || 0) || 0,
        entryTimeMode: backendContext.cleanText(rawEntry?.entryTimeMode).slice(0, 40),
        entryTimeWarning: backendContext.cleanText(rawEntry?.entryTimeWarning).slice(0, 220),
        sourcePerformanceId: backendContext.cleanText(rawEntry?.sourcePerformanceId).slice(0, 120),
        date: backendContext.cleanIsoDate(rawEntry?.date),
        location: backendContext.cleanText(rawEntry?.location).slice(0, 160)
      };
    }).filter(Boolean);
  }

  function cleanEngagementEntrySwimmer(raw = {}) {
    const licenseSeason = backendContext.engagementLicenseSeasonState(raw);
    return {
      swimmerIndexId: backendContext.cleanText(raw.swimmerIndexId).slice(0, 80),
      source: backendContext.cleanText(raw.source || "performances").slice(0, 40),
      swimmerId: backendContext.cleanText(raw.swimmerId).slice(0, 80),
      identityKey: backendContext.cleanText(raw.identityKey).slice(0, 180),
      firstName: backendContext.cleanText(raw.firstName).slice(0, 80),
      lastName: backendContext.cleanText(raw.lastName).slice(0, 80),
      name: backendContext.cleanText(raw.name).slice(0, 160),
      birthDate: backendContext.cleanIsoDate(raw.birthDate),
      sex: backendContext.cleanText(raw.sex).slice(0, 20),
      clubId: backendContext.cleanText(raw.clubId).slice(0, 40),
      club: backendContext.cleanText(raw.club).slice(0, 60),
      clubName: backendContext.cleanText(raw.clubName).slice(0, 140),
      licenseNumber: backendContext.cleanText(raw.licenseNumber).slice(0, 60),
      licenseVerificationStatus: backendContext.cleanEngagementLicenseVerificationStatus(raw.licenseVerificationStatus || raw.verificationStatus, "pending"),
      licenseSeasonLabel: backendContext.cleanText(raw.licenseSeasonLabel || licenseSeason.label).slice(0, 20),
      licenseSeasonStatus: backendContext.cleanEngagementLicenseSeasonStatus(raw.licenseSeasonStatus || licenseSeason.status, "to_check"),
      licenseLocked: raw.licenseLocked === true || raw.licenseNumberLocked === true,
      latestDate: backendContext.cleanIsoDate(raw.latestDate),
      performanceCount: Math.max(0, Math.trunc(Number(raw.performanceCount) || 0)),
      individualEntries: cleanEngagementEntryIndividualEntries(raw.individualEntries || raw.individualEventCodes || [])
    };
  }

  function engagementRelayAllowedCategories(event = {}) {
    const categories = backendContext.ENGAGEMENT_RELAY_CATEGORY_CODES.filter((category) =>
      !(backendContext.ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES[event.code] || new Set()).has(category)
    );
    const restrictions = Array.isArray(event.categoryRestrictions)
      ? event.categoryRestrictions.filter((category) => categories.includes(category))
      : [];
    return restrictions.length ? restrictions : categories;
  }

  function cleanEngagementRelayGenderMode(rawRelay = {}, event = {}) {
    const mode = backendContext.cleanText(rawRelay.genderMode || rawRelay.sexMode || rawRelay.relayGenderMode);
    if (event.relayMixedRule === "required") return "mixed";
    if (event.relayMixedRule === "mastersOnly" && event.relayMixedMode === "masters") {
      return backendContext.ENGAGEMENT_PROGRAM_GENDER_MODES.has(mode) ? mode : "mixed";
    }
    return mode === "male" ? "male" : "female";
  }

  function engagementRelayMemberCategory(member = {}, competitionDate = "") {
    return backendContext.ageCategoryFromDates(competitionDate, member.birthDate);
  }

  function engagementRelayMemberAge(member = {}, competitionDate = "") {
    const seasonYear = backendContext.importSeasonYear(competitionDate) || backendContext.competitionYear(competitionDate);
    const born = backendContext.birthYear(member.birthDate);
    const age = seasonYear && born ? seasonYear - born : 0;
    return Number.isFinite(age) && age > 0 ? age : 0;
  }

  function engagementRelayMemberAllowedForCategory(member = {}, relayCategory = "", competitionDate = "") {
    const category = engagementRelayMemberCategory(member, competitionDate);
    if (!category) return false;
    if (backendContext.cleanText(relayCategory).startsWith("R")) return /^M\d/.test(category);
    if (relayCategory === "S") return true;
    const swimmerRank = backendContext.ENGAGEMENT_RELAY_AGE_CATEGORY_RANK[category];
    const relayRank = backendContext.ENGAGEMENT_RELAY_AGE_CATEGORY_RANK[relayCategory];
    return Number.isFinite(swimmerRank) && Number.isFinite(relayRank) && swimmerRank <= relayRank;
  }

  function assertEngagementRelayMembers(relay = {}, event = {}, swimmerById = new Map(), competition = {}) {
    const memberIds = Array.from(new Set((Array.isArray(relay.memberIds) ? relay.memberIds : [])
      .map((id) => backendContext.cleanText(id).slice(0, 80))
      .filter(Boolean)))
      .slice(0, Number(event.relayLegs || 4) || 4);
    if (!memberIds.length) return [];
    const expectedLegs = Number(event.relayLegs || 4) || 4;
    if (memberIds.length !== expectedLegs) {
      throw new backendContext.HttpsError("failed-precondition", `Indiquez ${expectedLegs} relayeurs ou laissez le relais sans relayeurs.`);
    }
    const members = memberIds.map((memberId) => {
      const swimmer = swimmerById.get(memberId);
      if (!swimmer) throw new backendContext.HttpsError("failed-precondition", "Relayeur non selectionne dans les nageurs de la competition.");
      return {
        swimmerIndexId: swimmer.swimmerIndexId,
        swimmerId: swimmer.swimmerId,
        firstName: swimmer.firstName,
        lastName: swimmer.lastName,
        name: swimmer.name,
        birthDate: swimmer.birthDate,
        sex: backendContext.normalizeCategoryCode(swimmer.sex),
        licenseNumber: swimmer.licenseNumber
      };
    });
    if (relay.genderMode === "female" && members.some((member) => member.sex !== "F")) {
      throw new backendContext.HttpsError("failed-precondition", "Un relais Femmes ne peut contenir que des nageuses.");
    }
    if (relay.genderMode === "male" && members.some((member) => member.sex !== "M")) {
      throw new backendContext.HttpsError("failed-precondition", "Un relais Hommes ne peut contenir que des nageurs.");
    }
    if (relay.genderMode === "mixed") {
      const invalidOrderIndex = members.findIndex((member, index) => member.sex !== (index % 2 === 0 ? "M" : "F"));
      if (invalidOrderIndex >= 0) {
        throw new backendContext.HttpsError("failed-precondition", "Un relais mixte doit respecter l'ordre Homme - Femme - Homme - Femme.");
      }
    }
    if (relay.category.startsWith("R")) {
      if (members.some((member) => !/^M\d/.test(engagementRelayMemberCategory(member, competition.date)))) {
        throw new backendContext.HttpsError("failed-precondition", `Relais ${relay.category} reserve aux categories Master.`);
      }
      const minimumAge = Number(relay.category.replace(/\D/g, "")) || 0;
      const totalAge = members.reduce((sum, member) => sum + engagementRelayMemberAge(member, competition.date), 0);
      if (minimumAge && totalAge < minimumAge) {
        throw new backendContext.HttpsError("failed-precondition", `Relais ${relay.category} impossible : total d'age ${totalAge}, minimum ${minimumAge}.`);
      }
    } else {
      const invalidMember = members.find((member) => !engagementRelayMemberAllowedForCategory(member, relay.category, competition.date));
      if (invalidMember) {
        throw new backendContext.HttpsError("failed-precondition", `Relayeur non autorise en relais ${relay.category} pour ${event.shortLabel || event.code}.`);
      }
    }
    return members;
  }

  function cleanEngagementEntryRelays(rawRelays = [], competition = {}, swimmers = []) {
    if (!Array.isArray(rawRelays)) return [];
    const relayEvents = new Map((Array.isArray(competition.events) ? competition.events : [])
      .filter((event) => event.type === "relay")
      .map((event) => [event.code, event]));
    const swimmerById = new Map((Array.isArray(swimmers) ? swimmers : [])
      .map((swimmer) => [backendContext.cleanText(swimmer.swimmerIndexId), swimmer])
      .filter(([id]) => id));
    const seenRelays = new Set();
    const memberDistanceSlots = new Set();
    return rawRelays.slice(0, 80).map((rawRelay) => {
      const eventCode = backendContext.normalizeCourseCode(rawRelay?.eventCode || rawRelay?.code);
      const event = relayEvents.get(eventCode);
      if (!event) throw new backendContext.HttpsError("invalid-argument", "Relais non ouvert sur cette competition.");
      const allowedCategories = engagementRelayAllowedCategories(event);
      const category = backendContext.cleanText(rawRelay?.category).toUpperCase();
      if (!allowedCategories.includes(category)) {
        throw new backendContext.HttpsError("invalid-argument", `Categorie ${category || "-"} non ouverte pour ${event.shortLabel || event.code}.`);
      }
      const genderMode = cleanEngagementRelayGenderMode(rawRelay, event);
      const duplicateKey = [eventCode, category, genderMode].join("|");
      if (!event.multipleRelaysAllowed && seenRelays.has(duplicateKey)) {
        throw new backendContext.HttpsError("failed-precondition", "Un relais identique existe deja pour ce club.");
      }
      seenRelays.add(duplicateKey);
      const openWater = backendContext.cleanEngagementCompetitionType(competition.competitionType) === "openWater";
      const manual = openWater ? null : parseEngagementEntryTime(rawRelay?.manualEntryTime || rawRelay?.entryTime);
      if (!openWater && !manual) {
        throw new backendContext.HttpsError("invalid-argument", `Temps d'engagement requis pour ${event.shortLabel || event.code}.`);
      }
      const relay = {
        relayId: backendContext.cleanText(rawRelay?.relayId).slice(0, 80) || backendContext.stableHash([eventCode, category, genderMode, manual?.display || "no-time"].join("|")).slice(0, 24),
        eventCode,
        category,
        genderMode,
        manualEntryTime: backendContext.cleanText(rawRelay?.manualEntryTime || rawRelay?.entryTime).slice(0, 20),
        entryTime: manual?.display || "",
        entryTimeValue: manual?.value || 0,
        memberIds: Array.isArray(rawRelay?.memberIds) ? rawRelay.memberIds : []
      };
      const members = assertEngagementRelayMembers(relay, event, swimmerById, competition);
      members.forEach((member) => {
        const slotKey = [member.swimmerIndexId, event.distance, event.discipline].join("|");
        if (memberDistanceSlots.has(slotKey)) {
          throw new backendContext.HttpsError("failed-precondition", "Un relayeur ne peut pas etre inscrit dans deux relais de meme distance et meme nature.");
        }
        memberDistanceSlots.add(slotKey);
      });
      return backendContext.cleanFirestoreValue({
        ...relay,
        members,
        memberIds: members.map((member) => member.swimmerIndexId)
      });
    }).filter(Boolean);
  }

  function qualificationRelaysAfterIndividualChange(relays = [], swimmers = [], competition = {}) {
    const selectedIds = new Set(swimmers.map((swimmer) => swimmer.swimmerIndexId));
    relays = relays.map((relay) => ({ ...relay,
      memberIds: (relay.memberIds || []).filter((id) => selectedIds.has(id)),
      members: (relay.members || []).filter((member) => selectedIds.has(member.swimmerIndexId))
    }));
    if (!competition.qualifications?.enabled) return relays;
    const evaluations = Object.fromEntries(swimmers.map((swimmer) => [swimmer.swimmerIndexId, {
      courses: Object.fromEntries((swimmer.individualEntries || []).map((entry) => [entry.eventCode, entry.qualification || {}]))
    }]));
    return relays.filter((relay) => backendContext.qualificationEngine.relayEligible(relay, swimmers, evaluations));
  }

  function qualificationEvents(competition = {}) {
    return backendContext.cleanEngagementCompetitionEvents(competition.events || [], { strict: false, competitionType: competition.competitionType })
      .map((event) => ({ ...event, categories: event.categoryRestrictions?.length ? event.categoryRestrictions : backendContext.engagementCategoryCodesForEvent(event.code)
        .filter((category) => !(backendContext.ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES[event.code] || new Set()).has(category)) }));
  }

  function qualificationService() {
    if (!backendContext.legacyQualificationService) {
      backendContext.legacyQualificationService = backendContext.createQualificationService({ db: /* backend-shorthand */ backendContext.db, HttpsError: /* backend-shorthand */ backendContext.HttpsError, categoryFor: backendContext.ageCategoryFromDates,
        eventsFor: qualificationEvents, rowsFor: getEngagementQualificationRows, cacheIdFor: engagementEntryTimeCacheId,
        automaticEntryFor: automaticEngagementIndividualEntry,
        access: backendContext.engagementAccessContext, clubAccess: backendContext.engagementClubAccessContext, entryIdFor: backendContext.engagementClubEntryId,
        assertOpen: backendContext.assertEngagementClubWriteOpen, audit: backendContext.writeAuditLog });
    }
    return backendContext.legacyQualificationService;
  }

  function nativeQualificationServices(context) {
    const competitionFor=(pack,rules)=>({...require("./nap-portal-workspaces").competitionItem(pack,backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE),...(rules?{qualifications:rules}:{})});
    return {
      authorize:event=>backendContext.assertCanModifyEngagementEvent(context,event),
      competitionFor,eventsFor:pack=>qualificationEvents(competitionFor(pack)),categoryFor:backendContext.ageCategoryFromDates,
      automatic:automaticEngagementIndividualEntry,assertOpen:backendContext.assertEngagementClubWriteOpen,
      effects:require("./nap-qualification-effects").effects,
      eventDefinitions:backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE,normalizeProgram:backendContext.cleanEngagementProgramSessions,normalizeEvents:backendContext.cleanEngagementCompetitionEvents,
      applyNativePatch:input=>require("./nap-portal-competition-change").applyCompetitionChange(
        require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),
        {...input,national:true,eventDefinitions:backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE,normalizeProgram:backendContext.cleanEngagementProgramSessions,normalizeEvents:backendContext.cleanEngagementCompetitionEvents},
        {
          read:async operation=>{const snapshot=await backendContext.db.collection("auditLogs").doc(`nap-competition-${operation}-before`).get();return snapshot.exists?snapshot.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-competition-${operation}-before`).create({action:"nap.competition.change.prepare",actorUid:input.actorUid,target:{...target,notificationOpeningRequested:input.notificationOpeningRequested===true},createdAt:new Date().toISOString()}),
          complete:async(operation,target)=>{await backendContext.armNativeCompetitionNotification(context,input,operation);await backendContext.writeAuditLogOnce("nap.competition.changed",input.actorUid,{...target,auditPreparationId:`nap-competition-${operation}-before`},operation);}
        },event=>backendContext.assertCanModifyEngagementEvent(context,event))
    };
  }

  function nativeQualificationError(error){
    if(error instanceof backendContext.HttpsError)return error;
    return new backendContext.HttpsError(error instanceof TypeError?"failed-precondition":error instanceof RangeError?"resource-exhausted":"unavailable",error instanceof TypeError||error instanceof RangeError?error.message:"Traitement NAP interrompu. Reprenez le meme controle ; sa sauvegarde est conservee.");
  }

  function engagementQualificationRowAllowed(row = {}, competition = {}) {
    if (row.active === false || row.status === "hidden") return false;
    if (!Number(row.timeValue || 0)) return false;
    if (competition.qualificationTimesMode === "period") {
      const date = backendContext.cleanIsoDate(row.date);
      if (!date) return false;
      if (competition.qualificationStartDate && date < competition.qualificationStartDate) return false;
      if (competition.qualificationEndDate && date > competition.qualificationEndDate) return false;
    }
    return true;
  }

  function bestEngagementKnownTime(rows = [], eventCode = "", competition = {}) {
    return rows
      .filter((row) => backendContext.cleanText(row.course).toUpperCase().replace(/\s+/g, "") === eventCode)
      .filter((row) => engagementQualificationRowAllowed(row, competition))
      .reduce((best, row) => backendContext.publicBetterPerformance(row, best) ? row : best, null);
  }

  function engagementKnownTimeHistory(rows = [], eventCode = "", competition = {}, limit = 10) {
    const normalizedEventCode = backendContext.cleanText(eventCode).toUpperCase().replace(/\s+/g, "");
    return rows
      .filter((row) => backendContext.cleanText(row.course).toUpperCase().replace(/\s+/g, "") === normalizedEventCode)
      .filter((row) => engagementQualificationRowAllowed(row, competition))
      .sort((left, right) =>
        backendContext.cleanText(right.date).localeCompare(backendContext.cleanText(left.date)) ||
        Number(left.timeValue || 0) - Number(right.timeValue || 0)
      )
      .slice(0, Math.max(1, Math.min(2000, Number(limit || 10))))
      .map((row) => backendContext.cleanFirestoreValue({
        entryTime: backendContext.formatTimeValue(Number(row.timeValue || 0)) || backendContext.cleanText(row.time),
        entryTimeValue: Number(row.timeValue || 0) || 0,
        sourcePerformanceId: backendContext.cleanText(row.publicKey || row.performanceBaseId || row.id).slice(0, 160),
        date: backendContext.cleanIsoDate(row.date),
        location: backendContext.cleanText(row.location).slice(0, 160),
        pool: backendContext.cleanText(row.pool).slice(0, 20),
        chrono: backendContext.cleanText(row.chrono).slice(0, 40)
      }));
  }

  function engagementEntryTimeCacheId(swimmer = {}) {
    return backendContext.stableHash([
      backendContext.cleanText(swimmer.source || "performances"),
      backendContext.cleanText(swimmer.identityKey || swimmer.swimmerIdentityKey || swimmer.swimmerIndexId || swimmer.id || swimmer.swimmerId)
    ].filter(Boolean).join("|")).slice(0, 40);
  }

  function engagementEntryTimeCacheRef(db, swimmer = {}) {
    return db.collection(backendContext.ENGAGEMENT_ENTRY_TIME_CACHES_COLLECTION).doc(engagementEntryTimeCacheId(swimmer));
  }

  function engagementEntryTimeCacheRow(row = {}) {
    return backendContext.cleanFirestoreValue({
      competitionId: backendContext.cleanText(row.competitionId || String(row.id || "").match(/^import:([^:]+):/)?.[1]).slice(0, 160),
      qualificationCompetitionId: backendContext.cleanText(row.qualificationCompetitionId).slice(0, 160),
      category: backendContext.cleanText(row.category),
      active: row.active !== false,
      status: backendContext.cleanText(row.status || "active"),
      publicKey: backendContext.cleanText(row.publicKey || row.performanceBaseId || row.id).slice(0, 160),
      performanceBaseId: backendContext.cleanText(row.performanceBaseId).slice(0, 160),
      date: backendContext.cleanIsoDate(row.date),
      course: backendContext.normalizeCourseCode(row.course),
      time: backendContext.cleanText(row.time).slice(0, 20),
      timeValue: Number(row.timeValue || 0) || 0,
      location: backendContext.cleanText(row.location).slice(0, 160),
      competition: backendContext.cleanText(row.competition).slice(0, 180),
      pool: backendContext.cleanText(row.pool).slice(0, 20),
      chrono: backendContext.cleanText(row.chrono).slice(0, 40)
    });
  }

  function engagementEntryTimeCacheRowsFromData(data = {}) {
    const events = data.events && typeof data.events === "object" ? data.events : {};
    return Object.values(events)
      .flatMap((rows) => Array.isArray(rows) ? rows : [])
      .map(engagementEntryTimeCacheRow)
      .filter((row) => row.course && row.date && row.timeValue);
  }

  function engagementEntryTimeRowsToEvents(rows = []) {
    const events = {};
    let bytes = 0;
    rows
      .map(engagementEntryTimeCacheRow)
      .filter((row) => row.course && row.date && row.timeValue)
      .sort((left, right) =>
        backendContext.cleanText(right.date).localeCompare(backendContext.cleanText(left.date)) ||
        backendContext.cleanText(left.course).localeCompare(backendContext.cleanText(right.course), "fr-FR", { numeric: true }) ||
        Number(left.timeValue || 0) - Number(right.timeValue || 0)
      )
      .slice(0, 1500)
      .forEach((row) => {
        const size = Buffer.byteLength(JSON.stringify(row), "utf8");
        if (bytes + size > 700000) return;
        bytes += size;
        if (!events[row.course]) events[row.course] = [];
        events[row.course].push(row);
      });
    return events;
  }

  function engagementEntryTimeSourceKeys(swimmer = {}) {
    return Array.from(new Set([
      swimmer.identityKey,
      swimmer.swimmerIdentityKey,
      swimmer.swimmerId,
      ...(Array.isArray(swimmer.sourceIds) ? swimmer.sourceIds : [])
    ].map(backendContext.cleanText).filter(Boolean))).slice(0, backendContext.ENGAGEMENT_ENTRY_TIME_SOURCE_KEY_LIMIT);
  }

  async function readEngagementEntryTimeSourceRows(swimmer = {}) {
    const sourceKeys = engagementEntryTimeSourceKeys(swimmer);
    for (const sourceKey of sourceKeys) {
      const payload = await backendContext.readPublicPerformanceJson(backendContext.publicPerformanceSwimmerFilePath(sourceKey), null);
      if (!payload || !Array.isArray(payload.rows)) continue;
      return {
        sourceKey,
        rows: backendContext.hydratePublicSwimmerRowsFromPayload(payload.rows, payload, sourceKey).map(backendContext.publicPerformanceBaseRow)
      };
    }
    const identity = backendContext.cleanText(swimmer.identityKey || swimmer.swimmerIdentityKey);
    const indexId = identity ? backendContext.stableHash(identity).slice(0, 40) : backendContext.cleanText(swimmer.swimmerIndexId || swimmer.id);
    return require("./engagement-performance-history").readIndexedHistory({ db: /* backend-shorthand */ backendContext.db, indexId, HttpsError: /* backend-shorthand */ backendContext.HttpsError });
  }

  async function rebuildEngagementEntryTimeCache(db, swimmer = {}) {
    const source = backendContext.cleanText(swimmer.source || "performances");
    const indexedSource = source === "engagement" ? { sourceKey: "", rows: [] } : await readEngagementEntryTimeSourceRows(swimmer);
    if (!indexedSource) {
      console.warn("livepalmes.engagement.times.source_missing", {
        cacheId: engagementEntryTimeCacheId(swimmer),
        sourceKeyCount: engagementEntryTimeSourceKeys(swimmer).length
      });
      throw new backendContext.HttpsError(
        "failed-precondition",
        "Historique des performances momentanement indisponible pour ce nageur. Aucun parcours massif n'a ete lance."
      );
    }
    const rows = indexedSource.rows;
    const activeRows = rows
      .map(backendContext.publicPerformanceBaseRow)
      .filter((row) => engagementQualificationRowAllowed(row, { qualificationTimesMode: "all" }));
    const events = engagementEntryTimeRowsToEvents(activeRows);
    const now = new Date().toISOString();
    await engagementEntryTimeCacheRef(db, swimmer).set({
      version: backendContext.ENGAGEMENT_ENTRY_TIME_CACHE_VERSION,
      source,
      swimmerIndexId: backendContext.cleanText(swimmer.swimmerIndexId || swimmer.id).slice(0, 80),
      swimmerId: backendContext.cleanText(swimmer.swimmerId).slice(0, 80),
      identityKey: backendContext.cleanText(swimmer.identityKey).slice(0, 180),
      sourceDataset: source === "engagement" ? "engagement" : indexedSource.sourceDataset || "public-performance-file",
      sourceKey: backendContext.cleanText(indexedSource.sourceKey).slice(0, 180),
      generatedAt: now,
      updatedAt: now,
      truncated: activeRows.length > Object.values(events).reduce((sum, eventRows) => sum + eventRows.length, 0),
      rowCount: Object.values(events).reduce((sum, eventRows) => sum + eventRows.length, 0),
      events
    }, { merge: false });
    return { cachedRows: engagementEntryTimeCacheRowsFromData({ events }), completeRows: activeRows };
  }

  async function getEngagementEntryTimeRowsForSwimmer(swimmer = {}, { requireComplete = false } = {}) {
    if (backendContext.cleanText(swimmer.source) === "engagement") return [];
    const cacheId = engagementEntryTimeCacheId(swimmer);
    const cacheSnapshot = await engagementEntryTimeCacheRef(backendContext.db, swimmer).get();
    const cacheReady = cacheSnapshot.exists &&
      Number(cacheSnapshot.data()?.version || 0) === backendContext.ENGAGEMENT_ENTRY_TIME_CACHE_VERSION &&
      backendContext.cleanText(cacheSnapshot.data()?.generatedAt);
    if (cacheReady) {
      console.info("livepalmes.engagement.times.cache", { cacheId, cacheHit: true });
      if (requireComplete && cacheSnapshot.data().truncated) {
        const source = await readEngagementEntryTimeSourceRows(swimmer);
        if (!source) throw new backendContext.HttpsError("unavailable", "Historique momentanément indisponible. Réessayez avant de vous engager.");
        return source.rows;
      }
      return engagementEntryTimeCacheRowsFromData(cacheSnapshot.data() || {});
    }
    if (backendContext.engagementEntryTimeCacheBuilds.has(cacheId)) {
      console.info("livepalmes.engagement.times.cache", { cacheId, cacheHit: false, sharedBuild: true });
      const shared = await backendContext.engagementEntryTimeCacheBuilds.get(cacheId);
      return requireComplete ? shared.completeRows : shared.cachedRows;
    }
    console.info("livepalmes.engagement.times.cache", { cacheId, cacheHit: false, sharedBuild: false });
    const build = rebuildEngagementEntryTimeCache(backendContext.db, swimmer)
      .finally(() => backendContext.engagementEntryTimeCacheBuilds.delete(cacheId));
    backendContext.engagementEntryTimeCacheBuilds.set(cacheId, build);
    const result = await build;
    return requireComplete ? result.completeRows : result.cachedRows;
  }

  async function getEngagementQualificationRows(swimmer = {}, competition = {}) {
    let rows = await getEngagementEntryTimeRowsForSwimmer(swimmer, { requireComplete: true });
    const group = competition.qualifications?.groups?.find((item) => item.categories.includes(backendContext.ageCategoryFromDates(competition.date, swimmer.birthDate)));
    if (group?.competitionMode !== "selected" || !rows.some((row) => !row.competitionId && row.date >= group.startDate && row.date <= group.endDate)) return rows;
    // Older compact Storage files omit competition ids. Reuse existing swimmer
    // pages (500 results/document) instead of reading each performance separately.
    const identity = backendContext.cleanText(swimmer.identityKey || swimmer.swimmerIdentityKey);
    const indexId = identity ? backendContext.stableHash(identity).slice(0, 40) : backendContext.cleanText(swimmer.swimmerIndexId || swimmer.id);
    const index = await backendContext.db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION).doc(indexId).get();
    const count = Number(index.data()?.pageCount || 0);
    if (!count || count > 20) throw new backendContext.HttpsError("failed-precondition", "L'index des compétitions de ce nageur doit être actualisé par le National avant contrôle. Aucun engagement n'a été supprimé.");
    const pages = await backendContext.db.getAll(...Array.from({ length: count }, (_, page) => backendContext.db.collection(backendContext.PERFORMANCE_SWIMMER_PAGES_COLLECTION).doc(backendContext.performanceSwimmerPageId(indexId, page))));
    if (pages.some((page) => !page.exists)) throw new backendContext.HttpsError("unavailable", "Index des performances incomplet. Réessayez après son actualisation.");
    const byId = new Map(pages.flatMap((page) => page.data().rows || []).flatMap((row) => [row.publicKey, row.performanceBaseId, row.id].map(backendContext.cleanText).filter(Boolean).map((id) => [id, row])));
    const signature = (items) => backendContext.stableHash(JSON.stringify(items.map(engagementEntryTimeCacheRow).sort((a, b) => a.publicKey.localeCompare(b.publicKey))));
    const sourceSignature = signature(rows);
    rows = rows.map((row) => {
      const full = byId.get(backendContext.cleanText(row.publicKey || row.performanceBaseId || row.id));
      return { ...row, competitionId: row.competitionId || backendContext.cleanText(full?.competitionId), qualificationCompetitionId: row.qualificationCompetitionId || backendContext.cleanText(full?.qualificationCompetitionId) };
    });
    if (rows.some((row) => !row.competitionId && row.date >= group.startDate && row.date <= group.endDate)) throw new backendContext.HttpsError("failed-precondition", "Certaines performances n'ont pas de compétition identifiée. Le National doit actualiser leur index avant contrôle.");
    const events = engagementEntryTimeRowsToEvents(rows);
    await backendContext.db.runTransaction(async (tx) => {
      const ref = engagementEntryTimeCacheRef(backendContext.db, swimmer);
      const current = await tx.get(ref);
      if (current.exists && signature(engagementEntryTimeCacheRowsFromData(current.data())) === sourceSignature) {
        tx.set(ref, { events, truncated: rows.length > Object.values(events).flat().length }, { merge: true });
      }
    });
    return rows;
  }

  function deleteEngagementEntryTimeCache(batch, db, swimmer = {}) {
    const cacheId = engagementEntryTimeCacheId(swimmer);
    if (!cacheId) return;
    batch.delete(db.collection(backendContext.ENGAGEMENT_ENTRY_TIME_CACHES_COLLECTION).doc(cacheId));
  }

  async function invalidateEngagementEntryTimeCachesForPerformanceRows(rows = []) {
    const cacheIds = Array.from(new Set(rows
      .flatMap((row) => ["performances", "reference"].map((source) => engagementEntryTimeCacheId({
        source,
        identityKey: backendContext.performanceSwimmerIndexKey(row),
        swimmerId: row.swimmerId
      })))
      .filter(Boolean)));
    let batch = backendContext.db.batch();
    let batchSize = 0;
    const commits = [];
    cacheIds.forEach((cacheId) => {
      batch.delete(backendContext.db.collection(backendContext.ENGAGEMENT_ENTRY_TIME_CACHES_COLLECTION).doc(cacheId));
      batchSize += 1;
      if (batchSize >= 450) {
        commits.push(batch.commit());
        batch = backendContext.db.batch();
        batchSize = 0;
      }
    });
    if (batchSize) commits.push(batch.commit());
    await Promise.all(commits);
    return cacheIds.length;
  }

  function engagementCompetitionAppliesToFranceRecords(competition = {}) {
    return backendContext.cleanEngagementPoolLength(competition.poolLength) === "50" &&
      backendContext.cleanEngagementTimingType(competition.timingType) === "electronic";
  }

  function engagementCompetitionAppliesToMpf(competition = {}) {
    const timingType = backendContext.cleanEngagementTimingType(competition.timingType);
    const poolLength = backendContext.cleanEngagementPoolLength(competition.poolLength);
    return timingType === "manual" || (timingType === "electronic" && poolLength !== "50");
  }

  function engagementRecordReferencesForEntry(referenceMap, swimmer = {}, entry = {}, competition = {}) {
    const eventCode = backendContext.normalizeCourseCode(entry.eventCode);
    const sex = backendContext.normalizeCategoryCode(swimmer.sex);
    const category = backendContext.ageCategoryFromDates(competition.date, swimmer.birthDate);
    if (!eventCode || (sex !== "F" && sex !== "M") || !category || !backendContext.POOL_COURSES.includes(eventCode)) {
      return [];
    }
    const perf = {
      sex,
      course: eventCode
    };
    const references = [];
    if (engagementCompetitionAppliesToFranceRecords(competition)) {
      references.push(backendContext.recordReferenceForPerformance(referenceMap, "RF", perf, category));
      if (backendContext.isYouthCategory(category)) {
        references.push(backendContext.recordReferenceForPerformance(referenceMap, "RFJ", perf, category));
      }
    }
    if (engagementCompetitionAppliesToMpf(competition)) {
      references.push(backendContext.recordReferenceForPerformance(referenceMap, "MPF", perf, category));
    }
    return references.filter(Boolean);
  }

  function engagementEntryTimeWarning(entry = {}, references = []) {
    const timeValue = Number(entry.entryTimeValue || 0) || 0;
    if (!timeValue || backendContext.cleanText(entry.entryTimeMode) !== "manual") return "";
    const fastestReference = references
      .map((reference) => Number(reference.value || 0) || 0)
      .filter(Boolean)
      .sort((a, b) => a - b)[0] || 0;
    if (!fastestReference) return "";
    return timeValue >= fastestReference * 5
      ? "Temps manuel tres lent par rapport aux references connues."
      : "";
  }

  function validateEngagementIndividualEntryTimes(swimmers = [], competition = {}, recordsData = {}) {
    const referenceMap = backendContext.recordReferenceMap(recordsData);
    return swimmers.map((swimmer) => ({
      ...swimmer,
      individualEntries: (Array.isArray(swimmer.individualEntries) ? swimmer.individualEntries : []).map((entry) => {
        const timeValue = Number(entry.entryTimeValue || 0) || 0;
        const references = engagementRecordReferencesForEntry(referenceMap, swimmer, entry, competition);
        const manualEntry = backendContext.cleanText(entry.entryTimeMode) === "manual";
        const blockingReference = references
          .filter((reference) => manualEntry && timeValue > 0 && timeValue < Number(reference.value || 0))
          .sort((a, b) => Number(a.value || 0) - Number(b.value || 0))[0];
        if (blockingReference) {
          const swimmerName = backendContext.cleanText(swimmer.name) ||
            [backendContext.cleanText(swimmer.firstName), backendContext.cleanText(swimmer.lastName)].filter(Boolean).join(" ");
          const label = backendContext.cleanText(blockingReference.alertLabel || blockingReference.recordTypeLabel || blockingReference.alertType);
          const referenceTime = backendContext.cleanText(blockingReference.time) || backendContext.formatTimeValue(blockingReference.value);
          throw new backendContext.HttpsError(
            "failed-precondition",
            `Temps impossible pour ${swimmerName || "nageur"} - ${entry.eventCode} : ${backendContext.formatTimeValue(timeValue)} est sous ${label} (${referenceTime}).`
          );
        }
        const entryTimeWarning = engagementEntryTimeWarning(entry, references);
        return {
          ...entry,
          ...(entryTimeWarning ? { entryTimeWarning } : {})
        };
      })
    }));
  }

  function engagementRelayReferencesForEntry(referenceMap, relay = {}, competition = {}) {
    const references = [];
    if (engagementCompetitionAppliesToFranceRecords(competition)) {
      if (relay.category === "S") references.push(backendContext.engagementRelayReferenceForEntry(referenceMap, "RF", relay));
      if (relay.category === "J") references.push(backendContext.engagementRelayReferenceForEntry(referenceMap, "RFJ", relay));
    }
    if (engagementCompetitionAppliesToMpf(competition)) {
      references.push(backendContext.engagementRelayReferenceForEntry(referenceMap, "MPF", relay));
    }
    return references.filter(Boolean);
  }

  function validateEngagementRelayEntryTimes(relays = [], competition = {}, recordsData = {}) {
    const referenceMap = backendContext.engagementRelayReferenceMap(recordsData);
    return relays.map((relay) => {
      const timeValue = Number(relay.entryTimeValue || 0) || 0;
      const references = engagementRelayReferencesForEntry(referenceMap, relay, competition);
      const blockingReference = references
        .filter((reference) => timeValue > 0 && timeValue < Number(reference.value || 0))
        .sort((a, b) => Number(a.value || 0) - Number(b.value || 0))[0];
      if (blockingReference) {
        const label = backendContext.cleanText(blockingReference.alertLabel || blockingReference.recordTypeLabel || blockingReference.alertType);
        const referenceTime = backendContext.cleanText(blockingReference.time) || backendContext.formatTimeValue(blockingReference.value);
        throw new backendContext.HttpsError(
          "failed-precondition",
          `Temps impossible pour ${relay.eventCode} ${relay.category} : ${backendContext.formatTimeValue(timeValue)} est sous ${label} (${referenceTime}).`
        );
      }
      return relay;
    });
  }

  async function resolveEngagementIndividualEntriesForSwimmer(swimmer = {}, entries = [], competition = {}) {
    if (!entries.length) return [];
    const rows = competition.qualifications?.enabled ? await getEngagementQualificationRows(swimmer, competition) : await getEngagementEntryTimeRowsForSwimmer(swimmer);
    const evaluation = competition.qualifications?.enabled ? await qualificationService().evaluate(swimmer, competition, rows) : { enabled: false };
    if (!competition.qualificationPreview && backendContext.qualificationEngine.reconcile(entries, evaluation).removed.length) {
      throw new backendContext.HttpsError("failed-precondition", "Engagement non conforme aux qualifications. Sélectionnez une course qualifiée et vérifiez les conditions des courses supplémentaires.");
    }
    const resolved = entries.map((entry) => {
      const eventCode = backendContext.cleanText(entry.eventCode).toUpperCase().replace(/\s+/g, "");
      const manualMode = backendContext.cleanText(entry.entryTimeMode) === "manual";
      const manualRaw = manualMode
        ? backendContext.cleanText(entry.manualEntryTime || entry.entryTime)
        : backendContext.cleanText(entry.manualEntryTime);
      const manualAllowed = !competition.qualifications?.enabled && competition.missingEntryTimeMode === "manual";
      if (manualAllowed && manualRaw) {
        const manual = parseEngagementEntryTime(manualRaw);
        if (!manual) {
          throw new backendContext.HttpsError("invalid-argument", `Temps manuel invalide pour ${eventCode}.`);
        }
        return cleanEngagementEntryIndividualEntries([{
          eventCode,
          entryTimeMode: "manual",
          manualEntryTime: manualRaw,
          entryTime: manual.display,
          entryTimeValue: manual.value
        }])[0];
      }
      return automaticEngagementIndividualEntry({ eventCode }, rows, competition);
    }).filter(Boolean);
    return resolved.map((entry) => ({ ...entry, ...(evaluation.enabled ? { qualification: { ...evaluation.courses[entry.eventCode], mode: evaluation.mode } } : {}) }));
  }

  function automaticEngagementIndividualEntry(entry, rows, competition) {
    const eventCode = backendContext.cleanText(entry.eventCode).toUpperCase().replace(/\s+/g, "");
    const known = bestEngagementKnownTime(rows, eventCode, competition);
    if (known) {
      return cleanEngagementEntryIndividualEntries([{
        eventCode,
        entryTimeMode: "known",
        entryTime: backendContext.formatTimeValue(known.timeValue) || known.time,
        entryTimeValue: Number(known.timeValue || 0) || 0,
        sourcePerformanceId: known.publicKey || known.performanceBaseId || known.id || "",
        date: known.date,
        location: known.location
      }])[0];
    }
    return cleanEngagementEntryIndividualEntries([{
      eventCode,
      entryTimeMode: "default595999",
      entryTime: "59:59.99",
      entryTimeValue: 359999
    }])[0];
  }

  function engagementSwimmerIdentityKey(firstName, lastName, birthDate) {
    const first = backendContext.normalizePerformanceSearchText(firstName);
    const last = backendContext.normalizePerformanceSearchText(lastName);
    const birth = backendContext.cleanIsoDate(birthDate);
    return first && last && birth ? `${last}|${first}|${birth}` : "";
  }

  function cleanEngagementNewSwimmer(raw = {}, context = {}) {
    const firstName = backendContext.cleanText(raw.firstName).slice(0, 80);
    const lastName = backendContext.cleanText(raw.lastName).slice(0, 80);
    const birthDate = backendContext.cleanIsoDate(raw.birthDate);
    const sex = ["F", "M"].includes(backendContext.cleanText(raw.sex).toUpperCase()) ? backendContext.cleanText(raw.sex).toUpperCase() : "";
    const licenseNumber = backendContext.cleanText(raw.licenseNumber).toUpperCase().slice(0, 60);
    const licenseSeason = backendContext.currentEngagementSeasonInfo();
    if (!firstName || !lastName || !birthDate || !sex || !licenseNumber) {
      throw new backendContext.HttpsError("invalid-argument", "Prenom, nom, date de naissance, sexe et licence sont obligatoires.");
    }
    if (!backendContext.ENGAGEMENT_SWIMMER_LICENSE_PATTERN.test(licenseNumber)) {
      throw new backendContext.HttpsError("invalid-argument", "Le numero de licence doit respecter le format A-12-34567.");
    }
    return {
      firstName,
      lastName,
      name: [firstName, lastName].join(" "),
      birthDate,
      sex,
      licenseNumber,
      licenseVerificationStatus: "pending",
      licenseSeasonLabel: licenseSeason.label,
      licenseSeasonStatus: "to_check",
      identityKey: engagementSwimmerIdentityKey(firstName, lastName, birthDate),
      clubId: context.clubId,
      clubName: context.clubName,
      regionId: context.regionId,
      source: "engagement",
      active: true
    };
  }

  function engagementNewSwimmerItem(doc) {
    const data = doc.data() || {};
    const firstName = backendContext.cleanText(data.firstName).slice(0, 80);
    const lastName = backendContext.cleanText(data.lastName).slice(0, 80);
    const name = backendContext.cleanText(data.name).slice(0, 160) || [firstName, lastName].filter(Boolean).join(" ");
    const alerts = Array.isArray(data.alerts) ? data.alerts : [];
    const licenseSeason = backendContext.engagementLicenseSeasonState(data);
    return backendContext.cleanFirestoreValue({
      id: doc.id,
      swimmerIndexId: doc.id,
      source: "engagement",
      swimmerId: backendContext.cleanText(data.swimmerId).slice(0, 80),
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
      performanceCount: 0,
      alertCount: alerts.length,
      alerts,
      alertValidationStatus: backendContext.cleanText(data.alertValidationStatus).slice(0, 60),
      active: data.active !== false,
      status: backendContext.cleanText(data.status || (data.active === false ? "inactive" : "active")).slice(0, 40),
      mergedIntoId: backendContext.cleanText(data.mergedIntoId).slice(0, 80),
      mergedIntoSource: backendContext.cleanText(data.mergedIntoSource).slice(0, 40),
      mergedIntoName: backendContext.cleanText(data.mergedIntoName).slice(0, 160),
      mergedAt: backendContext.cleanText(data.mergedAt).slice(0, 40),
      mergedBy: backendContext.cleanText(data.mergedBy).slice(0, 80),
      createdAt: backendContext.cleanText(data.createdAt).slice(0, 40),
      updatedAt: backendContext.cleanText(data.updatedAt).slice(0, 40),
      disabledAt: backendContext.cleanText(data.disabledAt).slice(0, 40),
      disabledBy: backendContext.cleanText(data.disabledBy).slice(0, 80)
    });
  }

  function engagementNewSwimmerAlertFromMatch(match = {}, context = {}, type = "") {
    const swimmerIndexId = backendContext.cleanText(match.id || match.swimmerIndexId);
    const clubId = backendContext.cleanText(match.clubId);
    const differentClub = clubId && clubId !== context.clubId;
    const alertType = type || (differentClub ? "club-change" : "duplicate");
    const firstName = backendContext.cleanText(match.firstName).slice(0, 80);
    const lastName = backendContext.cleanText(match.lastName).slice(0, 80);
    return backendContext.cleanFirestoreValue({
      type: alertType,
      level: alertType === "inverted-identity" ? "error" : differentClub ? "warning" : "info",
      message: alertType === "inverted-identity"
        ? "Creation impossible : un nageur existe avec le nom et le prenom inverses."
        : alertType === "possible-duplicate"
        ? "Nageur ressemblant deja present dans LivePalmes."
        : differentClub
          ? "Nageur existant avec un dernier club connu different."
          : "Nageur existant avec la meme identite.",
      swimmerIndexId,
      swimmerId: backendContext.cleanText(match.swimmerId || match.id).slice(0, 80),
      source: backendContext.cleanText(match.source || "performances").slice(0, 40),
      identityKey: backendContext.cleanText(match.identityKey).slice(0, 180),
      name: [lastName, firstName].filter(Boolean).join(" ") || backendContext.cleanText(match.name).slice(0, 160),
      firstName,
      lastName,
      birthDate: backendContext.cleanIsoDate(match.birthDate),
      clubId,
      clubName: backendContext.cleanText(match.clubName).slice(0, 140),
      latestDate: backendContext.cleanIsoDate(match.latestDate),
      validationStatus: "validated-by-club"
    });
  }

  async function buildEngagementNewSwimmerAlerts(swimmer = {}, context = {}) {
    const alerts = [];
    const addAlert = (alert) => {
      if (!alert?.swimmerIndexId && !alert?.identityKey) return;
      const key = [alert.type, alert.identityKey || alert.swimmerIndexId, alert.clubId].join("|");
      if (alerts.some((item) => [item.type, item.identityKey || item.swimmerIndexId, item.clubId].join("|") === key)) return;
      alerts.push(alert);
    };
    const invertedIdentityKey = engagementSwimmerIdentityKey(swimmer.lastName, swimmer.firstName, swimmer.birthDate);
    const identityKeys = Array.from(new Set([swimmer.identityKey, invertedIdentityKey].filter(Boolean)));
    const alertTypeForMatch = (match = {}) => invertedIdentityKey && invertedIdentityKey !== swimmer.identityKey && backendContext.cleanText(match.identityKey) === invertedIdentityKey
      ? "inverted-identity"
      : "";
    if (identityKeys.length) {
      const exactSnapshot = await backendContext.db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION)
        .where("identityKey", "in", identityKeys)
        .limit(10)
        .get();
      exactSnapshot.docs.forEach((doc) => {
        const match = backendContext.engagementClubSwimmerItem(doc);
        addAlert(engagementNewSwimmerAlertFromMatch(match, context, alertTypeForMatch(match)));
      });
      const engagementSnapshot = await backendContext.db.collection("engagementClubSwimmers")
        .where("identityKey", "in", identityKeys)
        .limit(10)
        .get();
      engagementSnapshot.docs.forEach((doc) => {
        const match = engagementNewSwimmerItem(doc);
        addAlert(engagementNewSwimmerAlertFromMatch(match, context, alertTypeForMatch(match)));
      });
      backendContext.intranapSwimmersIndex
        .filter((match) => identityKeys.includes(backendContext.cleanText(match.identityKey)))
        .slice(0, 10)
        .forEach((match) => addAlert(engagementNewSwimmerAlertFromMatch({
          ...match,
          source: "reference"
        }, context, alertTypeForMatch(match))));
    }
    const lastToken = backendContext.performanceSearchTokens(swimmer.lastName)[0] || "";
    if (lastToken.length >= 2) {
      const similarSnapshot = await backendContext.db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION)
        .where("searchPrefixes", "array-contains", lastToken.slice(0, Math.min(6, lastToken.length)))
        .limit(20)
        .get();
      similarSnapshot.docs.forEach((doc) => {
        const match = backendContext.engagementClubSwimmerItem(doc);
        if (alerts.some((alert) => alert.swimmerIndexId === match.id)) return;
        const sameBirthYear = backendContext.cleanText(match.birthDate).slice(0, 4) === backendContext.cleanText(swimmer.birthDate).slice(0, 4);
        const firstClose = backendContext.performanceSearchTokens(match.firstName).some((token) =>
          backendContext.performanceSearchTokens(swimmer.firstName).some((inputToken) => token.slice(0, 3) === inputToken.slice(0, 3))
        );
        if (!sameBirthYear || !firstClose) return;
        addAlert(engagementNewSwimmerAlertFromMatch(match, context, "possible-duplicate"));
      });
      backendContext.intranapSwimmersIndex
        .filter((match) => {
          if (identityKeys.includes(backendContext.cleanText(match.identityKey))) return false;
          const sameBirthYear = backendContext.cleanText(match.birthDate).slice(0, 4) === backendContext.cleanText(swimmer.birthDate).slice(0, 4);
          const lastClose = backendContext.performanceSearchTokens(match.lastName).some((token) => token.slice(0, Math.min(6, lastToken.length)) === lastToken.slice(0, Math.min(6, lastToken.length)));
          const firstClose = backendContext.performanceSearchTokens(match.firstName).some((token) =>
            backendContext.performanceSearchTokens(swimmer.firstName).some((inputToken) => token.slice(0, 3) === inputToken.slice(0, 3))
          );
          return sameBirthYear && lastClose && firstClose;
        })
        .slice(0, 12)
        .forEach((match) => addAlert(engagementNewSwimmerAlertFromMatch({
          ...match,
          source: "reference"
        }, context, "possible-duplicate")));
    }
    return alerts
      .sort((left, right) =>
        Number(right.type === "inverted-identity") - Number(left.type === "inverted-identity") ||
        Number(right.type === "club-change") - Number(left.type === "club-change") ||
        backendContext.cleanText(right.latestDate).localeCompare(backendContext.cleanText(left.latestDate)) ||
        backendContext.cleanText(left.name).localeCompare(backendContext.cleanText(right.name), "fr")
      )
      .slice(0, 8);
  }

  function engagementSwimmerLicenseId(swimmer = {}) {
    const swimmerIndexId = backendContext.cleanText(swimmer.swimmerIndexId || swimmer.id);
    if (swimmerIndexId) return backendContext.stableHash(swimmerIndexId).slice(0, 40);
    return backendContext.stableHash([
      backendContext.cleanText(swimmer.swimmerId),
      backendContext.cleanText(swimmer.identityKey),
      backendContext.cleanText(swimmer.name)
    ].filter(Boolean).join("|")).slice(0, 40);
  }

  function engagementSwimmerLicenseNumberKey(licenseNumber = "") {
    return backendContext.cleanText(licenseNumber).toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  function engagementSwimmerLicenseNumberId(licenseNumber = "") {
    const key = engagementSwimmerLicenseNumberKey(licenseNumber);
    return key ? backendContext.stableHash(key).slice(0, 40) : "";
  }

  function engagementClubRosterId(clubId) {
    return backendContext.stableHash(backendContext.cleanText(clubId)).slice(0, 40);
  }

  function engagementClubRosterRef(db, clubId) {
    return db.collection(backendContext.ENGAGEMENT_CLUB_ROSTERS_COLLECTION).doc(engagementClubRosterId(clubId));
  }

  function cleanEngagementClubActivityStatus(value = "", fallback = "active") {
    const status = backendContext.cleanText(value).toLowerCase();
    return ["active", "inactive"].includes(status) ? status : fallback;
  }

  function engagementClubRosterSwimmerKey(swimmer = {}) {
    return backendContext.stableHash([
      backendContext.cleanText(swimmer.source || "performances"),
      backendContext.cleanText(swimmer.swimmerIndexId || swimmer.id || swimmer.swimmerId || swimmer.identityKey)
    ].filter(Boolean).join("|")).slice(0, 40);
  }

  function engagementClubRosterSwimmerItem(swimmer = {}) {
    const firstName = backendContext.cleanText(swimmer.firstName).slice(0, 80);
    const lastName = backendContext.cleanText(swimmer.lastName).slice(0, 80);
    const name = backendContext.cleanText(swimmer.name).slice(0, 160) || [firstName, lastName].filter(Boolean).join(" ");
    const source = backendContext.cleanText(swimmer.source || "performances").slice(0, 40) || "performances";
    const swimmerIndexId = backendContext.cleanText(swimmer.swimmerIndexId || swimmer.id).slice(0, 80);
    const licenseSeason = backendContext.engagementLicenseSeasonState(swimmer);
    const licenseSeasons = Object.fromEntries(Object.entries(swimmer.licenseSeasons && typeof swimmer.licenseSeasons === "object" ? swimmer.licenseSeasons : {})
      .filter(([label]) => /^\d{4}-\d{4}$/.test(label))
      .slice(-10)
      .map(([label, record]) => [label, {
        status: backendContext.cleanEngagementLicenseSeasonStatus(record?.status, "to_check"),
        updatedAt: backendContext.cleanText(record?.updatedAt).slice(0, 40),
        validatedAt: backendContext.cleanText(record?.validatedAt).slice(0, 40),
        updatedBy: backendContext.cleanText(record?.updatedBy).slice(0, 128),
        source: backendContext.cleanText(record?.source).slice(0, 40),
        federalValidityEndDate: backendContext.cleanIsoDate(record?.federalValidityEndDate)
      }]));
    return backendContext.cleanFirestoreValue({
      id: swimmerIndexId,
      swimmerIndexId,
      source,
      swimmerId: backendContext.cleanText(swimmer.swimmerId || (source === "performances" ? swimmer.id : "")).slice(0, 80),
      identityKey: backendContext.cleanText(swimmer.identityKey || swimmer.indexKey).slice(0, 180),
      firstName,
      lastName,
      name,
      birthDate: backendContext.cleanIsoDate(swimmer.birthDate),
      sex: backendContext.cleanText(swimmer.sex).slice(0, 20),
      category: backendContext.cleanText(swimmer.category).slice(0, 20),
      clubId: backendContext.cleanText(swimmer.clubId).slice(0, 40),
      club: backendContext.cleanText(swimmer.club).slice(0, 60),
      clubName: backendContext.cleanText(swimmer.clubName).slice(0, 140),
      licenseNumber: backendContext.cleanText(swimmer.licenseNumber).slice(0, 60),
      licenseVerificationStatus: backendContext.cleanEngagementLicenseVerificationStatus(swimmer.licenseVerificationStatus || swimmer.verificationStatus, "pending"),
      licenseSeasonLabel: licenseSeason.label,
      licenseSeasonStatus: licenseSeason.status,
      licenseSeasons,
      latestDate: backendContext.cleanIsoDate(swimmer.latestDate),
      performanceCount: Math.max(0, Math.trunc(Number(swimmer.performanceCount) || 0)),
      active: swimmer.active !== false,
      clubActivityStatus: cleanEngagementClubActivityStatus(swimmer.clubActivityStatus, ""),
      clubActivityStatusSource: backendContext.cleanText(swimmer.clubActivityStatusSource).slice(0, 40),
      clubActivityStatusUpdatedAt: backendContext.cleanText(swimmer.clubActivityStatusUpdatedAt).slice(0, 40),
      clubActivityStatusUpdatedBy: backendContext.cleanText(swimmer.clubActivityStatusUpdatedBy).slice(0, 80),
      updatedAt: backendContext.cleanText(swimmer.updatedAt).slice(0, 40),
      changeRequestStatus: backendContext.cleanText(swimmer.changeRequestStatus).slice(0, 40),
      changeRequestId: backendContext.cleanText(swimmer.changeRequestId).slice(0, 80),
      changeRequestedAt: backendContext.cleanText(swimmer.changeRequestedAt).slice(0, 40)
    });
  }

  function engagementClubRosterSwimmersFromData(data = {}) {
    const swimmers = data.swimmers && typeof data.swimmers === "object" ? data.swimmers : {};
    return Object.values(swimmers)
      .map((swimmer) => engagementClubRosterSwimmerItem(swimmer))
      .filter((swimmer) => swimmer.swimmerIndexId && swimmer.active !== false);
  }

  function upsertEngagementClubRosterSwimmer(batch, db, swimmer = {}, now = "") {
    const item = engagementClubRosterSwimmerItem(swimmer);
    if (!item.clubId || !item.swimmerIndexId || item.active === false) return;
    const key = engagementClubRosterSwimmerKey(item);
    batch.set(engagementClubRosterRef(db, item.clubId), {
      clubId: item.clubId,
      clubName: item.clubName,
      generatedAt: now || new Date().toISOString(),
      updatedAt: now || new Date().toISOString(),
      swimmers: {
        [key]: item
      }
    }, { merge: true });
  }

  function deleteEngagementClubRosterSwimmer(batch, db, swimmer = {}, now = "") {
    const clubId = backendContext.cleanText(swimmer.clubId);
    const swimmerIndexId = backendContext.cleanText(swimmer.swimmerIndexId || swimmer.id);
    if (!clubId || !swimmerIndexId) return;
    const key = engagementClubRosterSwimmerKey({ ...swimmer, swimmerIndexId });
    batch.set(engagementClubRosterRef(db, clubId), {
      generatedAt: now || new Date().toISOString(),
      updatedAt: now || new Date().toISOString(),
      swimmers: {
        [key]: backendContext.FieldValue.delete()
      }
    }, { merge: true });
  }

  function engagementSwimmerLicenseDataItem(data = {}, id = "") {
    const licenseSeason = backendContext.engagementLicenseSeasonState(data);
    return {
      id,
      swimmerIndexId: backendContext.cleanText(data.swimmerIndexId).slice(0, 80),
      swimmerId: backendContext.cleanText(data.swimmerId).slice(0, 80),
      identityKey: backendContext.cleanText(data.identityKey).slice(0, 180),
      licenseNumber: backendContext.cleanText(data.licenseNumber).slice(0, 60),
      verificationStatus: backendContext.cleanEngagementLicenseVerificationStatus(data.verificationStatus, "pending"),
      licenseSeasonLabel: licenseSeason.label,
      licenseSeasonStatus: licenseSeason.status,
      licenseSeasons: data.licenseSeasons && typeof data.licenseSeasons === "object" ? data.licenseSeasons : {},
      updatedAt: backendContext.cleanText(data.updatedAt).slice(0, 40)
    };
  }

  function engagementSwimmerLicenseItem(doc) {
    return engagementSwimmerLicenseDataItem(doc.data() || {}, doc.id);
  }

  async function engagementLegacySwimmerLicensesByClub(db, clubId) {
    const cleanClubId = backendContext.cleanText(clubId);
    if (!cleanClubId) return new Map();
    const snapshot = await db.collection("engagementSwimmerLicenses")
      .where("clubId", "==", cleanClubId)
      .limit(201)
      .get();
    if (snapshot.size > 200) {
      throw new backendContext.HttpsError("failed-precondition", "Trop de licences historiques pour une reconstruction directe de ce club.");
    }
    const byIndexId = new Map();
    snapshot.docs.forEach((doc) => {
      const license = engagementSwimmerLicenseItem(doc);
      if (license.swimmerIndexId && license.licenseNumber) byIndexId.set(license.swimmerIndexId, license);
    });
    return byIndexId;
  }

  function engagementSwimmerLicensePayload(swimmer = {}, context = {}, source = {}) {
    const collectedAt = backendContext.cleanText(source.collectedAt).slice(0, 40) || new Date().toISOString();
    const season = backendContext.currentEngagementSeasonInfo(new Date(collectedAt));
    const verificationStatus = backendContext.cleanEngagementLicenseVerificationStatus(swimmer.licenseVerificationStatus || swimmer.verificationStatus, "pending");
    const seasonStatus = backendContext.cleanEngagementLicenseSeasonStatus(swimmer.licenseSeasonStatus, "to_check");
    const sourceType = backendContext.cleanText(source.type || "engagement").slice(0, 40) || "engagement";
    return backendContext.cleanFirestoreValue({
      swimmerIndexId: backendContext.cleanText(swimmer.swimmerIndexId || swimmer.id).slice(0, 80),
      swimmerId: backendContext.cleanText(swimmer.swimmerId).slice(0, 80),
      identityKey: backendContext.cleanText(swimmer.identityKey).slice(0, 180),
      firstName: backendContext.cleanText(swimmer.firstName).slice(0, 80),
      lastName: backendContext.cleanText(swimmer.lastName).slice(0, 80),
      name: backendContext.cleanText(swimmer.name).slice(0, 160),
      birthDate: backendContext.cleanIsoDate(swimmer.birthDate),
      sex: backendContext.cleanText(swimmer.sex).slice(0, 20),
      clubId: backendContext.cleanText(context.clubId || swimmer.clubId).slice(0, 40),
      clubName: backendContext.cleanText(context.clubName || swimmer.clubName).slice(0, 140),
      licenseNumber: backendContext.cleanText(swimmer.licenseNumber).slice(0, 60),
      verificationStatus,
      verificationSource: backendContext.cleanText(source.verificationSource || (sourceType === "admin_import" ? "admin_import" : "club")).slice(0, 40),
      licenseSeasonLabel: season.label,
      licenseSeasonStatus: seasonStatus,
      licenseSeasons: {
        [season.label]: {
          status: seasonStatus,
          updatedAt: collectedAt,
          updatedBy: backendContext.cleanText(context.uid).slice(0, 128),
          source: sourceType
        }
      },
      source: {
        type: sourceType,
        competitionId: backendContext.cleanText(source.competitionId).slice(0, 128),
        clubId: backendContext.cleanText(context.clubId).slice(0, 40),
        uid: backendContext.cleanText(context.uid).slice(0, 128),
        collectedAt
      }
    });
  }

  function engagementSwimmerLicenseConflictData(data = {}, id = "", source = "") {
    return backendContext.cleanFirestoreValue({
      id,
      source: backendContext.cleanText(source).slice(0, 40),
      swimmerIndexId: backendContext.cleanText(data.swimmerIndexId || data.id).slice(0, 80),
      swimmerId: backendContext.cleanText(data.swimmerId).slice(0, 80),
      firstName: backendContext.cleanText(data.firstName).slice(0, 80),
      lastName: backendContext.cleanText(data.lastName).slice(0, 80),
      name: backendContext.cleanText(data.name).slice(0, 160),
      birthDate: backendContext.cleanIsoDate(data.birthDate),
      sex: backendContext.cleanText(data.sex).slice(0, 20),
      clubId: backendContext.cleanText(data.clubId).slice(0, 40),
      clubName: backendContext.cleanText(data.clubName).slice(0, 140),
      licenseNumber: backendContext.cleanText(data.licenseNumber).slice(0, 60)
    });
  }

  async function findEngagementSwimmerLicenseConflict(db, swimmer = {}, ignoredSwimmerIds = []) {
    const licenseNumber = backendContext.cleanText(swimmer.licenseNumber).slice(0, 60);
    const licenseKey = engagementSwimmerLicenseNumberKey(licenseNumber);
    if (!licenseKey) return null;
    const ignored = new Set((Array.isArray(ignoredSwimmerIds) ? ignoredSwimmerIds : [])
      .map((id) => backendContext.cleanText(id).slice(0, 80))
      .filter(Boolean));
    const licenseNumberRefId = engagementSwimmerLicenseNumberId(licenseNumber);
    if (licenseNumberRefId) {
      const indexed = await db.collection(backendContext.ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION).doc(licenseNumberRefId).get();
      if (indexed.exists) {
        const data = indexed.data() || {};
        const indexedSwimmerId = backendContext.cleanText(data.swimmerIndexId || data.swimmerId).slice(0, 80);
        if (!indexedSwimmerId || !ignored.has(indexedSwimmerId)) {
          return engagementSwimmerLicenseConflictData(data, indexed.id, "license-index");
        }
      }
    }
    const collectedLicenseSnapshot = await db.collection("engagementSwimmerLicenses")
      .where("licenseNumber", "==", licenseNumber)
      .limit(2)
      .get();
    for (const doc of collectedLicenseSnapshot.docs) {
      const data = doc.data() || {};
      const indexedSwimmerId = backendContext.cleanText(data.swimmerIndexId || data.swimmerId).slice(0, 80);
      if (!indexedSwimmerId || !ignored.has(indexedSwimmerId)) {
        return engagementSwimmerLicenseConflictData(data, doc.id, "license-collection");
      }
    }
    const engagementSnapshot = await db.collection("engagementClubSwimmers")
      .where("licenseNumber", "==", licenseNumber)
      .limit(2)
      .get();
    for (const doc of engagementSnapshot.docs) {
      if (!ignored.has(doc.id)) {
        return engagementSwimmerLicenseConflictData({ ...(doc.data() || {}), swimmerIndexId: doc.id }, doc.id, "engagement");
      }
    }
    const performanceSnapshot = await db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION)
      .where("licenseNumber", "==", licenseNumber)
      .limit(2)
      .get();
    for (const doc of performanceSnapshot.docs) {
      if (!ignored.has(doc.id)) {
        return engagementSwimmerLicenseConflictData({ ...(doc.data() || {}), swimmerIndexId: doc.id }, doc.id, "performances");
      }
    }
    const referenceMatch = backendContext.intranapSwimmersIndex.find((match) => engagementSwimmerLicenseNumberKey(match.licenseNumber) === licenseKey);
    if (referenceMatch && !ignored.has(backendContext.cleanText(referenceMatch.id || referenceMatch.swimmerIndexId).slice(0, 80))) {
      return engagementSwimmerLicenseConflictData(referenceMatch, backendContext.cleanText(referenceMatch.id || referenceMatch.swimmerIndexId), "reference");
    }
    return null;
  }

  async function assertNoEngagementSwimmerLicenseConflict(db, swimmer = {}, ignoredSwimmerIds = []) {
    const conflict = await findEngagementSwimmerLicenseConflict(db, swimmer, ignoredSwimmerIds);
    if (!conflict) return null;
    const name = [conflict.firstName, conflict.lastName].filter(Boolean).join(" ") || conflict.name || "un nageur existant";
    const club = backendContext.engagementClubCode(conflict.clubId) || backendContext.engagementClubName(conflict.clubId, conflict.clubName) || "club non renseigne";
    throw new backendContext.HttpsError("already-exists", `Licence deja utilisee par ${name} (${club}). Utilisez la fiche existante au lieu de creer un doublon.`, {
      conflict
    });
  }

  async function engagementSwimmerRecoveryPreview(db, licenseNumber, context = {}) {
    const cleanLicense = backendContext.cleanText(licenseNumber).toUpperCase().slice(0, 60);
    if (!backendContext.ENGAGEMENT_SWIMMER_LICENSE_PATTERN.test(cleanLicense)) {
      throw new backendContext.HttpsError("invalid-argument", "Le numero de licence doit respecter le format A-12-34567.");
    }
    const conflict = await findEngagementSwimmerLicenseConflict(db, { licenseNumber: cleanLicense });
    if (!conflict) return { found: false, licenseNumber: cleanLicense };

    const [performanceSnapshot, licenseSnapshot] = await Promise.all([
      db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION).where("licenseNumber", "==", cleanLicense).limit(2).get(),
      db.collection("engagementSwimmerLicenses").where("licenseNumber", "==", cleanLicense).limit(2).get()
    ]);
    const conflictSwimmerId = backendContext.cleanText(conflict.swimmerIndexId || conflict.swimmerId).slice(0, 80);
    let engagementDoc = null;
    if (conflictSwimmerId) {
      const snapshot = await db.collection("engagementClubSwimmers").doc(conflictSwimmerId).get();
      if (snapshot.exists && engagementSwimmerLicenseNumberKey(snapshot.data()?.licenseNumber) === engagementSwimmerLicenseNumberKey(cleanLicense)) {
        engagementDoc = snapshot;
      }
    }
    const performanceDoc = performanceSnapshot.docs[0] || null;
    const stored = engagementDoc ? engagementNewSwimmerItem(engagementDoc) : null;
    const performance = performanceDoc
      ? engagementClubRosterSwimmerItem({ ...(performanceDoc.data() || {}), id: performanceDoc.id, swimmerIndexId: performanceDoc.id, source: "performances" })
      : null;
    const swimmer = stored || performance || engagementClubRosterSwimmerItem({ ...conflict, source: conflict.source || "reference" });
    const season = backendContext.currentEngagementSeasonInfo();
    const bounds = backendContext.engagementSeasonBoundsFromEndYear(season.endYear);
    const publishedResult = performanceSnapshot.docs.some((doc) => {
      const date = backendContext.cleanIsoDate(doc.data()?.latestDate);
      return date >= bounds.startDate && date <= bounds.endDate;
    });
    return {
      found: true,
      sameClub: backendContext.cleanText(swimmer.clubId) === backendContext.cleanText(context.clubId),
      eligible: backendContext.cleanText(swimmer.clubId) !== backendContext.cleanText(context.clubId) && !publishedResult,
      publishedResult,
      swimmer,
      source: stored ? "engagement" : performance ? "performances" : "reference",
      engagementSwimmerId: stored?.swimmerIndexId || "",
      licenseRecordIds: licenseSnapshot.docs.map((doc) => doc.id),
      season: {
        label: season.label,
        startDate: bounds.startDate,
        endDate: bounds.endDate
      }
    };
  }

  function engagementClubEntryItem(doc, fallback = {}) {
    const data = doc?.exists ? doc.data() || {} : fallback;
    const teamLeader = data.teamLeader || {};
    const officials = Array.isArray(data.officials) ? data.officials : [];
    const swimmers = Array.isArray(data.swimmers) ? data.swimmers : [];
    const relays = Array.isArray(data.relays) ? data.relays : [];
    const documents = data.documents && typeof data.documents === "object" ? data.documents : {};
    const clubRecapPdf = backendContext.cleanEngagementDocumentMetadata(documents.clubRecapPdf || {});
    return {
      id: doc?.id || backendContext.engagementClubEntryId(data.competitionId, data.clubId),
      competitionId: backendContext.cleanText(data.competitionId).slice(0, 128),
      clubId: backendContext.cleanText(data.clubId).slice(0, 40),
      clubCode: backendContext.engagementClubCode(data.clubId, data.clubCode).slice(0, 40),
      clubName: backendContext.engagementClubName(data.clubId, data.clubName).slice(0, 140),
      regionId: backendContext.cleanText(data.regionId).slice(0, 80),
      status: backendContext.cleanText(data.status || "active"),
      qualificationAlert: data.qualificationAlert || null,
      teamLeader: {
        mode: backendContext.cleanText(teamLeader.mode),
        personId: backendContext.cleanText(teamLeader.personId).slice(0, 80),
        firstName: backendContext.cleanText(teamLeader.firstName),
        lastName: backendContext.cleanText(teamLeader.lastName),
        birthDate: backendContext.cleanIsoDate(teamLeader.birthDate),
        sex: ["F", "M"].includes(backendContext.cleanText(teamLeader.sex).toUpperCase()) ? backendContext.cleanText(teamLeader.sex).toUpperCase() : "",
        licenseNumber: backendContext.cleanText(teamLeader.licenseNumber),
        externalClub: teamLeader.externalClub === true,
        clubId: backendContext.cleanText(teamLeader.clubId),
        clubName: backendContext.cleanText(teamLeader.clubName),
        renunciationAccepted: teamLeader.renunciationAccepted === true
      },
      officials: officials.map(cleanEngagementEntryOfficial).filter((official) => official.personId || official.licenseNumber),
      swimmers: swimmers.map(cleanEngagementEntrySwimmer).filter((swimmer) => swimmer.swimmerIndexId || swimmer.swimmerId || swimmer.licenseNumber),
      relays: relays.map((relay) => ({
        relayId: backendContext.cleanText(relay.relayId).slice(0, 80),
        eventCode: backendContext.normalizeCourseCode(relay.eventCode),
        category: backendContext.cleanText(relay.category).toUpperCase().slice(0, 20),
        genderMode: backendContext.ENGAGEMENT_PROGRAM_GENDER_MODES.has(backendContext.cleanText(relay.genderMode)) ? backendContext.cleanText(relay.genderMode) : "female",
        manualEntryTime: backendContext.cleanText(relay.manualEntryTime).slice(0, 20),
        entryTime: backendContext.cleanText(relay.entryTime).slice(0, 20),
        entryTimeValue: Number(relay.entryTimeValue || 0) || 0,
        memberIds: (Array.isArray(relay.memberIds) ? relay.memberIds : [])
          .map((memberId) => backendContext.cleanText(memberId).slice(0, 80))
          .filter(Boolean),
        members: (Array.isArray(relay.members) ? relay.members : []).map((member) => ({
          swimmerIndexId: backendContext.cleanText(member.swimmerIndexId).slice(0, 80),
          swimmerId: backendContext.cleanText(member.swimmerId).slice(0, 80),
          firstName: backendContext.cleanText(member.firstName).slice(0, 80),
          lastName: backendContext.cleanText(member.lastName).slice(0, 80),
          name: backendContext.cleanText(member.name).slice(0, 160),
          birthDate: backendContext.cleanIsoDate(member.birthDate),
          sex: backendContext.normalizeCategoryCode(member.sex),
          licenseNumber: backendContext.cleanText(member.licenseNumber).slice(0, 60)
        })).filter((member) => member.swimmerIndexId)
      })).filter((relay) => relay.eventCode && relay.category),
      documents: clubRecapPdf ? { clubRecapPdf } : {},
      teamLeaderComplete: engagementTeamLeaderComplete(teamLeader),
      updatedAt: backendContext.cleanText(data.updatedAt).slice(0, 40)
    };
  }

  function engagementClubEntryHasParticipants(entry = {}) {
    const swimmerCount = Array.isArray(entry.swimmers) ? entry.swimmers.length : Math.max(0, Math.trunc(Number(entry.swimmerCount) || 0));
    const officialCount = Array.isArray(entry.officials) ? entry.officials.length : Math.max(0, Math.trunc(Number(entry.officialCount) || 0));
    const relayCount = Array.isArray(entry.relays) ? entry.relays.length : Math.max(0, Math.trunc(Number(entry.relayCount) || 0));
    return swimmerCount > 0 || officialCount > 0 || relayCount > 0;
  }

  return {
    cleanEngagementTeamLeader,
    engagementTeamLeaderComplete,
    cleanEngagementEntryOfficial,
    parseEngagementEntryTime,
    cleanEngagementEntryIndividualEntries,
    cleanEngagementEntrySwimmer,
    engagementRelayAllowedCategories,
    cleanEngagementRelayGenderMode,
    engagementRelayMemberCategory,
    engagementRelayMemberAge,
    engagementRelayMemberAllowedForCategory,
    assertEngagementRelayMembers,
    cleanEngagementEntryRelays,
    qualificationRelaysAfterIndividualChange,
    qualificationEvents,
    qualificationService,
    nativeQualificationServices,
    nativeQualificationError,
    engagementQualificationRowAllowed,
    bestEngagementKnownTime,
    engagementKnownTimeHistory,
    engagementEntryTimeCacheId,
    engagementEntryTimeCacheRef,
    engagementEntryTimeCacheRow,
    engagementEntryTimeCacheRowsFromData,
    engagementEntryTimeRowsToEvents,
    engagementEntryTimeSourceKeys,
    readEngagementEntryTimeSourceRows,
    rebuildEngagementEntryTimeCache,
    getEngagementEntryTimeRowsForSwimmer,
    getEngagementQualificationRows,
    deleteEngagementEntryTimeCache,
    invalidateEngagementEntryTimeCachesForPerformanceRows,
    engagementCompetitionAppliesToFranceRecords,
    engagementCompetitionAppliesToMpf,
    engagementRecordReferencesForEntry,
    engagementEntryTimeWarning,
    validateEngagementIndividualEntryTimes,
    engagementRelayReferencesForEntry,
    validateEngagementRelayEntryTimes,
    resolveEngagementIndividualEntriesForSwimmer,
    automaticEngagementIndividualEntry,
    engagementSwimmerIdentityKey,
    cleanEngagementNewSwimmer,
    engagementNewSwimmerItem,
    engagementNewSwimmerAlertFromMatch,
    buildEngagementNewSwimmerAlerts,
    engagementSwimmerLicenseId,
    engagementSwimmerLicenseNumberKey,
    engagementSwimmerLicenseNumberId,
    engagementClubRosterId,
    engagementClubRosterRef,
    cleanEngagementClubActivityStatus,
    engagementClubRosterSwimmerKey,
    engagementClubRosterSwimmerItem,
    engagementClubRosterSwimmersFromData,
    upsertEngagementClubRosterSwimmer,
    deleteEngagementClubRosterSwimmer,
    engagementSwimmerLicenseDataItem,
    engagementSwimmerLicenseItem,
    engagementLegacySwimmerLicensesByClub,
    engagementSwimmerLicensePayload,
    engagementSwimmerLicenseConflictData,
    findEngagementSwimmerLicenseConflict,
    assertNoEngagementSwimmerLicenseConflict,
    engagementSwimmerRecoveryPreview,
    engagementClubEntryItem,
    engagementClubEntryHasParticipants
  };
}

module.exports = { createEntryModelService };
