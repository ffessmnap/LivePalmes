// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_accessScopeForCapability(backendContext) {
  function cleanAccessProfile(raw = {}) {
    const uid = backendContext.cleanText(raw.uid).slice(0, 128);
    const email = (0, backendContext.local$normalizeEmail)(raw.email);
    (0, backendContext.local$assertEmail)(email);
    const firstName = backendContext.cleanText(raw.firstName).slice(0, 80);
    const lastName = backendContext.cleanText(raw.lastName).slice(0, 80);
    const clubId = backendContext.cleanText(raw.clubId).slice(0, 40);
    const clubName = backendContext.cleanText(raw.clubName).slice(0, 140);
    const regionId = (0, backendContext.local$canonicalAccessDirectoryRegionId)(raw.regionId);
    const licenseNumber = backendContext.cleanText(raw.licenseNumber).slice(0, 60);
    const capabilities = Array.isArray(raw.capabilities)
      ? raw.capabilities.map(backendContext.cleanText).filter((item) => backendContext.ACCESS_CAPABILITY_SET.has(item))
      : [];
    if (!firstName || !lastName) {
      throw new backendContext.HttpsError("invalid-argument", "Nom et prenom obligatoires.");
    }
    if (!capabilities.length) {
      throw new backendContext.HttpsError("invalid-argument", "Selectionne au moins un droit.");
    }
    if (capabilities.includes("dtn.manage") && !capabilities.includes("dtn.view")) {
      throw new backendContext.HttpsError("invalid-argument", "La gestion des paramètres DTN requiert l’accès à l’espace DTN.");
    }
    if (capabilities.includes("engagements.club.manage") && !clubId) {
      throw new backendContext.HttpsError("invalid-argument", "Numero de club obligatoire pour un acces engagements club.");
    }
    if (capabilities.includes("engagements.club.switch") && !capabilities.includes("engagements.club.manage")) {
      throw new backendContext.HttpsError("invalid-argument", "Le droit de changement de club requiert le droit engagements club.");
    }
    if (capabilities.includes("engagements.region.manage") && !regionId) {
      throw new backendContext.HttpsError("invalid-argument", "Region obligatoire pour un acces engagements region.");
    }
    const accessScopes = accessScopesMapFromProfile({ clubId, regionId, capabilities });
    return { uid, email, firstName, lastName, clubId, clubName, regionId, licenseNumber, capabilities, accessScopes };
  }

  function accessScopeForCapability(profile = {}, capability) {
    if (capability === "engagements.club.manage") {
      return (0, backendContext.local$normalizedAccessScope)({ scopeType: "club", scopeId: profile.clubId });
    }
    if (capability === "engagements.region.manage") {
      return (0, backendContext.local$normalizedAccessScope)({ scopeType: "region", scopeId: profile.regionId });
    }
    return (0, backendContext.local$normalizedAccessScope)({ scopeType: "national", scopeId: "" });
  }

  function accessScopesMapFromProfile(profile = {}) {
    return (profile.capabilities || []).reduce((acc, capability) => {
      acc[capability] = accessScopeForCapability(profile, capability);
      return acc;
    }, {});
  }

  return { cleanAccessProfile, accessScopeForCapability, accessScopesMapFromProfile };
}

module.exports = { createAccessService_accessScopeForCapability };
