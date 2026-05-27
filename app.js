const livePalmesAppConfig = window.LivePalmesAppConfig || {};
const STORAGE_KEY = livePalmesAppConfig.storageKey || "napSpeakerFrance2026:v15";
const ALERTS_KEY = livePalmesAppConfig.alertsKey || "napSpeakerFrance2026:alerts:v1";
const LIVE_DISMISSED_ALERTS_KEY = livePalmesAppConfig.liveDismissedAlertsKey || "napSpeakerFrance2026:live-dismissed-alerts:v1";
const UNLOCKED_ROLES_KEY = livePalmesAppConfig.unlockedRolesKey || "napSpeakerFrance2026:unlocked-roles:v1";
const CLIENT_ID_KEY = livePalmesAppConfig.clientIdKey || "napSpeakerFrance2026:client-id:v1";
const ACTIVE_VIEW_KEY = livePalmesAppConfig.activeViewKey || "napSpeakerFrance2026:active-view:v1";
const ROLE_STATES_KEY = livePalmesAppConfig.roleStatesKey || "napSpeakerFrance2026:role-states:v1";
const LAST_ACTIVITY_KEY = livePalmesAppConfig.lastActivityKey || "napSpeakerFrance2026:last-activity:v1";
const FIRESTORE_COMPETITION_ID = livePalmesAppConfig.firestoreCompetitionId || "livepalmes-active";
const SPEAKER_SHEET_ID = livePalmesAppConfig.speakerSheetId || "1osoRYSAw15iwfFnpUuR4_nNl_kUui7vQGBJFyyhmmdA";
const ADMIN_PIN = livePalmesAppConfig.adminPin || "2216!";
const ROLE_PINS = livePalmesAppConfig.rolePins || { live: "0000", speaker: "0001", referee: "0002", video: "0003", computer: "0004", secretary: "0005" };
const ROLE_LABELS = {
  speaker: "Speaker",
  live: "Live",
  referee: "Juge arbitre",
  video: "Juge vid\u00e9o",
  computer: "Bureau des performances",
  secretary: "Secr\u00e9tariat"
};
const DECISION_LABELS = {
  forfait: "Forfait",
  abandon: "Abandon",
  false_start: "DSQ - faux d\u00e9part",
  relay_early_start: "DSQ - d\u00e9part anticip\u00e9",
  underwater_15m: "DSQ - coul\u00e9e sup\u00e9rieure \u00e0 15 m",
  immersion: "DSQ - passage en immersion",
  bottle_fault: "DSQ - faute de bouteille",
  interference: "DSQ - g\u00eane d'un concurrent",
  other_dsq: "DSQ - autre motif"
};
const SPEAKER_DECISION_REASONS = {
  false_start: "faux d\u00e9part",
  relay_early_start: "d\u00e9part anticip\u00e9",
  underwater_15m: "coul\u00e9e sup\u00e9rieure \u00e0 15 m",
  immersion: "passage en immersion",
  bottle_fault: "faute de bouteille",
  interference: "g\u00eane d'un concurrent",
  other_dsq: "autre motif"
};
const LOCK_DURATION_MS = livePalmesAppConfig.lockDurationMs || 120000;
const LOCK_RECOVERY_MS = livePalmesAppConfig.lockRecoveryMs || 75000;
const LOCK_HEARTBEAT_MS = livePalmesAppConfig.lockHeartbeatMs || 30000;
const FIREBASE_CONNECTION_CHECK_MS = livePalmesAppConfig.firebaseConnectionCheckMs || 15000;
const HOME_AFTER_INACTIVITY_MS = livePalmesAppConfig.homeAfterInactivityMs || 15 * 60 * 1000;
const COMPETITION_INACTIVITY_MS = livePalmesAppConfig.competitionInactivityMs || 60 * 60 * 1000;
const COMPETITION_INACTIVITY_CHECK_MS = livePalmesAppConfig.competitionInactivityCheckMs || 60 * 1000;
const PRESENCE_DURATION_MS = livePalmesAppConfig.presenceDurationMs || 3 * 60 * 1000;
const PRESENCE_HEARTBEAT_MS = livePalmesAppConfig.presenceHeartbeatMs || 60 * 1000;
const PRESENCE_WRITE_THROTTLE_MS = livePalmesAppConfig.presenceWriteThrottleMs || 30 * 1000;
const SPEAKER_INFO_SHEETS = livePalmesAppConfig.speakerInfoSheets || {};
const FIREBASE_CONFIG = livePalmesAppConfig.firebaseConfig || {};
const sampleData = window.SPEAKER_DATA || livePalmesAppConfig.fallbackData || { meet: {}, events: [], entrants: [], qualifications: [], top2025: [], records: [], notes: {} };
const livePalmesLocalState = window.LivePalmesLocalState || {};
const livePalmesAppStorageWorkflowModule = window.LivePalmesAppStorageWorkflow || {};
const livePalmesFirebase = window.LivePalmesFirebase || {};
const livePalmesFirestoreRefs = window.LivePalmesFirestoreRefs || {};
const livePalmesConsoleSyncModule = window.LivePalmesConsoleSync || {};
const livePalmesRealtimeSyncModule = window.LivePalmesRealtimeSync || {};
const livePalmesRoleAccess = window.LivePalmesRoleAccess || {};
const livePalmesRoleState = window.LivePalmesRoleState || {};
const livePalmesRoleSessionWorkflowModule = window.LivePalmesRoleSessionWorkflow || {};
const livePalmesRaceCore = window.LivePalmesRaceCore || {};
const livePalmesAlerts = window.LivePalmesAlerts || {};
const livePalmesAlertPresenterModule = window.LivePalmesAlertPresenter || {};
const livePalmesFinalists = window.LivePalmesFinalists || {};
const livePalmesSecretaryFinals = window.LivePalmesSecretaryFinals || {};
const livePalmesPublication = window.LivePalmesPublication || {};
const livePalmesDiagnostics = window.LivePalmesDiagnostics || {};
const livePalmesAdminDiagnostics = window.LivePalmesAdminDiagnostics || {};
const livePalmesAdminMaintenance = window.LivePalmesAdminMaintenance || {};
const livePalmesAdminActionsModule = window.LivePalmesAdminActions || {};
const livePalmesAdminModals = window.LivePalmesAdminModals || {};
const livePalmesAdminArchives = window.LivePalmesAdminArchives || {};
const livePalmesExportActions = window.LivePalmesExportActions || {};
const livePalmesExportReportsWorkflowModule = window.LivePalmesExportReportsWorkflow || {};
const livePalmesAdminResults = window.LivePalmesAdminResults || {};
const livePalmesResults = window.LivePalmesResults || {};
const livePalmesPdfImport = window.LivePalmesPdfImport || {};
const livePalmesSeriesImport = window.LivePalmesSeriesImport || {};
const livePalmesSeriesImportWorkflowModule = window.LivePalmesSeriesImportWorkflow || {};
const livePalmesSpeakerInfo = window.LivePalmesSpeakerInfo || {};
const livePalmesSpeakerInfoWorkflowModule = window.LivePalmesSpeakerInfoWorkflow || {};
const livePalmesProgramNavigation = window.LivePalmesProgramNavigation || {};
const livePalmesProgramModalsModule = window.LivePalmesProgramModals || {};
const livePalmesEntrantHelpersModule = window.LivePalmesEntrantHelpers || {};
const livePalmesSwimmerPanel = window.LivePalmesSwimmerPanel || {};
const livePalmesResultsAdminWorkflow = window.LivePalmesResultsAdminWorkflow || {};
const livePalmesResultPublicationWorkflowModule = window.LivePalmesResultPublicationWorkflow || {};
const livePalmesResultMaintenanceWorkflowModule = window.LivePalmesResultMaintenanceWorkflow || {};
const livePalmesFinalWithdrawalsWorkflow = window.LivePalmesFinalWithdrawalsWorkflow || {};
const livePalmesDiagnosticsWorkflow = window.LivePalmesDiagnosticsWorkflow || {};
const livePalmesUiEvents = window.LivePalmesUiEvents || {};
const livePalmesProgramView = window.LivePalmesProgramView || {};
const livePalmesConsoleRenderWorkflowModule = window.LivePalmesConsoleRenderWorkflow || {};
const livePalmesRefereeView = window.LivePalmesRefereeView || {};
const livePalmesRoleQueueView = window.LivePalmesRoleQueueView || {};
const livePalmesHistoryView = window.LivePalmesHistoryView || {};
const livePalmesHistoryActionsModule = window.LivePalmesHistoryActions || {};
const livePalmesHistoryPresenterModule = window.LivePalmesHistoryPresenter || {};
const livePalmesDecisionWorkflowModule = window.LivePalmesDecisionWorkflow || {};
const livePalmesHeaderView = window.LivePalmesHeaderView || {};
const livePalmesAlertDetailView = window.LivePalmesAlertDetailView || {};
const livePalmesAlertCardView = window.LivePalmesAlertCardView || {};
const livePalmesLineStatusView = window.LivePalmesLineStatusView || {};
const livePalmesPublicProgressWorkflowModule = window.LivePalmesPublicProgressWorkflow || {};
const livePalmesAppLifecycleModule = window.LivePalmesAppLifecycle || {};

const livePalmesAppStorageWorkflow = livePalmesAppStorageWorkflowModule.init(appStorageWorkflowOptions());
let data = loadData();
const livePalmesRoleSessionWorkflow = livePalmesRoleSessionWorkflowModule.init(roleSessionWorkflowOptions());
let unlockedRoles = loadUnlockedRoles();

function roleSessionWorkflowOptions() {
  const options = {
    ACTIVE_VIEW_KEY,
    CLIENT_ID_KEY,
    data,
    firstSeriesSelectionForCurrentRace,
    HOME_AFTER_INACTIVITY_MS,
    initialProgramPosition,
    isSpeakerView,
    LAST_ACTIVITY_KEY,
    livePalmesLocalState,
    livePalmesRoleAccess,
    livePalmesRoleState,
    localStorage,
    ROLE_LABELS,
    ROLE_PINS,
    ROLE_STATES_KEY,
    UNLOCKED_ROLES_KEY
  };
  Object.defineProperty(options, "alerts", { get: () => alerts, set: (value) => { alerts = value; } });
  Object.defineProperty(options, "data", { get: () => data, set: (value) => { data = value; } });
  Object.defineProperty(options, "profileHomeActive", { get: () => profileHomeActive, set: (value) => { profileHomeActive = value; } });
  Object.defineProperty(options, "roleStates", { get: () => roleStates, set: (value) => { roleStates = value; } });
  Object.defineProperty(options, "state", { get: () => state, set: (value) => { state = value; } });
  Object.defineProperty(options, "unlockedRoles", { get: () => unlockedRoles, set: (value) => { unlockedRoles = value; } });
  return options;
}

function createRoleState(...args) { return livePalmesRoleSessionWorkflow.createRoleState(...args); }
function cloneRoleState(...args) { return livePalmesRoleSessionWorkflow.cloneRoleState(...args); }
function defaultRoleStates(...args) { return livePalmesRoleSessionWorkflow.defaultRoleStates(...args); }
function normalizeRoleState(...args) { return livePalmesRoleSessionWorkflow.normalizeRoleState(...args); }
function loadRoleStates(...args) { return livePalmesRoleSessionWorkflow.loadRoleStates(...args); }
function saveRoleStates(...args) { return livePalmesRoleSessionWorkflow.saveRoleStates(...args); }
function loadUnlockedRoles(...args) { return livePalmesRoleSessionWorkflow.loadUnlockedRoles(...args); }
function saveUnlockedRoles(...args) { return livePalmesRoleSessionWorkflow.saveUnlockedRoles(...args); }
function pinLockEnabled(...args) { return livePalmesRoleSessionWorkflow.pinLockEnabled(...args); }
function competitionModeEnabled(...args) { return livePalmesRoleSessionWorkflow.competitionModeEnabled(...args); }
function realtimeSyncEnabled(...args) { return livePalmesRoleSessionWorkflow.realtimeSyncEnabled(...args); }
function publicPositionEnabled(...args) { return livePalmesRoleSessionWorkflow.publicPositionEnabled(...args); }
function currentRolePins(...args) { return livePalmesRoleSessionWorkflow.currentRolePins(...args); }
function knownRole(...args) { return livePalmesRoleSessionWorkflow.knownRole(...args); }
function lastActivityTimestamp(...args) { return livePalmesRoleSessionWorkflow.lastActivityTimestamp(...args); }
function saveLastActivityTimestamp(...args) { return livePalmesRoleSessionWorkflow.saveLastActivityTimestamp(...args); }
function shouldReturnHomeForInactivity(...args) { return livePalmesRoleSessionWorkflow.shouldReturnHomeForInactivity(...args); }
function loadActiveView(...args) { return livePalmesRoleSessionWorkflow.loadActiveView(...args); }
function saveActiveView(...args) { return livePalmesRoleSessionWorkflow.saveActiveView(...args); }
function unlockRole(...args) { return livePalmesRoleSessionWorkflow.unlockRole(...args); }
function roleIsUnlocked(...args) { return livePalmesRoleSessionWorkflow.roleIsUnlocked(...args); }
function requestRoleAccess(...args) { return livePalmesRoleSessionWorkflow.requestRoleAccess(...args); }
function saveCurrentRoleState(...args) { return livePalmesRoleSessionWorkflow.saveCurrentRoleState(...args); }
function currentClientId(...args) { return livePalmesRoleSessionWorkflow.currentClientId(...args); }
function protectedRole(...args) { return livePalmesRoleSessionWorkflow.protectedRole(...args); }
function roleConnectionLimit(...args) { return livePalmesRoleSessionWorkflow.roleConnectionLimit(...args); }
function switchRoleUnlocked(...args) { return livePalmesRoleSessionWorkflow.switchRoleUnlocked(...args); }
function switchRole(...args) { return livePalmesRoleSessionWorkflow.switchRole(...args); }
function initializeRoleSession(...args) { return livePalmesRoleSessionWorkflow.initializeRoleSession(...args); }

let state;
let roleStates;
let alerts = loadAlerts();
let liveDismissedAlertIds = livePalmesLocalState.loadJson(LIVE_DISMISSED_ALERTS_KEY, []);
let decisionDraft = {
  type: "",
  relayLeg: "",
  lengthType: "start",
  lengthNumber: "1",
  comment: ""
};
let expandedHistories = {
  speaker: false,
  role: false
};
let historyFilters = {
  speaker: "all",
  live: "all",
  referee: "all",
  video: "all",
  computer: "all",
  secretary: "all"
};
let isFullscreenMode = Boolean(document.fullscreenElement);
let profileHomeActive = true;
let firestoreDb = null;
let firestoreUnsubscribe = null;
let liveDataUnsubscribe = null;
let resultsUnsubscribe = null;
let firestoreReady = false;
let firebaseStatus = "connecting";
let firebaseConnectionCheckRunning = false;
let lastConsoleActivityAt = Date.now();
let competitionAutoDisableRunning = false;
let applyingRemoteData = false;
let rolePinResolver = null;
let activeRoleLock = null;
let raceResults = [];
let resultsSnapshotReady = false;
let resultPdfMigrationRunning = false;
let resultPdfMigrationAttempted = false;
let currentResultImportRow = null;
let currentSessionResultsImport = null;
let resultUploadStates = new Map();
let seriesImportState = null;
let resultsAdminSession = "";
let secretaryFinalsSession = "";
let finalistAlertRepairRunning = false;
let replacementAlertRepairRunning = false;
let presenceCounts = {};
let lastPresenceWriteAt = 0;
let consolePresenceActive = false;
let lastPublicProgressSignature = "";
const activeCompetitionId = FIRESTORE_COMPETITION_ID;

