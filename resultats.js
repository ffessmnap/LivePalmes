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

const publicSwimmers = window.LivePalmesPublicSwimmers || {};
const publicResultDocuments = window.LivePalmesPublicResultsDocuments || {};
const {
  birthYearLabel,
  categoryClass,
  cleanText,
  formatPersonNameParts,
  isFinalStage,
  isRelayRow,
  normalizeText,
  performanceClubKey,
  performanceDeltaLabel,
  performanceNameKey,
  performanceStatusLabel,
  performanceValueLabel,
  recordEventMatches,
  sameCategory,
  timeToMs,
  uniquePerformances
} = publicSwimmers;

const escapeHtml = (value) => publicSwimmers.escapeHtml(value);

function publicSwimmerOptions(extra = {}) {
  return {
    escapeHtml,
    entrants: publicEntrants,
    results: publicResults,
    program: publicProgram,
    programKey,
    rowStartTime,
    eventLabel,
    sexLabel,
    isForfait,
    ...extra
  };
}

const setStatus = (label, className = "pending") => publicSwimmers.setStatus(statusBadge, label, className, { escapeHtml });

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

const programKey = (row) => publicSwimmers.programKey(row);

const sexLabel = (sex) => publicSwimmers.sexLabel(sex);

const categoryLabel = (category, sex) => publicSwimmers.categoryLabel(category, sex);

const eventLabel = (eventId, fallback = "") => publicSwimmers.eventLabel(publicEvents, eventId, fallback);

const sessions = () => publicSwimmers.publicSessions(publicProgram);

function resultForRow(row) {
  const key = raceKey(row.eventId, row.sex);
  const exact = publicResults.find((result) => result.programKey === programKey(row));
  if (exact) return exact;
  if (isFinalStage(row.stage)) return null;
  return publicResults.find((result) => result.raceKey === key && !isFinalStage(result.stage)) || null;
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
  return publicSwimmers.latestResultSession(publicResults, { isVisible: resultIsVisible });
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

const formatPublicDateTime = (value) => publicSwimmers.formatPublicDateTime(value);

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

const publicResultFromDoc = (doc) => publicSwimmers.publicResultFromDoc(doc);

const publicCompetitionDocument = () => publicSwimmers.publicCompetitionDocument(FIREBASE_CONFIG, FIRESTORE_COMPETITION_ID);

const swimmerKey = (row) => publicSwimmers.swimmerKey(row);

const entrantForSeriesRow = (row) => publicSwimmers.entrantForSeriesRow(row, publicEntrants);

const displaySeriesRow = (row) => publicSwimmers.displaySeriesRow(row, publicEntrants);

const swimmerName = (row) => publicSwimmers.swimmerName(row, publicEntrants);

const lineLabel = (row) => publicSwimmers.lineLabel(row);

const seedLabel = (row) => publicSwimmers.seedLabel(row, publicEntrants);

const rowStartTime = (row) => publicSwimmers.rowStartTime(row, publicProgram);

function isForfait(row) {
  return publicSwimmers.isForfait(row);
}

const allPublicPerformances = () => publicSwimmers.allPublicPerformances(publicResults);

function performanceMatchesRow(performance, row) {
  return publicSwimmers.performanceMatchesRow(performance, row, publicSwimmerOptions());
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

function performancesForProgramRow(row) {
  return publicSwimmers.performancesForProgramRow(row, publicSwimmerOptions());
}

const searchSwimmers = (query) => publicSwimmers.searchSwimmers(query, publicSeries, { entrants: publicEntrants, limit: 8 });

function swimmerProgramRows(key) {
  return publicSwimmers.swimmerProgramRows(key, publicSeries, publicSwimmerOptions());
}

function swimmerResultSessionsToLoad(key) {
  return publicSwimmers.swimmerResultSessionsToLoad(key, publicSwimmerOptions({
    series: publicSeries,
    loadedSessions: directResultSessionsLoaded
  }));
}

function swimmerResultsAreLoading(key) {
  return publicSwimmers.swimmerResultsAreLoading(key, publicSwimmerOptions({
    series: publicSeries,
    loadedSessions: directResultSessionsLoaded,
    loadingKeys: swimmerResultDetailsLoading
  }));
}

function renderInlineSwimmerProgram(key) {
  return publicSwimmers.renderInlineSwimmerProgram(key, publicSwimmerOptions({
    rows: swimmerProgramRows(key),
    loading: swimmerResultsAreLoading(key)
  }));
}

function renderSwimmerSearchContent() {
  return publicSwimmers.renderSwimmerSearchContent(publicSwimmerOptions({
    query: swimmerSearchQuery,
    selectedKey: selectedSearchSwimmerKey,
    matches: searchSwimmers(swimmerSearchQuery),
    renderProgram: renderInlineSwimmerProgram
  }));
}

function renderSwimmerSearchSection() {
  return publicSwimmers.renderSwimmerSearchSection(publicSwimmerOptions({
    hidden: !publicSeries.some((row) => !isFinalStage(row.stage)),
    query: swimmerSearchQuery,
    selectedKey: selectedSearchSwimmerKey,
    matches: searchSwimmers(swimmerSearchQuery),
    renderProgram: renderInlineSwimmerProgram
  }));
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
  swimmerSheet.innerHTML = publicSwimmers.renderSwimmerSheet(key, publicSwimmerOptions({
    content,
    closeAttr: "data-close-swimmer-sheet",
    closeButtonClass: "public-swimmer-close",
    label: "Fiche nageur",
    panelTag: "div"
  }));
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
  return publicSwimmers.renderSessionInformation(session, {
    infos: publicSessionInfos,
    escapeHtml
  });
}

function publicDocumentOptions() {
  return {
    escapeHtml,
    formatDate: formatPublicDateTime,
    seriesPdfs: publicSeriesPdfs,
    sessionResultsPdfs: publicSessionResultsPdfs
  };
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
  const documentOptions = publicDocumentOptions();
  const seriesDocumentsHtml = publicResultDocuments.renderSeriesPdfLink(activeSession, documentOptions);
  const sessionResultsPdfHtml = publicResultDocuments.renderSessionResultsPdfSection(activeSession, documentOptions);
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
    ${publicResultDocuments.renderPublicDocumentsSection(seriesDocumentsHtml)}
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
  const merged = publicSwimmers.mergePublicResults(publicResults, results);
  publicResults = merged.results;
  publicIndexUpdatedAt = merged.latestUpdatedAt || publicIndexUpdatedAt;
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
  return publicSwimmers.swimmerResultSessions(key, publicSwimmerOptions({ series: publicSeries }));
}

async function ensureSwimmerResultDetails(key) {
  if (!key || swimmerResultDetailsLoading.has(key)) return;
  const sessionsToLoad = swimmerResultSessionsToLoad(key);
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

const liveDataIsNewerThanPublicIndex = (remote, index) => publicSwimmers.liveDataIsNewerThanPublicIndex(remote, index);

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
