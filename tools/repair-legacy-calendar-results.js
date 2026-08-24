const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { importedEvent } = require("./import-legacy-calendar-to-firestore");

const PROJECT_ID = "livepalmes";
const DATABASE = "(default)";
const COLLECTION = "engagementCalendarEvents";

function valueAfter(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] || "" : "";
}

function firestoreValue(value) {
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(firestoreValue) } };
  if (value && typeof value === "object") return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, firestoreValue(item)])) } };
  return { nullValue: null };
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

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main() {
  const input = path.resolve(valueAfter("--input") || "outputs/legacy-calendar-history-corrected-preview.json");
  const beforePath = path.resolve(valueAfter("--before") || "outputs/legacy-calendar-history-preview.json");
  const write = process.argv.includes("--write");
  const expectedCount = Number(valueAfter("--confirm"));
  const delayMs = Math.max(0, Number.parseInt(valueAfter("--delay-ms"), 10) || 0);
  const skip = Math.max(0, Number.parseInt(valueAfter("--skip"), 10) || 0);
  const preview = JSON.parse(fs.readFileSync(input, "utf8"));
  const beforeById = new Map((JSON.parse(fs.readFileSync(beforePath, "utf8")).competitions || []).map((competition) => [String(competition.legacyCompetitionId), competition]));
  const now = new Date().toISOString();
  const corrections = (preview.competitions || [])
    .filter((competition) => competition.importEligible !== false)
    .filter((competition) => competition.documents.some((document) => /r(?:&eacute;|é|e)sultats?/i.test(`${document.title || ""} ${document.description || ""}`)))
    .map((competition) => ({ competition, event: importedEvent(competition, now) }))
    .map(({ competition, event }) => ({
      id: event.id,
      name: event.name,
      date: event.date,
      operation: beforeById.get(String(competition.legacyCompetitionId))?.importEligible === true ? "update" : "create",
      event,
      fields: {
        clubDocuments: event.clubDocuments,
        resultsPublishedAt: event.resultsPublishedAt,
        resultsPdfUrl: event.resultsPdfUrl,
        updatedAt: now,
        updatedBy: "legacy-calendar-results-repair"
      }
    }))
    .slice(skip);
  const summary = {
    mode: write ? "write" : "dry-run",
    correctionCount: corrections.length,
    updateCount: corrections.filter((correction) => correction.operation === "update").length,
    createCount: corrections.filter((correction) => correction.operation === "create").length,
    skip,
    samples: corrections.slice(0, 8).map(({ id, name, date, operation }) => ({ id, name, date, operation }))
  };
  if (!write) return console.log(JSON.stringify(summary, null, 2));
  if (expectedCount !== corrections.length) throw new Error(`Confirmation explicite requise : ajoutez --confirm ${corrections.length}.`);
  const token = firebaseAccessToken();
  for (let index = 0; index < corrections.length; index += 1) {
    const correction = corrections[index];
    const fields = Object.fromEntries(Object.entries(correction.fields).map(([key, value]) => [key, firestoreValue(value)]));
    const name = `projects/${PROJECT_ID}/databases/${DATABASE}/documents/${COLLECTION}/${correction.id}`;
    const writePayload = correction.operation === "create"
      ? { update: { name, fields: Object.fromEntries(Object.entries(correction.event).filter(([, value]) => value !== undefined).map(([key, value]) => [key, firestoreValue(value)])) }, currentDocument: { exists: false } }
      : { update: { name, fields }, updateMask: { fieldPaths: Object.keys(fields) }, currentDocument: { exists: true } };
    await commitWrite(writePayload, token);
    console.log(`Correction résultats Firestore : ${index + 1}/${corrections.length}`);
    if (delayMs && index + 1 < corrections.length) await delay(delayMs);
  }
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
