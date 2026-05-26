(function attachLivePalmesAdminMaintenance(global) {
  async function deleteCollectionDocuments(collectionRef, options = {}) {
    const { firestoreDb, nestedItems = false } = options;
    if (!collectionRef || !firestoreDb) return 0;
    const snapshot = await collectionRef.get();
    let deleted = 0;
    for (const doc of snapshot.docs) {
      if (nestedItems) {
        const items = await doc.ref.collection("items").get();
        if (!items.empty) {
          const itemBatch = firestoreDb.batch();
          items.docs.forEach((item) => itemBatch.delete(item.ref));
          await itemBatch.commit();
        }
      }
      const batch = firestoreDb.batch();
      batch.delete(doc.ref);
      await batch.commit();
      deleted += 1;
    }
    return deleted;
  }

  async function clearCompetitionCollections(competitionRef, options = {}) {
    const { firestoreDb, collections = [] } = options;
    if (!competitionRef || !firestoreDb) return {};
    const summary = {};
    for (const entry of collections) {
      const name = typeof entry === "string" ? entry : entry.name;
      const nestedItems = typeof entry === "object" && entry.nestedItems === true;
      summary[name] = await deleteCollectionDocuments(competitionRef.collection(name), {
        firestoreDb,
        nestedItems
      });
    }
    return summary;
  }

  function buildTrainingData(currentData, options = {}) {
    const nowIso = options.nowIso || new Date().toISOString();
    return {
      ...currentData,
      notes: {
        ...(currentData?.notes || {}),
        trainingMode: true,
        competitionMode: true,
        trainingModeStartedAt: nowIso
      },
      sourceVersion: options.sourceVersion || `training-${Date.now()}`
    };
  }

  function publicSeriesPdfId(scope, session = "") {
    return scope === "full" ? "full" : `session-${String(session || "").replace(/[^a-z0-9_-]+/gi, "-")}`;
  }

  function normalizeSessionList(sessions = []) {
    return [...new Set((sessions || []).map((session) => String(session || "").trim()).filter(Boolean))]
      .sort((a, b) => Number(a) - Number(b));
  }

  function sessionResultsPdfId(scope, sessions = []) {
    if (scope === "full") return "complete-results-full";
    const safeSessions = normalizeSessionList(sessions)
      .map((session) => String(session || "").replace(/[^a-z0-9_-]+/gi, "-"))
      .filter(Boolean);
    return `complete-results-${safeSessions.join("-") || "session"}`;
  }

  function sessionResultsPdfMatchesSession(pdf, session) {
    const cleanSession = String(session || "").trim();
    if (!cleanSession || pdf?.scope === "full") return false;
    const sessions = Array.isArray(pdf?.sessions) ? pdf.sessions.map(String) : [];
    return String(pdf?.session || "") === cleanSession || sessions.includes(cleanSession);
  }

  function splitRowsForSession(rows = [], session = "") {
    const cleanSession = String(session || "").trim();
    return rows.filter((row) => String(row?.session || "") === cleanSession);
  }

  function buildResetSeriesData(currentData, options = {}) {
    const now = options.now || new Date();
    const appendImportHistory = options.appendImportHistory || ((notes) => notes?.importHistory || []);
    return {
      ...currentData,
      meet: {},
      events: [],
      entrants: [],
      series: [],
      program: [],
      sourceVersion: options.sourceVersion || `series-reset-${Date.now()}`,
      notes: {
        ...(currentData?.notes || {}),
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
        generatedAt: now.toLocaleString("fr-FR"),
        importHistory: appendImportHistory(currentData?.notes || {}, "RAZ séries")
      }
    };
  }

  function resetSeriesViewState(targetState) {
    if (!targetState) return;
    targetState.eventId = "";
    targetState.sex = "F";
    targetState.series = "1";
    targetState.session = "1";
    targetState.programKey = "";
    targetState.category = "all";
    targetState.selectedSwimmerId = "";
    targetState.selectedRecordKey = "";
  }

  global.LivePalmesAdminMaintenance = {
    buildResetSeriesData,
    buildTrainingData,
    clearCompetitionCollections,
    deleteCollectionDocuments,
    normalizeSessionList,
    publicSeriesPdfId,
    resetSeriesViewState,
    sessionResultsPdfId,
    sessionResultsPdfMatchesSession,
    splitRowsForSession
  };
})(window);
