(function attachLivePalmesHistoryView(global) {
  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderHistoryItem(alert, options = {}) {
    const helpers = options.helpers || {};
    const status = helpers.alertStatusLabel?.(alert) || "";
    const timeline = helpers.alertTimeline?.(alert) || "";
    const event = (options.events || []).find((item) => item.id === alert.eventId);
    const sexLabel = alert.sex === "F" ? "Femmes" : (alert.sex === "M" ? "Hommes" : "Mixte");
    const isFinalAnnouncement = alert.type === "finalists_announcement" || alert.type === "finalist_replacement_announcement";
    const seriesLabel = alert.type === "final_composition_ready"
      ? "Finales"
      : isFinalAnnouncement
      ? "Finales"
      : alert.stage && helpers.isFinalStage?.(alert.stage)
      ? helpers.finalStageLabel?.(alert.stage)
      : `Série ${alert.series || "-"}`;
    const courseLine = alert.type === "final_composition_ready"
      ? `${alert.eventLabel || event?.label || alert.eventId} ${alert.sexLabel || sexLabel} - Composition finale`
      : isFinalAnnouncement
      ? `${alert.eventLabel || event?.label || alert.eventId} ${alert.sexLabel || sexLabel} - ${seriesLabel}`
      : `${event?.label || alert.eventId} ${sexLabel} - ${seriesLabel} - Ligne ${alert.line || "-"}`;
    const motif = helpers.decisionMotifLabel?.(alert) || "";
    const identity = alert.type === "finalists_announcement"
      ? `${alert.finalistCount || 0} finaliste${Number(alert.finalistCount || 0) > 1 ? "s" : ""}`
      : alert.type === "finalist_replacement_announcement"
      ? `${alert.replacementName || alert.displayName || "Concurrent"}${alert.replacementClub || alert.clubCode ? ` - ${alert.replacementClub || alert.clubCode}` : ""}`
      : options.showIdentity ? helpers.fullAlertIdentityLabel?.(alert) : helpers.alertIdentityLabel?.(alert);
    const action = helpers.historyActionForAlert?.(alert);
    const comment = helpers.alertCommentLabel?.(alert) || "";
    return `
      <div class="history-item ${helpers.alertStatusClass?.(alert) || ""} ${options.compact ? "compact-history-item" : ""}" data-history-alert-id="${escapeHtml(alert.id)}">
        <time>${escapeHtml(helpers.formatAlertTime?.(options.timeValue || alert.cancelledAt || alert.createdAt) || "--:--")}</time>
        <span>${escapeHtml(courseLine)}</span>
        <strong>${escapeHtml(motif)}</strong>
        <small>${escapeHtml(identity || "")}</small>
        ${comment ? `<em class="history-comment">Remarque JA : ${escapeHtml(comment)}</em>` : ""}
        <em>${escapeHtml(status)}${timeline ? ` - ${escapeHtml(timeline)}` : ""}</em>
        ${action ? `<button class="history-action ${escapeHtml(action.className)}" type="button" data-history-action="${escapeHtml(action.action)}">${escapeHtml(action.label)}</button>` : ""}
      </div>
    `;
  }

  global.LivePalmesHistoryView = {
    renderHistoryItem
  };
})(window);
