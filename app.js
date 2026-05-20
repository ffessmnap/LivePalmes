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

let data = loadData();
let unlockedRoles = loadUnlockedRoles();
function createRoleState(role = "speaker") {
  const initial = initialProgramPosition();
  return {
  eventId: initial.eventId || data.events[0]?.id || "",
  sex: initial.sex || "F",
  search: "",
  category: "all",
  series: initial.series || "all",
  session: initial.session || "all",
  programKey: initial.programKey || "",
  lineOrder: "asc",
  selectedSwimmerId: "",
  selectedRecordKey: "",
  liveMode: true,
    role
  };
}

function cloneRoleState(nextState) {
  return { ...nextState, search: "", selectedSwimmerId: "", selectedRecordKey: "" };
}

function defaultRoleStates() {
  return {
    speaker: createRoleState("speaker"),
    live: createRoleState("live"),
    referee: createRoleState("referee"),
    video: createRoleState("video"),
    computer: createRoleState("computer"),
    secretary: createRoleState("secretary")
  };
}

function normalizeRoleState(role, savedState, fallbackState) {
  const nextState = cloneRoleState({ ...fallbackState, ...(savedState || {}), role });
  if (nextState.eventId && !data.events.some((event) => event.id === nextState.eventId)) {
    return cloneRoleState(fallbackState);
  }
  return nextState;
}

function loadRoleStates() {
  const defaults = defaultRoleStates();
  const saved = localStorage.getItem(ROLE_STATES_KEY);
  if (!saved) return defaults;
  try {
    const parsed = JSON.parse(saved);
    return Object.fromEntries(Object.keys(defaults).map((role) => [
      role,
      normalizeRoleState(role, parsed?.[role], defaults[role])
    ]));
  } catch {
    return defaults;
  }
}

function saveRoleStates() {
  localStorage.setItem(ROLE_STATES_KEY, JSON.stringify(roleStates));
}

