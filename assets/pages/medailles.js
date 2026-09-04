const FIRESTORE_COMPETITION_ID = "livepalmes-active";
const FIREBASE_CONFIG = window.LivePalmesEnvironment.firebaseConfig;
const PUBLIC_MEDALS_CACHE_KEY = "livepalmes:public-medals-cache:v1";
const PUBLIC_CACHE_MAX_AGE_MS = 15 * 60 * 1000;
const PAGE_PARAMS = new URLSearchParams(window.location.search);
const PUBLIC_ARCHIVE_ID = String(PAGE_PARAMS.get("archive") || "").trim();
const PUBLIC_ARCHIVE_MODE = Boolean(PUBLIC_ARCHIVE_ID);
const medalsCacheKey = PUBLIC_ARCHIVE_MODE
  ? `${PUBLIC_MEDALS_CACHE_KEY}:archive:${PUBLIC_ARCHIVE_ID}`
  : PUBLIC_MEDALS_CACHE_KEY;

const meetTitle = document.querySelector("#publicMeetTitle");
const meetMeta = document.querySelector("#publicMeetMeta");
const statusBadge = document.querySelector("#publicMedalsStatus");
const summaryHost = document.querySelector("#publicMedalsSummary");
const rankingHost = document.querySelector("#publicMedalsRanking");
const clubMedalsModal = document.querySelector("#publicClubMedalsModal");

const swimmerCore = window.LivePalmesPublicSwimmerCore || {};
const medalsCore = window.LivePalmesPublicMedalsCore || {};
const cleanText = swimmerCore.cleanText || ((value) => String(value ?? ""));
const normalizeText = swimmerCore.normalizeText || ((value) => cleanText(value).toLowerCase().trim());
const isFinalStage = swimmerCore.isFinalStage || ((stage) => String(stage || "").startsWith("final"));
const isRelayRow = swimmerCore.isRelayRow || ((row) => /^4x/i.test(String(row?.eventId || row?.label || "")));

let publicMeet = {};
let publicEvents = [];
let publicEntrants = [];
let publicResults = [];
let publicIndexUpdatedAt = "";
let publicArchiveMeta = null;
let publicMedalsSnapshot = null;
let renderedClubRows = [];

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
  statusBadge.innerHTML = `
    <i class="firebase-dot ${className}" aria-hidden="true"></i>
    ${escapeHtml(label)}
  `;
}

function loadCache() {
  try {
    const raw = window.localStorage?.getItem(medalsCacheKey);
    if (!raw) return false;
    const cached = JSON.parse(raw);
    if (!cached?.savedAt || Date.now() - Number(cached.savedAt) > PUBLIC_CACHE_MAX_AGE_MS) return false;
    if (!Array.isArray(cached.results)) return false;
    applySnapshot(cached);
    return true;
  } catch (error) {
    return false;
  }
}

function saveCache() {
  try {
    window.localStorage?.setItem(medalsCacheKey, JSON.stringify({
      savedAt: Date.now(),
      meet: publicMeet,
      events: publicEvents,
      entrants: publicEntrants,
    results: publicResults,
    updatedAt: publicIndexUpdatedAt,
    archiveMeta: publicArchiveMeta,
    medalsSnapshot: publicMedalsSnapshot
  }));
  } catch (error) {
    // Cache is optional.
  }
}

