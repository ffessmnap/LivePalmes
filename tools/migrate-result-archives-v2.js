#!/usr/bin/env node

const { execFileSync } = require("node:child_process");

const PROJECT_ID = "livepalmes";
const DATABASE = "(default)";
const COMPETITION_ID = "livepalmes-active";
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${encodeURIComponent(DATABASE)}/documents`;

global.window = global;
require("../assets/livepalmes-damien-hebert-trophy.js");
require("../assets/livepalmes-public-medals-core.js");

function cleanId(value, fallback = "race") {
  const clean = String(value || "")
    .trim()
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  return clean || `${fallback}-${Math.random().toString(16).slice(2)}`;
}

function raceKey(eventId, sex) {
  return `${eventId || ""}|${sex || ""}`;
}

function resultRaceKey(result = {}) {
  return String(result.raceKey || raceKey(result.eventId, result.sex) || "");
}

function rowRaceKey(row = {}) {
  return raceKey(row.eventId, row.sex);
}

function sanitize(value) {
  if (value === undefined) return null;
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, sanitize(item)])
    );
  }
  return value;
}

function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    if (Number.isInteger(value)) return { integerValue: String(value) };
    return { doubleValue: value };
  }
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === "object") {
    return {
      mapValue: {
        fields: Object.fromEntries(Object.entries(sanitize(value)).map(([key, item]) => [key, toFirestoreValue(item)]))
      }
    };
  }
  return { stringValue: String(value) };
}

function fromFirestoreValue(value = {}) {
  if ("nullValue" in value) return null;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue || 0);
  if ("doubleValue" in value) return Number(value.doubleValue || 0);
  if ("stringValue" in value) return value.stringValue || "";
  if ("timestampValue" in value) return value.timestampValue || "";
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(fromFirestoreValue);
  if ("mapValue" in value) {
    return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, item]) => [key, fromFirestoreValue(item)]));
  }
  return null;
}

function docToObject(doc = {}) {
  const name = String(doc.name || "");
  return {
    id: name.split("/").pop(),
    data: Object.fromEntries(Object.entries(doc.fields || {}).map(([key, value]) => [key, fromFirestoreValue(value)]))
  };
}

function objectToFields(value = {}) {
  return Object.fromEntries(Object.entries(sanitize(value)).map(([key, item]) => [key, toFirestoreValue(item)]));
}

function getCliAccessToken() {
  const output = execFileSync("cmd.exe", ["/c", "firebase.cmd", "login:list", "--json"], { encoding: "utf8" });
  const login = JSON.parse(output);
  const token = login?.result?.[0]?.tokens?.access_token;
  if (!token) throw new Error("Aucun jeton Firebase CLI disponible. Lance firebase login puis reessaie.");
  return token;
}

function restClient(token) {
  async function request(method, path, body = null) {
    const response = await fetch(`${BASE_URL}/${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${method} ${path} -> ${response.status} ${text}`);
    }
    return response.status === 204 ? null : response.json();
  }

  async function list(path) {
    const docs = [];
    let pageToken = "";
    do {
      const suffix = pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : "";
      const payload = await request("GET", `${path}${suffix}`);
      docs.push(...(payload.documents || []).map(docToObject));
      pageToken = payload.nextPageToken || "";
    } while (pageToken);
    return docs;
  }

  async function set(path, value) {
    await request("PATCH", path, { fields: objectToFields(value) });
  }

  return { list, set };
}

function buildRacePayloads(index = {}, results = []) {
  const program = Array.isArray(index.program) ? index.program : [];
  const series = Array.isArray(index.series) ? index.series : [];
  const keys = new Set();
  program.forEach((row) => {
    const key = rowRaceKey(row);
    if (key.trim()) keys.add(key);
  });
  results.forEach((result) => {
    const key = resultRaceKey(result);
    if (key.trim()) keys.add(key);
  });
  return [...keys].map((key) => {
    const [eventId, sex] = key.split("|");
    const programRows = program
      .filter((row) => rowRaceKey(row) === key)
      .sort((a, b) => Number(a.session || 0) - Number(b.session || 0) || Number(a.order || 9999) - Number(b.order || 9999));
    const seriesRows = series
      .filter((row) => row.eventId === eventId && row.sex === sex)
      .sort((a, b) => Number(a.series || 0) - Number(b.series || 0) || Number(a.lane || 0) - Number(b.lane || 0));
    const raceResults = results
      .filter((result) => resultRaceKey(result) === key)
      .sort((a, b) => Number(a.session || 0) - Number(b.session || 0) || String(a.stage || "").localeCompare(String(b.stage || "")));
    const representative = programRows[0] || raceResults[0] || {};
    const latestUpdatedAt = raceResults
      .map((result) => result.updatedAt)
      .filter(Boolean)
      .sort()
      .at(-1) || "";
    return {
      id: cleanId(key),
      raceKey: key,
      eventId: eventId || representative.eventId || "",
      sex: sex || representative.sex || "",
      label: representative.label || representative.eventLabel || "",
      session: representative.session || raceResults[0]?.session || "",
      order: Number(representative.order || 9999),
      resultCount: raceResults.length,
      latestUpdatedAt,
      programRows,
      seriesRows,
      results: raceResults
    };
  });
}

function buildArchiveIndex(archive = {}, index = {}, races = []) {
  return {
    meet: index.meet || archive.meet || {},
    events: Array.isArray(index.events) ? index.events : [],
    program: Array.isArray(index.program) ? index.program : [],
    raceSummaries: races.map((race) => ({
      id: race.id,
      raceKey: race.raceKey,
      eventId: race.eventId,
      sex: race.sex,
      label: race.label,
      session: race.session,
      order: race.order,
      resultCount: race.resultCount,
      latestUpdatedAt: race.latestUpdatedAt
    })),
    seriesPdfs: Array.isArray(index.seriesPdfs) ? index.seriesPdfs : [],
    sessionResultsPdfs: Array.isArray(index.sessionResultsPdfs) ? index.sessionResultsPdfs : [],
    sessionInfos: index.sessionInfos || {},
    publicAccess: index.publicAccess || {
      online: true,
      updatedAt: archive.createdAt || index.updatedAt || ""
    },
    updatedAt: index.updatedAt || archive.createdAt || new Date().toISOString(),
    sourceVersion: index.sourceVersion || "",
    sourceLabel: index.sourceLabel || "",
    lastUpdatedSession: index.lastUpdatedSession || ""
  };
}

function buildExtras(index = {}, results = []) {
  const extras = {};
  const tdh = global.LivePalmesDamienHebertTrophy;
  if (tdh && typeof tdh.buildSnapshot === "function") {
    const snapshot = tdh.buildSnapshot(results);
    const count = Number(snapshot?.rankings?.all?.length || 0);
    if (count > 0) {
      extras.tdh = {
        ...snapshot,
        id: "tdh",
        title: "Trophée Damien Hébert",
        count
      };
    }
  }
  const medals = global.LivePalmesPublicMedalsCore;
  if (medals && typeof medals.buildSnapshot === "function") {
    const snapshot = medals.buildSnapshot(results, {
      events: index.events || [],
      entrants: index.entrants || []
    });
    const count = Number(snapshot?.rows?.length || 0);
    if (count > 0) {
      extras.medals = {
        ...snapshot,
        id: "medals",
        title: "Tableau des médailles",
        count
      };
    }
  }
  return extras;
}

async function migrateArchive(client, archive) {
  const archivePath = `competitions/${COMPETITION_ID}/resultArchives/${archive.id}`;
  const index = archive.data.archiveIndex || archive.data.publicIndex || {};
  const [items, existingRaces, existingExtras] = await Promise.all([
    client.list(`${archivePath}/items`).catch(() => []),
    client.list(`${archivePath}/races`).catch(() => []),
    client.list(`${archivePath}/extras`).catch(() => [])
  ]);
  const existingExtraIds = new Set(existingExtras.map((doc) => doc.id));
  if (archive.data.archiveVersion >= 2 && existingExtraIds.has("tdh") && existingExtraIds.has("medals")) {
    console.log(`- ${archive.id}: deja en v2 avec extras`);
    return;
  }
  if (existingRaces.length) {
    console.log(`- ${archive.id}: races deja presentes, mise a jour du resume`);
  }
  const itemResults = items.map((doc) => ({ id: doc.id, ...doc.data }));
  const results = existingRaces.length
    ? existingRaces.flatMap((race) => Array.isArray(race.data?.results) ? race.data.results : [])
    : itemResults.length
    ? itemResults
    : (Array.isArray(index.results) ? index.results : []);
  const races = existingRaces.length ? existingRaces.map((doc) => ({ id: doc.id, ...doc.data })) : buildRacePayloads(index, results);
  const archiveIndex = buildArchiveIndex(archive.data, index, races);
  const extras = buildExtras(index, results);
  await client.set(archivePath, {
    ...archive.data,
    archiveVersion: 2,
    raceCount: races.length,
    count: results.length,
    extras: Object.keys(extras),
    archiveIndex,
    publicIndex: archiveIndex
  });
  for (const race of races) {
    await client.set(`${archivePath}/races/${race.id}`, race);
  }
  for (const [id, extra] of Object.entries(extras)) {
    await client.set(`${archivePath}/extras/${id}`, extra);
  }
  console.log(`- ${archive.id}: ${races.length} course(s), ${results.length} resultat(s), ${Object.keys(extras).length} extra(s)`);
}

async function main() {
  const token = getCliAccessToken();
  const client = restClient(token);
  const archives = await client.list(`competitions/${COMPETITION_ID}/resultArchives`);
  console.log(`${archives.length} archive(s) trouvee(s)`);
  for (const archive of archives) {
    await migrateArchive(client, archive);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
