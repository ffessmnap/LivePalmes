const FIRESTORE_COMPETITION_ID = "livepalmes-active";
const PUBLIC_PROGRESS_MAX_AGE_MS = 30 * 60 * 1000;
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC4sh5R8eU9SAnEsqyji6aJKnpUGgbE-AM",
  authDomain: "livepalmes.firebaseapp.com",
  projectId: "livepalmes",
  storageBucket: "livepalmes.firebasestorage.app",
  messagingSenderId: "718081132564",
  appId: "1:718081132564:web:618d1e95b6d6aefa4ebf01"
};
const PUBLIC_SERIES_CACHE_KEY = "livepalmes:public-series-cache:v1";
const PUBLIC_CACHE_MAX_AGE_MS = 15 * 60 * 1000;

const meetTitle = document.querySelector("#publicSeriesMeetTitle");
const meetMeta = document.querySelector("#publicSeriesMeetMeta");
const app = document.querySelector("#publicSeriesApp");
const sessionsHost = document.querySelector("#publicSeriesSessions");
const sessionSelect = document.querySelector("#publicSeriesSessionSelect");
const sessionInfoHost = document.querySelector("#publicSeriesInfoHost");
const seriesPdfInlineLink = document.querySelector("#publicSeriesPdfInlineLink");
const statusBadge = document.querySelector("#publicSeriesStatus");
const refreshBtn = document.querySelector("#refreshPublicSeriesBtn");
const refreshFloatBtn = document.querySelector("#refreshPublicSeriesFloatBtn");
const programBtn = document.querySelector("#publicSeriesProgramBtn");
const swimmerSheet = document.querySelector("#publicSwimmerSheet");
const programSheet = document.querySelector("#publicProgramSheet");

let publicMeet = {};
let publicEvents = [];
let publicProgram = [];
let publicEntrants = [];
let publicSeries = [];
let publicResults = [];
let publicForfaits = [];
let publicRecords = [];
let publicQualifications = [];
let publicSeriesPdfs = [];
let publicSessionInfos = {};
let publicProgress = null;
let publicIndexUpdatedAt = "";
let activeSession = "";
let activeRaceIndex = 0;
let activeSeriesIndex = 0;
let activeRecordKey = "";
let swimmerSearchQuery = "";
let selectedSearchSwimmerKey = "";
let followPublicProgress = true;
let lastAppliedPublicProgressKey = "";
const directResultSessionsLoaded = new Set();
const swimmerResultDetailsLoading = new Set();

