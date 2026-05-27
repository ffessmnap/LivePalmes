const STORAGE_KEY = "napSpeakerFrance2026:v15";
const ALERTS_KEY = "napSpeakerFrance2026:alerts:v1";
const LIVE_DISMISSED_ALERTS_KEY = "napSpeakerFrance2026:live-dismissed-alerts:v1";
const UNLOCKED_ROLES_KEY = "napSpeakerFrance2026:unlocked-roles:v1";
const CLIENT_ID_KEY = "napSpeakerFrance2026:client-id:v1";
const ACTIVE_VIEW_KEY = "napSpeakerFrance2026:active-view:v1";
const ROLE_STATES_KEY = "napSpeakerFrance2026:role-states:v1";
const LAST_ACTIVITY_KEY = "napSpeakerFrance2026:last-activity:v1";
const FIRESTORE_COMPETITION_ID = "livepalmes-active";
const SPEAKER_SHEET_ID = "1osoRYSAw15iwfFnpUuR4_nNl_kUui7vQGBJFyyhmmdA";
const ADMIN_PIN = "2216!";
const ROLE_PINS = {
  live: "0000",
  speaker: "0001",
  referee: "0002",
  video: "0003",
  computer: "0004",
  secretary: "0005"
};
const LOCK_DURATION_MS = 120000;
const LOCK_RECOVERY_MS = 75000;
const LOCK_HEARTBEAT_MS = 30000;
const FIREBASE_CONNECTION_CHECK_MS = 15000;
const HOME_AFTER_INACTIVITY_MS = 15 * 60 * 1000;
const COMPETITION_INACTIVITY_MS = 60 * 60 * 1000;
const COMPETITION_INACTIVITY_CHECK_MS = 60 * 1000;
const PRESENCE_DURATION_MS = 3 * 60 * 1000;
const PRESENCE_HEARTBEAT_MS = 60 * 1000;
const PRESENCE_WRITE_THROTTLE_MS = 30 * 1000;
const SPEAKER_INFO_SHEETS = {
  france: "France N-1",
  records: "Records",
  edf: "EDF",
  international: "International",
  qualifications: "Qualifs EDF",
  clubs: "Club",
  seedSources: "Lieux temps",
  competitionStats: "stat compet",
  swimmerInfos: "infos nageurs"
};
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC4sh5R8eU9SAnEsqyji6aJKnpUGgbE-AM",
  authDomain: "livepalmes.firebaseapp.com",
  projectId: "livepalmes",
  storageBucket: "livepalmes.firebasestorage.app",
  messagingSenderId: "718081132564",
  appId: "1:718081132564:web:618d1e95b6d6aefa4ebf01"
};
const fallbackData = {
  meet: {
    name: "Championnat de France 2026",
    city: "Limoges"
  },
  events: [
    { id: "50sf", label: "50 m surface", distance: "50 m", discipline: "Surface" },
    { id: "100sf", label: "100 m surface", distance: "100 m", discipline: "Surface" },
    { id: "200sf", label: "200 m surface", distance: "200 m", discipline: "Surface" },
    { id: "400is", label: "400 m immersion", distance: "400 m", discipline: "Immersion" }
  ],
  entrants: [
    { eventId: "50sf", sex: "F", lane: 4, lastName: "Martin", firstName: "Lea", club: "Limoges NAP", category: "Junior", seedTime: "00:19.72", note: "Finaliste 2025 junior" },
    { eventId: "50sf", sex: "F", lane: 5, lastName: "Bernard", firstName: "Ines", club: "Pays d'Aix", category: "Senior", seedTime: "00:19.41", note: "Proche du temps EDF" },
    { eventId: "50sf", sex: "F", lane: 3, lastName: "Roux", firstName: "Camille", club: "CS Gravenchon", category: "Cadet", seedTime: "00:20.08", note: "Meilleure perf d'engagement cadette" },
    { eventId: "50sf", sex: "M", lane: 4, lastName: "Petit", firstName: "Nolan", club: "Pessac", category: "Senior", seedTime: "00:16.84", note: "Tete de serie" },
    { eventId: "50sf", sex: "M", lane: 5, lastName: "Leroy", firstName: "Hugo", club: "ASPTT Lille", category: "Junior", seedTime: "00:17.21", note: "" },
    { eventId: "100sf", sex: "F", lane: 4, lastName: "Bernard", firstName: "Ines", club: "Pays d'Aix", category: "Senior", seedTime: "00:43.12", note: "Reference nationale" },
    { eventId: "100sf", sex: "F", lane: 5, lastName: "Martin", firstName: "Lea", club: "Limoges NAP", category: "Junior", seedTime: "00:44.08", note: "Depart rapide" },
    { eventId: "100sf", sex: "M", lane: 4, lastName: "Petit", firstName: "Nolan", club: "Pessac", category: "Senior", seedTime: "00:37.02", note: "" },
    { eventId: "200sf", sex: "F", lane: 4, lastName: "Faure", firstName: "Sarah", club: "Toulouse OAC", category: "Senior", seedTime: "01:36.72", note: "Gros finish" },
    { eventId: "400is", sex: "M", lane: 4, lastName: "Moreau", firstName: "Adam", club: "Lyon Palme", category: "Senior", seedTime: "03:05.18", note: "A surveiller aux 300 m" }
  ],
  qualifications: [
    { eventId: "50sf", sex: "F", label: "France senior", time: "00:19.35" },
    { eventId: "50sf", sex: "M", label: "France senior", time: "00:16.75" },
    { eventId: "100sf", sex: "F", label: "France senior", time: "00:42.90" },
    { eventId: "100sf", sex: "M", label: "France senior", time: "00:36.80" },
    { eventId: "200sf", sex: "F", label: "France senior", time: "01:35.80" },
    { eventId: "400is", sex: "M", label: "France senior", time: "03:03.50" }
  ],
  top2025: [
    { eventId: "50sf", sex: "F", category: "Cadet", rank: 1, name: "Camille Roux", club: "CS Gravenchon", time: "00:20.01" },
    { eventId: "50sf", sex: "F", category: "Cadet", rank: 2, name: "Maeva Colin", club: "Nice Palme", time: "00:20.30" },
    { eventId: "50sf", sex: "F", category: "Junior", rank: 1, name: "Lea Martin", club: "Limoges NAP", time: "00:19.80" },
    { eventId: "50sf", sex: "F", category: "Senior", rank: 1, name: "Ines Bernard", club: "Pays d'Aix", time: "00:19.43" },
    { eventId: "50sf", sex: "M", category: "Senior", rank: 1, name: "Nolan Petit", club: "Pessac", time: "00:16.88" },
    { eventId: "100sf", sex: "F", category: "Junior", rank: 1, name: "Lea Martin", club: "Limoges NAP", time: "00:44.21" },
    { eventId: "100sf", sex: "F", category: "Senior", rank: 1, name: "Ines Bernard", club: "Pays d'Aix", time: "00:43.00" },
    { eventId: "100sf", sex: "M", category: "Senior", rank: 1, name: "Nolan Petit", club: "Pessac", time: "00:36.95" },
    { eventId: "200sf", sex: "F", category: "Senior", rank: 1, name: "Sarah Faure", club: "Toulouse OAC", time: "01:36.40" },
    { eventId: "400is", sex: "M", category: "Senior", rank: 1, name: "Adam Moreau", club: "Lyon Palme", time: "03:05.00" }
  ],
  records: [
    { eventId: "50sf", sex: "F", category: "Cadet", label: "Meilleure performance cadette", holder: "Reference a renseigner", time: "00:19.98" },
    { eventId: "50sf", sex: "F", category: "Junior", label: "Record de France junior", holder: "Reference a renseigner", time: "00:19.45" },
    { eventId: "50sf", sex: "F", category: "Senior", label: "Record de France senior", holder: "Reference a renseigner", time: "00:18.92" },
    { eventId: "50sf", sex: "M", category: "Junior", label: "Record de France junior", holder: "Reference a renseigner", time: "00:16.96" },
    { eventId: "50sf", sex: "M", category: "Senior", label: "Record de France senior", holder: "Reference a renseigner", time: "00:16.20" },
    { eventId: "100sf", sex: "F", category: "Senior", label: "Record de France senior", holder: "Reference a renseigner", time: "00:41.90" },
    { eventId: "100sf", sex: "M", category: "Senior", label: "Record de France senior", holder: "Reference a renseigner", time: "00:35.90" }
  ],
  notes: {}
};

const sampleData = window.SPEAKER_DATA || fallbackData;
const livePalmesFirebase = window.LivePalmesFirebase || {};
const livePalmesRoleAccess = window.LivePalmesRoleAccess || {};
const livePalmesRoleState = window.LivePalmesRoleState || {};
const livePalmesRaceCore = window.LivePalmesRaceCore || {};
const livePalmesAlerts = window.LivePalmesAlerts || {};
const livePalmesFinalists = window.LivePalmesFinalists || {};
const livePalmesSecretaryFinals = window.LivePalmesSecretaryFinals || {};
const livePalmesPublication = window.LivePalmesPublication || {};
const livePalmesAdminDiagnostics = window.LivePalmesAdminDiagnostics || {};
const livePalmesAdminModals = window.LivePalmesAdminModals || {};
const livePalmesAdminArchives = window.LivePalmesAdminArchives || {};
const livePalmesAdminResults = window.LivePalmesAdminResults || {};
const livePalmesPdfImport = window.LivePalmesPdfImport || {};
const livePalmesSeriesImport = window.LivePalmesSeriesImport || {};
const livePalmesSpeakerInfo = window.LivePalmesSpeakerInfo || {};
const livePalmesProgramNavigation = window.LivePalmesProgramNavigation || {};
const livePalmesSwimmerPanel = window.LivePalmesSwimmerPanel || {};
const livePalmesResultsAdminWorkflow = window.LivePalmesResultsAdminWorkflow || {};
const livePalmesFinalWithdrawalsWorkflow = window.LivePalmesFinalWithdrawalsWorkflow || {};
const livePalmesDiagnosticsWorkflow = window.LivePalmesDiagnosticsWorkflow || {};
const livePalmesUiEvents = window.LivePalmesUiEvents || {};
const livePalmesProgramView = window.LivePalmesProgramView || {};
const livePalmesRefereeView = window.LivePalmesRefereeView || {};
const livePalmesRoleQueueView = window.LivePalmesRoleQueueView || {};
const livePalmesHistoryView = window.LivePalmesHistoryView || {};
const livePalmesHeaderView = window.LivePalmesHeaderView || {};
const livePalmesAlertDetailView = window.LivePalmesAlertDetailView || {};
const livePalmesAlertCardView = window.LivePalmesAlertCardView || {};
const livePalmesLineStatusView = window.LivePalmesLineStatusView || {};

let data = loadData();
let unlockedRoles = loadUnlockedRoles();
function createRoleState(role = "speaker") {
  const initial = initialProgramPosition();
  return livePalmesRoleState.createRoleState({
    role,
    initial,
    firstEventId: data.events[0]?.id || ""
  });
}

function cloneRoleState(nextState) {
  return livePalmesRoleState.cloneRoleState(nextState);
}

function defaultRoleStates() {
  const initial = initialProgramPosition();
  return livePalmesRoleState.defaultRoleStates({
    initial,
    firstEventId: data.events[0]?.id || ""
  });
}

function normalizeRoleState(role, savedState, fallbackState) {
  return livePalmesRoleState.normalizeRoleState(role, savedState, fallbackState, (eventId) =>
    data.events.some((event) => event.id === eventId)
  );
}

function loadRoleStates() {
  const defaults = defaultRoleStates();
  const saved = localStorage.getItem(ROLE_STATES_KEY);
  if (!saved) return defaults;
  try {
    return livePalmesRoleState.parseRoleStates(saved, {
      initial: initialProgramPosition(),
      firstEventId: data.events[0]?.id || "",
      eventExists: (eventId) => data.events.some((event) => event.id === eventId)
    });
  } catch {
    return defaults;
  }
}

function saveRoleStates() {
  localStorage.setItem(ROLE_STATES_KEY, JSON.stringify(roleStates));
}

function loadUnlockedRoles() {
  return livePalmesRoleState.parseUnlockedRoles(localStorage.getItem(UNLOCKED_ROLES_KEY));
}

function saveUnlockedRoles() {
  localStorage.setItem(UNLOCKED_ROLES_KEY, JSON.stringify(unlockedRoles));
}

function pinLockEnabled() {
  return livePalmesRoleAccess.pinLockEnabled(data.notes);
}

function competitionModeEnabled() {
  return data.notes?.competitionMode === true;
}

function realtimeSyncEnabled() {
  return competitionModeEnabled();
}

function publicPositionEnabled() {
  return data.notes?.publicPositionEnabled === true;
}

function currentRolePins() {
  return livePalmesRoleAccess.currentRolePins(ROLE_PINS, data.notes);
}

function knownRole(role) {
  return livePalmesRoleAccess.knownRole(role);
}

function lastActivityTimestamp() {
  return Number(localStorage.getItem(LAST_ACTIVITY_KEY) || "0") || 0;
}

function saveLastActivityTimestamp(timestamp = Date.now()) {
  localStorage.setItem(LAST_ACTIVITY_KEY, String(timestamp));
}

function shouldReturnHomeForInactivity() {
  const last = lastActivityTimestamp();
  return last > 0 && Date.now() - last > HOME_AFTER_INACTIVITY_MS;
}

function loadActiveView() {
  const saved = localStorage.getItem(ACTIVE_VIEW_KEY);
  if (shouldReturnHomeForInactivity()) return { role: "live", profileHomeActive: true };
  if (!saved) return { role: "live", profileHomeActive: true };
  try {
    const parsed = JSON.parse(saved);
    return {
      role: knownRole(parsed?.role) ? parsed.role : "live",
      profileHomeActive: parsed?.profileHomeActive !== false
    };
  } catch {
    return { role: "live", profileHomeActive: true };
  }
}

function saveActiveView() {
  localStorage.setItem(ACTIVE_VIEW_KEY, JSON.stringify({
    role: state.role,
    profileHomeActive
  }));
}

function unlockRole(role) {
  unlockedRoles = [role];
  saveUnlockedRoles();
}

function roleIsUnlocked(role) {
  return livePalmesRoleAccess.roleIsUnlocked(role, {
    notes: data.notes,
    unlockedRoles
  });
}

function requestRoleAccess(role) {
  if (roleIsUnlocked(role)) return true;
  return false;
}

function saveCurrentRoleState() {
  roleStates[state.role] = cloneRoleState(state);
  saveRoleStates();
}

function currentClientId() {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

function protectedRole(role) {
  return livePalmesRoleAccess.protectedRole(role);
}

function roleConnectionLimit(role) {
  return livePalmesRoleAccess.roleConnectionLimit(role);
}

function switchRoleUnlocked(nextRole) {
  saveCurrentRoleState();
  state = cloneRoleState(roleStates[nextRole] || createRoleState(nextRole));
  state.role = nextRole;
  if (!isSpeakerView() && state.series === "all") {
    state.series = firstSeriesSelectionForCurrentRace();
  }
  state.selectedSwimmerId = "";
  state.selectedRecordKey = "";
}

function switchRole(nextRole) {
  if (!ROLE_LABELS[nextRole]) return;
  switchRoleUnlocked(nextRole);
}

const initialView = loadActiveView();
if (initialView.profileHomeActive && shouldReturnHomeForInactivity()) {
  unlockedRoles = [];
  saveUnlockedRoles();
}
const initialRole = knownRole(initialView.role) ? initialView.role : "live";
let state = createRoleState(initialRole);
let roleStates = loadRoleStates();
state = cloneRoleState(roleStates[initialRole] || roleStates.live);
state.role = initialRole;

let alerts = loadAlerts();
let liveDismissedAlertIds = loadLiveDismissedAlerts();
let decisionDraft = createDecisionDraft();
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
let profileHomeActive = initialView.profileHomeActive;
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

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(sampleData);
  try {
    return normalizeData(JSON.parse(saved));
  } catch {
    return structuredClone(sampleData);
  }
}

function loadAlerts() {
  const saved = localStorage.getItem(ALERTS_KEY);
  if (!saved) return [];
  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

function saveAlerts() {
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
}

function activeCompetitionDocument() {
  return livePalmesFirebase.competitionDocument(firestoreDb, activeCompetitionId);
}

function competitionDocument(competitionId = activeCompetitionId) {
  return livePalmesFirebase.competitionDocument(firestoreDb, competitionId);
}

function alertsCollection() {
  return livePalmesFirebase.collectionRef(firestoreDb, activeCompetitionId, "alerts");
}

function historyArchivesCollection() {
  return livePalmesFirebase.collectionRef(firestoreDb, activeCompetitionId, "historyArchives");
}

function resultArchivesCollection() {
  return livePalmesFirebase.collectionRef(firestoreDb, activeCompetitionId, "resultArchives");
}

function resultsCollection() {
  return livePalmesFirebase.collectionRef(firestoreDb, activeCompetitionId, "results");
}

function resultPdfsCollection() {
  return livePalmesFirebase.collectionRef(firestoreDb, activeCompetitionId, "resultPdfs");
}

function seriesPdfsCollection() {
  return livePalmesFirebase.collectionRef(firestoreDb, activeCompetitionId, "seriesPdfs");
}

function sessionResultsPdfsCollection() {
  return livePalmesFirebase.collectionRef(firestoreDb, activeCompetitionId, "sessionResultsPdfs");
}

function publicResultsIndexDocument() {
  return livePalmesFirebase.publicResultsIndexDocument(firestoreDb, activeCompetitionId);
}

function liveDataDocument(competitionId = activeCompetitionId) {
  return livePalmesFirebase.liveDataDocument(firestoreDb, competitionId);
}

function roleLockDocument(role) {
  return livePalmesFirebase.roleLockDocument(firestoreDb, activeCompetitionId, role);
}

function presenceCollection() {
  return livePalmesFirebase.collectionRef(firestoreDb, activeCompetitionId, "presence");
}

function presenceDocument(id = `console-${currentClientId()}`) {
  return livePalmesFirebase.presenceDocument(firestoreDb, activeCompetitionId, id);
}

function emptyPresenceCounts() {
  return {
    live: 0,
    speaker: 0,
    referee: 0,
    video: 0,
    computer: 0,
    secretary: 0
  };
}

function presenceLabel(count) {
  const value = Number(count || 0);
  return `${value} connecté${value > 1 ? "s" : ""}`;
}

function renderPresenceCounts() {
  const counts = { ...emptyPresenceCounts(), ...(presenceCounts || {}) };
  document.querySelectorAll("[data-presence-role]").forEach((node) => {
    node.textContent = presenceLabel(counts[node.dataset.presenceRole] || 0);
  });
}

function refereeProgress() {
  return data.notes?.refereeProgress || null;
}

function progressProgramRow() {
  const progress = refereeProgress();
  if (!progress?.programKey) return null;
  return (data.program || []).find((row) => programKey(row) === progress.programKey) || null;
}

function refereeProgressLabel(progress = refereeProgress()) {
  if (!progress?.programKey) return "";
  const row = (data.program || []).find((item) => programKey(item) === progress.programKey) || progressProgramRow();
  const event = data.events.find((item) => item.id === (row?.eventId || progress.eventId));
  const session = progress.session ? `S${progress.session}` : "";
  const eventLabel = event?.label || row?.label || progress.eventLabel || "course";
  const sex = sexDisplayLabel(row?.sex || progress.sex || "");
  const phase = isFinalStage(progress.stage) ? finalStageLabel(progress.stage) : (progress.series ? `série ${progress.series}` : "");
  return [session, eventLabel, sex, phase].filter(Boolean).join(" · ");
}

function refereeProgressShortLabel(progress = refereeProgress()) {
  if (!progress?.programKey) return "";
  const session = progress.session ? `S${progress.session}` : "";
  const phase = isFinalStage(progress.stage)
    ? finalStageLabel(progress.stage)
    : `série ${progress.series || "-"}`;
  return `Point JA : ${[session, phase].filter(Boolean).join(" · ")}`;
}

function currentRefereeProgressPayload() {
  const row = selectedProgramRow() || programRows().find((item) => item.eventId === state.eventId && item.sex === state.sex);
  if (!row) return null;
  return {
    programKey: programKey(row),
    eventId: row.eventId,
    eventLabel: data.events.find((item) => item.id === row.eventId)?.label || row.label || row.eventId,
    sex: row.sex,
    session: state.session !== "all" ? String(state.session || row.session || "") : String(row.session || ""),
    series: isFinalStage(state.series) ? "" : String(state.series || ""),
    stage: isFinalStage(state.series) ? String(state.series) : (row.stage || "series"),
    order: Number(row.order || 0),
    updatedAt: new Date().toISOString()
  };
}

function sameRefereeProgress(a, b) {
  return Boolean(a?.programKey && b?.programKey) &&
    String(a.programKey) === String(b.programKey) &&
    String(a.series || "") === String(b.series || "") &&
    String(a.stage || "") === String(b.stage || "");
}

function currentRefereeProgressIsHere() {
  return sameRefereeProgress(currentRefereeProgressPayload(), refereeProgress());
}

function currentPublicProgressPayload() {
  return publicProgressPayloadFromState(state, { requireSpeaker: true });
}

function programRowForRoleState(roleState = state) {
  if (roleState.programKey) {
    const exact = (data.program || []).find((row) => programKey(row) === roleState.programKey);
    if (exact) return exact;
  }
  return (data.program || []).find((item) =>
    item.eventId === roleState.eventId &&
    item.sex === roleState.sex &&
    (!roleState.session || roleState.session === "all" || item.session === roleState.session)
  ) || null;
}

function publicProgressPayloadFromState(roleState = state, options = {}) {
  if (options.requireSpeaker && roleState.role !== "speaker") return null;
  if (!publicPositionEnabled() && options.requireSpeaker) return null;
  const row = programRowForRoleState(roleState);
  if (!row) return null;
  return {
    programKey: programKey(row),
    eventId: row.eventId,
    eventLabel: data.events.find((item) => item.id === row.eventId)?.label || row.label || row.eventId,
    sex: row.sex,
    session: roleState.session !== "all" ? String(roleState.session || row.session || "") : String(row.session || ""),
    series: isFinalStage(roleState.series) ? "" : String(roleState.series || ""),
    stage: isFinalStage(roleState.series) ? String(roleState.series) : (row.stage || "series"),
    order: Number(row.order || 0),
    updatedAt: new Date().toISOString()
  };
}

function publicProgressSignature(progress) {
  return [progress?.programKey, progress?.session, progress?.series, progress?.stage].join("|");
}

function publishPublicProgressIfNeeded() {
  const progress = currentPublicProgressPayload();
  if (!progress || !liveDataDocument()) return;
  const signature = publicProgressSignature(progress);
  if (!signature || signature === lastPublicProgressSignature) return;
  lastPublicProgressSignature = signature;
  updateLiveNotes("Repère public compétition", { publicProgress: progress }).catch((error) => {
    console.warn("Publication du repère public impossible", error);
    lastPublicProgressSignature = "";
  });
}

async function setPublicPositionEnabled(enabled) {
  const sourceState = state.role === "speaker" ? state : (roleStates.speaker || state);
  const nextProgress = enabled ? publicProgressPayloadFromState(sourceState) : null;
  lastPublicProgressSignature = "";
  await updateLiveNotes(enabled ? "Repère public activé" : "Repère public désactivé", {
    publicPositionEnabled: Boolean(enabled),
    publicProgress: nextProgress
  });
}

function homeActionCounts() {
  return livePalmesAlerts.homeActionCounts(alerts, emptyPresenceCounts());
}

function actionCountLabel(count) {
  return livePalmesAlerts.actionCountLabel(count);
}

function renderHomeActionCounts() {
  const counts = homeActionCounts();
  document.querySelectorAll("[data-home-actions-role]").forEach((node) => {
    const value = counts[node.dataset.homeActionsRole] || 0;
    node.hidden = value <= 0;
    node.textContent = actionCountLabel(value);
  });
}

function updateStickyAlertOffset() {
  const height = topbar?.getBoundingClientRect().height || 0;
  document.documentElement.style.setProperty("--alert-sticky-top", `${Math.ceil(height + 8)}px`);
}

async function updateConsolePresence(force = false) {
  const doc = presenceDocument();
  if (!doc) return;
  if (profileHomeActive) {
    if (consolePresenceActive) await releaseConsolePresence();
    return;
  }
  const timestamp = Date.now();
  if (!force && timestamp - lastPresenceWriteAt < PRESENCE_WRITE_THROTTLE_MS) return;
  const now = new Date();
  try {
    await doc.set({
      id: doc.id,
      clientId: currentClientId(),
      role: state.role || "live",
      page: "console",
      updatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + PRESENCE_DURATION_MS).toISOString()
    });
    lastPresenceWriteAt = timestamp;
    consolePresenceActive = true;
  } catch (error) {
    console.warn("Présence console impossible", error);
  }
}

