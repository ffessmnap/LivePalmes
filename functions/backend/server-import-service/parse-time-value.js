// Existing operation bodies; live services arrive through explicit accessors.
function createImportService_parseTimeValue(backendContext) {
  function parseTimeValue(value) {
    const raw = backendContext.cleanText(value).replace(",", ".");
    if (!raw || raw === "00.00" || raw === "00:00.00" || raw === "59:59.99") return null;
    const match = raw.match(/^(?:(\d+):)?(\d{1,2})\.(\d{1,2})$/);
    if (!match) return null;
    const minutes = Number(match[1] || 0);
    const seconds = Number(match[2]);
    const hundredths = Number(match[3].padEnd(2, "0").slice(0, 2));
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || !Number.isFinite(hundredths) || seconds >= 60) return null;
    return minutes * 6000 + seconds * 100 + hundredths;
  }

  return { parseTimeValue };
}

module.exports = { createImportService_parseTimeValue };
