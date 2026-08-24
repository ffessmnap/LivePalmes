const RESUMABLE_PUBLICATION_STATUSES = new Set(["pending", "failed"]);
const PUBLISHING_STALE_MS = 5 * 60 * 1000;
const PUBLIC_PERFORMANCE_SWIMMER_ROW_SCHEMA_VERSION = 2;

function cleanImportPublicationStatus(value) {
  const status = String(value || "").trim().toLowerCase();
  return ["pending", "publishing", "failed", "published"].includes(status) ? status : "";
}

function importPublicationStatus(importData = {}) {
  return cleanImportPublicationStatus(importData.publicationStatus || importData.publication?.status);
}

function canResumeImportPublication(importData = {}, now = Date.now()) {
  if (importData.status === "deleted") return false;
  const status = importPublicationStatus(importData);
  if (RESUMABLE_PUBLICATION_STATUSES.has(status)) return true;
  if (status !== "publishing") return false;
  const updatedAt = Date.parse(importData.publicationUpdatedAt || importData.publicationStartedAt || "");
  return !Number.isFinite(updatedAt) || Number(now) - updatedAt >= PUBLISHING_STALE_MS;
}

function importPublicationResultStatus(publicSnapshot = {}, publicFilesSnapshot = {}) {
  return publicSnapshot.ok === true && publicFilesSnapshot.ok === true ? "published" : "failed";
}

function importPublicationError(publicSnapshot = {}, publicFilesSnapshot = {}) {
  return [publicSnapshot.error, publicFilesSnapshot.error]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" ")
    .slice(0, 500);
}

function deactivatedImportPerformanceRows(rows = []) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    ...(row || {}),
    active: false,
    status: "deleted"
  }));
}

function hydratePublicSwimmerRowsFromPayload(rows = [], payload = {}, swimmerKey = "") {
  const sourceIds = Array.isArray(payload?.sourceIds) ? payload.sourceIds : [];
  const swimmerId = String(payload?.id || sourceIds[0] || "").trim();
  const identityKey = String(payload?.identityKey || swimmerKey || "").trim();
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    ...(row || {}),
    swimmerId: String(row?.swimmerId || swimmerId).trim(),
    originalSwimmerId: String(row?.originalSwimmerId || swimmerId).trim(),
    swimmerIdentityKey: String(row?.swimmerIdentityKey || identityKey).trim(),
    swimmer: String(row?.swimmer || payload?.name || "").trim(),
    firstName: String(row?.firstName || payload?.firstName || "").trim(),
    lastName: String(row?.lastName || payload?.lastName || "").trim(),
    birthDate: String(row?.birthDate || payload?.birthDate || "").trim(),
    sex: String(row?.sex || payload?.sex || "").trim(),
    clubId: String(row?.clubId || payload?.clubId || "").trim(),
    club: String(row?.club || payload?.club || "").trim(),
    clubName: String(row?.clubName || payload?.clubName || "").trim()
  }));
}

function publicSwimmerPayloadSupportsTopRebuild(payload = {}) {
  return Number(payload?.rowSchemaVersion || 0) >= PUBLIC_PERFORMANCE_SWIMMER_ROW_SCHEMA_VERSION;
}

function publicPerformanceSwimmerStorageRow(row = {}) {
  const text = (value) => String(value || "").replace(/\s+/g, " ").trim();
  const isIntermediate = row.isIntermediate === true;
  const stored = {
    id: text(row.id),
    source: text(row.source || "livepalmes"),
    publicKey: text(row.publicKey),
    performanceBaseId: text(row.performanceBaseId),
    club: text(row.club),
    regionId: text(row.regionId),
    location: text(row.location),
    date: text(row.date),
    seasonYear: Number(row.seasonYear || 0) || 0,
    pool: text(row.pool),
    chrono: text(row.chrono),
    course: text(row.course),
    ...(isIntermediate ? {
      length: Number(row.length || 0) || 0,
      isIntermediate: true,
      originCourse: text(row.originCourse),
      originPerformanceId: text(row.originPerformanceId)
    } : {}),
    categoryCode: text(row.categoryCode || row.category),
    timeValue: Number(row.timeValue || 0) || 0,
    time: text(row.time),
    intermediateTimes: Array.isArray(row.intermediateTimes) ? row.intermediateTimes : []
  };
  return Object.fromEntries(Object.entries(stored).filter(([, value]) => {
    if (value === "" || value === null || value === undefined || value === false) return false;
    if (Array.isArray(value) && !value.length) return false;
    return true;
  }));
}

module.exports = {
  PUBLISHING_STALE_MS,
  PUBLIC_PERFORMANCE_SWIMMER_ROW_SCHEMA_VERSION,
  canResumeImportPublication,
  cleanImportPublicationStatus,
  deactivatedImportPerformanceRows,
  hydratePublicSwimmerRowsFromPayload,
  importPublicationError,
  importPublicationResultStatus,
  importPublicationStatus,
  publicPerformanceSwimmerStorageRow,
  publicSwimmerPayloadSupportsTopRebuild
};