const eventSelect = document.querySelector("#eventSelect");
const searchInput = document.querySelector("#searchInput");
const categorySelect = document.querySelector("#categorySelect");
const sessionControls = document.querySelector("#sessionControls");
const publicPositionToggle = document.querySelector("#publicPositionToggle");
const seriesControls = document.querySelector("#seriesControls");
const roleSwitch = document.querySelector(".role-switch");
const topActions = document.querySelector(".top-actions");
const profileHome = document.querySelector("#profileHome");
const profileModeStatus = document.querySelector("#profileModeStatus");
const profileHomeBtn = document.querySelector("#profileHomeBtn");
const manualRefreshBtn = document.querySelector("#manualRefreshBtn");
const topbar = document.querySelector(".topbar");
const appShell = document.querySelector(".app-shell");
const sidebar = document.querySelector(".sidebar");
const racePanel = document.querySelector(".race-panel");
const competitionModeTopBtn = document.querySelector("#competitionModeTopBtn");
const previousSeriesBtn = document.querySelector("#previousSeriesBtn");
const nextSeriesBtn = document.querySelector("#nextSeriesBtn");
const previousSeriesInlineBtn = document.querySelector("#previousSeriesInlineBtn");
const nextSeriesInlineBtn = document.querySelector("#nextSeriesInlineBtn");
const previousSeriesFloatBtn = document.querySelector("#previousSeriesFloatBtn");
const nextSeriesFloatBtn = document.querySelector("#nextSeriesFloatBtn");
const programBtn = document.querySelector("#programBtn");
const programFloatBtn = document.querySelector("#programFloatBtn");
const categoryField = document.querySelector(".category-field");
const lineOrderBtn = document.querySelector("#lineOrderBtn");
const entrantsBody = document.querySelector("#entrantsBody");
const entrantCount = document.querySelector("#entrantCount");
const entrantCountLabel = document.querySelector("#entrantCountLabel");
const filteredCount = document.querySelector("#filteredCount");
const bestEntry = document.querySelector("#bestEntry");
const bestEntryName = document.querySelector("#bestEntryName");
const entrantsTitle = document.querySelector("#entrantsTitle");
const entrantsSubtitle = document.querySelector("#entrantsSubtitle");
const rankHeader = document.querySelector("#rankHeader");
const swimmerHeader = document.querySelector("#swimmerHeader");
const searchLabel = document.querySelector("#searchLabel");
const entrantsTableWrap = document.querySelector(".entrants-panel .table-wrap");
const raceTitle = document.querySelector("#raceTitle");
const raceMeta = document.querySelector("#raceMeta");
const raceSexBadge = document.querySelector("#raceSexBadge");
const headerRefs = document.querySelector("#headerRefs");
const headerRefDetails = document.querySelector("#headerRefDetails");
const top2025Box = document.querySelector("#top2025Box");
const dataStatus = document.querySelector("#dataStatus");
const firebaseHeaderStatus = document.querySelector("#firebaseHeaderStatus");
const appConsoleTitle = document.querySelector("#appConsoleTitle");
const officialAlerts = document.querySelector("#officialAlerts");
const decisionPanel = document.querySelector("#decisionPanel");
const decisionModal = document.querySelector("#decisionModal");
const alertDetailModal = document.querySelector("#alertDetailModal");
const programModal = document.querySelector("#programModal");
const adminSeriesModal = document.querySelector("#adminSeriesModal");
const resultImportModal = document.querySelector("#resultImportModal");
const roleCodesModal = document.querySelector("#roleCodesModal");
const roleQueue = document.querySelector("#roleQueue");
const resultsAdminPanel = document.querySelector("#resultsAdminPanel");
const secretaryFinalsPanel = document.querySelector("#secretaryFinalsPanel");
const roleHistory = document.querySelector("#roleHistory");
const computerFooterPanel = document.querySelector("#computerFooterPanel");
const speakerHistory = document.querySelector("#speakerHistory");
const roleBadge = document.querySelector("#roleBadge");
const refereeProgressBtn = document.querySelector("#refereeProgressBtn");
const fullscreenBtn = document.querySelector("#fullscreenBtn");
const viewModeBtn = document.querySelector("#viewModeBtn");
const roleLockBtn = document.querySelector("#roleLockBtn");
const adminSeriesBtn = document.querySelector("#adminSeriesBtn");
const archivesBtn = document.querySelector("#archivesBtn");
const dataDiagnosticBtn = document.querySelector("#dataDiagnosticBtn");
const jsonInput = document.querySelector("#jsonInput");
const csvInput = document.querySelector("#csvInput");
const swimmerDetails = document.querySelector("#swimmerDetails");
const meetTitle = document.querySelector("#meetTitle");
const antoineOverlay = document.querySelector("#antoineOverlay");

function appStorageWorkflowOptions() {
  const options = {
    ALERTS_KEY,
    livePalmesLocalState,
    localStorage,
    sampleData,
    shouldKeepRecord,
    STORAGE_KEY
  };
  Object.defineProperty(options, "alerts", { get: () => alerts, set: (value) => { alerts = value; } });
  Object.defineProperty(options, "data", { get: () => data, set: (value) => { data = value; } });
  return options;
}

function loadData(...args) { return livePalmesAppStorageWorkflow.loadData(...args); }
function loadAlerts(...args) { return livePalmesAppStorageWorkflow.loadAlerts(...args); }
function saveAlerts(...args) { return livePalmesAppStorageWorkflow.saveAlerts(...args); }

function activeCompetitionDocument() {
  return competitionDocument();
}

function competitionDocument(competitionId = activeCompetitionId) {
  return livePalmesFirestoreRefs.competitionDocument(livePalmesFirebase, firestoreDb, competitionId);
}

function alertsCollection() {
  return livePalmesFirestoreRefs.collectionRef(livePalmesFirebase, firestoreDb, activeCompetitionId, "alerts");
}

function historyArchivesCollection() {
  return livePalmesFirestoreRefs.collectionRef(livePalmesFirebase, firestoreDb, activeCompetitionId, "historyArchives");
}

function resultArchivesCollection() {
  return livePalmesFirestoreRefs.collectionRef(livePalmesFirebase, firestoreDb, activeCompetitionId, "resultArchives");
}

function resultsCollection() {
  return livePalmesFirestoreRefs.collectionRef(livePalmesFirebase, firestoreDb, activeCompetitionId, "results");
}

function resultPdfsCollection() {
  return livePalmesFirestoreRefs.collectionRef(livePalmesFirebase, firestoreDb, activeCompetitionId, "resultPdfs");
}

function seriesPdfsCollection() {
  return livePalmesFirestoreRefs.collectionRef(livePalmesFirebase, firestoreDb, activeCompetitionId, "seriesPdfs");
}

function sessionResultsPdfsCollection() {
  return livePalmesFirestoreRefs.collectionRef(livePalmesFirebase, firestoreDb, activeCompetitionId, "sessionResultsPdfs");
}

function publicResultsIndexDocument() {
  return livePalmesFirestoreRefs.publicResultsIndexDocument(livePalmesFirebase, firestoreDb, activeCompetitionId);
}

function liveDataDocument(competitionId = activeCompetitionId) {
  return livePalmesFirestoreRefs.liveDataDocument(livePalmesFirebase, firestoreDb, competitionId);
}

function roleLockDocument(role) {
  return livePalmesFirestoreRefs.roleLockDocument(livePalmesFirebase, firestoreDb, activeCompetitionId, role);
}

function presenceCollection() {
  return livePalmesFirestoreRefs.collectionRef(livePalmesFirebase, firestoreDb, activeCompetitionId, "presence");
}

function presenceDocument(id = `console-${currentClientId()}`) {
  return livePalmesFirestoreRefs.presenceDocument(livePalmesFirebase, firestoreDb, activeCompetitionId, id);
}

const livePalmesPublicProgressWorkflow = livePalmesPublicProgressWorkflowModule.init(publicProgressWorkflowOptions());

function publicProgressWorkflowOptions() {
  const options = {
    data,
    document,
    finalStageLabel,
    isFinalStage,
    liveDataDocument,
    livePalmesAlerts,
    programKey,
    programRows,
    publicPositionEnabled,
    roleStates,
    selectedProgramRow,
    sexDisplayLabel,
    state,
    topbar,
    updateLiveNotes
  };
  Object.defineProperty(options, "alerts", { get: () => alerts, set: (value) => { alerts = value; } });
  Object.defineProperty(options, "data", { get: () => data, set: (value) => { data = value; } });
  Object.defineProperty(options, "lastPublicProgressSignature", { get: () => lastPublicProgressSignature, set: (value) => { lastPublicProgressSignature = value; } });
  Object.defineProperty(options, "presenceCounts", { get: () => presenceCounts, set: (value) => { presenceCounts = value; } });
  Object.defineProperty(options, "roleStates", { get: () => roleStates, set: (value) => { roleStates = value; } });
  Object.defineProperty(options, "state", { get: () => state, set: (value) => { state = value; } });
  return options;
}

function emptyPresenceCounts(...args) { return livePalmesPublicProgressWorkflow.emptyPresenceCounts(...args); }
function presenceLabel(...args) { return livePalmesPublicProgressWorkflow.presenceLabel(...args); }
function renderPresenceCounts(...args) { return livePalmesPublicProgressWorkflow.renderPresenceCounts(...args); }
function refereeProgress(...args) { return livePalmesPublicProgressWorkflow.refereeProgress(...args); }
function progressProgramRow(...args) { return livePalmesPublicProgressWorkflow.progressProgramRow(...args); }
function refereeProgressLabel(...args) { return livePalmesPublicProgressWorkflow.refereeProgressLabel(...args); }
function refereeProgressShortLabel(...args) { return livePalmesPublicProgressWorkflow.refereeProgressShortLabel(...args); }
function currentRefereeProgressPayload(...args) { return livePalmesPublicProgressWorkflow.currentRefereeProgressPayload(...args); }
function sameRefereeProgress(...args) { return livePalmesPublicProgressWorkflow.sameRefereeProgress(...args); }
function currentRefereeProgressIsHere(...args) { return livePalmesPublicProgressWorkflow.currentRefereeProgressIsHere(...args); }
function currentPublicProgressPayload(...args) { return livePalmesPublicProgressWorkflow.currentPublicProgressPayload(...args); }
function programRowForRoleState(...args) { return livePalmesPublicProgressWorkflow.programRowForRoleState(...args); }
function publicProgressPayloadFromState(...args) { return livePalmesPublicProgressWorkflow.publicProgressPayloadFromState(...args); }
function publicProgressSignature(...args) { return livePalmesPublicProgressWorkflow.publicProgressSignature(...args); }
function publishPublicProgressIfNeeded(...args) { return livePalmesPublicProgressWorkflow.publishPublicProgressIfNeeded(...args); }
function setPublicPositionEnabled(...args) { return livePalmesPublicProgressWorkflow.setPublicPositionEnabled(...args); }
function homeActionCounts(...args) { return livePalmesPublicProgressWorkflow.homeActionCounts(...args); }
function actionCountLabel(...args) { return livePalmesPublicProgressWorkflow.actionCountLabel(...args); }
function renderHomeActionCounts(...args) { return livePalmesPublicProgressWorkflow.renderHomeActionCounts(...args); }
function updateStickyAlertOffset(...args) { return livePalmesPublicProgressWorkflow.updateStickyAlertOffset(...args); }

const livePalmesConsoleSync = livePalmesConsoleSyncModule.init(consoleSyncOptions());

function consoleSyncOptions() {
  const options = {
    activeCompetitionId,
    alertsCollection,
    appendImportHistory,
    clearPublicSessionResultsPdfs,
    currentClientId,
    dataStatus,
    emptyPresenceCounts,
    finalRowsCount,
    firestoreDb,
    formatAlertTime,
    isFinalResultAlert,
    liveDataDocument,
    livePalmesAdminMaintenance,
    livePalmesFirebase,
    normalizeData,
    pinLockEnabled,
    presenceCollection,
    presenceDocument,
    profileHomeActive,
    protectedRole,
    publishPublicResultsIndex,
    render,
    renderDataStatus,
    resultPdfsCollection,
    resultsSnapshotReady,
    roleConnectionLimit,
    roleLockDocument,
    saveAlerts,
    saveData,
    saveUnlockedRoles,
    speakerAlertAlreadyResolvedByResult,
    state
  };
  Object.defineProperty(options, "activeRoleLock", { get: () => activeRoleLock, set: (value) => { activeRoleLock = value; } });
  Object.defineProperty(options, "alerts", { get: () => alerts, set: (value) => { alerts = value; } });
  Object.defineProperty(options, "applyingRemoteData", { get: () => applyingRemoteData, set: (value) => { applyingRemoteData = value; } });
  Object.defineProperty(options, "consolePresenceActive", { get: () => consolePresenceActive, set: (value) => { consolePresenceActive = value; } });
  Object.defineProperty(options, "data", { get: () => data, set: (value) => { data = value; } });
  Object.defineProperty(options, "firebaseStatus", { get: () => firebaseStatus, set: (value) => { firebaseStatus = value; } });
  Object.defineProperty(options, "lastPresenceWriteAt", { get: () => lastPresenceWriteAt, set: (value) => { lastPresenceWriteAt = value; } });
  Object.defineProperty(options, "presenceCounts", { get: () => presenceCounts, set: (value) => { presenceCounts = value; } });
  Object.defineProperty(options, "unlockedRoles", { get: () => unlockedRoles, set: (value) => { unlockedRoles = value; } });
  return options;
}

function updateConsolePresence(...args) { return livePalmesConsoleSync.updateConsolePresence(...args); }
function releaseConsolePresence(...args) { return livePalmesConsoleSync.releaseConsolePresence(...args); }
function refreshPresenceCounts(...args) { return livePalmesConsoleSync.refreshPresenceCounts(...args); }
function sanitizeAlertForFirestore(...args) { return livePalmesConsoleSync.sanitizeAlertForFirestore(...args); }
function syncAlertToFirestore(...args) { return livePalmesConsoleSync.syncAlertToFirestore(...args); }
function syncAlertToFirestoreStrict(...args) { return livePalmesConsoleSync.syncAlertToFirestoreStrict(...args); }
function syncAlertChangesToFirestore(...args) { return livePalmesConsoleSync.syncAlertChangesToFirestore(...args); }
function syncAlertChangesToFirestoreStrict(...args) { return livePalmesConsoleSync.syncAlertChangesToFirestoreStrict(...args); }
function markAlertAlreadyClosedError(...args) { return livePalmesConsoleSync.markAlertAlreadyClosedError(...args); }
function showToast(...args) { return livePalmesConsoleSync.showToast(...args); }
function isFinalResultAlert(...args) { return livePalmesConsoleSync.isFinalResultAlert(...args); }
function deleteFinalResultAlerts(...args) { return livePalmesConsoleSync.deleteFinalResultAlerts(...args); }
function cleanupOrphanFinalResultAlerts(...args) { return livePalmesConsoleSync.cleanupOrphanFinalResultAlerts(...args); }
function cleanupResolvedSpeakerResultAlerts(...args) { return livePalmesConsoleSync.cleanupResolvedSpeakerResultAlerts(...args); }
function clearFirestoreAlerts(...args) { return livePalmesConsoleSync.clearFirestoreAlerts(...args); }
function deleteCollectionDocuments(...args) { return livePalmesConsoleSync.deleteCollectionDocuments(...args); }
function publishLiveDataToFirestore(...args) { return livePalmesConsoleSync.publishLiveDataToFirestore(...args); }
function publishLiveDataToCompetition(...args) { return livePalmesConsoleSync.publishLiveDataToCompetition(...args); }
function updateLiveNotes(...args) { return livePalmesConsoleSync.updateLiveNotes(...args); }
function lockExpired(...args) { return livePalmesConsoleSync.lockExpired(...args); }
function lockLastActivityTime(...args) { return livePalmesConsoleSync.lockLastActivityTime(...args); }
function lockLooksAbandoned(...args) { return livePalmesConsoleSync.lockLooksAbandoned(...args); }
function releaseRoleLock(...args) { return livePalmesConsoleSync.releaseRoleLock(...args); }
function acquireRoleLock(...args) { return livePalmesConsoleSync.acquireRoleLock(...args); }
function heartbeatRoleLock(...args) { return livePalmesConsoleSync.heartbeatRoleLock(...args); }
function mergeRemoteLiveData(...args) { return livePalmesConsoleSync.mergeRemoteLiveData(...args); }
function applyRemoteLiveData(...args) { return livePalmesConsoleSync.applyRemoteLiveData(...args); }

const livePalmesAdminActions = livePalmesAdminActionsModule.init(adminActionsOptions());

function adminActionsOptions() {
  const options = {
    ROLE_LABELS,
    closeRoleCodesModal,
    competitionModeEnabled,
    currentRolePins,
    ensureResultsAdminSession,
    formatAlertDateTime,
    historyArchivesCollection,
    initFirebaseSync,
    livePalmesAdminModals,
    normalizeData,
    pinLockEnabled,
    publishLiveDataToFirestore,
    publishPublicResultsIndex,
    render,
    renderDataStatus,
    resultArchivesCollection,
    resultSessions,
    roleCodesModal,
    roleIsUnlocked,
    saveData,
    saveUnlockedRoles,
    updateLiveNotes
  };
  Object.defineProperty(options, "data", { get: () => data, set: (value) => { data = value; } });
  Object.defineProperty(options, "lastConsoleActivityAt", { get: () => lastConsoleActivityAt, set: (value) => { lastConsoleActivityAt = value; } });
  Object.defineProperty(options, "rolePinResolver", { get: () => rolePinResolver, set: (value) => { rolePinResolver = value; } });
  Object.defineProperty(options, "unlockedRoles", { get: () => unlockedRoles, set: (value) => { unlockedRoles = value; } });
  return options;
}

function renderRoleCodesModal(...args) { return livePalmesAdminActions.renderRoleCodesModal(...args); }
function renderRoleCodesAdminModal(...args) { return livePalmesAdminActions.renderRoleCodesAdminModal(...args); }
function renderResetHistoryModal(...args) { return livePalmesAdminActions.renderResetHistoryModal(...args); }
function renderResetResultsModal(...args) { return livePalmesAdminActions.renderResetResultsModal(...args); }
function renderPublicSessionInfosModal(...args) { return livePalmesAdminActions.renderPublicSessionInfosModal(...args); }
function renderHistoryArchivesModal(...args) { return livePalmesAdminActions.renderHistoryArchivesModal(...args); }
function renderRolePinModal(...args) { return livePalmesAdminActions.renderRolePinModal(...args); }
function askRolePin(...args) { return livePalmesAdminActions.askRolePin(...args); }
function finishRolePin(...args) { return livePalmesAdminActions.finishRolePin(...args); }
function closeRoleCodesModal(...args) { return livePalmesAdminActions.closeRoleCodesModal(...args); }
function readRolePinsFromModal(...args) { return livePalmesAdminActions.readRolePinsFromModal(...args); }
function saveRoleCodesFromModal(...args) { return livePalmesAdminActions.saveRoleCodesFromModal(...args); }
function togglePublicResultsOnline(...args) { return livePalmesAdminActions.togglePublicResultsOnline(...args); }
function toggleRoleLock(...args) { return livePalmesAdminActions.toggleRoleLock(...args); }
function toggleCompetitionMode(...args) { return livePalmesAdminActions.toggleCompetitionMode(...args); }

