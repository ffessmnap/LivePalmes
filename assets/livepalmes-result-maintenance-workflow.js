(function () {
  function init(context = {}) {
    with (context) {
      async function deleteResultPdf(resultId) {
        const collection = resultsCollection();
        if (!collection) throw new Error("Firebase n'est pas disponible pour supprimer ce résultat.");
        await deleteFinalResultAlerts(resultId);
        await deleteResultPdfPayload(resultId);
        await collection.doc(resultId).delete();
        raceResults = raceResults.filter((result) => result.id !== resultId);
        await publishPublicResultsIndex();
      }
      
      async function clearPublishedResults() {
        const collection = resultsCollection();
        if (!collection) throw new Error("Firebase n'est pas disponible pour effacer les résultats publics.");
        const snapshot = await collection.get();
        const docs = snapshot.docs || [];
        const rowsToArchive = raceResults.length ? raceResults.map(resultWithoutPdf) : docs.map((doc) => resultWithoutPdf({ id: doc.id, ...doc.data() }));
        if (rowsToArchive.length) {
          await archiveCurrentResults("Avant remise à zéro des résultats publics", rowsToArchive);
        }
        for (const result of rowsToArchive) {
          await deleteFinalResultAlerts(result.id);
        }
        await Promise.all(docs.map((doc) => Promise.all([doc.ref.delete(), deleteResultPdfPayload(doc.id)])));
        await clearPublicSessionResultsPdfs();
        raceResults = [];
        await publishPublicResultsIndex();
        renderResultsAdminPanel();
        return docs.length;
      }
      
      async function clearPublishedResultsForSession(session) {
        const cleanSession = String(session || "").trim();
        if (!cleanSession) throw new Error("Aucune session sélectionnée.");
        const collection = resultsCollection();
        if (!collection) throw new Error("Firebase n'est pas disponible pour effacer les résultats publics.");
        const snapshot = await collection.get();
        const docs = snapshot.docs || [];
        const rows = docs.map((doc) => resultWithoutPdf({ id: doc.id, ...doc.data() }));
        const rowsToDelete = typeof livePalmesAdminMaintenance.splitRowsForSession === "function"
          ? livePalmesAdminMaintenance.splitRowsForSession(rows, cleanSession)
          : rows.filter((row) => String(row.session || "") === cleanSession);
        if (rowsToDelete.length) {
          await archiveCurrentResults(`Avant remise à zéro des résultats publics S${cleanSession}`, rowsToDelete);
        }
        for (const result of rowsToDelete) {
          await deleteFinalResultAlerts(result.id);
        }
        const idsToDelete = new Set(rowsToDelete.map((row) => row.id));
        await Promise.all(docs.filter((doc) => idsToDelete.has(doc.id)).map((doc) => Promise.all([doc.ref.delete(), deleteResultPdfPayload(doc.id)])));
        const clearedSessionPdfs = await clearPublicSessionResultsPdfsForSession(cleanSession);
        raceResults = raceResults.filter((result) => String(result.session || "") !== cleanSession);
        await publishPublicResultsIndex();
        renderResultsAdminPanel();
        return {
          results: rowsToDelete.length,
          sessionPdfs: clearedSessionPdfs
        };
      }
      
      async function resetSeriesForNextCompetition() {
        if (competitionModeEnabled()) {
          window.alert("RAZ séries indisponible quand l'actualisation directe est active.");
          return;
        }
        const clearedSeriesPdfs = await clearPublicSeriesPdfs();
        const clearedResults = await clearPublishedResults();
        const nextData = normalizeData(livePalmesAdminMaintenance.buildResetSeriesData
          ? livePalmesAdminMaintenance.buildResetSeriesData(data, { appendImportHistory })
          : {
            ...data,
            meet: {},
            events: [],
            entrants: [],
            series: [],
            program: [],
            sourceVersion: `series-reset-${Date.now()}`,
            notes: {
              ...(data.notes || {}),
              sourceMode: "empty",
              sourceLabel: "Aucune série chargée",
              sourceFile: "",
              seriesLineCount: 0,
              entrantCount: 0,
              programCount: 0,
              lastImportedMode: "",
              lastImportedSessions: "",
              lastUpdatedSession: "",
              lastUpdatedSessionAt: "",
              publicSeriesPdfs: [],
              generatedAt: new Date().toLocaleString("fr-FR"),
              importHistory: appendImportHistory(data.notes || {}, "RAZ séries")
            }
          });
        data = nextData;
        if (typeof livePalmesAdminMaintenance.resetSeriesViewState === "function") {
          livePalmesAdminMaintenance.resetSeriesViewState(state);
        } else {
          state.eventId = "";
          state.sex = "F";
          state.series = "1";
          state.session = "1";
          state.programKey = "";
          state.category = "all";
          state.selectedSwimmerId = "";
          state.selectedRecordKey = "";
        }
        resultsAdminSession = "";
        saveData();
        render();
        await publishLiveDataToFirestore(nextData, "RAZ séries");
        await publishPublicResultsIndex({ silent: true });
        window.alert(`RAZ séries effectuée : programme, séries et engagés vidés. ${clearedSeriesPdfs} PDF séries public${clearedSeriesPdfs > 1 ? "s" : ""} supprimé${clearedSeriesPdfs > 1 ? "s" : ""}. ${clearedResults} résultat${clearedResults > 1 ? "s" : ""} public${clearedResults > 1 ? "s" : ""} archivé${clearedResults > 1 ? "s" : ""} puis supprimé${clearedResults > 1 ? "s" : ""}.`);
      }

      return {
        deleteResultPdf,
        clearPublishedResults,
        clearPublishedResultsForSession,
        resetSeriesForNextCompetition
      };
    }
  }

  window.LivePalmesResultMaintenanceWorkflow = { init };
})();
