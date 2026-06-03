const crypto = require("node:crypto");
const admin = require("firebase-admin");
const { HttpsError, onCall } = require("firebase-functions/v2/https");
const intranapSwimmersReference = require("./intranap-swimmers-reference.json");

admin.initializeApp();

const REGION = "europe-west1";
const COMPETITION_IDS = new Set(["livepalmes-active", "livepalmes-test"]);
const ADMIN_UIDS = new Set(["AgvWJjvLOfe3uB0lz0Xr3wwJxzT2"]);
const ROLES = ["live", "speaker", "referee", "video", "computer", "secretary"];
const ROLE_SET = new Set(ROLES);
const ACCESS_CAPABILITIES = ["admin.full", "records.manage", "consoles.manage", "competitions.import"];
const ACCESS_CAPABILITY_SET = new Set(ACCESS_CAPABILITIES);
const HASH_ITERATIONS = 120000;
const HASH_BYTES = 32;
const CALLABLE_OPTIONS = { region: REGION, invoker: "public" };
const PIN_MAX_FAILED_ATTEMPTS = 5;
const PIN_LOCK_MS_BY_LEVEL = [2 * 60 * 1000, 5 * 60 * 1000];
const POOL_COURSES = ["50SF", "100SF", "200SF", "400SF", "800SF", "1500SF", "50AP", "100IS", "200IS", "400IS", "50BI", "100BI", "200BI", "400BI"];
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
  return String(value || "").trim();
}

function competitionIdFrom(data = {}) {
  const competitionId = cleanText(data.competitionId || "livepalmes-active");
  if (!COMPETITION_IDS.has(competitionId)) {
    throw new HttpsError("invalid-argument", "Competition LivePalmes inconnue.");
  }
  return competitionId;
}

function assertAdmin(request) {
  const uid = request.auth?.uid || "";
  const capabilities = request.auth?.token?.livepalmesCapabilities || {};
  if (!ADMIN_UIDS.has(uid) && capabilities["admin.full"] !== true) {
    throw new HttpsError("permission-denied", "Admin LivePalmes requis.");
  }
}

function assertCapability(request, capability) {
  const uid = request.auth?.uid || "";
  const capabilities = request.auth?.token?.livepalmesCapabilities || {};
  if (!ADMIN_UIDS.has(uid) && capabilities["admin.full"] !== true && capabilities[capability] !== true) {
    throw new HttpsError("permission-denied", "Droit LivePalmes requis.");
  }
}

async function assertLivePalmesAccess(request) {
  const uid = request.auth?.uid || "";
  if (!uid) {
    throw new HttpsError("unauthenticated", "Connexion Firebase requise.");
  }
  if (ADMIN_UIDS.has(uid)) return;
  const capabilities = request.auth?.token?.livepalmesCapabilities || {};
  if (capabilities["admin.full"] === true || ACCESS_CAPABILITIES.some((capability) => capabilities[capability] === true)) return;

  const snapshot = await admin.firestore().collection("users").doc(uid).get();
  const data = snapshot.exists ? snapshot.data() || {} : {};
  const activeCapabilities = activeCapabilitiesFromMap(data.capabilities || {});
  if (!snapshot.exists || data.status !== "active" || !activeCapabilities.length) {
    throw new HttpsError("permission-denied", "Acces LivePalmes requis.");
  }
}

function normalizeEmail(value) {
  return cleanText(value).toLowerCase();
}

function assertEmail(email) {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new HttpsError("invalid-argument", "Email invalide.");
  }
}

function cleanAccessProfile(raw = {}) {
  const uid = cleanText(raw.uid).slice(0, 128);
  const email = normalizeEmail(raw.email);
  assertEmail(email);
  const firstName = cleanText(raw.firstName).slice(0, 80);
  const lastName = cleanText(raw.lastName).slice(0, 80);
  const clubId = cleanText(raw.clubId).slice(0, 40);
  const clubName = cleanText(raw.clubName).slice(0, 140);
  const licenseNumber = cleanText(raw.licenseNumber).slice(0, 60);
  const capabilities = Array.isArray(raw.capabilities)
    ? raw.capabilities.map(cleanText).filter((item) => ACCESS_CAPABILITY_SET.has(item))
    : [];
  if (!firstName || !lastName) {
    throw new HttpsError("invalid-argument", "Nom et prenom obligatoires.");
  }
  if (!capabilities.length) {
    throw new HttpsError("invalid-argument", "Selectionne au moins un droit.");
  }
  return { uid, email, firstName, lastName, clubId, clubName, licenseNumber, capabilities };
}

function capabilitiesMap(capabilities = []) {
  return ACCESS_CAPABILITIES.reduce((acc, capability) => {
    acc[capability] = capabilities.includes(capability);
    return acc;
  }, {});
}

function activeCapabilitiesFromMap(map = {}) {
  return ACCESS_CAPABILITIES.filter((capability) => map?.[capability] === true);
}