const livePalmesRealtimeSync = livePalmesRealtimeSyncModule.init(livePalmesRealtimeSyncOptions());

function livePalmesRealtimeSyncOptions() {
  const options = {
    alertsCollection,
    applyRemoteLiveData,
    cleanupOrphanFinalResultAlerts,
    cleanupResolvedSpeakerResultAlerts,
    competitionModeEnabled,
    COMPETITION_INACTIVITY_MS,
    ensurePendingFinalistsSpeakerAlerts,
    ensurePendingReplacementSpeakerAlerts,
    FIREBASE_CONFIG,
    liveDataDocument,
    migrateResultPdfsOutOfResults,
    normalizeData,
    publishPublicResultsIndex,
    realtimeSyncEnabled,
    refreshPresenceCounts,
    releaseConsolePresence,
    releaseRoleLock,
    render,
    renderDataStatus,
    renderResultsAdminPanel,
    resultsCollection,
    resultWithoutPdf,
    saveAlerts,
    saveCurrentRoleState,
    saveData,
    saveLastActivityTimestamp,
    saveUnlockedRoles,
    shouldReturnHomeForInactivity,
    state,
    updateLiveNotes,
    window
  };
  Object.defineProperty(options, "alerts", { get: () => alerts, set: (value) => { alerts = value; } });
  Object.defineProperty(options, "competitionAutoDisableRunning", { get: () => competitionAutoDisableRunning, set: (value) => { competitionAutoDisableRunning = value; } });
  Object.defineProperty(options, "data", { get: () => data, set: (value) => { data = value; } });
  Object.defineProperty(options, "firebaseConnectionCheckRunning", { get: () => firebaseConnectionCheckRunning, set: (value) => { firebaseConnectionCheckRunning = value; } });
  Object.defineProperty(options, "firebaseStatus", { get: () => firebaseStatus, set: (value) => { firebaseStatus = value; } });
  Object.defineProperty(options, "firestoreDb", { get: () => firestoreDb, set: (value) => { firestoreDb = value; } });
  Object.defineProperty(options, "firestoreReady", { get: () => firestoreReady, set: (value) => { firestoreReady = value; } });
  Object.defineProperty(options, "firestoreUnsubscribe", { get: () => firestoreUnsubscribe, set: (value) => { firestoreUnsubscribe = value; } });
  Object.defineProperty(options, "lastConsoleActivityAt", { get: () => lastConsoleActivityAt, set: (value) => { lastConsoleActivityAt = value; } });
  Object.defineProperty(options, "liveDataUnsubscribe", { get: () => liveDataUnsubscribe, set: (value) => { liveDataUnsubscribe = value; } });
  Object.defineProperty(options, "profileHomeActive", { get: () => profileHomeActive, set: (value) => { profileHomeActive = value; } });
  Object.defineProperty(options, "raceResults", { get: () => raceResults, set: (value) => { raceResults = value; } });
  Object.defineProperty(options, "resultsSnapshotReady", { get: () => resultsSnapshotReady, set: (value) => { resultsSnapshotReady = value; } });
  Object.defineProperty(options, "resultsUnsubscribe", { get: () => resultsUnsubscribe, set: (value) => { resultsUnsubscribe = value; } });
  Object.defineProperty(options, "state", { get: () => state, set: (value) => { state = value; } });
  Object.defineProperty(options, "unlockedRoles", { get: () => unlockedRoles, set: (value) => { unlockedRoles = value; } });
  return options;
}

function endCompetitionSession(...args) { return livePalmesRealtimeSync.endCompetitionSession(...args); }
function markConsoleActivity(...args) { return livePalmesRealtimeSync.markConsoleActivity(...args); }
function returnHomeAfterLocalInactivity(...args) { return livePalmesRealtimeSync.returnHomeAfterLocalInactivity(...args); }
function disableCompetitionModeAfterInactivity(...args) { return livePalmesRealtimeSync.disableCompetitionModeAfterInactivity(...args); }
function stopFirebaseRealtimeSync(...args) { return livePalmesRealtimeSync.stopFirebaseRealtimeSync(...args); }
function applyResultsSnapshot(...args) { return livePalmesRealtimeSync.applyResultsSnapshot(...args); }
function startCompetitionSync(...args) { return livePalmesRealtimeSync.startCompetitionSync(...args); }
function refreshFirebaseOnce(...args) { return livePalmesRealtimeSync.refreshFirebaseOnce(...args); }
function initFirebaseSync(...args) { return livePalmesRealtimeSync.initFirebaseSync(...args); }
function checkFirebaseConnection(...args) { return livePalmesRealtimeSync.checkFirebaseConnection(...args); }

const livePalmesHistoryActions = livePalmesHistoryActionsModule.init(historyActionsOptions());

function historyActionsOptions() {
  const options = {
    LIVE_DISMISSED_ALERTS_KEY,
    buildPublicResultsIndex,
    clearFirestoreAlerts,
    data,
    dsqReportRows,
    firestoreDb,
    historyArchivesCollection,
    render,
    renderOfficialAlerts,
    renderResetHistoryModal,
    resultArchivesCollection,
    resultWithoutPdf,
    raceResults,
    sanitizeAlertForFirestore,
    saveAlerts,
    saveLiveDismissedAlerts
  };
  Object.defineProperty(options, "alerts", { get: () => alerts, set: (value) => { alerts = value; } });
  Object.defineProperty(options, "data", { get: () => data, set: (value) => { data = value; } });
  Object.defineProperty(options, "liveDismissedAlertIds", { get: () => liveDismissedAlertIds, set: (value) => { liveDismissedAlertIds = value; } });
  Object.defineProperty(options, "raceResults", { get: () => raceResults, set: (value) => { raceResults = value; } });
  return options;
}

function loadLiveDismissedAlerts(...args) { return livePalmesHistoryActions.loadLiveDismissedAlerts(...args); }
function saveLiveDismissedAlerts(...args) { return livePalmesHistoryActions.saveLiveDismissedAlerts(...args); }
function archiveCurrentHistory(...args) { return livePalmesHistoryActions.archiveCurrentHistory(...args); }
function archiveCurrentResults(...args) { return livePalmesHistoryActions.archiveCurrentResults(...args); }
function resetHistory(...args) { return livePalmesHistoryActions.resetHistory(...args); }
function performResetHistoryWithArchive(...args) { return livePalmesHistoryActions.performResetHistoryWithArchive(...args); }
function clearHistoryAndAlertsForFullImport(...args) { return livePalmesHistoryActions.clearHistoryAndAlertsForFullImport(...args); }
function dismissLiveAlert(...args) { return livePalmesHistoryActions.dismissLiveAlert(...args); }

function normalizeData(...args) { return livePalmesAppStorageWorkflow.normalizeData(...args); }
function saveData(...args) { return livePalmesAppStorageWorkflow.saveData(...args); }
function resultWithoutPdf(...args) { return livePalmesResults.resultWithoutPdf(...args); }
function resultMetadataPayload(...args) { return livePalmesResults.resultMetadataPayload(...args); }
function dataUrlApproxBytes(...args) { return livePalmesDiagnostics.dataUrlApproxBytes(...args); }
function formatByteSize(...args) { return livePalmesDiagnostics.formatByteSize(...args); }
function performanceDiagnosticLines(...args) { return livePalmesDiagnostics.performanceDiagnosticLines(...args); }

const livePalmesTime = window.LivePalmesTime;
const livePalmesPeople = window.LivePalmesPeople;
const timeToMs = livePalmesTime.timeToMs.bind(livePalmesTime);
const formatGap = livePalmesTime.formatGap.bind(livePalmesTime);
const importedSeriesTime = livePalmesTime.importedSeriesTime.bind(livePalmesTime);
const formatPersonNameParts = livePalmesPeople.formatPersonNameParts.bind(livePalmesPeople);
const getBirthYear = livePalmesPeople.getBirthYear.bind(livePalmesPeople);
const getBirthYearLabel = livePalmesPeople.getBirthYearLabel.bind(livePalmesPeople);
const normalizePersonName = livePalmesPeople.normalizePersonName.bind(livePalmesPeople);
const formatRank = livePalmesPeople.formatRank.bind(livePalmesPeople);
const entrantKey = livePalmesPeople.entrantKey.bind(livePalmesPeople);
const sameCategory = livePalmesPeople.sameCategory.bind(livePalmesPeople);
const categoryClass = livePalmesPeople.categoryClass.bind(livePalmesPeople);

const livePalmesEntrantHelpers = livePalmesEntrantHelpersModule.init(entrantHelperOptions());

function entrantHelperOptions() {
  const options = {
    categorySelect,
    formatPersonNameParts,
    isFemaleContext,
    isRelayEntrant,
    normalizePersonName,
    searchInput,
    state
  };
  Object.defineProperty(options, "state", { get: () => state, set: (value) => { state = value; } });
  return options;
}

function formatName(...args) { return livePalmesEntrantHelpers.formatName(...args); }
function formatDisplayName(...args) { return livePalmesEntrantHelpers.formatDisplayName(...args); }
function formatSeriesDisplayName(...args) { return livePalmesEntrantHelpers.formatSeriesDisplayName(...args); }
function clearSearch(...args) { return livePalmesEntrantHelpers.clearSearch(...args); }
function isSpeakerView(...args) { return livePalmesEntrantHelpers.isSpeakerView(...args); }
function shortClubName(...args) { return livePalmesEntrantHelpers.shortClubName(...args); }
function entrantPersonKey(...args) { return livePalmesEntrantHelpers.entrantPersonKey(...args); }

function programNavigationOptions() {
  return {
    clearSearch,
    data,
    entrantKey,
    escapeHtml,
    eventSelect,
    isLastProgramPartForRace,
    isRelayEntrant,
    normalizePdfLabel,
    sameCategory,
    sheetSex,
    state,
    timeToMs
  };
}
function currentEvent(...args) { return livePalmesProgramNavigation.currentEvent(...args, programNavigationOptions()); }
function matchesRace(...args) { return livePalmesProgramNavigation.matchesRace(...args, programNavigationOptions()); }
function comparableEventId(...args) { return livePalmesProgramNavigation.comparableEventId(...args, programNavigationOptions()); }
function eventSignature(...args) { return livePalmesProgramNavigation.eventSignature(...args, programNavigationOptions()); }
function recordEventMatches(...args) { return livePalmesProgramNavigation.recordEventMatches(...args, programNavigationOptions()); }
function recordMatchesRace(...args) { return livePalmesProgramNavigation.recordMatchesRace(...args, programNavigationOptions()); }
function isFinalStage(...args) { return livePalmesProgramNavigation.isFinalStage(...args, programNavigationOptions()); }
function finalStageLabel(...args) { return livePalmesProgramNavigation.finalStageLabel(...args, programNavigationOptions()); }
function isFemaleContext(...args) { return livePalmesProgramNavigation.isFemaleContext(...args, programNavigationOptions()); }
function sexDisplayLabel(...args) { return livePalmesProgramNavigation.sexDisplayLabel(...args, programNavigationOptions()); }
function categoryLabel(...args) { return livePalmesProgramNavigation.categoryLabel(...args, programNavigationOptions()); }
function entrantWord(...args) { return livePalmesProgramNavigation.entrantWord(...args, programNavigationOptions()); }
function swimmerWord(...args) { return livePalmesProgramNavigation.swimmerWord(...args, programNavigationOptions()); }
function displayedWord(...args) { return livePalmesProgramNavigation.displayedWord(...args, programNavigationOptions()); }
function availableSexesForEvent(...args) { return livePalmesProgramNavigation.availableSexesForEvent(...args, programNavigationOptions()); }
function raceEntrants(...args) { return livePalmesProgramNavigation.raceEntrants(...args, programNavigationOptions()); }
function raceEntrantsForStats(...args) { return livePalmesProgramNavigation.raceEntrantsForStats(...args, programNavigationOptions()); }
function updateEventSelect(...args) { return livePalmesProgramNavigation.updateEventSelect(...args, programNavigationOptions()); }
function raceOptionKey(...args) { return livePalmesProgramNavigation.raceOptionKey(...args, programNavigationOptions()); }
function raceProgramRowsForOption(...args) { return livePalmesProgramNavigation.raceProgramRowsForOption(...args, programNavigationOptions()); }
function seriesNumbersForRaceOption(...args) { return livePalmesProgramNavigation.seriesNumbersForRaceOption(...args, programNavigationOptions()); }
function finalRowsForRaceOption(...args) { return livePalmesProgramNavigation.finalRowsForRaceOption(...args, programNavigationOptions()); }
function raceOptionPhaseLabel(...args) { return livePalmesProgramNavigation.raceOptionPhaseLabel(...args, programNavigationOptions()); }
function programRowFromRaceOption(...args) { return livePalmesProgramNavigation.programRowFromRaceOption(...args, programNavigationOptions()); }
function programKey(...args) { return livePalmesProgramNavigation.programKey(...args, programNavigationOptions()); }
function programLabel(...args) { return livePalmesProgramNavigation.programLabel(...args, programNavigationOptions()); }
function selectedProgramRow(...args) { return livePalmesProgramNavigation.selectedProgramRow(...args, programNavigationOptions()); }
function applyProgramRow(...args) { return livePalmesProgramNavigation.applyProgramRow(...args, programNavigationOptions()); }
function sessionRows(...args) { return livePalmesProgramNavigation.sessionRows(...args, programNavigationOptions()); }
function firstSessionNumber(...args) { return livePalmesProgramNavigation.firstSessionNumber(...args, programNavigationOptions()); }
function preferredInitialSession(...args) { return livePalmesProgramNavigation.preferredInitialSession(...args, programNavigationOptions()); }
function firstProgramRowForSession(...args) { return livePalmesProgramNavigation.firstProgramRowForSession(...args, programNavigationOptions()); }
function firstSeriesForRace(...args) { return livePalmesProgramNavigation.firstSeriesForRace(...args, programNavigationOptions()); }
function initialProgramPosition(...args) { return livePalmesProgramNavigation.initialProgramPosition(...args, programNavigationOptions()); }
function normalizeLivePosition(...args) { return livePalmesProgramNavigation.normalizeLivePosition(...args, programNavigationOptions()); }
function programRowsForSession(...args) { return livePalmesProgramNavigation.programRowsForSession(...args, programNavigationOptions()); }
function programRows(...args) { return livePalmesProgramNavigation.programRows(...args, programNavigationOptions()); }
function currentProgramIndex(...args) { return livePalmesProgramNavigation.currentProgramIndex(...args, programNavigationOptions()); }
function isLastRaceOfCurrentSession(...args) { return livePalmesProgramNavigation.isLastRaceOfCurrentSession(...args, programNavigationOptions()); }
function isLastSeriesOfCurrentSession(...args) { return livePalmesProgramNavigation.isLastSeriesOfCurrentSession(...args, programNavigationOptions()); }
function isSplitRaceAcrossSessions(...args) { return livePalmesProgramNavigation.isSplitRaceAcrossSessions(...args, programNavigationOptions()); }
function shouldShowSplitRaceNote(...args) { return livePalmesProgramNavigation.shouldShowSplitRaceNote(...args, programNavigationOptions()); }
function splitRaceNote(...args) { return livePalmesProgramNavigation.splitRaceNote(...args, programNavigationOptions()); }
function raceSeries(...args) { return livePalmesProgramNavigation.raceSeries(...args, programNavigationOptions()); }
function raceSeriesFor(...args) { return livePalmesProgramNavigation.raceSeriesFor(...args, programNavigationOptions()); }
function availableSeriesNumbers(...args) { return livePalmesProgramNavigation.availableSeriesNumbers(...args, programNavigationOptions()); }
function selectedSeriesTime(...args) { return livePalmesProgramNavigation.selectedSeriesTime(...args, programNavigationOptions()); }
function selectedSeriesLabel(...args) { return livePalmesProgramNavigation.selectedSeriesLabel(...args, programNavigationOptions()); }
function compactRaceTitle(...args) { return livePalmesProgramNavigation.compactRaceTitle(...args, programNavigationOptions()); }
function hasNextProgramSeries(...args) { return livePalmesProgramNavigation.hasNextProgramSeries(...args, programNavigationOptions()); }
function hasPreviousProgramSeries(...args) { return livePalmesProgramNavigation.hasPreviousProgramSeries(...args, programNavigationOptions()); }
function goToNextProgramRace(...args) { return livePalmesProgramNavigation.goToNextProgramRace(...args, programNavigationOptions()); }
function goToPreviousProgramRace(...args) { return livePalmesProgramNavigation.goToPreviousProgramRace(...args, programNavigationOptions()); }
function currentSeriesRows(...args) { return livePalmesProgramNavigation.currentSeriesRows(...args, programNavigationOptions()); }
function hasRowsForProgram(...args) { return livePalmesProgramNavigation.hasRowsForProgram(...args, programNavigationOptions()); }
function programRowsForCurrentRace(...args) { return livePalmesProgramNavigation.programRowsForCurrentRace(...args, programNavigationOptions()); }
function finalProgramRowsForRace(...args) { return livePalmesProgramNavigation.finalProgramRowsForRace(...args, programNavigationOptions()); }
function firstSeriesSelectionForCurrentRace(...args) { return livePalmesProgramNavigation.firstSeriesSelectionForCurrentRace(...args, programNavigationOptions()); }
function lastSeriesSelectionForCurrentRace(...args) { return livePalmesProgramNavigation.lastSeriesSelectionForCurrentRace(...args, programNavigationOptions()); }

