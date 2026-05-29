(function () {
  function init(context = {}) {
    const {
      ROLE_LABELS,
      acquireRoleLock,
      adminSeriesBtn,
      archivesBtn,
      applyProgramRow,
      askRolePin,
      clearSearch,
      closeProgramModal,
      competitionModeTopBtn,
      entrantsSubtitle,
      eventSelect,
      finalProgramRowsForRace,
      firstSeriesSelectionForCurrentRace,
      headerRefDetails,
      headerRefs,
      isFinalStage,
      manualRefreshBtn,
      openAdminSeriesModal,
      openProgramModal,
      profileHome,
      profileHomeBtn,
      programBtn,
      programKey,
      programModal,
      programRowFromRaceOption,
      programRows,
      publicPositionToggle,
      refereeProgressBtn,
      refreshFirebaseOnce,
      refreshPresenceCounts,
      releaseConsolePresence,
      render,
      renderEntrants,
      renderHeaderReferences,
      renderHistoryArchivesModal,
      requestRoleAccess,
      saveActiveView,
      saveUnlockedRoles,
      seriesControls,
      sessionControls,
      setPublicPositionEnabled,
      setRefereeProgressHere,
      switchRoleUnlocked,
      toggleCompetitionMode,
      updateConsolePresence
    } = context;
    const data = new Proxy({}, {
      get: (_, prop) => context.data?.[prop],
      set: (_, prop, value) => {
        const nextData = context.data || {};
        nextData[prop] = value;
        context.data = nextData;
        return true;
      }
    });
    const state = new Proxy({}, {
      get: (_, prop) => context.state?.[prop],
      set: (_, prop, value) => {
        const nextState = context.state || {};
        nextState[prop] = value;
        context.state = nextState;
        return true;
      }
    });
    const dedicatedRole = window.LivePalmesDedicatedRole || "";
    const dedicatedPageByRole = {
      live: "live.html",
      speaker: "speaker.html",
      referee: "ja.html",
      video: "video.html",
      computer: "bureau-perf.html",
      secretary: "secretariat.html"
    };

    function navigateToDedicatedPage(role) {
      const targetPage = dedicatedPageByRole[role];
      if (!targetPage) return false;
      window.location.href = targetPage;
      return true;
    }

    function navigateToMainHome() {
      context.profileHomeActive = true;
      saveActiveView?.();
      releaseConsolePresence?.();
      window.location.href = "pilotage-livepalmes.html";
    }

    async function navigateToDedicatedConsole(role) {
      const targetPage = dedicatedPageByRole[role];
      if (!targetPage) return false;
      if (!requestRoleAccess(role)) {
        const access = await askRolePin(role);
        if (!access?.allowed) return true;
      }
      context.profileHomeActive = false;
      switchRoleUnlocked(role);
      saveActiveView?.();
      window.location.href = targetPage;
      return true;
    }

      eventSelect.addEventListener("change", () => {
        const row = programRowFromRaceOption(eventSelect.value);
        if (row.eventId) state.eventId = row.eventId;
        if (row.sex) state.sex = row.sex;
        state.programKey = row.order ? programKey(row) : "";
        clearSearch();
        state.category = "all";
        state.series = firstSeriesSelectionForCurrentRace();
        state.selectedSwimmerId = "";
        state.selectedRecordKey = "";
        render();
      });
      
      function changeSession(sessionNumber) {
        state.session = sessionNumber;
        const firstProgram = programRows()[0];
        if (firstProgram) {
          applyProgramRow(firstProgram);
        }
        clearSearch();
        state.category = "all";
        state.series = firstSeriesSelectionForCurrentRace();
        state.selectedSwimmerId = "";
        state.selectedRecordKey = "";
        render();
      }
      
      sessionControls?.addEventListener("change", (event) => {
        if (event.target?.id !== "sessionSelect") return;
        changeSession(event.target.value);
      });
      
      publicPositionToggle?.addEventListener("change", (event) => {
        const enabled = event.target.checked;
        event.target.disabled = true;
        setPublicPositionEnabled(enabled).catch((error) => {
          console.warn("Modification du repère public impossible", error);
          event.target.checked = !enabled;
        }).finally(() => {
          event.target.disabled = state.role !== "speaker" || !context.firestoreDb;
          render();
        });
      });
      
      async function openRoleConsole(nextRole) {
        if (!ROLE_LABELS[nextRole]) return;
        if (!requestRoleAccess(nextRole)) {
          const access = await askRolePin(nextRole);
          if (!access?.allowed) return;
          const reserved = await acquireRoleLock(nextRole, { adminBypass: access.adminBypass });
          if (!reserved) {
            context.unlockedRoles = (context.unlockedRoles || []).filter((role) => role !== nextRole);
            saveUnlockedRoles();
            return;
          }
        } else {
          const reserved = await acquireRoleLock(nextRole, { adminBypass: false });
          if (!reserved) {
            context.unlockedRoles = (context.unlockedRoles || []).filter((role) => role !== nextRole);
            saveUnlockedRoles();
            return;
          }
        }
        context.profileHomeActive = false;
        switchRoleUnlocked(nextRole);
        render();
        updateConsolePresence(true);
      }
      
      document.querySelectorAll(".role-chip").forEach((button) => {
        button.addEventListener("click", async () => {
          await openRoleConsole(button.dataset.role || "speaker");
        });
      });
      
      profileHome?.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-home-role]");
        if (!button) return;
        const role = button.dataset.homeRole || "live";
        if (!dedicatedRole && await navigateToDedicatedConsole(role)) return;
        await openRoleConsole(role);
      });
      
      profileHomeBtn?.addEventListener("click", () => {
        if (dedicatedRole) {
          navigateToMainHome();
          return;
        }
        context.profileHomeActive = true;
        render();
        releaseConsolePresence();
        refreshPresenceCounts();
      });
      
      competitionModeTopBtn?.addEventListener("click", () => {
        toggleCompetitionMode();
      });
      
      manualRefreshBtn?.addEventListener("click", async () => {
        manualRefreshBtn.disabled = true;
        manualRefreshBtn.textContent = "Actualisation...";
        await refreshFirebaseOnce(true);
        manualRefreshBtn.disabled = false;
        manualRefreshBtn.textContent = "Actualiser";
      });
      
      headerRefs.addEventListener("click", (event) => {
        const button = event.target.closest(".ref-chip-button");
        if (!button) return;
        state.selectedRecordKey = state.selectedRecordKey === button.dataset.recordKey ? "" : button.dataset.recordKey;
        renderHeaderReferences();
        renderEntrants();
      });
      
      headerRefDetails.addEventListener("click", (event) => {
        if (!event.target.closest(".close-ref-details")) return;
        state.selectedRecordKey = "";
        renderHeaderReferences();
        renderEntrants();
      });
      
      entrantsSubtitle?.addEventListener("click", (event) => {
        const closeButton = event.target.closest(".close-ref-details");
        if (closeButton) {
          state.selectedRecordKey = "";
          renderHeaderReferences();
          renderEntrants();
          return;
        }
        const button = event.target.closest(".ref-chip-button");
        if (!button) return;
        state.selectedRecordKey = state.selectedRecordKey === button.dataset.recordKey ? "" : button.dataset.recordKey;
        renderHeaderReferences();
        renderEntrants();
      });
      
      seriesControls.addEventListener("click", (event) => {
        const button = event.target.closest("[data-series]");
        if (!button) return;
        state.series = button.dataset.series;
        if (isFinalStage(state.series)) {
          const row = finalProgramRowsForRace().find((item) => item.stage === state.series);
          if (row) applyProgramRow(row);
        }
        state.selectedSwimmerId = "";
        render();
      });
      
      programBtn?.addEventListener("click", openProgramModal);
      refereeProgressBtn?.addEventListener("click", (event) => {
        if (event.currentTarget.dataset.refereeProgressAction !== "set") return;
        setRefereeProgressHere();
      });
      programModal?.addEventListener("click", (event) => {
        if (event.target === programModal || event.target.closest("[data-program-close]")) {
          closeProgramModal();
          return;
        }
        if (["video", "computer"].includes(state.role)) return;
        const button = event.target.closest("[data-program-race]");
        if (!button) return;
        const row = (data.program || []).find((item) => programKey(item) === button.dataset.programRace);
        if (!row) return;
        applyProgramRow(row);
        if (row.session) state.session = row.session;
        const stage = button.dataset.programStage;
        const series = button.dataset.programSeries;
        if (stage && isFinalStage(stage)) {
          state.series = stage;
        } else if (series) {
          state.series = String(series);
        } else {
          state.series = firstSeriesSelectionForCurrentRace();
        }
        clearSearch();
        state.category = "all";
        state.selectedSwimmerId = "";
        state.selectedRecordKey = "";
        closeProgramModal();
        render();
      });
      
      adminSeriesBtn?.addEventListener("click", openAdminSeriesModal);
      archivesBtn?.addEventListener("click", () => {
        renderHistoryArchivesModal({ canDelete: false });
      });

      if (dedicatedRole && ROLE_LABELS[dedicatedRole]) {
        window.setTimeout(() => {
          if (context.profileHomeActive || context.state?.role !== dedicatedRole) {
            openRoleConsole(dedicatedRole).then(() => {
              refreshFirebaseOnce?.(false);
            }).catch((error) => {
              console.warn("Ouverture de la console dediee impossible", error);
            });
          }
        }, 0);
      }
  }

  window.LivePalmesUiNavigationEvents = { init };
}());