async function userByEmailOrCreate(profile) {
  const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  if (profile.uid) {
    const existing = await admin.auth().getUser(profile.uid);
    await admin.auth().updateUser(existing.uid, { email: profile.email, displayName, disabled: false });
    return { user: { ...existing, email: profile.email, displayName }, created: false };
  }
  try {
    const existing = await admin.auth().getUserByEmail(profile.email);
    await admin.auth().updateUser(existing.uid, { displayName, disabled: false });
    return { user: existing, created: false };
  } catch (error) {
    if (error?.code !== "auth/user-not-found") throw error;
    const user = await admin.auth().createUser({
      email: profile.email,
      emailVerified: false,
      displayName,
      disabled: false
    });
    return { user, created: true };
  }
}

async function writeAuditLog(action, actorUid, target = {}) {
  const now = new Date().toISOString();
  await admin.firestore().collection("auditLogs").add({
    action,
    actorUid,
    target,
    createdAt: now
  });
}

async function writeAccessGrants(uid, email, capabilities, status, actorUid, now) {
  const batch = admin.firestore().batch();
  ACCESS_CAPABILITIES.forEach((capability) => {
    const grantRef = admin.firestore().collection("accessGrants").doc(`${uid}_${capability.replace(".", "_")}`);
    batch.set(grantRef, {
      uid,
      email,
      capability,
      scopeType: "national",
      scopeId: "",
      status: capabilities.includes(capability) ? status : "inactive",
      updatedAt: now,
      updatedBy: actorUid,
      createdAt: now
    }, { merge: true });
  });
  return batch.commit();
}

function assertRole(role) {
  if (!ROLE_SET.has(role)) {
    throw new HttpsError("invalid-argument", "Role LivePalmes inconnu.");
  }
}

function assertPin(pin) {
  if (!/^\d{4}$/.test(pin)) {
    throw new HttpsError("invalid-argument", "Le code PIN doit contenir 4 chiffres.");
  }
}

function pinHash(pin, salt) {
  return crypto.pbkdf2Sync(String(pin), String(salt), HASH_ITERATIONS, HASH_BYTES, "sha256").toString("hex");
}

