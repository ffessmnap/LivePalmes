(function attachIntranapTopsPage(global) {
  const summary = global.LIVEPALMES_INTRANAP_SUMMARY || { filters: { courses: [], categories: [], seasons: [], regions: [] }, counts: {} };
  const publicVersion = global.LIVEPALMES_PERFORMANCE_PUBLIC_VERSION || summary.generatedAt || "20260602-intranap-4";
  const dataVersion = encodeURIComponent(publicVersion);
  const publicPerformanceBase = "public/data/performance-public";
  const usesConsolidatedData = true;
  const publicAdditionalDataUrl = global.LivePalmesAppConfig?.performanceAdditionalDataUrl ||
    "https://storage.googleapis.com/livepalmes-public-data-718081132564/performance-public/additional-data.json";

  const elements = {
    season: document.querySelector("#topSeasonFilter"),
    region: document.querySelector("#topRegionFilter"),
    category: document.querySelector("#topCategoryFilter"),
    sex: document.querySelector("#topSexFilter"),
    courseButtons: document.querySelector("#topCourseButtons"),
    limit: document.querySelector("#topLimitFilter"),
    title: document.querySelector("#topTitle"),
    status: document.querySelector("#topStatus"),
    swimmerHeader: document.querySelector("#topSwimmerHeader"),
    body: document.querySelector("#topBody")
  };

  const sexLabels = {
    F: "Femmes",
    M: "Hommes"
  };

  const bucketRows = new Map();
  const bucketLoads = new Map();
  const bucketErrors = new Map();
  let selectedCourse = "";
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
    return match ? `${match[3]}-${match[2]}-${match[1]}` : String(value || "-");
  }

  function birthYearLabel(value) {
    const match = String(value || "").match(/^(\d{4})/);
    return match ? match[1] : "";
  }

  function swimmerNameHtml(row) {
    const year = birthYearLabel(row?.birthDate);
    const name = escapeHtml(row?.swimmer || "-");
    return year ? `${name} <small class="performance-birth-year">(${year})</small>` : name;
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

  function regionLabel(regionId) {
    return summary.filters.regions.find((region) => region.id === regionId)?.label ||
      additionalRows.find((row) => String(row.regionId) === String(regionId))?.regionLabel ||
      regionId ||
      "";
  }

  function categoryFileSlug(category) {
    return String(category || "").replace(/\+/g, "");
  }

  function publicTopUrl(bucket) {
    return `${publicPerformanceBase}/tops/${encodeURIComponent(bucket.course)}/${encodeURIComponent(bucket.sex)}-${encodeURIComponent(categoryFileSlug(bucket.category))}.json?v=${dataVersion}`;
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
    const regions = new Map((summary.filters.regions || []).map((region) => [String(region.id), region.label]));
    additionalRows.forEach((row) => {
      if (row.regionId && !regions.has(String(row.regionId))) {
        regions.set(String(row.regionId), row.regionLabel || row.regionId);
      }
    });
    addOptions(elements.season, seasons, "Toutes saisons", (season) => `Saison ${season}`);
    addOptions(elements.region, Array.from(regions.keys()), "Toutes", (regionId) => regions.get(String(regionId)) || regionLabel(regionId));
    elements.season.value = seasons.map(String).includes(String(currentSeason)) ? currentSeason : "";
    elements.region.value = regions.has(String(currentRegion)) ? currentRegion : "";
  }

  function bucketKey(bucket) {
    return `${bucket.course}|${bucket.sex}|${bucket.category}|${bucket.season || ""}|${bucket.region || ""}|${bucket.limit || ""}`;
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
    elements.courseButtons.innerHTML = summary.filters.courses.map((course) => `
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

  function topBucketsForFilters(filters) {
    if (!filters.course || !filters.sex) return [];
    return [filters.sex].flatMap((sex) => {
      const categories = filters.category ? [filters.category] : categoriesForSex(sex);
      return categories.map((category) => ({
        course: filters.course,
        sex,
        category,
        season: filters.season,
        region: filters.region,
        limit: Number.isFinite(filters.limit) ? filters.limit : 1000
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
      sex,
      category,
      course: selectedCourse,
      limit: selectedSegmentValue(elements.limit) === "all" ? Infinity : Number(selectedSegmentValue(elements.limit) || 25)
    };
  }

  function updateTitle(filters) {
    const category = filters.category ? categoryLabel(filters.category, filters.sex) : "";
    const course = filters.course ? courseLabel(filters.course) : "";
    const season = filters.season ? `Saison ${filters.season}` : "";
    const region = filters.region ? regionLabel(filters.region) : "";
    const categoryContext = filters.sex
      ? [sexLabels[filters.sex], category || "Toutes cat\u00e9gories"].filter(Boolean).join(" - ")
      : "";
    const context = [course, categoryContext, season, region].filter(Boolean).join(" - ");
    elements.title.textContent = context ? `TOP ${context}` : "TOP";
  }

  function betterPerformance(candidate, current) {
    if (!current) return true;
    return candidate.timeValue < current.timeValue ||
      (candidate.timeValue === current.timeValue && String(candidate.date).localeCompare(current.date) < 0);
  }

  function rowsForFilters(filters) {
    const intranapRows = topBucketsForFilters(filters).flatMap((bucket) => bucketRows.get(bucketKey(bucket)) || []);
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
    const bestBySwimmer = new Map();

    rows.forEach((row) => {
      if (season && Number(row.seasonYear) !== season) return;
      if (filters.region && String(row.regionId) !== filters.region) return;

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
          <strong class="performance-name-link">${swimmerNameHtml(row)}</strong>
          <small class="record-mobile-meta">${escapeHtml(mobileMeta(row))}</small>
          ${splitMeta(row) ? `<small class="top-split-meta">${escapeHtml(splitMeta(row))}</small>` : ""}
        </td>
        <td data-label="Club">${escapeHtml(row.club || "-")}</td>
        <td data-label="Lieu">${escapeHtml(row.location || "-")}</td>
        <td data-label="Date">${escapeHtml(formatDate(row.date))}</td>
      </tr>
    `).join("");
  }

  function render() {
    const filters = currentFilters();
    updateTitle(filters);

    if (!filters.sex && !filters.course) {
      elements.status.textContent = "Choisissez un sexe et une course";
      renderRows([], filters);
      return;
    }

    if (!filters.sex) {
      elements.status.textContent = "Choisissez un sexe";
      renderRows([], filters);
      return;
    }

    if (!filters.course) {
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

    const rows = rowsForFilters(filters);
    const limitLabel = Number.isFinite(filters.limit) ? `TOP ${filters.limit}` : "Tous";
    elements.status.textContent = `${rows.length} ligne${rows.length > 1 ? "s" : ""} - ${limitLabel}`;
    renderRows(rows, filters);
  }

  function init() {
    addOptions(elements.season, summary.filters.seasons || [], "Toutes saisons", (season) => `Saison ${season}`);
    addOptions(elements.region, (summary.filters.regions || []).map((region) => region.id), "Toutes", regionLabel);
    renderCourseButtons();
    updateCategoryOptions("");
    setSegmentValue(elements.sex, "");
    setSegmentValue(elements.limit, "25");
    render();

    elements.category.addEventListener("input", () => {
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
        render();
      });
    });

    elements.courseButtons.addEventListener("click", (event) => {
      const button = event.target.closest("[data-course]");
      if (!button) return;
      setCourse(button.dataset.course);
      render();
    });

    elements.season.addEventListener("input", render);
    elements.region.addEventListener("input", render);
    elements.limit.querySelectorAll(".segment").forEach((button) => {
      button.addEventListener("click", () => {
        setSegmentValue(elements.limit, button.dataset.value);
        render();
      });
    });

    elements.body.addEventListener("click", (event) => {
      if (event.target.closest("a, button, input, select, textarea")) return;
      const row = event.target.closest("tr");
      if (!row || row.classList.contains("section-row") || row.classList.contains("pending-row")) return;
      const expanded = !row.classList.contains("expanded");
      row.classList.toggle("expanded", expanded);
      row.setAttribute("aria-expanded", expanded ? "true" : "false");
    });

    elements.body.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const row = event.target.closest("tr");
      if (!row || row.classList.contains("section-row") || row.classList.contains("pending-row")) return;
      event.preventDefault();
      const expanded = !row.classList.contains("expanded");
      row.classList.toggle("expanded", expanded);
      row.setAttribute("aria-expanded", expanded ? "true" : "false");
    });

    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})(window);