const publicSwimmers = window.LivePalmesPublicSwimmers || {};
const {
  birthYearLabel,
  categoryClass,
  cleanText,
  finalStageLabel,
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

const formatPublicDateTime = (value) => publicSwimmers.formatPublicDateTime(value);

const setStatus = (label, className = "pending") => publicSwimmers.setStatus(statusBadge, label, className, { escapeHtml });

function publicSeriesCachePayload() {
  return {
    meet: publicMeet,
    events: publicEvents,
    program: publicProgram,
    entrants: publicEntrants,
    series: publicSeries,
    results: publicResults,
    forfaits: publicForfaits,
    records: publicRecords,
    qualifications: publicQualifications,
    seriesPdfs: publicSeriesPdfs,
    sessionInfos: publicSessionInfos,
    progress: publicProgress,
    publicIndexUpdatedAt
  };
}

function applyPublicSeriesSnapshot(snapshot = {}) {
  publicMeet = snapshot.meet || {};
  publicEvents = Array.isArray(snapshot.events) ? snapshot.events : [];
  publicProgram = Array.isArray(snapshot.program) ? snapshot.program : [];
  publicEntrants = Array.isArray(snapshot.entrants) ? snapshot.entrants : [];
  publicSeries = Array.isArray(snapshot.series) ? snapshot.series : [];
  publicResults = Array.isArray(snapshot.results) ? snapshot.results : [];
  publicForfaits = Array.isArray(snapshot.forfaits) ? snapshot.forfaits : [];
  publicRecords = Array.isArray(snapshot.records) ? snapshot.records : [];
  publicQualifications = Array.isArray(snapshot.qualifications) ? snapshot.qualifications : [];
  publicSeriesPdfs = Array.isArray(snapshot.seriesPdfs) ? snapshot.seriesPdfs : [];
  publicSessionInfos = snapshot.sessionInfos || {};
  publicProgress = snapshot.progress || null;
  publicIndexUpdatedAt = snapshot.publicIndexUpdatedAt || "";
}

function restorePublicSeriesCache() {
  const cached = publicSwimmers.loadPublicPageCache?.(PUBLIC_SERIES_CACHE_KEY, PUBLIC_CACHE_MAX_AGE_MS);
  if (!cached?.series?.length && !cached?.program?.length) return false;
  applyPublicSeriesSnapshot(cached);
  return true;
}

function savePublicSeriesCache() {
  if (!publicSeries.length && !publicProgram.length) return;
  publicSwimmers.savePublicPageCache?.(PUBLIC_SERIES_CACHE_KEY, publicSeriesCachePayload());
}

const sexLabel = (sex) => publicSwimmers.sexLabel(sex);

const eventLabel = (eventId, fallback = "") => publicSwimmers.eventLabel(publicEvents, eventId, fallback);

const programKey = (row) => publicSwimmers.programKey(row);

function progressMatchesRace(row) {
  return Boolean(publicProgressIsFresh() && row && (
    String(publicProgress.programKey || "") === String(programKey(row)) ||
    (
      publicProgress.eventId === row.eventId &&
      publicProgress.sex === row.sex &&
      (!publicProgress.session || !row.session || String(publicProgress.session) === String(row.session))
    )
  ));
}

function publicProgressIsFresh() {
  if (!publicProgress?.programKey || !publicProgress.updatedAt) return false;
  const updated = new Date(publicProgress.updatedAt);
  if (Number.isNaN(updated.getTime())) return false;
  return Date.now() - updated.getTime() <= PUBLIC_PROGRESS_MAX_AGE_MS;
}

function progressMatchesSeries(row, seriesNumber) {
  if (!progressMatchesRace(row)) return false;
  if (publicProgress.stage && isFinalStage(publicProgress.stage)) return false;
  return String(publicProgress.series || "") === String(seriesNumber || "");
}

function publicProgressTarget() {
  if (!publicProgressIsFresh()) return null;
  const races = raceRows();
  const raceIndex = races.findIndex((item) => progressMatchesRace(item));
  if (raceIndex < 0) return null;
  const numbers = seriesNumbers(seriesRowsForProgram(races[raceIndex] || {}));
  const seriesIndex = Math.max(0, numbers.findIndex((number) => progressMatchesSeries(races[raceIndex], number)));
  return { raceIndex, seriesIndex };
}

function publicProgressKey() {
  if (!publicProgressIsFresh()) return "";
  return [
    publicProgress.programKey || "",
    publicProgress.session || "",
    publicProgress.eventId || "",
    publicProgress.sex || "",
    publicProgress.stage || "",
    publicProgress.series || ""
  ].join("|");
}

function leavePublicProgressFollow() {
  followPublicProgress = false;
}

function renderPublicProgress() {
  if (!publicProgressIsFresh()) return "";
  const row = raceRows().find((item) => progressMatchesRace(item));
  const target = publicProgressTarget();
  const eventName = eventLabel(publicProgress.eventId, publicProgress.eventLabel || row?.label || "");
  const session = publicProgress.session ? `S${publicProgress.session}` : "";
  const phase = publicProgress.stage && isFinalStage(publicProgress.stage)
    ? "Finale"
    : `Série ${publicProgress.series || "-"}`;
  const sex = sexLabel(publicProgress.sex || row?.sex || "");
  return `
    <button class="panel public-progress-card" type="button" ${target ? `data-public-progress-race="${escapeHtml(String(target.raceIndex))}" data-public-progress-series="${escapeHtml(String(target.seriesIndex))}"` : "disabled"} aria-label="Aller à la série en cours">
      <span>En cours</span>
      <strong>${escapeHtml([session, eventName, sex, phase].filter(Boolean).join(" · "))}</strong>
    </button>
  `;
}

const swimmerKey = (row) => publicSwimmers.swimmerKey(row);

const entrantForSeriesRow = (row) => publicSwimmers.entrantForSeriesRow(row, publicEntrants);

const displaySeriesRow = (row) => publicSwimmers.displaySeriesRow(row, publicEntrants);

const swimmerName = (row) => publicSwimmers.swimmerName(row, publicEntrants);

const clubLabel = (row) => publicSwimmers.clubLabel(row, publicEntrants);

const lineLabel = (row) => publicSwimmers.lineLabel(row);

const seedLabel = (row) => publicSwimmers.seedLabel(row, publicEntrants);

const allPublicPerformances = () => publicSwimmers.allPublicPerformances(publicResults);

function performanceMatchesRow(performance, row) {
  return publicSwimmers.performanceMatchesRow(performance, row, publicSwimmerOptions());
}

function performancesForProgramRow(row) {
  return publicSwimmers.performancesForProgramRow(row, publicSwimmerOptions());
}

function recordFlag(record) {
  if (sameCategory(record.category, "Cadet")) return "MPF";
  if (sameCategory(record.category, "Junior")) return "RFJ";
  if (sameCategory(record.category, "Senior")) return "RF";
  return "REC";
}

function recordDisplayLabel(record) {
  return cleanText(record.label || "")
    .replace(/(^|[^A-Z0-9])M(\d+\+)(?=$|[^A-Z0-9])/gi, "$1H$2");
}

function shortRecordTitle(record) {
  const category = cleanText(record.category || "");
  if (sameCategory(category, "Cadet")) return record.sex === "F" ? "MPF cadette" : "MPF cadet";
  if (sameCategory(category, "Junior")) return "RFJ";
  if (sameCategory(category, "Senior")) return "RF";
  return recordDisplayLabel(record) || categoryLabel(category, record.sex) || category || "Record";
}

function recordKey(record) {
  return [record.eventId, record.sex, record.category, record.label, record.time].join("|").toLowerCase();
}

function recordDescription(record) {
  return [
    record.holder || "Titulaire a renseigner",
    record.club,
    record.date,
    record.place
  ].filter(Boolean).map(cleanText).join(" - ");
}

const rowStartTime = (row) => publicSwimmers.rowStartTime(row, publicProgram);

const sessions = () => publicSwimmers.publicSessions(publicProgram, publicSeries, { includeSeries: true });

function latestResultSession() {
  return publicSwimmers.latestResultSession(publicResults);
}

const publicResultFromDoc = (doc) => publicSwimmers.publicResultFromDoc(doc);

const publicCompetitionDocument = () => publicSwimmers.publicCompetitionDocument(FIREBASE_CONFIG, FIRESTORE_COMPETITION_ID);

function mergePublicResults(results = []) {
  publicResults = publicSwimmers.mergePublicResults(publicResults, results).results;
}

function rowsForSession(session) {
  return publicProgram
    .filter((row) => row.session === session && row.eventId && row.sex)
    .filter((row) => seriesRowsForProgram(row).length)
    .sort((a, b) => Number(a.order || 9999) - Number(b.order || 9999));
}

function fallbackRowsForSession(session) {
  const seen = new Set();
  return publicSeries
    .filter((row) => (!session || row.session === session) && row.eventId && row.sex)
    .sort((a, b) =>
      Number(a.heatOrder || a.series || 9999) - Number(b.heatOrder || b.series || 9999) ||
      Number(a.line || a.lane || 99) - Number(b.line || b.lane || 99)
    )
    .reduce((rows, row) => {
      const key = `${row.session || ""}|${row.eventId}|${row.sex}`;
      if (seen.has(key)) return rows;
      seen.add(key);
      rows.push({
        session: row.session || session,
        eventId: row.eventId,
        sex: row.sex,
        label: row.label || eventLabel(row.eventId),
        startTime: row.startTime || "",
        order: Number(row.heatOrder || rows.length + 1)
      });
      return rows;
    }, []);
}

function raceRows() {
  const rows = rowsForSession(activeSession);
  return rows.length ? rows : fallbackRowsForSession(activeSession);
}

function seriesRowsForProgram(program) {
  return publicSeries
    .filter((row) => row.eventId === program.eventId && row.sex === program.sex)
    .filter((row) => !program.session || !row.session || row.session === program.session)
    .filter((row) => !program.stage || program.stage === "series" || row.stage === program.stage || !row.stage)
    .sort((a, b) =>
      Number(a.heatOrder || a.series || 9999) - Number(b.heatOrder || b.series || 9999) ||
      Number(a.line || a.lane || 99) - Number(b.line || b.lane || 99)
    );
}

function seriesNumbers(rows = []) {
  return [...new Set(rows.map((row) => Number(row.series)).filter(Number.isFinite))].sort((a, b) => a - b);
}

function rowsForCurrentSeries(program, number) {
  return seriesRowsForProgram(program)
    .filter((row) => Number(row.series) === Number(number))
    .sort((a, b) => Number(lineLabel(a) || 99) - Number(lineLabel(b) || 99));
}

function isForfait(row) {
  if (publicSwimmers.isForfait(row)) return true;
  const key = swimmerKey(row);
  return publicForfaits.some((alert) =>
    alert.key === key ||
    (
      normalizeText(alert.name) === normalizeText(swimmerName(row)) &&
      (!alert.eventId || alert.eventId === row.eventId) &&
      (!alert.sex || alert.sex === row.sex)
    )
  );
}

function recordsForSeries(program, rows = []) {
  const categoryKey = (category, sex = program.sex) => normalizeText(categoryLabel(category, sex) || category);
  const recordCategory = (record) => {
    const direct = cleanText(record.category || "");
    if (direct) return direct;
    const label = recordDisplayLabel(record);
    if (/\bminimes?\b/i.test(label)) return "Minime";
    const master = label.match(/\b([FH]\d+\+)\b/i);
    return master ? master[1].toUpperCase() : "";
  };
  const categories = new Set(rows.map((row) => categoryKey(row.category, row.sex)).filter(Boolean));
  return publicRecords
    .filter((record) => recordEventMatches(record.eventId, program.eventId))
    .filter((record) => !record.sex || record.sex === program.sex || program.sex === "X")
    .filter((record) => {
      const category = recordCategory(record);
      return !categories.size || !category || categories.has(categoryKey(category, record.sex || program.sex));
    })
    .sort((a, b) => {
      const order = { cadet: 1, junior: 2, senior: 3 };
      return (order[normalizeText(a.category)] || 99) - (order[normalizeText(b.category)] || 99);
    });
}

function qualificationsForSeries(program) {
  return publicQualifications
    .filter((qualification) => recordEventMatches(qualification.eventId, program.eventId))
    .filter((qualification) => !qualification.sex || qualification.sex === program.sex || program.sex === "X")
    .sort((a, b) => timeToMs(a.time) - timeToMs(b.time));
}

function selectedRecordDetails(records) {
  if (!activeRecordKey) return "";
  const record = records.find((item) => recordKey(item) === activeRecordKey);
  if (!record) {
    activeRecordKey = "";
    return "";
  }
  return `
    <div class="header-ref-details public-series-record-detail">
      <div>
        <strong>${escapeHtml(shortRecordTitle(record))} - ${escapeHtml(record.time || "-")}</strong>
        <span>${escapeHtml(recordDescription(record))}</span>
      </div>
      <button class="icon-button close-ref-details" type="button" data-close-public-record aria-label="Fermer le detail">×</button>
    </div>
  `;
}

function renderReferences(program, rows = []) {
  const records = recordsForSeries(program, rows);
  const qualifications = qualificationsForSeries(program);
  if (!records.length && !qualifications.length) return "";
  return `
    <div class="header-refs public-series-records" aria-label="MPF et records de la course">
        ${records.map((record) => `
          <button class="ref-chip ref-chip-button ${categoryClass(record.category)} ${activeRecordKey === recordKey(record) ? "active-ref" : ""}" type="button" data-public-record-key="${escapeHtml(recordKey(record))}">
            <strong>${escapeHtml(shortRecordTitle(record))}</strong>
            ${escapeHtml(record.time || "-")}
          </button>
        `).join("")}
        ${qualifications.map((qualification) => `
          <span class="ref-chip qualification-chip">
            <strong>${escapeHtml(qualification.label || "EDF")}</strong>
            ${escapeHtml(qualification.time || "-")}
          </span>
        `).join("")}
    </div>
    ${selectedRecordDetails(records)}
  `;
}

function renderMeetTitle() {
  const city = cleanText(publicMeet.city || "");
  const year = cleanText(publicMeet.year || "");
  if (meetTitle) meetTitle.textContent = cleanText([city, year, "Séries"].filter(Boolean).join(" · ") || "Séries");
  if (meetMeta) {
    const pdf = seriesPdfForSession(activeSession);
    const date = pdf?.updatedAt ? new Date(pdf.updatedAt) : null;
    meetMeta.textContent = date && !Number.isNaN(date.getTime())
      ? `Séries mises à jour le ${formatPublicDateTime(pdf.updatedAt)}`
      : "Séries non mises à jour";
  }
}

function renderSessionInformation(session) {
  return publicSwimmers.renderSessionInformation(session, {
    infos: publicSessionInfos,
    escapeHtml
  });
}

function renderSessions() {
  const available = sessions();
  if (sessionsHost) {
    sessionsHost.innerHTML = available.map((session) => `
      <button class="session-chip ${session === activeSession ? "active" : ""}" type="button" data-series-session="${escapeHtml(session)}">S${escapeHtml(session)}</button>
    `).join("");
  }
  if (sessionSelect) {
    sessionSelect.innerHTML = available.map((session) => `
      <option value="${escapeHtml(session)}" ${session === activeSession ? "selected" : ""}>Session ${escapeHtml(session)}</option>
    `).join("");
    sessionSelect.disabled = available.length <= 1;
  }
  syncSeriesPdfInlineLink();
  if (sessionInfoHost) {
    sessionInfoHost.innerHTML = renderSessionInformation(activeSession);
  }
}

function clampState() {
  const availableSessions = sessions();
  if (!activeSession || !availableSessions.includes(activeSession)) {
    const progressSession = publicProgressIsFresh() ? String(publicProgress.session || "") : "";
    activeSession = (progressSession && availableSessions.includes(progressSession))
      ? progressSession
      : (latestResultSession() || availableSessions[0] || "");
  }
  const races = raceRows();
  activeRaceIndex = Math.max(0, Math.min(activeRaceIndex, Math.max(0, races.length - 1)));
  const numbers = seriesNumbers(seriesRowsForProgram(races[activeRaceIndex] || {}));
  activeSeriesIndex = Math.max(0, Math.min(activeSeriesIndex, Math.max(0, numbers.length - 1)));
  const progress = publicProgressTarget();
  const progressKey = publicProgressKey();
  if (progress && progressKey && String(publicProgress.session || "") === String(activeSession || "") && (followPublicProgress || progressKey !== lastAppliedPublicProgressKey)) {
    activeRaceIndex = progress.raceIndex;
    activeSeriesIndex = progress.seriesIndex;
    lastAppliedPublicProgressKey = progressKey;
    followPublicProgress = true;
  }
}

function publicNavigationState(races, numbers) {
  const atFirstSeries = activeSeriesIndex <= 0;
  const atLastSeries = activeSeriesIndex >= Math.max(0, numbers.length - 1);
  const hasPreviousRace = activeRaceIndex > 0;
  const hasNextRace = activeRaceIndex < races.length - 1;
  return {
    previousLabel: atFirstSeries ? "← Course précédente" : "← Série précédente",
    nextLabel: atLastSeries ? "Course suivante →" : "Série suivante →",
    previousDisabled: atFirstSeries && !hasPreviousRace,
    nextDisabled: !numbers.length || (atLastSeries && !hasNextRace)
  };
}

function goToNextPublicSeries() {
  const races = raceRows();
  const race = races[activeRaceIndex];
  const numbers = seriesNumbers(seriesRowsForProgram(race || {}));
  if (!races.length || !numbers.length) return;
  leavePublicProgressFollow();
  if (activeSeriesIndex < numbers.length - 1) {
    activeSeriesIndex += 1;
  } else if (activeRaceIndex < races.length - 1) {
    activeRaceIndex += 1;
    activeSeriesIndex = 0;
  }
  activeRecordKey = "";
  render();
}

function goToPreviousPublicSeries() {
  const races = raceRows();
  const race = races[activeRaceIndex];
  const numbers = seriesNumbers(seriesRowsForProgram(race || {}));
  if (!races.length || !numbers.length) return;
  leavePublicProgressFollow();
  if (activeSeriesIndex > 0) {
    activeSeriesIndex -= 1;
  } else if (activeRaceIndex > 0) {
    activeRaceIndex -= 1;
    const previousRace = races[activeRaceIndex];
    const previousNumbers = seriesNumbers(seriesRowsForProgram(previousRace || {}));
    activeSeriesIndex = Math.max(0, previousNumbers.length - 1);
  }
  activeRecordKey = "";
  render();
}

const categoryLabel = (category, sex) => publicSwimmers.categoryLabel(category, sex);

function renderSeriesRows(rows) {
  if (!rows.length) {
    return `<tr><td colspan="4" class="public-series-empty-line">Aucune ligne trouvée pour cette série.</td></tr>`;
  }
  return rows.map((row) => {
    const displayRow = displaySeriesRow(row);
    const forfait = isForfait(row);
    return `
      <tr class="public-series-table-row ${forfait ? "is-forfait" : ""}" data-swimmer-key="${escapeHtml(swimmerKey(row))}">
        <td><span class="public-series-line">${escapeHtml(lineLabel(row))}</span></td>
        <td>
          <button class="public-series-name-button" type="button">
            <strong>${escapeHtml(swimmerName(displayRow))}</strong>
            <span>${escapeHtml(clubLabel(displayRow) || "-")}</span>
          </button>
        </td>
        <td><span class="public-series-category ${categoryClass(displayRow.category)}">${escapeHtml(categoryLabel(displayRow.category, displayRow.sex) || "-")}</span></td>
        <td>${forfait ? `<span class="public-series-forfait">Forfait</span>` : `<strong>${escapeHtml(seedLabel(displayRow) || "-")}</strong>`}</td>
      </tr>
    `;
  }).join("");
}

const searchSwimmers = (query) => publicSwimmers.searchSwimmers(query, publicSeries, { entrants: publicEntrants, limit: 8 });

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
    query: swimmerSearchQuery,
    selectedKey: selectedSearchSwimmerKey,
    matches: searchSwimmers(swimmerSearchQuery),
    renderProgram: renderInlineSwimmerProgram
  }));
}