function applySnapshot(snapshot = {}) {
  publicMeet = snapshot.meet || {};
  publicEvents = Array.isArray(snapshot.events) ? snapshot.events : [];
  publicEntrants = Array.isArray(snapshot.entrants) ? snapshot.entrants : [];
  publicResults = Array.isArray(snapshot.results) ? snapshot.results : [];
  publicIndexUpdatedAt = snapshot.updatedAt || snapshot.publicIndexUpdatedAt || "";
  publicArchiveMeta = snapshot.archiveMeta || null;
  publicMedalsSnapshot = snapshot.medalsSnapshot || null;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function updateMeetHeader() {
  if (meetTitle) {
    meetTitle.classList.add("public-medals-title");
    meetTitle.innerHTML = `
      <span>Tableau des m&eacute;dailles</span>
      <span class="public-medals-title-event">Championnat de France Masters 2026</span>
    `;
  }
  if (meetMeta) {
    const place = cleanText(publicMeet.location || publicMeet.city || "");
    const updated = formatDate(publicIndexUpdatedAt || publicArchiveMeta?.createdAt || "");
    meetMeta.textContent = [place, updated ? `MAJ ${updated}` : ""].filter(Boolean).join(" - ");
  }
}

function eventLabel(result = {}, row = {}) {
  const eventId = cleanText(row.eventId || result.eventId);
  const event = publicEvents.find((item) => String(item.id || "") === eventId);
  return cleanText(row.eventLabel || result.eventLabel || event?.label || eventId || "Course");
}

function sexLabel(value) {
  const sex = cleanText(value).toUpperCase();
  if (sex === "F") return "Femmes";
  if (sex === "M" || sex === "H") return "Hommes";
  return sex || "Mixte";
}

function categoryLabel(result = {}, row = {}) {
  return cleanText(row.categoryLabel || row.category || row.categoryCode || result.categoryLabel || result.category || "");
}

function stageLabel(result = {}) {
  if (!isFinalStage(result.stage)) return "";
  const phase = cleanText(result.phaseLabel || "");
  if (phase) return phase;
  const stage = String(result.stage || "").toLowerCase();
  if (stage.includes("b")) return "Finale B";
  if (stage.includes("a")) return "Finale A";
  return "Finale";
}

function rankingRows(result = {}) {
  return Array.isArray(result.ranking) ? result.ranking.filter(Boolean) : [];
}

function isPublishedMedalResult(result = {}) {
  if (!result || result.isPartial || !rankingRows(result).length) return false;
  if (result.hasFinal && !isFinalStage(result.stage)) return false;
  if (result.hasFinal && !result.finalistsAnnouncedAt && !isFinalStage(result.stage)) return false;
  return true;
}

function rankValue(row = {}) {
  const value = cleanText(row.rank ?? row.place ?? row.position);
  const match = value.match(/^\s*(\d{1,2})\b/);
  if (!match) return null;
  const rank = Number(match[1]);
  return Number.isFinite(rank) ? rank : null;
}

function isClassifiedRow(row = {}) {
  const status = normalizeText([
    row.resultStatus,
    row.status,
    row.statusLabel,
    row.importedStatus
  ].filter(Boolean).join(" "));
  if (!status) return true;
  return !/(forfait|disqual|abandon|absent|non classe|dns|dnf|dsq|nc)/.test(status);
}

function isMinimeResult(result = {}, row = {}) {
  const text = normalizeText([
    row.category,
    row.categoryLabel,
    row.categoryCode,
    result.category,
    result.categoryLabel,
    result.categoryCode,
    row.eventId,
    result.eventId,
    row.eventLabel,
    result.eventLabel
  ].filter(Boolean).join(" "));
  return /\bmi\b/.test(text) || text.includes("minime");
}

function rowName(row = {}) {
  return cleanText(row.displayName || row.name || [row.lastName, row.firstName].filter(Boolean).join(" "));
}

function isLikelyClubCode(value) {
  const text = cleanText(value);
  return Boolean(text && text.length <= 10 && !/\s/.test(text) && text === text.toLocaleUpperCase("fr-FR"));
}

function clubCodeCandidates(row = {}) {
  return [
    row.clubCode,
    row.codeClub,
    row.clubId,
    row.teamCode,
    row.structureCode,
    isLikelyClubCode(row.club) ? row.club : "",
    isLikelyClubCode(row.team) ? row.team : ""
  ].map(cleanText).filter(Boolean);
}

function clubNameCandidates(row = {}) {
  return [
    row.clubName ||
    row.clubFullName ||
    row.clubLabel ||
    row.teamName ||
    row.structureName ||
    row.associationName ||
    row.association ||
    row.club,
    row.team
  ].map(cleanText).filter(Boolean);
}

function bestFullClubName(row = {}) {
  return clubNameCandidates(row).find((name) => !isLikelyClubCode(name)) || "";
}

function collectClubAlias(map, row = {}) {
  const name = bestFullClubName(row);
  if (!name) return;
  clubCodeCandidates(row).forEach((code) => {
    map.set(normalizeText(code), name);
  });
}

function clubAliases(results = []) {
  const map = new Map();
  publicEntrants.forEach((entrant) => collectClubAlias(map, entrant));
  (Array.isArray(results) ? results : []).forEach((result) => {
    rankingRows(result).forEach((row) => collectClubAlias(map, row));
  });
  return map;
}

function clubDisplay(row = {}, aliases = new Map()) {
  const fullName = bestFullClubName(row);
  if (fullName) return fullName;
  const code = clubCodeCandidates(row)[0] || "";
  const alias = code ? aliases.get(normalizeText(code)) : "";
  return alias || code || "Club non renseign\u00e9";
}

function clubCodeDisplay(row = {}) {
  return clubCodeCandidates(row)[0] || bestFullClubName(row) || "Club";
}

function clubKey(row = {}) {
  const key = clubCodeCandidates(row)[0] || bestFullClubName(row);
  return normalizeText(key || "club non renseigne") || "club non renseigne";
}

function medalKind(rank) {
  if (rank === 1) return "gold";
  if (rank === 2) return "silver";
  if (rank === 3) return "bronze";
  return "";
}

function sameMedalScore(a = {}, b = {}) {
  return a.gold === b.gold && a.silver === b.silver && a.bronze === b.bronze;
}

function medalLabel(kind) {
  if (kind === "gold") return "Or";
  if (kind === "silver") return "Argent";
  if (kind === "bronze") return "Bronze";
  return "";
}

function medalIcon(kind) {
  return `
    <span class="club-medal-icon ${escapeHtml(kind)}" aria-hidden="true">
      <span class="club-medal-ribbon"></span>
      <span class="club-medal-disc"></span>
    </span>
  `;
}

function detailLabel(item) {
  return [
    item.event,
    item.sex,
    item.category,
    item.stage
  ].filter(Boolean).join(" - ");
}

function buildClubMedals(results = []) {
  const clubs = new Map();
  const aliases = clubAliases(results);
  const relaySeen = new Set();
  (Array.isArray(results) ? results : [])
    .filter(isPublishedMedalResult)
    .forEach((result) => {
      rankingRows(result).forEach((row) => {
        const rank = rankValue(row);
        if (rank === null || rank < 1 || rank > 3 || !isClassifiedRow(row) || isMinimeResult(result, row)) return;
        const kind = medalKind(rank);
        const key = clubKey(row);
        const relay = isRelayRow({
          ...result,
          ...row,
          eventId: row.eventId || result.eventId,
          label: row.label || result.label || result.eventLabel
        });
        if (relay) {
          const relayCategory = categoryLabel(result, row);
          const relaySex = cleanText(row.sex || result.sex);
          const relayKey = [
            cleanText(result.id || result.programKey || `${result.eventId}|${result.sex}|${result.stage}`),
            relaySex,
            relayCategory,
            rank,
            key
          ].join("|");
          if (relaySeen.has(relayKey)) return;
          relaySeen.add(relayKey);
        }
        if (!clubs.has(key)) {
          clubs.set(key, {
            key,
            clubCode: clubCodeDisplay(row),
            clubName: clubDisplay(row, aliases),
            gold: 0,
            silver: 0,
            bronze: 0,
            total: 0,
            medals: []
          });
        }
        const club = clubs.get(key);
        club[kind] += 1;
        club.total += 1;
        club.medals.push({
          kind,
          rank,
          event: eventLabel(result, row),
          sex: sexLabel(row.sex || result.sex),
          sexCode: cleanText(row.sex || result.sex).toUpperCase(),
          category: categoryLabel(result, row),
          stage: stageLabel(result),
          name: rowName(row),
          time: cleanText(row.time || row.result || row.performance),
          relay
        });
      });
    });

  const sortedClubs = Array.from(clubs.values())
    .map((club) => ({
      ...club,
      medals: club.medals.slice().sort((a, b) =>
        a.rank - b.rank ||
        a.event.localeCompare(b.event, "fr") ||
        a.category.localeCompare(b.category, "fr") ||
        a.name.localeCompare(b.name, "fr")
      )
    }))
    .sort((a, b) =>
      b.gold - a.gold ||
      b.silver - a.silver ||
      b.bronze - a.bronze ||
      b.total - a.total ||
      a.clubCode.localeCompare(b.clubCode, "fr")
    );

  return sortedClubs.map((club, index) => {
    const previous = sortedClubs[index - 1];
    const rank = previous && sameMedalScore(club, previous) ? previous.rank : index + 1;
    club.rank = rank;
    return club;
  });
}

function renderSummary(rows = []) {
  if (!summaryHost) return;
  const totals = rows.reduce((acc, row) => ({
    clubs: acc.clubs + 1,
    gold: acc.gold + row.gold,
    silver: acc.silver + row.silver,
    bronze: acc.bronze + row.bronze,
    total: acc.total + row.total
  }), { clubs: 0, gold: 0, silver: 0, bronze: 0, total: 0 });
  summaryHost.innerHTML = `
    <article class="public-medals-stat">
      <span>Clubs</span>
      <strong>${escapeHtml(totals.clubs)}</strong>
    </article>
    <article class="public-medals-stat gold">
      <span>${medalIcon("gold")} Or</span>
      <strong>${escapeHtml(totals.gold)}</strong>
    </article>
    <article class="public-medals-stat silver">
      <span>${medalIcon("silver")} Argent</span>
      <strong>${escapeHtml(totals.silver)}</strong>
    </article>
    <article class="public-medals-stat bronze">
      <span>${medalIcon("bronze")} Bronze</span>
      <strong>${escapeHtml(totals.bronze)}</strong>
    </article>
  `;
}

function medalGroups(row) {
  return ["gold", "silver", "bronze"]
    .map((kind) => ({
      kind,
      label: medalLabel(kind),
      medals: row.medals.filter((item) => item.kind === kind)
    }))
    .filter((group) => group.medals.length);
}

function compactEventLabel(label = "") {
  const text = cleanText(label);
  const normalized = normalizeText(text);
  const distance = (text.match(/\b\d{2,4}\b/) || [""])[0];
  let style = "";
  if (normalized.includes("bipalmes") || normalized.includes("bi palmes")) style = "BI";
  else if (normalized.includes("surface")) style = "SF";
  else if (normalized.includes("immersion")) style = "IS";
  else if (normalized.includes("apnee")) style = "AP";
  return [distance, style].filter(Boolean).join(" ") || text;
}

function relayEventLabel(label = "") {
  const text = cleanText(label);
  const normalized = normalizeText(text);
  const relayDistance = (text.match(/\b\d+\s*[xX]\s*\d{2,4}\b/) || [""])[0].replace(/\s+/g, "").replace("X", "x");
  const distance = relayDistance || (text.match(/\b\d{2,4}\b/) || [""])[0];
  let style = "";
  if (/\bSB\b/i.test(text) || normalized.includes("surface bipalmes") || normalized.includes("surface bi palmes")) style = "SB";
  else if (/\bBI\b/i.test(text) || normalized.includes("bipalmes") || normalized.includes("bi palmes")) style = "BI";
  else if (/\bSF\b/i.test(text) || normalized.includes("surface")) style = "SF";
  const shortLabel = [distance, style].filter(Boolean).join(" ");
  return shortLabel ? `Relais ${shortLabel}` : "Relais";
}

function medalLineName(item = {}, medalist = {}, index = 0) {
  if (item.relay) return relayEventLabel(item.event);
  if (index > 0) return "";
  return medalist.name;
}

function relaySexLabel(item = {}) {
  const sex = cleanText(item.sexCode || item.sex).toUpperCase();
  if (sex === "F") return "Femmes";
  if (sex === "M" || sex === "H") return "Hommes";
  if (sex === "X" || sex === "MIXTE" || sex === "MIXED") return "Mixte";
  return cleanText(item.sex) || "Mixte";
}

function medalistKey(item = {}) {
  return normalizeText([
    item.relay ? "relais" : "nageur",
    item.name,
    item.relay ? item.event : ""
  ].filter(Boolean).join("|"));
}

function sexClass(item = {}) {
  const sex = cleanText(item.sexCode || item.sex).toUpperCase();
  if (sex === "F" || normalizeText(item.sex).startsWith("fem")) return "female";
  if (sex === "M" || sex === "H" || normalizeText(item.sex).startsWith("hom")) return "male";
  return "mixed";
}

function groupedMedalistRows(medals = []) {
  const groups = new Map();
  medals.forEach((item) => {
    const key = medalistKey(item);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        name: item.name,
        relay: item.relay,
        medals: []
      });
    }
    groups.get(key).medals.push(item);
  });
  return Array.from(groups.values());
}

