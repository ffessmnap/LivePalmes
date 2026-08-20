const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const BUCKET = "livepalmes-public-data-718081132564";
const BASE_URL = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(BUCKET)}/o`;
const UPLOAD_BASE_URL = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(BUCKET)}/o`;

function valueAfter(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] || "" : "";
}

function firebaseAccessToken() {
  const output = execFileSync("cmd.exe", ["/c", "firebase.cmd", "login:list", "--json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const token = JSON.parse(output).result?.[0]?.tokens?.access_token;
  if (!token) throw new Error("Connexion Firebase CLI introuvable. Exécutez firebase login puis relancez.");
  return token;
}

function objectUrl(name, suffix = "") {
  return `${BASE_URL}/${encodeURIComponent(name)}${suffix}`;
}

async function readObject(name, token) {
  const metadataResponse = await fetch(objectUrl(name), { headers: { Authorization: `Bearer ${token}` } });
  if (metadataResponse.status === 404) return null;
  if (!metadataResponse.ok) throw new Error(`Lecture Storage impossible (${metadataResponse.status}) : ${name}`);
  const metadata = await metadataResponse.json();
  const contentResponse = await fetch(objectUrl(name, `?alt=media&cacheBust=${Date.now()}`), { headers: { Authorization: `Bearer ${token}` } });
  if (!contentResponse.ok) throw new Error(`Lecture Storage impossible (${contentResponse.status}) : ${name}`);
  return { generation: String(metadata.generation), payload: await contentResponse.json() };
}

async function writeObject(name, payload, generation, token) {
  const query = `?uploadType=media&name=${encodeURIComponent(name)}&ifGenerationMatch=${encodeURIComponent(generation)}`;
  const response = await fetch(`${UPLOAD_BASE_URL}${query}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300" },
    body: JSON.stringify(payload)
  });
  if (response.ok) return;
  throw new Error(`Écriture Storage impossible (${response.status}) : ${name}`);
}

async function main() {
  const input = path.resolve(valueAfter("--input") || path.join("outputs", "legacy-calendar-import-preview.json"));
  const write = process.argv.includes("--write");
  const preview = JSON.parse(fs.readFileSync(input, "utf8"));
  const competitions = preview.competitions.filter((competition) => competition.eventType === "pool");
  if (!write) return console.log(JSON.stringify({ mode: "dry-run", candidateCount: competitions.length }, null, 2));
  const token = firebaseAccessToken();
  const entries = [];
  const missingEventIds = [];
  for (const competition of competitions) {
    const id = `legacy-nap-${competition.legacyCompetitionId}`;
    const object = await readObject(`calendar/events/${id}.json`, token);
    if (!object) {
      missingEventIds.push(id);
      continue;
    }
    entries.push({ id, object, competition });
  }
  const confirmed = Number(valueAfter("--confirm"));
  if (confirmed !== entries.length) throw new Error(`Confirmation explicite requise : ajoutez --confirm ${entries.length}.`);
  for (const { id, object, competition } of entries) {
    await writeObject(`calendar/events/${id}.json`, {
      ...object.payload,
      poolLength: competition.poolLength,
      poolLaneCount: competition.poolLaneCount,
      timingType: competition.timingType
    }, object.generation, token);
  }
  console.log(JSON.stringify({ publishedCount: entries.length, missingEventIds }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
