const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const PROJECT_ID = "livepalmes";
const DATABASE = "(default)";
const COLLECTION = "engagementCalendarEvents";

const TYPE_BY_CATEGORY = {
  Formation: "training",
  Stage: "stage",
  "Réunion": "meeting",
  "Eau libre": "openWater"
};

const NORMAL_CATEGORY_PATTERNS = [
  ["Formation", /formation|initiateur|juge|chronom|recyclage|[ée]valuateur|sauv.?nage|\bief\b/i],
  ["Stage", /stage|d[ée]tection/i],
  ["Réunion", /r[ée]union|assembl[ée]e|colloque|s[ée]minair/i],
  ["Eau libre", /travers[ée]|descente|ronde|boucle|baie|longue[ -]?distance|\bld\b|eaux?[ -]?libres?|rivage|cap naio|viree|open swim stars|plan d'eau|lacs?\b/i]
];

const CLASSIFICATION_CATEGORY = {
  "title-training": "Formation",
  "title-stage": "Stage",
  "title-meeting": "Réunion"
};

function valueAfter(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] || "" : "";
}

function fieldsFor(values) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => {
    if (typeof value === "number") return [key, { integerValue: String(value) }];
    return [key, { stringValue: String(value || "") }];
  }));
}

function firebaseAccessToken() {
  const output = execFileSync("cmd.exe", ["/c", "firebase.cmd", "login:list", "--json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const token = JSON.parse(output).result?.[0]?.tokens?.access_token;
  if (!token) throw new Error("Connexion Firebase CLI introuvable. Exécutez firebase login puis relancez.");
  return token;
}

async function commitWrite(write, token) {
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${encodeURIComponent(DATABASE)}/documents:commit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ writes: [write] })
  });
  if (response.ok) return;
  throw new Error(`Écriture Firestore impossible (${response.status}) : ${(await response.text()).slice(0, 800)}`);
}

function categoryFor(competition) {
  const text = [competition.name, competition.city, competition.description].join(" ");
  return CLASSIFICATION_CATEGORY[competition.eventTypeClassification]
    || NORMAL_CATEGORY_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0]
    || "";
}

async function main() {
  const input = path.resolve(valueAfter("--input") || "outputs/legacy-calendar-history-corrected-preview.json");
  const performanceInput = path.resolve(valueAfter("--performances") || "outputs/performance-base-firestore-active.ndjson");
  const write = process.argv.includes("--write");
  const expectedCount = Number(valueAfter("--confirm"));
  const delayMs = Math.max(0, Number.parseInt(valueAfter("--delay-ms"), 10) || 0);
  const performanceCompetitionIds = new Set();
  for (const line of fs.readFileSync(performanceInput, "utf8").split(/\r?\n/)) {
    if (!line) continue;
    const performance = JSON.parse(line);
    if (performance.status === "active" && !performance.isIntermediate && performance.competitionId) performanceCompetitionIds.add(String(performance.competitionId));
  }
  const preview = JSON.parse(fs.readFileSync(input, "utf8"));
  const corrections = (preview.competitions || [])
    .filter((competition) => competition.importEligible !== false && competition.eventType === "pool")
    .filter((competition) => !performanceCompetitionIds.has(String(competition.legacyCompetitionId)))
    .map((competition) => ({ competition, category: categoryFor(competition) }))
    .filter(({ category }) => TYPE_BY_CATEGORY[category])
    .map(({ competition, category }) => ({
      id: `legacy-nap-${competition.legacyCompetitionId}`,
      name: competition.name,
      date: competition.date,
      category,
      eventType: TYPE_BY_CATEGORY[category]
    }));
  const summary = {
    mode: write ? "write" : "dry-run",
    correctionCount: corrections.length,
    countsByTargetType: Object.fromEntries(Object.entries(TYPE_BY_CATEGORY).map(([category, eventType]) => [eventType, corrections.filter((item) => item.category === category).length])),
    samples: corrections.slice(0, 12)
  };
  if (!write) return console.log(JSON.stringify(summary, null, 2));
  if (expectedCount !== corrections.length) throw new Error(`Confirmation explicite requise : ajoutez --confirm ${corrections.length}.`);
  const token = firebaseAccessToken();
  const updatedAt = new Date().toISOString();
  for (let index = 0; index < corrections.length; index += 1) {
    const correction = corrections[index];
    const values = {
      eventType: correction.eventType,
      poolLength: "",
      poolLaneCount: 0,
      timingType: "",
      updatedAt,
      updatedBy: "legacy-calendar-noncompetitive-types-repair"
    };
    const fields = fieldsFor(values);
    await commitWrite({
      update: { name: `projects/${PROJECT_ID}/databases/${DATABASE}/documents/${COLLECTION}/${correction.id}`, fields },
      updateMask: { fieldPaths: Object.keys(fields) },
      currentDocument: { exists: true }
    }, token);
    console.log(`Correction Firestore : ${index + 1}/${corrections.length}`);
    if (delayMs && index + 1 < corrections.length) await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
