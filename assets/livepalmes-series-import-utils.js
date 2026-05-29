(function attachLivePalmesSeriesImportUtils(global) {
  function create(options = {}) {
    const {
      availableSexesForEvent = () => [],
      data = { events: [], entrants: [], series: [], program: [] },
      fixPdfEncoding = (value) => String(value || ""),
      formatName = (row) => [row?.lastName, row?.firstName].filter(Boolean).join(" "),
      normalizePersonName = (value) => String(value || "").trim().toLowerCase(),
      sampleData = { entrants: [] },
      seedSourceTimeKey = (value) => String(value || "").trim().replace(",", ".").replace(/^00:/, "")
    } = options;

    function parseImportedMeetMetadata(lines) {
      const cleanMeetTitle = (value) => fixPdfEncoding(value)
        .replace(/^FFESSM\b\s*/i, "")
        .replace(/\s*\bFFESSM\b\s*$/i, "")
        .replace(/\s+/g, " ")
        .trim();
      const firstUseful = lines.find((line) => /^FFESSM\s+/i.test(line)) ||
        lines.find((line) => /\b(?:championnat|meeting|coupe|open)\b/i.test(line) && !/\b(?:liste|session|série|finale|horaire)\b/i.test(line)) ||
        "";
      const secondUseful = lines.find((line) => /\b20\d{2}\b/.test(line) && !/^FFESSM\s*$/i.test(line)) || "";
      let name = "";
      let city = "";
      let year = "";
      if (firstUseful) {
        const cleaned = cleanMeetTitle(firstUseful);
        const match = cleaned.match(/(.+?)\s+CNNP\s*([A-Za-zÀ-ÖØ-öø-ÿ' -]+)?/i);
        if (match) {
          name = cleanMeetTitle(match[1]);
          city = (match[2] || "").trim();
        } else {
          name = cleanMeetTitle(cleaned.replace(/\s+CNNP.*$/i, ""));
        }
      }
      const combined = `${firstUseful} ${secondUseful}`;
      const yearMatch = combined.match(/\b(20\d{2})\b/);
      if (yearMatch) year = yearMatch[1];
      if (!city && secondUseful) {
        city = cleanMeetTitle(secondUseful.split(/\s+-\s+/)[0].replace(/\b20\d{2}\b.*$/, ""));
      }
      return {
        name: name || "Séries importées",
        city,
        year
      };
    }

    function splitEmbeddedPdfLines(line) {
      const parts = [];
      const markers = [
        /\bs.{1,2}rie\s*:\s*\d+\s*\/\s*\d+\s+Horaire indicatif/i,
        /\bfinale\s+[AB]\s+Horaire indicatif/i,
        /\b(?:\d+x\d+|\d+)m\s+(?:Apn[eé]e|Surface|Immersion|Bipalmes|SB)\s+-\s+(?:Seniors\s+)?(?:Femmes|Hommes|Mixte)/i
      ];
      const queue = [line];
      while (queue.length) {
        const currentLine = String(queue.shift() || "").trim();
        if (!currentLine) continue;
        let splitIndex = -1;
        for (const marker of markers) {
          const match = marker.exec(currentLine);
          if (match && match.index > 0) {
            splitIndex = match.index;
            break;
          }
        }
        if (splitIndex > 0) {
          const after = currentLine.slice(splitIndex).trim();
          const before = currentLine.slice(0, splitIndex).trim();
          if (after) queue.unshift(after);
          if (before) queue.unshift(before);
        } else {
          parts.push(currentLine);
        }
      }
      return parts;
    }

    function applyImportedSessionOverride(parsed, sessionNumber) {
      const cleanSession = String(sessionNumber || "").trim();
      if (!cleanSession) return parsed;
      const existingLabel = [...parsed.program, ...parsed.series, ...parsed.entrants]
        .map((row) => row.sessionLabel)
        .find(Boolean) || `Session ${cleanSession}`;
      const forceRows = (rows) => rows.map((row) => ({
        ...row,
        session: cleanSession,
        sessionLabel: existingLabel
      }));
      return {
        ...parsed,
        entrants: forceRows(parsed.entrants || []),
        series: forceRows(parsed.series || []),
        program: forceRows(parsed.program || [])
      };
    }

    function parsedSessionNumbers(parsed) {
      return [...new Set([
        ...((parsed.entrants || []).map((row) => row.session).filter(Boolean)),
        ...((parsed.series || []).map((row) => row.session).filter(Boolean)),
        ...((parsed.program || []).map((row) => row.session).filter(Boolean))
      ])].sort((a, b) => Number(a) - Number(b));
    }

    function filterImportedSession(parsed, sessionNumber) {
      const cleanSession = String(sessionNumber || "").trim();
      if (!cleanSession) return parsed;
      const keepRows = (rows) => (rows || []).filter((row) => String(row.session || "") === cleanSession);
      const entrants = keepRows(parsed.entrants);
      const series = keepRows(parsed.series);
      const program = keepRows(parsed.program);
      if (!entrants.length && !series.length && !program.length) return null;
      const eventIds = new Set([
        ...entrants.map((row) => row.eventId),
        ...series.map((row) => row.eventId),
        ...program.map((row) => row.eventId)
      ].filter(Boolean));
      return {
        ...parsed,
        entrants,
        series,
        program,
        events: (parsed.events || []).filter((event) => eventIds.has(event.id))
      };
    }

    function prepareImportedSeriesForMode(parsed, mode, forcedSession) {
      const cleanSession = String(forcedSession || "").trim();
      if (mode !== "session" || !cleanSession) return parsed;
      const sessions = parsedSessionNumbers(parsed);
      if (sessions.length > 1) {
        const filtered = filterImportedSession(parsed, cleanSession);
        if (filtered) return filtered;
      }
      return applyImportedSessionOverride(parsed, cleanSession);
    }

    function seedSourceLookupKeys(row) {
      const eventId = row.eventId || "";
      const sex = row.sex || "";
      const seedTime = seedSourceTimeKey(row.seedTime || "");
      const swimmerId = row.swimmerId || "";
      const name = normalizePersonName(formatName(row));
      return [
        `${eventId}|${sex}|${swimmerId}|${seedTime}`,
        `${eventId}|${sex}|${name}|${seedTime}`
      ].filter((key) => !key.includes("undefined"));
    }

    function inheritImportedSeedSources(parsed) {
      const sourceByKey = new Map();
      [...(sampleData.entrants || []), ...(data.entrants || [])].forEach((row) => {
        if (!row.seedSource) return;
        seedSourceLookupKeys(row).forEach((key) => {
          if (!sourceByKey.has(key)) sourceByKey.set(key, row.seedSource);
        });
      });
      return {
        ...parsed,
        entrants: (parsed.entrants || []).map((row) => {
          if (row.seedSource) return row;
          const inheritedSource = seedSourceLookupKeys(row)
            .map((key) => sourceByKey.get(key))
            .find(Boolean);
          return inheritedSource ? { ...row, seedSource: inheritedSource } : row;
        })
      };
    }

    function mergeImportedSeriesData(parsed, mode = "session") {
      if (mode === "full") {
        return {
          events: parsed.events,
          entrants: parsed.entrants,
          series: parsed.series,
          program: parsed.program
        };
      }
      const sessions = [...new Set([
        ...parsed.entrants.map((row) => row.session).filter(Boolean),
        ...parsed.series.map((row) => row.session).filter(Boolean),
        ...parsed.program.map((row) => row.session).filter(Boolean)
      ])];
      const sessionSet = new Set(sessions);
      if (!sessionSet.size) {
        return {
          events: parsed.events,
          entrants: parsed.entrants,
          series: parsed.series,
          program: parsed.program
        };
      }
      const importedEventIds = new Set(parsed.events.map((event) => event.id));
      const eventMap = new Map(data.events.map((event) => [event.id, event]));
      parsed.events.forEach((event) => eventMap.set(event.id, event));
      return {
        events: [...eventMap.values()].filter((event) => importedEventIds.has(event.id) || availableSexesForEvent(event.id).length),
        entrants: [
          ...data.entrants.filter((row) => !sessionSet.has(row.session || "")),
          ...parsed.entrants
        ],
        series: [
          ...data.series.filter((row) => !sessionSet.has(row.session || "")),
          ...parsed.series
        ],
        program: [
          ...data.program.filter((row) => !sessionSet.has(row.session || "")),
          ...parsed.program
        ].sort((a, b) => Number(a.session || 0) - Number(b.session || 0) || Number(a.order || 9999) - Number(b.order || 9999))
      };
    }

    return {
      applyImportedSessionOverride,
      filterImportedSession,
      inheritImportedSeedSources,
      mergeImportedSeriesData,
      parseImportedMeetMetadata,
      parsedSessionNumbers,
      prepareImportedSeriesForMode,
      seedSourceLookupKeys,
      splitEmbeddedPdfLines
    };
  }

  global.LivePalmesSeriesImportUtils = { create };
})(window);
