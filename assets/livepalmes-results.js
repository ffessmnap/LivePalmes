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
    const safeRows = (rows) => Array.isArray(rows) ? rows.map(resultWithoutPdf) : [];
    const finalists = result.finalists && typeof result.finalists === "object"
      ? {
        a: safeRows(result.finalists.a),
        b: safeRows(result.finalists.b)
      }
      : { a: [], b: [] };
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
      finalistsAnnouncedAt: result.finalistsAnnouncedAt || "",
      ranking: safeRows(result.ranking),
      performances: safeRows(result.performances),
      nextUnqualified: safeRows(result.nextUnqualified),
      finalists
    };
  }

  function publicSeriesPdfPayload(pdf) {
    if (!pdf) return null;
    return {
      id: pdf.id || "",
      scope: pdf.scope || "",
      documentType: pdf.documentType || "",
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
    const scope = pdf.scope || "";
    const documentType = pdf.documentType || "";
    const sourceLabel = scope === "full"
      ? "PDF complet de la compétition"
      : ((scope === "protocol" || documentType === "protocol")
        ? "Protocole complet de la compétition"
        : (pdf.sourceLabel || ""));
    return {
      id: pdf.id || "",
      scope,
      documentType,
      session: pdf.session || "",
      sessions,
      pdfName: pdf.pdfName || "",
      updatedAt: pdf.updatedAt || "",
      sourceLabel
    };
  }

  function entrantPerformanceNameKey(row, options = {}) {
    const normalizePersonName = options.normalizePersonName || ((value) => String(value || "").trim().toLocaleUpperCase("fr-FR"));
    const formatPersonNameParts = options.formatPersonNameParts || ((firstName, lastName, fallback) => [lastName, firstName].filter(Boolean).join(" ") || fallback || "");
    return normalizePersonName(formatPersonNameParts(row?.firstName, row?.lastName, row?.displayName || row?.name || ""));
  }

  function performanceBirthYear(row) {
    const text = String(row?.birthYear || row?.birthDate || "").trim();
    const match = text.match(/\b(19|20)\d{2}\b/);
    return match ? match[0] : text;
  }

  function performanceMatchesEntrant(performance, entrant, options = {}) {
    const recordEventMatches = options.recordEventMatches || ((left, right) => left === right);
    if (!performance || !entrant) return false;
    if (!recordEventMatches(performance.eventId, entrant.eventId)) return false;
    if (performance.sex && entrant.sex && performance.sex !== entrant.sex) return false;
    if (entrantPerformanceNameKey(performance, options) !== entrantPerformanceNameKey(entrant, options)) return false;
    const performanceBirth = performanceBirthYear(performance);
    const entrantBirth = performanceBirthYear(entrant);
    if (performanceBirth && entrantBirth && performanceBirth !== entrantBirth) return false;
    return true;
  }

  function performanceStatusResultLabel(performance) {
    const status = String(performance?.status || performance?.resultStatus || "").toLowerCase();
    const label = String(performance?.statusLabel || "").trim();
    const normalizedLabel = label
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    if (status === "dsq" || /\b(dsq|dq|disqual)/.test(normalizedLabel)) return "DSQ";
    if (status === "ab" || /\b(ab|abd|dnf|abandon)\b/.test(normalizedLabel)) return "ABD";
    if (status === "dns" || /\b(dns|ns|abs|absent|forfait)\b/.test(normalizedLabel)) return "Forfait";
    return label;
  }

  function performanceDisplayValue(performance) {
    return String(performanceStatusResultLabel(performance) || performance?.time || "").trim();
  }

  function resultRankForPerformance(performance, result, options = {}) {
    const rows = Array.isArray(result?.ranking) ? result.ranking : [];
    const match = rows.find((row) => {
      const candidate = {
        ...row,
        eventId: row.eventId || result.eventId || performance.eventId || "",
        sex: row.sex || result.sex || performance.sex || ""
      };
      if (!performanceMatchesEntrant(performance, candidate, options)) return false;
      const performanceTime = String(performance.time || "").trim();
      const candidateTime = String(row.time || "").trim();
      if (performanceTime && candidateTime && performanceTime !== candidateTime) return false;
      return true;
    });
    return match?.rank || "";
  }

  function performanceRankLabel(performance, options = {}) {
    const rank = Number(performance?.rank);
    if (!Number.isFinite(rank) || rank <= 0) return "";
    const formatRank = options.formatRank || ((value) => String(value));
    return formatRank(rank);
  }

  function swimmerBestPerformanceForEntry(entry, results = [], options = {}) {
    const isFinalStage = options.isFinalStage || (() => false);
    const performances = (Array.isArray(results) ? results : []).flatMap((result) =>
      (Array.isArray(result.performances) ? result.performances : []).map((performance) => ({
        ...performance,
        eventId: performance.eventId || result.eventId,
        sex: performance.sex || result.sex,
        stage: performance.stage || result.stage,
        phaseLabel: performance.phaseLabel || result.phaseLabel,
        rank: performance.rank || resultRankForPerformance(performance, result, options),
        updatedAt: performance.updatedAt || result.updatedAt
      }))
    ).filter((performance) => performanceMatchesEntrant(performance, entry, options) && performanceDisplayValue(performance));
    if (!performances.length) return null;
    return performances.sort((a, b) => {
      const finalA = isFinalStage(a.stage) ? 0 : 1;
      const finalB = isFinalStage(b.stage) ? 0 : 1;
      return finalA - finalB || String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
    })[0];
  }

  function compactProgramPerformanceLabel(entry, results = [], options = {}) {
    const isSpeakerView = options.isSpeakerView || (() => false);
    if (!isSpeakerView()) return "";
    const performance = swimmerBestPerformanceForEntry(entry, results, options);
    if (!performance) return "";
    const isFinalStage = options.isFinalStage || (() => false);
    const finalStageLabel = options.finalStageLabel || ((stage) => stage || "Finale");
    const escapeHtml = options.escapeHtml || ((value) => String(value ?? ""));
    const label = isFinalStage(performance.stage) ? finalStageLabel(performance.stage) : "Série";
    const rank = performanceRankLabel(performance, options);
    return `<small>${escapeHtml(label)} ${escapeHtml(performanceDisplayValue(performance))}${rank ? ` <b class="compact-program-rank">${escapeHtml(rank)}</b>` : ""}</small>`;
  }

  global.LivePalmesResults = {
    compactProgramPerformanceLabel,
    dataUrlToFile,
    deleteResultPdfPayload,
    entrantPerformanceNameKey,
    fileToDataUrl,
    loadResultPdfData,
    performanceBirthYear,
    performanceDisplayValue,
    performanceMatchesEntrant,
    performanceRankLabel,
    performanceStatusResultLabel,
    publicResultPayload,
    publicSeriesPdfPayload,
    publicSessionResultsPdfPayload,
    resultRankForPerformance,
    resultMetadataPayload,
    resultPdfDataUrl,
    resultPdfPayload,
    resultWithoutPdf,
    saveResultPdfPayload,
    swimmerBestPerformanceForEntry
  };
})(window);
