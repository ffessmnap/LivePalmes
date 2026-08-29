(function () {
  function init(context = {}) {
    const {
      LIVE_DISMISSED_ALERTS_KEY,
      FIREBASE_CONFIG,
      FIRESTORE_COMPETITION_ID,
      buildPublicResultsIndex,
      clearFirestoreAlerts,
      dsqReportRows,
      ensureComputerWriteAccess,
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

    function publicArchiveSummary(archive = {}) {
      return {
        id: String(archive.id || ""),
        createdAt: String(archive.createdAt || ""),
        createdLabel: String(archive.createdLabel || ""),
        publicArchive: true,
        meet: archive.meet || {},
        count: Number(archive.count || 0),
        raceCount: Number(archive.raceCount || 0),
        extras: Array.isArray(archive.extras) ? archive.extras : []
      };
    }

    async function nextPublicArchivesIndex(collection, archive, updatedAt) {
      const indexRef = collection?.parent?.collection("public")?.doc("archivesIndex");
      if (!indexRef) return null;
      const indexSnapshot = await indexRef.get().catch(() => null);
      let archives = indexSnapshot?.exists && Array.isArray(indexSnapshot.data()?.archives)
        ? indexSnapshot.data().archives
        : [];
      if (!indexSnapshot?.exists) {
        const legacySnapshot = await collection.orderBy("createdAt", "desc").limit(50).get().catch(() => null);
        archives = (legacySnapshot?.docs || [])
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((item) => item.publicArchive === true || item.reason === "Archive publique de la compétition")
          .map(publicArchiveSummary);
      }
      const nextArchive = publicArchiveSummary(archive);
      const nextArchives = [nextArchive, ...archives.filter((item) => item?.id !== nextArchive.id)]
        .sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")))
        .slice(0, 50);
      return {
        ref: indexRef,
        payload: {
          id: "archivesIndex",
          archives: nextArchives,
          updatedAt
        }
      };
    }

    function archiveRaceKeyFromParts(eventId, sex) {
      return `${eventId || ""}|${sex || ""}`;
    }

    function archiveRaceDocId(key) {
      const clean = String(key || "")
        .trim()
        .replace(/[^a-z0-9_-]+/gi, "-")
        .replace(/^-+|-+$/g, "");
      return clean || `race-${Math.random().toString(16).slice(2)}`;
    }

    function raceKeyFromProgramRow(row = {}) {
      return archiveRaceKeyFromParts(row.eventId, row.sex);
    }

    function raceKeyFromResult(result = {}) {
      return String(result.raceKey || archiveRaceKeyFromParts(result.eventId, result.sex) || "");
    }

    function buildArchiveRacePayloads(rows = []) {
      const data = getData();
      const program = Array.isArray(data.program) ? data.program : [];
      const series = Array.isArray(data.series) ? data.series : [];
      const raceKeys = new Set();
      program.forEach((row) => {
        const key = raceKeyFromProgramRow(row);
        if (key.trim()) raceKeys.add(key);
      });
      rows.forEach((result) => {
        const key = raceKeyFromResult(result);
        if (key.trim()) raceKeys.add(key);
      });
      return [...raceKeys].map((key) => {
        const [eventId, sex] = key.split("|");
        const programRows = program
          .filter((row) => raceKeyFromProgramRow(row) === key)
          .sort((a, b) => Number(a.session || 0) - Number(b.session || 0) || Number(a.order || 9999) - Number(b.order || 9999));
        const seriesRows = series
          .filter((row) => row.eventId === eventId && row.sex === sex)
          .sort((a, b) => Number(a.series || 0) - Number(b.series || 0) || Number(a.lane || 0) - Number(b.lane || 0));
        const results = rows
          .filter((result) => raceKeyFromResult(result) === key)
          .sort((a, b) => Number(a.session || 0) - Number(b.session || 0) || String(a.stage || "").localeCompare(String(b.stage || "")));
        const representative = programRows[0] || results[0] || {};
        const latestUpdatedAt = results
          .map((result) => result.updatedAt)
          .filter(Boolean)
          .sort()
          .at(-1) || "";
        return {
          id: archiveRaceDocId(key),
          raceKey: key,
          eventId: eventId || representative.eventId || "",
          sex: sex || representative.sex || "",
          label: representative.label || representative.eventLabel || "",
          session: representative.session || results[0]?.session || "",
          order: Number(representative.order || 9999),
          resultCount: results.length,
          latestUpdatedAt,
          programRows,
          seriesRows,
          results
        };
      }).filter((race) => race.raceKey.trim());
    }

    function buildArchiveIndex(races = [], updatedAt = new Date().toISOString()) {
      const data = getData();
      const raceSummaries = races
        .map((race) => ({
          id: race.id,
          raceKey: race.raceKey,
          eventId: race.eventId,
          sex: race.sex,
          label: race.label,
          session: race.session,
          order: race.order,
          resultCount: race.resultCount,
          latestUpdatedAt: race.latestUpdatedAt
        }))
        .sort((a, b) => Number(a.order || 9999) - Number(b.order || 9999));
      return {
        meet: data.meet || {},
        events: data.events || [],
        program: Array.isArray(data.program) ? data.program : [],
        raceSummaries,
        seriesPdfs: data.notes?.publicSeriesPdfs || [],
        sessionResultsPdfs: data.notes?.publicSessionResultsPdfs || [],
        sessionInfos: data.notes?.publicSessionInfos || {},
        publicAccess: {
          online: true,
          updatedAt: data.notes?.livePublishedAt || updatedAt
        },
        updatedAt,
        sourceVersion: data.sourceVersion || "",
        sourceLabel: data.notes?.sourceLabel || "",
        lastUpdatedSession: data.notes?.lastUpdatedSession || ""
      };
    }

    function buildArchiveExtras(rows = []) {
      const data = getData();
      const extras = {};
      const tdh = browserWindow.LivePalmesDamienHebertTrophy;
      if (tdh && typeof tdh.buildSnapshot === "function") {
        const snapshot = tdh.buildSnapshot(rows);
        const count = Number(snapshot?.rankings?.all?.length || 0);
        if (count > 0) {
          extras.tdh = {
            ...snapshot,
            id: "tdh",
            title: "Trophée Damien Hébert",
            count
          };
        }
      }
      const medals = browserWindow.LivePalmesPublicMedalsCore;
      if (medals && typeof medals.buildSnapshot === "function") {
        const snapshot = medals.buildSnapshot(rows, {
          events: data.events || [],
          entrants: data.entrants || []
        });
        const count = Number(snapshot?.rows?.length || 0);
        if (count > 0) {
          extras.medals = {
            ...snapshot,
            id: "medals",
            title: "Tableau des médailles",
            count
          };
        }
      }
      return extras;
    }

    async function archiveCurrentHistory() {
      const rows = dsqReportRows();
      if (!rows.length) return null;
      if (typeof ensureComputerWriteAccess === "function") {
        const ready = await ensureComputerWriteAccess();
        if (!ready) throw new Error("Connexion Firebase computer requise pour archiver le journal.");
      }
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

    async function archiveCurrentResults(reason = "Archivage des r\u00e9sultats publics", sourceResults = getRaceResults(), options = {}) {
      const sourceRows = Array.isArray(sourceResults) ? sourceResults : [];
      const rows = sourceRows.map(resultWithoutPdf);
      if (!rows.length) return null;
      const db = ensureFirestoreDb();
      const collection = collectionOrFallback(resultArchivesCollection, "resultArchives");
      if (!collection || !db) throw new Error("Firebase n'est pas disponible pour archiver les r\u00e9sultats.");
      const now = new Date();
      const racePayloads = buildArchiveRacePayloads(rows);
      const archiveIndex = buildArchiveIndex(racePayloads, now.toISOString());
      const archiveExtras = buildArchiveExtras(rows);
      const archive = {
        id: `${now.getTime()}-${Math.random().toString(16).slice(2)}`,
        archiveVersion: 2,
        createdAt: now.toISOString(),
        createdLabel: now.toLocaleString("fr-FR"),
        reason,
        publicArchive: options.publicArchive === true,
        meet: getData().meet || {},
        count: rows.length,
        raceCount: racePayloads.length,
        extras: Object.keys(archiveExtras),
        archiveIndex: sanitizeAlertForFirestore(archiveIndex),
        publicIndex: sanitizeAlertForFirestore(archiveIndex)
      };
      const archiveRef = collection.doc(archive.id);
      const archivesIndexUpdate = archive.publicArchive
        ? await nextPublicArchivesIndex(collection, archive, archive.createdAt)
        : null;
      const batch = db.batch();
      batch.set(archiveRef, sanitizeAlertForFirestore(archive));
      if (archivesIndexUpdate) {
        batch.set(archivesIndexUpdate.ref, sanitizeAlertForFirestore(archivesIndexUpdate.payload));
      }
      racePayloads.forEach((race) => {
        batch.set(archiveRef.collection("races").doc(race.id), sanitizeAlertForFirestore(race));
      });
      Object.entries(archiveExtras).forEach(([id, extra]) => {
        batch.set(archiveRef.collection("extras").doc(id), sanitizeAlertForFirestore(extra));
      });
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
