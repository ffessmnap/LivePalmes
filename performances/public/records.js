let data = window.LIVEPALMES_RECORDS;
let records = normalizeMixedRelayRecords(data.franceRecords || []);

const elements = {
  rfTypeFilter: document.querySelector("#rfTypeFilter"),
  courseFilter: document.querySelector("#courseFilter"),
  tableTitle: document.querySelector("#tableTitle"),
  cutoffText: document.querySelector("#cutoffText"),
  swimmerHeader: document.querySelector("#swimmerHeader"),
  recordsBody: document.querySelector("#recordsBody")
};

const titles = {
  "RFJ|M": "Records de France Juniors Hommes",
  "RFJ|F": "Records de France Juniors Femmes",
  "RF|M": "Records de France Hommes",
  "RF|F": "Records de France Femmes"
};

const rubricOrder = [
  ["RFJ", "M"],
  ["RFJ", "F"],
  ["RF", "M"],
  ["RF", "F"]
];

const styleSections = [
  ["SF", "Surface"],
  ["AP", "Apnée"],
  ["IS", "Immersion"],
  ["BI", "Bi-palmes"],
  ["RELAY_CLUB", "Relais Club"],
  ["RELAY_FRANCE", "Relais France"]
];

function franceFlag() {
  return `<span class="france-flag" aria-hidden="true"></span>`;
}

function relaySectionLabel(style, label) {
  return style === "RELAY_FRANCE" ? `${franceFlag()}<span>${label}</span>` : label;
}

const relayCourseOrder = ["4X50SF", "4X100SF", "4X200SF", "4X100SB", "4X100BIX"];
const individualCourseOrder = ["50SF", "100SF", "200SF", "400SF", "800SF", "1500SF", "50AP", "100IS", "200IS", "400IS", "50BI", "100BI", "200BI", "400BI"];
const courseOrder = new Map([...individualCourseOrder, ...relayCourseOrder].map((course, index) => [course, index]));

