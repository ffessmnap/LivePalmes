(function () {
  function init(context = {}) {
    with (context) {
      function loadLiveDismissedAlerts() {
        const saved = localStorage.getItem(LIVE_DISMISSED_ALERTS_KEY);
        if (!saved) return [];
        try {
          const parsed = JSON.parse(saved);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      
      function saveLiveDismissedAlerts() {
        localStorage.setItem(LIVE_DISMISSED_ALERTS_KEY, JSON.stringify(liveDismissedAlertIds));
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
          meet: data.meet || {},
          count: rows.length,
          alerts: rows.map(sanitizeAlertForFirestore)
        };
        await collection.doc(archive.id).set(sanitizeAlertForFirestore(archive));
        return archive;
      }
      
      async function archiveCurrentResults(reason = "Archivage des résultats publics", sourceResults = raceResults) {
        const rows = Array.isArray(sourceResults) ? sourceResults.map(resultWithoutPdf) : [];
        if (!rows.length) return null;
        const collection = resultArchivesCollection();
        if (!collection || !firestoreDb) throw new Error("Firebase n'est pas disponible pour archiver les résultats.");
        const now = new Date();
        const archive = {
          id: `${now.getTime()}-${Math.random().toString(16).slice(2)}`,
          createdAt: now.toISOString(),
          createdLabel: now.toLocaleString("fr-FR"),
          reason,
          meet: data.meet || {},
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
        const ok = window.confirm("Archiver puis effacer l'historique actif DSQ, forfaits, abandons et requalifications ?");
        if (!ok) return;
        renderResetHistoryModal();
      }
      
      async function performResetHistoryWithArchive() {
        let archive = null;
        try {
          archive = await archiveCurrentHistory();
        } catch (error) {
          console.warn("Archivage impossible", error);
          window.alert(`RAZ annulée : impossible d'archiver l'historique. ${error?.message || ""}`);
          return;
        }
        const confirmation = window.confirm(archive
          ? `Historique archivé (${archive.count} lignes). Confirmer la remise à zéro ?`
          : "Aucun historique à archiver. Confirmer la remise à zéro ?");
        if (!confirmation) {
          window.alert("RAZ annulée.");
          return;
        }
        alerts = [];
        liveDismissedAlertIds = [];
        saveAlerts();
        saveLiveDismissedAlerts();
        try {
          await clearFirestoreAlerts();
        } catch {
          window.alert("L'historique local est remis à zéro, mais Firebase n'a pas pu être vidé. Vérifie ta connexion.");
        }
        render();
        window.alert(archive ? "Historique archivé puis remis à zéro." : "Historique remis à zéro.");
      }
      
      async function clearHistoryAndAlertsForFullImport() {
        const archive = await archiveCurrentHistory();
        const clearedAlerts = alerts.length;
        await clearFirestoreAlerts();
        alerts = [];
        liveDismissedAlertIds = [];
        saveAlerts();
        saveLiveDismissedAlerts();
        return {
          archivedCount: archive?.count || 0,
          clearedAlerts
        };
      }
      
      function dismissLiveAlert(alertId) {
        if (!liveDismissedAlertIds.includes(alertId)) {
          liveDismissedAlertIds.push(alertId);
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
  }

  window.LivePalmesHistoryActions = { init };
}());
