const livePalmesAppSettings = window.LivePalmesAppSettings || {};
const {
  livePalmesAppConfig, STORAGE_KEY, ALERTS_KEY, LIVE_DISMISSED_ALERTS_KEY,
  UNLOCKED_ROLES_KEY, CLIENT_ID_KEY, ACTIVE_VIEW_KEY, ROLE_STATES_KEY,
  LAST_ACTIVITY_KEY, FIRESTORE_COMPETITION_ID, SPEAKER_SHEET_ID, ADMIN_PIN,
  ROLE_PINS, ROLE_LABELS, DECISION_LABELS, SPEAKER_DECISION_REASONS,
  LOCK_DURATION_MS, LOCK_RECOVERY_MS, LOCK_HEARTBEAT_MS, FIREBASE_CONNECTION_CHECK_MS,
  HOME_AFTER_INACTIVITY_MS, COMPETITION_INACTIVITY_MS, COMPETITION_INACTIVITY_CHECK_MS, PRESENCE_DURATION_MS,
  PRESENCE_HEARTBEAT_MS, PRESENCE_WRITE_THROTTLE_MS, SPEAKER_INFO_SHEETS, FIREBASE_CONFIG,
  sampleData
} = livePalmesAppSettings.resolve ? livePalmesAppSettings.resolve(window) : {};
const livePalmesAppModules = window.LivePalmesAppModules || {};
const {
  livePalmesLocalState, livePalmesAppStorageWorkflowModule, livePalmesFirebase, livePalmesFirestoreRefs,
  livePalmesConsoleSyncModule, livePalmesRealtimeSyncModule, livePalmesRoleAccess, livePalmesRoleState,
  livePalmesRoleSessionWorkflowModule, livePalmesRaceCore, livePalmesAlerts, livePalmesAlertPresenterModule,
  livePalmesFinalists, livePalmesSecretaryFinals, livePalmesPublication, livePalmesDiagnostics,
  livePalmesAdminDiagnostics, livePalmesAdminMaintenance, livePalmesAdminActionsModule, livePalmesAdminModals,
  livePalmesAdminArchives, livePalmesExportActions, livePalmesExportReportsWorkflowModule, livePalmesAdminResults,
  livePalmesResults, livePalmesPdfImport, livePalmesSeriesImport, livePalmesSeriesImportWorkflowModule,
  livePalmesSpeakerInfo, livePalmesSpeakerInfoWorkflowModule, livePalmesProgramNavigation, livePalmesSeriesControls,
  livePalmesProgramModalsModule, livePalmesEntrantHelpersModule, livePalmesSwimmerPanel, livePalmesResultsAdminWorkflow,
  livePalmesResultPublicationWorkflowModule, livePalmesResultMaintenanceWorkflowModule, livePalmesFinalWithdrawalsWorkflow, livePalmesDiagnosticsWorkflow,
  livePalmesUiEvents, livePalmesProgramView, livePalmesConsoleRenderWorkflowModule, livePalmesRefereeView,
  livePalmesRoleQueueView, livePalmesHistoryView, livePalmesHistoryActionsModule, livePalmesHistoryPresenterModule,
  livePalmesDecisionWorkflowModule, livePalmesHeaderView, livePalmesAlertDetailView, livePalmesAlertCardView,
  livePalmesLineStatusView, livePalmesPublicProgressWorkflowModule, livePalmesAppLifecycleModule, livePalmesAppState,
  livePalmesAppMethodBindings, livePalmesAppDom
} = livePalmesAppModules.collect ? livePalmesAppModules.collect(window) : {};


