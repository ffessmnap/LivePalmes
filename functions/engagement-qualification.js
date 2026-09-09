"use strict";

// Pure sporting decisions: no Firestore reads, no writes, no client assertions.
const { cleanTimingType } = require("./performance-import-timing");
const calendarAssociations = require("./config/calendar-result-associations.json");
const CATEGORIES = ["P", "B", "M", "C", "J", "S", "M30+", "M40+", "M50+", "M60+", "M70+", "M80+"];
const text = (value) => String(value || "").trim();
const key = (category, sex, course) => [category, sex, course].join("|");
const unique = (values) => [...new Set(values)];
const date = (value) => { const parsed = new Date(value); return /^\d{4}-\d{2}-\d{2}$/.test(text(value)) && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value; };

function validateRules(raw, events = [], requireComplete = false) {
  if (!raw || raw.enabled !== true) return { enabled: false, groups: [], standards: {} };
  if (!Array.isArray(raw.groups) || !raw.groups.length || raw.groups.length > CATEGORIES.length) throw new Error("Définissez les groupes de catégories.");
  const covered = new Set();
  const groups = raw.groups.map((group, index) => {
    const categories = unique(Array.isArray(group.categories) ? group.categories : []);
    if (!categories.length || categories.some((category) => !CATEGORIES.includes(category) || covered.has(category))) throw new Error("Chaque catégorie doit appartenir à un seul groupe.");
    categories.forEach((category) => covered.add(category));
    if (!["each", "one"].includes(group.mode)) throw new Error("Mode de qualification invalide.");
    if (!date(group.startDate) || !date(group.endDate) || group.startDate > group.endDate) throw new Error("Période de qualification invalide.");
    const pools = unique((group.pools || []).map(String));
    if (!pools.length || pools.some((pool) => !["25", "50"].includes(pool))) throw new Error("Choisissez les bassins 25 et/ou 50 m.");
    if (!["all", "selected"].includes(group.competitionMode)) throw new Error("Sélection des compétitions invalide.");
    const competitionIds = unique((group.competitionIds || []).map(text).filter(Boolean));
    if (competitionIds.length > 200 || competitionIds.some((id) => id.length > 160) || (group.competitionMode === "selected" && !competitionIds.length)) throw new Error("Sélectionnez les compétitions qualificatives.");
    return { id: String(index + 1), label: text(group.label).slice(0, 80) || categories.join(", "), categories, mode: group.mode,
      startDate: group.startDate, endDate: group.endDate, electronicOnly: group.electronicOnly !== false, pools, competitionMode: group.competitionMode,
      competitionIds: group.competitionMode === "selected" ? competitionIds : [], bonusRequiresSelectedCompetition: group.mode === "one" && group.bonusRequiresSelectedCompetition === true };
  });
  const standards = {};
  for (const [id, value] of Object.entries(raw.standards || {})) {
    const [category, sex, course, extra] = id.split("|");
    if (extra || !CATEGORIES.includes(category) || !["F", "M"].includes(sex) || !/^[A-Z0-9]+$/.test(course || "")) throw new Error("Ligne de grille invalide.");
    if (value !== null && (!Number.isInteger(value) || value <= 0 || value >= 359999)) throw new Error("Minimum invalide : utilisez un temps positif ou Sans minimum.");
    standards[id] = value;
  }
  if (Object.keys(standards).length > 3000) throw new Error("Grille trop volumineuse.");
  if (requireComplete) {
    for (const event of events.filter((item) => item.type === "individual")) {
      for (const category of event.categories || []) {
        if (!covered.has(category)) throw new Error(`Aucun groupe pour la catégorie ${category}.`);
        for (const sex of ["F", "M"]) {
          if (!Object.prototype.hasOwnProperty.call(standards, key(category, sex, event.code))) throw new Error(`Grille incomplète : ${category} ${sex} ${event.code}.`);
        }
      }
    }
  }
  return { enabled: true, groups, standards };
}

