const FIRESTORE_COMPETITION_ID = "livepalmes-active";
const PUBLIC_RESULTS_UNLOCK_KEY = "livepalmes:public-results-unlocked:v1";
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC4sh5R8eU9SAnEsqyji6aJKnpUGgbE-AM",
  authDomain: "livepalmes.firebaseapp.com",
  projectId: "livepalmes",
  storageBucket: "livepalmes.firebasestorage.app",
  messagingSenderId: "718081132564",
  appId: "1:718081132564:web:618d1e95b6d6aefa4ebf01"
};

const meetTitle = document.querySelector("#publicMeetTitle");
const meetMeta = document.querySelector("#publicMeetMeta");
const list = document.querySelector("#publicResultsList");
const sessionControls = document.querySelector("#publicSessionControls");
const statusBadge = document.querySelector("#publicResultsStatus");
const collapseDetailsBtn = document.querySelector("#collapsePublicDetailsBtn");
const refreshResultsBtn = document.querySelector("#refreshPublicResultsBtn");

let publicProgram = [];
let publicEvents = [];
let publicSeries = [];
let publicMeet = {};
let publicResults = [];
let publicSeriesPdfs = [];
let publicSessionResultsPdfs = [];
let publicAccess = { locked: false, pin: "", updatedAt: "" };
let publicIndexUpdatedAt = "";
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

function formatPersonNameParts(firstName, lastName, fallback = "") {
  const last = cleanText(lastName).trim().toLocaleUpperCase("fr-FR");
  const first = cleanText(firstName).trim();
  return [last, first].filter(Boolean).join(" ").trim() || cleanText(fallback);
}

function setStatus(label, className = "pending") {
  if (!statusBadge) return;
  if (className === "ok") {
    statusBadge.hidden = true;
    statusBadge.innerHTML = "";
    return;
  }
  statusBadge.hidden = false;
  statusBadge.className = `firebase-header-status ${className}`;
  statusBadge.innerHTML = `<i class="firebase-dot ${className}" aria-hidden="true"></i>${escapeHtml(label)}`;
}

function publicUnlockToken() {
  return publicAccess?.pin ? `pin:${publicAccess.pin}:${publicAccess.updatedAt || ""}` : "open";
}

function publicResultsUnlocked() {
  return !publicAccess?.locked || localStorage.getItem(PUBLIC_RESULTS_UNLOCK_KEY) === publicUnlockToken();
}

function renderPublicLock(error = "") {
  renderMeetTitle();
  if (sessionControls) sessionControls.innerHTML = "";
  if (collapseDetailsBtn) collapseDetailsBtn.hidden = true;
  if (!list) return;
  list.innerHTML = `
    <div class="public-lock-panel">
      <div>
        <h2>Accès protégé</h2>
        <p class="panel-subtitle">Entre le code communiqué par l'organisation pour consulter les résultats.</p>
      </div>
      <form class="public-lock-form" id="publicLockForm">
        <input id="publicLockInput" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off" placeholder="Code">
        <button class="primary-button" type="submit">Ouvrir</button>
      </form>
      ${error ? `<p class="public-lock-error">${escapeHtml(error)}</p>` : ""}
    </div>
  `;
  list.querySelector("#publicLockInput")?.focus();
}

function ensurePublicAccess() {
  if (!publicAccess?.locked) {
    if (collapseDetailsBtn) collapseDetailsBtn.hidden = false;
    return true;
  }
  if (publicResultsUnlocked()) {
    if (collapseDetailsBtn) collapseDetailsBtn.hidden = false;
    return true;
  }
  setStatus("Accès protégé", "pending");
  renderPublicLock();
  return false;
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
  const exact = publicResults.find((result) => result.programKey === programKey(row));
  if (exact) return exact;
  if (isFinalStage(row.stage)) return null;
  return publicResults.find((result) => result.raceKey === key && !isFinalStage(result.stage)) || null;
}

function isFinalStage(stage) {
  const value = String(stage || "");
  return value === "finalA" || value === "finalB" || value.startsWith("finale");
}

function isLastProgramPartForRace(row) {
  const rows = publicProgram
    .filter((item) => item.eventId === row.eventId && item.sex === row.sex && !isFinalStage(item.stage))
    .sort((a, b) => Number(a.session || 0) - Number(b.session || 0) || Number(a.order || 9999) - Number(b.order || 9999));
  if (!rows.length) return true;
  return programKey(rows[rows.length - 1]) === programKey(row);
}

