function resultWithoutPdf(value = {}) {
  const clean = { ...value };
  delete clean.pdfDataUrl;
  return clean;
}

function safeRows(rows) {
  return Array.isArray(rows) ? rows.map(resultWithoutPdf) : [];
}

function publicResultPayload(resultId, result = {}) {
  const finalists = result.finalists && typeof result.finalists === "object"
    ? {
        a: safeRows(result.finalists.a),
        b: safeRows(result.finalists.b)
      }
    : { a: [], b: [] };
  return {
    id: resultId || result.id || "",
    raceKey: result.raceKey || "",
    programKey: result.programKey || "",
    eventId: result.eventId || "",
    eventLabel: result.eventLabel || "",
    sex: result.sex || "",
    sexLabel: result.sexLabel || "",
    stage: result.stage || "series",
    phaseLabel: result.phaseLabel || "",
    finalStageCount: result.finalStageCount || 0,
    session: result.session || "",
    startTime: result.startTime || "",
    hasFinal: Boolean(result.hasFinal),
    pdfName: result.pdfName || "",
    pdfSize: result.pdfSize || 0,
    createdAt: result.createdAt || "",
    updatedAt: result.updatedAt || "",
    isPartial: Boolean(result.isPartial),
    status: result.status || "",
    finalistsAnnouncedAt: result.finalistsAnnouncedAt || "",
    ranking: safeRows(result.ranking),
    performances: safeRows(result.performances),
    nextUnqualified: safeRows(result.nextUnqualified),
    finalists
  };
}

function nextPublicResultsIndex(currentIndex = {}, resultId, officialResult = {}) {
  if (currentIndex.publicAccess?.online === false) return null;
  const payload = publicResultPayload(resultId, officialResult);
  const currentResults = Array.isArray(currentIndex.results) ? currentIndex.results : [];
  const existingIndex = currentResults.findIndex((result) => result?.id === payload.id);
  const results = existingIndex === -1
    ? [payload, ...currentResults]
    : currentResults.map((result, index) => index === existingIndex ? payload : result);
  return {
    results,
    updatedAt: payload.updatedAt || currentIndex.updatedAt || ""
  };
}

module.exports = {
  nextPublicResultsIndex,
  publicResultPayload
};
