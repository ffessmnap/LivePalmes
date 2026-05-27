(function () {
  function init(context = {}) {
    with (context) {
      async function fetchGeneratedData() {
        try {
          const response = await fetch(`donnees-speaker-france-2026.json?v=${Date.now()}`);
          if (response.ok) {
            const freshData = normalizeData(await response.json());
            if (freshData.sourceVersion) {
              renderDataStatus();
            }
            return freshData;
          }
        } catch {
          if (!data.sourceVersion) {
            renderDataStatus("Impossible de charger donnees-speaker-france-2026.json. Vérifie que le fichier est publié au même niveau que index.html.");
          }
          return null;
        }
        return null;
      }
      
      function applyFreshData(freshData, resetView = false) {
        data = normalizeData(freshData || sampleData);
        if (resetView) {
          const currentRole = state.role;
          roleStates = defaultRoleStates();
          state = cloneRoleState(roleStates[currentRole] || roleStates.speaker);
          state.role = currentRole;
          if (!isSpeakerView()) {
            state.series = firstSeriesSelectionForCurrentRace();
          }
        } else {
          if (!data.events.some((event) => event.id === state.eventId)) {
            state.eventId = data.events[0]?.id || "";
            state.programKey = "";
          }
          state.selectedSwimmerId = "";
        }
        saveData();
        render();
      }
      
      async function checkForGeneratedUpdates() {
        if (data.notes?.sourceMode === "series-live") {
          renderDataStatus();
          return;
        }
        const freshData = await fetchGeneratedData();
        if (!freshData?.sourceVersion) return;
        if (freshData.sourceVersion === data.sourceVersion) {
          renderDataStatus();
          return;
        }
        applyFreshData(freshData, false);
      }
      
      roleLockBtn?.addEventListener("click", toggleRoleLock);
      dataDiagnosticBtn?.addEventListener("click", () => {
        showDataDiagnostic().catch((error) => {
          console.error(error);
          window.alert(`Diagnostic impossible : ${error?.message || error}`);
        });
      });
      setInterval(checkForGeneratedUpdates, 5000);
      setInterval(heartbeatRoleLock, LOCK_HEARTBEAT_MS);
      setInterval(checkFirebaseConnection, FIREBASE_CONNECTION_CHECK_MS);
      setInterval(disableCompetitionModeAfterInactivity, COMPETITION_INACTIVITY_CHECK_MS);
      setInterval(updateConsolePresence, PRESENCE_HEARTBEAT_MS);
      setInterval(() => {
        if (profileHomeActive) refreshPresenceCounts();
      }, PRESENCE_HEARTBEAT_MS);
      ["click", "keydown", "touchstart", "pointerdown"].forEach((eventName) => {
        window.addEventListener(eventName, markConsoleActivity, { passive: true });
      });
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          returnHomeAfterLocalInactivity();
        }
      });
      window.addEventListener("online", checkFirebaseConnection);
      window.addEventListener("offline", () => {
        firebaseStatus = "offline";
        renderDataStatus();
      });
      window.addEventListener("resize", updateStickyAlertOffset);
      window.addEventListener("pagehide", () => {
        saveCurrentRoleState();
        releaseRoleLock();
        releaseConsolePresence();
      });
      
      jsonInput?.addEventListener("change", async () => {
        const file = jsonInput.files[0];
        if (!file) return;
        const text = await file.text();
        data = normalizeData(JSON.parse(text));
        state.eventId = data.events[0]?.id || sampleData.events[0].id;
        state.series = "all";
        saveData();
        render();
        jsonInput.value = "";
      });
      
      document.querySelector("#importCsvBtn")?.addEventListener("click", () => {
        const imported = parseCsv(csvInput.value);
        if (!imported.length) return;
        data.entrants = data.entrants.concat(imported);
        csvInput.value = "";
        saveData();
        render();
      });
      
      initializeUiEvents();
      render();
      initFirebaseSync();
      checkForGeneratedUpdates();
      checkFirebaseConnection();
      updateConsolePresence(true);
      if (profileHomeActive) refreshPresenceCounts();

      return {
        fetchGeneratedData,
        applyFreshData,
        checkForGeneratedUpdates
      };
    }
  }

  window.LivePalmesAppLifecycle = { init };
})();