function loadUnlockedRoles() {
  const saved = localStorage.getItem(UNLOCKED_ROLES_KEY);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveUnlockedRoles() {
  localStorage.setItem(UNLOCKED_ROLES_KEY, JSON.stringify(unlockedRoles));
}

function pinLockEnabled() {
  return data.notes?.pinLockEnabled === true;
}

function competitionModeEnabled() {
  return data.notes?.competitionMode === true;
}

function publicPositionEnabled() {
  return data.notes?.publicPositionEnabled === true;
}

function currentRolePins() {
  return {
    ...ROLE_PINS,
    ...(data.notes?.rolePins || {})
  };
}

function knownRole(role) {
  return ["live", "speaker", "referee", "video", "computer", "secretary"].includes(role);
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
  return !pinLockEnabled() || unlockedRoles.includes(role);
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
  return ["live", "speaker", "referee", "video", "computer", "secretary"].includes(role);
}

function roleConnectionLimit(role) {
  return role === "live" ? 3 : 1;
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
let currentResultImportRow = null;
let currentSessionResultsImport = null;
let resultUploadStates = new Map();
let seriesImportState = null;
let resultsAdminSession = "";
let finalistAlertRepairRunning = false;
let replacementAlertRepairRunning = false;
let presenceCounts = {};
let lastPresenceWriteAt = 0;
let consolePresenceActive = false;
let lastPublicProgressSignature = "";

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
const appShell = document.querySelector(".app-shell");
const sidebar = document.querySelector(".sidebar");
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

function alertsCollection() {
  if (!firestoreDb) return null;
  return firestoreDb
    .collection("competitions")
    .doc(FIRESTORE_COMPETITION_ID)
    .collection("alerts");
}

function historyArchivesCollection() {
  if (!firestoreDb) return null;
  return firestoreDb
    .collection("competitions")
    .doc(FIRESTORE_COMPETITION_ID)
    .collection("historyArchives");
}

function resultArchivesCollection() {
  if (!firestoreDb) return null;
  return firestoreDb
    .collection("competitions")
    .doc(FIRESTORE_COMPETITION_ID)
    .collection("resultArchives");
}

function resultsCollection() {
  if (!firestoreDb) return null;
  return firestoreDb
    .collection("competitions")
    .doc(FIRESTORE_COMPETITION_ID)
    .collection("results");
}

function seriesPdfsCollection() {
  if (!firestoreDb) return null;
  return firestoreDb
    .collection("competitions")
    .doc(FIRESTORE_COMPETITION_ID)
    .collection("seriesPdfs");
}

function sessionResultsPdfsCollection() {
  if (!firestoreDb) return null;
  return firestoreDb
    .collection("competitions")
    .doc(FIRESTORE_COMPETITION_ID)
    .collection("sessionResultsPdfs");
}

function publicResultsIndexDocument() {
  if (!firestoreDb) return null;
  return firestoreDb
    .collection("competitions")
    .doc(FIRESTORE_COMPETITION_ID)
    .collection("public")
    .doc("resultsIndex");
}

function liveDataDocument() {
  if (!firestoreDb) return null;
  return firestoreDb
    .collection("competitions")
    .doc(FIRESTORE_COMPETITION_ID)
    .collection("liveData")
    .doc("current");
}

function roleLockDocument(role) {
  if (!firestoreDb) return null;
  return firestoreDb
    .collection("competitions")
    .doc(FIRESTORE_COMPETITION_ID)
    .collection("roleLocks")
    .doc(role);
}

function presenceCollection() {
  if (!firestoreDb) return null;
  return firestoreDb
    .collection("competitions")
    .doc(FIRESTORE_COMPETITION_ID)
    .collection("presence");
}

function presenceDocument(id = `console-${currentClientId()}`) {
  const collection = presenceCollection();
  return collection ? collection.doc(id) : null;
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
  if (state.role !== "speaker" || !publicPositionEnabled()) return null;
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
  const nextProgress = enabled ? currentPublicProgressPayload() : null;
  lastPublicProgressSignature = "";
  await updateLiveNotes(enabled ? "Repère public activé" : "Repère public désactivé", {
    publicPositionEnabled: Boolean(enabled),
    publicProgress: nextProgress
  });
}

function homeActionCounts() {
  const counts = emptyPresenceCounts();
  alerts.forEach((alert) => {
    if (alert.cancelledAt || alert.type === "final_composition_ready") return;
    if (alert.speakerStatus === "pending") counts.speaker += 1;
    if (alert.requiresVideo && alert.videoStatus === "pending") counts.video += 1;
    if (alert.informaticsStatus === "pending") counts.computer += 1;
    if (alert.type === "forfait" && alert.secretaryStatus === "pending") counts.secretary += 1;
  });
  return counts;
}

function actionCountLabel(count) {
  const value = Number(count || 0);
  return `${value} action${value > 1 ? "s" : ""}`;
}

function renderHomeActionCounts() {
  const counts = homeActionCounts();
  document.querySelectorAll("[data-home-actions-role]").forEach((node) => {
    const value = counts[node.dataset.homeActionsRole] || 0;
    node.hidden = value <= 0;
    node.textContent = actionCountLabel(value);
  });
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
  return JSON.parse(JSON.stringify(alert || {}));
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

function isFinalResultAlert(alert) {
  return alert?.type === "finalists_announcement" || alert?.type === "finalist_replacement_announcement";
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

async function clearFirestoreAlerts() {
  const collection = alertsCollection();
  if (!collection) return;
  const snapshot = await collection.get();
  const batch = firestoreDb.batch();
  snapshot.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

async function publishLiveDataToFirestore(nextData, source = "Import PDF séries") {
  const doc = liveDataDocument();
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
  await publishPublicResultsIndex({ silent: true });
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
  return !lock?.expiresAt || Date.parse(lock.expiresAt) <= Date.now();
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
        const activeClients = Object.fromEntries(Object.entries(clients).filter(([, item]) => !lockExpired(item)));
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
    const allowed = await firestoreDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(doc);
      const lock = snapshot.exists ? snapshot.data() : null;
      if (roleConnectionLimit(role) > 1) {
        const clients = Object.fromEntries(Object.entries(lock?.clients || {}).filter(([, item]) => !lockExpired(item)));
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
      if (lock && lock.clientId !== clientId && !lockExpired(lock)) return false;
      transaction.set(doc, payload);
      return true;
    });
    if (!allowed) {
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
        const clients = Object.fromEntries(Object.entries(lock.clients || {}).filter(([, item]) => !lockExpired(item)));
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
  applyFreshData(mergeRemoteLiveData(remoteData), true);
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
  roleCodesModal.innerHTML = `
    <div class="decision-dialog role-codes-dialog" role="dialog" aria-modal="true" aria-label="Codes d'accès">
      <div class="decision-modal-head">
        <div>
          <span>Sécurité</span>
          <h2>Codes des consoles</h2>
          <p>Chaque code doit contenir exactement 4 chiffres. Live accepte 3 connexions simultanées.</p>
        </div>
        <button class="decision-close" type="button" data-role-codes-close aria-label="Fermer">×</button>
      </div>
      <div class="role-code-grid">
        ${roleOrder.map((role) => `
          <label>
            <span>${escapeHtml(ROLE_LABELS[role])}</span>
            <input type="text" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" data-role-code="${escapeHtml(role)}" value="${escapeHtml(pins[role] || "")}">
          </label>
        `).join("")}
      </div>
      <div class="admin-extra-zone">
        <span>Administration avancée</span>
        <button class="ghost-button compact" type="button" data-open-history-archives>Archives historiques</button>
      </div>
      <div class="decision-modal-actions">
        <button class="ghost-button" type="button" data-role-codes-close>Annuler</button>
        ${active ? `<button class="ghost-button danger-button" type="button" data-disable-role-codes>Désactiver les codes</button>` : ""}
        <button class="primary-button" type="button" data-save-role-codes="${active ? "keep" : "enable"}">${active ? "Enregistrer les codes" : "Enregistrer et activer"}</button>
      </div>
    </div>
  `;
}

function renderRoleCodesAdminModal(action = "codes") {
  if (!roleCodesModal) return;
  roleCodesModal.hidden = false;
  const title = action === "reset" ? "Confirmer le RAZ" : "Code administrateur";
  const help = action === "reset"
    ? "Entre le code administrateur pour archiver puis remettre l'historique à zéro."
    : "Entre le code administrateur pour modifier les codes des consoles.";
  roleCodesModal.innerHTML = `
    <div class="decision-dialog role-codes-dialog" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <div class="decision-modal-head">
        <div>
          <span>Sécurité</span>
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(help)}</p>
        </div>
        <button class="decision-close" type="button" data-role-codes-close aria-label="Fermer">×</button>
      </div>
      <label class="role-code-admin-field">
        Code admin
        <input id="roleCodeAdminInput" type="password" inputmode="text" maxlength="5" autocomplete="off">
      </label>
      <div class="decision-modal-actions">
        <button class="ghost-button" type="button" data-role-codes-close>Annuler</button>
        <button class="primary-button" type="button" data-confirm-role-code-admin="${escapeHtml(action)}">Continuer</button>
      </div>
    </div>
  `;
  roleCodesModal.querySelector("#roleCodeAdminInput")?.focus();
}

function renderResetHistoryModal() {
  if (!roleCodesModal) return;
  roleCodesModal.hidden = false;
  roleCodesModal.innerHTML = `
    <div class="decision-dialog role-codes-dialog" role="dialog" aria-modal="true" aria-label="Confirmer RAZ historique">
      <div class="decision-modal-head">
        <div>
          <span>Historique</span>
          <h2>Confirmer le RAZ</h2>
          <p>Écris RAZ pour archiver l'historique actif puis le remettre à zéro.</p>
        </div>
        <button class="decision-close" type="button" data-role-codes-close aria-label="Fermer">×</button>
      </div>
      <label class="role-code-admin-field">
        Confirmation
        <input id="resetHistoryInput" type="text" maxlength="3" autocomplete="off">
      </label>
      <div class="decision-modal-actions">
        <button class="ghost-button" type="button" data-role-codes-close>Annuler</button>
        <button class="primary-button danger-button" type="button" data-confirm-reset-history>Archiver et remettre à zéro</button>
      </div>
    </div>
  `;
  roleCodesModal.querySelector("#resetHistoryInput")?.focus();
}

function renderResetResultsModal() {
  if (!roleCodesModal) return;
  const activeSession = ensureResultsAdminSession();
  const sessions = resultSessions();
  const selectedSession = activeSession || sessions[0]?.number || "";
  roleCodesModal.hidden = false;
  roleCodesModal.innerHTML = `
    <div class="decision-dialog role-codes-dialog" role="dialog" aria-modal="true" aria-label="Confirmer RAZ LivePalmes">
      <div class="decision-modal-head">
        <div>
          <span>Remise à zéro</span>
          <h2>RAZ LivePalmes</h2>
          <p>Disponible uniquement en actualisation manuelle. Chaque RAZ archive ce qu'il efface avant suppression.</p>
        </div>
        <button class="decision-close" type="button" data-role-codes-close aria-label="Fermer">×</button>
      </div>
      <div class="admin-series-options">
        <label class="admin-series-option">
          <input type="radio" name="resetResultsScope" value="history">
          <strong>Journal d'arbitrage</strong>
          <span>Archive puis vide les décisions, forfaits, abandons et annonces.</span>
        </label>
        <label class="admin-series-option">
          <input type="radio" name="resetResultsScope" value="results-session" checked ${sessions.length ? "" : "disabled"}>
          <strong>Résultats d'une session</strong>
          <span>Archive puis supprime les résultats publiés et PDF complets liés à la session choisie.</span>
          ${sessions.length ? `
            <select id="resetResultsSessionSelect" class="reset-session-select" aria-label="Session à remettre à zéro">
              ${sessions.map((session) => `
                <option value="${escapeHtml(session.number)}" ${session.number === selectedSession ? "selected" : ""}>Session ${escapeHtml(session.number)}</option>
              `).join("")}
            </select>
          ` : ""}
        </label>
        <label class="admin-series-option">
          <input type="radio" name="resetResultsScope" value="results-all" ${activeSession ? "" : "checked"}>
          <strong>Tous les résultats de la compétition</strong>
          <span>Archive puis supprime les résultats publics de toutes les sessions.</span>
        </label>
        <label class="admin-series-option danger-option">
          <input type="radio" name="resetResultsScope" value="series-all">
          <strong>Séries et compétition complète</strong>
          <span>Vide programme, séries, engagés, PDF de séries publics et résultats publics pour préparer une nouvelle compétition.</span>
        </label>
      </div>
      <label class="role-code-admin-field">
        Confirmation
        <input id="resetResultsInput" type="text" maxlength="3" autocomplete="off" placeholder="RAZ">
      </label>
      <div class="decision-modal-actions">
        <button class="ghost-button" type="button" data-role-codes-close>Annuler</button>
        <button class="primary-button danger-button" type="button" data-confirm-reset-results>Archiver et remettre à zéro</button>
      </div>
    </div>
  `;
  roleCodesModal.querySelector("#resetResultsInput")?.focus();
}

function renderPublicSessionInfosModal() {
  if (!roleCodesModal) return;
  const sessions = resultSessions();
  const infos = data.notes?.publicSessionInfos || {};
  roleCodesModal.hidden = false;
  roleCodesModal.innerHTML = `
    <div class="decision-dialog role-codes-dialog session-infos-dialog" role="dialog" aria-modal="true" aria-label="Informations des sessions">
      <div class="decision-modal-head">
        <div>
          <span>Page résultats</span>
          <h2>Informations</h2>
          <p>Ces textes apparaîtront sur la page résultats publique quand on clique sur la session concernée.</p>
        </div>
        <button class="decision-close" type="button" data-role-codes-close aria-label="Fermer">×</button>
      </div>
      <div class="session-infos-editor">
        ${sessions.length ? sessions.map((session) => `
          <label class="session-info-field">
            <strong>Session ${escapeHtml(session.number)}</strong>
            <textarea data-session-info-input="${escapeHtml(session.number)}" rows="4" placeholder="Ex : échauffement à 8h00, début de session à 9h00, protocole à 11h30...">${escapeHtml(infos[session.number] || "")}</textarea>
          </label>
        `).join("") : `<p class="panel-subtitle">Aucune session chargée pour le moment.</p>`}
      </div>
      <div class="decision-modal-actions">
        <button class="ghost-button" type="button" data-role-codes-close>Annuler</button>
        <button class="primary-button" type="button" data-save-public-session-infos ${sessions.length ? "" : "disabled"}>Publier les informations</button>
      </div>
    </div>
  `;
}

async function renderHistoryArchivesModal({ canDelete = false } = {}) {
  if (!roleCodesModal) return;
  const historyCollection = historyArchivesCollection();
  const resultCollection = resultArchivesCollection();
  let historyArchives = [];
  let resultArchives = [];
  const archiveMeetLabel = (archive) => {
    const meet = archive?.meet || {};
    const parts = [meet.name, meet.city, meet.year].filter(Boolean);
    return parts.length ? parts.join(" - ") : "Compétition non renseignée";
  };
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
  roleCodesModal.innerHTML = `
    <div class="decision-dialog role-codes-dialog history-archives-dialog" role="dialog" aria-modal="true" aria-label="Archives historiques" data-archives-can-delete="${canDelete ? "1" : "0"}">
      <div class="decision-modal-head">
        <div>
          <span>Administration</span>
          <h2>Archives historiques</h2>
          <p>Archives créées automatiquement avant un RAZ historique ou une remise à zéro des résultats.</p>
        </div>
        <button class="decision-close" type="button" data-role-codes-close aria-label="Fermer">×</button>
      </div>
      <h3 class="archive-section-title">Journal d'arbitrage</h3>
      <div class="archive-list">
        ${historyArchives.length ? historyArchives.map((archive) => `
          <div class="archive-item" data-archive-id="${escapeHtml(archive.id)}">
            <div>
              <strong>${escapeHtml(archive.createdLabel || formatAlertDateTime(archive.createdAt) || archive.createdAt || "-")}</strong>
              <span>${escapeHtml(archiveMeetLabel(archive))}</span>
              <span>${escapeHtml(String(archive.count || archive.alerts?.length || 0))} lignes du journal</span>
            </div>
            <div class="archive-actions">
              <button class="ghost-button compact" type="button" data-open-archive="${escapeHtml(archive.id)}">Ouvrir</button>
              ${canDelete ? `<button class="ghost-button compact danger-button" type="button" data-delete-archive="${escapeHtml(archive.id)}">Supprimer</button>` : ""}
            </div>
          </div>
        `).join("") : `<p class="panel-subtitle">Aucune archive enregistrée.</p>`}
      </div>
      <h3 class="archive-section-title">Résultats publics</h3>
      <div class="archive-list">
        ${resultArchives.length ? resultArchives.map((archive) => `
          <div class="archive-item" data-result-archive-id="${escapeHtml(archive.id)}">
            <div>
              <strong>${escapeHtml(archive.createdLabel || formatAlertDateTime(archive.createdAt) || archive.createdAt || "-")}</strong>
              <span>${escapeHtml(archiveMeetLabel(archive))}</span>
              <span>${escapeHtml(String(archive.count || 0))} résultats archivés${archive.reason ? ` - ${escapeHtml(archive.reason)}` : ""}</span>
            </div>
            <div class="archive-actions">
              <button class="ghost-button compact" type="button" data-open-result-archive="${escapeHtml(archive.id)}">Ouvrir</button>
              ${canDelete ? `<button class="ghost-button compact danger-button" type="button" data-delete-result-archive="${escapeHtml(archive.id)}">Supprimer</button>` : ""}
            </div>
          </div>
        `).join("") : `<p class="panel-subtitle">Aucune archive de résultats enregistrée.</p>`}
      </div>
      <div class="decision-modal-actions">
        ${canDelete ? `<button class="ghost-button" type="button" data-role-codes-back>Retour</button>` : ""}
        <button class="primary-button" type="button" data-role-codes-close>Fermer</button>
      </div>
    </div>
  `;
}

function renderRolePinModal(role) {
  if (!roleCodesModal) return;
  const label = ROLE_LABELS[role] || "Console";
  roleCodesModal.hidden = false;
  roleCodesModal.innerHTML = `
    <div class="decision-dialog role-codes-dialog" role="dialog" aria-modal="true" aria-label="Code d'accès">
      <div class="decision-modal-head">
        <div>
          <span>Accès console</span>
          <h2>${escapeHtml(label)}</h2>
          <p>Entre le code de cette console ou le code administrateur.</p>
        </div>
        <button class="decision-close" type="button" data-role-pin-cancel aria-label="Fermer">×</button>
      </div>
      <label class="role-code-admin-field">
        Code
        <input id="rolePinInput" type="password" inputmode="text" maxlength="5" autocomplete="off" data-role-pin-input="${escapeHtml(role)}">
      </label>
      <div class="decision-modal-actions">
        <button class="ghost-button" type="button" data-role-pin-cancel>Annuler</button>
        <button class="primary-button" type="button" data-confirm-role-pin="${escapeHtml(role)}">Ouvrir</button>
      </div>
    </div>
  `;
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
  updateLiveNotes(enabled ? "Actualisation directe activée" : "Actualisation manuelle activée", {
    competitionMode: enabled,
    competitionModeUpdatedAt: new Date().toISOString()
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
  raceResults = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  resultsSnapshotReady = true;
  cleanupOrphanFinalResultAlerts();
  ensurePendingFinalistsSpeakerAlerts();
  ensurePendingReplacementSpeakerAlerts();
  if (state.role === "computer") publishPublicResultsIndex({ silent: true });
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
    stopFirebaseRealtimeSync();
    if (!competitionModeEnabled()) {
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
  if (!competitionModeEnabled()) {
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
  const rows = Array.isArray(sourceResults) ? sourceResults : [];
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

function timeToMs(value) {
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
}

function formatPersonNameParts(firstName, lastName, fallback = "") {
  const last = String(lastName || "").trim().toLocaleUpperCase("fr-FR");
  const first = String(firstName || "").trim();
  return [last, first].filter(Boolean).join(" ").trim() || fallback;
}

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

function currentEvent() {
  return data.events.find((event) => event.id === state.eventId) || data.events[0];
}

function matchesRace(item) {
  return item.eventId === state.eventId &&
    item.sex === state.sex;
}

function comparableEventId(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function eventSignature(value) {
  const compact = normalizePdfLabel(value).replace(/[^a-z0-9x]+/g, "");
  const direct = compact.match(/(\d+x\d+|\d+)(?:m)?(apnee|ap|immersion|is|surface|sf|bipalmes|bipalme|bi|sb)/i);
  if (!direct) return "";
  const distance = direct[1].toLowerCase();
  const disciplineText = direct[2].toLowerCase();
  let discipline = "";
  if (disciplineText === "ap" || disciplineText === "apnee") discipline = "ap";
  else if (disciplineText === "is" || disciplineText === "immersion") discipline = "is";
  else if (disciplineText === "sf" || disciplineText === "surface") discipline = "sf";
  else if (disciplineText === "bi" || disciplineText === "bipalme" || disciplineText === "bipalmes") discipline = "bi";
  else if (disciplineText === "sb") discipline = "sb";
  return discipline ? `${distance}${discipline}` : "";
}

function recordEventMatches(recordEventId, eventId) {
  const recordId = comparableEventId(recordEventId);
  const raceId = comparableEventId(eventId);
  if (recordId === raceId) return true;
  const recordSignature = eventSignature(recordEventId);
  const raceSignature = eventSignature(eventId);
  if (recordSignature && raceSignature && recordSignature === raceSignature) return true;
  if (recordSignature && raceId && recordSignature === raceId) return true;
  if (raceSignature && recordId && raceSignature === recordId) return true;
  if (/^(\d+x)/i.test(raceId) && raceId.endsWith("x") && recordId === raceId.slice(0, -1)) return true;
  if (/^(\d+x)/i.test(recordId) && recordId.endsWith("x") && raceId === recordId.slice(0, -1)) return true;
  return false;
}

function recordMatchesRace(record, eventId = state.eventId, sex = state.sex) {
  if (!recordEventMatches(record.eventId, eventId)) return false;
  if (sex === "X" && isRelayEntrant({ eventId })) {
    return ["F", "M", "X"].includes(sheetSex(record.sex));
  }
  return sheetSex(record.sex) === sex;
}

function isFinalStage(stage) {
  return String(stage || "").startsWith("finale");
}

function finalStageLabel(stage) {
  const letter = String(stage || "").split("-")[1]?.toUpperCase();
  return letter ? `Finale ${letter}` : "Finale";
}

function isFemaleContext(sex = state.sex) {
  return sex === "F";
}

function sexDisplayLabel(sex = state.sex) {
  if (sex === "F") return "Femmes";
  if (sex === "M") return "Hommes";
  return "Mixte";
}

function categoryLabel(category, sex = state.sex) {
  if (isFemaleContext(sex)) {
    if (sameCategory(category, "Cadet")) return "Cadette";
    if (sameCategory(category, "Junior")) return "Junior";
    if (sameCategory(category, "Senior")) return "Senior";
  }
  return category || "";
}

function entrantWord(count = 2, sex = state.sex) {
  const female = isFemaleContext(sex);
  if (Number(count) === 1) return female ? "engagée" : "engagé";
  return female ? "engagées" : "engagés";
}

function swimmerWord(count = 1, sex = state.sex) {
  const female = isFemaleContext(sex);
  if (Number(count) === 1) return female ? "nageuse" : "nageur";
  return female ? "nageuses" : "nageurs";
}

function displayedWord(count = 2, sex = state.sex) {
  if (Number(count) === 1) return isFemaleContext(sex) ? "affichée" : "affiché";
  return isFemaleContext(sex) ? "affichées" : "affichés";
}

function availableSexesForEvent(eventId = state.eventId) {
  const order = ["F", "M", "X"];
  const sexes = new Set([
    ...data.entrants.filter((item) => item.eventId === eventId).map((item) => item.sex),
    ...data.series.filter((item) => item.eventId === eventId).map((item) => item.sex),
    ...data.program.filter((item) => item.eventId === eventId).map((item) => item.sex)
  ].filter(Boolean));
  return order.filter((sex) => sexes.has(sex));
}

function raceEntrants() {
  const query = state.search.trim().toLowerCase();
  const seriesRows = currentSeriesRows();
  const seriesMap = new Map(seriesRows.map((row) => [row.swimmerId || entrantKey(row), row]));
  const hasSeriesFilter = state.series !== "all";
  return data.entrants
    .filter(matchesRace)
    .filter((entrant) => {
      if (!hasSeriesFilter) return true;
      const seriesRow = seriesMap.get(entrant.swimmerId || entrantKey(entrant));
      return Boolean(seriesRow) && (!seriesRow.session || !entrant.session || entrant.session === seriesRow.session);
    })
    .filter((entrant) => state.category === "all" || sameCategory(entrant.category, state.category))
    .filter((entrant) => {
      const haystack = [
        entrant.lane,
        entrant.lastName,
        entrant.firstName,
        entrant.name,
        entrant.club,
        entrant.category,
        entrant.seedTime,
        entrant.note
      ].join(" ").toLowerCase();
      return haystack.includes(query);
    })
    .map((entrant) => ({ ...entrant, seriesInfo: seriesMap.get(entrant.swimmerId || entrantKey(entrant)) }))
    .sort((a, b) => {
      if (hasSeriesFilter) {
        const direction = state.lineOrder === "desc" ? -1 : 1;
        return direction * (Number(a.seriesInfo?.line || 99) - Number(b.seriesInfo?.line || 99));
      }
      return timeToMs(a.seedTime) - timeToMs(b.seedTime);
    });
}

function raceEntrantsForStats() {
  const raceItems = data.entrants.filter(matchesRace);
  const seriesItems = raceItems.filter((entrant) => {
    if (isFinalStage(entrant.stage)) return false;
    const row = (data.series || []).find((seriesRow) => (
      seriesRow.eventId === entrant.eventId &&
      seriesRow.sex === entrant.sex &&
      (seriesRow.swimmerId || entrantKey(seriesRow)) === (entrant.swimmerId || entrantKey(entrant)) &&
      (!entrant.session || !seriesRow.session || entrant.session === seriesRow.session)
    ));
    return !row || !isFinalStage(row.stage);
  });
  const source = seriesItems.length ? seriesItems : raceItems;
  const bySwimmer = new Map();
  source.forEach((entrant) => {
    const key = entrant.swimmerId || entrantKey(entrant);
    const current = bySwimmer.get(key);
    if (!current || timeToMs(entrant.seedTime) < timeToMs(current.seedTime)) {
      bySwimmer.set(key, entrant);
    }
  });
  return [...bySwimmer.values()];
}

function updateEventSelect() {
  const rows = programRows();
  if (rows.length) {
    const options = [];
    const seen = new Set();
    rows.forEach((row) => {
      const optionKey = raceOptionKey(row.eventId, row.sex);
      if (seen.has(optionKey)) return;
      const event = data.events.find((item) => item.id === row.eventId);
      seen.add(optionKey);
      options.push({
        id: optionKey,
        label: `${event?.label || row.label || row.eventId.toUpperCase()} ${sexDisplayLabel(row.sex)} - ${raceOptionPhaseLabel(row.eventId, row.sex)}`
      });
    });
    if (!options.some((option) => option.id === raceOptionKey(state.eventId, state.sex))) {
      applyProgramRow(rows[0]);
    }
    eventSelect.innerHTML = options.map((option) => (
      `<option value="${escapeHtml(option.id)}">${escapeHtml(option.label)}</option>`
    )).join("");
    eventSelect.value = raceOptionKey(state.eventId, state.sex);
    return;
  }
  const fallbackOptions = [];
  data.events.forEach((event) => {
    const sexes = availableSexesForEvent(event.id);
    (sexes.length ? sexes : ["F", "M"]).forEach((sex) => {
      fallbackOptions.push({
        id: raceOptionKey(event.id, sex),
        label: `${event.label} ${sexDisplayLabel(sex)} - ${raceOptionPhaseLabel(event.id, sex)}`
      });
    });
  });
  eventSelect.innerHTML = fallbackOptions.map((option) => (
    `<option value="${escapeHtml(option.id)}">${escapeHtml(option.label)}</option>`
  )).join("");
  eventSelect.value = raceOptionKey(state.eventId, state.sex);
}

function raceOptionKey(eventId, sex) {
  return `${eventId || ""}|${sex || ""}`;
}

function raceProgramRowsForOption(eventId, sex) {
  return programRows().filter((row) => row.eventId === eventId && row.sex === sex);
}

function seriesNumbersForRaceOption(eventId, sex) {
  const rows = (data.series || [])
    .filter((row) => row.eventId === eventId && row.sex === sex)
    .filter((row) => state.session === "all" || !row.session || row.session === state.session)
    .filter((row) => !isFinalStage(row.stage));
  return [...new Set(rows.map((row) => Number(row.series)).filter(Number.isFinite))].sort((a, b) => a - b);
}

function finalRowsForRaceOption(eventId, sex) {
  const seen = new Set();
  return raceProgramRowsForOption(eventId, sex)
    .filter((row) => isFinalStage(row.stage))
    .filter((row) => {
      const key = row.stage || programKey(row);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function raceOptionPhaseLabel(eventId, sex) {
  const currentOption = eventId === state.eventId && sex === state.sex;
  const finals = finalRowsForRaceOption(eventId, sex);
  if (currentOption && isFinalStage(state.series) && finals.length) {
    return `${finals.length} finale${finals.length > 1 ? "s" : ""}`;
  }
  const seriesNumbers = seriesNumbersForRaceOption(eventId, sex);
  const rows = raceProgramRowsForOption(eventId, sex);
  const lastRegularRow = rows.filter((row) => !isFinalStage(row.stage)).at(-1);
  const isBestSeries = !finals.length && lastRegularRow && isSplitRaceAcrossSessions(eventId, sex) && isLastProgramPartForRace(lastRegularRow);
  if (isBestSeries) return "meilleure série";
  if (seriesNumbers.length) {
    return `${seriesNumbers.length} série${seriesNumbers.length > 1 ? "s" : ""}`;
  }
  if (finals.length) return `${finals.length} finale${finals.length > 1 ? "s" : ""}`;
  return "série";
}

function programRowFromRaceOption(value) {
  const [eventId, sex] = String(value || "").split("|");
  return programRows().find((row) => row.eventId === eventId && row.sex === sex)
    || { eventId, sex };
}

function programKey(row) {
  return [row.order, row.session || "", row.eventId, row.sex, row.stage || "series"].join("|");
}

function programLabel(row) {
  const sexLabel = sexDisplayLabel(row.sex);
  const time = row.startTime ? ` - ${row.startTime}` : "";
  const session = row.session ? `S${row.session} - ` : "";
  return `${session}${row.label} - ${sexLabel}${time}`;
}

function selectedProgramRow() {
  if (state.programKey) {
    const exact = programRows().find((row) => programKey(row) === state.programKey);
    if (exact) return exact;
  }
  if (isFinalStage(state.series)) {
    const finalRow = finalProgramRowsForRace().find((row) => row.stage === state.series);
    if (finalRow) return finalRow;
  }
  return programRows().find((row) => row.eventId === state.eventId && row.sex === state.sex) || null;
}

function applyProgramRow(row) {
  if (!row) return;
  state.programKey = programKey(row);
  state.eventId = row.eventId;
  state.sex = row.sex;
}

function sessionRows() {
  const rows = (data.program || []).filter((row) => row.session);
  const bySession = new Map();
  rows.forEach((row) => {
    if (!bySession.has(row.session)) {
      bySession.set(row.session, {
        number: row.session,
        label: row.sessionLabel || `Session ${row.session}`,
        order: Number(row.order || 9999)
      });
    }
  });
  return [...bySession.values()].sort((a, b) => Number(a.number) - Number(b.number) || a.order - b.order);
}

function firstSessionNumber() {
  return sessionRows()[0]?.number || "all";
}

function preferredInitialSession() {
  const sessions = sessionRows();
  if (!sessions.length) return "all";
  const updatedSession = String(data.notes?.lastUpdatedSession || "");
  if (data.notes?.lastImportedMode === "Mise à jour session" && sessions.some((session) => session.number === updatedSession)) {
    return updatedSession;
  }
  return sessions.find((session) => session.number === "1")?.number || sessions[0].number;
}

function firstProgramRowForSession(sessionNumber) {
  const rows = (data.program || [])
    .filter((row) => !sessionNumber || sessionNumber === "all" || row.session === sessionNumber)
    .filter((row) => row.hasEntrants === false || hasRowsForProgram(row))
    .sort((a, b) => Number(a.order || 9999) - Number(b.order || 9999));
  return rows[0] || null;
}

function firstSeriesForRace(eventId, sex, sessionNumber) {
  const rows = (data.series || [])
    .filter((row) => row.eventId === eventId && row.sex === sex)
    .filter((row) => sessionNumber === "all" || !row.session || row.session === sessionNumber);
  const firstRegular = rows
    .filter((row) => !isFinalStage(row.stage))
    .map((row) => Number(row.series))
    .filter(Number.isFinite)
    .sort((a, b) => a - b)[0];
  if (firstRegular) return String(firstRegular);
  return rows.find((row) => isFinalStage(row.stage))?.stage || "all";
}

function initialProgramPosition() {
  const session = preferredInitialSession();
  const row = firstProgramRowForSession(session);
  if (!row) {
    return {
      eventId: data.events[0]?.id || "",
      sex: "F",
      session,
      series: "all",
      programKey: ""
    };
  }
  return {
    eventId: row.eventId,
    sex: row.sex,
    session: row.session || session,
    series: firstSeriesForRace(row.eventId, row.sex, row.session || session),
    programKey: programKey(row)
  };
}

function normalizeLivePosition() {
  const sessions = sessionRows();
  if (!sessions.length) {
    state.session = "all";
    return;
  }
    if (state.session === "all" || !sessions.some((session) => session.number === state.session)) {
      const initial = initialProgramPosition();
      state.session = initial.session;
    state.eventId = initial.eventId;
    state.sex = initial.sex;
    state.programKey = initial.programKey;
    state.series = initial.series;
    return;
  }
  if (state.series === "all") {
    state.series = firstSeriesSelectionForCurrentRace();
  }
}

function programRowsForSession() {
  const rows = data.program || [];
  if (state.session === "all") return rows;
  return rows.filter((row) => row.session === state.session);
}

function programRows() {
  const explicitProgram = programRowsForSession()
    .filter((row) => row.hasEntrants === false || hasRowsForProgram(row))
    .sort((a, b) => Number(a.order || 9999) - Number(b.order || 9999));
  if (explicitProgram.length) return explicitProgram;

  const seen = new Set();
  return (data.series || [])
    .filter((row) => row.eventId && row.sex)
    .sort((a, b) => Number(a.heatOrder || 9999) - Number(b.heatOrder || 9999))
    .reduce((rows, row) => {
      const key = `${row.eventId}|${row.sex}`;
      if (seen.has(key)) return rows;
      seen.add(key);
      rows.push({
        eventId: row.eventId,
        sex: row.sex,
        order: Number(row.heatOrder || rows.length + 1)
      });
      return rows;
    }, []);
}

function currentProgramIndex() {
  const current = selectedProgramRow();
  if (!current) return -1;
  return programRows().findIndex((row) => programKey(row) === programKey(current));
}

function isLastRaceOfCurrentSession() {
  if (state.session === "all") return false;
  const rows = programRows();
  const index = currentProgramIndex();
  return rows.length > 0 && index === rows.length - 1;
}

function isLastSeriesOfCurrentSession() {
  if (state.session === "all" || state.series === "all") return false;
  return isLastRaceOfCurrentSession() && String(state.series) === String(lastSeriesSelectionForCurrentRace());
}

function isSplitRaceAcrossSessions(eventId = state.eventId, sex = state.sex) {
  const sessions = new Set((data.series || [])
    .filter((row) => row.eventId === eventId && row.sex === sex && row.session && !isFinalStage(row.stage))
    .map((row) => row.session));
  return sessions.size > 1;
}

function shouldShowSplitRaceNote() {
  return ["live", "speaker"].includes(state.role);
}

function splitRaceNote(eventId = state.eventId, sex = state.sex) {
  if (!shouldShowSplitRaceNote() || !isSplitRaceAcrossSessions(eventId, sex)) return "";
  return `<span class="session-end-note">[séries lentes matin, série rapide soir]</span>`;
}

function raceSeries() {
  return raceSeriesFor(state.eventId, state.sex);
}

function raceSeriesFor(eventId, sex) {
  let officialRows = (data.series || [])
    .filter((row) => row.eventId === eventId && row.sex === sex)
    .sort((a, b) => Number(a.heatOrder || a.series || 999) - Number(b.heatOrder || b.series || 999) || Number(a.line || 99) - Number(b.line || 99));
  if (isFinalStage(state.series)) {
    officialRows = officialRows.filter((row) => row.stage === state.series);
  } else {
    officialRows = officialRows
      .filter((row) => !isFinalStage(row.stage))
      .filter((row) => state.session === "all" || state.series === "all" || !row.session || row.session === state.session);
  }
  if (officialRows.length) return officialRows;
  const entrants = data.entrants
    .filter((entrant) => entrant.eventId === eventId && entrant.sex === sex)
    .sort((a, b) => timeToMs(b.seedTime) - timeToMs(a.seedTime));
  const total = Math.max(1, Math.ceil(entrants.length / 8));
  return entrants.map((entrant, index) => {
    const zeroBasedSeries = Math.floor(index / 8);
    const inSeriesIndex = index % 8;
    return {
      ...entrant,
      series: zeroBasedSeries + 1,
      seriesCount: total,
      line: inSeriesIndex + 1,
      isPreview: true
    };
  });
}

function availableSeriesNumbers() {
  const officialRows = (data.series || [])
    .filter(matchesRace)
    .filter((row) => state.session === "all" || !row.session || row.session === state.session);
  const regularRows = officialRows.filter((row) => !isFinalStage(row.stage));
  const sourceRows = officialRows.length ? regularRows : raceSeries().filter((row) => !isFinalStage(row.stage));
  return [...new Set(sourceRows.map((row) => Number(row.series)).filter(Number.isFinite))].sort((a, b) => a - b);
}

function selectedSeriesTime() {
  if (state.series === "all") return "";
  if (isFinalStage(state.series)) {
    return finalProgramRowsForRace().find((row) => row.stage === state.series)?.startTime ||
      raceSeries().find((row) => row.stage === state.series)?.startTime ||
      "";
  }
  return raceSeries().find((row) => Number(row.series) === Number(state.series))?.startTime || "";
}

function selectedSeriesLabel() {
  if (state.series === "all") return "";
  if (isFinalStage(state.series)) return finalStageLabel(state.series);
  const selectedSeries = Number(state.series);
  const seriesNumbers = availableSeriesNumbers();
  const selectedSeriesCount = currentSeriesRows()[0]?.seriesCount || seriesNumbers.length || selectedSeries;
  return `Série ${selectedSeries}/${selectedSeriesCount}`;
}

function compactRaceTitle() {
  return [
    currentEvent()?.label || "Course",
    sexDisplayLabel(state.sex),
    selectedSeriesLabel()
  ].filter(Boolean).join(" · ");
}

function hasNextProgramSeries() {
  const rows = programRows();
  const index = currentProgramIndex();
  return index >= 0 && index < rows.length - 1;
}

function hasPreviousProgramSeries() {
  const rows = programRows();
  const index = currentProgramIndex();
  return index > 0;
}

function goToNextProgramRace() {
  const rows = programRows();
  const programIndex = currentProgramIndex();
  const nextRace = rows[programIndex + 1];
  if (!nextRace) return false;
  applyProgramRow(nextRace);
  state.category = "all";
  clearSearch();
  state.selectedRecordKey = "";
  const nextNumbers = availableSeriesNumbers();
  const nextFinal = finalProgramRowsForRace()[0]?.stage;
  state.series = String(nextNumbers[0] || nextFinal || "all");
  return true;
}

function goToPreviousProgramRace() {
  const rows = programRows();
  const programIndex = currentProgramIndex();
  const previousRace = rows[programIndex - 1];
  if (!previousRace) return false;
  applyProgramRow(previousRace);
  state.category = "all";
  clearSearch();
  state.selectedRecordKey = "";
  state.series = lastSeriesSelectionForCurrentRace();
  return true;
}

function currentSeriesRows() {
  if (state.series === "all") return [];
  if (isFinalStage(state.series)) {
    return raceSeries().filter((row) => row.stage === state.series);
  }
  const selected = Number(state.series);
  return raceSeries().filter((row) => Number(row.series) === selected);
}

function hasRowsForProgram(row) {
  return (data.series || []).some((seriesRow) => (
    seriesRow.eventId === row.eventId &&
    seriesRow.sex === row.sex &&
    (!row.session || !seriesRow.session || seriesRow.session === row.session) &&
    (!isFinalStage(row.stage) || seriesRow.stage === row.stage)
  ));
}

function programRowsForCurrentRace() {
  return programRowsForSession()
    .filter((row) => row.eventId === state.eventId && row.sex === state.sex)
    .sort((a, b) => Number(a.order || 9999) - Number(b.order || 9999));
}

function finalProgramRowsForRace() {
  const seen = new Set();
  return programRowsForCurrentRace()
    .filter((row) => isFinalStage(row.stage))
    .filter((row) => {
      if (seen.has(row.stage)) return false;
      seen.add(row.stage);
      return true;
    });
}

function firstSeriesSelectionForCurrentRace() {
  const numbers = availableSeriesNumbers();
  if (numbers.length) return String(numbers[0]);
  return finalProgramRowsForRace()[0]?.stage || "all";
}

function lastSeriesSelectionForCurrentRace() {
  const finals = finalProgramRowsForRace();
  if (finals.length) return finals[finals.length - 1].stage;
  const numbers = availableSeriesNumbers();
  if (numbers.length) return String(numbers[numbers.length - 1]);
  return "all";
}

function render() {
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
    profileModeStatus.classList.toggle("active", competitionModeEnabled());
  }
  renderPresenceCounts();
  renderHomeActionCounts();
  if (profileHomeBtn) profileHomeBtn.hidden = profileHomeActive;
  if (manualRefreshBtn) {
    const manualMode = !competitionModeEnabled();
    manualRefreshBtn.hidden = profileHomeActive || !manualMode;
    manualRefreshBtn.title = "Actualiser les données des consoles";
  }
  if (competitionModeTopBtn) {
    const competitionMode = competitionModeEnabled();
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
  if (alert.type === "final_composition_ready") return false;
  if (alert.cancelledAt) return false;
  if (state.role === "live") {
    if (alert.type === "finalists_announcement" || alert.type === "finalist_replacement_announcement") return false;
    return alert.speakerStatus !== "none" && !liveDismissedAlertIds.includes(alert.id);
  }
  if (state.role === "speaker") {
    return alert.speakerStatus === "pending";
  }
  if (state.role === "video") {
    return alert.requiresVideo && alert.videoStatus === "pending";
  }
  if (state.role === "computer") {
    return alert.informaticsStatus === "pending";
  }
  if (state.role === "secretary") {
    if (alert.type === "forfait" && alert.secretaryStatus === "pending") return true;
    return alert.speakerStatus === "pending" &&
      (alert.type === "finalists_announcement" || alert.type === "finalist_replacement_announcement");
  }
  return false;
}

function isRequalificationAlert(alert) {
  return alert.type === "requalification" || alert.type === "ja_cancellation";
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
    const source = alert.type === "requalification" ? "suite à la décision du délégué de la compétition" : "suite à l'annulation de la décision par le juge arbitre";
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
  return !["forfait", "abandon", "requalification", "ja_cancellation", "finalists_announcement", "finalist_replacement_announcement"].includes(alert.type);
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
  const codes = {
    forfait: "ABS",
    abandon: "ABD",
    false_start: "FD",
    relay_early_start: "DA",
    underwater_15m: "+15m",
    immersion: "FSTYLE",
    bottle_fault: "BOUT",
    interference: "GENE",
    other_dsq: "AUTRE"
  };
  return codes[alert.type] || "";
}

function renderLineAlertBadges(lineAlerts) {
  if (!lineAlerts.length) return "";
  const terminalStatus = lineAlerts
    .filter((alert) => alert.type === "forfait" || alert.type === "abandon")
    .sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)))[0];
  const dsqAlerts = lineAlerts.filter(isDsqAlert);
  const title = lineAlerts.map(decisionMotifLabel).join(" / ");
  if (terminalStatus) {
    const code = terminalStatus.type === "abandon" ? "ABD" : "ABS";
    const className = terminalStatus.type === "abandon" ? "abd-line-badge" : "abs-line-badge";
    return `<span class="line-alert-badges" title="${escapeHtml(title)}"><span class="line-alert-badge ${className}">${code}</span></span>`;
  }
  const codes = [...new Set(dsqAlerts.map(alertLineCode).filter(Boolean))];
  return `
    <span class="line-alert-badges" title="${escapeHtml(title)}">
      <span class="line-alert-badge dsq-line-badge">DSQ</span>
      ${codes.length ? `<span class="line-alert-reasons">${escapeHtml(codes.join(" / "))}</span>` : ""}
    </span>
  `;
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
  if (!label) return "";
  return `<span class="line-alert-badges imported-status-badges" title="${escapeHtml(label)}"><span class="line-alert-badge abs-line-badge">ABS</span><span class="line-alert-reasons">${escapeHtml(label)}</span></span>`;
}

function renderLineTimeStatus(entrant, lineAlerts) {
  const terminalStatus = terminalLineStatus(lineAlerts);
  if (terminalStatus) {
    const isAbandon = terminalStatus.type === "abandon";
    return `<span class="line-time-status"><span class="line-alert-badge ${isAbandon ? "abd-line-badge" : "abs-line-badge"}">${isAbandon ? "ABD" : "ABS"}</span><strong>${isAbandon ? "Abandon" : "Forfait non déclaré"}</strong></span>`;
  }
  const importedLabel = importedLineStatusLabel(entrant);
  if (importedLabel) {
    return `<span class="line-time-status"><span class="line-alert-badge abs-line-badge">ABS</span><strong>${escapeHtml(importedLabel)}</strong></span>`;
  }
  return "";
}

function finalistRowName(row) {
  return formatPersonNameParts(row?.firstName, row?.lastName, row?.name) || "Concurrent";
}

function finalRowsForAnnouncementAlert(alert) {
  const result = alert?.resultId ? raceResults.find((item) => item.id === alert.resultId) : null;
  return normalizeFinalistsOrder(result?.finalists || alert?.finalists || {});
}

function renderFinalistsAlertList(alert) {
  const renderRows = (title, rows = []) => rows.length ? `
    <div class="finalists-alert-group">
      <strong>${escapeHtml(title)}</strong>
      <ol>
        ${rows.map((row) => `
          <li value="${escapeHtml(row.rank || "")}" class="${row.withdrawnAt ? "withdrawn" : ""}">
            <span>${escapeHtml(finalistRowName(row))}</span>
            <em>${escapeHtml(row.time || "")}</em>
            ${row.withdrawnAt ? `<small class="finalist-status withdrawn">Forfait</small>` : ""}
            ${row.repechaged && !row.withdrawnAt ? `<small class="finalist-status repechaged">Repêché${alert.sex === "F" ? "e" : ""}</small>` : ""}
          </li>
        `).join("")}
      </ol>
    </div>
  ` : "";
  const finals = finalRowsForAnnouncementAlert(alert);
  return `
    <div class="finalists-alert-list">
      ${renderRows("Finale A", finals.a || [])}
      ${renderRows("Finale B", finals.b || [])}
    </div>
  `;
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
  if (alert.type === "finalists_announcement" || alert.type === "finalist_replacement_announcement") {
    const isReplacement = alert.type === "finalist_replacement_announcement";
    const title = isReplacement
      ? (state.role === "speaker" ? "Repêchage à annoncer" : "Repêchage finale")
      : (state.role === "speaker" ? "Finalistes à annoncer" : "Finalistes en attente d'annonce");
    const sentence = isReplacement ? speakerAlertSentence(alert) : null;
    return `
      <div class="alert-card speaker-alert-card finalists-alert-card" data-alert-id="${escapeHtml(alert.id)}">
        <div>
          <strong class="alert-title finalists-alert-title"><span aria-hidden="true">📣</span> ${escapeHtml(title)} <small>${escapeHtml(alertPriorityMeta(alert))}</small></strong>
          <span class="speaker-alert-line">
            <span class="speaker-alert-text">${escapeHtml(sentence?.text || `${alert.eventLabel || alert.eventId} ${alert.sexLabel || sexDisplayLabel(alert.sex)}`)}</span>
            <span class="speaker-alert-identity">- ${escapeHtml(sentence?.identity || `${String(alert.finalistCount || 0)} finaliste${Number(alert.finalistCount || 0) > 1 ? "s" : ""}`)}</span>
          </span>
        </div>
        ${state.role === "speaker" ? `<button class="ghost-button compact" type="button" ${isReplacement ? `data-alert-action="Annoncé"` : "data-finalists-open"}>${isReplacement ? "Annoncé" : "Ouvrir"}</button>` : ""}
      </div>
    `;
  }
  if (isSpeakerView()) {
    const sentence = speakerAlertSentence(alert);
    const alertTitle = state.role === "live"
      ? (isRequalificationAlert(alert) ? "Requalification signalée" : "Disqualification signalée")
      : (isRequalificationAlert(alert) ? "Requalification à annoncer" : "Disqualification à annoncer");
    return `
      <div class="alert-card speaker-alert-card" data-alert-id="${escapeHtml(alert.id)}">
        <div>
          <strong class="alert-title"><span aria-hidden="true">!</span> ${escapeHtml(alertTitle)} <small>${escapeHtml(alertPriorityMeta(alert))}</small></strong>
          <span class="speaker-alert-line">
            <span class="speaker-alert-text">${escapeHtml(sentence.text)}</span>
            <span class="speaker-alert-identity">- ${escapeHtml(sentence.identity)}</span>
          </span>
        </div>
        ${actionLabel ? `<button class="ghost-button compact" type="button" data-alert-action="${escapeHtml(actionLabel)}">${escapeHtml(actionLabel)}</button>` : ""}
      </div>
    `;
  }
  return `
    <div class="alert-card" data-alert-id="${escapeHtml(alert.id)}">
      <div>
        <strong>${escapeHtml(DECISION_LABELS[alert.type] || (isRequalificationAlert(alert) ? "Requalification / annulation" : alert.type))} <small class="alert-title-meta">${escapeHtml(alertPriorityMeta(alert))}</small></strong>
        <span>${escapeHtml(alertRaceLabel(alert))}</span>
        <span>${escapeHtml(alertSwimmerLabel(alert))}${detail ? ` - ${escapeHtml(detail)}` : ""}</span>
      </div>
      ${actionLabel ? `<button class="ghost-button compact" type="button" data-alert-action="${escapeHtml(actionLabel)}">${escapeHtml(actionLabel)}</button>` : ""}
    </div>
  `;
}

function renderVideoInfoCard(alert) {
  const event = data.events.find((item) => item.id === alert.eventId);
  const seriesLabel = alert.stage && isFinalStage(alert.stage)
    ? finalStageLabel(alert.stage)
    : `série ${alert.series || "-"}`;
  return `
    <div class="alert-card video-info-card" aria-live="polite">
      <div>
        <strong class="alert-title"><span aria-hidden="true">⏳</span> Arbitrage vidéo en cours</strong>
        <small class="alert-title-meta">Info - ${escapeHtml(formatAlertTime(alert.createdAt) || "--:--")}</small>
        <span class="speaker-alert-line">
          <span class="speaker-alert-text">Arbitrage vidéo en cours sur la ${escapeHtml(seriesLabel)} du ${escapeHtml(event?.label || alert.eventId)} ${escapeHtml(sexDisplayLabel(alert.sex))}.</span>
        </span>
      </div>
    </div>
  `;
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

function resultIdForProgramRow(row) {
  const base = `result-${raceOptionKey(row.eventId, row.sex).replace(/[^a-z0-9_-]+/gi, "-")}`;
  if (!isFinalStage(row.stage)) return base;
  const stage = String(row.stage || "finale").replace(/[^a-z0-9_-]+/gi, "-");
  return `${base}-${stage}`;
}

function resultForProgramRow(row) {
  const raceKey = raceOptionKey(row.eventId, row.sex);
  const exact = raceResults.find((result) =>
    result.programKey === programKey(row) ||
    result.id === resultIdForProgramRow(row)
  );
  if (exact) return exact;
  if (isFinalStage(row.stage)) return null;
  return raceResults.find((result) => result.raceKey === raceKey && !isFinalStage(result.stage)) || null;
}

function publicResultPayload(result) {
  if (!result) return null;
  return {
    id: result.id || "",
    raceKey: result.raceKey || "",
    programKey: result.programKey || "",
    eventId: result.eventId || "",
    eventLabel: result.eventLabel || "",
    sex: result.sex || "",
    sexLabel: result.sexLabel || sexDisplayLabel(result.sex),
    stage: result.stage || "series",
    phaseLabel: result.phaseLabel || "",
    finalStageCount: result.finalStageCount || 0,
    session: result.session || "",
    startTime: result.startTime || "",
    hasFinal: Boolean(result.hasFinal),
    finalists: result.finalists || { a: [], b: [] },
    nextUnqualified: result.nextUnqualified || [],
    pdfName: result.pdfName || "",
    pdfSize: result.pdfSize || 0,
    createdAt: result.createdAt || "",
    updatedAt: result.updatedAt || "",
    isPartial: Boolean(result.isPartial),
    status: result.status || "",
    performances: Array.isArray(result.performances) ? result.performances : [],
    finalistsAnnouncedAt: result.finalistsAnnouncedAt || "",
    finalWithdrawals: result.finalWithdrawals || []
  };
}

function publicSeriesPdfPayload(pdf) {
  if (!pdf) return null;
  return {
    id: pdf.id || "",
    scope: pdf.scope || "",
    session: pdf.session || "",
    pdfName: pdf.pdfName || "",
    updatedAt: pdf.updatedAt || "",
    sourceLabel: pdf.sourceLabel || ""
  };
}

function publicSessionResultsPdfPayload(pdf) {
  if (!pdf) return null;
  const sessions = Array.isArray(pdf.sessions)
    ? pdf.sessions.map((session) => String(session || "").trim()).filter(Boolean)
    : [];
  return {
    id: pdf.id || "",
    scope: pdf.scope || "",
    session: pdf.session || "",
    sessions,
    pdfName: pdf.pdfName || "",
    updatedAt: pdf.updatedAt || "",
    sourceLabel: pdf.sourceLabel || ""
  };
}

function buildPublicResultsIndex() {
  const updatedAt = new Date().toISOString();
  return {
    id: "resultsIndex",
    meet: data.meet || {},
    events: data.events || [],
    program: data.program || [],
    series: data.series || [],
    results: raceResults.map(publicResultPayload).filter(Boolean),
    seriesPdfs: (data.notes?.publicSeriesPdfs || []).map(publicSeriesPdfPayload).filter(Boolean),
    sessionResultsPdfs: (data.notes?.publicSessionResultsPdfs || []).map(publicSessionResultsPdfPayload).filter(Boolean),
    sessionInfos: data.notes?.publicSessionInfos || {},
    publicAccess: {
      online: data.notes?.publicResultsOnline !== false,
      updatedAt: data.notes?.publicResultsOnlineUpdatedAt || ""
    },
    updatedAt,
    sourceVersion: data.sourceVersion || "",
    sourceLabel: data.notes?.sourceLabel || "",
    lastUpdatedSession: data.notes?.lastUpdatedSession || ""
  };
}

async function publishPublicResultsIndex({ silent = false } = {}) {
  const doc = publicResultsIndexDocument();
  if (!doc) return;
  try {
    await hydratePublicSeriesPdfMetadataIfNeeded();
    await hydratePublicSessionResultsPdfMetadataIfNeeded();
    await doc.set(JSON.parse(JSON.stringify(buildPublicResultsIndex())));
  } catch (error) {
    console.warn("Publication de l'index public impossible", error);
    if (!silent) {
      renderDataStatus("L'index public des résultats n'a pas pu être mis à jour. Vérifie les règles Firebase.");
    }
  }
}

function publicSeriesPdfId(scope, session = "") {
  return scope === "full" ? "full" : `session-${String(session || "").replace(/[^a-z0-9_-]+/gi, "-")}`;
}

function updatePublicSeriesPdfMetadata(pdf) {
  const metadata = publicSeriesPdfPayload(pdf);
  if (!metadata) return;
  const current = Array.isArray(data.notes?.publicSeriesPdfs) ? data.notes.publicSeriesPdfs : [];
  const next = metadata.scope === "full"
    ? [metadata]
    : [
      ...current.filter((item) => item.id !== metadata.id),
      metadata
    ];
  data = normalizeData({
    ...data,
    notes: {
      ...(data.notes || {}),
      publicSeriesPdfs: next
    }
  });
  saveData();
}

function clearPublicSeriesPdfMetadata() {
  data = normalizeData({
    ...data,
    notes: {
      ...(data.notes || {}),
      publicSeriesPdfs: []
    }
  });
  saveData();
}

async function hydratePublicSeriesPdfMetadataIfNeeded() {
  if (Array.isArray(data.notes?.publicSeriesPdfs)) return;
  const collection = seriesPdfsCollection();
  if (!collection) return;
  const snapshot = await collection.get();
  const metadata = snapshot.docs
    .map((doc) => publicSeriesPdfPayload({ id: doc.id, ...doc.data() }))
    .filter(Boolean)
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  data = normalizeData({
    ...data,
    notes: {
      ...(data.notes || {}),
      publicSeriesPdfs: metadata
    }
  });
  saveData();
}

async function clearPublicSeriesPdfs() {
  const collection = seriesPdfsCollection();
  if (!collection) return 0;
  const snapshot = await collection.get();
  await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
  clearPublicSeriesPdfMetadata();
  return snapshot.docs.length;
}

function clearPublicSessionResultsPdfMetadata() {
  data = normalizeData({
    ...data,
    notes: {
      ...(data.notes || {}),
      publicSessionResultsPdfs: []
    }
  });
  saveData();
}

async function clearPublicSessionResultsPdfs() {
  const collection = sessionResultsPdfsCollection();
  if (!collection) return 0;
  const snapshot = await collection.get();
  await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
  clearPublicSessionResultsPdfMetadata();
  return snapshot.docs.length;
}

async function clearPublicSessionResultsPdfsForSession(session) {
  const cleanSession = String(session || "").trim();
  if (!cleanSession) return 0;
  const collection = sessionResultsPdfsCollection();
  if (!collection) return 0;
  const snapshot = await collection.get();
  const docs = snapshot.docs.filter((doc) => {
    const pdf = { id: doc.id, ...doc.data() };
    if (pdf.scope === "full") return false;
    const sessions = Array.isArray(pdf.sessions) ? pdf.sessions.map(String) : [];
    return String(pdf.session || "") === cleanSession || sessions.includes(cleanSession);
  });
  await Promise.all(docs.map((doc) => doc.ref.delete()));
  const deletedIds = new Set(docs.map((doc) => doc.id));
  const current = Array.isArray(data.notes?.publicSessionResultsPdfs) ? data.notes.publicSessionResultsPdfs : [];
  data = normalizeData({
    ...data,
    notes: {
      ...(data.notes || {}),
      publicSessionResultsPdfs: current.filter((pdf) => !deletedIds.has(pdf.id))
    }
  });
  saveData();
  return docs.length;
}

async function publishPublicSeriesPdf(file, mode = "session", session = "") {
  const collection = seriesPdfsCollection();
  if (!collection || !file) return null;
  const scope = mode === "full" ? "full" : "session";
  const now = new Date().toISOString();
  const id = publicSeriesPdfId(scope, session);
  const payload = {
    id,
    scope,
    session: scope === "session" ? String(session || "") : "",
    pdfName: file.name,
    pdfDataUrl: await fileToDataUrl(file),
    updatedAt: now,
    sourceLabel: scope === "full" ? "Séries complètes" : `Séries session ${session || "-"}`
  };
  await collection.doc(id).set(JSON.parse(JSON.stringify(payload)));
  updatePublicSeriesPdfMetadata(payload);
  return payload;
}

function sessionResultsPdfId(scope, sessions = []) {
  if (scope === "full") return "complete-results-full";
  const safeSessions = sessions.map((session) => String(session || "").replace(/[^a-z0-9_-]+/gi, "-")).filter(Boolean);
  return `complete-results-${safeSessions.join("-") || "session"}`;
}

function updatePublicSessionResultsPdfMetadata(pdf) {
  const metadata = publicSessionResultsPdfPayload(pdf);
  if (!metadata) return;
  const current = Array.isArray(data.notes?.publicSessionResultsPdfs) ? data.notes.publicSessionResultsPdfs : [];
  const next = [
    ...current.filter((item) => item.id !== metadata.id),
    metadata
  ].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  data = normalizeData({
    ...data,
    notes: {
      ...(data.notes || {}),
      publicSessionResultsPdfs: next
    }
  });
  saveData();
}

async function hydratePublicSessionResultsPdfMetadataIfNeeded() {
  if (Array.isArray(data.notes?.publicSessionResultsPdfs)) return;
  const collection = sessionResultsPdfsCollection();
  if (!collection) return;
  const snapshot = await collection.get();
  const metadata = snapshot.docs
    .map((doc) => publicSessionResultsPdfPayload({ id: doc.id, ...doc.data() }))
    .filter(Boolean)
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  data = normalizeData({
    ...data,
    notes: {
      ...(data.notes || {}),
      publicSessionResultsPdfs: metadata
    }
  });
  saveData();
}

async function publishSessionResultsPdf(file, scope = "session", sessions = []) {
  const collection = sessionResultsPdfsCollection();
  if (!collection || !file) throw new Error("Firebase n'est pas disponible pour publier ce PDF.");
  const cleanSessions = [...new Set((sessions || []).map((session) => String(session || "").trim()).filter(Boolean))]
    .sort((a, b) => Number(a) - Number(b));
  const finalScope = scope === "full" ? "full" : "sessions";
  if (finalScope !== "full" && !cleanSessions.length) {
    throw new Error("Sélectionne au moins une session pour publier ce PDF.");
  }
  const now = new Date().toISOString();
  const id = sessionResultsPdfId(finalScope, cleanSessions);
  const sessionLabel = finalScope === "full"
    ? "Résultats complets de la compétition"
    : `Résultats complets ${cleanSessions.map((session) => `S${session}`).join(" + ")}`;
  const payload = {
    id,
    scope: finalScope,
    session: finalScope === "sessions" && cleanSessions.length === 1 ? cleanSessions[0] : "",
    sessions: finalScope === "full" ? [] : cleanSessions,
    pdfName: file.name,
    pdfDataUrl: await fileToDataUrl(file),
    updatedAt: now,
    sourceLabel: sessionLabel
  };
  await collection.doc(id).set(JSON.parse(JSON.stringify(payload)));
  updatePublicSessionResultsPdfMetadata(payload);
  await publishPublicResultsIndex();
  return payload;
}

function isLastProgramPartForRace(row) {
  const raceRows = (data.program || [])
    .filter((item) => item.eventId === row.eventId && item.sex === row.sex && !isFinalStage(item.stage))
    .sort((a, b) => Number(a.session || 0) - Number(b.session || 0) || Number(a.order || 9999) - Number(b.order || 9999));
  if (!raceRows.length) return true;
  return programKey(raceRows[raceRows.length - 1]) === programKey(row);
}

function resultSessions() {
  return sessionRows().filter((session) =>
    (data.program || []).some((row) => row.session === session.number && row.eventId && row.sex)
  );
}

function sessionResultsPdfsForAdminSession(session) {
  const items = Array.isArray(data.notes?.publicSessionResultsPdfs) ? data.notes.publicSessionResultsPdfs : [];
  return items
    .filter((pdf) => pdf.scope === "full" || (pdf.sessions || []).map(String).includes(String(session || "")) || String(pdf.session || "") === String(session || ""))
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
}

function latestResultSession() {
  const latest = raceResults
    .filter((result) => result.updatedAt && result.session)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
  return latest?.session ? String(latest.session) : "";
}

function ensureResultsAdminSession() {
  const sessions = resultSessions();
  if (!sessions.length) {
    resultsAdminSession = "";
    return "";
  }
  if (resultsAdminSession && sessions.some((session) => session.number === resultsAdminSession)) {
    return resultsAdminSession;
  }
  const currentSession = state.session && state.session !== "all" ? String(state.session) : "";
  const latestSession = latestResultSession();
  resultsAdminSession = [currentSession, latestSession, "1", sessions[0].number]
    .find((candidate) => candidate && sessions.some((session) => session.number === candidate)) || sessions[0].number;
  return resultsAdminSession;
}

function resultProgramRows(sessionNumber = "") {
  const seenRegular = new Set();
  const seenFinals = new Set();
  const sortedRows = (data.program || [])
    .filter((row) => row.eventId && row.sex)
    .filter((row) => !sessionNumber || row.session === sessionNumber)
    .sort((a, b) => Number(a.session || 0) - Number(b.session || 0) || Number(a.order || 9999) - Number(b.order || 9999));
  const rows = [];
  sortedRows.forEach((row) => {
    if (isFinalStage(row.stage)) {
      const key = `${row.session || ""}|${row.eventId}|${row.sex}|finales`;
      if (seenFinals.has(key)) return;
      seenFinals.add(key);
      const finalRows = sortedRows.filter((item) =>
        item.session === row.session &&
        item.eventId === row.eventId &&
        item.sex === row.sex &&
        isFinalStage(item.stage)
      );
      rows.push({
        ...row,
        finalStageCount: finalRows.length,
        finalStages: finalRows.map((item) => item.stage).filter(Boolean),
        stage: finalRows.length > 1 ? "finales" : row.stage,
        startTime: finalRows.map((item) => item.startTime).filter(Boolean)[0] || row.startTime || ""
      });
      return;
    }
    const raceKey = raceOptionKey(row.eventId, row.sex);
    if (!isLastProgramPartForRace(row) && !resultForProgramRow(row)) {
      rows.push(row);
      return;
    }
    if (seenRegular.has(raceKey)) return;
    seenRegular.add(raceKey);
    rows.push(row);
  });
  return rows;
}

function resultPhaseLabelForProgramRow(row) {
  if (isFinalStage(row.stage)) {
    return Number(row.finalStageCount || 0) > 1 || row.stage === "finales" ? "finales" : "finale";
  }
  const finals = (data.program || []).filter((item) => item.eventId === row.eventId && item.sex === row.sex && isFinalStage(item.stage));
  const seriesNumbers = (data.series || [])
    .filter((item) => item.eventId === row.eventId && item.sex === row.sex)
    .filter((item) => !row.session || !item.session || item.session === row.session)
    .filter((item) => !isFinalStage(item.stage))
    .map((item) => Number(item.series))
    .filter(Number.isFinite);
  const uniqueSeries = [...new Set(seriesNumbers)];
  if (!finals.length && isSplitRaceAcrossSessions(row.eventId, row.sex) && isLastProgramPartForRace(row)) {
    return "meilleure série";
  }
  return uniqueSeries.length > 1 ? "séries" : "série";
}

function resultStatusForProgramRow(row) {
  const result = resultForProgramRow(row);
  if (result) {
    if (result.hasFinal && result.finalistsAnnouncedAt) return "Finalistes annoncés";
    if (result.hasFinal) return "En attente annonce speaker";
    return "Publié";
  }
  return "";
}

function resultStatusBadgeForProgramRow(row, result, isFinalCompositionDefinitive) {
  if (!result) return { label: "À importer", tone: "missing" };
  if (result.hasFinal && !result.finalistsAnnouncedAt) return { label: "Attente speaker", tone: "waiting" };
  if (result.hasFinal) {
    return isFinalCompositionDefinitive
      ? { label: "Finalistes définitifs", tone: "done" }
      : { label: "Finalistes provisoires", tone: "pending" };
  }
  if (result.isPartial) return { label: "Résultat partiel", tone: "partial" };
  return { label: "Résultat publié", tone: "done" };
}

function resultStatusControlHtml(row, result, statusBadge) {
  const className = `result-status-badge ${escapeHtml(statusBadge.tone)}`;
  if (!result) {
    return `<button class="${className} status-action" type="button" data-result-import="${escapeHtml(programKey(row))}">${escapeHtml(statusBadge.label)}</button>`;
  }
  if (result.hasFinal) {
    return `<button class="${className} status-action" type="button" data-final-composition-result="${escapeHtml(result.id)}">${escapeHtml(statusBadge.label)}</button>`;
  }
  return `<span class="${className}">${escapeHtml(statusBadge.label)}</span>`;
}

function resultUploadKeyForProgram(row) {
  return `result:${programKey(row)}`;
}

function resultUploadKeyForSessionResults(session) {
  return `session-results:${String(session || "current")}`;
}

function setResultUploadState(key, label, tone = "loading") {
  if (!key) return;
  resultUploadStates.set(key, { label, tone });
  renderResultsAdminPanel();
}

function clearResultUploadState(key) {
  if (!key) return;
  resultUploadStates.delete(key);
  renderResultsAdminPanel();
}

function setSeriesImportState(label, tone = "loading") {
  seriesImportState = { label, tone };
  renderResultsAdminPanel();
}

function clearSeriesImportState() {
  seriesImportState = null;
  renderResultsAdminPanel();
}

function resultUploadBadgeHtml(uploadState) {
  if (!uploadState) return "";
  const tone = uploadState.tone || "loading";
  const label = uploadState.label || "Chargement en cours...";
  return `<span class="result-status-badge ${escapeHtml(tone)}">${escapeHtml(label)}</span>`;
}

function renderResultsAdminPanel() {
  if (!resultsAdminPanel) return;
  if (state.role !== "computer") {
    resultsAdminPanel.hidden = true;
    resultsAdminPanel.innerHTML = "";
    renderComputerFooterPanel();
    return;
  }
  const sessions = resultSessions();
  const activeSession = ensureResultsAdminSession();
  const rows = resultProgramRows(activeSession);
  const publicResultsOnline = data.notes?.publicResultsOnline !== false;
  resultsAdminPanel.hidden = false;
  resultsAdminPanel.innerHTML = `
    <div class="panel-title">
      <div>
        <h3>Publication des résultats</h3>
        <p class="panel-subtitle">Import PDF, publication publique et suivi des finalistes.</p>
      </div>
      <div class="results-admin-actions">
        ${seriesImportState ? resultUploadBadgeHtml(seriesImportState) : ""}
        ${sessions.length ? `
          <label class="results-session-select">
            <span>Session</span>
            <select id="resultsAdminSessionSelect" aria-label="Session des résultats">
              ${sessions.map((session) => `
                <option value="${escapeHtml(session.number)}" ${activeSession === session.number ? "selected" : ""}>S${escapeHtml(session.number)}</option>
              `).join("")}
            </select>
          </label>
        ` : ""}
        <button class="ghost-button compact" type="button" data-public-session-infos>Informations</button>
        <button class="ghost-button compact" type="button" data-computer-admin-series ${seriesImportState?.tone === "loading" ? "disabled" : ""}>Importer séries</button>
        <button class="public-online-toggle ${publicResultsOnline ? "online" : "offline"}" type="button" data-public-results-online-toggle aria-pressed="${publicResultsOnline ? "true" : "false"}">
          <span></span>${publicResultsOnline ? "Page publique en ligne" : "Page publique hors ligne"}
        </button>
        <a class="ghost-button compact" href="resultats.html?v=20260520-session-infos-light" target="_blank" rel="noopener">Page publique</a>
      </div>
    </div>
    <div class="results-admin-list">
      ${rows.length ? rows.map((row) => renderResultProgramRow(row)).join("") : `<p class="panel-subtitle">Aucune course trouvée dans le programme.</p>`}
      ${renderSessionResultsImportRow(activeSession)}
    </div>
  `;
  renderComputerFooterPanel();
}

function diagnosticItem(label, value, status = "ok") {
  return `
    <span class="diagnostic-item ${escapeHtml(status)}">
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(label)}</small>
    </span>
  `;
}

function renderCompetitionDiagnostic() {
  const sessions = sessionRows();
  const programCount = data.program?.length || 0;
  const resultCount = raceResults.length;
  const publicResultCount = raceResults.filter((result) => !result.hasFinal || result.finalistsAnnouncedAt).length;
  const seriesPdfCount = Array.isArray(data.notes?.publicSeriesPdfs) ? data.notes.publicSeriesPdfs.length : 0;
  const pendingAlerts = alerts.filter((alert) => (
    alert.speakerStatus === "pending" ||
    alert.videoStatus === "pending" ||
    alert.informaticsStatus === "pending" ||
    alert.secretaryStatus === "pending"
  )).length;
  const speakerInfoUpdatedAt = data.notes?.speakerInfoUpdatedAt || "";
  return `
    <div class="competition-diagnostic" aria-label="Diagnostic compétition">
      ${diagnosticItem("sessions", String(sessions.length || 0), sessions.length ? "ok" : "warn")}
      ${diagnosticItem("courses programme", String(programCount), programCount ? "ok" : "warn")}
      ${diagnosticItem("lignes séries", String(data.series?.length || 0), data.series?.length ? "ok" : "warn")}
      ${diagnosticItem("résultats publiés", `${publicResultCount}/${resultCount}`, resultCount ? "ok" : "neutral")}
      ${diagnosticItem("PDF séries publics", String(seriesPdfCount), seriesPdfCount ? "ok" : "neutral")}
      ${diagnosticItem("actions en attente", String(pendingAlerts), pendingAlerts ? "warn" : "ok")}
      ${diagnosticItem("repères speaker", speakerInfoUpdatedAt || "non faits", speakerInfoUpdatedAt ? "ok" : "warn")}
    </div>
  `;
}

function renderComputerFooterPanel() {
  if (!computerFooterPanel) return;
  if (state.role !== "computer") {
    computerFooterPanel.hidden = true;
    computerFooterPanel.innerHTML = "";
    return;
  }
  computerFooterPanel.hidden = false;
  computerFooterPanel.innerHTML = `
    ${renderCompetitionDiagnostic()}
    <div class="results-admin-danger-zone">
      <button class="ghost-button compact danger-button" type="button" data-results-reset>RAZ</button>
    </div>
  `;
}

function renderSessionResultsImportRow(activeSession) {
  const published = sessionResultsPdfsForAdminSession(activeSession);
  const latest = published[0];
  const uploadState = resultUploadStates.get(resultUploadKeyForSessionResults(activeSession));
  const blockingUpload = uploadState && uploadState.tone !== "error";
  return `
    <div class="result-admin-row session-results-import-row ${latest ? "published" : ""} ${uploadState ? "waiting" : ""}">
      <div>
        <strong>${activeSession ? `S${escapeHtml(activeSession)} · ` : ""}Résultats complets de session</strong>
        <span>${uploadState ? (uploadState.tone === "error" ? "Le PDF n'a pas pu être envoyé. Tu peux réessayer." : "Le PDF est en cours d'envoi vers la page publique.") : (latest ? escapeHtml([latest.sourceLabel, latest.pdfName].filter(Boolean).join(" - ")) : "Dépôt simple d'un PDF complet, sans lecture des finalistes.")}</span>
        ${!uploadState && latest?.updatedAt ? `<small class="result-admin-note result-definitive-note">Mis à jour le ${escapeHtml(new Date(latest.updatedAt).toLocaleString("fr-FR"))}</small>` : ""}
      </div>
      <div class="result-admin-row-actions">
        ${uploadState ? resultUploadBadgeHtml(uploadState) : ""}
        ${blockingUpload ? "" : `
          <button class="result-status-badge ${latest ? "done" : "missing"} status-action" type="button" data-session-results-import="${escapeHtml(activeSession || "")}">
            ${latest ? "Remplacer PDF complet" : "Importer PDF complet"}
          </button>
        `}
      </div>
    </div>
  `;
}

function renderResultProgramRow(row) {
  const result = resultForProgramRow(row);
  const uploadState = resultUploadStates.get(resultUploadKeyForProgram(row));
  const blockingUpload = uploadState && uploadState.tone !== "error";
  const status = resultStatusForProgramRow(row);
  const event = data.events.find((item) => item.id === row.eventId);
  const phaseLabel = resultPhaseLabelForProgramRow(row);
  const finalistCount = finalRowsCount(result?.finalists);
  const isFinalCompositionDefinitive = finalCompositionIsDefinitive(result);
  const definitiveDate = result?.hasFinal && !isFinalCompositionDefinitive
    ? finalCompositionDefinitiveDate(result)
    : null;
  const statusBadge = resultStatusBadgeForProgramRow(row, result, isFinalCompositionDefinitive);
  const definitiveLabel = result?.hasFinal && !isFinalCompositionDefinitive
    ? (definitiveDate ? `Définitif à partir de ${formatDeadlineTime(definitiveDate)}` : finalCompositionPendingDeadlineLabel(result))
    : "";
  return `
    <div class="result-admin-row ${result ? "published" : ""} ${result?.hasFinal && !result.finalistsAnnouncedAt ? "waiting" : ""} ${uploadState ? "waiting" : ""}">
      <div>
        <strong>${row.session ? `S${escapeHtml(row.session)} · ` : ""}${escapeHtml(event?.label || row.label || row.eventId)} ${escapeHtml(sexDisplayLabel(row.sex))} - ${escapeHtml(phaseLabel)}</strong>
        <span>${uploadState ? (uploadState.tone === "error" ? "Le PDF n'a pas pu être envoyé. Tu peux réessayer." : "Le PDF est en cours d'envoi vers la page publique.") : escapeHtml([row.startTime, status, result?.pdfName].filter(Boolean).join(" - "))}</span>
        ${!blockingUpload && result?.hasFinal ? `<em>${escapeHtml(String(finalistCount))} finaliste${finalistCount > 1 ? "s" : ""} détecté${finalistCount > 1 ? "s" : ""}</em>` : ""}
        ${!blockingUpload && definitiveLabel ? `<small class="result-admin-note result-definitive-note">${escapeHtml(definitiveLabel)}</small>` : ""}
        ${!blockingUpload && result?.hasFinal && !result.finalistsAnnouncedAt ? `<small class="result-admin-note">PDF et finalistes masqués côté public jusqu'à l'annonce speaker.</small>` : ""}
      </div>
      <div class="result-admin-row-actions">
        ${uploadState ? resultUploadBadgeHtml(uploadState) : ""}
        ${blockingUpload ? "" : resultStatusControlHtml(row, result, statusBadge)}
        ${!blockingUpload && result ? `
          <button class="ghost-button compact confirm-button" type="button" data-result-import="${escapeHtml(programKey(row))}">
            Remplacer
          </button>
        ` : ""}
        ${!blockingUpload && result ? `
          <button class="ghost-button compact danger-button" type="button" data-result-delete="${escapeHtml(result.id)}">
            Supprimer
          </button>
        ` : ""}
      </div>
    </div>
  `;
}

function formatDeadlineTime(date) {
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", "h");
}

function finalistAnnouncedAt(row, result) {
  if (row?.repechaged) return row.repechageAnnouncedAt || "";
  return row?.announcedAt || result?.finalistsAnnouncedAt || "";
}

function finalWithdrawalLimitDate(row, result) {
  const announcedAt = finalistAnnouncedAt(row, result);
  if (!announcedAt) return null;
  const date = new Date(new Date(announcedAt).getTime() + 30 * 60 * 1000);
  if (Number.isNaN(date.getTime())) return "";
  return date;
}

function finalWithdrawalLimitLabel(row, result) {
  const date = finalWithdrawalLimitDate(row, result);
  return date ? formatDeadlineTime(date) : "";
}

function canWithdrawFinalist(row, result, now = new Date()) {
  if (row?.withdrawnAt) return false;
  const limit = finalWithdrawalLimitDate(row, result);
  return Boolean(limit) && now <= limit;
}

function hasFinalWithdrawalDeadline(row, result) {
  return Boolean(finalWithdrawalLimitDate(row, result));
}

function canWithdrawBeforeReplacementAnnouncement(row) {
  return Boolean(row?.repechaged && !row.repechageAnnouncedAt && !row.withdrawnAt);
}

function isFinalWithdrawalDeadlineExpired(row, result, now = new Date()) {
  const limit = finalWithdrawalLimitDate(row, result);
  return Boolean(limit) && now > limit;
}

function finalRowCountsAsFinalist(row) {
  if (!row || row.withdrawnAt || row.resultStatus) return false;
  const statusText = [row.statusLabel, row.status, row.motif, row.note].filter(Boolean).join(" ");
  return !resultStatusFromText(statusText);
}

function finalRowsCount(finalists = {}) {
  return ["a", "b"].reduce((count, key) => count + (finalists[key] || []).filter(finalRowCountsAsFinalist).length, 0);
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
  secretaryFinalsPanel.hidden = false;
  secretaryFinalsPanel.innerHTML = `
    <div class="panel-title">
      <div>
        <h3>Forfaits finales</h3>
        <p class="panel-subtitle">Gestion par le secrétariat après annonce officielle des finalistes.</p>
      </div>
      <a class="ghost-button compact" href="resultats.html?v=20260519-public-offline-footer" target="_blank" rel="noopener">Page publique</a>
    </div>
    <div class="secretary-finals-list">
      ${finals.length ? finals.map((result) => {
        const announced = Boolean(result.finalistsAnnouncedAt);
        const withdrawals = (result.finalWithdrawals || []).length;
        return `
          <article class="secretary-final-card ${announced ? "" : "pending"}">
            <div>
              <strong>${escapeHtml(result.eventLabel || result.eventId)} ${escapeHtml(result.sexLabel || sexDisplayLabel(result.sex))}</strong>
              <span>${escapeHtml([result.session ? `S${result.session}` : "", result.startTime, announced ? "Forfaits ouverts par nageur" : "En attente annonce speaker"].filter(Boolean).join(" - "))}</span>
              <em>${escapeHtml(String(finalRowsCount(result.finalists)))} finaliste${finalRowsCount(result.finalists) > 1 ? "s" : ""}${withdrawals ? ` - ${withdrawals} forfait${withdrawals > 1 ? "s" : ""}` : ""}</em>
            </div>
            <button class="ghost-button compact confirm-button" type="button" data-final-withdrawals="${escapeHtml(result.id)}" ${announced ? "" : "disabled"}>
              Gérer forfaits
            </button>
          </article>
        `;
      }).join("") : `<p class="panel-subtitle">Aucune finale publiée pour le moment.</p>`}
    </div>
  `;
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
  const status = alertStatusLabel(alert);
  const timeline = alertTimeline(alert);
  const event = data.events.find((item) => item.id === alert.eventId);
  const sexLabel = alert.sex === "F" ? "Femmes" : (alert.sex === "M" ? "Hommes" : "Mixte");
  const isFinalAnnouncement = alert.type === "finalists_announcement" || alert.type === "finalist_replacement_announcement";
  const seriesLabel = alert.type === "final_composition_ready"
    ? "Finales"
    : isFinalAnnouncement
    ? "Finales"
    : alert.stage && isFinalStage(alert.stage)
    ? finalStageLabel(alert.stage)
    : `Série ${alert.series || "-"}`;
  const courseLine = alert.type === "final_composition_ready"
    ? `${alert.eventLabel || event?.label || alert.eventId} ${alert.sexLabel || sexLabel} - Composition finale`
    : isFinalAnnouncement
    ? `${alert.eventLabel || event?.label || alert.eventId} ${alert.sexLabel || sexLabel} - ${seriesLabel}`
    : `${event?.label || alert.eventId} ${sexLabel} - ${seriesLabel} - Ligne ${alert.line || "-"}`;
  const motif = decisionMotifLabel(alert);
  const identity = alert.type === "finalists_announcement"
    ? `${alert.finalistCount || 0} finaliste${Number(alert.finalistCount || 0) > 1 ? "s" : ""}`
    : options.showIdentity ? fullAlertIdentityLabel(alert) : alertIdentityLabel(alert);
  const action = historyActionForAlert(alert);
  const comment = alertCommentLabel(alert);
  return `
    <div class="history-item ${alertStatusClass(alert)} ${options.compact ? "compact-history-item" : ""}" data-history-alert-id="${escapeHtml(alert.id)}">
      <time>${escapeHtml(formatAlertTime(options.timeValue || alert.cancelledAt || alert.createdAt) || "--:--")}</time>
      <span>${escapeHtml(courseLine)}</span>
      <strong>${escapeHtml(motif)}</strong>
      <small>${escapeHtml(identity)}</small>
      ${comment ? `<em class="history-comment">Remarque JA : ${escapeHtml(comment)}</em>` : ""}
      <em>${escapeHtml(status)}${timeline ? ` - ${escapeHtml(timeline)}` : ""}</em>
      ${action ? `<button class="history-action ${escapeHtml(action.className)}" type="button" data-history-action="${escapeHtml(action.action)}">${escapeHtml(action.label)}</button>` : ""}
    </div>
  `;
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
  alertDetailModal.innerHTML = `
    <div class="decision-dialog alert-detail-dialog" role="dialog" aria-modal="true" aria-label="${escapeHtml(sheetTitle)}">
      <div class="decision-modal-head">
        <div>
          <span>${escapeHtml(sheetTitle)}</span>
          <h2>${escapeHtml(decisionMotifLabel(alert))}</h2>
          <p>${escapeHtml(identity)}</p>
          <p class="decision-race-info">${escapeHtml(courseLabel)}${hasSeriesLine ? ` - ${escapeHtml(seriesLineLabel)}` : ""}</p>
        </div>
        <button class="icon-button decision-close" type="button" data-close-alert-detail aria-label="Fermer">×</button>
      </div>
      <div class="alert-detail-status ${alertStatusClass(alert)}">
        <strong>${escapeHtml(status)}</strong>
      </div>
      <div class="alert-detail-grid">
        <div><span>Course</span><strong>${escapeHtml(courseLabel)}</strong></div>
        ${hasSeriesLine ? `<div><span>Série - Ligne</span><strong>${escapeHtml(seriesLineLabel)}</strong></div>` : ""}
        <div><span>Concurrent</span><strong>${escapeHtml(identity)}</strong></div>
        <div><span>Motif</span><strong>${escapeHtml(decisionMotifLabel(alert))}</strong></div>
      </div>
      ${comment ? `<div class="alert-detail-note"><span>Remarque</span><strong>${escapeHtml(comment)}</strong></div>` : ""}
      ${speakerSentence ? `<div class="alert-detail-note"><span>Texte speaker</span><strong>${escapeHtml(speakerSentence.text)} - ${escapeHtml(speakerSentence.identity)}</strong></div>` : ""}
      ${clickedSentence ? `<div class="alert-detail-note"><span>Alerte en cours</span><strong>${escapeHtml(clickedSentence.text)} - ${escapeHtml(clickedSentence.identity)}</strong></div>` : ""}
      <div class="alert-detail-timeline">
        <h3>Historique</h3>
        ${timeline.length ? timeline.map(([label, value]) => `
          <div class="alert-timeline-row">
            <time>${escapeHtml(formatAlertDateTime(value) || "--")}</time>
            <strong>${escapeHtml(label)}</strong>
          </div>
        `).join("") : `<p class="panel-subtitle">Aucun historique disponible.</p>`}
      </div>
    </div>
  `;
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
  alertDetailModal.innerHTML = `
    <div class="decision-dialog alert-detail-dialog finalists-announcement-dialog" role="dialog" aria-modal="true" aria-label="Finalistes à annoncer">
      <div class="decision-modal-head">
        <div>
          <span>Annonce speaker</span>
          <h2>Finalistes à annoncer</h2>
          <p>${escapeHtml(alert.eventLabel || alert.eventId)} ${escapeHtml(alert.sexLabel || sexDisplayLabel(alert.sex))}</p>
        </div>
        <button class="icon-button decision-close" type="button" data-close-alert-detail aria-label="Fermer">×</button>
      </div>
      <div class="alert-detail-note finalists-speaker-text">
        <span>Texte speaker</span>
        <strong>${escapeHtml(speakerText)}</strong>
      </div>
      ${renderFinalistsAlertList(alert)}
      <div class="decision-actions">
        <button class="ghost-button" type="button" data-close-alert-detail>Fermer</button>
        ${canMarkAnnounced ? `<button class="primary-button" type="button" data-finalists-announced="${escapeHtml(alert.id)}">Annoncé</button>` : ""}
      </div>
    </div>
  `;
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
  decisionPanel.innerHTML = `
    <h3>Décision juge arbitre</h3>
    <p class="panel-subtitle">${entrant && modalOpen ? `${escapeHtml(formatDisplayName(entrant))} sélectionné. La fenêtre de décision est ouverte.` : "Clique sur une ligne de la série pour créer une décision."}</p>
  `;
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
  const activeDecisionActions = activeDecisions.length ? `
    <div class="decision-existing">
      <strong>Décision déjà saisie sur cette ligne</strong>
      ${activeDecisions.map((alert) => `
        <div class="decision-existing-row">
          <span>${escapeHtml(decisionMotifLabel(alert))}</span>
          <button class="ghost-button compact danger-button" type="button" data-cancel-active-decision="${escapeHtml(alert.id)}">Annuler cette DSQ</button>
        </div>
      `).join("")}
    </div>
  ` : "";
  const options = decisionOptionsForEntrant(entrant)
    .map(([value, label]) => `
      <button class="decision-choice ${decisionDraft.type === value ? "active" : ""}" type="button" data-decision-type="${escapeHtml(value)}">
        ${escapeHtml(label)}
      </button>
    `)
    .join("");
  const relayLegButtons = (from, to) => Array.from({ length: Math.max(0, to - from + 1) }, (_, index) => from + index)
    .map((leg) => `<button class="decision-extra-button ${String(decisionDraft.relayLeg) === String(leg) ? "active" : ""}" type="button" data-relay-leg="${leg}">Relayeur ${leg}</button>`)
    .join("");
  const lengthSelector = `
    <div class="decision-extra">
      <p>${relay ? "Où la coulée du relayeur a-t-elle été constatée ?" : "Où la coulée a-t-elle été constatée ?"}</p>
      <div class="decision-extra-buttons">
        <button class="decision-extra-button ${decisionDraft.lengthType === "start" ? "active" : ""}" type="button" data-length-type="start">Au départ</button>
        <button class="decision-extra-button ${decisionDraft.lengthType === "length" ? "active" : ""}" type="button" data-length-type="length">Longueur n°</button>
      </div>
      <label class="decision-length-input ${decisionDraft.lengthType === "length" ? "" : "muted-field"}">
        Numéro de longueur
        <span class="length-stepper">
          <button class="stepper-button" type="button" data-length-step="-1" ${decisionDraft.lengthType === "length" ? "" : "disabled"}>−</button>
          <input id="modalLengthNumber" type="text" inputmode="numeric" pattern="[0-9]*" value="${escapeHtml(decisionDraft.lengthNumber || "1")}" ${decisionDraft.lengthType === "length" ? "" : "disabled"}>
          <button class="stepper-button" type="button" data-length-step="1" ${decisionDraft.lengthType === "length" ? "" : "disabled"}>+</button>
        </span>
      </label>
    </div>
  `;
  let extra = "";
  if (decisionNeedsRelayLeg(decisionDraft.type, entrant)) {
    const firstLeg = decisionDraft.type === "relay_early_start" ? 2 : 1;
    extra = `
      <div class="decision-extra">
        <p>Quel relayeur est concerné ?</p>
        <div class="decision-extra-buttons">${relayLegButtons(firstLeg, legCount)}</div>
      </div>
      ${decisionDraft.type === "underwater_15m" ? lengthSelector : ""}
    `;
  } else if (decisionDraft.type === "underwater_15m") {
    extra = lengthSelector;
  }
  decisionModal.hidden = false;
  decisionModal.innerHTML = `
    <div class="decision-dialog" role="dialog" aria-modal="true" aria-label="Décision juge arbitre">
      <div class="decision-modal-head">
        <div>
          <span>Décision JA</span>
          <div class="decision-title-line">
            <span class="lane decision-line-pill" title="Ligne ${escapeHtml(String(modalLineLabel))}">${escapeHtml(String(modalLineLabel))}</span>
            <h2>${escapeHtml(formatDisplayName(entrant))}</h2>
          </div>
          <p class="decision-race-info">${escapeHtml(modalRaceInfo)}</p>
        </div>
        <button class="icon-button decision-close" type="button" data-close-decision aria-label="Fermer">×</button>
      </div>
      ${activeDecisionActions}
      <div class="decision-choice-grid">${options}</div>
      ${extra}
      <label class="decision-comment">
        Remarque optionnelle
        <textarea id="modalDecisionComment" placeholder="Précision utile si besoin">${escapeHtml(decisionDraft.comment)}</textarea>
      </label>
      <div class="decision-modal-actions">
        <button class="ghost-button" type="button" data-close-decision>Annuler</button>
        <button class="primary-button" type="button" data-submit-decision ${decisionDraftIsReady(entrant) ? "" : "disabled"}>Valider la décision</button>
      </div>
    </div>
  `;
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
  roleQueue.innerHTML = `
    <h3>${title}</h3>
    <div class="queue-list">
      ${rows.length ? rows.map(renderQueueItem).join("") : `<p class="panel-subtitle">Aucune information en attente.</p>`}
    </div>
  `;
}

function renderQueueItem(alert) {
  if (state.role === "secretary" && alert.type === "forfait" && alert.secretaryStatus === "pending") {
    const detail = alertCommentLabel(alert);
    return `
      <div class="queue-item urgent-queue-item" data-alert-id="${escapeHtml(alert.id)}">
        <div>
          <strong class="alert-title"><span aria-hidden="true">!</span> Forfait non déclaré à prendre en note <small>${escapeHtml(formatAlertTime(alert.createdAt) || "")}</small></strong>
          <strong>${escapeHtml(alertRaceLabel(alert))}</strong>
          <span>${escapeHtml(`${alertSwimmerLabel(alert)}${detail ? ` - ${detail}` : ""}`)}</span>
        </div>
        <div class="queue-actions">
          <button class="ghost-button compact confirm-button" type="button" data-queue-action="done-secretary">Pris note</button>
        </div>
      </div>
    `;
  }
  if (state.role === "secretary" && (alert.type === "finalists_announcement" || alert.type === "finalist_replacement_announcement")) {
    const label = alert.type === "finalist_replacement_announcement"
      ? "Repêchage en attente d'annonce speaker"
      : "Finalistes en attente d'annonce speaker";
    const detail = alert.type === "finalist_replacement_announcement" && alert.replacementName
      ? `Repêché(e) : ${alert.replacementName}${alert.replacementClub ? ` - ${alert.replacementClub}` : ""}`
      : "Le secrétariat peut relancer le speaker si l'annonce tarde.";
    return `
      <div class="queue-item video-info-card" data-alert-id="${escapeHtml(alert.id)}">
        <div>
          <strong class="alert-title secretary-info-title"><span aria-hidden="true">i</span> ${escapeHtml(label)} <small>${escapeHtml(formatAlertTime(alert.createdAt) || "")}</small></strong>
          <strong class="secretary-info-race">${escapeHtml(alert.eventLabel || alert.eventId)} ${escapeHtml(alert.sexLabel || sexDisplayLabel(alert.sex))}</strong>
          <span class="secretary-info-detail">${escapeHtml(detail)}</span>
        </div>
      </div>
    `;
  }
  if (alert.type === "final_composition_ready") {
    return `
      <div class="queue-item final-composition-item" data-alert-id="${escapeHtml(alert.id)}">
        <div>
          <strong class="alert-title"><span aria-hidden="true">i</span> Composition finale définitive <small>${escapeHtml(formatAlertTime(alert.createdAt) || "")}</small></strong>
          <strong>${escapeHtml(alert.eventLabel || alert.eventId)} ${escapeHtml(alert.sexLabel || sexDisplayLabel(alert.sex))}</strong>
          <span>La composition de la ou des finales est définitive.</span>
        </div>
        <div class="queue-actions">
          <button class="ghost-button compact confirm-button" type="button" data-final-composition-open="${escapeHtml(alert.id)}">Voir les qualifiés et forfaits</button>
        </div>
      </div>
    `;
  }
  const videoActions = state.role === "video"
    ? `<button class="ghost-button compact confirm-button" type="button" data-queue-action="confirm-video">Confirmer DSQ</button>
       <button class="ghost-button compact danger-button" type="button" data-queue-action="reject-video">Invalider</button>`
    : "";
  const computerActions = state.role === "computer"
    ? `<button class="ghost-button compact confirm-button" type="button" data-queue-action="done-computer">Traité</button>`
    : "";
  const title = state.role === "video" ? "Demande arbitrage vidéo à traiter" : "Décision à saisir";
  const detail = alertCommentLabel(alert);
  const identityLine = state.role === "video"
    ? ""
    : `${alertSwimmerLabel(alert)}${detail ? ` - ${detail}` : ""}`;
  return `
    <div class="queue-item urgent-queue-item" data-alert-id="${escapeHtml(alert.id)}">
      <div>
        <strong class="alert-title"><span aria-hidden="true">!</span> ${escapeHtml(title)} <small>${escapeHtml([formatAlertTime(alert.createdAt)].filter(Boolean).join(""))}</small></strong>
        <strong>${escapeHtml(decisionMotifLabel(alert))}</strong>
        <span>${escapeHtml(alertRaceLabel(alert))}</span>
        ${identityLine ? `<span>${escapeHtml(identityLine)}</span>` : ""}
      </div>
      <div class="queue-actions">${videoActions}${computerActions}</div>
    </div>
  `;
}

function updateAlert(alertId, changes) {
  const index = alerts.findIndex((alert) => alert.id === alertId);
  if (index === -1) return;
  alerts[index] = { ...alerts[index], ...changes, updatedAt: new Date().toISOString() };
  saveAlerts();
  syncAlertToFirestore(alerts[index]);
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

function renderDataStatus(message = "") {
  if (!dataStatus) return;
  renderFirebaseHeaderStatus();
  if (state.role !== "computer") {
    dataStatus.hidden = true;
    dataStatus.innerHTML = "";
    return;
  }
  dataStatus.classList.remove("warning", "source");
  if (message) {
    dataStatus.hidden = false;
    dataStatus.textContent = message;
    dataStatus.classList.add("warning");
    return;
  }
  if (state.role === "computer") {
    dataStatus.hidden = true;
    dataStatus.innerHTML = "";
    return;
  }
  if (data.sourceVersion) {
    const seriesSource = data.notes?.sourceLabel || "Données officielles chargées";
    const sourceFile = data.notes?.sourceFile || "";
    const speakerSource = data.notes?.speakerInfoSource
      ? `${data.notes.speakerInfoSource}${data.notes.speakerInfoUpdatedAt ? ` - ${data.notes.speakerInfoUpdatedAt}` : ""}`
      : "non mis à jour";
    const firebaseMeta = firebaseStatusMeta();
    const firebaseLabel = firebaseStatus === "local" ? "local seulement" : firebaseMeta.label.toLowerCase();
    const firebaseClass = firebaseMeta.className;
    const generatedAt = data.notes?.generatedAt || "";
    const seriesCount = data.notes?.seriesLineCount || data.series?.length || 0;
    const entrantTotal = data.notes?.entrantCount || data.entrants?.length || 0;
    const updatedSession = data.notes?.lastImportedMode === "Mise à jour session" && data.notes?.lastUpdatedSession
      ? `session ouverte par défaut : S${data.notes.lastUpdatedSession}`
      : "session ouverte par défaut : S1";
    const history = Array.isArray(data.notes?.importHistory) ? data.notes.importHistory.slice(-4).reverse() : [];
    dataStatus.hidden = false;
    dataStatus.innerHTML = `
      <span><strong>Séries</strong> ${escapeHtml(seriesSource)}${sourceFile ? ` - ${escapeHtml(sourceFile)}` : ""}</span>
      <span><strong>Infos speaker</strong> ${escapeHtml(speakerSource)}</span>
      <span><strong>Actualisation</strong> ${competitionModeEnabled() ? "directe" : "manuelle"}</span>
      <span><strong>Codes</strong> ${pinLockEnabled() ? "actifs" : "inactifs"}</span>
      <span><i class="firebase-dot ${firebaseClass}" aria-hidden="true"></i><strong>Firebase</strong> ${escapeHtml(firebaseLabel)}</span>
      <span>${escapeHtml(String(entrantTotal))} engagements</span>
      <span>${escapeHtml(String(seriesCount))} lignes de séries</span>
      <span>${escapeHtml(updatedSession)}</span>
      ${generatedAt ? `<span>mise à jour ${escapeHtml(generatedAt)}</span>` : ""}
      ${history.length ? `<span class="status-history"><strong>Historique</strong> ${history.map((item) => escapeHtml(item)).join(" | ")}</span>` : ""}
    `;
    dataStatus.classList.add("source");
    return;
  }
  dataStatus.hidden = false;
  dataStatus.textContent = "Données officielles non chargées. Sur GitHub Pages, vérifie que data.generated.js et donnees-speaker-france-2026.json sont bien publiés.";
  dataStatus.classList.add("warning");
}

function firebaseStatusMeta() {
  if (firebaseStatus === "connected") {
    return { label: competitionModeEnabled() ? "Direct actif" : "Connecté", className: "ok" };
  }
  if (firebaseStatus === "error") {
    return { label: "Connexion interrompue", className: "error" };
  }
  if (firebaseStatus === "offline") {
    return { label: "Connexion interrompue", className: "error" };
  }
  if (firebaseStatus === "local") {
    return { label: "Local", className: "pending" };
  }
  if (firebaseStatus === "manual") {
    return { label: "Actualisation manuelle", className: "pending" };
  }
  return { label: "Connexion", className: "pending" };
}

function renderFirebaseHeaderStatus() {
  if (!firebaseHeaderStatus) return;
  const meta = firebaseStatusMeta();
  firebaseHeaderStatus.className = `firebase-header-status ${meta.className}`;
  firebaseHeaderStatus.innerHTML = `<i class="firebase-dot ${meta.className}" aria-hidden="true"></i>${escapeHtml(meta.label)}`;
  firebaseHeaderStatus.title = firebaseStatus === "error" || firebaseStatus === "offline"
    ? "Connexion interrompue - les actions peuvent ne pas être synchronisées."
    : meta.label;
}

function shortStatusDate() {
  return new Date().toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function appendImportHistory(notes, label) {
  const history = Array.isArray(notes?.importHistory) ? notes.importHistory.slice(-7) : [];
  return [...history, `${shortStatusDate()} - ${label}`].slice(-8);
}

function showDataDiagnostic() {
  const sessions = sessionRows().map((session) => `S${session.number}`).join(", ") || "aucune";
  const seriesCount = data.series?.length || 0;
  const programCount = data.program?.length || 0;
  const entrantCount = data.entrants?.length || 0;
  const locations = (data.entrants || []).filter((entrant) => entrant.seedSource).length;
  const firebaseMeta = firebaseStatusMeta();
  const firebaseLabel = firebaseStatus === "local" ? "local seulement" : firebaseMeta.label.toLowerCase();
  window.alert([
    "Diagnostic LivePalmes",
    "",
    `Firebase : ${firebaseLabel}`,
    `Sessions : ${sessions}`,
    `Programme : ${programCount} courses`,
    `Séries : ${seriesCount} lignes`,
    `Engagés : ${entrantCount}`,
    `Records : ${data.records?.length || 0}`,
    `Qualifs EDF : ${data.qualifications?.length || 0}`,
    `Membres EDF : ${data.edfMembers?.length || 0}`,
    `France N-1 : ${data.top2025?.length || 0}`,
    `Lieux rattachés : ${locations}`,
    `Dernière mise à jour session : ${data.notes?.lastUpdatedSession ? `S${data.notes.lastUpdatedSession}` : "aucune"}`,
    `Infos speaker : ${data.notes?.speakerInfoUpdatedAt || "non mises à jour"}`
  ].join("\n"));
}

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
  programModal.innerHTML = `
    <div class="decision-dialog program-dialog ${compactProgram ? "compact-program-dialog" : ""}" role="dialog" aria-modal="true" aria-label="Programme">
      <div class="decision-modal-head">
        <div>
          <span>Avancement</span>
          <h2>Programme simplifié</h2>
          <p>${compactProgram ? (viewState.session === "all" ? "Toutes les sessions" : `Session ${escapeHtml(viewState.session)}`) : `${viewState.session === "all" ? "Toutes les sessions" : `Session ${escapeHtml(viewState.session)}`} - courses, séries et horaires indicatifs.`}</p>
          ${state.role === "referee" ? `<p class="speaker-program-marker">${escapeHtml(speakerProgramPositionLabel())}</p>` : ""}
        </div>
        <button class="decision-close" type="button" data-program-close aria-label="Fermer">×</button>
      </div>
      <div class="program-list">
        ${rows.length ? rows.map((row) => {
          const event = data.events.find((item) => item.id === row.eventId);
          const rowKey = raceOptionKey(row.eventId, row.sex);
          const rowCurrent = rowKey === currentKey && (!row.session || state.session === "all" || row.session === state.session);
          const items = programSeriesItems(row);
          return `
            <div class="program-row ${rowCurrent ? "current-race" : ""} ${programRowProgressClass(row)} ${readOnlyProgram ? "readonly-program-row" : ""}" data-program-row="${escapeHtml(programKey(row))}">
              <button class="program-race-button" type="button" ${readOnlyProgram ? "disabled" : `data-program-race="${escapeHtml(programKey(row))}"`}>
                <span>${row.session ? `S${escapeHtml(row.session)} · ` : ""}${escapeHtml(event?.label || row.label || row.eventId)} ${escapeHtml(sexDisplayLabel(row.sex))}${splitRaceNote(row.eventId, row.sex)}</span>
                ${row.startTime ? `<small>${escapeHtml(row.startTime)}</small>` : ""}
              </button>
              <div class="program-series-line">
                ${items.length ? items.map((item) => `
                  <button class="program-series-chip ${programItemIsCurrent(row, item) ? "current" : ""} ${programItemIsSpeakerCurrent(row, item) ? "speaker-current" : ""} ${programItemProgressClass(row, item)}" type="button" ${readOnlyProgram ? "disabled" : `data-program-race="${escapeHtml(programKey(row))}" data-program-series="${escapeHtml(item.series)}" data-program-stage="${escapeHtml(item.stage || "series")}"`}>
                    <strong>${escapeHtml(item.label)}</strong>${item.time ? `<span>${escapeHtml(item.time)}</span>` : ""}${programItemIsSpeakerCurrent(row, item) ? `<em>speaker</em>` : ""}${programItemProgressClass(row, item) === "ja-current" ? `<em>JA</em>` : ""}
                  </button>
                `).join("") : `<span class="no-series-note">Aucune série</span>`}
              </div>
            </div>
          `;
        }).join("") : `<p class="empty">Aucun programme disponible.</p>`}
      </div>
    </div>
  `;
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
  adminSeriesModal.innerHTML = `
    <div class="decision-dialog admin-series-dialog" role="dialog" aria-modal="true" aria-label="Administration des séries">
      <div class="decision-modal-head">
        <div>
          <span>Administration</span>
          <h2>Importer des séries PDF</h2>
          <p>Choisis si le PDF remplace toute la compétition ou seulement une session déjà publiée.</p>
        </div>
        <button class="decision-close" type="button" data-admin-series-close aria-label="Fermer">×</button>
      </div>
      <div class="admin-series-options">
        <label class="admin-series-option">
          <input type="radio" name="seriesImportMode" value="full" checked>
          <strong>PDF général de la compétition</strong>
          <span>Remplace toutes les séries, le programme, le titre de compétition et les engagés.</span>
        </label>
        <label class="admin-series-option">
          <input type="radio" name="seriesImportMode" value="session">
          <strong>PDF de mise à jour d'une session</strong>
          <span>Remplace uniquement la ou les sessions présentes dans le PDF, par exemple la session 2 avec finales.</span>
        </label>
      </div>
      <div class="admin-series-help">
        <strong>Repère rapide</strong>
        <span>PDF général : à utiliser au début de la compétition.</span>
        <span>Mise à jour session : remplace seulement la session choisie.</span>
      </div>
      <label class="admin-session-field" hidden>
        <span>Session à remplacer</span>
        <input id="seriesSessionOverride" type="number" min="1" max="20" inputmode="numeric" placeholder="ex. 2">
      </label>
      <label class="ghost-button admin-series-file" for="seriesPdfInput">Choisir le PDF</label>
      <input id="seriesPdfInput" class="hidden-file-input" type="file" accept="application/pdf">
    </div>
  `;
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
  resultImportModal.innerHTML = `
    <div class="decision-dialog admin-series-dialog" role="dialog" aria-modal="true" aria-label="Importer un résultat">
      <div class="decision-modal-head">
        <div>
          <span>Résultat de course</span>
          <h2>${escapeHtml(event?.label || row.label || row.eventId)} ${escapeHtml(sexDisplayLabel(row.sex))} - ${escapeHtml(phaseLabel)}</h2>
          <p>${escapeHtml([row.session ? `Session ${row.session}` : "", row.startTime || ""].filter(Boolean).join(" - ") || "Importer le PDF résultat")}</p>
        </div>
        <button class="decision-close" type="button" data-result-import-close aria-label="Fermer">×</button>
      </div>
      <div class="admin-series-options">
        ${protectedFinalists ? `
          <label class="admin-series-option warning-option">
            <input type="radio" name="resultFinalListMode" value="preserve" checked>
            <strong>Conserver les finalistes déjà annoncés</strong>
            <span>Remplace seulement le PDF résultat. Les forfaits, repêchages et délais restent inchangés.</span>
          </label>
          <label class="admin-series-option warning-option">
            <input type="radio" name="resultFinalListMode" value="overwrite">
            <strong>Écraser la liste des finalistes</strong>
            <span>Attention : relit le PDF et remplace la liste des finalistes, forfaits et repêchages.</span>
          </label>
        ` : `
          <label class="admin-series-option">
            <input type="radio" name="resultCompletionMode" value="complete" ${defaultPartial ? "" : "checked"}>
            <strong>Résultat complet</strong>
            <span>La course est terminée et le résultat peut être considéré comme officiel pour cette phase.</span>
          </label>
          <label class="admin-series-option">
            <input type="radio" name="resultCompletionMode" value="partial" ${defaultPartial ? "checked" : ""}>
            <strong>Résultat partiel</strong>
            <span>À utiliser pour une course avec séries lentes / rapides ou un résultat provisoire.</span>
          </label>
          ${isFinalResult ? "" : `<label class="admin-series-option">
            <input type="radio" name="resultFinalMode" value="no" checked>
            <strong>Sans finale</strong>
            <span>Le PDF est publié pour consultation, sans analyse des finalistes.</span>
          </label>
          <label class="admin-series-option">
            <input type="radio" name="resultFinalMode" value="yes">
            <strong>Avec finale</strong>
            <span>LivePalmes lit le PDF et détecte les lignes marquées en finale.</span>
          </label>`}
        `}
      </div>
      <label class="file-button admin-series-file">
        Choisir le PDF résultat
        <input id="resultPdfInput" type="file" accept="application/pdf" hidden>
      </label>
      <p class="panel-subtitle">Prototype : le PDF est stocké dans Firebase pour la page publique. Taille conseillée : 200 ko maximum.</p>
    </div>
  `;
}

function openSessionResultsImportModal(defaultSession = "") {
  if (!resultImportModal) return;
  currentResultImportRow = null;
  const sessions = resultSessions();
  const selectedSession = defaultSession || resultsAdminSession || sessions[0]?.number || "";
  currentSessionResultsImport = { defaultSession: selectedSession };
  resultImportModal.hidden = false;
  resultImportModal.innerHTML = `
    <div class="decision-dialog admin-series-dialog" role="dialog" aria-modal="true" aria-label="Importer des résultats complets">
      <div class="decision-modal-head">
        <div>
          <span>Résultats complets</span>
          <h2>PDF de consultation publique</h2>
          <p>À utiliser en fin de session, journée ou compétition. Le PDF n'est pas analysé.</p>
        </div>
        <button class="decision-close" type="button" data-result-import-close aria-label="Fermer">×</button>
      </div>
      <div class="admin-series-options">
        <label class="admin-series-option">
          <input type="radio" name="sessionResultsScope" value="current" checked>
          <strong>Session affichée ${selectedSession ? `S${escapeHtml(selectedSession)}` : ""}</strong>
          <span>Le PDF sera visible uniquement sur cette session.</span>
        </label>
        <label class="admin-series-option">
          <input type="radio" name="sessionResultsScope" value="multiple">
          <strong>Plusieurs sessions</strong>
          <span>Choisir les sessions concernées par le PDF.</span>
        </label>
        <div class="session-results-checkboxes" hidden>
          ${sessions.map((session) => `
            <label>
              <input type="checkbox" name="sessionResultsSession" value="${escapeHtml(session.number)}" ${session.number === selectedSession ? "checked" : ""}>
              S${escapeHtml(session.number)}
            </label>
          `).join("")}
        </div>
        <label class="admin-series-option">
          <input type="radio" name="sessionResultsScope" value="full">
          <strong>Résultats complets de la compétition</strong>
          <span>Le PDF sera visible sur toutes les sessions de la page publique.</span>
        </label>
      </div>
      <label class="file-button admin-series-file">
        Choisir le PDF résultats
        <input id="sessionResultsPdfInput" type="file" accept="application/pdf">
      </label>
    </div>
  `;
}

function closeResultImportModal() {
  if (!resultImportModal) return;
  resultImportModal.hidden = true;
  resultImportModal.innerHTML = "";
  currentResultImportRow = null;
  currentSessionResultsImport = null;
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Lecture du fichier impossible."));
    reader.readAsDataURL(file);
  });
}

function parseResultRow(line) {
  const text = fixPdfEncoding(String(line || "")).replace(/\s+/g, " ").trim();
  const match = text.match(/^\s*(\d+)\s+(.+?)\s+(\d{2})\s+([A-Z0-9]+)\s+(\(.*?finale.*?\)\s+)?([0-9:.]+)(?:\s+\d+)?(?:\s+[A-Z0-9]+)?\s*$/i);
  if (!match) return null;
  const split = splitImportedPersonName(fixPdfEncoding(match[2]));
  return {
    rank: Number(match[1]),
    lastName: split.lastName,
    firstName: split.firstName,
    displayName: formatDisplayName({ lastName: split.lastName, firstName: split.firstName }),
    birthYear: importedBirthYear(match[3]),
    club: match[4],
    time: importedSeriesTime(match[6]) || match[6],
    qualified: Boolean(match[5])
  };
}

function resultStatusFromText(value) {
  const text = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (/\b(dns|ns|absent|abs)\b/.test(text)) return "dns";
  if (/\b(abandon|abd|ab|dnf)\b/.test(text)) return "ab";
  if (/\b(disqualification|disqualifie|disqualifiee|dsq|dq)\b/.test(text)) return "dsq";
  if (/\b(forfait)\b/.test(text)) return "dns";
  return "";
}

function parseResultStatusRow(line) {
  const text = fixPdfEncoding(String(line || "")).replace(/\s+/g, " ").trim();
  const status = resultStatusFromText(text);
  if (!status) return null;
  const match = text.match(/^\s*(?:(\d+)\s+)?(.+?)\s+(\d{2})\s+([A-Z0-9]+)\s+(.+?)\s*$/i);
  if (!match) return null;
  const split = splitImportedPersonName(fixPdfEncoding(match[2]));
  return {
    rank: match[1] ? Number(match[1]) : "",
    lastName: split.lastName,
    firstName: split.firstName,
    displayName: formatDisplayName({ lastName: split.lastName, firstName: split.firstName }),
    birthYear: importedBirthYear(match[3]),
    club: match[4],
    time: "",
    resultStatus: status,
    statusLabel: {
      dns: "DNS",
      ab: "AB",
      dsq: "DSQ"
    }[status],
    qualified: false
  };
}

function parseFinalistsFromResultLines(lines) {
  const ranking = lines
    .map((line, sourceIndex) => {
      const row = parseResultRow(line) || parseResultStatusRow(line);
      return row ? { ...row, sourceIndex } : null;
    })
    .filter(Boolean)
    .sort((a, b) => {
      const statusA = a.resultStatus ? 1 : 0;
      const statusB = b.resultStatus ? 1 : 0;
      return statusA - statusB ||
        Number(a.rank || 9999) - Number(b.rank || 9999) ||
        Number(a.sourceIndex || 0) - Number(b.sourceIndex || 0);
    });
  const qualified = ranking.filter((row) => row.qualified);
  return {
    ranking,
    finalists: {
      a: qualified.slice(0, 8),
      b: qualified.slice(8, 16)
    },
    nextUnqualified: ranking.filter((row) => !row.qualified)
  };
}

function performanceStageForResultRow(item, result, row) {
  if (!isFinalStage(result.stage)) return {
    stage: result.stage,
    phaseLabel: result.phaseLabel
  };
  const rank = Number(item.rank || 0);
  if (Number(row.finalStageCount || 0) > 1 && rank >= 9 && rank <= 16) {
    return { stage: "finale-b", phaseLabel: "Finale B" };
  }
  if (rank >= 1 && rank <= 8) {
    return { stage: "finale-a", phaseLabel: "Finale A" };
  }
  return null;
}

function resultPerformanceRows(parsedRows, result, row) {
  if (/^4x/i.test(String(row.eventId || ""))) return [];
  return (parsedRows || [])
    .filter((item) => item.lastName || item.firstName || item.displayName)
    .map((item) => {
      const phase = performanceStageForResultRow(item, result, row);
      if (!phase) return null;
      return {
        eventId: row.eventId,
        eventLabel: result.eventLabel,
        sex: row.sex,
        stage: phase.stage,
        phaseLabel: phase.phaseLabel,
        session: row.session || "",
        startTime: row.startTime || "",
        programKey: result.programKey,
        lastName: item.lastName || "",
        firstName: item.firstName || "",
        displayName: item.displayName || "",
        birthYear: item.birthYear || "",
        club: item.club || "",
        time: item.time || "",
        status: item.resultStatus || "",
        statusLabel: item.statusLabel || "",
        updatedAt: result.updatedAt
      };
    })
    .filter(Boolean);
}

async function publishResultPdf(file, row, hasFinal, isPartial = false, options = {}) {
  const collection = resultsCollection();
  if (!collection) throw new Error("Firebase n'est pas disponible pour publier ce résultat.");
  const now = new Date().toISOString();
  const event = data.events.find((item) => item.id === row.eventId);
  const pdfDataUrl = await fileToDataUrl(file);
  const existingResult = resultForProgramRow(row);
  const preserveFinalists = Boolean(options.preserveFinalists && existingResult?.hasFinal);
  const lines = await extractPdfLines(file);
  const parsedRows = parseFinalistsFromResultLines(lines);
  let parsedFinals = { ranking: [], finalists: { a: [], b: [] }, nextUnqualified: [] };
  if (preserveFinalists) {
    parsedFinals = {
      ranking: existingResult.ranking || [],
      finalists: existingResult.finalists || { a: [], b: [] },
      nextUnqualified: existingResult.nextUnqualified || []
    };
    hasFinal = true;
  } else if (hasFinal) {
    parsedFinals = parsedRows;
    if (!parsedFinals.finalists.a.length) {
      throw new Error("Aucun finaliste détecté dans ce PDF. Vérifie que les lignes contiennent bien la mention finale.");
    }
  } else {
    parsedFinals = parsedRows;
  }
  const result = {
    id: resultIdForProgramRow(row),
    raceKey: raceOptionKey(row.eventId, row.sex),
    programKey: programKey(row),
    eventId: row.eventId,
    eventLabel: event?.label || row.label || row.eventId,
    sex: row.sex,
    sexLabel: sexDisplayLabel(row.sex),
    stage: isFinalStage(row.stage) ? row.stage : "series",
    phaseLabel: resultPhaseLabelForProgramRow(row),
    finalStageCount: row.finalStageCount || 0,
    session: row.session || "",
    startTime: row.startTime || "",
    hasFinal,
    finalists: parsedFinals.finalists,
    nextUnqualified: parsedFinals.nextUnqualified,
    ranking: parsedFinals.ranking,
    pdfName: file.name,
    pdfSize: file.size,
    pdfDataUrl,
    createdAt: existingResult?.createdAt || now,
    updatedAt: now,
    isPartial: Boolean(isPartial),
    status: preserveFinalists ? (existingResult.status || "published") : (hasFinal ? "finalists_pending_speaker" : "published")
  };
  result.performances = resultPerformanceRows(parsedRows.ranking, result, row);
  if (preserveFinalists) {
    result.finalistsAnnouncedAt = existingResult.finalistsAnnouncedAt || "";
    result.finalWithdrawals = existingResult.finalWithdrawals || [];
    result.finalPreWithdrawals = existingResult.finalPreWithdrawals || [];
  }
  await collection.doc(result.id).set(JSON.parse(JSON.stringify(result)));
  raceResults = [
    result,
    ...raceResults.filter((item) => item.id !== result.id)
  ].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  if (hasFinal && !preserveFinalists) {
    await createFinalistsSpeakerAlert(result);
  }
  await publishPublicResultsIndex();
  return result;
}

async function createFinalistsSpeakerAlert(result) {
  const finalistCount = finalRowsCount(result?.finalists);
  if (!finalistCount) return null;
  const now = new Date().toISOString();
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

async function ensurePendingFinalistsSpeakerAlerts() {
  if (finalistAlertRepairRunning) return;
  const pendingResults = raceResults.filter((result) => (
    result.hasFinal &&
    finalRowsCount(result.finalists) > 0 &&
    !result.finalistsAnnouncedAt &&
    !alerts.some((alert) => alert.type === "finalists_announcement" && alert.resultId === result.id && alert.speakerStatus === "pending")
  ));
  if (!pendingResults.length) return;
  finalistAlertRepairRunning = true;
  try {
    for (const result of pendingResults) {
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
  return sameName && sameRank && sameTime;
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
        const existing = alerts.find((alert) => replacementAlertMatches(alert, result, row));
        if (existing?.speakerStatus === "done" && existing.speakerAnnouncedAt) {
          await stampReplacementAnnouncement(result, row, existing.speakerAnnouncedAt);
          continue;
        }
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
  if (!alert?.resultId) {
    updateAlert(alertId, { speakerStatus: "done", speakerAnnouncedAt: now });
    return;
  }
  const collection = resultsCollection();
  if (!collection) throw new Error("Firebase n'est pas disponible pour publier les finalistes.");
  try {
    await collection.doc(alert.resultId).update({
      finalistsAnnouncedAt: now,
      status: "published",
      updatedAt: now
    });
  } catch (error) {
    if (/not.?found|no document|missing/i.test(String(error?.message || error))) {
      await deleteFinalResultAlerts(alert.resultId);
      return;
    }
    throw error;
  }
  const index = raceResults.findIndex((result) => result.id === alert.resultId);
  if (index !== -1) {
    raceResults[index] = {
      ...raceResults[index],
      finalistsAnnouncedAt: now,
      status: "published",
      updatedAt: now
    };
  }
  await publishPublicResultsIndex();
  updateAlert(alertId, { speakerStatus: "done", speakerAnnouncedAt: now });
}

function finalRowKey(row) {
  return String(row?.rowKey || [row?.rank, row?.displayName || finalistRowName(row), row?.time].filter(Boolean).join("|"));
}

function finalRowOrderValue(row, fallback = 9999) {
  const rank = Number(row?.rank);
  if (Number.isFinite(rank) && rank > 0) return rank;
  const sourceIndex = Number(row?.sourceIndex);
  if (Number.isFinite(sourceIndex)) return 10000 + sourceIndex;
  return fallback;
}

function sortedFinalRows(rows = []) {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) =>
      finalRowOrderValue(a.row, 20000 + a.index) - finalRowOrderValue(b.row, 20000 + b.index) ||
      a.index - b.index
    )
    .map((item) => item.row);
}

function normalizeFinalistsOrder(finalists = {}) {
  return {
    a: sortedFinalRows(finalists.a || []),
    b: sortedFinalRows(finalists.b || [])
  };
}

function activeFinalPreWithdrawals(result) {
  return (result?.finalPreWithdrawals || []).filter((item) => !item.cancelledAt);
}

function finalPreWithdrawalForRow(result, row) {
  const key = finalRowKey(row);
  return activeFinalPreWithdrawals(result).find((item) => item.rowKey === key);
}

function isFinalPreWithdrawn(result, row) {
  return Boolean(finalPreWithdrawalForRow(result, row));
}

function availableReplacementForResult(result, finalists) {
  const used = new Set(["a", "b"].flatMap((finalKey) => (finalists?.[finalKey] || []).map(finalRowKey)));
  return (result.nextUnqualified || []).find((row) => row.time && !row.resultStatus && !used.has(finalRowKey(row))) || null;
}

function buildReplacementFinalistRow(result, row, reference, now) {
  const preWithdrawal = finalPreWithdrawalForRow(result, row);
  return {
    ...row,
    qualified: true,
    repechaged: true,
    repechageAt: now,
    repechageAnnouncedAt: preWithdrawal ? now : "",
    withdrawnAt: preWithdrawal ? (preWithdrawal.at || now) : "",
    preWithdrawnAt: preWithdrawal ? (preWithdrawal.at || now) : "",
    replacesRank: reference?.rank || "",
    replacesName: finalistRowName(reference)
  };
}

function buildFinalWithdrawalEntry({ at, finalKey, withdrawn, replacement = null, promoted = null, preWithdrawal = false }) {
  return {
    at,
    final: String(finalKey || "").toUpperCase(),
    preWithdrawal,
    withdrawn: {
      rank: withdrawn?.rank || "",
      name: finalistRowName(withdrawn),
      club: withdrawn?.club || "",
      time: withdrawn?.time || ""
    },
    replacement: replacement ? {
      final: String(replacement.finalKey || finalKey || "").toUpperCase(),
      rank: replacement.row?.rank || "",
      name: finalistRowName(replacement.row),
      club: replacement.row?.club || "",
      time: replacement.row?.time || ""
    } : null,
    promoted: promoted ? {
      fromFinal: "B",
      toFinal: "A",
      rank: promoted.rank || "",
      name: finalistRowName(promoted),
      club: promoted.club || "",
      time: promoted.time || ""
    } : null
  };
}

function addReplacementChain(result, finalists, finalKey, firstReference, now) {
  const added = [];
  let reference = firstReference;
  while (true) {
    const row = availableReplacementForResult(result, finalists);
    if (!row) break;
    const finalistRow = buildReplacementFinalistRow(result, row, reference, now);
    finalists[finalKey].push(finalistRow);
    const item = {
      finalKey,
      row,
      finalistRow,
      reference,
      preWithdrawn: Boolean(finalistRow.withdrawnAt)
    };
    added.push(item);
    if (!item.preWithdrawn) break;
    reference = finalistRow;
  }
  return added;
}

function firstActiveFinalistIndex(rows = []) {
  let bestIndex = -1;
  let bestOrder = Infinity;
  rows.forEach((row, index) => {
    if (!row || row.withdrawnAt) return;
    const order = finalRowOrderValue(row, 20000 + index);
    if (order < bestOrder) {
      bestOrder = order;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function finalCompositionRows(result) {
  const finalists = normalizeFinalistsOrder(result.finalists || {});
  const finalRows = ["a", "b"].flatMap((key) => (finalists[key] || []).map((row) => ({
    ...row,
    finalLabel: key.toUpperCase()
  })));
  return finalRows;
}

function finalCompositionKey(result) {
  return finalCompositionRows(result)
    .map((row) => [row.finalLabel, row.rank, finalistRowName(row), row.time, row.withdrawnAt ? "F" : "Q", row.repechaged ? "R" : ""].join("|"))
    .join(";");
}

function finalCompositionIsDefinitive(result, now = new Date()) {
  if (!result?.hasFinal || !result.finalistsAnnouncedAt) return false;
  const activeRows = finalCompositionRows(result).filter(finalRowCountsAsFinalist);
  if (!activeRows.length) return false;
  return activeRows.every((row) => {
    const limit = finalWithdrawalLimitDate(row, result);
    return Boolean(limit) && now > limit;
  });
}

function finalCompositionDefinitiveDate(result) {
  if (!result?.hasFinal || !result.finalistsAnnouncedAt) return null;
  const activeRows = finalCompositionRows(result).filter(finalRowCountsAsFinalist);
  const limits = activeRows
    .map((row) => finalWithdrawalLimitDate(row, result))
    .filter((date) => date && !Number.isNaN(date.getTime()));
  if (!activeRows.length || limits.length !== activeRows.length) return null;
  return new Date(Math.max(...limits.map((date) => date.getTime())));
}

function finalCompositionPendingDeadlineLabel(result) {
  if (!result?.finalistsAnnouncedAt) return "Définitif 30 min après annonce speaker";
  const activeRows = finalCompositionRows(result).filter(finalRowCountsAsFinalist);
  const unannouncedReplacementCount = activeRows.filter((row) => row.repechaged && !row.repechageAnnouncedAt).length;
  if (unannouncedReplacementCount > 1) return "Définitif 30 min après annonce des repêchés";
  if (unannouncedReplacementCount === 1) return "Définitif 30 min après annonce du repêché";
  return "Définitif après fin des délais de forfait";
}

function renderFinalWithdrawalGroup(title, result, finalKey, rows = []) {
  if (!rows.length) return "";
  const now = new Date();
  return `
    <div class="final-withdrawal-group">
      <strong>${escapeHtml(title)}</strong>
      <ol>
        ${rows.map((row, index) => {
          const limit = finalWithdrawalLimitLabel(row, result);
          const canWithdraw = canWithdrawFinalist(row, result, now);
          const hasDeadline = hasFinalWithdrawalDeadline(row, result);
          const canWithdrawUnannouncedReplacement = canWithdrawBeforeReplacementAnnouncement(row);
          const expired = isFinalWithdrawalDeadlineExpired(row, result, now);
          const status = row.withdrawnAt
            ? `Forfait ${formatDeadlineTime(new Date(row.withdrawnAt))}`
            : (limit ? (canWithdraw ? `Forfait possible jusqu'à ${limit}` : "Forfait fermé") : (canWithdrawUnannouncedReplacement ? "Repêchage non annoncé" : "En attente annonce speaker"));
          return `
          <li value="${escapeHtml(row.rank || "")}" class="${row.withdrawnAt ? "withdrawn" : ""}${!canWithdraw && !row.withdrawnAt ? " closed" : ""}">
            <div>
              <span>${escapeHtml([row.rank ? `${row.rank}. ${finalistRowName(row)}` : finalistRowName(row), row.club, row.time || row.statusLabel].filter(Boolean).join(" - "))}</span>
              <small>${escapeHtml(status)}</small>
              ${row.repechaged && !row.withdrawnAt ? `<small class="repechage-label">Repêché${result.sex === "F" ? "e" : ""}</small>` : ""}
            </div>
            ${row.withdrawnAt ? `
              <button class="ghost-button compact confirm-button" type="button" data-final-reinstate="${escapeHtml(result.id)}" data-final-key="${escapeHtml(finalKey)}" data-final-index="${escapeHtml(String(index))}" data-final-row-key="${escapeHtml(finalRowKey(row))}">
                Réintégrer
              </button>
            ` : `
              <button class="ghost-button compact danger-button" type="button" data-final-withdraw="${escapeHtml(result.id)}" data-final-key="${escapeHtml(finalKey)}" data-final-index="${escapeHtml(String(index))}" data-final-row-key="${escapeHtml(finalRowKey(row))}" data-final-expired="${expired ? "1" : "0"}" ${hasDeadline || canWithdrawUnannouncedReplacement ? "" : "disabled"}>
                Forfait
              </button>
            `}
          </li>
        `;
        }).join("")}
      </ol>
    </div>
  `;
}

function finalRowIndexByKey(finalists, finalKey, finalIndex, rowKey = "") {
  const rows = finalists?.[finalKey] || [];
  if (rowKey) {
    const byKey = rows.findIndex((row) => finalRowKey(row) === rowKey);
    if (byKey !== -1) return byKey;
  }
  const index = Number(finalIndex);
  return Number.isFinite(index) ? index : -1;
}

function nextUnqualifiedRowsForSecretary(result) {
  const used = new Set(["a", "b"].flatMap((finalKey) => (result.finalists?.[finalKey] || []).map(finalRowKey)));
  return (result.nextUnqualified || []).filter((row) => !used.has(finalRowKey(row)));
}

function renderSecretaryUnqualifiedGroup(result, { actions = true, open = false } = {}) {
  const rows = nextUnqualifiedRowsForSecretary(result);
  if (!rows.length) return "";
  return `
    <details class="final-withdrawal-group final-unqualified-group" ${open ? "open" : ""}>
      <summary>Non qualifiés suivants (${escapeHtml(String(rows.length))})</summary>
      <ol>
        ${rows.map((row) => {
          const preWithdrawal = finalPreWithdrawalForRow(result, row);
          const actionAllowed = !row.resultStatus && row.time;
          return `
          <li value="${escapeHtml(row.rank || "")}" class="closed ${preWithdrawal ? "prewithdrawn" : ""}">
            <div>
              <span>${escapeHtml([row.rank ? `${row.rank}. ${finalistRowName(row)}` : finalistRowName(row), row.club, row.time || row.statusLabel].filter(Boolean).join(" - "))}</span>
              <small>${preWithdrawal ? `Pré-forfait déclaré à ${formatDeadlineTime(new Date(preWithdrawal.at))}` : (row.statusLabel || `Non qualifié${result.sex === "F" ? "e" : ""}`)}</small>
            </div>
            ${actions && actionAllowed ? `
              <button class="ghost-button compact ${preWithdrawal ? "confirm-button" : ""}" type="button" data-final-prewithdraw="${escapeHtml(result.id)}" data-final-row-key="${escapeHtml(finalRowKey(row))}">
                ${preWithdrawal ? "Annuler pré-forfait" : "Pré-forfait si repêché"}
              </button>
            ` : ""}
          </li>
        `;
        }).join("")}
      </ol>
    </details>
  `;
}

function openFinalWithdrawalsModal(resultId, options = {}) {
  const result = raceResults.find((item) => item.id === resultId);
  if (!result || !alertDetailModal) return;
  const finalists = normalizeFinalistsOrder(result.finalists || {});
  alertDetailModal.hidden = false;
  alertDetailModal.innerHTML = `
    <div class="decision-dialog alert-detail-dialog final-withdrawal-dialog" role="dialog" aria-modal="true" aria-label="Forfaits finales">
      <div class="decision-modal-head">
        <div>
          <span>Secrétariat</span>
          <h2>Forfaits finales</h2>
          <p>${escapeHtml(result.eventLabel || result.eventId)} ${escapeHtml(result.sexLabel || sexDisplayLabel(result.sex))}</p>
        </div>
        <button class="icon-button decision-close" type="button" data-close-alert-detail aria-label="Fermer">×</button>
      </div>
      <div class="final-withdrawal-list">
        ${renderFinalWithdrawalGroup("Finale A", result, "a", finalists.a || [])}
        ${renderFinalWithdrawalGroup("Finale B", result, "b", finalists.b || [])}
        ${renderSecretaryUnqualifiedGroup(result, { open: Boolean(options.openUnqualified) })}
      </div>
      <div class="decision-actions">
        <button class="ghost-button" type="button" data-close-alert-detail>Fermer</button>
      </div>
    </div>
  `;
}

async function toggleFinalPreWithdrawal(resultId, rowKey) {
  const collection = resultsCollection();
  if (!collection) throw new Error("Firebase n'est pas disponible pour gérer ce pré-forfait.");
  const resultIndex = raceResults.findIndex((item) => item.id === resultId);
  const result = raceResults[resultIndex];
  if (resultIndex === -1 || !result) throw new Error("Résultat introuvable.");
  const row = (result.nextUnqualified || []).find((item) => finalRowKey(item) === rowKey);
  if (!row) throw new Error("Nageur non qualifié introuvable.");
  const now = new Date().toISOString();
  const active = finalPreWithdrawalForRow(result, row);
  const finalPreWithdrawals = active
    ? (result.finalPreWithdrawals || []).map((item) => item.rowKey === rowKey && !item.cancelledAt ? { ...item, cancelledAt: now } : item)
    : [
      ...(result.finalPreWithdrawals || []),
      {
        rowKey,
        rank: row.rank || "",
        name: finalistRowName(row),
        club: row.club || "",
        time: row.time || "",
        at: now
      }
    ];
  await collection.doc(result.id).update({
    finalPreWithdrawals,
    updatedAt: now
  });
  raceResults[resultIndex] = {
    ...result,
    finalPreWithdrawals,
    updatedAt: now
  };
  render();
  openFinalWithdrawalsModal(result.id, { openUnqualified: true });
}

function renderFinalCompositionList(result) {
  const finalists = normalizeFinalistsOrder(result.finalists || {});
  const renderRows = (title, rows = []) => rows.length ? `
    <div class="final-withdrawal-group">
      <strong>${escapeHtml(title)}</strong>
      <ol>
        ${rows.map((row) => `
          <li value="${escapeHtml(row.rank || "")}" class="${row.withdrawnAt ? "withdrawn" : ""}">
            <div>
              <span>${escapeHtml([row.rank ? `${row.rank}. ${finalistRowName(row)}` : finalistRowName(row), row.club, row.time || row.statusLabel].filter(Boolean).join(" - "))}</span>
              ${row.withdrawnAt ? `<small>Forfait à ${escapeHtml(formatDeadlineTime(new Date(row.withdrawnAt)))}</small>` : ""}
              ${row.repechaged && !row.withdrawnAt ? `<small class="repechage-label">Repêché${result.sex === "F" ? "e" : ""}</small>` : ""}
            </div>
          </li>
        `).join("")}
      </ol>
    </div>
  ` : "";
  return `
    <div class="final-withdrawal-list">
      ${renderRows("Finale A", finalists.a || [])}
      ${renderRows("Finale B", finalists.b || [])}
      ${renderSecretaryUnqualifiedGroup(result, { actions: false })}
    </div>
  `;
}

function openFinalCompositionResultModal(resultId) {
  const result = raceResults.find((item) => item.id === resultId);
  if (!result || !alertDetailModal) return;
  const definitive = finalCompositionIsDefinitive(result);
  alertDetailModal.hidden = false;
  alertDetailModal.innerHTML = `
    <div class="decision-dialog alert-detail-dialog final-withdrawal-dialog" role="dialog" aria-modal="true" aria-label="Composition finale">
      <div class="decision-modal-head">
        <div>
          <span>Bureau des performances</span>
          <h2>${definitive ? "Finalistes définitifs" : "Finalistes provisoires"}</h2>
          <p>${escapeHtml(result.eventLabel || result.eventId)} ${escapeHtml(result.sexLabel || sexDisplayLabel(result.sex))}</p>
        </div>
        <button class="icon-button decision-close" type="button" data-close-alert-detail aria-label="Fermer">×</button>
      </div>
      <div class="alert-detail-note">
        <span>Info</span>
        <strong>${definitive ? "Tous les délais de forfait sont passés." : "Des délais de forfait sont encore ouverts."} Voici les qualifiés, repêchés et forfaits.</strong>
      </div>
      ${renderFinalCompositionList(result)}
      <div class="decision-actions">
        <button class="ghost-button" type="button" data-close-alert-detail>Fermer</button>
      </div>
    </div>
  `;
}

function openFinalCompositionModal(alertId) {
  const alert = alerts.find((item) => item.id === alertId);
  if (alert?.resultId) openFinalCompositionResultModal(alert.resultId);
}

async function markFinalistWithdrawn(resultId, finalKey, finalIndex, { allowExpired = false, rowKey = "" } = {}) {
  const collection = resultsCollection();
  if (!collection) throw new Error("Firebase n'est pas disponible pour gérer les forfaits.");
  const resultIndex = raceResults.findIndex((item) => item.id === resultId);
  const result = raceResults[resultIndex];
  const sourceIndex = finalRowIndexByKey(result?.finalists, finalKey, finalIndex, rowKey);
  const row = result?.finalists?.[finalKey]?.[sourceIndex];
  if (resultIndex === -1 || sourceIndex === -1 || !row) throw new Error("Finaliste introuvable.");
  const isUnannouncedReplacement = canWithdrawBeforeReplacementAnnouncement(row);
  if (!hasFinalWithdrawalDeadline(row, result) && !isUnannouncedReplacement) {
    throw new Error("Le délai de ce finaliste n'a pas encore démarré.");
  }
  if (!isUnannouncedReplacement && !allowExpired && !canWithdrawFinalist(row, result)) {
    throw new Error("Le délai de forfait de ce finaliste est terminé.");
  }
  const now = new Date().toISOString();
  const finalists = {
    a: (result.finalists?.a || []).map((item) => ({ ...item })),
    b: (result.finalists?.b || []).map((item) => ({ ...item }))
  };
  finalists[finalKey][sourceIndex] = {
    ...row,
    withdrawnAt: now
  };
  let promoted = null;
  let replacementFinalKey = finalKey;
  let replacementReference = row;
  if (finalKey === "a" && finalists.b.length) {
    const promotedIndex = firstActiveFinalistIndex(finalists.b);
    if (promotedIndex !== -1) {
      promoted = finalists.b.splice(promotedIndex, 1)[0];
      finalists.a.push({
        ...promoted,
        promotedFromFinal: "B",
        promotedAt: now,
        replacesRank: row.rank || "",
        replacesName: finalistRowName(row)
      });
      replacementFinalKey = "b";
      replacementReference = promoted;
    }
  }
  const replacements = addReplacementChain(result, finalists, replacementFinalKey, replacementReference, now);
  const announcedReplacement = replacements.find((item) => !item.preWithdrawn) || null;
  const firstReplacement = replacements[0] || null;
  const finalWithdrawals = [
    ...(result.finalWithdrawals || []),
    buildFinalWithdrawalEntry({
      at: now,
      finalKey,
      withdrawn: row,
      replacement: firstReplacement,
      promoted
    }),
    ...replacements
      .filter((item) => item.preWithdrawn)
      .map((item, index) => buildFinalWithdrawalEntry({
        at: item.finalistRow.withdrawnAt || now,
        finalKey: item.finalKey,
        withdrawn: item.finalistRow,
        replacement: replacements[index + 1] || null,
        preWithdrawal: true
      }))
  ];
  const orderedFinalists = normalizeFinalistsOrder(finalists);
  const updated = {
    ...result,
    finalists: orderedFinalists,
    finalWithdrawals,
    updatedAt: now
  };
  await collection.doc(result.id).update({
    finalists: orderedFinalists,
    finalWithdrawals,
    updatedAt: now
  });
  raceResults[resultIndex] = updated;
  if (isUnannouncedReplacement) {
    await cancelPendingReplacementSpeakerAlert(result, row, now);
  }
  if (announcedReplacement) {
    await createFinalistReplacementSpeakerAlert(updated, announcedReplacement.reference, announcedReplacement.row, now);
  }
  await publishPublicResultsIndex();
  render();
  openFinalWithdrawalsModal(result.id);
}

async function reinstateFinalist(resultId, finalKey, finalIndex, rowKey = "") {
  const collection = resultsCollection();
  if (!collection) throw new Error("Firebase n'est pas disponible pour réintégrer ce finaliste.");
  const resultIndex = raceResults.findIndex((item) => item.id === resultId);
  const result = raceResults[resultIndex];
  const sourceIndex = finalRowIndexByKey(result?.finalists, finalKey, finalIndex, rowKey);
  const row = result?.finalists?.[finalKey]?.[sourceIndex];
  if (resultIndex === -1 || sourceIndex === -1 || !row?.withdrawnAt) throw new Error("Finaliste forfait introuvable.");
  const now = new Date().toISOString();
  const finalists = {
    a: (result.finalists?.a || []).map((item) => ({ ...item })),
    b: (result.finalists?.b || []).map((item) => ({ ...item }))
  };
  const reinstated = { ...row };
  delete reinstated.withdrawnAt;
  reinstated.reinstatedAt = now;
  finalists[finalKey][sourceIndex] = reinstated;
  const withdrawal = [...(result.finalWithdrawals || [])]
    .reverse()
    .find((item) => item.withdrawn?.name === finalistRowName(row) && !item.reinstatedAt);
  const replacementName = withdrawal?.replacement?.name || "";
  const replacementReferenceName = withdrawal?.promoted?.name || finalistRowName(row);
  if (replacementName) {
    for (const key of ["a", "b"]) {
      const replacementIndex = finalists[key].findIndex((item) =>
        item.repechaged &&
        finalistRowName(item) === replacementName &&
        String(item.replacesName || "") === replacementReferenceName
      );
      if (replacementIndex !== -1) {
        const replacement = finalists[key][replacementIndex];
        if (!replacement.repechageAnnouncedAt) {
          await cancelPendingReplacementSpeakerAlert(result, replacement, now);
        }
        finalists[key].splice(replacementIndex, 1);
      }
    }
  }
  const promotedName = withdrawal?.promoted?.name || "";
  if (promotedName) {
    const promotedIndex = finalists.a.findIndex((item) =>
      item.promotedFromFinal === "B" &&
      finalistRowName(item) === promotedName &&
      String(item.replacesName || "") === finalistRowName(row)
    );
    if (promotedIndex !== -1) {
      const promoted = { ...finalists.a[promotedIndex] };
      delete promoted.promotedFromFinal;
      delete promoted.promotedAt;
      delete promoted.replacesRank;
      delete promoted.replacesName;
      finalists.a.splice(promotedIndex, 1);
      finalists.b.push(promoted);
    }
  }
  const finalWithdrawals = (result.finalWithdrawals || []).map((item) => {
    if (item === withdrawal || (item.withdrawn?.name === finalistRowName(row) && !item.reinstatedAt && item.at === withdrawal?.at)) {
      return { ...item, reinstatedAt: now };
    }
    return item;
  });
  const orderedFinalists = normalizeFinalistsOrder(finalists);
  await collection.doc(result.id).update({
    finalists: orderedFinalists,
    finalWithdrawals,
    updatedAt: now
  });
  raceResults[resultIndex] = {
    ...result,
    finalists: orderedFinalists,
    finalWithdrawals,
    updatedAt: now
  };
  await publishPublicResultsIndex();
  render();
  openFinalWithdrawalsModal(result.id);
}

async function createFinalistReplacementSpeakerAlert(result, withdrawn, replacement, now = new Date().toISOString()) {
  const existing = alerts.find((alert) =>
    replacementAlertMatches(alert, result, replacement) &&
    alert.speakerStatus === "pending"
  );
  if (existing) return existing;
  const replacementRowKey = finalRowKey(replacement);
  const alert = {
    id: `replacement-${result.id}-${replacementRowKey.replace(/[^a-z0-9_-]+/gi, "-").slice(0, 80)}`,
    type: "finalist_replacement_announcement",
    roleSource: "secretary",
    resultId: result.id,
    eventId: result.eventId,
    eventLabel: result.eventLabel,
    sex: result.sex,
    sexLabel: result.sexLabel,
    session: result.session || "",
    startTime: result.startTime || "",
    withdrawnName: finalistRowName(withdrawn),
    withdrawnClub: withdrawn.club || "",
    replacementName: finalistRowName(replacement),
    replacementClub: replacement.club || "",
    replacementRowKey,
    replacementRank: replacement.rank || "",
    replacementTime: replacement.time || "",
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
}

async function cancelPendingReplacementSpeakerAlert(result, row, now = new Date().toISOString()) {
  const pending = alerts.filter((alert) =>
    replacementAlertMatches(alert, result, row) &&
    alert.speakerStatus === "pending"
  );
  for (const alert of pending) {
    alert.speakerStatus = "none";
    alert.cancelledAt = now;
    alert.updatedAt = now;
    await syncAlertToFirestore(alert);
  }
  if (pending.length) {
    saveAlerts();
  }
}

async function updateReplacementRowAnnouncement(resultId, matcher, announcedAt) {
  const index = raceResults.findIndex((result) => result.id === resultId);
  const result = raceResults[index];
  if (!result) return false;
  const finalists = {
    a: (result.finalists?.a || []).map((row) => ({ ...row })),
    b: (result.finalists?.b || []).map((row) => ({ ...row }))
  };
  let changed = false;
  ["a", "b"].forEach((key) => {
    finalists[key] = finalists[key].map((row) => {
      if (row.repechaged && matcher(row) && !row.repechageAnnouncedAt) {
        changed = true;
        return { ...row, repechageAnnouncedAt: announcedAt };
      }
      return row;
    });
  });
  if (!changed) return false;
  const orderedFinalists = normalizeFinalistsOrder(finalists);
  const collection = resultsCollection();
  if (collection) {
    await collection.doc(result.id).update({
      finalists: orderedFinalists,
      updatedAt: announcedAt
    });
  }
  raceResults[index] = {
    ...result,
    finalists: orderedFinalists,
    updatedAt: announcedAt
  };
  await publishPublicResultsIndex();
  return true;
}

async function stampReplacementAnnouncement(result, row, announcedAt) {
  return updateReplacementRowAnnouncement(
    result.id,
    (candidate) => finalistRowName(candidate) === finalistRowName(row) &&
      String(candidate.rank || "") === String(row.rank || "") &&
      String(candidate.time || "") === String(row.time || ""),
    announcedAt
  );
}

async function publishReplacementAfterSpeaker(alertId) {
  const alert = alerts.find((item) => item.id === alertId);
  const now = new Date().toISOString();
  if (!alert?.resultId) {
    updateAlert(alertId, { speakerStatus: "done", speakerAnnouncedAt: now });
    return;
  }
  await updateReplacementRowAnnouncement(
    alert.resultId,
    (row) => {
      const sameName = finalistRowName(row) === alert.replacementName;
      const sameRank = !alert.replacementRank || String(row.rank || "") === String(alert.replacementRank || "");
      const sameTime = !alert.replacementTime || String(row.time || "") === String(alert.replacementTime || "");
      return sameName && sameRank && sameTime;
    },
    now
  );
  updateAlert(alertId, { speakerStatus: "done", speakerAnnouncedAt: now });
}

async function deleteResultPdf(resultId) {
  const collection = resultsCollection();
  if (!collection) throw new Error("Firebase n'est pas disponible pour supprimer ce résultat.");
  await deleteFinalResultAlerts(resultId);
  await collection.doc(resultId).delete();
  raceResults = raceResults.filter((result) => result.id !== resultId);
  await publishPublicResultsIndex();
}

async function clearPublishedResults() {
  const collection = resultsCollection();
  if (!collection) throw new Error("Firebase n'est pas disponible pour effacer les résultats publics.");
  const snapshot = await collection.get();
  const docs = snapshot.docs || [];
  const rowsToArchive = raceResults.length ? raceResults : docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  if (rowsToArchive.length) {
    await archiveCurrentResults("Avant remise à zéro des résultats publics", rowsToArchive);
  }
  for (const result of rowsToArchive) {
    await deleteFinalResultAlerts(result.id);
  }
  await Promise.all(docs.map((doc) => doc.ref.delete()));
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
  const rows = docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const rowsToDelete = rows.filter((row) => String(row.session || "") === cleanSession);
  if (rowsToDelete.length) {
    await archiveCurrentResults(`Avant remise à zéro des résultats publics S${cleanSession}`, rowsToDelete);
  }
  for (const result of rowsToDelete) {
    await deleteFinalResultAlerts(result.id);
  }
  const idsToDelete = new Set(rowsToDelete.map((row) => row.id));
  await Promise.all(docs.filter((doc) => idsToDelete.has(doc.id)).map((doc) => doc.ref.delete()));
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
  const nextData = normalizeData({
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
    state.eventId = "";
    state.sex = "F";
    state.series = "1";
    state.session = "1";
    state.programKey = "";
    state.category = "all";
    state.selectedSwimmerId = "";
    state.selectedRecordKey = "";
  resultsAdminSession = "";
  saveData();
  render();
  await publishLiveDataToFirestore(nextData, "RAZ séries");
  await publishPublicResultsIndex({ silent: true });
  window.alert(`RAZ séries effectuée : programme, séries et engagés vidés. ${clearedSeriesPdfs} PDF séries public${clearedSeriesPdfs > 1 ? "s" : ""} supprimé${clearedSeriesPdfs > 1 ? "s" : ""}. ${clearedResults} résultat${clearedResults > 1 ? "s" : ""} public${clearedResults > 1 ? "s" : ""} archivé${clearedResults > 1 ? "s" : ""} puis supprimé${clearedResults > 1 ? "s" : ""}.`);
}

function renderCategorySelect() {
  const categories = [...new Set(data.entrants.filter(matchesRace).map((entrant) => entrant.category).filter(Boolean))];
  const preferred = ["Cadet", "Junior", "Senior"];
  categories.sort((a, b) => {
    const ai = preferred.indexOf(a);
    const bi = preferred.indexOf(b);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return a.localeCompare(b, "fr");
  });
  if (state.category !== "all" && !categories.some((category) => sameCategory(category, state.category))) {
    state.category = "all";
  }
  categorySelect.innerHTML = [
    `<option value="all">Toutes catégories</option>`,
    ...categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(categoryLabel(category))}</option>`)
  ].join("");
  categorySelect.value = state.category;
}

function renderHeader() {
  const title = compactRaceTitle();
  raceTitle.innerHTML = `${escapeHtml(title)}${isLastRaceOfCurrentSession() ? ` <span class="session-end-note">[dernière course de la session]</span>` : ""}`;
  const currentEntrants = raceEntrants();
  const meta = [
    state.session !== "all" ? `Session ${state.session}` : "",
    selectedSeriesTime() ? `Horaire ${selectedSeriesTime()}` : "",
    state.role === "speaker" && state.series !== "all" ? `${currentEntrants.length} ${swimmerWord(currentEntrants.length)}` : ""
  ].filter(Boolean).join(" - ");
  raceMeta.textContent = meta;
  const sexLabel = sexDisplayLabel(state.sex);
  raceSexBadge.textContent = sexLabel;
  renderRefereeProgressControl();
}

function renderRefereeProgressControl() {
  if (!refereeProgressBtn) return;
  const progress = refereeProgress();
  const label = refereeProgressLabel(progress);
  if (state.role === "referee") {
    const panelActions = document.querySelector(".entrants-panel .panel-actions");
    if (panelActions && refereeProgressBtn.parentElement !== panelActions) {
      const programReference = programBtn?.parentElement === panelActions ? programBtn : null;
      panelActions.insertBefore(refereeProgressBtn, programReference || panelActions.firstChild);
    }
    const isPointedHere = currentRefereeProgressIsHere();
    refereeProgressBtn.hidden = false;
    refereeProgressBtn.disabled = !selectedProgramRow();
    refereeProgressBtn.dataset.refereeProgressAction = "set";
    refereeProgressBtn.textContent = isPointedHere ? "Pointé JA" : "Pointer ici";
    refereeProgressBtn.title = label ? `Repère actuel : ${label}` : "Marquer cette course/série comme repère du JA";
    refereeProgressBtn.classList.add("confirm-button");
    refereeProgressBtn.classList.toggle("is-pointed", isPointedHere);
    return;
  }
  const headerActions = document.querySelector(".race-header .badge-row");
  if (headerActions && refereeProgressBtn.parentElement !== headerActions) {
    headerActions.insertBefore(refereeProgressBtn, headerActions.firstChild);
  }
  refereeProgressBtn.hidden = true;
  refereeProgressBtn.disabled = false;
  refereeProgressBtn.removeAttribute("data-referee-progress-action");
  refereeProgressBtn.classList.remove("confirm-button", "is-pointed");
}

function headerReferenceChipsHtml() {
  const recordRows = currentRecordRows();
  const qualificationRows = data.qualifications
    .filter(matchesRace)
    .sort((a, b) => timeToMs(a.time) - timeToMs(b.time));
  return [
    ...recordRows.map((row) => {
      const key = recordKey(row);
      return `
      <button class="ref-chip ref-chip-button ${categoryClass(row.category)} ${state.selectedRecordKey === key ? "active-ref" : ""}" data-record-key="${escapeHtml(key)}">
        <strong>${escapeHtml(shortRecordLabel(row))}</strong>
        ${escapeHtml(row.time || "-")}
      </button>
    `;
    }),
    ...qualificationRows.map((row) => `
      <span class="ref-chip qualification-chip">
        <strong>${escapeHtml(row.label || "EDF")}</strong>
        ${escapeHtml(row.time || "-")}
      </span>
    `)
  ].join("");
}

function selectedHeaderReferenceDetailsHtml() {
  if (!state.selectedRecordKey) return "";
  const row = currentRecordRows().find((record) => recordKey(record) === state.selectedRecordKey);
  if (!row) {
    state.selectedRecordKey = "";
    return "";
  }
  return `
    <div>
      <strong>${escapeHtml(shortRecordLabel(row))} - ${escapeHtml(row.time || "-")}</strong>
      <span>${escapeHtml(recordDescription(row))}</span>
    </div>
    <button class="icon-button close-ref-details" title="Fermer le détail" aria-label="Fermer le détail">×</button>
  `;
}

function renderHeaderReferences() {
  headerRefs.innerHTML = headerReferenceChipsHtml();
  renderHeaderRefDetails();
}

function renderHeaderRefDetails() {
  const detailsHtml = selectedHeaderReferenceDetailsHtml();
  if (!detailsHtml) {
    headerRefDetails.hidden = true;
    headerRefDetails.innerHTML = "";
    return;
  }
  headerRefDetails.hidden = false;
  headerRefDetails.innerHTML = detailsHtml;
}

function recordKey(row) {
  return [row.eventId, row.sex, row.category, row.label].join("|").toLowerCase();
}

function renderEntrants() {
  const entrants = raceEntrants();
  const allRaceEntrants = data.entrants.filter(matchesRace);
  const statsEntrants = raceEntrantsForStats();
  const visibleEntrants = entrants;
  const seriesNumbers = availableSeriesNumbers();
  const selectedSeries = Number(state.series);
  const hasSeriesFilter = state.series !== "all";
  const programRow = selectedProgramRow() || programRows().find((row) => row.eventId === state.eventId && row.sex === state.sex);
  const seriesTime = selectedSeriesTime();
  const statsCount = statsEntrants.length || allRaceEntrants.length;
  entrantCount.textContent = statsCount;
  if (entrantCountLabel) entrantCountLabel.textContent = entrantWord(statsCount);
  filteredCount.textContent = hasSeriesFilter
    ? `${seriesTime ? `Horaire ${seriesTime} - ` : ""}${visibleEntrants.length} ${swimmerWord(visibleEntrants.length)}`
    : `${visibleEntrants.length} ${displayedWord(visibleEntrants.length)}`;
  const seriesLabel = selectedSeriesLabel();
  const compactViewTitle = ["referee", "speaker", "live"].includes(state.role);
  const entrantsTitleText = hasSeriesFilter
    ? (compactViewTitle ? compactRaceTitle() : seriesLabel)
    : (state.role === "referee" ? "Participants" : `${entrantWord(2).replace(/^./, (letter) => letter.toUpperCase())} 2026`);
  const inlineEntrantCount = ["referee", "speaker", "live"].includes(state.role) && hasSeriesFilter
    ? ` <span class="inline-entrant-count">${escapeHtml(`${statsCount} ${entrantWord(statsCount)}`)}</span>`
    : "";
  entrantsTitle.innerHTML = `${escapeHtml(entrantsTitleText)}${inlineEntrantCount}${hasSeriesFilter ? splitRaceNote() : ""}${isLastSeriesOfCurrentSession() ? ` <span class="session-end-note">[dernière série de la session]</span>` : ""}`;
  if (entrantsSubtitle) {
    if (hasSeriesFilter && ["speaker", "live"].includes(state.role)) {
      const refDetails = selectedHeaderReferenceDetailsHtml();
      entrantsSubtitle.innerHTML = `
        <span class="speaker-panel-refs">${headerReferenceChipsHtml()}</span>
        ${refDetails ? `<span class="header-ref-details speaker-panel-ref-details">${refDetails}</span>` : ""}
      `;
    } else if (hasSeriesFilter && state.role === "referee") {
      entrantsSubtitle.textContent = "";
    } else {
      entrantsSubtitle.textContent = hasSeriesFilter
        ? [seriesTime ? `Horaire ${seriesTime}` : "", `${visibleEntrants.length} ${swimmerWord(visibleEntrants.length)}`].filter(Boolean).join(" - ")
        : "";
    }
  }
  rankHeader.textContent = hasSeriesFilter ? "Ligne" : "Rang";
  if (swimmerHeader) swimmerHeader.textContent = isFemaleContext() ? "Nageuse" : "Nageur";
  if (searchLabel) searchLabel.textContent = `Recherche ${entrantWord(1)}`;
  if (lineOrderBtn) {
    lineOrderBtn.hidden = !hasSeriesFilter || !["live", "speaker", "referee"].includes(state.role);
    lineOrderBtn.textContent = state.lineOrder === "desc" ? "Lignes 8→1" : "Lignes 1→8";
    lineOrderBtn.title = state.lineOrder === "desc" ? "Afficher les lignes de 1 à 8" : "Afficher les lignes de 8 à 1";
  }
  entrantsTableWrap?.classList.toggle("series-table", hasSeriesFilter);
  const best = [...(statsEntrants.length ? statsEntrants : allRaceEntrants)].sort((a, b) => timeToMs(a.seedTime) - timeToMs(b.seedTime))[0];
  bestEntry.textContent = best?.seedTime || "--";
  if (bestEntryName) {
    const club = best ? shortClubName(best) : "";
    bestEntryName.textContent = best
      ? `${formatDisplayName(best)}${club ? ` - ${club}` : ""}`
      : "";
  }

  entrantsBody.innerHTML = visibleEntrants.length ? visibleEntrants.map((entrant, index) => {
    const importedForfait = entrant.importedStatus === "forfait";
    const reference = state.role === "referee"
      ? (importedForfait ? `<span class="badge muted">Forfait déclaré</span>` : `<span class="badge muted">Cliquer pour décider</span>`)
      : (isSpeakerView() ? getEntrantReference(entrant) : "");
    const swimmerId = entrant.swimmerId || entrantKey(entrant);
    const lineLabel = hasSeriesFilter ? (entrant.seriesInfo?.line || "-") : index + 1;
    const clubLabel = state.role === "referee" ? shortClubName(entrant) : (entrant.club || "-");
    const displayName = state.role === "referee" && isRelayEntrant(entrant)
      ? (shortClubName(entrant) || formatDisplayName(entrant))
      : formatSeriesDisplayName(entrant);
    const lineAlerts = activeLineAlertsForEntrant(entrant);
    const lineTimeStatus = renderLineTimeStatus(entrant, lineAlerts);
    const rowDisabled = lineAlerts.length || importedForfait;
    return `
      <tr class="${state.selectedSwimmerId === swimmerId ? "selected-row" : ""} ${rowDisabled ? "dsq-row" : ""} ${importedForfait ? "imported-forfait-row" : ""} category-row ${categoryClass(entrant.category)}" data-swimmer-id="${escapeHtml(swimmerId)}" data-imported-forfait="${importedForfait ? "1" : "0"}">
        <td><span class="lane">${escapeHtml(lineLabel)}</span></td>
        <td class="name-cell">
          <button class="swimmer-button" data-swimmer-id="${escapeHtml(swimmerId)}">${escapeHtml(displayName)}${!isRelayEntrant(entrant) ? ` <span class="birth-year">(${escapeHtml(getBirthYearLabel(entrant.birthDate))})</span>${renderNonSelectableBadge(entrant)}${renderCompetitionStatBadges(entrant)}` : ""}${isSpeakerView() ? renderEdfBadges(entrant) : ""}</button>
          ${!isRelayEntrant(entrant) || state.role === "referee" ? `<span class="club-name">${escapeHtml(clubLabel || "-")}</span>` : ""}
        </td>
        <td><span class="category-pill">${escapeHtml(categoryLabel(entrant.category, entrant.sex))}</span></td>
        <td class="time-cell">
          ${lineTimeStatus
            ? lineTimeStatus
            : lineAlerts.length
            ? renderLineAlertBadges(lineAlerts)
            : `<span class="time">${escapeHtml(entrant.seedTime || "-")}</span>`}
          ${!lineTimeStatus && !lineAlerts.length && isSpeakerView() ? renderRecordGapAlert(entrant) : ""}
          ${!lineTimeStatus && !lineAlerts.length && isSpeakerView() && entrant.seedSource ? `<span class="seed-source">${escapeHtml(entrant.seedSource)}</span>` : ""}
        </td>
        <td>${reference}</td>
      </tr>
    `;
  }).join("") : `<tr><td colspan="5" class="empty">${programRow?.hasEntrants === false ? `Finale à afficher, ${entrantWord(2)} non disponibles pour le moment.` : `Aucun${isFemaleContext() ? "e" : ""} ${entrantWord(1)} pour cette sélection.`}</td></tr>`;
  if (isSpeakerView()) {
    renderSwimmerDetails();
  } else {
    swimmerDetails.hidden = true;
    swimmerDetails.innerHTML = "";
  }
}

function getEntrantReference(entrant) {
  const references = [];
  const seed = timeToMs(entrant.seedTime);
  const recordSeed = findRecordByTime(entrant, entrant.seedTime, entrant.category);
  if (recordSeed) {
    references.push(`<span class="badge record-alert">${escapeHtml(shortRecordLabel(recordSeed))} actuel</span>`);
  }
  if (sameCategory(entrant.category, "Senior")) {
    const quals = data.qualifications
      .filter(matchesRace)
      .filter((item) => isQualificationEligible(entrant, item))
      .sort((a, b) => timeToMs(a.time) - timeToMs(b.time));
    const qual = quals.find((item) => seed <= timeToMs(item.time));
    if (qual) {
      references.push(`<span class="badge">${escapeHtml(qual.label)} EDF</span>`);
    }
  }
  const top2025Match = findTop2025ForEntrant(entrant);
  if (top2025Match) {
    const record2025 = findRecordByTime(entrant, top2025Match.time, top2025Match.category);
    references.push(`<span class="badge category-mini ${categoryClass(top2025Match.category)}">FRA 25: ${escapeHtml(formatRank(top2025Match.rank))} ${escapeHtml(categoryLabel(top2025Match.category, entrant.sex))} - ${escapeHtml(top2025Match.time || "-")}</span>`);
    if (record2025) {
      references.push(`<span class="badge record-alert">Temps FRA 25 = ${escapeHtml(shortRecordLabel(record2025))}</span>`);
    }
  }
  const heldRecords = findRecordsHeldByEntrant(entrant).filter((record) => (
    !sameTime(record.time, entrant.seedTime) && (!top2025Match || !sameTime(record.time, top2025Match.time))
  ));
  heldRecords.forEach((record) => {
    references.push(`<span class="badge holder-alert">${isRelayEntrant(entrant) ? "Club recordman" : "Détient"} ${escapeHtml(shortRecordLabel(record))}</span>`);
  });
  const raceMedals = findInternationalMedalsForRace(entrant);
  raceMedals.forEach((medal) => {
    references.push(`<span class="badge international-alert">${escapeHtml(medal.medal || "Médaille")} ${escapeHtml(shortChampionshipLabel(medal.championship))}</span>`);
  });
  findSwimmerInfosForEntrant(entrant).forEach((item) => {
    references.push(`<span class="badge swimmer-info-badge">${escapeHtml(item.info)}</span>`);
  });
  return references.length ? `<div class="reference-badges">${references.join("")}</div>` : "";
}

function recordTargetsForEntrant(entrant) {
  return data.records
    .filter((record) => record.eventId === entrant.eventId && record.sex === entrant.sex)
    .filter((record) => sameCategory(record.category, entrant.category));
}

function formatGap(ms) {
  const total = Math.abs(ms) / 1000;
  if (total >= 60) {
    const minutes = Math.floor(total / 60);
    const seconds = (total % 60).toFixed(2).padStart(5, "0");
    return `${minutes}:${seconds}`;
  }
  return total.toFixed(2);
}

function renderRecordGapAlert(entrant) {
  const seed = timeToMs(entrant.seedTime);
  if (!Number.isFinite(seed)) return "";
  const target = recordTargetsForEntrant(entrant)
    .map((record) => ({ record, diff: seed - timeToMs(record.time) }))
    .filter((item) => Number.isFinite(item.diff))
    .sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff))[0];
  if (!target) return "";
  const label = shortRecordLabel(target.record);
  if (target.diff <= 0) {
    return `<span class="record-gap under-record">sous ${escapeHtml(label)}</span>`;
  }
  const threshold = seed < 60000 ? 1000 : (seed < 180000 ? 2500 : 5000);
  if (target.diff > threshold) return "";
  return `<span class="record-gap">à ${escapeHtml(formatGap(target.diff))} du ${escapeHtml(label)}</span>`;
}

function renderEdfBadges(entrant) {
  const memberships = findEdfMemberships(entrant);
  return memberships.map((member) => (
    `<span class="edf-badge" title="${escapeHtml(member.label || "Equipe de France")}">${escapeHtml(member.team || "E")}</span>`
  )).join("");
}

function renderCompetitionStatBadges(entrant) {
  if (!isSpeakerView()) return "";
  return findCompetitionStatsForEntrant(entrant).map((item) => (
    `<span class="stat-badge ${escapeHtml(item.type || "")}" title="${escapeHtml(item.detail || item.label || "Repère compétition")}">${escapeHtml(item.icon || "*")}</span>`
  )).join("");
}

function renderNonSelectableBadge(entrant) {
  return entrant?.nonSelectable && isSpeakerView()
    ? `<span class="non-selectable-label" title="Non sélectionnable">NS</span>`
    : "";
}

function findEdfMemberships(entrant) {
  const key = entrantPersonKey(entrant);
  return (data.edfMembers || []).filter((member) => member.personKey === key);
}

function findCompetitionStatsForEntrant(entrant) {
  if (isRelayEntrant(entrant)) return [];
  const entrantName = normalizePersonName(formatName(entrant));
  const entrantYear = getBirthYearLabel(entrant.birthDate);
  const entrantSex = sheetSex(entrant.sex);
  return (data.competitionStats || []).filter((item) => {
    if (!item.name || normalizePersonName(item.name) !== entrantName) return false;
    if (item.sex && entrantSex && item.sex !== entrantSex) return false;
    if (item.type === "birthday") return true;
    if (item.birthYear && entrantYear !== "----" && String(item.birthYear) !== String(entrantYear)) return false;
    return true;
  });
}

function normalizeClubMatch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toUpperCase();
}

function findSwimmerInfosForEntrant(entrant) {
  if (!isSpeakerView() || isRelayEntrant(entrant)) return [];
  const entrantName = normalizePersonName(formatName(entrant));
  const clubKeys = [
    entrant.club,
    entrant.clubCode,
    shortClubName(entrant)
  ].map(normalizeClubMatch).filter(Boolean);
  return (data.swimmerInfos || []).filter((item) => {
    if (!item.info || item.personKey !== entrantName) return false;
    if (!item.clubKey) return true;
    return clubKeys.includes(item.clubKey);
  });
}

function findInternationalMedals(entrant) {
  const key = entrantPersonKey(entrant);
  return (data.internationalMedals || []).filter((medal) => medal.personKey === key);
}

function findInternationalMedalsForRace(entrant) {
  return findInternationalMedals(entrant).filter((medal) => recordEventMatches(medal, entrant.eventId));
}

function shortChampionshipLabel(value) {
  const text = String(value || "").toUpperCase();
  if (text.includes("MONDE")) return text.replace("MONDE", "Monde");
  if (text.includes("EURO")) return text.replace("EURO", "Europe");
  return value || "";
}

function findRecordByTime(entrant, time, category) {
  if (!time) return null;
  return data.records.find((record) => (
    record.eventId === entrant.eventId &&
    record.sex === entrant.sex &&
    sameCategory(record.category, category) &&
    sameTime(record.time, time)
  ));
}

function isRelayEntrant(entrant) {
  return /^\d+x/i.test(String(entrant.eventId || ""));
}

function isNationalTeamRelayRecord(record) {
  if (!isRelayEntrant(record)) return false;
  const values = [record.club, record.holder]
    .map((value) => String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase());
  return values.some((value) => value === "EDF" || value === "EDFJ" || value === "EQUIPEDEFRANCE");
}

function shouldKeepRecord(record) {
  return !isNationalTeamRelayRecord(record);
}

function isBestClubRelayEntry(entrant) {
  if (!isRelayEntrant(entrant) || !entrant.clubCode) return false;
  const sameClubEntries = data.entrants.filter((row) => (
    row.eventId === entrant.eventId &&
    row.sex === entrant.sex &&
    String(row.clubCode || "").toUpperCase() === String(entrant.clubCode || "").toUpperCase()
  ));
  const best = sameClubEntries.sort((a, b) => timeToMs(a.seedTime) - timeToMs(b.seedTime))[0];
  return best && (best.swimmerId || entrantKey(best)) === (entrant.swimmerId || entrantKey(entrant));
}

function findRelayClubRecords(entrant) {
  if (!isBestClubRelayEntry(entrant)) return [];
  const clubCode = String(entrant.clubCode || "").toUpperCase();
  return data.records.filter((record) => (
    shouldKeepRecord(record) &&
    record.eventId === entrant.eventId &&
    recordMatchesRace(record, entrant.eventId, entrant.sex) &&
    sameCategory(record.category, entrant.category) &&
    String(record.club || "").toUpperCase() === clubCode
  ));
}

function findRecordsHeldByEntrant(entrant) {
  if (isRelayEntrant(entrant)) {
    return findRelayClubRecords(entrant);
  }
  const entrantName = normalizePersonName(formatName(entrant));
  return data.records.filter((record) => (
    shouldKeepRecord(record) &&
    record.eventId === entrant.eventId &&
    record.sex === entrant.sex &&
    normalizePersonName(record.holder) === entrantName
  ));
}

function findAllRecordsHeldByEntrant(entrant) {
  const entrantName = normalizePersonName(formatName(entrant));
  return data.records.filter((record) => (
    record.sex === entrant.sex &&
    normalizePersonName(record.holder) === entrantName
  ));
}

function sameTime(left, right) {
  return Number.isFinite(timeToMs(left)) && timeToMs(left) === timeToMs(right);
}

function isQualificationEligible(entrant, qualification) {
  if (qualification.label !== "TRP") return true;
  const birthYear = getBirthYear(entrant.birthDate);
  return Number.isFinite(birthYear) && birthYear >= 2005;
}

function getBirthYear(birthDate) {
  const match = String(birthDate || "").match(/(\d{4})$/);
  return match ? Number(match[1]) : Number.NaN;
}

function getBirthYearLabel(birthDate) {
  const year = getBirthYear(birthDate);
  return Number.isFinite(year) ? String(year) : "----";
}

function findTop2025ForEntrant(entrant) {
  const entrantName = normalizePersonName(formatName(entrant));
  return data.top2025.find((item) => (
    matchesRace(item) && normalizePersonName(item.name) === entrantName
  ));
}

function normalizePersonName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z ]/g, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

function formatRank(rank) {
  const value = Number(rank);
  if (!Number.isFinite(value)) return "-";
  return value === 1 ? "1er" : `${value}e`;
}

function entrantKey(entrant) {
  return [entrant.lastName, entrant.firstName, entrant.birthDate, entrant.sex].join("|").toLowerCase();
}

function categoryClass(category) {
  if (sameCategory(category, "Cadet")) return "cat-cadet";
  if (sameCategory(category, "Junior")) return "cat-junior";
  if (sameCategory(category, "Senior")) return "cat-senior";
  return "cat-other";
}

function selectRecordForCategory(category) {
  if (category === "all") {
    state.selectedRecordKey = "";
    return;
  }
  const record = currentRecordRows().find((row) => sameCategory(row.category, category));
  state.selectedRecordKey = record ? recordKey(record) : "";
}

function renderSwimmerDetails() {
  if (!state.selectedSwimmerId) {
    swimmerDetails.hidden = true;
    swimmerDetails.innerHTML = "";
    return;
  }
  const entries = data.entrants
    .filter((entrant) => (entrant.swimmerId || entrantKey(entrant)) === state.selectedSwimmerId)
    .sort((a, b) => eventOrder(a.eventId) - eventOrder(b.eventId) || timeToMs(a.seedTime) - timeToMs(b.seedTime));
  if (!entries.length) {
    swimmerDetails.hidden = true;
    swimmerDetails.innerHTML = "";
    return;
  }
  const swimmer = entries[0];
  const uniqueEntries = [...entries.reduce((map, entry) => {
    const key = `${entry.eventId}|${entry.sex || swimmer.sex || ""}`;
    if (!map.has(key)) map.set(key, entry);
    return map;
  }, new Map()).values()];
  const france2025 = findFrance2025Results(swimmer);
  const internationalMedals = findInternationalMedals(swimmer);
  const heldRecords = findAllRecordsHeldByEntrant(swimmer);
  const competitionStats = findCompetitionStatsForEntrant(swimmer);
  const swimmerInfos = findSwimmerInfosForEntrant(swimmer);
  swimmerDetails.hidden = false;
  swimmerDetails.innerHTML = `
    <div class="details-title">
      <div class="swimmer-identity">
        <h4>${escapeHtml(formatName(swimmer))} ${renderCompetitionStatBadges(swimmer)} ${renderEdfBadges(swimmer)}</h4>
        <span>${escapeHtml(swimmer.club || "")} - ${escapeHtml(categoryLabel(swimmer.category, swimmer.sex))} - ${escapeHtml(getBirthYearLabel(swimmer.birthDate))}</span>
        ${competitionStats.length ? `
          <div class="stat-detail-list">
            ${competitionStats.map((item) => `<strong>${escapeHtml(item.icon || "*")} ${escapeHtml(item.detail || item.label || "Repère compétition")}</strong>`).join("")}
          </div>
        ` : ""}
        ${swimmerInfos.length ? `
          <div class="swimmer-info-list">
            ${swimmerInfos.map((item) => `<strong>${escapeHtml(item.info)}</strong>`).join("")}
          </div>
        ` : ""}
      </div>
      <div class="compact-program" aria-label="Courses engagées du weekend">
        ${uniqueEntries.map((entry) => `
          <span class="${categoryClass(entry.category)}">
            ${escapeHtml(shortEventLabel(entry.eventId))}
          </span>
        `).join("")}
      </div>
      <button class="icon-button close-details" title="Fermer la fiche" aria-label="Fermer la fiche">×</button>
    </div>
    ${heldRecords.length ? `
      <div class="detail-section">
        <h5>Records actuels détenus</h5>
        <div class="detail-list">
          ${heldRecords.map((record) => `
            <div class="detail-row record-detail ${categoryClass(record.category)}">
              <span>${renderRecordFlag(record)} ${renderRecordCategoryFlag(record)} <strong>${escapeHtml(eventLabel(record.eventId))}</strong> - ${escapeHtml([record.time, record.date, record.place].filter(Boolean).join(" - ") || "-")}</span>
            </div>
          `).join("")}
        </div>
      </div>
    ` : ""}
    ${internationalMedals.length ? `
      <div class="detail-section">
        <h5>International</h5>
        <div class="compact-achievement-list">
          ${internationalMedals.map((medal) => `
            <div class="compact-achievement ${categoryClass(swimmer.category)}">
              <span class="medal-dot ${medalClass(medal.medal)}" aria-label="${escapeHtml(medal.medal || "Médaille")}">●</span>
              <span><strong>${escapeHtml(medal.eventLabel || eventLabel(medal.eventId))}</strong>${escapeHtml([medal.time, shortChampionshipLabel(medal.championship)].filter(Boolean).join(" - ")) ? ` - ${escapeHtml([medal.time, shortChampionshipLabel(medal.championship)].filter(Boolean).join(" - "))}` : ""}</span>
            </div>
          `).join("")}
        </div>
      </div>
    ` : ""}
    ${france2025.length ? `
      <div class="detail-section">
        <h5>France 2025</h5>
        <div class="compact-achievement-list france-compact">
          ${france2025.map((row) => `
            <div class="compact-achievement ${categoryClass(row.category)}">
              <span><strong>${escapeHtml(formatRank(row.rank))}</strong> ${escapeHtml(categoryLabel(row.category, row.sex))}</span>
              <span>${escapeHtml(eventLabel(row.eventId))}</span>
              <span>${escapeHtml(row.time || "-")}</span>
            </div>
          `).join("")}
        </div>
      </div>
    ` : ""}
  `;
}

function eventOrder(eventId) {
  const index = data.events.findIndex((event) => event.id === eventId);
  return index === -1 ? 99 : index;
}

function eventLabel(eventId) {
  const event = data.events.find((item) => item.id === eventId);
  return event?.label || String(eventId || "").toUpperCase();
}

function shortEventLabel(eventId) {
  return String(eventId || "").toUpperCase();
}

function findFrance2025Results(entrant) {
  const entrantName = normalizePersonName(formatName(entrant));
  return data.top2025
    .filter((item) => item.sex === entrant.sex && normalizePersonName(item.name) === entrantName)
    .sort((a, b) => eventOrder(a.eventId) - eventOrder(b.eventId) || (a.rank || 99) - (b.rank || 99));
}

function medalForRank(rank) {
  const value = Number(rank);
  if (value === 1) return "Or";
  if (value === 2) return "Argent";
  if (value === 3) return "Bronze";
  return "Finaliste";
}

function medalClass(value) {
  const text = String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (text.includes("or")) return "medal-gold";
  if (text.includes("argent")) return "medal-silver";
  if (text.includes("bronze")) return "medal-bronze";
  return "medal-neutral";
}

function sameCategory(a, b) {
  return String(a || "").toLowerCase() === String(b || "").toLowerCase();
}

function currentRecordRows() {
  const order = { Cadet: 1, Junior: 2, Senior: 3 };
  const relayCategories = isRelayEntrant({ eventId: state.eventId })
    ? new Set(data.entrants.filter(matchesRace).map((entrant) => entrant.category).filter(Boolean))
    : null;
  return data.records
    .filter(shouldKeepRecord)
    .filter((record) => recordMatchesRace(record))
    .filter((record) => !relayCategories || relayCategories.has(record.category))
    .sort((a, b) => (order[a.category] || 99) - (order[b.category] || 99));
}

function shortRecordLabel(row) {
  if (sameCategory(row.category, "Cadet")) return state.sex === "F" ? "MPF cadette" : "MPF cadet";
  if (sameCategory(row.category, "Junior")) return "RF junior";
  if (sameCategory(row.category, "Senior")) return "RF senior";
  return row.label || row.category || "Record";
}

function recordFlagText(row) {
  if (sameCategory(row.category, "Cadet")) return "MPF";
  if (sameCategory(row.category, "Junior")) return "RFJ";
  if (sameCategory(row.category, "Senior")) return "RF";
  return "REC";
}

function renderRecordFlag(row) {
  return `<span class="record-flag" title="${escapeHtml(shortRecordLabel(row))}">${escapeHtml(recordFlagText(row))}</span>`;
}

function shortCategoryLabel(category) {
  if (sameCategory(category, "Cadet")) return "CAD";
  if (sameCategory(category, "Junior")) return "JUN";
  if (sameCategory(category, "Senior")) return "SEN";
  return String(category || "").slice(0, 3).toUpperCase();
}

function renderRecordCategoryFlag(row) {
  return `<span class="record-category-flag ${categoryClass(row.category)}">${escapeHtml(shortCategoryLabel(row.category))}</span>`;
}

function renderTop2025() {
  const categories = ["Cadet", "Junior", "Senior"];
  top2025Box.innerHTML = categories.map((category) => {
    const rows = data.top2025
      .filter((item) => matchesRace(item) && sameCategory(item.category, category))
      .sort((a, b) => (a.rank || 99) - (b.rank || 99))
      .slice(0, 5);
    return `
      <div class="ranking-list ${categoryClass(category)}">
        <h4>${escapeHtml(categoryLabel(category))}</h4>
        <ol>
          ${rows.length ? rows.map((row) => `
            <li>
              <span class="rank">${escapeHtml(row.rank || "-")}</span>
              <span>
                <strong>${escapeHtml(row.name || "-")}</strong>
                <span class="muted-text">${escapeHtml(row.club || "")}</span>
              </span>
              <span class="time">${escapeHtml(row.time || "-")}</span>
            </li>
          `).join("") : `<li class="empty">À renseigner</li>`}
        </ol>
      </div>
    `;
  }).join("");
}

function recordDescription(row) {
  return [
    row.holder || "Titulaire à renseigner",
    row.club,
    row.date,
    row.place
  ].filter(Boolean).join(" - ");
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

function parseDelimitedRows(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const source = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const separator = source.split("\n")[0]?.includes(";") ? ";" : ",";
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '"') {
      if (quoted && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === separator && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if (char === "\n" && !quoted) {
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows.map((cells) => (cells.length === 1 && cells[0].includes(";") ? cells[0].split(";").map((item) => item.trim()) : cells));
}

function normalizeSheetHeader(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function sheetObjects(rows) {
  if (!rows.length) return [];
  const headerIndex = rows.findIndex((row) => row.some((cell) => normalizeSheetHeader(cell)));
  if (headerIndex < 0) return [];
  const headers = rows[headerIndex].map(normalizeSheetHeader);
  return rows.slice(headerIndex + 1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""])));
}

function rowValue(row, names) {
  return names.map((name) => row[normalizeSheetHeader(name)]).find((value) => String(value || "").trim()) || "";
}

function sheetEventId(value) {
  const normalized = normalizePdfLabel(value);
  const compact = normalized.replace(/[^a-z0-9]+/g, "");
  const signature = eventSignature(value);
  return importedEventId(value) ||
    (data.events || []).find((event) => event.id === normalized || event.id === compact)?.id ||
    signature ||
    compact ||
    normalized;
}

function sheetTime(value) {
  const clean = String(value || "").trim().replace(",", ".").replace(/\s+/g, "");
  if (!clean || clean === ":." || clean === "00.00" || clean === "00:00") return "";
  if (/^\d{6}$/.test(clean)) {
    return `${clean.slice(0, 2)}:${clean.slice(2, 4)}.${clean.slice(4, 6)}`;
  }
  if (/^\d{5}$/.test(clean)) {
    return `00:${clean.slice(1, 3)}.${clean.slice(3, 5)}`;
  }
  return importedSeriesTime(clean);
}

function seedSourceTimeKey(value) {
  const ms = timeToMs(value);
  if (Number.isFinite(ms)) return String(ms);
  return String(value || "").trim().replace(",", ".").replace(/^00:/, "");
}

function sheetSex(value) {
  const text = normalizeSheetHeader(value);
  if (["f", "femme", "femmes"].includes(text)) return "F";
  if (["h", "homme", "hommes", "m"].includes(text)) return "M";
  if (["x", "mixte"].includes(text)) return "X";
  return String(value || "").trim();
}

function splitRawTimingCells(cells) {
  if (String(cells?.[0] || "").includes(";")) {
    return String(cells[0]).split(";").map((item) => fixPdfEncoding(item).trim());
  }
  return (cells || []).map((item) => fixPdfEncoding(item).trim());
}

function displayNameFromParts(firstName, lastName, fallback = "") {
  return formatPersonNameParts(firstName, lastName, fallback);
}

function categoryFromCodeOrText(value) {
  const text = String(value || "").toUpperCase();
  if (text.includes("CA") || text.includes("CADET")) return "Cadet";
  if (text.includes("JU") || text.includes("JUNIOR")) return "Junior";
  if (text.includes("SE") || text.includes("SENIOR")) return "Senior";
  return value || "";
}

function personKeyFromSheet(row, sex = "") {
  const firstName = rowValue(row, ["prenom", "prénom", "firstName"]);
  const lastName = rowValue(row, ["nom", "lastName"]);
  const fullName = rowValue(row, ["nom_prenom", "nom prenom", "detenteur", "détenteur", "name"]);
  return `${sheetSex(sex || rowValue(row, ["sexe", "sex"]) || "")}|${normalizePersonName(displayNameFromParts(firstName, lastName, fullName))}`;
}

async function fetchSpeakerSheetRows(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SPEAKER_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}&cache=${Date.now()}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`onglet ${sheetName} inaccessible (${response.status})`);
  const text = await response.text();
  if (/^\s*</.test(text)) {
    throw new Error(`Google n'a pas renvoyé le CSV de l'onglet ${sheetName}. Vérifie que le fichier est bien partagé en lecture avec le lien.`);
  }
  const rows = parseDelimitedRows(text);
  if (!rows.length) throw new Error(`onglet ${sheetName} vide ou non lisible`);
  return rows;
}

function parseTopSheet(rows) {
  return sheetObjects(rows).map((row) => {
    const firstName = rowValue(row, ["prenom", "prénom"]);
    const lastName = rowValue(row, ["nom"]);
    return {
      eventId: rowValue(row, ["course_id", "eventId"]).toLowerCase(),
      sex: rowValue(row, ["sexe", "sex"]),
      category: categoryFromCodeOrText(rowValue(row, ["categorie", "catégorie", "category"])),
      rank: Number(rowValue(row, ["rang", "rank"])) || "",
      name: displayNameFromParts(firstName, lastName, rowValue(row, ["nom_prenom", "name"])),
      birthDate: rowValue(row, ["annee_naissance", "naissance", "birthDate"]),
      clubCode: rowValue(row, ["club_code", "code_club"]),
      club: rowValue(row, ["club", "club_nom_complet"]),
      time: importedSeriesTime(rowValue(row, ["temps", "time"]))
    };
  }).filter((row) => row.eventId && row.sex && row.category && row.name && row.time);
}

function parseRecordsSheet(rows) {
  const directRows = sheetObjects(rows).map((row) => {
    const category = categoryFromCodeOrText(rowValue(row, ["categorie", "catégorie", "category"]));
    const type = rowValue(row, ["type", "label"]);
    return {
      eventId: sheetEventId(rowValue(row, ["course_id", "eventId", "epreuve", "épreuve"])),
      sex: sheetSex(rowValue(row, ["sexe", "sex"])),
      category,
      label: type || (sameCategory(category, "Cadet") ? "Meilleure performance" : `Record de France ${category}`),
      holder: rowValue(row, ["detenteur", "détenteur", "holder", "nom_prenom", "nom"]),
      club: rowValue(row, ["club_code", "club"]),
      time: sheetTime(rowValue(row, ["temps", "time"])),
      date: rowValue(row, ["date", "annee", "année"]),
      place: rowValue(row, ["lieu", "place"])
    };
  }).filter((row) => row.eventId && row.sex && row.category && row.time && shouldKeepRecord(row));
  if (directRows.length) return directRows;

  const records = [];
  let context = null;
  rows.forEach((cells) => {
    const [first = "", time = "", holder = "", club = "", date = "", place = ""] = cells.map((cell) => fixPdfEncoding(cell).trim());
    const title = normalizeSheetHeader(first);
    if (!first) return;
    if (title.includes("jeunes_hommes")) context = { sex: "M", category: "Junior", label: "Record de France junior" };
    else if (title.includes("jeunes_femmes")) context = { sex: "F", category: "Junior", label: "Record de France junior" };
    else if (title.includes("toutes_categories_hommes")) context = { sex: "M", category: "Senior", label: "Record de France senior" };
    else if (title.includes("toutes_categories_femmes")) context = { sex: "F", category: "Senior", label: "Record de France senior" };
    else if (title.includes("mpf_cadets")) context = { sex: "M", category: "Cadet", label: "Meilleure performance cadet" };
    else if (title.includes("mpf_cadettes")) context = { sex: "F", category: "Cadet", label: "Meilleure performance cadette" };
    if (!context) return;
    if (/^(epreuve|surface|immersion|apnee|apnée|bi palmes|relais)$/i.test(first)) return;
    const eventId = sheetEventId(first);
    const parsedTime = sheetTime(time);
    if (!eventId || !parsedTime) return;
    if (!shouldKeepRecord({ eventId, club, holder })) return;
    records.push({
      eventId,
      sex: context.sex,
      category: context.category,
      label: context.label,
      holder,
      club,
      time: parsedTime,
      date,
      place
    });
  });
  return records;
}

function parseEdfSheet(rows) {
  const members = [];
  sheetObjects(rows).forEach((row) => {
    const edf = rowValue(row, ["edf", "equipe", "équipe", "selection", "sélection"]);
    const base = { personKey: personKeyFromSheet(row), label: edf || "Equipe de France" };
    const senior = rowValue(row, ["edf_senior_2025", "senior", "s"]) || (/edf\s*s/i.test(edf) ? edf : "");
    const junior = rowValue(row, ["edf_junior_2026", "junior", "j"]) || (/edf\s*j/i.test(edf) ? edf : "");
    if (/oui|x|1|s/i.test(senior)) members.push({ ...base, team: "S", label: "EDF senior 2025" });
    if (/oui|x|1|j/i.test(junior)) members.push({ ...base, team: "J", label: "EDF junior 2026" });
  });
  return members.filter((row) => row.personKey !== "|");
}

function statTypeFromLabel(label) {
  const text = normalizeSheetHeader(label);
  const female = ["nageuse", "femme", "femmes", "fille", "filles", "female", "feminin", "doyenne", "vieille"].some((word) => text.includes(word));
  const male = ["nageur", "homme", "hommes", "garcon", "garcons", "male", "masculin", "doyen", "vieux"].some((word) => text.includes(word));
  if (text.includes("anniversaire")) return { type: "birthday", icon: "🎂", label: "Anniversaire aujourd'hui" };
  if (text.includes("plus_jeune")) {
    if (female) return { type: "youngest-female", icon: "👶", label: "Plus jeune nageuse de la compétition", sex: "F" };
    if (male) return { type: "youngest-male", icon: "👶", label: "Plus jeune nageur de la compétition", sex: "M" };
    return { type: "youngest", icon: "👶", label: "Plus jeune de la compétition" };
  }
  if (text.includes("doyenne") || (text.includes("plus_vieille") && !male)) return { type: "oldest-female", icon: "★", label: "Doyenne de la rencontre", sex: "F" };
  if (text.includes("doyen") || text.includes("plus_vieux")) return { type: "oldest-male", icon: "★", label: "Doyen de la rencontre", sex: "M" };
  return null;
}

function parseCompetitionStatPerson(value) {
  const text = fixPdfEncoding(value).replace(/\s+/g, " ").trim();
  const match = text.match(/^(.+?)\s+(\d{2}\/\d{2}\/\d{4})(?:\s+([A-Z0-9]+))?(?:\s+\(([^)]+)\))?$/i);
  if (!match) return null;
  const [, name, birthDate, clubCode = "", extra = ""] = match;
  return {
    name: name.trim(),
    birthDate,
    birthYear: (birthDate.match(/\d{4}$/) || [])[0] || "",
    clubCode: clubCode.toUpperCase(),
    extra: extra.trim()
  };
}

function ageFromFrenchDate(value, referenceDate = new Date()) {
  const match = String(value || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return "";
  const birthDate = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  if (Number.isNaN(birthDate.getTime())) return "";
  let age = referenceDate.getFullYear() - birthDate.getFullYear();
  const birthdayThisYear = new Date(referenceDate.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  if (referenceDate < birthdayThisYear) age -= 1;
  return age >= 0 ? `${age} ans` : "";
}

function frenchDateMatchesToday(value, referenceDate = new Date()) {
  const match = String(value || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return false;
  return Number(match[1]) === referenceDate.getDate() && Number(match[2]) === referenceDate.getMonth() + 1;
}

function competitionStatAgeLabel(type, birthDate) {
  if (!String(type || "").startsWith("youngest") && !String(type || "").startsWith("oldest")) return "";
  return ageFromFrenchDate(birthDate);
}

function parseCompetitionStatsSheet(rows) {
  const objectStats = sheetObjects(rows).map((row) => {
    const label = rowValue(row, ["type", "repere", "repère", "stat", "categorie", "catégorie"]);
    const currentType = statTypeFromLabel(label);
    if (!currentType) return null;
    const name = rowValue(row, ["nom_prenom", "nom prenom", "nageur", "nageuse", "nom", "name"]);
    const firstName = rowValue(row, ["prenom", "prénom", "firstName"]);
    const lastName = rowValue(row, ["nom", "lastName"]);
    const birthDate = rowValue(row, ["date_naissance", "date naissance", "naissance", "birthDate"]);
    if (!name && !firstName && !lastName) return null;
    const person = {
      name: name || formatPersonNameParts(firstName, lastName),
      birthDate,
      birthYear: (String(birthDate).match(/\d{4}$/) || [])[0] || rowValue(row, ["annee", "année", "birthYear"]),
      clubCode: rowValue(row, ["club", "code_club", "code club"]).toUpperCase(),
      extra: rowValue(row, ["info", "extra", "commentaire"])
    };
    const sex = sheetSex(rowValue(row, ["sexe", "sex"])) || currentType.sex || "";
    const ageLabel = competitionStatAgeLabel(currentType.type, person.birthDate);
    if (currentType.type === "birthday" && !frenchDateMatchesToday(person.birthDate)) return null;
    const detailParts = [currentType.label, ageLabel, person.birthDate, person.clubCode, person.extra].filter(Boolean);
    return {
      ...currentType,
      ...person,
      ageLabel,
      sex,
      detail: detailParts.join(" - ")
    };
  }).filter(Boolean);
  if (objectStats.length) return objectStats;

  const stats = [];
  let currentType = null;
  rows.forEach((cells) => {
    const first = fixPdfEncoding(cells?.[0] || "").trim();
    if (!first) return;
    const type = statTypeFromLabel(first);
    if (type) {
      currentType = type;
      return;
    }
    if (!currentType) return;
    const person = parseCompetitionStatPerson(first);
    if (!person) return;
    const ageLabel = competitionStatAgeLabel(currentType.type, person.birthDate);
    if (currentType.type === "birthday" && !frenchDateMatchesToday(person.birthDate)) return;
    const detailParts = [currentType.label, ageLabel, person.birthDate, person.clubCode, person.extra].filter(Boolean);
    stats.push({
      ...currentType,
      ...person,
      ageLabel,
      detail: detailParts.join(" - ")
    });
  });
  return stats;
}

function parseInternationalSheet(rows) {
  return sheetObjects(rows).map((row) => {
    const eventText = rowValue(row, ["course_id", "eventId", "epreuve", "épreuve", "course", "course_libelle"]);
    return {
      personKey: personKeyFromSheet(row, rowValue(row, ["sexe", "sex"])),
      eventId: sheetEventId(eventText),
      sex: sheetSex(rowValue(row, ["sexe", "sex"])),
      eventLabel: rowValue(row, ["course_libelle", "course", "epreuve", "épreuve"]) || eventText,
      medal: rowValue(row, ["medaille", "médaille"]),
      time: sheetTime(rowValue(row, ["temps", "time"])),
      championship: [rowValue(row, ["championnat", "competition", "compétition"]), rowValue(row, ["annee", "année"])].filter(Boolean).join(" "),
      place: rowValue(row, ["lieu", "place"])
    };
  }).filter((row) => row.personKey !== "|" && row.eventId);
}

function parseQualificationsSheet(rows) {
  const objects = sheetObjects(rows);
  const directRows = objects.map((row) => ({
    eventId: sheetEventId(rowValue(row, ["course_id", "eventId", "epreuve", "épreuve", "course"])),
    sex: rowValue(row, ["sexe", "sex"]),
    label: rowValue(row, ["type", "label"]),
    time: sheetTime(rowValue(row, ["temps", "time"])),
    category: rowValue(row, ["categorie_concernee", "catégorie", "category"])
  })).filter((row) => row.eventId && row.sex && row.label && row.time);
  if (directRows.length) return directRows;

  const qualifications = [];
  rows.forEach((cells) => {
    const sexText = String(cells[0] || "").trim();
    const eventText = String(cells[1] || "").trim();
    if (!/^(femmes|hommes)$/i.test(sexText) || !eventText) return;
    const sex = /^femmes$/i.test(sexText) ? "F" : "M";
    const eventId = sheetEventId(eventText);
    const tsp = sheetTime(cells[2]);
    const trp = sheetTime(cells[3]);
    if (eventId && tsp) qualifications.push({ eventId, sex, label: "TSP", time: tsp, category: "Senior" });
    if (eventId && trp) qualifications.push({ eventId, sex, label: "TRP", time: trp, category: "Relève" });
  });
  return qualifications;
}

function parseClubSheet(rows) {
  const clubs = new Map();
  sheetObjects(rows).forEach((row) => {
    const code = rowValue(row, ["club_code", "code_club"]).toUpperCase();
    const name = rowValue(row, ["club_nom_complet", "club", "nom"]);
    if (code && name) clubs.set(code, name);
  });
  return clubs;
}

function parseSwimmerInfosSheet(rows) {
  return sheetObjects(rows).map((row) => {
    const firstName = rowValue(row, ["prenom", "prénom", "firstName"]);
    const lastName = rowValue(row, ["nom", "lastName"]);
    const fullName = rowValue(row, ["nom_prenom", "nom prenom", "nageur", "nageuse", "name"]);
    const club = rowValue(row, ["club", "code_club", "club_code", "club_nom_complet"]);
    const info = rowValue(row, ["infos", "info", "remarque", "commentaire"]);
    const name = displayNameFromParts(firstName, lastName, fullName);
    return {
      name,
      club,
      info,
      personKey: normalizePersonName(name),
      clubKey: normalizeClubMatch(club)
    };
  }).filter((row) => row.personKey && row.info);
}

function seedSourceNameFromRen(cells) {
  const date = cells[1] || "";
  const year = (date.match(/\b(20\d{2})\b/) || date.match(/\b(\d{2})$/))?.[1] || "";
  const normalizedYear = year.length === 2 ? `20${year}` : year;
  const place = fixPdfEncoding(cells[3] || "").replace(/,\s*France$/i, "").trim();
  return [place, normalizedYear].filter(Boolean).join(" ");
}

function parseSeedSourceSheet(rows) {
  const sourceByKey = new Map();
  let currentSource = "";
  rows.forEach((cells) => {
    cells = splitRawTimingCells(cells);
    if (!cells.length) return;
    if (cells[0] === "REN") {
      currentSource = seedSourceNameFromRen(cells);
      return;
    }
    if (cells[0] !== "NAG" || !currentSource) return;
    const lastName = fixPdfEncoding(cells[1] || "").trim();
    const firstName = fixPdfEncoding(cells[2] || "").trim();
    const birthDate = cells[3] || "";
    const birthYear = (birthDate.match(/\d{4}$/) || [])[0] || "";
    const sex = cells[4] || "";
    const clubCode = String(cells[5] || "").trim().toUpperCase();
    const eventId = normalizePdfLabel(cells[7] || "").toLowerCase();
    const times = [sheetTime(cells[15] || ""), sheetTime(cells[8] || "")]
      .filter((time, index, list) => time && time !== "00:00" && time !== "00.00" && list.indexOf(time) === index);
    if (!lastName || !firstName || !eventId || !times.length) return;
    times.forEach((time) => {
      const row = { eventId, sex, seedTime: time, swimmerId: `${lastName.toLowerCase()}|${firstName.toLowerCase()}|${birthYear}|${sex}`, clubCode, firstName, lastName };
      seedSourceLookupKeys(row).forEach((key) => sourceByKey.set(key, currentSource));
    });
  });
  return sourceByKey;
}

function applySpeakerInfoToEntrants(entrants, seedSources, clubs) {
  return entrants.map((entrant) => {
    const seedSource = seedSourceLookupKeys(entrant).map((key) => seedSources.get(key)).find(Boolean);
    const clubName = clubs.get(String(entrant.clubCode || "").toUpperCase());
    return {
      ...entrant,
      seedSource: seedSource || entrant.seedSource || "",
      club: clubName || entrant.club
    };
  });
}

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
  const includePrint = options.includePrint !== false;
  const generatedAt = new Date().toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const meetName = `${data.meet?.name || "Compétition"}${data.meet?.city ? ` - ${data.meet.city}` : ""}`;
  const body = rows.length ? rows.map((alert, index) => {
    const event = data.events.find((item) => item.id === alert.eventId);
    const sexLabel = alert.sex === "F" ? "Femmes" : (alert.sex === "M" ? "Hommes" : "Mixte");
    const seriesLabel = alert.stage && isFinalStage(alert.stage) ? finalStageLabel(alert.stage) : `Série ${alert.series || "-"}`;
    const sessionLabel = alert.session && alert.session !== "all" ? `Session ${alert.session}` : "Session -";
    const identity = `${alert.displayName || "Concurrent"}${alertClubShortLabel(alert) ? ` - ${alertClubShortLabel(alert)}` : ""}`;
    const timeline = alertTimelineItems(alert).map(([label, value]) => `${label} ${formatAlertDateTime(value)}`).join(" | ");
    return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(event?.label || alert.eventId)} ${escapeHtml(sexLabel)}<br><small>${escapeHtml(sessionLabel)} - ${escapeHtml(seriesLabel)} - ligne ${escapeHtml(alert.line || "-")}</small></td>
        <td>${escapeHtml(identity)}</td>
        <td>${escapeHtml(decisionMotifLabel(alert))}<br><small>${escapeHtml(alertStatusLabel(alert))}</small></td>
        <td>${escapeHtml(timeline || "-")}</td>
      </tr>
    `;
  }).join("") : `<tr><td colspan="5" class="empty">Aucune action d'arbitrage enregistrée.</td></tr>`;
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Journal d'arbitrage</title>
  <style>
    @page { margin: 12mm; }
    body { font-family: Arial, sans-serif; color: #15232d; font-size: 11px; }
    h1 { margin: 0 0 4px; font-size: 18px; }
    p { margin: 0 0 10px; color: #52616b; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #d8e0e6; padding: 5px 6px; vertical-align: top; text-align: left; }
    th { background: #eef4f7; font-size: 10px; text-transform: uppercase; }
    td:first-child { width: 24px; text-align: center; font-weight: 700; }
    small { color: #60717c; font-size: 10px; }
    .empty { text-align: center; color: #60717c; }
    .print-actions { margin-bottom: 10px; }
    button { min-height: 32px; padding: 0 10px; border: 1px solid #b9c8d1; border-radius: 6px; background: #eef4f7; font-weight: 700; cursor: pointer; }
    @media print { .print-actions { display: none; } body { font-size: 10px; } }
  </style>
</head>
<body>
  ${includePrint ? `<div class="print-actions"><button onclick="window.print()">Enregistrer en PDF</button></div>` : ""}
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(meetName)} - généré le ${escapeHtml(generatedAt)} - ${rows.length} lignes</p>
  <table>
    <thead>
      <tr><th>#</th><th>Course / session</th><th>Nageur / relais</th><th>Décision / action</th><th>Vie de la décision</th></tr>
    </thead>
    <tbody>${body}</tbody>
  </table>
</body>
</html>`;
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
  const includePrint = options.includePrint !== false;
  const generatedAt = new Date().toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const meet = archive.meet || data.meet || {};
  const meetName = `${meet.name || "Compétition"}${meet.city ? ` - ${meet.city}` : ""}`;
  const body = rows.length ? rows
    .slice()
    .sort((a, b) => String(a.session || "").localeCompare(String(b.session || ""), "fr", { numeric: true }) || String(a.eventLabel || "").localeCompare(String(b.eventLabel || "")))
    .map((result, index) => {
      const sexLabel = result.sexLabel || sexDisplayLabel(result.sex);
      const finalistCount = finalRowsCount(result.finalists);
      const withdrawalCount = (result.finalWithdrawals || []).filter((item) => item.withdrawnAt).length;
      const status = result.hasFinal
        ? (result.finalistsAnnouncedAt ? "Publié avec finalistes" : "En attente annonce speaker")
        : "Publié";
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(result.eventLabel || result.eventId || "-")} ${escapeHtml(sexLabel)}<br><small>Session ${escapeHtml(result.session || "-")}</small></td>
          <td>${escapeHtml(status)}${result.isPartial ? "<br><small>Résultat partiel</small>" : ""}</td>
          <td>${result.pdfDataUrl ? `<a href="${escapeHtml(result.pdfDataUrl)}" target="_blank" rel="noopener">${escapeHtml(result.pdfName || "Ouvrir le PDF")}</a>` : escapeHtml(result.pdfName || "-")}</td>
          <td>${finalistCount ? `${escapeHtml(String(finalistCount))} finaliste${finalistCount > 1 ? "s" : ""}${withdrawalCount ? `<br><small>${escapeHtml(String(withdrawalCount))} forfait${withdrawalCount > 1 ? "s" : ""}</small>` : ""}` : "-"}</td>
        </tr>
      `;
    }).join("") : `<tr><td colspan="5" class="empty">Aucun résultat archivé.</td></tr>`;
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Archive résultats publics</title>
  <style>
    @page { margin: 12mm; }
    body { font-family: Arial, sans-serif; color: #15232d; font-size: 11px; }
    h1 { margin: 0 0 4px; font-size: 18px; }
    p { margin: 0 0 10px; color: #52616b; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #d8e0e6; padding: 5px 6px; vertical-align: top; text-align: left; }
    th { background: #eef4f7; font-size: 10px; text-transform: uppercase; }
    td:first-child { width: 24px; text-align: center; font-weight: 700; }
    small { color: #60717c; font-size: 10px; }
    .empty { text-align: center; color: #60717c; }
    .print-actions { margin-bottom: 10px; }
    button { min-height: 32px; padding: 0 10px; border: 1px solid #b9c8d1; border-radius: 6px; background: #eef4f7; font-weight: 700; cursor: pointer; }
    @media print { .print-actions { display: none; } body { font-size: 10px; } }
  </style>
</head>
<body>
  ${includePrint ? `<div class="print-actions"><button onclick="window.print()">Enregistrer en PDF</button></div>` : ""}
  <h1>Archive résultats publics</h1>
  <p>${escapeHtml(meetName)} - archive du ${escapeHtml(archive.createdLabel || formatAlertDateTime(archive.createdAt) || "-")} - généré le ${escapeHtml(generatedAt)} - ${rows.length} résultats</p>
  <table>
    <thead>
      <tr><th>#</th><th>Course / session</th><th>Statut</th><th>PDF</th><th>Finales</th></tr>
    </thead>
    <tbody>${body}</tbody>
  </table>
</body>
</html>`;
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

eventSelect.addEventListener("change", () => {
  const row = programRowFromRaceOption(eventSelect.value);
  if (row.eventId) state.eventId = row.eventId;
  if (row.sex) state.sex = row.sex;
  state.programKey = row.order ? programKey(row) : "";
  clearSearch();
  state.category = "all";
  state.series = firstSeriesSelectionForCurrentRace();
  state.selectedSwimmerId = "";
  state.selectedRecordKey = "";
  render();
});

function changeSession(sessionNumber) {
  state.session = sessionNumber;
  const firstProgram = programRows()[0];
  if (firstProgram) {
    applyProgramRow(firstProgram);
  }
  clearSearch();
  state.category = "all";
  state.series = firstSeriesSelectionForCurrentRace();
  state.selectedSwimmerId = "";
  state.selectedRecordKey = "";
  render();
}

sessionControls?.addEventListener("change", (event) => {
  if (event.target?.id !== "sessionSelect") return;
  changeSession(event.target.value);
});

publicPositionToggle?.addEventListener("change", (event) => {
  const enabled = event.target.checked;
  event.target.disabled = true;
  setPublicPositionEnabled(enabled).catch((error) => {
    console.warn("Modification du repère public impossible", error);
    event.target.checked = !enabled;
  }).finally(() => {
    event.target.disabled = state.role !== "speaker" || !firestoreDb;
    render();
  });
});

async function openRoleConsole(nextRole) {
  if (!ROLE_LABELS[nextRole]) return;
  if (!requestRoleAccess(nextRole)) {
    const access = await askRolePin(nextRole);
    if (!access?.allowed) return;
    const reserved = await acquireRoleLock(nextRole, { adminBypass: access.adminBypass });
    if (!reserved) {
      unlockedRoles = unlockedRoles.filter((role) => role !== nextRole);
      saveUnlockedRoles();
      return;
    }
  } else {
    const reserved = await acquireRoleLock(nextRole, { adminBypass: false });
    if (!reserved) {
      unlockedRoles = unlockedRoles.filter((role) => role !== nextRole);
      saveUnlockedRoles();
      return;
    }
  }
  profileHomeActive = false;
  switchRoleUnlocked(nextRole);
  render();
  updateConsolePresence(true);
}

document.querySelectorAll(".role-chip").forEach((button) => {
  button.addEventListener("click", async () => {
    await openRoleConsole(button.dataset.role || "speaker");
  });
});

profileHome?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-home-role]");
  if (!button) return;
  await openRoleConsole(button.dataset.homeRole || "live");
});

profileHomeBtn?.addEventListener("click", () => {
  profileHomeActive = true;
  render();
  releaseConsolePresence();
  refreshPresenceCounts();
});

competitionModeTopBtn?.addEventListener("click", () => {
  toggleCompetitionMode();
});

manualRefreshBtn?.addEventListener("click", async () => {
  manualRefreshBtn.disabled = true;
  manualRefreshBtn.textContent = "Actualisation...";
  await refreshFirebaseOnce(true);
  manualRefreshBtn.disabled = false;
  manualRefreshBtn.textContent = "Actualiser";
});

headerRefs.addEventListener("click", (event) => {
  const button = event.target.closest(".ref-chip-button");
  if (!button) return;
  state.selectedRecordKey = state.selectedRecordKey === button.dataset.recordKey ? "" : button.dataset.recordKey;
  renderHeaderReferences();
  renderEntrants();
});

headerRefDetails.addEventListener("click", (event) => {
  if (!event.target.closest(".close-ref-details")) return;
  state.selectedRecordKey = "";
  renderHeaderReferences();
  renderEntrants();
});

entrantsSubtitle?.addEventListener("click", (event) => {
  const closeButton = event.target.closest(".close-ref-details");
  if (closeButton) {
    state.selectedRecordKey = "";
    renderHeaderReferences();
    renderEntrants();
    return;
  }
  const button = event.target.closest(".ref-chip-button");
  if (!button) return;
  state.selectedRecordKey = state.selectedRecordKey === button.dataset.recordKey ? "" : button.dataset.recordKey;
  renderHeaderReferences();
  renderEntrants();
});

seriesControls.addEventListener("click", (event) => {
  const button = event.target.closest("[data-series]");
  if (!button) return;
  state.series = button.dataset.series;
  state.selectedSwimmerId = "";
  render();
});

programBtn?.addEventListener("click", openProgramModal);
refereeProgressBtn?.addEventListener("click", (event) => {
  if (event.currentTarget.dataset.refereeProgressAction !== "set") return;
  setRefereeProgressHere();
});
programModal?.addEventListener("click", (event) => {
  if (event.target === programModal || event.target.closest("[data-program-close]")) {
    closeProgramModal();
    return;
  }
  if (["video", "computer"].includes(state.role)) return;
  const button = event.target.closest("[data-program-race]");
  if (!button) return;
  const row = (data.program || []).find((item) => programKey(item) === button.dataset.programRace);
  if (!row) return;
  applyProgramRow(row);
  if (row.session) state.session = row.session;
  const stage = button.dataset.programStage;
  const series = button.dataset.programSeries;
  if (stage && isFinalStage(stage)) {
    state.series = stage;
  } else if (series) {
    state.series = String(series);
  } else {
    state.series = firstSeriesSelectionForCurrentRace();
  }
  clearSearch();
  state.category = "all";
  state.selectedSwimmerId = "";
  state.selectedRecordKey = "";
  closeProgramModal();
  render();
});

adminSeriesBtn?.addEventListener("click", openAdminSeriesModal);
archivesBtn?.addEventListener("click", () => {
  renderHistoryArchivesModal({ canDelete: false });
});

resultsAdminPanel?.addEventListener("click", (event) => {
  if (event.target.closest("[data-competition-mode]")) {
    toggleCompetitionMode();
    return;
  }
  if (event.target.closest("[data-public-session-infos]")) {
    renderPublicSessionInfosModal();
    return;
  }
  if (event.target.closest("[data-computer-admin-series]")) {
    openAdminSeriesModal();
    return;
  }
  if (event.target.closest("[data-public-results-online-toggle]")) {
    togglePublicResultsOnline();
    return;
  }
  if (event.target.closest("[data-results-reset]")) {
    if (competitionModeEnabled()) {
      window.alert("RAZ indisponible quand l'actualisation directe est active.");
      return;
    }
    renderResetResultsModal();
    return;
  }
  const compositionButton = event.target.closest("[data-final-composition-result]");
  if (compositionButton) {
    openFinalCompositionResultModal(compositionButton.dataset.finalCompositionResult);
    return;
  }
  const sessionResultsButton = event.target.closest("[data-session-results-import]");
  if (sessionResultsButton) {
    openSessionResultsImportModal(sessionResultsButton.dataset.sessionResultsImport || resultsAdminSession);
    return;
  }
  const deleteButton = event.target.closest("[data-result-delete]");
  if (deleteButton) {
    const result = raceResults.find((item) => item.id === deleteButton.dataset.resultDelete);
    const label = [result?.eventLabel, result?.sexLabel, result?.session ? `S${result.session}` : ""].filter(Boolean).join(" - ") || "ce résultat";
    const ok = window.confirm(`Supprimer le PDF publié pour ${label} ?\n\nIl disparaîtra aussi de la page publique.`);
    if (!ok) return;
    deleteResultPdf(deleteButton.dataset.resultDelete)
      .then(async () => {
        await updateLiveNotes(`Résultat supprimé : ${label}`);
        renderResultsAdminPanel();
        window.alert("Résultat supprimé de la page publique.");
      })
      .catch((error) => {
        console.error(error);
        window.alert(`Suppression impossible : ${error?.message || error}`);
      });
    return;
  }
  const button = event.target.closest("[data-result-import]");
  if (!button) return;
  const row = resultProgramRows(resultsAdminSession).find((item) => programKey(item) === button.dataset.resultImport)
    || (data.program || []).find((item) => programKey(item) === button.dataset.resultImport);
  if (!row) return;
  openResultImportModal(row);
});

resultsAdminPanel?.addEventListener("change", (event) => {
  if (event.target?.id !== "resultsAdminSessionSelect") return;
  resultsAdminSession = event.target.value;
  renderResultsAdminPanel();
});

computerFooterPanel?.addEventListener("click", (event) => {
  if (!event.target.closest("[data-results-reset]")) return;
  if (competitionModeEnabled()) {
    window.alert("RAZ indisponible quand l'actualisation directe est active.");
    return;
  }
  renderResetResultsModal();
});

secretaryFinalsPanel?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-final-withdrawals]");
  if (!button) return;
  openFinalWithdrawalsModal(button.dataset.finalWithdrawals);
});

adminSeriesModal?.addEventListener("click", (event) => {
  if (event.target === adminSeriesModal || event.target.closest("[data-admin-series-close]")) {
    closeAdminSeriesModal();
  }
});

resultImportModal?.addEventListener("click", (event) => {
  if (event.target === resultImportModal || event.target.closest("[data-result-import-close]")) {
    closeResultImportModal();
  }
});

resultImportModal?.addEventListener("change", async (event) => {
  if (event.target?.name === "sessionResultsScope") {
    const multipleField = resultImportModal.querySelector(".session-results-checkboxes");
    if (multipleField) multipleField.hidden = event.target.value !== "multiple";
    return;
  }
  if (event.target?.id === "sessionResultsPdfInput") {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const scope = resultImportModal.querySelector("input[name='sessionResultsScope']:checked")?.value || "current";
    const selectedSessions = scope === "full"
      ? resultSessions().map((session) => session.number)
      : (scope === "multiple"
        ? [...resultImportModal.querySelectorAll("input[name='sessionResultsSession']:checked")].map((input) => input.value)
        : [currentSessionResultsImport?.defaultSession || resultsAdminSession].filter(Boolean));
    if (scope !== "full" && !selectedSessions.length) {
      window.alert("Sélectionne au moins une session.");
      return;
    }
    const sessionLabel = scope === "full"
      ? "toutes les sessions"
      : selectedSessions.map((session) => `S${session}`).join(", ");
    const ok = window.confirm([
      "Publier ce PDF comme résultats complets de consultation ?",
      "",
      `Portée : ${sessionLabel}`,
      `Fichier : ${file.name}`,
      "",
      "Le PDF sera visible sur la page publique, sans lecture automatique des finalistes."
    ].join("\n"));
    if (!ok) return;
    const visibleSession = currentSessionResultsImport?.defaultSession || resultsAdminSession || selectedSessions[0] || "";
    const uploadKey = resultUploadKeyForSessionResults(visibleSession);
    closeResultImportModal();
    setResultUploadState(uploadKey, "Chargement en cours...");
    try {
      renderDataStatus("Publication du PDF résultats complets...");
      const pdf = await publishSessionResultsPdf(file, scope === "full" ? "full" : "sessions", selectedSessions);
      clearResultUploadState(uploadKey);
      renderDataStatus();
      updateLiveNotes(`PDF résultats complets publié : ${pdf.sourceLabel}`).catch((error) => console.warn("Note de publication non mise à jour", error));
      window.alert("PDF résultats complets publié sur la page publique.");
    } catch (error) {
      console.error(error);
      renderDataStatus();
      setResultUploadState(uploadKey, "Chargement impossible. Réessaie.", "error");
      window.alert(`Publication impossible : ${error?.message || error}`);
    }
    return;
  }
  if (event.target?.id !== "resultPdfInput") return;
  const file = event.target.files?.[0];
  if (!file || !currentResultImportRow) return;
  const rowToImport = currentResultImportRow;
  const existingResult = resultForProgramRow(rowToImport);
  const finalListMode = resultImportModal.querySelector("input[name='resultFinalListMode']:checked")?.value || "";
  const preserveFinalists = Boolean(existingResult?.hasFinal && finalListMode === "preserve");
  const overwriteFinalists = Boolean(existingResult?.hasFinal && finalListMode === "overwrite");
  const hasFinal = !isFinalStage(rowToImport.stage) && (
    overwriteFinalists ||
    (!preserveFinalists && resultImportModal.querySelector("input[name='resultFinalMode']:checked")?.value === "yes")
  );
  const isPartial = preserveFinalists
    ? Boolean(existingResult?.isPartial)
    : resultImportModal.querySelector("input[name='resultCompletionMode']:checked")?.value === "partial";
  const message = preserveFinalists
    ? "Remplacer le PDF résultat en conservant la liste des finalistes déjà annoncés, les forfaits et les repêchages ?"
    : (overwriteFinalists
      ? "ATTENTION : relire ce PDF et écraser la liste des finalistes déjà annoncés, les forfaits et les repêchages ?"
    : (hasFinal
      ? `Publier ce résultat ${isPartial ? "partiel" : "complet"} et détecter les finalistes ?`
      : `Publier ce résultat ${isPartial ? "partiel" : "complet"} sans finale ?`));
  const importLabel = [
    rowToImport.session ? `Session ${rowToImport.session}` : "",
    data.events.find((item) => item.id === rowToImport.eventId)?.label || rowToImport.label || rowToImport.eventId,
    `${sexDisplayLabel(rowToImport.sex)} - ${resultPhaseLabelForProgramRow(rowToImport)}`
  ].filter(Boolean).join(" - ");
  if (!window.confirm([message, "", `Course : ${importLabel}`, `Fichier : ${file.name}`].join("\n"))) return;
  const uploadKey = resultUploadKeyForProgram(rowToImport);
  closeResultImportModal();
  setResultUploadState(uploadKey, "Chargement en cours...");
  try {
    renderDataStatus("Publication du résultat en cours...");
    const result = await publishResultPdf(file, rowToImport, hasFinal, isPartial, { preserveFinalists });
    clearResultUploadState(uploadKey);
    renderDataStatus();
    updateLiveNotes(`Résultat publié : ${result.eventLabel} ${result.sexLabel} - ${result.phaseLabel || resultPhaseLabelForProgramRow(rowToImport)}${result.session ? ` S${result.session}` : ""}`).catch((error) => console.warn("Note de publication non mise à jour", error));
    const finalistCount = finalRowsCount(result.finalists);
    window.alert(hasFinal
      ? `Résultat publié : ${finalistCount} finaliste${finalistCount > 1 ? "s" : ""} détecté${finalistCount > 1 ? "s" : ""}.`
      : "Résultat publié sur la page publique.");
  } catch (error) {
    console.error(error);
    setResultUploadState(uploadKey, "Chargement impossible. Réessaie.", "error");
    window.alert(`Publication impossible : ${error?.message || error}`);
    renderDataStatus();
  } finally {
    event.target.value = "";
  }
});

adminSeriesModal?.addEventListener("change", async (event) => {
  if (event.target?.name === "seriesImportMode") {
    const mode = adminSeriesModal.querySelector("input[name='seriesImportMode']:checked")?.value || "full";
    const sessionField = adminSeriesModal.querySelector(".admin-session-field");
    if (sessionField) sessionField.hidden = mode !== "session";
    return;
  }
  if (event.target?.id !== "seriesPdfInput") return;
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  const mode = adminSeriesModal.querySelector("input[name='seriesImportMode']:checked")?.value || "session";
  const forcedSession = mode === "session"
    ? String(adminSeriesModal.querySelector("#seriesSessionOverride")?.value || "").trim()
    : "";
  if (mode === "session" && !forcedSession) {
    window.alert("Indique le numéro de la session à remplacer avant de choisir le PDF.");
    return;
  }
  if (competitionModeEnabled()) {
    const continueLiveImport = window.confirm([
      "L'actualisation directe est active.",
      "",
      "Si tu importes ce PDF, les consoles en direct seront mises à jour immédiatement.",
      "Continuer ?"
    ].join("\n"));
    if (!continueLiveImport) return;
  }
  const message = mode === "full"
    ? `Confirmer l'import comme PDF général ?\n\nFichier : ${file.name}\n\nCela remplace toutes les séries actuellement publiées.`
    : `Confirmer l'import comme mise à jour de la session ${forcedSession} ?\n\nFichier : ${file.name}\n\nCette session sera remplacée par le PDF choisi.`;
  if (!window.confirm(message)) return;
  closeAdminSeriesModal();
  setSeriesImportState(mode === "full" ? "Chargement du PDF général..." : `Chargement de la session ${forcedSession}...`);
  try {
    await importSeriesPdf(file, mode, forcedSession);
    clearSeriesImportState();
  } catch (error) {
    console.error(error);
    setSeriesImportState("Chargement impossible. Réessaie.", "error");
  }
});

roleCodesModal?.addEventListener("click", async (event) => {
  if (event.target === roleCodesModal && roleCodesModal.querySelector(".session-infos-dialog")) {
    return;
  }
  if (event.target === roleCodesModal || event.target.closest("[data-role-codes-close]")) {
    closeRoleCodesModal();
    return;
  }
  if (event.target.closest("[data-open-history-archives]")) {
    await renderHistoryArchivesModal({ canDelete: true });
    return;
  }
  if (event.target.closest("[data-role-codes-back]")) {
    renderRoleCodesModal();
    return;
  }
  if (event.target.closest("[data-confirm-reset-history]")) {
    const confirmation = String(roleCodesModal.querySelector("#resetHistoryInput")?.value || "").trim().toUpperCase();
    if (confirmation !== "RAZ") {
      window.alert("RAZ annulée : il faut écrire RAZ.");
      return;
    }
    closeRoleCodesModal();
    await performResetHistoryWithArchive();
    return;
  }
  if (event.target.closest("[data-confirm-reset-results]")) {
    const confirmation = String(roleCodesModal.querySelector("#resetResultsInput")?.value || "").trim().toUpperCase();
    if (confirmation !== "RAZ") {
      window.alert("RAZ annulée : il faut écrire RAZ.");
      return;
    }
    if (competitionModeEnabled()) {
      window.alert("RAZ indisponible quand l'actualisation directe est active.");
      closeRoleCodesModal();
      return;
    }
    const scope = roleCodesModal.querySelector("input[name='resetResultsScope']:checked")?.value || "results-session";
    const selectedResetSession = String(roleCodesModal.querySelector("#resetResultsSessionSelect")?.value || ensureResultsAdminSession() || "").trim();
    closeRoleCodesModal();
    try {
      if (scope === "history") {
        await performResetHistoryWithArchive();
      } else if (scope === "series-all") {
        await resetSeriesForNextCompetition();
      } else if (scope === "results-all") {
        const count = await clearPublishedResults();
        await updateLiveNotes("RAZ résultats publics compétition");
        window.alert(`${count} résultat${count > 1 ? "s" : ""} public${count > 1 ? "s" : ""} archivé${count > 1 ? "s" : ""} puis supprimé${count > 1 ? "s" : ""}.`);
      } else if (selectedResetSession) {
        const summary = await clearPublishedResultsForSession(selectedResetSession);
        await updateLiveNotes(`RAZ résultats publics S${selectedResetSession}`);
        window.alert(`${summary.results} résultat${summary.results > 1 ? "s" : ""} public${summary.results > 1 ? "s" : ""} et ${summary.sessionPdfs} PDF complet${summary.sessionPdfs > 1 ? "s" : ""} de session archivés puis supprimés pour S${selectedResetSession}.`);
      } else {
        window.alert("Aucune session sélectionnée pour le RAZ résultats.");
      }
    } catch (error) {
      console.error(error);
      window.alert(`RAZ impossible : ${error?.message || error}`);
    }
    return;
  }
  if (event.target.closest("[data-save-public-session-infos]")) {
    const nextInfos = {};
    roleCodesModal.querySelectorAll("[data-session-info-input]").forEach((field) => {
      const session = String(field.dataset.sessionInfoInput || "").trim();
      const value = String(field.value || "").trim();
      if (session && value) nextInfos[session] = value;
    });
    closeRoleCodesModal();
    updateLiveNotes("Informations sessions publiques", {
      publicSessionInfos: nextInfos,
      publicSessionInfosUpdatedAt: new Date().toISOString()
    }).then(async () => {
      await publishPublicResultsIndex({ silent: true });
      renderResultsAdminPanel();
      window.alert("Informations de session publiées sur la page résultats.");
    }).catch((error) => {
      console.error(error);
      window.alert(`Publication impossible : ${error?.message || error}`);
    });
    return;
  }
  const openArchiveButton = event.target.closest("[data-open-archive]");
  if (openArchiveButton) {
    const id = openArchiveButton.dataset.openArchive;
    const collection = historyArchivesCollection();
    if (!collection) return;
    const snapshot = await collection.doc(id).get();
    if (!snapshot.exists) {
      window.alert("Archive introuvable.");
      return;
    }
    const archive = snapshot.data();
    openDsqRows(Array.isArray(archive.alerts) ? archive.alerts : [], `Archive journal d'arbitrage - ${archive.createdLabel || id}`);
    return;
  }
  const deleteArchiveButton = event.target.closest("[data-delete-archive]");
  if (deleteArchiveButton) {
    if (roleCodesModal.querySelector(".history-archives-dialog")?.dataset.archivesCanDelete !== "1") {
      window.alert("Suppression réservée à l'administrateur général.");
      return;
    }
    const ok = window.confirm("Supprimer définitivement cette archive ?");
    if (!ok) return;
    const collection = historyArchivesCollection();
    if (!collection) return;
    await collection.doc(deleteArchiveButton.dataset.deleteArchive).delete();
    await renderHistoryArchivesModal({ canDelete: true });
    return;
  }
  const openResultArchiveButton = event.target.closest("[data-open-result-archive]");
  if (openResultArchiveButton) {
    const id = openResultArchiveButton.dataset.openResultArchive;
    const collection = resultArchivesCollection();
    if (!collection) return;
    const archiveSnapshot = await collection.doc(id).get();
    if (!archiveSnapshot.exists) {
      window.alert("Archive introuvable.");
      return;
    }
    const itemSnapshot = await collection.doc(id).collection("items").get();
    const rows = itemSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    openResultArchiveRows(rows, archiveSnapshot.data());
    return;
  }
  const deleteResultArchiveButton = event.target.closest("[data-delete-result-archive]");
  if (deleteResultArchiveButton) {
    if (roleCodesModal.querySelector(".history-archives-dialog")?.dataset.archivesCanDelete !== "1") {
      window.alert("Suppression réservée à l'administrateur général.");
      return;
    }
    const ok = window.confirm("Supprimer définitivement cette archive de résultats ?");
    if (!ok) return;
    const collection = resultArchivesCollection();
    if (!collection || !firestoreDb) return;
    const archiveRef = collection.doc(deleteResultArchiveButton.dataset.deleteResultArchive);
    const itemSnapshot = await archiveRef.collection("items").get();
    const batch = firestoreDb.batch();
    itemSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
    batch.delete(archiveRef);
    await batch.commit();
    await renderHistoryArchivesModal({ canDelete: true });
    return;
  }
  if (event.target.closest("[data-role-pin-cancel]")) {
    finishRolePin(false);
    return;
  }
  if (event.target.closest("[data-confirm-role-code-admin]")) {
    const code = String(roleCodesModal.querySelector("#roleCodeAdminInput")?.value || "").trim();
    if (code !== ADMIN_PIN) {
      window.alert("Code admin incorrect.");
      return;
    }
    const action = event.target.closest("[data-confirm-role-code-admin]")?.dataset.confirmRoleCodeAdmin || "codes";
    if (action === "reset") {
      closeRoleCodesModal();
      await performResetHistoryWithArchive();
      return;
    }
    renderRoleCodesModal();
    return;
  }
  const pinButton = event.target.closest("[data-confirm-role-pin]");
  if (pinButton) {
    const role = pinButton.dataset.confirmRolePin;
    const code = String(roleCodesModal.querySelector("#rolePinInput")?.value || "").trim();
    if (code === ADMIN_PIN) {
      finishRolePin({ allowed: true, adminBypass: true });
    } else if (code === currentRolePins()[role]) {
      unlockRole(role);
      finishRolePin({ allowed: true, adminBypass: false });
    } else {
      window.alert("Code incorrect.");
    }
    return;
  }
  const saveButton = event.target.closest("[data-save-role-codes]");
  if (saveButton) {
    await saveRoleCodesFromModal(true);
    return;
  }
  if (event.target.closest("[data-disable-role-codes]")) {
    const ok = window.confirm("Désactiver les codes pour toutes les consoles ?");
    if (ok) await saveRoleCodesFromModal(false);
  }
});

roleCodesModal?.addEventListener("input", (event) => {
  if (event.target?.matches("[data-role-code]")) {
    event.target.value = String(event.target.value || "").replace(/\D/g, "").slice(0, 4);
    return;
  }
  if (event.target?.matches("#roleCodeAdminInput, #rolePinInput")) {
    event.target.value = String(event.target.value || "").replace(/[^0-9!]/g, "").slice(0, 5);
    return;
  }
  if (event.target?.matches("#resetHistoryInput, #resetResultsInput")) {
    event.target.value = String(event.target.value || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
  }
});

roleCodesModal?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const adminInput = event.target?.closest("#roleCodeAdminInput");
  if (adminInput) {
    event.preventDefault();
    roleCodesModal.querySelector("[data-confirm-role-code-admin]")?.click();
    return;
  }
  const pinInput = event.target?.closest("#rolePinInput");
  if (pinInput) {
    event.preventDefault();
    roleCodesModal.querySelector("[data-confirm-role-pin]")?.click();
    return;
  }
  const resetInput = event.target?.closest("#resetHistoryInput");
  if (resetInput) {
    event.preventDefault();
    roleCodesModal.querySelector("[data-confirm-reset-history]")?.click();
    return;
  }
  const resetResultsInput = event.target?.closest("#resetResultsInput");
  if (resetResultsInput) {
    event.preventDefault();
    roleCodesModal.querySelector("[data-confirm-reset-results]")?.click();
  }
});

officialAlerts?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-alert-action]");
  const card = event.target.closest("[data-alert-id]");
  if (!card) return;
  const alert = alerts.find((item) => item.id === card.dataset.alertId);
  if (alert?.type === "finalists_announcement") {
    if (state.role === "speaker") openFinalistsAnnouncementModal(card.dataset.alertId);
    return;
  }
  if (state.role === "live") {
    dismissLiveAlert(card.dataset.alertId);
    return;
  }
  if (!button) return;
  if (button.dataset.alertAction === "Annoncé") {
    if (alert?.type === "finalist_replacement_announcement") {
      publishReplacementAfterSpeaker(card.dataset.alertId).catch((error) => {
        console.error(error);
        window.alert(`Annonce du repêchage impossible : ${error?.message || error}`);
      });
      return;
    }
    updateAlert(card.dataset.alertId, { speakerStatus: "done", speakerAnnouncedAt: new Date().toISOString() });
  }
});

alertDetailModal?.addEventListener("click", (event) => {
  const finalistsButton = event.target.closest("[data-finalists-announced]");
  if (finalistsButton) {
    const alertId = finalistsButton.dataset.finalistsAnnounced;
    const announcedAt = new Date().toISOString();
    finalistsButton.disabled = true;
    finalistsButton.textContent = "Pris en compte";
    closeAlertDetail();
    const previousAlert = markSpeakerAlertDoneLocally(alertId, announcedAt);
    publishFinalistsAfterSpeaker(alertId).catch((error) => {
      console.error(error);
      restoreAlertLocally(previousAlert);
      window.alert(`Publication des finalistes impossible : ${error?.message || error}`);
    });
    return;
  }
  const withdrawButton = event.target.closest("[data-final-withdraw]");
  if (withdrawButton) {
    const expired = withdrawButton.dataset.finalExpired === "1";
    const message = expired
      ? "Attention, le délai de forfait est dépassé. Souhaitez-vous quand même valider ce forfait et repêcher le nageur suivant si possible ?"
      : "Déclarer ce forfait en finale et repêcher le nageur suivant si possible ?";
    const ok = window.confirm(message);
    if (!ok) return;
    markFinalistWithdrawn(
      withdrawButton.dataset.finalWithdraw,
      withdrawButton.dataset.finalKey,
      withdrawButton.dataset.finalIndex,
      { allowExpired: expired, rowKey: withdrawButton.dataset.finalRowKey || "" }
    ).catch((error) => {
      console.error(error);
      window.alert(`Forfait impossible : ${error?.message || error}`);
    });
    return;
  }
  const preWithdrawButton = event.target.closest("[data-final-prewithdraw]");
  if (preWithdrawButton) {
    const activeLabel = preWithdrawButton.textContent.includes("Annuler") ? "Annuler ce pré-forfait ?" : "Enregistrer ce pré-forfait si le nageur est repêché ?";
    const ok = window.confirm(activeLabel);
    if (!ok) return;
    toggleFinalPreWithdrawal(
      preWithdrawButton.dataset.finalPrewithdraw,
      preWithdrawButton.dataset.finalRowKey
    ).catch((error) => {
      console.error(error);
      window.alert(`Pré-forfait impossible : ${error?.message || error}`);
    });
    return;
  }
  const reinstateButton = event.target.closest("[data-final-reinstate]");
  if (reinstateButton) {
    const ok = window.confirm("Réintégrer ce nageur dans la finale ? Si le repêchage n'a pas encore été annoncé, l'alerte speaker sera annulée.");
    if (!ok) return;
    reinstateFinalist(
      reinstateButton.dataset.finalReinstate,
      reinstateButton.dataset.finalKey,
      reinstateButton.dataset.finalIndex,
      reinstateButton.dataset.finalRowKey || ""
    ).catch((error) => {
      console.error(error);
      window.alert(`Réintégration impossible : ${error?.message || error}`);
    });
    return;
  }
  const compositionDoneButton = event.target.closest("[data-final-composition-done]");
  if (compositionDoneButton) {
    updateAlert(compositionDoneButton.dataset.finalCompositionDone, {
      informaticsStatus: "done",
      informaticsDoneAt: new Date().toISOString()
    });
    closeAlertDetail();
    return;
  }
  if (event.target === alertDetailModal || event.target.closest("[data-close-alert-detail]")) {
    closeAlertDetail();
  }
});

decisionModal?.addEventListener("click", (event) => {
  if (event.target === decisionModal || event.target.closest("[data-close-decision]")) {
    closeDecisionModal({ clearSelection: true });
    return;
  }
  const entrant = selectedEntrant();
  if (!entrant) return;
  const cancelButton = event.target.closest("[data-cancel-active-decision]");
  if (cancelButton) {
    const ok = window.confirm("Annuler cette DSQ ? Une alerte sera envoyée si le speaker ou le bureau des performances doit corriger l'information.");
    if (ok) {
      closeDecisionModal({ clearSelection: true });
      cancelDecision(cancelButton.dataset.cancelActiveDecision, "referee");
    }
    return;
  }
  const typeButton = event.target.closest("[data-decision-type]");
  if (typeButton) {
    decisionDraft.comment = document.querySelector("#modalDecisionComment")?.value || decisionDraft.comment;
    decisionDraft.type = typeButton.dataset.decisionType || "";
    defaultDecisionDetail(decisionDraft.type, entrant);
    renderDecisionModal();
    return;
  }
  const relayButton = event.target.closest("[data-relay-leg]");
  if (relayButton) {
    decisionDraft.comment = document.querySelector("#modalDecisionComment")?.value || decisionDraft.comment;
    decisionDraft.relayLeg = relayButton.dataset.relayLeg || "";
    renderDecisionModal();
    return;
  }
  const lengthButton = event.target.closest("[data-length-type]");
  if (lengthButton) {
    decisionDraft.comment = document.querySelector("#modalDecisionComment")?.value || decisionDraft.comment;
    decisionDraft.lengthType = lengthButton.dataset.lengthType || "start";
    renderDecisionModal();
    return;
  }
  const stepButton = event.target.closest("[data-length-step]");
  if (stepButton) {
    decisionDraft.comment = document.querySelector("#modalDecisionComment")?.value || decisionDraft.comment;
    const current = Math.max(1, Number.parseInt(decisionDraft.lengthNumber || "1", 10) || 1);
    const step = Number.parseInt(stepButton.dataset.lengthStep || "0", 10) || 0;
    decisionDraft.lengthNumber = String(Math.max(1, current + step));
    decisionDraft.lengthType = "length";
    renderDecisionModal();
    return;
  }
  if (event.target.closest("[data-submit-decision]")) {
    decisionDraft.comment = document.querySelector("#modalDecisionComment")?.value || "";
    decisionDraft.lengthNumber = document.querySelector("#modalLengthNumber")?.value || decisionDraft.lengthNumber;
    if (!decisionDraftIsReady(entrant)) return;
    createDecisionAlert(decisionDraft);
    closeDecisionModal();
  }
});

decisionModal?.addEventListener("input", (event) => {
  if (event.target?.id === "modalDecisionComment") {
    decisionDraft.comment = event.target.value;
  } else if (event.target?.id === "modalLengthNumber") {
    decisionDraft.lengthNumber = event.target.value;
  }
});

roleQueue?.addEventListener("click", (event) => {
  const compositionButton = event.target.closest("[data-final-composition-open]");
  if (compositionButton) {
    openFinalCompositionModal(compositionButton.dataset.finalCompositionOpen);
    return;
  }
  const button = event.target.closest("[data-queue-action]");
  const item = event.target.closest("[data-alert-id]");
  if (!item) return;
  if (!button) return;
  const id = item.dataset.alertId;
  if (button.dataset.queueAction === "confirm-video") {
    updateAlert(id, { videoStatus: "confirmed", videoConfirmedAt: new Date().toISOString(), speakerStatus: "pending", informaticsStatus: "pending" });
  } else if (button.dataset.queueAction === "reject-video") {
    updateAlert(id, { videoStatus: "rejected", videoRejectedAt: new Date().toISOString(), speakerStatus: "none", informaticsStatus: "none" });
  } else if (button.dataset.queueAction === "done-computer") {
    updateAlert(id, { informaticsStatus: "done", informaticsDoneAt: new Date().toISOString() });
  } else if (button.dataset.queueAction === "done-secretary") {
    updateAlert(id, { secretaryStatus: "done", secretaryDoneAt: new Date().toISOString() });
  }
});

roleHistory?.addEventListener("click", (event) => {
  if (event.target.closest("[data-results-reset]")) {
    if (competitionModeEnabled()) {
      window.alert("RAZ indisponible quand l'actualisation directe est active.");
      return;
    }
    renderResetResultsModal();
    return;
  }
  if (event.target.closest("[data-history-export-pdf]")) {
    exportDsqPdf();
    return;
  }
  if (event.target.closest("[data-history-reset]")) {
    resetHistory();
    return;
  }
  const toggle = event.target.closest("[data-history-toggle]");
  if (toggle) {
    const key = toggle.dataset.historyToggle;
    expandedHistories[key] = !expandedHistories[key];
    renderRoleHistory();
    return;
  }
  const button = event.target.closest("[data-history-action]");
  const item = event.target.closest("[data-history-alert-id]");
  if (!item) return;
  const alert = alerts.find((row) => row.id === item.dataset.historyAlertId);
  if (!alert) return;
  if (!button) {
    openAlertDetail(alert.id);
    return;
  }
  if (button.dataset.historyAction === "cancel-ja") {
    const ok = window.confirm("Annuler cette décision ? Une alerte sera envoyée si le speaker ou le bureau des performances doit corriger l'information.");
    if (ok) cancelDecision(alert.id, "referee");
  } else if (button.dataset.historyAction === "delegate-cancel") {
    const ok = window.confirm("Confirmer l'annulation par le délégué de la compétition ? Le speaker et le bureau des performances recevront une alerte de requalification.");
    if (ok) cancelDecision(alert.id, "delegate");
  }
});

roleHistory?.addEventListener("change", (event) => {
  const select = event.target.closest("[data-history-filter]");
  if (!select) return;
  historyFilters[select.dataset.historyFilter] = select.value;
  expandedHistories.role = false;
  renderRoleHistory();
});

speakerHistory?.addEventListener("click", (event) => {
  const toggle = event.target.closest("[data-history-toggle]");
  if (toggle) {
    const key = toggle.dataset.historyToggle;
    expandedHistories[key] = !expandedHistories[key];
    renderSpeakerHistory();
    return;
  }
  const item = event.target.closest("[data-history-alert-id]");
  if (!item) return;
  openAlertDetail(item.dataset.historyAlertId);
});

speakerHistory?.addEventListener("change", (event) => {
  const select = event.target.closest("[data-history-filter]");
  if (!select) return;
  historyFilters[select.dataset.historyFilter] = select.value;
  expandedHistories.speaker = false;
  renderSpeakerHistory();
});

fullscreenBtn?.addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else if (document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    } else {
      isFullscreenMode = !isFullscreenMode;
      render();
    }
  } catch {
    isFullscreenMode = !isFullscreenMode;
    render();
  }
});

document.addEventListener("fullscreenchange", () => {
  isFullscreenMode = Boolean(document.fullscreenElement);
  render();
});

function goToNextSeries() {
  const numbers = availableSeriesNumbers();
  const finals = finalProgramRowsForRace();
  const finalStages = finals.map((row) => row.stage);
  if (!numbers.length && !finalStages.length) return;
  if (state.series === "all") {
    state.series = String(numbers[0] || finalStages[0] || "all");
  } else if (isFinalStage(state.series)) {
    const currentFinalIndex = finalStages.indexOf(state.series);
    const nextFinal = finalStages[currentFinalIndex + 1];
    if (nextFinal) {
      state.series = nextFinal;
    } else {
      goToNextProgramRace();
    }
  } else {
    const currentIndex = numbers.indexOf(Number(state.series));
    const next = numbers[currentIndex + 1];
    if (next) {
      state.series = String(next);
    } else {
      goToNextProgramRace();
    }
  }
  state.selectedSwimmerId = "";
  render();
}

function goToPreviousSeries() {
  const numbers = availableSeriesNumbers();
  const finals = finalProgramRowsForRace();
  const finalStages = finals.map((row) => row.stage);
  if (!numbers.length && !finalStages.length) return;
  if (isFinalStage(state.series)) {
    const currentFinalIndex = finalStages.indexOf(state.series);
    const previousFinal = finalStages[currentFinalIndex - 1];
    if (previousFinal) {
      state.series = previousFinal;
    } else if (numbers.length) {
      state.series = String(numbers[numbers.length - 1]);
    } else {
      goToPreviousProgramRace();
    }
  } else if (state.series === "all") {
    goToPreviousProgramRace();
  } else {
    const currentIndex = numbers.indexOf(Number(state.series));
    const previous = numbers[currentIndex - 1];
    if (previous) {
      state.series = String(previous);
    } else {
      goToPreviousProgramRace();
    }
  }
  state.selectedSwimmerId = "";
  render();
}

function toggleAntoineOverlay() {
  if (!antoineOverlay) return;
  antoineOverlay.hidden = !antoineOverlay.hidden;
}

previousSeriesBtn?.addEventListener("click", goToPreviousSeries);
previousSeriesInlineBtn?.addEventListener("click", goToPreviousSeries);
previousSeriesFloatBtn?.addEventListener("click", goToPreviousSeries);
nextSeriesBtn?.addEventListener("click", goToNextSeries);
nextSeriesInlineBtn?.addEventListener("click", goToNextSeries);
nextSeriesFloatBtn?.addEventListener("click", goToNextSeries);
programFloatBtn?.addEventListener("click", openProgramModal);

document.addEventListener("keydown", (event) => {
  const target = event.target;
  if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
  if (event.key === "ArrowRight") {
    event.preventDefault();
    goToNextSeries();
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    goToPreviousSeries();
  } else if (event.key.toLowerCase() === "s") {
    event.preventDefault();
    sessionControls?.querySelector("#sessionSelect")?.focus();
  } else if (event.key.toLowerCase() === "a") {
    event.preventDefault();
    toggleAntoineOverlay();
  }
});

lineOrderBtn?.addEventListener("click", () => {
  state.lineOrder = state.lineOrder === "desc" ? "asc" : "desc";
  renderEntrants();
});

searchInput?.addEventListener("input", () => {
  state.search = searchInput.value;
  state.selectedSwimmerId = "";
  renderEntrants();
});

categorySelect.addEventListener("change", () => {
  state.category = categorySelect.value;
  state.selectedSwimmerId = "";
  selectRecordForCategory(state.category);
  renderHeaderReferences();
  renderEntrants();
});

entrantsBody.addEventListener("click", (event) => {
  const row = event.target.closest("tr[data-swimmer-id]");
  if (!row) return;
  if (state.role === "referee" && row.dataset.importedForfait === "1") return;
  state.selectedSwimmerId = row.dataset.swimmerId;
  renderEntrants();
  renderRolePanels();
  if (state.role === "referee") {
    openDecisionModal();
  }
});

swimmerDetails.addEventListener("click", (event) => {
  if (!event.target.closest(".close-details")) return;
  state.selectedSwimmerId = "";
  renderEntrants();
});

document.querySelector("#printBtn")?.addEventListener("click", () => window.print());
document.querySelector("#exportBtn")?.addEventListener("click", downloadJson);
document.querySelector("#exportDsqPdfBtn")?.addEventListener("click", exportDsqPdf);
document.querySelector("#updateSpeakerInfoBtn")?.addEventListener("click", updateSpeakerInfoFromGoogleSheet);
document.querySelector("#updateSpeakerInfoPanelBtn")?.addEventListener("click", updateSpeakerInfoFromGoogleSheet);

const PDF_EVENT_ALIASES = {
  "50mapnee": "50ap",
  "50mapnée": "50ap",
  "50msurface": "50sf",
  "100msurface": "100sf",
  "200msurface": "200sf",
  "400msurface": "400sf",
  "800msurface": "800sf",
  "1500msurface": "1500sf",
  "100mimmersion": "100is",
  "200mimmersion": "200is",
  "400mimmersion": "400is",
  "50mbipalmes": "50bi",
  "100mbipalmes": "100bi",
  "200mbipalmes": "200bi",
  "400mbipalmes": "400bi",
  "4x50msurface": "4x50sf",
  "4x100msurface": "4x100sf",
  "4x200msurface": "4x200sf",
  "4x100mbipalmes": "4x100bix",
  "4x100msb": "4x100sb"
};

function normalizePdfLabel(value) {
  return fixPdfEncoding(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function fixPdfEncoding(value) {
  let text = String(value || "");
  const replacements = {
    "Ã©": "é",
    "Ã¨": "è",
    "Ãª": "ê",
    "Ã«": "ë",
    "Ã ": "à",
    "Ã¢": "â",
    "Ã¤": "ä",
    "Ã®": "î",
    "Ã¯": "ï",
    "Ã´": "ô",
    "Ã¶": "ö",
    "Ã¹": "ù",
    "Ã»": "û",
    "Ã¼": "ü",
    "Ã§": "ç",
    "Ã‰": "É",
    "Ãˆ": "È",
    "ÃŠ": "Ê",
    "Ã‹": "Ë",
    "Ã€": "À",
    "Ã‚": "Â",
    "ÃŽ": "Î",
    "Ã”": "Ô",
    "Ã™": "Ù",
    "Ã‡": "Ç",
    "È": "é",
    "Ë": "é",
    "Í": "ê",
    "Ô": "ï",
    "Å“": "œ",
    "Å’": "Œ",
    "â€™": "’",
    "â€˜": "‘",
    "â€“": "-",
    "â€”": "-"
  };
  Object.entries(replacements).forEach(([bad, good]) => {
    text = text.replaceAll(bad, good);
  });
  text = text.normalize("NFC")
    .replace(/C[¸̧]/g, "C")
    .replace(/c[¸̧]/g, "c")
    .replace(/[ÇĆČĈĊ]/g, "C")
    .replace(/[çćčĉċ]/g, "c")
    .replace(/\bFRAN[«‹]OIS\b/gi, "FRANCOIS")
    .replace(/\bDOUY(?:…|\.{3}|�|□)RE\b/gi, "DOUYERE")
    .replace(/\bFRAN(?:C|…|\.{3}|�|□)OIS\b/gi, "FRANCOIS")
    .replace(/\bRAPHAÎL\b/g, "RAPHAEL")
    .replace(/\bRaphaÎl\b/g, "Raphaël")
    .replace(/\bMAÎLLE\b/g, "MAELLE")
    .replace(/\bMaÎlle\b/g, "Maëlle")
    .replace(/\bMaïlle\b/g, "Maëlle");
  text = text.replace(/([A-Za-zÀ-ÖØ-öø-ÿ])Î([A-Za-zÀ-ÖØ-öø-ÿ])/g, "$1ï$2");
  return text.normalize("NFC");
}

function importedEventId(label) {
  const normalized = normalizePdfLabel(label);
  const known = PDF_EVENT_ALIASES[normalized];
  if (known) return known;
  const event = data.events.find((item) => normalizePdfLabel(item.label) === normalized);
  return event?.id || "";
}

function importedEventInfo(eventId, fallbackLabel = "") {
  const existing = data.events.find((event) => event.id === eventId);
  if (existing) return existing;
  const label = fallbackLabel || eventId;
  const distance = label.match(/^\d+x?\d*\s*m/i)?.[0] || "";
  return {
    id: eventId,
    label,
    distance,
    discipline: label.replace(distance, "").trim() || label
  };
}

function importedCategoryLabel(code) {
  const clean = String(code || "").toUpperCase();
  if (clean.includes("CA")) return "Cadet";
  if (clean.includes("JU")) return "Junior";
  if (clean.includes("SE")) return "Senior";
  return clean || "";
}

function importedBirthYear(twoDigits) {
  const value = Number.parseInt(twoDigits, 10);
  if (!Number.isFinite(value)) return "";
  return String(value <= 35 ? 2000 + value : 1900 + value);
}

function importedSeriesTime(value) {
  const clean = String(value || "").trim().replace(",", ".");
  if (!clean) return "";
  const parts = clean.split(":");
  if (parts.length === 3) return `${parts[0]}:${parts[1].padStart(2, "0")}.${parts[2].padStart(2, "0")}`;
  if (parts.length === 2) return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
  return clean;
}

function normalizePdfUppercaseEToken(token) {
  const text = String(token || "");
  const withPlainE = text.replace(/[ÉÈÊËéèêë]/g, "E").replace(/[Çç]/g, "C");
  const letters = withPlainE.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ-]/g, "");
  return letters && letters === letters.toUpperCase() ? withPlainE : text.replace(/[ÉÈÊË]/g, "E").replace(/Ç/g, "C");
}

function splitImportedPersonName(value) {
  const tokens = fixPdfEncoding(value)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(normalizePdfUppercaseEToken);
  let firstIndex = Math.max(0, tokens.length - 1);
  for (let index = 0; index < tokens.length; index += 1) {
    const letters = tokens[index].replace(/[^A-Za-zÀ-ÖØ-öø-ÿ-]/g, "");
    if (letters && letters !== letters.toUpperCase()) {
      firstIndex = index;
      break;
    }
  }
  const titleCase = (text) => text.toLowerCase().replace(/(^|\s|-)([a-zà-öø-ÿ])/g, (match) => match.toUpperCase());
  return {
    lastName: titleCase(tokens.slice(0, firstIndex).join(" ")),
    firstName: tokens.slice(firstIndex).join(" ")
  };
}

function isImportedRelayEvent(eventId) {
  return String(eventId || "").includes("x");
}

async function extractPdfLines(file) {
  const pdfjs = await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.min.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.worker.min.mjs";
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const lines = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const text = await page.getTextContent();
    const uniqueLines = (inputLines) => {
      const result = [];
      inputLines.forEach((line) => {
        const clean = fixPdfEncoding(line).replace(/\s+/g, " ").trim();
        if (clean && !result.includes(clean)) result.push(clean);
      });
      return result;
    };
    const flowLines = uniqueLines(extractPdfLinesByFlow(text.items));
    const hasStructuredFlow = flowLines.some((line) => /\bs.{1,2}rie\s*:\s*\d+\s*\/\s*\d+/i.test(line))
      || flowLines.some((line) => /\b(?:\d+x\d+|\d+)m\s+(?:Apn[eé]e|Surface|Immersion|Bipalmes|SB)\s+-\s+(?:Seniors\s+)?(?:Femmes|Hommes|Mixte)/i.test(line));
    const pageLines = [];
    const appendPageLine = (line) => {
      const clean = String(line || "").replace(/\s+/g, " ").trim();
      if (clean && !pageLines.includes(clean)) pageLines.push(clean);
    };
    flowLines.forEach(appendPageLine);
    if (!hasStructuredFlow) {
      uniqueLines(extractPdfLinesFromItems(text.items, 2.5)).forEach(appendPageLine);
      uniqueLines(extractPdfLinesFromItems(text.items, 7)).forEach(appendPageLine);
    }
    const isSessionHeaderLine = (line) => /\bSession\s*\d+\b/i.test(line) || line.includes("Session du") || line.includes("Session de l");
    const sessionHeaderLines = pageLines.filter(isSessionHeaderLine);
    const bodyLines = pageLines.filter((line) => !isSessionHeaderLine(line));
    lines.push(...sessionHeaderLines, ...bodyLines);
  }
  return lines;
}

function extractPdfLinesByFlow(items) {
  const lines = [];
  let current = "";
  items.forEach((item) => {
    const text = String(item.str || "").trim();
    if (text) {
      current = `${current} ${text}`.replace(/\s+/g, " ").trim();
    }
    if (item.hasEOL) {
      if (current) lines.push(current);
      current = "";
    }
  });
  if (current) lines.push(current);
  return lines;
}

function extractPdfLinesFromItems(items, tolerance = 2.5) {
  const rows = [];
  items
    .map((item) => ({ x: item.transform[4], y: item.transform[5], text: item.str }))
    .filter((item) => String(item.text || "").trim())
    .sort((a, b) => b.y - a.y || a.x - b.x)
    .forEach((item) => {
      const row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= tolerance);
      if (row) {
        row.items.push(item);
        row.y = (row.y * (row.items.length - 1) + item.y) / row.items.length;
      } else {
        rows.push({ y: item.y, items: [item] });
      }
    });
  return rows
    .sort((a, b) => b.y - a.y)
    .map((row) => row.items
      .sort((a, b) => a.x - b.x)
      .map((item) => item.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim())
    .filter(Boolean);
}

function parseImportedSeriesLines(lines, fileName = "séries importées.pdf") {
  const normalizedLines = [];
  lines.forEach((line) => {
    const clean = fixPdfEncoding(line).replace(/\s+/g, " ").trim();
    if (!clean) return;
    splitEmbeddedPdfLines(clean).forEach((part) => normalizedLines.push(part));
  });
  const entrants = [];
  const seriesRows = [];
  const program = [];
  const eventsById = new Map(data.events.map((event) => [event.id, event]));
  const seenProgram = new Set();
  const seenEntrants = new Set();
  const seenSeriesRows = new Set();
  let currentSession = { number: "", label: "" };
  let current = null;
  let pendingFinal = null;
  let activeFinalContext = null;
  let order = 0;
  const meet = parseImportedMeetMetadata(normalizedLines);

  const titlePattern = /^(.+?) - Seniors (Femmes|Hommes)(?:(?: - Finale\(s\).*)|(?: M\s*eilleure s[eé]rie.*))?$/i;
  const finalTitlePattern = /^(.+?) - (?:Seniors )?(Femmes|Hommes|Mixte).*Finale.*?(?:Horaire indicatif : (\d{2}:\d{2}))?.*$/i;
  const finalHeatPattern = /^finale\s+([AB])\s+Horaire indicatif : (\d{2}:\d{2})(?: \((\d+)\))?/i;
  const relayTitlePattern = /^(.+?) - (Femmes|Hommes|Mixte)(?: M\s*eilleure s[eé]rie.*)?$/i;
  const heatPattern = /^s.{1,2}rie\s*:\s*(\d+)\s*\/\s*(\d+)\s+Horaire indicatif\s*:\s*(\d{2}:\d{2})(?:\s+\((\d+)\))?/i;
  const swimmerPattern = /^(\d+)\s+(.+?)\s*(\d{2})\s+([FH][A-Z0-9+]+)\s+(\S+)\s+([0-9:.]+)(?:\s+(IN|NS))?$/i;
  const speakerPattern = /^(\d+)\s+(.+?)\s*(\d{2})\s+([FH][A-Z0-9+]+)\s+\*\s+(\S+)\s+([0-9:.]+)(.*)$/;
  const tolerantSpeakerPattern = /^(\d+)\s+(.+?)\s*(\d{2})\s+([FH][A-Z0-9+]+)\s+\*?\s*([A-Z0-9]+)\s+([0-9:.]+)(.*)$/;
  const forfaitLinePattern = /^(\d+)\s+(.+?)\s*(\d{2})\s+([FH][A-Z0-9+]+)\s+(\S+)\s+FORFAIT\s+([0-9:.]+)(.*)$/i;

  const updateSessionFromLabel = (label) => {
    const cleanLabel = fixPdfEncoding(label);
    const normalizedLabel = cleanLabel
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const currentNumber = Number(currentSession.number || 0);
    let inferredNumber = "";
    if (/apres\s*-?\s*midi/.test(normalizedLabel) && currentNumber && currentNumber % 2 === 1) {
      inferredNumber = String(currentNumber + 1);
    } else if (normalizedLabel.includes("matin") && currentNumber && currentNumber % 2 === 0) {
      inferredNumber = String(currentNumber + 1);
    }
    currentSession = {
      ...currentSession,
      number: inferredNumber || currentSession.number,
      label: cleanLabel
    };
  };

  normalizedLines.forEach((rawLine) => {
    const line = rawLine.replace(/\s+/g, " ").trim();
    const hasSessionPeriod = /Session.*(?:matin|apr[eè]s|apr)/i.test(line);
    const sessionMatch = line.match(/\bSession\s*(\d+)\b/i);
    if (sessionMatch) {
      currentSession = { ...currentSession, number: sessionMatch[1] };
      if (hasSessionPeriod) updateSessionFromLabel(line);
      return;
    }
    if (line.includes("Session du") || line.includes("Session de l") || hasSessionPeriod) {
      updateSessionFromLabel(line);
      return;
    }

    const finalTitleMatch = line.match(finalTitlePattern);
    if (finalTitleMatch) {
      const [, rawLabel, sexText, startTime] = finalTitleMatch;
      const label = fixPdfEncoding(rawLabel);
      const eventId = importedEventId(label);
      if (eventId) {
        const event = importedEventInfo(eventId, label);
        eventsById.set(eventId, event);
        pendingFinal = {
          eventId,
          sex: { Femmes: "F", Hommes: "M", Mixte: "X" }[sexText],
          baseLabel: event.label,
          startTime: startTime || ""
        };
        activeFinalContext = pendingFinal;
      }
      current = null;
      return;
    }

    const finalHeatMatch = line.match(finalHeatPattern);
    const finalContext = pendingFinal || activeFinalContext;
    if (finalHeatMatch && finalContext) {
      const [, letter, startTime, heatOrder] = finalHeatMatch;
      order += 1;
      const stage = `finale-${letter.toUpperCase()}`;
      program.push({
        eventId: finalContext.eventId,
        sex: finalContext.sex,
        order,
        label: `${finalContext.baseLabel} - Finale ${letter.toUpperCase()}`,
        session: currentSession.number,
        sessionLabel: currentSession.label,
        stage,
        startTime,
        hasEntrants: true
      });
      current = {
        eventId: finalContext.eventId,
        sex: finalContext.sex,
        series: letter.toUpperCase() === "A" ? 1 : 2,
        seriesCount: 1,
        heatOrder: Number(heatOrder || order),
        startTime,
        isRelay: isImportedRelayEvent(finalContext.eventId),
        session: currentSession.number,
        sessionLabel: currentSession.label,
        stage
      };
      pendingFinal = null;
      return;
    }

    const titleMatch = line.match(titlePattern) || line.match(relayTitlePattern);
    if (titleMatch) {
      pendingFinal = null;
      activeFinalContext = null;
      const [, rawLabel, sexText] = titleMatch;
      const label = fixPdfEncoding(rawLabel);
      if (/Finale/i.test(line)) {
        current = null;
        return;
      }
      const eventId = importedEventId(label);
      if (!eventId) {
        current = null;
        return;
      }
      const event = importedEventInfo(eventId, label);
      eventsById.set(eventId, event);
      const sex = { Femmes: "F", Hommes: "M", Mixte: "X" }[sexText];
      const stage = /M\s*eilleure s[eé]rie/i.test(line) ? "meilleure-serie" : "series";
      const programKeyValue = `${eventId}|${sex}|${currentSession.number}|series`;
      if (!seenProgram.has(programKeyValue)) {
        order += 1;
        seenProgram.add(programKeyValue);
        program.push({
          eventId,
          sex,
          order,
          label: stage === "meilleure-serie" ? `${event.label} - Meilleure série` : event.label,
          session: currentSession.number,
          sessionLabel: currentSession.label,
          stage,
          hasEntrants: true
        });
      }
      current = {
        eventId,
        sex,
        series: null,
        seriesCount: null,
        heatOrder: null,
        startTime: "",
        isRelay: isImportedRelayEvent(eventId),
        session: currentSession.number,
        sessionLabel: currentSession.label,
        stage
      };
      return;
    }

    const heatMatch = line.match(heatPattern);
    if (heatMatch && current) {
      const [, number, total, startTime, heatOrder] = heatMatch;
      current = {
        ...current,
        series: Number(number),
        seriesCount: Number(total),
        startTime,
        heatOrder: Number(heatOrder || seriesRows.length + 1)
      };
      return;
    }

    if (!current?.series) return;
    let lane = "";
    let rawName = "";
    let birth = "";
    let catCode = "";
    let club = "";
    let seedTime = "";
    let fullClub = "";
    let relayMatch = null;
    if (current.isRelay) {
      relayMatch = line.match(/^(\d+)\s+(.+?)\s+(?:(?<cat>[FHX][A-Z0-9+]+)\s+)?(?:\*\s+)?(?<club>[A-Z0-9]+)\s+(?<time>[0-9:.]+)(?<full>.*)$/);
    }
    const swimmerMatch = line.match(swimmerPattern);
    const speakerMatch = line.match(speakerPattern) || line.match(tolerantSpeakerPattern);
    const forfaitMatch = line.match(forfaitLinePattern);
    let importedStatus = "";
    let nonSelectable = false;
    let lastName = "";
    let firstName = "";
    let birthYear = "";
    let swimmerId = "";
    if (relayMatch) {
      lane = relayMatch[1];
      rawName = fixPdfEncoding(String(relayMatch[2] || "").trim());
      catCode = relayMatch.groups.cat || (current.sex === "X" ? "XSE" : (current.sex === "F" ? "FSE" : "HSE"));
      club = relayMatch.groups.club;
      seedTime = relayMatch.groups.time;
      fullClub = fixPdfEncoding(String(relayMatch.groups.full || "").trim() || rawName);
      lastName = rawName;
      swimmerId = `relay|${current.eventId}|${current.sex}|${club.toLowerCase()}|${lane}|${current.series}`;
    } else if (forfaitMatch || swimmerMatch || speakerMatch) {
      const match = forfaitMatch || swimmerMatch || speakerMatch;
      lane = match[1];
      rawName = fixPdfEncoding(match[2]);
      birth = match[3];
      catCode = match[4];
      club = match[5];
      seedTime = match[6];
      const trailingText = fixPdfEncoding(String(match[7] || "").trim());
      const trailingIsForfait = /\bFORFAIT\b/i.test(trailingText);
      const trailingIsNonSelectable = /\bNS\b/i.test(trailingText);
      const trailingClubText = trailingText.replace(/\b(FORFAIT|NS|IN)\b/gi, "").replace(/\s+/g, " ").trim();
      importedStatus = forfaitMatch || trailingIsForfait ? "forfait" : "";
      nonSelectable = trailingIsNonSelectable;
      fullClub = (speakerMatch || forfaitMatch) && trailingClubText ? trailingClubText : club;
      const split = splitImportedPersonName(rawName);
      lastName = split.lastName;
      firstName = split.firstName;
      birthYear = importedBirthYear(birth);
      swimmerId = `${lastName.toLowerCase()}|${firstName.toLowerCase()}|${birthYear}|${current.sex}`;
    } else {
      return;
    }

    seedTime = importedSeriesTime(seedTime);
    const entrantKeyValue = `${current.eventId}|${current.sex}|${current.session}|${swimmerId}`;
    if (!seenEntrants.has(entrantKeyValue)) {
      seenEntrants.add(entrantKeyValue);
      entrants.push({
        eventId: current.eventId,
        sex: current.sex,
        lane: Number(lane),
        lastName,
        firstName,
        birthDate: birthYear,
        swimmerId,
        club: fullClub,
        clubCode: club,
        category: importedCategoryLabel(catCode),
        categoryCode: catCode,
        seedTime,
        seedSource: "",
        importedStatus,
        nonSelectable,
        session: current.session,
        sessionLabel: current.sessionLabel,
        note: ""
      });
    }
    const seriesKeyValue = [
      current.eventId,
      current.sex,
      current.session,
      current.stage,
      current.series,
      lane,
      swimmerId
    ].join("|");
    if (!seenSeriesRows.has(seriesKeyValue)) {
      seenSeriesRows.add(seriesKeyValue);
      seriesRows.push({
        eventId: current.eventId,
        sex: current.sex,
        swimmerId,
        series: current.series,
        seriesCount: current.seriesCount,
        line: Number(lane),
        startTime: current.startTime,
        heatOrder: current.heatOrder,
        importedStatus,
        nonSelectable,
        session: current.session,
        sessionLabel: current.sessionLabel,
        stage: current.stage
      });
    }
  });

  return {
    meet,
    events: [...eventsById.values()],
    entrants,
    series: seriesRows,
    program,
    sourceFile: fileName,
    debugLines: normalizedLines.slice(0, 80)
  };
}

function parseImportedMeetMetadata(lines) {
  const cleanMeetTitle = (value) => fixPdfEncoding(value)
    .replace(/^FFESSM\b\s*/i, "")
    .replace(/\s*\bFFESSM\b\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const firstUseful = lines.find((line) => /^FFESSM\s+/i.test(line)) ||
    lines.find((line) => /\b(?:championnat|meeting|coupe|open)\b/i.test(line) && !/\b(?:liste|session|série|finale|horaire)\b/i.test(line)) ||
    "";
  const secondUseful = lines.find((line) => /\b20\d{2}\b/.test(line) && !/^FFESSM\s*$/i.test(line)) || "";
  let name = "";
  let city = "";
  let year = "";
  if (firstUseful) {
    const cleaned = cleanMeetTitle(firstUseful);
    const match = cleaned.match(/(.+?)\s+CNNP\s*([A-Za-zÀ-ÖØ-öø-ÿ' -]+)?/i);
    if (match) {
      name = cleanMeetTitle(match[1]);
      city = (match[2] || "").trim();
    } else {
      name = cleanMeetTitle(cleaned.replace(/\s+CNNP.*$/i, ""));
    }
  }
  const combined = `${firstUseful} ${secondUseful}`;
  const yearMatch = combined.match(/\b(20\d{2})\b/);
  if (yearMatch) year = yearMatch[1];
  if (!city && secondUseful) {
    city = cleanMeetTitle(secondUseful.split(/\s+-\s+/)[0].replace(/\b20\d{2}\b.*$/, ""));
  }
  return {
    name: name || "Séries importées",
    city,
    year
  };
}

function splitEmbeddedPdfLines(line) {
  const parts = [];
  const markers = [
    /\bs.{1,2}rie\s*:\s*\d+\s*\/\s*\d+\s+Horaire indicatif/i,
    /\b(?:\d+x\d+|\d+)m\s+(?:Apn[eé]e|Surface|Immersion|Bipalmes|SB)\s+-\s+(?:Seniors\s+)?(?:Femmes|Hommes|Mixte)/i
  ];
  const queue = [line];
  while (queue.length) {
    const currentLine = String(queue.shift() || "").trim();
    if (!currentLine) continue;
    let splitIndex = -1;
    for (const marker of markers) {
      const match = marker.exec(currentLine);
      if (match && match.index > 0) {
        splitIndex = match.index;
        break;
      }
    }
    if (splitIndex > 0) {
      const after = currentLine.slice(splitIndex).trim();
      const before = currentLine.slice(0, splitIndex).trim();
      if (after) queue.unshift(after);
      if (before) queue.unshift(before);
    } else {
      parts.push(currentLine);
    }
  }
  return parts;
}

function showPdfImportDebug(parsed, lines) {
  const samples = (parsed?.debugLines?.length ? parsed.debugLines : lines)
    .slice(0, 18)
    .map((line, index) => `${index + 1}. ${line}`)
    .join("\n");
  window.alert(`Import PDF non reconnu.\n\nLignes lues dans le PDF :\n${samples || "Aucune ligne lue."}`);
}

function applyImportedSessionOverride(parsed, sessionNumber) {
  const cleanSession = String(sessionNumber || "").trim();
  if (!cleanSession) return parsed;
  const existingLabel = [...parsed.program, ...parsed.series, ...parsed.entrants]
    .map((row) => row.sessionLabel)
    .find(Boolean) || `Session ${cleanSession}`;
  const forceRows = (rows) => rows.map((row) => ({
    ...row,
    session: cleanSession,
    sessionLabel: existingLabel
  }));
  return {
    ...parsed,
    entrants: forceRows(parsed.entrants || []),
    series: forceRows(parsed.series || []),
    program: forceRows(parsed.program || [])
  };
}

function parsedSessionNumbers(parsed) {
  return [...new Set([
    ...((parsed.entrants || []).map((row) => row.session).filter(Boolean)),
    ...((parsed.series || []).map((row) => row.session).filter(Boolean)),
    ...((parsed.program || []).map((row) => row.session).filter(Boolean))
  ])].sort((a, b) => Number(a) - Number(b));
}

function filterImportedSession(parsed, sessionNumber) {
  const cleanSession = String(sessionNumber || "").trim();
  if (!cleanSession) return parsed;
  const keepRows = (rows) => (rows || []).filter((row) => String(row.session || "") === cleanSession);
  const entrants = keepRows(parsed.entrants);
  const series = keepRows(parsed.series);
  const program = keepRows(parsed.program);
  if (!entrants.length && !series.length && !program.length) return null;
  const eventIds = new Set([
    ...entrants.map((row) => row.eventId),
    ...series.map((row) => row.eventId),
    ...program.map((row) => row.eventId)
  ].filter(Boolean));
  return {
    ...parsed,
    entrants,
    series,
    program,
    events: (parsed.events || []).filter((event) => eventIds.has(event.id))
  };
}

function prepareImportedSeriesForMode(parsed, mode, forcedSession) {
  const cleanSession = String(forcedSession || "").trim();
  if (mode !== "session" || !cleanSession) return parsed;
  const sessions = parsedSessionNumbers(parsed);
  if (sessions.length > 1) {
    const filtered = filterImportedSession(parsed, cleanSession);
    if (filtered) return filtered;
  }
  return applyImportedSessionOverride(parsed, cleanSession);
}

function seedSourceLookupKeys(row) {
  const eventId = row.eventId || "";
  const sex = row.sex || "";
  const seedTime = seedSourceTimeKey(row.seedTime || "");
  const swimmerId = row.swimmerId || "";
  const name = normalizePersonName(formatName(row));
  return [
    `${eventId}|${sex}|${swimmerId}|${seedTime}`,
    `${eventId}|${sex}|${name}|${seedTime}`
  ].filter((key) => !key.includes("undefined"));
}

function inheritImportedSeedSources(parsed) {
  const sourceByKey = new Map();
  [...(sampleData.entrants || []), ...(data.entrants || [])].forEach((row) => {
    if (!row.seedSource) return;
    seedSourceLookupKeys(row).forEach((key) => {
      if (!sourceByKey.has(key)) sourceByKey.set(key, row.seedSource);
    });
  });
  return {
    ...parsed,
    entrants: (parsed.entrants || []).map((row) => {
      if (row.seedSource) return row;
      const inheritedSource = seedSourceLookupKeys(row)
        .map((key) => sourceByKey.get(key))
        .find(Boolean);
      return inheritedSource ? { ...row, seedSource: inheritedSource } : row;
    })
  };
}

function mergeImportedSeriesData(parsed, mode = "session") {
  if (mode === "full") {
    return {
      events: parsed.events,
      entrants: parsed.entrants,
      series: parsed.series,
      program: parsed.program
    };
  }
  const sessions = [...new Set([
    ...parsed.entrants.map((row) => row.session).filter(Boolean),
    ...parsed.series.map((row) => row.session).filter(Boolean),
    ...parsed.program.map((row) => row.session).filter(Boolean)
  ])];
  const sessionSet = new Set(sessions);
  if (!sessionSet.size) {
    return {
      events: parsed.events,
      entrants: parsed.entrants,
      series: parsed.series,
      program: parsed.program
    };
  }
  const importedEventIds = new Set(parsed.events.map((event) => event.id));
  const eventMap = new Map(data.events.map((event) => [event.id, event]));
  parsed.events.forEach((event) => eventMap.set(event.id, event));
  return {
    events: [...eventMap.values()].filter((event) => importedEventIds.has(event.id) || availableSexesForEvent(event.id).length),
    entrants: [
      ...data.entrants.filter((row) => !sessionSet.has(row.session || "")),
      ...parsed.entrants
    ],
    series: [
      ...data.series.filter((row) => !sessionSet.has(row.session || "")),
      ...parsed.series
    ],
    program: [
      ...data.program.filter((row) => !sessionSet.has(row.session || "")),
      ...parsed.program
    ].sort((a, b) => Number(a.session || 0) - Number(b.session || 0) || Number(a.order || 9999) - Number(b.order || 9999))
  };
}

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
dataDiagnosticBtn?.addEventListener("click", showDataDiagnostic);
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