const initialRoleSession = initializeRoleSession();
state = initialRoleSession.state;
roleStates = initialRoleSession.roleStates;
unlockedRoles = initialRoleSession.unlockedRoles;
profileHomeActive = initialRoleSession.profileHomeActive;

const livePalmesConsoleRenderWorkflow = livePalmesConsoleRenderWorkflowModule.init(consoleRenderWorkflowOptions());

function consoleRenderWorkflowOptions() {
  const options = {
    adminSeriesBtn,
    appConsoleTitle,
    appShell,
    archivesBtn,
    availableSexesForEvent,
    categoryField,
    competitionModeEnabled,
    competitionModeTopBtn,
    data,
    document,
    escapeHtml,
    filteredCount,
    firestoreDb,
    fullscreenBtn,
    isFullscreenMode,
    lineOrderBtn,
    manualRefreshBtn,
    meetTitle,
    normalizeLivePosition,
    pinLockEnabled,
    preferredInitialSession,
    previousSeriesInlineBtn,
    profileHome,
    profileHomeActive,
    profileHomeBtn,
    profileModeStatus,
    programBtn,
    publicPositionEnabled,
    publicPositionToggle,
    publishPublicProgressIfNeeded,
    realtimeSyncEnabled,
    renderCategorySelect,
    renderDataStatus,
    renderEntrants,
    renderHeader,
    renderHeaderReferences,
    renderHomeActionCounts,
    renderPresenceCounts,
    renderProgramButtons,
    renderRolePanels,
    renderSeriesControls,
    renderTop2025,
    ROLE_LABELS,
    roleBadge,
    roleLockBtn,
    saveActiveView,
    saveCurrentRoleState,
    sessionControls,
    sessionRows,
    sidebar,
    state,
    updateEventSelect,
    updateStickyAlertOffset,
    viewModeBtn
  };
  Object.defineProperty(options, "data", { get: () => data, set: (value) => { data = value; } });
  Object.defineProperty(options, "firestoreDb", { get: () => firestoreDb, set: (value) => { firestoreDb = value; } });
  Object.defineProperty(options, "isFullscreenMode", { get: () => isFullscreenMode, set: (value) => { isFullscreenMode = value; } });
  Object.defineProperty(options, "profileHomeActive", { get: () => profileHomeActive, set: (value) => { profileHomeActive = value; } });
  Object.defineProperty(options, "state", { get: () => state, set: (value) => { state = value; } });
  return options;
}

function render(...args) { return livePalmesConsoleRenderWorkflow.render(...args); }
function syncProgramButtonPlacement(...args) { return livePalmesConsoleRenderWorkflow.syncProgramButtonPlacement(...args); }
function syncLineOrderButtonPlacement(...args) { return livePalmesConsoleRenderWorkflow.syncLineOrderButtonPlacement(...args); }
function renderSessionControls(...args) { return livePalmesConsoleRenderWorkflow.renderSessionControls(...args); }

const livePalmesAlertPresenter = livePalmesAlertPresenterModule.init(alertPresenterOptions());

function alertPresenterOptions() {
  const options = {
    alerts,
    DECISION_LABELS,
    SPEAKER_DECISION_REASONS,
    data,
    liveDismissedAlertIds,
    livePalmesAlertCardView,
    livePalmesAlerts,
    livePalmesLineStatusView,
    raceResults,
    state,
    compareAlertsForAction,
    entrantKey,
    finalRowsCount,
    finalStageLabel,
    formatAlertTime,
    formatPersonNameParts,
    isFinalStage,
    isSpeakerView,
    normalizeFinalistsOrder,
    renderComputerFooterPanel,
    renderDecisionPanel,
    renderOfficialAlerts,
    renderResultsAdminPanel,
    renderRoleHistory,
    renderRoleQueue,
    renderSecretaryFinalsPanel,
    renderSpeakerHistory,
    resultForProgramRow,
    sexDisplayLabel
  };
  Object.defineProperty(options, "alerts", { get: () => alerts, set: (value) => { alerts = value; } });
  Object.defineProperty(options, "data", { get: () => data, set: (value) => { data = value; } });
  Object.defineProperty(options, "liveDismissedAlertIds", { get: () => liveDismissedAlertIds, set: (value) => { liveDismissedAlertIds = value; } });
  Object.defineProperty(options, "raceResults", { get: () => raceResults, set: (value) => { raceResults = value; } });
  Object.defineProperty(options, "state", { get: () => state, set: (value) => { state = value; } });
  return options;
}

function currentRoleAlertFilter(...args) { return livePalmesAlertPresenter.currentRoleAlertFilter(...args); }
function speakerAlertAlreadyResolvedByResult(...args) { return livePalmesAlertPresenter.speakerAlertAlreadyResolvedByResult(...args); }
function isRequalificationAlert(...args) { return livePalmesAlertPresenter.isRequalificationAlert(...args); }
function alertRaceLabel(...args) { return livePalmesAlertPresenter.alertRaceLabel(...args); }
function alertSwimmerLabel(...args) { return livePalmesAlertPresenter.alertSwimmerLabel(...args); }
function alertIdentityLabel(...args) { return livePalmesAlertPresenter.alertIdentityLabel(...args); }
function fullAlertIdentityLabel(...args) { return livePalmesAlertPresenter.fullAlertIdentityLabel(...args); }
function alertClubShortLabel(...args) { return livePalmesAlertPresenter.alertClubShortLabel(...args); }
function alertDetailLabel(...args) { return livePalmesAlertPresenter.alertDetailLabel(...args); }
function alertCommentLabel(...args) { return livePalmesAlertPresenter.alertCommentLabel(...args); }
function decisionMotifLabel(...args) { return livePalmesAlertPresenter.decisionMotifLabel(...args); }
function speakerAlertSentence(...args) { return livePalmesAlertPresenter.speakerAlertSentence(...args); }
function isDsqAlert(...args) { return livePalmesAlertPresenter.isDsqAlert(...args); }
function activeDsqAlertsForEntrant(...args) { return livePalmesAlertPresenter.activeDsqAlertsForEntrant(...args); }
function activeLineAlertsForEntrant(...args) { return livePalmesAlertPresenter.activeLineAlertsForEntrant(...args); }
function alertLineCode(...args) { return livePalmesAlertPresenter.alertLineCode(...args); }
function renderLineAlertBadges(...args) { return livePalmesAlertPresenter.renderLineAlertBadges(...args); }
function terminalLineStatus(...args) { return livePalmesAlertPresenter.terminalLineStatus(...args); }
function importedLineStatusLabel(...args) { return livePalmesAlertPresenter.importedLineStatusLabel(...args); }
function renderImportedLineStatusBadge(...args) { return livePalmesAlertPresenter.renderImportedLineStatusBadge(...args); }
function renderLineTimeStatus(...args) { return livePalmesAlertPresenter.renderLineTimeStatus(...args); }
function finalistRowName(...args) { return livePalmesAlertPresenter.finalistRowName(...args); }
function finalRowsForAnnouncementAlert(...args) { return livePalmesAlertPresenter.finalRowsForAnnouncementAlert(...args); }
function renderFinalistsAlertList(...args) { return livePalmesAlertPresenter.renderFinalistsAlertList(...args); }
function alertPriority(...args) { return livePalmesAlertPresenter.alertPriority(...args); }
function alertPriorityMeta(...args) { return livePalmesAlertPresenter.alertPriorityMeta(...args); }
function compareAlertsForAction(...args) { return livePalmesAlertPresenter.compareAlertsForAction(...args); }
function historySentence(...args) { return livePalmesAlertPresenter.historySentence(...args); }
function renderAlertCard(...args) { return livePalmesAlertPresenter.renderAlertCard(...args); }
function renderVideoInfoCard(...args) { return livePalmesAlertPresenter.renderVideoInfoCard(...args); }
function renderRolePanels(...args) { return livePalmesAlertPresenter.renderRolePanels(...args); }

function resultsAdminWorkflowOptions() {
  const options = {
    activeCompetitionId,
    alertPendingBreakdown,
    alerts,
    appendImportHistory,
    categoryLabel,
    clearPublishedResults,
    competitionDocument,
    competitionModeEnabled,
    countCollectionDocuments,
    data,
    deleteFinalResultAlerts,
    deleteResultPdfPayload,
    emptyPresenceCounts,
    escapeHtml,
    finalCompositionIsDefinitive,
    finalCompositionPendingDeadlineLabel,
    finalResultSessions,
    finalRowsCount,
    firestoreDb,
    formatAlertDateTime,
    formatByteSize,
    formatDeadlineTime,
    formatRank,
    isFinalStage,
    livePalmesAdminDiagnostics,
    livePalmesAdminResults,
    livePalmesPublication,
    programKey,
    programRows,
    publicResultsIndexDocument,
    raceOptionKey,
    raceResults,
    renderDataStatus,
    resultArchivesCollection,
    resultHasDetailsForDiagnostic,
    resultPdfMigrationRunning,
    resultPdfsCollection,
    resultUploadStates,
    resultsAdminPanel,
    safeCountCollection,
    safeDocumentData,
    sessionResultsPdfsCollection,
    seriesPdfsCollection,
    sexDisplayLabel,
    showToast,
    state,
    updateLiveNotes
  };
  Object.defineProperty(options, "resultsAdminSession", { get: () => resultsAdminSession, set: (value) => { resultsAdminSession = value; } });
  Object.defineProperty(options, "seriesImportState", { get: () => seriesImportState, set: (value) => { seriesImportState = value; } });
  return options;
}

function resultIdForProgramRow(...args) { return livePalmesResultsAdminWorkflow.resultIdForProgramRow(...args, resultsAdminWorkflowOptions()); }
function resultForProgramRow(...args) { return livePalmesResultsAdminWorkflow.resultForProgramRow(...args, resultsAdminWorkflowOptions()); }
function resultPdfPayload(...args) { return livePalmesResultsAdminWorkflow.resultPdfPayload(...args, resultsAdminWorkflowOptions()); }
function publicResultPayload(...args) { return livePalmesResultsAdminWorkflow.publicResultPayload(...args, resultsAdminWorkflowOptions()); }
function buildPublicResultsIndex(...args) { return livePalmesResultsAdminWorkflow.buildPublicResultsIndex(...args, resultsAdminWorkflowOptions()); }
function publishPublicResultsIndex(...args) { return livePalmesResultsAdminWorkflow.publishPublicResultsIndex(...args, resultsAdminWorkflowOptions()); }
function publicSeriesPdfId(...args) { return livePalmesResultsAdminWorkflow.publicSeriesPdfId(...args, resultsAdminWorkflowOptions()); }
function updatePublicSeriesPdfMetadata(...args) { return livePalmesResultsAdminWorkflow.updatePublicSeriesPdfMetadata(...args, resultsAdminWorkflowOptions()); }
function clearPublicSeriesPdfMetadata(...args) { return livePalmesResultsAdminWorkflow.clearPublicSeriesPdfMetadata(...args, resultsAdminWorkflowOptions()); }
function hydratePublicSeriesPdfMetadataIfNeeded(...args) { return livePalmesResultsAdminWorkflow.hydratePublicSeriesPdfMetadataIfNeeded(...args, resultsAdminWorkflowOptions()); }
function clearPublicSeriesPdfs(...args) { return livePalmesResultsAdminWorkflow.clearPublicSeriesPdfs(...args, resultsAdminWorkflowOptions()); }
function clearPublicSessionResultsPdfMetadata(...args) { return livePalmesResultsAdminWorkflow.clearPublicSessionResultsPdfMetadata(...args, resultsAdminWorkflowOptions()); }
function clearPublicSessionResultsPdfs(...args) { return livePalmesResultsAdminWorkflow.clearPublicSessionResultsPdfs(...args, resultsAdminWorkflowOptions()); }
function clearPublicSessionResultsPdfsForSession(...args) { return livePalmesResultsAdminWorkflow.clearPublicSessionResultsPdfsForSession(...args, resultsAdminWorkflowOptions()); }
function publishPublicSeriesPdf(...args) { return livePalmesResultsAdminWorkflow.publishPublicSeriesPdf(...args, resultsAdminWorkflowOptions()); }
function sessionResultsPdfId(...args) { return livePalmesResultsAdminWorkflow.sessionResultsPdfId(...args, resultsAdminWorkflowOptions()); }
function updatePublicSessionResultsPdfMetadata(...args) { return livePalmesResultsAdminWorkflow.updatePublicSessionResultsPdfMetadata(...args, resultsAdminWorkflowOptions()); }
function hydratePublicSessionResultsPdfMetadataIfNeeded(...args) { return livePalmesResultsAdminWorkflow.hydratePublicSessionResultsPdfMetadataIfNeeded(...args, resultsAdminWorkflowOptions()); }
function publishSessionResultsPdf(...args) { return livePalmesResultsAdminWorkflow.publishSessionResultsPdf(...args, resultsAdminWorkflowOptions()); }
function isLastProgramPartForRace(...args) { return livePalmesResultsAdminWorkflow.isLastProgramPartForRace(...args, resultsAdminWorkflowOptions()); }
function resultSessions(...args) { return livePalmesResultsAdminWorkflow.resultSessions(...args, resultsAdminWorkflowOptions()); }
function sessionResultsPdfsForAdminSession(...args) { return livePalmesResultsAdminWorkflow.sessionResultsPdfsForAdminSession(...args, resultsAdminWorkflowOptions()); }
function latestResultSession(...args) { return livePalmesResultsAdminWorkflow.latestResultSession(...args, resultsAdminWorkflowOptions()); }
function ensureResultsAdminSession(...args) { return livePalmesResultsAdminWorkflow.ensureResultsAdminSession(...args, resultsAdminWorkflowOptions()); }
function resultProgramRows(...args) { return livePalmesResultsAdminWorkflow.resultProgramRows(...args, resultsAdminWorkflowOptions()); }
function resultPhaseLabelForProgramRow(...args) { return livePalmesResultsAdminWorkflow.resultPhaseLabelForProgramRow(...args, resultsAdminWorkflowOptions()); }
function resultStatusForProgramRow(...args) { return livePalmesResultsAdminWorkflow.resultStatusForProgramRow(...args, resultsAdminWorkflowOptions()); }
function resultStatusBadgeForProgramRow(...args) { return livePalmesResultsAdminWorkflow.resultStatusBadgeForProgramRow(...args, resultsAdminWorkflowOptions()); }
function resultStatusControlHtml(...args) { return livePalmesResultsAdminWorkflow.resultStatusControlHtml(...args, resultsAdminWorkflowOptions()); }
function resultUploadKeyForProgram(...args) { return livePalmesResultsAdminWorkflow.resultUploadKeyForProgram(...args, resultsAdminWorkflowOptions()); }
function resultUploadKeyForSessionResults(...args) { return livePalmesResultsAdminWorkflow.resultUploadKeyForSessionResults(...args, resultsAdminWorkflowOptions()); }
function setResultUploadState(...args) { return livePalmesResultsAdminWorkflow.setResultUploadState(...args, resultsAdminWorkflowOptions()); }
function clearResultUploadState(...args) { return livePalmesResultsAdminWorkflow.clearResultUploadState(...args, resultsAdminWorkflowOptions()); }
function setSeriesImportState(...args) { return livePalmesResultsAdminWorkflow.setSeriesImportState(...args, resultsAdminWorkflowOptions()); }
function clearSeriesImportState(...args) { return livePalmesResultsAdminWorkflow.clearSeriesImportState(...args, resultsAdminWorkflowOptions()); }
function resultUploadBadgeHtml(...args) { return livePalmesResultsAdminWorkflow.resultUploadBadgeHtml(...args, resultsAdminWorkflowOptions()); }
function renderResultsAdminPanel(...args) { return livePalmesResultsAdminWorkflow.renderResultsAdminPanel(...args, resultsAdminWorkflowOptions()); }
function renderCompetitionDiagnostic(...args) { return livePalmesResultsAdminWorkflow.renderCompetitionDiagnostic(...args, resultsAdminWorkflowOptions()); }
function renderComputerFooterPanel(...args) { return livePalmesResultsAdminWorkflow.renderComputerFooterPanel(...args, resultsAdminWorkflowOptions()); }
function renderSessionResultsImportRow(...args) { return livePalmesResultsAdminWorkflow.renderSessionResultsImportRow(...args, resultsAdminWorkflowOptions()); }
function renderResultProgramRow(...args) { return livePalmesResultsAdminWorkflow.renderResultProgramRow(...args, resultsAdminWorkflowOptions()); }

