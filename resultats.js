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
const meetMeta = document.querySelector("#publicMeetMeta");
const list = document.querySelector("#publicResultsList");
const sessionControls = document.querySelector("#publicSessionControls");
const sessionSelect = document.querySelector("#publicResultsSessionSelect");
const sessionMeta = document.querySelector("#publicResultsSessionMeta");
const sessionInfoHost = document.querySelector("#publicSessionInfoHost");
const statusBadge = document.querySelector("#publicResultsStatus");
const collapseDetailsBtn = document.querySelector("#collapsePublicDetailsBtn");
const refreshResultsBtn = document.querySelector("#refreshPublicResultsBtn");
const refreshResultsFloatBtn = document.querySelector("#refreshPublicResultsFloatBtn");
const swimmerSheet = document.querySelector("#publicSwimmerSheet");

let publicProgram = [];
let publicEvents = [];
let publicEntrants = [];
let publicSeries = [];
let publicMeet = {};
let publicResults = [];
let publicSeriesPdfs = [];
let publicSessionResultsPdfs = [];
let publicSessionInfos = {};
let publicAccess = { online: true, updatedAt: "" };
let publicIndexUpdatedAt = "";
let activeSession = "";
let activeSessionChosen = false;
let swimmerSearchQuery = "";
let selectedSearchSwimmerKey = "";
let activeSheetSwimmerKey = "";
const directResultSessionsLoaded = new Set();
const swimmerResultDetailsLoading = new Set();

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

function normalizeText(value) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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

function renderPublicOffline() {
  renderMeetTitle();
  if (sessionControls) sessionControls.innerHTML = "";
  if (collapseDetailsBtn) collapseDetailsBtn.hidden = true;
  if (!list) return;
  list.innerHTML = `
    <div class="public-lock-panel">
      <div>
        <h2>Résultats temporairement hors ligne</h2>
        <p class="panel-subtitle">La page publique des résultats n'est pas ouverte pour le moment.</p>
      </div>
    </div>
  `;
}

function ensurePublicAccess() {
  if (publicAccess?.online === false) {
    setStatus("Hors ligne", "pending");
    renderPublicOffline();
    return false;
  }
  updateCollapseDetailsButton();
  return true;
}

function updateCollapseDetailsButton() {
  if (!collapseDetailsBtn || !list) return;
  collapseDetailsBtn.hidden = !list.querySelector("details[open]");
}

