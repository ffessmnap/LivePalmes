(function () {
  function init(context = {}) {
    with (context) {
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
        return `${value} connecté${value > 1 ? "s" : ""}`;
      }
      
      function renderPresenceCounts() {
        const counts = { ...emptyPresenceCounts(), ...(presenceCounts || {}) };
        document.querySelectorAll("[data-presence-role]").forEach((node) => {
          node.textContent = presenceLabel(counts[node.dataset.presenceRole] || 0);
        });
      }
      
      function refereeProgress() {
        return data.notes?.refereeProgress || null;
      }
      
      function progressProgramRow() {
        const progress = refereeProgress();
        if (!progress?.programKey) return null;
        return (data.program || []).find((row) => programKey(row) === progress.programKey) || null;
      }
      
      function refereeProgressLabel(progress = refereeProgress()) {
        if (!progress?.programKey) return "";
        const row = (data.program || []).find((item) => programKey(item) === progress.programKey) || progressProgramRow();
        const event = data.events.find((item) => item.id === (row?.eventId || progress.eventId));
        const session = progress.session ? `S${progress.session}` : "";
        const eventLabel = event?.label || row?.label || progress.eventLabel || "course";
        const sex = sexDisplayLabel(row?.sex || progress.sex || "");
        const phase = isFinalStage(progress.stage) ? finalStageLabel(progress.stage) : (progress.series ? `série ${progress.series}` : "");
        return [session, eventLabel, sex, phase].filter(Boolean).join(" · ");
      }
      
      function refereeProgressShortLabel(progress = refereeProgress()) {
        if (!progress?.programKey) return "";
        const session = progress.session ? `S${progress.session}` : "";
        const phase = isFinalStage(progress.stage)
          ? finalStageLabel(progress.stage)
          : `série ${progress.series || "-"}`;
        return `Point JA : ${[session, phase].filter(Boolean).join(" · ")}`;
      }
      
      function currentRefereeProgressPayload() {
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
        return publicProgressPayloadFromState(state, { requireSpeaker: true });
      }
      
      function programRowForRoleState(roleState = state) {
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
      
      function publicProgressPayloadFromState(roleState = state, options = {}) {
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
        if (!signature || signature === lastPublicProgressSignature) return;
        lastPublicProgressSignature = signature;
        updateLiveNotes("Repère public compétition", { publicProgress: progress }).catch((error) => {
          console.warn("Publication du repère public impossible", error);
          lastPublicProgressSignature = "";
        });
      }
      
      async function setPublicPositionEnabled(enabled) {
        const sourceState = state.role === "speaker" ? state : (roleStates.speaker || state);
        const nextProgress = enabled ? publicProgressPayloadFromState(sourceState) : null;
        lastPublicProgressSignature = "";
        await updateLiveNotes(enabled ? "Repère public activé" : "Repère public désactivé", {
          publicPositionEnabled: Boolean(enabled),
          publicProgress: nextProgress
        });
      }
      
      function homeActionCounts() {
        return livePalmesAlerts.homeActionCounts(alerts, emptyPresenceCounts());
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
  }

  window.LivePalmesPublicProgressWorkflow = { init };
})();
