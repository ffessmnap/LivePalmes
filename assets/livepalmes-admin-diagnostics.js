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

  function renderPublicPublicationDiagnosticModalHtml(report, options = {}) {
    const {
      formatByteSize = (value) => String(value || 0)
    } = options;
    const sessions = Array.isArray(report?.sessions) ? report.sessions : [];
    const sizeStatus = (bytes) => Number(bytes || 0) > 900000 ? "warn" : "ok";
    return `
      <div class="decision-dialog role-codes-dialog technical-diagnostic-dialog" role="dialog" aria-modal="true" aria-label="Diagnostic publication publique">
        <div class="decision-modal-head">
          <div>
            <span>Publication publique</span>
            <h2>Diagnostic public</h2>
            <p>ContrÃ´le les index publics, les rÃ©sultats dÃ©taillÃ©s et les PDF de session.</p>
          </div>
          <button class="decision-close" type="button" data-role-codes-close aria-label="Fermer">Ã—</button>
        </div>
        ${report?.available ? `
          ${technicalDiagnosticSection("Index publics", [
            { label: "index rÃ©sultats", value: formatByteSize(report.resultsIndexBytes || 0), status: sizeStatus(report.resultsIndexBytes) },
            { label: "index sÃ©ries", value: formatByteSize(report.seriesIndexBytes || 0), status: sizeStatus(report.seriesIndexBytes) },
            { label: "rÃ©sultats dÃ©taillÃ©s", value: String(report.publicResults || 0), status: report.publicResults ? "ok" : "warn" },
            { label: "PDF sessions", value: String(report.sessionPdfCount || 0), status: report.sessionPdfCount ? "ok" : "neutral" }
          ])}
          <div class="technical-diagnostic-section">
            <h3>Sessions</h3>
            <div class="public-publication-session-list">
              ${sessions.map((session) => `
                <div class="admin-series-help">
                  <strong>Session ${escapeHtml(session.session)} - ${escapeHtml(String(session.publicResults))}/${escapeHtml(String(session.expectedResults))} rÃ©sultat${Number(session.expectedResults || 0) > 1 ? "s" : ""} dÃ©taillÃ©${Number(session.publicResults || 0) > 1 ? "s" : ""}</strong>
                  <span>PDF complet : ${session.hasSessionPdf ? "oui" : "non"} - serveur : ${escapeHtml(String(session.serverResults))} rÃ©sultat${Number(session.serverResults || 0) > 1 ? "s" : ""}</span>
                </div>
              `).join("")}
            </div>
          </div>
          <div class="admin-series-help technical-diagnostic-notes">
            <strong>Analyse</strong>
            ${report.recommendations.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
          </div>
        ` : `
          <div class="admin-series-help">
            <strong>Diagnostic indisponible</strong>
            <span>${escapeHtml(report?.message || "Firebase n'est pas disponible.")}</span>
          </div>
        `}
        <div class="decision-modal-actions">
          <button class="ghost-button" type="button" data-role-codes-back>Retour</button>
          <button class="ghost-button" type="button" data-public-publication-diagnostic>Relire</button>
          <button class="primary-button" type="button" data-public-index-republish>Republier public</button>
        </div>
      </div>
    `;
  }

  function renderPublicPublicationDiagnosticLoadingHtml() {
    return `
      <div class="decision-dialog role-codes-dialog" role="dialog" aria-modal="true" aria-label="Diagnostic publication publique">
        <div class="decision-modal-head">
          <div>
            <span>Publication publique</span>
            <h2>Diagnostic public</h2>
            <p>Lecture des index publics en cours...</p>
          </div>
        </div>
        <div class="admin-series-help">
          <strong>Analyse en cours</strong>
          <span>LivePalmes vÃ©rifie les tailles d'index et les rÃ©sultats disponibles par session.</span>
        </div>
      </div>
    `;
  }

  function renderTechnicalDiagnosticModalHtml(report, options = {}) {
    const {
      alertTargetsLabel = (targets) => (targets || []).join(", "),
      formatAlertDateTime = (value) => value || "",
      formatByteSize = (value) => String(value || 0)
    } = options;
    const firebase = report?.firebase || {};
    const security = report?.security || {};
    const technicalLog = report?.technicalLog || {};
    const localAlertCounts = report?.local?.pendingAlertCounts || {};
    const serverAlertCounts = firebase.pendingAlertCounts || {};
    const alertExamples = firebase.pendingAlertExamples?.length
      ? firebase.pendingAlertExamples
      : (report?.local?.pendingAlertExamples || []);
    return `
      <div class="decision-dialog role-codes-dialog technical-diagnostic-dialog" role="dialog" aria-modal="true" aria-label="Diagnostic technique">
        <div class="decision-modal-head">
          <div>
            <span>Diagnostic</span>
            <h2>Diagnostic technique</h2>
            <p>Vue rapide des données LivePalmes utiles en compétition.</p>
          </div>
          <button class="decision-close" type="button" data-role-codes-close aria-label="Fermer">×</button>
        </div>
        ${report?.available ? `
          ${technicalDiagnosticSection("Local", [
            { label: "sessions", value: String(report.local.sessions), status: report.local.sessions ? "ok" : "warn" },
            { label: "programme", value: String(report.local.program), status: report.local.program ? "ok" : "warn" },
            { label: "séries", value: String(report.local.series), status: report.local.series ? "ok" : "warn" },
            { label: "engagés", value: String(report.local.entrants), status: report.local.entrants ? "ok" : "warn" },
            { label: "résultats chargés", value: String(report.local.results), status: report.local.results ? "ok" : "neutral" },
            { label: "performances", value: String(report.local.performances), status: report.local.performances ? "ok" : "neutral" },
            { label: "alertes attente", value: String(report.local.pendingAlerts), status: report.local.pendingAlerts ? "warn" : "ok" }
          ])}
          ${technicalDiagnosticSection("Serveur", [
            { label: "résultats", value: String(firebase.results || 0), status: firebase.results ? "ok" : "neutral" },
            { label: "visibles public", value: String(firebase.visibleResults || 0), status: firebase.visibleResults ? "ok" : "neutral" },
            { label: "détaillés", value: String(firebase.detailedResults || 0), status: firebase.detailedResults ? "ok" : "warn" },
            { label: "lignes nageurs", value: String(firebase.resultPerformances || 0), status: firebase.resultPerformances ? "ok" : "neutral" },
            { label: "partiels", value: String(firebase.partialResults || 0), status: firebase.partialResults ? "neutral" : "ok" },
            { label: "finales attente", value: String(firebase.waitingFinalAnnouncements || 0), status: firebase.waitingFinalAnnouncements ? "warn" : "ok" },
            { label: "sessions résultats", value: escapeHtml(firebase.resultSessions || "aucune"), status: firebase.results ? "ok" : "neutral" }
          ])}
          ${technicalDiagnosticSection("Poids / synchro", [
            { label: "index public", value: formatByteSize(firebase.publicIndexBytes || 0), status: (firebase.publicIndexBytes || 0) >= 650000 ? "warn" : "ok" },
            { label: "live data", value: formatByteSize(firebase.liveDataBytes || 0), status: (firebase.liveDataBytes || 0) > 900000 ? "warn" : "ok" },
            { label: "PDF résultats", value: String(firebase.resultPdfCount ?? "-"), status: firebase.resultPdfCount ? "ok" : "neutral" },
            { label: "PDF à nettoyer", value: String(firebase.legacyPdfCount || 0), status: firebase.legacyPdfCount ? "warn" : "ok" },
            { label: "poids à nettoyer", value: formatByteSize(firebase.legacyBytes || 0), status: firebase.legacyPdfCount ? "warn" : "ok" },
            { label: "lecture diag", value: `${report.readMs} ms`, status: report.readMs > 5000 ? "warn" : "ok" }
          ])}
          ${technicalDiagnosticSection("Consoles", [
            { label: "présences", value: String(firebase.presenceCount ?? "-"), status: firebase.presenceCount ? "ok" : "neutral" },
            { label: "verrous rôles", value: String(firebase.roleLockCount ?? "-"), status: firebase.roleLockCount ? "neutral" : "ok" },
            { label: "alertes serveur", value: String(firebase.alertCount ?? "-"), status: firebase.alertCount ? "neutral" : "ok" },
            { label: "PDF séries", value: String(firebase.seriesPdfCount ?? "-"), status: firebase.seriesPdfCount ? "ok" : "neutral" },
            { label: "PDF résultats sessions", value: String(firebase.sessionResultsPdfCount ?? "-"), status: firebase.sessionResultsPdfCount ? "ok" : "neutral" }
          ])}
          ${technicalDiagnosticSection("Sécurité", [
            { label: "codes consoles", value: security.pinLockEnabled ? "actifs" : "inactifs", status: security.pinLockEnabled ? "ok" : "warn" },
            { label: "mode PIN", value: security.pinMode || "local", status: security.pinMode === "cloud" ? "ok" : "warn" },
            { label: "admin Firebase", value: security.adminSignedIn ? "connecté" : "non connecté", status: security.adminConfigured ? "ok" : "warn" },
            { label: "compte admin", value: security.adminEmail || security.adminUid || "non renseigné", status: security.adminConfigured ? "ok" : "warn" }
          ])}
          ${technicalDiagnosticSection("Journal technique", [
            { label: "lignes locales", value: String(technicalLog.count || 0), status: technicalLog.errors ? "warn" : "ok" },
            { label: "erreurs", value: String(technicalLog.errors || 0), status: technicalLog.errors ? "warn" : "ok" },
            { label: "avertissements", value: String(technicalLog.warnings || 0), status: technicalLog.warnings ? "warn" : "ok" },
            { label: "dernière erreur", value: technicalLog.latestAt || "aucune", status: technicalLog.latestAt ? "neutral" : "ok" }
          ])}
          ${technicalDiagnosticSection("Alertes en attente", [
            { label: "total local", value: String(report.local.pendingAlerts || 0), status: report.local.pendingAlerts ? "warn" : "ok" },
            { label: "total serveur", value: String(firebase.pendingAlertCount || 0), status: firebase.pendingAlertCount ? "warn" : "ok" },
            { label: "Live", value: `${localAlertCounts.live || 0} / ${serverAlertCounts.live || 0}`, status: (localAlertCounts.live || serverAlertCounts.live) ? "warn" : "ok" },
            { label: "Speaker", value: `${localAlertCounts.speaker || 0} / ${serverAlertCounts.speaker || 0}`, status: (localAlertCounts.speaker || serverAlertCounts.speaker) ? "warn" : "ok" },
            { label: "Bureau perf", value: `${localAlertCounts.computer || 0} / ${serverAlertCounts.computer || 0}`, status: (localAlertCounts.computer || serverAlertCounts.computer) ? "warn" : "ok" },
            { label: "Secrétariat", value: `${localAlertCounts.secretary || 0} / ${serverAlertCounts.secretary || 0}`, status: (localAlertCounts.secretary || serverAlertCounts.secretary) ? "warn" : "ok" },
            { label: "Vidéo", value: `${localAlertCounts.video || 0} / ${serverAlertCounts.video || 0}`, status: (localAlertCounts.video || serverAlertCounts.video) ? "warn" : "ok" },
            { label: "JA", value: `${localAlertCounts.referee || 0} / ${serverAlertCounts.referee || 0}`, status: (localAlertCounts.referee || serverAlertCounts.referee) ? "warn" : "ok" }
          ])}
          ${alertExamples.length ? `
            <div class="admin-series-help technical-diagnostic-alerts">
              <strong>Exemples d'alertes ouvertes</strong>
              ${alertExamples.map((item) => `
                <span>
                  ${escapeHtml(alertTargetsLabel(item.targets))} :
                  ${escapeHtml(item.status)} -
                  ${escapeHtml(item.type)}
                  ${item.identity ? ` - ${escapeHtml(item.identity)}` : ""}
                  ${item.race ? ` - ${escapeHtml(item.race)}` : ""}
                  ${item.createdAt ? ` (${escapeHtml(formatAlertDateTime(item.createdAt) || item.createdAt)})` : ""}
                </span>
              `).join("")}
            </div>
          ` : ""}
          <div class="admin-series-help technical-diagnostic-notes">
            <strong>Analyse</strong>
            ${report.recommendations.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
            <span>Dernier résultat : ${escapeHtml(firebase.lastResultUpdatedAt || "inconnu")}</span>
            <span>Index public : ${escapeHtml(firebase.publicIndexUpdatedAt || "inconnu")}</span>
          </div>
        ` : `
          <div class="admin-series-help">
            <strong>Diagnostic indisponible</strong>
            <span>${escapeHtml(report?.message || "Firebase n'est pas disponible.")}</span>
          </div>
        `}
        <div class="decision-modal-actions">
          <button class="ghost-button" type="button" data-role-codes-back>Retour</button>
          <button class="ghost-button" type="button" data-technical-log>Journal technique</button>
          <button class="ghost-button" type="button" data-technical-diagnostic>Relire</button>
        </div>
      </div>
    `;
  }

  function renderTechnicalLogModalHtml(entries = []) {
    return `
      <div class="decision-dialog role-codes-dialog technical-diagnostic-dialog" role="dialog" aria-modal="true" aria-label="Journal technique">
        <div class="decision-modal-head">
          <div>
            <span>Diagnostic</span>
            <h2>Journal technique</h2>
            <p>Erreurs locales repérées par ce navigateur. Utile pour comprendre un bug sans fouiller la console développeur.</p>
          </div>
          <button class="decision-close" type="button" data-role-codes-close aria-label="Fermer">×</button>
        </div>
        <div class="technical-log-list">
          ${entries.length ? entries.map((entry) => `
            <div class="technical-log-item ${escapeHtml(entry.level || "info")}">
              <strong>${escapeHtml(entry.scope || "LivePalmes")} - ${escapeHtml(entry.message || "")}</strong>
              <span>${escapeHtml(entry.createdAt || "")}</span>
              ${entry.details ? `<pre>${escapeHtml(entry.details)}</pre>` : ""}
            </div>
          `).join("") : `<div class="admin-series-help"><strong>Aucune erreur enregistrée</strong><span>Le navigateur n'a pas capté d'erreur technique locale.</span></div>`}
        </div>
        <div class="decision-modal-actions">
          <button class="ghost-button" type="button" data-technical-diagnostic>Retour diagnostic</button>
          <button class="ghost-button danger-button" type="button" data-clear-technical-log ${entries.length ? "" : "disabled"}>Vider le journal</button>
          <button class="primary-button" type="button" data-role-codes-close>Fermer</button>
        </div>
      </div>
    `;
  }

  function renderTechnicalDiagnosticLoadingHtml() {
    return `
      <div class="decision-dialog role-codes-dialog" role="dialog" aria-modal="true" aria-label="Diagnostic technique">
        <div class="decision-modal-head">
          <div>
            <span>Diagnostic</span>
            <h2>Diagnostic technique</h2>
            <p>Lecture des compteurs LivePalmes en cours...</p>
          </div>
        </div>
        <div class="admin-series-help">
          <strong>Analyse en cours</strong>
          <span>LivePalmes vérifie les données locales, serveur et publiques.</span>
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
    renderPublicPublicationDiagnosticLoadingHtml,
    renderPublicPublicationDiagnosticModalHtml,
    renderTechnicalDiagnosticLoadingHtml,
    renderTechnicalDiagnosticModalHtml,
    renderTechnicalLogModalHtml,
    resultHasDetails,
    technicalDiagnosticSection,
    technicalDiagnosticStatus
  };
})(window);
