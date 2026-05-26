(function attachLivePalmesAdminDiagnostics(global) {
  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function diagnosticItem(label, value, status = "ok") {
    return `
      <span class="diagnostic-item ${escapeHtml(status)}">
        <strong>${escapeHtml(value)}</strong>
        <small>${escapeHtml(label)}</small>
      </span>
    `;
  }

  function technicalDiagnosticStatus(value, warnLimit = 0, dangerLimit = Number.POSITIVE_INFINITY) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "neutral";
    if (number >= dangerLimit) return "warn";
    if (number > warnLimit) return "warn";
    return "ok";
  }

  function technicalDiagnosticSection(title, items = []) {
    return `
      <div class="technical-diagnostic-section">
        <h3>${escapeHtml(title)}</h3>
        <div class="competition-diagnostic">
          ${items.map((item) => diagnosticItem(item.label, item.value, item.status || "neutral")).join("")}
        </div>
      </div>
    `;
  }

  function alertPendingTargets(alert, options = {}) {
    const {
      isResolvedByResult = () => false,
      liveDismissedIds = [],
      respectLiveDismissed = true
    } = options;
    if (!alert || alert.cancelledAt || alert.type === "final_composition_ready") return [];
    const targets = [];
    if (alert.speakerStatus === "pending" && !isResolvedByResult(alert)) targets.push("speaker");
    if (
      alert.speakerStatus !== "none" &&
      alert.type !== "finalists_announcement" &&
      alert.type !== "finalist_replacement_announcement" &&
      (!respectLiveDismissed || !liveDismissedIds.includes(alert.id))
    ) {
      targets.push("live");
    }
    if (alert.requiresVideo && alert.videoStatus === "pending") targets.push("video");
    if (alert.informaticsStatus === "pending") targets.push("computer");
    if (alert.type === "forfait" && alert.secretaryStatus === "pending") targets.push("secretary");
    if (alert.roleSource === "referee" && !alert.informaticsDoneAt && !alert.speakerAnnouncedAt) targets.push("referee");
    return [...new Set(targets)];
  }

  function alertPendingBreakdown(rows = [], options = {}) {
    const counts = {
      live: 0,
      speaker: 0,
      video: 0,
      computer: 0,
      secretary: 0,
      referee: 0
    };
    const pending = [];
    rows.forEach((alert) => {
      const targets = alertPendingTargets(alert, options);
      if (!targets.length) return;
      targets.forEach((target) => {
        counts[target] += 1;
      });
      pending.push({ alert, targets });
    });
    return {
      counts,
      total: pending.length,
      examples: pending
        .sort((a, b) => String(b.alert.createdAt || "").localeCompare(String(a.alert.createdAt || "")))
        .slice(0, options.exampleLimit || 8)
        .map(({ alert, targets }) => ({
          id: alert.id || "",
          targets,
          type: options.decisionMotifLabel?.(alert) || alert.type || "",
          status: options.alertStatusLabel?.(alert) || "",
          race: options.alertRaceLabel?.(alert) || "",
          identity: options.fullAlertIdentityLabel?.(alert) || "",
          createdAt: alert.createdAt || alert.updatedAt || ""
        }))
    };
  }

  function alertTargetsLabel(targets = []) {
    const labels = {
      live: "Live",
      speaker: "Speaker",
      video: "Vid\u00e9o",
      computer: "Bureau perf",
      secretary: "Secr\u00e9tariat",
      referee: "JA"
    };
    return targets.map((target) => labels[target] || target).join(", ");
  }

  function resultHasDetails(result) {
    return Boolean(result && (
      (Array.isArray(result.ranking) && result.ranking.length) ||
      (Array.isArray(result.performances) && result.performances.length) ||
      (Array.isArray(result.nextUnqualified) && result.nextUnqualified.length) ||
      (Array.isArray(result.finalists?.a) && result.finalists.a.length) ||
      (Array.isArray(result.finalists?.b) && result.finalists.b.length)
    ));
  }

  global.LivePalmesAdminDiagnostics = {
    alertPendingBreakdown,
    alertPendingTargets,
    alertTargetsLabel,
    diagnosticItem,
    resultHasDetails,
    technicalDiagnosticSection,
    technicalDiagnosticStatus
  };
})(window);
