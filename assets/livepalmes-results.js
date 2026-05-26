(function attachLivePalmesResults(global) {
  function resultWithoutPdf(result) {
    if (!result) return result;
    const clean = { ...result };
    delete clean.pdfDataUrl;
    return clean;
  }

  function resultMetadataPayload(result) {
    return resultWithoutPdf(result);
  }

  function resultPdfPayload(result, pdfDataUrl, options = {}) {
    return {
      id: result?.id || "",
      resultId: result?.id || "",
      pdfName: result?.pdfName || "",
      pdfSize: result?.pdfSize || 0,
      pdfDataUrl: pdfDataUrl || "",
      updatedAt: result?.updatedAt || "",
      eventLabel: result?.eventLabel || "",
      sexLabel: result?.sexLabel || options.sexLabel || "",
      session: result?.session || ""
    };
  }

  function publicResultPayload(result, options = {}) {
    if (!result) return null;
    return {
      id: result.id || "",
      raceKey: result.raceKey || "",
      programKey: result.programKey || "",
      eventId: result.eventId || "",
      eventLabel: result.eventLabel || "",
      sex: result.sex || "",
      sexLabel: result.sexLabel || options.sexLabel || "",
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
      finalistsAnnouncedAt: result.finalistsAnnouncedAt || ""
    };
  }

  function publicSeriesPdfPayload(pdf) {
    if (!pdf) return null;
    return {
      id: pdf.id || "",
      scope: pdf.scope || "",
      session: pdf.session || "",
      pdfName: pdf.pdfName || "",
      updatedAt: pdf.updatedAt || "",
      sourceLabel: pdf.sourceLabel || ""
    };
  }

  function publicSessionResultsPdfPayload(pdf) {
    if (!pdf) return null;
    const sessions = Array.isArray(pdf.sessions)
      ? pdf.sessions.map((session) => String(session || "").trim()).filter(Boolean)
      : [];
    return {
      id: pdf.id || "",
      scope: pdf.scope || "",
      session: pdf.session || "",
      sessions,
      pdfName: pdf.pdfName || "",
      updatedAt: pdf.updatedAt || "",
      sourceLabel: pdf.sourceLabel || ""
    };
  }

  global.LivePalmesResults = {
    publicResultPayload,
    publicSeriesPdfPayload,
    publicSessionResultsPdfPayload,
    resultMetadataPayload,
    resultPdfPayload,
    resultWithoutPdf
  };
})(window);
