// Existing operation bodies; live services arrive through explicit accessors.
function createDtnService_dtnQualificationSeasonsForRows(backendContext) {
  function dtnQualificationSeasonsForRows(rows = []) {
    const seasons = new Set();
    rows.forEach((inputRow) => {
      const row = inputRow && typeof inputRow === "object" ? inputRow : {};
      const seasonYear = Number(row.seasonYear || 0) || backendContext.importSeasonYear(backendContext.cleanText(row.date));
      if (Number.isInteger(seasonYear) && seasonYear >= 2001 && seasonYear <= 2100) seasons.add(seasonYear);
    });
    return Array.from(seasons);
  }

  async function touchDtnQualificationCacheState(rows = [], context = {}) {
    const seasons = dtnQualificationSeasonsForRows(rows);
    if (!seasons.length) return { touchedSeasons: [] };
    const now = backendContext.cleanText(context.now) || new Date().toISOString();
    const batch = backendContext.db.batch();
    seasons.forEach((seasonYear) => {
      batch.set((0, backendContext.local$dtnQualificationCacheStateRef)(seasonYear), {
        version: backendContext.FieldValue.increment(1),
        updatedAt: now,
        reason: backendContext.cleanText(context.action || "performanceBase.updated")
      }, { merge: true });
    });
    await batch.commit();
    return { touchedSeasons: seasons };
  }

  return { dtnQualificationSeasonsForRows, touchDtnQualificationCacheState };
}

module.exports = { createDtnService_dtnQualificationSeasonsForRows };
