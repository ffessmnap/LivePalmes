// Existing operation bodies; live services arrive through explicit accessors.
function createImportService_normalizedRecordAlertName(backendContext) {
  function normalizedRecordAlertName(value) {
    const normalized = backendContext.normalizeIdentityText(value);
    if (!normalized) return "";
    return normalized.split(/\s+/).filter(Boolean).sort().join(" ");
  }

  function sameRecordAlertSwimmer(left, right) {
    const leftRaw = backendContext.normalizeIdentityText(left);
    const rightRaw = backendContext.normalizeIdentityText(right);
    if (!leftRaw || !rightRaw) return false;
    return leftRaw === rightRaw || normalizedRecordAlertName(leftRaw) === normalizedRecordAlertName(rightRaw);
  }

  return { normalizedRecordAlertName, sameRecordAlertSwimmer };
}

module.exports = { createImportService_normalizedRecordAlertName };
