(function () {
  function init(context = {}) {
    const {
      checkFirebaseConnection,
      cloneRoleState,
      COMPETITION_INACTIVITY_CHECK_MS,
      csvInput,
      dataDiagnosticBtn,
      defaultRoleStates,
      disableCompetitionModeAfterInactivity,
      document,
      fetch,
      FIREBASE_CONNECTION_CHECK_MS,
      firstSeriesSelectionForCurrentRace,
      heartbeatRoleLock,
      initializeUiEvents,
      initFirebaseSync,
      isSpeakerView,
      jsonInput,
      LOCK_HEARTBEAT_MS,
      markConsoleActivity,
      normalizeData,
      parseCsv,
      PRESENCE_HEARTBEAT_MS,
      refreshPresenceCounts,
      releaseConsolePresence,
      releaseRoleLock,
      render,
      renderDataStatus,
      returnHomeAfterLocalInactivity,
      roleLockBtn,
      sampleData,
      saveCurrentRoleState,
      saveData,
      showDataDiagnostic,
      setInterval,
      toggleRoleLock,
      updateConsolePresence,
      updateStickyAlertOffset,
      window
    } = context;
    const getData = () => context.data || {};
    const setData = (value) => { context.data = value; };
    const getRoleStates = () => context.roleStates || {};
    const setRoleStates = (value) => { context.roleStates = value; };
    const getState = () => context.state || {};
    const setState = (value) => { context.state = value; };

    function hasCompetitionRows(value = {}) {
      return Boolean(
        value.program?.length ||
        value.series?.length ||
        value.entrants?.length
      );
    }

    function isEmptyRescueData(value = {}) {
      return value.notes?.sourceMode === "empty-rescue" ||
        /comp[Ãé]tition\s+[Ãà]?\s*charger/i.test(String(value.meet?.name || ""));
    }

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
        if (!getData().sourceVersion) {
          renderDataStatus("Impossible de charger donnees-speaker-france-2026.json. V\u00e9rifie que le fichier est publi\u00e9 au m\u00eame niveau que index.html.");
        }
        return null;
      }
      return null;
    }

    function applyFreshData(freshData, resetView = false) {
      const nextData = normalizeData(freshData || sampleData);
      const currentData = getData();
      if (hasCompetitionRows(currentData) && !hasCompetitionRows(nextData) && isEmptyRescueData(nextData)) {
        renderDataStatus();
        return;
      }
      setData(nextData);
      const data = getData();
      const state = getState();
      if (resetView) {
        const currentRole = state.role;
        setRoleStates(defaultRoleStates());
        const nextState = cloneRoleState(getRoleStates()[currentRole] || getRoleStates().speaker);
        nextState.role = currentRole;
        setState(nextState);
        if (!isSpeakerView()) {
          getState().series = firstSeriesSelectionForCurrentRace();
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
      const data = getData();
      if (data.notes?.sourceMode === "series-live" || hasCompetitionRows(data)) {
        renderDataStatus();
        return;
      }
      const freshData = await fetchGeneratedData();
      if (!freshData?.sourceVersion) return;
      if (!hasCompetitionRows(freshData) && isEmptyRescueData(freshData) && hasCompetitionRows(getData())) {
        renderDataStatus();
        return;
      }
      if (freshData.sourceVersion === getData().sourceVersion) {
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
      if (context.profileHomeActive) refreshPresenceCounts();
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
      context.firebaseStatus = "offline";
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
      setData(normalizeData(JSON.parse(text)));
      const data = getData();
      const state = getState();
      state.eventId = data.events[0]?.id || sampleData.events[0].id;
      state.series = "all";
      saveData();
      render();
      jsonInput.value = "";
    });

    document.querySelector("#importCsvBtn")?.addEventListener("click", () => {
      const imported = parseCsv(csvInput.value);
      if (!imported.length) return;
      getData().entrants = getData().entrants.concat(imported);
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
    if (context.profileHomeActive) refreshPresenceCounts();

    return {
      fetchGeneratedData,
      applyFreshData,
      checkForGeneratedUpdates
    };
  }

  window.LivePalmesAppLifecycle = { init };
})();
