const fs = require("node:fs");
const path = require("node:path");

function valueAfter(flag) { const index = process.argv.indexOf(flag); return index >= 0 ? process.argv[index + 1] || "" : ""; }
const input = path.resolve(valueAfter("--input") || "outputs/performance-base-firestore-active.ndjson");
const previewPath = path.resolve(valueAfter("--calendar") || "outputs/legacy-calendar-history-corrected-preview.json");
const output = path.resolve(valueAfter("--output") || "outputs/public-calendar-results");
const onlyCalendarIds = new Set(String(valueAfter("--only") || "").split(",").map((value) => value.trim().replace(/^legacy-nap-/, "")).filter(Boolean));
const preview = JSON.parse(fs.readFileSync(previewPath, "utf8"));
const calendarEvents = Array.isArray(preview) ? preview : (Array.isArray(preview.competitions) ? preview.competitions : (Array.isArray(preview.events) ? preview.events : []));
const events = new Map(calendarEvents.filter((event) => event.importEligible !== false && event.eventType === "pool").map((event) => [String(event.legacyCompetitionId || String(event.id || "").replace(/^legacy-nap-/, "")), event]));
const groupsByCompetition = new Map();
const sourceCompetitionIdsByTarget = new Map();
const resultsPdfUrlsByTarget = new Map();
const personalBests = new Map();
const seasonBests = new Map();
const laRocheSurYonProtocolUrl = "https://nap.ffessm.fr/ged/2026/5132/CNNP_P_06062026_La%20roche-sur-yon_CNNP202606065132.pdf";
const manualResultAssociations = new Map([
  ["e40fe3129ffd5d76286774193a2855ed", [{ calendarCompetitionId: "4980" }]],
  ["d18c4f3dc04b5cc5402f340fe2af1ca5", [
    { calendarCompetitionId: "4981", categoryKind: "master", resultsPdfUrl: laRocheSurYonProtocolUrl },
    { calendarCompetitionId: "5132", categoryKind: "minime" }
  ]]
]);
function updateBest(map, key, timeValue) { if (key && timeValue > 0 && (!map.has(key) || timeValue < map.get(key))) map.set(key, timeValue); }
function matchesAssociation(rule, performance) {
  const category = String(performance.category || "").toUpperCase();
  if (rule.categoryKind === "master") return /^M\d+\+$/.test(category);
  if (rule.categoryKind === "minime") return category === "M";
  return true;
}
function resultAssociations(performance) {
  const sourceCompetitionId = String(performance.competitionId || "");
  const manual = manualResultAssociations.get(sourceCompetitionId);
  const associations = manual ? manual.filter((rule) => matchesAssociation(rule, performance)) : (events.has(sourceCompetitionId) ? [{ calendarCompetitionId: sourceCompetitionId }] : []);
  if (manual && associations.length !== 1) throw new Error(`Rapprochement incomplet ou ambigu pour ${sourceCompetitionId}, catégorie ${performance.category || "vide"}.`);
  return associations.filter((rule) => events.has(rule.calendarCompetitionId) && (!onlyCalendarIds.size || onlyCalendarIds.has(rule.calendarCompetitionId)));
}
function seasonEndYear(performance) {
  if (Number(performance.seasonYear) > 0) return Number(performance.seasonYear);
  const match = String(performance.date || "").match(/^(\d{4})-(\d{2})/);
  if (!match) return 0;
  return Number(match[2]) >= 9 ? Number(match[1]) + 1 : Number(match[1]);
}
for (const line of fs.readFileSync(input, "utf8").split(/\r?\n/)) {
  if (!line) continue;
  const performance = JSON.parse(line);
  if (performance.status !== "active" || performance.isIntermediate || !performance.time) continue;
  const isRelay = Boolean(performance.relayType) || /^4\s*[X×]/i.test(String(performance.courseShortLabel || performance.course || ""));
  const swimmerId = isRelay ? "" : String(performance.swimmerId || "").trim();
  const course = String(performance.course || performance.courseShortLabel || "").trim().toUpperCase();
  const timeValue = Number(performance.timeValue) || 0;
  const personalBestKey = swimmerId && course ? `${swimmerId}|${course}` : "";
  const season = seasonEndYear(performance);
  const seasonBestKey = personalBestKey && season ? `${personalBestKey}|${season}` : "";
  updateBest(personalBests, personalBestKey, timeValue);
  updateBest(seasonBests, seasonBestKey, timeValue);
  const sourceCompetitionId = String(performance.competitionId || "");
  for (const association of resultAssociations(performance)) {
    const competitionId = association.calendarCompetitionId;
    const groupKey = `${performance.courseShortLabel || performance.course || "Épreuve"}|${performance.sex || "X"}`;
    if (!groupsByCompetition.has(competitionId)) groupsByCompetition.set(competitionId, new Map());
    if (!sourceCompetitionIdsByTarget.has(competitionId)) sourceCompetitionIdsByTarget.set(competitionId, new Set());
    sourceCompetitionIdsByTarget.get(competitionId).add(sourceCompetitionId);
    if (association.resultsPdfUrl) resultsPdfUrlsByTarget.set(competitionId, association.resultsPdfUrl);
    const groups = groupsByCompetition.get(competitionId);
    if (!groups.has(groupKey)) groups.set(groupKey, { eventLabel: performance.courseLabel || performance.courseShortLabel || performance.course || "Épreuve", sexLabel: performance.sex === "F" ? "Femmes" : performance.sex === "M" ? "Hommes" : "Mixte", performances: [] });
    groups.get(groupKey).performances.push({ swimmer: performance.swimmer || "", swimmerId, isRelay, club: performance.club || performance.clubName || "", category: performance.category || "", categoryLabel: performance.categoryLabel || performance.category || "", time: performance.time || "", timeValue, date: performance.date || "", personalBestKey, seasonBestKey });
  }
}
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
const manifest = [];
for (const [competitionId, groups] of groupsByCompetition) {
  const event = events.get(competitionId);
  const sourceCompetitionIds = [...(sourceCompetitionIdsByTarget.get(competitionId) || [])];
  const payload = { version: 2, competitionId, sourceCompetitionIds, updatedAt: new Date().toISOString(), groups: [...groups.values()].map((group) => ({ ...group, performances: group.performances.sort((left, right) => left.timeValue - right.timeValue || left.swimmer.localeCompare(right.swimmer, "fr")).map(({ timeValue, date, personalBestKey, seasonBestKey, ...performance }) => ({ ...performance, personalBest: Boolean(personalBestKey) && personalBests.get(personalBestKey) === timeValue, seasonBest: Boolean(seasonBestKey) && seasonBests.get(seasonBestKey) === timeValue })) })) };
  const calendarId = String(event.id || `legacy-nap-${competitionId}`);
  const file = path.join(output, `${calendarId}.json`);
  const json = `${JSON.stringify(payload)}\n`;
  fs.writeFileSync(file, json, "utf8");
  const performances = payload.groups.flatMap((group) => group.performances);
  manifest.push({ id: calendarId, date: event.date, name: event.name, sourceCompetitionIds, groups: payload.groups.length, performances: performances.length, personalBests: performances.filter((performance) => performance.personalBest).length, seasonBests: performances.filter((performance) => performance.seasonBest).length, resultsPdfUrl: resultsPdfUrlsByTarget.get(competitionId) || "", bytes: Buffer.byteLength(json) });
}
fs.writeFileSync(path.join(output, "manifest.json"), `${JSON.stringify(manifest.sort((left, right) => left.date.localeCompare(right.date)), null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output, eventCount: manifest.length, performanceCount: manifest.reduce((total, item) => total + item.performances, 0), largest: [...manifest].sort((left, right) => right.bytes - left.bytes).slice(0, 5) }, null, 2));
