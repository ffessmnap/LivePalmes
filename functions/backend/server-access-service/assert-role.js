// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_assertRole(backendContext) {
  function assertRole(role) {
    if (!backendContext.ROLE_SET.has(role)) {
      throw new backendContext.HttpsError("invalid-argument", "Role LivePalmes inconnu.");
    }
  }

  return { assertRole };
}

module.exports = { createAccessService_assertRole };
