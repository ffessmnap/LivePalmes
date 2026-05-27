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
  livePalmesRoleSessionWorkflowModule, livePalmesAppFirestoreAccess, livePalmesRaceCore, livePalmesAlerts, livePalmesAlertPresenterModule,
  livePalmesFinalists, livePalmesSecretaryFinals, livePalmesSecretaryFinalsWorkflowModule, livePalmesPublication, livePalmesDiagnostics,
  livePalmesAdminDiagnostics, livePalmesAdminMaintenance, livePalmesAdminActionsModule, livePalmesAdminModals,
  livePalmesAdminArchives, livePalmesExportActions, livePalmesExportReportsWorkflowModule, livePalmesExportReportsOptions, livePalmesAdminResults,
  livePalmesResults, livePalmesPdfImport, livePalmesCsvParser, livePalmesSeriesImport, livePalmesSeriesImportWorkflowModule,
  livePalmesSpeakerInfo, livePalmesSpeakerInfoWorkflowModule, livePalmesSpeakerInfoOptions, livePalmesProgramNavigation, livePalmesSeriesControls,
  livePalmesProgramModalsModule, livePalmesProgramModalsOptions, livePalmesEntrantHelpersModule, livePalmesSwimmerPanel, livePalmesSwimmerPanelOptions, livePalmesResultsAdminWorkflow, livePalmesResultsAdminOptions,
  livePalmesResultPublicationWorkflowModule, livePalmesResultPublicationOptions, livePalmesResultMaintenanceWorkflowModule, livePalmesResultMaintenanceOptions, livePalmesFinalWithdrawalsWorkflow, livePalmesFinalWithdrawalsOptions, livePalmesDiagnosticsWorkflow,
  livePalmesUiEvents, livePalmesUiEventsOptions, livePalmesProgramView, livePalmesConsoleRenderWorkflowModule, livePalmesRefereeView,
  livePalmesRoleQueueView, livePalmesHistoryView, livePalmesHistoryActionsModule, livePalmesHistoryPresenterModule,
  livePalmesDecisionWorkflowModule, livePalmesDecisionOptions, livePalmesHeaderView, livePalmesAlertDetailView, livePalmesAlertCardView,
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
const {
  activeCompetitionDocument,
  alertsCollection,
  competitionDocument,
  historyArchivesCollection,
  liveDataDocument,
  presenceCollection,
  presenceDocument,
  publicResultsIndexDocument,
  resultArchivesCollection,
  resultPdfsCollection,
  resultsCollection,
  roleLockDocument,
  seriesPdfsCollection,
  sessionResultsPdfsCollection
} = livePalmesAppFirestoreAccess.init({
  activeCompetitionId,
  currentClientId,
  getFirestoreDb: () => firestoreDb,
  livePalmesFirebase,
  livePalmesFirestoreRefs
});

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
  return livePalmesResultsAdminOptions.create({
    activeCompetitionId,
    alerts,
    bindOptionState,
    collections: {
      competitionDocument,
      publicResultsIndexDocument,
      resultArchivesCollection,
      resultPdfsCollection,
      sessionResultsPdfsCollection,
      seriesPdfsCollection
    },
    data,
    finalResultSessions,
    firestoreDb,
    modules: { livePalmesAdminDiagnostics, livePalmesAdminResults, livePalmesPublication },
    raceResults,
    resultPdfMigrationRunning,
    resultUploadStates,
    resultsAdminPanel,
    roleStates,
    source: window,
    state
  });
}


const {
  canWithdrawBeforeReplacementAnnouncement,
  canWithdrawFinalist,
  finalResultSessions,
  finalistAnnouncedAt,
  finalWithdrawalLimitDate,
  finalWithdrawalLimitLabel,
  formatDeadlineTime,
  hasFinalWithdrawalDeadline,
  isFinalWithdrawalDeadlineExpired
} = livePalmesFinalists;

const livePalmesSecretaryFinalsWorkflow = livePalmesSecretaryFinalsWorkflowModule.init(secretaryFinalsWorkflowOptions());