function formatDate(value) {
  if (!value) return "-";
  if (value.includes("/")) return value;
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

function courseLabel(value) {
  if (String(value).endsWith("BIX")) return String(value).replace(/^4X(\d+)BIX$/, "4x$1 Bi-palmes mixte");
  if (String(value).endsWith("SB")) return String(value).replace(/^4X(\d+)SB$/, "4x$1 Surface/Bi-palmes mixte");
  return records.find((record) => record.course === value)?.courseLabel ?? value;
}

function compareCourse(a, b) {
  if (window.LivePalmesRecordPlaceholders?.compareCourses) {
    return window.LivePalmesRecordPlaceholders.compareCourses(a, b);
  }
  return (courseOrder.get(a) ?? 999) - (courseOrder.get(b) ?? 999) || String(a).localeCompare(String(b), "fr-FR");
}

function compareRecordRows(a, b) {
  return compareCourse(a.course, b.course)
    || (Number(a.value ?? 999999999) - Number(b.value ?? 999999999))
    || String(a.date || "").localeCompare(String(b.date || ""), "fr-FR")
    || String(a.swimmer || "").localeCompare(String(b.swimmer || ""), "fr-FR")
    || String(a.key || "").localeCompare(String(b.key || ""), "fr-FR");
}

function isMixedRelayRecord(record) {
  return String(record?.style || "").startsWith("RELAY") && /(?:SB|BIX)$/.test(String(record?.course || ""));
}

function mixedRelayPairKey(record) {
  return [
    record.recordType || "",
    record.style || "",
    record.course || ""
  ].join("|");
}

function mixedRelayValue(record) {
  const value = Number(record?.value);
  return Number.isFinite(value) ? value : 999999999;
}

function normalizeMixedRelayRecords(rows) {
  const groups = new Map();
  rows.filter(isMixedRelayRecord).forEach((record) => {
    const key = mixedRelayPairKey(record);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  });

  const canonical = new Map();
  groups.forEach((items, key) => {
    canonical.set(key, items.slice().sort((a, b) =>
      mixedRelayValue(a) - mixedRelayValue(b)
      || String(a.date || "").localeCompare(String(b.date || ""), "fr-FR")
      || String(a.key || "").localeCompare(String(b.key || ""), "fr-FR")
    )[0]);
  });

  return rows.map((record) => {
    if (!isMixedRelayRecord(record)) return record;
    const best = canonical.get(mixedRelayPairKey(record));
    if (!best) return record;
    return {
      ...best,
      key: record.key,
      sex: record.sex,
      recordType: record.recordType,
      recordTypeLabel: record.recordTypeLabel,
      category: record.category,
      categoryLabel: record.categoryLabel
    };
  });
}

function activeSegment() {
  return elements.rfTypeFilter.querySelector(".segment.active");
}

function setActiveSegment(button) {
  elements.rfTypeFilter.querySelectorAll(".segment").forEach((segment) => {
    const active = segment === button;
    segment.classList.toggle("active", active);
    segment.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function currentFilters() {
  const segment = activeSegment();
  return {
    recordType: segment?.dataset.type || "",
    sex: segment?.dataset.sex || "",
    course: elements.courseFilter.value
  };
}

function swimmerColumnLabel(sex) {
  return sex === "F" ? "Nageuse" : "Nageur";
}

function applyFilters() {
  const filters = currentFilters();
  if (elements.swimmerHeader) elements.swimmerHeader.textContent = swimmerColumnLabel(filters.sex);
  if (!filters.recordType || !filters.sex) {
    elements.tableTitle.textContent = "Sélectionnez une rubrique";
    elements.recordsBody.innerHTML = "";
    return;
  }

  const filtered = records.filter((record) => {
    return (
      record.recordType === filters.recordType &&
      record.sex === filters.sex &&
      (!filters.course || record.course === filters.course)
    );
  });

  elements.tableTitle.textContent = filters.course
    ? `${titles[`${filters.recordType}|${filters.sex}`]} · ${courseLabel(filters.course)}`
    : titles[`${filters.recordType}|${filters.sex}`];
  renderRecords(filtered);
}

function renderCourseRecords(filtered) {
  const rows = [];

  for (const [recordType, sex] of rubricOrder) {
    const sectionRecords = filtered
      .filter((record) => record.recordType === recordType && record.sex === sex)
      .sort(compareRecordRows);
    rows.push(`
      <tr class="section-row">
        <td colspan="6">${titles[`${recordType}|${sex}`]}</td>
      </tr>
    `);

    if (!sectionRecords.length) {
      rows.push(`
        <tr class="pending-row">
          <td colspan="6">Aucun record enregistré</td>
        </tr>
      `);
      continue;
    }

    rows.push(...sectionRecords.map(renderRecordRow));
  }

  elements.recordsBody.innerHTML = rows.join("");
}

function renderRecords(filtered) {
  const rows = [];

  for (const [style, label] of styleSections) {
    const sectionRecords = filtered
      .filter((record) => record.style === style)
      .sort(compareRecordRows);
    if (!sectionRecords.length && !style.startsWith("RELAY")) continue;

    rows.push(`
      <tr class="section-row">
        <td colspan="6">${relaySectionLabel(style, label)}</td>
      </tr>
    `);

    if (!sectionRecords.length) {
      rows.push(`
        <tr class="pending-row">
          <td colspan="6">À intégrer plus tard</td>
        </tr>
      `);
      continue;
    }

    rows.push(...sectionRecords.map(renderRecordRow));
  }

  elements.recordsBody.innerHTML = rows.join("");

  if (!filtered.length) {
    elements.recordsBody.innerHTML = `<tr class="pending-row"><td class="empty" colspan="6">Aucun record ne correspond aux filtres.</td></tr>`;
  }
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
    record.recordType || "",
    record.sex || "",
    record.category || "",
    record.style || "",
    record.course || "",
    String(record.time || "").trim()
  ].join("|");
}

function isTieRecord(record, rows = records) {
  const time = String(record.time || "").trim();
  if (!time || isPlaceholderTime(time)) return false;
  const key = recordTieKey(record);
  return rows.filter((item) => recordTieKey(item) === key).length > 1;
}

function isRelayRecord(record) {
  return record.style?.startsWith("RELAY");
}

function participantLabel(record) {
  if (!isRelayRecord(record)) return swimmerColumnLabel(record.sex);
  const mixedRelay = isMixedRelayRecord(record);
  return record.sex === "F" && !mixedRelay ? "Relayeuses" : "Relayeurs";
}

function relaySwimmerNames(value) {
  const cleaned = String(value || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return [];

  const slashParts = cleaned.split(/\s*\/\s*/).map((part) => part.trim()).filter(Boolean);
  if (slashParts.length > 1) return slashParts.map(formatRelaySwimmerName);

  const dashParts = cleaned.split(/\s*-\s*/).map((part) => part.trim()).filter(Boolean);
  if (dashParts.length >= 4) return dashParts.map(formatRelaySwimmerName);

  return [formatRelaySwimmerName(cleaned)];
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

function recordMobileMeta(record) {
  return [displayClub(record), record.location, formatDate(record.date)]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" · ");
}

function displayClub(record) {
  if (record?.style === "RELAY_FRANCE") {
    return "FFESSM";
  }
  return record?.club || "";
}

function displayRelayTeam(record) {
  if (record?.style === "RELAY_FRANCE") {
    const club = String(record.club || "");
    if (record.recordType === "RFJ" || record.category === "J" || /^EDF\s*J\b/i.test(club) || /^EDFJ\b/i.test(club)) {
      return "Equipe de France Junior";
    }
    return "Equipe de France";
  }
  return displayClub(record) || "Relais";
}

function displayCourseShortLabel(record) {
  const course = String(record?.course || "");
  const label = String(record?.courseShortLabel || course);
  if (course.endsWith("BIX") || /BIX$/i.test(label)) return label.replace(/^4x?(\d+)BIX$/i, "4x$1 BI");
  if (course.endsWith("SB") && /^4x?\d+SB$/i.test(label)) return label.replace(/^4x?(\d+)SB$/i, "4x$1 SB");
  if (course.endsWith("SF") || /^4x?\d+SF$/i.test(label)) return label.replace(/^4x?(\d+)SF$/i, "4x$1 SF");
  return label;
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

function renderSwimmerCell(record) {
  const meta = recordMobileMeta(record);
  const splitMeta = splitMetaHtml(record);
  if (!isRelayRecord(record)) {
    return `
      <strong>${swimmerNameHtml(record)}</strong>
      ${meta ? `<small class="record-mobile-meta">${escapeHtml(meta)}</small>` : ""}
      ${splitMeta}
    `;
  }

  return `
    <strong class="relay-summary">${record.style === "RELAY_FRANCE" ? franceFlag() : ""}${escapeHtml(displayRelayTeam(record))}</strong>
    <div class="relay-swimmers">
      ${relaySwimmerNames(record.swimmer).map((name) => `<span>${escapeHtml(name)}</span>`).join("")}
    </div>
    ${meta ? `<small class="record-mobile-meta">${escapeHtml(meta)}</small>` : ""}
    ${splitMeta}
  `;
}

function renderRecordRow(record) {
  const rowClasses = [`sex-${record.sex.toLowerCase()}`];
  if (isRelayRecord(record)) {
    rowClasses.push("relay-record");
  }
  if (isMixedRelayRecord(record)) {
    rowClasses.push("relay-mixed");
  }

  return `
      <tr class="${rowClasses.join(" ")}" tabindex="0" role="button" aria-expanded="false">
        <td data-label="Course">
          <strong>${displayCourseShortLabel(record)}</strong>
        </td>
        <td class="${timeCellClass(record.time)}" data-label="Temps">${record.time}</td>
        <td data-label="${participantLabel(record)}">
          ${renderSwimmerCell(record)}
        </td>
        <td data-label="Club">${displayClub(record)}</td>
        <td data-label="Lieu">
          <strong>${record.location || "Lieu non renseigné"}</strong>
        </td>
        <td data-label="Date">${formatDate(record.date)}</td>
      </tr>
    `;
}

function resetFilters() {
  setActiveSegment(null);
  elements.courseFilter.value = "";
  applyFilters();
}

function refreshData(nextData) {
  data = nextData || window.LIVEPALMES_RECORDS || data;
  records = normalizeMixedRelayRecords(data.franceRecords || []);
  elements.cutoffText.textContent = data.updatedAt
    ? `Dernière mise à jour : ${formatDate(String(data.updatedAt).slice(0, 10))}`
    : "Dernière mise à jour : 25 mai 2026";
  addOptions(elements.courseFilter, (data.filters.franceCourses || []).slice().sort(compareCourse), "Toutes", courseLabel);
}

function initPage() {
  refreshData(data);

  elements.rfTypeFilter.querySelectorAll(".segment").forEach((button) => {
    button.addEventListener("click", () => {
      setActiveSegment(button);
      elements.courseFilter.value = "";
      applyFilters();
    });
  });

  elements.courseFilter.addEventListener("input", applyFilters);

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

  resetFilters();
}

(async function start() {
  if (window.LivePalmesPerformanceStore?.loadData) {
    refreshData(await window.LivePalmesPerformanceStore.loadData());
    window.LIVEPALMES_RECORDS = data;
  }
  initPage();
})();
