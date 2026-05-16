const STORAGE_KEY = "napSpeakerFrance2026:v15";
const ALERTS_KEY = "napSpeakerFrance2026:alerts:v1";
const LIVE_DISMISSED_ALERTS_KEY = "napSpeakerFrance2026:live-dismissed-alerts:v1";
const FIRESTORE_COMPETITION_ID = "france-2026-limoges";
const SPEAKER_SHEET_ID = "1osoRYSAw15iwfFnpUuR4_nNl_kUui7vQGBJFyyhmmdA";
const SPEAKER_INFO_SHEETS = {
  france: "France N-1",
  records: "Records",
  edf: "EDF",
  international: "International",
  qualifications: "Qualifs EDF",
  clubs: "Club",
  seedSources: "Lieux temps"
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

function saveCurrentRoleState() {
  roleStates[state.role] = cloneRoleState(state);
}

function switchRole(nextRole) {
  if (!ROLE_LABELS[nextRole]) return;
  saveCurrentRoleState();
  state = cloneRoleState(roleStates[nextRole] || createRoleState(nextRole));
  state.role = nextRole;
  if (!isSpeakerView() && state.series === "all") {
    state.series = firstSeriesSelectionForCurrentRace();
  }
  state.selectedSwimmerId = "";
  state.selectedRecordKey = "";
}

let state = createRoleState("live");
let roleStates = {
  speaker: createRoleState("speaker"),
  live: cloneRoleState(state),
  referee: createRoleState("referee"),
  video: createRoleState("video"),
  computer: createRoleState("computer")
};

let alerts = loadAlerts();
let liveDismissedAlertIds = loadLiveDismissedAlerts();
let decisionDraft = createDecisionDraft();
let expandedHistories = {
  speaker: false,
  role: false
};
let isFullscreenMode = Boolean(document.fullscreenElement);
let refereeTabletMode = false;
let firestoreDb = null;
let firestoreUnsubscribe = null;
let liveDataUnsubscribe = null;
let firestoreReady = false;
let applyingRemoteData = false;

const eventSelect = document.querySelector("#eventSelect");
const searchInput = document.querySelector("#searchInput");
const categorySelect = document.querySelector("#categorySelect");
const sessionControls = document.querySelector("#sessionControls");
const seriesControls = document.querySelector("#seriesControls");
const roleSwitch = document.querySelector(".role-switch");
const sidebar = document.querySelector(".sidebar");
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
const officialAlerts = document.querySelector("#officialAlerts");
const decisionPanel = document.querySelector("#decisionPanel");
const decisionModal = document.querySelector("#decisionModal");
const alertDetailModal = document.querySelector("#alertDetailModal");
const programModal = document.querySelector("#programModal");
const adminSeriesModal = document.querySelector("#adminSeriesModal");
const roleQueue = document.querySelector("#roleQueue");
const roleHistory = document.querySelector("#roleHistory");
const speakerHistory = document.querySelector("#speakerHistory");
const roleBadge = document.querySelector("#roleBadge");
const fullscreenBtn = document.querySelector("#fullscreenBtn");
const adminSeriesBtn = document.querySelector("#adminSeriesBtn");
const jsonInput = document.querySelector("#jsonInput");
const csvInput = document.querySelector("#csvInput");
const swimmerDetails = document.querySelector("#swimmerDetails");
const meetEyebrow = document.querySelector("#meetEyebrow");
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

function liveDataDocument() {
  if (!firestoreDb) return null;
  return firestoreDb
    .collection("competitions")
    .doc(FIRESTORE_COMPETITION_ID)
    .collection("liveData")
    .doc("current");
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
  if (!doc) return;
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
  applyingRemoteData = true;
  applyFreshData(mergeRemoteLiveData(remoteData), true);
  applyingRemoteData = false;
}

function initFirebaseSync() {
  if (!window.firebase?.initializeApp || !window.firebase?.firestore) {
    renderDataStatus("Firebase n'est pas chargé. Les alertes restent locales sur cet appareil.");
    return;
  }
  try {
    if (!window.firebase.apps.length) {
      window.firebase.initializeApp(FIREBASE_CONFIG);
    }
    firestoreDb = window.firebase.firestore();
    firestoreUnsubscribe?.();
    liveDataUnsubscribe?.();
    firestoreUnsubscribe = alertsCollection()
      .orderBy("createdAt", "desc")
      .onSnapshot((snapshot) => {
        firestoreReady = true;
        alerts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        saveAlerts();
        render();
      }, (error) => {
        console.warn("Lecture Firebase impossible", error);
          renderDataStatus("Firebase n'est pas joignable. Les alertes restent locales sur cet appareil.");
      });
    liveDataUnsubscribe = liveDataDocument().onSnapshot((snapshot) => {
      if (!snapshot.exists) return;
      const remote = snapshot.data()?.data;
      if (!remote?.sourceVersion || remote.sourceVersion === data.sourceVersion) return;
      applyRemoteLiveData(remote);
    }, (error) => {
      console.warn("Lecture des données live Firebase impossible", error);
    });
  } catch (error) {
    console.warn("Initialisation Firebase impossible", error);
    renderDataStatus("Firebase n'est pas configuré correctement. Les alertes restent locales sur cet appareil.");
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

async function resetHistory() {
  const ok = window.confirm("Effacer tout l'historique DSQ, forfaits, abandons et requalifications pour toutes les consoles ? Cette action est irréversible.");
  if (!ok) return;
  const confirmation = window.prompt('Pour confirmer, écris RAZ en majuscules.');
  if (confirmation !== "RAZ") {
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
    records: Array.isArray(nextData.records) ? nextData.records : [],
    edfMembers: Array.isArray(nextData.edfMembers) ? nextData.edfMembers : (sampleData.edfMembers || []),
    internationalMedals: Array.isArray(nextData.internationalMedals) ? nextData.internationalMedals : (sampleData.internationalMedals || []),
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

function formatName(swimmer) {
  return `${swimmer.firstName || ""} ${swimmer.lastName || ""}`.trim()
    || swimmer.name
    || (isFemaleContext(swimmer.sex) ? "Nageuse à renseigner" : "Nageur à renseigner");
}

function formatDisplayName(entrant) {
  return isRelayEntrant(entrant) ? (entrant.club || entrant.lastName || "Relais") : formatName(entrant);
}

function formatSeriesDisplayName(entrant) {
  if (isRelayEntrant(entrant)) return formatDisplayName(entrant);
  const lastName = String(entrant.lastName || "").trim().toLocaleUpperCase("fr-FR");
  const firstName = String(entrant.firstName || "").trim();
  return [lastName, firstName].filter(Boolean).join(" ") || formatDisplayName(entrant);
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
  computer: "Informatique"
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
  interference: "DSQ - gêne d'un concurrent",
  other_dsq: "DSQ - autre motif"
};

const SPEAKER_DECISION_REASONS = {
  false_start: "faux départ",
  relay_early_start: "départ anticipé",
  underwater_15m: "coulée supérieure à 15 m",
  immersion: "passage en immersion",
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
        label: `${event?.label || row.label || row.eventId.toUpperCase()} ${sexDisplayLabel(row.sex)}`
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
        label: `${event.label} ${sexDisplayLabel(sex)}`
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
  const session = firstSessionNumber();
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
    .filter((row) => row.eventId === eventId && row.sex === sex && row.session)
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
  document.body.classList.toggle("fullscreen-mode", isFullscreenMode);
  document.body.classList.toggle("role-speaker", state.role === "speaker");
  document.body.classList.toggle("role-live", state.role === "live");
  document.body.classList.toggle("role-referee", state.role === "referee");
  document.body.classList.toggle("role-video", state.role === "video");
  document.body.classList.toggle("role-computer", state.role === "computer");
  document.body.classList.toggle("referee-tablet-mode", state.role === "referee" && refereeTabletMode);
  syncProgramButtonPlacement();
  document.querySelectorAll(".role-chip").forEach((button) => {
    button.classList.toggle("active", button.dataset.role === state.role);
  });
  if (roleBadge) roleBadge.textContent = ROLE_LABELS[state.role] || "Console";
  if (fullscreenBtn) {
    fullscreenBtn.hidden = state.role === "referee";
    fullscreenBtn.textContent = isFullscreenMode ? "Quitter plein écran" : "Plein écran";
  }
  if (adminSeriesBtn) adminSeriesBtn.hidden = state.role !== "computer";
  if (!data.events.length) {
    data.events = structuredClone(sampleData.events);
    state.eventId = data.events[0].id;
  }
  if (!data.events.some((event) => event.id === state.eventId)) {
    state.eventId = data.events[0].id;
  }
  normalizeLivePosition();
  const availableSexes = availableSexesForEvent();
  if (availableSexes.length && !availableSexes.includes(state.sex)) {
    state.sex = availableSexes[0];
  }

  if (meetEyebrow) {
    meetEyebrow.textContent = [data.meet?.name, data.meet?.city].filter(Boolean).join(" - ");
  }
  updateEventSelect();
  renderSessionControls();
  renderSeriesControls();
  renderCategorySelect();
  renderHeader();
  renderHeaderReferences();
  renderEntrants();
  renderTop2025();
  renderRolePanels();
  renderDataStatus();
  saveCurrentRoleState();
}

function syncProgramButtonPlacement() {
  if (!programBtn || !roleSwitch || !sidebar) return;
  const compactReferee = state.role === "referee" && refereeTabletMode;
  if (compactReferee) {
    if (programBtn.parentElement !== roleSwitch) {
      roleSwitch.appendChild(programBtn);
    }
    return;
  }
  if (programBtn.parentElement !== sidebar) {
    sidebar.insertBefore(programBtn, categoryField || null);
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
    state.session = sessions[0].number;
  }
  sessionControls.innerHTML = sessions.map((session) => `
      <button class="session-chip ${state.session === session.number ? "active" : ""}" type="button" data-session="${escapeHtml(session.number)}" title="${escapeHtml(session.label)}">
        S${escapeHtml(session.number)}
      </button>
    `).join("");
}

function currentRoleAlertFilter(alert) {
  if (alert.cancelledAt) return false;
  if (state.role === "live") {
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
  return false;
}

function isRequalificationAlert(alert) {
  return alert.type === "requalification" || alert.type === "ja_cancellation";
}

function alertRaceLabel(alert) {
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
  if (alert.type === "requalification") return "Requalification - décision du délégué";
  if (alert.type === "ja_cancellation") return "Requalification - annulation par le JA";
  const motif = DECISION_LABELS[alert.type] || alert.type;
  const detail = alertDetailLabel(alert);
  return detail ? `${motif} - ${detail}` : motif;
}

function speakerAlertSentence(alert) {
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
  return !["forfait", "abandon", "requalification", "ja_cancellation"].includes(alert.type);
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
  if (isSpeakerView()) {
    const sentence = speakerAlertSentence(alert);
    const alertTitle = state.role === "live"
      ? (isRequalificationAlert(alert) ? "Requalification signalée" : "Disqualification signalée")
      : (isRequalificationAlert(alert) ? "Requalification à annoncer" : "Disqualification à annoncer");
    return `
      <div class="alert-card speaker-alert-card" data-alert-id="${escapeHtml(alert.id)}">
        <div>
          <strong class="alert-title"><span aria-hidden="true">!</span> ${escapeHtml(alertTitle)}</strong>
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
        <strong>${escapeHtml(DECISION_LABELS[alert.type] || (isRequalificationAlert(alert) ? "Requalification / annulation" : alert.type))}</strong>
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
  renderRoleHistory();
  renderSpeakerHistory();
}

function renderOfficialAlerts() {
  if (!officialAlerts) return;
  const showVideoInfo = ["live", "speaker"].includes(state.role);
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
  const official = alerts
    .filter(currentRoleAlertFilter)
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
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
  if (alert.cancelledAt) {
    const time = formatAlertTime(alert.cancelledAt);
    const suffix = time ? ` à ${time}` : "";
    return alert.cancelledBy === "delegate" ? `Annulée par le délégué${suffix}` : `Annulée par le JA${suffix}`;
  }
  if (alert.requiresVideo && alert.videoStatus === "pending") return "En attente vidéo";
  if (alert.videoStatus === "rejected") return "Invalidée vidéo";
  if (alert.speakerStatus === "pending" && alert.informaticsStatus === "pending") return "À annoncer / à traiter";
  if (alert.speakerStatus === "pending") return "À annoncer";
  if (alert.informaticsStatus === "pending") return "À traiter informatique";
  if (alert.speakerStatus === "done" || alert.informaticsStatus === "done") return "Terminée";
  return "Envoyée";
}

function alertStatusClass(alert) {
  if (alert.cancelledAt) return "status-rejected";
  if (alert.requiresVideo && alert.videoStatus === "pending") return "status-video";
  if (alert.videoStatus === "rejected") return "status-rejected";
  if (alert.speakerStatus === "pending" || alert.informaticsStatus === "pending") return "status-pending";
  if (alert.speakerStatus === "done" || alert.informaticsStatus === "done") return "status-done";
  return "status-sent";
}

function alertTimeline(alert) {
  const items = [
    ["JA", alert.createdAt],
    ["Vidéo confirmée", alert.videoConfirmedAt],
    ["Vidéo invalidée", alert.videoRejectedAt],
    ["Speaker", alert.speakerAnnouncedAt],
    ["Informatique", alert.informaticsDoneAt],
    [alert.cancelledBy === "delegate" ? "Délégué" : "Annulation", alert.cancelledAt]
  ].filter(([, value]) => value);
  return items.map(([label, value]) => `${label} ${formatAlertTime(value)}`).join(" - ");
}

function alertTimelineItems(alert) {
  const related = alerts
    .filter((item) => item.originalAlertId === alert.id)
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  const items = [
    ["Créée par le JA", alert.createdAt],
    ["Vidéo confirmée", alert.videoConfirmedAt],
    ["Vidéo invalidée", alert.videoRejectedAt],
    ["Annonce speaker", alert.speakerAnnouncedAt],
    ["Traitée informatique", alert.informaticsDoneAt],
    [alert.cancelledBy === "delegate" ? "Annulée par le délégué" : "Annulée par le JA", alert.cancelledAt]
  ].filter(([, value]) => value);
  related.forEach((item) => {
    const source = item.type === "requalification" ? "délégué" : "JA";
    items.push([`Alerte requalification créée (${source})`, item.createdAt]);
    if (item.speakerAnnouncedAt) items.push(["Requalification annoncée speaker", item.speakerAnnouncedAt]);
    if (item.informaticsDoneAt) items.push(["Requalification traitée informatique", item.informaticsDoneAt]);
  });
  return items;
}

function renderHistoryItem(alert, options = {}) {
  const status = alertStatusLabel(alert);
  const timeline = alertTimeline(alert);
  const event = data.events.find((item) => item.id === alert.eventId);
  const sexLabel = alert.sex === "F" ? "Femmes" : (alert.sex === "M" ? "Hommes" : "Mixte");
  const seriesLabel = alert.stage && isFinalStage(alert.stage)
    ? finalStageLabel(alert.stage)
    : `Série ${alert.series || "-"}`;
  const courseLine = `${event?.label || alert.eventId} ${sexLabel} - ${seriesLabel} - Ligne ${alert.line || "-"}`;
  const motif = decisionMotifLabel(alert);
  const identity = options.showIdentity ? fullAlertIdentityLabel(alert) : alertIdentityLabel(alert);
  const action = historyActionForAlert(alert);
  return `
    <div class="history-item ${alertStatusClass(alert)} ${options.compact ? "compact-history-item" : ""}" data-history-alert-id="${escapeHtml(alert.id)}">
      <time>${escapeHtml(formatAlertTime(options.timeValue || alert.cancelledAt || alert.createdAt) || "--:--")}</time>
      <span>${escapeHtml(courseLine)}</span>
      <strong>${escapeHtml(motif)}</strong>
      <small>${escapeHtml(identity)}</small>
      <em>${escapeHtml(status)}${timeline ? ` - ${escapeHtml(timeline)}` : ""}</em>
      ${action ? `<button class="history-action ${escapeHtml(action.className)}" type="button" data-history-action="${escapeHtml(action.action)}">${escapeHtml(action.label)}</button>` : ""}
    </div>
  `;
}

function openAlertDetail(alertId) {
  const clickedAlert = alerts.find((item) => item.id === alertId);
  if (!clickedAlert || !alertDetailModal) return;
  const alert = clickedAlert.originalAlertId
    ? (alerts.find((item) => item.id === clickedAlert.originalAlertId) || clickedAlert)
    : clickedAlert;
  const status = alertStatusLabel(alert);
  const event = data.events.find((item) => item.id === alert.eventId);
  const sexLabel = alert.sex === "F" ? "Femmes" : (alert.sex === "M" ? "Hommes" : "Mixte");
  const seriesLabel = alert.stage && isFinalStage(alert.stage)
    ? finalStageLabel(alert.stage)
    : `Série ${alert.series || "-"}`;
  const identity = alertIdentityLabel(alert);
  const comment = alertCommentLabel(alert);
  const timeline = alertTimelineItems(alert);
  const speakerSentence = state.role !== "video" && (isSpeakerView() || alert.speakerStatus !== "none") ? speakerAlertSentence(alert) : null;
  const clickedSentence = state.role !== "video" && clickedAlert.id !== alert.id ? speakerAlertSentence(clickedAlert) : null;
  alertDetailModal.hidden = false;
  alertDetailModal.innerHTML = `
    <div class="decision-dialog alert-detail-dialog" role="dialog" aria-modal="true" aria-label="Détail de décision">
      <div class="decision-modal-head">
        <div>
          <span>Fiche décision</span>
          <h2>${escapeHtml(decisionMotifLabel(alert))}</h2>
          <p>${escapeHtml(identity)}</p>
          <p class="decision-race-info">${escapeHtml(event?.label || alert.eventId)} ${escapeHtml(sexLabel)} - ${escapeHtml(seriesLabel)} - Ligne ${escapeHtml(alert.line || "-")}</p>
        </div>
        <button class="icon-button decision-close" type="button" data-close-alert-detail aria-label="Fermer">×</button>
      </div>
      <div class="alert-detail-status ${alertStatusClass(alert)}">
        <strong>${escapeHtml(status)}</strong>
      </div>
      <div class="alert-detail-grid">
        <div><span>Course</span><strong>${escapeHtml(event?.label || alert.eventId)}</strong></div>
        <div><span>Sexe</span><strong>${escapeHtml(sexLabel)}</strong></div>
        <div><span>Série</span><strong>${escapeHtml(seriesLabel)}</strong></div>
        <div><span>Ligne</span><strong>${escapeHtml(alert.line || "-")}</strong></div>
        <div><span>Concurrent</span><strong>${escapeHtml(identity)}</strong></div>
        <div><span>Motif</span><strong>${escapeHtml(decisionMotifLabel(alert))}</strong></div>
      </div>
      ${comment ? `<div class="alert-detail-note"><span>Remarque</span><strong>${escapeHtml(comment)}</strong></div>` : ""}
      ${speakerSentence ? `<div class="alert-detail-note"><span>Texte speaker DSQ</span><strong>${escapeHtml(speakerSentence.text)} - ${escapeHtml(speakerSentence.identity)}</strong></div>` : ""}
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
  speakerHistory.hidden = false;
  speakerHistory.innerHTML = `
    <div class="panel-title">
      <h3>Disqualifications annoncées</h3>
      ${historyToggleButton("speaker", doneAlerts.length)}
    </div>
    <div class="history-list ${expandedHistories.speaker ? "expanded" : "compact-scroll"}">
      ${doneAlerts.map((alert) => {
        return renderHistoryItem(alert, { compact: false, timeValue: alert.cancelledAt || alert.speakerAnnouncedAt || alert.updatedAt });
      }).join("")}
    </div>
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
    title = "Historique informatique";
    rows = alerts.filter((alert) => alert.informaticsStatus === "done" && !isRequalificationAlert(alert));
  }
  rows = rows
    .sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
  if (!rows.length) {
    roleHistory.hidden = true;
    roleHistory.innerHTML = "";
    return;
  }
  roleHistory.hidden = false;
  roleHistory.innerHTML = `
    <div class="panel-title">
      <h3>${escapeHtml(title)}</h3>
      ${historyToggleButton("role", rows.length)}
    </div>
    <div class="history-list ${expandedHistories.role ? "expanded" : "compact-scroll"}">
      ${rows.map((alert) => renderHistoryItem(alert, { timeValue: alert.cancelledAt || alert.createdAt, showIdentity: state.role === "video" })).join("")}
    </div>
  `;
}

function historyToggleButton(historyKey, rowCount) {
  if (rowCount <= 5) return "";
  const expanded = Boolean(expandedHistories[historyKey]);
  return `<button class="history-toggle" type="button" data-history-toggle="${escapeHtml(historyKey)}">${expanded ? "Réduire" : "Tout afficher"}</button>`;
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
  return [
    ["forfait", "Forfait"],
    ["abandon", "Abandon"],
    ["false_start", "DSQ - faux départ"],
    ...(relay ? [["relay_early_start", "DSQ - départ anticipé"]] : []),
    ["underwater_15m", "DSQ - coulée supérieure à 15 m"],
    ["immersion", "DSQ - passage en immersion"],
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
  decisionPanel.hidden = false;
  decisionPanel.innerHTML = `
    <h3>Décision juge arbitre</h3>
    <p class="panel-subtitle">${entrant ? `${escapeHtml(formatDisplayName(entrant))} sélectionné. La fenêtre de décision est ouverte.` : "Clique sur une ligne de la série pour créer une décision."}</p>
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

function closeDecisionModal() {
  if (!decisionModal) return;
  decisionModal.hidden = true;
  decisionModal.innerHTML = "";
}

function decisionNeedsDetail(type) {
  return type === "relay_early_start" || type === "underwater_15m";
}

function decisionNeedsRelayLeg(type, entrant) {
  return isRelayEntrant(entrant) && ["relay_early_start", "underwater_15m", "immersion", "interference", "other_dsq"].includes(type);
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
          <h2>${escapeHtml(formatDisplayName(entrant))}</h2>
          <p>${escapeHtml(shortClubName(entrant) || entrant.club || "")}</p>
          <p class="decision-race-info">${escapeHtml(modalRaceInfo)}</p>
        </div>
        <button class="icon-button decision-close" type="button" data-close-decision aria-label="Fermer">×</button>
      </div>
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
  const title = state.role === "video" ? "Demandes vidéo à vérifier" : "Décisions à saisir";
  roleQueue.hidden = false;
  roleQueue.innerHTML = `
    <h3>${title}</h3>
    <div class="queue-list">
      ${rows.length ? rows.map(renderQueueItem).join("") : `<p class="panel-subtitle">Aucune alerte en attente.</p>`}
    </div>
  `;
}

function renderQueueItem(alert) {
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
    ? "Concurrent non affiché"
    : `${alertSwimmerLabel(alert)}${detail ? ` - ${detail}` : ""}`;
  return `
    <div class="queue-item urgent-queue-item" data-alert-id="${escapeHtml(alert.id)}">
      <div>
        <strong class="alert-title"><span aria-hidden="true">!</span> ${escapeHtml(title)}</strong>
        <strong>${escapeHtml(decisionMotifLabel(alert))}</strong>
        <span>${escapeHtml(alertRaceLabel(alert))}</span>
        <span>${escapeHtml(identityLine)}</span>
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
    informaticsStatus: source.informaticsStatus === "pending" ? "none" : source.informaticsStatus
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
  dataStatus.classList.remove("warning", "source");
  if (message) {
    dataStatus.hidden = false;
    dataStatus.textContent = message;
    dataStatus.classList.add("warning");
    return;
  }
  if (data.sourceVersion) {
    const sourceLabel = data.notes?.sourceLabel || "Données officielles chargées";
    const sourceFile = data.notes?.sourceFile || "";
    const results = data.notes?.resultFiles?.length
      ? `${data.notes.resultFiles.length} fichier${data.notes.resultFiles.length > 1 ? "s" : ""} résultats`
      : "aucun fichier résultats";
    const generatedAt = data.notes?.generatedAt || "";
    const seriesCount = data.notes?.seriesLineCount || data.series?.length || 0;
    const entrantTotal = data.notes?.entrantCount || data.entrants?.length || 0;
    dataStatus.hidden = false;
    dataStatus.innerHTML = `
      <span><strong>Source active</strong> ${escapeHtml(sourceLabel)}${sourceFile ? ` - ${escapeHtml(sourceFile)}` : ""}</span>
      <span>${escapeHtml(String(entrantTotal))} engagements</span>
      <span>${escapeHtml(String(seriesCount))} lignes de séries</span>
      <span>${escapeHtml(results)}</span>
      ${generatedAt ? `<span>mise à jour ${escapeHtml(generatedAt)}</span>` : ""}
    `;
    dataStatus.classList.add("source");
    return;
  }
  dataStatus.hidden = false;
  dataStatus.textContent = "Données officielles non chargées. Sur GitHub Pages, vérifie que data.generated.js et donnees-speaker-france-2026.json sont bien publiés.";
  dataStatus.classList.add("warning");
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
    seriesControls.innerHTML = `<span class="no-series-note">${escapeHtml(programRow.startTime ? `Finale - ${programRow.startTime}` : "Finale")}</span>`;
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
      return `
        <button class="series-chip ${Number(state.series) === number ? "active" : ""}" type="button" data-series="${number}">
          <strong>${number}</strong>${time ? `<span>${escapeHtml(time)}</span>` : ""}
        </button>
      `;
    }),
    ...finalRows.map((row) => `
      <button class="series-chip final-chip ${state.series === row.stage ? "active" : ""}" type="button" data-series="${escapeHtml(row.stage)}">
        <strong>${escapeHtml(finalStageLabel(row.stage))}</strong>${row.startTime ? `<span>${escapeHtml(row.startTime)}</span>` : ""}
      </button>
    `)
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

function setSeriesNavigation(previousDisabled, previousLabel, nextDisabled, nextLabel) {
  [previousSeriesBtn, previousSeriesInlineBtn, previousSeriesFloatBtn].forEach((button) => {
    if (!button) return;
    button.disabled = previousDisabled;
    button.textContent = previousLabel;
  });
  [nextSeriesBtn, nextSeriesInlineBtn, nextSeriesFloatBtn].forEach((button) => {
    if (!button) return;
    button.disabled = nextDisabled;
    button.textContent = nextLabel;
  });
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
  const rows = (data.program || [])
    .filter((row) => viewState.session === "all" || !row.session || row.session === viewState.session)
    .filter((row) => row.hasEntrants === false || hasRowsForProgram(row))
    .sort((a, b) => Number(a.session || 0) - Number(b.session || 0) || Number(a.order || 9999) - Number(b.order || 9999));
  const currentKey = raceOptionKey(viewState.eventId, viewState.sex);
  programModal.innerHTML = `
    <div class="decision-dialog program-dialog" role="dialog" aria-modal="true" aria-label="Programme">
      <div class="decision-modal-head">
        <div>
          <span>Avancement</span>
          <h2>Programme simplifié</h2>
          <p>${viewState.session === "all" ? "Toutes les sessions" : `Session ${escapeHtml(viewState.session)}`} - courses, séries et horaires indicatifs.</p>
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
            <div class="program-row ${rowCurrent ? "current-race" : ""} ${readOnlyProgram ? "readonly-program-row" : ""}" data-program-row="${escapeHtml(programKey(row))}">
              <button class="program-race-button" type="button" ${readOnlyProgram ? "disabled" : `data-program-race="${escapeHtml(programKey(row))}"`}>
                <span>${row.session ? `S${escapeHtml(row.session)} · ` : ""}${escapeHtml(event?.label || row.label || row.eventId)} ${escapeHtml(sexDisplayLabel(row.sex))}${splitRaceNote(row.eventId, row.sex)}</span>
                ${row.startTime ? `<small>${escapeHtml(row.startTime)}</small>` : ""}
              </button>
              <div class="program-series-line">
                ${items.length ? items.map((item) => `
                  <button class="program-series-chip ${programItemIsCurrent(row, item) ? "current" : ""} ${programItemIsSpeakerCurrent(row, item) ? "speaker-current" : ""}" type="button" ${readOnlyProgram ? "disabled" : `data-program-race="${escapeHtml(programKey(row))}" data-program-series="${escapeHtml(item.series)}" data-program-stage="${escapeHtml(item.stage || "series")}"`}>
                    <strong>${escapeHtml(item.label)}</strong>${item.time ? `<span>${escapeHtml(item.time)}</span>` : ""}${programItemIsSpeakerCurrent(row, item) ? `<em>speaker</em>` : ""}
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
  const event = currentEvent();
  const sexLabel = sexDisplayLabel(state.sex);
  const title = `${event?.label || "Course"} - ${sexLabel}`;
  raceTitle.innerHTML = `${escapeHtml(title)}${isLastRaceOfCurrentSession() ? ` <span class="session-end-note">[dernière course de la session]</span>` : ""}`;
  const meta = [event?.discipline, event?.distance].filter(Boolean).join(" - ");
  raceMeta.textContent = meta;
  raceSexBadge.textContent = sexLabel;
}

function renderHeaderReferences() {
  const recordRows = currentRecordRows();
  const qualificationRows = data.qualifications
    .filter(matchesRace)
    .sort((a, b) => timeToMs(a.time) - timeToMs(b.time));
  const chips = [
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
  ];
  headerRefs.innerHTML = chips.join("");
  renderHeaderRefDetails();
}

function renderHeaderRefDetails() {
  if (!state.selectedRecordKey) {
    headerRefDetails.hidden = true;
    headerRefDetails.innerHTML = "";
    return;
  }
  const row = currentRecordRows().find((record) => recordKey(record) === state.selectedRecordKey);
  if (!row) {
    state.selectedRecordKey = "";
    headerRefDetails.hidden = true;
    headerRefDetails.innerHTML = "";
    return;
  }
  headerRefDetails.hidden = false;
  headerRefDetails.innerHTML = `
    <div>
      <strong>${escapeHtml(shortRecordLabel(row))} - ${escapeHtml(row.time || "-")}</strong>
      <span>${escapeHtml(recordDescription(row))}</span>
    </div>
    <button class="icon-button close-ref-details" title="Fermer le détail" aria-label="Fermer le détail">×</button>
  `;
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
  const selectedSeriesCount = currentSeriesRows()[0]?.seriesCount || seriesNumbers.length || selectedSeries;
  const seriesLabel = isFinalStage(state.series)
    ? finalStageLabel(state.series)
    : `Série ${selectedSeries} / ${selectedSeriesCount}`;
  const tabletRacePrefix = state.role === "referee" && refereeTabletMode && hasSeriesFilter
    ? `${currentEvent()?.label || "Course"} ${sexDisplayLabel(state.sex)} - `
    : "";
  const entrantsTitleText = hasSeriesFilter
    ? `${tabletRacePrefix}${seriesLabel}`
    : (state.role === "referee" ? "Participants" : `${entrantWord(2).replace(/^./, (letter) => letter.toUpperCase())} 2026`);
  entrantsTitle.innerHTML = `${escapeHtml(entrantsTitleText)}${hasSeriesFilter ? splitRaceNote() : ""}${isLastSeriesOfCurrentSession() ? ` <span class="session-end-note">[dernière série de la session]</span>` : ""}`;
  if (entrantsSubtitle) {
    entrantsSubtitle.textContent = hasSeriesFilter
      ? [seriesTime ? `Horaire ${seriesTime}` : "", `${visibleEntrants.length} ${swimmerWord(visibleEntrants.length)}`].filter(Boolean).join(" - ")
      : "";
  }
  rankHeader.textContent = hasSeriesFilter ? "Ligne" : "Rang";
  if (swimmerHeader) swimmerHeader.textContent = isFemaleContext() ? "Nageuse" : "Nageur";
  if (searchLabel) searchLabel.textContent = `Recherche ${entrantWord(1)}`;
  if (lineOrderBtn) {
    lineOrderBtn.hidden = !hasSeriesFilter;
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
    const reference = state.role === "referee"
      ? `<span class="badge muted">Cliquer pour décider</span>`
      : (isSpeakerView() ? getEntrantReference(entrant) : "");
    const swimmerId = entrant.swimmerId || entrantKey(entrant);
    const lineLabel = hasSeriesFilter ? (entrant.seriesInfo?.line || "-") : index + 1;
    const clubLabel = state.role === "referee" ? shortClubName(entrant) : (entrant.club || "-");
    const displayName = state.role === "referee" && isRelayEntrant(entrant)
      ? (shortClubName(entrant) || formatDisplayName(entrant))
      : formatSeriesDisplayName(entrant);
    const lineAlerts = activeLineAlertsForEntrant(entrant);
    const alertBadges = renderLineAlertBadges(lineAlerts);
    return `
      <tr class="${state.selectedSwimmerId === swimmerId ? "selected-row" : ""} ${lineAlerts.length ? "dsq-row" : ""} category-row ${categoryClass(entrant.category)}" data-swimmer-id="${escapeHtml(swimmerId)}">
        <td><span class="lane">${escapeHtml(lineLabel)}</span></td>
        <td class="name-cell">
          <button class="swimmer-button" data-swimmer-id="${escapeHtml(swimmerId)}">${escapeHtml(displayName)}${!isRelayEntrant(entrant) ? ` <span class="birth-year">(${escapeHtml(getBirthYearLabel(entrant.birthDate))})</span>` : ""}${isSpeakerView() ? renderEdfBadges(entrant) : ""}${alertBadges}</button>
          ${!isRelayEntrant(entrant) || state.role === "referee" ? `<span class="club-name">${escapeHtml(clubLabel || "-")}</span>` : ""}
        </td>
        <td><span class="category-pill">${escapeHtml(categoryLabel(entrant.category, entrant.sex))}</span></td>
        <td class="time-cell">
          ${state.role === "referee" && refereeTabletMode && lineAlerts.length
            ? renderLineAlertBadges(lineAlerts)
            : `<span class="time">${escapeHtml(entrant.seedTime || "-")}</span>`}
          ${!(state.role === "referee" && refereeTabletMode && lineAlerts.length) && isSpeakerView() ? renderRecordGapAlert(entrant) : ""}
          ${!(state.role === "referee" && refereeTabletMode && lineAlerts.length) && isSpeakerView() && entrant.seedSource ? `<span class="seed-source">${escapeHtml(entrant.seedSource)}</span>` : ""}
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

function findEdfMemberships(entrant) {
  const key = entrantPersonKey(entrant);
  return (data.edfMembers || []).filter((member) => member.personKey === key);
}

function findInternationalMedals(entrant) {
  const key = entrantPersonKey(entrant);
  return (data.internationalMedals || []).filter((medal) => medal.personKey === key);
}

function findInternationalMedalsForRace(entrant) {
  return findInternationalMedals(entrant).filter((medal) => medal.eventId === entrant.eventId);
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
    record.eventId === entrant.eventId &&
    record.sex === entrant.sex &&
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
  const france2025 = findFrance2025Results(swimmer);
  const internationalMedals = findInternationalMedals(swimmer);
  const heldRecords = findAllRecordsHeldByEntrant(swimmer);
  swimmerDetails.hidden = false;
  swimmerDetails.innerHTML = `
    <div class="details-title">
      <div class="swimmer-identity">
        <h4>${escapeHtml(formatName(swimmer))} ${renderEdfBadges(swimmer)}</h4>
        <span>${escapeHtml(swimmer.club || "")} - ${escapeHtml(categoryLabel(swimmer.category, swimmer.sex))} - ${escapeHtml(getBirthYearLabel(swimmer.birthDate))}</span>
      </div>
      <div class="compact-program" aria-label="Courses engagées du weekend">
        ${entries.map((entry) => `
          <span class="${categoryClass(entry.category)}">
            <strong>${escapeHtml(shortEventLabel(entry.eventId))}</strong>
            ${escapeHtml(entry.seedTime || "-")}
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
    .filter(matchesRace)
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
  return importedEventId(value) || (data.events || []).find((event) => event.id === normalized)?.id || normalized;
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
  return [firstName, lastName].filter(Boolean).join(" ").trim() || fallback;
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
  const url = `https://docs.google.com/spreadsheets/d/${SPEAKER_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`onglet ${sheetName} inaccessible`);
  return parseDelimitedRows(await response.text());
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
      sex: rowValue(row, ["sexe", "sex"]),
      category,
      label: type || (sameCategory(category, "Cadet") ? "Meilleure performance" : `Record de France ${category}`),
      holder: rowValue(row, ["detenteur", "détenteur", "holder", "nom_prenom", "nom"]),
      club: rowValue(row, ["club_code", "club"]),
      time: sheetTime(rowValue(row, ["temps", "time"])),
      date: rowValue(row, ["date", "annee", "année"]),
      place: rowValue(row, ["lieu", "place"])
    };
  }).filter((row) => row.eventId && row.sex && row.category && row.time);
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
    if (eventId.includes("x") && /^edf\.?j?$/i.test(String(club).replace(/\s+/g, ""))) return;
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

function parseInternationalSheet(rows) {
  return sheetObjects(rows).map((row) => ({
    personKey: personKeyFromSheet(row, rowValue(row, ["sexe", "sex"])),
    eventId: rowValue(row, ["course_id", "eventId"]).toLowerCase(),
    sex: rowValue(row, ["sexe", "sex"]),
    eventLabel: rowValue(row, ["course_libelle", "course"]),
    medal: rowValue(row, ["medaille", "médaille"]),
    time: importedSeriesTime(rowValue(row, ["temps", "time"])),
    championship: [rowValue(row, ["championnat"]), rowValue(row, ["annee", "année"])].filter(Boolean).join(" "),
    place: rowValue(row, ["lieu", "place"])
  })).filter((row) => row.personKey !== "|" && row.eventId);
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
  renderDataStatus("Mise à jour des infos speaker depuis Google Sheets...");
  try {
    const [
      franceRows,
      recordRows,
      edfRows,
      internationalRows,
      qualificationRows,
      clubRows,
      seedRows
    ] = await Promise.all([
      fetchSpeakerSheetRows(SPEAKER_INFO_SHEETS.france),
      fetchSpeakerSheetRows(SPEAKER_INFO_SHEETS.records),
      fetchSpeakerSheetRows(SPEAKER_INFO_SHEETS.edf),
      fetchSpeakerSheetRows(SPEAKER_INFO_SHEETS.international),
      fetchSpeakerSheetRows(SPEAKER_INFO_SHEETS.qualifications),
      fetchSpeakerSheetRows(SPEAKER_INFO_SHEETS.clubs),
      fetchSpeakerSheetRows(SPEAKER_INFO_SHEETS.seedSources)
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
      qualifications: parseQualificationsSheet(qualificationRows),
      entrants: entrantsWithSpeakerInfo,
      sourceVersion: `speaker-info-${Date.now()}`,
      notes: {
        ...(data.notes || {}),
        sourceMode: data.notes?.sourceMode || "series-live",
        speakerInfoSource: "Google Sheets",
        speakerInfoUpdatedAt: new Date().toLocaleString("fr-FR")
      }
    });
    applyFreshData(nextData, true);
    await publishLiveDataToFirestore(nextData, "Infos speaker Google Sheets");
    window.alert(`Infos speaker mises à jour : ${nextData.top2025.length} lignes France N-1, ${nextData.records.length} records, ${nextData.qualifications.length} qualifs, ${nextData.edfMembers.length} membres EDF, ${attachedSeedSources} lieux rattachés aux engagés (${seedSources.size} repères trouvés).`);
  } catch (error) {
    console.error(error);
    renderDataStatus("Impossible de lire le Google Sheet. Vérifie le partage en lecture publique.");
    window.alert(`Mise à jour impossible : ${error?.message || error}. Vérifie que le Google Sheet est partagé en lecture avec le lien.`);
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
    .filter((alert) => isDsqAlert(alert) && !alert.originalAlertId)
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

function buildDsqReportHtml() {
  const rows = dsqReportRows();
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
  }).join("") : `<tr><td colspan="5" class="empty">Aucune DSQ enregistrée.</td></tr>`;
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Historique DSQ</title>
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
  <div class="print-actions"><button onclick="window.print()">Enregistrer en PDF</button></div>
  <h1>Historique DSQ</h1>
  <p>${escapeHtml(meetName)} - généré le ${escapeHtml(generatedAt)} - ${rows.length} DSQ</p>
  <table>
    <thead>
      <tr><th>#</th><th>Course / session</th><th>Nageur / relais</th><th>Décision</th><th>Vie de la DSQ</th></tr>
    </thead>
    <tbody>${body}</tbody>
  </table>
</body>
</html>`;
}

function exportDsqPdf() {
  const reportWindow = window.open("", "_blank");
  if (!reportWindow) {
    window.alert("La fenêtre PDF a été bloquée par le navigateur.");
    return;
  }
  reportWindow.document.open();
  reportWindow.document.write(buildDsqReportHtml());
  reportWindow.document.close();
  reportWindow.focus();
  setTimeout(() => reportWindow.print(), 250);
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

sessionControls?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-session]");
  if (!button) return;
  state.session = button.dataset.session;
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
});

document.querySelectorAll(".role-chip").forEach((button) => {
  button.addEventListener("click", () => {
    const nextRole = button.dataset.role || "speaker";
    if (nextRole === "referee" && state.role === "referee") {
      refereeTabletMode = !refereeTabletMode;
      render();
      return;
    }
    switchRole(nextRole);
    render();
  });
});

headerRefs.addEventListener("click", (event) => {
  const button = event.target.closest(".ref-chip-button");
  if (!button) return;
  state.selectedRecordKey = state.selectedRecordKey === button.dataset.recordKey ? "" : button.dataset.recordKey;
  renderHeaderReferences();
});

headerRefDetails.addEventListener("click", (event) => {
  if (!event.target.closest(".close-ref-details")) return;
  state.selectedRecordKey = "";
  renderHeaderReferences();
});

seriesControls.addEventListener("click", (event) => {
  const button = event.target.closest("[data-series]");
  if (!button) return;
  state.series = button.dataset.series;
  state.selectedSwimmerId = "";
  render();
});

programBtn?.addEventListener("click", openProgramModal);
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

adminSeriesModal?.addEventListener("click", (event) => {
  if (event.target === adminSeriesModal || event.target.closest("[data-admin-series-close]")) {
    closeAdminSeriesModal();
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
  const message = mode === "full"
    ? "Confirmer l'import comme PDF général ? Cela remplace toutes les séries actuellement publiées."
    : `Confirmer l'import comme mise à jour de la session ${forcedSession} ? Cette session sera remplacée par le PDF choisi.`;
  if (!window.confirm(message)) return;
  closeAdminSeriesModal();
  await importSeriesPdf(file, mode, forcedSession);
});

officialAlerts?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-alert-action]");
  const card = event.target.closest("[data-alert-id]");
  if (!card) return;
  if (state.role === "live") {
    dismissLiveAlert(card.dataset.alertId);
    return;
  }
  if (!button) return;
  if (button.dataset.alertAction === "Annoncé") {
    updateAlert(card.dataset.alertId, { speakerStatus: "done", speakerAnnouncedAt: new Date().toISOString() });
  }
});

alertDetailModal?.addEventListener("click", (event) => {
  if (event.target === alertDetailModal || event.target.closest("[data-close-alert-detail]")) {
    closeAlertDetail();
  }
});

decisionModal?.addEventListener("click", (event) => {
  if (event.target === decisionModal || event.target.closest("[data-close-decision]")) {
    closeDecisionModal();
    return;
  }
  const entrant = selectedEntrant();
  if (!entrant) return;
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
  }
});

roleHistory?.addEventListener("click", (event) => {
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
    const ok = window.confirm("Annuler cette décision ? Une alerte sera envoyée si le speaker ou l'informatique doit corriger l'information.");
    if (ok) cancelDecision(alert.id, "referee");
  } else if (button.dataset.historyAction === "delegate-cancel") {
    const ok = window.confirm("Confirmer l'annulation par le délégué de la compétition ? Le speaker et l'informatique recevront une alerte de requalification.");
    if (ok) cancelDecision(alert.id, "delegate");
  }
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
    sessionControls?.querySelector("[data-session]")?.focus();
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

function splitImportedPersonName(value) {
  const tokens = fixPdfEncoding(value).trim().split(/\s+/).filter(Boolean);
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
  let order = 0;
  const meet = parseImportedMeetMetadata(normalizedLines);

  const titlePattern = /^(.+?) - Seniors (Femmes|Hommes)(?:(?: - Finale\(s\).*)|(?: M\s*eilleure s[eé]rie.*))?$/i;
  const finalTitlePattern = /^(.+?) - (?:Seniors )?(Femmes|Hommes|Mixte).*Finale.*?(?:Horaire indicatif : (\d{2}:\d{2}))?.*$/i;
  const finalHeatPattern = /^finale\s+([AB])\s+Horaire indicatif : (\d{2}:\d{2})(?: \((\d+)\))?/i;
  const relayTitlePattern = /^(.+?) - (Femmes|Hommes|Mixte)(?: M\s*eilleure s[eé]rie.*)?$/i;
  const heatPattern = /^s.{1,2}rie\s*:\s*(\d+)\s*\/\s*(\d+)\s+Horaire indicatif\s*:\s*(\d{2}:\d{2})(?:\s+\((\d+)\))?/i;
  const swimmerPattern = /^(\d+)\s+(.+?)\s*(\d{2})\s+([FH][A-Z0-9+]+)\s+(\S+)\s+([0-9:.]+)(?:\s+IN)?$/;
  const speakerPattern = /^(\d+)\s+(.+?)\s*(\d{2})\s+([FH][A-Z0-9+]+)\s+\*\s+(\S+)\s+([0-9:.]+)(.*)$/;
  const tolerantSpeakerPattern = /^(\d+)\s+(.+?)\s*(\d{2})\s+([FH][A-Z0-9+]+)\s+\*?\s*([A-Z0-9]+)\s+([0-9:.]+)(.*)$/;

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
      }
      current = null;
      return;
    }

    const finalHeatMatch = line.match(finalHeatPattern);
    if (finalHeatMatch && pendingFinal) {
      const [, letter, startTime, heatOrder] = finalHeatMatch;
      order += 1;
      const stage = `finale-${letter.toUpperCase()}`;
      program.push({
        eventId: pendingFinal.eventId,
        sex: pendingFinal.sex,
        order,
        label: `${pendingFinal.baseLabel} - Finale ${letter.toUpperCase()}`,
        session: currentSession.number,
        sessionLabel: currentSession.label,
        stage,
        startTime,
        hasEntrants: true
      });
      current = {
        eventId: pendingFinal.eventId,
        sex: pendingFinal.sex,
        series: letter.toUpperCase() === "A" ? 1 : 2,
        seriesCount: 1,
        heatOrder: Number(heatOrder || order),
        startTime,
        isRelay: isImportedRelayEvent(pendingFinal.eventId),
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
    } else if (swimmerMatch || speakerMatch) {
      const match = swimmerMatch || speakerMatch;
      lane = match[1];
      rawName = fixPdfEncoding(match[2]);
      birth = match[3];
      catCode = match[4];
      club = match[5];
      seedTime = match[6];
      fullClub = speakerMatch ? fixPdfEncoding(String(match[7] || "").trim() || club) : club;
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
  const firstUseful = lines.find((line) => /^FFESSM\s+/i.test(line)) || "";
  const secondUseful = lines.find((line) => /\b20\d{2}\b/.test(line) && !/^FFESSM\s+/i.test(line)) || "";
  let name = "";
  let city = "";
  let year = "";
  if (firstUseful) {
    const cleaned = firstUseful.replace(/^FFESSM\s+/i, "").trim();
    const match = cleaned.match(/(.+?)\s+CNNP\s*([A-Za-zÀ-ÖØ-öø-ÿ' -]+)?/i);
    if (match) {
      name = match[1].trim();
      city = (match[2] || "").trim();
    } else {
      name = cleaned.replace(/\s+CNNP.*$/i, "").trim();
    }
  }
  const combined = `${firstUseful} ${secondUseful}`;
  const yearMatch = combined.match(/\b(20\d{2})\b/);
  if (yearMatch) year = yearMatch[1];
  if (!city && secondUseful) {
    city = secondUseful.split(/\s+-\s+/)[0].trim();
  }
  if (year && name && !name.includes(year)) {
    name = `${name} ${year}`;
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
    const parsed = inheritImportedSeedSources(applyImportedSessionOverride(parseImportedSeriesLines(lines, file.name), forcedSession));
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
        lastImportedSessions: [...new Set(parsed.program.map((row) => row.session).filter(Boolean))].join(", "),
        generatedAt: new Date().toLocaleString("fr-FR")
      }
    });
    applyFreshData(nextData, true);
    try {
      await publishLiveDataToFirestore(nextData, `Import PDF ${file.name}`);
      const sessionList = [...new Set(parsed.program.map((row) => row.session).filter(Boolean))]
        .sort((a, b) => Number(a) - Number(b))
        .map((session) => `S${session}`)
        .join(", ");
      const sessionText = sessionList ? ` Sessions détectées : ${sessionList}.` : "";
      window.alert(`${mode === "full" ? "PDF général publié" : "Session publiée"} : ${parsed.program.length} courses, ${parsed.series.length} lignes.${sessionText}`);
    } catch {
      window.alert(`Séries chargées sur cet appareil (${parsed.program.length} courses, ${parsed.series.length} lignes), mais Firebase n'a pas accepté la publication. Il faut élargir les règles Firestore pour liveData.`);
    }
  } catch (error) {
    console.error(error);
    window.alert(`Import impossible pour ce PDF : ${error?.message || error}. On gardera la méthode actuelle si ce format n'est pas reconnu.`);
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
    roleStates = {
      speaker: createRoleState("speaker"),
      live: createRoleState("live"),
      referee: createRoleState("referee"),
      video: createRoleState("video"),
      computer: createRoleState("computer")
    };
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

document.querySelector("#resetHistoryBtn")?.addEventListener("click", resetHistory);
setInterval(checkForGeneratedUpdates, 5000);

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

