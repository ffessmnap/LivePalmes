(function () {
  function init(context = {}) {
    const {
      LIVE_DISMISSED_ALERTS_KEY,
      FIREBASE_CONFIG,
      FIRESTORE_COMPETITION_ID,
      buildPublicResultsIndex,
      clearFirestoreAlerts,
      dsqReportRows,
      historyArchivesCollection,
      livePalmesExportActions,
      render,
      renderOfficialAlerts,
      renderResetHistoryModal,
      toggleCompetitionMode,
      resultArchivesCollection,
      resultPdfsCollection,
      resultWithoutPdf,
      sessionResultsPdfsCollection,
      sanitizeAlertForFirestore
    } = context;
    const browserWindow = context.window || window;
    const storage = context.localStorage || browserWindow.localStorage;
    const getAlerts = () => context.alerts || [];
    const setAlerts = (value) => { context.alerts = value; };
    const getData = () => context.data || {};
    const getLiveDismissedAlertIds = () => context.liveDismissedAlertIds || [];
    const setLiveDismissedAlertIds = (value) => { context.liveDismissedAlertIds = value; };
    const getRaceResults = () => context.raceResults || [];

    function loadLiveDismissedAlerts() {
      const saved = storage.getItem(LIVE_DISMISSED_ALERTS_KEY);
      if (!saved) return [];
      try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    function saveLiveDismissedAlerts() {
      storage.setItem(LIVE_DISMISSED_ALERTS_KEY, JSON.stringify(getLiveDismissedAlertIds()));
    }

    function ensureFirestoreDb() {
      if (context.firestoreDb) return context.firestoreDb;
      if (!browserWindow.firebase?.initializeApp || !browserWindow.firebase?.firestore) return null;
      if (!browserWindow.firebase.apps?.length) {
        if (!FIREBASE_CONFIG) return null;
        browserWindow.firebase.initializeApp(FIREBASE_CONFIG);
      }
      context.firestoreDb = browserWindow.firebase.firestore();
      return context.firestoreDb;
    }

    function collectionOrFallback(collectionGetter, collectionName) {
      const direct = typeof collectionGetter === "function" ? collectionGetter() : null;
      if (direct) return direct;
      const db = ensureFirestoreDb();
      if (!db || !FIRESTORE_COMPETITION_ID) return null;
      return db.collection("competitions").doc(FIRESTORE_COMPETITION_ID).collection(collectionName);
    }

    async function archiveCurrentHistory() {
      const rows = dsqReportRows();
      if (!rows.length) return null;
      const collection = historyArchivesCollection();
      if (!collection) throw new Error("Firebase n'est pas disponible pour archiver l'historique.");
      const now = new Date();
      const archive = {
        id: `${now.getTime()}-${Math.random().toString(16).slice(2)}`,
        createdAt: now.toISOString(),
        createdLabel: now.toLocaleString("fr-FR"),
        meet: getData().meet || {},
        count: rows.length,
        alerts: rows.map(sanitizeAlertForFirestore)
      };
      await collection.doc(archive.id).set(sanitizeAlertForFirestore(archive));
      return archive;
    }

    async function archiveCurrentResults(reason = "Archivage des r\u00e9sultats publics", sourceResults = getRaceResults()) {
      const sourceRows = Array.isArray(sourceResults) ? sourceResults : [];
      const rows = sourceRows.map(resultWithoutPdf);
      if (!rows.length) return null;
      const db = ensureFirestoreDb();
      const collection = collectionOrFallback(resultArchivesCollection, "resultArchives");
      if (!collection || !db) throw new Error("Firebase n'est pas disponible pour archiver les r\u00e9sultats.");
      const now = new Date();
      const archive = {
        id: `${now.getTime()}-${Math.random().toString(16).slice(2)}`,
        createdAt: now.toISOString(),
        createdLabel: now.toLocaleString("fr-FR"),
        reason,
        meet: getData().meet || {},
        count: rows.length,
        publicIndex: sanitizeAlertForFirestore(buildPublicResultsIndex())
      };
      const archiveRef = collection.doc(archive.id);
      const batch = db.batch();
      batch.set(archiveRef, sanitizeAlertForFirestore(archive));
      rows.forEach((result) => {
        const itemId = result.id || `${result.raceKey || "result"}-${Math.random().toString(16).slice(2)}`;
        batch.set(archiveRef.collection("items").doc(itemId), sanitizeAlertForFirestore({ ...result, id: itemId }));
      });
      await batch.commit();

      const resultPdfCollection = collectionOrFallback(resultPdfsCollection, "resultPdfs");
      const resultPdfArchive = archiveRef.collection("resultPdfs");
      if (resultPdfCollection) {
        for (const result of rows) {
          if (!result.id) continue;
          const pdfSnapshot = await resultPdfCollection.doc(result.id).get().catch(() => null);
          if (pdfSnapshot?.exists) {
            await resultPdfArchive.doc(result.id).set(sanitizeAlertForFirestore({ id: result.id, ...pdfSnapshot.data() }));
          } else {
            const sourceResult = sourceRows.find((item) => item?.id === result.id);
            if (sourceResult?.pdfDataUrl) {
              await resultPdfArchive.doc(result.id).set(sanitizeAlertForFirestore({
                id: result.id,
                resultId: result.id,
                pdfName: result.pdfName || "resultat.pdf",
                pdfSize: result.pdfSize || 0,
                pdfDataUrl: sourceResult.pdfDataUrl,
                updatedAt: result.updatedAt || new Date().toISOString(),
                eventLabel: result.eventLabel || "",
                sexLabel: result.sexLabel || "",
                session: result.session || ""
              }));
            }
          }
        }
      }

      const sessionPdfCollection = collectionOrFallback(sessionResultsPdfsCollection, "sessionResultsPdfs");
      const sessionPdfArchive = archiveRef.collection("sessionResultsPdfs");
      const sessionPdfIds = (getData().notes?.publicSessionResultsPdfs || [])
        .map((pdf) => String(pdf?.id || "").trim())
        .filter(Boolean);
      if (sessionPdfCollection && sessionPdfIds.length) {
        for (const pdfId of [...new Set(sessionPdfIds)]) {
          const pdfSnapshot = await sessionPdfCollection.doc(pdfId).get().catch(() => null);
          if (pdfSnapshot?.exists) {
            await sessionPdfArchive.doc(pdfId).set(sanitizeAlertForFirestore({ id: pdfId, ...pdfSnapshot.data() }));
          }
        }
      }
      return archive;
    }

    async function resetHistory() {
      const ok = browserWindow.confirm("Archiver puis effacer l'historique actif DSQ, forfaits, abandons et requalifications ?");
      if (!ok) return;
      renderResetHistoryModal();
    }

    async function performResetHistoryWithArchive() {
      if (typeof toggleCompetitionMode === "function" && getData().notes?.competitionMode === true) {
        const ready = await toggleCompetitionMode(false);
        if (!ready) return;
      }
      let archive = null;
      try {
        archive = await archiveCurrentHistory();
      } catch (error) {
        console.warn("Archivage impossible", error);
        browserWindow.alert(`RAZ annul\u00e9e : impossible d'archiver l'historique. ${error?.message || ""}`);
        return;
      }
      const confirmation = browserWindow.confirm(archive
        ? `Historique archiv\u00e9 (${archive.count} lignes). Confirmer la remise \u00e0 z\u00e9ro ?`
        : "Aucun historique \u00e0 archiver. Confirmer la remise \u00e0 z\u00e9ro ?");
      if (!confirmation) {
        browserWindow.alert("RAZ annul\u00e9e.");
        return;
      }
      const previousDismissedAlertIds = [...getLiveDismissedAlertIds()];
      setAlerts([]);
      context.saveAlerts();
      try {
        await clearFirestoreAlerts();
        setLiveDismissedAlertIds([]);
        saveLiveDismissedAlerts();
      } catch (error) {
        setLiveDismissedAlertIds(previousDismissedAlertIds);
        saveLiveDismissedAlerts();
        browserWindow.alert(`L'historique local est remis \u00e0 z\u00e9ro, mais Firebase n'a pas pu \u00eatre vid\u00e9 (${error?.livePalmesOperation || "operation inconnue"}). Les alertes d\u00e9j\u00e0 masqu\u00e9es restent masqu\u00e9es sur ce poste. ${error?.message || "V\u00e9rifie ta connexion."}`);
      }
      render();
      browserWindow.alert(archive ? "Historique archiv\u00e9 puis remis \u00e0 z\u00e9ro." : "Historique remis \u00e0 z\u00e9ro.");
    }

    async function clearHistoryAndAlertsForFullImport() {
      const archive = await archiveCurrentHistory();
      const clearedAlerts = getAlerts().length;
      await clearFirestoreAlerts();
      setAlerts([]);
      setLiveDismissedAlertIds([]);
      context.saveAlerts();
      saveLiveDismissedAlerts();
      return {
        archivedCount: archive?.count || 0,
        clearedAlerts
      };
    }

    function dismissLiveAlert(alertId) {
      const ids = getLiveDismissedAlertIds();
      if (!ids.includes(alertId)) {
        ids.push(alertId);
        saveLiveDismissedAlerts();
      }
      renderOfficialAlerts();
    }

    return {
      loadLiveDismissedAlerts,
      saveLiveDismissedAlerts,
      archiveCurrentHistory,
      archiveCurrentResults,
      resetHistory,
      performResetHistoryWithArchive,
      clearHistoryAndAlertsForFullImport,
      dismissLiveAlert
    };
  }

  window.LivePalmesHistoryActions = { init };
}());
