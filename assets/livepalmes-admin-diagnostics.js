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

  function renderCompetitionDiagnosticHtml(options = {}) {
    const {
      pendingAlerts = 0,
      programCount = 0,
      publicResultCount = 0,
      resultCount = 0,
      seriesCount = 0,
      seriesPdfCount = 0,
      sessionCount = 0,
      speakerInfoUpdatedAt = ""
    } = options;
    return `
      <div class="competition-diagnostic" aria-label="Diagnostic compétition">
        ${diagnosticItem("sessions", String(sessionCount || 0), sessionCount ? "ok" : "warn")}
        ${diagnosticItem("courses programme", String(programCount), programCount ? "ok" : "warn")}
        ${diagnosticItem("lignes séries", String(seriesCount || 0), seriesCount ? "ok" : "warn")}
        ${diagnosticItem("résultats publiés", `${publicResultCount}/${resultCount}`, resultCount ? "ok" : "neutral")}
        ${diagnosticItem("PDF séries publics", String(seriesPdfCount), seriesPdfCount ? "ok" : "neutral")}
        ${diagnosticItem("actions en attente", String(pendingAlerts), pendingAlerts ? "warn" : "ok")}
        ${diagnosticItem("repères speaker", speakerInfoUpdatedAt || "non faits", speakerInfoUpdatedAt ? "ok" : "warn")}
      </div>
    `;
  }

  function renderPerformanceDiagnosticModalHtml(report, options = {}) {
    const {
      formatByteSize = (value) => String(value || 0)
    } = options;
    const canClean = report?.available && report.legacyPdfCount > 0;
    return `
      <div class="decision-dialog role-codes-dialog" role="dialog" aria-modal="true" aria-label="Diagnostic performance">
        <div class="decision-modal-head">
          <div>
            <span>Performance</span>
            <h2>Diagnostic résultats</h2>
            <p>Contrôle que les PDF résultats sont bien séparés des données live.</p>
          </div>
          <button class="decision-close" type="button" data-role-codes-close aria-label="Fermer">×</button>
        </div>
        ${report?.available ? `
          <div class="competition-diagnostic" aria-label="Diagnostic performance résultats">
            ${diagnosticItem("résultats", String(report.resultCount), report.resultCount ? "ok" : "neutral")}
            ${diagnosticItem("PDF séparés", String(report.resultPdfCount), report.resultPdfCount ? "ok" : "neutral")}
            ${diagnosticItem("PDF à nettoyer", String(report.legacyPdfCount), report.legacyPdfCount ? "warn" : "ok")}
            ${diagnosticItem("poids à nettoyer", formatByteSize(report.legacyBytes), report.legacyPdfCount ? "warn" : "ok")}
            ${diagnosticItem("index public", formatByteSize(report.publicIndexBytes), report.publicIndexBytes > 750000 ? "warn" : "ok")}
            ${diagnosticItem("lecture", `${report.readMs} ms`, report.readMs > 5000 ? "warn" : "ok")}
          </div>
          <div class="admin-series-help">
            <strong>${report.legacyPdfCount ? "Nettoyage recommandé" : "Etat correct"}</strong>
            <span>${report.legacyPdfCount ? "Des PDF sont encore stockés dans results et peuvent ralentir les consoles." : "Aucun PDF lourd n'a été détecté dans la liste principale des résultats."}</span>
            <span>Dernier index public : ${escapeHtml(report.publicIndexUpdatedAt || "inconnu")}</span>
          </div>
        ` : `
          <div class="admin-series-help">
            <strong>Diagnostic indisponible</strong>
            <span>${escapeHtml(report?.message || "Firebase n'est pas disponible.")}</span>
          </div>
        `}
        <div class="decision-modal-actions">
          <button class="ghost-button" type="button" data-role-codes-back>Retour</button>
          <button class="ghost-button" type="button" data-performance-diagnostic>Relire</button>
          ${canClean ? `<button class="primary-button" type="button" data-clean-result-pdfs>Nettoyer les PDF résultats</button>` : ""}
        </div>
      </div>
    `;
  }

  function renderPerformanceDiagnosticLoadingHtml() {
    return `
      <div class="decision-dialog role-codes-dialog" role="dialog" aria-modal="true" aria-label="Diagnostic performance">
        <div class="decision-modal-head">
          <div>
            <span>Performance</span>
            <h2>Diagnostic résultats</h2>
            <p>Lecture des compteurs Firebase en cours...</p>
          </div>
        </div>
        <div class="admin-series-help">
          <strong>Analyse en cours</strong>
          <span>LivePalmes vérifie si des PDF lourds sont encore dans results.</span>
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
    renderCompetitionDiagnosticHtml,
    renderPerformanceDiagnosticLoadingHtml,
    renderPerformanceDiagnosticModalHtml,
    resultHasDetails,
    technicalDiagnosticSection,
    technicalDiagnosticStatus
  };
})(window);
