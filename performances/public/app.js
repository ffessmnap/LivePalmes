let data = window.LIVEPALMES_RECORDS;
let records = data.records;
const MASTER_RELAY_CATEGORY = window.LivePalmesRecordPlaceholders?.masterRelayCategory || "MASTER_RELAYS_MIXED";
const MASTER_RELAY_LABEL = window.LivePalmesRecordPlaceholders?.masterRelayLabel || "Relais Masters mixtes";
const MASTER_RELAY_COURSES = ["4X50SF", "4X100SB"];

const elements = {
  recordCount: document.querySelector("#recordCount"),
  sourceDate: document.querySelector("#sourceDate"),
  searchInput: document.querySelector("#searchInput"),
  sexFilter: document.querySelector("#sexFilter"),
  courseFilter: document.querySelector("#courseFilter"),
  categoryFilter: document.querySelector("#categoryFilter"),
  title: document.querySelector("#mpfTitle"),
  cutoffText: document.querySelector("#cutoffText"),
  swimmerHeader: document.querySelector("#swimmerHeader"),
  recordsBody: document.querySelector("#recordsBody")
};

const styleSections = [
  ["SF", "Surface"],
  ["AP", "Apnée"],
  ["IS", "Immersion"],
  ["BI", "Bi-palmes"]
];

function formatDate(value) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
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
    button.classList.toggle("active", button.dataset.value === value);
    button.setAttribute("aria-pressed", button.dataset.value === value ? "true" : "false");
  });
}

function updateSexControlState(disabled) {
  elements.sexFilter.querySelectorAll(".segment").forEach((button) => {
    button.disabled = disabled;
    button.setAttribute("aria-disabled", disabled ? "true" : "false");
  });
  elements.sexFilter.classList.toggle("is-disabled", disabled);
}

function sexLabel(value) {
  return value === "F" ? "Femmes" : "Hommes";
}

function swimmerLabel(sex) {
  return sex === "F" ? "Nageuse" : "Nageur";
}

function categoryLabel(value) {
  if (value === MASTER_RELAY_CATEGORY) return MASTER_RELAY_LABEL;
  return records.find((record) => record.category === value)?.categoryLabel ?? value;
}

function categoryOptionLabel(category, sex = selectedSegmentValue(elements.sexFilter)) {
  if (category === MASTER_RELAY_CATEGORY) return MASTER_RELAY_LABEL;
  const female = sex !== "M";
  const labels = {
    P: female ? "FPO - Poussine" : "HPO - Poussin",
    B: female ? "FBE - Benjamine" : "HBE - Benjamin",
    M: female ? "FMI - Minime" : "HMI - Minime",
    C: female ? "FCA - Cadette" : "HCA - Cadet",
    J: female ? "FJU - Junior" : "HJU - Junior",
    S: female ? "FSE - Senior" : "HSE - Senior",
    "M30+": female ? "F30+ - Senior 30+" : "H30+ - Senior 30+",
    "M40+": female ? "F40+ - Master 40+" : "H40+ - Master 40+",
    "M50+": female ? "F50+ - Master 50+" : "H50+ - Master 50+",
    "M60+": female ? "F60+ - Master 60+" : "H60+ - Master 60+",
    "M70+": female ? "F70+ - Master 70+" : "H70+ - Master 70+",
    "M80+": female ? "F80+ - Master 80+" : "H80+ - Master 80+"
  };
  return labels[category] ?? category;
}

function categoryCode(record) {
  if (isMasterRelayRecord(record)) return masterRelayCategoryCode(record.category);
  const prefix = record.sex === "F" ? "F" : "H";
  const codes = {
    P: `${prefix}PO`,
    B: `${prefix}BE`,
    M: `${prefix}MI`,
    C: `${prefix}CA`,
    J: `${prefix}JU`,
    S: `${prefix}SE`,
    "M30+": `${prefix}30+`,
    "M40+": `${prefix}40+`,
    "M50+": `${prefix}50+`,
    "M60+": `${prefix}60+`,
    "M70+": `${prefix}70+`,
    "M80+": `${prefix}80+`
  };
  return codes[record.category] ?? record.category;
}

