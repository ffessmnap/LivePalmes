(function attachLivePalmesDtnQualifications(global) {
  const PUBLIC_TOP_BASE = "https://storage.googleapis.com/livepalmes-public-data-718081132564/performance-public-firestore/tops";
  const XLSX_SCRIPT_URL = "performances/public/vendor/xlsx.full.min.js?v=20260722-dtn-export-1";
  const COURSE_ORDER = ["50SF", "100SF", "200SF", "400SF", "800SF", "1500SF", "50AP", "100IS", "200IS", "400IS", "50BI", "100BI", "200BI", "400BI"];
  const COURSE_LABELS = {
    "50SF": "50 SF", "100SF": "100 SF", "200SF": "200 SF", "400SF": "400 SF", "800SF": "800 SF", "1500SF": "1500 SF",
    "50AP": "50 AP", "100IS": "100 IS", "200IS": "200 IS", "400IS": "400 IS",
    "50BI": "50 BI", "100BI": "100 BI", "200BI": "200 BI", "400BI": "400 BI"
  };
  const ALL_CATEGORIES = ["P", "B", "M", "C", "J", "S", "M30+", "M40+", "M50+", "M60+", "M70+", "M80+"];
  const SENIOR_AND_OLDER_CATEGORIES = ["S", "M30+", "M40+", "M50+", "M60+", "M70+", "M80+"];
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
        "1500SF": ["124799", null, "131899", "133199", null, null],
        "50AP": ["001459", "001499", "001569", "001619", "001719", "001799"],
        "100IS": ["003359", null, "003689", "003849", "003999", "004249"],
        "200IS": ["011699", null, "012399", "012649", "013199", "013699"],
        "400IS": ["025299", null, "030449", "031019", null, null]
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
        "1500SF": ["135399", null, "140899", "141999", null, null],
        "50AP": ["001669", "001699", "001759", "001789", "001929", "002009"],
        "100IS": ["003779", null, "004039", "004159", "004399", "004599"],
        "200IS": ["012599", null, "012999", "013349", "013899", "014199"],
        "400IS": ["030999", null, "032079", "032619", null, null]
      }
    }
  }];

  const elements = {};
  const state = { grid: "france", sex: "F", edfTab: "TSP", seasonId: SEASONS[0].id, initialized: false, requestId: 0 };
  const rowCache = new Map();
  const overviewCache = new Map();
  let xlsxLoadPromise = null;

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
      return firebase.app().functions(global.LivePalmesAppConfig?.firebaseFunctionsRegion || "europe-west1");
    } catch {
      return firebase.functions(global.LivePalmesAppConfig?.firebaseFunctionsRegion || "europe-west1");
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
    return EDF_STANDARDS.map((standard, index) => ({
      id: standard.id,
      birthMin: standard.birthMin,
      thresholds: Object.fromEntries(COURSE_ORDER.map((course) => [course, encodedTime(season.edf[sex][course]?.[index])?.value || 0]))
    }));
  }

  function loadEdfOverview(season, sex) {
    const key = `${season.id}|${sex}`;
    if (overviewCache.has(key)) return overviewCache.get(key);
    const promise = waitForAuthenticatedUser().then(() => {
      const functions = functionsService();
      if (!functions?.httpsCallable) throw new Error("Service DTN indisponible");
      return functions.httpsCallable("getDtnQualificationOverview")({
        seasonYear: season.performanceSeason,
        sex,
        standards: edfThresholdPayload(season, sex)
      });
    }).then((result) => result.data || {});
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
    elements.refreshStatus.textContent = "Recalcul en cours…";
    try {
      await waitForAuthenticatedUser();
      const functions = functionsService();
      if (!functions?.httpsCallable) throw new Error("Service DTN indisponible");
      await functions.httpsCallable("refreshDtnQualificationCache")({ seasonYear: season.performanceSeason });
      Array.from(overviewCache.keys()).forEach((key) => {
        if (key.startsWith(`${season.id}|`)) overviewCache.delete(key);
      });
      renderGrid();
      const sexes = state.edfTab === "summary" ? ["F", "M"] : [state.sex];
      await Promise.all(sexes.map((sex) => loadEdfOverview(season, sex)));
      elements.refreshStatus.textContent = "Qualifications actualisées.";
    } catch (error) {
      elements.refreshStatus.dataset.tone = "error";
      elements.refreshStatus.textContent = `Recalcul impossible : ${error?.message || error}`;
    } finally {
      button.disabled = false;
    }
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
        <div><span>Championnats de France</span><strong>Épreuves individuelles · Saison ${escapeHtml(season.label)}</strong></div>
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
    return `<div class="admin-dtn-export">
      <div class="admin-dtn-export-head"><strong>Export Excel</strong><button type="button" class="primary-button" data-dtn-edf-export>Exporter</button></div>
      <div class="admin-dtn-export-options" role="group" aria-label="Référentiels à exporter">
        ${EDF_STANDARDS.map((standard) => `<label><input type="checkbox" data-dtn-edf-export-standard value="${standard.id}" checked><span>${escapeHtml(standard.label)}</span></label>`).join("")}
      </div>
      <p class="admin-dtn-export-status" data-dtn-edf-export-status aria-live="polite"></p>
    </div>`;
  }

  function edfStandardTableHtml(season, overview, loading = false) {
    const standard = EDF_STANDARDS.find((item) => item.id === state.edfTab) || EDF_STANDARDS[0];
    const standardIndex = EDF_STANDARDS.findIndex((item) => item.id === standard.id);
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
        <div><span>Équipe de France${summaryActive ? "" : ` · ${state.sex === "F" ? "Femmes" : "Hommes"}`}</span><strong>Temps piscine · Saison ${escapeHtml(season.label)}</strong></div>
        <small>${summaryActive ? "Chaque sportif apparaît une seule fois par référentiel." : "Effectifs et détail par course."}</small>
      </div>
      ${edfTabsHtml()}
      <div id="adminDtnEdfContent">${summaryActive ? edfSummaryHtml({}, true) : edfStandardTableHtml(season, {}, true)}</div>
      ${edfExportHtml()}`;

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

  function renderGrid() {
    const season = selectedSeason();
    elements.sexButtons.forEach((button) => button.setAttribute("aria-pressed", button.dataset.dtnSex === state.sex ? "true" : "false"));
    elements.refreshBox.hidden = state.grid !== "edf";
    if (state.grid !== "edf") elements.refreshStatus.textContent = "";
    if (state.grid === "edf") renderEdf(season); else renderFrance(season);
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
    state.initialized = true;
    elements.season.innerHTML = SEASONS.map((season) => `<option value="${escapeHtml(season.id)}">${escapeHtml(season.label)}</option>`).join("");
    elements.season.value = state.seasonId;
    elements.season.addEventListener("change", () => { state.seasonId = elements.season.value; renderGrid(); });
    elements.refresh?.addEventListener("click", refreshEdfQualifications);
    elements.sexButtons.forEach((button) => button.addEventListener("click", () => { state.sex = button.dataset.dtnSex; renderGrid(); }));
    elements.grid.addEventListener("click", (event) => {
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
    elements.qualifiersClose.addEventListener("click", closeQualifiers);
    const syncGridFromHash = () => {
      if (global.location.hash === "#espace-dtn-edf") state.grid = "edf";
      if (["#espace-dtn", "#espace-dtn-france"].includes(global.location.hash)) state.grid = "france";
      if (global.location.hash.startsWith("#espace-dtn")) renderGrid();
    };
    global.addEventListener("hashchange", syncGridFromHash);
    syncGridFromHash();
  }

  global.LivePalmesDtnQualifications = { init };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})(window);
