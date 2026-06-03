(function attachRecordPlaceholders(global) {
  const PLACEHOLDER_TIME = "\u00c0 \u00e9tablir";
  const MASTER_RELAY_CATEGORY = "MASTER_RELAYS_MIXED";
  const MASTER_RELAY_LABEL = "Relais Masters mixtes";
  const SEXES = ["F", "M"];
  const INDIVIDUAL_COURSES = [
    "50SF",
    "100SF",
    "200SF",
    "400SF",
    "800SF",
    "1500SF",
    "50AP",
    "100IS",
    "200IS",
    "400IS",
    "50BI",
    "100BI",
    "200BI",
    "400BI"
  ];
  const COURSE_META = {
    "50SF": ["50 m Surface", "50 SF", "SF", "Surface", "50"],
    "100SF": ["100 m Surface", "100 SF", "SF", "Surface", "100"],
    "200SF": ["200 m Surface", "200 SF", "SF", "Surface", "200"],
    "400SF": ["400 m Surface", "400 SF", "SF", "Surface", "400"],
    "800SF": ["800 m Surface", "800 SF", "SF", "Surface", "800"],
    "1500SF": ["1500 m Surface", "1500 SF", "SF", "Surface", "1500"],
    "50AP": ["50 m Apn\u00e9e", "50 AP", "AP", "Apn\u00e9e", "50"],
    "100IS": ["100 m Immersion", "100 IS", "IS", "Immersion", "100"],
    "200IS": ["200 m Immersion", "200 IS", "IS", "Immersion", "200"],
    "400IS": ["400 m Immersion", "400 IS", "IS", "Immersion", "400"],
    "50BI": ["50 m Bi-palmes", "50 BI", "BI", "Bi-palmes", "50"],
    "100BI": ["100 m Bi-palmes", "100 BI", "BI", "Bi-palmes", "100"],
    "200BI": ["200 m Bi-palmes", "200 BI", "BI", "Bi-palmes", "200"],
    "400BI": ["400 m Bi-palmes", "400 BI", "BI", "Bi-palmes", "400"]
  };
  const MASTER_RELAY_COURSE_META = {
    "4X50SF": ["4x50 SF mixte", "4x50 SF mixte", "RELAY_CLUB", "Relais Club", "4X50"],
    "4X100SB": ["4x100 SB mixte", "4x100 SB mixte", "RELAY_CLUB", "Relais Club", "4X100"]
  };
  const CATEGORY_LABELS = {
    P: "Poussin",
    B: "Benjamin",
    M: "Minime",
    C: "Cadet",
    J: "Junior",
    S: "Senior",
    "M30+": "Master 30+",
    "M40+": "Master 40+",
    "M50+": "Master 50+",
    "M60+": "Master 60+",
    "M70+": "Master 70+",
    "M80+": "Master 80+"
  };
  const MASTER_RELAY_CATEGORIES = ["X140", "X180", "X220", "X260"];
  const MASTER_RELAY_COURSES = ["4X50SF", "4X100SB"];
  const FRANCE_RELAY_COURSES = ["4X50SF", "4X100SF", "4X200SF", "4X100SB", "4X100BIX"];
  const MASTER_RELAY_STYLES = [
    ["RELAY_CLUB", "Relais Club", "club"],
    ["RELAY_FRANCE", "Relais \u00c9quipe f\u00e9d\u00e9rale", "federal"]
  ];
  const MASTER_RELAY_RECORDS = [
    ["RELAY_CLUB", "4X50SF", "X140", "CSAKB", "A. NEUMANN / A. GALOISY / F. ETIENNE / P. PINO-ALAMOS", "2025-06-14", "1:26.36"],
    ["RELAY_CLUB", "4X100SB", "X140", "CSAKB", "A. NEUMANN / A. GALOISY / F. ETIENNE / P. PINO-ALAMOS", "2025-06-15", "3:18.09"],
    ["RELAY_CLUB", "4X100SB", "X180", "CSAKB", "E. TRAVERSO / F. TURPIN / C. COLLOMP / F. ETIENNE", "2019-04-27", "3:29.88"],
    ["RELAY_CLUB", "4X100SB", "X220", "CSAKB", "A. NEUMANN / S. CHEKROUN / F. ETIENNE / M.P. GUIRAUD", "2024-12-15", "3:47.62"],
    ["RELAY_FRANCE", "4X50SF", "X180", "FFESSM", "D. BESSE / E. BECQ / L. BESSE / A. GAUBERT", "2025-06-14", "1:43.14"],
    ["RELAY_FRANCE", "4X50SF", "X260", "FFESSM", "P. NIAU / M.P. GUIRAUD / B. GRAMMATICOS / V. JACQUEMART", "2025-06-14", "1:43.98"],
    ["RELAY_FRANCE", "4X100SB", "X140", "FFESSM", "A. NEUMANN / A. GAUBERT / C. LEDOUAREC / C. HEITZ", "2023-06-27", "3:12.20"],
    ["RELAY_FRANCE", "4X100SB", "X180", "FFESSM", "F. PLOETZE / A. MOREL / R. PONTIER / P. DEGACHE", "2019-04-28", "3:46.00"],
    ["RELAY_FRANCE", "4X100SB", "X220", "FFESSM", "C. DUBUC / B. GRAMMATICOS / S. LEMAIRE / M.P. GUIRAUD", "2019-04-28", "3:56.91"],
    ["RELAY_FRANCE", "4X100SB", "X260", "FFESSM", "R. CLERDOUET / C. COLLOMP / B. GRAMMATICOS / M.P. GUIRAUD", "2023-06-27", "3:57.56"]
  ];
  const COURSE_ORDER = new Map([...INDIVIDUAL_COURSES, ...FRANCE_RELAY_COURSES].map((course, index) => [course, index]));
  const CATEGORY_ORDER = new Map(Object.keys(CATEGORY_LABELS).map((category, index) => [category, index]));

  function cloneRows(rows) {
    return Array.isArray(rows) ? rows.map((row) => ({ ...row })) : [];
  }

  function isIndividualCourseAllowed(category, course) {
    return !(course === "50AP" && (category === "P" || category === "B"));
  }

  function existingIndividualKey(row, scope) {
    if (!row || !INDIVIDUAL_COURSES.includes(row.course)) return "";
    const recordType = scope === "MPF" ? "MPF" : row.recordType;
    if (scope !== "MPF" && recordType !== scope) return "";
    return `${scope}|${row.sex}|${row.category}|${row.course}`;
  }

  function placeholderRow({ scope, sex, category, course }) {
    const [courseLabel, courseShortLabel, style, styleLabel, length] = COURSE_META[course];
    const key = `placeholder-${scope.toLowerCase()}|${sex}|${category}|${course}`;
    const row = {
      key,
      manualFrozen: true,
      placeholderRecord: true,
      value: null,
      rawTime: "",
      time: PLACEHOLDER_TIME,
      course,
      courseLabel,
      courseShortLabel,
      style,
      styleLabel,
      length,
      sex,
      bassin: "",
      category,
      categoryLabel: CATEGORY_LABELS[category] || category,
      age: "",
      seasonYear: "",
      sourceCategory: scope === "MPF" ? "MPF \u00e0 \u00e9tablir" : "RF \u00e0 \u00e9tablir",
      swimmerId: "",
      swimmer: PLACEHOLDER_TIME,
      birthDate: "",
      clubId: "",
      club: "",
      region: "",
      competitionId: "",
      competition: PLACEHOLDER_TIME,
      location: "",
      date: "",
      chrono: "",
      points: "",
      relayType: ""
    };

    if (scope !== "MPF") {
      row.recordType = scope;
      row.recordTypeLabel = scope === "RFJ" ? "Record de France Junior" : "Record de France";
    }

    return row;
  }

  function parseTimeValue(value) {
    const match = String(value || "").match(/^(?:(\d+):)?(\d{1,2})\.(\d{2})$/);
    if (!match) return null;
    return Number(match[1] || 0) * 6000 + Number(match[2]) * 100 + Number(match[3]);
  }

  function masterRelayKey({ style, course, category }) {
    return `MPF|${style}|${normalizeMasterRelayCategory(category)}|${course}`;
  }

  function normalizeMasterRelayCategory(category) {
    return String(category || "").replace(/^R(?=\d+$)/, "X");
  }

  function isMasterRelayRow(row) {
    return MASTER_RELAY_CATEGORIES.includes(normalizeMasterRelayCategory(row?.category))
      && MASTER_RELAY_COURSES.includes(row?.course)
      && String(row?.style || "").startsWith("RELAY");
  }

  function masterRelayRow({ style, course, category, club = "", swimmer = "", date = "", time = PLACEHOLDER_TIME }) {
    const styleInfo = MASTER_RELAY_STYLES.find((item) => item[0] === style) || MASTER_RELAY_STYLES[0];
    const courseMeta = MASTER_RELAY_COURSE_META[course];
    const relayType = styleInfo[2];
    const displayCategory = normalizeMasterRelayCategory(category);
    const key = `${time === PLACEHOLDER_TIME ? "placeholder" : "manual"}-mpf-relay-master|${style}|${displayCategory}|${course}`;
    return {
      key,
      manualFrozen: true,
      placeholderRecord: time === PLACEHOLDER_TIME,
      masterRelay: true,
      value: parseTimeValue(time),
      rawTime: time === PLACEHOLDER_TIME ? "" : `0${time}`,
      time,
      course,
      courseLabel: courseMeta[0],
      courseShortLabel: courseMeta[1],
      style,
      styleLabel: styleInfo[1],
      length: courseMeta[4],
      sex: "M",
      bassin: "",
      category: displayCategory,
      categoryLabel: displayCategory,
      age: "",
      seasonYear: date ? Number(date.slice(0, 4)) : "",
      sourceCategory: time === PLACEHOLDER_TIME ? "MPF relais master \u00e0 \u00e9tablir" : "MPF relais master fig\u00e9e",
      swimmerId: "",
      swimmer: swimmer || PLACEHOLDER_TIME,
      birthDate: "",
      clubId: "",
      club,
      region: "",
      competitionId: "",
      competition: time === PLACEHOLDER_TIME ? PLACEHOLDER_TIME : "MPF relais master fig\u00e9e",
      location: "",
      date,
      chrono: "",
      points: "",
      relayType
    };
  }

  function completeMpfRows(rows, categories) {
    const completed = cloneRows(rows);
    const existing = new Set(completed.map((row) => existingIndividualKey(row, "MPF")).filter(Boolean));

    for (const sex of SEXES) {
      for (const category of categories) {
        for (const course of INDIVIDUAL_COURSES) {
          if (!isIndividualCourseAllowed(category, course)) continue;
          const key = `MPF|${sex}|${category}|${course}`;
          if (existing.has(key)) continue;
          completed.push(placeholderRow({ scope: "MPF", sex, category, course }));
          existing.add(key);
        }
      }
    }

    return completeMasterRelayRows(completed).sort(compareRows);
  }

  function completeMasterRelayRows(rows) {
    const completed = cloneRows(rows);
    const existing = new Set(completed.filter(isMasterRelayRow).map(masterRelayKey));
    const known = new Map(MASTER_RELAY_RECORDS.map(([style, course, category, club, swimmer, date, time]) => [
      masterRelayKey({ style, course, category }),
      { style, course, category, club, swimmer, date, time }
    ]));

    for (const [style] of MASTER_RELAY_STYLES) {
      for (const course of MASTER_RELAY_COURSES) {
        for (const category of MASTER_RELAY_CATEGORIES) {
          const key = masterRelayKey({ style, course, category });
          if (existing.has(key)) continue;
          completed.push(masterRelayRow(known.get(key) || { style, course, category }));
          existing.add(key);
        }
      }
    }

    return completed;
  }

  function completeFranceRows(rows) {
    const completed = cloneRows(rows);
    const existing = new Set([
      ...completed.map((row) => existingIndividualKey(row, "RF")).filter(Boolean),
      ...completed.map((row) => existingIndividualKey(row, "RFJ")).filter(Boolean)
    ]);
    const scopes = [
      ["RF", "S"],
      ["RFJ", "J"]
    ];

    for (const [scope, category] of scopes) {
      for (const sex of SEXES) {
        for (const course of INDIVIDUAL_COURSES) {
          const key = `${scope}|${sex}|${category}|${course}`;
          if (existing.has(key)) continue;
          completed.push(placeholderRow({ scope, sex, category, course }));
          existing.add(key);
        }
      }
    }

    return completed.sort(compareRows);
  }

  function compareRows(a, b) {
    return String(a.recordType || "").localeCompare(String(b.recordType || ""), "fr-FR")
      || String(a.sex || "").localeCompare(String(b.sex || ""), "fr-FR")
      || ((CATEGORY_ORDER.get(a.category) ?? 999) - (CATEGORY_ORDER.get(b.category) ?? 999))
      || ((COURSE_ORDER.get(a.course) ?? 999) - (COURSE_ORDER.get(b.course) ?? 999))
      || String(a.style || "").localeCompare(String(b.style || ""), "fr-FR")
      || String(a.key || "").localeCompare(String(b.key || ""), "fr-FR");
  }

  function unique(values) {
    return Array.from(new Set(values.filter(Boolean)));
  }

  function completeData(source) {
    const data = source || {};
    const filters = data.filters || {};
    const categories = unique([...(filters.categories || []), ...Object.keys(CATEGORY_LABELS)])
      .filter((category) => CATEGORY_LABELS[category]);
    const next = {
      ...data,
      records: completeMpfRows(data.records, categories),
      franceRecords: completeFranceRows(data.franceRecords),
      filters: {
        ...filters,
        sexes: unique([...(filters.sexes || []), ...SEXES]),
        courses: unique([...(filters.courses || []), ...INDIVIDUAL_COURSES, ...MASTER_RELAY_COURSES]),
        categories: unique([...categories, MASTER_RELAY_CATEGORY]),
        franceCourses: sortCourses(unique([...(filters.franceCourses || []), ...INDIVIDUAL_COURSES, ...FRANCE_RELAY_COURSES]))
      }
    };
    return next;
  }

  function sortCourses(values) {
    return values.slice().sort((a, b) => (COURSE_ORDER.get(a) ?? 999) - (COURSE_ORDER.get(b) ?? 999) || String(a).localeCompare(String(b), "fr-FR"));
  }

  global.LivePalmesRecordPlaceholders = {
    completeData,
    compareCourses: (a, b) => (COURSE_ORDER.get(a) ?? 999) - (COURSE_ORDER.get(b) ?? 999) || String(a).localeCompare(String(b), "fr-FR"),
    relayCourseOrder: FRANCE_RELAY_COURSES.slice(),
    masterRelayCategory: MASTER_RELAY_CATEGORY,
    masterRelayLabel: MASTER_RELAY_LABEL,
    isMasterRelayRow,
    placeholderTime: PLACEHOLDER_TIME
  };

  if (global.LIVEPALMES_RECORDS) {
    global.LIVEPALMES_RECORDS = completeData(global.LIVEPALMES_RECORDS);
  }
})(window);
