const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const admin = require("firebase-admin");
const PDFDocument = require("pdfkit");
const { HttpsError, onCall } = require("firebase-functions/v2/https");
const { onDocumentUpdated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { consoleRoleClaims, hasConsolePortalCapability } = require("./console-access");
const intranapSwimmersReference = require("./intranap-swimmers-reference.json");
const intranapSwimmersIndex = require("./assets/intranap-swimmers-index.json");
const { nextPublicResultsIndex } = require("./public-results-index");

admin.initializeApp();
admin.firestore().settings({ ignoreUndefinedProperties: true });

const REGION = "europe-west1";
const COMPETITION_IDS = new Set(["livepalmes-active", "livepalmes-test"]);
const ADMIN_UIDS = new Set(["AgvWJjvLOfe3uB0lz0Xr3wwJxzT2"]);
const ROLES = ["live", "speaker", "referee", "video", "computer", "secretary"];
const ROLE_SET = new Set(ROLES);
const ENGAGEMENT_COMPETITION_LEVELS = new Set(["departemental", "regional", "national"]);
const ENGAGEMENT_ENTRY_STATUSES = new Set(["upcoming", "open", "closed"]);
const ENGAGEMENT_POOL_LENGTHS = new Set(["25", "33", "50"]);
const ENGAGEMENT_TIMING_TYPES = new Set(["manual", "electronic"]);
const ENGAGEMENT_QUALIFICATION_TIME_MODES = new Set(["all", "period"]);
const ENGAGEMENT_MISSING_ENTRY_TIME_MODES = new Set(["manual", "forbidden", "default595999"]);
const ENGAGEMENT_REQUIRE_ENTRY_SWIMMER_LICENSE = true;
const ENGAGEMENT_LICENSE_VERIFICATION_STATUSES = new Set(["verified", "pending", "rejected", "conflict"]);
const ENGAGEMENT_LICENSE_SEASON_STATUSES = new Set(["to_check", "valid", "invalid"]);
const ACCESS_CAPABILITIES = [
  "admin.full",
  "records.manage",
  "consoles.manage",
  "consoles.access",
  "competitions.import",
  "dtn.view",
  "engagements.club.manage",
  "engagements.region.manage",
  "engagements.national.manage"
];
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
const ENGAGEMENT_PDF_LOGO_PATH = path.join(__dirname, "assets", "logo-ffessm-nage-avec-palmes.png");
const PUBLIC_PERFORMANCE_TOP_PREVIEW_LIMIT = 100;
const PERFORMANCE_BASE_COLLECTION = "performances";
const PERFORMANCE_BASE_CHANGES_COLLECTION = "performanceChanges";
const PERFORMANCE_BASE_MIGRATION_COLLECTION = "performanceMigrationJobs";
const PERFORMANCE_SWIMMERS_COLLECTION = "performanceSwimmerIndex";
const PERFORMANCE_SWIMMER_PAGES_COLLECTION = "performanceSwimmerPages";
const PERFORMANCE_SWIMMER_INDEX_STATE_COLLECTION = "performanceSwimmerIndexState";
const PERFORMANCE_TOP_BUCKETS_COLLECTION = "performanceTopViews";
const PERFORMANCE_TOP_INDEX_STATE_COLLECTION = "performanceTopIndexState";
const ENGAGEMENT_CLUB_ROSTERS_COLLECTION = "engagementClubRosters";
const ENGAGEMENT_COMPETITION_CALENDARS_COLLECTION = "engagementCompetitionCalendars";
const ENGAGEMENT_COMPETITION_ENTRY_SUMMARIES_COLLECTION = "engagementCompetitionEntrySummaries";
const ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION = "engagementClubPeopleRosters";
const ENGAGEMENT_ENTRY_TIME_CACHES_COLLECTION = "engagementEntryTimeCaches";
const ENGAGEMENT_ENTRY_TIME_CACHE_VERSION = 1;
const ENGAGEMENT_DOCUMENTS_STORAGE_PREFIX = "entry-documents";
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
const ENGAGEMENT_RELAY_EVENTS = [
  ["4X50SF", "4 x 50 m Surface", "4 x 50 SF", "SF", 50, 4, "mastersOnly"],
  ["4X100SF", "4 x 100 m Surface", "4 x 100 SF", "SF", 100, 4],
  ["4X200SF", "4 x 200 m Surface", "4 x 200 SF", "SF", 200, 4],
  ["4X100BI", "4 x 100 m Bi-palmes mixte", "4 x 100 BI", "BI", 100, 4, "required"],
  ["4X100SB", "4 x 100 m Surface/Bi-palmes mixte", "4 x 100 SB", "SB", 100, 4, "required"]
];
const ENGAGEMENT_EVENT_DEFINITIONS = [
  ...POOL_COURSES.map((code) => {
    const meta = COURSE_META[code] || [code, code, courseStyleFromCode(code), courseLengthFromCode(code)];
    return {
      code,
      type: "individual",
      label: meta[0],
      shortLabel: meta[1],
      discipline: meta[2],
      distance: meta[3]
    };
  }),
  ...ENGAGEMENT_RELAY_EVENTS.map(([code, label, shortLabel, discipline, distance, relayLegs, relayMixedRule]) => ({
    code,
    type: "relay",
    label,
    shortLabel,
    discipline,
    distance,
    relayLegs,
    ...(relayMixedRule ? { relayMixedRule } : {})
  }))
];
const ENGAGEMENT_EVENT_DEFINITION_BY_CODE = new Map(
  ENGAGEMENT_EVENT_DEFINITIONS.map((event) => [event.code, event])
);
const ENGAGEMENT_INDIVIDUAL_CATEGORY_CODES = ["P", "B", "M", "C", "J", "S", "M30+", "M40+", "M50+", "M60+", "M70+", "M80+"];
const ENGAGEMENT_RELAY_CATEGORY_CODES = ["P", "B", "M", "C", "J", "S", "R140", "R180", "R220", "R260"];
const ENGAGEMENT_RELAY_AGE_CATEGORY_RANK = {
  P: 0,
  B: 1,
  M: 2,
  C: 3,
  J: 4,
  S: 5
};
const ENGAGEMENT_CATEGORY_CODES = Array.from(new Set([
  ...ENGAGEMENT_INDIVIDUAL_CATEGORY_CODES,
  ...ENGAGEMENT_RELAY_CATEGORY_CODES
]));
const ENGAGEMENT_CATEGORY_CODE_SET = new Set(ENGAGEMENT_CATEGORY_CODES);
const ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES = {
  "50AP": new Set(["P", "B", "M"])
};
const ENGAGEMENT_RELAY_MIXED_MODES = new Set(["none", "masters", "required"]);
const ENGAGEMENT_PROGRAM_GENDER_MODES = new Set(["female", "male", "mixed"]);

function engagementCategoryCodesForEvent(code) {
  const definition = ENGAGEMENT_EVENT_DEFINITION_BY_CODE.get(code);
  return definition?.type === "relay"
    ? ENGAGEMENT_RELAY_CATEGORY_CODES
    : ENGAGEMENT_INDIVIDUAL_CATEGORY_CODES;
}

function normalizeEngagementEventCategoryRestrictions(code, categories = []) {
  const allowedCategories = engagementCategoryCodesForEvent(code)
    .filter((category) => !(ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES[code] || new Set()).has(category));
  const restrictionSet = new Set(categories.filter((category) => allowedCategories.includes(category)));
  if (code === "50AP") {
    const legacyDefault = ["C", "J", "S", "M30+", "M40+", "M50+"];
    if (legacyDefault.every((category) => restrictionSet.has(category)) && ["M60+", "M70+", "M80+"].some((category) => !restrictionSet.has(category))) {
      return allowedCategories;
    }
  }
  return Array.from(restrictionSet);
}

function cleanEngagementRelayMixedMode(rawEvent = {}, definition = {}) {
  if (definition.type !== "relay") return "";
  if (definition.relayMixedRule === "required") return "required";
  if (definition.relayMixedRule === "mastersOnly") {
    const mode = cleanText(rawEvent.relayMixedMode).trim();
    return ENGAGEMENT_RELAY_MIXED_MODES.has(mode) && mode === "masters" ? "masters" : "none";
  }
  return "";
}

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
  const explicitCapabilityRequired = capability === "dtn.view" || capability.startsWith("engagements.");
  const adminFallbackAllowed = !explicitCapabilityRequired && capabilities["admin.full"] === true;
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
  const regionId = cleanText(raw.regionId).slice(0, 80);
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
  if (capabilities.includes("engagements.club.manage") && !clubId) {
    throw new HttpsError("invalid-argument", "Numero de club obligatoire pour un acces engagements club.");
  }
  if (capabilities.includes("engagements.region.manage") && !regionId) {
    throw new HttpsError("invalid-argument", "Region obligatoire pour un acces engagements region.");
  }
  const accessScopes = accessScopesMapFromProfile({ clubId, regionId, capabilities });
  return { uid, email, firstName, lastName, clubId, clubName, regionId, licenseNumber, capabilities, accessScopes };
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

function normalizedAccessScope(scope = {}) {
  const scopeType = ["club", "region", "national"].includes(cleanText(scope.scopeType))
    ? cleanText(scope.scopeType)
    : "national";
  return {
    scopeType,
    scopeId: scopeType === "national" ? "" : cleanText(scope.scopeId).slice(0, 80)
  };
}

function accessScopeForCapability(profile = {}, capability) {
  if (capability === "engagements.club.manage") {
    return normalizedAccessScope({ scopeType: "club", scopeId: profile.clubId });
  }
  if (capability === "engagements.region.manage") {
    return normalizedAccessScope({ scopeType: "region", scopeId: profile.regionId });
  }
  return normalizedAccessScope({ scopeType: "national", scopeId: "" });
}

function accessScopesMapFromProfile(profile = {}) {
  return (profile.capabilities || []).reduce((acc, capability) => {
    acc[capability] = accessScopeForCapability(profile, capability);
    return acc;
  }, {});
}

function hasEngagementsCapability(capabilities = {}) {
  return capabilities["engagements.club.manage"] === true ||
    capabilities["engagements.region.manage"] === true ||
    capabilities["engagements.national.manage"] === true;
}

async function engagementAccessContext(request) {
  const uid = request.auth?.uid || "";
  if (!uid) {
    throw new HttpsError("unauthenticated", "Connexion Firebase requise.");
  }
  if (ADMIN_UIDS.has(uid)) {
    return {
      uid,
      email: cleanText(request.auth?.token?.email).slice(0, 180),
      national: true,
      region: true,
      regionId: ""
    };
  }
  const snapshot = await admin.firestore().collection("users").doc(uid).get();
  const data = snapshot.exists ? snapshot.data() || {} : {};
  if (!snapshot.exists || data.status !== "active") {
    throw new HttpsError("permission-denied", "Acces LivePalmes desactive.");
  }
  const capabilities = data.capabilities || request.auth?.token?.livepalmesCapabilities || {};
  const accessScopes = data.accessScopes || {};
  const national = capabilities["engagements.national.manage"] === true;
  const region = capabilities["engagements.region.manage"] === true;
  const regionScope = normalizedAccessScope(accessScopes["engagements.region.manage"]);
  return {
    uid,
    email: cleanText(request.auth?.token?.email || data.email).slice(0, 180),
    national,
    region,
    regionId: regionScope.scopeId || cleanText(data.regionId).slice(0, 80)
  };
}

async function accessManagementContext(request) {
  const uid = request.auth?.uid || "";
  if (!uid) {
    throw new HttpsError("unauthenticated", "Connexion Firebase requise.");
  }
  const tokenCapabilities = request.auth?.token?.livepalmesCapabilities || {};
  if (ADMIN_UIDS.has(uid) || tokenCapabilities["admin.full"] === true) {
    return {
      uid,
      email: cleanText(request.auth?.token?.email).slice(0, 180),
      adminFull: true,
      national: true,
      region: true,
      regionId: ""
    };
  }
  const snapshot = await admin.firestore().collection("users").doc(uid).get();
  const data = snapshot.exists ? snapshot.data() || {} : {};
  if (!snapshot.exists || data.status !== "active") {
    throw new HttpsError("permission-denied", "Acces LivePalmes desactive.");
  }
  const capabilities = data.capabilities || tokenCapabilities || {};
  const accessScopes = data.accessScopes || {};
  const national = capabilities["engagements.national.manage"] === true;
  const region = capabilities["engagements.region.manage"] === true;
  if (!national && !region) {
    throw new HttpsError("permission-denied", "Droit de gestion des acces requis.");
  }
  const regionScope = normalizedAccessScope(accessScopes["engagements.region.manage"]);
  return {
    uid,
    email: cleanText(request.auth?.token?.email || data.email).slice(0, 180),
    adminFull: false,
    national,
    region,
    regionId: regionScope.scopeId || cleanText(data.regionId).slice(0, 80)
  };
}

function accessUserRegionIdFromData(data = {}) {
  const regionScope = normalizedAccessScope(data.accessScopes?.["engagements.region.manage"]);
  return regionScope.scopeId || cleanText(data.regionId).slice(0, 80);
}

function accessUserCanBeManagedByRegional(context, data = {}) {
  if (!context?.region || !context.regionId) return false;
  const capabilities = data.capabilities || {};
  if (capabilities["admin.full"] === true || capabilities["engagements.national.manage"] === true) return false;
  if (capabilities["engagements.region.manage"] !== true) return false;
  return accessUserRegionIdFromData(data) === context.regionId;
}

function accessUserVisibleForAccessDirectory(context, doc) {
  if (context?.national) return true;
  return accessUserCanBeManagedByRegional(context, doc.data() || {});
}

function assertRegionalAccessUserDeletionRequestAllowed(context, targetData = {}) {
  if (context?.national) return;
  if (!accessUserCanBeManagedByRegional(context, targetData)) {
    throw new HttpsError("permission-denied", "Demande limitee aux admins region de ta region.");
  }
}

async function engagementClubAccessContext(request) {
  const uid = request.auth?.uid || "";
  if (!uid) {
    throw new HttpsError("unauthenticated", "Connexion Firebase requise.");
  }
  const snapshot = await admin.firestore().collection("users").doc(uid).get();
  const data = snapshot.exists ? snapshot.data() || {} : {};
  if (!snapshot.exists || data.status !== "active") {
    throw new HttpsError("permission-denied", "Acces LivePalmes desactive.");
  }
  const capabilities = data.capabilities || request.auth?.token?.livepalmesCapabilities || {};
  if (capabilities["engagements.club.manage"] !== true) {
    throw new HttpsError("permission-denied", "Droit engagements club requis.");
  }
  const accessScopes = data.accessScopes || {};
  const clubScope = normalizedAccessScope(accessScopes["engagements.club.manage"]);
  const clubId = cleanText(clubScope.scopeId || data.clubId).slice(0, 40);
  if (!clubId) {
    throw new HttpsError("failed-precondition", "Numero de club requis pour les engagements club.");
  }
  return {
    uid,
    email: cleanText(request.auth?.token?.email || data.email).slice(0, 180),
    clubId,
    clubName: cleanText(data.clubName).slice(0, 140),
    regionId: cleanText(data.regionId).slice(0, 80)
  };
}

async function assertEngagementsAccess(request) {
  const uid = request.auth?.uid || "";
  if (!uid) {
    throw new HttpsError("unauthenticated", "Connexion Firebase requise.");
  }
  if (ADMIN_UIDS.has(uid)) return;
  const tokenCapabilities = request.auth?.token?.livepalmesCapabilities || {};
  if (request.auth?.token?.livepalmesAccess === true && hasEngagementsCapability(tokenCapabilities)) return;

  const snapshot = await admin.firestore().collection("users").doc(uid).get();
  const data = snapshot.exists ? snapshot.data() || {} : {};
  if (!snapshot.exists || data.status !== "active" || !hasEngagementsCapability(data.capabilities || {})) {
    throw new HttpsError("permission-denied", "Droit engagements requis.");
  }
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

async function saveAccessUserProfile(profile, actorUid) {
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
    regionId: profile.regionId,
    licenseNumber: profile.licenseNumber,
    status: "active",
    capabilities: capabilityMap,
    accessScopes: profile.accessScopes,
    updatedAt: now,
    updatedBy: actorUid,
    ...(created ? { createdAt: now, createdBy: actorUid } : {})
  }, { merge: true });

  await writeAccessGrants(user.uid, profile.email, profile.capabilities, "active", actorUid, now, profile.accessScopes);

  await writeAuditLog(created ? "accessUser.created" : "accessUser.updated", actorUid, {
    uid: user.uid,
    email: profile.email,
    capabilities: profile.capabilities,
    accessScopes: profile.accessScopes
  });

  return {
    ok: true,
    created,
    uid: user.uid,
    email: profile.email,
    capabilities: profile.capabilities
  };
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

async function writeAccessGrants(uid, email, capabilities, status, actorUid, now, accessScopes = {}) {
  const batch = admin.firestore().batch();
  ACCESS_CAPABILITIES.forEach((capability) => {
    const grantRef = admin.firestore().collection("accessGrants").doc(`${uid}_${capability.replace(".", "_")}`);
    const scope = normalizedAccessScope(accessScopes[capability]);
    batch.set(grantRef, {
      uid,
      email,
      capability,
      scopeType: scope.scopeType,
      scopeId: scope.scopeId,
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

function engagementRelayReferenceCourseCode(course) {
  const code = normalizeCourseCode(course);
  return code === "4X100BI" ? "4X100BIX" : code;
}

function engagementRelayReferenceRows(recordsData = {}) {
  return [
    ...(Array.isArray(recordsData.franceRecords) ? recordsData.franceRecords : []).map((row) => ({
      ...row,
      alertType: row.recordType === "RFJ" ? "RFJ" : "RF",
      alertLabel: row.recordType === "RFJ" ? "Record de France Junior club" : "Record de France club"
    })),
    ...(Array.isArray(recordsData.records) ? recordsData.records : []).map((row) => ({
      ...row,
      alertType: "MPF",
      alertLabel: "Meilleure Performance Francaise club"
    }))
  ].filter((row) =>
    normalizeCourseCode(row.course).startsWith("4X") &&
    (cleanText(row.relayType).toLowerCase() === "club" || cleanText(row.style).toUpperCase() === "RELAY_CLUB") &&
    (row.sex === "F" || row.sex === "M") &&
    Number(row.value || 0) > 0 &&
    cleanText(row.time) &&
    cleanText(row.time) !== "A etablir" &&
    cleanText(row.time) !== "À établir"
  );
}

function engagementRelayReferenceKey(row = {}) {
  return [
    cleanText(row.alertType || row.recordType || "MPF"),
    cleanText(row.mixedRelay) === "true" || row.mixedRelay === true ? "MIXED" : cleanText(row.sex),
    cleanText(row.alertType) === "MPF" ? cleanText(row.category) : "",
    normalizeCourseCode(row.course)
  ].join("|");
}

function engagementRelayReferenceMap(recordsData = {}) {
  const byKey = new Map();
  engagementRelayReferenceRows(recordsData).forEach((row) => {
    const key = engagementRelayReferenceKey(row);
    const existing = byKey.get(key);
    if (!existing || Number(row.value || 0) < Number(existing.value || 0)) byKey.set(key, row);
  });
  return byKey;
}

function engagementRelayReferenceForEntry(referenceMap, type, relay = {}) {
  const sex = relay.genderMode === "mixed" ? "MIXED" : relay.genderMode === "male" ? "M" : "F";
  const course = engagementRelayReferenceCourseCode(relay.eventCode);
  const key = [type, sex, type === "MPF" ? relay.category : "", course].join("|");
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

function currentEngagementSeasonInfo(date = new Date()) {
  const year = date.getUTCFullYear();
  const startYear = date.getUTCMonth() >= 8 ? year : year - 1;
  return {
    startYear,
    endYear: startYear + 1,
    label: `${startYear}-${startYear + 1}`
  };
}

function cleanEngagementLicenseVerificationStatus(value, fallback = "pending") {
  const status = cleanText(value).toLowerCase();
  return ENGAGEMENT_LICENSE_VERIFICATION_STATUSES.has(status) ? status : fallback;
}

function cleanEngagementLicenseSeasonStatus(value, fallback = "to_check") {
  const status = cleanText(value).toLowerCase();
  return ENGAGEMENT_LICENSE_SEASON_STATUSES.has(status) ? status : fallback;
}

function engagementLicenseSeasonState(data = {}, date = new Date()) {
  const season = currentEngagementSeasonInfo(date);
  const seasons = data.licenseSeasons && typeof data.licenseSeasons === "object" ? data.licenseSeasons : {};
  const stored = seasons[season.label] && typeof seasons[season.label] === "object" ? seasons[season.label] : {};
  const legacyStatus = cleanText(data.licenseSeasonLabel) === season.label ? data.licenseSeasonStatus : "";
  return {
    startYear: season.startYear,
    endYear: season.endYear,
    label: season.label,
    status: cleanEngagementLicenseSeasonStatus(stored.status || legacyStatus, "to_check")
  };
}

function engagementSeasonEndYearFromIsoDate(dateIso = "") {
  const cleanDate = cleanIsoDate(dateIso);
  if (!cleanDate) return currentEngagementSeasonInfo(new Date()).endYear;
  return importSeasonYear(cleanDate) || currentEngagementSeasonInfo(new Date()).endYear;
}

function engagementSeasonBoundsFromEndYear(endYear) {
  const year = Math.trunc(Number(endYear) || currentEngagementSeasonInfo(new Date()).endYear);
  return {
    startYear: year - 1,
    endYear: year,
    label: `${year - 1}-${year}`,
    startDate: `${year - 1}-09-01`,
    endDate: `${year}-08-31`
  };
}

function currentEngagementCategoryFromBirthDate(birthDate) {
  return ageCategoryFromDates(new Date().toISOString().slice(0, 10), birthDate);
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
  return saveAccessUserProfile(profile, request.auth.uid);
});

function cleanEngagementAccessRequestPayload(raw = {}, request = {}) {
  const authEmail = normalizeEmail(request.auth?.token?.email || "");
  const email = normalizeEmail(raw.email || authEmail);
  assertEmail(email);
  const firstName = cleanText(raw.firstName).slice(0, 80);
  const lastName = cleanText(raw.lastName).slice(0, 80);
  const clubRole = cleanText(raw.clubRole).slice(0, 120);
  const clubId = cleanText(raw.clubId).slice(0, 40);
  const clubName = cleanText(raw.clubName).slice(0, 140);
  const regionId = cleanText(raw.regionId).slice(0, 80);
  const licenseNumber = cleanText(raw.licenseNumber).slice(0, 60);
  const message = cleanText(raw.message).slice(0, 600);
  if (!firstName || !lastName || !clubId || !regionId || !licenseNumber) {
    throw new HttpsError("invalid-argument", "Nom, prenom, club, region et licence sont obligatoires.");
  }
  return { email, firstName, lastName, clubRole, clubId, clubName, regionId, licenseNumber, message };
}

function engagementAccessRequestItem(doc) {
  const data = doc.data() || {};
  return cleanFirestoreValue({
    id: doc.id,
    email: cleanText(data.email).slice(0, 180),
    firstName: cleanText(data.firstName).slice(0, 80),
    lastName: cleanText(data.lastName).slice(0, 80),
    clubRole: cleanText(data.clubRole).slice(0, 120),
    clubId: cleanText(data.clubId).slice(0, 40),
    clubName: cleanText(data.clubName).slice(0, 140),
    regionId: cleanText(data.regionId).slice(0, 80),
    licenseNumber: cleanText(data.licenseNumber).slice(0, 60),
    message: cleanText(data.message).slice(0, 600),
    status: cleanText(data.status || "pending").slice(0, 40),
    requestedBy: cleanText(data.requestedBy).slice(0, 80),
    requestedByEmail: cleanText(data.requestedByEmail).slice(0, 180),
    requestedAt: cleanText(data.requestedAt).slice(0, 40),
    resolvedAt: cleanText(data.resolvedAt).slice(0, 40),
    resolvedBy: cleanText(data.resolvedBy).slice(0, 80),
    resolvedByEmail: cleanText(data.resolvedByEmail).slice(0, 180)
  });
}

function assertEngagementAccessRequestScope(context = {}, requestData = {}) {
  if (context.national) return;
  if (!context.region) {
    throw new HttpsError("permission-denied", "Droit engagements region ou national requis.");
  }
  if (!context.regionId || cleanText(requestData.regionId) !== context.regionId) {
    throw new HttpsError("permission-denied", "Demande hors perimetre regional.");
  }
}

exports.submitEngagementAccessRequest = onCall(CALLABLE_OPTIONS, async (request) => {
  const uid = cleanText(request.auth?.uid);
  const payload = cleanEngagementAccessRequestPayload(request.data || {}, request);
  const now = new Date().toISOString();
  const requestId = stableHash(`${payload.email}|${payload.clubId}|engagements.club.manage`).slice(0, 40);
  const ref = admin.firestore().collection("engagementAccessRequests").doc(requestId);
  const snapshot = await ref.get();
  if (snapshot.exists && snapshot.data()?.status === "pending") {
    throw new HttpsError("already-exists", "Une demande est deja en attente pour cet email et ce club.");
  }
  await ref.set({
    ...payload,
    status: "pending",
    requestedBy: uid || "public-login-page",
    requestedByEmail: cleanText(request.auth?.token?.email || payload.email).slice(0, 180),
    requestSource: uid ? "authenticated-portal" : "login-page",
    requestedAt: now,
    updatedAt: now,
    updatedBy: uid || "public-login-page"
  }, { merge: true });
  await writeAuditLog("engagementAccessRequest.submitted", uid || "public-login-page", {
    requestId,
    email: payload.email,
    clubId: payload.clubId,
    regionId: payload.regionId
  });
  const updated = await ref.get();
  return {
    ok: true,
    request: engagementAccessRequestItem(updated)
  };
});

exports.listEngagementAccessRequests = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  if (!context.region && !context.national) {
    throw new HttpsError("permission-denied", "Lecture reservee aux responsables engagements region ou national.");
  }
  const status = ["pending", "approved", "rejected"].includes(cleanText(request.data?.status))
    ? cleanText(request.data.status)
    : "pending";
  const limit = Math.min(200, Math.max(20, Math.trunc(Number(request.data?.limit) || 80)));
  const snapshot = await admin.firestore()
    .collection("engagementAccessRequests")
    .where("status", "==", status)
    .limit(limit)
    .get();
  const requests = snapshot.docs
    .map(engagementAccessRequestItem)
    .filter((item) => context.national || item.regionId === context.regionId)
    .sort((left, right) =>
      cleanText(right.requestedAt).localeCompare(cleanText(left.requestedAt)) ||
      cleanText(left.lastName).localeCompare(cleanText(right.lastName), "fr")
    );
  return {
    ok: true,
    requests
  };
});

exports.resolveEngagementAccessRequest = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  const requestId = cleanText(request.data?.requestId).slice(0, 80);
  const decision = cleanText(request.data?.decision);
  if (!requestId) {
    throw new HttpsError("invalid-argument", "Demande requise.");
  }
  if (!["approved", "rejected"].includes(decision)) {
    throw new HttpsError("invalid-argument", "Decision invalide.");
  }
  const ref = admin.firestore().collection("engagementAccessRequests").doc(requestId);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Demande introuvable.");
  }
  const data = snapshot.data() || {};
  if (data.status !== "pending") {
    throw new HttpsError("failed-precondition", "Demande deja traitee.");
  }
  assertEngagementAccessRequestScope(context, data);
  const now = new Date().toISOString();
  let accessResult = null;
  let resolvedData = data;
  if (decision === "approved") {
    resolvedData = {
      ...data,
      ...cleanEngagementAccessRequestPayload({
        ...data,
        ...(request.data?.correctedRequest && typeof request.data.correctedRequest === "object" ? request.data.correctedRequest : {})
      }, request)
    };
    assertEngagementAccessRequestScope(context, resolvedData);
    const profile = cleanAccessProfile({
      firstName: resolvedData.firstName,
      lastName: resolvedData.lastName,
      email: resolvedData.email,
      clubId: resolvedData.clubId,
      clubName: resolvedData.clubName,
      regionId: resolvedData.regionId,
      licenseNumber: resolvedData.licenseNumber,
      capabilities: ["engagements.club.manage"]
    });
    accessResult = await saveAccessUserProfile(profile, context.uid);
  }
  await ref.set({
    ...(decision === "approved" ? {
      email: resolvedData.email,
      firstName: resolvedData.firstName,
      lastName: resolvedData.lastName,
      clubId: resolvedData.clubId,
      clubName: resolvedData.clubName,
      regionId: resolvedData.regionId,
      licenseNumber: resolvedData.licenseNumber
    } : {}),
    status: decision,
    resolvedAt: now,
    resolvedBy: context.uid,
    resolvedByEmail: context.email,
    updatedAt: now,
    updatedBy: context.uid,
    ...(accessResult ? { accessUid: accessResult.uid } : {})
  }, { merge: true });
  await writeAuditLog("engagementAccessRequest.resolved", context.uid, {
    requestId,
    decision,
    email: cleanText(resolvedData.email).slice(0, 180),
    clubId: cleanText(resolvedData.clubId).slice(0, 40),
    regionId: cleanText(resolvedData.regionId).slice(0, 80),
    corrected: decision === "approved" && JSON.stringify(resolvedData) !== JSON.stringify(data),
    accessUid: accessResult?.uid || ""
  });
  const updated = await ref.get();
  return {
    ok: true,
    request: engagementAccessRequestItem(updated),
    access: accessResult
  };
});

function accessUserListItem(doc) {
  const data = doc.data() || {};
  return {
    uid: doc.id,
    email: data.email || "",
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    clubId: data.clubId || "",
    clubName: data.clubName || "",
    regionId: data.regionId || "",
    licenseNumber: data.licenseNumber || "",
    status: data.status || "active",
    capabilities: activeCapabilitiesFromMap(data.capabilities || {}),
    accessScopes: data.accessScopes || {},
    updatedAt: data.updatedAt || "",
    lastLoginAt: data.lastLoginAt || ""
  };
}

function accessUserDeletionRequestItem(doc) {
  const data = doc.data() || {};
  return {
    id: doc.id,
    targetUid: data.targetUid || "",
    targetEmail: data.targetEmail || "",
    targetFirstName: data.targetFirstName || "",
    targetLastName: data.targetLastName || "",
    targetRegionId: data.targetRegionId || "",
    targetClubId: data.targetClubId || "",
    targetClubName: data.targetClubName || "",
    targetCapabilities: Array.isArray(data.targetCapabilities) ? data.targetCapabilities : [],
    status: data.status || "pending",
    requestedBy: data.requestedBy || "",
    requestedByEmail: data.requestedByEmail || "",
    requestedAt: data.requestedAt || "",
    resolvedBy: data.resolvedBy || "",
    resolvedAt: data.resolvedAt || "",
    decision: data.decision || ""
  };
}

function accessUserMatchesFilters(doc, status, capability) {
  const data = doc.data() || {};
  if (status && (data.status || "active") !== status) return false;
  if (capability && data.capabilities?.[capability] !== true) return false;
  return true;
}

function normalizedDirectoryText(value) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr");
}

