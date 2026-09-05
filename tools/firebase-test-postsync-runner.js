"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createRequire } = require("node:module");

const PROJECT = "livepalmes-test";
const REGION = "europe-west1";
const API_KEY = "AIzaSyAFOL4tPzNm3NwDaEJ-tdNoBOer69TrrkY";
const ROOT = path.resolve(__dirname, "..");
const KEY = process.env.LIVEPALMES_TEST_SYNC_CREDENTIAL || path.join(process.env.HOME || "", "lp-test-sync-wr-key.json");
const STATE_FILE = process.env.LIVEPALMES_TEST_POSTSYNC_STATE || path.join(process.env.HOME || "", "livepalmes-postsync-state.json");
const REMOTE_RESUME = process.env.LIVEPALMES_POSTSYNC_REMOTE_RESUME === "true";
const SKIP_INITIAL_PHASES = process.env.LIVEPALMES_POSTSYNC_SKIP_INITIAL_PHASES === "true";
const PAGE_SIZE = 500;
const REMOTE_PAGED_STATE = {
  swimmerIndex: { collection: "performanceSwimmerIndexState", document: "default" },
  topIndex: { collection: "performanceTopIndexState", document: "default" }
};

const functionsRequire = createRequire(path.join(ROOT, "functions", "package.json"));
const { cert, initializeApp } = functionsRequire("firebase-admin/app");
const { getAuth } = functionsRequire("firebase-admin/auth");
const { getFirestore } = functionsRequire("firebase-admin/firestore");

const credential = JSON.parse(fs.readFileSync(KEY, "utf8"));
if (credential.project_id !== PROJECT) throw new Error("Credential TEST incorrect.");

const app = initializeApp({ credential: cert(credential), projectId: PROJECT }, "livepalmes-postsync");
const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });
const auth = getAuth(app);

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); } catch { return {}; }
}
function writeState(state) { fs.writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 }); }
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

const state = readState();
let adminProfile = null;
let firebaseIdToken = "";
let firebaseTokenExpiresAt = 0;
let remoteResumeBaselineStartedAt = "";

async function findAdmin() {
  const snapshot = await db.collection("users").get();
  const admins = snapshot.docs
    .map((doc) => ({ uid: doc.id, ...doc.data() }))
    .filter((profile) => profile.status === "active" && profile.capabilities?.["admin.full"] === true);
  if (!admins.length) throw new Error("Aucun super-admin TEST actif.");
  return admins[0];
}

async function renewFirebaseToken() {
  if (!adminProfile) adminProfile = await findAdmin();
  const capabilities = adminProfile.capabilities || { "admin.full": true };
  const customToken = await auth.createCustomToken(adminProfile.uid, {
    livepalmesAccess: true,
    livepalmesConsoleAccess: true,
    livepalmesCapabilities: capabilities
  });
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: customToken, returnSecureToken: true })
  });
  const payload = await response.json();
  if (!response.ok || !payload.idToken) throw new Error(`Impossible d'obtenir le jeton Firebase TEST : ${JSON.stringify(payload)}`);
  firebaseIdToken = payload.idToken;
  firebaseTokenExpiresAt = Date.now() + 45 * 60 * 1000;
  console.log(`Jeton Firebase TEST renouvelé pour ${adminProfile.uid}`);
}

async function ensureToken() {
  if (!firebaseIdToken || Date.now() >= firebaseTokenExpiresAt) await renewFirebaseToken();
}

