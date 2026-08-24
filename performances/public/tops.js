(function attachIntranapTopsPage(global) {
  let summary = global.LIVEPALMES_INTRANAP_SUMMARY || { filters: { courses: [], categories: [], seasons: [], regions: [] }, counts: {} };
  const publicVersion = global.LIVEPALMES_PERFORMANCE_PUBLIC_VERSION || summary.generatedAt || "20260602-intranap-4";
  const params = new URLSearchParams(global.location.search);
  const usesLegacyPublicData = params.get("base") === "legacy" || params.get("data") === "legacy";
  const usesFirestorePublicData = !usesLegacyPublicData;
  const usesLocalFirestorePublicData = usesFirestorePublicData && params.get("data") === "local";
  const publicStoragePerformanceBase = "https://storage.googleapis.com/livepalmes-public-data-718081132564/performance-public-firestore";
  let dataVersion = encodeURIComponent(usesFirestorePublicData ? "firestore-current" : publicVersion);
  const publicPerformanceBase = usesFirestorePublicData
    ? (usesLocalFirestorePublicData ? "public/data/performance-public-firestore" : publicStoragePerformanceBase)
    : "public/data/performance-public";
  const usesConsolidatedData = usesLegacyPublicData;
  const publicAdditionalDataUrl = global.LivePalmesAppConfig?.performanceAdditionalDataUrl ||
    "https://storage.googleapis.com/livepalmes-public-data-718081132564/performance-public/additional-data.json";

  function categoryMetaFromManifest(value) {
    const [sex, code] = String(value || "").split("|");
    const existing = (summary.filters.categories || []).find((category) => category.sex === sex && category.code === code);
    if (existing) return existing;
    const prefix = sex === "F" ? "F" : "H";
    const suffixes = {
      P: "PO",
      B: "BE",
      M: "MI",
      C: "CA",
      J: "JU",
      S: "SE",
      "M30+": "30+",
      "M40+": "40+",
      "M50+": "50+",
      "M60+": "60+",
      "M70+": "70+",
      "M80+": "80+"
    };
    return {
      code,
      displayCode: `${prefix}${suffixes[code] || code}`,
      label: code,
      sex
    };
  }

  function applyPublicManifest(manifest = {}) {
    const currentFilters = summary.filters || {};
    const currentCourses = new Map((currentFilters.courses || []).map((course) => [course.code, course]));
    const manifestCourses = Array.isArray(manifest.courses) ? manifest.courses.map(String).filter(Boolean) : [];
    const manifestCategories = Array.isArray(manifest.categories) ? manifest.categories.map(String).filter(Boolean) : [];
    summary = {
      ...summary,
      generatedAt: manifest.generatedAt || summary.generatedAt,
      filters: {
        ...currentFilters,
        courses: manifestCourses.length
          ? manifestCourses.map((code) => currentCourses.get(code) || { code, label: code, shortLabel: code, style: "", length: 0 })
          : (currentFilters.courses || []),
        seasons: Array.isArray(manifest.seasons) ? manifest.seasons : (currentFilters.seasons || []),
        regions: Array.isArray(manifest.regions) ? manifest.regions : (currentFilters.regions || []),
        categories: manifestCategories.length
          ? manifestCategories.map(categoryMetaFromManifest).filter((category) => category.sex && category.code)
          : (currentFilters.categories || [])
      }
    };
    if (usesFirestorePublicData && manifest.generatedAt) {
      dataVersion = encodeURIComponent(`firestore-${manifest.generatedAt}`);
    }
  }

  async function loadSelectedPublicManifest() {
    if (!usesFirestorePublicData) return;
    try {
      const response = await fetch(`${publicPerformanceBase}/manifest.json`, { cache: "no-store" });
      if (!response.ok) return;
      applyPublicManifest(await response.json());
    } catch (error) {
      console.warn("Lecture du manifeste public Firestore impossible", error);
    }
  }

  const elements = {
    season: document.querySelector("#topSeasonFilter"),
    region: document.querySelector("#topRegionFilter"),
    category: document.querySelector("#topCategoryFilter"),
    sex: document.querySelector("#topSexFilter"),
    courseButtons: document.querySelector("#topCourseButtons"),
    pool: document.querySelector("#topPoolFilter"),
    birthYear: document.querySelector("#topBirthYearFilter"),
    birthYearField: document.querySelector("#topBirthYearField"),
    birthYearToggle: document.querySelector("#topBirthYearToggle"),
    title: document.querySelector("#topTitle"),
    status: document.querySelector("#topStatus"),
    swimmerHeader: document.querySelector("#topSwimmerHeader"),
    body: document.querySelector("#topBody"),
    loadMore: document.querySelector("#topLoadMore"),
    loadMoreButton: document.querySelector("#topLoadMoreButton")
  };

  const sexLabels = {
    F: "Femmes",
    M: "Hommes"
  };

  const canonicalRegionLabels = {
    AURA: "Auvergne-Rhône-Alpes",
    17: "Auvergne-Rhône-Alpes",
    BFC: "Bourgogne-Franche-Comté",
    22: "Bourgogne-Franche-Comté",
    BPL: "Bretagne - Pays de la Loire",
    6: "Bretagne - Pays de la Loire",
    CENT: "Centre-Val de Loire",
    8: "Centre-Val de Loire",
    CSNA: "Nouvelle-Aquitaine",
    2: "Nouvelle-Aquitaine",
    EST: "Est",
    1: "Est",
    FRA: "National / fédéral",
    4: "National / fédéral",
    GUAD: "Guadeloupe",
    9: "Guadeloupe",
    HDF: "Hauts-de-France",
    13: "Hauts-de-France",
    21: "Hauts-de-France",
    IDFP: "Île-de-France",
    3: "Île-de-France",
    NORM: "Normandie",
    15: "Normandie",
    OPM: "Open / fédéral",
    19: "Open / fédéral",
    PACA: "Provence-Alpes-Côte d’Azur",
    16: "Provence-Alpes-Côte d’Azur"
  };

  const topCourseOrder = [
    "50SF", "100SF", "200SF", "400SF", "800SF", "1500SF",
    "50AP",
    "100IS", "200IS", "400IS",
    "50BI", "100BI", "200BI", "400BI"
  ];
  const topCourseRanks = new Map(topCourseOrder.map((course, index) => [course, index]));

  const bucketRows = new Map();
  const bucketLoads = new Map();
  const bucketErrors = new Map();
  const initialTopLimit = 25;
  let selectedCourse = "";
  let showAllTopRows = false;
  let birthYearFilterOpen = false;
  let additionalRows = [];
  let performanceCorrections = [];
  let additionalLoaded = false;
  let additionalError = null;
  let additionalLoad = null;

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
    return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value || "-");
  }

  function birthYearLabel(value) {
    const match = String(value || "").match(/^(\d{4})/);
    return match ? match[1] : "";
  }

  function selectedBirthYear() {
    const value = String(elements.birthYear?.value || "").trim();
    return /^\d{4}$/.test(value) ? value : "";
  }

  function swimmerNameHtml(row) {
    const year = birthYearLabel(row?.birthDate);
    const name = escapeHtml(row?.swimmer || "-");
    return year ? `${name} <small class="performance-birth-year">(${year})</small>` : name;
  }

  function swimmerProfileHref(row) {
    if (!row?.swimmer) return "";
    const linkParams = new URLSearchParams();
    if (row.swimmerId) {
      linkParams.set("id", row.swimmerId);
    } else {
      linkParams.set("name", row.swimmer);
      if (row.birthDate) linkParams.set("birth", row.birthDate);
      if (row.sex) linkParams.set("sex", row.sex);
    }
    return `nageur.html?${linkParams.toString()}`;
  }

  function normalizeIdentityPart(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9]+/g, " ")
      .toUpperCase()
      .trim();
  }

  function rowSwimmerKey(row) {
    if (row.swimmerIdentityKey) return row.swimmerIdentityKey;
    const first = normalizeIdentityPart(row.firstName);
    const last = normalizeIdentityPart(row.lastName);
    const birth = String(row.birthDate || "").trim();
    if (first && last && birth) return `${last}|${first}|${birth}`;
    return String(row.swimmerId || row.swimmer || "");
  }

  function performanceCorrectionKey(row) {
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

  function correctedRows(rows) {
    if (!performanceCorrections.length) return rows;
    const byKey = new Map(performanceCorrections.map((correction) => [correction.targetKey, correction]));
    return rows
      .map((row) => {
        const correction = byKey.get(performanceCorrectionKey(row));
        if (!correction) return row;
        if (correction.hidden) return null;
        if (correctionMovesSwimmer(correction, row)) return null;
        return { ...row, ...(correction.patch || {}) };
      })
      .filter(Boolean);
  }

  function correctionMovesSwimmer(correction, row = {}) {
    const patch = correction?.patch || {};
    return Boolean(patch.swimmerId) && String(patch.swimmerId) !== String(row.swimmerId || "");
  }

  function rowFromCorrection(correction) {
    if (!correction || correction.hidden || !correction.targetRow || !correctionMovesSwimmer(correction, correction.targetRow)) return null;
    return { ...correction.targetRow, ...(correction.patch || {}) };
  }

  function addOptions(select, values, allLabel, labeler = (value) => value) {
    select.innerHTML = "";
    select.append(new Option(allLabel, ""));
    values.forEach((value) => select.append(new Option(labeler(value), value)));
  }

  function selectedSegmentValue(group) {
    return group.querySelector(".segment.active")?.dataset.value ?? "";
  }

  function setSegmentValue(group, value) {
    group.querySelectorAll(".segment").forEach((button) => {
      const active = button.dataset.value === value;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function courseMeta(code) {
    return summary.filters.courses.find((course) => course.code === code);
  }

  function courseLabel(code) {
    const course = courseMeta(code);
    return course?.shortLabel || course?.label || code;
  }

  function categoryMeta(sex, code) {
    return summary.filters.categories.find((category) => category.sex === sex && category.code === code);
  }

  function categoryLabel(code, sex = selectedSegmentValue(elements.sex)) {
    return categoryMeta(sex, code)?.label || code;
  }

  function swimmerLabel(sex) {
    return sex === "F" ? "Nageuse" : "Nageur";
  }

  function regionOptions() {
    const groups = new Map();
    const addRegion = (id, label) => {
      const regionId = String(id || "").trim();
      if (!regionId) return;
      const canonicalLabel = canonicalRegionLabels[regionId] || String(label || regionId).trim();
      if (!groups.has(canonicalLabel)) groups.set(canonicalLabel, new Set());
      groups.get(canonicalLabel).add(regionId);
    };
    (summary.filters.regions || []).forEach((region) => addRegion(region.id, region.label));
    additionalRows.forEach((row) => addRegion(row.regionId, row.regionLabel));
    return Array.from(groups, ([label, ids]) => ({
      label,
      ids: Array.from(ids),
      value: Array.from(ids).sort((a, b) => a.localeCompare(b, "fr-FR", { numeric: true })).join(",")
    })).sort((a, b) => a.label.localeCompare(b.label, "fr-FR"));
  }

  function regionLabel(regionValue) {
    const value = String(regionValue || "");
    const option = regionOptions().find((region) => region.value === value || region.ids.includes(value));
    return option?.label || value;
  }

  function refreshRegionOptions(currentValue = elements.region?.value || "") {
    const options = regionOptions();
    addOptions(elements.region, options.map((region) => region.value), "Toutes", (value) =>
      options.find((region) => region.value === value)?.label || value
    );
    const selected = options.find((region) => region.value === currentValue || region.ids.includes(String(currentValue)));
    elements.region.value = selected?.value || "";
  }

  function categoryFileSlug(category) {
    return String(category || "").replace(/\+/g, "");
  }

  function publicTopUrl(bucket) {
    const folder = bucket.preview ? "tops-preview" : "tops";
    return `${publicPerformanceBase}/${folder}/${encodeURIComponent(bucket.course)}/${encodeURIComponent(bucket.sex)}-${encodeURIComponent(categoryFileSlug(bucket.category))}.json?v=${dataVersion}`;
  }

  function withCacheBust(url, param = "publicCache") {
    return `${url}${url.includes("?") ? "&" : "?"}${param}=${encodeURIComponent(`${publicVersion}-${Date.now()}`)}`;
  }

  function loadAdditionalRows() {
    if (additionalLoaded) return Promise.resolve(additionalRows);
    if (additionalLoad) return additionalLoad;
    if (!usesConsolidatedData || !publicAdditionalDataUrl) {
      additionalLoaded = true;
      additionalRows = [];
      performanceCorrections = [];
      return Promise.resolve(additionalRows);
    }

    additionalLoad = fetch(withCacheBust(publicAdditionalDataUrl), { cache: "no-store" })
      .then((response) => response.ok ? response.json() : { performances: [], corrections: [] })
      .then((payload) => {
        additionalRows = Array.isArray(payload?.performances) ? payload.performances : [];
        performanceCorrections = Array.isArray(payload?.corrections) ? payload.corrections : [];
        additionalLoaded = true;
        refreshAdditionalFilterOptions();
        return additionalRows;
      })
      .catch((error) => {
        additionalError = error;
        additionalRows = [];
        performanceCorrections = [];
        additionalLoaded = true;
        return additionalRows;
      });
    return additionalLoad;
  }

  function refreshAdditionalFilterOptions() {
    if (!elements.season || !elements.region) return;
    const currentSeason = elements.season.value;
    const currentRegion = elements.region.value;
    const seasons = Array.from(new Set([
      ...(summary.filters.seasons || []),
      ...additionalRows.map((row) => row.seasonYear).filter(Boolean)
    ])).sort((a, b) => b - a);
    addOptions(elements.season, seasons, "Toutes saisons", (season) => `Saison ${season}`);
    refreshRegionOptions(currentRegion);
    elements.season.value = seasons.map(String).includes(String(currentSeason)) ? currentSeason : "";
  }

  function bucketKey(bucket) {
    return `${bucket.course}|${bucket.sex}|${bucket.category}|${bucket.season || ""}|${bucket.region || ""}|${bucket.limit || ""}|${bucket.preview ? "preview" : "full"}`;
  }

  function categoriesForSex(sex) {
    return summary.filters.categories
      .filter((category) => category.sex === sex)
      .map((category) => category.code);
  }

  function updateCategoryOptions(sex) {
    const current = elements.category.value;
    if (!sex) {
      const values = ["F", "M"].flatMap((valueSex) =>
        categoriesForSex(valueSex).map((category) => `${valueSex}|${category}`)
      );
      addOptions(elements.category, values, "Toutes cat\u00e9gories", (value) => {
        const [optionSex, category] = value.split("|");
        return categoryLabel(category, optionSex);
      });
      elements.category.value = values.includes(current) ? current : "";
      return;
    }

    const values = categoriesForSex(sex);
    addOptions(elements.category, values, "Toutes cat\u00e9gories", (category) => categoryLabel(category, sex));
    elements.category.value = values.includes(current) ? current : "";
  }

  function renderCourseButtons() {
    const courses = [...summary.filters.courses].sort((a, b) =>
      (topCourseRanks.get(a.code) ?? 999) - (topCourseRanks.get(b.code) ?? 999)
    );
    elements.courseButtons.innerHTML = courses.map((course) => `
      <button
        type="button"
        class="top-course-button top-course-${escapeHtml(String(course.style || "").toLowerCase())}"
        data-course="${escapeHtml(course.code)}"
        aria-pressed="${selectedCourse === course.code ? "true" : "false"}"
      >${escapeHtml(course.shortLabel || course.code)}</button>
    `).join("");
  }

  function setCourse(course) {
    selectedCourse = course || "";
    elements.courseButtons.querySelectorAll("[data-course]").forEach((button) => {
      const active = button.dataset.course === selectedCourse;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function resetTopLimit() {
    showAllTopRows = false;
  }

  function topBucketsForFilters(filters) {
    if (!filters.course || !filters.sex) return [];
    const usePreview = Number.isFinite(filters.limit) && !filters.pool && !filters.season && !filters.region && !filters.birthYear && !filters.birthYearFilterOpen;
    return [filters.sex].flatMap((sex) => {
      const categories = filters.category ? [filters.category] : categoriesForSex(sex);
      return categories.map((category) => ({
        course: filters.course,
        sex,
        category,
        season: filters.season,
        region: filters.region,
        limit: Number.isFinite(filters.limit) ? filters.limit : 1000,
        preview: usePreview
      }));
    });
  }

  function loadBucketRows(bucket) {
    const key = bucketKey(bucket);
    if (!bucket.course || !bucket.sex || !bucket.category) return Promise.resolve([]);
    if (bucketRows.has(key)) return Promise.resolve(bucketRows.get(key));
    if (bucketLoads.has(key)) return bucketLoads.get(key);

    const promise = fetch(publicTopUrl(bucket), { cache: "force-cache" }).then((response) => {
      if (response.status === 404) return [];
      if (!response.ok) throw new Error("Fichier TOP indisponible.");
      return response.json();
    }).then((rows) => {
      bucketRows.set(key, Array.isArray(rows) ? rows : []);
      bucketErrors.delete(key);
      return bucketRows.get(key);
    })
      .catch((error) => {
        bucketErrors.set(key, error);
        throw error;
      })
      .finally(() => {
        bucketLoads.delete(key);
      });

    bucketLoads.set(key, promise);
    return promise;
  }

  function currentFilters() {
    const rawCategory = elements.category.value;
    const [categorySex, category] = rawCategory.includes("|") ? rawCategory.split("|") : ["", rawCategory];
    const sex = selectedSegmentValue(elements.sex) || categorySex;
    return {
      season: elements.season.value,
      region: elements.region.value,
      pool: selectedSegmentValue(elements.pool),
      birthYear: selectedBirthYear(),
      birthYearFilterOpen,
      sex,
      category,
      course: selectedCourse,
      limit: showAllTopRows ? Infinity : initialTopLimit
    };
  }

  function updateTitle(filters) {
    const category = filters.category ? categoryLabel(filters.category, filters.sex) : "";
    const course = filters.course ? courseLabel(filters.course) : "";
    const season = filters.season ? `Saison ${filters.season}` : "";
    const region = filters.region ? regionLabel(filters.region) : "";
    const pool = filters.pool ? `Bassin ${filters.pool} m` : "";
    const birthYear = filters.birthYear ? `Naissance ${filters.birthYear}` : "";
    const categoryContext = filters.sex
      ? [sexLabels[filters.sex], category || "Toutes cat\u00e9gories"].filter(Boolean).join(" - ")
      : "";
    const context = [course, categoryContext, birthYear, pool, season, region].filter(Boolean).join(" - ");
    elements.title.textContent = context ? `TOP ${context}` : "TOP";
  }

  function performancePool(row) {
    const candidates = [row?.pool, row?.poolLength, row?.poolSize, row?.bassin, row?.basin];
    for (const value of candidates) {
      const text = String(value ?? "").trim().toLowerCase();
      if (!text) continue;
      const match = text.match(/(?:^|[^0-9])(25|50)(?:[^0-9]|$)/) || text.match(/^(25|50)$/);
      if (match) return match[1];
    }
    return "";
  }

  function betterPerformance(candidate, current) {
    if (!current) return true;
    return candidate.timeValue < current.timeValue ||
      (candidate.timeValue === current.timeValue && String(candidate.date).localeCompare(current.date) < 0);
  }

  function matchingRowsForFilters(filters, bucketFilters = filters) {
    const intranapRows = topBucketsForFilters(bucketFilters).flatMap((bucket) => bucketRows.get(bucketKey(bucket)) || []);
    const importedRows = additionalRows.filter((row) =>
      row.course === filters.course &&
      row.sex === filters.sex &&
      (!filters.category || row.category === filters.category)
    );
    const reassignedRows = performanceCorrections
      .map(rowFromCorrection)
      .filter((row) =>
        row &&
        row.course === filters.course &&
        row.sex === filters.sex &&
        (!filters.category || row.category === filters.category)
      );
    const rows = [...correctedRows([...intranapRows, ...importedRows]), ...reassignedRows]
      .filter((row) =>
        row.course === filters.course &&
        row.sex === filters.sex &&
        (!filters.category || row.category === filters.category)
      );
    const season = filters.season ? Number(filters.season) : null;
    const selectedRegions = new Set(String(filters.region || "").split(",").filter(Boolean));
    return rows.filter((row) => {
      if (season && Number(row.seasonYear) !== season) return false;
      if (selectedRegions.size && !selectedRegions.has(String(row.regionId))) return false;
      if (filters.pool && performancePool(row) !== String(filters.pool)) return false;
      if (filters.birthYear && birthYearLabel(row.birthDate) !== filters.birthYear) return false;
      return true;
    });
  }

  function updateBirthYearOptions(filters) {
    const years = Array.from(new Set(
      matchingRowsForFilters({ ...filters, birthYear: "" }, filters)
        .map((row) => birthYearLabel(row.birthDate))
        .filter(Boolean)
    )).sort((a, b) => Number(b) - Number(a));
    const selected = years.includes(filters.birthYear) ? filters.birthYear : "";
    addOptions(elements.birthYear, years, "Toutes les ann\u00e9es");
    elements.birthYear.value = selected;
    elements.birthYear.disabled = false;
    filters.birthYear = selected;
  }

  function rowsForFilters(filters, bucketFilters = filters) {
    const bestBySwimmer = new Map();

    matchingRowsForFilters(filters, bucketFilters).forEach((row) => {

      const swimmerKey = rowSwimmerKey(row);
      const current = bestBySwimmer.get(swimmerKey);
      if (betterPerformance(row, current)) {
        bestBySwimmer.set(swimmerKey, row);
      }
    });

    const rankedRows = Array.from(bestBySwimmer.values())
      .sort((a, b) => a.timeValue - b.timeValue || String(a.date).localeCompare(b.date))
      .map((row, index) => ({
        ...row,
        topRank: index + 1
      }));

    return Number.isFinite(filters.limit) ? rankedRows.slice(0, filters.limit) : rankedRows;
  }

  function mobileMeta(row) {
    return [row.location, formatDate(row.date)]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(" \u00b7 ");
  }

  function splitMeta(row) {
    const splits = Array.isArray(row.intermediateTimes) ? row.intermediateTimes : [];
    if (!splits.length) return "";
    return `Interm\u00e9diaires : ${splits.map((split) => `${split.distance ? `${split.distance} m` : split.code} ${split.time}`).join(" \u00b7 ")}`;
  }

  function renderRows(rows, filters, state = "ready") {
    if (elements.loadMore) elements.loadMore.hidden = true;
    if (elements.swimmerHeader) elements.swimmerHeader.textContent = swimmerLabel(filters.sex);
    if (!filters.sex && !filters.course) {
      elements.body.innerHTML = `<tr class="pending-row"><td class="empty" colspan="6">Choisissez un sexe et une course.</td></tr>`;
      return;
    }
    if (!filters.sex) {
      elements.body.innerHTML = `<tr class="pending-row"><td class="empty" colspan="6">Choisissez un sexe.</td></tr>`;
      return;
    }
    if (!filters.course) {
      elements.body.innerHTML = `<tr class="pending-row"><td class="empty" colspan="6">Choisissez une course.</td></tr>`;
      return;
    }
    if (state === "loading") {
      elements.body.innerHTML = `<tr class="pending-row"><td class="empty" colspan="6">Chargement des performances de la course...</td></tr>`;
      return;
    }
    if (state === "error") {
      elements.body.innerHTML = `<tr class="pending-row"><td class="empty" colspan="6">Impossible de charger les performances de cette course.</td></tr>`;
      return;
    }
    if (!rows.length) {
      elements.body.innerHTML = `<tr class="pending-row"><td class="empty" colspan="6">Aucune performance pour ces filtres.</td></tr>`;
      return;
    }

    elements.body.innerHTML = rows.map((row) => `
      <tr class="sex-${escapeHtml(String(row.sex || "").toLowerCase())}" tabindex="0" role="button" aria-expanded="false">
        <td data-label="Rang"><strong>${escapeHtml(row.topRank)}</strong></td>
        <td class="time" data-label="Temps">${escapeHtml(row.time)}</td>
        <td data-label="${swimmerLabel(row.sex)}">
          <strong><a class="performance-name-link" href="${escapeHtml(swimmerProfileHref(row))}" data-swimmer-name="${escapeHtml(row.swimmer)}">${swimmerNameHtml(row)}</a></strong>
          <small class="record-mobile-meta">${escapeHtml(mobileMeta(row))}</small>
          ${splitMeta(row) ? `<small class="top-split-meta">${escapeHtml(splitMeta(row))}</small>` : ""}
        </td>
        <td data-label="Club">${escapeHtml(row.club || "-")}</td>
        <td data-label="Lieu">${escapeHtml(row.location || "-")}</td>
        <td data-label="Date">${escapeHtml(formatDate(row.date))}</td>
      </tr>
    `).join("");
  }

  function updateLoadMore(rows, allRows, filters) {
    if (!elements.loadMore || !elements.loadMoreButton) return;
    const hasMore = Number.isFinite(filters.limit) && allRows.length > rows.length;
    elements.loadMore.hidden = !hasMore;
    if (hasMore) {
      elements.loadMoreButton.textContent = `Afficher la suite (${allRows.length - rows.length})`;
    }
  }

  function render() {
    const filters = currentFilters();
    updateTitle(filters);

    if (!filters.sex && !filters.course) {
      addOptions(elements.birthYear, [], "Toutes les ann\u00e9es");
      elements.birthYear.disabled = true;
      elements.status.textContent = "Choisissez un sexe et une course";
      renderRows([], filters);
      return;
    }

    if (!filters.sex) {
      addOptions(elements.birthYear, [], "Toutes les ann\u00e9es");
      elements.birthYear.disabled = true;
      elements.status.textContent = "Choisissez un sexe";
      renderRows([], filters);
      return;
    }

    if (!filters.course) {
      addOptions(elements.birthYear, [], "Toutes les ann\u00e9es");
      elements.birthYear.disabled = true;
      elements.status.textContent = "Choisissez une course";
      renderRows([], filters);
      return;
    }

    const buckets = topBucketsForFilters(filters);
    const failedBucket = buckets.find((bucket) => bucketErrors.has(bucketKey(bucket)));
    if (failedBucket) {
      elements.status.textContent = "Chargement impossible";
      renderRows([], filters, "error");
      return;
    }

    const missingBuckets = buckets.filter((bucket) => !bucketRows.has(bucketKey(bucket)));
    if (missingBuckets.length) {
      elements.status.textContent = "Chargement...";
      renderRows([], filters, "loading");
      Promise.all(missingBuckets.map(loadBucketRows)).then(render).catch(render);
      return;
    }

    if (!additionalLoaded && !additionalError) {
      elements.status.textContent = "Chargement de la base additionnelle...";
      renderRows([], filters, "loading");
      loadAdditionalRows().then(render).catch(render);
      return;
    }

    updateBirthYearOptions(filters);
    updateTitle(filters);
    const rows = rowsForFilters(filters);
    const allRows = Number.isFinite(filters.limit)
      ? rowsForFilters({ ...filters, limit: Infinity }, filters)
      : rows;
    const limitLabel = Number.isFinite(filters.limit) ? `TOP ${filters.limit}` : "Tous";
    const poolLabel = filters.pool ? `Bassin ${filters.pool} m` : "Tous bassins";
    const birthYearLabelText = filters.birthYear ? `Naissance ${filters.birthYear}` : "";
    const countLabel = allRows.length > rows.length ? `${rows.length} / ${allRows.length}` : `${rows.length}`;
    elements.status.textContent = [
      `${countLabel} ligne${allRows.length > 1 ? "s" : ""}`,
      limitLabel,
      poolLabel,
      birthYearLabelText
    ].filter(Boolean).join(" - ");
    renderRows(rows, filters);
    updateLoadMore(rows, allRows, filters);
  }

  function init() {
    addOptions(elements.season, summary.filters.seasons || [], "Toutes saisons", (season) => `Saison ${season}`);
    refreshRegionOptions();
    renderCourseButtons();
    updateCategoryOptions("");
    setSegmentValue(elements.sex, "");
    setSegmentValue(elements.pool, "");
    render();

    elements.category.addEventListener("input", () => {
      resetTopLimit();
      const rawCategory = elements.category.value;
      if (rawCategory.includes("|")) {
        const [sex, category] = rawCategory.split("|");
        setSegmentValue(elements.sex, sex);
        updateCategoryOptions(sex);
        elements.category.value = category;
      }
      render();
    });

    elements.sex.querySelectorAll(".segment").forEach((button) => {
      button.addEventListener("click", () => {
        const { category } = currentFilters();
        const sex = button.dataset.value;
        setSegmentValue(elements.sex, sex);
        updateCategoryOptions(sex);
        elements.category.value = category && categoriesForSex(sex).includes(category) ? category : "";
        resetTopLimit();
        render();
      });
    });

    elements.courseButtons.addEventListener("click", (event) => {
      const button = event.target.closest("[data-course]");
      if (!button) return;
      setCourse(button.dataset.course);
      resetTopLimit();
      render();
    });

    elements.season.addEventListener("input", () => {
      resetTopLimit();
      render();
    });
    elements.region.addEventListener("input", () => {
      resetTopLimit();
      render();
    });
    elements.pool.querySelectorAll(".segment").forEach((button) => {
      button.addEventListener("click", () => {
        setSegmentValue(elements.pool, button.dataset.value);
        resetTopLimit();
        render();
      });
    });

    elements.birthYearToggle?.addEventListener("click", () => {
      const expanded = elements.birthYearToggle.getAttribute("aria-expanded") !== "true";
      birthYearFilterOpen = expanded;
      elements.birthYearToggle.setAttribute("aria-expanded", expanded ? "true" : "false");
      elements.birthYearToggle.setAttribute("aria-label", `${expanded ? "Masquer" : "Afficher"} le filtre par ann\u00e9e de naissance`);
      elements.birthYearField.hidden = !expanded;
      render();
      if (expanded) elements.birthYear.focus();
    });

    elements.birthYear?.addEventListener("input", () => {
      resetTopLimit();
      render();
    });

    elements.loadMoreButton?.addEventListener("click", () => {
      showAllTopRows = true;
      render();
    });

    elements.body.addEventListener("click", (event) => {
      const swimmerLink = event.target.closest(".performance-name-link");
      if (swimmerLink) {
        event.stopPropagation();
        const swimmerName = swimmerLink.dataset.swimmerName || "ce nageur";
        if (!window.confirm(`Ouvrir la fiche de ${swimmerName} ?`)) event.preventDefault();
        return;
      }
      if (event.target.closest("a, button, input, select, textarea")) return;
      const row = event.target.closest("tr");
      if (!row || row.classList.contains("section-row") || row.classList.contains("pending-row")) return;
      const expanded = !row.classList.contains("expanded");
      row.classList.toggle("expanded", expanded);
      row.setAttribute("aria-expanded", expanded ? "true" : "false");
    });

    elements.body.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (event.target.closest("a, button, input, select, textarea")) return;
      const row = event.target.closest("tr");
      if (!row || row.classList.contains("section-row") || row.classList.contains("pending-row")) return;
      event.preventDefault();
      const expanded = !row.classList.contains("expanded");
      row.classList.toggle("expanded", expanded);
      row.setAttribute("aria-expanded", expanded ? "true" : "false");
    });

    render();
  }

  function start() {
    loadSelectedPublicManifest().then(init);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})(window);
