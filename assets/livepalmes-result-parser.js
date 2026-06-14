(function attachLivePalmesResultParser(global) {
  function dependencies(options = {}) {
    return {
      fixPdfEncoding: typeof options.fixPdfEncoding === "function" ? options.fixPdfEncoding : ((value) => String(value || "")),
      finalistRowName: typeof options.finalistRowName === "function" ? options.finalistRowName : ((row) => row?.displayName || row?.name || [row?.lastName, row?.firstName].filter(Boolean).join(" ")),
      formatDisplayName: typeof options.formatDisplayName === "function" ? options.formatDisplayName : ((row) => [row.lastName, row.firstName].filter(Boolean).join(" ")),
      importedBirthYear: typeof options.importedBirthYear === "function" ? options.importedBirthYear : ((value) => String(value || "")),
      importedSeriesTime: typeof options.importedSeriesTime === "function" ? options.importedSeriesTime : ((value) => String(value || "").trim()),
      isFinalStage: typeof options.isFinalStage === "function" ? options.isFinalStage : ((stage) => String(stage || "").toLowerCase().includes("finale")),
      normalizePersonName: typeof options.normalizePersonName === "function" ? options.normalizePersonName : ((value) => String(value || "").trim().toLowerCase()),
      splitImportedPersonName: typeof options.splitImportedPersonName === "function" ? options.splitImportedPersonName : ((value) => ({
        firstName: "",
        lastName: String(value || "").trim()
      }))
    };
  }

  function normalizeResultLineText(line, options = {}) {
    const deps = dependencies(options);
    return deps.fixPdfEncoding(String(line || ""))
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^\s*(IN|NS)\s+(\d+)\s+/i, "$2 ");
  }

  function resultTimeFromMatch(match, options = {}) {
    const deps = dependencies(options);
    const time = match.groups?.time || "";
    const splitTimes = String(match.groups?.splitTimes || "").trim().split(/\s+/).filter(Boolean);
    if (!match.groups?.finalMarker && /^\d+$/.test(time) && splitTimes.length) {
      return deps.importedSeriesTime(splitTimes.at(-1)) || splitTimes.at(-1) || "";
    }
    return deps.importedSeriesTime(time) || time || "";
  }

  function resultPointsFromTail(value) {
    const tokens = String(value || "").trim().split(/\s+/).filter(Boolean);
    const points = [...tokens].reverse().find((token) => /^\d{1,4}$/.test(token));
    return points || "";
  }

  function resultPointsFromMatch(match) {
    const time = String(match.groups?.time || "").trim();
    const splitTimes = String(match.groups?.splitTimes || "").trim().split(/\s+/).filter(Boolean);
    if (!match.groups?.finalMarker && /^\d{1,4}$/.test(time) && splitTimes.length) return time;
    return resultPointsFromTail(match.groups?.tail);
  }

  function parsedIdentity(rawName, birthYear, options = {}) {
    const deps = dependencies(options);
    const split = deps.splitImportedPersonName(deps.fixPdfEncoding(rawName));
    return {
      lastName: split.lastName,
      firstName: split.firstName,
      displayName: deps.formatDisplayName({ lastName: split.lastName, firstName: split.firstName }),
      birthYear: deps.importedBirthYear(birthYear)
    };
  }

  function parseResultRow(line, options = {}) {
    const text = normalizeResultLineText(line, options);
    const match = text.match(/^\s*(\d+)\s+(.+?)\s+(\d{2})\s+(?:(?<category>[A-Z][A-Z0-9+]{1,5})\s+\*\s+)?(?<club>[A-Z0-9]+)\s+(?:(?<splitTimes>(?:[0-9:.]+\s+)*))(?<finalMarker>\(.*?finale.*?\)\s+)?(?<time>[0-9:.]+)(?<tail>(?:\s+(?:\d+|[A-Z0-9]+))*)\s*$/i);
    if (!match) return null;
    const identity = parsedIdentity(match[2], match[3], options);
    return {
      rank: Number(match[1]),
      ...identity,
      categoryCode: match.groups?.category || "",
      club: match.groups?.club || match[4],
      time: resultTimeFromMatch(match, options),
      points: resultPointsFromMatch(match),
      qualified: Boolean(match.groups?.finalMarker)
    };
  }

  function parseUnrankedResultRow(line, options = {}) {
    const text = normalizeResultLineText(line, options);
    const match = text.match(/^\s*(.+?)\s+(\d{2})\s+(?:(?<category>[A-Z][A-Z0-9+]{1,5})\s+\*\s+)?(?<club>[A-Z0-9]+)\s+(?:(?<splitTimes>(?:[0-9:.]+\s+)*))(?<time>[0-9:.]+)(?<tail>(?:\s+(?:\d+|[A-Z0-9]+))*)\s*$/i);
    if (!match || !match.groups?.splitTimes?.trim()) return null;
    const identity = parsedIdentity(match[1], match[2], options);
    return {
      rank: "",
      ...identity,
      categoryCode: match.groups?.category || "",
      club: match.groups?.club || match[4],
      time: resultTimeFromMatch(match, options),
      points: resultPointsFromMatch(match),
      qualified: false
    };
  }

  function relayResultIdentity(rawName, club = "", options = {}) {
    const deps = dependencies(options);
    const displayName = deps.fixPdfEncoding(rawName)
      .replace(/\s+/g, " ")
      .trim();
    return {
      lastName: displayName,
      firstName: "",
      displayName,
      birthYear: "",
      club: club || displayName
    };
  }

  const RELAY_CATEGORY_CODE_PATTERN = "(?:[FHX](?:MI|CA|JU|SE|MA|M\\d{2}\\+?|\\d{2,3}\\+?)|SEN|JUN|CAD|MIN|MI|CA|JU|SE|MA|R\\d{3}|\\d{2,3}\\+?)";

  function relayCategoryFromCode(code) {
    const clean = String(code || "").trim().toUpperCase();
    if (!clean) return { categoryCode: "", category: "", categoryLabel: "" };
    let category = "";
    if (clean.includes("MI") || clean === "MIN") category = "Minime";
    else if (clean.includes("CA") || clean === "CAD") category = "Cadet";
    else if (clean.includes("JU") || clean === "JUN") category = "Junior";
    else if (clean.includes("SE") || clean === "SEN") category = "Senior";
    else if (clean.includes("MA")) category = "Masters";
    else if (/^R\d{3}$/.test(clean)) category = clean;
    else if (/^\d{2,3}\+?$/.test(clean)) category = clean.endsWith("+") ? clean : `${clean}+`;
    const sex = clean.startsWith("X") ? "Mixte" : (clean.startsWith("F") ? "Femmes" : (clean.startsWith("H") ? "Hommes" : ""));
    return {
      categoryCode: clean,
      category,
      categoryLabel: [category, sex].filter(Boolean).join(" ")
    };
  }

  function compactRelayLegName(rawName, options = {}) {
    const deps = dependencies(options);
    const split = deps.splitImportedPersonName(deps.fixPdfEncoding(rawName));
    const lastName = String(split.lastName || "").trim();
    const firstInitial = String(split.firstName || "").trim().charAt(0).toUpperCase();
    return [lastName, firstInitial ? `${firstInitial}.` : ""].filter(Boolean).join(" ");
  }

  function parseRelayLegRow(line, options = {}) {
    const text = normalizeResultLineText(line, options);
    const match = text.match(/^\s*(?<name>.+?)\s+(?<birthYear>\d{2})\s+(?<category>[FHX][A-Z0-9+]{1,5})\s+(?:\[(?<splitTime>[0-9:.]+)\]|(?<firstLegTime>[0-9:.]+))(?:\s+(?<cumulativeTime>[0-9:.]+))?\s*$/i);
    if (!match) return null;
    const legTime = match.groups?.splitTime || match.groups?.firstLegTime || "";
    return {
      name: compactRelayLegName(match.groups?.name || "", options),
      time: dependencies(options).importedSeriesTime(legTime) || legTime,
      cumulativeTime: dependencies(options).importedSeriesTime(match.groups?.cumulativeTime || "") || match.groups?.cumulativeTime || "",
      birthYear: dependencies(options).importedBirthYear(match.groups?.birthYear || ""),
      categoryCode: match.groups?.category || ""
    };
  }

  function parseRelayResultRow(line, options = {}) {
    const text = normalizeResultLineText(line, options);
    const match = text.match(new RegExp("^\\s*(?<rank>\\d+)\\s+(?<name>.+?)\\s+(?:(?<categoryStar>[A-Z][A-Z0-9+]{1,5})\\s+\\*\\s+|(?<categoryPlain>" + RELAY_CATEGORY_CODE_PATTERN + ")\\s+)?(?<club>[A-Z0-9]{2,})\\s+(?:(?<splitTimes>(?:[0-9:.]+\\s+)*))(?<time>[0-9:.]+)(?<tail>(?:\\s+(?:\\d+|[A-Z0-9]+))*)\\s*$"));
    if (!match) return null;
    const name = String(match.groups?.name || "").trim();
    if (!name || /\b\d{2}\b/.test(name)) return null;
    const identity = relayResultIdentity(name, match.groups?.club || "", options);
    const category = relayCategoryFromCode(match.groups?.categoryStar || match.groups?.categoryPlain || "");
    return {
      rank: Number(match.groups?.rank || 0),
      ...identity,
      categoryCode: category.categoryCode,
      category: category.category,
      categoryLabel: category.categoryLabel,
      time: resultTimeFromMatch(match, options),
      points: resultPointsFromMatch(match),
      qualified: false,
      relay: true
    };
  }

  function resultStatusFromText(value) {
    const text = String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    if (/\b(dns|absent|abs)\b/.test(text)) return "dns";
    if (/\b(abandon|abd|ab|dnf)\b/.test(text)) return "ab";
    if (/\b(disqualification|disqualifie|disqualifiee|dsq|dq)\b/.test(text)) return "dsq";
    if (/\b(forfait)\b/.test(text)) return "dns";
    return "";
  }

  function parseResultStatusRow(line, options = {}) {
    const text = normalizeResultLineText(line, options);
    const status = resultStatusFromText(text);
    if (!status) return null;
    const match = text.match(/^\s*(?:(\d+)\s+)?(.+?)\s+(\d{2})\s+(?:(?<category>[A-Z][A-Z0-9+]{1,5})\s+\*\s+)?(?<club>[A-Z0-9]+)\s+(.+?)\s*$/i);
    if (!match) return null;
    const identity = parsedIdentity(match[2], match[3], options);
    return {
      rank: match[1] ? Number(match[1]) : "",
      ...identity,
      categoryCode: match.groups?.category || "",
      club: match.groups?.club || match[4],
      time: "",
      resultStatus: status,
      statusLabel: {
        dns: "Forfait",
        ab: "ABD",
        dsq: "DSQ"
      }[status],
      qualified: false
    };
  }

  function parseRelayResultStatusRow(line, options = {}) {
    const text = normalizeResultLineText(line, options);
    const status = resultStatusFromText(text);
    if (!status) return null;
    const match = text.match(new RegExp("^\\s*(?:(?<rank>\\d+)\\s+)?(?<name>.+?)\\s+(?:(?<categoryStar>[A-Z][A-Z0-9+]{1,5})\\s+\\*\\s+|(?<categoryPlain>" + RELAY_CATEGORY_CODE_PATTERN + ")\\s+)?(?<club>[A-Z0-9]{2,})\\s+(.+?)\\s*$"));
    if (!match) return null;
    const name = String(match.groups?.name || "").trim();
    if (!name || /\b\d{2}\b/.test(name)) return null;
    const identity = relayResultIdentity(name, match.groups?.club || "", options);
    const category = relayCategoryFromCode(match.groups?.categoryStar || match.groups?.categoryPlain || "");
    return {
      rank: match.groups?.rank ? Number(match.groups.rank) : "",
      ...identity,
      categoryCode: category.categoryCode,
      category: category.category,
      categoryLabel: category.categoryLabel,
      time: "",
      resultStatus: status,
      statusLabel: {
        dns: "Forfait",
        ab: "ABD",
        dsq: "DSQ"
      }[status],
      qualified: false,
      relay: true
    };
  }

  function resultCategoryFromHeader(line, options = {}) {
    const text = normalizeResultLineText(line, options);
    const match = text.match(/^\s*(?:\d+x\d+|\d{2,4})\s*m?\s+.+?\s+(?:(Masters?)\s+)?(R\s*\d{3}|(?:\d{2,3}\+)|Minimes?|Cadets?|Cadettes?|Juniors?|Seniors?|Masters?)\s+(Femmes|Hommes|Mixte)\s*$/i);
    if (!match) return null;
    const [, masterLabel = "", rawCategory = "", rawSex = ""] = match;
    const sex = /^hommes$/i.test(rawSex) ? "M" : (/^femmes$/i.test(rawSex) ? "F" : "X");
    const cleanCategory = String(rawCategory || "").trim().replace(/^R\s+(\d{3})$/i, "R$1");
    let category = cleanCategory;
    if (/^R\d{3}$/i.test(cleanCategory)) category = cleanCategory.toUpperCase();
    else if (/^\d{2,3}\+$/i.test(cleanCategory)) {
      const prefix = sex === "F" ? "F" : (sex === "M" ? "H" : "X");
      category = `${prefix}${cleanCategory}`;
    } else if (/^minimes?$/i.test(cleanCategory)) category = "Minime";
    else if (/^cadettes?$/i.test(cleanCategory) || /^cadets?$/i.test(cleanCategory)) category = "Cadet";
    else if (/^juniors?$/i.test(cleanCategory)) category = "Junior";
    else if (/^seniors?$/i.test(cleanCategory)) category = "Senior";
    else if (/^masters?$/i.test(cleanCategory) || masterLabel) category = "Masters";
    return {
      category,
      categoryLabel: category,
      sex,
      sectionTitle: text
    };
  }

  function resultImportRowKey(row) {
    return [
      row.rank || "",
      row.lastName || "",
      row.firstName || "",
      row.birthYear || "",
      row.club || "",
      row.time || "",
      row.resultStatus || ""
    ].map((value) => String(value).trim().toLowerCase()).join("|");
  }

  function parseFinalistsFromResultLines(lines, options = {}) {
    const seen = new Set();
    let categoryContext = null;
    let lastRelayRow = null;
    const parsedRows = [];
    lines.forEach((line, sourceIndex) => {
        const nextCategory = resultCategoryFromHeader(line, options);
        if (nextCategory) {
          categoryContext = nextCategory;
          lastRelayRow = null;
          return;
        }
        const relayLeg = lastRelayRow ? parseRelayLegRow(line, options) : null;
        if (relayLeg) {
          lastRelayRow.relayLegs = [...(lastRelayRow.relayLegs || []), { ...relayLeg, order: lastRelayRow.relayLegs?.length + 1 || 1 }];
          return;
        }
        const row = parseResultRow(line, options) || parseUnrankedResultRow(line, options) || parseResultStatusRow(line, options) || parseRelayResultRow(line, options) || parseRelayResultStatusRow(line, options);
        if (!row) {
          lastRelayRow = null;
          return;
        }
        const masterRelayContext = row.relay && /^R\d{3}$/i.test(String(categoryContext?.category || ""));
        const parsedRow = {
          ...row,
          categoryCode: masterRelayContext ? categoryContext.category : (row.categoryCode || ""),
          category: masterRelayContext ? categoryContext.category : (row.category || categoryContext?.category || ""),
          categoryLabel: masterRelayContext ? categoryContext.categoryLabel : (row.categoryLabel || categoryContext?.categoryLabel || ""),
          sectionCategory: categoryContext?.category || "",
          sectionCategoryLabel: categoryContext?.categoryLabel || "",
          sectionTitle: categoryContext?.sectionTitle || "",
          sourceIndex
        };
        parsedRows.push(parsedRow);
        lastRelayRow = parsedRow.relay ? parsedRow : null;
      });
    const ranking = parsedRows
      .filter(Boolean)
      .filter((row) => {
        const key = resultImportRowKey(row);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => {
        if (a.category || b.category) {
          return Number(a.sourceIndex || 0) - Number(b.sourceIndex || 0);
        }
        if (Number.isFinite(a.sourceIndex) && Number.isFinite(b.sourceIndex) && (a.resultStatus || b.resultStatus || !a.rank || !b.rank)) {
          return Number(a.sourceIndex || 0) - Number(b.sourceIndex || 0);
        }
        const statusA = a.resultStatus ? 1 : 0;
        const statusB = b.resultStatus ? 1 : 0;
        return statusA - statusB ||
          Number(a.rank || 9999) - Number(b.rank || 9999) ||
          Number(a.sourceIndex || 0) - Number(b.sourceIndex || 0);
      });
    const qualified = ranking.filter((row) => row.qualified);
    return {
      ranking,
      finalists: {
        a: qualified.slice(0, 8),
        b: qualified.slice(8, 16)
      },
      nextUnqualified: ranking.filter((row) => !row.qualified)
    };
  }

  function emptyParsedFinals() {
    return { ranking: [], finalists: { a: [], b: [] }, nextUnqualified: [] };
  }

  function shouldPreserveFinalistsOnReread(existingResult) {
    return Boolean(existingResult?.hasFinal && (
      existingResult.finalistsAnnouncedAt ||
      existingResult.finalWithdrawals?.length ||
      existingResult.finalPreWithdrawals?.length ||
      ["a", "b"].some((key) => (existingResult.finalists?.[key] || []).some((finalist) => finalist.withdrawnAt || finalist.repechaged))
    ));
  }

  function finalRowCountsAsFinalist(row) {
    if (!row || row.withdrawnAt || row.resultStatus) return false;
    const statusText = [row.statusLabel, row.status, row.motif, row.note].filter(Boolean).join(" ");
    return !resultStatusFromText(statusText);
  }

  function finalRowsCount(finalists = {}) {
    return ["a", "b"].reduce((count, key) => count + (finalists[key] || []).filter(finalRowCountsAsFinalist).length, 0);
  }

  function finalRowKey(row, options = {}) {
    const deps = dependencies(options);
    return String(row?.rowKey || [row?.rank, row?.displayName || deps.finalistRowName(row), row?.time].filter(Boolean).join("|"));
  }

  function finalRowOrderValue(row, fallback = 9999) {
    const rank = Number(row?.rank);
    if (Number.isFinite(rank) && rank > 0) return rank;
    const sourceIndex = Number(row?.sourceIndex);
    if (Number.isFinite(sourceIndex)) return 10000 + sourceIndex;
    return fallback;
  }

  function sortedFinalRows(rows = []) {
    return rows
      .map((row, index) => ({ row, index }))
      .sort((a, b) =>
        finalRowOrderValue(a.row, 20000 + a.index) - finalRowOrderValue(b.row, 20000 + b.index) ||
        a.index - b.index
      )
      .map((item) => item.row);
  }

  function normalizeFinalistsOrder(finalists = {}) {
    return {
      a: sortedFinalRows(finalists.a || []),
      b: sortedFinalRows(finalists.b || [])
    };
  }

  function resolveParsedFinals(parsedRows, existingResult, options = {}) {
    const preserveFinalists = Boolean(options.preserveFinalists && existingResult?.hasFinal);
    const hasFinal = Boolean(options.hasFinal || preserveFinalists);
    if (preserveFinalists) {
      const rebuildFinalistsFromParsedResult = options.rebuildFinalistsFromParsedResult;
      const preservedFinalState = typeof rebuildFinalistsFromParsedResult === "function"
        ? rebuildFinalistsFromParsedResult(parsedRows, existingResult, options.now || new Date().toISOString())
        : {
          finalists: existingResult?.finalists || { a: [], b: [] },
          nextUnqualified: existingResult?.nextUnqualified || [],
          finalWithdrawals: existingResult?.finalWithdrawals || []
        };
      return {
        hasFinal: true,
        parsedFinals: {
          ranking: parsedRows?.ranking?.length ? parsedRows.ranking : (existingResult?.ranking || []),
          finalists: preservedFinalState.finalists,
          nextUnqualified: preservedFinalState.nextUnqualified
        },
        preservedFinalState
      };
    }
    if (hasFinal) {
      return {
        hasFinal,
        parsedFinals: parsedRows || emptyParsedFinals(),
        preservedFinalState: null
      };
    }
    return {
      hasFinal,
      parsedFinals: parsedRows || emptyParsedFinals(),
      preservedFinalState: null
    };
  }

  function buildPublishedResult(input = {}) {
    const {
      event = {},
      existingResult = null,
      file = {},
      hasFinal = false,
      isPartial = false,
      now = new Date().toISOString(),
      parsedFinals = emptyParsedFinals(),
      preserveFinalists = false,
      preservedFinalState = null,
      row = {},
      values = {}
    } = input;
    const result = {
      id: values.id || "",
      raceKey: values.raceKey || "",
      programKey: values.programKey || "",
      eventId: row.eventId || "",
      eventLabel: event.label || row.label || row.eventId || "",
      sex: row.sex || "",
      sexLabel: values.sexLabel || "",
      stage: values.stage || "series",
      phaseLabel: values.phaseLabel || "",
      finalStageCount: row.finalStageCount || 0,
      session: row.session || "",
      startTime: row.startTime || "",
      hasFinal,
      finalists: parsedFinals.finalists || { a: [], b: [] },
      nextUnqualified: parsedFinals.nextUnqualified || [],
      ranking: parsedFinals.ranking || [],
      pdfName: file.name || "",
      pdfSize: file.size || 0,
      createdAt: existingResult?.createdAt || now,
      updatedAt: now,
      isPartial: Boolean(isPartial),
      status: preserveFinalists ? (existingResult?.status || "published") : (hasFinal ? "finalists_pending_speaker" : "published")
    };
    if (preserveFinalists) {
      result.finalistsAnnouncedAt = existingResult?.finalistsAnnouncedAt || "";
      result.finalWithdrawals = preservedFinalState?.finalWithdrawals || existingResult?.finalWithdrawals || [];
      result.finalPreWithdrawals = existingResult?.finalPreWithdrawals || [];
    }
    return result;
  }

  function performanceStageForResultRow(item, result, row, rowIndex = 0, options = {}) {
    const deps = dependencies(options);
    if (!deps.isFinalStage(result?.stage)) return {
      stage: result?.stage,
      phaseLabel: result?.phaseLabel
    };
    const rank = Number(item?.rank || 0);
    const stage = String(row?.stage || result?.stage || "").toLowerCase();
    if (/finale[-\s]?b\b/.test(stage)) return { stage: "finale-b", phaseLabel: "Finale B" };
    if (/finale[-\s]?a\b/.test(stage)) return { stage: "finale-a", phaseLabel: "Finale A" };
    if (Number(row?.finalStageCount || 0) > 1 && rank >= 9 && rank <= 16) {
      return { stage: "finale-b", phaseLabel: "Finale B" };
    }
    if (rank >= 1 && rank <= 8) {
      return { stage: "finale-a", phaseLabel: "Finale A" };
    }
    if (Number(row?.finalStageCount || 0) > 1 || String(result?.stage || "").toLowerCase().startsWith("finales")) {
      return Number(rowIndex) < 8
        ? { stage: "finale-a", phaseLabel: "Finale A" }
        : { stage: "finale-b", phaseLabel: "Finale B" };
    }
    return null;
  }

  function resultPerformanceDuplicateKey(item, options = {}) {
    const deps = dependencies(options);
    return [
      item?.eventId || "",
      item?.sex || "",
      item?.stage || "",
      item?.phaseLabel || "",
      deps.normalizePersonName([item?.lastName, item?.firstName].filter(Boolean).join(" ") || item?.displayName || ""),
      String(item?.birthYear || "").trim(),
      deps.normalizePersonName(item?.club || ""),
      String(item?.time || "").trim(),
      String(item?.points || "").trim(),
      String(item?.status || "").trim(),
      String(item?.statusLabel || "").trim()
    ].join("|");
  }

  function resultPerformanceRows(parsedRows, result, row, options = {}) {
    if (/^4x/i.test(String(row?.eventId || ""))) return [];
    const seen = new Set();
    return (parsedRows || [])
      .filter((item) => item.lastName || item.firstName || item.displayName)
      .map((item, rowIndex) => {
        const phase = performanceStageForResultRow(item, result, row, rowIndex, options);
        if (!phase) return null;
        return {
          eventId: row.eventId,
          eventLabel: result.eventLabel,
          sex: row.sex,
          stage: phase.stage,
          phaseLabel: phase.phaseLabel,
          session: row.session || "",
          startTime: row.startTime || "",
          programKey: result.programKey,
          lastName: item.lastName || "",
          firstName: item.firstName || "",
          displayName: item.displayName || "",
          birthYear: item.birthYear || "",
          club: item.club || "",
          rank: item.rank || "",
          time: item.time || "",
          points: item.points || "",
          status: item.resultStatus || "",
          statusLabel: item.statusLabel || "",
          updatedAt: result.updatedAt
        };
      })
      .filter(Boolean)
      .filter((item) => {
        const key = resultPerformanceDuplicateKey(item, options);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  global.LivePalmesResultParser = {
    normalizeResultLineText,
    buildPublishedResult,
    emptyParsedFinals,
    finalRowCountsAsFinalist,
    finalRowKey,
    finalRowOrderValue,
    finalRowsCount,
    performanceStageForResultRow,
    parseFinalistsFromResultLines,
    parseRelayLegRow,
    parseRelayResultRow,
    parseRelayResultStatusRow,
    parseResultRow,
    parseResultStatusRow,
    resultPointsFromMatch,
    resultPointsFromTail,
    resultCategoryFromHeader,
    parseUnrankedResultRow,
    resolveParsedFinals,
    resultPerformanceDuplicateKey,
    resultPerformanceRows,
    resultImportRowKey,
    shouldPreserveFinalistsOnReread,
    normalizeFinalistsOrder,
    sortedFinalRows,
    resultStatusFromText
  };
})(window);