async function callFunction(name, data = {}) {
  await ensureToken();
  const response = await fetch(`https://${REGION}-${PROJECT}.cloudfunctions.net/${name}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${firebaseIdToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ data })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) throw new Error(`${name} : ${JSON.stringify(payload.error || payload)}`);
  return payload.result ?? payload.data ?? {};
}

async function discoverClubIds() {
  const ids = new Set();
  for (const collectionName of ["engagementClubs", "engagementClubSwimmers", "engagementClubPeople", "engagementClubEntries"]) {
    const snapshot = await db.collection(collectionName).get();
    for (const doc of snapshot.docs) {
      const data = doc.data() || {};
      if (/^\d+$/.test(doc.id)) ids.add(doc.id);
      if (/^\d+$/.test(String(data.clubId || ""))) ids.add(String(data.clubId));
    }
  }
  const admin = await findAdmin();
  if (/^\d+$/.test(String(admin.clubId || ""))) ids.add(String(admin.clubId));
  return [...ids];
}

async function rebuildClubAggregates() {
  if (state.clubAggregatesDone) return console.log("Agrégats clubs déjà terminés.");
  const clubIds = await discoverClubIds();
  console.log(`Clubs à reconstruire : ${clubIds.join(", ") || "aucun"}`);
  for (const clubId of clubIds) {
    console.log(`Reconstruction club ${clubId}...`);
    await callFunction("rebuildEngagementClubAggregates", { clubIds: [clubId] });
  }
  state.clubAggregatesDone = true;
  writeState(state);
}

async function rebuildCalendars() {
  if (state.calendarsDone) return console.log("Calendriers déjà reconstruits.");
  console.log("Reconstruction calendriers 2025/2026 et 2026/2027...");
  await callFunction("rebuildEngagementCompetitionCalendars", { endYears: [2026, 2027] });
  state.calendarsDone = true;
  writeState(state);
}

async function readRemotePagedState(stateKey) {
  const target = REMOTE_PAGED_STATE[stateKey];
  if (!target) throw new Error(`État Firestore distant inconnu : ${stateKey}`);
  const snapshot = await db.collection(target.collection).doc(target.document).get();
  return { exists: snapshot.exists, ...(snapshot.exists ? snapshot.data() || {} : {}) };
}

async function prepareRemoteResume() {
  const swimmerState = await readRemotePagedState("swimmerIndex");
  const startedAt = String(swimmerState.startedAt || "").trim();
  const indexedPerformanceCount = Number(swimmerState.indexedPerformanceCount || 0) || 0;
  if (!swimmerState.exists || !startedAt || indexedPerformanceCount <= 0) {
    throw new Error("Reprise Firestore refusée : aucun index nageurs TEST déjà démarré n'a été détecté.");
  }
  remoteResumeBaselineStartedAt = startedAt;
  console.log(`Reprise Firestore TEST détectée : ${indexedPerformanceCount} performances déjà indexées (démarrée ${startedAt}).`);
}

function remoteStateIsCurrent(stateKey, remote) {
  if (!remote?.exists) return false;
  const startedAt = String(remote.startedAt || "").trim();
  if (!startedAt) return false;
  if (stateKey === "swimmerIndex") return startedAt === remoteResumeBaselineStartedAt;
  return startedAt >= remoteResumeBaselineStartedAt;
}

async function rebuildPagedRemote(functionName, stateKey, label) {
  const remote = await readRemotePagedState(stateKey);
  const current = remoteStateIsCurrent(stateKey, remote);
  const info = {
    started: current,
    pages: current ? Math.ceil((Number(remote.indexedPerformanceCount || 0) || 0) / PAGE_SIZE) : 0,
    done: current && remote.done === true,
    indexedPerformanceCount: current ? Number(remote.indexedPerformanceCount || 0) || 0 : 0
  };
  state[stateKey] = info;
  writeState(state);

  if (info.done) {
    console.log(`${label} déjà terminé dans Firestore TEST — ${info.indexedPerformanceCount} performances.`);
    return;
  }

  if (current) {
    console.log(`${label} : reprise depuis Firestore à ${info.indexedPerformanceCount} performances.`);
  } else {
    console.log(`${label} : aucun état de la reconstruction courante, remise à zéro contrôlée.`);
  }

  let first = !current;
  while (!info.done) {
    const result = await callFunction(functionName, { pageSize: PAGE_SIZE, ...(first ? { reset: true } : {}) });
    info.started = true;
    info.pages = Math.max(info.pages + 1, Math.ceil((Number(result.indexedPerformanceCount || 0) || 0) / PAGE_SIZE));
    info.done = result.done === true;
    info.indexedPerformanceCount = Number(result.indexedPerformanceCount || 0);
    state[stateKey] = info;
    writeState(state);
    if (info.pages === 1 || info.pages % 25 === 0 || info.done) {
      console.log(`${label} : page ${info.pages} — ${info.indexedPerformanceCount} performances — done=${info.done}`);
    }
    first = false;
  }
}

async function rebuildPaged(functionName, stateKey, label) {
  if (REMOTE_RESUME) return rebuildPagedRemote(functionName, stateKey, label);
  if (state[stateKey]?.done) return console.log(`${label} déjà terminé.`);
  const info = state[stateKey] || { started: false, pages: 0, done: false };
  let first = !info.started;
  while (!info.done) {
    const result = await callFunction(functionName, { pageSize: PAGE_SIZE, ...(first ? { reset: true } : {}) });
    info.started = true;
    info.pages += 1;
    info.done = result.done === true;
    info.indexedPerformanceCount = Number(result.indexedPerformanceCount || 0);
    state[stateKey] = info;
    writeState(state);
    if (info.pages === 1 || info.pages % 25 === 0 || info.done) {
      console.log(`${label} : page ${info.pages} — ${info.indexedPerformanceCount} performances — done=${info.done}`);
    }
    first = false;
  }
}

function extractConst(source, name) {
  const marker = `const ${name} =`;
  let index = source.indexOf(marker);
  if (index < 0) throw new Error(`Constante ${name} introuvable.`);
  index += marker.length;
  while (/\s/.test(source[index])) index += 1;
  const opening = source[index];
  const closing = opening === "[" ? "]" : opening === "{" ? "}" : null;
  if (!closing) throw new Error(`Expression ${name} invalide.`);
  let depth = 0, quote = "", escaped = false, lineComment = false, blockComment = false, end = index;
  for (let i = index; i < source.length; i += 1) {
    const c = source[i], next = source[i + 1];
    if (lineComment) { if (c === "\n") lineComment = false; continue; }
    if (blockComment) { if (c === "*" && next === "/") { blockComment = false; i += 1; } continue; }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (c === "\\") { escaped = true; continue; }
      if (c === quote) quote = "";
      continue;
    }
    if (c === "/" && next === "/") { lineComment = true; i += 1; continue; }
    if (c === "/" && next === "*") { blockComment = true; i += 1; continue; }
    if (["'", "\"", "`"].includes(c)) { quote = c; continue; }
    if (c === opening) depth += 1;
    if (c === closing) depth -= 1;
    if (depth === 0) { end = i + 1; break; }
  }
  return vm.runInNewContext(`(${source.slice(index, end)})`);
}