async function releaseConsolePresence() {
  const doc = presenceDocument();
  if (!doc || !consolePresenceActive) return;
  try {
    await doc.delete();
    consolePresenceActive = false;
  } catch (error) {
    console.warn("Suppression présence console impossible", error);
  }
}

async function refreshPresenceCounts() {
  const collection = presenceCollection();
  if (!collection) return;
  try {
    const snapshot = await collection.get({ source: "server" });
    const counts = emptyPresenceCounts();
    const now = Date.now();
    snapshot.docs.forEach((doc) => {
      const item = doc.data() || {};
      if ((Date.parse(item.expiresAt || "") || 0) <= now) return;
      if (item.page === "console" && item.role && Object.prototype.hasOwnProperty.call(counts, item.role)) {
        counts[item.role] += 1;
      }
    });
    presenceCounts = counts;
    renderPresenceCounts();
  } catch (error) {
    console.warn("Lecture présence impossible", error);
  }
}

function sanitizeAlertForFirestore(alert) {
  return livePalmesFirebase.sanitizeForFirestore(alert);
}

async function syncAlertToFirestore(alert) {
  const collection = alertsCollection();
  if (!collection || !alert?.id) return;
  try {
    await collection.doc(alert.id).set(sanitizeAlertForFirestore(alert));
  } catch (error) {
    console.warn("Synchronisation Firebase impossible", error);
    renderDataStatus("Firebase n'a pas pu enregistrer cette action. L'outil continue en local sur cet appareil.");
  }
}

async function syncAlertToFirestoreStrict(alert) {
  const collection = alertsCollection();
  if (!collection || !alert?.id) throw new Error("Firebase n'est pas disponible.");
  await collection.doc(alert.id).set(sanitizeAlertForFirestore(alert));
}

async function syncAlertChangesToFirestore(alertId, changes) {
  const collection = alertsCollection();
  if (!collection || !alertId) return;
  try {
    await collection.doc(alertId).set(sanitizeAlertForFirestore(changes), { merge: true });
  } catch (error) {
    console.warn("Synchronisation Firebase impossible", error);
    renderDataStatus("Firebase n'a pas pu enregistrer cette action. L'outil continue en local sur cet appareil.");
  }
}

async function syncAlertChangesToFirestoreStrict(alertId, changes) {
  const collection = alertsCollection();
  if (!collection || !alertId) throw new Error("Firebase n'est pas disponible.");
  await collection.doc(alertId).set(sanitizeAlertForFirestore(changes), { merge: true });
}

function markAlertAlreadyClosedError(error) {
  if (error && typeof error === "object") error.alertAlreadyClosed = true;
  return error;
}

let toastTimer = null;

function showToast(message, tone = "error") {
  let toast = document.querySelector(".app-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "app-toast";
    toast.setAttribute("role", "status");
    document.body.appendChild(toast);
  }
  toast.className = `app-toast ${tone}`;
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, 4500);
}

function isFinalResultAlert(alert) {
  return livePalmesAlerts.isFinalResultAlert(alert);
}

async function deleteFinalResultAlerts(resultId) {
  if (!resultId) return 0;
  const linkedAlerts = alerts.filter((alert) => isFinalResultAlert(alert) && alert.resultId === resultId);
  if (!linkedAlerts.length) return 0;
  alerts = alerts.filter((alert) => !(isFinalResultAlert(alert) && alert.resultId === resultId));
  saveAlerts();
  const collection = alertsCollection();
  if (collection && firestoreDb) {
    const batch = firestoreDb.batch();
    linkedAlerts.forEach((alert) => batch.delete(collection.doc(alert.id)));
    await batch.commit();
  }
  render();
  return linkedAlerts.length;
}

async function cleanupOrphanFinalResultAlerts() {
  if (!resultsSnapshotReady) return;
  const resultIds = new Set(raceResults.map((result) => result.id).filter(Boolean));
  const orphanResultIds = [...new Set(alerts
    .filter((alert) => isFinalResultAlert(alert) && alert.resultId && !resultIds.has(alert.resultId))
    .map((alert) => alert.resultId))];
  for (const resultId of orphanResultIds) {
    await deleteFinalResultAlerts(resultId);
  }
}

async function cleanupResolvedSpeakerResultAlerts() {
  if (!resultsSnapshotReady) return;
  const now = new Date().toISOString();
  const resolved = alerts.filter((alert) =>
    alert.speakerStatus === "pending" &&
    !alert.cancelledAt &&
    speakerAlertAlreadyResolvedByResult(alert)
  );
  if (!resolved.length) return;
  for (const alert of resolved) {
    alert.speakerStatus = "none";
    alert.cancelledAt = alert.cancelledAt || now;
    alert.updatedAt = now;
    await syncAlertChangesToFirestore(alert.id, {
      speakerStatus: "none",
      cancelledAt: alert.cancelledAt,
      updatedAt: now
    });
  }
  saveAlerts();
}

async function clearFirestoreAlerts() {
  const collection = alertsCollection();
  if (!collection) return;
  const snapshot = await collection.get();
  const batch = firestoreDb.batch();
  snapshot.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

async function deleteCollectionDocuments(collectionRef, { nestedItems = false } = {}) {
  if (typeof livePalmesAdminMaintenance.deleteCollectionDocuments === "function") {
    return livePalmesAdminMaintenance.deleteCollectionDocuments(collectionRef, { firestoreDb, nestedItems });
  }
  if (!collectionRef || !firestoreDb) return 0;
  const snapshot = await collectionRef.get();
  let deleted = 0;
  for (const doc of snapshot.docs) {
    if (nestedItems) {
      const items = await doc.ref.collection("items").get();
      if (!items.empty) {
        const itemBatch = firestoreDb.batch();
        items.docs.forEach((item) => itemBatch.delete(item.ref));
        await itemBatch.commit();
      }
    }
    const batch = firestoreDb.batch();
    batch.delete(doc.ref);
    await batch.commit();
    deleted += 1;
  }
  return deleted;
}

async function publishLiveDataToFirestore(nextData, source = "Import PDF séries") {
  return publishLiveDataToCompetition(nextData, source, activeCompetitionId);
}

async function publishLiveDataToCompetition(nextData, source = "Import PDF séries", competitionId = activeCompetitionId) {
  const doc = liveDataDocument(competitionId);
  if (!doc) {
    firebaseStatus = "local";
    return;
  }
  const payload = normalizeData(nextData);
  const livePayload = {
    meet: payload.meet,
    events: payload.events,
    entrants: payload.entrants,
    series: payload.series,
    program: payload.program,
    qualifications: payload.qualifications,
    top2025: payload.top2025,
    records: payload.records,
    edfMembers: payload.edfMembers,
    internationalMedals: payload.internationalMedals,
    competitionStats: payload.competitionStats,
    swimmerInfos: payload.swimmerInfos,
    sourceVersion: payload.sourceVersion,
    notes: {
      ...(payload.notes || {}),
      livePublishedAt: new Date().toISOString(),
      liveSource: source
    }
  };
  await doc.set({
    data: sanitizeAlertForFirestore(livePayload),
    updatedAt: livePayload.notes.livePublishedAt,
    source
  });
  if (competitionId === activeCompetitionId) {
    await publishPublicResultsIndex({ silent: true });
  }
  firebaseStatus = "connected";
}

async function updateLiveNotes(label, notePatch = {}) {
  const nextData = normalizeData({
    ...data,
    notes: {
      ...(data.notes || {}),
      ...notePatch,
      importHistory: label ? appendImportHistory(data.notes || {}, label) : (data.notes?.importHistory || [])
    },
    sourceVersion: `notes-${Date.now()}`
  });
  data = nextData;
  saveData();
  renderDataStatus();
  try {
    await publishLiveDataToFirestore(nextData, label || "Mise à jour LivePalmes");
  } catch (error) {
    console.warn("Publication des notes impossible", error);
  }
}

function lockExpired(lock) {
  return livePalmesRoleAccess.lockExpired(lock);
}

function lockLastActivityTime(lock) {
  return livePalmesRoleAccess.lockLastActivityTime(lock);
}

function lockLooksAbandoned(lock) {
  return livePalmesRoleAccess.lockLooksAbandoned(lock, LOCK_RECOVERY_MS);
}

async function releaseRoleLock(role = activeRoleLock?.role) {
  if (!role || !activeRoleLock || activeRoleLock.role !== role) return;
  if (activeRoleLock.adminBypass) {
    activeRoleLock = null;
    return;
  }
  const doc = roleLockDocument(role);
  if (!doc) return;
  const clientId = currentClientId();
  try {
    if (roleConnectionLimit(role) > 1 && firestoreDb) {
      await firestoreDb.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(doc);
        if (!snapshot.exists) return;
        const lock = snapshot.data() || {};
        const clients = { ...(lock.clients || {}) };
        delete clients[clientId];
        const activeClients = livePalmesRoleAccess.activeClients(clients);
        if (Object.keys(activeClients).length) {
          transaction.set(doc, {
            role,
            roleLabel: ROLE_LABELS[role] || role,
            clients: activeClients,
            updatedAt: new Date().toISOString()
          }, { merge: false });
        } else {
          transaction.delete(doc);
        }
      });
    } else {
      const snapshot = await doc.get();
      if (snapshot.exists && snapshot.data()?.clientId === clientId) {
        await doc.delete();
      }
    }
  } catch (error) {
    console.warn("Libération du verrou impossible", error);
  } finally {
    if (activeRoleLock?.role === role) activeRoleLock = null;
  }
}

async function acquireRoleLock(role, options = {}) {
  if (!protectedRole(role) || !pinLockEnabled()) {
    await releaseRoleLock();
    return true;
  }
  if (options.adminBypass) {
    await releaseRoleLock();
    activeRoleLock = { role, adminBypass: true };
    return true;
  }
  const doc = roleLockDocument(role);
  if (!doc || !firestoreDb) {
    activeRoleLock = { role, adminBypass: false };
    return true;
  }
  const clientId = currentClientId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LOCK_DURATION_MS).toISOString();
  const payload = {
    role,
    clientId,
    roleLabel: ROLE_LABELS[role] || role,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt
  };
  try {
    let blockingLock = null;
    const allowed = await firestoreDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(doc);
      const lock = snapshot.exists ? snapshot.data() : null;
      if (roleConnectionLimit(role) > 1) {
        const clients = livePalmesRoleAccess.activeClients(lock?.clients || {});
        if (!clients[clientId] && Object.keys(clients).length >= roleConnectionLimit(role)) return false;
        clients[clientId] = {
          clientId,
          createdAt: clients[clientId]?.createdAt || now.toISOString(),
          updatedAt: now.toISOString(),
          expiresAt
        };
        transaction.set(doc, {
          role,
          roleLabel: ROLE_LABELS[role] || role,
          clients,
          updatedAt: now.toISOString(),
          expiresAt
        }, { merge: false });
        return true;
      }
      if (lock && lock.clientId !== clientId && !lockExpired(lock)) {
        blockingLock = lock;
        return false;
      }
      transaction.set(doc, payload);
      return true;
    });
    if (!allowed) {
      if (lockLooksAbandoned(blockingLock)) {
        const last = formatAlertTime(blockingLock?.updatedAt);
        const ok = window.confirm([
          `La console ${ROLE_LABELS[role] || role} semble encore réservée par un ancien appareil.`,
          last ? `Dernier signal reçu à ${last}.` : "Aucun signal récent n'a été trouvé.",
          "",
          "Forcer l'ouverture de cette console ?"
        ].join("\n"));
        if (ok) {
          await doc.set(payload, { merge: false });
          if (activeRoleLock?.role && activeRoleLock.role !== role) {
            await releaseRoleLock(activeRoleLock.role);
          }
          activeRoleLock = { role, adminBypass: false };
          return true;
        }
      }
      window.alert(roleConnectionLimit(role) > 1
        ? `La console ${ROLE_LABELS[role] || role} est déjà utilisée sur ${roleConnectionLimit(role)} appareils.`
        : `La console ${ROLE_LABELS[role] || role} est déjà utilisée sur un autre appareil.`);
      return false;
    }
    if (activeRoleLock?.role && activeRoleLock.role !== role) {
      await releaseRoleLock(activeRoleLock.role);
    }
    activeRoleLock = { role, adminBypass: false };
    return true;
  } catch (error) {
    console.warn("Réservation de console impossible", error);
    window.alert("Impossible de vérifier si cette console est déjà utilisée. L'accès est autorisé sur cet appareil.");
    activeRoleLock = { role, adminBypass: false };
    return true;
  }
}

async function heartbeatRoleLock() {
  if (!activeRoleLock || activeRoleLock.adminBypass || !protectedRole(activeRoleLock.role) || !pinLockEnabled()) return;
  const doc = roleLockDocument(activeRoleLock.role);
  if (!doc) return;
  const clientId = currentClientId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LOCK_DURATION_MS).toISOString();
  try {
    if (roleConnectionLimit(activeRoleLock.role) > 1 && firestoreDb) {
      await firestoreDb.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(doc);
        if (!snapshot.exists) {
          activeRoleLock = null;
          return;
        }
        const lock = snapshot.data() || {};
        const clients = livePalmesRoleAccess.activeClients(lock.clients || {});
        if (!clients[clientId]) {
          activeRoleLock = null;
          return;
        }
        clients[clientId] = {
          ...clients[clientId],
          updatedAt: now.toISOString(),
          expiresAt
        };
        transaction.set(doc, {
          role: activeRoleLock.role,
          roleLabel: ROLE_LABELS[activeRoleLock.role] || activeRoleLock.role,
          clients,
          updatedAt: now.toISOString(),
          expiresAt
        }, { merge: false });
      });
    } else {
      const snapshot = await doc.get();
      if (!snapshot.exists || snapshot.data()?.clientId !== clientId) {
        activeRoleLock = null;
        return;
      }
      await doc.set({
        updatedAt: now.toISOString(),
        expiresAt
      }, { merge: true });
    }
  } catch (error) {
    console.warn("Maintien de la réservation impossible", error);
  }
}

function mergeRemoteLiveData(remoteData) {
  return normalizeData({
    ...data,
    meet: remoteData.meet || data.meet,
    events: Array.isArray(remoteData.events) ? remoteData.events : data.events,
    entrants: Array.isArray(remoteData.entrants) ? remoteData.entrants : data.entrants,
    series: Array.isArray(remoteData.series) ? remoteData.series : data.series,
    program: Array.isArray(remoteData.program) ? remoteData.program : data.program,
    qualifications: Array.isArray(remoteData.qualifications) ? remoteData.qualifications : data.qualifications,
    top2025: Array.isArray(remoteData.top2025) ? remoteData.top2025 : data.top2025,
    records: Array.isArray(remoteData.records) ? remoteData.records : data.records,
    edfMembers: Array.isArray(remoteData.edfMembers) ? remoteData.edfMembers : data.edfMembers,
    internationalMedals: Array.isArray(remoteData.internationalMedals) ? remoteData.internationalMedals : data.internationalMedals,
    competitionStats: Array.isArray(remoteData.competitionStats) ? remoteData.competitionStats : data.competitionStats,
    swimmerInfos: Array.isArray(remoteData.swimmerInfos) ? remoteData.swimmerInfos : data.swimmerInfos,
    sourceVersion: remoteData.sourceVersion || data.sourceVersion,
    notes: {
      ...(data.notes || {}),
      ...(remoteData.notes || {}),
      sourceMode: remoteData.notes?.sourceMode || "series-live",
      sourceLabel: remoteData.notes?.sourceLabel || "Séries importées depuis LivePalmes"
    }
  });
}

function applyRemoteLiveData(remoteData) {
  if (!remoteData) return;
  const wasLocked = pinLockEnabled();
  applyingRemoteData = true;
  // Les mises à jour live arrivent souvent pendant la compétition : elles ne doivent
  // pas ramener le JA, la vidéo ou le live sur la première série.
  applyFreshData(mergeRemoteLiveData(remoteData), false);
  applyingRemoteData = false;
  if (wasLocked && !pinLockEnabled()) {
    unlockedRoles = [];
    saveUnlockedRoles();
  }
}

function renderRoleCodesModal() {
  if (!roleCodesModal) return;
  const pins = currentRolePins();
  const active = pinLockEnabled();
  const roleOrder = ["live", "speaker", "referee", "video", "computer", "secretary"];
  roleCodesModal.hidden = false;
  roleCodesModal.innerHTML = livePalmesAdminModals.renderRoleCodesModalHtml({
    active,
    pins,
    roles: roleOrder.map((role) => ({ role, label: ROLE_LABELS[role] }))
  });
}

function renderRoleCodesAdminModal(action = "codes") {
  if (!roleCodesModal) return;
  roleCodesModal.hidden = false;
  const title = action === "reset" ? "Confirmer le RAZ" : "Code administrateur";
  const help = action === "reset"
    ? "Entre le code administrateur pour archiver puis remettre l'historique à zéro."
    : "Entre le code administrateur pour modifier les codes des consoles.";
  roleCodesModal.innerHTML = livePalmesAdminModals.renderRoleCodesAdminModalHtml({ action, help, title });
  roleCodesModal.querySelector("#roleCodeAdminInput")?.focus();
}

function renderResetHistoryModal() {
  if (!roleCodesModal) return;
  roleCodesModal.hidden = false;
  roleCodesModal.innerHTML = livePalmesAdminModals.renderResetHistoryModalHtml();
  roleCodesModal.querySelector("#resetHistoryInput")?.focus();
}

function renderResetResultsModal() {
  if (!roleCodesModal) return;
  const activeSession = ensureResultsAdminSession();
  const sessions = resultSessions();
  const selectedSession = activeSession || sessions[0]?.number || "";
  roleCodesModal.hidden = false;
  roleCodesModal.innerHTML = livePalmesAdminModals.renderResetResultsModalHtml({
    activeSession,
    selectedSession,
    sessions
  });
  roleCodesModal.querySelector("#resetResultsInput")?.focus();
}

