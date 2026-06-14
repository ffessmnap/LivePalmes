const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DEFAULT_DATA_DIR = path.resolve(process.cwd(), "performances", "public", "data");
const DEFAULT_OUT_DIR = path.resolve(process.cwd(), "performances", "public", "data-consolidated");

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

const CURRENT_POOL_COURSES = Object.keys(COURSE_META);
const CATEGORY_ORDER = ["P", "B", "M", "C", "J", "S", "M30+", "M40+", "M50+", "M60+", "M70+", "M80+"];
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

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cleanIntermediateTimes(value) {
  return Array.isArray(value)
    ? value.map((split) => ({
      code: cleanText(split?.code),
      distance: Number(split?.distance || 0) || 0,
      time: cleanText(split?.time),
      timeValue: Number(split?.timeValue || 0) || 0
    })).filter((split) => split.time)
    : [];
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

function stableHash(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function parseJsGlobal(filePath, globalName) {
  const text = fs.readFileSync(filePath, "utf8").trim();
  const prefix = `window.${globalName} = `;
  if (!text.startsWith(prefix)) {
    throw new Error(`Format inattendu pour ${filePath}`);
  }
  return JSON.parse(text.slice(prefix.length).replace(/;\s*$/, ""));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJsGlobal(filePath, globalName, data) {
  fs.writeFileSync(filePath, `window.${globalName} = ${JSON.stringify(data)};\n`, "utf8");
}

function readJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(dir, entry.name));
}

function readHistoricalData(dataDir = DEFAULT_DATA_DIR) {
  const summary = parseJsGlobal(path.join(dataDir, "intranap-summary.js"), "LIVEPALMES_INTRANAP_SUMMARY");
  const swimmers = parseJsGlobal(path.join(dataDir, "intranap-swimmers-index.js"), "LIVEPALMES_INTRANAP_SWIMMERS");
  const swimmerPerfsDir = path.join(dataDir, "intranap-swimmer-perfs");
  const perfsBySwimmer = new Map();
  const allPerfs = [];

  readJsonFiles(swimmerPerfsDir).forEach((filePath) => {
    const chunk = JSON.parse(fs.readFileSync(filePath, "utf8"));
    Object.entries(chunk || {}).forEach(([swimmerId, perfs]) => {
      const rows = Array.isArray(perfs) ? perfs.map((perf) => ({
        ...perf,
        source: perf.source || "intranap",
        swimmerId: String(perf.swimmerId || swimmerId)
      })) : [];
      perfsBySwimmer.set(String(swimmerId), rows);
      rows.forEach((perf) => allPerfs.push(perf));
    });
  });

  return { summary, swimmers, perfsBySwimmer, allPerfs };
}

function loadImportedPayload(importsPath) {
  if (!importsPath) return { performances: [], swimmers: [] };
  const payload = JSON.parse(fs.readFileSync(path.resolve(importsPath), "utf8").replace(/^\uFEFF/, ""));
  if (Array.isArray(payload)) return { performances: payload, swimmers: [] };
  return {
    performances: Array.isArray(payload.performances) ? payload.performances : [],
    swimmers: Array.isArray(payload.swimmers) ? payload.swimmers : []
  };
}

function coursePayload(courseCode) {
  const course = cleanText(courseCode).replace(/\s+/g, "").toUpperCase();
  const meta = COURSE_META[course] || [course, course, "", 0];
  return {
    code: course,
    label: meta[0],
    shortLabel: meta[1],
    style: meta[2],
    length: meta[3]
  };
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

function importedChunkId(swimmerId, identityKey) {
  const hash = stableHash(identityKey || swimmerId).slice(0, 2);
  return `imp-${hash}`;
}

function historicalChunkId(swimmerId) {
  const value = Number(swimmerId || 0);
  if (!Number.isFinite(value) || value <= 0) return importedChunkId(swimmerId, "");
  return String(Math.max(0, Math.floor(value / 1000))).padStart(2, "0");
}

function buildHistoricalLookups(swimmers) {
  const byId = new Map();
  const byIdentity = new Map();
  swimmers.forEach((swimmer) => {
    const ids = [swimmer.id, ...(swimmer.aliases || []), ...(swimmer.sourceIds || [])]
      .map((id) => String(id || "").trim())
      .filter(Boolean);
    ids.forEach((id) => byId.set(id, swimmer));
    const key = swimmer.identityKey || swimmerIdentityKey(swimmer.firstName, swimmer.lastName, swimmer.birthDate);
    if (key && !byIdentity.has(key)) byIdentity.set(key, swimmer);
  });
  return { byId, byIdentity };
}

function resolveCanonicalSwimmer(perf, lookups) {
  const ids = [perf.swimmerId, perf.originalSwimmerId, ...(perf.aliases || []), ...(perf.sourceIds || [])]
    .map((id) => String(id || "").trim())
    .filter(Boolean);
  const byId = ids.map((id) => lookups.byId.get(id)).find(Boolean);
  if (byId) return byId;
  const identityKey = perf.swimmerIdentityKey || swimmerIdentityKey(perf.firstName, perf.lastName, perf.birthDate);
  return identityKey ? lookups.byIdentity.get(identityKey) || null : null;
}

function normalizeImportedPerformance(perf, lookups) {
  const course = coursePayload(perf.course);
  if (!CURRENT_POOL_COURSES.includes(course.code)) return null;
  const sex = cleanText(perf.sex).toUpperCase();
  if (sex !== "F" && sex !== "M") return null;
  const category = cleanText(perf.category);
  if (!category) return null;
  const canonical = resolveCanonicalSwimmer(perf, lookups);
  const identityKey = canonical?.identityKey || perf.swimmerIdentityKey || swimmerIdentityKey(perf.firstName, perf.lastName, perf.birthDate);
  const fallbackId = `imported:${stableHash(identityKey || [perf.firstName, perf.lastName, perf.birthDate].join("|")).slice(0, 16)}`;
  const swimmerId = String(canonical?.id || perf.swimmerId || fallbackId);
  const firstName = cleanText(canonical?.firstName || perf.firstName);
  const lastName = cleanText(canonical?.lastName || perf.lastName);
  const swimmer = cleanText(canonical?.name || perf.swimmer || [firstName, lastName].filter(Boolean).join(" "));
  const timeValue = Number(perf.timeValue || 0);
  if (!Number.isFinite(timeValue) || timeValue <= 0) return null;

  return {
    ...perf,
    id: cleanText(perf.id) || `import:${stableHash(JSON.stringify(perf)).slice(0, 24)}`,
    source: "livepalmes-import",
    swimmerId,
    originalSwimmerId: cleanText(perf.originalSwimmerId || perf.swimmerId),
    swimmerIdentityKey: identityKey,
    swimmer,
    firstName,
    lastName,
    birthDate: canonical?.birthDate || cleanText(perf.birthDate),
    sex,
    clubId: cleanText(perf.clubId || perf.club),
    club: cleanText(perf.club),
    clubName: cleanText(perf.clubName),
    regionId: cleanText(perf.regionId),
    regionLabel: cleanText(perf.regionLabel || perf.regionId),
    competitionId: cleanText(perf.competitionId || perf.importId),
    competition: cleanText(perf.competition || perf.competitionName),
    location: cleanText(perf.location),
    date: cleanText(perf.date),
    seasonYear: Number(perf.seasonYear || String(perf.date || "").slice(0, 4)) || "",
    pool: cleanText(perf.pool),
    chrono: cleanText(perf.chrono),
    course: course.code,
    courseLabel: course.label,
    courseShortLabel: course.shortLabel,
    style: course.style,
    length: course.length,
    isIntermediate: Boolean(perf.isIntermediate),
    originCourse: cleanText(perf.originCourse),
    originCourseShortLabel: cleanText(perf.originCourseShortLabel),
    originPerformanceId: cleanText(perf.originPerformanceId),
    category,
    categoryCode: cleanText(perf.categoryCode) || categoryCode(category, sex),
    categoryLabel: cleanText(perf.categoryLabel) || CATEGORY_LABELS[sex]?.[category] || category,
    timeValue,
    time: cleanText(perf.time),
    points: cleanText(perf.points),
    rank: cleanText(perf.rank)
  };
}

function duplicateKey(perf) {
  const identity = perf.swimmerIdentityKey || perf.swimmerId || perf.swimmer;
  return [
    normalizeIdentityText(identity),
    perf.date,
    perf.course,
    perf.timeValue,
    normalizeIdentityText(perf.club || perf.clubName),
    normalizeIdentityText(perf.competition || perf.location)
  ].join("|");
}

function mergePerformances(historicalPerfs, importedPerfs) {
  const seen = new Map();
  const merged = [];
  historicalPerfs.forEach((perf) => {
    const key = duplicateKey(perf);
    seen.set(key, perf);
    merged.push(perf);
  });
  importedPerfs.forEach((perf) => {
    const key = duplicateKey(perf);
    if (seen.has(key)) return;
    seen.set(key, perf);
    merged.push(perf);
  });
  return merged;
}

function sortPerformanceRows(rows) {
  return rows.sort((a, b) =>
    String(b.date || "").localeCompare(String(a.date || "")) ||
    String(a.course || "").localeCompare(String(b.course || ""), "fr-FR", { numeric: true }) ||
    Number(a.timeValue || 0) - Number(b.timeValue || 0)
  );
}

function categorySortValue(category) {
  const index = CATEGORY_ORDER.indexOf(category);
  return index >= 0 ? index : CATEGORY_ORDER.length + String(category || "").charCodeAt(0);
}

function topSourceFileName(sex, category) {
  return `${sex}-${String(category || "").replace(/\+/g, "")}.json`;
}

function publicTopRow(perf) {
  const row = {
    id: perf.id,
    source: perf.source || "intranap",
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
  };
  const intermediateTimes = cleanIntermediateTimes(perf.intermediateTimes);
  if (intermediateTimes.length) row.intermediateTimes = intermediateTimes;
  return row;
}

function buildConsolidatedData({ dataDir = DEFAULT_DATA_DIR, importsPath = "", outDir = DEFAULT_OUT_DIR } = {}) {
  const historical = readHistoricalData(dataDir);
  const lookups = buildHistoricalLookups(historical.swimmers);
  const importedPayload = loadImportedPayload(importsPath);
  const importedPerfs = importedPayload.performances
    .map((perf) => normalizeImportedPerformance(perf, lookups))
    .filter(Boolean);
  const allPerfs = mergePerformances(historical.allPerfs, importedPerfs);
  const perfsBySwimmer = new Map();
  const topBuckets = new Map();
  const swimmerProfiles = new Map(historical.swimmers.map((swimmer) => [String(swimmer.id), { ...swimmer }]));
  const seasonSet = new Set();
  const regionSet = new Map();
  const categorySet = new Set();

  importedPerfs.forEach((perf) => {
    if (swimmerProfiles.has(String(perf.swimmerId))) return;
    swimmerProfiles.set(String(perf.swimmerId), {
      id: String(perf.swimmerId),
      aliases: [],
      sourceIds: [String(perf.swimmerId), perf.originalSwimmerId].filter(Boolean),
      identityKey: perf.swimmerIdentityKey,
      name: perf.swimmer,
      lastName: perf.lastName,
      firstName: perf.firstName,
      birthDate: perf.birthDate,
      sex: perf.sex,
      clubId: perf.clubId,
      club: perf.club,
      clubName: perf.clubName,
      performanceCount: 0,
      chunk: importedChunkId(perf.swimmerId, perf.swimmerIdentityKey)
    });
  });

  allPerfs.forEach((perf) => {
    const swimmerId = String(perf.swimmerId || "");
    if (!swimmerId) return;
    if (!perfsBySwimmer.has(swimmerId)) perfsBySwimmer.set(swimmerId, []);
    perfsBySwimmer.get(swimmerId).push(perf);
    if (perf.seasonYear) seasonSet.add(Number(perf.seasonYear));
    if (perf.category) categorySet.add(perf.category);
    if (perf.regionId) regionSet.set(String(perf.regionId), perf.regionLabel || `Comite ${perf.regionId}`);
    const topKey = `${perf.course}|${perf.sex}|${perf.category}`;
    if (!topBuckets.has(topKey)) topBuckets.set(topKey, []);
    topBuckets.get(topKey).push(publicTopRow(perf));
  });

  const swimmerIndex = Array.from(swimmerProfiles.values())
    .map((swimmer) => {
      const perfs = perfsBySwimmer.get(String(swimmer.id)) || [];
      const latestPerf = perfs
        .filter((perf) => perf.club || perf.clubName)
        .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))[0];
      return {
        ...swimmer,
        clubId: latestPerf?.clubId || swimmer.clubId || "",
        club: latestPerf?.club || swimmer.club || "",
        clubName: latestPerf?.clubName || swimmer.clubName || "",
        performanceCount: perfs.length,
        chunk: swimmer.chunk || historicalChunkId(swimmer.id)
      };
    })
    .filter((swimmer) => swimmer.performanceCount > 0)
    .sort((a, b) => String(a.lastName || "").localeCompare(String(b.lastName || ""), "fr-FR") || String(a.firstName || "").localeCompare(String(b.firstName || ""), "fr-FR"));

  const chunks = new Map();
  perfsBySwimmer.forEach((perfs, swimmerId) => {
    const swimmer = swimmerProfiles.get(String(swimmerId));
    const chunk = swimmer?.chunk || historicalChunkId(swimmerId);
    if (!chunks.has(chunk)) chunks.set(chunk, {});
    chunks.get(chunk)[swimmerId] = sortPerformanceRows(perfs.slice());
  });

  const summary = {
    ...(historical.summary || {}),
    generatedAt: new Date().toISOString(),
    source: {
      ...(historical.summary?.source || {}),
      consolidated: true,
      importedPayload: importsPath ? "exported-additional-data" : ""
    },
    counts: {
      ...(historical.summary?.counts || {}),
      consolidatedPerformances: allPerfs.length,
      consolidatedSwimmersWithPerformances: swimmerIndex.length,
      importedPerformances: importedPerfs.length,
      deduplicatedImportedPerformances: importedPerfs.length - Math.max(0, allPerfs.length - historical.allPerfs.length)
    },
    filters: {
      courses: CURRENT_POOL_COURSES.map(coursePayload),
      sexes: ["F", "M"],
      seasons: Array.from(seasonSet).filter(Boolean).sort((a, b) => b - a),
      regions: Array.from(regionSet.entries())
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) => String(a.label).localeCompare(String(b.label), "fr-FR") || Number(a.id) - Number(b.id)),
      categories: ["F", "M"].flatMap((sex) => Array.from(categorySet)
        .sort((a, b) => categorySortValue(a) - categorySortValue(b) || String(a).localeCompare(String(b), "fr-FR"))
        .map((category) => ({
          code: category,
          displayCode: categoryCode(category, sex),
          label: CATEGORY_LABELS[sex]?.[category] || category,
          sex
        })))
    }
  };

  return { summary, swimmerIndex, chunks, topBuckets };
}

