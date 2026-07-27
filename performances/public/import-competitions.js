(function attachCompetitionImportAdmin(global) {
  const elements = {
    loginPanel: document.querySelector("#importLoginPanel"),
    loginForm: document.querySelector("#importLoginForm"),
    loginEmail: document.querySelector("#importLoginEmail"),
    loginPassword: document.querySelector("#importLoginPassword"),
    loginMessage: document.querySelector("#importLoginMessage"),
    workbench: document.querySelector("#importWorkbench"),
    correctionWorkbench: document.querySelector("#correctionWorkbench"),
    sessionLabel: document.querySelector("#importSessionLabel"),
    signOut: document.querySelector("#importSignOutButton"),
    form: document.querySelector("#competitionImportForm"),
    file: document.querySelector("#competitionImportFile"),
    encoding: document.querySelector("#competitionImportEncoding"),
    encodingLabel: document.querySelector("label:has(#competitionImportEncoding)"),
    message: document.querySelector("#competitionImportMessage"),
    preview: document.querySelector("#competitionImportPreview"),
    summary: document.querySelector("#competitionImportSummary"),
    warnings: document.querySelector("#competitionImportWarnings"),
    sample: document.querySelector("#competitionImportSample"),
    validate: document.querySelector("#competitionImportValidateButton"),
    importsList: document.querySelector("#competitionImportsList"),
    importsRefresh: document.querySelector("#competitionImportsRefreshButton"),
    importsExport: document.querySelector("#competitionImportsExportButton"),
    importsSearch: document.querySelector("#competitionImportsSearch"),
    importsYear: document.querySelector("#competitionImportsYear"),
    importsStatus: document.querySelector("#competitionImportsStatus"),
    importsFilterSummary: document.querySelector("#competitionImportsFilterSummary"),
    superAdminPanel: document.querySelector("#performanceSuperAdminPanel"),
    publishPublicData: document.querySelector("#performancePublishPublicDataButton"),
    publishPublicDataMessage: document.querySelector("#performancePublishPublicDataMessage"),
    migrationStatus: document.querySelector("#performanceMigrationStatus"),
    migrationStatusButton: document.querySelector("#performanceMigrationStatusButton"),
    migrationNext: document.querySelector("#performanceMigrationNextButton"),
    migrationAll: document.querySelector("#performanceMigrationAllButton"),
    correctionSearch: document.querySelector("#performanceCorrectionSwimmer"),
    correctionSuggestions: document.querySelector("#performanceCorrectionSuggestions"),
    correctionCourse: document.querySelector("#performanceCorrectionCourse"),
    correctionYear: document.querySelector("#performanceCorrectionYear"),
    correctionCompetition: document.querySelector("#performanceCorrectionCompetition"),
    correctionResultsWrap: document.querySelector("#performanceCorrectionResultsWrap"),
    correctionResults: document.querySelector("#performanceCorrectionResults"),
    correctionForm: document.querySelector("#performanceCorrectionForm"),
    correctionBackToList: document.querySelector("#performanceCorrectionBackToList"),
    correctionTitle: document.querySelector("#performanceCorrectionTitle"),
    correctionTime: document.querySelector("#performanceCorrectionTime"),
    correctionDate: document.querySelector("#performanceCorrectionDate"),
    correctionClub: document.querySelector("#performanceCorrectionClub"),
    correctionLocation: document.querySelector("#performanceCorrectionLocation"),
    correctionSplits: document.querySelector("#performanceCorrectionSplits"),
    correctionAddSplit: document.querySelector("#performanceCorrectionAddSplit"),
    correctionReason: document.querySelector("#performanceCorrectionReason"),
    correctionHide: document.querySelector("#performanceCorrectionHide")
  };

  let adminAuth = null;
  let currentFile = null;
  let currentRawText = "";
  let currentPayload = null;
  let currentPreview = null;
  let correctionOverlay = null;
  let correctionRowsCache = new Map();
  let correctionSearchCache = new Map();
  let correctionSuggestionMatches = [];
  let correctionSearchRequestId = 0;
  let correctionSelectedSwimmer = null;
  let correctionRows = [];
  let correctionSelectedRow = null;
  let migrationAutoRunning = false;
  let importsCache = [];
  let importsVisibleCount = 5;
  const openImportIds = new Set();
  const importsPageSize = 5;
  const isIntegratedAdminView = Boolean(document.querySelector("#adminImportView"));
  const publicPerformanceBase = isIntegratedAdminView
    ? "/performances/public/data/performance-public"
    : "public/data/performance-public";
  const publicPerformanceVersion = encodeURIComponent(global.LIVEPALMES_PERFORMANCE_PUBLIC_VERSION || global.LIVEPALMES_INTRANAP_SUMMARY?.generatedAt || "performance-public");
  const publicSearchShards = new Map();
  const recordAlertDraftStorageKey = "livepalmes:record-alert-drafts";

  function ensureFirebaseApp() {
    const firebase = global.firebase;
    const config = global.LivePalmesAppConfig?.firebaseConfig;
    if (!firebase?.initializeApp || !config) return false;
    if (!firebase.apps?.length) firebase.initializeApp(config);
    return true;
  }

  function ensureAdminAuth() {
    if (adminAuth) return adminAuth;
    if (!ensureFirebaseApp() || !global.LivePalmesAdminAuth?.init) return null;
    adminAuth = global.LivePalmesAdminAuth.init({
      firebase: global.firebase,
      authConfig: global.LivePalmesAppConfig?.adminAuth || {},
      requiredCapability: "competitions.import"
    });
    adminAuth.onChange(updateView);
    return adminAuth;
  }

  function functionsService() {
    if (!ensureFirebaseApp() || !global.firebase?.functions) return null;
    try {
      return global.firebase.app().functions(global.LivePalmesAppConfig?.firebaseFunctionsRegion || "europe-west1");
    } catch {
      return global.firebase.functions(global.LivePalmesAppConfig?.firebaseFunctionsRegion || "europe-west1");
    }
  }

  async function callFunction(name, payload) {
    const functions = functionsService();
    if (!functions?.httpsCallable) throw new Error("Cloud Functions LivePalmes indisponibles.");
    const result = await functions.httpsCallable(name)(payload);
    return result.data || {};
  }

  function setMessage(target, message, tone = "error") {
    if (!target) return;
    target.textContent = message || "";
    target.dataset.tone = tone;
  }

  function publicPublicationStatus(result = {}) {
    const filesSnapshot = result.publicFilesSnapshot || {};
    const legacySnapshot = result.publicSnapshot || {};
    if (filesSnapshot.ok) {
      return {
        ok: true,
        text: ` Les TOP et fiches nageurs sont mis a jour automatiquement (${filesSnapshot.writtenFiles || 0} fichier(s)).`
      };
    }
    if (legacySnapshot.ok) {
      return {
        ok: false,
        text: " Ancienne publication OK, mais fichiers TOP/nageurs a verifier."
      };
    }
    return {
      ok: false,
      text: ` Publication publique a verifier${filesSnapshot.error ? ` : ${filesSnapshot.error}` : "."}`
    };
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function formatDate(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : String(value || "-");
  }

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("fr-FR")
      .trim();
  }

  function normalizeSearchToken(value) {
    return normalize(value).replace(/[^a-z0-9]+/g, " ").trim();
  }

  function searchShardFromQuery(value) {
    const token = normalizeSearchToken(value).split(/\s+/).find((item) => item.length >= 2) || "";
    return token.slice(0, 2);
  }

  function displayName(swimmer) {
    return swimmer?.name || [swimmer?.firstName, swimmer?.lastName].filter(Boolean).join(" ");
  }

  function swimmerIdentityKey(swimmer) {
    const first = normalize(swimmer?.firstName).replace(/[^a-z0-9]+/g, " ").toUpperCase().trim();
    const last = normalize(swimmer?.lastName).replace(/[^a-z0-9]+/g, " ").toUpperCase().trim();
    const birth = String(swimmer?.birthDate || "").trim();
    return first && last && birth ? `${last}|${first}|${birth}` : "";
  }

  function swimmerKnownIds(swimmer) {
    return Array.from(new Set([
      swimmer?.id,
      ...(Array.isArray(swimmer?.aliases) ? swimmer.aliases : []),
      ...(Array.isArray(swimmer?.sourceIds) ? swimmer.sourceIds : [])
    ].map((id) => String(id || "").trim()).filter(Boolean)));
  }

  function swimmerSearchScore(swimmer, tokens) {
    const name = normalize(displayName(swimmer));
    const lastName = normalize(swimmer.lastName);
    const firstName = normalize(swimmer.firstName);
    if (tokens.every((token) => lastName.startsWith(token) || firstName.startsWith(token))) return 0;
    if (tokens.every((token) => name.includes(token))) return 1;
    if (tokens.every((token) => lastName.includes(token) || firstName.includes(token))) return 2;
    return 3;
  }

  function correctionKey(row) {
    if (row?.id) return `${row.source || "intranap"}|${row.id}`;
    return [
      row?.swimmerIdentityKey || row?.swimmerId || row?.swimmer,
      row?.date,
      row?.course,
      row?.timeValue,
      row?.club || row?.clubName,
      row?.competitionId || row?.location
    ].map((value) => String(value || "").trim()).join("|");
  }

  function applyCorrections(rows) {
    const corrections = Array.isArray(correctionOverlay?.corrections) ? correctionOverlay.corrections : [];
    if (!corrections.length) return rows;
    const byKey = new Map(corrections.map((correction) => [correction.targetKey, correction]));
    return rows
      .map((row) => {
        const correction = byKey.get(correctionKey(row));
        if (!correction) return row;
        if (correction.hidden) return null;
        if (correctionMovesSwimmer(correction, row)) return null;
        return { ...row, ...(correction.patch || {}), correctionId: correction.id };
      })
      .filter(Boolean);
  }

  function correctionMovesSwimmer(correction, row = {}) {
    const patch = correction?.patch || {};
    return Boolean(patch.swimmerId) && String(patch.swimmerId) !== String(row.swimmerId || "");
  }

  function rowFromCorrection(correction) {
    if (!correction || correction.hidden || !correction.targetRow || !correctionMovesSwimmer(correction, correction.targetRow)) return null;
    return { ...correction.targetRow, ...(correction.patch || {}), correctionId: correction.id };
  }

  function performanceMatchesSwimmer(row, swimmer, knownIds, identityKey) {
    if (knownIds.has(String(row?.swimmerId || ""))) return true;
    if (knownIds.has(String(row?.originalSwimmerId || ""))) return true;
    const rowIdentity = row?.swimmerIdentityKey || swimmerIdentityKey(row);
    return Boolean(identityKey && rowIdentity === identityKey);
  }

  function parseTimeValue(value) {
    const raw = normalizeTimeInput(value) || String(value || "").trim().replace(",", ".");
    const match = raw.match(/^(?:(\d+):)?(\d{1,2})\.(\d{1,2})$/);
    if (!match) return 0;
    const minutes = Number(match[1] || 0);
    const seconds = Number(match[2] || 0);
    const centiseconds = Number(String(match[3]).padEnd(2, "0").slice(0, 2));
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds >= 60) return 0;
    return ((minutes * 60) + seconds) * 100 + centiseconds;
  }

  function recordStyleFromCourse(course) {
    return String(course || "").match(/[A-Z]+$/)?.[0] || "";
  }

  function recordAlertDraftCategory(alert = {}) {
    if (alert.type === "MPF") return alert.category || "";
    if (alert.type === "RFJ") return "J";
    return "S";
  }

  function recordAlertDraftSourceKey(item = {}, alertIndex = 0) {
    return `${item.importId || ""}|${alertIndex}`;
  }

  function readQueuedRecordAlertDrafts() {
    try {
      const parsed = JSON.parse(global.localStorage?.getItem(recordAlertDraftStorageKey) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeQueuedRecordAlertDrafts(rows) {
    try {
      global.localStorage?.setItem(recordAlertDraftStorageKey, JSON.stringify(rows.slice(0, 100)));
    } catch {
      // Le brouillon reste visible dans l'historique meme si le stockage local est indisponible.
    }
  }

  function queueRecordDraftFromAlert(item = {}, alertIndex = 0) {
    const alert = Array.isArray(item.recordAlerts) ? item.recordAlerts[alertIndex] : null;
    if (!alert) return false;
    const sourceKey = recordAlertDraftSourceKey(item, alertIndex);
    const draft = {
      sourceKey,
      importId: item.importId || "",
      alertIndex,
      createdAt: new Date().toISOString(),
      competitionName: item.metadata?.competitionName || item.competitionName || "",
      scope: alert.type || "",
      recordType: alert.type === "MPF" ? "" : alert.type || "",
      sex: alert.sex || "",
      category: recordAlertDraftCategory(alert),
      kind: "individual",
      style: recordStyleFromCourse(alert.course),
      course: alert.course || "",
      time: alert.time || "",
      timeValue: alert.timeValue || 0,
      swimmer: alert.swimmer || [alert.firstName, alert.lastName].filter(Boolean).join(" "),
      birthDate: alert.birthDate || "",
      club: alert.club || alert.clubName || "",
      date: alert.date || "",
      location: alert.location || item.metadata?.location || "",
      source: "import-alert",
      note: `Alerte ${alert.type || ""} import ${item.importId || ""}`,
      alertStatus: alert.status || "",
      referenceKey: alert.referenceKey || "",
      referenceTime: alert.referenceTime || "",
      referenceSwimmer: alert.referenceSwimmer || "",
      referenceDate: alert.referenceDate || ""
    };
    const rows = readQueuedRecordAlertDrafts().filter((row) => row.sourceKey !== sourceKey);
    rows.unshift(draft);
    writeQueuedRecordAlertDrafts(rows);
    return true;
  }

  function formatTimeFromParts(minutes, seconds, centiseconds) {
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || !Number.isFinite(centiseconds) || seconds >= 60) return "";
    const time = `${String(seconds).padStart(minutes ? 2 : 1, "0")}.${String(centiseconds).padStart(2, "0")}`;
    return minutes ? `${minutes}:${time}` : time;
  }

  function normalizeTimeInput(value) {
    const raw = String(value || "").trim().replace(",", ".");
    if (!raw) return "";

    if (/^\d+$/.test(raw)) {
      if (raw.length <= 2) return formatTimeFromParts(0, Number(raw), 0);
      if (raw.length === 3) return formatTimeFromParts(0, Number(raw.slice(0, 1)), Number(raw.slice(1)));
      if (raw.length === 4) return formatTimeFromParts(0, Number(raw.slice(0, 2)), Number(raw.slice(2)));
      return formatTimeFromParts(Number(raw.slice(0, -4)), Number(raw.slice(-4, -2)), Number(raw.slice(-2)));
    }

    const match = raw.match(/^(?:(\d+):)?(\d{1,2})(?:\.(\d{1,2}))?$/);
    if (!match) return "";
    return formatTimeFromParts(
      Number(match[1] || 0),
      Number(match[2] || 0),
      Number(String(match[3] || "0").padEnd(2, "0").slice(0, 2))
    );
  }

  function normalizeTimeField(input) {
    if (!input) return;
    const normalized = normalizeTimeInput(input.value);
    if (normalized) input.value = normalized;
  }

  function ageCategoryFromDates(performanceDate, birthDate) {
    const year = Number(String(performanceDate || "").slice(0, 4));
    const birthYear = Number(String(birthDate || "").slice(0, 4));
    if (!Number.isFinite(year) || !Number.isFinite(birthYear)) return "";
    const age = year - birthYear;
    if (age <= 11) return "P";
    if (age <= 13) return "B";
    if (age <= 15) return "M";
    if (age <= 17) return "C";
    if (age <= 20) return "J";
    if (age >= 80) return "M80+";
    if (age >= 70) return "M70+";
    if (age >= 60) return "M60+";
    if (age >= 50) return "M50+";
    if (age >= 40) return "M40+";
    if (age >= 30) return "M30+";
    return "S";
  }

  function categoryMeta(sex, code) {
    return (global.LIVEPALMES_INTRANAP_SUMMARY?.filters?.categories || []).find((item) => item.sex === sex && item.code === code);
  }

  function courseLabel(code) {
    const course = (global.LIVEPALMES_INTRANAP_SUMMARY?.filters?.courses || []).find((item) => item.code === code);
    return course?.shortLabel || course?.label || code || "-";
  }

  async function loadGlobalDataFromScript(globalName, pattern) {
    if (global[globalName]) return global[globalName];
    const script = Array.from(document.scripts).find((item) => String(item.getAttribute("src") || "").includes(pattern));
    const src = script?.getAttribute("src");
    if (!src) return null;
    const response = await fetch(src, { cache: "no-store" });
    if (!response.ok) return null;
    const text = await response.text();
    const prefix = `window.${globalName} = `;
    const start = text.indexOf(prefix);
    if (start < 0) return null;
    const json = text.slice(start + prefix.length).replace(/;\s*$/, "");
    global[globalName] = JSON.parse(json);
    return global[globalName];
  }

  async function ensureCorrectionReference() {
    await Promise.all([
      loadGlobalDataFromScript("LIVEPALMES_INTRANAP_SUMMARY", "intranap-summary.js")
    ]);
  }

  function yearOf(row) {
    return String(row?.seasonYear || row?.date || "").slice(0, 4);
  }

  async function loadCorrectionOverlay() {
    if (correctionOverlay) return correctionOverlay;
    const url = global.LivePalmesAppConfig?.performanceAdditionalDataUrl;
    if (!url) {
      correctionOverlay = { performances: [], swimmers: [], corrections: [] };
      return correctionOverlay;
    }
    try {
      const response = await fetch(`${url}&adminCache=${Date.now()}`, { cache: "no-store" });
      correctionOverlay = response.ok ? await response.json() : { performances: [], swimmers: [], corrections: [] };
    } catch {
      correctionOverlay = { performances: [], swimmers: [], corrections: [] };
    }
    return correctionOverlay;
  }

  function loadPublicSearchShard(shard) {
    if (!shard) return Promise.resolve([]);
    if (publicSearchShards.has(shard)) return publicSearchShards.get(shard);
    if (global.location?.protocol === "file:") {
      return Promise.reject(new Error("ouvrez LivePalmes depuis son adresse web ou un serveur local"));
    }
    const promise = fetch(`${publicPerformanceBase}/search/${encodeURIComponent(shard)}.json?v=${publicPerformanceVersion}`, { cache: "force-cache" })
      .then((response) => {
        if (response.status === 404) return [];
        if (!response.ok) throw new Error("Index public nageurs indisponible.");
        return response.json();
      })
      .then((rows) => Array.isArray(rows) ? rows : [])
      .catch((error) => {
        publicSearchShards.delete(shard);
        throw error;
      });
    publicSearchShards.set(shard, promise);
    return promise;
  }

  function overlaySwimmersForSearch(query) {
    const overlay = correctionOverlay || {};
    const swimmers = Array.isArray(overlay.swimmers) ? overlay.swimmers : [];
    const tokens = normalize(query).split(/\s+/).filter((token) => token.length >= 2);
    if (!tokens.length) return [];
    return swimmers.filter((swimmer) => {
      const haystack = normalize([
        swimmer.name,
        swimmer.firstName,
        swimmer.lastName,
        swimmer.birthDate,
        swimmer.club,
        swimmer.clubName,
        swimmer.id,
        ...(Array.isArray(swimmer.sourceIds) ? swimmer.sourceIds : [])
      ].filter(Boolean).join(" "));
      return tokens.every((token) => haystack.includes(token));
    });
  }

  async function searchPerformanceBaseSwimmers(query) {
    const cleanQuery = normalize(query);
    if (correctionSearchCache.has(cleanQuery)) return correctionSearchCache.get(cleanQuery);
    const tokens = cleanQuery.split(/\s+/).filter((token) => token.length >= 2);
    const shard = searchShardFromQuery(query);
    const promise = Promise.all([loadPublicSearchShard(shard), loadCorrectionOverlay()])
      .then(([publicRows]) => {
        const merged = new Map();
        [...publicRows, ...overlaySwimmersForSearch(query)].forEach((swimmer) => {
          const key = swimmer.identityKey || swimmer.id || displayName(swimmer);
          if (key && !merged.has(key)) merged.set(key, swimmer);
        });
        return Array.from(merged.values())
          .filter((swimmer) => {
            const haystack = normalize(swimmer.searchText || [
              swimmer.name,
              swimmer.firstName,
              swimmer.lastName,
              swimmer.birthDate,
              swimmer.club,
              swimmer.clubName,
              swimmer.id,
              ...(Array.isArray(swimmer.sourceIds) ? swimmer.sourceIds : [])
            ].filter(Boolean).join(" "));
            return tokens.every((token) => haystack.includes(token));
          })
          .sort((a, b) => swimmerSearchScore(a, tokens) - swimmerSearchScore(b, tokens) ||
            String(a.lastName || "").localeCompare(String(b.lastName || ""), "fr-FR") ||
            String(a.firstName || "").localeCompare(String(b.firstName || ""), "fr-FR"))
          .slice(0, 10);
      });
    correctionSearchCache.set(cleanQuery, promise);
    return promise;
  }

  function renderCorrectionSuggestions() {
    if (!elements.correctionSuggestions) return;
    const query = normalize(elements.correctionSearch?.value);
    if (query.length < 2) {
      correctionSuggestionMatches = [];
      elements.correctionSuggestions.innerHTML = "";
      return;
    }
    const requestId = ++correctionSearchRequestId;
    elements.correctionSuggestions.innerHTML = `<button type="button">Recherche...</button>`;
    searchPerformanceBaseSwimmers(elements.correctionSearch.value)
      .then((matches) => {
        if (requestId !== correctionSearchRequestId) return;
        correctionSuggestionMatches = matches;
        elements.correctionSuggestions.innerHTML = matches.map((swimmer) => `
          <button type="button" data-correction-swimmer="${escapeHtml(swimmer.id)}">
            ${escapeHtml(displayName(swimmer))}
            <small>${escapeHtml([swimmer.sex === "F" ? "Femme" : "Homme", swimmer.club].filter(Boolean).join(" - "))}</small>
          </button>
        `).join("") || `<button type="button">Aucun nageur trouve</button>`;
      })
      .catch((error) => {
        if (requestId !== correctionSearchRequestId) return;
        correctionSuggestionMatches = [];
        elements.correctionSuggestions.innerHTML = `<button type="button">Recherche impossible : ${escapeHtml(error?.message || error)}</button>`;
      });
  }

  async function loadCorrectionPerformanceBaseRows(swimmer) {
    const ids = swimmerKnownIds(swimmer);
    const identityKey = swimmer.identityKey || "";
    const cacheKey = JSON.stringify({ file: swimmer.perfFile || "", ids: ids.slice().sort(), identityKey });
    if (correctionRowsCache.has(cacheKey)) return correctionRowsCache.get(cacheKey);

    const promise = loadCorrectionOverlay().then(async () => {
      const knownIds = new Set(ids);
      const importedRows = (Array.isArray(correctionOverlay?.performances) ? correctionOverlay.performances : [])
        .filter((row) => performanceMatchesSwimmer(row, swimmer, knownIds, identityKey));
      const reassignedRows = (Array.isArray(correctionOverlay?.corrections) ? correctionOverlay.corrections : [])
        .map(rowFromCorrection)
        .filter((row) => row && performanceMatchesSwimmer(row, swimmer, knownIds, identityKey));

      if (swimmer.perfFile) {
        try {
          const response = await fetch(`${publicPerformanceBase}/${swimmer.perfFile}?v=${publicPerformanceVersion}`, { cache: "force-cache" });
          if (response.ok) {
            const payload = await response.json();
            const baseRows = Array.isArray(payload?.rows) ? payload.rows.map((row) => ({
              ...row,
              swimmerId: swimmer.id,
              originalSwimmerId: row.originalSwimmerId || swimmer.id,
              swimmerIdentityKey: identityKey,
              swimmer: displayName(swimmer),
              firstName: swimmer.firstName || "",
              lastName: swimmer.lastName || "",
              birthDate: swimmer.birthDate || "",
              sex: swimmer.sex || row.sex || ""
            })) : [];
            return [...applyCorrections([...baseRows, ...importedRows]), ...reassignedRows];
          }
        } catch {
          // The public static file is now the source for corrections; no Firestore fallback.
        }
      }

      return [...applyCorrections(importedRows), ...reassignedRows];
    });
    correctionRowsCache.set(cacheKey, promise);
    return promise;
  }

  async function selectCorrectionSwimmer(swimmerId) {
    await ensureCorrectionReference();
    await loadCorrectionOverlay();
    const swimmer = correctionSuggestionMatches.find((item) => swimmerKnownIds(item).includes(String(swimmerId)));
    if (!swimmer) return;
    correctionSelectedSwimmer = swimmer;
    correctionSelectedRow = null;
    elements.correctionSearch.value = displayName(swimmer);
    elements.correctionSuggestions.innerHTML = "";
    elements.correctionForm.hidden = true;
    setCorrectionListVisible(true);
    elements.correctionResults.innerHTML = `<tr><td colspan="6">Chargement des performances...</td></tr>`;
    const baseRows = await loadCorrectionPerformanceBaseRows(swimmer);
    correctionRows = baseRows
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || String(a.course || "").localeCompare(String(b.course || "")));
    updateCorrectionFilters();
    renderCorrectionRows();
  }

  function updateCorrectionFilters() {
    const courses = Array.from(new Set(correctionRows.map((row) => row.course).filter(Boolean))).sort();
    const years = Array.from(new Set(correctionRows.map(yearOf).filter(Boolean))).sort((a, b) => Number(b) - Number(a));
    fillSelect(elements.correctionCourse, courses, "Toutes", courseLabel);
    fillSelect(elements.correctionYear, years, "Toutes");
    updateCorrectionCompetitionFilter();
  }

  function updateCorrectionCompetitionFilter() {
    const selectedCourse = elements.correctionCourse?.value || "";
    const selectedYear = elements.correctionYear?.value || "";
    const competitions = Array.from(new Set(correctionRows
      .filter((row) =>
        (!selectedCourse || row.course === selectedCourse) &&
        (!selectedYear || yearOf(row) === selectedYear)
      )
      .map((row) => row.competition || row.location)
      .filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, "fr-FR"));
    fillSelect(elements.correctionCompetition, competitions, "Toutes");
  }

  function fillSelect(select, values, emptyLabel, labeler = (value) => value) {
    if (!select) return;
    const current = select.value;
    select.innerHTML = "";
    select.append(new Option(emptyLabel, ""));
    values.forEach((value) => select.append(new Option(labeler(value), value)));
    select.value = values.includes(current) ? current : "";
  }

  function filteredCorrectionRows() {
    return correctionRows.filter((row) =>
      (!elements.correctionCourse.value || row.course === elements.correctionCourse.value) &&
      (!elements.correctionYear.value || yearOf(row) === elements.correctionYear.value) &&
      (!elements.correctionCompetition.value || (row.competition || row.location) === elements.correctionCompetition.value)
    );
  }

  function renderCorrectionRows() {
    if (!elements.correctionResults) return;
    const rows = filteredCorrectionRows().slice(0, 80);
    if (!correctionSelectedSwimmer) {
      elements.correctionResults.innerHTML = `<tr><td colspan="6">Selectionne un nageur pour afficher ses performances.</td></tr>`;
      return;
    }
    if (!rows.length) {
      elements.correctionResults.innerHTML = `<tr><td colspan="6">Aucune performance avec ces filtres.</td></tr>`;
      return;
    }
    elements.correctionResults.innerHTML = rows.map((row, index) => `
      <tr class="performance-correction-row" data-correction-row="${index}" tabindex="0">
        <td>${escapeHtml(formatDate(row.date))}</td>
        <td>${escapeHtml(courseLabel(row.course))}</td>
        <td class="time">${escapeHtml(row.time || "-")}</td>
        <td>${escapeHtml(row.swimmer || displayName(correctionSelectedSwimmer))}</td>
        <td>${escapeHtml(row.club || "-")}</td>
        <td>${escapeHtml(row.competition || row.location || "-")}</td>
      </tr>
    `).join("");
    elements.correctionResults.querySelectorAll("[data-correction-row]").forEach((line) => {
      const openLine = () => openCorrectionRow(rows[Number(line.dataset.correctionRow)]);
      line.addEventListener("click", openLine);
      line.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        openLine();
      });
    });
  }

  function setCorrectionListVisible(visible) {
    if (elements.correctionResultsWrap) elements.correctionResultsWrap.hidden = !visible;
  }

  function resetCorrectionEditor({ keepRows = true } = {}) {
    correctionSelectedRow = null;
    if (elements.correctionForm) elements.correctionForm.hidden = true;
    setCorrectionListVisible(keepRows);
  }

  function renderCorrectionSplits(row) {
    const splits = Array.isArray(row.intermediateTimes) ? row.intermediateTimes : [];
    elements.correctionSplits.innerHTML = splits.length ? splits.map((split) => correctionSplitHtml(split)).join("") : "";
  }

  function correctionSplitHtml(split = {}) {
    return `
      <div class="performance-correction-split">
        <label>Code<input data-split-code type="text" value="${escapeHtml(split.code || "")}" placeholder="100SF" /></label>
        <label>Temps<input data-split-time type="text" value="${escapeHtml(split.time || "")}" placeholder="38.55" /></label>
        <button class="ghost-button" type="button" data-remove-split>Supprimer</button>
      </div>
    `;
  }

  function openCorrectionRow(row) {
    correctionSelectedRow = row;
    elements.correctionForm.hidden = false;
    setCorrectionListVisible(false);
    elements.correctionTitle.textContent = `${courseLabel(row.course)} - ${row.swimmer || displayName(correctionSelectedSwimmer)}`;
    elements.correctionTime.value = row.time || "";
    elements.correctionDate.value = String(row.date || "").match(/^\d{4}-\d{2}-\d{2}$/) ? row.date : "";
    elements.correctionClub.value = row.club || "";
    elements.correctionLocation.value = row.location || "";
    elements.correctionReason.value = "";
    renderCorrectionSplits(row);
    elements.correctionForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function rowSnapshot(row) {
    const keys = [
      "id", "source", "swimmerId", "originalSwimmerId", "swimmerIdentityKey", "swimmer", "firstName", "lastName", "birthDate",
      "sex", "clubId", "club", "clubName", "regionId", "regionLabel", "competitionId", "competition", "location", "date",
      "seasonYear", "pool", "chrono", "course", "courseLabel", "courseShortLabel", "style", "length", "isIntermediate",
      "originCourse", "originCourseShortLabel", "originPerformanceId", "category", "categoryCode", "categoryLabel",
      "timeValue", "time", "rank", "points", "intermediateTimes"
    ];
    return keys.reduce((acc, key) => {
      if (row?.[key] !== undefined) acc[key] = row[key];
      return acc;
    }, {});
  }

  function correctionPatchFromForm() {
    const intermediateTimes = Array.from(elements.correctionSplits.querySelectorAll(".performance-correction-split")).map((row) => {
      const code = row.querySelector("[data-split-code]")?.value || "";
      const timeInput = row.querySelector("[data-split-time]");
      normalizeTimeField(timeInput);
      const time = timeInput?.value || "";
      return { code, time, timeValue: parseTimeValue(time) };
    }).filter((split) => split.code || split.time);
    normalizeTimeField(elements.correctionTime);
    const patch = {
      time: elements.correctionTime.value.trim(),
      timeValue: parseTimeValue(elements.correctionTime.value),
      date: elements.correctionDate.value.trim(),
      club: elements.correctionClub.value.trim(),
      location: elements.correctionLocation.value.trim(),
      intermediateTimes
    };
    return patch;
  }

  async function savePerformanceCorrection(hidden = false) {
    if (!correctionSelectedRow) return;
    const reason = elements.correctionReason.value.trim();
    if (!reason) {
      setMessage(elements.message, "Motif obligatoire pour enregistrer une correction.");
      return;
    }
    const result = await callFunction("savePerformanceCorrection", {
      targetKey: correctionKey(correctionSelectedRow),
      targetId: correctionSelectedRow.id || "",
      targetSource: correctionSelectedRow.source || "intranap",
      targetSummary: {
        swimmer: correctionSelectedRow.swimmer || displayName(correctionSelectedSwimmer),
        course: correctionSelectedRow.course || "",
        time: correctionSelectedRow.time || "",
        date: correctionSelectedRow.date || "",
        competition: correctionSelectedRow.competition || correctionSelectedRow.location || ""
      },
      targetRow: rowSnapshot(correctionSelectedRow),
      hidden,
      patch: hidden ? {} : correctionPatchFromForm(),
      reason
    });
    correctionOverlay = null;
    correctionRowsCache.clear();
    await loadCorrectionOverlay();
    await selectCorrectionSwimmer(correctionSelectedSwimmer.id);
    const publication = publicPublicationStatus(result);
    setMessage(
      elements.message,
      hidden
        ? `Performance supprimee definitivement de la base officielle.${publication.text}`
        : `Correction enregistree dans la base officielle.${publication.text}`,
      publication.ok ? "ok" : "error"
    );
  }

  function importTitle(item = {}) {
    const metadata = item.metadata || {};
    return [metadata.competitionName, metadata.location, formatDate(metadata.date)].filter(Boolean).join(" - ") || item.fileName || item.importId;
  }

  function isSuperAdmin(status = {}) {
    const capabilities = status.claims?.livepalmesCapabilities || {};
    const profileCapabilities = Array.isArray(status.profile?.capabilities) ? status.profile.capabilities : [];
    return capabilities["admin.full"] === true || profileCapabilities.includes("admin.full");
  }

  function updateView(status = {}) {
    const signedIn = Boolean(status.signedIn);
    const superAdmin = signedIn && isSuperAdmin(status);
    const authView = elements.loginPanel ? document.body : document.querySelector("#adminImportView");
    if (authView) authView.dataset.adminAuth = signedIn ? "unlocked" : "locked";
    if (elements.loginPanel) elements.loginPanel.hidden = signedIn;
    if (elements.workbench) elements.workbench.hidden = !signedIn;
    if (elements.correctionWorkbench) elements.correctionWorkbench.hidden = !signedIn;
    if (elements.superAdminPanel) elements.superAdminPanel.hidden = !superAdmin;
    if (signedIn && elements.loginForm) elements.loginForm.reset();
    const profile = status.profile || {};
    const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || status.email || "Profil LivePalmes";
    if (elements.sessionLabel) elements.sessionLabel.textContent = name;
    if (signedIn) loadImports();
    if (!status.available) {
      setMessage(elements.loginMessage, "Firebase Authentication n'est pas disponible.");
    } else if (!signedIn) {
      setMessage(elements.loginMessage, "");
    }
  }

  async function signIn(event) {
    event?.preventDefault?.();
    const auth = ensureAdminAuth();
    if (!auth) {
      setMessage(elements.loginMessage, "Connexion Firebase indisponible.");
      return;
    }
    setMessage(elements.loginMessage, "");
    try {
      await auth.signIn(elements.loginEmail?.value, elements.loginPassword?.value);
    } catch (error) {
      setMessage(elements.loginMessage, `Connexion impossible : ${error?.message || error}`);
    }
  }

  async function signOut() {
    await ensureAdminAuth()?.signOut?.();
  }

  async function readSelectedFile(file, encoding) {
    const buffer = await file.arrayBuffer();
    try {
      return new TextDecoder(encoding || "utf-8").decode(buffer);
    } catch {
      return new TextDecoder("utf-8").decode(buffer);
    }
  }

  function isExcelFile(file) {
    const name = String(file?.name || "").toLowerCase();
    return name.endsWith(".xlsx");
  }

  function workbookSheetRows(workbook, sheetName) {
    const sheet = workbook?.Sheets?.[sheetName];
    if (!sheet) throw new Error(`Onglet ${sheetName} introuvable dans la trame Excel.`);
    return global.XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      blankrows: false,
      raw: false,
      dateNF: "dd-mm-yyyy"
    });
  }

  async function readInternationalWorkbook(file) {
    if (!global.XLSX?.read) {
      throw new Error("Lecteur Excel indisponible. Recharge la page puis reessaie.");
    }
    const buffer = await file.arrayBuffer();
    const workbook = global.XLSX.read(buffer, {
      type: "array",
      cellDates: false,
      cellNF: false,
      cellText: true,
      dateNF: "dd-mm-yyyy"
    });
    return {
      Competition: workbookSheetRows(workbook, "Competition"),
      Performances: workbookSheetRows(workbook, "Performances")
    };
  }

  async function buildPreviewPayload(file) {
    if (isExcelFile(file)) {
      return {
        sourceType: "international-xlsx",
        fileName: file.name,
        workbook: {
          sheets: await readInternationalWorkbook(file)
        }
      };
    }
    const rawText = await readSelectedFile(file, elements.encoding?.value);
    return {
      sourceType: "ffessm-txt",
      fileName: file.name,
      rawText
    };
  }

  function sourceTypeLabel(value) {
    if (value === "international-xlsx") return "Excel international";
    if (value === "ffessm-txt") return "TXT federal";
    return value || "-";
  }

  function importStatusLabel(value) {
    if (value === "deleted") return "Annule";
    if (value === "stored") return "Stocke";
    return value || "Stocke";
  }

  function updateFileMode() {
    const file = elements.file?.files?.[0];
    const excel = isExcelFile(file);
    if (elements.encoding) elements.encoding.disabled = excel;
    if (elements.encodingLabel) elements.encodingLabel.dataset.disabled = excel ? "true" : "false";
  }

  function renderPreview(result) {
    currentPreview = result;
    const metadata = result.metadata || {};
    const summary = result.summary || {};
    const recordAlerts = Array.isArray(result.recordAlerts) ? result.recordAlerts.filter(shouldDisplayRecordAlert) : [];
    const recordAlertCount = recordAlerts.length;
    elements.preview.hidden = false;
    elements.summary.innerHTML = `
      <div><span>Competition</span><strong>${escapeHtml(metadata.competitionName || "-")}</strong></div>
      <div><span>Date</span><strong>${escapeHtml(formatDate(metadata.date))}</strong></div>
      <div><span>Lieu</span><strong>${escapeHtml(metadata.location || "-")}</strong></div>
      <div><span>Bassin</span><strong>${escapeHtml(metadata.poolSize || "-")} m</strong></div>
      <div><span>Performances</span><strong>${escapeHtml(summary.importedPerformances || 0)}</strong></div>
      <div><span>Avec passage</span><strong>${escapeHtml(summary.performancesWithIntermediateTimes || 0)}</strong></div>
      <div><span>Perfs avec passage</span><strong>${escapeHtml(summary.intermediatePerformances || 0)}</strong></div>
      <div><span>Lignes ignorees</span><strong>${escapeHtml(summary.ignoredRows || 0)}</strong></div>
      <div><span>Clubs</span><strong>${escapeHtml(summary.clubs || 0)}</strong></div>
      <div><span>Alertes RF/MPF</span><strong>${escapeHtml(recordAlertCount)}</strong></div>
      <div><span>Format</span><strong>${escapeHtml(sourceTypeLabel(result.sourceType))}</strong></div>
      <div><span>Import</span><strong>${result.alreadyImported ? "Deja stocke" : "Nouveau"}</strong></div>
    `;
    const warnings = Array.isArray(result.warnings) ? result.warnings : [];
    const duplicateDetails = Array.isArray(result.duplicateDetails) ? result.duplicateDetails : [];
    const duplicateHtml = duplicateDetails.length ? `
      <div class="import-duplicates">
        <strong>Doublons possibles detectes</strong>
        ${duplicateDetails.map((group) => `
          <article>
            <div>
              <span>${escapeHtml(group.swimmer || "-")}</span>
              <small>${escapeHtml([group.course, group.time, group.club].filter(Boolean).join(" - "))}</small>
            </div>
            <div>
              <span>Lignes ${escapeHtml((group.lines || []).join(", "))}</span>
              <small>${escapeHtml((group.entries || []).map((entry) => `ligne ${entry.sourceLine}: place ${entry.rank || "-"}, ordre ${entry.order || "-"}`).join(" / "))}</small>
            </div>
          </article>
        `).join("")}
      </div>
    ` : "";
    const recordAlertHtml = recordAlerts.length ? `
      <div class="import-record-alerts">
        <strong>${escapeHtml(result.recordAlertCount || recordAlerts.length)} alerte(s) records / MPF possible(s)</strong>
        <p>Ces alertes ne modifient pas les records ni les MPF. Apres validation de l'import, tu pourras les valider ou les ignorer dans l'historique.</p>
        ${recordAlerts.slice(0, 20).map((alert) => {
          const status = alert.status === "equal" ? "egale" : "ameliore";
          const detail = [
            alert.isIntermediate ? `passage ${alert.splitDistance || ""} m` : "temps final",
            alert.originCourse ? `depuis ${alert.originCourse}` : "",
            alert.sourceLine ? `ligne ${alert.sourceLine}` : ""
          ].filter(Boolean).join(" - ");
          return `
            <article>
              <div>
                <span class="record-alert-type">${escapeHtml(alert.type || "-")}</span>
                <strong>${escapeHtml(alert.swimmer || "-")} - ${escapeHtml(alert.course || "-")} - ${escapeHtml(alert.categoryCode || alert.category || "-")}</strong>
                <small>${escapeHtml(detail)}</small>
              </div>
              <div>
                <span>${escapeHtml(alert.time || "-")} ${status} ${escapeHtml(alert.referenceTime || "-")}</span>
                <small>${escapeHtml([alert.label, alert.referenceSwimmer, formatDate(alert.referenceDate)].filter(Boolean).join(" - "))}</small>
              </div>
            </article>
          `;
        }).join("")}
        ${recordAlerts.length > 20 ? `<p class="import-record-alert-more">+ ${escapeHtml(recordAlerts.length - 20)} autre(s) alerte(s)</p>` : ""}
      </div>
    ` : "";
    elements.warnings.innerHTML = warnings.length || duplicateHtml || recordAlertHtml
      ? warnings.map((warning) => `<p>${escapeHtml(warning)}</p>`).join("") + duplicateHtml + recordAlertHtml
      : `<p class="ok">Aucune alerte detectee.</p>`;
    const rows = Array.isArray(result.samplePerformances) ? result.samplePerformances : [];
    elements.sample.innerHTML = rows.length ? rows.map((perf) => `
      <tr>
        <td>${escapeHtml([perf.firstName, perf.lastName].filter(Boolean).join(" "))}<small>${escapeHtml(perf.swimmerId || "")}</small></td>
        <td>${escapeHtml(perf.course || "-")}</td>
        <td class="time">${escapeHtml(perf.time || "-")}</td>
        <td>${escapeHtml((perf.intermediateTimes || []).map((split) => `${split.code} ${split.time}`).join(" · ") || "-")}</td>
        <td>${escapeHtml(perf.categoryCode || "-")}</td>
        <td>${escapeHtml(perf.club || "-")}</td>
      </tr>
    `).join("") : `<tr><td colspan="6">Aucune performance a afficher.</td></tr>`;
    elements.validate.disabled = result.alreadyImported || !summary.importedPerformances;
  }

  async function previewImport(event) {
    event?.preventDefault?.();
    const file = elements.file?.files?.[0];
    if (!file) {
      setMessage(elements.message, "Choisis un fichier TXT ou XLSX.");
      return;
    }
    currentFile = file;
    setMessage(elements.message, "Analyse du fichier en cours...", "ok");
    elements.preview.hidden = true;
    try {
      currentPayload = await buildPreviewPayload(file);
      currentRawText = currentPayload.rawText || "";
      const result = await callFunction("previewCompetitionImport", currentPayload);
      renderPreview(result);
      setMessage(elements.message, `Previsualisation prete : ${result.summary?.importedPerformances || 0} performances importables.`, "ok");
    } catch (error) {
      currentPreview = null;
      currentPayload = null;
      setMessage(elements.message, `Analyse impossible : ${error?.message || error}`);
    }
  }

  async function validateImport() {
    if (!currentPreview || !currentPayload || !currentFile) {
      setMessage(elements.message, "Previsualise le fichier avant de valider.");
      return;
    }
    if (!global.confirm("Confirmer l'ajout de cette competition dans la base LivePalmes ?")) return;
    elements.validate.disabled = true;
    setMessage(elements.message, "Import en cours...", "ok");
    try {
      const result = await callFunction("createCompetitionImport", {
        ...currentPayload,
        fileName: currentFile.name,
        importId: currentPreview.importId
      });
      const sync = result.performanceBaseSync || {};
      const publication = publicPublicationStatus(result);
      const syncStatus = sync.ok
        ? ` ${sync.written || 0} performance(s) ajoutee(s) a la base officielle.`
        : " Synchronisation avec la base officielle a verifier.";
      setMessage(
        elements.message,
        `Import stocke : ${result.summary?.importedPerformances || 0} performances.${syncStatus}${publication.text}`,
        sync.ok && publication.ok ? "ok" : "error"
      );
      await loadImports();
      elements.validate.disabled = true;
    } catch (error) {
      elements.validate.disabled = false;
      setMessage(elements.message, `Import impossible : ${error?.message || error}`);
    }
  }

  function recordAlertDecisionStatus(alert = {}) {
    return alert.decision?.status || "pending";
  }

  function normalizedRecordAlertName(value) {
    return normalize(value)
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .sort()
      .join(" ");
  }

  function sameRecordAlertSwimmer(left, right) {
    const cleanLeft = normalize(left).replace(/[^a-z0-9]+/g, " ").trim();
    const cleanRight = normalize(right).replace(/[^a-z0-9]+/g, " ").trim();
    if (!cleanLeft || !cleanRight) return false;
    return cleanLeft === cleanRight || normalizedRecordAlertName(cleanLeft) === normalizedRecordAlertName(cleanRight);
  }

  function shouldDisplayRecordAlert(alert = {}) {
    return !(alert.status === "equal" &&
      Number(alert.timeValue || 0) === Number(alert.referenceValue || 0) &&
      sameRecordAlertSwimmer(alert.swimmer, alert.referenceSwimmer));
  }

  function recordAlertDecisionLabel(alert = {}) {
    const status = recordAlertDecisionStatus(alert);
    if (status === "accepted") return "Alerte validee";
    if (status === "rejected") return "Ignoree";
    return "A verifier";
  }

  function recordAlertDecisionMeta(alert = {}) {
    const decision = alert.decision || {};
    if (!decision.status || decision.status === "pending") return "";
    return [
      decision.updatedByName || decision.updatedByEmail,
      decision.updatedAt ? new Date(decision.updatedAt).toLocaleString("fr-FR") : ""
    ].filter(Boolean).join(" - ");
  }

  function recordAlertDetail(alert = {}) {
    return [
      alert.isIntermediate ? `passage ${alert.splitDistance || ""} m` : "temps final",
      alert.originCourse ? `depuis ${alert.originCourse}` : "",
      alert.sourceLine ? `ligne ${alert.sourceLine}` : ""
    ].filter(Boolean).join(" - ");
  }

  function recordAlertReference(alert = {}) {
    return [alert.label, alert.referenceSwimmer, formatDate(alert.referenceDate)].filter(Boolean).join(" - ");
  }

  function renderImportRecordAlerts(item = {}) {
    const alerts = Array.isArray(item.recordAlerts) ? item.recordAlerts.filter(shouldDisplayRecordAlert) : [];
    if (!alerts.length) return "";
    const total = Number(item.recordAlertCount || 0) || alerts.length;
    return `
      <div class="competition-import-alerts">
        <div class="competition-import-alerts-head">
          <strong>Alertes RF / MPF</strong>
          <span>${escapeHtml(alerts.length)} affichee(s) sur ${escapeHtml(total)}</span>
        </div>
        <p>Valider une alerte marque qu'elle a ete controlee. Les records et MPF restent a mettre a jour dans la page d'administration dediee.</p>
        ${alerts.map((alert, index) => {
          const status = alert.status === "equal" ? "egale" : "ameliore";
          const decision = recordAlertDecisionStatus(alert);
          const meta = recordAlertDecisionMeta(alert);
          return `
            <article class="competition-import-alert" data-alert-status="${escapeHtml(decision)}">
              <div>
                <span class="record-alert-type">${escapeHtml(alert.type || "-")}</span>
                <strong>${escapeHtml(alert.swimmer || "-")} - ${escapeHtml(alert.course || "-")} - ${escapeHtml(alert.categoryCode || alert.category || "-")}</strong>
                <small>${escapeHtml(recordAlertDetail(alert))}</small>
              </div>
              <div>
                <span>${escapeHtml(alert.time || "-")} ${status} ${escapeHtml(alert.referenceTime || "-")}</span>
                <small>${escapeHtml(recordAlertReference(alert))}</small>
              </div>
              <div class="competition-import-alert-decision">
                <span>${escapeHtml(recordAlertDecisionLabel(alert))}</span>
                ${meta ? `<small>${escapeHtml(meta)}</small>` : ""}
                <div>
                  <button type="button" data-record-alert-action="accepted" data-import-id="${escapeHtml(item.importId)}" data-alert-index="${escapeHtml(index)}"${decision === "accepted" ? " disabled" : ""}>Valider l'alerte</button>
                  <button type="button" class="ghost-button" data-record-alert-action="rejected" data-import-id="${escapeHtml(item.importId)}" data-alert-index="${escapeHtml(index)}"${decision === "rejected" ? " disabled" : ""}>Ignorer</button>
                  ${decision !== "pending" ? `<button type="button" class="ghost-button" data-record-alert-action="pending" data-import-id="${escapeHtml(item.importId)}" data-alert-index="${escapeHtml(index)}">Remettre a verifier</button>` : ""}
                  ${decision === "accepted" ? `<a class="record-alert-admin-link" href="admin.html">Ouvrir records / MPF</a>` : ""}
                </div>
              </div>
            </article>
          `;
        }).join("")}
        ${total > alerts.length ? `<p class="import-record-alert-more">+ ${escapeHtml(total - alerts.length)} autre(s) alerte(s) non affichee(s)</p>` : ""}
      </div>
    `;
  }

  function importYear(item = {}) {
    const competitionDate = String(item.metadata?.date || "");
    const competitionYear = competitionDate.match(/(?:19|20)\d{2}/)?.[0] || "";
    if (competitionYear) return competitionYear;
    const importedAt = item.importedAt ? new Date(item.importedAt) : null;
    return importedAt && !Number.isNaN(importedAt.getTime()) ? String(importedAt.getFullYear()) : "";
  }

  function updateImportYearOptions() {
    if (!elements.importsYear) return;
    const current = elements.importsYear.value;
    const years = Array.from(new Set(importsCache.map(importYear).filter(Boolean)))
      .sort((a, b) => Number(b) - Number(a));
    elements.importsYear.innerHTML = `<option value="">Toutes les années</option>${years
      .map((year) => `<option value="${escapeHtml(year)}">${escapeHtml(year)}</option>`)
      .join("")}`;
    if (years.includes(current)) elements.importsYear.value = current;
  }

  function filteredImports() {
    const query = normalize(elements.importsSearch?.value);
    const year = elements.importsYear?.value || "";
    const status = elements.importsStatus?.value || "";
    return importsCache.filter((item) => {
      if (year && importYear(item) !== year) return false;
      if (status && String(item.status || "stored") !== status) return false;
      if (!query) return true;
      const metadata = item.metadata || {};
      const haystack = normalize([
        metadata.competitionName,
        metadata.location,
        metadata.date,
        item.fileName,
        item.importId,
        item.importedByEmail
      ].filter(Boolean).join(" "));
      return query.split(/\s+/).filter(Boolean).every((token) => haystack.includes(token));
    });
  }

  function importCountLabel(count) {
    return `${count} import${count > 1 ? "s" : ""}`;
  }

  function renderImports(items = []) {
    if (!elements.importsList) return;
    elements.importsList.querySelectorAll(".competition-import-row[open][data-import-id]").forEach((row) => {
      openImportIds.add(row.dataset.importId);
    });
    importsCache = Array.isArray(items) ? items : [];
    updateImportYearOptions();
    if (!importsCache.length) {
      if (elements.importsFilterSummary) elements.importsFilterSummary.textContent = "";
      elements.importsList.innerHTML = `<p class="admin-access-empty">Aucun import stocke pour le moment.</p>`;
      return;
    }
    const filteredItems = filteredImports();
    if (elements.importsFilterSummary) {
      elements.importsFilterSummary.textContent = filteredItems.length === importsCache.length
        ? importCountLabel(filteredItems.length)
        : `${importCountLabel(filteredItems.length)} sur ${importCountLabel(importsCache.length)}`;
    }
    if (!filteredItems.length) {
      elements.importsList.innerHTML = `<p class="admin-access-empty">Aucun import ne correspond aux filtres.</p>`;
      return;
    }
    const sortedItems = filteredItems
      .slice()
      .sort((a, b) => String(b.importedAt || "").localeCompare(String(a.importedAt || "")));
    const visibleCount = Math.min(importsVisibleCount, sortedItems.length);
    const latestItems = sortedItems.slice(0, visibleCount);
    const remainingCount = Math.max(0, sortedItems.length - latestItems.length);
    elements.importsList.innerHTML = latestItems.map((item) => {
      const summary = item.summary || {};
      const warnings = Array.isArray(item.warnings) ? item.warnings.length : 0;
      const duplicateCount = Array.isArray(item.duplicateDetails) ? item.duplicateDetails.length : 0;
      const recordAlertCount = Number(item.recordAlertCount || 0) || 0;
      const importedAt = item.importedAt ? new Date(item.importedAt).toLocaleString("fr-FR") : "";
      const deleted = item.status === "deleted";
      return `
        <details class="competition-import-row" data-import-id="${escapeHtml(item.importId || "")}" data-import-status="${escapeHtml(item.status || "stored")}"${openImportIds.has(item.importId) ? " open" : ""}>
          <summary>
            <strong>${escapeHtml(importTitle(item))}</strong>
            <span>${escapeHtml(summary.importedPerformances || 0)} perf. - ${escapeHtml(importedAt || "date inconnue")}</span>
          </summary>
          <div class="competition-import-details">
            <div><span>Statut</span><strong>${escapeHtml(importStatusLabel(item.status))}</strong></div>
            <div><span>Format</span><strong>${escapeHtml(sourceTypeLabel(item.sourceType))}</strong></div>
            <div><span>Fichier</span><strong>${escapeHtml(item.fileName || item.importId || "-")}</strong></div>
            <div><span>Clubs</span><strong>${escapeHtml(summary.clubs || 0)}</strong></div>
            <div><span>Warnings</span><strong>${escapeHtml(warnings)}</strong></div>
            <div><span>RF / MPF</span><strong>${escapeHtml(recordAlertCount)}</strong></div>
            <div><span>Doublons</span><strong>${escapeHtml(duplicateCount)}</strong></div>
            <div><span>Importe par</span><strong>${escapeHtml(item.importedByEmail || "-")}</strong></div>
          </div>
          <div class="competition-import-actions">
            ${deleted
              ? `<span>Import annule : ses performances ne sont plus publiees.</span>`
              : `<button type="button" class="danger-button" data-delete-import="${escapeHtml(item.importId || "")}">Annuler cet import</button>`}
          </div>
          ${renderImportRecordAlerts(item)}
        </details>
      `;
    }).join("") + (remainingCount
      ? `
        <div class="competition-imports-more">
          <p class="competition-imports-note">${escapeHtml(latestItems.length)} imports affiches sur ${escapeHtml(sortedItems.length)}.</p>
          <button class="ghost-button compact" type="button" data-show-more-imports>
            Afficher ${escapeHtml(Math.min(importsPageSize, remainingCount))} import(s) de plus
          </button>
        </div>
      `
      : "");
  }

  async function updateRecordAlertDecision(button) {
    const importId = button?.dataset?.importId || "";
    const alertIndex = Number(button?.dataset?.alertIndex);
    const status = button?.dataset?.recordAlertAction || "";
    if (!importId || !Number.isInteger(alertIndex) || !status) return;
    openImportIds.add(importId);
    const previousLabel = button.textContent;
    button.disabled = true;
    button.textContent = "Enregistrement...";
    try {
      await callFunction("updateCompetitionImportRecordAlertDecision", { importId, alertIndex, status });
      if (status === "accepted") {
        const item = importsCache.find((entry) => entry.importId === importId);
        queueRecordDraftFromAlert(item, alertIndex);
      }
      setMessage(
        elements.message,
        status === "rejected"
          ? "Alerte ignoree."
          : status === "accepted"
            ? "Alerte validee. Un brouillon est prepare dans l'administration records / MPF."
            : "Alerte remise a verifier.",
        "ok"
      );
      await loadImports();
    } catch (error) {
      button.disabled = false;
      button.textContent = previousLabel;
      setMessage(elements.message, `Decision impossible : ${error?.message || error}`);
    }
  }

  async function deleteCompetitionImport(button) {
    const importId = button?.dataset?.deleteImport || "";
    const item = importsCache.find((entry) => entry.importId === importId);
    if (!importId || !item) return;
    const summary = item.summary || {};
    const count = Number(summary.importedPerformances || 0) || 0;
    const title = importTitle(item);
    if (!global.confirm(`Annuler cet import ?\n\n${title}\n${count} performance(s) seront retirees des TOP et des fiches nageurs apres republication.\n\nCette action est conservee dans l'historique.`)) {
      return;
    }
    openImportIds.add(importId);
    const previousLabel = button.textContent;
    button.disabled = true;
    button.textContent = "Annulation...";
    setMessage(elements.message, "Annulation de l'import et republication des donnees publiques...", "ok");
    try {
      const result = await callFunction("deleteCompetitionImport", { importId });
      const publication = publicPublicationStatus(result);
      setMessage(
        elements.message,
        `Import annule : ${result.performanceBaseCount || 0} performance(s) desactivee(s).${publication.text}`,
        publication.ok ? "ok" : "error"
      );
      await loadImports();
    } catch (error) {
      button.disabled = false;
      button.textContent = previousLabel;
      setMessage(elements.message, `Annulation impossible : ${error?.message || error}`);
    }
  }

  async function loadImports() {
    if (!ensureAdminAuth()?.isAdminAuthenticated?.()) return;
    try {
      const result = await callFunction("listCompetitionImports", {});
      renderImports(Array.isArray(result.imports) ? result.imports : []);
    } catch (error) {
      if (elements.importsList) {
        elements.importsList.innerHTML = `<p class="admin-access-empty">Lecture des imports impossible : ${escapeHtml(error?.message || error)}</p>`;
      }
    }
  }

  function downloadJson(fileName, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function exportAdditionalPerformanceData() {
    if (!ensureAdminAuth()?.isAdminAuthenticated?.()) return;
    if (elements.importsExport) elements.importsExport.disabled = true;
    setMessage(elements.message, "Preparation de l'export des donnees publiques...", "ok");
    try {
      const result = await callFunction("exportAdditionalPerformanceData", {});
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      downloadJson(`livepalmes-donnees-publiques-${stamp}.json`, result);
      setMessage(elements.message, `${result.performanceCount || 0} performance(s) exportee(s) pour consolidation.`, "ok");
    } catch (error) {
      setMessage(elements.message, `Export impossible : ${error?.message || error}`);
    } finally {
      if (elements.importsExport) elements.importsExport.disabled = false;
    }
  }

  async function publishPerformancePublicData() {
    if (!ensureAdminAuth()?.isAdminAuthenticated?.()) return;
    if (elements.publishPublicData) elements.publishPublicData.disabled = true;
    correctionOverlay = null;
    setMessage(elements.publishPublicDataMessage, "Publication des donnees publiques depuis la base unique...", "ok");
    try {
      const result = await callFunction("publishPerformancePublicData", {});
      setMessage(
        elements.publishPublicDataMessage,
        `${result.performanceCount || 0} performance(s) importee(s) et ${result.correctionCount || 0} correction(s) publiee(s). Les TOP et fiches nageurs peuvent etre recharges.`,
        "ok"
      );
    } catch (error) {
      setMessage(elements.publishPublicDataMessage, `Publication impossible : ${error?.message || error}`);
    } finally {
      if (elements.publishPublicData) elements.publishPublicData.disabled = false;
    }
  }

  function renderMigrationStatus(status = {}) {
    if (!elements.migrationStatus) return;
    const chunks = Array.isArray(status.chunks) ? status.chunks : [];
    const next = chunks.find((chunk) => chunk.status !== "completed");
    elements.migrationStatus.hidden = false;
    elements.migrationStatus.innerHTML = `
      <div><span>Lots migres</span><strong>${escapeHtml(status.completedChunks || 0)} / ${escapeHtml(status.totalChunks || 0)}</strong></div>
      <div><span>Performances migrees</span><strong>${escapeHtml(status.migratedPerformances || 0)} / ${escapeHtml(status.totalPerformances || 0)}</strong></div>
      <div><span>Prochain lot</span><strong>${escapeHtml(next?.name || "Termine")}</strong></div>
    `;
  }

  async function loadPerformanceMigrationStatus() {
    if (!ensureAdminAuth()?.isAdminAuthenticated?.()) return;
    if (elements.migrationStatusButton) elements.migrationStatusButton.disabled = true;
    setMessage(elements.publishPublicDataMessage, "Lecture du statut de migration...", "ok");
    try {
      const result = await callFunction("getPerformanceBaseMigrationStatus", {});
      renderMigrationStatus(result);
      setMessage(elements.publishPublicDataMessage, "Statut de migration actualise.", "ok");
    } catch (error) {
      setMessage(elements.publishPublicDataMessage, `Statut migration impossible : ${error?.message || error}`);
    } finally {
      if (elements.migrationStatusButton) elements.migrationStatusButton.disabled = false;
    }
  }

  async function migrateNextPerformanceBaseChunk() {
    if (!ensureAdminAuth()?.isAdminAuthenticated?.()) return;
    if (!global.confirm("Migrer le prochain lot historique vers la base LivePalmes officielle ?")) return;
    if (elements.migrationNext) elements.migrationNext.disabled = true;
    setMessage(elements.publishPublicDataMessage, "Migration du prochain lot en cours...", "ok");
    try {
      const result = await callFunction("migratePerformanceBaseNextChunk", {});
      if (result.done) {
        setMessage(elements.publishPublicDataMessage, "Tous les lots historiques sont deja migres.", "ok");
      } else {
        const chunkProgress = result.totalCount ? ` (${result.migratedCount || 0} / ${result.totalCount})` : "";
        setMessage(elements.publishPublicDataMessage, `Lot ${result.chunk} : ${result.batchCount || 0} performances migrees${chunkProgress}.`, "ok");
      }
      await loadPerformanceMigrationStatus();
    } catch (error) {
      setMessage(elements.publishPublicDataMessage, `Migration impossible : ${error?.message || error}`);
    } finally {
      if (elements.migrationNext) elements.migrationNext.disabled = false;
    }
  }

  async function migrateAllPerformanceBaseChunks() {
    if (!ensureAdminAuth()?.isAdminAuthenticated?.()) return;
    if (!global.confirm("Lancer la migration automatique complete ? La page doit rester ouverte jusqu'a la fin.")) return;
    migrationAutoRunning = true;
    if (elements.migrationAll) elements.migrationAll.disabled = true;
    if (elements.migrationNext) elements.migrationNext.disabled = true;
    try {
      while (migrationAutoRunning) {
        const result = await callFunction("migratePerformanceBaseNextChunk", {});
        if (result.done) {
          setMessage(elements.publishPublicDataMessage, "Migration historique terminee.", "ok");
          await loadPerformanceMigrationStatus();
          break;
        }
        const total = result.totalPerformances || 0;
        const migrated = result.migratedPerformances || 0;
        const chunkProgress = result.totalCount ? `${result.migratedCount || 0} / ${result.totalCount}` : "";
        setMessage(
          elements.publishPublicDataMessage,
          `Migration en cours : ${migrated} / ${total} performances. Lot ${result.chunk}${chunkProgress ? ` (${chunkProgress})` : ""}.`,
          "ok"
        );
        renderMigrationStatus({
          completedChunks: result.completedChunks || 0,
          totalChunks: result.totalChunks || 0,
          migratedPerformances: migrated,
          totalPerformances: total,
          chunks: []
        });
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    } catch (error) {
      setMessage(elements.publishPublicDataMessage, `Migration automatique interrompue : ${error?.message || error}`);
      await loadPerformanceMigrationStatus();
    } finally {
      migrationAutoRunning = false;
      if (elements.migrationAll) elements.migrationAll.disabled = false;
      if (elements.migrationNext) elements.migrationNext.disabled = false;
    }
  }

  function init() {
    const auth = ensureAdminAuth();
    updateView(auth?.status?.() || {});
    elements.loginForm?.addEventListener("submit", signIn);
    elements.signOut?.addEventListener("click", signOut);
    elements.file?.addEventListener("change", updateFileMode);
    elements.form?.addEventListener("submit", previewImport);
    elements.validate?.addEventListener("click", validateImport);
    elements.importsRefresh?.addEventListener("click", loadImports);
    elements.importsExport?.addEventListener("click", exportAdditionalPerformanceData);
    const applyImportFilters = () => {
      importsVisibleCount = importsPageSize;
      renderImports(importsCache);
    };
    elements.importsSearch?.addEventListener("input", applyImportFilters);
    elements.importsYear?.addEventListener("input", applyImportFilters);
    elements.importsStatus?.addEventListener("input", applyImportFilters);
    elements.importsList?.addEventListener("click", (event) => {
      const showMoreButton = event.target.closest("[data-show-more-imports]");
      if (showMoreButton) {
        importsVisibleCount += importsPageSize;
        renderImports(importsCache);
        return;
      }
      const deleteButton = event.target.closest("[data-delete-import]");
      if (deleteButton) {
        deleteCompetitionImport(deleteButton);
        return;
      }
      const button = event.target.closest("[data-record-alert-action]");
      if (!button) return;
      updateRecordAlertDecision(button);
    });
    elements.publishPublicData?.addEventListener("click", publishPerformancePublicData);
    elements.migrationStatusButton?.addEventListener("click", loadPerformanceMigrationStatus);
    elements.migrationNext?.addEventListener("click", migrateNextPerformanceBaseChunk);
    elements.migrationAll?.addEventListener("click", migrateAllPerformanceBaseChunks);
    elements.correctionSearch?.addEventListener("input", () => {
      resetCorrectionEditor({ keepRows: Boolean(correctionSelectedSwimmer) });
      Promise.all([ensureCorrectionReference(), loadCorrectionOverlay()]).then(renderCorrectionSuggestions);
    });
    elements.correctionSuggestions?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-correction-swimmer]");
      if (!button) return;
      selectCorrectionSwimmer(button.dataset.correctionSwimmer).catch((error) => {
        setMessage(elements.message, `Chargement impossible : ${error?.message || error}`);
      });
    });
    elements.correctionBackToList?.addEventListener("click", () => {
      resetCorrectionEditor({ keepRows: true });
      renderCorrectionRows();
      elements.correctionResultsWrap?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    [elements.correctionCourse, elements.correctionYear].forEach((select) => {
      select?.addEventListener("input", () => {
        resetCorrectionEditor({ keepRows: true });
        updateCorrectionCompetitionFilter();
        renderCorrectionRows();
      });
    });
    elements.correctionCompetition?.addEventListener("input", () => {
      resetCorrectionEditor({ keepRows: true });
      renderCorrectionRows();
    });
    elements.correctionTime?.addEventListener("blur", () => normalizeTimeField(elements.correctionTime));
    elements.correctionAddSplit?.addEventListener("click", () => {
      elements.correctionSplits.insertAdjacentHTML("beforeend", correctionSplitHtml());
    });
    elements.correctionSplits?.addEventListener("focusout", (event) => {
      if (event.target?.matches?.("[data-split-time]")) normalizeTimeField(event.target);
    });
    elements.correctionSplits?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-remove-split]");
      if (!button) return;
      button.closest(".performance-correction-split")?.remove();
    });
    elements.correctionForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      savePerformanceCorrection(false).catch((error) => {
        setMessage(elements.message, `Correction impossible : ${error?.message || error}`);
      });
    });
    elements.correctionHide?.addEventListener("click", () => {
      if (!global.confirm("La suppression de cette performance est definitive. Confirmer la suppression ?")) return;
      savePerformanceCorrection(true).catch((error) => {
        setMessage(elements.message, `Suppression impossible : ${error?.message || error}`);
      });
    });
    updateFileMode();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})(window);
