"use strict";
// Existing presentation rules shared by the historical builder and direct NAP reader.
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

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
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

module.exports = { CURRENT_POOL_COURSES, SUPPORTED_POOLS, SUPPORTED_CHRONOS, COURSE_META, MIN_TIME_BY_COURSE, CATEGORY_ORDER, COMMITTEE_LABELS, CATEGORY_LABELS, normalizeIdentityText, swimmerIdentityKey, canonicalSwimmerId, parseCompactTime, formatTime, competitionYear, competitionSeasonYear, birthYear, seasonAge, categoryFromAge, fallbackCategoryFromSource, normalizePerformanceCategory, categoryCode, coursePayload, isIntermediateRow, intermediateGroupKey, annotateIntermediateOrigins, categorySortValue, committeeId, committeeLabel, cleanText };