function raceProgramRows(eventId, sex) {
  return publicProgram
    .filter((row) => row.eventId === eventId && row.sex === sex)
    .sort((a, b) => Number(a.session || 0) - Number(b.session || 0) || Number(a.order || 9999) - Number(b.order || 9999));
}

function finalProgramRows(eventId, sex) {
  const seen = new Set();
  return raceProgramRows(eventId, sex)
    .filter((row) => isFinalStage(row.stage))
    .filter((row) => {
      const key = row.stage || programKey(row);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function seriesNumbersForRace(row) {
  const rows = publicSeries
    .filter((item) => item.eventId === row.eventId && item.sex === row.sex)
    .filter((item) => !isFinalStage(item.stage))
    .filter((item) => !row.session || !item.session || item.session === row.session);
  return [...new Set(rows.map((item) => Number(item.series)).filter(Number.isFinite))].sort((a, b) => a - b);
}

function publicRacePhaseLabel(row) {
  const finals = finalProgramRows(row.eventId, row.sex);
  if (isFinalStage(row.stage)) {
    return `${finals.length || 1} finale${(finals.length || 1) > 1 ? "s" : ""}`;
  }
  const regularRows = raceProgramRows(row.eventId, row.sex).filter((item) => !isFinalStage(item.stage));
  const hasSplitSeries = regularRows.length > 1;
  const seriesNumbers = seriesNumbersForRace(row);
  if (!finals.length && hasSplitSeries && isLastProgramPartForRace(row)) {
    return "meilleure série";
  }
  const count = seriesNumbers.length || regularRows.length || 1;
  return `${count} série${count > 1 ? "s" : ""}`;
}

function rowsForSession(session) {
  const seenRegular = new Set();
  const seenFinals = new Set();
  const sortedRows = publicProgram
    .filter((row) => row.session === session && row.eventId && row.sex)
    .sort((a, b) => Number(a.order || 9999) - Number(b.order || 9999));
  const rows = [];
  sortedRows.forEach((row) => {
      if (isFinalStage(row.stage)) {
        const finalKey = `${row.session || ""}|${row.eventId}|${row.sex}|finales`;
        if (seenFinals.has(finalKey)) return;
        seenFinals.add(finalKey);
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
      const key = raceKey(row.eventId, row.sex);
      if (!isLastProgramPartForRace(row) && !resultForRow(row)) {
        rows.push(row);
        return;
      }
      if (seenRegular.has(key)) return;
      seenRegular.add(key);
      rows.push(row);
    });
  return rows;
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
  const name = formatPersonNameParts(row.firstName, row.lastName, row.displayName);
  return [name, row.birthYear ? `(${row.birthYear})` : "", row.club].filter(Boolean).join(" ");
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

function formatDeadlineTime(date) {
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", "h");
}

function finalistAnnouncedAt(row, result) {
  if (row?.repechaged) return row.repechageAnnouncedAt || "";
  return row?.announcedAt || result?.finalistsAnnouncedAt || "";
}

function finalistWithdrawalLabel(row, result) {
  if (row?.withdrawnAt) return "";
  const announcedAt = finalistAnnouncedAt(row, result);
  if (!announcedAt) return row?.repechaged ? "forfait possible après annonce speaker" : "";
  const limit = new Date(new Date(announcedAt).getTime() + 30 * 60 * 1000);
  if (Number.isNaN(limit.getTime())) return "";
  if (new Date() > limit) return "forfait fermé";
  return `forfait possible jusqu'à ${formatDeadlineTime(limit)}`;
}

function publicResultStatusFromText(value) {
  const text = cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (/\b(forfait|absent|abs|dns|ns)\b/.test(text)) return "forfait";
  if (/\b(abandon|abd|dnf)\b/.test(text)) return "abandon";
  if (/\b(disqualification|disqualifie|disqualifiee|dsq|dq)\b/.test(text)) return "disqualification";
  return "";
}

function publicFinalRowCountsAsFinalist(row) {
  if (!row || row.withdrawnAt || row.resultStatus) return false;
  return !publicResultStatusFromText([row.statusLabel, row.status, row.motif, row.note].filter(Boolean).join(" "));
}

function renderFinalistRows(title, rows, result) {
  if (!rows?.length) return "";
  return `
    <div class="public-finalists-block">
      <strong class="public-finalists-title">${escapeHtml(title)}</strong>
      <ol>
        ${rows.map((row) => {
          const withdrawalLabel = finalistWithdrawalLabel(row, result);
          return `
          <li value="${escapeHtml(row.rank || "")}" class="${row.withdrawnAt ? "public-finalist-withdrawn" : ""}">
            <strong>${escapeHtml(finalistName(row))}</strong>
            <span>${escapeHtml(row.time || "")}${withdrawalLabel ? ` <small>${escapeHtml(withdrawalLabel)}</small>` : ""}</span>
            ${row.withdrawnAt ? `<mark class="public-finalist-badge withdrawn">Forfait</mark>` : ""}
            ${row.repechaged && !row.withdrawnAt ? `<mark class="public-finalist-badge repechaged">Repêché${result?.sex === "F" ? "e" : ""}</mark>` : ""}
          </li>
        `;
        }).join("")}
      </ol>
    </div>
  `;
}

function renderNextUnqualified(rows) {
  if (!rows?.length) return "";
  const renderRows = (items) => items.map((row) => `
    <li ${row.rank ? `value="${escapeHtml(row.rank)}"` : ""} class="${row.resultStatus ? "public-result-status-row" : ""}">
      <strong>${escapeHtml(finalistName(row))}</strong>
      <span>${escapeHtml(row.time || row.statusLabel || "")}</span>
    </li>
  `).join("");
  return `
    <details class="public-unqualified-block">
      <summary>Non qualifiés suivants</summary>
      <ol>
        ${renderRows(rows)}
      </ol>
    </details>
  `;
}

function renderResultDetails(result) {
  if (!result) return "";
  const publicFinalistsVisible = !result.hasFinal || result.finalistsAnnouncedAt;
  const finalists = {
    a: sortedFinalRows(result.finalists?.a || []),
    b: sortedFinalRows(result.finalists?.b || [])
  };
  const finalistCount = ["a", "b"].reduce((count, key) => count + (finalists[key] || []).filter(publicFinalRowCountsAsFinalist).length, 0);
  const finalistKeys = new Set(["a", "b"].flatMap((key) => (finalists[key] || []).map((row) =>
    [row.rank, cleanText(row.displayName || finalistName(row)), row.time].filter(Boolean).join("|")
  )));
  const finalistNames = new Set(["a", "b"].flatMap((key) => (finalists[key] || []).map((row) =>
    cleanText(row.displayName || finalistName(row))
  )).filter(Boolean));
  const baseNextUnqualified = result.nextUnqualified?.length > 8
    ? result.nextUnqualified
    : (result.ranking || []).filter((row) => !row.qualified);
  const nextUnqualified = (baseNextUnqualified || []).filter((row) =>
    !finalistKeys.has([row.rank, cleanText(row.displayName || finalistName(row)), row.time].filter(Boolean).join("|")) &&
    !finalistNames.has(cleanText(row.displayName || finalistName(row)))
  );
  return `
    ${publicFinalistsVisible ? `
      <div class="public-result-actions">
        <a class="ghost-button compact confirm-button" href="pdf.html?type=resultat&id=${encodeURIComponent(result.id || "")}" target="_blank" rel="noopener">Voir</a>
      </div>
    ` : ""}
    ${result.hasFinal && publicFinalistsVisible ? `
      <div class="public-finalists-summary">
        <strong>${escapeHtml(String(finalistCount))} finaliste${finalistCount > 1 ? "s" : ""} détecté${finalistCount > 1 ? "s" : ""}</strong>
      </div>
      <details class="public-finalists-group">
        <summary>${(finalists.b || []).length ? "Finales A et B" : "Finale A"}</summary>
        <div class="public-finalists-grid">
          ${renderFinalistRows("Finale A", finalists.a || [], result)}
          ${renderFinalistRows("Finale B", finalists.b || [], result)}
        </div>
      </details>
      ${renderNextUnqualified(nextUnqualified || [])}
    ` : ""}
  `;
}

function renderRow(row) {
  const result = resultForRow(row);
  const status = resultStatus(row, result);
  const hideResultMeta = result?.hasFinal && !result.finalistsAnnouncedAt;
  const updated = !hideResultMeta && result?.updatedAt ? `Mis à jour le ${new Date(result.updatedAt).toLocaleString("fr-FR")}` : "";
  const sexClass = row.sex === "F" ? "sex-female" : (row.sex === "M" ? "sex-male" : "sex-mixed");
  return `
    <article class="public-result-card ${result ? "published" : "not-published"} ${sexClass}">
      <div class="public-result-head">
        <div>
          <h2>${escapeHtml(eventLabel(row.eventId, row.label))} <span class="public-sex-label">${escapeHtml(sexLabel(row.sex))}</span> <span class="public-phase-label">${escapeHtml(publicRacePhaseLabel(row))}</span></h2>
          ${updated ? `<p class="public-update-meta">${escapeHtml(updated)}</p>` : ""}
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

function seriesPdfForSession(session) {
  const exact = publicSeriesPdfs.find((pdf) => pdf.scope === "session" && String(pdf.session || "") === String(session || ""));
  return exact || publicSeriesPdfs.find((pdf) => pdf.scope === "full") || null;
}

function sessionResultsPdfsForSession(session) {
  return publicSessionResultsPdfs
    .filter((pdf) => pdf.scope === "full" || (pdf.sessions || []).map(String).includes(String(session || "")) || String(pdf.session || "") === String(session || ""))
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
}

function renderSeriesPdfLink(session) {
  const pdf = seriesPdfForSession(session);
  if (!pdf) return "";
  const label = pdf.scope === "session" ? `Séries de la session ${session}` : "Séries complètes";
  const updated = pdf.updatedAt ? `Mis à jour le ${new Date(pdf.updatedAt).toLocaleString("fr-FR")}` : "";
  return `
    <div class="public-series-pdf">
      <div>
        <strong>${escapeHtml(label)}</strong>
        ${updated ? `<span>${escapeHtml(updated)}</span>` : ""}
      </div>
      <a class="ghost-button compact confirm-button" href="pdf.html?type=series&id=${encodeURIComponent(pdf.id || "")}" target="_blank" rel="noopener">Voir les séries</a>
    </div>
  `;
}

function renderSessionResultsPdfLinks(session) {
  const pdfs = sessionResultsPdfsForSession(session);
  if (!pdfs.length) return "";
  return `
    <div class="public-series-pdf public-session-results-pdf">
      <div>
        <strong>Résultats complets</strong>
        <span>${escapeHtml(pdfs.length > 1 ? `${pdfs.length} PDF disponibles` : (pdfs[0].sourceLabel || "PDF de consultation"))}</span>
      </div>
      <div class="public-pdf-link-actions">
        ${pdfs.map((pdf) => `
          <a class="ghost-button compact confirm-button" href="pdf.html?type=session-result&id=${encodeURIComponent(pdf.id || "")}" target="_blank" rel="noopener">
            ${escapeHtml(pdfs.length > 1 ? (pdf.sourceLabel || "Voir") : "Voir")}
          </a>
        `).join("")}
      </div>
    </div>
  `;
}

function renderMeetTitle() {
  if (!meetTitle) return;
  const name = cleanText(publicMeet.name || "");
  const city = cleanText(publicMeet.city || "");
  const year = cleanText(publicMeet.year || "");
  const titleParts = [name, city].filter(Boolean);
  if (year && !titleParts.some((part) => new RegExp(`\\b${year}\\b`).test(part))) {
    titleParts.push(year);
  }
  const title = titleParts.join(" - ");
  meetTitle.textContent = cleanText(title || "Résultats & finalistes");
  if (meetMeta) {
    const lastUpdate = publicIndexUpdatedAt || publicResults
      .map((result) => result.updatedAt)
      .filter(Boolean)
      .sort()
      .at(-1);
    meetMeta.textContent = lastUpdate
      ? `Mis à jour le ${new Date(lastUpdate).toLocaleString("fr-FR")}`
      : "En attente de publication des premiers résultats";
  }
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
    ${renderSeriesPdfLink(activeSession)}
    ${renderSessionResultsPdfLinks(activeSession)}
    ${rows.map(renderRow).join("")}
  `;
}

async function loadPublicSeriesPdfs(competition) {
  try {
    const snapshot = await competition.collection("seriesPdfs").get({ source: "server" });
    publicSeriesPdfs = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  } catch (error) {
    console.warn("Lecture PDF séries impossible", error);
    publicSeriesPdfs = [];
  }
}

async function loadPublicResultsIndex() {
  if (!window.firebase?.initializeApp || !window.firebase?.firestore) {
    setStatus("Local", "pending");
    if (list) list.innerHTML = `<p class="panel-subtitle">Firebase n'est pas disponible sur cette page.</p>`;
    return;
  }
  if (!window.firebase.apps?.length) {
    window.firebase.initializeApp(FIREBASE_CONFIG);
  }
  const db = window.firebase.firestore();
  const competition = db.collection("competitions").doc(FIRESTORE_COMPETITION_ID);
  const snapshot = await competition.collection("public").doc("resultsIndex").get({ source: "server" });
  const index = snapshot.data() || {};
  if (!snapshot.exists || !Array.isArray(index.program) || !index.program.length) {
    await loadPublicResultsFallback(competition);
    return;
  }
  publicMeet = index.meet || {};
  publicProgram = Array.isArray(index.program) ? index.program : [];
  publicEvents = Array.isArray(index.events) ? index.events : [];
  publicSeries = Array.isArray(index.series) ? index.series : [];
  publicResults = Array.isArray(index.results) ? index.results : [];
  publicAccess = index.publicAccess || { locked: false, pin: "" };
  publicIndexUpdatedAt = index.updatedAt || "";
  if (Array.isArray(index.seriesPdfs)) {
    publicSeriesPdfs = index.seriesPdfs
      .slice()
      .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  } else {
    await loadPublicSeriesPdfs(competition);
  }
  publicSessionResultsPdfs = Array.isArray(index.sessionResultsPdfs)
    ? index.sessionResultsPdfs
      .slice()
      .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
    : [];
  if (!ensurePublicAccess()) return;
  setStatus("Connecté", "ok");
  renderResults();
}

async function loadPublicResultsFallback(competition) {
  const [liveSnapshot, resultsSnapshot] = await Promise.all([
    competition.collection("liveData").doc("current").get({ source: "server" }),
    competition.collection("results").orderBy("updatedAt", "desc").get({ source: "server" })
  ]);
  const remote = liveSnapshot.data()?.data || {};
  publicMeet = remote.meet || {};
  publicProgram = Array.isArray(remote.program) ? remote.program : [];
  publicEvents = Array.isArray(remote.events) ? remote.events : [];
  publicSeries = Array.isArray(remote.series) ? remote.series : [];
  publicResults = resultsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  publicAccess = {
    locked: remote.notes?.publicResultsLocked === true,
    pin: remote.notes?.rolePins?.public || "0006",
    updatedAt: remote.notes?.publicResultsLockUpdatedAt || ""
  };
  await loadPublicSeriesPdfs(competition);
  publicSessionResultsPdfs = [];
  publicIndexUpdatedAt = publicResults
    .map((result) => result.updatedAt)
    .filter(Boolean)
    .sort()
    .at(-1) || "";
  if (!ensurePublicAccess()) return;
  setStatus("Connecté", "ok");
  renderResults();
}

function init() {
  loadPublicResultsIndex().catch((error) => {
    console.warn("Lecture index public impossible", error);
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

collapseDetailsBtn?.addEventListener("click", () => {
  document.querySelectorAll(".public-results-list details[open]").forEach((details) => {
    details.open = false;
  });
});

refreshResultsBtn?.addEventListener("click", () => {
  setStatus("Actualisation", "pending");
  loadPublicResultsIndex().catch((error) => {
    console.warn("Actualisation résultats impossible", error);
    setStatus("Erreur", "error");
  });
});

list?.addEventListener("submit", (event) => {
  const form = event.target.closest("#publicLockForm");
  if (!form) return;
  event.preventDefault();
  const code = String(form.querySelector("#publicLockInput")?.value || "").trim();
  if (code !== String(publicAccess?.pin || "")) {
    renderPublicLock("Code incorrect.");
    return;
  }
  localStorage.setItem(PUBLIC_RESULTS_UNLOCK_KEY, publicUnlockToken());
  setStatus("ConnectÃ©", "ok");
  renderResults();
});

init();