function formatDeadlineTime(date) {
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", "h");
}

function finalistAnnouncedAt(row, result) {
  return livePalmesFinalists.finalistAnnouncedAt(row, result);
}

function finalWithdrawalLimitDate(row, result) {
  return livePalmesFinalists.finalWithdrawalLimitDate(row, result);
}

function finalWithdrawalLimitLabel(row, result) {
  const date = finalWithdrawalLimitDate(row, result);
  return date ? formatDeadlineTime(date) : "";
}

function canWithdrawFinalist(row, result, now = new Date()) {
  return livePalmesFinalists.canWithdrawFinalist(row, result, now);
}

function hasFinalWithdrawalDeadline(row, result) {
  return livePalmesFinalists.hasFinalWithdrawalDeadline(row, result);
}

function canWithdrawBeforeReplacementAnnouncement(row) {
  return livePalmesFinalists.canWithdrawBeforeReplacementAnnouncement(row);
}

function isFinalWithdrawalDeadlineExpired(row, result, now = new Date()) {
  return livePalmesFinalists.isFinalWithdrawalDeadlineExpired(row, result, now);
}

function finalResultSessions(results = []) {
  return livePalmesFinalists.finalResultSessions(results);
}

function ensureSecretaryFinalsSession(finals = []) {
  const available = finalResultSessions(finals);
  if (!available.length) {
    secretaryFinalsSession = "";
    return "";
  }
  if (secretaryFinalsSession === "all" || available.includes(secretaryFinalsSession)) {
    return secretaryFinalsSession;
  }
  const speakerSession = roleStates.speaker?.session && roleStates.speaker.session !== "all" ? String(roleStates.speaker.session) : "";
  secretaryFinalsSession = [speakerSession, available.at(-1), available[0]]
    .find((session) => session && available.includes(session)) || available[0];
  return secretaryFinalsSession;
}

function renderSecretaryFinalsPanel() {
  if (!secretaryFinalsPanel) return;
  if (state.role !== "secretary") {
    secretaryFinalsPanel.hidden = true;
    secretaryFinalsPanel.innerHTML = "";
    return;
  }
  const finals = raceResults
    .filter((result) => result.hasFinal)
    .sort((a, b) => String(b.finalistsAnnouncedAt || b.updatedAt || "").localeCompare(String(a.finalistsAnnouncedAt || a.updatedAt || "")));
  const availableSessions = finalResultSessions(finals);
  const activeSession = ensureSecretaryFinalsSession(finals);
  const visibleFinals = activeSession && activeSession !== "all"
    ? finals.filter((result) => String(result.session || "") === activeSession)
    : finals;
  secretaryFinalsPanel.hidden = false;
  secretaryFinalsPanel.innerHTML = livePalmesSecretaryFinals.renderPanelHtml({
    activeSession,
    availableSessions,
    hasFinals: Boolean(finals.length),
    visibleCardsHtml: visibleFinals.map((result) => livePalmesSecretaryFinals.renderFinalCardHtml({
      announced: Boolean(result.finalistsAnnouncedAt),
      eventLabel: result.eventLabel || result.eventId,
      finalistCount: finalRowsCount(result.finalists),
      resultId: result.id,
      session: result.session || "",
      sexLabel: result.sexLabel || sexDisplayLabel(result.sex),
      startTime: result.startTime || "",
      withdrawals: (result.finalWithdrawals || []).length
    })).join("")
  });
}

const livePalmesHistoryPresenter = livePalmesHistoryPresenterModule.init(livePalmesHistoryPresenterOptions());

function livePalmesHistoryPresenterOptions() {
  const options = {
    alertCommentLabel,
    alertDetailModal,
    alertIdentityLabel,
    alertRaceLabel,
    alerts,
    alertSwimmerLabel,
    closeAlertDetail,
    compareAlertsForAction,
    currentRoleAlertFilter,
    data,
    DECISION_LABELS,
    decisionMotifLabel,
    escapeHtml,
    expandedHistories,
    finalRowsForAnnouncementAlert,
    finalStageLabel,
    formatAlertDateTime,
    fullAlertIdentityLabel,
    historySentence,
    isDsqAlert,
    isFinalStage,
    isRequalificationAlert,
    isSpeakerView,
    livePalmesAlertDetailView,
    livePalmesHistoryView,
    officialAlerts,
    openFinalCompositionModal,
    openFinalistsAnnouncementModal,
    renderAlertCard,
    renderFinalistsAlertList,
    renderVideoInfoCard,
    roleHistory,
    sexDisplayLabel,
    speakerAlertAlreadyResolvedByResult,
    speakerAlertSentence,
    speakerHistory,
    state
  };
  Object.defineProperty(options, "alerts", { get: () => alerts, set: (value) => { alerts = value; } });
  Object.defineProperty(options, "expandedHistories", { get: () => expandedHistories, set: (value) => { expandedHistories = value; } });
  Object.defineProperty(options, "historyFilters", { get: () => historyFilters, set: (value) => { historyFilters = value; } });
  Object.defineProperty(options, "state", { get: () => state, set: (value) => { state = value; } });
  return options;
}

function renderOfficialAlerts(...args) { return livePalmesHistoryPresenter.renderOfficialAlerts(...args); }
function formatAlertTime(...args) { return livePalmesHistoryPresenter.formatAlertTime(...args); }
function formatAlertDateTime(...args) { return livePalmesHistoryPresenter.formatAlertDateTime(...args); }
function alertStatusLabel(...args) { return livePalmesHistoryPresenter.alertStatusLabel(...args); }
function alertStatusClass(...args) { return livePalmesHistoryPresenter.alertStatusClass(...args); }
function alertTimeline(...args) { return livePalmesHistoryPresenter.alertTimeline(...args); }
function alertTimelineItems(...args) { return livePalmesHistoryPresenter.alertTimelineItems(...args); }
function renderHistoryItem(...args) { return livePalmesHistoryPresenter.renderHistoryItem(...args); }
function openAlertDetail(...args) { return livePalmesHistoryPresenter.openAlertDetail(...args); }
function closeAlertDetail(...args) { return livePalmesHistoryPresenter.closeAlertDetail(...args); }
function openFinalistsAnnouncementModal(...args) { return livePalmesHistoryPresenter.openFinalistsAnnouncementModal(...args); }
function historyActionForAlert(...args) { return livePalmesHistoryPresenter.historyActionForAlert(...args); }
function historyFilterKey(...args) { return livePalmesHistoryPresenter.historyFilterKey(...args); }
function historyFilterValue(...args) { return livePalmesHistoryPresenter.historyFilterValue(...args); }
function historyAlertMatchesFilter(...args) { return livePalmesHistoryPresenter.historyAlertMatchesFilter(...args); }
function filteredHistoryRows(...args) { return livePalmesHistoryPresenter.filteredHistoryRows(...args); }
function historyFilterControl(...args) { return livePalmesHistoryPresenter.historyFilterControl(...args); }
function historyEmptyLabel(...args) { return livePalmesHistoryPresenter.historyEmptyLabel(...args); }
function renderSpeakerHistory(...args) { return livePalmesHistoryPresenter.renderSpeakerHistory(...args); }
function renderRoleHistory(...args) { return livePalmesHistoryPresenter.renderRoleHistory(...args); }
function historyToggleButton(...args) { return livePalmesHistoryPresenter.historyToggleButton(...args); }

const livePalmesDecisionWorkflow = livePalmesDecisionWorkflowModule.init(livePalmesDecisionWorkflowOptions());

function livePalmesDecisionWorkflowOptions() {
  const options = {
    activeDsqAlertsForEntrant,
    activeLineAlertsForEntrant,
    alertCommentLabel,
    alertDetailLabel,
    alertIdentityLabel,
    alertLineCode,
    alertRaceLabel,
    alerts,
    alertSwimmerLabel,
    alertStatusLabel,
    categoryLabel,
    closeAlertDetail,
    currentEvent,
    currentRoleAlertFilter,
    currentSeriesRows,
    data,
    decisionModal,
    decisionPanel,
    DECISION_LABELS,
    decisionMotifLabel,
    entrantKey,
    finalStageLabel,
    formatAlertTime,
    formatDisplayName,
    isDsqAlert,
    isFinalStage,
    isRequalificationAlert,
    isRelayEntrant,
    isSpeakerView,
    livePalmesRefereeView,
    livePalmesRoleQueueView,
    markAlertAlreadyClosedError,
    openAlertDetail,
    raceEntrants,
    render,
    renderEntrants,
    renderDecisionModal,
    roleQueue,
    saveAlerts,
    sexDisplayLabel,
    shortClubName,
    state,
    syncAlertChangesToFirestore,
    syncAlertChangesToFirestoreStrict,
    syncAlertToFirestore,
    syncAlertToFirestoreStrict
  };
  Object.defineProperty(options, "alerts", { get: () => alerts, set: (value) => { alerts = value; } });
  Object.defineProperty(options, "decisionDraft", { get: () => decisionDraft, set: (value) => { decisionDraft = value; } });
  Object.defineProperty(options, "state", { get: () => state, set: (value) => { state = value; } });
  return options;
}

function selectedEntrant(...args) { return livePalmesDecisionWorkflow.selectedEntrant(...args); }
function entrantSeriesRow(...args) { return livePalmesDecisionWorkflow.entrantSeriesRow(...args); }
function relayLegCount(...args) { return livePalmesDecisionWorkflow.relayLegCount(...args); }
function decisionOptionsForEntrant(...args) { return livePalmesDecisionWorkflow.decisionOptionsForEntrant(...args); }
function renderDecisionPanel(...args) { return livePalmesDecisionWorkflow.renderDecisionPanel(...args); }
function createDecisionDraft(...args) { return livePalmesDecisionWorkflow.createDecisionDraft(...args); }
function openDecisionModal(...args) { return livePalmesDecisionWorkflow.openDecisionModal(...args); }
function closeDecisionModal(...args) { return livePalmesDecisionWorkflow.closeDecisionModal(...args); }
function decisionNeedsDetail(...args) { return livePalmesDecisionWorkflow.decisionNeedsDetail(...args); }
function decisionNeedsRelayLeg(...args) { return livePalmesDecisionWorkflow.decisionNeedsRelayLeg(...args); }
function decisionNeedsLengthPosition(...args) { return livePalmesDecisionWorkflow.decisionNeedsLengthPosition(...args); }
function decisionDraftIsReady(...args) { return livePalmesDecisionWorkflow.decisionDraftIsReady(...args); }
function defaultDecisionDetail(...args) { return livePalmesDecisionWorkflow.defaultDecisionDetail(...args); }
function renderDecisionModal(...args) { return livePalmesDecisionWorkflow.renderDecisionModal(...args); }
function decisionRoute(...args) { return livePalmesDecisionWorkflow.decisionRoute(...args); }
function createDecisionAlert(...args) { return livePalmesDecisionWorkflow.createDecisionAlert(...args); }
function renderRoleQueue(...args) { return livePalmesDecisionWorkflow.renderRoleQueue(...args); }
function updateAlert(...args) { return livePalmesDecisionWorkflow.updateAlert(...args); }
function markSpeakerAlertDoneLocally(...args) { return livePalmesDecisionWorkflow.markSpeakerAlertDoneLocally(...args); }
function restoreAlertLocally(...args) { return livePalmesDecisionWorkflow.restoreAlertLocally(...args); }
function cloneAlertForCancellation(...args) { return livePalmesDecisionWorkflow.cloneAlertForCancellation(...args); }
function cancelDecision(...args) { return livePalmesDecisionWorkflow.cancelDecision(...args); }

function diagnosticsWorkflowOptions() {
  return {
    activeCompetitionDocument,
    activeCompetitionId,
    alertRaceLabel,
    alerts,
    alertsCollection,
    alertStatusLabel,
    competitionModeEnabled,
    data,
    dataStatus,
    dataUrlApproxBytes,
    decisionMotifLabel,
    escapeHtml,
    firebaseHeaderStatus,
    firebaseStatus,
    firestoreDb,
    formatAlertDateTime,
    formatByteSize,
    fullAlertIdentityLabel,
    liveDataDocument,
    liveDismissedAlertIds,
    livePalmesAdminDiagnostics,
    migrateResultPdfsOutOfResults,
    performanceDiagnosticLines,
    pinLockEnabled,
    presenceCollection,
    publicResultsIndexDocument,
    raceResults,
    realtimeSyncEnabled,
    resultHasDetailsForDiagnostic,
    resultPdfsCollection,
    resultsCollection,
    roleCodesModal,
    seriesPdfsCollection,
    sessionResultsPdfsCollection,
    sessionRows,
    speakerAlertAlreadyResolvedByResult,
    state
  };
}

function renderDataStatus(...args) { return livePalmesDiagnosticsWorkflow.renderDataStatus(...args, diagnosticsWorkflowOptions()); }
function firebaseStatusMeta(...args) { return livePalmesDiagnosticsWorkflow.firebaseStatusMeta(...args, diagnosticsWorkflowOptions()); }
function renderFirebaseHeaderStatus(...args) { return livePalmesDiagnosticsWorkflow.renderFirebaseHeaderStatus(...args, diagnosticsWorkflowOptions()); }
function shortStatusDate(...args) { return livePalmesDiagnosticsWorkflow.shortStatusDate(...args, diagnosticsWorkflowOptions()); }
function appendImportHistory(...args) { return livePalmesDiagnosticsWorkflow.appendImportHistory(...args, diagnosticsWorkflowOptions()); }
function countCollectionDocuments(...args) { return livePalmesDiagnosticsWorkflow.countCollectionDocuments(...args, diagnosticsWorkflowOptions()); }
function collectPerformanceDiagnostic(...args) { return livePalmesDiagnosticsWorkflow.collectPerformanceDiagnostic(...args, diagnosticsWorkflowOptions()); }
function renderPerformanceDiagnosticModal(...args) { return livePalmesDiagnosticsWorkflow.renderPerformanceDiagnosticModal(...args, diagnosticsWorkflowOptions()); }
function showPerformanceDiagnosticModal(...args) { return livePalmesDiagnosticsWorkflow.showPerformanceDiagnosticModal(...args, diagnosticsWorkflowOptions()); }
function safeCountCollection(...args) { return livePalmesDiagnosticsWorkflow.safeCountCollection(...args, diagnosticsWorkflowOptions()); }
function safeDocumentData(...args) { return livePalmesDiagnosticsWorkflow.safeDocumentData(...args, diagnosticsWorkflowOptions()); }
function alertPendingTargets(...args) { return livePalmesDiagnosticsWorkflow.alertPendingTargets(...args, diagnosticsWorkflowOptions()); }
function alertPendingBreakdown(...args) { return livePalmesDiagnosticsWorkflow.alertPendingBreakdown(...args, diagnosticsWorkflowOptions()); }
function alertTargetsLabel(...args) { return livePalmesDiagnosticsWorkflow.alertTargetsLabel(...args, diagnosticsWorkflowOptions()); }
function collectTechnicalDiagnostic(...args) { return livePalmesDiagnosticsWorkflow.collectTechnicalDiagnostic(...args, diagnosticsWorkflowOptions()); }
function resultHasDetailsForDiagnostic(...args) { return livePalmesDiagnosticsWorkflow.resultHasDetailsForDiagnostic(...args, diagnosticsWorkflowOptions()); }
function renderTechnicalDiagnosticModal(...args) { return livePalmesDiagnosticsWorkflow.renderTechnicalDiagnosticModal(...args, diagnosticsWorkflowOptions()); }
function showTechnicalDiagnosticModal(...args) { return livePalmesDiagnosticsWorkflow.showTechnicalDiagnosticModal(...args, diagnosticsWorkflowOptions()); }
function cleanLegacyResultPdfs(...args) { return livePalmesDiagnosticsWorkflow.cleanLegacyResultPdfs(...args, diagnosticsWorkflowOptions()); }
function showDataDiagnostic(...args) { return livePalmesDiagnosticsWorkflow.showDataDiagnostic(...args, diagnosticsWorkflowOptions()); }