function accessUserContainsSearch(doc, search) {
  const data = doc.data() || {};
  const haystack = [data.firstName, data.lastName, data.email, data.clubId, data.clubName, data.regionId, data.licenseNumber]
    .map(normalizedDirectoryText)
    .join(" ");
  return normalizedDirectoryText(search).split(/\s+/).filter(Boolean).every((term) => haystack.includes(term));
}

async function searchAccessUserDocuments(search) {
  const usersRef = admin.firestore().collection("users");
  const raw = cleanText(search).slice(0, 80);
  const variantsFor = (value) => {
    const titleCase = value.toLocaleLowerCase("fr").replace(/(^|[\s'-])\p{L}/gu, (letter) => letter.toLocaleUpperCase("fr"));
    return [...new Set([value, titleCase, value.toLocaleUpperCase("fr")].filter(Boolean))];
  };
  let querySpecs = [];
  if (raw.includes("@")) {
    querySpecs = [{ field: "email", variants: [raw.toLocaleLowerCase("fr")] }];
  } else if (/^[a-z\d-]+$/i.test(raw) && /\d/.test(raw)) {
    const variants = [...new Set([raw, raw.toLocaleUpperCase("fr")])];
    querySpecs = [
      { field: "licenseNumber", variants },
      { field: "clubId", variants }
    ];
  } else {
    const nameSeed = raw.split(/\s+/).filter(Boolean).at(-1) || raw;
    querySpecs = [
      { field: "lastName", variants: variantsFor(nameSeed) },
      { field: "firstName", variants: variantsFor(nameSeed) },
      { field: "clubName", variants: variantsFor(raw) }
    ];
  }
  const snapshots = await Promise.all(querySpecs.flatMap(({ field, variants }) => variants.map((variant) => usersRef
    .orderBy(field)
    .startAt(variant)
    .endAt(`${variant}\uf8ff`)
    .limit(100)
    .get())));
  const documents = new Map();
  snapshots.forEach((snapshot) => snapshot.docs.forEach((doc) => documents.set(doc.id, doc)));
  return [...documents.values()]
    .filter((doc) => accessUserContainsSearch(doc, raw))
    .sort((left, right) => {
      const leftData = left.data() || {};
      const rightData = right.data() || {};
      return `${leftData.lastName || ""}\u0000${leftData.firstName || ""}\u0000${left.id}`
        .localeCompare(`${rightData.lastName || ""}\u0000${rightData.firstName || ""}\u0000${right.id}`, "fr", { sensitivity: "base" });
    });
}

exports.listAccessUsers = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await accessManagementContext(request);
  const pageSize = Math.min(50, Math.max(10, Math.trunc(Number(request.data?.pageSize) || 25)));
  const status = ["active", "inactive"].includes(cleanText(request.data?.status))
    ? cleanText(request.data.status)
    : "";
  const capability = ACCESS_CAPABILITY_SET.has(cleanText(request.data?.capability))
    ? cleanText(request.data.capability)
    : "";
  const search = cleanText(request.data?.search).slice(0, 80);
  const cursor = request.data?.cursor && typeof request.data.cursor === "object" ? request.data.cursor : {};

  if (search) {
    const offset = Math.max(0, Math.trunc(Number(cursor.offset) || 0));
    const matches = (await searchAccessUserDocuments(search))
      .filter((doc) => accessUserMatchesFilters(doc, status, capability))
      .filter((doc) => accessUserVisibleForAccessDirectory(context, doc));
    const page = matches.slice(offset, offset + pageSize);
    return {
      ok: true,
      directoryVersion: 2,
      users: page.map(accessUserListItem),
      nextCursor: offset + pageSize < matches.length ? { offset: offset + pageSize } : null
    };
  }

  const usersRef = admin.firestore().collection("users");
  const documentId = admin.firestore.FieldPath.documentId();
  const matchingDocs = [];
  let queryCursor = cleanText(cursor.uid) && typeof cursor.lastName === "string"
    ? { lastName: cursor.lastName, uid: cleanText(cursor.uid) }
    : null;
  let exhausted = false;

  while (matchingDocs.length <= pageSize && !exhausted) {
    let query = usersRef.orderBy("lastName").orderBy(documentId);
    if (queryCursor) query = query.startAfter(queryCursor.lastName, queryCursor.uid);
    const batchSize = status || capability ? 100 : pageSize + 1;
    const snapshot = await query.limit(batchSize).get();
    if (!snapshot.size) break;
    for (const doc of snapshot.docs) {
      queryCursor = { lastName: doc.data()?.lastName || "", uid: doc.id };
      if (accessUserMatchesFilters(doc, status, capability) && accessUserVisibleForAccessDirectory(context, doc)) matchingDocs.push(doc);
      if (matchingDocs.length > pageSize) break;
    }
    exhausted = snapshot.size < batchSize;
  }

  const page = matchingDocs.slice(0, pageSize);
  const lastVisible = page.at(-1);
  return {
    ok: true,
    directoryVersion: 2,
    users: page.map(accessUserListItem),
    nextCursor: matchingDocs.length > pageSize && lastVisible
      ? { lastName: lastVisible.data()?.lastName || "", uid: lastVisible.id }
      : null
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
  const accessScopes = data.accessScopes || {};
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
  await writeAccessGrants(uid, email, capabilities, status, request.auth.uid, now, accessScopes);
  await writeAuditLog(status === "active" ? "accessUser.activated" : "accessUser.deactivated", request.auth.uid, {
    uid,
    email,
    capabilities,
    accessScopes
  });
  return {
    ok: true,
    uid,
    status
  };
});

async function deleteAccessUserAccount(uid, actorUid, source = {}) {
  const targetUid = cleanText(uid);
  if (!targetUid) {
    throw new HttpsError("invalid-argument", "Utilisateur requis.");
  }
  if (targetUid === actorUid) {
    throw new HttpsError("failed-precondition", "Tu ne peux pas supprimer ton propre acces.");
  }
  if (ADMIN_UIDS.has(targetUid)) {
    throw new HttpsError("failed-precondition", "Ce compte administrateur racine ne peut pas etre supprime.");
  }
  const userRef = admin.firestore().collection("users").doc(targetUid);
  const snapshot = await userRef.get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Acces LivePalmes introuvable.");
  }
  const data = snapshot.data() || {};
  const capabilities = activeCapabilitiesFromMap(data.capabilities || {});
  const email = data.email || "";
  try {
    await admin.auth().deleteUser(targetUid);
  } catch (error) {
    if (error?.code !== "auth/user-not-found") throw error;
  }
  const batch = admin.firestore().batch();
  batch.delete(userRef);
  ACCESS_CAPABILITIES.forEach((capability) => {
    batch.delete(admin.firestore().collection("accessGrants").doc(`${targetUid}_${capability.replace(".", "_")}`));
  });
  await batch.commit();
  await writeAuditLog("accessUser.deleted", actorUid, {
    uid: targetUid,
    email,
    capabilities,
    regionId: data.regionId || "",
    clubId: data.clubId || "",
    source
  });
  return {
    ok: true,
    uid: targetUid,
    email
  };
}

exports.deleteAccessUser = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await accessManagementContext(request);
  if (!context.national) {
    throw new HttpsError("permission-denied", "Admin national requis.");
  }
  if (request.data?.confirmPermanent !== true) {
    throw new HttpsError("failed-precondition", "Confirmation de suppression definitive requise.");
  }
  return deleteAccessUserAccount(request.data?.uid, context.uid, { mode: "direct" });
});

exports.requestAccessUserDeletion = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await accessManagementContext(request);
  if (context.national) {
    throw new HttpsError("failed-precondition", "Un admin national peut supprimer directement ce compte.");
  }
  const targetUid = cleanText(request.data?.uid);
  if (!targetUid) {
    throw new HttpsError("invalid-argument", "Utilisateur requis.");
  }
  if (targetUid === context.uid) {
    throw new HttpsError("failed-precondition", "Tu ne peux pas demander la suppression de ton propre acces.");
  }
  const userRef = admin.firestore().collection("users").doc(targetUid);
  const snapshot = await userRef.get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Acces LivePalmes introuvable.");
  }
  const data = snapshot.data() || {};
  assertRegionalAccessUserDeletionRequestAllowed(context, data);

  const pendingSnapshot = await admin.firestore().collection("accessUserDeletionRequests")
    .where("targetUid", "==", targetUid)
    .where("status", "==", "pending")
    .limit(1)
    .get();
  if (!pendingSnapshot.empty) {
    throw new HttpsError("already-exists", "Une demande de suppression est deja en attente pour ce compte.");
  }

  const now = new Date().toISOString();
  const requestRef = await admin.firestore().collection("accessUserDeletionRequests").add({
    targetUid,
    targetEmail: data.email || "",
    targetFirstName: data.firstName || "",
    targetLastName: data.lastName || "",
    targetRegionId: accessUserRegionIdFromData(data),
    targetClubId: data.clubId || "",
    targetClubName: data.clubName || "",
    targetCapabilities: activeCapabilitiesFromMap(data.capabilities || {}),
    status: "pending",
    requestedBy: context.uid,
    requestedByEmail: context.email || "",
    requestedAt: now,
    updatedAt: now
  });
  await writeAuditLog("accessUser.deletionRequested", context.uid, {
    requestId: requestRef.id,
    uid: targetUid,
    email: data.email || "",
    regionId: accessUserRegionIdFromData(data)
  });
  const created = await requestRef.get();
  return {
    ok: true,
    request: accessUserDeletionRequestItem(created)
  };
});

exports.listAccessUserDeletionRequests = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await accessManagementContext(request);
  if (!context.national) {
    throw new HttpsError("permission-denied", "Admin national requis.");
  }
  const snapshot = await admin.firestore().collection("accessUserDeletionRequests")
    .where("status", "==", "pending")
    .limit(100)
    .get();
  const requests = snapshot.docs
    .map(accessUserDeletionRequestItem)
    .sort((left, right) => String(left.requestedAt || "").localeCompare(String(right.requestedAt || "")));
  return {
    ok: true,
    requests
  };
});

