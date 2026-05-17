const FIRESTORE_COMPETITION_ID = "livepalmes-active";
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC4sh5R8eU9SAnEsqyji6aJKnpUGgbE-AM",
  authDomain: "livepalmes.firebaseapp.com",
  projectId: "livepalmes",
  storageBucket: "livepalmes.firebasestorage.app",
  messagingSenderId: "718081132564",
  appId: "1:718081132564:web:618d1e95b6d6aefa4ebf01"
};

const meetTitle = document.querySelector("#publicMeetTitle");
const list = document.querySelector("#publicResultsList");
const sessionControls = document.querySelector("#publicSessionControls");
const statusBadge = document.querySelector("#publicResultsStatus");

let publicProgram = [];
let publicEvents = [];
let publicMeet = {};
let publicResults = [];
let activeSession = "";
let activeSessionChosen = false;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cleanText(value) {
  return String(value ?? "")
    .replaceAll("Ã©", "é")
    .replaceAll("Ã¨", "è")
    .replaceAll("Ãª", "ê")
    .replaceAll("Ã«", "ë")
    .replaceAll("Ã ", "à")
    .replaceAll("Ã¢", "â")
    .replaceAll("Ã¹", "ù")
    .replaceAll("Ã»", "û")
    .replaceAll("Ã®", "î")
    .replaceAll("Ã¯", "ï")
    .replaceAll("Ã´", "ô")
    .replaceAll("Ã§", "ç")
    .replace(/\bapn\s+e\b/gi, "apnée")
    .replace(/\br\s+sultats\b/gi, "résultats")
    .replace(/\bcomp\s+tition\b/gi, "compétition");
}

function setStatus(label, className = "pending") {
  if (!statusBadge) return;
  statusBadge.className = `firebase-header-status ${className}`;
  statusBadge.innerHTML = `<i class="firebase-dot ${className}" aria-hidden="true"></i>${escapeHtml(label)}`;
}

function raceKey(eventId, sex) {
  return `${eventId || ""}|${sex || ""}`;
}

function programKey(row) {
  return [row.order, row.session || "", row.eventId, row.sex, row.stage || "series"].join("|");
}

function sexLabel(sex) {
  if (sex === "F") return "Femmes";
  if (sex === "M") return "Hommes";
  return "Mixte";
}

function eventLabel(eventId, fallback = "") {
  return cleanText(publicEvents.find((event) => event.id === eventId)?.label || fallback || eventId || "Course");
}

function sessions() {
  return [...new Set(publicProgram.map((row) => row.session).filter(Boolean))]
    .sort((a, b) => Number(a) - Number(b));
}

function resultForRow(row) {
  const key = raceKey(row.eventId, row.sex);
  return publicResults.find((result) => result.raceKey === key) || null;
}

function isFinalStage(stage) {
  return ["finalA", "finalB"].includes(stage);
}

function isLastProgramPartForRace(row) {
  const rows = publicProgram
    .filter((item) => item.eventId === row.eventId && item.sex === row.sex && !isFinalStage(item.stage))
    .sort((a, b) => Number(a.session || 0) - Number(b.session || 0) || Number(a.order || 9999) - Number(b.order || 9999));
  if (!rows.length) return true;
  return programKey(rows[rows.length - 1]) === programKey(row);
}