function writeConsolidatedData(data, outDir = DEFAULT_OUT_DIR) {
  const swimmerPerfsDir = path.join(outDir, "intranap-swimmer-perfs");
  const topSourceDir = path.join(outDir, "intranap-top-source");
  fs.rmSync(outDir, { recursive: true, force: true });
  ensureDir(swimmerPerfsDir);
  ensureDir(topSourceDir);

  writeJsGlobal(path.join(outDir, "intranap-summary.js"), "LIVEPALMES_INTRANAP_SUMMARY", data.summary);
  writeJsGlobal(path.join(outDir, "intranap-swimmers-index.js"), "LIVEPALMES_INTRANAP_SWIMMERS", data.swimmerIndex);

  data.chunks.forEach((payload, chunk) => {
    fs.writeFileSync(path.join(swimmerPerfsDir, `chunk-${chunk}.json`), JSON.stringify(payload), "utf8");
  });

  data.topBuckets.forEach((rows, key) => {
    const [course, sex, category] = key.split("|");
    const courseDir = path.join(topSourceDir, course);
    ensureDir(courseDir);
    rows.sort((a, b) => Number(a.timeValue || 0) - Number(b.timeValue || 0) || String(a.date || "").localeCompare(String(b.date || "")));
    fs.writeFileSync(path.join(courseDir, topSourceFileName(sex, category)), JSON.stringify(rows), "utf8");
  });
}

module.exports = {
  buildConsolidatedData,
  writeConsolidatedData,
  readHistoricalData,
  DEFAULT_DATA_DIR,
  DEFAULT_OUT_DIR
};
