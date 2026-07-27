const fs = require("fs");
const path = require("path");

const DEFAULT_INTRANAP_DIR = path.resolve(process.cwd(), "..", "..", "BDD INTRANAP");
const INTRANAP_DIR = process.env.INTRANAP_DIR || DEFAULT_INTRANAP_DIR;
const OUT_DIR = path.resolve(process.cwd(), "performances", "public", "data");
const SWIMMER_PERFS_DIR = path.join(OUT_DIR, "intranap-swimmer-perfs");
const TOP_SOURCE_DIR = path.join(OUT_DIR, "intranap-top-source");
const COMPETITION_OVERRIDES_FILE = path.resolve(__dirname, "intranap-competition-overrides.json");
const SOURCE_CSV_SPECS = {
  swimmers: "nageurs_",
  clubs: "clubs_",
  competitions: "competitions_",
  perfs: "perfs_"
};

const CURRENT_POOL_COURSES = [
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

const SUPPORTED_POOLS = ["25", "33", "50"];
const SUPPORTED_CHRONOS = ["M", "E"];

const COURSE_META = {
  "50SF": ["50 m Surface", "50 SF", "SF", 50],
  "100SF": ["100 m Surface", "100 SF", "SF", 100],
  "200SF": ["200 m Surface", "200 SF", "SF", 200],
  "400SF": ["400 m Surface", "400 SF", "SF", 400],
  "800SF": ["800 m Surface", "800 SF", "SF", 800],
  "1500SF": ["1500 m Surface", "1500 SF", "SF", 1500],
  "50AP": ["50 m Apnee", "50 AP", "AP", 50],
  "100IS": ["100 m Immersion", "100 IS", "IS", 100],
  "200IS": ["200 m Immersion", "200 IS", "IS", 200],
  "400IS": ["400 m Immersion", "400 IS", "IS", 400],
  "50BI": ["50 m Bi-palmes", "50 BI", "BI", 50],
  "100BI": ["100 m Bi-palmes", "100 BI", "BI", 100],
  "200BI": ["200 m Bi-palmes", "200 BI", "BI", 200],
  "400BI": ["400 m Bi-palmes", "400 BI", "BI", 400]
};

const MIN_TIME_BY_COURSE = {
  "50SF": 1200,
  "100SF": 3000,
  "200SF": 7000,
  "400SF": 15000,
  "800SF": 33000,
  "1500SF": 63000,
  "50AP": 1200,
  "100IS": 2500,
  "200IS": 7000,
  "400IS": 15000,
  "50BI": 1500,
  "100BI": 3500,
  "200BI": 8000,
  "400BI": 17000
};

const CATEGORY_ORDER = ["P", "B", "M", "C", "J", "S", "M30+", "M40+", "M50+", "M60+", "M70+", "M80+"];

const COMMITTEE_LABELS = {
  1: "Est",
  2: "Nouvelle-Aquitaine",
  3: "\u00cele-de-France",
  4: "National / f\u00e9d\u00e9ral",
  5: "\u00c9tranger",
  6: "Bretagne - Pays de la Loire",
  8: "Centre-Val de Loire",
  9: "Guadeloupe",
  10: "Occitanie",
  11: "Martinique",
  12: "Autres",
  13: "Hauts-de-France",
  15: "Normandie",
  16: "Provence-Alpes-C\u00f4te d'Azur",
  17: "Auvergne-Rh\u00f4ne-Alpes",
  18: "Saint-Pierre-et-Miquelon",
  19: "Open / f\u00e9d\u00e9ral",
  21: "Hauts-de-France",
  22: "Bourgogne-Franche-Comt\u00e9"
};

const CATEGORY_LABELS = {
  F: {
    P: "Poussines",
    B: "Benjamines",
    M: "Minimes Femmes",
    C: "Cadettes",
    J: "Juniors Femmes",
    S: "Seniors Femmes",
    "M30+": "Femmes 30+",
    "M40+": "Femmes 40+",
    "M50+": "Femmes 50+",
    "M60+": "Femmes 60+",
    "M70+": "Femmes 70+",
    "M80+": "Femmes 80+"
  },
  M: {
    P: "Poussins",
    B: "Benjamins",
    M: "Minimes Hommes",
    C: "Cadets",
    J: "Juniors Hommes",
    S: "Seniors Hommes",
    "M30+": "Hommes 30+",
    "M40+": "Hommes 40+",
    "M50+": "Hommes 50+",
    "M60+": "Hommes 60+",
    "M70+": "Hommes 70+",
    "M80+": "Hommes 80+"
  }
};

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

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function loadCompetitionOverrides() {
  if (!fs.existsSync(COMPETITION_OVERRIDES_FILE)) {
    return { overrides: {}, count: 0 };
  }
  const payload = JSON.parse(fs.readFileSync(COMPETITION_OVERRIDES_FILE, "utf8"));
  const overrides = payload.overrides && typeof payload.overrides === "object" ? payload.overrides : {};
  return { overrides, count: Object.keys(overrides).length };
}

function normalizeIdentityText(value) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .toUpperCase()
    .trim();
}