const seriesPdfForSession = (session) => publicSwimmers.seriesPdfForSession(publicSeriesPdfs, session);

function syncSeriesPdfInlineLink() {
  if (!seriesPdfInlineLink) return;
  const pdf = seriesPdfForSession(activeSession);
  if (!pdf?.id) {
    seriesPdfInlineLink.hidden = true;
    seriesPdfInlineLink.removeAttribute("href");
    return;
  }
  const label = pdf.scope === "session" ? `PDF séries S${activeSession || "-"}` : "PDF séries";
  const updated = pdf.updatedAt ? formatPublicDateTime(pdf.updatedAt) : "";
  seriesPdfInlineLink.hidden = false;
  seriesPdfInlineLink.href = `pdf.html?type=series&id=${encodeURIComponent(pdf.id || "")}`;
  seriesPdfInlineLink.textContent = [label, updated].filter(Boolean).join(" · ");
}

function raceSelectLabel(row) {
  const phase = isFinalStage(row.stage) ? ` · ${finalStageLabel(row.stage)}` : "";
  return `${eventLabel(row.eventId, row.label)} ${sexLabel(row.sex)}${phase}`;
}

function render() {
  if (!app) return;
  clampState();
  renderMeetTitle();
  renderSessions();
  const races = raceRows();
  if (!races.length) {
    app.innerHTML = `<section class="panel"><p class="panel-subtitle">Aucune série publique disponible.</p></section>`;
    return;
  }
  const race = races[activeRaceIndex];
  const allRows = seriesRowsForProgram(race);
  const numbers = seriesNumbers(allRows);
  const currentNumber = numbers[activeSeriesIndex] || numbers[0] || "";
  const currentRows = rowsForCurrentSeries(race, currentNumber);
  const time = race.startTime || currentRows.find((row) => row.startTime)?.startTime || rowStartTime(race);
  const navigation = publicNavigationState(races, numbers);
  const phaseTitle = isFinalStage(race.stage)
    ? finalStageLabel(race.stage)
    : `Série ${String(currentNumber || "-")}/${String(numbers.length || 1)}`;
  app.innerHTML = `
    ${renderPublicProgress()}

    <section class="panel public-series-console-controls">
      <label class="public-series-race-select">
        <span>Courses</span>
        <select id="publicSeriesRaceSelect">
          ${races.map((row, index) => `
            <option value="${escapeHtml(String(index))}" ${index === activeRaceIndex ? "selected" : ""}>
              ${escapeHtml(raceSelectLabel(row))}
            </option>
          `).join("")}
        </select>
      </label>
      <div class="public-series-chip-field">
        <span>S&eacute;ries</span>
        <div class="public-series-chip-row">
          ${numbers.map((number, index) => {
            const rows = rowsForCurrentSeries(race, number);
            const heatTime = rows.find((row) => row.startTime)?.startTime || time || "";
            const current = progressMatchesSeries(race, number);
            return `
              <button class="series-chip ${index === activeSeriesIndex ? "active" : ""} ${current ? "public-current-chip" : ""}" type="button" data-public-series-index="${escapeHtml(String(index))}">
                <span>${escapeHtml(String(number))}</span>
                ${heatTime ? `<em>${escapeHtml(heatTime)}</em>` : ""}
                ${current ? `<strong>En cours</strong>` : ""}
              </button>
            `;
          }).join("")}
        </div>
      </div>
    </section>

    <section class="panel public-series-board">
      <div class="public-series-board-head">
        <div>
          <h2>${escapeHtml(eventLabel(race.eventId, race.label))} · ${escapeHtml(sexLabel(race.sex))} · ${escapeHtml(phaseTitle)}</h2>
          <p>${escapeHtml(String(currentRows.length))} engagé${currentRows.length > 1 ? "s" : ""}${time ? ` · ${escapeHtml(time)}` : ""} · horaires indicatifs</p>
          ${renderReferences(race, currentRows)}
        </div>
        <div class="public-series-nav-actions">
          <button class="ghost-button compact" type="button" data-public-series-previous ${navigation.previousDisabled ? "disabled" : ""}>${escapeHtml(navigation.previousLabel)}</button>
          <button class="primary-button compact" type="button" data-public-series-next ${navigation.nextDisabled ? "disabled" : ""}>${escapeHtml(navigation.nextLabel)}</button>
        </div>
      </div>
      <div class="public-series-table-wrap">
        <table class="public-series-table">
          <thead>
            <tr>
              <th>Ligne</th>
              <th>Nageur</th>
              <th>Cat.</th>
              <th>Temps</th>
            </tr>
          </thead>
          <tbody>${renderSeriesRows(currentRows)}</tbody>
        </table>
      </div>
    </section>
    ${renderSwimmerSearchSection()}
  `;
}

