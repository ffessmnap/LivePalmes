const crypto = require("node:crypto");

function sortObjectKeys(value) {
  if (Array.isArray(value)) return value.map(sortObjectKeys);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, sortObjectKeys(value[key])])
  );
}

function stableStringify(value) {
  return JSON.stringify(sortObjectKeys(value));
}

function publicRecordsPayload(data = {}) {
  if (!Array.isArray(data.records) || !Array.isArray(data.franceRecords)) {
    throw new Error("Donnees RF/MPF invalides : listes manquantes.");
  }
  if (!data.filters || typeof data.filters !== "object" || Array.isArray(data.filters)) {
    throw new Error("Donnees RF/MPF invalides : filtres manquants.");
  }
  return {
    id: "records",
    records: data.records,
    franceRecords: data.franceRecords,
    filters: data.filters,
    ...(data.sourceDate ? { sourceDate: data.sourceDate } : {}),
    ...(data.generatedAt ? { generatedAt: data.generatedAt } : {}),
    ...(data.cutoffDate ? { cutoffDate: data.cutoffDate } : {}),
    updatedAt: data.updatedAt || data.generatedAt || new Date().toISOString()
  };
}

function publicRecordsVersion(payload = {}) {
  return crypto.createHash("sha256").update(stableStringify(payload)).digest("hex").slice(0, 20);
}

function publicRecordsDataPath(version) {
  if (!/^[a-f0-9]{20}$/.test(String(version || ""))) throw new Error("Version RF/MPF invalide.");
  return `records/versions/${version}.json`;
}

function publicRecordsManifest(payload, eventTime = "") {
  const version = publicRecordsVersion(payload);
  return {
    id: "records-manifest",
    version,
    dataPath: publicRecordsDataPath(version),
    generatedAt: payload.updatedAt || payload.generatedAt || "",
    eventTime: String(eventTime || payload.updatedAt || ""),
    recordCount: payload.records.length,
    franceRecordCount: payload.franceRecords.length
  };
}

function shouldPublishRecordsManifest(current = {}, next = {}) {
  if (!current?.eventTime) return true;
  if (!next?.eventTime) return false;
  return String(next.eventTime).localeCompare(String(current.eventTime)) > 0;
}

module.exports = {
  publicRecordsDataPath,
  publicRecordsManifest,
  publicRecordsPayload,
  publicRecordsVersion,
  shouldPublishRecordsManifest,
  stableStringify
};