function swimmerIdentityKey(firstName, lastName, birthDate) {
  const first = normalizeIdentityText(firstName);
  const last = normalizeIdentityText(lastName);
  const birth = cleanText(birthDate);
  return first && last && birth ? `${last}|${first}|${birth}` : "";
}

function canonicalSwimmerId(ids) {
  return ids
    .map((id) => String(id || "").trim())
    .filter(Boolean)
    .sort((a, b) => Number(a) - Number(b) || a.localeCompare(b, "fr-FR", { numeric: true }))[0] || "";
}

function parseCompactTime(value) {
  const raw = String(value || "").trim();
  if (!/^\d+$/.test(raw)) return null;
  const padded = raw.padStart(6, "0");
  const centiseconds = Number(padded.slice(-2));
  const seconds = Number(padded.slice(-4, -2));
  const minutes = Number(padded.slice(0, -4));
  if (!Number.isFinite(minutes) || seconds >= 60 || minutes > 99) return null;
  const total = ((minutes * 60) + seconds) * 100 + centiseconds;
  return total > 0 ? total : null;
}

function formatTime(value) {
  const total = Number(value || 0);
  const minutes = Math.floor(total / 6000);
  const seconds = Math.floor((total % 6000) / 100);
  const centiseconds = total % 100;
  if (minutes > 0) {
    return `${minutes}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
  }
  return `${seconds}.${String(centiseconds).padStart(2, "0")}`;
}

function competitionYear(date) {
  const match = String(date || "").match(/^(\d{4})-/);
  return match ? Number(match[1]) : 0;
}

function competitionSeasonYear(date) {
  const match = String(date || "").match(/^(\d{4})-(\d{2})-/);
  if (!match) return competitionYear(date);
  const year = Number(match[1]);
  const month = Number(match[2]);
  return month >= 9 ? year + 1 : year;
}

function birthYear(date) {
  const match = String(date || "").match(/^(\d{4})-/);
  const year = match ? Number(match[1]) : 0;
  return year >= 1900 && year <= 2100 ? year : 0;
}

function seasonAge(competitionDate, birthDate) {
  const year = competitionSeasonYear(competitionDate);
  const born = birthYear(birthDate);
  return year && born ? year - born : null;
}

function categoryFromAge(age) {
  if (!Number.isFinite(age) || age < 0 || age > 120) return "";
  if (age <= 9) return "P";
  if (age <= 11) return "B";
  if (age <= 13) return "M";
  if (age <= 15) return "C";
  if (age <= 17) return "J";
  if (age <= 29) return "S";
  if (age <= 39) return "M30+";
  if (age <= 49) return "M40+";
  if (age <= 59) return "M50+";
  if (age <= 69) return "M60+";
  if (age <= 79) return "M70+";
  return "M80+";
}

function fallbackCategoryFromSource(sourceCategory) {
  const code = String(sourceCategory || "").toUpperCase();
  if (code.endsWith("PO")) return "P";
  if (code.endsWith("BE")) return "B";
  if (code.endsWith("MI")) return "M";
  if (code.endsWith("CA")) return "C";
  if (code.endsWith("JU")) return "J";
  if (code.endsWith("SE") || code.endsWith("S1")) return "S";
  if (/^[FH](30|35)\+$/.test(code) || /^[FH][MV][01]$/.test(code) || code === "M30+") return "M30+";
  if (/^[FH](40|45)\+$/.test(code) || /^[FH][MV]2$/.test(code)) return "M40+";
  if (/^[FH](50|55)\+$/.test(code) || /^[FH][MV]3$/.test(code)) return "M50+";
  if (/^[FH](60|65)\+$/.test(code) || /^[FH][MV]4$/.test(code)) return "M60+";
  if (/^[FH](70|75)\+$/.test(code) || /^[FH][MV][5-9]$/.test(code)) return "M70+";
  if (/^[FH]80\+$/.test(code)) return "M80+";
  return "";
}

function normalizePerformanceCategory(sourceCategory, swimmer, competition) {
  const calculated = categoryFromAge(seasonAge(competition.date, swimmer.birthDate));
  if (calculated) return calculated;

  const source = fallbackCategoryFromSource(sourceCategory);
  return source;
}

function categoryCode(category, sex) {
  const prefix = sex === "F" ? "F" : "H";
  const suffixes = {
    P: "PO",
    B: "BE",
    M: "MI",
    C: "CA",
    J: "JU",
    S: "SE",
    "M30+": "30+",
    "M40+": "40+",
    "M50+": "50+",
    "M60+": "60+",
    "M70+": "70+",
    "M80+": "80+"
  };
  return `${prefix}${suffixes[category] || category}`;
}

function coursePayload(course) {
  const meta = COURSE_META[course] || [course, course, "", 0];
  return {
    code: course,
    label: meta[0],
    shortLabel: meta[1],
    style: meta[2],
    length: meta[3]
  };
}

function isIntermediateRow(row) {
  return String(row?.passage || "0") !== "0";
}

function intermediateGroupKey(perf) {
  return [
    perf.swimmerId,
    perf.competitionId,
    perf.clubId,
    perf.style,
    perf.sex
  ].join("|");
}

function annotateIntermediateOrigins(perfs) {
  const grouped = new Map();
  perfs.forEach((perf) => {
    if (!grouped.has(intermediateGroupKey(perf))) grouped.set(intermediateGroupKey(perf), []);
    grouped.get(intermediateGroupKey(perf)).push(perf);
  });

  grouped.forEach((rows) => {
    rows.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
    const pending = [];
    rows.forEach((perf) => {
      if (perf.isIntermediate) {
        pending.push(perf);
        return;
      }

      const originLength = Number(perf.length || 0);
      const matched = pending.filter((candidate) =>
        candidate.style === perf.style &&
        Number(candidate.length || 0) < originLength &&
        candidate.timeValue < perf.timeValue
      );
      matched.forEach((candidate) => {
        candidate.originCourse = perf.course;
        candidate.originCourseShortLabel = perf.courseShortLabel;
        candidate.originPerformanceId = perf.id;
      });
      for (let index = pending.length - 1; index >= 0; index -= 1) {
        if (matched.includes(pending[index])) pending.splice(index, 1);
      }
    });
  });
}

function categorySortValue(category) {
  const index = CATEGORY_ORDER.indexOf(category);
  return index >= 0 ? index : CATEGORY_ORDER.length + String(category || "").charCodeAt(0);
}

function committeeId(value) {
  const id = Number(String(value || "").trim());
  return Number.isFinite(id) && id > 0 ? String(id) : "";
}

function committeeLabel(value) {
  const id = committeeId(value);
  return id ? (COMMITTEE_LABELS[id] || `Comit\u00e9 ${id}`) : "";
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
  const competitionOverrides = loadCompetitionOverrides();
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
      pool,
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
    if (!keptPools.has(competition.pool)) {
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
