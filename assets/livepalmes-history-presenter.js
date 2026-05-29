(function () {
  function init(context = {}) {
    const {
      DECISION_LABELS,
      alertCommentLabel,
      alertDetailModal,
      alertIdentityLabel,
      alertRaceLabel,
      alertSwimmerLabel,
      compareAlertsForAction,
      currentRoleAlertFilter,
      decisionMotifLabel,
      escapeHtml,
      finalRowsForAnnouncementAlert,
      finalStageLabel,
      fullAlertIdentityLabel,
      historySentence,
      isDsqAlert,
      isFinalStage,
      isRequalificationAlert,
      isSpeakerView,
      livePalmesAlertDetailView,
      livePalmesHistoryView,
      officialAlerts,
      openFinalCompositionModal,
      renderAlertCard,
      renderFinalistsAlertList,
      renderVideoInfoCard,
      roleHistory,
      sexDisplayLabel,
      speakerAlertSentence,
      speakerHistory
    } = context;
    const alerts = new Proxy([], {
      get: (_, prop) => context.alerts?.[prop],
      has: (_, prop) => prop in (context.alerts || []),
      set: (_, prop, value) => {
        const nextAlerts = context.alerts || [];
        nextAlerts[prop] = value;
        context.alerts = nextAlerts;
        return true;
      }
    });
    const data = new Proxy({}, {
      get: (_, prop) => context.data?.[prop],
      set: (_, prop, value) => {
        const nextData = context.data || {};
        nextData[prop] = value;
        context.data = nextData;
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
    const state = new Proxy({}, {
      get: (_, prop) => context.state?.[prop],
      set: (_, prop, value) => {
        const nextState = context.state || {};
        nextState[prop] = value;
        context.state = nextState;
        return true;
      }
    });
    const getRaceResults = () => context.raceResults || [];

      function renderOfficialAlerts() {
        if (!officialAlerts) return;
        const showVideoInfo = ["live", "speaker", "computer"].includes(state.role);
        if (!isSpeakerView() && !showVideoInfo) {
          officialAlerts.hidden = true;
          officialAlerts.innerHTML = "";
          return;
        }
        const videoInfos = showVideoInfo
          ? alerts
            .filter((alert) => !alert.cancelledAt && alert.requiresVideo && alert.videoStatus === "pending")
            .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
          : [];
        const official = isSpeakerView()
          ? alerts
            .filter(currentRoleAlertFilter)
            .sort(compareAlertsForAction)
          : [];
        if (!official.length && !videoInfos.length) {
          officialAlerts.hidden = true;
          officialAlerts.innerHTML = "";
          return;
        }
        const action = state.role === "speaker" ? "Annoncé" : (state.role === "live" ? "Masquer" : "");
        officialAlerts.hidden = false;
        officialAlerts.innerHTML = [
          ...videoInfos.map(renderVideoInfoCard),
          ...official.map((alert) => renderAlertCard(alert, action))
        ].join("");
      }
      
      function formatAlertTime(value) {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      }
      
      function formatAlertDateTime(value) {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        return date.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
      }
      
      function alertStatusLabel(alert) {
        if (alert.type === "final_composition_ready") {
          return alert.informaticsStatus === "done" ? "Composition vérifiée" : "Info à vérifier";
        }
        if (alert.type === "finalists_announcement" && alert.speakerStatus === "done") return "Finalistes annoncés";
        if (alert.type === "finalist_replacement_announcement" && alert.speakerStatus === "done") return "Repêchage annoncé";
        if (alert.cancelledAt) {
          const time = formatAlertTime(alert.cancelledAt);
          const suffix = time ? ` à ${time}` : "";
          return alert.cancelledBy === "delegate" ? `Annulée par le délégué${suffix}` : `Annulée par le JA${suffix}`;
        }
        if (alert.requiresVideo && alert.videoStatus === "pending") return "En attente vidéo";
        if (alert.videoStatus === "rejected") return "Invalidée vidéo";
        if (alert.type === "forfait" && alert.secretaryStatus === "pending" && alert.informaticsStatus === "pending") return "Secrétariat / bureau à traiter";
        if (alert.type === "forfait" && alert.secretaryStatus === "pending") return "À prendre en note secrétariat";
        if (alert.speakerStatus === "pending" && alert.informaticsStatus === "pending") return "À annoncer / à traiter";
        if (alert.speakerStatus === "pending") return "À annoncer";
        if (alert.informaticsStatus === "pending") return "À traiter bureau des performances";
        if (alert.speakerStatus === "done" || alert.informaticsStatus === "done") return "Terminée";
        return "Envoyée";
      }
      
      function alertStatusClass(alert) {
        if (alert.type === "final_composition_ready") {
          return alert.informaticsStatus === "done" ? "status-done" : "status-sent";
        }
        if (alert.cancelledAt) return "status-rejected";
        if (alert.requiresVideo && alert.videoStatus === "pending") return "status-video";
        if (alert.videoStatus === "rejected") return "status-rejected";
        if (alert.speakerStatus === "pending" || alert.informaticsStatus === "pending" || alert.secretaryStatus === "pending") return "status-pending";
        if (alert.speakerStatus === "done" || alert.informaticsStatus === "done" || alert.secretaryStatus === "done") return "status-done";
        return "status-sent";
      }
      
      function alertTimeline(alert) {
        const firstLabel = alert.type === "finalists_announcement"
          ? "Demande annonce"
          : alert.type === "finalist_replacement_announcement"
          ? "Demande repêchage"
          : "JA";
        const items = [
          [firstLabel, alert.createdAt],
          ["Vidéo confirmée", alert.videoConfirmedAt],
          ["Vidéo invalidée", alert.videoRejectedAt],
          ["Secrétariat", alert.secretaryDoneAt],
          ["Speaker", alert.speakerAnnouncedAt],
          ["Bureau des performances", alert.informaticsDoneAt],
          [alert.cancelledBy === "delegate" ? "Délégué" : "Annulation", alert.cancelledAt]
        ].filter(([, value]) => value);
        return items.map(([label, value]) => `${label} ${formatAlertTime(value)}`).join(" - ");
      }
      
      function alertTimelineItems(alert) {
        const related = alerts
          .filter((item) => item.originalAlertId === alert.id)
          .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
        const firstLabel = alert.type === "finalists_announcement"
          ? "Demande annonce finalistes"
          : alert.type === "finalist_replacement_announcement"
          ? "Demande annonce repêchage"
          : "Créée par le JA";
        const items = [
          [firstLabel, alert.createdAt],
          ["Vidéo confirmée", alert.videoConfirmedAt],
          ["Vidéo invalidée", alert.videoRejectedAt],
          ["Pris en note secrétariat", alert.secretaryDoneAt],
          ["Annonce speaker", alert.speakerAnnouncedAt],
          ["Traitée bureau des performances", alert.informaticsDoneAt],
          [alert.cancelledBy === "delegate" ? "Annulée par le délégué" : "Annulée par le JA", alert.cancelledAt]
        ].filter(([, value]) => value);
        related.forEach((item) => {
          const source = item.type === "requalification" ? "délégué" : "JA";
          items.push([`Alerte requalification créée (${source})`, item.createdAt]);
          if (item.speakerAnnouncedAt) items.push(["Requalification annoncée speaker", item.speakerAnnouncedAt]);
          if (item.informaticsDoneAt) items.push(["Requalification traitée bureau des performances", item.informaticsDoneAt]);
        });
        return items;
      }
      
      function renderHistoryItem(alert, options = {}) {
        return livePalmesHistoryView.renderHistoryItem(alert, {
          ...options,
          events: data.events || [],
          helpers: {
            alertCommentLabel,
            alertIdentityLabel,
            alertStatusClass,
            alertStatusLabel,
            alertTimeline,
            decisionMotifLabel,
            finalStageLabel,
            formatAlertTime,
            fullAlertIdentityLabel,
            historyActionForAlert,
            isFinalStage
          }
        });
      }

      function finalHistoryRowName(row = {}) {
        return [row.lastName, row.firstName].filter(Boolean).join(" ") ||
          row.displayName ||
          row.name ||
          "Concurrent";
      }

      function finalHistoryRowClub(row = {}) {
        return String(row.clubCode || row.club || "").toUpperCase();
      }

      function finalHistoryRows(result = {}) {
        return [
          ...(Array.isArray(result.finalists?.a) ? result.finalists.a.map((row) => ({ ...row, finalKey: "a" })) : []),
          ...(Array.isArray(result.finalists?.b) ? result.finalists.b.map((row) => ({ ...row, finalKey: "b" })) : [])
        ];
      }

      function finalHistoryReplacementKey(row = {}) {
        return [
          row.finalKey || "",
          String(row.rank || ""),
          finalHistoryRowName(row).toLocaleUpperCase("fr-FR"),
          String(row.time || "")
        ].join("|");
      }

      function replacementHistoryKeyForAlert(alert = {}) {
        return [
          alert.finalKey || "",
          String(alert.replacementRank || ""),
          String(alert.replacementName || alert.displayName || "").toLocaleUpperCase("fr-FR"),
          String(alert.replacementTime || "")
        ].join("|");
      }

      function syntheticFinalHistoryRows() {
        const doneFinalAnnouncements = new Set(alerts
          .filter((alert) => alert.type === "finalists_announcement" && alert.speakerStatus === "done" && alert.speakerAnnouncedAt)
          .map((alert) => alert.resultId)
          .filter(Boolean));
        const doneReplacements = new Set(alerts
          .filter((alert) => alert.type === "finalist_replacement_announcement" && alert.speakerStatus === "done" && alert.speakerAnnouncedAt)
          .map((alert) => `${alert.resultId || ""}|${replacementHistoryKeyForAlert(alert)}`));
        const rows = [];
        getRaceResults().forEach((result) => {
          if (!result?.id) return;
          const finalists = finalHistoryRows(result);
          if (result.finalistsAnnouncedAt && !doneFinalAnnouncements.has(result.id)) {
            const activeCount = finalists.filter((row) => !row.withdrawnAt).length || finalists.length;
            rows.push({
              id: `history-finalists-${result.id}`,
              syntheticHistory: true,
              type: "finalists_announcement",
              roleSource: "computer",
              resultId: result.id,
              eventId: result.eventId,
              eventLabel: result.eventLabel,
              sex: result.sex,
              sexLabel: result.sexLabel,
              session: result.session || "",
              startTime: result.startTime || "",
              finalistCount: activeCount,
              finalists: result.finalists || { a: [], b: [] },
              nextUnqualified: result.nextUnqualified || [],
              speakerStatus: "done",
              speakerAnnouncedAt: result.finalistsAnnouncedAt,
              createdAt: result.finalistsAnnouncedAt,
              updatedAt: result.finalistsAnnouncedAt
            });
          }
          finalists
            .filter((row) => row.repechaged && row.repechageAnnouncedAt && !row.withdrawnAt)
            .forEach((row) => {
              const key = finalHistoryReplacementKey(row);
              if (doneReplacements.has(`${result.id}|${key}`)) return;
              const name = finalHistoryRowName(row);
              const club = finalHistoryRowClub(row);
              rows.push({
                id: `history-replacement-${result.id}-${key}`,
                syntheticHistory: true,
                type: "finalist_replacement_announcement",
                roleSource: "computer",
                resultId: result.id,
                eventId: result.eventId,
                eventLabel: result.eventLabel,
                sex: result.sex,
                sexLabel: result.sexLabel,
                session: result.session || "",
                startTime: result.startTime || "",
                finalKey: row.finalKey,
                displayName: name,
                clubCode: club,
                replacementName: name,
                replacementClub: club,
                replacementRank: row.rank || "",
                replacementTime: row.time || "",
                speakerStatus: "done",
                speakerAnnouncedAt: row.repechageAnnouncedAt,
                createdAt: row.repechageAnnouncedAt,
                updatedAt: row.repechageAnnouncedAt
              });
            });
        });
        return rows;
      }

      function historyAlertById(alertId) {
        return alerts.find((item) => item.id === alertId) ||
          syntheticFinalHistoryRows().find((item) => item.id === alertId);
      }
      
      function openAlertDetail(alertId) {
        const clickedAlert = historyAlertById(alertId);
        if (!clickedAlert || !alertDetailModal) return;
        if (clickedAlert.type === "final_composition_ready") {
          openFinalCompositionModal(clickedAlert.id, { fromHistory: true });
          return;
        }
        if (clickedAlert.type === "finalists_announcement") {
          openFinalistsAnnouncementModal(clickedAlert.id);
          return;
        }
        const alert = clickedAlert.originalAlertId
          ? (alerts.find((item) => item.id === clickedAlert.originalAlertId) || clickedAlert)
          : clickedAlert;
        const status = alertStatusLabel(alert);
        const event = data.events.find((item) => item.id === alert.eventId);
        const sexLabel = alert.sex === "F" ? "Femmes" : (alert.sex === "M" ? "Hommes" : "Mixte");
        const isInfoAlert = alert.type === "finalist_replacement_announcement" || alert.type === "finalists_announcement" || alert.type === "final_composition_ready";
        const seriesLabel = alert.stage && isFinalStage(alert.stage)
          ? finalStageLabel(alert.stage)
          : `Série ${alert.series || "-"}`;
        const courseLabel = `${event?.label || alert.eventId} ${sexLabel}`;
        const seriesLineLabel = `${seriesLabel} ligne ${alert.line || "-"}`;
        const hasSeriesLine = !isInfoAlert && (alert.line || alert.series || alert.stage);
        const identity = alert.type === "finalist_replacement_announcement"
          ? `${alert.replacementName || "Concurrent"}${alert.replacementClub ? ` - ${alert.replacementClub}` : ""}`
          : alertIdentityLabel(alert);
        const comment = alertCommentLabel(alert);
        const timeline = alertTimelineItems(alert);
        const speakerSentence = state.role === "speaker" ? speakerAlertSentence(alert) : null;
        const clickedSentence = state.role !== "video" && clickedAlert.id !== alert.id ? speakerAlertSentence(clickedAlert) : null;
        const sheetTitle = isInfoAlert ? "Fiche information" : "Fiche décision";
        alertDetailModal.hidden = false;
        alertDetailModal.innerHTML = livePalmesAlertDetailView.renderAlertDetailModalHtml({
          alert,
          clickedSentence,
          comment,
          courseLabel,
          decisionLabel: decisionMotifLabel(alert),
          formatAlertDateTime,
          hasSeriesLine,
          identity,
          seriesLineLabel,
          sheetTitle,
          speakerSentence,
          status,
          statusClass: alertStatusClass(alert),
          timeline
        });
      }
      
      function closeAlertDetail() {
        if (!alertDetailModal) return;
        alertDetailModal.hidden = true;
        alertDetailModal.innerHTML = "";
      }
      
      function openFinalistsAnnouncementModal(alertId) {
        const alert = historyAlertById(alertId);
        if (!alert || !alertDetailModal) return;
        const canMarkAnnounced = state.role === "speaker" && alert.speakerStatus === "pending";
        const finalists = finalRowsForAnnouncementAlert(alert);
        const hasFinalB = Boolean(finalists?.b?.length);
        const finalLabel = hasFinalB ? "les finales" : "la finale";
        const speakerText = `Votre attention s'il vous plait, sont qualifiés pour ${finalLabel} du ${alert.eventLabel || alert.eventId} ${alert.sexLabel || sexDisplayLabel(alert.sex)} :`;
        alertDetailModal.hidden = false;
        alertDetailModal.innerHTML = livePalmesAlertDetailView.renderFinalistsAnnouncementModalHtml({
          alert,
          canMarkAnnounced,
          eventLabel: alert.eventLabel || alert.eventId,
          finalistsListHtml: renderFinalistsAlertList(alert),
          sexLabel: alert.sexLabel || sexDisplayLabel(alert.sex),
          speakerText
        });
      }
      
      function historyActionForAlert(alert) {
        if (alert.cancelledAt || isRequalificationAlert(alert)) return null;
        if (state.role === "referee" && alert.roleSource === "referee") {
          return { action: "cancel-ja", label: "Annuler", className: "danger-button" };
        }
        if (state.role === "video" && isDsqAlert(alert)) {
          return { action: "delegate-cancel", label: "Annulation délégué", className: "danger-button" };
        }
        return null;
      }
      
      function historyFilterKey() {
        return isSpeakerView() ? state.role : state.role;
      }
      
      function historyFilterValue(key) {
        return historyFilters[key] || "all";
      }
      
      function historyAlertMatchesFilter(alert, filter) {
        if (!filter || filter === "all") return true;
        if (filter === "finals") {
          return ["finalists_announcement", "finalist_replacement_announcement", "final_composition_ready"].includes(alert.type);
        }
        if (filter === "dsq") {
          return isDsqAlert(alert) || alert.type === "abandon";
        }
        if (filter === "forfait") {
          return alert.type === "forfait";
        }
        return true;
      }
      
      function filteredHistoryRows(rows, key) {
        const filter = historyFilterValue(key);
        return rows.filter((alert) => historyAlertMatchesFilter(alert, filter));
      }
      
      function historyFilterControl(key) {
        const current = historyFilterValue(key);
        const options = [
          ["all", "Tous"],
          ["finals", "Finalistes / repêchage"],
          ["dsq", "DSQ / abandon"],
          ["forfait", "Forfaits"]
        ];
        return `
          <label class="history-filter">
            <span>Filtrer</span>
            <select data-history-filter="${escapeHtml(key)}">
              ${options.map(([value, label]) => `<option value="${escapeHtml(value)}" ${current === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
            </select>
          </label>
        `;
      }
      
      function historyEmptyLabel(filter) {
        if (filter === "finals") return "Aucune annonce finaliste ou repêchage à afficher.";
        if (filter === "dsq") return "Aucune disqualification ou abandon à afficher.";
        if (filter === "forfait") return "Aucun forfait à afficher.";
        return "Aucune action à afficher pour le moment.";
      }
      
      function renderSpeakerHistory() {
        if (!speakerHistory) return;
        if (!isSpeakerView()) {
          speakerHistory.hidden = true;
          speakerHistory.innerHTML = "";
          return;
        }
        const doneAlerts = [
          ...alerts,
          ...syntheticFinalHistoryRows()
        ]
          .filter((alert) => !isRequalificationAlert(alert))
          .filter((alert) => alert.speakerStatus === "done" || (alert.cancelledAt && alert.speakerAnnouncedAt))
          .sort((a, b) => String(b.speakerAnnouncedAt || b.updatedAt).localeCompare(String(a.speakerAnnouncedAt || a.updatedAt)));
        const filterKey = historyFilterKey();
        const filteredAlerts = filteredHistoryRows(doneAlerts, filterKey);
        speakerHistory.hidden = false;
        speakerHistory.innerHTML = `
          <div class="panel-title">
            <h3>Journal des annonces</h3>
            <div class="history-actions">
              ${historyFilterControl(filterKey)}
              ${historyToggleButton("speaker", filteredAlerts.length)}
            </div>
          </div>
          ${filteredAlerts.length ? `<div class="history-list ${expandedHistories.speaker ? "expanded" : "compact-scroll"}">
            ${filteredAlerts.map((alert) => {
              return renderHistoryItem(alert, { compact: false, timeValue: alert.cancelledAt || alert.speakerAnnouncedAt || alert.updatedAt });
            }).join("")}
          </div>` : `<p class="panel-subtitle">${escapeHtml(historyEmptyLabel(historyFilterValue(filterKey)))}</p>`}
        `;
      }
      
      function renderRoleHistory() {
        if (!roleHistory) return;
        if (isSpeakerView()) {
          roleHistory.hidden = true;
          roleHistory.innerHTML = "";
          return;
        }
        let rows = [];
        let title = "Historique";
        if (state.role === "referee") {
          title = "Historique des décisions JA";
          rows = alerts.filter((alert) => alert.roleSource === "referee" && !isRequalificationAlert(alert));
        } else if (state.role === "video") {
          title = "Historique vidéo";
          rows = alerts.filter((alert) => isDsqAlert(alert));
        } else if (state.role === "computer") {
          title = "Journal d'arbitrage et annonces";
          rows = [
            ...alerts,
            ...syntheticFinalHistoryRows()
          ].filter((alert) => alert.roleSource === "referee" || (
            (alert.type === "finalists_announcement" || alert.type === "finalist_replacement_announcement") &&
            alert.speakerStatus === "done"
          ));
        } else if (state.role === "secretary") {
          title = "Journal d'arbitrage et annonces";
          rows = [
            ...alerts,
            ...syntheticFinalHistoryRows()
          ].filter((alert) => alert.roleSource === "referee" || (
            (alert.type === "finalists_announcement" || alert.type === "finalist_replacement_announcement") &&
            alert.speakerStatus === "done"
          ));
        }
        rows = rows
          .sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
        const filterKey = historyFilterKey();
        const filteredRows = filteredHistoryRows(rows, filterKey);
        if (!rows.length) {
          if (!["referee", "video", "computer", "secretary"].includes(state.role)) {
            roleHistory.hidden = true;
            roleHistory.innerHTML = "";
            return;
          }
          roleHistory.hidden = false;
          const historyActions = state.role === "computer" ? `
            <button class="history-toggle" type="button" data-history-export-pdf>Export journal</button>
          ` : "";
          roleHistory.innerHTML = `
            <div class="panel-title">
              <h3>${escapeHtml(title)}</h3>
              <div class="history-actions">
                ${historyFilterControl(filterKey)}
                ${historyActions}
              </div>
            </div>
            <p class="panel-subtitle">Aucune action à afficher pour le moment.</p>
          `;
          return;
        }
        roleHistory.hidden = false;
        const computerHistoryActions = state.role === "computer" ? `
          <button class="history-toggle" type="button" data-history-export-pdf>Export journal</button>
        ` : "";
        roleHistory.innerHTML = `
          <div class="panel-title">
            <h3>${escapeHtml(title)}</h3>
            <div class="history-actions">
              ${historyFilterControl(filterKey)}
              ${historyToggleButton("role", filteredRows.length)}
              ${computerHistoryActions}
            </div>
          </div>
          ${filteredRows.length ? `<div class="history-list ${expandedHistories.role ? "expanded" : "compact-scroll"}">
            ${filteredRows.map((alert) => renderHistoryItem(alert, { timeValue: alert.cancelledAt || alert.createdAt, showIdentity: state.role === "video" })).join("")}
          </div>` : `<p class="panel-subtitle">${escapeHtml(historyEmptyLabel(historyFilterValue(filterKey)))}</p>`}
        `;
      }
      
      function historyToggleButton(historyKey, rowCount) {
        if (rowCount <= 5) return "";
        const expanded = Boolean(expandedHistories[historyKey]);
        return `<button class="history-toggle" type="button" data-history-toggle="${escapeHtml(historyKey)}">${expanded ? "Réduire le journal" : "Agrandir le journal"}</button>`;
      }

      return {
        renderOfficialAlerts,
        formatAlertTime,
        formatAlertDateTime,
        alertStatusLabel,
        alertStatusClass,
        alertTimeline,
        alertTimelineItems,
        renderHistoryItem,
        openAlertDetail,
        closeAlertDetail,
        openFinalistsAnnouncementModal,
        historyActionForAlert,
        historyFilterKey,
        historyFilterValue,
        historyAlertMatchesFilter,
        filteredHistoryRows,
        historyFilterControl,
        historyEmptyLabel,
        renderSpeakerHistory,
        renderRoleHistory,
        historyToggleButton,
        syntheticFinalHistoryRows
      };
  }

  window.LivePalmesHistoryPresenter = { init };
}());
