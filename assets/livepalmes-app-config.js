(function () {
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
const ADMIN_PIN = "";
const ROLE_PINS = {};
const ADMIN_AUTH = {
  adminUids: ["AgvWJjvLOfe3uB0lz0Xr3wwJxzT2"],
  adminEmails: [],
  legacyAdminPinFallback: false
};
const LOCK_DURATION_MS = 180000;
const LOCK_RECOVERY_MS = 120000;
const LOCK_HEARTBEAT_MS = 60000;
const FIREBASE_CONNECTION_CHECK_MS = 120000;
const HOME_AFTER_INACTIVITY_MS = 15 * 60 * 1000;
const COMPETITION_INACTIVITY_MS = 60 * 60 * 1000;
const COMPETITION_INACTIVITY_CHECK_MS = 60 * 1000;
const PRESENCE_DURATION_MS = 5 * 60 * 1000;
const PRESENCE_HEARTBEAT_MS = 2 * 60 * 1000;
const PRESENCE_WRITE_THROTTLE_MS = 90 * 1000;
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
const FIREBASE_FUNCTIONS_REGION = "europe-west1";
const LOCAL_FUNCTIONS_EMULATOR = (() => {
  const params = new URLSearchParams(window.location.search || "");
  const enabled = params.get("emulator") === "1" || params.get("functionsEmulator") === "1";
  return {
    enabled,
    host: params.get("functionsHost") || "127.0.0.1",
    port: Number(params.get("functionsPort") || 5001) || 5001
  };
})();
const PERFORMANCE_ADDITIONAL_DATA_URL = "https://storage.googleapis.com/livepalmes-public-data-718081132564/performance-public/additional-data.json";
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

  function configureFunctionsService(service) {
    if (!LOCAL_FUNCTIONS_EMULATOR.enabled || !service?.useEmulator || service.livePalmesEmulatorConfigured) return service;
    try {
      service.useEmulator(LOCAL_FUNCTIONS_EMULATOR.host, LOCAL_FUNCTIONS_EMULATOR.port);
      service.livePalmesEmulatorConfigured = true;
    } catch (error) {
      console.warn("Emulateur Functions LivePalmes indisponible", error);
    }
    return service;
  }

  window.LivePalmesAppConfig = {
    storageKey: STORAGE_KEY,
    alertsKey: ALERTS_KEY,
    liveDismissedAlertsKey: LIVE_DISMISSED_ALERTS_KEY,
    unlockedRolesKey: UNLOCKED_ROLES_KEY,
    clientIdKey: CLIENT_ID_KEY,
    activeViewKey: ACTIVE_VIEW_KEY,
    roleStatesKey: ROLE_STATES_KEY,
    lastActivityKey: LAST_ACTIVITY_KEY,
    firestoreCompetitionId: FIRESTORE_COMPETITION_ID,
    speakerSheetId: SPEAKER_SHEET_ID,
    adminPin: ADMIN_PIN,
    adminAuth: ADMIN_AUTH,
    rolePins: ROLE_PINS,
    lockDurationMs: LOCK_DURATION_MS,
    lockRecoveryMs: LOCK_RECOVERY_MS,
    lockHeartbeatMs: LOCK_HEARTBEAT_MS,
    firebaseConnectionCheckMs: FIREBASE_CONNECTION_CHECK_MS,
    homeAfterInactivityMs: HOME_AFTER_INACTIVITY_MS,
    competitionInactivityMs: COMPETITION_INACTIVITY_MS,
    competitionInactivityCheckMs: COMPETITION_INACTIVITY_CHECK_MS,
    presenceDurationMs: PRESENCE_DURATION_MS,
    presenceHeartbeatMs: PRESENCE_HEARTBEAT_MS,
    presenceWriteThrottleMs: PRESENCE_WRITE_THROTTLE_MS,
    speakerInfoSheets: SPEAKER_INFO_SHEETS,
    firebaseConfig: FIREBASE_CONFIG,
    firebaseFunctionsRegion: FIREBASE_FUNCTIONS_REGION,
    localFunctionsEmulator: LOCAL_FUNCTIONS_EMULATOR,
    configureFunctionsService,
    performanceAdditionalDataUrl: PERFORMANCE_ADDITIONAL_DATA_URL,
    fallbackData
  };
}());
