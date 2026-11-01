// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_accessUserCanBeManagedByRegional(backendContext) {
  function accessUserCanBeManagedByRegional(context, data = {}) {
    if (!context?.region || !context.regionId) return false;
    const capabilities = data.capabilities || {};
    if (capabilities["admin.full"] === true || capabilities["engagements.national.manage"] === true) return false;
    if (capabilities["engagements.region.manage"] !== true) return false;
    return (0, backendContext.local$accessUserRegionIdFromData)(data) === context.regionId;
  }

  function assertRegionalAccessUserDeletionRequestAllowed(context, targetData = {}) {
    if (context?.national) return;
    if (!accessUserCanBeManagedByRegional(context, targetData)) {
      throw new backendContext.HttpsError("permission-denied", "Demande limitee aux admins region de ta region.");
    }
  }

  return { accessUserCanBeManagedByRegional, assertRegionalAccessUserDeletionRequestAllowed };
}

module.exports = { createAccessService_accessUserCanBeManagedByRegional };
