// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_normalizedAccessScope(backendContext) {
  function normalizedAccessScope(scope = {}) {
    const scopeType = ["club", "region", "national"].includes(backendContext.cleanText(scope.scopeType))
      ? backendContext.cleanText(scope.scopeType)
      : "national";
    return {
      scopeType,
      scopeId: scopeType === "national" ? "" : backendContext.cleanText(scope.scopeId).slice(0, 80)
    };
  }

  return { normalizedAccessScope };
}

module.exports = { createAccessService_normalizedAccessScope };
