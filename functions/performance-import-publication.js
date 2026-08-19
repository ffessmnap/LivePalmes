const RESUMABLE_PUBLICATION_STATUSES = new Set(["pending", "failed"]);
const PUBLISHING_STALE_MS = 5 * 60 * 1000;

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

module.exports = {
  PUBLISHING_STALE_MS,
  canResumeImportPublication,
  cleanImportPublicationStatus,
  importPublicationError,
  importPublicationResultStatus,
  importPublicationStatus
};
