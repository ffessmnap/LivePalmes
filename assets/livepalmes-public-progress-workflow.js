(function () {
  function init(context = {}) {
    const {
      document,
      finalStageLabel,
      isFinalStage,
      liveDataDocument,
      livePalmesAlerts,
      programKey,
      programRows,
      publicPositionEnabled,
      selectedProgramRow,
      sexDisplayLabel,
      topbar,
      updateLiveNotes
    } = context;
    const getAlerts = () => context.alerts || [];
    const getData = () => context.data || { events: [], notes: {}, program: [] };
    const getLastPublicProgressSignature = () => context.lastPublicProgressSignature || "";
    const setLastPublicProgressSignature = (value) => { context.lastPublicProgressSignature = value; };
    const getPresenceCounts = () => context.presenceCounts || {};
    const getRoleStates = () => context.roleStates || {};
    const getState = () => context.state || {};

    function emptyPresenceCounts() {
      return {
        live: 0,
        speaker: 0,
        referee: 0,
        video: 0,
        computer: 0,
        secretary: 0
      };
    }

    function presenceLabel(count) {
      const value = Number(count || 0);
      return `${value} connect\u00e9${value > 1 ? "s" : ""}`;
    }

    function renderPresenceCounts() {
      const counts = { ...emptyPresenceCounts(), ...getPresenceCounts() };
      document.querySelectorAll("[data-presence-role]").forEach((node) => {
        node.textContent = presenceLabel(counts[node.dataset.presenceRole] || 0);
      });
    }

    function refereeProgress() {
      return getData().notes?.refereeProgress || null;
    }

    function progressProgramRow() {
      const progress = refereeProgress();
      if (!progress?.programKey) return null;
      return (getData().program || []).find((row) => programKey(row) === progress.programKey) || null;
    }

    function refereeProgressLabel(progress = refereeProgress()) {
      if (!progress?.programKey) return "";
      const data = getData();
      const row = (data.program || []).find((item) => programKey(item) === progress.programKey) || progressProgramRow();
      const event = data.events.find((item) => item.id === (row?.eventId || progress.eventId));
      const session = progress.session ? `S${progress.session}` : "";
      const eventLabel = event?.label || row?.label || progress.eventLabel || "course";
      const sex = sexDisplayLabel(row?.sex || progress.sex || "");
      const phase = isFinalStage(progress.stage) ? finalStageLabel(progress.stage) : (progress.series ? `s\u00e9rie ${progress.series}` : "");
      return [session, eventLabel, sex, phase].filter(Boolean).join(" \u00b7 ");
    }

    function refereeProgressShortLabel(progress = refereeProgress()) {
      if (!progress?.programKey) return "";
      const session = progress.session ? `S${progress.session}` : "";
      const phase = isFinalStage(progress.stage)
        ? finalStageLabel(progress.stage)
        : `s\u00e9rie ${progress.series || "-"}`;
      return `Point JA : ${[session, phase].filter(Boolean).join(" \u00b7 ")}`;
    }

    function currentRefereeProgressPayload() {
      const data = getData();
      const state = getState();
      const row = selectedProgramRow() || programRows().find((item) => item.eventId === state.eventId && item.sex === state.sex);
      if (!row) return null;
      return {
        programKey: programKey(row),
        eventId: row.eventId,
        eventLabel: data.events.find((item) => item.id === row.eventId)?.label || row.label || row.eventId,
        sex: row.sex,
        session: state.session !== "all" ? String(state.session || row.session || "") : String(row.session || ""),
        series: isFinalStage(state.series) ? "" : String(state.series || ""),
        stage: isFinalStage(state.series) ? String(state.series) : (row.stage || "series"),
        order: Number(row.order || 0),
        updatedAt: new Date().toISOString()
      };
    }

    function sameRefereeProgress(a, b) {
      return Boolean(a?.programKey && b?.programKey) &&
        String(a.programKey) === String(b.programKey) &&
        String(a.series || "") === String(b.series || "") &&
        String(a.stage || "") === String(b.stage || "");
    }

    function currentRefereeProgressIsHere() {
      return sameRefereeProgress(currentRefereeProgressPayload(), refereeProgress());
    }

    function currentPublicProgressPayload() {
      return publicProgressPayloadFromState(getState(), { requireSpeaker: true });
    }

    function programRowForRoleState(roleState = getState()) {
      const data = getData();
      if (roleState.programKey) {
        const exact = (data.program || []).find((row) => programKey(row) === roleState.programKey);
        if (exact) return exact;
      }
      return (data.program || []).find((item) =>
        item.eventId === roleState.eventId &&
        item.sex === roleState.sex &&
        (!roleState.session || roleState.session === "all" || item.session === roleState.session)
      ) || null;
    }

    function publicProgressPayloadFromState(roleState = getState(), options = {}) {
      const data = getData();
      if (options.requireSpeaker && roleState.role !== "speaker") return null;
      if (!publicPositionEnabled() && options.requireSpeaker) return null;
      const row = programRowForRoleState(roleState);
      if (!row) return null;
      return {
        programKey: programKey(row),
        eventId: row.eventId,
        eventLabel: data.events.find((item) => item.id === row.eventId)?.label || row.label || row.eventId,
        sex: row.sex,
        session: roleState.session !== "all" ? String(roleState.session || row.session || "") : String(row.session || ""),
        series: isFinalStage(roleState.series) ? "" : String(roleState.series || ""),
        stage: isFinalStage(roleState.series) ? String(roleState.series) : (row.stage || "series"),
        order: Number(row.order || 0),
        updatedAt: new Date().toISOString()
      };
    }

    function publicProgressSignature(progress) {
      return [progress?.programKey, progress?.session, progress?.series, progress?.stage].join("|");
    }

    function publishPublicProgressIfNeeded() {
      const progress = currentPublicProgressPayload();
      if (!progress || !liveDataDocument()) return;
      const signature = publicProgressSignature(progress);
      if (!signature || signature === getLastPublicProgressSignature()) return;
      setLastPublicProgressSignature(signature);
      updateLiveNotes("Rep\u00e8re public comp\u00e9tition", { publicProgress: progress }).catch((error) => {
        console.warn("Publication du rep\u00e8re public impossible", error);
        setLastPublicProgressSignature("");
      });
    }

    async function setPublicPositionEnabled(enabled) {
      const state = getState();
      const sourceState = state.role === "speaker" ? state : (getRoleStates().speaker || state);
      const nextProgress = enabled ? publicProgressPayloadFromState(sourceState) : null;
      setLastPublicProgressSignature("");
      await updateLiveNotes(enabled ? "Rep\u00e8re public activ\u00e9" : "Rep\u00e8re public d\u00e9sactiv\u00e9", {
        publicPositionEnabled: Boolean(enabled),
        publicProgress: nextProgress
      });
    }

    function homeActionCounts() {
      if (context.alertSummaryCounts && typeof context.alertSummaryCounts === "object") {
        return { ...emptyPresenceCounts(), ...context.alertSummaryCounts };
      }
      return livePalmesAlerts.homeActionCounts(getAlerts(), emptyPresenceCounts());
    }

    function actionCountLabel(count) {
      return livePalmesAlerts.actionCountLabel(count);
    }

    function renderHomeActionCounts() {
      const counts = homeActionCounts();
      document.querySelectorAll("[data-home-actions-role]").forEach((node) => {
        const value = counts[node.dataset.homeActionsRole] || 0;
        node.hidden = value <= 0;
        node.textContent = actionCountLabel(value);
      });
    }

    function updateStickyAlertOffset() {
      const height = topbar?.getBoundingClientRect().height || 0;
      document.documentElement.style.setProperty("--alert-sticky-top", `${Math.ceil(height + 8)}px`);
    }

    return {
      emptyPresenceCounts,
      presenceLabel,
      renderPresenceCounts,
      refereeProgress,
      progressProgramRow,
      refereeProgressLabel,
      refereeProgressShortLabel,
      currentRefereeProgressPayload,
      sameRefereeProgress,
      currentRefereeProgressIsHere,
      currentPublicProgressPayload,
      programRowForRoleState,
      publicProgressPayloadFromState,
      publicProgressSignature,
      publishPublicProgressIfNeeded,
      setPublicPositionEnabled,
      homeActionCounts,
      actionCountLabel,
      renderHomeActionCounts,
      updateStickyAlertOffset
    };
  }

  window.LivePalmesPublicProgressWorkflow = { init };
})();