function swimmerProgramRows(key) {
  return publicSwimmers.swimmerProgramRows(key, publicSeries, publicSwimmerOptions());
}

function renderSwimmerSheet(key) {
  const rows = swimmerProgramRows(key);
  if (!rows[0] || !swimmerSheet) return;
  const loadingResults = swimmerResultsAreLoading(key);
  swimmerSheet.hidden = false;
  swimmerSheet.innerHTML = publicSwimmers.renderSwimmerSheet(key, publicSwimmerOptions({
    rows,
    loading: loadingResults,
    closeAttr: "data-close-swimmer",
    closeButtonClass: "decision-close",
    label: "Programme nageur",
    subtitle: "Programme du week-end &middot; horaires indicatifs"
  }));
}

async function openSwimmerSheet(key) {
  renderSwimmerSheet(key);
  await ensureSwimmerResultDetails(key);
  renderSwimmerSheet(key);
}
function closeSwimmerSheet() {
  if (!swimmerSheet) return;
  swimmerSheet.hidden = true;
  swimmerSheet.innerHTML = "";
}

function renderProgramSheet() {
  if (!programSheet) return;
  const races = raceRows();
  programSheet.hidden = false;
  programSheet.innerHTML = `
    <div class="public-swimmer-backdrop" data-close-program></div>
    <section class="public-swimmer-panel public-program-panel" role="dialog" aria-modal="true" aria-label="Programme de la session">
      <div class="public-swimmer-head">
        <div>
          <span>Session ${escapeHtml(activeSession || "-")}</span>
          <h2>Programme</h2>
        </div>
        <button class="decision-close" type="button" data-close-program aria-label="Fermer">×</button>
      </div>
      <div class="public-program-list">
        ${races.map((race, index) => {
          const rows = seriesRowsForProgram(race);
          const numbers = seriesNumbers(rows);
          const time = race.startTime || rows.find((row) => row.startTime)?.startTime || "";
          return `
            <button class="public-program-row ${index === activeRaceIndex ? "active" : ""}" type="button" data-program-race-index="${escapeHtml(String(index))}">
              <span>${escapeHtml(time || "--:--")}</span>
              <strong>${escapeHtml(eventLabel(race.eventId, race.label))} ${escapeHtml(sexLabel(race.sex))}</strong>
              <em>${escapeHtml(String(numbers.length || 0))} série${numbers.length > 1 ? "s" : ""}</em>
            </button>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function closeProgramSheet() {
  if (!programSheet) return;
  programSheet.hidden = true;
  programSheet.innerHTML = "";
}

function sanitizeForfaitAlert(alert) {
  if (!alert || alert.type !== "forfait" || alert.cancelledAt) return null;
  return {
    key: alert.swimmerId ? `id:${alert.swimmerId}` : "",
    name: alert.swimmerName || alert.identity || alert.displayName || "",
    eventId: alert.eventId || "",
    sex: alert.sex || ""
  };
}

function sessionInfosFromLiveOrIndex(remote = {}, index = {}, fallback = {}) {
  if (remote.notes && Object.prototype.hasOwnProperty.call(remote.notes, "publicSessionInfos")) {
    return remote.notes.publicSessionInfos || {};
  }
  return index.sessionInfos || fallback || {};
}

async function loadPublicForfaits(competition) {
  try {
    const snapshot = await competition.collection("alerts").where("type", "==", "forfait").get({ source: "server" });
    publicForfaits = snapshot.docs.map((doc) => sanitizeForfaitAlert(doc.data())).filter(Boolean);
  } catch (error) {
    console.warn("Lecture forfaits publics impossible", error);
    publicForfaits = [];
  }
}

async function loadPublicSessionResultsDirectData(competition, session) {
  const cleanSession = String(session || "").trim();
  if (!cleanSession || directResultSessionsLoaded.has(cleanSession)) return;
  const snapshot = await competition.collection("results")
    .where("session", "==", cleanSession)
    .get({ source: "server" });
  mergePublicResults(snapshot.docs.map(publicResultFromDoc));
  directResultSessionsLoaded.add(cleanSession);
}

function swimmerResultSessions(key) {
  return publicSwimmers.swimmerResultSessions(key, publicSwimmerOptions({ series: publicSeries }));
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

async function refreshPublicSeriesSessionResults(session) {
  const cleanSession = String(session || "").trim();
  if (!cleanSession || directResultSessionsLoaded.has(cleanSession)) return;
  if (!window.firebase?.initializeApp || !window.firebase?.firestore) return;
  if (!window.firebase.apps?.length) {
    window.firebase.initializeApp(FIREBASE_CONFIG);
  }
  const db = window.firebase.firestore();
  const competition = db.collection("competitions").doc(FIRESTORE_COMPETITION_ID);
  try {
    setStatus("Actualisation", "pending");
    await loadPublicSessionResultsDirectData(competition, cleanSession);
    setStatus("ConnectÃ©", "ok");
    render();
  } catch (error) {
    console.warn("Lecture des rÃ©sultats de session impossible", error);
    setStatus("Erreur", "error");
  }
}

const liveDataIsNewerThanPublicIndex = (remote, index) => publicSwimmers.liveDataIsNewerThanPublicIndex(remote, index);

function applyLiveData(remote, index = {}) {
  publicMeet = remote.meet || publicMeet;
  publicProgram = Array.isArray(remote.program) ? remote.program : publicProgram;
  publicEvents = Array.isArray(remote.events) ? remote.events : publicEvents;
  publicEntrants = Array.isArray(remote.entrants) ? remote.entrants : publicEntrants;
  publicSeries = Array.isArray(remote.series) ? remote.series : publicSeries;
  publicResults = Array.isArray(index.results) ? index.results : publicResults;
  publicSeriesPdfs = Array.isArray(remote.notes?.publicSeriesPdfs)
    ? remote.notes.publicSeriesPdfs
    : (Array.isArray(index.seriesPdfs) ? index.seriesPdfs : publicSeriesPdfs);
  publicSessionInfos = sessionInfosFromLiveOrIndex(remote, index, publicSessionInfos);
  publicProgress = remote.notes?.publicProgress || publicProgress;
  publicRecords = Array.isArray(remote.records) ? remote.records : publicRecords;
  publicQualifications = Array.isArray(remote.qualifications) ? remote.qualifications : publicQualifications;
  publicIndexUpdatedAt = remote.notes?.livePublishedAt || index.updatedAt || publicIndexUpdatedAt || "";
}

async function loadPublicSeries({ forceLive = false } = {}) {
  if (!window.firebase?.initializeApp || !window.firebase?.firestore) {
    setStatus("Local", "pending");
    if (app) app.innerHTML = `<section class="panel"><p class="panel-subtitle">Firebase n'est pas disponible sur cette page.</p></section>`;
    return;
  }
  if (!window.firebase.apps?.length) {
    window.firebase.initializeApp(FIREBASE_CONFIG);
  }
  const db = window.firebase.firestore();
  const competition = db.collection("competitions").doc(FIRESTORE_COMPETITION_ID);
  const [indexSnapshot, liveSnapshot] = await Promise.all([
    competition.collection("public").doc("resultsIndex").get({ source: "server" }),
    competition.collection("liveData").doc("current").get({ source: "server" })
  ]);
  const index = indexSnapshot.data() || {};
  const remote = liveSnapshot.data()?.data || {};
  publicMeet = index.meet || {};
  publicProgram = Array.isArray(index.program) ? index.program : [];
  publicEvents = Array.isArray(index.events) ? index.events : [];
  publicEntrants = Array.isArray(remote.entrants) ? remote.entrants : [];
  publicSeries = Array.isArray(index.series) ? index.series : [];
  publicResults = Array.isArray(index.results) ? index.results : [];
  publicSeriesPdfs = Array.isArray(index.seriesPdfs) ? index.seriesPdfs : [];
  publicSessionInfos = sessionInfosFromLiveOrIndex(remote, index, {});
  publicProgress = remote.notes?.publicProgress || null;
  publicRecords = Array.isArray(remote.records) ? remote.records : [];
  publicQualifications = Array.isArray(remote.qualifications) ? remote.qualifications : [];
  publicIndexUpdatedAt = index.updatedAt || "";
  if (forceLive || !indexSnapshot.exists || !publicSeries.length || liveDataIsNewerThanPublicIndex(remote, index)) {
    applyLiveData(remote, index);
  }
  clampState();
  setStatus("Actualisation", "pending");
  savePublicSeriesCache();
  render();
  await Promise.all([
    loadPublicForfaits(competition),
    loadPublicSessionResultsDirectData(competition, activeSession)
  ]);
  setStatus("Connecté", "ok");
  savePublicSeriesCache();
  render();
}

sessionsHost?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-series-session]");
  if (!button) return;
  leavePublicProgressFollow();
  activeSession = button.dataset.seriesSession;
  activeRaceIndex = 0;
  activeSeriesIndex = 0;
  activeRecordKey = "";
  render();
  refreshPublicSeriesSessionResults(activeSession);
});

