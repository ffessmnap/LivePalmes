const FIRESTORE_COMPETITION_ID = "livepalmes-active";
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC4sh5R8eU9SAnEsqyji6aJKnpUGgbE-AM",
  authDomain: "livepalmes.firebaseapp.com",
  projectId: "livepalmes",
  storageBucket: "livepalmes.firebasestorage.app",
  messagingSenderId: "718081132564",
  appId: "1:718081132564:web:618d1e95b6d6aefa4ebf01"
};

const meetTitle = document.querySelector("#publicSeriesMeetTitle");
const meetMeta = document.querySelector("#publicSeriesMeetMeta");
const app = document.querySelector("#publicSeriesApp");
const sessionsHost = document.querySelector("#publicSeriesSessions");
const sessionSelect = document.querySelector("#publicSeriesSessionSelect");
const statusBadge = document.querySelector("#publicSeriesStatus");
const refreshBtn = document.querySelector("#refreshPublicSeriesBtn");
const programBtn = document.querySelector("#publicSeriesProgramBtn");
const swimmerSheet = document.querySelector("#publicSwimmerSheet");
const programSheet = document.querySelector("#publicProgramSheet");

let publicMeet = {};
let publicEvents = [];
let publicProgram = [];
let publicSeries = [];
let publicForfaits = [];
let publicRecords = [];
let publicQualifications = [];
let publicIndexUpdatedAt = "";
let activeSession = "";
let activeRaceIndex = 0;
let activeSeriesIndex = 0;
let activeRecordKey = "";
let swimmerSearchQuery = "";
let selectedSearchSwimmerKey = "";

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
    .replaceAll("ÃƒÂ©", "é")
    .replaceAll("ÃƒÂ¨", "è")
    .replaceAll("ÃƒÂª", "ê")
    .replaceAll("ÃƒÂ«", "ë")
    .replaceAll("Ãƒ ", "à")
    .replaceAll("ÃƒÂ¢", "â")
    .replaceAll("ÃƒÂ¹", "ù")
    .replaceAll("ÃƒÂ»", "û")
    .replaceAll("ÃƒÂ®", "î")
    .replaceAll("ÃƒÂ¯", "ï")
    .replaceAll("ÃƒÂ´", "ô")
    .replaceAll("ÃƒÂ§", "ç");
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

function sexLabel(sex) {
  if (sex === "F") return "Femmes";
  if (sex === "M") return "Hommes";
  return "Mixte";
}