const appMethodTargetFactories = {
  livePalmesRoleSessionWorkflow: () => livePalmesRoleSessionWorkflow,
  livePalmesAppStorageWorkflow: () => livePalmesAppStorageWorkflow,
  livePalmesPublicProgressWorkflow: () => livePalmesPublicProgressWorkflow,
  livePalmesConsoleSync: () => livePalmesConsoleSync,
  livePalmesAdminActions: () => livePalmesAdminActions,
  livePalmesRealtimeSync: () => livePalmesRealtimeSync,
  livePalmesHistoryActions: () => livePalmesHistoryActions,
  livePalmesResults: () => livePalmesResults,
  livePalmesDiagnostics: () => livePalmesDiagnostics,
  livePalmesEntrantHelpers: () => livePalmesEntrantHelpers,
  livePalmesProgramNavigation: () => livePalmesProgramNavigation,
  livePalmesConsoleRenderWorkflow: () => livePalmesConsoleRenderWorkflow,
  livePalmesAlertPresenter: () => livePalmesAlertPresenter,
  livePalmesResultsAdminWorkflow: () => livePalmesResultsAdminWorkflow,
  livePalmesHistoryPresenter: () => livePalmesHistoryPresenter,
  livePalmesDecisionWorkflow: () => livePalmesDecisionWorkflow,
  livePalmesDiagnosticsWorkflow: () => livePalmesDiagnosticsWorkflow,
  livePalmesProgramModals: () => livePalmesProgramModals,
  livePalmesResultPublicationWorkflow: () => livePalmesResultPublicationWorkflow,
  livePalmesFinalWithdrawalsWorkflow: () => livePalmesFinalWithdrawalsWorkflow,
  livePalmesResultMaintenanceWorkflow: () => livePalmesResultMaintenanceWorkflow,
  livePalmesSwimmerPanel: () => livePalmesSwimmerPanel,
  livePalmesSpeakerInfoWorkflow: () => livePalmesSpeakerInfoWorkflow,
  livePalmesExportReportsWorkflow: () => livePalmesExportReportsWorkflow,
  livePalmesSeriesImportWorkflow: () => livePalmesSeriesImportWorkflow,
  livePalmesAppLifecycle: () => livePalmesAppLifecycle
};
const appMethodOptionFactories = {
  programNavigationOptions,
  resultsAdminWorkflowOptions,
  diagnosticsWorkflowOptions,
  finalWithdrawalsWorkflowOptions,
  swimmerPanelOptions
};
livePalmesAppMethodBindings.bind({
  targetFactories: appMethodTargetFactories,
  optionFactories: appMethodOptionFactories,
  window
});

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

const appDom = livePalmesAppDom.collect ? livePalmesAppDom.collect(document) : {};
const {
  eventSelect, searchInput, categorySelect, sessionControls,
  publicPositionToggle, seriesControls, roleSwitch, topActions,
  profileHome, profileModeStatus, profileHomeBtn, manualRefreshBtn,
  topbar, appShell, sidebar, racePanel,
  competitionModeTopBtn, previousSeriesBtn, nextSeriesBtn, previousSeriesInlineBtn,
  nextSeriesInlineBtn, previousSeriesFloatBtn, nextSeriesFloatBtn, programBtn,
  programFloatBtn, categoryField, lineOrderBtn, entrantsBody,
  entrantCount, entrantCountLabel, filteredCount, bestEntry,
  bestEntryName, entrantsTitle, entrantsSubtitle, rankHeader,
  swimmerHeader, searchLabel, entrantsTableWrap, raceTitle,
  raceMeta, raceSexBadge, headerRefs, headerRefDetails,
  top2025Box, dataStatus, firebaseHeaderStatus, appConsoleTitle,
  officialAlerts, decisionPanel, decisionModal, alertDetailModal,
  programModal, adminSeriesModal, resultImportModal, roleCodesModal,
  roleQueue, resultsAdminPanel, secretaryFinalsPanel, roleHistory,
  computerFooterPanel, speakerHistory, roleBadge, refereeProgressBtn,
  fullscreenBtn, viewModeBtn, roleLockBtn, adminSeriesBtn,
  archivesBtn, dataDiagnosticBtn, jsonInput, csvInput,
  swimmerDetails, meetTitle, antoineOverlay
} = appDom;

