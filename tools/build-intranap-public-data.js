const fs = require("fs");
const path = require("path");

const DEFAULT_INTRANAP_DIR = path.resolve(process.cwd(), "..", "..", "BDD INTRANAP");
const INTRANAP_DIR = process.env.INTRANAP_DIR || DEFAULT_INTRANAP_DIR;
const IS_NAP_SOURCE = process.env.LIVEPALMES_NAP_SOURCE === "true";
const OUT_DIR = IS_NAP_SOURCE
  ? path.resolve(process.env.LIVEPALMES_NAP_OUT_DIR || "outputs/nap-public-build/historical")
  : path.resolve(process.cwd(), "performances", "public", "data");
if (IS_NAP_SOURCE) {
  const relative = path.relative(path.resolve(process.cwd(), "outputs"), OUT_DIR);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Sortie NAP de travail requise sous outputs.");
}
const SWIMMER_PERFS_DIR = path.join(OUT_DIR, "intranap-swimmer-perfs");
const TOP_SOURCE_DIR = path.join(OUT_DIR, "intranap-top-source");
const COMPETITION_OVERRIDES_FILE = path.resolve(__dirname, "intranap-competition-overrides.json");
const SOURCE_CSV_SPECS = {
  swimmers: "nageurs_",
  clubs: "clubs_",
  competitions: "competitions_",
  perfs: "perfs_"
};

const { CURRENT_POOL_COURSES, SUPPORTED_POOLS, SUPPORTED_CHRONOS, COURSE_META, MIN_TIME_BY_COURSE, CATEGORY_ORDER, COMMITTEE_LABELS, CATEGORY_LABELS, normalizeIdentityText, swimmerIdentityKey, canonicalSwimmerId, parseCompactTime, formatTime, competitionYear, competitionSeasonYear, birthYear, seasonAge, categoryFromAge, fallbackCategoryFromSource, normalizePerformanceCategory, categoryCode, coursePayload, isIntermediateRow, intermediateGroupKey, annotateIntermediateOrigins, categorySortValue, committeeId, committeeLabel, cleanText } = require("../functions/nap-performance-normalization");

function parseCsvText(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === "\"") {
        if (text[index + 1] === "\"") {
          value += "\"";
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        value += char;
      }
      continue;
    }

    if (char === "\"") {
      quoted = true;
    } else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (char !== "\r") {
      value += char;
    }
  }

  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }

  return rows.filter((item) => item.some((cell) => String(cell || "").trim()));
}

function readCsv(fileName) {
  const filePath = path.join(INTRANAP_DIR, fileName);
  const rows = parseCsvText(fs.readFileSync(filePath, "utf8"));
  const header = rows[0].map((cell) => String(cell || "").trim());
  return rows.slice(1).map((row) => {
    const item = {};
    header.forEach((key, index) => {
      item[key] = String(row[index] ?? "").trim();
    });
    return item;
  });
}

function findLatestCsvFile(prefix) {
  if (!fs.existsSync(INTRANAP_DIR)) {
    throw new Error(`Dossier INTRANAP introuvable : ${INTRANAP_DIR}`);
  }
  const matches = fs.readdirSync(INTRANAP_DIR)
    .filter((name) => name.startsWith(prefix) && name.toLowerCase().endsWith(".csv"))
    .sort((a, b) => b.localeCompare(a));
  if (!matches.length) {
    throw new Error(`CSV INTRANAP introuvable : ${prefix}*.csv dans ${INTRANAP_DIR}`);
  }
  return matches[0];
}

