let data = window.LIVEPALMES_RECORDS || {};
const reference = window.LIVEPALMES_ADMIN_REFERENCE || { swimmers: [], clubs: [] };
const MASTER_RELAY_CATEGORY = window.LivePalmesRecordPlaceholders?.masterRelayCategory || "MASTER_RELAYS_MIXED";
const MASTER_RELAY_LABEL = window.LivePalmesRecordPlaceholders?.masterRelayLabel || "Relais Masters mixtes";
const RECORD_HISTORY_LIMIT = 50;
const RECORD_ALERT_DRAFT_STORAGE_KEY = "livepalmes:record-alert-drafts";
let adminAuth = null;
let currentAccessUser = null;
let currentAccessUserLoading = false;
let recordsDataLoaded = false;
let sourceRows = [];

const state = {
  scope: "",
  selectedId: "",
  drafts: new Map()
};

const elements = {
  scopeFilter: document.querySelector("#adminScopeFilter"),
  recordLevelField: document.querySelector("#adminRecordLevelField"),
  recordLevelFilter: document.querySelector("#adminRecordLevelFilter"),
  sexFilter: document.querySelector("#adminSexFilter"),
  sexToggle: document.querySelector("#adminSexToggle"),
  kindFilter: document.querySelector("#adminKindFilter"),
  categoryFilter: document.querySelector("#adminCategoryFilter"),
  courseFilter: document.querySelector("#adminCourseFilter"),
  tableCard: document.querySelector(".admin-table-card"),
  tableBody: document.querySelector("#adminTableBody"),
  tableTitle: document.querySelector("#adminTableTitle"),
  tableMeta: document.querySelector("#adminTableMeta"),
  editorTitle: document.querySelector("#adminEditorTitle"),
  editorSubtitle: document.querySelector("#adminEditorSubtitle"),
  editorStatus: document.querySelector("#adminEditorStatus"),
  inlineEditor: document.querySelector("#adminInlineEditor"),
  fieldScope: document.querySelector("#recordScope"),
  fieldSex: document.querySelector("#recordSex"),
  fieldCategory: document.querySelector("#recordCategory"),
  fieldKind: document.querySelector("#recordKind"),
  fieldCourse: document.querySelector("#recordCourse"),
  fieldTime: document.querySelector("#recordTime"),
  fieldNameLabel: document.querySelector("#recordNameLabel"),
  fieldName: document.querySelector("#recordName"),
  fieldBirthDateWrap: document.querySelector("#recordBirthDateField"),
  fieldBirthDate: document.querySelector("#recordBirthDate"),
  fieldBirthDateHelp: document.querySelector("#recordBirthDateHelp"),
  fieldClub: document.querySelector("#recordClub"),
  fieldDate: document.querySelector("#recordDate"),
  fieldLocation: document.querySelector("#recordLocation"),
  fieldSource: document.querySelector("#recordSource"),
  fieldNote: document.querySelector("#recordNote"),
  mpfSyncAlert: document.querySelector("#mpfSyncAlert"),
  mpfSyncTitle: document.querySelector("#mpfSyncTitle"),
  mpfSyncText: document.querySelector("#mpfSyncText"),
  mpfSyncCheckbox: document.querySelector("#mpfSyncCheckbox"),
  mpfGlobalAlert: document.querySelector("#mpfGlobalAlert"),
  mpfGlobalAlertTitle: document.querySelector("#mpfGlobalAlertTitle"),
  mpfGlobalAlertText: document.querySelector("#mpfGlobalAlertText"),
  mpfGlobalAlertList: document.querySelector("#mpfGlobalAlertList"),
  saveDraft: document.querySelector("#saveDraftButton"),
  saveTieDraft: document.querySelector("#saveTieDraftButton"),
  deleteDraft: document.querySelector("#deleteDraftButton"),
  validate: document.querySelector("#validateButton"),
  newRecord: document.querySelector("#newRecordButton"),
  publish: document.querySelector("#publishButton"),
  draftsPanel: document.querySelector("#adminDraftsPanel"),
  draftsTitle: document.querySelector("#adminDraftsTitle"),
  draftsList: document.querySelector("#adminDraftsList"),
  draftsPublish: document.querySelector("#adminDraftsPublishButton"),
  historyButton: document.querySelector("#recordHistoryButton"),
  historyClose: document.querySelector("#recordHistoryCloseButton"),
  historyPanel: document.querySelector("#recordHistoryPanel"),
  historyList: document.querySelector("#recordHistoryList"),
  loginPanel: document.querySelector("#adminLoginPanel"),
  sessionPanel: document.querySelector("#adminSessionPanel"),
  workbench: document.querySelector("#adminWorkbench"),
  loginForm: document.querySelector("#performanceAdminLoginForm"),
  loginEmail: document.querySelector("#performanceAdminEmail"),
  loginPassword: document.querySelector("#performanceAdminPassword"),
  loginMessage: document.querySelector("#performanceAdminLoginMessage"),
  resetPassword: document.querySelector("#performanceAdminResetButton"),
  signOut: document.querySelector("#adminSignOutButton")
};

const scopeLabels = {
  RF: "Records de France",
  RFJ: "Records de France Juniors",
  MPF: "Meilleures Performances Françaises"
};

const kindLabels = {
  individual: "Individuel",
  relayClub: "Relais Club",
  relayFrance: "Relais France"
};

const tableSectionOrder = ["SF", "AP", "IS", "BI", "RELAY_CLUB", "RELAY_FRANCE"];
const relayCourseOrder = ["4X50SF", "4X100SF", "4X200SF", "4X100SB", "4X100BIX"];
const individualCourseOrder = ["50SF", "100SF", "200SF", "400SF", "800SF", "1500SF", "50AP", "100IS", "200IS", "400IS", "50BI", "100BI", "200BI", "400BI"];
const courseOrder = new Map([...individualCourseOrder, ...relayCourseOrder].map((course, index) => [course, index]));
const tableSectionLabels = {
  SF: "Surface",
  AP: "Apnée",
  IS: "Immersion",
  BI: "Bi-palmes",
  RELAY_CLUB: "Relais Club",
  RELAY_FRANCE: "Relais France"
};

function isMasterRelayRow(row) {
  return window.LivePalmesRecordPlaceholders?.isMasterRelayRow
    ? window.LivePalmesRecordPlaceholders.isMasterRelayRow(row)
    : /^[RX]\d+$/.test(row?.category || "") && String(row?.style || "").startsWith("RELAY");
}

function matchesCategoryFilter(row, category) {
  if (!category) return true;
  if (category === MASTER_RELAY_CATEGORY) return isMasterRelayRow(row);
  return row.category === category;
}

function kindLabel(row) {
  if (row.kind === "relayFrance" && row.scope === "MPF" && isMasterRelayRow(row)) {
    return "Relais Équipe fédérale";
  }
  return kindLabels[row.kind] || row.kind || "";
}

function tableSectionKey(row) {
  return row.style || (row.kind === "relayClub" ? "RELAY_CLUB" : row.kind === "relayFrance" ? "RELAY_FRANCE" : row.course?.match(/[A-Z]+$/)?.[0] || "");
}

function tableSectionLabel(style, rows) {
  const first = rows.find((row) => tableSectionKey(row) === style);
  return first?.styleLabel || tableSectionLabels[style] || style || "Autres";
}

function rebuildSourceRows() {
  sourceRows = [
    ...(Array.isArray(data.franceRecords) ? data.franceRecords : []).map((record) => normalizeAdminRow(record, record.recordType)),
    ...(Array.isArray(data.records) ? data.records : []).map((record) => normalizeAdminRow(record, "MPF"))
  ];
}

function hasRecordData(value = {}) {
  return Boolean(
    (Array.isArray(value.franceRecords) && value.franceRecords.length) ||
    (Array.isArray(value.records) && value.records.length)
  );
}

function completeRecordsData(value = {}) {
  return window.LivePalmesRecordPlaceholders?.completeData
    ? window.LivePalmesRecordPlaceholders.completeData(value)
    : value;
}

function mergeRecordsData(fallback = {}, remote = {}) {
  return completeRecordsData({
    ...fallback,
    ...remote,
    records: Array.isArray(remote.records) && remote.records.length ? remote.records : fallback.records,
    franceRecords: Array.isArray(remote.franceRecords) && remote.franceRecords.length ? remote.franceRecords : fallback.franceRecords,
    recordHistory: Array.isArray(remote.recordHistory) ? remote.recordHistory : fallback.recordHistory,
    filters: remote.filters || fallback.filters || {}
  });
}

async function withTimeout(promise, timeoutMs, fallbackValue) {
  let timeoutId;
  const timeout = new Promise((resolve) => {
    timeoutId = window.setTimeout(() => resolve(fallbackValue), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function applyRecordsData(nextData, { loaded = true } = {}) {
  data = completeRecordsData(nextData || {});
  window.LIVEPALMES_RECORDS = data;
  recordsDataLoaded = loaded;
  rebuildSourceRows();
  setupDatalists();
  updateFilterOptions();
  renderTable();
  updateAuthView();
}

async function loadLocalRecordsData() {
  if (hasRecordData(window.LIVEPALMES_RECORDS)) return window.LIVEPALMES_RECORDS;
  await new Promise((resolve) => setTimeout(resolve, 0));
  if (hasRecordData(window.LIVEPALMES_RECORDS)) return window.LIVEPALMES_RECORDS;
  await new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = `public/data/records-data.js?v=records-firestore-20260729212535&reload=${Date.now()}`;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
  if (hasRecordData(window.LIVEPALMES_RECORDS)) return window.LIVEPALMES_RECORDS;
  try {
    const response = await fetch("public/data/records-data.js?v=records-firestore-20260729212535", { cache: "no-store" });
    if (!response.ok) return window.LIVEPALMES_RECORDS || {};
    const text = await response.text();
    const match = text.match(/window\.LIVEPALMES_RECORDS\s*=\s*(\{.*\});?\s*$/s);
    if (!match) return window.LIVEPALMES_RECORDS || {};
    const localData = JSON.parse(match[1]);
    window.LIVEPALMES_RECORDS = localData;
    return localData;
  } catch (error) {
    console.warn("Chargement local des records impossible", error);
    return window.LIVEPALMES_RECORDS || {};
  }
}

function decodeFirestoreValue(value = {}) {
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return Boolean(value.booleanValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodeFirestoreValue);
  if ("mapValue" in value) return decodeFirestoreMap(value.mapValue.fields || {});
  return undefined;
}

function decodeFirestoreMap(fields = {}) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, decodeFirestoreValue(value)])
  );
}

