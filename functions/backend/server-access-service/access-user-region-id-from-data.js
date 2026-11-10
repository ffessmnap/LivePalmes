// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_accessUserRegionIdFromData(backendContext) {
  function accessUserRegionIdFromData(data = {}) {
    const regionScope = (0, backendContext.local$normalizedAccessScope)(data.accessScopes?.["engagements.region.manage"]);
    const directRegionId = regionScope.scopeId || backendContext.cleanText(data.regionId).slice(0, 80);
    if (directRegionId) return (0, backendContext.local$canonicalAccessDirectoryRegionId)(directRegionId);
    return (0, backendContext.local$canonicalAccessDirectoryRegionId)(data.napClubRegionId);
  }

  async function resolveAccessUserClubRegions(profiles = []) {
    if (profiles.length > 500) throw new backendContext.HttpsError("resource-exhausted", "Lot de comptes trop volumineux.");
    const clubIdFor = data => {
      if (!data || accessUserRegionIdFromData(data)) return "";
      const scope = (0, backendContext.local$normalizedAccessScope)(data.accessScopes?.["engagements.club.manage"]);
      const id = backendContext.cleanText(scope.scopeId || data.clubId).slice(0, 40);
      // An old opaque ID was absent from the retired numeric reference too.
      // Keep it unresolved; never guess a native club from a name or a code.
      return /^[1-9]\d{0,15}$/.test(id) && Number.isSafeInteger(Number(id)) ? id : "";
    };
    const ids = [...new Set(profiles.map(clubIdFor).filter(Boolean))];
    if (!ids.length) return profiles;
    let clubs;
    try { clubs = await backendContext.readNapClubsByIds(ids); }
    catch (error) { throw new backendContext.HttpsError("unavailable", "Région du club NAP indisponible. Réessayez."); }
    return profiles.map(data => {
      const id = clubIdFor(data);
      return id ? { ...data, napClubRegionId: clubs.get(id)?.regionId || "" } : data;
    });
  }

  return { accessUserRegionIdFromData, resolveAccessUserClubRegions };
}

module.exports = { createAccessService_accessUserRegionIdFromData };