exports.resolveAccessUserDeletionRequest = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await accessManagementContext(request);
  if (!context.national) {
    throw new HttpsError("permission-denied", "Admin national requis.");
  }
  const requestId = cleanText(request.data?.requestId);
  const decision = cleanText(request.data?.decision);
  if (!requestId) {
    throw new HttpsError("invalid-argument", "Demande requise.");
  }
  if (!["approved", "rejected"].includes(decision)) {
    throw new HttpsError("invalid-argument", "Decision invalide.");
  }
  const requestRef = admin.firestore().collection("accessUserDeletionRequests").doc(requestId);
  const snapshot = await requestRef.get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Demande introuvable.");
  }
  const data = snapshot.data() || {};
  if (data.status !== "pending") {
    throw new HttpsError("failed-precondition", "Cette demande a deja ete traitee.");
  }
  let deletionResult = null;
  if (decision === "approved") {
    deletionResult = await deleteAccessUserAccount(data.targetUid, context.uid, { mode: "request", requestId });
  }
  const now = new Date().toISOString();
  await requestRef.set({
    status: decision,
    decision,
    resolvedBy: context.uid,
    resolvedByEmail: context.email || "",
    resolvedAt: now,
    updatedAt: now,
    targetDeleted: decision === "approved"
  }, { merge: true });
  await writeAuditLog("accessUser.deletionRequestResolved", context.uid, {
    requestId,
    decision,
    uid: data.targetUid || "",
    email: data.targetEmail || ""
  });
  return {
    ok: true,
    requestId,
    decision,
    deletion: deletionResult
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
  const accessScopes = userData.accessScopes || {};
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
      const scope = normalizedAccessScope(accessScopes[capability]);
      batch.set(grantRef, {
        uid,
        email,
        capability,
        scopeType: scope.scopeType,
        scopeId: scope.scopeId,
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
  const authTimeSeconds = Number(request.auth?.token?.auth_time) || 0;
  const lastLoginAt = authTimeSeconds ? new Date(authTimeSeconds * 1000).toISOString() : (data.lastLoginAt || "");
  if (snapshot.exists && lastLoginAt && lastLoginAt !== data.lastLoginAt) {
    await snapshot.ref.set({ lastLoginAt }, { merge: true }).catch((error) => {
      console.warn("Mise a jour de la derniere connexion impossible", error);
    });
  }
  if (ADMIN_UIDS.has(uid)) {
    return {
      ok: true,
      uid,
      email: data.email || request.auth?.token?.email || "",
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      clubId: data.clubId || "",
      clubName: data.clubName || "",
      regionId: data.regionId || "",
      licenseNumber: data.licenseNumber || "",
      status: "active",
      capabilities: ACCESS_CAPABILITIES,
      accessScopes: data.accessScopes || {},
      lastLoginAt
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
    clubId: data.clubId || "",
    clubName: data.clubName || "",
    regionId: data.regionId || "",
    licenseNumber: data.licenseNumber || "",
    status: "active",
    capabilities,
    accessScopes: data.accessScopes || {},
    lastLoginAt
  };
});

function cleanIsoDate(value) {
  const text = cleanText(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function cleanEngagementCompetitionLevel(value) {
  const level = cleanText(value);
  return ENGAGEMENT_COMPETITION_LEVELS.has(level) ? level : "regional";
}

function cleanEngagementEntryStatus(value) {
  const status = cleanText(value);
  return ENGAGEMENT_ENTRY_STATUSES.has(status) ? status : "upcoming";
}

function cleanOptionalEmail(value, label = "Email") {
  const email = normalizeEmail(value).slice(0, 180);
  if (!email) return "";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new HttpsError("invalid-argument", `${label} invalide.`);
  }
  return email;
}

function cleanEngagementPoolLength(value) {
  const poolLength = cleanText(value);
  return ENGAGEMENT_POOL_LENGTHS.has(poolLength) ? poolLength : "50";
}

function cleanEngagementTimingType(value) {
  const timingType = cleanText(value);
  return ENGAGEMENT_TIMING_TYPES.has(timingType) ? timingType : "electronic";
}

function cleanEngagementQualificationTimesMode(value) {
  const mode = cleanText(value);
  return ENGAGEMENT_QUALIFICATION_TIME_MODES.has(mode) ? mode : "all";
}

function cleanEngagementMissingEntryTimeMode(value) {
  const mode = cleanText(value);
  return ENGAGEMENT_MISSING_ENTRY_TIME_MODES.has(mode) ? mode : "manual";
}

function cleanEngagementMaxEventsPerSwimmer(value) {
  const count = Math.trunc(Number(value) || 0);
  return Math.min(20, Math.max(0, count));
}

function cleanEngagementFeeAmount(value) {
  const amount = Number(value) || 0;
  return Math.min(9999, Math.max(0, Math.round(amount * 100) / 100));
}

function cleanEngagementFees(rawFees = {}, options = {}) {
  if (!rawFees || typeof rawFees !== "object") {
    return {
      swimmerFee: 0,
      individualEventFee: 0,
      relayFee: 0,
      helloAssoUrl: "",
      latePaymentSurcharge: 50
    };
  }
  const strict = options.strict !== false;
  const helloAssoUrl = cleanText(rawFees.helloAssoUrl).slice(0, 300);
  if (helloAssoUrl && !/^https?:\/\/\S+$/i.test(helloAssoUrl)) {
    if (strict) throw new HttpsError("invalid-argument", "Lien HelloAsso invalide.");
  }
  return {
    swimmerFee: cleanEngagementFeeAmount(rawFees.swimmerFee),
    individualEventFee: cleanEngagementFeeAmount(rawFees.individualEventFee),
    relayFee: cleanEngagementFeeAmount(rawFees.relayFee),
    helloAssoUrl: /^https?:\/\/\S+$/i.test(helloAssoUrl) ? helloAssoUrl : "",
    latePaymentSurcharge: 50
  };
}

function cleanEngagementCompetitionEvents(rawEvents = [], options = {}) {
  if (!Array.isArray(rawEvents)) return [];
  const strict = options.strict !== false;
  const seen = new Set();
  const events = [];
  rawEvents.slice(0, 80).forEach((rawEvent) => {
    const code = cleanText(rawEvent?.code).toUpperCase().replace(/\s+/g, "");
    const definition = ENGAGEMENT_EVENT_DEFINITION_BY_CODE.get(code);
    if (!definition) {
      if (strict) throw new HttpsError("invalid-argument", `Course engagements inconnue : ${code || "-"}.`);
      return;
    }
    if (seen.has(code)) return;
    seen.add(code);
    const forbiddenCategories = ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES[code] || new Set();
    const allowedCategories = engagementCategoryCodesForEvent(code).filter((category) => !forbiddenCategories.has(category));
    const categoryRestrictions = [];
    const seenCategories = new Set();
    if (Array.isArray(rawEvent?.categoryRestrictions)) {
      rawEvent.categoryRestrictions.slice(0, 20).forEach((rawCategory) => {
        const category = cleanText(rawCategory).toUpperCase().replace(/\s+/g, "");
        if (!category) return;
        if (!ENGAGEMENT_CATEGORY_CODE_SET.has(category)) {
          if (strict) throw new HttpsError("invalid-argument", `Categorie inconnue pour ${code} : ${category}.`);
          return;
        }
        if (!allowedCategories.includes(category)) {
          if (strict) throw new HttpsError("invalid-argument", `Categorie non autorisee pour ${code} : ${category}.`);
          return;
        }
        if (forbiddenCategories.has(category)) return;
        if (seenCategories.has(category)) return;
        seenCategories.add(category);
        categoryRestrictions.push(category);
      });
    }
    const normalizedCategoryRestrictions = normalizeEngagementEventCategoryRestrictions(
      code,
      forbiddenCategories.size && !categoryRestrictions.length ? allowedCategories : categoryRestrictions
    );
    const relayMixedMode = cleanEngagementRelayMixedMode(rawEvent, definition);
    events.push({
      ...definition,
      categoryRestrictions: normalizedCategoryRestrictions,
      ...(relayMixedMode ? { relayMixedMode } : {}),
      ...(definition.type === "relay" ? { multipleRelaysAllowed: rawEvent?.multipleRelaysAllowed === true } : {})
    });
  });
  return events;
}

function cleanEngagementProgramSessions(rawSessions = [], selectedEvents = [], options = {}) {
  if (!Array.isArray(rawSessions)) return [];
  const strict = options.strict !== false;
  const selectedCodes = new Set(selectedEvents.map((event) => cleanText(event?.code).toUpperCase()).filter(Boolean));
  const usedProgramSlots = new Map();
  function slotConflict(eventCode, genderMode) {
    const usedModes = usedProgramSlots.get(eventCode) || new Set();
    if (genderMode === "mixed") return usedModes.size > 0;
    return usedModes.has("mixed") || usedModes.has(genderMode);
  }
  function registerSlot(eventCode, genderMode) {
    if (!usedProgramSlots.has(eventCode)) usedProgramSlots.set(eventCode, new Set());
    usedProgramSlots.get(eventCode).add(genderMode);
  }
  return rawSessions.slice(0, 12).map((rawSession, sessionIndex) => {
    const label = `Session ${sessionIndex + 1}`;
    const date = cleanIsoDate(rawSession?.date);
    const startTime = /^\d{2}:\d{2}$/.test(cleanText(rawSession?.startTime)) ? cleanText(rawSession.startTime) : "";
    const items = [];
    if (Array.isArray(rawSession?.items)) {
      rawSession.items.slice(0, 160).forEach((rawItem) => {
        const eventCode = cleanText(rawItem?.eventCode || rawItem?.code).toUpperCase().replace(/\s+/g, "");
        const definition = ENGAGEMENT_EVENT_DEFINITION_BY_CODE.get(eventCode);
        if (!definition || (selectedCodes.size && !selectedCodes.has(eventCode))) {
          if (strict) throw new HttpsError("invalid-argument", `Epreuve programme inconnue ou non selectionnee : ${eventCode || "-"}.`);
          return;
        }
        const requestedGenderMode = ENGAGEMENT_PROGRAM_GENDER_MODES.has(cleanText(rawItem?.genderMode))
          ? cleanText(rawItem.genderMode)
          : "mixed";
        const genderMode = definition.relayMixedRule === "required" ? "mixed" : requestedGenderMode;
        if (slotConflict(eventCode, genderMode)) {
          if (strict) throw new HttpsError("invalid-argument", `Doublon dans le programme : ${eventCode} ${genderMode}.`);
          return;
        }
        registerSlot(eventCode, genderMode);
        items.push({
          eventCode,
          genderMode,
          order: items.length + 1
        });
      });
    }
    return {
      id: cleanText(rawSession?.id).slice(0, 40) || `session-${sessionIndex + 1}`,
      label,
      date,
      startTime,
      order: sessionIndex + 1,
      items
    };
  }).filter((session) => session.items.length || session.label);
}

function engagementCompetitionCalendarItem(data = {}, id = "") {
  const events = cleanEngagementCompetitionEvents(data.events || [], { strict: false });
  const programSessions = cleanEngagementProgramSessions(data.programSessions || [], events, { strict: false });
  return {
    id: cleanText(id || data.id).slice(0, 128),
    name: cleanText(data.name || data.title).slice(0, 160),
    date: cleanIsoDate(data.date),
    endDate: cleanIsoDate(data.endDate) || cleanIsoDate(data.date),
    location: cleanText(data.location).slice(0, 160),
    regionId: cleanText(data.regionId).slice(0, 80),
    level: cleanEngagementCompetitionLevel(data.level || data.competitionLevel),
    entryDeadlineAt: cleanText(data.entryDeadlineAt).slice(0, 40),
    computerEmail: normalizeEmail(data.computerEmail).slice(0, 180),
    entryStatus: cleanEngagementEntryStatus(data.entryStatus || data.status),
    officialsRequired: data.officialsRequired === true,
    poolLength: cleanEngagementPoolLength(data.poolLength),
    timingType: cleanEngagementTimingType(data.timingType),
    qualificationTimesMode: cleanEngagementQualificationTimesMode(data.qualificationTimesMode),
    qualificationStartDate: cleanIsoDate(data.qualificationStartDate),
    qualificationEndDate: cleanIsoDate(data.qualificationEndDate),
    missingEntryTimeMode: cleanEngagementMissingEntryTimeMode(data.missingEntryTimeMode),
    maxEventsPerSwimmer: cleanEngagementMaxEventsPerSwimmer(data.maxEventsPerSwimmer),
    eventCount: events.length,
    individualEventCount: events.filter((event) => event.type === "individual").length,
    relayEventCount: events.filter((event) => event.type === "relay").length,
    sessionCount: programSessions.length,
    programItemCount: programSessions.reduce((sum, session) => sum + session.items.length, 0),
    updatedAt: cleanText(data.updatedAt).slice(0, 40)
  };
}

function engagementCompetitionListItem(doc) {
  return engagementCompetitionCalendarItem(doc.data() || {}, doc.id);
}

function engagementCompetitionCalendarRef(db, endYear) {
  return db.collection(ENGAGEMENT_COMPETITION_CALENDARS_COLLECTION).doc(String(Math.trunc(Number(endYear) || 0)));
}

function engagementCompetitionCalendarItemsFromData(data = {}) {
  const competitions = data.competitions && typeof data.competitions === "object" ? data.competitions : {};
  return Object.values(competitions)
    .map((competition) => engagementCompetitionCalendarItem(competition, competition.id))
    .filter((competition) => competition.id && competition.date);
}

function filterEngagementCompetitionCalendarItems(items = [], filters = {}) {
  return items
    .filter((competition) => !filters.startDate || !competition.date || competition.date >= filters.startDate)
    .filter((competition) => !filters.endDate || !competition.date || competition.date <= filters.endDate)
    .filter((competition) => !filters.regionId || competition.regionId === filters.regionId)
    .filter((competition) => !filters.level || competition.level === filters.level)
    .filter((competition) => !filters.entryStatus || competition.entryStatus === filters.entryStatus)
    .sort((left, right) =>
      cleanText(left.date).localeCompare(cleanText(right.date)) ||
      cleanText(left.name).localeCompare(cleanText(right.name), "fr")
    );
}

async function rebuildEngagementCompetitionCalendar(db, endYear) {
  const season = engagementSeasonBoundsFromEndYear(endYear);
  const snapshot = await db.collection("engagementCompetitions")
    .where("date", ">=", season.startDate)
    .where("date", "<=", season.endDate)
    .orderBy("date")
    .limit(1200)
    .get();
  const competitions = {};
  snapshot.docs.forEach((doc) => {
    const item = engagementCompetitionListItem(doc);
    if (item.id) competitions[item.id] = item;
  });
  const now = new Date().toISOString();
  await engagementCompetitionCalendarRef(db, season.endYear).set({
    ...season,
    generatedAt: now,
    updatedAt: now,
    competitionCount: Object.keys(competitions).length,
    competitions
  }, { merge: false });
  return Object.values(competitions);
}

async function syncEngagementCompetitionCalendarFromChange(event = {}) {
  const before = event.data?.before?.exists ? event.data.before.data() || {} : null;
  const after = event.data?.after?.exists ? event.data.after.data() || {} : null;
  const competitionId = cleanText(event.params?.competitionId);
  if (!competitionId) return;
  const db = admin.firestore();
  const now = new Date().toISOString();
  const batch = db.batch();
  let batchSize = 0;
  const beforeDate = before ? cleanIsoDate(before.date) : "";
  const afterDate = after ? cleanIsoDate(after.date) : "";
  const beforeSeason = beforeDate ? engagementSeasonEndYearFromIsoDate(beforeDate) : null;
  const afterSeason = afterDate ? engagementSeasonEndYearFromIsoDate(afterDate) : null;
  if (beforeSeason !== null && (!after || beforeSeason !== afterSeason)) {
    batch.set(engagementCompetitionCalendarRef(db, beforeSeason), {
      updatedAt: now,
      competitions: {
        [competitionId]: admin.firestore.FieldValue.delete()
      }
    }, { merge: true });
    batchSize += 1;
  }
  if (after && afterDate && afterSeason !== null) {
    batch.set(engagementCompetitionCalendarRef(db, afterSeason), {
      updatedAt: now,
      competitions: {
        [competitionId]: engagementCompetitionCalendarItem(after, competitionId)
      }
    }, { merge: true });
    batchSize += 1;
  }
  if (batchSize) await batch.commit();
}

exports.syncEngagementCompetitionToCalendar = onDocumentWritten({
  region: REGION,
  document: "engagementCompetitions/{competitionId}"
}, async (event) => {
  await syncEngagementCompetitionCalendarFromChange(event);
});

function engagementCompetitionDetailItem(doc) {
  const data = doc.data() || {};
  const events = cleanEngagementCompetitionEvents(data.events || [], { strict: false });
  return {
    ...engagementCompetitionListItem(doc),
    events,
    programSessions: cleanEngagementProgramSessions(data.programSessions || [], events, { strict: false }),
    fees: cleanEngagementFees(data.fees || {}, { strict: false }),
    documents: engagementCompetitionDocumentsMetadata(data.documents || {}),
    createdAt: cleanText(data.createdAt).slice(0, 40),
    createdBy: cleanText(data.createdBy).slice(0, 128),
    updatedBy: cleanText(data.updatedBy).slice(0, 128)
  };
}

function engagementClubEntryId(competitionId, clubId) {
  return `${cleanText(competitionId).slice(0, 128)}_${cleanText(clubId).slice(0, 40)}`;
}

function cleanEngagementTeamLeader(raw = {}) {
  const mode = cleanText(raw.mode) === "renounced" ? "renounced" : "person";
  if (mode === "renounced") {
    return {
      mode,
      renunciationAccepted: raw.renunciationAccepted === true
    };
  }
  const firstName = cleanText(raw.firstName).slice(0, 80);
  const lastName = cleanText(raw.lastName).slice(0, 80);
  const licenseNumber = cleanText(raw.licenseNumber).slice(0, 60);
  const externalClub = raw.externalClub === true;
  const clubId = cleanText(raw.clubId).slice(0, 40);
  const clubName = cleanText(raw.clubName).slice(0, 140);
  if (!firstName || !lastName) {
    throw new HttpsError("invalid-argument", "Nom et prenom du chef d'equipe obligatoires.");
  }
  if (!licenseNumber) {
    throw new HttpsError("invalid-argument", "Numero de licence du chef d'equipe obligatoire.");
  }
  if (externalClub && !clubId) {
    throw new HttpsError("invalid-argument", "Club du chef d'equipe obligatoire.");
  }
  return {
    mode,
    firstName,
    lastName,
    licenseNumber,
    externalClub,
    clubId,
    clubName
  };
}

function engagementTeamLeaderComplete(teamLeader = {}) {
  if (teamLeader.mode === "renounced") return teamLeader.renunciationAccepted === true;
  return Boolean(teamLeader.mode === "person" && teamLeader.firstName && teamLeader.lastName && teamLeader.licenseNumber);
}

function cleanEngagementEntryOfficial(raw = {}) {
  return {
    personId: cleanText(raw.personId).slice(0, 80),
    firstName: cleanText(raw.firstName).slice(0, 80),
    lastName: cleanText(raw.lastName).slice(0, 80),
    licenseNumber: cleanText(raw.licenseNumber).slice(0, 60)
  };
}

function parseEngagementEntryTime(value) {
  const text = cleanText(value).replace(",", ".").replace(/\s+/g, "");
  if (!text) return null;
  if (text === "595999" || text === "59:59.99") {
    return { display: "59:59.99", value: 359999 };
  }
  const digitText = text.replace(/\D/g, "");
  if (/^\d{1,6}$/.test(text) && digitText === text) {
    const padded = digitText.padStart(digitText.length <= 4 ? 4 : 6, "0");
    const hundredths = Number(padded.slice(-2));
    const seconds = Number(padded.slice(-4, -2));
    const minutes = Number(padded.slice(0, -4) || 0);
    if (seconds >= 60) return null;
    const value = minutes * 6000 + seconds * 100 + hundredths;
    return value > 0 ? { display: formatTimeValue(value), value } : null;
  }
  const parsedValue = parseTimeValue(text);
  return parsedValue ? { display: formatTimeValue(parsedValue), value: parsedValue } : null;
}

function cleanEngagementEntryIndividualEntries(rawEntries = [], allowedCodes = null) {
  if (!Array.isArray(rawEntries)) return [];
  const seen = new Set();
  return rawEntries.slice(0, 80).map((rawEntry) => {
    const eventCode = cleanText(rawEntry?.eventCode || rawEntry?.code || rawEntry)
      .toUpperCase()
      .replace(/\s+/g, "");
    if (!eventCode || seen.has(eventCode) || (allowedCodes && !allowedCodes.has(eventCode))) return null;
    seen.add(eventCode);
    return {
      eventCode,
      status: cleanText(rawEntry?.status || "selected").slice(0, 40) || "selected",
      manualEntryTime: cleanText(rawEntry?.manualEntryTime || rawEntry?.entryTimeManual).slice(0, 20),
      entryTime: cleanText(rawEntry?.entryTime).slice(0, 20),
      entryTimeValue: Number(rawEntry?.entryTimeValue || 0) || 0,
      entryTimeMode: cleanText(rawEntry?.entryTimeMode).slice(0, 40),
      entryTimeWarning: cleanText(rawEntry?.entryTimeWarning).slice(0, 220),
      sourcePerformanceId: cleanText(rawEntry?.sourcePerformanceId).slice(0, 120),
      date: cleanIsoDate(rawEntry?.date),
      location: cleanText(rawEntry?.location).slice(0, 160)
    };
  }).filter(Boolean);
}

function cleanEngagementEntrySwimmer(raw = {}) {
  const licenseSeason = engagementLicenseSeasonState(raw);
  return {
    swimmerIndexId: cleanText(raw.swimmerIndexId).slice(0, 80),
    source: cleanText(raw.source || "performances").slice(0, 40),
    swimmerId: cleanText(raw.swimmerId).slice(0, 80),
    identityKey: cleanText(raw.identityKey).slice(0, 180),
    firstName: cleanText(raw.firstName).slice(0, 80),
    lastName: cleanText(raw.lastName).slice(0, 80),
    name: cleanText(raw.name).slice(0, 160),
    birthDate: cleanIsoDate(raw.birthDate),
    sex: cleanText(raw.sex).slice(0, 20),
    clubId: cleanText(raw.clubId).slice(0, 40),
    club: cleanText(raw.club).slice(0, 60),
    clubName: cleanText(raw.clubName).slice(0, 140),
    licenseNumber: cleanText(raw.licenseNumber).slice(0, 60),
    licenseVerificationStatus: cleanEngagementLicenseVerificationStatus(raw.licenseVerificationStatus || raw.verificationStatus, "pending"),
    licenseSeasonLabel: cleanText(raw.licenseSeasonLabel || licenseSeason.label).slice(0, 20),
    licenseSeasonStatus: cleanEngagementLicenseSeasonStatus(raw.licenseSeasonStatus || licenseSeason.status, "to_check"),
    licenseLocked: raw.licenseLocked === true || raw.licenseNumberLocked === true,
    latestDate: cleanIsoDate(raw.latestDate),
    performanceCount: Math.max(0, Math.trunc(Number(raw.performanceCount) || 0)),
    individualEntries: cleanEngagementEntryIndividualEntries(raw.individualEntries || raw.individualEventCodes || [])
  };
}

function engagementRelayAllowedCategories(event = {}) {
  const categories = ENGAGEMENT_RELAY_CATEGORY_CODES.filter((category) =>
    !(ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES[event.code] || new Set()).has(category)
  );
  const restrictions = Array.isArray(event.categoryRestrictions)
    ? event.categoryRestrictions.filter((category) => categories.includes(category))
    : [];
  return restrictions.length ? restrictions : categories;
}

function cleanEngagementRelayGenderMode(rawRelay = {}, event = {}) {
  const mode = cleanText(rawRelay.genderMode || rawRelay.sexMode || rawRelay.relayGenderMode);
  if (event.relayMixedRule === "required") return "mixed";
  if (event.relayMixedRule === "mastersOnly" && event.relayMixedMode === "masters") {
    return ENGAGEMENT_PROGRAM_GENDER_MODES.has(mode) ? mode : "mixed";
  }
  return mode === "male" ? "male" : "female";
}

function engagementRelayMemberCategory(member = {}, competitionDate = "") {
  return ageCategoryFromDates(competitionDate, member.birthDate);
}

function engagementRelayMemberAge(member = {}, competitionDate = "") {
  const seasonYear = importSeasonYear(competitionDate) || competitionYear(competitionDate);
  const born = birthYear(member.birthDate);
  const age = seasonYear && born ? seasonYear - born : 0;
  return Number.isFinite(age) && age > 0 ? age : 0;
}

function engagementRelayMemberAllowedForCategory(member = {}, relayCategory = "", competitionDate = "") {
  const category = engagementRelayMemberCategory(member, competitionDate);
  if (!category) return false;
  if (cleanText(relayCategory).startsWith("R")) return /^M\d/.test(category);
  if (relayCategory === "S") return true;
  const swimmerRank = ENGAGEMENT_RELAY_AGE_CATEGORY_RANK[category];
  const relayRank = ENGAGEMENT_RELAY_AGE_CATEGORY_RANK[relayCategory];
  return Number.isFinite(swimmerRank) && Number.isFinite(relayRank) && swimmerRank <= relayRank;
}

function assertEngagementRelayMembers(relay = {}, event = {}, swimmerById = new Map(), competition = {}) {
  const memberIds = Array.from(new Set((Array.isArray(relay.memberIds) ? relay.memberIds : [])
    .map((id) => cleanText(id).slice(0, 80))
    .filter(Boolean)))
    .slice(0, Number(event.relayLegs || 4) || 4);
  if (!memberIds.length) return [];
  const expectedLegs = Number(event.relayLegs || 4) || 4;
  if (memberIds.length !== expectedLegs) {
    throw new HttpsError("failed-precondition", `Indiquez ${expectedLegs} relayeurs ou laissez le relais sans relayeurs.`);
  }
  const members = memberIds.map((memberId) => {
    const swimmer = swimmerById.get(memberId);
    if (!swimmer) throw new HttpsError("failed-precondition", "Relayeur non selectionne dans les nageurs de la competition.");
    return {
      swimmerIndexId: swimmer.swimmerIndexId,
      swimmerId: swimmer.swimmerId,
      firstName: swimmer.firstName,
      lastName: swimmer.lastName,
      name: swimmer.name,
      birthDate: swimmer.birthDate,
      sex: normalizeCategoryCode(swimmer.sex),
      licenseNumber: swimmer.licenseNumber
    };
  });
  if (relay.genderMode === "female" && members.some((member) => member.sex !== "F")) {
    throw new HttpsError("failed-precondition", "Un relais Femmes ne peut contenir que des nageuses.");
  }
  if (relay.genderMode === "male" && members.some((member) => member.sex !== "M")) {
    throw new HttpsError("failed-precondition", "Un relais Hommes ne peut contenir que des nageurs.");
  }
  if (relay.genderMode === "mixed") {
    const invalidOrderIndex = members.findIndex((member, index) => member.sex !== (index % 2 === 0 ? "M" : "F"));
    if (invalidOrderIndex >= 0) {
      throw new HttpsError("failed-precondition", "Un relais mixte doit respecter l'ordre Homme - Femme - Homme - Femme.");
    }
  }
  if (relay.category.startsWith("R")) {
    if (members.some((member) => !/^M\d/.test(engagementRelayMemberCategory(member, competition.date)))) {
      throw new HttpsError("failed-precondition", `Relais ${relay.category} reserve aux categories Master.`);
    }
    const minimumAge = Number(relay.category.replace(/\D/g, "")) || 0;
    const totalAge = members.reduce((sum, member) => sum + engagementRelayMemberAge(member, competition.date), 0);
    if (minimumAge && totalAge < minimumAge) {
      throw new HttpsError("failed-precondition", `Relais ${relay.category} impossible : total d'age ${totalAge}, minimum ${minimumAge}.`);
    }
  } else {
    const invalidMember = members.find((member) => !engagementRelayMemberAllowedForCategory(member, relay.category, competition.date));
    if (invalidMember) {
      throw new HttpsError("failed-precondition", `Relayeur non autorise en relais ${relay.category} pour ${event.shortLabel || event.code}.`);
    }
  }
  return members;
}

function cleanEngagementEntryRelays(rawRelays = [], competition = {}, swimmers = []) {
  if (!Array.isArray(rawRelays)) return [];
  const relayEvents = new Map((Array.isArray(competition.events) ? competition.events : [])
    .filter((event) => event.type === "relay")
    .map((event) => [event.code, event]));
  const swimmerById = new Map((Array.isArray(swimmers) ? swimmers : [])
    .map((swimmer) => [cleanText(swimmer.swimmerIndexId), swimmer])
    .filter(([id]) => id));
  const seenRelays = new Set();
  const memberDistanceSlots = new Set();
  return rawRelays.slice(0, 80).map((rawRelay) => {
    const eventCode = normalizeCourseCode(rawRelay?.eventCode || rawRelay?.code);
    const event = relayEvents.get(eventCode);
    if (!event) throw new HttpsError("invalid-argument", "Relais non ouvert sur cette competition.");
    const allowedCategories = engagementRelayAllowedCategories(event);
    const category = cleanText(rawRelay?.category).toUpperCase();
    if (!allowedCategories.includes(category)) {
      throw new HttpsError("invalid-argument", `Categorie ${category || "-"} non ouverte pour ${event.shortLabel || event.code}.`);
    }
    const genderMode = cleanEngagementRelayGenderMode(rawRelay, event);
    const duplicateKey = [eventCode, category, genderMode].join("|");
    if (!event.multipleRelaysAllowed && seenRelays.has(duplicateKey)) {
      throw new HttpsError("failed-precondition", "Un relais identique existe deja pour ce club.");
    }
    seenRelays.add(duplicateKey);
    const manual = parseEngagementEntryTime(rawRelay?.manualEntryTime || rawRelay?.entryTime);
    if (!manual) {
      throw new HttpsError("invalid-argument", `Temps d'engagement requis pour ${event.shortLabel || event.code}.`);
    }
    const relay = {
      relayId: cleanText(rawRelay?.relayId).slice(0, 80) || stableHash([eventCode, category, genderMode, manual.display].join("|")).slice(0, 24),
      eventCode,
      category,
      genderMode,
      manualEntryTime: cleanText(rawRelay?.manualEntryTime || rawRelay?.entryTime).slice(0, 20),
      entryTime: manual.display,
      entryTimeValue: manual.value,
      memberIds: Array.isArray(rawRelay?.memberIds) ? rawRelay.memberIds : []
    };
    const members = assertEngagementRelayMembers(relay, event, swimmerById, competition);
    members.forEach((member) => {
      const slotKey = [member.swimmerIndexId, event.distance, event.discipline].join("|");
      if (memberDistanceSlots.has(slotKey)) {
        throw new HttpsError("failed-precondition", "Un relayeur ne peut pas etre inscrit dans deux relais de meme distance et meme nature.");
      }
      memberDistanceSlots.add(slotKey);
    });
    return cleanFirestoreValue({
      ...relay,
      members,
      memberIds: members.map((member) => member.swimmerIndexId)
    });
  }).filter(Boolean);
}

function engagementQualificationRowAllowed(row = {}, competition = {}) {
  if (row.active === false || row.status === "hidden") return false;
  if (row.isIntermediate === true) return false;
  if (!Number(row.timeValue || 0)) return false;
  if (competition.qualificationTimesMode === "period") {
    const date = cleanIsoDate(row.date);
    if (!date) return false;
    if (competition.qualificationStartDate && date < competition.qualificationStartDate) return false;
    if (competition.qualificationEndDate && date > competition.qualificationEndDate) return false;
  }
  return true;
}

function bestEngagementKnownTime(rows = [], eventCode = "", competition = {}) {
  return rows
    .filter((row) => cleanText(row.course).toUpperCase().replace(/\s+/g, "") === eventCode)
    .filter((row) => engagementQualificationRowAllowed(row, competition))
    .reduce((best, row) => publicBetterPerformance(row, best) ? row : best, null);
}

function engagementEntryTimeCacheId(swimmer = {}) {
  return stableHash([
    cleanText(swimmer.source || "performances"),
    cleanText(swimmer.swimmerIndexId || swimmer.id || swimmer.swimmerId || swimmer.identityKey)
  ].filter(Boolean).join("|")).slice(0, 40);
}

function engagementEntryTimeCacheRef(db, swimmer = {}) {
  return db.collection(ENGAGEMENT_ENTRY_TIME_CACHES_COLLECTION).doc(engagementEntryTimeCacheId(swimmer));
}

function engagementEntryTimeCacheRow(row = {}) {
  return cleanFirestoreValue({
    publicKey: cleanText(row.publicKey || row.performanceBaseId || row.id).slice(0, 160),
    performanceBaseId: cleanText(row.performanceBaseId).slice(0, 160),
    date: cleanIsoDate(row.date),
    course: normalizeCourseCode(row.course),
    time: cleanText(row.time).slice(0, 20),
    timeValue: Number(row.timeValue || 0) || 0,
    location: cleanText(row.location).slice(0, 160),
    competition: cleanText(row.competition).slice(0, 180),
    pool: cleanText(row.pool).slice(0, 20),
    chrono: cleanText(row.chrono).slice(0, 40)
  });
}

function engagementEntryTimeCacheRowsFromData(data = {}) {
  const events = data.events && typeof data.events === "object" ? data.events : {};
  return Object.values(events)
    .flatMap((rows) => Array.isArray(rows) ? rows : [])
    .map(engagementEntryTimeCacheRow)
    .filter((row) => row.course && row.date && row.timeValue);
}

function engagementEntryTimeRowsToEvents(rows = []) {
  const events = {};
  rows
    .map(engagementEntryTimeCacheRow)
    .filter((row) => row.course && row.date && row.timeValue)
    .sort((left, right) =>
      cleanText(right.date).localeCompare(cleanText(left.date)) ||
      cleanText(left.course).localeCompare(cleanText(right.course), "fr-FR", { numeric: true }) ||
      Number(left.timeValue || 0) - Number(right.timeValue || 0)
    )
    .slice(0, 1500)
    .forEach((row) => {
      if (!events[row.course]) events[row.course] = [];
      events[row.course].push(row);
    });
  return events;
}

async function rebuildEngagementEntryTimeCache(db, swimmer = {}) {
  const source = cleanText(swimmer.source || "performances");
  const rows = source === "engagement"
    ? []
    : await getPerformanceBaseRowsBySwimmer({
      swimmerId: swimmer.swimmerId,
      swimmerIds: [swimmer.swimmerId, ...(Array.isArray(swimmer.sourceIds) ? swimmer.sourceIds : [])],
      identityKey: swimmer.identityKey
    });
  const activeRows = rows
    .map(publicPerformanceBaseRow)
    .filter((row) => engagementQualificationRowAllowed(row, { qualificationTimesMode: "all" }));
  const events = engagementEntryTimeRowsToEvents(activeRows);
  const now = new Date().toISOString();
  await engagementEntryTimeCacheRef(db, swimmer).set({
    version: ENGAGEMENT_ENTRY_TIME_CACHE_VERSION,
    source,
    swimmerIndexId: cleanText(swimmer.swimmerIndexId || swimmer.id).slice(0, 80),
    swimmerId: cleanText(swimmer.swimmerId).slice(0, 80),
    identityKey: cleanText(swimmer.identityKey).slice(0, 180),
    generatedAt: now,
    updatedAt: now,
    rowCount: Object.values(events).reduce((sum, eventRows) => sum + eventRows.length, 0),
    events
  }, { merge: false });
  return engagementEntryTimeCacheRowsFromData({ events });
}

async function getEngagementEntryTimeRowsForSwimmer(swimmer = {}) {
  if (cleanText(swimmer.source) === "engagement") return [];
  const db = admin.firestore();
  const cacheSnapshot = await engagementEntryTimeCacheRef(db, swimmer).get();
  const cacheReady = cacheSnapshot.exists &&
    Number(cacheSnapshot.data()?.version || 0) === ENGAGEMENT_ENTRY_TIME_CACHE_VERSION &&
    cleanText(cacheSnapshot.data()?.generatedAt);
  return cacheReady
    ? engagementEntryTimeCacheRowsFromData(cacheSnapshot.data() || {})
    : rebuildEngagementEntryTimeCache(db, swimmer);
}

function deleteEngagementEntryTimeCache(batch, db, swimmer = {}) {
  const cacheId = engagementEntryTimeCacheId(swimmer);
  if (!cacheId) return;
  batch.delete(db.collection(ENGAGEMENT_ENTRY_TIME_CACHES_COLLECTION).doc(cacheId));
}

function engagementCompetitionAppliesToFranceRecords(competition = {}) {
  return cleanEngagementPoolLength(competition.poolLength) === "50" &&
    cleanEngagementTimingType(competition.timingType) === "electronic";
}

function engagementCompetitionAppliesToMpf(competition = {}) {
  const timingType = cleanEngagementTimingType(competition.timingType);
  const poolLength = cleanEngagementPoolLength(competition.poolLength);
  return timingType === "manual" || (timingType === "electronic" && poolLength !== "50");
}

function engagementRecordReferencesForEntry(referenceMap, swimmer = {}, entry = {}, competition = {}) {
  const eventCode = normalizeCourseCode(entry.eventCode);
  const sex = normalizeCategoryCode(swimmer.sex);
  const category = ageCategoryFromDates(competition.date, swimmer.birthDate);
  if (!eventCode || (sex !== "F" && sex !== "M") || !category || !POOL_COURSES.includes(eventCode)) {
    return [];
  }
  const perf = {
    sex,
    course: eventCode
  };
  const references = [];
  if (engagementCompetitionAppliesToFranceRecords(competition)) {
    references.push(recordReferenceForPerformance(referenceMap, "RF", perf, category));
    if (isYouthCategory(category)) {
      references.push(recordReferenceForPerformance(referenceMap, "RFJ", perf, category));
    }
  }
  if (engagementCompetitionAppliesToMpf(competition)) {
    references.push(recordReferenceForPerformance(referenceMap, "MPF", perf, category));
  }
  return references.filter(Boolean);
}

function engagementEntryTimeWarning(entry = {}, references = []) {
  const timeValue = Number(entry.entryTimeValue || 0) || 0;
  if (!timeValue || cleanText(entry.entryTimeMode) !== "manual") return "";
  const fastestReference = references
    .map((reference) => Number(reference.value || 0) || 0)
    .filter(Boolean)
    .sort((a, b) => a - b)[0] || 0;
  if (!fastestReference) return "";
  return timeValue >= fastestReference * 5
    ? "Temps manuel tres lent par rapport aux references connues."
    : "";
}

function validateEngagementIndividualEntryTimes(swimmers = [], competition = {}, recordsData = {}) {
  const referenceMap = recordReferenceMap(recordsData);
  return swimmers.map((swimmer) => ({
    ...swimmer,
    individualEntries: (Array.isArray(swimmer.individualEntries) ? swimmer.individualEntries : []).map((entry) => {
      const timeValue = Number(entry.entryTimeValue || 0) || 0;
      const references = engagementRecordReferencesForEntry(referenceMap, swimmer, entry, competition);
      const manualEntry = cleanText(entry.entryTimeMode) === "manual";
      const blockingReference = references
        .filter((reference) => manualEntry && timeValue > 0 && timeValue < Number(reference.value || 0))
        .sort((a, b) => Number(a.value || 0) - Number(b.value || 0))[0];
      if (blockingReference) {
        const swimmerName = cleanText(swimmer.name) ||
          [cleanText(swimmer.firstName), cleanText(swimmer.lastName)].filter(Boolean).join(" ");
        const label = cleanText(blockingReference.alertLabel || blockingReference.recordTypeLabel || blockingReference.alertType);
        const referenceTime = cleanText(blockingReference.time) || formatTimeValue(blockingReference.value);
        throw new HttpsError(
          "failed-precondition",
          `Temps impossible pour ${swimmerName || "nageur"} - ${entry.eventCode} : ${formatTimeValue(timeValue)} est sous ${label} (${referenceTime}).`
        );
      }
      const entryTimeWarning = engagementEntryTimeWarning(entry, references);
      return {
        ...entry,
        ...(entryTimeWarning ? { entryTimeWarning } : {})
      };
    })
  }));
}

function engagementRelayReferencesForEntry(referenceMap, relay = {}, competition = {}) {
  const references = [];
  if (engagementCompetitionAppliesToFranceRecords(competition)) {
    if (relay.category === "S") references.push(engagementRelayReferenceForEntry(referenceMap, "RF", relay));
    if (relay.category === "J") references.push(engagementRelayReferenceForEntry(referenceMap, "RFJ", relay));
  }
  if (engagementCompetitionAppliesToMpf(competition)) {
    references.push(engagementRelayReferenceForEntry(referenceMap, "MPF", relay));
  }
  return references.filter(Boolean);
}

function validateEngagementRelayEntryTimes(relays = [], competition = {}, recordsData = {}) {
  const referenceMap = engagementRelayReferenceMap(recordsData);
  return relays.map((relay) => {
    const timeValue = Number(relay.entryTimeValue || 0) || 0;
    const references = engagementRelayReferencesForEntry(referenceMap, relay, competition);
    const blockingReference = references
      .filter((reference) => timeValue > 0 && timeValue < Number(reference.value || 0))
      .sort((a, b) => Number(a.value || 0) - Number(b.value || 0))[0];
    if (blockingReference) {
      const label = cleanText(blockingReference.alertLabel || blockingReference.recordTypeLabel || blockingReference.alertType);
      const referenceTime = cleanText(blockingReference.time) || formatTimeValue(blockingReference.value);
      throw new HttpsError(
        "failed-precondition",
        `Temps impossible pour ${relay.eventCode} ${relay.category} : ${formatTimeValue(timeValue)} est sous ${label} (${referenceTime}).`
      );
    }
    return relay;
  });
}

async function resolveEngagementIndividualEntriesForSwimmer(swimmer = {}, entries = [], competition = {}) {
  if (!entries.length) return [];
  const rows = await getEngagementEntryTimeRowsForSwimmer(swimmer);
  return entries.map((entry) => {
    const eventCode = cleanText(entry.eventCode).toUpperCase().replace(/\s+/g, "");
    const manualRaw = cleanText(entry.manualEntryTime || entry.entryTime);
    const manualAllowed = competition.missingEntryTimeMode === "manual";
    if (manualAllowed && manualRaw) {
      const manual = parseEngagementEntryTime(manualRaw);
      if (!manual) {
        throw new HttpsError("invalid-argument", `Temps manuel invalide pour ${eventCode}.`);
      }
      return cleanEngagementEntryIndividualEntries([{
        eventCode,
        entryTimeMode: "manual",
        manualEntryTime: manualRaw,
        entryTime: manual.display,
        entryTimeValue: manual.value
      }])[0];
    }
    const known = bestEngagementKnownTime(rows, eventCode, competition);
    if (known) {
      return cleanEngagementEntryIndividualEntries([{
        eventCode,
        entryTimeMode: "known",
        entryTime: formatTimeValue(known.timeValue) || known.time,
        entryTimeValue: Number(known.timeValue || 0) || 0,
        sourcePerformanceId: known.publicKey || known.performanceBaseId || known.id || "",
        date: known.date,
        location: known.location
      }])[0];
    }
    return cleanEngagementEntryIndividualEntries([{
      eventCode,
      entryTimeMode: "default595999",
      entryTime: "59:59.99",
      entryTimeValue: 359999
    }])[0];
  }).filter(Boolean);
}

function engagementSwimmerIdentityKey(firstName, lastName, birthDate) {
  const first = normalizePerformanceSearchText(firstName);
  const last = normalizePerformanceSearchText(lastName);
  const birth = cleanIsoDate(birthDate);
  return first && last && birth ? `${last}|${first}|${birth}` : "";
}

function cleanEngagementNewSwimmer(raw = {}, context = {}) {
  const firstName = cleanText(raw.firstName).slice(0, 80);
  const lastName = cleanText(raw.lastName).slice(0, 80);
  const birthDate = cleanIsoDate(raw.birthDate);
  const sex = ["F", "M"].includes(cleanText(raw.sex).toUpperCase()) ? cleanText(raw.sex).toUpperCase() : "";
  const licenseNumber = cleanText(raw.licenseNumber).slice(0, 60);
  const licenseSeason = currentEngagementSeasonInfo();
  if (!firstName || !lastName || !birthDate || !sex || !licenseNumber) {
    throw new HttpsError("invalid-argument", "Prenom, nom, date de naissance, sexe et licence sont obligatoires.");
  }
  return {
    firstName,
    lastName,
    name: [firstName, lastName].join(" "),
    birthDate,
    sex,
    licenseNumber,
    licenseVerificationStatus: "pending",
    licenseSeasonLabel: licenseSeason.label,
    licenseSeasonStatus: "to_check",
    identityKey: engagementSwimmerIdentityKey(firstName, lastName, birthDate),
    clubId: context.clubId,
    clubName: context.clubName,
    regionId: context.regionId,
    source: "engagement",
    active: true
  };
}

function engagementNewSwimmerItem(doc) {
  const data = doc.data() || {};
  const firstName = cleanText(data.firstName).slice(0, 80);
  const lastName = cleanText(data.lastName).slice(0, 80);
  const name = cleanText(data.name).slice(0, 160) || [firstName, lastName].filter(Boolean).join(" ");
  const alerts = Array.isArray(data.alerts) ? data.alerts : [];
  const licenseSeason = engagementLicenseSeasonState(data);
  return cleanFirestoreValue({
    id: doc.id,
    swimmerIndexId: doc.id,
    source: "engagement",
    swimmerId: cleanText(data.swimmerId).slice(0, 80),
    identityKey: cleanText(data.identityKey).slice(0, 180),
    firstName,
    lastName,
    name,
    birthDate: cleanIsoDate(data.birthDate),
    sex: cleanText(data.sex).slice(0, 20),
    category: currentEngagementCategoryFromBirthDate(data.birthDate),
    clubId: cleanText(data.clubId).slice(0, 40),
    club: cleanText(data.club).slice(0, 60),
    clubName: cleanText(data.clubName).slice(0, 140),
    licenseNumber: cleanText(data.licenseNumber).slice(0, 60),
    licenseVerificationStatus: cleanEngagementLicenseVerificationStatus(data.licenseVerificationStatus || data.verificationStatus, "pending"),
    licenseSeasonLabel: licenseSeason.label,
    licenseSeasonStatus: licenseSeason.status,
    latestDate: cleanIsoDate(data.latestDate),
    performanceCount: 0,
    alertCount: alerts.length,
    alerts,
    alertValidationStatus: cleanText(data.alertValidationStatus).slice(0, 60),
    active: data.active !== false,
    createdAt: cleanText(data.createdAt).slice(0, 40),
    updatedAt: cleanText(data.updatedAt).slice(0, 40),
    disabledAt: cleanText(data.disabledAt).slice(0, 40),
    disabledBy: cleanText(data.disabledBy).slice(0, 80)
  });
}

function engagementNewSwimmerAlertFromMatch(match = {}, context = {}, type = "") {
  const swimmerIndexId = cleanText(match.id || match.swimmerIndexId);
  const clubId = cleanText(match.clubId);
  const differentClub = clubId && clubId !== context.clubId;
  const alertType = type || (differentClub ? "club-change" : "duplicate");
  return cleanFirestoreValue({
    type: alertType,
    level: differentClub ? "warning" : "info",
    message: alertType === "possible-duplicate"
      ? "Nageur ressemblant deja present dans LivePalmes."
      : differentClub
        ? "Nageur existant avec un dernier club connu different."
        : "Nageur existant avec la meme identite.",
    swimmerIndexId,
    swimmerId: cleanText(match.swimmerId || match.id).slice(0, 80),
    source: cleanText(match.source || "performances").slice(0, 40),
    identityKey: cleanText(match.identityKey).slice(0, 180),
    name: cleanText(match.name).slice(0, 160),
    firstName: cleanText(match.firstName).slice(0, 80),
    lastName: cleanText(match.lastName).slice(0, 80),
    birthDate: cleanIsoDate(match.birthDate),
    clubId,
    clubName: cleanText(match.clubName).slice(0, 140),
    latestDate: cleanIsoDate(match.latestDate),
    validationStatus: "validated-by-club"
  });
}

async function buildEngagementNewSwimmerAlerts(swimmer = {}, context = {}) {
  const alerts = [];
  const addAlert = (alert) => {
    if (!alert?.swimmerIndexId && !alert?.identityKey) return;
    const key = [alert.type, alert.identityKey || alert.swimmerIndexId, alert.clubId].join("|");
    if (alerts.some((item) => [item.type, item.identityKey || item.swimmerIndexId, item.clubId].join("|") === key)) return;
    alerts.push(alert);
  };
  const db = admin.firestore();
  if (swimmer.identityKey) {
    const exactSnapshot = await db.collection(PERFORMANCE_SWIMMERS_COLLECTION)
      .where("identityKey", "==", swimmer.identityKey)
      .limit(5)
      .get();
    exactSnapshot.docs.forEach((doc) => {
      const match = engagementClubSwimmerItem(doc);
      addAlert(engagementNewSwimmerAlertFromMatch(match, context));
    });
    intranapSwimmersIndex
      .filter((match) => cleanText(match.identityKey) === swimmer.identityKey)
      .slice(0, 5)
      .forEach((match) => addAlert(engagementNewSwimmerAlertFromMatch({
        ...match,
        source: "reference"
      }, context)));
  }
  const lastToken = performanceSearchTokens(swimmer.lastName)[0] || "";
  if (lastToken.length >= 2) {
    const similarSnapshot = await db.collection(PERFORMANCE_SWIMMERS_COLLECTION)
      .where("searchPrefixes", "array-contains", lastToken.slice(0, Math.min(6, lastToken.length)))
      .limit(20)
      .get();
    similarSnapshot.docs.forEach((doc) => {
      const match = engagementClubSwimmerItem(doc);
      if (alerts.some((alert) => alert.swimmerIndexId === match.id)) return;
      const sameBirthYear = cleanText(match.birthDate).slice(0, 4) === cleanText(swimmer.birthDate).slice(0, 4);
      const firstClose = performanceSearchTokens(match.firstName).some((token) =>
        performanceSearchTokens(swimmer.firstName).some((inputToken) => token.slice(0, 3) === inputToken.slice(0, 3))
      );
      if (!sameBirthYear || !firstClose) return;
      addAlert(engagementNewSwimmerAlertFromMatch(match, context, "possible-duplicate"));
    });
    intranapSwimmersIndex
      .filter((match) => {
        if (cleanText(match.identityKey) === swimmer.identityKey) return false;
        const sameBirthYear = cleanText(match.birthDate).slice(0, 4) === cleanText(swimmer.birthDate).slice(0, 4);
        const lastClose = performanceSearchTokens(match.lastName).some((token) => token.slice(0, Math.min(6, lastToken.length)) === lastToken.slice(0, Math.min(6, lastToken.length)));
        const firstClose = performanceSearchTokens(match.firstName).some((token) =>
          performanceSearchTokens(swimmer.firstName).some((inputToken) => token.slice(0, 3) === inputToken.slice(0, 3))
        );
        return sameBirthYear && lastClose && firstClose;
      })
      .slice(0, 12)
      .forEach((match) => addAlert(engagementNewSwimmerAlertFromMatch({
        ...match,
        source: "reference"
      }, context, "possible-duplicate")));
  }
  return alerts
    .sort((left, right) =>
      Number(right.type === "club-change") - Number(left.type === "club-change") ||
      cleanText(right.latestDate).localeCompare(cleanText(left.latestDate)) ||
      cleanText(left.name).localeCompare(cleanText(right.name), "fr")
    )
    .slice(0, 8);
}

function engagementSwimmerLicenseId(swimmer = {}) {
  const swimmerIndexId = cleanText(swimmer.swimmerIndexId || swimmer.id);
  if (swimmerIndexId) return stableHash(swimmerIndexId).slice(0, 40);
  return stableHash([
    cleanText(swimmer.swimmerId),
    cleanText(swimmer.identityKey),
    cleanText(swimmer.name)
  ].filter(Boolean).join("|")).slice(0, 40);
}

function engagementClubRosterId(clubId) {
  return stableHash(cleanText(clubId)).slice(0, 40);
}

function engagementClubRosterRef(db, clubId) {
  return db.collection(ENGAGEMENT_CLUB_ROSTERS_COLLECTION).doc(engagementClubRosterId(clubId));
}

function engagementClubRosterSwimmerKey(swimmer = {}) {
  return stableHash([
    cleanText(swimmer.source || "performances"),
    cleanText(swimmer.swimmerIndexId || swimmer.id || swimmer.swimmerId || swimmer.identityKey)
  ].filter(Boolean).join("|")).slice(0, 40);
}

function engagementClubRosterSwimmerItem(swimmer = {}) {
  const firstName = cleanText(swimmer.firstName).slice(0, 80);
  const lastName = cleanText(swimmer.lastName).slice(0, 80);
  const name = cleanText(swimmer.name).slice(0, 160) || [firstName, lastName].filter(Boolean).join(" ");
  const source = cleanText(swimmer.source || "performances").slice(0, 40) || "performances";
  const swimmerIndexId = cleanText(swimmer.swimmerIndexId || swimmer.id).slice(0, 80);
  const licenseSeason = engagementLicenseSeasonState(swimmer);
  return cleanFirestoreValue({
    id: swimmerIndexId,
    swimmerIndexId,
    source,
    swimmerId: cleanText(swimmer.swimmerId || (source === "performances" ? swimmer.id : "")).slice(0, 80),
    identityKey: cleanText(swimmer.identityKey || swimmer.indexKey).slice(0, 180),
    firstName,
    lastName,
    name,
    birthDate: cleanIsoDate(swimmer.birthDate),
    sex: cleanText(swimmer.sex).slice(0, 20),
    category: cleanText(swimmer.category).slice(0, 20),
    clubId: cleanText(swimmer.clubId).slice(0, 40),
    club: cleanText(swimmer.club).slice(0, 60),
    clubName: cleanText(swimmer.clubName).slice(0, 140),
    licenseNumber: cleanText(swimmer.licenseNumber).slice(0, 60),
    licenseVerificationStatus: cleanEngagementLicenseVerificationStatus(swimmer.licenseVerificationStatus || swimmer.verificationStatus, "pending"),
    licenseSeasonLabel: licenseSeason.label,
    licenseSeasonStatus: licenseSeason.status,
    latestDate: cleanIsoDate(swimmer.latestDate),
    performanceCount: Math.max(0, Math.trunc(Number(swimmer.performanceCount) || 0)),
    active: swimmer.active !== false,
    updatedAt: cleanText(swimmer.updatedAt).slice(0, 40)
  });
}

function engagementClubRosterSwimmersFromData(data = {}) {
  const swimmers = data.swimmers && typeof data.swimmers === "object" ? data.swimmers : {};
  return Object.values(swimmers)
    .map((swimmer) => engagementClubRosterSwimmerItem(swimmer))
    .filter((swimmer) => swimmer.swimmerIndexId && swimmer.active !== false);
}

function upsertEngagementClubRosterSwimmer(batch, db, swimmer = {}, now = "") {
  const item = engagementClubRosterSwimmerItem(swimmer);
  if (!item.clubId || !item.swimmerIndexId || item.active === false) return;
  const key = engagementClubRosterSwimmerKey(item);
  batch.set(engagementClubRosterRef(db, item.clubId), {
    clubId: item.clubId,
    clubName: item.clubName,
    updatedAt: now || new Date().toISOString(),
    swimmers: {
      [key]: item
    }
  }, { merge: true });
}

function deleteEngagementClubRosterSwimmer(batch, db, swimmer = {}, now = "") {
  const clubId = cleanText(swimmer.clubId);
  const swimmerIndexId = cleanText(swimmer.swimmerIndexId || swimmer.id);
  if (!clubId || !swimmerIndexId) return;
  const key = engagementClubRosterSwimmerKey({ ...swimmer, swimmerIndexId });
  batch.set(engagementClubRosterRef(db, clubId), {
    updatedAt: now || new Date().toISOString(),
    swimmers: {
      [key]: admin.firestore.FieldValue.delete()
    }
  }, { merge: true });
}

function engagementSwimmerLicenseDataItem(data = {}, id = "") {
  const licenseSeason = engagementLicenseSeasonState(data);
  return {
    id,
    swimmerIndexId: cleanText(data.swimmerIndexId).slice(0, 80),
    swimmerId: cleanText(data.swimmerId).slice(0, 80),
    identityKey: cleanText(data.identityKey).slice(0, 180),
    licenseNumber: cleanText(data.licenseNumber).slice(0, 60),
    verificationStatus: cleanEngagementLicenseVerificationStatus(data.verificationStatus, "pending"),
    licenseSeasonLabel: licenseSeason.label,
    licenseSeasonStatus: licenseSeason.status,
    licenseSeasons: data.licenseSeasons && typeof data.licenseSeasons === "object" ? data.licenseSeasons : {},
    updatedAt: cleanText(data.updatedAt).slice(0, 40)
  };
}

function engagementSwimmerLicenseItem(doc) {
  return engagementSwimmerLicenseDataItem(doc.data() || {}, doc.id);
}

async function engagementLegacySwimmerLicensesByClub(db, clubId) {
  const cleanClubId = cleanText(clubId);
  if (!cleanClubId) return new Map();
  const snapshot = await db.collection("engagementSwimmerLicenses")
    .where("clubId", "==", cleanClubId)
    .limit(1000)
    .get();
  const byIndexId = new Map();
  snapshot.docs.forEach((doc) => {
    const license = engagementSwimmerLicenseItem(doc);
    if (license.swimmerIndexId && license.licenseNumber) byIndexId.set(license.swimmerIndexId, license);
  });
  return byIndexId;
}

function engagementSwimmerLicensePayload(swimmer = {}, context = {}, source = {}) {
  const collectedAt = cleanText(source.collectedAt).slice(0, 40) || new Date().toISOString();
  const season = currentEngagementSeasonInfo(new Date(collectedAt));
  const verificationStatus = cleanEngagementLicenseVerificationStatus(swimmer.licenseVerificationStatus || swimmer.verificationStatus, "pending");
  const seasonStatus = cleanEngagementLicenseSeasonStatus(swimmer.licenseSeasonStatus, "to_check");
  const sourceType = cleanText(source.type || "engagement").slice(0, 40) || "engagement";
  return cleanFirestoreValue({
    swimmerIndexId: cleanText(swimmer.swimmerIndexId || swimmer.id).slice(0, 80),
    swimmerId: cleanText(swimmer.swimmerId).slice(0, 80),
    identityKey: cleanText(swimmer.identityKey).slice(0, 180),
    firstName: cleanText(swimmer.firstName).slice(0, 80),
    lastName: cleanText(swimmer.lastName).slice(0, 80),
    name: cleanText(swimmer.name).slice(0, 160),
    birthDate: cleanIsoDate(swimmer.birthDate),
    sex: cleanText(swimmer.sex).slice(0, 20),
    clubId: cleanText(context.clubId || swimmer.clubId).slice(0, 40),
    clubName: cleanText(context.clubName || swimmer.clubName).slice(0, 140),
    licenseNumber: cleanText(swimmer.licenseNumber).slice(0, 60),
    verificationStatus,
    verificationSource: cleanText(source.verificationSource || (sourceType === "admin_import" ? "admin_import" : "club")).slice(0, 40),
    licenseSeasonLabel: season.label,
    licenseSeasonStatus: seasonStatus,
    licenseSeasons: {
      [season.label]: {
        status: seasonStatus,
        updatedAt: collectedAt,
        updatedBy: cleanText(context.uid).slice(0, 128),
        source: sourceType
      }
    },
    source: {
      type: sourceType,
      competitionId: cleanText(source.competitionId).slice(0, 128),
      clubId: cleanText(context.clubId).slice(0, 40),
      uid: cleanText(context.uid).slice(0, 128),
      collectedAt
    }
  });
}

function engagementClubEntryItem(doc, fallback = {}) {
  const data = doc?.exists ? doc.data() || {} : fallback;
  const teamLeader = data.teamLeader || {};
  const officials = Array.isArray(data.officials) ? data.officials : [];
  const swimmers = Array.isArray(data.swimmers) ? data.swimmers : [];
  const relays = Array.isArray(data.relays) ? data.relays : [];
  const documents = data.documents && typeof data.documents === "object" ? data.documents : {};
  const clubRecapPdf = cleanEngagementDocumentMetadata(documents.clubRecapPdf || {});
  return {
    id: doc?.id || engagementClubEntryId(data.competitionId, data.clubId),
    competitionId: cleanText(data.competitionId).slice(0, 128),
    clubId: cleanText(data.clubId).slice(0, 40),
    clubName: cleanText(data.clubName).slice(0, 140),
    regionId: cleanText(data.regionId).slice(0, 80),
    status: cleanText(data.status || "active"),
    teamLeader: {
      mode: cleanText(teamLeader.mode),
      firstName: cleanText(teamLeader.firstName),
      lastName: cleanText(teamLeader.lastName),
      licenseNumber: cleanText(teamLeader.licenseNumber),
      externalClub: teamLeader.externalClub === true,
      clubId: cleanText(teamLeader.clubId),
      clubName: cleanText(teamLeader.clubName),
      renunciationAccepted: teamLeader.renunciationAccepted === true
    },
    officials: officials.map(cleanEngagementEntryOfficial).filter((official) => official.personId || official.licenseNumber),
    swimmers: swimmers.map(cleanEngagementEntrySwimmer).filter((swimmer) => swimmer.swimmerIndexId || swimmer.swimmerId || swimmer.licenseNumber),
    relays: relays.map((relay) => ({
      relayId: cleanText(relay.relayId).slice(0, 80),
      eventCode: normalizeCourseCode(relay.eventCode),
      category: cleanText(relay.category).toUpperCase().slice(0, 20),
      genderMode: ENGAGEMENT_PROGRAM_GENDER_MODES.has(cleanText(relay.genderMode)) ? cleanText(relay.genderMode) : "female",
      manualEntryTime: cleanText(relay.manualEntryTime).slice(0, 20),
      entryTime: cleanText(relay.entryTime).slice(0, 20),
      entryTimeValue: Number(relay.entryTimeValue || 0) || 0,
      members: (Array.isArray(relay.members) ? relay.members : []).map((member) => ({
        swimmerIndexId: cleanText(member.swimmerIndexId).slice(0, 80),
        swimmerId: cleanText(member.swimmerId).slice(0, 80),
        firstName: cleanText(member.firstName).slice(0, 80),
        lastName: cleanText(member.lastName).slice(0, 80),
        name: cleanText(member.name).slice(0, 160),
        birthDate: cleanIsoDate(member.birthDate),
        sex: normalizeCategoryCode(member.sex),
        licenseNumber: cleanText(member.licenseNumber).slice(0, 60)
      })).filter((member) => member.swimmerIndexId)
    })).filter((relay) => relay.eventCode && relay.category),
    documents: clubRecapPdf ? { clubRecapPdf } : {},
    teamLeaderComplete: engagementTeamLeaderComplete(teamLeader),
    updatedAt: cleanText(data.updatedAt).slice(0, 40)
  };
}

function engagementPdfFormatDate(value) {
  const text = cleanIsoDate(value);
  if (!text) return "-";
  const [year, month, day] = text.split("-");
  return `${day}/${month}/${year}`;
}

function engagementPdfFormatDateTime(value) {
  const text = cleanText(value);
  if (!text) return "-";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function engagementPdfLevelLabel(level) {
  return {
    departemental: "Départemental",
    regional: "Régional",
    national: "National"
  }[cleanText(level)] || "-";
}

function engagementPdfStatusLabel(status) {
  return {
    upcoming: "À venir",
    open: "Engagements ouverts",
    closed: "Engagements fermés"
  }[cleanText(status)] || "-";
}

function engagementPdfTimingLabel(value) {
  return cleanEngagementTimingType(value) === "manual" ? "Manuel" : "Électronique";
}

function engagementPdfMoney(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0
    ? `${amount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`
    : "0,00 EUR";
}

function engagementPdfFileName(value) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80) || "engagements";
}

function cleanEngagementDocumentMetadata(raw = {}) {
  const storagePath = cleanText(raw.storagePath).slice(0, 260);
  const status = cleanText(raw.status);
  if (!storagePath && status !== "generated") return null;
  return cleanFirestoreValue({
    status: status === "generated" ? "generated" : "pending",
    type: cleanText(raw.type || "clubRecapPdf").slice(0, 60),
    fileName: cleanText(raw.fileName).slice(0, 180),
    contentType: cleanText(raw.contentType || "application/pdf").slice(0, 80),
    storagePath,
    size: Math.max(0, Math.trunc(Number(raw.size) || 0)),
    generatedAt: cleanText(raw.generatedAt).slice(0, 40),
    sourceUpdatedAt: cleanText(raw.sourceUpdatedAt).slice(0, 40),
    sourceHash: cleanText(raw.sourceHash).slice(0, 80),
    competitionId: cleanText(raw.competitionId).slice(0, 128),
    clubId: cleanText(raw.clubId).slice(0, 40)
  });
}

function engagementCompetitionDocumentsMetadata(raw = {}) {
  const documents = raw && typeof raw === "object" ? raw : {};
  const clubRecapPdf = cleanEngagementDocumentMetadata(documents.clubRecapPdf || {});
  return cleanFirestoreValue({
    ...(clubRecapPdf ? { clubRecapPdf } : {}),
    entriesTxt: documents.entriesTxt && typeof documents.entriesTxt === "object"
      ? {
          status: cleanText(documents.entriesTxt.status) === "generated" ? "generated" : cleanText(documents.entriesTxt.status) === "sent" ? "sent" : "pending",
          generatedAt: cleanText(documents.entriesTxt.generatedAt).slice(0, 40)
        }
      : undefined,
    clubRecapEmails: documents.clubRecapEmails && typeof documents.clubRecapEmails === "object"
      ? {
          status: cleanText(documents.clubRecapEmails.status) === "sent" ? "sent" : cleanText(documents.clubRecapEmails.status) === "generated" ? "generated" : "pending",
          generatedAt: cleanText(documents.clubRecapEmails.generatedAt).slice(0, 40)
        }
      : undefined
  });
}

function engagementClubRecapPdfStoragePath(competitionId, clubId) {
  return [
    ENGAGEMENT_DOCUMENTS_STORAGE_PREFIX,
    engagementPdfFileName(competitionId),
    "clubs",
    engagementPdfFileName(clubId),
    "recap.pdf"
  ].join("/");
}

function engagementClubRecapPdfSourceHash(competition = {}, entry = {}) {
  return stableHash(JSON.stringify({
    competition: {
      id: competition.id,
      name: competition.name,
      date: competition.date,
      endDate: competition.endDate,
      location: competition.location,
      level: competition.level,
      regionId: competition.regionId,
      poolLength: competition.poolLength,
      timingType: competition.timingType,
      entryDeadlineAt: competition.entryDeadlineAt,
      fees: competition.fees
    },
    entry: {
      clubId: entry.clubId,
      clubName: entry.clubName,
      regionId: entry.regionId,
      teamLeader: entry.teamLeader,
      officials: entry.officials,
      swimmers: entry.swimmers,
      relays: entry.relays,
      updatedAt: entry.updatedAt
    }
  }));
}

function engagementPdfEventLabel(code) {
  const definition = ENGAGEMENT_EVENT_DEFINITION_BY_CODE.get(normalizeCourseCode(code));
  return definition?.shortLabel || normalizeCourseCode(code) || "-";
}

function engagementPdfSwimmerName(swimmer = {}) {
  return cleanText(swimmer.name) || [cleanText(swimmer.firstName), cleanText(swimmer.lastName)].filter(Boolean).join(" ") || "Nageur";
}

function engagementPdfPersonName(person = {}) {
  return [cleanText(person.firstName), cleanText(person.lastName)].filter(Boolean).join(" ") || cleanText(person.name) || "-";
}

function engagementPdfGenderLabel(mode) {
  return {
    female: "Femmes",
    male: "Hommes",
    mixed: "Mixte"
  }[cleanText(mode)] || "-";
}

function engagementPdfCategoryLabel(code) {
  return {
    P: "Poussins",
    B: "Benjamins",
    M: "Minimes",
    C: "Cadets",
    J: "Juniors",
    S: "Seniors",
    "M30+": "Master 30+",
    "M40+": "Master 40+",
    "M50+": "Master 50+",
    "M60+": "Master 60+",
    "M70+": "Master 70+",
    "M80+": "Master 80+",
    R140: "R140",
    R180: "R180",
    R220: "R220",
    R260: "R260"
  }[cleanText(code).toUpperCase()] || cleanText(code) || "-";
}

function engagementPdfEntryStats(entry = {}) {
  const swimmers = Array.isArray(entry.swimmers) ? entry.swimmers : [];
  const relays = Array.isArray(entry.relays) ? entry.relays : [];
  const swimmerCount = Array.isArray(entry.swimmers)
    ? swimmers.length
    : Math.max(0, Math.trunc(Number(entry.swimmerCount) || 0));
  const individualCount = Array.isArray(entry.swimmers)
    ? swimmers.reduce((sum, swimmer) => sum + (Array.isArray(swimmer.individualEntries) ? swimmer.individualEntries.length : 0), 0)
    : Math.max(0, Math.trunc(Number(entry.individualCount) || 0));
  const relayCount = Array.isArray(entry.relays)
    ? relays.length
    : Math.max(0, Math.trunc(Number(entry.relayCount) || 0));
  return { swimmerCount, individualCount, relayCount };
}

function engagementPdfFeeTotal(entry = {}, competition = {}) {
  const fees = competition.fees || {};
  const stats = engagementPdfEntryStats(entry);
  return (Number(fees.swimmerFee || 0) || 0) * stats.swimmerCount +
    (Number(fees.individualEventFee || 0) || 0) * stats.individualCount +
    (Number(fees.relayFee || 0) || 0) * stats.relayCount;
}

function engagementCompetitionEntrySummaryId(competitionId) {
  return stableHash(cleanText(competitionId)).slice(0, 40);
}

function engagementCompetitionEntrySummaryRef(db, competitionId) {
  return db.collection(ENGAGEMENT_COMPETITION_ENTRY_SUMMARIES_COLLECTION)
    .doc(engagementCompetitionEntrySummaryId(competitionId));
}

function engagementCompetitionEntrySummaryItem(entry = {}) {
  const stats = engagementPdfEntryStats(entry);
  return cleanFirestoreValue({
    id: cleanText(entry.id || engagementClubEntryId(entry.competitionId, entry.clubId)).slice(0, 180),
    competitionId: cleanText(entry.competitionId).slice(0, 128),
    clubId: cleanText(entry.clubId).slice(0, 40),
    clubName: cleanText(entry.clubName || entry.clubId || "Club").slice(0, 140),
    regionId: cleanText(entry.regionId).slice(0, 80),
    teamLeaderComplete: entry.teamLeaderComplete === true,
    officialCount: Array.isArray(entry.officials) ? entry.officials.length : Math.max(0, Math.trunc(Number(entry.officialCount) || 0)),
    swimmerCount: stats.swimmerCount || Math.max(0, Math.trunc(Number(entry.swimmerCount) || 0)),
    individualCount: stats.individualCount || Math.max(0, Math.trunc(Number(entry.individualCount) || 0)),
    relayCount: stats.relayCount || Math.max(0, Math.trunc(Number(entry.relayCount) || 0)),
    recapPdf: cleanEngagementDocumentMetadata(entry.documents?.clubRecapPdf || {}) || undefined,
    updatedAt: cleanText(entry.updatedAt).slice(0, 40)
  });
}

function engagementCompetitionEntrySummariesFromData(data = {}) {
  const entries = data.entries && typeof data.entries === "object" ? data.entries : {};
  return Object.values(entries)
    .map(engagementCompetitionEntrySummaryItem)
    .filter((entry) => entry.clubId)
    .sort((left, right) => cleanText(left.clubName).localeCompare(cleanText(right.clubName), "fr"));
}

async function rebuildEngagementCompetitionEntrySummary(db, competitionId) {
  const cleanCompetitionId = cleanText(competitionId).slice(0, 128);
  if (!cleanCompetitionId) return [];
  const snapshot = await db.collection("engagementClubEntries")
    .where("competitionId", "==", cleanCompetitionId)
    .limit(500)
    .get();
  const entries = {};
  snapshot.docs.forEach((doc) => {
    const item = engagementCompetitionEntrySummaryItem(engagementClubEntryItem(doc));
    if (item.clubId) entries[item.clubId] = item;
  });
  const now = new Date().toISOString();
  await engagementCompetitionEntrySummaryRef(db, cleanCompetitionId).set({
    competitionId: cleanCompetitionId,
    generatedAt: now,
    updatedAt: now,
    entryCount: Object.keys(entries).length,
    entries
  }, { merge: false });
  return engagementCompetitionEntrySummariesFromData({ entries });
}

function upsertEngagementCompetitionEntrySummary(batch, db, entry = {}, now = "") {
  const item = engagementCompetitionEntrySummaryItem(entry);
  if (!item.competitionId || !item.clubId) return;
  batch.set(engagementCompetitionEntrySummaryRef(db, item.competitionId), {
    competitionId: item.competitionId,
    updatedAt: now || new Date().toISOString(),
    entries: {
      [item.clubId]: item
    }
  }, { merge: true });
}

function deleteEngagementCompetitionEntrySummary(batch, db, entry = {}, now = "") {
  const competitionId = cleanText(entry.competitionId).slice(0, 128);
  const clubId = cleanText(entry.clubId).slice(0, 40);
  if (!competitionId || !clubId) return;
  batch.set(engagementCompetitionEntrySummaryRef(db, competitionId), {
    updatedAt: now || new Date().toISOString(),
    entries: {
      [clubId]: admin.firestore.FieldValue.delete()
    }
  }, { merge: true });
}

async function syncEngagementCompetitionEntrySummaryFromChange(event = {}) {
  const before = event.data?.before?.exists ? engagementClubEntryItem(event.data.before) : null;
  const after = event.data?.after?.exists ? engagementClubEntryItem(event.data.after) : null;
  const db = admin.firestore();
  const now = new Date().toISOString();
  const batch = db.batch();
  let batchSize = 0;
  if (before?.competitionId && before?.clubId && (!after || before.competitionId !== after.competitionId || before.clubId !== after.clubId)) {
    deleteEngagementCompetitionEntrySummary(batch, db, before, now);
    batchSize += 1;
  }
  if (after?.competitionId && after?.clubId) {
    upsertEngagementCompetitionEntrySummary(batch, db, after, now);
    batchSize += 1;
  }
  if (batchSize) await batch.commit();
}

exports.syncEngagementClubEntryToCompetitionSummary = onDocumentWritten({
  region: REGION,
  document: "engagementClubEntries/{entryId}"
}, async (event) => {
  await syncEngagementCompetitionEntrySummaryFromChange(event);
});

function engagementPdfCollectIndividualRows(entry = {}, competition = {}) {
  return (Array.isArray(entry.swimmers) ? entry.swimmers : [])
    .map((swimmer) => {
      const entries = Array.isArray(swimmer.individualEntries) ? swimmer.individualEntries : [];
      return {
        license: swimmer.licenseNumber || "-",
        swimmer: engagementPdfSwimmerName(swimmer),
        sex: normalizeCategoryCode(swimmer.sex) || "-",
        category: ageCategoryFromDates(competition.date, swimmer.birthDate) || "-",
        entries: entries.map((item) => {
          const time = item.entryTime || item.manualEntryTime || "";
          return `${engagementPdfEventLabel(item.eventCode)}${time ? ` (${time})` : ""}`;
        }).join(", ") || "-"
      };
    })
    .sort((left, right) => left.swimmer.localeCompare(right.swimmer, "fr"));
}

function engagementPdfCollectRelayRows(entry = {}) {
  return (Array.isArray(entry.relays) ? entry.relays : [])
    .map((relay) => ({
      event: engagementPdfEventLabel(relay.eventCode),
      category: engagementPdfCategoryLabel(relay.category),
      gender: engagementPdfGenderLabel(relay.genderMode),
      time: relay.entryTime || relay.manualEntryTime || "-",
      members: (Array.isArray(relay.members) ? relay.members : [])
        .map((member) => engagementPdfPersonName(member))
        .filter((name) => name && name !== "-")
        .join(", ") || "Relayeurs non déclarés"
    }));
}

function engagementPdfDocToBuffer(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

function engagementPdfAddFooter(doc, generatedAt) {
  const range = doc.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    doc.fontSize(7).fillColor("#6b7f7a");
    doc.text(`LivePalmes - document généré le ${engagementPdfFormatDateTime(generatedAt)} - page ${index + 1}/${range.count}`, 42, 810, {
      width: 511,
      align: "center"
    });
  }
}

function engagementPdfEnsureSpace(doc, y, height) {
  if (y + height <= 785) return y;
  doc.addPage();
  return 42;
}

function engagementPdfSection(doc, title, y) {
  y = engagementPdfEnsureSpace(doc, y, 32);
  doc.roundedRect(42, y, 511, 20, 3).fill("#e8f3f5");
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#073b44").text(title, 52, y + 5, { width: 491 });
  return y + 30;
}

function engagementPdfKeyValues(doc, rows, y) {
  const colWidth = 255.5;
  rows.forEach((row, index) => {
    y = engagementPdfEnsureSpace(doc, y, 30);
    const x = 42 + (index % 2) * colWidth;
    const rowY = y;
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#6b7f7a").text(row[0], x, rowY, { width: colWidth - 16 });
    doc.font("Helvetica").fontSize(9).fillColor("#102f35").text(row[1] || "-", x, rowY + 10, { width: colWidth - 16 });
    if (index % 2 === 1) y += 30;
  });
  return rows.length % 2 ? y + 30 : y + 6;
}

function engagementPdfTextHeight(doc, text, width, fontSize = 8) {
  return doc.font("Helvetica").fontSize(fontSize).heightOfString(cleanText(text) || "-", { width });
}

function engagementPdfTable(doc, columns, rows, y) {
  const left = 42;
  const tableWidth = 511;
  const headerHeight = 18;
  const drawHeader = () => {
    doc.rect(left, y, tableWidth, headerHeight).fill("#073b44");
    let x = left;
    columns.forEach((column) => {
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#ffffff").text(column.label, x + 5, y + 5, { width: column.width - 10 });
      x += column.width;
    });
    y += headerHeight;
  };
  y = engagementPdfEnsureSpace(doc, y, headerHeight + 18);
  drawHeader();
  if (!rows.length) {
    doc.rect(left, y, tableWidth, 22).fill("#ffffff").stroke("#d8e5e2");
    doc.font("Helvetica").fontSize(8).fillColor("#6b7f7a").text("Aucune donnée.", left + 6, y + 7, { width: tableWidth - 12 });
    return y + 28;
  }
  rows.forEach((row, index) => {
    const heights = columns.map((column) => engagementPdfTextHeight(doc, row[column.key], column.width - 10, 8));
    const rowHeight = Math.max(20, Math.ceil(Math.max(...heights)) + 10);
    if (y + rowHeight > 785) {
      doc.addPage();
      y = 42;
      drawHeader();
    }
    doc.rect(left, y, tableWidth, rowHeight).fill(index % 2 ? "#f8fbfa" : "#ffffff").stroke("#d8e5e2");
    let x = left;
    columns.forEach((column) => {
      doc.font("Helvetica").fontSize(8).fillColor("#102f35").text(cleanText(row[column.key]) || "-", x + 5, y + 6, {
        width: column.width - 10
      });
      x += column.width;
    });
    y += rowHeight;
  });
  return y + 10;
}

async function buildEngagementClubRecapPdf(competition = {}, entry = {}) {
  const generatedAt = new Date().toISOString();
  const doc = new PDFDocument({
    size: "A4",
    margin: 42,
    bufferPages: true,
    info: {
      Title: `Récapitulatif engagements - ${competition.name || ""}`,
      Author: "LivePalmes",
      Subject: "Engagements compétition"
    }
  });

  doc.rect(0, 0, 595.28, 95).fill("#f4faf9");
  if (fs.existsSync(ENGAGEMENT_PDF_LOGO_PATH)) {
    doc.image(ENGAGEMENT_PDF_LOGO_PATH, 42, 22, { width: 112 });
  }
  doc.font("Helvetica-Bold").fontSize(18).fillColor("#073b44").text("Récapitulatif des engagements", 185, 24, { width: 368 });
  doc.font("Helvetica").fontSize(10).fillColor("#46625d").text(competition.name || "Compétition", 185, 50, { width: 368 });
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#0b7285").text("LivePalmes", 185, 68, { width: 368 });

  let y = 115;
  y = engagementPdfSection(doc, "Compétition", y);
  y = engagementPdfKeyValues(doc, [
    ["Nom", competition.name || "-"],
    ["Date", competition.endDate && competition.endDate !== competition.date
      ? `${engagementPdfFormatDate(competition.date)} au ${engagementPdfFormatDate(competition.endDate)}`
      : engagementPdfFormatDate(competition.date)],
    ["Lieu", competition.location || "-"],
    ["Niveau", engagementPdfLevelLabel(competition.level)],
    ["Région", competition.regionId || "-"],
    ["Statut", engagementPdfStatusLabel(competition.entryStatus)],
    ["Bassin", `${cleanEngagementPoolLength(competition.poolLength)} m`],
    ["Chronométrage", engagementPdfTimingLabel(competition.timingType)],
    ["Limite engagements", engagementPdfFormatDateTime(competition.entryDeadlineAt)],
    ["Généré le", engagementPdfFormatDateTime(generatedAt)]
  ], y);

  y = engagementPdfSection(doc, "Club", y);
  y = engagementPdfKeyValues(doc, [
    ["Club", entry.clubName || "-"],
    ["Numéro club", entry.clubId || "-"],
    ["Région", entry.regionId || "-"],
    ["Dernière mise à jour", engagementPdfFormatDateTime(entry.updatedAt)]
  ], y);

  const teamLeader = entry.teamLeader || {};
  y = engagementPdfSection(doc, "Chef d'équipe", y);
  const teamLeaderRows = teamLeader.mode === "renounced"
    ? [["Déclaration", "Le club renonce au droit de réclamation."]]
    : [
        ["Nom", engagementPdfPersonName(teamLeader)],
        ["Licence", teamLeader.licenseNumber || "-"],
        ["Club externe", teamLeader.externalClub ? (teamLeader.clubName || teamLeader.clubId || "-") : "Non"]
      ];
  y = engagementPdfKeyValues(doc, teamLeaderRows, y);

  y = engagementPdfSection(doc, "Officiels", y);
  const officialRows = competition.officialsRequired === false
    ? [{ name: "Officiels non requis pour cette compétition.", license: "-", role: "-" }]
    : (Array.isArray(entry.officials) ? entry.officials : []).map((official) => ({
        name: engagementPdfPersonName(official),
        license: official.licenseNumber || "-",
        role: "Officiel"
      }));
  y = engagementPdfTable(doc, [
    { key: "name", label: "Nom", width: 260 },
    { key: "license", label: "Licence", width: 120 },
    { key: "role", label: "Rôle", width: 131 }
  ], officialRows, y);

  y = engagementPdfSection(doc, "Nageurs et courses individuelles", y);
  y = engagementPdfTable(doc, [
    { key: "license", label: "Licence", width: 72 },
    { key: "swimmer", label: "Nageur", width: 150 },
    { key: "sex", label: "Sexe", width: 38 },
    { key: "category", label: "Cat.", width: 45 },
    { key: "entries", label: "Courses", width: 206 }
  ], engagementPdfCollectIndividualRows(entry, competition), y);

  y = engagementPdfSection(doc, "Relais", y);
  y = engagementPdfTable(doc, [
    { key: "event", label: "Relais", width: 80 },
    { key: "category", label: "Catégorie", width: 82 },
    { key: "gender", label: "Sexe", width: 62 },
    { key: "time", label: "Temps", width: 58 },
    { key: "members", label: "Relayeurs", width: 229 }
  ], engagementPdfCollectRelayRows(entry), y);

  const fees = competition.fees || {};
  const stats = engagementPdfEntryStats(entry);
  y = engagementPdfSection(doc, "Frais d'engagement", y);
  y = engagementPdfKeyValues(doc, [
    ["Nageurs", `${stats.swimmerCount} x ${engagementPdfMoney(fees.swimmerFee)}`],
    ["Courses individuelles", `${stats.individualCount} x ${engagementPdfMoney(fees.individualEventFee)}`],
    ["Relais", `${stats.relayCount} x ${engagementPdfMoney(fees.relayFee)}`],
    ["Total indicatif", engagementPdfMoney(engagementPdfFeeTotal(entry, competition))],
    ["HelloAsso", fees.helloAssoUrl ? "Lien publié" : "En attente de publication du lien"],
    ["Rappel", "Paiement attendu avant la fin de la première journée. Surplus forfaitaire de 50 EUR ensuite."]
  ], y);

  y = engagementPdfEnsureSpace(doc, y, 34);
  doc.font("Helvetica-Oblique").fontSize(8).fillColor("#6b7f7a").text(
    "Récapitulatif indicatif généré depuis LivePalmes, sous réserve de modifications ultérieures des engagements ou des frais.",
    42,
    y,
    { width: 511 }
  );

  engagementPdfAddFooter(doc, generatedAt);
  const buffer = await engagementPdfDocToBuffer(doc);
  return {
    buffer,
    generatedAt,
    fileName: `recap-engagements-${engagementPdfFileName(competition.name)}-${engagementPdfFileName(entry.clubName || entry.clubId)}.pdf`
  };
}

async function readStoredEngagementClubRecapPdf(document = {}) {
  const storagePath = cleanText(document.storagePath);
  if (!storagePath) return null;
  const [buffer] = await admin.storage().bucket().file(storagePath).download();
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}

async function saveEngagementClubRecapPdfDocument(competition = {}, entry = {}, pdf = {}, sourceHash = "") {
  const db = admin.firestore();
  const generatedAt = cleanText(pdf.generatedAt) || new Date().toISOString();
  const storagePath = engagementClubRecapPdfStoragePath(competition.id || entry.competitionId, entry.clubId);
  const fileName = cleanText(pdf.fileName) || "recap-engagements-livepalmes.pdf";
  const buffer = Buffer.isBuffer(pdf.buffer) ? pdf.buffer : Buffer.from(pdf.buffer || []);
  await admin.storage().bucket().file(storagePath).save(buffer, {
    resumable: false,
    contentType: "application/pdf",
    metadata: {
      cacheControl: "private, max-age=0, no-transform",
      metadata: {
        competitionId: cleanText(competition.id || entry.competitionId).slice(0, 128),
        clubId: cleanText(entry.clubId).slice(0, 40),
        generatedAt,
        sourceHash: cleanText(sourceHash).slice(0, 80)
      }
    }
  });
  const document = cleanEngagementDocumentMetadata({
    status: "generated",
    type: "clubRecapPdf",
    fileName,
    contentType: "application/pdf",
    storagePath,
    size: buffer.length,
    generatedAt,
    sourceUpdatedAt: entry.updatedAt,
    sourceHash,
    competitionId: competition.id || entry.competitionId,
    clubId: entry.clubId
  });
  const summaryEntry = {
    ...entry,
    documents: {
      ...(entry.documents || {}),
      clubRecapPdf: document
    }
  };
  const batch = db.batch();
  batch.set(db.collection("engagementClubEntries").doc(engagementClubEntryId(entry.competitionId, entry.clubId)), {
    documents: {
      clubRecapPdf: document
    }
  }, { merge: true });
  batch.set(db.collection("engagementCompetitions").doc(entry.competitionId), {
    documents: {
      clubRecapPdf: {
        status: "generated",
        generatedAt,
        updatedAt: generatedAt
      }
    }
  }, { merge: true });
  upsertEngagementCompetitionEntrySummary(batch, db, summaryEntry, generatedAt);
  await batch.commit();
  return document;
}

async function getOrCreateEngagementClubRecapPdf(competitionSnapshot, entrySnapshot, options = {}) {
  const competition = engagementCompetitionDetailItem(competitionSnapshot);
  const entry = engagementClubEntryItem(entrySnapshot);
  const sourceHash = engagementClubRecapPdfSourceHash(competition, entry);
  const existingDocument = entry.documents?.clubRecapPdf || null;
  if (options.force !== true && existingDocument?.storagePath && existingDocument.sourceHash === sourceHash) {
    try {
      const buffer = await readStoredEngagementClubRecapPdf(existingDocument);
      if (buffer?.length) {
        return {
          buffer,
          generatedAt: existingDocument.generatedAt,
          fileName: existingDocument.fileName || "recap-engagements-livepalmes.pdf",
          document: existingDocument,
          fromStorage: true
        };
      }
    } catch (error) {
      console.warn("engagement recap pdf storage read failed", {
        competitionId: entry.competitionId,
        clubId: entry.clubId,
        storagePath: existingDocument.storagePath,
        message: error?.message || String(error)
      });
    }
  }
  const pdf = await buildEngagementClubRecapPdf(competition, entry);
  const document = await saveEngagementClubRecapPdfDocument(competition, entry, pdf, sourceHash);
  return {
    ...pdf,
    document,
    fromStorage: false
  };
}

function cleanEngagementClubPerson(raw = {}, context = {}) {
  const firstName = cleanText(raw.firstName).slice(0, 80);
  const lastName = cleanText(raw.lastName).slice(0, 80);
  const licenseNumber = cleanText(raw.licenseNumber).slice(0, 60);
  const roles = raw.roles || {};
  const official = roles.official === true || raw.official === true;
  const teamLeader = roles.teamLeader === true || raw.teamLeader === true;
  if (!firstName || !lastName) {
    throw new HttpsError("invalid-argument", "Nom et prenom obligatoires.");
  }
  if (!licenseNumber) {
    throw new HttpsError("invalid-argument", "Numero de licence obligatoire.");
  }
  if (!official && !teamLeader) {
    throw new HttpsError("invalid-argument", "Selectionnez au moins un role.");
  }
  return {
    clubId: context.clubId,
    clubName: context.clubName,
    regionId: context.regionId,
    firstName,
    lastName,
    licenseNumber,
    roles: {
      official,
      teamLeader
    },
    active: raw.active === false ? false : true
  };
}

function engagementClubPersonItem(doc) {
  const data = doc.data() || {};
  const roles = data.roles || {};
  return {
    id: doc.id,
    clubId: cleanText(data.clubId).slice(0, 40),
    clubName: cleanText(data.clubName).slice(0, 140),
    regionId: cleanText(data.regionId).slice(0, 80),
    firstName: cleanText(data.firstName).slice(0, 80),
    lastName: cleanText(data.lastName).slice(0, 80),
    licenseNumber: cleanText(data.licenseNumber).slice(0, 60),
    roles: {
      official: roles.official === true,
      teamLeader: roles.teamLeader === true
    },
    active: data.active !== false,
    updatedAt: cleanText(data.updatedAt).slice(0, 40)
  };
}

function engagementClubPeopleRosterId(clubId) {
  return stableHash(cleanText(clubId)).slice(0, 40);
}

function engagementClubPeopleRosterRef(db, clubId) {
  return db.collection(ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION).doc(engagementClubPeopleRosterId(clubId));
}

function engagementClubPeopleRosterPersonItem(person = {}) {
  const roles = person.roles || {};
  return cleanFirestoreValue({
    id: cleanText(person.id).slice(0, 80),
    clubId: cleanText(person.clubId).slice(0, 40),
    clubName: cleanText(person.clubName).slice(0, 140),
    regionId: cleanText(person.regionId).slice(0, 80),
    firstName: cleanText(person.firstName).slice(0, 80),
    lastName: cleanText(person.lastName).slice(0, 80),
    licenseNumber: cleanText(person.licenseNumber).slice(0, 60),
    roles: {
      official: roles.official === true,
      teamLeader: roles.teamLeader === true
    },
    active: person.active !== false,
    updatedAt: cleanText(person.updatedAt).slice(0, 40)
  });
}

function engagementClubPeopleRosterPeopleFromData(data = {}) {
  const people = data.people && typeof data.people === "object" ? data.people : {};
  return Object.values(people)
    .map(engagementClubPeopleRosterPersonItem)
    .filter((person) => person.id && person.clubId)
    .sort((left, right) => `${left.lastName} ${left.firstName}`.localeCompare(`${right.lastName} ${right.firstName}`, "fr"));
}

function upsertEngagementClubPeopleRosterPerson(batch, db, person = {}, now = "") {
  const item = engagementClubPeopleRosterPersonItem(person);
  if (!item.clubId || !item.id) return;
  batch.set(engagementClubPeopleRosterRef(db, item.clubId), {
    clubId: item.clubId,
    clubName: item.clubName,
    updatedAt: now || new Date().toISOString(),
    people: {
      [item.id]: item
    }
  }, { merge: true });
}

function deleteEngagementClubPeopleRosterPerson(batch, db, person = {}, now = "") {
  const clubId = cleanText(person.clubId).slice(0, 40);
  const personId = cleanText(person.id).slice(0, 80);
  if (!clubId || !personId) return;
  batch.set(engagementClubPeopleRosterRef(db, clubId), {
    updatedAt: now || new Date().toISOString(),
    people: {
      [personId]: admin.firestore.FieldValue.delete()
    }
  }, { merge: true });
}

async function rebuildEngagementClubPeopleRoster(db, context = {}) {
  const clubId = cleanText(context.clubId).slice(0, 40);
  if (!clubId) return [];
  const snapshot = await db.collection("engagementClubPeople")
    .where("clubId", "==", clubId)
    .limit(200)
    .get();
  const people = {};
  snapshot.docs.forEach((doc) => {
    const item = engagementClubPeopleRosterPersonItem(engagementClubPersonItem(doc));
    if (item.id && item.clubId === clubId) people[item.id] = item;
  });
  const now = new Date().toISOString();
  await engagementClubPeopleRosterRef(db, clubId).set({
    clubId,
    clubName: cleanText(context.clubName).slice(0, 140),
    generatedAt: now,
    updatedAt: now,
    personCount: Object.keys(people).length,
    people
  }, { merge: false });
  return engagementClubPeopleRosterPeopleFromData({ people });
}

async function syncEngagementClubPeopleRosterFromChange(event = {}) {
  const before = event.data?.before?.exists ? engagementClubPersonItem(event.data.before) : null;
  const after = event.data?.after?.exists ? engagementClubPersonItem(event.data.after) : null;
  const db = admin.firestore();
  const now = new Date().toISOString();
  const batch = db.batch();
  let batchSize = 0;
  if (before?.clubId && (!after || before.clubId !== after.clubId)) {
    deleteEngagementClubPeopleRosterPerson(batch, db, before, now);
    batchSize += 1;
  }
  if (after?.clubId) {
    upsertEngagementClubPeopleRosterPerson(batch, db, after, now);
    batchSize += 1;
  }
  if (batchSize) await batch.commit();
}

exports.syncEngagementClubPersonToRoster = onDocumentWritten({
  region: REGION,
  document: "engagementClubPeople/{personId}"
}, async (event) => {
  await syncEngagementClubPeopleRosterFromChange(event);
});

function engagementClubSwimmerItem(doc) {
  const data = doc.data() || {};
  const firstName = cleanText(data.firstName).slice(0, 80);
  const lastName = cleanText(data.lastName).slice(0, 80);
  const name = cleanText(data.name).slice(0, 160) || [firstName, lastName].filter(Boolean).join(" ");
  const licenseSeason = engagementLicenseSeasonState(data);
  return cleanFirestoreValue({
    id: doc.id,
    swimmerIndexId: doc.id,
    source: "performances",
    swimmerId: cleanText(data.id || data.swimmerId).slice(0, 80),
    identityKey: cleanText(data.identityKey).slice(0, 180),
    firstName,
    lastName,
    name,
    birthDate: cleanIsoDate(data.birthDate),
    sex: cleanText(data.sex).slice(0, 20),
    category: currentEngagementCategoryFromBirthDate(data.birthDate),
    clubId: cleanText(data.clubId).slice(0, 40),
    club: cleanText(data.club).slice(0, 60),
    clubName: cleanText(data.clubName).slice(0, 140),
    licenseNumber: cleanText(data.licenseNumber).slice(0, 60),
    licenseVerificationStatus: cleanEngagementLicenseVerificationStatus(data.licenseVerificationStatus || data.verificationStatus, "pending"),
    licenseSeasonLabel: licenseSeason.label,
    licenseSeasonStatus: licenseSeason.status,
    latestDate: cleanIsoDate(data.latestDate),
    performanceCount: Math.max(0, Math.trunc(Number(data.performanceCount) || 0)),
    sourceIds: Array.isArray(data.sourceIds) ? data.sourceIds.map((id) => cleanText(id).slice(0, 80)).filter(Boolean).slice(0, 20) : []
  });
}

function engagementReferenceSwimmerItem(raw = {}) {
  const swimmerId = cleanText(raw.id || raw.swimmerId).slice(0, 80);
  const firstName = cleanText(raw.firstName).slice(0, 80);
  const lastName = cleanText(raw.lastName).slice(0, 80);
  const name = cleanText(raw.name).slice(0, 160) || [firstName, lastName].filter(Boolean).join(" ");
  const birthDate = cleanIsoDate(raw.birthDate);
  const licenseSeason = engagementLicenseSeasonState(raw);
  return cleanFirestoreValue({
    id: swimmerId,
    swimmerIndexId: swimmerId,
    source: "reference",
    swimmerId,
    identityKey: cleanText(raw.identityKey).slice(0, 180) || engagementSwimmerIdentityKey(firstName, lastName, birthDate),
    firstName,
    lastName,
    name,
    birthDate,
    sex: cleanText(raw.sex).slice(0, 20),
    category: currentEngagementCategoryFromBirthDate(birthDate),
    clubId: cleanText(raw.clubId).slice(0, 40),
    club: cleanText(raw.club).slice(0, 60),
    clubName: cleanText(raw.clubName).slice(0, 140),
    licenseNumber: cleanText(raw.licenseNumber).slice(0, 60),
    licenseVerificationStatus: cleanEngagementLicenseVerificationStatus(raw.licenseVerificationStatus || raw.verificationStatus, "pending"),
    licenseSeasonLabel: licenseSeason.label,
    licenseSeasonStatus: licenseSeason.status,
    latestDate: cleanIsoDate(raw.latestDate),
    performanceCount: Math.max(0, Math.trunc(Number(raw.performanceCount) || 0)),
    sourceIds: swimmerId ? [swimmerId] : []
  });
}

function engagementReferenceClubSwimmers(clubId = "", limit = 800) {
  const targetClubId = cleanText(clubId);
  if (!targetClubId) return [];
  return intranapSwimmersIndex
    .filter((swimmer) => cleanText(swimmer.clubId) === targetClubId)
    .slice(0, limit)
    .map(engagementReferenceSwimmerItem)
    .filter((swimmer) => swimmer.swimmerIndexId && swimmer.clubId === targetClubId);
}

function sortEngagementClubSwimmers(swimmers = []) {
  return swimmers.sort((left, right) =>
    cleanText(right.latestDate).localeCompare(cleanText(left.latestDate)) ||
    cleanText(left.lastName).localeCompare(cleanText(right.lastName), "fr") ||
    cleanText(left.firstName).localeCompare(cleanText(right.firstName), "fr")
  );
}

function uniqueEngagementClubSwimmers(swimmers = [], limit = 800) {
  return swimmers.filter((swimmer, index, list) => {
    if (!swimmer.swimmerIndexId) return false;
    return list.findIndex((candidate) => candidate.swimmerIndexId === swimmer.swimmerIndexId) === index;
  }).slice(0, limit);
}

async function rebuildEngagementClubRoster(db, context = {}, limit = 800) {
  const clubId = cleanText(context.clubId);
  if (!clubId) return [];
  const snapshot = await db
    .collection(PERFORMANCE_SWIMMERS_COLLECTION)
    .where("clubId", "==", clubId)
    .limit(limit)
    .get();
  const newSwimmersSnapshot = await db
    .collection("engagementClubSwimmers")
    .where("clubId", "==", clubId)
    .where("active", "==", true)
    .limit(200)
    .get();
  const legacyLicenses = await engagementLegacySwimmerLicensesByClub(db, clubId);
  const swimmers = sortEngagementClubSwimmers(uniqueEngagementClubSwimmers([
    ...newSwimmersSnapshot.docs.map(engagementNewSwimmerItem),
    ...snapshot.docs.map(engagementClubSwimmerItem),
    ...engagementReferenceClubSwimmers(clubId, limit)
  ], limit).map((swimmer) => {
    const legacyLicense = legacyLicenses.get(swimmer.swimmerIndexId);
    return legacyLicense?.licenseNumber
      ? {
          ...swimmer,
          licenseNumber: legacyLicense.licenseNumber,
          licenseVerificationStatus: legacyLicense.verificationStatus || "pending",
          licenseSeasonLabel: legacyLicense.licenseSeasonLabel,
          licenseSeasonStatus: legacyLicense.licenseSeasonStatus,
          licenseSeasons: legacyLicense.licenseSeasons
        }
      : swimmer;
  }));
  const now = new Date().toISOString();
  const rosterEntries = {};
  swimmers.forEach((swimmer) => {
    const item = engagementClubRosterSwimmerItem(swimmer);
    if (item.swimmerIndexId && item.clubId === clubId) rosterEntries[engagementClubRosterSwimmerKey(item)] = item;
  });
  const swimmersWithMigratedLicenses = swimmers.filter((swimmer) =>
    swimmer.licenseNumber && legacyLicenses.has(swimmer.swimmerIndexId) && swimmer.source !== "reference"
  );
  for (let index = 0; index < swimmersWithMigratedLicenses.length; index += 420) {
    const batch = db.batch();
    swimmersWithMigratedLicenses.slice(index, index + 420).forEach((swimmer) => {
      batch.set(db.collection(swimmer.source === "engagement" ? "engagementClubSwimmers" : PERFORMANCE_SWIMMERS_COLLECTION).doc(swimmer.swimmerIndexId), {
        licenseNumber: cleanText(swimmer.licenseNumber).slice(0, 60),
        licenseUpdatedAt: now,
        licenseUpdatedBy: "engagement-roster-migration",
        updatedAt: now
      }, { merge: true });
    });
    await batch.commit();
  }
  await engagementClubRosterRef(db, clubId).set({
    clubId,
    clubName: cleanText(context.clubName).slice(0, 140) || swimmers.find((swimmer) => swimmer.clubName)?.clubName || "",
    generatedAt: now,
    updatedAt: now,
    swimmerCount: Object.keys(rosterEntries).length,
    swimmers: rosterEntries
  }, { merge: false });
  return swimmers;
}

async function syncEngagementClubRosterFromSwimmerChange(event = {}, source = "performances") {
  const before = event.data?.before?.exists ? event.data.before.data() || {} : null;
  const after = event.data?.after?.exists ? event.data.after.data() || {} : null;
  const docId = cleanText(event.params?.swimmerIndexId || event.params?.swimmerId);
  const db = admin.firestore();
  const now = new Date().toISOString();
  const batch = db.batch();
  let batchSize = 0;
  const beforeItem = before
    ? engagementClubRosterSwimmerItem({ ...before, swimmerIndexId: docId, source })
    : null;
  const afterItem = after
    ? engagementClubRosterSwimmerItem({ ...after, swimmerIndexId: docId, source })
    : null;
  const shouldDeleteBefore = beforeItem?.clubId && (
    !afterItem ||
    afterItem.active === false ||
    beforeItem.clubId !== afterItem.clubId ||
    engagementClubRosterSwimmerKey(beforeItem) !== engagementClubRosterSwimmerKey(afterItem)
  );
  if (shouldDeleteBefore) {
    deleteEngagementClubRosterSwimmer(batch, db, beforeItem, now);
    batchSize += 1;
  }
  if (afterItem?.clubId && afterItem.active !== false) {
    upsertEngagementClubRosterSwimmer(batch, db, afterItem, now);
    batchSize += 1;
  }
  if (source !== "engagement" && docId) {
    deleteEngagementEntryTimeCache(batch, db, { source, swimmerIndexId: docId });
    batchSize += 1;
  }
  if (batchSize) await batch.commit();
}

exports.syncPerformanceSwimmerToEngagementClubRoster = onDocumentWritten({
  region: REGION,
  document: `${PERFORMANCE_SWIMMERS_COLLECTION}/{swimmerIndexId}`
}, async (event) => {
  await syncEngagementClubRosterFromSwimmerChange(event, "performances");
});

exports.syncEngagementClubSwimmerToRoster = onDocumentWritten({
  region: REGION,
  document: "engagementClubSwimmers/{swimmerId}"
}, async (event) => {
  await syncEngagementClubRosterFromSwimmerChange(event, "engagement");
});

function cleanIsoDateTime(value) {
  const text = cleanText(value).slice(0, 40);
  if (!text) return "";
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function cleanEngagementCompetitionPayload(raw = {}, context = {}) {
  const name = cleanText(raw.name).slice(0, 160);
  const date = cleanIsoDate(raw.date);
  const endDate = cleanIsoDate(raw.endDate) || date;
  const location = cleanText(raw.location).slice(0, 160);
  const level = cleanEngagementCompetitionLevel(raw.level);
  const entryDeadlineAt = cleanIsoDateTime(raw.entryDeadlineAt);
  const computerEmail = cleanOptionalEmail(raw.computerEmail, "Email informatique");
  const entryStatus = cleanEngagementEntryStatus(raw.entryStatus);
  const poolLength = cleanEngagementPoolLength(raw.poolLength);
  const timingType = cleanEngagementTimingType(raw.timingType);
  const qualificationTimesMode = cleanEngagementQualificationTimesMode(raw.qualificationTimesMode);
  const qualificationStartDate = qualificationTimesMode === "period" ? cleanIsoDate(raw.qualificationStartDate) : "";
  const qualificationEndDate = qualificationTimesMode === "period" ? cleanIsoDate(raw.qualificationEndDate) : "";
  const missingEntryTimeMode = cleanEngagementMissingEntryTimeMode(raw.missingEntryTimeMode);
  const maxEventsPerSwimmer = cleanEngagementMaxEventsPerSwimmer(raw.maxEventsPerSwimmer);
  const requestedRegionId = cleanText(raw.regionId).slice(0, 80);
  const regionId = level === "national" ? "" : (context.national ? requestedRegionId : context.regionId);

  if (!context.national && !context.region) {
    throw new HttpsError("permission-denied", "Droit creation competition engagements requis.");
  }
  if (!context.national && level === "national") {
    throw new HttpsError("permission-denied", "Une competition nationale doit etre creee par le niveau national.");
  }
  if (!name || !date || !location) {
    throw new HttpsError("invalid-argument", "Nom, date et lieu sont obligatoires.");
  }
  if (endDate && endDate < date) {
    throw new HttpsError("invalid-argument", "La date de fin doit etre egale ou posterieure a la date de debut.");
  }
  if (level !== "national" && !regionId) {
    throw new HttpsError("invalid-argument", "Region obligatoire pour une competition departementale ou regionale.");
  }
  if (qualificationTimesMode === "period" && (!qualificationStartDate || !qualificationEndDate)) {
    throw new HttpsError("invalid-argument", "Periode des temps d'engagement incomplete.");
  }
  if (qualificationTimesMode === "period" && qualificationStartDate > qualificationEndDate) {
    throw new HttpsError("invalid-argument", "La fin de periode des temps doit etre apres le debut.");
  }

  const events = Object.prototype.hasOwnProperty.call(raw, "events")
    ? cleanEngagementCompetitionEvents(raw.events)
    : null;

  return {
    name,
    date,
    endDate,
    location,
    regionId,
    level,
    entryDeadlineAt,
    computerEmail,
    entryStatus,
    officialsRequired: raw.officialsRequired === true,
    poolLength,
    timingType,
    qualificationTimesMode,
    qualificationStartDate,
    qualificationEndDate,
    missingEntryTimeMode,
    maxEventsPerSwimmer,
    ...(Object.prototype.hasOwnProperty.call(raw, "fees")
      ? { fees: cleanEngagementFees(raw.fees) }
      : {}),
    ...(events
      ? {
          events,
          programSessions: cleanEngagementProgramSessions(raw.programSessions || [], events)
        }
      : {})
  };
}

function assertCanManageEngagementCompetition(context = {}, competition = {}) {
  if (context.national) return;
  if (!context.region || !context.regionId) {
    throw new HttpsError("permission-denied", "Droit gestion competition engagements requis.");
  }
  if (cleanEngagementCompetitionLevel(competition.level) === "national") {
    throw new HttpsError("permission-denied", "Competition nationale reservee au niveau national.");
  }
  if (cleanText(competition.regionId) !== context.regionId) {
    throw new HttpsError("permission-denied", "Competition hors perimetre regional.");
  }
}

function engagementClubWriteLockReason(competition = {}, nowMs = Date.now()) {
  const entryStatus = cleanEngagementEntryStatus(competition.entryStatus || competition.status);
  if (entryStatus === "closed") return "Les engagements sont fermes.";
  if (entryStatus !== "open") return "Les engagements ne sont pas ouverts.";
  const deadline = cleanIsoDateTime(competition.entryDeadlineAt);
  if (!deadline) return "";
  const deadlineMs = Date.parse(deadline);
  return Number.isFinite(deadlineMs) && deadlineMs < nowMs
    ? "La date limite des engagements est depassee."
    : "";
}

function assertEngagementClubWriteOpen(competition = {}) {
  const reason = engagementClubWriteLockReason(competition);
  if (reason) {
    throw new HttpsError("failed-precondition", reason, {
      entryStatus: cleanEngagementEntryStatus(competition.entryStatus || competition.status),
      entryDeadlineAt: cleanIsoDateTime(competition.entryDeadlineAt)
    });
  }
}

exports.listEngagementCompetitions = onCall(CALLABLE_OPTIONS, async (request) => {
  await assertEngagementsAccess(request);
  const fromDate = cleanIsoDate(request.data?.fromDate) || new Date().toISOString().slice(0, 10);
  const season = engagementSeasonBoundsFromEndYear(engagementSeasonEndYearFromIsoDate(fromDate));
  const requestedToDate = cleanIsoDate(request.data?.toDate);
  const startDate = fromDate || season.startDate;
  const endDate = requestedToDate || season.endDate;
  const limit = Math.min(1200, Math.max(10, Math.trunc(Number(request.data?.limit) || 250)));
  const regionId = cleanText(request.data?.regionId).slice(0, 80);
  const level = ENGAGEMENT_COMPETITION_LEVELS.has(cleanText(request.data?.level))
    ? cleanText(request.data.level)
    : "";
  const entryStatus = ENGAGEMENT_ENTRY_STATUSES.has(cleanText(request.data?.entryStatus))
    ? cleanText(request.data.entryStatus)
    : "";
  const db = admin.firestore();
  const forceRebuild = request.data?.forceCalendar === true;
  const calendarSnapshot = forceRebuild ? null : await engagementCompetitionCalendarRef(db, season.endYear).get();
  const calendarReady = calendarSnapshot?.exists && cleanText(calendarSnapshot.data()?.generatedAt);
  let calendarGenerated = false;
  const calendarItems = calendarReady
    ? engagementCompetitionCalendarItemsFromData(calendarSnapshot.data() || {})
    : await rebuildEngagementCompetitionCalendar(db, season.endYear).then((items) => {
      calendarGenerated = true;
      return items;
    });
  const competitions = filterEngagementCompetitionCalendarItems(calendarItems, {
    startDate,
    endDate,
    regionId,
    level,
    entryStatus
  }).slice(0, limit);

  return {
    ok: true,
    collection: ENGAGEMENT_COMPETITION_CALENDARS_COLLECTION,
    fromDate: startDate,
    toDate: endDate,
    seasonStartYear: season.startYear,
    seasonEndYear: season.endYear,
    calendarGenerated,
    competitions
  };
});

exports.getEngagementCompetition = onCall(CALLABLE_OPTIONS, async (request) => {
  await assertEngagementsAccess(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }
  const doc = await admin.firestore().collection("engagementCompetitions").doc(competitionId).get();
  if (!doc.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  const deletionRequest = await admin.firestore().collection("engagementCompetitionDeletionRequests").doc(competitionId).get();
  const deletionRequestData = deletionRequest.exists ? deletionRequest.data() || {} : {};
  return {
    ok: true,
    competition: {
      ...engagementCompetitionDetailItem(doc),
      deletionRequestStatus: deletionRequestData.status === "pending" ? "pending" : ""
    }
  };
});

exports.getEngagementClubEntry = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementClubAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }
  const competition = await admin.firestore().collection("engagementCompetitions").doc(competitionId).get();
  if (!competition.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  const entryRef = admin.firestore().collection("engagementClubEntries").doc(engagementClubEntryId(competitionId, context.clubId));
  const entry = await entryRef.get();
  return {
    ok: true,
    entry: engagementClubEntryItem(entry, {
      competitionId,
      clubId: context.clubId,
      clubName: context.clubName,
      regionId: context.regionId,
      status: "active"
    })
  };
});

exports.generateEngagementClubRecapPdf = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementClubAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }
  const competition = await admin.firestore().collection("engagementCompetitions").doc(competitionId).get();
  if (!competition.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  const entry = await admin.firestore()
    .collection("engagementClubEntries")
    .doc(engagementClubEntryId(competitionId, context.clubId))
    .get();
  if (!entry.exists) {
    throw new HttpsError("failed-precondition", "Aucune inscription club a recapitulatif.");
  }
  const entryData = engagementClubEntryItem(entry);
  if (entryData.clubId !== context.clubId) {
    throw new HttpsError("permission-denied", "Inscription hors perimetre club.");
  }
  const { buffer, generatedAt, fileName, document, fromStorage } = await getOrCreateEngagementClubRecapPdf(competition, entry, {
    force: request.data?.force === true
  });
  await writeAuditLog("engagementClubEntry.recapPdfGenerated", context.uid, {
    competitionId,
    clubId: context.clubId,
    fileName,
    size: buffer.length,
    fromStorage
  });
  return {
    ok: true,
    fileName,
    contentType: "application/pdf",
    generatedAt,
    document,
    fromStorage,
    pdfBase64: buffer.toString("base64")
  };
});

