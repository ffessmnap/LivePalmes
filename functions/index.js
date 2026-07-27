const crypto = require("node:crypto");
const admin = require("firebase-admin");
const { HttpsError, onCall } = require("firebase-functions/v2/https");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { consoleRoleClaims, hasConsolePortalCapability } = require("./console-access");
const intranapSwimmersReference = require("./intranap-swimmers-reference.json");
const { nextPublicResultsIndex } = require("./public-results-index");

admin.initializeApp();
admin.firestore().settings({ ignoreUndefinedProperties: true });

const REGION = "europe-west1";
const COMPETITION_IDS = new Set(["livepalmes-active", "livepalmes-test"]);
const ADMIN_UIDS = new Set(["AgvWJjvLOfe3uB0lz0Xr3wwJxzT2"]);
const ROLES = ["live", "speaker", "referee", "video", "computer", "secretary"];
const ROLE_SET = new Set(ROLES);
const ACCESS_CAPABILITIES = ["admin.full", "records.manage", "consoles.manage", "consoles.access", "competitions.import", "dtn.view"];
const ACCESS_CAPABILITY_SET = new Set(ACCESS_CAPABILITIES);
const HASH_ITERATIONS = 120000;
const HASH_BYTES = 32;
const CALLABLE_OPTIONS = { region: REGION, invoker: "public" };
const MIGRATION_CALLABLE_OPTIONS = { region: REGION, invoker: "public", timeoutSeconds: 540, memory: "1GiB" };
const PUBLIC_PERFORMANCE_CALLABLE_OPTIONS = { region: REGION, invoker: "public", timeoutSeconds: 120, memory: "1GiB" };
const PUBLIC_RESULT_TRIGGER_OPTIONS = {
  region: REGION,
  document: "competitions/{competitionId}/results/{resultId}",
  retry: true
};
const PIN_MAX_FAILED_ATTEMPTS = 5;
const PIN_LOCK_MS_BY_LEVEL = [2 * 60 * 1000, 5 * 60 * 1000];
const PUBLIC_PERFORMANCE_BUCKET = "livepalmes-public-data-718081132564";
const PUBLIC_ADDITIONAL_PERFORMANCE_PATH = "performance-public/additional-data.json";
const PUBLIC_ADDITIONAL_PERFORMANCE_TOKEN = "4a78ebdf-07b8-4f05-8d8c-0c6231a7ad5d";
const PUBLIC_PERFORMANCE_FILES_PATH = "performance-public-firestore";
const PUBLIC_PERFORMANCE_TOP_PREVIEW_LIMIT = 100;
const PERFORMANCE_BASE_COLLECTION = "performances";
const PERFORMANCE_BASE_CHANGES_COLLECTION = "performanceChanges";
const PERFORMANCE_BASE_MIGRATION_COLLECTION = "performanceMigrationJobs";
const PERFORMANCE_SWIMMERS_COLLECTION = "performanceSwimmerIndex";
const PERFORMANCE_SWIMMER_PAGES_COLLECTION = "performanceSwimmerPages";
const PERFORMANCE_SWIMMER_INDEX_STATE_COLLECTION = "performanceSwimmerIndexState";
const PERFORMANCE_TOP_BUCKETS_COLLECTION = "performanceTopViews";
const PERFORMANCE_TOP_INDEX_STATE_COLLECTION = "performanceTopIndexState";
const PERFORMANCE_TOP_INDEX_LIMIT = 500;
const DTN_QUALIFICATION_CACHE_COLLECTION = "dtnQualificationViews";
const DTN_QUALIFICATION_CACHE_STATE_COLLECTION = "dtnQualificationViewState";
const DTN_QUALIFICATION_CACHE_VERSION = 4;
const DTN_EDF_LIMOGES_COMPETITION_ID = "e40fe3129ffd5d76286774193a2855ed";
const DTN_EDF_COMPETITION_IDS_BY_SEASON = {
  2026: ["5039", "4978", "4979", DTN_EDF_LIMOGES_COMPETITION_ID]
};
const PERFORMANCE_SWIMMER_PAGE_SIZE = 500;
const PERFORMANCE_PUBLIC_DATA_URL = "https://livepalmes.web.app/performances/public/data";
const PERFORMANCE_BASE_MIGRATION_BATCH_SIZE = 2000;
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

