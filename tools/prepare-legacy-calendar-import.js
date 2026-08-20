const fs = require("node:fs");
const path = require("node:path");

const LEGACY_BASE_URL = "https://nap.ffessm.fr/";
const LEVELS = {
  "Départementale": "departemental",
  "Régionale": "regional",
  Nationale: "national",
  International: "international"
};
const LEGACY_LEVELS_BY_ID = {
  0: "departemental",
  1: "regional",
  2: "national",
  3: "regional",
  4: "national",
  5: "national",
  6: "regional",
  7: "national",
  8: "international"
};
const EVENT_TYPES = {
  Piscine: "pool",
  "Eau libre": "openWater",
  Formation: "training",
  Stage: "stage",
  "Réunion": "meeting"
};
const SEX_LABELS = { F: "Femmes", M: "Hommes", X: "Mixte" };
const STYLE_LABELS = { SF: "Surface", BI: "Bipalmes", AP: "Apnée", SP: "Support" };
const LEGACY_TIMING_TYPES = { E: "electronic", M: "manual" };
const INTERNATIONAL_LEVEL_PATTERN = /monde|world|europe|cmas|world cup|\bwc\b|berlin|rostock|eindhoven|leipzig|ordizia|gen[eè]ve|li[eè]ge|utrecht|ravenne|hongrie|t[eé]n[eé]ro|lignano|fribourg|olsztyn/i;
const OPEN_WATER_PATTERN = /travers[éee]|descente|ronde|boucle|baie|longue[ -]?distance|\bld\b|eau[ -]?libre/i;
const TRAINING_PATTERN = /formation|initiateur|juge|chronom|recyclage|[ée]valuateur|sauv.?nage/i;
const STAGE_PATTERN = /stage|d[ée]tection/i;
const MEETING_PATTERN = /r[ée]union|assembl[ée]e|colloque|s[ée]minair|date limite/i;
const POOL_TITLE_PATTERN = /inter[ -]?clubs?|piscine/i;
const POOL_LOCATION_PATTERN = /piscine|aqua(?:luna|centre|park|tic)?/i;
const POOL_PROGRAM_PATTERN = /^\d+(?:AP|BI|SF|SP|IS)$/i;

function mappedLevel(row = {}) {
  const directLevel = LEVELS[row.niveau_label] || LEGACY_LEVELS_BY_ID[Number.parseInt(row.niveau_id, 10)];
  if (directLevel) return directLevel;
  return INTERNATIONAL_LEVEL_PATTERN.test(`${row.competition_nom || ""} ${row.lieu || ""}`) ? "international" : "regional";
}

function typeFromTitle(row = {}) {
  const text = `${row.competition_nom || ""} ${row.description || ""}`;
  if (OPEN_WATER_PATTERN.test(text)) return { eventType: "openWater", reason: "title-open-water" };
  if (TRAINING_PATTERN.test(text)) return { eventType: "training", reason: "title-training" };
  if (STAGE_PATTERN.test(text)) return { eventType: "stage", reason: "title-stage" };
  if (MEETING_PATTERN.test(text)) return { eventType: "meeting", reason: "title-meeting" };
  if (POOL_TITLE_PATTERN.test(text)) return { eventType: "pool", reason: "title-pool" };
  if (POOL_LOCATION_PATTERN.test(String(row.lieu || ""))) return { eventType: "pool", reason: "location-pool" };
  return { eventType: "", reason: "" };
}

function typeFromProgram(rows = []) {
  const courses = rows.map((row) => String(row.epreuve || "").trim());
  if (courses.some((course) => /\d\s*,?\d*\s*KM/i.test(course) || Number.parseInt(course, 10) >= 2000)) return { eventType: "openWater", reason: "program-open-water" };
  if (courses.some((course) => POOL_PROGRAM_PATTERN.test(course))) return { eventType: "pool", reason: "program-pool" };
  return { eventType: "", reason: "" };
}

function valueAfter(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] || "" : "";
}

function parseCsv(text) {
  const rows = [];
  let row = [], value = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') { value += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else value += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") { row.push(value); value = ""; }
    else if (character === "\n") { row.push(value); rows.push(row); row = []; value = ""; }
    else if (character !== "\r") value += character;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  const [header = [], ...data] = rows;
  return data.filter((item) => item.some(Boolean)).map((item) => Object.fromEntries(header.map((key, index) => [key, String(item[index] || "").trim()])));
}

