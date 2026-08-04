(function () {
  const context = {};
  let contextSource = {};
  let api;
  let activeCompetitionId;
  let alertPendingBreakdown;
  let alerts;
  let appendImportHistory;
  let categoryLabel;
  let clearPublishedResults;
  let competitionDocument;
  let competitionModeEnabled;
  let countCollectionDocuments;
  let data;
  let deleteFinalResultAlerts;
  let deleteResultPdfPayload;
  let emptyPresenceCounts;
  let ensureComputerWriteAccess;
  let escapeHtml;
  let finalCompositionIsDefinitive;
  let finalCompositionPendingDeadlineLabel;
  let finalResultSessions;
  let finalRowsCount;
  let firestoreDb;
  let formatAlertDateTime;
  let formatDeadlineTime;
  let formatRank;
  let isFinalStage;
  let isSplitRaceAcrossSessions;
  let livePalmesPublication;
  let normalizeData;
  let programKey;
  let programRows;
  let publicResultsIndexDocument;
  let raceOptionKey;
  let raceResults;
  let renderDataStatus;
  let resultArchivesCollection;
  let resultHasDetailsForDiagnostic;
  let resultPdfMigrationRunning;
  let resultPdfsCollection;
  let resultUploadStates;
  let resultsCollection;
  let resultsAdminPanel;
  let resultsAdminSession;
  let roleStates;
  let safeCountCollection;
  let safeDocumentData;
  let seriesImportState;
  let sessionResultsPdfsCollection;
  let sessionResultsHydrationRequested = false;
  let seriesPdfsCollection;
  let sessionRows;
  let sexDisplayLabel;
  let showToast;
  let state;
  let updateLiveNotes;
  let programAdminApi;

  function programWorkflow() {
    if (!programAdminApi) {
      programAdminApi = window.LivePalmesResultsAdminProgram.build({
        data,
        isFinalStage,
        isSplitRaceAcrossSessions,
        livePalmesAdminResults,
        programKey,
        raceOptionKey,
        raceResults,
        roleStates,
        selectedResultsAdminSession,
        sessionRows,
        setResultsAdminSessionValue,
        state
      });
    }
    return programAdminApi;
  }

  function resultIdForProgramRow(row) {
    return programWorkflow().resultIdForProgramRow(row);
  }

  function resultForProgramRow(row) {
    return programWorkflow().resultForProgramRow(row);
  }
  
  const livePalmesResults = window.LivePalmesResults;
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

  function setWorkflowData(nextData) {
    data = nextData;
    context.data = data;
    if (contextSource) contextSource.data = data;
    programAdminApi = null;
  }
  
  function buildPublicResultsIndex() {
    return livePalmesPublication.buildPublicResultsIndex({
      data,
      raceResults,
      publicResultPayload,
      publicSeriesPdfPayload,
      publicSessionResultsPdfPayload
    });
  }

  function buildPublicSeriesIndex() {
    if (typeof livePalmesPublication.buildPublicSeriesIndex !== "function") return null;
    return livePalmesPublication.buildPublicSeriesIndex({
      data,
      publicSeriesPdfPayload
    });
  }

  function publicIndexByteSize(payload) {
    if (typeof livePalmesPublication.publicIndexByteSize === "function") {
      return livePalmesPublication.publicIndexByteSize(payload);
    }
    const json = JSON.stringify(payload || {});
    if (typeof TextEncoder === "function") return new TextEncoder().encode(json).length;
    return json.length;
  }

  function assertPublicIndexSize(label, payload) {
    if (typeof livePalmesPublication.assertPublicIndexSize === "function") {
      return livePalmesPublication.assertPublicIndexSize(label, payload);
    }
    const bytes = publicIndexByteSize(payload);
    const limit = 900000;
    if (bytes > limit) {
      throw new Error(`${label} trop lourd : ${bytes.toLocaleString("fr-FR")} octets. Limite de securite LivePalmes : ${limit.toLocaleString("fr-FR")} octets.`);
    }
    return bytes;
  }

  async function currentPublicResultsIndex(doc) {
    const snapshot = await doc.get({ source: "server" }).catch(() => null);
    return snapshot?.exists ? (snapshot.data() || {}) : {};
  }

  async function assertPublicResultsIndexCanBeReplaced(currentIndex, nextIndex, options = {}) {
    if (options.allowResultRegression) return;
    if (typeof livePalmesPublication.publicResultsRegressions !== "function") return;
    const regressions = livePalmesPublication.publicResultsRegressions(currentIndex || {}, nextIndex || {});
    if (!regressions.length) return;
    const details = regressions
      .map((item) => `session ${item.session}: ${item.after}/${item.before}`)
      .join(", ");
    throw new Error(`Publication interrompue : l'index public perd des resultats (${details}). Recharge le bureau des performances puis republie.`);
  }

  async function hydrateRaceResultsFromServer() {
    const collection = typeof resultsCollection === "function" ? resultsCollection() : null;
    if (!collection) return false;
    const snapshot = await collection.orderBy("updatedAt", "desc").get();
    const rows = snapshot.docs.map((doc) => resultWithoutPdf({ id: doc.id, ...doc.data() }));
    if (!rows.length) return;
    raceResults = rows;
    context.raceResults = rows;
    if (contextSource) contextSource.raceResults = rows;
    programAdminApi = null;
  }
  
  async function publishPublicResultsIndex({ silent = false, strict = false, allowResultRegression = false } = {}) {
    if (typeof ensureComputerWriteAccess === "function" && !await ensureComputerWriteAccess()) {
      if (strict) throw new Error("Accès bureau des performances requis pour publier dans Firebase.");
      return;
    }
    const doc = publicResultsIndexDocument();
    if (!doc) return;
    try {
      await hydrateRaceResultsFromServer();
      const currentIndex = await currentPublicResultsIndex(doc);
      await hydratePublicSeriesPdfMetadataIfNeeded({ force: true });
      await hydratePublicSessionResultsPdfMetadataIfNeeded({ force: true });
      let nextIndex = JSON.parse(JSON.stringify(buildPublicResultsIndex()));
      const directDisabled = data.notes?.publicDirectDisabled === true;
      if (!allowResultRegression && !directDisabled && typeof livePalmesPublication.mergePublicResultsPreservingCurrent === "function") {
        nextIndex = livePalmesPublication.mergePublicResultsPreservingCurrent(currentIndex, nextIndex);
      }
      await assertPublicResultsIndexCanBeReplaced(currentIndex, nextIndex, { allowResultRegression: allowResultRegression || directDisabled });
      assertPublicIndexSize("Index resultats public", nextIndex);
      await doc.set(nextIndex);
      const seriesIndex = JSON.parse(JSON.stringify(buildPublicSeriesIndex()));
      if (seriesIndex && doc.parent?.doc) {
        assertPublicIndexSize("Index series public", seriesIndex);
        await doc.parent.doc("seriesIndex").set(seriesIndex);
      }
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
    setWorkflowData(normalizeData({
      ...data,
      notes: {
        ...(data.notes || {}),
        publicSeriesPdfs: next
      }
    }));
    saveData();
    return true;
  }
  
  function clearPublicSeriesPdfMetadata() {
    setWorkflowData(normalizeData({
      ...data,
      notes: {
        ...(data.notes || {}),
        publicSeriesPdfs: []
      }
    }));
    saveData();
  }
  
  async function hydratePublicSeriesPdfMetadataIfNeeded({ force = false } = {}) {
    if (!force && Array.isArray(data.notes?.publicSeriesPdfs)) return;
    const collection = seriesPdfsCollection();
    if (!collection) return;
    const snapshot = await collection.get();
    const metadata = snapshot.docs
      .map((doc) => publicSeriesPdfPayload({ id: doc.id, ...doc.data() }))
      .filter(Boolean)
      .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
    setWorkflowData(normalizeData({
      ...data,
      notes: {
        ...(data.notes || {}),
        publicSeriesPdfs: metadata
      }
    }));
    saveData();
  }
  
  async function clearPublicSeriesPdfs() {
    const collection = seriesPdfsCollection();
    if (!collection) return 0;
    const snapshot = await collection.get();
    await Promise.all(snapshot.docs.map(deletePublicPdfDocument));
    clearPublicSeriesPdfMetadata();
    return snapshot.docs.length;
  }
  
  function clearPublicSessionResultsPdfMetadata() {
    setWorkflowData(normalizeData({
      ...data,
      notes: {
        ...(data.notes || {}),
        publicSessionResultsPdfs: []
      }
    }));
    saveData();
  }

  async function savePublicPdfDocument(collection, payload, kind) {
    if (window.LivePalmesPdfStorage?.saveDocument) {
      return window.LivePalmesPdfStorage.saveDocument({ collection, payload, kind });
    }
    await collection.doc(payload.id).set(JSON.parse(JSON.stringify(payload)));
    return payload;
  }

  async function deletePublicPdfDocument(doc) {
    if (window.LivePalmesPdfStorage?.deleteDocument) {
      return window.LivePalmesPdfStorage.deleteDocument(doc.ref, doc.data() || {});
    }
    await doc.ref.delete();
    return true;
  }
  
  async function clearPublicSessionResultsPdfs() {
    const collection = sessionResultsPdfsCollection();
    if (!collection) return 0;
    const snapshot = await collection.get();
    await Promise.all(snapshot.docs.map(deletePublicPdfDocument));
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
    await Promise.all(docs.map(deletePublicPdfDocument));
    const deletedIds = new Set(docs.map((doc) => doc.id));
    const current = Array.isArray(data.notes?.publicSessionResultsPdfs) ? data.notes.publicSessionResultsPdfs : [];
    setWorkflowData(normalizeData({
      ...data,
      notes: {
        ...(data.notes || {}),
        publicSessionResultsPdfs: current.filter((pdf) => !deletedIds.has(pdf.id))
      }
    }));
    saveData();
    return docs.length;
  }

  async function deleteSessionResultsPdf(id) {
    if (typeof ensureComputerWriteAccess === "function" && !await ensureComputerWriteAccess()) {
      throw new Error("Accès bureau des performances requis pour supprimer ce PDF.");
    }
    const cleanId = String(id || "").trim();
    const collection = sessionResultsPdfsCollection();
    if (!collection || !cleanId) return false;
    const snapshot = await collection.doc(cleanId).get({ source: "server" }).catch(() => null);
    if (snapshot?.exists) await deletePublicPdfDocument(snapshot);
    const current = Array.isArray(data.notes?.publicSessionResultsPdfs) ? data.notes.publicSessionResultsPdfs : [];
    setWorkflowData(normalizeData({
      ...data,
      notes: {
        ...(data.notes || {}),
        publicSessionResultsPdfs: current.filter((pdf) => pdf.id !== cleanId)
      }
    }));
    saveData();
    await publishPublicResultsIndex();
    return true;
  }
  
  async function publishPublicSeriesPdf(file, mode = "session", session = "") {
    if (typeof ensureComputerWriteAccess === "function" && !await ensureComputerWriteAccess()) {
      throw new Error("Accès bureau des performances requis pour publier dans Firebase.");
    }
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
    const storedPayload = await savePublicPdfDocument(collection, payload, "series");
    updatePublicSeriesPdfMetadata(storedPayload);
    return storedPayload;
  }
  
  function sessionResultsPdfId(scope, sessions = []) {
    if (typeof livePalmesAdminMaintenance.sessionResultsPdfId === "function") {
      return livePalmesAdminMaintenance.sessionResultsPdfId(scope, sessions);
    }
    if (scope === "protocol") return "competition-protocol-full";
    if (scope === "full") return "complete-results-full";
    const safeSessions = sessions.map((session) => String(session || "").replace(/[^a-z0-9_-]+/gi, "-")).filter(Boolean);
    return `complete-results-${safeSessions.join("-") || "session"}`;
  }
  
  function updatePublicSessionResultsPdfMetadata(pdf) {
    const metadata = publicSessionResultsPdfPayload(pdf);
    if (!metadata) return;
    const current = Array.isArray(data.notes?.publicSessionResultsPdfs) ? data.notes.publicSessionResultsPdfs : [];
    const next = livePalmesPublication.nextPublicSessionResultsPdfMetadata(current, metadata);
    setWorkflowData(normalizeData({
      ...data,
      notes: {
        ...(data.notes || {}),
        publicSessionResultsPdfs: next
      }
    }));
    saveData();
  }
  
  async function hydratePublicSessionResultsPdfMetadataIfNeeded({ force = false } = {}) {
    if (!force && Array.isArray(data.notes?.publicSessionResultsPdfs) && data.notes.publicSessionResultsPdfs.length) return;
    const collection = sessionResultsPdfsCollection();
    if (!collection) return;
    const snapshot = await collection.get();
    const metadata = snapshot.docs
      .map((doc) => publicSessionResultsPdfPayload({ id: doc.id, ...doc.data() }))
      .filter(Boolean)
      .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
    setWorkflowData(normalizeData({
      ...data,
      notes: {
        ...(data.notes || {}),
        publicSessionResultsPdfs: metadata
      }
    }));
    saveData();
  }
  
  async function publishSessionResultsPdf(file, scope = "session", sessions = []) {
    if (typeof ensureComputerWriteAccess === "function" && !await ensureComputerWriteAccess()) {
      throw new Error("Accès bureau des performances requis pour publier dans Firebase.");
    }
    const collection = sessionResultsPdfsCollection();
    if (!collection || !file) throw new Error("Firebase n'est pas disponible pour publier ce PDF.");
    const cleanSessions = typeof livePalmesAdminMaintenance.normalizeSessionList === "function"
      ? livePalmesAdminMaintenance.normalizeSessionList(sessions)
      : [...new Set((sessions || []).map((session) => String(session || "").trim()).filter(Boolean))]
        .sort((a, b) => Number(a) - Number(b));
    const finalScope = scope === "protocol" ? "protocol" : (scope === "full" ? "full" : "sessions");
    if (!["full", "protocol"].includes(finalScope) && !cleanSessions.length) {
      throw new Error("Sélectionne au moins une session pour publier ce PDF.");
    }
    const now = new Date().toISOString();
    const id = sessionResultsPdfId(finalScope, cleanSessions);
    const sessionLabel = finalScope === "protocol"
      ? "Protocole complet de la compétition"
      : (finalScope === "full"
        ? "PDF complet de la compétition"
        : `Résultats complets ${cleanSessions.map((session) => `S${session}`).join(" + ")}`);
    const payload = {
      id,
      scope: finalScope,
      session: finalScope === "sessions" && cleanSessions.length === 1 ? cleanSessions[0] : "",
      sessions: finalScope === "sessions" ? cleanSessions : [],
      documentType: finalScope === "protocol" ? "protocol" : "session-results",
      pdfName: file.name,
      pdfDataUrl: await fileToDataUrl(file),
      updatedAt: now,
      sourceLabel: sessionLabel
    };
    if (["full", "protocol"].includes(finalScope)) {
      const snapshot = await collection.get();
      await Promise.all(snapshot.docs.map(deletePublicPdfDocument));
      clearPublicSessionResultsPdfMetadata();
    }
    const storedPayload = await savePublicPdfDocument(collection, payload, "session-results");
    updatePublicSessionResultsPdfMetadata(storedPayload);
    await publishPublicResultsIndex();
    return storedPayload;
  }
  
  function isLastProgramPartForRace(row) { return programWorkflow().isLastProgramPartForRace(row); }
  function resultSessions() { return programWorkflow().resultSessions(); }
  function sessionResultsPdfsForAdminSession(session) { return programWorkflow().sessionResultsPdfsForAdminSession(session); }
  function latestResultSession() { return programWorkflow().latestResultSession(); }

  function selectedResultsAdminSession() {
    return String(contextSource?.resultsAdminSession || resultsAdminSession || "");
  }

  function setResultsAdminSessionValue(value) {
    resultsAdminSession = String(value || "");
    context.resultsAdminSession = resultsAdminSession;
    if (contextSource && Object.prototype.hasOwnProperty.call(contextSource, "resultsAdminSession")) {
      contextSource.resultsAdminSession = resultsAdminSession;
    }
  }
  
  function ensureResultsAdminSession() { return programWorkflow().ensureResultsAdminSession(); }
  function resultProgramRows(sessionNumber = "") { return programWorkflow().resultProgramRows(sessionNumber); }
  function resultPhaseLabelForProgramRow(row) { return programWorkflow().resultPhaseLabelForProgramRow(row); }
  function resultStatusForProgramRow(row) { return programWorkflow().resultStatusForProgramRow(row); }
  function resultStatusBadgeForProgramRow(row, result, isFinalCompositionDefinitive) { return programWorkflow().resultStatusBadgeForProgramRow(row, result, isFinalCompositionDefinitive); }
  function resultStatusControlHtml(row, result, statusBadge) { return programWorkflow().resultStatusControlHtml(row, result, statusBadge); }
  
  function resultsUploadState() {
    return window.LivePalmesResultsUploadState.create({
      getSeriesImportState: () => seriesImportState,
      livePalmesAdminResults,
      programKey,
      renderResultsAdminPanel,
      resultUploadStates,
      setSeriesImportStateValue(value) {
        seriesImportState = value;
        context.seriesImportState = seriesImportState;
      }
    });
  }

  function resultUploadKeyForProgram(row) { return resultsUploadState().resultUploadKeyForProgram(row); }
  function resultUploadKeyForSessionResults(session) { return resultsUploadState().resultUploadKeyForSessionResults(session); }
  function setResultUploadState(key, label, tone = "loading") { return resultsUploadState().setResultUploadState(key, label, tone); }
  function clearResultUploadState(key) { return resultsUploadState().clearResultUploadState(key); }
  function setSeriesImportState(label, tone = "loading") { return resultsUploadState().setSeriesImportState(label, tone); }
  function clearSeriesImportState() { return resultsUploadState().clearSeriesImportState(); }
  function resultUploadBadgeHtml(uploadState) { return resultsUploadState().resultUploadBadgeHtml(uploadState); }
  
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
    if (!sessionResultsHydrationRequested) {
      const collectionReady = Boolean(sessionResultsPdfsCollection());
      if (collectionReady) {
        sessionResultsHydrationRequested = true;
        hydratePublicSessionResultsPdfMetadataIfNeeded({ force: true })
        .then(() => renderResultsAdminPanel())
        .catch((error) => console.warn("Hydratation PDF résultats complets impossible", error));
    }
    }
    resultsAdminPanel.hidden = false;
    resultsAdminPanel.innerHTML = livePalmesAdminResults.renderResultsAdminPanelHtml({
      activeSession,
      rowsHtml: rows.map((row) => renderResultProgramRow(row)).join(""),
      seriesImportBusy: seriesImportState?.tone === "loading",
      seriesImportStateHtml: seriesImportState ? resultUploadBadgeHtml(seriesImportState) : "",
      competitionProtocolImportHtml: renderCompetitionProtocolImportRow(),
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
  
  function resultsAdminPanelView() {
    return window.LivePalmesResultsAdminPanelView.create({
      alerts,
      computerFooterPanel,
      data,
      finalCompositionDefinitiveDate,
      finalCompositionIsDefinitive,
      finalCompositionPendingDeadlineLabel,
      finalRowsCount,
      formatDeadlineTime,
      livePalmesAdminDiagnostics,
      livePalmesAdminResults,
      raceResults,
      resultForProgramRow,
      resultPhaseLabelForProgramRow,
      resultStatusBadgeForProgramRow,
      resultStatusControlHtml,
      resultStatusForProgramRow,
      resultUploadBadgeHtml,
      resultUploadKeyForProgram,
      resultUploadKeyForSessionResults,
      resultUploadStates,
      sessionResultsPdfsForAdminSession,
      sessionRows,
      sexDisplayLabel,
      state,
      programKey
    });
  }

  function renderCompetitionDiagnostic() { return resultsAdminPanelView().renderCompetitionDiagnostic(); }
  function renderComputerFooterPanel() { return resultsAdminPanelView().renderComputerFooterPanel(); }
  function renderCompetitionProtocolImportRow() { return resultsAdminPanelView().renderCompetitionProtocolImportRow(); }
  function renderSessionResultsImportRow(activeSession) { return resultsAdminPanelView().renderSessionResultsImportRow(activeSession); }
  function renderResultProgramRow(row) { return resultsAdminPanelView().renderResultProgramRow(row); }
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
    deleteSessionResultsPdf,
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
    renderCompetitionProtocolImportRow,
    renderSessionResultsImportRow,
    renderResultProgramRow
  };

  function useContext(nextContext = {}) {
    contextSource = nextContext || {};
    Object.keys(context).forEach((key) => { delete context[key]; });
    Object.assign(context, contextSource);
    programAdminApi = null;
    activeCompetitionId = context.activeCompetitionId;
    alertPendingBreakdown = context.alertPendingBreakdown;
    alerts = context.alerts;
    appendImportHistory = context.appendImportHistory;
    categoryLabel = context.categoryLabel;
    clearPublishedResults = context.clearPublishedResults;
    competitionDocument = context.competitionDocument;
    competitionModeEnabled = context.competitionModeEnabled;
    countCollectionDocuments = context.countCollectionDocuments;
    data = context.data;
    deleteFinalResultAlerts = context.deleteFinalResultAlerts;
    deleteResultPdfPayload = context.deleteResultPdfPayload;
    emptyPresenceCounts = context.emptyPresenceCounts;
    ensureComputerWriteAccess = context.ensureComputerWriteAccess;
    escapeHtml = context.escapeHtml;
    finalCompositionIsDefinitive = context.finalCompositionIsDefinitive;
    finalCompositionPendingDeadlineLabel = context.finalCompositionPendingDeadlineLabel;
    finalResultSessions = context.finalResultSessions;
    finalRowsCount = context.finalRowsCount;
    firestoreDb = context.firestoreDb;
    formatAlertDateTime = context.formatAlertDateTime;
    formatDeadlineTime = context.formatDeadlineTime;
    formatRank = context.formatRank;
    isFinalStage = context.isFinalStage;
    isSplitRaceAcrossSessions = context.isSplitRaceAcrossSessions;
    livePalmesPublication = context.livePalmesPublication;
    normalizeData = context.normalizeData;
    programKey = context.programKey;
    programRows = context.programRows;
    publicResultsIndexDocument = context.publicResultsIndexDocument;
    raceOptionKey = context.raceOptionKey;
    raceResults = context.raceResults;
    renderDataStatus = context.renderDataStatus;
    resultArchivesCollection = context.resultArchivesCollection;
    resultHasDetailsForDiagnostic = context.resultHasDetailsForDiagnostic;
    resultPdfMigrationRunning = context.resultPdfMigrationRunning;
    resultPdfsCollection = context.resultPdfsCollection;
    resultUploadStates = context.resultUploadStates;
    resultsCollection = context.resultsCollection;
    resultsAdminPanel = context.resultsAdminPanel;
    resultsAdminSession = selectedResultsAdminSession();
    roleStates = context.roleStates;
    safeCountCollection = context.safeCountCollection;
    safeDocumentData = context.safeDocumentData;
    seriesImportState = context.seriesImportState;
    sessionResultsPdfsCollection = context.sessionResultsPdfsCollection;
    seriesPdfsCollection = context.seriesPdfsCollection;
    sessionRows = context.sessionRows;
    sexDisplayLabel = context.sexDisplayLabel;
    showToast = context.showToast;
    state = context.state;
    updateLiveNotes = context.updateLiveNotes;
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
    deleteSessionResultsPdf: (...args) => { useContext(args.pop() || {}); return api.deleteSessionResultsPdf(...args); },
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
    renderCompetitionProtocolImportRow: (...args) => { useContext(args.pop() || {}); return api.renderCompetitionProtocolImportRow(...args); },
    renderSessionResultsImportRow: (...args) => { useContext(args.pop() || {}); return api.renderSessionResultsImportRow(...args); },
    renderResultProgramRow: (...args) => { useContext(args.pop() || {}); return api.renderResultProgramRow(...args); }
  };
}());