function renderPublicSessionInfosModal() {
  if (!roleCodesModal) return;
  const sessions = resultSessions();
  const infos = data.notes?.publicSessionInfos || {};
  roleCodesModal.hidden = false;
  roleCodesModal.innerHTML = livePalmesAdminModals.renderPublicSessionInfosModalHtml({ infos, sessions });
}

async function renderHistoryArchivesModal({ canDelete = false } = {}) {
  if (!roleCodesModal) return;
  const historyCollection = historyArchivesCollection();
  const resultCollection = resultArchivesCollection();
  let historyArchives = [];
  let resultArchives = [];
  if (historyCollection) {
    try {
      const snapshot = await historyCollection.orderBy("createdAt", "desc").limit(20).get();
      historyArchives = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      if (resultCollection) {
        const resultSnapshot = await resultCollection.orderBy("createdAt", "desc").limit(20).get();
        resultArchives = resultSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      }
    } catch (error) {
      console.warn("Lecture des archives impossible", error);
      window.alert("Impossible de lire les archives historiques.");
      return;
    }
  }
  roleCodesModal.hidden = false;
  roleCodesModal.innerHTML = livePalmesAdminModals.renderHistoryArchivesModalHtml({
    canDelete,
    formatDateTime: formatAlertDateTime,
    historyArchives,
    resultArchives
  });
}

function renderRolePinModal(role) {
  if (!roleCodesModal) return;
  const label = ROLE_LABELS[role] || "Console";
  roleCodesModal.hidden = false;
  roleCodesModal.innerHTML = livePalmesAdminModals.renderRolePinModalHtml({ label, role });
  roleCodesModal.querySelector("#rolePinInput")?.focus();
}

function askRolePin(role) {
  if (roleIsUnlocked(role)) return Promise.resolve({ allowed: true, adminBypass: false });
  renderRolePinModal(role);
  return new Promise((resolve) => {
    rolePinResolver = resolve;
  });
}

function finishRolePin(result) {
  if (rolePinResolver) {
    rolePinResolver(result);
    rolePinResolver = null;
  }
  closeRoleCodesModal();
}

function closeRoleCodesModal() {
  if (!roleCodesModal) return;
  roleCodesModal.hidden = true;
  roleCodesModal.innerHTML = "";
}

function readRolePinsFromModal() {
  const pins = {};
  roleCodesModal?.querySelectorAll("[data-role-code]").forEach((input) => {
    pins[input.dataset.roleCode] = String(input.value || "").trim();
  });
  const invalid = Object.entries(pins).find(([, value]) => !/^\d{4}$/.test(value));
  if (invalid) {
    window.alert("Chaque code doit contenir exactement 4 chiffres.");
    return null;
  }
  return pins;
}

async function saveRoleCodesFromModal(enableLock) {
  if (!roleCodesModal) return;
  const pins = readRolePinsFromModal();
  if (!pins) return;
  const nextData = normalizeData({
    ...data,
    notes: {
      ...(data.notes || {}),
      rolePins: pins,
      pinLockEnabled: enableLock,
      pinLockUpdatedAt: new Date().toISOString()
    },
    sourceVersion: `lock-${Date.now()}`
  });
  data = nextData;
  if (enableLock) {
    unlockedRoles = ["computer"];
  } else {
    unlockedRoles = [];
  }
  saveUnlockedRoles();
  saveData();
  closeRoleCodesModal();
  render();
  try {
    await publishLiveDataToFirestore(nextData, enableLock ? "Codes activés" : "Codes désactivés");
  } catch {
    window.alert("Les codes ont été modifiés sur cet appareil, mais Firebase n'a pas accepté la mise à jour.");
    return;
  }
  window.alert(enableLock ? "Codes enregistrés et actifs." : "Codes désactivés.");
}

async function togglePublicResultsOnline() {
  const online = data.notes?.publicResultsOnline === false;
  const nextData = normalizeData({
    ...data,
    notes: {
      ...(data.notes || {}),
      publicResultsOnline: online,
      publicResultsOnlineUpdatedAt: new Date().toISOString()
    },
    sourceVersion: `public-online-${Date.now()}`
  });
  data = nextData;
  saveData();
  render();
  try {
    await publishLiveDataToFirestore(nextData, online ? "Page résultats publics en ligne" : "Page résultats publics hors ligne");
    await publishPublicResultsIndex({ silent: true });
  } catch {
    renderDataStatus("Le statut de la page publique a été modifié sur cet appareil, mais Firebase n'a pas accepté la mise à jour.");
  }
}

async function toggleRoleLock() {
  renderRoleCodesAdminModal();
}

function toggleCompetitionMode() {
  const enabled = !competitionModeEnabled();
  lastConsoleActivityAt = Date.now();
  data = normalizeData({
    ...data,
    notes: {
      ...(data.notes || {}),
      competitionMode: enabled,
      competitionModeUpdatedAt: new Date().toISOString()
    },
    sourceVersion: `competition-mode-${Date.now()}`
  });
  saveData();
  render();
  updateLiveNotes(enabled ? "Actualisation directe activée" : "Actualisation manuelle activée", {
    competitionMode: enabled,
    competitionModeUpdatedAt: data.notes.competitionModeUpdatedAt
  }).then(() => {
    initFirebaseSync();
    render();
  });
}

async function endCompetitionSession() {
  if (!competitionModeEnabled()) return;
  await updateLiveNotes("Actualisation manuelle activée", {
    competitionMode: false,
    competitionModeUpdatedAt: new Date().toISOString(),
    competitionModeEndedAt: new Date().toISOString()
  });
  initFirebaseSync();
  render();
}

function markConsoleActivity() {
  lastConsoleActivityAt = Date.now();
  saveLastActivityTimestamp(lastConsoleActivityAt);
}

async function returnHomeAfterLocalInactivity() {
  if (!shouldReturnHomeForInactivity() || profileHomeActive) return;
  saveCurrentRoleState();
  profileHomeActive = true;
  unlockedRoles = [];
  saveUnlockedRoles();
  await releaseRoleLock();
  await releaseConsolePresence();
  render();
  refreshPresenceCounts();
}

async function disableCompetitionModeAfterInactivity() {
  if (competitionAutoDisableRunning || !competitionModeEnabled()) return;
  if (state.role !== "computer" || profileHomeActive || document.visibilityState !== "visible") return;
  if (Date.now() - lastConsoleActivityAt < COMPETITION_INACTIVITY_MS) return;
  competitionAutoDisableRunning = true;
  try {
    await updateLiveNotes("Actualisation manuelle activée automatiquement après 1h d'inactivité", {
      competitionMode: false,
      competitionModeUpdatedAt: new Date().toISOString(),
      competitionModeAutoDisabledAt: new Date().toISOString()
    });
    initFirebaseSync();
    render();
  } finally {
    competitionAutoDisableRunning = false;
  }
}

function stopFirebaseRealtimeSync() {
  firestoreUnsubscribe?.();
  liveDataUnsubscribe?.();
  resultsUnsubscribe?.();
  firestoreUnsubscribe = null;
  liveDataUnsubscribe = null;
  resultsUnsubscribe = null;
}

function applyResultsSnapshot(snapshot) {
  const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  raceResults = rows.map(resultWithoutPdf);
  resultsSnapshotReady = true;
  cleanupOrphanFinalResultAlerts();
  cleanupResolvedSpeakerResultAlerts();
  ensurePendingFinalistsSpeakerAlerts();
  ensurePendingReplacementSpeakerAlerts();
  migrateResultPdfsOutOfResults(rows).catch((error) => {
    console.warn("Migration des PDF résultats impossible", error);
  });
}

function startCompetitionSync() {
  stopFirebaseRealtimeSync();
  if (!realtimeSyncEnabled()) {
    firebaseStatus = "manual";
    refreshFirebaseOnce(false);
    renderDataStatus();
    return;
  }
  firestoreUnsubscribe = alertsCollection()
    .orderBy("createdAt", "desc")
    .onSnapshot((snapshot) => {
      firestoreReady = true;
      firebaseStatus = "connected";
      alerts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      saveAlerts();
      cleanupOrphanFinalResultAlerts();
      render();
    }, (error) => {
      console.warn("Lecture Firebase impossible", error);
      firebaseStatus = "error";
      renderDataStatus("Firebase n'est pas joignable. Les alertes restent locales sur cet appareil.");
    });
  liveDataUnsubscribe = liveDataDocument().onSnapshot((snapshot) => {
    if (!snapshot.exists) return;
    const remote = snapshot.data()?.data;
    firebaseStatus = "connected";
    if (!remote?.sourceVersion || remote.sourceVersion === data.sourceVersion) return;
    applyRemoteLiveData(remote);
    if (state.role === "computer") publishPublicResultsIndex({ silent: true });
  }, (error) => {
    console.warn("Lecture des données live Firebase impossible", error);
    firebaseStatus = "error";
    renderDataStatus();
  });
  resultsUnsubscribe = resultsCollection()
    .orderBy("updatedAt", "desc")
    .onSnapshot((snapshot) => {
      applyResultsSnapshot(snapshot);
      renderResultsAdminPanel();
    }, (error) => {
      console.warn("Lecture des résultats Firebase impossible", error);
    });
}

async function refreshFirebaseOnce(showMessage = true) {
  if (!firestoreDb) {
    firebaseStatus = "local";
    renderDataStatus("Firebase n'est pas chargé. Les données restent locales sur cet appareil.");
    return;
  }
  try {
    const [alertSnapshot, liveSnapshot, resultSnapshot] = await Promise.all([
      alertsCollection().orderBy("createdAt", "desc").get({ source: "server" }),
      liveDataDocument().get({ source: "server" }),
      resultsCollection().orderBy("updatedAt", "desc").get({ source: "server" })
    ]);
    firestoreReady = true;
    alerts = alertSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    saveAlerts();
    if (liveSnapshot.exists) {
      const remote = liveSnapshot.data()?.data;
      if (remote?.sourceVersion && remote.sourceVersion !== data.sourceVersion) {
        applyRemoteLiveData(remote);
      }
    }
    applyResultsSnapshot(resultSnapshot);
    firebaseStatus = "manual";
    render();
    if (showMessage && state.role === "computer") {
      renderDataStatus("Données Firebase actualisées. L'actualisation directe reste coupée tant que l'interrupteur est en manuel.");
    }
  } catch (error) {
    console.warn("Actualisation Firebase impossible", error);
    firebaseStatus = window.navigator.onLine ? "error" : "offline";
    renderDataStatus("Actualisation impossible. Vérifie la connexion ou les règles Firebase.");
  }
}

function initFirebaseSync() {
  if (!window.firebase?.initializeApp || !window.firebase?.firestore) {
    firebaseStatus = "local";
    renderDataStatus("Firebase n'est pas chargé. Les alertes restent locales sur cet appareil.");
    return;
  }
  try {
    if (!window.firebase.apps.length) {
      window.firebase.initializeApp(FIREBASE_CONFIG);
    }
    firestoreDb = window.firebase.firestore();
    startCompetitionSync();
  } catch (error) {
    console.warn("Initialisation Firebase impossible", error);
    firebaseStatus = "error";
    renderDataStatus("Firebase n'est pas configuré correctement. Les alertes restent locales sur cet appareil.");
  }
}

async function checkFirebaseConnection() {
  if (firebaseConnectionCheckRunning) return;
  if (!window.navigator.onLine) {
    firebaseStatus = "offline";
    renderDataStatus();
    return;
  }
  if (!realtimeSyncEnabled()) {
    firebaseStatus = firestoreDb ? "manual" : "local";
    renderDataStatus();
    return;
  }
  const doc = liveDataDocument();
  if (!doc) {
    firebaseStatus = "local";
    renderDataStatus();
    return;
  }
  firebaseConnectionCheckRunning = true;
  try {
    await doc.get({ source: "server" });
    firebaseStatus = "connected";
  } catch (error) {
    firebaseStatus = window.navigator.onLine ? "error" : "offline";
  } finally {
    firebaseConnectionCheckRunning = false;
    renderDataStatus();
  }
}

function loadLiveDismissedAlerts() {
  const saved = localStorage.getItem(LIVE_DISMISSED_ALERTS_KEY);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLiveDismissedAlerts() {
  localStorage.setItem(LIVE_DISMISSED_ALERTS_KEY, JSON.stringify(liveDismissedAlertIds));
}

async function archiveCurrentHistory() {
  const rows = dsqReportRows();
  if (!rows.length) return null;
  const collection = historyArchivesCollection();
  if (!collection) throw new Error("Firebase n'est pas disponible pour archiver l'historique.");
  const now = new Date();
  const archive = {
    id: `${now.getTime()}-${Math.random().toString(16).slice(2)}`,
    createdAt: now.toISOString(),
    createdLabel: now.toLocaleString("fr-FR"),
    meet: data.meet || {},
    count: rows.length,
    alerts: rows.map(sanitizeAlertForFirestore)
  };
  await collection.doc(archive.id).set(sanitizeAlertForFirestore(archive));
  return archive;
}

async function archiveCurrentResults(reason = "Archivage des résultats publics", sourceResults = raceResults) {
  const rows = Array.isArray(sourceResults) ? sourceResults.map(resultWithoutPdf) : [];
  if (!rows.length) return null;
  const collection = resultArchivesCollection();
  if (!collection || !firestoreDb) throw new Error("Firebase n'est pas disponible pour archiver les résultats.");
  const now = new Date();
  const archive = {
    id: `${now.getTime()}-${Math.random().toString(16).slice(2)}`,
    createdAt: now.toISOString(),
    createdLabel: now.toLocaleString("fr-FR"),
    reason,
    meet: data.meet || {},
    count: rows.length,
    publicIndex: sanitizeAlertForFirestore(buildPublicResultsIndex())
  };
  const archiveRef = collection.doc(archive.id);
  const batch = firestoreDb.batch();
  batch.set(archiveRef, sanitizeAlertForFirestore(archive));
  rows.forEach((result) => {
    const itemId = result.id || `${result.raceKey || "result"}-${Math.random().toString(16).slice(2)}`;
    batch.set(archiveRef.collection("items").doc(itemId), sanitizeAlertForFirestore({ ...result, id: itemId }));
  });
  await batch.commit();
  return archive;
}

async function resetHistory() {
  const ok = window.confirm("Archiver puis effacer l'historique actif DSQ, forfaits, abandons et requalifications ?");
  if (!ok) return;
  renderResetHistoryModal();
}

async function performResetHistoryWithArchive() {
  let archive = null;
  try {
    archive = await archiveCurrentHistory();
  } catch (error) {
    console.warn("Archivage impossible", error);
    window.alert(`RAZ annulée : impossible d'archiver l'historique. ${error?.message || ""}`);
    return;
  }
  const confirmation = window.confirm(archive
    ? `Historique archivé (${archive.count} lignes). Confirmer la remise à zéro ?`
    : "Aucun historique à archiver. Confirmer la remise à zéro ?");
  if (!confirmation) {
    window.alert("RAZ annulée.");
    return;
  }
  alerts = [];
  liveDismissedAlertIds = [];
  saveAlerts();
  saveLiveDismissedAlerts();
  try {
    await clearFirestoreAlerts();
  } catch {
    window.alert("L'historique local est remis à zéro, mais Firebase n'a pas pu être vidé. Vérifie ta connexion.");
  }
  render();
  window.alert(archive ? "Historique archivé puis remis à zéro." : "Historique remis à zéro.");
}

async function clearHistoryAndAlertsForFullImport() {
  const archive = await archiveCurrentHistory();
  const clearedAlerts = alerts.length;
  await clearFirestoreAlerts();
  alerts = [];
  liveDismissedAlertIds = [];
  saveAlerts();
  saveLiveDismissedAlerts();
  return {
    archivedCount: archive?.count || 0,
    clearedAlerts
  };
}

function dismissLiveAlert(alertId) {
  if (!liveDismissedAlertIds.includes(alertId)) {
    liveDismissedAlertIds.push(alertId);
    saveLiveDismissedAlerts();
  }
  renderOfficialAlerts();
}

function normalizeData(nextData) {
  return {
    meet: nextData.meet || sampleData.meet,
    events: Array.isArray(nextData.events) ? nextData.events : [],
    entrants: Array.isArray(nextData.entrants) ? nextData.entrants : [],
    series: Array.isArray(nextData.series) ? nextData.series : [],
    program: Array.isArray(nextData.program) ? nextData.program : [],
    qualifications: Array.isArray(nextData.qualifications) ? nextData.qualifications : [],
    top2025: Array.isArray(nextData.top2025) ? nextData.top2025 : [],
    records: Array.isArray(nextData.records) ? nextData.records.filter(shouldKeepRecord) : [],
    edfMembers: Array.isArray(nextData.edfMembers) ? nextData.edfMembers : (sampleData.edfMembers || []),
    internationalMedals: Array.isArray(nextData.internationalMedals) ? nextData.internationalMedals : (sampleData.internationalMedals || []),
    competitionStats: Array.isArray(nextData.competitionStats) ? nextData.competitionStats : [],
    swimmerInfos: Array.isArray(nextData.swimmerInfos) ? nextData.swimmerInfos : [],
    sourceVersion: nextData.sourceVersion || sampleData.sourceVersion || "",
    notes: nextData.notes || {}
  };
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data, null, 2));
}

const livePalmesTime = window.LivePalmesTime || {
  timeToMs(value) {
    if (!value) return Number.POSITIVE_INFINITY;
    const clean = String(value).trim().replace(",", ".");
    const parts = clean.split(":");
    let minutes = 0;
    let seconds = 0;
    if (parts.length === 3) {
      minutes = Number(parts[0]) * 60 + Number(parts[1]);
      seconds = Number(parts[2]);
    } else if (parts.length === 2) {
      minutes = Number(parts[0]);
      seconds = Number(parts[1]);
    } else {
      seconds = Number(parts[0]);
    }
    return Math.round((minutes * 60 + seconds) * 1000);
  },
  formatGap(ms) {
    const total = Math.abs(ms) / 1000;
    if (total >= 60) {
      const minutes = Math.floor(total / 60);
      const seconds = (total % 60).toFixed(2).padStart(5, "0");
      return `${minutes}:${seconds}`;
    }
    return total.toFixed(2);
  },
  importedSeriesTime(value) {
    const clean = String(value || "").trim().replace(",", ".");
    if (!clean) return "";
    const parts = clean.split(":");
    if (parts.length === 3) return `${parts[0]}:${parts[1].padStart(2, "0")}.${parts[2].padStart(2, "0")}`;
    if (parts.length === 2) return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
    return clean;
  }
};
const timeToMs = livePalmesTime.timeToMs.bind(livePalmesTime);
const formatGap = livePalmesTime.formatGap.bind(livePalmesTime);
const importedSeriesTime = livePalmesTime.importedSeriesTime.bind(livePalmesTime);

const livePalmesPeople = window.LivePalmesPeople || {
  formatPersonNameParts(firstName, lastName, fallback = "") {
    const last = String(lastName || "").trim().toLocaleUpperCase("fr-FR");
    const first = String(firstName || "").trim();
    return [last, first].filter(Boolean).join(" ").trim() || fallback;
  },
  getBirthYear(birthDate) {
    const match = String(birthDate || "").match(/(\d{4})$/);
    return match ? Number(match[1]) : Number.NaN;
  },
  getBirthYearLabel(birthDate) {
    const year = this.getBirthYear(birthDate);
    return Number.isFinite(year) ? String(year) : "----";
  },
  normalizePersonName(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z ]/g, " ")
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .sort()
      .join(" ");
  },
  formatRank(rank) {
    const value = Number(rank);
    if (!Number.isFinite(value)) return "-";
    return value === 1 ? "1er" : `${value}e`;
  },
  entrantKey(entrant) {
    return [entrant.lastName, entrant.firstName, entrant.birthDate, entrant.sex].join("|").toLowerCase();
  },
  sameCategory(a, b) {
    return String(a || "").toLowerCase() === String(b || "").toLowerCase();
  },
  categoryClass(category) {
    if (this.sameCategory(category, "Cadet")) return "cat-cadet";
    if (this.sameCategory(category, "Junior")) return "cat-junior";
    if (this.sameCategory(category, "Senior")) return "cat-senior";
    return "cat-other";
  }
};
const formatPersonNameParts = livePalmesPeople.formatPersonNameParts.bind(livePalmesPeople);
const getBirthYear = livePalmesPeople.getBirthYear.bind(livePalmesPeople);
const getBirthYearLabel = livePalmesPeople.getBirthYearLabel.bind(livePalmesPeople);
const normalizePersonName = livePalmesPeople.normalizePersonName.bind(livePalmesPeople);
const formatRank = livePalmesPeople.formatRank.bind(livePalmesPeople);
const entrantKey = livePalmesPeople.entrantKey.bind(livePalmesPeople);
const sameCategory = livePalmesPeople.sameCategory.bind(livePalmesPeople);
const categoryClass = livePalmesPeople.categoryClass.bind(livePalmesPeople);

function formatName(swimmer) {
  return formatPersonNameParts(swimmer.firstName, swimmer.lastName, swimmer.name)
    || (isFemaleContext(swimmer.sex) ? "Nageuse à renseigner" : "Nageur à renseigner");
}

