// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_activeCapabilitiesFromMap(backendContext) {
  function activeCapabilitiesFromMap(map = {}) {
    return backendContext.ACCESS_CAPABILITIES.filter((capability) => map?.[capability] === true);
  }

  return { activeCapabilitiesFromMap };
}

module.exports = { createAccessService_activeCapabilitiesFromMap };
