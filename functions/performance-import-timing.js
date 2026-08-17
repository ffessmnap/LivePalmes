const timingConfig = require("./config/performance-import-timing.json");

const ALLOWED_TIMING_TYPES = new Set(["manual", "electronic"]);
const TIMING_CODE_BY_TYPE = {
  manual: "M",
  electronic: "E"
};

const timingByImportId = new Map((timingConfig.competitions || []).map((competition) => [
  String(competition.importId || "").trim(),
  String(competition.timingType || "").trim().toLowerCase()
]));

function cleanTimingType(value) {
  const timingType = String(value || "").trim().toLowerCase();
  if (ALLOWED_TIMING_TYPES.has(timingType)) return timingType;
  const normalized = timingType
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");
  if (normalized === "e" || normalized === "electronique") return "electronic";
  if (normalized === "m" || normalized === "manuel" || normalized === "manual") return "manual";
  return "";
}

function performanceImportTimingType(row = {}) {
  const explicitTiming = cleanTimingType(
    row.chrono || row.timingType || row.metadata?.timingType || row.metadata?.chrono
  );
  if (explicitTiming) return explicitTiming;
  if (String(row.source || "").trim() && String(row.source || "").trim() !== "livepalmes-import") return "";
  const importId = String(row.importId || row.competitionId || "").trim();
  return cleanTimingType(timingByImportId.get(importId));
}

function performanceImportChrono(row = {}) {
  const timingType = performanceImportTimingType(row);
  return TIMING_CODE_BY_TYPE[timingType] || String(row.chrono || "").trim();
}

module.exports = {
  performanceImportChrono,
  performanceImportTimingType,
  timingConfig
};