const appStateAccessors = {
  activeRoleLock: { get: () => activeRoleLock, set: (value) => { activeRoleLock = value; } },
  alerts: { get: () => alerts, set: (value) => { alerts = value; } },
  applyingRemoteData: { get: () => applyingRemoteData, set: (value) => { applyingRemoteData = value; } },
  competitionAutoDisableRunning: { get: () => competitionAutoDisableRunning, set: (value) => { competitionAutoDisableRunning = value; } },
  consolePresenceActive: { get: () => consolePresenceActive, set: (value) => { consolePresenceActive = value; } },
  currentResultImportRow: { get: () => currentResultImportRow, set: (value) => { currentResultImportRow = value; } },
  currentSessionResultsImport: { get: () => currentSessionResultsImport, set: (value) => { currentSessionResultsImport = value; } },
  data: { get: () => data, set: (value) => { data = value; } },
  decisionDraft: { get: () => decisionDraft, set: (value) => { decisionDraft = value; } },
  expandedHistories: { get: () => expandedHistories, set: (value) => { expandedHistories = value; } },
  finalistAlertRepairRunning: { get: () => finalistAlertRepairRunning, set: (value) => { finalistAlertRepairRunning = value; } },
  firebaseConnectionCheckRunning: { get: () => firebaseConnectionCheckRunning, set: (value) => { firebaseConnectionCheckRunning = value; } },
  firebaseStatus: { get: () => firebaseStatus, set: (value) => { firebaseStatus = value; } },
  firestoreDb: { get: () => firestoreDb, set: (value) => { firestoreDb = value; } },
  firestoreReady: { get: () => firestoreReady, set: (value) => { firestoreReady = value; } },
  firestoreUnsubscribe: { get: () => firestoreUnsubscribe, set: (value) => { firestoreUnsubscribe = value; } },
  historyFilters: { get: () => historyFilters, set: (value) => { historyFilters = value; } },
  isFullscreenMode: { get: () => isFullscreenMode, set: (value) => { isFullscreenMode = value; } },
  lastConsoleActivityAt: { get: () => lastConsoleActivityAt, set: (value) => { lastConsoleActivityAt = value; } },
  lastPresenceWriteAt: { get: () => lastPresenceWriteAt, set: (value) => { lastPresenceWriteAt = value; } },
  lastPublicProgressSignature: { get: () => lastPublicProgressSignature, set: (value) => { lastPublicProgressSignature = value; } },
  liveDataUnsubscribe: { get: () => liveDataUnsubscribe, set: (value) => { liveDataUnsubscribe = value; } },
  liveDismissedAlertIds: { get: () => liveDismissedAlertIds, set: (value) => { liveDismissedAlertIds = value; } },
  presenceCounts: { get: () => presenceCounts, set: (value) => { presenceCounts = value; } },
  profileHomeActive: { get: () => profileHomeActive, set: (value) => { profileHomeActive = value; } },
  raceResults: { get: () => raceResults, set: (value) => { raceResults = value; } },
  replacementAlertRepairRunning: { get: () => replacementAlertRepairRunning, set: (value) => { replacementAlertRepairRunning = value; } },
  resultPdfMigrationAttempted: { get: () => resultPdfMigrationAttempted, set: (value) => { resultPdfMigrationAttempted = value; } },
  resultPdfMigrationRunning: { get: () => resultPdfMigrationRunning, set: (value) => { resultPdfMigrationRunning = value; } },
  resultsAdminSession: { get: () => resultsAdminSession, set: (value) => { resultsAdminSession = value; } },
  resultsSnapshotReady: { get: () => resultsSnapshotReady, set: (value) => { resultsSnapshotReady = value; } },
  resultsUnsubscribe: { get: () => resultsUnsubscribe, set: (value) => { resultsUnsubscribe = value; } },
  rolePinResolver: { get: () => rolePinResolver, set: (value) => { rolePinResolver = value; } },
  roleStates: { get: () => roleStates, set: (value) => { roleStates = value; } },
  secretaryFinalsSession: { get: () => secretaryFinalsSession, set: (value) => { secretaryFinalsSession = value; } },
  seriesImportState: { get: () => seriesImportState, set: (value) => { seriesImportState = value; } },
  state: { get: () => state, set: (value) => { state = value; } },
  unlockedRoles: { get: () => unlockedRoles, set: (value) => { unlockedRoles = value; } }
};

