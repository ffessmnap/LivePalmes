// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_capabilitiesMap(backendContext) {
  function capabilitiesMap(capabilities = []) {
    return backendContext.ACCESS_CAPABILITIES.reduce((acc, capability) => {
      acc[capability] = capabilities.includes(capability);
      return acc;
    }, {});
  }

  return { capabilitiesMap };
}

module.exports = { createAccessService_capabilitiesMap };
