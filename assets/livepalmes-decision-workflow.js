(function () {
  function init(context = {}) {
    with (context) {
      function selectedEntrant() {
        if (!state.selectedSwimmerId) return null;
        return raceEntrants().find((entrant) => (entrant.swimmerId || entrantKey(entrant)) === state.selectedSwimmerId) ||
          data.entrants.find((entrant) => (entrant.swimmerId || entrantKey(entrant)) === state.selectedSwimmerId);
      }
      
      function entrantSeriesRow(entrant) {
        const swimmerId = entrant.swimmerId || entrantKey(entrant);
        const rows = (data.series || [])
          .filter((row) => row.eventId === entrant.eventId && row.sex === entrant.sex && row.swimmerId === swimmerId)
          .sort((a, b) => Number(a.heatOrder || a.series || 999) - Number(b.heatOrder || b.series || 999));
        if (state.series !== "all") {
          const current = rows.find((row) => isFinalStage(state.series) ? row.stage === state.series : Number(row.series) === Number(state.series));
          if (current) return current;
        }
        return rows[0] || null;
      }
      
      function relayLegCount(entrant) {
        const event = data.events.find((item) => item.id === entrant.eventId);
        const label = `${entrant.eventId || ""} ${event?.label || ""}`;
        const match = label.match(/(\d+)x/i);
        return match ? Number(match[1]) : 4;
      }
      
      function decisionOptionsForEntrant(entrant) {
        const relay = isRelayEntrant(entrant);
        const event = data.events.find((item) => item.id === entrant.eventId);
        const discipline = String(event?.discipline || event?.label || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();
        const forbidsUnderwaterAndImmersion = discipline.includes("apnee") || discipline.includes("immersion");
        const isImmersionRace = discipline.includes("immersion");
        return [
          ["forfait", "Forfait"],
          ["abandon", "Abandon"],
          ["false_start", "DSQ - faux départ"],
          ...(relay ? [["relay_early_start", "DSQ - départ anticipé"]] : []),
          ...(!forbidsUnderwaterAndImmersion ? [["underwater_15m", "DSQ - coulée supérieure à 15 m"]] : []),
          ...(!forbidsUnderwaterAndImmersion ? [["immersion", "DSQ - passage en immersion"]] : []),
          ...(isImmersionRace ? [["bottle_fault", "DSQ - faute de bouteille"]] : []),
          ["interference", "DSQ - gêne d'un concurrent"],
          ["other_dsq", "DSQ - autre motif"]
        ];
      }
      
      function renderDecisionPanel() {
        if (!decisionPanel) return;
        if (state.role !== "referee") {
          decisionPanel.hidden = true;
          decisionPanel.innerHTML = "";
          closeDecisionModal();
          return;
        }
        const entrant = selectedEntrant();
        const modalOpen = Boolean(decisionModal && !decisionModal.hidden && decisionModal.innerHTML.trim());
        decisionPanel.hidden = false;
        decisionPanel.innerHTML = livePalmesRefereeView.renderDecisionPanelHtml({
          modalOpen,
          selectedName: entrant ? formatDisplayName(entrant) : ""
        });
      }
      
      function createDecisionDraft() {
        return {
          type: "",
          relayLeg: "",
          lengthType: "start",
          lengthNumber: "1",
          comment: ""
        };
      }
      
      function openDecisionModal() {
        const entrant = selectedEntrant();
        if (!decisionModal || state.role !== "referee" || !entrant) return;
        decisionDraft = createDecisionDraft();
        renderDecisionModal();
      }
      
      function closeDecisionModal({ clearSelection = false } = {}) {
        if (!decisionModal) return;
        decisionModal.hidden = true;
        decisionModal.innerHTML = "";
        if (clearSelection) {
          state.selectedSwimmerId = "";
          renderEntrants();
          renderDecisionPanel();
        }
      }
      
      function decisionNeedsDetail(type) {
        return type === "relay_early_start" || type === "underwater_15m";
      }
      
      function decisionNeedsRelayLeg(type, entrant) {
        return isRelayEntrant(entrant) && ["relay_early_start", "underwater_15m", "immersion", "bottle_fault", "interference", "other_dsq"].includes(type);
      }
      
      function decisionNeedsLengthPosition(type) {
        return type === "underwater_15m";
      }
      
      function decisionDraftIsReady(entrant) {
        if (!decisionDraft.type) return false;
        if (decisionNeedsRelayLeg(decisionDraft.type, entrant) && !decisionDraft.relayLeg) return false;
        if (decisionNeedsLengthPosition(decisionDraft.type)) {
          return decisionDraft.lengthType === "start" || Boolean(String(decisionDraft.lengthNumber || "").trim());
        }
        return true;
      }
      
      function defaultDecisionDetail(type, entrant) {
        if (decisionNeedsRelayLeg(type, entrant)) {
          decisionDraft.relayLeg = "2";
        } else if (type === "underwater_15m" && isRelayEntrant(entrant)) {
          decisionDraft.relayLeg = "1";
        } else {
          decisionDraft.relayLeg = "";
        }
        if (type === "underwater_15m" && isRelayEntrant(entrant)) {
          decisionDraft.relayLeg = "1";
        }
        decisionDraft.lengthType = "start";
        decisionDraft.lengthNumber = "1";
      }
      
      function renderDecisionModal() {
        const entrant = selectedEntrant();
        if (!decisionModal || !entrant) return;
        const relay = isRelayEntrant(entrant);
        const legCount = relayLegCount(entrant);
        const row = entrantSeriesRow(entrant);
        const event = data.events.find((item) => item.id === entrant.eventId);
        const sexLabel = entrant.sex === "F" ? "Femmes" : (entrant.sex === "M" ? "Hommes" : "Mixte");
        const modalSeriesLabel = row?.stage && isFinalStage(row.stage)
          ? finalStageLabel(row.stage)
          : `Série ${row?.series || (state.series === "all" ? "-" : state.series)}`;
        const modalLineLabel = row?.line || entrant.lane || entrant.seriesInfo?.line || "-";
        const modalRaceInfo = `${event?.label || entrant.eventId} ${sexLabel} - ${modalSeriesLabel} - Ligne ${modalLineLabel}`;
        const activeDecisions = activeDsqAlertsForEntrant(entrant);
        decisionModal.hidden = false;
        decisionModal.innerHTML = livePalmesRefereeView.renderDecisionModalHtml({
          activeDecisions: activeDecisions.map((alert) => ({ id: alert.id, label: decisionMotifLabel(alert) })),
          choices: decisionOptionsForEntrant(entrant).map(([value, label]) => ({
            active: decisionDraft.type === value,
            label,
            value
          })),
          decisionDraft,
          entrantName: formatDisplayName(entrant),
          firstLeg: decisionDraft.type === "relay_early_start" ? 2 : 1,
          legCount,
          lineLabel: modalLineLabel,
          raceInfo: modalRaceInfo,
          ready: decisionDraftIsReady(entrant),
          relay,
          showLengthSelector: decisionDraft.type === "underwater_15m",
          showRelayLeg: decisionNeedsRelayLeg(decisionDraft.type, entrant)
        });
      }
      
      function decisionRoute(type) {
        if (type === "forfait" || type === "abandon") return "computer";
        if (type === "false_start" || type === "relay_early_start" || type === "underwater_15m") return "video";
        return "official";
      }
      
      function createDecisionAlert(decision) {
        const entrant = selectedEntrant();
        if (!entrant) return;
        const type = decision.type || "";
        const route = decisionRoute(type);
        const row = entrantSeriesRow(entrant);
        const now = new Date().toISOString();
        const alert = {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          competitionId: "local",
          roleSource: "referee",
          eventId: entrant.eventId,
          sex: entrant.sex,
          session: row?.session || state.session,
          series: row?.series || (state.series === "all" ? "" : state.series),
          stage: row?.stage || (isFinalStage(state.series) ? state.series : "series"),
          line: row?.line || entrant.lane || entrant.seriesInfo?.line || "",
          swimmerId: entrant.swimmerId || entrantKey(entrant),
          displayName: formatDisplayName(entrant),
          club: isRelayEntrant(entrant) ? (entrant.clubCode || entrant.club || "") : (entrant.club || ""),
          clubCode: shortClubName(entrant),
          type,
          comment: decision.comment?.trim() || "",
          relayLeg: decisionNeedsRelayLeg(type, entrant) ? (decision.relayLeg || "") : "",
          lengthType: type === "underwater_15m" ? (decision.lengthType || "") : "",
          lengthNumber: type === "underwater_15m" && decision.lengthType === "length" ? (decision.lengthNumber || "") : "",
          requiresVideo: route === "video",
          videoStatus: route === "video" ? "pending" : "none",
          speakerStatus: route === "official" ? "pending" : "none",
          secretaryStatus: type === "forfait" ? "pending" : "none",
          informaticsStatus: route === "computer" || route === "official" ? "pending" : "none",
          createdAt: now,
          updatedAt: now
        };
        alerts.unshift(alert);
        saveAlerts();
        syncAlertToFirestore(alert);
        state.selectedSwimmerId = "";
        render();
      }
      
      function renderRoleQueue() {
        if (!roleQueue) return;
        if (isSpeakerView() || state.role === "referee") {
          roleQueue.hidden = true;
          roleQueue.innerHTML = "";
          return;
        }
        const rows = alerts
          .filter(currentRoleAlertFilter)
          .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
        const title = state.role === "video" ? "Demandes vidéo à vérifier" : "Informations";
        roleQueue.hidden = false;
        roleQueue.innerHTML = livePalmesRoleQueueView.renderRoleQueueHtml({
          helpers: {
            alertCommentLabel,
            alertRaceLabel,
            alertSwimmerLabel,
            decisionMotifLabel,
            formatAlertTime,
            sexDisplayLabel
          },
          role: state.role,
          rows,
          title
        });
      }
      
      function updateAlert(alertId, changes) {
        const index = alerts.findIndex((alert) => alert.id === alertId);
        if (index === -1) return;
        const updatedAt = new Date().toISOString();
        const nextChanges = { ...changes, updatedAt };
        alerts[index] = { ...alerts[index], ...nextChanges };
        saveAlerts();
        syncAlertChangesToFirestore(alertId, nextChanges);
        render();
      }
      
      function markSpeakerAlertDoneLocally(alertId, announcedAt = new Date().toISOString()) {
        const index = alerts.findIndex((alert) => alert.id === alertId);
        if (index === -1) return null;
        const previous = { ...alerts[index] };
        alerts[index] = {
          ...alerts[index],
          speakerStatus: "done",
          speakerAnnouncedAt: announcedAt,
          updatedAt: announcedAt
        };
        saveAlerts();
        render();
        return previous;
      }
      
      function restoreAlertLocally(previousAlert) {
        if (!previousAlert?.id) return;
        const index = alerts.findIndex((alert) => alert.id === previousAlert.id);
        if (index === -1) return;
        alerts[index] = previousAlert;
        saveAlerts();
        render();
      }
      
      function cloneAlertForCancellation(source, type, by) {
        const now = new Date().toISOString();
        return {
          ...source,
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          originalAlertId: source.id,
          type,
          roleSource: by,
          requiresVideo: false,
          videoStatus: "none",
          speakerStatus: isDsqAlert(source) ? "pending" : "none",
          informaticsStatus: "pending",
          createdAt: now,
          updatedAt: now,
          speakerAnnouncedAt: "",
          informaticsDoneAt: "",
          videoConfirmedAt: "",
          videoRejectedAt: "",
          cancelledAt: "",
          cancelledBy: ""
        };
      }
      
      function cancelDecision(alertId, cancelledBy = "referee") {
        const index = alerts.findIndex((alert) => alert.id === alertId);
        if (index === -1 || alerts[index].cancelledAt || isRequalificationAlert(alerts[index])) return;
        const source = alerts[index];
        const now = new Date().toISOString();
        const updates = {
          cancelledAt: now,
          cancelledBy,
          speakerStatus: source.speakerStatus === "pending" ? "none" : source.speakerStatus,
          informaticsStatus: source.informaticsStatus === "pending" ? "none" : source.informaticsStatus,
          secretaryStatus: source.secretaryStatus === "pending" ? "none" : source.secretaryStatus
        };
        const updatedSource = { ...source, ...updates, updatedAt: now };
        alerts[index] = updatedSource;
        const shouldNotifySpeaker = isDsqAlert(source) && (source.speakerStatus === "done" || cancelledBy === "delegate");
        const shouldNotifyComputer = source.informaticsStatus === "done" || cancelledBy === "delegate";
        if (shouldNotifySpeaker || shouldNotifyComputer) {
          const type = cancelledBy === "delegate" ? "requalification" : "ja_cancellation";
          const cancellationAlert = cloneAlertForCancellation(source, type, cancelledBy);
          cancellationAlert.speakerStatus = shouldNotifySpeaker ? "pending" : "none";
          cancellationAlert.informaticsStatus = shouldNotifyComputer ? "pending" : "none";
          alerts.unshift(cancellationAlert);
          syncAlertToFirestore(cancellationAlert);
        }
        saveAlerts();
        syncAlertToFirestore(updatedSource);
        render();
      }

      return {
        selectedEntrant,
        entrantSeriesRow,
        relayLegCount,
        decisionOptionsForEntrant,
        renderDecisionPanel,
        createDecisionDraft,
        openDecisionModal,
        closeDecisionModal,
        decisionNeedsDetail,
        decisionNeedsRelayLeg,
        decisionNeedsLengthPosition,
        decisionDraftIsReady,
        defaultDecisionDetail,
        renderDecisionModal,
        decisionRoute,
        createDecisionAlert,
        renderRoleQueue,
        updateAlert,
        markSpeakerAlertDoneLocally,
        restoreAlertLocally,
        cloneAlertForCancellation,
        cancelDecision
      };
    }
  }

  window.LivePalmesDecisionWorkflow = { init };
}());
