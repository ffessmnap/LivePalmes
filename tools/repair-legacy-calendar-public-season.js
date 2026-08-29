const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const BUCKET = "livepalmes-public-data-718081132564";
const END_YEAR = 2026;
const BASE_URL = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(BUCKET)}/o`;
const UPLOAD_BASE_URL = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(BUCKET)}/o`;

function valueAfter(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] || "" : "";
}

function cleanText(value, maxLength = 0) {
  const text = String(value || "").trim();
  return maxLength ? text.slice(0, maxLength) : text;
}

function firebaseAccessToken() {
  const output = execFileSync("cmd.exe", ["/c", "firebase.cmd", "login:list", "--json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const payload = JSON.parse(output);
  const token = payload.result?.[0]?.tokens?.access_token;
  if (!token) throw new Error("Connexion Firebase CLI introuvable. Exécutez firebase login puis relancez.");
  return token;
}

function objectUrl(name, suffix = "") {
  return `${BASE_URL}/${encodeURIComponent(name)}${suffix}`;
}

async function readJson(name, token) {
  const response = await fetch(objectUrl(name, `?alt=media&cacheBust=${Date.now()}`), { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Lecture Storage impossible (${response.status}) : ${name}`);
  return response.json();
}

async function objectGeneration(name, token) {
  const response = await fetch(objectUrl(name), { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Lecture des métadonnées Storage impossible (${response.status}) : ${name}`);
  const metadata = await response.json();
  return String(metadata.generation || "0");
}

async function writeJson(name, payload, token) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const generation = await objectGeneration(name, token);
    const query = `?uploadType=media&name=${encodeURIComponent(name)}&ifGenerationMatch=${encodeURIComponent(generation)}`;
    const response = await fetch(`${UPLOAD_BASE_URL}${query}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=utf-8", "Cache-Control": name.endsWith("manifest.json") ? "no-store, max-age=0" : "public, max-age=300" },
      body: JSON.stringify(payload)
    });
    if (response.ok) return;
    if (response.status !== 412 || attempt === 4) {
      throw new Error(`Écriture Storage impossible (${response.status}) : ${name}`);
    }
  }
}

function summaryFromDetail(detail = {}) {
  return {
    id: cleanText(detail.id, 128),
    sourceType: "calendarEvent",
    name: cleanText(detail.name, 160),
    date: cleanText(detail.date, 10),
    endDate: cleanText(detail.endDate || detail.date, 10),
    city: cleanText(detail.city, 120),
    eventType: cleanText(detail.eventType, 40),
    level: cleanText(detail.level, 40),
    regionId: cleanText(detail.regionId, 80),
    regionLabel: cleanText(detail.regionLabel, 80),
    canceled: detail.canceled === true,
    publicationStatus: "published",
    resultsPublishedAt: cleanText(detail.results?.publishedAt, 40),
    documentCount: Array.isArray(detail.documents) ? detail.documents.length : 0,
    updatedAt: cleanText(detail.updatedAt, 40)
  };
}

async function main() {
  const input = path.resolve(valueAfter("--input") || path.join("outputs", "legacy-calendar-import-preview.json"));
  const write = process.argv.includes("--write");
  const preview = JSON.parse(fs.readFileSync(input, "utf8"));
  const expectedIds = preview.competitions.map((competition) => `legacy-nap-${cleanText(competition.legacyCompetitionId, 80)}`);
  const expectedCount = Number(valueAfter("--confirm"));
  if (!write) {
    console.log(JSON.stringify({ mode: "dry-run", endYear: END_YEAR, expectedLegacyEvents: expectedIds.length }, null, 2));
    return;
  }
  if (expectedCount !== expectedIds.length) throw new Error(`Confirmation explicite requise : ajoutez --confirm ${expectedIds.length}.`);
  const token = firebaseAccessToken();
  const seasonPath = `calendar/seasons/${END_YEAR}.json`;
  const manifestPath = "calendar/manifest.json";
  const [season, manifest, details] = await Promise.all([
    readJson(seasonPath, token),
    readJson(manifestPath, token),
    Promise.all(expectedIds.map((id) => readJson(`calendar/events/${id}.json`, token)))
  ]);
  const historicalEvents = details.map(summaryFromDetail);
  if (historicalEvents.some((event) => !event.id || event.publicationStatus !== "published")) {
    throw new Error("Au moins une fiche historique publique est incomplète.");
  }
  const events = [
    ...(Array.isArray(season.events) ? season.events : []).filter((event) => !String(event.id || "").startsWith("legacy-nap-")),
    ...historicalEvents
  ].sort((left, right) => cleanText(left.date).localeCompare(cleanText(right.date)) || cleanText(left.name).localeCompare(cleanText(right.name), "fr"));
  const now = new Date().toISOString();
  const repairedSeason = { ...season, version: 1, eventCount: events.length, events, updatedAt: now, sourceUpdatedAt: now };
  const seasons = Array.isArray(manifest.seasons) ? manifest.seasons : [];
  const seasonEntry = {
    startYear: END_YEAR - 1,
    endYear: END_YEAR,
    label: `${END_YEAR - 1}-${END_YEAR}`,
    path: seasonPath,
    eventCount: events.length,
    updatedAt: now
  };
  const repairedManifest = {
    version: 1,
    updatedAt: now,
    seasons: [...seasons.filter((entry) => Number(entry.endYear) !== END_YEAR), seasonEntry]
      .sort((left, right) => Number(right.endYear) - Number(left.endYear))
  };
  await writeJson(seasonPath, repairedSeason, token);
  await writeJson(manifestPath, repairedManifest, token);
  console.log(JSON.stringify({ endYear: END_YEAR, eventCount: events.length, legacyEventCount: historicalEvents.length }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