function cleanFirestoreValue(value) {
  if (value === undefined || typeof value === "function") return undefined;
  if (value === null) return null;
  if (Array.isArray(value)) {
    return value
      .map(cleanFirestoreValue)
      .filter((item) => item !== undefined);
  }
  if (value && typeof value === "object") {
    return Object.entries(value).reduce((acc, [key, item]) => {
      const cleaned = cleanFirestoreValue(item);
      if (cleaned !== undefined) acc[key] = cleaned;
      return acc;
    }, {});
  }
  return value;
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
  const adminFallbackAllowed = capability !== "dtn.view" && capabilities["admin.full"] === true;
  if (!ADMIN_UIDS.has(uid) && !adminFallbackAllowed && capabilities[capability] !== true) {
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

function displayNameFromProfile(profile = {}) {
  return [cleanText(profile.firstName), cleanText(profile.lastName)].filter(Boolean).join(" ");
}

async function accessUserDisplayName(uid, fallbackToken = {}) {
  const cleanUid = cleanText(uid);
  if (!cleanUid) return "";
  const snapshot = await admin.firestore().collection("users").doc(cleanUid).get().catch(() => null);
  const data = snapshot?.exists ? snapshot.data() || {} : {};
  return displayNameFromProfile(data) || cleanText(fallbackToken.name);
}

async function userByEmailOrCreate(profile) {
  const displayName = displayNameFromProfile(profile);
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

function swimmerIdentityKey(firstName, lastName, birthDate) {
  const first = normalizeIdentityText(firstName);
  const last = normalizeIdentityText(lastName);
  const birth = cleanText(birthDate);
  if (!first || !last || !birth) return "";
  return `${last}|${first}|${birth}`;
}

function canonicalSwimmerId(ids) {
  return ids
    .map((id) => cleanText(id))
    .filter(Boolean)
    .sort((a, b) => Number(a) - Number(b) || a.localeCompare(b, "fr-FR", { numeric: true }))[0] || "";
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
  const year = importSeasonYear(competitionDate) || competitionYear(competitionDate);
  const born = birthYear(birthDate);
  const age = year && born ? year - born : null;
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

function performanceCategoryFromRow(row = {}, dateOverride = "") {
  const date = cleanText(dateOverride || row.date || row.metadata?.date);
  return ageCategoryFromDates(date, row.birthDate) ||
    cleanText(row.category) ||
    fallbackCategoryFromSource(row.categoryCode || row.categoryLabel || row.importedCategoryCode || row.classificationCategory);
}

function fallbackCategoryFromSource(sourceCategory) {
  const code = normalizeCategoryCode(sourceCategory);
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

function importPerformanceCategory(perf = {}) {
  return ageCategoryFromDates(perf.date, perf.birthDate) ||
    fallbackCategoryFromSource(perf.categoryCode || perf.importedCategoryCode || perf.classificationCategory);
}

async function loadPerformanceRecordsData() {
  const snapshot = await admin.firestore()
    .collection("competitions")
    .doc("livepalmes-active")
    .collection("performanceData")
    .doc("records")
    .get();
  return snapshot.exists ? snapshot.data() || {} : {};
}

function recordReferenceRows(recordsData = {}) {
  return [
    ...(Array.isArray(recordsData.franceRecords) ? recordsData.franceRecords : []).map((row) => ({
      ...row,
      alertType: row.recordType === "RFJ" ? "RFJ" : "RF",
      alertLabel: row.recordType === "RFJ" ? "Record de France Jeunes" : "Record de France"
    })),
    ...(Array.isArray(recordsData.records) ? recordsData.records : []).map((row) => ({
      ...row,
      alertType: "MPF",
      alertLabel: "Meilleure Performance Francaise"
    }))
  ].filter((row) =>
    !String(row.course || "").startsWith("4X") &&
    normalizeCourseCode(row.course) &&
    (row.sex === "F" || row.sex === "M") &&
    Number(row.value || 0) > 0 &&
    cleanText(row.time) &&
    cleanText(row.time) !== "A etablir" &&
    cleanText(row.time) !== "À établir"
  );
}

function recordReferenceKey(row = {}) {
  return [
    cleanText(row.alertType || row.recordType || "MPF"),
    cleanText(row.sex),
    cleanText(row.alertType) === "MPF" ? cleanText(row.category) : "",
    normalizeCourseCode(row.course)
  ].join("|");
}

function recordReferenceMap(recordsData = {}) {
  const byKey = new Map();
  recordReferenceRows(recordsData).forEach((row) => {
    const key = recordReferenceKey(row);
    const existing = byKey.get(key);
    if (!existing || Number(row.value || 0) < Number(existing.value || 0)) byKey.set(key, row);
  });
  return byKey;
}

function recordReferenceForPerformance(referenceMap, type, perf, category) {
  const sex = normalizeCategoryCode(perf.sex);
  const course = normalizeCourseCode(perf.course);
  const key = [type, sex, type === "MPF" ? category : "", course].join("|");
  return referenceMap.get(key) || null;
}

function isYouthCategory(category) {
  return ["P", "B", "M", "C", "J"].includes(cleanText(category));
}

function normalizedRecordAlertName(value) {
  const normalized = normalizeIdentityText(value);
  if (!normalized) return "";
  return normalized.split(/\s+/).filter(Boolean).sort().join(" ");
}

function sameRecordAlertSwimmer(left, right) {
  const leftRaw = normalizeIdentityText(left);
  const rightRaw = normalizeIdentityText(right);
  if (!leftRaw || !rightRaw) return false;
  return leftRaw === rightRaw || normalizedRecordAlertName(leftRaw) === normalizedRecordAlertName(rightRaw);
}

function isAlreadyPublishedRecordAlert(alert = {}) {
  return cleanText(alert.status) === "equal" &&
    Number(alert.timeValue || 0) === Number(alert.referenceValue || 0) &&
    sameRecordAlertSwimmer(alert.swimmer, alert.referenceSwimmer);
}

function buildRecordAlert(perf, category, reference) {
  const timeValue = Number(perf.timeValue || 0);
  const referenceValue = Number(reference.value || 0);
  if (!timeValue || !referenceValue || timeValue > referenceValue) return null;
  const status = timeValue < referenceValue ? "improved" : "equal";
  const sourceLine = Number(perf.sourceLine || perf.originSourceLine || 0) || "";
  const swimmer = [perf.firstName, perf.lastName].filter(Boolean).join(" ").trim();
  const referenceSwimmer = cleanText(reference.swimmer);
  if (status === "equal" && sameRecordAlertSwimmer(swimmer, referenceSwimmer)) return null;
  return {
    type: reference.alertType,
    label: reference.alertLabel,
    status,
    swimmer,
    firstName: cleanText(perf.firstName),
    lastName: cleanText(perf.lastName),
    birthDate: cleanText(perf.birthDate),
    sex: normalizeCategoryCode(perf.sex),
    category,
    categoryCode: categoryCodeFromCategory(category, normalizeCategoryCode(perf.sex)),
    course: normalizeCourseCode(perf.course),
    time: cleanText(perf.time) || formatTimeValue(timeValue),
    timeValue,
    referenceTime: cleanText(reference.time) || formatTimeValue(referenceValue),
    referenceValue,
    referenceSwimmer,
    referenceDate: cleanText(reference.date),
    referenceLocation: cleanText(reference.location),
    referenceKey: cleanText(reference.key),
    date: cleanText(perf.date),
    location: cleanText(perf.location),
    club: cleanText(perf.club),
    clubName: cleanText(perf.clubName),
    isIntermediate: perf.isIntermediate === true,
    originCourse: normalizeCourseCode(perf.originCourse),
    originTime: cleanText(perf.originTime),
    splitCode: cleanText(perf.splitCode),
    splitDistance: Number(perf.splitDistance || 0) || "",
    sourceLine
  };
}

function detectRecordAlerts(performances = [], recordsData = {}) {
  const referenceMap = recordReferenceMap(recordsData);
  const alerts = [];
  const seen = new Set();
  performances.forEach((perf) => {
    const timeValue = Number(perf.timeValue || 0);
    const sex = normalizeCategoryCode(perf.sex);
    const course = normalizeCourseCode(perf.course);
    if (!timeValue || (sex !== "F" && sex !== "M") || !POOL_COURSES.includes(course)) return;
    const category = importPerformanceCategory(perf);
    if (!category) return;
    const candidates = [
      recordReferenceForPerformance(referenceMap, "MPF", perf, category),
      recordReferenceForPerformance(referenceMap, "RF", perf, category),
      isYouthCategory(category) ? recordReferenceForPerformance(referenceMap, "RFJ", perf, category) : null
    ].filter(Boolean);
    candidates.forEach((reference) => {
      const alert = buildRecordAlert(perf, category, reference);
      if (!alert) return;
      const key = [
        alert.type,
        alert.course,
        alert.sex,
        alert.category,
        alert.timeValue,
        alert.swimmer,
        alert.date,
        alert.sourceLine,
        alert.isIntermediate ? alert.originCourse : ""
      ].join("|");
      if (seen.has(key)) return;
      seen.add(key);
      alerts.push(alert);
    });
  });
  return alerts.sort((a, b) =>
    ["RF", "RFJ", "MPF"].indexOf(a.type) - ["RF", "RFJ", "MPF"].indexOf(b.type) ||
    a.course.localeCompare(b.course, "fr-FR", { numeric: true }) ||
    a.timeValue - b.timeValue
  );
}

function buildIntranapSwimmerReference() {
  const byId = new Map();
  const byIdentity = new Map();
  const groupedByIdentity = new Map();
  intranapSwimmersReference.forEach((swimmer) => {
    const key = swimmerIdentityKey(swimmer.firstName, swimmer.lastName, swimmer.birthDate);
    if (!key) return;
    if (!groupedByIdentity.has(key)) groupedByIdentity.set(key, []);
    groupedByIdentity.get(key).push(swimmer);
  });
  groupedByIdentity.forEach((group, key) => {
    const canonicalId = canonicalSwimmerId(group.map((swimmer) => swimmer.id));
    const canonical = group.find((swimmer) => String(swimmer.id) === String(canonicalId)) || group[0];
    const merged = {
      ...canonical,
      id: String(canonicalId || canonical.id),
      identityKey: key,
      aliases: group.map((swimmer) => String(swimmer.id)).filter((id) => id && id !== String(canonicalId)),
      sourceIds: group.map((swimmer) => String(swimmer.id)).filter(Boolean)
    };
    byIdentity.set(key, merged);
    group.forEach((swimmer) => byId.set(String(swimmer.id), merged));
  });
  intranapSwimmersReference.forEach((swimmer) => {
    if (!byId.has(String(swimmer.id))) byId.set(String(swimmer.id), swimmer);
  });
  return { byId, byIdentity };
}

const intranapSwimmerLookup = buildIntranapSwimmerReference();

function resolveIntranapSwimmer(perf, sex) {
  const rawId = cleanText(perf.swimmerId);
  const byIdMatch = rawId ? intranapSwimmerLookup.byId.get(rawId) : null;
  if (byIdMatch) return { swimmer: byIdMatch, method: "id" };

  const key = swimmerIdentityKey(perf.firstName, perf.lastName, perf.birthDate);
  if (!key) return { swimmer: null, method: "none" };
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

async function assertConsolePortalAccess(request) {
  const uid = cleanText(request.auth?.uid);
  if (!uid) {
    throw new HttpsError("unauthenticated", "Connexion au portail LivePalmes requise.");
  }
  if (ADMIN_UIDS.has(uid)) return;
  const token = request.auth?.token || {};
  if (token.livepalmesAccess !== true || !hasConsolePortalCapability(token.livepalmesCapabilities || {})) {
    throw new HttpsError("permission-denied", "Acces aux consoles LivePalmes requis.");
  }
  const snapshot = await admin.firestore().collection("users").doc(uid).get();
  const data = snapshot.exists ? snapshot.data() || {} : {};
  if (!snapshot.exists || data.status !== "active" || !hasConsolePortalCapability(data.capabilities || {})) {
    throw new HttpsError("permission-denied", "Acces aux consoles LivePalmes inactif.");
  }
}

exports.syncOfficialResultToPublicIndex = onDocumentUpdated(PUBLIC_RESULT_TRIGGER_OPTIONS, async (event) => {
  const competitionId = cleanText(event.params?.competitionId);
  const resultId = cleanText(event.params?.resultId);
  if (!COMPETITION_IDS.has(competitionId) || !resultId || !event.data?.after?.exists) return;
  const officialResult = event.data.after.data() || {};
  const indexRef = admin.firestore()
    .collection("competitions")
    .doc(competitionId)
    .collection("public")
    .doc("resultsIndex");
  await admin.firestore().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(indexRef);
    if (!snapshot.exists) return;
    const nextIndex = nextPublicResultsIndex(snapshot.data() || {}, resultId, officialResult);
    if (!nextIndex) return;
    transaction.update(indexRef, nextIndex);
  });
});

exports.setRolePins = onCall(CALLABLE_OPTIONS, async (request) => {
  assertCapability(request, "consoles.manage");
  const competitionId = competitionIdFrom(request.data || {});
  if (request.data?.enabled === false) {
    throw new HttpsError("failed-precondition", "Les codes PIN des consoles ne peuvent plus etre desactives.");
  }
  const enabled = true;
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
  await assertConsolePortalAccess(request);
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
  const authUser = await admin.auth().getUser(uid);
  await admin.auth().setCustomUserClaims(uid, consoleRoleClaims(
    authUser.customClaims || {},
    role,
    competitionId
  ));
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
    livepalmesConsoleAccess: hasConsolePortalCapability(capabilityMap),
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
    livepalmesConsoleAccess: status === "active" && hasConsolePortalCapability(capabilitiesMap(capabilities)),
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

exports.updateCurrentAccountEmail = onCall(CALLABLE_OPTIONS, async (request) => {
  await assertLivePalmesAccess(request);
  const uid = cleanText(request.auth?.uid);
  const email = normalizeEmail(request.data?.email);
  assertEmail(email);

  const authTime = Number(request.auth?.token?.auth_time || 0) * 1000;
  if (!authTime || Date.now() - authTime > 5 * 60 * 1000) {
    throw new HttpsError("failed-precondition", "Reconnexion recente requise.");
  }

  const authUser = await admin.auth().getUser(uid);
  const previousEmail = normalizeEmail(authUser.email);
  const userRef = admin.firestore().collection("users").doc(uid);
  const userSnapshot = await userRef.get();
  const userData = userSnapshot.exists ? userSnapshot.data() || {} : {};
  const capabilities = ADMIN_UIDS.has(uid)
    ? ACCESS_CAPABILITIES
    : activeCapabilitiesFromMap(userData.capabilities || request.auth?.token?.livepalmesCapabilities || {});
  const now = new Date().toISOString();

  if (email !== previousEmail) {
    try {
      await admin.auth().updateUser(uid, { email, emailVerified: false });
    } catch (error) {
      if (error?.code === "auth/email-already-exists") {
        throw new HttpsError("already-exists", "Cette adresse email est deja utilisee.");
      }
      if (error?.code === "auth/invalid-email") {
        throw new HttpsError("invalid-argument", "Email invalide.");
      }
      throw error;
    }
  }

  try {
    const batch = admin.firestore().batch();
    batch.set(userRef, {
      uid,
      email,
      status: userData.status || "active",
      updatedAt: now,
      updatedBy: uid,
      ...(!userSnapshot.exists ? { createdAt: now, createdBy: uid } : {})
    }, { merge: true });
    ACCESS_CAPABILITIES.forEach((capability) => {
      const grantRef = admin.firestore().collection("accessGrants").doc(`${uid}_${capability.replace(".", "_")}`);
      batch.set(grantRef, {
        uid,
        email,
        capability,
        scopeType: "national",
        scopeId: "",
        status: capabilities.includes(capability) ? "active" : "inactive",
        updatedAt: now,
        updatedBy: uid,
        createdAt: now
      }, { merge: true });
    });
    await batch.commit();
  } catch (error) {
    if (email !== previousEmail && previousEmail) {
      await admin.auth().updateUser(uid, { email: previousEmail }).catch((rollbackError) => {
        console.error("Rollback email compte impossible", rollbackError);
      });
    }
    throw new HttpsError("internal", "La mise a jour du profil LivePalmes a echoue.");
  }

  await writeAuditLog("accessUser.emailUpdated", uid, {
    uid,
    previousEmail,
    email
  }).catch((error) => console.warn("Journalisation du changement d'email impossible", error));

  return {
    ok: true,
    uid,
    email,
    verificationRequired: true
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
  const existingData = existing.exists ? existing.data() || {} : {};
  const recordAlerts = detectRecordAlerts(parsed.performances, await loadPerformanceRecordsData());
  return {
    ok: true,
    importId,
    alreadyImported: existing.exists && existingData.status !== "deleted",
    fileHash,
    sourceType: parsed.sourceType,
    metadata: parsed.metadata,
    summary: parsed.summary,
    warnings: parsed.warnings,
    recordAlerts: recordAlerts.slice(0, 100),
    recordAlertCount: recordAlerts.length,
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
  const recordAlerts = detectRecordAlerts(parsed.performances, await loadPerformanceRecordsData());
  if (confirmImportId && confirmImportId !== importId) {
    throw new HttpsError("invalid-argument", "Le fichier ne correspond plus a la previsualisation.");
  }

  const importRef = admin.firestore().collection("performanceImports").doc(importId);
  const existing = await importRef.get();
  const existingData = existing.exists ? existing.data() || {} : {};
  if (existing.exists && existingData.status !== "deleted" && request.data?.overwrite !== true) {
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

  const rawImportedPerformances = [];

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
    recordAlerts: recordAlerts.slice(0, 100),
    recordAlertCount: recordAlerts.length,
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
    const storedPerf = {
      ...perf,
      performanceId: perfId,
      importId,
      competitionName: parsed.metadata.competitionName,
      metadata: parsed.metadata,
      importedBy: actorUid,
      importedAt: now,
      updatedAt: now,
      updatedBy: actorUid
    };
    rawImportedPerformances.push({
      id: perfId,
      ...storedPerf
    });
    batch.set(perfRef, storedPerf, { merge: false });
    batchSize += 1;
    commitIfNeeded();
  });

  commitIfNeeded(true);
  await Promise.all(batches);

  let performanceBaseSync = null;
  const normalizedImportedPerformances = normalizeLivePalmesImportPerformances(rawImportedPerformances);
  try {
    performanceBaseSync = await writePerformanceBaseRows(normalizedImportedPerformances, {
      actorUid,
      actorEmail,
      now,
      importId,
      action: "performanceImport.synced",
      changeSeed: importId
    });
    await importRef.set({
      performanceBaseSyncedAt: now,
      performanceBaseCount: performanceBaseSync.written
    }, { merge: true });
  } catch (error) {
    console.error("Synchronisation performances impossible apres import", {
      importId,
      message: error?.message || String(error)
    });
    performanceBaseSync = {
      ok: false,
      error: error?.message || "Synchronisation performances impossible."
    };
  }

  await writeAuditLog("performanceImport.created", actorUid, {
    importId,
    fileName,
    fileHash,
    competitionName: parsed.metadata.competitionName,
    date: parsed.metadata.date,
    importedPerformances: parsed.summary.importedPerformances,
    performanceBaseSync
  });

  let publicSnapshot = null;
  try {
    publicSnapshot = await publishIncrementalPerformanceImport(normalizedImportedPerformances, importId);
  } catch (error) {
    console.warn("Publication publique des performances LivePalmes impossible", error);
    publicSnapshot = {
      ok: false,
      error: error?.message || String(error)
    };
  }

  let publicFilesSnapshot = null;
  try {
    publicFilesSnapshot = await publishIncrementalPublicPerformanceFiles(normalizedImportedPerformances, {
      importId,
      now
    });
  } catch (error) {
    console.warn("Publication publique incrementale des fichiers performances impossible", error);
    publicFilesSnapshot = {
      ok: false,
      error: error?.message || String(error)
    };
  }

  return {
    ok: true,
    importId,
    sourceType: parsed.sourceType,
    metadata: parsed.metadata,
    summary: parsed.summary,
    warnings: parsed.warnings,
    recordAlerts: recordAlerts.slice(0, 100),
    recordAlertCount: recordAlerts.length,
    duplicateDetails: parsed.duplicateDetails.slice(0, 50),
    performanceBaseSync,
    publicSnapshot,
    publicFilesSnapshot
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
      const recordAlerts = Array.isArray(data.recordAlerts)
        ? data.recordAlerts.filter((alert) => !isAlreadyPublishedRecordAlert(alert))
        : [];
      return {
        importId: doc.id,
        status: data.status || "",
        sourceType: data.sourceType || "",
        fileName: data.fileName || "",
        metadata: data.metadata || {},
        summary: data.summary || {},
        warnings: data.warnings || [],
        recordAlertCount: recordAlerts.length,
        recordAlerts: recordAlerts.slice(0, 20),
        duplicateDetails: data.duplicateDetails || [],
        importedByEmail: data.importedByEmail || "",
        importedAt: data.importedAt || ""
      };
    })
  };
});

async function markCompetitionImportDeleted(importId, context = {}) {
  const db = admin.firestore();
  const now = context.now || new Date().toISOString();
  const importRef = db.collection("performanceImports").doc(importId);
  const importDoc = await importRef.get();
  if (!importDoc.exists) {
    throw new HttpsError("not-found", "Import introuvable.");
  }
  const importData = importDoc.data() || {};
  if (importData.status === "deleted") {
    return {
      ok: true,
      alreadyDeleted: true,
      importId,
      importPerformanceCount: 0,
      performanceBaseCount: 0
    };
  }

  let batch = db.batch();
  let batchSize = 0;
  const commits = [];
  function commitIfNeeded(force = false) {
    if (batchSize >= 450 || (force && batchSize > 0)) {
      commits.push(batch.commit());
      batch = db.batch();
      batchSize = 0;
    }
  }

  batch.set(importRef, {
    status: "deleted",
    deletedAt: now,
    deletedBy: context.actorUid || "",
    deletedByEmail: context.actorEmail || "",
    updatedAt: now
  }, { merge: true });
  batchSize += 1;

  const importPerformancesSnapshot = await importRef.collection("performances").get();
  importPerformancesSnapshot.docs.forEach((doc) => {
    batch.set(doc.ref, {
      active: false,
      status: "deleted",
      deletedAt: now,
      deletedBy: context.actorUid || "",
      updatedAt: now
    }, { merge: true });
    batchSize += 1;
    commitIfNeeded();
  });

  const performanceBaseSnapshot = await db.collection(PERFORMANCE_BASE_COLLECTION)
    .where("importId", "==", importId)
    .get();
  const performanceBaseDocs = performanceBaseSnapshot.docs
    .filter((doc) => (doc.data() || {}).source === "livepalmes-import");
  const affectedRows = performanceBaseDocs.map((doc) => ({
    performanceBaseId: doc.id,
    ...(doc.data() || {})
  }));
  performanceBaseDocs.forEach((doc) => {
    const data = doc.data() || {};
    batch.set(doc.ref, {
      active: false,
      status: "deleted",
      deletedAt: now,
      deletedBy: context.actorUid || "",
      deletedByEmail: context.actorEmail || "",
      updatedAt: now,
      updatedBy: context.actorUid || "",
      updatedByEmail: context.actorEmail || "",
      sourceAction: "performanceImport.deleted"
    }, { merge: true });
    const changeId = stableHash([doc.id, "performanceImport.deleted", now, importId].join("|")).slice(0, 40);
    batch.set(db.collection(PERFORMANCE_BASE_CHANGES_COLLECTION).doc(changeId), {
      performanceBaseId: doc.id,
      publicKey: cleanText(data.publicKey),
      action: "performanceImport.deleted",
      importId,
      status: "deleted",
      row: cleanFirestoreValue({
        ...data,
        performanceBaseId: doc.id,
        active: false,
        status: "deleted"
      }),
      actorUid: context.actorUid || "",
      actorEmail: context.actorEmail || "",
      createdAt: now
    }, { merge: false });
    batchSize += 2;
    commitIfNeeded();
  });

  commitIfNeeded(true);
  await Promise.all(commits);
  return {
    ok: true,
    importId,
    importPerformanceCount: importPerformancesSnapshot.size,
    performanceBaseCount: performanceBaseDocs.length,
    affectedRows
  };
}

exports.deleteCompetitionImport = onCall(PUBLIC_PERFORMANCE_CALLABLE_OPTIONS, async (request) => {
  assertCapability(request, "competitions.import");
  const importId = cleanText(request.data?.importId).slice(0, 160);
  if (!importId) {
    throw new HttpsError("invalid-argument", "Import inconnu.");
  }
  const now = new Date().toISOString();
  const actorUid = request.auth.uid;
  const actorEmail = request.auth.token?.email || "";
  const result = await markCompetitionImportDeleted(importId, {
    now,
    actorUid,
    actorEmail
  });
  await touchDtnQualificationCacheState(result.affectedRows || [], {
    action: "performanceImport.deleted",
    now
  });

  let publicSnapshot = null;
  try {
    publicSnapshot = await publishAdditionalPerformanceDataSnapshot();
  } catch (error) {
    console.error("Publication publique impossible apres suppression import", {
      importId,
      message: error?.message || String(error)
    });
    publicSnapshot = {
      ok: false,
      error: error?.message || "Publication publique impossible."
    };
  }

  let publicFilesSnapshot = null;
  try {
    publicFilesSnapshot = await rebuildPublicPerformanceFilesForAffectedRows(result.affectedRows || [], {
      now,
      reason: "performanceImport.deleted",
      importId
    });
  } catch (error) {
    console.error("Publication publique ciblee impossible apres suppression import", {
      importId,
      message: error?.message || String(error)
    });
    publicFilesSnapshot = {
      ok: false,
      error: error?.message || "Publication publique ciblee impossible."
    };
  }

  await writeAuditLog("performanceImport.deleted", actorUid, {
    importId,
    actorEmail,
    importPerformanceCount: result.importPerformanceCount,
    performanceBaseCount: result.performanceBaseCount,
    publicSnapshot,
    publicFilesSnapshot
  });

  const { affectedRows, ...publicResult } = result;
  return {
    ...publicResult,
    publicSnapshot,
    publicFilesSnapshot
  };
});

exports.updateCompetitionImportRecordAlertDecision = onCall(CALLABLE_OPTIONS, async (request) => {
  assertCapability(request, "competitions.import");
  const importId = cleanText(request.data?.importId).slice(0, 160);
  const alertIndex = Number(request.data?.alertIndex);
  const status = cleanText(request.data?.status);
  const allowedStatuses = new Set(["pending", "accepted", "rejected"]);
  if (!importId) {
    throw new HttpsError("invalid-argument", "Import inconnu.");
  }
  if (!Number.isInteger(alertIndex) || alertIndex < 0) {
    throw new HttpsError("invalid-argument", "Alerte inconnue.");
  }
  if (!allowedStatuses.has(status)) {
    throw new HttpsError("invalid-argument", "Decision inconnue.");
  }

  const importRef = admin.firestore().collection("performanceImports").doc(importId);
  const importDoc = await importRef.get();
  if (!importDoc.exists) {
    throw new HttpsError("not-found", "Import introuvable.");
  }
  const data = importDoc.data() || {};
  const recordAlerts = Array.isArray(data.recordAlerts) ? data.recordAlerts.slice() : [];
  if (!recordAlerts[alertIndex]) {
    throw new HttpsError("not-found", "Alerte introuvable.");
  }

  const now = new Date().toISOString();
  const updatedByName = await accessUserDisplayName(request.auth.uid, request.auth.token || {});
  const nextAlert = { ...recordAlerts[alertIndex] };
  if (status === "pending") {
    delete nextAlert.decision;
  } else {
    nextAlert.decision = {
      status,
      updatedAt: now,
      updatedBy: request.auth.uid,
      updatedByEmail: request.auth.token?.email || "",
      updatedByName
    };
  }
  recordAlerts[alertIndex] = cleanFirestoreValue(nextAlert);

  await importRef.set({
    recordAlerts,
    recordAlertDecisionUpdatedAt: now,
    updatedAt: now
  }, { merge: true });

  await writeAuditLog("performanceImport.recordAlertDecision", request.auth.uid, {
    importId,
    alertIndex,
    status,
    alert: {
      type: nextAlert.type || "",
      swimmer: nextAlert.swimmer || "",
      course: nextAlert.course || "",
      time: nextAlert.time || "",
      referenceTime: nextAlert.referenceTime || ""
    }
  });

  return {
    ok: true,
    importId,
    alertIndex,
    status,
    recordAlerts: recordAlerts.slice(0, 20)
  };
});

function performancePublicKey(row = {}) {
  if (row.publicKey) return cleanText(row.publicKey);
  if (row.id) return `${row.source || "intranap"}|${row.id}`;
  return [
    row.swimmerIdentityKey || row.swimmerId || row.swimmer,
    row.date,
    row.course,
    row.timeValue,
    row.club || row.clubName,
    row.competitionId || row.location
  ].map((value) => cleanText(value)).join("|");
}

function performanceBaseDocId(row = {}) {
  return stableHash(performancePublicKey(row)).slice(0, 40);
}

function normalizeLivePalmesImportPerformances(rawPerformances = []) {
  const finalByImportLine = new Map();
  rawPerformances.forEach((perf) => {
    if (!perf.isIntermediate) {
      finalByImportLine.set(`${perf.importId}|${perf.sourceLine || perf.originSourceLine || ""}`, perf.performanceId || perf.id);
    }
  });

  return rawPerformances
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
      const identityKey = swimmerIdentityKey(perf.firstName, perf.lastName, perf.birthDate);
      const fallbackSwimmerId = `imported:${stableHash(identityKey || [perf.firstName, perf.lastName, perf.birthDate].join("|")).slice(0, 16)}`;
      const swimmerId = matchedSwimmer?.id || fallbackSwimmerId;
      const firstName = cleanText(matchedSwimmer?.firstName || perf.firstName);
      const lastName = cleanText(matchedSwimmer?.lastName || perf.lastName);
      const swimmerName = cleanText(matchedSwimmer?.name) || [firstName, lastName].filter(Boolean).join(" ").trim();

      return {
        id: `import:${perf.importId}:${performanceId}`,
        source: "livepalmes-import",
        importId: perf.importId,
        swimmerId,
        aliases: Array.isArray(matchedSwimmer?.aliases) ? matchedSwimmer.aliases : [],
        sourceIds: Array.isArray(matchedSwimmer?.sourceIds) ? matchedSwimmer.sourceIds : [swimmerId],
        originalSwimmerId: cleanText(perf.swimmerId),
        swimmerIdentityKey: matchedSwimmer?.identityKey || identityKey,
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
}

function cleanPerformanceBaseRow(row = {}, status = "active") {
  const course = normalizeCourseCode(row.course);
  const courseMeta = coursePayload(course);
  const sex = normalizeCategoryCode(row.sex);
  const date = cleanText(row.date);
  const category = performanceCategoryFromRow(row, date);
  const seasonYear = Number(row.seasonYear || 0) || importSeasonYear(date);
  return cleanFirestoreValue({
    ...row,
    source: cleanText(row.source || "livepalmes"),
    course,
    courseLabel: cleanText(row.courseLabel || courseMeta.label),
    courseShortLabel: cleanText(row.courseShortLabel || courseMeta.shortLabel),
    style: cleanText(row.style || courseMeta.style),
    length: Number(row.length || courseMeta.length || 0) || 0,
    sex,
    category,
    categoryCode: cleanText(categoryCodeFromCategory(category, sex) || row.categoryCode),
    categoryLabel: cleanText(CATEGORY_LABELS[sex]?.[category] || row.categoryLabel || category),
    date,
    seasonYear,
    timeValue: Number(row.timeValue || 0) || 0,
    time: cleanText(row.time),
    publicKey: performancePublicKey(row),
    status,
    active: status === "active",
    baseVersion: 1
  });
}

async function writePerformanceBaseRows(rows = [], context = {}) {
  const db = admin.firestore();
  const now = context.now || new Date().toISOString();
  const logChanges = context.logChanges !== false;
  let batch = db.batch();
  let batchSize = 0;
  let written = 0;
  const commits = [];

  function commitIfNeeded(force = false) {
    if (batchSize >= 450 || (force && batchSize > 0)) {
      commits.push(batch.commit());
      batch = db.batch();
      batchSize = 0;
    }
  }

  rows.forEach((inputRow) => {
    const status = inputRow.status || context.status || "active";
    const row = cleanPerformanceBaseRow(inputRow, status);
    const docId = performanceBaseDocId(row);
    const ref = db.collection(PERFORMANCE_BASE_COLLECTION).doc(docId);
    batch.set(ref, {
      ...row,
      performanceBaseId: docId,
      updatedAt: now,
      updatedBy: context.actorUid || "",
      updatedByEmail: context.actorEmail || "",
      sourceAction: context.action || "sync"
    }, { merge: true });
    batchSize += 1;
    written += 1;

    if (logChanges) {
      const changeId = stableHash([docId, context.action || "sync", now, context.changeSeed || "", written].join("|")).slice(0, 40);
      const changeRef = db.collection(PERFORMANCE_BASE_CHANGES_COLLECTION).doc(changeId);
      batch.set(changeRef, {
        performanceBaseId: docId,
        publicKey: row.publicKey,
        action: context.action || "sync",
        importId: row.importId || context.importId || "",
        status,
        row,
        actorUid: context.actorUid || "",
        actorEmail: context.actorEmail || "",
        createdAt: now
      }, { merge: false });
      batchSize += 1;
    }
    commitIfNeeded();
  });

  commitIfNeeded(true);
  await Promise.all(commits);
  await touchDtnQualificationCacheState([
    ...rows,
    ...(Array.isArray(context.dtnInvalidationRows) ? context.dtnInvalidationRows : [])
  ], {
    action: context.action || "performanceBase.updated",
    now
  });
  return { ok: true, written };
}

function publicPerformanceBaseRow(row = {}) {
  const sex = normalizeCategoryCode(row.sex);
  const date = cleanText(row.date);
  const category = performanceCategoryFromRow(row, date);
  return cleanFirestoreValue({
    id: cleanText(row.id),
    source: cleanText(row.source || "livepalmes"),
    importId: cleanText(row.importId),
    publicKey: cleanText(row.publicKey),
    performanceBaseId: cleanText(row.performanceBaseId),
    status: cleanText(row.status || "active"),
    active: row.active !== false && row.status !== "hidden",
    swimmerId: cleanText(row.swimmerId),
    originalSwimmerId: cleanText(row.originalSwimmerId),
    swimmerIdentityKey: cleanText(row.swimmerIdentityKey),
    swimmer: cleanText(row.swimmer),
    firstName: cleanText(row.firstName),
    lastName: cleanText(row.lastName),
    birthDate: cleanText(row.birthDate),
    sex,
    clubId: cleanText(row.clubId),
    club: cleanText(row.club),
    clubName: cleanText(row.clubName),
    regionId: cleanText(row.regionId),
    regionLabel: cleanText(row.regionLabel),
    competitionId: cleanText(row.competitionId),
    competition: cleanText(row.competition),
    location: cleanText(row.location),
    date,
    seasonYear: Number(row.seasonYear || 0) || 0,
    pool: cleanText(row.pool),
    chrono: cleanText(row.chrono),
    course: cleanText(row.course),
    courseLabel: cleanText(row.courseLabel),
    courseShortLabel: cleanText(row.courseShortLabel),
    style: cleanText(row.style),
    length: Number(row.length || 0) || 0,
    isIntermediate: row.isIntermediate === true,
    originCourse: cleanText(row.originCourse),
    originCourseShortLabel: cleanText(row.originCourseShortLabel),
    originPerformanceId: cleanText(row.originPerformanceId),
    category,
    categoryCode: cleanText(categoryCodeFromCategory(category, sex) || row.categoryCode),
    categoryLabel: cleanText(CATEGORY_LABELS[sex]?.[category] || row.categoryLabel || category),
    timeValue: Number(row.timeValue || 0) || 0,
    time: cleanText(row.time),
    points: cleanText(row.points),
    rank: cleanText(row.rank),
    intermediateTimes: Array.isArray(row.intermediateTimes)
      ? row.intermediateTimes.map((split) => ({
        code: cleanText(split?.code),
        distance: Number(split?.distance || 0) || 0,
        time: cleanText(split?.time),
        timeValue: Number(split?.timeValue || 0) || 0
      })).filter((split) => split.time)
      : []
  });
}

function uniquePublicPerformanceRows(rows = []) {
  const byKey = new Map();
  rows.forEach((row) => {
    const key = cleanText(row.publicKey || performancePublicKey(row) || row.performanceBaseId || row.id);
    if (!key) return;
    byKey.set(key, row);
  });
  return Array.from(byKey.values());
}

function publicSwimmerKey(row = {}) {
  if (row.swimmerIdentityKey) return row.swimmerIdentityKey;
  const first = cleanText(row.firstName).toUpperCase();
  const last = cleanText(row.lastName).toUpperCase();
  const birth = cleanText(row.birthDate);
  return first && last && birth ? `${last}|${first}|${birth}` : cleanText(row.swimmerId || row.swimmer);
}

function publicBetterPerformance(candidate, current) {
  if (!current) return true;
  return Number(candidate.timeValue || 0) < Number(current.timeValue || 0) ||
    (Number(candidate.timeValue || 0) === Number(current.timeValue || 0) && cleanText(candidate.date).localeCompare(cleanText(current.date)) < 0);
}

function publicTopIndexRow(row = {}) {
  const sex = normalizeCategoryCode(row.sex);
  const date = cleanText(row.date);
  const category = performanceCategoryFromRow(row, date);
  return cleanFirestoreValue({
    id: cleanText(row.id),
    source: cleanText(row.source || "livepalmes"),
    importId: cleanText(row.importId),
    publicKey: cleanText(row.publicKey),
    performanceBaseId: cleanText(row.performanceBaseId),
    swimmerId: cleanText(row.swimmerId),
    originalSwimmerId: cleanText(row.originalSwimmerId),
    swimmerIdentityKey: cleanText(row.swimmerIdentityKey),
    swimmer: cleanText(row.swimmer),
    firstName: cleanText(row.firstName),
    lastName: cleanText(row.lastName),
    birthDate: cleanText(row.birthDate),
    sex,
    club: cleanText(row.club),
    clubName: cleanText(row.clubName),
    regionId: cleanText(row.regionId),
    regionLabel: cleanText(row.regionLabel),
    competitionId: cleanText(row.competitionId),
    competition: cleanText(row.competition),
    location: cleanText(row.location),
    date,
    seasonYear: Number(row.seasonYear || 0) || 0,
    course: cleanText(row.course),
    courseShortLabel: cleanText(row.courseShortLabel),
    style: cleanText(row.style),
    isIntermediate: row.isIntermediate === true,
    originCourse: cleanText(row.originCourse),
    originCourseShortLabel: cleanText(row.originCourseShortLabel),
    originPerformanceId: cleanText(row.originPerformanceId),
    category,
    categoryCode: cleanText(categoryCodeFromCategory(category, sex) || row.categoryCode),
    categoryLabel: cleanText(CATEGORY_LABELS[sex]?.[category] || row.categoryLabel || category),
    timeValue: Number(row.timeValue || 0) || 0,
    time: cleanText(row.time),
    status: cleanText(row.status || "active"),
    active: row.active !== false && row.status !== "hidden",
    intermediateTimes: Array.isArray(row.intermediateTimes)
      ? row.intermediateTimes.map((split) => ({
        code: cleanText(split?.code),
        distance: Number(split?.distance || 0) || 0,
        time: cleanText(split?.time),
        timeValue: Number(split?.timeValue || 0) || 0
      })).filter((split) => split.time)
      : []
  });
}

function performanceTopBucketKey(filters = {}) {
  return [
    cleanText(filters.course),
    cleanText(filters.sex),
    cleanText(filters.category),
    Number(filters.seasonYear || 0) || 0,
    cleanText(filters.regionId)
  ].join("|");
}

function performanceTopBucketId(bucketKey) {
  return stableHash(bucketKey).slice(0, 40);
}

function performanceTopBucketVariants(row = {}) {
  const course = cleanText(row.course);
  const sex = cleanText(row.sex);
  if (!course || (sex !== "F" && sex !== "M")) return [];
  const categoryValues = Array.from(new Set([cleanText(row.category), ""].filter((value, index, values) => value || index === values.length - 1)));
  const seasonValues = Array.from(new Set([Number(row.seasonYear || 0) || 0, 0]));
  const regionValues = Array.from(new Set([cleanText(row.regionId), ""]));
  const variants = [];
  categoryValues.forEach((category) => {
    seasonValues.forEach((seasonYear) => {
      regionValues.forEach((regionId) => {
        const key = performanceTopBucketKey({ course, sex, category, seasonYear, regionId });
        variants.push({
          key,
          id: performanceTopBucketId(key),
          course,
          sex,
          category,
          seasonYear,
          regionId
        });
      });
    });
  });
  return variants;
}

function bestTopRows(rows = []) {
  const latestByPublicKey = new Map();
  rows.forEach((row) => {
    const key = cleanText(row.publicKey || row.performanceBaseId || row.id || performancePublicKey(row));
    if (!key) return;
    latestByPublicKey.set(key, row);
  });
  const bestBySwimmer = new Map();
  latestByPublicKey.forEach((rawRow) => {
    if (rawRow.active === false || rawRow.status === "hidden") return;
    const row = publicTopIndexRow(rawRow);
    if (!row.timeValue) return;
    const swimmerKey = publicSwimmerKey(row);
    if (!swimmerKey) return;
    if (publicBetterPerformance(row, bestBySwimmer.get(swimmerKey))) bestBySwimmer.set(swimmerKey, row);
  });
  return Array.from(bestBySwimmer.values())
    .sort((a, b) => Number(a.timeValue || 0) - Number(b.timeValue || 0) || cleanText(a.date).localeCompare(cleanText(b.date)))
    .slice(0, PERFORMANCE_TOP_INDEX_LIMIT);
}

async function writePerformanceTopIndexRows(rows = [], context = {}) {
  const byBucket = new Map();
  rows.forEach((rawRow) => {
    if (!rawRow) return;
    const row = publicTopIndexRow(rawRow);
    if (!row.course || !row.sex || !row.timeValue) return;
    performanceTopBucketVariants(row).forEach((bucket) => {
      if (!byBucket.has(bucket.id)) byBucket.set(bucket.id, { ...bucket, rows: [] });
      byBucket.get(bucket.id).rows.push(row);
    });
  });
  if (!byBucket.size) return { ok: true, writtenRows: 0, touchedBucketIds: [] };

  const db = admin.firestore();
  const now = context.now || new Date().toISOString();
  const bucketEntries = Array.from(byBucket.values());
  const refs = bucketEntries.map((bucket) => db.collection(PERFORMANCE_TOP_BUCKETS_COLLECTION).doc(bucket.id));
  const snapshots = refs.length ? await db.getAll(...refs) : [];
  let batch = db.batch();
  let batchSize = 0;
  const commits = [];
  let writtenRows = 0;

  function commitIfNeeded(force = false) {
    if (batchSize >= 10 || (force && batchSize > 0)) {
      commits.push(batch.commit());
      batch = db.batch();
      batchSize = 0;
    }
  }

  bucketEntries.forEach((bucket, index) => {
    const existing = snapshots[index].exists ? snapshots[index].data() || {} : {};
    const existingRows = Array.isArray(existing.rows) ? existing.rows : [];
    const topRows = bestTopRows([...existingRows, ...bucket.rows]);
    batch.set(refs[index], {
      bucketId: bucket.id,
      bucketKey: bucket.key,
      course: bucket.course,
      sex: bucket.sex,
      category: bucket.category,
      seasonYear: bucket.seasonYear,
      regionId: bucket.regionId,
      rows: topRows,
      rowCount: topRows.length,
      sourceRowCount: Number(existing.sourceRowCount || 0) + bucket.rows.length,
      updatedAt: now
    }, { merge: false });
    batchSize += 1;
    writtenRows += bucket.rows.length;
    commitIfNeeded();
  });

  commitIfNeeded(true);
  await Promise.all(commits);
  return { ok: true, writtenRows, touchedBucketIds: bucketEntries.map((bucket) => bucket.id) };
}

async function performanceTopRowsFromIndex(filters = {}) {
  const bucketKey = performanceTopBucketKey({
    course: filters.course,
    sex: filters.sex,
    category: filters.category,
    seasonYear: filters.season,
    regionId: filters.region
  });
  const bucketId = performanceTopBucketId(bucketKey);
  const snapshot = await admin.firestore().collection(PERFORMANCE_TOP_BUCKETS_COLLECTION).doc(bucketId).get();
  if (!snapshot.exists) return null;
  const view = snapshot.data() || {};
  const rows = Array.isArray(view.rows) ? view.rows : [];
  return {
    ok: true,
    bucketId,
    rows,
    indexReads: 1,
    indexedRows: rows.length
  };
}

function dtnQualificationRow(row = {}) {
  return cleanFirestoreValue({
    swimmerId: cleanText(row.swimmerId),
    swimmerIdentityKey: cleanText(row.swimmerIdentityKey),
    swimmer: cleanText(row.swimmer),
    firstName: cleanText(row.firstName),
    lastName: cleanText(row.lastName),
    birthDate: cleanText(row.birthDate),
    sex: cleanText(row.sex),
    club: cleanText(row.club || row.clubName),
    competition: cleanText(row.competition),
    location: cleanText(row.location),
    date: cleanText(row.date),
    seasonYear: Number(row.seasonYear || 0) || 0,
    course: cleanText(row.course),
    time: cleanText(row.time),
    timeValue: Number(row.timeValue || 0) || 0
  });
}

function bestDtnQualificationRows(rows = [], standard = {}, threshold = 0) {
  const bestBySwimmer = new Map();
  rows.forEach((row) => {
    if (!Number(row.timeValue) || Number(row.timeValue) > threshold) return;
    if (standard.birthMin && birthYear(row.birthDate) < standard.birthMin) return;
    const key = publicSwimmerKey(row);
    if (!key) return;
    const current = bestBySwimmer.get(key);
    if (publicBetterPerformance(row, current)) bestBySwimmer.set(key, row);
  });
  return Array.from(bestBySwimmer.values())
    .sort((a, b) => Number(a.timeValue || 0) - Number(b.timeValue || 0) || cleanText(a.swimmer).localeCompare(cleanText(b.swimmer), "fr-FR"))
    .map(dtnQualificationRow);
}

function dtnQualificationCacheStateRef(seasonYear) {
  return admin.firestore().collection(DTN_QUALIFICATION_CACHE_STATE_COLLECTION).doc(String(seasonYear));
}

function dtnQualificationCacheRef(seasonYear, sex) {
  return admin.firestore().collection(DTN_QUALIFICATION_CACHE_COLLECTION).doc(`${seasonYear}-${sex}`);
}

function dtnQualificationSeasonsForRows(rows = []) {
  const seasons = new Set();
  rows.forEach((inputRow) => {
    const row = inputRow && typeof inputRow === "object" ? inputRow : {};
    const seasonYear = Number(row.seasonYear || 0) || importSeasonYear(cleanText(row.date));
    if (seasonYear && DTN_EDF_COMPETITION_IDS_BY_SEASON[seasonYear]) seasons.add(seasonYear);
  });
  return Array.from(seasons);
}

async function touchDtnQualificationCacheState(rows = [], context = {}) {
  const seasons = dtnQualificationSeasonsForRows(rows);
  if (!seasons.length) return { touchedSeasons: [] };
  const now = cleanText(context.now) || new Date().toISOString();
  const batch = admin.firestore().batch();
  seasons.forEach((seasonYear) => {
    batch.set(dtnQualificationCacheStateRef(seasonYear), {
      version: admin.firestore.FieldValue.increment(1),
      updatedAt: now,
      reason: cleanText(context.action || "performanceBase.updated")
    }, { merge: true });
  });
  await batch.commit();
  return { touchedSeasons: seasons };
}

function dtnQualificationCacheFingerprint({ seasonYear, sex, standards, competitionIds, sourceVersion }) {
  return stableHash(JSON.stringify({
    cacheVersion: DTN_QUALIFICATION_CACHE_VERSION,
    seasonYear,
    sex,
    standards,
    competitionIds,
    sourceVersion
  }));
}

function dtnQualificationRowsForStandard(rows = [], standardId = "", competitionIds = []) {
  const id = cleanText(standardId).toUpperCase();
  if (id === "TU16C1" || id === "TU16C2") return rows;
  const allowedCompetitionIds = id === "TJP" || id === "TEP"
    ? competitionIds.filter((competitionId) => competitionId !== DTN_EDF_LIMOGES_COMPETITION_ID)
    : competitionIds;
  const allowed = new Set(allowedCompetitionIds);
  return rows.filter((row) => allowed.has(cleanText(row.competitionId)));
}

exports.refreshDtnQualificationCache = onCall(CALLABLE_OPTIONS, async (request) => {
  assertCapability(request, "dtn.view");
  const seasonYear = Number(request.data?.seasonYear || 0);
  if (!Number.isInteger(seasonYear) || !DTN_EDF_COMPETITION_IDS_BY_SEASON[seasonYear]) {
    throw new HttpsError("invalid-argument", "Saison DTN invalide.");
  }

  const stateRef = dtnQualificationCacheStateRef(seasonYear);
  const now = new Date().toISOString();
  const sourceVersion = await admin.firestore().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(stateRef);
    const current = Number(snapshot.data()?.version || 0) || 0;
    const next = current + 1;
    transaction.set(stateRef, {
      version: next,
      updatedAt: now,
      reason: "dtn.manual-refresh"
    }, { merge: true });
    return next;
  });

  return { ok: true, seasonYear, sourceVersion, refreshedAt: now };
});

exports.getDtnQualificationOverview = onCall(CALLABLE_OPTIONS, async (request) => {
  assertCapability(request, "dtn.view");
  const seasonYear = Number(request.data?.seasonYear || 0);
  const sex = normalizeCategoryCode(request.data?.sex);
  const allowedStandardIds = new Set(["TSP", "TRP", "TJP", "TEP", "TU16C2", "TU16C1"]);
  const rawStandards = Array.isArray(request.data?.standards) ? request.data.standards.slice(0, 6) : [];
  if (!Number.isInteger(seasonYear) || seasonYear < 2000 || seasonYear > 2100) {
    throw new HttpsError("invalid-argument", "Saison DTN invalide.");
  }
  if (sex !== "F" && sex !== "M") {
    throw new HttpsError("invalid-argument", "Sexe DTN invalide.");
  }
  const standards = rawStandards.map((raw) => {
    const id = cleanText(raw?.id).toUpperCase();
    const birthMin = Number(raw?.birthMin || 0) || 0;
    if (!allowedStandardIds.has(id) || (birthMin && (birthMin < 1900 || birthMin > 2100))) {
      throw new HttpsError("invalid-argument", "Référentiel DTN invalide.");
    }
    const thresholds = {};
    POOL_COURSES.forEach((course) => {
      const threshold = Number(raw?.thresholds?.[course] || 0) || 0;
      if (threshold > 0 && threshold <= 10000000) thresholds[course] = threshold;
    });
    return { id, birthMin, thresholds };
  });
  if (!standards.length) throw new HttpsError("invalid-argument", "Aucun temps DTN fourni.");

  const competitionIds = DTN_EDF_COMPETITION_IDS_BY_SEASON[seasonYear] || [];
  if (!competitionIds.length) throw new HttpsError("failed-precondition", "Compétitions DTN non définies pour cette saison.");
  const db = admin.firestore();

  const stateSnapshot = await dtnQualificationCacheStateRef(seasonYear).get();
  const sourceVersion = Number(stateSnapshot.data()?.version || 0) || 0;
  const fingerprint = dtnQualificationCacheFingerprint({ seasonYear, sex, standards, competitionIds, sourceVersion });
  const cacheRef = dtnQualificationCacheRef(seasonYear, sex);
  const cacheSnapshot = await cacheRef.get();
  if (cacheSnapshot.exists && cleanText(cacheSnapshot.data()?.fingerprint) === fingerprint) {
    const cachedPayload = cacheSnapshot.data()?.payload;
    if (cachedPayload && typeof cachedPayload === "object") {
      console.info("Cache DTN utilise", { seasonYear, sex, sourceVersion });
      return { ...cachedPayload, cache: { hit: true, generatedAt: cleanText(cacheSnapshot.data()?.generatedAt) } };
    }
  }
  console.info("Cache DTN absent ou obsolete", { seasonYear, sex, sourceVersion });

  const indexedCourses = await Promise.all(POOL_COURSES.map(async (course) => {
    const snapshot = await db.collection(PERFORMANCE_BASE_COLLECTION)
      .where("seasonYear", "==", seasonYear)
      .where("course", "==", course)
      .where("sex", "==", sex)
      .where("active", "==", true)
      .get();
    return {
      course,
      rows: snapshot.docs.map((doc) => publicPerformanceBaseRow({ performanceBaseId: doc.id, ...(doc.data() || {}) }))
    };
  }));

  const payload = {
    ok: true,
    seasonYear,
    sex,
    standards: standards.map((standard) => ({
      id: standard.id,
      courses: indexedCourses.map(({ course, rows }) => {
        const threshold = Number(standard.thresholds[course] || 0);
        const eligibleRows = dtnQualificationRowsForStandard(rows, standard.id, competitionIds);
        const qualifiers = threshold ? bestDtnQualificationRows(eligibleRows, standard, threshold) : [];
        return {
          course,
          threshold,
          qualifiers,
          count: qualifiers.length
        };
      })
    })),
    competitionIds
  };

  const latestStateSnapshot = await dtnQualificationCacheStateRef(seasonYear).get();
  const latestSourceVersion = Number(latestStateSnapshot.data()?.version || 0) || 0;
  if (latestSourceVersion === sourceVersion) {
    const payloadBytes = Buffer.byteLength(JSON.stringify(payload), "utf8");
    if (payloadBytes < 900000) {
      const generatedAt = new Date().toISOString();
      await cacheRef.set({
        fingerprint,
        sourceVersion,
        generatedAt,
        payloadBytes,
        payload: cleanFirestoreValue(payload)
      }, { merge: false });
      console.info("Cache DTN cree", { seasonYear, sex, sourceVersion, payloadBytes });
      return { ...payload, cache: { hit: false, generatedAt } };
    }
    console.warn("Cache DTN trop volumineux", { seasonYear, sex, payloadBytes });
  }
  return { ...payload, cache: { hit: false, generatedAt: "" } };
});

function normalizePerformanceSearchText(value) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .toUpperCase()
    .trim();
}

function performanceSearchTokens(value) {
  return Array.from(new Set(normalizePerformanceSearchText(value).split(/\s+/).filter((token) => token.length >= 2)));
}

function performanceSearchPrefixes(value) {
  const prefixes = new Set();
  performanceSearchTokens(value).forEach((token) => {
    const max = Math.min(token.length, 18);
    for (let length = 2; length <= max; length += 1) {
      prefixes.add(token.slice(0, length));
    }
  });
  return Array.from(prefixes).slice(0, 300);
}

function performanceSwimmerIndexKey(row = {}) {
  const identity = cleanText(row.swimmerIdentityKey);
  if (identity) return identity;
  const first = normalizePerformanceSearchText(row.firstName);
  const last = normalizePerformanceSearchText(row.lastName);
  const birth = cleanText(row.birthDate);
  if (first && last && birth) return `${last}|${first}|${birth}`;
  return cleanText(row.swimmerId || row.originalSwimmerId || row.swimmer);
}

function performanceSwimmerIndexDocId(row = {}) {
  return stableHash(performanceSwimmerIndexKey(row)).slice(0, 40);
}

function swimmerDisplayNameFromRow(row = {}) {
  return cleanText(row.swimmer) || [cleanText(row.firstName), cleanText(row.lastName)].filter(Boolean).join(" ");
}

function aggregateSwimmerIndexRows(rows = []) {
  const byKey = new Map();
  rows.forEach((inputRow) => {
    if (!inputRow || inputRow.active === false || inputRow.status === "hidden") return;
    const row = publicPerformanceBaseRow(inputRow);
    const key = performanceSwimmerIndexKey(row);
    if (!key) return;
    const current = byKey.get(key) || {
      id: cleanText(row.swimmerId || row.originalSwimmerId),
      aliases: new Set(),
      sourceIds: new Set(),
      identityKey: cleanText(row.swimmerIdentityKey),
      name: swimmerDisplayNameFromRow(row),
      lastName: cleanText(row.lastName),
      firstName: cleanText(row.firstName),
      birthDate: cleanText(row.birthDate),
      sex: cleanText(row.sex),
      clubId: cleanText(row.clubId),
      club: cleanText(row.club),
      clubName: cleanText(row.clubName),
      latestDate: cleanText(row.date),
      performanceCount: 0
    };
    [row.swimmerId, row.originalSwimmerId, ...(Array.isArray(row.sourceIds) ? row.sourceIds : [])]
      .map(cleanText)
      .filter(Boolean)
      .forEach((id) => current.sourceIds.add(id));
    if (row.swimmerId && current.id && row.swimmerId !== current.id) current.aliases.add(row.swimmerId);
    const rowDate = cleanText(row.date);
    if (!current.latestDate || rowDate > current.latestDate) {
      current.latestDate = rowDate;
      current.clubId = cleanText(row.clubId) || current.clubId;
      current.club = cleanText(row.club) || current.club;
      current.clubName = cleanText(row.clubName) || current.clubName;
    }
    current.id = current.id || cleanText(row.swimmerId || row.originalSwimmerId);
    current.identityKey = current.identityKey || cleanText(row.swimmerIdentityKey);
    current.name = current.name || swimmerDisplayNameFromRow(row);
    current.lastName = current.lastName || cleanText(row.lastName);
    current.firstName = current.firstName || cleanText(row.firstName);
    current.birthDate = current.birthDate || cleanText(row.birthDate);
    current.sex = current.sex || cleanText(row.sex);
    current.performanceCount += 1;
    byKey.set(key, current);
  });

  return Array.from(byKey.entries()).map(([key, swimmer]) => {
    const sourceIds = Array.from(swimmer.sourceIds);
    const aliases = Array.from(new Set([...swimmer.aliases, ...sourceIds.filter((id) => id !== swimmer.id)]));
    const searchText = normalizePerformanceSearchText([
      swimmer.name,
      swimmer.firstName,
      swimmer.lastName,
      swimmer.birthDate,
      swimmer.sex,
      swimmer.club,
      swimmer.clubName,
      swimmer.id,
      ...sourceIds
    ].filter(Boolean).join(" "));
    return cleanFirestoreValue({
      indexKey: key,
      id: swimmer.id || sourceIds[0] || stableHash(key).slice(0, 16),
      aliases,
      sourceIds,
      identityKey: swimmer.identityKey || key,
      name: swimmer.name,
      lastName: swimmer.lastName,
      firstName: swimmer.firstName,
      birthDate: swimmer.birthDate,
      sex: swimmer.sex,
      clubId: swimmer.clubId,
      club: swimmer.club,
      clubName: swimmer.clubName,
      performanceCount: swimmer.performanceCount,
      latestDate: swimmer.latestDate,
      searchText,
      searchPrefixes: performanceSearchPrefixes(searchText),
      source: "performances"
    });
  });
}

async function writePerformanceSwimmerIndexRows(rows = [], context = {}) {
  const swimmers = aggregateSwimmerIndexRows(rows);
  if (!swimmers.length) return { ok: true, written: 0 };
  const db = admin.firestore();
  const now = context.now || new Date().toISOString();
  let batch = db.batch();
  let batchSize = 0;
  let written = 0;
  const commits = [];

  function commitIfNeeded(force = false) {
    if (batchSize >= 420 || (force && batchSize > 0)) {
      commits.push(batch.commit());
      batch = db.batch();
      batchSize = 0;
    }
  }

  swimmers.forEach((swimmer) => {
    const ref = db.collection(PERFORMANCE_SWIMMERS_COLLECTION).doc(stableHash(swimmer.indexKey).slice(0, 40));
    const payload = {
      ...swimmer,
      updatedAt: now,
      sourceAction: context.action || "performance.indexed"
    };
    if (context.mode !== "replace") {
      delete payload.performanceCount;
      if ((swimmer.aliases || []).length) payload.aliases = admin.firestore.FieldValue.arrayUnion(...swimmer.aliases);
      if ((swimmer.sourceIds || []).length) payload.sourceIds = admin.firestore.FieldValue.arrayUnion(...swimmer.sourceIds);
      if ((swimmer.searchPrefixes || []).length) payload.searchPrefixes = admin.firestore.FieldValue.arrayUnion(...swimmer.searchPrefixes);
    }
    batch.set(ref, payload, { merge: context.mode !== "replace" });
    batchSize += 1;
    written += 1;
    commitIfNeeded();
  });

  commitIfNeeded(true);
  await Promise.all(commits);
  return { ok: true, written };
}

function performanceSwimmerPageId(indexDocId, pageIndex) {
  return `${indexDocId}_${String(pageIndex).padStart(4, "0")}`;
}

function sortSwimmerPerformanceRows(rows = []) {
  return rows.sort((a, b) =>
    cleanText(b.date).localeCompare(cleanText(a.date)) ||
    cleanText(a.course).localeCompare(cleanText(b.course), "fr-FR", { numeric: true }) ||
    Number(a.timeValue || 0) - Number(b.timeValue || 0)
  );
}

async function writePerformanceSwimmerPageRows(rows = [], context = {}) {
  const bySwimmer = new Map();
  rows.forEach((rawRow) => {
    const row = publicPerformanceBaseRow(rawRow);
    const key = performanceSwimmerIndexKey(row);
    if (!key) return;
    if (!bySwimmer.has(key)) bySwimmer.set(key, []);
    bySwimmer.get(key).push(row);
  });
  if (!bySwimmer.size) return { ok: true, writtenPages: 0 };

  const db = admin.firestore();
  const now = context.now || new Date().toISOString();
  let writtenPages = 0;

  for (const [indexKey, swimmerRows] of bySwimmer.entries()) {
    const indexDocId = stableHash(indexKey).slice(0, 40);
    const indexRef = db.collection(PERFORMANCE_SWIMMERS_COLLECTION).doc(indexDocId);
    const indexSnapshot = await indexRef.get();
    const existingPageCount = Number(indexSnapshot.data()?.pageCount || 0) || 0;
    const pageRefs = Array.from({ length: existingPageCount }, (_, pageIndex) =>
      db.collection(PERFORMANCE_SWIMMER_PAGES_COLLECTION).doc(performanceSwimmerPageId(indexDocId, pageIndex))
    );
    const pageSnapshots = pageRefs.length ? await db.getAll(...pageRefs) : [];
    const existingRows = pageSnapshots.flatMap((snapshot) => {
      const page = snapshot.exists ? snapshot.data() || {} : {};
      return Array.isArray(page.rows) ? page.rows : [];
    });
    const mergedByPublicKey = new Map();
    [...existingRows, ...swimmerRows].forEach((row) => {
      const key = cleanText(row.publicKey || row.performanceBaseId || row.id || performancePublicKey(row));
      if (!key) return;
      mergedByPublicKey.set(key, row);
    });
    const activeRows = sortSwimmerPerformanceRows(Array.from(mergedByPublicKey.values())
      .filter((row) => row.active !== false && row.status !== "hidden")
      .map(publicPerformanceBaseRow));
    const pageCount = Math.ceil(activeRows.length / PERFORMANCE_SWIMMER_PAGE_SIZE);
    let batch = db.batch();
    let batchSize = 0;
    const commits = [];

    function commitIfNeeded(force = false) {
      if (batchSize >= 420 || (force && batchSize > 0)) {
        commits.push(batch.commit());
        batch = db.batch();
        batchSize = 0;
      }
    }

    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      const pageRef = db.collection(PERFORMANCE_SWIMMER_PAGES_COLLECTION).doc(performanceSwimmerPageId(indexDocId, pageIndex));
      const pageRows = activeRows.slice(pageIndex * PERFORMANCE_SWIMMER_PAGE_SIZE, (pageIndex + 1) * PERFORMANCE_SWIMMER_PAGE_SIZE);
      batch.set(pageRef, {
        swimmerIndexId: indexDocId,
        indexKey,
        pageIndex,
        rowCount: pageRows.length,
        rows: pageRows,
        updatedAt: now
      }, { merge: false });
      batchSize += 1;
      writtenPages += 1;
      commitIfNeeded();
    }
    for (let pageIndex = pageCount; pageIndex < existingPageCount; pageIndex += 1) {
      batch.delete(db.collection(PERFORMANCE_SWIMMER_PAGES_COLLECTION).doc(performanceSwimmerPageId(indexDocId, pageIndex)));
      batchSize += 1;
      commitIfNeeded();
    }
    batch.set(indexRef, {
      pageCount,
      performanceCount: activeRows.filter((row) => !row.isIntermediate).length,
      rowCount: activeRows.length,
      updatedAt: now,
      sourceAction: context.action || "performance.pages"
    }, { merge: true });
    batchSize += 1;
    commitIfNeeded(true);
    await Promise.all(commits);
  }

  return { ok: true, writtenPages };
}

async function getPerformanceBaseRowsBySwimmer(data = {}) {
  const db = admin.firestore();
  const ids = Array.from(new Set([
    ...(Array.isArray(data.swimmerIds) ? data.swimmerIds : []),
    data.swimmerId
  ].map((id) => cleanText(id)).filter(Boolean))).slice(0, 25);
  const identityKey = cleanText(data.identityKey);

  const candidateIndexRefs = [];
  if (identityKey) {
    candidateIndexRefs.push(db.collection(PERFORMANCE_SWIMMERS_COLLECTION).doc(stableHash(identityKey).slice(0, 40)));
  }
  ids.slice(0, 10).forEach((id) => {
    candidateIndexRefs.push(db.collection(PERFORMANCE_SWIMMERS_COLLECTION).doc(stableHash(id).slice(0, 40)));
  });
  const directSnapshots = candidateIndexRefs.length ? await db.getAll(...candidateIndexRefs) : [];
  const indexDocs = new Map();
  directSnapshots.forEach((snapshot) => {
    if (snapshot.exists) indexDocs.set(snapshot.id, { id: snapshot.id, ...(snapshot.data() || {}) });
  });
  if (!indexDocs.size && identityKey) {
    const snapshot = await db.collection(PERFORMANCE_SWIMMERS_COLLECTION)
      .where("identityKey", "==", identityKey)
      .limit(3)
      .get();
    snapshot.docs.forEach((doc) => indexDocs.set(doc.id, { id: doc.id, ...(doc.data() || {}) }));
  }
  for (const id of ids.slice(0, 5)) {
    if (indexDocs.size) break;
    const snapshot = await db.collection(PERFORMANCE_SWIMMERS_COLLECTION)
      .where("sourceIds", "array-contains", id)
      .limit(3)
      .get();
    snapshot.docs.forEach((doc) => indexDocs.set(doc.id, { id: doc.id, ...(doc.data() || {}) }));
  }

  const pageRefs = [];
  indexDocs.forEach((doc) => {
    const pageCount = Number(doc.pageCount || 0) || 0;
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      pageRefs.push(db.collection(PERFORMANCE_SWIMMER_PAGES_COLLECTION).doc(performanceSwimmerPageId(doc.id, pageIndex)));
    }
  });
  if (pageRefs.length) {
    const snapshots = await db.getAll(...pageRefs);
    return uniquePublicPerformanceRows(snapshots.flatMap((snapshot) => {
      const page = snapshot.exists ? snapshot.data() || {} : {};
      return Array.isArray(page.rows) ? page.rows : [];
    }).map(publicPerformanceBaseRow));
  }

  const reads = [];

  for (let index = 0; index < ids.length; index += 10) {
    const chunk = ids.slice(index, index + 10);
    reads.push(db.collection(PERFORMANCE_BASE_COLLECTION).where("swimmerId", "in", chunk).get());
    reads.push(db.collection(PERFORMANCE_BASE_COLLECTION).where("originalSwimmerId", "in", chunk).get());
  }
  if (identityKey) {
    reads.push(db.collection(PERFORMANCE_BASE_COLLECTION).where("swimmerIdentityKey", "==", identityKey).get());
  }

  const snapshots = await Promise.all(reads);
  return uniquePublicPerformanceRows(snapshots.flatMap((snapshot) =>
    snapshot.docs
      .map((doc) => ({ performanceBaseId: doc.id, ...(doc.data() || {}) }))
      .filter((row) => row.active !== false)
      .map(publicPerformanceBaseRow)
  ));
}

exports.rebuildPerformanceSwimmerIndexNextPage = onCall(PUBLIC_PERFORMANCE_CALLABLE_OPTIONS, async (request) => {
  assertAdmin(request);
  const db = admin.firestore();
  const stateRef = db.collection(PERFORMANCE_SWIMMER_INDEX_STATE_COLLECTION).doc("default");
  const stateSnapshot = await stateRef.get();
  const state = stateSnapshot.exists ? stateSnapshot.data() || {} : {};
  const reset = request.data?.reset === true;
  const pageSize = Math.min(Math.max(Number(request.data?.pageSize || 2500) || 2500, 250), 5000);
  const startedAt = reset || !state.startedAt ? new Date().toISOString() : cleanText(state.startedAt);
  const cursor = reset ? "" : cleanText(state.cursor);
  let query = db.collection(PERFORMANCE_BASE_COLLECTION)
    .orderBy(admin.firestore.FieldPath.documentId())
    .limit(pageSize);
  if (cursor) query = query.startAfter(cursor);
  const snapshot = await query.get();
  const rows = snapshot.docs.map((doc) => ({ performanceBaseId: doc.id, ...(doc.data() || {}) }));
  const includePages = request.data?.includePages !== false;
  const indexResult = await writePerformanceSwimmerIndexRows(rows, {
    now: new Date().toISOString(),
    action: reset ? "performanceSwimmerIndex.rebuild.reset" : "performanceSwimmerIndex.rebuild",
    mode: "incremental"
  });
  const pageResult = includePages
    ? await writePerformanceSwimmerPageRows(rows, {
      now: new Date().toISOString(),
      action: reset ? "performanceSwimmerPages.rebuild.reset" : "performanceSwimmerPages.rebuild"
    })
    : { writtenPages: 0 };
  const nextCursor = snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1].id : cursor;
  const done = snapshot.size < pageSize;
  const indexedPerformanceCount = (reset ? 0 : Number(state.indexedPerformanceCount || 0) || 0) + rows.length;
  const indexedSwimmerPageCount = (reset ? 0 : Number(state.indexedSwimmerPageCount || 0) || 0) + indexResult.written;
  await stateRef.set({
    startedAt,
    updatedAt: new Date().toISOString(),
    cursor: nextCursor,
    done,
    indexedPerformanceCount,
    indexedSwimmerPageCount,
    lastPagePerformanceCount: rows.length,
    lastPageSwimmerCount: indexResult.written,
    lastWrittenPerformancePages: pageResult.writtenPages || 0
  }, { merge: true });
  return {
    ok: true,
    done,
    cursor: nextCursor,
    pagePerformanceCount: rows.length,
    pageSwimmerCount: indexResult.written,
    writtenPerformancePages: pageResult.writtenPages || 0,
    indexedPerformanceCount,
    indexedSwimmerPageCount
  };
});