function resolveSourceCsvFiles() {
  return Object.fromEntries(
    Object.entries(SOURCE_CSV_SPECS).map(([key, prefix]) => [key, findLatestCsvFile(prefix)])
  );
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function loadCompetitionOverrides() {
  if (!fs.existsSync(COMPETITION_OVERRIDES_FILE)) {
    return { overrides: {}, count: 0 };
  }
  const payload = JSON.parse(fs.readFileSync(COMPETITION_OVERRIDES_FILE, "utf8"));
  const overrides = payload.overrides && typeof payload.overrides === "object" ? payload.overrides : {};
  return { overrides, count: Object.keys(overrides).length };
}

function swimmerChunkId(swimmerId) {
  const value = Number(swimmerId || 0);
  return String(Math.max(0, Math.floor(value / 1000))).padStart(2, "0");
}

function topSourceFileName(sex, category) {
  return `${sex}-${String(category || "").replace(/\+/g, "")}.json`;
}

function writeJsGlobal(fileName, globalName, data) {
  fs.writeFileSync(
    path.join(OUT_DIR, fileName),
    `window.${globalName} = ${JSON.stringify(data)};\n`,
    "utf8"
  );
}

function build() {
  const sourceFiles = resolveSourceCsvFiles();
  const swimmersRows = readCsv(sourceFiles.swimmers);
  const clubsRows = readCsv(sourceFiles.clubs);
  const competitionsRows = readCsv(sourceFiles.competitions);
  const perfsRows = readCsv(sourceFiles.perfs);
  // NAP is authoritative: never fill its missing metadata with historic overrides.
  const competitionOverrides = IS_NAP_SOURCE ? { overrides: {} } : loadCompetitionOverrides();
  let appliedCompetitionOverrides = 0;

  const rawSwimmers = new Map(swimmersRows.map((row) => [row.id, {
    id: row.id,
    lastName: cleanText(row.nom),
    firstName: cleanText(row.prenom),
    birthDate: row.date,
    sex: row.sexe,
    clubId: row.club
  }]));

  const identityGroups = new Map();
  rawSwimmers.forEach((swimmer) => {
    const key = swimmerIdentityKey(swimmer.firstName, swimmer.lastName, swimmer.birthDate);
    const groupKey = key || `id:${swimmer.id}`;
    if (!identityGroups.has(groupKey)) identityGroups.set(groupKey, []);
    identityGroups.get(groupKey).push(swimmer);
  });

  const swimmers = new Map();
  const canonicalGroups = new Map();
  identityGroups.forEach((group, identityKey) => {
    const canonicalId = canonicalSwimmerId(group.map((swimmer) => swimmer.id));
    const canonical = group.find((swimmer) => String(swimmer.id) === String(canonicalId)) || group[0];
    const aliases = group.map((swimmer) => String(swimmer.id)).filter((id) => id && id !== String(canonicalId));
    const merged = {
      ...canonical,
      id: String(canonicalId),
      identityKey,
      aliases,
      sourceIds: group.map((swimmer) => String(swimmer.id)).filter(Boolean),
      sourceClubIds: Array.from(new Set(group.map((swimmer) => swimmer.clubId).filter(Boolean)))
    };
    canonicalGroups.set(String(canonicalId), merged);
    group.forEach((swimmer) => swimmers.set(String(swimmer.id), merged));
  });

  const clubs = new Map(clubsRows.map((row) => [row.num_club, {
    id: row.num_club,
    code: cleanText(row.abre_club),
    name: cleanText(row.nom_club),
    federalId: cleanText(row.federal_club),
    committeeId: committeeId(row.comite_club),
    committeeLabel: committeeLabel(row.comite_club)
  }]));

  const competitions = new Map(competitionsRows.map((row) => {
    const override = competitionOverrides.overrides[String(row.id)] || {};
    const sourcePool = cleanText(row.bassin);
    const sourceChrono = cleanText(row.chrono).toUpperCase();
    const overridePool = cleanText(override.pool);
    const overrideChrono = cleanText(override.chrono).toUpperCase();
    const pool = SUPPORTED_POOLS.includes(sourcePool)
      ? sourcePool
      : (SUPPORTED_POOLS.includes(overridePool) ? overridePool : sourcePool);
    const chrono = SUPPORTED_CHRONOS.includes(sourceChrono)
      ? sourceChrono
      : (SUPPORTED_CHRONOS.includes(overrideChrono) ? overrideChrono : sourceChrono);
    if (pool !== sourcePool || chrono !== sourceChrono) {
      appliedCompetitionOverrides += 1;
    }
    return [row.id, {
      id: row.id,
      name: cleanText(row.libelle),
      location: cleanText(row.lieu),
      date: row.date,
      endDate: row.enddate,
      pool: IS_NAP_SOURCE && !SUPPORTED_POOLS.includes(pool) ? "" : pool,
      isOpenWater: String(row.ld) === "1",
      chrono,
      type: cleanText(row.type),
      wid: cleanText(row.wid)
    }];
  }));

  const keptCourses = new Set(CURRENT_POOL_COURSES);
  const keptPools = new Set(SUPPORTED_POOLS);
  const swimmerPerfs = new Map();
  const topSourceBuckets = new Map();
  const courseSet = new Set();
  const categorySet = new Set();
  const seasonSet = new Set();
  const regionSet = new Map();
  const stats = {
    sourcePerformances: perfsRows.length,
    keptPerformances: 0,
    ignoredUnsupportedCourse: 0,
    ignoredRelay: 0,
    ignoredInvalidTime: 0,
    ignoredImplausibleTime: 0,
    ignoredInvalidCategory: 0,
    ignoredUnknownSwimmer: 0,
    ignoredUnknownCompetition: 0,
    ignoredNonPool: 0,
    keptIntermediatePerformances: 0
  };
  const allPerfs = [];

  for (const row of perfsRows) {
    if (!keptCourses.has(row.course)) {
      stats.ignoredUnsupportedCourse += 1;
      continue;
    }
    if (row.relais && row.relais !== "0") {
      stats.ignoredRelay += 1;
      continue;
    }

    const timeValue = parseCompactTime(row.tps);
    if (!timeValue) {
      stats.ignoredInvalidTime += 1;
      continue;
    }
    if (MIN_TIME_BY_COURSE[row.course] && timeValue < MIN_TIME_BY_COURSE[row.course]) {
      stats.ignoredImplausibleTime += 1;
      continue;
    }

    const swimmer = swimmers.get(row.nageur);
    const sourceSwimmer = rawSwimmers.get(row.nageur);
    if (!swimmer) {
      stats.ignoredUnknownSwimmer += 1;
      continue;
    }

    const competition = competitions.get(row.compet);
    if (!competition) {
      stats.ignoredUnknownCompetition += 1;
      continue;
    }
    // Retain pool performances with unknown length; never invent 25/50 metres.
    if (IS_NAP_SOURCE ? competition.isOpenWater : !keptPools.has(competition.pool)) {
      stats.ignoredNonPool += 1;
      continue;
    }

    const club = clubs.get(row.club) ||
      clubs.get(sourceSwimmer?.clubId) ||
      clubs.get(swimmer.clubId) ||
      { id: row.club || sourceSwimmer?.clubId || swimmer.clubId, code: "", name: "", committeeId: "", committeeLabel: "" };
    const course = coursePayload(row.course);
    const category = normalizePerformanceCategory(row.cat, swimmer, competition);
    if (!category) {
      stats.ignoredInvalidCategory += 1;
      continue;
    }
    const regionId = club.committeeId || "";
    const regionLabel = club.committeeLabel || committeeLabel(regionId);
    const perf = {
      id: row.id,
      swimmerId: swimmer.id,
      originalSwimmerId: row.nageur,
      swimmerIdentityKey: swimmer.identityKey || swimmerIdentityKey(swimmer.firstName, swimmer.lastName, swimmer.birthDate),
      swimmer: `${swimmer.firstName} ${swimmer.lastName}`.trim(),
      firstName: swimmer.firstName,
      lastName: swimmer.lastName,
      birthDate: swimmer.birthDate,
      sex: swimmer.sex,
      clubId: club.id,
      club: club.code || club.name,
      clubName: club.name,
      regionId,
      regionLabel,
      competitionId: competition.id,
      competition: competition.name,
      location: competition.location,
      date: competition.date,
      seasonYear: competitionSeasonYear(competition.date),
      pool: competition.pool,
      chrono: competition.chrono,
      course: course.code,
      courseLabel: course.label,
      courseShortLabel: course.shortLabel,
      style: course.style,
      length: course.length,
      isIntermediate: isIntermediateRow(row),
      passage: String(row.passage || "0"),
      originCourse: "",
      originCourseShortLabel: "",
      originPerformanceId: "",
      sourceCategory: row.cat,
      category,
      categoryCode: categoryCode(category, swimmer.sex),
      categoryLabel: CATEGORY_LABELS[swimmer.sex]?.[category] || category,
      timeValue,
      time: formatTime(timeValue),
      points: row.points || "",
      rank: row.classement || "",
      pid: row.pid || ""
    };

    stats.keptPerformances += 1;
    if (perf.isIntermediate) stats.keptIntermediatePerformances += 1;
    allPerfs.push(perf);
  }

  annotateIntermediateOrigins(allPerfs);

  for (const perf of allPerfs) {
    courseSet.add(perf.course);
    if (perf.category) categorySet.add(perf.category);
    if (perf.seasonYear) seasonSet.add(perf.seasonYear);
    if (perf.regionId) regionSet.set(perf.regionId, perf.regionLabel || `Comite ${perf.regionId}`);

    if (!swimmerPerfs.has(perf.swimmerId)) swimmerPerfs.set(perf.swimmerId, []);
    swimmerPerfs.get(perf.swimmerId).push(perf);

    const topSourceKey = `${perf.course}|${perf.sex}|${perf.category}`;
    if (!topSourceBuckets.has(topSourceKey)) topSourceBuckets.set(topSourceKey, []);
    topSourceBuckets.get(topSourceKey).push({
      id: perf.id,
      swimmerId: perf.swimmerId,
      originalSwimmerId: perf.originalSwimmerId,
      swimmerIdentityKey: perf.swimmerIdentityKey,
      swimmer: perf.swimmer,
      firstName: perf.firstName,
      lastName: perf.lastName,
      birthDate: perf.birthDate,
      sex: perf.sex,
      clubId: perf.clubId,
      club: perf.club,
      clubName: perf.clubName,
      regionId: perf.regionId,
      regionLabel: perf.regionLabel,
      competitionId: perf.competitionId,
      location: perf.location,
      date: perf.date,
      seasonYear: perf.seasonYear,
      pool: perf.pool,
      chrono: perf.chrono,
      course: perf.course,
      courseShortLabel: perf.courseShortLabel,
      style: perf.style,
      isIntermediate: perf.isIntermediate,
      originCourse: perf.originCourse,
      originCourseShortLabel: perf.originCourseShortLabel,
      originPerformanceId: perf.originPerformanceId,
      category: perf.category,
      categoryCode: perf.categoryCode,
      categoryLabel: perf.categoryLabel,
      timeValue: perf.timeValue,
      time: perf.time
    });
  }

  ensureDir(OUT_DIR);
  fs.rmSync(TOP_SOURCE_DIR, { recursive: true, force: true });
  fs.rmSync(SWIMMER_PERFS_DIR, { recursive: true, force: true });
  ensureDir(SWIMMER_PERFS_DIR);
  ensureDir(TOP_SOURCE_DIR);

  const swimmerIndex = Array.from(canonicalGroups.values())
    .map((swimmer) => {
      const perfs = swimmerPerfs.get(swimmer.id) || [];
      const latestPerf = perfs
        .filter((perf) => perf.club || perf.clubName)
        .sort((a, b) => String(b.date).localeCompare(a.date))[0];
      const club = clubs.get(latestPerf?.clubId || swimmer.clubId);
      return {
        id: swimmer.id,
        aliases: swimmer.aliases || [],
        sourceIds: swimmer.sourceIds || [swimmer.id],
        identityKey: swimmer.identityKey,
        name: `${swimmer.firstName} ${swimmer.lastName}`.trim(),
        lastName: swimmer.lastName,
        firstName: swimmer.firstName,
        birthDate: swimmer.birthDate,
        sex: swimmer.sex,
        clubId: latestPerf?.clubId || swimmer.clubId,
        club: latestPerf?.club || club?.code || "",
        clubName: latestPerf?.clubName || club?.name || "",
        performanceCount: perfs.length || 0,
        chunk: swimmerChunkId(swimmer.id)
      };
    })
    .filter((row) => row.performanceCount > 0)
    .sort((a, b) => a.lastName.localeCompare(b.lastName, "fr-FR") || a.firstName.localeCompare(b.firstName, "fr-FR"));

  const chunks = new Map();
  for (const [swimmerId, perfs] of swimmerPerfs.entries()) {
    const chunk = swimmerChunkId(swimmerId);
    if (!chunks.has(chunk)) chunks.set(chunk, {});
    chunks.get(chunk)[swimmerId] = perfs.sort((a, b) => String(b.date).localeCompare(a.date) || a.course.localeCompare(b.course));
  }

  for (const [chunk, payload] of chunks.entries()) {
    fs.writeFileSync(path.join(SWIMMER_PERFS_DIR, `chunk-${chunk}.json`), JSON.stringify(payload), "utf8");
  }

  for (const [key, rows] of topSourceBuckets.entries()) {
    const [course, sex, category] = key.split("|");
    const courseDir = path.join(TOP_SOURCE_DIR, course);
    ensureDir(courseDir);
    rows.sort((a, b) =>
      a.timeValue - b.timeValue ||
      String(a.date).localeCompare(b.date)
    );
    fs.writeFileSync(path.join(courseDir, topSourceFileName(sex, category)), JSON.stringify(rows), "utf8");
  }
  fs.rmSync(path.join(OUT_DIR, "intranap-tops.js"), { force: true });

  const summary = {
    generatedAt: new Date().toISOString(),
    source: {
      intranapDir: INTRANAP_DIR,
      perfs: sourceFiles.perfs,
      swimmers: sourceFiles.swimmers,
      competitions: sourceFiles.competitions,
      clubs: sourceFiles.clubs
    },
    rules: {
      poolCourses: CURRENT_POOL_COURSES,
      pools: SUPPORTED_POOLS,
      minTimeByCourse: MIN_TIME_BY_COURSE,
      topLimit: "computed in browser after selected filters",
      topCategorySource: "season age normalized from swimmer birth year and sport season year",
      topRegionSource: "clubs.comite_club",
      sourceCategoryField: "perfs.cat",
      swimmerMergeKey: "normalized firstName + lastName + birthDate; club is kept on each performance",
      competitionOverrides: competitionOverrides.count
    },
    counts: {
      swimmers: swimmersRows.length,
      mergedSwimmers: canonicalGroups.size,
      swimmersWithPerformances: swimmerIndex.length,
      clubs: clubsRows.length,
      competitions: competitionsRows.length,
      appliedCompetitionOverrides,
      ...stats
    },
    filters: {
      courses: CURRENT_POOL_COURSES.map(coursePayload),
      sexes: ["F", "M"],
      seasons: Array.from(seasonSet).sort((a, b) => b - a),
      regions: Array.from(regionSet.entries())
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) => a.label.localeCompare(b.label, "fr-FR") || Number(a.id) - Number(b.id)),
      categories: ["F", "M"].flatMap((sex) => Array.from(categorySet)
        .sort((a, b) => categorySortValue(a) - categorySortValue(b) || a.localeCompare(b, "fr-FR"))
        .map((category) => ({
          code: category,
          displayCode: categoryCode(category, sex),
          label: CATEGORY_LABELS[sex]?.[category] || category,
          sex
        })))
    }
  };

  writeJsGlobal("intranap-summary.js", "LIVEPALMES_INTRANAP_SUMMARY", summary);
  writeJsGlobal("intranap-swimmers-index.js", "LIVEPALMES_INTRANAP_SWIMMERS", swimmerIndex);

  console.log(JSON.stringify(summary.counts, null, 2));
  console.log(`Generated ${chunks.size} swimmer chunks.`);
  console.log(`Generated ${topSourceBuckets.size} top source bucket files.`);
}

build();
