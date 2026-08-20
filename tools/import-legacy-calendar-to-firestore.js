const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const PROJECT_ID = "livepalmes";
const DATABASE = "(default)";
const COLLECTION = "engagementCalendarEvents";
const MAX_DOCUMENTS = 20;

function valueAfter(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] || "" : "";
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function cleanText(value, maxLength = 0) {
  const text = String(value || "").trim();
  return maxLength ? text.slice(0, maxLength) : text;
}

function legacyEventId(legacyCompetitionId) {
  return `legacy-nap-${cleanText(legacyCompetitionId, 80)}`;
}

function legacyFileName(document = {}) {
  try {
    const rawPath = cleanText(document.legacyPath) || new URL(document.url).pathname;
    return decodeURIComponent(rawPath.split("/").pop() || "").slice(0, 180);
  } catch (_) {
    return cleanText(document.legacyPath).split("/").pop().slice(0, 180);
  }
}

function extensionOf(fileName = "") {
  const match = cleanText(fileName).toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "";
}

function categoryForLegacyDocument(document = {}) {
  const label = `${document.title || ""} ${document.description || ""}`.toLocaleLowerCase("fr");
  if (/protocole/.test(label)) return "results";
  if (/affiche/.test(label)) return "poster";
  if (/reglement|règlement/.test(label)) return "rules";
  if (/plan|acces|accès|itineraire|itinéraire/.test(label)) return "access";
  if (/invitation|circulaire/.test(label)) return "circular";
  return "information";
}

function importedDocument(document = {}) {
  const fileName = legacyFileName(document);
  const updatedAt = cleanText(document.document_date || document.updatedAt || document.date, 40);
  return {
    id: `nap-${cleanText(document.legacyDocumentId, 60)}`,
    title: cleanText(document.title || "Document officiel", 160),
    category: categoryForLegacyDocument(document),
    description: cleanText(document.description, 500),
    fileName,
    source: "legacy",
    url: cleanText(document.url, 900),
    size: 0,
    uploadedAt: updatedAt,
    updatedAt
  };
}

function importedEvent(competition = {}, now) {
  const documents = (Array.isArray(competition.documents) ? competition.documents : []).map(importedDocument);
  if (documents.length > MAX_DOCUMENTS) {
    throw new Error(`La compétition ${competition.legacyCompetitionId} contient ${documents.length} documents, au-delà de la limite ${MAX_DOCUMENTS}.`);
  }
  const id = legacyEventId(competition.legacyCompetitionId);
  const resultDocument = documents.find((document) => document.category === "results");
  return {
    id,
    name: cleanText(competition.name, 160),
    date: cleanText(competition.date, 10),
    endDate: cleanText(competition.endDate || competition.date, 10),
    city: cleanText(competition.city || competition.location, 120),
    location: cleanText(competition.location, 160),
    address: "",
    organizer: "",
    publicDescription: cleanText(competition.description, 3000),
    entryDeadlineAt: "",
    registrationUrl: "",
    regionId: ["national", "international"].includes(competition.level) ? "" : cleanText(competition.regionId, 80),
    level: cleanText(competition.level, 40),
    eventType: cleanText(competition.eventType, 40),
    poolLength: competition.eventType === "pool" ? cleanText(competition.poolLength, 2) : "",
    poolLaneCount: competition.eventType === "pool" ? Number(competition.poolLaneCount) || 0 : 0,
    timingType: competition.eventType === "pool" ? cleanText(competition.timingType, 20) : "",
    publicationStatus: "published",
    canceled: false,
    resultsPublishedAt: resultDocument?.updatedAt || "",
    resultsUrl: "",
    resultsPdfUrl: resultDocument?.url || "",
    programSessions: Array.isArray(competition.program) ? competition.program : [],
    clubDocuments: documents,
    legacyImport: {
      source: "nap.ffessm.fr",
      legacyCompetitionId: cleanText(competition.legacyCompetitionId, 80),
      legacyLevelLabel: cleanText(competition.legacyLevelLabel, 80),
      legacyTypeLabel: cleanText(competition.legacyTypeLabel, 80),
      importedAt: now
    },
    createdAt: now,
    createdBy: "legacy-calendar-import",
    updatedAt: now,
    updatedBy: "legacy-calendar-import"
  };
}

function firestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(firestoreValue) } };
  if (typeof value === "object") {
    return { mapValue: { fields: Object.fromEntries(Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, firestoreValue(item)])) } };
  }
  return { stringValue: String(value) };
}

function firestoreFields(object) {
  return Object.fromEntries(Object.entries(object)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => [key, firestoreValue(value)]));
}

function writeForEvent(event, replace) {
  const name = `projects/${PROJECT_ID}/databases/${DATABASE}/documents/${COLLECTION}/${event.id}`;
  const write = { update: { name, fields: firestoreFields(event) } };
  if (!replace) write.currentDocument = { exists: false };
  return write;
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

async function commitWrites(writes, tokenState) {
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${encodeURIComponent(DATABASE)}/documents:commit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenState.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ writes })
  });
  if (response.ok) return;
  const text = await response.text();
  throw new Error(`Écriture Firestore impossible (${response.status}) : ${text.slice(0, 800)}`);
}

async function main() {
  const input = path.resolve(valueAfter("--input") || path.join("outputs", "legacy-calendar-import-preview.json"));
  const write = process.argv.includes("--write");
  const replace = process.argv.includes("--replace");
  const expectedCount = Number(valueAfter("--confirm"));
  const from = cleanText(valueAfter("--from"), 10);
  const to = cleanText(valueAfter("--to"), 10);
  const batchSize = Math.max(1, Math.min(20, Number.parseInt(valueAfter("--batch-size"), 10) || 20));
  const delayMs = Math.max(0, Number.parseInt(valueAfter("--delay-ms"), 10) || 0);
  const skip = Math.max(0, Number.parseInt(valueAfter("--skip"), 10) || 0);
  const preview = JSON.parse(fs.readFileSync(input, "utf8"));
  if (preview.mode !== "preview-only" || !Array.isArray(preview.competitions)) throw new Error("Fichier de préparation historique invalide.");
  const now = new Date().toISOString();
  const events = preview.competitions
    .filter((competition) => competition.importEligible !== false)
    .filter((competition) => (!from || competition.date >= from) && (!to || competition.date < to))
    .slice(skip)
    .map((competition) => importedEvent(competition, now));
  const summary = {
    mode: write ? "write" : "dry-run",
    source: input,
    eventCount: events.length,
    documentCount: events.reduce((total, event) => total + event.clubDocuments.length, 0),
    programCompetitionCount: events.filter((event) => event.programSessions.length).length,
    programItemCount: events.reduce((total, event) => total + event.programSessions.reduce((sum, session) => sum + session.items.length, 0), 0),
    firstEventId: events[0]?.id || "",
    lastEventId: events.at(-1)?.id || "",
    replace,
    from,
    to,
    batchSize,
    delayMs,
    skip
  };
  if (!write) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }
  if (expectedCount !== events.length) {
    throw new Error(`Confirmation explicite requise : ajoutez --confirm ${events.length}.`);
  }
  const tokenState = { token: firebaseAccessToken() };
  const writes = events.map((event) => writeForEvent(event, replace));
  for (let index = 0; index < writes.length; index += batchSize) {
    await commitWrites(writes.slice(index, index + batchSize), tokenState);
    console.log(`Écriture Firestore : ${Math.min(index + batchSize, writes.length)}/${writes.length}`);
    if (delayMs && index + batchSize < writes.length) await delay(delayMs);
  }
  console.log(JSON.stringify(summary, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error?.stack || error?.message || String(error));
    process.exitCode = 1;
  });
}

module.exports = { importedEvent, legacyEventId };