async function loadRemoteRecordsData() {
  const projectId = window.LivePalmesAppConfig?.firebaseConfig?.projectId || "livepalmes";
  const competitionId = window.LivePalmesAppConfig?.firestoreCompetitionId || "livepalmes-active";
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/competitions/${competitionId}/performanceData/records`;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return {};
    const payload = await response.json();
    return decodeFirestoreMap(payload.fields || {});
  } catch (error) {
    console.warn("Chargement distant des records impossible", error);
    return {};
  }
}

function normalizeAdminRow(row, scope) {
  return {
    ...row,
    id: row.key || `${scope}|${row.sex}|${row.category}|${row.course}|${row.swimmer}`,
    scope,
    kind: row.style === "RELAY_CLUB" ? "relayClub" : row.style === "RELAY_FRANCE" ? "relayFrance" : "individual",
    status: row.placeholderRecord ? "À établir" : (row.manualFrozen ? "Figé" : "Publié"),
    source: row.manualFrozen ? "frozen" : "base"
  };
}

function allRows() {
  const newRows = [];
  state.drafts.forEach((draft, id) => {
    if (id.startsWith("new|")) newRows.push({ ...draft, id });
  });
  return [...newRows.reverse(), ...sourceRows.map((row) => ({ ...row, ...(state.drafts.get(row.id) || {}) }))]
    .filter((row) => row.status !== "Supprimé");
}

function rowsForScope() {
  if (!hasRequiredSelection()) return [];
  const effectiveScope = state.scope === "MPF" ? "MPF" : elements.recordLevelFilter.value;
  return allRows()
    .filter((row) => row.scope === effectiveScope)
    .filter((row) => row.sex === elements.sexFilter.value || (state.scope === "MPF" && elements.categoryFilter.value === MASTER_RELAY_CATEGORY && isMasterRelayRow(row)))
    .filter((row) => state.scope !== "MPF" || matchesCategoryFilter(row, elements.categoryFilter.value))
    .filter((row) => !elements.courseFilter.value || row.course === elements.courseFilter.value);
}

function hasRequiredSelection() {
  if (!state.scope || !elements.sexFilter.value) return false;
  if (state.scope === "MPF" && !elements.categoryFilter.value) return false;
  return true;
}

function setSegmentValue(group, value) {
  group.querySelectorAll(".segment").forEach((button) => {
    const active = button.dataset.value === value;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function selectedSegmentValue(group) {
  return group.querySelector(".segment.active")?.dataset.value || "";
}

function setSexValue(value) {
  elements.sexFilter.value = value;
  elements.sexToggle?.querySelectorAll("[data-sex]").forEach((button) => {
    const active = button.dataset.sex === value;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function addOptions(select, values, allLabel, labeler = (value) => value) {
  select.innerHTML = "";
  if (allLabel) select.append(new Option(allLabel, ""));
  values.forEach((value) => select.append(new Option(labeler(value), value)));
}

function uniqueSorted(values, sorter = (a, b) => String(a).localeCompare(String(b), "fr")) {
  return Array.from(new Set(values.filter(Boolean))).sort(sorter);
}

function compareCourse(a, b) {
  if (window.LivePalmesRecordPlaceholders?.compareCourses) {
    return window.LivePalmesRecordPlaceholders.compareCourses(a, b);
  }
  const styleOrder = ["SF", "AP", "IS", "BI", "RELAY_CLUB", "RELAY_FRANCE"];
  const styleOf = (value) => {
    const row = allRows().find((item) => item.course === value);
    return row?.style || (String(value).startsWith("4X") ? "RELAY_CLUB" : String(value).match(/[A-Z]+$/)?.[0] || "");
  };
  const lengthOf = (value) => Number(String(value).match(/^4X(\d+)|^(\d+)/)?.[1] || String(value).match(/^(\d+)/)?.[1] || 0);
  return styleOrder.indexOf(styleOf(a)) - styleOrder.indexOf(styleOf(b))
    || (courseOrder.get(a) ?? 999) - (courseOrder.get(b) ?? 999)
    || lengthOf(a) - lengthOf(b)
    || String(a).localeCompare(String(b));
}

function courseLabel(value) {
  const existing = allRows().find((row) => row.course === value)?.courseLabel;
  if (existing) return existing;
  const relay = String(value).match(/^(4X\d+)(SF|SB|BIX)$/);
  if (relay) {
    const labels = { SF: "Surface", SB: "Surface/Bi-palmes mixte", BIX: "Bi-palmes mixte" };
    return `${relay[1].replace("X", "x")} ${labels[relay[2]]}`;
  }
  const match = String(value).match(/^(\d+)(AP|BI|IS|SF)$/);
  const labels = { AP: "Apnée", BI: "Bi-palmes", IS: "Immersion", SF: "Surface" };
  return match ? `${match[1]} m ${labels[match[2]]}` : value;
}

function courseShortLabel(value) {
  const existing = allRows().find((row) => row.course === value)?.courseShortLabel;
  if (existing) return displayCourseShortLabel(existing, value);
  if (String(value).endsWith("BIX")) return String(value).replace(/^4X(\d+)BIX$/, "4x$1 BI");
  if (String(value).endsWith("SB")) return String(value).replace(/^4X(\d+)SB$/, "4x$1 SB");
  if (String(value).endsWith("SF")) return String(value).replace(/^4X(\d+)SF$/, "4x$1 SF");
  return String(value).replace("X", "x").replace(/^(\d+)(AP|BI|IS|SF)$/, "$1 $2");
}

function displayCourseShortLabel(label, course = "") {
  if (String(course).endsWith("BIX") || /BIX$/i.test(String(label))) {
    return String(label || course).replace(/^4x?(\d+)BIX$/i, "4x$1 BI");
  }
  if (String(course).endsWith("SB") && /^4x?\d+SB$/i.test(String(label || course))) {
    return String(label || course).replace(/^4x?(\d+)SB$/i, "4x$1 SB");
  }
  if (String(course).endsWith("SF") || /^4x?\d+SF$/i.test(String(label || course))) {
    return String(label || course).replace(/^4x?(\d+)SF$/i, "4x$1 SF");
  }
  return label || course;
}

function displayClub(row) {
  if (row.scope === "MPF" && row.style === "RELAY_FRANCE") return row.club || "FFESSM";
  if (row.style === "RELAY_FRANCE" && ["RF", "RFJ"].includes(row.scope)) {
    return "FFESSM";
  }
  return row.club || "-";
}

function isMixedRelay(row) {
  return row.kind !== "individual" && (
    row.mixedRelay === true
    || isMasterRelayRow(row)
    || (["RF", "RFJ", "MPF"].includes(row.scope) && /(?:BIX|SB)$/.test(row.course || ""))
  );
}

function isRelayRow(row = {}) {
  return row.kind !== "individual" || String(row.style || "").startsWith("RELAY") || /^4X/i.test(String(row.course || ""));
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

function formatRelaySwimmerList(value) {
  const cleaned = String(value || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  return cleaned
    .split(/\s*\/\s*/)
    .map(formatRelaySwimmerName)
    .filter(Boolean)
    .join(" / ");
}

function displayRecordSwimmer(row = {}) {
  return isRelayRow(row) ? formatRelaySwimmerList(row.swimmer) : (row.swimmer || "");
}

function isSharedMixedRelayRow(row) {
  return ["RF", "RFJ", "MPF"].includes(row.scope) && row.kind !== "individual" && /(?:BIX|SB)$/.test(String(row.course || ""));
}

function mixedRelayPairKey(row) {
  return [
    row.scope || "",
    row.style || "",
    row.category || "",
    row.course || ""
  ].join("|");
}

function normalizeMixedRelayPublishRows(rows) {
  const groups = new Map();
  rows.filter(isSharedMixedRelayRow).forEach((row) => {
    const key = mixedRelayPairKey(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });

  const canonical = new Map();
  groups.forEach((items, key) => {
    canonical.set(key, items.slice().sort((a, b) =>
      (parseTimeValue(a.time) ?? 999999999) - (parseTimeValue(b.time) ?? 999999999)
      || String(a.date || "").localeCompare(String(b.date || ""), "fr-FR")
      || String(a.id || "").localeCompare(String(b.id || ""), "fr-FR")
    )[0]);
  });

  return rows.map((row) => {
    if (!isSharedMixedRelayRow(row)) return row;
    const best = canonical.get(mixedRelayPairKey(row));
    if (!best) return row;
    return {
      ...row,
      time: best.time,
      rawTime: best.rawTime,
      value: parseTimeValue(best.time) ?? best.value ?? row.value,
      swimmer: best.swimmer,
      club: best.club,
      location: best.location,
      date: best.date,
      source: best.source,
      note: best.note,
      intermediateTimes: best.intermediateTimes,
      mixedRelay: true
    };
  });
}

function nameFieldLabel(row) {
  if (row.kind !== "individual") {
    return row.sex === "F" && !isMixedRelay(row) ? "Relayeuses" : "Relayeurs";
  }
  return row.sex === "F" ? "Nageuse" : "Nageur";
}

function allowedSwimmerSexes(row) {
  if (row.kind !== "individual" && isMixedRelay(row)) return ["F", "M"];
  return [row.sex || "F"];
}

function updateSwimmerOptions(row) {
  const allowedSexes = new Set(allowedSwimmerSexes(row));
  const seen = new Set();
  document.querySelector("#swimmerOptions").innerHTML = reference.swimmers
    .filter((swimmer) => allowedSexes.has(swimmer[2]))
    .filter((swimmer) => {
      const name = swimmer[1];
      if (!name || seen.has(name)) return false;
      seen.add(name);
      return true;
    })
    .slice(0, 2500)
    .map((swimmer) => `<option value="${swimmer[1]}"></option>`)
    .join("");
}

function normalizeLookup(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .toUpperCase()
    .trim();
}

function isUsableBirthDate(value) {
  return /^(19|20)\d{2}-\d{2}-\d{2}$/.test(String(value || ""));
}

function normalizeBirthDateInput(value) {
  const clean = String(value || "").trim();
  if (/^(19|20)\d{2}$/.test(clean)) return `${clean}-01-01`;
  if (/^(19|20)\d{2}-\d{2}-\d{2}$/.test(clean)) return clean;
  const french = clean.match(/^(\d{2})\/(\d{2})\/((?:19|20)\d{2})$/);
  return french ? `${french[3]}-${french[2]}-${french[1]}` : "";
}

function clubIdForCode(code) {
  const normalized = normalizeLookup(code);
  if (!normalized) return "";
  return String((reference.clubs || []).find((club) => normalizeLookup(club[1]) === normalized)?.[0] || "");
}

function uniqueBirthDate(swimmers) {
  const dates = Array.from(new Set(swimmers.map((swimmer) => swimmer[3]).filter(isUsableBirthDate)));
  return dates.length === 1 ? dates[0] : "";
}

function swimmerBirthDateForRow(row) {
  if (!row || row.kind !== "individual") return "";
  const name = normalizeLookup(row.swimmer);
  if (!name || name === "A ETABLIR") return "";
  const allowedSexes = new Set(allowedSwimmerSexes(row));
  const candidates = (reference.swimmers || [])
    .filter((swimmer) => normalizeLookup(swimmer[1]) === name)
    .filter((swimmer) => allowedSexes.has(swimmer[2]))
    .filter((swimmer) => isUsableBirthDate(swimmer[3]));
  if (!candidates.length) return "";

  const clubId = clubIdForCode(row.club);
  if (clubId) {
    const clubBirthDate = uniqueBirthDate(candidates.filter((swimmer) => String(swimmer[4]) === clubId));
    if (clubBirthDate) return clubBirthDate;
  }
  return uniqueBirthDate(candidates);
}

function editorPreviewRow() {
  return {
    id: state.selectedId || "",
    scope: elements.fieldScope.value,
    sex: elements.fieldSex.value,
    category: elements.fieldCategory.value,
    kind: elements.fieldKind.value,
    course: elements.fieldCourse.value,
    swimmer: elements.fieldName.value.trim(),
    club: elements.fieldClub.value.trim()
  };
}

function updateBirthDateField(row = editorPreviewRow()) {
  if (!elements.fieldBirthDate || !elements.fieldBirthDateWrap) return "";
  const resolved = swimmerBirthDateForRow(row);
  const current = allRows().find((item) => item.id === state.selectedId);
  const sameSwimmer = current &&
    normalizeLookup(current.swimmer) === normalizeLookup(row.swimmer) &&
    current.sex === row.sex &&
    current.kind === row.kind;
  const currentBirthDate = sameSwimmer && isUsableBirthDate(current.birthDate) ? current.birthDate : "";
  const manualBirthDate = normalizeBirthDateInput(elements.fieldBirthDate.value);
  const nextBirthDate = resolved || currentBirthDate || manualBirthDate;

  elements.fieldBirthDate.value = nextBirthDate || "";
  const needsManualBirthDate = row.kind === "individual" &&
    normalizeLookup(row.swimmer) &&
    normalizeLookup(row.swimmer) !== "A ETABLIR" &&
    !resolved &&
    !currentBirthDate;
  elements.fieldBirthDateWrap.hidden = !needsManualBirthDate;
  if (elements.fieldBirthDateHelp) {
    elements.fieldBirthDateHelp.textContent = needsManualBirthDate
      ? "Saisissez seulement l'année si la date complète n'est pas connue."
      : "Date de naissance reconnue automatiquement.";
  }
  return nextBirthDate;
}

function categoryCode(category, sex) {
  if (/^R\d+$/.test(String(category || ""))) return String(category).replace(/^R/, "X");
  const prefix = sex === "M" ? "H" : "F";
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
  return codes[category] || category || "-";
}

function normalizedCategoryForPublish(row) {
  return isMasterRelayRow(row) ? categoryCode(row.category, row.sex) : (row.category || "");
}

function normalizedClubForPublish(row) {
  if (row.scope === "MPF" && row.style === "RELAY_FRANCE") return row.club || "FFESSM";
  if (row.style === "RELAY_FRANCE" && ["RF", "RFJ"].includes(row.scope)) {
    return "FFESSM";
  }
  return row.club || "";
}

function categoryLabel(category, sex) {
  if (category === MASTER_RELAY_CATEGORY) return MASTER_RELAY_LABEL;
  if (/^[RX]\d+$/.test(String(category || ""))) return String(category).replace(/^R/, "X");
  const prefix = sex === "M" ? "H" : "F";
  const feminine = sex !== "M";
  const labels = {
    P: `${prefix}PO · ${feminine ? "Poussine" : "Poussin"}`,
    B: `${prefix}BE · ${feminine ? "Benjamine" : "Benjamin"}`,
    M: `${prefix}MI · Minime`,
    C: `${prefix}CA · ${feminine ? "Cadette" : "Cadet"}`,
    J: `${prefix}JU · Junior`,
    S: `${prefix}SE · Senior`,
    "M30+": `${prefix}30+ · Master 30+`,
    "M40+": `${prefix}40+ · Master 40+`,
    "M50+": `${prefix}50+ · Master 50+`,
    "M60+": `${prefix}60+ · Master 60+`,
    "M70+": `${prefix}70+ · Master 70+`,
    "M80+": `${prefix}80+ · Master 80+`
  };
  return labels[category] || category;
}

function formatDate(value) {
  if (!value) return "-";
  if (value.includes("/")) return value;
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatDate(String(value).slice(0, 10));
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
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

function parseTimeValue(value) {
  const cleaned = normalizeTimeInput(value);
  const match = cleaned.match(/^(?:(\d+):)?(\d{1,2})\.(\d{2})$/);
  if (!match) return null;
  const minutes = Number(match[1] || 0);
  const seconds = Number(match[2]);
  const centiseconds = Number(match[3]);
  if (seconds >= 60 || centiseconds >= 100) return null;
  return minutes * 6000 + seconds * 100 + centiseconds;
}

function normalizeTimeInput(value) {
  const cleaned = value.trim().replace(",", ".");
  const compact = cleaned.match(/^(\d{2})(\d{2})(\d{2})$/);
  if (!compact) return cleaned;

  const minutes = Number(compact[1]);
  const seconds = Number(compact[2]);
  const centiseconds = Number(compact[3]);
  if (seconds >= 60 || centiseconds >= 100) return cleaned;

  return minutes > 0 ? `${minutes}:${compact[2]}.${compact[3]}` : `${seconds}.${compact[3]}`;
}

function keySafePart(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "ligne";
}

function comparableText(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readQueuedRecordAlertDrafts() {
  try {
    const parsed = JSON.parse(window.localStorage?.getItem(RECORD_ALERT_DRAFT_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueuedRecordAlertDrafts(rows) {
  try {
    window.localStorage?.setItem(RECORD_ALERT_DRAFT_STORAGE_KEY, JSON.stringify(rows.slice(0, 100)));
  } catch {
    // Les brouillons deja charges restent disponibles dans la session courante.
  }
}

function clearQueuedRecordAlertDrafts(sourceKeys = []) {
  const keys = new Set(sourceKeys.filter(Boolean));
  if (!keys.size) return;
  writeQueuedRecordAlertDrafts(readQueuedRecordAlertDrafts().filter((row) => !keys.has(row.sourceKey)));
}

function findRecordAlertDraftTarget(draft = {}) {
  const referenceKey = String(draft.referenceKey || "").trim();
  if (referenceKey) {
    const exact = sourceRows.find((row) => row.id === referenceKey || row.key === referenceKey);
    if (exact) return exact;
  }
  return sourceRows.find((row) =>
    row.scope === draft.scope &&
    row.sex === draft.sex &&
    row.category === draft.category &&
    row.course === draft.course &&
    row.kind === "individual"
  ) || null;
}

function queuedDraftMatchesExistingRecord(target, draft = {}) {
  if (!target) return false;
  return parseTimeValue(target.time) === parseTimeValue(draft.time) &&
    comparableText(target.swimmer) === comparableText(draft.swimmer) &&
    String(target.date || "") === String(draft.date || "");
}

function queuedRecordAlertDraftId(draft = {}) {
  return [
    "new",
    "alert",
    keySafePart(draft.sourceKey),
    keySafePart(draft.scope),
    keySafePart(draft.sex),
    keySafePart(draft.category),
    keySafePart(draft.course)
  ].join("|");
}

function rowFromQueuedRecordAlertDraft(draft = {}) {
  if (!draft.scope || !draft.sex || !draft.category || !draft.course || !draft.time) return null;
  const target = findRecordAlertDraftTarget(draft);
  if (draft.alertStatus === "equal" && queuedDraftMatchesExistingRecord(target, draft)) return null;
  const createTie = draft.alertStatus === "equal" && target;
  const id = createTie ? queuedRecordAlertDraftId(draft) : (target?.id || queuedRecordAlertDraftId(draft));
  const row = {
    ...(createTie ? {} : (target || {})),
    id,
    scope: draft.scope,
    adminKind: draft.scope,
    recordType: draft.scope === "MPF" ? "" : draft.scope,
    sex: draft.sex,
    category: draft.category,
    kind: "individual",
    style: draft.style || String(draft.course).match(/[A-Z]+$/)?.[0] || "",
    course: draft.course,
    courseLabel: courseLabel(draft.course),
    courseShortLabel: courseShortLabel(draft.course),
    time: normalizeTimeInput(draft.time),
    swimmer: draft.swimmer || "",
    birthDate: normalizeBirthDateInput(draft.birthDate || "") || draft.birthDate || "",
    club: draft.club || "",
    date: draft.date || "",
    location: draft.location || "",
    source: "import-alert",
    note: [draft.note, createTie ? "Ex aequo" : "", draft.competitionName].filter(Boolean).join(" · "),
    status: "Brouillon",
    recordAlertSourceKey: draft.sourceKey || ""
  };
  if (createTie || !target) {
    row.key = `manual-alert|${keySafePart(draft.sourceKey)}|${keySafePart(draft.scope)}|${keySafePart(draft.course)}|${keySafePart(draft.swimmer)}|${keySafePart(draft.date)}`;
  }
  return row;
}

function applyQueuedRecordAlertDrafts() {
  const queued = readQueuedRecordAlertDrafts();
  if (!queued.length) return;
  const converted = queued.map((draft) => ({ draft, row: rowFromQueuedRecordAlertDraft(draft) }));
  const appliedRows = converted.map((item) => item.row).filter(Boolean);
  clearQueuedRecordAlertDrafts(converted.filter((item) => !item.row).map((item) => item.draft.sourceKey));
  if (!appliedRows.length) return;
  appliedRows.forEach((row) => state.drafts.set(row.id, row));
  openRestoredDraft(appliedRows[0]);
}

function isoDate(value) {
  if (!value || value.includes("/")) return "";
  return value;
}

function rowStatus(row) {
  if (row.status === "Validé") return "Validé";
  if (row.status === "Brouillon") return "Brouillon";
  if (row.status === "À établir") return "À établir";
  if (row.status === "Figé") return "Figé";
  return row.status || "Figé";
}

function statusClass(row) {
  return rowStatus(row)
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "fige";
}

function updateFilterOptions() {
  elements.recordLevelField.hidden = state.scope !== "RF";
  const mpfCategoryField = document.querySelector("#adminMpfCategoryField") || elements.categoryFilter.closest("label");
  mpfCategoryField.hidden = state.scope !== "MPF";

  if (!state.scope) {
    addOptions(elements.categoryFilter, [], "Choisir une catégorie");
    addOptions(elements.courseFilter, [], "Toutes les courses");
    return;
  }

  if (state.scope === "MPF" && !elements.sexFilter.value) {
    const mpfRows = allRows().filter((row) => row.scope === "MPF");
    const categories = uniqueSorted(
      mpfRows.map((row) => isMasterRelayRow(row) ? MASTER_RELAY_CATEGORY : `${row.sex}|${row.category}`),
      (a, b) => categoryOptionRank(a) - categoryOptionRank(b)
    );
    const previousCategory = elements.categoryFilter.value;
    addOptions(elements.categoryFilter, categories, "Choisir une catégorie", adminCategoryOptionLabel);
    if (categories.includes(previousCategory)) elements.categoryFilter.value = previousCategory;
    addOptions(elements.courseFilter, [], "Toutes les courses");
    return;
  }

  if (!elements.sexFilter.value) {
    addOptions(elements.categoryFilter, [], "Choisir une catégorie");
    addOptions(elements.courseFilter, [], "Toutes les courses");
    return;
  }

  const effectiveScope = state.scope === "MPF" ? "MPF" : elements.recordLevelFilter.value;
  const scoped = allRows().filter((row) => row.scope === effectiveScope && (row.sex === elements.sexFilter.value || (state.scope === "MPF" && isMasterRelayRow(row))));
  const categoryValues = scoped
    .map((row) => isMasterRelayRow(row) ? MASTER_RELAY_CATEGORY : row.category)
    .filter((category, index, values) => values.indexOf(category) === index);
  const categories = uniqueSorted(categoryValues, (a, b) => categoryRank(a) - categoryRank(b));
  const previousCategory = elements.categoryFilter.value;
  addOptions(elements.categoryFilter, categories, state.scope === "MPF" ? "Choisir une catégorie" : "", (category) => categoryLabel(category, elements.sexFilter.value));
  if (categories.includes(previousCategory)) elements.categoryFilter.value = previousCategory;
  const courseScope = state.scope === "MPF"
    ? scoped.filter((row) => matchesCategoryFilter(row, elements.categoryFilter.value))
    : scoped;
  const courses = uniqueSorted(courseScope.map((row) => row.course), compareCourse);
  const previousCourse = elements.courseFilter.value;
  addOptions(elements.courseFilter, courses, "Toutes les courses", (course) => courseScope.find((row) => row.course === course)?.courseLabel || courseLabel(course));
  if (courses.includes(previousCourse)) elements.courseFilter.value = previousCourse;
}

function adminCategoryOptionLabel(value) {
  if (value === MASTER_RELAY_CATEGORY) return MASTER_RELAY_LABEL;
  const [sex, category] = String(value).split("|");
  return categoryLabel(category, sex);
}

function categoryOptionRank(value) {
  if (value === MASTER_RELAY_CATEGORY) return 9999;
  const [sex, category] = String(value).split("|");
  return (sex === "F" ? 0 : 1000) + categoryRank(category);
}

function categoryRank(category) {
  if (category === MASTER_RELAY_CATEGORY) return 999;
  return ["P", "B", "M", "C", "J", "S", "M30+", "M40+", "M50+", "M60+", "M70+", "M80+"].indexOf(category);
}

function currentFilterSummary() {
  const effectiveScope = state.scope === "MPF" ? "MPF" : elements.recordLevelFilter.value;
  const scope = scopeLabels[effectiveScope] || effectiveScope;
  const sex = elements.sexFilter.value === "M" ? "Hommes" : "Femmes";
  const category = state.scope === "MPF"
    ? categoryLabel(elements.categoryFilter.value, elements.sexFilter.value)
    : (elements.recordLevelFilter.value === "RFJ" ? "Junior" : "Toutes catégories");
  const course = elements.courseFilter.value ? courseLabel(elements.courseFilter.value) : "Toutes les courses";
  return `${scope} · ${sex} · ${category} · ${course}`;
}

function renderTable() {
  renderGlobalMpfAlert();
  renderHistoryPanel();
  renderDraftsPanel();

  if (!hasRequiredSelection()) {
    state.selectedId = "";
    if (elements.tableCard) elements.tableCard.hidden = true;
    elements.tableBody.innerHTML = "";
    resetEditor();
    return;
  }

  if (elements.tableCard) elements.tableCard.hidden = false;

  if (!allRows().length) {
    elements.tableTitle.textContent = "Records indisponibles";
    elements.tableMeta.textContent = "La base des records n'a pas ete chargee.";
    elements.tableBody.innerHTML = `<tr><td class="empty" colspan="8">Recharge la page. Si le probleme persiste, contacte l'administrateur LivePalmes.</td></tr>`;
    resetEditor();
    return;
  }

  const rows = rowsForScope();
  if (rows.length && !rows.some((row) => row.id === state.selectedId)) {
    state.selectedId = "";
    resetEditor();
  }
  const effectiveScope = state.scope === "MPF" ? "MPF" : elements.recordLevelFilter.value;
  elements.tableTitle.textContent = scopeLabels[effectiveScope];
  elements.tableMeta.textContent = `${currentFilterSummary()} · ${rows.length} ligne${rows.length > 1 ? "s" : ""} affichée${rows.length > 1 ? "s" : ""}`;

  if (!rows.length) {
    elements.tableBody.innerHTML = `<tr><td class="empty" colspan="8">Aucune ligne pour ces filtres.</td></tr>`;
    resetEditor();
    return;
  }

  const selectedRow = rows.find((row) => row.id === state.selectedId);
  if (selectedRow) fillEditor(selectedRow);

  elements.tableBody.innerHTML = renderAdminRows(rows);

  elements.tableBody.querySelectorAll("[data-id]").forEach((row) => {
    row.addEventListener("click", () => selectRow(row.dataset.id));
  });

  const mount = document.querySelector("#adminInlineEditorMount");
  const editor = elements.inlineEditor;
  if (mount && editor && state.selectedId) {
    mount.append(editor);
    editor.hidden = false;
  }
}

