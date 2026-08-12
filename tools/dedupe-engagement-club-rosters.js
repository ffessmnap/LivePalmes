const path = require("path");
const crypto = require("crypto");

const PROJECT_ID = "livepalmes";
const COLLECTION = "engagementClubRosters";
const PAGE_SIZE = 200;
const MAX_ROSTERS = 2000;

function option(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? String(process.argv[index + 1] || "") : fallback;
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeText(value) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .toUpperCase()
    .trim();
}

function licenseKey(value) {
  return cleanText(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function stableHash(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function sourceRank(source) {
  return { performances: 3, engagement: 2, reference: 1 }[cleanText(source)] || 0;
}

function matchKeys(swimmer = {}) {
  const swimmerId = cleanText(swimmer.swimmerId);
  const license = licenseKey(swimmer.licenseNumber);
  const identity = normalizeText(swimmer.identityKey || [swimmer.lastName, swimmer.firstName, swimmer.birthDate].filter(Boolean).join("|"));
  const indexId = cleanText(swimmer.swimmerIndexId || swimmer.id);
  const source = cleanText(swimmer.source || "performances");
  return Array.from(new Set((swimmerId ? [
    `swimmer:${swimmerId}`,
    indexId ? `index:${source}:${indexId}` : ""
  ] : [
    license ? `license:${license}` : "",
    identity ? `identity:${identity}` : "",
    indexId ? `index:${source}:${indexId}` : ""
  ]).filter(Boolean)));
}

function mergeItems(left = {}, right = {}) {
  const rightPreferred = sourceRank(right.source) > sourceRank(left.source);
  const preferred = rightPreferred ? right : left;
  const fallback = rightPreferred ? left : right;
  const merged = { ...fallback, ...preferred };
  [
    "id", "swimmerIndexId", "swimmerId", "identityKey", "firstName", "lastName", "name", "birthDate", "sex", "category",
    "clubId", "club", "clubName", "licenseNumber", "licenseVerificationStatus", "licenseSeasonLabel", "licenseSeasonStatus",
    "changeRequestStatus", "changeRequestId", "changeRequestedAt"
  ].forEach((key) => {
    if (!cleanText(merged[key]) && cleanText(fallback[key])) merged[key] = fallback[key];
  });
  merged.performanceCount = Math.max(Number(left.performanceCount || 0), Number(right.performanceCount || 0));
  merged.latestDate = [cleanText(left.latestDate), cleanText(right.latestDate)].filter(Boolean).sort().pop() || "";
  merged.updatedAt = [cleanText(left.updatedAt), cleanText(right.updatedAt)].filter(Boolean).sort().pop() || "";
  merged.active = left.active !== false || right.active !== false;
  return merged;
}

function mergeRosterSwimmers(swimmers = {}) {
  const groups = [];
  Object.values(swimmers && typeof swimmers === "object" ? swimmers : {}).filter((swimmer) =>
    swimmer && typeof swimmer === "object" && cleanText(swimmer.swimmerIndexId || swimmer.id)
  ).forEach((swimmer) => {
    const keys = matchKeys(swimmer);
    const matchingIndexes = groups
      .map((group, index) => group.keys.some((key) => keys.includes(key)) ? index : -1)
      .filter((index) => index >= 0);
    if (!matchingIndexes.length) {
      groups.push({ item: { ...swimmer }, keys });
      return;
    }
    const target = groups[matchingIndexes[0]];
    target.item = mergeItems(target.item, swimmer);
    target.keys = Array.from(new Set([...target.keys, ...keys, ...matchKeys(target.item)]));
    matchingIndexes.slice(1).reverse().forEach((index) => {
      target.item = mergeItems(target.item, groups[index].item);
      target.keys = Array.from(new Set([...target.keys, ...groups[index].keys, ...matchKeys(target.item)]));
      groups.splice(index, 1);
    });
  });
  const entries = {};
  groups.forEach(({ item }) => {
    const source = cleanText(item.source || "performances") || "performances";
    const swimmerIndexId = cleanText(item.swimmerIndexId || item.id);
    entries[stableHash(`${source}|${swimmerIndexId}`).slice(0, 40)] = item;
  });
  return {
    entries,
    beforeCount: Object.keys(swimmers || {}).length,
    afterCount: Object.keys(entries).length
  };
}

async function readRosters(db, FieldPath) {
  const snapshots = [];
  let cursor = null;
  while (snapshots.length < MAX_ROSTERS) {
    let query = db.collection(COLLECTION).orderBy(FieldPath.documentId()).limit(PAGE_SIZE);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    snapshots.push(...page.docs);
    if (page.size < PAGE_SIZE) return snapshots;
    cursor = page.docs[page.docs.length - 1];
  }
  throw new Error(`Plus de ${MAX_ROSTERS} agrégats : migration interrompue par sécurité.`);
}

async function main() {
  const projectId = option("project");
  const apply = process.argv.includes("--apply");
  const confirmAffected = Number(option("confirm-affected", "-1"));
  const confirmRemoved = Number(option("confirm-removed", "-1"));
  if (projectId !== PROJECT_ID) throw new Error(`Le script exige --project ${PROJECT_ID}.`);

  const admin = require(path.join(__dirname, "..", "functions", "node_modules", "firebase-admin"));
  const { FieldPath, getFirestore } = require(path.join(__dirname, "..", "functions", "node_modules", "firebase-admin", "lib", "firestore"));
  if (!admin.getApps().length) admin.initializeApp({ projectId });
  const db = getFirestore();
  const snapshots = await readRosters(db, FieldPath);
  const changes = snapshots.map((snapshot) => {
    const data = snapshot.data() || {};
    const merged = mergeRosterSwimmers(data.swimmers || {});
    return { snapshot, data, ...merged, removed: merged.beforeCount - merged.afterCount };
  }).filter((item) => item.removed > 0 || Number(item.data.swimmerCount || 0) !== item.afterCount);
  const removed = changes.reduce((sum, item) => sum + item.removed, 0);
  const summary = {
    mode: apply ? "apply" : "dry-run",
    projectId,
    rosterReads: snapshots.length,
    affectedRosters: changes.length,
    rosterWrites: apply ? changes.length : 0,
    entriesBefore: changes.reduce((sum, item) => sum + item.beforeCount, 0),
    entriesAfter: changes.reduce((sum, item) => sum + item.afterCount, 0),
    duplicateEntriesRemoved: removed,
    largestChanges: changes
      .map((item) => ({ clubId: cleanText(item.data.clubId), clubName: cleanText(item.data.clubName), before: item.beforeCount, after: item.afterCount, removed: item.removed }))
      .sort((left, right) => right.removed - left.removed)
      .slice(0, 20)
  };
  if (!apply) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }
  if (confirmAffected !== changes.length || confirmRemoved !== removed) {
    throw new Error(`Confirmation requise : --confirm-affected ${changes.length} --confirm-removed ${removed}`);
  }
  const now = new Date().toISOString();
  const writer = db.bulkWriter({ throttling: { initialOpsPerSecond: 50, maxOpsPerSecond: 100 } });
  changes.forEach((item) => writer.set(item.snapshot.ref, {
    ...item.data,
    swimmers: item.entries,
    swimmerCount: item.afterCount,
    updatedAt: now,
    rosterDeduplicatedAt: now,
    rosterDeduplicationVersion: 1
  }));
  await writer.close();
  console.log(JSON.stringify({ ...summary, rosterWrites: changes.length, completedAt: now }, null, 2));
}

module.exports = { matchKeys, mergeItems, mergeRosterSwimmers };

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
