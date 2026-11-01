// Existing operation bodies; live services arrive through explicit accessors.
function createImportService_activeCompetitionImportData(backendContext) {
  function normalizeImportToken(value) {
    return backendContext.cleanText(value).replace(/\s+/g, " ");
  }

  function importPerformanceCategory(perf = {}) {
    return (0, backendContext.local$ageCategoryFromDates)(perf.date, perf.birthDate) ||
      (0, backendContext.local$fallbackCategoryFromSource)(perf.categoryCode || perf.importedCategoryCode || perf.classificationCategory);
  }

  function buildRecordAlert(perf, category, reference) {
    const timeValue = Number(perf.timeValue || 0);
    const referenceValue = Number(reference.value || 0);
    if (!timeValue || !referenceValue || timeValue > referenceValue) return null;
    const status = timeValue < referenceValue ? "improved" : "equal";
    const sourceLine = Number(perf.sourceLine || perf.originSourceLine || 0) || "";
    const swimmer = [perf.firstName, perf.lastName].filter(Boolean).join(" ").trim();
    const referenceSwimmer = backendContext.cleanText(reference.swimmer);
    if (status === "equal" && (0, backendContext.local$sameRecordAlertSwimmer)(swimmer, referenceSwimmer)) return null;
    return {
      type: reference.alertType,
      label: reference.alertLabel,
      status,
      swimmer,
      firstName: backendContext.cleanText(perf.firstName),
      lastName: backendContext.cleanText(perf.lastName),
      birthDate: backendContext.cleanText(perf.birthDate),
      sex: (0, backendContext.local$normalizeCategoryCode)(perf.sex),
      category,
      categoryCode: (0, backendContext.local$categoryCodeFromCategory)(category, (0, backendContext.local$normalizeCategoryCode)(perf.sex)),
      course: (0, backendContext.local$normalizeCourseCode)(perf.course),
      time: backendContext.cleanText(perf.time) || (0, backendContext.local$formatTimeValue)(timeValue),
      timeValue,
      referenceTime: backendContext.cleanText(reference.time) || (0, backendContext.local$formatTimeValue)(referenceValue),
      referenceValue,
      referenceSwimmer,
      referenceDate: backendContext.cleanText(reference.date),
      referenceLocation: backendContext.cleanText(reference.location),
      referenceKey: backendContext.cleanText(reference.key),
      date: backendContext.cleanText(perf.date),
      location: backendContext.cleanText(perf.location),
      club: backendContext.cleanText(perf.club),
      clubName: backendContext.cleanText(perf.clubName),
      isIntermediate: perf.isIntermediate === true,
      originCourse: (0, backendContext.local$normalizeCourseCode)(perf.originCourse),
      originTime: backendContext.cleanText(perf.originTime),
      splitCode: backendContext.cleanText(perf.splitCode),
      splitDistance: Number(perf.splitDistance || 0) || "",
      sourceLine
    };
  }

  function detectRecordAlerts(performances = [], recordsData = {}) {
    const referenceMap = (0, backendContext.local$recordReferenceMap)(recordsData);
    const alerts = [];
    const seen = new Set();
    performances.forEach((perf) => {
      const timeValue = Number(perf.timeValue || 0);
      const sex = (0, backendContext.local$normalizeCategoryCode)(perf.sex);
      const course = (0, backendContext.local$normalizeCourseCode)(perf.course);
      if (!timeValue || (sex !== "F" && sex !== "M") || !backendContext.POOL_COURSES.includes(course)) return;
      const category = importPerformanceCategory(perf);
      if (!category) return;
      const candidates = [
        (0, backendContext.local$recordReferenceForPerformance)(referenceMap, "MPF", perf, category),
        (0, backendContext.local$recordReferenceForPerformance)(referenceMap, "RF", perf, category),
        (0, backendContext.local$isYouthCategory)(category) ? (0, backendContext.local$recordReferenceForPerformance)(referenceMap, "RFJ", perf, category) : null
      ].filter(Boolean);
      candidates.forEach((reference) => {
        const alert = buildRecordAlert(perf, category, reference);
        if (!alert) return;
        const key = [
          alert.type,
          alert.course,
          alert.sex,
          alert.category,
          alert.timeValue,
          alert.swimmer,
          alert.date,
          alert.sourceLine,
          alert.isIntermediate ? alert.originCourse : ""
        ].join("|");
        if (seen.has(key)) return;
        seen.add(key);
        alerts.push(alert);
      });
    });
    return alerts.sort((a, b) =>
      ["RF", "RFJ", "MPF"].indexOf(a.type) - ["RF", "RFJ", "MPF"].indexOf(b.type) ||
      a.course.localeCompare(b.course, "fr-FR", { numeric: true }) ||
      a.timeValue - b.timeValue
    );
  }

  function importDocumentId(metadata = {}, fileHash = "") {
    const seed = [
      metadata.date,
      metadata.competitionName,
      metadata.location,
      metadata.poolSize,
      fileHash
    ].join("|");
    return backendContext.stableHash(seed).slice(0, 32);
  }

  function activeCompetitionImportData(data = {}) {
    return !["deleted", "replaced"].includes(backendContext.cleanText(data.status));
  }

  return { normalizeImportToken, importPerformanceCategory, buildRecordAlert, detectRecordAlerts, importDocumentId, activeCompetitionImportData };
}

module.exports = { createImportService_activeCompetitionImportData };
