const crypto = require("node:crypto");
const path = require("node:path");

const PROJECT_ID = "livepalmes";
const USERS_COLLECTION = "users";
const SNAPSHOTS_COLLECTION = "accessDirectorySnapshots";
const STATE_COLLECTION = "accessDirectorySnapshotState";
const SNAPSHOT_VERSION = 1;
const PAGE_SIZE = 100;
const MAX_USERS = 5000;
const MAX_SNAPSHOTS = 100;
const MAX_SNAPSHOT_BYTES = 800000;
const ACCESS_CAPABILITIES = [
  "admin.full",
  "records.manage",
  "consoles.manage",
  "consoles.access",
  "competitions.import",
  "dtn.view",
  "engagements.club.manage",
  "engagements.club.switch",
  "engagements.region.manage",
  "engagements.national.manage"
];

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function snapshotEntryKey(uid) {
  return crypto.createHash("sha256").update(cleanText(uid)).digest("hex").slice(0, 32);
}

function activeCapabilities(capabilities = {}) {
  return ACCESS_CAPABILITIES.filter((capability) => capabilities?.[capability] === true);
}

function snapshotEntry(uid, data = {}) {
  return {
    uid,
    email: data.email || "",
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    clubId: data.clubId || "",
    clubName: data.clubName || "",
    regionId: data.regionId || "",
    licenseNumber: data.licenseNumber || "",
    status: data.status || "active",
    capabilities: activeCapabilities(data.capabilities || {}),
    accessScopes: data.accessScopes || {},
    updatedAt: data.updatedAt || "",
    lastLoginAt: data.lastLoginAt || ""
  };
}

function regionalScopeId(data = {}) {
  const capabilities = data.capabilities || {};
  if (capabilities["admin.full"] === true || capabilities["engagements.national.manage"] === true) return "";
  if (capabilities["engagements.region.manage"] !== true) return "";
  return cleanText(data.accessScopes?.["engagements.region.manage"]?.scopeId || data.regionId).slice(0, 80);
}

function snapshotDocumentId(scopeType, scopeId = "") {
  return scopeType === "region" ? `region:${encodeURIComponent(scopeId)}` : "national";
}

async function readUsers(db, FieldPath) {
  const users = [];
  let cursor = null;
  while (users.length < MAX_USERS) {
    let query = db.collection(USERS_COLLECTION).orderBy(FieldPath.documentId()).limit(PAGE_SIZE);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    users.push(...page.docs);
    if (page.size < PAGE_SIZE) return users;
    cursor = page.docs.at(-1);
  }
  throw new Error(`Plus de ${MAX_USERS} profils : reconstruction interrompue par sécurité.`);
}

function buildSnapshots(userDocs, now) {
  const nationalEntries = {};
  const regionalEntries = new Map();
  userDocs.forEach((doc) => {
    const data = doc.data() || {};
    const key = snapshotEntryKey(doc.id);
    const entry = snapshotEntry(doc.id, data);
    nationalEntries[key] = entry;
    const regionId = regionalScopeId(data);
    if (!regionId) return;
    if (!regionalEntries.has(regionId)) regionalEntries.set(regionId, {});
    regionalEntries.get(regionId)[key] = entry;
  });
  return [
    { id: "national", scopeType: "national", scopeId: "", entries: nationalEntries },
    ...Array.from(regionalEntries, ([scopeId, entries]) => ({
      id: snapshotDocumentId("region", scopeId),
      scopeType: "region",
      scopeId,
      entries
    }))
  ].map((snapshot) => ({
    ...snapshot,
    status: "ready",
    version: SNAPSHOT_VERSION,
    updatedAt: now
  }));
}

function snapshotBytes(snapshot) {
  return Buffer.byteLength(JSON.stringify(snapshot), "utf8");
}

async function main() {
  const write = process.argv.includes("--write");
  if (write && !process.argv.includes("--confirm-livepalmes")) {
    throw new Error("Ajoute --confirm-livepalmes pour autoriser l'écriture en production.");
  }
  const admin = require(path.join(process.cwd(), "functions", "node_modules", "firebase-admin"));
  const { FieldPath, getFirestore } = require(path.join(process.cwd(), "functions", "node_modules", "firebase-admin", "lib", "firestore"));
  if (!admin.getApps().length) admin.initializeApp({ projectId: PROJECT_ID });
  const db = getFirestore();
  const users = await readUsers(db, FieldPath);
  const now = new Date().toISOString();
  const snapshots = buildSnapshots(users, now);
  if (snapshots.length > MAX_SNAPSHOTS) throw new Error(`Plus de ${MAX_SNAPSHOTS} documents d'annuaire.`);
  const sizes = snapshots.map((snapshot) => ({ id: snapshot.id, bytes: snapshotBytes(snapshot) }));
  const oversized = sizes.filter((item) => item.bytes > MAX_SNAPSHOT_BYTES);
  if (oversized.length) throw new Error(`Document d'annuaire trop volumineux : ${oversized.map((item) => item.id).join(", ")}.`);

  const summary = {
    projectId: PROJECT_ID,
    mode: write ? "write" : "dry-run",
    userReads: users.length,
    userCount: users.length,
    snapshotCount: snapshots.length,
    nationalBytes: sizes.find((item) => item.id === "national")?.bytes || 0,
    largestSnapshotBytes: Math.max(...sizes.map((item) => item.bytes), 0)
  };
  if (!write) {
    console.log(JSON.stringify(summary));
    return;
  }

  const existing = await db.collection(SNAPSHOTS_COLLECTION).limit(MAX_SNAPSHOTS + 1).get();
  if (existing.size > MAX_SNAPSHOTS) throw new Error("Trop de documents existants à remplacer.");
  const stateRef = db.collection(STATE_COLLECTION).doc("default");
  const clearBatch = db.batch();
  existing.docs.forEach((doc) => clearBatch.delete(doc.ref));
  clearBatch.set(stateRef, { status: "building", updatedAt: now, indexedCount: 0 });
  await clearBatch.commit();

  const writeBatch = db.batch();
  snapshots.forEach((snapshot) => {
    writeBatch.set(db.collection(SNAPSHOTS_COLLECTION).doc(snapshot.id), snapshot);
  });
  writeBatch.set(stateRef, {
    status: "ready",
    version: SNAPSHOT_VERSION,
    indexedCount: users.length,
    completedAt: now,
    updatedAt: now
  });
  await writeBatch.commit();
  console.log(JSON.stringify({
    ...summary,
    existingSnapshotReads: existing.size,
    writes: existing.size + snapshots.length + 2,
    completed: true
  }));
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