function courseLabel(value) {
  return records.find((record) => record.course === value)?.courseLabel ?? value;
}

function currentFilters() {
  const rawCategory = elements.categoryFilter.value;
  const [categorySex, category] = rawCategory.includes("|") ? rawCategory.split("|") : ["", rawCategory];
  const sex = selectedSegmentValue(elements.sexFilter);

  return {
    query: elements.searchInput?.value.trim().toLocaleLowerCase("fr-FR") ?? "",
    sex: category === MASTER_RELAY_CATEGORY ? "" : sex || categorySex,
    course: elements.courseFilter.value,
    category
  };
}

function categoryName(category, sex) {
  if (category === MASTER_RELAY_CATEGORY) return MASTER_RELAY_LABEL;
  const female = sex === "F";
  const labels = {
    P: female ? "Poussines" : "Poussins",
    B: female ? "Benjamines" : "Benjamins",
    M: "Minimes",
    C: female ? "Cadettes" : "Cadets",
    J: female ? "Juniors Femmes" : "Juniors Hommes",
    S: female ? "Seniors Femmes" : "Seniors Hommes",
    "M30+": "Senior 30+",
    "M40+": "Master 40+",
    "M50+": "Master 50+",
    "M60+": "Master 60+",
    "M70+": "Master 70+",
    "M80+": "Master 80+"
  };
  return labels[category] ?? category;
}

function updateTitle(filters) {
  if (!elements.title) return;
  const category = filters.category ? categoryName(filters.category, filters.sex) : "";
  const sex = !category && filters.sex ? (filters.sex === "F" ? "Femmes" : "Hommes") : "";
  const context = [category, sex].filter(Boolean).join(" - ");
  elements.title.textContent = context
    ? `MPF ${context}`
    : "MPF";
}

function updateCourseOptions(filters = currentFilters()) {
  const current = elements.courseFilter.value;
  const values = filters.category === MASTER_RELAY_CATEGORY
    ? MASTER_RELAY_COURSES
    : (data.filters.courses || []).filter((course) => !MASTER_RELAY_COURSES.includes(course));
  addOptions(elements.courseFilter, values, "Toutes", courseLabel);
  elements.courseFilter.value = values.includes(current) ? current : "";
}

function selectDefaultCategoryForSex(sex) {
  if (!sex) return;
  const values = Array.from(elements.categoryFilter.options).map((option) => option.value);
  if (values.includes("S")) elements.categoryFilter.value = "S";
}

function matchesSearch(record, query) {
  if (!query) return true;
  return [
    record.course,
    record.courseLabel,
    record.category,
    record.categoryLabel,
    record.swimmer,
    record.club,
    record.location
  ]
    .join(" ")
    .toLocaleLowerCase("fr-FR")
    .includes(query);
}

function isMasterRelayRecord(record) {
  return window.LivePalmesRecordPlaceholders?.isMasterRelayRow
    ? window.LivePalmesRecordPlaceholders.isMasterRelayRow(record)
    : /^[RX]\d+$/.test(record?.category || "") && String(record?.style || "").startsWith("RELAY");
}