function renderClubMedalsModal(row) {
  const groups = medalGroups(row);
  return `
    <div class="public-club-medals-dialog" role="dialog" aria-modal="true" aria-label="M&eacute;dailles ${escapeHtml(row.clubCode)}">
      <button class="public-club-medals-close" type="button" data-close-club-medals aria-label="Fermer">&times;</button>
      <div class="public-club-medals-head">
        <div>
          <span>${escapeHtml(row.clubCode)}</span>
          <h2>${escapeHtml(row.clubName)}</h2>
        </div>
      </div>
      <div class="public-club-medals-groups">
        ${groups.map((group) => `
          <section class="public-club-medals-group ${escapeHtml(group.kind)}">
            <h3>${medalIcon(group.kind)} ${escapeHtml(group.label)}</h3>
            <div class="public-club-medals-lines">
              ${groupedMedalistRows(group.medals).map((medalist) => `
                <div class="public-club-medalist-group">
                  ${medalist.medals.map((item, index) => `
                    <div class="public-club-medal-line ${item.relay ? "is-relay" : ""} sex-${escapeHtml(sexClass(item))}">
                      <strong class="${index > 0 && !item.relay ? "repeat-name" : ""}">${escapeHtml(medalLineName(item, medalist, index))}</strong>
                      ${item.relay ? `<span class="public-club-medal-sex">${escapeHtml(relaySexLabel(item))}</span>` : ""}
                      <span class="public-club-medal-category">${escapeHtml(item.category)}</span>
                      ${item.relay ? "" : `<span class="public-club-medal-race">${escapeHtml(compactEventLabel(item.event))}</span>`}
                      <span class="public-club-medal-time">${escapeHtml(item.time)}</span>
                    </div>
                  `).join("")}
                </div>
              `).join("")}
            </div>
          </section>
        `).join("")}
      </div>
    </div>
  `;
}