exports.listEngagementCompetitionClubRecaps = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }
  const competition = await admin.firestore().collection("engagementCompetitions").doc(competitionId).get();
  if (!competition.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  assertCanManageEngagementCompetition(context, competition.data() || {});
  const db = admin.firestore();
  const forceRebuild = request.data?.forceSummary === true;
  const summarySnapshot = forceRebuild ? null : await engagementCompetitionEntrySummaryRef(db, competitionId).get();
  const summaryReady = summarySnapshot?.exists && cleanText(summarySnapshot.data()?.generatedAt);
  let summaryGenerated = false;
  const summaryEntries = summaryReady
    ? engagementCompetitionEntrySummariesFromData(summarySnapshot.data() || {})
    : await rebuildEngagementCompetitionEntrySummary(db, competitionId).then((items) => {
      summaryGenerated = true;
      return items;
    });
  const competitionDetail = engagementCompetitionDetailItem(competition);
  const entries = summaryEntries.map((entry) => ({
    ...entry,
    totalFee: engagementPdfFeeTotal(entry, competitionDetail)
  }));
  return {
    ok: true,
    competitionId,
    collection: ENGAGEMENT_COMPETITION_ENTRY_SUMMARIES_COLLECTION,
    summaryGenerated,
    entries
  };
});

