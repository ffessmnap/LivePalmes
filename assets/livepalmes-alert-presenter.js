(function () {
  function init(context = {}) {
    with (context) {
      function currentRoleAlertFilter(alert) {
        return livePalmesAlerts.currentRoleAlertFilter(alert, {
          role: state.role,
          liveDismissedAlertIds,
          resolvedByResult: speakerAlertAlreadyResolvedByResult(alert)
        });
      }
      
      function speakerAlertAlreadyResolvedByResult(alert) {
        return livePalmesAlerts.speakerAlertAlreadyResolvedByResult(alert, raceResults, finalistRowName);
      }
      
      function isRequalificationAlert(alert) {
        return livePalmesAlerts.isRequalificationAlert(alert);
      }
      
      function alertRaceLabel(alert) {
        if (alert.type === "final_composition_ready") {
          return `${alert.eventLabel || alert.eventId} - ${alert.sexLabel || sexDisplayLabel(alert.sex)}`;
        }
        const event = data.events.find((item) => item.id === alert.eventId);
        const sex = alert.sex === "F" ? "Femmes" : (alert.sex === "M" ? "Hommes" : "Mixte");
        const series = alert.stage && isFinalStage(alert.stage)
          ? finalStageLabel(alert.stage)
          : `Série ${alert.series || "-"}`;
        return `${event?.label || alert.eventId} - ${sex} - ${series} - ligne ${alert.line || "-"}`;
      }
      
      function alertSwimmerLabel(alert) {
        return `${alert.displayName || "Concurrent"}${alert.club ? ` - ${alert.club}` : ""}`;
      }
      
      function alertIdentityLabel(alert) {
        if (state.role === "video") return "Concurrent non affiché";
        return `${alert.displayName || "Concurrent"}${alertClubShortLabel(alert) ? ` - ${alertClubShortLabel(alert)}` : ""}`;
      }
      
      function fullAlertIdentityLabel(alert) {
        return `${alert.displayName || "Concurrent"}${alertClubShortLabel(alert) ? ` - ${alertClubShortLabel(alert)}` : ""}`;
      }
      
      function alertClubShortLabel(alert) {
        return String(alert.clubCode || alert.club || "").toUpperCase();
      }
      
      function alertDetailLabel(alert) {
        const parts = [];
        if (alert.relayLeg) parts.push(`relayeur ${alert.relayLeg}`);
        if (alert.lengthType === "start") parts.push("au départ");
        if (alert.lengthType === "length" && alert.lengthNumber) parts.push(`longueur n° ${alert.lengthNumber}`);
        return parts.join(" - ");
      }
      
      function alertCommentLabel(alert) {
        return alert.comment || "";
      }
      
      function decisionMotifLabel(alert) {
        if (alert.type === "finalists_announcement") return "Finalistes à annoncer";
        if (alert.type === "finalist_replacement_announcement") return "Repêchage finale à annoncer";
        if (alert.type === "final_composition_ready") return "Composition finale définitive";
        if (alert.type === "requalification") return "Requalification - décision du délégué";
        if (alert.type === "ja_cancellation") return "Requalification - annulation par le JA";
        if (alert.type === "forfait") return "Forfait non déclaré";
        const motif = DECISION_LABELS[alert.type] || alert.type;
        const detail = alertDetailLabel(alert);
        return detail ? `${motif} - ${detail}` : motif;
      }
      
      function speakerAlertSentence(alert) {
        if (alert.type === "finalists_announcement") {
          return {
            text: `Finalistes à annoncer pour ${alert.eventLabel || alert.eventId} ${alert.sexLabel || sexDisplayLabel(alert.sex)}.`,
            identity: `${alert.finalistCount || 0} finaliste${Number(alert.finalistCount || 0) > 1 ? "s" : ""}`
          };
        }
        if (alert.type === "finalist_replacement_announcement") {
          return {
            text: `Suite à un forfait en finale, ${alert.replacementName || "un nageur"} est qualifié${alert.sex === "F" ? "e" : ""} en finale du ${alert.eventLabel || alert.eventId} ${alert.sexLabel || sexDisplayLabel(alert.sex)}.`,
            identity: alert.replacementClub ? `${alert.replacementName || "Concurrent"} - ${alert.replacementClub}` : (alert.replacementName || "Concurrent")
          };
        }
        const event = data.events.find((item) => item.id === alert.eventId);
        const sexLabel = alert.sex === "F" ? "Femmes" : (alert.sex === "M" ? "Hommes" : "Mixte");
        const personLabel = alert.sex === "F" ? "la nageuse" : "le nageur";
        const agreement = alert.sex === "F" ? "e" : "";
        const seriesLabel = alert.stage && isFinalStage(alert.stage)
          ? finalStageLabel(alert.stage)
          : `série ${alert.series || "-"}`;
        const reason = SPEAKER_DECISION_REASONS[alert.type] || (DECISION_LABELS[alert.type] || alert.type).replace(/^DSQ -\s*/i, "");
        const detail = alertDetailLabel(alert);
        const comment = alertCommentLabel(alert);
        const club = alertClubShortLabel(alert);
        if (isRequalificationAlert(alert)) {
          const source = alert.type === "requalification" ? "suite à la décision du délégué de la compétition" : "suite à l'annulation de la décision par le délégué";
          return {
            text: `${source}, ${personLabel} de la ligne ${alert.line || "-"} sur ${event?.label || alert.eventId} ${sexLabel} a été requalifié${agreement}.`,
            identity: `${alert.displayName || "Concurrent"}${club ? ` - ${club}` : ""}`
          };
        }
        return {
          text: `Lors de la ${seriesLabel} du ${event?.label || alert.eventId} ${sexLabel}, ${personLabel} de la ligne ${alert.line || "-"} a été disqualifié${agreement} pour ${reason}${detail ? ` - ${detail}` : ""}${comment ? ` (${comment})` : ""}.`,
          identity: `${alert.displayName || "Concurrent"}${club ? ` - ${club}` : ""}`
        };
      }
      
      function isDsqAlert(alert) {
        return livePalmesAlerts.isDsqAlert(alert);
      }
      
      function activeDsqAlertsForEntrant(entrant) {
        const swimmerId = entrant.swimmerId || entrantKey(entrant);
        return alerts.filter((alert) => (
          isDsqAlert(alert) &&
          !alert.cancelledAt &&
          alert.videoStatus !== "rejected" &&
          alert.eventId === entrant.eventId &&
          alert.sex === entrant.sex &&
          alert.swimmerId === swimmerId
        ));
      }
      
      function activeLineAlertsForEntrant(entrant) {
        const swimmerId = entrant.swimmerId || entrantKey(entrant);
        return alerts.filter((alert) => (
          !isRequalificationAlert(alert) &&
          !alert.cancelledAt &&
          alert.videoStatus !== "rejected" &&
          alert.eventId === entrant.eventId &&
          alert.sex === entrant.sex &&
          alert.swimmerId === swimmerId
        ));
      }
      
      function alertLineCode(alert) {
        return livePalmesAlerts.alertLineCode(alert);
      }
      
      function renderLineAlertBadges(lineAlerts) {
        if (!lineAlerts.length) return "";
        const terminalStatus = terminalLineStatus(lineAlerts);
        const dsqAlerts = lineAlerts.filter(isDsqAlert);
        const title = lineAlerts.map(decisionMotifLabel).join(" / ");
        const codes = [...new Set(dsqAlerts.map(alertLineCode).filter(Boolean))];
        return livePalmesLineStatusView.renderLineAlertBadgesHtml({ codes, terminalStatus, title });
      }
      
      function terminalLineStatus(lineAlerts) {
        return lineAlerts
          .filter((alert) => alert.type === "forfait" || alert.type === "abandon")
          .sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)))[0] || null;
      }
      
      function importedLineStatusLabel(entrant) {
        if (entrant.importedStatus === "forfait") return "Forfait déclaré";
        return "";
      }
      
      function renderImportedLineStatusBadge(entrant) {
        const label = importedLineStatusLabel(entrant);
        return livePalmesLineStatusView.renderImportedLineStatusBadgeHtml(label);
      }
      
      function renderLineTimeStatus(entrant, lineAlerts) {
        const terminalStatus = terminalLineStatus(lineAlerts);
        const importedLabel = importedLineStatusLabel(entrant);
        return livePalmesLineStatusView.renderLineTimeStatusHtml({ importedLabel, terminalStatus });
      }
      
      function finalistRowName(row) {
        return formatPersonNameParts(row?.firstName, row?.lastName, row?.name) || "Concurrent";
      }
      
      function finalRowsForAnnouncementAlert(alert) {
        const result = alert?.resultId ? raceResults.find((item) => item.id === alert.resultId) : null;
        return normalizeFinalistsOrder(result?.finalists || alert?.finalists || {});
      }
      
      function renderFinalistsAlertList(alert) {
        return livePalmesAlertCardView.renderFinalistsAlertListHtml({
          finalistRowName,
          finals: finalRowsForAnnouncementAlert(alert),
          sex: alert.sex
        });
      }
      
      function alertPriority(alert) {
        if (isDsqAlert(alert)) return 1;
        if (alert.type === "finalists_announcement" || alert.type === "finalist_replacement_announcement" || isRequalificationAlert(alert)) return 2;
        return 3;
      }
      
      function alertPriorityMeta(alert) {
        const time = formatAlertTime(alert.createdAt);
        const priority = alertPriority(alert);
        const label = priority <= 2 ? `Priorité ${priority}` : "Action";
        return [label, time].filter(Boolean).join(" - ");
      }
      
      function compareAlertsForAction(a, b) {
        return alertPriority(a) - alertPriority(b) || String(a.createdAt).localeCompare(String(b.createdAt));
      }
      
      function historySentence(alert) {
        if (isDsqAlert(alert)) return speakerAlertSentence(alert);
        const event = data.events.find((item) => item.id === alert.eventId);
        const sexLabel = alert.sex === "F" ? "Femmes" : (alert.sex === "M" ? "Hommes" : "Mixte");
        const seriesLabel = alert.stage && isFinalStage(alert.stage)
          ? finalStageLabel(alert.stage)
          : `série ${alert.series || "-"}`;
        const reason = DECISION_LABELS[alert.type] || alert.type;
        const club = alertClubShortLabel(alert);
        return {
          text: `Lors de la ${seriesLabel} du ${event?.label || alert.eventId} ${sexLabel}, ligne ${alert.line || "-"} : ${reason}.`,
          identity: `${alert.displayName || "Concurrent"}${club ? ` - ${club}` : ""}`
        };
      }
      
      function renderAlertCard(alert, actionLabel = "") {
        const detail = alertDetailLabel(alert);
        return livePalmesAlertCardView.renderAlertCardHtml(alert, {
          actionLabel,
          alertPriorityMeta,
          alertRaceLabel,
          alertSwimmerLabel,
          decisionLabels: DECISION_LABELS,
          detail,
          isRequalificationAlert,
          isSpeakerView: isSpeakerView(),
          role: state.role,
          sexDisplayLabel,
          speakerAlertSentence
        });
      }
      
      function renderVideoInfoCard(alert) {
        const event = data.events.find((item) => item.id === alert.eventId);
        const seriesLabel = alert.stage && isFinalStage(alert.stage)
          ? finalStageLabel(alert.stage)
          : `série ${alert.series || "-"}`;
        return livePalmesAlertCardView.renderVideoInfoCardHtml({
          eventLabel: event?.label || alert.eventId,
          seriesLabel,
          sexLabel: sexDisplayLabel(alert.sex),
          timeLabel: formatAlertTime(alert.createdAt)
        });
      }
      
      function renderRolePanels() {
        renderOfficialAlerts();
        renderDecisionPanel();
        renderRoleQueue();
        renderResultsAdminPanel();
        renderSecretaryFinalsPanel();
        renderRoleHistory();
        renderComputerFooterPanel();
        renderSpeakerHistory();
      }

      return {
        currentRoleAlertFilter,
        speakerAlertAlreadyResolvedByResult,
        isRequalificationAlert,
        alertRaceLabel,
        alertSwimmerLabel,
        alertIdentityLabel,
        fullAlertIdentityLabel,
        alertClubShortLabel,
        alertDetailLabel,
        alertCommentLabel,
        decisionMotifLabel,
        speakerAlertSentence,
        isDsqAlert,
        activeDsqAlertsForEntrant,
        activeLineAlertsForEntrant,
        alertLineCode,
        renderLineAlertBadges,
        terminalLineStatus,
        importedLineStatusLabel,
        renderImportedLineStatusBadge,
        renderLineTimeStatus,
        finalistRowName,
        finalRowsForAnnouncementAlert,
        renderFinalistsAlertList,
        alertPriority,
        alertPriorityMeta,
        compareAlertsForAction,
        historySentence,
        renderAlertCard,
        renderVideoInfoCard,
        renderRolePanels
      };
    }
  }

  window.LivePalmesAlertPresenter = { init };
}());
