(function () {
  let context = {};
  let data = { events: [], entrants: [], series: [], program: [] };
  let sampleData = { entrants: [] };

  function useContext(nextContext = {}) {
    context = nextContext || {};
    data = context.data || data || { events: [], entrants: [], series: [], program: [] };
    sampleData = context.sampleData || sampleData || { entrants: [] };
  }

  function callDependency(name, fallback, ...args) {
    return typeof context[name] === "function" ? context[name](...args) : fallback(...args);
  }

  function fixPdfEncoding(value) {
    return callDependency("fixPdfEncoding", (input) => String(input || ""), value);
  }

  function normalizePdfLabel(value) {
    return callDependency("normalizePdfLabel", (input) => String(input || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").toLowerCase(), value);
  }

  function importedEventId(label) {
    return callDependency("importedEventId", () => "", label);
  }

  function importedEventInfo(eventId, fallbackLabel = "") {
    return callDependency("importedEventInfo", (id, label) => ({ id, label: label || id }), eventId, fallbackLabel);
  }

  function importedCategoryLabel(code) {
    return callDependency("importedCategoryLabel", (input) => String(input || "").toUpperCase(), code);
  }

  function importedBirthYear(twoDigits) {
    return callDependency("importedBirthYear", (input) => String(input || ""), twoDigits);
  }

  function splitImportedPersonName(value) {
    return callDependency("splitImportedPersonName", (input) => ({ lastName: String(input || "").trim(), firstName: "" }), value);
  }

  function isImportedRelayEvent(eventId) {
    return callDependency("isImportedRelayEvent", (input) => String(input || "").includes("x"), eventId);
  }

  function importedSeriesTime(value) {
    return callDependency("importedSeriesTime", (input) => String(input || "").trim(), value);
  }

  function eventSignature(value) {
    return callDependency("eventSignature", () => "", value);
  }

  function seedSourceTimeKey(value) {
    return callDependency("seedSourceTimeKey", (input) => String(input || "").trim().replace(",", ".").replace(/^00:/, ""), value);
  }

  function normalizePersonName(value) {
    return callDependency("normalizePersonName", (input) => String(input || "").trim().toLowerCase(), value);
  }

  function formatName(row) {
    return callDependency("formatName", (input) => [input?.lastName, input?.firstName].filter(Boolean).join(" "), row);
  }

  function availableSexesForEvent(eventId) {
    return callDependency("availableSexesForEvent", () => [], eventId);
  }

  function importUtils() {
    return window.LivePalmesSeriesImportUtils.create({
      availableSexesForEvent,
      data,
      fixPdfEncoding,
      formatName,
      normalizePersonName,
      sampleData,
      seedSourceTimeKey
    });
  }

  function parseImportedMeetMetadata(lines) { return importUtils().parseImportedMeetMetadata(lines); }
  function splitEmbeddedPdfLines(line) { return importUtils().splitEmbeddedPdfLines(line); }
  function applyImportedSessionOverride(parsed, sessionNumber) { return importUtils().applyImportedSessionOverride(parsed, sessionNumber); }
  function parsedSessionNumbers(parsed) { return importUtils().parsedSessionNumbers(parsed); }
  function filterImportedSession(parsed, sessionNumber) { return importUtils().filterImportedSession(parsed, sessionNumber); }
  function prepareImportedSeriesForMode(parsed, mode, forcedSession) { return importUtils().prepareImportedSeriesForMode(parsed, mode, forcedSession); }
  function seedSourceLookupKeys(row) { return importUtils().seedSourceLookupKeys(row); }
  function inheritImportedSeedSources(parsed) { return importUtils().inheritImportedSeedSources(parsed); }
  function mergeImportedSeriesData(parsed, mode = "session") { return importUtils().mergeImportedSeriesData(parsed, mode); }

  async function extractPdfLines(file) {
    const pdfjs = await import("./vendor/pdfjs-6.5.438/pdf.min.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = "assets/vendor/pdfjs-6.5.438/pdf.worker.min.mjs";
    const buffer = await file.arrayBuffer();
    const loading = pdfjs.getDocument({ data: buffer, isEvalSupported: false });
    try {
      const pdf = await loading.promise;
      const lines = [];
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const text = await page.getTextContent();
        const seenFragments = new Set();
        const items = text.items.map(item => {
          if (!item.str?.trim()) return item;
          const key = JSON.stringify([item.transform[4], item.transform[5], item.str]);
          // Garder le saut de ligne même si PDF.js le porte sur une surimpression.
          if (seenFragments.has(key)) return { ...item, str: "" };
          seenFragments.add(key);
          return item;
        });
        const pageLines = [];
        const seen = new Set();
        function appendLine(parts) {
          if (!parts.length) return;
          const line = fixPdfEncoding(parts.map(item => item.str).join(" ")).replace(/\s+/g, " ").trim();
          // Une autre épreuve peut imprimer exactement la même ligne ailleurs sur la page.
          const [x, y] = parts[0].transform.slice(4);
          const key = JSON.stringify([x, y, line]);
          if (line && !seen.has(key)) {
            pageLines.push(line);
            seen.add(key);
          }
        }
        extractPdfLinesByFlow(items).forEach(appendLine);
        const hasStructuredFlow = pageLines.some((line) => /\bs.{1,2}rie\s*:\s*\d+\s*\/\s*\d+/i.test(line))
          || pageLines.some((line) => /\b(?:\d+x\d+|\d+)m\s+(?:Apn[eé]e|Surface|Immersion|Bipalmes|SB)\s+-\s+(?:Seniors\s+)?(?:Femmes|Hommes|Mixte)/i.test(line));
        if (!hasStructuredFlow) {
          extractPdfLinesFromItems(items, 2.5).forEach(appendLine);
          extractPdfLinesFromItems(items, 7).forEach(appendLine);
        }
        const isSessionHeaderLine = (line) => /\bSession\s*\d+\b/i.test(line) || line.includes("Session du") || line.includes("Session de l");
        const sessionHeaderLines = pageLines.filter(isSessionHeaderLine);
        const bodyLines = pageLines.filter((line) => !isSessionHeaderLine(line));
        lines.push(...sessionHeaderLines, ...bodyLines);
      }
      return lines;
    } finally {
      await loading.destroy();
    }
  }
  
  function extractPdfLinesByFlow(items) {
    const lines = [];
    let current = [];
    items.forEach((item) => {
      if (item.str?.trim()) current.push(item);
      if (item.hasEOL && current.length) {
        lines.push(current);
        current = [];
      }
    });
    if (current.length) lines.push(current);
    return lines;
  }
  
  function extractPdfLinesFromItems(items, tolerance = 2.5) {
    const rows = [];
    items.filter(item => item.str?.trim())
      .sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4])
      .forEach((item) => {
        const y = item.transform[5];
        const row = rows.find((candidate) => Math.abs(candidate.y - y) <= tolerance);
        if (row) {
          row.items.push(item);
          row.y += (y - row.y) / row.items.length;
        } else {
          rows.push({ y, items: [item] });
        }
      });
    return rows.sort((a, b) => b.y - a.y)
      .map(row => row.items.sort((a, b) => a.transform[4] - b.transform[4]));
  }
  
  function parseImportedSeriesLines(lines, fileName = "séries importées.pdf") {
    const normalizedLines = [];
    lines.forEach((line) => {
      const clean = fixPdfEncoding(line).replace(/\s+/g, " ").trim();
      if (!clean) return;
      splitEmbeddedPdfLines(clean).forEach((part) => normalizedLines.push(part));
    });
    const entrants = [];
    const seriesRows = [];
    const program = [];
    const eventsById = new Map(data.events.map((event) => [event.id, event]));
    const seenProgram = new Set();
    const seenEntrants = new Set();
    const seenSeriesRows = new Set();
    const unparsedRows = [];
    let currentSession = { number: "", label: "" };
    let current = null;
    let pendingFinal = null;
    let activeFinalContext = null;
    let order = 0;
    const meet = parseImportedMeetMetadata(normalizedLines);
  
    const titlePattern = /^(.+?) - (?:(Minimes|Seniors|Masters)\s+)?(Femmes|Hommes)(?:(?: - Finale\(s\).*)|(?: M\s*eilleure s[eé]rie.*))?$/i;
    const finalTitlePattern = /^(.+?) - (?:(Minimes|Seniors|Masters)\s+)?(Femmes|Hommes|Mixte).*Finale.*?(?:Horaire indicatif : (\d{2}:\d{2}))?.*$/i;
    const finalHeatPattern = /^finale\s+([AB])\s+Horaire indicatif\s*:\s*(?:(\d{2}:\d{2})|non disponible)(?: \((\d+)\))?/i;
    const relayTitlePattern = /^(.+?) - (?:(Minimes|Seniors|Masters)\s+)?(Femmes|Hommes|Mixte)(?: M\s*eilleure s[eé]rie.*)?$/i;
    const heatPattern = /^s.{1,2}rie\s*:\s*(\d+)\s*\/\s*(\d+)\s+Horaire indicatif\s*:\s*(?:(\d{2}:\d{2})|non disponible)(?:\s+\((\d+)\))?/i;
    const participationCode = value => {
      if(!context.includeParticipationStatus)return "";
      const trailing=String(value||"").match(/(?:^|\s)((?:NS|IN|HC)(?:\s+(?:NS|IN|HC))*)$/i),codes=[...new Set(trailing?trailing[1].toUpperCase().split(/\s+/):[])];
      if(codes.length>1)throw new TypeError("Mentions de participation cumulées : contrôler NS, IN ou HC dans les séries.");
      return codes[0]||"";
    };
    const swimmerPattern = /^(\d+)\s+(.+?)\s*(\d{2})\s+([FH][A-Z0-9+]+)\s+(\S+)\s+([0-9:.]+)(?:\s+(IN|NS|HC))?$/i;
    const speakerPattern = /^(\d+)\s+(.+?)\s*(\d{2})\s+([FH][A-Z0-9+]+)\s+\*\s+(\S+)\s+([0-9:.]+)(.*)$/;
    const tolerantSpeakerPattern = /^(\d+)\s+(.+?)\s*(\d{2})\s+([FH][A-Z0-9+]+)\s+\*?\s*([A-Z0-9]+)\s+([0-9:.]+)(.*)$/;
    const forfaitLinePattern = /^(\d+)\s+(.+?)\s*(\d{2})\s+([FH][A-Z0-9+]+)\s+(\S+)\s+FORFAIT\s+([0-9:.]+)(.*)$/i;
    const groupedEventId = (eventId, categoryGroup = "") => /^minimes$/i.test(String(categoryGroup || "")) ? `${eventId}-mi` : eventId;
    const groupedEventInfo = (eventId, label, categoryGroup = "") => {
      const event = importedEventInfo(eventId, label);
      if (!/^minimes$/i.test(String(categoryGroup || ""))) return event;
      return {
        ...event,
        id: groupedEventId(eventId, categoryGroup),
        label: `${event.label} - Minimes`
      };
    };
  
    const updateSessionFromLabel = (label) => {
      const cleanLabel = fixPdfEncoding(label);
      const normalizedLabel = cleanLabel
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      const currentNumber = Number(currentSession.number || 0);
      let inferredNumber = "";
      if (/apres\s*-?\s*midi/.test(normalizedLabel) && currentNumber && currentNumber % 2 === 1) {
        inferredNumber = String(currentNumber + 1);
      } else if (normalizedLabel.includes("matin") && currentNumber && currentNumber % 2 === 0) {
        inferredNumber = String(currentNumber + 1);
      }
      currentSession = {
        ...currentSession,
        number: inferredNumber || currentSession.number,
        label: cleanLabel
      };
    };
  
    normalizedLines.forEach((rawLine) => {
      const line = rawLine.replace(/\s+/g, " ").trim();
      const hasSessionPeriod = /Session.*(?:matin|apr[eè]s|apr)/i.test(line);
      const sessionMatch = line.match(/\bSession\s*(\d+)\b/i);
      if (sessionMatch) {
        currentSession = { ...currentSession, number: sessionMatch[1] };
        if (hasSessionPeriod) updateSessionFromLabel(line);
        return;
      }
      if (line.includes("Session du") || line.includes("Session de l") || hasSessionPeriod) {
        updateSessionFromLabel(line);
        return;
      }
  
      const finalTitleMatch = line.match(finalTitlePattern);
      if (finalTitleMatch) {
        const [, rawLabel, categoryGroup, sexText, startTime] = finalTitleMatch;
        const label = fixPdfEncoding(rawLabel);
        const eventId = importedEventId(label);
        if (eventId) {
          const event = groupedEventInfo(eventId, label, categoryGroup);
          eventsById.set(event.id, event);
          pendingFinal = {
            eventId: event.id,
            sex: { Femmes: "F", Hommes: "M", Mixte: "X" }[sexText],
            baseLabel: event.label,
            startTime: startTime || ""
          };
          activeFinalContext = pendingFinal;
        }
        current = null;
        return;
      }
  
      const finalHeatMatch = line.match(finalHeatPattern);
      const finalContext = pendingFinal || activeFinalContext;
      if (finalHeatMatch && finalContext) {
        const [, letter, startTime, heatOrder] = finalHeatMatch;
        order += 1;
        const stage = `finale-${letter.toUpperCase()}`;
        program.push({
          eventId: finalContext.eventId,
          sex: finalContext.sex,
          order,
          label: `${finalContext.baseLabel} - Finale ${letter.toUpperCase()}`,
          session: currentSession.number,
          sessionLabel: currentSession.label,
          stage,
          startTime,
          hasEntrants: true
        });
        current = {
          eventId: finalContext.eventId,
          sex: finalContext.sex,
          series: letter.toUpperCase() === "A" ? 1 : 2,
          seriesCount: 1,
          heatOrder: Number(heatOrder || order),
          startTime,
          isRelay: isImportedRelayEvent(finalContext.eventId),
          session: currentSession.number,
          sessionLabel: currentSession.label,
          stage
        };
        pendingFinal = null;
        return;
      }
  
      const titleMatch = line.match(titlePattern) || line.match(relayTitlePattern);
      if (titleMatch) {
        pendingFinal = null;
        activeFinalContext = null;
        const [, rawLabel, categoryGroup, sexText] = titleMatch;
        const label = fixPdfEncoding(rawLabel);
        if (/Finale/i.test(line)) {
          current = null;
          return;
        }
        const eventId = importedEventId(label);
        if (!eventId) {
          current = null;
          return;
        }
        const event = groupedEventInfo(eventId, label, categoryGroup);
        eventsById.set(event.id, event);
        const sex = { Femmes: "F", Hommes: "M", Mixte: "X" }[sexText];
        const stage = /M\s*eilleure s[eé]rie/i.test(line) ? "meilleure-serie" : "series";
        const programKeyValue = `${event.id}|${sex}|${currentSession.number}|series`;
        if (!seenProgram.has(programKeyValue)) {
          order += 1;
          seenProgram.add(programKeyValue);
          program.push({
            eventId: event.id,
            sex,
            order,
            label: stage === "meilleure-serie" ? `${event.label} - Meilleure série` : event.label,
            session: currentSession.number,
            sessionLabel: currentSession.label,
            stage,
            hasEntrants: true
          });
        }
        current = {
          eventId: event.id,
          sex,
          series: null,
          seriesCount: null,
          heatOrder: null,
          startTime: "",
          isRelay: isImportedRelayEvent(event.id),
          session: currentSession.number,
          sessionLabel: currentSession.label,
          stage
        };
        return;
      }
  
      const heatMatch = line.match(heatPattern);
      if (heatMatch && current) {
        const [, number, total, startTime, heatOrder] = heatMatch;
        current = {
          ...current,
          series: Number(number),
          seriesCount: Number(total),
          startTime,
          heatOrder: Number(heatOrder || seriesRows.length + 1)
        };
        return;
      }
  
      if (!current?.series) return;
      let lane = "";
      let rawName = "";
      let birth = "";
      let catCode = "";
      let club = "";
      let seedTime = "";
      let fullClub = "";
      let relayMatch = null;
      if (current.isRelay) {
        relayMatch = line.match(/^(\d+)\s+(.+?)\s+(?:(?<cat>[FHX][A-Z0-9+]+)\s+)?(?:\*\s+)?(?<club>[A-Z0-9]+)\s+(?<time>[0-9:.]+)(?<full>.*)$/);
      }
      const swimmerMatch = line.match(swimmerPattern);
      const speakerMatch = line.match(speakerPattern) || line.match(tolerantSpeakerPattern);
      const forfaitMatch = line.match(forfaitLinePattern);
      let importedStatus = "";
      let nonSelectable = false;
      let participationStatus = "";
      let lastName = "";
      let firstName = "";
      let birthYear = "";
      let swimmerId = "";
      if (relayMatch) {
        lane = relayMatch[1];
        rawName = fixPdfEncoding(String(relayMatch[2] || "").trim());
        catCode = relayMatch.groups.cat || (current.sex === "X" ? "XSE" : (current.sex === "F" ? "FSE" : "HSE"));
        club = relayMatch.groups.club;
        seedTime = relayMatch.groups.time;
        fullClub = fixPdfEncoding(String(relayMatch.groups.full || "").trim() || rawName);
        participationStatus = participationCode(relayMatch.groups.full);
        lastName = rawName;
        swimmerId = `relay|${current.eventId}|${current.sex}|${club.toLowerCase()}|${lane}|${current.series}`;
      } else if (forfaitMatch || swimmerMatch || speakerMatch) {
        const match = forfaitMatch || swimmerMatch || speakerMatch;
        lane = match[1];
        rawName = fixPdfEncoding(match[2]);
        birth = match[3];
        catCode = match[4];
        club = match[5];
        seedTime = match[6];
        const trailingText = fixPdfEncoding(String(match[7] || "").trim());
        const trailingIsForfait = /\bFORFAIT\b/i.test(trailingText);
        const trailingIsNonSelectable = /\bNS\b/i.test(trailingText);
        participationStatus = participationCode(trailingText);
        const trailingClubText = trailingText.replace(/\b(FORFAIT|NS|IN|HC)\b/gi, "").replace(/\s+/g, " ").trim();
        importedStatus = forfaitMatch || trailingIsForfait ? "forfait" : "";
        nonSelectable = trailingIsNonSelectable;
        fullClub = (speakerMatch || forfaitMatch) && trailingClubText ? trailingClubText : club;
        const split = splitImportedPersonName(rawName);
        lastName = split.lastName;
        firstName = split.firstName;
        birthYear = importedBirthYear(birth);
        swimmerId = `${lastName.toLowerCase()}|${firstName.toLowerCase()}|${birthYear}|${current.sex}`;
      } else {
        if(context.includeUnparsedSeriesRows && /^\d{1,2}\s+\S/.test(line))unparsedRows.push({...current,lane:Number(line.match(/^\d+/)[0]),rawSource:line});
        return;
      }
  
      seedTime = importedSeriesTime(seedTime);
      const entrantKeyValue = `${current.eventId}|${current.sex}|${current.session}|${swimmerId}`;
      if (!seenEntrants.has(entrantKeyValue)) {
        seenEntrants.add(entrantKeyValue);
        entrants.push({
          eventId: current.eventId,
          sex: current.sex,
          lane: Number(lane),
          lastName,
          firstName,
          birthDate: birthYear,
          swimmerId,
          club: fullClub,
          clubCode: club,
          category: importedCategoryLabel(catCode),
          categoryCode: catCode,
          ...(context.includeCategoryProvenance?{categoryInferred:Boolean(relayMatch && !relayMatch.groups.cat)}:{}),
          seedTime,
          seedSource: "",
          importedStatus,
          nonSelectable,
          ...(context.includeParticipationStatus?{participationStatus}:{}),
          session: current.session,
          sessionLabel: current.sessionLabel,
          note: ""
        });
      }
      const seriesKeyValue = [
        current.eventId,
        current.sex,
        current.session,
        current.stage,
        current.series,
        lane,
        swimmerId
      ].join("|");
      if (!seenSeriesRows.has(seriesKeyValue)) {
        seenSeriesRows.add(seriesKeyValue);
        seriesRows.push({
          eventId: current.eventId,
          sex: current.sex,
          swimmerId,
          series: current.series,
          seriesCount: current.seriesCount,
          line: Number(lane),
          startTime: current.startTime,
          heatOrder: current.heatOrder,
          importedStatus,
          nonSelectable,
          ...(context.includeParticipationStatus?{participationStatus}:{}),
          session: current.session,
          sessionLabel: current.sessionLabel,
          stage: current.stage
        });
      }
    });
  
    return {
      meet,
      events: [...eventsById.values()],
      entrants,
      series: seriesRows,
      program,
      sourceFile: fileName,
      debugLines: normalizedLines.slice(0, 80),
      ...(context.includeUnparsedSeriesRows?{unparsedRows}:{})
    };
  }
  
  const withContext = (nextContext, callback) => {
    useContext(nextContext);
    return callback();
  };

  window.LivePalmesSeriesImport = {
    extractPdfLines: (file, options = {}) => withContext(options, () => extractPdfLines(file)),
    parseImportedSeriesLines: (lines, fileName, options = {}) => withContext(options, () => parseImportedSeriesLines(lines, fileName)),
    showPdfImportDebug: (parsed, lines, options = {}) => withContext(options, () => showPdfImportDebug(parsed, lines)),
    prepareImportedSeriesForMode: (parsed, mode, forcedSession, options = {}) => withContext(options, () => prepareImportedSeriesForMode(parsed, mode, forcedSession)),
    seedSourceLookupKeys: (row, options = {}) => withContext(options, () => seedSourceLookupKeys(row)),
    inheritImportedSeedSources: (parsed, options = {}) => withContext(options, () => inheritImportedSeedSources(parsed)),
    mergeImportedSeriesData: (parsed, mode, options = {}) => withContext(options, () => mergeImportedSeriesData(parsed, mode))
  };
}());
