(function () {
  const context = {};
  let api;
  with (context) {
  function resultIdForProgramRow(row) {
    const base = `result-${raceOptionKey(row.eventId, row.sex).replace(/[^a-z0-9_-]+/gi, "-")}`;
    if (!isFinalStage(row.stage)) return base;
    const stage = String(row.stage || "finale").replace(/[^a-z0-9_-]+/gi, "-");
    return `${base}-${stage}`;
  }
  
  function resultForProgramRow(row) {
    const raceKey = raceOptionKey(row.eventId, row.sex);
    const exact = raceResults.find((result) =>
      result.programKey === programKey(row) ||
      result.id === resultIdForProgramRow(row)
    );
    if (exact) return exact;
    if (isFinalStage(row.stage)) return null;
    return raceResults.find((result) => result.raceKey === raceKey && !isFinalStage(result.stage)) || null;
  }
  
  const livePalmesResults = window.LivePalmesResults || {
    resultWithoutPdf(result) {
      if (!result) return result;
      const clean = { ...result };
      delete clean.pdfDataUrl;
      return clean;
    },
    resultMetadataPayload(result) {
      return this.resultWithoutPdf(result);
    },
    resultPdfPayload(result, pdfDataUrl, options = {}) {
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
    },
    publicResultPayload(result, options = {}) {
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
    },
    publicSeriesPdfPayload(pdf) {
      if (!pdf) return null;
      return {
        id: pdf.id || "",
        scope: pdf.scope || "",
        session: pdf.session || "",
        pdfName: pdf.pdfName || "",
        updatedAt: pdf.updatedAt || "",
        sourceLabel: pdf.sourceLabel || ""
      };
    },
    publicSessionResultsPdfPayload(pdf) {
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
  };
  const resultWithoutPdf = livePalmesResults.resultWithoutPdf.bind(livePalmesResults);
  const resultMetadataPayload = livePalmesResults.resultMetadataPayload.bind(livePalmesResults);
  
  function resultPdfPayload(result, pdfDataUrl) {
    return livePalmesResults.resultPdfPayload(result, pdfDataUrl, {
      sexLabel: sexDisplayLabel(result?.sex)
    });
  }
  
  function publicResultPayload(result) {
    return livePalmesResults.publicResultPayload(result, {
      sexLabel: sexDisplayLabel(result?.sex)
    });
  }
  
  const publicSeriesPdfPayload = livePalmesResults.publicSeriesPdfPayload.bind(livePalmesResults);
  const publicSessionResultsPdfPayload = livePalmesResults.publicSessionResultsPdfPayload.bind(livePalmesResults);
  
  function buildPublicResultsIndex() {
    return livePalmesPublication.buildPublicResultsIndex({
      data,
      raceResults,
      publicResultPayload,
      publicSeriesPdfPayload,
      publicSessionResultsPdfPayload
    });
  }
  
  async function publishPublicResultsIndex({ silent = false, strict = false } = {}) {
    const doc = publicResultsIndexDocument();
    if (!doc) return;
    try {
      await hydratePublicSeriesPdfMetadataIfNeeded();
      await hydratePublicSessionResultsPdfMetadataIfNeeded();
      await doc.set(JSON.parse(JSON.stringify(buildPublicResultsIndex())));
    } catch (error) {
      console.warn("Publication de l'index public impossible", error);
      if (!silent) {
        renderDataStatus("L'index public des résultats n'a pas pu être mis à jour. Vérifie les règles Firebase.");
      }
      if (strict) throw error;
    }
  }
  
  function publicSeriesPdfId(scope, session = "") {
    if (typeof livePalmesAdminMaintenance.publicSeriesPdfId === "function") {
      return livePalmesAdminMaintenance.publicSeriesPdfId(scope, session);
    }
    return scope === "full" ? "full" : `session-${String(session || "").replace(/[^a-z0-9_-]+/gi, "-")}`;
  }
  
  function updatePublicSeriesPdfMetadata(pdf) {
    const metadata = publicSeriesPdfPayload(pdf);
    if (!metadata) return;
    const current = Array.isArray(data.notes?.publicSeriesPdfs) ? data.notes.publicSeriesPdfs : [];
    const next = livePalmesPublication.nextPublicSeriesPdfMetadata(current, metadata);
    data = normalizeData({
      ...data,
      notes: {
        ...(data.notes || {}),
        publicSeriesPdfs: next
      }
    });
    saveData();
  }
  
  function clearPublicSeriesPdfMetadata() {
    data = normalizeData({
      ...data,
      notes: {
        ...(data.notes || {}),
        publicSeriesPdfs: []
      }
    });
    saveData();
  }
  
  async function hydratePublicSeriesPdfMetadataIfNeeded() {
    if (Array.isArray(data.notes?.publicSeriesPdfs)) return;
    const collection = seriesPdfsCollection();
    if (!collection) return;
    const snapshot = await collection.get();
    const metadata = snapshot.docs
      .map((doc) => publicSeriesPdfPayload({ id: doc.id, ...doc.data() }))
      .filter(Boolean)
      .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
    data = normalizeData({
      ...data,
      notes: {
        ...(data.notes || {}),
        publicSeriesPdfs: metadata
      }
    });
    saveData();
  }
  
  async function clearPublicSeriesPdfs() {
    const collection = seriesPdfsCollection();
    if (!collection) return 0;
    const snapshot = await collection.get();
    await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
    clearPublicSeriesPdfMetadata();
    return snapshot.docs.length;
  }
  
  function clearPublicSessionResultsPdfMetadata() {
    data = normalizeData({
      ...data,
      notes: {
        ...(data.notes || {}),
        publicSessionResultsPdfs: []
      }
    });
    saveData();
  }
  
  async function clearPublicSessionResultsPdfs() {
    const collection = sessionResultsPdfsCollection();
    if (!collection) return 0;
    const snapshot = await collection.get();
    await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
    clearPublicSessionResultsPdfMetadata();
    return snapshot.docs.length;
  }
  
  async function clearPublicSessionResultsPdfsForSession(session) {
    const cleanSession = String(session || "").trim();
    if (!cleanSession) return 0;
    const collection = sessionResultsPdfsCollection();
    if (!collection) return 0;
    const snapshot = await collection.get();
    const docs = snapshot.docs.filter((doc) => {
      const pdf = { id: doc.id, ...doc.data() };
      if (typeof livePalmesAdminMaintenance.sessionResultsPdfMatchesSession === "function") {
        return livePalmesAdminMaintenance.sessionResultsPdfMatchesSession(pdf, cleanSession);
      }
      if (pdf.scope === "full") return false;
      const sessions = Array.isArray(pdf.sessions) ? pdf.sessions.map(String) : [];
      return String(pdf.session || "") === cleanSession || sessions.includes(cleanSession);
    });
    await Promise.all(docs.map((doc) => doc.ref.delete()));
    const deletedIds = new Set(docs.map((doc) => doc.id));
    const current = Array.isArray(data.notes?.publicSessionResultsPdfs) ? data.notes.publicSessionResultsPdfs : [];
    data = normalizeData({
      ...data,
      notes: {
        ...(data.notes || {}),
        publicSessionResultsPdfs: current.filter((pdf) => !deletedIds.has(pdf.id))
      }
    });
    saveData();
    return docs.length;
  }
  
  async function publishPublicSeriesPdf(file, mode = "session", session = "") {
    const collection = seriesPdfsCollection();
    if (!collection || !file) return null;
    const scope = mode === "full" ? "full" : "session";
    const now = new Date().toISOString();
    const id = publicSeriesPdfId(scope, session);
    const payload = {
      id,
      scope,
      session: scope === "session" ? String(session || "") : "",
      pdfName: file.name,
      pdfDataUrl: await fileToDataUrl(file),
      updatedAt: now,
      sourceLabel: scope === "full" ? "Séries complètes" : `Séries session ${session || "-"}`
    };
    await collection.doc(id).set(JSON.parse(JSON.stringify(payload)));
    updatePublicSeriesPdfMetadata(payload);
    return payload;
  }
  
  function sessionResultsPdfId(scope, sessions = []) {
    if (typeof livePalmesAdminMaintenance.sessionResultsPdfId === "function") {
      return livePalmesAdminMaintenance.sessionResultsPdfId(scope, sessions);
    }
    if (scope === "full") return "complete-results-full";
    const safeSessions = sessions.map((session) => String(session || "").replace(/[^a-z0-9_-]+/gi, "-")).filter(Boolean);
    return `complete-results-${safeSessions.join("-") || "session"}`;
  }
  
  function updatePublicSessionResultsPdfMetadata(pdf) {
    const metadata = publicSessionResultsPdfPayload(pdf);
    if (!metadata) return;
    const current = Array.isArray(data.notes?.publicSessionResultsPdfs) ? data.notes.publicSessionResultsPdfs : [];
    const next = livePalmesPublication.nextPublicSessionResultsPdfMetadata(current, metadata);
    data = normalizeData({
      ...data,
      notes: {
        ...(data.notes || {}),
        publicSessionResultsPdfs: next
      }
    });
    saveData();
  }
  
  async function hydratePublicSessionResultsPdfMetadataIfNeeded() {
    if (Array.isArray(data.notes?.publicSessionResultsPdfs)) return;
    const collection = sessionResultsPdfsCollection();
    if (!collection) return;
    const snapshot = await collection.get();
    const metadata = snapshot.docs
      .map((doc) => publicSessionResultsPdfPayload({ id: doc.id, ...doc.data() }))
      .filter(Boolean)
      .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
    data = normalizeData({
      ...data,
      notes: {
        ...(data.notes || {}),
        publicSessionResultsPdfs: metadata
      }
    });
    saveData();
  }
  
  async function publishSessionResultsPdf(file, scope = "session", sessions = []) {
    const collection = sessionResultsPdfsCollection();
    if (!collection || !file) throw new Error("Firebase n'est pas disponible pour publier ce PDF.");
    const cleanSessions = typeof livePalmesAdminMaintenance.normalizeSessionList === "function"
      ? livePalmesAdminMaintenance.normalizeSessionList(sessions)
      : [...new Set((sessions || []).map((session) => String(session || "").trim()).filter(Boolean))]
        .sort((a, b) => Number(a) - Number(b));
    const finalScope = scope === "full" ? "full" : "sessions";
    if (finalScope !== "full" && !cleanSessions.length) {
      throw new Error("Sélectionne au moins une session pour publier ce PDF.");
    }
    const now = new Date().toISOString();
    const id = sessionResultsPdfId(finalScope, cleanSessions);
    const sessionLabel = finalScope === "full"
      ? "Résultats complets de la compétition"
      : `Résultats complets ${cleanSessions.map((session) => `S${session}`).join(" + ")}`;
    const payload = {
      id,
      scope: finalScope,
      session: finalScope === "sessions" && cleanSessions.length === 1 ? cleanSessions[0] : "",
      sessions: finalScope === "full" ? [] : cleanSessions,
      pdfName: file.name,
      pdfDataUrl: await fileToDataUrl(file),
      updatedAt: now,
      sourceLabel: sessionLabel
    };
    await collection.doc(id).set(JSON.parse(JSON.stringify(payload)));
    updatePublicSessionResultsPdfMetadata(payload);
    await publishPublicResultsIndex();
    return payload;
  }
  
  function isLastProgramPartForRace(row) {
    const raceRows = (data.program || [])
      .filter((item) => item.eventId === row.eventId && item.sex === row.sex && !isFinalStage(item.stage))
      .sort((a, b) => Number(a.session || 0) - Number(b.session || 0) || Number(a.order || 9999) - Number(b.order || 9999));
    if (!raceRows.length) return true;
    return programKey(raceRows[raceRows.length - 1]) === programKey(row);
  }
  
  function resultSessions() {
    return sessionRows().filter((session) =>
      (data.program || []).some((row) => row.session === session.number && row.eventId && row.sex)
    );
  }
  
  function sessionResultsPdfsForAdminSession(session) {
    if (typeof livePalmesAdminResults.sessionResultsPdfsForSession === "function") {
      return livePalmesAdminResults.sessionResultsPdfsForSession(data.notes?.publicSessionResultsPdfs || [], session);
    }
    return [];
  }
  
  function latestResultSession() {
    if (typeof livePalmesAdminResults.latestResultSession === "function") {
      return livePalmesAdminResults.latestResultSession(raceResults);
    }
    return "";
  }
  
  function ensureResultsAdminSession() {
    const sessions = resultSessions();
    if (!sessions.length) {
      resultsAdminSession = "";
      return "";
    }
    if (resultsAdminSession && sessions.some((session) => session.number === resultsAdminSession)) {
      return resultsAdminSession;
    }
    const speakerSession = roleStates.speaker?.session && roleStates.speaker.session !== "all" ? String(roleStates.speaker.session) : "";
    const currentSession = state.session && state.session !== "all" ? String(state.session) : "";
    const latestSession = latestResultSession();
    resultsAdminSession = [speakerSession, currentSession, latestSession, "1", sessions[0].number]
      .find((candidate) => candidate && sessions.some((session) => session.number === candidate)) || sessions[0].number;
    return resultsAdminSession;
  }
  
  function resultProgramRows(sessionNumber = "") {
    const seenRegular = new Set();
    const seenFinals = new Set();
    const sortedRows = (data.program || [])
      .filter((row) => row.eventId && row.sex)
      .filter((row) => !sessionNumber || row.session === sessionNumber)
      .sort((a, b) => Number(a.session || 0) - Number(b.session || 0) || Number(a.order || 9999) - Number(b.order || 9999));
    const rows = [];
    sortedRows.forEach((row) => {
      if (isFinalStage(row.stage)) {
        const key = `${row.session || ""}|${row.eventId}|${row.sex}|finales`;
        if (seenFinals.has(key)) return;
        seenFinals.add(key);
        const finalRows = sortedRows.filter((item) =>
          item.session === row.session &&
          item.eventId === row.eventId &&
          item.sex === row.sex &&
          isFinalStage(item.stage)
        );
        rows.push({
          ...row,
          finalStageCount: finalRows.length,
          finalStages: finalRows.map((item) => item.stage).filter(Boolean),
          stage: finalRows.length > 1 ? "finales" : row.stage,
          startTime: finalRows.map((item) => item.startTime).filter(Boolean)[0] || row.startTime || ""
        });
        return;
      }
      const raceKey = raceOptionKey(row.eventId, row.sex);
      if (!isLastProgramPartForRace(row) && !resultForProgramRow(row)) {
        rows.push(row);
        return;
      }
      if (seenRegular.has(raceKey)) return;
      seenRegular.add(raceKey);
      rows.push(row);
    });
    return rows;
  }
  
  function resultPhaseLabelForProgramRow(row) {
    if (isFinalStage(row.stage)) {
      return Number(row.finalStageCount || 0) > 1 || row.stage === "finales" ? "finales" : "finale";
    }
    const finals = (data.program || []).filter((item) => item.eventId === row.eventId && item.sex === row.sex && isFinalStage(item.stage));
    const seriesNumbers = (data.series || [])
      .filter((item) => item.eventId === row.eventId && item.sex === row.sex)
      .filter((item) => !row.session || !item.session || item.session === row.session)
      .filter((item) => !isFinalStage(item.stage))
      .map((item) => Number(item.series))
      .filter(Number.isFinite);
    const uniqueSeries = [...new Set(seriesNumbers)];
    if (!finals.length && isSplitRaceAcrossSessions(row.eventId, row.sex) && isLastProgramPartForRace(row)) {
      return "meilleure série";
    }
    return uniqueSeries.length > 1 ? "séries" : "série";
  }
  
  function resultStatusForProgramRow(row) {
    const result = resultForProgramRow(row);
    if (typeof livePalmesAdminResults.resultStatusLabel === "function") {
      return livePalmesAdminResults.resultStatusLabel(result);
    }
    return "";
  }
  
  function resultStatusBadgeForProgramRow(row, result, isFinalCompositionDefinitive) {
    if (typeof livePalmesAdminResults.resultStatusBadge === "function") {
      return livePalmesAdminResults.resultStatusBadge(result, isFinalCompositionDefinitive);
    }
    return result ? { label: "Résultat publié", tone: "done" } : { label: "À importer", tone: "missing" };
  }
  
  function resultStatusControlHtml(row, result, statusBadge) {
    if (typeof livePalmesAdminResults.resultStatusControlHtml === "function") {
      return livePalmesAdminResults.resultStatusControlHtml({
        programKeyValue: programKey(row),
        result,
        resultId: result?.id || "",
        statusBadge
      });
    }
    return "";
  }
  
  function resultUploadKeyForProgram(row) {
    if (typeof livePalmesAdminResults.resultUploadKeyForProgram === "function") {
      return livePalmesAdminResults.resultUploadKeyForProgram(programKey(row));
    }
    return `result:${programKey(row)}`;
  }
  
  function resultUploadKeyForSessionResults(session) {
    if (typeof livePalmesAdminResults.resultUploadKeyForSessionResults === "function") {
      return livePalmesAdminResults.resultUploadKeyForSessionResults(session);
    }
    return `session-results:${String(session || "current")}`;
  }
  
  function setResultUploadState(key, label, tone = "loading") {
    if (!key) return;
    resultUploadStates.set(key, { label, tone });
    renderResultsAdminPanel();
  }
  
  function clearResultUploadState(key) {
    if (!key) return;
    resultUploadStates.delete(key);
    renderResultsAdminPanel();
  }
  
  function setSeriesImportState(label, tone = "loading") {
    seriesImportState = { label, tone };
    renderResultsAdminPanel();
  }
  
  function clearSeriesImportState() {
    seriesImportState = null;
    renderResultsAdminPanel();
  }
  
  function resultUploadBadgeHtml(uploadState) {
    if (typeof livePalmesAdminResults.resultUploadBadgeHtml === "function") {
      return livePalmesAdminResults.resultUploadBadgeHtml(uploadState);
    }
    return "";
  }
  
  function renderResultsAdminPanel() {
    if (!resultsAdminPanel) return;
    if (state.role !== "computer") {
      resultsAdminPanel.hidden = true;
      resultsAdminPanel.innerHTML = "";
      renderComputerFooterPanel();
      return;
    }
    const sessions = resultSessions();
    const activeSession = ensureResultsAdminSession();
    const rows = resultProgramRows(activeSession);
    const publicResultsOnline = data.notes?.publicResultsOnline !== false;
    resultsAdminPanel.hidden = false;
    resultsAdminPanel.innerHTML = livePalmesAdminResults.renderResultsAdminPanelHtml({
      activeSession,
      publicResultsOnline,
      rowsHtml: rows.map((row) => renderResultProgramRow(row)).join(""),
      seriesImportBusy: seriesImportState?.tone === "loading",
      seriesImportStateHtml: seriesImportState ? resultUploadBadgeHtml(seriesImportState) : "",
      sessionResultsImportHtml: renderSessionResultsImportRow(activeSession),
      sessions
    });
    renderComputerFooterPanel();
  }
  
  const livePalmesDiagnostics = window.LivePalmesDiagnostics || {
    formatByteSize(bytes) {
      const value = Number(bytes || 0);
      if (!Number.isFinite(value) || value <= 0) return "0 ko";
      if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
      return `${Math.max(1, Math.round(value / 1024))} ko`;
    },
    dataUrlApproxBytes(value) {
      const text = String(value || "");
      const base64 = text.includes(",") ? text.split(",").at(-1) : text;
      return Math.round((base64.length * 3) / 4);
    },
    performanceDiagnosticLines(report) {
      if (!report?.available) return [report?.message || "Diagnostic performance indisponible."];
      return [
        `Competition : ${report.competitionId}`,
        `Resultats : ${report.publicResultCount}/${report.resultCount} visibles/publics`,
        `PDF dans resultPdfs : ${report.resultPdfCount}`,
        `PDF encore dans results : ${report.legacyPdfCount}`,
        `Poids a nettoyer : ${this.formatByteSize(report.legacyBytes)}`,
        `Index public : ${this.formatByteSize(report.publicIndexBytes)}`,
        `Index public MAJ : ${report.publicIndexUpdatedAt || "inconnue"}`,
        `Temps lecture diagnostic : ${report.readMs} ms`
      ];
    }
  };
  const formatByteSize = livePalmesDiagnostics.formatByteSize;
  const dataUrlApproxBytes = livePalmesDiagnostics.dataUrlApproxBytes;
  const performanceDiagnosticLines = livePalmesDiagnostics.performanceDiagnosticLines.bind(livePalmesDiagnostics);
  const livePalmesAdminDiagnostics = window.LivePalmesAdminDiagnostics || {};
  const livePalmesAdminMaintenance = window.LivePalmesAdminMaintenance || {};
  const livePalmesAdminModals = window.LivePalmesAdminModals || {};
  const livePalmesAdminArchives = window.LivePalmesAdminArchives || {};
  const livePalmesAdminResults = window.LivePalmesAdminResults || {};
  const livePalmesPdfImport = window.LivePalmesPdfImport || {};
  const livePalmesSeriesImport = window.LivePalmesSeriesImport || {};
  const livePalmesSpeakerInfo = window.LivePalmesSpeakerInfo || {};
  const livePalmesProgramNavigation = window.LivePalmesProgramNavigation || {};
  const livePalmesSwimmerPanel = window.LivePalmesSwimmerPanel || {};
  const livePalmesProgramView = window.LivePalmesProgramView || {};
  const livePalmesRefereeView = window.LivePalmesRefereeView || {};
  const livePalmesRoleQueueView = window.LivePalmesRoleQueueView || {};
  const livePalmesHistoryView = window.LivePalmesHistoryView || {};
  const livePalmesHeaderView = window.LivePalmesHeaderView || {};
  const livePalmesAlertDetailView = window.LivePalmesAlertDetailView || {};
  const livePalmesAlertCardView = window.LivePalmesAlertCardView || {};
  const livePalmesLineStatusView = window.LivePalmesLineStatusView || {};
  const diagnosticItem = livePalmesAdminDiagnostics.diagnosticItem || ((label, value, status = "ok") => `
    <span class="diagnostic-item ${escapeHtml(status)}">
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(label)}</small>
    </span>
  `);
  const technicalDiagnosticStatus = livePalmesAdminDiagnostics.technicalDiagnosticStatus || ((value, warnLimit = 0, dangerLimit = Number.POSITIVE_INFINITY) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return "neutral";
    if (number >= dangerLimit) return "warn";
    if (number > warnLimit) return "warn";
    return "ok";
  });
  const technicalDiagnosticSection = livePalmesAdminDiagnostics.technicalDiagnosticSection || ((title, items = []) => `
    <div class="technical-diagnostic-section">
      <h3>${escapeHtml(title)}</h3>
      <div class="competition-diagnostic">
        ${items.map((item) => diagnosticItem(item.label, item.value, item.status || "neutral")).join("")}
      </div>
    </div>
  `);
  
  function renderCompetitionDiagnostic() {
    const sessions = sessionRows();
    const programCount = data.program?.length || 0;
    const resultCount = raceResults.length;
    const publicResultCount = raceResults.filter((result) => !result.hasFinal || result.finalistsAnnouncedAt).length;
    const seriesPdfCount = Array.isArray(data.notes?.publicSeriesPdfs) ? data.notes.publicSeriesPdfs.length : 0;
    const pendingAlerts = alerts.filter((alert) => (
      alert.speakerStatus === "pending" ||
      alert.videoStatus === "pending" ||
      alert.informaticsStatus === "pending" ||
      alert.secretaryStatus === "pending"
    )).length;
    const speakerInfoUpdatedAt = data.notes?.speakerInfoUpdatedAt || "";
    return livePalmesAdminDiagnostics.renderCompetitionDiagnosticHtml({
      pendingAlerts,
      programCount,
      publicResultCount,
      resultCount,
      seriesCount: data.series?.length || 0,
      seriesPdfCount,
      sessionCount: sessions.length || 0,
      speakerInfoUpdatedAt
    });
  }
  
  function renderComputerFooterPanel() {
    if (!computerFooterPanel) return;
    if (state.role !== "computer") {
      computerFooterPanel.hidden = true;
      computerFooterPanel.innerHTML = "";
      return;
    }
    computerFooterPanel.hidden = false;
    computerFooterPanel.innerHTML = `
      ${renderCompetitionDiagnostic()}
      <div class="results-admin-danger-zone">
        <button class="ghost-button compact danger-button" type="button" data-results-reset>RAZ</button>
      </div>
    `;
  }
  
  function renderSessionResultsImportRow(activeSession) {
    const published = sessionResultsPdfsForAdminSession(activeSession);
    const latest = published[0];
    const uploadState = resultUploadStates.get(resultUploadKeyForSessionResults(activeSession));
    const blockingUpload = uploadState && uploadState.tone !== "error";
    return livePalmesAdminResults.renderSessionResultsImportRowHtml({
      activeSession,
      blockingUpload,
      latest,
      latestUpdatedLabel: latest?.updatedAt ? new Date(latest.updatedAt).toLocaleString("fr-FR") : "",
      uploadState,
      uploadStateHtml: uploadState ? resultUploadBadgeHtml(uploadState) : ""
    });
  }
  
  function renderResultProgramRow(row) {
    const result = resultForProgramRow(row);
    const uploadState = resultUploadStates.get(resultUploadKeyForProgram(row));
    const blockingUpload = uploadState && uploadState.tone !== "error";
    const status = resultStatusForProgramRow(row);
    const event = data.events.find((item) => item.id === row.eventId);
    const phaseLabel = resultPhaseLabelForProgramRow(row);
    const finalistCount = finalRowsCount(result?.finalists);
    const isFinalCompositionDefinitive = finalCompositionIsDefinitive(result);
    const definitiveDate = result?.hasFinal && !isFinalCompositionDefinitive
      ? finalCompositionDefinitiveDate(result)
      : null;
    const statusBadge = resultStatusBadgeForProgramRow(row, result, isFinalCompositionDefinitive);
    const definitiveLabel = result?.hasFinal && !isFinalCompositionDefinitive
      ? (definitiveDate ? `Définitif à partir de ${formatDeadlineTime(definitiveDate)}` : finalCompositionPendingDeadlineLabel(result))
      : "";
    return livePalmesAdminResults.renderResultProgramRowHtml({
      blockingUpload,
      definitiveLabel,
      eventLabel: event?.label || row.label || row.eventId,
      finalistCount,
      hasFinal: Boolean(result?.hasFinal),
      phaseLabel,
      programKeyValue: programKey(row),
      result,
      resultId: result?.id || "",
      row,
      sexLabel: sexDisplayLabel(row.sex),
      status,
      statusControlHtml: resultStatusControlHtml(row, result, statusBadge),
      uploadState,
      uploadStateHtml: uploadState ? resultUploadBadgeHtml(uploadState) : ""
    });
  }
  api = {
    resultIdForProgramRow,
    resultForProgramRow,
    resultPdfPayload,
    publicResultPayload,
    buildPublicResultsIndex,
    publishPublicResultsIndex,
    publicSeriesPdfId,
    updatePublicSeriesPdfMetadata,
    clearPublicSeriesPdfMetadata,
    hydratePublicSeriesPdfMetadataIfNeeded,
    clearPublicSeriesPdfs,
    clearPublicSessionResultsPdfMetadata,
    clearPublicSessionResultsPdfs,
    clearPublicSessionResultsPdfsForSession,
    publishPublicSeriesPdf,
    sessionResultsPdfId,
    updatePublicSessionResultsPdfMetadata,
    hydratePublicSessionResultsPdfMetadataIfNeeded,
    publishSessionResultsPdf,
    isLastProgramPartForRace,
    resultSessions,
    sessionResultsPdfsForAdminSession,
    latestResultSession,
    ensureResultsAdminSession,
    resultProgramRows,
    resultPhaseLabelForProgramRow,
    resultStatusForProgramRow,
    resultStatusBadgeForProgramRow,
    resultStatusControlHtml,
    resultUploadKeyForProgram,
    resultUploadKeyForSessionResults,
    setResultUploadState,
    clearResultUploadState,
    setSeriesImportState,
    clearSeriesImportState,
    resultUploadBadgeHtml,
    renderResultsAdminPanel,
    renderCompetitionDiagnostic,
    renderComputerFooterPanel,
    renderSessionResultsImportRow,
    renderResultProgramRow
  };
  }

  function useContext(nextContext = {}) {
    Object.keys(context).forEach((key) => { delete context[key]; });
    Object.assign(context, nextContext || {});
  }

  window.LivePalmesResultsAdminWorkflow = {
    resultIdForProgramRow: (...args) => { useContext(args.pop() || {}); return api.resultIdForProgramRow(...args); },
    resultForProgramRow: (...args) => { useContext(args.pop() || {}); return api.resultForProgramRow(...args); },
    resultPdfPayload: (...args) => { useContext(args.pop() || {}); return api.resultPdfPayload(...args); },
    publicResultPayload: (...args) => { useContext(args.pop() || {}); return api.publicResultPayload(...args); },
    buildPublicResultsIndex: (...args) => { useContext(args.pop() || {}); return api.buildPublicResultsIndex(...args); },
    publishPublicResultsIndex: (...args) => { useContext(args.pop() || {}); return api.publishPublicResultsIndex(...args); },
    publicSeriesPdfId: (...args) => { useContext(args.pop() || {}); return api.publicSeriesPdfId(...args); },
    updatePublicSeriesPdfMetadata: (...args) => { useContext(args.pop() || {}); return api.updatePublicSeriesPdfMetadata(...args); },
    clearPublicSeriesPdfMetadata: (...args) => { useContext(args.pop() || {}); return api.clearPublicSeriesPdfMetadata(...args); },
    hydratePublicSeriesPdfMetadataIfNeeded: (...args) => { useContext(args.pop() || {}); return api.hydratePublicSeriesPdfMetadataIfNeeded(...args); },
    clearPublicSeriesPdfs: (...args) => { useContext(args.pop() || {}); return api.clearPublicSeriesPdfs(...args); },
    clearPublicSessionResultsPdfMetadata: (...args) => { useContext(args.pop() || {}); return api.clearPublicSessionResultsPdfMetadata(...args); },
    clearPublicSessionResultsPdfs: (...args) => { useContext(args.pop() || {}); return api.clearPublicSessionResultsPdfs(...args); },
    clearPublicSessionResultsPdfsForSession: (...args) => { useContext(args.pop() || {}); return api.clearPublicSessionResultsPdfsForSession(...args); },
    publishPublicSeriesPdf: (...args) => { useContext(args.pop() || {}); return api.publishPublicSeriesPdf(...args); },
    sessionResultsPdfId: (...args) => { useContext(args.pop() || {}); return api.sessionResultsPdfId(...args); },
    updatePublicSessionResultsPdfMetadata: (...args) => { useContext(args.pop() || {}); return api.updatePublicSessionResultsPdfMetadata(...args); },
    hydratePublicSessionResultsPdfMetadataIfNeeded: (...args) => { useContext(args.pop() || {}); return api.hydratePublicSessionResultsPdfMetadataIfNeeded(...args); },
    publishSessionResultsPdf: (...args) => { useContext(args.pop() || {}); return api.publishSessionResultsPdf(...args); },
    isLastProgramPartForRace: (...args) => { useContext(args.pop() || {}); return api.isLastProgramPartForRace(...args); },
    resultSessions: (...args) => { useContext(args.pop() || {}); return api.resultSessions(...args); },
    sessionResultsPdfsForAdminSession: (...args) => { useContext(args.pop() || {}); return api.sessionResultsPdfsForAdminSession(...args); },
    latestResultSession: (...args) => { useContext(args.pop() || {}); return api.latestResultSession(...args); },
    ensureResultsAdminSession: (...args) => { useContext(args.pop() || {}); return api.ensureResultsAdminSession(...args); },
    resultProgramRows: (...args) => { useContext(args.pop() || {}); return api.resultProgramRows(...args); },
    resultPhaseLabelForProgramRow: (...args) => { useContext(args.pop() || {}); return api.resultPhaseLabelForProgramRow(...args); },
    resultStatusForProgramRow: (...args) => { useContext(args.pop() || {}); return api.resultStatusForProgramRow(...args); },
    resultStatusBadgeForProgramRow: (...args) => { useContext(args.pop() || {}); return api.resultStatusBadgeForProgramRow(...args); },
    resultStatusControlHtml: (...args) => { useContext(args.pop() || {}); return api.resultStatusControlHtml(...args); },
    resultUploadKeyForProgram: (...args) => { useContext(args.pop() || {}); return api.resultUploadKeyForProgram(...args); },
    resultUploadKeyForSessionResults: (...args) => { useContext(args.pop() || {}); return api.resultUploadKeyForSessionResults(...args); },
    setResultUploadState: (...args) => { useContext(args.pop() || {}); return api.setResultUploadState(...args); },
    clearResultUploadState: (...args) => { useContext(args.pop() || {}); return api.clearResultUploadState(...args); },
    setSeriesImportState: (...args) => { useContext(args.pop() || {}); return api.setSeriesImportState(...args); },
    clearSeriesImportState: (...args) => { useContext(args.pop() || {}); return api.clearSeriesImportState(...args); },
    resultUploadBadgeHtml: (...args) => { useContext(args.pop() || {}); return api.resultUploadBadgeHtml(...args); },
    renderResultsAdminPanel: (...args) => { useContext(args.pop() || {}); return api.renderResultsAdminPanel(...args); },
    renderCompetitionDiagnostic: (...args) => { useContext(args.pop() || {}); return api.renderCompetitionDiagnostic(...args); },
    renderComputerFooterPanel: (...args) => { useContext(args.pop() || {}); return api.renderComputerFooterPanel(...args); },
    renderSessionResultsImportRow: (...args) => { useContext(args.pop() || {}); return api.renderSessionResultsImportRow(...args); },
    renderResultProgramRow: (...args) => { useContext(args.pop() || {}); return api.renderResultProgramRow(...args); }
  };
}());