function bindOptionState(options, keys = []) {
  if (typeof livePalmesAppState.bindOptionState === "function") {
    return livePalmesAppState.bindOptionState(options, appStateAccessors, keys);
  }
  return options;
}

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
  bindOptionState(options, ["alerts", "data", "lastPublicProgressSignature", "presenceCounts", "roleStates", "state"]);
  return options;
}


const livePalmesConsoleSync = livePalmesConsoleSyncModule.init(consoleSyncOptions());

function consoleSyncOptions() {
  const options = {
    LOCK_DURATION_MS,
    LOCK_RECOVERY_MS,
    PRESENCE_DURATION_MS,
    PRESENCE_WRITE_THROTTLE_MS,
    ROLE_LABELS,
    activeCompetitionId,
    alertsCollection,
    appendImportHistory,
    applyFreshData,
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
    renderPresenceCounts,
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
  bindOptionState(options, ["activeRoleLock", "alerts", "applyingRemoteData", "consolePresenceActive", "data", "firebaseStatus", "lastPresenceWriteAt", "presenceCounts", "raceResults", "unlockedRoles"]);
  return options;
}


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
  bindOptionState(options, ["data", "lastConsoleActivityAt", "rolePinResolver", "unlockedRoles"]);
  return options;
}


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
  bindOptionState(options, ["alerts", "competitionAutoDisableRunning", "data", "firebaseConnectionCheckRunning", "firebaseStatus", "firestoreDb", "firestoreReady", "firestoreUnsubscribe", "lastConsoleActivityAt", "liveDataUnsubscribe", "profileHomeActive", "raceResults", "resultsSnapshotReady", "resultsUnsubscribe", "state", "unlockedRoles"]);
  return options;
}


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
  bindOptionState(options, ["alerts", "data", "liveDismissedAlertIds", "raceResults"]);
  return options;
}



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
  bindOptionState(options, ["state"]);
  return options;
}


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
  bindOptionState(options, ["data", "firestoreDb", "isFullscreenMode", "profileHomeActive", "state"]);
  return options;
}


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
  bindOptionState(options, ["alerts", "data", "liveDismissedAlertIds", "raceResults", "state"]);
  return options;
}


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
    normalizeData,
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
    roleStates,
    safeCountCollection,
    safeDocumentData,
    sessionResultsPdfsCollection,
    seriesPdfsCollection,
    sessionRows,
    sexDisplayLabel,
    showToast,
    state,
    updateLiveNotes
  };
  bindOptionState(options, ["resultsAdminSession", "seriesImportState"]);
  return options;
}


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
  bindOptionState(options, ["alerts", "expandedHistories", "historyFilters", "state"]);
  return options;
}


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
  bindOptionState(options, ["alerts", "decisionDraft", "state"]);
  return options;
}


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


function seriesControlsOptions() {
  return {
    ...appDom,
    availableSeriesNumbers,
    data,
    escapeHtml,
    finalProgramRowsForRace,
    finalStageLabel,
    hasNextProgramSeries,
    hasPreviousProgramSeries,
    isFinalStage,
    matchesRace,
    programKey,
    raceSeries,
    refereeProgress,
    selectedProgramRow,
    state
  };
}

function renderSeriesControls(...args) {
  return livePalmesSeriesControls.renderSeriesControls(...args, seriesControlsOptions());
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
  bindOptionState(options, ["currentResultImportRow", "currentSessionResultsImport", "data", "resultsAdminSession", "state"]);
  return options;
}


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
  bindOptionState(options, ["alerts", "data", "finalistAlertRepairRunning", "raceResults", "replacementAlertRepairRunning", "resultPdfMigrationAttempted", "resultPdfMigrationRunning", "state"]);
  return options;
}


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
  bindOptionState(options, ["data", "raceResults", "resultsAdminSession", "state"]);
  return options;
}