function secretaryFinalsWorkflowOptions() {
  const options = {
    finalResultSessions,
    finalRowsCount,
    livePalmesSecretaryFinals,
    secretaryFinalsPanel,
    sexDisplayLabel
  };
  bindOptionState(options, ["raceResults", "roleStates", "secretaryFinalsSession", "state"]);
  return options;
}

function ensureSecretaryFinalsSession(finals = []) {
  return livePalmesSecretaryFinalsWorkflow.ensureSession(finals);
}

function renderSecretaryFinalsPanel() {
  return livePalmesSecretaryFinalsWorkflow.renderPanel();
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
  return livePalmesDecisionOptions.create({
    alerts,
    bindOptionState,
    data,
    DECISION_LABELS,
    dom: { decisionModal, decisionPanel, roleQueue },
    modules: { livePalmesRefereeView, livePalmesRoleQueueView },
    source: window,
    state
  });
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
  return livePalmesProgramModalsOptions.create({
    bindOptionState,
    data,
    dom: { adminSeriesModal, programBtn, programFloatBtn, programModal, resultImportModal },
    modules: { livePalmesAdminModals, livePalmesAdminResults, livePalmesProgramView },
    roleStates,
    source: window,
    state
  });
}


const livePalmesResultPublicationWorkflow = livePalmesResultPublicationWorkflowModule.init(livePalmesResultPublicationWorkflowOptions());

function livePalmesResultPublicationWorkflowOptions() {
  return livePalmesResultPublicationOptions.create({
    bindOptionState,
    collections: { resultPdfsCollection, resultsCollection },
    data,
    livePalmesResults: window.LivePalmesResults,
    source: window,
    window
  });
}


function finalWithdrawalsWorkflowOptions() {
  return livePalmesFinalWithdrawalsOptions.create({
    alerts,
    dom: { alertDetailModal },
    modules: { livePalmesAlertDetailView, livePalmesSecretaryFinals },
    raceResults,
    resultsCollection,
    source: window
  });
}


const livePalmesResultMaintenanceWorkflow = livePalmesResultMaintenanceWorkflowModule.init(resultMaintenanceWorkflowOptions());

function resultMaintenanceWorkflowOptions() {
  return livePalmesResultMaintenanceOptions.create({
    bindOptionState,
    livePalmesAdminMaintenance,
    resultsCollection,
    source: window,
    window
  });
}


function swimmerPanelOptions() {
  return livePalmesSwimmerPanelOptions.create({
    data,
    dom: appDom,
    helpers: {
      categoryClass,
      escapeHtml,
      formatGap,
      formatPersonNameParts,
      formatRank,
      getBirthYearLabel,
      livePalmesHeaderView,
      livePalmesResults,
      normalizePersonName,
      sameCategory,
      timeToMs
    },
    raceResults,
    source: window,
    state
  });
}

function parseCsv(text) {
  return livePalmesCsvParser.parse(text, { eventId: state.eventId, sex: state.sex });
}

const livePalmesSpeakerInfoWorkflow = livePalmesSpeakerInfoWorkflowModule.init(speakerInfoWorkflowOptions());

function speakerInfoWorkflowOptions() {
  return livePalmesSpeakerInfoOptions.create({
    bindOptionState,
    document,
    livePalmesSpeakerInfo,
    source: window,
    SPEAKER_INFO_SHEETS,
    SPEAKER_SHEET_ID,
    window
  });
}


const livePalmesExportReportsWorkflow = livePalmesExportReportsWorkflowModule.init(exportReportsWorkflowOptions());

function exportReportsWorkflowOptions() {
  return livePalmesExportReportsOptions.create({
    bindOptionState,
    livePalmesAdminArchives,
    livePalmesExportActions,
    source: window,
    window
  });
}


function uiEventsOptions() {
  return livePalmesUiEventsOptions.create({
    appDom,
    bindOptionState,
    constants: { ADMIN_PIN, ROLE_LABELS },
    helpers: {
      historyArchivesCollection,
      historyFilters,
      renderSecretaryFinalsPanel,
      resultArchivesCollection
    },
    source: window
  });
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
