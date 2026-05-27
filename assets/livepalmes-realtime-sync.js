(function () {
  function init(context = {}) {
    const {
      COMPETITION_INACTIVITY_MS,
      FIREBASE_CONFIG,
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
      
      function applyResultsSnapshot(snapshot) {
        const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        context.raceResults = rows.map(resultWithoutPdf);
        context.resultsSnapshotReady = true;
        cleanupOrphanFinalResultAlerts();
        cleanupResolvedSpeakerResultAlerts();
        ensurePendingFinalistsSpeakerAlerts();
        ensurePendingReplacementSpeakerAlerts();
        migrateResultPdfsOutOfResults(rows).catch((error) => {
          console.warn("Migration des PDF résultats impossible", error);
        });
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
            cleanupOrphanFinalResultAlerts();
            render();
          }, (error) => {
            console.warn("Lecture Firebase impossible", error);
            context.firebaseStatus = "error";
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
          console.warn("Lecture des données live Firebase impossible", error);
          context.firebaseStatus = "error";
          renderDataStatus();
        });
        context.resultsUnsubscribe = resultsCollection()
          .orderBy("updatedAt", "desc")
          .onSnapshot((snapshot) => {
            applyResultsSnapshot(snapshot);
            renderResultsAdminPanel();
          }, (error) => {
            console.warn("Lecture des résultats Firebase impossible", error);
          });
      }
      
      async function refreshFirebaseOnce(showMessage = true) {
        if (!context.firestoreDb) {
          context.firebaseStatus = "local";
          renderDataStatus("Firebase n'est pas chargé. Les données restent locales sur cet appareil.");
          return;
        }
        try {
          const [alertSnapshot, liveSnapshot, resultSnapshot] = await Promise.all([
            alertsCollection().orderBy("createdAt", "desc").get({ source: "server" }),
            liveDataDocument().get({ source: "server" }),
            resultsCollection().orderBy("updatedAt", "desc").get({ source: "server" })
          ]);
          context.firestoreReady = true;
          context.alerts = alertSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          saveAlerts();
          if (liveSnapshot.exists) {
            const remote = liveSnapshot.data()?.data;
            if (remote?.sourceVersion && remote.sourceVersion !== context.data?.sourceVersion) {
              applyRemoteLiveData(remote);
            }
          }
          applyResultsSnapshot(resultSnapshot);
          context.firebaseStatus = "manual";
          render();
          if (showMessage && context.state?.role === "computer") {
            renderDataStatus("Données Firebase actualisées. L'actualisation directe reste coupée tant que l'interrupteur est en manuel.");
          }
        } catch (error) {
          console.warn("Actualisation Firebase impossible", error);
          context.firebaseStatus = window.navigator.onLine ? "error" : "offline";
          renderDataStatus("Actualisation impossible. Vérifie la connexion ou les règles Firebase.");
        }
      }
      
      function initFirebaseSync() {
        if (!window.firebase?.initializeApp || !window.firebase?.firestore) {
          context.firebaseStatus = "local";
          renderDataStatus("Firebase n'est pas chargé. Les alertes restent locales sur cet appareil.");
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
          context.firebaseStatus = "error";
          renderDataStatus("Firebase n'est pas configuré correctement. Les alertes restent locales sur cet appareil.");
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