function renderRanking(rows = []) {
  if (!rankingHost) return;
  renderedClubRows = rows;
  if (!rows.length) {
    rankingHost.innerHTML = `
      <p class="panel-subtitle">Aucune m&eacute;daille club trouv&eacute;e dans les r&eacute;sultats publi&eacute;s.</p>
    `;
    return;
  }
  rankingHost.innerHTML = `
    <p class="public-medals-help">
      <span>Cliquez sur une ligne pour voir les m&eacute;daill&eacute;s du club.</span>
    </p>
    <table class="public-medals-table">
      <thead>
        <tr>
          <th>Rg</th>
          <th>Club</th>
          <th><span>${medalIcon("gold")} <span class="public-medal-label-full">Or</span><span class="public-medal-label-short">Or</span></span></th>
          <th><span>${medalIcon("silver")} <span class="public-medal-label-full">Argent</span><span class="public-medal-label-short">Arg.</span></span></th>
          <th><span>${medalIcon("bronze")} <span class="public-medal-label-full">Bronze</span><span class="public-medal-label-short">Bro.</span></span></th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((row, index) => {
          const tied = sameMedalScore(row, rows[index - 1]) || sameMedalScore(row, rows[index + 1]);
          return `
          <tr class="${tied ? "is-tied" : ""}" data-club-row-key="${escapeHtml(row.key)}">
            <td class="public-medals-rank" title="${tied ? "Club ex aequo" : ""}">${escapeHtml(row.rank)}</td>
            <td class="public-medals-club-cell">
              <div class="public-medals-club-actions">
                <button class="public-medals-club-code" type="button" data-open-club-medals="${escapeHtml(row.key)}" aria-haspopup="dialog" aria-label="Voir les m&eacute;daill&eacute;s ${escapeHtml(row.clubCode)}">
                  ${escapeHtml(row.clubCode)}
                </button>
                <span class="public-medals-club-name-inline">${escapeHtml(row.clubName)}</span>
              </div>
            </td>
            <td class="public-medals-count gold">${escapeHtml(row.gold)}</td>
            <td class="public-medals-count silver">${escapeHtml(row.silver)}</td>
            <td class="public-medals-count bronze">${escapeHtml(row.bronze)}</td>
            <td class="public-medals-total">${escapeHtml(row.total)}</td>
          </tr>
        `;
        }).join("")}
      </tbody>
    </table>
  `;
}