function rowsForSession(session) {
  const seen = new Set();
  return publicProgram
    .filter((row) => row.session === session && row.eventId && row.sex && !isFinalStage(row.stage))
    .sort((a, b) => Number(a.order || 9999) - Number(b.order || 9999))
    .filter((row) => {
      const key = raceKey(row.eventId, row.sex);
      if (!isLastProgramPartForRace(row) && !resultForRow(row)) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function latestResultSession() {
  const latest = publicResults
    .filter((result) => result.session)
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))[0];
  return latest?.session || "";
}

function ensureActiveSession() {
  const available = sessions();
  if (!available.length) {
    activeSession = "";
    return;
  }
  if (!activeSessionChosen) {
    activeSession = latestResultSession() || available[0];
    return;
  }
  if (!available.includes(activeSession)) {
    activeSession = available[0];
  }
}

function resultStatus(row, result) {
  if (result) {
    if (result.hasFinal && !result.finalistsAnnouncedAt) return { label: "En attente annonce speaker", className: "pending" };
    if (result.isPartial) return { label: "Résultat partiel", className: "waiting" };
    return { label: "Résultat publié", className: "done" };
  }
  return { label: "Résultat non publié", className: "missing" };
}

function finalistName(row) {
  return [cleanText(row.displayName), row.birthYear ? `(${row.birthYear})` : "", row.club].filter(Boolean).join(" ");
}

function renderFinalists(title, rows) {
  if (!rows?.length) return "";
  return `
    <details class="public-finalists-block">
      <summary>${escapeHtml(title)}</summary>
      <ol>
        ${rows.map((row) => `
          <li value="${escapeHtml(row.rank || "")}">
            <strong>${escapeHtml(finalistName(row))}</strong>
            <span>${escapeHtml(row.time || "")}</span>
          </li>
        `).join("")}
      </ol>
    </details>
  `;
}

function renderNextUnqualified(rows) {
  if (!rows?.length) return "";
  const visibleRows = rows.slice(0, 8);
  const hiddenRows = rows.slice(8);
  const renderRows = (items) => items.map((row) => `
    <li value="${escapeHtml(row.rank || "")}">
      <strong>${escapeHtml(finalistName(row))}</strong>
      <span>${escapeHtml(row.time || "")}</span>
    </li>
  `).join("");
  return `
    <div class="public-unqualified-block">
      <h3>Non qualifiés suivants</h3>
      <ol>
        ${renderRows(visibleRows)}
      </ol>
      ${hiddenRows.length ? `
        <details class="public-unqualified-more">
          <summary>Voir la suite jusqu'au dernier</summary>
          <ol>
            ${renderRows(hiddenRows)}
          </ol>
        </details>
      ` : ""}
    </div>
  `;
}

function renderResultDetails(result) {
  if (!result) return "";
  const publicFinalistsVisible = !result.hasFinal || result.finalistsAnnouncedAt;
  const finalistCount = (result.finalists?.a?.length || 0) + (result.finalists?.b?.length || 0);
  const withdrawalLimit = result.finalistsAnnouncedAt
    ? new Date(new Date(result.finalistsAnnouncedAt).getTime() + 30 * 60 * 1000)
    : null;
  const withdrawalLimitLabel = withdrawalLimit && !Number.isNaN(withdrawalLimit.getTime())
    ? withdrawalLimit.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : "";
  const nextUnqualified = result.nextUnqualified?.length > 8
    ? result.nextUnqualified
    : (result.ranking || []).filter((row) => !row.qualified);
  return `
    ${publicFinalistsVisible ? `
      <div class="public-result-actions">
        <a class="ghost-button compact confirm-button" href="resultat-pdf.html?id=${encodeURIComponent(result.id || "")}" target="_blank" rel="noopener">PDF</a>
      </div>
    ` : ""}
    ${result.hasFinal && publicFinalistsVisible ? `
      <div class="public-finalists-summary">
        <strong>${escapeHtml(String(finalistCount))} finaliste${finalistCount > 1 ? "s" : ""} détecté${finalistCount > 1 ? "s" : ""}</strong>
        <span class="withdrawal-limit">Forfait possible jusqu'à : ${escapeHtml(withdrawalLimitLabel || "en attente")}</span>
      </div>
      <div class="public-finalists-grid">
        ${renderFinalists("Finale A", result.finalists?.a || [])}
        ${renderFinalists("Finale B", result.finalists?.b || [])}
      </div>
      ${renderNextUnqualified(nextUnqualified || [])}
    ` : ""}
  `;
}

function renderRow(row) {
  const result = resultForRow(row);
  const status = resultStatus(row, result);
  const hideResultMeta = result?.hasFinal && !result.finalistsAnnouncedAt;
  const updated = !hideResultMeta && result?.updatedAt ? new Date(result.updatedAt).toLocaleString("fr-FR") : "";
  const sexClass = row.sex === "F" ? "sex-female" : (row.sex === "M" ? "sex-male" : "sex-mixed");
  return `
    <article class="public-result-card ${result ? "published" : "not-published"} ${sexClass}">
      <div class="public-result-head">
        <div>
          <h2>${escapeHtml(eventLabel(row.eventId, row.label))} <span class="public-sex-label">${escapeHtml(sexLabel(row.sex))}</span></h2>
          <p>${escapeHtml([row.startTime || "", updated].filter(Boolean).join(" - "))}</p>
        </div>
        <span class="public-result-status ${status.className}">${escapeHtml(status.label)}</span>
      </div>
      ${renderResultDetails(result)}
    </article>
  `;
}

function renderSessionControls() {
  if (!sessionControls) return;
  const available = sessions();
  sessionControls.innerHTML = available.map((session) => `
    <button class="session-chip ${session === activeSession ? "active" : ""}" type="button" data-public-session="${escapeHtml(session)}">S${escapeHtml(session)}</button>
  `).join("");
}

function renderMeetTitle() {
  if (!meetTitle) return;
  const title = [publicMeet.name, publicMeet.city, publicMeet.year].filter(Boolean).join(" - ");
  meetTitle.textContent = cleanText(title || "Résultats & finalistes");
}

function renderResults() {
  if (!list) return;
  ensureActiveSession();
  renderMeetTitle();
  renderSessionControls();
  const rows = rowsForSession(activeSession);
  if (!rows.length) {
    list.innerHTML = `<p class="panel-subtitle">Aucune course trouvée pour cette session.</p>`;
    return;
  }
  list.innerHTML = `
    <div class="public-session-title">
      <h2>Session ${escapeHtml(activeSession)}</h2>
      <span>${escapeHtml(String(rows.length))} course${rows.length > 1 ? "s" : ""}</span>
    </div>
    ${rows.map(renderRow).join("")}
  `;
}

function init() {
  if (!window.firebase?.initializeApp || !window.firebase?.firestore) {
    setStatus("Local", "pending");
    if (list) list.innerHTML = `<p class="panel-subtitle">Firebase n'est pas disponible sur cette page.</p>`;
    return;
  }
  window.firebase.initializeApp(FIREBASE_CONFIG);
  const db = window.firebase.firestore();
  const competition = db.collection("competitions").doc(FIRESTORE_COMPETITION_ID);
  competition.collection("liveData").doc("current").onSnapshot((snapshot) => {
    const remote = snapshot.data()?.data || {};
    publicMeet = remote.meet || {};
    publicProgram = Array.isArray(remote.program) ? remote.program : [];
    publicEvents = Array.isArray(remote.events) ? remote.events : [];
    setStatus("Connecté", "ok");
    renderResults();
  }, (error) => {
    console.warn("Lecture programme impossible", error);
    setStatus("Erreur", "error");
  });
  competition.collection("results").orderBy("updatedAt", "desc").onSnapshot((snapshot) => {
    publicResults = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setStatus("Connecté", "ok");
    renderResults();
  }, (error) => {
    console.warn("Lecture résultats impossible", error);
    setStatus("Erreur", "error");
    if (list) list.innerHTML = `<p class="panel-subtitle">Impossible de charger les résultats.</p>`;
  });
}

sessionControls?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-public-session]");
  if (!button) return;
  activeSession = button.dataset.publicSession;
  activeSessionChosen = true;
  renderResults();
});

init();
