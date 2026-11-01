// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_cleanFirestoreValue(backendContext) {
  function cleanFirestoreValue(value) {
    if (value === undefined || typeof value === "function") return undefined;
    if (value === null) return null;
    if (Array.isArray(value)) {
      return value
        .map(cleanFirestoreValue)
        .filter((item) => item !== undefined);
    }
    if (value && typeof value === "object") {
      return Object.entries(value).reduce((acc, [key, item]) => {
        const cleaned = cleanFirestoreValue(item);
        if (cleaned !== undefined) acc[key] = cleaned;
        return acc;
      }, {});
    }
    return value;
  }

  return { cleanFirestoreValue };
}

module.exports = { createAccessService_cleanFirestoreValue };
