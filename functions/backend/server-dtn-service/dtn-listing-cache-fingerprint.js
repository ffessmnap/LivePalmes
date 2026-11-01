// Existing operation bodies; live services arrive through explicit accessors.
function createDtnService_dtnListingCacheFingerprint(backendContext) {
  function dtnListingCacheFingerprint({ seasonYear, rules, sourceVersion, listingVersion }) {
    return backendContext.stableHash(JSON.stringify({
      cacheVersion: backendContext.DTN_LISTING_CACHE_VERSION,
      seasonYear,
      rules,
      sourceVersion,
      listingVersion
    }));
  }

  function emptyDtnListingPayload({ seasonYear, rules }) {
    return {
      ok: true,
      seasonYear,
      standards: rules.map((rule) => ({
        id: rule.id,
        sourceId: rule.sourceId,
        minAge: rule.minAge,
        maxAge: rule.maxAge,
        athletes: [],
        count: 0
      })),
      eligibility: { pool: "50", timing: "electronic" },
      readStats: { scannedRows: 0, bounded: true }
    };
  }

  function normalizeDtnListingRules(inputRules = []) {
    const expectedSources = new Map([
      ["RELEVE", "TRP"],
      ["TEP", "TEP"],
      ["TEC1", "TU16C1"]
    ]);
    const rules = (Array.isArray(inputRules) ? inputRules : []).slice(0, 3).map((raw) => {
      const id = backendContext.cleanText(raw?.id).toUpperCase();
      const sourceId = backendContext.cleanText(raw?.sourceId).toUpperCase();
      const minAge = Number(raw?.minAge);
      const maxAge = Number(raw?.maxAge);
      if (expectedSources.get(id) !== sourceId || !Number.isInteger(minAge) || !Number.isInteger(maxAge) || minAge < 0 || maxAge > 120 || minAge > maxAge) {
        throw new backendContext.HttpsError("invalid-argument", "Regle de mise en liste DTN invalide.");
      }
      const thresholds = { F: {}, M: {} };
      ["F", "M"].forEach((sex) => {
        backendContext.POOL_COURSES.forEach((course) => {
          const threshold = Number(raw?.thresholds?.[sex]?.[course] || 0) || 0;
          if (threshold > 0 && threshold <= 10000000) thresholds[sex][course] = threshold;
        });
      });
      return { id, sourceId, minAge, maxAge, thresholds };
    });
    if (rules.length !== 3 || new Set(rules.map((rule) => rule.id)).size !== 3) {
      throw new backendContext.HttpsError("invalid-argument", "Referentiels de mise en liste DTN incomplets.");
    }
    const tep = rules.find((rule) => rule.id === "TEP");
    const tec1 = rules.find((rule) => rule.id === "TEC1");
    if (tep.minAge !== tec1.maxAge + 1) {
      throw new backendContext.HttpsError("invalid-argument", "Tranches Espoir DTN invalides.");
    }
    return rules;
  }

  return { dtnListingCacheFingerprint, emptyDtnListingPayload, normalizeDtnListingRules };
}

module.exports = { createDtnService_dtnListingCacheFingerprint };
