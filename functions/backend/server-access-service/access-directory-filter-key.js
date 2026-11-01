// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_accessDirectoryFilterKey(backendContext) {
  function accessDirectoryFilterKey(context = {}, status = "", capability = "") {
    return [
      !context.national && context.regionId ? `region:${context.regionId}` : "",
      status ? `status:${status}` : "",
      capability ? `capability:${capability}` : ""
    ].filter(Boolean).join("|") || "all";
  }

  function accessUserVisibleToRegional(context, data = {}) {
    if (!context?.region || !context.regionId) return false;
    const capabilities = data.capabilities || {};
    if (capabilities["admin.full"] === true || capabilities["engagements.national.manage"] === true) return false;
    return (0, backendContext.local$accessUserRegionIdFromData)(data) === context.regionId;
  }

  function accessUserVisibleForAccessDirectory(context, doc) {
    if (context?.national) return true;
    return accessUserVisibleToRegional(context, doc.data() || {});
  }

  return { accessDirectoryFilterKey, accessUserVisibleToRegional, accessUserVisibleForAccessDirectory };
}

module.exports = { createAccessService_accessDirectoryFilterKey };