function stableHash(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

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

function normalizeImportToken(value) {
  return cleanText(value).replace(/\s+/g, " ");
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

function parseTimeValue(value) {
  const raw = cleanText(value).replace(",", ".");
  if (!raw || raw === "00.00" || raw === "00:00.00" || raw === "59:59.99") return null;
  const match = raw.match(/^(?:(\d+):)?(\d{1,2})\.(\d{1,2})$/);
  if (!match) return null;
  const minutes = Number(match[1] || 0);
  const seconds = Number(match[2]);
  const hundredths = Number(match[3].padEnd(2, "0").slice(0, 2));
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || !Number.isFinite(hundredths) || seconds >= 60) return null;
  return minutes * 6000 + seconds * 100 + hundredths;
}

function formatTimeValue(timeValue) {
  const total = Number(timeValue);
  if (!Number.isFinite(total) || total <= 0) return "";
  const minutes = Math.floor(total / 6000);
  const seconds = Math.floor((total % 6000) / 100);
  const hundredths = total % 100;
  return minutes
    ? `${minutes}:${String(seconds).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`
    : `${seconds}.${String(hundredths).padStart(2, "0")}`;
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

function courseStyleFromCode(course) {
  const match = cleanText(course).toUpperCase().match(/(?:SF|AP|IS|BI)$/);
  return match ? match[0] : "";
}

function courseLengthFromCode(course) {
  const match = cleanText(course).toUpperCase().match(/^(\d+)/);
  return match ? Number(match[1]) : null;
}

function normalizeCourseCode(value) {
  return cleanText(value).replace(/\s+/g, "").toUpperCase();
}

function normalizeCategoryCode(value) {
  return cleanText(value).replace(/\s+/g, "").toUpperCase();
}

function normalizeIdentityText(value) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .toUpperCase()
    .trim();
}

function swimmerIdentityKey(firstName, lastName, birthDate, sex) {
  const first = normalizeIdentityText(firstName);
  const last = normalizeIdentityText(lastName);
  const birth = cleanText(birthDate);
  const normalizedSex = normalizeCategoryCode(sex);
  if (!first || !last || !birth || (normalizedSex !== "F" && normalizedSex !== "M")) return "";
  return `${last}|${first}|${birth}|${normalizedSex}`;
}

function competitionYear(date) {
  const match = String(date || "").match(/^(\d{4})-/);
  return match ? Number(match[1]) : 0;
}

function birthYear(date) {
  const match = String(date || "").match(/^(\d{4})-/);
  const year = match ? Number(match[1]) : 0;
  return year >= 1900 && year <= 2100 ? year : 0;
}

function ageCategoryFromDates(competitionDate, birthDate) {
  const year = competitionYear(competitionDate);
  const born = birthYear(birthDate);
  const age = year && born ? year - born : null;
  if (!Number.isFinite(age) || age < 0 || age > 120) return "";
  if (age <= 10) return "P";
  if (age <= 12) return "B";
  if (age <= 14) return "M";
  if (age <= 16) return "C";
  if (age <= 18) return "J";
  if (age <= 29) return "S";
  if (age <= 39) return "M30+";
  if (age <= 49) return "M40+";
  if (age <= 59) return "M50+";
  if (age <= 69) return "M60+";
  if (age <= 79) return "M70+";
  return "M80+";
}

function fallbackCategoryFromSource(sourceCategory) {
  const code = normalizeCategoryCode(sourceCategory);
  if (code.endsWith("PO")) return "P";
  if (code.endsWith("BE")) return "B";
  if (code.endsWith("MI")) return "M";
  if (code.endsWith("CA")) return "C";
  if (code.endsWith("JU")) return "J";
  if (code.endsWith("SE") || code.endsWith("S1")) return "S";
  if (/^[FH](30|35)\+$/.test(code) || /^[FH][MV][01]$/.test(code)) return "M30+";
  if (/^[FH](40|45)\+$/.test(code) || /^[FH][MV]2$/.test(code)) return "M40+";
  if (/^[FH](50|55)\+$/.test(code) || /^[FH][MV]3$/.test(code)) return "M50+";
  if (/^[FH](60|65)\+$/.test(code) || /^[FH][MV]4$/.test(code)) return "M60+";
  if (/^[FH](70|75)\+$/.test(code) || /^[FH][MV][5-9]$/.test(code)) return "M70+";
  if (/^[FH]80\+$/.test(code)) return "M80+";
  return "";
}

function buildIntranapSwimmerReference() {
  const byId = new Map();
  const byIdentity = new Map();
  const ambiguousIdentities = new Set();
  intranapSwimmersReference.forEach((swimmer) => {
    byId.set(String(swimmer.id), swimmer);
    const key = swimmerIdentityKey(swimmer.firstName, swimmer.lastName, swimmer.birthDate, swimmer.sex);
    if (!key) return;
    if (byIdentity.has(key)) {
      ambiguousIdentities.add(key);
      byIdentity.delete(key);
      return;
    }
    if (!ambiguousIdentities.has(key)) byIdentity.set(key, swimmer);
  });
  return { byId, byIdentity, ambiguousIdentities };
}

const intranapSwimmerLookup = buildIntranapSwimmerReference();

function resolveIntranapSwimmer(perf, sex) {
  const rawId = cleanText(perf.swimmerId);
  const byIdMatch = rawId ? intranapSwimmerLookup.byId.get(rawId) : null;
  if (byIdMatch) return { swimmer: byIdMatch, method: "id" };

  const key = swimmerIdentityKey(perf.firstName, perf.lastName, perf.birthDate, sex);
  if (!key || intranapSwimmerLookup.ambiguousIdentities.has(key)) {
    return { swimmer: null, method: key ? "ambiguous_identity" : "none" };
  }
  const identityMatch = intranapSwimmerLookup.byIdentity.get(key) || null;
  return identityMatch ? { swimmer: identityMatch, method: "identity" } : { swimmer: null, method: "none" };
}

function categoryCodeFromCategory(category, sex) {
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
  const meta = COURSE_META[course] || [course, course, courseStyleFromCode(course), courseLengthFromCode(course)];
  return {
    code: course,
    label: meta[0],
    shortLabel: meta[1],
    style: meta[2],
    length: meta[3]
  };
}

function importSeasonYear(dateIso) {
  const date = new Date(`${dateIso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.getUTCMonth() >= 8 ? date.getUTCFullYear() + 1 : date.getUTCFullYear();
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
      metadata.poolKind = cells[2] || "";
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

  return {
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
  };
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
    const categoryCode = normalizeInternationalCategory(categoryDeclared) || ageCategoryFromDates(raceDate, birthDate);
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

  return {
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
  };
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

function importDocumentId(metadata = {}, fileHash = "") {
  const seed = [
    metadata.date,
    metadata.competitionName,
    metadata.location,
    metadata.poolSize,
    fileHash
  ].join("|");
  return stableHash(seed).slice(0, 32);
}

function safeCompareHex(left, right) {
  const leftBuffer = Buffer.from(String(left || ""), "hex");
  const rightBuffer = Buffer.from(String(right || ""), "hex");
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function roleUid(competitionId, role, clientId) {
  const digest = crypto
    .createHash("sha256")
    .update(`${competitionId}|${role}|${cleanText(clientId) || Date.now()}`)
    .digest("hex")
    .slice(0, 28);
  return `lp-${role}-${digest}`;
}

function liveDataRef(competitionId) {
  return admin.firestore()
    .collection("competitions")
    .doc(competitionId)
    .collection("liveData")
    .doc("current");
}

function rolePinsRef(competitionId) {
  return admin.firestore()
    .collection("competitions")
    .doc(competitionId)
    .collection("secrets")
    .doc("rolePins");
}

function pinAttemptRef(competitionId, role, uid, clientId) {
  const key = stableHash(`${competitionId}|${role}|${uid}|${cleanText(clientId)}`);
  return admin.firestore()
    .collection("competitions")
    .doc(competitionId)
    .collection("security")
    .doc("pinAttempts")
    .collection("items")
    .doc(key);
}

function consoleGrantRef(competitionId, uid) {
  return admin.firestore()
    .collection("competitions")
    .doc(competitionId)
    .collection("consoleGrants")
    .doc(uid);
}

function lockRemainingSeconds(attempt = {}, nowMs = Date.now()) {
  const lockedUntilMs = Date.parse(attempt.lockedUntil || "");
  if (!Number.isFinite(lockedUntilMs) || lockedUntilMs <= nowMs) return 0;
  return Math.ceil((lockedUntilMs - nowMs) / 1000);
}

function lockMessage(seconds) {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `Trop d'essais incorrects. Reessaie dans ${minutes} minute${minutes > 1 ? "s" : ""}.`;
}

async function assertPinAttemptAllowed(ref) {
  const snapshot = await ref.get();
  const seconds = lockRemainingSeconds(snapshot.data() || {});
  if (seconds > 0) {
    throw new HttpsError("resource-exhausted", lockMessage(seconds), { retryAfterSeconds: seconds });
  }
}

async function recordFailedPinAttempt(ref, details = {}) {
  const now = new Date();
  const nowIso = now.toISOString();
  let blockedSeconds = 0;
  await admin.firestore().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const previous = snapshot.exists ? snapshot.data() || {} : {};
    const wasLocked = lockRemainingSeconds(previous, now.getTime()) > 0;
    if (wasLocked) {
      blockedSeconds = lockRemainingSeconds(previous, now.getTime());
      return;
    }
    const failedCount = Number(previous.failedCount || 0) + 1;
    const previousLockLevel = Number(previous.lockLevel || 0);
    const payload = {
      clientIdHash: stableHash(details.clientId || ""),
      failedCount,
      lastFailedAt: nowIso,
      role: details.role,
      uid: details.uid,
      uidHash: stableHash(details.uid || ""),
      updatedAt: nowIso
    };
    if (failedCount >= PIN_MAX_FAILED_ATTEMPTS) {
      const lockLevel = Math.min(previousLockLevel + 1, PIN_LOCK_MS_BY_LEVEL.length);
      const lockMs = PIN_LOCK_MS_BY_LEVEL[Math.max(0, lockLevel - 1)] || PIN_LOCK_MS_BY_LEVEL[PIN_LOCK_MS_BY_LEVEL.length - 1];
      const lockedUntil = new Date(now.getTime() + lockMs);
      payload.failedCount = 0;
      payload.lockLevel = lockLevel;
      payload.lockedAt = nowIso;
      payload.lockedUntil = lockedUntil.toISOString();
      blockedSeconds = Math.ceil(lockMs / 1000);
    } else {
      payload.lockLevel = previousLockLevel;
      payload.lockedUntil = "";
    }
    transaction.set(ref, payload, { merge: true });
  });
  if (blockedSeconds > 0) {
    throw new HttpsError("resource-exhausted", lockMessage(blockedSeconds), { retryAfterSeconds: blockedSeconds });
  }
}