function publicUrl(relativePath) {
  const clean = String(relativePath || "").replace(/^\/+/, "").replace(/#/g, "%23").replace(/\?/g, "%3F");
  return clean ? new URL(clean, LEGACY_BASE_URL).href : "";
}

function programItem(row) {
  const course = String(row.epreuve || "").trim();
  const encodedStyle = course.match(/^(\d+)(AP|BI|SF|SP)$/i);
  const humanDistance = encodedStyle
    ? `${encodedStyle[1]} m ${STYLE_LABELS[encodedStyle[2].toUpperCase()].toLowerCase()}`
    : /^\d+$/.test(course) ? `${course} m` : course;
  const style = String(row.style || "").toUpperCase();
  const details = [
    SEX_LABELS[String(row.sexe || "").toUpperCase()] || row.sexe,
    encodedStyle ? "" : STYLE_LABELS[style] || row.style,
    String(row.relais) === "1" ? "Relais" : ""
  ].filter(Boolean);
  return {
    order: Number.parseInt(row.ordre, 10) || 0,
    label: humanDistance || "Épreuve",
    detail: details.join(" · ")
  };
}

const input = valueAfter("--input");
const programInput = valueAfter("--program");
const practicalInput = valueAfter("--practical");
const output = valueAfter("--output") || path.resolve("outputs", "legacy-calendar-import-preview.json");
if (!input) throw new Error("Utilisation : node tools/prepare-legacy-calendar-import.js --input <competitions.csv> [--program <programme.csv>] [--practical <informations.csv>] [--output <preview.json>]");

const rows = parseCsv(fs.readFileSync(path.resolve(input), "utf8"));
const byCompetition = new Map();
for (const row of rows) {
  const id = row.competition_id;
  if (!id) continue;
  if (!byCompetition.has(id)) {
    const level = mappedLevel(row);
    const directEventType = EVENT_TYPES[row.type_label] || (String(row.type_id) === "6" ? "openWater" : "");
    const titleType = directEventType ? { eventType: directEventType, reason: "legacy-type" } : typeFromTitle(row);
    const eventType = titleType.eventType || "other";
    byCompetition.set(id, {
      legacyCompetitionId: id,
      name: row.competition_nom,
      date: row.date,
      endDate: row.enddate || row.date,
      location: row.lieu,
      city: row.lieu,
      level,
      eventType,
      eventTypeClassification: titleType.reason || "unresolved",
      legacyTypeLabel: row.type_label || "",
      legacyLevelLabel: row.niveau_label,
      legacyLevelId: row.niveau_id || "",
      legacyTypeId: row.type_id || "",
      regionId: level === "national" || level === "international" ? "" : row.comite,
      organizerLegacyId: row.organisateur,
      poolLength: "",
      poolLaneCount: 0,
      timingType: "",
      description: row.description,
      documents: []
    });
  }
  if (row.document_id && row.document_chemin) {
    byCompetition.get(id).documents.push({
      legacyDocumentId: row.document_id,
      title: row.document_nom || "Document officiel",
      type: row.document_type,
      description: row.document_comment,
      date: row.document_date,
      legacyPath: row.document_chemin,
      url: publicUrl(row.document_chemin)
    });
  }
}

const unmatchedPracticalCompetitionIds = [];
if (practicalInput) {
  const practicalRows = parseCsv(fs.readFileSync(path.resolve(practicalInput), "utf8"));
  for (const row of practicalRows) {
    const competition = byCompetition.get(row.competition_id);
    if (!competition) {
      unmatchedPracticalCompetitionIds.push(row.competition_id);
      continue;
    }
    if (competition.eventType !== "pool") continue;
    const poolLength = String(row.longueur_bassin || "").trim();
    const poolLaneCount = Number.parseInt(row.nombre_lignes, 10);
    competition.poolLength = ["25", "33", "50"].includes(poolLength) ? poolLength : "";
    competition.poolLaneCount = Number.isInteger(poolLaneCount) && poolLaneCount >= 4 && poolLaneCount <= 10 ? poolLaneCount : 0;
    competition.timingType = LEGACY_TIMING_TYPES[String(row.chrono_ancien || "").trim().toUpperCase()] || "";
  }
}

const unmatchedProgramCompetitionIds = [];
if (programInput) {
  const programRows = parseCsv(fs.readFileSync(path.resolve(programInput), "utf8"));
  const programs = new Map();
  for (const row of programRows) {
    const competition = byCompetition.get(row.competition_id);
    if (!competition) {
      unmatchedProgramCompetitionIds.push(row.competition_id);
      continue;
    }
    if (!programs.has(row.competition_id)) programs.set(row.competition_id, []);
    programs.get(row.competition_id).push(row);
  }
  for (const [competitionId, rowsForCompetition] of programs) {
    const competition = byCompetition.get(competitionId);
    const detectedType = competition.eventType === "other" ? typeFromProgram(rowsForCompetition) : { eventType: "", reason: "" };
    if (detectedType.eventType) {
      competition.eventType = detectedType.eventType;
      competition.eventTypeClassification = detectedType.reason;
    }
    const items = rowsForCompetition.map(programItem);
    competition.program = [{
      title: "Programme des épreuves",
      date: competition.date,
      items: items.sort((left, right) => left.order - right.order).map(({ label, detail }) => ({ label, detail }))
    }];
  }
}

const competitions = [...byCompetition.values()].sort((left, right) => left.date.localeCompare(right.date) || left.name.localeCompare(right.name, "fr"));
competitions.forEach((competition) => {
  const hasResultsProtocol = competition.documents.some((document) => /protocole/i.test(`${document.title || ""} ${document.description || ""}`));
  competition.hasResultsProtocol = hasResultsProtocol;
  competition.importEligible = competition.eventType !== "other" || hasResultsProtocol;
  competition.importExclusionReason = competition.importEligible ? "" : "unclassified-without-results-protocol";
});
const unresolvedLevelCompetitionIds = competitions.filter((competition) => !competition.level).map((competition) => competition.legacyCompetitionId);
const unresolvedTypeCompetitionIds = competitions.filter((competition) => competition.eventType === "other").map((competition) => competition.legacyCompetitionId);
const report = {
  generatedAt: new Date().toISOString(),
  mode: "preview-only",
  source: path.resolve(input),
  competitionCount: competitions.length,
  documentCount: competitions.reduce((total, competition) => total + competition.documents.length, 0),
  programCompetitionCount: competitions.filter((competition) => competition.program?.[0]?.items?.length).length,
  programItemCount: competitions.reduce((total, competition) => total + (competition.program?.[0]?.items?.length || 0), 0),
  unmatchedProgramCompetitionIds: [...new Set(unmatchedProgramCompetitionIds)].sort(),
  practicalCompetitionCount: competitions.filter((competition) => competition.eventType === "pool" && (competition.poolLength || competition.poolLaneCount || competition.timingType)).length,
  unmatchedPracticalCompetitionIds: [...new Set(unmatchedPracticalCompetitionIds)].sort(),
  unresolvedLevelCompetitionIds,
  unresolvedTypeCompetitionIds,
  importEligibleCompetitionCount: competitions.filter((competition) => competition.importEligible).length,
  importExcludedCompetitionIds: competitions.filter((competition) => !competition.importEligible).map((competition) => competition.legacyCompetitionId),
  eventTypeClassificationCounts: Object.fromEntries([...new Set(competitions.map((competition) => competition.eventTypeClassification))].sort().map((reason) => [reason, competitions.filter((competition) => competition.eventTypeClassification === reason).length])),
  countsByLevel: Object.fromEntries(Object.values(LEVELS).map((level) => [level, competitions.filter((item) => item.level === level).length])),
  countsByType: Object.fromEntries([...new Set(competitions.map((item) => item.eventType))].sort().map((eventType) => [eventType, competitions.filter((item) => item.eventType === eventType).length])),
  competitions
};
fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
fs.writeFileSync(path.resolve(output), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output: path.resolve(output), competitionCount: report.competitionCount, documentCount: report.documentCount, countsByLevel: report.countsByLevel }, null, 2));
