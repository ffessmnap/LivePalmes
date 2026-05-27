(function () {
  function init(context = {}) {
    const {
      LIVE_DISMISSED_ALERTS_KEY,
      buildPublicResultsIndex,
      clearFirestoreAlerts,
      dsqReportRows,
      firestoreDb,
      historyArchivesCollection,
      livePalmesExportActions,
      render,
      renderOfficialAlerts,
      renderResetHistoryModal,
      resultArchivesCollection,
      resultWithoutPdf,
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
      const rows = Array.isArray(sourceResults) ? sourceResults.map(resultWithoutPdf) : [];
      if (!rows.length) return null;
      const collection = resultArchivesCollection();
      if (!collection || !firestoreDb) throw new Error("Firebase n'est pas disponible pour archiver les r\u00e9sultats.");
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
      const batch = firestoreDb.batch();
      batch.set(archiveRef, sanitizeAlertForFirestore(archive));
      rows.forEach((result) => {
        const itemId = result.id || `${result.raceKey || "result"}-${Math.random().toString(16).slice(2)}`;
        batch.set(archiveRef.collection("items").doc(itemId), sanitizeAlertForFirestore({ ...result, id: itemId }));
      });
      await batch.commit();
      return archive;
    }

    async function resetHistory() {
      const ok = browserWindow.confirm("Archiver puis effacer l'historique actif DSQ, forfaits, abandons et requalifications ?");
      if (!ok) return;
      renderResetHistoryModal();
    }

    async function performResetHistoryWithArchive() {
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
      setAlerts([]);
      setLiveDismissedAlertIds([]);
      context.saveAlerts();
      saveLiveDismissedAlerts();
      try {
        await clearFirestoreAlerts();
      } catch {
        browserWindow.alert("L'historique local est remis \u00e0 z\u00e9ro, mais Firebase n'a pas pu \u00eatre vid\u00e9. V\u00e9rifie ta connexion.");
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