function formatDisplayName(entrant) {
  return isRelayEntrant(entrant) ? (entrant.club || entrant.lastName || "Relais") : formatName(entrant);
}

function formatSeriesDisplayName(entrant) {
  if (isRelayEntrant(entrant)) return formatDisplayName(entrant);
  return formatName(entrant);
}

function clearSearch() {
  state.search = "";
  if (searchInput) searchInput.value = "";
}

const ROLE_LABELS = {
  speaker: "Speaker",
  live: "Live",
  referee: "Juge arbitre",
  video: "Juge vidéo",
  computer: "Bureau des performances",
  secretary: "Secrétariat"
};

function isSpeakerView() {
  return state.role === "speaker" || state.role === "live";
}

const DECISION_LABELS = {
  forfait: "Forfait",
  abandon: "Abandon",
  false_start: "DSQ - faux départ",
  relay_early_start: "DSQ - départ anticipé",
  underwater_15m: "DSQ - coulée supérieure à 15 m",
  immersion: "DSQ - passage en immersion",
  bottle_fault: "DSQ - faute de bouteille",
  interference: "DSQ - gêne d'un concurrent",
  other_dsq: "DSQ - autre motif"
};

const SPEAKER_DECISION_REASONS = {
  false_start: "faux départ",
  relay_early_start: "départ anticipé",
  underwater_15m: "coulée supérieure à 15 m",
  immersion: "passage en immersion",
  bottle_fault: "faute de bouteille",
  interference: "gêne d'un concurrent",
  other_dsq: "autre motif"
};

function shortClubName(entrant) {
  if (entrant.clubCode) return String(entrant.clubCode).toUpperCase();
  const club = String(entrant.club || "").trim();
  if (!club) return "";
  const words = club
    .replace(/['’]/g, " ")
    .split(/\s+/)
    .filter((word) => word && !["DE", "DU", "DES", "D", "LA", "LE", "LES", "L", "ET", "A", "AU", "AUX"].includes(word.toUpperCase()));
  const initials = words.map((word) => word[0]).join("").toUpperCase();
  return initials || club;
}

function entrantPersonKey(entrant) {
  return `${entrant.sex || ""}|${normalizePersonName(formatName(entrant))}`;
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

function render() {
  updateStickyAlertOffset();
  document.body.classList.add("live-mode");
  document.body.classList.toggle("profile-home-active", profileHomeActive);
  document.body.classList.toggle("fullscreen-mode", isFullscreenMode);
  document.body.classList.toggle("role-speaker", state.role === "speaker");
  document.body.classList.toggle("role-live", state.role === "live");
  document.body.classList.toggle("role-referee", state.role === "referee");
  document.body.classList.toggle("role-video", state.role === "video");
  document.body.classList.toggle("role-computer", state.role === "computer");
  document.body.classList.toggle("role-secretary", state.role === "secretary");
  if (profileHome) profileHome.hidden = !profileHomeActive;
  if (appShell) appShell.hidden = profileHomeActive;
  if (profileModeStatus) {
    profileModeStatus.textContent = competitionModeEnabled()
      ? "Direct actif"
      : "Actualisation manuelle";
    profileModeStatus.classList.toggle("active", realtimeSyncEnabled());
  }
  renderPresenceCounts();
  renderHomeActionCounts();
  if (profileHomeBtn) {
    profileHomeBtn.hidden = profileHomeActive;
    profileHomeBtn.textContent = "Accueil";
  }
  if (manualRefreshBtn) {
    const manualMode = !realtimeSyncEnabled();
    manualRefreshBtn.hidden = profileHomeActive || !manualMode;
    manualRefreshBtn.title = "Actualiser les données des consoles";
  }
  if (competitionModeTopBtn) {
    const competitionMode = realtimeSyncEnabled();
    competitionModeTopBtn.hidden = profileHomeActive || state.role !== "computer";
    competitionModeTopBtn.innerHTML = `<span aria-hidden="true"></span>${competitionMode ? "Direct" : "Manuel"}`;
    competitionModeTopBtn.setAttribute("aria-pressed", competitionMode ? "true" : "false");
    competitionModeTopBtn.title = competitionMode
      ? "Passer les consoles en actualisation manuelle"
      : "Activer l'actualisation directe des consoles";
    competitionModeTopBtn.classList.toggle("active", competitionMode);
  }
  if (appConsoleTitle) {
    appConsoleTitle.textContent = profileHomeActive
      ? "LivePalmes"
      : `LivePalmes - ${ROLE_LABELS[state.role] || "Console"}`;
  }
  syncProgramButtonPlacement();
  document.querySelectorAll(".role-chip").forEach((button) => {
    button.classList.toggle("active", button.dataset.role === state.role);
  });
  if (roleBadge) roleBadge.textContent = ROLE_LABELS[state.role] || "Console";
  if (fullscreenBtn) {
    fullscreenBtn.hidden = profileHomeActive;
    fullscreenBtn.textContent = isFullscreenMode ? "Quitter plein écran" : "Plein écran";
  }
  if (viewModeBtn) viewModeBtn.hidden = true;
  if (roleLockBtn) {
    roleLockBtn.textContent = pinLockEnabled() ? "🔒" : "🔓";
    roleLockBtn.title = pinLockEnabled() ? "Codes actifs" : "Codes inactifs";
    roleLockBtn.setAttribute("aria-label", pinLockEnabled() ? "Codes actifs" : "Codes inactifs");
    roleLockBtn.classList.toggle("confirm-button", pinLockEnabled());
  }
  if (publicPositionToggle) {
    publicPositionToggle.checked = publicPositionEnabled();
    publicPositionToggle.disabled = state.role !== "speaker" || !firestoreDb;
  }
  if (adminSeriesBtn) adminSeriesBtn.hidden = state.role !== "computer";
  if (archivesBtn) archivesBtn.hidden = profileHomeActive || state.role !== "computer";
  if (!data.events.some((event) => event.id === state.eventId)) {
    state.eventId = data.events[0]?.id || "";
  }
  normalizeLivePosition();
  const availableSexes = availableSexesForEvent();
  if (availableSexes.length && !availableSexes.includes(state.sex)) {
    state.sex = availableSexes[0];
  }

  if (meetTitle) {
    meetTitle.textContent = [data.meet?.name, data.meet?.city].filter(Boolean).join(" - ") || "Compétition à charger";
  }
  updateEventSelect();
  renderSessionControls();
  syncLineOrderButtonPlacement();
  renderSeriesControls();
  syncProgramButtonPlacement();
  renderProgramButtons();
  renderCategorySelect();
  renderHeader();
  renderHeaderReferences();
  renderEntrants();
  renderTop2025();
  renderRolePanels();
  renderDataStatus();
  saveCurrentRoleState();
  saveActiveView();
  publishPublicProgressIfNeeded();
}

function syncProgramButtonPlacement() {
  if (!programBtn || !sidebar) return;
  const seriesNav = document.querySelector(".series-field .series-nav");
  if (["speaker", "referee", "live"].includes(state.role) && seriesNav) {
    if (programBtn.parentElement !== seriesNav) {
      seriesNav.appendChild(programBtn);
    }
    return;
  }
  if (programBtn.parentElement !== sidebar) {
    sidebar.insertBefore(programBtn, categoryField || null);
  }
}

function syncLineOrderButtonPlacement() {
  if (!lineOrderBtn) return;
  const panelActions = document.querySelector(".entrants-panel .panel-actions");
  if (panelActions && lineOrderBtn.parentElement !== panelActions) {
    const previousReference = previousSeriesInlineBtn?.parentElement === panelActions ? previousSeriesInlineBtn : null;
    const filteredReference = filteredCount?.parentElement === panelActions ? filteredCount : null;
    panelActions.insertBefore(lineOrderBtn, previousReference || filteredReference);
    return;
  }
  if (panelActions && lineOrderBtn.parentElement === panelActions) {
    const previousReference = previousSeriesInlineBtn?.parentElement === panelActions ? previousSeriesInlineBtn : null;
    if (previousReference && lineOrderBtn.nextElementSibling !== previousReference) {
      panelActions.insertBefore(lineOrderBtn, previousReference);
    }
  }
}

function renderSessionControls() {
  if (!sessionControls) return;
  const sessions = sessionRows();
  if (!sessions.length) {
    sessionControls.innerHTML = "";
    sessionControls.closest(".top-session-field")?.setAttribute("hidden", "");
    state.session = "all";
    return;
  }
  sessionControls.closest(".top-session-field")?.removeAttribute("hidden");
  if (state.session === "all" || !sessions.some((session) => session.number === state.session)) {
    state.session = preferredInitialSession();
  }
  sessionControls.innerHTML = `
    <select id="sessionSelect" class="session-select" aria-label="Choisir la session">
      ${sessions.map((session) => `
        <option value="${escapeHtml(session.number)}" ${state.session === session.number ? "selected" : ""}>
          S${escapeHtml(session.number)}
        </option>
      `).join("")}
    </select>
  `;
}

function currentRoleAlertFilter(alert) {
  return livePalmesAlerts.currentRoleAlertFilter(alert, {
    role: state.role,
    liveDismissedAlertIds,
    resolvedByResult: speakerAlertAlreadyResolvedByResult(alert)
  });
}

function speakerAlertAlreadyResolvedByResult(alert) {
  return livePalmesAlerts.speakerAlertAlreadyResolvedByResult(alert, raceResults, finalistRowName);
}

function isRequalificationAlert(alert) {
  return livePalmesAlerts.isRequalificationAlert(alert);
}

function alertRaceLabel(alert) {
  if (alert.type === "final_composition_ready") {
    return `${alert.eventLabel || alert.eventId} - ${alert.sexLabel || sexDisplayLabel(alert.sex)}`;
  }
  const event = data.events.find((item) => item.id === alert.eventId);
  const sex = alert.sex === "F" ? "Femmes" : (alert.sex === "M" ? "Hommes" : "Mixte");
  const series = alert.stage && isFinalStage(alert.stage)
    ? finalStageLabel(alert.stage)
    : `Série ${alert.series || "-"}`;
  return `${event?.label || alert.eventId} - ${sex} - ${series} - ligne ${alert.line || "-"}`;
}

function alertSwimmerLabel(alert) {
  return `${alert.displayName || "Concurrent"}${alert.club ? ` - ${alert.club}` : ""}`;
}

function alertIdentityLabel(alert) {
  if (state.role === "video") return "Concurrent non affiché";
  return `${alert.displayName || "Concurrent"}${alertClubShortLabel(alert) ? ` - ${alertClubShortLabel(alert)}` : ""}`;
}

function fullAlertIdentityLabel(alert) {
  return `${alert.displayName || "Concurrent"}${alertClubShortLabel(alert) ? ` - ${alertClubShortLabel(alert)}` : ""}`;
}

function alertClubShortLabel(alert) {
  return String(alert.clubCode || alert.club || "").toUpperCase();
}

function alertDetailLabel(alert) {
  const parts = [];
  if (alert.relayLeg) parts.push(`relayeur ${alert.relayLeg}`);
  if (alert.lengthType === "start") parts.push("au départ");
  if (alert.lengthType === "length" && alert.lengthNumber) parts.push(`longueur n° ${alert.lengthNumber}`);
  return parts.join(" - ");
}

function alertCommentLabel(alert) {
  return alert.comment || "";
}

function decisionMotifLabel(alert) {
  if (alert.type === "finalists_announcement") return "Finalistes à annoncer";
  if (alert.type === "finalist_replacement_announcement") return "Repêchage finale à annoncer";
  if (alert.type === "final_composition_ready") return "Composition finale définitive";
  if (alert.type === "requalification") return "Requalification - décision du délégué";
  if (alert.type === "ja_cancellation") return "Requalification - annulation par le JA";
  if (alert.type === "forfait") return "Forfait non déclaré";
  const motif = DECISION_LABELS[alert.type] || alert.type;
  const detail = alertDetailLabel(alert);
  return detail ? `${motif} - ${detail}` : motif;
}

function speakerAlertSentence(alert) {
  if (alert.type === "finalists_announcement") {
    return {
      text: `Finalistes à annoncer pour ${alert.eventLabel || alert.eventId} ${alert.sexLabel || sexDisplayLabel(alert.sex)}.`,
      identity: `${alert.finalistCount || 0} finaliste${Number(alert.finalistCount || 0) > 1 ? "s" : ""}`
    };
  }
  if (alert.type === "finalist_replacement_announcement") {
    return {
      text: `Suite à un forfait en finale, ${alert.replacementName || "un nageur"} est qualifié${alert.sex === "F" ? "e" : ""} en finale du ${alert.eventLabel || alert.eventId} ${alert.sexLabel || sexDisplayLabel(alert.sex)}.`,
      identity: alert.replacementClub ? `${alert.replacementName || "Concurrent"} - ${alert.replacementClub}` : (alert.replacementName || "Concurrent")
    };
  }
  const event = data.events.find((item) => item.id === alert.eventId);
  const sexLabel = alert.sex === "F" ? "Femmes" : (alert.sex === "M" ? "Hommes" : "Mixte");
  const personLabel = alert.sex === "F" ? "la nageuse" : "le nageur";
  const agreement = alert.sex === "F" ? "e" : "";
  const seriesLabel = alert.stage && isFinalStage(alert.stage)
    ? finalStageLabel(alert.stage)
    : `série ${alert.series || "-"}`;
  const reason = SPEAKER_DECISION_REASONS[alert.type] || (DECISION_LABELS[alert.type] || alert.type).replace(/^DSQ -\s*/i, "");
  const detail = alertDetailLabel(alert);
  const comment = alertCommentLabel(alert);
  const club = alertClubShortLabel(alert);
  if (isRequalificationAlert(alert)) {
    const source = alert.type === "requalification" ? "suite à la décision du délégué de la compétition" : "suite à l'annulation de la décision par le délégué";
    return {
      text: `${source}, ${personLabel} de la ligne ${alert.line || "-"} sur ${event?.label || alert.eventId} ${sexLabel} a été requalifié${agreement}.`,
      identity: `${alert.displayName || "Concurrent"}${club ? ` - ${club}` : ""}`
    };
  }
  return {
    text: `Lors de la ${seriesLabel} du ${event?.label || alert.eventId} ${sexLabel}, ${personLabel} de la ligne ${alert.line || "-"} a été disqualifié${agreement} pour ${reason}${detail ? ` - ${detail}` : ""}${comment ? ` (${comment})` : ""}.`,
    identity: `${alert.displayName || "Concurrent"}${club ? ` - ${club}` : ""}`
  };
}

function isDsqAlert(alert) {
  return livePalmesAlerts.isDsqAlert(alert);
}

function activeDsqAlertsForEntrant(entrant) {
  const swimmerId = entrant.swimmerId || entrantKey(entrant);
  return alerts.filter((alert) => (
    isDsqAlert(alert) &&
    !alert.cancelledAt &&
    alert.videoStatus !== "rejected" &&
    alert.eventId === entrant.eventId &&
    alert.sex === entrant.sex &&
    alert.swimmerId === swimmerId
  ));
}

function activeLineAlertsForEntrant(entrant) {
  const swimmerId = entrant.swimmerId || entrantKey(entrant);
  return alerts.filter((alert) => (
    !isRequalificationAlert(alert) &&
    !alert.cancelledAt &&
    alert.videoStatus !== "rejected" &&
    alert.eventId === entrant.eventId &&
    alert.sex === entrant.sex &&
    alert.swimmerId === swimmerId
  ));
}

function alertLineCode(alert) {
  return livePalmesAlerts.alertLineCode(alert);
}

function renderLineAlertBadges(lineAlerts) {
  if (!lineAlerts.length) return "";
  const terminalStatus = terminalLineStatus(lineAlerts);
  const dsqAlerts = lineAlerts.filter(isDsqAlert);
  const title = lineAlerts.map(decisionMotifLabel).join(" / ");
  const codes = [...new Set(dsqAlerts.map(alertLineCode).filter(Boolean))];
  return livePalmesLineStatusView.renderLineAlertBadgesHtml({ codes, terminalStatus, title });
}

function terminalLineStatus(lineAlerts) {
  return lineAlerts
    .filter((alert) => alert.type === "forfait" || alert.type === "abandon")
    .sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)))[0] || null;
}

function importedLineStatusLabel(entrant) {
  if (entrant.importedStatus === "forfait") return "Forfait déclaré";
  return "";
}

function renderImportedLineStatusBadge(entrant) {
  const label = importedLineStatusLabel(entrant);
  return livePalmesLineStatusView.renderImportedLineStatusBadgeHtml(label);
}

function renderLineTimeStatus(entrant, lineAlerts) {
  const terminalStatus = terminalLineStatus(lineAlerts);
  const importedLabel = importedLineStatusLabel(entrant);
  return livePalmesLineStatusView.renderLineTimeStatusHtml({ importedLabel, terminalStatus });
}

function finalistRowName(row) {
  return formatPersonNameParts(row?.firstName, row?.lastName, row?.name) || "Concurrent";
}

function finalRowsForAnnouncementAlert(alert) {
  const result = alert?.resultId ? raceResults.find((item) => item.id === alert.resultId) : null;
  return normalizeFinalistsOrder(result?.finalists || alert?.finalists || {});
}

function renderFinalistsAlertList(alert) {
  return livePalmesAlertCardView.renderFinalistsAlertListHtml({
    finalistRowName,
    finals: finalRowsForAnnouncementAlert(alert),
    sex: alert.sex
  });
}

function alertPriority(alert) {
  if (isDsqAlert(alert)) return 1;
  if (alert.type === "finalists_announcement" || alert.type === "finalist_replacement_announcement" || isRequalificationAlert(alert)) return 2;
  return 3;
}

function alertPriorityMeta(alert) {
  const time = formatAlertTime(alert.createdAt);
  const priority = alertPriority(alert);
  const label = priority <= 2 ? `Priorité ${priority}` : "Action";
  return [label, time].filter(Boolean).join(" - ");
}

function compareAlertsForAction(a, b) {
  return alertPriority(a) - alertPriority(b) || String(a.createdAt).localeCompare(String(b.createdAt));
}

function historySentence(alert) {
  if (isDsqAlert(alert)) return speakerAlertSentence(alert);
  const event = data.events.find((item) => item.id === alert.eventId);
  const sexLabel = alert.sex === "F" ? "Femmes" : (alert.sex === "M" ? "Hommes" : "Mixte");
  const seriesLabel = alert.stage && isFinalStage(alert.stage)
    ? finalStageLabel(alert.stage)
    : `série ${alert.series || "-"}`;
  const reason = DECISION_LABELS[alert.type] || alert.type;
  const club = alertClubShortLabel(alert);
  return {
    text: `Lors de la ${seriesLabel} du ${event?.label || alert.eventId} ${sexLabel}, ligne ${alert.line || "-"} : ${reason}.`,
    identity: `${alert.displayName || "Concurrent"}${club ? ` - ${club}` : ""}`
  };
}

function renderAlertCard(alert, actionLabel = "") {
  const detail = alertDetailLabel(alert);
  return livePalmesAlertCardView.renderAlertCardHtml(alert, {
    actionLabel,
    alertPriorityMeta,
    alertRaceLabel,
    alertSwimmerLabel,
    decisionLabels: DECISION_LABELS,
    detail,
    isRequalificationAlert,
    isSpeakerView: isSpeakerView(),
    role: state.role,
    sexDisplayLabel,
    speakerAlertSentence
  });
}

function renderVideoInfoCard(alert) {
  const event = data.events.find((item) => item.id === alert.eventId);
  const seriesLabel = alert.stage && isFinalStage(alert.stage)
    ? finalStageLabel(alert.stage)
    : `série ${alert.series || "-"}`;
  return livePalmesAlertCardView.renderVideoInfoCardHtml({
    eventLabel: event?.label || alert.eventId,
    seriesLabel,
    sexLabel: sexDisplayLabel(alert.sex),
    timeLabel: formatAlertTime(alert.createdAt)
  });
}

function renderRolePanels() {
  renderOfficialAlerts();
  renderDecisionPanel();
  renderRoleQueue();
  renderResultsAdminPanel();
  renderSecretaryFinalsPanel();
  renderRoleHistory();
  renderComputerFooterPanel();
  renderSpeakerHistory();
}