exports.generateEngagementClubRecapPdfForAdmin = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  const clubId = cleanText(request.data?.clubId).slice(0, 40);
  if (!competitionId || !clubId) {
    throw new HttpsError("invalid-argument", "Competition et club requis.");
  }
  const competition = await admin.firestore().collection("engagementCompetitions").doc(competitionId).get();
  if (!competition.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  assertCanManageEngagementCompetition(context, competition.data() || {});
  const entry = await admin.firestore()
    .collection("engagementClubEntries")
    .doc(engagementClubEntryId(competitionId, clubId))
    .get();
  if (!entry.exists) {
    throw new HttpsError("not-found", "Inscription club introuvable.");
  }
  const entryData = engagementClubEntryItem(entry);
  if (entryData.clubId !== clubId) {
    throw new HttpsError("permission-denied", "Inscription club incoherente.");
  }
  const { buffer, generatedAt, fileName, document, fromStorage } = await getOrCreateEngagementClubRecapPdf(competition, entry, {
    force: request.data?.force === true
  });
  await writeAuditLog("engagementCompetition.clubRecapPdfGeneratedByAdmin", context.uid, {
    competitionId,
    clubId,
    fileName,
    size: buffer.length,
    fromStorage
  });
  return {
    ok: true,
    fileName,
    contentType: "application/pdf",
    generatedAt,
    document,
    fromStorage,
    pdfBase64: buffer.toString("base64")
  };
});

