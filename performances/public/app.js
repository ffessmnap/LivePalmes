let data = window.LIVEPALMES_RECORDS;
let records = data.records;
let franceRecords = data.franceRecords || [];
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
  tableHeaderRow: document.querySelector("thead tr"),
  recordsBody: document.querySelector("#recordsBody")
};

const styleSections = [
  ["SF", "Surface"],
  ["AP", "Apnée"],
  ["IS", "Immersion"],
  ["BI", "Bi-palmes"],
  ["RELAY_CLUB", "Relais Club"],
  ["RELAY_FRANCE", "Relais Équipe de France"]
];

function formatDate(value) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function birthYearLabel(value) {
  const match = String(value || "").match(/^(\d{4})/);
  return match ? match[1] : "";
}

function swimmerNameHtml(record) {
  const year = birthYearLabel(record?.birthDate);
  const name = escapeHtml(record?.swimmer || "-");
  return year ? `${name} <small class="performance-birth-year">(${year})</small>` : name;
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

function isRelayRecord(record) {
  return String(record?.style || "").startsWith("RELAY");
}

function isMixedRelayRecord(record) {
  return isRelayRecord(record) && (record.mixedRelay === true || isMasterRelayRecord(record) || /(?:BIX|SB)$/.test(String(record.course || "")));
}

function participantLabel(record) {
  if (!isRelayRecord(record)) return swimmerLabel(record.sex);
  return record.sex === "F" && !isMixedRelayRecord(record) ? "Relayeuses" : "Relayeurs";
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
    : (data.filters.courses || []);
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

function recordTieKey(record) {
  return [
    "MPF",
    record.sex || "",
    record.category || "",
    record.style || "",
    record.course || "",
    String(record.time || "").trim()
  ].join("|");
}

function isTieRecord(record, rows) {
  const time = String(record.time || "").trim();
  if (!time || isPlaceholderTime(time)) return false;
  const key = recordTieKey(record);
  return rows.filter((item) => recordTieKey(item) === key).length > 1;
}

function franceRecordTypeForMpf(record) {
  if (record.category === "S") return "RF";
  if (record.category === "J") return "RFJ";
  return "";
}

function recordComparableValue(record) {
  const value = Number(record?.value);
  return Number.isFinite(value) ? value : String(record?.rawTime || record?.time || "").trim();
}

function sameRecordKind(record, franceRecord) {
  const recordIsRelay = isRelayRecord(record);
  const franceRecordIsRelay = isRelayRecord(franceRecord);
  if (recordIsRelay !== franceRecordIsRelay) return false;
  return !recordIsRelay || record.style === franceRecord.style;
}

function matchingFranceRecord(record) {
  const recordType = franceRecordTypeForMpf(record);
  if (!recordType || isPlaceholderTime(record.time)) return null;
  const value = recordComparableValue(record);
  return franceRecords.find((franceRecord) =>
    franceRecord.recordType === recordType &&
    franceRecord.sex === record.sex &&
    franceRecord.category === record.category &&
    franceRecord.course === record.course &&
    sameRecordKind(record, franceRecord) &&
    recordComparableValue(franceRecord) === value
  ) || null;
}

function renderFranceRecordBadge(record) {
  const franceRecord = matchingFranceRecord(record);
  if (!franceRecord) return "";
  const label = franceRecord.recordType === "RFJ" ? "RFJ" : "RF";
  const title = label === "RFJ"
    ? "Cette MPF est aussi le Record de France Junior"
    : "Cette MPF est aussi le Record de France";
  return `<span class="record-france-badge" title="${title}" aria-label="${title}">${franceFlag()}<span>${label}</span></span>`;
}

function renderTimeContent(record, extraBadge = "") {
  return `${escapeHtml(record.time || "")}${renderFranceRecordBadge(record)}${extraBadge}`;
}

function compareRecordRows(a, b) {
  return (window.LivePalmesRecordPlaceholders?.compareCourses
    ? window.LivePalmesRecordPlaceholders.compareCourses(a.course, b.course)
    : String(a.course || "").localeCompare(String(b.course || ""), "fr-FR"))
    || (Number(a.value ?? 999999999) - Number(b.value ?? 999999999))
    || String(a.date || "").localeCompare(String(b.date || ""), "fr-FR")
    || String(a.swimmer || "").localeCompare(String(b.swimmer || ""), "fr-FR")
    || String(a.key || "").localeCompare(String(b.key || ""), "fr-FR");
}

function relaySwimmerNames(value) {
  const cleaned = String(value || "").replace(/\s+/g, " ").trim();
  if (!cleaned || cleaned === "À établir") return [];
  return cleaned.split(/\s*\/\s*/).map((part) => formatRelaySwimmerName(part.trim())).filter(Boolean);
}

function formatRelayInitials(value) {
  return String(value || "")
    .replace(/\./g, "")
    .replace(/\s+/g, "")
    .split("")
    .filter(Boolean)
    .map((letter) => `${letter.toLocaleUpperCase("fr-FR")}.`)
    .join("");
}

function formatRelaySwimmerName(value) {
  const cleaned = String(value || "")
    .replace(/\s+/g, " ")
    .replace(/^[/-]+|[/-]+$/g, "")
    .trim();
  if (!cleaned || cleaned.toLocaleLowerCase("fr-FR").includes("tablir")) return cleaned;

  const compactInitials = cleaned.match(/^((?:\p{L}\.){1,4})\s+(.+)$/u);
  if (compactInitials) {
    return `${formatRelayInitials(compactInitials[1])} ${compactInitials[2].toLocaleUpperCase("fr-FR")}`;
  }

  const gluedInitial = cleaned.match(/^(\p{L})\.\s*(\p{L}{2,}.*)$/u);
  if (gluedInitial) {
    return `${formatRelayInitials(gluedInitial[1])} ${gluedInitial[2].toLocaleUpperCase("fr-FR")}`;
  }

  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const trailingInitial = tokens.length >= 2 && /^\p{L}\.?$/u.test(tokens[tokens.length - 1]);
  if (trailingInitial && tokens.slice(0, -1).some((token) => token.replace(/[.'-]/g, "").length > 1)) {
    const initial = tokens.pop();
    return `${formatRelayInitials(initial)} ${tokens.join(" ").toLocaleUpperCase("fr-FR")}`;
  }

  const trailingFirstName = tokens.length >= 2 &&
    tokens.slice(0, -1).every((token) => token === token.toLocaleUpperCase("fr-FR") && /\p{L}/u.test(token)) &&
    tokens[tokens.length - 1] !== tokens[tokens.length - 1].toLocaleUpperCase("fr-FR");
  if (trailingFirstName) {
    const firstName = tokens.pop();
    const initial = firstName.match(/\p{L}/u)?.[0] || "";
    return `${formatRelayInitials(initial)} ${tokens.join(" ").toLocaleUpperCase("fr-FR")}`;
  }

  const initials = [];
  while (tokens.length && /^\p{L}\.?$/u.test(tokens[0])) {
    initials.push(tokens.shift());
  }
  if (initials.length && tokens.length) {
    return `${formatRelayInitials(initials.join(""))} ${tokens.join(" ").toLocaleUpperCase("fr-FR")}`;
  }
  if (tokens.length < 2) return cleaned.toLocaleUpperCase("fr-FR");

  const firstName = tokens.shift();
  const initial = firstName.match(/\p{L}/u)?.[0] || "";
  return `${formatRelayInitials(initial)} ${tokens.join(" ").toLocaleUpperCase("fr-FR")}`;
}

function renderSwimmerCell(record) {
  if (!isRelayRecord(record)) {
    const mobileMeta = [record.club, record.location, formatDate(record.date)]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(" - ");
    return `
      <strong>${swimmerNameHtml(record)}</strong>
      ${mobileMeta ? `<small class="record-mobile-meta">${escapeHtml(mobileMeta)}</small>` : ""}
      ${splitMetaHtml(record)}
    `;
  }

  const names = relaySwimmerNames(record.swimmer);
  const summary = record.style === "RELAY_FRANCE" ? "FFESSM" : (record.club || record.swimmer || "-");
  const mobileMeta = [record.location, record.date ? formatDate(record.date) : ""]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" - ");
  return `
    <strong class="relay-summary">${escapeHtml(summary)}</strong>
    ${names.length ? `<div class="relay-swimmers">${names.map((name) => `<span>${escapeHtml(name)}</span>`).join("")}</div>` : `<strong>${escapeHtml(record.swimmer || "À établir")}</strong>`}
    ${mobileMeta ? `<small class="record-mobile-meta">${escapeHtml(mobileMeta)}</small>` : ""}
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

function updateTableHeader(isMasterRelayView, sex) {
  document.body.classList.toggle("mpf-master-relay-view", isMasterRelayView);
  if (!elements.tableHeaderRow) return;
  elements.tableHeaderRow.innerHTML = isMasterRelayView
    ? `
      <th>Course</th>
      <th>Catégorie</th>
      <th>Temps</th>
      <th id="swimmerHeader">Equipe</th>
      <th>Club</th>
      <th>Lieu</th>
      <th>Date</th>
    `
    : `
      <th>Course</th>
      <th>Temps</th>
      <th id="swimmerHeader">${swimmerLabel(sex)}</th>
      <th>Club</th>
      <th>Lieu</th>
      <th>Date</th>
    `;
  elements.swimmerHeader = document.querySelector("#swimmerHeader");
}

function applyFilters() {
  const filters = currentFilters();
  updateCategoryOptions(selectedSegmentValue(elements.sexFilter));
  updateSexControlState(filters.category === MASTER_RELAY_CATEGORY);
  updateCourseOptions(filters);
  updateTitle(filters);
  updateTableHeader(filters.category === MASTER_RELAY_CATEGORY, filters.sex);
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
    const sectionRecords = filtered.filter((record) => record.style === style).sort(compareRecordRows);
    if (!sectionRecords.length) continue;

    rows.push(`
      <tr class="section-row">
        <td colspan="6">${label}</td>
      </tr>
    `);

    rows.push(...sectionRecords.map((record) => {
      const chronoLabel = record.chrono === "E" ? "ELEC" : record.chrono === "M" ? "MAN" : "";
      const badges = [record.bassin ? `<b>${record.bassin} m</b>` : "", chronoLabel ? `<b>${chronoLabel}</b>` : ""].filter(Boolean).join(" - ");
      const mobileMeta = [record.club, record.location, formatDate(record.date)]
        .map((value) => String(value || "").trim())
        .filter(Boolean)
        .join(" · ");
      const rowClasses = [`sex-${record.sex.toLowerCase()}`];
      if (isRelayRecord(record)) rowClasses.push("relay-record");
      if (isMixedRelayRecord(record)) rowClasses.push("relay-mixed");
      return `
        <tr class="${rowClasses.join(" ")}" tabindex="0" role="button" aria-expanded="false">
          <td data-label="Course">
            <strong>${record.courseShortLabel}</strong>
          </td>
          <td class="${timeCellClass(record.time)}" data-label="Temps">${renderTimeContent(record)}</td>
          <td data-label="${participantLabel(record)}">${renderSwimmerCell(record)}</td>
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
    elements.recordsBody.innerHTML = `<tr class="pending-row"><td class="empty" colspan="6">Choisissez une cat&eacute;gorie.</td></tr>`;
  }
}

function renderMasterRelayTeam(record) {
  return renderRelayNames(record);
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
          <td data-label="Course"><span class="master-relay-course-cell">${escapeHtml(record.courseShortLabel || record.course || "-")}</span></td>
          <td data-label="Catégorie"><strong class="master-relay-category">${escapeHtml(masterRelayCategoryCode(record.category))}</strong></td>
          <td class="${timeCellClass(record.time)}" data-label="Temps">${renderTimeContent(record)}</td>
          <td data-label="Équipe">${renderMasterRelayTeam(record)}</td>
          <td data-label="Club"><strong class="relay-summary">${escapeHtml(record.club || "-")}</strong></td>
          <td data-label="Lieu">${escapeHtml(record.location || "-")}</td>
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
  franceRecords = data.franceRecords || [];
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
