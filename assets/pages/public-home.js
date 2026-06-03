const FIRESTORE_COMPETITION_ID = "livepalmes-active";
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC4sh5R8eU9SAnEsqyji6aJKnpUGgbE-AM",
  authDomain: "livepalmes.firebaseapp.com",
  projectId: "livepalmes",
  storageBucket: "livepalmes.firebasestorage.app",
  messagingSenderId: "718081132564",
  appId: "1:718081132564:web:618d1e95b6d6aefa4ebf01"
};

const currentMeet = document.querySelector("#publicHomeCurrentMeet");
const liveStatus = document.querySelector("#publicHomeLiveStatus");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function meetLabel(meet = {}) {
  return [meet.name, meet.city, meet.year].filter(Boolean).join(" - ");
}

function setHomeMeet(label, detail = "") {
  if (liveStatus) {
    liveStatus.textContent = label ? "En direct" : "Ouvert";
    liveStatus.classList.toggle("live", Boolean(label));
    liveStatus.classList.toggle("available", !label);
  }
  if (!currentMeet) return;
  const title = label || "Aucune comp\u00e9tition en direct pour le moment";
  const extra = detail && detail !== label ? detail.replace(label, "").replace(/^\s*-\s*/, "") : "";
  currentMeet.innerHTML = `
    <span>Comp\u00e9tition en cours</span>
    <strong>${escapeHtml(title)}</strong>
    ${extra ? `<em>${escapeHtml(extra)}</em>` : ""}
  `;
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
