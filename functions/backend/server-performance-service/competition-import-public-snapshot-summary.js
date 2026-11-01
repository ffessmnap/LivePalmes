// Existing operation bodies; live services arrive through explicit accessors.
function createPerformanceService_competitionImportPublicSnapshotSummary(backendContext) {
  function competitionImportPublicSnapshotSummary(snapshot = {}) {
    return backendContext.cleanFirestoreValue({
      ok: snapshot.ok === true,
      path: backendContext.cleanText(snapshot.path),
      generatedAt: backendContext.cleanText(snapshot.generatedAt),
      importCount: Number(snapshot.importCount || 0) || 0,
      performanceCount: Number(snapshot.performanceCount || 0) || 0,
      rowCount: Number(snapshot.rowCount || 0) || 0,
      affectedSwimmers: Number(snapshot.affectedSwimmers || 0) || 0,
      affectedTopBuckets: Number(snapshot.affectedTopBuckets || 0) || 0,
      writtenFiles: Number(snapshot.writtenFiles || 0) || 0,
      error: backendContext.cleanText(snapshot.error).slice(0, 500)
    });
  }

  function normalizeLivePalmesImportPerformances(rawPerformances = []) {
    const finalByImportLine = new Map();
    rawPerformances.forEach((perf) => {
      if (!perf.isIntermediate) {
        finalByImportLine.set(`${perf.importId}|${perf.sourceLine || perf.originSourceLine || ""}`, perf.performanceId || perf.id);
      }
    });

    return rawPerformances
      .map((perf) => {
        const course = backendContext.normalizeCourseCode(perf.course);
        if (!backendContext.POOL_COURSES.includes(course)) return null;
        const sex = backendContext.normalizeCategoryCode(perf.sex);
        if (sex !== "F" && sex !== "M") return null;
        const date = perf.date || perf.metadata?.date || "";
        const sourceCategory = perf.categoryCode || perf.importedCategoryCode || perf.classificationCategory || "";
        const category = backendContext.ageCategoryFromDates(date, perf.birthDate) || backendContext.fallbackCategoryFromSource(sourceCategory);
        if (!category) return null;
        const courseMeta = backendContext.coursePayload(course);
        const performanceId = perf.performanceId || perf.id;
        const originPerformanceId = perf.originPerformanceId ||
          (perf.isIntermediate ? finalByImportLine.get(`${perf.importId}|${perf.originSourceLine || perf.sourceLine || ""}`) || "" : "");
        const originCourse = backendContext.normalizeCourseCode(perf.originCourse);
        const originMeta = originCourse ? backendContext.coursePayload(originCourse) : null;
        const swimmerMatch = backendContext.resolveIntranapSwimmer(perf, sex);
        const matchedSwimmer = swimmerMatch.swimmer;
        const identityKey = backendContext.swimmerIdentityKey(perf.firstName, perf.lastName, perf.birthDate);
        const fallbackSwimmerId = `imported:${backendContext.stableHash(identityKey || [perf.firstName, perf.lastName, perf.birthDate].join("|")).slice(0, 16)}`;
        const swimmerId = matchedSwimmer?.id || fallbackSwimmerId;
        const firstName = backendContext.cleanText(matchedSwimmer?.firstName || perf.firstName);
        const lastName = backendContext.cleanText(matchedSwimmer?.lastName || perf.lastName);
        const swimmerName = backendContext.cleanText(matchedSwimmer?.name) || [firstName, lastName].filter(Boolean).join(" ").trim();

        return {
          id: `import:${perf.importId}:${performanceId}`,
          source: "livepalmes-import",
          importId: perf.importId,
          swimmerId,
          aliases: Array.isArray(matchedSwimmer?.aliases) ? matchedSwimmer.aliases : [],
          sourceIds: Array.isArray(matchedSwimmer?.sourceIds) ? matchedSwimmer.sourceIds : [swimmerId],
          originalSwimmerId: backendContext.cleanText(perf.swimmerId),
          swimmerIdentityKey: matchedSwimmer?.identityKey || identityKey,
          swimmerMatchMethod: swimmerMatch.method,
          swimmer: swimmerName,
          firstName,
          lastName,
          birthDate: matchedSwimmer?.birthDate || perf.birthDate || "",
          sex,
          clubId: backendContext.cleanText(perf.club),
          club: backendContext.cleanText(perf.club) || backendContext.cleanText(perf.clubName),
          clubName: backendContext.cleanText(perf.clubName),
          regionId: backendContext.cleanText(perf.regionId),
          regionLabel: backendContext.cleanText(perf.regionId),
          competitionId: perf.importId,
          qualificationCompetitionId: backendContext.cleanText(perf.metadata?.qualificationCompetitionId),
          competition: perf.competitionName || perf.metadata?.competitionName || "",
          location: perf.location || perf.metadata?.location || "",
          date,
          seasonYear: perf.seasonYear || backendContext.importSeasonYear(date),
          pool: perf.poolSize ? String(perf.poolSize) : "",
          timingType: backendContext.cleanTimingType(perf.timingType || perf.metadata?.timingType),
          chrono: backendContext.performanceImportChrono(perf),
          course,
          courseLabel: courseMeta.label,
          courseShortLabel: courseMeta.shortLabel,
          style: courseMeta.style,
          length: courseMeta.length,
          isIntermediate: perf.isIntermediate === true,
          originCourse,
          originCourseShortLabel: originMeta?.shortLabel || "",
          originPerformanceId: originPerformanceId ? `import:${perf.importId}:${originPerformanceId}` : "",
          category,
          categoryCode: backendContext.categoryCodeFromCategory(category, sex),
          categoryLabel: backendContext.CATEGORY_LABELS[sex]?.[category] || category,
          timeValue: Number(perf.timeValue) || 0,
          time: backendContext.cleanText(perf.time),
          intermediateTimes: Array.isArray(perf.intermediateTimes) ? perf.intermediateTimes : []
        };
      })
      .filter((perf) => perf && perf.timeValue > 0 && perf.date);
  }

  return { competitionImportPublicSnapshotSummary, normalizeLivePalmesImportPerformances };
}

module.exports = { createPerformanceService_competitionImportPublicSnapshotSummary };
