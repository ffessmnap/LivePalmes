// Existing operation bodies; live services arrive through explicit accessors.
function createImportService_formatTimeValue(backendContext) {
  function formatTimeValue(timeValue) {
    const total = Number(timeValue);
    if (!Number.isFinite(total) || total <= 0) return "";
    const minutes = Math.floor(total / 6000);
    const seconds = Math.floor((total % 6000) / 100);
    const hundredths = total % 100;
    return minutes
      ? `${minutes}:${String(seconds).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`
      : `${seconds}.${String(hundredths).padStart(2, "0")}`;
  }

  return { formatTimeValue };
}

module.exports = { createImportService_formatTimeValue };