function closeClubMedalsModal() {
  if (!clubMedalsModal) return;
  clubMedalsModal.hidden = true;
  clubMedalsModal.innerHTML = "";
  document.body.classList.remove("public-club-medals-open");
}

function openClubMedalsModal(key) {
  if (!clubMedalsModal) return;
  const row = renderedClubRows.find((item) => item.key === key);
  if (!row) return;
  clubMedalsModal.innerHTML = renderClubMedalsModal(row);
  clubMedalsModal.hidden = false;
  document.body.classList.add("public-club-medals-open");
}

function renderMedals() {
  updateMeetHeader();
  const rows = Array.isArray(publicMedalsSnapshot?.rows)
    ? publicMedalsSnapshot.rows
    : (typeof medalsCore.buildClubMedals === "function"
      ? medalsCore.buildClubMedals(publicResults, { events: publicEvents, entrants: publicEntrants })
      : buildClubMedals(publicResults));
  renderSummary(rows);
  renderRanking(rows);
}

async function loadPublicArchiveResultsIndex(competition) {
  const archiveRef = competition.collection("resultArchives").doc(PUBLIC_ARCHIVE_ID);
  const [archiveSnapshot, medalsSnapshot] = await Promise.all([
    archiveRef.get({ source: "server" }),
    archiveRef.collection("extras").doc("medals").get({ source: "server" }).catch(() => null)
  ]);
  if (!archiveSnapshot.exists) {
    setStatus("Archive introuvable", "error");
    if (rankingHost) rankingHost.innerHTML = `<p class="panel-subtitle">Archive introuvable.</p>`;
    return;
  }
  const archive = archiveSnapshot.data() || {};
  const index = archive.archiveIndex || archive.publicIndex || {};
  publicMedalsSnapshot = medalsSnapshot?.exists ? (medalsSnapshot.data() || null) : null;
  if (!publicMedalsSnapshot && Number(archive.archiveVersion || 0) >= 2) {
    publicArchiveMeta = archive;
    publicMeet = index.meet || archive.meet || {};
    publicEvents = Array.isArray(index.events) ? index.events : [];
    publicEntrants = [];
    publicResults = [];
    publicIndexUpdatedAt = index.updatedAt || archive.createdAt || "";
    setStatus("Archive", "ok");
    saveCache();
    renderMedals();
    return;
  }
  const racesSnapshot = publicMedalsSnapshot
    ? null
    : await archiveRef.collection("races").get({ source: "server" }).catch(() => null);
  const archiveRaces = (racesSnapshot?.docs || []).map((doc) => ({ id: doc.id, ...doc.data() }));
  const itemsSnapshot = publicMedalsSnapshot || archiveRaces.length
    ? null
    : await archiveRef.collection("items").get({ source: "server" }).catch(() => null);
  const archivedItems = (itemsSnapshot?.docs || []).map((doc) => ({ id: doc.id, ...doc.data() }));
  publicArchiveMeta = archive;
  publicMeet = index.meet || archive.meet || {};
  publicEvents = Array.isArray(index.events) ? index.events : [];
  publicEntrants = Array.isArray(index.entrants) ? index.entrants : [];
  publicResults = publicMedalsSnapshot
    ? []
    : archiveRaces.length
    ? archiveRaces.flatMap((race) => Array.isArray(race.results) ? race.results : [])
    : archivedItems.length
    ? archivedItems
    : (Array.isArray(index.results) ? index.results : []);
  publicIndexUpdatedAt = index.updatedAt || archive.createdAt || "";
  setStatus("Archive", "ok");
  saveCache();
  renderMedals();
}

