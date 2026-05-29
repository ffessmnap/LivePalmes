const FIRESTORE_COMPETITION_ID = "livepalmes-active";
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC4sh5R8eU9SAnEsqyji6aJKnpUGgbE-AM",
  authDomain: "livepalmes.firebaseapp.com",
  projectId: "livepalmes",
  storageBucket: "livepalmes.firebasestorage.app",
  messagingSenderId: "718081132564",
  appId: "1:718081132564:web:618d1e95b6d6aefa4ebf01"
};

const meetMeta = document.querySelector("#publicHomeMeetMeta");
const currentMeet = document.querySelector("#publicHomeCurrentMeet");

function meetLabel(meet = {}) {
  return [meet.name, meet.city, meet.year].filter(Boolean).join(" - ");
}

function setHomeMeet(label, detail = "") {
  if (meetMeta) meetMeta.textContent = "Live, r\u00e9sultats, performances et archives";
  if (currentMeet) currentMeet.textContent = detail || label || "Aucune comp\u00e9tition en direct pour le moment";
}

async function loadPublicHome() {
  if (!window.firebase?.apps?.length) window.firebase.initializeApp(FIREBASE_CONFIG);
  const db = window.firebase.firestore();
  const base = db.collection("competitions").doc(FIRESTORE_COMPETITION_ID);
  const [liveSnapshot, resultsSnapshot] = await Promise.allSettled([
    base.collection("liveData").doc("current").get(),
    base.collection("public").doc("resultsIndex").get()
  ]);
  const liveData = liveSnapshot.status === "fulfilled" && liveSnapshot.value.exists
    ? liveSnapshot.value.data()?.data || {}
    : {};
  const resultsData = resultsSnapshot.status === "fulfilled" && resultsSnapshot.value.exists
    ? resultsSnapshot.value.data() || {}
    : {};
  const meet = resultsData.meet || liveData.meet || {};
  const label = meetLabel(meet);
  const resultCount = Array.isArray(resultsData.results) ? resultsData.results.length : 0;
  const fallback = "Comp\u00e9tition en direct";
  const detail = resultCount
    ? `${label || fallback} - ${resultCount} r\u00e9sultat${resultCount > 1 ? "s" : ""} publi\u00e9${resultCount > 1 ? "s" : ""}`
    : (label || fallback);
  setHomeMeet(label, detail);
}

loadPublicHome().catch(() => {
  setHomeMeet("Comp\u00e9tition en direct", "Live comp\u00e9tition, r\u00e9sultats et s\u00e9ries publiques.");
});
