// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_normalizeEmail(backendContext) {
  function normalizeEmail(value) {
    return backendContext.cleanText(value).toLowerCase();
  }

  return { normalizeEmail };
}

module.exports = { createAccessService_normalizeEmail };
