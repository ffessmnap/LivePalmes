// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionModelService_cleanEngagementProgramSessions(backendContext) {
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
      const date = (0, backendContext.local$cleanIsoDate)(rawSession?.date);
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

  return { cleanEngagementProgramSessions };
}

module.exports = { createCompetitionModelService_cleanEngagementProgramSessions };
