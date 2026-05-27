(function () {
  function init(context = {}) {
    with (context) {
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
        lastConsoleActivityAt = Date.now();
        saveLastActivityTimestamp(lastConsoleActivityAt);
      }
      
      async function returnHomeAfterLocalInactivity() {
        if (!shouldReturnHomeForInactivity() || profileHomeActive) return;
        saveCurrentRoleState();
        profileHomeActive = true;
        unlockedRoles = [];
        saveUnlockedRoles();
        await releaseRoleLock();
        await releaseConsolePresence();
        render();
        refreshPresenceCounts();
      }
      
      async function disableCompetitionModeAfterInactivity() {
        if (competitionAutoDisableRunning || !competitionModeEnabled()) return;
        if (state.role !== "computer" || profileHomeActive || document.visibilityState !== "visible") return;
        if (Date.now() - lastConsoleActivityAt < COMPETITION_INACTIVITY_MS) return;
        competitionAutoDisableRunning = true;
        try {
          await updateLiveNotes("Actualisation manuelle activée automatiquement après 1h d'inactivité", {
            competitionMode: false,
            competitionModeUpdatedAt: new Date().toISOString(),
            competitionModeAutoDisabledAt: new Date().toISOString()
          });
          initFirebaseSync();
          render();
        } finally {
          competitionAutoDisableRunning = false;
        }
      }
      
      function stopFirebaseRealtimeSync() {
        firestoreUnsubscribe?.();
        liveDataUnsubscribe?.();
        resultsUnsubscribe?.();
        firestoreUnsubscribe = null;
        liveDataUnsubscribe = null;
        resultsUnsubscribe = null;
      }
      
      function applyResultsSnapshot(snapshot) {
        const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        raceResults = rows.map(resultWithoutPdf);
        resultsSnapshotReady = true;
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
          firebaseStatus = "manual";
          refreshFirebaseOnce(false);
          renderDataStatus();
          return;
        }
        firestoreUnsubscribe = alertsCollection()
          .orderBy("createdAt", "desc")
          .onSnapshot((snapshot) => {
            firestoreReady = true;
            firebaseStatus = "connected";
            alerts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            saveAlerts();
            cleanupOrphanFinalResultAlerts();
            render();
          }, (error) => {
            console.warn("Lecture Firebase impossible", error);
            firebaseStatus = "error";
            renderDataStatus("Firebase n'est pas joignable. Les alertes restent locales sur cet appareil.");
          });
        liveDataUnsubscribe = liveDataDocument().onSnapshot((snapshot) => {
          if (!snapshot.exists) return;
          const remote = snapshot.data()?.data;
          firebaseStatus = "connected";
          if (!remote?.sourceVersion || remote.sourceVersion === data.sourceVersion) return;
          applyRemoteLiveData(remote);
          if (state.role === "computer") publishPublicResultsIndex({ silent: true });
        }, (error) => {
          console.warn("Lecture des données live Firebase impossible", error);
          firebaseStatus = "error";
          renderDataStatus();
        });
        resultsUnsubscribe = resultsCollection()
          .orderBy("updatedAt", "desc")
          .onSnapshot((snapshot) => {
            applyResultsSnapshot(snapshot);
            renderResultsAdminPanel();
          }, (error) => {
            console.warn("Lecture des résultats Firebase impossible", error);
          });
      }
      
      async function refreshFirebaseOnce(showMessage = true) {
        if (!firestoreDb) {
          firebaseStatus = "local";
          renderDataStatus("Firebase n'est pas chargé. Les données restent locales sur cet appareil.");
          return;
        }
        try {
          const [alertSnapshot, liveSnapshot, resultSnapshot] = await Promise.all([
            alertsCollection().orderBy("createdAt", "desc").get({ source: "server" }),
            liveDataDocument().get({ source: "server" }),
            resultsCollection().orderBy("updatedAt", "desc").get({ source: "server" })
          ]);
          firestoreReady = true;
          alerts = alertSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          saveAlerts();
          if (liveSnapshot.exists) {
            const remote = liveSnapshot.data()?.data;
            if (remote?.sourceVersion && remote.sourceVersion !== data.sourceVersion) {
              applyRemoteLiveData(remote);
            }
          }
          applyResultsSnapshot(resultSnapshot);
          firebaseStatus = "manual";
          render();
          if (showMessage && state.role === "computer") {
            renderDataStatus("Données Firebase actualisées. L'actualisation directe reste coupée tant que l'interrupteur est en manuel.");
          }
        } catch (error) {
          console.warn("Actualisation Firebase impossible", error);
          firebaseStatus = window.navigator.onLine ? "error" : "offline";
          renderDataStatus("Actualisation impossible. Vérifie la connexion ou les règles Firebase.");
        }
      }
      
      function initFirebaseSync() {
        if (!window.firebase?.initializeApp || !window.firebase?.firestore) {
          firebaseStatus = "local";
          renderDataStatus("Firebase n'est pas chargé. Les alertes restent locales sur cet appareil.");
          return;
        }
        try {
          if (!window.firebase.apps.length) {
            window.firebase.initializeApp(FIREBASE_CONFIG);
          }
          firestoreDb = window.firebase.firestore();
          startCompetitionSync();
        } catch (error) {
          console.warn("Initialisation Firebase impossible", error);
          firebaseStatus = "error";
          renderDataStatus("Firebase n'est pas configuré correctement. Les alertes restent locales sur cet appareil.");
        }
      }
      
      async function checkFirebaseConnection() {
        if (firebaseConnectionCheckRunning) return;
        if (!window.navigator.onLine) {
          firebaseStatus = "offline";
          renderDataStatus();
          return;
        }
        if (!realtimeSyncEnabled()) {
          firebaseStatus = firestoreDb ? "manual" : "local";
          renderDataStatus();
          return;
        }
        const doc = liveDataDocument();
        if (!doc) {
          firebaseStatus = "local";
          renderDataStatus();
          return;
        }
        firebaseConnectionCheckRunning = true;
        try {
          await doc.get({ source: "server" });
          firebaseStatus = "connected";
        } catch (error) {
          firebaseStatus = window.navigator.onLine ? "error" : "offline";
        } finally {
          firebaseConnectionCheckRunning = false;
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
  }

  window.LivePalmesRealtimeSync = { init };
}());
