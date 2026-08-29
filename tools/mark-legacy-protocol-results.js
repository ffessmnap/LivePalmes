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
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(firestoreValue) } };
  if (typeof value === "object") return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, firestoreValue(item)])) } };
  return { stringValue: String(value) };
}

function firebaseAccessToken() {
  const output = execFileSync("cmd.exe", ["/c", "firebase.cmd", "login:list", "--json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const token = JSON.parse(output).result?.[0]?.tokens?.access_token;
  if (!token) throw new Error("Connexion Firebase CLI introuvable. Exécutez firebase login puis relancez.");
  return token;
}

function updateWrite(event) {
  const payload = {
    clubDocuments: event.clubDocuments,
    resultsPublishedAt: event.resultsPublishedAt,
    resultsUrl: event.resultsUrl,
    resultsPdfUrl: event.resultsPdfUrl,
    updatedAt: event.updatedAt,
    updatedBy: "legacy-protocol-results"
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

async function main() {
  const input = path.resolve(valueAfter("--input") || path.join("outputs", "legacy-calendar-import-preview.json"));
  const write = process.argv.includes("--write");
  const preview = JSON.parse(fs.readFileSync(input, "utf8"));
  const now = new Date().toISOString();
  const events = preview.competitions
    .filter((competition) => (competition.documents || []).some((document) => /protocole/i.test(String(document.title || ""))))
    .map((competition) => importedEvent(competition, now));
  const summary = { mode: write ? "write" : "dry-run", eventCount: events.length, resultDocumentCount: events.reduce((total, event) => total + event.clubDocuments.filter((document) => document.category === "results").length, 0) };
  if (!write) return console.log(JSON.stringify(summary, null, 2));
  const confirmed = Number(valueAfter("--confirm"));
  if (confirmed !== events.length) throw new Error(`Confirmation explicite requise : ajoutez --confirm ${events.length}.`);
  const token = firebaseAccessToken();
  const writes = events.map(updateWrite);
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