function selectedCompetition(row, ids) {
  if (ids.includes(text(row.competitionId)) || (row.qualificationCompetitionId && ids.includes(text(row.qualificationCompetitionId)))) return true;
  return [row.competitionId, row.qualificationCompetitionId].flatMap((id) => calendarAssociations[text(id)] || []).some((rule) => ids.includes(rule.calendarCompetitionId) &&
    (!rule.categoryKind || (rule.categoryKind === "master" && /^M\d+\+$/.test(text(row.category))) || (rule.categoryKind === "minime" && row.category === "M")));
}

function admissible(row, group, selectedRequired = true) {
  const pool = text(row.pool).replace(/\s*m$/i, "");
  return row.active !== false && !["hidden", "deleted"].includes(row.status) && Number.isInteger(row.timeValue) && row.timeValue > 0 &&
    row.timeValue < 359999 && date(row.date) && row.date >= group.startDate && row.date <= group.endDate &&
    group.pools.includes(pool) && (group.electronicOnly === false || cleanTimingType(row.chrono) === "electronic") &&
    (!selectedRequired || group.competitionMode !== "selected" || selectedCompetition(row, group.competitionIds));
}

function evaluate({ rules, category, sex, events, rows = [], approvals = [] }) {
  if (!rules?.enabled) return { enabled: false, mode: "each", courses: {} };
  const group = rules.groups.find((item) => item.categories.includes(category));
  const byCourse = new Map();
  for (const row of rows) {
    const course = text(row.course).toUpperCase().replace(/\s+/g, "");
    if (!byCourse.has(course)) byCourse.set(course, []);
    byCourse.get(course).push(row);
  }
  const courses = {};
  for (const event of events.filter((item) => item.type === "individual")) {
    const course = event.code;
    const minimum = rules.standards[key(category, sex, course)];
    const open = group && (event.categories || []).includes(category) && ["F", "M"].includes(sex);
    const candidates = open ? (byCourse.get(course) || []).filter((row) => admissible(row, group)) : [];
    const best = candidates.reduce((result, row) => !result || row.timeValue < result.timeValue ? row : result, null);
    const qualified = Boolean(open && Number.isInteger(minimum) && best && best.timeValue <= minimum);
    const bonus = Boolean(open && minimum !== undefined && (byCourse.get(course) || []).some((row) => admissible(row, group, group.mode === "each" || group.bonusRequiresSelectedCompetition)));
    const approved = open && approvals.some((approval) => approval.eventCode === course && approval.status === "accepted");
    courses[course] = { qualified, bonus, approved: Boolean(approved), minimum: minimum === undefined ? "missing" : minimum,
      allowed: Boolean(open && (approved || qualified || (minimum === null && bonus) || (group.mode === "one" && bonus))),
      reason: !open ? "Catégorie non ouverte ou règles absentes." : minimum === undefined ? "Minimum non renseigné." : !best ? "Aucune performance admissible." : !qualified ? "Minimum non réalisé." : "Minimum réalisé.",
      proof: best ? { id: text(best.publicKey || best.performanceBaseId || best.id), competitionId: text(best.competitionId), date: best.date, timeValue: best.timeValue, location: text(best.location) } : null };
  }
  return { enabled: true, mode: group?.mode || "each", courses };
}

function reconcile(entries, evaluation) {
  if (!evaluation.enabled) return { entries, removed: [] };
  const anchor = entries.some((entry) => evaluation.courses[entry.eventCode]?.qualified);
  const kept = [], removed = [];
  for (const entry of entries) {
    const result = evaluation.courses[entry.eventCode];
    const valid = result?.allowed && (evaluation.mode !== "one" || anchor || result.approved);
    (valid ? kept : removed).push(entry);
  }
  return { entries: kept, removed };
}

function relayEligible(relay, swimmers, evaluations) {
  const members = relay.memberIds || [];
  if (!members.length) return true; // Composition deferred to the competition.
  return members.some((id) => (swimmers.find((swimmer) => swimmer.swimmerIndexId === id)?.individualEntries || [])
    .some((entry) => evaluations[id]?.courses[entry.eventCode]?.qualified));
}

module.exports = { CATEGORIES, key, validateRules, admissible, evaluate, reconcile, relayEligible };
