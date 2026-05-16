const FIRESTORE_COMPETITION_ID = "livepalmes-active";
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC4sh5R8eU9SAnEsqyji6aJKnpUGgbE-AM",
  authDomain: "livepalmes.firebaseapp.com",
  projectId: "livepalmes",
  storageBucket: "livepalmes.firebasestorage.app",
  messagingSenderId: "718081132564",
  appId: "1:718081132564:web:618d1e95b6d6aefa4ebf01"
};

const list = document.querySelector("#publicResultsList");
const statusBadge = document.querySelector("#publicResultsStatus");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setStatus(label, className = "pending") {
  if (!statusBadge) return;
  statusBadge.className = `firebase-header-status ${className}`;
  statusBadge.innerHTML = `<i class="firebase-dot ${className}" aria-hidden="true"></i>${escapeHtml(label)}`;
}

function finalistName(row) {
  return [row.displayName, row.birthYear ? `(${row.birthYear})` : "", row.club].filter(Boolean).join(" ");
}

function renderFinalists(title, rows) {
  if (!rows?.length) return "";
  return `
    <div class="public-finalists-block">
      <h3>${escapeHtml(title)}</h3>
      <ol>
        ${rows.map((row) => `
          <li>
            <strong>${escapeHtml(finalistName(row))}</strong>
            <span>${escapeHtml(row.time || "")}</span>
          </li>
        `).join("")}
      </ol>
    </div>
  `;
}

function renderResult(result) {
  const title = `${result.eventLabel || result.eventId || "Course"} ${result.sexLabel || result.sex || ""}`;
  const finalistCount = (result.finalists?.a?.length || 0) + (result.finalists?.b?.length || 0);
  const updated = result.updatedAt ? new Date(result.updatedAt).toLocaleString("fr-FR") : "";
  return `
    <article class="public-result-card">
      <div class="public-result-head">
        <div>
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml([result.session ? `Session ${result.session}` : "", result.startTime || "", updated].filter(Boolean).join(" - "))}</p>
        </div>
        <a class="ghost-button compact confirm-button" href="resultat-pdf.html?id=${encodeURIComponent(result.id || "")}" target="_blank" rel="noopener">PDF</a>
      </div>
      ${result.hasFinal ? `
        <div class="public-finalists-summary">
          <strong>${escapeHtml(String(finalistCount))} finaliste${finalistCount > 1 ? "s" : ""} détecté${finalistCount > 1 ? "s" : ""}</strong>
          <span>Délai forfaits : en attente de l'annonce officielle speaker.</span>
        </div>
        <div class="public-finalists-grid">
          ${renderFinalists("Finale A", result.finalists?.a || [])}
          ${renderFinalists("Finale B", result.finalists?.b || [])}
        </div>
      ` : `<p class="panel-subtitle">Résultat publié sans finale.</p>`}
    </article>
  `;
}

function renderResults(results) {
  if (!list) return;
  if (!results.length) {
    list.innerHTML = `<p class="panel-subtitle">Aucun résultat publié pour le moment.</p>`;
    return;
  }
  list.innerHTML = results.map(renderResult).join("");
}

function init() {
  if (!window.firebase?.initializeApp || !window.firebase?.firestore) {
    setStatus("Local", "pending");
    if (list) list.innerHTML = `<p class="panel-subtitle">Firebase n'est pas disponible sur cette page.</p>`;
    return;
  }
  window.firebase.initializeApp(FIREBASE_CONFIG);
  const db = window.firebase.firestore();
  db.collection("competitions")
    .doc(FIRESTORE_COMPETITION_ID)
    .collection("results")
    .orderBy("updatedAt", "desc")
    .onSnapshot((snapshot) => {
      setStatus("Connecté", "ok");
      renderResults(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.warn("Lecture résultats impossible", error);
      setStatus("Erreur", "error");
      if (list) list.innerHTML = `<p class="panel-subtitle">Impossible de charger les résultats.</p>`;
    });
}

init();