function encodedTimeValue(encoded) {
  if (encoded === null || encoded === undefined || String(encoded).trim() === "") return 0;
  const value = String(encoded).padStart(6, "0");
  if (!/^\d{6}$/.test(value)) return 0;
  return Number(value.slice(0, 2)) * 6000 + Number(value.slice(2, 4)) * 100 + Number(value.slice(4, 6));
}

function dtnPayloads() {
  const source = fs.readFileSync(path.join(ROOT, "assets", "livepalmes-dtn-qualifications.js"), "utf8");
  const COURSE_ORDER = extractConst(source, "COURSE_ORDER");
  const TIME_GRID_IDS = extractConst(source, "TIME_GRID_IDS");
  const EDF_STANDARDS = extractConst(source, "EDF_STANDARDS");
  const SEASONS = extractConst(source, "SEASONS");
  const season = SEASONS.find((item) => Number(item.performanceSeason) === 2026);
  if (!season) throw new Error("Configuration DTN 2026 introuvable.");
  const edf = (sex) => EDF_STANDARDS.map((standard) => ({
    id: standard.id,
    birthMin: standard.birthMin,
    thresholds: Object.fromEntries(COURSE_ORDER.map((course) => [course, encodedTimeValue(season.edf?.[sex]?.[course]?.[TIME_GRID_IDS.indexOf(standard.id)])]))
  }));
  const rules = [season.listingRules.releve, ...season.listingRules.espoir].map((rule) => ({
    ...rule,
    thresholds: Object.fromEntries(["F", "M"].map((sex) => [sex, Object.fromEntries(COURSE_ORDER.map((course) => [course, encodedTimeValue(season.edf?.[sex]?.[course]?.[TIME_GRID_IDS.indexOf(rule.sourceId)])]))]))
  }));
  return { seasonYear: 2026, female: edf("F"), male: edf("M"), listingRules: rules };
}

