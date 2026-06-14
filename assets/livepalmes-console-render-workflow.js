(function () {
  function init(context = {}) {
    const {
      adminSeriesBtn,
      appConsoleTitle,
      appShell,
      archivesBtn,
      availableSexesForEvent,
      categoryField,
      competitionModeEnabled,
      competitionModeTopBtn,
      document,
      escapeHtml,
      filteredCount,
      fullscreenBtn,
      lineOrderBtn,
      manualRefreshBtn,
      meetTitle,
      normalizeLivePosition,
      pinLockEnabled,
      preferredInitialSession,
      previousSeriesInlineBtn,
      profileHome,
      profileHomeBtn,
      profileModeStatus,
      programBtn,
      publicPositionEnabled,
      publicPositionToggle,
      publishPublicProgressIfNeeded,
      realtimeSyncEnabled,
      renderCategorySelect,
      renderDataStatus,
      renderEntrants,
      renderHeader,
      renderHeaderReferences,
      renderHomeActionCounts,
      renderPresenceCounts,
      renderProgramButtons,
      renderRolePanels,
      renderSeriesControls,
      renderTop2025,
      ROLE_LABELS,
      roleBadge,
      roleLockBtn,
      saveActiveView,
      saveCurrentRoleState,
      sessionControls,
      sessionRows,
      sidebar,
      updateEventSelect,
      updateStickyAlertOffset,
      viewModeBtn
    } = context;
    const getData = () => context.data || { events: [], meet: {} };
    const getFirestoreDb = () => context.firestoreDb;
    const getIsFullscreenMode = () => Boolean(context.isFullscreenMode);
    const getProfileHomeActive = () => Boolean(context.profileHomeActive);
    const getState = () => context.state || {};

    function render() {
      const data = getData();
      const state = getState();
      const profileHomeActive = getProfileHomeActive();
      const isFullscreenMode = getIsFullscreenMode();
      updateStickyAlertOffset();
      document.body.classList.add("live-mode");
      document.body.classList.toggle("profile-home-active", profileHomeActive);
      document.body.classList.toggle("fullscreen-mode", isFullscreenMode);
      document.body.classList.toggle("role-speaker", state.role === "speaker");
      document.body.classList.toggle("role-live", state.role === "live");
      document.body.classList.toggle("role-referee", state.role === "referee");
      document.body.classList.toggle("role-video", state.role === "video");
      document.body.classList.toggle("role-computer", state.role === "computer");
      document.body.classList.toggle("role-secretary", state.role === "secretary");
      if (profileHome) profileHome.hidden = !profileHomeActive;
      if (appShell) appShell.hidden = profileHomeActive;
      if (profileModeStatus) {
        profileModeStatus.textContent = competitionModeEnabled()
          ? "Direct actif"
          : "Actualisation manuelle";
        profileModeStatus.classList.toggle("active", realtimeSyncEnabled());
      }
      renderPresenceCounts();
      renderHomeActionCounts();
      if (profileHomeBtn) {
        profileHomeBtn.hidden = profileHomeActive;
        profileHomeBtn.textContent = "Accueil";
      }
      if (manualRefreshBtn) {
        const manualMode = !realtimeSyncEnabled();
        manualRefreshBtn.hidden = profileHomeActive || !manualMode;
        manualRefreshBtn.title = "Actualiser les donn\u00e9es des consoles";
      }
      if (competitionModeTopBtn) {
        const competitionMode = realtimeSyncEnabled();
        competitionModeTopBtn.hidden = profileHomeActive || state.role !== "computer";
        competitionModeTopBtn.innerHTML = `<span aria-hidden="true"></span>${competitionMode ? "Direct" : "Manuel"}`;
        competitionModeTopBtn.setAttribute("aria-pressed", competitionMode ? "true" : "false");
        competitionModeTopBtn.title = competitionMode
          ? "Passer les consoles en actualisation manuelle"
          : "Activer l'actualisation directe des consoles";
        competitionModeTopBtn.classList.toggle("active", competitionMode);
      }
      if (appConsoleTitle) {
        appConsoleTitle.textContent = profileHomeActive
          ? "LivePalmes"
          : `LivePalmes - ${ROLE_LABELS[state.role] || "Console"}`;
      }
      syncProgramButtonPlacement();
      document.querySelectorAll(".role-chip").forEach((button) => {
        button.classList.toggle("active", button.dataset.role === state.role);
      });
      if (roleBadge) roleBadge.textContent = ROLE_LABELS[state.role] || "Console";
      if (fullscreenBtn) {
        fullscreenBtn.hidden = profileHomeActive;
        fullscreenBtn.textContent = isFullscreenMode ? "Quitter plein \u00e9cran" : "Plein \u00e9cran";
      }
      if (viewModeBtn) viewModeBtn.hidden = true;
      if (roleLockBtn) {
        roleLockBtn.textContent = pinLockEnabled() ? "\uD83D\uDD12" : "\uD83D\uDD13";
        roleLockBtn.title = pinLockEnabled() ? "Codes actifs" : "Codes inactifs";
        roleLockBtn.setAttribute("aria-label", pinLockEnabled() ? "Codes actifs" : "Codes inactifs");
        roleLockBtn.classList.toggle("confirm-button", pinLockEnabled());
      }
      if (publicPositionToggle) {
        publicPositionToggle.checked = false;
        publicPositionToggle.disabled = true;
        const publicPositionLabel = publicPositionToggle.closest(".public-position-toggle");
        if (publicPositionLabel) publicPositionLabel.hidden = true;
      }
      if (adminSeriesBtn) adminSeriesBtn.hidden = state.role !== "computer";
      if (archivesBtn) archivesBtn.hidden = profileHomeActive || state.role !== "computer";
      if (!data.events.some((event) => event.id === state.eventId)) {
        state.eventId = data.events[0]?.id || "";
      }
      normalizeLivePosition();
      const availableSexes = availableSexesForEvent();
      if (availableSexes.length && !availableSexes.includes(state.sex)) {
        state.sex = availableSexes[0];
      }

      if (meetTitle) {
        meetTitle.textContent = [data.meet?.name, data.meet?.city].filter(Boolean).join(" - ") || "Comp\u00e9tition \u00e0 charger";
      }
      updateEventSelect();
      renderSessionControls();
      syncLineOrderButtonPlacement();
      renderSeriesControls();
      syncProgramButtonPlacement();
      renderProgramButtons();
      renderCategorySelect();
      renderHeader();
      renderHeaderReferences();
      renderEntrants();
      renderTop2025();
      renderRolePanels();
      renderDataStatus();
      saveCurrentRoleState();
      saveActiveView();
      publishPublicProgressIfNeeded();
    }

    function syncProgramButtonPlacement() {
      const state = getState();
      if (!programBtn || !sidebar) return;
      const seriesNav = document.querySelector(".series-field .series-nav");
      if (["speaker", "referee", "live"].includes(state.role) && seriesNav) {
        if (programBtn.parentElement !== seriesNav) {
          seriesNav.appendChild(programBtn);
        }
        return;
      }
      if (programBtn.parentElement !== sidebar) {
        sidebar.insertBefore(programBtn, categoryField || null);
      }
    }

    function syncLineOrderButtonPlacement() {
      if (!lineOrderBtn) return;
      const panelActions = document.querySelector(".entrants-panel .panel-actions");
      if (panelActions && lineOrderBtn.parentElement !== panelActions) {
        const previousReference = previousSeriesInlineBtn?.parentElement === panelActions ? previousSeriesInlineBtn : null;
        const filteredReference = filteredCount?.parentElement === panelActions ? filteredCount : null;
        panelActions.insertBefore(lineOrderBtn, previousReference || filteredReference);
        return;
      }
      if (panelActions && lineOrderBtn.parentElement === panelActions) {
        const previousReference = previousSeriesInlineBtn?.parentElement === panelActions ? previousSeriesInlineBtn : null;
        if (previousReference && lineOrderBtn.nextElementSibling !== previousReference) {
          panelActions.insertBefore(lineOrderBtn, previousReference);
        }
      }
    }

    function renderSessionControls() {
      const state = getState();
      if (!sessionControls) return;
      const sessions = sessionRows();
      if (!sessions.length) {
        sessionControls.innerHTML = "";
        sessionControls.closest(".top-session-field")?.setAttribute("hidden", "");
        state.session = "all";
        return;
      }
      sessionControls.closest(".top-session-field")?.removeAttribute("hidden");
      if (state.session === "all" || !sessions.some((session) => session.number === state.session)) {
        state.session = preferredInitialSession();
      }
      sessionControls.innerHTML = `
        <select id="sessionSelect" class="session-select" aria-label="Choisir la session">
          ${sessions.map((session) => `
            <option value="${escapeHtml(session.number)}" ${state.session === session.number ? "selected" : ""}>
              S${escapeHtml(session.number)}
            </option>
          `).join("")}
        </select>
      `;
    }

    return {
      render,
      syncProgramButtonPlacement,
      syncLineOrderButtonPlacement,
      renderSessionControls
    };
  }

  window.LivePalmesConsoleRenderWorkflow = { init };
})();
