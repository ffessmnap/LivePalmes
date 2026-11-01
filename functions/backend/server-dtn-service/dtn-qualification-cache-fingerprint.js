// Existing operation bodies; live services arrive through explicit accessors.
function createDtnService_dtnQualificationCacheFingerprint(backendContext) {
  function dtnQualificationCacheFingerprint({ seasonYear, sex, standards, competitionIds, sourceVersion }) {
    return backendContext.stableHash(JSON.stringify({
      cacheVersion: backendContext.DTN_QUALIFICATION_CACHE_VERSION,
      seasonYear,
      sex,
      standards,
      competitionIds,
      sourceVersion
    }));
  }

  function emptyDtnQualificationPayload({ seasonYear, sex, standards, competitionIds }) {
    return {
      ok: true,
      seasonYear,
      sex,
      standards: standards.map((standard) => ({
        id: standard.id,
        courses: backendContext.POOL_COURSES.map((course) => ({
          course,
          threshold: Number(standard.thresholds[course] || 0),
          qualifiers: [],
          count: 0
        }))
      })),
      competitionIds,
      readStats: { scannedRows: 0, bounded: true }
    };
  }

  return { dtnQualificationCacheFingerprint, emptyDtnQualificationPayload };
}

module.exports = { createDtnService_dtnQualificationCacheFingerprint };