async function waitForCache(name, data, label) {
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    const result = await callFunction(name, { ...data, rebuild: false });
    if (result.cache?.hit === true && result.cache?.pending !== true) return console.log(`${label} : cache prêt.`);
    await sleep(5000);
  }
  throw new Error(`Timeout ${label}.`);
}

async function rebuildDtn() {
  if (state.dtnDone) return console.log("DTN déjà reconstruit.");
  const payload = dtnPayloads();
  await callFunction("refreshDtnQualificationCache", { seasonYear: payload.seasonYear });
  for (const [sex, standards] of [["F", payload.female], ["M", payload.male]]) {
    console.log(`Construction DTN ${sex}...`);
    await callFunction("getDtnQualificationOverview", { seasonYear: payload.seasonYear, sex, standards, rebuild: true });
    await waitForCache("getDtnQualificationOverview", { seasonYear: payload.seasonYear, sex, standards }, `DTN ${sex}`);
  }
  await callFunction("refreshDtnListingCache", { seasonYear: payload.seasonYear });
  await callFunction("getDtnListingOverview", { seasonYear: payload.seasonYear, rules: payload.listingRules, rebuild: true });
  await waitForCache("getDtnListingOverview", { seasonYear: payload.seasonYear, rules: payload.listingRules }, "DTN listing");
  state.dtnDone = true;
  writeState(state);
}

async function republishPublicData() {
  if (state.publicationsDone) return console.log("Publications déjà terminées.");
  await callFunction("publishPerformancePublicData", {});
  const recordsRef = db.collection("competitions").doc("livepalmes-active").collection("performanceData").doc("records");
  const recordsSnapshot = await recordsRef.get();
  if (recordsSnapshot.exists) await recordsRef.set(recordsSnapshot.data(), { merge: false });
  await sleep(30000);
  state.publicationsDone = true;
  writeState(state);
}

async function main() {
  adminProfile = await findAdmin();
  console.log(`Super-admin utilisé pour les callables : ${adminProfile.uid}`);
  await renewFirebaseToken();
  if (REMOTE_RESUME) await prepareRemoteResume();
  if (SKIP_INITIAL_PHASES) {
    console.log("Agrégats clubs et calendriers : déjà terminés avant la reprise GitHub, étapes ignorées.");
    state.clubAggregatesDone = true;
    state.calendarsDone = true;
    writeState(state);
  } else {
    await rebuildClubAggregates();
    await rebuildCalendars();
  }
  await rebuildPaged("rebuildPerformanceSwimmerIndexNextPage", "swimmerIndex", "Index nageurs");
  await sleep(30000);
  await rebuildPaged("rebuildPerformanceTopIndexNextPage", "topIndex", "TOP");
  await rebuildDtn();
  await republishPublicData();
  state.allDone = true;
  writeState(state);
  console.log("RECONSTRUCTION_COMPLETE");
}

main().catch((error) => { console.error(error.stack || error.message || error); process.exitCode = 1; });
