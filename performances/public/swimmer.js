(function attachIntranapSwimmerPage(global) {
  const summary = global.LIVEPALMES_INTRANAP_SUMMARY || { counts: {}, filters: { courses: [] } };
  const swimmers = global.LIVEPALMES_INTRANAP_SWIMMERS || [];
  const chunkCache = new Map();
  const dataVersion = encodeURIComponent(summary.generatedAt || "20260602-swimmer-card-2");

  const elements = {
    search: document.querySelector("#swimmerSearchInput"),
    suggestions: document.querySelector("#swimmerSearchResults"),
    season: document.querySelector("#swimmerSeasonFilter"),
    course: document.querySelector("#swimmerCourseFilter"),
    displayMode: document.querySelector("#swimmerDisplayMode"),
    progress: document.querySelector("#progressPanel"),
    title: document.querySelector("#swimmerTitle"),
    status: document.querySelector("#swimmerStatus"),
    body: document.querySelector("#swimmerBestBody"),
    card: document.querySelector("#swimmerCard")
  };

  const COURSE_FAMILIES = [
    { key: "SF", label: "Surface" },
    { key: "AP", label: "Apn\u00e9e" },
    { key: "IS", label: "Immersion" },
    { key: "BI", label: "Bi-palmes" }
  ];

  const courseOrder = new Map((summary.filters.courses || []).map((course, index) => [course.code, index]));

  let selectedSwimmer = null;
  let selectedPerfs = [];
  let additionalPerfs = [];
  let additionalSwimmers = [];
  let additionalLoaded = false;
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

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("fr-FR")
      .trim();
  }

  function formatDate(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : String(value || "-");
  }

  function displayName(swimmer) {
    return swimmer?.name || [swimmer?.firstName, swimmer?.lastName].filter(Boolean).join(" ");
  }

  function allSwimmers() {
    const byId = new Map(swimmers.map((swimmer) => [String(swimmer.id), swimmer]));
    additionalSwimmers.forEach((swimmer) => {
      if (!byId.has(String(swimmer.id))) byId.set(String(swimmer.id), swimmer);
    });
    return Array.from(byId.values());
  }

  function findSwimmerById(id) {
    return allSwimmers().find((swimmer) => String(swimmer.id) === String(id));
  }

  function addOptions(select, values, allLabel, labeler = (value) => value) {
    select.innerHTML = "";
    select.append(new Option(allLabel, ""));
    values.forEach((value) => select.append(new Option(labeler(value), value)));
  }

  function selectedSegmentValue(group) {
    return group.querySelector(".segment.active")?.dataset.value ?? "best";
  }

  function setSegmentValue(group, value) {
    group.querySelectorAll(".segment").forEach((button) => {
      const active = button.dataset.value === value;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function courseLabel(code) {
    const course = (summary.filters.courses || []).find((item) => item.code === code);
    return course?.label || course?.shortLabel || code;
  }

  function compareCourse(a, b) {
    return (courseOrder.get(a.course) ?? 999) - (courseOrder.get(b.course) ?? 999) ||
      Number(a.length || 0) - Number(b.length || 0) ||
      String(a.course || "").localeCompare(String(b.course || ""), "fr-FR", { numeric: true });
  }

  async function loadChunk(chunk) {
    if (!chunk) return {};
    if (chunkCache.has(chunk)) return chunkCache.get(chunk);
    const response = await fetch(`public/data/intranap-swimmer-perfs/chunk-${encodeURIComponent(chunk)}.json?v=${dataVersion}`);
    if (!response.ok) throw new Error(`Chunk nageur introuvable : ${chunk}`);
    const data = await response.json();
    chunkCache.set(chunk, data);
    return data;
  }

  function ensureFirebaseApp() {
    const firebase = global.firebase;
    const config = global.LivePalmesAppConfig?.firebaseConfig;
    if (!firebase?.initializeApp || !config) return null;
    if (!firebase.apps?.length) firebase.initializeApp(config);
    return firebase.app();
  }

  function functionsService() {
    const firebase = global.firebase;
    const app = ensureFirebaseApp();
    const region = global.LivePalmesAppConfig?.firebaseFunctionsRegion || "europe-west1";
    if (app?.functions) return app.functions(region);
    if (firebase?.functions) {
      const service = firebase.functions();
      if (service?.useRegion) service.useRegion(region);
      return service;
    }
    return null;
  }

  function loadAdditionalData() {
    if (additionalLoaded) return Promise.resolve(additionalPerfs);
    if (additionalLoad) return additionalLoad;
    const functions = functionsService();
    if (!functions?.httpsCallable) {
      additionalLoaded = true;
      additionalPerfs = [];
      additionalSwimmers = [];
      return Promise.resolve(additionalPerfs);
    }

    additionalLoad = functions.httpsCallable("listAdditionalPerformanceData")({})
      .then((result) => {
        additionalPerfs = Array.isArray(result.data?.performances) ? result.data.performances : [];
        additionalSwimmers = Array.isArray(result.data?.swimmers) ? result.data.swimmers : [];
        additionalLoaded = true;
        return additionalPerfs;
      })
      .catch(() => {
        additionalPerfs = [];
        additionalSwimmers = [];
        additionalLoaded = true;
        return additionalPerfs;
      })
      .finally(() => {
        additionalLoad = null;
      });
    return additionalLoad;
  }

  function resetFilters() {
    addOptions(elements.season, [], "Toutes");
    addOptions(elements.course, [], "Toutes");
    setSegmentValue(elements.displayMode, "best");
  }

  function updateFilters(perfs) {
    const seasons = Array.from(new Set(perfs.map((perf) => perf.seasonYear).filter(Boolean))).sort((a, b) => b - a);
    const courses = Array.from(new Set(perfs.map((perf) => perf.course).filter(Boolean)))
      .map((course) => (summary.filters.courses || []).find((item) => item.code === course) || { code: course, label: course })
      .sort((a, b) =>
        (courseOrder.get(a.code) ?? 999) - (courseOrder.get(b.code) ?? 999) ||
        Number(a.length || 0) - Number(b.length || 0) ||
        a.code.localeCompare(b.code, "fr-FR", { numeric: true })
      )
      .map((course) => course.code);
    addOptions(elements.season, seasons, "Toutes", (season) => `Saison ${season}`);
    addOptions(elements.course, courses, "Toutes", courseLabel);
  }

  function scoreSwimmer(swimmer, tokens) {
    const name = normalize(displayName(swimmer));
    const lastName = normalize(swimmer.lastName);
    const firstName = normalize(swimmer.firstName);
    if (tokens.every((token) => lastName.startsWith(token) || firstName.startsWith(token))) return 0;
    if (tokens.every((token) => name.includes(token))) return 1;
    if (tokens.every((token) => lastName.includes(token) || firstName.includes(token))) return 2;
    return 3;
  }

  function searchSwimmers() {
    const query = normalize(elements.search.value);
    if (query.length < 2) {
      elements.suggestions.innerHTML = "";
      return;
    }
    const tokens = query.split(/\s+/).filter(Boolean);
    const matches = allSwimmers()
      .filter((swimmer) => {
        const haystack = normalize([displayName(swimmer), swimmer.lastName, swimmer.firstName].join(" "));
        return tokens.every((token) => haystack.includes(token));
      })
      .sort((a, b) => scoreSwimmer(a, tokens) - scoreSwimmer(b, tokens) || a.lastName.localeCompare(b.lastName, "fr-FR") || a.firstName.localeCompare(b.firstName, "fr-FR"))
      .slice(0, 10);

    elements.suggestions.innerHTML = matches.length ? matches.map((swimmer) => `
      <button type="button" class="suggestion-button" data-swimmer-id="${escapeHtml(swimmer.id)}">
        <strong>${escapeHtml(displayName(swimmer))}</strong>
        <span>${escapeHtml([swimmer.sex === "F" ? "Femme" : "Homme", swimmer.club].filter(Boolean).join(" - "))}</span>
      </button>
    `).join("") : `<button type="button" class="suggestion-button">Aucun nageur trouv&eacute;</button>`;
  }

  function currentFilters() {
    return {
      season: elements.season.value,
      course: elements.course.value,
      mode: selectedSegmentValue(elements.displayMode)
    };
  }

  function filteredPerfs(perfs, filters) {
    return perfs.filter((perf) =>
      (!filters.season || String(perf.seasonYear) === filters.season) &&
      (!filters.course || perf.course === filters.course)
    );
  }

  function bestByCourse(perfs) {
    const best = new Map();
    perfs.forEach((perf) => {
      const current = best.get(perf.course);
      if (!current || perf.timeValue < current.timeValue || (perf.timeValue === current.timeValue && String(perf.date).localeCompare(current.date) < 0)) {
        best.set(perf.course, perf);
      }
    });
    return Array.from(best.values()).sort(compareCourse);
  }

  function rowsForFilters() {
    const filters = currentFilters();
    const filtered = filteredPerfs(selectedPerfs, filters);
    if (filters.mode === "best") return bestByCourse(filtered);
    return filtered.sort((a, b) => {
      if (filters.course) return a.timeValue - b.timeValue || String(b.date).localeCompare(a.date);
      return String(b.date).localeCompare(a.date) || compareCourse(a, b);
    });
  }

  function familyForPerf(perf) {
    return COURSE_FAMILIES.find((family) => perf.style === family.key || String(perf.course || "").endsWith(family.key));
  }

  function mobileMeta(perf) {
    return [perf.location, formatDate(perf.date)]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(" \u00b7 ");
  }

  function originMeta(perf) {
    if (!perf.isIntermediate) return "";
    const origin = perf.originCourseShortLabel || perf.originCourse || "";
    return origin ? `Passage du ${origin}` : "Temps de passage";
  }

  function splitDistance(split) {
    const codeDistances = { TI1: 100, TI2: 200, TI3: 400, TI4: 800 };
    return split.distance || codeDistances[String(split.code || "").toUpperCase()] || Number(String(split.code || "").replace(/\D/g, "")) || "";
  }

  function splitDetails(perf) {
    if (perf.isIntermediate) return [];
    const directSplits = Array.isArray(perf.intermediateTimes)
      ? perf.intermediateTimes
        .filter((split) => split?.time)
        .map((split) => ({
          distance: splitDistance(split),
          time: split.time,
          timeValue: split.timeValue || 0
        }))
      : [];

    const linkedSplits = selectedPerfs
      .filter((candidate) =>
        candidate.isIntermediate &&
        candidate.originPerformanceId &&
        String(candidate.originPerformanceId) === String(perf.id)
      )
      .map((candidate) => ({
        distance: candidate.length || candidate.splitDistance || "",
        time: candidate.time,
        timeValue: candidate.timeValue || 0
      }));

    const byDistance = new Map();
    [...directSplits, ...linkedSplits].forEach((split) => {
      const key = String(split.distance || split.time);
      if (!byDistance.has(key) || split.timeValue < byDistance.get(key).timeValue) {
        byDistance.set(key, split);
      }
    });
    return Array.from(byDistance.values()).sort((a, b) => Number(a.distance || 0) - Number(b.distance || 0));
  }

  function splitPanelHtml(perf) {
    const splits = splitDetails(perf);
    if (!splits.length) return "";
    const passageLabel = splits.length > 1 ? "Passages" : "Passage";
    return `
      <tr class="swimmer-splits-row" aria-hidden="true">
        <td colspan="6">
          <div class="swimmer-splits-panel">
            <span class="swimmer-splits-title">${passageLabel}</span>
            <span class="swimmer-splits-list">
              ${splits.map((split) => `
                <span class="swimmer-split-chip">
                  <span class="swimmer-split-distance">${escapeHtml(split.distance ? `${split.distance} m` : "Passage")}</span>
                  <strong>${escapeHtml(split.time)}</strong>
                </span>
              `).join("")}
            </span>
          </div>
        </td>
      </tr>
    `;
  }

  function rowHtml(perf) {
    const origin = originMeta(perf);
    const splits = splitPanelHtml(perf);
    return `
      <tr class="sex-${escapeHtml(String(perf.sex || "").toLowerCase())}" tabindex="0" role="button" aria-expanded="false">
        <td data-label="Course">
          <button class="course-progress-trigger" type="button" data-progress-course="${escapeHtml(perf.course)}">
            ${escapeHtml(perf.courseShortLabel || perf.course)}
          </button>
          ${origin ? `<small class="performance-origin-meta">${escapeHtml(origin)}</small>` : ""}
        </td>
        <td class="time" data-label="Temps">${escapeHtml(perf.time)}</td>
        <td data-label="Cat&eacute;gorie"><strong>${escapeHtml(perf.categoryCode || perf.category || "-")}</strong></td>
        <td data-label="Club">
          <strong>${escapeHtml(perf.club || "-")}</strong>
          <small class="record-mobile-meta">${escapeHtml(mobileMeta(perf))}</small>
        </td>
        <td data-label="Lieu">${escapeHtml(perf.location || "-")}</td>
        <td data-label="Date">${escapeHtml(formatDate(perf.date))}</td>
      </tr>
      ${splits}
    `;
  }

  function renderSectionedRows(rows) {
    const html = [];
    COURSE_FAMILIES.forEach((family) => {
      const sectionRows = rows.filter((perf) => familyForPerf(perf)?.key === family.key);
      if (!sectionRows.length) return;
      html.push(`<tr class="section-row"><td colspan="6">${escapeHtml(family.label)}</td></tr>`);
      html.push(...sectionRows.map(rowHtml));
    });
    elements.body.innerHTML = html.join("");
  }

  function renderFlatRows(rows) {
    elements.body.innerHTML = rows.map(rowHtml).join("");
  }

  function formatTimeDelta(value) {
    const centiseconds = Math.abs(value) % 100;
    const totalSeconds = Math.floor(Math.abs(value) / 100);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60);
    const base = `${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
    return minutes > 0 ? `${minutes}:${base}` : base;
  }

  function renderProgress() {
    const filters = currentFilters();
    if (!filters.course || !selectedPerfs.length) {
      elements.progress.classList.remove("active");
      elements.progress.innerHTML = "";
      return;
    }

    const seasonBest = new Map();
    selectedPerfs.forEach((perf) => {
      if (perf.course !== filters.course) return;
      const current = seasonBest.get(perf.seasonYear);
      if (!current || perf.timeValue < current.timeValue) seasonBest.set(perf.seasonYear, perf);
    });
    const points = Array.from(seasonBest.values()).sort((a, b) => a.seasonYear - b.seasonYear);
    if (points.length < 2) {
      elements.progress.classList.remove("active");
      elements.progress.innerHTML = "";
      return;
    }

    const width = 920;
    const height = 220;
    const pad = { left: 44, right: 24, top: 24, bottom: 42 };
    const min = Math.min(...points.map((point) => point.timeValue));
    const max = Math.max(...points.map((point) => point.timeValue));
    const span = Math.max(1, max - min);
    const coords = points.map((point, index) => ({
      ...point,
      x: pad.left + (index * (width - pad.left - pad.right)) / (points.length - 1),
      y: pad.top + ((point.timeValue - min) * (height - pad.top - pad.bottom)) / span
    }));
    const path = coords.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
    const first = coords[0];
    const best = coords.find((point) => point.timeValue === min);
    const diff = first.timeValue - best.timeValue;
    const trend = diff > 0 ? `Progression ${formatTimeDelta(diff)}` : "Meilleur niveau d&egrave;s la premi&egrave;re saison";

    elements.progress.classList.add("active");
    elements.progress.innerHTML = `
      <div class="progress-head">
        <div><h2>Progression ${escapeHtml(courseLabel(filters.course))}</h2><span>Meilleure performance par saison</span></div>
        <div class="progress-actions">
          <span>${trend}</span>
          <button class="progress-reset-button" type="button" data-progress-reset>Retour aux MP</button>
        </div>
      </div>
      <svg class="progress-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Progression par saison">
        <line class="progress-axis" x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}"></line>
        <line class="progress-axis" x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${height - pad.bottom}"></line>
        <path class="progress-line" d="${path}"></path>
        ${coords.map((point) => `
          <circle class="progress-point${point === best ? " best" : ""}" cx="${point.x}" cy="${point.y}" r="4">
            <title>${escapeHtml(`${point.seasonYear} - ${point.time} - ${point.location || "Lieu non renseign\u00e9"}`)}</title>
          </circle>
          <text class="progress-time" x="${point.x}" y="${Math.max(14, point.y - 9)}" text-anchor="middle">${escapeHtml(point.time)}</text>
          <text class="progress-label" x="${point.x}" y="${height - 17}" text-anchor="middle">${escapeHtml(point.seasonYear)}</text>
        `).join("")}
      </svg>
      <div class="progress-list">
        ${coords.map((point) => `<span><strong>${escapeHtml(point.seasonYear)}</strong>${escapeHtml(point.time)}</span>`).join("")}
      </div>
    `;
  }

  function render() {
    if (!selectedSwimmer) {
      elements.title.textContent = "Performances du nageur";
      elements.status.textContent = "Recherchez puis s\u00e9lectionnez un nageur.";
      elements.body.innerHTML = `<tr class="pending-row"><td class="empty" colspan="6">Choisissez un nageur.</td></tr>`;
      elements.progress.classList.remove("active");
      elements.progress.innerHTML = "";
      return;
    }

    const filters = currentFilters();
    const rows = rowsForFilters();
    renderProgress();

    if (!rows.length) {
      elements.status.textContent = "Aucune performance ne correspond aux filtres.";
      elements.body.innerHTML = `<tr class="pending-row"><td class="empty" colspan="6">Aucune performance ne correspond aux filtres.</td></tr>`;
      return;
    }

    elements.status.textContent = `${rows.length} performance${rows.length > 1 ? "s" : ""} affich\u00e9e${rows.length > 1 ? "s" : ""}.`;
    if (filters.mode === "best" && !filters.course) {
      renderSectionedRows(rows);
    } else {
      renderFlatRows(rows);
    }
  }

  async function selectSwimmer(swimmer) {
    selectedSwimmer = swimmer;
    selectedPerfs = [];
    elements.search.value = displayName(swimmer);
    elements.suggestions.innerHTML = "";
    elements.title.textContent = displayName(swimmer);
    elements.status.textContent = "Chargement des performances...";
    elements.body.innerHTML = `<tr class="pending-row"><td class="empty" colspan="6">Chargement des performances...</td></tr>`;

    const chunk = await loadChunk(swimmer.chunk);
    await loadAdditionalData();
    const intranapPerfs = chunk[String(swimmer.id)] || [];
    const importedPerfs = additionalPerfs.filter((perf) => String(perf.swimmerId) === String(swimmer.id));
    selectedPerfs = [...intranapPerfs, ...importedPerfs]
      .sort((a, b) => String(b.date).localeCompare(a.date) || compareCourse(a, b));
    updateFilters(selectedPerfs);
    setSegmentValue(elements.displayMode, "best");
    elements.title.textContent = displayName(swimmer);
    elements.status.textContent = [
      swimmer.birthDate ? `N\u00e9(e) le ${formatDate(swimmer.birthDate)}` : "",
      swimmer.club,
      `${selectedPerfs.length} performance${selectedPerfs.length > 1 ? "s" : ""} bassin`
    ].filter(Boolean).join(" - ");
    render();

    const params = new URLSearchParams(window.location.search);
    params.set("id", swimmer.id);
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
    elements.card.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function init() {
    resetFilters();
    render();

    elements.search.addEventListener("input", () => {
      if (selectedSwimmer && normalize(elements.search.value) !== normalize(displayName(selectedSwimmer))) {
        selectedSwimmer = null;
        selectedPerfs = [];
        resetFilters();
        render();
      }
      searchSwimmers();
    });

    elements.suggestions.addEventListener("click", (event) => {
      const button = event.target.closest("[data-swimmer-id]");
      if (!button) return;
      const swimmer = findSwimmerById(button.dataset.swimmerId);
      selectSwimmer(swimmer).catch((error) => {
        elements.status.textContent = `Chargement impossible : ${error.message || error}`;
      });
    });

    elements.season.addEventListener("input", render);
    elements.course.addEventListener("input", render);
    elements.displayMode.querySelectorAll(".segment").forEach((button) => {
      button.addEventListener("click", () => {
        setSegmentValue(elements.displayMode, button.dataset.value);
        render();
      });
    });

    elements.progress.addEventListener("click", (event) => {
      const resetButton = event.target.closest("[data-progress-reset]");
      if (!resetButton) return;
      elements.course.value = "";
      setSegmentValue(elements.displayMode, "best");
      render();
      elements.card.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    elements.body.addEventListener("click", (event) => {
      const progressTrigger = event.target.closest("[data-progress-course]");
      if (progressTrigger) {
        event.preventDefault();
        event.stopPropagation();
        const course = progressTrigger.dataset.progressCourse || "";
        if (course) {
          elements.course.value = course;
          render();
          elements.progress.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        return;
      }

      const row = event.target.closest("tr");
      if (!row || row.classList.contains("section-row") || row.classList.contains("pending-row") || row.classList.contains("swimmer-splits-row")) return;
      const expanded = !row.classList.contains("expanded");
      row.classList.toggle("expanded", expanded);
      row.setAttribute("aria-expanded", expanded ? "true" : "false");
      const splitsRow = row.nextElementSibling;
      if (splitsRow?.classList.contains("swimmer-splits-row")) {
        splitsRow.setAttribute("aria-hidden", expanded ? "false" : "true");
      }
    });

    elements.body.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (event.target.closest("button, a, input, select, textarea")) return;
      const row = event.target.closest("tr");
      if (!row || row.classList.contains("section-row") || row.classList.contains("pending-row") || row.classList.contains("swimmer-splits-row")) return;
      event.preventDefault();
      row.click();
    });

    const directId = new URLSearchParams(window.location.search).get("id");
    if (directId) {
      const swimmer = findSwimmerById(directId);
      if (swimmer) selectSwimmer(swimmer).catch((error) => {
        elements.status.textContent = `Chargement impossible : ${error.message || error}`;
      });
    }

    loadAdditionalData().then(() => {
      if (elements.search.value) searchSwimmers();
      if (directId && !selectedSwimmer) {
        const swimmer = findSwimmerById(directId);
        if (swimmer) selectSwimmer(swimmer).catch((error) => {
          elements.status.textContent = `Chargement impossible : ${error.message || error}`;
        });
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})(window);
