(function attachLivePalmesDtnQualifications(global) {
  const PUBLIC_TOP_BASE = global.LivePalmesEnvironment.publicStorageUrl("performance-public-firestore/tops");
  const XLSX_SCRIPT_URL = "performances/public/vendor/xlsx.full.min.js?v=20260722-dtn-export-1";
  const COURSE_ORDER = ["50SF", "100SF", "200SF", "400SF", "800SF", "1500SF", "50AP", "100IS", "200IS", "400IS", "50BI", "100BI", "200BI", "400BI"];
  const COURSE_LABELS = {
    "50SF": "50 SF", "100SF": "100 SF", "200SF": "200 SF", "400SF": "400 SF", "800SF": "800 SF", "1500SF": "1500 SF",
    "50AP": "50 AP", "100IS": "100 IS", "200IS": "200 IS", "400IS": "400 IS",
    "50BI": "50 BI", "100BI": "100 BI", "200BI": "200 BI", "400BI": "400 BI"
  };
  const ALL_CATEGORIES = ["P", "B", "M", "C", "J", "S", "M30+", "M40+", "M50+", "M60+", "M70+", "M80+"];
  const SENIOR_AND_OLDER_CATEGORIES = ["S", "M30+", "M40+", "M50+", "M60+", "M70+", "M80+"];
  const TIME_GRID_IDS = ["TSP", "TRP", "TJP", "TEP", "TU16C2", "TU16C1"];
  const LISTING_REFRESH_DELAYS_MS = [1500, 2500, 4000, 7000, 12000, 18000];
  const LISTING_PREFERENCES_KEY = "livepalmes:dtn-listing-preferences";
  const EDF_STANDARDS = [
    { id: "TSP", label: "TSP", tabLabel: "Temps senior", tabGroup: "senior", description: "Temps senior piscine · tous âges", birthMin: 0 },
    { id: "TRP", label: "TRP", tabLabel: "Temps relève", tabGroup: "senior", description: "Temps relève piscine · 2005 et après", birthMin: 2005 },
    { id: "TJP", label: "TJP", tabLabel: "Temps junior", tabGroup: "junior", description: "Temps junior piscine · 2009 et après", birthMin: 2009 },
    { id: "TEP", label: "TEP", tabLabel: "Temps espoir", tabGroup: "junior", description: "Temps espoir piscine · 2010 et après", birthMin: 2010 },
    { id: "TU16C2", label: "TU16 C2", tabLabel: "TU16 C2", tabGroup: "u16", description: "Temps U16 Cadet 2 · 2011 et après", birthMin: 2011 },
    { id: "TU16C1", label: "TU16 C1", tabLabel: "TU16 C1", tabGroup: "u16", description: "Temps U16 Cadet 1 · 2012 et après", birthMin: 2012 }
  ];

  const SEASONS = [{
    id: "2025-2026",
    label: "2025–2026",
    performanceSeason: 2026,
    franceCompetitionIds: ["4978", "5039", "4979"],
    franceCompetitions: ["France des clubs · Dijon", "Meeting national de Rennes", "World Cup · Aix-en-Provence"],
    edfCompetitions: ["Meeting national de Rennes", "France des clubs · Dijon", "World Cup · Aix-en-Provence", "France Élite · Limoges"],
    listingRules: {
      releve: { id: "RELEVE", sourceId: "TRP", minAge: 0, maxAge: 21 },
      espoir: [
        { id: "TEC1", sourceId: "TU16C1", minAge: 14, maxAge: 15 },
        { id: "TEP", sourceId: "TEP", minAge: 16, maxAge: 18 }
      ]
    },
    france: {
      F: {
        S: ["21.75", "48.90", "1:50.00", "4:02.00", "8:33.00", "18:00.00", "20.75", "48.40", "1:49.00", "4:40.00", "25.50", "55.80", "2:03.00", "4:30.00"],
        J: ["23.75", "52.50", "1:57.00", "4:14.00", "8:54.00", "18:30.00", "22.75", "52.00", "1:55.00", "4:50.00", "27.00", "58.00", "2:12.00", "4:50.00"]
      },
      M: {
        S: ["19.25", "42.60", "1:40.00", "3:37.00", "7:47.00", "17:00.00", "18.25", "42.10", "1:39.00", "4:15.00", "22.20", "50.00", "1:51.00", "4:00.00"],
        J: ["21.75", "47.00", "1:47.00", "3:54.00", "8:04.00", "17:30.00", "20.75", "46.50", "1:45.00", "4:35.00", "23.50", "52.00", "1:56.00", "4:20.00"]
      }
    },
    edf: {
      M: {
        "50BI": ["001909", "001949", "002039", "002059", "002209", "002279"],
        "100BI": ["004239", "004309", "004499", "004539", "004849", "004999"],
        "200BI": ["013629", "013819", "014099", "014299", "014799", "015099"],
        "400BI": ["033139", "033499", "033999", "034399", "035599", "040399"],
        "50SF": ["001589", null, "001739", "001789", "001889", "001949"],
        "100SF": ["003589", "003729", "003889", "003999", "004199", "004299"],
        "200SF": ["012239", "012489", "012819", "013089", "013399", "013749"],
        "400SF": ["030299", "030699", "031479", "031879", "032599", "033699"],
        "800SF": ["063399", null, "065499", "070199", "071799", "073599"],
        "1500SF": ["124799", null, "131899", "133199", null, "143699"],
        "50AP": ["001459", "001499", "001569", "001619", "001719", "001799"],
        "100IS": ["003359", null, "003689", "003849", "003999", "004249"],
        "200IS": ["011699", null, "012399", "012649", "013199", "013699"],
        "400IS": ["025299", null, "030449", "031019", null, "033199"]
      },
      F: {
        "50BI": ["002219", "002269", "002329", "002359", "002439", "002509"],
        "100BI": ["004899", "004969", "005059", "005139", "005349", "005549"],
        "200BI": ["014739", "014799", "015159", "015279", "015799", "020199"],
        "400BI": ["035099", "035599", "040029", "040399", "041199", "042199"],
        "50SF": ["001809", null, "001919", "001949", "002069", "002169"],
        "100SF": ["003999", "004109", "004249", "004319", "004599", "004799"],
        "200SF": ["013169", "013399", "013599", "013749", "014399", "014699"],
        "400SF": ["032249", "032599", "033179", "033399", "034399", "035199"],
        "800SF": ["070999", null, "071999", "072699", "074999", "080299"],
        "1500SF": ["135399", null, "140899", "141999", null, "152500"],
        "50AP": ["001669", "001699", "001759", "001789", "001929", "002009"],
        "100IS": ["003779", null, "004039", "004159", "004399", "004599"],
        "200IS": ["012599", null, "012999", "013349", "013899", "014199"],
        "400IS": ["030999", null, "032079", "032619", null, "034200"]
      }
    }
  }];

  const elements = {};
  const state = {
    grid: "france",
    sex: "F",
    edfTab: "TSP",
    listingTab: "releve",
    listingFilters: { performance: "all", sex: "all", club: "all", course: "all" },
    seasonId: SEASONS[0].id,
    initialized: false,
    requestId: 0
  };
  const rowCache = new Map();
  const overviewCache = new Map();
  const listingOverviewCache = new Map();
  let currentListingOverview = null;
  let xlsxLoadPromise = null;
  let longOperation = null;

  function ensureLongOperation() {
    if (!longOperation && global.LivePalmesLongOperation?.create) {
      longOperation = global.LivePalmesLongOperation.create({
        element: document.querySelector("#adminDtnLongOperation"),
        busyTargets: [document.querySelector("#adminDtnView")]
      });
    }
    return longOperation;
  }

  function restoreListingPreferences() {
    try {
      const preferences = JSON.parse(global.sessionStorage?.getItem(LISTING_PREFERENCES_KEY) || "{}");
      if (["releve", "espoir"].includes(preferences.tab)) state.listingTab = preferences.tab;
      if (["all", "F", "M"].includes(preferences.sex)) state.listingFilters.sex = preferences.sex;
    } catch {}
  }

  function persistListingPreferences() {
    try {
      global.sessionStorage?.setItem(LISTING_PREFERENCES_KEY, JSON.stringify({ tab: state.listingTab, sex: state.listingFilters.sex }));
    } catch {}
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  }

  function selectedSeason() {
    return SEASONS.find((season) => season.id === state.seasonId) || SEASONS[0];
  }

  function functionsService() {
    const firebase = global.firebase;
    const config = global.LivePalmesAppConfig?.firebaseConfig;
    if (!firebase?.initializeApp || !firebase?.functions || !config) return null;
    if (!firebase.apps?.length) firebase.initializeApp(config);
    try {
      const service = firebase.app().functions(global.LivePalmesAppConfig?.firebaseFunctionsRegion || "europe-west1");
      return global.LivePalmesAppConfig?.configureFunctionsService?.(service) || service;
    } catch {
      const service = firebase.functions(global.LivePalmesAppConfig?.firebaseFunctionsRegion || "europe-west1");
      return global.LivePalmesAppConfig?.configureFunctionsService?.(service) || service;
    }
  }

  function waitForAuthenticatedUser() {
    const auth = global.firebase?.auth?.();
    if (!auth) return Promise.reject(new Error("Authentification indisponible"));
    if (auth.currentUser) return Promise.resolve(auth.currentUser);
    return new Promise((resolve, reject) => {
      let unsubscribe = () => {};
      const timeout = global.setTimeout(() => { unsubscribe(); reject(new Error("Connexion requise")); }, 10000);
      unsubscribe = auth.onAuthStateChanged((user) => {
        if (!user) return;
        global.clearTimeout(timeout);
        unsubscribe();
        resolve(user);
      });
    });
  }

  function edfThresholdPayload(season, sex) {
    return EDF_STANDARDS.map((standard) => ({
      id: standard.id,
      birthMin: standard.birthMin,
      thresholds: Object.fromEntries(COURSE_ORDER.map((course) => [course, encodedTime(season.edf[sex][course]?.[TIME_GRID_IDS.indexOf(standard.id)])?.value || 0]))
    }));
  }

  function listingRulesPayload(season) {
    const rules = [season.listingRules.releve, ...season.listingRules.espoir];
    return rules.map((rule) => ({
      ...rule,
      thresholds: Object.fromEntries(["F", "M"].map((sex) => [sex, Object.fromEntries(COURSE_ORDER.map((course) => {
        const encoded = season.edf[sex][course]?.[TIME_GRID_IDS.indexOf(rule.sourceId)];
        return [course, encodedTime(encoded)?.value || 0];
      }))]))
    }));
  }

  function loadListingOverview(season, options = {}) {
    const key = season.id;
    if (!options.rebuild && !options.refresh && listingOverviewCache.has(key)) return listingOverviewCache.get(key);
    const promise = waitForAuthenticatedUser().then(() => {
      const functions = functionsService();
      if (!functions?.httpsCallable) throw new Error("Service DTN indisponible");
      return functions.httpsCallable("getDtnListingOverview")({
        seasonYear: season.performanceSeason,
        rules: listingRulesPayload(season),
        rebuild: options.rebuild === true
      });
    }).then((result) => result.data || {});
    listingOverviewCache.set(key, promise);
    promise.catch(() => listingOverviewCache.delete(key));
    return promise;
  }

  async function waitForListingRefresh(season, initialOverview) {
    let overview = initialOverview;
    for (const delay of LISTING_REFRESH_DELAYS_MS) {
      if (overview?.cache?.hit && !overview.cache.pending) return { overview, completed: true };
      await new Promise((resolve) => global.setTimeout(resolve, delay));
      if (state.grid !== "listing" || selectedSeason().id !== season.id) return { overview, completed: false, cancelled: true };
      overview = await loadListingOverview(season, { refresh: true });
    }
    return { overview, completed: Boolean(overview?.cache?.hit && !overview.cache.pending) };
  }

  function loadEdfOverview(season, sex, options = {}) {
    const key = `${season.id}|${sex}`;
    if (!options.rebuild && overviewCache.has(key)) return overviewCache.get(key);
    const promise = waitForAuthenticatedUser().then(() => {
      const functions = functionsService();
      if (!functions?.httpsCallable) throw new Error("Service DTN indisponible");
      return functions.httpsCallable("getDtnQualificationOverview")({
        seasonYear: season.performanceSeason,
        sex,
        standards: edfThresholdPayload(season, sex),
        rebuild: options.rebuild === true
      });
    }).then((result) => {
      const overview = result.data || {};
      if (overview.cache?.pending && elements.refreshStatus) {
        elements.refreshStatus.dataset.tone = "";
        elements.refreshStatus.textContent = overview.cache.stale
          ? "Dernière vue affichée. Actualisation en arrière-plan."
          : "Calcul lancé en arrière-plan. Revenez dans quelques instants.";
      } else if (overview.cache?.refreshRequired && elements.refreshStatus) {
        elements.refreshStatus.dataset.tone = "";
        elements.refreshStatus.textContent = overview.cache.stale
          ? "Dernière vue affichée. Utilisez Recalculer pour l'actualiser."
          : "Qualifications non calculées. Utilisez Recalculer pour les préparer.";
      }
      return overview;
    });
    overviewCache.set(key, promise);
    promise.catch(() => overviewCache.delete(key));
    return promise;
  }

  async function refreshEdfQualifications() {
    const season = selectedSeason();
    const button = elements.refresh;
    if (!button) return;
    button.disabled = true;
    elements.refreshStatus.dataset.tone = "";
    const operation = ensureLongOperation();
    if (operation) {
      elements.refreshStatus.textContent = "";
      operation.start({
        title: "Recalcul des qualifications en cours...",
        detail: "Les performances de la saison sont analysées pour actualiser les référentiels DTN."
      });
    } else {
      elements.refreshStatus.textContent = "Recalcul en cours…";
    }
    try {
      await waitForAuthenticatedUser();
      const functions = functionsService();
      if (!functions?.httpsCallable) throw new Error("Service DTN indisponible");
      await functions.httpsCallable("refreshDtnQualificationCache")({ seasonYear: season.performanceSeason });
      Array.from(overviewCache.keys()).forEach((key) => {
        if (key.startsWith(`${season.id}|`)) overviewCache.delete(key);
      });
      const sexes = state.edfTab === "summary" ? ["F", "M"] : [state.sex];
      const overviews = await Promise.all(sexes.map((sex) => loadEdfOverview(season, sex, { rebuild: true })));
      renderGrid();
      const pending = overviews.some((overview) => overview.cache?.pending);
      if (operation) {
        operation.finish({
          state: pending ? "background" : "success",
          title: pending ? "Recalcul poursuivi en arrière-plan" : "Qualifications actualisées",
          detail: pending
            ? "La dernière vue reste disponible pendant la fin du calcul."
            : "Les qualifications sont maintenant à jour."
        });
      } else {
        elements.refreshStatus.textContent = pending
          ? "Recalcul lancé en arrière-plan. La dernière vue reste disponible."
          : "Qualifications actualisées.";
      }
    } catch (error) {
      elements.refreshStatus.dataset.tone = "error";
      if (operation) operation.finish({ state: "error", title: "Recalcul impossible", detail: error?.message || String(error) });
      else elements.refreshStatus.textContent = `Recalcul impossible : ${error?.message || error}`;
    } finally {
      button.disabled = false;
    }
  }

  async function refreshListingQualifications() {
    const season = selectedSeason();
    const button = elements.refresh;
    if (!button) return;
    button.disabled = true;
    elements.refreshStatus.dataset.tone = "";
    const operation = ensureLongOperation();
    if (operation) {
      elements.refreshStatus.textContent = "";
      operation.start({
        title: "Recalcul de la mise en liste en cours...",
        detail: "Les performances sont analysées puis la liste est vérifiée automatiquement."
      });
    } else {
      elements.refreshStatus.textContent = "Recalcul en cours…";
    }
    try {
      await waitForAuthenticatedUser();
      const functions = functionsService();
      if (!functions?.httpsCallable) throw new Error("Service DTN indisponible");
      await functions.httpsCallable("refreshDtnListingCache")({ seasonYear: season.performanceSeason });
      listingOverviewCache.delete(season.id);
      let overview = await loadListingOverview(season, { rebuild: true });
      renderListingContent(overview);
      if (overview.cache?.pending) {
        if (operation) operation.update({ detail: "Le calcul serveur continue. Vérification automatique de son achèvement..." });
        else elements.refreshStatus.textContent = "Recalcul lancé en arrière-plan. Vérification automatique en cours…";
        const refreshResult = await waitForListingRefresh(season, overview);
        if (refreshResult.cancelled) {
          operation?.finish({
            state: "background",
            title: "Recalcul poursuivi en arrière-plan",
            detail: "Vous avez quitté la vue ; la mise en liste sera vérifiée à sa prochaine ouverture."
          });
          return;
        }
        overview = refreshResult.overview;
        renderListingContent(overview);
        if (operation) {
          operation.finish({
            state: refreshResult.completed ? "success" : "background",
            title: refreshResult.completed ? "Mise en liste actualisée" : "Calcul poursuivi en arrière-plan",
            detail: refreshResult.completed
              ? "La mise en liste est maintenant à jour."
              : "La liste sera vérifiée automatiquement à sa prochaine ouverture."
          });
        } else {
          elements.refreshStatus.textContent = refreshResult.completed
            ? "Mise en liste actualisée."
            : "Le calcul continue en arrière-plan. La liste sera vérifiée à la prochaine ouverture.";
        }
      } else {
        if (operation) operation.finish({ state: "success", title: "Mise en liste actualisée", detail: "La mise en liste est maintenant à jour." });
        else elements.refreshStatus.textContent = "Mise en liste actualisée.";
      }
    } catch (error) {
      elements.refreshStatus.dataset.tone = "error";
      if (operation) operation.finish({ state: "error", title: "Recalcul impossible", detail: error?.message || String(error) });
      else elements.refreshStatus.textContent = `Recalcul impossible : ${error?.message || error}`;
    } finally {
      button.disabled = false;
    }
  }

  function refreshCurrentQualifications() {
    if (state.grid === "listing") return refreshListingQualifications();
    return refreshEdfQualifications();
  }

  function timeValue(display) {
    const value = String(display || "").trim().replace(",", ".");
    if (!value) return 0;
    const parts = value.split(":");
    const seconds = Number(parts.pop());
    const minutes = Number(parts.pop() || 0);
    return Number.isFinite(seconds) && Number.isFinite(minutes) ? Math.round((minutes * 60 + seconds) * 100) : 0;
  }

  function encodedTime(encoded) {
    if (encoded === null || encoded === undefined || String(encoded).trim() === "") return null;
    const value = String(encoded || "").padStart(6, "0");
    if (!/^\d{6}$/.test(value)) return null;
    const minutes = Number(value.slice(0, 2));
    const seconds = value.slice(2, 4);
    const hundredths = value.slice(4, 6);
    const display = minutes ? `${minutes}:${seconds}.${hundredths}` : `${Number(seconds)}.${hundredths}`;
    return { display, value: minutes * 6000 + Number(seconds) * 100 + Number(hundredths) };
  }

  function displayTimeValue(timeValue) {
    const value = Math.round(Number(timeValue) || 0);
    if (!value) return "-";
    const minutes = Math.floor(value / 6000);
    const seconds = Math.floor((value % 6000) / 100);
    const hundredths = String(value % 100).padStart(2, "0");
    return minutes ? `${minutes}:${String(seconds).padStart(2, "0")}.${hundredths}` : `${seconds}.${hundredths}`;
  }

  function qualificationButton({ display, value, course, sex, category = "", standard = "", birthMin = 0 }) {
    if (!display || !value) return '<span class="admin-dtn-no-time" aria-label="Temps non défini">—</span>';
    return `<button type="button" class="admin-dtn-time" data-dtn-time data-course="${escapeHtml(course)}" data-sex="${escapeHtml(sex)}" data-category="${escapeHtml(category)}" data-standard="${escapeHtml(standard)}" data-birth-min="${escapeHtml(birthMin)}" data-threshold="${escapeHtml(value)}" data-display="${escapeHtml(display)}">${escapeHtml(display)}</button>`;
  }

  function renderFrance(season) {
    const rows = [
      { sex: "F", category: "S", label: "FSE", title: "Femmes Senior" },
      { sex: "M", category: "S", label: "HSE", title: "Hommes Senior" },
      { sex: "F", category: "J", label: "FJU", title: "Femmes Junior" },
      { sex: "M", category: "J", label: "HJU", title: "Hommes Junior" }
    ];
    elements.definitions.hidden = false;
    elements.definitions.innerHTML = `<span class="admin-dtn-competition-scope"><strong>Compétitions qualificatives</strong>${escapeHtml(season.franceCompetitions.join(" · "))}</span>`;
    elements.sexSegment.hidden = true;
    elements.grid.innerHTML = `
      <div class="admin-dtn-grid-head">
        <div><span>Championnats de France</span><strong>Épreuves individuelles</strong></div>
        <small>Cliquez sur un temps pour afficher les nageurs qualifiés.</small>
      </div>
      <div class="admin-dtn-table-wrap">
        <table class="admin-dtn-standards-table">
          <thead><tr><th>Catégorie</th>${COURSE_ORDER.map((course) => `<th>${escapeHtml(COURSE_LABELS[course])}</th>`).join("")}</tr></thead>
          <tbody>${rows.map((row) => `<tr class="sex-${row.sex.toLowerCase()}"><th title="${escapeHtml(row.title)}"><span class="admin-dtn-category-code">${escapeHtml(row.label)}</span></th>${COURSE_ORDER.map((course, index) => {
            const display = season.france[row.sex][row.category][index];
            return `<td>${qualificationButton({ display, value: timeValue(display), course, sex: row.sex, category: row.category, standard: row.category === "S" ? "Senior" : "Junior" })}</td>`;
          }).join("")}</tr>`).join("")}</tbody>
        </table>
      </div>`;
    elements.grid.after(elements.definitions);
  }

  function edfStandardFromOverview(overview, standardId) {
    return (overview?.standards || []).find((standard) => standard.id === standardId) || { courses: [] };
  }

  function edfCourseFromOverview(overview, standardId, course) {
    return edfStandardFromOverview(overview, standardId).courses.find((item) => item.course === course) || { course, count: 0, qualifiers: [] };
  }

  function edfTabsHtml() {
    return `<div class="admin-dtn-edf-tabs" role="tablist" aria-label="Temps Équipe de France">
      ${EDF_STANDARDS.map((standard) => `<button type="button" role="tab" data-dtn-edf-tab="${standard.id}" data-dtn-edf-group="${standard.tabGroup}" aria-label="${escapeHtml(standard.tabLabel)}" aria-selected="${state.edfTab === standard.id ? "true" : "false"}">${escapeHtml(standard.label)}</button>`).join("")}
      <button type="button" role="tab" data-dtn-edf-tab="summary" aria-selected="${state.edfTab === "summary" ? "true" : "false"}">Synthèse des sportifs</button>
    </div>`;
  }

  function edfExportHtml() {
    return `<details class="admin-dtn-export">
      <summary>Exporter Excel</summary>
      <div class="admin-dtn-export-content">
        <div class="admin-dtn-export-head"><strong>Référentiels à exporter</strong><button type="button" class="primary-button" data-dtn-edf-export>Exporter</button></div>
        <div class="admin-dtn-export-options" role="group" aria-label="Référentiels à exporter">
          ${EDF_STANDARDS.map((standard) => `<label><input type="checkbox" data-dtn-edf-export-standard value="${standard.id}" checked><span>${escapeHtml(standard.label)}</span></label>`).join("")}
        </div>
        <p class="admin-dtn-export-status" data-dtn-edf-export-status aria-live="polite"></p>
      </div>
    </details>`;
  }

  function edfStandardTableHtml(season, overview, loading = false) {
    const standard = EDF_STANDARDS.find((item) => item.id === state.edfTab) || EDF_STANDARDS[0];
    const standardIndex = TIME_GRID_IDS.indexOf(standard.id);
    const rows = COURSE_ORDER.map((course) => {
      const time = encodedTime(season.edf[state.sex][course]?.[standardIndex]);
      const result = edfCourseFromOverview(overview, standard.id, course);
      const unavailable = !time;
      const count = loading ? "…" : Number(result.count || 0);
      return `<tr>
        <th>${escapeHtml(COURSE_LABELS[course])}</th>
        <td class="admin-dtn-edf-threshold${unavailable ? " is-unavailable" : ""}">${time ? escapeHtml(time.display) : "—"}</td>
        <td class="admin-dtn-edf-count${unavailable ? " is-unavailable" : ""}">${unavailable ? "—" : count}</td>
        <td>${unavailable ? "" : `<button type="button" class="ghost-button admin-dtn-detail-button" data-dtn-edf-course="${course}" data-dtn-edf-standard="${standard.id}" aria-expanded="false" ${loading ? "disabled" : ""}>Voir les sportifs</button>`}</td>
      </tr>`;
    }).join("");
    return `
      <div class="admin-dtn-edf-standard-head">
        <div><strong>${escapeHtml(standard.tabLabel)}</strong><span>${escapeHtml(standard.description)}</span></div>
        <small>${loading ? "Calcul des effectifs en cours…" : "Une seule performance, la meilleure, est retenue par sportif."}</small>
      </div>
      <div class="admin-dtn-table-wrap">
        <table class="admin-dtn-standards-table admin-dtn-edf-count-table">
          <thead><tr><th>Course</th><th>Temps</th><th>Qualifiés</th><th>Détail</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  function athleteSummaryRows(overview, standardId) {
    const athletes = new Map();
    edfStandardFromOverview(overview, standardId).courses.forEach((courseResult) => {
      (courseResult.qualifiers || []).forEach((row) => {
        const key = swimmerKey(row);
        if (!athletes.has(key)) athletes.set(key, { ...row, qualifications: [] });
        athletes.get(key).qualifications.push({
          course: courseResult.course,
          time: row.time,
          timeValue: row.timeValue,
          threshold: courseResult.threshold,
          date: row.date,
          location: row.location
        });
      });
    });
    return Array.from(athletes.values()).map((athlete) => ({
      ...athlete,
      qualifications: athlete.qualifications.sort((a, b) => COURSE_ORDER.indexOf(a.course) - COURSE_ORDER.indexOf(b.course))
    })).sort((a, b) => String(a.swimmer).localeCompare(String(b.swimmer), "fr-FR"));
  }

  function summaryGroupHtml(standard, rows) {
    return `<details class="admin-dtn-summary-group">
      <summary class="admin-dtn-summary-group-head"><div><strong>${escapeHtml(standard.tabLabel)}</strong><span>${escapeHtml(standard.description)}</span></div><b>${rows.length} sportif${rows.length > 1 ? "s" : ""}</b></summary>
      ${rows.length ? `<div class="admin-dtn-results-wrap"><table class="admin-dtn-summary-table"><thead><tr><th>Sportif</th><th>Sexe</th><th>Club</th><th>Temps réalisés</th></tr></thead><tbody>${rows.map((row) => `<tr>
        <td><strong>${escapeHtml(row.swimmer || [row.firstName, row.lastName].filter(Boolean).join(" ") || "-")}</strong></td>
        <td>${row.sex === "F" ? "F" : "H"}</td>
        <td>${escapeHtml(row.club || "-")}</td>
        <td><div class="admin-dtn-qualified-courses">${row.qualifications.map((qualification) => `<button type="button" class="admin-dtn-qualified-course" data-dtn-qualification-meta aria-expanded="false"><span><strong>${escapeHtml(COURSE_LABELS[qualification.course])}</strong>${escapeHtml(qualification.time)}</span><small><b>${escapeHtml(standard.label)} ${escapeHtml(displayTimeValue(qualification.threshold))}</b> · ${escapeHtml(formatDate(qualification.date))} · ${escapeHtml(qualification.location || "-")}</small></button>`).join("")}</div></td>
      </tr>`).join("")}</tbody></table></div>` : '<p class="admin-dtn-summary-empty">Aucun sportif qualifié.</p>'}
    </details>`;
  }

  function edfSummaryHtml(overviews, loading = false) {
    if (loading) return '<p class="admin-dtn-summary-loading">Construction de la synthèse des sportifs…</p>';
    return `<div class="admin-dtn-summary-list">${EDF_STANDARDS.map((standard) => {
      const rows = [...athleteSummaryRows(overviews.F, standard.id), ...athleteSummaryRows(overviews.M, standard.id)]
        .sort((a, b) => String(a.swimmer).localeCompare(String(b.swimmer), "fr-FR"));
      return summaryGroupHtml(standard, rows);
    }).join("")}</div>`;
  }

  function loadXlsxLibrary() {
    if (global.XLSX?.utils?.json_to_sheet) return Promise.resolve(global.XLSX);
    if (xlsxLoadPromise) return xlsxLoadPromise;
    xlsxLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = XLSX_SCRIPT_URL;
      script.async = true;
      script.onload = () => global.XLSX?.utils?.json_to_sheet ? resolve(global.XLSX) : reject(new Error("Bibliothèque Excel indisponible"));
      script.onerror = () => reject(new Error("Chargement de l’export Excel impossible"));
      document.head.appendChild(script);
    });
    xlsxLoadPromise.catch(() => { xlsxLoadPromise = null; });
    return xlsxLoadPromise;
  }

  function exportRowsForStandard(overviews, standard) {
    const athletes = [...athleteSummaryRows(overviews.F, standard.id), ...athleteSummaryRows(overviews.M, standard.id)]
      .sort((a, b) => String(a.swimmer).localeCompare(String(b.swimmer), "fr-FR"));
    const usedCourses = COURSE_ORDER.filter((course) => athletes.some((athlete) => athlete.qualifications.some((qualification) => qualification.course === course)));
    const rows = athletes.map((athlete) => {
      const qualifications = new Map(athlete.qualifications.map((qualification) => [qualification.course, qualification]));
      const row = {
        "Sportif": athlete.swimmer || [athlete.firstName, athlete.lastName].filter(Boolean).join(" ") || "-",
        "Sexe": athlete.sex === "F" ? "Femme" : "Homme",
        "Club": athlete.club || "-",
        "Courses qualifiées": usedCourses.filter((course) => qualifications.has(course)).map((course) => COURSE_LABELS[course]).join(", ")
      };
      usedCourses.forEach((course) => {
        const qualification = qualifications.get(course);
        row[COURSE_LABELS[course]] = qualification
          ? `${qualification.time || "-"} · ${qualification.location || "-"} · ${formatDate(qualification.date)}`
          : "";
      });
      return row;
    });
    return { rows, usedCourses };
  }

  async function exportEdfQualifications(button) {
    const exportBox = button.closest(".admin-dtn-export");
    const status = exportBox?.querySelector("[data-dtn-edf-export-status]");
    const selectedIds = Array.from(exportBox?.querySelectorAll("[data-dtn-edf-export-standard]:checked") || []).map((input) => input.value);
    if (!selectedIds.length) {
      if (status) status.textContent = "Sélectionnez au moins un référentiel.";
      return;
    }
    button.disabled = true;
    if (status) status.textContent = "Préparation du fichier Excel…";
    try {
      const season = selectedSeason();
      const [XLSX, F, M] = await Promise.all([loadXlsxLibrary(), loadEdfOverview(season, "F"), loadEdfOverview(season, "M")]);
      const workbook = XLSX.utils.book_new();
      let athleteCount = 0;
      selectedIds.forEach((standardId) => {
        const standard = EDF_STANDARDS.find((item) => item.id === standardId);
        if (!standard) return;
        const { rows, usedCourses } = exportRowsForStandard({ F, M }, standard);
        athleteCount += rows.length;
        const sheetRows = rows.length ? rows : [{ "Sportif": "Aucun sportif qualifié" }];
        const worksheet = XLSX.utils.json_to_sheet(sheetRows);
        worksheet["!cols"] = [
          { wch: 30 }, { wch: 10 }, { wch: 22 }, { wch: 42 },
          ...usedCourses.map(() => ({ wch: 34 }))
        ];
        worksheet["!autofilter"] = rows.length ? { ref: worksheet["!ref"] } : undefined;
        XLSX.utils.book_append_sheet(workbook, worksheet, standard.label.slice(0, 31));
      });
      const fileSeason = season.id.replace(/[^0-9-]/g, "");
      XLSX.writeFile(workbook, `qualifies-equipe-de-france-${fileSeason}.xlsx`);
      if (status) status.textContent = `${athleteCount} ligne${athleteCount > 1 ? "s" : ""} exportée${athleteCount > 1 ? "s" : ""}.`;
    } catch (error) {
      if (status) status.textContent = `Export impossible : ${error?.message || error}`;
    } finally {
      button.disabled = false;
    }
  }

  function renderEdf(season) {
    const summaryActive = state.edfTab === "summary";
    elements.sexSegment.hidden = summaryActive;
    elements.definitions.hidden = false;
    elements.definitions.innerHTML = `<span class="admin-dtn-competition-scope"><strong>Périmètre</strong>TSP et TRP : ${escapeHtml(season.edfCompetitions.join(" · "))} · TJP et TEP : mêmes compétitions hors Limoges · TU16 : toutes les compétitions de la saison</span>`;
    elements.grid.innerHTML = `
      <div class="admin-dtn-grid-head">
        <div><span>Équipe de France</span><strong>${summaryActive ? "Synthèse des sportifs" : "Temps piscine"}</strong></div>
        <div class="admin-dtn-grid-actions"></div>
      </div>
      ${edfTabsHtml()}
      <div id="adminDtnEdfContent">${summaryActive ? edfSummaryHtml({}, true) : edfStandardTableHtml(season, {}, true)}</div>
      ${edfExportHtml()}`;

    const gridActions = elements.grid.querySelector(".admin-dtn-grid-actions");
    if (gridActions) gridActions.append(elements.sexSegment, elements.refreshBox);
    elements.grid.after(elements.definitions);

    const renderKey = `${state.edfTab}|${state.sex}|${season.id}`;
    const content = elements.grid.querySelector("#adminDtnEdfContent");
    const promise = summaryActive
      ? Promise.all([loadEdfOverview(season, "F"), loadEdfOverview(season, "M")]).then(([F, M]) => edfSummaryHtml({ F, M }))
      : loadEdfOverview(season, state.sex).then((overview) => edfStandardTableHtml(season, overview));
    promise.then((html) => {
      if (`${state.edfTab}|${state.sex}|${selectedSeason().id}` !== renderKey || !content?.isConnected) return;
      content.innerHTML = html;
    }).catch((error) => {
      if (!content?.isConnected) return;
      content.innerHTML = `<p class="admin-dtn-summary-loading" data-tone="error">Calcul indisponible : ${escapeHtml(error?.message || error)}</p>`;
    });
  }

  function listingRows(overview, listingTab = state.listingTab) {
    const standardIds = listingTab === "releve" ? ["RELEVE"] : ["TEC1", "TEP"];
    return standardIds.flatMap((standardId) => {
      const standard = (overview?.standards || []).find((item) => item.id === standardId);
      return (standard?.athletes || []).map((athlete) => ({
        ...athlete,
        performance: standardId === "RELEVE" ? "TRP" : standardId,
        sourceId: standard?.sourceId || ""
      }));
    }).sort((a, b) => String(a.lastName || a.swimmer).localeCompare(String(b.lastName || b.swimmer), "fr-FR") || String(a.firstName).localeCompare(String(b.firstName), "fr-FR"));
  }

  function filteredListingRows(overview, options = {}) {
    return listingRows(overview).filter((athlete) => {
      if (state.listingTab === "espoir" && state.listingFilters.performance !== "all" && athlete.performance !== state.listingFilters.performance) return false;
      if (!options.ignoreSex && state.listingFilters.sex !== "all" && athlete.sex !== state.listingFilters.sex) return false;
      if (state.listingFilters.club !== "all" && athlete.club !== state.listingFilters.club) return false;
      if (state.listingFilters.course !== "all" && !(athlete.qualifications || []).some((qualification) => qualification.course === state.listingFilters.course)) return false;
      return true;
    });
  }

  function listingFilterOptions(overview) {
    const rows = listingRows(overview);
    const clubs = Array.from(new Set(rows.map((athlete) => athlete.club).filter(Boolean))).sort((a, b) => a.localeCompare(b, "fr-FR"));
    const courses = COURSE_ORDER.filter((course) => rows.some((athlete) => (athlete.qualifications || []).some((qualification) => qualification.course === course)));
    return { clubs, courses };
  }

  function listingQualificationDetails(athlete) {
    const qualifications = athlete.qualifications || [];
    return `<details class="admin-dtn-listing-details">
      <summary>${qualifications.length} performance${qualifications.length > 1 ? "s" : ""}</summary>
      <div class="admin-dtn-qualified-courses">${qualifications.map((qualification) => `<span class="admin-dtn-qualified-course">
        <span><strong>${escapeHtml(COURSE_LABELS[qualification.course] || qualification.course)}</strong>${escapeHtml(qualification.time || "-")}</span>
        <small><b>Minima ${escapeHtml(displayTimeValue(qualification.threshold))}</b> · ${escapeHtml(qualification.competition || "-")} · ${escapeHtml(formatDate(qualification.date))}</small>
      </span>`).join("")}</div>
    </details>`;
  }

  function renderListingContent(overview) {
    currentListingOverview = overview;
    const content = elements.grid?.querySelector("[data-dtn-listing-content]");
    if (!content) return;
    const rows = filteredListingRows(overview);
    const rowsIgnoringSex = filteredListingRows(overview, { ignoreSex: true });
    const filterOptions = listingFilterOptions(overview);
    const sexCounts = {
      all: rowsIgnoringSex.length,
      F: rowsIgnoringSex.filter((athlete) => athlete.sex === "F").length,
      M: rowsIgnoringSex.filter((athlete) => athlete.sex === "M").length
    };
    const tabCounts = {
      releve: listingRows(overview, "releve").length,
      espoir: listingRows(overview, "espoir").length
    };
    const releveTab = elements.grid?.querySelector('[data-dtn-listing-tab="releve"]');
    const espoirTab = elements.grid?.querySelector('[data-dtn-listing-tab="espoir"]');
    if (releveTab) releveTab.textContent = `Relève · ${tabCounts.releve}`;
    if (espoirTab) espoirTab.textContent = `Espoir · ${tabCounts.espoir}`;
    const cacheMessage = overview?.cache?.pending
      ? (overview.cache.stale ? "Dernière vue affichée. Actualisation en arrière-plan." : "Calcul lancé en arrière-plan. Revenez dans quelques instants.")
      : overview?.cache?.refreshRequired
        ? (overview.cache.stale ? "Dernière vue disponible. Utilisez Recalculer pour l’actualiser." : "Mise en liste non calculée. Utilisez Recalculer pour la préparer.")
        : "";
    content.innerHTML = `
      ${cacheMessage ? `<p class="admin-record-module-status">${escapeHtml(cacheMessage)}</p>` : ""}
      <div class="admin-dtn-listing-filters" data-listing-tab="${escapeHtml(state.listingTab)}" aria-label="Filtres de la mise en liste">
        ${state.listingTab === "espoir" ? `<label>Performance<select data-dtn-listing-filter="performance">
          <option value="all">Tous</option><option value="TEP"${state.listingFilters.performance === "TEP" ? " selected" : ""}>TEP</option><option value="TEC1"${state.listingFilters.performance === "TEC1" ? " selected" : ""}>TEC1</option>
        </select></label>` : ""}
        <div class="admin-dtn-segment admin-dtn-listing-sex" role="group" aria-label="Sexe">
          <button type="button" data-dtn-listing-sex="all" aria-pressed="${state.listingFilters.sex === "all" ? "true" : "false"}">Tous · ${sexCounts.all}</button>
          <button type="button" data-dtn-listing-sex="F" aria-pressed="${state.listingFilters.sex === "F" ? "true" : "false"}">Femmes · ${sexCounts.F}</button>
          <button type="button" data-dtn-listing-sex="M" aria-pressed="${state.listingFilters.sex === "M" ? "true" : "false"}">Hommes · ${sexCounts.M}</button>
        </div>
        <label>Club<select data-dtn-listing-filter="club"><option value="all">Tous</option>${filterOptions.clubs.map((club) => `<option value="${escapeHtml(club)}"${state.listingFilters.club === club ? " selected" : ""}>${escapeHtml(club)}</option>`).join("")}</select></label>
        <label>Épreuve<select data-dtn-listing-filter="course"><option value="all">Toutes</option>${filterOptions.courses.map((course) => `<option value="${escapeHtml(course)}"${state.listingFilters.course === course ? " selected" : ""}>${escapeHtml(COURSE_LABELS[course] || course)}</option>`).join("")}</select></label>
        <button type="button" class="primary-button" data-dtn-listing-export>Exporter Excel</button>
      </div>
      <div class="admin-dtn-results-wrap"><table class="admin-dtn-results-table admin-dtn-listing-table">
        <thead><tr><th>Nom</th><th>Prénom</th><th>Année</th><th>Sexe</th><th>Club</th><th>Performance</th><th>Détail</th></tr></thead>
        <tbody>${rows.length ? rows.map((athlete) => `<tr data-sex="${escapeHtml(athlete.sex)}">
          <td data-label="Nom"><strong>${escapeHtml(athlete.lastName || athlete.swimmer || "-")}</strong></td>
          <td data-label="Prénom">${escapeHtml(athlete.firstName || (!athlete.lastName ? "" : "-"))}</td>
          <td data-label="Année">${escapeHtml(String(athlete.birthDate || "").slice(0, 4) || "-")}</td>
          <td data-label="Sexe">${athlete.sex === "F" ? "F" : "H"}</td>
          <td data-label="Club">${escapeHtml(athlete.club || "-")}</td>
          <td data-label="Performance"><span class="admin-dtn-listing-badge" data-level="${escapeHtml(athlete.performance)}">${escapeHtml(athlete.performance)}</span></td>
          <td data-label="Détail">${listingQualificationDetails(athlete)}</td>
        </tr>`).join("") : '<tr><td colspan="7" class="admin-dtn-empty">Aucun sportif ne correspond aux critères.</td></tr>'}</tbody>
      </table></div>`;
  }

  function renderListing(season) {
    elements.sexSegment.hidden = true;
    elements.definitions.hidden = false;
    elements.definitions.innerHTML = `<span class="admin-dtn-competition-scope"><strong>Règles ${escapeHtml(season.label)}</strong>Relève : TRP jusqu’à 21 ans · Espoir : TEC1 de 14 à 15 ans, puis TEP de 16 à 18 ans · Priorité Relève sur Espoir · Performances actives de la saison en bassin de 50 m avec chronométrage électronique uniquement</span>`;
    elements.grid.innerHTML = `
      <div class="admin-dtn-grid-head">
        <div><span>Mise en liste</span><strong>Sportifs éligibles</strong></div>
      </div>
      <div class="admin-dtn-listing-tabs" role="tablist" aria-label="Type de mise en liste">
        <button type="button" role="tab" data-dtn-listing-tab="releve" aria-selected="${state.listingTab === "releve" ? "true" : "false"}">Relève</button>
        <button type="button" role="tab" data-dtn-listing-tab="espoir" aria-selected="${state.listingTab === "espoir" ? "true" : "false"}">Espoir</button>
      </div>
      <div data-dtn-listing-content><p class="admin-dtn-summary-loading">Chargement de la mise en liste…</p></div>`;
    elements.grid.querySelector(".admin-dtn-grid-head")?.append(elements.refreshBox);
    elements.grid.after(elements.definitions);
    const renderKey = `${state.listingTab}|${season.id}`;
    currentListingOverview = null;
    loadListingOverview(season).then((overview) => {
      if (`${state.listingTab}|${selectedSeason().id}` !== renderKey || state.grid !== "listing") return;
      renderListingContent(overview);
    }).catch((error) => {
      const content = elements.grid.querySelector("[data-dtn-listing-content]");
      if (content) content.innerHTML = `<p class="admin-dtn-summary-loading" data-tone="error">Calcul indisponible : ${escapeHtml(error?.message || error)}</p>`;
    });
  }

  async function exportListingQualifications(button) {
    const status = elements.refreshStatus;
    const rows = filteredListingRows(currentListingOverview || {});
    button.disabled = true;
    if (status) status.textContent = "Préparation du fichier Excel…";
    try {
      const XLSX = await loadXlsxLibrary();
      const sheetRows = rows.length ? rows.map((athlete) => ({
        "Nom": athlete.lastName || athlete.swimmer || "-",
        "Prénom": athlete.firstName || "",
        "Année de naissance": String(athlete.birthDate || "").slice(0, 4),
        "Sexe": athlete.sex === "F" ? "Femme" : "Homme",
        "Club": athlete.club || "-",
        "Performance": athlete.performance,
        "Performances qualifiantes": (athlete.qualifications || []).map((qualification) => `${COURSE_LABELS[qualification.course] || qualification.course} : ${qualification.time} (minima ${displayTimeValue(qualification.threshold)}) · ${qualification.competition || "-"} · ${formatDate(qualification.date)}`).join(" | ")
      })) : [{ "Nom": "Aucun sportif affiché" }];
      const worksheet = XLSX.utils.json_to_sheet(sheetRows);
      worksheet["!cols"] = [{ wch: 24 }, { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 18 }, { wch: 14 }, { wch: 80 }];
      if (rows.length) worksheet["!autofilter"] = { ref: worksheet["!ref"] };
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, state.listingTab === "releve" ? "Relève" : "Espoir");
      XLSX.writeFile(workbook, `mise-en-liste-${state.listingTab}-${selectedSeason().id}.xlsx`);
      if (status) status.textContent = `${rows.length} sportif${rows.length > 1 ? "s" : ""} exporté${rows.length > 1 ? "s" : ""}.`;
    } catch (error) {
      if (status) status.textContent = `Export impossible : ${error?.message || error}`;
    } finally {
      button.disabled = false;
    }
  }

  function renderGrid() {
    const season = selectedSeason();
    if (elements.toolbar && elements.refreshBox?.parentElement !== elements.toolbar) elements.toolbar.append(elements.refreshBox);
    if (elements.grid && elements.definitions?.nextElementSibling !== elements.grid) elements.grid.before(elements.definitions);
    elements.sexButtons.forEach((button) => button.setAttribute("aria-pressed", button.dataset.dtnSex === state.sex ? "true" : "false"));
    if (elements.toolbar) elements.toolbar.hidden = true;
    elements.refreshBox.hidden = state.grid === "france";
    if (elements.refresh) elements.refresh.textContent = state.grid === "listing" ? "Recalculer la mise en liste" : "Recalculer les qualifications";
    if (state.grid === "france") elements.refreshStatus.textContent = "";
    if (state.grid === "edf") renderEdf(season);
    else if (state.grid === "listing") renderListing(season);
    else renderFrance(season);
    closeQualifiers();
  }

  function topFileUrl(course, sex, category) {
    const categorySlug = String(category).replace(/\+/g, "");
    return `${PUBLIC_TOP_BASE}/${encodeURIComponent(course)}/${encodeURIComponent(sex)}-${encodeURIComponent(categorySlug)}.json`;
  }

  function loadTopRows(course, sex, category) {
    const key = `${course}|${sex}|${category}`;
    if (rowCache.has(key)) return rowCache.get(key);
    const promise = fetch(topFileUrl(course, sex, category), { cache: "force-cache" })
      .then((response) => response.status === 404 ? [] : response.ok ? response.json() : Promise.reject(new Error("Données indisponibles")))
      .then((rows) => Array.isArray(rows) ? rows : []);
    rowCache.set(key, promise);
    return promise;
  }

  function swimmerKey(row) {
    return String(row.swimmerId || row.swimmerIdentityKey || `${row.swimmer}|${row.birthDate}`).trim();
  }

  function normalizedCompetitionText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function isFranceQualifyingCompetition(row, season) {
    const competitionId = String(row.competitionId || row.importId || "").trim();
    if (competitionId && season.franceCompetitionIds.includes(competitionId)) return true;
    const competition = normalizedCompetitionText(row.competition);
    const location = normalizedCompetitionText(row.location);
    const inRennes = location.includes("rennes") || competition.includes("rennes");
    const inDijon = location.includes("dijon") || competition.includes("dijon");
    const inAix = location.includes("aix en provence") || competition.includes("aix en provence");
    return (inRennes && competition.includes("meeting"))
      || (inDijon && competition.includes("france") && competition.includes("club"))
      || (inAix && (competition.includes("world cup") || competition.includes("coupe du monde") || competition.includes("wcup")));
  }

  function formatDate(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value || "-");
  }

  function closeQualifiers() {
    state.requestId += 1;
    elements.qualifiers.hidden = true;
    elements.grid?.querySelectorAll(".admin-dtn-time.active").forEach((button) => button.classList.remove("active"));
  }

  async function showQualifiers(button) {
    const requestId = ++state.requestId;
    const season = selectedSeason();
    const course = button.dataset.course;
    const sex = button.dataset.sex;
    const category = button.dataset.category;
    const standard = button.dataset.standard;
    const birthMin = Number(button.dataset.birthMin || 0);
    const threshold = Number(button.dataset.threshold || 0);
    const display = button.dataset.display;
    const categories = category === "S" ? SENIOR_AND_OLDER_CATEGORIES : category ? [category] : ALL_CATEGORIES;
    elements.grid.querySelectorAll(".admin-dtn-time.active").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    elements.qualifiers.hidden = false;
    elements.qualifiersContext.textContent = `${COURSE_LABELS[course]} · ${sex === "F" ? "Femmes" : "Hommes"} · ${standard} · temps ${display}`;
    elements.qualifiersStatus.textContent = "Chargement des performances…";
    elements.qualifiersBody.innerHTML = "";

    try {
      const loaded = await Promise.all(categories.map((item) => loadTopRows(course, sex, item)));
      if (requestId !== state.requestId) return;
      const bestBySwimmer = new Map();
      loaded.flat().forEach((row) => {
        if (Number(row.seasonYear) !== Number(season.performanceSeason)) return;
        if (!isFranceQualifyingCompetition(row, season)) return;
        if (!Number(row.timeValue) || Number(row.timeValue) > threshold) return;
        const born = Number(String(row.birthDate || "").slice(0, 4));
        if (birthMin && (!born || born < birthMin)) return;
        const key = swimmerKey(row);
        const current = bestBySwimmer.get(key);
        if (!current || Number(row.timeValue) < Number(current.timeValue)) bestBySwimmer.set(key, row);
      });
      const rows = Array.from(bestBySwimmer.values()).sort((a, b) => Number(a.timeValue) - Number(b.timeValue) || String(a.swimmer).localeCompare(String(b.swimmer), "fr-FR"));
      elements.qualifiersStatus.textContent = `${rows.length} nageur${rows.length > 1 ? "s" : ""} qualifié${rows.length > 1 ? "s" : ""} sur la saison ${season.label}.`;
      elements.qualifiersBody.innerHTML = rows.length ? rows.map((row) => `
        <tr>
          <td class="admin-dtn-result-time" data-label="Temps">${escapeHtml(row.time || "-")}</td>
          <td data-label="Nageur"><strong>${escapeHtml(row.swimmer || [row.firstName, row.lastName].filter(Boolean).join(" ") || "-")}</strong></td>
          <td data-label="Club">${escapeHtml(row.club || row.clubName || "-")}</td>
          <td data-label="Compétition">${escapeHtml(row.competition || "-")}</td>
          <td data-label="Lieu">${escapeHtml(row.location || "-")}</td>
          <td data-label="Date">${escapeHtml(formatDate(row.date))}</td>
        </tr>`).join("") : '<tr><td colspan="6" class="admin-dtn-empty">Aucun nageur n’a réalisé ce temps pendant la saison.</td></tr>';
      elements.qualifiers.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (error) {
      if (requestId !== state.requestId) return;
      elements.qualifiersStatus.textContent = "Impossible de charger les performances pour le moment.";
      elements.qualifiersBody.innerHTML = '<tr><td colspan="6" class="admin-dtn-empty">Chargement impossible.</td></tr>';
    }
  }

  function qualifierRowsHtml(rows) {
    return rows.length ? rows.map((row) => `
      <tr>
        <td class="admin-dtn-result-time" data-label="Temps">${escapeHtml(row.time || "-")}</td>
        <td data-label="Nageur"><strong>${escapeHtml(row.swimmer || [row.firstName, row.lastName].filter(Boolean).join(" ") || "-")}</strong></td>
        <td data-label="Club">${escapeHtml(row.club || row.clubName || "-")}</td>
        <td data-label="Compétition">${escapeHtml(row.competition || "-")}</td>
        <td data-label="Lieu">${escapeHtml(row.location || "-")}</td>
        <td data-label="Date">${escapeHtml(formatDate(row.date))}</td>
      </tr>`).join("") : '<tr><td colspan="6" class="admin-dtn-empty">Aucun nageur n’a réalisé ce temps pendant la saison.</td></tr>';
  }

  async function showEdfCourseQualifiers(button) {
    const season = selectedSeason();
    const course = button.dataset.dtnEdfCourse;
    const standardId = button.dataset.dtnEdfStandard;
    const standard = EDF_STANDARDS.find((item) => item.id === standardId) || EDF_STANDARDS[0];
    const detailKey = `${standardId}-${course}`;
    const currentDetail = elements.grid.querySelector("[data-dtn-edf-detail-row]");
    if (currentDetail) {
      const currentButton = elements.grid.querySelector(`[data-dtn-edf-detail-key="${currentDetail.dataset.dtnEdfDetailRow}"]`);
      currentButton?.setAttribute("aria-expanded", "false");
      if (currentButton) currentButton.textContent = "Voir les sportifs";
      currentDetail.remove();
      if (currentDetail.dataset.dtnEdfDetailRow === detailKey) return;
    }

    button.dataset.dtnEdfDetailKey = detailKey;
    button.setAttribute("aria-expanded", "true");
    button.textContent = "Masquer les sportifs";
    const detailRow = document.createElement("tr");
    detailRow.className = "admin-dtn-edf-detail-row";
    detailRow.dataset.dtnEdfDetailRow = detailKey;
    detailRow.innerHTML = '<td colspan="4"><div class="admin-dtn-inline-loading">Chargement des sportifs…</div></td>';
    button.closest("tr")?.after(detailRow);

    try {
      const overview = await loadEdfOverview(season, state.sex);
      if (!detailRow.isConnected || button.getAttribute("aria-expanded") !== "true") return;
      const rows = edfCourseFromOverview(overview, standardId, course).qualifiers || [];
      detailRow.innerHTML = `<td colspan="4"><div class="admin-dtn-inline-results">
        <div class="admin-dtn-inline-results-head"><strong>${escapeHtml(standard.label)} · ${escapeHtml(COURSE_LABELS[course])} · ${state.sex === "F" ? "Femmes" : "Hommes"}</strong><span>${rows.length} sportif${rows.length > 1 ? "s" : ""} qualifié${rows.length > 1 ? "s" : ""}</span></div>
        <div class="admin-dtn-results-wrap"><table class="admin-dtn-results-table admin-dtn-inline-results-table"><thead><tr><th>Temps</th><th>Nageur</th><th>Club</th><th>Compétition</th><th>Lieu</th><th>Date</th></tr></thead><tbody>${qualifierRowsHtml(rows)}</tbody></table></div>
      </div></td>`;
    } catch (error) {
      if (!detailRow.isConnected) return;
      detailRow.innerHTML = '<td colspan="4"><div class="admin-dtn-inline-loading" data-tone="error">Impossible de charger les sportifs pour le moment.</div></td>';
    }
  }

  function init() {
    if (state.initialized) return;
    elements.season = document.querySelector("#adminDtnSeason");
    elements.toolbar = document.querySelector("#adminDtnToolbar");
    elements.grid = document.querySelector("#adminDtnGrid");
    elements.definitions = document.querySelector("#adminDtnDefinitions");
    elements.sexSegment = document.querySelector("#adminDtnSexSegment");
    elements.qualifiers = document.querySelector("#adminDtnQualifiers");
    elements.qualifiersContext = document.querySelector("#adminDtnQualifiersContext");
    elements.qualifiersStatus = document.querySelector("#adminDtnQualifiersStatus");
    elements.qualifiersBody = document.querySelector("#adminDtnQualifiersBody");
    elements.qualifiersClose = document.querySelector("#adminDtnQualifiersClose");
    elements.refreshBox = document.querySelector("#adminDtnRefreshBox");
    elements.refresh = document.querySelector("#adminDtnRefresh");
    elements.refreshStatus = document.querySelector("#adminDtnRefreshStatus");
    elements.sexButtons = Array.from(document.querySelectorAll("[data-dtn-sex]"));
    if (!elements.season || !elements.grid || !elements.qualifiers) return;
    restoreListingPreferences();
    state.initialized = true;
    elements.season.innerHTML = SEASONS.map((season) => `<option value="${escapeHtml(season.id)}">${escapeHtml(season.label)}</option>`).join("");
    elements.season.value = state.seasonId;
    elements.season.addEventListener("change", () => { state.seasonId = elements.season.value; renderGrid(); });
    elements.refresh?.addEventListener("click", refreshCurrentQualifications);
    elements.sexButtons.forEach((button) => button.addEventListener("click", () => { state.sex = button.dataset.dtnSex; renderGrid(); }));
    elements.grid.addEventListener("click", (event) => {
      const listingExport = event.target.closest("[data-dtn-listing-export]");
      if (listingExport) {
        exportListingQualifications(listingExport);
        return;
      }
      const listingTab = event.target.closest("[data-dtn-listing-tab]");
      if (listingTab) {
        state.listingTab = listingTab.dataset.dtnListingTab;
        state.listingFilters.performance = "all";
        state.listingFilters.club = "all";
        state.listingFilters.course = "all";
        persistListingPreferences();
        renderListing(selectedSeason());
        return;
      }
      const listingSex = event.target.closest("[data-dtn-listing-sex]");
      if (listingSex && currentListingOverview) {
        state.listingFilters.sex = listingSex.dataset.dtnListingSex;
        persistListingPreferences();
        renderListingContent(currentListingOverview);
        return;
      }
      const exportButton = event.target.closest("[data-dtn-edf-export]");
      if (exportButton) {
        exportEdfQualifications(exportButton);
        return;
      }
      const qualificationMeta = event.target.closest("[data-dtn-qualification-meta]");
      if (qualificationMeta) {
        const willOpen = qualificationMeta.getAttribute("aria-expanded") !== "true";
        elements.grid.querySelectorAll("[data-dtn-qualification-meta][aria-expanded=\"true\"]").forEach((item) => item.setAttribute("aria-expanded", "false"));
        qualificationMeta.setAttribute("aria-expanded", String(willOpen));
        return;
      }
      const edfTab = event.target.closest("[data-dtn-edf-tab]");
      if (edfTab) {
        state.edfTab = edfTab.dataset.dtnEdfTab;
        renderGrid();
        return;
      }
      const edfCourse = event.target.closest("[data-dtn-edf-course]");
      if (edfCourse) {
        showEdfCourseQualifiers(edfCourse);
        return;
      }
      const button = event.target.closest("[data-dtn-time]");
      if (button) showQualifiers(button);
    });
    elements.grid.addEventListener("change", (event) => {
      const filter = event.target.closest("[data-dtn-listing-filter]");
      if (!filter || !currentListingOverview) return;
      state.listingFilters[filter.dataset.dtnListingFilter] = filter.value;
      renderListingContent(currentListingOverview);
    });
    elements.grid.addEventListener("toggle", (event) => {
      const details = event.target.closest?.(".admin-dtn-listing-details");
      if (!details?.open) return;
      elements.grid.querySelectorAll(".admin-dtn-listing-details[open]").forEach((item) => {
        if (item !== details) item.open = false;
      });
    }, true);
    elements.qualifiersClose.addEventListener("click", closeQualifiers);
    const syncGridFromHash = () => {
      if (global.location.hash === "#espace-dtn-edf") state.grid = "edf";
      if (global.location.hash === "#espace-dtn-france") state.grid = "france";
      if (global.location.hash === "#espace-dtn-listes") state.grid = "listing";
      if (["#espace-dtn-france", "#espace-dtn-edf", "#espace-dtn-listes"].includes(global.location.hash)) renderGrid();
    };
    global.addEventListener("hashchange", syncGridFromHash);
    syncGridFromHash();
  }

  global.LivePalmesDtnQualifications = { init };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})(window);