async function clearPinAttempts(ref) {
  await ref.delete().catch(() => {});
}

async function updatePublicPinNotes(competitionId, enabled) {
  const now = new Date().toISOString();
  const ref = liveDataRef(competitionId);
  await admin.firestore().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const current = snapshot.exists ? snapshot.data() : {};
    const liveData = current.data || {};
    const notes = { ...(liveData.notes || {}) };
    delete notes.rolePins;
    notes.pinAuthMode = "cloud";
    notes.pinLockEnabled = Boolean(enabled);
    notes.pinLockUpdatedAt = now;
    transaction.set(ref, {
      data: {
        ...liveData,
        notes,
        sourceVersion: `cloud-pins-${Date.now()}`
      },
      updatedAt: now,
      source: enabled ? "Codes PIN securises" : "Codes PIN desactives"
    }, { merge: true });
  });
}

exports.setRolePins = onCall(CALLABLE_OPTIONS, async (request) => {
  assertCapability(request, "consoles.manage");
  const competitionId = competitionIdFrom(request.data || {});
  const enabled = request.data?.enabled !== false;
  const now = new Date().toISOString();
  const pins = request.data?.pins || {};
  const ref = rolePinsRef(competitionId);

  await admin.firestore().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const previousRoles = snapshot.exists ? (snapshot.data()?.roles || {}) : {};
    const nextRoles = enabled ? { ...previousRoles } : {};

    if (enabled) {
      ROLES.forEach((role) => {
        const pin = cleanText(pins[role]);
        if (!pin) {
          const previous = previousRoles[role] || {};
          if (!previous.hash || !previous.salt) {
            throw new HttpsError("invalid-argument", `Le code PIN ${role} doit contenir 4 chiffres.`);
          }
          nextRoles[role] = previous;
          return;
        }
        assertPin(pin);
        const salt = crypto.randomBytes(16).toString("hex");
        nextRoles[role] = {
          hash: pinHash(pin, salt),
          salt,
          updatedAt: now
        };
      });
    }

    transaction.set(ref, {
      enabled,
      roles: nextRoles,
      updatedAt: now,
      updatedBy: request.auth.uid,
      version: 1
    }, { merge: false });
  });

  await admin.firestore().runTransaction(async (transaction) => {
    const attemptsRoot = admin.firestore()
      .collection("competitions")
      .doc(competitionId)
      .collection("security")
      .doc("pinAttempts")
      .collection("items");
    const changedRoles = new Set(ROLES.filter((role) => cleanText(pins[role])));
    if (!changedRoles.size) return;
    const snapshot = await transaction.get(attemptsRoot.where("role", "in", [...changedRoles]));
    snapshot.docs.forEach((doc) => {
      transaction.delete(doc.ref);
    });
  }).catch(() => {});

  await updatePublicPinNotes(competitionId, enabled);

  return {
    ok: true,
    enabled,
    mode: "cloud",
    updatedAt: now
  };
});

