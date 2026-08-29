const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { importedEvent } = require("./import-legacy-calendar-to-firestore");

const PROJECT_ID = "livepalmes";
const DATABASE = "(default)";
const COLLECTION = "engagementCalendarEvents";

function valueAfter(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] || "" : "";
}

function firestoreValue(value) {
  if (typeof value === "number") return { integerValue: String(value) };
  return { stringValue: String(value || "") };
}

function firebaseAccessToken() {
  const output = execFileSync("cmd.exe", ["/c", "firebase.cmd", "login:list", "--json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const token = JSON.parse(output).result?.[0]?.tokens?.access_token;
  if (!token) throw new Error("Connexion Firebase CLI introuvable. Exécutez firebase login puis relancez.");
  return token;
}

function updateWrite(event, now) {
  const payload = {
    poolLength: event.poolLength,
    poolLaneCount: event.poolLaneCount,
    timingType: event.timingType,
    updatedAt: now,
    updatedBy: "legacy-practical-data"
  };
  return {
    update: {
      name: `projects/${PROJECT_ID}/databases/${DATABASE}/documents/${COLLECTION}/${event.id}`,
      fields: Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, firestoreValue(value)]))
    },
    updateMask: { fieldPaths: Object.keys(payload) },
    currentDocument: { exists: true }
  };
}

async function commit(writes, token) {
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${encodeURIComponent(DATABASE)}/documents:commit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ writes })
  });
  if (response.ok) return;
  throw new Error(`Mise à jour Firestore impossible (${response.status}) : ${(await response.text()).slice(0, 800)}`);
}

async function eventExists(event, token) {
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${encodeURIComponent(DATABASE)}/documents/${COLLECTION}/${event.id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (response.status === 404) return false;
  if (response.ok) return true;
  throw new Error(`Lecture Firestore impossible (${response.status}) pour ${event.id} : ${(await response.text()).slice(0, 400)}`);
}

async function main() {
  const input = path.resolve(valueAfter("--input") || path.join("outputs", "legacy-calendar-import-preview.json"));
  const write = process.argv.includes("--write");
  const preview = JSON.parse(fs.readFileSync(input, "utf8"));
  const now = new Date().toISOString();
  const events = preview.competitions
    .filter((competition) => competition.eventType === "pool")
    .map((competition) => importedEvent(competition, now));
  const summary = {
    mode: write ? "write" : "dry-run",
    eventCount: events.length,
    withPoolLength: events.filter((event) => event.poolLength).length,
    withPoolLaneCount: events.filter((event) => event.poolLaneCount).length,
    withTimingType: events.filter((event) => event.timingType).length
  };
  if (!write) return console.log(JSON.stringify(summary, null, 2));
  const token = firebaseAccessToken();
  const existingEvents = [];
  const missingEventIds = [];
  for (const event of events) {
    if (await eventExists(event, token)) existingEvents.push(event);
    else missingEventIds.push(event.id);
  }
  summary.eventCount = existingEvents.length;
  summary.missingEventIds = missingEventIds;
  const confirmed = Number(valueAfter("--confirm"));
  if (confirmed !== existingEvents.length) throw new Error(`Confirmation explicite requise : ajoutez --confirm ${existingEvents.length}.`);
  const writes = existingEvents.map((event) => updateWrite(event, now));
  for (let index = 0; index < writes.length; index += 20) {
    await commit(writes.slice(index, index + 20), token);
    console.log(`Mise à jour Firestore : ${Math.min(index + 20, writes.length)}/${writes.length}`);
  }
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
