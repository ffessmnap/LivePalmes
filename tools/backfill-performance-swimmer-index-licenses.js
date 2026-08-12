const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PROJECT_ID = "livepalmes";
const LICENSE_COLLECTION = "engagementSwimmerLicenses";
const SWIMMER_INDEX_COLLECTION = "performanceSwimmerIndex";

function option(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? String(process.argv[index + 1] || "") : fallback;
}

function stableHash(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .toUpperCase()
    .trim();
}

function searchPrefixes(value) {
  const prefixes = new Set();
  normalizeSearchText(value).split(/\s+/).filter((token) => token.length >= 2).forEach((token) => {
    for (let length = 2; length <= Math.min(token.length, 18); length += 1) prefixes.add(token.slice(0, length));
  });
  return Array.from(prefixes).slice(0, 300);
}

function indexIdFromLicense(data = {}) {
  const identityKey = String(data.identityKey || "").trim();
  return identityKey ? stableHash(identityKey).slice(0, 40) : "";
}

function performanceSwimmerIndexPayload(data = {}, now = "") {
  const firstName = String(data.firstName || "").trim();
  const lastName = String(data.lastName || "").trim();
  const identityKey = String(data.identityKey || "").trim();
  const swimmerIndexId = String(data.swimmerIndexId || data.swimmerId || "").trim();
  const name = String(data.name || [firstName, lastName].filter(Boolean).join(" ")).trim();
  const searchText = normalizeSearchText([
    name, firstName, lastName, data.birthDate, data.sex, data.clubId, data.clubName, swimmerIndexId
  ].filter(Boolean).join(" "));
  return {
    indexKey: identityKey,
    id: swimmerIndexId,
    aliases: [],
    sourceIds: swimmerIndexId ? [swimmerIndexId] : [],
    identityKey,
    name,
    firstName,
    lastName,
    birthDate: String(data.birthDate || "").trim(),
    sex: String(data.sex || "").trim(),
    clubId: String(data.clubId || "").trim(),
    clubName: String(data.clubName || "").trim(),
    licenseNumber: String(data.licenseNumber || "").trim(),
    licenseVerificationStatus: String(data.verificationStatus || "pending").trim() || "pending",
    licenseSeasonLabel: String(data.licenseSeasonLabel || "").trim(),
    licenseSeasonStatus: String(data.licenseSeasonStatus || "to_check").trim() || "to_check",
    searchText,
    searchPrefixes: searchPrefixes(searchText),
    source: "performances",
    licenseUpdatedAt: now,
    licenseUpdatedBy: "license_index_backfill"
  };
}

function indexMatchesPayload(index = {}, payload = {}) {
  return [
    "indexKey", "id", "identityKey", "name", "firstName", "lastName", "birthDate", "sex",
    "clubId", "clubName", "licenseNumber", "licenseVerificationStatus", "licenseSeasonLabel",
    "licenseSeasonStatus", "searchText", "source"
  ].every((field) => String(index[field] || "") === String(payload[field] || "")) &&
    JSON.stringify(index.sourceIds || []) === JSON.stringify(payload.sourceIds || []) &&
    JSON.stringify(index.searchPrefixes || []) === JSON.stringify(payload.searchPrefixes || []);
}

async function main() {
  const projectId = option("project");
  const apply = process.argv.includes("--apply");
  const confirmCount = Number(option("confirm-count", "-1"));
  const pageSize = Math.min(500, Math.max(50, Number(option("page-size", "250")) || 250));
  if (projectId !== PROJECT_ID) {
    throw new Error(`Le script exige --project ${PROJECT_ID}.`);
  }

  const admin = require(path.join(__dirname, "..", "functions", "node_modules", "firebase-admin"));
  const { FieldPath, getFirestore } = require(path.join(__dirname, "..", "functions", "node_modules", "firebase-admin", "lib", "firestore"));
  if (!admin.getApps().length) admin.initializeApp({ projectId });
  const db = getFirestore();
  const now = new Date().toISOString();
  const result = {
    mode: apply ? "apply" : "dry-run",
    projectId,
    pageSize,
    scannedLicenses: 0,
    eligibleLicenses: 0,
    performanceIndexesUpdated: 0,
    skipped: {
      missingIdentityKey: 0,
      missingLicenseNumber: 0,
      missingIdentityFields: 0
    },
    samples: []
  };
  let cursor = null;
  const updates = [];

  while (true) {
    let query = db.collection(LICENSE_COLLECTION)
      .orderBy(FieldPath.documentId())
      .limit(pageSize);
    if (cursor) query = query.startAfter(cursor);
    const licenses = await query.get();
    if (!licenses.size) break;
    cursor = licenses.docs[licenses.docs.length - 1];
    result.scannedLicenses += licenses.size;

    const candidates = [];
    licenses.docs.forEach((doc) => {
      const data = doc.data() || {};
      const indexId = indexIdFromLicense(data);
      if (!indexId) {
        result.skipped.missingIdentityKey += 1;
        return;
      }
      if (!String(data.licenseNumber || "").trim()) {
        result.skipped.missingLicenseNumber += 1;
        return;
      }
      if (![data.firstName, data.lastName, data.birthDate, data.swimmerIndexId || data.swimmerId].every((value) => String(value || "").trim())) {
        result.skipped.missingIdentityFields += 1;
        return;
      }
      result.eligibleLicenses += 1;
      candidates.push({
        ref: db.collection(SWIMMER_INDEX_COLLECTION).doc(indexId),
        payload: performanceSwimmerIndexPayload(data, now),
        licenseId: doc.id
      });
    });
    const currentIndexes = candidates.length ? await db.getAll(...candidates.map((candidate) => candidate.ref)) : [];
    candidates.forEach((candidate, index) => {
      if (!indexMatchesPayload(currentIndexes[index].data() || {}, candidate.payload)) updates.push(candidate);
    });
    if (licenses.size < pageSize) break;
  }

  if (apply && confirmCount !== updates.length) {
    throw new Error(`Confirmation invalide : ${updates.length} index(s) a mettre a jour. Relancez avec --confirm-count ${updates.length}.`);
  }
  result.performanceIndexesPending = updates.length;
  result.samples = updates.slice(0, 30).map((update) => ({ licenseId: update.licenseId, indexId: update.ref.id }));

  if (apply && updates.length) {
    const writer = db.bulkWriter({ throttling: { initialOpsPerSecond: 100, maxOpsPerSecond: 200 } });
    writer.onWriteError((error) => {
      const transientCodes = new Set([4, 8, 10, 13, 14]);
      return transientCodes.has(Number(error.code)) && error.failedAttempts < 5;
    });
    const operations = updates.map((update) => writer.set(update.ref, update.payload, { merge: true })
      .then(() => ({ ok: true }))
      .catch((error) => ({ ok: false, error: error?.message || String(error) })));
    await writer.close();
    const outcomes = await Promise.all(operations);
    result.performanceIndexesUpdated = outcomes.filter((outcome) => outcome.ok).length;
    result.writeFailures = outcomes.filter((outcome) => !outcome.ok).slice(0, 30);
    if (result.writeFailures.length) throw new Error("Migration partielle : consultez le rapport.");
  }

  result.completedAt = new Date().toISOString();
  const reportDir = path.join(__dirname, "..", "outputs");
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `rapport-index-licences-${now.replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ...result, reportPath }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