exports.verifyPin = onCall(CALLABLE_OPTIONS, async (request) => {
  const competitionId = competitionIdFrom(request.data || {});
  const role = cleanText(request.data?.role);
  const pin = cleanText(request.data?.pin);
  const clientId = cleanText(request.data?.clientId);
  assertRole(role);
  assertPin(pin);
  const uid = cleanText(request.auth?.uid);
  if (!uid) {
    throw new HttpsError("unauthenticated", "Connexion Firebase console requise.");
  }
  const attemptsRef = pinAttemptRef(competitionId, role, uid, clientId);
  await assertPinAttemptAllowed(attemptsRef);

  const snapshot = await rolePinsRef(competitionId).get();
  if (!snapshot.exists || snapshot.data()?.enabled !== true) {
    throw new HttpsError("failed-precondition", "Codes PIN serveur non configures.");
  }

  const entry = snapshot.data()?.roles?.[role];
  if (!entry?.hash || !entry?.salt || !safeCompareHex(pinHash(pin, entry.salt), entry.hash)) {
    await recordFailedPinAttempt(attemptsRef, { clientId, role, uid });
    throw new HttpsError("permission-denied", "Code PIN incorrect.");
  }

  await clearPinAttempts(attemptsRef);
  await admin.auth().setCustomUserClaims(uid, {
    livepalmesRole: role,
    livepalmesCompetition: competitionId,
    livepalmesConsole: true
  });
  const now = new Date();
  await consoleGrantRef(competitionId, uid).set({
    uid,
    role,
    competitionId,
    clientIdHash: stableHash(clientId),
    updatedAt: now.toISOString(),
    expiresAt: admin.firestore.Timestamp.fromMillis(now.getTime() + 12 * 60 * 60 * 1000)
  }, { merge: false });

  return {
    ok: true,
    role
  };
});

exports.createOrUpdateAccessUser = onCall(CALLABLE_OPTIONS, async (request) => {
  assertAdmin(request);
  const profile = cleanAccessProfile(request.data || {});
  const { user, created } = await userByEmailOrCreate(profile);
  const now = new Date().toISOString();
  const capabilityMap = capabilitiesMap(profile.capabilities);

  await admin.auth().setCustomUserClaims(user.uid, {
    ...(user.customClaims || {}),
    livepalmesAccess: true,
    livepalmesCapabilities: capabilityMap
  });

  const userRef = admin.firestore().collection("users").doc(user.uid);
  await userRef.set({
    uid: user.uid,
    email: profile.email,
    firstName: profile.firstName,
    lastName: profile.lastName,
    clubId: profile.clubId,
    clubName: profile.clubName,
    licenseNumber: profile.licenseNumber,
    status: "active",
    capabilities: capabilityMap,
    updatedAt: now,
    updatedBy: request.auth.uid,
    ...(created ? { createdAt: now, createdBy: request.auth.uid } : {})
  }, { merge: true });

  await writeAccessGrants(user.uid, profile.email, profile.capabilities, "active", request.auth.uid, now);

  await writeAuditLog(created ? "accessUser.created" : "accessUser.updated", request.auth.uid, {
    uid: user.uid,
    email: profile.email,
    capabilities: profile.capabilities
  });

  return {
    ok: true,
    created,
    uid: user.uid,
    email: profile.email,
    capabilities: profile.capabilities
  };
});

