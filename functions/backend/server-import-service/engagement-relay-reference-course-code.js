// Existing operation bodies; live services arrive through explicit accessors.
function createImportService_engagementRelayReferenceCourseCode(backendContext) {
  function engagementRelayReferenceCourseCode(course) {
    const code = (0, backendContext.local$normalizeCourseCode)(course);
    return code === "4X100BI" ? "4X100BIX" : code;
  }

  function engagementRelayReferenceRows(recordsData = {}) {
    return [
      ...(Array.isArray(recordsData.franceRecords) ? recordsData.franceRecords : []).map((row) => ({
        ...row,
        alertType: row.recordType === "RFJ" ? "RFJ" : "RF",
        alertLabel: row.recordType === "RFJ" ? "Record de France Junior club" : "Record de France club"
      })),
      ...(Array.isArray(recordsData.records) ? recordsData.records : []).map((row) => ({
        ...row,
        alertType: "MPF",
        alertLabel: "Meilleure Performance Francaise club"
      }))
    ].filter((row) =>
      (0, backendContext.local$normalizeCourseCode)(row.course).startsWith("4X") &&
      (backendContext.cleanText(row.relayType).toLowerCase() === "club" || backendContext.cleanText(row.style).toUpperCase() === "RELAY_CLUB") &&
      (row.sex === "F" || row.sex === "M") &&
      Number(row.value || 0) > 0 &&
      backendContext.cleanText(row.time) &&
      backendContext.cleanText(row.time) !== "A etablir" &&
      backendContext.cleanText(row.time) !== "À établir"
    );
  }

  function engagementRelayReferenceKey(row = {}) {
    return [
      backendContext.cleanText(row.alertType || row.recordType || "MPF"),
      backendContext.cleanText(row.mixedRelay) === "true" || row.mixedRelay === true ? "MIXED" : backendContext.cleanText(row.sex),
      backendContext.cleanText(row.alertType) === "MPF" ? backendContext.cleanText(row.category) : "",
      (0, backendContext.local$normalizeCourseCode)(row.course)
    ].join("|");
  }

  function engagementRelayReferenceMap(recordsData = {}) {
    const byKey = new Map();
    engagementRelayReferenceRows(recordsData).forEach((row) => {
      const key = engagementRelayReferenceKey(row);
      const existing = byKey.get(key);
      if (!existing || Number(row.value || 0) < Number(existing.value || 0)) byKey.set(key, row);
    });
    return byKey;
  }

  function engagementRelayReferenceForEntry(referenceMap, type, relay = {}) {
    const sex = relay.genderMode === "mixed" ? "MIXED" : relay.genderMode === "male" ? "M" : "F";
    const course = engagementRelayReferenceCourseCode(relay.eventCode);
    const key = [type, sex, type === "MPF" ? relay.category : "", course].join("|");
    return referenceMap.get(key) || null;
  }

  return { engagementRelayReferenceCourseCode, engagementRelayReferenceRows, engagementRelayReferenceKey, engagementRelayReferenceMap, engagementRelayReferenceForEntry };
}

module.exports = { createImportService_engagementRelayReferenceCourseCode };
