const data = window.LIVEPALMES_RECORDS;
const records = data.records;

const elements = {
  recordCount: document.querySelector("#recordCount"),
  sourceDate: document.querySelector("#sourceDate"),
  searchInput: document.querySelector("#searchInput"),
  sexFilter: document.querySelector("#sexFilter"),
  courseFilter: document.querySelector("#courseFilter"),
  categoryFilter: document.querySelector("#categoryFilter"),
  resetButton: document.querySelector("#resetButton"),
  title: document.querySelector("#mpfTitle"),
  cutoffText: document.querySelector("#cutoffText"),
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

function sexLabel(value) {
  return value === "F" ? "Femmes" : "Hommes";
}

function categoryLabel(value) {
  return records.find((record) => record.category === value)?.categoryLabel ?? value;
}

function categoryOptionLabel(category, sex = selectedSegmentValue(elements.sexFilter)) {
  const female = sex !== "M";
  const labels = {
    P: female ? "FPO · Poussine" : "HPO · Poussin",
    B: female ? "FBE · Benjamine" : "HBE · Benjamin",
    M: female ? "FMI · Minime" : "HMI · Minime",
    C: female ? "FCA · Cadette" : "HCA · Cadet",
    J: female ? "FJU · Junior" : "HJU · Junior",
    S: female ? "FSE · Senior" : "HSE · Senior",
    "M30+": female ? "F30+ · Master 30+" : "H30+ · Master 30+",
    "M40+": female ? "F40+ · Master 40+" : "H40+ · Master 40+",
    "M50+": female ? "F50+ · Master 50+" : "H50+ · Master 50+",
    "M60+": female ? "F60+ · Master 60+" : "H60+ · Master 60+",
    "M70+": female ? "F70+ · Master 70+" : "H70+ · Master 70+",
    "M80+": female ? "F80+ · Master 80+" : "H80+ · Master 80+"
  };
  return labels[category] ?? category;
}

function categoryCode(record) {
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
    sex: sex || categorySex,
    course: elements.courseFilter.value,
    category
  };
}

function categoryName(category, sex) {
  const female = sex === "F";
  const labels = {
    P: female ? "Poussines" : "Poussins",
    B: female ? "Benjamines" : "Benjamins",
    M: "Minimes",
    C: female ? "Cadettes" : "Cadets",
    J: female ? "Juniors Femmes" : "Juniors Hommes",
    S: female ? "Seniors Femmes" : "Seniors Hommes",
    "M30+": "Master 30+",
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
  const context = [category, sex].filter(Boolean).join(" ");
  elements.title.textContent = context
    ? `Meilleures Performances Françaises ${context}`
    : "Meilleures Performances Françaises";
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

function applyFilters() {
  const filters = currentFilters();
  updateCategoryOptions(selectedSegmentValue(elements.sexFilter));
  updateTitle(filters);
  const filtered = records.filter((record) => {
    return (
      Boolean(filters.sex) &&
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
        .filter((category) => records.some((record) => record.sex === valueSex && record.category === category))
        .map((category) => `${valueSex}|${category}`)
    );
    addOptions(elements.categoryFilter, values, "Toutes", (value) => {
      const [optionSex, category] = value.split("|");
      return categoryOptionLabel(category, optionSex);
    });
    elements.categoryFilter.value = values.includes(current) ? current : "";
    return;
  }

  const values = data.filters.categories.filter((category) => records.some((record) => record.sex === sex && record.category === category));
  addOptions(elements.categoryFilter, values, "Toutes", (value) => categoryOptionLabel(value, sex));
  elements.categoryFilter.value = values.includes(current) ? current : "";
}

function renderRecords(filtered) {
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
      const badges = [record.bassin ? `<b>${record.bassin} m</b>` : "", chronoLabel ? `<b>${chronoLabel}</b>` : ""].filter(Boolean).join("");
      return `
        <tr class="sex-${record.sex.toLowerCase()}">
          <td data-label="Course">
            <strong>${record.courseShortLabel}</strong>
          </td>
          <td data-label="Categorie">
            <strong>${categoryCode(record)}</strong>
          </td>
          <td class="time" data-label="Temps">${record.time}</td>
          <td data-label="Nageur">
            <strong>${record.swimmer}</strong>
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
    elements.recordsBody.innerHTML = `<tr><td class="empty" colspan="7">Choisissez Femmes ou Hommes.</td></tr>`;
  }
}

function resetFilters() {
  if (elements.searchInput) elements.searchInput.value = "";
  setSegmentValue(elements.sexFilter, "");
  elements.courseFilter.value = "";
  elements.categoryFilter.value = "";
  applyFilters();
}

if (elements.recordCount) elements.recordCount.textContent = records.length.toLocaleString("fr-FR");
if (elements.sourceDate) elements.sourceDate.textContent = formatDate(data.sourceDate);
elements.cutoffText.textContent = "Dernière mise à jour : 25 mai 2026";

addOptions(elements.courseFilter, data.filters.courses, "Toutes", courseLabel);
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
  }
  elements.courseFilter.value = "";
  applyFilters();
});

elements.sexFilter.querySelectorAll(".segment").forEach((button) => {
  button.addEventListener("click", () => {
    const { category } = currentFilters();
    setSegmentValue(elements.sexFilter, button.dataset.value);
    updateCategoryOptions(button.dataset.value);
    elements.categoryFilter.value = category && records.some((record) => record.sex === button.dataset.value && record.category === category) ? category : "";
    applyFilters();
  });
});

elements.resetButton.addEventListener("click", resetFilters);
applyFilters();
