const data = window.LIVEPALMES_RECORDS;
const records = data.franceRecords;

const elements = {
  rfTypeFilter: document.querySelector("#rfTypeFilter"),
  courseFilter: document.querySelector("#courseFilter"),
  tableTitle: document.querySelector("#tableTitle"),
  cutoffText: document.querySelector("#cutoffText"),
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

function formatDate(value) {
  if (!value) return "-";
  if (value.includes("/")) return value;
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function addOptions(select, values, allLabel, labeler = (value) => value) {
  select.innerHTML = "";
  select.append(new Option(allLabel, ""));
  values.forEach((value) => select.append(new Option(labeler(value), value)));
}

function courseLabel(value) {
  return records.find((record) => record.course === value)?.courseLabel ?? value;
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
    recordType: segment.dataset.type,
    sex: segment.dataset.sex,
    course: elements.courseFilter.value
  };
}

function applyFilters() {
  const filters = currentFilters();
  if (filters.course) {
    const filtered = records.filter((record) => record.course === filters.course);
    elements.tableTitle.textContent = `Records de France ${courseLabel(filters.course)}`;
    renderCourseRecords(filtered);
    return;
  }

  const filtered = records.filter((record) => {
    return (
      record.recordType === filters.recordType &&
      record.sex === filters.sex &&
      (!filters.course || record.course === filters.course)
    );
  });

  elements.tableTitle.textContent = titles[`${filters.recordType}|${filters.sex}`];
  renderRecords(filtered);
}

function renderCourseRecords(filtered) {
  const rows = [];

  for (const [recordType, sex] of rubricOrder) {
    const sectionRecords = filtered.filter((record) => record.recordType === recordType && record.sex === sex);
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
    const sectionRecords = filtered.filter((record) => record.style === style);
    if (!sectionRecords.length && !style.startsWith("RELAY")) continue;

    rows.push(`
      <tr class="section-row">
        <td colspan="6">${label}</td>
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

function isRelayRecord(record) {
  return record.style?.startsWith("RELAY");
}

function relaySwimmerNames(value) {
  const cleaned = String(value || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return [];

  const slashParts = cleaned.split(/\s*\/\s*/).map((part) => part.trim()).filter(Boolean);
  if (slashParts.length > 1) return slashParts;

  const dashParts = cleaned.split(/\s*-\s*/).map((part) => part.trim()).filter(Boolean);
  if (dashParts.length >= 4) return dashParts;

  return [cleaned];
}

function renderSwimmerCell(record) {
  if (!isRelayRecord(record)) {
    return `<strong>${escapeHtml(record.swimmer)}</strong>`;
  }

  return `
    <strong class="relay-summary">${escapeHtml(record.club || "Relais")}</strong>
    <div class="relay-swimmers">
      ${relaySwimmerNames(record.swimmer).map((name) => `<span>${escapeHtml(name)}</span>`).join("")}
    </div>
  `;
}

function renderRecordRow(record) {
  const rowClasses = [`sex-${record.sex.toLowerCase()}`];
  if (isRelayRecord(record)) {
    rowClasses.push("relay-record");
  }
  if (record.style?.startsWith("RELAY") && /(?:BIX|SB)$/.test(record.course)) {
    rowClasses.push("relay-mixed");
  }

  return `
      <tr class="${rowClasses.join(" ")}" tabindex="0" role="button" aria-expanded="false">
        <td data-label="Course">
          <strong>${record.courseShortLabel}</strong>
        </td>
        <td class="time" data-label="Temps">${record.time}</td>
        <td data-label="${isRelayRecord(record) ? "Relayeurs" : "Nageur"}">
          ${renderSwimmerCell(record)}
        </td>
        <td data-label="Club">${record.club}</td>
        <td data-label="Lieu">
          <strong>${record.location || "Lieu non renseigné"}</strong>
        </td>
        <td data-label="Date">${formatDate(record.date)}</td>
      </tr>
    `;
}

function resetFilters() {
  setActiveSegment(elements.rfTypeFilter.querySelector('.segment[data-type="RFJ"][data-sex="M"]'));
  elements.courseFilter.value = "";
  applyFilters();
}

elements.cutoffText.textContent = "Dernière mise à jour : 25 mai 2026";
addOptions(elements.courseFilter, data.filters.franceCourses, "Toutes", courseLabel);

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

resetFilters();
