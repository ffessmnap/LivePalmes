(function () {
  function init(context = {}) {
    const {
      alertDetailModal,
      antoineOverlay,
      applyProgramRow,
      availableSeriesNumbers,
      cancelDecision,
      categorySelect,
      closeAlertDetail,
      closeDecisionModal,
      competitionModeEnabled,
      createDecisionAlert,
      decisionDraftIsReady,
      decisionModal,
      defaultDecisionDetail,
      dismissLiveAlert,
      downloadJson,
      entrantsBody,
      exportDsqPdf,
      finalProgramRowsForRace,
      fullscreenBtn,
      goToNextProgramRace,
      goToPreviousProgramRace,
      isFinalStage,
      lineOrderBtn,
      markFinalistWithdrawn,
      markSpeakerAlertDoneLocally,
      nextSeriesBtn,
      nextSeriesFloatBtn,
      nextSeriesInlineBtn,
      officialAlerts,
      openAlertDetail,
      openDecisionModal,
      openFinalCompositionModal,
      openFinalistsAnnouncementModal,
      previousSeriesBtn,
      previousSeriesFloatBtn,
      previousSeriesInlineBtn,
      programFloatBtn,
      openProgramModal,
      publishFinalistsAfterSpeaker,
      publishReplacementAfterSpeaker,
      reinstateFinalist,
      render,
      renderDecisionModal,
      renderEntrants,
      renderHeaderReferences,
      renderResetResultsModal,
      renderRoleHistory,
      renderRolePanels,
      renderSpeakerHistory,
      resetHistory,
      restoreAlertLocally,
      roleHistory,
      roleQueue,
      searchInput,
      selectRecordForCategory,
      selectedEntrant,
      speakerHistory,
      swimmerDetails,
      syncAlertChangesToFirestoreStrict,
      toggleCompetitionMode,
      toggleFinalPreWithdrawal,
      updateAlert,
      updateSpeakerInfoFromGoogleSheet,
      showToast
    } = context;
    const alerts = new Proxy([], {
      get: (_, prop) => context.alerts?.[prop],
      has: (_, prop) => prop in (context.alerts || [])
    });
    const decisionDraft = new Proxy({}, {
      get: (_, prop) => context.decisionDraft?.[prop],
      set: (_, prop, value) => {
        const nextDraft = context.decisionDraft || {};
        nextDraft[prop] = value;
        context.decisionDraft = nextDraft;
        return true;
      }
    });
    const expandedHistories = new Proxy({}, {
      get: (_, prop) => context.expandedHistories?.[prop],
      set: (_, prop, value) => {
        const nextHistories = context.expandedHistories || {};
        nextHistories[prop] = value;
        context.expandedHistories = nextHistories;
        return true;
      }
    });
    const historyFilters = new Proxy({}, {
      get: (_, prop) => context.historyFilters?.[prop],
      set: (_, prop, value) => {
        const nextFilters = context.historyFilters || {};
        nextFilters[prop] = value;
        context.historyFilters = nextFilters;
        return true;
      }
    });

    async function prepareManualModeForReset() {
      if (!competitionModeEnabled()) return true;
      const ok = window.confirm([
        "L'actualisation directe est active.",
        "",
        "Pour faire une RAZ, LivePalmes doit d'abord passer en Manuel.",
        "Passer en Manuel et continuer la RAZ ?"
      ].join("\n"));
      if (!ok) return false;
      return await toggleCompetitionMode?.(false) === true;
    }
    const state = new Proxy({}, {
      get: (_, prop) => context.state?.[prop],
      set: (_, prop, value) => {
        const nextState = context.state || {};
        nextState[prop] = value;
        context.state = nextState;
        return true;
      }
    });

      officialAlerts?.addEventListener("click", (event) => {
        const button = event.target.closest("[data-alert-action]");
        const card = event.target.closest("[data-alert-id]");
        if (!card) return;
        const alert = alerts.find((item) => item.id === card.dataset.alertId);
        if (alert?.type === "finalists_announcement") {
          if (state.role === "speaker") openFinalistsAnnouncementModal(card.dataset.alertId);
          return;
        }
        if (state.role === "live") {
          dismissLiveAlert(card.dataset.alertId);
          return;
        }
        if (!button) return;
        if (button.dataset.alertAction === "Annoncé") {
          const alertId = card.dataset.alertId;
          const announcedAt = new Date().toISOString();
          const previousAlert = markSpeakerAlertDoneLocally(alertId, announcedAt);
          if (!previousAlert) return;
          if (alert?.type === "finalist_replacement_announcement") {
            publishReplacementAfterSpeaker(alertId).catch((error) => {
              console.error(error);
              if (!error?.alertAlreadyClosed) restoreAlertLocally(previousAlert);
              showToast(`Annonce du repêchage impossible : ${error?.message || error}`);
            });
            return;
          }
          syncAlertChangesToFirestoreStrict(alertId, {
            speakerStatus: "done",
            speakerAnnouncedAt: announcedAt,
            updatedAt: announcedAt
          }).catch((error) => {
            console.error(error);
            restoreAlertLocally(previousAlert);
            showToast(`Annonce impossible : ${error?.message || error}`);
          });
        }
      });
      
      alertDetailModal?.addEventListener("click", (event) => {
        const finalistsButton = event.target.closest("[data-finalists-announced]");
        if (finalistsButton) {
          const alertId = finalistsButton.dataset.finalistsAnnounced;
          const announcedAt = new Date().toISOString();
          finalistsButton.disabled = true;
          finalistsButton.textContent = "Pris en compte";
          closeAlertDetail();
          const previousAlert = markSpeakerAlertDoneLocally(alertId, announcedAt);
          publishFinalistsAfterSpeaker(alertId).catch((error) => {
            console.error(error);
            if (!error?.alertAlreadyClosed) restoreAlertLocally(previousAlert);
            showToast(`Publication des finalistes impossible : ${error?.message || error}`);
          });
          return;
        }
        const withdrawButton = event.target.closest("[data-final-withdraw]");
        if (withdrawButton) {
          const expired = withdrawButton.dataset.finalExpired === "1";
          const message = expired
            ? "Attention, le délai de forfait est dépassé. Souhaitez-vous quand même valider ce forfait et repêcher le nageur suivant si possible ?"
            : "Déclarer ce forfait en finale et repêcher le nageur suivant si possible ?";
          const ok = window.confirm(message);
          if (!ok) return;
          markFinalistWithdrawn(
            withdrawButton.dataset.finalWithdraw,
            withdrawButton.dataset.finalKey,
            withdrawButton.dataset.finalIndex,
            { allowExpired: expired, rowKey: withdrawButton.dataset.finalRowKey || "" }
          ).catch((error) => {
            console.error(error);
            window.alert(`Forfait impossible : ${error?.message || error}`);
          });
          return;
        }
        const preWithdrawButton = event.target.closest("[data-final-prewithdraw]");
        if (preWithdrawButton) {
          const activeLabel = preWithdrawButton.textContent.includes("Annuler") ? "Annuler ce pré-forfait ?" : "Enregistrer ce pré-forfait si le nageur est repêché ?";
          const ok = window.confirm(activeLabel);
          if (!ok) return;
          toggleFinalPreWithdrawal(
            preWithdrawButton.dataset.finalPrewithdraw,
            preWithdrawButton.dataset.finalRowKey
          ).catch((error) => {
            console.error(error);
            window.alert(`Pré-forfait impossible : ${error?.message || error}`);
          });
          return;
        }
        const reinstateButton = event.target.closest("[data-final-reinstate]");
        if (reinstateButton) {
          const ok = window.confirm("Réintégrer ce nageur dans la finale ? Si le repêchage n'a pas encore été annoncé, l'alerte speaker sera annulée.");
          if (!ok) return;
          reinstateFinalist(
            reinstateButton.dataset.finalReinstate,
            reinstateButton.dataset.finalKey,
            reinstateButton.dataset.finalIndex,
            reinstateButton.dataset.finalRowKey || ""
          ).catch((error) => {
            console.error(error);
            window.alert(`Réintégration impossible : ${error?.message || error}`);
          });
          return;
        }
        const compositionDoneButton = event.target.closest("[data-final-composition-done]");
        if (compositionDoneButton) {
          updateAlert(compositionDoneButton.dataset.finalCompositionDone, {
            informaticsStatus: "done",
            informaticsDoneAt: new Date().toISOString()
          });
          closeAlertDetail();
          return;
        }
        if (event.target === alertDetailModal || event.target.closest("[data-close-alert-detail]")) {
          closeAlertDetail();
        }
      });
      
      decisionModal?.addEventListener("click", (event) => {
        if (event.target === decisionModal || event.target.closest("[data-close-decision]")) {
          closeDecisionModal({ clearSelection: true });
          return;
        }
        const entrant = selectedEntrant();
        if (!entrant) return;
        const cancelButton = event.target.closest("[data-cancel-active-decision]");
        if (cancelButton) {
          const ok = window.confirm("Annuler cette DSQ ? Une alerte sera envoyée si le speaker ou le bureau des performances doit corriger l'information.");
          if (ok) {
            closeDecisionModal({ clearSelection: true });
            cancelDecision(cancelButton.dataset.cancelActiveDecision, "referee");
          }
          return;
        }
        const typeButton = event.target.closest("[data-decision-type]");
        if (typeButton) {
          decisionDraft.comment = document.querySelector("#modalDecisionComment")?.value || decisionDraft.comment;
          decisionDraft.type = typeButton.dataset.decisionType || "";
          defaultDecisionDetail(decisionDraft.type, entrant);
          renderDecisionModal();
          return;
        }
        const relayButton = event.target.closest("[data-relay-leg]");
        if (relayButton) {
          decisionDraft.comment = document.querySelector("#modalDecisionComment")?.value || decisionDraft.comment;
          decisionDraft.relayLeg = relayButton.dataset.relayLeg || "";
          renderDecisionModal();
          return;
        }
        const lengthButton = event.target.closest("[data-length-type]");
        if (lengthButton) {
          decisionDraft.comment = document.querySelector("#modalDecisionComment")?.value || decisionDraft.comment;
          decisionDraft.lengthType = lengthButton.dataset.lengthType || "start";
          renderDecisionModal();
          return;
        }
        const stepButton = event.target.closest("[data-length-step]");
        if (stepButton) {
          decisionDraft.comment = document.querySelector("#modalDecisionComment")?.value || decisionDraft.comment;
          const current = Math.max(1, Number.parseInt(decisionDraft.lengthNumber || "1", 10) || 1);
          const step = Number.parseInt(stepButton.dataset.lengthStep || "0", 10) || 0;
          decisionDraft.lengthNumber = String(Math.max(1, current + step));
          decisionDraft.lengthType = "length";
          renderDecisionModal();
          return;
        }
        if (event.target.closest("[data-submit-decision]")) {
          decisionDraft.comment = document.querySelector("#modalDecisionComment")?.value || "";
          decisionDraft.lengthNumber = document.querySelector("#modalLengthNumber")?.value || decisionDraft.lengthNumber;
          if (!decisionDraftIsReady(entrant)) return;
          createDecisionAlert(decisionDraft);
          closeDecisionModal();
        }
      });
      
      decisionModal?.addEventListener("input", (event) => {
        if (event.target?.id === "modalDecisionComment") {
          decisionDraft.comment = event.target.value;
        } else if (event.target?.id === "modalLengthNumber") {
          decisionDraft.lengthNumber = event.target.value;
        }
      });
      
      roleQueue?.addEventListener("click", (event) => {
        const compositionButton = event.target.closest("[data-final-composition-open]");
        if (compositionButton) {
          openFinalCompositionModal(compositionButton.dataset.finalCompositionOpen);
          return;
        }
        const button = event.target.closest("[data-queue-action]");
        const item = event.target.closest("[data-alert-id]");
        if (!item) return;
        if (!button) return;
        const id = item.dataset.alertId;
        if (button.dataset.queueAction === "confirm-video") {
          updateAlert(id, { videoStatus: "confirmed", videoConfirmedAt: new Date().toISOString(), speakerStatus: "pending", informaticsStatus: "pending" });
        } else if (button.dataset.queueAction === "reject-video") {
          updateAlert(id, { videoStatus: "rejected", videoRejectedAt: new Date().toISOString(), speakerStatus: "none", informaticsStatus: "none" });
        } else if (button.dataset.queueAction === "done-computer") {
          updateAlert(id, { informaticsStatus: "done", informaticsDoneAt: new Date().toISOString() });
        } else if (button.dataset.queueAction === "done-secretary") {
          updateAlert(id, { secretaryStatus: "done", secretaryDoneAt: new Date().toISOString() });
        }
      });
      
      roleHistory?.addEventListener("click", async (event) => {
        if (event.target.closest("[data-results-reset]")) {
          if (!await prepareManualModeForReset()) return;
          renderResetResultsModal();
          return;
        }
        if (event.target.closest("[data-history-export-pdf]")) {
          exportDsqPdf();
          return;
        }
        if (event.target.closest("[data-history-reset]")) {
          resetHistory();
          return;
        }
        const toggle = event.target.closest("[data-history-toggle]");
        if (toggle) {
          const key = toggle.dataset.historyToggle;
          expandedHistories[key] = !expandedHistories[key];
          renderRoleHistory();
          return;
        }
        const button = event.target.closest("[data-history-action]");
        const item = event.target.closest("[data-history-alert-id]");
        if (!item) return;
        const alert = alerts.find((row) => row.id === item.dataset.historyAlertId);
        if (!alert) return;
        if (!button) {
          openAlertDetail(alert.id);
          return;
        }
        if (button.dataset.historyAction === "cancel-ja") {
          const ok = window.confirm("Annuler cette décision ? Une alerte sera envoyée si le speaker ou le bureau des performances doit corriger l'information.");
          if (ok) cancelDecision(alert.id, "referee");
        } else if (button.dataset.historyAction === "delegate-cancel") {
          const ok = window.confirm("Confirmer l'annulation par le délégué de la compétition ? Le speaker et le bureau des performances recevront une alerte de requalification.");
          if (ok) cancelDecision(alert.id, "delegate");
        }
      });
      
      roleHistory?.addEventListener("change", (event) => {
        const select = event.target.closest("[data-history-filter]");
        if (!select) return;
        historyFilters[select.dataset.historyFilter] = select.value;
        expandedHistories.role = false;
        renderRoleHistory();
      });
      
      speakerHistory?.addEventListener("click", (event) => {
        const toggle = event.target.closest("[data-history-toggle]");
        if (toggle) {
          const key = toggle.dataset.historyToggle;
          expandedHistories[key] = !expandedHistories[key];
          renderSpeakerHistory();
          return;
        }
        const item = event.target.closest("[data-history-alert-id]");
        if (!item) return;
        openAlertDetail(item.dataset.historyAlertId);
      });
      
      speakerHistory?.addEventListener("change", (event) => {
        const select = event.target.closest("[data-history-filter]");
        if (!select) return;
        historyFilters[select.dataset.historyFilter] = select.value;
        expandedHistories.speaker = false;
        renderSpeakerHistory();
      });
      
      fullscreenBtn?.addEventListener("click", async () => {
        try {
          if (document.fullscreenElement) {
            await document.exitFullscreen();
          } else if (document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen();
          } else {
            context.isFullscreenMode = !context.isFullscreenMode;
            render();
          }
        } catch {
          context.isFullscreenMode = !context.isFullscreenMode;
          render();
        }
      });
      
      document.addEventListener("fullscreenchange", () => {
        context.isFullscreenMode = Boolean(document.fullscreenElement);
        render();
      });
      
      function goToNextSeries() {
        const numbers = availableSeriesNumbers();
        const finals = finalProgramRowsForRace();
        const finalStages = finals.map((row) => row.stage);
        if (!numbers.length && !finalStages.length) return;
        if (state.series === "all") {
          state.series = String(numbers[0] || finalStages[0] || "all");
        } else if (isFinalStage(state.series)) {
          const currentFinalIndex = finalStages.indexOf(state.series);
          const nextFinalRow = finals[currentFinalIndex + 1];
          if (nextFinalRow) {
            applyProgramRow(nextFinalRow);
            state.series = nextFinalRow.stage;
          } else {
            goToNextProgramRace();
          }
        } else {
          const currentIndex = numbers.indexOf(Number(state.series));
          const next = numbers[currentIndex + 1];
          if (next) {
            state.series = String(next);
          } else {
            goToNextProgramRace();
          }
        }
        state.selectedSwimmerId = "";
        render();
      }
      
      function goToPreviousSeries() {
        const numbers = availableSeriesNumbers();
        const finals = finalProgramRowsForRace();
        const finalStages = finals.map((row) => row.stage);
        if (!numbers.length && !finalStages.length) return;
        if (isFinalStage(state.series)) {
          const currentFinalIndex = finalStages.indexOf(state.series);
          const previousFinalRow = finals[currentFinalIndex - 1];
          if (previousFinalRow) {
            applyProgramRow(previousFinalRow);
            state.series = previousFinalRow.stage;
          } else if (numbers.length) {
            state.series = String(numbers[numbers.length - 1]);
          } else {
            goToPreviousProgramRace();
          }
        } else if (state.series === "all") {
          goToPreviousProgramRace();
        } else {
          const currentIndex = numbers.indexOf(Number(state.series));
          const previous = numbers[currentIndex - 1];
          if (previous) {
            state.series = String(previous);
          } else {
            goToPreviousProgramRace();
          }
        }
        state.selectedSwimmerId = "";
        render();
      }
      
      function toggleAntoineOverlay() {
        if (!antoineOverlay) return;
        antoineOverlay.hidden = !antoineOverlay.hidden;
      }
      
      previousSeriesBtn?.addEventListener("click", goToPreviousSeries);
      previousSeriesInlineBtn?.addEventListener("click", goToPreviousSeries);
      previousSeriesFloatBtn?.addEventListener("click", goToPreviousSeries);
      nextSeriesBtn?.addEventListener("click", goToNextSeries);
      nextSeriesInlineBtn?.addEventListener("click", goToNextSeries);
      nextSeriesFloatBtn?.addEventListener("click", goToNextSeries);
      programFloatBtn?.addEventListener("click", openProgramModal);
      
      document.addEventListener("keydown", (event) => {
        const target = event.target;
        if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
        if (event.key === "ArrowRight") {
          event.preventDefault();
          goToNextSeries();
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          goToPreviousSeries();
        } else if (event.key.toLowerCase() === "s") {
          event.preventDefault();
          sessionControls?.querySelector("#sessionSelect")?.focus();
        } else if (event.key.toLowerCase() === "a") {
          event.preventDefault();
          toggleAntoineOverlay();
        }
      });
      
      lineOrderBtn?.addEventListener("click", () => {
        state.lineOrder = state.lineOrder === "desc" ? "asc" : "desc";
        renderEntrants();
      });
      
      searchInput?.addEventListener("input", () => {
        state.search = searchInput.value;
        state.selectedSwimmerId = "";
        renderEntrants();
      });
      
      categorySelect.addEventListener("change", () => {
        state.category = categorySelect.value;
        state.selectedSwimmerId = "";
        selectRecordForCategory(state.category);
        renderHeaderReferences();
        renderEntrants();
      });
      
      entrantsBody.addEventListener("click", (event) => {
        const row = event.target.closest("tr[data-swimmer-id]");
        if (!row) return;
        if (state.role === "referee" && row.dataset.importedForfait === "1") return;
        state.selectedSwimmerId = row.dataset.swimmerId;
        renderEntrants();
        renderRolePanels();
        if (state.role === "referee") {
          openDecisionModal();
        }
      });
      
      swimmerDetails.addEventListener("click", (event) => {
        if (!event.target.closest(".close-details")) return;
        state.selectedSwimmerId = "";
        renderEntrants();
      });
      
      document.querySelector("#printBtn")?.addEventListener("click", () => window.print());
      document.querySelector("#exportBtn")?.addEventListener("click", downloadJson);
      document.querySelector("#exportDsqPdfBtn")?.addEventListener("click", exportDsqPdf);
      document.querySelector("#updateSpeakerInfoBtn")?.addEventListener("click", updateSpeakerInfoFromGoogleSheet);
      document.querySelector("#updateSpeakerInfoPanelBtn")?.addEventListener("click", updateSpeakerInfoFromGoogleSheet);
  }

  window.LivePalmesUiAlertEvents = { init };
}());