exports.listAccessUsers = onCall(CALLABLE_OPTIONS, async (request) => {
  assertAdmin(request);
  const snapshot = await admin.firestore().collection("users").orderBy("lastName").limit(200).get();
  const users = await Promise.all(snapshot.docs.map(async (doc) => {
    const data = doc.data() || {};
    const authUser = await admin.auth().getUser(doc.id).catch(() => null);
    return {
      uid: doc.id,
      email: data.email || authUser?.email || "",
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      clubName: data.clubName || "",
      licenseNumber: data.licenseNumber || "",
      status: data.status || (authUser?.disabled ? "inactive" : "active"),
      capabilities: activeCapabilitiesFromMap(data.capabilities || {}),
      updatedAt: data.updatedAt || "",
      lastLoginAt: authUser?.metadata?.lastSignInTime || ""
    };
  }));
  return {
    ok: true,
    users
  };
});

exports.setAccessUserStatus = onCall(CALLABLE_OPTIONS, async (request) => {
  assertAdmin(request);
  const uid = cleanText(request.data?.uid);
  const status = cleanText(request.data?.status);
  if (!uid) {
    throw new HttpsError("invalid-argument", "Utilisateur requis.");
  }
  if (!["active", "inactive"].includes(status)) {
    throw new HttpsError("invalid-argument", "Statut invalide.");
  }
  if (uid === request.auth.uid && status === "inactive") {
    throw new HttpsError("failed-precondition", "Tu ne peux pas desactiver ton propre acces.");
  }
  const userRef = admin.firestore().collection("users").doc(uid);
  const snapshot = await userRef.get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Acces LivePalmes introuvable.");
  }
  const data = snapshot.data() || {};
  const capabilities = activeCapabilitiesFromMap(data.capabilities || {});
  const email = data.email || "";
  const now = new Date().toISOString();
  const authUser = await admin.auth().getUser(uid);
  await admin.auth().updateUser(uid, { disabled: status !== "active" });
  await admin.auth().setCustomUserClaims(uid, {
    ...(authUser.customClaims || {}),
    livepalmesAccess: status === "active",
    livepalmesCapabilities: status === "active" ? capabilitiesMap(capabilities) : capabilitiesMap([])
  });
  await userRef.set({
    status,
    updatedAt: now,
    updatedBy: request.auth.uid
  }, { merge: true });
  await writeAccessGrants(uid, email, capabilities, status, request.auth.uid, now);
  await writeAuditLog(status === "active" ? "accessUser.activated" : "accessUser.deactivated", request.auth.uid, {
    uid,
    email,
    capabilities
  });
  return {
    ok: true,
    uid,
    status
  };
});

exports.getCurrentAccessUser = onCall(CALLABLE_OPTIONS, async (request) => {
  const uid = cleanText(request.auth?.uid);
  if (!uid) {
    throw new HttpsError("unauthenticated", "Connexion Firebase requise.");
  }
  const snapshot = await admin.firestore().collection("users").doc(uid).get();
  const data = snapshot.exists ? snapshot.data() || {} : {};
  if (ADMIN_UIDS.has(uid)) {
    return {
      ok: true,
      uid,
      email: data.email || request.auth?.token?.email || "",
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      clubName: data.clubName || "",
      licenseNumber: data.licenseNumber || "",
      status: "active",
      capabilities: ACCESS_CAPABILITIES
    };
  }
  if (!snapshot.exists) {
    throw new HttpsError("permission-denied", "Aucun acces LivePalmes actif.");
  }
  if (data.status !== "active") {
    throw new HttpsError("permission-denied", "Acces LivePalmes desactive.");
  }
  const capabilities = activeCapabilitiesFromMap(data.capabilities || {});
  if (!capabilities.length) {
    throw new HttpsError("permission-denied", "Aucun droit LivePalmes actif.");
  }
  return {
    ok: true,
    uid,
    email: data.email || request.auth?.token?.email || "",
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    clubName: data.clubName || "",
    licenseNumber: data.licenseNumber || "",
    status: "active",
    capabilities
  };
});

exports.previewCompetitionImport = onCall(CALLABLE_OPTIONS, async (request) => {
  assertCapability(request, "competitions.import");
  const parsed = parseCompetitionImportPayload(request.data || {});
  const fileHash = stableHash(parsed.fileHashSeed || "");
  const importId = importDocumentId(parsed.metadata, fileHash);
  const existing = await admin.firestore().collection("performanceImports").doc(importId).get();
  return {
    ok: true,
    importId,
    alreadyImported: existing.exists,
    fileHash,
    sourceType: parsed.sourceType,
    metadata: parsed.metadata,
    summary: parsed.summary,
    warnings: parsed.warnings,
    duplicateDetails: parsed.duplicateDetails.slice(0, 50),
    samplePerformances: parsed.performances.slice(0, 20)
  };
});

