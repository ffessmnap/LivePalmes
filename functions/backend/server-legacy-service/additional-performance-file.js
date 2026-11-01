// Existing operation bodies; live services arrive through explicit accessors.
function createLegacyService_additionalPerformanceFile(backendContext) {
  function buildAdditionalPerformanceSwimmers(performances = []) {
    const swimmersById = new Map();
    performances.forEach((perf) => {
      if (!swimmersById.has(perf.swimmerId)) {
        swimmersById.set(perf.swimmerId, {
          id: perf.swimmerId,
          aliases: Array.isArray(perf.aliases) ? perf.aliases : [],
          sourceIds: Array.from(new Set([...(Array.isArray(perf.sourceIds) ? perf.sourceIds : []), perf.swimmerId, perf.originalSwimmerId].filter(Boolean))),
          identityKey: perf.swimmerIdentityKey || "",
          name: perf.swimmer,
          lastName: perf.lastName,
          firstName: perf.firstName,
          birthDate: perf.birthDate,
          sex: perf.sex,
          clubId: perf.clubId,
          club: perf.club,
          clubName: perf.clubName,
          performanceCount: 0,
          chunk: "",
          source: "livepalmes-import"
        });
      }
      swimmersById.get(perf.swimmerId).performanceCount += 1;
    });
    return Array.from(swimmersById.values());
  }

  function emptyAdditionalPerformanceDataSnapshot() {
    return {
      ok: true,
      available: false,
      generatedAt: "",
      importCount: 0,
      performanceCount: 0,
      correctionCount: 0,
      swimmers: [],
      performances: [],
      corrections: []
    };
  }

  function normalizeAdditionalPerformanceDataSnapshot(snapshot = {}) {
    const performances = (Array.isArray(snapshot.performances) ? snapshot.performances : [])
      .map(backendContext.publicPerformanceBaseRow);
    const corrections = Array.isArray(snapshot.corrections) ? snapshot.corrections : [];
    const swimmers = Array.isArray(snapshot.swimmers) ? snapshot.swimmers : buildAdditionalPerformanceSwimmers(performances);
    const importCount = Array.from(new Set(performances.map((row) => backendContext.cleanText(row.importId)).filter(Boolean))).length;
    return {
      ok: snapshot.ok !== false,
      available: snapshot.available !== false,
      generatedAt: backendContext.cleanText(snapshot.generatedAt),
      importCount: importCount || Number(snapshot.importCount || 0) || 0,
      performanceCount: performances.length,
      correctionCount: corrections.length,
      swimmers,
      performances,
      corrections
    };
  }

  function additionalPerformanceFile() {
    return backendContext.storage.bucket(backendContext.PUBLIC_PERFORMANCE_BUCKET).file(backendContext.PUBLIC_ADDITIONAL_PERFORMANCE_PATH);
  }

  async function readPublishedAdditionalPerformanceDataSnapshot() {
    const file = additionalPerformanceFile();
    try {
      const [buffer] = await file.download();
      return normalizeAdditionalPerformanceDataSnapshot(JSON.parse(buffer.toString("utf8")));
    } catch (error) {
      if (error?.code === 404 || error?.code === 403 || /No such object|not found/i.test(error?.message || "")) {
        return emptyAdditionalPerformanceDataSnapshot();
      }
      throw error;
    }
  }

  return { buildAdditionalPerformanceSwimmers, emptyAdditionalPerformanceDataSnapshot, normalizeAdditionalPerformanceDataSnapshot, additionalPerformanceFile, readPublishedAdditionalPerformanceDataSnapshot };
}

module.exports = { createLegacyService_additionalPerformanceFile };