sessionSelect?.addEventListener("change", (event) => {
  leavePublicProgressFollow();
  activeSession = event.target.value || "";
  activeRaceIndex = 0;
  activeSeriesIndex = 0;
  activeRecordKey = "";
  render();
  refreshPublicSeriesSessionResults(activeSession);
});

app?.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-public-record]")) {
    activeRecordKey = "";
    render();
    return;
  }
  const progressButton = event.target.closest("[data-public-progress-race]");
  if (progressButton) {
    followPublicProgress = true;
    lastAppliedPublicProgressKey = publicProgressKey();
    activeRaceIndex = Number(progressButton.dataset.publicProgressRace) || 0;
    activeSeriesIndex = Number(progressButton.dataset.publicProgressSeries) || 0;
    activeRecordKey = "";
    render();
    return;
  }
  const recordButton = event.target.closest("[data-public-record-key]");
  if (recordButton) {
    const key = recordButton.dataset.publicRecordKey || "";
    activeRecordKey = activeRecordKey === key ? "" : key;
    render();
    return;
  }
  if (event.target.closest("[data-public-series-previous]")) {
    goToPreviousPublicSeries();
    return;
  }
  if (event.target.closest("[data-public-series-next]")) {
    goToNextPublicSeries();
    return;
  }
  const seriesButton = event.target.closest("[data-public-series-index]");
  if (seriesButton) {
    leavePublicProgressFollow();
    activeSeriesIndex = Number(seriesButton.dataset.publicSeriesIndex) || 0;
    activeRecordKey = "";
    render();
    return;
  }
  const searchSwimmerButton = event.target.closest("[data-search-swimmer-key]");
  if (searchSwimmerButton) {
    selectedSearchSwimmerKey = searchSwimmerButton.dataset.searchSwimmerKey || "";
    const output = document.querySelector("#publicSwimmerSearchOutput");
    if (output) output.innerHTML = renderSwimmerSearchContent();
    ensureSwimmerResultDetails(selectedSearchSwimmerKey)
      .then(() => {
        const refreshedOutput = document.querySelector("#publicSwimmerSearchOutput");
        if (refreshedOutput && selectedSearchSwimmerKey === searchSwimmerButton.dataset.searchSwimmerKey) {
          refreshedOutput.innerHTML = renderSwimmerSearchContent();
        }
      })
      .catch((error) => {
        console.warn("Chargement des résultats nageur impossible", error);
        setStatus("Erreur", "error");
      });
    return;
  }
  const swimmerButton = event.target.closest("[data-swimmer-key]");
  if (swimmerButton) {
    openSwimmerSheet(swimmerButton.dataset.swimmerKey).catch((error) => {
      console.warn("Chargement fiche nageur impossible", error);
      setStatus("Erreur", "error");
    });
  }
});

