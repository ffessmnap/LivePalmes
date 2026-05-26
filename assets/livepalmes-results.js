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

  async function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("Lecture du fichier impossible."));
      reader.readAsDataURL(file);
    });
  }

  async function dataUrlToFile(dataUrl, name = "resultat.pdf", type = "application/pdf") {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return new File([blob], name, { type: blob.type || type });
  }

  async function loadResultPdfData(result, options = {}) {
    if (!result?.id) return null;
    const collection = options.collection || null;
    const payloadFactory = options.resultPdfPayload || resultPdfPayload;
    if (collection) {
      const snapshot = await collection.doc(result.id).get({ source: "server" }).catch(() => null);
      if (snapshot?.exists) return { id: snapshot.id, ...snapshot.data() };
    }
    if (result.pdfDataUrl) {
      return payloadFactory(result, result.pdfDataUrl);
    }
    return null;
  }

  async function resultPdfDataUrl(result, options = {}) {
    const pdf = await loadResultPdfData(result, options);
    if (!pdf?.pdfDataUrl) {
      throw new Error("Aucun PDF déjà publié à relire pour cette course.");
    }
    return pdf.pdfDataUrl;
  }

  async function saveResultPdfPayload(result, pdfDataUrl, options = {}) {
    const collection = options.collection || null;
    if (!collection) throw new Error("Firebase n'est pas disponible pour stocker le PDF résultat.");
    const payloadFactory = options.resultPdfPayload || resultPdfPayload;
    const payload = payloadFactory(result, pdfDataUrl);
    await collection.doc(result.id).set(JSON.parse(JSON.stringify(payload)));
    return payload;
  }

  async function deleteResultPdfPayload(resultId, options = {}) {
    const collection = options.collection || null;
    const onError = typeof options.onError === "function" ? options.onError : null;
    if (!collection || !resultId) return;
    await collection.doc(resultId).delete().catch((error) => {
      if (onError) onError(error);
    });
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
    dataUrlToFile,
    deleteResultPdfPayload,
    fileToDataUrl,
    loadResultPdfData,
    publicResultPayload,
    publicSeriesPdfPayload,
    publicSessionResultsPdfPayload,
    resultMetadataPayload,
    resultPdfDataUrl,
    resultPdfPayload,
    resultWithoutPdf,
    saveResultPdfPayload
  };
})(window);