function applyPublicAccessFromLiveData(remote) {
  if (!remote?.notes || !Object.prototype.hasOwnProperty.call(remote.notes, "publicResultsOnline")) return;
  publicAccess = {
    online: remote.notes.publicResultsOnline !== false,
    updatedAt: remote.notes.publicResultsOnlineUpdatedAt || publicAccess.updatedAt || ""
  };
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

function sameCategory(a, b) {
  return normalizeText(a) === normalizeText(b);
}

function categoryLabel(category, sex) {
  if (sameCategory(category, "Cadet")) return sex === "F" ? "Cadette" : "Cadet";
  if (sameCategory(category, "Junior")) return "Junior";
  if (sameCategory(category, "Senior")) return "Senior";
  return cleanText(category || "");
}

function categoryClass(category) {
  if (sameCategory(category, "Cadet")) return "cat-cadet";
  if (sameCategory(category, "Junior")) return "cat-junior";
  if (sameCategory(category, "Senior")) return "cat-senior";
  return "cat-other";
}

function swimmerCategoryBirthHtml(row) {
  const category = categoryLabel(row.category, row.sex);
  const birthYear = birthYearLabel(row);
  if (!category && !birthYear) return "-";
  return [
    category ? `<span class="public-swimmer-category ${categoryClass(row.category)}">${escapeHtml(category)}</span>` : "",
    birthYear ? `<span class="public-swimmer-birth">· ${escapeHtml(birthYear)}</span>` : ""
  ].filter(Boolean).join("");
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

function isRelayRow(row) {
  return /^4x/i.test(String(row?.eventId || row?.label || ""));
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
    .filter((result) => result.session && resultIsVisible(result))
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
  return { label: "En attente du résultat", className: "missing" };
}

function formatPublicDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function resultsForRows(rows = []) {
  const seen = new Set();
  return rows
    .map((row) => resultForRow(row))
    .filter(Boolean)
    .filter((result) => {
      const key = result.id || result.programKey || result.raceKey || `${result.eventId || ""}|${result.sex || ""}|${result.updatedAt || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function resultIsVisible(result) {
  return Boolean(result && (!result.hasFinal || result.finalistsAnnouncedAt));
}

function resultHasDetails(result) {
  return Boolean(result && (
    (Array.isArray(result.ranking) && result.ranking.length) ||
    (Array.isArray(result.performances) && result.performances.length) ||
    (Array.isArray(result.nextUnqualified) && result.nextUnqualified.length) ||
    (Array.isArray(result.finalists?.a) && result.finalists.a.length) ||
    (Array.isArray(result.finalists?.b) && result.finalists.b.length)
  ));
}

function publicResultFromDoc(doc) {
  const result = { id: doc.id, ...doc.data() };
  delete result.pdfDataUrl;
  return result;
}

function publicCompetitionDocument() {
  if (!window.firebase?.initializeApp || !window.firebase?.firestore) return null;
  if (!window.firebase.apps?.length) {
    window.firebase.initializeApp(FIREBASE_CONFIG);
  }
  return window.firebase.firestore().collection("competitions").doc(FIRESTORE_COMPETITION_ID);
}

function comparableEventId(value) {
  return normalizeText(value).replace(/\s+/g, "");
}

function eventSignature(value) {
  const text = comparableEventId(value);
  const distance = (text.match(/\d+x?\d*/i) || [""])[0];
  const discipline = text
    .replace(distance, "")
    .replace(/metres?|m$/g, "")
    .replace(/surface/g, "sf")
    .replace(/apnee/g, "ap")
    .replace(/immersion/g, "is")
    .replace(/bipalmes?/g, "bi")
    .replace(/[^a-z0-9]/g, "");
  return `${distance}${discipline}`;
}

function recordEventMatches(recordEventId, eventId) {
  const recordId = comparableEventId(recordEventId);
  const raceId = comparableEventId(eventId);
  if (recordId && raceId && recordId === raceId) return true;
  const recordSig = eventSignature(recordEventId);
  const raceSig = eventSignature(eventId);
  return Boolean(recordSig && raceSig && recordSig === raceSig);
}

function swimmerKey(row) {
  if (row.swimmerId) return `id:${row.swimmerId}`;
  return normalizeText([row.lastName, row.firstName, row.name, row.displayName, row.club].filter(Boolean).join("|"));
}

function entrantForSeriesRow(row) {
  if (!row) return null;
  if (row.swimmerId) {
    return publicEntrants.find((entrant) =>
      entrant.swimmerId === row.swimmerId &&
      (!row.eventId || !entrant.eventId || entrant.eventId === row.eventId) &&
      (!row.sex || !entrant.sex || entrant.sex === row.sex) &&
      (!row.session || !entrant.session || entrant.session === row.session)
    ) || publicEntrants.find((entrant) => entrant.swimmerId === row.swimmerId) || null;
  }
  const key = normalizeText([row.lastName, row.firstName, row.birthDate, row.sex].join("|"));
  return publicEntrants.find((entrant) =>
    normalizeText([entrant.lastName, entrant.firstName, entrant.birthDate, entrant.sex].join("|")) === key
  ) || null;
}

function displaySeriesRow(row) {
  const entrant = entrantForSeriesRow(row);
  if (!entrant) return row || {};
  return {
    ...entrant,
    ...row,
    lastName: row.lastName || entrant.lastName || "",
    firstName: row.firstName || entrant.firstName || "",
    name: row.name || entrant.name || entrant.displayName || "",
    displayName: row.displayName || entrant.displayName || "",
    club: row.club || entrant.club || "",
    clubCode: row.clubCode || entrant.clubCode || "",
    category: row.category || entrant.category || "",
    categoryCode: row.categoryCode || entrant.categoryCode || "",
    seedTime: row.seedTime || entrant.seedTime || "",
    birthDate: row.birthDate || entrant.birthDate || ""
  };
}

function swimmerName(row) {
  row = displaySeriesRow(row);
  const last = cleanText(row.lastName || "").trim().toLocaleUpperCase("fr-FR");
  const first = cleanText(row.firstName || "").trim();
  return [last, first].filter(Boolean).join(" ").trim() || cleanText(row.name || row.displayName || "Nageur");
}

function clubLabel(row) {
  row = displaySeriesRow(row);
  const explicit = cleanText(row.clubCode || "").trim();
  if (explicit) return explicit.toLocaleUpperCase("fr-FR");
  const club = cleanText(row.club || "").trim();
  if (!club) return "";
  const initials = club
    .replace(/['’]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !/^(de|du|des|la|le|les|et|avec|en)$/i.test(word))
    .map((word) => word[0])
    .join("")
    .slice(0, 6);
  return initials.toLocaleUpperCase("fr-FR");
}

function lineLabel(row) {
  return row.line || row.lane || "-";
}

function seedLabel(row) {
  row = displaySeriesRow(row);
  return cleanText(row.seedTime || row.time || row.entryTime || "");
}

function birthYearLabel(row) {
  row = displaySeriesRow(row);
  const value = cleanText(row.birthDate || row.birthYear || "");
  const match = value.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : value;
}

function rowStartTime(row) {
  if (row.startTime) return row.startTime;
  const program = publicProgram.find((item) =>
    item.eventId === row.eventId &&
    item.sex === row.sex &&
    (!row.session || !item.session || item.session === row.session) &&
    (!isFinalStage(item.stage) || item.stage === row.stage)
  );
  return program?.startTime || "";
}

function isForfait(row) {
  return normalizeText(row.importedStatus || row.status || row.statusLabel || row.note).includes("forfait");
}

function performanceNameKey(row) {
  const parts = [row.lastName, row.firstName].filter(Boolean);
  return normalizeText(parts.length ? parts.join(" ") : (row.displayName || row.name || ""));
}

function performanceClubKey(row) {
  return normalizeText(row.clubCode || row.club || "");
}

function allPublicPerformances() {
  return publicResults.flatMap((result) =>
    (result.performances || []).map((performance) => ({
      ...performance,
      resultId: result.id || "",
      eventId: performance.eventId || result.eventId,
      eventLabel: performance.eventLabel || result.eventLabel,
      sex: performance.sex || result.sex,
      stage: performance.stage || result.stage,
      phaseLabel: performance.phaseLabel || result.phaseLabel,
      updatedAt: performance.updatedAt || result.updatedAt
    }))
  );
}

function performanceMatchesRow(performance, row) {
  row = displaySeriesRow(row);
  if (/^4x/i.test(String(performance.eventId || row.eventId || ""))) return false;
  if (!recordEventMatches(performance.eventId, row.eventId)) return false;
  if (performance.sex && row.sex && performance.sex !== row.sex) return false;
  if (performanceNameKey(performance) !== performanceNameKey(row)) return false;
  const performanceBirth = birthYearLabel(performance);
  const rowBirth = birthYearLabel(row);
  if (performanceBirth && rowBirth && performanceBirth !== rowBirth) return false;
  const performanceClub = performanceClubKey(performance);
  const rowClub = performanceClubKey(row);
  if (performanceClub && rowClub && performanceClub !== rowClub) return false;
  return true;
}

function swimmerKeyForResultRow(row, result = {}) {
  const probe = {
    ...row,
    eventId: row.eventId || result.eventId || "",
    sex: row.sex || result.sex || "",
    session: row.session || result.session || ""
  };
  const match = publicSeries
    .filter((seriesRow) => !isFinalStage(seriesRow.stage) && !isRelayRow(seriesRow))
    .find((seriesRow) => performanceMatchesRow(probe, seriesRow));
  return match ? swimmerKey(match) : "";
}

function renderResultSwimmerName(row, result = {}) {
  const key = swimmerKeyForResultRow(row, result);
  const name = finalistName(row);
  if (!key) return `<strong>${escapeHtml(name)}</strong>`;
  return `
    <button class="public-result-swimmer-button" type="button" data-result-swimmer-key="${escapeHtml(key)}">
      ${escapeHtml(name)}
    </button>
  `;
}

function performanceDuplicateKey(performance) {
  return [
    performance.eventId || "",
    performance.sex || "",
    performance.stage || "",
    performance.phaseLabel || "",
    performanceNameKey(performance),
    birthYearLabel(performance),
    performanceClubKey(performance),
    cleanText(performance.time || ""),
    cleanText(performance.status || ""),
    cleanText(performance.statusLabel || "")
  ].join("|");
}

function uniquePerformances(rows) {
  const seen = new Set();
  return rows.filter((performance) => {
    const key = performanceDuplicateKey(performance);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function performancesForProgramRow(row) {
  const performances = allPublicPerformances()
    .filter((performance) => performanceMatchesRow(performance, row))
    .sort((a, b) => {
      const finalA = isFinalStage(a.stage) ? 1 : 0;
      const finalB = isFinalStage(b.stage) ? 1 : 0;
      return finalA - finalB || String(a.updatedAt || "").localeCompare(String(b.updatedAt || ""));
    });
  return uniquePerformances(performances);
}

function resultPdfLinksForProgramRow(row, performances = performancesForProgramRow(row)) {
  const seen = new Set();
  const matches = performances
    .map((performance) => publicResults.find((result) => String(result.id || "") === String(performance.resultId || "")))
    .filter(Boolean);
  if (!matches.length) {
    matches.push(...publicResults.filter((result) =>
      result.id &&
      result.eventId === row.eventId &&
      result.sex === row.sex &&
      !isFinalStage(result.stage) &&
      (
        result.programKey === programKey(row) ||
        result.raceKey === `${row.eventId || ""}|${row.sex || ""}`
      )
    ));
  }
  return matches.filter((result) => {
    const key = result.id || result.programKey || result.raceKey;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function resultPdfLabel(result) {
  if (isFinalStage(result.stage)) return "PDF finale";
  return "PDF";
}

function renderSwimmerResultPdfLinks(row, performances = performancesForProgramRow(row)) {
  const results = resultPdfLinksForProgramRow(row, performances);
  if (!results.length) return "";
  return `
    <span class="public-swimmer-pdf-actions">
      ${results.map((result) => `
        <a class="public-swimmer-pdf-link" href="pdf.html?type=resultat&id=${encodeURIComponent(result.id || "")}" aria-label="Voir le PDF résultat">
          ${escapeHtml(resultPdfLabel(result))}
        </a>
      `).join("")}
    </span>
  `;
}

function performancePhaseLabel(performance) {
  if (!isFinalStage(performance.stage)) return "Série";
  if (performance.phaseLabel) return cleanText(performance.phaseLabel);
  return "Finale";
}

function performanceInlinePhaseLabel(performance) {
  const label = performancePhaseLabel(performance);
  const stage = String(performance.stage || "").toLowerCase();
  if (stage.includes("b")) return "finale B";
  if (stage.includes("a")) return "finale A";
  if (/^finale\s+[AB]$/i.test(label)) {
    return label.replace(/^finale/i, "finale").replace(/\s+([ab])$/i, (_, letter) => ` ${letter.toUpperCase()}`);
  }
  return label.toLowerCase();
}

function performanceStatusLabel(performance) {
  const status = cleanText(performance.status || performance.resultStatus || "").toLowerCase();
  const label = cleanText(performance.statusLabel || "").trim();
  const normalizedLabel = normalizeText(label);
  if (status === "dsq" || /\b(dsq|dq|disqual)/.test(normalizedLabel)) return "DSQ";
  if (status === "ab" || /\b(ab|abd|dnf|abandon)\b/.test(normalizedLabel)) return "ABD";
  if (status === "dns" || /\b(dns|ns|abs|absent|forfait)\b/.test(normalizedLabel)) return "Forfait";
  return label;
}

function performanceValueLabel(performance) {
  return cleanText(performanceStatusLabel(performance) || performance.time || "-");
}

function timeToMs(value) {
  const text = String(value || "").trim();
  const parts = text.split(":");
  if (!text) return Number.POSITIVE_INFINITY;
  if (parts.length === 2) {
    const ms = (Number(parts[0]) * 60 + Number(parts[1].replace(",", "."))) * 1000;
    return Number.isFinite(ms) ? ms : Number.POSITIVE_INFINITY;
  }
  const ms = Number(text.replace(",", ".")) * 1000;
  return Number.isFinite(ms) ? ms : Number.POSITIVE_INFINITY;
}

function performanceDeltaLabel(performance, referenceTime, referenceLabel = "") {
  if (performance.status || !performance.time || !referenceTime) return "";
  const performanceMs = timeToMs(performance.time);
  const referenceMs = timeToMs(referenceTime);
  if (!Number.isFinite(performanceMs) || !Number.isFinite(referenceMs)) return "";
  const delta = (performanceMs - referenceMs) / 1000;
  if (!Number.isFinite(delta)) return "";
  const sign = delta >= 0 ? "+" : "-";
  return `${sign}${Math.abs(delta).toFixed(2).replace(".", ",")}s${referenceLabel ? ` / ${referenceLabel}` : ""}`;
}

function renderPerformanceLines(row) {
  const performances = performancesForProgramRow(row);
  if (!performances.length) return "";
  const engagementReference = seedLabel(row);
  let seriesReference = "";
  return performances.map((performance) => {
    const isFinal = isFinalStage(performance.stage);
    const reference = isFinal ? seriesReference : engagementReference;
    const delta = performanceDeltaLabel(performance, reference, isFinal ? "série" : "eng.");
    if (!isFinal && performance.time) seriesReference = performance.time;
    return `
      <span class="public-performance-line">
        Réalisé ${escapeHtml(performanceInlinePhaseLabel(performance))} : <strong>${escapeHtml(performanceValueLabel(performance))}</strong>
        ${delta ? `<em class="public-performance-delta ${delta.startsWith("-") ? "faster" : "slower"}">${escapeHtml(delta)}</em>` : ""}
      </span>
    `;
  }).join("");
}

function renderSwimmerProgramMeta(row, forfait, performances = performancesForProgramRow(row)) {
  const engagement = forfait ? "Forfait" : (seedLabel(row) || "-");
  if (performances.length) {
    return `<span class="public-entry-line">Engagement : ${escapeHtml(engagement)}</span>`;
  }
  return `<span>Série ${escapeHtml(row.series || "-")} · Ligne ${escapeHtml(lineLabel(row))} · Engagement : ${escapeHtml(engagement)}</span>`;
}

function allSearchSwimmers() {
  const seen = new Set();
  return publicSeries
    .filter((row) => !isFinalStage(row.stage) && !isRelayRow(row))
    .sort((a, b) => swimmerName(a).localeCompare(swimmerName(b), "fr") || clubLabel(a).localeCompare(clubLabel(b), "fr"))
    .reduce((items, row) => {
      const key = swimmerKey(row);
      if (!key || seen.has(key)) return items;
      seen.add(key);
      items.push(row);
      return items;
    }, []);
}

function searchSwimmers(query) {
  const normalized = normalizeText(query);
  if (normalized.length < 2) return [];
  const tokens = normalized.split(" ").filter(Boolean);
  return allSearchSwimmers()
    .filter((row) => {
      const haystack = normalizeText(`${swimmerName(row)} ${clubLabel(row)} ${row.club || ""}`);
      return tokens.every((token) => haystack.includes(token));
    })
    .slice(0, 8);
}

function finalSessionsForRace(eventId, sex) {
  return new Set(publicProgram
    .filter((row) => row.eventId === eventId && row.sex === sex && isFinalStage(row.stage) && row.session)
    .map((row) => String(row.session || "").trim()));
}

function swimmerProgramSortValue(row) {
  return Number(row.session || 999) * 100000 +
    Number(row.heatOrder || row.series || 9999) * 100 +
    Number(row.line || row.lane || 99);
}

function dedupeSwimmerProgramRows(rows = []) {
  const byRace = new Map();
  rows.forEach((row) => {
    const key = `${row.eventId || ""}|${row.sex || ""}`;
    if (!key.trim()) return;
    if (!byRace.has(key)) byRace.set(key, []);
    byRace.get(key).push(row);
  });
  return [...byRace.values()]
    .map((raceRows) => {
      const reference = raceRows[0] || {};
      const finalSessions = finalSessionsForRace(reference.eventId, reference.sex);
      const initialRows = raceRows.filter((row) => !finalSessions.has(String(row.session || "").trim()));
      return (initialRows.length ? initialRows : raceRows)
        .slice()
        .sort((a, b) => swimmerProgramSortValue(a) - swimmerProgramSortValue(b))[0];
    })
    .filter(Boolean)
    .sort((a, b) => swimmerProgramSortValue(a) - swimmerProgramSortValue(b));
}

function swimmerProgramRows(key) {
  const rows = publicSeries
    .filter((row) => swimmerKey(row) === key)
    .filter((row) => !isFinalStage(row.stage) && !isRelayRow(row))
    .map(displaySeriesRow);
  return dedupeSwimmerProgramRows(rows);
}

function renderInlineSwimmerProgram(key) {
  const rows = swimmerProgramRows(key);
  const swimmer = rows[0];
  if (!swimmer) return "";
  return `
    <div class="public-search-program">
      <div class="public-search-program-head">
        <span>${escapeHtml(clubLabel(swimmer) || "-")}</span>
        <strong>${escapeHtml(swimmerName(swimmer))}</strong>
        <em>${swimmerCategoryBirthHtml(swimmer)}</em>
      </div>
      <div class="public-swimmer-program">
        ${rows.map((row) => {
          const time = row.startTime || rowStartTime(row);
          const forfait = isForfait(row);
          const performances = performancesForProgramRow(row);
          const timeLabel = performances.length ? "" : (time ? ` · ${escapeHtml(time)}` : "");
          return `
            <div class="public-swimmer-program-row ${forfait ? "is-forfait" : ""}">
              <div class="public-swimmer-program-row-head">
                <strong>S${escapeHtml(row.session || "-")}${timeLabel} · ${escapeHtml(eventLabel(row.eventId, row.label))} ${escapeHtml(sexLabel(row.sex))}</strong>
                ${renderSwimmerResultPdfLinks(row, performances)}
              </div>
              ${renderSwimmerProgramMeta(row, forfait, performances)}
              ${renderPerformanceLines(row)}
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function renderSwimmerSearchContent() {
  if (selectedSearchSwimmerKey) {
    if (swimmerResultDetailsLoading.has(selectedSearchSwimmerKey)) {
      return `<p class="panel-subtitle public-search-empty">Chargement des temps du nageur...</p>`;
    }
    return renderInlineSwimmerProgram(selectedSearchSwimmerKey);
  }
  const matches = searchSwimmers(swimmerSearchQuery);
  if (normalizeText(swimmerSearchQuery).length < 2) {
    return `<p class="panel-subtitle public-search-empty">Tape au moins 2 lettres pour chercher un nageur.</p>`;
  }
  if (!matches.length) {
    return `<p class="panel-subtitle public-search-empty">Aucun nageur trouvé.</p>`;
  }
  return `
    <div class="public-search-results" aria-label="Nageurs trouvés">
      ${matches.map((row) => {
        const key = swimmerKey(row);
        return `
          <button class="public-search-result ${key === selectedSearchSwimmerKey ? "active" : ""}" type="button" data-search-swimmer-key="${escapeHtml(key)}">
            <strong>${escapeHtml(swimmerName(row))}</strong>
            <span>${escapeHtml(clubLabel(row) || "-")}</span>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderSwimmerSearchSection() {
  if (!publicSeries.some((row) => !isFinalStage(row.stage))) return "";
  return `
    <section class="panel public-swimmer-search-panel">
      <label class="public-swimmer-search">
        <span>Recherche nageur</span>
        <input id="publicSwimmerSearchInput" type="search" inputmode="search" autocomplete="off" placeholder="Nom ou club" value="${escapeHtml(swimmerSearchQuery)}">
      </label>
      <div id="publicSwimmerSearchOutput" class="public-swimmer-search-output">
        ${renderSwimmerSearchContent()}
      </div>
    </section>
  `;
}

function closeSwimmerSheet() {
  activeSheetSwimmerKey = "";
  if (!swimmerSheet) return;
  swimmerSheet.hidden = true;
  swimmerSheet.innerHTML = "";
  document.body.classList.remove("public-sheet-open");
}

function renderSwimmerSheetContent(key) {
  if (!swimmerSheet || !key) return;
  const content = renderInlineSwimmerProgram(key);
  if (!content) return;
  activeSheetSwimmerKey = key;
  swimmerSheet.hidden = false;
  swimmerSheet.innerHTML = `
    <div class="public-swimmer-backdrop" data-close-swimmer-sheet></div>
    <div class="public-swimmer-panel" role="dialog" aria-modal="true" aria-label="Fiche nageur">
      <button class="public-swimmer-close" type="button" data-close-swimmer-sheet aria-label="Fermer">×</button>
      ${content}
    </div>
  `;
  document.body.classList.add("public-sheet-open");
}

async function openSwimmerSheet(key) {
  if (!swimmerSheet || !key) return;
  renderSwimmerSheetContent(key);
  await ensureSwimmerResultDetails(key);
  if (activeSheetSwimmerKey === key) renderSwimmerSheetContent(key);
}

function latestSessionUpdateLabel(results = []) {
  const latest = results
    .map((result) => result.updatedAt)
    .filter(Boolean)
    .sort()
    .at(-1);
  const label = formatPublicDateTime(latest);
  return label ? `Dernière mise à jour : ${label}` : "Pas de résultat en ligne pour cette session";
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
  if (new Date() > limit) return "";
  return `forfait jusqu'à ${formatDeadlineTime(limit)}`;
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
            ${renderResultSwimmerName(row, result)}
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

function renderNextUnqualified(rows, result = {}) {
  if (!rows?.length) return "";
  const renderRows = (items) => items.map((row) => `
    <li ${row.rank ? `value="${escapeHtml(row.rank)}"` : ""} class="${row.resultStatus ? "public-result-status-row" : ""}">
      ${renderResultSwimmerName(row, result)}
      <span>${escapeHtml(row.time || resultRowStatusLabel(row) || "")}</span>
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

function resultRowStatusLabel(row) {
  const status = cleanText(row?.resultStatus || row?.status || "").toLowerCase();
  const label = cleanText(row?.statusLabel || "");
  const normalizedLabel = normalizeText(label);
  if (status === "dsq" || /\b(dsq|dq|disqual)/.test(normalizedLabel)) return "DSQ";
  if (status === "ab" || /\b(ab|abd|dnf|abandon)\b/.test(normalizedLabel)) return "ABD";
  if (status === "dns" || /\b(dns|ns|abs|absent|forfait)\b/.test(normalizedLabel)) return "Forfait";
  return label;
}

function renderPublishedRanking(rows, { ordered = true, title = "Résultats de la course" } = {}) {
  if (!rows?.length) return "";
  const listTag = ordered ? "ol" : "ul";
  const renderRows = (items) => items.map((row) => `
    <li ${ordered && row.rank ? `value="${escapeHtml(row.rank)}"` : ""} class="${row.resultStatus ? "public-result-status-row" : ""}">
      ${renderResultSwimmerName(row, row)}
      <span>${escapeHtml(row.time || resultRowStatusLabel(row) || "")}</span>
    </li>
  `).join("");
  return `
    <details class="public-unqualified-block public-ranking-block">
      <summary>${escapeHtml(title)}</summary>
      <${listTag}>
        ${renderRows(rows)}
      </${listTag}>
    </details>
  `;
}

function renderFinalRankingGroup(group) {
  if (!group?.rows?.length) return "";
  return `
    <section class="public-final-ranking-section">
      <strong>${escapeHtml(group.title)}</strong>
      <ol>
        ${group.rows.map((row) => `
          <li ${row.rank ? `value="${escapeHtml(row.rank)}"` : ""} class="${row.resultStatus ? "public-result-status-row" : ""}">
            ${renderResultSwimmerName(row, group.result || row)}
            <span>${escapeHtml(row.time || resultRowStatusLabel(row) || "")}</span>
          </li>
        `).join("")}
      </ol>
    </section>
  `;
}

function renderFinalRankingBlocks(result) {
  const groups = finalRankingGroups(result);
  if (!groups.length || !groups.some((group) => group.rows.length)) return "";
  return `
    <details class="public-unqualified-block public-ranking-block public-final-ranking-block">
      <summary>Résultats de la course</summary>
      ${groups.map(renderFinalRankingGroup).join("")}
    </details>
  `;
}

function publishedRankingRows(result) {
  if (!result?.isPartial && Array.isArray(result?.ranking) && result.ranking.length) {
    const rows = result.ranking.map((row) => ({
      ...row,
      eventId: row.eventId || result.eventId || "",
      sex: row.sex || result.sex || "",
      session: row.session || result.session || ""
    }));
    const orderedRows = isFinalStage(result.stage)
      ? rows.sort((a, b) =>
        Number(a.sourceIndex ?? 9999) - Number(b.sourceIndex ?? 9999) ||
        Number(a.rank || 9999) - Number(b.rank || 9999)
      )
      : rows;
    return {
      rows: orderedRows,
      ordered: true
    };
  }
  if (!result?.isPartial) return { rows: [], ordered: true };
  const sourceRows = Array.isArray(result.performances) && result.performances.length
    ? result.performances
    : (Array.isArray(result.ranking) ? result.ranking : []);
  const rows = sourceRows
    .filter((performance) => (
      !isFinalStage(performance.stage) &&
      (performance.time || performance.statusLabel)
    ))
    .sort((a, b) => timeToMs(a.time) - timeToMs(b.time) || finalistName(a).localeCompare(finalistName(b), "fr"));
  return { rows, ordered: false };
}

function finalResultsForRow(row, result) {
  if (!row || !isFinalStage(row.stage)) return [];
  const seen = new Set();
  const matches = publicResults
    .filter((item) =>
      item.eventId === row.eventId &&
      item.sex === row.sex &&
      (!row.session || !item.session || item.session === row.session) &&
      isFinalStage(item.stage) &&
      (item.ranking?.length || item.performances?.length)
    )
    .sort((a, b) =>
      Number(a.programKey?.split("|")[0] || 9999) - Number(b.programKey?.split("|")[0] || 9999) ||
      String(a.stage || "").localeCompare(String(b.stage || ""))
    );
  if (result && isFinalStage(result.stage) && (result.ranking?.length || result.performances?.length)) {
    matches.unshift(result);
  }
  return matches.filter((item) => {
    const key = item.id || item.programKey || `${item.eventId}|${item.sex}|${item.stage}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function resultRankingTitle(result, fallback = "Résultats de la course") {
  if (!isFinalStage(result?.stage)) return fallback;
  const label = cleanText(result.phaseLabel || "");
  if (/finale\s+[AB]/i.test(label)) return `Résultats ${label}`;
  if (String(result.stage || "").toLowerCase().includes("b")) return "Résultats Finale B";
  if (String(result.stage || "").toLowerCase().includes("a")) return "Résultats Finale A";
  if (String(result.stage || "").startsWith("finales")) return "Résultats des finales";
  return "Résultats de la finale";
}

function finalRankingGroups(result) {
  const ranking = publishedRankingRows(result);
  const rows = ranking.rows || [];
  if (!isFinalStage(result?.stage) || rows.length <= 8) {
    return [{
      title: resultRankingTitle(result),
      rows,
      result,
      ordered: ranking.ordered !== false
    }];
  }
  return [
    { title: "Résultats Finale A", rows: rows.slice(0, 8), result, ordered: ranking.ordered !== false },
    { title: "Résultats Finale B", rows: rows.slice(8, 16), result, ordered: ranking.ordered !== false }
  ].filter((group) => group.rows.length);
}

function renderResultRankingBlocks(result) {
  if (!result) return "";
  if (isFinalStage(result.stage)) {
    return renderFinalRankingBlocks(result);
  }
  const ranking = publishedRankingRows(result);
  return renderPublishedRanking(ranking.rows || [], {
    ordered: ranking.ordered !== false,
    title: resultRankingTitle(result)
  });
}

function renderResultDetails(row, result) {
  if (!result) return "";
  const publicFinalistsVisible = !result.hasFinal || result.finalistsAnnouncedAt;
  const finalists = {
    a: sortedFinalRows(result.finalists?.a || []),
    b: sortedFinalRows(result.finalists?.b || [])
  };
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
    ${result.hasFinal && publicFinalistsVisible ? `
      <details class="public-finalists-group">
        <summary>${(finalists.b || []).length ? "Finales A et B" : "Finale A"}</summary>
        <div class="public-finalists-grid">
          ${renderFinalistRows("Qualifiés Finale A", finalists.a || [], result)}
          ${renderFinalistRows("Qualifiés Finale B", finalists.b || [], result)}
        </div>
      </details>
      ${renderNextUnqualified(nextUnqualified || [], result)}
    ` : ""}
    ${!result.hasFinal && publicFinalistsVisible ? renderResultRankingBlocks(result) : ""}
    ${isFinalStage(row?.stage) ? finalResultsForRow(row, result)
      .filter((finalResult) => finalResult.id !== result.id)
      .map(renderResultRankingBlocks).join("") : ""}
  `;
}

function renderRow(row) {
  const result = resultForRow(row);
  const status = resultStatus(row, result);
  const hideResultMeta = result?.hasFinal && !result.finalistsAnnouncedAt;
  const updated = !hideResultMeta && result?.updatedAt ? `Mis à jour le ${formatPublicDateTime(result.updatedAt)}` : "";
  const sexClass = row.sex === "F" ? "sex-female" : (row.sex === "M" ? "sex-male" : "sex-mixed");
  const phaseLabel = resultIsVisible(result) ? "" : publicRacePhaseLabel(row);
  const pdfVisible = result && (!result.hasFinal || result.finalistsAnnouncedAt);
  return `
    <article class="public-result-card ${result ? "published" : "not-published"} ${sexClass}">
      <div class="public-result-head">
        <div>
          <h2>${escapeHtml(eventLabel(row.eventId, row.label))} <span class="public-sex-label">${escapeHtml(sexLabel(row.sex))}</span>${phaseLabel ? ` <span class="public-phase-label">${escapeHtml(phaseLabel)}</span>` : ""}</h2>
          ${updated ? `<p class="public-update-meta">${escapeHtml(updated)}</p>` : ""}
        </div>
        <div class="public-result-tools">
          <span class="public-result-status ${status.className}">${escapeHtml(status.label)}</span>
          ${pdfVisible ? `<a class="ghost-button compact confirm-button public-result-pdf" href="pdf.html?type=resultat&id=${encodeURIComponent(result.id || "")}">PDF</a>` : ""}
        </div>
      </div>
      ${renderResultDetails(row, result)}
    </article>
  `;
}

function renderSessionControls() {
  const available = sessions();
  const sessionResults = resultsForRows(rowsForSession(activeSession).filter((row) => resultIsVisible(resultForRow(row))));
  if (sessionControls) {
    sessionControls.innerHTML = available.map((session) => `
      <button class="session-chip ${session === activeSession ? "active" : ""}" type="button" data-public-session="${escapeHtml(session)}">S${escapeHtml(session)}</button>
    `).join("");
  }
  if (sessionSelect) {
    sessionSelect.innerHTML = available.map((session) => `
      <option value="${escapeHtml(session)}" ${session === activeSession ? "selected" : ""}>Session ${escapeHtml(session)}</option>
    `).join("");
    sessionSelect.disabled = available.length <= 1;
  }
  if (sessionMeta) {
    sessionMeta.textContent = latestSessionUpdateLabel(sessionResults);
  }
}

function renderSessionInformation(session) {
  const text = cleanText(publicSessionInfos?.[session] || "").trim();
  if (!text) return "";
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const visibleLines = lines.filter((line) => !/^!{0,2}\s*Live\s+vid[ée]o\s*:\s*$/i.test(line));
  const renderLineContent = (line) => {
    const videoMatch = line.match(/^Live\s+vid[ée]o\s*:\s*(https?:\/\/\S+)/i);
    if (videoMatch) {
      return `<a class="public-session-video-link" href="${escapeHtml(videoMatch[1])}" target="_blank" rel="noopener">📹 Live vidéo</a>`;
    }
    return escapeHtml(line);
  };
  return `
    <div class="public-session-info">
      <strong>Informations</strong>
      ${visibleLines.map((line) => {
        const isWarning = line.startsWith("!!");
        const isNotice = !isWarning && line.startsWith("!");
        const displayLine = isWarning ? line.slice(2).trim() : (isNotice ? line.slice(1).trim() : line);
        const className = isWarning ? "public-session-warning" : (isNotice ? "public-session-notice" : "");
        const icon = isWarning || isNotice
          ? `<span class="public-session-info-icon" aria-hidden="true">!</span>`
          : "";
        return `<p class="${className}">${icon}${renderLineContent(displayLine)}</p>`;
      }).join("")}
    </div>
  `;
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
  const label = pdf.scope === "session" ? `Séries publiées - session ${session}` : "Séries publiées complètes";
  const updated = pdf.updatedAt ? `Mis à jour le ${formatPublicDateTime(pdf.updatedAt)}` : "";
  return `
    <div class="public-series-pdf public-series-program-pdf">
      <div>
        <span class="public-document-kind">Séries</span>
        <strong>${escapeHtml(label)}</strong>
        ${updated ? `<span>${escapeHtml(updated)}</span>` : ""}
      </div>
      <a class="ghost-button compact" href="pdf.html?type=series&id=${encodeURIComponent(pdf.id || "")}">Voir les séries</a>
    </div>
  `;
}

function renderSessionResultsPdfLinks(session) {
  const pdfs = sessionResultsPdfsForSession(session);
  if (!pdfs.length) return "";
  return `
    <div class="public-series-pdf public-session-results-pdf">
      <div>
        <span class="public-document-kind">Résultats</span>
        <strong>Résultats complets</strong>
        <span>${escapeHtml(pdfs.length > 1 ? `${pdfs.length} PDF disponibles` : (pdfs[0].sourceLabel || "PDF de consultation"))}</span>
      </div>
      <div class="public-pdf-link-actions">
        ${pdfs.map((pdf) => `
          <a class="ghost-button compact confirm-button" href="pdf.html?type=session-result&id=${encodeURIComponent(pdf.id || "")}">
            ${escapeHtml(pdfs.length > 1 ? (pdf.sourceLabel || "Voir") : "Voir")}
          </a>
        `).join("")}
      </div>
    </div>
  `;
}

function renderPublicDocumentsSection(documentsHtml) {
  if (!documentsHtml) return "";
  return `
    <div class="public-results-section-title public-documents-title">
      <h3>Documents</h3>
      <span>Séries et PDF publiés</span>
    </div>
    <section class="public-documents-section" aria-label="Documents de la session">
      ${documentsHtml}
    </section>
  `;
}

function renderSessionResultsPdfSection(session) {
  const pdfLinks = renderSessionResultsPdfLinks(session);
  if (!pdfLinks) return "";
  return `
    <div class="public-results-section-title public-documents-title">
      <h3>Résultats complets</h3>
      <span>PDF de la session</span>
    </div>
    <section class="public-documents-section public-session-results-section" aria-label="PDF résultats de la session">
      ${pdfLinks}
    </section>
  `;
}

function renderPendingRows(rows = []) {
  if (!rows.length) return "";
  return `
    <details class="public-pending-results-block">
      <summary>
        <span>Courses en attente de résultat</span>
        <strong>${escapeHtml(String(rows.length))}</strong>
      </summary>
      <div class="public-pending-results-list">
        ${rows.map(renderRow).join("")}
      </div>
    </details>
  `;
}

function renderMeetTitle() {
  if (!meetTitle) return;
  const city = cleanText(publicMeet.city || "");
  const year = cleanText(publicMeet.year || "");
  const title = [city, year, "Résultats"].filter(Boolean).join(" · ");
  meetTitle.textContent = cleanText(title || "Résultats");
  if (meetMeta) {
    const lastUpdate = publicIndexUpdatedAt || publicResults
      .map((result) => result.updatedAt)
      .filter(Boolean)
      .sort()
      .at(-1);
    meetMeta.textContent = lastUpdate
      ? `Mis à jour le ${formatPublicDateTime(lastUpdate)}`
      : "En attente de publication des premiers résultats";
  }
}

function renderResults() {
  if (!list) return;
  ensureActiveSession();
  renderMeetTitle();
  renderSessionControls();
  const rows = rowsForSession(activeSession);
  const publishedRows = rows.filter((row) => resultIsVisible(resultForRow(row)));
  const pendingRows = rows.filter((row) => !resultIsVisible(resultForRow(row)));
  const sessionResults = resultsForRows(publishedRows);
  const seriesDocumentsHtml = renderSeriesPdfLink(activeSession);
  const sessionResultsPdfHtml = renderSessionResultsPdfSection(activeSession);
  const sessionInformationHtml = renderSessionInformation(activeSession);
  if (sessionInfoHost) sessionInfoHost.innerHTML = sessionInformationHtml;
  if (!rows.length) {
    list.innerHTML = `
      <p class="panel-subtitle">Aucune course trouvée pour cette session.</p>
      ${sessionResultsPdfHtml}
      ${renderSwimmerSearchSection()}
    `;
    return;
  }
  list.innerHTML = `
    <div class="public-session-title">
      <div>
        <h2>Session ${escapeHtml(activeSession)}</h2>
      </div>
      <span>${escapeHtml(String(sessionResults.length))} résultat${sessionResults.length > 1 ? "s" : ""} publié${sessionResults.length > 1 ? "s" : ""} / ${escapeHtml(String(rows.length))} course${rows.length > 1 ? "s" : ""}</span>
    </div>
    ${sessionResultsPdfHtml}
    <div class="public-results-section-title">
      <h3>Résultats des courses</h3>
      <span>${escapeHtml(String(sessionResults.length))} disponible${sessionResults.length > 1 ? "s" : ""}</span>
    </div>
    ${publishedRows.map(renderRow).join("")}
    ${renderPendingRows(pendingRows)}
    ${renderPublicDocumentsSection(seriesDocumentsHtml)}
    ${renderSwimmerSearchSection()}
  `;
  updateCollapseDetailsButton();
}

function sessionHasVisibleResults(session) {
  return rowsForSession(session).some((row) => resultIsVisible(resultForRow(row)));
}

function sessionHasDetailedResults(session) {
  return rowsForSession(session).some((row) => {
    const result = resultForRow(row);
    return resultIsVisible(result) && resultHasDetails(result);
  });
}

function refreshPublicSessionResultsIfMissing(session) {
  const cleanSession = String(session || "").trim();
  if (!cleanSession || (directResultSessionsLoaded.has(cleanSession) && sessionHasDetailedResults(cleanSession))) return;
  setStatus("Actualisation", "pending");
  loadPublicResultsIndex({ directSession: cleanSession }).catch((error) => {
    console.warn("Actualisation résultats session impossible", error);
    setStatus("Erreur", "error");
  });
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

async function loadPublicSessionResultsPdfs(competition) {
  try {
    const snapshot = await competition.collection("sessionResultsPdfs").get({ source: "server" });
    publicSessionResultsPdfs = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  } catch (error) {
    console.warn("Lecture PDF résultats complets impossible", error);
    publicSessionResultsPdfs = [];
  }
}

async function loadPublicResultsDirectData(competition) {
  const [resultsSnapshot] = await Promise.all([
    competition.collection("results").orderBy("updatedAt", "desc").get({ source: "server" }),
    loadPublicSeriesPdfs(competition),
    loadPublicSessionResultsPdfs(competition)
  ]);
  publicResults = resultsSnapshot.docs.map(publicResultFromDoc);
  publicIndexUpdatedAt = publicResults
    .map((result) => result.updatedAt)
    .filter(Boolean)
    .sort()
    .at(-1) || publicIndexUpdatedAt;
}

function mergePublicResults(results = []) {
  const byId = new Map(publicResults.map((result) => [result.id, result]));
  results.forEach((result) => {
    if (!result?.id) return;
    byId.set(result.id, result);
  });
  publicResults = [...byId.values()]
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  publicIndexUpdatedAt = publicResults
    .map((result) => result.updatedAt)
    .filter(Boolean)
    .sort()
    .at(-1) || publicIndexUpdatedAt;
}

async function loadPublicSessionResultsDirectData(competition, session) {
  const cleanSession = String(session || "").trim();
  if (!cleanSession) return;
  const snapshot = await competition.collection("results")
    .where("session", "==", cleanSession)
    .get({ source: "server" });
  mergePublicResults(snapshot.docs.map(publicResultFromDoc));
  directResultSessionsLoaded.add(cleanSession);
}

function swimmerResultSessions(key) {
  const sessions = new Set();
  const rows = swimmerProgramRows(key);
  rows.forEach((row) => {
    if (row.session) sessions.add(String(row.session).trim());
    publicProgram
      .filter((programRow) =>
        programRow.eventId === row.eventId &&
        programRow.sex === row.sex &&
        isFinalStage(programRow.stage) &&
        programRow.session
      )
      .forEach((programRow) => sessions.add(String(programRow.session).trim()));
  });
  return [...sessions].filter(Boolean);
}

async function ensureSwimmerResultDetails(key) {
  if (!key || swimmerResultDetailsLoading.has(key)) return;
  const sessionsToLoad = swimmerResultSessions(key)
    .filter((session) => !directResultSessionsLoaded.has(session));
  if (!sessionsToLoad.length) return;
  const competition = publicCompetitionDocument();
  if (!competition) return;
  swimmerResultDetailsLoading.add(key);
  try {
    await Promise.all(sessionsToLoad.map((session) => loadPublicSessionResultsDirectData(competition, session)));
  } finally {
    swimmerResultDetailsLoading.delete(key);
  }
}

async function latestVisibleResultSessionFromServer(competition) {
  const snapshot = await competition.collection("results")
    .orderBy("updatedAt", "desc")
    .limit(5)
    .get({ source: "server" });
  const latest = snapshot.docs
    .map(publicResultFromDoc)
    .find((result) => result.session && resultIsVisible(result));
  return latest?.session || "";
}

function liveDataIsNewerThanPublicIndex(remote, index) {
  if (!remote?.sourceVersion) return false;
  if (!index?.sourceVersion) return true;
  return remote.sourceVersion !== index.sourceVersion;
}

function applyPublicLiveOverlay(remote, index = {}, { force = false } = {}) {
  applyPublicAccessFromLiveData(remote);
  publicEntrants = Array.isArray(remote.entrants) ? remote.entrants : publicEntrants;
  if (!publicSeries.length && Array.isArray(remote.series)) publicSeries = remote.series;
  if (!force && !liveDataIsNewerThanPublicIndex(remote, index)) return;
  publicMeet = remote.meet || publicMeet;
  publicProgram = Array.isArray(remote.program) ? remote.program : publicProgram;
  publicEvents = Array.isArray(remote.events) ? remote.events : publicEvents;
  publicEntrants = Array.isArray(remote.entrants) ? remote.entrants : publicEntrants;
  publicSeries = Array.isArray(remote.series) ? remote.series : publicSeries;
  publicSessionInfos = remote.notes?.publicSessionInfos || publicSessionInfos;
  if (Array.isArray(remote.notes?.publicSeriesPdfs)) {
    publicSeriesPdfs = remote.notes.publicSeriesPdfs
      .slice()
      .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  }
  if (Array.isArray(remote.notes?.publicSessionResultsPdfs)) {
    publicSessionResultsPdfs = remote.notes.publicSessionResultsPdfs
      .slice()
      .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  }
  publicIndexUpdatedAt = remote.notes?.livePublishedAt || index.updatedAt || publicIndexUpdatedAt || "";
}

async function loadPublicResultsIndex({ forceDirect = false, directSession = "" } = {}) {
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
  const [snapshot, liveSnapshot] = await Promise.all([
    competition.collection("public").doc("resultsIndex").get({ source: "server" }),
    competition.collection("liveData").doc("current").get({ source: "server" })
  ]);
  const index = snapshot.data() || {};
  const remote = liveSnapshot.data()?.data || {};
  publicAccess = index.publicAccess || { online: true, updatedAt: "" };
  applyPublicAccessFromLiveData(remote);
  if (!ensurePublicAccess()) return;
  if (!snapshot.exists || !Array.isArray(index.program) || !index.program.length) {
    await loadPublicResultsFallback(competition);
    return;
  }
  publicMeet = index.meet || {};
  publicProgram = Array.isArray(index.program) ? index.program : [];
  publicEvents = Array.isArray(index.events) ? index.events : [];
  publicEntrants = Array.isArray(index.entrants) ? index.entrants : (Array.isArray(remote.entrants) ? remote.entrants : []);
  publicSeries = Array.isArray(index.series) ? index.series : [];
  publicResults = Array.isArray(index.results) ? index.results : [];
  publicSessionInfos = index.sessionInfos || {};
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
  applyPublicLiveOverlay(remote, index, { force: forceDirect });
  if (forceDirect) {
    await loadPublicResultsDirectData(competition);
  } else if (directSession) {
    await loadPublicSessionResultsDirectData(competition, directSession);
  } else if (!activeSessionChosen) {
    const latestServerSession = await latestVisibleResultSessionFromServer(competition).catch((error) => {
      console.warn("Lecture de la dernière session résultat impossible", error);
      return "";
    });
    if (latestServerSession && (!sessionHasDetailedResults(latestServerSession) || latestServerSession !== latestResultSession())) {
      await loadPublicSessionResultsDirectData(competition, latestServerSession);
    }
  }
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
  publicEntrants = Array.isArray(remote.entrants) ? remote.entrants : [];
  publicSeries = Array.isArray(remote.series) ? remote.series : [];
  publicResults = resultsSnapshot.docs.map(publicResultFromDoc);
  publicSessionInfos = remote.notes?.publicSessionInfos || {};
  publicAccess = {
    online: remote.notes?.publicResultsOnline !== false,
    updatedAt: remote.notes?.publicResultsOnlineUpdatedAt || ""
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
  refreshPublicSessionResultsIfMissing(activeSession);
});

sessionSelect?.addEventListener("change", (event) => {
  activeSession = event.target.value || "";
  activeSessionChosen = true;
  renderResults();
  refreshPublicSessionResultsIfMissing(activeSession);
});

collapseDetailsBtn?.addEventListener("click", () => {
  document.querySelectorAll(".public-results-list details[open]").forEach((details) => {
    details.open = false;
  });
  updateCollapseDetailsButton();
});

list?.addEventListener("toggle", (event) => {
  if (event.target?.matches("details")) {
    updateCollapseDetailsButton();
  }
}, true);

list?.addEventListener("input", (event) => {
  if (!event.target?.matches("#publicSwimmerSearchInput")) return;
  swimmerSearchQuery = event.target.value || "";
  selectedSearchSwimmerKey = "";
  const output = document.querySelector("#publicSwimmerSearchOutput");
  if (output) output.innerHTML = renderSwimmerSearchContent();
});

list?.addEventListener("click", (event) => {
  const resultSwimmerButton = event.target.closest("[data-result-swimmer-key]");
  if (resultSwimmerButton) {
    event.preventDefault();
    openSwimmerSheet(resultSwimmerButton.dataset.resultSwimmerKey || "").catch((error) => {
      console.warn("Chargement fiche nageur impossible", error);
      setStatus("Erreur", "error");
    });
    return;
  }
  const button = event.target.closest("[data-search-swimmer-key]");
  if (!button) return;
  selectedSearchSwimmerKey = button.dataset.searchSwimmerKey || "";
  const output = document.querySelector("#publicSwimmerSearchOutput");
  if (output) output.innerHTML = renderSwimmerSearchContent();
  ensureSwimmerResultDetails(selectedSearchSwimmerKey)
    .then(() => {
      const refreshedOutput = document.querySelector("#publicSwimmerSearchOutput");
      if (refreshedOutput && selectedSearchSwimmerKey === button.dataset.searchSwimmerKey) {
        refreshedOutput.innerHTML = renderSwimmerSearchContent();
      }
    })
    .catch((error) => {
      console.warn("Chargement des résultats nageur impossible", error);
      setStatus("Erreur", "error");
    });
});

swimmerSheet?.addEventListener("click", (event) => {
  if (!event.target.closest("[data-close-swimmer-sheet]")) return;
  closeSwimmerSheet();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && activeSheetSwimmerKey) {
    closeSwimmerSheet();
  }
});

function refreshPublicResults() {
  setStatus("Actualisation", "pending");
  loadPublicResultsIndex({ directSession: activeSession }).catch((error) => {
    console.warn("Actualisation résultats impossible", error);
    setStatus("Erreur", "error");
  });
}

refreshResultsBtn?.addEventListener("click", refreshPublicResults);
refreshResultsFloatBtn?.addEventListener("click", refreshPublicResults);

init();