exports.createCompetitionImport = onCall(CALLABLE_OPTIONS, async (request) => {
  assertCapability(request, "competitions.import");
  const fileName = cleanText(request.data?.fileName).slice(0, 180);
  const confirmImportId = cleanText(request.data?.importId);
  const parsed = parseCompetitionImportPayload(request.data || {});
  if (!parsed.performances.length) {
    throw new HttpsError("failed-precondition", "Aucune performance importable dans ce fichier.");
  }
  const fileHash = stableHash(parsed.fileHashSeed || "");
  const importId = importDocumentId(parsed.metadata, fileHash);
  if (confirmImportId && confirmImportId !== importId) {
    throw new HttpsError("invalid-argument", "Le fichier ne correspond plus a la previsualisation.");
  }

  const importRef = admin.firestore().collection("performanceImports").doc(importId);
  const existing = await importRef.get();
  if (existing.exists && request.data?.overwrite !== true) {
    throw new HttpsError("already-exists", "Cette competition semble deja importee.");
  }

  const now = new Date().toISOString();
  const actorUid = request.auth.uid;
  const actorEmail = request.auth.token?.email || "";
  const db = admin.firestore();
  const batches = [];
  let batch = db.batch();
  let batchSize = 0;

  function commitIfNeeded(force = false) {
    if (batchSize >= 450 || (force && batchSize > 0)) {
      batches.push(batch.commit());
      batch = db.batch();
      batchSize = 0;
    }
  }

  batch.set(importRef, {
    importId,
    status: "stored",
    sourceType: parsed.sourceType || "ffessm-txt",
    fileName,
    fileHash,
    competitionName: parsed.metadata.competitionName,
    metadata: parsed.metadata,
    summary: parsed.summary,
    warnings: parsed.warnings,
    duplicateDetails: parsed.duplicateDetails.slice(0, 50),
    importedBy: actorUid,
    importedByEmail: actorEmail,
    importedAt: now,
    updatedAt: now
  }, { merge: false });
  batchSize += 1;

  parsed.clubs.forEach((club) => {
    const clubRef = importRef.collection("clubs").doc(club.code || stableHash(JSON.stringify(club)).slice(0, 20));
    batch.set(clubRef, {
      ...club,
      importId,
      updatedAt: now
    }, { merge: false });
    batchSize += 1;
    commitIfNeeded();
  });

  parsed.performances.forEach((perf) => {
    const perfId = stableHash([
      importId,
      perf.sourceLine,
      perf.swimmerId,
      perf.lastName,
      perf.firstName,
      perf.course,
      perf.time,
      perf.club
    ].join("|")).slice(0, 32);
    const perfRef = importRef.collection("performances").doc(perfId);
    batch.set(perfRef, {
      ...perf,
      performanceId: perfId,
      importId,
      competitionName: parsed.metadata.competitionName,
      importedBy: actorUid,
      importedAt: now,
      updatedAt: now,
      updatedBy: actorUid
    }, { merge: false });
    batchSize += 1;
    commitIfNeeded();
  });

  commitIfNeeded(true);
  await Promise.all(batches);

  await writeAuditLog("performanceImport.created", actorUid, {
    importId,
    fileName,
    fileHash,
    competitionName: parsed.metadata.competitionName,
    date: parsed.metadata.date,
    importedPerformances: parsed.summary.importedPerformances
  });

  return {
    ok: true,
    importId,
    sourceType: parsed.sourceType,
    metadata: parsed.metadata,
    summary: parsed.summary,
    warnings: parsed.warnings,
    duplicateDetails: parsed.duplicateDetails.slice(0, 50)
  };
});

exports.listCompetitionImports = onCall(CALLABLE_OPTIONS, async (request) => {
  assertCapability(request, "competitions.import");
  const snapshot = await admin.firestore()
    .collection("performanceImports")
    .orderBy("importedAt", "desc")
    .limit(50)
    .get();
  return {
    ok: true,
    imports: snapshot.docs.map((doc) => {
      const data = doc.data() || {};
      return {
        importId: doc.id,
        status: data.status || "",
        sourceType: data.sourceType || "",
        fileName: data.fileName || "",
        metadata: data.metadata || {},
        summary: data.summary || {},
        warnings: data.warnings || [],
        duplicateDetails: data.duplicateDetails || [],
        importedByEmail: data.importedByEmail || "",
        importedAt: data.importedAt || ""
      };
    })
  };
});