function masterRelayCategoryCode(category) {
  return String(category || "").replace(/^R(?=\d+$)/, "X");
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

function isPlaceholderTime(value) {
  const normalized = String(value || "").trim().toLocaleLowerCase("fr-FR");
  return !normalized || normalized === "-" || normalized.includes("tablir");
}

function timeCellClass(value) {
  return `time${isPlaceholderTime(value) ? " time-placeholder" : ""}`;
}

function relaySwimmerNames(value) {
  const cleaned = String(value || "").replace(/\s+/g, " ").trim();
  if (!cleaned || cleaned === "À établir") return [];
  return cleaned.split(/\s*\/\s*/).map((part) => part.trim()).filter(Boolean);
}

function renderSwimmerCell(record) {
  if (!isMasterRelayRecord(record)) {
    const mobileMeta = [record.club, record.location, formatDate(record.date)]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(" - ");
    return `
      <strong>${escapeHtml(record.swimmer)}</strong>
      ${mobileMeta ? `<small class="record-mobile-meta">${escapeHtml(mobileMeta)}</small>` : ""}
      ${splitMetaHtml(record)}
    `;
  }

  const names = relaySwimmerNames(record.swimmer);
  return `
    <strong class="relay-summary">${escapeHtml(record.club || record.swimmer || "-")}</strong>
    ${names.length ? `<div class="relay-swimmers">${names.map((name) => `<span>${escapeHtml(name)}</span>`).join("")}</div>` : ""}
    ${splitMetaHtml(record)}
  `;
}

function splitDistanceLabel(split) {
  const codeDistances = { TI1: 100, TI2: 200, TI3: 400, TI4: 800 };
  const distance = split?.distance || codeDistances[String(split?.code || "").toUpperCase()] || Number(String(split?.code || "").replace(/\D/g, "")) || "";
  return distance ? `${distance} m` : "Passage";
}

function splitMetaHtml(record) {
  const splits = Array.isArray(record?.intermediateTimes) ? record.intermediateTimes.filter((split) => split?.time) : [];
  if (!splits.length) return "";
  return `
    <small class="record-split-meta">
      <span>Passages</span>
      ${splits.map((split) => `
        <b class="record-split-chip"><span>${escapeHtml(splitDistanceLabel(split))}</span><strong>${escapeHtml(split.time)}</strong></b>
      `).join("")}
    </small>
  `;
}

function applyFilters() {
  const filters = currentFilters();
  updateCategoryOptions(selectedSegmentValue(elements.sexFilter));
  updateSexControlState(filters.category === MASTER_RELAY_CATEGORY);
  updateCourseOptions(filters);
  updateTitle(filters);
  if (elements.swimmerHeader) {
    elements.swimmerHeader.textContent = filters.category === MASTER_RELAY_CATEGORY ? "Equipe" : swimmerLabel(filters.sex);
  }
  const filtered = records.filter((record) => {
    if (filters.category === MASTER_RELAY_CATEGORY) {
      return (
        isMasterRelayRecord(record) &&
        matchesSearch(record, filters.query) &&
        (!filters.course || record.course === filters.course)
      );
    }

    return (
      Boolean(filters.sex) &&
      !isMasterRelayRecord(record) &&
      matchesSearch(record, filters.query) &&
      (!filters.sex || record.sex === filters.sex) &&
      (!filters.course || record.course === filters.course) &&
      (!filters.category || record.category === filters.category)
    );
  });

  renderRecords(filtered);
}

function updateCategoryOptions(sex) {
  const current = elements.categoryFilter.value;
  if (!sex) {
    const values = ["F", "M"].flatMap((valueSex) =>
      data.filters.categories
        .filter((category) => category !== MASTER_RELAY_CATEGORY)
        .filter((category) => records.some((record) => record.sex === valueSex && record.category === category))
        .map((category) => `${valueSex}|${category}`)
    );
    if (records.some(isMasterRelayRecord)) values.push(MASTER_RELAY_CATEGORY);
    addOptions(elements.categoryFilter, values, "Toutes", (value) => {
      if (value === MASTER_RELAY_CATEGORY) return MASTER_RELAY_LABEL;
      const [optionSex, category] = value.split("|");
      return categoryOptionLabel(category, optionSex);
    });
    elements.categoryFilter.value = values.includes(current) ? current : "";
    return;
  }

  const values = data.filters.categories
    .filter((category) => category !== MASTER_RELAY_CATEGORY)
    .filter((category) => records.some((record) => record.sex === sex && record.category === category));
  if (records.some(isMasterRelayRecord)) values.push(MASTER_RELAY_CATEGORY);
  addOptions(elements.categoryFilter, values, "Toutes", (value) => categoryOptionLabel(value, sex));
  elements.categoryFilter.value = values.includes(current) ? current : "";
}

function renderRecords(filtered) {
  if (currentFilters().category === MASTER_RELAY_CATEGORY) {
    renderMasterRelayRecords(filtered);
    return;
  }

  const rows = [];

  for (const [style, label] of styleSections) {
    const sectionRecords = filtered.filter((record) => record.style === style);
    if (!sectionRecords.length) continue;

    rows.push(`
      <tr class="section-row">
        <td colspan="7">${label}</td>
      </tr>
    `);

    rows.push(...sectionRecords.map((record) => {
      const chronoLabel = record.chrono === "E" ? "ELEC" : record.chrono === "M" ? "MAN" : "";
      const badges = [record.bassin ? `<b>${record.bassin} m</b>` : "", chronoLabel ? `<b>${chronoLabel}</b>` : ""].filter(Boolean).join(" - ");
      const mobileMeta = [record.club, record.location, formatDate(record.date)]
        .map((value) => String(value || "").trim())
        .filter(Boolean)
        .join(" · ");
      return `
        <tr class="sex-${record.sex.toLowerCase()}" tabindex="0" role="button" aria-expanded="false">
          <td data-label="Course">
            <strong>${record.courseShortLabel}</strong>
          </td>
          <td data-label="Catégorie">
            <strong>${categoryCode(record)}</strong>
          </td>
          <td class="${timeCellClass(record.time)}" data-label="Temps">${record.time}</td>
          <td data-label="${swimmerLabel(record.sex)}">
            <strong>${record.swimmer}</strong>
            ${mobileMeta ? `<small class="record-mobile-meta">${mobileMeta}</small>` : ""}
            ${splitMetaHtml(record)}
          </td>
          <td data-label="Club">${record.club}</td>
          <td data-label="Lieu">
            <div class="location-line">
              <strong>${record.location || "-"}</strong>
              ${badges ? `<span class="meta-badges">${badges}</span>` : ""}
            </div>
          </td>
          <td data-label="Date">${formatDate(record.date)}</td>
        </tr>
      `;
    }));
  }

  elements.recordsBody.innerHTML = rows.join("");

  if (!filtered.length) {
    elements.recordsBody.innerHTML = `<tr class="pending-row"><td class="empty" colspan="7">Choisissez une cat&eacute;gorie.</td></tr>`;
  }
}

function renderMasterRelayTeam(record) {
  const teamName = record.club || "-";
  const meta = [record.location, formatDate(record.date)]
    .map((value) => String(value || "").trim())
    .filter((value) => value && value !== "-")
    .join(" - ");
  return `
    <strong class="relay-summary">${escapeHtml(teamName)}</strong>
    ${meta ? `<small class="master-relay-meta">${escapeHtml(meta)}</small>` : ""}
  `;
}

function franceFlag() {
  return `<span class="france-flag" aria-hidden="true"></span>`;
}

function renderRelayNames(record) {
  const names = relaySwimmerNames(record.swimmer);
  if (!names.length) return `<strong>${escapeHtml(record.swimmer || "À établir")}</strong>`;
  return `<div class="relay-swimmers">${names.map((name) => `<span>${escapeHtml(name)}</span>`).join("")}</div>`;
}

function renderMasterRelayRecords(filtered) {
  const rows = [];
  const sections = [
    ["RELAY_CLUB", "Relais Club", ""],
    ["RELAY_FRANCE", "Relais Équipe fédérale", "FFESSM"]
  ];
  const courses = [
    ["4X50SF", "4x50 SF mixte"],
    ["4X100SB", "4x100 SB mixte"]
  ];

  for (const [style, label, tag] of sections) {
    rows.push(`
      <tr class="section-row master-relay-family-row">
        <td colspan="7">
          <div class="master-relay-family">
            <strong>${style === "RELAY_FRANCE" ? franceFlag() : ""}${label}</strong>
            ${tag ? `<span>${tag}</span>` : ""}
          </div>
        </td>
      </tr>
    `);

    for (const [course, courseTitle] of courses) {
      const sectionRecords = filtered
        .filter((record) => record.style === style && record.course === course)
        .sort((a, b) => String(a.category).localeCompare(String(b.category), "fr-FR", { numeric: true }));
      if (!sectionRecords.length) continue;

      rows.push(`
        <tr class="section-row master-relay-course-row">
          <td colspan="7">
            <div class="master-relay-course">
              <strong>${courseTitle}</strong>
              <span>Catégories X140 à X260</span>
            </div>
          </td>
        </tr>
      `);
      rows.push(...sectionRecords.map((record) => `
        <tr class="sex-${record.sex.toLowerCase()} relay-record relay-mixed master-relay-data-row" tabindex="0" role="button" aria-expanded="false">
          <td data-label="Catégorie"><strong class="master-relay-category">${escapeHtml(masterRelayCategoryCode(record.category))}</strong></td>
          <td class="${timeCellClass(record.time)}" data-label="Temps">${escapeHtml(record.time)}</td>
          <td data-label="Équipe">${renderMasterRelayTeam(record)}</td>
          <td colspan="3" data-label="Relayeurs">${renderRelayNames(record)}</td>
          <td data-label="Date">${formatDate(record.date)}</td>
        </tr>
      `));
    }
  }

  elements.recordsBody.innerHTML = rows.join("");

  if (!filtered.length) {
    elements.recordsBody.innerHTML = `<tr class="pending-row"><td class="empty" colspan="7">Aucun relais master ne correspond aux filtres.</td></tr>`;
  }
}

function refreshData(nextData) {
  data = nextData || window.LIVEPALMES_RECORDS || data;
  records = data.records || [];
  if (elements.recordCount) elements.recordCount.textContent = records.length.toLocaleString("fr-FR");
  if (elements.sourceDate) elements.sourceDate.textContent = formatDate(data.sourceDate);
  elements.cutoffText.textContent = data.updatedAt
    ? `Dernière mise à jour : ${formatDate(String(data.updatedAt).slice(0, 10))}`
    : "Dernière mise à jour : 25 mai 2026";
  updateCourseOptions(currentFilters());
  updateCategoryOptions(selectedSegmentValue(elements.sexFilter));
}

function initPage() {
  refreshData(data);
  updateCategoryOptions("");
  setSegmentValue(elements.sexFilter, "");

  [elements.searchInput, elements.courseFilter]
    .filter(Boolean)
    .forEach((element) => element.addEventListener("input", applyFilters));

  elements.categoryFilter.addEventListener("input", () => {
    const rawCategory = elements.categoryFilter.value;
    if (rawCategory.includes("|")) {
      const [sex, category] = rawCategory.split("|");
      setSegmentValue(elements.sexFilter, sex);
      updateCategoryOptions(sex);
      elements.categoryFilter.value = category;
    } else if (rawCategory === MASTER_RELAY_CATEGORY) {
      setSegmentValue(elements.sexFilter, "");
      updateCategoryOptions("");
      elements.categoryFilter.value = MASTER_RELAY_CATEGORY;
      updateSexControlState(true);
    }
    elements.courseFilter.value = "";
    updateCourseOptions(currentFilters());
    applyFilters();
  });

  elements.sexFilter.querySelectorAll(".segment").forEach((button) => {
    button.addEventListener("click", () => {
      if (currentFilters().category === MASTER_RELAY_CATEGORY) return;
      const { category } = currentFilters();
      setSegmentValue(elements.sexFilter, button.dataset.value);
      updateCategoryOptions(button.dataset.value);
      elements.categoryFilter.value = category && records.some((record) => record.sex === button.dataset.value && record.category === category) ? category : "";
      if (!category) selectDefaultCategoryForSex(button.dataset.value);
      applyFilters();
    });
  });

  elements.recordsBody.addEventListener("click", (event) => {
    const row = event.target.closest("tr");
    if (!row || row.classList.contains("section-row") || row.classList.contains("pending-row")) return;
    const expanded = !row.classList.contains("expanded");
    row.classList.toggle("expanded", expanded);
    row.setAttribute("aria-expanded", expanded ? "true" : "false");
  });

  elements.recordsBody.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const row = event.target.closest("tr");
    if (!row || row.classList.contains("section-row") || row.classList.contains("pending-row")) return;
    event.preventDefault();
    row.click();
  });

  window.addEventListener("livepalmes:performance-data-updated", (event) => {
    refreshData(event.detail);
    applyFilters();
  });

  applyFilters();
}

(async function start() {
  if (window.LivePalmesPerformanceStore?.loadData) {
    refreshData(await window.LivePalmesPerformanceStore.loadData());
    window.LIVEPALMES_RECORDS = data;
  }
  initPage();
})();