function isFinalStage(stage) {
  const value = String(stage || "");
  return value === "finalA" || value === "finalB" || value.startsWith("finale");
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

function eventLabel(eventId, fallback = "") {
  return cleanText(publicEvents.find((event) => event.id === eventId)?.label || fallback || eventId || "Course");
}

function programKey(row) {
  return [row.order, row.session || "", row.eventId, row.sex, row.stage || "series"].join("|");
}

function swimmerKey(row) {
  if (row.swimmerId) return `id:${row.swimmerId}`;
  return normalizeText([row.lastName, row.firstName, row.name, row.club].filter(Boolean).join("|"));
}

function swimmerName(row) {
  const last = cleanText(row.lastName || "").trim().toLocaleUpperCase("fr-FR");
  const first = cleanText(row.firstName || "").trim();
  return [last, first].filter(Boolean).join(" ").trim() || cleanText(row.name || row.displayName || "Nageur");
}

function clubLabel(row) {
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
  return cleanText(row.seedTime || row.time || row.entryTime || "");
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

function sameCategory(a, b) {
  return normalizeText(a) === normalizeText(b);
}

function recordFlag(record) {
  if (sameCategory(record.category, "Cadet")) return "MPF";
  if (sameCategory(record.category, "Junior")) return "RFJ";
  if (sameCategory(record.category, "Senior")) return "RF";
  return "REC";
}

function categoryClass(category) {
  if (sameCategory(category, "Cadet")) return "cat-cadet";
  if (sameCategory(category, "Junior")) return "cat-junior";
  if (sameCategory(category, "Senior")) return "cat-senior";
  return "cat-other";
}

function shortRecordTitle(record) {
  const category = cleanText(record.category || "");
  if (sameCategory(category, "Cadet")) return record.sex === "F" ? "MPF cadette" : "MPF cadet";
  if (sameCategory(category, "Junior")) return "RFJ";
  if (sameCategory(category, "Senior")) return "RF";
  return cleanText(record.label || category || "Record");
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

function sessions() {
  const values = new Set([
    ...publicProgram.map((row) => row.session),
    ...publicSeries.map((row) => row.session)
  ].filter(Boolean));
  return [...values].sort((a, b) => Number(a) - Number(b));
}

function rowsForSession(session) {
  return publicProgram
    .filter((row) => row.session === session && row.eventId && row.sex && !isFinalStage(row.stage))
    .filter((row) => seriesRowsForProgram(row).length)
    .sort((a, b) => Number(a.order || 9999) - Number(b.order || 9999));
}

function fallbackRowsForSession(session) {
  const seen = new Set();
  return publicSeries
    .filter((row) => (!session || row.session === session) && row.eventId && row.sex && !isFinalStage(row.stage))
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
    .filter((row) => !isFinalStage(row.stage))
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
  if (normalizeText(row.importedStatus || row.status || row.statusLabel || row.note).includes("forfait")) return true;
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
  const categories = new Set(rows.map((row) => normalizeText(row.category)).filter(Boolean));
  return publicRecords
    .filter((record) => recordEventMatches(record.eventId, program.eventId))
    .filter((record) => !record.sex || record.sex === program.sex || program.sex === "X")
    .filter((record) => !categories.size || !record.category || categories.has(normalizeText(record.category)))
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
  const name = cleanText(publicMeet.name || "");
  const city = cleanText(publicMeet.city || "");
  const year = cleanText(publicMeet.year || "");
  const parts = [name, city].filter(Boolean);
  if (year && !parts.some((part) => new RegExp(`\\b${year}\\b`).test(part))) parts.push(year);
  if (meetTitle) meetTitle.textContent = cleanText(parts.join(" - ") || "Séries publiques");
  if (meetMeta) {
    const date = publicIndexUpdatedAt ? new Date(publicIndexUpdatedAt) : null;
    meetMeta.textContent = date && !Number.isNaN(date.getTime())
      ? `Séries mises à jour le ${date.toLocaleString("fr-FR")}`
      : "Séries non mises à jour";
  }
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
}

function clampState() {
  const availableSessions = sessions();
  if (!activeSession || !availableSessions.includes(activeSession)) {
    activeSession = availableSessions[0] || "";
  }
  const races = raceRows();
  activeRaceIndex = Math.max(0, Math.min(activeRaceIndex, Math.max(0, races.length - 1)));
  const numbers = seriesNumbers(seriesRowsForProgram(races[activeRaceIndex] || {}));
  activeSeriesIndex = Math.max(0, Math.min(activeSeriesIndex, Math.max(0, numbers.length - 1)));
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

function categoryLabel(category, sex) {
  if (sameCategory(category, "Cadet")) return sex === "F" ? "Cadette" : "Cadet";
  if (sameCategory(category, "Junior")) return "Junior";
  if (sameCategory(category, "Senior")) return "Senior";
  return cleanText(category || "");
}

function renderSeriesRows(rows) {
  if (!rows.length) {
    return `<tr><td colspan="4" class="public-series-empty-line">Aucune ligne trouvée pour cette série.</td></tr>`;
  }
  return rows.map((row) => {
    const forfait = isForfait(row);
    return `
      <tr class="public-series-table-row ${forfait ? "is-forfait" : ""}" data-swimmer-key="${escapeHtml(swimmerKey(row))}">
        <td><span class="public-series-line">${escapeHtml(lineLabel(row))}</span></td>
        <td>
          <button class="public-series-name-button" type="button">
            <strong>${escapeHtml(swimmerName(row))}</strong>
            <span>${escapeHtml(clubLabel(row) || "-")}</span>
          </button>
        </td>
        <td><span class="public-series-category ${categoryClass(row.category)}">${escapeHtml(categoryLabel(row.category, row.sex) || "-")}</span></td>
        <td>${forfait ? `<span class="public-series-forfait">Forfait</span>` : `<strong>${escapeHtml(seedLabel(row) || "-")}</strong>`}</td>
      </tr>
    `;
  }).join("");
}

function allSearchSwimmers() {
  const seen = new Set();
  return publicSeries
    .filter((row) => !isFinalStage(row.stage))
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

function renderInlineSwimmerProgram(key) {
  const rows = swimmerProgramRows(key);
  const swimmer = rows[0];
  if (!swimmer) return "";
  return `
    <div class="public-search-program">
      <div class="public-search-program-head">
        <span>${escapeHtml(clubLabel(swimmer) || "-")}</span>
        <strong>${escapeHtml(swimmerName(swimmer))}</strong>
      </div>
      <div class="public-swimmer-program">
        ${rows.map((row) => {
          const time = row.startTime || rowStartTime(row);
          const forfait = isForfait(row);
          return `
            <div class="public-swimmer-program-row ${forfait ? "is-forfait" : ""}">
              <strong>S${escapeHtml(row.session || "-")}${time ? ` · ${escapeHtml(time)}` : ""} · ${escapeHtml(eventLabel(row.eventId, row.label))} ${escapeHtml(sexLabel(row.sex))}</strong>
              <span>S&eacute;rie ${escapeHtml(row.series || "-")} · Ligne ${escapeHtml(lineLabel(row))} · ${forfait ? "Forfait" : escapeHtml(seedLabel(row) || "-")}</span>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function renderSwimmerSearchContent() {
  const matches = searchSwimmers(swimmerSearchQuery);
  const selectedStillVisible = matches.some((row) => swimmerKey(row) === selectedSearchSwimmerKey);
  if (selectedSearchSwimmerKey && !selectedStillVisible && normalizeText(swimmerSearchQuery).length >= 2) {
    selectedSearchSwimmerKey = "";
  }
  if (normalizeText(swimmerSearchQuery).length < 2) {
    return `<p class="panel-subtitle public-search-empty">Tape au moins 2 lettres pour chercher un nageur.</p>`;
  }
  if (!matches.length) {
    return `<p class="panel-subtitle public-search-empty">Aucun nageur trouv&eacute;.</p>`;
  }
  return `
    <div class="public-search-results" aria-label="Nageurs trouv&eacute;s">
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
    ${selectedSearchSwimmerKey ? renderInlineSwimmerProgram(selectedSearchSwimmerKey) : ""}
  `;
}

function renderSwimmerSearchSection() {
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

function raceSelectLabel(row) {
  const time = row.startTime ? `${row.startTime} · ` : "";
  return `${time}${eventLabel(row.eventId, row.label)} ${sexLabel(row.sex)}`;
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
  app.innerHTML = `
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
            return `
              <button class="series-chip ${index === activeSeriesIndex ? "active" : ""}" type="button" data-public-series-index="${escapeHtml(String(index))}">
                <span>${escapeHtml(String(number))}</span>
                ${heatTime ? `<em>${escapeHtml(heatTime)}</em>` : ""}
              </button>
            `;
          }).join("")}
        </div>
      </div>
    </section>

    <section class="panel public-series-board">
      <div class="public-series-board-head">
        <div>
          <h2>${escapeHtml(eventLabel(race.eventId, race.label))} · ${escapeHtml(sexLabel(race.sex))} · Série ${escapeHtml(String(currentNumber || "-"))}/${escapeHtml(String(numbers.length || 1))}</h2>
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
  return publicSeries
    .filter((row) => swimmerKey(row) === key)
    .filter((row) => !isFinalStage(row.stage))
    .sort((a, b) =>
      Number(a.session || 999) - Number(b.session || 999) ||
      Number(a.heatOrder || a.series || 9999) - Number(b.heatOrder || b.series || 9999)
    );
}

function renderSwimmerSheet(key) {
  const rows = swimmerProgramRows(key);
  const swimmer = rows[0];
  if (!swimmer || !swimmerSheet) return;
  swimmerSheet.hidden = false;
  swimmerSheet.innerHTML = `
    <div class="public-swimmer-backdrop" data-close-swimmer></div>
    <section class="public-swimmer-panel" role="dialog" aria-modal="true" aria-label="Programme nageur">
      <div class="public-swimmer-head">
        <div>
          <span>${escapeHtml(clubLabel(swimmer))}</span>
          <h2>${escapeHtml(swimmerName(swimmer))}</h2>
        </div>
        <button class="decision-close" type="button" data-close-swimmer aria-label="Fermer">×</button>
      </div>
      <p class="panel-subtitle">Programme du week-end · horaires indicatifs</p>
      <div class="public-swimmer-program">
        ${rows.map((row) => {
          const time = row.startTime || rowStartTime(row);
          const forfait = isForfait(row);
          return `
            <div class="public-swimmer-program-row ${forfait ? "is-forfait" : ""}">
              <strong>S${escapeHtml(row.session || "-")}${time ? ` · ${escapeHtml(time)}` : ""} · ${escapeHtml(eventLabel(row.eventId, row.label))} ${escapeHtml(sexLabel(row.sex))}</strong>
              <span>Série ${escapeHtml(row.series || "-")} · Ligne ${escapeHtml(lineLabel(row))} · ${forfait ? "Forfait" : escapeHtml(seedLabel(row) || "-")}</span>
            </div>
          `;
        }).join("")}
      </div>
    </section>
  `;
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

async function loadPublicForfaits(competition) {
  try {
    const snapshot = await competition.collection("alerts").where("type", "==", "forfait").get({ source: "server" });
    publicForfaits = snapshot.docs.map((doc) => sanitizeForfaitAlert(doc.data())).filter(Boolean);
  } catch (error) {
    console.warn("Lecture forfaits publics impossible", error);
    publicForfaits = [];
  }
}

function applyLiveData(remote, index = {}) {
  publicMeet = remote.meet || publicMeet;
  publicProgram = Array.isArray(remote.program) ? remote.program : publicProgram;
  publicEvents = Array.isArray(remote.events) ? remote.events : publicEvents;
  publicSeries = Array.isArray(remote.series) ? remote.series : publicSeries;
  publicRecords = Array.isArray(remote.records) ? remote.records : publicRecords;
  publicQualifications = Array.isArray(remote.qualifications) ? remote.qualifications : publicQualifications;
  publicIndexUpdatedAt = remote.notes?.livePublishedAt || index.updatedAt || publicIndexUpdatedAt || "";
}

async function loadPublicSeries() {
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
  publicSeries = Array.isArray(index.series) ? index.series : [];
  publicRecords = Array.isArray(remote.records) ? remote.records : [];
  publicQualifications = Array.isArray(remote.qualifications) ? remote.qualifications : [];
  publicIndexUpdatedAt = index.updatedAt || "";
  if (!indexSnapshot.exists || !publicSeries.length) {
    applyLiveData(remote, index);
  }
  await loadPublicForfaits(competition);
  setStatus("Connecté", "ok");
  render();
}

sessionsHost?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-series-session]");
  if (!button) return;
  activeSession = button.dataset.seriesSession;
  activeRaceIndex = 0;
  activeSeriesIndex = 0;
  activeRecordKey = "";
  render();
});

sessionSelect?.addEventListener("change", (event) => {
  activeSession = event.target.value || "";
  activeRaceIndex = 0;
  activeSeriesIndex = 0;
  activeRecordKey = "";
  render();
});

app?.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-public-record]")) {
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
    return;
  }
  const swimmerButton = event.target.closest("[data-swimmer-key]");
  if (swimmerButton) {
    renderSwimmerSheet(swimmerButton.dataset.swimmerKey);
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

refreshBtn?.addEventListener("click", () => {
  setStatus("Actualisation", "pending");
  loadPublicSeries().catch((error) => {
    console.warn("Actualisation séries publiques impossible", error);
    setStatus("Erreur", "error");
  });
});

loadPublicSeries().catch((error) => {
  console.warn("Lecture séries publiques impossible", error);
  setStatus("Erreur", "error");
  if (app) app.innerHTML = `<section class="panel"><p class="panel-subtitle">Impossible de charger les séries publiques.</p></section>`;
});
