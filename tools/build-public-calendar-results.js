const fs = require("node:fs");
const path = require("node:path");

function valueAfter(flag) { const index = process.argv.indexOf(flag); return index >= 0 ? process.argv[index + 1] || "" : ""; }
const input = path.resolve(valueAfter("--input") || "outputs/performance-base-firestore-active.ndjson");
const previewPath = path.resolve(valueAfter("--calendar") || "outputs/legacy-calendar-history-corrected-preview.json");
const output = path.resolve(valueAfter("--output") || "outputs/public-calendar-results");
const preview = JSON.parse(fs.readFileSync(previewPath, "utf8"));
const events = new Map((preview.competitions || []).filter((event) => event.importEligible !== false && event.eventType === "pool").map((event) => [String(event.legacyCompetitionId), event]));
const groupsByCompetition = new Map();
for (const line of fs.readFileSync(input, "utf8").split(/\r?\n/)) {
  if (!line) continue;
  const performance = JSON.parse(line);
  const competitionId = String(performance.competitionId || "");
  if (!events.has(competitionId) || performance.status !== "active" || performance.isIntermediate || !performance.time) continue;
  const groupKey = `${performance.courseShortLabel || performance.course || "Épreuve"}|${performance.sex || "X"}`;
  if (!groupsByCompetition.has(competitionId)) groupsByCompetition.set(competitionId, new Map());
  const groups = groupsByCompetition.get(competitionId);
  if (!groups.has(groupKey)) groups.set(groupKey, { eventLabel: performance.courseLabel || performance.courseShortLabel || performance.course || "Épreuve", sexLabel: performance.sex === "F" ? "Femmes" : performance.sex === "M" ? "Hommes" : "Mixte", performances: [] });
  groups.get(groupKey).performances.push({ swimmer: performance.swimmer || "", club: performance.club || performance.clubName || "", category: performance.category || "", categoryLabel: performance.categoryLabel || performance.category || "", time: performance.time || "", timeValue: Number(performance.timeValue) || 0, date: performance.date || "" });
}
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
const manifest = [];
for (const [competitionId, groups] of groupsByCompetition) {
  const event = events.get(competitionId);
  const payload = { version: 1, competitionId, updatedAt: new Date().toISOString(), groups: [...groups.values()].map((group) => ({ ...group, performances: group.performances.sort((left, right) => left.timeValue - right.timeValue || left.swimmer.localeCompare(right.swimmer, "fr")).map(({ timeValue, date, ...performance }) => performance) })) };
  const file = path.join(output, `legacy-nap-${competitionId}.json`);
  const json = `${JSON.stringify(payload)}\n`;
  fs.writeFileSync(file, json, "utf8");
  manifest.push({ id: `legacy-nap-${competitionId}`, date: event.date, name: event.name, groups: payload.groups.length, performances: payload.groups.reduce((total, group) => total + group.performances.length, 0), bytes: Buffer.byteLength(json) });
}
fs.writeFileSync(path.join(output, "manifest.json"), `${JSON.stringify(manifest.sort((left, right) => left.date.localeCompare(right.date)), null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output, eventCount: manifest.length, performanceCount: manifest.reduce((total, item) => total + item.performances, 0), largest: [...manifest].sort((left, right) => right.bytes - left.bytes).slice(0, 5) }, null, 2));