function renderSeriesControls() {
  const numbers = availableSeriesNumbers();
  const finalRows = finalProgramRowsForRace();
  const finalStages = finalRows.map((row) => row.stage);
  if (isFinalStage(state.series) && !finalStages.includes(state.series)) {
    state.series = String(numbers[0] || finalStages[0] || "all");
  }
  if (!isFinalStage(state.series) && state.series !== "all" && !numbers.includes(Number(state.series))) {
    state.series = String(numbers[0] || finalStages[0] || "all");
  }
  if (!numbers.length && finalStages.length && state.series === "all") {
    state.series = finalStages[0];
  } else if (numbers.length && state.series === "all") {
    state.series = String(numbers[0]);
  }
  const preview = raceSeries().some((row) => row.isPreview);
  const programRow = selectedProgramRow();
  if (programRow?.hasEntrants === false) {
    const jaMark = seriesChipIsRefereeProgress(programRow, "", programRow.stage || "final") ? `<span class="series-ja-marker">JA</span>` : "";
    seriesControls.innerHTML = `<span class="no-series-note">${escapeHtml(programRow.startTime ? `Finale - ${programRow.startTime}` : "Finale")}${jaMark}</span>`;
    setSeriesNavigation(
      !hasPreviousProgramSeries(),
      "Course précédente",
      !hasNextProgramSeries(),
      "Course suivante"
    );
    return;
  }
  const controls = [
    ...numbers.map((number) => {
      const time = (data.series || [])
        .filter(matchesRace)
        .filter((row) => !isFinalStage(row.stage))
        .find((row) => Number(row.series) === number)?.startTime || "";
      const jaCurrent = seriesChipIsRefereeProgress(programRow, number, "series");
      return `
        <button class="series-chip ${Number(state.series) === number ? "active" : ""} ${jaCurrent ? "ja-current" : ""}" type="button" data-series="${number}">
          <strong>${number}</strong>${time ? `<span>${escapeHtml(time)}</span>` : ""}${jaCurrent ? `<em>JA</em>` : ""}
        </button>
      `;
    }),
    ...finalRows.map((row) => {
      const jaCurrent = seriesChipIsRefereeProgress(row, "", row.stage);
      return `
        <button class="series-chip final-chip ${state.series === row.stage ? "active" : ""} ${jaCurrent ? "ja-current" : ""}" type="button" data-series="${escapeHtml(row.stage)}">
          <strong>${escapeHtml(finalStageLabel(row.stage))}</strong>${row.startTime ? `<span>${escapeHtml(row.startTime)}</span>` : ""}${jaCurrent ? `<em>JA</em>` : ""}
        </button>
      `;
    })
  ];
  seriesControls.innerHTML = controls.length
    ? controls.join("")
    : `<span class="no-series-note">Aucune série disponible</span>`;
  const atLastCurrentRace = isFinalStage(state.series)
    ? finalStages.indexOf(state.series) >= finalStages.length - 1
    : state.series !== "all" && Number(state.series) >= numbers[numbers.length - 1];
  const atFirstCurrentRace = isFinalStage(state.series)
    ? !numbers.length && finalStages.indexOf(state.series) <= 0
    : Number(state.series) <= numbers[0];
  setSeriesNavigation(
    atFirstCurrentRace && !hasPreviousProgramSeries(),
    atFirstCurrentRace ? "Course précédente" : "Série précédente",
    (!numbers.length && !finalStages.length) || (atLastCurrentRace && !hasNextProgramSeries()),
    atLastCurrentRace ? "Course suivante" : "Série suivante"
  );
  seriesControls.title = preview ? "Aperçu généré automatiquement en attendant le fichier officiel des séries" : "";
}

function seriesChipIsRefereeProgress(row, series, stage) {
  const progress = refereeProgress();
  if (!row || !progress?.programKey) return false;
  return String(progress.programKey) === String(programKey(row)) &&
    String(progress.stage || "series") === String(stage || "series") &&
    String(progress.series || "") === String(series || "");
}

function setSeriesNavigation(previousDisabled, previousLabel, nextDisabled, nextLabel) {
  [previousSeriesBtn, previousSeriesFloatBtn].forEach((button) => {
    if (!button) return;
    button.disabled = previousDisabled;
    button.textContent = "<";
    button.title = previousLabel;
    button.setAttribute("aria-label", previousLabel);
  });
  [nextSeriesBtn, nextSeriesFloatBtn].forEach((button) => {
    if (!button) return;
    button.disabled = nextDisabled;
    button.textContent = ">";
    button.title = nextLabel;
    button.setAttribute("aria-label", nextLabel);
  });
  if (previousSeriesInlineBtn) {
    previousSeriesInlineBtn.disabled = previousDisabled;
    previousSeriesInlineBtn.textContent = previousLabel;
    previousSeriesInlineBtn.title = previousLabel;
    previousSeriesInlineBtn.setAttribute("aria-label", previousLabel);
  }
  if (nextSeriesInlineBtn) {
    nextSeriesInlineBtn.disabled = nextDisabled;
    nextSeriesInlineBtn.textContent = nextLabel;
    nextSeriesInlineBtn.title = nextLabel;
    nextSeriesInlineBtn.setAttribute("aria-label", nextLabel);
  }
}

const livePalmesProgramModals = livePalmesProgramModalsModule.init(programModalsOptions());

function programModalsOptions() {
  const options = {
    adminSeriesModal,
    compactRaceTitle,
    currentRefereeProgressPayload,
    data,
    finalStageLabel,
    hasRowsForProgram,
    isFinalStage,
    isLastProgramPartForRace,
    isSplitRaceAcrossSessions,
    livePalmesAdminModals,
    livePalmesAdminResults,
    livePalmesProgramView,
    normalizeData,
    programBtn,
    programFloatBtn,
    programKey,
    programModal,
    raceOptionKey,
    refereeProgress,
    refereeProgressLabel,
    render,
    resultForProgramRow,
    resultImportModal,
    resultPhaseLabelForProgramRow,
    resultSessions,
    roleStates,
    sexDisplayLabel,
    splitRaceNote,
    state,
    updateLiveNotes
  };
  Object.defineProperty(options, "currentResultImportRow", { get: () => currentResultImportRow, set: (value) => { currentResultImportRow = value; } });
  Object.defineProperty(options, "currentSessionResultsImport", { get: () => currentSessionResultsImport, set: (value) => { currentSessionResultsImport = value; } });
  Object.defineProperty(options, "data", { get: () => data, set: (value) => { data = value; } });
  Object.defineProperty(options, "resultsAdminSession", { get: () => resultsAdminSession, set: (value) => { resultsAdminSession = value; } });
  Object.defineProperty(options, "state", { get: () => state, set: (value) => { state = value; } });
  return options;
}

function renderProgramButtons(...args) { return livePalmesProgramModals.renderProgramButtons(...args); }
function programSeriesItems(...args) { return livePalmesProgramModals.programSeriesItems(...args); }
function programItemMatchesState(...args) { return livePalmesProgramModals.programItemMatchesState(...args); }
function programItemIsCurrent(...args) { return livePalmesProgramModals.programItemIsCurrent(...args); }
function programItemIsSpeakerCurrent(...args) { return livePalmesProgramModals.programItemIsSpeakerCurrent(...args); }
function programProgressValue(...args) { return livePalmesProgramModals.programProgressValue(...args); }
function compareProgramProgressValues(...args) { return livePalmesProgramModals.compareProgramProgressValues(...args); }
function progressValueFromMarker(...args) { return livePalmesProgramModals.progressValueFromMarker(...args); }
function programItemProgressClass(...args) { return livePalmesProgramModals.programItemProgressClass(...args); }
function programRowProgressClass(...args) { return livePalmesProgramModals.programRowProgressClass(...args); }
function speakerProgramPositionLabel(...args) { return livePalmesProgramModals.speakerProgramPositionLabel(...args); }
function renderProgramModal(...args) { return livePalmesProgramModals.renderProgramModal(...args); }
function openProgramModal(...args) { return livePalmesProgramModals.openProgramModal(...args); }
function closeProgramModal(...args) { return livePalmesProgramModals.closeProgramModal(...args); }
function setRefereeProgressHere(...args) { return livePalmesProgramModals.setRefereeProgressHere(...args); }
function openAdminSeriesModal(...args) { return livePalmesProgramModals.openAdminSeriesModal(...args); }
function closeAdminSeriesModal(...args) { return livePalmesProgramModals.closeAdminSeriesModal(...args); }
function openResultImportModal(...args) { return livePalmesProgramModals.openResultImportModal(...args); }
function openSessionResultsImportModal(...args) { return livePalmesProgramModals.openSessionResultsImportModal(...args); }
function closeResultImportModal(...args) { return livePalmesProgramModals.closeResultImportModal(...args); }

const livePalmesResultPublicationWorkflow = livePalmesResultPublicationWorkflowModule.init(livePalmesResultPublicationWorkflowOptions());

function livePalmesResultPublicationWorkflowOptions() {
  const options = {
    buildPublicResultsIndex,
    compactRaceTitle,
    createFinalistReplacementSpeakerAlert,
    data,
    deleteFinalResultAlerts,
    extractPdfLines,
    fileToDataUrl,
    finalRowKey,
    finalistRowName,
    fixPdfEncoding,
    formatDisplayName,
    importedBirthYear,
    importedSeriesTime,
    isFinalStage,
    livePalmesResults: window.LivePalmesResults,
    markAlertAlreadyClosedError,
    markSpeakerAlertDoneLocally,
    normalizePersonName,
    programKey,
    publishPublicResultsIndex,
    raceOptionKey,
    rebuildFinalistsFromParsedResult,
    render,
    renderDataStatus,
    resultForProgramRow,
    resultIdForProgramRow,
    resultMetadataPayload,
    resultPdfPayload,
    resultPdfsCollection,
    resultPhaseLabelForProgramRow,
    resultsCollection,
    resultWithoutPdf,
    saveAlerts,
    sexDisplayLabel,
    splitImportedPersonName,
    stampReplacementAnnouncement,
    syncAlertChangesToFirestore,
    syncAlertChangesToFirestoreStrict,
    syncAlertToFirestore,
    window
  };
  Object.defineProperty(options, "alerts", { get: () => alerts, set: (value) => { alerts = value; } });
  Object.defineProperty(options, "data", { get: () => data, set: (value) => { data = value; } });
  Object.defineProperty(options, "finalistAlertRepairRunning", { get: () => finalistAlertRepairRunning, set: (value) => { finalistAlertRepairRunning = value; } });
  Object.defineProperty(options, "raceResults", { get: () => raceResults, set: (value) => { raceResults = value; } });
  Object.defineProperty(options, "replacementAlertRepairRunning", { get: () => replacementAlertRepairRunning, set: (value) => { replacementAlertRepairRunning = value; } });
  Object.defineProperty(options, "resultPdfMigrationAttempted", { get: () => resultPdfMigrationAttempted, set: (value) => { resultPdfMigrationAttempted = value; } });
  Object.defineProperty(options, "resultPdfMigrationRunning", { get: () => resultPdfMigrationRunning, set: (value) => { resultPdfMigrationRunning = value; } });
  Object.defineProperty(options, "state", { get: () => state, set: (value) => { state = value; } });
  return options;
}

function fileToDataUrl(...args) { return livePalmesResultPublicationWorkflow.fileToDataUrl(...args); }
function loadResultPdfData(...args) { return livePalmesResultPublicationWorkflow.loadResultPdfData(...args); }
function resultPdfDataUrl(...args) { return livePalmesResultPublicationWorkflow.resultPdfDataUrl(...args); }
function saveResultPdfPayload(...args) { return livePalmesResultPublicationWorkflow.saveResultPdfPayload(...args); }
function deleteResultPdfPayload(...args) { return livePalmesResultPublicationWorkflow.deleteResultPdfPayload(...args); }
function migrateResultPdfsOutOfResults(...args) { return livePalmesResultPublicationWorkflow.migrateResultPdfsOutOfResults(...args); }
function dataUrlToFile(...args) { return livePalmesResultPublicationWorkflow.dataUrlToFile(...args); }
function resultParserOptions(...args) { return livePalmesResultPublicationWorkflow.resultParserOptions(...args); }
function resultParserFunction(...args) { return livePalmesResultPublicationWorkflow.resultParserFunction(...args); }
function normalizeResultLineText(...args) { return livePalmesResultPublicationWorkflow.normalizeResultLineText(...args); }
function parseResultRow(...args) { return livePalmesResultPublicationWorkflow.parseResultRow(...args); }
function parseUnrankedResultRow(...args) { return livePalmesResultPublicationWorkflow.parseUnrankedResultRow(...args); }
function resultStatusFromText(...args) { return livePalmesResultPublicationWorkflow.resultStatusFromText(...args); }
function parseResultStatusRow(...args) { return livePalmesResultPublicationWorkflow.parseResultStatusRow(...args); }
function resultImportRowKey(...args) { return livePalmesResultPublicationWorkflow.resultImportRowKey(...args); }
function parseFinalistsFromResultLines(...args) { return livePalmesResultPublicationWorkflow.parseFinalistsFromResultLines(...args); }
function emptyParsedFinals(...args) { return livePalmesResultPublicationWorkflow.emptyParsedFinals(...args); }
function resolveParsedFinals(...args) { return livePalmesResultPublicationWorkflow.resolveParsedFinals(...args); }
function shouldPreserveFinalistsOnReread(...args) { return livePalmesResultPublicationWorkflow.shouldPreserveFinalistsOnReread(...args); }
function buildPublishedResult(...args) { return livePalmesResultPublicationWorkflow.buildPublishedResult(...args); }
function finalRowCountsAsFinalist(...args) { return livePalmesResultPublicationWorkflow.finalRowCountsAsFinalist(...args); }
function finalRowsCount(...args) { return livePalmesResultPublicationWorkflow.finalRowsCount(...args); }
function performanceStageForResultRow(...args) { return livePalmesResultPublicationWorkflow.performanceStageForResultRow(...args); }
function resultPerformanceDuplicateKey(...args) { return livePalmesResultPublicationWorkflow.resultPerformanceDuplicateKey(...args); }
function resultPerformanceRows(...args) { return livePalmesResultPublicationWorkflow.resultPerformanceRows(...args); }
function publishResultPdf(...args) { return livePalmesResultPublicationWorkflow.publishResultPdf(...args); }
function rereadPublishedResult(...args) { return livePalmesResultPublicationWorkflow.rereadPublishedResult(...args); }
function createFinalistsSpeakerAlert(...args) { return livePalmesResultPublicationWorkflow.createFinalistsSpeakerAlert(...args); }
function stampFinalistsAnnouncement(...args) { return livePalmesResultPublicationWorkflow.stampFinalistsAnnouncement(...args); }
function ensurePendingFinalistsSpeakerAlerts(...args) { return livePalmesResultPublicationWorkflow.ensurePendingFinalistsSpeakerAlerts(...args); }
function replacementAlertMatches(...args) { return livePalmesResultPublicationWorkflow.replacementAlertMatches(...args); }
function replacementAlertKey(...args) { return livePalmesResultPublicationWorkflow.replacementAlertKey(...args); }
function dedupePendingReplacementAlerts(...args) { return livePalmesResultPublicationWorkflow.dedupePendingReplacementAlerts(...args); }
function ensurePendingReplacementSpeakerAlerts(...args) { return livePalmesResultPublicationWorkflow.ensurePendingReplacementSpeakerAlerts(...args); }
function publishFinalistsAfterSpeaker(...args) { return livePalmesResultPublicationWorkflow.publishFinalistsAfterSpeaker(...args); }

function finalWithdrawalsWorkflowOptions() {
  return {
    alertDetailModal,
    alerts,
    canWithdrawBeforeReplacementAnnouncement,
    canWithdrawFinalist,
    escapeHtml,
    finalRowCountsAsFinalist,
    finalWithdrawalLimitDate,
    finalWithdrawalLimitLabel,
    formatDeadlineTime,
    hasFinalWithdrawalDeadline,
    isFinalWithdrawalDeadlineExpired,
    livePalmesAlertDetailView,
    livePalmesSecretaryFinals,
    markAlertAlreadyClosedError,
    markSpeakerAlertDoneLocally,
    normalizePersonName,
    publishPublicResultsIndex,
    raceResults,
    render,
    replacementAlertMatches,
    resultParserFunction,
    resultParserOptions,
    resultsCollection,
    saveAlerts,
    sexDisplayLabel,
    syncAlertChangesToFirestoreStrict,
    syncAlertToFirestore
  };
}