function swimmerPanelOptions() {
  return {
    activeLineAlertsForEntrant,
    alertDetailLabel,
    availableSeriesNumbers,
    categoryClass,
    categoryLabel,
    categorySelect,
    compactRaceTitle,
    currentEvent,
    currentRefereeProgressIsHere,
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
    formatDisplayName,
    formatGap,
    formatName,
    formatPersonNameParts,
    formatRank,
    formatSeriesDisplayName,
    getBirthYearLabel,
    headerRefDetails,
    headerRefs,
    isFemaleContext,
    isFinalStage,
    isLastSeriesOfCurrentSession,
    isLastRaceOfCurrentSession,
    isSpeakerView,
    lineOrderBtn,
    livePalmesHeaderView,
    livePalmesResults,
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
    refereeProgress,
    refereeProgressBtn,
    refereeProgressLabel,
    renderLineAlertBadges,
    renderLineTimeStatus,
    sameCategory,
    selectedProgramRow,
    selectedSeriesLabel,
    selectedSeriesTime,
    sexDisplayLabel,
    shortClubName,
    state,
    swimmerDetails,
    swimmerHeader,
    swimmerWord,
    timeToMs,
    top2025Box,
    splitRaceNote
  };
}


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
  bindOptionState(options, ["data"]);
  return options;
}


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
  bindOptionState(options, ["alerts", "data"]);
  return options;
}


function uiEventsOptions() {
  const options = {
    ...appDom,
    ADMIN_PIN,
    ROLE_LABELS,
    acquireRoleLock,
    alerts,
    applyProgramRow,
    askRolePin,
    availableSeriesNumbers,
    cancelDecision,
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
    createDecisionAlert,
    currentResultImportRow,
    currentRolePins,
    currentSessionResultsImport,
    data,
    decisionDraft,
    decisionDraftIsReady,
    defaultDecisionDetail,
    deleteResultPdf,
    dismissLiveAlert,
    downloadJson,
    ensureResultsAdminSession,
    eventLabel,
    expandedHistories,
    exportDsqPdf,
    finalProgramRowsForRace,
    finalRowKey,
    finalRowsCount,
    finishRolePin,
    firestoreDb,
    firstSeriesSelectionForCurrentRace,
    goToNextProgramRace,
    goToPreviousProgramRace,
    historyArchivesCollection,
    historyFilters,
    importSeriesPdf,
    isFinalStage,
    markFinalistWithdrawn,
    markSpeakerAlertDoneLocally,
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
    programKey,
    programRowFromRaceOption,
    programRows,
    publishFinalistsAfterSpeaker,
    publishPublicResultsIndex,
    publishReplacementAfterSpeaker,
    publishResultPdf,
    publishSessionResultsPdf,
    raceResults,
    recordKey,
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
    resultPhaseLabelForProgramRow,
    resultProgramRows,
    resultSessions,
    resultUploadKeyForProgram,
    resultUploadKeyForSessionResults,
    saveRoleCodesFromModal,
    saveUnlockedRoles,
    selectRecordForCategory,
    selectedEntrant,
    setPublicPositionEnabled,
    setRefereeProgressHere,
    setResultUploadState,
    setSeriesImportState,
    sexDisplayLabel,
    showPerformanceDiagnosticModal,
    showTechnicalDiagnosticModal,
    showToast,
    state,
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
  bindOptionState(options, ["alerts", "data", "decisionDraft", "expandedHistories", "firestoreDb", "raceResults", "state", "unlockedRoles", "profileHomeActive", "resultsAdminSession", "secretaryFinalsSession", "isFullscreenMode"]);
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
  bindOptionState(options, ["alerts", "data", "raceResults"]);
  return options;
}


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
  bindOptionState(options, ["data", "firebaseStatus", "profileHomeActive", "roleStates", "state"]);
  return options;
}
