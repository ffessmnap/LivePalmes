(function () {
  const context = {};
  let api;
  let activeCompetitionDocument;
  let activeCompetitionId;
  let alertRaceLabel;
  let alerts;
  let alertsCollection;
  let alertStatusLabel;
  let competitionModeEnabled;
  let data;
  let dataStatus;
  let dataUrlApproxBytes;
  let decisionMotifLabel;
  let escapeHtml;
  let firebaseHeaderStatus;
  let firebaseStatus;
  let firestoreDb;
  let formatAlertDateTime;
  let formatByteSize;
  let fullAlertIdentityLabel;
  let isFinalStage;
  let liveDataDocument;
  let liveDismissedAlertIds;
  let livePalmesAdminDiagnostics;
  let livePalmesAdminAuth;
  let livePalmesPinAuth;
  let livePalmesTechnicalLog;
  let lastConsoleActivityAt;
  let migrateResultPdfsOutOfResults;
  let performanceDiagnosticLines;
  let pinLockEnabled;
  let presenceCollection;
  let publicResultsIndexDocument;
  let raceResults;
  let realtimeSyncEnabled;
  let resultPdfsCollection;
  let resultsCollection;
  let roleCodesModal;
  let seriesPdfsCollection;
  let sessionResultsPdfsCollection;
  let sessionRows;
  let speakerAlertAlreadyResolvedByResult;
  let state;

  function renderDataStatus(message = "") {
    if (!dataStatus) return;
    renderFirebaseHeaderStatus();
    if (state.role !== "computer") {
      dataStatus.hidden = true;
      dataStatus.innerHTML = "";
      return;
    }
    dataStatus.classList.remove("warning", "source");
    if (message) {
      dataStatus.hidden = false;
      dataStatus.textContent = message;
      dataStatus.classList.add("warning");
      return;
    }
    if (state.role === "computer") {
      dataStatus.hidden = true;
      dataStatus.innerHTML = "";
      return;
    }
    if (data.sourceVersion) {
      const seriesSource = data.notes?.sourceLabel || "Données officielles chargées";
      const sourceFile = data.notes?.sourceFile || "";
      const speakerSource = data.notes?.speakerInfoSource
        ? `${data.notes.speakerInfoSource}${data.notes.speakerInfoUpdatedAt ? ` - ${data.notes.speakerInfoUpdatedAt}` : ""}`
        : "non mis à jour";
      const firebaseMeta = firebaseStatusMeta();
      const firebaseLabel = firebaseStatus === "local" ? "local seulement" : firebaseMeta.label.toLowerCase();
      const firebaseClass = firebaseMeta.className;
      const generatedAt = data.notes?.generatedAt || "";
      const seriesCount = data.notes?.seriesLineCount || data.series?.length || 0;
      const entrantTotal = data.notes?.entrantCount || data.entrants?.length || 0;
      const updatedSession = data.notes?.lastImportedMode === "Mise à jour session" && data.notes?.lastUpdatedSession
        ? `session ouverte par défaut : S${data.notes.lastUpdatedSession}`
        : "session ouverte par défaut : S1";
      const history = Array.isArray(data.notes?.importHistory) ? data.notes.importHistory.slice(-4).reverse() : [];
      dataStatus.hidden = false;
      dataStatus.innerHTML = `
        <span><strong>Séries</strong> ${escapeHtml(seriesSource)}${sourceFile ? ` - ${escapeHtml(sourceFile)}` : ""}</span>
        <span><strong>Infos speaker</strong> ${escapeHtml(speakerSource)}</span>
        <span><strong>Actualisation</strong> ${competitionModeEnabled() ? "directe" : "manuelle"}</span>
        <span><strong>Codes</strong> ${pinLockEnabled() ? "actifs" : "inactifs"}</span>
        <span><i class="firebase-dot ${firebaseClass}" aria-hidden="true"></i><strong>Firebase</strong> ${escapeHtml(firebaseLabel)}</span>
        <span>${escapeHtml(String(entrantTotal))} engagements</span>
        <span>${escapeHtml(String(seriesCount))} lignes de séries</span>
        <span>${escapeHtml(updatedSession)}</span>
        ${generatedAt ? `<span>mise à jour ${escapeHtml(generatedAt)}</span>` : ""}
        ${history.length ? `<span class="status-history"><strong>Historique</strong> ${history.map((item) => escapeHtml(item)).join(" | ")}</span>` : ""}
      `;
      dataStatus.classList.add("source");
      return;
    }
    dataStatus.hidden = false;
    dataStatus.textContent = "Données officielles non chargées. Sur GitHub Pages, vérifie que data.generated.js et donnees-speaker-france-2026.json sont bien publiés.";
    dataStatus.classList.add("warning");
  }
  
  function firebaseStatusMeta() {
    if (firebaseStatus === "connected") {
      return { label: realtimeSyncEnabled() ? "Direct actif" : "Connecté", className: "ok" };
    }
    if (firebaseStatus === "error") {
      return { label: "Connexion interrompue", className: "error" };
    }
    if (firebaseStatus === "offline") {
      return { label: "Connexion interrompue", className: "error" };
    }
    if (firebaseStatus === "local") {
      return { label: "Local", className: "pending" };
    }
    if (firebaseStatus === "manual") {
      return { label: "Actualisation manuelle", className: "pending" };
    }
    return { label: "Connexion", className: "pending" };
  }
  
  function renderFirebaseHeaderStatus() {
    if (!firebaseHeaderStatus) return;
    const meta = firebaseStatusMeta();
    const lastActivityLabel = lastConsoleActivityAt
      ? new Date(lastConsoleActivityAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
      : "";
    const label = lastActivityLabel ? `${meta.label} · ${lastActivityLabel}` : meta.label;
    const syncModeLabel = realtimeSyncEnabled() ? "Direct" : "Manuel";
    const roleLabel = state?.role || "accueil";
    firebaseHeaderStatus.className = `firebase-header-status ${meta.className}`;
    firebaseHeaderStatus.innerHTML = `<i class="firebase-dot ${meta.className}" aria-hidden="true"></i>${escapeHtml(label)}`;
    firebaseHeaderStatus.title = firebaseStatus === "error" || firebaseStatus === "offline"
      ? "Connexion interrompue - les actions peuvent ne pas être synchronisées."
      : [
        `Firebase : ${meta.label}`,
        `Actualisation : ${syncModeLabel}`,
        `Codes PIN : ${pinLockEnabled() ? "actifs" : "inactifs"}`,
        `Console : ${roleLabel}`,
        lastActivityLabel ? `Dernière activité : ${lastActivityLabel}` : ""
      ].filter(Boolean).join(" | ");
  }
  
  function shortStatusDate() {
    return new Date().toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }
  
  function appendImportHistory(notes, label) {
    const history = Array.isArray(notes?.importHistory) ? notes.importHistory.slice(-7) : [];
    return [...history, `${shortStatusDate()} - ${label}`].slice(-8);
  }
  
  async function countCollectionDocuments(collection) {
    if (!collection) return 0;
    if (typeof collection.count === "function") {
      try {
        const snapshot = await collection.count().get();
        return Number(snapshot.data()?.count || 0);
      } catch (error) {
        console.warn("Comptage Firestore impossible, lecture classique utilisée", error);
      }
    }
    const snapshot = await collection.get({ source: "server" });
    return snapshot.size || snapshot.docs?.length || 0;
  }
  
  async function collectPerformanceDiagnostic() {
    if (!firestoreDb) {
      return {
        available: false,
        message: "Firebase indisponible sur cet appareil."
      };
    }
    const startedAt = performance.now();
    const resultSnapshot = await resultsCollection().orderBy("updatedAt", "desc").get({ source: "server" });
    const results = resultSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const legacyPdfResults = results.filter((result) => result.pdfDataUrl);
    const legacyBytes = legacyPdfResults.reduce((sum, result) => sum + dataUrlApproxBytes(result.pdfDataUrl), 0);
    const resultPdfCount = await countCollectionDocuments(resultPdfsCollection());
    const publicIndexSnapshot = await publicResultsIndexDocument().get({ source: "server" }).catch(() => null);
    const publicIndex = publicIndexSnapshot?.data() || {};
    const publicIndexBytes = JSON.stringify(publicIndex).length;
    return {
      available: true,
      competitionId: activeCompetitionId,
      resultCount: results.length,
      publicResultCount: results.filter((result) => !result.hasFinal || result.finalistsAnnouncedAt).length,
      resultPdfCount,
      legacyPdfCount: legacyPdfResults.length,
      legacyBytes,
      publicIndexBytes,
      publicIndexUpdatedAt: publicIndex.updatedAt || "",
      readMs: Math.round(performance.now() - startedAt),
      status: legacyPdfResults.length ? "warn" : "ok"
    };
  }
  
  function renderPerformanceDiagnosticModal(report) {
    if (!roleCodesModal) return;
    roleCodesModal.hidden = false;
    roleCodesModal.innerHTML = livePalmesAdminDiagnostics.renderPerformanceDiagnosticModalHtml(report, {
      formatByteSize
    });
  }
  
  async function showPerformanceDiagnosticModal() {
    if (!roleCodesModal) return;
    roleCodesModal.hidden = false;
    roleCodesModal.innerHTML = livePalmesAdminDiagnostics.renderPerformanceDiagnosticLoadingHtml();
    const report = await collectPerformanceDiagnostic();
    renderPerformanceDiagnosticModal(report);
  }
  
  async function safeCountCollection(collection) {
    try {
      return await countCollectionDocuments(collection);
    } catch (error) {
      console.warn("Comptage diagnostic impossible", error);
      return null;
    }
  }
  
  async function safeDocumentData(documentRef) {
    try {
      const snapshot = await documentRef?.get({ source: "server" });
      return snapshot?.exists ? (snapshot.data() || {}) : null;
    } catch (error) {
      console.warn("Lecture diagnostic impossible", error);
      return null;
    }
  }
  
  function alertPendingTargets(alert, { respectLiveDismissed = true } = {}) {
    if (typeof livePalmesAdminDiagnostics.alertPendingTargets === "function") {
      return livePalmesAdminDiagnostics.alertPendingTargets(alert, {
        isResolvedByResult: speakerAlertAlreadyResolvedByResult,
        liveDismissedIds: liveDismissedAlertIds,
        respectLiveDismissed
      });
    }
    return [];
  }
  
  function alertPendingBreakdown(rows = [], options = {}) {
    if (typeof livePalmesAdminDiagnostics.alertPendingBreakdown === "function") {
      return livePalmesAdminDiagnostics.alertPendingBreakdown(rows, {
        ...options,
        alertRaceLabel,
        alertStatusLabel,
        decisionMotifLabel,
        fullAlertIdentityLabel,
        isResolvedByResult: speakerAlertAlreadyResolvedByResult,
        liveDismissedIds: liveDismissedAlertIds
      });
    }
    return { counts: {}, examples: [], total: 0 };
  }
  
  function alertTargetsLabel(targets = []) {
    if (typeof livePalmesAdminDiagnostics.alertTargetsLabel === "function") {
      return livePalmesAdminDiagnostics.alertTargetsLabel(targets);
    }
    return targets.join(", ");
  }
  
  async function collectTechnicalDiagnostic() {
    const startedAt = performance.now();
    const localResults = Array.isArray(raceResults) ? raceResults : [];
    const localAlerts = Array.isArray(alerts) ? alerts : [];
    const localAlertBreakdown = alertPendingBreakdown(localAlerts, { respectLiveDismissed: true });
    const localResultPerformances = localResults.reduce((sum, result) => sum + (Array.isArray(result.performances) ? result.performances.length : 0), 0);
    const localDetailedResults = localResults.filter(resultHasDetailsForDiagnostic).length;
    const report = {
      available: Boolean(firestoreDb),
      competitionId: activeCompetitionId,
      local: {
        sessions: sessionRows().length,
        program: data.program?.length || 0,
        series: data.series?.length || 0,
        entrants: data.entrants?.length || 0,
        results: localResults.length,
        detailedResults: localDetailedResults,
        performances: localResultPerformances,
        alerts: localAlerts.length,
        pendingAlerts: localAlertBreakdown.total,
        pendingAlertCounts: localAlertBreakdown.counts,
        pendingAlertExamples: localAlertBreakdown.examples,
        sourceVersion: data.sourceVersion || "",
        lastUpdatedSession: data.notes?.lastUpdatedSession || ""
      },
      firebase: {},
      security: {
        adminConfigured: Boolean(livePalmesAdminAuth?.status?.()?.configured),
        adminEmail: livePalmesAdminAuth?.status?.()?.email || "",
        adminSignedIn: Boolean(livePalmesAdminAuth?.isAdminAuthenticated?.()),
        adminUid: livePalmesAdminAuth?.status?.()?.uid || "",
        pinLockEnabled: pinLockEnabled(),
        pinMode: data.notes?.pinAuthMode || (livePalmesPinAuth?.cloudPinModeEnabled?.(data.notes) ? "cloud" : "local")
      },
      technicalLog: technicalLogSummary(),
      recommendations: []
    };
    if (!firestoreDb) {
      report.message = "Firebase indisponible sur cet appareil.";
      report.readMs = Math.round(performance.now() - startedAt);
      report.recommendations.push("Impossible de lire les compteurs serveur depuis cet appareil.");
      return report;
    }
  
    const [
      resultsSnapshot,
      publicIndex,
      liveData,
      resultPdfCount,
      seriesPdfCount,
      sessionResultsPdfCount,
      alertSnapshot,
      presenceCount,
      roleLockCount
    ] = await Promise.all([
      resultsCollection().orderBy("updatedAt", "desc").get({ source: "server" }).catch((error) => {
        console.warn("Lecture résultats diagnostic impossible", error);
        return null;
      }),
      safeDocumentData(publicResultsIndexDocument()),
      safeDocumentData(liveDataDocument()),
      safeCountCollection(resultPdfsCollection()),
      safeCountCollection(seriesPdfsCollection()),
      safeCountCollection(sessionResultsPdfsCollection()),
      alertsCollection()?.orderBy("createdAt", "desc").get({ source: "server" }).catch((error) => {
        console.warn("Lecture alertes diagnostic impossible", error);
        return null;
      }),
      safeCountCollection(presenceCollection()),
      safeCountCollection(activeCompetitionDocument()?.collection("roleLocks"))
    ]);
  
    const serverResults = resultsSnapshot?.docs?.map((doc) => ({ id: doc.id, ...doc.data() })) || [];
    const serverAlerts = alertSnapshot?.docs?.map((doc) => ({ id: doc.id, ...doc.data() })) || [];
    const serverAlertBreakdown = alertPendingBreakdown(serverAlerts, { respectLiveDismissed: false });
    const resultPerformances = serverResults.reduce((sum, result) => sum + (Array.isArray(result.performances) ? result.performances.length : 0), 0);
    const detailedResults = serverResults.filter(resultHasDetailsForDiagnostic).length;
    const legacyPdfResults = serverResults.filter((result) => result.pdfDataUrl);
    const resultSessions = [...new Set(serverResults.map((result) => String(result.session || "").trim()).filter(Boolean))]
      .sort((a, b) => Number(a) - Number(b));
    const publicResults = Array.isArray(publicIndex?.results) ? publicIndex.results : [];
    const livePayload = liveData?.data || {};
    const publicIndexBytes = publicIndex ? JSON.stringify(publicIndex).length : 0;
    const liveDataBytes = livePayload ? JSON.stringify(livePayload).length : 0;
    const lastResultUpdatedAt = serverResults.map((result) => result.updatedAt).filter(Boolean).sort().at(-1) || "";
    report.firebase = {
      results: serverResults.length,
      visibleResults: serverResults.filter((result) => !result.hasFinal || result.finalistsAnnouncedAt).length,
      detailedResults,
      resultPerformances,
      partialResults: serverResults.filter((result) => result.isPartial).length,
      waitingFinalAnnouncements: serverResults.filter((result) => result.hasFinal && !result.finalistsAnnouncedAt).length,
      legacyPdfCount: legacyPdfResults.length,
      legacyBytes: legacyPdfResults.reduce((sum, result) => sum + dataUrlApproxBytes(result.pdfDataUrl), 0),
      resultPdfCount,
      seriesPdfCount,
      sessionResultsPdfCount,
      alertCount: serverAlerts.length,
      pendingAlertCount: serverAlertBreakdown.total,
      pendingAlertCounts: serverAlertBreakdown.counts,
      pendingAlertExamples: serverAlertBreakdown.examples,
      presenceCount,
      roleLockCount,
      publicResults: publicResults.length,
      publicIndexBytes,
      publicIndexUpdatedAt: publicIndex?.updatedAt || "",
      liveDataBytes,
      liveSourceVersion: livePayload.sourceVersion || "",
      livePublishedAt: livePayload.notes?.livePublishedAt || "",
      resultSessions: resultSessions.join(", ") || "aucune",
      lastResultUpdatedAt
    };
  
    if (report.firebase.legacyPdfCount) {
      report.recommendations.push("Des PDF résultats sont encore stockés dans results : lancer le nettoyage PDF résultats.");
    }
    if (publicIndexBytes > 750000) {
      report.recommendations.push("L'index public est lourd : surveiller le temps d'actualisation des pages publiques.");
    }
    if (liveDataBytes > 900000) {
      report.recommendations.push("Les données live sont lourdes : éviter de republier inutilement pendant une session chargée.");
    }
    if (serverResults.length && detailedResults < serverResults.length / 2) {
      report.recommendations.push("Beaucoup de résultats n'ont pas de détails nageurs : relire les PDF concernés si les fiches publiques sont incomplètes.");
    }
    if (!report.recommendations.length) {
      report.recommendations.push("Aucun signal technique préoccupant détecté.");
    }
    report.readMs = Math.round(performance.now() - startedAt);
    return report;
  }

  function technicalLogSummary() {
    const summary = livePalmesTechnicalLog?.summary?.() || {};
    return {
      ...summary,
      latestAt: summary.latest?.createdAt || ""
    };
  }
  
  function resultHasDetailsForDiagnostic(result) {
    if (typeof livePalmesAdminDiagnostics.resultHasDetails === "function") {
      return livePalmesAdminDiagnostics.resultHasDetails(result);
    }
    return Boolean(result?.ranking?.length || result?.performances?.length);
  }

  function byteSize(value) {
    const json = JSON.stringify(value || {});
    if (typeof TextEncoder === "function") return new TextEncoder().encode(json).length;
    return json.length;
  }

  function publicResultExpectedKey(row = {}) {
    const stage = isFinalStage?.(row.stage) ? "finales" : "series";
    return [row.session || "", row.eventId || "", row.sex || "", stage].join("|");
  }

  function expectedResultsBySession(program = []) {
    const map = new Map();
    (Array.isArray(program) ? program : [])
      .filter((row) => row.session && row.eventId && row.sex)
      .forEach((row) => {
        const session = String(row.session || "").trim();
        const key = publicResultExpectedKey(row);
        if (!map.has(session)) map.set(session, new Set());
        map.get(session).add(key);
      });
    return map;
  }

  function resultCountsBySession(results = []) {
    return (Array.isArray(results) ? results : []).reduce((counts, result) => {
      const session = String(result?.session || "").trim();
      if (!session) return counts;
      counts[session] = (counts[session] || 0) + 1;
      return counts;
    }, {});
  }

  function sessionPdfSessions(pdf = {}) {
    const sessions = new Set();
    if (pdf.scope === "full") {
      sessionRows().forEach((session) => sessions.add(String(session.number || "").trim()));
    }
    if (pdf.session) sessions.add(String(pdf.session || "").trim());
    (Array.isArray(pdf.sessions) ? pdf.sessions : []).forEach((session) => sessions.add(String(session || "").trim()));
    return sessions;
  }

  async function collectPublicPublicationDiagnostic() {
    if (!firestoreDb) {
      return {
        available: false,
        message: "Firebase indisponible sur cet appareil."
      };
    }
    const publicDoc = publicResultsIndexDocument();
    const seriesDoc = publicDoc?.parent?.doc ? publicDoc.parent.doc("seriesIndex") : null;
    const [
      publicIndex,
      seriesIndex,
      resultsSnapshot,
      sessionPdfsSnapshot
    ] = await Promise.all([
      safeDocumentData(publicDoc),
      safeDocumentData(seriesDoc),
      resultsCollection().orderBy("updatedAt", "desc").get({ source: "server" }).catch(() => null),
      sessionResultsPdfsCollection().get({ source: "server" }).catch(() => null)
    ]);
    const serverResults = resultsSnapshot?.docs?.map((doc) => ({ id: doc.id, ...doc.data() })) || [];
    const publicResults = Array.isArray(publicIndex?.results) ? publicIndex.results : [];
    const sessionPdfs = sessionPdfsSnapshot?.docs?.map((doc) => ({ id: doc.id, ...doc.data() })) || [];
    const expected = expectedResultsBySession(data.program || []);
    const publicCounts = resultCountsBySession(publicResults);
    const serverCounts = resultCountsBySession(serverResults);
    const pdfSessions = new Set();
    sessionPdfs.forEach((pdf) => sessionPdfSessions(pdf).forEach((session) => { if (session) pdfSessions.add(session); }));
    const allSessions = [...new Set([
      ...sessionRows().map((session) => String(session.number || "").trim()).filter(Boolean),
      ...Object.keys(publicCounts),
      ...Object.keys(serverCounts),
      ...pdfSessions
    ])].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b, "fr"));
    const sessions = allSessions.map((session) => ({
      session,
      expectedResults: expected.get(session)?.size || 0,
      publicResults: publicCounts[session] || 0,
      serverResults: serverCounts[session] || 0,
      hasSessionPdf: pdfSessions.has(session)
    }));
    const recommendations = [];
    sessions
      .filter((session) => session.expectedResults && session.publicResults < session.expectedResults)
      .forEach((session) => recommendations.push(`Session ${session.session} : ${session.publicResults}/${session.expectedResults} resultats detailles dans l'index public.`));
    if (byteSize(publicIndex) > 900000) recommendations.push("L'index resultats approche de la limite Firestore : surveiller avant de republier.");
    if (byteSize(seriesIndex) > 900000) recommendations.push("L'index series approche de la limite Firestore : il faudra decouper par session si la competition grossit.");
    if (!recommendations.length) recommendations.push("Publication publique stable : tailles correctes et aucun manque evident par session.");
    return {
      available: true,
      resultsIndexBytes: byteSize(publicIndex),
      seriesIndexBytes: byteSize(seriesIndex),
      publicResults: publicResults.length,
      serverResults: serverResults.length,
      sessionPdfCount: sessionPdfs.length,
      sessions,
      recommendations
    };
  }

  function renderPublicPublicationDiagnosticModal(report) {
    if (!roleCodesModal) return;
    roleCodesModal.hidden = false;
    roleCodesModal.innerHTML = livePalmesAdminDiagnostics.renderPublicPublicationDiagnosticModalHtml(report, {
      formatByteSize
    });
  }

  async function showPublicPublicationDiagnosticModal() {
    if (!roleCodesModal) return;
    roleCodesModal.hidden = false;
    roleCodesModal.innerHTML = livePalmesAdminDiagnostics.renderPublicPublicationDiagnosticLoadingHtml();
    const report = await collectPublicPublicationDiagnostic();
    renderPublicPublicationDiagnosticModal(report);
  }
  
  function renderTechnicalDiagnosticModal(report) {
    if (!roleCodesModal) return;
    roleCodesModal.hidden = false;
    roleCodesModal.innerHTML = livePalmesAdminDiagnostics.renderTechnicalDiagnosticModalHtml(report, {
      alertTargetsLabel,
      formatAlertDateTime,
      formatByteSize
    });
  }
  
  async function showTechnicalDiagnosticModal() {
    if (!roleCodesModal) return;
    roleCodesModal.hidden = false;
    roleCodesModal.innerHTML = livePalmesAdminDiagnostics.renderTechnicalDiagnosticLoadingHtml();
    const report = await collectTechnicalDiagnostic();
    renderTechnicalDiagnosticModal(report);
  }

  function showTechnicalLogModal() {
    if (!roleCodesModal) return;
    roleCodesModal.hidden = false;
    const entries = livePalmesTechnicalLog?.entries?.() || [];
    roleCodesModal.innerHTML = livePalmesAdminDiagnostics.renderTechnicalLogModalHtml(entries);
  }

  function clearTechnicalLog() {
    livePalmesTechnicalLog?.clear?.();
    showTechnicalLogModal();
  }
  
  async function cleanLegacyResultPdfs() {
    const snapshot = await resultsCollection().orderBy("updatedAt", "desc").get({ source: "server" });
    const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return migrateResultPdfsOutOfResults(rows, { force: true });
  }
  
  async function showDataDiagnostic() {
    const sessions = sessionRows().map((session) => `S${session.number}`).join(", ") || "aucune";
    const seriesCount = data.series?.length || 0;
    const programCount = data.program?.length || 0;
    const entrantCount = data.entrants?.length || 0;
    const locations = (data.entrants || []).filter((entrant) => entrant.seedSource).length;
    const firebaseMeta = firebaseStatusMeta();
    const firebaseLabel = firebaseStatus === "local" ? "local seulement" : firebaseMeta.label.toLowerCase();
    const performanceReport = await collectPerformanceDiagnostic().catch((error) => ({
      available: false,
      message: error?.message || String(error)
    }));
    window.alert([
      "Diagnostic LivePalmes",
      "",
      `Firebase : ${firebaseLabel}`,
      `Sessions : ${sessions}`,
      `Programme : ${programCount} courses`,
      `Séries : ${seriesCount} lignes`,
      `Engagés : ${entrantCount}`,
      `Records : ${data.records?.length || 0}`,
      `Qualifs EDF : ${data.qualifications?.length || 0}`,
      `Membres EDF : ${data.edfMembers?.length || 0}`,
      `France N-1 : ${data.top2025?.length || 0}`,
      `Lieux rattachés : ${locations}`,
      `Dernière mise à jour session : ${data.notes?.lastUpdatedSession ? `S${data.notes.lastUpdatedSession}` : "aucune"}`,
      `Infos speaker : ${data.notes?.speakerInfoUpdatedAt || "non mises à jour"}`,
      "",
      "Performance résultats",
      ...performanceDiagnosticLines(performanceReport)
    ].join("\n"));
  }
  api = {
    renderDataStatus,
    firebaseStatusMeta,
    renderFirebaseHeaderStatus,
    shortStatusDate,
    appendImportHistory,
    countCollectionDocuments,
    collectPerformanceDiagnostic,
    renderPerformanceDiagnosticModal,
    showPerformanceDiagnosticModal,
    safeCountCollection,
    safeDocumentData,
    alertPendingTargets,
    alertPendingBreakdown,
    alertTargetsLabel,
    collectTechnicalDiagnostic,
    collectPublicPublicationDiagnostic,
    resultHasDetailsForDiagnostic,
    renderPublicPublicationDiagnosticModal,
    showPublicPublicationDiagnosticModal,
    renderTechnicalDiagnosticModal,
    showTechnicalDiagnosticModal,
    cleanLegacyResultPdfs,
    showTechnicalLogModal,
    clearTechnicalLog,
    showDataDiagnostic
  };

  function useContext(nextContext = {}) {
    Object.keys(context).forEach((key) => { delete context[key]; });
    Object.assign(context, nextContext || {});
    activeCompetitionDocument = context.activeCompetitionDocument;
    activeCompetitionId = context.activeCompetitionId;
    alertRaceLabel = context.alertRaceLabel;
    alerts = context.alerts;
    alertsCollection = context.alertsCollection;
    alertStatusLabel = context.alertStatusLabel;
    competitionModeEnabled = context.competitionModeEnabled;
    data = context.data;
    dataStatus = context.dataStatus;
    dataUrlApproxBytes = context.dataUrlApproxBytes;
    decisionMotifLabel = context.decisionMotifLabel;
    escapeHtml = context.escapeHtml;
    firebaseHeaderStatus = context.firebaseHeaderStatus;
    firebaseStatus = context.firebaseStatus;
    firestoreDb = context.firestoreDb;
    formatAlertDateTime = context.formatAlertDateTime;
    formatByteSize = context.formatByteSize;
    fullAlertIdentityLabel = context.fullAlertIdentityLabel;
    isFinalStage = context.isFinalStage;
    liveDataDocument = context.liveDataDocument;
    liveDismissedAlertIds = context.liveDismissedAlertIds;
    livePalmesAdminDiagnostics = context.livePalmesAdminDiagnostics;
    livePalmesAdminAuth = context.livePalmesAdminAuth;
    livePalmesPinAuth = context.livePalmesPinAuth;
    livePalmesTechnicalLog = context.livePalmesTechnicalLog;
    lastConsoleActivityAt = context.lastConsoleActivityAt;
    migrateResultPdfsOutOfResults = context.migrateResultPdfsOutOfResults;
    performanceDiagnosticLines = context.performanceDiagnosticLines;
    pinLockEnabled = context.pinLockEnabled;
    presenceCollection = context.presenceCollection;
    publicResultsIndexDocument = context.publicResultsIndexDocument;
    raceResults = context.raceResults;
    realtimeSyncEnabled = context.realtimeSyncEnabled;
    resultPdfsCollection = context.resultPdfsCollection;
    resultsCollection = context.resultsCollection;
    roleCodesModal = context.roleCodesModal;
    seriesPdfsCollection = context.seriesPdfsCollection;
    sessionResultsPdfsCollection = context.sessionResultsPdfsCollection;
    sessionRows = context.sessionRows;
    speakerAlertAlreadyResolvedByResult = context.speakerAlertAlreadyResolvedByResult;
    state = context.state;
  }

  window.LivePalmesDiagnosticsWorkflow = {
    renderDataStatus: (...args) => { useContext(args.pop() || {}); return api.renderDataStatus(...args); },
    firebaseStatusMeta: (...args) => { useContext(args.pop() || {}); return api.firebaseStatusMeta(...args); },
    renderFirebaseHeaderStatus: (...args) => { useContext(args.pop() || {}); return api.renderFirebaseHeaderStatus(...args); },
    shortStatusDate: (...args) => { useContext(args.pop() || {}); return api.shortStatusDate(...args); },
    appendImportHistory: (...args) => { useContext(args.pop() || {}); return api.appendImportHistory(...args); },
    countCollectionDocuments: (...args) => { useContext(args.pop() || {}); return api.countCollectionDocuments(...args); },
    collectPerformanceDiagnostic: (...args) => { useContext(args.pop() || {}); return api.collectPerformanceDiagnostic(...args); },
    renderPerformanceDiagnosticModal: (...args) => { useContext(args.pop() || {}); return api.renderPerformanceDiagnosticModal(...args); },
    showPerformanceDiagnosticModal: (...args) => { useContext(args.pop() || {}); return api.showPerformanceDiagnosticModal(...args); },
    safeCountCollection: (...args) => { useContext(args.pop() || {}); return api.safeCountCollection(...args); },
    safeDocumentData: (...args) => { useContext(args.pop() || {}); return api.safeDocumentData(...args); },
    alertPendingTargets: (...args) => { useContext(args.pop() || {}); return api.alertPendingTargets(...args); },
    alertPendingBreakdown: (...args) => { useContext(args.pop() || {}); return api.alertPendingBreakdown(...args); },
    alertTargetsLabel: (...args) => { useContext(args.pop() || {}); return api.alertTargetsLabel(...args); },
    collectTechnicalDiagnostic: (...args) => { useContext(args.pop() || {}); return api.collectTechnicalDiagnostic(...args); },
    collectPublicPublicationDiagnostic: (...args) => { useContext(args.pop() || {}); return api.collectPublicPublicationDiagnostic(...args); },
    resultHasDetailsForDiagnostic: (...args) => { useContext(args.pop() || {}); return api.resultHasDetailsForDiagnostic(...args); },
    renderPublicPublicationDiagnosticModal: (...args) => { useContext(args.pop() || {}); return api.renderPublicPublicationDiagnosticModal(...args); },
    showPublicPublicationDiagnosticModal: (...args) => { useContext(args.pop() || {}); return api.showPublicPublicationDiagnosticModal(...args); },
    renderTechnicalDiagnosticModal: (...args) => { useContext(args.pop() || {}); return api.renderTechnicalDiagnosticModal(...args); },
    showTechnicalDiagnosticModal: (...args) => { useContext(args.pop() || {}); return api.showTechnicalDiagnosticModal(...args); },
    cleanLegacyResultPdfs: (...args) => { useContext(args.pop() || {}); return api.cleanLegacyResultPdfs(...args); },
    showTechnicalLogModal: (...args) => { useContext(args.pop() || {}); return api.showTechnicalLogModal(...args); },
    clearTechnicalLog: (...args) => { useContext(args.pop() || {}); return api.clearTechnicalLog(...args); },
    showDataDiagnostic: (...args) => { useContext(args.pop() || {}); return api.showDataDiagnostic(...args); }
  };
}());
