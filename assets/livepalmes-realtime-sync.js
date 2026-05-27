(function () {
  function init(context = {}) {
    const {
      COMPETITION_INACTIVITY_MS,
      FIREBASE_CONFIG,
      activeCompetitionId = "livepalmes-active",
      alertsCollection,
      applyRemoteLiveData,
      cleanupOrphanFinalResultAlerts,
      cleanupResolvedSpeakerResultAlerts,
      competitionModeEnabled,
      ensurePendingFinalistsSpeakerAlerts,
      ensurePendingReplacementSpeakerAlerts,
      liveDataDocument,
      migrateResultPdfsOutOfResults,
      publishPublicResultsIndex,
      realtimeSyncEnabled,
      refreshPresenceCounts,
      releaseConsolePresence,
      releaseRoleLock,
      render,
      renderDataStatus,
      renderResultsAdminPanel,
      resultsCollection,
      resultWithoutPdf,
      saveAlerts,
      saveCurrentRoleState,
      saveLastActivityTimestamp,
      saveUnlockedRoles,
      shouldReturnHomeForInactivity,
      updateLiveNotes,
      window = globalThis.window
    } = context;

      async function endCompetitionSession() {
        if (!competitionModeEnabled()) return;
        await updateLiveNotes("Actualisation manuelle activée", {
          competitionMode: false,
          competitionModeUpdatedAt: new Date().toISOString(),
          competitionModeEndedAt: new Date().toISOString()
        });
        initFirebaseSync();
        render();
      }

      function markConsoleActivity() {
        context.lastConsoleActivityAt = Date.now();
        saveLastActivityTimestamp(context.lastConsoleActivityAt);
      }

      async function returnHomeAfterLocalInactivity() {
        if (!shouldReturnHomeForInactivity() || context.profileHomeActive) return;
        saveCurrentRoleState();
        context.profileHomeActive = true;
        context.unlockedRoles = [];
        saveUnlockedRoles();
        await releaseRoleLock();
        await releaseConsolePresence();
        render();
        refreshPresenceCounts();
      }

      async function disableCompetitionModeAfterInactivity() {
        if (context.competitionAutoDisableRunning || !competitionModeEnabled()) return;
        if (context.state?.role !== "computer" || context.profileHomeActive || document.visibilityState !== "visible") return;
        if (Date.now() - context.lastConsoleActivityAt < COMPETITION_INACTIVITY_MS) return;
        context.competitionAutoDisableRunning = true;
        try {
          await updateLiveNotes("Actualisation manuelle activée automatiquement après 1h d'inactivité", {
            competitionMode: false,
            competitionModeUpdatedAt: new Date().toISOString(),
            competitionModeAutoDisabledAt: new Date().toISOString()
          });
          initFirebaseSync();
          render();
        } finally {
          context.competitionAutoDisableRunning = false;
        }
      }

      function stopFirebaseRealtimeSync() {
        context.firestoreUnsubscribe?.();
        context.liveDataUnsubscribe?.();
        context.resultsUnsubscribe?.();
        context.firestoreUnsubscribe = null;
        context.liveDataUnsubscribe = null;
        context.resultsUnsubscribe = null;
      }

      function applyResultsRows(rows = []) {
        context.raceResults = rows.map(resultWithoutPdf);
        context.resultsSnapshotReady = true;
        cleanupOrphanFinalResultAlerts();
        cleanupResolvedSpeakerResultAlerts();
        ensurePendingFinalistsSpeakerAlerts();
        ensurePendingReplacementSpeakerAlerts();
        migrateResultPdfsOutOfResults(rows).catch((error) => {
          console.warn("Migration des PDF resultats impossible", error);
        });
      }

      function applyResultsSnapshot(snapshot) {
        applyResultsRows(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      }

      function firestoreRestValueToJs(value = {}) {
        if (Object.prototype.hasOwnProperty.call(value, "stringValue")) return value.stringValue;
        if (Object.prototype.hasOwnProperty.call(value, "integerValue")) return Number(value.integerValue);
        if (Object.prototype.hasOwnProperty.call(value, "doubleValue")) return Number(value.doubleValue);
        if (Object.prototype.hasOwnProperty.call(value, "booleanValue")) return Boolean(value.booleanValue);
        if (Object.prototype.hasOwnProperty.call(value, "timestampValue")) return value.timestampValue;
        if (Object.prototype.hasOwnProperty.call(value, "nullValue")) return null;
        if (value.arrayValue) return (value.arrayValue.values || []).map(firestoreRestValueToJs);
        if (value.mapValue) return firestoreRestFieldsToJs(value.mapValue.fields || {});
        return "";
      }

      function firestoreRestFieldsToJs(fields = {}) {
        return Object.fromEntries(
          Object.entries(fields).map(([key, value]) => [key, firestoreRestValueToJs(value)])
        );
      }

      function firestoreRestDocToJs(document = {}) {
        const id = String(document.name || "").split("/").pop() || "";
        return { id, ...firestoreRestFieldsToJs(document.fields || {}) };
      }

      async function fetchFirestoreRestCollection(collectionName, pageSize = 300) {
        const projectId = FIREBASE_CONFIG?.projectId;
        if (!projectId || !window.fetch) return null;
        const baseUrl = "https://firestore.googleapis.com/v1/projects/" + encodeURIComponent(projectId) + "/databases/(default)/documents/competitions/" + encodeURIComponent(activeCompetitionId || "livepalmes-active") + "/" + encodeURIComponent(collectionName) + "?pageSize=" + encodeURIComponent(pageSize);
        const documents = [];
        let pageToken = "";
        do {
          const url = baseUrl + (pageToken ? "&pageToken=" + encodeURIComponent(pageToken) : "");
          const response = await window.fetch(url, { cache: "no-store" });
          if (!response.ok) throw new Error("Firestore REST " + response.status);
          const payload = await response.json();
          documents.push(...(payload.documents || []));
          pageToken = payload.nextPageToken || "";
        } while (pageToken);
        return documents.map(firestoreRestDocToJs);
      }

      async function fetchFirestoreRestDocument(collectionName, documentId) {
        const projectId = FIREBASE_CONFIG?.projectId;
        if (!projectId || !window.fetch) return null;
        const url = "https://firestore.googleapis.com/v1/projects/" + encodeURIComponent(projectId) + "/databases/(default)/documents/competitions/" + encodeURIComponent(activeCompetitionId || "livepalmes-active") + "/" + encodeURIComponent(collectionName) + "/" + encodeURIComponent(documentId);
        const response = await window.fetch(url, { cache: "no-store" });
        if (response.status === 404) return null;
        if (!response.ok) throw new Error("Firestore REST " + response.status);
        return firestoreRestDocToJs(await response.json());
      }

      async function fetchAlertsWithRestFallback() {
        const rows = await fetchFirestoreRestCollection("alerts", 300);
        return rows?.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))) || rows;
      }

      async function fetchResultsWithRestFallback() {
        const rows = await fetchFirestoreRestCollection("results", 100);
        return rows?.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))) || rows;
      }

      async function fetchLiveDataWithRestFallback() {
        return fetchFirestoreRestDocument("liveData", "current");
      }

      async function applyAlertsRestFallback(showMessage = false) {
        const rows = await fetchAlertsWithRestFallback();
        if (!rows) return false;
        context.alerts = rows;
        saveAlerts();
        context.firebaseStatus = "manual";
        render();
        if (showMessage && context.state?.role === "computer") {
          renderDataStatus("Journaux relus depuis Firebase. L'actualisation directe reste coupee tant que l'interrupteur est en manuel.");
        }
        return true;
      }

      async function refreshFirebaseFromRest(showMessage = false) {
        const [alertsResult, liveResult, resultsResult] = await Promise.allSettled([
          fetchAlertsWithRestFallback(),
          fetchLiveDataWithRestFallback(),
          fetchResultsWithRestFallback()
        ]);
        let hasFreshData = false;
        if (alertsResult.status === "fulfilled" && alertsResult.value) {
          context.alerts = alertsResult.value;
          saveAlerts();
          hasFreshData = true;
        }
        if (liveResult.status === "fulfilled" && liveResult.value?.data) {
          const remote = liveResult.value.data;
          if (remote?.sourceVersion && remote.sourceVersion !== context.data?.sourceVersion) {
            applyRemoteLiveData(remote);
          }
          hasFreshData = true;
        }
        if (resultsResult.status === "fulfilled" && resultsResult.value) {
          applyResultsRows(resultsResult.value);
          hasFreshData = true;
        }
        [alertsResult, liveResult, resultsResult]
          .filter((result) => result.status === "rejected")
          .forEach((result) => console.warn("Lecture REST Firebase impossible", result.reason));
        if (!hasFreshData) return false;
        context.firebaseStatus = "manual";
        render();
        if (showMessage && context.state?.role === "computer") {
          renderDataStatus("Donnees Firebase relues. L'actualisation directe reste coupee tant que l'interrupteur est en manuel.");
        }
        return true;
      }

      function startCompetitionSync() {
        stopFirebaseRealtimeSync();
        if (!realtimeSyncEnabled()) {
          context.firebaseStatus = "manual";
          refreshFirebaseOnce(false);
          renderDataStatus();
          return;
        }
        context.firestoreUnsubscribe = alertsCollection()
          .orderBy("createdAt", "desc")
          .onSnapshot((snapshot) => {
            context.firestoreReady = true;
            context.firebaseStatus = "connected";
            context.alerts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            saveAlerts();
            if (!context.alerts.length) {
              fetchAlertsWithRestFallback().then((rows) => {
                if (!rows?.length) return;
                context.alerts = rows;
                saveAlerts();
                render();
              }).catch((error) => {
                console.warn("Lecture REST Firebase impossible", error);
              });
            }
            cleanupOrphanFinalResultAlerts();
            render();
          }, (error) => {
            console.warn("Lecture Firebase impossible", error);
            context.firebaseStatus = "error";
            refreshFirebaseFromRest(false).catch((fallbackError) => {
              console.warn("Lecture REST Firebase impossible", fallbackError);
            });
            renderDataStatus("Firebase n'est pas joignable. Les alertes restent locales sur cet appareil.");
          });
        context.liveDataUnsubscribe = liveDataDocument().onSnapshot((snapshot) => {
          if (!snapshot.exists) return;
          const remote = snapshot.data()?.data;
          context.firebaseStatus = "connected";
          if (!remote?.sourceVersion || remote.sourceVersion === context.data?.sourceVersion) return;
          applyRemoteLiveData(remote);
          if (context.state?.role === "computer") publishPublicResultsIndex({ silent: true });
        }, (error) => {
          console.warn("Lecture des donnees live Firebase impossible", error);
          context.firebaseStatus = "error";
          refreshFirebaseFromRest(false).catch((fallbackError) => {
            console.warn("Lecture REST Firebase impossible", fallbackError);
          });
          renderDataStatus();
        });
        context.resultsUnsubscribe = resultsCollection()
          .orderBy("updatedAt", "desc")
          .onSnapshot((snapshot) => {
            applyResultsSnapshot(snapshot);
            renderResultsAdminPanel();
          }, (error) => {
            console.warn("Lecture des resultats Firebase impossible", error);
            fetchResultsWithRestFallback().then((rows) => {
              if (!rows) return;
              applyResultsRows(rows);
              renderResultsAdminPanel();
            }).catch((fallbackError) => {
              console.warn("Lecture REST des resultats impossible", fallbackError);
            });
          });
      }

      async function refreshFirebaseOnce(showMessage = true) {
        if (!context.firestoreDb) {
          try {
            if (await refreshFirebaseFromRest(showMessage)) return;
          } catch (error) {
            console.warn("Lecture REST Firebase impossible", error);
          }
          context.firebaseStatus = "local";
          renderDataStatus("Firebase n'est pas charge. Les donnees restent locales sur cet appareil.");
          return;
        }
        const [alertResult, liveResult, resultResult] = await Promise.allSettled([
          alertsCollection().orderBy("createdAt", "desc").get({ source: "server" }),
          liveDataDocument().get({ source: "server" }),
          resultsCollection().orderBy("updatedAt", "desc").get({ source: "server" })
        ]);
        let hasFreshData = false;
        if (alertResult.status === "fulfilled") {
          context.firestoreReady = true;
          const loadedAlerts = alertResult.value.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          context.alerts = loadedAlerts;
          if (!loadedAlerts.length) {
            const fallbackAlerts = await fetchAlertsWithRestFallback();
            if (fallbackAlerts?.length) context.alerts = fallbackAlerts;
          }
          saveAlerts();
          hasFreshData = true;
        } else {
          console.warn("Actualisation des alertes Firebase impossible", alertResult.reason);
          const fallbackAlerts = await fetchAlertsWithRestFallback();
          if (fallbackAlerts) {
            context.alerts = fallbackAlerts;
            saveAlerts();
            hasFreshData = true;
          }
        }
        if (liveResult.status === "fulfilled") {
          context.firestoreReady = true;
          if (liveResult.value.exists) {
            const remote = liveResult.value.data()?.data;
            if (remote?.sourceVersion && remote.sourceVersion !== context.data?.sourceVersion) {
              applyRemoteLiveData(remote);
            }
          }
          hasFreshData = true;
        } else {
          console.warn("Actualisation des donnees live Firebase impossible", liveResult.reason);
          const liveRest = await fetchLiveDataWithRestFallback();
          if (liveRest?.data) {
            const remote = liveRest.data;
            if (remote?.sourceVersion && remote.sourceVersion !== context.data?.sourceVersion) {
              applyRemoteLiveData(remote);
            }
            hasFreshData = true;
          }
        }
        if (resultResult.status === "fulfilled") {
          context.firestoreReady = true;
          applyResultsSnapshot(resultResult.value);
          hasFreshData = true;
        } else {
          console.warn("Actualisation des resultats Firebase impossible", resultResult.reason);
          const fallbackResults = await fetchResultsWithRestFallback();
          if (fallbackResults) {
            applyResultsRows(fallbackResults);
            hasFreshData = true;
          }
        }
        if (hasFreshData) {
          context.firebaseStatus = "manual";
          render();
          if (showMessage && context.state?.role === "computer") {
            renderDataStatus("Donnees Firebase actualisees. L'actualisation directe reste coupee tant que l'interrupteur est en manuel.");
          }
          return;
        }
        context.firebaseStatus = window.navigator.onLine ? "error" : "offline";
        renderDataStatus("Actualisation impossible. Verifie la connexion ou les regles Firebase.");
      }

      function initFirebaseSync() {
        if (!window.firebase?.initializeApp || !window.firebase?.firestore) {
          refreshFirebaseFromRest(false).catch((error) => {
            console.warn("Lecture REST Firebase impossible", error);
          });
          context.firebaseStatus = "local";
          renderDataStatus("Firebase n'est pas charge. Les donnees restent locales sur cet appareil.");
          return;
        }
        try {
          if (!window.firebase.apps.length) {
            window.firebase.initializeApp(FIREBASE_CONFIG);
          }
          context.firestoreDb = window.firebase.firestore();
          startCompetitionSync();
        } catch (error) {
          console.warn("Initialisation Firebase impossible", error);
          refreshFirebaseFromRest(false).catch((fallbackError) => {
            console.warn("Lecture REST Firebase impossible", fallbackError);
          });
          context.firebaseStatus = "error";
          renderDataStatus("Firebase n'est pas configure correctement. Les donnees restent locales sur cet appareil.");
        }
      }

      async function checkFirebaseConnection() {
        if (context.firebaseConnectionCheckRunning) return;
        if (!window.navigator.onLine) {
          context.firebaseStatus = "offline";
          renderDataStatus();
          return;
        }
        if (!realtimeSyncEnabled()) {
          context.firebaseStatus = context.firestoreDb ? "manual" : "local";
          renderDataStatus();
          return;
        }
        const doc = liveDataDocument();
        if (!doc) {
          context.firebaseStatus = "local";
          renderDataStatus();
          return;
        }
        context.firebaseConnectionCheckRunning = true;
        try {
          await doc.get({ source: "server" });
          context.firebaseStatus = "connected";
        } catch (error) {
          context.firebaseStatus = window.navigator.onLine ? "error" : "offline";
        } finally {
          context.firebaseConnectionCheckRunning = false;
          renderDataStatus();
        }
      }

      return {
        endCompetitionSession,
        markConsoleActivity,
        returnHomeAfterLocalInactivity,
        disableCompetitionModeAfterInactivity,
        stopFirebaseRealtimeSync,
        applyResultsSnapshot,
        startCompetitionSync,
        refreshFirebaseOnce,
        initFirebaseSync,
        checkFirebaseConnection
      };
  }

  window.LivePalmesRealtimeSync = { init };
}());