async function loadPublicMedalsIndex() {
  if (!window.firebase?.initializeApp || !window.firebase?.firestore) {
    setStatus("Local", "pending");
    if (rankingHost) rankingHost.innerHTML = `<p class="panel-subtitle">Firebase n'est pas disponible sur cette page.</p>`;
    return;
  }
  if (!window.firebase.apps?.length) {
    window.firebase.initializeApp(FIREBASE_CONFIG);
  }
  const db = window.firebase.firestore();
  const competition = db.collection("competitions").doc(FIRESTORE_COMPETITION_ID);
  if (PUBLIC_ARCHIVE_MODE) {
    await loadPublicArchiveResultsIndex(competition);
    return;
  }
  const snapshot = await competition.collection("public").doc("resultsIndex").get({ source: "server" });
  const index = snapshot.data() || {};
  if (!snapshot.exists || !Array.isArray(index.results)) {
    publicMeet = {};
    publicEvents = [];
    publicEntrants = [];
    publicResults = [];
    publicIndexUpdatedAt = "";
    setStatus("Non publi\u00e9", "pending");
    renderMedals();
    return;
  }
  publicMeet = index.meet || {};
  publicEvents = Array.isArray(index.events) ? index.events : [];
  publicEntrants = Array.isArray(index.entrants) ? index.entrants : [];
  publicResults = Array.isArray(index.results) ? index.results : [];
  publicIndexUpdatedAt = index.updatedAt || "";
  setStatus("Connect\u00e9", "ok");
  saveCache();
  renderMedals();
}

function init() {
  if (loadCache()) {
    setStatus("Actualisation", "pending");
    renderMedals();
  }
  loadPublicMedalsIndex().catch((error) => {
    console.warn("Lecture du tableau des medailles impossible", error);
    setStatus("Erreur", "error");
    if (rankingHost) rankingHost.innerHTML = `<p class="panel-subtitle">Impossible de charger le tableau des m&eacute;dailles.</p>`;
  });
}

rankingHost?.addEventListener("click", (event) => {
  const medalsButton = event.target.closest("[data-open-club-medals]");
  if (medalsButton) {
    event.stopPropagation();
    openClubMedalsModal(medalsButton.dataset.openClubMedals || "");
    return;
  }
  const clubRow = event.target.closest("[data-club-row-key]");
  if (clubRow) {
    const key = clubRow.dataset.clubRowKey || "";
    openClubMedalsModal(key);
  }
});

clubMedalsModal?.addEventListener("click", (event) => {
  if (event.target === clubMedalsModal || event.target.closest("[data-close-club-medals]")) {
    closeClubMedalsModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && clubMedalsModal && !clubMedalsModal.hidden) {
    closeClubMedalsModal();
  }
});

init();
