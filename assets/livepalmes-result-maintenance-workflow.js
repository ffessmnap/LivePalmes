(function () {
  function init(context = {}) {
    const {
      appendImportHistory,
      archiveCurrentHistory,
      archiveCurrentResults,
      clearFirestoreAlerts,
      clearPublicSessionResultsPdfs,
      clearPublicSessionResultsPdfsForSession,
      clearPublicSeriesPdfs,
      competitionModeEnabled,
      deleteFinalResultAlerts,
      deleteResultPdfPayload,
      livePalmesAdminMaintenance,
      normalizeData,
      publishLiveDataToFirestore,
      publishPublicResultsIndex,
      publicResultsIndexDocument,
      render,
      renderResultsAdminPanel,
      resultWithoutPdf,
      resultsCollection,
      saveAlerts,
      saveData,
      saveLiveDismissedAlerts,
      window
    } = context;
    const getAlerts = () => context.alerts || [];
    const setAlerts = (value) => { context.alerts = value; };
    const getData = () => context.data || {};
    const setData = (value) => { context.data = value; };
    const setLiveDismissedAlertIds = (value) => { context.liveDismissedAlertIds = value; };
    const getRaceResults = () => context.raceResults || [];
    const setRaceResults = (value) => { context.raceResults = value; };
    const getState = () => context.state || {};

    async function deleteResultPdf(resultId) {
      const collection = resultsCollection();
      if (!collection) throw new Error("Firebase n'est pas disponible pour supprimer ce r\u00e9sultat.");
      await deleteFinalResultAlerts(resultId);
      await deleteResultPdfPayload(resultId);
      await collection.doc(resultId).delete();
      setRaceResults(getRaceResults().filter((result) => result.id !== resultId));
      await publishPublicResultsIndex();
    }

    async function clearPublicCompetitionIndexes(reason = "Compétition archivée") {
      const doc = typeof publicResultsIndexDocument === "function" ? publicResultsIndexDocument() : null;
      if (!doc) throw new Error("Firebase n'est pas disponible pour vider les index publics.");
      const updatedAt = new Date().toISOString();
      const base = {
        meet: {},
        events: [],
        program: [],
        entrants: [],
        series: [],
        results: [],
        records: [],
        qualifications: [],
        seriesPdfs: [],
        sessionResultsPdfs: [],
        sessionInfos: {},
        publicAccess: {
          online: false,
          updatedAt
        },
        updatedAt,
        sourceVersion: "",
        sourceLabel: reason,
        lastUpdatedSession: ""
      };
      await doc.set({ id: "resultsIndex", ...base });
      if (doc.parent?.doc) {
        await doc.parent.doc("seriesIndex").set({ id: "seriesIndex", ...base });
      }
    }

    async function clearPublishedResults(options = {}) {
      const collection = resultsCollection();
      if (!collection) throw new Error("Firebase n'est pas disponible pour effacer les r\u00e9sultats publics.");
      const snapshot = await collection.get();
      const docs = snapshot.docs || [];
      const raceResults = getRaceResults();
      const rowsToArchive = raceResults.length ? raceResults.map(resultWithoutPdf) : docs.map((doc) => resultWithoutPdf({ id: doc.id, ...doc.data() }));
      if (rowsToArchive.length && !options.skipArchive) {
        await archiveCurrentResults("Avant remise \u00e0 z\u00e9ro des r\u00e9sultats publics", rowsToArchive);
      }
      for (const result of rowsToArchive) {
        await deleteFinalResultAlerts(result.id);
      }
      await Promise.all(docs.map((doc) => Promise.all([doc.ref.delete(), deleteResultPdfPayload(doc.id)])));
      await clearPublicSessionResultsPdfs();
      if (options.clearSeriesPdfs) {
        await clearPublicSeriesPdfs();
      }
      setRaceResults([]);
      if (options.unpublishPublicIndexes) {
        await clearPublicCompetitionIndexes(options.reason || "Compétition archivée");
      } else {
        await publishPublicResultsIndex();
      }
      renderResultsAdminPanel();
      return docs.length;
    }

    async function clearPublishedResultsForSession(session) {
      const cleanSession = String(session || "").trim();
      if (!cleanSession) throw new Error("Aucune session s\u00e9lectionn\u00e9e.");
      const collection = resultsCollection();
      if (!collection) throw new Error("Firebase n'est pas disponible pour effacer les r\u00e9sultats publics.");
      const snapshot = await collection.get();
      const docs = snapshot.docs || [];
      const rows = docs.map((doc) => resultWithoutPdf({ id: doc.id, ...doc.data() }));
      const rowsToDelete = typeof livePalmesAdminMaintenance.splitRowsForSession === "function"
        ? livePalmesAdminMaintenance.splitRowsForSession(rows, cleanSession)
        : rows.filter((row) => String(row.session || "") === cleanSession);
      if (rowsToDelete.length) {
        await archiveCurrentResults(`Avant remise \u00e0 z\u00e9ro des r\u00e9sultats publics S${cleanSession}`, rowsToDelete);
      }
      for (const result of rowsToDelete) {
        await deleteFinalResultAlerts(result.id);
      }
      const idsToDelete = new Set(rowsToDelete.map((row) => row.id));
      await Promise.all(docs.filter((doc) => idsToDelete.has(doc.id)).map((doc) => Promise.all([doc.ref.delete(), deleteResultPdfPayload(doc.id)])));
      const clearedSessionPdfs = await clearPublicSessionResultsPdfsForSession(cleanSession);
      setRaceResults(getRaceResults().filter((result) => String(result.session || "") !== cleanSession));
      await publishPublicResultsIndex();
      renderResultsAdminPanel();
      return {
        results: rowsToDelete.length,
        sessionPdfs: clearedSessionPdfs
      };
    }

    async function resetSeriesForNextCompetition() {
      const data = getData();
      let archivedHistoryCount = 0;
      let clearedAlerts = 0;
      if (typeof archiveCurrentHistory === "function") {
        const archive = await archiveCurrentHistory();
        archivedHistoryCount = archive?.count || 0;
      }
      if (typeof clearFirestoreAlerts === "function") {
        clearedAlerts = await clearFirestoreAlerts();
      }
      clearedAlerts = Math.max(clearedAlerts || 0, getAlerts().length);
      setAlerts([]);
      setLiveDismissedAlertIds([]);
      if (typeof saveAlerts === "function") saveAlerts();
      if (typeof saveLiveDismissedAlerts === "function") saveLiveDismissedAlerts();
      const clearedSeriesPdfs = await clearPublicSeriesPdfs();
      const clearedResults = await clearPublishedResults();
      const resetData = livePalmesAdminMaintenance.buildResetSeriesData
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
            sourceLabel: "Aucune s\u00e9rie charg\u00e9e",
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
            importHistory: appendImportHistory(data.notes || {}, "RAZ s\u00e9ries")
          }
        };
      const nextData = normalizeData({
        ...resetData,
        notes: {
          ...(resetData.notes || {}),
          competitionMode: false,
          competitionModeUpdatedAt: new Date().toISOString()
        }
      });
      setData(nextData);
      const state = getState();
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
      context.resultsAdminSession = "";
      saveData();
      render();
      await publishLiveDataToFirestore(nextData, "RAZ s\u00e9ries");
      await publishPublicResultsIndex({ silent: true });
      const historyMessage = archivedHistoryCount || clearedAlerts
        ? ` ${archivedHistoryCount} ligne${archivedHistoryCount > 1 ? "s" : ""} du journal archiv\u00e9e${archivedHistoryCount > 1 ? "s" : ""}. ${clearedAlerts} alerte${clearedAlerts > 1 ? "s" : ""} Firebase supprim\u00e9e${clearedAlerts > 1 ? "s" : ""}.`
        : "";
      window.alert(`RAZ s\u00e9ries effectu\u00e9e : programme, s\u00e9ries et engag\u00e9s vid\u00e9s.${historyMessage} ${clearedSeriesPdfs} PDF s\u00e9ries public${clearedSeriesPdfs > 1 ? "s" : ""} supprim\u00e9${clearedSeriesPdfs > 1 ? "s" : ""}. ${clearedResults} r\u00e9sultat${clearedResults > 1 ? "s" : ""} public${clearedResults > 1 ? "s" : ""} archiv\u00e9${clearedResults > 1 ? "s" : ""} puis supprim\u00e9${clearedResults > 1 ? "s" : ""}.`);
    }

    return {
      deleteResultPdf,
      clearPublishedResults,
      clearPublishedResultsForSession,
      clearPublicCompetitionIndexes,
      resetSeriesForNextCompetition
    };
  }

  window.LivePalmesResultMaintenanceWorkflow = { init };
})();