app?.addEventListener("input", (event) => {
  if (!event.target?.matches("#publicSwimmerSearchInput")) return;
  swimmerSearchQuery = event.target.value || "";
  selectedSearchSwimmerKey = "";
  const output = document.querySelector("#publicSwimmerSearchOutput");
  if (output) output.innerHTML = renderSwimmerSearchContent();
});

app?.addEventListener("change", (event) => {
  if (event.target?.matches("#publicSeriesRaceSelect")) {
    leavePublicProgressFollow();
    activeRaceIndex = Number(event.target.value) || 0;
    activeSeriesIndex = 0;
    activeRecordKey = "";
    render();
  }
});

swimmerSheet?.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-swimmer]")) closeSwimmerSheet();
});

programSheet?.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-program]")) {
    closeProgramSheet();
    return;
  }
  const row = event.target.closest("[data-program-race-index]");
  if (row) {
    activeRaceIndex = Number(row.dataset.programRaceIndex) || 0;
    activeSeriesIndex = 0;
    activeRecordKey = "";
    closeProgramSheet();
    render();
  }
});

programBtn?.addEventListener("click", renderProgramSheet);

function refreshPublicSeries() {
  setStatus("Actualisation", "pending");
  if (activeSession) directResultSessionsLoaded.delete(String(activeSession));
  loadPublicSeries({ forceLive: true }).catch((error) => {
    console.warn("Actualisation séries publiques impossible", error);
    setStatus("Erreur", "error");
  });
}

refreshBtn?.addEventListener("click", refreshPublicSeries);
refreshFloatBtn?.addEventListener("click", refreshPublicSeries);

if (restorePublicSeriesCache()) {
  setStatus("Actualisation", "pending");
  clampState();
  render();
}

loadPublicSeries().catch((error) => {
  console.warn("Lecture séries publiques impossible", error);
  setStatus("Erreur", "error");
  if (app) app.innerHTML = `<section class="panel"><p class="panel-subtitle">Impossible de charger les séries publiques.</p></section>`;
});