function resultsAdminWorkflowOptions() {
  const options = {
    activeCompetitionId,
    alertPendingBreakdown,
    alerts,
    appendImportHistory,
    buildFinalistsFromResult,
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
    resultSessionPdfs,
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

function renderOfficialAlerts() {
  if (!officialAlerts) return;
  const showVideoInfo = ["live", "speaker", "computer"].includes(state.role);
  if (!isSpeakerView() && !showVideoInfo) {
    officialAlerts.hidden = true;
    officialAlerts.innerHTML = "";
    return;
  }
  const videoInfos = showVideoInfo
    ? alerts
      .filter((alert) => !alert.cancelledAt && alert.requiresVideo && alert.videoStatus === "pending")
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
    : [];
  const official = isSpeakerView()
    ? alerts
      .filter(currentRoleAlertFilter)
      .sort(compareAlertsForAction)
    : [];
  if (!official.length && !videoInfos.length) {
    officialAlerts.hidden = true;
    officialAlerts.innerHTML = "";
    return;
  }
  const action = state.role === "speaker" ? "Annoncé" : (state.role === "live" ? "Masquer" : "");
  officialAlerts.hidden = false;
  officialAlerts.innerHTML = [
    ...videoInfos.map(renderVideoInfoCard),
    ...official.map((alert) => renderAlertCard(alert, action))
  ].join("");
}

function formatAlertTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatAlertDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function alertStatusLabel(alert) {
  if (alert.type === "final_composition_ready") {
    return alert.informaticsStatus === "done" ? "Composition vérifiée" : "Info à vérifier";
  }
  if (alert.type === "finalists_announcement" && alert.speakerStatus === "done") return "Finalistes annoncés";
  if (alert.type === "finalist_replacement_announcement" && alert.speakerStatus === "done") return "Repêchage annoncé";
  if (alert.cancelledAt) {
    const time = formatAlertTime(alert.cancelledAt);
    const suffix = time ? ` à ${time}` : "";
    return alert.cancelledBy === "delegate" ? `Annulée par le délégué${suffix}` : `Annulée par le JA${suffix}`;
  }
  if (alert.requiresVideo && alert.videoStatus === "pending") return "En attente vidéo";
  if (alert.videoStatus === "rejected") return "Invalidée vidéo";
  if (alert.type === "forfait" && alert.secretaryStatus === "pending" && alert.informaticsStatus === "pending") return "Secrétariat / bureau à traiter";
  if (alert.type === "forfait" && alert.secretaryStatus === "pending") return "À prendre en note secrétariat";
  if (alert.speakerStatus === "pending" && alert.informaticsStatus === "pending") return "À annoncer / à traiter";
  if (alert.speakerStatus === "pending") return "À annoncer";
  if (alert.informaticsStatus === "pending") return "À traiter bureau des performances";
  if (alert.speakerStatus === "done" || alert.informaticsStatus === "done") return "Terminée";
  return "Envoyée";
}

function alertStatusClass(alert) {
  if (alert.type === "final_composition_ready") {
    return alert.informaticsStatus === "done" ? "status-done" : "status-sent";
  }
  if (alert.cancelledAt) return "status-rejected";
  if (alert.requiresVideo && alert.videoStatus === "pending") return "status-video";
  if (alert.videoStatus === "rejected") return "status-rejected";
  if (alert.speakerStatus === "pending" || alert.informaticsStatus === "pending" || alert.secretaryStatus === "pending") return "status-pending";
  if (alert.speakerStatus === "done" || alert.informaticsStatus === "done" || alert.secretaryStatus === "done") return "status-done";
  return "status-sent";
}

function alertTimeline(alert) {
  const firstLabel = alert.type === "finalists_announcement"
    ? "Demande annonce"
    : alert.type === "finalist_replacement_announcement"
    ? "Demande repêchage"
    : "JA";
  const items = [
    [firstLabel, alert.createdAt],
    ["Vidéo confirmée", alert.videoConfirmedAt],
    ["Vidéo invalidée", alert.videoRejectedAt],
    ["Secrétariat", alert.secretaryDoneAt],
    ["Speaker", alert.speakerAnnouncedAt],
    ["Bureau des performances", alert.informaticsDoneAt],
    [alert.cancelledBy === "delegate" ? "Délégué" : "Annulation", alert.cancelledAt]
  ].filter(([, value]) => value);
  return items.map(([label, value]) => `${label} ${formatAlertTime(value)}`).join(" - ");
}

function alertTimelineItems(alert) {
  const related = alerts
    .filter((item) => item.originalAlertId === alert.id)
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  const firstLabel = alert.type === "finalists_announcement"
    ? "Demande annonce finalistes"
    : alert.type === "finalist_replacement_announcement"
    ? "Demande annonce repêchage"
    : "Créée par le JA";
  const items = [
    [firstLabel, alert.createdAt],
    ["Vidéo confirmée", alert.videoConfirmedAt],
    ["Vidéo invalidée", alert.videoRejectedAt],
    ["Pris en note secrétariat", alert.secretaryDoneAt],
    ["Annonce speaker", alert.speakerAnnouncedAt],
    ["Traitée bureau des performances", alert.informaticsDoneAt],
    [alert.cancelledBy === "delegate" ? "Annulée par le délégué" : "Annulée par le JA", alert.cancelledAt]
  ].filter(([, value]) => value);
  related.forEach((item) => {
    const source = item.type === "requalification" ? "délégué" : "JA";
    items.push([`Alerte requalification créée (${source})`, item.createdAt]);
    if (item.speakerAnnouncedAt) items.push(["Requalification annoncée speaker", item.speakerAnnouncedAt]);
    if (item.informaticsDoneAt) items.push(["Requalification traitée bureau des performances", item.informaticsDoneAt]);
  });
  return items;
}

function renderHistoryItem(alert, options = {}) {
  return livePalmesHistoryView.renderHistoryItem(alert, {
    ...options,
    events: data.events || [],
    helpers: {
      alertCommentLabel,
      alertIdentityLabel,
      alertStatusClass,
      alertStatusLabel,
      alertTimeline,
      decisionMotifLabel,
      finalStageLabel,
      formatAlertTime,
      fullAlertIdentityLabel,
      historyActionForAlert,
      isFinalStage
    }
  });
}

function openAlertDetail(alertId) {
  const clickedAlert = alerts.find((item) => item.id === alertId);
  if (!clickedAlert || !alertDetailModal) return;
  if (clickedAlert.type === "final_composition_ready") {
    openFinalCompositionModal(clickedAlert.id, { fromHistory: true });
    return;
  }
  if (clickedAlert.type === "finalists_announcement") {
    openFinalistsAnnouncementModal(clickedAlert.id);
    return;
  }
  const alert = clickedAlert.originalAlertId
    ? (alerts.find((item) => item.id === clickedAlert.originalAlertId) || clickedAlert)
    : clickedAlert;
  const status = alertStatusLabel(alert);
  const event = data.events.find((item) => item.id === alert.eventId);
  const sexLabel = alert.sex === "F" ? "Femmes" : (alert.sex === "M" ? "Hommes" : "Mixte");
  const isInfoAlert = alert.type === "finalist_replacement_announcement" || alert.type === "finalists_announcement" || alert.type === "final_composition_ready";
  const seriesLabel = alert.stage && isFinalStage(alert.stage)
    ? finalStageLabel(alert.stage)
    : `Série ${alert.series || "-"}`;
  const courseLabel = `${event?.label || alert.eventId} ${sexLabel}`;
  const seriesLineLabel = `${seriesLabel} ligne ${alert.line || "-"}`;
  const hasSeriesLine = !isInfoAlert && (alert.line || alert.series || alert.stage);
  const identity = alert.type === "finalist_replacement_announcement"
    ? `${alert.replacementName || "Concurrent"}${alert.replacementClub ? ` - ${alert.replacementClub}` : ""}`
    : alertIdentityLabel(alert);
  const comment = alertCommentLabel(alert);
  const timeline = alertTimelineItems(alert);
  const speakerSentence = state.role === "speaker" ? speakerAlertSentence(alert) : null;
  const clickedSentence = state.role !== "video" && clickedAlert.id !== alert.id ? speakerAlertSentence(clickedAlert) : null;
  const sheetTitle = isInfoAlert ? "Fiche information" : "Fiche décision";
  alertDetailModal.hidden = false;
  alertDetailModal.innerHTML = livePalmesAlertDetailView.renderAlertDetailModalHtml({
    alert,
    clickedSentence,
    comment,
    courseLabel,
    decisionLabel: decisionMotifLabel(alert),
    formatAlertDateTime,
    hasSeriesLine,
    identity,
    seriesLineLabel,
    sheetTitle,
    speakerSentence,
    status,
    statusClass: alertStatusClass(alert),
    timeline
  });
}

function closeAlertDetail() {
  if (!alertDetailModal) return;
  alertDetailModal.hidden = true;
  alertDetailModal.innerHTML = "";
}

function openFinalistsAnnouncementModal(alertId) {
  const alert = alerts.find((item) => item.id === alertId);
  if (!alert || !alertDetailModal) return;
  const canMarkAnnounced = state.role === "speaker" && alert.speakerStatus === "pending";
  const finalists = finalRowsForAnnouncementAlert(alert);
  const hasFinalB = Boolean(finalists?.b?.length);
  const finalLabel = hasFinalB ? "les finales" : "la finale";
  const speakerText = `Votre attention s'il vous plait, sont qualifiés pour ${finalLabel} du ${alert.eventLabel || alert.eventId} ${alert.sexLabel || sexDisplayLabel(alert.sex)} :`;
  alertDetailModal.hidden = false;
  alertDetailModal.innerHTML = livePalmesAlertDetailView.renderFinalistsAnnouncementModalHtml({
    alert,
    canMarkAnnounced,
    eventLabel: alert.eventLabel || alert.eventId,
    finalistsListHtml: renderFinalistsAlertList(alert),
    sexLabel: alert.sexLabel || sexDisplayLabel(alert.sex),
    speakerText
  });
}

function historyActionForAlert(alert) {
  if (alert.cancelledAt || isRequalificationAlert(alert)) return null;
  if (state.role === "referee" && alert.roleSource === "referee") {
    return { action: "cancel-ja", label: "Annuler", className: "danger-button" };
  }
  if (state.role === "video" && isDsqAlert(alert)) {
    return { action: "delegate-cancel", label: "Annulation délégué", className: "danger-button" };
  }
  return null;
}

function historyFilterKey() {
  return isSpeakerView() ? state.role : state.role;
}

function historyFilterValue(key) {
  return historyFilters[key] || "all";
}

function historyAlertMatchesFilter(alert, filter) {
  if (!filter || filter === "all") return true;
  if (filter === "finals") {
    return ["finalists_announcement", "finalist_replacement_announcement", "final_composition_ready"].includes(alert.type);
  }
  if (filter === "dsq") {
    return isDsqAlert(alert) || alert.type === "abandon";
  }
  if (filter === "forfait") {
    return alert.type === "forfait";
  }
  return true;
}

function filteredHistoryRows(rows, key) {
  const filter = historyFilterValue(key);
  return rows.filter((alert) => historyAlertMatchesFilter(alert, filter));
}

function historyFilterControl(key) {
  const current = historyFilterValue(key);
  const options = [
    ["all", "Tous"],
    ["finals", "Finalistes / repêchage"],
    ["dsq", "DSQ / abandon"],
    ["forfait", "Forfaits"]
  ];
  return `
    <label class="history-filter">
      <span>Filtrer</span>
      <select data-history-filter="${escapeHtml(key)}">
        ${options.map(([value, label]) => `<option value="${escapeHtml(value)}" ${current === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
      </select>
    </label>
  `;
}

function historyEmptyLabel(filter) {
  if (filter === "finals") return "Aucune annonce finaliste ou repêchage à afficher.";
  if (filter === "dsq") return "Aucune disqualification ou abandon à afficher.";
  if (filter === "forfait") return "Aucun forfait à afficher.";
  return "Aucune action à afficher pour le moment.";
}

function renderSpeakerHistory() {
  if (!speakerHistory) return;
  if (!isSpeakerView()) {
    speakerHistory.hidden = true;
    speakerHistory.innerHTML = "";
    return;
  }
  const doneAlerts = alerts
    .filter((alert) => !isRequalificationAlert(alert))
    .filter((alert) => alert.speakerStatus === "done" || (alert.cancelledAt && alert.speakerAnnouncedAt))
    .sort((a, b) => String(b.speakerAnnouncedAt || b.updatedAt).localeCompare(String(a.speakerAnnouncedAt || a.updatedAt)));
  if (!doneAlerts.length) {
    speakerHistory.hidden = true;
    speakerHistory.innerHTML = "";
    return;
  }
  const filterKey = historyFilterKey();
  const filteredAlerts = filteredHistoryRows(doneAlerts, filterKey);
  speakerHistory.hidden = false;
  speakerHistory.innerHTML = `
    <div class="panel-title">
      <h3>Journal des annonces</h3>
      <div class="history-actions">
        ${historyFilterControl(filterKey)}
        ${historyToggleButton("speaker", filteredAlerts.length)}
      </div>
    </div>
    ${filteredAlerts.length ? `<div class="history-list ${expandedHistories.speaker ? "expanded" : "compact-scroll"}">
      ${filteredAlerts.map((alert) => {
        return renderHistoryItem(alert, { compact: false, timeValue: alert.cancelledAt || alert.speakerAnnouncedAt || alert.updatedAt });
      }).join("")}
    </div>` : `<p class="panel-subtitle">${escapeHtml(historyEmptyLabel(historyFilterValue(filterKey)))}</p>`}
  `;
}

function renderRoleHistory() {
  if (!roleHistory) return;
  if (isSpeakerView()) {
    roleHistory.hidden = true;
    roleHistory.innerHTML = "";
    return;
  }
  let rows = [];
  let title = "Historique";
  if (state.role === "referee") {
    title = "Historique des décisions JA";
    rows = alerts.filter((alert) => alert.roleSource === "referee" && !isRequalificationAlert(alert));
  } else if (state.role === "video") {
    title = "Historique vidéo";
    rows = alerts.filter((alert) => isDsqAlert(alert));
  } else if (state.role === "computer") {
    title = "Journal d'arbitrage et annonces";
    rows = alerts.filter((alert) => alert.roleSource === "referee" || (
      (alert.type === "finalists_announcement" || alert.type === "finalist_replacement_announcement") &&
      alert.speakerStatus === "done"
    ));
  } else if (state.role === "secretary") {
    title = "Journal d'arbitrage et annonces";
    rows = alerts.filter((alert) => alert.roleSource === "referee" || (
      (alert.type === "finalists_announcement" || alert.type === "finalist_replacement_announcement") &&
      alert.speakerStatus === "done"
    ));
  }
  rows = rows
    .sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
  const filterKey = historyFilterKey();
  const filteredRows = filteredHistoryRows(rows, filterKey);
  if (!rows.length) {
    if (!["computer", "secretary"].includes(state.role)) {
      roleHistory.hidden = true;
      roleHistory.innerHTML = "";
      return;
    }
    roleHistory.hidden = false;
    const historyActions = state.role === "computer" ? `
      <button class="history-toggle" type="button" data-history-export-pdf>Export journal</button>
    ` : "";
    roleHistory.innerHTML = `
      <div class="panel-title">
        <h3>${escapeHtml(title)}</h3>
        <div class="history-actions">
          ${historyFilterControl(filterKey)}
          ${historyActions}
        </div>
      </div>
      <p class="panel-subtitle">Aucune action à afficher pour le moment.</p>
    `;
    return;
  }
  roleHistory.hidden = false;
  const computerHistoryActions = state.role === "computer" ? `
    <button class="history-toggle" type="button" data-history-export-pdf>Export journal</button>
  ` : "";
  roleHistory.innerHTML = `
    <div class="panel-title">
      <h3>${escapeHtml(title)}</h3>
      <div class="history-actions">
        ${historyFilterControl(filterKey)}
        ${historyToggleButton("role", filteredRows.length)}
        ${computerHistoryActions}
      </div>
    </div>
    ${filteredRows.length ? `<div class="history-list ${expandedHistories.role ? "expanded" : "compact-scroll"}">
      ${filteredRows.map((alert) => renderHistoryItem(alert, { timeValue: alert.cancelledAt || alert.createdAt, showIdentity: state.role === "video" })).join("")}
    </div>` : `<p class="panel-subtitle">${escapeHtml(historyEmptyLabel(historyFilterValue(filterKey)))}</p>`}
  `;
}

function historyToggleButton(historyKey, rowCount) {
  if (rowCount <= 5) return "";
  const expanded = Boolean(expandedHistories[historyKey]);
  return `<button class="history-toggle" type="button" data-history-toggle="${escapeHtml(historyKey)}">${expanded ? "Réduire le journal" : "Agrandir le journal"}</button>`;
}

function selectedEntrant() {
  if (!state.selectedSwimmerId) return null;
  return raceEntrants().find((entrant) => (entrant.swimmerId || entrantKey(entrant)) === state.selectedSwimmerId) ||
    data.entrants.find((entrant) => (entrant.swimmerId || entrantKey(entrant)) === state.selectedSwimmerId);
}

function entrantSeriesRow(entrant) {
  const swimmerId = entrant.swimmerId || entrantKey(entrant);
  const rows = (data.series || [])
    .filter((row) => row.eventId === entrant.eventId && row.sex === entrant.sex && row.swimmerId === swimmerId)
    .sort((a, b) => Number(a.heatOrder || a.series || 999) - Number(b.heatOrder || b.series || 999));
  if (state.series !== "all") {
    const current = rows.find((row) => isFinalStage(state.series) ? row.stage === state.series : Number(row.series) === Number(state.series));
    if (current) return current;
  }
  return rows[0] || null;
}

function relayLegCount(entrant) {
  const event = data.events.find((item) => item.id === entrant.eventId);
  const label = `${entrant.eventId || ""} ${event?.label || ""}`;
  const match = label.match(/(\d+)x/i);
  return match ? Number(match[1]) : 4;
}

function decisionOptionsForEntrant(entrant) {
  const relay = isRelayEntrant(entrant);
  const event = data.events.find((item) => item.id === entrant.eventId);
  const discipline = String(event?.discipline || event?.label || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const forbidsUnderwaterAndImmersion = discipline.includes("apnee") || discipline.includes("immersion");
  const isImmersionRace = discipline.includes("immersion");
  return [
    ["forfait", "Forfait"],
    ["abandon", "Abandon"],
    ["false_start", "DSQ - faux départ"],
    ...(relay ? [["relay_early_start", "DSQ - départ anticipé"]] : []),
    ...(!forbidsUnderwaterAndImmersion ? [["underwater_15m", "DSQ - coulée supérieure à 15 m"]] : []),
    ...(!forbidsUnderwaterAndImmersion ? [["immersion", "DSQ - passage en immersion"]] : []),
    ...(isImmersionRace ? [["bottle_fault", "DSQ - faute de bouteille"]] : []),
    ["interference", "DSQ - gêne d'un concurrent"],
    ["other_dsq", "DSQ - autre motif"]
  ];
}

function renderDecisionPanel() {
  if (!decisionPanel) return;
  if (state.role !== "referee") {
    decisionPanel.hidden = true;
    decisionPanel.innerHTML = "";
    closeDecisionModal();
    return;
  }
  const entrant = selectedEntrant();
  const modalOpen = Boolean(decisionModal && !decisionModal.hidden && decisionModal.innerHTML.trim());
  decisionPanel.hidden = false;
  decisionPanel.innerHTML = livePalmesRefereeView.renderDecisionPanelHtml({
    modalOpen,
    selectedName: entrant ? formatDisplayName(entrant) : ""
  });
}

function createDecisionDraft() {
  return {
    type: "",
    relayLeg: "",
    lengthType: "start",
    lengthNumber: "1",
    comment: ""
  };
}

function openDecisionModal() {
  const entrant = selectedEntrant();
  if (!decisionModal || state.role !== "referee" || !entrant) return;
  decisionDraft = createDecisionDraft();
  renderDecisionModal();
}

function closeDecisionModal({ clearSelection = false } = {}) {
  if (!decisionModal) return;
  decisionModal.hidden = true;
  decisionModal.innerHTML = "";
  if (clearSelection) {
    state.selectedSwimmerId = "";
    renderEntrants();
    renderDecisionPanel();
  }
}

function decisionNeedsDetail(type) {
  return type === "relay_early_start" || type === "underwater_15m";
}

function decisionNeedsRelayLeg(type, entrant) {
  return isRelayEntrant(entrant) && ["relay_early_start", "underwater_15m", "immersion", "bottle_fault", "interference", "other_dsq"].includes(type);
}

function decisionNeedsLengthPosition(type) {
  return type === "underwater_15m";
}

function decisionDraftIsReady(entrant) {
  if (!decisionDraft.type) return false;
  if (decisionNeedsRelayLeg(decisionDraft.type, entrant) && !decisionDraft.relayLeg) return false;
  if (decisionNeedsLengthPosition(decisionDraft.type)) {
    return decisionDraft.lengthType === "start" || Boolean(String(decisionDraft.lengthNumber || "").trim());
  }
  return true;
}

function defaultDecisionDetail(type, entrant) {
  if (decisionNeedsRelayLeg(type, entrant)) {
    decisionDraft.relayLeg = "2";
  } else if (type === "underwater_15m" && isRelayEntrant(entrant)) {
    decisionDraft.relayLeg = "1";
  } else {
    decisionDraft.relayLeg = "";
  }
  if (type === "underwater_15m" && isRelayEntrant(entrant)) {
    decisionDraft.relayLeg = "1";
  }
  decisionDraft.lengthType = "start";
  decisionDraft.lengthNumber = "1";
}

function renderDecisionModal() {
  const entrant = selectedEntrant();
  if (!decisionModal || !entrant) return;
  const relay = isRelayEntrant(entrant);
  const legCount = relayLegCount(entrant);
  const row = entrantSeriesRow(entrant);
  const event = data.events.find((item) => item.id === entrant.eventId);
  const sexLabel = entrant.sex === "F" ? "Femmes" : (entrant.sex === "M" ? "Hommes" : "Mixte");
  const modalSeriesLabel = row?.stage && isFinalStage(row.stage)
    ? finalStageLabel(row.stage)
    : `Série ${row?.series || (state.series === "all" ? "-" : state.series)}`;
  const modalLineLabel = row?.line || entrant.lane || entrant.seriesInfo?.line || "-";
  const modalRaceInfo = `${event?.label || entrant.eventId} ${sexLabel} - ${modalSeriesLabel} - Ligne ${modalLineLabel}`;
  const activeDecisions = activeDsqAlertsForEntrant(entrant);
  decisionModal.hidden = false;
  decisionModal.innerHTML = livePalmesRefereeView.renderDecisionModalHtml({
    activeDecisions: activeDecisions.map((alert) => ({ id: alert.id, label: decisionMotifLabel(alert) })),
    choices: decisionOptionsForEntrant(entrant).map(([value, label]) => ({
      active: decisionDraft.type === value,
      label,
      value
    })),
    decisionDraft,
    entrantName: formatDisplayName(entrant),
    firstLeg: decisionDraft.type === "relay_early_start" ? 2 : 1,
    legCount,
    lineLabel: modalLineLabel,
    raceInfo: modalRaceInfo,
    ready: decisionDraftIsReady(entrant),
    relay,
    showLengthSelector: decisionDraft.type === "underwater_15m",
    showRelayLeg: decisionNeedsRelayLeg(decisionDraft.type, entrant)
  });
}

function decisionRoute(type) {
  if (type === "forfait" || type === "abandon") return "computer";
  if (type === "false_start" || type === "relay_early_start" || type === "underwater_15m") return "video";
  return "official";
}

function createDecisionAlert(decision) {
  const entrant = selectedEntrant();
  if (!entrant) return;
  const type = decision.type || "";
  const route = decisionRoute(type);
  const row = entrantSeriesRow(entrant);
  const now = new Date().toISOString();
  const alert = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    competitionId: "local",
    roleSource: "referee",
    eventId: entrant.eventId,
    sex: entrant.sex,
    session: row?.session || state.session,
    series: row?.series || (state.series === "all" ? "" : state.series),
    stage: row?.stage || (isFinalStage(state.series) ? state.series : "series"),
    line: row?.line || entrant.lane || entrant.seriesInfo?.line || "",
    swimmerId: entrant.swimmerId || entrantKey(entrant),
    displayName: formatDisplayName(entrant),
    club: isRelayEntrant(entrant) ? (entrant.clubCode || entrant.club || "") : (entrant.club || ""),
    clubCode: shortClubName(entrant),
    type,
    comment: decision.comment?.trim() || "",
    relayLeg: decisionNeedsRelayLeg(type, entrant) ? (decision.relayLeg || "") : "",
    lengthType: type === "underwater_15m" ? (decision.lengthType || "") : "",
    lengthNumber: type === "underwater_15m" && decision.lengthType === "length" ? (decision.lengthNumber || "") : "",
    requiresVideo: route === "video",
    videoStatus: route === "video" ? "pending" : "none",
    speakerStatus: route === "official" ? "pending" : "none",
    secretaryStatus: type === "forfait" ? "pending" : "none",
    informaticsStatus: route === "computer" || route === "official" ? "pending" : "none",
    createdAt: now,
    updatedAt: now
  };
  alerts.unshift(alert);
  saveAlerts();
  syncAlertToFirestore(alert);
  state.selectedSwimmerId = "";
  render();
}

function renderRoleQueue() {
  if (!roleQueue) return;
  if (isSpeakerView() || state.role === "referee") {
    roleQueue.hidden = true;
    roleQueue.innerHTML = "";
    return;
  }
  const rows = alerts
    .filter(currentRoleAlertFilter)
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  const title = state.role === "video" ? "Demandes vidéo à vérifier" : "Informations";
  roleQueue.hidden = false;
  roleQueue.innerHTML = livePalmesRoleQueueView.renderRoleQueueHtml({
    helpers: {
      alertCommentLabel,
      alertRaceLabel,
      alertSwimmerLabel,
      decisionMotifLabel,
      formatAlertTime,
      sexDisplayLabel
    },
    role: state.role,
    rows,
    title
  });
}

function updateAlert(alertId, changes) {
  const index = alerts.findIndex((alert) => alert.id === alertId);
  if (index === -1) return;
  const updatedAt = new Date().toISOString();
  const nextChanges = { ...changes, updatedAt };
  alerts[index] = { ...alerts[index], ...nextChanges };
  saveAlerts();
  syncAlertChangesToFirestore(alertId, nextChanges);
  render();
}

function markSpeakerAlertDoneLocally(alertId, announcedAt = new Date().toISOString()) {
  const index = alerts.findIndex((alert) => alert.id === alertId);
  if (index === -1) return null;
  const previous = { ...alerts[index] };
  alerts[index] = {
    ...alerts[index],
    speakerStatus: "done",
    speakerAnnouncedAt: announcedAt,
    updatedAt: announcedAt
  };
  saveAlerts();
  render();
  return previous;
}

function restoreAlertLocally(previousAlert) {
  if (!previousAlert?.id) return;
  const index = alerts.findIndex((alert) => alert.id === previousAlert.id);
  if (index === -1) return;
  alerts[index] = previousAlert;
  saveAlerts();
  render();
}

function cloneAlertForCancellation(source, type, by) {
  const now = new Date().toISOString();
  return {
    ...source,
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    originalAlertId: source.id,
    type,
    roleSource: by,
    requiresVideo: false,
    videoStatus: "none",
    speakerStatus: isDsqAlert(source) ? "pending" : "none",
    informaticsStatus: "pending",
    createdAt: now,
    updatedAt: now,
    speakerAnnouncedAt: "",
    informaticsDoneAt: "",
    videoConfirmedAt: "",
    videoRejectedAt: "",
    cancelledAt: "",
    cancelledBy: ""
  };
}

function cancelDecision(alertId, cancelledBy = "referee") {
  const index = alerts.findIndex((alert) => alert.id === alertId);
  if (index === -1 || alerts[index].cancelledAt || isRequalificationAlert(alerts[index])) return;
  const source = alerts[index];
  const now = new Date().toISOString();
  const updates = {
    cancelledAt: now,
    cancelledBy,
    speakerStatus: source.speakerStatus === "pending" ? "none" : source.speakerStatus,
    informaticsStatus: source.informaticsStatus === "pending" ? "none" : source.informaticsStatus,
    secretaryStatus: source.secretaryStatus === "pending" ? "none" : source.secretaryStatus
  };
  const updatedSource = { ...source, ...updates, updatedAt: now };
  alerts[index] = updatedSource;
  const shouldNotifySpeaker = isDsqAlert(source) && (source.speakerStatus === "done" || cancelledBy === "delegate");
  const shouldNotifyComputer = source.informaticsStatus === "done" || cancelledBy === "delegate";
  if (shouldNotifySpeaker || shouldNotifyComputer) {
    const type = cancelledBy === "delegate" ? "requalification" : "ja_cancellation";
    const cancellationAlert = cloneAlertForCancellation(source, type, cancelledBy);
    cancellationAlert.speakerStatus = shouldNotifySpeaker ? "pending" : "none";
    cancellationAlert.informaticsStatus = shouldNotifyComputer ? "pending" : "none";
    alerts.unshift(cancellationAlert);
    syncAlertToFirestore(cancellationAlert);
  }
  saveAlerts();
  syncAlertToFirestore(updatedSource);
  render();
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
    button.textContent = "←";
    button.title = previousLabel;
    button.setAttribute("aria-label", previousLabel);
  });
  [nextSeriesBtn, nextSeriesFloatBtn].forEach((button) => {
    if (!button) return;
    button.disabled = nextDisabled;
    button.textContent = "→";
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

function renderProgramButtons() {
  if (programBtn) {
    const inlineProgram = ["speaker", "referee", "live"].includes(state.role);
    programBtn.textContent = inlineProgram ? "Programme" : "P";
    programBtn.title = "Programme";
    programBtn.setAttribute("aria-label", "Programme");
  }
  if (programFloatBtn) {
    programFloatBtn.textContent = "P";
    programFloatBtn.title = "Programme";
    programFloatBtn.setAttribute("aria-label", "Programme");
  }
}

function programSeriesItems(row) {
  if (!row) return [];
  if (isFinalStage(row.stage) || row.hasEntrants === false) {
    return [{
      series: row.stage || "finale",
      label: row.stage ? finalStageLabel(row.stage) : "Finale",
      time: row.startTime || "",
      stage: row.stage || "finale"
    }];
  }
  const rows = (data.series || [])
    .filter((seriesRow) => seriesRow.eventId === row.eventId && seriesRow.sex === row.sex)
    .filter((seriesRow) => !row.session || !seriesRow.session || seriesRow.session === row.session)
    .filter((seriesRow) => !isFinalStage(seriesRow.stage))
    .sort((a, b) => Number(a.series || 999) - Number(b.series || 999) || Number(a.line || 99) - Number(b.line || 99));
  const bySeries = new Map();
  rows.forEach((seriesRow) => {
    const key = String(seriesRow.series || "");
    if (!key || bySeries.has(key)) return;
    bySeries.set(key, {
      series: key,
      label: `Série ${key}`,
      time: seriesRow.startTime || "",
      stage: "series"
    });
  });
  return [...bySeries.values()];
}

function programItemMatchesState(row, item, compareState) {
  return row.eventId === compareState.eventId &&
    row.sex === compareState.sex &&
    (!row.session || compareState.session === "all" || row.session === compareState.session) &&
    (
      (item.stage && isFinalStage(item.stage) && compareState.series === item.stage) ||
      (!isFinalStage(item.stage) && String(compareState.series) === String(item.series))
    );
}

function programItemIsCurrent(row, item) {
  const viewState = ["video", "computer"].includes(state.role) ? (roleStates.speaker || state) : state;
  return programItemMatchesState(row, item, viewState);
}

function programItemIsSpeakerCurrent(row, item) {
  if (state.role !== "referee") return false;
  return programItemMatchesState(row, item, roleStates.speaker || state);
}

function programProgressValue(row, item = null) {
  const session = Number(row?.session || 0);
  const order = Number(row?.order || 0);
  const stage = item?.stage || row?.stage || "series";
  const series = isFinalStage(stage)
    ? (String(stage).toUpperCase().includes("B") ? 200 : 100)
    : Number(item?.series || 0);
  return [session, order, series];
}

function compareProgramProgressValues(a, b) {
  for (let index = 0; index < 3; index += 1) {
    const diff = Number(a[index] || 0) - Number(b[index] || 0);
    if (diff) return diff;
  }
  return 0;
}

function progressValueFromMarker(progress = refereeProgress()) {
  if (!progress?.programKey) return null;
  const row = (data.program || []).find((item) => programKey(item) === progress.programKey);
  if (!row) return null;
  return programProgressValue(row, {
    series: progress.series,
    stage: progress.stage || row.stage || "series"
  });
}

function programItemProgressClass(row, item) {
  const markerValue = progressValueFromMarker();
  if (!markerValue) return "";
  const comparison = compareProgramProgressValues(programProgressValue(row, item), markerValue);
  if (comparison < 0) return "ja-passed";
  if (comparison === 0) return "ja-current";
  return "";
}

function programRowProgressClass(row) {
  const markerValue = progressValueFromMarker();
  if (!markerValue) return "";
  return compareProgramProgressValues(programProgressValue(row), markerValue) < 0 ? "ja-passed-row" : "";
}

function speakerProgramPositionLabel() {
  const speakerState = roleStates.speaker || state;
  const event = data.events.find((item) => item.id === speakerState.eventId);
  const seriesLabel = isFinalStage(speakerState.series)
    ? finalStageLabel(speakerState.series)
    : `Série ${speakerState.series || "-"}`;
  return `Repère speaker : ${speakerState.session && speakerState.session !== "all" ? `S${speakerState.session} - ` : ""}${event?.label || "Course"} ${sexDisplayLabel(speakerState.sex)} - ${seriesLabel}`;
}

function renderProgramModal() {
  if (!programModal || programModal.hidden) return;
  const viewState = ["video", "computer"].includes(state.role) ? (roleStates.speaker || state) : state;
  const readOnlyProgram = ["video", "computer"].includes(state.role);
  const compactProgram = false;
  const rows = (data.program || [])
    .filter((row) => viewState.session === "all" || !row.session || row.session === viewState.session)
    .filter((row) => row.hasEntrants === false || hasRowsForProgram(row))
    .sort((a, b) => Number(a.session || 0) - Number(b.session || 0) || Number(a.order || 9999) - Number(b.order || 9999));
  const currentKey = raceOptionKey(viewState.eventId, viewState.sex);
  programModal.innerHTML = livePalmesProgramView.renderProgramModalHtml({
    compactProgram,
    readOnlyProgram,
    rows: rows.map((row) => {
      const event = data.events.find((item) => item.id === row.eventId);
      const rowKey = raceOptionKey(row.eventId, row.sex);
      return {
        current: rowKey === currentKey && (!row.session || state.session === "all" || row.session === state.session),
        eventLabel: event?.label || row.label || row.eventId,
        items: programSeriesItems(row).map((item) => ({
          ...item,
          current: programItemIsCurrent(row, item),
          progressClass: programItemProgressClass(row, item),
          speakerCurrent: programItemIsSpeakerCurrent(row, item)
        })),
        programKey: programKey(row),
        progressClass: programRowProgressClass(row),
        session: row.session || "",
        sexLabel: sexDisplayLabel(row.sex),
        splitNote: splitRaceNote(row.eventId, row.sex),
        startTime: row.startTime || ""
      };
    }),
    sessionLabel: compactProgram
      ? (viewState.session === "all" ? "Toutes les sessions" : `Session ${viewState.session}`)
      : `${viewState.session === "all" ? "Toutes les sessions" : `Session ${viewState.session}`} - courses, séries et horaires indicatifs.`,
    speakerMarker: state.role === "referee" ? speakerProgramPositionLabel() : ""
  });
}

function openProgramModal() {
  if (!programModal) return;
  programModal.hidden = false;
  renderProgramModal();
}

function closeProgramModal() {
  if (!programModal) return;
  programModal.hidden = true;
  programModal.innerHTML = "";
}

async function setRefereeProgressHere() {
  if (state.role !== "referee") return;
  const progress = currentRefereeProgressPayload();
  if (!progress) return;
  const label = refereeProgressLabel(progress);
  data = normalizeData({
    ...data,
    notes: {
      ...(data.notes || {}),
      refereeProgress: progress
    }
  });
  render();
  if (!programModal.hidden) renderProgramModal();
  updateLiveNotes(`Point JA : ${label || compactRaceTitle()}`, { refereeProgress: progress }).catch((error) => {
    console.error(error);
    window.alert(`Point JA non publié : ${error?.message || error}`);
  });
}

function openAdminSeriesModal() {
  if (!adminSeriesModal) return;
  adminSeriesModal.hidden = false;
  adminSeriesModal.innerHTML = livePalmesAdminModals.renderAdminSeriesModalHtml();
}

function closeAdminSeriesModal() {
  if (!adminSeriesModal) return;
  adminSeriesModal.hidden = true;
  adminSeriesModal.innerHTML = "";
}

function openResultImportModal(row) {
  if (!resultImportModal || !row) return;
  currentResultImportRow = row;
  currentSessionResultsImport = null;
  const event = data.events.find((item) => item.id === row.eventId);
  const phaseLabel = resultPhaseLabelForProgramRow(row);
  const isFinalResult = isFinalStage(row.stage);
  const defaultPartial = !isFinalResult && isSplitRaceAcrossSessions(row.eventId, row.sex) && !isLastProgramPartForRace(row);
  const existingResult = resultForProgramRow(row);
  const protectedFinalists = Boolean(existingResult?.hasFinal && (
    existingResult.finalistsAnnouncedAt ||
    (existingResult.finalWithdrawals || []).length ||
    (existingResult.finalPreWithdrawals || []).length ||
    ["a", "b"].some((key) => (existingResult.finalists?.[key] || []).some((finalist) => finalist.withdrawnAt || finalist.repechaged))
  ));
  resultImportModal.hidden = false;
  resultImportModal.innerHTML = livePalmesAdminResults.renderResultImportModalHtml({
    defaultPartial,
    eventLabel: event?.label || row.label || row.eventId,
    isFinalResult,
    phaseLabel,
    protectedFinalists,
    sexLabel: sexDisplayLabel(row.sex),
    subtitle: [row.session ? `Session ${row.session}` : "", row.startTime || ""].filter(Boolean).join(" - ") || "Importer le PDF résultat"
  });
}

function openSessionResultsImportModal(defaultSession = "") {
  if (!resultImportModal) return;
  currentResultImportRow = null;
  const sessions = resultSessions();
  const selectedSession = defaultSession || resultsAdminSession || sessions[0]?.number || "";
  currentSessionResultsImport = { defaultSession: selectedSession };
  resultImportModal.hidden = false;
  resultImportModal.innerHTML = livePalmesAdminResults.renderSessionResultsImportModalHtml({
    selectedSession,
    sessions
  });
}

function closeResultImportModal() {
  if (!resultImportModal) return;
  resultImportModal.hidden = true;
  resultImportModal.innerHTML = "";
  currentResultImportRow = null;
  currentSessionResultsImport = null;
}

async function fileToDataUrl(file) {
  return livePalmesResults.fileToDataUrl(file);
}

async function loadResultPdfData(result) {
  return livePalmesResults.loadResultPdfData(result, {
    collection: resultPdfsCollection(),
    resultPdfPayload
  });
}

async function resultPdfDataUrl(result) {
  return livePalmesResults.resultPdfDataUrl(result, {
    collection: resultPdfsCollection(),
    resultPdfPayload
  });
}

async function saveResultPdfPayload(result, pdfDataUrl) {
  return livePalmesResults.saveResultPdfPayload(result, pdfDataUrl, {
    collection: resultPdfsCollection(),
    resultPdfPayload
  });
}

async function deleteResultPdfPayload(resultId) {
  return livePalmesResults.deleteResultPdfPayload(resultId, {
    collection: resultPdfsCollection(),
    onError: (error) => console.warn("Suppression du PDF résultat séparé impossible", error)
  });
}

async function migrateResultPdfsOutOfResults(rows = [], options = {}) {
  const force = options.force === true;
  if (resultPdfMigrationRunning || (!force && resultPdfMigrationAttempted) || (state.role !== "computer" && !force)) return 0;
  const withPdf = rows.filter((result) => result.id && result.pdfDataUrl);
  if (!withPdf.length) return 0;
  const pdfCollection = resultPdfsCollection();
  const resultCollection = resultsCollection();
  if (!pdfCollection || !resultCollection || !window.firebase?.firestore?.FieldValue) return 0;
  resultPdfMigrationRunning = true;
  if (!force) resultPdfMigrationAttempted = true;
  try {
    for (const result of withPdf) {
      await pdfCollection.doc(result.id).set(JSON.parse(JSON.stringify(resultPdfPayload(result, result.pdfDataUrl))));
      await resultCollection.doc(result.id).update({
        pdfDataUrl: window.firebase.firestore.FieldValue.delete()
      });
    }
    if (options.showStatus !== false) {
      renderDataStatus(`${withPdf.length} PDF résultat déplacé${withPdf.length > 1 ? "s" : ""} hors de la liste principale.`);
    }
    return withPdf.length;
  } finally {
    resultPdfMigrationRunning = false;
  }
}

async function dataUrlToFile(dataUrl, name = "resultat.pdf", type = "application/pdf") {
  return livePalmesResults.dataUrlToFile(dataUrl, name, type);
}

const livePalmesResultParser = window.LivePalmesResultParser;

function resultParserOptions() {
  return {
    fixPdfEncoding,
    finalistRowName,
    formatDisplayName,
    importedBirthYear,
    importedSeriesTime,
    isFinalStage,
    normalizePersonName,
    splitImportedPersonName
  };
}

function resultParserFunction(name) {
  const fn = livePalmesResultParser?.[name];
  if (typeof fn !== "function") throw new Error(`Module de lecture des resultats indisponible: ${name}`);
  return fn;
}

function normalizeResultLineText(line) {
  return resultParserFunction("normalizeResultLineText")(line, resultParserOptions());
}

function parseResultRow(line) {
  return resultParserFunction("parseResultRow")(line, resultParserOptions());
}

function parseUnrankedResultRow(line) {
  return resultParserFunction("parseUnrankedResultRow")(line, resultParserOptions());
}

function resultStatusFromText(value) {
  return resultParserFunction("resultStatusFromText")(value, resultParserOptions());
}

function parseResultStatusRow(line) {
  return resultParserFunction("parseResultStatusRow")(line, resultParserOptions());
}

function resultImportRowKey(row) {
  return resultParserFunction("resultImportRowKey")(row, resultParserOptions());
}

function parseFinalistsFromResultLines(lines) {
  return resultParserFunction("parseFinalistsFromResultLines")(lines, resultParserOptions());
}

function emptyParsedFinals() {
  return resultParserFunction("emptyParsedFinals")();
}

function resolveParsedFinals(parsedRows, existingResult, options = {}) {
  return resultParserFunction("resolveParsedFinals")(parsedRows, existingResult, {
    ...options,
    rebuildFinalistsFromParsedResult
  });
}

function shouldPreserveFinalistsOnReread(existingResult) {
  return resultParserFunction("shouldPreserveFinalistsOnReread")(existingResult);
}

function buildPublishedResult(input) {
  return resultParserFunction("buildPublishedResult")(input);
}

function finalRowCountsAsFinalist(row) {
  return resultParserFunction("finalRowCountsAsFinalist")(row, resultParserOptions());
}

function finalRowsCount(finalists = {}) {
  return resultParserFunction("finalRowsCount")(finalists, resultParserOptions());
}

function performanceStageForResultRow(item, result, row, rowIndex = 0) {
  return resultParserFunction("performanceStageForResultRow")(item, result, row, rowIndex, resultParserOptions());
}

function resultPerformanceDuplicateKey(item) {
  return resultParserFunction("resultPerformanceDuplicateKey")(item, resultParserOptions());
}

function resultPerformanceRows(parsedRows, result, row) {
  return resultParserFunction("resultPerformanceRows")(parsedRows, result, row, resultParserOptions());
}

async function publishResultPdf(file, row, hasFinal, isPartial = false, options = {}) {
  const collection = resultsCollection();
  if (!collection) throw new Error("Firebase n'est pas disponible pour publier ce résultat.");
  const now = new Date().toISOString();
  const event = data.events.find((item) => item.id === row.eventId);
  const existingResult = resultForProgramRow(row);
  const reuseExistingPdf = Boolean(options.reuseExistingPdf && existingResult);
  const pdfDataUrl = reuseExistingPdf ? await resultPdfDataUrl(existingResult) : await fileToDataUrl(file);
  const preserveFinalists = Boolean(options.preserveFinalists && existingResult?.hasFinal);
  const lines = await extractPdfLines(file);
  const parsedRows = parseFinalistsFromResultLines(lines);
  const resolvedFinals = resolveParsedFinals(parsedRows, existingResult, {
    hasFinal,
    now,
    preserveFinalists
  });
  hasFinal = resolvedFinals.hasFinal;
  if (hasFinal && !preserveFinalists && !resolvedFinals.parsedFinals.finalists.a.length) {
    throw new Error("Aucun finaliste détecté dans ce PDF. Vérifie que les lignes contiennent bien la mention finale.");
  }
  const result = buildPublishedResult({
    event,
    existingResult,
    file,
    hasFinal,
    isPartial,
    now,
    parsedFinals: resolvedFinals.parsedFinals || emptyParsedFinals(),
    preserveFinalists,
    preservedFinalState: resolvedFinals.preservedFinalState,
    row,
    values: {
      id: resultIdForProgramRow(row),
      raceKey: raceOptionKey(row.eventId, row.sex),
      programKey: programKey(row),
      sexLabel: sexDisplayLabel(row.sex),
      stage: isFinalStage(row.stage) ? row.stage : "series",
      phaseLabel: resultPhaseLabelForProgramRow(row)
    }
  });
  result.performances = resultPerformanceRows(parsedRows.ranking, result, row);
  await saveResultPdfPayload(result, pdfDataUrl);
  await collection.doc(result.id).set(JSON.parse(JSON.stringify(resultMetadataPayload(result))));
  raceResults = [
    resultMetadataPayload(result),
    ...raceResults.filter((item) => item.id !== result.id)
  ].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  if (hasFinal && !preserveFinalists) {
    await createFinalistsSpeakerAlert(result);
  }
  await publishPublicResultsIndex();
  return result;
}

async function rereadPublishedResult(row) {
  const existingResult = resultForProgramRow(row);
  if (!existingResult) {
    throw new Error("Aucun PDF déjà publié à relire pour cette course.");
  }
  const pdfDataUrl = await resultPdfDataUrl(existingResult);
  const file = await dataUrlToFile(pdfDataUrl, existingResult.pdfName || "resultat.pdf");
  const preserveFinalists = shouldPreserveFinalistsOnReread(existingResult);
  return publishResultPdf(file, row, Boolean(existingResult.hasFinal), Boolean(existingResult.isPartial), {
    preserveFinalists,
    reuseExistingPdf: true
  });
}

async function createFinalistsSpeakerAlert(result) {
  const finalistCount = finalRowsCount(result?.finalists);
  if (!finalistCount) return null;
  const now = new Date().toISOString();
  const alreadyAnnounced = alerts.find((alert) =>
    alert.type === "finalists_announcement" &&
    alert.resultId === result.id &&
    alert.speakerStatus === "done" &&
    alert.speakerAnnouncedAt
  );
  if (alreadyAnnounced) {
    if (!result.finalistsAnnouncedAt) {
      await stampFinalistsAnnouncement(result, alreadyAnnounced.speakerAnnouncedAt);
    }
    return alreadyAnnounced;
  }
  alerts
    .filter((alert) => alert.type === "finalists_announcement" && alert.resultId === result.id && alert.speakerStatus === "pending")
    .forEach((alert) => {
      alert.speakerStatus = "none";
      alert.updatedAt = now;
      syncAlertToFirestore(alert);
    });
  const alert = {
    id: `finalists-${result.id}`,
    type: "finalists_announcement",
    roleSource: "computer",
    resultId: result.id,
    eventId: result.eventId,
    eventLabel: result.eventLabel,
    sex: result.sex,
    sexLabel: result.sexLabel,
    session: result.session || "",
    startTime: result.startTime || "",
    finalistCount,
    finalists: result.finalists || { a: [], b: [] },
    nextUnqualified: result.nextUnqualified || [],
    requiresVideo: false,
    videoStatus: "none",
    speakerStatus: "pending",
    informaticsStatus: "none",
    createdAt: now,
    updatedAt: now
  };
  alerts.unshift(alert);
  saveAlerts();
  await syncAlertToFirestore(alert);
  return alert;
}

async function stampFinalistsAnnouncement(result, announcedAt) {
  if (!result?.id || !announcedAt) return false;
  const collection = resultsCollection();
  if (!collection) return false;
  await collection.doc(result.id).set({
    finalistsAnnouncedAt: announcedAt,
    status: "published",
    updatedAt: announcedAt
  }, { merge: true });
  const index = raceResults.findIndex((item) => item.id === result.id);
  if (index !== -1) {
    raceResults[index] = {
      ...raceResults[index],
      finalistsAnnouncedAt: announcedAt,
      status: "published",
      updatedAt: announcedAt
    };
  }
  await publishPublicResultsIndex({ silent: true });
  return true;
}

async function ensurePendingFinalistsSpeakerAlerts() {
  if (finalistAlertRepairRunning) return;
  finalistAlertRepairRunning = true;
  try {
    for (const result of raceResults.filter((item) => item.hasFinal && finalRowsCount(item.finalists) > 0 && !item.finalistsAnnouncedAt)) {
      const relatedAlerts = alerts.filter((alert) => alert.type === "finalists_announcement" && alert.resultId === result.id);
      const announcedAlert = relatedAlerts.find((alert) => alert.speakerStatus === "done" && alert.speakerAnnouncedAt);
      if (announcedAlert) {
        await stampFinalistsAnnouncement(result, announcedAlert.speakerAnnouncedAt);
        const now = new Date().toISOString();
        for (const pendingAlert of relatedAlerts.filter((alert) => alert.speakerStatus === "pending")) {
          pendingAlert.speakerStatus = "none";
          pendingAlert.cancelledAt = pendingAlert.cancelledAt || now;
          pendingAlert.updatedAt = now;
          await syncAlertToFirestore(pendingAlert);
        }
        continue;
      }
      if (relatedAlerts.some((alert) => alert.speakerStatus === "pending")) continue;
      await createFinalistsSpeakerAlert(result);
    }
    saveAlerts();
    render();
  } finally {
    finalistAlertRepairRunning = false;
  }
}

function replacementAlertMatches(alert, result, row) {
  if (alert.type !== "finalist_replacement_announcement") return false;
  if (alert.resultId !== result.id) return false;
  if (alert.replacementRowKey && finalRowKey(row) === alert.replacementRowKey) return true;
  const sameName = String(alert.replacementName || "") === finalistRowName(row);
  const sameRank = !alert.replacementRank || String(alert.replacementRank || "") === String(row.rank || "");
  const sameTime = !alert.replacementTime || String(alert.replacementTime || "") === String(row.time || "");
  return sameName && sameRank && (sameTime || alert.speakerStatus === "done");
}

function replacementAlertKey(alert) {
  return [
    alert.resultId || "",
    alert.replacementRowKey || "",
    alert.replacementRank || "",
    String(alert.replacementName || "").toLocaleUpperCase("fr-FR"),
    alert.replacementTime || ""
  ].join("|");
}

async function dedupePendingReplacementAlerts() {
  const pending = alerts
    .filter((alert) => alert.type === "finalist_replacement_announcement" && alert.speakerStatus === "pending")
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  const seen = new Set();
  let changed = false;
  const now = new Date().toISOString();
  for (const alert of pending) {
    const key = replacementAlertKey(alert);
    if (!key || !seen.has(key)) {
      seen.add(key);
      continue;
    }
    alert.speakerStatus = "none";
    alert.cancelledAt = alert.cancelledAt || now;
    alert.updatedAt = now;
    changed = true;
    await syncAlertToFirestore(alert);
  }
  if (changed) saveAlerts();
}

async function ensurePendingReplacementSpeakerAlerts() {
  if (replacementAlertRepairRunning) return;
  await dedupePendingReplacementAlerts();
  const missing = [];
  for (const result of raceResults) {
    for (const finalKey of ["a", "b"]) {
      for (const row of (result.finalists?.[finalKey] || [])) {
        if (!row.repechaged || row.repechageAnnouncedAt || row.withdrawnAt) continue;
        const matchingAlerts = alerts.filter((alert) => replacementAlertMatches(alert, result, row));
        const announcedAlert = matchingAlerts.find((alert) => alert.speakerStatus === "done" && alert.speakerAnnouncedAt);
        if (announcedAlert) {
          await stampReplacementAnnouncement(result, row, announcedAlert.speakerAnnouncedAt);
          const now = new Date().toISOString();
          for (const pendingAlert of matchingAlerts.filter((alert) => alert.speakerStatus === "pending")) {
            pendingAlert.speakerStatus = "none";
            pendingAlert.cancelledAt = pendingAlert.cancelledAt || now;
            pendingAlert.updatedAt = now;
            await syncAlertToFirestore(pendingAlert);
          }
          continue;
        }
        const existing = matchingAlerts.find((alert) => alert.speakerStatus === "pending");
        if (!existing || existing.speakerStatus !== "pending") {
          missing.push({ result, row });
        }
      }
    }
  }
  if (!missing.length) return;
  replacementAlertRepairRunning = true;
  try {
    for (const item of missing) {
      const withdrawn = {
        displayName: item.row.replacesName || item.row.withdrawnName || "un finaliste",
        name: item.row.replacesName || item.row.withdrawnName || "un finaliste"
      };
      await createFinalistReplacementSpeakerAlert(item.result, withdrawn, item.row);
    }
    saveAlerts();
    render();
  } finally {
    replacementAlertRepairRunning = false;
  }
}

async function publishFinalistsAfterSpeaker(alertId) {
  const alert = alerts.find((item) => item.id === alertId);
  const now = new Date().toISOString();
  const changes = { speakerStatus: "done", speakerAnnouncedAt: now, updatedAt: now };
  await syncAlertChangesToFirestoreStrict(alertId, changes);
  markSpeakerAlertDoneLocally(alertId, now);
  if (!alert?.resultId) {
    return;
  }
  const collection = resultsCollection();
  if (!collection) {
    const error = new Error("Firebase n'est pas disponible pour publier les finalistes.");
    throw markAlertAlreadyClosedError(error);
  }
  const resultRef = collection.doc(alert.resultId);
  try {
    await resultRef.update({
      finalistsAnnouncedAt: now,
      status: "published",
      updatedAt: now
    });
  } catch (error) {
    if (/not.?found|no document|missing/i.test(String(error?.message || error))) {
      await deleteFinalResultAlerts(alert.resultId);
      return;
    }
    throw markAlertAlreadyClosedError(error);
  }
  try {
    const resultSnapshot = await resultRef.get({ source: "server" });
    const updatedResult = resultSnapshot.exists
      ? resultWithoutPdf({ id: resultSnapshot.id, ...resultSnapshot.data() })
      : null;
    const index = raceResults.findIndex((result) => result.id === alert.resultId);
    if (updatedResult) {
      raceResults = [
        updatedResult,
        ...raceResults.filter((result) => result.id !== alert.resultId)
      ].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
    } else if (index !== -1) {
      raceResults[index] = {
        ...raceResults[index],
        finalistsAnnouncedAt: now,
        status: "published",
        updatedAt: now
      };
    }
    await publishPublicResultsIndex({ strict: true });
  } catch (error) {
    throw markAlertAlreadyClosedError(error);
  }
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

async function deleteResultPdf(resultId) {
  const collection = resultsCollection();
  if (!collection) throw new Error("Firebase n'est pas disponible pour supprimer ce résultat.");
  await deleteFinalResultAlerts(resultId);
  await deleteResultPdfPayload(resultId);
  await collection.doc(resultId).delete();
  raceResults = raceResults.filter((result) => result.id !== resultId);
  await publishPublicResultsIndex();
}

async function clearPublishedResults() {
  const collection = resultsCollection();
  if (!collection) throw new Error("Firebase n'est pas disponible pour effacer les résultats publics.");
  const snapshot = await collection.get();
  const docs = snapshot.docs || [];
  const rowsToArchive = raceResults.length ? raceResults.map(resultWithoutPdf) : docs.map((doc) => resultWithoutPdf({ id: doc.id, ...doc.data() }));
  if (rowsToArchive.length) {
    await archiveCurrentResults("Avant remise à zéro des résultats publics", rowsToArchive);
  }
  for (const result of rowsToArchive) {
    await deleteFinalResultAlerts(result.id);
  }
  await Promise.all(docs.map((doc) => Promise.all([doc.ref.delete(), deleteResultPdfPayload(doc.id)])));
  await clearPublicSessionResultsPdfs();
  raceResults = [];
  await publishPublicResultsIndex();
  renderResultsAdminPanel();
  return docs.length;
}

async function clearPublishedResultsForSession(session) {
  const cleanSession = String(session || "").trim();
  if (!cleanSession) throw new Error("Aucune session sélectionnée.");
  const collection = resultsCollection();
  if (!collection) throw new Error("Firebase n'est pas disponible pour effacer les résultats publics.");
  const snapshot = await collection.get();
  const docs = snapshot.docs || [];
  const rows = docs.map((doc) => resultWithoutPdf({ id: doc.id, ...doc.data() }));
  const rowsToDelete = typeof livePalmesAdminMaintenance.splitRowsForSession === "function"
    ? livePalmesAdminMaintenance.splitRowsForSession(rows, cleanSession)
    : rows.filter((row) => String(row.session || "") === cleanSession);
  if (rowsToDelete.length) {
    await archiveCurrentResults(`Avant remise à zéro des résultats publics S${cleanSession}`, rowsToDelete);
  }
  for (const result of rowsToDelete) {
    await deleteFinalResultAlerts(result.id);
  }
  const idsToDelete = new Set(rowsToDelete.map((row) => row.id));
  await Promise.all(docs.filter((doc) => idsToDelete.has(doc.id)).map((doc) => Promise.all([doc.ref.delete(), deleteResultPdfPayload(doc.id)])));
  const clearedSessionPdfs = await clearPublicSessionResultsPdfsForSession(cleanSession);
  raceResults = raceResults.filter((result) => String(result.session || "") !== cleanSession);
  await publishPublicResultsIndex();
  renderResultsAdminPanel();
  return {
    results: rowsToDelete.length,
    sessionPdfs: clearedSessionPdfs
  };
}

async function resetSeriesForNextCompetition() {
  if (competitionModeEnabled()) {
    window.alert("RAZ séries indisponible quand l'actualisation directe est active.");
    return;
  }
  const clearedSeriesPdfs = await clearPublicSeriesPdfs();
  const clearedResults = await clearPublishedResults();
  const nextData = normalizeData(livePalmesAdminMaintenance.buildResetSeriesData
    ? livePalmesAdminMaintenance.buildResetSeriesData(data, { appendImportHistory })
    : {
      ...data,
      meet: {},
      events: [],
      entrants: [],
      series: [],
      program: [],
      sourceVersion: `series-reset-${Date.now()}`,
      notes: {
        ...(data.notes || {}),
        sourceMode: "empty",
        sourceLabel: "Aucune série chargée",
        sourceFile: "",
        seriesLineCount: 0,
        entrantCount: 0,
        programCount: 0,
        lastImportedMode: "",
        lastImportedSessions: "",
        lastUpdatedSession: "",
        lastUpdatedSessionAt: "",
        publicSeriesPdfs: [],
        generatedAt: new Date().toLocaleString("fr-FR"),
        importHistory: appendImportHistory(data.notes || {}, "RAZ séries")
      }
    });
  data = nextData;
  if (typeof livePalmesAdminMaintenance.resetSeriesViewState === "function") {
    livePalmesAdminMaintenance.resetSeriesViewState(state);
  } else {
    state.eventId = "";
    state.sex = "F";
    state.series = "1";
    state.session = "1";
    state.programKey = "";
    state.category = "all";
    state.selectedSwimmerId = "";
    state.selectedRecordKey = "";
  }
  resultsAdminSession = "";
  saveData();
  render();
  await publishLiveDataToFirestore(nextData, "RAZ séries");
  await publishPublicResultsIndex({ silent: true });
  window.alert(`RAZ séries effectuée : programme, séries et engagés vidés. ${clearedSeriesPdfs} PDF séries public${clearedSeriesPdfs > 1 ? "s" : ""} supprimé${clearedSeriesPdfs > 1 ? "s" : ""}. ${clearedResults} résultat${clearedResults > 1 ? "s" : ""} public${clearedResults > 1 ? "s" : ""} archivé${clearedResults > 1 ? "s" : ""} puis supprimé${clearedResults > 1 ? "s" : ""}.`);
}

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

function speakerInfoOptions() {
  return {
    data,
    eventSignature,
    fixPdfEncoding,
    formatPersonNameParts,
    importedEventId,
    importedSeriesTime,
    normalizeClubMatch,
    normalizePdfLabel,
    normalizePersonName,
    sameCategory,
    seedSourceLookupKeys,
    shouldKeepRecord,
    speakerSheetId: SPEAKER_SHEET_ID,
    timeToMs
  };
}

function fetchSpeakerSheetRows(sheetName) { return livePalmesSpeakerInfo.fetchSpeakerSheetRows(sheetName, speakerInfoOptions()); }

function parseTopSheet(rows) { return livePalmesSpeakerInfo.parseTopSheet(rows, speakerInfoOptions()); }

function parseRecordsSheet(rows) { return livePalmesSpeakerInfo.parseRecordsSheet(rows, speakerInfoOptions()); }

function parseEdfSheet(rows) { return livePalmesSpeakerInfo.parseEdfSheet(rows, speakerInfoOptions()); }

function parseCompetitionStatsSheet(rows) { return livePalmesSpeakerInfo.parseCompetitionStatsSheet(rows, speakerInfoOptions()); }

function parseInternationalSheet(rows) { return livePalmesSpeakerInfo.parseInternationalSheet(rows, speakerInfoOptions()); }

function parseQualificationsSheet(rows) { return livePalmesSpeakerInfo.parseQualificationsSheet(rows, speakerInfoOptions()); }

function parseClubSheet(rows) { return livePalmesSpeakerInfo.parseClubSheet(rows, speakerInfoOptions()); }

function parseSwimmerInfosSheet(rows) { return livePalmesSpeakerInfo.parseSwimmerInfosSheet(rows, speakerInfoOptions()); }

function parseSeedSourceSheet(rows) { return livePalmesSpeakerInfo.parseSeedSourceSheet(rows, speakerInfoOptions()); }

function sheetSex(value) { return livePalmesSpeakerInfo.sheetSex(value, speakerInfoOptions()); }

function seedSourceTimeKey(value) { return livePalmesSpeakerInfo.seedSourceTimeKey(value, speakerInfoOptions()); }

function applySpeakerInfoToEntrants(entrants, seedSources, clubs) { return livePalmesSpeakerInfo.applySpeakerInfoToEntrants(entrants, seedSources, clubs, speakerInfoOptions()); }

async function updateSpeakerInfoFromGoogleSheet() {
  const buttons = [
    document.querySelector("#updateSpeakerInfoBtn"),
    document.querySelector("#updateSpeakerInfoPanelBtn")
  ].filter(Boolean);
  const setButtons = (disabled, label) => {
    buttons.forEach((button) => {
      button.disabled = disabled;
      button.textContent = label;
    });
  };
  setButtons(true, "Mise à jour...");
  renderDataStatus("Mise à jour des infos speaker depuis Google Sheets...");
  try {
    const [
      franceRows,
      recordRows,
      edfRows,
      internationalRows,
      qualificationRows,
      clubRows,
      seedRows,
      competitionStatRows,
      swimmerInfoRows
    ] = await Promise.all([
      fetchSpeakerSheetRows(SPEAKER_INFO_SHEETS.france),
      fetchSpeakerSheetRows(SPEAKER_INFO_SHEETS.records),
      fetchSpeakerSheetRows(SPEAKER_INFO_SHEETS.edf),
      fetchSpeakerSheetRows(SPEAKER_INFO_SHEETS.international),
      fetchSpeakerSheetRows(SPEAKER_INFO_SHEETS.qualifications),
      fetchSpeakerSheetRows(SPEAKER_INFO_SHEETS.clubs),
      fetchSpeakerSheetRows(SPEAKER_INFO_SHEETS.seedSources),
      fetchSpeakerSheetRows(SPEAKER_INFO_SHEETS.competitionStats),
      fetchSpeakerSheetRows(SPEAKER_INFO_SHEETS.swimmerInfos).catch(() => [])
    ]);
    const clubs = parseClubSheet(clubRows);
    const seedSources = parseSeedSourceSheet(seedRows);
    const entrantsWithSpeakerInfo = applySpeakerInfoToEntrants(data.entrants || [], seedSources, clubs);
    const attachedSeedSources = entrantsWithSpeakerInfo.filter((entrant) => entrant.seedSource).length;
    const nextData = normalizeData({
      ...data,
      top2025: parseTopSheet(franceRows),
      records: parseRecordsSheet(recordRows),
      edfMembers: parseEdfSheet(edfRows),
      internationalMedals: parseInternationalSheet(internationalRows),
      competitionStats: parseCompetitionStatsSheet(competitionStatRows),
      swimmerInfos: parseSwimmerInfosSheet(swimmerInfoRows),
      qualifications: parseQualificationsSheet(qualificationRows),
      entrants: entrantsWithSpeakerInfo,
      sourceVersion: `speaker-info-${Date.now()}`,
      notes: {
        ...(data.notes || {}),
        sourceMode: data.notes?.sourceMode || "series-live",
        speakerInfoSource: "Google Sheets",
        speakerInfoUpdatedAt: new Date().toLocaleString("fr-FR"),
        importHistory: appendImportHistory(data.notes || {}, "infos speaker Google Sheet")
      }
    });
    applyFreshData(nextData, false);
    await publishLiveDataToFirestore(nextData, "Infos speaker Google Sheets");
    window.alert(`Infos speaker mises à jour : ${nextData.top2025.length} lignes France N-1, ${nextData.records.length} records, ${nextData.qualifications.length} qualifs, ${nextData.edfMembers.length} membres EDF, ${nextData.internationalMedals.length} repères internationaux, ${nextData.competitionStats.length} stats compétition, ${nextData.swimmerInfos.length} infos nageurs, ${attachedSeedSources} lieux rattachés aux engagés (${seedSources.size} repères trouvés).`);
  } catch (error) {
    console.error(error);
    renderDataStatus(`Impossible de lire le Google Sheet : ${error?.message || error}`);
    window.alert(`Mise à jour impossible : ${error?.message || error}. Vérifie que le Google Sheet est partagé en lecture avec le lien.`);
  } finally {
    setButtons(false, "MAJ repères");
  }
}

function downloadJson() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "donnees-speaker-france-2026.json";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function dsqReportRows() {
  return alerts
    .filter((alert) => alert.roleSource === "referee" || alert.originalAlertId || isRequalificationAlert(alert))
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

function buildDsqReportHtml() {
  return buildDsqReportHtmlFromRows(dsqReportRows(), "Journal d'arbitrage");
}

function buildDsqReportHtmlFromRows(rows, title = "Journal d'arbitrage", options = {}) {
  return livePalmesAdminArchives.buildDsqReportHtmlFromRows(rows, title, {
    ...options,
    data,
    helpers: {
      alertClubShortLabel,
      alertStatusLabel,
      alertTimelineItems,
      decisionMotifLabel,
      finalStageLabel,
      formatAlertDateTime,
      isFinalStage
    }
  });
}

function printDsqRows(rows, title = "Journal d'arbitrage") {
  const reportWindow = window.open("", "_blank");
  if (!reportWindow) {
    window.alert("La fenêtre PDF a été bloquée par le navigateur.");
    return;
  }
  reportWindow.document.open();
  reportWindow.document.write(buildDsqReportHtmlFromRows(rows, title));
  reportWindow.document.close();
  reportWindow.focus();
  setTimeout(() => reportWindow.print(), 250);
}

function openDsqRows(rows, title = "Journal d'arbitrage") {
  const reportWindow = window.open("", "_blank");
  if (!reportWindow) {
    window.alert("La fenêtre d'archive a été bloquée par le navigateur.");
    return;
  }
  reportWindow.document.open();
  reportWindow.document.write(buildDsqReportHtmlFromRows(rows, title, { includePrint: false }));
  reportWindow.document.close();
  reportWindow.focus();
}

function buildResultArchiveHtmlFromRows(rows, archive = {}, options = {}) {
  return livePalmesAdminArchives.buildResultArchiveHtmlFromRows(rows, archive, {
    ...options,
    meet: data.meet,
    helpers: {
      finalRowsCount,
      formatAlertDateTime,
      sexDisplayLabel
    }
  });
}

function printResultArchiveRows(rows, archive = {}) {
  const reportWindow = window.open("", "_blank");
  if (!reportWindow) {
    window.alert("La fenêtre PDF a été bloquée par le navigateur.");
    return;
  }
  reportWindow.document.open();
  reportWindow.document.write(buildResultArchiveHtmlFromRows(rows, archive));
  reportWindow.document.close();
  reportWindow.focus();
  setTimeout(() => reportWindow.print(), 250);
}

function openResultArchiveRows(rows, archive = {}) {
  const reportWindow = window.open("", "_blank");
  if (!reportWindow) {
    window.alert("La fenêtre d'archive a été bloquée par le navigateur.");
    return;
  }
  reportWindow.document.open();
  reportWindow.document.write(buildResultArchiveHtmlFromRows(rows, archive, { includePrint: false }));
  reportWindow.document.close();
  reportWindow.focus();
}

async function exportDsqPdf() {
  try {
    await archiveCurrentHistory();
  } catch (error) {
    const ok = window.confirm(`Impossible d'archiver le journal avant export. Continuer quand même l'export PDF ?`);
    if (!ok) return;
  }
  printDsqRows(dsqReportRows(), "Journal d'arbitrage");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

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

function normalizePdfLabel(value) {
  if (typeof livePalmesPdfImport.normalizePdfLabel === "function") {
    return livePalmesPdfImport.normalizePdfLabel(value);
  }
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").toLowerCase();
}

function fixPdfEncoding(value) {
  if (typeof livePalmesPdfImport.fixPdfEncoding === "function") {
    return livePalmesPdfImport.fixPdfEncoding(value);
  }
  return String(value || "");
}

function importedEventId(label) {
  if (typeof livePalmesPdfImport.importedEventId === "function") {
    return livePalmesPdfImport.importedEventId(label, { events: data.events || [] });
  }
  const normalized = normalizePdfLabel(label);
  const event = data.events.find((item) => normalizePdfLabel(item.label) === normalized);
  return event?.id || "";
}

function importedEventInfo(eventId, fallbackLabel = "") {
  if (typeof livePalmesPdfImport.importedEventInfo === "function") {
    return livePalmesPdfImport.importedEventInfo(eventId, fallbackLabel, { events: data.events || [] });
  }
  return data.events.find((event) => event.id === eventId) || { id: eventId, label: fallbackLabel || eventId };
}

function importedCategoryLabel(code) {
  if (typeof livePalmesPdfImport.importedCategoryLabel === "function") {
    return livePalmesPdfImport.importedCategoryLabel(code);
  }
  return String(code || "").toUpperCase();
}

function importedBirthYear(twoDigits) {
  if (typeof livePalmesPdfImport.importedBirthYear === "function") {
    return livePalmesPdfImport.importedBirthYear(twoDigits);
  }
  return String(twoDigits || "");
}

function normalizePdfUppercaseEToken(token) {
  if (typeof livePalmesPdfImport.normalizePdfUppercaseEToken === "function") {
    return livePalmesPdfImport.normalizePdfUppercaseEToken(token);
  }
  return String(token || "");
}

function splitImportedPersonName(value) {
  if (typeof livePalmesPdfImport.splitImportedPersonName === "function") {
    return livePalmesPdfImport.splitImportedPersonName(value);
  }
  return { lastName: String(value || "").trim(), firstName: "" };
}

function isImportedRelayEvent(eventId) {
  if (typeof livePalmesPdfImport.isImportedRelayEvent === "function") {
    return livePalmesPdfImport.isImportedRelayEvent(eventId);
  }
  return String(eventId || "").includes("x");
}

function seriesImportOptions() {
  return {
    availableSexesForEvent,
    data,
    eventSignature,
    fixPdfEncoding,
    formatName,
    importedBirthYear,
    importedCategoryLabel,
    importedEventId,
    importedEventInfo,
    importedSeriesTime,
    isImportedRelayEvent,
    normalizePdfLabel,
    normalizePersonName,
    sampleData,
    seedSourceTimeKey,
    splitImportedPersonName
  };
}

async function extractPdfLines(file) { return livePalmesSeriesImport.extractPdfLines(file, seriesImportOptions()); }

function parseImportedSeriesLines(lines, fileName = "s?ries import?es.pdf") { return livePalmesSeriesImport.parseImportedSeriesLines(lines, fileName, seriesImportOptions()); }

function showPdfImportDebug(parsed, lines) { return livePalmesSeriesImport.showPdfImportDebug(parsed, lines, seriesImportOptions()); }

function prepareImportedSeriesForMode(parsed, mode, forcedSession) { return livePalmesSeriesImport.prepareImportedSeriesForMode(parsed, mode, forcedSession, seriesImportOptions()); }

function seedSourceLookupKeys(row) { return livePalmesSeriesImport.seedSourceLookupKeys(row, seriesImportOptions()); }

function inheritImportedSeedSources(parsed) { return livePalmesSeriesImport.inheritImportedSeedSources(parsed, seriesImportOptions()); }

function mergeImportedSeriesData(parsed, mode = "session") { return livePalmesSeriesImport.mergeImportedSeriesData(parsed, mode, seriesImportOptions()); }

async function importSeriesPdf(file, mode = "session", forcedSession = "") {
  if (!file) return;
  renderDataStatus("Lecture du PDF des séries...");
  try {
    const lines = await extractPdfLines(file);
    const parsedRaw = parseImportedSeriesLines(lines, file.name);
    const parsed = inheritImportedSeedSources(prepareImportedSeriesForMode(parsedRaw, mode, forcedSession));
    if (!parsed.series.length || !parsed.program.length) {
      showPdfImportDebug(parsed, lines);
      renderDataStatus();
      return;
    }
    if (parsed.series.length < 50) {
      const ok = window.confirm(`Je n'ai reconnu que ${parsed.series.length} lignes pour ${parsed.program.length} courses. Ce résultat semble incomplet. Publier quand même ?`);
      if (!ok) {
        renderDataStatus("Import annulé : le PDF n'a pas été reconnu complètement.");
        return;
      }
    }
    const mergedSeriesData = mergeImportedSeriesData(parsed, mode);
    const importedSessions = [...new Set(parsed.program.map((row) => row.session).filter(Boolean))]
      .sort((a, b) => Number(a) - Number(b));
    const updatedSession = mode === "full" ? "" : (forcedSession || importedSessions[0] || "");
    let clearedResultsCount = 0;
    let clearedAlertsCount = 0;
    let archivedHistoryCount = 0;
    let publishedSeriesPdf = null;
    let clearResults = false;
    if (mode === "full") {
      const hasActiveHistory = alerts.length > 0;
      const hasPublishedResults = raceResults.length > 0;
      const confirmFullImport = window.confirm([
        "Tu importes un PDF général de compétition.",
        "",
        "LivePalmes va remplacer tout le programme de la compétition.",
        hasActiveHistory
          ? `Le journal actif sera archivé puis les ${alerts.length} alerte${alerts.length > 1 ? "s" : ""} active${alerts.length > 1 ? "s" : ""} seront supprimées.`
          : "Aucune alerte active à supprimer.",
        hasPublishedResults
          ? `Il y a ${raceResults.length} résultat${raceResults.length > 1 ? "s" : ""} public${raceResults.length > 1 ? "s" : ""} déjà publié${raceResults.length > 1 ? "s" : ""}.`
          : "Aucun résultat public déjà publié.",
        "",
        "Continuer l'import du PDF général ?"
      ].join("\n"));
      if (!confirmFullImport) {
        renderDataStatus("Import PDF général annulé.");
        return;
      }
      if (hasPublishedResults) {
        clearResults = window.confirm([
          "Résultats publics existants",
          "",
          "Veux-tu les archiver puis les supprimer de la page publique ?",
          "Oui : conseillé si tu changes de compétition.",
          "Non : les résultats restent visibles."
        ].join("\n"));
      }
      if (hasActiveHistory) {
        renderDataStatus("Archivage du journal et remise à zéro des alertes...");
        try {
          const historyReset = await clearHistoryAndAlertsForFullImport();
          clearedAlertsCount = historyReset.clearedAlerts;
          archivedHistoryCount = historyReset.archivedCount;
          renderDataStatus("Journal archivé et alertes remises à zéro.");
        } catch (error) {
          console.warn("Archivage/nettoyage du journal refusé par Firebase", error);
          renderDataStatus("Import annulé : Firebase a refusé l'archivage du journal.");
          window.alert([
            "Import annulé par sécurité.",
            "",
            "Le PDF est bien reconnu, mais Firebase a refusé l'archivage du journal ou la suppression des anciennes alertes.",
            "Il faut publier les dernières règles Firestore depuis le fichier firestore.rules, puis relancer l'import."
          ].join("\n"));
          return;
        }
      }
      if (clearResults) {
        renderDataStatus("Suppression des anciens résultats publics...");
        try {
          clearedResultsCount = await clearPublishedResults();
          renderDataStatus("Anciens résultats publics supprimés.");
        } catch (error) {
          console.warn("Archivage/nettoyage des résultats refusé par Firebase", error);
          renderDataStatus("Import annulé : Firebase a refusé l'archivage des résultats.");
          window.alert([
            "Import annulé par sécurité.",
            "",
            "Le PDF est bien reconnu, mais Firebase a refusé l'archivage ou la suppression des anciens résultats publics.",
            "Il faut publier les dernières règles Firestore depuis le fichier firestore.rules, puis relancer l'import."
          ].join("\n"));
          return;
        }
      }
    }
    const importHistoryLabel = mode === "full"
      ? `PDF général ${file.name}`
      : `mise à jour S${updatedSession || "?"} ${file.name}`;
    const nextData = normalizeData({
      ...data,
      meet: parsed.meet || data.meet,
      events: mergedSeriesData.events,
      entrants: mergedSeriesData.entrants,
      series: mergedSeriesData.series,
      program: mergedSeriesData.program,
      sourceVersion: `live-${Date.now()}`,
      notes: {
        ...(data.notes || {}),
        sourceMode: "series-live",
        sourceLabel: mode === "full" ? "PDF général importé depuis LivePalmes" : "Session mise à jour depuis LivePalmes",
        sourceFile: parsed.sourceFile,
        seriesLineCount: mergedSeriesData.series.length,
        entrantCount: mergedSeriesData.entrants.length,
        programCount: mergedSeriesData.program.length,
        lastImportedMode: mode === "full" ? "PDF général" : "Mise à jour session",
        lastImportedSessions: importedSessions.join(", "),
        lastUpdatedSession: updatedSession,
        lastUpdatedSessionAt: updatedSession ? new Date().toISOString() : "",
        importHistory: appendImportHistory(data.notes || {}, importHistoryLabel),
        generatedAt: new Date().toLocaleString("fr-FR")
      }
    });
    applyFreshData(nextData, true);
    try {
      if (mode === "full") {
        await clearPublicSeriesPdfs();
      }
      publishedSeriesPdf = await publishPublicSeriesPdf(file, mode, updatedSession);
      await publishLiveDataToFirestore(data, `Import PDF ${file.name}`);
      await publishPublicResultsIndex({ silent: true });
      const sessionList = [...new Set(parsed.program.map((row) => row.session).filter(Boolean))]
        .sort((a, b) => Number(a) - Number(b))
        .map((session) => `S${session}`)
        .join(", ");
      const sessionText = sessionList ? ` Sessions détectées : ${sessionList}.` : "";
      const clearedText = clearedResultsCount ? ` ${clearedResultsCount} résultat${clearedResultsCount > 1 ? "s" : ""} public${clearedResultsCount > 1 ? "s" : ""} supprimé${clearedResultsCount > 1 ? "s" : ""}.` : "";
      const historyText = clearedAlertsCount
        ? ` Journal archivé (${archivedHistoryCount} ligne${archivedHistoryCount > 1 ? "s" : ""}) et ${clearedAlertsCount} alerte${clearedAlertsCount > 1 ? "s" : ""} supprimée${clearedAlertsCount > 1 ? "s" : ""}.`
        : "";
      const publicPdfText = publishedSeriesPdf ? ` PDF public des séries mis à jour.` : "";
      window.alert(`${mode === "full" ? "PDF général publié" : "Session publiée"} : ${parsed.program.length} courses, ${parsed.series.length} lignes.${sessionText}${clearedText}${historyText}${publicPdfText}`);
    } catch {
      window.alert(`Séries chargées sur cet appareil (${parsed.program.length} courses, ${parsed.series.length} lignes), mais Firebase n'a pas accepté la publication. Il faut élargir les règles Firestore pour liveData.`);
    }
  } catch (error) {
    console.error(error);
    const message = String(error?.message || error);
    const isPermissionError = /permission|insufficient/i.test(message);
    window.alert(isPermissionError
      ? [
        "Import impossible : Firebase a refusé l'opération.",
        "",
        "Le problème vient probablement des règles Firestore, pas du PDF.",
        "Publie le contenu du fichier firestore.rules dans Firebase > Firestore Database > Règles, puis réessaie."
      ].join("\n")
      : `Import impossible pour ce PDF : ${message}. On gardera la méthode actuelle si ce format n'est pas reconnu.`);
    renderDataStatus();
  }
}

async function fetchGeneratedData() {
  try {
    const response = await fetch(`donnees-speaker-france-2026.json?v=${Date.now()}`);
    if (response.ok) {
      const freshData = normalizeData(await response.json());
      if (freshData.sourceVersion) {
        renderDataStatus();
      }
      return freshData;
    }
  } catch {
    if (!data.sourceVersion) {
      renderDataStatus("Impossible de charger donnees-speaker-france-2026.json. Vérifie que le fichier est publié au même niveau que index.html.");
    }
    return null;
  }
  return null;
}

function applyFreshData(freshData, resetView = false) {
  data = normalizeData(freshData || sampleData);
  if (resetView) {
    const currentRole = state.role;
    roleStates = defaultRoleStates();
    state = cloneRoleState(roleStates[currentRole] || roleStates.speaker);
    state.role = currentRole;
    if (!isSpeakerView()) {
      state.series = firstSeriesSelectionForCurrentRace();
    }
  } else {
    if (!data.events.some((event) => event.id === state.eventId)) {
      state.eventId = data.events[0]?.id || "";
      state.programKey = "";
    }
    state.selectedSwimmerId = "";
  }
  saveData();
  render();
}

async function checkForGeneratedUpdates() {
  if (data.notes?.sourceMode === "series-live") {
    renderDataStatus();
    return;
  }
  const freshData = await fetchGeneratedData();
  if (!freshData?.sourceVersion) return;
  if (freshData.sourceVersion === data.sourceVersion) {
    renderDataStatus();
    return;
  }
  applyFreshData(freshData, false);
}

roleLockBtn?.addEventListener("click", toggleRoleLock);
dataDiagnosticBtn?.addEventListener("click", () => {
  showDataDiagnostic().catch((error) => {
    console.error(error);
    window.alert(`Diagnostic impossible : ${error?.message || error}`);
  });
});
setInterval(checkForGeneratedUpdates, 5000);
setInterval(heartbeatRoleLock, LOCK_HEARTBEAT_MS);
setInterval(checkFirebaseConnection, FIREBASE_CONNECTION_CHECK_MS);
setInterval(disableCompetitionModeAfterInactivity, COMPETITION_INACTIVITY_CHECK_MS);
setInterval(updateConsolePresence, PRESENCE_HEARTBEAT_MS);
setInterval(() => {
  if (profileHomeActive) refreshPresenceCounts();
}, PRESENCE_HEARTBEAT_MS);
["click", "keydown", "touchstart", "pointerdown"].forEach((eventName) => {
  window.addEventListener(eventName, markConsoleActivity, { passive: true });
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    returnHomeAfterLocalInactivity();
  }
});
window.addEventListener("online", checkFirebaseConnection);
window.addEventListener("offline", () => {
  firebaseStatus = "offline";
  renderDataStatus();
});
window.addEventListener("resize", updateStickyAlertOffset);
window.addEventListener("pagehide", () => {
  saveCurrentRoleState();
  releaseRoleLock();
  releaseConsolePresence();
});

jsonInput?.addEventListener("change", async () => {
  const file = jsonInput.files[0];
  if (!file) return;
  const text = await file.text();
  data = normalizeData(JSON.parse(text));
  state.eventId = data.events[0]?.id || sampleData.events[0].id;
  state.series = "all";
  saveData();
  render();
  jsonInput.value = "";
});

document.querySelector("#importCsvBtn")?.addEventListener("click", () => {
  const imported = parseCsv(csvInput.value);
  if (!imported.length) return;
  data.entrants = data.entrants.concat(imported);
  csvInput.value = "";
  saveData();
  render();
});

render();
initFirebaseSync();
checkForGeneratedUpdates();
checkFirebaseConnection();
updateConsolePresence(true);
if (profileHomeActive) refreshPresenceCounts();