exports.rebuildPerformanceTopIndexNextPage = onCall(PUBLIC_PERFORMANCE_CALLABLE_OPTIONS, async (request) => {
  assertAdmin(request);
  const db = admin.firestore();
  const stateRef = db.collection(PERFORMANCE_TOP_INDEX_STATE_COLLECTION).doc("default");
  const stateSnapshot = await stateRef.get();
  const state = stateSnapshot.exists ? stateSnapshot.data() || {} : {};
  const reset = request.data?.reset === true;
  const pageSize = Math.min(Math.max(Number(request.data?.pageSize || 1000) || 1000, 250), 2000);
  const startedAt = reset || !state.startedAt ? new Date().toISOString() : cleanText(state.startedAt);
  const cursor = reset ? "" : cleanText(state.cursor);
  let query = db.collection(PERFORMANCE_BASE_COLLECTION)
    .orderBy(admin.firestore.FieldPath.documentId())
    .limit(pageSize);
  if (cursor) query = query.startAfter(cursor);
  const snapshot = await query.get();
  const rows = snapshot.docs.map((doc) => ({ performanceBaseId: doc.id, ...(doc.data() || {}) }));
  const indexResult = await writePerformanceTopIndexRows(rows, {
    now: new Date().toISOString()
  });
  const nextCursor = snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1].id : cursor;
  const done = snapshot.size < pageSize;
  const indexedPerformanceCount = (reset ? 0 : Number(state.indexedPerformanceCount || 0) || 0) + rows.length;
  const touchedBucketIds = Array.from(new Set([
    ...(!reset && Array.isArray(state.touchedBucketIds) ? state.touchedBucketIds.map(cleanText) : []),
    ...(indexResult.touchedBucketIds || [])
  ].filter(Boolean)));
  await stateRef.set({
    startedAt,
    cursor: nextCursor,
    done,
    indexedPerformanceCount,
    touchedBucketIds,
    touchedBucketCount: touchedBucketIds.length,
    lastPagePerformanceCount: rows.length,
    lastPageIndexedRows: indexResult.writtenRows || 0,
    updatedAt: new Date().toISOString()
  }, { merge: true });
  return {
    ok: true,
    done,
    cursor: nextCursor,
    pagePerformanceCount: rows.length,
    pageIndexedRows: indexResult.writtenRows || 0,
    indexedPerformanceCount,
    touchedBucketCount: touchedBucketIds.length
  };
});

