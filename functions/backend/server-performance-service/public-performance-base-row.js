// Existing operation bodies; live services arrive through explicit accessors.
function createPerformanceService_publicPerformanceBaseRow(backendContext) {
  function publicPerformanceBaseRow(row = {}) {
    const sex = backendContext.normalizeCategoryCode(row.sex);
    const date = backendContext.cleanText(row.date);
    const category = backendContext.performanceCategoryFromRow(row, date);
    return backendContext.cleanFirestoreValue({
      id: backendContext.cleanText(row.id),
      source: backendContext.cleanText(row.source || "livepalmes"),
      importId: backendContext.cleanText(row.importId),
      publicKey: backendContext.cleanText(row.publicKey),
      performanceBaseId: backendContext.cleanText(row.performanceBaseId),
      status: backendContext.cleanText(row.status || "active"),
      active: row.active !== false && row.status !== "hidden",
      swimmerId: backendContext.cleanText(row.swimmerId),
      originalSwimmerId: backendContext.cleanText(row.originalSwimmerId),
      swimmerIdentityKey: backendContext.cleanText(row.swimmerIdentityKey),
      swimmer: backendContext.cleanText(row.swimmer),
      firstName: backendContext.cleanText(row.firstName),
      lastName: backendContext.cleanText(row.lastName),
      birthDate: backendContext.cleanText(row.birthDate),
      sex,
      clubId: backendContext.cleanText(row.clubId),
      club: backendContext.cleanText(row.club),
      clubName: backendContext.cleanText(row.clubName),
      regionId: backendContext.cleanText(row.regionId),
      regionLabel: backendContext.cleanText(row.regionLabel),
      competitionId: backendContext.cleanText(row.competitionId || String(row.id || "").match(/^import:([^:]+):/)?.[1]),
      qualificationCompetitionId: backendContext.cleanText(row.qualificationCompetitionId),
      competition: backendContext.cleanText(row.competition),
      location: backendContext.cleanText(row.location),
      date,
      seasonYear: Number(row.seasonYear || 0) || 0,
      pool: backendContext.cleanText(row.pool),
      chrono: backendContext.cleanText(row.chrono),
      course: backendContext.cleanText(row.course),
      courseLabel: backendContext.cleanText(row.courseLabel),
      courseShortLabel: backendContext.cleanText(row.courseShortLabel),
      style: backendContext.cleanText(row.style),
      length: Number(row.length || 0) || 0,
      isIntermediate: row.isIntermediate === true,
      originCourse: backendContext.cleanText(row.originCourse),
      originCourseShortLabel: backendContext.cleanText(row.originCourseShortLabel),
      originPerformanceId: backendContext.cleanText(row.originPerformanceId),
      category,
      categoryCode: backendContext.cleanText(backendContext.categoryCodeFromCategory(category, sex) || row.categoryCode),
      categoryLabel: backendContext.cleanText(backendContext.CATEGORY_LABELS[sex]?.[category] || row.categoryLabel || category),
      timeValue: Number(row.timeValue || 0) || 0,
      time: backendContext.cleanText(row.time),
      points: backendContext.cleanText(row.points),
      rank: backendContext.cleanText(row.rank),
      intermediateTimes: Array.isArray(row.intermediateTimes)
        ? row.intermediateTimes.map((split) => ({
          code: backendContext.cleanText(split?.code),
          distance: Number(split?.distance || 0) || 0,
          time: backendContext.cleanText(split?.time),
          timeValue: Number(split?.timeValue || 0) || 0
        })).filter((split) => split.time)
        : []
    });
  }

  return { publicPerformanceBaseRow };
}

module.exports = { createPerformanceService_publicPerformanceBaseRow };