function finalRowKey(...args) { return livePalmesFinalWithdrawalsWorkflow.finalRowKey(...args, finalWithdrawalsWorkflowOptions()); }
function finalRowOrderValue(...args) { return livePalmesFinalWithdrawalsWorkflow.finalRowOrderValue(...args, finalWithdrawalsWorkflowOptions()); }
function sortedFinalRows(...args) { return livePalmesFinalWithdrawalsWorkflow.sortedFinalRows(...args, finalWithdrawalsWorkflowOptions()); }
function normalizeFinalistsOrder(...args) { return livePalmesFinalWithdrawalsWorkflow.normalizeFinalistsOrder(...args, finalWithdrawalsWorkflowOptions()); }
function activeFinalPreWithdrawals(...args) { return livePalmesFinalWithdrawalsWorkflow.activeFinalPreWithdrawals(...args, finalWithdrawalsWorkflowOptions()); }
function finalPreWithdrawalForRow(...args) { return livePalmesFinalWithdrawalsWorkflow.finalPreWithdrawalForRow(...args, finalWithdrawalsWorkflowOptions()); }
function isFinalPreWithdrawn(...args) { return livePalmesFinalWithdrawalsWorkflow.isFinalPreWithdrawn(...args, finalWithdrawalsWorkflowOptions()); }
function availableReplacementForResult(...args) { return livePalmesFinalWithdrawalsWorkflow.availableReplacementForResult(...args, finalWithdrawalsWorkflowOptions()); }
function buildReplacementFinalistRow(...args) { return livePalmesFinalWithdrawalsWorkflow.buildReplacementFinalistRow(...args, finalWithdrawalsWorkflowOptions()); }
function buildFinalWithdrawalEntry(...args) { return livePalmesFinalWithdrawalsWorkflow.buildFinalWithdrawalEntry(...args, finalWithdrawalsWorkflowOptions()); }
function addReplacementChain(...args) { return livePalmesFinalWithdrawalsWorkflow.addReplacementChain(...args, finalWithdrawalsWorkflowOptions()); }
function finalistRowsWithFinalKey(...args) { return livePalmesFinalWithdrawalsWorkflow.finalistRowsWithFinalKey(...args, finalWithdrawalsWorkflowOptions()); }
function finalistRowsMatch(...args) { return livePalmesFinalWithdrawalsWorkflow.finalistRowsMatch(...args, finalWithdrawalsWorkflowOptions()); }
function findPreservedFinalistRow(...args) { return livePalmesFinalWithdrawalsWorkflow.findPreservedFinalistRow(...args, finalWithdrawalsWorkflowOptions()); }
function finalistPositionByRow(...args) { return livePalmesFinalWithdrawalsWorkflow.finalistPositionByRow(...args, finalWithdrawalsWorkflowOptions()); }
function applyPreservedReplacementAnnouncement(...args) { return livePalmesFinalWithdrawalsWorkflow.applyPreservedReplacementAnnouncement(...args, finalWithdrawalsWorkflowOptions()); }
function rebuildFinalistsFromParsedResult(...args) { return livePalmesFinalWithdrawalsWorkflow.rebuildFinalistsFromParsedResult(...args, finalWithdrawalsWorkflowOptions()); }
function firstActiveFinalistIndex(...args) { return livePalmesFinalWithdrawalsWorkflow.firstActiveFinalistIndex(...args, finalWithdrawalsWorkflowOptions()); }
function finalCompositionRows(...args) { return livePalmesFinalWithdrawalsWorkflow.finalCompositionRows(...args, finalWithdrawalsWorkflowOptions()); }
function finalCompositionKey(...args) { return livePalmesFinalWithdrawalsWorkflow.finalCompositionKey(...args, finalWithdrawalsWorkflowOptions()); }
function finalCompositionIsDefinitive(...args) { return livePalmesFinalWithdrawalsWorkflow.finalCompositionIsDefinitive(...args, finalWithdrawalsWorkflowOptions()); }
function finalCompositionDefinitiveDate(...args) { return livePalmesFinalWithdrawalsWorkflow.finalCompositionDefinitiveDate(...args, finalWithdrawalsWorkflowOptions()); }
function finalCompositionPendingDeadlineLabel(...args) { return livePalmesFinalWithdrawalsWorkflow.finalCompositionPendingDeadlineLabel(...args, finalWithdrawalsWorkflowOptions()); }
function renderFinalWithdrawalGroup(...args) { return livePalmesFinalWithdrawalsWorkflow.renderFinalWithdrawalGroup(...args, finalWithdrawalsWorkflowOptions()); }
function finalRowIndexByKey(...args) { return livePalmesFinalWithdrawalsWorkflow.finalRowIndexByKey(...args, finalWithdrawalsWorkflowOptions()); }
function nextUnqualifiedRowsForSecretary(...args) { return livePalmesFinalWithdrawalsWorkflow.nextUnqualifiedRowsForSecretary(...args, finalWithdrawalsWorkflowOptions()); }
function renderSecretaryUnqualifiedGroup(...args) { return livePalmesFinalWithdrawalsWorkflow.renderSecretaryUnqualifiedGroup(...args, finalWithdrawalsWorkflowOptions()); }
function openFinalWithdrawalsModal(...args) { return livePalmesFinalWithdrawalsWorkflow.openFinalWithdrawalsModal(...args, finalWithdrawalsWorkflowOptions()); }
function toggleFinalPreWithdrawal(...args) { return livePalmesFinalWithdrawalsWorkflow.toggleFinalPreWithdrawal(...args, finalWithdrawalsWorkflowOptions()); }
function renderFinalCompositionList(...args) { return livePalmesFinalWithdrawalsWorkflow.renderFinalCompositionList(...args, finalWithdrawalsWorkflowOptions()); }
function openFinalCompositionResultModal(...args) { return livePalmesFinalWithdrawalsWorkflow.openFinalCompositionResultModal(...args, finalWithdrawalsWorkflowOptions()); }
function openFinalCompositionModal(...args) { return livePalmesFinalWithdrawalsWorkflow.openFinalCompositionModal(...args, finalWithdrawalsWorkflowOptions()); }
function markFinalistWithdrawn(...args) { return livePalmesFinalWithdrawalsWorkflow.markFinalistWithdrawn(...args, finalWithdrawalsWorkflowOptions()); }
function reinstateFinalist(...args) { return livePalmesFinalWithdrawalsWorkflow.reinstateFinalist(...args, finalWithdrawalsWorkflowOptions()); }
function createFinalistReplacementSpeakerAlert(...args) { return livePalmesFinalWithdrawalsWorkflow.createFinalistReplacementSpeakerAlert(...args, finalWithdrawalsWorkflowOptions()); }
function cancelPendingReplacementSpeakerAlert(...args) { return livePalmesFinalWithdrawalsWorkflow.cancelPendingReplacementSpeakerAlert(...args, finalWithdrawalsWorkflowOptions()); }
function updateReplacementRowAnnouncement(...args) { return livePalmesFinalWithdrawalsWorkflow.updateReplacementRowAnnouncement(...args, finalWithdrawalsWorkflowOptions()); }
function stampReplacementAnnouncement(...args) { return livePalmesFinalWithdrawalsWorkflow.stampReplacementAnnouncement(...args, finalWithdrawalsWorkflowOptions()); }
function publishReplacementAfterSpeaker(...args) { return livePalmesFinalWithdrawalsWorkflow.publishReplacementAfterSpeaker(...args, finalWithdrawalsWorkflowOptions()); }

const livePalmesResultMaintenanceWorkflow = livePalmesResultMaintenanceWorkflowModule.init(resultMaintenanceWorkflowOptions());

function resultMaintenanceWorkflowOptions() {
  const options = {
    appendImportHistory,
    archiveCurrentResults,
    clearPublicSessionResultsPdfs,
    clearPublicSessionResultsPdfsForSession,
    clearPublicSeriesPdfs,
    competitionModeEnabled,
    deleteFinalResultAlerts,
    deleteResultPdfPayload,
    livePalmesAdminMaintenance,
    normalizeData,
    publishLiveDataToFirestore,
    publishPublicResultsIndex,
    render,
    renderResultsAdminPanel,
    resultWithoutPdf,
    resultsCollection,
    saveData,
    window
  };
  Object.defineProperty(options, "data", { get: () => data, set: (value) => { data = value; } });
  Object.defineProperty(options, "raceResults", { get: () => raceResults, set: (value) => { raceResults = value; } });
  Object.defineProperty(options, "resultsAdminSession", { get: () => resultsAdminSession, set: (value) => { resultsAdminSession = value; } });
  Object.defineProperty(options, "state", { get: () => state, set: (value) => { state = value; } });
  return options;
}

function deleteResultPdf(...args) { return livePalmesResultMaintenanceWorkflow.deleteResultPdf(...args); }
function clearPublishedResults(...args) { return livePalmesResultMaintenanceWorkflow.clearPublishedResults(...args); }
function clearPublishedResultsForSession(...args) { return livePalmesResultMaintenanceWorkflow.clearPublishedResultsForSession(...args); }
function resetSeriesForNextCompetition(...args) { return livePalmesResultMaintenanceWorkflow.resetSeriesForNextCompetition(...args); }

function swimmerPanelOptions() {
  return {
    alertDetailLabel,
    availableSeriesNumbers,
    categoryClass,
    categoryLabel,
    categorySelect,
    compactRaceTitle,
    currentEvent,
    currentSeriesRows,
    data,
    displayedWord,
    entrantsBody,
    entrantsSubtitle,
    entrantsTitle,
    entrantCount,
    entrantCountLabel,
    entrantKey,
    entrantWord,
    escapeHtml,
    filteredCount,
    finalStageLabel,
    formatGap,
    formatName,
    formatRank,
    getBirthYearLabel,
    headerRefDetails,
    headerRefs,
    isFemaleContext,
    isFinalStage,
    isLastSeriesOfCurrentSession,
    isSpeakerView,
    lineOrderBtn,
    matchesRace,
    normalizePersonName,
    programBtn,
    programRows,
    raceEntrants,
    raceEntrantsForStats,
    raceResults,
    raceSexBadge,
    raceTitle,
    rankHeader,
    recordEventMatches,
    recordMatchesRace,
    refereeProgressBtn,
    refereeProgressLabel,
    sameCategory,
    selectedProgramRow,
    selectedSeriesLabel,
    selectedSeriesTime,
    state,
    swimmerDetails,
    swimmerHeader,
    swimmerWord,
    timeToMs,
    top2025Box,
    splitRaceNote
  };
}

function renderCategorySelect(...args) { return livePalmesSwimmerPanel.renderCategorySelect(...args, swimmerPanelOptions()); }
function renderHeader(...args) { return livePalmesSwimmerPanel.renderHeader(...args, swimmerPanelOptions()); }
function renderRefereeProgressControl(...args) { return livePalmesSwimmerPanel.renderRefereeProgressControl(...args, swimmerPanelOptions()); }
function headerReferenceChipsHtml(...args) { return livePalmesSwimmerPanel.headerReferenceChipsHtml(...args, swimmerPanelOptions()); }
function selectedHeaderReferenceDetailsHtml(...args) { return livePalmesSwimmerPanel.selectedHeaderReferenceDetailsHtml(...args, swimmerPanelOptions()); }
function renderHeaderReferences(...args) { return livePalmesSwimmerPanel.renderHeaderReferences(...args, swimmerPanelOptions()); }
function renderHeaderRefDetails(...args) { return livePalmesSwimmerPanel.renderHeaderRefDetails(...args, swimmerPanelOptions()); }
function recordKey(...args) { return livePalmesSwimmerPanel.recordKey(...args, swimmerPanelOptions()); }
function renderEntrants(...args) { return livePalmesSwimmerPanel.renderEntrants(...args, swimmerPanelOptions()); }
function getEntrantReference(...args) { return livePalmesSwimmerPanel.getEntrantReference(...args, swimmerPanelOptions()); }
function recordTargetsForEntrant(...args) { return livePalmesSwimmerPanel.recordTargetsForEntrant(...args, swimmerPanelOptions()); }
function renderRecordGapAlert(...args) { return livePalmesSwimmerPanel.renderRecordGapAlert(...args, swimmerPanelOptions()); }
function renderEdfBadges(...args) { return livePalmesSwimmerPanel.renderEdfBadges(...args, swimmerPanelOptions()); }
function renderCompetitionStatBadges(...args) { return livePalmesSwimmerPanel.renderCompetitionStatBadges(...args, swimmerPanelOptions()); }
function renderNonSelectableBadge(...args) { return livePalmesSwimmerPanel.renderNonSelectableBadge(...args, swimmerPanelOptions()); }
function findEdfMemberships(...args) { return livePalmesSwimmerPanel.findEdfMemberships(...args, swimmerPanelOptions()); }
function findCompetitionStatsForEntrant(...args) { return livePalmesSwimmerPanel.findCompetitionStatsForEntrant(...args, swimmerPanelOptions()); }
function normalizeClubMatch(...args) { return livePalmesSwimmerPanel.normalizeClubMatch(...args, swimmerPanelOptions()); }
function findSwimmerInfosForEntrant(...args) { return livePalmesSwimmerPanel.findSwimmerInfosForEntrant(...args, swimmerPanelOptions()); }
function findInternationalMedals(...args) { return livePalmesSwimmerPanel.findInternationalMedals(...args, swimmerPanelOptions()); }
function findInternationalMedalsForRace(...args) { return livePalmesSwimmerPanel.findInternationalMedalsForRace(...args, swimmerPanelOptions()); }
function shortChampionshipLabel(...args) { return livePalmesSwimmerPanel.shortChampionshipLabel(...args, swimmerPanelOptions()); }
function findRecordByTime(...args) { return livePalmesSwimmerPanel.findRecordByTime(...args, swimmerPanelOptions()); }
function isRelayEntrant(...args) { return livePalmesSwimmerPanel.isRelayEntrant(...args, swimmerPanelOptions()); }
function isNationalTeamRelayRecord(...args) { return livePalmesSwimmerPanel.isNationalTeamRelayRecord(...args, swimmerPanelOptions()); }
function shouldKeepRecord(...args) { return livePalmesSwimmerPanel.shouldKeepRecord(...args, swimmerPanelOptions()); }
function isBestClubRelayEntry(...args) { return livePalmesSwimmerPanel.isBestClubRelayEntry(...args, swimmerPanelOptions()); }
function findRelayClubRecords(...args) { return livePalmesSwimmerPanel.findRelayClubRecords(...args, swimmerPanelOptions()); }
function findRecordsHeldByEntrant(...args) { return livePalmesSwimmerPanel.findRecordsHeldByEntrant(...args, swimmerPanelOptions()); }
function findAllRecordsHeldByEntrant(...args) { return livePalmesSwimmerPanel.findAllRecordsHeldByEntrant(...args, swimmerPanelOptions()); }
function sameTime(...args) { return livePalmesSwimmerPanel.sameTime(...args, swimmerPanelOptions()); }
function isQualificationEligible(...args) { return livePalmesSwimmerPanel.isQualificationEligible(...args, swimmerPanelOptions()); }
function findTop2025ForEntrant(...args) { return livePalmesSwimmerPanel.findTop2025ForEntrant(...args, swimmerPanelOptions()); }
function entrantPerformanceNameKey(...args) { return livePalmesSwimmerPanel.entrantPerformanceNameKey(...args, swimmerPanelOptions()); }
function performanceBirthYear(...args) { return livePalmesSwimmerPanel.performanceBirthYear(...args, swimmerPanelOptions()); }
function performanceMatchesEntrant(...args) { return livePalmesSwimmerPanel.performanceMatchesEntrant(...args, swimmerPanelOptions()); }
function performanceStatusResultLabel(...args) { return livePalmesSwimmerPanel.performanceStatusResultLabel(...args, swimmerPanelOptions()); }
function performanceDisplayValue(...args) { return livePalmesSwimmerPanel.performanceDisplayValue(...args, swimmerPanelOptions()); }
function resultRankForPerformance(...args) { return livePalmesSwimmerPanel.resultRankForPerformance(...args, swimmerPanelOptions()); }
function performanceRankLabel(...args) { return livePalmesSwimmerPanel.performanceRankLabel(...args, swimmerPanelOptions()); }
function swimmerBestPerformanceForEntry(...args) { return livePalmesSwimmerPanel.swimmerBestPerformanceForEntry(...args, swimmerPanelOptions()); }
function compactProgramPerformanceLabel(...args) { return livePalmesSwimmerPanel.compactProgramPerformanceLabel(...args, swimmerPanelOptions()); }
function selectRecordForCategory(...args) { return livePalmesSwimmerPanel.selectRecordForCategory(...args, swimmerPanelOptions()); }
function renderSwimmerDetails(...args) { return livePalmesSwimmerPanel.renderSwimmerDetails(...args, swimmerPanelOptions()); }
function eventOrder(...args) { return livePalmesSwimmerPanel.eventOrder(...args, swimmerPanelOptions()); }
function eventLabel(...args) { return livePalmesSwimmerPanel.eventLabel(...args, swimmerPanelOptions()); }
function shortEventLabel(...args) { return livePalmesSwimmerPanel.shortEventLabel(...args, swimmerPanelOptions()); }
function findFrance2025Results(...args) { return livePalmesSwimmerPanel.findFrance2025Results(...args, swimmerPanelOptions()); }
function medalForRank(...args) { return livePalmesSwimmerPanel.medalForRank(...args, swimmerPanelOptions()); }
function medalClass(...args) { return livePalmesSwimmerPanel.medalClass(...args, swimmerPanelOptions()); }
function currentRecordRows(...args) { return livePalmesSwimmerPanel.currentRecordRows(...args, swimmerPanelOptions()); }
function shortRecordLabel(...args) { return livePalmesSwimmerPanel.shortRecordLabel(...args, swimmerPanelOptions()); }
function recordFlagText(...args) { return livePalmesSwimmerPanel.recordFlagText(...args, swimmerPanelOptions()); }
function renderRecordFlag(...args) { return livePalmesSwimmerPanel.renderRecordFlag(...args, swimmerPanelOptions()); }
function shortCategoryLabel(...args) { return livePalmesSwimmerPanel.shortCategoryLabel(...args, swimmerPanelOptions()); }
function renderRecordCategoryFlag(...args) { return livePalmesSwimmerPanel.renderRecordCategoryFlag(...args, swimmerPanelOptions()); }
function renderTop2025(...args) { return livePalmesSwimmerPanel.renderTop2025(...args, swimmerPanelOptions()); }
function recordDescription(...args) { return livePalmesSwimmerPanel.recordDescription(...args, swimmerPanelOptions()); }

