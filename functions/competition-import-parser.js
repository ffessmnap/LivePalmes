// Preserve the execution mode of the existing index.js function bodies.

// Existing behavior extracted from index.js. Dependencies are supplied by its entry points.
function createCompetitionImportParser({
  CATEGORY_LABELS,
  HttpsError,
  POOL_COURSES,
  ageCategoryFromDates,
  applyCompetitionImportTiming,
  cleanText,
  courseLengthFromCode,
  courseStyleFromCode,
  fallbackCategoryFromSource,
  ffessmBasTimingType,
  formatTimeValue,
  importSeasonYear,
  normalizeCategoryCode,
  normalizeCourseCode,
  normalizeImportToken,
  parseTimeValue,
  stableHash
}) {
  function cleanImportText(value, maxLength = 900000) {
    const text = String(value || "").replace(/\u0000/g, "");
    if (!text.trim()) {
      throw new HttpsError("invalid-argument", "Fichier d'import vide.");
    }
    if (text.length > maxLength) {
      throw new HttpsError("invalid-argument", "Fichier d'import trop volumineux pour cette premiere version.");
    }
    return text;
  }

  function parseFrenchDate(value) {
    const match = cleanText(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return "";
    return `${match[3]}-${match[2]}-${match[1]}`;
  }

  function parseImportDate(value) {
    const text = cleanText(value);
    if (!text) return "";
    let match = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (match) return `${match[1]}-${String(match[2]).padStart(2, "0")}-${String(match[3]).padStart(2, "0")}`;
    match = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2}|\d{4})$/);
    if (match) {
      const year = match[3].length === 2 ? `20${match[3]}` : match[3];
      return `${year}-${String(match[2]).padStart(2, "0")}-${String(match[1]).padStart(2, "0")}`;
    }
    if (/^\d{5}$/.test(text)) {
      const serial = Number(text);
      const epoch = Date.UTC(1899, 11, 30);
      const date = new Date(epoch + serial * 24 * 60 * 60 * 1000);
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString().slice(0, 10);
      }
    }
    return "";
  }

  function parseIntermediateTimes(cells = []) {
    return [11, 12, 13, 14]
      .map((cellIndex, index) => {
        const time = cells[cellIndex] || "";
        const timeValue = parseTimeValue(time);
        if (!timeValue) return null;
        return {
          code: `TI${index + 1}`,
          distance: [100, 200, 400, 800][index],
          time,
          timeValue
        };
      })
      .filter(Boolean);
  }

  function parseFfessmTxtImport(rawText) {
    const text = cleanImportText(rawText);
    const lines = text.split(/\r?\n/);
    const clubs = new Map();
    const performances = [];
    const warnings = [];
    const acceptedCourses = new Set(POOL_COURSES);
    const metadata = {
      format: "",
      competitionCode: "",
      competitionName: "",
      date: "",
      location: "",
      poolSize: "",
      poolKind: "",
      timingType: "",
      chrono: "",
      timingSource: "",
      wid: "",
      wpv: ""
    };
    const duplicateGroups = new Map();
    let rawPerformanceRows = 0;
    let ignoredRows = 0;

    lines.forEach((line, index) => {
      const trimmed = String(line || "").trimEnd();
      if (!trimmed) return;
      const cells = trimmed.split(";").map((cell) => normalizeImportToken(cell));
      const kind = cells[0];
      if (!kind || kind.startsWith("#")) return;

      if (kind === "" && cells[1]?.startsWith("Format de fichier")) {
        metadata.format = cells[1];
        return;
      }

      if (kind === "REN") {
        metadata.competitionCode = cells[1] || "";
        metadata.date = parseFrenchDate(cells[1]) || metadata.date;
        metadata.competitionName = cells[2] || "";
        metadata.location = cells[3] || "";
        return;
      }

      if (kind === "BAS") {
        metadata.poolSize = cells[1] || "";
        metadata.poolKind = "Piscine";
        metadata.timingType = ffessmBasTimingType(cells);
        return;
      }

      if (kind === "WID") {
        metadata.wid = cells[1] || "";
        return;
      }

      if (kind === "WPV") {
        metadata.wpv = cells[1] || "";
        return;
      }

      if (kind === "CLU") {
        const code = cells[1] || "";
        if (code) {
          clubs.set(code, {
            code,
            name: cells[2] || "",
            number: cells[3] || "",
            region: cells[4] || "",
            country: cells[6] || ""
          });
        }
        return;
      }

      if (kind !== "NAG") return;
      rawPerformanceRows += 1;

      const course = normalizeCourseCode(cells[7]);
      const time = cells[15] || cells[8] || "";
      const timeValue = parseTimeValue(time);
      const entryTime = cells[8] || "";
      const entryTimeValue = parseTimeValue(entryTime);
      const intermediateTimes = parseIntermediateTimes(cells);
      const sex = cleanText(cells[4]).toUpperCase();
      const clubCode = cells[5] || "";
      const swimmerId = cells[22] || "";
      const categoryCode = normalizeCategoryCode(cells[9] || cells[20]);
      const birthDate = parseFrenchDate(cells[3]);
      const club = clubs.get(clubCode) || {};

      if (!acceptedCourses.has(course)) {
        ignoredRows += 1;
        return;
      }
      if (String(metadata.poolSize) !== "25" && String(metadata.poolSize) !== "50") {
        ignoredRows += 1;
        return;
      }
      if (!timeValue) {
        ignoredRows += 1;
        return;
      }
      if (sex !== "F" && sex !== "M") {
        ignoredRows += 1;
        return;
      }

      const duplicateKey = [swimmerId, cells[1], cells[2], metadata.date, course, time, clubCode].join("|");
      const performance = {
        source: "livepalmes-import",
        sourceFormat: "ffessm-txt",
        sourceLine: index + 1,
        active: true,
        duplicateInFile: false,
        isIntermediate: false,
        originCourse: "",
        originSourceLine: null,
        originTime: "",
        originTimeValue: null,
        splitCode: "",
        splitDistance: null,
        swimmerId,
        lastName: cells[1] || "",
        firstName: cells[2] || "",
        birthDate,
        sex,
        club: clubCode,
        clubName: club.name || "",
        regionId: club.region || "",
        course,
        entryTime,
        entryTimeValue,
        intermediateTimes,
        time,
        timeValue,
        categoryCode,
        seasonYear: importSeasonYear(metadata.date),
        date: metadata.date,
        location: metadata.location,
        poolSize: Number(metadata.poolSize) || null,
        points: Number(cleanText(cells[17])) || null,
        rank: Number(cleanText(cells[18])) || null,
        order: Number(cleanText(cells[19])) || null,
        classificationCategory: normalizeCategoryCode(cells[20]),
        importedCategoryCode: normalizeCategoryCode(cells[9]),
        rawHash: stableHash(trimmed).slice(0, 24)
      };
      performances.push(performance);
      const duplicateGroup = duplicateGroups.get(duplicateKey) || [];
      duplicateGroup.push(performance);
      duplicateGroups.set(duplicateKey, duplicateGroup);

      const style = courseStyleFromCode(course);
      const originLength = courseLengthFromCode(course);
      intermediateTimes.forEach((split) => {
        const derivedCourse = `${split.distance}${style}`;
        if (!acceptedCourses.has(derivedCourse)) return;
        if (!originLength || split.distance >= originLength) return;
        const derivedPerformance = {
          ...performance,
          sourceLine: index + 1,
          isIntermediate: true,
          intermediateTimes: [],
          originCourse: course,
          originSourceLine: index + 1,
          originTime: time,
          originTimeValue: timeValue,
          splitCode: split.code,
          splitDistance: split.distance,
          course: derivedCourse,
          time: split.time,
          timeValue: split.timeValue,
          rank: null,
          order: null,
          rawHash: stableHash(`${trimmed}|${split.code}`).slice(0, 24)
        };
        performances.push(derivedPerformance);
        const derivedDuplicateKey = [swimmerId, cells[1], cells[2], metadata.date, derivedCourse, split.time, clubCode, "split"].join("|");
        const derivedDuplicateGroup = duplicateGroups.get(derivedDuplicateKey) || [];
        derivedDuplicateGroup.push(derivedPerformance);
        duplicateGroups.set(derivedDuplicateKey, derivedDuplicateGroup);
      });
    });

    if (!metadata.date) warnings.push("Date de competition non detectee.");
    if (!metadata.competitionName) warnings.push("Nom de competition non detecte.");
    if (!metadata.location) warnings.push("Lieu de competition non detecte.");
    if (!metadata.poolSize) warnings.push("Bassin non detecte.");
    if (!performances.length) warnings.push("Aucune performance importable detectee.");

    const duplicateDetails = Array.from(duplicateGroups.values())
      .filter((group) => group.length > 1)
      .map((group) => {
        group.forEach((perf) => {
          perf.duplicateInFile = true;
        });
        const first = group[0] || {};
        return {
          swimmerId: first.swimmerId || "",
          swimmer: [first.firstName, first.lastName].filter(Boolean).join(" "),
          course: first.course || "",
          time: first.time || "",
          club: first.club || "",
          date: first.date || "",
          count: group.length,
          lines: group.map((perf) => perf.sourceLine),
          entries: group.map((perf) => ({
            sourceLine: perf.sourceLine,
            rank: perf.rank,
            order: perf.order,
            categoryCode: perf.categoryCode,
            classificationCategory: perf.classificationCategory
          }))
        };
      });
    const duplicateCount = duplicateDetails.reduce((total, group) => total + Math.max(0, group.count - 1), 0);
    if (duplicateCount) warnings.push(`${duplicateCount} doublon(s) possible(s) dans le fichier.`);

    const performancesWithIntermediateTimes = performances.filter((perf) => Array.isArray(perf.intermediateTimes) && perf.intermediateTimes.length).length;
    const intermediatePerformances = performances.filter((perf) => perf.isIntermediate).length;

    const byCourse = performances.reduce((acc, perf) => {
      acc[perf.course] = (acc[perf.course] || 0) + 1;
      return acc;
    }, {});

    return applyCompetitionImportTiming({
      metadata,
      clubs: Array.from(clubs.values()),
      performances,
      summary: {
        rawLines: lines.length,
        rawPerformanceRows,
        importedPerformances: performances.length,
        ignoredRows,
        duplicateCount,
        performancesWithIntermediateTimes,
        intermediatePerformances,
        clubs: clubs.size,
        byCourse
      },
      warnings,
      duplicateDetails
    }, metadata.timingType, "ffessm-txt:BAS");
  }

  function cleanWorkbookRows(value, sheetName) {
    if (!Array.isArray(value)) {
      throw new HttpsError("invalid-argument", `Onglet ${sheetName} manquant dans la trame Excel.`);
    }
    if (value.length > 5000) {
      throw new HttpsError("invalid-argument", `Onglet ${sheetName} trop volumineux pour cette version.`);
    }
    return value.map((row) => {
      const cells = Array.isArray(row) ? row : [];
      return cells.slice(0, 80).map((cell) => {
        if (cell === null || cell === undefined) return "";
        if (typeof cell === "number" || typeof cell === "boolean") return String(cell);
        return cleanText(cell);
      });
    });
  }

  function cleanInternationalWorkbookPayload(workbook) {
    const sheets = workbook?.sheets || workbook || {};
    return {
      Competition: cleanWorkbookRows(sheets.Competition, "Competition"),
      Performances: cleanWorkbookRows(sheets.Performances, "Performances")
    };
  }

  function competitionValueFromRows(rows, field) {
    const expected = cleanText(field);
    const row = rows.find((cells) => cleanText(cells[0]) === expected);
    return row ? cleanText(row[2]) : "";
  }

  function headerMapFromRow(row = []) {
    return row.reduce((acc, cell, index) => {
      const key = normalizeImportToken(cell).toLowerCase();
      if (key) acc[key] = index;
      return acc;
    }, {});
  }

  function requiredHeadersPresent(headerMap, headers) {
    return headers.every((header) => Number.isInteger(headerMap[header]));
  }

  function internationalHeaderRow(rows) {
    const required = ["course_code", "last_name", "first_name", "final_time", "status"];
    for (let index = 0; index < rows.length; index += 1) {
      const map = headerMapFromRow(rows[index]);
      if (requiredHeadersPresent(map, required)) return { index, map };
    }
    throw new HttpsError("invalid-argument", "Onglet Performances invalide : en-tete de trame introuvable.");
  }

  function cellByHeader(row, headerMap, header) {
    const index = headerMap[header];
    return Number.isInteger(index) ? cleanText(row[index]) : "";
  }

  function normalizeInternationalCategory(value) {
    const code = normalizeCategoryCode(value);
    if (!code) return "";
    if (CATEGORY_LABELS.F[code] || CATEGORY_LABELS.M[code]) return code;
    return fallbackCategoryFromSource(code);
  }

  function parseInternationalIntermediateTimes(row, headerMap) {
    return [
      ["ti1_100m", "TI1", 100],
      ["ti2_200m", "TI2", 200],
      ["ti3_400m", "TI3", 400],
      ["ti4_800m", "TI4", 800]
    ]
      .map(([header, code, distance]) => {
        const rawTime = cellByHeader(row, headerMap, header);
        const timeValue = parseTimeValue(rawTime);
        if (!timeValue) return null;
        return {
          code,
          distance,
          time: formatTimeValue(timeValue),
          timeValue
        };
      })
      .filter(Boolean);
  }

  function parseInternationalWorkbookImport(workbookPayload) {
    const workbook = cleanInternationalWorkbookPayload(workbookPayload);
    const warnings = [];
    const clubs = new Map();
    const performances = [];
    const duplicateGroups = new Map();
    const acceptedCourses = new Set(POOL_COURSES);
    const competitionRows = workbook.Competition;
    const performanceRows = workbook.Performances;
    const { index: headerRowIndex, map: headerMap } = internationalHeaderRow(performanceRows);

    const startDate = parseImportDate(competitionValueFromRows(competitionRows, "competition_start_date"));
    const endDate = parseImportDate(competitionValueFromRows(competitionRows, "competition_end_date"));
    const city = competitionValueFromRows(competitionRows, "competition_city");
    const country = competitionValueFromRows(competitionRows, "competition_country");
    const poolSize = competitionValueFromRows(competitionRows, "pool_size");
    const metadata = {
      format: "livepalmes-international-xlsx",
      competitionCode: competitionValueFromRows(competitionRows, "external_competition_id"),
      competitionName: competitionValueFromRows(competitionRows, "competition_name"),
      date: startDate,
      endDate,
      location: [city, country].filter(Boolean).join(", "),
      city,
      country,
      poolSize,
      poolKind: competitionValueFromRows(competitionRows, "pool_kind"),
      timingType: competitionValueFromRows(competitionRows, "timing_type"),
      chrono: "",
      timingSource: "",
      competitionLevel: competitionValueFromRows(competitionRows, "competition_level"),
      sourceUrl: competitionValueFromRows(competitionRows, "source_url"),
      contactEmail: competitionValueFromRows(competitionRows, "contact_email"),
      notes: competitionValueFromRows(competitionRows, "notes")
    };

    let rawPerformanceRows = 0;
    let ignoredRows = 0;
    const missingFields = new Map();

    function markMissing(field) {
      missingFields.set(field, (missingFields.get(field) || 0) + 1);
    }

    performanceRows.slice(headerRowIndex + 1).forEach((row, offset) => {
      const sourceLine = headerRowIndex + offset + 2;
      if (!row.some((cell) => cleanText(cell))) return;
      rawPerformanceRows += 1;

      const raceDate = parseImportDate(cellByHeader(row, headerMap, "race_date")) || metadata.date;
      const course = normalizeCourseCode(cellByHeader(row, headerMap, "course_code"));
      const sex = normalizeCategoryCode(cellByHeader(row, headerMap, "sex"));
      const lastName = cellByHeader(row, headerMap, "last_name");
      const firstName = cellByHeader(row, headerMap, "first_name");
      const birthDate = parseImportDate(cellByHeader(row, headerMap, "birth_date"));
      const finalTimeRaw = cellByHeader(row, headerMap, "final_time");
      const timeValue = parseTimeValue(finalTimeRaw);
      const status = normalizeCategoryCode(cellByHeader(row, headerMap, "status")) || "OK";
      const clubCode = cellByHeader(row, headerMap, "club_code");
      const federationCode = normalizeCategoryCode(cellByHeader(row, headerMap, "federation_code"));
      const nationality = cellByHeader(row, headerMap, "nationality");
      const clubName = cellByHeader(row, headerMap, "club_name") || federationCode || nationality;
      const swimmerId = cellByHeader(row, headerMap, "international_id");
      const categoryDeclared = cellByHeader(row, headerMap, "category_declared");

      const missing = [];
      if (!raceDate) missing.push("race_date");
      if (!acceptedCourses.has(course)) missing.push("course_code");
      if (sex !== "F" && sex !== "M") missing.push("sex");
      if (!lastName) missing.push("last_name");
      if (!firstName) missing.push("first_name");
      if (!birthDate) missing.push("birth_date");
      if (!timeValue) missing.push("final_time");
      if (status !== "OK") missing.push("status_ok");
      if (String(poolSize) !== "25" && String(poolSize) !== "50") missing.push("pool_size");

      if (missing.length) {
        ignoredRows += 1;
        missing.forEach(markMissing);
        return;
      }

      const regionId = federationCode || nationality || "INT";
      const categoryCode = ageCategoryFromDates(raceDate, birthDate) || normalizeInternationalCategory(categoryDeclared);
      const intermediateTimes = parseInternationalIntermediateTimes(row, headerMap);
      const entryTimeRaw = cellByHeader(row, headerMap, "entry_time");
      const entryTimeValue = parseTimeValue(entryTimeRaw);
      const rank = Number(cleanText(cellByHeader(row, headerMap, "rank"))) || null;
      const points = Number(cleanText(cellByHeader(row, headerMap, "points"))) || null;

      if (clubCode || clubName || federationCode) {
        const code = clubCode || federationCode || stableHash(clubName).slice(0, 12);
        clubs.set(code, {
          code,
          name: clubName,
          number: "",
          region: regionId,
          country: nationality || country
        });
      }

      const rawHash = stableHash(JSON.stringify(row)).slice(0, 24);
      const performance = {
        source: "livepalmes-import",
        sourceFormat: "international-xlsx",
        sourceLine,
        active: true,
        duplicateInFile: false,
        isIntermediate: false,
        originCourse: "",
        originSourceLine: null,
        originTime: "",
        originTimeValue: null,
        splitCode: "",
        splitDistance: null,
        swimmerId,
        internationalId: swimmerId,
        lastName,
        firstName,
        birthDate,
        sex,
        nationality,
        federationCode,
        club: clubCode || federationCode,
        clubName,
        regionId,
        course,
        entryTime: entryTimeValue ? formatTimeValue(entryTimeValue) : entryTimeRaw,
        entryTimeValue,
        intermediateTimes,
        time: formatTimeValue(timeValue),
        timeValue,
        categoryCode,
        seasonYear: importSeasonYear(raceDate),
        date: raceDate,
        location: metadata.location,
        poolSize: Number(poolSize) || null,
        points,
        rank,
        order: null,
        round: cellByHeader(row, headerMap, "round"),
        classificationCategory: "",
        importedCategoryCode: normalizeCategoryCode(categoryDeclared),
        status,
        notes: cellByHeader(row, headerMap, "notes"),
        rawHash
      };
      performances.push(performance);

      const duplicateKey = [swimmerId, firstName, lastName, birthDate, raceDate, course, performance.time, performance.club].join("|");
      const duplicateGroup = duplicateGroups.get(duplicateKey) || [];
      duplicateGroup.push(performance);
      duplicateGroups.set(duplicateKey, duplicateGroup);

      const style = courseStyleFromCode(course);
      const originLength = courseLengthFromCode(course);
      intermediateTimes.forEach((split) => {
        const derivedCourse = `${split.distance}${style}`;
        if (!acceptedCourses.has(derivedCourse)) return;
        if (!originLength || split.distance >= originLength) return;
        const derivedPerformance = {
          ...performance,
          isIntermediate: true,
          intermediateTimes: [],
          originCourse: course,
          originSourceLine: sourceLine,
          originTime: performance.time,
          originTimeValue: performance.timeValue,
          splitCode: split.code,
          splitDistance: split.distance,
          course: derivedCourse,
          time: split.time,
          timeValue: split.timeValue,
          rank: null,
          order: null,
          rawHash: stableHash(`${rawHash}|${split.code}`).slice(0, 24)
        };
        performances.push(derivedPerformance);
        const splitDuplicateKey = [swimmerId, firstName, lastName, birthDate, raceDate, derivedCourse, split.time, performance.club, "split"].join("|");
        const splitDuplicateGroup = duplicateGroups.get(splitDuplicateKey) || [];
        splitDuplicateGroup.push(derivedPerformance);
        duplicateGroups.set(splitDuplicateKey, splitDuplicateGroup);
      });
    });

    if (!metadata.date) warnings.push("Date de competition non detectee dans l'onglet Competition.");
    if (!metadata.competitionName) warnings.push("Nom de competition non detecte dans l'onglet Competition.");
    if (!metadata.location) warnings.push("Lieu ou pays de competition a completer.");
    if (!metadata.poolSize) warnings.push("Bassin non detecte dans l'onglet Competition.");
    if (!performances.length) warnings.push("Aucune performance importable detectee.");
    missingFields.forEach((count, field) => {
      warnings.push(`${count} ligne(s) ignoree(s) : champ ${field} manquant ou invalide.`);
    });

    const duplicateDetails = Array.from(duplicateGroups.values())
      .filter((group) => group.length > 1)
      .map((group) => {
        group.forEach((perf) => {
          perf.duplicateInFile = true;
        });
        const first = group[0] || {};
        return {
          swimmerId: first.swimmerId || "",
          swimmer: [first.firstName, first.lastName].filter(Boolean).join(" "),
          course: first.course || "",
          time: first.time || "",
          club: first.club || first.clubName || "",
          date: first.date || "",
          count: group.length,
          lines: group.map((perf) => perf.sourceLine),
          entries: group.map((perf) => ({
            sourceLine: perf.sourceLine,
            rank: perf.rank,
            order: perf.order,
            categoryCode: perf.categoryCode,
            classificationCategory: perf.classificationCategory
          }))
        };
      });
    const duplicateCount = duplicateDetails.reduce((total, group) => total + Math.max(0, group.count - 1), 0);
    if (duplicateCount) warnings.push(`${duplicateCount} doublon(s) possible(s) dans le fichier.`);

    const performancesWithIntermediateTimes = performances.filter((perf) => Array.isArray(perf.intermediateTimes) && perf.intermediateTimes.length).length;
    const intermediatePerformances = performances.filter((perf) => perf.isIntermediate).length;
    const byCourse = performances.reduce((acc, perf) => {
      acc[perf.course] = (acc[perf.course] || 0) + 1;
      return acc;
    }, {});

    return applyCompetitionImportTiming({
      sourceType: "international-xlsx",
      fileHashSeed: JSON.stringify(workbook),
      metadata,
      clubs: Array.from(clubs.values()),
      performances,
      summary: {
        rawLines: performanceRows.length,
        rawPerformanceRows,
        importedPerformances: performances.length,
        ignoredRows,
        duplicateCount,
        performancesWithIntermediateTimes,
        intermediatePerformances,
        clubs: clubs.size,
        byCourse
      },
      warnings,
      duplicateDetails
    }, metadata.timingType, "international-xlsx:Competition.timing_type");
  }

  function parseCompetitionImportPayload(data = {}) {
    const sourceType = cleanText(data.sourceType);
    if (sourceType === "international-xlsx" || data.workbook) {
      return parseInternationalWorkbookImport(data.workbook);
    }
    const rawText = cleanImportText(data.rawText);
    return {
      ...parseFfessmTxtImport(rawText),
      sourceType: "ffessm-txt",
      fileHashSeed: rawText
    };
  }

  return {
    cleanImportText,
    parseFrenchDate,
    parseImportDate,
    parseIntermediateTimes,
    parseFfessmTxtImport,
    cleanWorkbookRows,
    cleanInternationalWorkbookPayload,
    competitionValueFromRows,
    headerMapFromRow,
    requiredHeadersPresent,
    internationalHeaderRow,
    cellByHeader,
    normalizeInternationalCategory,
    parseInternationalIntermediateTimes,
    parseInternationalWorkbookImport,
    parseCompetitionImportPayload
  };
}

module.exports = { createCompetitionImportParser };