function scrollToSelectedEditor() {
  window.setTimeout(() => {
    const target = document.querySelector("#adminInlineEditorMount") ||
      Array.from(elements.tableBody.querySelectorAll("[data-id]")).find((row) => row.dataset.id === state.selectedId);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 0);
}

function renderAdminRows(rows) {
  const sections = [
    ...tableSectionOrder,
    ...uniqueSorted(rows.map(tableSectionKey).filter((style) => !tableSectionOrder.includes(style)))
  ];

  return sections.map((style) => {
    const sectionRows = rows
      .filter((row) => tableSectionKey(row) === style)
      .sort((a, b) => compareCourse(a.course, b.course) || String(a.id || "").localeCompare(String(b.id || ""), "fr-FR"));
    if (!sectionRows.length) return "";
    return `
      <tr class="section-row admin-section-row">
        <td colspan="8">${tableSectionLabel(style, rows)}</td>
      </tr>
      ${sectionRows.map(renderAdminRow).join("")}
    `;
  }).join("");
}

function draftRows() {
  return Array.from(state.drafts.entries()).map(([id, draft]) => {
    const before = sourceRows.find((row) => row.id === id) || null;
    const after = draft.status === "Supprimé" ? null : { ...(before || {}), ...draft, id };
    return { id, before, after, draft };
  }).filter((item) => draftHasChange(item.before, item.after));
}

function draftActionLabel(item) {
  if (item.draft.status === "Supprimé") return "Suppression";
  if (!item.before) return "Création";
  return "Modification";
}

function draftSummaryLine(row) {
  if (!row) return "Ligne supprimée";
  return [
    row.time || "À établir",
    displayRecordSwimmer(row) || "-",
    row.club || "-",
    formatDate(row.date)
  ].join(" · ");
}

function draftDisplayRow(item) {
  return item.after || item.before || item.draft;
}

function renderDraftsPanel() {
  if (!elements.draftsPanel) return;
  const rows = draftRows();
  const count = rows.length;
  elements.draftsPanel.hidden = !count;
  if (elements.publish) elements.publish.textContent = count ? `Publier ${count} brouillon${count > 1 ? "s" : ""}` : "Publier les brouillons";
  if (elements.draftsPublish) elements.draftsPublish.textContent = count ? `Publier ${count} brouillon${count > 1 ? "s" : ""}` : "Publier les brouillons";
  if (!count) {
    elements.draftsList.innerHTML = "";
    return;
  }

  elements.draftsTitle.textContent = `${count} brouillon${count > 1 ? "s" : ""} à publier`;
  elements.draftsList.innerHTML = rows.map((item) => {
    const row = draftDisplayRow(item);
    return `
      <article class="admin-draft-item">
        <div>
          <span>${escapeHtml(draftActionLabel(item))}</span>
          <strong>${escapeHtml(recordHistoryLabel(row))}</strong>
        </div>
        <p>
          <small>Avant</small>
          ${escapeHtml(draftSummaryLine(item.before))}
        </p>
        <p>
          <small>Après</small>
          ${escapeHtml(draftSummaryLine(item.after))}
        </p>
        <div class="admin-draft-actions">
          <button type="button" class="ghost-button" data-draft-open="${escapeHtml(item.id)}">Ouvrir</button>
          <button type="button" class="ghost-button" data-draft-remove="${escapeHtml(item.id)}">Retirer</button>
        </div>
      </article>
    `;
  }).join("");

  elements.draftsList.querySelectorAll("[data-draft-open]").forEach((button) => {
    button.addEventListener("click", () => openDraft(button.dataset.draftOpen));
  });
  elements.draftsList.querySelectorAll("[data-draft-remove]").forEach((button) => {
    button.addEventListener("click", () => removeDraft(button.dataset.draftRemove));
  });
}

function openDraft(id) {
  const draft = state.drafts.get(id);
  if (!draft) return;
  openRestoredDraft({ ...draft, id });
}

function removeDraft(id) {
  const draft = state.drafts.get(id);
  state.drafts.delete(id);
  clearQueuedRecordAlertDrafts([draft?.recordAlertSourceKey]);
  if (state.selectedId === id) state.selectedId = "";
  renderTable();
}

function draftHasChange(before, after) {
  return historyChanged(historySnapshot(before), historySnapshot(after));
}

function setDraftIfChanged(id, value) {
  const before = sourceRows.find((row) => row.id === id) || null;
  const after = value.status === "Supprimé" ? null : { ...(before || {}), ...value, id };
  if (draftHasChange(before, after)) {
    state.drafts.set(id, value);
  } else {
    state.drafts.delete(id);
  }
}

function recordTieKey(row) {
  return [
    row.scope || "",
    row.recordType || "",
    row.sex || "",
    normalizedCategoryForPublish(row),
    row.style || "",
    row.course || "",
    normalizeTimeInput(row.time || "")
  ].join("|");
}

function hasTie(row, rows = allRows()) {
  const key = recordTieKey(row);
  if (!normalizeTimeInput(row.time || "")) return false;
  return rows.filter((item) => item.id !== row.id && recordTieKey(item) === key).length > 0;
}

function renderAdminRow(row) {
  const selected = row.id === state.selectedId;
  const mixed = isMixedRelay(row);
  const displayClubValue = displayClub(row);
  const tieBadge = hasTie(row) ? `<span class="record-tie-badge">Ex aequo</span>` : "";
  const rowHtml = `
    <tr class="admin-table-row sex-${row.sex.toLowerCase()}${selected ? " active" : ""}${mixed ? " relay-mixed" : ""}" data-id="${row.id}">
      <td data-label="Course"><strong>${courseShortLabel(row.course)}</strong>${mixed ? `<span>Mixte</span>` : ""}</td>
      <td class="time" data-label="Temps">${row.time || "-"}${tieBadge}</td>
      <td data-label="Nageur / relais"><strong>${displayRecordSwimmer(row) || "-"}</strong></td>
      <td data-label="Catégorie">${categoryCode(row.category, row.sex)}</td>
      <td data-label="Club">${displayClubValue}</td>
      <td data-label="Lieu">${row.location || "-"}</td>
      <td data-label="Date">${formatDate(row.date)}</td>
      <td data-label="Statut"><span class="status-pill ${statusClass(row)}">${rowStatus(row)}</span></td>
    </tr>
  `;
  if (!selected) return rowHtml;
  return `${rowHtml}
    <tr class="admin-inline-edit-row">
      <td colspan="8"><div id="adminInlineEditorMount"></div></td>
    </tr>
  `;
}

function resetEditor() {
  const editor = elements.inlineEditor;
  if (editor) editor.hidden = true;
  elements.editorTitle.textContent = "Sélectionnez une ligne";
  elements.editorSubtitle.textContent = "Les modifications restent en brouillon jusqu'à publication.";
  elements.editorStatus.textContent = "-";
  [elements.fieldTime, elements.fieldName, elements.fieldBirthDate, elements.fieldClub, elements.fieldDate, elements.fieldLocation, elements.fieldNote].filter(Boolean).forEach((field) => {
    field.value = "";
  });
  if (elements.fieldBirthDateWrap) elements.fieldBirthDateWrap.hidden = true;
  if (elements.mpfSyncAlert) {
    elements.mpfSyncAlert.hidden = true;
    elements.mpfSyncCheckbox.checked = false;
  }
  if (elements.deleteDraft) elements.deleteDraft.disabled = true;
}

function selectRow(id) {
  if (state.selectedId === id) {
    state.selectedId = "";
    resetEditor();
    renderTable();
    return;
  }

  const row = allRows().find((item) => item.id === id);
  if (!row) return;
  state.selectedId = id;
  fillEditor(row);
  renderTable();
}

function fillEditor(row) {
  const editor = elements.inlineEditor;
  if (editor) editor.hidden = false;
  elements.editorTitle.textContent = `${row.scope} · ${courseShortLabel(row.course)}`;
  elements.editorSubtitle.textContent = `${row.sex === "M" ? "Hommes" : "Femmes"} · ${categoryLabel(row.category, row.sex)} · ${courseLabel(row.course)}`;
  elements.editorStatus.textContent = rowStatus(row);
  if (elements.fieldNameLabel) elements.fieldNameLabel.textContent = nameFieldLabel(row);
  if (elements.deleteDraft) elements.deleteDraft.disabled = false;
  updateSwimmerOptions(row);
  elements.fieldScope.value = row.scope;
  elements.fieldSex.value = row.sex;
  elements.fieldCategory.value = row.category;
  elements.fieldKind.value = row.kind;
  elements.fieldCourse.value = row.course;
  elements.fieldTime.value = row.time || "";
  elements.fieldName.value = row.swimmer || "";
  if (elements.fieldBirthDate) elements.fieldBirthDate.value = row.birthDate || "";
  elements.fieldClub.value = row.club || "";
  elements.fieldDate.value = isoDate(row.date);
  elements.fieldLocation.value = row.location || "";
  elements.fieldSource.value = row.source || "frozen";
  elements.fieldNote.value = row.note || "";
  updateBirthDateField(row);
  updateMpfSyncAlert();
}

function editorValue(status = "Brouillon") {
  const scope = elements.fieldScope.value;
  const course = elements.fieldCourse.value;
  const kind = elements.fieldKind.value;
  const normalizedTime = normalizeTimeInput(elements.fieldTime.value);
  elements.fieldTime.value = normalizedTime;
  return {
    id: state.selectedId || `new|${Date.now()}`,
    scope,
    adminKind: scope,
    recordType: scope === "MPF" ? "" : scope,
    sex: elements.fieldSex.value,
    category: elements.fieldCategory.value,
    kind,
    style: kind === "relayClub" ? "RELAY_CLUB" : kind === "relayFrance" ? "RELAY_FRANCE" : course.match(/[A-Z]+$/)?.[0] || "",
    course,
    courseLabel: courseLabel(course),
    courseShortLabel: courseShortLabel(course),
    time: normalizedTime,
    swimmer: elements.fieldName.value.trim(),
    birthDate: elements.fieldBirthDate ? updateBirthDateField(editorPreviewRow()) : "",
    club: elements.fieldClub.value.trim(),
    date: elements.fieldDate.value,
    location: elements.fieldLocation.value.trim(),
    source: elements.fieldSource.value,
    note: elements.fieldNote.value.trim(),
    status
  };
}

function swimmerSexesForName(name) {
  const clean = String(name || "").trim().toLocaleLowerCase("fr-FR");
  if (!clean) return [];
  return Array.from(new Set(reference.swimmers
    .filter((swimmer) => String(swimmer[1] || "").trim().toLocaleLowerCase("fr-FR") === clean)
    .map((swimmer) => swimmer[2])
    .filter(Boolean)));
}

function validateSwimmerSelection(row) {
  const sexes = swimmerSexesForName(row.swimmer);
  if (!sexes.length) return true;
  const allowed = allowedSwimmerSexes(row);
  if (sexes.some((sex) => allowed.includes(sex))) return true;
  const expected = nameFieldLabel(row).toLocaleLowerCase("fr-FR");
  window.alert(`Ce record concerne ${expected}. Le nom sélectionné ne correspond pas au sexe du record.`);
  return false;
}

function findLinkedMpf(row) {
  if (!["RF", "RFJ"].includes(row.scope)) return null;
  if (!["individual", "relayClub"].includes(row.kind)) return null;
  const category = row.scope === "RFJ" ? "J" : "S";
  return allRows().find((item) =>
    item.scope === "MPF" &&
    item.sex === row.sex &&
    item.category === category &&
    item.course === row.course &&
    item.kind === row.kind &&
    (row.kind === "individual" || item.style === row.style)
  );
}

function isMpfToEstablish(row) {
  const time = String(row?.time || "").trim();
  return row?.placeholderRecord === true ||
    rowStatus(row) === "À établir" ||
    time === window.LivePalmesRecordPlaceholders?.placeholderTime ||
    /tablir/i.test(time);
}

function linkedMpfDraft(row, status) {
  const mpf = findLinkedMpf(row);
  if (!mpf) return null;
  const newValue = parseTimeValue(row.time);
  const currentValue = parseTimeValue(mpf.time);
  const shouldComplete = currentValue === null && isMpfToEstablish(mpf);
  if (newValue === null || (!shouldComplete && (currentValue === null || newValue >= currentValue))) return null;
  return {
    ...mpf,
    time: row.time,
    swimmer: row.swimmer,
    birthDate: row.birthDate || swimmerBirthDateForRow(row) || mpf.birthDate || "",
    club: row.club,
    date: row.date,
    location: row.location,
    source: row.source,
    note: row.note,
    mixedRelay: row.mixedRelay || mpf.mixedRelay || false,
    status
  };
}

function mpfImprovementAlerts() {
  return allRows()
    .filter((row) => ["RF", "RFJ"].includes(row.scope))
    .map((row) => {
      const mpf = findLinkedMpf(row);
      const draft = linkedMpfDraft(row, "Brouillon");
      if (!mpf || !draft) return null;
      return { row, mpf, code: categoryCode(mpf.category, mpf.sex) };
    })
    .filter(Boolean)
    .sort((a, b) =>
      String(a.row.scope).localeCompare(String(b.row.scope), "fr-FR") ||
      String(a.row.sex).localeCompare(String(b.row.sex), "fr-FR") ||
      categoryRank(a.row.category) - categoryRank(b.row.category) ||
      compareCourse(a.row.course, b.row.course)
    );
}

function renderGlobalMpfAlert() {
  if (!elements.mpfGlobalAlert) return;
  const alerts = mpfImprovementAlerts();
  elements.mpfGlobalAlert.hidden = !alerts.length;
  if (!alerts.length) {
    elements.mpfGlobalAlertList.innerHTML = "";
    return;
  }

  const count = alerts.length;
  elements.mpfGlobalAlertTitle.textContent = `${count} record${count > 1 ? "s" : ""} améliore${count > 1 ? "nt" : ""} ou complète${count > 1 ? "nt" : ""} une MPF`;
  elements.mpfGlobalAlertText.textContent = "Ouvrez la ligne concernée pour ajouter la mise à jour MPF aux brouillons.";
  elements.mpfGlobalAlertList.innerHTML = alerts.slice(0, 6).map(({ row, mpf, code }) => `
    <li>
      <button type="button" data-alert-row="${row.id}">
        <strong>${row.scope} · ${courseShortLabel(row.course)} · ${categoryCode(row.category, row.sex)}</strong>
        <span>${isMpfToEstablish(mpf) ? `${row.time} complète la MPF ${code} à établir` : `${row.time} améliore la MPF ${code} (${mpf.time})`}</span>
      </button>
    </li>
  `).join("");
  if (alerts.length > 6) {
    elements.mpfGlobalAlertList.insertAdjacentHTML("beforeend", `<li class="admin-global-alert-more">+ ${alerts.length - 6} autre${alerts.length - 6 > 1 ? "s" : ""}</li>`);
  }
  elements.mpfGlobalAlertList.querySelectorAll("[data-alert-row]").forEach((button) => {
    button.addEventListener("click", () => openAlertRow(button.dataset.alertRow));
  });
}

function openAlertRow(rowId) {
  const row = allRows().find((item) => item.id === rowId);
  if (!row) return;
  state.scope = row.scope === "MPF" ? "MPF" : "RF";
  setSegmentValue(elements.scopeFilter, state.scope);
  elements.recordLevelFilter.value = row.scope === "RFJ" ? "RFJ" : "RF";
  setSexValue(row.sex);
  elements.categoryFilter.value = "";
  elements.courseFilter.value = "";
  updateFilterOptions();
  if (state.scope === "MPF") elements.categoryFilter.value = row.category;
  elements.courseFilter.value = row.course;
  state.selectedId = row.id;
  renderTable();
  scrollToSelectedEditor();
}

function updateMpfSyncAlert() {
  if (!elements.mpfSyncAlert) return;
  const row = editorValue(rowStatus({ status: elements.editorStatus.textContent }));
  const draft = linkedMpfDraft(row, "Brouillon");
  const mpf = findLinkedMpf(row);
  if (!draft || !mpf) {
    elements.mpfSyncAlert.hidden = true;
    elements.mpfSyncCheckbox.checked = false;
    return;
  }

  const code = categoryCode(mpf.category, mpf.sex);
  elements.mpfSyncAlert.hidden = false;
  const completesMpf = isMpfToEstablish(mpf);
  elements.mpfSyncTitle.textContent = completesMpf
    ? `Cette performance peut établir la MPF ${code}.`
    : `Cette performance améliore aussi la MPF ${code}.`;
  elements.mpfSyncText.textContent = completesMpf
    ? `MPF actuelle ${courseShortLabel(mpf.course)} : à établir. Nouveau temps proposé : ${row.time}.`
    : `MPF actuelle ${courseShortLabel(mpf.course)} : ${mpf.time} par ${mpf.swimmer}. Nouveau temps proposé : ${row.time}.`;
}

function saveDraft(status) {
  if (!state.selectedId) return;
  const value = editorValue(status);
  if (!validateSwimmerSelection(value)) return;
  setDraftIfChanged(state.selectedId, value);
  if (elements.mpfSyncCheckbox?.checked) {
    const mpfDraft = linkedMpfDraft(value, status);
    if (mpfDraft) setDraftIfChanged(mpfDraft.id, mpfDraft);
  }
  fillEditor(value);
  renderTable();
}

function saveTieDraft(status) {
  if (!state.selectedId) return;
  const selected = allRows().find((row) => row.id === state.selectedId);
  const value = editorValue(status);
  if (!selected) return;
  if (!validateSwimmerSelection(value)) return;

  const selectedValue = parseTimeValue(selected.time);
  const nextValue = parseTimeValue(value.time);
  if (selectedValue === null || nextValue === null || selectedValue !== nextValue) {
    window.alert("Le bouton ex aequo est réservé aux performances exactement égales au record sélectionné.");
    return;
  }

  const suffix = `${Date.now()}-${keySafePart(value.swimmer)}-${keySafePart(value.date)}`;
  const id = `new|tie|${value.scope}|${value.sex}|${value.category}|${value.course}|${suffix}`;
  const row = {
    ...value,
    id,
    key: `manual-${value.scope.toLowerCase()}-tie|${value.scope}|${value.sex}|${value.category}|${value.course}|${parseTimeValue(value.time) ?? keySafePart(value.time)}|${suffix}`,
    source: "frozen",
    note: [value.note, "Ex aequo"].filter(Boolean).join(" · "),
    status
  };
  state.drafts.set(id, row);
  state.selectedId = id;
  fillEditor(row);
  renderTable();
}

function deleteSelectedRecordDraft() {
  if (!state.selectedId) return;
  const row = allRows().find((item) => item.id === state.selectedId) ||
    sourceRows.find((item) => item.id === state.selectedId) ||
    state.drafts.get(state.selectedId);
  if (!row) return;
  const label = `${row.scope || ""} ${courseShortLabel(row.course)} - ${displayRecordSwimmer(row) || row.club || "ligne selectionnee"} - ${row.time || ""}`.trim();
  if (!window.confirm(`Supprimer cette ligne des records/MPF ?\n\n${label}\n\nLa suppression sera ajoutee aux brouillons et ne sera effective qu'apres publication.`)) {
    return;
  }

  if (String(state.selectedId).startsWith("new|") && !sourceRows.some((item) => item.id === state.selectedId)) {
    clearQueuedRecordAlertDrafts([row.recordAlertSourceKey]);
    state.drafts.delete(state.selectedId);
  } else {
    state.drafts.set(state.selectedId, {
      ...row,
      status: "Supprimé"
    });
  }
  state.selectedId = "";
  resetEditor();
  renderTable();
}

function createRecord() {
  const scope = state.scope === "MPF" ? "MPF" : elements.recordLevelFilter.value;
  const id = `new|${Date.now()}`;
  const visibleRows = rowsForScope();
  const row = {
    id,
    scope,
    adminKind: scope,
    recordType: scope === "MPF" ? "" : scope,
    sex: elements.sexFilter.value || visibleRows[0]?.sex || "F",
    category: elements.categoryFilter.value || (scope === "RFJ" ? "J" : "S"),
    kind: elements.kindFilter.value || "individual",
    course: elements.courseFilter.value || visibleRows[0]?.course || allRows().find((item) => item.scope === scope)?.course || "",
    time: "",
    swimmer: "",
    birthDate: "",
    club: "",
    date: "",
    location: "",
    source: "external",
    status: "Brouillon",
    note: ""
  };
  state.drafts.set(id, row);
  selectRow(id);
  renderTable();
}

function publicRecordFromAdminRow(row) {
  const key = row.key || (row.id && !row.id.startsWith("new|") ? row.id : `admin|${row.scope}|${row.sex}|${row.category}|${row.course}|${Date.now()}`);
  const remainsToEstablish = row.time === window.LivePalmesRecordPlaceholders?.placeholderTime || row.time === "À établir";
  const base = {
    ...row,
    key,
    manualFrozen: true,
    placeholderRecord: remainsToEstablish ? Boolean(row.placeholderRecord) : false,
    value: parseTimeValue(row.time) ?? row.value ?? null,
    rawTime: remainsToEstablish ? "" : (row.time || row.rawTime || ""),
    time: row.time || "",
    course: row.course || "",
    courseLabel: row.courseLabel || courseLabel(row.course),
    courseShortLabel: row.courseShortLabel || courseShortLabel(row.course),
    sex: row.sex || "",
    category: normalizedCategoryForPublish(row),
    categoryLabel: isMasterRelayRow(row) ? normalizedCategoryForPublish(row) : (row.categoryLabel || row.category || ""),
    swimmer: isRelayRow(row) ? formatRelaySwimmerList(row.swimmer) : (row.swimmer || ""),
    club: normalizedClubForPublish(row),
    location: row.location || "",
    date: row.date || "",
    sourceCategory: row.scope === "MPF" ? "MPF figée" : "RF figé"
  };
  if (Array.isArray(row.intermediateTimes) && row.intermediateTimes.length) {
    base.intermediateTimes = row.intermediateTimes;
  }
  delete base.id;
  delete base.scope;
  delete base.kind;
  delete base.status;
  delete base.source;
  delete base.note;
  delete base.adminKind;
  delete base.recordAlertSourceKey;
  if (!base.placeholderRecord) delete base.placeholderRecord;
  if (row.scope === "MPF") {
    delete base.recordType;
    delete base.recordTypeLabel;
  } else {
    base.recordType = row.scope;
    base.recordTypeLabel = row.scope === "RFJ" ? "Record de France Junior" : "Record de France";
  }
  return base;
}

function historySnapshot(row) {
  if (!row) return null;
  return {
    id: row.id || row.key || "",
    key: row.key || (row.id && !row.id.startsWith("new|") ? row.id : ""),
    scope: row.scope || "",
    recordType: row.scope === "MPF" ? "" : row.scope,
    sex: row.sex || "",
    category: row.category || "",
    kind: row.kind || "individual",
    style: row.style || "",
    course: row.course || "",
    courseLabel: row.courseLabel || courseLabel(row.course),
    courseShortLabel: row.courseShortLabel || courseShortLabel(row.course),
    time: row.time || "",
    swimmer: displayRecordSwimmer(row) || "",
    club: row.club || "",
    date: row.date || "",
    location: row.location || "",
    source: row.source || "frozen",
    note: row.note || "",
    placeholderRecord: Boolean(row.placeholderRecord),
    manualFrozen: row.manualFrozen !== false,
    status: row.status || "Figé"
  };
}

function historyChanged(before, after) {
  const fields = ["scope", "sex", "category", "kind", "style", "course", "time", "swimmer", "birthDate", "club", "date", "location", "placeholderRecord"];
  if (!before || !after) return true;
  return fields.some((field) => String(before[field] ?? "") !== String(after[field] ?? ""));
}

function recordHistoryLabel(row) {
  if (!row) return "Ligne supprimée";
  return `${row.scope} · ${courseShortLabel(row.course)} · ${categoryCode(row.category, row.sex)}`;
}

function buildPublicationHistoryEntries(publishedAt) {
  const status = ensureAdminAuth()?.status?.() || {};
  return Array.from(state.drafts.entries()).map(([id, draft], index) => {
    const before = sourceRows.find((row) => row.id === id) || null;
    const after = draft.status === "Supprimé" ? null : { ...(before || {}), ...draft, id };
    const beforeSnapshot = historySnapshot(before);
    const afterSnapshot = historySnapshot(after);
    if (!historyChanged(beforeSnapshot, afterSnapshot)) return null;
    return {
      id: `record-history|${publishedAt}|${index}`,
      publishedAt,
      adminEmail: status.email || "",
      action: !beforeSnapshot ? "created" : !afterSnapshot ? "deleted" : "updated",
      label: recordHistoryLabel(afterSnapshot || beforeSnapshot),
      before: beforeSnapshot,
      after: afterSnapshot
    };
  }).filter(Boolean);
}

function historyActionLabel(action) {
  return {
    created: "Création",
    deleted: "Suppression",
    updated: "Modification"
  }[action] || "Modification";
}

function historyLine(row) {
  if (!row) return "Ligne absente";
  return [
    row.time || "À établir",
    displayRecordSwimmer(row) || "-",
    row.club || "-",
    row.location || "-",
    formatDate(row.date)
  ].join(" · ");
}

function renderHistoryPanel() {
  if (!elements.historyPanel || elements.historyPanel.hidden) return;
  const history = Array.isArray(data.recordHistory) ? data.recordHistory : [];
  if (!history.length) {
    elements.historyList.innerHTML = `<p class="admin-history-empty">Aucune mise à jour publiée pour le moment.</p>`;
    return;
  }

  elements.historyList.innerHTML = history.map((entry) => `
    <article class="admin-history-item">
      <div>
        <span>${escapeHtml(historyActionLabel(entry.action))} · ${escapeHtml(formatDateTime(entry.publishedAt))}</span>
        <strong>${escapeHtml(entry.label || recordHistoryLabel(entry.after || entry.before))}</strong>
        ${entry.adminEmail ? `<small>${escapeHtml(entry.adminEmail)}</small>` : ""}
      </div>
      <dl>
        <dt>Avant</dt>
        <dd>${escapeHtml(historyLine(entry.before))}</dd>
        <dt>Après</dt>
        <dd>${escapeHtml(historyLine(entry.after))}</dd>
      </dl>
      <button type="button" class="ghost-button" data-history-restore="${escapeHtml(entry.id)}" ${entry.before ? "" : "disabled"}>Restaurer l'ancien</button>
    </article>
  `).join("");

  elements.historyList.querySelectorAll("[data-history-restore]").forEach((button) => {
    button.addEventListener("click", () => restoreHistoryEntry(button.dataset.historyRestore));
  });
}

function restoreHistoryEntry(historyId) {
  const entry = (Array.isArray(data.recordHistory) ? data.recordHistory : []).find((item) => item.id === historyId);
  if (!entry?.before?.id) return;
  const restored = { ...entry.before, status: "Brouillon" };
  state.drafts.set(restored.id, restored);
  openRestoredDraft(restored);
}

function openRestoredDraft(row) {
  state.scope = row.scope === "MPF" ? "MPF" : "RF";
  setSegmentValue(elements.scopeFilter, state.scope);
  elements.recordLevelFilter.value = row.scope === "RFJ" ? "RFJ" : "RF";
  setSexValue(row.sex);
  elements.categoryFilter.value = "";
  elements.courseFilter.value = "";
  updateFilterOptions();
  if (state.scope === "MPF") elements.categoryFilter.value = row.category;
  elements.courseFilter.value = row.course;
  state.selectedId = row.id;
  renderTable();
  scrollToSelectedEditor();
}

async function publishDrafts() {
  if (!state.drafts.size) {
    elements.publish.textContent = "Aucun brouillon";
    window.setTimeout(() => {
      elements.publish.textContent = "Publier les brouillons";
    }, 1500);
    return;
  }
  const store = window.LivePalmesPerformanceStore;
  if (!store?.saveData) {
    window.alert("Le stockage Firebase des performances n'est pas disponible.");
    return;
  }
  elements.publish.disabled = true;
  elements.publish.textContent = "Publication...";
  try {
    const rows = normalizeMixedRelayPublishRows(allRows());
    const publishedAt = new Date().toISOString();
    const historyEntries = buildPublicationHistoryEntries(publishedAt);
    const publishedAlertDraftKeys = Array.from(state.drafts.values()).map((draft) => draft.recordAlertSourceKey).filter(Boolean);
    const previousHistory = Array.isArray(data.recordHistory) ? data.recordHistory : [];
    const nextData = {
      ...data,
      records: rows.filter((row) => row.scope === "MPF").map(publicRecordFromAdminRow),
      franceRecords: rows.filter((row) => row.scope === "RF" || row.scope === "RFJ").map(publicRecordFromAdminRow),
      recordHistory: [...historyEntries, ...previousHistory].slice(0, RECORD_HISTORY_LIMIT),
      sourceDate: publishedAt.slice(0, 10)
    };
    data = await store.saveData(nextData);
    clearQueuedRecordAlertDrafts(publishedAlertDraftKeys);
    state.drafts.clear();
    rebuildSourceRows();
    updateFilterOptions();
    renderTable();
    elements.publish.textContent = "Publié";
  } catch (error) {
    console.warn("Publication des records impossible", error);
    window.alert(`Publication impossible : ${error?.message || error}`);
    elements.publish.textContent = "Publier les brouillons";
  } finally {
    elements.publish.disabled = false;
    window.setTimeout(() => {
      elements.publish.textContent = "Publier les brouillons";
    }, 1600);
  }
}

function updateScope(value) {
  state.scope = value;
  setSegmentValue(elements.scopeFilter, value);
  state.selectedId = "";
  elements.categoryFilter.value = "";
  if (state.scope === "RF") elements.recordLevelFilter.value = elements.recordLevelFilter.value || "RF";
  elements.kindFilter.value = "";
  elements.courseFilter.value = "";
  updateFilterOptions();
  renderTable();
}

function setupDatalists() {
  document.querySelector("#clubOptions").innerHTML = reference.clubs
    .map((club) => `<option value="${club[1]}"></option>`)
    .join("");
}

function ensureFirebase() {
  const firebase = window.firebase;
  const config = window.LivePalmesAppConfig?.firebaseConfig || {};
  if (!firebase?.initializeApp || !firebase?.auth) return null;
  if (!firebase.apps?.length) firebase.initializeApp(config);
  return firebase;
}

function functionsService() {
  const firebase = ensureFirebase();
  if (!firebase?.functions) return null;
  try {
    return firebase.app().functions(window.LivePalmesAppConfig?.firebaseFunctionsRegion || "europe-west1");
  } catch {
    return firebase.functions(window.LivePalmesAppConfig?.firebaseFunctionsRegion || "europe-west1");
  }
}

function adminProfileName(profile = {}) {
  const safeProfile = profile || {};
  return [safeProfile.firstName, safeProfile.lastName].filter(Boolean).join(" ");
}

function setCurrentAccessUser(profile) {
  currentAccessUser = profile || null;
  updateSessionLabel();
}

function updateSessionLabel() {
  const label = elements.sessionPanel?.querySelector("#adminSessionLabel");
  if (!label) return;
  label.textContent = adminProfileName(currentAccessUser) || "Profil LivePalmes";
}

async function loadCurrentAccessUser() {
  if (currentAccessUser || currentAccessUserLoading) return;
  const functions = functionsService();
  if (!functions?.httpsCallable) return;
  currentAccessUserLoading = true;
  try {
    const result = await functions.httpsCallable("getCurrentAccessUser")({});
    setCurrentAccessUser(result.data || null);
  } catch {
    setCurrentAccessUser(null);
  } finally {
    currentAccessUserLoading = false;
  }
}

function ensureAdminAuth() {
  if (adminAuth) return adminAuth;
  const firebase = ensureFirebase();
  if (!firebase || !window.LivePalmesAdminAuth?.init) return null;
  adminAuth = window.LivePalmesAdminAuth.init({
    firebase,
    authConfig: window.LivePalmesAppConfig?.adminAuth || {},
    requiredCapability: "records.manage"
  });
  adminAuth.onChange(updateAuthView);
  return adminAuth;
}

function updateAuthView(nextStatus) {
  const status = nextStatus || ensureAdminAuth()?.status?.() || {};
  const signedIn = Boolean(status.signedIn);
  const authView = elements.loginPanel ? document.body : document.querySelector("#adminRecordsView");
  if (authView) authView.dataset.adminAuth = !status.ready ? "loading" : (signedIn ? "unlocked" : "locked");
  if (elements.loginPanel) elements.loginPanel.hidden = signedIn;
  if (elements.sessionPanel) elements.sessionPanel.hidden = !signedIn;
  if (signedIn) {
    if (status.profile) setCurrentAccessUser(status.profile);
    updateSessionLabel();
    loadCurrentAccessUser();
  } else {
    setCurrentAccessUser(null);
  }
  if (elements.workbench) elements.workbench.hidden = !signedIn || !recordsDataLoaded;
  if (!signedIn && elements.historyPanel) elements.historyPanel.hidden = true;
  if (signedIn && elements.loginMessage) {
    elements.loginMessage.textContent = status.email ? `Connecté : ${status.email}` : "Connecté";
  } else if (elements.loginMessage && !status.ready) {
    elements.loginMessage.textContent = "";
  }
}

async function startAdmin() {
  const auth = ensureAdminAuth();
  if (!auth) {
    if (elements.loginMessage) elements.loginMessage.textContent = "Firebase Authentication n'est pas disponible.";
    return;
  }
  recordsDataLoaded = false;
  state.scope = "RF";
  state.selectedId = "";
  setSegmentValue(elements.scopeFilter, "RF");
  elements.recordLevelFilter.value = "RF";
  setSexValue("F");
  elements.categoryFilter.value = "";
  elements.courseFilter.value = "";
  updateAuthView();

  const localData = completeRecordsData(await withTimeout(loadLocalRecordsData(), 4000, {}));
  const remoteData = await withTimeout(loadRemoteRecordsData(), 5000, {});
  const firstData = hasRecordData(remoteData) ? mergeRecordsData(localData, remoteData) : localData;
  applyRecordsData(firstData, { loaded: true });

  if (window.LivePalmesPerformanceStore?.loadData) {
    const storeData = await withTimeout(window.LivePalmesPerformanceStore.loadData(), 5000, {});
    if (hasRecordData(storeData)) {
      applyRecordsData(mergeRecordsData(firstData, storeData), { loaded: true });
    }
  }
  applyQueuedRecordAlertDrafts();
}

elements.scopeFilter.querySelectorAll(".segment").forEach((button) => {
  button.addEventListener("click", () => updateScope(button.dataset.value));
});

[elements.recordLevelFilter, elements.sexFilter].forEach((select) => select.addEventListener("input", () => {
  state.selectedId = "";
  elements.categoryFilter.value = "";
  elements.courseFilter.value = "";
  setSexValue(elements.sexFilter.value);
  updateFilterOptions();
  renderTable();
}));
elements.sexToggle?.querySelectorAll("[data-sex]").forEach((button) => {
  button.addEventListener("click", () => {
    setSexValue(button.dataset.sex);
    state.selectedId = "";
    elements.categoryFilter.value = "";
    elements.courseFilter.value = "";
    updateFilterOptions();
    renderTable();
  });
});
[elements.categoryFilter, elements.courseFilter].forEach((select) => {
  select.addEventListener("input", () => {
    state.selectedId = "";
    if (select === elements.categoryFilter && state.scope === "MPF") {
      const rawCategory = elements.categoryFilter.value;
      if (rawCategory.includes("|")) {
      const [sex, category] = rawCategory.split("|");
      setSexValue(sex);
      elements.courseFilter.value = "";
      updateFilterOptions();
      elements.categoryFilter.value = category;
      updateFilterOptions();
    } else if (rawCategory === MASTER_RELAY_CATEGORY) {
      setSexValue("M");
      elements.courseFilter.value = "";
      updateFilterOptions();
      elements.categoryFilter.value = MASTER_RELAY_CATEGORY;
      updateFilterOptions();
    }
    }
    renderTable();
  });
});
[elements.kindFilter].forEach((select) => {
  select.addEventListener("input", renderTable);
});
elements.fieldTime.addEventListener("blur", () => {
  elements.fieldTime.value = normalizeTimeInput(elements.fieldTime.value);
  updateMpfSyncAlert();
});
[elements.fieldName, elements.fieldClub]
  .forEach((field) => field.addEventListener("input", () => updateBirthDateField()));
[elements.fieldBirthDate].filter(Boolean)
  .forEach((field) => field.addEventListener("blur", () => {
    field.value = normalizeBirthDateInput(field.value) || field.value.trim();
  }));
[elements.fieldTime, elements.fieldName, elements.fieldClub, elements.fieldDate, elements.fieldLocation]
  .forEach((field) => field.addEventListener("input", updateMpfSyncAlert));
elements.saveDraft.addEventListener("click", () => saveDraft("Brouillon"));
elements.saveTieDraft?.addEventListener("click", () => saveTieDraft("Brouillon"));
elements.deleteDraft?.addEventListener("click", deleteSelectedRecordDraft);
elements.validate.addEventListener("click", () => saveDraft("Validé"));
elements.newRecord?.addEventListener("click", createRecord);
elements.publish.addEventListener("click", publishDrafts);
elements.draftsPublish?.addEventListener("click", publishDrafts);
elements.historyButton?.addEventListener("click", () => {
  elements.historyPanel.hidden = !elements.historyPanel.hidden;
  renderHistoryPanel();
});
elements.historyClose?.addEventListener("click", () => {
  elements.historyPanel.hidden = true;
});
elements.signOut?.addEventListener("click", async () => {
  updateAuthView({ signedIn: false, ready: true });
  await ensureAdminAuth()?.signOut?.();
  updateAuthView({ signedIn: false, ready: true });
});
elements.resetPassword?.addEventListener("click", async () => {
  try {
    await ensureAdminAuth()?.sendPasswordReset?.(elements.loginEmail.value);
    elements.loginMessage.textContent = "Email de réinitialisation envoyé.";
  } catch (error) {
    elements.loginMessage.textContent = error?.message || String(error);
  }
});
elements.loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    elements.loginMessage.textContent = "Connexion...";
    await ensureAdminAuth()?.signIn?.(elements.loginEmail.value, elements.loginPassword.value);
    elements.loginPassword.value = "";
    updateAuthView();
  } catch (error) {
    elements.loginMessage.textContent = error?.message || String(error);
  }
});

startAdmin();
