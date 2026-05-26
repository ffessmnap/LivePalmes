(function attachLivePalmesAlerts(global) {
  function actionCountLabel(count) {
    const value = Number(count || 0);
    return `${value} action${value > 1 ? "s" : ""}`;
  }

  function isFinalResultAlert(alert) {
    return alert?.type === "finalists_announcement" || alert?.type === "finalist_replacement_announcement";
  }

  function isRequalificationAlert(alert) {
    return alert?.type === "requalification" || alert?.type === "ja_cancellation";
  }

  function isDsqAlert(alert) {
    return !["forfait", "abandon", "requalification", "ja_cancellation", "finalists_announcement", "finalist_replacement_announcement"].includes(alert?.type);
  }

  function homeActionCounts(alerts = [], emptyCounts = {}) {
    const counts = { ...emptyCounts };
    alerts.forEach((alert) => {
      if (alert.cancelledAt || alert.type === "final_composition_ready") return;
      if (alert.speakerStatus === "pending") counts.speaker = (counts.speaker || 0) + 1;
      if (alert.requiresVideo && alert.videoStatus === "pending") counts.video = (counts.video || 0) + 1;
      if (alert.informaticsStatus === "pending") counts.computer = (counts.computer || 0) + 1;
      if (alert.type === "forfait" && alert.secretaryStatus === "pending") counts.secretary = (counts.secretary || 0) + 1;
    });
    return counts;
  }

  function controlTowerPendingCounts(alerts = []) {
    const counts = {
      speaker: 0,
      video: 0,
      computer: 0,
      secretary: 0,
      referee: 0
    };
    alerts.forEach((alert) => {
      if (alert.cancelledAt || alert.type === "final_composition_ready") return;
      if (alert.speakerStatus === "pending") counts.speaker += 1;
      if (alert.requiresVideo && alert.videoStatus === "pending") counts.video += 1;
      if (alert.informaticsStatus === "pending") counts.computer += 1;
      if (alert.type === "forfait" && alert.secretaryStatus === "pending") counts.secretary += 1;
      if (alert.roleSource === "referee" && !alert.informaticsDoneAt && !alert.speakerAnnouncedAt && !alert.cancelledAt) counts.referee += 1;
    });
    return counts;
  }

  function speakerAlertAlreadyResolvedByResult(alert, results = [], finalistRowName = () => "") {
    if (alert?.type === "finalists_announcement") {
      const result = results.find((item) => item.id === alert.resultId);
      return Boolean(result?.finalistsAnnouncedAt);
    }
    if (alert?.type === "finalist_replacement_announcement") {
      const result = results.find((item) => item.id === alert.resultId);
      if (!result) return false;
      return ["a", "b"].some((finalKey) => (result.finalists?.[finalKey] || []).some((row) =>
        row.repechaged &&
        row.repechageAnnouncedAt &&
        finalistRowName(row) === alert.replacementName &&
        (!alert.replacementRank || String(row.rank || "") === String(alert.replacementRank || ""))
      ));
    }
    return false;
  }

  function currentRoleAlertFilter(alert, options = {}) {
    const {
      role = "",
      liveDismissedAlertIds = [],
      resolvedByResult = false
    } = options;
    if (alert.type === "final_composition_ready") return false;
    if (alert.cancelledAt) return false;
    if (resolvedByResult) return false;
    if (role === "live") {
      if (isFinalResultAlert(alert)) return false;
      return alert.speakerStatus !== "none" && !liveDismissedAlertIds.includes(alert.id);
    }
    if (role === "speaker") return alert.speakerStatus === "pending";
    if (role === "video") return alert.requiresVideo && alert.videoStatus === "pending";
    if (role === "computer") return alert.informaticsStatus === "pending";
    if (role === "secretary") {
      if (alert.type === "forfait" && alert.secretaryStatus === "pending") return true;
      return alert.speakerStatus === "pending" && isFinalResultAlert(alert);
    }
    return false;
  }

  function alertLineCode(alert) {
    const codes = {
      forfait: "ABS",
      abandon: "ABD",
      false_start: "FD",
      relay_early_start: "DA",
      underwater_15m: "+15m",
      immersion: "FSTYLE",
      bottle_fault: "BOUT",
      interference: "GENE",
      other_dsq: "AUTRE"
    };
    return codes[alert?.type] || "";
  }

  global.LivePalmesAlerts = {
    actionCountLabel,
    alertLineCode,
    controlTowerPendingCounts,
    currentRoleAlertFilter,
    homeActionCounts,
    isDsqAlert,
    isFinalResultAlert,
    isRequalificationAlert,
    speakerAlertAlreadyResolvedByResult
  };
})(window);
