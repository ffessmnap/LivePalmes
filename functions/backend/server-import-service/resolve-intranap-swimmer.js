// Existing operation bodies; live services arrive through explicit accessors.
function createImportService_resolveIntranapSwimmer(backendContext) {
  function resolveIntranapSwimmer(perf, sex) {
    const expectedSex = (0, backendContext.local$normalizeCategoryCode)(sex || perf.sex);
    const isCompatible = (swimmer) => {
      if (!swimmer) return false;
      const swimmerSex = (0, backendContext.local$normalizeCategoryCode)(swimmer.sex);
      return !expectedSex || swimmerSex === expectedSex;
    };
    const rawId = backendContext.cleanText(perf.swimmerId);
    const allowSourceIdMatch = backendContext.cleanText(perf.sourceFormat) !== "international-xlsx";
    const byIdMatch = allowSourceIdMatch && rawId ? backendContext.intranapSwimmerLookup.byId.get(rawId) : null;
    if (isCompatible(byIdMatch)) return { swimmer: byIdMatch, method: "id" };

    const key = backendContext.swimmerIdentityKey(perf.firstName, perf.lastName, perf.birthDate);
    if (!key) return { swimmer: null, method: "none" };
    const identityMatch = backendContext.intranapSwimmerLookup.byIdentity.get(key) || null;
    return isCompatible(identityMatch)
      ? { swimmer: identityMatch, method: "identity" }
      : { swimmer: null, method: "none" };
  }

  return { resolveIntranapSwimmer };
}

module.exports = { createImportService_resolveIntranapSwimmer };
