// Existing operation bodies; live services arrive through explicit accessors.
function createImportService_isYouthCategory(backendContext) {
  function recordReferenceRows(recordsData = {}) {
    return [
      ...(Array.isArray(recordsData.franceRecords) ? recordsData.franceRecords : []).map((row) => ({
        ...row,
        alertType: row.recordType === "RFJ" ? "RFJ" : "RF",
        alertLabel: row.recordType === "RFJ" ? "Record de France Jeunes" : "Record de France"
      })),
      ...(Array.isArray(recordsData.records) ? recordsData.records : []).map((row) => ({
        ...row,
        alertType: "MPF",
        alertLabel: "Meilleure Performance Francaise"
      }))
    ].filter((row) =>
      !String(row.course || "").startsWith("4X") &&
      (0, backendContext.local$normalizeCourseCode)(row.course) &&
      (row.sex === "F" || row.sex === "M") &&
      Number(row.value || 0) > 0 &&
      backendContext.cleanText(row.time) &&
      backendContext.cleanText(row.time) !== "A etablir" &&
      backendContext.cleanText(row.time) !== "À établir"
    );
  }

  function recordReferenceKey(row = {}) {
    return [
      backendContext.cleanText(row.alertType || row.recordType || "MPF"),
      backendContext.cleanText(row.sex),
      backendContext.cleanText(row.alertType) === "MPF" ? backendContext.cleanText(row.category) : "",
      (0, backendContext.local$normalizeCourseCode)(row.course)
    ].join("|");
  }

  function recordReferenceMap(recordsData = {}) {
    const byKey = new Map();
    recordReferenceRows(recordsData).forEach((row) => {
      const key = recordReferenceKey(row);
      const existing = byKey.get(key);
      if (!existing || Number(row.value || 0) < Number(existing.value || 0)) byKey.set(key, row);
    });
    return byKey;
  }

  function recordReferenceForPerformance(referenceMap, type, perf, category) {
    const sex = (0, backendContext.local$normalizeCategoryCode)(perf.sex);
    const course = (0, backendContext.local$normalizeCourseCode)(perf.course);
    const key = [type, sex, type === "MPF" ? category : "", course].join("|");
    return referenceMap.get(key) || null;
  }

  function isYouthCategory(category) {
    return ["P", "B", "M", "C", "J"].includes(backendContext.cleanText(category));
  }

  return { recordReferenceRows, recordReferenceKey, recordReferenceMap, recordReferenceForPerformance, isYouthCategory };
}

module.exports = { createImportService_isYouthCategory };