exports.generateEngagementCompetitionClubRecapPdfs = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }
  const db = admin.firestore();
  const competition = await db.collection("engagementCompetitions").doc(competitionId).get();
  if (!competition.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  assertCanManageEngagementCompetition(context, competition.data() || {});
  const entriesSnapshot = await db.collection("engagementClubEntries")
    .where("competitionId", "==", competitionId)
    .limit(500)
    .get();
  let generatedCount = 0;
  let reusedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const entries = [];
  for (const entryDoc of entriesSnapshot.docs) {
    const entry = engagementClubEntryItem(entryDoc);
    if (!entry.clubId || !entry.teamLeaderComplete) {
      skippedCount += 1;
      continue;
    }
    try {
      const result = await getOrCreateEngagementClubRecapPdf(competition, entryDoc, {
        force: request.data?.force === true
      });
      if (result.fromStorage) reusedCount += 1;
      else generatedCount += 1;
      entries.push(engagementCompetitionEntrySummaryItem({
        ...entry,
        documents: {
          ...(entry.documents || {}),
          clubRecapPdf: result.document
        }
      }));
    } catch (error) {
      errorCount += 1;
      console.warn("engagement recap pdf generation failed", {
        competitionId,
        clubId: entry.clubId,
        message: error?.message || String(error)
      });
    }
  }
  await writeAuditLog("engagementCompetition.clubRecapPdfsGenerated", context.uid, {
    competitionId,
    entryCount: entriesSnapshot.size,
    generatedCount,
    reusedCount,
    skippedCount,
    errorCount
  });
  return {
    ok: true,
    competitionId,
    entryCount: entriesSnapshot.size,
    generatedCount,
    reusedCount,
    skippedCount,
    errorCount,
    entries
  };
});

