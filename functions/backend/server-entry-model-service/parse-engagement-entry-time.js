// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_parseEngagementEntryTime(backendContext) {
  function parseEngagementEntryTime(value) {
    const text = backendContext.cleanText(value).replace(",", ".").replace(/\s+/g, "");
    if (!text) return null;
    if (text === "595999" || text === "59:59.99") {
      return { display: "59:59.99", value: 359999 };
    }
    const digitText = text.replace(/\D/g, "");
    if (/^\d{1,6}$/.test(text) && digitText === text) {
      const padded = digitText.padStart(digitText.length <= 4 ? 4 : 6, "0");
      const hundredths = Number(padded.slice(-2));
      const seconds = Number(padded.slice(-4, -2));
      const minutes = Number(padded.slice(0, -4) || 0);
      if (seconds >= 60) return null;
      const value = minutes * 6000 + seconds * 100 + hundredths;
      return value > 0 ? { display: backendContext.formatTimeValue(value), value } : null;
    }
    const parsedValue = backendContext.parseTimeValue(text);
    return parsedValue ? { display: backendContext.formatTimeValue(parsedValue), value: parsedValue } : null;
  }

  return { parseEngagementEntryTime };
}

module.exports = { createEntryModelService_parseEngagementEntryTime };
