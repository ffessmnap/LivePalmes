// Preserve the execution mode of the existing index.js function bodies.

// Private existing helpers; live services/state are supplied by index.js.
// Module creation performs no external operation.
function createCompetitionModelService(backendContext) {
  function cleanIsoDate(value) {
    const text = backendContext.cleanText(value).slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
  }

  function cleanEngagementCompetitionLevel(value) {
    const level = backendContext.cleanText(value);
    return backendContext.ENGAGEMENT_COMPETITION_LEVELS.has(level) ? level : "regional";
  }

  function isNationalOnlyEngagementCompetitionLevel(value) {
    return ["national", "international"].includes(cleanEngagementCompetitionLevel(value));
  }

  function cleanEngagementEntryStatus(value) {
    const status = backendContext.cleanText(value);
    return backendContext.ENGAGEMENT_ENTRY_STATUSES.has(status) ? status : "upcoming";
  }

  function cleanEngagementCompetitionType(value) {
    const type = backendContext.cleanText(value);
    return backendContext.ENGAGEMENT_COMPETITION_TYPES.has(type) ? type : "pool";
  }

  function cleanEngagementWaterBodyType(value) {
    const type = backendContext.cleanText(value);
    return backendContext.ENGAGEMENT_WATER_BODY_TYPES.has(type) ? type : "";
  }

  function cleanEngagementOpenWaterCourse(raw = {}, options = {}) {
    const strict = options.strict !== false;
    const distance = Math.trunc(Number(raw.distance));
    const discipline = backendContext.cleanText(raw.discipline).toUpperCase();
    if (!Number.isInteger(distance) || distance < 1 || distance > 100000) {
      if (strict) throw new backendContext.HttpsError("invalid-argument", "La distance eau libre doit etre comprise entre 1 et 100000 metres.");
      return null;
    }
    if (!backendContext.ENGAGEMENT_OPEN_WATER_COURSE_DISCIPLINES.has(discipline)) {
      if (strict) throw new backendContext.HttpsError("invalid-argument", "Choisissez la specialite : Surface, Bi-palmes ou Support.");
      return null;
    }
    if (distance === 150 && discipline === "SUP") {
      if (strict) throw new backendContext.HttpsError("invalid-argument", "Le 150 m elimination est disponible uniquement en Surface et Bi-palmes.");
      return null;
    }
    const format = distance === 150 ? "elimination" : "standard";
    const distanceLabel = format === "elimination" ? "150 m élimination" : `${distance} m`;
    const disciplineLabel = { SF: "Surface", BI: "Bi-palmes", SUP: "Support" }[discipline];
    const id = `${format === "elimination" ? "150-elimination" : distance}-${discipline}`;
    return {
      id,
      distance,
      discipline,
      label: `${distanceLabel} ${disciplineLabel}`,
      format,
      active: raw.active !== false
    };
  }

  function cleanEngagementOpenWaterCourses(rawCourses = []) {
    const byId = new Map();
    backendContext.ENGAGEMENT_OPEN_WATER_DEFAULT_COURSES.forEach((course) => byId.set(course.id, { ...course }));
    (Array.isArray(rawCourses) ? rawCourses : []).slice(0, backendContext.ENGAGEMENT_OPEN_WATER_COURSE_LIMIT).forEach((rawCourse) => {
      const course = cleanEngagementOpenWaterCourse(rawCourse, { strict: false });
      if (course) byId.set(course.id, course);
    });
    return Array.from(byId.values()).sort((left, right) => left.distance - right.distance || left.label.localeCompare(right.label, "fr"));
  }

  function engagementOpenWaterCourseConfigRef(database = backendContext.db) {
    return database.collection(backendContext.ENGAGEMENT_CONFIGURATION_COLLECTION).doc(backendContext.ENGAGEMENT_OPEN_WATER_COURSE_CONFIG_ID);
  }

  function engagementOpenWaterEventDefinition(rawEvent = {}) {
    const code = backendContext.cleanText(rawEvent.code).toUpperCase().replace(/\s+/g, "");
    const match = code.match(/^OW(\d{1,6})(ELIM)?(SF|BI|SUP)$/);
    if (!match) return null;
    const distance = Number(match[1]);
    const format = match[2] ? "elimination" : "standard";
    const discipline = match[3];
    if ((distance === 150) !== (format === "elimination")) return null;
    const cleanedCourse = cleanEngagementOpenWaterCourse({ distance, discipline }, { strict: false });
    if (!cleanedCourse) return null;
    return {
      code,
      type: "individual",
      label: cleanedCourse.label,
      shortLabel: cleanedCourse.label,
      discipline,
      distance,
      openWaterCourseId: cleanedCourse.id,
      openWaterFormat: format
    };
  }

  function cleanOptionalEmail(value, label = "Email") {
    const email = backendContext.normalizeEmail(value).slice(0, 180);
    if (!email) return "";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new backendContext.HttpsError("invalid-argument", `${label} invalide.`);
    }
    return email;
  }

  function cleanEngagementPoolLength(value) {
    const poolLength = backendContext.cleanText(value);
    return backendContext.ENGAGEMENT_POOL_LENGTHS.has(poolLength) ? poolLength : "";
  }

  function cleanEngagementPoolLaneCount(value) {
    if (value === "" || value === null || value === undefined || value === 0 || value === "0") return 0;
    const laneCount = Number(value);
    if (!Number.isInteger(laneCount) || laneCount < 4 || laneCount > 10) {
      throw new backendContext.HttpsError("invalid-argument", "Le nombre de lignes d'eau doit etre compris entre 4 et 10.");
    }
    return laneCount;
  }

  function cleanEngagementTimingType(value) {
    const timingType = backendContext.cleanText(value);
    return backendContext.ENGAGEMENT_TIMING_TYPES.has(timingType) ? timingType : "";
  }

  function cleanEngagementQualificationTimesMode(value) {
    const mode = backendContext.cleanText(value);
    return backendContext.ENGAGEMENT_QUALIFICATION_TIME_MODES.has(mode) ? mode : "all";
  }

  function cleanEngagementMissingEntryTimeMode(value) {
    const mode = backendContext.cleanText(value);
    return backendContext.ENGAGEMENT_MISSING_ENTRY_TIME_MODES.has(mode) ? mode : "manual";
  }

  function cleanEngagementMaxEventsPerSwimmer(value) {
    const count = Math.trunc(Number(value) || 0);
    return Math.min(20, Math.max(0, count));
  }

  function cleanEngagementFeeAmount(value) {
    const amount = Number(value) || 0;
    return Math.min(9999, Math.max(0, Math.round(amount * 100) / 100));
  }

  function cleanEngagementFees(rawFees = {}, options = {}) {
    if (!rawFees || typeof rawFees !== "object") {
      return {
        enabled: true,
        swimmerFee: 0,
        individualEventFee: 0,
        relayFee: 0,
        helloAssoUrl: "",
        latePaymentSurcharge: 50
      };
    }
    const strict = options.strict !== false;
    const enabled = rawFees.enabled !== false;
    const helloAssoUrl = backendContext.cleanText(rawFees.helloAssoUrl).slice(0, 300);
    if (helloAssoUrl && !/^https?:\/\/\S+$/i.test(helloAssoUrl)) {
      if (strict) throw new backendContext.HttpsError("invalid-argument", "Lien HelloAsso invalide.");
    }
    return {
      enabled,
      swimmerFee: enabled ? cleanEngagementFeeAmount(rawFees.swimmerFee) : 0,
      individualEventFee: enabled ? cleanEngagementFeeAmount(rawFees.individualEventFee) : 0,
      relayFee: enabled ? cleanEngagementFeeAmount(rawFees.relayFee) : 0,
      helloAssoUrl: enabled && /^https?:\/\/\S+$/i.test(helloAssoUrl) ? helloAssoUrl : "",
      latePaymentSurcharge: 50
    };
  }

  function cleanEngagementCompetitionEvents(rawEvents = [], options = {}) {
    if (!Array.isArray(rawEvents)) return [];
    const strict = options.strict !== false;
    const seen = new Set();
    const events = [];
    rawEvents.slice(0, 80).forEach((rawEvent) => {
      const code = backendContext.cleanText(rawEvent?.code).toUpperCase().replace(/\s+/g, "");
      const competitionType = cleanEngagementCompetitionType(options.competitionType);
      const staticDefinition = backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE.get(code);
      const definition = competitionType === "openWater"
        ? (code === "OW4X1000SB" ? staticDefinition : engagementOpenWaterEventDefinition(rawEvent))
        : (code === "OW4X1000SB" ? null : staticDefinition);
      if (!definition) {
        if (strict) throw new backendContext.HttpsError("invalid-argument", `Course engagements inconnue : ${code || "-"}.`);
        return;
      }
      if (seen.has(code)) return;
      seen.add(code);
      const forbiddenCategories = backendContext.ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES[code] || new Set();
      const allowedCategories = backendContext.engagementCategoryCodesForEvent(code).filter((category) => !forbiddenCategories.has(category));
      const categoryRestrictions = [];
      const seenCategories = new Set();
      if (Array.isArray(rawEvent?.categoryRestrictions)) {
        rawEvent.categoryRestrictions.slice(0, 20).forEach((rawCategory) => {
          const category = backendContext.cleanText(rawCategory).toUpperCase().replace(/\s+/g, "");
          if (!category) return;
          if (!backendContext.ENGAGEMENT_CATEGORY_CODE_SET.has(category)) {
            if (strict) throw new backendContext.HttpsError("invalid-argument", `Categorie inconnue pour ${code} : ${category}.`);
            return;
          }
          if (!allowedCategories.includes(category)) {
            if (strict) throw new backendContext.HttpsError("invalid-argument", `Categorie non autorisee pour ${code} : ${category}.`);
            return;
          }
          if (forbiddenCategories.has(category)) return;
          if (seenCategories.has(category)) return;
          seenCategories.add(category);
          categoryRestrictions.push(category);
        });
      }
      const normalizedCategoryRestrictions = backendContext.normalizeEngagementEventCategoryRestrictions(
        code,
        forbiddenCategories.size && !categoryRestrictions.length ? allowedCategories : categoryRestrictions
      );
      const relayMixedMode = backendContext.cleanEngagementRelayMixedMode(rawEvent, definition);
      events.push({
        ...definition,
        categoryRestrictions: normalizedCategoryRestrictions,
        ...(relayMixedMode ? { relayMixedMode } : {}),
        ...(definition.type === "relay" ? { multipleRelaysAllowed: rawEvent?.multipleRelaysAllowed === true } : {})
      });
    });
    return events;
  }

  function cleanEngagementProgramSessions(rawSessions = [], selectedEvents = [], options = {}) {
    if (!Array.isArray(rawSessions)) return [];
    const strict = options.strict !== false;
    const selectedCodes = new Set(selectedEvents.map((event) => backendContext.cleanText(event?.code).toUpperCase()).filter(Boolean));
    const selectedEventsByCode = new Map(selectedEvents.map((event) => [backendContext.cleanText(event?.code).toUpperCase(), event]));
    const usedProgramSlots = new Map();
    function slotConflict(eventCode, genderMode, phase) {
      const usedModes = usedProgramSlots.get(`${eventCode}:${phase}`) || new Set();
      if (genderMode === "mixed") return usedModes.size > 0;
      return usedModes.has("mixed") || usedModes.has(genderMode);
    }
    function registerSlot(eventCode, genderMode, phase) {
      const key = `${eventCode}:${phase}`;
      if (!usedProgramSlots.has(key)) usedProgramSlots.set(key, new Set());
      usedProgramSlots.get(key).add(genderMode);
    }
    const sessions = rawSessions.slice(0, 12).map((rawSession, sessionIndex) => {
      const label = `Session ${sessionIndex + 1}`;
      const date = cleanIsoDate(rawSession?.date);
      const startTime = /^\d{2}:\d{2}$/.test(backendContext.cleanText(rawSession?.startTime)) ? backendContext.cleanText(rawSession.startTime) : "";
      const items = [];
      if (Array.isArray(rawSession?.items)) {
        rawSession.items.slice(0, 160).forEach((rawItem) => {
          const eventCode = backendContext.cleanText(rawItem?.eventCode || rawItem?.code).toUpperCase().replace(/\s+/g, "");
          const definition = selectedEventsByCode.get(eventCode) || backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE.get(eventCode);
          if (!definition || (selectedCodes.size && !selectedCodes.has(eventCode))) {
            if (strict) throw new backendContext.HttpsError("invalid-argument", `Epreuve programme inconnue ou non selectionnee : ${eventCode || "-"}.`);
            return;
          }
          const requestedGenderMode = backendContext.ENGAGEMENT_PROGRAM_GENDER_MODES.has(backendContext.cleanText(rawItem?.genderMode))
            ? backendContext.cleanText(rawItem.genderMode)
            : "mixed";
          const genderMode = definition.relayMixedRule === "required" ? "mixed" : requestedGenderMode;
          const requestedPhase = backendContext.cleanText(rawItem?.phase);
          let phase = backendContext.ENGAGEMENT_PROGRAM_PHASES.has(requestedPhase) ? requestedPhase : "direct";
          const isOpenWaterEvent = /^OW/.test(eventCode);
          const isOpenWaterElimination = definition?.openWaterFormat === "elimination" || /^OW150ELIM(?:SF|BI)$/.test(eventCode);
          const allowedPhases = isOpenWaterEvent
            ? (isOpenWaterElimination ? new Set(["direct", "heats", "final"]) : new Set(["direct"]))
            : backendContext.ENGAGEMENT_PROGRAM_PHASES;
          if (!allowedPhases.has(phase)) {
            if (strict) throw new backendContext.HttpsError("invalid-argument", isOpenWaterElimination
              ? `Seules les series et la finale sont autorisees pour le 150 m elimination : ${eventCode}.`
              : `Cette course eau libre se nage directement : ${eventCode}.`);
            phase = "direct";
          }
          if (slotConflict(eventCode, genderMode, phase)) {
            if (strict) throw new backendContext.HttpsError("invalid-argument", `Doublon dans le programme : ${eventCode} ${genderMode} ${phase}.`);
            return;
          }
          registerSlot(eventCode, genderMode, phase);
          items.push({
            eventCode,
            genderMode,
            phase,
            order: items.length + 1
          });
        });
      }
      return {
        id: backendContext.cleanText(rawSession?.id).slice(0, 40) || `session-${sessionIndex + 1}`,
        label,
        date,
        startTime,
        order: sessionIndex + 1,
        items
      };
    }).filter((session) => session.items.length || session.label);
    if (!strict) return sessions;

    const occurrences = sessions.flatMap((session, sessionIndex) => (session.items || []).map((item, itemIndex) => ({
      ...item,
      position: sessionIndex * 160 + itemIndex
    })));
    const modesByEvent = new Map();
    occurrences.forEach((item) => {
      if (!modesByEvent.has(item.eventCode)) modesByEvent.set(item.eventCode, new Set());
      modesByEvent.get(item.eventCode).add(item.genderMode);
    });
    for (const [eventCode, modes] of modesByEvent) {
      if (modes.has("mixed") && modes.size > 1) {
        throw new backendContext.HttpsError("invalid-argument", `Programme incoherent pour ${eventCode} : F/H ensemble ne peut pas etre combine avec Femmes ou Hommes.`);
      }
    }
    const groups = new Map();
    occurrences.forEach((item) => {
      const key = `${item.eventCode}:${item.genderMode}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
    for (const items of groups.values()) {
      const eventCode = items[0].eventCode;
      const phases = new Set(items.map((item) => item.phase));
      if (phases.has("direct") && phases.size > 1) {
        throw new backendContext.HttpsError("invalid-argument", `Course directe incompatible avec un autre passage : ${eventCode}.`);
      }
      const heats = items.find((item) => item.phase === "heats");
      const final = items.find((item) => item.phase === "final");
      const slowHeats = items.find((item) => item.phase === "slowHeats");
      const fastHeat = items.find((item) => item.phase === "fastHeat");
      if (Boolean(heats) !== Boolean(final)) {
        throw new backendContext.HttpsError("invalid-argument", `Les series et la finale doivent etre programmees ensemble : ${eventCode}.`);
      }
      if (Boolean(slowHeats) !== Boolean(fastHeat)) {
        throw new backendContext.HttpsError("invalid-argument", `Les series lentes et la serie rapide doivent etre programmees ensemble : ${eventCode}.`);
      }
      if ((heats || final) && (slowHeats || fastHeat)) {
        throw new backendContext.HttpsError("invalid-argument", `Deux formats de deroulement sont combines pour ${eventCode}.`);
      }
      if (heats && final && heats.position >= final.position) {
        throw new backendContext.HttpsError("invalid-argument", `La finale doit etre placee apres les series : ${eventCode}.`);
      }
      if (slowHeats && fastHeat && slowHeats.position >= fastHeat.position) {
        throw new backendContext.HttpsError("invalid-argument", `La serie rapide doit etre placee apres les series lentes : ${eventCode}.`);
      }
    }
    return sessions;
  }

  function engagementCompetitionCalendarItem(data = {}, id = "") {
    const competitionType = cleanEngagementCompetitionType(data.competitionType);
    const events = cleanEngagementCompetitionEvents(data.events || [], { strict: false, competitionType });
    const programSessions = cleanEngagementProgramSessions(data.programSessions || [], events, { strict: false });
    return {
      id: backendContext.cleanText(id || data.id).slice(0, 128),
      name: backendContext.cleanText(data.name || data.title).slice(0, 160),
      date: cleanIsoDate(data.date),
      endDate: cleanIsoDate(data.endDate) || cleanIsoDate(data.date),
      location: backendContext.cleanText(data.location).slice(0, 160),
      city: backendContext.cleanText(data.city || data.location).slice(0, 120),
      address: backendContext.cleanText(data.address).slice(0, 300),
      organizer: backendContext.cleanText(data.organizer).slice(0, 160),
      organizerEmail: backendContext.normalizeEmail(data.organizerEmail).slice(0, 180),
      teamLeadersWhatsAppUrl: isNationalOnlyEngagementCompetitionLevel(data.level)
        ? backendContext.cleanPublicCalendarWhatsAppUrl(data.teamLeadersWhatsAppUrl)
        : "",
      publicDescription: backendContext.cleanText(data.publicDescription).slice(0, 3000),
      regionId: backendContext.cleanText(data.regionId).slice(0, 80),
      invitedRegionIds: backendContext.cleanEngagementRegionIds(data.invitedRegionIds, data.regionId),
      level: cleanEngagementCompetitionLevel(data.level || data.competitionLevel),
      competitionType,
      waterBodyType: competitionType === "openWater" ? cleanEngagementWaterBodyType(data.waterBodyType) : "",
      entryDeadlineAt: backendContext.cleanText(data.entryDeadlineAt).slice(0, 40),
      computerEmail: backendContext.normalizeEmail(data.computerEmail).slice(0, 180),
      officialsManagerEmail: backendContext.normalizeEmail(data.officialsManagerEmail).slice(0, 180),
      entryStatus: cleanEngagementEntryStatus(data.entryStatus || data.status),
      publicationStatus: backendContext.cleanPublicCalendarPublicationStatus(data.publicationStatus),
      canceled: data.canceled === true,
      resultsPublishedAt: backendContext.cleanText(data.resultsPublishedAt).slice(0, 40),
      resultsUrl: backendContext.cleanText(data.resultsUrl).slice(0, 900),
      resultsPdfUrl: backendContext.cleanText(data.resultsPdfUrl).slice(0, 900),
      documentCount: backendContext.cleanCompetitionDocuments(data.clubDocuments || []).length,
      officialsRequired: data.officialsRequired === true,
      poolLength: cleanEngagementPoolLength(data.poolLength),
      poolLaneCount: cleanEngagementPoolLaneCount(data.poolLaneCount),
      timingType: cleanEngagementTimingType(data.timingType),
      qualificationTimesMode: cleanEngagementQualificationTimesMode(data.qualificationTimesMode),
      qualificationStartDate: cleanIsoDate(data.qualificationStartDate),
      qualificationEndDate: cleanIsoDate(data.qualificationEndDate),
      missingEntryTimeMode: data.qualifications?.enabled ? "default595999" : cleanEngagementMissingEntryTimeMode(data.missingEntryTimeMode),
      maxEventsPerSwimmer: cleanEngagementMaxEventsPerSwimmer(data.maxEventsPerSwimmer),
      eventCount: events.length,
      individualEventCount: events.filter((event) => event.type === "individual").length,
      relayEventCount: events.filter((event) => event.type === "relay").length,
      sessionCount: programSessions.length,
      programItemCount: programSessions.reduce((sum, session) => sum + session.items.length, 0),
      updatedAt: backendContext.cleanText(data.updatedAt).slice(0, 40)
    };
  }

  function engagementCompetitionListItem(doc) {
    return engagementCompetitionCalendarItem(doc.data() || {}, doc.id);
  }

  function engagementCompetitionCalendarRef(db, endYear) {
    return db.collection(backendContext.ENGAGEMENT_COMPETITION_CALENDARS_COLLECTION).doc(String(Math.trunc(Number(endYear) || 0)));
  }

  function engagementCalendarEventCalendarRef(db, endYear) {
    return db.collection(backendContext.ENGAGEMENT_CALENDAR_EVENT_CALENDARS_COLLECTION).doc(String(Math.trunc(Number(endYear) || 0)));
  }

  function cleanEngagementCalendarEventPayload(raw = {}, context = {}) {
    const eventType = backendContext.cleanPublicCalendarEventType(raw.eventType, "");
    const name = backendContext.cleanText(raw.name || raw.title).slice(0, 160);
    const date = cleanIsoDate(raw.date);
    const endDate = cleanIsoDate(raw.endDate) || date;
    const location = backendContext.cleanText(raw.location).slice(0, 160);
    const city = backendContext.cleanText(raw.city || raw.location).slice(0, 120);
    const level = backendContext.cleanPublicCalendarLevel(raw.level);
    const requestedRegionId = backendContext.cleanText(raw.regionId).slice(0, 80);
    const regionId = isNationalOnlyEngagementCompetitionLevel(level) ? "" : (context.national ? requestedRegionId : context.regionId);
    if (!context.national && !context.region) {
      throw new backendContext.HttpsError("permission-denied", "Droit de gestion du calendrier requis.");
    }
    if (!context.national && isNationalOnlyEngagementCompetitionLevel(level)) {
      throw new backendContext.HttpsError("permission-denied", "Un evenement national doit etre cree par le niveau national.");
    }
    if (!backendContext.PUBLIC_CALENDAR_EVENT_TYPES.has(eventType)) {
      throw new backendContext.HttpsError("invalid-argument", "Type d'evenement invalide.");
    }
    if (!name || !date || !city) {
      throw new backendContext.HttpsError("invalid-argument", "Nom, date et ville sont obligatoires.");
    }
    if (endDate < date) {
      throw new backendContext.HttpsError("invalid-argument", "La date de fin doit etre egale ou posterieure a la date de debut.");
    }
    if (!isNationalOnlyEngagementCompetitionLevel(level) && !regionId) {
      throw new backendContext.HttpsError("invalid-argument", "Region obligatoire pour un evenement departemental ou regional.");
    }
    return {
      eventType,
      name,
      date,
      endDate,
      city,
      location,
      address: backendContext.cleanText(raw.address).slice(0, 300),
      organizer: backendContext.cleanText(raw.organizer).slice(0, 160),
      publicDescription: backendContext.cleanText(raw.publicDescription).slice(0, 3000),
      entryDeadlineAt: backendContext.cleanIsoDateTime(raw.entryDeadlineAt),
      registrationUrl: backendContext.cleanPublicCalendarUrl(raw.registrationUrl, 500),
      regionId,
      level,
      publicationStatus: "published",
      canceled: raw.canceled === true,
      programSessions: backendContext.cleanPublicCalendarProgram(raw.programSessions || raw.program || [])
    };
  }

  function engagementCalendarEventCalendarItem(data = {}, id = "") {
    return {
      id: backendContext.cleanText(id || data.id).slice(0, 128),
      sourceType: "calendarEvent",
      eventType: backendContext.cleanPublicCalendarEventType(data.eventType),
      competitionType: backendContext.cleanPublicCalendarEventType(data.eventType),
      name: backendContext.cleanText(data.name || data.title).slice(0, 160),
      date: cleanIsoDate(data.date),
      endDate: cleanIsoDate(data.endDate) || cleanIsoDate(data.date),
      city: backendContext.cleanText(data.city || data.location).slice(0, 120),
      location: backendContext.cleanText(data.location).slice(0, 160),
      address: backendContext.cleanText(data.address).slice(0, 300),
      organizer: backendContext.cleanText(data.organizer).slice(0, 160),
      publicDescription: backendContext.cleanText(data.publicDescription).slice(0, 3000),
      entryDeadlineAt: backendContext.cleanIsoDateTime(data.entryDeadlineAt),
      registrationUrl: backendContext.cleanPublicCalendarUrl(data.registrationUrl, 500),
      regionId: backendContext.cleanText(data.regionId).slice(0, 80),
      level: backendContext.cleanPublicCalendarLevel(data.level),
      publicationStatus: backendContext.cleanPublicCalendarPublicationStatus(data.publicationStatus),
      canceled: data.canceled === true,
      resultsPublishedAt: backendContext.cleanText(data.resultsPublishedAt).slice(0, 40),
      resultsUrl: backendContext.cleanText(data.resultsUrl).slice(0, 900),
      resultsPdfUrl: backendContext.cleanText(data.resultsPdfUrl).slice(0, 900),
      documentCount: backendContext.cleanCompetitionDocuments(data.clubDocuments || []).length,
      entryStatus: "",
      updatedAt: backendContext.cleanText(data.updatedAt).slice(0, 40)
    };
  }

  function engagementCalendarEventDetailItem(doc, options = {}) {
    const data = doc?.data ? doc.data() || {} : doc || {};
    const id = backendContext.cleanText(doc?.id || options.id).slice(0, 128);
    return {
      ...engagementCalendarEventCalendarItem(data, id),
      programSessions: backendContext.cleanPublicCalendarProgram(data.programSessions || []),
      clubDocuments: backendContext.cleanCompetitionDocuments(data.clubDocuments || [], {
        includeUploader: options.includeDocumentUploader === true
      }),
      createdAt: backendContext.cleanText(data.createdAt).slice(0, 40),
      createdBy: options.includeDocumentUploader === true ? backendContext.cleanText(data.createdBy).slice(0, 128) : ""
    };
  }

  function engagementCalendarEventItemsFromData(data = {}) {
    const events = data.events && typeof data.events === "object" ? data.events : {};
    return Object.values(events)
      .map((event) => engagementCalendarEventCalendarItem(event, event.id))
      .filter((event) => event.id && event.date);
  }

  function engagementClubCompetitionIndexRef(db, clubId) {
    return db.collection(backendContext.ENGAGEMENT_CLUB_COMPETITION_INDEXES_COLLECTION).doc(backendContext.cleanText(clubId).slice(0, 40));
  }

  function engagementClubCompetitionIndexKey(competitionId) {
    return backendContext.stableHash(backendContext.cleanText(competitionId).slice(0, 128)).slice(0, 40);
  }

  function engagementClosureQueueRef(db, competitionId) {
    return db.collection(backendContext.ENGAGEMENT_CLOSURE_QUEUE_COLLECTION).doc(backendContext.cleanText(competitionId).slice(0, 128));
  }

  function engagementClosureQueueItem(competition = {}, competitionId = "", now = new Date().toISOString()) {
    const entryStatus = cleanEngagementEntryStatus(competition.entryStatus || competition.status);
    const runAt = backendContext.cleanIsoDateTime(competition.entryDeadlineAt);
    if (entryStatus !== "open" || !runAt) return null;
    return backendContext.cleanFirestoreValue({
      competitionId: backendContext.cleanText(competitionId).slice(0, 128),
      competitionName: backendContext.cleanText(competition.name || competition.title).slice(0, 160),
      runAt,
      entryDeadlineAt: runAt,
      regionId: backendContext.cleanText(competition.regionId).slice(0, 80),
      level: cleanEngagementCompetitionLevel(competition.level || competition.competitionLevel),
      status: "scheduled",
      updatedAt: now
    });
  }

  function engagementCompetitionCalendarItemsFromData(data = {}) {
    const competitions = data.competitions && typeof data.competitions === "object" ? data.competitions : {};
    return Object.values(competitions)
      .map((competition) => engagementCompetitionCalendarItem(competition, competition.id))
      .filter((competition) => competition.id && competition.date);
  }

  function filterEngagementCompetitionCalendarItems(items = [], filters = {}) {
    return items
      .filter((competition) => !filters.startDate || !competition.date || competition.date >= filters.startDate)
      .filter((competition) => !filters.endDate || !competition.date || competition.date <= filters.endDate)
      .filter((competition) => !filters.regionId || competition.regionId === filters.regionId)
      .filter((competition) => !filters.level || competition.level === filters.level)
      .filter((competition) => !filters.competitionType || competition.competitionType === filters.competitionType)
      .filter((competition) => !filters.entryStatus || competition.entryStatus === filters.entryStatus)
      .sort((left, right) =>
        backendContext.cleanText(left.date).localeCompare(backendContext.cleanText(right.date)) ||
        backendContext.cleanText(left.name).localeCompare(backendContext.cleanText(right.name), "fr")
      );
  }

  function engagementCompetitionDetailItem(doc, options = {}) {
    const data = doc.data() || {};
    const events = cleanEngagementCompetitionEvents(data.events || [], {
      strict: false,
      competitionType: cleanEngagementCompetitionType(data.competitionType)
    });
    const closureSummary = data.closureAutomationSummary && typeof data.closureAutomationSummary === "object"
      ? data.closureAutomationSummary
      : {};
    return {
      ...engagementCompetitionListItem(doc),
      qualifications: data.qualifications || { enabled: false },
      qualificationVersion: Number(data.qualificationVersion || 0),
      qualificationJobId: backendContext.cleanText(data.qualificationJobId),
      events,
      programSessions: cleanEngagementProgramSessions(data.programSessions || [], events, { strict: false }),
      fees: cleanEngagementFees(data.fees || {}, { strict: false }),
      clubDocuments: backendContext.cleanCompetitionDocuments(data.clubDocuments || [], {
        includeUploader: options.includeDocumentUploader === true
      }),
      documents: backendContext.engagementCompetitionDocumentsMetadata(data.documents || {}),
      generatedFiles: backendContext.cleanEngagementGeneratedFiles(data.generatedFiles || []),
      closureAutomationStatus: backendContext.cleanText(data.closureAutomationStatus).slice(0, 80),
      closureAutomationStartedAt: backendContext.cleanText(data.closureAutomationStartedAt).slice(0, 40),
      closureAutomationCompletedAt: backendContext.cleanText(data.closureAutomationCompletedAt).slice(0, 40),
      closureAutomationFailedAt: backendContext.cleanText(data.closureAutomationFailedAt).slice(0, 40),
      closureAutomationReason: backendContext.cleanText(data.closureAutomationReason).slice(0, 220),
      closureRecapEmailsPreparedAt: backendContext.cleanText(data.closureRecapEmailsPreparedAt).slice(0, 40),
      closureRecapEmailsSentAt: backendContext.cleanText(data.closureRecapEmailsSentAt).slice(0, 40),
      closureAutomationSummary: {
        clubEntryCount: Math.max(0, Math.trunc(Number(closureSummary.clubEntryCount) || 0)),
        skippedClubCount: Math.max(0, Math.trunc(Number(closureSummary.skippedClubCount) || 0)),
        jobCount: Math.max(0, Math.trunc(Number(closureSummary.jobCount) || 0)),
        pdfGeneratedCount: Math.max(0, Math.trunc(Number(closureSummary.pdfGeneratedCount) || 0)),
        pdfReusedCount: Math.max(0, Math.trunc(Number(closureSummary.pdfReusedCount) || 0)),
        txtGeneratedCount: Math.max(0, Math.trunc(Number(closureSummary.txtGeneratedCount) || 0)),
        txtMailJobCount: Math.max(0, Math.trunc(Number(closureSummary.txtMailJobCount) || 0)),
        officialsPdfGeneratedCount: Math.max(0, Math.trunc(Number(closureSummary.officialsPdfGeneratedCount) || 0)),
        officialsMailJobCount: Math.max(0, Math.trunc(Number(closureSummary.officialsMailJobCount) || 0)),
        officialCount: Math.max(0, Math.trunc(Number(closureSummary.officialCount) || 0)),
        officialsPersonLookupReadCount: Math.max(0, Math.trunc(Number(closureSummary.officialsPersonLookupReadCount) || 0)),
        prepareErrorCount: Math.max(0, Math.trunc(Number(closureSummary.prepareErrorCount) || 0)),
        attemptedMailCount: Math.max(0, Math.trunc(Number(closureSummary.attemptedMailCount) || 0)),
        sentMailCount: Math.max(0, Math.trunc(Number(closureSummary.sentMailCount) || 0)),
        sendErrorCount: Math.max(0, Math.trunc(Number(closureSummary.sendErrorCount) || 0)),
        txtAttemptedMailCount: Math.max(0, Math.trunc(Number(closureSummary.txtAttemptedMailCount) || 0)),
        txtSentMailCount: Math.max(0, Math.trunc(Number(closureSummary.txtSentMailCount) || 0)),
        txtSendErrorCount: Math.max(0, Math.trunc(Number(closureSummary.txtSendErrorCount) || 0)),
        officialsAttemptedMailCount: Math.max(0, Math.trunc(Number(closureSummary.officialsAttemptedMailCount) || 0)),
        officialsSentMailCount: Math.max(0, Math.trunc(Number(closureSummary.officialsSentMailCount) || 0)),
        officialsSendErrorCount: Math.max(0, Math.trunc(Number(closureSummary.officialsSendErrorCount) || 0)),
        updatedAt: backendContext.cleanText(closureSummary.updatedAt).slice(0, 40)
      },
      createdAt: backendContext.cleanText(data.createdAt).slice(0, 40),
      createdBy: backendContext.cleanText(data.createdBy).slice(0, 128),
      updatedBy: backendContext.cleanText(data.updatedBy).slice(0, 128)
    };
  }

  function engagementClubEntryId(competitionId, clubId) {
    return `${backendContext.cleanText(competitionId).slice(0, 128)}_${backendContext.cleanText(clubId).slice(0, 40)}`;
  }

  async function engagementClubEntryCompetitionIds(competitions = [], clubId = "", coverageKeys = [], prefetchedIndexSnapshot = null) {
    const competitionIds = Array.from(new Set((Array.isArray(competitions) ? competitions : [])
      .map((competition) => backendContext.cleanText(competition?.id).slice(0, 128))
      .filter(Boolean)));
    const cleanClubId = backendContext.cleanText(clubId).slice(0, 40);
    if (!competitionIds.length || !cleanClubId) return { ids: new Set(), cacheHit: true, fallbackDocumentsMax: 0 };
    const cleanCoverageKeys = Array.from(new Set((Array.isArray(coverageKeys) ? coverageKeys : [])
      .map((key) => backendContext.cleanText(key).slice(0, 20))
      .filter(Boolean)));
    const indexRef = engagementClubCompetitionIndexRef(backendContext.db, cleanClubId);
    const indexSnapshot = prefetchedIndexSnapshot || await indexRef.get();
    const indexData = indexSnapshot.exists ? indexSnapshot.data() || {} : {};
    const coveredRanges = indexData.coveredRanges && typeof indexData.coveredRanges === "object" ? indexData.coveredRanges : {};
    if (cleanCoverageKeys.length && cleanCoverageKeys.every((key) => coveredRanges[key] === true)) {
      const indexedIds = new Set(Object.values(indexData.competitionIds || {}).map(backendContext.cleanText).filter(Boolean));
      return {
        ids: new Set(competitionIds.filter((competitionId) => indexedIds.has(competitionId))),
        cacheHit: true,
        fallbackDocumentsMax: 0
      };
    }
    const competitionIdByEntryId = new Map(competitionIds
      .map((competitionId) => [engagementClubEntryId(competitionId, cleanClubId), competitionId]));
    const batches = [];
    for (let index = 0; index < competitionIds.length; index += 30) {
      const batchCompetitionIds = competitionIds.slice(index, index + 30);
      const entryIds = batchCompetitionIds.map((competitionId) => engagementClubEntryId(competitionId, cleanClubId));
      batches.push(backendContext.db.collection("engagementClubEntries")
        .where(backendContext.FieldPath.documentId(), "in", entryIds)
        .select("competitionId")
        .get());
    }
    const snapshots = await Promise.all(batches);
    const found = new Set(snapshots.flatMap((snapshot) => snapshot.docs
      .map((doc) => backendContext.cleanText(doc.data()?.competitionId || competitionIdByEntryId.get(doc.id)).slice(0, 128))
      .filter(Boolean)));
    const now = new Date().toISOString();
    const competitionIndex = Object.fromEntries([...found].map((competitionId) => [engagementClubCompetitionIndexKey(competitionId), competitionId]));
    const coverage = Object.fromEntries(cleanCoverageKeys.map((key) => [key, true]));
    await indexRef.set({
      clubId: cleanClubId,
      generatedAt: now,
      updatedAt: now,
      ...(Object.keys(competitionIndex).length ? { competitionIds: competitionIndex } : {}),
      ...(Object.keys(coverage).length ? { coveredRanges: coverage } : {})
    }, { merge: true });
    return {
      ids: found,
      cacheHit: false,
      fallbackDocumentsMax: competitionIds.length + batches.length
    };
  }

  function engagementPersonLicenseKey(value) {
    return backendContext.cleanText(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  function assertEngagementSwimmerRoleCompatibility(entryData = {}, swimmers = []) {
    const teamLeader = entryData.teamLeader || {};
    const teamLeaderLicense = engagementPersonLicenseKey(teamLeader.licenseNumber);
    const officialLicenses = new Set((Array.isArray(entryData.officials) ? entryData.officials : [])
      .map((official) => engagementPersonLicenseKey(official.licenseNumber))
      .filter(Boolean));
    swimmers.forEach((swimmer) => {
      const licenseKey = engagementPersonLicenseKey(swimmer.licenseNumber);
      if (licenseKey && teamLeaderLicense === licenseKey) {
        throw new backendContext.HttpsError("failed-precondition", "Une meme personne ne peut pas etre nageur et chef d'equipe sur cette competition.");
      }
      if (licenseKey && officialLicenses.has(licenseKey)) {
        throw new backendContext.HttpsError("failed-precondition", "Une meme personne ne peut pas etre nageur et officiel sur cette competition.");
      }
    });
  }

  return {
    cleanIsoDate,
    cleanEngagementCompetitionLevel,
    isNationalOnlyEngagementCompetitionLevel,
    cleanEngagementEntryStatus,
    cleanEngagementCompetitionType,
    cleanEngagementWaterBodyType,
    cleanEngagementOpenWaterCourse,
    cleanEngagementOpenWaterCourses,
    engagementOpenWaterCourseConfigRef,
    engagementOpenWaterEventDefinition,
    cleanOptionalEmail,
    cleanEngagementPoolLength,
    cleanEngagementPoolLaneCount,
    cleanEngagementTimingType,
    cleanEngagementQualificationTimesMode,
    cleanEngagementMissingEntryTimeMode,
    cleanEngagementMaxEventsPerSwimmer,
    cleanEngagementFeeAmount,
    cleanEngagementFees,
    cleanEngagementCompetitionEvents,
    cleanEngagementProgramSessions,
    engagementCompetitionCalendarItem,
    engagementCompetitionListItem,
    engagementCompetitionCalendarRef,
    engagementCalendarEventCalendarRef,
    cleanEngagementCalendarEventPayload,
    engagementCalendarEventCalendarItem,
    engagementCalendarEventDetailItem,
    engagementCalendarEventItemsFromData,
    engagementClubCompetitionIndexRef,
    engagementClubCompetitionIndexKey,
    engagementClosureQueueRef,
    engagementClosureQueueItem,
    engagementCompetitionCalendarItemsFromData,
    filterEngagementCompetitionCalendarItems,
    engagementCompetitionDetailItem,
    engagementClubEntryId,
    engagementClubEntryCompetitionIds,
    engagementPersonLicenseKey,
    assertEngagementSwimmerRoleCompatibility
  };
}

module.exports = { createCompetitionModelService };