exports.saveEngagementClubTeamLeader = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementClubAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }
  const competition = await admin.firestore().collection("engagementCompetitions").doc(competitionId).get();
  if (!competition.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  assertEngagementClubWriteOpen(competition.data() || {});
  const rawTeamLeader = cleanEngagementTeamLeader(request.data?.teamLeader || {});
  const teamLeader = rawTeamLeader.mode === "person" && !rawTeamLeader.externalClub
    ? {
        ...rawTeamLeader,
        clubId: context.clubId,
        clubName: context.clubName
      }
    : rawTeamLeader;
  if (!engagementTeamLeaderComplete(teamLeader)) {
    throw new HttpsError("invalid-argument", "Chef d'equipe ou renonciation obligatoire.");
  }
  const now = new Date().toISOString();
  const entryRef = admin.firestore().collection("engagementClubEntries").doc(engagementClubEntryId(competitionId, context.clubId));
  const snapshot = await entryRef.get();
  const payload = {
    competitionId,
    clubId: context.clubId,
    clubName: context.clubName,
    regionId: context.regionId,
    status: "active",
    teamLeader,
    teamLeaderComplete: true,
    updatedAt: now,
    updatedBy: context.uid,
    ...(snapshot.exists ? {} : { createdAt: now, createdBy: context.uid })
  };
  await entryRef.set(payload, { merge: true });
  await writeAuditLog("engagementClubEntry.teamLeaderSaved", context.uid, {
    competitionId,
    clubId: context.clubId,
    mode: teamLeader.mode
  });
  const updated = await entryRef.get();
  return {
    ok: true,
    entry: engagementClubEntryItem(updated)
  };
});

exports.listEngagementClubPeople = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementClubAccessContext(request);
  const includeInactive = request.data?.includeInactive === true;
  const db = admin.firestore();
  const forceRebuild = request.data?.forceRoster === true;
  const rosterSnapshot = forceRebuild ? null : await engagementClubPeopleRosterRef(db, context.clubId).get();
  const rosterReady = rosterSnapshot?.exists && cleanText(rosterSnapshot.data()?.generatedAt);
  let rosterGenerated = false;
  const rosterPeople = rosterReady
    ? engagementClubPeopleRosterPeopleFromData(rosterSnapshot.data() || {})
    : await rebuildEngagementClubPeopleRoster(db, context).then((items) => {
      rosterGenerated = true;
      return items;
    });
  const people = rosterPeople
    .filter((person) => includeInactive || person.active)
    .sort((left, right) => `${left.lastName} ${left.firstName}`.localeCompare(`${right.lastName} ${right.firstName}`, "fr"));
  return {
    ok: true,
    collection: ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION,
    rosterGenerated,
    people
  };
});

exports.saveEngagementClubPerson = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementClubAccessContext(request);
  const personId = cleanText(request.data?.personId).slice(0, 80);
  const person = cleanEngagementClubPerson(request.data?.person || {}, context);
  const db = admin.firestore();
  const docId = personId || stableHash(`${context.clubId}|${person.licenseNumber}`).slice(0, 40);
  const ref = db.collection("engagementClubPeople").doc(docId);
  const snapshot = await ref.get();
  if (snapshot.exists && cleanText(snapshot.data()?.clubId) !== context.clubId) {
    throw new HttpsError("permission-denied", "Personne hors perimetre club.");
  }
  const now = new Date().toISOString();
  const payload = {
    ...person,
    updatedAt: now,
    updatedBy: context.uid,
    ...(snapshot.exists ? {} : { createdAt: now, createdBy: context.uid })
  };
  const batch = db.batch();
  batch.set(ref, payload, { merge: true });
  upsertEngagementClubPeopleRosterPerson(batch, db, { ...payload, id: docId }, now);
  await batch.commit();
  await writeAuditLog("engagementClubPerson.saved", context.uid, {
    personId: docId,
    clubId: context.clubId,
    licenseNumber: person.licenseNumber,
    roles: person.roles
  });
  const updated = await ref.get();
  return {
    ok: true,
    person: engagementClubPersonItem(updated)
  };
});

exports.setEngagementClubPersonStatus = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementClubAccessContext(request);
  const personId = cleanText(request.data?.personId).slice(0, 80);
  const active = request.data?.active === true;
  if (!personId) {
    throw new HttpsError("invalid-argument", "Personne requise.");
  }
  const ref = admin.firestore().collection("engagementClubPeople").doc(personId);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Personne introuvable.");
  }
  if (cleanText(snapshot.data()?.clubId) !== context.clubId) {
    throw new HttpsError("permission-denied", "Personne hors perimetre club.");
  }
  const now = new Date().toISOString();
  const db = admin.firestore();
  const payload = {
    active,
    updatedAt: now,
    updatedBy: context.uid
  };
  const batch = db.batch();
  batch.set(ref, payload, { merge: true });
  upsertEngagementClubPeopleRosterPerson(batch, db, engagementClubPersonItem({
    id: ref.id,
    data: () => ({ ...(snapshot.data() || {}), ...payload })
  }), now);
  await batch.commit();
  await writeAuditLog("engagementClubPerson.statusChanged", context.uid, {
    personId,
    clubId: context.clubId,
    active
  });
  const updated = await ref.get();
  return {
    ok: true,
    person: engagementClubPersonItem(updated)
  };
});

exports.saveEngagementClubOfficials = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementClubAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }
  const competition = await admin.firestore().collection("engagementCompetitions").doc(competitionId).get();
  if (!competition.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  assertEngagementClubWriteOpen(competition.data() || {});
  const entryRef = admin.firestore().collection("engagementClubEntries").doc(engagementClubEntryId(competitionId, context.clubId));
  const entry = await entryRef.get();
  if (!entry.exists || !engagementTeamLeaderComplete(entry.data()?.teamLeader || {})) {
    throw new HttpsError("failed-precondition", "Chef d'equipe ou renonciation obligatoire avant les officiels.");
  }

  const personIds = Array.from(new Set((Array.isArray(request.data?.officialPersonIds) ? request.data.officialPersonIds : [])
    .map((id) => cleanText(id).slice(0, 80))
    .filter(Boolean)))
    .slice(0, 80);
  const personRefs = personIds.map((id) => admin.firestore().collection("engagementClubPeople").doc(id));
  const personDocs = personRefs.length ? await admin.firestore().getAll(...personRefs) : [];
  const officials = personDocs.map((doc) => {
    if (!doc.exists) {
      throw new HttpsError("invalid-argument", "Officiel inconnu dans la base club.");
    }
    const person = engagementClubPersonItem(doc);
    if (person.clubId !== context.clubId || !person.active || person.roles.official !== true) {
      throw new HttpsError("permission-denied", "Officiel hors perimetre club ou inactif.");
    }
    return {
      personId: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      licenseNumber: person.licenseNumber
    };
  });

  const now = new Date().toISOString();
  await entryRef.set({
    officials,
    updatedAt: now,
    updatedBy: context.uid
  }, { merge: true });
  await writeAuditLog("engagementClubEntry.officialsSaved", context.uid, {
    competitionId,
    clubId: context.clubId,
    officialCount: officials.length
  });
  const updated = await entryRef.get();
  return {
    ok: true,
    entry: engagementClubEntryItem(updated)
  };
});

exports.listEngagementClubSwimmers = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementClubAccessContext(request);
  const db = admin.firestore();
  const limit = Math.min(800, Math.max(50, Math.trunc(Number(request.data?.limit) || 400)));
  const forceRebuild = request.data?.forceRoster === true;
  const rosterSnapshot = forceRebuild ? null : await engagementClubRosterRef(db, context.clubId).get();
  const rosterReady = rosterSnapshot?.exists && cleanText(rosterSnapshot.data()?.generatedAt);
  let rosterGenerated = false;
  const swimmers = rosterReady
    ? sortEngagementClubSwimmers(uniqueEngagementClubSwimmers(engagementClubRosterSwimmersFromData(rosterSnapshot.data() || {}), limit))
    : await rebuildEngagementClubRoster(db, context, limit).then((items) => {
      rosterGenerated = true;
      return items;
    });
  return {
    ok: true,
    clubId: context.clubId,
    rosterGenerated,
    swimmers
  };
});

exports.previewEngagementClubSwimmerCreation = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementClubAccessContext(request);
  const swimmer = cleanEngagementNewSwimmer(request.data?.swimmer || {}, context);
  const alerts = await buildEngagementNewSwimmerAlerts(swimmer, context);
  return {
    ok: true,
    swimmer,
    alerts,
    requiresConfirmation: alerts.length > 0
  };
});

exports.createEngagementClubSwimmer = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementClubAccessContext(request);
  const swimmer = cleanEngagementNewSwimmer(request.data?.swimmer || {}, context);
  const db = admin.firestore();
  const now = new Date().toISOString();
  const docId = stableHash([
    context.clubId,
    swimmer.identityKey || swimmer.name,
    swimmer.licenseNumber
  ].join("|")).slice(0, 40);
  const ref = db.collection("engagementClubSwimmers").doc(docId);
  const snapshot = await ref.get();
  if (snapshot.exists && cleanText(snapshot.data()?.clubId) !== context.clubId) {
    throw new HttpsError("permission-denied", "Nageur hors perimetre club.");
  }
  const alerts = await buildEngagementNewSwimmerAlerts(swimmer, context);
  const confirmAlerts = request.data?.confirmAlerts === true;
  if (alerts.length && !confirmAlerts) {
    throw new HttpsError("failed-precondition", "Confirmation obligatoire avant creation du nageur.", {
      alerts,
      requiresConfirmation: true
    });
  }
  const season = currentEngagementSeasonInfo(new Date(now));
  const payload = {
    ...swimmer,
    alerts,
    alertCount: alerts.length,
    alertValidationStatus: alerts.length ? "validated-by-club" : "",
    alertValidatedAt: alerts.length ? now : "",
    alertValidatedBy: alerts.length ? context.uid : "",
    seasonStartYear: season.startYear,
    seasonLabel: season.label,
    updatedAt: now,
    updatedBy: context.uid,
    ...(snapshot.exists ? {} : { createdAt: now, createdBy: context.uid })
  };
  const batch = db.batch();
  batch.set(ref, payload, { merge: true });
  const licenseRef = db.collection("engagementSwimmerLicenses").doc(engagementSwimmerLicenseId({ ...swimmer, swimmerIndexId: docId }));
  const licensePayload = {
    ...engagementSwimmerLicensePayload({ ...swimmer, swimmerIndexId: docId }, context, {
      competitionId: cleanText(request.data?.competitionId).slice(0, 128),
      collectedAt: now
    }),
    updatedAt: now,
    updatedBy: context.uid
  };
  batch.set(licenseRef, licensePayload, { merge: true });
  upsertEngagementClubRosterSwimmer(batch, db, { ...payload, id: docId, swimmerIndexId: docId, source: "engagement" }, now);
  alerts.forEach((alert, index) => {
    const alertRef = db.collection("engagementSwimmerAlerts").doc(stableHash(`${docId}|${alert.type}|${alert.swimmerIndexId || index}`).slice(0, 40));
    batch.set(alertRef, {
      ...alert,
      status: "validated-by-club",
      newSwimmerId: docId,
      clubId: context.clubId,
      clubName: context.clubName,
      regionId: context.regionId,
      seasonStartYear: season.startYear,
      seasonLabel: season.label,
      validatedAt: now,
      validatedBy: context.uid,
      createdAt: now,
      createdBy: context.uid
    }, { merge: true });
  });
  await batch.commit();
  await writeAuditLog("engagementClubSwimmer.created", context.uid, {
    swimmerId: docId,
    clubId: context.clubId,
    alertCount: alerts.length,
    alertTypes: Array.from(new Set(alerts.map((alert) => cleanText(alert.type)).filter(Boolean))),
    seasonStartYear: season.startYear,
    seasonLabel: season.label
  });
  const updated = await ref.get();
  return {
    ok: true,
    swimmer: engagementNewSwimmerItem(updated),
    alerts
  };
});