exports.listAdditionalPerformanceData = onCall(CALLABLE_OPTIONS, async (request) => {
  const importsSnapshot = await admin.firestore()
    .collection("performanceImports")
    .orderBy("importedAt", "desc")
    .limit(200)
    .get();

  const rawPerformances = [];
  for (const importDoc of importsSnapshot.docs) {
    const importData = importDoc.data() || {};
    if (importData.status !== "stored") continue;
    const metadata = importData.metadata || {};
    const performancesSnapshot = await importDoc.ref
      .collection("performances")
      .where("active", "==", true)
      .get();
    performancesSnapshot.docs.forEach((perfDoc) => {
      rawPerformances.push({
        id: perfDoc.id,
        importId: importDoc.id,
        metadata,
        competitionName: importData.competitionName || metadata.competitionName || "",
        importedAt: importData.importedAt || "",
        ...perfDoc.data()
      });
    });
  }

  const finalByImportLine = new Map();
  rawPerformances.forEach((perf) => {
    if (!perf.isIntermediate) {
      finalByImportLine.set(`${perf.importId}|${perf.sourceLine || perf.originSourceLine || ""}`, perf.performanceId || perf.id);
    }
  });

  const performances = rawPerformances
    .map((perf) => {
      const course = normalizeCourseCode(perf.course);
      if (!POOL_COURSES.includes(course)) return null;
      const sex = normalizeCategoryCode(perf.sex);
      if (sex !== "F" && sex !== "M") return null;
      const date = perf.date || perf.metadata?.date || "";
      const sourceCategory = perf.categoryCode || perf.importedCategoryCode || perf.classificationCategory || "";
      const category = ageCategoryFromDates(date, perf.birthDate) || fallbackCategoryFromSource(sourceCategory);
      if (!category) return null;
      const courseMeta = coursePayload(course);
      const performanceId = perf.performanceId || perf.id;
      const originPerformanceId = perf.originPerformanceId ||
        (perf.isIntermediate ? finalByImportLine.get(`${perf.importId}|${perf.originSourceLine || perf.sourceLine || ""}`) || "" : "");
      const originCourse = normalizeCourseCode(perf.originCourse);
      const originMeta = originCourse ? coursePayload(originCourse) : null;
      const swimmerMatch = resolveIntranapSwimmer(perf, sex);
      const matchedSwimmer = swimmerMatch.swimmer;
      const fallbackSwimmerId = `imported:${stableHash([perf.firstName, perf.lastName, perf.birthDate, sex].join("|")).slice(0, 16)}`;
      const swimmerId = matchedSwimmer?.id || cleanText(perf.swimmerId) || fallbackSwimmerId;
      const firstName = cleanText(matchedSwimmer?.firstName || perf.firstName);
      const lastName = cleanText(matchedSwimmer?.lastName || perf.lastName);
      const swimmerName = cleanText(matchedSwimmer?.name) || [firstName, lastName].filter(Boolean).join(" ").trim();

      return {
        id: `import:${perf.importId}:${performanceId}`,
        source: "livepalmes-import",
        importId: perf.importId,
        swimmerId,
        originalSwimmerId: cleanText(perf.swimmerId),
        swimmerMatchMethod: swimmerMatch.method,
        swimmer: swimmerName,
        firstName,
        lastName,
        birthDate: matchedSwimmer?.birthDate || perf.birthDate || "",
        sex,
        clubId: cleanText(perf.club),
        club: cleanText(perf.club) || cleanText(perf.clubName),
        clubName: cleanText(perf.clubName),
        regionId: cleanText(perf.regionId),
        regionLabel: cleanText(perf.regionId),
        competitionId: perf.importId,
        competition: perf.competitionName || perf.metadata?.competitionName || "",
        location: perf.location || perf.metadata?.location || "",
        date,
        seasonYear: perf.seasonYear || importSeasonYear(date),
        pool: perf.poolSize ? String(perf.poolSize) : "",
        chrono: "",
        course,
        courseLabel: courseMeta.label,
        courseShortLabel: courseMeta.shortLabel,
        style: courseMeta.style,
        length: courseMeta.length,
        isIntermediate: perf.isIntermediate === true,
        originCourse,
        originCourseShortLabel: originMeta?.shortLabel || "",
        originPerformanceId: originPerformanceId ? `import:${perf.importId}:${originPerformanceId}` : "",
        category,
        categoryCode: categoryCodeFromCategory(category, sex),
        categoryLabel: CATEGORY_LABELS[sex]?.[category] || category,
        timeValue: Number(perf.timeValue) || 0,
        time: cleanText(perf.time),
        intermediateTimes: Array.isArray(perf.intermediateTimes) ? perf.intermediateTimes : []
      };
    })
    .filter((perf) => perf && perf.timeValue > 0 && perf.date);

  const swimmersById = new Map();
  performances.forEach((perf) => {
    if (!swimmersById.has(perf.swimmerId)) {
      swimmersById.set(perf.swimmerId, {
        id: perf.swimmerId,
        name: perf.swimmer,
        lastName: perf.lastName,
        firstName: perf.firstName,
        birthDate: perf.birthDate,
        sex: perf.sex,
        clubId: perf.clubId,
        club: perf.club,
        clubName: perf.clubName,
        performanceCount: 0,
        chunk: "",
        source: "livepalmes-import"
      });
    }
    swimmersById.get(perf.swimmerId).performanceCount += 1;
  });

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    importCount: importsSnapshot.size,
    performanceCount: performances.length,
    swimmers: Array.from(swimmersById.values()),
    performances
  };
});