function noteKey() {
  return `${state.eventId}:${state.sex}`;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  const separator = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(separator).map((header) => header.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = line.split(separator).map((cell) => cell.trim());
    const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""]));
    return {
      eventId: state.eventId,
      sex: state.sex,
      lane: row.ligne || row.couloir || row.lane,
      lastName: row.nom || row.lastname || "",
      firstName: row.prenom || row["prénom"] || row.firstname || "",
      birthDate: row.naissance || row.birthdate || "",
      swimmerId: [row.nom || row.lastname || "", row.prenom || row["prénom"] || row.firstname || "", row.naissance || row.birthdate || "", state.sex].join("|").toLowerCase(),
      club: row.club || "",
      category: row.categorie || row["catégorie"] || row.category || "",
      seedTime: row.temps || row.time || row.seedtime || "",
      note: row.note || ""
    };
  });
}

const livePalmesSpeakerInfoWorkflow = livePalmesSpeakerInfoWorkflowModule.init(speakerInfoWorkflowOptions());

function speakerInfoWorkflowOptions() {
  const options = {
    appendImportHistory,
    applyFreshData,
    categoryLabel,
    document,
    eventSignature,
    fixPdfEncoding,
    formatPersonNameParts,
    importedEventId,
    importedSeriesTime,
    livePalmesSpeakerInfo,
    normalizeClubMatch,
    normalizeData,
    normalizePdfLabel,
    normalizePersonName,
    publishLiveDataToFirestore,
    renderDataStatus,
    sameCategory,
    seedSourceLookupKeys,
    shouldKeepRecord,
    SPEAKER_INFO_SHEETS,
    SPEAKER_SHEET_ID,
    timeToMs,
    window
  };
  Object.defineProperty(options, "data", { get: () => data, set: (value) => { data = value; } });
  return options;
}

function speakerInfoOptions(...args) { return livePalmesSpeakerInfoWorkflow.speakerInfoOptions(...args); }
function fetchSpeakerSheetRows(...args) { return livePalmesSpeakerInfoWorkflow.fetchSpeakerSheetRows(...args); }
function parseTopSheet(...args) { return livePalmesSpeakerInfoWorkflow.parseTopSheet(...args); }
function parseRecordsSheet(...args) { return livePalmesSpeakerInfoWorkflow.parseRecordsSheet(...args); }
function parseEdfSheet(...args) { return livePalmesSpeakerInfoWorkflow.parseEdfSheet(...args); }
function parseCompetitionStatsSheet(...args) { return livePalmesSpeakerInfoWorkflow.parseCompetitionStatsSheet(...args); }
function parseInternationalSheet(...args) { return livePalmesSpeakerInfoWorkflow.parseInternationalSheet(...args); }
function parseQualificationsSheet(...args) { return livePalmesSpeakerInfoWorkflow.parseQualificationsSheet(...args); }
function parseClubSheet(...args) { return livePalmesSpeakerInfoWorkflow.parseClubSheet(...args); }
function parseSwimmerInfosSheet(...args) { return livePalmesSpeakerInfoWorkflow.parseSwimmerInfosSheet(...args); }
function parseSeedSourceSheet(...args) { return livePalmesSpeakerInfoWorkflow.parseSeedSourceSheet(...args); }
function sheetSex(...args) { return livePalmesSpeakerInfoWorkflow.sheetSex(...args); }
function seedSourceTimeKey(...args) { return livePalmesSpeakerInfoWorkflow.seedSourceTimeKey(...args); }
function applySpeakerInfoToEntrants(...args) { return livePalmesSpeakerInfoWorkflow.applySpeakerInfoToEntrants(...args); }
function updateSpeakerInfoFromGoogleSheet(...args) { return livePalmesSpeakerInfoWorkflow.updateSpeakerInfoFromGoogleSheet(...args); }

const livePalmesExportReportsWorkflow = livePalmesExportReportsWorkflowModule.init(exportReportsWorkflowOptions());

function exportReportsWorkflowOptions() {
  const options = {
    alertClubShortLabel,
    alertStatusLabel,
    alertTimelineItems,
    archiveCurrentHistory,
    decisionMotifLabel,
    finalRowsCount,
    finalStageLabel,
    formatAlertDateTime,
    isFinalStage,
    isRequalificationAlert,
    livePalmesAdminArchives,
    livePalmesExportActions,
    sexDisplayLabel,
    window
  };
  Object.defineProperty(options, "alerts", { get: () => alerts, set: (value) => { alerts = value; } });
  Object.defineProperty(options, "data", { get: () => data, set: (value) => { data = value; } });
  return options;
}

function downloadJson(...args) { return livePalmesExportReportsWorkflow.downloadJson(...args); }
function dsqReportRows(...args) { return livePalmesExportReportsWorkflow.dsqReportRows(...args); }
function buildDsqReportHtml(...args) { return livePalmesExportReportsWorkflow.buildDsqReportHtml(...args); }
function buildDsqReportHtmlFromRows(...args) { return livePalmesExportReportsWorkflow.buildDsqReportHtmlFromRows(...args); }
function printDsqRows(...args) { return livePalmesExportReportsWorkflow.printDsqRows(...args); }
function openDsqRows(...args) { return livePalmesExportReportsWorkflow.openDsqRows(...args); }
function buildResultArchiveHtmlFromRows(...args) { return livePalmesExportReportsWorkflow.buildResultArchiveHtmlFromRows(...args); }
function printResultArchiveRows(...args) { return livePalmesExportReportsWorkflow.printResultArchiveRows(...args); }
function openResultArchiveRows(...args) { return livePalmesExportReportsWorkflow.openResultArchiveRows(...args); }
function exportDsqPdf(...args) { return livePalmesExportReportsWorkflow.exportDsqPdf(...args); }
function escapeHtml(...args) { return livePalmesExportReportsWorkflow.escapeHtml(...args); }

function uiEventsOptions() {
  const options = {
    ADMIN_PIN,
    ROLE_LABELS,
    acquireRoleLock,
    adminSeriesBtn,
    adminSeriesModal,
    alertDetailModal,
    alerts,
    antoineOverlay,
    applyProgramRow,
    archivesBtn,
    askRolePin,
    availableSeriesNumbers,
    cancelDecision,
    categorySelect,
    cleanLegacyResultPdfs,
    clearPublishedResults,
    clearPublishedResultsForSession,
    clearResultUploadState,
    clearSearch,
    clearSeriesImportState,
    closeAdminSeriesModal,
    closeAlertDetail,
    closeDecisionModal,
    closeProgramModal,
    closeResultImportModal,
    closeRoleCodesModal,
    competitionModeEnabled,
    competitionModeTopBtn,
    computerFooterPanel,
    createDecisionAlert,
    currentResultImportRow,
    currentRolePins,
    currentSessionResultsImport,
    data,
    decisionDraft,
    decisionDraftIsReady,
    decisionModal,
    defaultDecisionDetail,
    deleteResultPdf,
    dismissLiveAlert,
    downloadJson,
    ensureResultsAdminSession,
    entrantsBody,
    entrantsSubtitle,
    eventLabel,
    eventSelect,
    expandedHistories,
    exportDsqPdf,
    finalProgramRowsForRace,
    finalRowKey,
    finalRowsCount,
    finishRolePin,
    firestoreDb,
    firstSeriesSelectionForCurrentRace,
    fullscreenBtn,
    goToNextProgramRace,
    goToPreviousProgramRace,
    headerRefDetails,
    headerRefs,
    historyArchivesCollection,
    historyFilters,
    importSeriesPdf,
    isFinalStage,
    lineOrderBtn,
    manualRefreshBtn,
    markFinalistWithdrawn,
    markSpeakerAlertDoneLocally,
    nextSeriesBtn,
    nextSeriesFloatBtn,
    nextSeriesInlineBtn,
    officialAlerts,
    openAdminSeriesModal,
    openAlertDetail,
    openDecisionModal,
    openDsqRows,
    openFinalCompositionModal,
    openFinalCompositionResultModal,
    openFinalWithdrawalsModal,
    openFinalistsAnnouncementModal,
    openProgramModal,
    openResultArchiveRows,
    openResultImportModal,
    openSessionResultsImportModal,
    performResetHistoryWithArchive,
    previousSeriesBtn,
    previousSeriesFloatBtn,
    previousSeriesInlineBtn,
    profileHome,
    profileHomeBtn,
    programBtn,
    programFloatBtn,
    programKey,
    programModal,
    programRowFromRaceOption,
    programRows,
    publicPositionToggle,
    publishFinalistsAfterSpeaker,
    publishPublicResultsIndex,
    publishReplacementAfterSpeaker,
    publishResultPdf,
    publishSessionResultsPdf,
    raceResults,
    recordKey,
    refereeProgressBtn,
    refreshFirebaseOnce,
    refreshPresenceCounts,
    reinstateFinalist,
    releaseConsolePresence,
    render,
    renderDataStatus,
    renderDecisionModal,
    renderEntrants,
    renderHeaderReferences,
    renderHistoryArchivesModal,
    renderPublicSessionInfosModal,
    renderResetResultsModal,
    renderResultsAdminPanel,
    renderRoleCodesModal,
    renderRoleHistory,
    renderRolePanels,
    renderSecretaryFinalsPanel,
    renderSpeakerHistory,
    requestRoleAccess,
    rereadPublishedResult,
    resetHistory,
    resetSeriesForNextCompetition,
    restoreAlertLocally,
    resultArchivesCollection,
    resultForProgramRow,
    resultImportModal,
    resultPhaseLabelForProgramRow,
    resultProgramRows,
    resultSessions,
    resultUploadKeyForProgram,
    resultUploadKeyForSessionResults,
    resultsAdminPanel,
    roleCodesModal,
    roleHistory,
    roleQueue,
    saveRoleCodesFromModal,
    saveUnlockedRoles,
    searchInput,
    secretaryFinalsPanel,
    selectRecordForCategory,
    selectedEntrant,
    seriesControls,
    sessionControls,
    setPublicPositionEnabled,
    setRefereeProgressHere,
    setResultUploadState,
    setSeriesImportState,
    sexDisplayLabel,
    showPerformanceDiagnosticModal,
    showTechnicalDiagnosticModal,
    showToast,
    speakerHistory,
    state,
    swimmerDetails,
    switchRoleUnlocked,
    syncAlertChangesToFirestoreStrict,
    toggleCompetitionMode,
    toggleFinalPreWithdrawal,
    togglePublicResultsOnline,
    unlockRole,
    updateAlert,
    updateConsolePresence,
    updateLiveNotes,
    updateSpeakerInfoFromGoogleSheet,
  };
  Object.defineProperty(options, "alerts", { get: () => alerts, set: (value) => { alerts = value; } });
  Object.defineProperty(options, "data", { get: () => data, set: (value) => { data = value; } });
  Object.defineProperty(options, "decisionDraft", { get: () => decisionDraft, set: (value) => { decisionDraft = value; } });
  Object.defineProperty(options, "expandedHistories", { get: () => expandedHistories, set: (value) => { expandedHistories = value; } });
  Object.defineProperty(options, "firestoreDb", { get: () => firestoreDb, set: (value) => { firestoreDb = value; } });
  Object.defineProperty(options, "raceResults", { get: () => raceResults, set: (value) => { raceResults = value; } });
  Object.defineProperty(options, "state", { get: () => state, set: (value) => { state = value; } });
  Object.defineProperty(options, "unlockedRoles", { get: () => unlockedRoles, set: (value) => { unlockedRoles = value; } });
  Object.defineProperty(options, "profileHomeActive", { get: () => profileHomeActive, set: (value) => { profileHomeActive = value; } });
  Object.defineProperty(options, "resultsAdminSession", { get: () => resultsAdminSession, set: (value) => { resultsAdminSession = value; } });
  Object.defineProperty(options, "secretaryFinalsSession", { get: () => secretaryFinalsSession, set: (value) => { secretaryFinalsSession = value; } });
  Object.defineProperty(options, "isFullscreenMode", { get: () => isFullscreenMode, set: (value) => { isFullscreenMode = value; } });
  return options;
}

function initializeUiEvents() {
  if (typeof livePalmesUiEvents.init === "function") {
    livePalmesUiEvents.init(uiEventsOptions());
  }
}

const livePalmesSeriesImportWorkflow = livePalmesSeriesImportWorkflowModule.init(seriesImportWorkflowOptions());

function seriesImportWorkflowOptions() {
  const options = {
    alertStatusLabel,
    appendImportHistory,
    applyFreshData,
    availableSexesForEvent,
    clearHistoryAndAlertsForFullImport,
    clearPublishedResults,
    clearPublicSeriesPdfs,
    eventSignature,
    formatName,
    importedSeriesTime,
    livePalmesPdfImport,
    livePalmesSeriesImport,
    mergeRemoteLiveData,
    normalizeData,
    normalizePersonName,
    publishLiveDataToFirestore,
    publishPublicResultsIndex,
    publishPublicSeriesPdf,
    renderDataStatus,
    sampleData,
    seedSourceTimeKey,
    window
  };
  Object.defineProperty(options, "alerts", { get: () => alerts, set: (value) => { alerts = value; } });
  Object.defineProperty(options, "data", { get: () => data, set: (value) => { data = value; } });
  Object.defineProperty(options, "raceResults", { get: () => raceResults, set: (value) => { raceResults = value; } });
  return options;
}

function normalizePdfLabel(...args) { return livePalmesSeriesImportWorkflow.normalizePdfLabel(...args); }
function fixPdfEncoding(...args) { return livePalmesSeriesImportWorkflow.fixPdfEncoding(...args); }
function importedEventId(...args) { return livePalmesSeriesImportWorkflow.importedEventId(...args); }
function importedEventInfo(...args) { return livePalmesSeriesImportWorkflow.importedEventInfo(...args); }
function importedCategoryLabel(...args) { return livePalmesSeriesImportWorkflow.importedCategoryLabel(...args); }
function importedBirthYear(...args) { return livePalmesSeriesImportWorkflow.importedBirthYear(...args); }
function normalizePdfUppercaseEToken(...args) { return livePalmesSeriesImportWorkflow.normalizePdfUppercaseEToken(...args); }
function splitImportedPersonName(...args) { return livePalmesSeriesImportWorkflow.splitImportedPersonName(...args); }
function isImportedRelayEvent(...args) { return livePalmesSeriesImportWorkflow.isImportedRelayEvent(...args); }
function seriesImportOptions(...args) { return livePalmesSeriesImportWorkflow.seriesImportOptions(...args); }
function extractPdfLines(...args) { return livePalmesSeriesImportWorkflow.extractPdfLines(...args); }
function parseImportedSeriesLines(...args) { return livePalmesSeriesImportWorkflow.parseImportedSeriesLines(...args); }
function showPdfImportDebug(...args) { return livePalmesSeriesImportWorkflow.showPdfImportDebug(...args); }
function prepareImportedSeriesForMode(...args) { return livePalmesSeriesImportWorkflow.prepareImportedSeriesForMode(...args); }
function seedSourceLookupKeys(...args) { return livePalmesSeriesImportWorkflow.seedSourceLookupKeys(...args); }
function inheritImportedSeedSources(...args) { return livePalmesSeriesImportWorkflow.inheritImportedSeedSources(...args); }
function mergeImportedSeriesData(...args) { return livePalmesSeriesImportWorkflow.mergeImportedSeriesData(...args); }
function importSeriesPdf(...args) { return livePalmesSeriesImportWorkflow.importSeriesPdf(...args); }

const livePalmesAppLifecycle = livePalmesAppLifecycleModule.init(appLifecycleOptions());

function appLifecycleOptions() {
  const options = {
    checkFirebaseConnection,
    cloneRoleState,
    COMPETITION_INACTIVITY_CHECK_MS,
    csvInput,
    dataDiagnosticBtn,
    defaultRoleStates,
    disableCompetitionModeAfterInactivity,
    document,
    fetch: window.fetch.bind(window),
    FIREBASE_CONNECTION_CHECK_MS,
    firstSeriesSelectionForCurrentRace,
    heartbeatRoleLock,
    initializeUiEvents,
    initFirebaseSync,
    isSpeakerView,
    jsonInput,
    LOCK_HEARTBEAT_MS,
    markConsoleActivity,
    normalizeData,
    parseCsv,
    PRESENCE_HEARTBEAT_MS,
    refreshPresenceCounts,
    releaseConsolePresence,
    releaseRoleLock,
    render,
    renderDataStatus,
    returnHomeAfterLocalInactivity,
    roleLockBtn,
    sampleData,
    saveCurrentRoleState,
    saveData,
    showDataDiagnostic,
    setInterval: window.setInterval.bind(window),
    toggleRoleLock,
    updateConsolePresence,
    updateStickyAlertOffset,
    window
  };
  Object.defineProperty(options, "data", { get: () => data, set: (value) => { data = value; } });
  Object.defineProperty(options, "firebaseStatus", { get: () => firebaseStatus, set: (value) => { firebaseStatus = value; } });
  Object.defineProperty(options, "profileHomeActive", { get: () => profileHomeActive, set: (value) => { profileHomeActive = value; } });
  Object.defineProperty(options, "roleStates", { get: () => roleStates, set: (value) => { roleStates = value; } });
  Object.defineProperty(options, "state", { get: () => state, set: (value) => { state = value; } });
  return options;
}

function fetchGeneratedData(...args) { return livePalmesAppLifecycle.fetchGeneratedData(...args); }
function applyFreshData(...args) { return livePalmesAppLifecycle.applyFreshData(...args); }
function checkForGeneratedUpdates(...args) { return livePalmesAppLifecycle.checkForGeneratedUpdates(...args); }
