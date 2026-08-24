const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { FieldPath, FieldValue, getFirestore, Timestamp } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
const { HttpsError, onCall } = require("firebase-functions/v2/https");
const { onDocumentCreated, onDocumentUpdated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const {
  PERFORMANCE_PUBLICATION_LEASE_MS,
  PERFORMANCE_PUBLICATION_MAX_ATTEMPTS,
  canClaimPerformancePublicationJob,
  performancePublicationFailureStatus,
  publicPerformancePublicationJob
} = require("./performance-publication-jobs");
const { defineBoolean, defineSecret } = require("firebase-functions/params");
const { consoleRoleClaims, hasConsolePortalCapability } = require("./console-access");
const clubReference = require("./assets/club-reference.json");
const intranapSwimmersReference = require("./intranap-swimmers-reference.json");
const intranapSwimmersIndex = require("./assets/intranap-swimmers-index.json");
const { nextPublicResultsIndex } = require("./public-results-index");
const {
  decodePdfDataUrl,
  publicPdfStoragePath,
  publicStorageUrl
} = require("./public-pdf-storage");
const {
  publicRecordsManifest,
  publicRecordsPayload,
  shouldPublishRecordsManifest
} = require("./public-records-data");
const { nextPortalAccessRateLimit } = require("./portal-access-protection");
const {
  engagementAccessAcknowledgement,
  engagementAccessRejection,
  engagementExistingAccountNotice,
  engagementAccessAdminNotification,
  engagementAccessAdminNotificationRecipients
} = require("./portal-access-mail");
const { engagementSwimmerChangeResolutionMail } = require("./engagement-swimmer-change-mail");
const { escapeMailHtml, livePalmesMailHtml } = require("./livepalmes-mail-html");
const { cleanClubPayload } = require("./engagement-clubs");
const {
  findReferenceSwimmerCorrectionTarget,
  swimmerMergeIds,
  recoveredPerformanceRowsAreComplete
} = require("./engagement-swimmer-corrections");
const { buildWinPalmeCompetitionTxt } = require("./winpalme-export");
const {
  MAX_COMPETITION_DOCUMENTS,
  cleanCompetitionDocumentInput,
  cleanCompetitionDocuments,
  competitionDocumentDownloadUrl,
  competitionDocumentTokenFromUrl,
  competitionDocumentStoragePath,
  decodeCompetitionDocumentDataUrl
} = require("./engagement-competition-documents");
const {
  applyCompetitionImportTiming,
  cleanTimingType,
  ffessmBasTimingType,
  performanceImportChrono
} = require("./performance-import-timing");
const {
  canResumeImportPublication,
  deactivatedImportPerformanceRows,
  hydratePublicSwimmerRowsFromPayload,
  importPublicationError,
  importPublicationResultStatus,
  importPublicationStatus,
  PUBLIC_PERFORMANCE_SWIMMER_ROW_SCHEMA_VERSION,
  publicPerformanceSwimmerStorageRow,
  publicSwimmerPayloadSupportsTopRebuild
} = require("./performance-import-publication");
const {
  PUBLIC_CALENDAR_EVENT_TYPES,
  PUBLIC_CALENDAR_GENERIC_EVENT_TYPES,
  cleanPublicCalendarEventType,
  cleanPublicCalendarLevel,
  cleanPublicCalendarProgram,
  cleanPublicCalendarPublicationStatus,
  cleanPublicCalendarUrl,
  publicCalendarDetail,
  publicCalendarSummary
} = require("./public-calendar");

initializeApp();
const auth = getAuth();
const db = getFirestore();
const storage = getStorage();
db.settings({ ignoreUndefinedProperties: true });

const REGION = "europe-west1";
const LIVEPALMES_SMTP_HOST = defineSecret("LIVEPALMES_SMTP_HOST");
const LIVEPALMES_SMTP_PORT = defineSecret("LIVEPALMES_SMTP_PORT");
const LIVEPALMES_SMTP_USER = defineSecret("LIVEPALMES_SMTP_USER");
const LIVEPALMES_SMTP_PASS = defineSecret("LIVEPALMES_SMTP_PASS");
const LIVEPALMES_SMTP_SECURE = defineSecret("LIVEPALMES_SMTP_SECURE");
const LIVEPALMES_MAIL_FROM = defineSecret("LIVEPALMES_MAIL_FROM");
const LIVEPALMES_NOTIFICATION_LINK_SECRET = defineSecret("LIVEPALMES_NOTIFICATION_LINK_SECRET");
const LIVEPALMES_ENFORCE_APP_CHECK = defineBoolean("LIVEPALMES_ENFORCE_APP_CHECK", { default: false });
const ENGAGEMENT_MAIL_SECRETS = [
  LIVEPALMES_SMTP_HOST,
  LIVEPALMES_SMTP_PORT,
  LIVEPALMES_SMTP_USER,
  LIVEPALMES_SMTP_PASS,
  LIVEPALMES_SMTP_SECURE,
  LIVEPALMES_MAIL_FROM
];
const ENGAGEMENT_NOTIFICATION_MAIL_SECRETS = [
  ...ENGAGEMENT_MAIL_SECRETS,
  LIVEPALMES_NOTIFICATION_LINK_SECRET
];
const COMPETITION_IDS = new Set(["livepalmes-active", "livepalmes-test"]);
const ADMIN_UIDS = new Set(["AgvWJjvLOfe3uB0lz0Xr3wwJxzT2"]);
const FUNCTIONS_EMULATOR_ACTIVE = process.env.FUNCTIONS_EMULATOR === "true";
const ROLES = ["live", "speaker", "referee", "video", "computer", "secretary"];
const ROLE_SET = new Set(ROLES);
const ENGAGEMENT_COMPETITION_LEVELS = new Set(["departemental", "regional", "national", "international"]);
const ENGAGEMENT_ENTRY_STATUSES = new Set(["upcoming", "open", "closed"]);
const ENGAGEMENT_COMPETITION_TYPES = new Set(["pool", "openWater"]);
const ENGAGEMENT_WATER_BODY_TYPES = new Set(["sea", "lake", "river", "other"]);
const ENGAGEMENT_POOL_LENGTHS = new Set(["25", "33", "50"]);
const ENGAGEMENT_TIMING_TYPES = new Set(["manual", "electronic"]);
const ENGAGEMENT_QUALIFICATION_TIME_MODES = new Set(["all", "period"]);
const ENGAGEMENT_MISSING_ENTRY_TIME_MODES = new Set(["manual", "forbidden", "default595999", "none"]);
const ENGAGEMENT_REQUIRE_ENTRY_SWIMMER_LICENSE = false;
const ENGAGEMENT_SWIMMER_LICENSE_PATTERN = /^[A-Z]-\d{2}-\d+$/;
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
  "engagements.club.switch",
  "engagements.region.manage",
  "engagements.national.manage"
];
const ACCESS_CAPABILITY_SET = new Set(ACCESS_CAPABILITIES);
const ENGAGEMENT_MAIL_CAPABILITIES = [
  "engagements.club.manage",
  "engagements.region.manage",
  "engagements.national.manage"
];
const OPTIONAL_COMPETITION_MAIL_TYPES = new Set([
  "competition_documents",
  "opening_notification",
  "club_recap_pdf"
]);
const HASH_ITERATIONS = 120000;
const HASH_BYTES = 32;
const CALLABLE_OPTIONS = { region: REGION, invoker: "public" };
const ENGAGEMENT_MAIL_CALLABLE_OPTIONS = { ...CALLABLE_OPTIONS, secrets: ENGAGEMENT_NOTIFICATION_MAIL_SECRETS, timeoutSeconds: 300 };
const NOTIFICATION_PREFERENCE_CALLABLE_OPTIONS = { ...CALLABLE_OPTIONS, secrets: [LIVEPALMES_NOTIFICATION_LINK_SECRET] };
const ENGAGEMENT_DOCUMENT_UPLOAD_OPTIONS = { ...CALLABLE_OPTIONS, timeoutSeconds: 120, memory: "512MiB" };
const ENGAGEMENT_SWIMMER_CORRECTION_OPTIONS = { ...CALLABLE_OPTIONS, timeoutSeconds: 540, memory: "1GiB" };
const ENGAGEMENT_SWIMMER_CORRECTION_MAIL_OPTIONS = {
  ...ENGAGEMENT_SWIMMER_CORRECTION_OPTIONS,
  secrets: ENGAGEMENT_MAIL_SECRETS
};
const PORTAL_ACCESS_REQUEST_OPTIONS = {
  ...CALLABLE_OPTIONS,
  secrets: ENGAGEMENT_MAIL_SECRETS,
  timeoutSeconds: 30,
  // Active uniquement apres observation des metriques App Check en production.
  enforceAppCheck: LIVEPALMES_ENFORCE_APP_CHECK
};
const ENGAGEMENT_CLOSURE_SCHEDULER_OPTIONS = {
  region: REGION,
  schedule: "*/5 * * * *",
  timeZone: "Europe/Paris",
  timeoutSeconds: 540,
  memory: "1GiB",
  secrets: ENGAGEMENT_NOTIFICATION_MAIL_SECRETS
};
const MIGRATION_CALLABLE_OPTIONS = { region: REGION, invoker: "public", timeoutSeconds: 540, memory: "1GiB" };
const PUBLIC_PERFORMANCE_CALLABLE_OPTIONS = { region: REGION, invoker: "public", timeoutSeconds: 120, memory: "1GiB" };
const PERFORMANCE_PUBLICATION_JOB_OPTIONS = {
  region: REGION,
  document: "performancePublicationJobs/{jobId}",
  retry: true,
  timeoutSeconds: 540,
  memory: "1GiB"
};
const PERFORMANCE_PUBLICATION_SCHEDULER_OPTIONS = {
  region: REGION,
  schedule: "*/5 * * * *",
  timeZone: "Europe/Paris",
  timeoutSeconds: 540,
  memory: "1GiB"
};
const COMPETITION_IMPORT_CALLABLE_OPTIONS = { ...PUBLIC_PERFORMANCE_CALLABLE_OPTIONS };
const PUBLIC_RESULT_TRIGGER_OPTIONS = {
  region: REGION,
  document: "competitions/{competitionId}/results/{resultId}",
  retry: true
};
const PIN_MAX_FAILED_ATTEMPTS = 5;
const PIN_LOCK_MS_BY_LEVEL = [2 * 60 * 1000, 5 * 60 * 1000];
const AUDIT_LEGACY_VISIBLE_SINCE = "2026-08-12T00:00:00.000Z";
const AUDIT_PAGE_LIMIT = 50;
const AUDIT_ACTOR_RESOLUTION_LIMIT = 25;
const AUDIT_COMPETITION_RESOLUTION_LIMIT = 25;
const AUDIT_PERSON_RESOLUTION_LIMIT = 25;
const PUBLIC_PERFORMANCE_BUCKET = "livepalmes-public-data-718081132564";
const LIVEPALMES_STORAGE_BUCKET = "livepalmes.firebasestorage.app";
const ENGAGEMENT_CLOSURE_BATCH_LIMIT = 5;
const PUBLIC_ADDITIONAL_PERFORMANCE_PATH = "performance-public/additional-data.json";
const PUBLIC_ADDITIONAL_PERFORMANCE_TOKEN = "4a78ebdf-07b8-4f05-8d8c-0c6231a7ad5d";
const PUBLIC_PERFORMANCE_FILES_PATH = "performance-public-firestore";
const PUBLIC_COMPETITION_PDF_PREFIX = "competition-pdfs";
const PUBLIC_CALENDAR_FILES_PATH = "calendar";
const PUBLIC_CALENDAR_MAX_BYTES = 900000;
const ENGAGEMENT_PDF_LOGO_PATH = path.join(__dirname, "assets", "logo-ffessm-nage-avec-palmes.png");
const PUBLIC_PERFORMANCE_TOP_PREVIEW_LIMIT = 100;
const MAX_COMPETITION_IMPORT_PERFORMANCES = 5000;
const PERFORMANCE_BASE_COLLECTION = "performances";
const PERFORMANCE_BASE_CHANGES_COLLECTION = "performanceChanges";
const PERFORMANCE_BASE_MIGRATION_COLLECTION = "performanceMigrationJobs";
const PERFORMANCE_PUBLICATION_JOBS_COLLECTION = "performancePublicationJobs";
const PERFORMANCE_SWIMMERS_COLLECTION = "performanceSwimmerIndex";
const PERFORMANCE_SWIMMER_PAGES_COLLECTION = "performanceSwimmerPages";
const PERFORMANCE_SWIMMER_INDEX_STATE_COLLECTION = "performanceSwimmerIndexState";
const PERFORMANCE_TOP_BUCKETS_COLLECTION = "performanceTopViews";
const PERFORMANCE_TOP_INDEX_STATE_COLLECTION = "performanceTopIndexState";
const ENGAGEMENT_CLUB_ROSTERS_COLLECTION = "engagementClubRosters";
const ENGAGEMENT_CLUBS_COLLECTION = "engagementClubs";
const ENGAGEMENT_PUBLIC_DIRECTORIES_COLLECTION = "engagementPublicDirectories";
const ENGAGEMENT_COMPETITION_CALENDARS_COLLECTION = "engagementCompetitionCalendars";
const ENGAGEMENT_CALENDAR_EVENTS_COLLECTION = "engagementCalendarEvents";
const ENGAGEMENT_CALENDAR_EVENT_CALENDARS_COLLECTION = "engagementCalendarEventCalendars";
const ENGAGEMENT_CONFIGURATION_COLLECTION = "engagementConfigurations";
const ENGAGEMENT_COMPETITION_ENTRY_SUMMARIES_COLLECTION = "engagementCompetitionEntrySummaries";
const ENGAGEMENT_CLUB_COMPETITION_INDEXES_COLLECTION = "engagementClubCompetitionIndexes";
const ENGAGEMENT_COMPETITION_STATISTICS_CACHE_COLLECTION = "engagementCompetitionStatisticsCache";
const ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION = "engagementClubPeopleRosters";
const ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION = "engagementSwimmerLicenseNumbers";
const ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION = "engagementSwimmerChangeRequests";
const ENGAGEMENT_ENTRY_TIME_CACHES_COLLECTION = "engagementEntryTimeCaches";
const ENGAGEMENT_ENTRY_TIME_CACHE_VERSION = 3;
const ENGAGEMENT_DOCUMENTS_STORAGE_PREFIX = "entry-documents";
const ENGAGEMENT_COMPETITION_DOCUMENTS_STORAGE_PREFIX = "competition-documents";
const ENGAGEMENT_MAIL_JOBS_COLLECTION = "engagementMailJobs";
const ENGAGEMENT_MAIL_RECIPIENT_SHARDS_COLLECTION = "engagementMailRecipientShards";
const ENGAGEMENT_MAIL_RECIPIENT_INDEX_STATE_COLLECTION = "engagementMailRecipientIndexState";
const ENGAGEMENT_CLUB_ADMIN_DIRECTORY_COLLECTION = "engagementClubAdminDirectories";
const ACCESS_DIRECTORY_INDEX_STATE_COLLECTION = "accessDirectoryIndexState";
const ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT = 32;
const ENGAGEMENT_MAIL_RECIPIENT_BOOTSTRAP_LIMIT = 167;
const ENGAGEMENT_CLUB_ADMIN_DIRECTORY_MAX_BYTES = 800000;
const ENGAGEMENT_CLOSURE_QUEUE_COLLECTION = "engagementClosureQueue";
const ENGAGEMENT_OPEN_WATER_COURSE_CONFIG_ID = "open-water-courses";
const ENGAGEMENT_OPEN_WATER_COURSE_LIMIT = 100;
const ENGAGEMENT_OPEN_WATER_COURSE_DISCIPLINES = new Set(["SF", "BI", "SUP"]);
const ENGAGEMENT_OPEN_WATER_DEFAULT_COURSES = [
  { id: "150-elimination-SF", distance: 150, discipline: "SF", label: "150 m élimination Surface", format: "elimination", active: true },
  { id: "150-elimination-BI", distance: 150, discipline: "BI", label: "150 m élimination Bi-palmes", format: "elimination", active: true },
  { id: "1000-SF", distance: 1000, discipline: "SF", label: "1000 m Surface", format: "standard", active: true },
  { id: "1000-BI", distance: 1000, discipline: "BI", label: "1000 m Bi-palmes", format: "standard", active: true },
  { id: "1000-SUP", distance: 1000, discipline: "SUP", label: "1000 m Support", format: "standard", active: true },
  { id: "3000-SF", distance: 3000, discipline: "SF", label: "3000 m Surface", format: "standard", active: true },
  { id: "3000-BI", distance: 3000, discipline: "BI", label: "3000 m Bi-palmes", format: "standard", active: true },
  { id: "3000-SUP", distance: 3000, discipline: "SUP", label: "3000 m Support", format: "standard", active: true },
  { id: "5000-SF", distance: 5000, discipline: "SF", label: "5000 m Surface", format: "standard", active: true },
  { id: "5000-BI", distance: 5000, discipline: "BI", label: "5000 m Bi-palmes", format: "standard", active: true },
  { id: "5000-SUP", distance: 5000, discipline: "SUP", label: "5000 m Support", format: "standard", active: true }
];
const PERFORMANCE_TOP_INDEX_LIMIT = 500;
const DTN_QUALIFICATION_CACHE_COLLECTION = "dtnQualificationViews";
const DTN_QUALIFICATION_CACHE_STATE_COLLECTION = "dtnQualificationViewState";
const DTN_QUALIFICATION_JOBS_COLLECTION = "dtnQualificationJobs";
const DTN_QUALIFICATION_CACHE_VERSION = 4;
const DTN_LISTING_CACHE_VERSION = 3;
const DTN_QUALIFICATION_MAX_ROWS_PER_COURSE = 5000;
const DTN_QUALIFICATION_JOB_OPTIONS = {
  region: REGION,
  document: `${DTN_QUALIFICATION_JOBS_COLLECTION}/{jobId}`,
  timeoutSeconds: 540,
  memory: "1GiB"
};
const PORTAL_ACCESS_RATE_LIMIT_COLLECTION = "portalAccessRequestRateLimits";
const DTN_EDF_LIMOGES_COMPETITION_ID = "e40fe3129ffd5d76286774193a2855ed";
const DTN_EDF_COMPETITION_IDS_BY_SEASON = {
  2026: ["5039", "4978", "4979", DTN_EDF_LIMOGES_COMPETITION_ID]
};
const DTN_LISTING_SEASON_YEARS = new Set([2026]);
const PERFORMANCE_SWIMMER_PAGE_SIZE = 500;
const ENGAGEMENT_SWIMMER_CORRECTION_MAX_PERFORMANCE_ROWS = 5000;
const ENGAGEMENT_SWIMMER_CORRECTION_ENTRY_PAGE_SIZE = 250;
const ENGAGEMENT_ENTRY_TIME_SOURCE_KEY_LIMIT = 3;
const PERFORMANCE_PUBLIC_DATA_URL = "https://livepalmes.web.app/performances/public/data";
const PERFORMANCE_BASE_MIGRATION_BATCH_SIZE = 2000;
const POOL_COURSES = ["50SF", "100SF", "200SF", "400SF", "800SF", "1500SF", "50AP", "100IS", "200IS", "400IS", "50BI", "100BI", "200BI", "400BI"];

function portalReadStats(callable, startedAt, options = {}) {
  const stats = {
    baseDocuments: Math.max(0, Math.trunc(Number(options.baseDocuments) || 0)),
    variableDocumentsMax: Math.max(0, Math.trunc(Number(options.variableDocumentsMax) || 0)),
    cacheHit: typeof options.cacheHit === "boolean" ? options.cacheHit : null,
    durationMs: Math.max(0, Date.now() - startedAt)
  };
  console.info("livepalmes.portal.reads", { callable, ...stats });
  return stats;
}
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
  ["4X100SB", "4 x 100 m Surface/Bi-palmes mixte", "4 x 100 SB", "SB", 100, 4, "required"],
  ["OW4X1000SB", "4 x 1000 m Surface/Bi-palmes mixte", "4 x 1000 SB", "SB", 1000, 4, "required"]
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
const ENGAGEMENT_PROGRAM_PHASES = new Set(["direct", "heats", "final", "slowHeats", "fastHeat"]);

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

function competitionEmailNotificationsEnabled(value = {}) {
  return value?.emailPreferences?.competitionNotifications !== false && value?.competitionNotificationsEnabled !== false;
}

function notificationPreferenceSecretValue() {
  try {
    return String(LIVEPALMES_NOTIFICATION_LINK_SECRET.value() || process.env.LIVEPALMES_NOTIFICATION_LINK_SECRET || "");
  } catch (_) {
    return String(process.env.LIVEPALMES_NOTIFICATION_LINK_SECRET || "");
  }
}

function competitionNotificationPreferenceToken(uid = "") {
  const cleanUid = cleanText(uid).slice(0, 128);
  const secret = notificationPreferenceSecretValue();
  if (!cleanUid || !secret) return "";
  return crypto.createHmac("sha256", secret)
    .update(`competition-notifications|${cleanUid}`)
    .digest("base64url");
}

function validCompetitionNotificationPreferenceToken(uid = "", token = "") {
  const expected = competitionNotificationPreferenceToken(uid);
  const provided = cleanText(token);
  if (!expected || !provided || expected.length !== provided.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

function competitionNotificationPreferenceUrl(uid = "") {
  const token = competitionNotificationPreferenceToken(uid);
  if (!token) return "";
  return `https://livepalmes.web.app/notifications.html?uid=${encodeURIComponent(cleanText(uid))}&token=${encodeURIComponent(token)}`;
}

const CLUB_REFERENCE_BY_ID = new Map((Array.isArray(clubReference.clubs) ? clubReference.clubs : [])
  .map((club) => [cleanText(club?.[0]), {
    clubId: cleanText(club?.[0]),
    clubCode: cleanText(club?.[1]),
    clubName: cleanText(club?.[2]),
    regionId: cleanText(club?.[3]).slice(0, 80),
    federalNumber: cleanText(club?.[4]).slice(0, 24),
    city: cleanText(club?.[5]).slice(0, 100),
    postalCode: cleanText(club?.[6]).slice(0, 16),
    active: club?.[7] !== false,
    source: "intranap"
  }])
  .filter(([clubId]) => clubId));

const CLUB_REFERENCE_BY_FEDERAL_NUMBER = new Map(Array.from(CLUB_REFERENCE_BY_ID.values())
  .filter((club) => club.federalNumber)
  .map((club) => [club.federalNumber.toUpperCase(), club]));

const CLUB_REFERENCE_REGION_LABELS = {
  "1": "Grand Est",
  "2": "Nouvelle Aquitaine",
  "3": "Ile de France",
  "6": "Bretagne Pays de la Loire",
  "8": "Centre",
  "9": "Guadeloupe",
  "10": "Pyrénées Méditerranée Occitanie",
  "11": "Martinique Guyane",
  "12": "Corse",
  "13": "Hauts de France",
  "15": "Normandie",
  "16": "Sud",
  "17": "Auvergne Rhône Alpes",
  "18": "Réunion",
  "22": "Bourgogne Franche Comté"
};

function engagementClubRegionId(club = {}, fallback = "") {
  return CLUB_REFERENCE_REGION_LABELS[cleanText(club.regionId)] || cleanText(fallback).slice(0, 80);
}

function engagementClubCode(clubId, fallback = "") {
  return CLUB_REFERENCE_BY_ID.get(cleanText(clubId))?.clubCode || cleanText(fallback);
}

function engagementClubName(clubId, fallback = "") {
  return CLUB_REFERENCE_BY_ID.get(cleanText(clubId))?.clubName || cleanText(fallback);
}

function engagementStoredClubItem(doc) {
  const data = doc?.data ? doc.data() || {} : doc || {};
  return cleanFirestoreValue({
    id: cleanText(doc?.id || data.id || data.clubId).slice(0, 40),
    clubId: cleanText(data.clubId || doc?.id).slice(0, 40),
    clubCode: cleanText(data.clubCode).slice(0, 40),
    clubName: cleanText(data.clubName).slice(0, 140),
    regionId: cleanText(data.regionId).slice(0, 80),
    federalNumber: cleanText(data.federalNumber).slice(0, 24),
    city: cleanText(data.city).slice(0, 100),
    postalCode: cleanText(data.postalCode).slice(0, 16),
    active: data.active !== false,
    deleted: data.deleted === true,
    source: cleanText(data.source || "national").slice(0, 40),
    createdAt: cleanText(data.createdAt).slice(0, 40),
    createdBy: cleanText(data.createdBy).slice(0, 128),
    updatedAt: cleanText(data.updatedAt).slice(0, 40),
    updatedBy: cleanText(data.updatedBy).slice(0, 128)
  });
}

function publicEngagementClubItem(club = {}) {
  return cleanFirestoreValue({
    clubId: cleanText(club.clubId || club.id).slice(0, 40),
    clubCode: cleanText(club.clubCode).slice(0, 40),
    clubName: cleanText(club.clubName).slice(0, 140),
    regionId: cleanText(club.regionId).slice(0, 80),
    federalNumber: cleanText(club.federalNumber).slice(0, 24),
    city: cleanText(club.city).slice(0, 100),
    postalCode: cleanText(club.postalCode).slice(0, 16),
    active: club.active !== false,
    source: cleanText(club.source || "national").slice(0, 40)
  });
}

function publicEngagementClubDirectoryRef() {
  return db.collection(ENGAGEMENT_PUBLIC_DIRECTORIES_COLLECTION).doc("clubs");
}

async function engagementClubsByIds(clubIds = []) {
  const ids = Array.from(new Set(clubIds.map((clubId) => cleanText(clubId).slice(0, 40)).filter(Boolean)));
  const byId = new Map(ids.map((clubId) => [clubId, CLUB_REFERENCE_BY_ID.get(clubId) || { clubId }]));
  if (!ids.length) return byId;
  const snapshots = await db.getAll(...ids.map((clubId) => db.collection(ENGAGEMENT_CLUBS_COLLECTION).doc(clubId)));
  snapshots.filter((snapshot) => snapshot.exists).forEach((snapshot) => {
    const stored = engagementStoredClubItem(snapshot);
    byId.set(stored.clubId, { ...(byId.get(stored.clubId) || {}), ...stored });
  });
  return byId;
}

async function engagementClubById(clubId) {
  return (await engagementClubsByIds([clubId])).get(cleanText(clubId)) || null;
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

  const snapshot = await db.collection("users").doc(uid).get();
  const data = snapshot.exists ? snapshot.data() || {} : {};
  const activeCapabilities = activeCapabilitiesFromMap(data.capabilities || {});
  if (!snapshot.exists || data.status !== "active" || !activeCapabilities.length) {
    throw new HttpsError("permission-denied", "Acces LivePalmes requis.");
  }
}

function normalizeEmail(value) {
  return cleanText(value).toLowerCase();
}

function normalizedEngagementRegionKey(value) {
  const cleanValue = cleanText(value);
  return cleanText(CLUB_REFERENCE_REGION_LABELS[cleanValue] || cleanValue)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "")
    .toLocaleLowerCase("fr");
}

function engagementRegionsMatch(left, right) {
  const leftKey = normalizedEngagementRegionKey(left);
  return Boolean(leftKey && leftKey === normalizedEngagementRegionKey(right));
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
  if (capabilities.includes("engagements.club.switch") && !capabilities.includes("engagements.club.manage")) {
    throw new HttpsError("invalid-argument", "Le droit de changement de club requiert le droit engagements club.");
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

function accessDirectoryKeys(profile = {}, status = profile.status || "active") {
  const cleanStatus = status === "inactive" ? "inactive" : "active";
  const capabilities = Array.isArray(profile.capabilities)
    ? profile.capabilities
    : activeCapabilitiesFromMap(profile.capabilities || {});
  const regionId = cleanText(profile.regionId).slice(0, 80);
  const keys = new Set(["all", `status:${cleanStatus}`]);
  capabilities.forEach((capability) => {
    keys.add(`capability:${capability}`);
    keys.add(`status:${cleanStatus}|capability:${capability}`);
  });
  if (regionId && capabilities.includes("engagements.region.manage")) {
    keys.add(`region:${regionId}`);
    keys.add(`region:${regionId}|status:${cleanStatus}`);
    capabilities.forEach((capability) => {
      keys.add(`region:${regionId}|capability:${capability}`);
      keys.add(`region:${regionId}|status:${cleanStatus}|capability:${capability}`);
    });
  }
  return [...keys];
}

function accessDirectoryFilterKey(context = {}, status = "", capability = "") {
  return [
    !context.national && context.regionId ? `region:${context.regionId}` : "",
    status ? `status:${status}` : "",
    capability ? `capability:${capability}` : ""
  ].filter(Boolean).join("|") || "all";
}

function accessDirectoryIndexStateRef() {
  return db.collection(ACCESS_DIRECTORY_INDEX_STATE_COLLECTION).doc("default");
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
  if (ADMIN_UIDS.has(uid) || FUNCTIONS_EMULATOR_ACTIVE) {
    return {
      uid,
      email: cleanText(request.auth?.token?.email).slice(0, 180),
      national: true,
      region: true,
      regionId: "",
      competitionNotificationsEnabled: true
    };
  }
  const snapshot = await db.collection("users").doc(uid).get();
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
    regionId: regionScope.scopeId || cleanText(data.regionId).slice(0, 80),
    competitionNotificationsEnabled: competitionEmailNotificationsEnabled(data)
  };
}

async function accessManagementContext(request) {
  const uid = request.auth?.uid || "";
  if (!uid) {
    throw new HttpsError("unauthenticated", "Connexion Firebase requise.");
  }
  const tokenCapabilities = request.auth?.token?.livepalmesCapabilities || {};
  if (ADMIN_UIDS.has(uid) || FUNCTIONS_EMULATOR_ACTIVE || tokenCapabilities["admin.full"] === true) {
    return {
      uid,
      email: cleanText(request.auth?.token?.email).slice(0, 180),
      adminFull: true,
      national: true,
      region: true,
      regionId: ""
    };
  }
  const snapshot = await db.collection("users").doc(uid).get();
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

async function auditManagementContext(request) {
  const uid = request.auth?.uid || "";
  if (!uid) {
    throw new HttpsError("unauthenticated", "Connexion Firebase requise.");
  }
  const tokenCapabilities = request.auth?.token?.livepalmesCapabilities || {};
  if (ADMIN_UIDS.has(uid) || FUNCTIONS_EMULATOR_ACTIVE || tokenCapabilities["admin.full"] === true) {
    return { uid, adminFull: true, profileReadCount: 0 };
  }
  const snapshot = await db.collection("users").doc(uid).get();
  const data = snapshot.exists ? snapshot.data() || {} : {};
  if (!snapshot.exists || data.status !== "active" || data.capabilities?.["admin.full"] !== true) {
    throw new HttpsError("permission-denied", "Journal reserve a la gestion generale.");
  }
  return { uid, adminFull: true, profileReadCount: 1 };
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
  const snapshot = await db.collection("users").doc(uid).get();
  const data = snapshot.exists ? snapshot.data() || {} : {};
  if (!snapshot.exists || data.status !== "active") {
    throw new HttpsError("permission-denied", "Acces LivePalmes desactive.");
  }
  const capabilities = ADMIN_UIDS.has(uid)
    ? capabilitiesMap(ACCESS_CAPABILITIES)
    : (data.capabilities || request.auth?.token?.livepalmesCapabilities || {});
  if (capabilities["engagements.club.manage"] !== true) {
    throw new HttpsError("permission-denied", "Droit engagements club requis.");
  }
  const accessScopes = data.accessScopes || {};
  const clubScope = normalizedAccessScope(accessScopes["engagements.club.manage"]);
  const homeClubId = cleanText(clubScope.scopeId || data.clubId).slice(0, 40);
  if (!homeClubId) {
    throw new HttpsError("failed-precondition", "Numero de club requis pour les engagements club.");
  }
  const requestedClubId = cleanText(request.data?.activeClubId).slice(0, 40);
  const isSwitchingClub = Boolean(requestedClubId && requestedClubId !== homeClubId);
  if (isSwitchingClub && capabilities["engagements.club.switch"] !== true) {
    throw new HttpsError("permission-denied", "Droit de changement de club requis.");
  }
  const activeClub = isSwitchingClub ? await engagementClubById(requestedClubId) : null;
  if (isSwitchingClub && (!activeClub || !CLUB_REFERENCE_REGION_LABELS[activeClub.regionId])) {
    throw new HttpsError("invalid-argument", "Club actif inconnu.");
  }
  const clubId = activeClub?.clubId || homeClubId;
  return {
    uid,
    email: cleanText(request.auth?.token?.email || data.email).slice(0, 180),
    firstName: cleanText(data.firstName || request.auth?.token?.given_name).slice(0, 80),
    lastName: cleanText(data.lastName || request.auth?.token?.family_name).slice(0, 80),
    clubId,
    clubName: activeClub?.clubName || cleanText(data.clubName).slice(0, 140),
    regionId: activeClub ? engagementClubRegionId(activeClub, data.regionId) : cleanText(data.regionId).slice(0, 80),
    homeClubId,
    switchedClub: isSwitchingClub
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

  const snapshot = await db.collection("users").doc(uid).get();
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
  const snapshot = await db.collection("users").doc(cleanUid).get().catch(() => null);
  const data = snapshot?.exists ? snapshot.data() || {} : {};
  return displayNameFromProfile(data) || cleanText(fallbackToken.name);
}

async function userByEmailOrCreate(profile) {
  const displayName = displayNameFromProfile(profile);
  if (profile.uid) {
    const existing = await auth.getUser(profile.uid);
    await auth.updateUser(existing.uid, { email: profile.email, displayName, disabled: false });
    return { user: { ...existing, email: profile.email, displayName }, created: false };
  }
  try {
    const existing = await auth.getUserByEmail(profile.email);
    await auth.updateUser(existing.uid, { displayName, disabled: false });
    return { user: existing, created: false };
  } catch (error) {
    if (error?.code !== "auth/user-not-found") throw error;
    const user = await auth.createUser({
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

  await auth.setCustomUserClaims(user.uid, {
    ...(user.customClaims || {}),
    livepalmesAccess: true,
    livepalmesConsoleAccess: hasConsolePortalCapability(capabilityMap),
    livepalmesCapabilities: capabilityMap
  });

  const userRef = db.collection("users").doc(user.uid);
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
    accessDirectoryKeys: accessDirectoryKeys({ ...profile, capabilities: profile.capabilities }, "active"),
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
  await db.collection("auditLogs").add({
    action,
    actorUid,
    target,
    createdAt: now
  });
}

async function writeAuditLogOnce(action, actorUid, target = {}, eventId = "") {
  const now = new Date().toISOString();
  const auditId = stableHash([action, eventId || now].join("|")).slice(0, 40);
  await db.collection("auditLogs").doc(auditId).set({
    action,
    actorUid,
    target,
    createdAt: now
  }, { merge: false });
}

async function writeAccessGrants(uid, email, capabilities, status, actorUid, now, accessScopes = {}) {
  const batch = db.batch();
  ACCESS_CAPABILITIES.forEach((capability) => {
    const grantRef = db.collection("accessGrants").doc(`${uid}_${capability.replace(".", "_")}`);
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
  const snapshot = await db
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
  return db
    .collection("competitions")
    .doc(competitionId)
    .collection("liveData")
    .doc("current");
}

function rolePinsRef(competitionId) {
  return db
    .collection("competitions")
    .doc(competitionId)
    .collection("secrets")
    .doc("rolePins");
}

function pinAttemptRef(competitionId, role, uid, clientId) {
  const key = stableHash(`${competitionId}|${role}|${uid}|${cleanText(clientId)}`);
  return db
    .collection("competitions")
    .doc(competitionId)
    .collection("security")
    .doc("pinAttempts")
    .collection("items")
    .doc(key);
}

function consoleGrantRef(competitionId, uid) {
  return db
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
  await db.runTransaction(async (transaction) => {
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
  await db.runTransaction(async (transaction) => {
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
  const snapshot = await db.collection("users").doc(uid).get();
  const data = snapshot.exists ? snapshot.data() || {} : {};
  if (!snapshot.exists || data.status !== "active" || !hasConsolePortalCapability(data.capabilities || {})) {
    throw new HttpsError("permission-denied", "Acces aux consoles LivePalmes inactif.");
  }
}

async function assertComputerPdfAccess(request, competitionId) {
  const uid = cleanText(request.auth?.uid);
  if (!uid) throw new HttpsError("unauthenticated", "Connexion Firebase requise.");
  const token = request.auth?.token || {};
  const capabilities = token.livepalmesCapabilities || {};
  if (ADMIN_UIDS.has(uid) || capabilities["admin.full"] === true) return;
  if (
    token.livepalmesAccess !== true
    || token.livepalmesConsoleAccess !== true
    || token.livepalmesConsole !== true
    || token.livepalmesRole !== "computer"
    || token.livepalmesCompetition !== competitionId
  ) {
    throw new HttpsError("permission-denied", "Acces bureau des performances requis.");
  }
  const grantSnapshot = await consoleGrantRef(competitionId, uid).get();
  const grant = grantSnapshot.exists ? grantSnapshot.data() || {} : {};
  const expiresAtMs = typeof grant.expiresAt?.toMillis === "function"
    ? grant.expiresAt.toMillis()
    : Date.parse(grant.expiresAt || "");
  if (
    !grantSnapshot.exists
    || grant.role !== "computer"
    || grant.competitionId !== competitionId
    || !Number.isFinite(expiresAtMs)
    || expiresAtMs <= Date.now()
  ) {
    throw new HttpsError("permission-denied", "Autorisation bureau des performances expiree.");
  }
}

exports.storeCompetitionPdf = onCall(CALLABLE_OPTIONS, async (request) => {
  const competitionId = competitionIdFrom(request.data || {});
  await assertComputerPdfAccess(request, competitionId);
  const kind = cleanText(request.data?.kind);
  const id = cleanText(request.data?.id).slice(0, 180);
  const pdfName = cleanText(request.data?.pdfName).slice(0, 220) || "document.pdf";
  if (!id) throw new HttpsError("invalid-argument", "Identifiant PDF requis.");
  let buffer;
  let storagePath;
  try {
    buffer = decodePdfDataUrl(request.data?.pdfDataUrl);
    storagePath = publicPdfStoragePath({ competitionId, kind, id, buffer });
  } catch (error) {
    throw new HttpsError("invalid-argument", error?.message || "PDF invalide.");
  }
  const bucket = storage.bucket(PUBLIC_PERFORMANCE_BUCKET);
  await bucket.file(storagePath).save(buffer, {
    resumable: false,
    contentType: "application/pdf",
    metadata: {
      cacheControl: "public, max-age=31536000, immutable",
      contentDisposition: `inline; filename="${pdfName.replace(/["\r\n]/g, "_")}"`
    }
  });
  return {
    ok: true,
    id,
    kind,
    pdfName,
    pdfSize: buffer.length,
    storagePath,
    pdfUrl: publicStorageUrl(PUBLIC_PERFORMANCE_BUCKET, storagePath)
  };
});

exports.deleteCompetitionPdf = onCall(CALLABLE_OPTIONS, async (request) => {
  const competitionId = competitionIdFrom(request.data || {});
  await assertComputerPdfAccess(request, competitionId);
  const storagePath = cleanText(request.data?.storagePath).slice(0, 600);
  const expectedPrefix = `${PUBLIC_COMPETITION_PDF_PREFIX}/${competitionId}/`;
  if (!storagePath.startsWith(expectedPrefix) || storagePath.includes("..")) {
    throw new HttpsError("invalid-argument", "Chemin PDF invalide.");
  }
  await storage.bucket(PUBLIC_PERFORMANCE_BUCKET).file(storagePath).delete({ ignoreNotFound: true });
  return { ok: true, storagePath };
});

exports.syncOfficialResultToPublicIndex = onDocumentUpdated(PUBLIC_RESULT_TRIGGER_OPTIONS, async (event) => {
  const competitionId = cleanText(event.params?.competitionId);
  const resultId = cleanText(event.params?.resultId);
  if (!COMPETITION_IDS.has(competitionId) || !resultId || !event.data?.after?.exists) return;
  const officialResult = event.data.after.data() || {};
  const indexRef = db
    .collection("competitions")
    .doc(competitionId)
    .collection("public")
    .doc("resultsIndex");
  await db.runTransaction(async (transaction) => {
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

  await db.runTransaction(async (transaction) => {
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

  await db.runTransaction(async (transaction) => {
    const attemptsRoot = db
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
  const authUser = await auth.getUser(uid);
  await auth.setCustomUserClaims(uid, consoleRoleClaims(
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
    expiresAt: Timestamp.fromMillis(now.getTime() + 12 * 60 * 60 * 1000)
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
  const lastName = cleanText(raw.lastName).toLocaleUpperCase("fr-FR").slice(0, 80);
  const clubRole = cleanText(raw.clubRole).slice(0, 120);
  const clubId = cleanText(raw.clubId).slice(0, 40);
  const clubName = cleanText(raw.clubName).slice(0, 140);
  const regionId = cleanText(raw.regionId).slice(0, 80);
  const licenseNumber = cleanText(raw.licenseNumber).slice(0, 60);
  const message = cleanText(raw.message).slice(0, 600);
  const newClubRequested = raw.newClubRequested === true;
  let newClub = null;
  if (newClubRequested) {
    try {
      newClub = cleanClubPayload({ ...(raw.newClub || {}), regionId, active: true }, {});
    } catch (error) {
      throw new HttpsError("invalid-argument", cleanText(error?.message || error));
    }
    if (!newClub.city || !newClub.postalCode) {
      throw new HttpsError("invalid-argument", "Ville et code postal du nouveau club obligatoires.");
    }
  }
  if (!firstName || !lastName || !regionId || !licenseNumber || (!clubId && !newClubRequested)) {
    throw new HttpsError("invalid-argument", "Nom, prenom, club, region et licence sont obligatoires.");
  }
  return {
    email,
    firstName,
    lastName,
    clubRole,
    clubId: newClubRequested ? "" : clubId,
    clubName: newClubRequested ? "" : clubName,
    regionId,
    licenseNumber,
    message,
    newClubRequested,
    ...(newClub ? { newClub } : {})
  };
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
    newClubRequested: data.newClubRequested === true,
    newClub: data.newClubRequested === true ? {
      clubCode: cleanText(data.newClub?.clubCode).slice(0, 40),
      clubName: cleanText(data.newClub?.clubName).slice(0, 140),
      regionId: cleanText(data.newClub?.regionId || data.regionId).slice(0, 80),
      federalNumber: cleanText(data.newClub?.federalNumber).slice(0, 24),
      city: cleanText(data.newClub?.city).slice(0, 100),
      postalCode: cleanText(data.newClub?.postalCode).slice(0, 16)
    } : null,
    regionId: cleanText(data.regionId).slice(0, 80),
    licenseNumber: cleanText(data.licenseNumber).slice(0, 60),
    message: cleanText(data.message).slice(0, 600),
    status: cleanText(data.status || "pending").slice(0, 40),
    requestedBy: cleanText(data.requestedBy).slice(0, 80),
    requestedByEmail: cleanText(data.requestedByEmail).slice(0, 180),
    requestedAt: cleanText(data.requestedAt).slice(0, 40),
    resolvedAt: cleanText(data.resolvedAt).slice(0, 40),
    resolvedBy: cleanText(data.resolvedBy).slice(0, 80),
    resolvedByEmail: cleanText(data.resolvedByEmail).slice(0, 180),
    resolutionReason: cleanText(data.resolutionReason).slice(0, 600),
    resolutionNotification: data.resolutionNotification && typeof data.resolutionNotification === "object"
      ? data.resolutionNotification
      : null
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

function engagementAccessExistingClubPayload(club = {}) {
  return {
    clubId: cleanText(club.clubId || club.id).slice(0, 40),
    clubName: cleanText(club.clubName).slice(0, 140),
    regionId: engagementClubRegionId(club, club.regionId),
    newClubRequested: false
  };
}

async function findEngagementClubByFederalNumber(federalNumber = "") {
  const cleanNumber = cleanText(federalNumber).toUpperCase().slice(0, 24);
  if (!cleanNumber) return null;
  const referenceClub = CLUB_REFERENCE_BY_FEDERAL_NUMBER.get(cleanNumber);
  if (referenceClub) {
    const overrideSnapshot = await db.collection(ENGAGEMENT_CLUBS_COLLECTION).doc(referenceClub.clubId).get();
    if (!overrideSnapshot.exists) return referenceClub;
    const override = engagementStoredClubItem(overrideSnapshot);
    if (override.deleted === true || override.federalNumber.toUpperCase() !== cleanNumber) return null;
    return { ...referenceClub, ...override };
  }
  const snapshot = await db.collection(ENGAGEMENT_CLUBS_COLLECTION)
    .where("federalNumber", "==", cleanNumber)
    .limit(2)
    .get();
  const storedClub = snapshot.docs.map(engagementStoredClubItem).find((club) => club.deleted !== true);
  return storedClub || null;
}

async function resolveExistingClubForAccessRequest(payload = {}) {
  if (payload.newClubRequested !== true || !payload.newClub?.federalNumber) return payload;
  const existingClub = await findEngagementClubByFederalNumber(payload.newClub.federalNumber);
  return existingClub
    ? { ...payload, ...engagementAccessExistingClubPayload(existingClub), newClub: null }
    : payload;
}

async function createClubFromEngagementAccessRequest(payload = {}, actorUid = "") {
  const existingClub = await findEngagementClubByFederalNumber(payload.newClub?.federalNumber);
  if (existingClub) return { club: existingClub, created: false };
  let cleaned;
  try {
    cleaned = cleanClubPayload({ ...(payload.newClub || {}), regionId: payload.regionId, active: true }, {});
  } catch (error) {
    throw new HttpsError("invalid-argument", cleanText(error?.message || error));
  }
  if (!cleaned.city || !cleaned.postalCode) {
    throw new HttpsError("invalid-argument", "Ville et code postal du nouveau club obligatoires.");
  }
  const clubId = `club-${stableHash(cleaned.federalNumber).slice(0, 16)}`;
  const now = new Date().toISOString();
  const club = {
    ...cleaned,
    clubId,
    createdAt: now,
    createdBy: actorUid,
    updatedAt: now,
    updatedBy: actorUid
  };
  const batch = db.batch();
  batch.create(db.collection(ENGAGEMENT_CLUBS_COLLECTION).doc(clubId), club);
  batch.set(publicEngagementClubDirectoryRef(), {
    clubs: { [clubId]: publicEngagementClubItem(club) },
    updatedAt: now
  }, { merge: true });
  await batch.commit();
  await writeAuditLog("engagementClub.createdFromAccessRequest", actorUid, {
    clubId,
    federalNumber: cleaned.federalNumber,
    clubCode: cleaned.clubCode,
    clubName: cleaned.clubName
  });
  return { club, created: true };
}

async function sendEngagementAccessAcknowledgement(payload = {}) {
  const config = engagementMailSmtpConfig();
  const attemptedAt = new Date().toISOString();
  if (!config.ready) {
    return {
      status: "skipped_missing_config",
      attemptedAt,
      reason: "Configuration SMTP incomplete."
    };
  }
  const mail = engagementAccessAcknowledgement(payload);
  try {
    const transporter = nodemailer.createTransport(config.transport);
    await transporter.sendMail({
      from: `LivePalmes <${config.fromEmail}>`,
      to: payload.email,
      subject: cleanText(mail.subject).slice(0, 220),
      text: mail.text,
      html: livePalmesMailHtml(mail.text)
    });
    return {
      status: "sent",
      attemptedAt,
      sentAt: new Date().toISOString(),
      reason: ""
    };
  } catch (error) {
    console.error(
      "Accuse de reception de demande d'acces impossible.",
      cleanText(error?.code || error?.name || "smtp-error").slice(0, 80)
    );
    return {
      status: "failed",
      attemptedAt,
      reason: "Envoi SMTP impossible."
    };
  }
}

async function sendEngagementAccessRejection(payload = {}) {
  const config = engagementMailSmtpConfig();
  const attemptedAt = new Date().toISOString();
  if (!config.ready) {
    return { status: "skipped_missing_config", attemptedAt, reason: "Configuration SMTP incomplete." };
  }
  const mail = engagementAccessRejection(payload);
  try {
    const transporter = nodemailer.createTransport(config.transport);
    await transporter.sendMail({
      from: `LivePalmes <${config.fromEmail}>`,
      to: payload.email,
      subject: cleanText(mail.subject).slice(0, 220),
      text: mail.text,
      html: livePalmesMailHtml(mail.text)
    });
    return { status: "sent", attemptedAt, sentAt: new Date().toISOString(), reason: "" };
  } catch (error) {
    console.error(
      "Notification de refus de demande d'acces impossible.",
      cleanText(error?.code || error?.name || "smtp-error").slice(0, 80)
    );
    return { status: "failed", attemptedAt, reason: "Envoi SMTP impossible." };
  }
}

async function sendEngagementExistingAccountNotice(payload = {}) {
  const config = engagementMailSmtpConfig();
  const attemptedAt = new Date().toISOString();
  if (!config.ready) {
    return { status: "skipped_missing_config", attemptedAt, reason: "Configuration SMTP incomplete." };
  }
  const mail = engagementExistingAccountNotice(payload);
  try {
    const transporter = nodemailer.createTransport(config.transport);
    await transporter.sendMail({
      from: `LivePalmes <${config.fromEmail}>`,
      to: payload.email,
      subject: cleanText(mail.subject).slice(0, 220),
      text: mail.text,
      html: livePalmesMailHtml(mail.text)
    });
    return { status: "sent", attemptedAt, sentAt: new Date().toISOString(), reason: "" };
  } catch (error) {
    console.error(
      "Notification de compte existant impossible.",
      cleanText(error?.code || error?.name || "smtp-error").slice(0, 80)
    );
    return { status: "failed", attemptedAt, reason: "Envoi SMTP impossible." };
  }
}

async function engagementExistingAccessAccount(email = "") {
  let authUser;
  try {
    authUser = await auth.getUserByEmail(normalizeEmail(email));
  } catch (error) {
    if (error?.code === "auth/user-not-found") return null;
    throw error;
  }
  const snapshot = await db.collection("users").doc(authUser.uid).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data() || {};
  if (!["active", "inactive"].includes(cleanText(data.status))) return null;
  return {
    uid: authUser.uid,
    email: normalizeEmail(authUser.email || email),
    firstName: cleanText(data.firstName).slice(0, 80),
    status: cleanText(data.status),
    clubId: cleanText(data.clubId).slice(0, 40),
    clubCode: engagementClubCode(data.clubId, data.clubCode).slice(0, 40),
    clubName: cleanText(data.clubName).slice(0, 140)
  };
}

async function consumePublicAccessRequestRateLimit(request = {}, now = "") {
  if (cleanText(request.auth?.uid)) return;
  const headers = request.rawRequest?.headers || {};
  const forwardedIp = cleanText(headers["x-forwarded-for"]).split(",")[0].trim();
  const clientIp = forwardedIp || cleanText(request.rawRequest?.ip || request.rawRequest?.socket?.remoteAddress);
  const userAgent = cleanText(headers["user-agent"]).slice(0, 240);
  const rateId = stableHash(`${clientIp || "unknown"}|${userAgent || "unknown"}`).slice(0, 40);
  const rateRef = db.collection(PORTAL_ACCESS_RATE_LIMIT_COLLECTION).doc(rateId);
  await db.runTransaction(async (transaction) => {
    const rateSnapshot = await transaction.get(rateRef);
    const rate = nextPortalAccessRateLimit(rateSnapshot.data() || {}, Date.parse(now));
    if (!rate.allowed) {
      throw new HttpsError("resource-exhausted", "Trop de demandes. Reessayez plus tard.", {
        retryAfterSeconds: Math.ceil(rate.retryAfterMs / 1000)
      });
    }
    transaction.set(rateRef, rate.next, { merge: false });
  });
}

async function sendEngagementAccessAdminNotifications(payload = {}) {
  const attemptedAt = new Date().toISOString();
  const config = engagementMailSmtpConfig();
  if (!config.ready) {
    return {
      status: "skipped_missing_config",
      attemptedAt,
      recipientCount: 0,
      sentCount: 0,
      failedCount: 0,
      reason: "Configuration SMTP incomplete."
    };
  }
  const capabilities = [
    "engagements.region.manage",
    ...(payload.newClubRequested === true ? ["engagements.national.manage"] : [])
  ];
  let recipients;
  try {
    recipients = engagementAccessAdminNotificationRecipients(
      await engagementActiveMailRecipients(db, capabilities),
      payload
    );
  } catch (error) {
    console.error(
      "Lecture des destinataires de demande d'acces impossible.",
      cleanText(error?.code || error?.name || "firestore-error").slice(0, 80)
    );
    return { status: "failed", attemptedAt, recipientCount: 0, sentCount: 0, failedCount: 0, reason: "Destinataires indisponibles." };
  }
  if (!recipients.length) {
    return { status: "skipped_no_recipient", attemptedAt, recipientCount: 0, sentCount: 0, failedCount: 0, reason: "Aucun administrateur destinataire." };
  }
  const transporter = nodemailer.createTransport(config.transport);
  const notificationPayload = {
    ...payload,
    clubCode: engagementClubCode(payload.clubId, payload.clubCode).slice(0, 40),
    clubName: engagementClubName(payload.clubId, payload.clubName).slice(0, 140),
    regionName: CLUB_REFERENCE_REGION_LABELS[cleanText(payload.regionId)] || cleanText(payload.regionId).slice(0, 80)
  };
  let sentCount = 0;
  let failedCount = 0;
  for (let index = 0; index < recipients.length; index += 5) {
    const batch = recipients.slice(index, index + 5);
    const results = await Promise.allSettled(batch.map((recipient) => {
      const mail = engagementAccessAdminNotification({
        ...notificationPayload,
        recipientFirstName: recipient.firstName
      });
      return transporter.sendMail({
        from: `LivePalmes <${config.fromEmail}>`,
        to: recipient.email,
        subject: cleanText(mail.subject).slice(0, 220),
        text: mail.text,
        html: livePalmesMailHtml(mail.text)
      });
    }));
    results.forEach((result) => {
      if (result.status === "fulfilled") sentCount += 1;
      else failedCount += 1;
    });
  }
  if (failedCount) {
    console.error("Certaines notifications administratives de demande d'acces ont echoue.", {
      recipientCount: recipients.length,
      sentCount,
      failedCount
    });
  }
  return {
    status: failedCount ? sentCount ? "partial" : "failed" : "sent",
    attemptedAt,
    ...(sentCount ? { sentAt: new Date().toISOString() } : {}),
    recipientCount: recipients.length,
    sentCount,
    failedCount,
    reason: failedCount ? "Envoi SMTP partiellement ou totalement impossible." : ""
  };
}

exports.submitEngagementAccessRequest = onCall(PORTAL_ACCESS_REQUEST_OPTIONS, async (request) => {
  const uid = cleanText(request.auth?.uid);
  if (cleanText(request.data?.website)) {
    throw new HttpsError("invalid-argument", "Demande invalide.");
  }
  let payload = cleanEngagementAccessRequestPayload(request.data || {}, request);
  payload = await resolveExistingClubForAccessRequest(payload);
  const now = new Date().toISOString();
  await consumePublicAccessRequestRateLimit(request, now);
  const existingAccount = await engagementExistingAccessAccount(payload.email);
  if (existingAccount) {
    const guidanceEmail = await sendEngagementExistingAccountNotice(existingAccount);
    await writeAuditLog("engagementAccessRequest.redirectedExistingAccount", uid || "public-login-page", {
      email: payload.email,
      guidanceEmailStatus: guidanceEmail.status
    });
    return {
      ok: true,
      request: null,
      existingAccount: true,
      guidanceEmailSent: guidanceEmail.status === "sent"
    };
  }
  const requestClubKey = payload.clubId || payload.newClub?.federalNumber || "new-club";
  const requestId = stableHash(`${payload.email}|${requestClubKey}|engagements.club.manage`).slice(0, 40);
  const ref = db.collection("engagementAccessRequests").doc(requestId);
  const savedPayload = {
    ...payload,
    status: "pending",
    requestedBy: uid || "public-login-page",
    requestedByEmail: cleanText(request.auth?.token?.email || payload.email).slice(0, 180),
    requestSource: uid ? "authenticated-portal" : "login-page",
    requestedAt: now,
    updatedAt: now,
    updatedBy: uid || "public-login-page"
  };
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists && snapshot.data()?.status === "pending") {
      throw new HttpsError("already-exists", "Une demande est deja en attente pour cet email et ce club.");
    }
    transaction.set(ref, savedPayload, { merge: true });
  });
  await writeAuditLog("engagementAccessRequest.submitted", uid || "public-login-page", {
    requestId,
    email: payload.email,
    clubId: payload.clubId,
    regionId: payload.regionId
  });
  const acknowledgementEmail = await sendEngagementAccessAcknowledgement(payload);
  const adminNotification = await sendEngagementAccessAdminNotifications(payload);
  await ref.set({
    acknowledgementEmail,
    adminNotification,
    updatedAt: new Date().toISOString()
  }, { merge: true }).catch((error) => {
    console.error(
      "Statut des notifications de demande d'acces non enregistre.",
      cleanText(error?.code || error?.name || "firestore-error").slice(0, 80)
    );
  });
  return {
    ok: true,
    request: engagementAccessRequestItem({ id: requestId, data: () => savedPayload }),
    acknowledgementEmailSent: acknowledgementEmail.status === "sent",
    adminNotificationStatus: adminNotification.status
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
  let requestsQuery = db.collection("engagementAccessRequests").where("status", "==", status);
  if (!context.national) {
    if (!context.regionId) {
      throw new HttpsError("failed-precondition", "Perimetre regional requis.");
    }
    requestsQuery = requestsQuery.where("regionId", "==", context.regionId);
  }
  const snapshot = await requestsQuery.limit(limit).get();
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

exports.resolveEngagementAccessRequest = onCall(PORTAL_ACCESS_REQUEST_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  const requestId = cleanText(request.data?.requestId).slice(0, 80);
  const decision = cleanText(request.data?.decision);
  const resolutionReason = cleanText(request.data?.resolutionReason).slice(0, 600);
  if (!requestId) {
    throw new HttpsError("invalid-argument", "Demande requise.");
  }
  if (!["approved", "rejected"].includes(decision)) {
    throw new HttpsError("invalid-argument", "Decision invalide.");
  }
  if (decision === "rejected" && !resolutionReason) {
    throw new HttpsError("invalid-argument", "Le motif du refus est obligatoire.");
  }
  const ref = db.collection("engagementAccessRequests").doc(requestId);
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
  let clubCreationResult = null;
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
    const existingAccount = await engagementExistingAccessAccount(resolvedData.email);
    if (existingAccount) {
      throw new HttpsError(
        "already-exists",
        "Cette adresse possede deja un compte LivePalmes. Utilisez la gestion des comptes pour modifier son club sans remplacer ses droits."
      );
    }
    if (resolvedData.newClubRequested === true) {
      if (!context.national) {
        throw new HttpsError("permission-denied", "La creation d'un club est reservee au niveau national.");
      }
      clubCreationResult = await createClubFromEngagementAccessRequest(resolvedData, context.uid);
      resolvedData = {
        ...resolvedData,
        ...engagementAccessExistingClubPayload(clubCreationResult.club)
      };
    }
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
      licenseNumber: resolvedData.licenseNumber,
      ...(clubCreationResult ? {
        requestedNewClub: true,
        createdClubId: cleanText(clubCreationResult.club?.clubId).slice(0, 40),
        newClubCreated: clubCreationResult.created === true
      } : {})
    } : {}),
    ...(decision === "rejected" ? { resolutionReason } : {}),
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
    accessUid: accessResult?.uid || "",
    resolutionReason: decision === "rejected" ? resolutionReason : "",
    createdClubId: cleanText(clubCreationResult?.club?.clubId).slice(0, 40)
  });
  let resolutionNotification = null;
  if (decision === "rejected") {
    resolutionNotification = await sendEngagementAccessRejection({ ...data, resolutionReason });
    await ref.set({ resolutionNotification, updatedAt: new Date().toISOString() }, { merge: true }).catch((error) => {
      console.error(
        "Statut de notification du refus non enregistre.",
        cleanText(error?.code || error?.name || "firestore-error").slice(0, 80)
      );
    });
  }
  const updated = await ref.get();
  return {
    ok: true,
    request: engagementAccessRequestItem(updated),
    access: accessResult,
    club: clubCreationResult?.club ? publicEngagementClubItem(clubCreationResult.club) : null,
    resolutionNotification
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

async function searchAccessUserDocuments(search, context, maxScanned = 90) {
  const usersRef = db.collection("users");
  const raw = cleanText(search).slice(0, 80);
  const variantsFor = (value) => {
    const titleCase = value.toLocaleLowerCase("fr").replace(/(^|[\s'-])\p{L}/gu, (letter) => letter.toLocaleUpperCase("fr"));
    return [...new Set([value, titleCase].filter(Boolean))];
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
  const flatSpecs = querySpecs.flatMap(({ field, variants }) => variants.map((variant) => ({ field, variant }))).slice(0, 6);
  const perQueryLimit = Math.max(10, Math.floor(maxScanned / Math.max(1, flatSpecs.length)));
  const snapshots = await Promise.all(flatSpecs.map(({ field, variant }) => {
    let query = usersRef;
    if (!context.national && context.regionId) query = query.where("regionId", "==", context.regionId);
    return query
      .orderBy(field)
      .startAt(variant)
      .endAt(`${variant}\uf8ff`)
      .limit(perQueryLimit)
      .get();
  }));
  const documents = new Map();
  snapshots.forEach((snapshot) => snapshot.docs.forEach((doc) => documents.set(doc.id, doc)));
  const matches = [...documents.values()]
    .filter((doc) => accessUserContainsSearch(doc, raw))
    .sort((left, right) => {
      const leftData = left.data() || {};
      const rightData = right.data() || {};
      return `${leftData.lastName || ""}\u0000${leftData.firstName || ""}\u0000${left.id}`
        .localeCompare(`${rightData.lastName || ""}\u0000${rightData.firstName || ""}\u0000${right.id}`, "fr", { sensitivity: "base" });
    });
  return {
    documents: matches,
    scannedCount: snapshots.reduce((total, snapshot) => total + snapshot.size, 0),
    truncated: snapshots.some((snapshot) => snapshot.size >= perQueryLimit)
  };
}

exports.rebuildAccessDirectoryIndexNextPage = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await accessManagementContext(request);
  if (!context.national) throw new HttpsError("permission-denied", "Reconstruction reservee au niveau national.");
  const pageSize = Math.min(200, Math.max(20, Math.trunc(Number(request.data?.pageSize) || 100)));
  const requestedCursor = cleanText(request.data?.cursor).slice(0, 128);
  const restart = request.data?.restart === true;
  const stateRef = accessDirectoryIndexStateRef();
  const stateSnapshot = requestedCursor ? null : await stateRef.get();
  if (!requestedCursor && !restart && stateSnapshot?.data()?.status === "ready") {
    return { ok: true, processed: 0, cursor: "", completed: true };
  }
  const cursor = requestedCursor || (restart ? "" : cleanText(stateSnapshot?.data()?.cursor).slice(0, 128));
  let query = db.collection("users").orderBy(FieldPath.documentId()).limit(pageSize);
  if (cursor) query = query.startAfter(cursor);
  const snapshot = await query.get();
  const now = new Date().toISOString();
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    const data = doc.data() || {};
    batch.set(doc.ref, {
      accessDirectoryKeys: accessDirectoryKeys(data, data.status),
      accessDirectoryIndexedAt: now
    }, { merge: true });
  });
  const nextCursor = snapshot.docs.at(-1)?.id || cursor;
  const completed = snapshot.size < pageSize;
  batch.set(stateRef, {
    status: completed ? "ready" : "building",
    cursor: completed ? "" : nextCursor,
    indexedCount: restart ? snapshot.size : FieldValue.increment(snapshot.size),
    updatedAt: now,
    ...(completed ? { completedAt: now } : {})
  }, { merge: true });
  await batch.commit();
  return { ok: true, processed: snapshot.size, cursor: completed ? "" : nextCursor, completed };
});

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
    const searchResult = await searchAccessUserDocuments(search, context);
    const matches = searchResult.documents
      .filter((doc) => accessUserMatchesFilters(doc, status, capability))
      .filter((doc) => accessUserVisibleForAccessDirectory(context, doc));
    const page = matches.slice(offset, offset + pageSize);
    return {
      ok: true,
      directoryVersion: 2,
      users: page.map(accessUserListItem),
      nextCursor: offset + pageSize < matches.length ? { offset: offset + pageSize } : null,
      scannedCount: searchResult.scannedCount,
      truncated: searchResult.truncated
    };
  }

  const indexState = await accessDirectoryIndexStateRef().get();
  if (indexState.data()?.status === "ready") {
    const documentId = FieldPath.documentId();
    let query = db.collection("users")
      .where("accessDirectoryKeys", "array-contains", accessDirectoryFilterKey(context, status, capability))
      .orderBy("lastName")
      .orderBy(documentId);
    if (cleanText(cursor.uid) && typeof cursor.lastName === "string") {
      query = query.startAfter(cursor.lastName, cleanText(cursor.uid));
    }
    const snapshot = await query.limit(pageSize + 1).get();
    const page = snapshot.docs.slice(0, pageSize);
    const lastVisible = page.at(-1);
    return {
      ok: true,
      directoryVersion: 3,
      users: page.map(accessUserListItem),
      nextCursor: snapshot.size > pageSize && lastVisible
        ? { lastName: lastVisible.data()?.lastName || "", uid: lastVisible.id }
        : null,
      scannedCount: snapshot.size,
      truncated: false
    };
  }

  const usersRef = db.collection("users");
  const documentId = FieldPath.documentId();
  const matchingDocs = [];
  let queryCursor = cleanText(cursor.uid) && typeof cursor.lastName === "string"
    ? { lastName: cursor.lastName, uid: cleanText(cursor.uid) }
    : null;
  let exhausted = false;
  let scannedCount = 0;
  const maxScanned = 250;

  while (matchingDocs.length <= pageSize && !exhausted && scannedCount < maxScanned) {
    let query = usersRef;
    if (!context.national && context.regionId) query = query.where("regionId", "==", context.regionId);
    query = query.orderBy("lastName").orderBy(documentId);
    if (queryCursor) query = query.startAfter(queryCursor.lastName, queryCursor.uid);
    const batchSize = Math.min(status || capability ? 100 : pageSize + 1, maxScanned - scannedCount);
    const snapshot = await query.limit(batchSize).get();
    if (!snapshot.size) break;
    scannedCount += snapshot.size;
    for (const doc of snapshot.docs) {
      queryCursor = { lastName: doc.data()?.lastName || "", uid: doc.id };
      if (accessUserMatchesFilters(doc, status, capability) && accessUserVisibleForAccessDirectory(context, doc)) matchingDocs.push(doc);
      if (matchingDocs.length > pageSize) break;
    }
    exhausted = snapshot.size < batchSize;
  }

  const page = matchingDocs.slice(0, pageSize);
  const lastVisible = page.at(-1);
  const truncated = !exhausted && scannedCount >= maxScanned;
  const nextCursor = matchingDocs.length > pageSize && lastVisible
    ? { lastName: lastVisible.data()?.lastName || "", uid: lastVisible.id }
    : truncated && queryCursor
      ? queryCursor
      : null;
  console.info("Annuaire portail", { uid: context.uid, search: Boolean(search), scannedCount, returnedCount: page.length, truncated });
  return {
    ok: true,
    directoryVersion: 2,
    users: page.map(accessUserListItem),
    nextCursor,
    scannedCount,
    truncated
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
  const userRef = db.collection("users").doc(uid);
  const snapshot = await userRef.get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Acces LivePalmes introuvable.");
  }
  const data = snapshot.data() || {};
  const capabilities = activeCapabilitiesFromMap(data.capabilities || {});
  const accessScopes = data.accessScopes || {};
  const email = data.email || "";
  const now = new Date().toISOString();
  const authUser = await auth.getUser(uid);
  await auth.updateUser(uid, { disabled: status !== "active" });
  await auth.setCustomUserClaims(uid, {
    ...(authUser.customClaims || {}),
    livepalmesAccess: status === "active",
    livepalmesConsoleAccess: status === "active" && hasConsolePortalCapability(capabilitiesMap(capabilities)),
    livepalmesCapabilities: status === "active" ? capabilitiesMap(capabilities) : capabilitiesMap([])
  });
  if (status !== "active") await auth.revokeRefreshTokens(uid);
  await userRef.set({
    status,
    accessDirectoryKeys: accessDirectoryKeys({ ...data, capabilities }, status),
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
  const userRef = db.collection("users").doc(targetUid);
  const snapshot = await userRef.get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Acces LivePalmes introuvable.");
  }
  const data = snapshot.data() || {};
  const capabilities = activeCapabilitiesFromMap(data.capabilities || {});
  const email = data.email || "";
  try {
    await auth.deleteUser(targetUid);
  } catch (error) {
    if (error?.code !== "auth/user-not-found") throw error;
  }
  const batch = db.batch();
  batch.delete(userRef);
  ACCESS_CAPABILITIES.forEach((capability) => {
    batch.delete(db.collection("accessGrants").doc(`${targetUid}_${capability.replace(".", "_")}`));
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
  const userRef = db.collection("users").doc(targetUid);
  const snapshot = await userRef.get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Acces LivePalmes introuvable.");
  }
  const data = snapshot.data() || {};
  assertRegionalAccessUserDeletionRequestAllowed(context, data);

  const pendingSnapshot = await db.collection("accessUserDeletionRequests")
    .where("targetUid", "==", targetUid)
    .where("status", "==", "pending")
    .limit(1)
    .get();
  if (!pendingSnapshot.empty) {
    throw new HttpsError("already-exists", "Une demande de suppression est deja en attente pour ce compte.");
  }

  const now = new Date().toISOString();
  const requestRef = await db.collection("accessUserDeletionRequests").add({
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
  const snapshot = await db.collection("accessUserDeletionRequests")
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
  const requestRef = db.collection("accessUserDeletionRequests").doc(requestId);
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

  const authUser = await auth.getUser(uid);
  const previousEmail = normalizeEmail(authUser.email);
  const userRef = db.collection("users").doc(uid);
  const userSnapshot = await userRef.get();
  const userData = userSnapshot.exists ? userSnapshot.data() || {} : {};
  const capabilities = ADMIN_UIDS.has(uid)
    ? ACCESS_CAPABILITIES
    : activeCapabilitiesFromMap(userData.capabilities || request.auth?.token?.livepalmesCapabilities || {});
  const accessScopes = userData.accessScopes || {};
  const now = new Date().toISOString();

  if (email !== previousEmail) {
    try {
      await auth.updateUser(uid, { email, emailVerified: false });
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
    const batch = db.batch();
    batch.set(userRef, {
      uid,
      email,
      status: userData.status || "active",
      updatedAt: now,
      updatedBy: uid,
      ...(!userSnapshot.exists ? { createdAt: now, createdBy: uid } : {})
    }, { merge: true });
    ACCESS_CAPABILITIES.forEach((capability) => {
      const grantRef = db.collection("accessGrants").doc(`${uid}_${capability.replace(".", "_")}`);
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
      await auth.updateUser(uid, { email: previousEmail }).catch((rollbackError) => {
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

async function setCompetitionEmailNotificationPreference(uid = "", enabled = true, source = "portal") {
  const cleanUid = cleanText(uid).slice(0, 128);
  if (!cleanUid) throw new HttpsError("invalid-argument", "Compte requis.");
  const userRef = db.collection("users").doc(cleanUid);
  const snapshot = await userRef.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "Compte LivePalmes introuvable.");
  const userData = snapshot.data() || {};
  const now = new Date().toISOString();
  const preferencePatch = {
    emailPreferences: {
      competitionNotifications: enabled === true,
      updatedAt: now,
      source: cleanText(source).slice(0, 40)
    },
    updatedAt: now
  };
  const before = engagementMailRecipientFromUserDoc(snapshot);
  const afterData = {
    ...userData,
    ...preferencePatch,
    emailPreferences: {
      ...(userData.emailPreferences || {}),
      ...preferencePatch.emailPreferences
    }
  };
  const after = afterData.status === "active"
    ? engagementMailRecipientFromUserDoc({ id: cleanUid, data: () => afterData })
    : null;
  const recipientKey = engagementMailRecipientIndexKey(cleanUid);
  const capabilities = new Set([...(before.capabilities || []), ...(after?.capabilities || [])]);
  const batch = db.batch();
  batch.set(userRef, preferencePatch, { merge: true });
  capabilities.forEach((capability) => {
    const shardNumber = engagementMailRecipientShardNumber(cleanUid);
    const value = after?.capabilities?.includes(capability) ? after : FieldValue.delete();
    batch.set(engagementMailRecipientShardRef(db, capability, shardNumber), {
      capability,
      shardNumber,
      recipients: { [recipientKey]: value },
      generatedAt: now
    }, { merge: true });
  });
  await batch.commit();
  await writeAuditLog("accessUser.competitionEmailPreferenceUpdated", cleanUid, {
    uid: cleanUid,
    enabled: enabled === true,
    source: cleanText(source).slice(0, 40)
  }).catch((error) => console.warn("Journalisation de la préférence mail impossible", error));
  return { enabled: enabled === true, updatedAt: now };
}

exports.updateCurrentEmailNotificationPreferences = onCall(CALLABLE_OPTIONS, async (request) => {
  await assertLivePalmesAccess(request);
  const uid = cleanText(request.auth?.uid);
  const result = await setCompetitionEmailNotificationPreference(
    uid,
    request.data?.competitionNotifications === true,
    "portal"
  );
  return { ok: true, competitionNotificationsEnabled: result.enabled, updatedAt: result.updatedAt };
});

exports.disableCompetitionEmailNotifications = onCall(NOTIFICATION_PREFERENCE_CALLABLE_OPTIONS, async (request) => {
  const uid = cleanText(request.data?.uid).slice(0, 128);
  const token = cleanText(request.data?.token).slice(0, 180);
  if (!validCompetitionNotificationPreferenceToken(uid, token)) {
    throw new HttpsError("permission-denied", "Lien de désinscription invalide.");
  }
  const result = await setCompetitionEmailNotificationPreference(uid, false, "email_link");
  return { ok: true, competitionNotificationsEnabled: result.enabled, updatedAt: result.updatedAt };
});

exports.getCurrentAccessUser = onCall(CALLABLE_OPTIONS, async (request) => {
  const startedAt = Date.now();
  const uid = cleanText(request.auth?.uid);
  if (!uid) {
    throw new HttpsError("unauthenticated", "Connexion Firebase requise.");
  }
  const snapshot = await db.collection("users").doc(uid).get();
  const data = snapshot.exists ? snapshot.data() || {} : {};
  const authTimeSeconds = Number(request.auth?.token?.auth_time) || 0;
  const lastLoginAt = authTimeSeconds ? new Date(authTimeSeconds * 1000).toISOString() : (data.lastLoginAt || "");
  if (snapshot.exists && lastLoginAt && lastLoginAt !== data.lastLoginAt) {
    await snapshot.ref.set({ lastLoginAt }, { merge: true }).catch((error) => {
      console.warn("Mise a jour de la derniere connexion impossible", error);
    });
  }
  if (ADMIN_UIDS.has(uid) || FUNCTIONS_EMULATOR_ACTIVE) {
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
      competitionNotificationsEnabled: competitionEmailNotificationsEnabled(data),
      lastLoginAt,
      readStats: portalReadStats("getCurrentAccessUser", startedAt, { baseDocuments: 1, cacheHit: false })
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
    competitionNotificationsEnabled: competitionEmailNotificationsEnabled(data),
    lastLoginAt,
    readStats: portalReadStats("getCurrentAccessUser", startedAt, { baseDocuments: 1, cacheHit: false })
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

function isNationalOnlyEngagementCompetitionLevel(value) {
  return ["national", "international"].includes(cleanEngagementCompetitionLevel(value));
}

function cleanEngagementEntryStatus(value) {
  const status = cleanText(value);
  return ENGAGEMENT_ENTRY_STATUSES.has(status) ? status : "upcoming";
}

function cleanEngagementCompetitionType(value) {
  const type = cleanText(value);
  return ENGAGEMENT_COMPETITION_TYPES.has(type) ? type : "pool";
}

function cleanEngagementWaterBodyType(value) {
  const type = cleanText(value);
  return ENGAGEMENT_WATER_BODY_TYPES.has(type) ? type : "";
}

function cleanEngagementOpenWaterCourse(raw = {}, options = {}) {
  const strict = options.strict !== false;
  const distance = Math.trunc(Number(raw.distance));
  const discipline = cleanText(raw.discipline).toUpperCase();
  if (!Number.isInteger(distance) || distance < 1 || distance > 100000) {
    if (strict) throw new HttpsError("invalid-argument", "La distance eau libre doit etre comprise entre 1 et 100000 metres.");
    return null;
  }
  if (!ENGAGEMENT_OPEN_WATER_COURSE_DISCIPLINES.has(discipline)) {
    if (strict) throw new HttpsError("invalid-argument", "Choisissez la specialite : Surface, Bi-palmes ou Support.");
    return null;
  }
  if (distance === 150 && discipline === "SUP") {
    if (strict) throw new HttpsError("invalid-argument", "Le 150 m elimination est disponible uniquement en Surface et Bi-palmes.");
    return null;
  }
  const format = distance === 150 ? "elimination" : "standard";
  const distanceLabel = format === "elimination" ? "150 m élimination" : `${distance} m`;
  const disciplineLabel = { SF: "Surface", BI: "Bi-palmes", SUP: "Support" }[discipline];
  const id = `${format === "elimination" ? "150-elimination" : distance}-${discipline}`;
  return {
    id,
    distance,
    discipline,
    label: `${distanceLabel} ${disciplineLabel}`,
    format,
    active: raw.active !== false
  };
}

function cleanEngagementOpenWaterCourses(rawCourses = []) {
  const byId = new Map();
  ENGAGEMENT_OPEN_WATER_DEFAULT_COURSES.forEach((course) => byId.set(course.id, { ...course }));
  (Array.isArray(rawCourses) ? rawCourses : []).slice(0, ENGAGEMENT_OPEN_WATER_COURSE_LIMIT).forEach((rawCourse) => {
    const course = cleanEngagementOpenWaterCourse(rawCourse, { strict: false });
    if (course) byId.set(course.id, course);
  });
  return Array.from(byId.values()).sort((left, right) => left.distance - right.distance || left.label.localeCompare(right.label, "fr"));
}

function engagementOpenWaterCourseConfigRef(database = db) {
  return database.collection(ENGAGEMENT_CONFIGURATION_COLLECTION).doc(ENGAGEMENT_OPEN_WATER_COURSE_CONFIG_ID);
}

function engagementOpenWaterEventDefinition(rawEvent = {}) {
  const code = cleanText(rawEvent.code).toUpperCase().replace(/\s+/g, "");
  const match = code.match(/^OW(\d{1,6})(ELIM)?(SF|BI|SUP)$/);
  if (!match) return null;
  const distance = Number(match[1]);
  const format = match[2] ? "elimination" : "standard";
  const discipline = match[3];
  if ((distance === 150) !== (format === "elimination")) return null;
  const cleanedCourse = cleanEngagementOpenWaterCourse({ distance, discipline }, { strict: false });
  if (!cleanedCourse) return null;
  return {
    code,
    type: "individual",
    label: cleanedCourse.label,
    shortLabel: cleanedCourse.label,
    discipline,
    distance,
    openWaterCourseId: cleanedCourse.id,
    openWaterFormat: format
  };
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
  return ENGAGEMENT_POOL_LENGTHS.has(poolLength) ? poolLength : "";
}

function cleanEngagementPoolLaneCount(value) {
  if (value === "" || value === null || value === undefined || value === 0 || value === "0") return 0;
  const laneCount = Number(value);
  if (!Number.isInteger(laneCount) || laneCount < 4 || laneCount > 10) {
    throw new HttpsError("invalid-argument", "Le nombre de lignes d'eau doit etre compris entre 4 et 10.");
  }
  return laneCount;
}

function cleanEngagementTimingType(value) {
  const timingType = cleanText(value);
  return ENGAGEMENT_TIMING_TYPES.has(timingType) ? timingType : "";
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
      enabled: true,
      swimmerFee: 0,
      individualEventFee: 0,
      relayFee: 0,
      helloAssoUrl: "",
      latePaymentSurcharge: 50
    };
  }
  const strict = options.strict !== false;
  const enabled = rawFees.enabled !== false;
  const helloAssoUrl = cleanText(rawFees.helloAssoUrl).slice(0, 300);
  if (helloAssoUrl && !/^https?:\/\/\S+$/i.test(helloAssoUrl)) {
    if (strict) throw new HttpsError("invalid-argument", "Lien HelloAsso invalide.");
  }
  return {
    enabled,
    swimmerFee: enabled ? cleanEngagementFeeAmount(rawFees.swimmerFee) : 0,
    individualEventFee: enabled ? cleanEngagementFeeAmount(rawFees.individualEventFee) : 0,
    relayFee: enabled ? cleanEngagementFeeAmount(rawFees.relayFee) : 0,
    helloAssoUrl: enabled && /^https?:\/\/\S+$/i.test(helloAssoUrl) ? helloAssoUrl : "",
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
    const competitionType = cleanEngagementCompetitionType(options.competitionType);
    const staticDefinition = ENGAGEMENT_EVENT_DEFINITION_BY_CODE.get(code);
    const definition = competitionType === "openWater"
      ? (code === "OW4X1000SB" ? staticDefinition : engagementOpenWaterEventDefinition(rawEvent))
      : (code === "OW4X1000SB" ? null : staticDefinition);
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
  const selectedEventsByCode = new Map(selectedEvents.map((event) => [cleanText(event?.code).toUpperCase(), event]));
  const usedProgramSlots = new Map();
  function slotConflict(eventCode, genderMode, phase) {
    const usedModes = usedProgramSlots.get(`${eventCode}:${phase}`) || new Set();
    if (genderMode === "mixed") return usedModes.size > 0;
    return usedModes.has("mixed") || usedModes.has(genderMode);
  }
  function registerSlot(eventCode, genderMode, phase) {
    const key = `${eventCode}:${phase}`;
    if (!usedProgramSlots.has(key)) usedProgramSlots.set(key, new Set());
    usedProgramSlots.get(key).add(genderMode);
  }
  const sessions = rawSessions.slice(0, 12).map((rawSession, sessionIndex) => {
    const label = `Session ${sessionIndex + 1}`;
    const date = cleanIsoDate(rawSession?.date);
    const startTime = /^\d{2}:\d{2}$/.test(cleanText(rawSession?.startTime)) ? cleanText(rawSession.startTime) : "";
    const items = [];
    if (Array.isArray(rawSession?.items)) {
      rawSession.items.slice(0, 160).forEach((rawItem) => {
        const eventCode = cleanText(rawItem?.eventCode || rawItem?.code).toUpperCase().replace(/\s+/g, "");
        const definition = selectedEventsByCode.get(eventCode) || ENGAGEMENT_EVENT_DEFINITION_BY_CODE.get(eventCode);
        if (!definition || (selectedCodes.size && !selectedCodes.has(eventCode))) {
          if (strict) throw new HttpsError("invalid-argument", `Epreuve programme inconnue ou non selectionnee : ${eventCode || "-"}.`);
          return;
        }
        const requestedGenderMode = ENGAGEMENT_PROGRAM_GENDER_MODES.has(cleanText(rawItem?.genderMode))
          ? cleanText(rawItem.genderMode)
          : "mixed";
        const genderMode = definition.relayMixedRule === "required" ? "mixed" : requestedGenderMode;
        const requestedPhase = cleanText(rawItem?.phase);
        let phase = ENGAGEMENT_PROGRAM_PHASES.has(requestedPhase) ? requestedPhase : "direct";
        const isOpenWaterEvent = /^OW/.test(eventCode);
        const isOpenWaterElimination = definition?.openWaterFormat === "elimination" || /^OW150ELIM(?:SF|BI)$/.test(eventCode);
        const allowedPhases = isOpenWaterEvent
          ? (isOpenWaterElimination ? new Set(["direct", "heats", "final"]) : new Set(["direct"]))
          : ENGAGEMENT_PROGRAM_PHASES;
        if (!allowedPhases.has(phase)) {
          if (strict) throw new HttpsError("invalid-argument", isOpenWaterElimination
            ? `Seules les series et la finale sont autorisees pour le 150 m elimination : ${eventCode}.`
            : `Cette course eau libre se nage directement : ${eventCode}.`);
          phase = "direct";
        }
        if (slotConflict(eventCode, genderMode, phase)) {
          if (strict) throw new HttpsError("invalid-argument", `Doublon dans le programme : ${eventCode} ${genderMode} ${phase}.`);
          return;
        }
        registerSlot(eventCode, genderMode, phase);
        items.push({
          eventCode,
          genderMode,
          phase,
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
  if (!strict) return sessions;

  const occurrences = sessions.flatMap((session, sessionIndex) => (session.items || []).map((item, itemIndex) => ({
    ...item,
    position: sessionIndex * 160 + itemIndex
  })));
  const modesByEvent = new Map();
  occurrences.forEach((item) => {
    if (!modesByEvent.has(item.eventCode)) modesByEvent.set(item.eventCode, new Set());
    modesByEvent.get(item.eventCode).add(item.genderMode);
  });
  for (const [eventCode, modes] of modesByEvent) {
    if (modes.has("mixed") && modes.size > 1) {
      throw new HttpsError("invalid-argument", `Programme incoherent pour ${eventCode} : F/H ensemble ne peut pas etre combine avec Femmes ou Hommes.`);
    }
  }
  const groups = new Map();
  occurrences.forEach((item) => {
    const key = `${item.eventCode}:${item.genderMode}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });
  for (const items of groups.values()) {
    const eventCode = items[0].eventCode;
    const phases = new Set(items.map((item) => item.phase));
    if (phases.has("direct") && phases.size > 1) {
      throw new HttpsError("invalid-argument", `Course directe incompatible avec un autre passage : ${eventCode}.`);
    }
    const heats = items.find((item) => item.phase === "heats");
    const final = items.find((item) => item.phase === "final");
    const slowHeats = items.find((item) => item.phase === "slowHeats");
    const fastHeat = items.find((item) => item.phase === "fastHeat");
    if (Boolean(heats) !== Boolean(final)) {
      throw new HttpsError("invalid-argument", `Les series et la finale doivent etre programmees ensemble : ${eventCode}.`);
    }
    if (Boolean(slowHeats) !== Boolean(fastHeat)) {
      throw new HttpsError("invalid-argument", `Les series lentes et la serie rapide doivent etre programmees ensemble : ${eventCode}.`);
    }
    if ((heats || final) && (slowHeats || fastHeat)) {
      throw new HttpsError("invalid-argument", `Deux formats de deroulement sont combines pour ${eventCode}.`);
    }
    if (heats && final && heats.position >= final.position) {
      throw new HttpsError("invalid-argument", `La finale doit etre placee apres les series : ${eventCode}.`);
    }
    if (slowHeats && fastHeat && slowHeats.position >= fastHeat.position) {
      throw new HttpsError("invalid-argument", `La serie rapide doit etre placee apres les series lentes : ${eventCode}.`);
    }
  }
  return sessions;
}

function engagementCompetitionCalendarItem(data = {}, id = "") {
  const competitionType = cleanEngagementCompetitionType(data.competitionType);
  const events = cleanEngagementCompetitionEvents(data.events || [], { strict: false, competitionType });
  const programSessions = cleanEngagementProgramSessions(data.programSessions || [], events, { strict: false });
  return {
    id: cleanText(id || data.id).slice(0, 128),
    name: cleanText(data.name || data.title).slice(0, 160),
    date: cleanIsoDate(data.date),
    endDate: cleanIsoDate(data.endDate) || cleanIsoDate(data.date),
    location: cleanText(data.location).slice(0, 160),
    city: cleanText(data.city || data.location).slice(0, 120),
    address: cleanText(data.address).slice(0, 300),
    organizer: cleanText(data.organizer).slice(0, 160),
    publicDescription: cleanText(data.publicDescription).slice(0, 3000),
    regionId: cleanText(data.regionId).slice(0, 80),
    invitedRegionIds: cleanEngagementRegionIds(data.invitedRegionIds, data.regionId),
    level: cleanEngagementCompetitionLevel(data.level || data.competitionLevel),
    competitionType,
    waterBodyType: competitionType === "openWater" ? cleanEngagementWaterBodyType(data.waterBodyType) : "",
    entryDeadlineAt: cleanText(data.entryDeadlineAt).slice(0, 40),
    computerEmail: normalizeEmail(data.computerEmail).slice(0, 180),
    officialsManagerEmail: normalizeEmail(data.officialsManagerEmail).slice(0, 180),
    entryStatus: cleanEngagementEntryStatus(data.entryStatus || data.status),
    publicationStatus: cleanPublicCalendarPublicationStatus(data.publicationStatus),
    canceled: data.canceled === true,
    resultsPublishedAt: cleanText(data.resultsPublishedAt).slice(0, 40),
    resultsUrl: cleanText(data.resultsUrl).slice(0, 900),
    resultsPdfUrl: cleanText(data.resultsPdfUrl).slice(0, 900),
    documentCount: cleanCompetitionDocuments(data.clubDocuments || []).length,
    officialsRequired: data.officialsRequired === true,
    poolLength: cleanEngagementPoolLength(data.poolLength),
    poolLaneCount: cleanEngagementPoolLaneCount(data.poolLaneCount),
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

function engagementCalendarEventCalendarRef(db, endYear) {
  return db.collection(ENGAGEMENT_CALENDAR_EVENT_CALENDARS_COLLECTION).doc(String(Math.trunc(Number(endYear) || 0)));
}

function cleanEngagementCalendarEventPayload(raw = {}, context = {}) {
  const eventType = cleanPublicCalendarEventType(raw.eventType, "");
  const name = cleanText(raw.name || raw.title).slice(0, 160);
  const date = cleanIsoDate(raw.date);
  const endDate = cleanIsoDate(raw.endDate) || date;
  const location = cleanText(raw.location).slice(0, 160);
  const city = cleanText(raw.city || raw.location).slice(0, 120);
  const level = cleanPublicCalendarLevel(raw.level);
  const requestedRegionId = cleanText(raw.regionId).slice(0, 80);
  const regionId = isNationalOnlyEngagementCompetitionLevel(level) ? "" : (context.national ? requestedRegionId : context.regionId);
  if (!context.national && !context.region) {
    throw new HttpsError("permission-denied", "Droit de gestion du calendrier requis.");
  }
  if (!context.national && isNationalOnlyEngagementCompetitionLevel(level)) {
    throw new HttpsError("permission-denied", "Un evenement national doit etre cree par le niveau national.");
  }
  if (!PUBLIC_CALENDAR_EVENT_TYPES.has(eventType)) {
    throw new HttpsError("invalid-argument", "Type d'evenement invalide.");
  }
  if (!name || !date || !location || !city) {
    throw new HttpsError("invalid-argument", "Nom, date, ville et lieu sont obligatoires.");
  }
  if (endDate < date) {
    throw new HttpsError("invalid-argument", "La date de fin doit etre egale ou posterieure a la date de debut.");
  }
  if (!isNationalOnlyEngagementCompetitionLevel(level) && !regionId) {
    throw new HttpsError("invalid-argument", "Region obligatoire pour un evenement departemental ou regional.");
  }
  return {
    eventType,
    name,
    date,
    endDate,
    city,
    location,
    address: cleanText(raw.address).slice(0, 300),
    organizer: cleanText(raw.organizer).slice(0, 160),
    publicDescription: cleanText(raw.publicDescription).slice(0, 3000),
    entryDeadlineAt: cleanIsoDateTime(raw.entryDeadlineAt),
    registrationUrl: cleanPublicCalendarUrl(raw.registrationUrl, 500),
    regionId,
    level,
    publicationStatus: cleanPublicCalendarPublicationStatus(raw.publicationStatus),
    canceled: raw.canceled === true,
    programSessions: cleanPublicCalendarProgram(raw.programSessions || raw.program || [])
  };
}

function engagementCalendarEventCalendarItem(data = {}, id = "") {
  return {
    id: cleanText(id || data.id).slice(0, 128),
    sourceType: "calendarEvent",
    eventType: cleanPublicCalendarEventType(data.eventType),
    competitionType: cleanPublicCalendarEventType(data.eventType),
    name: cleanText(data.name || data.title).slice(0, 160),
    date: cleanIsoDate(data.date),
    endDate: cleanIsoDate(data.endDate) || cleanIsoDate(data.date),
    city: cleanText(data.city || data.location).slice(0, 120),
    location: cleanText(data.location).slice(0, 160),
    address: cleanText(data.address).slice(0, 300),
    organizer: cleanText(data.organizer).slice(0, 160),
    publicDescription: cleanText(data.publicDescription).slice(0, 3000),
    entryDeadlineAt: cleanIsoDateTime(data.entryDeadlineAt),
    registrationUrl: cleanPublicCalendarUrl(data.registrationUrl, 500),
    regionId: cleanText(data.regionId).slice(0, 80),
    level: cleanPublicCalendarLevel(data.level),
    publicationStatus: cleanPublicCalendarPublicationStatus(data.publicationStatus),
    canceled: data.canceled === true,
    resultsPublishedAt: cleanText(data.resultsPublishedAt).slice(0, 40),
    resultsUrl: cleanText(data.resultsUrl).slice(0, 900),
    resultsPdfUrl: cleanText(data.resultsPdfUrl).slice(0, 900),
    documentCount: cleanCompetitionDocuments(data.clubDocuments || []).length,
    entryStatus: "",
    updatedAt: cleanText(data.updatedAt).slice(0, 40)
  };
}

function engagementCalendarEventDetailItem(doc, options = {}) {
  const data = doc?.data ? doc.data() || {} : doc || {};
  const id = cleanText(doc?.id || options.id).slice(0, 128);
  return {
    ...engagementCalendarEventCalendarItem(data, id),
    programSessions: cleanPublicCalendarProgram(data.programSessions || []),
    clubDocuments: cleanCompetitionDocuments(data.clubDocuments || [], {
      includeUploader: options.includeDocumentUploader === true
    }),
    createdAt: cleanText(data.createdAt).slice(0, 40),
    createdBy: options.includeDocumentUploader === true ? cleanText(data.createdBy).slice(0, 128) : ""
  };
}

function engagementCalendarEventItemsFromData(data = {}) {
  const events = data.events && typeof data.events === "object" ? data.events : {};
  return Object.values(events)
    .map((event) => engagementCalendarEventCalendarItem(event, event.id))
    .filter((event) => event.id && event.date);
}

function publicCalendarFile(relativePath = "") {
  const cleanPath = String(relativePath || "").replace(/^\/+/, "");
  return storage.bucket(PUBLIC_PERFORMANCE_BUCKET).file(`${PUBLIC_CALENDAR_FILES_PATH}/${cleanPath}`);
}

async function readPublicCalendarJson(relativePath, fallback = {}) {
  try {
    const [buffer] = await publicCalendarFile(relativePath).download();
    return JSON.parse(buffer.toString("utf8"));
  } catch (error) {
    if (error?.code === 404 || error?.code === 403 || /No such object|not found/i.test(error?.message || "")) return fallback;
    throw error;
  }
}

async function savePublicCalendarJson(relativePath, payload, cacheControl = "public, max-age=300") {
  const json = JSON.stringify(payload);
  if (Buffer.byteLength(json, "utf8") > PUBLIC_CALENDAR_MAX_BYTES) {
    throw new Error(`Fichier calendrier public trop volumineux : ${relativePath}.`);
  }
  await publicCalendarFile(relativePath).save(json, {
    resumable: false,
    contentType: "application/json; charset=utf-8",
    metadata: { cacheControl }
  });
  return `${PUBLIC_CALENDAR_FILES_PATH}/${relativePath}`;
}

async function savePublicCalendarSeasonSnapshot(season, payload) {
  const relativePath = `seasons/${season.endYear}.json`;
  const file = publicCalendarFile(relativePath);
  const json = JSON.stringify(payload);
  if (Buffer.byteLength(json, "utf8") > PUBLIC_CALENDAR_MAX_BYTES) {
    throw new Error(`Calendrier public ${season.label} trop volumineux.`);
  }
  for (let attempt = 0; attempt < 5; attempt += 1) {
    let current = {};
    let generation = 0;
    try {
      const [[buffer], [metadata]] = await Promise.all([file.download(), file.getMetadata()]);
      current = JSON.parse(buffer.toString("utf8"));
      generation = Number(metadata.generation || 0);
    } catch (error) {
      if (!(error?.code === 404 || /No such object|not found/i.test(error?.message || ""))) throw error;
    }
    if (cleanText(current.sourceUpdatedAt) > cleanText(payload.sourceUpdatedAt)) return current;
    try {
      await file.save(json, {
        resumable: false,
        contentType: "application/json; charset=utf-8",
        metadata: { cacheControl: "public, max-age=300" },
        preconditionOpts: { ifGenerationMatch: generation }
      });
      return payload;
    } catch (error) {
      if (Number(error?.code) !== 412) throw error;
    }
  }
  throw new Error(`Publication concurrente du calendrier ${season.label} impossible.`);
}

async function updatePublicCalendarManifest(season, seasonPayload) {
  const file = publicCalendarFile("manifest.json");
  for (let attempt = 0; attempt < 5; attempt += 1) {
    let current = { seasons: [] };
    let generation = 0;
    try {
      const [[buffer], [metadata]] = await Promise.all([file.download(), file.getMetadata()]);
      current = JSON.parse(buffer.toString("utf8"));
      generation = Number(metadata.generation || 0);
    } catch (error) {
      if (!(error?.code === 404 || /No such object|not found/i.test(error?.message || ""))) throw error;
    }
    const byEndYear = new Map((Array.isArray(current.seasons) ? current.seasons : []).map((item) => [Number(item.endYear), item]));
    if (seasonPayload.events.length) {
      byEndYear.set(season.endYear, {
        ...season,
        path: `${PUBLIC_CALENDAR_FILES_PATH}/seasons/${season.endYear}.json`,
        eventCount: seasonPayload.events.length,
        updatedAt: seasonPayload.updatedAt
      });
    } else {
      byEndYear.delete(season.endYear);
    }
    const manifest = {
      version: 1,
      updatedAt: new Date().toISOString(),
      seasons: Array.from(byEndYear.values()).sort((left, right) => Number(right.endYear) - Number(left.endYear))
    };
    try {
      await file.save(JSON.stringify(manifest), {
        resumable: false,
        contentType: "application/json; charset=utf-8",
        metadata: { cacheControl: "no-store, max-age=0" },
        preconditionOpts: { ifGenerationMatch: generation }
      });
      return manifest;
    } catch (error) {
      if (Number(error?.code) !== 412) throw error;
    }
  }
  throw new Error("Publication concurrente du manifeste calendrier impossible.");
}

function publicCalendarCompetitionDetail(data = {}, id = "") {
  const eventLabelByCode = Object.fromEntries(cleanEngagementCompetitionEvents(data.events || [], {
    strict: false,
    competitionType: cleanEngagementCompetitionType(data.competitionType)
  }).map((event) => [event.code, event.shortLabel || event.label || event.code]));
  return publicCalendarDetail(data, {
    id,
    sourceType: "competition",
    regionLabels: CLUB_REFERENCE_REGION_LABELS,
    eventLabelByCode
  });
}

function publicCalendarGenericEventDetail(data = {}, id = "") {
  return publicCalendarDetail(data, {
    id,
    sourceType: "calendarEvent",
    regionLabels: CLUB_REFERENCE_REGION_LABELS
  });
}

async function publishPublicCalendarDetail(data = {}, id = "", sourceType = "competition") {
  const published = cleanPublicCalendarPublicationStatus(data.publicationStatus) === "published";
  const file = publicCalendarFile(`events/${cleanText(id).slice(0, 128)}.json`);
  if (!published) {
    await file.delete({ ignoreNotFound: true });
    return { published: false };
  }
  const detail = sourceType === "calendarEvent"
    ? publicCalendarGenericEventDetail(data, id)
    : publicCalendarCompetitionDetail(data, id);
  await savePublicCalendarJson(`events/${detail.id}.json`, detail, "public, max-age=60, must-revalidate");
  return { published: true, detail };
}

async function publishPublicCalendarSeason(endYear) {
  const season = engagementSeasonBoundsFromEndYear(endYear);
  const [competitionSnapshot, eventSnapshot] = await db.getAll(
    engagementCompetitionCalendarRef(db, season.endYear),
    engagementCalendarEventCalendarRef(db, season.endYear)
  );
  const competitionData = competitionSnapshot.exists ? competitionSnapshot.data() || {} : {};
  const eventData = eventSnapshot.exists ? eventSnapshot.data() || {} : {};
  const events = [
    ...engagementCompetitionCalendarItemsFromData(competitionData).map((item) => publicCalendarSummary(item, {
      id: item.id,
      sourceType: "competition",
      regionLabels: CLUB_REFERENCE_REGION_LABELS
    })),
    ...engagementCalendarEventItemsFromData(eventData).map((item) => publicCalendarSummary(item, {
      id: item.id,
      sourceType: "calendarEvent",
      regionLabels: CLUB_REFERENCE_REGION_LABELS
    }))
  ].filter((item) => item.publicationStatus === "published")
    .sort((left, right) => cleanText(left.date).localeCompare(cleanText(right.date)) || cleanText(left.name).localeCompare(cleanText(right.name), "fr"));
  const sourceUpdatedAt = [competitionData.updatedAt, eventData.updatedAt].map(cleanText).sort().at(-1) || new Date().toISOString();
  const payload = {
    version: 1,
    ...season,
    updatedAt: new Date().toISOString(),
    sourceUpdatedAt,
    eventCount: events.length,
    events
  };
  const publishedPayload = await savePublicCalendarSeasonSnapshot(season, payload);
  await updatePublicCalendarManifest(season, publishedPayload);
  return publishedPayload;
}

async function publishPublicCalendarChange(event = {}, sourceType = "competition", resolvedChange = null) {
  const before = resolvedChange
    ? resolvedChange.before
    : (event.data?.before?.exists ? event.data.before.data() || {} : null);
  const after = resolvedChange
    ? resolvedChange.after
    : (event.data?.after?.exists ? event.data.after.data() || {} : null);
  const eventId = cleanText(event.params?.competitionId || event.params?.calendarEventId).slice(0, 128);
  if (!eventId) return;
  if (after) await publishPublicCalendarDetail(after, eventId, sourceType);
  const seasons = new Set();
  [before, after].filter(Boolean).forEach((data) => {
    const date = cleanIsoDate(data.date);
    if (date) seasons.add(engagementSeasonEndYearFromIsoDate(date));
  });
  for (const endYear of seasons) await publishPublicCalendarSeason(endYear);
  if (!after) await publicCalendarFile(`events/${eventId}.json`).delete({ ignoreNotFound: true });
}

function engagementClubCompetitionIndexRef(db, clubId) {
  return db.collection(ENGAGEMENT_CLUB_COMPETITION_INDEXES_COLLECTION).doc(cleanText(clubId).slice(0, 40));
}

function engagementClubCompetitionIndexKey(competitionId) {
  return stableHash(cleanText(competitionId).slice(0, 128)).slice(0, 40);
}

function engagementClosureQueueRef(db, competitionId) {
  return db.collection(ENGAGEMENT_CLOSURE_QUEUE_COLLECTION).doc(cleanText(competitionId).slice(0, 128));
}

function engagementClosureQueueItem(competition = {}, competitionId = "", now = new Date().toISOString()) {
  const entryStatus = cleanEngagementEntryStatus(competition.entryStatus || competition.status);
  const runAt = cleanIsoDateTime(competition.entryDeadlineAt);
  if (entryStatus !== "open" || !runAt) return null;
  return cleanFirestoreValue({
    competitionId: cleanText(competitionId).slice(0, 128),
    competitionName: cleanText(competition.name || competition.title).slice(0, 160),
    runAt,
    entryDeadlineAt: runAt,
    regionId: cleanText(competition.regionId).slice(0, 80),
    level: cleanEngagementCompetitionLevel(competition.level || competition.competitionLevel),
    status: "scheduled",
    updatedAt: now
  });
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
    .filter((competition) => !filters.competitionType || competition.competitionType === filters.competitionType)
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

exports.rebuildEngagementCompetitionCalendars = onCall(MIGRATION_CALLABLE_OPTIONS, async (request) => {
  const startedAt = Date.now();
  const context = await engagementAccessContext(request);
  if (!context.national) {
    throw new HttpsError("permission-denied", "Reconstruction du calendrier reservee au niveau national.");
  }
  const endYears = Array.from(new Set((Array.isArray(request.data?.endYears) ? request.data.endYears : [])
    .map((value) => Math.trunc(Number(value) || 0))
    .filter((value) => value >= 2020 && value <= 2100))).slice(0, 2);
  if (!endYears.length) throw new HttpsError("invalid-argument", "Au moins une saison est requise.");
  const results = [];
  for (const endYear of endYears) {
    const competitions = await rebuildEngagementCompetitionCalendar(db, endYear);
    const published = await publishPublicCalendarSeason(endYear);
    results.push({ endYear, competitionCount: competitions.length, publishedEventCount: published.eventCount });
  }
  await writeAuditLog("engagementCompetitionCalendars.rebuilt", context.uid, {
    endYears,
    competitionCount: results.reduce((sum, result) => sum + result.competitionCount, 0)
  });
  return {
    ok: true,
    results,
    readStats: portalReadStats("rebuildEngagementCompetitionCalendars", startedAt, {
      baseDocuments: 1 + (endYears.length * 2),
      variableDocumentsMax: endYears.length * 1200,
      cacheHit: false
    })
  };
});

async function syncEngagementCompetitionCalendarFromChange(event = {}) {
  const before = event.data?.before?.exists ? event.data.before.data() || {} : null;
  const competitionId = cleanText(event.params?.competitionId);
  if (!competitionId) return;
  const beforeDate = before ? cleanIsoDate(before.date) : "";
  const eventAfter = event.data?.after?.exists ? event.data.after.data() || {} : null;
  const eventAfterDate = eventAfter ? cleanIsoDate(eventAfter.date) : "";
  const beforeSeason = beforeDate ? engagementSeasonEndYearFromIsoDate(beforeDate) : null;
  const eventAfterSeason = eventAfterDate ? engagementSeasonEndYearFromIsoDate(eventAfterDate) : null;
  const sourceRef = db.collection("engagementCompetitions").doc(competitionId);
  let resolvedAfter = null;
  await db.runTransaction(async (transaction) => {
    const currentSnapshot = await transaction.get(sourceRef);
    const current = currentSnapshot.exists ? currentSnapshot.data() || {} : null;
    const currentDate = current ? cleanIsoDate(current.date) : "";
    const currentSeason = currentDate ? engagementSeasonEndYearFromIsoDate(currentDate) : null;
    const now = new Date().toISOString();
    const touchedSeasons = new Set([beforeSeason, eventAfterSeason, currentSeason].filter((season) => season !== null));
    touchedSeasons.forEach((endYear) => {
      const season = engagementSeasonBoundsFromEndYear(endYear);
      transaction.set(engagementCompetitionCalendarRef(db, endYear), {
        ...season,
        generatedAt: now,
        updatedAt: now,
        competitions: {
          [competitionId]: current && currentSeason === endYear
            ? engagementCompetitionCalendarItem(current, competitionId)
            : FieldValue.delete()
        }
      }, { merge: true });
    });
    invalidateEngagementCompetitionStatistics(transaction, db, competitionId, now);
    const queueItem = current ? engagementClosureQueueItem(current, competitionId, now) : null;
    if (queueItem) transaction.set(engagementClosureQueueRef(db, competitionId), queueItem, { merge: true });
    else transaction.delete(engagementClosureQueueRef(db, competitionId));
    resolvedAfter = current;
  });
  return { before, after: resolvedAfter, competitionId };
}

exports.syncEngagementCompetitionToCalendar = onDocumentWritten({
  region: REGION,
  document: "engagementCompetitions/{competitionId}"
}, async (event) => {
  const resolvedChange = await syncEngagementCompetitionCalendarFromChange(event);
  await publishPublicCalendarChange(event, "competition", resolvedChange);
});

async function syncEngagementCalendarEventFromChange(event = {}) {
  const before = event.data?.before?.exists ? event.data.before.data() || {} : null;
  const after = event.data?.after?.exists ? event.data.after.data() || {} : null;
  const calendarEventId = cleanText(event.params?.calendarEventId).slice(0, 128);
  if (!calendarEventId) return;
  const now = new Date().toISOString();
  const batch = db.batch();
  let batchSize = 0;
  const beforeDate = before ? cleanIsoDate(before.date) : "";
  const afterDate = after ? cleanIsoDate(after.date) : "";
  const beforeSeason = beforeDate ? engagementSeasonEndYearFromIsoDate(beforeDate) : null;
  const afterSeason = afterDate ? engagementSeasonEndYearFromIsoDate(afterDate) : null;
  if (beforeSeason !== null && (!after || beforeSeason !== afterSeason)) {
    const season = engagementSeasonBoundsFromEndYear(beforeSeason);
    batch.set(engagementCalendarEventCalendarRef(db, beforeSeason), {
      ...season,
      generatedAt: now,
      updatedAt: now,
      events: { [calendarEventId]: FieldValue.delete() }
    }, { merge: true });
    batchSize += 1;
  }
  if (after && afterDate && afterSeason !== null) {
    const season = engagementSeasonBoundsFromEndYear(afterSeason);
    batch.set(engagementCalendarEventCalendarRef(db, afterSeason), {
      ...season,
      generatedAt: now,
      updatedAt: now,
      events: { [calendarEventId]: engagementCalendarEventCalendarItem(after, calendarEventId) }
    }, { merge: true });
    batchSize += 1;
  }
  if (batchSize) await batch.commit();
}

exports.syncEngagementCalendarEventToCalendar = onDocumentWritten({
  region: REGION,
  document: `${ENGAGEMENT_CALENDAR_EVENTS_COLLECTION}/{calendarEventId}`
}, async (event) => {
  await syncEngagementCalendarEventFromChange(event);
  await publishPublicCalendarChange(event, "calendarEvent");
});

function engagementCompetitionDetailItem(doc, options = {}) {
  const data = doc.data() || {};
  const events = cleanEngagementCompetitionEvents(data.events || [], {
    strict: false,
    competitionType: cleanEngagementCompetitionType(data.competitionType)
  });
  const closureSummary = data.closureAutomationSummary && typeof data.closureAutomationSummary === "object"
    ? data.closureAutomationSummary
    : {};
  return {
    ...engagementCompetitionListItem(doc),
    events,
    programSessions: cleanEngagementProgramSessions(data.programSessions || [], events, { strict: false }),
    fees: cleanEngagementFees(data.fees || {}, { strict: false }),
    clubDocuments: cleanCompetitionDocuments(data.clubDocuments || [], {
      includeUploader: options.includeDocumentUploader === true
    }),
    documents: engagementCompetitionDocumentsMetadata(data.documents || {}),
    generatedFiles: cleanEngagementGeneratedFiles(data.generatedFiles || []),
    closureAutomationStatus: cleanText(data.closureAutomationStatus).slice(0, 80),
    closureAutomationStartedAt: cleanText(data.closureAutomationStartedAt).slice(0, 40),
    closureAutomationCompletedAt: cleanText(data.closureAutomationCompletedAt).slice(0, 40),
    closureAutomationFailedAt: cleanText(data.closureAutomationFailedAt).slice(0, 40),
    closureAutomationReason: cleanText(data.closureAutomationReason).slice(0, 220),
    closureRecapEmailsPreparedAt: cleanText(data.closureRecapEmailsPreparedAt).slice(0, 40),
    closureRecapEmailsSentAt: cleanText(data.closureRecapEmailsSentAt).slice(0, 40),
    closureAutomationSummary: {
      clubEntryCount: Math.max(0, Math.trunc(Number(closureSummary.clubEntryCount) || 0)),
      skippedClubCount: Math.max(0, Math.trunc(Number(closureSummary.skippedClubCount) || 0)),
      jobCount: Math.max(0, Math.trunc(Number(closureSummary.jobCount) || 0)),
      pdfGeneratedCount: Math.max(0, Math.trunc(Number(closureSummary.pdfGeneratedCount) || 0)),
      pdfReusedCount: Math.max(0, Math.trunc(Number(closureSummary.pdfReusedCount) || 0)),
      txtGeneratedCount: Math.max(0, Math.trunc(Number(closureSummary.txtGeneratedCount) || 0)),
      txtMailJobCount: Math.max(0, Math.trunc(Number(closureSummary.txtMailJobCount) || 0)),
      officialsPdfGeneratedCount: Math.max(0, Math.trunc(Number(closureSummary.officialsPdfGeneratedCount) || 0)),
      officialsMailJobCount: Math.max(0, Math.trunc(Number(closureSummary.officialsMailJobCount) || 0)),
      officialCount: Math.max(0, Math.trunc(Number(closureSummary.officialCount) || 0)),
      officialsPersonLookupReadCount: Math.max(0, Math.trunc(Number(closureSummary.officialsPersonLookupReadCount) || 0)),
      prepareErrorCount: Math.max(0, Math.trunc(Number(closureSummary.prepareErrorCount) || 0)),
      attemptedMailCount: Math.max(0, Math.trunc(Number(closureSummary.attemptedMailCount) || 0)),
      sentMailCount: Math.max(0, Math.trunc(Number(closureSummary.sentMailCount) || 0)),
      sendErrorCount: Math.max(0, Math.trunc(Number(closureSummary.sendErrorCount) || 0)),
      txtAttemptedMailCount: Math.max(0, Math.trunc(Number(closureSummary.txtAttemptedMailCount) || 0)),
      txtSentMailCount: Math.max(0, Math.trunc(Number(closureSummary.txtSentMailCount) || 0)),
      txtSendErrorCount: Math.max(0, Math.trunc(Number(closureSummary.txtSendErrorCount) || 0)),
      officialsAttemptedMailCount: Math.max(0, Math.trunc(Number(closureSummary.officialsAttemptedMailCount) || 0)),
      officialsSentMailCount: Math.max(0, Math.trunc(Number(closureSummary.officialsSentMailCount) || 0)),
      officialsSendErrorCount: Math.max(0, Math.trunc(Number(closureSummary.officialsSendErrorCount) || 0)),
      updatedAt: cleanText(closureSummary.updatedAt).slice(0, 40)
    },
    createdAt: cleanText(data.createdAt).slice(0, 40),
    createdBy: cleanText(data.createdBy).slice(0, 128),
    updatedBy: cleanText(data.updatedBy).slice(0, 128)
  };
}

function engagementClubEntryId(competitionId, clubId) {
  return `${cleanText(competitionId).slice(0, 128)}_${cleanText(clubId).slice(0, 40)}`;
}

async function engagementClubEntryCompetitionIds(competitions = [], clubId = "", coverageKeys = [], prefetchedIndexSnapshot = null) {
  const competitionIds = Array.from(new Set((Array.isArray(competitions) ? competitions : [])
    .map((competition) => cleanText(competition?.id).slice(0, 128))
    .filter(Boolean)));
  const cleanClubId = cleanText(clubId).slice(0, 40);
  if (!competitionIds.length || !cleanClubId) return { ids: new Set(), cacheHit: true, fallbackDocumentsMax: 0 };
  const cleanCoverageKeys = Array.from(new Set((Array.isArray(coverageKeys) ? coverageKeys : [])
    .map((key) => cleanText(key).slice(0, 20))
    .filter(Boolean)));
  const indexRef = engagementClubCompetitionIndexRef(db, cleanClubId);
  const indexSnapshot = prefetchedIndexSnapshot || await indexRef.get();
  const indexData = indexSnapshot.exists ? indexSnapshot.data() || {} : {};
  const coveredRanges = indexData.coveredRanges && typeof indexData.coveredRanges === "object" ? indexData.coveredRanges : {};
  if (cleanCoverageKeys.length && cleanCoverageKeys.every((key) => coveredRanges[key] === true)) {
    const indexedIds = new Set(Object.values(indexData.competitionIds || {}).map(cleanText).filter(Boolean));
    return {
      ids: new Set(competitionIds.filter((competitionId) => indexedIds.has(competitionId))),
      cacheHit: true,
      fallbackDocumentsMax: 0
    };
  }
  const competitionIdByEntryId = new Map(competitionIds
    .map((competitionId) => [engagementClubEntryId(competitionId, cleanClubId), competitionId]));
  const batches = [];
  for (let index = 0; index < competitionIds.length; index += 30) {
    const batchCompetitionIds = competitionIds.slice(index, index + 30);
    const entryIds = batchCompetitionIds.map((competitionId) => engagementClubEntryId(competitionId, cleanClubId));
    batches.push(db.collection("engagementClubEntries")
      .where(FieldPath.documentId(), "in", entryIds)
      .select("competitionId")
      .get());
  }
  const snapshots = await Promise.all(batches);
  const found = new Set(snapshots.flatMap((snapshot) => snapshot.docs
    .map((doc) => cleanText(doc.data()?.competitionId || competitionIdByEntryId.get(doc.id)).slice(0, 128))
    .filter(Boolean)));
  const now = new Date().toISOString();
  const competitionIndex = Object.fromEntries([...found].map((competitionId) => [engagementClubCompetitionIndexKey(competitionId), competitionId]));
  const coverage = Object.fromEntries(cleanCoverageKeys.map((key) => [key, true]));
  await indexRef.set({
    clubId: cleanClubId,
    generatedAt: now,
    updatedAt: now,
    ...(Object.keys(competitionIndex).length ? { competitionIds: competitionIndex } : {}),
    ...(Object.keys(coverage).length ? { coveredRanges: coverage } : {})
  }, { merge: true });
  return {
    ids: found,
    cacheHit: false,
    fallbackDocumentsMax: competitionIds.length + batches.length
  };
}

function engagementPersonLicenseKey(value) {
  return cleanText(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function assertEngagementSwimmerRoleCompatibility(entryData = {}, swimmers = []) {
  const teamLeader = entryData.teamLeader || {};
  const teamLeaderLicense = engagementPersonLicenseKey(teamLeader.licenseNumber);
  const officialLicenses = new Set((Array.isArray(entryData.officials) ? entryData.officials : [])
    .map((official) => engagementPersonLicenseKey(official.licenseNumber))
    .filter(Boolean));
  swimmers.forEach((swimmer) => {
    const licenseKey = engagementPersonLicenseKey(swimmer.licenseNumber);
    if (licenseKey && teamLeaderLicense === licenseKey) {
      throw new HttpsError("failed-precondition", "Une meme personne ne peut pas etre nageur et chef d'equipe sur cette competition.");
    }
    if (licenseKey && officialLicenses.has(licenseKey)) {
      throw new HttpsError("failed-precondition", "Une meme personne ne peut pas etre nageur et officiel sur cette competition.");
    }
  });
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
  const personId = cleanText(raw.personId).slice(0, 80);
  const birthDate = cleanIsoDate(raw.birthDate);
  const sex = ["F", "M"].includes(cleanText(raw.sex).toUpperCase()) ? cleanText(raw.sex).toUpperCase() : "";
  const licenseNumber = cleanText(raw.licenseNumber).toUpperCase().slice(0, 60);
  const externalClub = raw.externalClub === true;
  const clubId = cleanText(raw.clubId).slice(0, 40);
  const clubName = cleanText(raw.clubName).slice(0, 140);
  if (!firstName || !lastName) {
    throw new HttpsError("invalid-argument", "Nom et prenom du chef d'equipe obligatoires.");
  }
  if (!externalClub && !licenseNumber) {
    throw new HttpsError("invalid-argument", "Numero de licence du chef d'equipe obligatoire.");
  }
  if (!externalClub && !ENGAGEMENT_SWIMMER_LICENSE_PATTERN.test(licenseNumber)) {
    throw new HttpsError("invalid-argument", "Le numero de licence doit respecter le format A-12-34567.");
  }
  if (externalClub && !clubName) {
    throw new HttpsError("invalid-argument", "Club du chef d'equipe obligatoire.");
  }
  if (!externalClub && (!birthDate || !sex)) {
    throw new HttpsError("invalid-argument", "Date de naissance et sexe du chef d'equipe obligatoires.");
  }
  return {
    mode,
    personId,
    firstName,
    lastName,
    birthDate: externalClub ? "" : birthDate,
    sex: externalClub ? "" : sex,
    licenseNumber,
    externalClub,
    clubId,
    clubName
  };
}

function engagementTeamLeaderComplete(teamLeader = {}) {
  if (teamLeader.mode === "renounced") return teamLeader.renunciationAccepted === true;
  return Boolean(teamLeader.mode === "person" && teamLeader.firstName && teamLeader.lastName && (teamLeader.externalClub ? teamLeader.clubName : teamLeader.licenseNumber));
}

function cleanEngagementEntryOfficial(raw = {}) {
  return {
    personId: cleanText(raw.personId).slice(0, 80),
    firstName: cleanText(raw.firstName).slice(0, 80),
    lastName: cleanText(raw.lastName).slice(0, 80),
    birthDate: cleanIsoDate(raw.birthDate),
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
    const openWater = cleanEngagementCompetitionType(competition.competitionType) === "openWater";
    const manual = openWater ? null : parseEngagementEntryTime(rawRelay?.manualEntryTime || rawRelay?.entryTime);
    if (!openWater && !manual) {
      throw new HttpsError("invalid-argument", `Temps d'engagement requis pour ${event.shortLabel || event.code}.`);
    }
    const relay = {
      relayId: cleanText(rawRelay?.relayId).slice(0, 80) || stableHash([eventCode, category, genderMode, manual?.display || "no-time"].join("|")).slice(0, 24),
      eventCode,
      category,
      genderMode,
      manualEntryTime: cleanText(rawRelay?.manualEntryTime || rawRelay?.entryTime).slice(0, 20),
      entryTime: manual?.display || "",
      entryTimeValue: manual?.value || 0,
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

function engagementKnownTimeHistory(rows = [], eventCode = "", competition = {}, limit = 10) {
  const normalizedEventCode = cleanText(eventCode).toUpperCase().replace(/\s+/g, "");
  return rows
    .filter((row) => cleanText(row.course).toUpperCase().replace(/\s+/g, "") === normalizedEventCode)
    .filter((row) => engagementQualificationRowAllowed(row, competition))
    .sort((left, right) =>
      cleanText(right.date).localeCompare(cleanText(left.date)) ||
      Number(left.timeValue || 0) - Number(right.timeValue || 0)
    )
    .slice(0, Math.max(1, Math.min(10, Number(limit || 10))))
    .map((row) => cleanFirestoreValue({
      entryTime: formatTimeValue(Number(row.timeValue || 0)) || cleanText(row.time),
      entryTimeValue: Number(row.timeValue || 0) || 0,
      sourcePerformanceId: cleanText(row.publicKey || row.performanceBaseId || row.id).slice(0, 160),
      date: cleanIsoDate(row.date),
      location: cleanText(row.location).slice(0, 160),
      pool: cleanText(row.pool).slice(0, 20),
      chrono: cleanText(row.chrono).slice(0, 40)
    }));
}

function engagementEntryTimeCacheId(swimmer = {}) {
  return stableHash([
    cleanText(swimmer.source || "performances"),
    cleanText(swimmer.identityKey || swimmer.swimmerIdentityKey || swimmer.swimmerIndexId || swimmer.id || swimmer.swimmerId)
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

const engagementEntryTimeCacheBuilds = new Map();

function engagementEntryTimeSourceKeys(swimmer = {}) {
  return Array.from(new Set([
    swimmer.identityKey,
    swimmer.swimmerIdentityKey,
    swimmer.swimmerId,
    ...(Array.isArray(swimmer.sourceIds) ? swimmer.sourceIds : [])
  ].map(cleanText).filter(Boolean))).slice(0, ENGAGEMENT_ENTRY_TIME_SOURCE_KEY_LIMIT);
}

async function readEngagementEntryTimeSourceRows(swimmer = {}) {
  const sourceKeys = engagementEntryTimeSourceKeys(swimmer);
  for (const sourceKey of sourceKeys) {
    const payload = await readPublicPerformanceJson(publicPerformanceSwimmerFilePath(sourceKey), null);
    if (!payload || !Array.isArray(payload.rows)) continue;
    return {
      sourceKey,
      rows: payload.rows.map(publicPerformanceBaseRow)
    };
  }
  return null;
}

async function rebuildEngagementEntryTimeCache(db, swimmer = {}) {
  const source = cleanText(swimmer.source || "performances");
  const indexedSource = source === "engagement" ? { sourceKey: "", rows: [] } : await readEngagementEntryTimeSourceRows(swimmer);
  if (!indexedSource) {
    console.warn("livepalmes.engagement.times.source_missing", {
      cacheId: engagementEntryTimeCacheId(swimmer),
      sourceKeyCount: engagementEntryTimeSourceKeys(swimmer).length
    });
    throw new HttpsError(
      "failed-precondition",
      "Historique des performances momentanement indisponible pour ce nageur. Aucun parcours massif n'a ete lance."
    );
  }
  const rows = indexedSource.rows;
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
    sourceDataset: source === "engagement" ? "engagement" : "public-performance-file",
    sourceKey: cleanText(indexedSource.sourceKey).slice(0, 180),
    generatedAt: now,
    updatedAt: now,
    rowCount: Object.values(events).reduce((sum, eventRows) => sum + eventRows.length, 0),
    events
  }, { merge: false });
  return engagementEntryTimeCacheRowsFromData({ events });
}

async function getEngagementEntryTimeRowsForSwimmer(swimmer = {}) {
  if (cleanText(swimmer.source) === "engagement") return [];
  const cacheId = engagementEntryTimeCacheId(swimmer);
  const cacheSnapshot = await engagementEntryTimeCacheRef(db, swimmer).get();
  const cacheReady = cacheSnapshot.exists &&
    Number(cacheSnapshot.data()?.version || 0) === ENGAGEMENT_ENTRY_TIME_CACHE_VERSION &&
    cleanText(cacheSnapshot.data()?.generatedAt);
  if (cacheReady) {
    console.info("livepalmes.engagement.times.cache", { cacheId, cacheHit: true });
    return engagementEntryTimeCacheRowsFromData(cacheSnapshot.data() || {});
  }
  if (engagementEntryTimeCacheBuilds.has(cacheId)) {
    console.info("livepalmes.engagement.times.cache", { cacheId, cacheHit: false, sharedBuild: true });
    return engagementEntryTimeCacheBuilds.get(cacheId);
  }
  console.info("livepalmes.engagement.times.cache", { cacheId, cacheHit: false, sharedBuild: false });
  const build = rebuildEngagementEntryTimeCache(db, swimmer)
    .finally(() => engagementEntryTimeCacheBuilds.delete(cacheId));
  engagementEntryTimeCacheBuilds.set(cacheId, build);
  return build;
}

function deleteEngagementEntryTimeCache(batch, db, swimmer = {}) {
  const cacheId = engagementEntryTimeCacheId(swimmer);
  if (!cacheId) return;
  batch.delete(db.collection(ENGAGEMENT_ENTRY_TIME_CACHES_COLLECTION).doc(cacheId));
}

async function invalidateEngagementEntryTimeCachesForPerformanceRows(rows = []) {
  const cacheIds = Array.from(new Set(rows
    .map((row) => engagementEntryTimeCacheId({
      source: "performances",
      identityKey: performanceSwimmerIndexKey(row),
      swimmerId: row.swimmerId
    }))
    .filter(Boolean)));
  let batch = db.batch();
  let batchSize = 0;
  const commits = [];
  cacheIds.forEach((cacheId) => {
    batch.delete(db.collection(ENGAGEMENT_ENTRY_TIME_CACHES_COLLECTION).doc(cacheId));
    batchSize += 1;
    if (batchSize >= 450) {
      commits.push(batch.commit());
      batch = db.batch();
      batchSize = 0;
    }
  });
  if (batchSize) commits.push(batch.commit());
  await Promise.all(commits);
  return cacheIds.length;
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
    const manualMode = cleanText(entry.entryTimeMode) === "manual";
    const manualRaw = manualMode
      ? cleanText(entry.manualEntryTime || entry.entryTime)
      : cleanText(entry.manualEntryTime);
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
  const licenseNumber = cleanText(raw.licenseNumber).toUpperCase().slice(0, 60);
  const licenseSeason = currentEngagementSeasonInfo();
  if (!firstName || !lastName || !birthDate || !sex || !licenseNumber) {
    throw new HttpsError("invalid-argument", "Prenom, nom, date de naissance, sexe et licence sont obligatoires.");
  }
  if (!ENGAGEMENT_SWIMMER_LICENSE_PATTERN.test(licenseNumber)) {
    throw new HttpsError("invalid-argument", "Le numero de licence doit respecter le format A-12-34567.");
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
    status: cleanText(data.status || (data.active === false ? "inactive" : "active")).slice(0, 40),
    mergedIntoId: cleanText(data.mergedIntoId).slice(0, 80),
    mergedIntoSource: cleanText(data.mergedIntoSource).slice(0, 40),
    mergedIntoName: cleanText(data.mergedIntoName).slice(0, 160),
    mergedAt: cleanText(data.mergedAt).slice(0, 40),
    mergedBy: cleanText(data.mergedBy).slice(0, 80),
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
  const firstName = cleanText(match.firstName).slice(0, 80);
  const lastName = cleanText(match.lastName).slice(0, 80);
  return cleanFirestoreValue({
    type: alertType,
    level: alertType === "inverted-identity" ? "error" : differentClub ? "warning" : "info",
    message: alertType === "inverted-identity"
      ? "Creation impossible : un nageur existe avec le nom et le prenom inverses."
      : alertType === "possible-duplicate"
      ? "Nageur ressemblant deja present dans LivePalmes."
      : differentClub
        ? "Nageur existant avec un dernier club connu different."
        : "Nageur existant avec la meme identite.",
    swimmerIndexId,
    swimmerId: cleanText(match.swimmerId || match.id).slice(0, 80),
    source: cleanText(match.source || "performances").slice(0, 40),
    identityKey: cleanText(match.identityKey).slice(0, 180),
    name: [lastName, firstName].filter(Boolean).join(" ") || cleanText(match.name).slice(0, 160),
    firstName,
    lastName,
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
  const invertedIdentityKey = engagementSwimmerIdentityKey(swimmer.lastName, swimmer.firstName, swimmer.birthDate);
  const identityKeys = Array.from(new Set([swimmer.identityKey, invertedIdentityKey].filter(Boolean)));
  const alertTypeForMatch = (match = {}) => invertedIdentityKey && invertedIdentityKey !== swimmer.identityKey && cleanText(match.identityKey) === invertedIdentityKey
    ? "inverted-identity"
    : "";
  if (identityKeys.length) {
    const exactSnapshot = await db.collection(PERFORMANCE_SWIMMERS_COLLECTION)
      .where("identityKey", "in", identityKeys)
      .limit(10)
      .get();
    exactSnapshot.docs.forEach((doc) => {
      const match = engagementClubSwimmerItem(doc);
      addAlert(engagementNewSwimmerAlertFromMatch(match, context, alertTypeForMatch(match)));
    });
    const engagementSnapshot = await db.collection("engagementClubSwimmers")
      .where("identityKey", "in", identityKeys)
      .limit(10)
      .get();
    engagementSnapshot.docs.forEach((doc) => {
      const match = engagementNewSwimmerItem(doc);
      addAlert(engagementNewSwimmerAlertFromMatch(match, context, alertTypeForMatch(match)));
    });
    intranapSwimmersIndex
      .filter((match) => identityKeys.includes(cleanText(match.identityKey)))
      .slice(0, 10)
      .forEach((match) => addAlert(engagementNewSwimmerAlertFromMatch({
        ...match,
        source: "reference"
      }, context, alertTypeForMatch(match))));
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
        if (identityKeys.includes(cleanText(match.identityKey))) return false;
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
      Number(right.type === "inverted-identity") - Number(left.type === "inverted-identity") ||
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

function engagementSwimmerLicenseNumberKey(licenseNumber = "") {
  return cleanText(licenseNumber).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function engagementSwimmerLicenseNumberId(licenseNumber = "") {
  const key = engagementSwimmerLicenseNumberKey(licenseNumber);
  return key ? stableHash(key).slice(0, 40) : "";
}

function engagementClubRosterId(clubId) {
  return stableHash(cleanText(clubId)).slice(0, 40);
}

function engagementClubRosterRef(db, clubId) {
  return db.collection(ENGAGEMENT_CLUB_ROSTERS_COLLECTION).doc(engagementClubRosterId(clubId));
}

function cleanEngagementClubActivityStatus(value = "", fallback = "active") {
  const status = cleanText(value).toLowerCase();
  return ["active", "inactive"].includes(status) ? status : fallback;
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
    clubActivityStatus: cleanEngagementClubActivityStatus(swimmer.clubActivityStatus, ""),
    clubActivityStatusSource: cleanText(swimmer.clubActivityStatusSource).slice(0, 40),
    clubActivityStatusUpdatedAt: cleanText(swimmer.clubActivityStatusUpdatedAt).slice(0, 40),
    clubActivityStatusUpdatedBy: cleanText(swimmer.clubActivityStatusUpdatedBy).slice(0, 80),
    updatedAt: cleanText(swimmer.updatedAt).slice(0, 40),
    changeRequestStatus: cleanText(swimmer.changeRequestStatus).slice(0, 40),
    changeRequestId: cleanText(swimmer.changeRequestId).slice(0, 80),
    changeRequestedAt: cleanText(swimmer.changeRequestedAt).slice(0, 40)
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
    generatedAt: now || new Date().toISOString(),
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
    generatedAt: now || new Date().toISOString(),
    updatedAt: now || new Date().toISOString(),
    swimmers: {
      [key]: FieldValue.delete()
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
    .limit(201)
    .get();
  if (snapshot.size > 200) {
    throw new HttpsError("failed-precondition", "Trop de licences historiques pour une reconstruction directe de ce club.");
  }
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

function engagementSwimmerLicenseConflictData(data = {}, id = "", source = "") {
  return cleanFirestoreValue({
    id,
    source: cleanText(source).slice(0, 40),
    swimmerIndexId: cleanText(data.swimmerIndexId || data.id).slice(0, 80),
    swimmerId: cleanText(data.swimmerId).slice(0, 80),
    firstName: cleanText(data.firstName).slice(0, 80),
    lastName: cleanText(data.lastName).slice(0, 80),
    name: cleanText(data.name).slice(0, 160),
    birthDate: cleanIsoDate(data.birthDate),
    sex: cleanText(data.sex).slice(0, 20),
    clubId: cleanText(data.clubId).slice(0, 40),
    clubName: cleanText(data.clubName).slice(0, 140),
    licenseNumber: cleanText(data.licenseNumber).slice(0, 60)
  });
}

async function findEngagementSwimmerLicenseConflict(db, swimmer = {}, ignoredSwimmerIds = []) {
  const licenseNumber = cleanText(swimmer.licenseNumber).slice(0, 60);
  const licenseKey = engagementSwimmerLicenseNumberKey(licenseNumber);
  if (!licenseKey) return null;
  const ignored = new Set((Array.isArray(ignoredSwimmerIds) ? ignoredSwimmerIds : [])
    .map((id) => cleanText(id).slice(0, 80))
    .filter(Boolean));
  const licenseNumberRefId = engagementSwimmerLicenseNumberId(licenseNumber);
  if (licenseNumberRefId) {
    const indexed = await db.collection(ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION).doc(licenseNumberRefId).get();
    if (indexed.exists) {
      const data = indexed.data() || {};
      const indexedSwimmerId = cleanText(data.swimmerIndexId || data.swimmerId).slice(0, 80);
      if (!indexedSwimmerId || !ignored.has(indexedSwimmerId)) {
        return engagementSwimmerLicenseConflictData(data, indexed.id, "license-index");
      }
    }
  }
  const collectedLicenseSnapshot = await db.collection("engagementSwimmerLicenses")
    .where("licenseNumber", "==", licenseNumber)
    .limit(2)
    .get();
  for (const doc of collectedLicenseSnapshot.docs) {
    const data = doc.data() || {};
    const indexedSwimmerId = cleanText(data.swimmerIndexId || data.swimmerId).slice(0, 80);
    if (!indexedSwimmerId || !ignored.has(indexedSwimmerId)) {
      return engagementSwimmerLicenseConflictData(data, doc.id, "license-collection");
    }
  }
  const engagementSnapshot = await db.collection("engagementClubSwimmers")
    .where("licenseNumber", "==", licenseNumber)
    .limit(2)
    .get();
  for (const doc of engagementSnapshot.docs) {
    if (!ignored.has(doc.id)) {
      return engagementSwimmerLicenseConflictData({ ...(doc.data() || {}), swimmerIndexId: doc.id }, doc.id, "engagement");
    }
  }
  const performanceSnapshot = await db.collection(PERFORMANCE_SWIMMERS_COLLECTION)
    .where("licenseNumber", "==", licenseNumber)
    .limit(2)
    .get();
  for (const doc of performanceSnapshot.docs) {
    if (!ignored.has(doc.id)) {
      return engagementSwimmerLicenseConflictData({ ...(doc.data() || {}), swimmerIndexId: doc.id }, doc.id, "performances");
    }
  }
  const referenceMatch = intranapSwimmersIndex.find((match) => engagementSwimmerLicenseNumberKey(match.licenseNumber) === licenseKey);
  if (referenceMatch && !ignored.has(cleanText(referenceMatch.id || referenceMatch.swimmerIndexId).slice(0, 80))) {
    return engagementSwimmerLicenseConflictData(referenceMatch, cleanText(referenceMatch.id || referenceMatch.swimmerIndexId), "reference");
  }
  return null;
}

async function assertNoEngagementSwimmerLicenseConflict(db, swimmer = {}, ignoredSwimmerIds = []) {
  const conflict = await findEngagementSwimmerLicenseConflict(db, swimmer, ignoredSwimmerIds);
  if (!conflict) return null;
  const name = [conflict.firstName, conflict.lastName].filter(Boolean).join(" ") || conflict.name || "un nageur existant";
  const club = engagementClubCode(conflict.clubId) || engagementClubName(conflict.clubId, conflict.clubName) || "club non renseigne";
  throw new HttpsError("already-exists", `Licence deja utilisee par ${name} (${club}). Utilisez la fiche existante au lieu de creer un doublon.`, {
    conflict
  });
}

async function engagementSwimmerRecoveryPreview(db, licenseNumber, context = {}) {
  const cleanLicense = cleanText(licenseNumber).toUpperCase().slice(0, 60);
  if (!ENGAGEMENT_SWIMMER_LICENSE_PATTERN.test(cleanLicense)) {
    throw new HttpsError("invalid-argument", "Le numero de licence doit respecter le format A-12-34567.");
  }
  const conflict = await findEngagementSwimmerLicenseConflict(db, { licenseNumber: cleanLicense });
  if (!conflict) return { found: false, licenseNumber: cleanLicense };

  const [performanceSnapshot, licenseSnapshot] = await Promise.all([
    db.collection(PERFORMANCE_SWIMMERS_COLLECTION).where("licenseNumber", "==", cleanLicense).limit(2).get(),
    db.collection("engagementSwimmerLicenses").where("licenseNumber", "==", cleanLicense).limit(2).get()
  ]);
  const conflictSwimmerId = cleanText(conflict.swimmerIndexId || conflict.swimmerId).slice(0, 80);
  let engagementDoc = null;
  if (conflictSwimmerId) {
    const snapshot = await db.collection("engagementClubSwimmers").doc(conflictSwimmerId).get();
    if (snapshot.exists && engagementSwimmerLicenseNumberKey(snapshot.data()?.licenseNumber) === engagementSwimmerLicenseNumberKey(cleanLicense)) {
      engagementDoc = snapshot;
    }
  }
  const performanceDoc = performanceSnapshot.docs[0] || null;
  const stored = engagementDoc ? engagementNewSwimmerItem(engagementDoc) : null;
  const performance = performanceDoc
    ? engagementClubRosterSwimmerItem({ ...(performanceDoc.data() || {}), id: performanceDoc.id, swimmerIndexId: performanceDoc.id, source: "performances" })
    : null;
  const swimmer = stored || performance || engagementClubRosterSwimmerItem({ ...conflict, source: conflict.source || "reference" });
  const season = currentEngagementSeasonInfo();
  const bounds = engagementSeasonBoundsFromEndYear(season.endYear);
  const publishedResult = performanceSnapshot.docs.some((doc) => {
    const date = cleanIsoDate(doc.data()?.latestDate);
    return date >= bounds.startDate && date <= bounds.endDate;
  });
  return {
    found: true,
    sameClub: cleanText(swimmer.clubId) === cleanText(context.clubId),
    eligible: cleanText(swimmer.clubId) !== cleanText(context.clubId) && !publishedResult,
    publishedResult,
    swimmer,
    source: stored ? "engagement" : performance ? "performances" : "reference",
    engagementSwimmerId: stored?.swimmerIndexId || "",
    licenseRecordIds: licenseSnapshot.docs.map((doc) => doc.id),
    season: {
      label: season.label,
      startDate: bounds.startDate,
      endDate: bounds.endDate
    }
  };
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
    clubCode: engagementClubCode(data.clubId, data.clubCode).slice(0, 40),
    clubName: engagementClubName(data.clubId, data.clubName).slice(0, 140),
    regionId: cleanText(data.regionId).slice(0, 80),
    status: cleanText(data.status || "active"),
    teamLeader: {
      mode: cleanText(teamLeader.mode),
      personId: cleanText(teamLeader.personId).slice(0, 80),
      firstName: cleanText(teamLeader.firstName),
      lastName: cleanText(teamLeader.lastName),
      birthDate: cleanIsoDate(teamLeader.birthDate),
      sex: ["F", "M"].includes(cleanText(teamLeader.sex).toUpperCase()) ? cleanText(teamLeader.sex).toUpperCase() : "",
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
      memberIds: (Array.isArray(relay.memberIds) ? relay.memberIds : [])
        .map((memberId) => cleanText(memberId).slice(0, 80))
        .filter(Boolean),
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

function engagementClubEntryHasParticipants(entry = {}) {
  const swimmerCount = Array.isArray(entry.swimmers) ? entry.swimmers.length : Math.max(0, Math.trunc(Number(entry.swimmerCount) || 0));
  const officialCount = Array.isArray(entry.officials) ? entry.officials.length : Math.max(0, Math.trunc(Number(entry.officialCount) || 0));
  const relayCount = Array.isArray(entry.relays) ? entry.relays.length : Math.max(0, Math.trunc(Number(entry.relayCount) || 0));
  return swimmerCount > 0 || officialCount > 0 || relayCount > 0;
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
  const timingType = cleanEngagementTimingType(value);
  return timingType === "manual" ? "Manuel" : timingType === "electronic" ? "Électronique" : "Non renseigné";
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

function cleanEngagementGeneratedFile(raw = {}) {
  const url = cleanText(raw.url).slice(0, 600);
  const storagePath = cleanText(raw.storagePath).slice(0, 260);
  if (!url && !storagePath) return null;
  return cleanFirestoreValue({
    type: cleanText(raw.type || "document").slice(0, 60),
    name: cleanText(raw.name || raw.fileName || "Document").slice(0, 180),
    fileName: cleanText(raw.fileName || raw.name || "document").slice(0, 180),
    contentType: cleanText(raw.contentType || "application/octet-stream").slice(0, 80),
    storagePath,
    url,
    size: Math.max(0, Math.trunc(Number(raw.size) || 0)),
    generatedAt: cleanText(raw.generatedAt).slice(0, 40)
  });
}

function cleanEngagementGeneratedFiles(rawFiles = []) {
  return (Array.isArray(rawFiles) ? rawFiles : [])
    .map(cleanEngagementGeneratedFile)
    .filter(Boolean)
    .slice(0, 30);
}

function engagementCompetitionDocumentsMetadata(raw = {}) {
  const documents = raw && typeof raw === "object" ? raw : {};
  const clubRecapPdf = cleanEngagementDocumentMetadata(documents.clubRecapPdf || {});
  const officialsPdf = cleanEngagementDocumentMetadata(documents.officialsPdf || {});
  return cleanFirestoreValue({
    ...(clubRecapPdf ? { clubRecapPdf } : {}),
    ...(officialsPdf ? { officialsPdf } : {}),
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
      : undefined,
    officialsEmail: documents.officialsEmail && typeof documents.officialsEmail === "object"
      ? {
          status: cleanText(documents.officialsEmail.status) === "sent" ? "sent" : cleanText(documents.officialsEmail.status) === "generated" ? "generated" : "pending",
          generatedAt: cleanText(documents.officialsEmail.generatedAt).slice(0, 40)
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
    relayCategoryLabelVersion: 2,
    competition: {
      id: competition.id,
      name: competition.name,
      date: competition.date,
      endDate: competition.endDate,
      location: competition.location,
      level: competition.level,
      regionId: competition.regionId,
      poolLength: competition.poolLength,
      poolLaneCount: competition.poolLaneCount,
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

function engagementPdfRelayCategoryLabel(code) {
  return {
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
  if (fees.enabled === false) return 0;
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

function engagementCompetitionStatisticsCacheRef(db, competitionId) {
  return db.collection(ENGAGEMENT_COMPETITION_STATISTICS_CACHE_COLLECTION)
    .doc(engagementCompetitionEntrySummaryId(competitionId));
}

function invalidateEngagementCompetitionStatistics(batch, db, competitionId, now = "") {
  const cleanCompetitionId = cleanText(competitionId).slice(0, 128);
  if (!cleanCompetitionId) return;
  batch.set(engagementCompetitionStatisticsCacheRef(db, cleanCompetitionId), {
    competitionId: cleanCompetitionId,
    status: "stale",
    updatedAt: now || new Date().toISOString()
  }, { merge: true });
}

function decodeEngagementCompetitionStatisticsCache(data = {}, competition = {}) {
  if (data.status !== "ready" || data.payloadEncoding !== "gzip-base64") return null;
  if (cleanText(data.competitionUpdatedAt) !== cleanText(competition.updatedAt)) return null;
  const payloadGzip = typeof data.payloadGzip === "string" ? data.payloadGzip : "";
  if (!payloadGzip || payloadGzip.length > 850000) return null;
  try {
    const payload = JSON.parse(zlib.gunzipSync(Buffer.from(payloadGzip, "base64"), {
      maxOutputLength: 10 * 1024 * 1024
    }).toString("utf8"));
    if (!payload || typeof payload !== "object" || !payload.counts || !Array.isArray(payload.events) || !Array.isArray(payload.clubs)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function encodeEngagementCompetitionStatisticsCache(payload = {}) {
  try {
    const payloadGzip = zlib.gzipSync(Buffer.from(JSON.stringify(payload), "utf8"), { level: 6 }).toString("base64");
    return payloadGzip.length <= 780000 ? payloadGzip : "";
  } catch {
    return "";
  }
}

function engagementCompetitionEntrySummaryItem(entry = {}) {
  const stats = engagementPdfEntryStats(entry);
  return cleanFirestoreValue({
    id: cleanText(entry.id || engagementClubEntryId(entry.competitionId, entry.clubId)).slice(0, 180),
    competitionId: cleanText(entry.competitionId).slice(0, 128),
    clubId: cleanText(entry.clubId).slice(0, 40),
    clubCode: engagementClubCode(entry.clubId, entry.clubCode).slice(0, 40),
    clubName: engagementClubName(entry.clubId, entry.clubName || "Club").slice(0, 140),
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
    .filter((entry) => entry.clubId && engagementClubEntryHasParticipants(entry))
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
    if (item.clubId && engagementClubEntryHasParticipants(item)) entries[item.clubId] = item;
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
  if (!engagementClubEntryHasParticipants(item)) {
    deleteEngagementCompetitionEntrySummary(batch, db, item, now);
    return;
  }
  batch.set(engagementCompetitionEntrySummaryRef(db, item.competitionId), {
    competitionId: item.competitionId,
    generatedAt: now || new Date().toISOString(),
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
    generatedAt: now || new Date().toISOString(),
    updatedAt: now || new Date().toISOString(),
    entries: {
      [clubId]: FieldValue.delete()
    }
  }, { merge: true });
}

function upsertEngagementClubCompetitionIndex(batch, db, entry = {}, now = "") {
  const competitionId = cleanText(entry.competitionId).slice(0, 128);
  const clubId = cleanText(entry.clubId).slice(0, 40);
  if (!competitionId || !clubId) return;
  batch.set(engagementClubCompetitionIndexRef(db, clubId), {
    clubId,
    generatedAt: now || new Date().toISOString(),
    updatedAt: now || new Date().toISOString(),
    competitionIds: {
      [engagementClubCompetitionIndexKey(competitionId)]: competitionId
    }
  }, { merge: true });
}

function deleteEngagementClubCompetitionIndexEntry(batch, db, entry = {}, now = "") {
  const competitionId = cleanText(entry.competitionId).slice(0, 128);
  const clubId = cleanText(entry.clubId).slice(0, 40);
  if (!competitionId || !clubId) return;
  batch.set(engagementClubCompetitionIndexRef(db, clubId), {
    updatedAt: now || new Date().toISOString(),
    competitionIds: {
      [engagementClubCompetitionIndexKey(competitionId)]: FieldValue.delete()
    }
  }, { merge: true });
}

async function syncEngagementCompetitionEntrySummaryFromChange(event = {}) {
  const before = event.data?.before?.exists ? engagementClubEntryItem(event.data.before) : null;
  const after = event.data?.after?.exists ? engagementClubEntryItem(event.data.after) : null;
  const now = new Date().toISOString();
  const batch = db.batch();
  let batchSize = 0;
  const summaryPatches = new Map();
  const clubIndexPatches = new Map();
  const entryMoved = before?.competitionId && before?.clubId && (
    !after || before.competitionId !== after.competitionId || before.clubId !== after.clubId
  );
  const summaryPatch = (competitionId) => {
    if (!summaryPatches.has(competitionId)) summaryPatches.set(competitionId, {});
    return summaryPatches.get(competitionId);
  };
  const clubIndexPatch = (clubId) => {
    if (!clubIndexPatches.has(clubId)) clubIndexPatches.set(clubId, {});
    return clubIndexPatches.get(clubId);
  };
  if (entryMoved) {
    summaryPatch(before.competitionId)[before.clubId] = FieldValue.delete();
    clubIndexPatch(before.clubId)[engagementClubCompetitionIndexKey(before.competitionId)] = FieldValue.delete();
  }
  if (after?.competitionId && after?.clubId) {
    const item = engagementCompetitionEntrySummaryItem(after);
    summaryPatch(after.competitionId)[after.clubId] = engagementClubEntryHasParticipants(item)
      ? item
      : FieldValue.delete();
    clubIndexPatch(after.clubId)[engagementClubCompetitionIndexKey(after.competitionId)] = after.competitionId;
  }
  summaryPatches.forEach((entries, competitionId) => {
    batch.set(engagementCompetitionEntrySummaryRef(db, competitionId), {
      competitionId,
      generatedAt: now,
      updatedAt: now,
      entries
    }, { merge: true });
    batchSize += 1;
  });
  clubIndexPatches.forEach((competitionIds, clubId) => {
    batch.set(engagementClubCompetitionIndexRef(db, clubId), {
      clubId,
      generatedAt: now,
      updatedAt: now,
      competitionIds
    }, { merge: true });
    batchSize += 1;
  });
  const changedCompetitionIds = new Set([before?.competitionId, after?.competitionId].filter(Boolean));
  changedCompetitionIds.forEach((competitionId) => {
    invalidateEngagementCompetitionStatistics(batch, db, competitionId, now);
    batchSize += 1;
  });
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

function engagementPdfIndividualProgramColumns(competition = {}, sex = "") {
  const eventsByCode = new Map((Array.isArray(competition.events) ? competition.events : [])
    .map((event) => [normalizeCourseCode(event.code || event.eventCode), event])
    .filter(([code]) => code));
  const genderMode = sex === "F" ? "female" : sex === "M" ? "male" : "mixed";
  const columns = [];
  const seen = new Set();
  (Array.isArray(competition.programSessions) ? competition.programSessions : []).forEach((session, sessionIndex) => {
    (Array.isArray(session.items) ? session.items : []).forEach((item) => {
      const eventCode = normalizeCourseCode(item.eventCode || item.code);
      const event = eventsByCode.get(eventCode) || ENGAGEMENT_EVENT_DEFINITION_BY_CODE.get(eventCode) || {};
      const itemGenderMode = cleanText(item.genderMode) || "mixed";
      if (!eventCode || seen.has(eventCode) || event.type === "relay" || (itemGenderMode !== "mixed" && itemGenderMode !== genderMode)) return;
      seen.add(eventCode);
      columns.push({ eventCode, label: engagementPdfEventLabel(eventCode), sessionLabel: session.label || `S${sessionIndex + 1}` });
    });
  });
  if (columns.length) return columns;
  (Array.isArray(competition.events) ? competition.events : []).forEach((event) => {
    const eventCode = normalizeCourseCode(event.code || event.eventCode);
    if (!eventCode || seen.has(eventCode) || event.type === "relay") return;
    seen.add(eventCode);
    columns.push({ eventCode, label: engagementPdfEventLabel(eventCode), sessionLabel: "" });
  });
  return columns;
}

function engagementPdfIndividualMatrix(entry = {}, competition = {}, sex = "", title = "") {
  const rows = (Array.isArray(entry.swimmers) ? entry.swimmers : [])
    .filter((swimmer) => cleanText(swimmer.sex).toUpperCase() === sex)
    .filter((swimmer) => Array.isArray(swimmer.individualEntries) && swimmer.individualEntries.length)
    .sort((left, right) => engagementPdfSwimmerName(left).localeCompare(engagementPdfSwimmerName(right), "fr"));
  if (!rows.length) return null;
  const selectedCodes = new Set(rows.flatMap((swimmer) => (swimmer.individualEntries || []).map((item) => normalizeCourseCode(item.eventCode))));
  const columns = engagementPdfIndividualProgramColumns(competition, sex);
  const fallbackColumns = Array.from(selectedCodes).map((eventCode) => ({ eventCode, label: engagementPdfEventLabel(eventCode), sessionLabel: "" }));
  return { title, rows, columns: columns.length ? columns : fallbackColumns };
}

function engagementPdfCompactSummary(doc, items = [], y) {
  const width = doc.page.width - 84;
  const height = 36;
  y = engagementPdfEnsureSpace(doc, y, height + 8);
  doc.roundedRect(42, y, width, height, 3).fill("#eef5f4");
  const itemWidth = width / items.length;
  items.forEach((item, index) => {
    const x = 52 + index * itemWidth;
    doc.font("Helvetica-Bold").fontSize(6.5).fillColor("#6b7f7a").text(item.label, x, y + 6, { width: itemWidth - 20 });
    doc.font("Helvetica").fontSize(7.5).fillColor("#102f35").text(item.value || "-", x, y + 17, { width: itemWidth - 20 });
  });
  return y + height + 8;
}

function engagementPdfDrawIndividualMatrix(doc, matrix = {}, competition = {}, y) {
  const left = 42;
  const tableWidth = doc.page.width - 84;
  const identityWidth = 92;
  const categoryWidth = 24;
  const columns = matrix.columns || [];
  if (columns.length) {
    const chunk = columns;
    const courseWidth = (tableWidth - identityWidth - categoryWidth) / chunk.length;
    const headerHeight = 30;
    const sessionGroups = chunk.reduce((groups, column, index) => {
      const previous = groups[groups.length - 1];
      if (previous && previous.label === column.sessionLabel) previous.count += 1;
      else groups.push({ label: column.sessionLabel || "Programme", start: index, count: 1 });
      return groups;
    }, []);
    const drawHeader = () => {
      const headerFill = matrix.title === "Nageuse" ? "#f2e8eb" : "#e7eef3";
      doc.rect(left, y, tableWidth, headerHeight).fill(headerFill);
      sessionGroups.forEach((group, groupIndex) => {
        const x = left + identityWidth + categoryWidth + group.start * courseWidth;
        const sessionFill = matrix.title === "Nageuse"
          ? (groupIndex % 2 ? "#eee3e6" : "#e5d7dc")
          : (groupIndex % 2 ? "#e2ebf0" : "#d5e2e9");
        doc.rect(x, y, group.count * courseWidth, 13).fill(sessionFill);
      });
      doc.font("Helvetica-Bold").fontSize(6.2).fillColor("#173b42").text(matrix.title, left + 4, y + 11, { width: identityWidth - 8 });
      doc.text("Cat.", left + identityWidth + 2, y + 11, { width: categoryWidth - 4, align: "center" });
      sessionGroups.forEach((group) => {
        const x = left + identityWidth + categoryWidth + group.start * courseWidth;
        doc.font("Helvetica-Bold").fontSize(5.6).fillColor("#274b51").text(group.label, x + 2, y + 3, { width: group.count * courseWidth - 4, align: "center" });
      });
      chunk.forEach((column, index) => {
        const x = left + identityWidth + categoryWidth + index * courseWidth;
        doc.font("Helvetica-Bold").fontSize(5.1).fillColor("#173b42").text(column.label, x + 1, y + 19, { width: courseWidth - 2, align: "center" });
      });
      doc.lineWidth(0.3).strokeColor("#c4d2d4");
      [identityWidth, identityWidth + categoryWidth, ...chunk.map((_, index) => identityWidth + categoryWidth + (index + 1) * courseWidth)].forEach((offset) => {
        doc.moveTo(left + offset, y + 13).lineTo(left + offset, y + headerHeight).stroke();
      });
      doc.lineWidth(1.15).strokeColor("#879da1");
      [identityWidth, identityWidth + categoryWidth, ...sessionGroups.slice(1).map((group) => identityWidth + categoryWidth + group.start * courseWidth), identityWidth + categoryWidth + chunk.length * courseWidth].forEach((offset) => {
        doc.moveTo(left + offset, y).lineTo(left + offset, y + headerHeight).stroke();
      });
      doc.lineWidth(0.45).strokeColor("#c4d2d4").moveTo(left + identityWidth + categoryWidth, y + 13).lineTo(left + tableWidth, y + 13).stroke();
      y += headerHeight;
    };
    y = engagementPdfEnsureSpace(doc, y, headerHeight + 23);
    drawHeader();
    matrix.rows.forEach((swimmer, rowIndex) => {
      const rowHeight = 17;
      if (y + rowHeight > doc.page.height - 57) {
        doc.addPage();
        y = typeof doc.engagementPdfContinuationHeader === "function"
          ? doc.engagementPdfContinuationHeader()
          : 42;
        drawHeader();
      }
      doc.rect(left, y, tableWidth, rowHeight).fill(rowIndex % 2 ? "#f8fbfa" : "#ffffff").stroke("#d8e5e2");
      doc.lineWidth(0.35).strokeColor("#d8e5e2");
      [identityWidth, identityWidth + categoryWidth, ...chunk.map((_, index) => identityWidth + categoryWidth + (index + 1) * courseWidth)].forEach((offset) => {
        doc.moveTo(left + offset, y).lineTo(left + offset, y + rowHeight).stroke();
      });
      doc.lineWidth(1.15).strokeColor("#879da1");
      [identityWidth, identityWidth + categoryWidth, ...sessionGroups.slice(1).map((group) => identityWidth + categoryWidth + group.start * courseWidth), identityWidth + categoryWidth + chunk.length * courseWidth].forEach((offset) => {
        doc.moveTo(left + offset, y).lineTo(left + offset, y + rowHeight).stroke();
      });
      const lastName = (cleanText(swimmer.lastName || swimmer.name) || "Nageur").toUpperCase();
      const firstName = cleanText(swimmer.firstName);
      const availableNameWidth = identityWidth - 8;
      const baseNameSize = 6.1;
      doc.font("Helvetica-Bold").fontSize(baseNameSize);
      const combinedWidth = doc.widthOfString(lastName) + (firstName ? 3 + doc.font("Helvetica").widthOfString(firstName) : 0);
      const nameSize = combinedWidth > availableNameWidth ? 5.2 : baseNameSize;
      doc.font("Helvetica-Bold").fontSize(nameSize).fillColor("#102f35").text(lastName, left + 4, y + 5, { width: availableNameWidth });
      const firstNameX = left + 6 + doc.widthOfString(lastName);
      if (firstName) doc.font("Helvetica").fontSize(nameSize).text(firstName, firstNameX, y + 5, { width: Math.max(12, left + identityWidth - 3 - firstNameX) });
      doc.font("Helvetica").fontSize(5.7).text(ageCategoryFromDates(competition.date, swimmer.birthDate) || "-", left + identityWidth + 2, y + 5.5, { width: categoryWidth - 4, align: "center" });
      const entriesByCode = new Map((swimmer.individualEntries || []).map((item) => [normalizeCourseCode(item.eventCode), item]));
      chunk.forEach((column, index) => {
        const item = entriesByCode.get(column.eventCode);
        const value = cleanText(item?.entryTime || item?.manualEntryTime);
        const x = left + identityWidth + categoryWidth + index * courseWidth;
        if (cleanEngagementCompetitionType(competition.competitionType) === "openWater" && item) {
          doc.font("Helvetica-Bold").fontSize(6).fillColor("#47745a").text("X", x + 1, y + 5.5, { width: courseWidth - 2, align: "center" });
        } else if (value) {
          const marker = cleanText(item?.entryTimeMode) === "manual" ? "*" : "";
          doc.font("Helvetica").fontSize(5.15).fillColor("#102f35").text(`${value}${marker}`, x + 1, y + 5.5, { width: courseWidth - 2, align: "center" });
        } else if (item) {
          doc.font("Helvetica-Bold").fontSize(5.4).fillColor("#6b7f7a").text("?", x + 1, y + 5.5, { width: courseWidth - 2, align: "center" });
        }
      });
      y += rowHeight;
    });
    y += 10;
  }
  return y;
}

function engagementPdfCollectRelayRows(entry = {}) {
  return (Array.isArray(entry.relays) ? entry.relays : [])
    .map((relay) => ({
      event: engagementPdfEventLabel(relay.eventCode),
      category: engagementPdfRelayCategoryLabel(relay.category),
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
    doc.fontSize(6.3).fillColor("#6b7f7a");
    doc.text(`Récapitulatif indicatif LivePalmes, sous réserve de modifications - généré le ${engagementPdfFormatDateTime(generatedAt)} - page ${index + 1}/${range.count}`, 42, doc.page.height - 52, {
      width: doc.page.width - 84,
      align: "center"
    });
  }
}

function engagementPdfEnsureSpace(doc, y, height) {
  if (y + height <= doc.page.height - 57) return y;
  doc.addPage();
  return typeof doc.engagementPdfContinuationHeader === "function"
    ? doc.engagementPdfContinuationHeader()
    : 42;
}

function engagementPdfSection(doc, title, y) {
  y = engagementPdfEnsureSpace(doc, y, 28);
  const width = doc.page.width - 84;
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#073b44").text(title, 42, y + 2, { width });
  doc.moveTo(42, y + 18).lineTo(42 + width, y + 18).lineWidth(0.6).strokeColor("#c7d6d7").stroke();
  return y + 26;
}

function engagementPdfEmptyState(doc, message, y) {
  y = engagementPdfEnsureSpace(doc, y, 20);
  doc.font("Helvetica").fontSize(8).fillColor("#6b7f7a").text(message, 46, y + 2, {
    width: doc.page.width - 92
  });
  return y + 18;
}

function engagementPdfKeyValues(doc, rows, y) {
  const colWidth = (doc.page.width - 84) / 2;
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

function engagementPdfFeesTable(doc, stats = {}, fees = {}, y) {
  const left = 42;
  const tableWidth = doc.page.width - 84;
  const columns = [
    { key: "type", label: "Type", width: 220, align: "left" },
    { key: "quantity", label: "Quantité", width: 68, align: "right" },
    { key: "rate", label: "Tarif", width: 101, align: "right" },
    { key: "subtotal", label: "Sous-total", width: 122, align: "right" }
  ];
  const scale = tableWidth / columns.reduce((sum, column) => sum + column.width, 0);
  const scaledColumns = columns.map((column) => ({ ...column, width: column.width * scale }));
  const rows = [
    {
      type: "Nageurs",
      quantity: stats.swimmerCount,
      rate: engagementPdfMoney(fees.swimmerFee),
      subtotal: engagementPdfMoney(stats.swimmerCount * (Number(fees.swimmerFee) || 0))
    },
    {
      type: "Courses individuelles",
      quantity: stats.individualCount,
      rate: engagementPdfMoney(fees.individualEventFee),
      subtotal: engagementPdfMoney(stats.individualCount * (Number(fees.individualEventFee) || 0))
    },
    {
      type: "Relais",
      quantity: stats.relayCount,
      rate: engagementPdfMoney(fees.relayFee),
      subtotal: engagementPdfMoney(stats.relayCount * (Number(fees.relayFee) || 0))
    }
  ];
  const drawCells = (row, rowY, font = "Helvetica", color = "#102f35") => {
    let x = left;
    scaledColumns.forEach((column) => {
      const rawValue = row[column.key];
      const value = rawValue === 0 ? "0" : cleanText(rawValue) || "-";
      doc.font(font).fontSize(8).fillColor(color).text(value, x + 6, rowY + 6, {
        width: column.width - 12,
        align: column.align
      });
      x += column.width;
    });
  };

  doc.rect(left, y, tableWidth, 18).fill("#e8f1f1");
  drawCells(Object.fromEntries(scaledColumns.map((column) => [column.key, column.label])), y, "Helvetica-Bold", "#173b42");
  y += 18;
  rows.forEach((row, index) => {
    doc.rect(left, y, tableWidth, 20).fill(index % 2 ? "#f8fbfa" : "#ffffff");
    doc.moveTo(left, y + 20).lineTo(left + tableWidth, y + 20).lineWidth(0.5).strokeColor("#d8e5e2").stroke();
    drawCells(row, y);
    y += 20;
  });

  doc.roundedRect(left, y, tableWidth, 24, 2).fill("#edf5f5").strokeColor("#a8bfc0").stroke();
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#073b44").text("TOTAL ESTIMÉ", left + 8, y + 7, {
    width: tableWidth - scaledColumns[3].width - 16
  });
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#073b44").text(engagementPdfMoney(engagementPdfFeeTotal({
    swimmerCount: stats.swimmerCount,
    individualCount: stats.individualCount,
    relayCount: stats.relayCount
  }, { fees })), left + tableWidth - scaledColumns[3].width + 6, y + 7, {
    width: scaledColumns[3].width - 14,
    align: "right"
  });
  y += 32;

  const paymentRows = [
    ["Paiement", fees.helloAssoUrl ? "Lien HelloAsso publié" : "Lien HelloAsso en attente de publication"],
    ["Échéance", "Avant la fin de la première journée"],
    ["Après l'échéance", `Supplément forfaitaire de ${engagementPdfMoney(fees.latePaymentSurcharge ?? 50)}`]
  ];
  doc.roundedRect(left, y, tableWidth, 50, 3).fill("#f8fbfa").strokeColor("#d8e5e2").stroke();
  paymentRows.forEach((row, index) => {
    const rowY = y + 7 + index * 13;
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#6b7f7a").text(row[0], left + 8, rowY, { width: 92 });
    doc.font("Helvetica").fontSize(8).fillColor("#102f35").text(row[1], left + 106, rowY, { width: tableWidth - 114 });
  });
  return y + 58;
}

function engagementPdfTextHeight(doc, text, width, fontSize = 8) {
  return doc.font("Helvetica").fontSize(fontSize).heightOfString(cleanText(text) || "-", { width });
}

function engagementPdfTable(doc, columns, rows, y) {
  const left = 42;
  const tableWidth = doc.page.width - 84;
  const columnsWidth = columns.reduce((sum, column) => sum + column.width, 0) || 1;
  const scaledColumns = columns.map((column) => ({ ...column, width: column.width * tableWidth / columnsWidth }));
  const headerHeight = 18;
  const drawHeader = () => {
    doc.rect(left, y, tableWidth, headerHeight).fill("#e8f1f1");
    let x = left;
    scaledColumns.forEach((column) => {
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#173b42").text(column.label, x + 5, y + 5, { width: column.width - 10 });
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
    const heights = scaledColumns.map((column) => engagementPdfTextHeight(doc, row[column.key], column.width - 10, 8));
    const rowHeight = Math.max(20, Math.ceil(Math.max(...heights)) + 10);
    if (y + rowHeight > doc.page.height - 57) {
      doc.addPage();
      y = typeof doc.engagementPdfContinuationHeader === "function"
        ? doc.engagementPdfContinuationHeader()
        : 42;
      drawHeader();
    }
    doc.rect(left, y, tableWidth, rowHeight).fill(index % 2 ? "#f8fbfa" : "#ffffff").stroke("#d8e5e2");
    let x = left;
    scaledColumns.forEach((column) => {
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
    layout: "portrait",
    margin: 42,
    bufferPages: true,
    info: {
      Title: `Récapitulatif engagements - ${competition.name || ""}`,
      Author: "LivePalmes",
      Subject: "Engagements compétition"
    }
  });

  const pageWidth = doc.page.width;
  doc.engagementPdfContinuationHeader = () => {
    const competitionLabel = cleanText(competition.name) || "Compétition";
    const clubLabel = cleanText(entry.clubName) || engagementClubCode(entry.clubId, entry.clubCode) || "Club";
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#173b42").text(`${competitionLabel} · ${clubLabel}`, 42, 24, {
      width: pageWidth - 84
    });
    doc.moveTo(42, 38).lineTo(pageWidth - 42, 38).lineWidth(0.5).strokeColor("#c7d6d7").stroke();
    return 48;
  };
  doc.rect(0, 0, pageWidth, 70).fill("#f4faf9");
  if (fs.existsSync(ENGAGEMENT_PDF_LOGO_PATH)) {
    doc.image(ENGAGEMENT_PDF_LOGO_PATH, 42, 10, { width: 70 });
  }
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#073b44").text("Récapitulatif des engagements", 125, 11, { width: pageWidth - 167 });
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#173b42").text(competition.name || "Compétition", 125, 29, { width: pageWidth - 167 });
  doc.font("Helvetica").fontSize(7).fillColor("#46625d").text([
    competition.endDate && competition.endDate !== competition.date
      ? `${engagementPdfFormatDate(competition.date)} au ${engagementPdfFormatDate(competition.endDate)}`
      : engagementPdfFormatDate(competition.date),
    competition.location,
    engagementPdfLevelLabel(competition.level)
  ].filter(Boolean).join(" · "), 125, 48, { width: pageWidth - 167 });

  let y = 86;
  const teamLeader = entry.teamLeader || {};
  const stats = engagementPdfEntryStats(entry);
  const teamLeaderLabel = teamLeader.mode === "renounced"
    ? "Renonciation au droit de réclamation"
    : [engagementPdfPersonName(teamLeader), teamLeader.licenseNumber].filter((value) => value && value !== "-").join(" · ") || "-";
  y = engagementPdfCompactSummary(doc, [
    { label: "Club", value: [entry.clubName || "-", engagementClubCode(entry.clubId, entry.clubCode)].filter(Boolean).join(" · ") },
    { label: "Chef d'équipe", value: teamLeaderLabel },
    { label: "Engagements", value: `${stats.swimmerCount} nageur${stats.swimmerCount > 1 ? "s" : ""} · ${stats.individualCount} course${stats.individualCount > 1 ? "s" : ""} · ${stats.relayCount} relais` }
  ], y);

  y = engagementPdfSection(doc, "Nageurs et courses individuelles", y);
  const individualMatrices = [
    engagementPdfIndividualMatrix(entry, competition, "F", "Nageuse"),
    engagementPdfIndividualMatrix(entry, competition, "M", "Nageur")
  ].filter(Boolean);
  if (individualMatrices.length) {
    individualMatrices.forEach((matrix) => {
      y = engagementPdfDrawIndividualMatrix(doc, matrix, competition, y);
    });
    const poolCompetition = cleanEngagementCompetitionType(competition.competitionType) === "pool";
    const hasManualTime = poolCompetition && individualMatrices.some((matrix) => matrix.rows.some((swimmer) =>
      (swimmer.individualEntries || []).some((item) => cleanText(item.entryTimeMode) === "manual")
    ));
    const hasMissingTime = poolCompetition && individualMatrices.some((matrix) => matrix.rows.some((swimmer) =>
      (swimmer.individualEntries || []).some((item) => !cleanText(item.entryTime || item.manualEntryTime))
    ));
    if (hasManualTime || hasMissingTime) {
      y = engagementPdfEnsureSpace(doc, y, 18);
      doc.font("Helvetica").fontSize(6.5).fillColor("#6b7f7a").text([
        hasManualTime ? "* temps manuel" : "",
        hasMissingTime ? "? temps à vérifier" : ""
      ].filter(Boolean).join(" · "), 42, y, { width: doc.page.width - 84 });
      y += 14;
    }
  } else {
    y = engagementPdfEmptyState(doc, "Aucun engagement individuel.", y);
  }

  y = engagementPdfSection(doc, "Relais", y);
  const relayRows = engagementPdfCollectRelayRows(entry);
  const relayColumns = cleanEngagementCompetitionType(competition.competitionType) === "openWater"
    ? [
        { key: "event", label: "Relais", width: 90 },
        { key: "category", label: "Catégorie", width: 90 },
        { key: "gender", label: "Sexe", width: 70 },
        { key: "members", label: "Relayeurs", width: 261 }
      ]
    : [
        { key: "event", label: "Relais", width: 80 },
        { key: "category", label: "Catégorie", width: 82 },
        { key: "gender", label: "Sexe", width: 62 },
        { key: "time", label: "Temps", width: 58 },
        { key: "members", label: "Relayeurs", width: 229 }
      ];
  y = relayRows.length
    ? engagementPdfTable(doc, relayColumns, relayRows, y)
    : engagementPdfEmptyState(doc, "Aucun relais engagé.", y);

  y = engagementPdfSection(doc, "Officiels", y);
  const officialRows = (Array.isArray(entry.officials) ? entry.officials : []).map((official) => ({
        name: engagementPdfPersonName(official),
        license: official.licenseNumber || "-",
        role: "Officiel"
      }));
  y = competition.officialsRequired === false
    ? engagementPdfEmptyState(doc, "Officiels non requis pour cette compétition.", y)
    : officialRows.length
      ? engagementPdfTable(doc, [
        { key: "name", label: "Nom", width: 260 },
        { key: "license", label: "Licence", width: 120 },
        { key: "role", label: "Rôle", width: 131 }
      ], officialRows, y)
      : engagementPdfEmptyState(doc, "Aucun officiel déclaré.", y);

  const fees = competition.fees || {};
  y = engagementPdfEnsureSpace(doc, y, fees.enabled === false ? 58 : 201);
  y = engagementPdfSection(doc, "Frais d'engagement", y);
  y = fees.enabled === false
    ? engagementPdfEmptyState(doc, "Aucun frais d'engagement.", y)
    : engagementPdfFeesTable(doc, stats, fees, y);

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
  const [buffer] = await storage.bucket(LIVEPALMES_STORAGE_BUCKET).file(storagePath).download();
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}

async function saveEngagementClubRecapPdfDocument(competition = {}, entry = {}, pdf = {}, sourceHash = "") {
  const generatedAt = cleanText(pdf.generatedAt) || new Date().toISOString();
  const storagePath = engagementClubRecapPdfStoragePath(competition.id || entry.competitionId, entry.clubId);
  const fileName = cleanText(pdf.fileName) || "recap-engagements-livepalmes.pdf";
  const buffer = Buffer.isBuffer(pdf.buffer) ? pdf.buffer : Buffer.from(pdf.buffer || []);
  await storage.bucket(LIVEPALMES_STORAGE_BUCKET).file(storagePath).save(buffer, {
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
  if (!engagementClubEntryHasParticipants(entry)) {
    throw new HttpsError("failed-precondition", "Aucun nageur, officiel ou relais engage pour ce club.");
  }
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

function engagementOfficialsPdfStoragePath(competitionId) {
  return [
    ENGAGEMENT_DOCUMENTS_STORAGE_PREFIX,
    engagementPdfFileName(competitionId),
    "officiels",
    "liste-officiels.pdf"
  ].join("/");
}

function engagementOfficialsPdfRows(entries = [], birthDatesByPersonId = new Map()) {
  const rows = [];
  (Array.isArray(entries) ? entries : []).forEach((entry) => {
    (Array.isArray(entry.officials) ? entry.officials : []).forEach((official) => {
      rows.push({
        club: cleanText(entry.clubName) || engagementClubCode(entry.clubId, entry.clubCode) || "-",
        clubCode: engagementClubCode(entry.clubId, entry.clubCode),
        lastName: cleanText(official.lastName).toUpperCase(),
        firstName: cleanText(official.firstName),
        birthDate: cleanIsoDate(official.birthDate) || cleanIsoDate(birthDatesByPersonId.get(cleanText(official.personId))),
        licenseNumber: cleanText(official.licenseNumber),
        personId: cleanText(official.personId)
      });
    });
  });
  if (rows.length > 5000) {
    throw new Error("La liste des officiels depasse la limite de 5 000 lignes pour un PDF.");
  }
  return rows.sort((left, right) =>
    left.club.localeCompare(right.club, "fr", { sensitivity: "base", numeric: true }) ||
    left.lastName.localeCompare(right.lastName, "fr", { sensitivity: "base" }) ||
    left.firstName.localeCompare(right.firstName, "fr", { sensitivity: "base" }) ||
    left.licenseNumber.localeCompare(right.licenseNumber, "fr", { sensitivity: "base", numeric: true })
  );
}

async function resolveEngagementOfficialsPdfRows(db, entries = []) {
  const missingPersonIds = Array.from(new Set((Array.isArray(entries) ? entries : []).flatMap((entry) =>
    (Array.isArray(entry.officials) ? entry.officials : [])
      .filter((official) => !cleanIsoDate(official.birthDate))
      .map((official) => cleanText(official.personId).slice(0, 80))
      .filter(Boolean)
  )));
  if (missingPersonIds.length > 5000) {
    throw new Error("Trop de fiches d'officiels a completer pour generer le PDF.");
  }
  const birthDatesByPersonId = new Map();
  for (let index = 0; index < missingPersonIds.length; index += 200) {
    const personIds = missingPersonIds.slice(index, index + 200);
    const snapshots = await db.getAll(...personIds.map((personId) => db.collection("engagementClubPeople").doc(personId)));
    snapshots.forEach((snapshot) => {
      if (!snapshot.exists) return;
      const birthDate = cleanIsoDate(snapshot.data()?.birthDate);
      if (birthDate) birthDatesByPersonId.set(snapshot.id, birthDate);
    });
  }
  return {
    rows: engagementOfficialsPdfRows(entries, birthDatesByPersonId),
    personLookupReadCount: missingPersonIds.length
  };
}

function engagementOfficialsPdfSourceHash(competition = {}, rows = []) {
  return stableHash(JSON.stringify({
    formatVersion: 1,
    competition: {
      id: competition.id,
      name: competition.name,
      date: competition.date,
      endDate: competition.endDate,
      location: competition.location,
      level: competition.level
    },
    rows
  }));
}

async function buildEngagementOfficialsPdf(competition = {}, rows = []) {
  const generatedAt = new Date().toISOString();
  const doc = new PDFDocument({
    size: "A4",
    layout: "portrait",
    margin: 42,
    bufferPages: true,
    info: {
      Title: `Liste des officiels - ${competition.name || ""}`,
      Author: "LivePalmes",
      Subject: "Officiels inscrits sur la compétition"
    }
  });
  const pageWidth = doc.page.width;
  doc.engagementPdfContinuationHeader = () => {
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#173b42").text(
      `${cleanText(competition.name) || "Compétition"} · Liste des officiels`,
      42,
      24,
      { width: pageWidth - 84 }
    );
    doc.moveTo(42, 38).lineTo(pageWidth - 42, 38).lineWidth(0.5).strokeColor("#c7d6d7").stroke();
    return 48;
  };
  doc.rect(0, 0, pageWidth, 70).fill("#f4faf9");
  if (fs.existsSync(ENGAGEMENT_PDF_LOGO_PATH)) doc.image(ENGAGEMENT_PDF_LOGO_PATH, 42, 10, { width: 70 });
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#073b44").text("Liste des officiels", 125, 11, { width: pageWidth - 167 });
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#173b42").text(competition.name || "Compétition", 125, 29, { width: pageWidth - 167 });
  doc.font("Helvetica").fontSize(7).fillColor("#46625d").text([
    competition.endDate && competition.endDate !== competition.date
      ? `${engagementPdfFormatDate(competition.date)} au ${engagementPdfFormatDate(competition.endDate)}`
      : engagementPdfFormatDate(competition.date),
    competition.location,
    `${rows.length} officiel${rows.length > 1 ? "s" : ""}`
  ].filter(Boolean).join(" · "), 125, 48, { width: pageWidth - 167 });

  let y = 88;
  if (rows.length) {
    y = engagementPdfTable(doc, [
      { key: "club", label: "Club", width: 145 },
      { key: "lastName", label: "Nom", width: 105 },
      { key: "firstName", label: "Prénom", width: 90 },
      { key: "birthDateLabel", label: "Date de naissance", width: 91 },
      { key: "licenseNumber", label: "Licence", width: 80 }
    ], rows.map((row) => ({ ...row, birthDateLabel: engagementPdfFormatDate(row.birthDate) })), y);
  } else {
    y = engagementPdfEmptyState(doc, "Aucun officiel déclaré pour cette compétition.", y);
  }
  const range = doc.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    doc.fontSize(6.3).fillColor("#6b7f7a").text(
      `Liste des officiels générée le ${engagementPdfFormatDateTime(generatedAt)} · page ${index + 1}/${range.count}`,
      42,
      doc.page.height - 52,
      { width: doc.page.width - 84, align: "center" }
    );
  }
  const buffer = await engagementPdfDocToBuffer(doc);
  return {
    buffer,
    generatedAt,
    officialCount: rows.length,
    fileName: `liste-officiels-${engagementPdfFileName(competition.name)}.pdf`
  };
}

async function saveEngagementOfficialsPdfDocument(competition = {}, pdf = {}, sourceHash = "") {
  const generatedAt = cleanText(pdf.generatedAt) || new Date().toISOString();
  const storagePath = engagementOfficialsPdfStoragePath(competition.id);
  const buffer = Buffer.isBuffer(pdf.buffer) ? pdf.buffer : Buffer.from(pdf.buffer || []);
  await storage.bucket(LIVEPALMES_STORAGE_BUCKET).file(storagePath).save(buffer, {
    resumable: false,
    contentType: "application/pdf",
    metadata: {
      cacheControl: "private, max-age=0, no-transform",
      metadata: {
        competitionId: cleanText(competition.id).slice(0, 128),
        generatedAt,
        sourceHash: cleanText(sourceHash).slice(0, 80)
      }
    }
  });
  const document = cleanEngagementDocumentMetadata({
    status: "generated",
    type: "officialsPdf",
    fileName: pdf.fileName,
    contentType: "application/pdf",
    storagePath,
    size: buffer.length,
    generatedAt,
    sourceHash,
    competitionId: competition.id
  });
  await db.collection("engagementCompetitions").doc(competition.id).set({
    documents: { officialsPdf: document }
  }, { merge: true });
  return document;
}

async function getOrCreateEngagementOfficialsPdf(db, competitionSnapshot, entryDocs = [], options = {}) {
  const competition = engagementCompetitionDetailItem(competitionSnapshot);
  const entries = entryDocs.map((entryDoc) => engagementClubEntryItem(entryDoc));
  const resolved = await resolveEngagementOfficialsPdfRows(db, entries);
  const sourceHash = engagementOfficialsPdfSourceHash(competition, resolved.rows);
  const existingDocument = competition.documents?.officialsPdf || null;
  if (options.force !== true && existingDocument?.storagePath && existingDocument.sourceHash === sourceHash) {
    try {
      const buffer = await readStoredEngagementClubRecapPdf(existingDocument);
      if (buffer?.length) {
        return {
          buffer,
          generatedAt: existingDocument.generatedAt,
          officialCount: resolved.rows.length,
          personLookupReadCount: resolved.personLookupReadCount,
          fileName: existingDocument.fileName || "liste-officiels-livepalmes.pdf",
          document: existingDocument,
          fromStorage: true
        };
      }
    } catch (error) {
      console.warn("engagement officials pdf storage read failed", {
        competitionId: competition.id,
        storagePath: existingDocument.storagePath,
        message: error?.message || String(error)
      });
    }
  }
  const pdf = await buildEngagementOfficialsPdf(competition, resolved.rows);
  const document = await saveEngagementOfficialsPdfDocument(competition, pdf, sourceHash);
  return {
    ...pdf,
    personLookupReadCount: resolved.personLookupReadCount,
    document,
    fromStorage: false
  };
}

function engagementTxtStoragePath(competitionId) {
  return [
    ENGAGEMENT_DOCUMENTS_STORAGE_PREFIX,
    engagementPdfFileName(competitionId),
    "export.txt"
  ].join("/");
}

function engagementTxtDownloadUrl(storagePath, token) {
  return `https://firebasestorage.googleapis.com/v0/b/${LIVEPALMES_STORAGE_BUCKET}/o/${encodeURIComponent(storagePath)}?alt=media&token=${encodeURIComponent(token)}`;
}

function engagementTxtSourceHash(competition = {}, entries = [], clubsById = new Map()) {
  return stableHash(JSON.stringify({
    format: "winpalme-v2",
    competition: {
      id: competition.id,
      name: competition.name,
      date: competition.date,
      endDate: competition.endDate,
      location: competition.location,
      level: competition.level,
      regionId: competition.regionId,
      entryDeadlineAt: competition.entryDeadlineAt,
      events: competition.events,
      programSessions: competition.programSessions
    },
    entries: entries.map((entry) => ({
      id: entry.id,
      clubId: entry.clubId,
      clubName: entry.clubName,
      regionId: entry.regionId,
      teamLeader: entry.teamLeader,
      officials: entry.officials,
      swimmers: entry.swimmers,
      relays: entry.relays,
      updatedAt: entry.updatedAt,
      club: clubsById.get(entry.clubId) || null
    }))
  }));
}

function engagementTxtSwimmerCategory(swimmer = {}, competition = {}) {
  return ageCategoryFromDates(competition.date, swimmer.birthDate) || "-";
}

function buildEngagementCompetitionTxt(competition = {}, entries = [], clubsById = new Map()) {
  const normalizedEntries = entries.map((entry) => ({
    ...entry,
    swimmers: (entry.swimmers || []).map((swimmer) => ({
      ...swimmer,
      category: engagementTxtSwimmerCategory(swimmer, competition)
    }))
  }));
  const result = buildWinPalmeCompetitionTxt(competition, normalizedEntries, clubsById);
  return {
    ...result,
    fileName: `engagements-winpalme-${engagementPdfFileName(competition.name || competition.id)}.txt`
  };
}

async function readStoredEngagementTxt(document = {}) {
  const storagePath = cleanText(document.storagePath);
  if (!storagePath) return null;
  const [buffer] = await storage.bucket(LIVEPALMES_STORAGE_BUCKET).file(storagePath).download();
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}

async function getOrCreateEngagementCompetitionTxt(competitionSnapshot, entrySnapshots = [], options = {}) {
  const competition = engagementCompetitionDetailItem(competitionSnapshot);
  const rawCompetition = competitionSnapshot.data() || {};
  const entries = entrySnapshots
    .map((entryDoc) => engagementClubEntryItem(entryDoc))
    .filter((entry) => entry.competitionId === competition.id && entry.clubId && engagementClubEntryHasParticipants(entry))
    .sort((left, right) => cleanText(left.clubName).localeCompare(cleanText(right.clubName), "fr"));
  const clubsById = await engagementClubsByIds(entries.map((entry) => entry.clubId));
  const sourceHash = engagementTxtSourceHash(competition, entries, clubsById);
  const existingDocument = rawCompetition.documents?.entriesTxt || null;
  if (options.force !== true && existingDocument?.storagePath && existingDocument.sourceHash === sourceHash) {
    try {
      const buffer = await readStoredEngagementTxt(existingDocument);
      if (buffer?.length) {
        return {
          buffer,
          generatedAt: existingDocument.generatedAt,
          fileName: existingDocument.fileName || "export-engagements-livepalmes.txt",
          document: existingDocument,
          file: cleanEngagementGeneratedFile(existingDocument),
          generatedFiles: cleanEngagementGeneratedFiles(rawCompetition.generatedFiles || []),
          entryCount: entries.length,
          fromStorage: true
        };
      }
    } catch (error) {
      console.warn("engagement txt storage read failed", {
        competitionId: competition.id,
        storagePath: existingDocument.storagePath,
        message: error?.message || String(error)
      });
    }
  }
  let txt;
  try {
    txt = buildEngagementCompetitionTxt(competition, entries, clubsById);
  } catch (error) {
    if (error?.code === "missing-club-federal-number") {
      throw new HttpsError("failed-precondition", error.message, { warnings: error.warnings || [] });
    }
    throw error;
  }
  const storagePath = engagementTxtStoragePath(competition.id);
  const token = crypto.randomUUID();
  await storage.bucket(LIVEPALMES_STORAGE_BUCKET).file(storagePath).save(txt.buffer, {
    resumable: false,
    contentType: "text/plain; charset=utf-8",
    metadata: {
      cacheControl: "private, max-age=0, no-transform",
      metadata: {
        firebaseStorageDownloadTokens: token,
        competitionId: cleanText(competition.id).slice(0, 128),
        generatedAt: txt.generatedAt,
        sourceHash
      }
    }
  });
  const url = engagementTxtDownloadUrl(storagePath, token);
  const document = cleanEngagementDocumentMetadata({
    status: "generated",
    type: "entriesTxt",
    fileName: txt.fileName,
    contentType: "text/plain; charset=utf-8",
    storagePath,
    url,
    size: txt.buffer.length,
    generatedAt: txt.generatedAt,
    sourceHash,
    competitionId: competition.id
  });
  const file = cleanEngagementGeneratedFile({
    ...document,
    type: "entriesTxt",
    name: "Export TXT engagements",
    url
  });
  const generatedFiles = [
    file,
    ...cleanEngagementGeneratedFiles(rawCompetition.generatedFiles || []).filter((item) => item.type !== "entriesTxt")
  ].slice(0, 30);
  await db.collection("engagementCompetitions").doc(competition.id).set({
    documents: {
      entriesTxt: {
        ...document,
        url
      }
    },
    generatedFiles,
    updatedAt: txt.generatedAt
  }, { merge: true });
  return {
    ...txt,
    document,
    file,
    generatedFiles,
    entryCount: entries.length,
    fromStorage: false
  };
}

function engagementMailStatusLabel(status) {
  return {
    draft: "Brouillon",
    blocked_missing_config: "Configuration mail manquante",
    ready: "Pret a envoyer",
    sent: "Envoye",
    failed: "Erreur",
    cancelled_no_participants: "Annule - aucun participant",
    cancelled_notifications_disabled: "Annule - notifications désactivées"
  }[cleanText(status)] || "Brouillon";
}

function engagementMailSecretValue(secret, envName) {
  try {
    return String(secret.value() || process.env[envName] || "");
  } catch (error) {
    return String(process.env[envName] || "");
  }
}

function engagementMailSmtpConfig() {
  const host = cleanText(engagementMailSecretValue(LIVEPALMES_SMTP_HOST, "LIVEPALMES_SMTP_HOST"));
  const port = Number(engagementMailSecretValue(LIVEPALMES_SMTP_PORT, "LIVEPALMES_SMTP_PORT") || 587);
  const user = cleanText(engagementMailSecretValue(LIVEPALMES_SMTP_USER, "LIVEPALMES_SMTP_USER"));
  const pass = engagementMailSecretValue(LIVEPALMES_SMTP_PASS, "LIVEPALMES_SMTP_PASS");
  const secureSetting = cleanText(engagementMailSecretValue(LIVEPALMES_SMTP_SECURE, "LIVEPALMES_SMTP_SECURE")).toLowerCase();
  const fromEmail = normalizeEmail(engagementMailSecretValue(LIVEPALMES_MAIL_FROM, "LIVEPALMES_MAIL_FROM") || "livepalmes@nap-ffessm.fr");
  const missing = [];
  if (!host) missing.push("LIVEPALMES_SMTP_HOST");
  if (!Number.isFinite(port) || port <= 0) missing.push("LIVEPALMES_SMTP_PORT");
  if (!user) missing.push("LIVEPALMES_SMTP_USER");
  if (!pass) missing.push("LIVEPALMES_SMTP_PASS");
  if (!fromEmail) missing.push("LIVEPALMES_MAIL_FROM");
  return {
    ready: !missing.length,
    missing,
    transport: {
      host,
      port,
      secure: secureSetting ? secureSetting === "true" : port === 465,
      auth: { user, pass }
    },
    fromEmail
  };
}

function engagementMailPreparedStatus() {
  return engagementMailSmtpConfig().ready ? "ready" : "blocked_missing_config";
}

function engagementMailPreparedReason() {
  return engagementMailSmtpConfig().ready ? "" : "Configuration technique d'envoi mail non branchee.";
}

function engagementMailJobId(payload = {}) {
  const identity = [
    cleanText(payload.type),
    cleanText(payload.competitionId),
    cleanText(payload.clubId),
    normalizeEmail(payload.toEmail)
  ];
  if (cleanText(payload.notificationId)) identity.push(cleanText(payload.notificationId));
  return stableHash(identity.join("|")).slice(0, 40);
}

function engagementMailRecipientFromUserDoc(doc) {
  const data = doc.data() || {};
  const capabilities = activeCapabilitiesFromMap(data.capabilities || {})
    .filter((capability) => ENGAGEMENT_MAIL_CAPABILITIES.includes(capability));
  return cleanFirestoreValue({
    uid: doc.id,
    email: normalizeEmail(data.email).slice(0, 180),
    firstName: cleanText(data.firstName).slice(0, 80),
    lastName: cleanText(data.lastName).slice(0, 80),
    clubId: cleanText(data.clubId).slice(0, 40),
    clubName: engagementClubName(data.clubId, data.clubName).slice(0, 140),
    regionId: cleanText(data.regionId).slice(0, 80),
    competitionNotificationsEnabled: competitionEmailNotificationsEnabled(data),
    capabilities
  });
}

function engagementMailRecipientShardNumber(uid = "") {
  return Number.parseInt(stableHash(uid).slice(0, 8), 16) % ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT;
}

function engagementMailRecipientShardRef(db, capability, shardNumber) {
  const capabilityKey = cleanText(capability).replace(/[^a-z0-9]+/gi, "_");
  return db.collection(ENGAGEMENT_MAIL_RECIPIENT_SHARDS_COLLECTION).doc(`${capabilityKey}-${shardNumber}`);
}

function engagementMailRecipientIndexStateRef(db) {
  return db.collection(ENGAGEMENT_MAIL_RECIPIENT_INDEX_STATE_COLLECTION).doc("default");
}

function engagementMailRecipientIndexKey(uid = "") {
  return stableHash(uid).slice(0, 24);
}

function engagementClubAdminDirectoryRef(db) {
  return db.collection(ENGAGEMENT_CLUB_ADMIN_DIRECTORY_COLLECTION).doc("default");
}

function engagementClubAdminDirectoryEntry(recipient = {}) {
  if (
    !recipient.uid ||
    !recipient.clubId ||
    !recipient.email ||
    !engagementRecipientHasCapability(recipient, "engagements.club.manage")
  ) return null;
  return cleanFirestoreValue({
    uid: cleanText(recipient.uid).slice(0, 128),
    email: normalizeEmail(recipient.email).slice(0, 180),
    firstName: cleanText(recipient.firstName).slice(0, 80),
    lastName: cleanText(recipient.lastName).slice(0, 80),
    clubId: cleanText(recipient.clubId).slice(0, 40)
  });
}

function engagementClubAdminDirectoryMap(recipients = []) {
  return recipients.reduce((admins, recipient) => {
    const entry = engagementClubAdminDirectoryEntry(recipient);
    if (entry) admins[engagementMailRecipientIndexKey(entry.uid)] = entry;
    return admins;
  }, {});
}

function assertEngagementClubAdminDirectorySize(admins = {}) {
  const byteLength = Buffer.byteLength(JSON.stringify(admins), "utf8");
  if (byteLength > ENGAGEMENT_CLUB_ADMIN_DIRECTORY_MAX_BYTES) {
    throw new Error(`Annuaire des administrateurs de clubs trop volumineux (${byteLength} octets).`);
  }
  return byteLength;
}

async function writeEngagementClubAdminDirectory(db, recipients = [], now = new Date().toISOString()) {
  const admins = engagementClubAdminDirectoryMap(recipients);
  const byteLength = assertEngagementClubAdminDirectorySize(admins);
  await engagementClubAdminDirectoryRef(db).set({
    status: "ready",
    admins,
    adminCount: Object.keys(admins).length,
    byteLength,
    updatedAt: now
  }, { merge: false });
  return { admins, byteLength };
}

async function updateEngagementClubAdminDirectory(db, before = null, after = null, now = new Date().toISOString()) {
  const uid = cleanText(after?.uid || before?.uid);
  if (!uid) return;
  const key = engagementMailRecipientIndexKey(uid);
  await db.runTransaction(async (transaction) => {
    const ref = engagementClubAdminDirectoryRef(db);
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists || snapshot.data()?.status !== "ready") return;
    const admins = { ...(snapshot.data()?.admins || {}) };
    const entry = engagementClubAdminDirectoryEntry(after || {});
    if (entry) admins[key] = entry;
    else delete admins[key];
    const byteLength = assertEngagementClubAdminDirectorySize(admins);
    transaction.set(ref, {
      status: "ready",
      admins,
      adminCount: Object.keys(admins).length,
      byteLength,
      updatedAt: now
    }, { merge: false });
  });
}

async function readEngagementClubAdminDirectory(db) {
  const ref = engagementClubAdminDirectoryRef(db);
  const snapshot = await ref.get();
  if (snapshot.exists && snapshot.data()?.status === "ready") {
    return {
      administrators: Object.values(snapshot.data()?.admins || {}),
      bootstrapped: false
    };
  }
  const stateSnapshot = await engagementMailRecipientIndexStateRef(db).get();
  if (stateSnapshot.data()?.status !== "ready") {
    return { administrators: [], available: false, bootstrapped: false };
  }
  const recipients = await engagementMailRecipientsFromIndex(db, ["engagements.club.manage"]);
  try {
    const directory = await writeEngagementClubAdminDirectory(db, recipients);
    return {
      administrators: Object.values(directory.admins),
      available: true,
      bootstrapped: true
    };
  } catch (error) {
    console.error("Initialisation de l'annuaire privé des administrateurs impossible.", cleanText(error?.message || error));
    return { administrators: [], available: false, bootstrapped: false };
  }
}

function engagementMailRecipientShardRefs(db, capabilities = ENGAGEMENT_MAIL_CAPABILITIES) {
  return capabilities.flatMap((capability) => Array.from(
    { length: ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT },
    (_, shardNumber) => engagementMailRecipientShardRef(db, capability, shardNumber)
  ));
}

function engagementMailRecipientShardGroups(recipients = []) {
  const groups = new Map();
  recipients.forEach((recipient) => {
    (recipient.capabilities || []).forEach((capability) => {
      if (!ENGAGEMENT_MAIL_CAPABILITIES.includes(capability)) return;
      const shardNumber = engagementMailRecipientShardNumber(recipient.uid);
      const groupKey = `${capability}|${shardNumber}`;
      if (!groups.has(groupKey)) groups.set(groupKey, { capability, shardNumber, recipients: {} });
      groups.get(groupKey).recipients[engagementMailRecipientIndexKey(recipient.uid)] = recipient;
    });
  });
  return groups;
}

async function replaceEngagementMailRecipientIndex(db, recipients = [], context = {}) {
  const now = context.now || new Date().toISOString();
  const deleteBatch = db.batch();
  engagementMailRecipientShardRefs(db).forEach((ref) => deleteBatch.delete(ref));
  await deleteBatch.commit();

  const writeBatch = db.batch();
  engagementMailRecipientShardGroups(recipients).forEach((group) => {
    writeBatch.set(engagementMailRecipientShardRef(db, group.capability, group.shardNumber), {
      capability: group.capability,
      shardNumber: group.shardNumber,
      recipients: group.recipients,
      generatedAt: now
    }, { merge: false });
  });
  writeBatch.set(engagementMailRecipientIndexStateRef(db), {
    status: "ready",
    cursor: "",
    recipientCount: recipients.length,
    generatedAt: now,
    updatedAt: now,
    source: context.source || "bounded-bootstrap"
  }, { merge: true });
  await writeBatch.commit();
  await writeEngagementClubAdminDirectory(db, recipients, now);
}

async function bootstrapEngagementMailRecipientIndex(db) {
  const snapshots = await Promise.all(ENGAGEMENT_MAIL_CAPABILITIES.map((capability) => {
    const capabilityField = new FieldPath("capabilities", capability);
    return db.collection("users")
      .where(capabilityField, "==", true)
      .limit(ENGAGEMENT_MAIL_RECIPIENT_BOOTSTRAP_LIMIT + 1)
      .get();
  }));
  if (snapshots.some((snapshot) => snapshot.size > ENGAGEMENT_MAIL_RECIPIENT_BOOTSTRAP_LIMIT)) {
    throw new HttpsError(
      "failed-precondition",
      "Index des destinataires a initialiser par lots avant de preparer les courriels."
    );
  }
  const recipientsByUid = new Map();
  snapshots.flatMap((snapshot) => snapshot.docs)
    .filter((doc) => (doc.data() || {}).status === "active")
    .forEach((doc) => recipientsByUid.set(doc.id, engagementMailRecipientFromUserDoc(doc)));
  const recipients = Array.from(recipientsByUid.values()).filter((recipient) => recipient.email && recipient.capabilities?.length);
  await replaceEngagementMailRecipientIndex(db, recipients);
  return recipients;
}

async function engagementMailRecipientsFromIndex(db, capabilities = ENGAGEMENT_MAIL_CAPABILITIES) {
  const refs = engagementMailRecipientShardRefs(db, capabilities);
  const snapshots = refs.length ? await db.getAll(...refs) : [];
  return snapshots.flatMap((snapshot) => {
    const recipients = snapshot.exists ? snapshot.data()?.recipients : null;
    return recipients && typeof recipients === "object" ? Object.values(recipients) : [];
  });
}

function engagementRecipientHasCapability(recipient = {}, capability) {
  return Array.isArray(recipient.capabilities) && recipient.capabilities.includes(capability);
}

function engagementCompetitionNotificationRecipients(recipients = []) {
  return recipients.filter((recipient) => recipient?.competitionNotificationsEnabled !== false);
}

async function engagementActiveMailRecipients(db, capabilities = ENGAGEMENT_MAIL_CAPABILITIES) {
  const mailCapabilities = capabilities.filter((capability) => ENGAGEMENT_MAIL_CAPABILITIES.includes(capability));
  if (!mailCapabilities.length) return [];
  const stateSnapshot = await engagementMailRecipientIndexStateRef(db).get();
  const indexedRecipients = stateSnapshot.data()?.status === "ready"
    ? await engagementMailRecipientsFromIndex(db, mailCapabilities)
    : await bootstrapEngagementMailRecipientIndex(db);
  const recipientsByEmail = new Map();
  indexedRecipients
    .filter((recipient) => mailCapabilities.some((capability) => engagementRecipientHasCapability(recipient, capability)))
    .filter((recipient) => recipient.email && recipient.capabilities?.length)
    .forEach((recipient) => {
      const existing = recipientsByEmail.get(recipient.email);
      if (!existing) {
        recipientsByEmail.set(recipient.email, recipient);
        return;
      }
      recipientsByEmail.set(recipient.email, {
        ...existing,
        ...recipient,
        competitionNotificationsEnabled: existing.competitionNotificationsEnabled !== false && recipient.competitionNotificationsEnabled !== false,
        capabilities: Array.from(new Set([...(existing.capabilities || []), ...(recipient.capabilities || [])]))
      });
    });
  return [...recipientsByEmail.values()];
}

exports.syncEngagementMailRecipientIndex = onDocumentWritten({
  region: REGION,
  document: "users/{uid}"
}, async (event) => {
  const uid = cleanText(event.params.uid);
  if (!uid) return;
  const before = event.data?.before?.exists ? engagementMailRecipientFromUserDoc(event.data.before) : null;
  const afterData = event.data?.after?.exists ? event.data.after.data() || {} : {};
  const after = event.data?.after?.exists && afterData.status === "active"
    ? engagementMailRecipientFromUserDoc(event.data.after)
    : null;
  const now = new Date().toISOString();
  const key = engagementMailRecipientIndexKey(uid);
  const capabilities = new Set([...(before?.capabilities || []), ...(after?.capabilities || [])]);
  if (!capabilities.size) return;
  const batch = db.batch();
  capabilities.forEach((capability) => {
    const shardNumber = engagementMailRecipientShardNumber(uid);
    const value = after?.capabilities?.includes(capability) ? after : FieldValue.delete();
    batch.set(engagementMailRecipientShardRef(db, capability, shardNumber), {
      capability,
      shardNumber,
      recipients: { [key]: value },
      generatedAt: now
    }, { merge: true });
  });
  await batch.commit();
  await updateEngagementClubAdminDirectory(db, before, after, now).catch((error) => {
    console.error("Mise à jour de l'annuaire privé des administrateurs impossible.", cleanText(error?.message || error));
  });
});

exports.rebuildEngagementMailRecipientIndexNextPage = onCall(CALLABLE_OPTIONS, async (request) => {
  assertCapability(request, "engagements.national.manage");
  const reset = request.data?.reset === true;
  const pageSize = Math.min(Math.max(Number(request.data?.pageSize || 200) || 200, 50), 250);
  const stateRef = engagementMailRecipientIndexStateRef(db);
  const stateSnapshot = await stateRef.get();
  const state = stateSnapshot.exists ? stateSnapshot.data() || {} : {};
  if (!reset && state.status !== "rebuilding") {
    throw new HttpsError("failed-precondition", "Commence la reconstruction des destinataires avec reset: true.");
  }
  const cursor = reset ? "" : cleanText(state.cursor);
  const now = new Date().toISOString();
  if (reset) {
    const deleteBatch = db.batch();
    engagementMailRecipientShardRefs(db).forEach((ref) => deleteBatch.delete(ref));
    deleteBatch.set(stateRef, { status: "rebuilding", cursor: "", processedCount: 0, updatedAt: now }, { merge: true });
    await deleteBatch.commit();
  }

  let query = db.collection("users").orderBy(FieldPath.documentId()).limit(pageSize);
  if (cursor) query = query.startAfter(cursor);
  const snapshot = await query.get();
  const recipients = snapshot.docs
    .filter((doc) => (doc.data() || {}).status === "active")
    .map(engagementMailRecipientFromUserDoc)
    .filter((recipient) => recipient.email && recipient.capabilities?.length);
  const batch = db.batch();
  engagementMailRecipientShardGroups(recipients).forEach((group) => {
    batch.set(engagementMailRecipientShardRef(db, group.capability, group.shardNumber), {
      capability: group.capability,
      shardNumber: group.shardNumber,
      recipients: group.recipients,
      generatedAt: now
    }, { merge: true });
  });
  const nextCursor = snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1].id : cursor;
  const done = snapshot.size < pageSize;
  const processedCount = (reset ? 0 : Number(state.processedCount || 0) || 0) + snapshot.size;
  batch.set(stateRef, {
    status: done ? "ready" : "rebuilding",
    cursor: done ? "" : nextCursor,
    processedCount,
    generatedAt: done ? now : cleanText(state.generatedAt),
    updatedAt: now,
    source: "paged-rebuild"
  }, { merge: true });
  await batch.commit();
  if (done) {
    const indexedRecipients = await engagementMailRecipientsFromIndex(db, ["engagements.club.manage"]);
    await writeEngagementClubAdminDirectory(db, indexedRecipients, now);
  }
  return { ok: true, done, pageCount: snapshot.size, processedCount, nextCursor: done ? "" : nextCursor };
});

async function engagementActiveClubMailRecipients(db) {
  return (await engagementActiveMailRecipients(db, ["engagements.club.manage"]))
    .filter((recipient) =>
      recipient.clubId &&
      engagementRecipientHasCapability(recipient, "engagements.club.manage")
    );
}

function engagementMailRecipientFromContext(context = {}) {
  const capabilities = [];
  if (context.national) capabilities.push("engagements.national.manage");
  else if (context.region) capabilities.push("engagements.region.manage");
  if (!context.email || !capabilities.length) return null;
  return {
    uid: context.uid || "",
    email: normalizeEmail(context.email).slice(0, 180),
    firstName: "",
    lastName: "",
    clubId: "",
    clubName: "",
    regionId: cleanText(context.regionId).slice(0, 80),
    competitionNotificationsEnabled: context.competitionNotificationsEnabled !== false,
    capabilities
  };
}

function engagementDedupMailRecipients(recipients = []) {
  const recipientsByEmail = new Map();
  recipients
    .filter((recipient) => recipient?.email)
    .forEach((recipient) => {
      const email = normalizeEmail(recipient.email);
      const existing = recipientsByEmail.get(email);
      if (!existing) {
        recipientsByEmail.set(email, { ...recipient, email });
        return;
      }
      recipientsByEmail.set(email, {
        ...existing,
        ...recipient,
        email,
        competitionNotificationsEnabled: existing.competitionNotificationsEnabled !== false && recipient.competitionNotificationsEnabled !== false,
        capabilities: Array.from(new Set([...(existing.capabilities || []), ...(recipient.capabilities || [])]))
      });
    });
  return [...recipientsByEmail.values()];
}

function engagementCompetitionOpeningRecipients(recipients = [], competition = {}, extraRecipients = []) {
  const level = cleanEngagementCompetitionLevel(competition.level);
  const regionKeys = new Set([
    cleanText(competition.regionId),
    ...cleanEngagementRegionIds(competition.invitedRegionIds, competition.regionId)
  ].map(normalizedEngagementRegionKey).filter(Boolean));
  return engagementCompetitionNotificationRecipients(
    engagementDedupMailRecipients([...extraRecipients, ...recipients])
  ).filter((recipient) => {
    if (engagementRecipientHasCapability(recipient, "engagements.national.manage")) return true;
    if (isNationalOnlyEngagementCompetitionLevel(level)) {
      return engagementRecipientHasCapability(recipient, "engagements.club.manage") ||
        engagementRecipientHasCapability(recipient, "engagements.region.manage");
    }
    const recipientRegionKey = normalizedEngagementRegionKey(recipient.regionId);
    if (!recipientRegionKey || !regionKeys.has(recipientRegionKey)) return false;
    return engagementRecipientHasCapability(recipient, "engagements.club.manage") ||
      engagementRecipientHasCapability(recipient, "engagements.region.manage");
  });
}

function engagementCompetitionDocumentRecipients(recipients = [], competition = {}) {
  const level = cleanEngagementCompetitionLevel(competition.level);
  const regionKeys = new Set([
    cleanText(competition.regionId),
    ...cleanEngagementRegionIds(competition.invitedRegionIds, competition.regionId)
  ].map(normalizedEngagementRegionKey).filter(Boolean));
  return engagementCompetitionNotificationRecipients(engagementDedupMailRecipients(recipients)).filter((recipient) => {
    if (!recipient.clubId || !engagementRecipientHasCapability(recipient, "engagements.club.manage")) return false;
    if (isNationalOnlyEngagementCompetitionLevel(level)) return true;
    const recipientRegionKey = normalizedEngagementRegionKey(recipient.regionId);
    return Boolean(recipientRegionKey && regionKeys.has(recipientRegionKey));
  });
}

function engagementCompetitionDocumentMailSubject(competition = {}, documents = []) {
  const count = documents.length;
  return `${count > 1 ? "Nouveaux documents" : "Nouveau document"} - ${competition.name || "Compétition LivePalmes"}`;
}

function engagementCompetitionDocumentMailText(competition = {}, documents = []) {
  return [
    "Bonjour,",
    "",
    `${documents.length > 1 ? "De nouveaux documents ont été mis en ligne" : "Un nouveau document a été mis en ligne"} pour la compétition suivante :`,
    "",
    `Compétition : ${competition.name || "-"}`,
    `Date : ${engagementPdfFormatDate(competition.date)}${competition.endDate && competition.endDate !== competition.date ? ` au ${engagementPdfFormatDate(competition.endDate)}` : ""}`,
    `Lieu : ${competition.location || "-"}`,
    "",
    ...documents.flatMap((document) => [
      `- ${document.title || document.fileName || "Document"}`,
      `  ${document.url || ""}`
    ]),
    "",
    "Consultez les documents depuis la fiche de la compétition dans le portail LivePalmes :",
    "",
    "https://livepalmes.web.app/portail.html#club-competitions",
    "",
    "Sportivement,",
    "Commission Nationale Nage avec Palmes - FFESSM"
  ].join("\n");
}

function engagementCompetitionDocumentMailHtml(competition = {}, documents = []) {
  const date = `${engagementPdfFormatDate(competition.date)}${competition.endDate && competition.endDate !== competition.date ? ` au ${engagementPdfFormatDate(competition.endDate)}` : ""}`;
  const documentItems = documents.map((document) => {
    const label = escapeMailHtml(document.title || document.fileName || "Document");
    const url = escapeMailHtml(document.url || "");
    return `<li><a href="${url}">${label}</a></li>`;
  }).join("");
  return [
    "<p>Bonjour,</p>",
    `<p>${documents.length > 1 ? "De nouveaux documents ont été mis en ligne" : "Un nouveau document a été mis en ligne"} pour la compétition suivante :</p>`,
    `<p><strong>Compétition :</strong> ${escapeMailHtml(competition.name || "-")}<br>`,
    `<strong>Date :</strong> ${escapeMailHtml(date)}<br>`,
    `<strong>Lieu :</strong> ${escapeMailHtml(competition.location || "-")}</p>`,
    `<ul>${documentItems}</ul>`,
    '<p><a href="https://livepalmes.web.app/portail.html#club-competitions">Accéder à la compétition dans le portail LivePalmes</a></p>',
    "<p>Sportivement,<br>Commission Nationale Nage avec Palmes - FFESSM</p>"
  ].join("");
}

function engagementRecipientsByClub(recipients = []) {
  return recipients.reduce((acc, recipient) => {
    const clubId = cleanText(recipient.clubId);
    if (!clubId) return acc;
    if (!acc.has(clubId)) acc.set(clubId, []);
    acc.get(clubId).push(recipient);
    return acc;
  }, new Map());
}

function engagementOpeningMailSubject(competition = {}) {
  return `Ouverture des engagements - ${competition.name || "Compétition LivePalmes"}`;
}

function engagementOpeningMailText(competition = {}) {
  return [
    "Bonjour,",
    "",
    "Les engagements sont désormais ouverts pour la compétition suivante :",
    "",
    `Compétition : ${competition.name || "-"}`,
    `Date : ${engagementPdfFormatDate(competition.date)}${competition.endDate && competition.endDate !== competition.date ? ` au ${engagementPdfFormatDate(competition.endDate)}` : ""}`,
    `Lieu : ${competition.location || "-"}`,
    "",
    "Pour saisir et suivre les engagements de votre club, connectez-vous au portail LivePalmes :",
    "",
    "https://livepalmes.web.app/portail.html#club-competitions",
    "",
    `Merci de finaliser et de vérifier les engagements de votre club au plus tard le ${engagementPdfFormatDateTime(competition.entryDeadlineAt)}.`,
    "",
    "Sportivement,",
    "Commission Nationale Nage avec Palmes - FFESSM"
  ].join("\n");
}

function engagementClubRecapMailSubject(competition = {}, entry = {}) {
  return `Recapitulatif des engagements - ${entry.clubName || entry.clubId || "Club"} - ${competition.name || "LivePalmes"}`;
}

function engagementClubRecapMailText(competition = {}, entry = {}) {
  const fees = competition.fees || {};
  const feeLines = fees.enabled === false
    ? ["Aucun frais d'engagement n'est demandé pour cette compétition."]
    : [
      `Total indicatif des frais d'engagement : ${engagementPdfMoney(engagementPdfFeeTotal(entry, competition))}.`,
      fees.helloAssoUrl
        ? `Paiement HelloAsso : ${fees.helloAssoUrl}`
        : "Lien HelloAsso en attente de publication.",
      "Rappel : paiement attendu avant la fin de la premiere journee de competition. Surplus forfaitaire de 50 EUR ensuite."
    ];
  return [
    `Bonjour,`,
    "",
    `Vous trouverez en piece jointe le recapitulatif des engagements de ${entry.clubName || entry.clubId || "votre club"} pour ${competition.name || "la competition"}.`,
    ...feeLines,
    "",
    "Sportivement,",
    "Commission Nationale Nage avec Palmes - FFESSM"
  ].join("\n");
}

function engagementTxtMailSubject(competition = {}) {
  return `Export WinPalme engagements - ${competition.name || "Competition LivePalmes"}`;
}

function engagementTxtMailText(competition = {}, txt = {}) {
  return [
    "Bonjour,",
    "",
    `Vous trouverez en piece jointe l'export WinPalme des engagements pour ${competition.name || "la competition"}.`,
    `Date : ${engagementPdfFormatDate(competition.date)}${competition.endDate && competition.endDate !== competition.date ? ` au ${engagementPdfFormatDate(competition.endDate)}` : ""}.`,
    `Lieu : ${competition.location || "-"}.`,
    `Fichier : ${txt.document?.fileName || txt.fileName || "export-engagements-livepalmes.txt"}.`,
    "",
    "Sportivement,",
    "Commission Nationale Nage avec Palmes - FFESSM"
  ].join("\n");
}

function engagementOfficialsMailSubject(competition = {}) {
  return `Liste des officiels - ${competition.name || "Compétition LivePalmes"}`;
}

function engagementOfficialsMailText(competition = {}, pdf = {}) {
  return [
    "Bonjour,",
    "",
    `Vous trouverez en pièce jointe la liste consolidée des officiels inscrits pour ${competition.name || "la compétition"}.`,
    `Date : ${engagementPdfFormatDate(competition.date)}${competition.endDate && competition.endDate !== competition.date ? ` au ${engagementPdfFormatDate(competition.endDate)}` : ""}.`,
    `Lieu : ${competition.location || "-"}.`,
    `Nombre d'officiels déclarés : ${Math.max(0, Math.trunc(Number(pdf.officialCount) || 0))}.`,
    "Le tableau est classé par club, puis par nom et prénom.",
    "",
    "Sportivement,",
    "Commission Nationale Nage avec Palmes - FFESSM"
  ].join("\n");
}

function engagementMailJobItemFromData(data = {}, id = "") {
  return cleanFirestoreValue({
    id: cleanText(id || data.id).slice(0, 80),
    type: cleanText(data.type).slice(0, 80),
    status: cleanText(data.status).slice(0, 80),
    statusLabel: engagementMailStatusLabel(data.status),
    competitionId: cleanText(data.competitionId).slice(0, 128),
    notificationId: cleanText(data.notificationId).slice(0, 80),
    clubId: cleanText(data.clubId).slice(0, 40),
    clubCode: engagementClubCode(data.clubId, data.clubCode).slice(0, 40),
    clubName: cleanText(data.clubName).slice(0, 140),
    toEmail: normalizeEmail(data.toEmail).slice(0, 180),
    toName: cleanText(data.toName).slice(0, 180),
    subject: cleanText(data.subject).slice(0, 220),
    attachmentCount: Array.isArray(data.attachments) ? data.attachments.length : 0,
    reason: cleanText(data.reason).slice(0, 220),
    sentAt: cleanText(data.sentAt).slice(0, 40),
    failedAt: cleanText(data.failedAt).slice(0, 40),
    createdAt: cleanText(data.createdAt).slice(0, 40),
    updatedAt: cleanText(data.updatedAt).slice(0, 40)
  });
}

async function upsertEngagementMailJob(payload = {}, now = "") {
  const id = engagementMailJobId(payload);
  if (!id || !normalizeEmail(payload.toEmail)) return null;
  const preparedAt = now || new Date().toISOString();
  const status = engagementMailPreparedStatus();
  const job = cleanFirestoreValue({
    id,
    type: cleanText(payload.type).slice(0, 80),
    status,
    reason: engagementMailPreparedReason(),
    fromEmail: "livepalmes@nap-ffessm.fr",
    toEmail: normalizeEmail(payload.toEmail).slice(0, 180),
    toName: cleanText(payload.toName).slice(0, 180),
    recipientUid: cleanText(payload.recipientUid).slice(0, 128),
    subject: cleanText(payload.subject).slice(0, 220),
    textBody: cleanText(payload.text).slice(0, 5000),
    htmlBody: String(payload.html || "").trim().slice(0, 20000),
    textPreview: cleanText(payload.text).slice(0, 1200),
    competitionId: cleanText(payload.competitionId).slice(0, 128),
    competitionName: cleanText(payload.competitionName).slice(0, 160),
    notificationId: cleanText(payload.notificationId).slice(0, 80),
    clubId: cleanText(payload.clubId).slice(0, 40),
    clubName: cleanText(payload.clubName).slice(0, 140),
    regionId: cleanText(payload.regionId).slice(0, 80),
    attachments: Array.isArray(payload.attachments) ? payload.attachments.map((attachment) => cleanFirestoreValue({
      type: cleanText(attachment.type).slice(0, 80),
      fileName: cleanText(attachment.fileName).slice(0, 180),
      contentType: cleanText(attachment.contentType).slice(0, 80),
      storagePath: cleanText(attachment.storagePath).slice(0, 260)
    })).filter((attachment) => attachment.storagePath) : [],
    preparedAt,
    updatedAt: preparedAt,
    createdAt: preparedAt
  });
  await db.collection(ENGAGEMENT_MAIL_JOBS_COLLECTION).doc(id).set({
    ...job,
    sentAt: FieldValue.delete(),
    sentBy: FieldValue.delete(),
    sentByEmail: FieldValue.delete(),
    failedAt: FieldValue.delete(),
    providerMessageId: FieldValue.delete()
  }, { merge: true });
  return engagementMailJobItemFromData(job, id);
}

async function engagementMailAttachments(job = {}) {
  const attachments = [];
  for (const attachment of Array.isArray(job.attachments) ? job.attachments : []) {
    const storagePath = cleanText(attachment.storagePath);
    if (!storagePath) continue;
    const buffer = await readStoredEngagementClubRecapPdf({ storagePath });
    if (!buffer?.length) continue;
    attachments.push({
      filename: cleanText(attachment.fileName) || "document-livepalmes.pdf",
      content: buffer,
      contentType: cleanText(attachment.contentType) || "application/pdf"
    });
  }
  return attachments;
}

function engagementMailWithNotificationPreferenceFooter(text = "", html = "", uid = "") {
  const preferenceUrl = competitionNotificationPreferenceUrl(uid);
  if (!preferenceUrl) throw new Error("Configuration du lien de gestion des notifications manquante.");
  const footerText = [
    "",
    "Vous pouvez gérer ou désactiver les notifications email LivePalmes en utilisant ce lien :",
    preferenceUrl,
    "ou depuis la rubrique Mon compte du portail LivePalmes :",
    "https://livepalmes.web.app/portail.html#mon-compte"
  ].join("\n");
  const htmlBody = html || livePalmesMailHtml(text);
  const footerHtml = [
    '<hr style="margin:24px 0;border:0;border-top:1px solid #d8e0e5">',
    '<p style="color:#66717a;font-family:Arial,sans-serif;font-size:13px;line-height:1.5">',
    `Vous pouvez gérer ou désactiver les notifications email LivePalmes en cliquant sur <a href="${escapeMailHtml(preferenceUrl)}">ce lien</a>, ou depuis la rubrique <a href="https://livepalmes.web.app/portail.html#mon-compte">« Mon compte »</a> du portail LivePalmes.</p>`
  ].join("");
  return { text: `${text}${footerText}`, html: `${htmlBody}${footerHtml}` };
}

async function sendEngagementMailJob(transporter, doc, config, context) {
  const data = doc.data() || {};
  const now = new Date().toISOString();
  const toEmail = normalizeEmail(data.toEmail);
  const subject = cleanText(data.subject).slice(0, 220);
  let text = cleanText(data.textBody || data.textPreview).slice(0, 5000);
  let html = String(data.htmlBody || "").trim().slice(0, 20000);
  if (!toEmail || !subject || !text) {
    const update = {
      status: "failed",
      reason: "Mail incomplet.",
      failedAt: now,
      updatedAt: now,
      updatedBy: context.uid || ""
    };
    await doc.ref.set(update, { merge: true });
    return engagementMailJobItemFromData({ ...data, ...update }, doc.id);
  }
  try {
    if (OPTIONAL_COMPETITION_MAIL_TYPES.has(cleanText(data.type))) {
      const content = engagementMailWithNotificationPreferenceFooter(text, html, data.recipientUid);
      text = content.text;
      html = content.html;
    }
    if (!html) html = livePalmesMailHtml(text);
    const info = await transporter.sendMail({
      from: `LivePalmes <${config.fromEmail}>`,
      to: toEmail,
      subject,
      text,
      ...(html ? { html } : {}),
      attachments: await engagementMailAttachments(data)
    });
    const update = cleanFirestoreValue({
      status: "sent",
      reason: "",
      sentAt: now,
      sentBy: context.uid || "",
      sentByEmail: context.email || "",
      providerMessageId: cleanText(info?.messageId).slice(0, 180),
      updatedAt: now,
      updatedBy: context.uid || ""
    });
    await doc.ref.set(update, { merge: true });
    return engagementMailJobItemFromData({ ...data, ...update }, doc.id);
  } catch (error) {
    const update = cleanFirestoreValue({
      status: "failed",
      reason: cleanText(error?.message || error).slice(0, 220),
      failedAt: now,
      updatedAt: now,
      updatedBy: context.uid || ""
    });
    await doc.ref.set(update, { merge: true });
    return engagementMailJobItemFromData({ ...data, ...update }, doc.id);
  }
}

function cleanEngagementClubPerson(raw = {}, context = {}) {
  const firstName = cleanText(raw.firstName).slice(0, 80);
  const lastName = cleanText(raw.lastName).slice(0, 80);
  const birthDate = cleanIsoDate(raw.birthDate);
  const sex = ["F", "M"].includes(cleanText(raw.sex).toUpperCase()) ? cleanText(raw.sex).toUpperCase() : "";
  const licenseNumber = cleanText(raw.licenseNumber).toUpperCase().slice(0, 60);
  const roles = raw.roles || {};
  const official = roles.official === true || raw.official === true;
  const teamLeader = roles.teamLeader === true || raw.teamLeader === true;
  const swimmerIndexId = cleanText(raw.swimmerIndexId).slice(0, 80);
  const swimmerSource = cleanText(raw.swimmerSource || raw.source).slice(0, 40);
  const swimmer = Boolean(swimmerIndexId);
  if (!firstName || !lastName) {
    throw new HttpsError("invalid-argument", "Nom et prenom obligatoires.");
  }
  if (!licenseNumber) {
    throw new HttpsError("invalid-argument", "Numero de licence obligatoire.");
  }
  if (!ENGAGEMENT_SWIMMER_LICENSE_PATTERN.test(licenseNumber)) {
    throw new HttpsError("invalid-argument", "Le numero de licence doit respecter le format A-12-34567.");
  }
  if (!birthDate || !sex) {
    throw new HttpsError("invalid-argument", "Date de naissance et sexe obligatoires.");
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
    swimmerIndexId,
    swimmerSource: swimmer ? (swimmerSource || "performances") : "",
    birthDate,
    sex,
    identityKey: engagementSwimmerIdentityKey(firstName, lastName, birthDate),
    roles: {
      swimmer,
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
    swimmerIndexId: cleanText(data.swimmerIndexId).slice(0, 80),
    swimmerSource: cleanText(data.swimmerSource).slice(0, 40),
    birthDate: cleanIsoDate(data.birthDate),
    sex: cleanText(data.sex).toUpperCase().slice(0, 20),
    identityKey: cleanText(data.identityKey).slice(0, 180),
    roles: {
      swimmer: roles.swimmer === true || Boolean(cleanText(data.swimmerIndexId)),
      official: roles.official === true,
      teamLeader: roles.teamLeader === true
    },
    active: data.active !== false,
    status: cleanText(data.status || (data.mergedIntoId ? "merged" : "active")).slice(0, 30),
    mergedIntoId: cleanText(data.mergedIntoId).slice(0, 80),
    mergedIntoName: cleanText(data.mergedIntoName).slice(0, 180),
    mergedAt: cleanText(data.mergedAt).slice(0, 40),
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
    swimmerIndexId: cleanText(person.swimmerIndexId).slice(0, 80),
    swimmerSource: cleanText(person.swimmerSource).slice(0, 40),
    birthDate: cleanIsoDate(person.birthDate),
    sex: cleanText(person.sex).toUpperCase().slice(0, 20),
    identityKey: cleanText(person.identityKey).slice(0, 180),
    roles: {
      swimmer: roles.swimmer === true || Boolean(cleanText(person.swimmerIndexId)),
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

function engagementClubPersonIdentityConflict(people = [], person = {}, ignoredPersonId = "") {
  const candidates = people.filter((candidate) => candidate.id && candidate.id !== ignoredPersonId);
  const licenseKey = engagementSwimmerLicenseNumberKey(person.licenseNumber);
  const sameLicense = licenseKey && candidates.find((candidate) =>
    engagementSwimmerLicenseNumberKey(candidate.licenseNumber) === licenseKey
  );
  if (sameLicense) return { type: "license", person: sameLicense };
  const identityKey = engagementSwimmerIdentityKey(person.firstName, person.lastName, person.birthDate);
  const invertedIdentityKey = engagementSwimmerIdentityKey(person.lastName, person.firstName, person.birthDate);
  const exact = identityKey && candidates.find((candidate) =>
    (candidate.identityKey || engagementSwimmerIdentityKey(candidate.firstName, candidate.lastName, candidate.birthDate)) === identityKey
  );
  if (exact) return { type: "exact", person: exact };
  const inverted = invertedIdentityKey && invertedIdentityKey !== identityKey
    ? candidates.find((candidate) =>
        (candidate.identityKey || engagementSwimmerIdentityKey(candidate.firstName, candidate.lastName, candidate.birthDate)) === invertedIdentityKey
      )
    : null;
  return inverted ? { type: "inverted", person: inverted } : null;
}

function throwEngagementClubPersonIdentityConflict(conflict = {}) {
  const person = conflict.person || {};
  const name = [person.lastName, person.firstName].filter(Boolean).join(" ") || "un membre existant";
  const reason = conflict.type === "inverted"
    ? "avec le nom et le prenom inverses"
    : conflict.type === "license"
      ? "avec le meme numero de licence"
      : "avec la meme identite";
  throw new HttpsError("already-exists", `${name} existe deja ${reason}. Utilisez cette fiche au lieu d'en creer une autre.`, {
    matchType: conflict.type,
    person: engagementClubPeopleRosterPersonItem(person)
  });
}

async function engagementClubPersonOutsideClubConflict(person = {}, clubId = "") {
  const licenseNumber = cleanText(person.licenseNumber).toUpperCase();
  const identityKey = cleanText(person.identityKey);
  const snapshots = await Promise.all([
    licenseNumber
      ? db.collection("engagementClubPeople").where("licenseNumber", "==", licenseNumber).limit(10).get()
      : Promise.resolve(null),
    identityKey
      ? db.collection("engagementClubPeople").where("identityKey", "==", identityKey).limit(10).get()
      : Promise.resolve(null)
  ]);
  for (const snapshot of snapshots) {
    const outsideClubPerson = snapshot?.docs
      .map(engagementClubPersonItem)
      .find((candidate) => candidate.clubId && candidate.clubId !== clubId && candidate.active);
    if (outsideClubPerson) return true;
  }
  return false;
}

function upsertEngagementClubPeopleRosterPerson(batch, db, person = {}, now = "") {
  const item = engagementClubPeopleRosterPersonItem(person);
  if (!item.clubId || !item.id) return;
  if (cleanText(person.status) === "merged" || cleanText(person.mergedIntoId)) {
    deleteEngagementClubPeopleRosterPerson(batch, db, item, now);
    return;
  }
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
      [personId]: FieldValue.delete()
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
    active: data.active !== false,
    status: cleanText(data.status || (data.active === false ? "inactive" : "active")).slice(0, 40),
    mergedIntoId: cleanText(data.mergedIntoId).slice(0, 80),
    mergedIntoSource: cleanText(data.mergedIntoSource).slice(0, 40),
    mergedIntoName: cleanText(data.mergedIntoName).slice(0, 160),
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

function engagementClubSwimmerMatchKeys(swimmer = {}) {
  const swimmerId = cleanText(swimmer.swimmerId);
  const licenseKey = engagementSwimmerLicenseNumberKey(swimmer.licenseNumber);
  const identityKey = normalizePerformanceSearchText(swimmer.identityKey || [swimmer.lastName, swimmer.firstName, swimmer.birthDate].filter(Boolean).join("|"));
  const swimmerIndexId = cleanText(swimmer.swimmerIndexId || swimmer.id);
  const source = cleanText(swimmer.source || "performances");
  return Array.from(new Set((swimmerId ? [
    `swimmer:${swimmerId}`,
    swimmerIndexId ? `index:${source}:${swimmerIndexId}` : ""
  ] : [
    licenseKey ? `license:${licenseKey}` : "",
    identityKey ? `identity:${identityKey}` : "",
    swimmerIndexId ? `index:${source}:${swimmerIndexId}` : ""
  ]).filter(Boolean)));
}

function engagementClubSwimmerSourceRank(source = "") {
  return {
    performances: 3,
    engagement: 2,
    reference: 1
  }[cleanText(source)] || 0;
}

function mergeEngagementClubSwimmerItems(left = {}, right = {}) {
  const rightPreferred = engagementClubSwimmerSourceRank(right.source) > engagementClubSwimmerSourceRank(left.source);
  const preferred = rightPreferred ? right : left;
  const fallback = rightPreferred ? left : right;
  const merged = { ...fallback, ...preferred };
  [
    "id", "swimmerIndexId", "swimmerId", "identityKey", "firstName", "lastName", "name", "birthDate", "sex", "category",
    "clubId", "club", "clubName", "licenseNumber", "licenseVerificationStatus", "licenseSeasonLabel", "licenseSeasonStatus",
    "changeRequestStatus", "changeRequestId", "changeRequestedAt", "clubActivityStatus", "clubActivityStatusSource",
    "clubActivityStatusUpdatedAt", "clubActivityStatusUpdatedBy"
  ].forEach((key) => {
    if (!cleanText(merged[key]) && cleanText(fallback[key])) merged[key] = fallback[key];
  });
  merged.performanceCount = Math.max(Number(left.performanceCount || 0), Number(right.performanceCount || 0));
  merged.latestDate = [cleanIsoDate(left.latestDate), cleanIsoDate(right.latestDate)].filter(Boolean).sort().pop() || "";
  merged.updatedAt = [cleanText(left.updatedAt), cleanText(right.updatedAt)].filter(Boolean).sort().pop() || "";
  merged.active = left.active !== false || right.active !== false;
  return engagementClubRosterSwimmerItem(merged);
}

function uniqueEngagementClubSwimmers(swimmers = [], limit = 800) {
  const groups = [];
  swimmers.filter((swimmer) => swimmer.swimmerIndexId).forEach((swimmer) => {
    const keys = engagementClubSwimmerMatchKeys(swimmer);
    const matchingIndexes = groups
      .map((group, index) => group.keys.some((key) => keys.includes(key)) ? index : -1)
      .filter((index) => index >= 0);
    if (!matchingIndexes.length) {
      groups.push({ item: engagementClubRosterSwimmerItem(swimmer), keys });
      return;
    }
    const targetIndex = matchingIndexes[0];
    const target = groups[targetIndex];
    target.item = mergeEngagementClubSwimmerItems(target.item, swimmer);
    target.keys = Array.from(new Set([...target.keys, ...keys, ...engagementClubSwimmerMatchKeys(target.item)]));
    matchingIndexes.slice(1).reverse().forEach((index) => {
      target.item = mergeEngagementClubSwimmerItems(target.item, groups[index].item);
      target.keys = Array.from(new Set([...target.keys, ...groups[index].keys, ...engagementClubSwimmerMatchKeys(target.item)]));
      groups.splice(index, 1);
    });
  });
  return groups.map((group) => group.item).slice(0, limit);
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
    deleteEngagementEntryTimeCache(batch, db, { ...(after || before || {}), source, swimmerIndexId: docId });
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

async function reactivateEngagementClubRosterSwimmersFromPerformanceRows(rows = [], context = {}) {
  const byClub = new Map();
  rows.filter((row) => row && row.isIntermediate !== true).forEach((row) => {
    const clubId = cleanText(row.clubId).slice(0, 40);
    const swimmerId = cleanText(row.swimmerId || row.originalSwimmerId).slice(0, 80);
    const identityKey = cleanText(row.swimmerIdentityKey).slice(0, 180);
    if (!clubId || (!swimmerId && !identityKey)) return;
    if (!byClub.has(clubId)) byClub.set(clubId, { swimmerIds: new Set(), identityKeys: new Set() });
    if (swimmerId) byClub.get(clubId).swimmerIds.add(swimmerId);
    if (identityKey) byClub.get(clubId).identityKeys.add(identityKey);
  });
  if (!byClub.size) return { affectedClubs: 0, reactivatedSwimmers: 0 };
  if (byClub.size > 200) throw new Error("Trop de clubs à réactiver dans un seul import.");
  const clubIds = Array.from(byClub.keys());
  const refs = clubIds.map((clubId) => engagementClubRosterRef(db, clubId));
  const snapshots = await db.getAll(...refs);
  const now = context.now || new Date().toISOString();
  const writer = db.bulkWriter({ throttling: { initialOpsPerSecond: 50, maxOpsPerSecond: 100 } });
  let affectedClubs = 0;
  let reactivatedSwimmers = 0;
  snapshots.forEach((snapshot, index) => {
    if (!snapshot.exists) return;
    const targets = byClub.get(clubIds[index]);
    const data = snapshot.data() || {};
    const entries = data.swimmers && typeof data.swimmers === "object" ? data.swimmers : {};
    const updates = {};
    Object.entries(entries).forEach(([key, swimmer]) => {
      const matches = targets.swimmerIds.has(cleanText(swimmer?.swimmerId)) ||
        targets.identityKeys.has(cleanText(swimmer?.identityKey));
      if (!matches || cleanEngagementClubActivityStatus(swimmer?.clubActivityStatus) === "active") return;
      updates[key] = engagementClubRosterSwimmerItem({
        ...swimmer,
        clubActivityStatus: "active",
        clubActivityStatusSource: "new-performance",
        clubActivityStatusUpdatedAt: now,
        clubActivityStatusUpdatedBy: context.actorUid || "system:performance-import"
      });
      reactivatedSwimmers += 1;
    });
    if (!Object.keys(updates).length) return;
    affectedClubs += 1;
    writer.set(snapshot.ref, { updatedAt: now, swimmers: updates }, { merge: true });
  });
  await writer.close();
  return { affectedClubs, reactivatedSwimmers };
}

function cleanIsoDateTime(value) {
  const text = cleanText(value).slice(0, 40);
  if (!text) return "";
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function cleanEngagementDeadlineAt(value) {
  const text = cleanIsoDateTime(value);
  if (!text) return "";
  const date = new Date(text);
  date.setUTCMinutes(0, 0, 0);
  return date.toISOString();
}

function isEngagementOpeningDeadlinePast(entryStatus, entryDeadlineAt, nowMs = Date.now()) {
  if (cleanEngagementEntryStatus(entryStatus) !== "open" || !entryDeadlineAt) return false;
  const deadline = new Date(entryDeadlineAt);
  return !Number.isNaN(deadline.getTime()) && deadline.getTime() <= nowMs;
}

function isEngagementOpeningTooEarly(entryStatus, competitionDate, nowMs = Date.now()) {
  if (cleanEngagementEntryStatus(entryStatus) !== "open" || !competitionDate) return false;
  const startMs = Date.parse(`${competitionDate}T00:00:00.000Z`);
  return Number.isFinite(startMs) && startMs - nowMs > 30 * 24 * 60 * 60 * 1000;
}

function cleanEngagementRegionIds(raw = [], excludedRegionId = "") {
  const values = Array.isArray(raw) ? raw : [raw];
  const excludedKey = normalizedEngagementRegionKey(excludedRegionId);
  const seen = new Set();
  return values
    .map((value) => cleanText(value).slice(0, 80))
    .filter(Boolean)
    .filter((regionId) => normalizedEngagementRegionKey(regionId) !== excludedKey)
    .filter((regionId) => {
      const key = normalizedEngagementRegionKey(regionId);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 30);
}

function cleanEngagementCompetitionPayload(raw = {}, context = {}) {
  const name = cleanText(raw.name).slice(0, 160);
  const date = cleanIsoDate(raw.date);
  const endDate = cleanIsoDate(raw.endDate) || date;
  const location = cleanText(raw.location).slice(0, 160);
  const city = cleanText(raw.city || raw.location).slice(0, 120);
  const address = cleanText(raw.address).slice(0, 300);
  const organizer = cleanText(raw.organizer).slice(0, 160);
  const publicDescription = cleanText(raw.publicDescription).slice(0, 3000);
  const level = cleanEngagementCompetitionLevel(raw.level);
  const entryDeadlineAt = cleanEngagementDeadlineAt(raw.entryDeadlineAt);
  const computerEmail = cleanOptionalEmail(raw.computerEmail, "Email du responsable informatique");
  const officialsManagerEmail = cleanOptionalEmail(raw.officialsManagerEmail, "Email du responsable juge");
  const entryStatus = cleanEngagementEntryStatus(raw.entryStatus);
  const competitionType = cleanEngagementCompetitionType(raw.competitionType);
  const waterBodyType = competitionType === "openWater" ? cleanEngagementWaterBodyType(raw.waterBodyType) : "";
  const poolLength = competitionType === "pool" ? cleanEngagementPoolLength(raw.poolLength) : "";
  const poolLaneCount = competitionType === "pool" ? cleanEngagementPoolLaneCount(raw.poolLaneCount) : 0;
  const timingType = cleanEngagementTimingType(raw.timingType);
  const qualificationTimesMode = competitionType === "openWater" ? "all" : cleanEngagementQualificationTimesMode(raw.qualificationTimesMode);
  const qualificationStartDate = qualificationTimesMode === "period" ? cleanIsoDate(raw.qualificationStartDate) : "";
  const qualificationEndDate = qualificationTimesMode === "period" ? cleanIsoDate(raw.qualificationEndDate) : "";
  const missingEntryTimeMode = competitionType === "openWater" ? "none" : cleanEngagementMissingEntryTimeMode(raw.missingEntryTimeMode);
  const maxEventsPerSwimmer = cleanEngagementMaxEventsPerSwimmer(raw.maxEventsPerSwimmer);
  const requestedRegionId = cleanText(raw.regionId).slice(0, 80);
  const regionId = isNationalOnlyEngagementCompetitionLevel(level) ? "" : (context.national ? requestedRegionId : context.regionId);
  const invitedRegionIds = isNationalOnlyEngagementCompetitionLevel(level) ? [] : cleanEngagementRegionIds(raw.invitedRegionIds, regionId);

  if (!context.national && !context.region) {
    throw new HttpsError("permission-denied", "Droit creation competition engagements requis.");
  }
  if (!context.national && isNationalOnlyEngagementCompetitionLevel(level)) {
    throw new HttpsError("permission-denied", "Une competition nationale doit etre creee par le niveau national.");
  }
  if (!context.national && entryStatus === "closed") {
    throw new HttpsError("permission-denied", "La fermeture des engagements est automatique apres la date de cloture.");
  }
  if (!name || !date || !location) {
    throw new HttpsError("invalid-argument", "Nom, date et lieu sont obligatoires.");
  }
  if (endDate && endDate < date) {
    throw new HttpsError("invalid-argument", "La date de fin doit etre egale ou posterieure a la date de debut.");
  }
  if (!isNationalOnlyEngagementCompetitionLevel(level) && !regionId) {
    throw new HttpsError("invalid-argument", "Region obligatoire pour une competition departementale ou regionale.");
  }
  if (qualificationTimesMode === "period" && (!qualificationStartDate || !qualificationEndDate)) {
    throw new HttpsError("invalid-argument", "Periode des temps d'engagement incomplete.");
  }
  if (qualificationTimesMode === "period" && qualificationStartDate > qualificationEndDate) {
    throw new HttpsError("invalid-argument", "La fin de periode des temps doit etre apres le debut.");
  }
  if (entryStatus === "open" && !entryDeadlineAt) {
    throw new HttpsError("failed-precondition", "Renseignez la date et l'heure de cloture avant d'ouvrir les engagements.");
  }
  if (isEngagementOpeningDeadlinePast(entryStatus, entryDeadlineAt)) {
    throw new HttpsError("failed-precondition", "Impossible d'ouvrir les engagements : la date de cloture est depassee.");
  }
  if (isEngagementOpeningTooEarly(entryStatus, date)) {
    throw new HttpsError("failed-precondition", "Impossible d'ouvrir les engagements plus de 30 jours avant la competition.");
  }
  if (entryStatus === "open" && !timingType) {
    throw new HttpsError("failed-precondition", "Renseignez le chronometrage avant d'ouvrir les engagements.");
  }
  if (entryStatus === "open" && competitionType === "pool" && (!poolLength || !poolLaneCount)) {
    throw new HttpsError("failed-precondition", "Renseignez le bassin et le nombre de lignes d'eau avant d'ouvrir les engagements.");
  }

  const events = Object.prototype.hasOwnProperty.call(raw, "events")
    ? cleanEngagementCompetitionEvents(raw.events, { competitionType })
    : null;

  return {
    name,
    date,
    endDate,
    location,
    city,
    address,
    organizer,
    publicDescription,
    regionId,
    invitedRegionIds,
    level,
    competitionType,
    waterBodyType,
    entryDeadlineAt,
    computerEmail,
    officialsManagerEmail,
    entryStatus,
    publicationStatus: cleanPublicCalendarPublicationStatus(raw.publicationStatus),
    canceled: raw.canceled === true,
    officialsRequired: raw.officialsRequired === true,
    poolLength,
    poolLaneCount,
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
  if (isNationalOnlyEngagementCompetitionLevel(competition.level)) {
    throw new HttpsError("permission-denied", "Competition nationale reservee au niveau national.");
  }
  if (!engagementRegionsMatch(competition.regionId, context.regionId)) {
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
  const startedAt = Date.now();
  const manageOnly = request.data?.manageOnly === true;
  const managementContext = manageOnly ? await engagementAccessContext(request) : null;
  const clubContext = manageOnly ? null : await engagementClubAccessContext(request);
  if (manageOnly && !managementContext.national && (!managementContext.region || !managementContext.regionId)) {
    throw new HttpsError("permission-denied", "Droit gestion competition engagements requis.");
  }
  const rawRanges = Array.isArray(request.data?.ranges) && request.data.ranges.length
    ? request.data.ranges.slice(0, 2)
    : [{ fromDate: request.data?.fromDate, toDate: request.data?.toDate }];
  const ranges = rawRanges.map((rawRange = {}) => {
    const fromDate = cleanIsoDate(rawRange.fromDate) || new Date().toISOString().slice(0, 10);
    const season = engagementSeasonBoundsFromEndYear(engagementSeasonEndYearFromIsoDate(fromDate));
    return {
      startDate: fromDate || season.startDate,
      endDate: cleanIsoDate(rawRange.toDate) || season.endDate,
      season
    };
  });
  const limit = Math.min(1200, Math.max(10, Math.trunc(Number(request.data?.limit) || 250)));
  const regionId = cleanText(request.data?.regionId).slice(0, 80);
  const level = ENGAGEMENT_COMPETITION_LEVELS.has(cleanText(request.data?.level))
    ? cleanText(request.data.level)
    : "";
  const entryStatus = ENGAGEMENT_ENTRY_STATUSES.has(cleanText(request.data?.entryStatus))
    ? cleanText(request.data.entryStatus)
    : "";
  const seasonEndYears = Array.from(new Set(ranges.map((range) => range.season.endYear)));
  const calendarRefs = seasonEndYears.map((endYear) => engagementCompetitionCalendarRef(db, endYear));
  const clubEntryIndexRef = clubContext ? engagementClubCompetitionIndexRef(db, clubContext.clubId) : null;
  const prefetchedSnapshots = await db.getAll(...calendarRefs, ...[clubEntryIndexRef].filter(Boolean));
  const calendarSnapshots = prefetchedSnapshots.slice(0, calendarRefs.length);
  const clubEntryIndexSnapshot = clubEntryIndexRef ? prefetchedSnapshots[calendarRefs.length] : null;
  const calendarByEndYear = new Map(calendarSnapshots.map((snapshot, index) => [seasonEndYears[index], snapshot]));
  const calendarReady = calendarSnapshots.every((snapshot) => snapshot?.exists && cleanText(snapshot.data()?.generatedAt));
  const allCalendarCompetitions = Array.from(new Map(calendarSnapshots.flatMap((snapshot) => {
    const items = snapshot?.exists ? engagementCompetitionCalendarItemsFromData(snapshot.data() || {}) : [];
    return items.map((competition) => [competition.id, competition]);
  })).values());
  const calendarCompetitions = Array.from(new Map(ranges.flatMap((range) => {
    const snapshot = calendarByEndYear.get(range.season.endYear);
    const items = snapshot?.exists ? engagementCompetitionCalendarItemsFromData(snapshot.data() || {}) : [];
    return filterEngagementCompetitionCalendarItems(items, {
      startDate: range.startDate,
      endDate: range.endDate,
      regionId,
      level,
      entryStatus
    });
  }).map((competition) => [competition.id, competition])).values())
    .filter((competition) => !manageOnly || managementContext.national || (
      !isNationalOnlyEngagementCompetitionLevel(competition.level) &&
      engagementRegionsMatch(competition.regionId, managementContext.regionId)
    ))
    .slice(0, limit);
  const clubEntryIndexResult = clubContext
    ? await engagementClubEntryCompetitionIds(allCalendarCompetitions, clubContext.clubId, seasonEndYears.map(String), clubEntryIndexSnapshot)
    : { ids: new Set(), cacheHit: true, fallbackDocumentsMax: 0 };
  const competitions = calendarCompetitions.map((competition) => clubContext
    ? { ...competition, clubEntryExists: clubEntryIndexResult.ids.has(competition.id) }
    : competition);

  return {
    ok: true,
    collection: ENGAGEMENT_COMPETITION_CALENDARS_COLLECTION,
    fromDate: ranges[0].startDate,
    toDate: ranges[ranges.length - 1].endDate,
    ranges: ranges.map((range) => ({
      fromDate: range.startDate,
      toDate: range.endDate,
      seasonStartYear: range.season.startYear,
      seasonEndYear: range.season.endYear
    })),
    seasonStartYear: ranges[0].season.startYear,
    seasonEndYear: ranges[0].season.endYear,
    calendarGenerated: false,
    readStats: portalReadStats("listEngagementCompetitions", startedAt, {
      baseDocuments: 1 + calendarSnapshots.length + (clubContext ? 1 : 0),
      variableDocumentsMax: clubEntryIndexResult.fallbackDocumentsMax,
      cacheHit: Boolean(calendarReady && clubEntryIndexResult.cacheHit)
    }),
    competitions
  };
});

exports.listEngagementCalendarEvents = onCall(CALLABLE_OPTIONS, async (request) => {
  const startedAt = Date.now();
  const context = await engagementAccessContext(request);
  if (!context.national && (!context.region || !context.regionId)) {
    throw new HttpsError("permission-denied", "Droit de gestion du calendrier requis.");
  }
  const rawRanges = Array.isArray(request.data?.ranges) && request.data.ranges.length
    ? request.data.ranges.slice(0, 2)
    : [{ fromDate: request.data?.fromDate, toDate: request.data?.toDate }];
  const ranges = rawRanges.map((rawRange = {}) => {
    const startDate = cleanIsoDate(rawRange.fromDate) || new Date().toISOString().slice(0, 10);
    const season = engagementSeasonBoundsFromEndYear(engagementSeasonEndYearFromIsoDate(startDate));
    return {
      startDate,
      endDate: cleanIsoDate(rawRange.toDate) || season.endDate,
      season
    };
  });
  const seasonEndYears = Array.from(new Set(ranges.map((range) => range.season.endYear)));
  const refs = seasonEndYears.map((endYear) => engagementCalendarEventCalendarRef(db, endYear));
  const snapshots = await db.getAll(...refs);
  const byEndYear = new Map(snapshots.map((snapshot, index) => [seasonEndYears[index], snapshot]));
  const events = Array.from(new Map(ranges.flatMap((range) => {
    const snapshot = byEndYear.get(range.season.endYear);
    const items = snapshot?.exists ? engagementCalendarEventItemsFromData(snapshot.data() || {}) : [];
    return items
      .filter((item) => item.date >= range.startDate && item.date <= range.endDate)
      .map((item) => [item.id, item]);
  })).values())
    .filter((item) => context.national || (
      !isNationalOnlyEngagementCompetitionLevel(item.level) &&
      engagementRegionsMatch(item.regionId, context.regionId)
    ))
    .sort((left, right) => cleanText(left.date).localeCompare(cleanText(right.date)) || cleanText(left.name).localeCompare(cleanText(right.name), "fr"))
    .slice(0, 1200);
  return {
    ok: true,
    events,
    readStats: portalReadStats("listEngagementCalendarEvents", startedAt, {
      baseDocuments: 1 + snapshots.length,
      variableDocumentsMax: 0,
      cacheHit: snapshots.every((snapshot) => snapshot.exists && cleanText(snapshot.data()?.generatedAt))
    })
  };
});

exports.getEngagementCalendarEvent = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  const calendarEventId = cleanText(request.data?.calendarEventId).slice(0, 128);
  if (!calendarEventId) throw new HttpsError("invalid-argument", "Evenement requis.");
  const snapshot = await db.collection(ENGAGEMENT_CALENDAR_EVENTS_COLLECTION).doc(calendarEventId).get();
  if (!snapshot.exists) throw new HttpsError("not-found", "Evenement introuvable.");
  assertCanManageEngagementCompetition(context, snapshot.data() || {});
  return {
    ok: true,
    event: engagementCalendarEventDetailItem(snapshot, { includeDocumentUploader: true })
  };
});

exports.createEngagementCalendarEvent = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  const eventData = cleanEngagementCalendarEventPayload(request.data || {}, context);
  const now = new Date().toISOString();
  const ref = db.collection(ENGAGEMENT_CALENDAR_EVENTS_COLLECTION).doc();
  const payload = {
    ...eventData,
    publicationStatus: "draft",
    clubDocuments: [],
    createdAt: now,
    createdBy: context.uid,
    updatedAt: now,
    updatedBy: context.uid
  };
  await ref.set(payload);
  await writeAuditLog("engagementCalendarEvent.created", context.uid, {
    calendarEventId: ref.id,
    name: payload.name,
    date: payload.date,
    eventType: payload.eventType,
    regionId: payload.regionId,
    level: payload.level
  });
  return { ok: true, event: engagementCalendarEventDetailItem({ id: ref.id, data: () => payload }, { includeDocumentUploader: true }) };
});

exports.updateEngagementCalendarEvent = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  const calendarEventId = cleanText(request.data?.calendarEventId).slice(0, 128);
  if (!calendarEventId) throw new HttpsError("invalid-argument", "Evenement requis.");
  const ref = db.collection(ENGAGEMENT_CALENDAR_EVENTS_COLLECTION).doc(calendarEventId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "Evenement introuvable.");
  assertCanManageEngagementCompetition(context, snapshot.data() || {});
  const eventData = cleanEngagementCalendarEventPayload(request.data || {}, context);
  assertCanManageEngagementCompetition(context, eventData);
  const now = new Date().toISOString();
  const payload = { ...eventData, updatedAt: now, updatedBy: context.uid };
  await ref.set(payload, { merge: true });
  await writeAuditLog("engagementCalendarEvent.updated", context.uid, {
    calendarEventId,
    name: payload.name,
    date: payload.date,
    eventType: payload.eventType,
    publicationStatus: payload.publicationStatus,
    canceled: payload.canceled
  });
  return {
    ok: true,
    event: engagementCalendarEventDetailItem({
      id: calendarEventId,
      data: () => ({ ...snapshot.data(), ...payload })
    }, { includeDocumentUploader: true })
  };
});

exports.deleteEngagementCalendarEvent = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  const calendarEventId = cleanText(request.data?.calendarEventId).slice(0, 128);
  if (!calendarEventId) throw new HttpsError("invalid-argument", "Evenement requis.");
  const ref = db.collection(ENGAGEMENT_CALENDAR_EVENTS_COLLECTION).doc(calendarEventId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "Evenement introuvable.");
  assertCanManageEngagementCompetition(context, snapshot.data() || {});
  const data = snapshot.data() || {};
  await ref.delete();
  const documents = cleanCompetitionDocuments(data.clubDocuments || [], { includeUploader: true });
  const deletionResults = await Promise.allSettled(documents.filter(hasManagedEngagementCompetitionDocumentStorage).map((document) =>
    storage.bucket(LIVEPALMES_STORAGE_BUCKET)
      .file(assertEngagementCompetitionDocumentPath(document.storagePath))
      .delete({ ignoreNotFound: true })
  ));
  await writeAuditLog("engagementCalendarEvent.deleted", context.uid, {
    calendarEventId,
    name: data.name || "",
    documentCount: documents.length,
    documentDeleteErrorCount: deletionResults.filter((result) => result.status === "rejected").length
  });
  return { ok: true, deleted: true, calendarEventId };
});

exports.listEngagementOpenWaterCourses = onCall(CALLABLE_OPTIONS, async (request) => {
  const startedAt = Date.now();
  await engagementAccessContext(request);
  const snapshot = await engagementOpenWaterCourseConfigRef().get();
  return {
    ok: true,
    courses: cleanEngagementOpenWaterCourses(snapshot.exists ? snapshot.data()?.courses : []),
    readStats: portalReadStats("listEngagementOpenWaterCourses", startedAt, {
      baseDocuments: 2,
      variableDocumentsMax: 0,
      cacheHit: snapshot.exists
    })
  };
});

exports.addEngagementOpenWaterCourse = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  if (!context.national && (!context.region || !context.regionId)) {
    throw new HttpsError("permission-denied", "Droit regional ou national requis pour modifier la bibliotheque eau libre.");
  }
  const course = cleanEngagementOpenWaterCourse({
    distance: request.data?.distance,
    discipline: request.data?.discipline
  });
  const ref = engagementOpenWaterCourseConfigRef();
  const now = new Date().toISOString();
  let courses = [];
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    courses = cleanEngagementOpenWaterCourses(snapshot.exists ? snapshot.data()?.courses : []);
    if (courses.some((item) => item.id === course.id)) {
      throw new HttpsError("already-exists", "Cette course existe deja dans la bibliotheque eau libre.");
    }
    if (courses.length >= ENGAGEMENT_OPEN_WATER_COURSE_LIMIT) {
      throw new HttpsError("resource-exhausted", "La bibliotheque eau libre a atteint sa limite de courses.");
    }
    courses = [...courses, course].sort((left, right) => left.distance - right.distance || left.label.localeCompare(right.label, "fr"));
    transaction.set(ref, {
      courses,
      updatedAt: now,
      updatedBy: context.uid
    }, { merge: true });
  });
  await writeAuditLog("engagementOpenWaterCourse.created", context.uid, {
    distance: course.distance,
    discipline: course.discipline,
    courseId: course.id
  });
  return { ok: true, course, courses };
});

exports.setEngagementOpenWaterCourseStatus = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  if (!context.national && (!context.region || !context.regionId)) {
    throw new HttpsError("permission-denied", "Droit regional ou national requis pour modifier la bibliotheque eau libre.");
  }
  const courseId = cleanText(request.data?.courseId).slice(0, 60);
  const active = request.data?.active === true;
  if (!courseId) throw new HttpsError("invalid-argument", "Course eau libre requise.");
  const ref = engagementOpenWaterCourseConfigRef();
  const now = new Date().toISOString();
  let courses = [];
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    courses = cleanEngagementOpenWaterCourses(snapshot.exists ? snapshot.data()?.courses : []);
    const index = courses.findIndex((course) => course.id === courseId);
    if (index < 0) throw new HttpsError("not-found", "Course eau libre introuvable.");
    courses[index] = { ...courses[index], active };
    transaction.set(ref, {
      courses,
      updatedAt: now,
      updatedBy: context.uid
    }, { merge: true });
  });
  await writeAuditLog("engagementOpenWaterCourse.statusChanged", context.uid, { courseId, active });
  return { ok: true, courses };
});

exports.getEngagementCompetition = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }
  const doc = await db.collection("engagementCompetitions").doc(competitionId).get();
  if (!doc.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  assertCanManageEngagementCompetition(context, doc.data() || {});
  const deletionRequest = await db.collection("engagementCompetitionDeletionRequests").doc(competitionId).get();
  const deletionRequestData = deletionRequest.exists ? deletionRequest.data() || {} : {};
  return {
    ok: true,
    competition: {
      ...engagementCompetitionDetailItem(doc, { includeDocumentUploader: true }),
      deletionRequestStatus: deletionRequestData.status === "pending" ? "pending" : ""
    }
  };
});

function engagementCompetitionDocumentUploader(context = {}) {
  return {
    uid: cleanText(context.uid).slice(0, 128),
    name: [cleanText(context.firstName), cleanText(context.lastName)].filter(Boolean).join(" ").slice(0, 180),
    email: normalizeEmail(context.email).slice(0, 180)
  };
}

function assertEngagementCompetitionDocumentPath(storagePath = "") {
  const cleanPath = cleanText(storagePath);
  if (!cleanPath.startsWith(`${ENGAGEMENT_COMPETITION_DOCUMENTS_STORAGE_PREFIX}/`) || cleanPath.includes("..")) {
    throw new HttpsError("failed-precondition", "Chemin de document de compétition invalide.");
  }
  return cleanPath;
}

function hasManagedEngagementCompetitionDocumentStorage(document = {}) {
  const storagePath = cleanText(document?.storagePath);
  return storagePath.startsWith(`${ENGAGEMENT_COMPETITION_DOCUMENTS_STORAGE_PREFIX}/`) && !storagePath.includes("..");
}

async function engagementCompetitionDocumentContext(request) {
  const context = await engagementAccessContext(request);
  const calendarEventId = cleanText(request.data?.calendarEventId).slice(0, 128);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  const eventId = calendarEventId || competitionId;
  const sourceType = calendarEventId ? "calendarEvent" : "competition";
  if (!eventId) throw new HttpsError("invalid-argument", "Compétition ou evenement requis.");
  const collection = sourceType === "calendarEvent" ? ENGAGEMENT_CALENDAR_EVENTS_COLLECTION : "engagementCompetitions";
  const ref = db.collection(collection).doc(eventId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "Compétition ou evenement introuvable.");
  assertCanManageEngagementCompetition(context, snapshot.data() || {});
  return { context, competitionId: eventId, calendarEventId, sourceType, ref, snapshot };
}

exports.uploadEngagementCompetitionDocument = onCall(ENGAGEMENT_DOCUMENT_UPLOAD_OPTIONS, async (request) => {
  const { context, competitionId, calendarEventId, sourceType, ref, snapshot } = await engagementCompetitionDocumentContext(request);
  const requestedDocumentId = cleanText(request.data?.documentId).slice(0, 80);
  const initialDocuments = cleanCompetitionDocuments(snapshot.data()?.clubDocuments || [], { includeUploader: true });
  const existingDocument = requestedDocumentId
    ? initialDocuments.find((document) => document.id === requestedDocumentId)
    : null;
  if (requestedDocumentId && !existingDocument) {
    throw new HttpsError("not-found", "Document à remplacer introuvable.");
  }
  if (!existingDocument && initialDocuments.length >= MAX_COMPETITION_DOCUMENTS) {
    throw new HttpsError("resource-exhausted", `La compétition contient déjà ${MAX_COMPETITION_DOCUMENTS} documents.`);
  }
  let input;
  let decoded;
  try {
    input = cleanCompetitionDocumentInput(request.data || {});
    decoded = decodeCompetitionDocumentDataUrl(request.data?.fileDataUrl, input.fileName);
  } catch (error) {
    throw new HttpsError("invalid-argument", cleanText(error?.message || error).slice(0, 220));
  }
  const documentId = existingDocument?.id || crypto.randomUUID();
  const storagePath = existingDocument?.storagePath || competitionDocumentStoragePath({
    competitionId,
    documentId,
    fileName: input.fileName,
    buffer: decoded.buffer
  });
  const token = competitionDocumentTokenFromUrl(existingDocument?.url) || crypto.randomUUID();
  const bucket = storage.bucket(LIVEPALMES_STORAGE_BUCKET);
  const file = bucket.file(storagePath);
  await file.save(decoded.buffer, {
    resumable: false,
    metadata: {
      contentType: decoded.contentType,
      cacheControl: "public, max-age=300, must-revalidate",
      metadata: { firebaseStorageDownloadTokens: token }
    }
  });
  const now = new Date().toISOString();
  const document = {
    id: documentId,
    ...input,
    contentType: decoded.contentType,
    storagePath,
    url: competitionDocumentDownloadUrl(LIVEPALMES_STORAGE_BUCKET, storagePath, token),
    size: decoded.buffer.length,
    uploadedAt: existingDocument?.uploadedAt || now,
    updatedAt: now,
    uploadedBy: engagementCompetitionDocumentUploader(context)
  };
  let previousStoragePath = existingDocument?.storagePath || "";
  let updatedDocuments = [];
  try {
    await db.runTransaction(async (transaction) => {
      const currentSnapshot = await transaction.get(ref);
      if (!currentSnapshot.exists) throw new HttpsError("not-found", "Compétition d'engagements introuvable.");
      assertCanManageEngagementCompetition(context, currentSnapshot.data() || {});
      const currentDocuments = cleanCompetitionDocuments(currentSnapshot.data()?.clubDocuments || [], { includeUploader: true });
      const currentIndex = currentDocuments.findIndex((item) => item.id === documentId);
      if (existingDocument && currentIndex < 0) throw new HttpsError("not-found", "Document à remplacer introuvable.");
      if (!existingDocument && currentIndex < 0 && currentDocuments.length >= MAX_COMPETITION_DOCUMENTS) {
        throw new HttpsError("resource-exhausted", `La compétition contient déjà ${MAX_COMPETITION_DOCUMENTS} documents.`);
      }
      if (currentIndex >= 0) {
        previousStoragePath = currentDocuments[currentIndex].storagePath;
        currentDocuments[currentIndex] = document;
      } else {
        currentDocuments.push(document);
      }
      updatedDocuments = cleanCompetitionDocuments(currentDocuments, { includeUploader: true });
      transaction.update(ref, {
        clubDocuments: updatedDocuments,
        documentsUpdatedAt: now,
        documentsUpdatedBy: context.uid
      });
    });
  } catch (error) {
    await file.delete({ ignoreNotFound: true }).catch(() => undefined);
    throw error;
  }
  if (hasManagedEngagementCompetitionDocumentStorage({ storagePath: previousStoragePath }) && previousStoragePath !== storagePath) {
    await bucket.file(assertEngagementCompetitionDocumentPath(previousStoragePath)).delete({ ignoreNotFound: true }).catch(() => undefined);
  }
  await writeAuditLog(existingDocument
    ? `${sourceType === "calendarEvent" ? "engagementCalendarEvent" : "engagementCompetition"}.documentReplaced`
    : `${sourceType === "calendarEvent" ? "engagementCalendarEvent" : "engagementCompetition"}.documentUploaded`, context.uid, {
    competitionId,
    calendarEventId,
    documentId,
    title: document.title,
    category: document.category,
    fileName: document.fileName,
    size: document.size
  });
  return {
    ok: true,
    competitionId,
    calendarEventId,
    documentId,
    documents: updatedDocuments
  };
});

exports.updateEngagementCompetitionDocument = onCall(CALLABLE_OPTIONS, async (request) => {
  const { context, competitionId, calendarEventId, sourceType, ref } = await engagementCompetitionDocumentContext(request);
  const documentId = cleanText(request.data?.documentId).slice(0, 80);
  if (!documentId) throw new HttpsError("invalid-argument", "Document requis.");
  const now = new Date().toISOString();
  let updatedDocuments = [];
  await db.runTransaction(async (transaction) => {
    const currentSnapshot = await transaction.get(ref);
    if (!currentSnapshot.exists) throw new HttpsError("not-found", "Compétition d'engagements introuvable.");
    assertCanManageEngagementCompetition(context, currentSnapshot.data() || {});
    const documents = cleanCompetitionDocuments(currentSnapshot.data()?.clubDocuments || [], { includeUploader: true });
    const index = documents.findIndex((document) => document.id === documentId);
    if (index < 0) throw new HttpsError("not-found", "Document introuvable.");
    let input;
    try {
      input = cleanCompetitionDocumentInput({ ...request.data, fileName: documents[index].fileName });
    } catch (error) {
      throw new HttpsError("invalid-argument", cleanText(error?.message || error).slice(0, 220));
    }
    documents[index] = { ...documents[index], ...input, updatedAt: now };
    updatedDocuments = cleanCompetitionDocuments(documents, { includeUploader: true });
    transaction.update(ref, {
      clubDocuments: updatedDocuments,
      documentsUpdatedAt: now,
      documentsUpdatedBy: context.uid
    });
  });
  await writeAuditLog(`${sourceType === "calendarEvent" ? "engagementCalendarEvent" : "engagementCompetition"}.documentUpdated`, context.uid, {
    competitionId,
    calendarEventId,
    documentId,
    title: updatedDocuments.find((document) => document.id === documentId)?.title || ""
  });
  return { ok: true, competitionId, calendarEventId, documentId, documents: updatedDocuments };
});

exports.deleteEngagementCompetitionDocument = onCall(CALLABLE_OPTIONS, async (request) => {
  const { context, competitionId, calendarEventId, sourceType, ref } = await engagementCompetitionDocumentContext(request);
  const documentId = cleanText(request.data?.documentId).slice(0, 80);
  if (!documentId) throw new HttpsError("invalid-argument", "Document requis.");
  const now = new Date().toISOString();
  let deletedDocument = null;
  let updatedDocuments = [];
  await db.runTransaction(async (transaction) => {
    const currentSnapshot = await transaction.get(ref);
    if (!currentSnapshot.exists) throw new HttpsError("not-found", "Compétition d'engagements introuvable.");
    assertCanManageEngagementCompetition(context, currentSnapshot.data() || {});
    const documents = cleanCompetitionDocuments(currentSnapshot.data()?.clubDocuments || [], { includeUploader: true });
    deletedDocument = documents.find((document) => document.id === documentId) || null;
    if (!deletedDocument) throw new HttpsError("not-found", "Document introuvable.");
    updatedDocuments = documents.filter((document) => document.id !== documentId);
    transaction.update(ref, {
      clubDocuments: updatedDocuments,
      documentsUpdatedAt: now,
      documentsUpdatedBy: context.uid
    });
  });
  let storageDeleted = true;
  if (hasManagedEngagementCompetitionDocumentStorage(deletedDocument)) {
    try {
      await storage.bucket(LIVEPALMES_STORAGE_BUCKET)
        .file(assertEngagementCompetitionDocumentPath(deletedDocument.storagePath))
        .delete({ ignoreNotFound: true });
    } catch (_) {
      storageDeleted = false;
    }
  }
  await writeAuditLog(`${sourceType === "calendarEvent" ? "engagementCalendarEvent" : "engagementCompetition"}.documentDeleted`, context.uid, {
    competitionId,
    calendarEventId,
    documentId,
    title: deletedDocument.title,
    fileName: deletedDocument.fileName,
    storageDeleted
  });
  return { ok: true, competitionId, calendarEventId, documentId, documents: updatedDocuments, storageDeleted };
});

exports.previewEngagementCompetitionDocumentNotification = onCall(CALLABLE_OPTIONS, async (request) => {
  const { competitionId, snapshot } = await engagementCompetitionDocumentContext(request);
  const recipients = engagementCompetitionDocumentRecipients(
    await engagementActiveClubMailRecipients(db),
    engagementCompetitionDetailItem(snapshot)
  );
  return {
    ok: true,
    competitionId,
    recipientCount: recipients.length,
    clubCount: new Set(recipients.map((recipient) => cleanText(recipient.clubId)).filter(Boolean)).size
  };
});

exports.notifyEngagementCompetitionDocuments = onCall(ENGAGEMENT_MAIL_CALLABLE_OPTIONS, async (request) => {
  const { context, competitionId, snapshot } = await engagementCompetitionDocumentContext(request);
  const competition = engagementCompetitionDetailItem(snapshot);
  const documentIds = Array.from(new Set((Array.isArray(request.data?.documentIds) ? request.data.documentIds : [])
    .map((id) => cleanText(id).slice(0, 80))
    .filter(Boolean))).slice(0, MAX_COMPETITION_DOCUMENTS);
  const documents = cleanCompetitionDocuments(snapshot.data()?.clubDocuments || [])
    .filter((document) => documentIds.includes(document.id));
  if (!documents.length || documents.length !== documentIds.length) {
    throw new HttpsError("invalid-argument", "Documents à notifier introuvables.");
  }
  const recipients = engagementCompetitionDocumentRecipients(
    await engagementActiveClubMailRecipients(db),
    competition
  );
  const notificationId = crypto.randomUUID();
  const now = new Date().toISOString();
  const subject = engagementCompetitionDocumentMailSubject(competition, documents);
  const text = engagementCompetitionDocumentMailText(competition, documents);
  const html = engagementCompetitionDocumentMailHtml(competition, documents);
  const preparedJobs = [];
  for (let offset = 0; offset < recipients.length; offset += 25) {
    const chunk = recipients.slice(offset, offset + 25);
    const chunkJobs = await Promise.all(chunk.map(async (recipient) => {
      const payload = {
        type: "competition_documents",
        notificationId,
        competitionId,
        competitionName: competition.name,
        clubId: recipient.clubId,
        clubName: recipient.clubName,
        regionId: recipient.regionId,
        toEmail: recipient.email,
        toName: [recipient.firstName, recipient.lastName].filter(Boolean).join(" "),
        recipientUid: recipient.uid,
        subject,
        text,
        html
      };
      const item = await upsertEngagementMailJob(payload, now);
      return item ? {
        item,
        data: {
          ...payload,
          status: engagementMailPreparedStatus(),
          textBody: text,
          htmlBody: html,
          createdAt: now,
          updatedAt: now
        }
      } : null;
    }));
    preparedJobs.push(...chunkJobs.filter(Boolean));
  }
  const config = engagementMailSmtpConfig();
  let sentCount = 0;
  let errorCount = 0;
  if (config.ready && preparedJobs.length) {
    const transporter = nodemailer.createTransport({
      ...config.transport,
      pool: true,
      maxConnections: 5,
      maxMessages: 100
    });
    for (let offset = 0; offset < preparedJobs.length; offset += 5) {
      const results = await Promise.all(preparedJobs.slice(offset, offset + 5).map(({ item, data }) =>
        sendEngagementMailJob(transporter, {
          id: item.id,
          ref: db.collection(ENGAGEMENT_MAIL_JOBS_COLLECTION).doc(item.id),
          data: () => data
        }, config, context)
      ));
      sentCount += results.filter((job) => job.status === "sent").length;
      errorCount += results.filter((job) => job.status === "failed").length;
    }
    await transporter.close();
  }
  await writeAuditLog("engagementCompetition.documentsNotified", context.uid, {
    competitionId,
    notificationId,
    documentIds,
    documentCount: documents.length,
    recipientCount: recipients.length,
    sentCount,
    errorCount,
    configurationMissing: !config.ready
  });
  return {
    ok: true,
    competitionId,
    notificationId,
    documentCount: documents.length,
    recipientCount: recipients.length,
    clubCount: new Set(recipients.map((recipient) => cleanText(recipient.clubId)).filter(Boolean)).size,
    sentCount,
    errorCount,
    configurationMissing: !config.ready
  };
});

exports.getEngagementClubEntry = onCall(CALLABLE_OPTIONS, async (request) => {
  const startedAt = Date.now();
  const context = await engagementClubAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }
  const competitionRef = db.collection("engagementCompetitions").doc(competitionId);
  const entryRef = db.collection("engagementClubEntries").doc(engagementClubEntryId(competitionId, context.clubId));
  const [competition, entry] = await db.getAll(competitionRef, entryRef);
  if (!competition.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  return {
    ok: true,
    competition: engagementCompetitionDetailItem(competition),
    entry: engagementClubEntryItem(entry, {
      competitionId,
      clubId: context.clubId,
      clubName: context.clubName,
      regionId: context.regionId,
      status: "active"
    }),
    readStats: portalReadStats("getEngagementClubEntry", startedAt, {
      baseDocuments: 3,
      cacheHit: false
    })
  };
});

exports.preloadEngagementClubWorkspaces = onCall(CALLABLE_OPTIONS, async (request) => {
  const startedAt = Date.now();
  const context = await engagementClubAccessContext(request);
  const competitionIds = Array.from(new Set(
    (Array.isArray(request.data?.competitionIds) ? request.data.competitionIds : [])
      .map((competitionId) => cleanText(competitionId).slice(0, 128))
      .filter(Boolean)
  )).slice(0, 4);
  if (!competitionIds.length) {
    return {
      ok: true,
      workspaces: [],
      readStats: portalReadStats("preloadEngagementClubWorkspaces", startedAt, {
        baseDocuments: 1,
        variableDocumentsMax: 0,
        cacheHit: false
      })
    };
  }
  const refs = competitionIds.flatMap((competitionId) => [
    db.collection("engagementCompetitions").doc(competitionId),
    db.collection("engagementClubEntries").doc(engagementClubEntryId(competitionId, context.clubId))
  ]);
  const snapshots = await db.getAll(...refs);
  const workspaces = competitionIds.flatMap((competitionId, index) => {
    const competition = snapshots[index * 2];
    const entry = snapshots[index * 2 + 1];
    if (!competition?.exists) return [];
    return [{
      competitionId,
      competition: engagementCompetitionDetailItem(competition),
      entry: engagementClubEntryItem(entry, {
        competitionId,
        clubId: context.clubId,
        clubName: context.clubName,
        regionId: context.regionId,
        status: "active"
      })
    }];
  });
  return {
    ok: true,
    workspaces,
    readStats: portalReadStats("preloadEngagementClubWorkspaces", startedAt, {
      baseDocuments: 1 + refs.length,
      variableDocumentsMax: 0,
      cacheHit: false
    })
  };
});

exports.generateEngagementClubRecapPdf = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementClubAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }
  const competition = await db.collection("engagementCompetitions").doc(competitionId).get();
  if (!competition.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  const entry = await db
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
  if (!engagementClubEntryHasParticipants(entryData)) {
    throw new HttpsError("failed-precondition", "Ajoutez au moins un nageur, un officiel ou un relais avant de generer le recapitulatif.");
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
  const competition = await db.collection("engagementCompetitions").doc(competitionId).get();
  if (!competition.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  assertCanManageEngagementCompetition(context, competition.data() || {});
  const summarySnapshot = await engagementCompetitionEntrySummaryRef(db, competitionId).get();
  const summaryReady = summarySnapshot?.exists && cleanText(summarySnapshot.data()?.generatedAt);
  const summaryEntries = summarySnapshot?.exists
    ? engagementCompetitionEntrySummariesFromData(summarySnapshot.data() || {})
    : [];
  const competitionDetail = engagementCompetitionDetailItem(competition);
  const entries = summaryEntries.map((entry) => ({
    ...entry,
    totalFee: engagementPdfFeeTotal(entry, competitionDetail)
  }));
  return {
    ok: true,
    competitionId,
    collection: ENGAGEMENT_COMPETITION_ENTRY_SUMMARIES_COLLECTION,
    summaryGenerated: false,
    summaryReady: Boolean(summaryReady),
    entries
  };
});

function engagementCompetitionStatisticsItem(entries = [], competition = {}) {
  const clubRows = [];
  const individualRowsByEvent = new Map();
  const relayRowsByEvent = new Map();
  const counts = {
    clubCount: 0,
    swimmerCount: 0,
    femaleCount: 0,
    maleCount: 0,
    unknownSexCount: 0,
    individualEntryCount: 0,
    relayCount: 0,
    officialCount: 0,
    manualTimeCount: 0,
    defaultTimeCount: 0,
    incompleteClubCount: 0
  };
  let returnedIndividualRowCount = 0;
  let returnedRelayRowCount = 0;
  const maximumReturnedRows = 10000;
  let truncated = false;

  entries.filter(engagementClubEntryHasParticipants).forEach((entry) => {
    const swimmers = Array.isArray(entry.swimmers) ? entry.swimmers : [];
    const relays = Array.isArray(entry.relays) ? entry.relays : [];
    const officials = Array.isArray(entry.officials) ? entry.officials : [];
    const individualCount = swimmers.reduce((sum, swimmer) => sum + (Array.isArray(swimmer.individualEntries) ? swimmer.individualEntries.length : 0), 0);
    counts.clubCount += 1;
    counts.swimmerCount += swimmers.length;
    counts.individualEntryCount += individualCount;
    counts.relayCount += relays.length;
    counts.officialCount += officials.length;
    if (!entry.teamLeaderComplete || (competition.officialsRequired === true && !officials.length)) counts.incompleteClubCount += 1;
    swimmers.forEach((swimmer) => {
      const sex = cleanText(swimmer.sex).toUpperCase();
      if (sex === "F") counts.femaleCount += 1;
      else if (sex === "M") counts.maleCount += 1;
      else counts.unknownSexCount += 1;
      (Array.isArray(swimmer.individualEntries) ? swimmer.individualEntries : []).forEach((individualEntry) => {
        const eventCode = normalizeCourseCode(individualEntry.eventCode);
        if (!eventCode) return;
        const entryTimeMode = cleanText(individualEntry.entryTimeMode);
        if (entryTimeMode === "manual") counts.manualTimeCount += 1;
        if (entryTimeMode === "default595999") counts.defaultTimeCount += 1;
        if (returnedIndividualRowCount + returnedRelayRowCount >= maximumReturnedRows) {
          truncated = true;
          return;
        }
        if (!individualRowsByEvent.has(eventCode)) individualRowsByEvent.set(eventCode, []);
        individualRowsByEvent.get(eventCode).push({
          eventCode,
          firstName: cleanText(swimmer.firstName).slice(0, 80),
          lastName: cleanText(swimmer.lastName || swimmer.name).slice(0, 80),
          sex: sex === "F" || sex === "M" ? sex : "",
          category: ageCategoryFromDates(competition.date, swimmer.birthDate) || "",
          clubId: cleanText(entry.clubId).slice(0, 40),
          clubCode: engagementClubCode(entry.clubId, entry.clubCode).slice(0, 40),
          entryTime: cleanText(individualEntry.entryTime || individualEntry.manualEntryTime).slice(0, 20) || "-",
          entryTimeValue: Number(individualEntry.entryTimeValue || 0) || 0,
          entryTimeMode
        });
        returnedIndividualRowCount += 1;
      });
    });
    relays.forEach((relay) => {
      const eventCode = normalizeCourseCode(relay.eventCode);
      if (!eventCode) return;
      if (returnedIndividualRowCount + returnedRelayRowCount >= maximumReturnedRows) {
        truncated = true;
        return;
      }
      if (!relayRowsByEvent.has(eventCode)) relayRowsByEvent.set(eventCode, []);
      relayRowsByEvent.get(eventCode).push({
        eventCode,
        clubId: cleanText(entry.clubId).slice(0, 40),
        clubCode: engagementClubCode(entry.clubId, entry.clubCode).slice(0, 40),
        category: cleanText(relay.category).slice(0, 20),
        genderMode: cleanText(relay.genderMode).slice(0, 20),
        entryTime: cleanText(relay.entryTime || relay.manualEntryTime).slice(0, 20) || "-",
        entryTimeValue: Number(relay.entryTimeValue || 0) || 0,
        members: (Array.isArray(relay.members) ? relay.members : []).slice(0, 4).map((member) => ({
          firstName: cleanText(member.firstName).slice(0, 80),
          lastName: cleanText(member.lastName || member.name).slice(0, 80)
        }))
      });
      returnedRelayRowCount += 1;
    });
    clubRows.push({
      clubId: cleanText(entry.clubId).slice(0, 40),
      clubCode: engagementClubCode(entry.clubId, entry.clubCode).slice(0, 40),
      clubName: engagementClubName(entry.clubId, entry.clubName).slice(0, 140),
      swimmerCount: swimmers.length,
      femaleCount: swimmers.filter((swimmer) => cleanText(swimmer.sex).toUpperCase() === "F").length,
      maleCount: swimmers.filter((swimmer) => cleanText(swimmer.sex).toUpperCase() === "M").length,
      individualCount,
      relayCount: relays.length,
      officialCount: officials.length,
      teamLeaderComplete: entry.teamLeaderComplete === true,
      updatedAt: cleanText(entry.updatedAt).slice(0, 40)
    });
  });

  const sortByEntryTime = (left, right) => {
    const leftTime = Number(left.entryTimeValue || 0) || Number.MAX_SAFE_INTEGER;
    const rightTime = Number(right.entryTimeValue || 0) || Number.MAX_SAFE_INTEGER;
    return leftTime - rightTime || cleanText(left.lastName || left.clubCode || left.clubId).localeCompare(cleanText(right.lastName || right.clubCode || right.clubId), "fr");
  };
  individualRowsByEvent.forEach((rows) => rows.sort(sortByEntryTime));
  relayRowsByEvent.forEach((rows) => rows.sort(sortByEntryTime));
  clubRows.sort((left, right) => cleanText(left.clubCode || left.clubName).localeCompare(cleanText(right.clubCode || right.clubName), "fr"));

  const configuredEvents = Array.isArray(competition.events) ? competition.events : [];
  const eventCodes = [];
  configuredEvents.forEach((event) => {
    const code = normalizeCourseCode(event.code || event.eventCode);
    if (code && !eventCodes.includes(code)) eventCodes.push(code);
  });
  [...individualRowsByEvent.keys(), ...relayRowsByEvent.keys()].forEach((code) => {
    if (!eventCodes.includes(code)) eventCodes.push(code);
  });
  const events = eventCodes.map((eventCode) => {
    const configuredEvent = configuredEvents.find((event) => normalizeCourseCode(event.code || event.eventCode) === eventCode) || {};
    const type = configuredEvent.type === "relay" || relayRowsByEvent.has(eventCode) && !individualRowsByEvent.has(eventCode) ? "relay" : "individual";
    const rows = type === "relay" ? relayRowsByEvent.get(eventCode) || [] : individualRowsByEvent.get(eventCode) || [];
    return {
      eventCode,
      label: engagementPdfEventLabel(eventCode),
      type,
      entryCount: rows.length,
      rows
    };
  });

  return { counts, events, clubs: clubRows, truncated };
}

exports.getEngagementCompetitionStatistics = onCall(CALLABLE_OPTIONS, async (request) => {
  const startedAt = Date.now();
  const context = await engagementAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) throw new HttpsError("invalid-argument", "Competition requise.");
  const competitionRef = db.collection("engagementCompetitions").doc(competitionId);
  const cacheRef = engagementCompetitionStatisticsCacheRef(db, competitionId);
  const [competitionSnapshot, cacheSnapshot] = await db.getAll(competitionRef, cacheRef);
  if (!competitionSnapshot.exists) throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  assertCanManageEngagementCompetition(context, competitionSnapshot.data() || {});
  const competition = engagementCompetitionDetailItem(competitionSnapshot);
  const cachedStatistics = cacheSnapshot.exists
    ? decodeEngagementCompetitionStatisticsCache(cacheSnapshot.data() || {}, competition)
    : null;
  if (cachedStatistics && request.data?.force !== true) {
    return {
      ok: true,
      competitionId,
      generatedAt: cleanText(cacheSnapshot.data()?.generatedAt).slice(0, 40) || new Date().toISOString(),
      ...cachedStatistics,
      readStats: portalReadStats("getEngagementCompetitionStatistics", startedAt, {
        baseDocuments: 2,
        cacheHit: true
      })
    };
  }
  const entriesSnapshot = await db.collection("engagementClubEntries")
    .where("competitionId", "==", competitionId)
    .limit(500)
    .get();
  const entries = entriesSnapshot.docs.map((doc) => engagementClubEntryItem(doc));
  const statistics = engagementCompetitionStatisticsItem(entries, competition);
  const generatedAt = new Date().toISOString();
  const payloadGzip = encodeEngagementCompetitionStatisticsCache(statistics);
  await cacheRef.set({
    competitionId,
    competitionUpdatedAt: cleanText(competition.updatedAt).slice(0, 40),
    generatedAt,
    updatedAt: generatedAt,
    status: payloadGzip ? "ready" : "too_large",
    payloadEncoding: payloadGzip ? "gzip-base64" : "",
    payloadGzip,
    sourceEntryCount: entriesSnapshot.size
  }, { merge: false });
  return {
    ok: true,
    competitionId,
    generatedAt,
    ...statistics,
    readStats: portalReadStats("getEngagementCompetitionStatistics", startedAt, {
      baseDocuments: 2 + entriesSnapshot.size,
      cacheHit: false
    })
  };
});

exports.generateEngagementClubRecapPdfForAdmin = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  const clubId = cleanText(request.data?.clubId).slice(0, 40);
  if (!competitionId || !clubId) {
    throw new HttpsError("invalid-argument", "Competition et club requis.");
  }
  const competition = await db.collection("engagementCompetitions").doc(competitionId).get();
  if (!competition.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  assertCanManageEngagementCompetition(context, competition.data() || {});
  const entry = await db
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
  if (!engagementClubEntryHasParticipants(entryData)) {
    throw new HttpsError("failed-precondition", "Ce club ne contient encore aucun nageur, officiel ou relais engage.");
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
  const errors = [];
  const entries = [];
  for (const entryDoc of entriesSnapshot.docs) {
    const entry = engagementClubEntryItem(entryDoc);
    if (!entry.clubId || !entry.teamLeaderComplete || !engagementClubEntryHasParticipants(entry)) {
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
      errors.push({
        clubId: entry.clubId,
        clubName: entry.clubName,
        message: cleanText(error?.message || String(error)).slice(0, 220)
      });
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
    errors,
    entries
  };
});

exports.generateEngagementCompetitionTxtExport = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }
  const competition = await db.collection("engagementCompetitions").doc(competitionId).get();
  if (!competition.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  if (cleanEngagementCompetitionType(competition.data()?.competitionType) === "openWater") {
    throw new HttpsError("failed-precondition", "L'export TXT eau libre sera disponible apres validation de son format.");
  }
  assertCanManageEngagementCompetition(context, competition.data() || {});
  const entriesSnapshot = await db.collection("engagementClubEntries")
    .where("competitionId", "==", competitionId)
    .limit(500)
    .get();
  const result = await getOrCreateEngagementCompetitionTxt(competition, entriesSnapshot.docs, {
    force: request.data?.force === true
  });
  await writeAuditLog("engagementCompetition.txtExportGenerated", context.uid, {
    competitionId,
    entryCount: result.entryCount,
    fileName: result.fileName,
    size: result.buffer.length,
    fromStorage: result.fromStorage
  });
  return {
    ok: true,
    competitionId,
    entryCount: result.entryCount,
    fileName: result.fileName,
    contentType: "text/plain; charset=utf-8",
    generatedAt: result.generatedAt,
    document: result.document,
    file: result.file,
    generatedFiles: result.generatedFiles,
    fromStorage: result.fromStorage,
    txtBase64: result.buffer.toString("base64")
  };
});

exports.listEngagementCompetitionMailJobs = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }
  const competition = await db.collection("engagementCompetitions").doc(competitionId).get();
  if (!competition.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  assertCanManageEngagementCompetition(context, competition.data() || {});
  const pageSize = Math.min(200, Math.max(20, Math.trunc(Number(request.data?.pageSize) || 100)));
  const cursor = request.data?.cursor && typeof request.data.cursor === "object" ? request.data.cursor : {};
  const documentId = FieldPath.documentId();
  let jobsQuery = db.collection(ENGAGEMENT_MAIL_JOBS_COLLECTION)
    .where("competitionId", "==", competitionId)
    .orderBy("updatedAt", "desc")
    .orderBy(documentId, "desc");
  if (cleanText(cursor.id) && typeof cursor.updatedAt === "string") {
    jobsQuery = jobsQuery.startAfter(cursor.updatedAt, cleanText(cursor.id));
  }
  const [snapshot, totalSnapshot] = await Promise.all([
    jobsQuery.limit(pageSize + 1).get(),
    cleanText(cursor.id)
      ? Promise.resolve(null)
      : db.collection(ENGAGEMENT_MAIL_JOBS_COLLECTION).where("competitionId", "==", competitionId).count().get()
  ]);
  const pageDocuments = snapshot.docs.slice(0, pageSize);
  const jobs = pageDocuments
    .map((doc) => engagementMailJobItemFromData(doc.data() || {}, doc.id))
    .sort((left, right) => cleanText(right.updatedAt).localeCompare(cleanText(left.updatedAt)) || cleanText(left.toEmail).localeCompare(cleanText(right.toEmail)));
  const lastDocument = pageDocuments.at(-1);
  return {
    ok: true,
    competitionId,
    collection: ENGAGEMENT_MAIL_JOBS_COLLECTION,
    jobs,
    totalCount: totalSnapshot ? Math.max(0, Number(totalSnapshot.data()?.count || 0)) : null,
    hasMore: snapshot.size > pageSize,
    nextCursor: snapshot.size > pageSize && lastDocument ? {
      updatedAt: cleanText(lastDocument.get("updatedAt")).slice(0, 40),
      id: lastDocument.id
    } : null
  };
});

exports.prepareEngagementOpeningNotificationEmails = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }
  const competitionSnapshot = await db.collection("engagementCompetitions").doc(competitionId).get();
  if (!competitionSnapshot.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  assertCanManageEngagementCompetition(context, competitionSnapshot.data() || {});
  const competition = engagementCompetitionDetailItem(competitionSnapshot);
  const recipients = engagementCompetitionOpeningRecipients(
    await engagementActiveMailRecipients(db),
    competition,
    [engagementMailRecipientFromContext(context)].filter(Boolean)
  );
  const now = new Date().toISOString();
  const jobs = [];
  for (const recipient of recipients) {
    const job = await upsertEngagementMailJob({
      type: "opening_notification",
      competitionId,
      competitionName: competition.name,
      clubId: recipient.clubId,
      clubName: recipient.clubName,
      regionId: recipient.regionId,
      toEmail: recipient.email,
      toName: [recipient.firstName, recipient.lastName].filter(Boolean).join(" "),
      recipientUid: recipient.uid,
      subject: engagementOpeningMailSubject(competition),
      text: engagementOpeningMailText(competition)
    }, now);
    if (job) jobs.push(job);
  }
  await writeAuditLog("engagementCompetition.openingEmailsPrepared", context.uid, {
    competitionId,
    recipientCount: recipients.length,
    jobCount: jobs.length,
    mailStatus: "ready"
  });
  return {
    ok: true,
    competitionId,
    recipientCount: recipients.length,
    jobCount: jobs.length,
    jobs
  };
});

async function prepareEngagementClubRecapEmailJobs(db, competitionSnapshot, options = {}) {
  const competition = engagementCompetitionDetailItem(competitionSnapshot);
  const competitionId = cleanText(competition.id).slice(0, 128);
  const recipientsByClub = engagementRecipientsByClub(engagementCompetitionNotificationRecipients(
    await engagementActiveClubMailRecipients(db)
  ));
  const entriesSnapshot = await db.collection("engagementClubEntries")
    .where("competitionId", "==", competitionId)
    .limit(500)
    .get();
  const now = new Date().toISOString();
  const jobs = [];
  let skippedClubCount = 0;
  let pdfGeneratedCount = 0;
  let pdfReusedCount = 0;
  let errorCount = 0;
  const errors = [];
  for (const entryDoc of entriesSnapshot.docs) {
    const entry = engagementClubEntryItem(entryDoc);
    const recipients = recipientsByClub.get(entry.clubId) || [];
    if (!entry.clubId || !entry.teamLeaderComplete || !engagementClubEntryHasParticipants(entry) || !recipients.length) {
      skippedClubCount += 1;
      continue;
    }
    let pdf = null;
    try {
      pdf = await getOrCreateEngagementClubRecapPdf(competitionSnapshot, entryDoc, {
        force: options.forcePdf === true
      });
    } catch (error) {
      errorCount += 1;
      errors.push({
        clubId: entry.clubId,
        clubName: entry.clubName,
        message: cleanText(error?.message || error).slice(0, 220)
      });
      continue;
    }
    if (pdf.fromStorage) pdfReusedCount += 1;
    else pdfGeneratedCount += 1;
    for (const recipient of recipients) {
      const job = await upsertEngagementMailJob({
        type: "club_recap_pdf",
        competitionId,
        competitionName: competition.name,
        clubId: entry.clubId,
        clubName: entry.clubName,
        regionId: entry.regionId,
        toEmail: recipient.email,
        toName: [recipient.firstName, recipient.lastName].filter(Boolean).join(" "),
        recipientUid: recipient.uid,
        subject: engagementClubRecapMailSubject(competition, entry),
        text: engagementClubRecapMailText(competition, entry),
        attachments: [{
          type: "clubRecapPdf",
          fileName: pdf.document?.fileName || pdf.fileName,
          contentType: "application/pdf",
          storagePath: pdf.document?.storagePath
        }]
      }, now);
      if (job) jobs.push(job);
    }
  }
  if (jobs.length || errorCount) {
    await db.collection("engagementCompetitions").doc(competitionId).set({
      documents: {
        clubRecapEmails: {
          status: jobs.length ? "generated" : "pending",
          generatedAt: now,
          updatedAt: now,
          jobCount: jobs.length,
          errorCount
        }
      }
    }, { merge: true });
  }
  return {
    competitionId,
    clubEntryCount: entriesSnapshot.size,
    skippedClubCount,
    jobCount: jobs.length,
    pdfGeneratedCount,
    pdfReusedCount,
    errorCount,
    mailStatus: engagementMailPreparedStatus(),
    errors,
    jobs
  };
}

exports.prepareEngagementClubRecapEmails = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }
  const competitionSnapshot = await db.collection("engagementCompetitions").doc(competitionId).get();
  if (!competitionSnapshot.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  assertCanManageEngagementCompetition(context, competitionSnapshot.data() || {});
  const result = await prepareEngagementClubRecapEmailJobs(db, competitionSnapshot, {
    forcePdf: request.data?.forcePdf === true
  });
  await writeAuditLog("engagementCompetition.clubRecapEmailsPrepared", context.uid, {
    competitionId,
    clubEntryCount: result.clubEntryCount,
    skippedClubCount: result.skippedClubCount,
    jobCount: result.jobCount,
    pdfGeneratedCount: result.pdfGeneratedCount,
    pdfReusedCount: result.pdfReusedCount,
    errorCount: result.errorCount,
    mailStatus: result.mailStatus
  });
  return {
    ok: true,
    ...result
  };
});

async function prepareEngagementTxtEmailJob(db, competitionSnapshot, options = {}) {
  const competition = engagementCompetitionDetailItem(competitionSnapshot);
  const competitionId = cleanText(competition.id).slice(0, 128);
  if (cleanEngagementCompetitionType(competition.competitionType) === "openWater") {
    return {
      competitionId,
      entryCount: 0,
      jobCount: 0,
      errorCount: 0,
      generatedAt: "",
      skippedReason: "open_water_export_pending",
      errors: [],
      generatedFiles: cleanEngagementGeneratedFiles(competition.generatedFiles || [])
    };
  }
  const computerEmail = normalizeEmail(competition.computerEmail);
  const now = new Date().toISOString();
  if (!computerEmail) {
    return {
      competitionId,
      jobCount: 0,
      errorCount: 1,
      errors: [{
        message: "Email du responsable informatique non renseigne."
      }],
      generatedFiles: cleanEngagementGeneratedFiles(competition.generatedFiles || [])
    };
  }
  const entriesSnapshot = await db.collection("engagementClubEntries")
    .where("competitionId", "==", competitionId)
    .limit(500)
    .get();
  const txt = await getOrCreateEngagementCompetitionTxt(competitionSnapshot, entriesSnapshot.docs, {
    force: options.forceTxt === true
  });
  const job = await upsertEngagementMailJob({
    type: "entries_txt",
    competitionId,
    competitionName: competition.name,
    clubId: "informatique",
    clubName: "Informatique competition",
    regionId: competition.regionId,
    toEmail: computerEmail,
    toName: "Responsable informatique",
    subject: engagementTxtMailSubject(competition),
    text: engagementTxtMailText(competition, txt),
    attachments: [{
      type: "entriesTxt",
      fileName: txt.document?.fileName || txt.fileName,
      contentType: "text/plain; charset=utf-8",
      storagePath: txt.document?.storagePath
    }]
  }, now);
  await db.collection("engagementCompetitions").doc(competitionId).set({
    documents: {
      entriesTxt: {
        status: "generated",
        generatedAt: txt.generatedAt,
        updatedAt: now,
        jobCount: job ? 1 : 0
      }
    }
  }, { merge: true });
  return {
    competitionId,
    entryCount: txt.entryCount,
    jobCount: job ? 1 : 0,
    errorCount: 0,
    mailStatus: engagementMailPreparedStatus(),
    generatedAt: txt.generatedAt,
    generatedFiles: txt.generatedFiles,
    txtFileName: txt.fileName,
    txtFromStorage: txt.fromStorage,
    jobs: job ? [job] : []
  };
}

async function prepareEngagementOfficialsEmailJob(db, competitionSnapshot, options = {}) {
  const competition = engagementCompetitionDetailItem(competitionSnapshot);
  const competitionId = cleanText(competition.id).slice(0, 128);
  if (competition.officialsRequired !== true) {
    return {
      competitionId,
      jobCount: 0,
      errorCount: 0,
      officialCount: 0,
      personLookupReadCount: 0,
      skippedReason: "officials_not_required"
    };
  }
  const officialsManagerEmail = normalizeEmail(competition.officialsManagerEmail);
  if (!officialsManagerEmail) {
    return {
      competitionId,
      jobCount: 0,
      errorCount: 1,
      officialCount: 0,
      personLookupReadCount: 0,
      errors: [{ message: "Email du responsable juge non renseigne." }]
    };
  }
  const entriesSnapshot = await db.collection("engagementClubEntries")
    .where("competitionId", "==", competitionId)
    .limit(500)
    .get();
  const pdf = await getOrCreateEngagementOfficialsPdf(db, competitionSnapshot, entriesSnapshot.docs, {
    force: options.forcePdf === true
  });
  const now = new Date().toISOString();
  const job = await upsertEngagementMailJob({
    type: "officials_pdf",
    competitionId,
    competitionName: competition.name,
    clubId: "jury",
    clubName: "Jury compétition",
    regionId: competition.regionId,
    toEmail: officialsManagerEmail,
    toName: "Responsable juge",
    subject: engagementOfficialsMailSubject(competition),
    text: engagementOfficialsMailText(competition, pdf),
    attachments: [{
      type: "officialsPdf",
      fileName: pdf.document?.fileName || pdf.fileName,
      contentType: "application/pdf",
      storagePath: pdf.document?.storagePath
    }]
  }, now);
  await db.collection("engagementCompetitions").doc(competitionId).set({
    documents: {
      officialsEmail: {
        status: "generated",
        generatedAt: pdf.generatedAt,
        updatedAt: now,
        jobCount: job ? 1 : 0
      }
    }
  }, { merge: true });
  return {
    competitionId,
    jobCount: job ? 1 : 0,
    errorCount: 0,
    officialCount: pdf.officialCount,
    personLookupReadCount: pdf.personLookupReadCount,
    mailStatus: engagementMailPreparedStatus(),
    generatedAt: pdf.generatedAt,
    pdfFileName: pdf.fileName,
    pdfFromStorage: pdf.fromStorage,
    jobs: job ? [job] : []
  };
}

async function sendEngagementPreparedEmailJobs(db, competitionSnapshot, context = {}, options = {}) {
  const competitionId = cleanText(competitionSnapshot.id).slice(0, 128);
  const requestedType = cleanText(options.type).slice(0, 80);
  const limit = Math.max(1, Math.min(Number(options.limit || 500) || 500, 500));
  const config = engagementMailSmtpConfig();
  if (!config.ready) {
    throw new HttpsError(
      "failed-precondition",
      "Configuration mail SMTP incomplete."
    );
  }
  const snapshot = await db.collection(ENGAGEMENT_MAIL_JOBS_COLLECTION)
    .where("competitionId", "==", competitionId)
    .limit(500)
    .get();
  let eligibleRecapClubIds = null;
  if (requestedType === "club_recap_pdf") {
    const entriesSnapshot = await db.collection("engagementClubEntries")
      .where("competitionId", "==", competitionId)
      .limit(500)
      .get();
    eligibleRecapClubIds = new Set(entriesSnapshot.docs
      .map((doc) => engagementClubEntryItem(doc))
      .filter((entry) => entry.teamLeaderComplete && engagementClubEntryHasParticipants(entry))
      .map((entry) => entry.clubId));
  }
  const pendingDocs = snapshot.docs
    .filter((doc) => {
      const data = doc.data() || {};
      const status = cleanText(data.status);
      if (requestedType && cleanText(data.type) !== requestedType) return false;
      return status === "ready" || status === "blocked_missing_config" || status === "failed";
    });
  const notificationCapabilities = requestedType === "club_recap_pdf"
    ? ["engagements.club.manage"]
    : ENGAGEMENT_MAIL_CAPABILITIES;
  const enabledNotificationUids = pendingDocs.some((doc) => OPTIONAL_COMPETITION_MAIL_TYPES.has(cleanText(doc.data()?.type)))
    ? new Set(engagementCompetitionNotificationRecipients(await engagementActiveMailRecipients(db, notificationCapabilities))
        .map((recipient) => cleanText(recipient.uid))
        .filter(Boolean))
    : null;
  const notificationsDisabledDocs = enabledNotificationUids
    ? pendingDocs.filter((doc) => {
        const data = doc.data() || {};
        const recipientUid = cleanText(data.recipientUid);
        return OPTIONAL_COMPETITION_MAIL_TYPES.has(cleanText(data.type)) && recipientUid && !enabledNotificationUids.has(recipientUid);
      })
    : [];
  const noParticipantsDocs = eligibleRecapClubIds
    ? pendingDocs.filter((doc) => !eligibleRecapClubIds.has(cleanText(doc.data()?.clubId)))
    : [];
  const cancelledDocs = [...new Map([...notificationsDisabledDocs, ...noParticipantsDocs].map((doc) => [doc.id, doc])).values()];
  if (cancelledDocs.length) {
    const now = new Date().toISOString();
    const batch = db.batch();
    cancelledDocs.forEach((doc) => {
      const notificationsDisabled = notificationsDisabledDocs.some((item) => item.id === doc.id);
      batch.set(doc.ref, {
        status: notificationsDisabled ? "cancelled_notifications_disabled" : "cancelled_no_participants",
        updatedAt: now,
        cancelledAt: now
      }, { merge: true });
    });
    await batch.commit();
  }
  const candidates = pendingDocs
    .filter((doc) => !eligibleRecapClubIds || eligibleRecapClubIds.has(cleanText(doc.data()?.clubId)))
    .filter((doc) => !notificationsDisabledDocs.some((item) => item.id === doc.id))
    .sort((left, right) =>
      cleanText(left.data()?.updatedAt).localeCompare(cleanText(right.data()?.updatedAt)) ||
      cleanText(left.data()?.toEmail).localeCompare(cleanText(right.data()?.toEmail))
    )
    .slice(0, limit);
  const transporter = nodemailer.createTransport(config.transport);
  const jobs = [];
  let sentCount = 0;
  let errorCount = 0;
  for (const doc of candidates) {
    const job = await sendEngagementMailJob(transporter, doc, config, context);
    if (job.status === "sent") sentCount += 1;
    else if (job.status === "failed") errorCount += 1;
    jobs.push(job);
  }
  if ((requestedType === "club_recap_pdf" || requestedType === "entries_txt" || requestedType === "officials_pdf") && candidates.length) {
    const now = new Date().toISOString();
    await db.collection("engagementCompetitions").doc(competitionId).set({
      documents: requestedType === "entries_txt"
        ? {
            entriesTxt: {
              status: sentCount === candidates.length && !errorCount ? "sent" : "generated",
              generatedAt: now,
              updatedAt: now,
              attemptedCount: candidates.length,
              sentCount,
              errorCount
            }
          }
        : requestedType === "officials_pdf"
          ? {
              officialsEmail: {
                status: sentCount === candidates.length && !errorCount ? "sent" : "generated",
                generatedAt: now,
                updatedAt: now,
                attemptedCount: candidates.length,
                sentCount,
                errorCount
              }
            }
          : {
            clubRecapEmails: {
              status: sentCount === candidates.length && !errorCount ? "sent" : "generated",
              generatedAt: now,
              updatedAt: now,
              attemptedCount: candidates.length,
              sentCount,
              errorCount
            }
          }
    }, { merge: true });
  }
  return {
    competitionId,
    attemptedCount: candidates.length,
    sentCount,
    errorCount,
    jobs
  };
}

exports.sendEngagementPreparedEmails = onCall(ENGAGEMENT_MAIL_CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }
  const competition = await db.collection("engagementCompetitions").doc(competitionId).get();
  if (!competition.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  assertCanManageEngagementCompetition(context, competition.data() || {});
  const result = await sendEngagementPreparedEmailJobs(db, competition, context, {
    type: request.data?.type,
    limit: request.data?.limit
  });
  await writeAuditLog("engagementCompetition.preparedEmailsSent", context.uid, {
    competitionId,
    requestedType: cleanText(request.data?.type).slice(0, 80),
    attemptedCount: result.attemptedCount,
    sentCount: result.sentCount,
    errorCount: result.errorCount
  });
  return {
    ok: true,
    ...result
  };
});

function engagementClosureAutomationContext() {
  return {
    uid: "system:engagementClosureScheduler",
    email: "livepalmes@nap-ffessm.fr",
    national: true,
    region: true,
    regionId: ""
  };
}

async function reserveEngagementCompetitionClosure(db, competitionRef, now) {
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(competitionRef);
    if (!snapshot.exists) {
      return { reserved: false, reason: "not-found" };
    }
    const data = snapshot.data() || {};
    const entryStatus = cleanEngagementEntryStatus(data.entryStatus || data.status);
    const deadline = cleanIsoDateTime(data.entryDeadlineAt);
    if (entryStatus !== "open") {
      return { reserved: false, reason: "not-open" };
    }
    if (!deadline || deadline > now) {
      return { reserved: false, reason: "deadline-not-reached" };
    }
    transaction.set(competitionRef, {
      entryStatus: "closed",
      closureAutomationStatus: "processing",
      closureAutomationStartedAt: now,
      closureAutomationLastAttemptAt: now,
      closureAutomationAttemptCount: FieldValue.increment(1),
      updatedAt: now,
      updatedBy: "system:engagementClosureScheduler"
    }, { merge: true });
    return {
      reserved: true,
      competition: engagementCompetitionDetailItem({
        id: snapshot.id,
        data: () => ({ ...data, entryStatus: "closed" })
      })
    };
  });
}

async function processEngagementCompetitionAutomaticClosure(db, competitionSnapshot, now) {
  const context = engagementClosureAutomationContext();
  const competitionRef = competitionSnapshot.ref;
  const reservation = await reserveEngagementCompetitionClosure(db, competitionRef, now);
  if (!reservation.reserved) {
    return {
      competitionId: competitionSnapshot.id,
      skipped: true,
      reason: reservation.reason
    };
  }
  const closedSnapshot = await competitionRef.get();
  try {
    const preparation = await prepareEngagementClubRecapEmailJobs(db, closedSnapshot, {
      forcePdf: false
    });
    const txtPreparation = await prepareEngagementTxtEmailJob(db, closedSnapshot, {
      forceTxt: false
    });
    const officialsPreparation = await prepareEngagementOfficialsEmailJob(db, closedSnapshot, {
      forcePdf: false
    });
    const sendResult = preparation.jobCount
      ? await sendEngagementPreparedEmailJobs(db, closedSnapshot, context, {
          type: "club_recap_pdf",
          limit: 500
        })
      : {
          competitionId: closedSnapshot.id,
          attemptedCount: 0,
          sentCount: 0,
          errorCount: 0,
          jobs: []
        };
    const txtSendResult = txtPreparation.jobCount
      ? await sendEngagementPreparedEmailJobs(db, closedSnapshot, context, {
          type: "entries_txt",
          limit: 10
        })
      : {
          competitionId: closedSnapshot.id,
          attemptedCount: 0,
          sentCount: 0,
          errorCount: 0,
          jobs: []
        };
    const officialsSendResult = officialsPreparation.jobCount
      ? await sendEngagementPreparedEmailJobs(db, closedSnapshot, context, {
          type: "officials_pdf",
          limit: 10
        })
      : {
          competitionId: closedSnapshot.id,
          attemptedCount: 0,
          sentCount: 0,
          errorCount: 0,
          jobs: []
        };
    const completedAt = new Date().toISOString();
    const status = preparation.errorCount || txtPreparation.errorCount || officialsPreparation.errorCount || sendResult.errorCount || txtSendResult.errorCount || officialsSendResult.errorCount
      ? "completed_with_errors"
      : "completed";
    await competitionRef.set({
      closureAutomationStatus: status,
      closureAutomationCompletedAt: completedAt,
      closureRecapEmailsPreparedAt: preparation.jobCount ? completedAt : "",
      closureRecapEmailsSentAt: sendResult.attemptedCount ? completedAt : "",
      closureAutomationSummary: cleanFirestoreValue({
        clubEntryCount: preparation.clubEntryCount,
        skippedClubCount: preparation.skippedClubCount,
        jobCount: preparation.jobCount,
        pdfGeneratedCount: preparation.pdfGeneratedCount,
        pdfReusedCount: preparation.pdfReusedCount,
        txtGeneratedCount: txtPreparation.generatedAt ? 1 : 0,
        txtMailJobCount: txtPreparation.jobCount,
        officialsPdfGeneratedCount: officialsPreparation.generatedAt ? 1 : 0,
        officialsMailJobCount: officialsPreparation.jobCount,
        officialCount: officialsPreparation.officialCount,
        officialsPersonLookupReadCount: officialsPreparation.personLookupReadCount,
        prepareErrorCount: Number(preparation.errorCount || 0) + Number(txtPreparation.errorCount || 0) + Number(officialsPreparation.errorCount || 0),
        attemptedMailCount: Number(sendResult.attemptedCount || 0) + Number(txtSendResult.attemptedCount || 0) + Number(officialsSendResult.attemptedCount || 0),
        sentMailCount: Number(sendResult.sentCount || 0) + Number(txtSendResult.sentCount || 0) + Number(officialsSendResult.sentCount || 0),
        sendErrorCount: Number(sendResult.errorCount || 0) + Number(txtSendResult.errorCount || 0) + Number(officialsSendResult.errorCount || 0),
        txtAttemptedMailCount: txtSendResult.attemptedCount,
        txtSentMailCount: txtSendResult.sentCount,
        txtSendErrorCount: txtSendResult.errorCount,
        officialsAttemptedMailCount: officialsSendResult.attemptedCount,
        officialsSentMailCount: officialsSendResult.sentCount,
        officialsSendErrorCount: officialsSendResult.errorCount,
        updatedAt: completedAt
      }),
      updatedAt: completedAt,
      updatedBy: context.uid
    }, { merge: true });
    await writeAuditLog("engagementCompetition.closedAutomatically", context.uid, {
      competitionId: closedSnapshot.id,
      closureAutomationStatus: status,
      clubEntryCount: preparation.clubEntryCount,
      skippedClubCount: preparation.skippedClubCount,
      jobCount: preparation.jobCount,
      pdfGeneratedCount: preparation.pdfGeneratedCount,
      pdfReusedCount: preparation.pdfReusedCount,
      txtGeneratedCount: txtPreparation.generatedAt ? 1 : 0,
      txtMailJobCount: txtPreparation.jobCount,
      officialsPdfGeneratedCount: officialsPreparation.generatedAt ? 1 : 0,
      officialsMailJobCount: officialsPreparation.jobCount,
      officialCount: officialsPreparation.officialCount,
      officialsPersonLookupReadCount: officialsPreparation.personLookupReadCount,
      prepareErrorCount: Number(preparation.errorCount || 0) + Number(txtPreparation.errorCount || 0) + Number(officialsPreparation.errorCount || 0),
      attemptedMailCount: Number(sendResult.attemptedCount || 0) + Number(txtSendResult.attemptedCount || 0) + Number(officialsSendResult.attemptedCount || 0),
      sentMailCount: Number(sendResult.sentCount || 0) + Number(txtSendResult.sentCount || 0) + Number(officialsSendResult.sentCount || 0),
      sendErrorCount: Number(sendResult.errorCount || 0) + Number(txtSendResult.errorCount || 0) + Number(officialsSendResult.errorCount || 0),
      txtAttemptedMailCount: txtSendResult.attemptedCount,
      txtSentMailCount: txtSendResult.sentCount,
      txtSendErrorCount: txtSendResult.errorCount,
      officialsAttemptedMailCount: officialsSendResult.attemptedCount,
      officialsSentMailCount: officialsSendResult.sentCount,
      officialsSendErrorCount: officialsSendResult.errorCount
    });
    return {
      competitionId: closedSnapshot.id,
      skipped: false,
      status,
      preparation,
      txtPreparation,
      officialsPreparation,
      sendResult,
      txtSendResult,
      officialsSendResult
    };
  } catch (error) {
    const failedAt = new Date().toISOString();
    await competitionRef.set({
      closureAutomationStatus: "failed",
      closureAutomationFailedAt: failedAt,
      closureAutomationReason: cleanText(error?.message || error).slice(0, 220),
      updatedAt: failedAt,
      updatedBy: context.uid
    }, { merge: true });
    await writeAuditLog("engagementCompetition.automaticClosureFailed", context.uid, {
      competitionId: closedSnapshot.id,
      message: cleanText(error?.message || error).slice(0, 220)
    });
    return {
      competitionId: closedSnapshot.id,
      skipped: false,
      status: "failed",
      error: cleanText(error?.message || error).slice(0, 220)
    };
  }
}

exports.closeDueEngagementCompetitions = onSchedule(ENGAGEMENT_CLOSURE_SCHEDULER_OPTIONS, async () => {
  const now = new Date().toISOString();
  const snapshot = await db.collection(ENGAGEMENT_CLOSURE_QUEUE_COLLECTION)
    .where("runAt", "<=", now)
    .orderBy("runAt")
    .limit(ENGAGEMENT_CLOSURE_BATCH_LIMIT)
    .get();
  const results = [];
  for (const queueSnapshot of snapshot.docs) {
    const queue = queueSnapshot.data() || {};
    const competitionId = cleanText(queue.competitionId || queueSnapshot.id).slice(0, 128);
    if (!competitionId) {
      await queueSnapshot.ref.delete();
      results.push({ skipped: true, reason: "missing-competition-id" });
      continue;
    }
    const competitionSnapshot = await db.collection("engagementCompetitions").doc(competitionId).get();
    if (!competitionSnapshot.exists) {
      await queueSnapshot.ref.delete();
      results.push({ competitionId, skipped: true, reason: "competition-not-found" });
      continue;
    }
    const result = await processEngagementCompetitionAutomaticClosure(db, competitionSnapshot, now);
    results.push(result);
    if (result.skipped && result.reason === "deadline-not-reached") {
      const queueItem = engagementClosureQueueItem(competitionSnapshot.data() || {}, competitionSnapshot.id, now);
      if (queueItem) await queueSnapshot.ref.set(queueItem, { merge: true });
      else await queueSnapshot.ref.delete();
    } else {
      await queueSnapshot.ref.delete();
    }
  }
  if (snapshot.size || results.length) {
    await writeAuditLog("engagementCompetition.automaticClosureSweep", "system:engagementClosureScheduler", {
      checkedAt: now,
      dueQueueCount: snapshot.size,
      processedCount: results.filter((result) => !result.skipped).length,
      skippedCount: results.filter((result) => result.skipped).length,
      failedCount: results.filter((result) => result.status === "failed").length
    });
  }
  return null;
});

exports.saveEngagementClubTeamLeader = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementClubAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }
  const competition = await db.collection("engagementCompetitions").doc(competitionId).get();
  if (!competition.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  assertEngagementClubWriteOpen(competition.data() || {});
  const rawTeamLeader = cleanEngagementTeamLeader(request.data?.teamLeader || {});
  let personRef = null;
  let person = null;
  if (rawTeamLeader.mode === "person" && !rawTeamLeader.externalClub && rawTeamLeader.personId) {
    personRef = db.collection("engagementClubPeople").doc(rawTeamLeader.personId);
    const personSnapshot = await personRef.get();
    if (!personSnapshot.exists) {
      throw new HttpsError("not-found", "Membre du club introuvable.");
    }
    person = engagementClubPersonItem(personSnapshot);
    if (person.clubId !== context.clubId || person.active === false) {
      throw new HttpsError("permission-denied", "Membre hors perimetre club ou inactif.");
    }
    if (!person.birthDate || !person.sex) {
      throw new HttpsError("failed-precondition", "Completez la date de naissance et le sexe de ce membre avant de le choisir comme chef d'equipe.");
    }
  }
  const teamLeader = rawTeamLeader.mode === "person" && !rawTeamLeader.externalClub
    ? {
        ...rawTeamLeader,
        ...(person ? {
          personId: person.id,
          firstName: person.firstName,
          lastName: person.lastName,
          birthDate: person.birthDate,
          sex: person.sex,
          licenseNumber: person.licenseNumber
        } : {}),
        clubId: context.clubId,
        clubName: context.clubName
      }
    : rawTeamLeader;
  if (!engagementTeamLeaderComplete(teamLeader)) {
    throw new HttpsError("invalid-argument", "Chef d'equipe ou renonciation obligatoire.");
  }
  const now = new Date().toISOString();
  const entryRef = db.collection("engagementClubEntries").doc(engagementClubEntryId(competitionId, context.clubId));
  const snapshot = await entryRef.get();
  if (snapshot.exists && teamLeader.mode === "person") {
    const entryData = snapshot.data() || {};
    const licenseKey = engagementPersonLicenseKey(teamLeader.licenseNumber);
    const alreadyOfficial = (Array.isArray(entryData.officials) ? entryData.officials : []).some((official) =>
      (teamLeader.personId && official.personId === teamLeader.personId) ||
      (licenseKey && engagementPersonLicenseKey(official.licenseNumber) === licenseKey));
    const alreadySwimmer = (Array.isArray(entryData.swimmers) ? entryData.swimmers : []).some((swimmer) =>
      (person?.swimmerIndexId && cleanText(swimmer.swimmerIndexId) === person.swimmerIndexId) ||
      (licenseKey && engagementPersonLicenseKey(swimmer.licenseNumber) === licenseKey));
    if (alreadyOfficial) throw new HttpsError("failed-precondition", "Une meme personne ne peut pas etre chef d'equipe et officiel sur cette competition.");
    if (alreadySwimmer) throw new HttpsError("failed-precondition", "Une meme personne ne peut pas etre chef d'equipe et nageur sur cette competition.");
  }
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
  const batch = db.batch();
  batch.set(entryRef, payload, { merge: true });
  if (personRef && person) {
    const updatedPerson = {
      ...person,
      roles: {
        ...person.roles,
        teamLeader: true
      },
      updatedAt: now,
      updatedBy: context.uid
    };
    batch.set(personRef, {
      roles: updatedPerson.roles,
      updatedAt: now,
      updatedBy: context.uid
    }, { merge: true });
    upsertEngagementClubPeopleRosterPerson(batch, db, updatedPerson, now);
  }
  await batch.commit();
  await writeAuditLog("engagementClubEntry.teamLeaderSaved", context.uid, {
    competitionId,
    clubId: context.clubId,
    mode: teamLeader.mode
  });
  const updatedData = { ...(snapshot.data() || {}), ...payload };
  return {
    ok: true,
    entry: engagementClubEntryItem({ id: entryRef.id, exists: true, data: () => updatedData })
  };
});

exports.removeEngagementClubTeamLeader = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementClubAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }
  const competition = await db.collection("engagementCompetitions").doc(competitionId).get();
  if (!competition.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  assertEngagementClubWriteOpen(competition.data() || {});
  const now = new Date().toISOString();
  const entryRef = db.collection("engagementClubEntries").doc(engagementClubEntryId(competitionId, context.clubId));
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(entryRef);
    if (!snapshot.exists) {
      throw new HttpsError("not-found", "Aucun chef d'equipe enregistre.");
    }
    const entry = engagementClubEntryItem(snapshot);
    if (entry.teamLeader.mode !== "person") {
      throw new HttpsError("failed-precondition", "Aucun chef d'equipe a retirer.");
    }
    if (engagementClubEntryHasParticipants(entry)) {
      throw new HttpsError("failed-precondition", "Le chef d'equipe ne peut plus etre retire : remplacez-le tant que des nageurs, officiels ou relais sont engages.");
    }
    transaction.delete(entryRef);
    deleteEngagementCompetitionEntrySummary(transaction, db, entry, now);
  });
  await writeAuditLog("engagementClubEntry.teamLeaderRemoved", context.uid, {
    competitionId,
    clubId: context.clubId
  });
  return {
    ok: true,
    entry: engagementClubEntryItem(null, {
      competitionId,
      clubId: context.clubId,
      clubName: context.clubName,
      regionId: context.regionId,
      status: "active"
    })
  };
});

exports.listEngagementClubPeople = onCall(CALLABLE_OPTIONS, async (request) => {
  const startedAt = Date.now();
  const context = await engagementClubAccessContext(request);
  const includeInactive = request.data?.includeInactive === true;
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
    readStats: portalReadStats("listEngagementClubPeople", startedAt, {
      baseDocuments: 2,
      variableDocumentsMax: rosterGenerated ? 200 : 0,
      cacheHit: !rosterGenerated
    }),
    people
  };
});

async function resolveEngagementClubPersonSwimmer(db, context = {}, rawPerson = {}) {
  const swimmerIndexId = cleanText(rawPerson.swimmerIndexId).slice(0, 80);
  if (!swimmerIndexId) return null;
  const swimmerSource = cleanText(rawPerson.swimmerSource || rawPerson.source || "performances").slice(0, 40) || "performances";
  const rosterSnapshot = await engagementClubRosterRef(db, context.clubId).get();
  if (!rosterSnapshot.exists) {
    throw new HttpsError("failed-precondition", "Chargez d'abord les nageurs du club.");
  }
  const swimmer = engagementClubRosterSwimmersFromData(rosterSnapshot.data() || {}).find((candidate) =>
    candidate.swimmerIndexId === swimmerIndexId && cleanText(candidate.source || "performances") === swimmerSource
  );
  if (!swimmer || swimmer.clubId !== context.clubId || swimmer.active === false) {
    throw new HttpsError("permission-denied", "Nageur hors perimetre club ou inactif.");
  }
  return swimmer;
}

exports.saveEngagementClubPerson = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementClubAccessContext(request);
  const personId = cleanText(request.data?.personId).slice(0, 80);
  const rawPerson = request.data?.person || {};
  const linkedSwimmer = await resolveEngagementClubPersonSwimmer(db, context, rawPerson);
  const person = cleanEngagementClubPerson(linkedSwimmer ? {
    ...rawPerson,
    firstName: linkedSwimmer.firstName,
    lastName: linkedSwimmer.lastName,
    licenseNumber: linkedSwimmer.licenseNumber,
    swimmerIndexId: linkedSwimmer.swimmerIndexId,
    swimmerSource: linkedSwimmer.source,
    birthDate: linkedSwimmer.birthDate,
    sex: linkedSwimmer.sex,
    identityKey: linkedSwimmer.identityKey
  } : rawPerson, context);
  const docId = personId || stableHash(`${context.clubId}|${person.licenseNumber}`).slice(0, 40);
  const ref = db.collection("engagementClubPeople").doc(docId);
  const [snapshot, peopleRosterSnapshot] = await Promise.all([
    ref.get(),
    engagementClubPeopleRosterRef(db, context.clubId).get()
  ]);
  if (snapshot.exists && cleanText(snapshot.data()?.clubId) !== context.clubId) {
    throw new HttpsError("permission-denied", "Personne hors perimetre club.");
  }
  if (!personId && snapshot.exists) {
    throwEngagementClubPersonIdentityConflict({ type: "license", person: engagementClubPersonItem(snapshot) });
  }
  if (peopleRosterSnapshot.exists) {
    const conflict = engagementClubPersonIdentityConflict(
      engagementClubPeopleRosterPeopleFromData(peopleRosterSnapshot.data() || {}),
      person,
      personId
    );
    if (conflict) throwEngagementClubPersonIdentityConflict(conflict);
  }
  if (!personId && person.roles.teamLeader && await engagementClubPersonOutsideClubConflict(person, context.clubId)) {
    throw new HttpsError("failed-precondition", "Cette personne existe déjà dans un autre club. Déclarez-la comme chef d'équipe hors club.", {
      outsideClubExistingPerson: true
    });
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
    firstName: person.firstName,
    lastName: person.lastName,
    clubId: context.clubId,
    licenseNumber: person.licenseNumber,
    roles: person.roles
  });
  return {
    ok: true,
    person: engagementClubPersonItem({ id: ref.id, exists: true, data: () => ({ ...(snapshot.data() || {}), ...payload }) })
  };
});

exports.setEngagementClubPersonStatus = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementClubAccessContext(request);
  const personId = cleanText(request.data?.personId).slice(0, 80);
  const active = request.data?.active === true;
  if (!personId) {
    throw new HttpsError("invalid-argument", "Personne requise.");
  }
  const ref = db.collection("engagementClubPeople").doc(personId);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Personne introuvable.");
  }
  if (cleanText(snapshot.data()?.clubId) !== context.clubId) {
    throw new HttpsError("permission-denied", "Personne hors perimetre club.");
  }
  const now = new Date().toISOString();
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
    firstName: cleanText(snapshot.data()?.firstName).slice(0, 80),
    lastName: cleanText(snapshot.data()?.lastName).slice(0, 80),
    clubId: context.clubId,
    active
  });
  return {
    ok: true,
    person: engagementClubPersonItem({ id: ref.id, exists: true, data: () => ({ ...(snapshot.data() || {}), ...payload }) })
  };
});

exports.saveEngagementClubOfficials = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementClubAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }
  const competition = await db.collection("engagementCompetitions").doc(competitionId).get();
  if (!competition.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  assertEngagementClubWriteOpen(competition.data() || {});
  const entryRef = db.collection("engagementClubEntries").doc(engagementClubEntryId(competitionId, context.clubId));
  const entry = await entryRef.get();
  if (!entry.exists || !engagementTeamLeaderComplete(entry.data()?.teamLeader || {})) {
    throw new HttpsError("failed-precondition", "Chef d'equipe ou renonciation obligatoire avant les officiels.");
  }

  const personIds = Array.from(new Set((Array.isArray(request.data?.officialPersonIds) ? request.data.officialPersonIds : [])
    .map((id) => cleanText(id).slice(0, 80))
    .filter(Boolean)))
    .slice(0, 80);
  const personRefs = personIds.map((id) => db.collection("engagementClubPeople").doc(id));
  const personDocs = personRefs.length ? await db.getAll(...personRefs) : [];
  const entryData = entry.data() || {};
  const teamLeader = entryData.teamLeader || {};
  const enteredSwimmers = Array.isArray(entryData.swimmers) ? entryData.swimmers.map(cleanEngagementEntrySwimmer) : [];
  const officials = personDocs.map((doc) => {
    if (!doc.exists) {
      throw new HttpsError("invalid-argument", "Officiel inconnu dans la base club.");
    }
    const person = engagementClubPersonItem(doc);
    if (person.clubId !== context.clubId || !person.active || person.roles.official !== true) {
      throw new HttpsError("permission-denied", "Officiel hors perimetre club ou inactif.");
    }
    const licenseKey = engagementPersonLicenseKey(person.licenseNumber);
    if (cleanText(teamLeader.personId) === person.id || (licenseKey && engagementPersonLicenseKey(teamLeader.licenseNumber) === licenseKey)) {
      throw new HttpsError("failed-precondition", "Une meme personne ne peut pas etre chef d'equipe et officiel sur cette competition.");
    }
    if (enteredSwimmers.some((swimmer) =>
      (person.swimmerIndexId && swimmer.swimmerIndexId === person.swimmerIndexId) ||
      (licenseKey && engagementPersonLicenseKey(swimmer.licenseNumber) === licenseKey))) {
      throw new HttpsError("failed-precondition", "Une meme personne ne peut pas etre nageur et officiel sur cette competition.");
    }
    return {
      personId: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      birthDate: person.birthDate,
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
  const updatedData = { ...entryData, officials, updatedAt: now, updatedBy: context.uid };
  return {
    ok: true,
    entry: engagementClubEntryItem({ id: entryRef.id, exists: true, data: () => updatedData })
  };
});

exports.listEngagementClubSwimmers = onCall(CALLABLE_OPTIONS, async (request) => {
  const startedAt = Date.now();
  const context = await engagementClubAccessContext(request);
  const limit = Math.min(800, Math.max(50, Math.trunc(Number(request.data?.limit) || 400)));
  const rosterSnapshot = await engagementClubRosterRef(db, context.clubId).get();
  const rosterReady = rosterSnapshot?.exists && cleanText(rosterSnapshot.data()?.generatedAt);
  if (!rosterReady) {
    throw new HttpsError(
      "unavailable",
      "Effectif agrege momentanement indisponible. Aucune reconstruction massive n'a ete lancee."
    );
  }
  const swimmers = sortEngagementClubSwimmers(
    uniqueEngagementClubSwimmers(engagementClubRosterSwimmersFromData(rosterSnapshot.data() || {}), limit)
  );
  return {
    ok: true,
    clubId: context.clubId,
    rosterGenerated: false,
    readStats: portalReadStats("listEngagementClubSwimmers", startedAt, {
      baseDocuments: 2,
      variableDocumentsMax: 0,
      cacheHit: true
    }),
    swimmers
  };
});

exports.setEngagementClubSwimmerActivityStatus = onCall(CALLABLE_OPTIONS, async (request) => {
  const startedAt = Date.now();
  const context = await engagementClubAccessContext(request);
  const swimmerIndexId = cleanText(request.data?.swimmerIndexId).slice(0, 80);
  const source = cleanText(request.data?.source || "performances").slice(0, 40) || "performances";
  const status = cleanEngagementClubActivityStatus(request.data?.status, "");
  if (!swimmerIndexId || !status) {
    throw new HttpsError("invalid-argument", "Nageur et statut actif ou inactif requis.");
  }
  const rosterRef = engagementClubRosterRef(db, context.clubId);
  const snapshot = await rosterRef.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "Effectif du club introuvable.");
  const data = snapshot.data() || {};
  const entries = data.swimmers && typeof data.swimmers === "object" ? data.swimmers : {};
  const match = Object.entries(entries).find(([, swimmer]) =>
    cleanText(swimmer?.swimmerIndexId || swimmer?.id) === swimmerIndexId &&
    cleanText(swimmer?.source || "performances") === source
  );
  if (!match) throw new HttpsError("not-found", "Nageur introuvable dans l'effectif du club.");
  const [key, swimmer] = match;
  const now = new Date().toISOString();
  const updated = engagementClubRosterSwimmerItem({
    ...swimmer,
    clubActivityStatus: status,
    clubActivityStatusSource: "club",
    clubActivityStatusUpdatedAt: now,
    clubActivityStatusUpdatedBy: context.uid
  });
  await rosterRef.set({
    updatedAt: now,
    swimmers: { [key]: updated }
  }, { merge: true });
  await writeAuditLog("engagementClubSwimmer.activityStatusUpdated", context.uid, {
    clubId: context.clubId,
    swimmerIndexId,
    swimmerId: cleanText(updated.swimmerId),
    source,
    status
  });
  return {
    ok: true,
    swimmer: updated,
    readStats: portalReadStats("setEngagementClubSwimmerActivityStatus", startedAt, {
      baseDocuments: 3,
      variableDocumentsMax: 0,
      cacheHit: true
    })
  };
});

exports.rebuildEngagementClubAggregates = onCall(MIGRATION_CALLABLE_OPTIONS, async (request) => {
  const startedAt = Date.now();
  const context = await engagementAccessContext(request);
  if (!context.national) {
    throw new HttpsError("permission-denied", "Reconstruction reservee au niveau national.");
  }
  const clubIds = Array.from(new Set((Array.isArray(request.data?.clubIds) ? request.data.clubIds : [])
    .map((clubId) => cleanText(clubId).slice(0, 40))
    .filter(Boolean))).slice(0, 1);
  if (!clubIds.length) throw new HttpsError("invalid-argument", "Au moins un club est requis.");
  const results = [];
  for (const clubId of clubIds) {
    const userSnapshot = await db.collection("users").where("clubId", "==", clubId).limit(1).get();
    const user = userSnapshot.docs[0]?.data() || {};
    const clubContext = {
      clubId,
      clubName: cleanText(user.clubName).slice(0, 140),
      regionId: cleanText(user.regionId).slice(0, 80)
    };
    const [swimmers, people] = await Promise.all([
      rebuildEngagementClubRoster(db, clubContext, 200),
      rebuildEngagementClubPeopleRoster(db, clubContext)
    ]);
    results.push({ clubId, swimmerCount: swimmers.length, personCount: people.length });
  }
  await writeAuditLog("engagementClubAggregates.rebuilt", context.uid, {
    clubCount: results.length,
    clubs: results
  });
  return {
    ok: true,
    results,
    readStats: portalReadStats("rebuildEngagementClubAggregates", startedAt, {
      baseDocuments: clubIds.length,
      variableDocumentsMax: clubIds.length * 801,
      cacheHit: false
    })
  };
});

exports.previewEngagementClubSwimmerCreation = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementClubAccessContext(request);
  const swimmer = cleanEngagementNewSwimmer(request.data?.swimmer || {}, context);
  await assertNoEngagementSwimmerLicenseConflict(db, swimmer);
  const alerts = await buildEngagementNewSwimmerAlerts(swimmer, context);
  const blockingAlerts = alerts.filter((alert) => alert.type === "inverted-identity");
  return {
    ok: true,
    swimmer,
    alerts,
    requiresConfirmation: alerts.length > 0 && blockingAlerts.length === 0,
    blocksCreation: blockingAlerts.length > 0
  };
});

exports.previewEngagementClubSwimmerRecovery = onCall(CALLABLE_OPTIONS, async (request) => {
  const startedAt = Date.now();
  const context = await engagementClubAccessContext(request);
  const preview = await engagementSwimmerRecoveryPreview(db, request.data?.licenseNumber, context);
  return {
    ok: true,
    ...preview,
    readStats: portalReadStats("previewEngagementClubSwimmerRecovery", startedAt, {
      baseDocuments: 2,
      variableDocumentsMax: 4,
      cacheHit: false
    })
  };
});

exports.recoverEngagementClubSwimmer = onCall(CALLABLE_OPTIONS, async (request) => {
  const startedAt = Date.now();
  const context = await engagementClubAccessContext(request);
  const preview = await engagementSwimmerRecoveryPreview(db, request.data?.licenseNumber, context);
  if (!preview.found) throw new HttpsError("not-found", "Nageur introuvable dans la base.");
  if (preview.sameClub) throw new HttpsError("already-exists", "Ce nageur est deja connu dans votre club.");
  if (!preview.eligible) {
    throw new HttpsError("failed-precondition", "Ce nageur a deja un resultat publie cette saison. Son changement de club necessite une derogation nationale.");
  }

  const now = new Date().toISOString();
  const previousSwimmer = preview.swimmer || {};
  const swimmer = cleanEngagementNewSwimmer({
    ...previousSwimmer,
    licenseNumber: request.data?.licenseNumber
  }, context);
  const swimmerId = preview.engagementSwimmerId || stableHash([
    context.clubId,
    swimmer.identityKey || swimmer.name,
    swimmer.licenseNumber
  ].join("|")).slice(0, 40);
  const swimmerRef = db.collection("engagementClubSwimmers").doc(swimmerId);
  const licensePayload = {
    ...engagementSwimmerLicensePayload({ ...swimmer, swimmerIndexId: swimmerId }, context, {
      type: "club-recovery",
      competitionId: cleanText(request.data?.competitionId).slice(0, 128),
      collectedAt: now
    }),
    updatedAt: now,
    updatedBy: context.uid
  };
  const batch = db.batch();
  if (preview.engagementSwimmerId) {
    deleteEngagementClubRosterSwimmer(batch, db, {
      ...previousSwimmer,
      swimmerIndexId: swimmerId,
      source: "engagement"
    }, now);
  }
  const payload = {
    ...swimmer,
    source: "engagement",
    clubActivityStatus: "active",
    clubActivityStatusSource: "club-recovery",
    clubActivityStatusUpdatedAt: now,
    clubActivityStatusUpdatedBy: context.uid,
    updatedAt: now,
    updatedBy: context.uid,
    ...(preview.engagementSwimmerId ? {} : { createdAt: now, createdBy: context.uid })
  };
  batch.set(swimmerRef, payload, { merge: true });
  batch.set(db.collection("engagementSwimmerLicenses").doc(engagementSwimmerLicenseId({ ...swimmer, swimmerIndexId: swimmerId })), licensePayload, { merge: true });
  preview.licenseRecordIds
    .filter((id) => id !== engagementSwimmerLicenseId({ ...swimmer, swimmerIndexId: swimmerId }))
    .forEach((id) => batch.delete(db.collection("engagementSwimmerLicenses").doc(id)));
  const licenseNumberRefId = engagementSwimmerLicenseNumberId(swimmer.licenseNumber);
  if (licenseNumberRefId) {
    batch.set(db.collection(ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION).doc(licenseNumberRefId), {
      ...licensePayload,
      swimmerIndexId: swimmerId,
      licenseKey: engagementSwimmerLicenseNumberKey(swimmer.licenseNumber)
    }, { merge: true });
  }
  upsertEngagementClubRosterSwimmer(batch, db, { ...payload, id: swimmerId, swimmerIndexId: swimmerId }, now);
  const transferAlertRef = db.collection("engagementSwimmerAlerts").doc(stableHash([
    "club-change",
    swimmer.licenseNumber,
    preview.season.label,
    previousSwimmer.clubId,
    context.clubId
  ].join("|")).slice(0, 40));
  batch.set(transferAlertRef, {
    type: "club-change",
    status: "confirmed-by-club",
    swimmerIndexId: swimmerId,
    identityKey: swimmer.identityKey,
    licenseNumber: swimmer.licenseNumber,
    name: swimmer.name,
    fromClubId: cleanText(previousSwimmer.clubId),
    fromClubName: cleanText(previousSwimmer.clubName),
    clubId: context.clubId,
    clubName: context.clubName,
    seasonLabel: preview.season.label,
    reason: "no-published-result-this-season",
    confirmedAt: now,
    confirmedBy: context.uid,
    updatedAt: now
  }, { merge: true });
  await batch.commit();
  await writeAuditLog("engagementClubSwimmer.recovered", context.uid, {
    swimmerId,
    licenseNumber: swimmer.licenseNumber,
    fromClubId: cleanText(previousSwimmer.clubId),
    toClubId: context.clubId,
    seasonLabel: preview.season.label,
    publishedResult: false
  });
  const updated = await swimmerRef.get();
  return {
    ok: true,
    swimmer: engagementNewSwimmerItem(updated),
    readStats: portalReadStats("recoverEngagementClubSwimmer", startedAt, {
      baseDocuments: 2,
      variableDocumentsMax: 8,
      cacheHit: false
    })
  };
});

exports.createEngagementClubSwimmer = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementClubAccessContext(request);
  const swimmer = cleanEngagementNewSwimmer(request.data?.swimmer || {}, context);
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
  if (snapshot.exists) {
    throw new HttpsError("already-exists", "Un nageur avec cette licence existe deja pour ce club. Utilisez la fiche existante.");
  }
  await assertNoEngagementSwimmerLicenseConflict(db, swimmer);
  const alerts = await buildEngagementNewSwimmerAlerts(swimmer, context);
  const blockingAlerts = alerts.filter((alert) => alert.type === "inverted-identity");
  if (blockingAlerts.length) {
    throw new HttpsError("already-exists", "Un nageur existe deja avec le nom et le prenom inverses.", {
      alerts: blockingAlerts,
      blocksCreation: true
    });
  }
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
    clubActivityStatus: "active",
    clubActivityStatusSource: "club-creation",
    clubActivityStatusUpdatedAt: now,
    clubActivityStatusUpdatedBy: context.uid,
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
  const licenseNumberRefId = engagementSwimmerLicenseNumberId(swimmer.licenseNumber);
  if (licenseNumberRefId) {
    batch.create(db.collection(ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION).doc(licenseNumberRefId), {
      ...licensePayload,
      swimmerIndexId: docId,
      licenseKey: engagementSwimmerLicenseNumberKey(swimmer.licenseNumber),
      updatedAt: now,
      updatedBy: context.uid
    });
  }
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
  const snapshot = await db
    .collection("engagementClubSwimmers")
    .orderBy("updatedAt", "desc")
    .limit(limit)
    .get();
  return {
    ok: true,
    swimmers: snapshot.docs.map(engagementNewSwimmerItem)
  };
});

function nationalSwimmerSearchMatches(swimmer = {}, terms = []) {
  if (!terms.length) return true;
  const haystack = normalizePerformanceSearchText([
    swimmer.firstName,
    swimmer.lastName,
    swimmer.name,
    swimmer.licenseNumber,
    swimmer.birthDate,
    swimmer.sex,
    swimmer.clubId,
    swimmer.club,
    swimmer.clubName,
    swimmer.identityKey,
    swimmer.id,
    swimmer.swimmerId,
    ...(Array.isArray(swimmer.sourceIds) ? swimmer.sourceIds : [])
  ].filter(Boolean).join(" "));
  return terms.every((term) => haystack.includes(term));
}

function nationalSwimmerSort(left = {}, right = {}) {
  return cleanText(right.latestDate).localeCompare(cleanText(left.latestDate)) ||
    cleanText(left.lastName).localeCompare(cleanText(right.lastName), "fr") ||
    cleanText(left.firstName).localeCompare(cleanText(right.firstName), "fr") ||
    cleanText(left.source).localeCompare(cleanText(right.source), "fr");
}

async function searchEngagementNationalSwimmerDocs(db, query = "", limit = 40) {
  const cleanQuery = cleanText(query).slice(0, 120);
  const normalized = normalizePerformanceSearchText(cleanQuery);
  const terms = normalized.split(/\s+/).filter((term) => term.length >= 2).slice(0, 5);
  const licenseKey = engagementSwimmerLicenseNumberKey(cleanQuery);
  if (!terms.length && licenseKey.length < 3) return [];
  const docs = new Map();
  const addDoc = (doc, source) => {
    if (!doc.exists) return;
    const key = `${source}:${doc.id}`;
    if (!docs.has(key)) docs.set(key, { doc, source });
  };
  const reads = [];
  if (terms.length) {
    reads.push(db.collection(PERFORMANCE_SWIMMERS_COLLECTION)
      .where("searchPrefixes", "array-contains", terms[0].slice(0, 18))
      .limit(Math.min(80, Math.max(limit * 2, 30)))
      .get()
      .then((snapshot) => snapshot.docs.forEach((doc) => addDoc(doc, "performances"))));
  }
  if (cleanQuery) {
    reads.push(db.collection(PERFORMANCE_SWIMMERS_COLLECTION)
      .where("licenseNumber", "==", cleanQuery)
      .limit(limit)
      .get()
      .then((snapshot) => snapshot.docs.forEach((doc) => addDoc(doc, "performances"))));
    reads.push(db.collection("engagementClubSwimmers")
      .where("licenseNumber", "==", cleanQuery)
      .limit(limit)
      .get()
      .then((snapshot) => snapshot.docs.forEach((doc) => addDoc(doc, "engagement"))));
  }
  if (terms.length) {
    const nameSeed = cleanQuery.split(/\s+/).filter(Boolean).at(-1) || cleanQuery;
    const titleCase = nameSeed.toLocaleLowerCase("fr").replace(/(^|[\s'-])\p{L}/gu, (letter) => letter.toLocaleUpperCase("fr"));
    const variants = Array.from(new Set([nameSeed, nameSeed.toLocaleUpperCase("fr"), titleCase].filter(Boolean)));
    const querySpecs = ["lastName", "firstName"]
      .flatMap((field) => variants.map((variant) => ({ field, variant })))
      .slice(0, 6);
    const perQueryLimit = Math.max(8, Math.ceil((limit * 2) / Math.max(1, querySpecs.length)));
    reads.push(...querySpecs.map(({ field, variant }) => db.collection("engagementClubSwimmers")
      .orderBy(field)
      .startAt(variant)
      .endAt(`${variant}\uf8ff`)
      .limit(perQueryLimit)
      .get()
      .then((snapshot) => snapshot.docs.forEach((doc) => addDoc(doc, "engagement")))));
  }
  await Promise.all(reads);
  return Array.from(docs.values())
    .map((item) => engagementNationalSwimmerItemFromDoc(item.doc, item.source))
    .filter((swimmer) => nationalSwimmerSearchMatches(swimmer, terms))
    .sort(nationalSwimmerSort)
    .slice(0, limit);
}

exports.searchEngagementNationalSwimmers = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  if (!context.national) {
    throw new HttpsError("permission-denied", "Recherche reservee au niveau national.");
  }
  const query = cleanText(request.data?.query).slice(0, 120);
  const limit = Math.min(80, Math.max(10, Math.trunc(Number(request.data?.limit) || 40)));
  const swimmers = await searchEngagementNationalSwimmerDocs(db, query, limit);
  return {
    ok: true,
    query,
    swimmers
  };
});

function engagementSwimmerIdentitySnapshot(swimmer = {}, source = swimmer.source || "") {
  const firstName = cleanText(swimmer.firstName).slice(0, 80);
  const lastName = cleanText(swimmer.lastName).slice(0, 80);
  return cleanFirestoreValue({
    id: cleanText(swimmer.id || swimmer.swimmerIndexId).slice(0, 80),
    swimmerIndexId: cleanText(swimmer.swimmerIndexId || swimmer.id).slice(0, 80),
    source: cleanText(source || swimmer.source).slice(0, 40),
    swimmerId: cleanText(swimmer.swimmerId).slice(0, 80),
    sourceIds: Array.isArray(swimmer.sourceIds)
      ? swimmer.sourceIds.map((id) => cleanText(id).slice(0, 80)).filter(Boolean).slice(0, 25)
      : [],
    identityKey: cleanText(swimmer.identityKey).slice(0, 180),
    firstName,
    lastName,
    name: cleanText(swimmer.name).slice(0, 160) || [firstName, lastName].filter(Boolean).join(" "),
    birthDate: cleanIsoDate(swimmer.birthDate),
    sex: cleanText(swimmer.sex).toUpperCase().slice(0, 1),
    licenseNumber: cleanText(swimmer.licenseNumber).toUpperCase().slice(0, 60),
    clubId: cleanText(swimmer.clubId).slice(0, 40),
    clubName: cleanText(swimmer.clubName).slice(0, 140),
    performanceCount: Math.max(0, Math.trunc(Number(swimmer.performanceCount) || 0))
  });
}

function cleanEngagementSwimmerIdentityCorrection(raw = {}, current = {}) {
  const firstName = cleanText(raw.firstName ?? current.firstName).slice(0, 80);
  const lastName = cleanText(raw.lastName ?? current.lastName).slice(0, 80);
  const birthDate = cleanIsoDate(raw.birthDate ?? current.birthDate);
  const sex = cleanText(raw.sex ?? current.sex).toUpperCase().slice(0, 1);
  const licenseNumber = cleanText(raw.licenseNumber ?? current.licenseNumber).toUpperCase().slice(0, 60);
  if (!firstName || !lastName || !birthDate || !["F", "M"].includes(sex)) {
    throw new HttpsError("invalid-argument", "Nom, prenom, date de naissance et sexe sont obligatoires.");
  }
  if (licenseNumber && !ENGAGEMENT_SWIMMER_LICENSE_PATTERN.test(licenseNumber)) {
    throw new HttpsError("invalid-argument", "Le numero de licence doit respecter le format A-12-34567.");
  }
  const correction = {
    firstName,
    lastName,
    name: [firstName, lastName].join(" "),
    birthDate,
    sex,
    licenseNumber,
    identityKey: engagementSwimmerIdentityKey(firstName, lastName, birthDate)
  };
  const changed = ["firstName", "lastName", "birthDate", "sex", "licenseNumber"]
    .some((field) => cleanText(correction[field]) !== cleanText(current[field]));
  if (!changed) {
    throw new HttpsError("invalid-argument", "Aucune modification n'a ete saisie.");
  }
  return correction;
}

async function findPerformanceSwimmerCorrectionTarget(db, swimmerId = "", identityKey = "") {
  const cleanId = cleanText(swimmerId).slice(0, 80);
  const cleanIdentityKey = cleanText(identityKey).slice(0, 180);
  if (cleanId) {
    const direct = await db.collection(PERFORMANCE_SWIMMERS_COLLECTION).doc(cleanId).get();
    if (direct.exists) return direct;
    const bySourceId = await db.collection(PERFORMANCE_SWIMMERS_COLLECTION)
      .where("sourceIds", "array-contains", cleanId)
      .limit(2)
      .get();
    if (bySourceId.docs.length === 1) return bySourceId.docs[0];
  }
  if (cleanIdentityKey) {
    const byIdentity = await db.collection(PERFORMANCE_SWIMMERS_COLLECTION)
      .where("identityKey", "==", cleanIdentityKey)
      .limit(2)
      .get();
    if (byIdentity.docs.length === 1) return byIdentity.docs[0];
  }
  return null;
}

async function findEngagementSwimmerCorrectionLicense(db, swimmerIds = []) {
  const documentIds = Array.from(new Set((Array.isArray(swimmerIds) ? swimmerIds : [])
    .map((candidateId) => cleanText(candidateId).slice(0, 80))
    .filter(Boolean)
    .map((candidateId) => engagementSwimmerLicenseId({ swimmerIndexId: candidateId })))).slice(0, 25);
  if (!documentIds.length) return { license: null, documentId: "" };
  const snapshots = await db.getAll(...documentIds.map((documentId) =>
    db.collection("engagementSwimmerLicenses").doc(documentId)
  ));
  const snapshot = snapshots.find((candidate) => candidate.exists) || null;
  return {
    license: snapshot?.exists ? engagementSwimmerLicenseItem(snapshot) : null,
    documentId: snapshot?.id || ""
  };
}

async function getEngagementSwimmerCorrectionTarget(db, source = "", swimmerId = "", identityKey = "") {
  const cleanSource = ["engagement", "performances", "reference"].includes(cleanText(source)) ? cleanText(source) : "performances";
  const cleanId = cleanText(swimmerId).slice(0, 80);
  const cleanIdentityKey = cleanText(identityKey).slice(0, 180);
  if (!cleanId) throw new HttpsError("invalid-argument", "Nageur requis.");
  if (cleanSource === "engagement") {
    const ref = db.collection("engagementClubSwimmers").doc(cleanId);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new HttpsError("not-found", "Nageur introuvable.");
    return {
      requestedSource: cleanSource,
      requestedSwimmerId: cleanId,
      source: cleanSource,
      swimmerId: cleanId,
      ref,
      snapshot,
      swimmer: engagementNewSwimmerItem(snapshot)
    };
  }
  const performanceSnapshot = await findPerformanceSwimmerCorrectionTarget(
    db,
    cleanId,
    cleanIdentityKey
  );
  if (performanceSnapshot?.exists) {
    const performanceSwimmer = engagementClubSwimmerItem(performanceSnapshot);
    const licenseCandidateIds = Array.from(new Set([
      performanceSnapshot.id,
      cleanId,
      performanceSwimmer.swimmerId,
      ...(performanceSwimmer.sourceIds || [])
    ].map((id) => cleanText(id).slice(0, 80)).filter(Boolean)));
    const licenseMatch = await findEngagementSwimmerCorrectionLicense(db, licenseCandidateIds);
    const license = licenseMatch.license;
    return {
      requestedSource: cleanSource,
      requestedSwimmerId: cleanId,
      source: "performances",
      swimmerId: performanceSnapshot.id,
      licenseDocumentId: licenseMatch.documentId,
      ref: performanceSnapshot.ref,
      snapshot: performanceSnapshot,
      swimmer: {
        ...performanceSwimmer,
        ...(license?.licenseNumber ? {
          licenseNumber: license.licenseNumber,
          licenseVerificationStatus: license.verificationStatus,
          licenseSeasonLabel: license.licenseSeasonLabel,
          licenseSeasonStatus: license.licenseSeasonStatus,
          licenseSeasons: license.licenseSeasons
        } : {})
      }
    };
  }
  const performanceRows = await getPerformanceBaseRowsBySwimmer({
    swimmerIds: [cleanId],
    identityKey: cleanIdentityKey
  });
  if (performanceRows.length) {
    const candidates = aggregateSwimmerIndexRows(performanceRows);
    const matchingCandidates = candidates.filter((candidate) => {
      const candidateIds = [candidate.id, ...(candidate.sourceIds || []), ...(candidate.aliases || [])]
        .map(cleanText)
        .filter(Boolean);
      return candidateIds.includes(cleanId) || (cleanIdentityKey && cleanText(candidate.identityKey) === cleanIdentityKey);
    });
    if (matchingCandidates.length > 1) {
      throw new HttpsError("failed-precondition", "Plusieurs fiches de performances correspondent a cet identifiant. Utilisez la fusion avant la correction.");
    }
    if (matchingCandidates.length === 1) {
      const recovered = matchingCandidates[0];
      if (cleanIdentityKey && cleanText(recovered.identityKey) !== cleanIdentityKey) {
        throw new HttpsError("failed-precondition", "La fiche de performances a change depuis la recherche. Rechargez-la avant de corriger.");
      }
      const licenseMatch = await findEngagementSwimmerCorrectionLicense(db, [
        cleanId,
        recovered.id,
        ...(recovered.sourceIds || []),
        ...(recovered.aliases || [])
      ]);
      return {
        requestedSource: cleanSource,
        requestedSwimmerId: cleanId,
        source: "performance-base",
        swimmerId: cleanText(recovered.id || cleanId).slice(0, 80),
        ref: null,
        snapshot: null,
        licenseDocumentId: licenseMatch.documentId,
        swimmer: {
          ...recovered,
          source: "performances",
          ...(licenseMatch.license?.licenseNumber ? {
            licenseNumber: licenseMatch.license.licenseNumber,
            licenseVerificationStatus: licenseMatch.license.verificationStatus,
            licenseSeasonLabel: licenseMatch.license.licenseSeasonLabel,
            licenseSeasonStatus: licenseMatch.license.licenseSeasonStatus,
            licenseSeasons: licenseMatch.license.licenseSeasons
          } : {})
        },
        performanceRows,
        resolvedBy: "performance-base"
      };
    }
  }
  const referenceTarget = findReferenceSwimmerCorrectionTarget(intranapSwimmersIndex, {
    swimmerId: cleanId,
    identityKey: cleanIdentityKey
  });
  if (referenceTarget.ambiguous) {
    throw new HttpsError("failed-precondition", "Plusieurs fiches nationales correspondent a cet identifiant. Utilisez la fusion avant la correction.");
  }
  if (referenceTarget.stale) {
    throw new HttpsError("failed-precondition", "La fiche nationale a change depuis la recherche. Rechargez-la avant de corriger.");
  }
  const referenceSwimmer = referenceTarget.swimmer
    ? engagementReferenceSwimmerItem(referenceTarget.swimmer)
    : null;
  if (referenceSwimmer) {
    const licenseMatch = await findEngagementSwimmerCorrectionLicense(db, [
      cleanId,
      referenceSwimmer.id,
      ...(referenceSwimmer.sourceIds || [])
    ]);
    return {
      requestedSource: cleanSource,
      requestedSwimmerId: cleanId,
      source: "reference",
      swimmerId: cleanId,
      ref: null,
      snapshot: null,
      licenseDocumentId: licenseMatch.documentId,
      swimmer: {
        ...referenceSwimmer,
        ...(licenseMatch.license?.licenseNumber ? {
          licenseNumber: licenseMatch.license.licenseNumber,
          licenseVerificationStatus: licenseMatch.license.verificationStatus,
          licenseSeasonLabel: licenseMatch.license.licenseSeasonLabel,
          licenseSeasonStatus: licenseMatch.license.licenseSeasonStatus,
          licenseSeasons: licenseMatch.license.licenseSeasons
        } : {})
      },
      resolvedBy: `reference-${referenceTarget.matchedBy || "fallback"}`
    };
  }
  throw new HttpsError("not-found", "Nageur introuvable dans la base nationale.");
}

async function assertNoEngagementSwimmerIdentityConflict(db, current = {}, correction = {}) {
  const ignoredIds = new Set([
    current.id,
    current.swimmerIndexId,
    current.swimmerId,
    ...(Array.isArray(current.sourceIds) ? current.sourceIds : [])
  ].map((id) => cleanText(id).slice(0, 80)).filter(Boolean));
  if (correction.identityKey && correction.identityKey !== current.identityKey) {
    const [performanceSnapshot, engagementSnapshot] = await Promise.all([
      db.collection(PERFORMANCE_SWIMMERS_COLLECTION).where("identityKey", "==", correction.identityKey).limit(3).get(),
      db.collection("engagementClubSwimmers").where("identityKey", "==", correction.identityKey).limit(3).get()
    ]);
    const conflict = [
      ...performanceSnapshot.docs.map((doc) => ({ id: doc.id, source: "performances", data: doc.data() || {} })),
      ...engagementSnapshot.docs.map((doc) => ({ id: doc.id, source: "engagement", data: doc.data() || {} }))
    ].find((candidate) => !ignoredIds.has(candidate.id) && candidate.data.active !== false && cleanText(candidate.data.status) !== "merged");
    if (conflict) {
      const name = [cleanText(conflict.data.lastName), cleanText(conflict.data.firstName)].filter(Boolean).join(" ") || "une fiche existante";
      throw new HttpsError("already-exists", `${name} possede deja cette identite. Utilisez la fusion plutot qu'une correction.`, {
        conflictId: conflict.id,
        conflictSource: conflict.source
      });
    }
  }
  if (correction.licenseNumber) {
    await assertNoEngagementSwimmerLicenseConflict(db, correction, Array.from(ignoredIds));
  }
}

function engagementEntrySwimmerCorrectionResult(items = [], oldIds = new Set(), next = {}) {
  let changed = false;
  const corrected = (Array.isArray(items) ? items : []).map((item) => {
    const itemId = cleanText(item?.swimmerIndexId || item?.id || item?.swimmerId);
    if (!oldIds.has(itemId)) return item;
    changed = true;
    return cleanFirestoreValue({
      ...item,
      id: next.id,
      swimmerIndexId: next.swimmerIndexId || next.id,
      swimmerId: next.swimmerId || item.swimmerId,
      source: next.source || item.source,
      identityKey: next.identityKey,
      firstName: next.firstName,
      lastName: next.lastName,
      name: next.name,
      birthDate: next.birthDate,
      sex: next.sex,
      category: currentEngagementCategoryFromBirthDate(next.birthDate),
      licenseNumber: next.licenseNumber
    });
  });
  return { changed, items: corrected };
}

function engagementEntryRelayCorrectionResult(relays = [], oldIds = new Set(), next = {}) {
  let changed = false;
  const corrected = (Array.isArray(relays) ? relays : []).map((relay) => {
    const membersResult = engagementEntrySwimmerCorrectionResult(relay?.members || [], oldIds, next);
    const memberIds = (Array.isArray(relay?.memberIds) ? relay.memberIds : [])
      .map((id) => oldIds.has(cleanText(id)) ? (next.swimmerIndexId || next.id) : id);
    const idsChanged = memberIds.some((id, index) => id !== relay?.memberIds?.[index]);
    if (!membersResult.changed && !idsChanged) return relay;
    changed = true;
    return cleanFirestoreValue({
      ...relay,
      members: membersResult.items,
      memberIds
    });
  });
  return { changed, relays: corrected };
}

async function updateEngagementEntriesForSwimmerCorrection(db, current = {}, next = {}, context = {}) {
  const clubId = cleanText(current.clubId || next.clubId).slice(0, 40);
  if (!clubId) return { scannedEntryCount: 0, entryUpdateCount: 0, relayUpdateCount: 0 };
  const oldIds = new Set([
    current.id,
    current.swimmerIndexId,
    current.swimmerId,
    ...(Array.isArray(current.sourceIds) ? current.sourceIds : [])
  ].map((id) => cleanText(id)).filter(Boolean));
  let scannedEntryCount = 0;
  let entryUpdateCount = 0;
  let relayUpdateCount = 0;
  const now = context.now || new Date().toISOString();
  let cursor = null;
  do {
    let query = db.collection("engagementClubEntries")
      .where("clubId", "==", clubId)
      .orderBy(FieldPath.documentId())
      .limit(ENGAGEMENT_SWIMMER_CORRECTION_ENTRY_PAGE_SIZE);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    scannedEntryCount += snapshot.size;
    const batch = db.batch();
    let pageUpdateCount = 0;
    snapshot.docs.forEach((doc) => {
      const entry = doc.data() || {};
      const swimmerResult = engagementEntrySwimmerCorrectionResult(entry.swimmers || [], oldIds, next);
      const relayResult = engagementEntryRelayCorrectionResult(entry.relays || [], oldIds, next);
      if (!swimmerResult.changed && !relayResult.changed) return;
      batch.set(doc.ref, cleanFirestoreValue({
        ...(swimmerResult.changed ? { swimmers: swimmerResult.items } : {}),
        ...(relayResult.changed ? { relays: relayResult.relays } : {}),
        updatedAt: now,
        updatedBy: context.uid || ""
      }), { merge: true });
      pageUpdateCount += 1;
      if (swimmerResult.changed) entryUpdateCount += 1;
      if (relayResult.changed) relayUpdateCount += 1;
    });
    if (pageUpdateCount) await batch.commit();
    cursor = snapshot.size === ENGAGEMENT_SWIMMER_CORRECTION_ENTRY_PAGE_SIZE
      ? snapshot.docs[snapshot.docs.length - 1]
      : null;
  } while (cursor);
  return { scannedEntryCount, entryUpdateCount, relayUpdateCount };
}

function setEngagementSwimmerChangeRequestRosterState(batch, target = {}, status = "", requestId = "", now = "") {
  const swimmer = engagementSwimmerIdentitySnapshot(target.swimmer || target.current || {}, target.requestedSource || target.source);
  const rosterItem = {
    ...swimmer,
    id: target.requestedSwimmerId || swimmer.id,
    swimmerIndexId: target.requestedSwimmerId || swimmer.swimmerIndexId,
    source: target.requestedSource || swimmer.source,
    changeRequestStatus: status,
    changeRequestId: requestId,
    changeRequestedAt: status === "pending" ? now : "",
    active: true,
    updatedAt: now
  };
  upsertEngagementClubRosterSwimmer(batch, db, rosterItem, now);
}

async function applyEngagementSwimmerIdentityCorrection(target = {}, correction = {}, context = {}) {
  const current = engagementSwimmerIdentitySnapshot(target.swimmer, target.source);
  await assertNoEngagementSwimmerIdentityConflict(db, current, correction);
  const now = context.now || new Date().toISOString();
  if (target.source === "engagement") {
    const payload = {
      ...correction,
      updatedAt: now,
      updatedBy: context.uid,
      identityCorrectedAt: now,
      identityCorrectedBy: context.uid
    };
    const batch = db.batch();
    batch.set(target.ref, payload, { merge: true });
    const oldLicenseRefId = engagementSwimmerLicenseNumberId(current.licenseNumber);
    const newLicenseRefId = engagementSwimmerLicenseNumberId(correction.licenseNumber);
    if (oldLicenseRefId && oldLicenseRefId !== newLicenseRefId) {
      batch.delete(db.collection(ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION).doc(oldLicenseRefId));
    }
    if (correction.licenseNumber) {
      const licensePayload = engagementSwimmerLicensePayload(
        { ...current, ...correction, swimmerIndexId: target.swimmerId, source: "engagement" },
        { uid: context.uid, clubId: current.clubId, clubName: current.clubName },
        { type: "national_identity_correction", collectedAt: now, verificationSource: "national" }
      );
      batch.set(db.collection("engagementSwimmerLicenses").doc(stableHash(target.swimmerId).slice(0, 40)), licensePayload, { merge: true });
      if (newLicenseRefId) {
        batch.set(db.collection(ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION).doc(newLicenseRefId), {
          ...licensePayload,
          swimmerIndexId: target.swimmerId,
          licenseKey: engagementSwimmerLicenseNumberKey(correction.licenseNumber)
        }, { merge: true });
      }
    } else if (current.licenseNumber) {
      batch.delete(db.collection("engagementSwimmerLicenses").doc(stableHash(target.swimmerId).slice(0, 40)));
    }
    const next = engagementSwimmerIdentitySnapshot({
      ...current,
      ...correction,
      id: target.swimmerId,
      swimmerIndexId: target.swimmerId,
      source: "engagement",
      updatedAt: now
    }, "engagement");
    upsertEngagementClubRosterSwimmer(batch, db, { ...next, changeRequestStatus: "", changeRequestId: "", changeRequestedAt: "" }, now);
    if (target.requestedSource !== "engagement" || target.requestedSwimmerId !== target.swimmerId) {
      deleteEngagementClubRosterSwimmer(batch, db, {
        ...current,
        source: target.requestedSource,
        swimmerIndexId: target.requestedSwimmerId
      }, now);
    }
    await batch.commit();
    const entryResult = await updateEngagementEntriesForSwimmerCorrection(db, current, next, { ...context, now });
    return { current, swimmer: next, performanceUpdateCount: 0, publicSnapshot: null, ...entryResult };
  }

  const rows = Array.isArray(target.performanceRows) && target.performanceRows.length
    ? target.performanceRows
    : await getPerformanceBaseRowsBySwimmer({
      swimmerIds: Array.from(new Set([
        target.requestedSwimmerId,
        target.swimmerId,
        current.swimmerId,
        ...(current.sourceIds || [])
      ].map(cleanText).filter(Boolean))),
      identityKey: current.identityKey
    });
  const finalPerformanceCount = rows.filter((row) => row.isIntermediate !== true).length;
  if (!rows.length) {
    throw new HttpsError("failed-precondition", "Les performances de ce nageur ne sont pas encore disponibles dans la base active. Synchronisez la base avant la correction.");
  }
  if (rows.length > ENGAGEMENT_SWIMMER_CORRECTION_MAX_PERFORMANCE_ROWS || (current.performanceCount > 0 && finalPerformanceCount < current.performanceCount)) {
    throw new HttpsError("failed-precondition", "Correction trop volumineuse ou index incomplet. Une migration dediee est necessaire.");
  }
  const updatedRows = rows.map((row) => ({
    ...row,
    firstName: correction.firstName,
    lastName: correction.lastName,
    swimmer: correction.name,
    birthDate: correction.birthDate,
    sex: correction.sex,
    swimmerIdentityKey: correction.identityKey,
    sourceAction: "engagement.swimmerIdentityCorrected"
  }));
  await writePerformanceBaseRows(updatedRows, {
    actorUid: context.uid,
    actorEmail: context.email || "",
    now,
    action: "engagement.swimmerIdentityCorrected",
    status: "active",
    logChanges: false,
    dtnInvalidationRows: rows
  });
  await writePerformanceSwimmerIndexRows(updatedRows, {
    now,
    action: "engagement.swimmerIdentityCorrected",
    mode: "replace"
  });
  await writePerformanceSwimmerPageRows(updatedRows, {
    now,
    action: "engagement.swimmerIdentityCorrected"
  });
  const newIndexId = performanceSwimmerIndexDocId(updatedRows[0]);
  const newIndexRef = db.collection(PERFORMANCE_SWIMMERS_COLLECTION).doc(newIndexId);
  await newIndexRef.set({
    licenseNumber: correction.licenseNumber,
    identityCorrectedAt: now,
    identityCorrectedBy: context.uid,
    updatedAt: now
  }, { merge: true });
  const cleanupBatch = db.batch();
  const oldIndexId = target.source === "performances" ? target.swimmerId : "";
  const oldLicenseDocId = cleanText(target.licenseDocumentId)
    || (oldIndexId ? engagementSwimmerLicenseId({ swimmerIndexId: oldIndexId }) : "");
  const newLicenseDocId = engagementSwimmerLicenseId({ swimmerIndexId: newIndexId });
  const oldLicenseRefId = engagementSwimmerLicenseNumberId(current.licenseNumber);
  const newLicenseRefId = engagementSwimmerLicenseNumberId(correction.licenseNumber);
  if (oldLicenseRefId && oldLicenseRefId !== newLicenseRefId) {
    cleanupBatch.delete(db.collection(ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION).doc(oldLicenseRefId));
  }
  if (oldLicenseDocId && (oldLicenseDocId !== newLicenseDocId || !correction.licenseNumber)) {
    cleanupBatch.delete(db.collection("engagementSwimmerLicenses").doc(oldLicenseDocId));
  }
  if (correction.licenseNumber) {
    const licensePayload = engagementSwimmerLicensePayload(
      { ...current, ...correction, swimmerIndexId: newIndexId, source: "performances" },
      { uid: context.uid, clubId: current.clubId, clubName: current.clubName },
      { type: "national_identity_correction", collectedAt: now, verificationSource: "national" }
    );
    cleanupBatch.set(db.collection("engagementSwimmerLicenses").doc(newLicenseDocId), licensePayload, { merge: true });
    if (newLicenseRefId) {
      cleanupBatch.set(db.collection(ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION).doc(newLicenseRefId), {
        ...licensePayload,
        swimmerIndexId: newIndexId,
        licenseKey: engagementSwimmerLicenseNumberKey(correction.licenseNumber)
      }, { merge: true });
    }
  }
  if (oldIndexId && oldIndexId !== newIndexId) {
    const oldPageCount = Math.min(50, Math.max(0, Math.trunc(Number(target.snapshot?.data()?.pageCount || 0) || 0)));
    for (let pageIndex = 0; pageIndex < oldPageCount; pageIndex += 1) {
      cleanupBatch.delete(db.collection(PERFORMANCE_SWIMMER_PAGES_COLLECTION).doc(performanceSwimmerPageId(oldIndexId, pageIndex)));
    }
    cleanupBatch.delete(db.collection(PERFORMANCE_SWIMMERS_COLLECTION).doc(oldIndexId));
  }
  deleteEngagementClubRosterSwimmer(cleanupBatch, db, {
    ...current,
    source: target.requestedSource,
    swimmerIndexId: target.requestedSwimmerId
  }, now);
  const newIndexSnapshot = await newIndexRef.get();
  const next = engagementSwimmerIdentitySnapshot({
    ...engagementClubSwimmerItem(newIndexSnapshot),
    ...correction,
    id: newIndexId,
    swimmerIndexId: newIndexId,
    source: "performances",
    clubId: current.clubId,
    clubName: current.clubName,
    performanceCount: finalPerformanceCount
  }, "performances");
  upsertEngagementClubRosterSwimmer(cleanupBatch, db, { ...next, changeRequestStatus: "", changeRequestId: "", changeRequestedAt: "" }, now);
  await cleanupBatch.commit();
  const entryResult = await updateEngagementEntriesForSwimmerCorrection(db, current, next, { ...context, now });
  let publicSnapshot = null;
  try {
    const oldPublicKey = publicSwimmerKey(rows[0] || {});
    const newPublicKey = publicSwimmerKey(updatedRows[0] || {});
    if (oldPublicKey && newPublicKey && oldPublicKey !== newPublicKey) {
      publicSnapshot = await replacePublicSwimmerIdentity(oldPublicKey, newPublicKey, updatedRows);
    } else {
      publicSnapshot = await rebuildPublicPerformanceFilesForAffectedRows(updatedRows, {
        now,
        reason: "engagement.swimmerIdentityCorrected"
      });
    }
    await invalidateEngagementEntryTimeCachesForPerformanceRows([...rows, ...updatedRows]);
    const correctedTopFiles = await rebuildPublicTopFilesForAffectedRows(
      [...rows, ...updatedRows],
      new Map([[newPublicKey, updatedRows]])
    );
    publicSnapshot.correctedTopBuckets = correctedTopFiles.affectedTopBuckets;
  } catch (error) {
    console.error("Publication publique ciblee impossible apres correction nageur", {
      swimmerId: target.swimmerId,
      message: error?.message || String(error)
    });
    publicSnapshot = { ok: false, error: error?.message || "Publication publique ciblee impossible." };
  }
  return {
    current,
    swimmer: next,
    performanceUpdateCount: updatedRows.length,
    publicSnapshot,
    ...entryResult
  };
}

function engagementSwimmerChangeRequestItem(doc) {
  const data = doc.data() || {};
  return cleanFirestoreValue({
    id: doc.id,
    requestType: "swimmer-change",
    status: cleanText(data.status).slice(0, 40),
    requestedSource: cleanText(data.requestedSource).slice(0, 40),
    requestedSwimmerId: cleanText(data.requestedSwimmerId).slice(0, 80),
    targetSource: cleanText(data.targetSource).slice(0, 40),
    targetSwimmerId: cleanText(data.targetSwimmerId).slice(0, 80),
    current: data.current && typeof data.current === "object" ? engagementSwimmerIdentitySnapshot(data.current, data.current.source) : {},
    proposed: data.proposed && typeof data.proposed === "object" ? engagementSwimmerIdentitySnapshot(data.proposed, data.proposed.source) : {},
    resolvedProposed: data.resolvedProposed && typeof data.resolvedProposed === "object" ? engagementSwimmerIdentitySnapshot(data.resolvedProposed, data.resolvedProposed.source) : {},
    proposalAdjusted: data.proposalAdjusted === true,
    reason: cleanText(data.reason).slice(0, 500),
    clubId: cleanText(data.clubId).slice(0, 40),
    clubName: cleanText(data.clubName).slice(0, 140),
    requestedAt: cleanText(data.requestedAt).slice(0, 40),
    requestedBy: cleanText(data.requestedBy).slice(0, 128),
    requestedByEmail: cleanText(data.requestedByEmail).slice(0, 180),
    requestedByFirstName: cleanText(data.requestedByFirstName).slice(0, 80),
    requestedByLastName: cleanText(data.requestedByLastName).slice(0, 80),
    resolvedAt: cleanText(data.resolvedAt).slice(0, 40),
    resolvedBy: cleanText(data.resolvedBy).slice(0, 128),
    resolutionNote: cleanText(data.resolutionNote).slice(0, 500),
    resolutionNotification: {
      status: cleanText(data.resolutionNotification?.status).slice(0, 40),
      attemptedAt: cleanText(data.resolutionNotification?.attemptedAt).slice(0, 40),
      sentAt: cleanText(data.resolutionNotification?.sentAt).slice(0, 40),
      reason: cleanText(data.resolutionNotification?.reason).slice(0, 180)
    }
  });
}

async function sendEngagementSwimmerChangeResolutionNotification(payload = {}) {
  const attemptedAt = new Date().toISOString();
  const recipientEmail = normalizeEmail(payload.requestedByEmail);
  if (!recipientEmail) {
    return {
      status: "skipped_missing_recipient",
      attemptedAt,
      reason: "Adresse e-mail du demandeur absente."
    };
  }
  const config = engagementMailSmtpConfig();
  if (!config.ready) {
    return {
      status: "skipped_missing_config",
      attemptedAt,
      reason: "Configuration SMTP incomplete."
    };
  }
  const mail = engagementSwimmerChangeResolutionMail(payload);
  try {
    const transporter = nodemailer.createTransport(config.transport);
    await transporter.sendMail({
      from: `LivePalmes <${config.fromEmail}>`,
      to: recipientEmail,
      subject: cleanText(mail.subject).slice(0, 220),
      text: mail.text,
      html: livePalmesMailHtml(mail.text)
    });
    return {
      status: "sent",
      attemptedAt,
      sentAt: new Date().toISOString(),
      reason: ""
    };
  } catch (error) {
    console.error(
      "Notification de resolution de correction nageur impossible.",
      cleanText(error?.code || error?.name || "smtp-error").slice(0, 80)
    );
    return {
      status: "failed",
      attemptedAt,
      reason: "Envoi SMTP impossible."
    };
  }
}

exports.requestEngagementClubSwimmerChange = onCall(ENGAGEMENT_SWIMMER_CORRECTION_OPTIONS, async (request) => {
  const context = await engagementClubAccessContext(request);
  const requestedSource = cleanText(request.data?.source).slice(0, 40);
  const requestedSwimmerId = cleanText(request.data?.swimmerId).slice(0, 80);
  const target = await getEngagementSwimmerCorrectionTarget(
    db,
    requestedSource,
    requestedSwimmerId,
    cleanText(request.data?.identityKey).slice(0, 180)
  );
  const current = engagementSwimmerIdentitySnapshot(target.swimmer, target.source);
  if (!current.clubId || current.clubId !== context.clubId) {
    throw new HttpsError("permission-denied", "Nageur hors perimetre club.");
  }
  const correction = cleanEngagementSwimmerIdentityCorrection(request.data?.proposed || {}, current);
  const reason = cleanText(request.data?.reason).slice(0, 500);
  if (!reason) throw new HttpsError("invalid-argument", "Le motif de la demande est obligatoire.");
  const requestId = stableHash([target.requestedSource, target.requestedSwimmerId, context.clubId].join("|")).slice(0, 40);
  const ref = db.collection(ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION).doc(requestId);
  const existing = await ref.get();
  if (existing.exists && cleanText(existing.data()?.status) === "pending") {
    throw new HttpsError("already-exists", "Une demande de correction est deja en attente pour ce nageur.");
  }
  const now = new Date().toISOString();
  const proposed = engagementSwimmerIdentitySnapshot({ ...current, ...correction }, target.source);
  const payload = {
    id: requestId,
    requestType: "swimmer-change",
    status: "pending",
    requestedSource: target.requestedSource,
    requestedSwimmerId: target.requestedSwimmerId,
    targetSource: target.source,
    targetSwimmerId: target.swimmerId,
    current,
    proposed,
    reason,
    clubId: context.clubId,
    clubName: context.clubName,
    regionId: context.regionId,
    requestedAt: now,
    requestedBy: context.uid,
    requestedByEmail: context.email || "",
    requestedByFirstName: context.firstName || "",
    requestedByLastName: context.lastName || "",
    updatedAt: now,
    updatedBy: context.uid
  };
  const batch = db.batch();
  batch.set(ref, payload, { merge: false });
  setEngagementSwimmerChangeRequestRosterState(batch, target, "pending", requestId, now);
  await batch.commit();
  await writeAuditLog("engagementClubSwimmer.changeRequested", context.uid, {
    requestId,
    swimmerId: target.swimmerId,
    source: target.source,
    clubId: context.clubId,
    reason,
    current,
    proposed
  });
  const created = await ref.get();
  return { ok: true, request: engagementSwimmerChangeRequestItem(created) };
});

exports.listEngagementSwimmerChangeRequests = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  if (!context.national) throw new HttpsError("permission-denied", "Lecture reservee au niveau national.");
  const status = ["pending", "approved", "rejected"].includes(cleanText(request.data?.status))
    ? cleanText(request.data.status)
    : "pending";
  const limit = Math.min(100, Math.max(10, Math.trunc(Number(request.data?.limit) || 50)));
  const snapshot = await db.collection(ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION)
    .where("status", "==", status)
    .limit(limit)
    .get();
  const requests = snapshot.docs
    .map(engagementSwimmerChangeRequestItem)
    .sort((left, right) => cleanText(right.requestedAt).localeCompare(cleanText(left.requestedAt)));
  return { ok: true, status, requests };
});

async function engagementNationalAdministrationPendingCounts() {
  const [competitionSnapshot, swimmerSnapshot, correctionSnapshot, accountSnapshot] = await Promise.all([
    db.collection("engagementCompetitionDeletionRequests").where("status", "==", "pending").count().get(),
    db.collection("engagementSwimmerDeletionRequests").where("status", "==", "pending").count().get(),
    db.collection(ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION).where("status", "==", "pending").count().get(),
    db.collection("accessUserDeletionRequests").where("status", "==", "pending").count().get()
  ]);
  const competitionDeletionCount = Math.max(0, Number(competitionSnapshot.data()?.count || 0));
  const swimmerDeletionCount = Math.max(0, Number(swimmerSnapshot.data()?.count || 0));
  const swimmerChangeCount = Math.max(0, Number(correctionSnapshot.data()?.count || 0));
  const accountDeletionCount = Math.max(0, Number(accountSnapshot.data()?.count || 0));
  return {
    swimmerChanges: swimmerChangeCount,
    dataDeletions: competitionDeletionCount + swimmerDeletionCount,
    accountDeletions: accountDeletionCount,
    total: competitionDeletionCount + swimmerDeletionCount + swimmerChangeCount + accountDeletionCount
  };
}

exports.getEngagementNationalAdministrationOverview = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  if (!context.national) throw new HttpsError("permission-denied", "Lecture reservee au niveau national.");
  return {
    ok: true,
    counts: await engagementNationalAdministrationPendingCounts()
  };
});

exports.listEngagementNationalClubs = onCall(CALLABLE_OPTIONS, async (request) => {
  const startedAt = Date.now();
  const context = await engagementAccessContext(request);
  if (!context.national) throw new HttpsError("permission-denied", "Lecture des clubs reservee au niveau national.");
  if (request.data?.directoryMode === true) {
    const [directorySnapshot, adminDirectory] = await Promise.all([
      publicEngagementClubDirectoryRef().get(),
      request.data?.includeAdministrators === true ? readEngagementClubAdminDirectory(db) : Promise.resolve(null)
    ]);
    const clubsById = directorySnapshot.exists && directorySnapshot.data()?.clubs && typeof directorySnapshot.data().clubs === "object"
      ? directorySnapshot.data().clubs
      : {};
    return {
      ok: true,
      clubs: Object.values(clubsById).map(publicEngagementClubItem).filter((club) => club.clubId),
      replaceDirectory: true,
      hasMore: false,
      cursor: null,
      syncWatermark: cleanText(directorySnapshot.data()?.updatedAt).slice(0, 40) || new Date().toISOString(),
      ...(adminDirectory ? {
        clubAdministrators: adminDirectory.administrators,
        clubAdministratorsAvailable: adminDirectory.available !== false,
        clubAdministratorsBootstrapped: adminDirectory.bootstrapped === true
      } : {}),
      readStats: portalReadStats("listEngagementNationalClubs", startedAt, {
        baseDocuments: adminDirectory ? 2 : 1,
        variableDocumentsMax: adminDirectory?.bootstrapped ? ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT + 1 : 0,
        cacheHit: true
      })
    };
  }
  const pageLimit = Math.min(500, Math.max(50, Math.trunc(Number(request.data?.limit) || 250)));
  const updatedAfter = cleanText(request.data?.updatedAfter).slice(0, 40);
  const afterClubId = cleanText(request.data?.afterClubId).slice(0, 40);
  const includeAdministrators = request.data?.includeAdministrators === true && !afterClubId;
  const syncWatermark = new Date().toISOString();
  let query = db.collection(ENGAGEMENT_CLUBS_COLLECTION)
    .orderBy("updatedAt", "asc")
    .orderBy(FieldPath.documentId(), "asc");
  if (updatedAfter && afterClubId) query = query.startAfter(updatedAfter, afterClubId);
  else if (updatedAfter) query = query.where("updatedAt", ">", updatedAfter);
  const [snapshot, adminDirectory] = await Promise.all([
    query.limit(pageLimit + 1).get(),
    includeAdministrators ? readEngagementClubAdminDirectory(db) : Promise.resolve(null)
  ]);
  const pageDocuments = snapshot.docs.slice(0, pageLimit);
  const lastDocument = pageDocuments[pageDocuments.length - 1];
  return {
    ok: true,
    clubs: pageDocuments.map(engagementStoredClubItem),
    hasMore: snapshot.size > pageLimit,
    cursor: lastDocument ? {
      updatedAt: cleanText(lastDocument.get("updatedAt")).slice(0, 40),
      clubId: lastDocument.id
    } : null,
    ...(adminDirectory ? {
      clubAdministrators: adminDirectory.administrators,
      clubAdministratorsAvailable: adminDirectory.available !== false,
      clubAdministratorsBootstrapped: adminDirectory.bootstrapped === true
    } : {}),
    syncWatermark,
    readStats: portalReadStats("listEngagementNationalClubs", startedAt, {
      baseDocuments: includeAdministrators ? 2 : 1,
      variableDocumentsMax: pageLimit + 1 + (adminDirectory?.bootstrapped ? ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT + 1 : 0)
    })
  };
});

exports.getPublicEngagementClubDirectory = onCall(CALLABLE_OPTIONS, async () => {
  const startedAt = Date.now();
  const snapshot = await publicEngagementClubDirectoryRef().get();
  const clubsById = snapshot.exists && snapshot.data()?.clubs && typeof snapshot.data().clubs === "object"
    ? snapshot.data().clubs
    : {};
  return {
    ok: true,
    clubs: Object.values(clubsById).map(publicEngagementClubItem).filter((club) => club.clubId && club.clubName),
    updatedAt: cleanText(snapshot.data()?.updatedAt).slice(0, 40),
    readStats: portalReadStats("getPublicEngagementClubDirectory", startedAt, {
      baseDocuments: 1,
      variableDocumentsMax: 0
    })
  };
});

exports.saveEngagementNationalClub = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  if (!context.national) throw new HttpsError("permission-denied", "Modification des clubs reservee au niveau national.");
  const requestedClubId = cleanText(request.data?.clubId).slice(0, 40);
  const baseClub = requestedClubId ? CLUB_REFERENCE_BY_ID.get(requestedClubId) || {} : {};
  const existingSnapshot = requestedClubId
    ? await db.collection(ENGAGEMENT_CLUBS_COLLECTION).doc(requestedClubId).get()
    : null;
  const current = {
    ...baseClub,
    ...(existingSnapshot?.exists ? engagementStoredClubItem(existingSnapshot) : {})
  };
  let cleaned;
  try {
    cleaned = cleanClubPayload(request.data?.club || {}, current);
  } catch (error) {
    throw new HttpsError("invalid-argument", cleanText(error?.message || error));
  }
  const previousFederalNumber = cleanText(current.federalNumber).toUpperCase();
  const federalNumberChanged = Boolean(requestedClubId && previousFederalNumber && previousFederalNumber !== cleaned.federalNumber);
  if (federalNumberChanged && request.data?.confirmFederalNumberChange !== true) {
    throw new HttpsError("failed-precondition", "Confirmez explicitement la correction du numéro fédéral.");
  }
  if (!requestedClubId || previousFederalNumber !== cleaned.federalNumber) {
    const staticConflict = CLUB_REFERENCE_BY_FEDERAL_NUMBER.get(cleaned.federalNumber);
    if (staticConflict && staticConflict.clubId !== requestedClubId) {
      throw new HttpsError("already-exists", `Ce numéro fédéral appartient déjà à ${staticConflict.clubCode || staticConflict.clubName}.`);
    }
    const storedConflictSnapshot = await db.collection(ENGAGEMENT_CLUBS_COLLECTION)
      .where("federalNumber", "==", cleaned.federalNumber)
      .limit(2)
      .get();
    const storedConflictDocument = storedConflictSnapshot.docs.find((doc) => doc.id !== requestedClubId && doc.data()?.deleted !== true);
    if (storedConflictDocument) {
      const conflict = engagementStoredClubItem(storedConflictDocument);
      throw new HttpsError("already-exists", `Ce numéro fédéral appartient déjà à ${conflict.clubCode || conflict.clubName}.`);
    }
  }
  const clubId = requestedClubId || `club-${stableHash(cleaned.federalNumber).slice(0, 16)}`;
  if (!requestedClubId && (await db.collection(ENGAGEMENT_CLUBS_COLLECTION).doc(clubId).get()).exists) {
    throw new HttpsError("already-exists", "Ce club existe deja dans le referentiel national.");
  }
  const now = new Date().toISOString();
  const payload = {
    ...cleaned,
    clubId,
    updatedAt: now,
    updatedBy: context.uid,
    ...(!requestedClubId ? { createdAt: now, createdBy: context.uid } : {})
  };
  const clubRef = db.collection(ENGAGEMENT_CLUBS_COLLECTION).doc(clubId);
  const batch = db.batch();
  batch.set(clubRef, payload, { merge: true });
  batch.set(publicEngagementClubDirectoryRef(), {
    clubs: { [clubId]: publicEngagementClubItem(payload) },
    updatedAt: now
  }, { merge: true });
  await batch.commit();
  await writeAuditLog(requestedClubId ? "engagementClub.updated" : "engagementClub.created", context.uid, {
    clubId,
    federalNumber: cleaned.federalNumber,
    ...(federalNumberChanged ? { previousFederalNumber, federalNumberChanged: true } : {}),
    clubCode: cleaned.clubCode,
    clubName: cleaned.clubName,
    active: cleaned.active
  });
  const saved = await db.collection(ENGAGEMENT_CLUBS_COLLECTION).doc(clubId).get();
  return {
    ok: true,
    created: !requestedClubId,
    club: {
      ...(CLUB_REFERENCE_BY_ID.get(clubId) || {}),
      ...engagementStoredClubItem(saved)
    }
  };
});

exports.deleteEngagementNationalClub = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  if (!context.national) throw new HttpsError("permission-denied", "Suppression des clubs reservee au niveau national.");
  if (request.data?.confirmPermanent !== true) {
    throw new HttpsError("failed-precondition", "Confirmation de suppression definitive requise.");
  }
  const clubId = cleanText(request.data?.clubId).slice(0, 40);
  if (!clubId) throw new HttpsError("invalid-argument", "Club requis.");
  if (CLUB_REFERENCE_BY_ID.has(clubId)) {
    throw new HttpsError("failed-precondition", "Un club historique doit etre desactive et ne peut pas etre supprime.");
  }
  const clubRef = db.collection(ENGAGEMENT_CLUBS_COLLECTION).doc(clubId);
  const clubSnapshot = await clubRef.get();
  if (!clubSnapshot.exists || clubSnapshot.data()?.deleted === true) throw new HttpsError("not-found", "Club introuvable.");
  const club = engagementStoredClubItem(clubSnapshot);
  if (club.source !== "national") {
    throw new HttpsError("failed-precondition", "Seuls les clubs crees par l'administration nationale peuvent etre supprimes.");
  }
  const dependencyQueries = [
    ["performance", db.collection(PERFORMANCE_BASE_COLLECTION).where("clubId", "==", clubId)],
    ["compte", db.collection("users").where("clubId", "==", clubId)],
    ["demande d'accès en attente", db.collection("engagementAccessRequests").where("clubId", "==", clubId).where("status", "==", "pending")],
    ["nageur", db.collection("engagementClubSwimmers").where("clubId", "==", clubId)],
    ["officiel ou chef d'équipe", db.collection("engagementClubPeople").where("clubId", "==", clubId)],
    ["engagement", db.collection("engagementClubEntries").where("clubId", "==", clubId)]
  ];
  const dependencySnapshots = await Promise.all(dependencyQueries.map(([, query]) => query.limit(1).get()));
  const blockers = dependencyQueries
    .filter((_, index) => !dependencySnapshots[index].empty)
    .map(([, label]) => label);
  if (blockers.length) {
    throw new HttpsError("failed-precondition", `Ce club reste lie a au moins un element : ${blockers.join(", ")}. Desactivez-le plutot.`);
  }
  const now = new Date().toISOString();
  const startedAt = Date.now();
  const batch = db.batch();
  batch.set(clubRef, {
    clubId,
    source: "national",
    deleted: true,
    active: false,
    updatedAt: now,
    updatedBy: context.uid,
    deletedAt: now,
    deletedBy: context.uid
  });
  batch.delete(db.collection(ENGAGEMENT_CLUB_ROSTERS_COLLECTION).doc(clubId));
  batch.delete(db.collection(ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION).doc(clubId));
  batch.set(publicEngagementClubDirectoryRef(), {
    clubs: { [clubId]: FieldValue.delete() },
    updatedAt: now
  }, { merge: true });
  await batch.commit();
  await writeAuditLog("engagementClub.deleted", context.uid, {
    clubId,
    federalNumber: club.federalNumber,
    clubCode: club.clubCode,
    clubName: club.clubName
  });
  return {
    ok: true,
    clubId,
    readStats: portalReadStats("deleteEngagementNationalClub", startedAt, {
      baseDocuments: 2,
      variableDocumentsMax: dependencyQueries.length
    })
  };
});

exports.getPortalPendingRequestOverview = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await accessManagementContext(request);
  let accessRequestsQuery = db.collection("engagementAccessRequests").where("status", "==", "pending");
  if (!context.national) {
    if (!context.regionId) {
      throw new HttpsError("failed-precondition", "Perimetre regional requis.");
    }
    accessRequestsQuery = accessRequestsQuery.where("regionId", "==", context.regionId);
  }
  const [accessSnapshot, nationalRequests] = await Promise.all([
    accessRequestsQuery.count().get(),
    context.national ? engagementNationalAdministrationPendingCounts() : Promise.resolve(null)
  ]);
  return {
    ok: true,
    scope: {
      type: context.national ? "national" : "region",
      regionId: context.national ? "" : context.regionId
    },
    accessRequests: {
      pending: Math.max(0, Number(accessSnapshot.data()?.count || 0))
    },
    nationalRequests
  };
});

exports.resolveEngagementSwimmerChangeRequest = onCall(ENGAGEMENT_SWIMMER_CORRECTION_MAIL_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  if (!context.national) throw new HttpsError("permission-denied", "Validation reservee au niveau national.");
  const requestId = cleanText(request.data?.requestId).slice(0, 80);
  const decision = cleanText(request.data?.decision);
  const resolutionNote = cleanText(request.data?.resolutionNote).slice(0, 500);
  if (!requestId || !["approved", "rejected"].includes(decision)) {
    throw new HttpsError("invalid-argument", "Demande et decision requises.");
  }
  const ref = db.collection(ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION).doc(requestId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "Demande de correction introuvable.");
  const data = snapshot.data() || {};
  if (cleanText(data.status) !== "pending") throw new HttpsError("failed-precondition", "Demande deja traitee.");
  const target = await getEngagementSwimmerCorrectionTarget(
    db,
    data.requestedSource,
    data.requestedSwimmerId,
    data.current?.identityKey
  );
  const current = engagementSwimmerIdentitySnapshot(target.swimmer, target.source);
  const expected = engagementSwimmerIdentitySnapshot(data.current || {}, data.targetSource);
  const stale = ["firstName", "lastName", "birthDate", "sex", "licenseNumber"]
    .some((field) => cleanText(current[field]) !== cleanText(expected[field]));
  if (decision === "approved" && stale) {
    throw new HttpsError("failed-precondition", "La fiche a change depuis la demande. Rechargez-la avant de valider.");
  }
  const now = new Date().toISOString();
  let result = null;
  let requestedCorrection = null;
  let resolvedProposed = null;
  let proposalAdjusted = false;
  if (decision === "approved") {
    requestedCorrection = cleanEngagementSwimmerIdentityCorrection(data.proposed || {}, current);
    const reviewedProposal = request.data?.proposed && typeof request.data.proposed === "object" && !Array.isArray(request.data.proposed)
      ? request.data.proposed
      : data.proposed || {};
    const correction = cleanEngagementSwimmerIdentityCorrection(reviewedProposal, current);
    proposalAdjusted = ["firstName", "lastName", "birthDate", "sex", "licenseNumber"]
      .some((field) => cleanText(correction[field]) !== cleanText(requestedCorrection[field]));
    resolvedProposed = engagementSwimmerIdentitySnapshot({ ...current, ...correction }, target.source);
    result = await applyEngagementSwimmerIdentityCorrection(target, correction, { ...context, now });
  } else {
    const batch = db.batch();
    setEngagementSwimmerChangeRequestRosterState(batch, { ...target, swimmer: current }, "rejected", requestId, now);
    await batch.commit();
  }
  await ref.set({
    status: decision,
    resolutionNote,
    resolvedAt: now,
    resolvedBy: context.uid,
    resolvedByEmail: context.email || "",
    updatedAt: now,
    updatedBy: context.uid,
    ...(decision === "approved" ? { resolvedProposed, proposalAdjusted } : {}),
    result: cleanFirestoreValue(result || {})
  }, { merge: true });
  const resolutionNotification = await sendEngagementSwimmerChangeResolutionNotification({
    decision,
    requestedByEmail: data.requestedByEmail,
    requestedByFirstName: data.requestedByFirstName,
    requestedByLastName: data.requestedByLastName,
    swimmer: current,
    current,
    resolvedProposed: resolvedProposed || data.proposed || {},
    clubName: data.clubName,
    resolutionNote
  });
  await ref.set({
    resolutionNotification,
    updatedAt: new Date().toISOString()
  }, { merge: true });
  await writeAuditLog(`engagementClubSwimmer.change${decision === "approved" ? "Approved" : "Rejected"}`, context.uid, {
    requestId,
    swimmerId: target.swimmerId,
    source: target.source,
    clubId: cleanText(data.clubId),
    reason: cleanText(data.reason),
    resolutionNote,
    requestedProposed: requestedCorrection || data.proposed || {},
    resolvedProposed: resolvedProposed || {},
    proposalAdjusted,
    notificationStatus: resolutionNotification.status,
    performanceUpdateCount: Number(result?.performanceUpdateCount || 0),
    entryUpdateCount: Number(result?.entryUpdateCount || 0),
    relayUpdateCount: Number(result?.relayUpdateCount || 0)
  });
  const updated = await ref.get();
  return { ok: true, request: engagementSwimmerChangeRequestItem(updated), result };
});

exports.updateEngagementNationalSwimmerIdentity = onCall(ENGAGEMENT_SWIMMER_CORRECTION_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  if (!context.national) throw new HttpsError("permission-denied", "Correction reservee au niveau national.");
  const target = await getEngagementSwimmerCorrectionTarget(
    db,
    request.data?.source,
    request.data?.swimmerId,
    request.data?.identityKey
  );
  const current = engagementSwimmerIdentitySnapshot(target.swimmer, target.source);
  const correction = cleanEngagementSwimmerIdentityCorrection(request.data?.proposed || {}, current);
  const reason = cleanText(request.data?.reason).slice(0, 500);
  if (!reason) throw new HttpsError("invalid-argument", "Le motif de la correction est obligatoire.");
  const now = new Date().toISOString();
  const result = await applyEngagementSwimmerIdentityCorrection(target, correction, { ...context, now });
  await writeAuditLog("engagementClubSwimmer.identityCorrected", context.uid, {
    swimmerId: target.swimmerId,
    source: target.source,
    reason,
    current,
    proposed: result.swimmer,
    performanceUpdateCount: Number(result.performanceUpdateCount || 0),
    entryUpdateCount: Number(result.entryUpdateCount || 0),
    relayUpdateCount: Number(result.relayUpdateCount || 0)
  });
  return { ok: true, ...result };
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
  const ref = db.collection("engagementClubSwimmers").doc(swimmerId);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Nageur introuvable.");
  }
  if (cleanText(snapshot.data()?.status) === "merged" && active) {
    throw new HttpsError("failed-precondition", "Un nageur fusionne ne peut pas etre reactive directement.");
  }
  const now = new Date().toISOString();
  const payload = {
    active,
    ...(active ? { status: "active" } : {}),
    updatedAt: now,
    updatedBy: context.uid,
    ...(active ? { reactivatedAt: now, reactivatedBy: context.uid } : { disabledAt: now, disabledBy: context.uid })
  };
  await ref.set(payload, { merge: true });
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

async function engagementClubSwimmerDeletionUsage(swimmerId, swimmer = {}, context = {}) {
  const identityKey = cleanText(swimmer.identityKey).slice(0, 180);
  const [performanceSnapshot, entriesSnapshot] = await Promise.all([
    identityKey
      ? db.collection(PERFORMANCE_SWIMMERS_COLLECTION).where("identityKey", "==", identityKey).limit(5).get()
      : Promise.resolve({ docs: [], size: 0 }),
    db.collection("engagementClubEntries").where("clubId", "==", context.clubId).limit(201).get()
  ]);
  const competitionIds = entriesSnapshot.docs.filter((entryDoc) => {
    const entry = entryDoc.data() || {};
    const usedAsSwimmer = (Array.isArray(entry.swimmers) ? entry.swimmers : [])
      .some((item) => cleanText(item?.swimmerIndexId) === swimmerId);
    const usedInRelay = (Array.isArray(entry.relays) ? entry.relays : []).some((relay) => {
      const memberIds = Array.isArray(relay?.memberIds)
        ? relay.memberIds
        : (Array.isArray(relay?.members) ? relay.members.map((member) => member?.swimmerIndexId) : []);
      return memberIds.some((memberId) => cleanText(memberId) === swimmerId);
    });
    return usedAsSwimmer || usedInRelay;
  }).map((entryDoc) => cleanText(entryDoc.data()?.competitionId || entryDoc.id).slice(0, 128));
  return {
    performanceMatchCount: performanceSnapshot.size || performanceSnapshot.docs.length,
    entryUsageCount: competitionIds.length,
    competitionIds: Array.from(new Set(competitionIds)).slice(0, 25),
    entryScanTruncated: entriesSnapshot.size > 200
  };
}

async function deleteEngagementClubSwimmerPermanently(ref, snapshot, context = {}, auditSource = "national") {
  const swimmerId = ref.id;
  const data = snapshot.data() || {};
  const alertsSnapshot = await db.collection("engagementSwimmerAlerts")
    .where("newSwimmerId", "==", swimmerId)
    .limit(100)
    .get();
  const batch = db.batch();
  batch.delete(ref);
  batch.delete(db.collection("engagementSwimmerDeletionRequests").doc(swimmerId));
  batch.delete(db.collection("engagementSwimmerLicenses").doc(stableHash(swimmerId).slice(0, 40)));
  const licenseNumberRefId = engagementSwimmerLicenseNumberId(data.licenseNumber);
  if (licenseNumberRefId) {
    batch.delete(db.collection(ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION).doc(licenseNumberRefId));
  }
  deleteEngagementClubRosterSwimmer(batch, db, { ...data, id: swimmerId, swimmerIndexId: swimmerId, source: "engagement" });
  alertsSnapshot.docs.forEach((alertDoc) => batch.delete(alertDoc.ref));
  await batch.commit();
  await writeAuditLog("engagementClubSwimmer.deleted", context.uid, {
    swimmerId,
    clubId: cleanText(data.clubId).slice(0, 40),
    alertDocsDeleted: alertsSnapshot.size,
    source: auditSource
  });
  return { swimmerId, alertDocsDeleted: alertsSnapshot.size };
}

exports.requestEngagementClubSwimmerDeletion = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementClubAccessContext(request);
  const swimmerId = cleanText(request.data?.swimmerId).slice(0, 80);
  if (!swimmerId) {
    throw new HttpsError("invalid-argument", "Nageur requis.");
  }
  const ref = db.collection("engagementClubSwimmers").doc(swimmerId);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Seul un nageur cree depuis le portail peut etre supprime par son club.");
  }
  const swimmer = snapshot.data() || {};
  if (cleanText(swimmer.clubId) !== context.clubId) {
    throw new HttpsError("permission-denied", "Nageur hors perimetre club.");
  }
  const requestRef = db.collection("engagementSwimmerDeletionRequests").doc(swimmerId);
  const pendingRequest = await requestRef.get();
  if (pendingRequest.exists && cleanText(pendingRequest.data()?.status) === "pending") {
    throw new HttpsError("already-exists", "Une demande de retrait est deja en attente pour ce nageur.");
  }
  const usage = await engagementClubSwimmerDeletionUsage(swimmerId, swimmer, context);
  const blocked = usage.performanceMatchCount > 0 || usage.entryUsageCount > 0 || usage.entryScanTruncated;
  if (!blocked) {
    const deleted = await deleteEngagementClubSwimmerPermanently(ref, snapshot, context, "club-unused");
    return { ok: true, deleted: true, requested: false, usage, ...deleted };
  }
  const now = new Date().toISOString();
  const payload = {
    swimmerId,
    swimmerName: cleanText(swimmer.name).slice(0, 160) || [cleanText(swimmer.lastName), cleanText(swimmer.firstName)].filter(Boolean).join(" "),
    firstName: cleanText(swimmer.firstName).slice(0, 80),
    lastName: cleanText(swimmer.lastName).slice(0, 80),
    birthDate: cleanIsoDate(swimmer.birthDate),
    licenseNumber: cleanText(swimmer.licenseNumber).slice(0, 60),
    clubId: context.clubId,
    clubName: context.clubName,
    regionId: context.regionId,
    status: "pending",
    ...usage,
    requestedAt: now,
    requestedBy: context.uid,
    requestedByEmail: context.email || "",
    updatedAt: now,
    updatedBy: context.uid
  };
  const batch = db.batch();
  batch.set(ref, {
    active: false,
    status: "deletion-pending",
    deletionRequestStatus: "pending",
    disabledAt: now,
    disabledBy: context.uid,
    updatedAt: now,
    updatedBy: context.uid
  }, { merge: true });
  deleteEngagementClubRosterSwimmer(batch, db, { ...swimmer, id: swimmerId, swimmerIndexId: swimmerId, source: "engagement" }, now);
  batch.set(requestRef, payload, { merge: false });
  await batch.commit();
  await writeAuditLog("engagementClubSwimmer.deletionRequested", context.uid, {
    swimmerId,
    clubId: context.clubId,
    performanceMatchCount: usage.performanceMatchCount,
    entryUsageCount: usage.entryUsageCount,
    entryScanTruncated: usage.entryScanTruncated
  });
  return { ok: true, deleted: false, requested: true, usage };
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
  const ref = db.collection("engagementClubSwimmers").doc(swimmerId);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Nageur introuvable.");
  }
  const swimmer = snapshot.data() || {};
  const usage = await engagementClubSwimmerDeletionUsage(swimmerId, swimmer, {
    ...context,
    clubId: cleanText(swimmer.clubId).slice(0, 40)
  });
  if (usage.performanceMatchCount > 0 || usage.entryUsageCount > 0 || usage.entryScanTruncated) {
    throw new HttpsError("failed-precondition", "Ce nageur est utilise dans l'historique. Il doit etre desactive plutot que supprime.", usage);
  }
  const deleted = await deleteEngagementClubSwimmerPermanently(ref, snapshot, context, "national");
  return {
    ok: true,
    ...deleted
  };
});

exports.listEngagementSwimmerDeletionRequests = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  if (!context.national) {
    throw new HttpsError("permission-denied", "Lecture reservee au niveau national.");
  }
  const status = ["pending", "approved", "rejected"].includes(cleanText(request.data?.status))
    ? cleanText(request.data.status)
    : "pending";
  const limit = Math.min(100, Math.max(10, Math.trunc(Number(request.data?.limit) || 50)));
  const snapshot = await db.collection("engagementSwimmerDeletionRequests")
    .where("status", "==", status)
    .limit(limit)
    .get();
  const requests = snapshot.docs.map((doc) => {
    const data = doc.data() || {};
    return {
      id: doc.id,
      requestType: "swimmer",
      swimmerId: cleanText(data.swimmerId || doc.id).slice(0, 80),
      swimmerName: cleanText(data.swimmerName).slice(0, 160),
      firstName: cleanText(data.firstName).slice(0, 80),
      lastName: cleanText(data.lastName).slice(0, 80),
      birthDate: cleanIsoDate(data.birthDate),
      licenseNumber: cleanText(data.licenseNumber).slice(0, 60),
      clubId: cleanText(data.clubId).slice(0, 40),
      clubName: cleanText(data.clubName).slice(0, 140),
      regionId: cleanText(data.regionId).slice(0, 80),
      performanceMatchCount: Math.max(0, Math.trunc(Number(data.performanceMatchCount) || 0)),
      entryUsageCount: Math.max(0, Math.trunc(Number(data.entryUsageCount) || 0)),
      competitionIds: (Array.isArray(data.competitionIds) ? data.competitionIds : []).map((value) => cleanText(value).slice(0, 128)).filter(Boolean).slice(0, 25),
      entryScanTruncated: data.entryScanTruncated === true,
      status: cleanText(data.status),
      requestedAt: cleanText(data.requestedAt),
      requestedBy: cleanText(data.requestedBy),
      requestedByEmail: cleanText(data.requestedByEmail)
    };
  }).sort((left, right) => String(right.requestedAt || "").localeCompare(String(left.requestedAt || "")));
  return { ok: true, status, requests };
});

exports.resolveEngagementSwimmerDeletionRequest = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  if (!context.national) {
    throw new HttpsError("permission-denied", "Validation reservee au niveau national.");
  }
  const requestId = cleanText(request.data?.requestId).slice(0, 80);
  const decision = cleanText(request.data?.decision);
  if (!requestId) throw new HttpsError("invalid-argument", "Demande requise.");
  if (!["approved", "rejected"].includes(decision)) {
    throw new HttpsError("invalid-argument", "Decision invalide.");
  }
  const requestRef = db.collection("engagementSwimmerDeletionRequests").doc(requestId);
  const requestSnapshot = await requestRef.get();
  if (!requestSnapshot.exists) throw new HttpsError("not-found", "Demande de retrait introuvable.");
  const deletionRequest = requestSnapshot.data() || {};
  if (cleanText(deletionRequest.status) !== "pending") {
    throw new HttpsError("failed-precondition", "Demande deja traitee.");
  }
  const swimmerId = cleanText(deletionRequest.swimmerId || requestId).slice(0, 80);
  const swimmerRef = db.collection("engagementClubSwimmers").doc(swimmerId);
  const swimmerSnapshot = await swimmerRef.get();
  const swimmer = swimmerSnapshot.exists ? swimmerSnapshot.data() || {} : {};
  const now = new Date().toISOString();
  const batch = db.batch();
  if (swimmerSnapshot.exists) {
    if (decision === "rejected") {
      batch.set(swimmerRef, {
        active: true,
        status: "active",
        deletionRequestStatus: "rejected",
        reactivatedAt: now,
        reactivatedBy: context.uid,
        updatedAt: now,
        updatedBy: context.uid
      }, { merge: true });
      upsertEngagementClubRosterSwimmer(batch, db, { ...swimmer, active: true, status: "active", id: swimmerId, swimmerIndexId: swimmerId, source: "engagement" }, now);
    } else {
      batch.set(swimmerRef, {
        active: false,
        status: "inactive",
        deletionRequestStatus: "approved",
        updatedAt: now,
        updatedBy: context.uid
      }, { merge: true });
      deleteEngagementClubRosterSwimmer(batch, db, { ...swimmer, id: swimmerId, swimmerIndexId: swimmerId, source: "engagement" }, now);
    }
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
  await writeAuditLog("engagementClubSwimmer.deletionRequestResolved", context.uid, {
    requestId,
    swimmerId,
    decision,
    clubId: cleanText(deletionRequest.clubId).slice(0, 40),
    performanceMatchCount: Math.max(0, Math.trunc(Number(deletionRequest.performanceMatchCount) || 0)),
    entryUsageCount: Math.max(0, Math.trunc(Number(deletionRequest.entryUsageCount) || 0))
  });
  return { ok: true, requestId, swimmerId, decision, swimmerActive: decision === "rejected" };
});

function engagementNationalSwimmerCollectionForSource(db, source = "") {
  const cleanSource = cleanText(source || "engagement");
  if (cleanSource === "performances") return db.collection(PERFORMANCE_SWIMMERS_COLLECTION);
  if (cleanSource === "engagement") return db.collection("engagementClubSwimmers");
  throw new HttpsError("invalid-argument", "Source nageur invalide.");
}

function engagementNationalSwimmerItemFromDoc(doc, source = "") {
  return cleanText(source) === "performances"
    ? engagementClubSwimmerItem(doc)
    : engagementNewSwimmerItem(doc);
}

async function materializeEngagementNationalPerformanceSwimmerForMerge(target = {}, context = {}) {
  if (target.ref?.id && target.snapshot?.exists) {
    return {
      ref: target.ref,
      snapshot: target.snapshot,
      swimmer: target.swimmer,
      source: "performances",
      performanceRows: target.performanceRows || [],
      recoveredIndex: false
    };
  }
  const rows = Array.isArray(target.performanceRows) ? target.performanceRows : [];
  const finalPerformanceCount = rows.filter((row) => row.isIntermediate !== true).length;
  if (!rows.length) {
    throw new HttpsError(
      "failed-precondition",
      "Les performances de ce nageur ne sont pas encore disponibles dans la base active. Synchronisez la base avant la fusion."
    );
  }
  if (rows.length > ENGAGEMENT_SWIMMER_CORRECTION_MAX_PERFORMANCE_ROWS ||
      !recoveredPerformanceRowsAreComplete(rows, target.swimmer?.performanceCount)) {
    throw new HttpsError("failed-precondition", "Fusion trop volumineuse ou index incomplet. Une migration dediee est necessaire.");
  }
  const now = context.now || new Date().toISOString();
  await writePerformanceSwimmerIndexRows(rows, {
    now,
    action: "engagement.swimmerMergeIndexRecovered",
    mode: "replace"
  });
  await writePerformanceSwimmerPageRows(rows, {
    now,
    action: "engagement.swimmerMergeIndexRecovered"
  });
  const indexId = performanceSwimmerIndexDocId(rows[0]);
  const ref = db.collection(PERFORMANCE_SWIMMERS_COLLECTION).doc(indexId);
  if (target.swimmer?.licenseNumber) {
    await ref.set({
      licenseNumber: cleanText(target.swimmer.licenseNumber).slice(0, 60),
      updatedAt: now
    }, { merge: true });
  }
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new HttpsError("internal", "Reconstruction de l'index nageur impossible.");
  }
  return {
    ref,
    snapshot,
    swimmer: {
      ...engagementClubSwimmerItem(snapshot),
      ...(target.swimmer?.licenseNumber ? { licenseNumber: target.swimmer.licenseNumber } : {})
    },
    source: "performances",
    performanceRows: rows,
    recoveredIndex: true
  };
}

async function getEngagementNationalSwimmerForMerge(db, source = "", swimmerId = "", identityKey = "", context = {}) {
  const cleanSource = cleanText(source || "engagement");
  const cleanId = cleanText(swimmerId).slice(0, 80);
  const cleanIdentityKey = cleanText(identityKey).slice(0, 180);
  if (!cleanId) throw new HttpsError("invalid-argument", "Nageur requis.");
  if (cleanSource === "engagement") {
    const collection = engagementNationalSwimmerCollectionForSource(db, cleanSource);
    const ref = collection.doc(cleanId);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new HttpsError("not-found", "Nageur introuvable.");
    const swimmer = engagementNationalSwimmerItemFromDoc(snapshot, cleanSource);
    if (cleanIdentityKey && cleanText(swimmer.identityKey) !== cleanIdentityKey) {
      throw new HttpsError("failed-precondition", "La fiche nageur a change depuis la recherche. Rechargez-la avant la fusion.");
    }
    return { ref, snapshot, swimmer, source: cleanSource, recoveredIndex: false };
  }
  if (cleanSource !== "performances") {
    engagementNationalSwimmerCollectionForSource(db, cleanSource);
  }
  const target = await getEngagementSwimmerCorrectionTarget(db, "performances", cleanId, cleanIdentityKey);
  if (cleanIdentityKey && cleanText(target.swimmer?.identityKey) !== cleanIdentityKey) {
    throw new HttpsError("failed-precondition", "La fiche nageur a change depuis la recherche. Rechargez-la avant la fusion.");
  }
  return materializeEngagementNationalPerformanceSwimmerForMerge(target, context);
}

function engagementNationalSwimmerFullName(swimmer = {}) {
  return [swimmer.firstName, swimmer.lastName].filter(Boolean).join(" ") || swimmer.name || swimmer.licenseNumber || swimmer.id || "Nageur";
}

function engagementNationalSwimmerEntrySnapshot(swimmer = {}, source = "") {
  return cleanEngagementEntrySwimmer({
    ...swimmer,
    swimmerIndexId: cleanText(swimmer.swimmerIndexId || swimmer.id).slice(0, 80),
    source: cleanText(source || swimmer.source || "performances").slice(0, 40),
    individualEntries: swimmer.individualEntries || []
  });
}

function mergeEngagementEntryIndividualEntries(targetEntries = [], sourceEntries = []) {
  const byEvent = new Map();
  (Array.isArray(targetEntries) ? targetEntries : []).forEach((entry) => {
    const cleanEntry = cleanEngagementEntryIndividualEntries([entry])[0];
    if (cleanEntry?.eventCode) byEvent.set(cleanEntry.eventCode, cleanEntry);
  });
  (Array.isArray(sourceEntries) ? sourceEntries : []).forEach((entry) => {
    const cleanEntry = cleanEngagementEntryIndividualEntries([entry])[0];
    if (cleanEntry?.eventCode && !byEvent.has(cleanEntry.eventCode)) byEvent.set(cleanEntry.eventCode, cleanEntry);
  });
  return Array.from(byEvent.values());
}

function mergeEngagementClubEntrySwimmers(swimmers = [], sourceIds = [], targetSnapshot = {}) {
  const sourceKeys = new Set((Array.isArray(sourceIds) ? sourceIds : [sourceIds])
    .map((id) => cleanText(id).slice(0, 80))
    .filter(Boolean));
  const targetKey = cleanText(targetSnapshot.swimmerIndexId || targetSnapshot.id).slice(0, 80);
  if (!sourceKeys.size || !targetKey) return { swimmers: Array.isArray(swimmers) ? swimmers : [], changed: false };
  const cleanSwimmers = (Array.isArray(swimmers) ? swimmers : []).map(cleanEngagementEntrySwimmer);
  const sourceSwimmer = cleanSwimmers.find((swimmer) => sourceKeys.has(cleanText(swimmer.swimmerIndexId).slice(0, 80)));
  if (!sourceSwimmer) return { swimmers: cleanSwimmers, changed: false };
  const existingTarget = cleanSwimmers.find((swimmer) => cleanText(swimmer.swimmerIndexId).slice(0, 80) === targetKey);
  const mergedTarget = cleanEngagementEntrySwimmer({
    ...targetSnapshot,
    individualEntries: mergeEngagementEntryIndividualEntries(existingTarget?.individualEntries || [], sourceSwimmer.individualEntries || [])
  });
  const next = [];
  let targetInserted = false;
  cleanSwimmers.forEach((swimmer) => {
    const swimmerKey = cleanText(swimmer.swimmerIndexId).slice(0, 80);
    if (sourceKeys.has(swimmerKey)) {
      if (!targetInserted && !existingTarget) {
        next.push(mergedTarget);
        targetInserted = true;
      }
      return;
    }
    if (swimmerKey === targetKey) {
      next.push(mergedTarget);
      targetInserted = true;
      return;
    }
    next.push(swimmer);
  });
  if (!targetInserted) next.push(mergedTarget);
  return { swimmers: next, changed: true };
}

function mergeEngagementClubEntryRelays(relays = [], sourceIds = [], targetSnapshot = {}) {
  const sourceKeys = new Set((Array.isArray(sourceIds) ? sourceIds : [sourceIds])
    .map((id) => cleanText(id).slice(0, 80))
    .filter(Boolean));
  const targetKey = cleanText(targetSnapshot.swimmerIndexId || targetSnapshot.id).slice(0, 80);
  if (!sourceKeys.size || !targetKey) return { relays: Array.isArray(relays) ? relays : [], changed: false };
  let changed = false;
  const targetMember = {
    swimmerIndexId: targetKey,
    swimmerId: cleanText(targetSnapshot.swimmerId).slice(0, 80),
    firstName: cleanText(targetSnapshot.firstName).slice(0, 80),
    lastName: cleanText(targetSnapshot.lastName).slice(0, 80),
    name: cleanText(targetSnapshot.name).slice(0, 160),
    birthDate: cleanIsoDate(targetSnapshot.birthDate),
    sex: normalizeCategoryCode(targetSnapshot.sex),
    licenseNumber: cleanText(targetSnapshot.licenseNumber).slice(0, 60)
  };
  const nextRelays = (Array.isArray(relays) ? relays : []).map((relay) => {
    const memberIds = (Array.isArray(relay?.memberIds) ? relay.memberIds : [])
      .map((id) => cleanText(id).slice(0, 80))
      .filter(Boolean);
    if (!memberIds.some((id) => sourceKeys.has(id))) return relay;
    if (memberIds.includes(targetKey)) {
      throw new HttpsError("failed-precondition", "Fusion impossible : source et cible sont dans le meme relais. Corrigez ce relais avant de fusionner.");
    }
    changed = true;
    const members = (Array.isArray(relay?.members) ? relay.members : []).map((member) =>
      sourceKeys.has(cleanText(member?.swimmerIndexId).slice(0, 80)) ? targetMember : member
    );
    return cleanFirestoreValue({
      ...relay,
      memberIds: Array.from(new Set(memberIds.map((id) => sourceKeys.has(id) ? targetKey : id))),
      members
    });
  });
  return { relays: nextRelays, changed };
}

async function searchEngagementNationalSwimmerMergeTargetDocs(db, sourceSwimmer = {}, query = "", limit = 25) {
  const docs = new Map();
  const addDocs = (snapshot, source) => {
    snapshot.docs.forEach((doc) => {
      const key = `${source}:${doc.id}`;
      if (!docs.has(key)) docs.set(key, { doc, source });
    });
  };
  const cleanQuery = cleanText(query).slice(0, 100);
  const sourceIdentityKey = cleanText(sourceSwimmer.identityKey).slice(0, 180);
  const sourceLicense = cleanText(sourceSwimmer.licenseNumber).slice(0, 60);
  const searchToken = normalizePerformanceSearchText(cleanQuery || engagementNationalSwimmerFullName(sourceSwimmer)).split(/\s+/)[0] || "";
  const reads = [];
  if (sourceIdentityKey) {
    reads.push(db.collection(PERFORMANCE_SWIMMERS_COLLECTION).where("identityKey", "==", sourceIdentityKey).limit(limit).get().then((snapshot) => addDocs(snapshot, "performances")));
    reads.push(db.collection("engagementClubSwimmers").where("identityKey", "==", sourceIdentityKey).limit(limit).get().then((snapshot) => addDocs(snapshot, "engagement")));
  }
  const license = cleanQuery || sourceLicense;
  if (license) {
    reads.push(db.collection(PERFORMANCE_SWIMMERS_COLLECTION).where("licenseNumber", "==", license).limit(limit).get().then((snapshot) => addDocs(snapshot, "performances")));
    reads.push(db.collection("engagementClubSwimmers").where("licenseNumber", "==", license).limit(limit).get().then((snapshot) => addDocs(snapshot, "engagement")));
  }
  if (searchToken.length >= 2) {
    reads.push(db.collection(PERFORMANCE_SWIMMERS_COLLECTION).where("searchPrefixes", "array-contains", searchToken.slice(0, 18)).limit(limit).get().then((snapshot) => addDocs(snapshot, "performances")));
  }
  await Promise.all(reads);
  return Array.from(docs.values()).slice(0, limit);
}

exports.searchEngagementNationalSwimmerMergeTargets = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  if (!context.national) {
    throw new HttpsError("permission-denied", "Recherche reservee au niveau national.");
  }
  const sourceSwimmerId = cleanText(request.data?.sourceSwimmerId).slice(0, 80);
  const sourceSource = cleanText(request.data?.sourceSource || "engagement").slice(0, 40);
  const query = cleanText(request.data?.query).slice(0, 100);
  const limit = Math.min(40, Math.max(5, Math.trunc(Number(request.data?.limit) || 20)));
  const source = await getEngagementNationalSwimmerForMerge(db, sourceSource, sourceSwimmerId);
  const sourceKey = `${source.source}:${sourceSwimmerId}`;
  const swimmers = (query
    ? await searchEngagementNationalSwimmerDocs(db, query, limit + 1)
    : (await searchEngagementNationalSwimmerMergeTargetDocs(db, source.swimmer, query, limit + 1))
      .map((item) => engagementNationalSwimmerItemFromDoc(item.doc, item.source)))
    .filter((swimmer) => `${swimmer.source || "performances"}:${swimmer.id || swimmer.swimmerIndexId}` !== sourceKey)
    .filter((swimmer) => swimmer.status !== "merged" && !swimmer.mergedIntoId)
    .slice(0, limit);
  return {
    ok: true,
    swimmers
  };
});

function performanceMergeTargetPayloadFromSwimmer(targetSwimmer = {}) {
  const identityKey = cleanText(targetSwimmer.identityKey).slice(0, 180) ||
    engagementSwimmerIdentityKey(targetSwimmer.firstName, targetSwimmer.lastName, targetSwimmer.birthDate);
  return cleanFirestoreValue({
    swimmerId: cleanText(targetSwimmer.swimmerId || targetSwimmer.id || targetSwimmer.swimmerIndexId).slice(0, 80),
    swimmerIdentityKey: identityKey,
    swimmer: engagementNationalSwimmerFullName(targetSwimmer),
    firstName: cleanText(targetSwimmer.firstName).slice(0, 80),
    lastName: cleanText(targetSwimmer.lastName).slice(0, 80),
    birthDate: cleanIsoDate(targetSwimmer.birthDate),
    sex: normalizeCategoryCode(targetSwimmer.sex)
  });
}

function publicPerformanceRowsFromSwimmerPayload(payload = {}) {
  return (Array.isArray(payload?.rows) ? payload.rows : []).map((row) => publicPerformanceBaseRow({
    ...row,
    swimmerId: cleanText(payload.id),
    swimmerIdentityKey: cleanText(payload.identityKey),
    swimmer: cleanText(payload.name),
    firstName: cleanText(payload.firstName),
    lastName: cleanText(payload.lastName),
    birthDate: cleanText(payload.birthDate),
    sex: cleanText(payload.sex),
    clubId: cleanText(row.clubId || payload.clubId),
    club: cleanText(row.club || payload.club),
    clubName: cleanText(row.clubName || payload.clubName)
  }));
}

async function publishEngagementNationalSwimmerMerge(sourceSwimmer = {}, targetSwimmer = {}, targetRows = [], context = {}) {
  const oldPublicKey = cleanText(sourceSwimmer.identityKey) || publicSwimmerKey(sourceSwimmer);
  const newPublicKey = cleanText(targetSwimmer.identityKey) || publicSwimmerKey(targetSwimmer);
  const rows = uniquePublicPerformanceRows((Array.isArray(targetRows) ? targetRows : []).map(publicPerformanceBaseRow));
  if (!oldPublicKey || !newPublicKey || !rows.length) {
    throw new Error("Donnees insuffisantes pour publier la fusion nageur.");
  }
  const oldPayload = await readPublicPerformanceJson(publicPerformanceSwimmerFilePath(oldPublicKey), null);
  const oldRows = publicPerformanceRowsFromSwimmerPayload(oldPayload || {});
  const now = context.now || new Date().toISOString();
  const newPerfFile = publicPerformanceSwimmerFilePath(newPublicKey);
  const existingTargetPayload = await readPublicPerformanceJson(newPerfFile, null);
  if (existingTargetPayload) {
    await removePublicSearchIndexes(existingTargetPayload, newPerfFile);
    await deletePublicPerformanceFile(newPerfFile);
  }
  const publicSnapshot = oldPublicKey === newPublicKey
    ? await rebuildPublicPerformanceFilesForAffectedRows(rows, {
        now,
        reason: "engagement.swimmerMerged"
      })
    : await replacePublicSwimmerIdentity(oldPublicKey, newPublicKey, rows);
  const topSnapshot = await rebuildPublicTopFilesForAffectedRows(
    [...oldRows, ...rows],
    new Map([[newPublicKey, rows]])
  );
  return {
    ...publicSnapshot,
    oldPublicKey,
    newPublicKey,
    correctedTopBuckets: topSnapshot.affectedTopBuckets
  };
}

async function activePerformanceRowsForNationalSwimmer(target = {}) {
  const swimmer = target.swimmer || {};
  return getPerformanceBaseRowsBySwimmer({
    swimmerIds: swimmerMergeIds(swimmer, target.ref?.id).slice(0, 25),
    identityKey: cleanText(swimmer.identityKey).slice(0, 180)
  });
}

async function readPerformanceDocsForNationalSwimmerMerge(db, sourceSwimmer = {}, sourceSwimmerId = "", limit = 180) {
  const ids = Array.from(new Set([
    sourceSwimmerId,
    sourceSwimmer.id,
    sourceSwimmer.swimmerId,
    sourceSwimmer.swimmerIndexId,
    ...(Array.isArray(sourceSwimmer.sourceIds) ? sourceSwimmer.sourceIds : [])
  ].map((id) => cleanText(id).slice(0, 80)).filter(Boolean))).slice(0, 25);
  const identityKey = cleanText(sourceSwimmer.identityKey).slice(0, 180);
  if (!ids.length && !identityKey) return [];
  const performanceRows = await getPerformanceBaseRowsBySwimmer({ swimmerIds: ids, identityKey });
  const rows = performanceRows.map((row) => {
    const id = cleanText(row.performanceBaseId || performanceBaseDocId(row));
    return {
      id,
      ref: db.collection(PERFORMANCE_BASE_COLLECTION).doc(id),
      data: () => row
    };
  }).filter((doc) => doc.id);
  if (rows.length > limit) {
    throw new HttpsError("failed-precondition", "Fusion trop volumineuse pour une action directe. Une migration dediee est necessaire.");
  }
  return rows;
}

exports.mergeEngagementNationalClubSwimmer = onCall(ENGAGEMENT_SWIMMER_CORRECTION_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  if (!context.national) {
    throw new HttpsError("permission-denied", "Fusion reservee au niveau national.");
  }
  const sourceSwimmerId = cleanText(request.data?.sourceSwimmerId).slice(0, 80);
  const sourceSource = cleanText(request.data?.sourceSource || "engagement").slice(0, 40);
  const sourceIdentityKey = cleanText(request.data?.sourceIdentityKey).slice(0, 180);
  const targetSwimmerId = cleanText(request.data?.targetSwimmerId).slice(0, 80);
  const targetSource = cleanText(request.data?.targetSource || "performances").slice(0, 40);
  const targetIdentityKey = cleanText(request.data?.targetIdentityKey).slice(0, 180);
  if (!sourceSwimmerId || !targetSwimmerId || (sourceSource === targetSource && sourceSwimmerId === targetSwimmerId)) {
    throw new HttpsError("invalid-argument", "Nageurs source et cible requis.");
  }
  if (request.data?.confirmMerge !== true) {
    throw new HttpsError("failed-precondition", "Confirmation de fusion requise.");
  }
  const recoveryContext = { uid: context.uid, now: new Date().toISOString() };
  const source = await getEngagementNationalSwimmerForMerge(db, sourceSource, sourceSwimmerId, sourceIdentityKey, recoveryContext);
  const target = await getEngagementNationalSwimmerForMerge(db, targetSource, targetSwimmerId, targetIdentityKey, recoveryContext);
  if (source.ref.path === target.ref.path) {
    throw new HttpsError("invalid-argument", "Les deux selections correspondent a la meme fiche nageur.");
  }
  const sourceSwimmer = source.swimmer;
  const targetSwimmer = target.swimmer;
  const sourceMergeIds = swimmerMergeIds(sourceSwimmer, sourceSwimmerId).slice(0, 25);
  const resolvedSourceSwimmerId = source.ref.id;
  const resolvedTargetSwimmerId = target.ref.id;
  if (sourceSwimmer.status === "merged" || sourceSwimmer.mergedIntoId) {
    throw new HttpsError("failed-precondition", "Ce nageur est deja fusionne.");
  }
  if (targetSwimmer.status === "merged" || targetSwimmer.mergedIntoId) {
    throw new HttpsError("failed-precondition", "La fiche cible est deja fusionnee vers une autre fiche.");
  }
  const clubMismatch = Boolean(sourceSwimmer.clubId && targetSwimmer.clubId && sourceSwimmer.clubId !== targetSwimmer.clubId);
  if (clubMismatch && request.data?.confirmClubMismatch !== true) {
    throw new HttpsError("failed-precondition", "Les clubs sont differents. Confirmation speciale requise.", {
      code: "club-mismatch"
    });
  }
  const licenseMismatch = Boolean(sourceSwimmer.licenseNumber && targetSwimmer.licenseNumber && sourceSwimmer.licenseNumber !== targetSwimmer.licenseNumber);
  if (licenseMismatch && request.data?.confirmLicenseMismatch !== true) {
    throw new HttpsError("failed-precondition", "Les numeros de licence sont differents. Confirmation speciale requise.", {
      code: "license-mismatch"
    });
  }
  const performanceDocs = source.performanceRows?.length
    ? source.performanceRows.map((row) => {
        const id = cleanText(row.performanceBaseId || performanceBaseDocId(row));
        return { id, ref: db.collection(PERFORMANCE_BASE_COLLECTION).doc(id), data: () => row };
      }).filter((doc) => doc.id)
    : await readPerformanceDocsForNationalSwimmerMerge(db, sourceSwimmer, sourceSwimmerId, 180);
  const now = new Date().toISOString();
  const targetName = engagementNationalSwimmerFullName(targetSwimmer);
  const targetSnapshot = engagementNationalSwimmerEntrySnapshot(targetSwimmer, target.source);
  const entriesSnapshot = sourceSwimmer.clubId
    ? await db.collection("engagementClubEntries").where("clubId", "==", sourceSwimmer.clubId).limit(300).get()
    : { docs: [], size: 0 };
  const batch = db.batch();
  const targetPayload = {
    active: true,
    status: "active",
    mergedSourceIds: FieldValue.arrayUnion(...sourceMergeIds),
    updatedAt: now,
    updatedBy: context.uid
  };
  if (!targetSwimmer.licenseNumber && sourceSwimmer.licenseNumber) {
    targetPayload.licenseNumber = sourceSwimmer.licenseNumber;
    targetSnapshot.licenseNumber = sourceSwimmer.licenseNumber;
  }
  const sourcePayload = {
    active: false,
    status: "merged",
    mergedIntoId: resolvedTargetSwimmerId,
    mergedIntoSource: target.source,
    mergedIntoName: targetName,
    mergedAt: now,
    mergedBy: context.uid,
    updatedAt: now,
    updatedBy: context.uid
  };
  batch.set(target.ref, targetPayload, { merge: true });
  batch.set(source.ref, sourcePayload, { merge: true });
  upsertEngagementClubRosterSwimmer(batch, db, { ...targetSwimmer, ...targetPayload, swimmerIndexId: targetSwimmer.swimmerIndexId || targetSwimmer.id, source: target.source }, now);
  sourceMergeIds.forEach((sourceId) => {
    deleteEngagementClubRosterSwimmer(batch, db, { ...sourceSwimmer, id: sourceId, swimmerIndexId: sourceId, source: source.source }, now);
    deleteEngagementEntryTimeCache(batch, db, { source: source.source, swimmerIndexId: sourceId });
  });
  deleteEngagementEntryTimeCache(batch, db, { source: target.source, swimmerIndexId: targetSwimmer.swimmerIndexId || targetSwimmer.id });
  if (source.source === "performances") {
    const pageCount = Math.min(50, Math.max(0, Math.trunc(Number(source.snapshot.data()?.pageCount || 0) || 0)));
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      batch.delete(db.collection(PERFORMANCE_SWIMMER_PAGES_COLLECTION).doc(performanceSwimmerPageId(resolvedSourceSwimmerId, pageIndex)));
    }
  }
  let entrySwimmerUpdateCount = 0;
  let relayUpdateCount = 0;
  entriesSnapshot.docs.forEach((entryDoc) => {
    const entry = entryDoc.data() || {};
    const updates = {};
    const swimmersResult = mergeEngagementClubEntrySwimmers(entry.swimmers || [], sourceMergeIds, targetSnapshot);
    if (swimmersResult.changed) {
      updates.swimmers = swimmersResult.swimmers;
      entrySwimmerUpdateCount += 1;
    }
    const relaysResult = mergeEngagementClubEntryRelays(entry.relays || [], sourceMergeIds, targetSnapshot);
    if (relaysResult.changed) {
      updates.relays = relaysResult.relays;
      relayUpdateCount += 1;
    }
    if (Object.keys(updates).length) {
      batch.set(entryDoc.ref, {
        ...updates,
        updatedAt: now,
        updatedBy: context.uid
      }, { merge: true });
    }
  });
  const updatedPerformanceRows = [];
  const performanceTarget = performanceMergeTargetPayloadFromSwimmer({ ...targetSwimmer, ...targetPayload });
  performanceDocs.forEach((doc) => {
    const before = doc.data() || {};
    const row = publicPerformanceBaseRow({ performanceBaseId: doc.id, ...before });
    const updated = cleanFirestoreValue({
      ...performanceTarget,
      originalSwimmerId: cleanText(row.originalSwimmerId || row.swimmerId || sourceSwimmerId).slice(0, 80),
      updatedAt: now,
      updatedBy: context.uid,
      sourceAction: "engagement.swimmerMerged"
    });
    batch.set(doc.ref, updated, { merge: true });
    updatedPerformanceRows.push(publicPerformanceBaseRow({
      ...row,
      ...updated,
      performanceBaseId: doc.id,
      publicKey: row.publicKey || before.publicKey || performancePublicKey(row)
    }));
  });
  if (source.source === "engagement") {
    const sourceLicenseNumberRefId = engagementSwimmerLicenseNumberId(sourceSwimmer.licenseNumber);
    if (sourceLicenseNumberRefId) {
      batch.delete(db.collection(ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION).doc(sourceLicenseNumberRefId));
    }
    sourceMergeIds.forEach((sourceId) => {
      batch.delete(db.collection("engagementSwimmerLicenses").doc(stableHash(sourceId).slice(0, 40)));
    });
  }
  if (targetPayload.licenseNumber) {
    const targetLicensePayload = engagementSwimmerLicensePayload(
      { ...targetSwimmer, ...targetPayload, swimmerIndexId: targetSwimmer.swimmerIndexId || targetSwimmer.id },
      { uid: context.uid, clubId: targetSwimmer.clubId || sourceSwimmer.clubId, clubName: targetSwimmer.clubName || sourceSwimmer.clubName },
      { type: "national_merge", collectedAt: now, verificationSource: "national" }
    );
    batch.set(db.collection("engagementSwimmerLicenses").doc(stableHash(targetSwimmer.swimmerIndexId || targetSwimmer.id || targetSwimmerId).slice(0, 40)), targetLicensePayload, { merge: true });
    const targetLicenseNumberRefId = engagementSwimmerLicenseNumberId(targetPayload.licenseNumber);
    if (targetLicenseNumberRefId) {
      batch.set(db.collection(ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION).doc(targetLicenseNumberRefId), targetLicensePayload, { merge: true });
    }
  }
  await batch.commit();
  if (updatedPerformanceRows.length) {
    await writePerformanceSwimmerIndexRows(updatedPerformanceRows, { action: "engagement.swimmerMerged", now });
    await writePerformanceSwimmerPageRows(updatedPerformanceRows, { action: "engagement.swimmerMerged", now });
  }
  let publicSnapshot = { ok: true, skipped: true, reason: "Aucune performance source a publier." };
  if (updatedPerformanceRows.length) {
    try {
      const targetRows = await activePerformanceRowsForNationalSwimmer({
        ...target,
        swimmer: { ...targetSwimmer, ...targetPayload }
      });
      publicSnapshot = await publishEngagementNationalSwimmerMerge(
        sourceSwimmer,
        { ...targetSwimmer, ...targetPayload },
        targetRows,
        { now }
      );
    } catch (error) {
      console.error("Publication publique ciblee impossible apres fusion nageur", {
        sourceSwimmerId: resolvedSourceSwimmerId,
        targetSwimmerId: resolvedTargetSwimmerId,
        message: error?.message || String(error)
      });
      publicSnapshot = { ok: false, error: error?.message || "Publication publique ciblee impossible." };
    }
  }
  await writeAuditLog("engagementClubSwimmer.nationalMerged", context.uid, {
    sourceSwimmerId,
    resolvedSourceSwimmerId,
    sourceSource: source.source,
    targetSwimmerId,
    resolvedTargetSwimmerId,
    targetSource: target.source,
    sourceClubId: sourceSwimmer.clubId,
    targetClubId: targetSwimmer.clubId,
    clubMismatch,
    licenseMismatch,
    sourceIndexRecovered: source.recoveredIndex === true,
    targetIndexRecovered: target.recoveredIndex === true,
    publicSnapshotOk: publicSnapshot.ok !== false,
    scannedEntryCount: entriesSnapshot.size,
    entrySwimmerUpdateCount,
    relayUpdateCount,
    performanceUpdateCount: updatedPerformanceRows.length
  });
  const [updatedSource, updatedTarget] = await db.getAll(source.ref, target.ref);
  return {
    ok: true,
    source: engagementNationalSwimmerItemFromDoc(updatedSource, source.source),
    target: engagementNationalSwimmerItemFromDoc(updatedTarget, target.source),
    scannedEntryCount: entriesSnapshot.size,
    entrySwimmerUpdateCount,
    relayUpdateCount,
    performanceUpdateCount: updatedPerformanceRows.length,
    publicSnapshot
  };
});

exports.repairEngagementNationalSwimmerMergePublication = onCall(ENGAGEMENT_SWIMMER_CORRECTION_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  if (!context.national) throw new HttpsError("permission-denied", "Reparation reservee au niveau national.");
  const sourceSwimmerId = cleanText(request.data?.sourceSwimmerId).slice(0, 80);
  const sourceSource = cleanText(request.data?.sourceSource || "performances").slice(0, 40);
  const sourceIdentityKey = cleanText(request.data?.sourceIdentityKey).slice(0, 180);
  if (!sourceSwimmerId) throw new HttpsError("invalid-argument", "Fiche fusionnee requise.");
  const source = await getEngagementNationalSwimmerForMerge(
    db,
    sourceSource,
    sourceSwimmerId,
    sourceIdentityKey,
    { uid: context.uid, now: new Date().toISOString() }
  );
  const sourceSwimmer = source.swimmer;
  if (cleanText(sourceSwimmer.status) !== "merged" || !cleanText(sourceSwimmer.mergedIntoId)) {
    throw new HttpsError("failed-precondition", "Cette fiche n'est pas marquee comme fusionnee.");
  }
  const target = await getEngagementNationalSwimmerForMerge(
    db,
    sourceSwimmer.mergedIntoSource || "performances",
    sourceSwimmer.mergedIntoId,
    "",
    { uid: context.uid, now: new Date().toISOString() }
  );
  const targetRows = await activePerformanceRowsForNationalSwimmer(target);
  const publicSnapshot = await publishEngagementNationalSwimmerMerge(
    sourceSwimmer,
    target.swimmer,
    targetRows,
    { now: new Date().toISOString() }
  );
  await writeAuditLog("engagementClubSwimmer.mergePublicationRepaired", context.uid, {
    sourceSwimmerId: source.ref.id,
    targetSwimmerId: target.ref.id,
    affectedRows: targetRows.length,
    writtenFiles: Number(publicSnapshot.writtenFiles || 0),
    correctedTopBuckets: Number(publicSnapshot.correctedTopBuckets || 0)
  });
  return { ok: true, publicSnapshot };
});

exports.listEngagementNationalClubPeople = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  if (!context.national) {
    throw new HttpsError("permission-denied", "Lecture reservee au niveau national.");
  }
  const limit = Math.min(200, Math.max(20, Math.trunc(Number(request.data?.limit) || 80)));
  const snapshot = await db
    .collection("engagementClubPeople")
    .orderBy("updatedAt", "desc")
    .limit(limit)
    .get();
  return {
    ok: true,
    people: snapshot.docs.map(engagementClubPersonItem)
  };
});

exports.setEngagementNationalClubPersonStatus = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  if (!context.national) {
    throw new HttpsError("permission-denied", "Action reservee au niveau national.");
  }
  const personId = cleanText(request.data?.personId).slice(0, 80);
  if (!personId) {
    throw new HttpsError("invalid-argument", "Personne requise.");
  }
  const active = request.data?.active === true;
  const ref = db.collection("engagementClubPeople").doc(personId);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Personne introuvable.");
  }
  if (cleanText(snapshot.data()?.status) === "merged" && active) {
    throw new HttpsError("failed-precondition", "Une personne fusionnee ne peut pas etre reactivee directement.");
  }
  const now = new Date().toISOString();
  const payload = {
    active,
    updatedAt: now,
    updatedBy: context.uid,
    ...(active ? { reactivatedAt: now, reactivatedBy: context.uid } : { disabledAt: now, disabledBy: context.uid })
  };
  const batch = db.batch();
  batch.set(ref, payload, { merge: true });
  upsertEngagementClubPeopleRosterPerson(batch, db, engagementClubPersonItem({
    id: ref.id,
    data: () => ({ ...(snapshot.data() || {}), ...payload })
  }), now);
  await batch.commit();
  await writeAuditLog("engagementClubPerson.nationalStatusChanged", context.uid, {
    personId,
    firstName: cleanText(snapshot.data()?.firstName).slice(0, 80),
    lastName: cleanText(snapshot.data()?.lastName).slice(0, 80),
    clubId: cleanText(snapshot.data()?.clubId).slice(0, 40),
    active
  });
  const updated = await ref.get();
  return {
    ok: true,
    person: engagementClubPersonItem(updated)
  };
});

exports.deleteEngagementNationalClubPerson = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  if (!context.national) {
    throw new HttpsError("permission-denied", "Suppression reservee au niveau national.");
  }
  const personId = cleanText(request.data?.personId).slice(0, 80);
  if (!personId) {
    throw new HttpsError("invalid-argument", "Personne requise.");
  }
  if (request.data?.confirmPermanent !== true) {
    throw new HttpsError("failed-precondition", "Confirmation de suppression definitive requise.");
  }
  const ref = db.collection("engagementClubPeople").doc(personId);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Personne introuvable.");
  }
  const data = snapshot.data() || {};
  const batch = db.batch();
  batch.delete(ref);
  deleteEngagementClubPeopleRosterPerson(batch, db, { ...data, id: personId });
  await batch.commit();
  await writeAuditLog("engagementClubPerson.nationalDeleted", context.uid, {
    personId,
    firstName: cleanText(data.firstName).slice(0, 80),
    lastName: cleanText(data.lastName).slice(0, 80),
    clubId: cleanText(data.clubId).slice(0, 40),
    roles: data.roles || {}
  });
  return {
    ok: true,
    personId
  };
});

exports.listEngagementNationalAuditLogs = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await auditManagementContext(request);
  const limit = Math.min(AUDIT_PAGE_LIMIT, Math.max(20, Math.trunc(Number(request.data?.limit) || AUDIT_PAGE_LIMIT)));
  const requestedDays = [7, 30, 90, 365].includes(Math.trunc(Number(request.data?.days)))
    ? Math.trunc(Number(request.data.days))
    : 30;
  const requestedCutoff = new Date(Date.now() - requestedDays * 24 * 60 * 60 * 1000).toISOString();
  const visibleFrom = requestedCutoff > AUDIT_LEGACY_VISIBLE_SINCE ? requestedCutoff : AUDIT_LEGACY_VISIBLE_SINCE;
  const actorUid = cleanText(request.data?.actorUid).slice(0, 160);
  const clubId = cleanText(request.data?.clubId).slice(0, 80);
  const cursorCreatedAt = cleanText(request.data?.cursor?.createdAt).slice(0, 40);
  const cursorId = cleanText(request.data?.cursor?.id).slice(0, 160);

  let query = db.collection("auditLogs").where("createdAt", ">=", visibleFrom);
  if (actorUid) query = query.where("actorUid", "==", actorUid);
  if (clubId) query = query.where("target.clubId", "==", clubId);
  query = query.orderBy("createdAt", "desc").orderBy(FieldPath.documentId(), "desc");
  if (cursorCreatedAt && cursorId) query = query.startAfter(cursorCreatedAt, cursorId);
  const snapshot = await query.limit(limit + 1).get();
  const pageDocuments = snapshot.docs.slice(0, limit);
  const hasMore = snapshot.docs.length > limit;
  const logs = pageDocuments.map((doc) => {
    const data = doc.data() || {};
    return cleanFirestoreValue({
      id: doc.id,
      action: cleanText(data.action).slice(0, 120),
      actorUid: cleanText(data.actorUid).slice(0, 160),
      createdAt: cleanText(data.createdAt).slice(0, 40),
      target: typeof data.target === "object" && data.target ? data.target : {}
    });
  });
  const knownActorUids = new Set((Array.isArray(request.data?.knownActorUids) ? request.data.knownActorUids : [])
    .slice(0, 100)
    .map((value) => cleanText(value).slice(0, 160))
    .filter(Boolean));
  const actorUidsToResolve = Array.from(new Set(logs
    .map((log) => log.actorUid)
    .filter((uid) => uid && !knownActorUids.has(uid) && !uid.startsWith("system:") && uid !== "public-login-page")))
    .slice(0, AUDIT_ACTOR_RESOLUTION_LIMIT);
  const actorSnapshots = actorUidsToResolve.length
    ? await db.getAll(...actorUidsToResolve.map((uid) => db.collection("users").doc(uid)))
    : [];
  const unresolvedAuthUids = actorSnapshots
    .filter((actorSnapshot) => {
      const data = actorSnapshot.exists ? actorSnapshot.data() || {} : {};
      return !displayNameFromProfile(data) && !cleanText(data.email);
    })
    .map((actorSnapshot) => actorSnapshot.id);
  const authUsers = unresolvedAuthUids.length
    ? await auth.getUsers(unresolvedAuthUids.map((uid) => ({ uid }))).catch(() => ({ users: [] }))
    : { users: [] };
  const authUsersByUid = new Map(authUsers.users.map((user) => [user.uid, user]));
  const actors = actorSnapshots.map((actorSnapshot) => {
    const data = actorSnapshot.exists ? actorSnapshot.data() || {} : {};
    const authUser = authUsersByUid.get(actorSnapshot.id);
    return {
      uid: actorSnapshot.id,
      name: displayNameFromProfile(data) || cleanText(authUser?.displayName).slice(0, 160),
      email: (cleanText(data.email) || cleanText(authUser?.email)).slice(0, 180)
    };
  });
  const knownCompetitionIds = new Set((Array.isArray(request.data?.knownCompetitionIds) ? request.data.knownCompetitionIds : [])
    .slice(0, 100)
    .map((value) => cleanText(value).slice(0, 128))
    .filter(Boolean));
  const competitionIdsToResolve = Array.from(new Set(logs
    .map((log) => cleanText(log.target?.competitionId).slice(0, 128))
    .filter((competitionId) => competitionId && !knownCompetitionIds.has(competitionId))))
    .slice(0, AUDIT_COMPETITION_RESOLUTION_LIMIT);
  const competitionSnapshots = competitionIdsToResolve.length
    ? await db.getAll(...competitionIdsToResolve.map((competitionId) => db.collection("engagementCompetitions").doc(competitionId)))
    : [];
  const competitions = competitionSnapshots.map((competitionSnapshot) => {
    const data = competitionSnapshot.exists ? competitionSnapshot.data() || {} : {};
    return {
      id: competitionSnapshot.id,
      name: cleanText(data.name || data.title).slice(0, 180),
      date: cleanText(data.date).slice(0, 20)
    };
  });
  const knownPersonIds = new Set((Array.isArray(request.data?.knownPersonIds) ? request.data.knownPersonIds : [])
    .slice(0, 100)
    .map((value) => cleanText(value).slice(0, 80))
    .filter(Boolean));
  const personIdsToResolve = Array.from(new Set(logs
    .map((log) => cleanText(log.target?.personId).slice(0, 80))
    .filter((personId) => personId && !knownPersonIds.has(personId))))
    .slice(0, AUDIT_PERSON_RESOLUTION_LIMIT);
  const personSnapshots = personIdsToResolve.length
    ? await db.getAll(...personIdsToResolve.map((personId) => db.collection("engagementClubPeople").doc(personId)))
    : [];
  const people = personSnapshots.map((personSnapshot) => {
    const data = personSnapshot.exists ? personSnapshot.data() || {} : {};
    return {
      id: personSnapshot.id,
      name: displayNameFromProfile(data),
      licenseNumber: cleanText(data.licenseNumber).slice(0, 60)
    };
  });
  const lastDocument = pageDocuments.at(-1);
  return {
    ok: true,
    logs,
    actors,
    competitions,
    people,
    hasMore,
    nextCursor: hasMore && lastDocument
      ? { id: lastDocument.id, createdAt: cleanText(lastDocument.data()?.createdAt).slice(0, 40) }
      : null,
    visibleFrom,
    readBudget: {
      auditDocuments: snapshot.docs.length,
      actorDocuments: actorSnapshots.length,
      competitionDocuments: competitionSnapshots.length,
      personDocuments: personSnapshots.length,
      profileDocuments: context.profileReadCount,
      maximumDocuments: limit + 1 + AUDIT_ACTOR_RESOLUTION_LIMIT + AUDIT_COMPETITION_RESOLUTION_LIMIT + AUDIT_PERSON_RESOLUTION_LIMIT + 1
    }
  };
});

function engagementClubPersonEntrySnapshot(person = {}) {
  return {
    personId: cleanText(person.id).slice(0, 80),
    firstName: cleanText(person.firstName).slice(0, 80),
    lastName: cleanText(person.lastName).slice(0, 80),
    licenseNumber: cleanText(person.licenseNumber).slice(0, 60)
  };
}

function engagementClubPersonFullName(person = {}) {
  return [person.firstName, person.lastName].filter(Boolean).join(" ") || person.licenseNumber || person.id || "Personne";
}

function mergeEngagementClubEntryOfficials(officials = [], sourceId = "", targetOfficial = {}) {
  const targetId = cleanText(targetOfficial.personId).slice(0, 80);
  const seen = new Set();
  let changed = false;
  const merged = (Array.isArray(officials) ? officials : []).map((official) => {
    const officialId = cleanText(official?.personId).slice(0, 80);
    if (officialId === sourceId) {
      changed = true;
      return targetOfficial;
    }
    return cleanEngagementEntryOfficial(official || {});
  }).filter((official) => official.personId || official.licenseNumber)
    .filter((official) => {
      const key = official.personId || `${official.licenseNumber}|${official.firstName}|${official.lastName}`;
      if (!key) return false;
      if (seen.has(key)) {
        changed = true;
        return false;
      }
      seen.add(key);
      return true;
    });
  if (targetId && !seen.has(targetId) && (Array.isArray(officials) ? officials : []).some((official) => cleanText(official?.personId).slice(0, 80) === sourceId)) {
    changed = true;
  }
  return { officials: merged, changed };
}

exports.mergeEngagementNationalClubPerson = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  if (!context.national) {
    throw new HttpsError("permission-denied", "Fusion reservee au niveau national.");
  }
  const sourcePersonId = cleanText(request.data?.sourcePersonId).slice(0, 80);
  const targetPersonId = cleanText(request.data?.targetPersonId).slice(0, 80);
  if (!sourcePersonId || !targetPersonId || sourcePersonId === targetPersonId) {
    throw new HttpsError("invalid-argument", "Personnes source et cible requises.");
  }
  if (request.data?.confirmMerge !== true) {
    throw new HttpsError("failed-precondition", "Confirmation de fusion requise.");
  }
  const sourceRef = db.collection("engagementClubPeople").doc(sourcePersonId);
  const targetRef = db.collection("engagementClubPeople").doc(targetPersonId);
  const [sourceSnapshot, targetSnapshot] = await db.getAll(sourceRef, targetRef);
  if (!sourceSnapshot.exists || !targetSnapshot.exists) {
    throw new HttpsError("not-found", "Personne source ou cible introuvable.");
  }
  const sourcePerson = engagementClubPersonItem(sourceSnapshot);
  const targetPerson = engagementClubPersonItem(targetSnapshot);
  if (sourcePerson.status === "merged" || sourcePerson.mergedIntoId) {
    throw new HttpsError("failed-precondition", "Cette personne est deja fusionnee.");
  }
  if (targetPerson.status === "merged" || targetPerson.mergedIntoId) {
    throw new HttpsError("failed-precondition", "La personne cible est deja fusionnee vers une autre fiche.");
  }
  if (!sourcePerson.clubId || !targetPerson.clubId) {
    throw new HttpsError("failed-precondition", "Club source et club cible requis pour fusionner.");
  }
  const clubMismatch = sourcePerson.clubId !== targetPerson.clubId;
  if (clubMismatch && request.data?.confirmClubMismatch !== true) {
    throw new HttpsError("failed-precondition", "Les clubs sont differents. Confirmation speciale requise.", {
      code: "club-mismatch"
    });
  }
  const licenseMismatch = Boolean(sourcePerson.licenseNumber && targetPerson.licenseNumber && sourcePerson.licenseNumber !== targetPerson.licenseNumber);
  if (licenseMismatch && request.data?.confirmLicenseMismatch !== true) {
    throw new HttpsError("failed-precondition", "Les numeros de licence sont differents. Confirmation speciale requise.", {
      code: "license-mismatch"
    });
  }
  const now = new Date().toISOString();
  const targetRoles = targetSnapshot.data()?.roles || {};
  const sourceRoles = sourceSnapshot.data()?.roles || {};
  const targetPayload = {
    roles: {
      swimmer: targetRoles.swimmer === true || sourceRoles.swimmer === true || Boolean(targetPerson.swimmerIndexId || sourcePerson.swimmerIndexId),
      official: targetRoles.official === true || sourceRoles.official === true,
      teamLeader: targetRoles.teamLeader === true || sourceRoles.teamLeader === true
    },
    swimmerIndexId: targetPerson.swimmerIndexId || sourcePerson.swimmerIndexId || "",
    swimmerSource: targetPerson.swimmerSource || sourcePerson.swimmerSource || "",
    birthDate: targetPerson.birthDate || sourcePerson.birthDate || "",
    sex: targetPerson.sex || sourcePerson.sex || "",
    identityKey: targetPerson.identityKey || sourcePerson.identityKey || "",
    active: true,
    status: "active",
    mergedSourceIds: FieldValue.arrayUnion(sourcePersonId),
    updatedAt: now,
    updatedBy: context.uid
  };
  const sourcePayload = {
    active: false,
    status: "merged",
    mergedIntoId: targetPersonId,
    mergedIntoName: engagementClubPersonFullName(targetPerson),
    mergedAt: now,
    mergedBy: context.uid,
    updatedAt: now,
    updatedBy: context.uid
  };
  const targetEntrySnapshot = engagementClubPersonEntrySnapshot({ ...targetPerson, id: targetPersonId });
  const entriesSnapshot = await db.collection("engagementClubEntries")
    .where("clubId", "==", sourcePerson.clubId)
    .limit(300)
    .get();
  const batch = db.batch();
  batch.set(targetRef, targetPayload, { merge: true });
  batch.set(sourceRef, sourcePayload, { merge: true });
  upsertEngagementClubPeopleRosterPerson(batch, db, { ...targetPerson, ...targetPayload, id: targetPersonId }, now);
  deleteEngagementClubPeopleRosterPerson(batch, db, { ...sourcePerson, id: sourcePersonId }, now);
  let teamLeaderUpdateCount = 0;
  let officialsUpdateCount = 0;
  entriesSnapshot.docs.forEach((entryDoc) => {
    const entry = entryDoc.data() || {};
    const updates = {};
    const teamLeader = entry.teamLeader || {};
    if (cleanText(teamLeader.personId).slice(0, 80) === sourcePersonId) {
      updates.teamLeader = {
        ...teamLeader,
        ...targetEntrySnapshot,
        mode: "person",
        externalClub: targetPerson.clubId !== cleanText(entry.clubId),
        clubId: targetPerson.clubId,
        clubName: targetPerson.clubName
      };
      teamLeaderUpdateCount += 1;
    }
    const officialsResult = mergeEngagementClubEntryOfficials(entry.officials || [], sourcePersonId, targetEntrySnapshot);
    if (officialsResult.changed) {
      updates.officials = officialsResult.officials;
      officialsUpdateCount += 1;
    }
    if (Object.keys(updates).length) {
      batch.set(entryDoc.ref, {
        ...updates,
        updatedAt: now,
        updatedBy: context.uid
      }, { merge: true });
    }
  });
  await batch.commit();
  await writeAuditLog("engagementClubPerson.nationalMerged", context.uid, {
    sourcePersonId,
    sourcePersonName: engagementClubPersonFullName(sourcePerson),
    targetPersonId,
    targetPersonName: engagementClubPersonFullName(targetPerson),
    sourceClubId: sourcePerson.clubId,
    targetClubId: targetPerson.clubId,
    clubMismatch,
    licenseMismatch,
    scannedEntryCount: entriesSnapshot.size,
    teamLeaderUpdateCount,
    officialsUpdateCount
  });
  const updatedTarget = await targetRef.get();
  const updatedSource = await sourceRef.get();
  return {
    ok: true,
    source: engagementClubPersonItem(updatedSource),
    target: engagementClubPersonItem(updatedTarget),
    scannedEntryCount: entriesSnapshot.size,
    teamLeaderUpdateCount,
    officialsUpdateCount
  };
});

async function buildEngagementClubSwimmersFromRequest(requestData = {}, context = {}, competitionData = {}) {
  const openWater = cleanEngagementCompetitionType(competitionData.competitionType) === "openWater";
  const competitionEvents = cleanEngagementCompetitionEvents(competitionData.events || [], {
    strict: false,
    competitionType: cleanEngagementCompetitionType(competitionData.competitionType)
  });
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
    const licenseNumber = cleanText(rawSwimmer?.licenseNumber).toUpperCase().slice(0, 60);
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
  const requestedLicenseIds = Array.from(new Set(uniqueSwimmers.flatMap((requestedSwimmer) => {
    const referenceSwimmer = requestedSwimmer.source === "reference"
      ? referenceSwimmersById.get(requestedSwimmer.swimmerIndexId)
      : null;
    return [requestedSwimmer.swimmerIndexId, referenceSwimmer?.id].map(cleanText).filter(Boolean);
  })));
  const licenseReads = [];
  for (let index = 0; index < requestedLicenseIds.length; index += 10) {
    licenseReads.push(db.collection("engagementSwimmerLicenses")
      .where("swimmerIndexId", "in", requestedLicenseIds.slice(index, index + 10))
      .get());
  }
  const [firestoreDocs, licenseSnapshots] = await Promise.all([
    firestoreRefs.length ? db.getAll(...firestoreRefs) : [],
    Promise.all(licenseReads)
  ]);
  const firestoreDocsByRequestedId = new Map();
  firestoreDocs.forEach((doc, index) => {
    const requestedSwimmer = firestoreSwimmers[index];
    if (!requestedSwimmer) return;
    firestoreDocsByRequestedId.set(`${requestedSwimmer.source}:${requestedSwimmer.swimmerIndexId}`, doc);
  });
  const knownLicenses = new Map();
  licenseSnapshots.flatMap((snapshot) => snapshot.docs).forEach((doc) => {
    if (cleanText(doc.data()?.clubId) !== context.clubId) return;
    const license = engagementSwimmerLicenseItem(doc);
    if (license.swimmerIndexId) knownLicenses.set(license.swimmerIndexId, license);
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
    const storedLicenseNumber = cleanText(knownLicense?.licenseNumber || swimmer.licenseNumber).toUpperCase().slice(0, 60);
    if (storedLicenseNumber && requestedSwimmer.licenseNumber && storedLicenseNumber !== requestedSwimmer.licenseNumber) {
      throw new HttpsError("failed-precondition", "Le numero de licence deja enregistre ne peut pas etre modifie par le club.");
    }
    const licenseNumber = storedLicenseNumber || requestedSwimmer.licenseNumber;
    if (ENGAGEMENT_REQUIRE_ENTRY_SWIMMER_LICENSE && !licenseNumber) {
      throw new HttpsError("invalid-argument", "Numero de licence obligatoire pour chaque nageur.");
    }
    if (licenseNumber && !ENGAGEMENT_SWIMMER_LICENSE_PATTERN.test(licenseNumber)) {
      throw new HttpsError("invalid-argument", "Chaque licence doit respecter le format A-12-34567.");
    }
    const licenseVerificationStatus = storedLicenseNumber
      ? cleanEngagementLicenseVerificationStatus(knownLicense?.verificationStatus || swimmer.licenseVerificationStatus, "pending")
      : "pending";
    const licenseSeason = storedLicenseNumber && knownLicense
      ? engagementLicenseSeasonState(knownLicense)
      : engagementLicenseSeasonState(swimmer);
    const individualEntries = openWater
      ? requestedSwimmer.individualEntries.map((entry) => ({ eventCode: entry.eventCode, status: "selected", entryTimeMode: "notRequired" }))
      : await resolveEngagementIndividualEntriesForSwimmer(
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
  if (!openWater && swimmers.some((swimmer) => swimmer.individualEntries.some((entry) => entry.entryTimeMode === "manual"))) {
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
  const competition = await db.collection("engagementCompetitions").doc(competitionId).get();
  if (!competition.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  const entryRef = db.collection("engagementClubEntries").doc(engagementClubEntryId(competitionId, context.clubId));
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

exports.getEngagementClubEntryTimeHistory = onCall(CALLABLE_OPTIONS, async (request) => {
  const startedAt = Date.now();
  const context = await engagementClubAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  const swimmerIndexId = cleanText(request.data?.swimmerIndexId).slice(0, 80);
  if (!competitionId || !swimmerIndexId) {
    throw new HttpsError("invalid-argument", "Competition et nageur requis.");
  }
  const competitionRef = db.collection("engagementCompetitions").doc(competitionId);
  const entryRef = db.collection("engagementClubEntries").doc(engagementClubEntryId(competitionId, context.clubId));
  const [competition, entry] = await db.getAll(competitionRef, entryRef);
  if (!competition.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  if (!entry.exists || !engagementTeamLeaderComplete(entry.data()?.teamLeader || {})) {
    throw new HttpsError("failed-precondition", "Chef d'equipe ou renonciation obligatoire avant les courses.");
  }
  const competitionData = competition.data() || {};
  if (cleanEngagementMissingEntryTimeMode(competitionData.missingEntryTimeMode) !== "manual") {
    throw new HttpsError("failed-precondition", "La modification des temps d'engagement n'est pas autorisee.");
  }
  const swimmer = (Array.isArray(entry.data()?.swimmers) ? entry.data().swimmers : [])
    .map(cleanEngagementEntrySwimmer)
    .find((candidate) => candidate.swimmerIndexId === swimmerIndexId);
  if (!swimmer) {
    throw new HttpsError("failed-precondition", "Nageur non engage par ce club.");
  }
  const requestedCodes = new Set((Array.isArray(request.data?.eventCodes) ? request.data.eventCodes : [])
    .map((code) => cleanText(code).toUpperCase().replace(/\s+/g, ""))
    .filter(Boolean)
    .slice(0, 30));
  const savedCodes = Array.from(new Set((swimmer.individualEntries || [])
    .map((item) => cleanText(item.eventCode).toUpperCase().replace(/\s+/g, ""))
    .filter((code) => code && (!requestedCodes.size || requestedCodes.has(code)))));
  const competitionTimeRules = {
    qualificationTimesMode: cleanEngagementQualificationTimesMode(competitionData.qualificationTimesMode),
    qualificationStartDate: cleanIsoDate(competitionData.qualificationStartDate),
    qualificationEndDate: cleanIsoDate(competitionData.qualificationEndDate)
  };
  const rows = savedCodes.length ? await getEngagementEntryTimeRowsForSwimmer(swimmer) : [];
  return {
    ok: true,
    swimmerIndexId,
    events: savedCodes.map((eventCode) => ({
      eventCode,
      times: engagementKnownTimeHistory(rows, eventCode, competitionTimeRules, 10)
    })),
    readStats: portalReadStats("getEngagementClubEntryTimeHistory", startedAt, {
      baseDocuments: savedCodes.length ? 3 : 2,
      variableDocumentsMax: savedCodes.length ? 1 : 0,
      cacheHit: null
    })
  };
});

exports.previewEngagementClubSwimmerEventTimes = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementClubAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  const swimmerIndexId = cleanText(request.data?.swimmerIndexId).slice(0, 80);
  const requestedSource = cleanText(request.data?.source);
  const source = requestedSource === "engagement"
    ? "engagement"
    : requestedSource === "reference"
      ? "reference"
      : "performances";
  if (!competitionId || !swimmerIndexId) {
    throw new HttpsError("invalid-argument", "Competition et nageur requis.");
  }

  const competitionRef = db.collection("engagementCompetitions").doc(competitionId);
  const entryRef = db.collection("engagementClubEntries").doc(engagementClubEntryId(competitionId, context.clubId));
  const [competition, entry] = await db.getAll(competitionRef, entryRef);
  if (!competition.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  if (!entry.exists || !engagementTeamLeaderComplete(entry.data()?.teamLeader || {})) {
    throw new HttpsError("failed-precondition", "Chef d'equipe ou renonciation obligatoire avant les courses.");
  }

  let swimmer = null;
  if (source === "reference") {
    const reference = intranapSwimmersIndex.find((item) => [
      item.id,
      item.swimmerId,
      ...(Array.isArray(item.aliases) ? item.aliases : []),
      ...(Array.isArray(item.sourceIds) ? item.sourceIds : [])
    ].map(cleanText).includes(swimmerIndexId));
    if (reference) swimmer = engagementReferenceSwimmerItem(reference);
  } else {
    const swimmerDoc = await db
      .collection(source === "engagement" ? "engagementClubSwimmers" : PERFORMANCE_SWIMMERS_COLLECTION)
      .doc(swimmerIndexId)
      .get();
    if (swimmerDoc.exists) {
      swimmer = source === "engagement"
        ? engagementNewSwimmerItem(swimmerDoc)
        : engagementClubSwimmerItem(swimmerDoc);
    }
  }
  if (!swimmer) throw new HttpsError("not-found", "Nageur introuvable.");
  if (swimmer.clubId !== context.clubId) {
    throw new HttpsError("permission-denied", "Nageur hors perimetre club.");
  }

  const competitionData = competition.data() || {};
  const competitionTimeRules = {
    date: cleanIsoDate(competitionData.date),
    poolLength: cleanEngagementPoolLength(competitionData.poolLength),
    timingType: cleanEngagementTimingType(competitionData.timingType),
    qualificationTimesMode: cleanEngagementQualificationTimesMode(competitionData.qualificationTimesMode),
    qualificationStartDate: cleanIsoDate(competitionData.qualificationStartDate),
    qualificationEndDate: cleanIsoDate(competitionData.qualificationEndDate),
    missingEntryTimeMode: cleanEngagementMissingEntryTimeMode(competitionData.missingEntryTimeMode)
  };
  const eventEntries = cleanEngagementCompetitionEvents(competitionData.events || [], {
    strict: false,
    competitionType: cleanEngagementCompetitionType(competitionData.competitionType)
  })
    .filter((event) => event.type === "individual")
    .map((event) => ({ eventCode: event.code }));
  const individualEntries = await resolveEngagementIndividualEntriesForSwimmer(
    { ...swimmer, swimmerIndexId: swimmer.id || swimmerIndexId, source },
    eventEntries,
    competitionTimeRules
  );
  return {
    ok: true,
    swimmerIndexId,
    individualEntries
  };
});

exports.previewEngagementClubSwimmerEventTimesBatch = onCall(CALLABLE_OPTIONS, async (request) => {
  const startedAt = Date.now();
  const context = await engagementClubAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  const swimmerIds = Array.from(new Set((Array.isArray(request.data?.swimmerIndexIds) ? request.data.swimmerIndexIds : [])
    .map((id) => cleanText(id).slice(0, 80))
    .filter(Boolean))).slice(0, 50);
  if (!competitionId || !swimmerIds.length) {
    throw new HttpsError("invalid-argument", "Competition et nageurs requis.");
  }
  const competitionRef = db.collection("engagementCompetitions").doc(competitionId);
  const entryRef = db.collection("engagementClubEntries").doc(engagementClubEntryId(competitionId, context.clubId));
  const [competition, entry] = await db.getAll(competitionRef, entryRef);
  if (!competition.exists) throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  if (!entry.exists || !engagementTeamLeaderComplete(entry.data()?.teamLeader || {})) {
    throw new HttpsError("failed-precondition", "Chef d'equipe ou renonciation obligatoire avant les courses.");
  }
  const savedById = new Map((Array.isArray(entry.data()?.swimmers) ? entry.data().swimmers : [])
    .map(cleanEngagementEntrySwimmer)
    .filter((swimmer) => swimmer.swimmerIndexId)
    .map((swimmer) => [swimmer.swimmerIndexId, swimmer]));
  const competitionData = competition.data() || {};
  if (cleanEngagementCompetitionType(competitionData.competitionType) === "openWater") {
    return {
      ok: true,
      swimmers: swimmerIds.map((swimmerIndexId) => ({ swimmerIndexId, individualEntries: [] })),
      readStats: portalReadStats("previewEngagementClubSwimmerEventTimesBatch", startedAt, {
        baseDocuments: 3,
        variableDocumentsMax: 0,
        cacheHit: true
      })
    };
  }
  const competitionTimeRules = {
    date: cleanIsoDate(competitionData.date),
    poolLength: cleanEngagementPoolLength(competitionData.poolLength),
    timingType: cleanEngagementTimingType(competitionData.timingType),
    qualificationTimesMode: cleanEngagementQualificationTimesMode(competitionData.qualificationTimesMode),
    qualificationStartDate: cleanIsoDate(competitionData.qualificationStartDate),
    qualificationEndDate: cleanIsoDate(competitionData.qualificationEndDate),
    missingEntryTimeMode: cleanEngagementMissingEntryTimeMode(competitionData.missingEntryTimeMode)
  };
  const eventEntries = cleanEngagementCompetitionEvents(competitionData.events || [], {
    strict: false,
    competitionType: cleanEngagementCompetitionType(competitionData.competitionType)
  })
    .filter((event) => event.type === "individual")
    .map((event) => ({ eventCode: event.code }));
  const swimmers = await Promise.all(swimmerIds.map(async (swimmerIndexId) => {
    const swimmer = savedById.get(swimmerIndexId);
    if (!swimmer) throw new HttpsError("failed-precondition", "Enregistrez d'abord les nageurs selectionnes.");
    const individualEntries = await resolveEngagementIndividualEntriesForSwimmer(swimmer, eventEntries, competitionTimeRules);
    return { swimmerIndexId, individualEntries };
  }));
  return {
    ok: true,
    swimmers,
    readStats: portalReadStats("previewEngagementClubSwimmerEventTimesBatch", startedAt, {
      baseDocuments: 3,
      variableDocumentsMax: swimmerIds.length,
      cacheHit: null
    })
  };
});

exports.saveEngagementClubIndividualEntries = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementClubAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }

  const competitionRef = db.collection("engagementCompetitions").doc(competitionId);
  const entryRef = db.collection("engagementClubEntries").doc(engagementClubEntryId(competitionId, context.clubId));
  const [competition, entry] = await db.getAll(competitionRef, entryRef);
  if (!competition.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  assertEngagementClubWriteOpen(competition.data() || {});
  if (!entry.exists || !engagementTeamLeaderComplete(entry.data()?.teamLeader || {})) {
    throw new HttpsError("failed-precondition", "Chef d'equipe ou renonciation obligatoire avant les courses.");
  }

  const competitionData = competition.data() || {};
  const openWater = cleanEngagementCompetitionType(competitionData.competitionType) === "openWater";
  const competitionEvents = cleanEngagementCompetitionEvents(competitionData.events || [], {
    strict: false,
    competitionType: cleanEngagementCompetitionType(competitionData.competitionType)
  });
  const allowedIndividualEventCodes = new Set(
    competitionEvents.filter((event) => event.type === "individual").map((event) => event.code)
  );
  const maxEventsPerSwimmer = cleanEngagementMaxEventsPerSwimmer(competitionData.maxEventsPerSwimmer);
  const competitionTimeRules = {
    date: cleanIsoDate(competitionData.date),
    poolLength: cleanEngagementPoolLength(competitionData.poolLength),
    timingType: cleanEngagementTimingType(competitionData.timingType),
    qualificationTimesMode: cleanEngagementQualificationTimesMode(competitionData.qualificationTimesMode),
    qualificationStartDate: cleanIsoDate(competitionData.qualificationStartDate),
    qualificationEndDate: cleanIsoDate(competitionData.qualificationEndDate),
    missingEntryTimeMode: cleanEngagementMissingEntryTimeMode(competitionData.missingEntryTimeMode)
  };
  const savedSwimmers = (Array.isArray(entry.data()?.swimmers) ? entry.data().swimmers : [])
    .map(cleanEngagementEntrySwimmer)
    .filter((swimmer) => swimmer.swimmerIndexId);
  const savedSwimmersById = new Map(savedSwimmers.map((swimmer) => [swimmer.swimmerIndexId, swimmer]));
  const requestedChanges = Array.isArray(request.data?.swimmers) ? request.data.swimmers.slice(0, 100) : [];
  const seen = new Set();

  let changedSwimmers = await Promise.all(requestedChanges.map(async (rawSwimmer) => {
    const swimmerIndexId = cleanText(rawSwimmer?.swimmerIndexId).slice(0, 80);
    if (!swimmerIndexId || seen.has(swimmerIndexId)) {
      throw new HttpsError("invalid-argument", "Nageur modifie invalide ou duplique.");
    }
    seen.add(swimmerIndexId);
    const savedSwimmer = savedSwimmersById.get(swimmerIndexId);
    if (!savedSwimmer) {
      throw new HttpsError("failed-precondition", "Enregistrez d'abord les nageurs selectionnes avant leurs courses.");
    }
    const rawEntries = Array.isArray(rawSwimmer?.individualEntries)
      ? rawSwimmer.individualEntries
      : Array.isArray(rawSwimmer?.individualEventCodes)
        ? rawSwimmer.individualEventCodes
        : [];
    const requestedCodes = rawEntries
      .map((rawEntry) => cleanText(rawEntry?.eventCode || rawEntry?.code || rawEntry).toUpperCase().replace(/\s+/g, ""))
      .filter(Boolean);
    if (requestedCodes.some((code) => !allowedIndividualEventCodes.has(code))) {
      throw new HttpsError("invalid-argument", "Course individuelle non ouverte sur cette competition.");
    }
    const individualEntries = cleanEngagementEntryIndividualEntries(rawEntries, allowedIndividualEventCodes);
    if (maxEventsPerSwimmer > 0 && individualEntries.length > maxEventsPerSwimmer) {
      throw new HttpsError("failed-precondition", `Maximum ${maxEventsPerSwimmer} course(s) individuelle(s) par nageur.`);
    }
    const resolvedEntries = openWater
      ? individualEntries.map((entry) => ({ eventCode: entry.eventCode, status: "selected", entryTimeMode: "notRequired" }))
      : await resolveEngagementIndividualEntriesForSwimmer(savedSwimmer, individualEntries, competitionTimeRules);
    return cleanEngagementEntrySwimmer({
      ...savedSwimmer,
      individualEntries: resolvedEntries
    });
  }));

  if (!openWater && changedSwimmers.some((swimmer) => swimmer.individualEntries.some((entryItem) => entryItem.entryTimeMode === "manual"))) {
    const recordsData = await loadPerformanceRecordsData();
    changedSwimmers = validateEngagementIndividualEntryTimes(changedSwimmers, competitionTimeRules, recordsData);
  }
  const changedById = new Map(changedSwimmers.map((swimmer) => [swimmer.swimmerIndexId, swimmer]));
  const now = new Date().toISOString();
  let updatedEntryData = entry.data() || {};
  if (changedSwimmers.length) {
    await db.runTransaction(async (transaction) => {
      const latestEntry = await transaction.get(entryRef);
      if (!latestEntry.exists || !engagementTeamLeaderComplete(latestEntry.data()?.teamLeader || {})) {
        throw new HttpsError("failed-precondition", "Chef d'equipe ou renonciation obligatoire avant les courses.");
      }
      const latestSwimmers = (Array.isArray(latestEntry.data()?.swimmers) ? latestEntry.data().swimmers : [])
        .map(cleanEngagementEntrySwimmer)
        .filter((swimmer) => swimmer.swimmerIndexId);
      const latestIds = new Set(latestSwimmers.map((swimmer) => swimmer.swimmerIndexId));
      const missingSwimmer = changedSwimmers.find((swimmer) => !latestIds.has(swimmer.swimmerIndexId));
      if (missingSwimmer) {
        throw new HttpsError("failed-precondition", "Un nageur modifie n'est plus selectionne dans cette competition. Rechargez la fiche.");
      }
      const swimmers = latestSwimmers.map((swimmer) => changedById.get(swimmer.swimmerIndexId) || swimmer);
      updatedEntryData = {
        ...(latestEntry.data() || {}),
        swimmers,
        updatedAt: now,
        updatedBy: context.uid
      };
      transaction.set(entryRef, {
        swimmers,
        updatedAt: now,
        updatedBy: context.uid
      }, { merge: true });
    });
    await writeAuditLog("engagementClubEntry.individualEntriesSaved", context.uid, {
      competitionId,
      clubId: context.clubId,
      changedSwimmerCount: changedSwimmers.length,
      individualEntryCount: changedSwimmers.reduce((sum, swimmer) => sum + swimmer.individualEntries.length, 0)
    });
  }
  return {
    ok: true,
    changedSwimmerCount: changedSwimmers.length,
    entry: engagementClubEntryItem({
      id: entryRef.id,
      exists: true,
      data: () => updatedEntryData
    })
  };
});

exports.saveEngagementClubSwimmerSelection = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementClubAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  const swimmerIndexId = cleanText(request.data?.swimmer?.swimmerIndexId || request.data?.swimmerIndexId).slice(0, 80);
  const selected = request.data?.selected === true;
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }
  if (!swimmerIndexId) {
    throw new HttpsError("invalid-argument", "Nageur requis.");
  }

  const competitionRef = db.collection("engagementCompetitions").doc(competitionId);
  const entryRef = db.collection("engagementClubEntries").doc(engagementClubEntryId(competitionId, context.clubId));
  const competition = await competitionRef.get();
  if (!competition.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  assertEngagementClubWriteOpen(competition.data() || {});

  let validatedSwimmer = null;
  if (selected) {
    const swimmers = await buildEngagementClubSwimmersFromRequest({ swimmers: [request.data?.swimmer || {}] }, context, competition.data() || {});
    validatedSwimmer = swimmers[0] || null;
    if (!validatedSwimmer || validatedSwimmer.swimmerIndexId !== swimmerIndexId) {
      throw new HttpsError("invalid-argument", "Nageur invalide.");
    }
  }

  const now = new Date().toISOString();
  let changed = false;
  let updatedEntryData = null;
  await db.runTransaction(async (transaction) => {
    const entry = await transaction.get(entryRef);
    if (!entry.exists || !engagementTeamLeaderComplete(entry.data()?.teamLeader || {})) {
      throw new HttpsError("failed-precondition", "Chef d'equipe ou renonciation obligatoire avant les nageurs.");
    }
    if (selected && validatedSwimmer) assertEngagementSwimmerRoleCompatibility(entry.data() || {}, [validatedSwimmer]);
    const savedSwimmers = (Array.isArray(entry.data()?.swimmers) ? entry.data().swimmers : [])
      .map(cleanEngagementEntrySwimmer)
      .filter((swimmer) => swimmer.swimmerIndexId);
    const alreadySelected = savedSwimmers.some((swimmer) => swimmer.swimmerIndexId === swimmerIndexId);
    const swimmers = selected
      ? (alreadySelected ? savedSwimmers : [...savedSwimmers, validatedSwimmer])
      : savedSwimmers.filter((swimmer) => swimmer.swimmerIndexId !== swimmerIndexId);
    changed = selected !== alreadySelected;
    updatedEntryData = {
      ...(entry.data() || {}),
      swimmers,
      updatedAt: changed ? now : cleanText(entry.data()?.updatedAt),
      updatedBy: changed ? context.uid : cleanText(entry.data()?.updatedBy)
    };
    if (!changed) return;
    transaction.set(entryRef, {
      swimmers,
      updatedAt: now,
      updatedBy: context.uid
    }, { merge: true });
    if (!selected || !validatedSwimmer) return;
    if (validatedSwimmer.licenseNumber && !validatedSwimmer.licenseLocked && validatedSwimmer.source !== "reference") {
      const swimmerCollection = validatedSwimmer.source === "engagement" ? "engagementClubSwimmers" : PERFORMANCE_SWIMMERS_COLLECTION;
      transaction.set(db.collection(swimmerCollection).doc(validatedSwimmer.swimmerIndexId), {
        licenseNumber: cleanText(validatedSwimmer.licenseNumber).slice(0, 60),
        licenseVerificationStatus: cleanEngagementLicenseVerificationStatus(validatedSwimmer.licenseVerificationStatus, "pending"),
        licenseSeasonLabel: cleanText(validatedSwimmer.licenseSeasonLabel).slice(0, 20),
        licenseSeasonStatus: cleanEngagementLicenseSeasonStatus(validatedSwimmer.licenseSeasonStatus, "to_check"),
        licenseUpdatedAt: now,
        licenseUpdatedBy: context.uid,
        updatedAt: now,
        updatedBy: context.uid
      }, { merge: true });
    }
    if (validatedSwimmer.licenseNumber && !validatedSwimmer.licenseLocked) {
      const licenseRef = db.collection("engagementSwimmerLicenses").doc(engagementSwimmerLicenseId(validatedSwimmer));
      transaction.set(licenseRef, {
        ...engagementSwimmerLicensePayload(validatedSwimmer, context, {
          type: "engagement",
          verificationSource: "club",
          competitionId,
          collectedAt: now
        }),
        updatedAt: now,
        updatedBy: context.uid
      }, { merge: true });
    }
    upsertEngagementClubRosterSwimmer(transaction, db, validatedSwimmer, now);
  });

  if (changed) {
    await writeAuditLog(selected ? "engagementClubEntry.swimmerAdded" : "engagementClubEntry.swimmerRemoved", context.uid, {
      competitionId,
      clubId: context.clubId,
      swimmerIndexId
    });
  }
  return {
    ok: true,
    changed,
    selected,
    entry: engagementClubEntryItem({
      id: entryRef.id,
      exists: true,
      data: () => updatedEntryData || {}
    })
  };
});

exports.saveEngagementClubSwimmerSelections = onCall(CALLABLE_OPTIONS, async (request) => {
  const startedAt = Date.now();
  const context = await engagementClubAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  const rawChanges = Array.isArray(request.data?.changes) ? request.data.changes.slice(0, 50) : [];
  if (!competitionId || !rawChanges.length) {
    throw new HttpsError("invalid-argument", "Competition et modifications requises.");
  }
  const changes = [];
  const seen = new Set();
  rawChanges.forEach((rawChange) => {
    const swimmerIndexId = cleanText(rawChange?.swimmer?.swimmerIndexId || rawChange?.swimmerIndexId).slice(0, 80);
    if (!swimmerIndexId || seen.has(swimmerIndexId)) {
      throw new HttpsError("invalid-argument", "Modification de nageur invalide ou dupliquee.");
    }
    seen.add(swimmerIndexId);
    changes.push({
      swimmerIndexId,
      selected: rawChange?.selected === true,
      swimmer: rawChange?.swimmer || {}
    });
  });

  const competitionRef = db.collection("engagementCompetitions").doc(competitionId);
  const entryRef = db.collection("engagementClubEntries").doc(engagementClubEntryId(competitionId, context.clubId));
  const competition = await competitionRef.get();
  if (!competition.exists) throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  assertEngagementClubWriteOpen(competition.data() || {});

  const selectedChanges = changes.filter((change) => change.selected);
  const validatedSwimmers = selectedChanges.length
    ? await buildEngagementClubSwimmersFromRequest({ swimmers: selectedChanges.map((change) => change.swimmer) }, context, competition.data() || {})
    : [];
  const validatedById = new Map(validatedSwimmers.map((swimmer) => [swimmer.swimmerIndexId, swimmer]));
  selectedChanges.forEach((change) => {
    if (!validatedById.has(change.swimmerIndexId)) throw new HttpsError("invalid-argument", "Nageur invalide.");
  });

  const now = new Date().toISOString();
  let changedCount = 0;
  let updatedEntryData = null;
  await db.runTransaction(async (transaction) => {
    const entry = await transaction.get(entryRef);
    if (!entry.exists || !engagementTeamLeaderComplete(entry.data()?.teamLeader || {})) {
      throw new HttpsError("failed-precondition", "Chef d'equipe ou renonciation obligatoire avant les nageurs.");
    }
    assertEngagementSwimmerRoleCompatibility(entry.data() || {}, validatedSwimmers);
    const savedSwimmers = (Array.isArray(entry.data()?.swimmers) ? entry.data().swimmers : [])
      .map(cleanEngagementEntrySwimmer)
      .filter((swimmer) => swimmer.swimmerIndexId);
    const swimmersById = new Map(savedSwimmers.map((swimmer) => [swimmer.swimmerIndexId, swimmer]));
    changes.forEach((change) => {
      const existed = swimmersById.has(change.swimmerIndexId);
      if (change.selected) {
        if (!existed) {
          swimmersById.set(change.swimmerIndexId, validatedById.get(change.swimmerIndexId));
          changedCount += 1;
        }
      } else if (existed) {
        swimmersById.delete(change.swimmerIndexId);
        changedCount += 1;
      }
    });
    const swimmers = Array.from(swimmersById.values());
    updatedEntryData = {
      ...(entry.data() || {}),
      swimmers,
      updatedAt: changedCount ? now : cleanText(entry.data()?.updatedAt),
      updatedBy: changedCount ? context.uid : cleanText(entry.data()?.updatedBy)
    };
    if (!changedCount) return;
    transaction.set(entryRef, { swimmers, updatedAt: now, updatedBy: context.uid }, { merge: true });
    validatedSwimmers.forEach((swimmer) => {
      if (!swimmer.licenseNumber || swimmer.licenseLocked) return;
      if (swimmer.source !== "reference") {
        const swimmerCollection = swimmer.source === "engagement" ? "engagementClubSwimmers" : PERFORMANCE_SWIMMERS_COLLECTION;
        transaction.set(db.collection(swimmerCollection).doc(swimmer.swimmerIndexId), {
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
      transaction.set(db.collection("engagementSwimmerLicenses").doc(engagementSwimmerLicenseId(swimmer)), {
        ...engagementSwimmerLicensePayload(swimmer, context, {
          type: "engagement",
          verificationSource: "club",
          competitionId,
          collectedAt: now
        }),
        updatedAt: now,
        updatedBy: context.uid
      }, { merge: true });
      upsertEngagementClubRosterSwimmer(transaction, db, swimmer, now);
    });
  });
  if (changedCount) {
    await writeAuditLog("engagementClubEntry.swimmerSelectionsSaved", context.uid, {
      competitionId,
      clubId: context.clubId,
      requestedChangeCount: changes.length,
      changedCount
    });
  }
  return {
    ok: true,
    requestedChangeCount: changes.length,
    changedCount,
    readStats: portalReadStats("saveEngagementClubSwimmerSelections", startedAt, {
      baseDocuments: 3,
      variableDocumentsMax: selectedChanges.length * 3,
      cacheHit: null
    }),
    entry: engagementClubEntryItem({ id: entryRef.id, exists: true, data: () => updatedEntryData || {} })
  };
});

exports.saveEngagementClubSwimmers = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementClubAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }
  const competition = await db.collection("engagementCompetitions").doc(competitionId).get();
  if (!competition.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  assertEngagementClubWriteOpen(competition.data() || {});
  const entryRef = db.collection("engagementClubEntries").doc(engagementClubEntryId(competitionId, context.clubId));
  const entry = await entryRef.get();
  if (!entry.exists || !engagementTeamLeaderComplete(entry.data()?.teamLeader || {})) {
    throw new HttpsError("failed-precondition", "Chef d'equipe ou renonciation obligatoire avant les nageurs.");
  }

  const competitionData = competition.data() || {};
  const swimmers = await buildEngagementClubSwimmersFromRequest(request.data || {}, context, competitionData);
  assertEngagementSwimmerRoleCompatibility(entry.data() || {}, swimmers);

  const now = new Date().toISOString();
  const batch = db.batch();
  batch.set(entryRef, {
    swimmers,
    updatedAt: now,
    updatedBy: context.uid
  }, { merge: true });
  swimmers.forEach((swimmer) => {
    if (!swimmer.licenseNumber) return;
    if (!swimmer.licenseLocked && swimmer.source !== "reference") {
      const swimmerCollection = swimmer.source === "engagement" ? "engagementClubSwimmers" : PERFORMANCE_SWIMMERS_COLLECTION;
      const swimmerRef = db.collection(swimmerCollection).doc(swimmer.swimmerIndexId);
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
      const licenseRef = db.collection("engagementSwimmerLicenses").doc(engagementSwimmerLicenseId(swimmer));
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
    upsertEngagementClubRosterSwimmer(batch, db, swimmer, now);
  });
  await batch.commit();
  await writeAuditLog("engagementClubEntry.swimmersSaved", context.uid, {
    competitionId,
    clubId: context.clubId,
    swimmerCount: swimmers.length
  });
  const updatedEntryData = {
    ...(entry.data() || {}),
    swimmers,
    updatedAt: now,
    updatedBy: context.uid
  };
  return {
    ok: true,
    entry: engagementClubEntryItem({
      id: entryRef.id,
      exists: true,
      data: () => updatedEntryData
    })
  };
});

exports.saveEngagementClubRelays = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementClubAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }
  const competition = await db.collection("engagementCompetitions").doc(competitionId).get();
  if (!competition.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  assertEngagementClubWriteOpen(competition.data() || {});
  const entryRef = db.collection("engagementClubEntries").doc(engagementClubEntryId(competitionId, context.clubId));
  const entry = await entryRef.get();
  if (!entry.exists || !engagementTeamLeaderComplete(entry.data()?.teamLeader || {})) {
    throw new HttpsError("failed-precondition", "Chef d'equipe ou renonciation obligatoire avant les relais.");
  }
  const entryData = entry.data() || {};
  const swimmers = (Array.isArray(entryData.swimmers) ? entryData.swimmers : [])
    .map(cleanEngagementEntrySwimmer)
    .filter((swimmer) => swimmer.swimmerIndexId);
  const competitionData = competition.data() || {};
  const events = cleanEngagementCompetitionEvents(competitionData.events || [], {
    strict: false,
    competitionType: cleanEngagementCompetitionType(competitionData.competitionType)
  });
  let relays = cleanEngagementEntryRelays(request.data?.relays || [], {
    date: cleanIsoDate(competitionData.date),
    competitionType: cleanEngagementCompetitionType(competitionData.competitionType),
    events
  }, swimmers);
  if (relays.length && cleanEngagementCompetitionType(competitionData.competitionType) !== "openWater") {
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
  const updatedData = { ...entryData, relays, updatedAt: now, updatedBy: context.uid };
  return {
    ok: true,
    entry: engagementClubEntryItem({ id: entryRef.id, exists: true, data: () => updatedData })
  };
});

exports.createEngagementCompetition = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  if (!ENGAGEMENT_COMPETITION_TYPES.has(cleanText(request.data?.competitionType))) {
    throw new HttpsError("invalid-argument", "Choisissez le type de competition : piscine ou eau libre.");
  }
  const competition = cleanEngagementCompetitionPayload({
    ...(request.data || {}),
    entryStatus: "upcoming",
    entryDeadlineAt: ""
  }, context);
  const now = new Date().toISOString();
  const docRef = db.collection("engagementCompetitions").doc();
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
  const docRef = db.collection("engagementCompetitions").doc(competitionId);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  assertCanManageEngagementCompetition(context, snapshot.data() || {});
  const competition = cleanEngagementCompetitionPayload(request.data || {}, context);
  const storedCompetitionType = cleanEngagementCompetitionType(snapshot.data()?.competitionType);
  if (competition.competitionType !== storedCompetitionType) {
    throw new HttpsError("failed-precondition", "Le type de competition ne peut pas etre modifie apres sa creation.");
  }
  if (storedCompetitionType === "openWater" && Array.isArray(competition.events)) {
    const courseSnapshot = await engagementOpenWaterCourseConfigRef().get();
    const configuredCourses = cleanEngagementOpenWaterCourses(courseSnapshot.exists ? courseSnapshot.data()?.courses : []);
    const existingCourseIds = new Set(cleanEngagementCompetitionEvents(snapshot.data()?.events || [], {
      strict: false,
      competitionType: "openWater"
    }).map((event) => event.openWaterCourseId).filter(Boolean));
    const selectableCourseIds = new Set(configuredCourses
      .filter((course) => course.active !== false || existingCourseIds.has(course.id))
      .map((course) => course.id));
    const unknownCourse = competition.events.find((event) =>
      event.type === "individual" && !selectableCourseIds.has(event.openWaterCourseId)
    );
    if (unknownCourse) {
      throw new HttpsError("failed-precondition", "Une course eau libre n'est pas disponible dans la bibliotheque nationale.");
    }
  }
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
    competition: engagementCompetitionDetailItem(updated, { includeDocumentUploader: true })
  };
});

exports.deleteEngagementCompetition = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }

  const docRef = db.collection("engagementCompetitions").doc(competitionId);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }

  const competition = snapshot.data() || {};
  if (!context.national) {
    assertCanManageEngagementCompetition(context, competition);
    if (cleanEngagementEntryStatus(competition.entryStatus || competition.status) !== "upcoming") {
      throw new HttpsError("failed-precondition", "Seule une competition a venir peut etre retiree du calendrier par la region.");
    }
    const entriesSnapshot = await db.collection("engagementClubEntries")
      .where("competitionId", "==", competitionId)
      .limit(1)
      .get();
    if (!entriesSnapshot.empty) {
      throw new HttpsError("failed-precondition", "Impossible de retirer cette competition : au moins un club a deja commence ses engagements.");
    }
  }
  const now = new Date().toISOString();
  const deletionRequestRef = db.collection("engagementCompetitionDeletionRequests").doc(competitionId);
  const deletionRequest = await deletionRequestRef.get();
  const batch = db.batch();
  batch.delete(docRef);
  const competitionDate = cleanIsoDate(competition.date);
  const seasonEndYear = competitionDate ? engagementSeasonEndYearFromIsoDate(competitionDate) : null;
  if (seasonEndYear !== null) {
    const season = engagementSeasonBoundsFromEndYear(seasonEndYear);
    batch.set(engagementCompetitionCalendarRef(db, seasonEndYear), {
      ...season,
      generatedAt: now,
      updatedAt: now,
      competitions: {
        [competitionId]: FieldValue.delete()
      }
    }, { merge: true });
  }
  batch.delete(engagementClosureQueueRef(db, competitionId));
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
  const competitionDocuments = cleanCompetitionDocuments(competition.clubDocuments || [], { includeUploader: true });
  const documentDeletionResults = await Promise.allSettled(competitionDocuments.filter(hasManagedEngagementCompetitionDocumentStorage).map((document) =>
    storage.bucket(LIVEPALMES_STORAGE_BUCKET)
      .file(assertEngagementCompetitionDocumentPath(document.storagePath))
      .delete({ ignoreNotFound: true })
  ));
  await writeAuditLog("engagementCompetition.deleted", context.uid, {
    competitionId,
    name: competition.name || "",
    date: competition.date || "",
    regionId: competition.regionId || "",
    level: competition.level || "",
    competitionDocumentCount: competitionDocuments.length,
    competitionDocumentDeleteErrorCount: documentDeletionResults.filter((result) => result.status === "rejected").length
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
  const snapshot = await db
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
  const existing = await db.collection("performanceImports").doc(importId).get();
  const existingData = existing.exists ? existing.data() || {} : {};
  const publicationStatus = importPublicationStatus(existingData);
  const recordAlerts = detectRecordAlerts(parsed.performances, await loadPerformanceRecordsData());
  return {
    ok: true,
    importId,
    alreadyImported: existing.exists && existingData.status !== "deleted",
    publicationStatus: publicationStatus || (existing.exists ? "published" : ""),
    canResumePublication: existing.exists && canResumeImportPublication(existingData),
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

function competitionImportPublicSnapshotSummary(snapshot = {}) {
  return cleanFirestoreValue({
    ok: snapshot.ok === true,
    path: cleanText(snapshot.path),
    generatedAt: cleanText(snapshot.generatedAt),
    importCount: Number(snapshot.importCount || 0) || 0,
    performanceCount: Number(snapshot.performanceCount || 0) || 0,
    rowCount: Number(snapshot.rowCount || 0) || 0,
    affectedSwimmers: Number(snapshot.affectedSwimmers || 0) || 0,
    affectedTopBuckets: Number(snapshot.affectedTopBuckets || 0) || 0,
    writtenFiles: Number(snapshot.writtenFiles || 0) || 0,
    error: cleanText(snapshot.error).slice(0, 500)
  });
}

async function publishCompetitionImportOutputs(normalizedPerformances = [], importRef, context = {}) {
  const importId = cleanText(context.importId || importRef?.id);
  const startedAt = new Date().toISOString();
  await importRef.set({
    publicationStatus: "publishing",
    publicationStartedAt: startedAt,
    publicationUpdatedAt: startedAt,
    publicationError: ""
  }, { merge: true });

  let publicSnapshot = null;
  try {
    publicSnapshot = await publishIncrementalPerformanceImport(normalizedPerformances, importId);
  } catch (error) {
    console.warn("Publication publique des performances LivePalmes impossible", error);
    publicSnapshot = {
      ok: false,
      error: error?.message || String(error)
    };
  }

  let publicFilesSnapshot = null;
  try {
    publicFilesSnapshot = await publishIncrementalPublicPerformanceFiles(normalizedPerformances, {
      importId,
      now: context.now || startedAt
    });
    await invalidateEngagementEntryTimeCachesForPerformanceRows(normalizedPerformances);
  } catch (error) {
    console.warn("Publication publique incrementale des fichiers performances impossible", error);
    publicFilesSnapshot = {
      ok: false,
      error: error?.message || String(error)
    };
  }

  const publicationStatus = importPublicationResultStatus(publicSnapshot, publicFilesSnapshot);
  const completedAt = new Date().toISOString();
  await importRef.set({
    publicationStatus,
    publicationCompletedAt: publicationStatus === "published" ? completedAt : "",
    publicationUpdatedAt: completedAt,
    publicationError: importPublicationError(publicSnapshot, publicFilesSnapshot),
    publicSnapshot: competitionImportPublicSnapshotSummary(publicSnapshot),
    publicFilesSnapshot: competitionImportPublicSnapshotSummary(publicFilesSnapshot)
  }, { merge: true });

  return {
    publicationStatus,
    publicSnapshot,
    publicFilesSnapshot
  };
}

exports.createCompetitionImport = onCall(COMPETITION_IMPORT_CALLABLE_OPTIONS, async (request) => {
  assertCapability(request, "competitions.import");
  const fileName = cleanText(request.data?.fileName).slice(0, 180);
  const confirmImportId = cleanText(request.data?.importId);
  const parsed = parseCompetitionImportPayload(request.data || {});
  if (!cleanTimingType(parsed.metadata?.timingType)) {
    throw new HttpsError("failed-precondition", "Le type de chronometrage electronique ou manuel est obligatoire.");
  }
  if (!parsed.performances.length) {
    throw new HttpsError("failed-precondition", "Aucune performance importable dans ce fichier.");
  }
  const fileHash = stableHash(parsed.fileHashSeed || "");
  const importId = importDocumentId(parsed.metadata, fileHash);
  const recordAlerts = detectRecordAlerts(parsed.performances, await loadPerformanceRecordsData());
  if (confirmImportId && confirmImportId !== importId) {
    throw new HttpsError("invalid-argument", "Le fichier ne correspond plus a la previsualisation.");
  }

  const importRef = db.collection("performanceImports").doc(importId);
  const existing = await importRef.get();
  const existingData = existing.exists ? existing.data() || {} : {};
  if (existing.exists && existingData.status !== "deleted" && request.data?.overwrite !== true) {
    throw new HttpsError("already-exists", "Cette competition semble deja importee.");
  }

  const now = new Date().toISOString();
  const actorUid = request.auth.uid;
  const actorEmail = request.auth.token?.email || "";
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
    timingType: parsed.metadata.timingType,
    chrono: parsed.metadata.chrono,
    metadata: parsed.metadata,
    summary: parsed.summary,
    warnings: parsed.warnings,
    recordAlerts: recordAlerts.slice(0, 100),
    recordAlertCount: recordAlerts.length,
    duplicateDetails: parsed.duplicateDetails.slice(0, 50),
    importedBy: actorUid,
    importedByEmail: actorEmail,
    importedAt: now,
    updatedAt: now,
    publicationStatus: "pending",
    publicationUpdatedAt: now,
    publicationError: ""
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

  let clubActivityReactivation = null;
  try {
    clubActivityReactivation = await reactivateEngagementClubRosterSwimmersFromPerformanceRows(normalizedImportedPerformances, {
      now,
      actorUid
    });
  } catch (error) {
    console.warn("Réactivation des nageurs de club impossible après import", {
      importId,
      message: error?.message || String(error)
    });
    clubActivityReactivation = { ok: false, error: error?.message || String(error) };
  }

  await writeAuditLog("performanceImport.created", actorUid, {
    importId,
    fileName,
    fileHash,
    competitionName: parsed.metadata.competitionName,
    date: parsed.metadata.date,
    timingType: parsed.metadata.timingType,
    chrono: parsed.metadata.chrono,
    importedPerformances: parsed.summary.importedPerformances,
    performanceBaseSync,
    clubActivityReactivation
  });

  const publication = await publishCompetitionImportOutputs(normalizedImportedPerformances, importRef, {
    importId,
    now
  });

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
    clubActivityReactivation,
    publicationStatus: publication.publicationStatus,
    publicSnapshot: publication.publicSnapshot,
    publicFilesSnapshot: publication.publicFilesSnapshot
  };
});

exports.resumeCompetitionImportPublication = onCall(COMPETITION_IMPORT_CALLABLE_OPTIONS, async (request) => {
  assertCapability(request, "competitions.import");
  const importId = cleanText(request.data?.importId).slice(0, 160);
  if (!importId) {
    throw new HttpsError("invalid-argument", "Import inconnu.");
  }

  const importRef = db.collection("performanceImports").doc(importId);
  const claimedAt = new Date().toISOString();
  let importData = {};
  await db.runTransaction(async (transaction) => {
    const importSnapshot = await transaction.get(importRef);
    if (!importSnapshot.exists) {
      throw new HttpsError("not-found", "Import introuvable.");
    }
    importData = importSnapshot.data() || {};
    if (!canResumeImportPublication(importData, Date.parse(claimedAt))) {
      throw new HttpsError("failed-precondition", "Cet import ne necessite pas de reprise de publication.");
    }
    transaction.set(importRef, {
      publicationStatus: "publishing",
      publicationStartedAt: claimedAt,
      publicationUpdatedAt: claimedAt,
      publicationError: ""
    }, { merge: true });
  });

  let rawSnapshot = null;
  let normalizedPerformances = [];
  try {
    const expectedCount = Number(importData.performanceBaseCount || importData.summary?.importedPerformances || 0) || 0;
    if (!expectedCount || expectedCount > MAX_COMPETITION_IMPORT_PERFORMANCES) {
      throw new HttpsError("failed-precondition", "Volume de l'import incompatible avec la reprise automatique.");
    }
    rawSnapshot = await importRef.collection("performances").limit(expectedCount + 1).get();
    if (rawSnapshot.size !== expectedCount) {
      throw new HttpsError(
        "failed-precondition",
        `Import incomplet : ${rawSnapshot.size} performance(s) stockee(s) sur ${expectedCount} attendue(s).`
      );
    }

    const rawPerformances = rawSnapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() || {}) }));
    normalizedPerformances = normalizeLivePalmesImportPerformances(rawPerformances);
    if (normalizedPerformances.length !== expectedCount) {
      throw new HttpsError(
        "failed-precondition",
        `Reprise incomplete : ${normalizedPerformances.length} performance(s) normalisee(s) sur ${expectedCount} attendue(s).`
      );
    }
  } catch (error) {
    const failedAt = new Date().toISOString();
    await importRef.set({
      publicationStatus: "failed",
      publicationUpdatedAt: failedAt,
      publicationError: cleanText(error?.message || error).slice(0, 500)
    }, { merge: true });
    throw error;
  }

  const now = new Date().toISOString();
  const actorUid = request.auth.uid;
  const actorEmail = request.auth.token?.email || "";
  const publication = await publishCompetitionImportOutputs(normalizedPerformances, importRef, {
    importId,
    now
  });
  await writeAuditLog("performanceImport.publicationResumed", actorUid, {
    importId,
    actorEmail,
    performanceCount: normalizedPerformances.length,
    publicationStatus: publication.publicationStatus,
    publicSnapshot: competitionImportPublicSnapshotSummary(publication.publicSnapshot),
    publicFilesSnapshot: competitionImportPublicSnapshotSummary(publication.publicFilesSnapshot)
  });

  return {
    ok: publication.publicationStatus === "published",
    importId,
    performanceCount: normalizedPerformances.length,
    publicationStatus: publication.publicationStatus,
    publicSnapshot: publication.publicSnapshot,
    publicFilesSnapshot: publication.publicFilesSnapshot,
    readStats: {
      importDocuments: 1,
      performanceDocuments: rawSnapshot?.size || 0,
      maximumPerformanceDocuments: MAX_COMPETITION_IMPORT_PERFORMANCES,
      maximumPerformanceDocumentReads: MAX_COMPETITION_IMPORT_PERFORMANCES + 1
    }
  };
});

exports.listCompetitionImports = onCall(CALLABLE_OPTIONS, async (request) => {
  assertCapability(request, "competitions.import");
  const snapshot = await db
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
        publicationStatus: importPublicationStatus(data) || (data.status === "stored" ? "published" : ""),
        publicationUpdatedAt: data.publicationUpdatedAt || "",
        publicationError: data.publicationError || "",
        canResumePublication: canResumeImportPublication(data),
        importedByEmail: data.importedByEmail || "",
        importedAt: data.importedAt || ""
      };
    })
  };
});

async function markCompetitionImportDeleted(importId, context = {}) {
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

  const publishedSnapshot = await readPublishedAdditionalPerformanceDataSnapshot();
  const affectedRows = (publishedSnapshot.performances || [])
    .filter((row) => cleanText(row.importId) === importId)
    .map(publicPerformanceBaseRow);
  const expectedPerformanceCount = Number(importData.performanceBaseCount || importData.summary?.importedPerformances || 0) || 0;
  if (expectedPerformanceCount && affectedRows.length < expectedPerformanceCount) {
    throw new HttpsError(
      "failed-precondition",
      "Fichier public incomplet pour cet import. Republie les donnees avant de supprimer l'import."
    );
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

  affectedRows.forEach((row) => {
    const performanceId = cleanText(row.id || row.performanceId);
    if (!performanceId) return;
    batch.set(importRef.collection("performances").doc(performanceId), {
      active: false,
      status: "deleted",
      deletedAt: now,
      deletedBy: context.actorUid || "",
      updatedAt: now
    }, { merge: true });
    batchSize += 1;
    commitIfNeeded();
  });

  const performanceBaseIds = new Set();
  affectedRows.forEach((data) => {
    const performanceBaseId = cleanText(data.performanceBaseId || performanceBaseDocId(data));
    if (!performanceBaseId || performanceBaseIds.has(performanceBaseId)) return;
    performanceBaseIds.add(performanceBaseId);
    batch.set(db.collection(PERFORMANCE_BASE_COLLECTION).doc(performanceBaseId), {
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
    const changeId = stableHash([performanceBaseId, "performanceImport.deleted", now, importId].join("|")).slice(0, 40);
    batch.set(db.collection(PERFORMANCE_BASE_CHANGES_COLLECTION).doc(changeId), {
      performanceBaseId,
      publicKey: cleanText(data.publicKey),
      action: "performanceImport.deleted",
      importId,
      status: "deleted",
      row: cleanFirestoreValue({
        ...data,
        performanceBaseId,
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
  await invalidateEngagementEntryTimeCachesForPerformanceRows(affectedRows);
  return {
    ok: true,
    importId,
    importPerformanceCount: affectedRows.length,
    performanceBaseCount: performanceBaseIds.size,
    affectedRows,
    publishedSnapshot
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
  if (result.alreadyDeleted) return result;
  await touchDtnQualificationCacheState(result.affectedRows || [], {
    action: "performanceImport.deleted",
    now
  });

  let publicSnapshot = null;
  try {
    publicSnapshot = await saveAdditionalPerformanceDataSnapshot({
      ...(result.publishedSnapshot || {}),
      performances: (result.publishedSnapshot?.performances || [])
        .filter((row) => cleanText(row.importId) !== importId)
    });
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
    const deactivatedRows = deactivatedImportPerformanceRows(result.affectedRows);
    publicFilesSnapshot = await rebuildPublicPerformanceFilesForAffectedRows(deactivatedRows, {
      now,
      reason: "performanceImport.deleted",
      importId
    });
    await invalidateEngagementEntryTimeCachesForPerformanceRows(result.affectedRows || []);
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

  const { affectedRows, publishedSnapshot, ...publicResult } = result;
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

  const importRef = db.collection("performanceImports").doc(importId);
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
        timingType: cleanTimingType(perf.timingType || perf.metadata?.timingType),
        chrono: performanceImportChrono(perf),
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
  await invalidateEngagementEntryTimeCachesForPerformanceRows(rows);
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
  const snapshot = await db.collection(PERFORMANCE_TOP_BUCKETS_COLLECTION).doc(bucketId).get();
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
  return db.collection(DTN_QUALIFICATION_CACHE_STATE_COLLECTION).doc(String(seasonYear));
}

function dtnQualificationCacheRef(seasonYear, sex) {
  return db.collection(DTN_QUALIFICATION_CACHE_COLLECTION).doc(`${seasonYear}-${sex}`);
}

function dtnListingCacheRef(seasonYear) {
  return db.collection(DTN_QUALIFICATION_CACHE_COLLECTION).doc(`${seasonYear}-listing`);
}

function dtnQualificationSeasonsForRows(rows = []) {
  const seasons = new Set();
  rows.forEach((inputRow) => {
    const row = inputRow && typeof inputRow === "object" ? inputRow : {};
    const seasonYear = Number(row.seasonYear || 0) || importSeasonYear(cleanText(row.date));
    if (seasonYear && (DTN_EDF_COMPETITION_IDS_BY_SEASON[seasonYear] || DTN_LISTING_SEASON_YEARS.has(seasonYear))) seasons.add(seasonYear);
  });
  return Array.from(seasons);
}

async function touchDtnQualificationCacheState(rows = [], context = {}) {
  const seasons = dtnQualificationSeasonsForRows(rows);
  if (!seasons.length) return { touchedSeasons: [] };
  const now = cleanText(context.now) || new Date().toISOString();
  const batch = db.batch();
  seasons.forEach((seasonYear) => {
    batch.set(dtnQualificationCacheStateRef(seasonYear), {
      version: FieldValue.increment(1),
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

function dtnListingCacheFingerprint({ seasonYear, rules, sourceVersion, listingVersion }) {
  return stableHash(JSON.stringify({
    cacheVersion: DTN_LISTING_CACHE_VERSION,
    seasonYear,
    rules,
    sourceVersion,
    listingVersion
  }));
}

function emptyDtnQualificationPayload({ seasonYear, sex, standards, competitionIds }) {
  return {
    ok: true,
    seasonYear,
    sex,
    standards: standards.map((standard) => ({
      id: standard.id,
      courses: POOL_COURSES.map((course) => ({
        course,
        threshold: Number(standard.thresholds[course] || 0),
        qualifiers: [],
        count: 0
      }))
    })),
    competitionIds,
    readStats: { scannedRows: 0, bounded: true }
  };
}

async function buildDtnQualificationPayload({ seasonYear, sex, standards, competitionIds }) {
  const indexedCourses = await Promise.all(POOL_COURSES.map(async (course) => {
    const categoryRows = await Promise.all(ENGAGEMENT_INDIVIDUAL_CATEGORY_CODES.map((category) =>
      readPublicPerformanceJson(`tops/${course}/${publicPerformanceTopFileName(sex, category)}`, [])
    ));
    const rows = uniquePublicPerformanceRows(categoryRows.flat()
      .map(publicPerformanceBaseRow)
      .filter((row) =>
        Number(row.seasonYear || 0) === seasonYear &&
        row.course === course &&
        row.sex === sex &&
        row.active !== false &&
        row.status !== "hidden" &&
        row.status !== "deleted"
      ));
    if (rows.length > DTN_QUALIFICATION_MAX_ROWS_PER_COURSE) {
      throw new Error(`Qualification DTN bornee pour ${course} (${rows.length} lignes).`);
    }
    return {
      course,
      rows
    };
  }));
  const scannedRows = indexedCourses.reduce((total, item) => total + item.rows.length, 0);
  return {
    ok: true,
    seasonYear,
    sex,
    standards: standards.map((standard) => ({
      id: standard.id,
      courses: indexedCourses.map(({ course, rows }) => {
        const threshold = Number(standard.thresholds[course] || 0);
        const eligibleRows = dtnQualificationRowsForStandard(rows, standard.id, competitionIds);
        const qualifiers = threshold ? bestDtnQualificationRows(eligibleRows, standard, threshold) : [];
        return { course, threshold, qualifiers, count: qualifiers.length };
      })
    })),
    competitionIds,
    readStats: { scannedRows, firestoreDocuments: 0, source: "public-storage-top-files", bounded: true }
  };
}

function emptyDtnListingPayload({ seasonYear, rules }) {
  return {
    ok: true,
    seasonYear,
    standards: rules.map((rule) => ({
      id: rule.id,
      sourceId: rule.sourceId,
      minAge: rule.minAge,
      maxAge: rule.maxAge,
      athletes: [],
      count: 0
    })),
    eligibility: { pool: "50", timing: "electronic" },
    readStats: { scannedRows: 0, bounded: true }
  };
}

function isDtnElectronicFiftyMeterPerformance(row = {}) {
  const pool = cleanText(row.pool).toUpperCase().replace(/\s+/g, "");
  const chrono = cleanText(row.chrono)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();
  return (pool === "50" || pool === "50M") && (chrono === "E" || chrono === "ELECTRONIC" || chrono === "ELECTRONIQUE");
}

function dtnListingAthletes(rows = [], rule = {}, seasonYear = 0) {
  const athletes = new Map();
  rows.forEach((row) => {
    if (!isDtnElectronicFiftyMeterPerformance(row)) return;
    const born = birthYear(row.birthDate);
    const age = born ? seasonYear - born : -1;
    if (age < rule.minAge || age > rule.maxAge) return;
    const threshold = Number(rule.thresholds?.[row.sex]?.[row.course] || 0);
    if (!threshold || !Number(row.timeValue) || Number(row.timeValue) > threshold) return;
    const key = publicSwimmerKey(row);
    if (!key) return;
    if (!athletes.has(key)) {
      athletes.set(key, {
        ...dtnQualificationRow(row),
        qualificationsByCourse: new Map()
      });
    }
    const athlete = athletes.get(key);
    const current = athlete.qualificationsByCourse.get(row.course)?.row;
    if (!current || publicBetterPerformance(row, current)) {
      athlete.qualificationsByCourse.set(row.course, { row, threshold });
    }
  });
  return Array.from(athletes.values()).map((athlete) => {
    const qualifications = Array.from(athlete.qualificationsByCourse.entries())
      .sort((a, b) => POOL_COURSES.indexOf(a[0]) - POOL_COURSES.indexOf(b[0]))
      .map(([course, qualification]) => ({
        course,
        time: cleanText(qualification.row.time),
        timeValue: Number(qualification.row.timeValue || 0),
        threshold: qualification.threshold,
        competition: cleanText(qualification.row.competition),
        location: cleanText(qualification.row.location),
        date: cleanText(qualification.row.date)
      }));
    const { qualificationsByCourse, ...row } = athlete;
    return cleanFirestoreValue({ ...row, qualifications });
  }).sort((a, b) => cleanText(a.lastName).localeCompare(cleanText(b.lastName), "fr-FR") || cleanText(a.firstName).localeCompare(cleanText(b.firstName), "fr-FR"));
}

async function buildDtnListingPayload({ seasonYear, rules }) {
  const sourceRows = await readPublicPerformanceJson(`dtn-listing/${seasonYear}.json`, []);
  const rows = uniquePublicPerformanceRows(sourceRows
    .map(publicPerformanceBaseRow)
    .filter((row) =>
      Number(row.seasonYear || 0) === seasonYear &&
      POOL_COURSES.includes(row.course) &&
      (row.sex === "F" || row.sex === "M") &&
      isDtnElectronicFiftyMeterPerformance(row) &&
      row.active !== false &&
      row.status !== "hidden" &&
      row.status !== "deleted"
    ));
  if (rows.length > DTN_QUALIFICATION_MAX_ROWS_PER_COURSE * POOL_COURSES.length) {
    throw new Error(`Mise en liste DTN bornee pour ${seasonYear} (${rows.length} lignes).`);
  }
  const athletesByRule = new Map(rules.map((rule) => [rule.id, dtnListingAthletes(rows, rule, seasonYear)]));
  const releveAthleteKeys = new Set((athletesByRule.get("RELEVE") || []).map(publicSwimmerKey).filter(Boolean));
  return {
    ok: true,
    seasonYear,
    standards: rules.map((rule) => {
      const athletes = rule.id === "RELEVE"
        ? athletesByRule.get(rule.id) || []
        : (athletesByRule.get(rule.id) || []).filter((athlete) => !releveAthleteKeys.has(publicSwimmerKey(athlete)));
      return {
        id: rule.id,
        sourceId: rule.sourceId,
        minAge: rule.minAge,
        maxAge: rule.maxAge,
        athletes,
        count: athletes.length
      };
    }),
    eligibility: { pool: "50", timing: "electronic" },
    readStats: { scannedRows: rows.length, firestoreDocuments: 0, storageFiles: 1, source: "public-storage-dtn-season-file", bounded: true }
  };
}

async function enqueueDtnQualificationJob(job = {}) {
  const jobId = job.view === "listing"
    ? `${job.seasonYear}-listing-${cleanText(job.fingerprint).slice(0, 24)}`
    : `${job.seasonYear}-${job.sex}-${cleanText(job.fingerprint).slice(0, 24)}`;
  const ref = db.collection(DTN_QUALIFICATION_JOBS_COLLECTION).doc(jobId);
  try {
    await ref.create({
      ...cleanFirestoreValue(job),
      status: "pending",
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    if (Number(error?.code) !== 6 && cleanText(error?.code) !== "already-exists") throw error;
  }
  return jobId;
}

exports.buildDtnQualificationView = onDocumentCreated(DTN_QUALIFICATION_JOB_OPTIONS, async (event) => {
  const snapshot = event.data;
  if (!snapshot?.exists) return;
  const job = snapshot.data() || {};
  const listingView = cleanText(job.view) === "listing";
  const seasonYear = Number(job.seasonYear || 0);
  const sex = normalizeCategoryCode(job.sex);
  const standards = Array.isArray(job.standards) ? job.standards : [];
  const rules = Array.isArray(job.rules) ? job.rules : [];
  const competitionIds = Array.isArray(job.competitionIds) ? job.competitionIds.map(cleanText).filter(Boolean) : [];
  const sourceVersion = Number(job.sourceVersion || 0) || 0;
  const listingVersion = Number(job.listingVersion || 0) || 0;
  const fingerprint = cleanText(job.fingerprint);
  const startedAt = Date.now();
  await snapshot.ref.set({ status: "running", startedAt: new Date().toISOString() }, { merge: true });
  try {
    const payload = listingView
      ? await buildDtnListingPayload({ seasonYear, rules })
      : await buildDtnQualificationPayload({ seasonYear, sex, standards, competitionIds });
    const stateSnapshot = await dtnQualificationCacheStateRef(seasonYear).get();
    const latestSourceVersion = Number(stateSnapshot.data()?.version || 0) || 0;
    const latestListingVersion = Number(stateSnapshot.data()?.listingVersion || 0) || 0;
    if (latestSourceVersion !== sourceVersion || (listingView && latestListingVersion !== listingVersion)) {
      await snapshot.ref.set({ status: "obsolete", completedAt: new Date().toISOString() }, { merge: true });
      return;
    }
    const payloadBytes = Buffer.byteLength(JSON.stringify(payload), "utf8");
    if (payloadBytes >= 900000) throw new Error("Vue DTN trop volumineuse pour le cache Firestore.");
    const generatedAt = new Date().toISOString();
    const cacheRef = listingView ? dtnListingCacheRef(seasonYear) : dtnQualificationCacheRef(seasonYear, sex);
    await cacheRef.set({
      fingerprint,
      sourceVersion,
      ...(listingView ? { listingVersion } : {}),
      generatedAt,
      payloadBytes,
      payload: cleanFirestoreValue(payload)
    }, { merge: false });
    await snapshot.ref.set({
      status: "completed",
      completedAt: generatedAt,
      durationMs: Date.now() - startedAt,
      scannedRows: Number(payload.readStats?.scannedRows || 0)
    }, { merge: true });
  } catch (error) {
    console.error("Construction asynchrone DTN impossible", { seasonYear, sex, view: listingView ? "listing" : "edf", error: cleanText(error?.message || error) });
    await snapshot.ref.set({
      status: "failed",
      failedAt: new Date().toISOString(),
      error: cleanText(error?.message || error).slice(0, 300)
    }, { merge: true });
  }
});

exports.refreshDtnQualificationCache = onCall(CALLABLE_OPTIONS, async (request) => {
  assertCapability(request, "dtn.view");
  const seasonYear = Number(request.data?.seasonYear || 0);
  if (!Number.isInteger(seasonYear) || !DTN_EDF_COMPETITION_IDS_BY_SEASON[seasonYear]) {
    throw new HttpsError("invalid-argument", "Saison DTN invalide.");
  }

  const stateRef = dtnQualificationCacheStateRef(seasonYear);
  const now = new Date().toISOString();
  const sourceVersion = await db.runTransaction(async (transaction) => {
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
  const startedAt = Date.now();
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

  const stateSnapshot = await dtnQualificationCacheStateRef(seasonYear).get();
  const sourceVersion = Number(stateSnapshot.data()?.version || 0) || 0;
  const fingerprint = dtnQualificationCacheFingerprint({ seasonYear, sex, standards, competitionIds, sourceVersion });
  const cacheRef = dtnQualificationCacheRef(seasonYear, sex);
  const cacheSnapshot = await cacheRef.get();
  if (cacheSnapshot.exists && cleanText(cacheSnapshot.data()?.fingerprint) === fingerprint) {
    const cachedPayload = cacheSnapshot.data()?.payload;
    if (cachedPayload && typeof cachedPayload === "object") {
      console.info("Cache DTN utilise", { seasonYear, sex, sourceVersion });
      return {
        ...cachedPayload,
        cache: { hit: true, pending: false, stale: false, generatedAt: cleanText(cacheSnapshot.data()?.generatedAt) },
        portalReadStats: portalReadStats("getDtnQualificationOverview", startedAt, { baseDocuments: 2, cacheHit: true })
      };
    }
  }
  const stalePayload = cacheSnapshot.exists && cacheSnapshot.data()?.payload && typeof cacheSnapshot.data().payload === "object"
    ? cacheSnapshot.data().payload
    : emptyDtnQualificationPayload({ seasonYear, sex, standards, competitionIds });
  if (request.data?.rebuild !== true) {
    console.info("Vue DTN absente ou obsolete, recalcul manuel requis", { seasonYear, sex, sourceVersion, stale: cacheSnapshot.exists });
    return {
      ...stalePayload,
      cache: {
        hit: false,
        pending: false,
        stale: cacheSnapshot.exists,
        refreshRequired: true,
        generatedAt: cleanText(cacheSnapshot.data()?.generatedAt)
      },
      portalReadStats: portalReadStats("getDtnQualificationOverview", startedAt, { baseDocuments: 2, cacheHit: false })
    };
  }
  const jobId = await enqueueDtnQualificationJob({
    seasonYear,
    sex,
    standards,
    competitionIds,
    sourceVersion,
    fingerprint
  });
  console.info("Vue DTN mise en file", { seasonYear, sex, sourceVersion, jobId, stale: cacheSnapshot.exists });
  return {
    ...stalePayload,
    cache: {
      hit: false,
      pending: true,
      stale: cacheSnapshot.exists,
      generatedAt: cleanText(cacheSnapshot.data()?.generatedAt),
      jobId
    },
    portalReadStats: portalReadStats("getDtnQualificationOverview", startedAt, { baseDocuments: 2, cacheHit: false })
  };
});

function normalizeDtnListingRules(inputRules = []) {
  const expectedSources = new Map([
    ["RELEVE", "TRP"],
    ["TEP", "TEP"],
    ["TEC1", "TU16C1"]
  ]);
  const rules = (Array.isArray(inputRules) ? inputRules : []).slice(0, 3).map((raw) => {
    const id = cleanText(raw?.id).toUpperCase();
    const sourceId = cleanText(raw?.sourceId).toUpperCase();
    const minAge = Number(raw?.minAge);
    const maxAge = Number(raw?.maxAge);
    if (expectedSources.get(id) !== sourceId || !Number.isInteger(minAge) || !Number.isInteger(maxAge) || minAge < 0 || maxAge > 120 || minAge > maxAge) {
      throw new HttpsError("invalid-argument", "Regle de mise en liste DTN invalide.");
    }
    const thresholds = { F: {}, M: {} };
    ["F", "M"].forEach((sex) => {
      POOL_COURSES.forEach((course) => {
        const threshold = Number(raw?.thresholds?.[sex]?.[course] || 0) || 0;
        if (threshold > 0 && threshold <= 10000000) thresholds[sex][course] = threshold;
      });
    });
    return { id, sourceId, minAge, maxAge, thresholds };
  });
  if (rules.length !== 3 || new Set(rules.map((rule) => rule.id)).size !== 3) {
    throw new HttpsError("invalid-argument", "Referentiels de mise en liste DTN incomplets.");
  }
  const tep = rules.find((rule) => rule.id === "TEP");
  const tec1 = rules.find((rule) => rule.id === "TEC1");
  if (tep.minAge !== tec1.maxAge + 1) {
    throw new HttpsError("invalid-argument", "Tranches Espoir DTN invalides.");
  }
  return rules;
}

exports.refreshDtnListingCache = onCall(CALLABLE_OPTIONS, async (request) => {
  assertCapability(request, "dtn.view");
  const seasonYear = Number(request.data?.seasonYear || 0);
  if (!Number.isInteger(seasonYear) || !DTN_LISTING_SEASON_YEARS.has(seasonYear)) {
    throw new HttpsError("invalid-argument", "Saison DTN invalide.");
  }
  const stateRef = dtnQualificationCacheStateRef(seasonYear);
  const now = new Date().toISOString();
  const listingVersion = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(stateRef);
    const next = (Number(snapshot.data()?.listingVersion || 0) || 0) + 1;
    transaction.set(stateRef, {
      listingVersion: next,
      listingUpdatedAt: now,
      listingReason: "dtn.listing.manual-refresh"
    }, { merge: true });
    return next;
  });
  return { ok: true, seasonYear, listingVersion, refreshedAt: now };
});

exports.getDtnListingOverview = onCall(CALLABLE_OPTIONS, async (request) => {
  const startedAt = Date.now();
  assertCapability(request, "dtn.view");
  const seasonYear = Number(request.data?.seasonYear || 0);
  if (!Number.isInteger(seasonYear) || seasonYear < 2000 || seasonYear > 2100 || !DTN_LISTING_SEASON_YEARS.has(seasonYear)) {
    throw new HttpsError("invalid-argument", "Saison DTN invalide.");
  }
  const rules = normalizeDtnListingRules(request.data?.rules);
  const stateSnapshot = await dtnQualificationCacheStateRef(seasonYear).get();
  const sourceVersion = Number(stateSnapshot.data()?.version || 0) || 0;
  const listingVersion = Number(stateSnapshot.data()?.listingVersion || 0) || 0;
  const fingerprint = dtnListingCacheFingerprint({ seasonYear, rules, sourceVersion, listingVersion });
  const cacheRef = dtnListingCacheRef(seasonYear);
  const cacheSnapshot = await cacheRef.get();
  if (cacheSnapshot.exists && cleanText(cacheSnapshot.data()?.fingerprint) === fingerprint) {
    const cachedPayload = cacheSnapshot.data()?.payload;
    if (cachedPayload && typeof cachedPayload === "object") {
      return {
        ...cachedPayload,
        cache: { hit: true, pending: false, stale: false, generatedAt: cleanText(cacheSnapshot.data()?.generatedAt) },
        portalReadStats: portalReadStats("getDtnListingOverview", startedAt, { baseDocuments: 2, cacheHit: true })
      };
    }
  }
  const stalePayload = cacheSnapshot.exists && cacheSnapshot.data()?.payload && typeof cacheSnapshot.data().payload === "object"
    ? cacheSnapshot.data().payload
    : emptyDtnListingPayload({ seasonYear, rules });
  if (request.data?.rebuild !== true) {
    return {
      ...stalePayload,
      cache: {
        hit: false,
        pending: false,
        stale: cacheSnapshot.exists,
        refreshRequired: true,
        generatedAt: cleanText(cacheSnapshot.data()?.generatedAt)
      },
      portalReadStats: portalReadStats("getDtnListingOverview", startedAt, { baseDocuments: 2, cacheHit: false })
    };
  }
  const jobId = await enqueueDtnQualificationJob({
    view: "listing",
    seasonYear,
    rules,
    sourceVersion,
    listingVersion,
    fingerprint
  });
  return {
    ...stalePayload,
    cache: {
      hit: false,
      pending: true,
      stale: cacheSnapshot.exists,
      generatedAt: cleanText(cacheSnapshot.data()?.generatedAt),
      jobId
    },
    portalReadStats: portalReadStats("getDtnListingOverview", startedAt, { baseDocuments: 2, cacheHit: false })
  };
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
      if ((swimmer.aliases || []).length) payload.aliases = FieldValue.arrayUnion(...swimmer.aliases);
      if ((swimmer.sourceIds || []).length) payload.sourceIds = FieldValue.arrayUnion(...swimmer.sourceIds);
      if ((swimmer.searchPrefixes || []).length) payload.searchPrefixes = FieldValue.arrayUnion(...swimmer.searchPrefixes);
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

async function hydratePerformanceBaseRows(rows = []) {
  const normalizedRows = rows.map(publicPerformanceBaseRow);
  const missingTechnicalKeys = normalizedRows.filter((row) =>
    !cleanText(row.performanceBaseId) && !cleanText(row.publicKey) && cleanText(row.id)
  );
  if (!missingTechnicalKeys.length) return normalizedRows;
  if (missingTechnicalKeys.length > ENGAGEMENT_SWIMMER_CORRECTION_MAX_PERFORMANCE_ROWS) {
    throw new HttpsError("failed-precondition", "Hydratation des performances trop volumineuse.");
  }
  const refs = missingTechnicalKeys.map((row) => {
    const id = cleanText(row.id);
    const source = id.startsWith("import:") ? "livepalmes-import" : "intranap";
    return db.collection(PERFORMANCE_BASE_COLLECTION).doc(stableHash(`${source}|${id}`).slice(0, 40));
  });
  const hydratedById = new Map();
  for (let index = 0; index < refs.length; index += 400) {
    const refBatch = refs.slice(index, index + 400);
    const snapshots = await db.getAll(...refBatch);
    snapshots.forEach((snapshot, batchIndex) => {
      if (!snapshot.exists) return;
      hydratedById.set(cleanText(missingTechnicalKeys[index + batchIndex].id), {
        performanceBaseId: snapshot.id,
        ...(snapshot.data() || {})
      });
    });
  }
  return normalizedRows.map((row) => hydratedById.get(cleanText(row.id)) || row);
}

async function getPerformanceBaseRowsBySwimmer(data = {}) {
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
    if (snapshot.exists) indexDocs.set(snapshot.id, { ...(snapshot.data() || {}), id: snapshot.id });
  });
  if (!indexDocs.size && identityKey) {
    const snapshot = await db.collection(PERFORMANCE_SWIMMERS_COLLECTION)
      .where("identityKey", "==", identityKey)
      .limit(3)
      .get();
    snapshot.docs.forEach((doc) => indexDocs.set(doc.id, { ...(doc.data() || {}), id: doc.id }));
  }
  for (const id of ids.slice(0, 5)) {
    if (indexDocs.size) break;
    const snapshot = await db.collection(PERFORMANCE_SWIMMERS_COLLECTION)
      .where("sourceIds", "array-contains", id)
      .limit(3)
      .get();
    snapshot.docs.forEach((doc) => indexDocs.set(doc.id, { ...(doc.data() || {}), id: doc.id }));
  }

  const pageRefs = [];
  indexDocs.forEach((doc) => {
    const pageCount = Number(doc.pageCount || 0) || 0;
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      pageRefs.push(db.collection(PERFORMANCE_SWIMMER_PAGES_COLLECTION).doc(performanceSwimmerPageId(doc.id, pageIndex)));
    }
  });
  if (pageRefs.length) {
    const snapshots = await db.getAll(...pageRefs.slice(0, 20));
    const pageRows = uniquePublicPerformanceRows(snapshots.flatMap((snapshot) => {
      const page = snapshot.exists ? snapshot.data() || {} : {};
      return Array.isArray(page.rows) ? page.rows : [];
    }).map(publicPerformanceBaseRow));
    return hydratePerformanceBaseRows(pageRows);
  }

  const sourceKeys = Array.from(new Set([identityKey, ...ids].map(cleanText).filter(Boolean))).slice(0, 10);
  for (const sourceKey of sourceKeys) {
    const payload = await readPublicPerformanceJson(publicPerformanceSwimmerFilePath(sourceKey), null);
    if (!Array.isArray(payload?.rows)) continue;
    const publicRows = uniquePublicPerformanceRows(payload.rows
      .map(publicPerformanceBaseRow)
      .filter((row) => row.active !== false && row.status !== "deleted"));
    return hydratePerformanceBaseRows(publicRows);
  }
  return [];
}

exports.rebuildPerformanceSwimmerIndexNextPage = onCall(PUBLIC_PERFORMANCE_CALLABLE_OPTIONS, async (request) => {
  assertAdmin(request);
  const stateRef = db.collection(PERFORMANCE_SWIMMER_INDEX_STATE_COLLECTION).doc("default");
  const stateSnapshot = await stateRef.get();
  const state = stateSnapshot.exists ? stateSnapshot.data() || {} : {};
  const reset = request.data?.reset === true;
  const pageSize = Math.min(Math.max(Number(request.data?.pageSize || 500) || 500, 100), 500);
  const startedAt = reset || !state.startedAt ? new Date().toISOString() : cleanText(state.startedAt);
  const cursor = reset ? "" : cleanText(state.cursor);
  let query = db.collection(PERFORMANCE_BASE_COLLECTION)
    .orderBy(FieldPath.documentId())
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
  const stateRef = db.collection(PERFORMANCE_TOP_INDEX_STATE_COLLECTION).doc("default");
  const stateSnapshot = await stateRef.get();
  const state = stateSnapshot.exists ? stateSnapshot.data() || {} : {};
  const reset = request.data?.reset === true;
  const pageSize = Math.min(Math.max(Number(request.data?.pageSize || 500) || 500, 100), 500);
  const startedAt = reset || !state.startedAt ? new Date().toISOString() : cleanText(state.startedAt);
  const cursor = reset ? "" : cleanText(state.cursor);
  let query = db.collection(PERFORMANCE_BASE_COLLECTION)
    .orderBy(FieldPath.documentId())
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
  const importRef = db.collection("performanceImports").doc(importId);
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
  await db.collection("performanceImports").doc(importId).set({
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
    available: false,
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
    available: snapshot.available !== false,
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
  return storage.bucket(PUBLIC_PERFORMANCE_BUCKET).file(PUBLIC_ADDITIONAL_PERFORMANCE_PATH);
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
  return storage.bucket(PUBLIC_PERFORMANCE_BUCKET);
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

async function publishPublicRecordsManifest(manifest) {
  const file = publicPerformanceFile("records/manifest.json");
  for (let attempt = 0; attempt < 5; attempt += 1) {
    let current = {};
    let generation = 0;
    try {
      const [[buffer], [metadata]] = await Promise.all([file.download(), file.getMetadata()]);
      current = JSON.parse(buffer.toString("utf8"));
      generation = Number(metadata.generation || 0);
    } catch (error) {
      if (!(error?.code === 404 || /No such object|not found/i.test(error?.message || ""))) throw error;
    }
    if (!shouldPublishRecordsManifest(current, manifest)) return { published: false, manifest: current };
    try {
      await file.save(JSON.stringify(manifest), {
        resumable: false,
        contentType: "application/json; charset=utf-8",
        metadata: { cacheControl: "no-store, max-age=0" },
        preconditionOpts: { ifGenerationMatch: generation }
      });
      return { published: true, manifest };
    } catch (error) {
      if (Number(error?.code) !== 412) throw error;
    }
  }
  throw new Error("Publication concurrente du manifeste RF/MPF impossible.");
}

async function publishPublicRecordsSnapshot(data, eventTime = "") {
  const payload = publicRecordsPayload(data);
  const manifest = publicRecordsManifest(payload, eventTime);
  await savePublicPerformanceJson(manifest.dataPath, payload, "public, max-age=31536000, immutable");
  const result = await publishPublicRecordsManifest(manifest);
  return { ...result, version: manifest.version, dataPath: manifest.dataPath };
}

exports.syncPublicRecordsData = onDocumentWritten({
  region: REGION,
  document: "competitions/{competitionId}/performanceData/records",
  retry: true,
  timeoutSeconds: 120,
  memory: "512MiB"
}, async (event) => {
  if (event.params?.competitionId !== "livepalmes-active" || !event.data?.after?.exists) return null;
  const data = event.data.after.data() || {};
  const publication = await publishPublicRecordsSnapshot(data, event.time || "");
  const eventVersionIsCurrent = publication.published || publication.manifest?.version === publication.version;
  if (eventVersionIsCurrent) {
    const latestPublishedAt = cleanText(data.recordHistory?.[0]?.publishedAt).slice(0, 40);
    const changeCount = (Array.isArray(data.recordHistory) ? data.recordHistory : [])
      .filter((entry) => !latestPublishedAt || cleanText(entry?.publishedAt) === latestPublishedAt)
      .length;
    await writeAuditLogOnce("recordsMpf.published", cleanText(data.updatedBy).slice(0, 160) || "system:records-publication", {
      changeCount,
      publishedAt: latestPublishedAt || cleanText(data.updatedAt).slice(0, 40),
      sourceDate: cleanText(data.sourceDate).slice(0, 20),
      version: publication.version
    }, event.id);
  }
  return publication;
});

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
  return publicPerformanceSwimmerStorageRow(row);
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
    chrono: cleanText(row.chrono),
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
    rowSchemaVersion: PUBLIC_PERFORMANCE_SWIMMER_ROW_SCHEMA_VERSION,
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

async function assertPublicSwimmerIdentityReplaced(oldPayload = {}, oldPerfFile = "", newPayload = {}, newPerfFile = "") {
  const oldFile = await readPublicPerformanceJson(oldPerfFile, null);
  if (oldFile) throw new Error("L'ancienne fiche publique existe encore apres la correction.");

  const oldSearchRow = buildPublicSearchRow(oldPayload, oldPerfFile);
  const oldSearchShards = new Set((oldSearchRow.searchPrefixes || []).map(publicPerformanceSearchShard).filter(Boolean));
  for (const shard of oldSearchShards) {
    const rows = await readPublicPerformanceJson(`search/${shard}.json`, []);
    const stale = (Array.isArray(rows) ? rows : []).some((row) =>
      cleanText(row.identityKey) === cleanText(oldSearchRow.identityKey) ||
      cleanText(row.perfFile) === cleanText(oldPerfFile)
    );
    if (stale) throw new Error("L'ancienne fiche reste presente dans la recherche publique.");
  }

  const newSearchRow = buildPublicSearchRow(newPayload, newPerfFile);
  const idValues = [newSearchRow.id, ...(newSearchRow.sourceIds || []), ...(newSearchRow.aliases || [])]
    .map(cleanText)
    .filter(Boolean);
  const idsByShard = new Map();
  idValues.forEach((id) => {
    const shard = publicPerformanceIdShard(id);
    if (!shard) return;
    if (!idsByShard.has(shard)) idsByShard.set(shard, []);
    idsByShard.get(shard).push(id);
  });
  for (const [shard, ids] of idsByShard.entries()) {
    const items = await readPublicPerformanceJson(`ids/${shard}.json`, {});
    const invalid = ids.some((id) =>
      cleanText(items?.[id]?.identityKey) !== cleanText(newSearchRow.identityKey) ||
      cleanText(items?.[id]?.perfFile) !== cleanText(newPerfFile)
    );
    if (invalid) throw new Error("Un identifiant public ne pointe pas vers la fiche corrigee.");
  }
}

async function replacePublicSwimmerIdentity(oldKey = "", newKey = "", updatedRows = []) {
  const oldPerfFile = publicPerformanceSwimmerFilePath(oldKey);
  const newPerfFile = publicPerformanceSwimmerFilePath(newKey);
  const oldPayload = await readPublicPerformanceJson(oldPerfFile, null);
  let publicSnapshot = null;
  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const removedFiles = [];
      if (oldPayload) {
        const removedIndexes = await removePublicSearchIndexes(oldPayload, oldPerfFile);
        removedFiles.push(...removedIndexes);
      }
      removedFiles.push(await deletePublicPerformanceFile(oldPerfFile));
      publicSnapshot = await rebuildPublicPerformanceFilesForAffectedRows(updatedRows, {
        now: new Date().toISOString(),
        reason: "engagement.swimmerIdentityCorrected"
      });
      const newPayload = await readPublicPerformanceJson(newPerfFile, null);
      if (!newPayload) throw new Error("La nouvelle fiche publique n'a pas ete generee.");
      await assertPublicSwimmerIdentityReplaced(oldPayload || {}, oldPerfFile, newPayload, newPerfFile);
      publicSnapshot.removedFiles = removedFiles.length;
      publicSnapshot.identityReplacementAttempts = attempt;
      return publicSnapshot;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Remplacement de la fiche publique impossible.");
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
  const publicSeedRows = seedRows.map(publicPerformanceBaseRow);
  const swimmerKey = publicSwimmerKey(publicSeedRows[0] || {});
  if (!swimmerKey) return publicSeedRows.filter(publicPerformanceActiveRow);
  const current = await readPublicPerformanceJson(publicPerformanceSwimmerFilePath(swimmerKey), null);
  if (current && !publicSwimmerPayloadSupportsTopRebuild(current)) {
    throw new Error(`Fiche publique au format historique pour ${swimmerKey}. Une reconstruction globale contrôlée est requise avant la publication ciblée.`);
  }
  const identitySeed = publicSeedRows.find((row) => row.swimmer || row.firstName || row.lastName || row.birthDate || row.sex) || {};
  const hydrationPayload = {
    ...(current || {}),
    id: cleanText(current?.id || identitySeed.swimmerId || identitySeed.originalSwimmerId),
    identityKey: cleanText(current?.identityKey || identitySeed.swimmerIdentityKey || swimmerKey),
    name: cleanText(current?.name || identitySeed.swimmer),
    firstName: cleanText(current?.firstName || identitySeed.firstName),
    lastName: cleanText(current?.lastName || identitySeed.lastName),
    birthDate: cleanText(current?.birthDate || identitySeed.birthDate),
    sex: cleanText(current?.sex || identitySeed.sex),
    clubId: cleanText(current?.clubId || identitySeed.clubId),
    club: cleanText(current?.club || identitySeed.club),
    clubName: cleanText(current?.clubName || identitySeed.clubName)
  };
  const affectedKeys = new Set(publicSeedRows.map(publicPerformanceRowKey).filter(Boolean));
  const keptRows = hydratePublicSwimmerRowsFromPayload(current?.rows, hydrationPayload, swimmerKey)
    .map(publicPerformanceBaseRow)
    .filter((row) => !affectedKeys.has(publicPerformanceRowKey(row)));
  return uniquePublicPerformanceRows([
    ...keptRows,
    ...publicSeedRows.filter(publicPerformanceActiveRow)
  ]);
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
  await db.collection(PERFORMANCE_BASE_MIGRATION_COLLECTION).doc(cleanText(data.batchId || stableHash(now).slice(0, 24))).set({
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
  const snapshot = await readPublishedAdditionalPerformanceDataSnapshot();
  if (snapshot.available === false) {
    throw new HttpsError("failed-precondition", "Fichier public des performances indisponible.");
  }
  return snapshot;
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

async function enqueuePerformancePublicationJob(correction = {}, actor = {}) {
  const now = new Date().toISOString();
  const jobId = stableHash(`${correction.id}|${correction.updatedAt}|${now}|${actor.uid || "system"}`).slice(0, 40);
  const ref = db.collection(PERFORMANCE_PUBLICATION_JOBS_COLLECTION).doc(jobId);
  await ref.create(cleanFirestoreValue({
    id: jobId,
    type: "performanceCorrection",
    correction,
    status: "pending",
    attempts: 0,
    createdAt: now,
    updatedAt: now,
    requestedBy: actor.uid || "",
    requestedByEmail: actor.email || ""
  }));
  return publicPerformancePublicationJob({ status: "pending", attempts: 0, createdAt: now, updatedAt: now }, jobId);
}

async function claimPerformancePublicationJob(jobRef) {
  const nowMs = Date.now();
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(jobRef);
    if (!snapshot.exists) return null;
    const job = snapshot.data() || {};
    if (!canClaimPerformancePublicationJob(job, nowMs)) return null;
    const attempts = Math.max(0, Number(job.attempts || 0) || 0) + 1;
    const now = new Date(nowMs).toISOString();
    transaction.set(jobRef, {
      status: "processing",
      attempts,
      startedAt: now,
      updatedAt: now,
      leaseUntil: new Date(nowMs + PERFORMANCE_PUBLICATION_LEASE_MS).toISOString(),
      error: ""
    }, { merge: true });
    return { ...job, id: jobRef.id, attempts };
  });
}

async function processPerformancePublicationJob(jobRef) {
  const job = await claimPerformancePublicationJob(jobRef);
  if (!job) return { skipped: true };
  const correction = job.correction && typeof job.correction === "object" ? job.correction : {};
  const correctionId = cleanText(correction.id).slice(0, 40);
  const targetKey = cleanText(correction.targetKey).slice(0, 240);
  if (!correctionId || !targetKey) {
    await jobRef.set({
      status: "failed",
      updatedAt: new Date().toISOString(),
      failedAt: new Date().toISOString(),
      leaseUntil: "",
      error: "Correction cible manquante dans le travail de publication."
    }, { merge: true });
    return { failed: true, retryable: false };
  }

  const now = new Date().toISOString();
  const targetRow = correction.targetRow || {};
  const affectedTargetRow = correction.hidden === true
    ? { ...targetRow, active: false, status: "hidden" }
    : targetRow;
  const correctedBaseRow = {
    ...targetRow,
    ...(correction.hidden === true ? {} : correction.patch || {}),
    publicKey: targetKey,
    source: correction.targetSource || targetRow.source || "intranap",
    id: correction.targetId || targetRow.id || "",
    active: correction.hidden !== true,
    status: correction.hidden === true ? "hidden" : "active"
  };
  try {
    const performanceBaseSync = await writePerformanceBaseRows([correctedBaseRow], {
      actorUid: job.requestedBy || "system:performancePublication",
      actorEmail: job.requestedByEmail || "",
      now,
      action: correction.hidden === true ? "performanceCorrection.hidden" : "performanceCorrection.updated",
      changeSeed: correctionId,
      status: correction.hidden === true ? "hidden" : "active",
      topIndexIncludeTombstones: correction.hidden === true,
      dtnInvalidationRows: [targetRow, correctedBaseRow]
    });
    const publicSnapshot = await publishIncrementalPerformanceCorrection(correction);
    if (publicSnapshot?.ok === false) throw new Error(publicSnapshot.error || "Publication de l'instantané public impossible.");
    const publicFilesSnapshot = await rebuildPublicPerformanceFilesForAffectedRows([affectedTargetRow, correctedBaseRow], {
      now,
      reason: correction.hidden === true ? "performanceCorrection.hidden" : "performanceCorrection.updated",
      correctionId
    });
    if (publicFilesSnapshot?.ok === false) throw new Error(publicFilesSnapshot.error || "Publication des fichiers ciblés impossible.");
    await invalidateEngagementEntryTimeCachesForPerformanceRows([affectedTargetRow, correctedBaseRow]);
    const completedAt = new Date().toISOString();
    await jobRef.set(cleanFirestoreValue({
      status: "published",
      updatedAt: completedAt,
      completedAt,
      leaseUntil: "",
      error: "",
      result: {
        performanceBaseOk: performanceBaseSync?.ok !== false,
        publicSnapshotOk: publicSnapshot?.ok !== false,
        publicFilesOk: publicFilesSnapshot?.ok !== false,
        writtenFiles: Number(publicFilesSnapshot?.writtenFiles || 0) || 0
      }
    }), { merge: true });
    await writeAuditLog("performanceCorrection.published", job.requestedBy || "system:performancePublication", {
      correctionId,
      targetKey,
      jobId: jobRef.id,
      attempts: job.attempts
    });
    return { published: true };
  } catch (error) {
    const failedAt = new Date().toISOString();
    const status = performancePublicationFailureStatus(job.attempts, PERFORMANCE_PUBLICATION_MAX_ATTEMPTS);
    const message = cleanText(error?.message || error).slice(0, 300) || "Publication publique impossible.";
    console.error("Publication asynchrone d'une correction impossible", {
      jobId: jobRef.id,
      correctionId,
      targetKey,
      attempts: job.attempts,
      status,
      message
    });
    await jobRef.set({
      status,
      updatedAt: failedAt,
      failedAt,
      leaseUntil: "",
      error: message
    }, { merge: true });
    if (status === "failed") {
      await writeAuditLog("performanceCorrection.publicationFailed", job.requestedBy || "system:performancePublication", {
        correctionId,
        targetKey,
        jobId: jobRef.id,
        attempts: job.attempts,
        message
      });
    }
    return { failed: true, retryable: status === "pending", error };
  }
}

exports.publishPerformanceCorrectionJob = onDocumentCreated(PERFORMANCE_PUBLICATION_JOB_OPTIONS, async (event) => {
  if (!event.data?.exists) return;
  const result = await processPerformancePublicationJob(event.data.ref);
  if (result.retryable) throw result.error;
});

exports.resumePerformancePublicationJobs = onSchedule(PERFORMANCE_PUBLICATION_SCHEDULER_OPTIONS, async () => {
  const [pendingSnapshot, processingSnapshot] = await Promise.all([
    db.collection(PERFORMANCE_PUBLICATION_JOBS_COLLECTION).where("status", "==", "pending").limit(3).get(),
    db.collection(PERFORMANCE_PUBLICATION_JOBS_COLLECTION).where("status", "==", "processing").limit(3).get()
  ]);
  const jobs = [...pendingSnapshot.docs, ...processingSnapshot.docs]
    .filter((snapshot, index, all) => all.findIndex((item) => item.id === snapshot.id) === index)
    .filter((snapshot) => canClaimPerformancePublicationJob(snapshot.data() || {}));
  for (const snapshot of jobs) await processPerformancePublicationJob(snapshot.ref);
  return null;
});

exports.getPerformancePublicationJobStatus = onCall(CALLABLE_OPTIONS, async (request) => {
  assertCapability(request, "competitions.import");
  const jobId = cleanText(request.data?.jobId).slice(0, 80);
  if (!jobId) throw new HttpsError("invalid-argument", "Travail de publication manquant.");
  const snapshot = await db.collection(PERFORMANCE_PUBLICATION_JOBS_COLLECTION).doc(jobId).get();
  if (!snapshot.exists) throw new HttpsError("not-found", "Travail de publication introuvable.");
  return { ok: true, publicationJob: publicPerformancePublicationJob(snapshot.data() || {}, snapshot.id) };
});

exports.retryPerformancePublicationJob = onCall(CALLABLE_OPTIONS, async (request) => {
  assertCapability(request, "competitions.import");
  const jobId = cleanText(request.data?.jobId).slice(0, 80);
  if (!jobId) throw new HttpsError("invalid-argument", "Travail de publication manquant.");
  const snapshot = await db.collection(PERFORMANCE_PUBLICATION_JOBS_COLLECTION).doc(jobId).get();
  if (!snapshot.exists) throw new HttpsError("not-found", "Travail de publication introuvable.");
  const job = snapshot.data() || {};
  if (job.status !== "failed") throw new HttpsError("failed-precondition", "Ce travail ne nécessite pas de reprise manuelle.");
  const publicationJob = await enqueuePerformancePublicationJob(job.correction || {}, {
    uid: request.auth.uid,
    email: request.auth.token?.email || ""
  });
  await snapshot.ref.set({ replacedBy: publicationJob.id, updatedAt: new Date().toISOString() }, { merge: true });
  return { ok: true, publicationJob };
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
  const ref = db.collection("performanceCorrections").doc(correctionId);
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

  const publicationJob = await enqueuePerformancePublicationJob({
    id: correctionId,
    targetKey: safePayload.targetKey,
    targetId: safePayload.targetId,
    targetSource: safePayload.targetSource,
    targetRow: safePayload.targetRow || {},
    hidden: safePayload.hidden === true,
    patch: safePayload.patch || {},
    updatedAt: safePayload.updatedAt,
    updatedByName: safePayload.updatedByName || ""
  }, {
    uid: request.auth.uid,
    email: request.auth.token?.email || ""
  });
  return {
    ok: true,
    correction: {
      id: correctionId,
      targetKey,
      hidden,
      patch,
      updatedAt: now
    },
    publicationJob
  };
});