exports.listEngagementNationalClubSwimmers = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  if (!context.national) {
    throw new HttpsError("permission-denied", "Lecture reservee au niveau national.");
  }
  const limit = Math.min(200, Math.max(20, Math.trunc(Number(request.data?.limit) || 80)));
  const snapshot = await admin.firestore()
    .collection("engagementClubSwimmers")
    .orderBy("updatedAt", "desc")
    .limit(limit)
    .get();
  return {
    ok: true,
    swimmers: snapshot.docs.map(engagementNewSwimmerItem)
  };
});

exports.setEngagementNationalClubSwimmerStatus = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  if (!context.national) {
    throw new HttpsError("permission-denied", "Action reservee au niveau national.");
  }
  const swimmerId = cleanText(request.data?.swimmerId).slice(0, 80);
  if (!swimmerId) {
    throw new HttpsError("invalid-argument", "Nageur requis.");
  }
  const active = request.data?.active === true;
  const ref = admin.firestore().collection("engagementClubSwimmers").doc(swimmerId);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Nageur introuvable.");
  }
  const now = new Date().toISOString();
  await ref.set({
    active,
    updatedAt: now,
    updatedBy: context.uid,
    ...(active ? { reactivatedAt: now, reactivatedBy: context.uid } : { disabledAt: now, disabledBy: context.uid })
  }, { merge: true });
  await writeAuditLog("engagementClubSwimmer.statusChanged", context.uid, {
    swimmerId,
    clubId: cleanText(snapshot.data()?.clubId).slice(0, 40),
    active
  });
  const updated = await ref.get();
  return {
    ok: true,
    swimmer: engagementNewSwimmerItem(updated)
  };
});

exports.deleteEngagementNationalClubSwimmer = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  if (!context.national) {
    throw new HttpsError("permission-denied", "Suppression reservee au niveau national.");
  }
  const swimmerId = cleanText(request.data?.swimmerId).slice(0, 80);
  if (!swimmerId) {
    throw new HttpsError("invalid-argument", "Nageur requis.");
  }
  if (request.data?.confirmPermanent !== true) {
    throw new HttpsError("failed-precondition", "Confirmation de suppression definitive requise.");
  }
  const db = admin.firestore();
  const ref = db.collection("engagementClubSwimmers").doc(swimmerId);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Nageur introuvable.");
  }
  const data = snapshot.data() || {};
  const alertsSnapshot = await db.collection("engagementSwimmerAlerts")
    .where("newSwimmerId", "==", swimmerId)
    .limit(100)
    .get();
  const batch = db.batch();
  batch.delete(ref);
  batch.delete(db.collection("engagementSwimmerLicenses").doc(stableHash(swimmerId).slice(0, 40)));
  deleteEngagementClubRosterSwimmer(batch, db, { ...data, id: swimmerId, swimmerIndexId: swimmerId, source: "engagement" });
  alertsSnapshot.docs.forEach((alertDoc) => batch.delete(alertDoc.ref));
  await batch.commit();
  await writeAuditLog("engagementClubSwimmer.deleted", context.uid, {
    swimmerId,
    clubId: cleanText(data.clubId).slice(0, 40),
    alertDocsDeleted: alertsSnapshot.size
  });
  return {
    ok: true,
    swimmerId,
    alertDocsDeleted: alertsSnapshot.size
  };
});

async function buildEngagementClubSwimmersFromRequest(requestData = {}, context = {}, competitionData = {}) {
  const competitionEvents = cleanEngagementCompetitionEvents(competitionData.events || [], { strict: false });
  const competitionTimeRules = {
    date: cleanIsoDate(competitionData.date),
    poolLength: cleanEngagementPoolLength(competitionData.poolLength),
    timingType: cleanEngagementTimingType(competitionData.timingType),
    qualificationTimesMode: cleanEngagementQualificationTimesMode(competitionData.qualificationTimesMode),
    qualificationStartDate: cleanIsoDate(competitionData.qualificationStartDate),
    qualificationEndDate: cleanIsoDate(competitionData.qualificationEndDate),
    missingEntryTimeMode: cleanEngagementMissingEntryTimeMode(competitionData.missingEntryTimeMode)
  };
  const allowedIndividualEventCodes = new Set(
    competitionEvents.filter((event) => event.type === "individual").map((event) => event.code)
  );
  const maxEventsPerSwimmer = cleanEngagementMaxEventsPerSwimmer(competitionData.maxEventsPerSwimmer);
  const requestedSwimmers = Array.isArray(requestData?.swimmers) ? requestData.swimmers : [];
  const uniqueSwimmers = [];
  const seen = new Set();
  requestedSwimmers.slice(0, 300).forEach((rawSwimmer) => {
    const swimmerIndexId = cleanText(rawSwimmer?.swimmerIndexId).slice(0, 80);
    const requestedSource = cleanText(rawSwimmer?.source);
    const source = requestedSource === "engagement"
      ? "engagement"
      : requestedSource === "reference"
        ? "reference"
        : "performances";
    const licenseNumber = cleanText(rawSwimmer?.licenseNumber).slice(0, 60);
    const individualEntries = cleanEngagementEntryIndividualEntries(
      rawSwimmer?.individualEntries || rawSwimmer?.individualEventCodes || [],
      allowedIndividualEventCodes
    );
    if (!swimmerIndexId || seen.has(swimmerIndexId)) return;
    const requestedIndividualCodes = Array.isArray(rawSwimmer?.individualEventCodes)
      ? rawSwimmer.individualEventCodes.map((code) => cleanText(code).toUpperCase().replace(/\s+/g, "")).filter(Boolean)
      : (Array.isArray(rawSwimmer?.individualEntries) ? rawSwimmer.individualEntries.map((entry) => cleanText(entry?.eventCode || entry?.code).toUpperCase().replace(/\s+/g, "")).filter(Boolean) : []);
    if (requestedIndividualCodes.some((code) => !allowedIndividualEventCodes.has(code))) {
      throw new HttpsError("invalid-argument", "Course individuelle non ouverte sur cette competition.");
    }
    if (maxEventsPerSwimmer > 0 && individualEntries.length > maxEventsPerSwimmer) {
      throw new HttpsError("failed-precondition", `Maximum ${maxEventsPerSwimmer} course(s) individuelle(s) par nageur.`);
    }
    seen.add(swimmerIndexId);
    uniqueSwimmers.push({ swimmerIndexId, source, licenseNumber, individualEntries });
  });

  const db = admin.firestore();
  const knownLicenses = await engagementLegacySwimmerLicensesByClub(db, context.clubId);

  const referenceSwimmersById = new Map();
  intranapSwimmersIndex.forEach((item) => {
    const swimmer = engagementReferenceSwimmerItem(item);
    [
      item.id,
      item.swimmerId,
      ...(Array.isArray(item.aliases) ? item.aliases : []),
      ...(Array.isArray(item.sourceIds) ? item.sourceIds : [])
    ].map(cleanText).filter(Boolean).forEach((id) => referenceSwimmersById.set(id, swimmer));
  });
  const firestoreSwimmers = uniqueSwimmers.filter((swimmer) => swimmer.source !== "reference");
  const firestoreRefs = firestoreSwimmers.map((swimmer) => db
    .collection(swimmer.source === "engagement" ? "engagementClubSwimmers" : PERFORMANCE_SWIMMERS_COLLECTION)
    .doc(swimmer.swimmerIndexId));
  const firestoreDocs = firestoreRefs.length ? await db.getAll(...firestoreRefs) : [];
  const firestoreDocsByRequestedId = new Map();
  firestoreDocs.forEach((doc, index) => {
    const requestedSwimmer = firestoreSwimmers[index];
    if (!requestedSwimmer) return;
    firestoreDocsByRequestedId.set(`${requestedSwimmer.source}:${requestedSwimmer.swimmerIndexId}`, doc);
  });

  let swimmers = await Promise.all(uniqueSwimmers.map(async (requestedSwimmer) => {
    let swimmer = null;
    if (requestedSwimmer.source === "reference") {
      swimmer = referenceSwimmersById.get(requestedSwimmer.swimmerIndexId) || null;
    } else {
      const doc = firestoreDocsByRequestedId.get(`${requestedSwimmer.source}:${requestedSwimmer.swimmerIndexId}`);
      if (doc?.exists) {
        swimmer = requestedSwimmer.source === "engagement"
          ? engagementNewSwimmerItem(doc)
          : engagementClubSwimmerItem(doc);
      }
    }
    if (!swimmer) {
      throw new HttpsError("invalid-argument", "Nageur inconnu dans la base LivePalmes.");
    }
    if (requestedSwimmer.source === "engagement" && swimmer.active === false) {
      throw new HttpsError("failed-precondition", "Nageur desactive par le niveau national.");
    }
    if (swimmer.clubId !== context.clubId) {
      throw new HttpsError("permission-denied", "Nageur hors perimetre club.");
    }
    const knownLicense = knownLicenses.get(swimmer.swimmerIndexId) || knownLicenses.get(requestedSwimmer.swimmerIndexId);
    const storedLicenseNumber = cleanText(knownLicense?.licenseNumber || swimmer.licenseNumber).slice(0, 60);
    if (storedLicenseNumber && requestedSwimmer.licenseNumber && storedLicenseNumber !== requestedSwimmer.licenseNumber) {
      throw new HttpsError("failed-precondition", "Le numero de licence deja enregistre ne peut pas etre modifie par le club.");
    }
    const licenseNumber = storedLicenseNumber || requestedSwimmer.licenseNumber;
    if (ENGAGEMENT_REQUIRE_ENTRY_SWIMMER_LICENSE && !licenseNumber) {
      throw new HttpsError("invalid-argument", "Numero de licence obligatoire pour chaque nageur.");
    }
    const licenseVerificationStatus = storedLicenseNumber
      ? cleanEngagementLicenseVerificationStatus(knownLicense?.verificationStatus || swimmer.licenseVerificationStatus, "pending")
      : "pending";
    const licenseSeason = storedLicenseNumber && knownLicense
      ? engagementLicenseSeasonState(knownLicense)
      : engagementLicenseSeasonState(swimmer);
    const individualEntries = await resolveEngagementIndividualEntriesForSwimmer(
      { ...swimmer, source: requestedSwimmer.source },
      requestedSwimmer.individualEntries,
      competitionTimeRules
    );
    return cleanEngagementEntrySwimmer({
      ...swimmer,
      swimmerIndexId: swimmer.id,
      source: requestedSwimmer.source,
      licenseNumber,
      licenseVerificationStatus,
      licenseSeasonLabel: licenseSeason.label,
      licenseSeasonStatus: licenseSeason.status,
      licenseLocked: Boolean(storedLicenseNumber),
      individualEntries
    });
  }));
  if (swimmers.some((swimmer) => swimmer.individualEntries.length)) {
    const recordsData = await loadPerformanceRecordsData();
    swimmers = validateEngagementIndividualEntryTimes(swimmers, competitionTimeRules, recordsData);
  }
  return swimmers;
}

function engagementEntryTimeStats(swimmers = []) {
  return swimmers.reduce((stats, swimmer) => {
    (Array.isArray(swimmer.individualEntries) ? swimmer.individualEntries : []).forEach((entry) => {
      stats.total += 1;
      const mode = cleanText(entry.entryTimeMode) || "missing";
      stats[mode] = (stats[mode] || 0) + 1;
      if (entry.entryTimeWarning) stats.warning += 1;
    });
    return stats;
  }, {
    total: 0,
    known: 0,
    manual: 0,
    default595999: 0,
    missing: 0,
    warning: 0
  });
}

exports.previewEngagementClubEntryTimes = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementClubAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }
  const competition = await admin.firestore().collection("engagementCompetitions").doc(competitionId).get();
  if (!competition.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  const entryRef = admin.firestore().collection("engagementClubEntries").doc(engagementClubEntryId(competitionId, context.clubId));
  const entry = await entryRef.get();
  if (!entry.exists || !engagementTeamLeaderComplete(entry.data()?.teamLeader || {})) {
    throw new HttpsError("failed-precondition", "Chef d'equipe ou renonciation obligatoire avant les courses.");
  }
  const swimmers = await buildEngagementClubSwimmersFromRequest(request.data || {}, context, competition.data() || {});
  return {
    ok: true,
    swimmers,
    stats: engagementEntryTimeStats(swimmers)
  };
});

exports.saveEngagementClubSwimmers = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementClubAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }
  const competition = await admin.firestore().collection("engagementCompetitions").doc(competitionId).get();
  if (!competition.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  assertEngagementClubWriteOpen(competition.data() || {});
  const entryRef = admin.firestore().collection("engagementClubEntries").doc(engagementClubEntryId(competitionId, context.clubId));
  const entry = await entryRef.get();
  if (!entry.exists || !engagementTeamLeaderComplete(entry.data()?.teamLeader || {})) {
    throw new HttpsError("failed-precondition", "Chef d'equipe ou renonciation obligatoire avant les nageurs.");
  }

  const competitionData = competition.data() || {};
  const swimmers = await buildEngagementClubSwimmersFromRequest(request.data || {}, context, competitionData);

  const now = new Date().toISOString();
  const batch = admin.firestore().batch();
  batch.set(entryRef, {
    swimmers,
    updatedAt: now,
    updatedBy: context.uid
  }, { merge: true });
  swimmers.forEach((swimmer) => {
    if (!swimmer.licenseNumber) return;
    if (!swimmer.licenseLocked && swimmer.source !== "reference") {
      const swimmerCollection = swimmer.source === "engagement" ? "engagementClubSwimmers" : PERFORMANCE_SWIMMERS_COLLECTION;
      const swimmerRef = admin.firestore().collection(swimmerCollection).doc(swimmer.swimmerIndexId);
      batch.set(swimmerRef, {
        licenseNumber: cleanText(swimmer.licenseNumber).slice(0, 60),
        licenseVerificationStatus: cleanEngagementLicenseVerificationStatus(swimmer.licenseVerificationStatus, "pending"),
        licenseSeasonLabel: cleanText(swimmer.licenseSeasonLabel).slice(0, 20),
        licenseSeasonStatus: cleanEngagementLicenseSeasonStatus(swimmer.licenseSeasonStatus, "to_check"),
        licenseUpdatedAt: now,
        licenseUpdatedBy: context.uid,
        updatedAt: now,
        updatedBy: context.uid
      }, { merge: true });
    }
    if (!swimmer.licenseLocked) {
      const licenseRef = admin.firestore().collection("engagementSwimmerLicenses").doc(engagementSwimmerLicenseId(swimmer));
      const licensePayload = {
        ...engagementSwimmerLicensePayload(swimmer, context, {
          type: "engagement",
          verificationSource: "club",
          competitionId,
          collectedAt: now
        }),
        updatedAt: now,
        updatedBy: context.uid
      };
      batch.set(licenseRef, licensePayload, { merge: true });
    }
    upsertEngagementClubRosterSwimmer(batch, admin.firestore(), swimmer, now);
  });
  await batch.commit();
  await writeAuditLog("engagementClubEntry.swimmersSaved", context.uid, {
    competitionId,
    clubId: context.clubId,
    swimmerCount: swimmers.length
  });
  const updated = await entryRef.get();
  return {
    ok: true,
    entry: engagementClubEntryItem(updated)
  };
});

exports.saveEngagementClubRelays = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementClubAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }
  const competition = await admin.firestore().collection("engagementCompetitions").doc(competitionId).get();
  if (!competition.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  assertEngagementClubWriteOpen(competition.data() || {});
  const entryRef = admin.firestore().collection("engagementClubEntries").doc(engagementClubEntryId(competitionId, context.clubId));
  const entry = await entryRef.get();
  if (!entry.exists || !engagementTeamLeaderComplete(entry.data()?.teamLeader || {})) {
    throw new HttpsError("failed-precondition", "Chef d'equipe ou renonciation obligatoire avant les relais.");
  }
  const entryData = entry.data() || {};
  const swimmers = (Array.isArray(entryData.swimmers) ? entryData.swimmers : [])
    .map(cleanEngagementEntrySwimmer)
    .filter((swimmer) => swimmer.swimmerIndexId);
  const competitionData = competition.data() || {};
  const events = cleanEngagementCompetitionEvents(competitionData.events || [], { strict: false });
  let relays = cleanEngagementEntryRelays(request.data?.relays || [], {
    date: cleanIsoDate(competitionData.date),
    events
  }, swimmers);
  if (relays.length) {
    const recordsData = await loadPerformanceRecordsData();
    relays = validateEngagementRelayEntryTimes(relays, {
      date: cleanIsoDate(competitionData.date),
      poolLength: cleanEngagementPoolLength(competitionData.poolLength),
      timingType: cleanEngagementTimingType(competitionData.timingType)
    }, recordsData);
  }
  const now = new Date().toISOString();
  await entryRef.set({
    relays,
    updatedAt: now,
    updatedBy: context.uid
  }, { merge: true });
  await writeAuditLog("engagementClubEntry.relaysSaved", context.uid, {
    competitionId,
    clubId: context.clubId,
    relayCount: relays.length
  });
  const updated = await entryRef.get();
  return {
    ok: true,
    entry: engagementClubEntryItem(updated)
  };
});

exports.createEngagementCompetition = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  const competition = cleanEngagementCompetitionPayload(request.data || {}, context);
  const now = new Date().toISOString();
  const docRef = admin.firestore().collection("engagementCompetitions").doc();
  const payload = {
    ...competition,
    createdAt: now,
    createdBy: context.uid,
    updatedAt: now,
    updatedBy: context.uid
  };
  await docRef.set(payload);
  await writeAuditLog("engagementCompetition.created", context.uid, {
    competitionId: docRef.id,
    name: payload.name,
    date: payload.date,
    regionId: payload.regionId,
    level: payload.level,
    entryStatus: payload.entryStatus
  });
  return {
    ok: true,
    competition: engagementCompetitionListItem({
      id: docRef.id,
      data: () => payload
    })
  };
});

exports.updateEngagementCompetition = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }
  const docRef = admin.firestore().collection("engagementCompetitions").doc(competitionId);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  assertCanManageEngagementCompetition(context, snapshot.data() || {});
  const competition = cleanEngagementCompetitionPayload(request.data || {}, context);
  assertCanManageEngagementCompetition(context, competition);
  const now = new Date().toISOString();
  const payload = {
    ...competition,
    updatedAt: now,
    updatedBy: context.uid
  };
  await docRef.set(payload, { merge: true });
  await writeAuditLog("engagementCompetition.updated", context.uid, {
    competitionId,
    name: payload.name,
    date: payload.date,
    regionId: payload.regionId,
    level: payload.level,
    entryStatus: payload.entryStatus
  });
  const updated = await docRef.get();
  return {
    ok: true,
    competition: engagementCompetitionDetailItem(updated)
  };
});

exports.deleteEngagementCompetition = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  if (!context.national) {
    throw new HttpsError("permission-denied", "Suppression reservee au niveau national.");
  }
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }

  const db = admin.firestore();
  const docRef = db.collection("engagementCompetitions").doc(competitionId);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }

  const competition = snapshot.data() || {};
  const now = new Date().toISOString();
  const deletionRequestRef = db.collection("engagementCompetitionDeletionRequests").doc(competitionId);
  const deletionRequest = await deletionRequestRef.get();
  const batch = db.batch();
  batch.delete(docRef);
  if (deletionRequest.exists) {
    batch.set(deletionRequestRef, {
      status: "approved",
      approvedAt: now,
      approvedBy: context.uid,
      approvedByEmail: context.email || "",
      updatedAt: now,
      updatedBy: context.uid
    }, { merge: true });
  }
  await batch.commit();
  await writeAuditLog("engagementCompetition.deleted", context.uid, {
    competitionId,
    name: competition.name || "",
    date: competition.date || "",
    regionId: competition.regionId || "",
    level: competition.level || ""
  });
  return {
    ok: true,
    deleted: true,
    competitionId
  };
});

exports.requestEngagementCompetitionDeletion = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  if (context.national) {
    throw new HttpsError("failed-precondition", "Un niveau national peut supprimer directement la competition.");
  }
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }

  const db = admin.firestore();
  const docRef = db.collection("engagementCompetitions").doc(competitionId);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }

  const competition = snapshot.data() || {};
  assertCanManageEngagementCompetition(context, competition);

  const now = new Date().toISOString();
  const payload = {
    competitionId,
    competitionName: competition.name || "",
    competitionDate: competition.date || "",
    competitionLevel: competition.level || "",
    regionId: competition.regionId || "",
    status: "pending",
    requestedAt: now,
    requestedBy: context.uid,
    requestedByEmail: context.email || "",
    updatedAt: now,
    updatedBy: context.uid
  };
  await db.collection("engagementCompetitionDeletionRequests").doc(competitionId).set(payload, { merge: true });
  await writeAuditLog("engagementCompetition.deletionRequested", context.uid, {
    competitionId,
    name: payload.competitionName,
    date: payload.competitionDate,
    regionId: payload.regionId,
    level: payload.competitionLevel
  });
  return {
    ok: true,
    requested: true,
    requestId: competitionId
  };
});

exports.listEngagementCompetitionDeletionRequests = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  if (!context.national) {
    throw new HttpsError("permission-denied", "Lecture reservee au niveau national.");
  }
  const status = ["pending", "approved", "rejected"].includes(cleanText(request.data?.status))
    ? cleanText(request.data.status)
    : "pending";
  const limit = Math.min(100, Math.max(10, Math.trunc(Number(request.data?.limit) || 50)));
  const snapshot = await admin.firestore()
    .collection("engagementCompetitionDeletionRequests")
    .where("status", "==", status)
    .limit(limit)
    .get();

  const requests = snapshot.docs
    .map((doc) => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        competitionId: cleanText(data.competitionId),
        competitionName: cleanText(data.competitionName),
        competitionDate: cleanText(data.competitionDate),
        competitionLevel: cleanText(data.competitionLevel),
        regionId: cleanText(data.regionId),
        status: cleanText(data.status),
        requestedAt: cleanText(data.requestedAt),
        requestedBy: cleanText(data.requestedBy),
        requestedByEmail: cleanText(data.requestedByEmail)
      };
    })
    .sort((left, right) => String(right.requestedAt || "").localeCompare(String(left.requestedAt || "")));

  return {
    ok: true,
    status,
    requests
  };
});

exports.resolveEngagementCompetitionDeletionRequest = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  if (!context.national) {
    throw new HttpsError("permission-denied", "Validation reservee au niveau national.");
  }
  const requestId = cleanText(request.data?.requestId).slice(0, 128);
  const decision = cleanText(request.data?.decision);
  if (!requestId) {
    throw new HttpsError("invalid-argument", "Demande requise.");
  }
  if (!["approved", "rejected"].includes(decision)) {
    throw new HttpsError("invalid-argument", "Decision invalide.");
  }

  const db = admin.firestore();
  const requestRef = db.collection("engagementCompetitionDeletionRequests").doc(requestId);
  const requestSnapshot = await requestRef.get();
  if (!requestSnapshot.exists) {
    throw new HttpsError("not-found", "Demande de suppression introuvable.");
  }
  const deletionRequest = requestSnapshot.data() || {};
  if (deletionRequest.status && deletionRequest.status !== "pending") {
    throw new HttpsError("failed-precondition", "Demande deja traitee.");
  }

  const competitionId = cleanText(deletionRequest.competitionId || requestId).slice(0, 128);
  const competitionRef = db.collection("engagementCompetitions").doc(competitionId);
  const competitionSnapshot = await competitionRef.get();
  const competition = competitionSnapshot.exists ? competitionSnapshot.data() || {} : {};
  const now = new Date().toISOString();
  const batch = db.batch();
  if (decision === "approved" && competitionSnapshot.exists) {
    batch.delete(competitionRef);
  }
  batch.set(requestRef, {
    status: decision,
    decidedAt: now,
    decidedBy: context.uid,
    decidedByEmail: context.email || "",
    updatedAt: now,
    updatedBy: context.uid
  }, { merge: true });
  await batch.commit();

  await writeAuditLog("engagementCompetition.deletionRequestResolved", context.uid, {
    requestId,
    decision,
    competitionId,
    name: competition.name || deletionRequest.competitionName || "",
    date: competition.date || deletionRequest.competitionDate || "",
    regionId: competition.regionId || deletionRequest.regionId || "",
    level: competition.level || deletionRequest.competitionLevel || ""
  });
  return {
    ok: true,
    decision,
    competitionDeleted: decision === "approved" && competitionSnapshot.exists
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