async function normalizedImportPerformances(importId) {
  const importRef = admin.firestore().collection("performanceImports").doc(importId);
  const importDoc = await importRef.get();
  if (!importDoc.exists) return [];
  const importData = importDoc.data() || {};
  if (importData.status !== "stored") return [];
  const metadata = importData.metadata || {};
  const performancesSnapshot = await importRef
    .collection("performances")
    .where("active", "==", true)
    .get();
  const rawPerformances = performancesSnapshot.docs.map((perfDoc) => ({
    id: perfDoc.id,
    importId,
    metadata,
    competitionName: importData.competitionName || metadata.competitionName || "",
    importedAt: importData.importedAt || "",
    ...perfDoc.data()
  }));
  return normalizeLivePalmesImportPerformances(rawPerformances);
}

async function syncImportToPerformanceBase(importId, context = {}) {
  const performances = await normalizedImportPerformances(importId);
  const result = await writePerformanceBaseRows(performances, {
    ...context,
    importId,
    action: "performanceImport.synced",
    changeSeed: importId
  });
  await admin.firestore().collection("performanceImports").doc(importId).set({
    performanceBaseSyncedAt: context.now || new Date().toISOString(),
    performanceBaseCount: result.written
  }, { merge: true });
  return result;
}

function buildAdditionalPerformanceSwimmers(performances = []) {
  const swimmersById = new Map();
  performances.forEach((perf) => {
    if (!swimmersById.has(perf.swimmerId)) {
      swimmersById.set(perf.swimmerId, {
        id: perf.swimmerId,
        aliases: Array.isArray(perf.aliases) ? perf.aliases : [],
        sourceIds: Array.from(new Set([...(Array.isArray(perf.sourceIds) ? perf.sourceIds : []), perf.swimmerId, perf.originalSwimmerId].filter(Boolean))),
        identityKey: perf.swimmerIdentityKey || "",
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
  return Array.from(swimmersById.values());
}

function emptyAdditionalPerformanceDataSnapshot() {
  return {
    ok: true,
    generatedAt: "",
    importCount: 0,
    performanceCount: 0,
    correctionCount: 0,
    swimmers: [],
    performances: [],
    corrections: []
  };
}

function normalizeAdditionalPerformanceDataSnapshot(snapshot = {}) {
  const performances = (Array.isArray(snapshot.performances) ? snapshot.performances : [])
    .map(publicPerformanceBaseRow);
  const corrections = Array.isArray(snapshot.corrections) ? snapshot.corrections : [];
  const swimmers = Array.isArray(snapshot.swimmers) ? snapshot.swimmers : buildAdditionalPerformanceSwimmers(performances);
  const importCount = Array.from(new Set(performances.map((row) => cleanText(row.importId)).filter(Boolean))).length;
  return {
    ok: snapshot.ok !== false,
    generatedAt: cleanText(snapshot.generatedAt),
    importCount: importCount || Number(snapshot.importCount || 0) || 0,
    performanceCount: performances.length,
    correctionCount: corrections.length,
    swimmers,
    performances,
    corrections
  };
}

function additionalPerformanceFile() {
  return admin.storage().bucket(PUBLIC_PERFORMANCE_BUCKET).file(PUBLIC_ADDITIONAL_PERFORMANCE_PATH);
}

async function readPublishedAdditionalPerformanceDataSnapshot() {
  const file = additionalPerformanceFile();
  try {
    const [buffer] = await file.download();
    return normalizeAdditionalPerformanceDataSnapshot(JSON.parse(buffer.toString("utf8")));
  } catch (error) {
    if (error?.code === 404 || error?.code === 403 || /No such object|not found/i.test(error?.message || "")) {
      return emptyAdditionalPerformanceDataSnapshot();
    }
    throw error;
  }
}

function additionalPerformanceRowKey(row = {}) {
  return cleanText(row.publicKey || performancePublicKey(row) || row.performanceBaseId || row.id);
}

function mergeAdditionalPerformanceRows(existingRows = [], incomingRows = [], replaceImportId = "") {
  const byKey = new Map();
  existingRows.forEach((row) => {
    if (replaceImportId && cleanText(row.importId) === replaceImportId) return;
    const key = additionalPerformanceRowKey(row);
    if (key) byKey.set(key, row);
  });
  incomingRows.forEach((row) => {
    const key = additionalPerformanceRowKey(row);
    if (key) byKey.set(key, row);
  });
  return Array.from(byKey.values());
}

function upsertAdditionalCorrection(corrections = [], correction = {}) {
  const key = cleanText(correction.id || correction.targetKey);
  if (!key) return corrections;
  const byKey = new Map();
  corrections.forEach((item) => {
    const itemKey = cleanText(item.id || item.targetKey);
    if (itemKey) byKey.set(itemKey, item);
  });
  byKey.set(key, correction);
  return Array.from(byKey.values())
    .sort((a, b) => cleanText(b.updatedAt).localeCompare(cleanText(a.updatedAt)))
    .slice(0, 2000);
}

async function saveAdditionalPerformanceDataSnapshot(snapshot = {}) {
  const normalized = normalizeAdditionalPerformanceDataSnapshot({
    ...snapshot,
    ok: true,
    generatedAt: new Date().toISOString(),
    swimmers: buildAdditionalPerformanceSwimmers(snapshot.performances || [])
  });
  const file = additionalPerformanceFile();
  await file.save(JSON.stringify(normalized), {
    resumable: false,
    contentType: "application/json; charset=utf-8",
    metadata: {
      cacheControl: "public, max-age=300",
      metadata: {
        firebaseStorageDownloadTokens: PUBLIC_ADDITIONAL_PERFORMANCE_TOKEN
      }
    }
  });
  return {
    ok: true,
    path: PUBLIC_ADDITIONAL_PERFORMANCE_PATH,
    generatedAt: normalized.generatedAt,
    importCount: normalized.importCount,
    performanceCount: normalized.performanceCount,
    correctionCount: normalized.correctionCount,
    incremental: snapshot.incremental !== false
  };
}

async function publishIncrementalPerformanceImport(performances = [], importId = "") {
  const current = await readPublishedAdditionalPerformanceDataSnapshot();
  const mergedPerformances = mergeAdditionalPerformanceRows(current.performances, performances, cleanText(importId));
  return saveAdditionalPerformanceDataSnapshot({
    ...current,
    performances: mergedPerformances
  });
}

async function publishIncrementalPerformanceCorrection(correction = {}) {
  const current = await readPublishedAdditionalPerformanceDataSnapshot();
  const corrections = upsertAdditionalCorrection(current.corrections, correction);
  return saveAdditionalPerformanceDataSnapshot({
    ...current,
    corrections
  });
}

function publicPerformanceFilesBucket() {
  return admin.storage().bucket(PUBLIC_PERFORMANCE_BUCKET);
}

function publicPerformanceFilePath(relativePath = "") {
  return `${PUBLIC_PERFORMANCE_FILES_PATH}/${String(relativePath || "").replace(/^\/+/, "")}`;
}

function publicPerformanceFile(relativePath = "") {
  return publicPerformanceFilesBucket().file(publicPerformanceFilePath(relativePath));
}

async function readPublicPerformanceJson(relativePath, fallback) {
  const file = publicPerformanceFile(relativePath);
  try {
    const [buffer] = await file.download();
    return JSON.parse(buffer.toString("utf8"));
  } catch (error) {
    if (error?.code === 404 || error?.code === 403 || /No such object|not found/i.test(error?.message || "")) {
      return fallback;
    }
    throw error;
  }
}

async function savePublicPerformanceJson(relativePath, payload, cacheControl = "public, max-age=300") {
  const file = publicPerformanceFile(relativePath);
  await file.save(JSON.stringify(payload), {
    resumable: false,
    contentType: "application/json; charset=utf-8",
    metadata: { cacheControl }
  });
  return publicPerformanceFilePath(relativePath);
}

async function savePublicPerformanceText(relativePath, content, cacheControl = "public, max-age=300") {
  const file = publicPerformanceFile(relativePath);
  await file.save(content, {
    resumable: false,
    contentType: "application/javascript; charset=utf-8",
    metadata: { cacheControl }
  });
  return publicPerformanceFilePath(relativePath);
}

function publicPerformanceCompactObject(object = {}) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => {
    if (value === "" || value === null || value === undefined) return false;
    if (value === false) return false;
    if (Array.isArray(value) && !value.length) return false;
    return true;
  }));
}

function publicPerformanceSearchShard(value) {
  const token = normalizePerformanceSearchText(value).split(/\s+/).find((item) => item.length >= 2) || "";
  return token.slice(0, 2).toLowerCase();
}

function publicPerformanceIdShard(value) {
  const id = cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (!id) return "";
  return id.length === 1 ? `0${id}` : id.slice(0, 2);
}

function publicPerformanceTopFileName(sex, category) {
  return `${cleanText(sex)}-${cleanText(category).replace(/\+/g, "")}.json`;
}

function publicPerformanceSwimmerFilePath(indexKey) {
  const hash = stableHash(indexKey).slice(0, 40);
  return `swimmers/${hash.slice(0, 2)}/${hash}.json`;
}

function publicPerformanceRowKey(row = {}) {
  return cleanText(row.publicKey || performancePublicKey(row) || row.performanceBaseId || row.id);
}

function publicPerformanceTopCandidateKey(row = {}) {
  return [
    publicSwimmerKey(row),
    Number(row.seasonYear || 0) || 0,
    cleanText(row.regionId)
  ].join("|");
}

function publicPerformanceSwimmerRow(row = {}) {
  const isIntermediate = row.isIntermediate === true;
  return publicPerformanceCompactObject({
    id: cleanText(row.id),
    source: cleanText(row.source || "livepalmes"),
    publicKey: cleanText(row.publicKey),
    performanceBaseId: cleanText(row.performanceBaseId),
    club: cleanText(row.club),
    location: cleanText(row.location),
    date: cleanText(row.date),
    seasonYear: Number(row.seasonYear || 0) || 0,
    pool: cleanText(row.pool),
    course: cleanText(row.course),
    ...(isIntermediate ? {
      length: Number(row.length || 0) || 0,
      isIntermediate: true,
      originCourse: cleanText(row.originCourse),
      originPerformanceId: cleanText(row.originPerformanceId)
    } : {}),
    categoryCode: cleanText(row.categoryCode || row.category),
    timeValue: Number(row.timeValue || 0) || 0,
    time: cleanText(row.time),
    intermediateTimes: Array.isArray(row.intermediateTimes) ? row.intermediateTimes : []
  });
}

function publicPerformanceTopRow(row = {}) {
  const intermediateTimes = Array.isArray(row.intermediateTimes) ? row.intermediateTimes : [];
  return publicPerformanceCompactObject({
    id: cleanText(row.id),
    source: cleanText(row.source || "livepalmes"),
    importId: cleanText(row.importId),
    publicKey: cleanText(row.publicKey),
    performanceBaseId: cleanText(row.performanceBaseId),
    swimmerId: cleanText(row.swimmerId),
    swimmerIdentityKey: cleanText(row.swimmerIdentityKey),
    swimmer: cleanText(row.swimmer),
    firstName: cleanText(row.firstName),
    lastName: cleanText(row.lastName),
    birthDate: cleanText(row.birthDate),
    sex: cleanText(row.sex),
    club: cleanText(row.club),
    clubName: cleanText(row.clubName),
    regionId: cleanText(row.regionId),
    competition: cleanText(row.competition),
    location: cleanText(row.location),
    date: cleanText(row.date),
    seasonYear: Number(row.seasonYear || 0) || 0,
    pool: cleanText(row.pool),
    course: cleanText(row.course),
    courseShortLabel: cleanText(row.courseShortLabel),
    isIntermediate: row.isIntermediate === true,
    originCourse: cleanText(row.originCourse),
    category: cleanText(row.category),
    categoryCode: cleanText(row.categoryCode),
    timeValue: Number(row.timeValue || 0) || 0,
    time: cleanText(row.time),
    intermediateTimes
  });
}

function sortPublicPerformanceRows(rows = []) {
  return rows.sort((a, b) =>
    cleanText(b.date).localeCompare(cleanText(a.date)) ||
    cleanText(a.course).localeCompare(cleanText(b.course), "fr-FR", { numeric: true }) ||
    Number(a.timeValue || 0) - Number(b.timeValue || 0)
  );
}

function sortPublicTopRows(rows = []) {
  return rows.sort((a, b) =>
    Number(a.timeValue || 0) - Number(b.timeValue || 0) ||
    cleanText(a.date).localeCompare(cleanText(b.date))
  );
}

function mergePublicSwimmerRows(existingRows = [], incomingRows = []) {
  const byKey = new Map();
  [...existingRows, ...incomingRows].forEach((row) => {
    const key = publicPerformanceRowKey(row);
    if (!key) return;
    byKey.set(key, publicPerformanceSwimmerRow(row));
  });
  return sortPublicPerformanceRows(Array.from(byKey.values()));
}

function mergePublicTopRows(existingRows = [], incomingRows = []) {
  const byCandidate = new Map();
  [...existingRows, ...incomingRows].forEach((inputRow) => {
    const row = publicPerformanceTopRow(inputRow);
    if (!row.course || !row.sex || !row.category || !row.timeValue) return;
    const candidateKey = publicPerformanceTopCandidateKey(row);
    if (!candidateKey) return;
    if (publicBetterPerformance(row, byCandidate.get(candidateKey))) byCandidate.set(candidateKey, row);
  });
  return sortPublicTopRows(Array.from(byCandidate.values()));
}

function buildPublicSwimmerPayload(indexKey, rows = []) {
  const sortedRows = sortPublicPerformanceRows(rows.map(publicPerformanceBaseRow));
  const first = sortedRows[0] || {};
  const latestWithClub = sortedRows.find((row) => row.club || row.clubName) || first;
  const sourceIds = Array.from(new Set(sortedRows.flatMap((row) => [row.swimmerId, row.originalSwimmerId]).map(cleanText).filter(Boolean)));
  const aliases = Array.from(new Set(sourceIds.filter((id) => id && id !== first.swimmerId)));
  const name = cleanText(first.swimmer) || [first.firstName, first.lastName].filter(Boolean).join(" ");
  return publicPerformanceCompactObject({
    id: cleanText(first.swimmerId || sourceIds[0] || stableHash(indexKey).slice(0, 16)),
    identityKey: cleanText(first.swimmerIdentityKey || indexKey),
    aliases,
    sourceIds,
    name,
    lastName: cleanText(first.lastName),
    firstName: cleanText(first.firstName),
    birthDate: cleanText(first.birthDate),
    sex: cleanText(first.sex),
    clubId: cleanText(latestWithClub.clubId),
    club: cleanText(latestWithClub.club),
    clubName: cleanText(latestWithClub.clubName),
    performanceCount: sortedRows.filter((row) => !row.isIntermediate).length,
    rowCount: sortedRows.length,
    rows: sortedRows.map(publicPerformanceSwimmerRow)
  });
}

function buildPublicSearchRow(swimmerPayload = {}, perfFile = "") {
  const sourceIds = Array.isArray(swimmerPayload.sourceIds) ? swimmerPayload.sourceIds : [];
  const aliases = Array.isArray(swimmerPayload.aliases) ? swimmerPayload.aliases : [];
  const searchText = normalizePerformanceSearchText([
    swimmerPayload.name,
    swimmerPayload.firstName,
    swimmerPayload.lastName,
    swimmerPayload.birthDate,
    swimmerPayload.sex,
    swimmerPayload.club,
    swimmerPayload.clubName,
    swimmerPayload.id,
    ...sourceIds
  ].filter(Boolean).join(" "));
  const searchIndexText = normalizePerformanceSearchText([
    swimmerPayload.name,
    swimmerPayload.firstName,
    swimmerPayload.lastName,
    swimmerPayload.id,
    ...sourceIds
  ].filter(Boolean).join(" "));
  return {
    id: swimmerPayload.id,
    aliases,
    sourceIds,
    identityKey: swimmerPayload.identityKey,
    name: swimmerPayload.name,
    lastName: swimmerPayload.lastName,
    firstName: swimmerPayload.firstName,
    birthDate: swimmerPayload.birthDate,
    sex: swimmerPayload.sex,
    clubId: swimmerPayload.clubId,
    club: swimmerPayload.club,
    clubName: swimmerPayload.clubName,
    performanceCount: swimmerPayload.performanceCount,
    latestDate: swimmerPayload.rows?.[0]?.date || "",
    searchText,
    searchPrefixes: performanceSearchPrefixes(searchIndexText),
    perfFile
  };
}

async function publishPublicSwimmerFile(indexKey, incomingRows = []) {
  const perfFile = publicPerformanceSwimmerFilePath(indexKey);
  const existing = await readPublicPerformanceJson(perfFile, null);
  const existingRows = Array.isArray(existing?.rows) ? existing.rows : [];
  const mergedRows = mergePublicSwimmerRows(existingRows, incomingRows);
  const generated = buildPublicSwimmerPayload(indexKey, mergedRows);
  const payload = {
    ...generated,
    id: generated.id || cleanText(existing?.id),
    identityKey: generated.identityKey || cleanText(existing?.identityKey) || indexKey,
    aliases: Array.from(new Set([...(Array.isArray(existing?.aliases) ? existing.aliases : []), ...(generated.aliases || [])].map(cleanText).filter(Boolean))),
    sourceIds: Array.from(new Set([...(Array.isArray(existing?.sourceIds) ? existing.sourceIds : []), ...(generated.sourceIds || [])].map(cleanText).filter(Boolean))),
    name: generated.name || cleanText(existing?.name),
    lastName: generated.lastName || cleanText(existing?.lastName),
    firstName: generated.firstName || cleanText(existing?.firstName),
    birthDate: generated.birthDate || cleanText(existing?.birthDate),
    sex: generated.sex || cleanText(existing?.sex),
    clubId: generated.clubId || cleanText(existing?.clubId),
    club: generated.club || cleanText(existing?.club),
    clubName: generated.clubName || cleanText(existing?.clubName)
  };
  await savePublicPerformanceJson(perfFile, payload, "public, max-age=31536000, immutable");
  return { perfFile, payload, existing };
}

async function publishPublicSearchIndexes(swimmerPayload, perfFile) {
  const searchRow = buildPublicSearchRow(swimmerPayload, perfFile);
  const searchShards = new Set((searchRow.searchPrefixes || []).map(publicPerformanceSearchShard).filter(Boolean));
  const idValues = [searchRow.id, ...(searchRow.sourceIds || []), ...(searchRow.aliases || [])].map(cleanText).filter(Boolean);
  const idShards = new Set(idValues.map(publicPerformanceIdShard).filter(Boolean));
  const written = [];

  for (const shard of searchShards) {
    const relativePath = `search/${shard}.json`;
    const rows = await readPublicPerformanceJson(relativePath, []);
    const byId = new Map((Array.isArray(rows) ? rows : []).map((row) => [cleanText(row.id), row]));
    byId.set(cleanText(searchRow.id), publicPerformanceCompactObject({ ...searchRow, searchPrefixes: undefined }));
    const mergedRows = Array.from(byId.values()).sort((a, b) =>
      cleanText(a.lastName).localeCompare(cleanText(b.lastName), "fr-FR") ||
      cleanText(a.firstName).localeCompare(cleanText(b.firstName), "fr-FR") ||
      cleanText(a.name).localeCompare(cleanText(b.name), "fr-FR")
    );
    written.push(await savePublicPerformanceJson(relativePath, mergedRows, "public, max-age=31536000, immutable"));
  }

  for (const shard of idShards) {
    const relativePath = `ids/${shard}.json`;
    const items = await readPublicPerformanceJson(relativePath, {});
    idValues.forEach((id) => {
      items[id] = publicPerformanceCompactObject({ ...searchRow, searchPrefixes: undefined });
    });
    written.push(await savePublicPerformanceJson(relativePath, items, "public, max-age=31536000, immutable"));
  }

  return written;
}

async function publishPublicTopFiles(topKey, incomingRows = []) {
  const [course, sex, category] = topKey.split("|");
  if (!course || !sex || !category) return [];
  const fileName = publicPerformanceTopFileName(sex, category);
  const fullPath = `tops/${course}/${fileName}`;
  const previewPath = `tops-preview/${course}/${fileName}`;
  const existingRows = await readPublicPerformanceJson(fullPath, []);
  const mergedRows = mergePublicTopRows(existingRows, incomingRows);
  const previewRows = mergedRows.slice(0, PUBLIC_PERFORMANCE_TOP_PREVIEW_LIMIT);
  return [
    await savePublicPerformanceJson(fullPath, mergedRows, "public, max-age=31536000, immutable"),
    await savePublicPerformanceJson(previewPath, previewRows, "public, max-age=31536000, immutable")
  ];
}

function mergePublicPerformanceManifest(manifest = {}, rows = [], generatedAt = new Date().toISOString()) {
  const seasons = new Set([...(Array.isArray(manifest.seasons) ? manifest.seasons : [])]);
  const regions = new Map((Array.isArray(manifest.regions) ? manifest.regions : []).map((region) => [String(region.id), region.label]));
  const courses = new Set([...(Array.isArray(manifest.courses) ? manifest.courses : [])]);
  const categories = new Set([...(Array.isArray(manifest.categories) ? manifest.categories : [])]);

  rows.forEach((row) => {
    const publicRow = publicPerformanceBaseRow(row);
    if (publicRow.seasonYear) seasons.add(publicRow.seasonYear);
    if (publicRow.regionId) regions.set(String(publicRow.regionId), publicRow.regionLabel || publicRow.regionId);
    if (publicRow.course) courses.add(publicRow.course);
    if (publicRow.sex && publicRow.category) categories.add(`${publicRow.sex}|${publicRow.category}`);
  });

  return {
    ...manifest,
    generatedAt,
    seasons: Array.from(seasons).sort((a, b) => b - a),
    regions: Array.from(regions.entries()).map(([id, label]) => ({ id, label })).sort((a, b) => String(a.label).localeCompare(String(b.label), "fr-FR")),
    courses: Array.from(courses).sort(),
    categories: Array.from(categories).sort(),
    lastIncremental: {
      generatedAt,
      rows: rows.length
    }
  };
}

async function publishIncrementalPublicPerformanceFiles(performances = [], context = {}) {
  const rows = performances
    .map(publicPerformanceBaseRow)
    .filter((row) => row.active !== false && row.status !== "hidden" && row.course && row.sex && row.category && row.timeValue);
  if (!rows.length) return { ok: true, writtenFiles: 0, rowCount: 0 };

  const bySwimmer = new Map();
  const byTop = new Map();
  rows.forEach((row) => {
    const swimmerKey = publicSwimmerKey(row);
    if (swimmerKey) {
      if (!bySwimmer.has(swimmerKey)) bySwimmer.set(swimmerKey, []);
      bySwimmer.get(swimmerKey).push(row);
    }
    const topKey = [row.course, row.sex, row.category].map(cleanText).join("|");
    if (row.course && row.sex && row.category) {
      if (!byTop.has(topKey)) byTop.set(topKey, []);
      byTop.get(topKey).push(row);
    }
  });

  const writtenFiles = new Set();
  for (const [swimmerKey, swimmerRows] of bySwimmer.entries()) {
    const { perfFile, payload } = await publishPublicSwimmerFile(swimmerKey, swimmerRows);
    writtenFiles.add(publicPerformanceFilePath(perfFile));
    const searchFiles = await publishPublicSearchIndexes(payload, perfFile);
    searchFiles.forEach((filePath) => writtenFiles.add(filePath));
  }
  for (const [topKey, topRows] of byTop.entries()) {
    const topFiles = await publishPublicTopFiles(topKey, topRows);
    topFiles.forEach((filePath) => writtenFiles.add(filePath));
  }

  const generatedAt = context.now || new Date().toISOString();
  const currentManifest = await readPublicPerformanceJson("manifest.json", {});
  const manifest = mergePublicPerformanceManifest(currentManifest, rows, generatedAt);
  writtenFiles.add(await savePublicPerformanceJson("manifest.json", manifest, "public, max-age=300"));
  writtenFiles.add(await savePublicPerformanceText("version.js", `window.LIVEPALMES_PERFORMANCE_PUBLIC_VERSION = ${JSON.stringify(generatedAt)};\n`, "public, max-age=300"));

  return {
    ok: true,
    rowCount: rows.length,
    affectedSwimmers: bySwimmer.size,
    affectedTopBuckets: byTop.size,
    writtenFiles: writtenFiles.size,
    importId: cleanText(context.importId)
  };
}

async function deletePublicPerformanceFile(relativePath = "") {
  const file = publicPerformanceFile(relativePath);
  try {
    await file.delete();
  } catch (error) {
    if (!(error?.code === 404 || /No such object|not found/i.test(error?.message || ""))) throw error;
  }
  return publicPerformanceFilePath(relativePath);
}

async function removePublicSearchIndexes(swimmerPayload = {}, perfFile = "") {
  if (!swimmerPayload || typeof swimmerPayload !== "object") return [];
  const searchRow = buildPublicSearchRow(swimmerPayload, perfFile);
  const searchShards = new Set((searchRow.searchPrefixes || []).map(publicPerformanceSearchShard).filter(Boolean));
  const idValues = [searchRow.id, ...(searchRow.sourceIds || []), ...(searchRow.aliases || [])].map(cleanText).filter(Boolean);
  const idShards = new Set(idValues.map(publicPerformanceIdShard).filter(Boolean));
  const written = [];

  for (const shard of searchShards) {
    const relativePath = `search/${shard}.json`;
    const rows = await readPublicPerformanceJson(relativePath, []);
    const filtered = (Array.isArray(rows) ? rows : []).filter((row) =>
      cleanText(row.id) !== cleanText(searchRow.id) &&
      cleanText(row.identityKey) !== cleanText(searchRow.identityKey) &&
      cleanText(row.perfFile) !== cleanText(perfFile)
    );
    written.push(await savePublicPerformanceJson(relativePath, filtered, "public, max-age=31536000, immutable"));
  }

  for (const shard of idShards) {
    const relativePath = `ids/${shard}.json`;
    const items = await readPublicPerformanceJson(relativePath, {});
    idValues.forEach((id) => {
      delete items[id];
    });
    written.push(await savePublicPerformanceJson(relativePath, items, "public, max-age=31536000, immutable"));
  }

  return written;
}

function publicPerformanceTopKey(row = {}) {
  const publicRow = publicPerformanceBaseRow(row);
  return publicRow.course && publicRow.sex && publicRow.category
    ? `${publicRow.course}|${publicRow.sex}|${publicRow.category}`
    : "";
}

function publicPerformanceMatchesTopKey(row = {}, topKey = "") {
  return publicPerformanceTopKey(row) === topKey;
}

function publicPerformanceActiveRow(row = {}) {
  const status = cleanText(row.status || "active");
  return row.active !== false && status !== "hidden" && status !== "deleted";
}

async function getActivePublicRowsForAffectedSwimmer(seedRows = []) {
  const db = admin.firestore();
  const identityKeys = Array.from(new Set(seedRows
    .map((row) => cleanText(row.swimmerIdentityKey))
    .filter(Boolean)));
  const ids = Array.from(new Set(seedRows
    .flatMap((row) => [row.swimmerId, row.originalSwimmerId])
    .map(cleanText)
    .filter(Boolean)));
  const reads = [];

  identityKeys.forEach((identityKey) => {
    reads.push(db.collection(PERFORMANCE_BASE_COLLECTION).where("swimmerIdentityKey", "==", identityKey).get());
  });
  for (let index = 0; index < ids.length; index += 10) {
    const chunk = ids.slice(index, index + 10);
    reads.push(db.collection(PERFORMANCE_BASE_COLLECTION).where("swimmerId", "in", chunk).get());
    reads.push(db.collection(PERFORMANCE_BASE_COLLECTION).where("originalSwimmerId", "in", chunk).get());
  }

  if (!reads.length) return [];
  const snapshots = await Promise.all(reads);
  return uniquePublicPerformanceRows(snapshots.flatMap((snapshot) =>
    snapshot.docs
      .map((doc) => ({ performanceBaseId: doc.id, ...(doc.data() || {}) }))
      .filter(publicPerformanceActiveRow)
      .map(publicPerformanceBaseRow)
  ));
}

async function rebuildPublicSwimmerFilesForAffectedRows(affectedRows = []) {
  const bySwimmer = new Map();
  affectedRows.map(publicPerformanceBaseRow).forEach((row) => {
    const swimmerKey = publicSwimmerKey(row);
    if (!swimmerKey) return;
    if (!bySwimmer.has(swimmerKey)) bySwimmer.set(swimmerKey, []);
    bySwimmer.get(swimmerKey).push(row);
  });

  const writtenFiles = new Set();
  const activeRowsBySwimmer = new Map();
  for (const [swimmerKey, rows] of bySwimmer.entries()) {
    const activeRows = await getActivePublicRowsForAffectedSwimmer(rows);
    activeRowsBySwimmer.set(swimmerKey, activeRows);
    const perfFile = publicPerformanceSwimmerFilePath(swimmerKey);
    const existing = await readPublicPerformanceJson(perfFile, null);
    if (existing) {
      const removed = await removePublicSearchIndexes(existing, perfFile);
      removed.forEach((filePath) => writtenFiles.add(filePath));
    }
    if (!activeRows.length) {
      writtenFiles.add(await deletePublicPerformanceFile(perfFile));
      continue;
    }
    const payload = buildPublicSwimmerPayload(swimmerKey, activeRows);
    await savePublicPerformanceJson(perfFile, payload, "public, max-age=31536000, immutable");
    writtenFiles.add(publicPerformanceFilePath(perfFile));
    const searchFiles = await publishPublicSearchIndexes(payload, perfFile);
    searchFiles.forEach((filePath) => writtenFiles.add(filePath));
  }

  return {
    activeRowsBySwimmer,
    affectedSwimmers: bySwimmer.size,
    writtenFiles
  };
}

async function rebuildPublicTopFilesForAffectedRows(affectedRows = [], activeRowsBySwimmer = new Map()) {
  const publicAffectedRows = affectedRows.map(publicPerformanceBaseRow);
  const topKeys = new Set(publicAffectedRows.map(publicPerformanceTopKey).filter(Boolean));
  const activeRows = Array.from(activeRowsBySwimmer.values()).flat();
  activeRows.map(publicPerformanceBaseRow).forEach((row) => {
    const topKey = publicPerformanceTopKey(row);
    if (topKey) topKeys.add(topKey);
  });

  const writtenFiles = new Set();
  for (const topKey of topKeys) {
    const [course, sex, category] = topKey.split("|");
    if (!course || !sex || !category) continue;
    const affectedCandidateKeys = new Set(publicAffectedRows
      .filter((row) => publicPerformanceMatchesTopKey(row, topKey))
      .map(publicPerformanceTopCandidateKey)
      .filter(Boolean));
    activeRows
      .filter((row) => publicPerformanceMatchesTopKey(row, topKey))
      .map(publicPerformanceTopCandidateKey)
      .filter(Boolean)
      .forEach((key) => affectedCandidateKeys.add(key));

    const fileName = publicPerformanceTopFileName(sex, category);
    const fullPath = `tops/${course}/${fileName}`;
    const previewPath = `tops-preview/${course}/${fileName}`;
    const existingRows = await readPublicPerformanceJson(fullPath, []);
    const keptRows = (Array.isArray(existingRows) ? existingRows : [])
      .filter((row) => !affectedCandidateKeys.has(publicPerformanceTopCandidateKey(row)));
    const replacementRows = activeRows.filter((row) => publicPerformanceMatchesTopKey(row, topKey));
    const mergedRows = mergePublicTopRows(keptRows, replacementRows);
    await savePublicPerformanceJson(fullPath, mergedRows, "public, max-age=31536000, immutable");
    await savePublicPerformanceJson(previewPath, mergedRows.slice(0, PUBLIC_PERFORMANCE_TOP_PREVIEW_LIMIT), "public, max-age=31536000, immutable");
    writtenFiles.add(publicPerformanceFilePath(fullPath));
    writtenFiles.add(publicPerformanceFilePath(previewPath));
  }

  return {
    affectedTopBuckets: topKeys.size,
    writtenFiles
  };
}

async function rebuildPublicPerformanceFilesForAffectedRows(affectedRows = [], context = {}) {
  const rows = affectedRows.map(publicPerformanceBaseRow).filter((row) => publicSwimmerKey(row) || publicPerformanceTopKey(row));
  if (!rows.length) return { ok: true, affectedRows: 0, writtenFiles: 0 };

  const swimmerResult = await rebuildPublicSwimmerFilesForAffectedRows(rows);
  const topResult = await rebuildPublicTopFilesForAffectedRows(rows, swimmerResult.activeRowsBySwimmer);
  const generatedAt = context.now || new Date().toISOString();
  const currentManifest = await readPublicPerformanceJson("manifest.json", {});
  const manifest = {
    ...mergePublicPerformanceManifest(currentManifest, Array.from(swimmerResult.activeRowsBySwimmer.values()).flat(), generatedAt),
    lastTargetedRebuild: {
      generatedAt,
      reason: cleanText(context.reason),
      affectedRows: rows.length,
      affectedSwimmers: swimmerResult.affectedSwimmers,
      affectedTopBuckets: topResult.affectedTopBuckets
    }
  };

  const writtenFiles = new Set([...swimmerResult.writtenFiles, ...topResult.writtenFiles]);
  writtenFiles.add(await savePublicPerformanceJson("manifest.json", manifest, "public, max-age=300"));
  writtenFiles.add(await savePublicPerformanceText("version.js", `window.LIVEPALMES_PERFORMANCE_PUBLIC_VERSION = ${JSON.stringify(generatedAt)};\n`, "public, max-age=300"));

  return {
    ok: true,
    affectedRows: rows.length,
    affectedSwimmers: swimmerResult.affectedSwimmers,
    affectedTopBuckets: topResult.affectedTopBuckets,
    writtenFiles: writtenFiles.size,
    reason: cleanText(context.reason)
  };
}

async function performanceBaseMigrationManifest() {
  const response = await fetch(`${PERFORMANCE_PUBLIC_DATA_URL}/performance-base-migration-manifest.json?cache=${Date.now()}`);
  if (!response.ok) {
    throw new HttpsError("failed-precondition", "Manifeste de migration historique introuvable.");
  }
  const manifest = await response.json();
  const chunks = Array.isArray(manifest.chunks) ? manifest.chunks : [];
  return {
    ...manifest,
    chunks: chunks
      .map((chunk) => ({
        name: cleanText(chunk.name),
        performanceCount: Number(chunk.performanceCount || 0) || 0,
        swimmerCount: Number(chunk.swimmerCount || 0) || 0,
        bytes: Number(chunk.bytes || 0) || 0
      }))
      .filter((chunk) => /^chunk-[A-Za-z0-9-]+\.json$/.test(chunk.name))
  };
}

async function migrationChunkStatuses(chunks = []) {
  const db = admin.firestore();
  const refs = chunks.map((chunk) => db.collection(PERFORMANCE_BASE_MIGRATION_COLLECTION).doc(chunk.name));
  const snapshots = refs.length ? await db.getAll(...refs) : [];
  const byName = new Map();
  snapshots.forEach((snapshot) => {
    byName.set(snapshot.id, snapshot.exists ? snapshot.data() || {} : {});
  });
  return chunks.map((chunk) => ({
    ...chunk,
    status: byName.get(chunk.name)?.status || "pending",
    migratedCount: Number(byName.get(chunk.name)?.migratedCount || 0) || 0,
    totalCount: Number(byName.get(chunk.name)?.totalCount || chunk.performanceCount || 0) || 0,
    lastBatchCount: Number(byName.get(chunk.name)?.lastBatchCount || 0) || 0,
    updatedAt: byName.get(chunk.name)?.updatedAt || "",
    completedAt: byName.get(chunk.name)?.completedAt || "",
    error: byName.get(chunk.name)?.error || ""
  }));
}

function historicalRowsFromChunkPayload(payload = {}) {
  const rows = [];
  Object.entries(payload || {}).forEach(([swimmerId, performances]) => {
    if (!Array.isArray(performances)) return;
    performances.forEach((perf) => {
      rows.push({
        ...perf,
        source: perf.source || "intranap",
        swimmerId: String(perf.swimmerId || swimmerId)
      });
    });
  });
  return rows;
}

exports.importHistoricalPerformanceRows = onCall(MIGRATION_CALLABLE_OPTIONS, async (request) => {
  assertAdmin(request);
  const data = request.data || {};
  const source = cleanText(data.source || "intranap").slice(0, 80);
  const rawRows = Array.isArray(data.rows)
    ? data.rows
    : historicalRowsFromChunkPayload(data.payload && typeof data.payload === "object" ? data.payload : {});
  const rows = rawRows
    .slice(0, 2000)
    .map((row) => ({
      ...row,
      source: cleanText(row.source || source || "intranap")
    }))
    .filter((row) => POOL_COURSES.includes(normalizeCourseCode(row.course)) && Number(row.timeValue || 0) > 0);
  if (!rows.length) {
    throw new HttpsError("invalid-argument", "Aucune performance historique valide dans le lot.");
  }
  const now = new Date().toISOString();
  const result = await writePerformanceBaseRows(rows, {
    actorUid: request.auth.uid,
    actorEmail: request.auth.token?.email || "",
    now,
    action: "historicalImport.batch",
    changeSeed: cleanText(data.batchId || now),
    status: "active",
    logChanges: false
  });
  await admin.firestore().collection(PERFORMANCE_BASE_MIGRATION_COLLECTION).doc(cleanText(data.batchId || stableHash(now).slice(0, 24))).set({
    source,
    status: "completed",
    importedCount: result.written,
    updatedAt: now,
    importedBy: request.auth.uid,
    importedByEmail: request.auth.token?.email || ""
  }, { merge: true });
  return {
    ok: true,
    written: result.written
  };
});

async function migrateHistoricalPerformanceBaseChunk(chunkName, request) {
  const cleanChunkName = cleanText(chunkName);
  if (!/^chunk-[A-Za-z0-9-]+\.json$/.test(cleanChunkName)) {
    throw new HttpsError("invalid-argument", "Lot historique invalide.");
  }
  const db = admin.firestore();
  const migrationRef = db.collection(PERFORMANCE_BASE_MIGRATION_COLLECTION).doc(cleanChunkName);
  const existing = await migrationRef.get();
  const existingData = existing.exists ? existing.data() || {} : {};
  if (existingData.status === "completed") {
    return {
      ok: true,
      chunk: cleanChunkName,
      alreadyCompleted: true,
      migratedCount: Number(existingData.migratedCount || 0) || 0
    };
  }

  const now = new Date().toISOString();
  const startIndex = Math.max(0, Number(existingData.migratedCount || 0) || 0);
  await migrationRef.set({
    chunk: cleanChunkName,
    status: "running",
    startedAt: existingData.startedAt || now,
    lastRunStartedAt: now,
    startedBy: request.auth.uid,
    updatedAt: now,
    batchSize: PERFORMANCE_BASE_MIGRATION_BATCH_SIZE,
    migratedCount: startIndex
  }, { merge: true });

  try {
    const response = await fetch(`${PERFORMANCE_PUBLIC_DATA_URL}/intranap-swimmer-perfs/${encodeURIComponent(cleanChunkName)}?cache=${Date.now()}`);
    if (!response.ok) {
      throw new Error(`Fichier ${cleanChunkName} introuvable.`);
    }
    const payload = await response.json();
    const rows = historicalRowsFromChunkPayload(payload);
    const batchRows = rows.slice(startIndex, startIndex + PERFORMANCE_BASE_MIGRATION_BATCH_SIZE);
    if (!batchRows.length) {
      const completedAt = new Date().toISOString();
      await migrationRef.set({
        chunk: cleanChunkName,
        status: "completed",
        migratedCount: rows.length,
        totalCount: rows.length,
        completedAt,
        updatedAt: completedAt,
        error: ""
      }, { merge: true });
      return {
        ok: true,
        chunk: cleanChunkName,
        migratedCount: rows.length,
        totalCount: rows.length,
        completedAt,
        doneWithChunk: true
      };
    }
    const sync = await writePerformanceBaseRows(batchRows, {
      actorUid: request.auth.uid,
      actorEmail: request.auth.token?.email || "",
      now: new Date().toISOString(),
      action: "historicalMigration.chunk",
      changeSeed: cleanChunkName,
      status: "active",
      logChanges: false
    });
    const nextIndex = startIndex + sync.written;
    const doneWithChunk = nextIndex >= rows.length;
    const completedAt = doneWithChunk ? new Date().toISOString() : "";
    const updatedAt = new Date().toISOString();
    await migrationRef.set({
      chunk: cleanChunkName,
      status: doneWithChunk ? "completed" : "partial",
      migratedCount: nextIndex,
      totalCount: rows.length,
      lastBatchCount: sync.written,
      completedAt,
      updatedAt,
      error: ""
    }, { merge: true });
    return {
      ok: true,
      chunk: cleanChunkName,
      migratedCount: nextIndex,
      totalCount: rows.length,
      batchStart: startIndex,
      batchCount: sync.written,
      doneWithChunk,
      completedAt
    };
  } catch (error) {
    const failedAt = new Date().toISOString();
    await migrationRef.set({
      chunk: cleanChunkName,
      status: "error",
      error: error?.message || String(error),
      failedAt,
      updatedAt: failedAt
    }, { merge: true });
    throw new HttpsError("internal", error?.message || "Migration du lot impossible.");
  }
}

async function buildAdditionalPerformanceDataSnapshot() {
  const performanceSnapshot = await admin.firestore()
    .collection(PERFORMANCE_BASE_COLLECTION)
    .where("source", "==", "livepalmes-import")
    .get();

  const performances = performanceSnapshot.docs
    .map((doc) => publicPerformanceBaseRow({ performanceBaseId: doc.id, ...(doc.data() || {}) }))
    .filter((row) => row.active !== false && row.status !== "hidden");

  const correctionsSnapshot = await admin.firestore()
    .collection("performanceCorrections")
    .orderBy("updatedAt", "desc")
    .limit(2000)
    .get();
  const correctionUserIds = Array.from(new Set(correctionsSnapshot.docs
    .map((doc) => cleanText((doc.data() || {}).updatedBy))
    .filter(Boolean)));
  const correctionUserNames = new Map();
  for (let index = 0; index < correctionUserIds.length; index += 10) {
    const chunk = correctionUserIds.slice(index, index + 10);
    const usersSnapshot = await admin.firestore()
      .collection("users")
      .where("uid", "in", chunk)
      .get();
    usersSnapshot.docs.forEach((doc) => {
      const data = doc.data() || {};
      correctionUserNames.set(doc.id, displayNameFromProfile(data));
    });
  }
  const corrections = correctionsSnapshot.docs
    .map((doc) => {
      const data = doc.data() || {};
      const updatedBy = cleanText(data.updatedBy);
      return {
        id: doc.id,
        targetKey: cleanText(data.targetKey),
        targetId: cleanText(data.targetId),
        targetSource: cleanText(data.targetSource),
        targetRow: data.targetRow && typeof data.targetRow === "object" ? data.targetRow : {},
        hidden: data.hidden === true,
        patch: data.patch && typeof data.patch === "object" ? data.patch : {},
        updatedAt: cleanText(data.updatedAt),
        updatedByName: cleanText(data.updatedByName) || correctionUserNames.get(updatedBy) || ""
      };
    })
    .filter((correction) => correction.targetKey);

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    importCount: Array.from(new Set(performances.map((row) => cleanText(row.importId)).filter(Boolean))).length,
    performanceCount: performances.length,
    correctionCount: corrections.length,
    source: PERFORMANCE_BASE_COLLECTION,
    swimmers: buildAdditionalPerformanceSwimmers(performances),
    performances,
    corrections
  };
}

async function publishAdditionalPerformanceDataSnapshot() {
  const snapshot = await buildAdditionalPerformanceDataSnapshot();
  return saveAdditionalPerformanceDataSnapshot({
    ...snapshot,
    incremental: false
  });
}

exports.exportAdditionalPerformanceData = onCall(CALLABLE_OPTIONS, async (request) => {
  assertCapability(request, "competitions.import");
  return buildAdditionalPerformanceDataSnapshot();
});

exports.publishPerformancePublicData = onCall(PUBLIC_PERFORMANCE_CALLABLE_OPTIONS, async (request) => {
  assertAdmin(request);
  try {
    const publicSnapshot = await publishAdditionalPerformanceDataSnapshot();
    await writeAuditLog("performancePublicData.published", request.auth.uid, {
      path: publicSnapshot.path,
      importCount: publicSnapshot.importCount,
      performanceCount: publicSnapshot.performanceCount
    });
    return publicSnapshot;
  } catch (error) {
    console.error("Publication publique des performances impossible", {
      message: error?.message || String(error),
      code: error?.code || "",
      stack: error?.stack || ""
    });
    throw new HttpsError("failed-precondition", error?.message || "Publication publique impossible.");
  }
});

exports.getPerformanceBaseMigrationStatus = onCall(MIGRATION_CALLABLE_OPTIONS, async (request) => {
  assertAdmin(request);
  const manifest = await performanceBaseMigrationManifest();
  const chunks = await migrationChunkStatuses(manifest.chunks);
  const completed = chunks.filter((chunk) => chunk.status === "completed").length;
  return {
    ok: true,
    generatedAt: manifest.generatedAt || "",
    totalChunks: chunks.length,
    completedChunks: completed,
    pendingChunks: chunks.length - completed,
    totalPerformances: chunks.reduce((sum, chunk) => sum + Number(chunk.performanceCount || 0), 0),
    migratedPerformances: chunks.reduce((sum, chunk) => sum + Number(chunk.migratedCount || 0), 0),
    chunks
  };
});

exports.migratePerformanceBaseNextChunk = onCall(MIGRATION_CALLABLE_OPTIONS, async (request) => {
  assertAdmin(request);
  const manifest = await performanceBaseMigrationManifest();
  const chunks = await migrationChunkStatuses(manifest.chunks);
  const next = chunks.find((chunk) => chunk.status !== "completed");
  if (!next) {
    return {
      ok: true,
      done: true,
      message: "Tous les lots historiques sont deja migres."
    };
  }
  const result = await migrateHistoricalPerformanceBaseChunk(next.name, request);
  const updatedChunks = await migrationChunkStatuses(manifest.chunks);
  return {
    ...result,
    done: false,
    completedChunks: updatedChunks.filter((chunk) => chunk.status === "completed").length,
    totalChunks: updatedChunks.length,
    migratedPerformances: updatedChunks.reduce((sum, chunk) => sum + Number(chunk.migratedCount || 0), 0),
    totalPerformances: updatedChunks.reduce((sum, chunk) => sum + Number(chunk.performanceCount || 0), 0)
  };
});

exports.savePerformanceCorrection = onCall(CALLABLE_OPTIONS, async (request) => {
  assertCapability(request, "competitions.import");
  const data = request.data || {};
  const targetKey = cleanText(data.targetKey).slice(0, 240);
  if (!targetKey) {
    throw new HttpsError("invalid-argument", "Performance cible manquante.");
  }
  const reason = cleanText(data.reason).slice(0, 500);
  if (!reason) {
    throw new HttpsError("invalid-argument", "Motif obligatoire.");
  }
  const allowedPatchFields = new Set([
    "time",
    "timeValue",
    "club",
    "clubName",
    "location",
    "date",
    "rank",
    "points",
    "intermediateTimes"
  ]);
  const rawPatch = data.patch && typeof data.patch === "object" ? data.patch : {};
  const patch = {};
  Object.keys(rawPatch).forEach((key) => {
    if (!allowedPatchFields.has(key)) return;
    if (key === "timeValue") {
      const value = Number(rawPatch[key]);
      if (Number.isFinite(value) && value > 0) patch[key] = value;
      return;
    }
    if (key === "intermediateTimes") {
      patch[key] = Array.isArray(rawPatch[key])
        ? rawPatch[key].slice(0, 12).map((split) => ({
          distance: Number(split?.distance || 0) || "",
          code: cleanText(split?.code).slice(0, 20),
          time: cleanText(split?.time).slice(0, 20),
          timeValue: Number(split?.timeValue || 0) || 0
        })).filter((split) => split.code || split.time)
        : [];
      return;
    }
    patch[key] = cleanText(rawPatch[key]).slice(0, key === "location" || key === "clubName" ? 160 : 80);
  });

  const targetRowKeys = new Set([
    "id", "source", "swimmerId", "originalSwimmerId", "swimmerIdentityKey", "swimmer", "firstName", "lastName", "birthDate",
    "sex", "clubId", "club", "clubName", "regionId", "regionLabel", "competitionId", "competition", "location", "date",
    "seasonYear", "pool", "chrono", "course", "courseLabel", "courseShortLabel", "style", "length", "isIntermediate",
    "originCourse", "originCourseShortLabel", "originPerformanceId", "category", "categoryCode", "categoryLabel",
    "timeValue", "time", "rank", "points", "intermediateTimes"
  ]);
  const rawTargetRow = data.targetRow && typeof data.targetRow === "object" ? data.targetRow : {};
  const targetRow = {};
  Object.keys(rawTargetRow).forEach((key) => {
    if (!targetRowKeys.has(key)) return;
    if (key === "timeValue" || key === "seasonYear" || key === "length") {
      const value = Number(rawTargetRow[key]);
      if (Number.isFinite(value)) targetRow[key] = value;
      return;
    }
    if (key === "isIntermediate") {
      targetRow[key] = rawTargetRow[key] === true;
      return;
    }
    if (key === "intermediateTimes") {
      targetRow[key] = Array.isArray(rawTargetRow[key])
        ? rawTargetRow[key].slice(0, 12).map((split) => ({
          distance: Number(split?.distance || 0) || "",
          code: cleanText(split?.code).slice(0, 20),
          time: cleanText(split?.time).slice(0, 20),
          timeValue: Number(split?.timeValue || 0) || 0
        })).filter((split) => split.code || split.time)
        : [];
      return;
    }
    targetRow[key] = cleanText(rawTargetRow[key]).slice(0, 180);
  });

  const hidden = data.hidden === true;
  if (!hidden && !Object.keys(patch).length) {
    throw new HttpsError("invalid-argument", "Aucune correction a enregistrer.");
  }

  const now = new Date().toISOString();
  const updatedByName = await accessUserDisplayName(request.auth.uid, request.auth.token || {});
  const correctionId = stableHash(targetKey).slice(0, 32);
  const ref = admin.firestore().collection("performanceCorrections").doc(correctionId);
  const existing = await ref.get();
  const payload = {
    id: correctionId,
    targetKey,
    targetId: cleanText(data.targetId).slice(0, 180),
    targetSource: cleanText(data.targetSource).slice(0, 80),
    targetSummary: cleanFirestoreValue(data.targetSummary && typeof data.targetSummary === "object" ? data.targetSummary : {}),
    targetRow: cleanFirestoreValue(targetRow),
    hidden,
    patch: cleanFirestoreValue(patch),
    reason,
    updatedAt: now,
    updatedBy: request.auth.uid,
    updatedByEmail: request.auth.token?.email || "",
    updatedByName,
    createdAt: existing.exists ? existing.data()?.createdAt || now : now,
    createdBy: existing.exists ? existing.data()?.createdBy || request.auth.uid : request.auth.uid
  };
  const safePayload = cleanFirestoreValue(payload);
  await ref.set(safePayload, { merge: false });
  await ref.collection("history").add({
    ...safePayload,
    correctionId,
    savedAt: now
  });
  await writeAuditLog(hidden ? "performanceCorrection.hidden" : "performanceCorrection.updated", request.auth.uid, {
    correctionId,
    targetKey,
    targetId: payload.targetId,
    targetSource: payload.targetSource,
    hidden,
    reason
  });

  let performanceBaseSync = null;
  let correctedBaseRow = null;
  try {
    const baseRow = {
      ...(safePayload.targetRow || {}),
      ...(hidden ? {} : safePayload.patch || {}),
      publicKey: targetKey,
      source: safePayload.targetSource || safePayload.targetRow?.source || "intranap",
      id: safePayload.targetId || safePayload.targetRow?.id || ""
    };
    correctedBaseRow = baseRow;
    performanceBaseSync = await writePerformanceBaseRows([baseRow], {
      actorUid: request.auth.uid,
      actorEmail: request.auth.token?.email || "",
      now,
      action: hidden ? "performanceCorrection.hidden" : "performanceCorrection.updated",
      changeSeed: correctionId,
      status: hidden ? "hidden" : "active",
      topIndexIncludeTombstones: hidden,
      dtnInvalidationRows: [safePayload.targetRow || {}, baseRow]
    });
  } catch (error) {
    console.error("Synchronisation performances impossible apres correction", {
      correctionId,
      targetKey,
      message: error?.message || String(error)
    });
    performanceBaseSync = {
      ok: false,
      error: error?.message || "Synchronisation performances impossible."
    };
  }

  let publicSnapshot;
  try {
    publicSnapshot = await publishIncrementalPerformanceCorrection({
      id: correctionId,
      targetKey: safePayload.targetKey,
      targetId: safePayload.targetId,
      targetSource: safePayload.targetSource,
      targetRow: safePayload.targetRow || {},
      hidden: safePayload.hidden === true,
      patch: safePayload.patch || {},
      updatedAt: safePayload.updatedAt,
      updatedByName: safePayload.updatedByName || ""
    });
  } catch (error) {
    console.error("Publication publique des corrections impossible", {
      correctionId,
      targetKey,
      message: error?.message || String(error)
    });
    publicSnapshot = {
      ok: false,
      error: error?.message || "Publication publique impossible."
    };
  }

  let publicFilesSnapshot = null;
  try {
    publicFilesSnapshot = await rebuildPublicPerformanceFilesForAffectedRows([
      safePayload.targetRow || {},
      correctedBaseRow || {}
    ], {
      now,
      reason: hidden ? "performanceCorrection.hidden" : "performanceCorrection.updated",
      correctionId
    });
  } catch (error) {
    console.error("Publication publique ciblee impossible apres correction", {
      correctionId,
      targetKey,
      message: error?.message || String(error)
    });
    publicFilesSnapshot = {
      ok: false,
      error: error?.message || "Publication publique ciblee impossible."
    };
  }
  return {
    ok: true,
    correction: {
      id: correctionId,
      targetKey,
      hidden,
      patch,
      updatedAt: now
    },
    performanceBaseSync,
    publicSnapshot,
    publicFilesSnapshot
  };
});
